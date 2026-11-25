import { GLRenderer, effectiveParams, type Source } from './renderer';
import type { EditState, FrameId, Recipe } from './types';
import { drawLuFx, headCenter, personMask } from './luFx';

const RATIOS: Record<string, number> = { '1:1': 1, '4:5': 0.8, '3:4': 0.75, '9:16': 9 / 16, '16:9': 16 / 9, '3:2': 1.5, '2:3': 2 / 3 };

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pad2 = (n: number) => String(n).padStart(2, '0');
const clock = (sec: number) => {
  const s = Math.max(0, Math.floor(sec || 0));
  return Math.floor(s / 3600) + ':' + pad2(Math.floor(s / 60) % 60) + ':' + pad2(s % 60);
};
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function formatDate(fmt: string, d = new Date()): string {
  const yy = String(d.getFullYear()).slice(2), yyyy = String(d.getFullYear());
  const mm = pad2(d.getMonth() + 1), dd = pad2(d.getDate());
  const mon = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][d.getMonth()];
  if (fmt === 'dd') return dd + ' ' + mm + " '" + yy;
  if (fmt === 'iso') return yyyy + '.' + mm + '.' + dd;
  if (fmt === 'mon') return mon + ' ' + dd + ' ' + yyyy;
  return "'" + yy + ' ' + mm + ' ' + dd;
}

export const STAMP_COLORS: Record<string, string> = { orange: '#ff8a1f', yellow: '#ffd23d', white: '#f4f4f4', red: '#ff4a3d' };

/** Color of the date or overlay text. Match the look uses the look color, white for camera overlays without one. */
export function stampColorOf(edit: EditState, recipe: Recipe, style: string | null): string {
  if (edit.stampColor !== 'match') return STAMP_COLORS[edit.stampColor] || '#ff8a1f';
  return recipe.stampColor || (style && style !== 'date' ? '#ffffff' : '#ff8a1f');
}
const resizeCanvas = (canvas: HTMLCanvasElement, width: number, height: number) => {
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
};

export interface PipelineInput {
  source: Source;
  srcW: number;
  srcH: number;
  recipe: Recipe;
  edit: EditState;
  isVideo: boolean;
  time: number;
  plain: boolean;
  /** Longest edge of the processed image. Use Infinity for full resolution. */
  maxSize: number;
  newFrame: boolean;
  /** Preview only: smallest date glyph height in output pixels, so Small stays readable on a phone. */
  minStampPx?: number;
}

/**
 * Full render pipeline: GPU pass for color and texture, then a 2D pass for
 * light leaks, dust, glitch, overlays and frames. The result lands in `out`.
 */
export class Pipeline {
  gl: GLRenderer;
  private work = document.createElement('canvas');
  private tmp = document.createElement('canvas');
  private overlaySrc: Source | null = null;
  private overlayKey = '';
  /** Last head position found in the person mask, for the flash falloff center. */
  private head: [number, number] | null = null;
  private headSrc: Source | null = null;

  constructor() {
    this.gl = new GLRenderer();
  }

  setOverlay(img: Source | null) {
    this.overlaySrc = img;
    this.overlayKey = '';
    if (!img) this.gl.setOverlay(null);
  }

  /** Size of the processed image (before frames) for a given input. */
  /** Largest pixel area a single canvas may hold on this device. */
  maxArea = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 16_000_000 : 50_000_000;

