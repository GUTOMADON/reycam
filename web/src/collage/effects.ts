/**
 * Collage tools added with the second template set (templates 19 to 56).
 *
 * Each function draws one layer kind and is called by the main renderer, so the
 * tools work in every template, in the editor and in the export the same way.
 * Photo based tools (heads, sketch, crop windows, patchwork, boxes) follow the
 * transform of the photo layer they point to, so moving or rotating the photo
 * carries them along.
 */
import type {
  Anchor, BackgroundLayer, BoxesLayer, BubbleLayer, CollagePhoto, CropWindowLayer, HeadsLayer, Layer, LayoutLayer, Palette,
  PatchworkLayer, PatchworkPattern, PhotoLayer, ScribbleLayer, SketchLayer, StickerLayer, TornLayer, Treatment, UiLayer, WavesLayer
} from './types';
import type { RenderInfo } from './render';
import { cropRect, photoBox } from './render';
import { resolvePaint } from './resolve';
import { applyTexture, grain, rng, roughenStroke } from './textures';
import { frameInsets, treatPhoto } from './treatments';
import { FONTS, drawDesktopIcon, drawPointer, shapePath } from './assets';
import { anchorPoints, maskStamp } from './detect';
import { drawStickerArt, STICKER_ASPECT } from './stickers';
import { hexToRgb, hslToHex, rgbToHsl, withAlpha } from './palettes';

const D2R = Math.PI / 180;
const TAU = Math.PI * 2;

export interface FxEnv {
  W: number;
  H: number;
  unit: number;
  pal: Palette;
  photos: CollagePhoto[];
  byId: Map<string, Layer>;
  photoMax: number;
  info: RenderInfo;
  /** Save, set the layer transform and record its hit box. Callers restore. */
  begin: (c: CanvasRenderingContext2D, l: Layer, w: number, h: number) => void;
  /** Draw the subject mask of a photo layer in canvas coordinates. */
  subjectMask: (c: CanvasRenderingContext2D, pl: PhotoLayer, p: CollagePhoto) => void;
}

const col = (env: FxEnv, p: Parameters<typeof resolvePaint>[0], fb: string) => resolvePaint(p, env.pal, fb);

function shade(hex: string, d: number) {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  return hslToHex(h, s, Math.max(0, Math.min(1, l + d)));
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}

// ---------------------------------------------------------------- photo geometry

function photoOf(env: FxEnv, id: string): { pl: PhotoLayer; p: CollagePhoto } | null {
  const pl = env.byId.get(id) as PhotoLayer | undefined;
  if (!pl || pl.kind !== 'photo') return null;
  const p = env.photos[pl.photo] || env.photos[0];
  return p ? { pl, p } : null;
}

/** Photo layer transform: local coordinates span the photo area, centered. */
function photoMatrix(env: FxEnv, pl: PhotoLayer, p: CollagePhoto) {
  const b = photoBox(pl, p, env.W, env.H);
  const ins = frameInsets(pl.frame, pl.frameMargin);
  const shift = pl.cutout === 'none' || pl.cutout === 'window' ? (ins.t - ins.b) * b.w / 2 : 0;
  const m = new DOMMatrix().translate(b.cx, b.cy).rotate(b.rot).scale(pl.flip ? -1 : 1, 1).translate(0, shift);
  return { b, m };
}

/** Image fraction to canvas pixels, plus canvas pixels per image pixel. */
function imgToCanvas(env: FxEnv, pl: PhotoLayer, p: CollagePhoto, fx: number, fy: number) {
  const { b, m } = photoMatrix(env, pl, p);
  const crop = cropRect(p, pl);
  const lx = ((fx * p.image.width - crop.sx) / crop.sw - 0.5) * b.w;
  const ly = ((fy * p.image.height - crop.sy) / crop.sh - 0.5) * b.h;
  const pt = m.transformPoint({ x: lx, y: ly });
  return { x: pt.x, y: pt.y, k: b.w / crop.sw, rot: b.rot };
}

/** Draw a photo layer's image (with any treatment) in its own transform. */
function drawPhotoAt(env: FxEnv, c: CanvasRenderingContext2D, pl: PhotoLayer, p: CollagePhoto, t: Treatment | undefined) {
  const { b, m } = photoMatrix(env, pl, p);
  const crop = cropRect(p, pl);
  const img = treatPhoto(p.image, p.id, t, env.pal, env.photoMax);
  const kx = img.width / p.image.width;
  c.save();
  c.setTransform(c.getTransform().multiply(m));
  c.drawImage(img, crop.sx * kx, crop.sy * kx, crop.sw * kx, crop.sh * kx, -b.w / 2, -b.h / 2, b.w, b.h);
  c.restore();
}

/** Draw a treated photo cover cropped into a rectangle, centered on a feature. */
function coverInto(env: FxEnv, c: CanvasRenderingContext2D, p: CollagePhoto, t: Treatment | undefined, x: number, y: number, w: number, h: number, anchor?: Anchor, index = 0, zoom = 1, blur = 0) {
  const img = treatPhoto(p.image, p.id, t, env.pal, Math.min(env.photoMax, 1600));
  const iw = p.image.width, ih = p.image.height;
  const A = w / h;
  let sw: number, sh: number;
  if (iw / ih > A) { sh = ih / zoom; sw = sh * A; } else { sw = iw / zoom; sh = sw / A; }
  let cx = iw / 2, cy = ih / 2;
  if (anchor) {
    const pts = anchorPoints(p, anchor);
    const pt = pts[index % pts.length];
    if (pt) { cx = pt.x * iw; cy = pt.y * ih; }
  }
  const sx = Math.max(0, Math.min(iw - sw, cx - sw / 2)), sy = Math.max(0, Math.min(ih - sh, cy - sh / 2));
  const kx = img.width / iw;
  c.save();
  c.beginPath(); c.rect(x, y, w, h); c.clip();
  if (blur) c.filter = `blur(${blur}px)`;
  c.drawImage(img, sx * kx, sy * kx, sw * kx, sh * kx, x, y, w, h);
  c.filter = 'none';
  c.restore();
}

/** Fine CRT scanlines with a blue cast over a rectangle. */
export function scanlines(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, amount: number, unit: number) {
  if (amount <= 0) return;
  c.save();
  c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.globalAlpha = amount * 0.55;
  c.fillStyle = '#000814';
  const step = Math.max(2, 4 * unit);
  for (let yy = y; yy < y + h; yy += step) c.fillRect(x, yy, w, step * 0.45);
  c.globalAlpha = amount * 0.25;
  c.globalCompositeOperation = 'screen';
  c.fillStyle = '#2A6AF0';
  c.fillRect(x, y, w, h);
  c.restore();
}

// ---------------------------------------------------------------- color block heads

export function drawHeads(env: FxEnv, c: CanvasRenderingContext2D, l: HeadsLayer) {
  const ph = photoOf(env, l.of);
  if (!ph || !l.blocks.length) return;
  const { pl, p } = ph;
  env.info.boxes[l.id] = { ...photoBox(pl, p, env.W, env.H) };
  const heads = anchorPoints(p, 'face');
  const T0 = c.getTransform();
  heads.forEach((hd, i) => {
    const blk = l.blocks[i % l.blocks.length];
    const pt = imgToCanvas(env, pl, p, hd.x + blk.dx, hd.y + blk.dy);
    const side = hd.r * p.image.width * pt.k * 2 * blk.size;
    c.save();
    c.globalAlpha = l.opacity ?? 1;
    c.translate(pt.x, pt.y);
    c.rotate((pt.rot + blk.rot) * D2R);
    c.beginPath(); c.rect(-side / 2, -side / 2, side, side);
    c.shadowColor = 'rgba(0,0,0,0.3)'; c.shadowBlur = 10 * env.unit; c.shadowOffsetY = 4 * env.unit;
    c.fillStyle = col(env, blk.paint, '#E040C0');
    c.fill();
    c.shadowColor = 'transparent';
    c.clip();
    c.setTransform(T0);
    drawPhotoAt(env, c, pl, p, { type: 'duotone', dark: blk.ink, light: blk.paint, grain: 0.25 });
    c.restore();
  });
}

// ---------------------------------------------------------------- comic burst bubble

export function drawBubble(env: FxEnv, c: CanvasRenderingContext2D, l: BubbleLayer) {
  const w = l.w * env.W, h = l.h * env.H, u = env.unit;
  env.begin(c, l, w, h);
  const r = rng(l.seed ?? 3);
  const n = Math.max(6, Math.round(l.spikes));
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i / (n * 2)) * TAU + (r() - 0.5) * l.randomness * 0.25;
    const out = i % 2 === 0;
    const k = out ? 1 + (r() - 0.5) * l.randomness * 0.4 : 0.72 + (r() - 0.5) * l.randomness * 0.15;
    const x = Math.cos(a) * (w / 2) * k, y = Math.sin(a) * (h / 2) * k;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.closePath();
  c.fillStyle = col(env, l.paint, '#F2EA2E');
  c.fill();
  c.strokeStyle = col(env, l.stroke, '#111111');
  c.lineWidth = 7 * u;
  c.lineJoin = 'round';
  c.stroke();
  const lines = (l.text || ' ').split('\n');
  c.fillStyle = col(env, l.textPaint, '#111111');
  c.textAlign = 'center'; c.textBaseline = 'middle';
  let fs = h * 0.32 / Math.max(1, lines.length * 0.8);
  c.font = `700 ${fs}px ${FONTS.marker}`;
  const widest = Math.max(...lines.map((s) => c.measureText(s).width), 1);
  if (widest > w * 0.56) { fs *= (w * 0.56) / widest; c.font = `700 ${fs}px ${FONTS.marker}`; }
  lines.forEach((s, i) => { c.save(); c.translate(0, (i - (lines.length - 1) / 2) * fs * 1.05); c.rotate(-0.04); c.fillText(s, 0, 0); c.restore(); });
  c.restore();
}

// ---------------------------------------------------------------- torn magazine page

const LOREM = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat';

function tornPath(c: CanvasRenderingContext2D, w: number, h: number, n: number, seed: number) {
  const r = rng(seed);
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + (r() - 0.5) * (TAU / n) * 0.6;
    // Irregular polygon inscribed in the box, pushed toward the corners.
    const ca = Math.cos(a), sa = Math.sin(a);
    const k = 1 / Math.max(Math.abs(ca), Math.abs(sa));
    const d = (0.72 + r() * 0.28) * Math.min(k, 1.35);
    const x = ca * d * w / 2, y = sa * d * h / 2;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.closePath();
}

export function drawTorn(env: FxEnv, c: CanvasRenderingContext2D, l: TornLayer) {
  const w = l.w * env.W, h = l.h * env.H, u = env.unit;
  env.begin(c, l, w, h);
  const seed = l.seed ?? 5;
  tornPath(c, w, h, Math.max(4, l.points), seed);
  c.shadowColor = 'rgba(0,0,0,0.3)'; c.shadowBlur = 12 * u; c.shadowOffsetY = 5 * u;
  c.fillStyle = col(env, l.edge, '#FFFFFF');
  c.fill();
  c.shadowColor = 'transparent';
  c.save();
  c.scale(1 - 18 * u / w, 1 - 18 * u / h);
  tornPath(c, w, h, Math.max(4, l.points), seed);
  const base = col(env, l.paint, '#3F7A3A');
  c.fillStyle = base;
  c.fill();
  c.clip();
  applyTexture(c, -w / 2, -h / 2, w, h, 'poster', u);
  const ink = col(env, l.textPaint, shade(base, 0.35));
  if (l.print > 0) {
    c.save();
    c.rotate(-0.12);
    c.fillStyle = withAlpha(ink, 0.55);
    const fs = 15 * u;
    c.font = `700 ${fs}px ${FONTS.sans}`;
    const r = rng(seed + 9);
    const rows = Math.round((h * 1.3) / (fs * 1.35) * Math.min(1, l.print + 0.3));
    for (let i = 0; i < rows; i++) {
      const y = -h * 0.65 + i * fs * 1.35 / Math.min(1, l.print + 0.3);
      const start = Math.floor(r() * 80);
      c.fillText(LOREM.slice(start) + ' ' + LOREM, -w * 0.7, y);
    }
    c.restore();
  }
  if (l.word) {
    c.save();
    c.rotate(-0.12);
    c.fillStyle = ink;
    let fs = h * 0.32;
    c.font = `700 ${fs}px ${FONTS.display}`;
    const tw = c.measureText(l.word).width;
    if (tw > w * 0.95) { fs *= (w * 0.95) / tw; c.font = `700 ${fs}px ${FONTS.display}`; }
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(l.word.toUpperCase(), 0, -h * 0.12);
    c.restore();
  }
  c.restore();
  c.restore();
}

// ---------------------------------------------------------------- sketch overlay

const sketchCache = new Map<string, HTMLCanvasElement>();

export function drawSketch(env: FxEnv, c: CanvasRenderingContext2D, l: SketchLayer) {
  const ph = photoOf(env, l.of);
  if (!ph) return;
  const { pl, p } = ph;
  const color = col(env, l.paint, '#FFFFFF');
  const key = [p.id, maskStamp(p.mask), l.density, l.width, l.hatch, color].join('|');
  let art = sketchCache.get(key);
  if (!art) {
    const S = Math.min(1, 900 / Math.max(p.image.width, p.image.height));
    const w = Math.round(p.image.width * S), h = Math.round(p.image.height * S);
    const src = canvas(w, h);
    const sc = src.getContext('2d', { willReadFrequently: true })!;
    sc.drawImage(p.image, 0, 0, w, h);
    const d = sc.getImageData(0, 0, w, h).data;
    sc.clearRect(0, 0, w, h);
    sc.drawImage(p.mask, 0, 0, w, h);
    const m = sc.getImageData(0, 0, w, h).data;
    const L = new Float32Array(w * h);
    for (let i = 0, q = 0; q < L.length; i += 4, q++) L[q] = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    art = canvas(w, h);
    const ac = art.getContext('2d')!;
    ac.strokeStyle = color;
    ac.lineCap = 'round';
    const lw = Math.max(1, l.width * (w / 1080));
    const r = rng(31);
    const tries = Math.round(w * h * 0.06 * l.density);
    ac.lineWidth = lw;
    ac.beginPath();
    for (let i = 0; i < tries; i++) {
      const x = 1 + Math.floor(r() * (w - 2)), y = 1 + Math.floor(r() * (h - 2)), q = y * w + x;
      if (m[q * 4 + 3] < 128) continue;
      const gx = L[q + 1] - L[q - 1], gy = L[q + w] - L[q - w];
      const g = Math.hypot(gx, gy);
      // Mask border always counts as an edge so the outline is drawn.
      const border = m[(q + 3) * 4 + 3] < 128 || m[(q - 3) * 4 + 3] < 128 || m[(q + 3 * w) * 4 + 3] < 128 || m[(q - 3 * w) * 4 + 3] < 128;
      if (g < 0.09 && !border) continue;
      const len = (5 + r() * 9) * (w / 1080) * (border ? 1.6 : 1);
      const tx = g ? -gy / g : 1, ty = g ? gx / g : 0;
      ac.moveTo(x - tx * len, y - ty * len);
      ac.lineTo(x + tx * len + (r() - 0.5) * lw, y + ty * len + (r() - 0.5) * lw);
    }
    ac.stroke();
    if (l.hatch) {
      ac.lineWidth = lw * 0.7;
      ac.globalAlpha = 0.7;
      ac.beginPath();
      const step = Math.max(3, 9 * (w / 1080));
      for (let y = 0; y < h; y += step) {
        for (let x = (y / step) % 2 ? step / 2 : 0; x < w; x += step) {
          const q = (y | 0) * w + (x | 0);
          if (m[q * 4 + 3] < 128 || L[q] > 0.32) continue;
          ac.moveTo(x, y); ac.lineTo(x + step * 0.8, y - step * 0.8);
        }
      }
      ac.stroke();
    }
    if (sketchCache.size > 8) sketchCache.delete(sketchCache.keys().next().value as string);
    sketchCache.set(key, art);
  }
  const { b, m } = photoMatrix(env, pl, p);
  env.info.boxes[l.id] = { ...b };
  const crop = cropRect(p, pl);
  const k = art.width / p.image.width;
  c.save();
  c.globalAlpha = l.opacity ?? 1;
  c.setTransform(c.getTransform().multiply(m));
  c.drawImage(art, crop.sx * k, crop.sy * k, crop.sw * k, crop.sh * k, -b.w / 2, -b.h / 2, b.w, b.h);
  c.restore();
}