  geometry(srcW: number, srcH: number, edit: EditState, frame: FrameId, maxSize: number) {
    const q = (((edit.rotate % 360) + 360) % 360) / 90;
    const swap = q === 1 || q === 3;
    const rw = swap ? srcH : srcW, rh = swap ? srcW : srcH;
    const ar = RATIOS[frame === 'square' ? '1:1' : edit.aspect];
    let cx = 0, cy = 0, cw = 1, ch = 1, w = rw, h = rh;
    if (ar) {
      if (rw / rh > ar) { const nw = rh * ar; cw = nw / rw; cx = (1 - cw) / 2; w = nw; }
      else { const nh = rw / ar; ch = nh / rh; cy = (1 - ch) / 2; h = nh; }
    }
    const limit = Math.min(maxSize, this.gl.maxSize);
    const area = this.maxArea;
    let scale = Math.min(1, limit / Math.max(w, h));
    if (w * h * scale * scale > area) scale = Math.sqrt(area / (w * h));
    let crop: [number, number, number, number] = [cx, cy, cw, ch];
    if (swap) crop = [cy, cx, ch, cw];
    return { w: Math.max(2, Math.round(w * scale)), h: Math.max(2, Math.round(h * scale)), crop, rot: q };
  }

  render(inp: PipelineInput, out: HTMLCanvasElement) {
    const { recipe, edit } = inp;
    const lookOn = edit.intensity > 0;
    const frame: FrameId = edit.frame === 'auto' ? ((lookOn && recipe.frame) || 'none') : edit.frame;
    const g = this.geometry(inp.srcW, inp.srcH, edit, frame, inp.maxSize);
    const P = effectiveParams(recipe, edit, inp.plain);
    this.gl.setSource(inp.source, inp.newFrame);
    if (this.overlaySrc) {
      const key = g.w + 'x' + g.h;
      if (key !== this.overlayKey) {
        const oc = document.createElement('canvas');
        oc.width = Math.min(g.w, 2048);
        oc.height = Math.round(oc.width * g.h / g.w);
        const ov = this.overlaySrc as any;
        const ow = ov.naturalWidth || ov.videoWidth || ov.width, oh = ov.naturalHeight || ov.videoHeight || ov.height;
        const s = Math.max(oc.width / ow, oc.height / oh);
        oc.getContext('2d')!.drawImage(ov, (oc.width - ow * s) / 2, (oc.height - oh * s) / 2, ow * s, oh * s);
        this.gl.setOverlay(oc);
        this.overlayKey = key;
      }
    }

    let weaveX = 0, weaveY = 0;
    if (recipe.weave && lookOn && inp.isVideo && !inp.plain) {
      weaveX = (Math.random() - 0.5) * 0.006;
      weaveY = (Math.random() - 0.5) * 0.008;
    }
    const crop: [number, number, number, number] = weaveX || weaveY
      ? [g.crop[0] + g.crop[2] * (0.015 + weaveX), g.crop[1] + g.crop[3] * (0.015 + weaveY), g.crop[2] * 0.97, g.crop[3] * 0.97]
      : g.crop;
    const seed = inp.isVideo ? (inp.time * 60) % 997 : 3.7;
    // LU looks: flash falloff centered on the head once the person mask is known.
    const usesMask = !inp.plain && lookOn && ((P.glitter || 0) > 0 || (P.flares || 0) > 0 || (P.flashShadow || 0) > 0 || (P.flash || 0) > 0);
    if (usesMask && this.head && this.headSrc === inp.source) { P.flashX = this.head[0]; P.flashY = this.head[1]; }
    this.gl.render(g.w, g.h, crop, g.rot, edit.flipH, P, recipe, inp.plain, seed, edit.intensity / 100);

    const w = g.w, h = g.h;
    const stamp = edit.stamp === 'auto' ? ((lookOn && recipe.stamp) || null) : edit.stamp === 'off' ? null : edit.stamp;
    const fl = Math.max(0, P.flicker) / 100;
    const luFx = !inp.plain && lookOn && ((P.glitter || 0) > 0 || (P.flares || 0) > 0 || (P.flashShadow || 0) > 0);
    const needs2D = !inp.plain && (P.leak > 0 || P.dust > 0 || P.glitch > 0 || (fl > 0 && inp.isVideo) || !!stamp || luFx);
    let mask: ReturnType<typeof personMask> = null;
    if (usesMask) {
      mask = personMask(inp.source, this.gl.canvas, inp.isVideo, inp.time);
      const hc = headCenter(mask);
      if (hc) { this.head = hc; this.headSrc = inp.source; }
    }
    // Fast path: nothing to paint on top, so compose straight from the GPU canvas.
    if (!needs2D) {
      this.compose(out, inp.plain ? 'none' : frame, w, h, this.gl.canvas);
      return;
    }
    const work = this.work;
    resizeCanvas(work, w, h);
    const ctx = work.getContext('2d')!;
    ctx.drawImage(this.gl.canvas, 0, 0);

    if (luFx) {
      drawLuFx(ctx, w, h, mask, {
        glitter: Math.max(0, P.glitter || 0) / 100, flares: Math.max(0, P.flares || 0) / 100, flashShadow: Math.max(0, P.flashShadow || 0) / 100,
        palette: P.choice_colors || 0, seed: 1 + (P.sparkleSeed || 0), time: inp.time, isVideo: inp.isVideo
      });
    }
    this.leaks(ctx, w, h, P.leak, recipe, inp);
    this.dust(ctx, w, h, P.dust, inp);
    this.glitch(ctx, w, h, P.glitch, recipe, inp);
    if (fl > 0 && inp.isVideo) {
      const a = Math.random() * fl * 0.2;
      ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,240,220,${a.toFixed(3)})` : `rgba(0,0,0,${a.toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
    }
    const color = stampColorOf(edit, recipe, stamp);
    this.stamp(ctx, w, h, stamp, color, edit, inp.time, inp.minStampPx || 0);
    this.compose(out, inp.plain ? 'none' : frame, w, h, work);
  }

  private leaks(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, recipe: Recipe, inp: PipelineInput) {
    const leak = Math.max(0, amount) / 100;
    if (leak <= 0) return;
    const R = rng(recipe.seed || 5);
    const tt = inp.isVideo ? inp.time : 0;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const spots = [
      { x: 0, y: h * (0.25 + R() * 0.5 + Math.sin(tt * 0.7) * 0.08), c: '255,80,20' },
      { x: w, y: h * (0.1 + R() * 0.3 + Math.cos(tt * 0.5) * 0.06), c: '255,170,60' },
      { x: w * (0.2 + R() * 0.6), y: h, c: '255,40,90' }
    ];
    spots.forEach((s, k) => {
      const rad = Math.max(w, h) * (0.35 + R() * 0.25);
      const g2 = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rad);
      const a = leak * (k === 2 ? 0.45 : 0.75) * (inp.isVideo ? 0.85 + Math.sin(tt * 2 + k) * 0.15 : 1);
      g2.addColorStop(0, `rgba(${s.c},${a.toFixed(3)})`);
      g2.addColorStop(1, `rgba(${s.c},0)`);
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);
    });
    ctx.restore();
  }

  private dust(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, inp: PipelineInput) {
    const dust = Math.max(0, amount) / 100;
    if (dust <= 0) return;
    const R = inp.isVideo ? Math.random : rng(7);
    const unit = Math.max(1, w / 800);
    const count = Math.round(dust * 170 * (w / h > 1 ? 1 : 0.8));
    ctx.save();
    for (let k = 0; k < count; k++) {
      ctx.fillStyle = R() > 0.4 ? 'rgba(255,255,255,0.75)' : 'rgba(20,15,10,0.7)';
      ctx.beginPath();
      ctx.arc(R() * w, R() * h, (0.4 + R() * 1.4) * unit, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = unit * 0.8;
    const hairs = Math.round(dust * 6);
    for (let k = 0; k < hairs; k++) {
      const x0 = R() * w, y0 = R() * h;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(x0 + (R() - 0.5) * w * 0.08, y0 + (R() - 0.5) * h * 0.08, x0 + (R() - 0.5) * w * 0.06, y0 + (R() - 0.5) * h * 0.06);
      ctx.stroke();
    }
    if (inp.isVideo && R() < dust) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      const sx = R() * w;
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx + (R() - 0.5) * 6 * unit, h); ctx.stroke();
    }
    ctx.restore();
  }

  private glitch(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, recipe: Recipe, inp: PipelineInput) {
    const gl = Math.max(0, amount) / 100;
    if (gl <= 0) return;
    const R = inp.isVideo ? Math.random : rng(31);
    const tmp = this.tmp;
    resizeCanvas(tmp, w, h);
    tmp.getContext('2d')!.drawImage(this.work, 0, 0);
    const bands = Math.round(2 + gl * 10);
    for (let k = 0; k < bands; k++) {
      const y0 = R() * h, bh = h * (0.005 + R() * 0.05 * gl);
      const off = (R() - 0.5) * w * 0.14 * gl;
      ctx.drawImage(tmp, 0, y0, w, bh, off, y0, w, bh);
    }
    if (recipe.stamp === 'vhs' && inp.isVideo) {
      const by = ((inp.time * 0.35) % 1.2) * h;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, by, w, h * 0.03);
      for (let k = 0; k < 40; k++) {
        ctx.fillStyle = `rgba(255,255,255,${(Math.random() * 0.4).toFixed(2)})`;
        ctx.fillRect(Math.random() * w, by + Math.random() * h * 0.03, Math.random() * w * 0.1, Math.max(1, h / 800));
      }
    }
  }

  private stamp(ctx: CanvasRenderingContext2D, w: number, h: number, style: string | null, color: string, edit: EditState, time: number, minPx: number) {
    if (!style) return;
    const base = Math.min(w, h);
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    if (style === 'date') {
      const sz = edit.stampSize === 'large' ? 0.075 : edit.stampSize === 'medium' ? 0.055 : 0.038;
      ctx.font = `${Math.round(Math.max(base * sz, minPx))}px VT323, monospace`;
      ctx.textAlign = 'right';
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = base * sz * 0.35;
      ctx.globalAlpha = 0.9;
      ctx.fillText(edit.dateText, w * 0.955, h * 0.95);
    } else {
      const fs = Math.round(Math.max(base * 0.075, minPx));
      ctx.font = `${fs}px VT323, monospace`;
      ctx.fillStyle = color;
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowOffsetX = Math.max(1, base / 400);
      ctx.shadowOffsetY = Math.max(1, base / 400);
      const m = base * 0.06;
      const now = new Date();
      const hhmm = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
      if (style === 'vhs') {
        ctx.textAlign = 'left';
        ctx.fillText('PLAY ▶', m, m + fs * 0.7);
        ctx.fillText(clock(time), m, h - m);
        ctx.textAlign = 'right';
        ctx.fillText('SP', w - m, m + fs * 0.7);
        ctx.fillText(edit.dateText, w - m, h - m);
      } else if (style === 'dcr') {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ff3b30';
        ctx.beginPath();
        ctx.arc(m + fs * 0.25, m + fs * 0.42, fs * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.fillText('REC', m + fs * 0.6, m + fs * 0.7);
        ctx.textAlign = 'right';
        ctx.fillText(edit.dateText + '  ' + hhmm, w - m, h - m);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, base * 0.004);
        const bw = fs * 1.1, bh = fs * 0.5;
        ctx.strokeRect(w - m - bw, m + fs * 0.15, bw, bh);
        ctx.fillRect(w - m - bw + bw * 0.08, m + fs * 0.15 + bh * 0.2, bw * 0.6, bh * 0.6);
      } else if (style === 'cctv') {
        ctx.textAlign = 'left';
        ctx.fillText('CAM 01', m, m + fs * 0.7);
        ctx.fillText(edit.dateText + ' ' + hhmm + ':' + pad2(now.getSeconds()), m, h - m);
      }
    }
    ctx.restore();
  }

  private compose(out: HTMLCanvasElement, frame: FrameId, w: number, h: number, work: CanvasImageSource) {
    const octx = out.getContext('2d', { alpha: false })!;
    if (frame === 'border') {
      const p = Math.round(Math.min(w, h) * 0.045);
      resizeCanvas(out, w + p * 2, h + p * 2);
      octx.fillStyle = '#fbfaf7'; octx.fillRect(0, 0, out.width, out.height);
      octx.drawImage(work, p, p);
    } else if (frame === 'instant' || frame === 'square') {
      const side = Math.round(w * 0.06), bottom = Math.round(w * (frame === 'square' ? 0.2 : 0.26));
      resizeCanvas(out, w + side * 2, h + side + bottom);
      octx.fillStyle = '#f3efe6'; octx.fillRect(0, 0, out.width, out.height);
      octx.drawImage(work, side, side);
      octx.strokeStyle = 'rgba(0,0,0,0.12)'; octx.lineWidth = Math.max(1, w / 1200);
      octx.strokeRect(side, side, w, h);
    } else if (frame === 'film') {
      const sp = Math.round(w * 0.02), band = Math.round(h * 0.14);
      resizeCanvas(out, w + sp * 2, h + band * 2);
      octx.fillStyle = '#16120e'; octx.fillRect(0, 0, out.width, out.height);
      octx.drawImage(work, sp, band);
      const hw = band * 0.32, hh = band * 0.42, gap = hw * 1.9;
      octx.fillStyle = '#d9d2c3';
      for (let x = gap * 0.4; x < out.width; x += gap) {
        rr(octx, x, band * 0.12, hw, hh, hw * 0.2); octx.fill();
        rr(octx, x, out.height - band * 0.12 - hh, hw, hh, hw * 0.2); octx.fill();
      }
      octx.fillStyle = '#e8892a';
      octx.font = `${Math.round(band * 0.26)}px VT323, monospace`;
      octx.textAlign = 'right';
      octx.fillText('24  ▸  24A', out.width - sp - band * 0.1, out.height - band * 0.64);
    } else if (frame === 'slide') {
      const p = Math.round(Math.max(w, h) * 0.16);
      resizeCanvas(out, w + p * 2, h + p * 2);
      octx.fillStyle = '#ece7dc';
      rr(octx, 0, 0, out.width, out.height, p * 0.18); octx.fill();
      octx.save();
      rr(octx, p, p, w, h, p * 0.12); octx.clip();
      octx.drawImage(work, p, p);
      octx.restore();
    } else if (frame === 'half') {
      resizeCanvas(out, w, h);
      octx.fillStyle = '#0b0b0b'; octx.fillRect(0, 0, w, h);
      const gap = Math.round(w * 0.014), pw = Math.floor((w - gap) / 2);
      const lx = Math.max(0, Math.round(w / 2 - pw - pw * 0.12));
      const rx = Math.min(w - pw, Math.round(w / 2 + pw * 0.12));
      octx.drawImage(work, lx, 0, pw, h, 0, 0, pw, h);
      octx.drawImage(work, rx, 0, pw, h, pw + gap, 0, pw, h);
    } else if (frame === '8mm') {
      resizeCanvas(out, w, h);
      octx.fillStyle = '#050505'; octx.fillRect(0, 0, w, h);
      const ins = Math.round(Math.min(w, h) * 0.035);
      octx.save();
      rr(octx, ins, ins, w - ins * 2, h - ins * 2, ins * 2.4); octx.clip();
      octx.drawImage(work, ins, ins, w - ins * 2, h - ins * 2);
      octx.restore();
    } else if (frame === 'cinema') {
      resizeCanvas(out, w, h);
      octx.drawImage(work, 0, 0);
      const vis = w / 2.39;
      if (vis < h) {
        const bar = (h - vis) / 2;
        octx.fillStyle = '#000';
        octx.fillRect(0, 0, w, bar);
        octx.fillRect(0, h - bar, w, bar);
      }
    } else {
      resizeCanvas(out, w, h);
      octx.drawImage(work, 0, 0);
    }
  }
}