// ---------------------------------------------------------------- scribble fill

/** Subject mask grown by `rad` px, drawn into `c` in canvas coordinates. */
function dilatedMask(env: FxEnv, c: CanvasRenderingContext2D, pl: PhotoLayer, p: CollagePhoto, rad: number) {
  const steps = rad > 2 ? 16 : 1;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TAU;
    c.save();
    c.translate(Math.cos(a) * rad, Math.sin(a) * rad);
    env.subjectMask(c, pl, p);
    c.restore();
  }
}

export function drawScribble(env: FxEnv, c: CanvasRenderingContext2D, l: ScribbleLayer) {
  const { W, H, unit } = env;
  const w = l.w * W, h = l.h * H;
  env.info.boxes[l.id] = { cx: l.x * W, cy: l.y * H, w, h, rot: l.rot };
  const off = canvas(W, H);
  const oc = off.getContext('2d')!;
  oc.save();
  oc.translate(l.x * W, l.y * H);
  oc.rotate(l.rot * D2R);
  oc.beginPath(); oc.rect(-w / 2, -h / 2, w, h); oc.clip();
  oc.strokeStyle = col(env, l.paint, '#F07AA0');
  oc.lineWidth = l.width * unit;
  oc.lineCap = 'round'; oc.lineJoin = 'round';
  const r = rng(l.seed ?? 4);
  const n = Math.round(((w * h) / (unit * unit * 9000)) * l.density);
  for (let i = 0; i < n; i++) {
    let x = (r() - 0.5) * w, y = (r() - 0.5) * h;
    let a = r() * TAU;
    oc.beginPath(); oc.moveTo(x, y);
    for (let k = 0; k < 14; k++) {
      a += (r() - 0.5) * 2.6;
      const len = (30 + r() * 70) * unit;
      x += Math.cos(a) * len; y += Math.sin(a) * len;
      oc.lineTo(x, y);
    }
    oc.stroke();
  }
  oc.restore();
  roughenStroke(oc, W, H, 'crayon', unit);
  const ph = l.of ? photoOf(env, l.of) : null;
  if (ph) {
    oc.globalCompositeOperation = 'destination-out';
    dilatedMask(env, oc, ph.pl, ph.p, l.padding * unit);
  }
  c.save();
  c.globalAlpha = l.opacity ?? 1;
  c.drawImage(off, 0, 0);
  c.restore();
}

// ---------------------------------------------------------------- crop windows

export function drawCropWindow(env: FxEnv, c: CanvasRenderingContext2D, l: CropWindowLayer) {
  const ph = photoOf(env, l.of);
  if (!ph) return;
  const w = l.w * env.W, h = l.h * env.H, u = env.unit;
  const T0 = c.getTransform();
  env.begin(c, l, w, h);
  c.beginPath(); c.rect(-w / 2, -h / 2, w, h);
  c.save();
  c.clip();
  c.setTransform(T0);
  drawPhotoAt(env, c, ph.pl, ph.p, l.treatment);
  c.restore();
  // Thin crop guides extending past the corners.
  c.strokeStyle = col(env, l.guide, '#FFFFFF');
  c.lineWidth = 2 * u;
  const e = 26 * u;
  c.beginPath();
  for (const y of [-h / 2, h / 2]) { c.moveTo(-w / 2 - e, y); c.lineTo(w / 2 + e, y); }
  for (const x of [-w / 2, w / 2]) { c.moveTo(x, -h / 2 - e); c.lineTo(x, h / 2 + e); }
  c.stroke();
  c.restore();
}

// ---------------------------------------------------------------- pattern patchwork

type Pt = [number, number];

/** Clip a convex polygon to the half plane closer to `a` than to `b`. */
function clipHalf(poly: Pt[], a: Pt, b: Pt): Pt[] {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const nx = b[0] - a[0], ny = b[1] - a[1];
  const side = (p: Pt) => (p[0] - mx) * nx + (p[1] - my) * ny;
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const sp = side(p), sq = side(q);
    if (sp <= 0) out.push(p);
    if ((sp < 0 && sq > 0) || (sp > 0 && sq < 0)) {
      const t = sp / (sp - sq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

function fillPattern(c: CanvasRenderingContext2D, kind: PatchworkPattern, x: number, y: number, w: number, h: number, c1: string, c2: string, u: number, r: () => number) {
  c.fillStyle = c2; c.fillRect(x, y, w, h);
  c.fillStyle = c1; c.strokeStyle = c1;
  const s = 26 * u;
  switch (kind) {
    case 'sky': {
      const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#5AA8F0'); g.addColorStop(1, '#CDE8FA');
      c.fillStyle = g; c.fillRect(x, y, w, h);
      c.fillStyle = 'rgba(255,255,255,0.95)';
      for (let i = 0; i < 6; i++) { const cx = x + r() * w, cy = y + r() * h; for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(cx + (k - 1.5) * s * 0.9, cy + Math.sin(k) * s * 0.2, s * 0.9, s * 0.55, 0, 0, TAU); c.fill(); } }
      break;
    }
    case 'stripes': for (let i = -h; i < w; i += s) { c.beginPath(); c.moveTo(x + i, y + h); c.lineTo(x + i + h, y); c.lineWidth = s * 0.45; c.stroke(); } break;
    case 'dots': for (let yy = y; yy < y + h; yy += s) for (let xx = x + ((yy / s) % 2) * s / 2; xx < x + w; xx += s) { c.beginPath(); c.arc(xx, yy, s * 0.22, 0, TAU); c.fill(); } break;
    case 'swirls': c.lineWidth = 4 * u; for (let i = 0; i < 10; i++) { const cx = x + r() * w, cy = y + r() * h; c.beginPath(); for (let t = 0; t <= 1; t += 0.03) { const a = t * TAU * 2.5, d = s * 1.4 * t; c.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d); } c.stroke(); } break;
    case 'spots': for (let i = 0; i < 26; i++) { c.beginPath(); c.ellipse(x + r() * w, y + r() * h, s * (0.3 + r() * 0.6), s * (0.25 + r() * 0.4), r() * 3, 0, TAU); c.fill(); } break;
    case 'plaid':
      c.globalAlpha = 0.55;
      for (let i = 0; i < w; i += s * 1.6) c.fillRect(x + i, y, s * 0.5, h);
      for (let i = 0; i < h; i += s * 1.6) c.fillRect(x, y + i, w, s * 0.5);
      c.globalAlpha = 1;
      break;
    case 'shapes':
      for (let i = 0; i < 14; i++) {
        const cx = x + r() * w, cy = y + r() * h, k = r();
        c.beginPath();
        if (k < 0.33) c.arc(cx, cy, s * 0.6, 0, TAU);
        else if (k < 0.66) c.rect(cx - s * 0.5, cy - s * 0.5, s, s);
        else { c.moveTo(cx, cy - s * 0.6); c.lineTo(cx + s * 0.6, cy + s * 0.5); c.lineTo(cx - s * 0.6, cy + s * 0.5); }
        c.fill();
      }
      break;
    case 'gradient': {
      const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, c1); g.addColorStop(1, c2);
      c.fillStyle = g; c.fillRect(x, y, w, h);
      break;
    }
  }
}

const patchCache = new Map<string, HTMLCanvasElement>();

export function drawPatchwork(env: FxEnv, c: CanvasRenderingContext2D, l: PatchworkLayer) {
  const ph = photoOf(env, l.of);
  if (!ph) return;
  const { pl, p } = ph;
  const { b, m } = photoMatrix(env, pl, p);
  env.info.boxes[l.id] = { ...b };
  const colors = l.paints.map((x, i) => col(env, x, ['#F28CC0', '#1F9A8F', '#E0281E', '#F2C230'][i % 4]));
  const crop = cropRect(p, pl);
  const k = Math.min(1, 1000 / Math.max(b.w, b.h));
  const w = Math.round(b.w * k), h = Math.round(b.h * k);
  const key = [p.id, maskStamp(p.mask), l.count, l.share, l.patterns.join(), colors.join(), l.seed, w, h, crop.sx | 0, crop.sy | 0, crop.sw | 0].join('|');
  let art = patchCache.get(key);
  if (!art) {
    art = canvas(w, h);
    const ac = art.getContext('2d')!;
    const r = rng(l.seed ?? 8);
    const pts = anchorPoints(p, 'body')[0];
    // Sites inside the body box, in local pixels.
    const toLocal = (fx: number, fy: number): Pt => [((fx * p.image.width - crop.sx) / crop.sw) * w, ((fy * p.image.height - crop.sy) / crop.sh) * h];
    const [bx, by] = toLocal(pts.x, pts.y);
    const bw = (pts.r * 2 * p.image.width / crop.sw) * w;
    const sites: Pt[] = Array.from({ length: Math.max(3, l.count) }, () => [bx + (r() - 0.5) * bw, by + (r() - 0.5) * bw * (h / w) * 1.2]);
    const u = w / 1080;
    sites.forEach((s, i) => {
      if (r() > l.share) return;
      let poly: Pt[] = [[0, 0], [w, 0], [w, h], [0, h]];
      for (let j = 0; j < sites.length && poly.length; j++) if (j !== i) poly = clipHalf(poly, s, sites[j]);
      if (poly.length < 3) return;
      ac.save();
      ac.beginPath();
      // Wobbly organic edges: subdivide each edge and push the midpoints.
      poly.forEach((pt, n) => {
        const q = poly[(n + 1) % poly.length];
        if (n === 0) ac.moveTo(pt[0], pt[1]);
        const mx = (pt[0] + q[0]) / 2 + (r() - 0.5) * 30 * u, my = (pt[1] + q[1]) / 2 + (r() - 0.5) * 30 * u;
        ac.quadraticCurveTo(mx, my, q[0], q[1]);
      });
      ac.closePath();
      ac.clip();
      const xs = poly.map((v) => v[0]), ys = poly.map((v) => v[1]);
      const x0 = Math.min(...xs) - 20, y0 = Math.min(...ys) - 20;
      fillPattern(ac, l.patterns[i % l.patterns.length], x0, y0, Math.max(...xs) - x0 + 40, Math.max(...ys) - y0 + 40, colors[i % colors.length], colors[(i + 1) % colors.length], u, r);
      ac.restore();
      ac.strokeStyle = 'rgba(0,0,0,0.6)'; ac.lineWidth = 2 * u;
    });
    ac.globalCompositeOperation = 'destination-in';
    ac.drawImage(p.mask, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h);
    if (patchCache.size > 8) patchCache.delete(patchCache.keys().next().value as string);
    patchCache.set(key, art);
  }
  c.save();
  c.globalAlpha = l.opacity ?? 1;
  c.setTransform(c.getTransform().multiply(m));
  c.drawImage(art, -b.w / 2, -b.h / 2, b.w, b.h);
  c.restore();
}

// ---------------------------------------------------------------- multi photo layouts

export function layoutCells(l: LayoutLayer, w: number, h: number, u: number): { x: number; y: number; w: number; h: number }[] {
  const g = l.gutter * u, bd = l.border * u;
  const x0 = -w / 2 + bd, y0 = -h / 2 + bd, iw = w - bd * 2, ih = h - bd * 2;
  const grid = (cols: number, rows: number, x: number, y: number, ww: number, hh: number) => {
    const cw = (ww - g * (cols - 1)) / cols, ch = (hh - g * (rows - 1)) / rows;
    const out: { x: number; y: number; w: number; h: number }[] = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) out.push({ x: x + i * (cw + g), y: y + j * (ch + g), w: cw, h: ch });
    return out;
  };
  switch (l.mode) {
    case 'grid': return grid(Math.max(1, l.cols), Math.max(1, l.rows), x0, y0, iw, ih);
    case 'strips': return grid(1, Math.max(1, l.rows), x0, y0, iw, ih);
    case 'contact': {
      const side = iw * 0.3;
      return [...grid(1, Math.max(1, l.rows), x0, y0, side, ih), { x: x0 + side + g, y: y0, w: iw - side - g, h: ih }];
    }
    case 'film': {
      const holes = iw * 0.09;
      return grid(1, Math.max(1, l.rows), x0 + holes, y0, iw - holes * 2, ih);
    }
  }
}

export function drawLayout(env: FxEnv, c: CanvasRenderingContext2D, l: LayoutLayer) {
  const w = l.w * env.W, h = l.h * env.H, u = env.unit;
  env.begin(c, l, w, h);
  const border = col(env, l.paint, '#111111');
  c.fillStyle = border;
  if (l.shadow) { c.save(); c.shadowColor = 'rgba(0,0,0,0.4)'; c.shadowBlur = 24 * u; c.shadowOffsetY = 10 * u; c.fillRect(-w / 2, -h / 2, w, h); c.restore(); }
  else c.fillRect(-w / 2, -h / 2, w, h);
  const cells = layoutCells(l, w, h, u);
  if (l.edgeText !== undefined || l.mode === 'film') {
    // Film edge print: frame numbers, arrows and a line of edge text.
    const ink = col(env, l.textPaint, '#F2A040');
    c.save();
    c.fillStyle = ink;
    c.font = `${16 * u}px ${FONTS.typewriter}`;
    c.textBaseline = 'middle';
    cells.forEach((cell, i) => {
      c.save();
      c.translate(cell.x - 4 * u, cell.y + cell.h / 2);
      c.rotate(-Math.PI / 2);
      c.textAlign = 'center';
      c.fillText(`${i * 2 + 12} ▸ ${i * 2 + 12}A`, 0, 0);
      c.restore();
    });
    if (l.edgeText) {
      c.save();
      c.translate(w / 2 - 6 * u, 0);
      c.rotate(Math.PI / 2);
      c.textAlign = 'center';
      c.fillText(l.edgeText, 0, 0);
      c.restore();
    }
    c.restore();
  }
  if (l.mode === 'film') {
    const holes = (w - l.border * 2 * u) * 0.09;
    c.fillStyle = '#F2EEE6';
    for (const sx of [-w / 2 + l.border * u + holes * 0.3, w / 2 - l.border * u - holes * 0.7]) {
      for (let y = -h / 2 + 16 * u; y < h / 2 - 20 * u; y += 46 * u) { c.beginPath(); c.roundRect(sx, y, holes * 0.4, 26 * u, 4 * u); c.fill(); }
    }
  }
  cells.forEach((cell, i) => {
    const spec = l.cells.length ? l.cells[i % l.cells.length] : { photo: 0 };
    const p = env.photos[spec.photo] || env.photos[0];
    if (!p) return;
    c.save();
    if (l.radius) { c.beginPath(); c.roundRect(cell.x, cell.y, cell.w, cell.h, l.radius * u); c.clip(); }
    if (l.cellRot) {
      // Photo turned inside its cell (film strips of sideways frames).
      c.translate(cell.x + cell.w / 2, cell.y + cell.h / 2);
      c.rotate((l.cellRot * Math.PI) / 180);
      const sw = Math.abs(l.cellRot) % 180 === 90 ? cell.h : cell.w, sh = Math.abs(l.cellRot) % 180 === 90 ? cell.w : cell.h;
      coverInto(env, c, p, l.treatment, -sw / 2, -sh / 2, sw, sh, spec.anchor, Math.floor(i / Math.max(1, l.cells.length)), spec.zoom ?? 1, spec.blur ? 4 * u : 0);
    } else coverInto(env, c, p, l.treatment, cell.x, cell.y, cell.w, cell.h, spec.anchor, Math.floor(i / Math.max(1, l.cells.length)), spec.zoom ?? 1, spec.blur ? 4 * u : 0);
    c.restore();
    if (l.scanlines) scanlines(c, cell.x, cell.y, cell.w, cell.h, l.scanlines, u);
  });
  if (l.torn && (l.mode === 'strips' || l.mode === 'film')) {
    for (let i = 1; i < cells.length; i++) {
      const y = (cells[i - 1].y + cells[i - 1].h + cells[i].y) / 2;
      c.save();
      c.translate(0, y);
      // Strip about 24 to 40 px tall at 1080 wide, more jagged with more roughness.
      shapePath(c, 'tornStrip', w * 1.04, { h: ((24 + (l.roughness ?? 0.5) * 16) * u) / (w * 1.04), wobble: (l.roughness ?? 0.5) * 0.6, seed: 30 + i });
      c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 10 * u; c.shadowOffsetY = 4 * u;
      c.fillStyle = '#F8F6F0';
      c.fill();
      c.restore();
    }
  }
  c.restore();
}

// ---------------------------------------------------------------- detection boxes

export function drawBoxes(env: FxEnv, c: CanvasRenderingContext2D, l: BoxesLayer) {
  const ph = photoOf(env, l.of);
  if (!ph) return;
  const { pl, p } = ph;
  env.info.boxes[l.id] = { ...photoBox(pl, p, env.W, env.H) };
  const color = col(env, l.paint, '#9EF09A');
  const u = env.unit;
  let last: { x: number; y: number; s: number } | null = null;
  c.save();
  c.globalAlpha = l.opacity ?? 1;
  c.strokeStyle = color;
  c.lineWidth = l.width * u;
  for (const t of l.targets) {
    for (const a of anchorPoints(p, t)) {
      const pt = imgToCanvas(env, pl, p, a.x, a.y);
      const s = a.r * p.image.width * pt.k * 2;
      c.save();
      c.translate(pt.x, pt.y);
      c.rotate(pt.rot * D2R);
      c.beginPath();
      if (l.rounded) c.roundRect(-s / 2, -s / 2, s, s, s * 0.18); else c.rect(-s / 2, -s / 2, s, s);
      c.stroke();
      c.restore();
      last = { x: pt.x, y: pt.y, s };
    }
  }
  if (l.pointer && last) {
    c.translate(last.x + last.s * 0.4, last.y + last.s * 0.4);
    drawPointer(c, 70 * u);
  }
  c.restore();
}

// ---------------------------------------------------------------- waves

export function drawWaves(env: FxEnv, c: CanvasRenderingContext2D, l: WavesLayer) {
  const { W, H, unit } = env;
  const w = l.w * W, h = l.h * H;
  env.info.boxes[l.id] = { cx: l.x * W, cy: l.y * H, w, h, rot: l.rot };
  const off = canvas(W, H);
  const oc = off.getContext('2d')!;
  oc.translate(l.x * W, l.y * H);
  oc.rotate(l.rot * D2R);
  oc.lineCap = 'round'; oc.lineJoin = 'round';
  oc.lineWidth = l.width * unit;
  const r = rng(l.seed ?? 6);
  const colors = l.paints.map((x, i) => col(env, x, i % 2 ? '#FFFFFF' : '#111111'));
  const n = Math.max(1, l.count);
  if (l.mode === 'parallel') {
    const ph = r() * TAU;
    for (let i = 0; i < n; i++) {
      oc.strokeStyle = colors[i % colors.length];
      const oy = (i - (n - 1) / 2) * l.width * unit * 1.6;
      oc.beginPath();
      for (let k = 0; k <= 60; k++) {
        const t = k / 60;
        const x = -w / 2 + t * w, y = oy + Math.sin(t * TAU * 1.5 + ph) * h * l.amp * 0.5;
        k ? oc.lineTo(x, y) : oc.moveTo(x, y);
      }
      oc.stroke();
    }
  } else {
    // Liquid contour lines: nested wobbly rings, alternating colors.
    const f1 = 2 + Math.floor(r() * 3), f2 = 3 + Math.floor(r() * 3), ph1 = r() * TAU, ph2 = r() * TAU;
    for (let i = 0; i < n; i++) {
      oc.strokeStyle = colors[i % colors.length];
      const k0 = 0.25 + (i / n) * 0.75;
      oc.beginPath();
      for (let k = 0; k <= 120; k++) {
        const a = (k / 120) * TAU;
        const rr = k0 * (1 + l.amp * (0.5 * Math.sin(a * f1 + ph1 + i * 0.3) + 0.3 * Math.sin(a * f2 + ph2)));
        const x = Math.cos(a) * rr * w / 2, y = Math.sin(a) * rr * h / 2;
        k ? oc.lineTo(x, y) : oc.moveTo(x, y);
      }
      oc.closePath();
      oc.stroke();
    }
  }
  oc.setTransform(1, 0, 0, 1, 0, 0);
  roughenStroke(oc, W, H, l.texture, unit);
  c.save();
  c.globalAlpha = l.opacity ?? 1;
  c.drawImage(off, 0, 0);
  c.restore();
}

// ---------------------------------------------------------------- stickers

const stickerCache = new Map<string, { canvas: HTMLCanvasElement; pad: number }>();

export function drawSticker(env: FxEnv, c: CanvasRenderingContext2D, l: StickerLayer) {
  const u = env.unit;
  const w = l.w * env.W, h = w * (STICKER_ASPECT[l.art] ?? 1);
  env.begin(c, l, w, h);
  const c1 = col(env, l.paint, '#F2C21A'), c2 = col(env, l.paint2, '#FFFFFF');
  const glow = l.glow ? col(env, l.glow, '#3AF0A0') : '';
  const key = [l.art, Math.round(w), c1, c2, glow, l.edge, l.seed, l.label].join('|');
  let hit = stickerCache.get(key);
  if (!hit) {
    const pad = Math.ceil(w * 0.12 + (glow ? 24 * u : 0) + (l.edge ? 10 * u : 0));
    const art = canvas(w + pad * 2, h * 1.4 + pad * 2);
    const ac = art.getContext('2d')!;
    ac.translate(art.width / 2, art.height / 2);
    drawStickerArt(ac, l.art, w, c1, c2, l.seed ?? 1, l.label);
    const out = canvas(art.width, art.height);
    const oc = out.getContext('2d')!;
    if (l.edge || glow) {
      // Silhouette of the art grown outward: white cut edge or neon outline.
      const sil = canvas(art.width, art.height);
      const sc = sil.getContext('2d')!;
      const rad = (glow ? 9 : 7) * u;
      for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; sc.drawImage(art, Math.cos(a) * rad, Math.sin(a) * rad); }
      sc.globalCompositeOperation = 'source-in';
      sc.fillStyle = glow || '#FFFFFF';
      sc.fillRect(0, 0, sil.width, sil.height);
      if (glow) { oc.shadowColor = glow; oc.shadowBlur = 22 * u; oc.drawImage(sil, 0, 0); oc.shadowColor = 'transparent'; }
      else { oc.shadowColor = 'rgba(0,0,0,0.3)'; oc.shadowBlur = 8 * u; oc.shadowOffsetY = 3 * u; oc.drawImage(sil, 0, 0); oc.shadowColor = 'transparent'; }
    }
    oc.drawImage(art, 0, 0);
    hit = { canvas: out, pad };
    if (stickerCache.size > 120) stickerCache.delete(stickerCache.keys().next().value as string);
    stickerCache.set(key, hit);
  }
  c.drawImage(hit.canvas, -hit.canvas.width / 2, -hit.canvas.height / 2);
  c.restore();
}

// ---------------------------------------------------------------- retro windows, taskbar, camera screen

function bevelBox(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, u: number, face = '#C6C6C6') {
  c.fillStyle = face; c.fillRect(x, y, w, h);
  c.fillStyle = '#FFFFFF'; c.fillRect(x, y, w, 2 * u); c.fillRect(x, y, 2 * u, h);
  c.fillStyle = '#5A5A5A'; c.fillRect(x, y + h - 2 * u, w, 2 * u); c.fillRect(x + w - 2 * u, y, 2 * u, h);
}

export function drawUiExtra(env: FxEnv, c: CanvasRenderingContext2D, l: UiLayer) {
  const { W, H, unit: u } = env;
  const w = l.w * W, h = (l.h ?? 0.3) * H;
  const bar = col(env, l.paint, '#2A3F8F');
  const accent = col(env, l.paint2, '#F2C21A');
  const ink = col(env, l.text, '#111111');
  switch (l.widget) {
    case 'window': {
      env.begin(c, l, w, h);
      const x = -w / 2, y = -h / 2;
      if (l.glow) { c.shadowColor = col(env, l.glow, '#FFFFFF'); c.shadowBlur = 40 * u; }
      bevelBox(c, x, y, w, h, u);
      c.shadowColor = 'transparent';
      const tb = Math.max(26 * u, h * 0.08);
      const g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, bar); g.addColorStop(1, shade(bar, 0.25));
      c.fillStyle = g; c.fillRect(x + 4 * u, y + 4 * u, w - 8 * u, tb);
      c.fillStyle = '#FFFFFF'; c.font = `${tb * 0.8}px ${FONTS.pixel}`; c.textBaseline = 'middle'; c.textAlign = 'left';
      c.fillText(l.title ?? '', x + 12 * u, y + 4 * u + tb / 2, w - tb * 4);
      for (let i = 0; i < 3; i++) {
        const bx = x + w - 8 * u - (i + 1) * (tb * 0.9);
        bevelBox(c, bx, y + 7 * u, tb * 0.8, tb - 6 * u, u);
        c.fillStyle = '#111'; c.font = `${tb * 0.7}px ${FONTS.pixel}`; c.textAlign = 'center';
        c.fillText(['×', '□', '_'][i], bx + tb * 0.4, y + 4 * u + tb / 2);
      }
      const ix = x + 8 * u, iy = y + tb + 10 * u, iw = w - 16 * u;
      let ih = h - tb - 18 * u;
      const p = env.photos[l.photo ?? 0] || env.photos[0];
      if (l.content === 'player') ih -= 50 * u;
      c.fillStyle = l.content === 'trash' ? '#FFFFFF' : '#000000';
      c.fillRect(ix, iy, iw, ih);
      if (p && (l.content === 'photo' || l.content === 'player')) coverInto(env, c, p, l.treatment, ix, iy, iw, ih, l.anchor, 0, l.zoom ?? 1);
      if (p && l.content === 'notes') {
        c.fillStyle = '#FFFFFF'; c.fillRect(ix, iy, iw, ih);
        const n = 3, gw = (iw - 8 * u) / n, gh = (ih - 8 * u) / n;
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
          const cx = ix + 4 * u + i * gw, cy = iy + 4 * u + j * gh;
          const hatched = (i + j) % 2 === 1;
          coverInto(env, c, p, hatched ? { type: 'bw', contrast: 1.6, grain: 0 } : l.treatment, cx + 2 * u, cy + 2 * u, gw - 4 * u, gh - 4 * u, (['face', 'body', 'hands'] as Anchor[])[(i + j * n) % 3], 0, 1.4);
          if (hatched) {
            c.save(); c.beginPath(); c.rect(cx, cy, gw, gh); c.clip();
            c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = 1.5 * u;
            for (let k = -gh; k < gw; k += 6 * u) { c.beginPath(); c.moveTo(cx + k, cy + gh); c.lineTo(cx + k + gh, cy); c.stroke(); }
            c.restore();
          }
        }
      }
      if (l.content === 'trash') {
        c.save(); c.translate(ix + iw / 2, iy + ih * 0.45);
        drawDesktopIcon(c, 'trash', l.message ?? '', Math.min(iw, ih) * 0.4, accent, FONTS.pixel, 'flat', ink);
        c.restore();
      }
      if (l.content === 'player') {
        const py = iy + ih + 8 * u;
        bevelBox(c, ix, py, iw, 40 * u, u, '#D6D6D6');
        c.fillStyle = '#111';
        c.beginPath(); c.moveTo(ix + 14 * u, py + 10 * u); c.lineTo(ix + 34 * u, py + 20 * u); c.lineTo(ix + 14 * u, py + 30 * u); c.fill();
        c.fillRect(ix + 46 * u, py + 10 * u, 7 * u, 20 * u); c.fillRect(ix + 57 * u, py + 10 * u, 7 * u, 20 * u);
        c.fillStyle = '#7A7A7A'; c.fillRect(ix + 80 * u, py + 18 * u, iw - 96 * u, 5 * u);
        c.fillStyle = accent; c.fillRect(ix + 80 * u, py + 18 * u, (iw - 96 * u) * 0.38, 5 * u);
      }
      if (l.message && l.content !== 'trash') {
        c.fillStyle = withAlpha('#FFFFFF', 0.92); c.fillRect(ix, iy + ih - 34 * u, iw, 34 * u);
        c.fillStyle = ink; c.font = `${26 * u}px ${FONTS.pixel}`; c.textAlign = 'left';
        c.fillText(l.message, ix + 8 * u, iy + ih - 17 * u, iw - 16 * u);
      }
      c.restore();
      return;
    }
    case 'taskbar': {
      env.begin(c, l, w, h);
      bevelBox(c, -w / 2, -h / 2, w, h, u);
      const bh = h - 10 * u;
      bevelBox(c, -w / 2 + 6 * u, -h / 2 + 5 * u, bh * 3, bh, u);
      c.fillStyle = accent; c.fillRect(-w / 2 + 14 * u, -bh * 0.25, bh * 0.5, bh * 0.5);
      c.fillStyle = '#111'; c.font = `${bh * 0.7}px ${FONTS.pixel}`; c.textBaseline = 'middle'; c.textAlign = 'left';
      c.fillText(l.title || 'Start', -w / 2 + 14 * u + bh * 0.7, 0);
      bevelBox(c, w / 2 - bh * 2.6 - 6 * u, -h / 2 + 5 * u, bh * 2.6, bh, u, '#B8B8B8');
      c.textAlign = 'center';
      c.fillText(l.label || '12:00', w / 2 - bh * 1.3 - 6 * u, 0);
      c.restore();
      return;
    }
    case 'camera': {
      // Full screen generic camera overlay.
      info(env, l);
      c.save();
      c.globalAlpha = l.opacity ?? 1;
      const top = H * 0.07, bottom = H * 0.2;
      c.fillStyle = 'rgba(0,0,0,0.88)';
      c.fillRect(0, 0, W, top);
      c.fillRect(0, H - bottom, W, bottom);
      c.fillStyle = '#FFFFFF';
      c.font = `${34 * u}px ${FONTS.sans}`; c.textBaseline = 'middle'; c.textAlign = 'center';
      ['⚡', '◐', '⌛', '▢'].forEach((g, i) => c.fillText(g, W * (0.12 + i * 0.25), top / 2));
      // zoom pills
      const pills = ['.5', '1×', '2'];
      pills.forEach((t, i) => {
        const x = W / 2 + (i - 1) * 90 * u, y = H - bottom - 60 * u;
        c.fillStyle = 'rgba(0,0,0,0.5)'; c.beginPath(); c.arc(x, y, 34 * u, 0, TAU); c.fill();
        c.fillStyle = i === 1 ? accent : '#FFFFFF'; c.font = `600 ${26 * u}px ${FONTS.sans}`; c.fillText(t, x, y);
      });
      const modes = (l.message || 'VIDEO,PHOTO,PORTRAIT').split(',');
      modes.forEach((t, i) => {
        c.fillStyle = i === Math.floor(modes.length / 2) ? accent : 'rgba(255,255,255,0.8)';
        c.font = `600 ${26 * u}px ${FONTS.sans}`;
        c.fillText(t.trim(), W / 2 + (i - Math.floor(modes.length / 2)) * 190 * u, H - bottom + 40 * u);
      });
      const sy = H - bottom * 0.42;
      c.strokeStyle = '#FFFFFF'; c.lineWidth = 7 * u; c.beginPath(); c.arc(W / 2, sy, 62 * u, 0, TAU); c.stroke();
      c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(W / 2, sy, 50 * u, 0, TAU); c.fill();
      c.fillStyle = '#555'; c.beginPath(); c.roundRect(W * 0.12, sy - 38 * u, 76 * u, 76 * u, 12 * u); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.arc(W * 0.86, sy, 40 * u, 0, TAU); c.fill();
      if (l.title) {
        c.font = `${54 * u}px VT323, monospace`; c.textAlign = 'right';
        c.shadowColor = 'rgba(255,120,40,0.8)'; c.shadowBlur = 8 * u;
        c.fillStyle = '#FFB15C';
        c.fillText(l.title, W - 50 * u, H - bottom - 130 * u);
      }
      c.restore();
      return;
    }
  }
}

function info(env: FxEnv, l: Layer) { env.info.boxes[l.id] = { cx: env.W / 2, cy: env.H / 2, w: env.W, h: env.H, rot: 0 }; }

// ---------------------------------------------------------------- backgrounds

export function drawBackgroundExtra(env: FxEnv, c: CanvasRenderingContext2D, l: BackgroundLayer): boolean {
  const { W, H, unit: u } = env;
  const c1 = col(env, l.paint, '#2A4AE0');
  const c2 = col(env, l.paint2, '#E81A1A');
  const r = rng(l.seed ?? 12);
  switch (l.style) {
    case 'quilt': {
      const strips = (l.paints?.length ? l.paints : [l.paint, l.paint2 ?? l.paint]).map((p, i) => col(env, p, ['#1E2A5A', '#8FC8F0', '#F2C21A', '#D8281E', '#5A6A2A'][i % 5]));
      const n = strips.length;
      // Rows: top strips full width; when there are 5 strips, the 3rd and 4th share a row split by a hill.
      const rows = n >= 5 ? [0, 1, -1, 4] : strips.map((_, i) => i);
      const rh = H / rows.length;
      rows.forEach((idx, j) => {
        const y = j * rh;
        if (idx === -1) {
          c.fillStyle = strips[2]; c.fillRect(0, y, W, rh);
          c.fillStyle = strips[3];
          c.beginPath(); c.moveTo(W * 0.35, y + rh); c.bezierCurveTo(W * 0.5, y + rh * 0.1, W * 0.7, y, W, y + rh * 0.05); c.lineTo(W, y + rh); c.closePath(); c.fill();
          // star fabric
          for (const [color, x0, x1] of [[shade(strips[2], 0.3), 0, W * 0.5], [shade(strips[3], 0.3), W * 0.5, W]] as const) {
            c.fillStyle = color;
            for (let i = 0; i < 9; i++) { c.save(); c.translate(x0 + r() * (x1 - x0), y + r() * rh); shapePath(c, 'star5', 34 * u); c.fill(); c.restore(); }
          }
        } else {
          c.fillStyle = strips[idx]; c.fillRect(0, y, W, rh);
          c.fillStyle = shade(strips[idx], idx === 0 ? 0.2 : 0.35);
          c.strokeStyle = c.fillStyle; c.lineWidth = 4 * u;
          if (j === 0) for (let i = 0; i < 12; i++) { const cx = r() * W, cy = y + r() * rh; c.beginPath(); for (let t = 0; t <= 1; t += 0.04) { const a = t * TAU * 2, d = 26 * u * t; c.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d); } c.stroke(); }
          if (j === rows.length - 1) { c.fillStyle = '#FFFFFF'; for (let yy = y + 20 * u; yy < y + rh; yy += 48 * u) for (let xx = ((yy / (48 * u)) % 2) * 24 * u; xx < W; xx += 48 * u) { c.beginPath(); c.arc(xx, yy, 8 * u, 0, TAU); c.fill(); } }
        }
        applyTexture(c, 0, y, W, rh, 'felt', u);
        // stitched seam
        c.save(); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 3 * u; c.setLineDash([14 * u, 10 * u]);
        c.beginPath(); c.moveTo(0, y + rh - 8 * u); c.lineTo(W, y + rh - 8 * u); c.stroke(); c.restore();
        c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, y + rh - 3 * u, W, 3 * u);
      });
      if (l.felt !== false && n >= 2) {
        const cloud = (x: number, y: number, s: number) => { c.fillStyle = '#EADBC4'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + (k - 1.5) * s * 0.5, y + Math.sin(k * 2) * s * 0.1, s * 0.35, 0, TAU); c.fill(); } };
        cloud(W * 0.2, rh * 1.5, 120 * u); cloud(W * 0.75, rh * 1.4, 150 * u);
      }
      return true;
    }
    case 'comic': {
      const tint = col(env, l.paint, '#F2E6B8');
      c.fillStyle = tint; c.fillRect(0, 0, W, H);
      const cols = 3, rows = 4, g = 14 * u;
      const pw = (W - g * (cols + 1)) / cols, phh = (H - g * (rows + 1)) / rows;
      const inks = ['#E0281E', '#2A4AE0', '#F2C21A', '#3DAA3D', '#F28CC0'];
      const words = ['POW!', 'ZAP!', 'BOOM', 'WOW!', 'BAM!', 'SPLAT', 'WHAM', 'OOPS'];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const x = g + i * (pw + g), y = g + j * (phh + g);
        c.save();
        c.beginPath(); c.rect(x, y, pw, phh); c.clip();
        c.fillStyle = shade(inks[(i + j * 2) % inks.length], 0.25); c.fillRect(x, y, pw, phh);
        // halftone dots
        c.fillStyle = withAlpha(inks[(i + j) % inks.length], 0.5);
        for (let yy = y; yy < y + phh; yy += 12 * u) for (let xx = x + ((yy / (12 * u)) % 2) * 6 * u; xx < x + pw; xx += 12 * u) { c.beginPath(); c.arc(xx, yy, 3.2 * u, 0, TAU); c.fill(); }
        // simple original scenery: hills, buildings or a burst
        c.fillStyle = withAlpha('#1A1A1A', 0.75);
        const kind = (i + j * cols) % 3;
        if (kind === 0) for (let k = 0; k < 4; k++) c.fillRect(x + k * pw * 0.26, y + phh * (0.45 + r() * 0.25), pw * 0.2, phh);
        else if (kind === 1) { c.beginPath(); c.ellipse(x + pw / 2, y + phh, pw * 0.7, phh * 0.4, 0, 0, TAU); c.fill(); }
        else { c.save(); c.translate(x + pw / 2, y + phh / 2); shapePath(c, 'burst', pw * 0.6, { points: 12, seed: i + j }); c.fillStyle = '#FFFFFF'; c.fill(); c.restore(); }
        // fake speech bubble or onomatopoeia
        c.fillStyle = '#FFFFFF'; c.strokeStyle = '#111'; c.lineWidth = 3 * u;
        if ((i + j) % 2) {
          c.beginPath(); c.ellipse(x + pw * 0.35, y + phh * 0.22, pw * 0.28, phh * 0.14, 0, 0, TAU); c.fill(); c.stroke();
          c.fillStyle = '#555'; for (let k = 0; k < 3; k++) c.fillRect(x + pw * 0.18, y + phh * (0.16 + k * 0.05), pw * (0.34 - k * 0.06), 4 * u);
        } else {
          c.font = `700 ${phh * 0.2}px ${FONTS.display}`; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.lineWidth = 6 * u; c.strokeText(words[(i + j * cols) % words.length], x + pw * 0.6, y + phh * 0.25);
          c.fillStyle = inks[(i * 2 + j) % inks.length]; c.fillText(words[(i + j * cols) % words.length], x + pw * 0.6, y + phh * 0.25);
        }
        c.restore();
        c.strokeStyle = '#111'; c.lineWidth = 4 * u; c.strokeRect(x, y, pw, phh);
      }
      applyTexture(c, 0, 0, W, H, 'newsprint', u);
      return true;
    }
    case 'ghost': {
      c.fillStyle = '#0A0A14'; c.fillRect(0, 0, W, H);
      const p = env.photos[l.photo ?? 0] || env.photos[0];
      if (p) {
        const n = Math.max(2, l.tiles ?? 4);
        const tw = W / n, th = tw / (p.image.width / p.image.height);
        const img = treatPhoto(p.image, p.id, l.treatment, env.pal, 600);
        c.save();
        c.filter = `blur(${(l.blur ?? 6) * u}px) brightness(0.55)`;
        for (let y = 0; y < H; y += th) for (let x = 0; x < W; x += tw) c.drawImage(img, x, y, tw, th);
        c.filter = 'none';
        // slight RGB split
        c.globalCompositeOperation = 'screen';
        c.globalAlpha = 0.25;
        c.fillStyle = '#FF0040'; c.fillRect(4 * u, 0, W, H);
        c.fillStyle = '#00A0FF'; c.fillRect(-4 * u, 0, W, H);
        c.restore();
      }
      return true;
    }
    case 'sunburst': {
      c.fillStyle = c1; c.fillRect(0, 0, W, H);
      c.save();
      c.translate(W / 2, H * 0.55);
      c.fillStyle = c2;
      const n = 22;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, Math.hypot(W, H), a, a + TAU / n / 2); c.closePath(); c.fill();
      }
      c.restore();
      applyTexture(c, 0, 0, W, H, l.texture === 'none' ? 'crumpled' : l.texture, u);
      return true;
    }
    case 'torn': {
      c.fillStyle = c1; c.fillRect(0, 0, W, H);
      applyTexture(c, 0, 0, W, H, 'poster', u);
      c.fillStyle = col(env, l.paint3, '#FFFFFF');
      for (let i = 0; i < 7; i++) {
        const x = r() * W, y = r() * H, len = (160 + r() * 360) * u, a = r() * Math.PI;
        c.save(); c.translate(x, y); c.rotate(a);
        c.beginPath(); c.moveTo(-len / 2, 0);
        for (let k = 0; k <= 16; k++) c.lineTo(-len / 2 + (k / 16) * len, -(4 + r() * 16) * u);
        for (let k = 16; k >= 0; k--) c.lineTo(-len / 2 + (k / 16) * len, (4 + r() * 16) * u);
        c.closePath(); c.fill();
        c.restore();
      }
      return true;
    }
    case 'journal': {
      c.fillStyle = '#1A1612'; c.fillRect(0, 0, W, H);
      const p = env.photos[l.photo ?? 0] || env.photos[0];
      for (let i = 0; i < 14; i++) {
        const w = (260 + r() * 320) * u, h = w * (0.7 + r() * 0.6);
        c.save(); c.translate(r() * W, r() * H); c.rotate((r() - 0.5) * 0.6);
        c.fillStyle = r() > 0.5 ? '#D8CDB8' : '#C8C0B0'; c.fillRect(-w / 2, -h / 2, w, h);
        if (r() > 0.6 && p) coverInto(env, c, p, { type: 'bw', contrast: 1, grain: 0.2 }, -w / 2 + 12 * u, -h / 2 + 12 * u, w - 24 * u, h - 24 * u, 'face', 0, 1 + r());
        else {
          c.fillStyle = 'rgba(40,40,60,0.55)'; c.font = `${22 * u}px ${FONTS.script}`; c.textAlign = 'left';
          for (let k = 0; k < 8; k++) c.fillText(LOREM.slice(k * 17, k * 17 + 28), -w / 2 + 16 * u, -h / 2 + (40 + k * 34) * u, w - 30 * u);
        }
        c.fillStyle = 'rgba(255,255,240,0.35)'; c.fillRect(-60 * u, -h / 2 - 16 * u, 120 * u, 34 * u);
        c.restore();
      }
      c.fillStyle = 'rgba(10,8,6,0.5)'; c.fillRect(0, 0, W, H);
      grain(c, W, H, 0.3, u);
      return true;
    }
  }
  return false;
}
