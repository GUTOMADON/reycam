/**
 * Photo treatments (pixel color mapping) and print frames. Treatments run on a
 * copy of the source pixels and are cached by their settings, so moving a
 * sticker never recomputes the photo.
 */
import type { FrameStyle, Palette, Treatment } from './types';
import { hexToRgb } from './palettes';
import { dust, grain, vignette } from './textures';
import { resolvePaint } from './resolve';

const cache = new Map<string, HTMLCanvasElement>();

function scaled(src: HTMLCanvasElement, maxDim: number): HTMLCanvasElement {
  const k = Math.min(1, maxDim / Math.max(src.width, src.height));
  if (k === 1) return src;
  const c = document.createElement('canvas');
  c.width = Math.round(src.width * k);
  c.height = Math.round(src.height * k);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
const curve = (v: number, contrast: number) => Math.max(0, Math.min(255, (v - 128) * contrast + 128));

/** The treated photo. `key` identifies the source pixels (photo id + mask version). */
export function treatPhoto(src: HTMLCanvasElement, key: string, t: Treatment | undefined, palette: Palette, maxDim: number): HTMLCanvasElement {
  const tt: Treatment = t || { type: 'none' };
  const colors = JSON.stringify([tt, colorsOf(tt, palette)]);
  const k = `${key}|${maxDim}|${colors}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const base = scaled(src, maxDim);
  const out = document.createElement('canvas');
  out.width = base.width;
  out.height = base.height;
  const ctx = out.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(base, 0, 0);
  if (tt.type !== 'none') {
    const img = ctx.getImageData(0, 0, out.width, out.height);
    const d = img.data;
    const unit = out.width / 1080;
    switch (tt.type) {
      case 'bw':
      case 'flash':
        for (let i = 0; i < d.length; i += 4) {
          const v = curve(lum(d[i], d[i + 1], d[i + 2]), tt.contrast);
          d[i] = d[i + 1] = d[i + 2] = v;
        }
        break;
      case 'sepia':
        for (let i = 0; i < d.length; i += 4) {
          const v = lum(d[i], d[i + 1], d[i + 2]);
          const sr = v * 1.07 + 18, sg = v * 0.92 + 8, sb = v * 0.72;
          const a = tt.amount, f = tt.fade * 40;
          d[i] = Math.min(255, d[i] * (1 - a) + sr * a) * (1 - tt.fade * 0.15) + f;
          d[i + 1] = Math.min(255, d[i + 1] * (1 - a) + sg * a) * (1 - tt.fade * 0.15) + f;
          d[i + 2] = Math.min(255, d[i + 2] * (1 - a) + sb * a) * (1 - tt.fade * 0.15) + f;
        }
        break;
      case 'warm':
        for (let i = 0; i < d.length; i += 4) {
          d[i] = Math.min(255, d[i] * (1 + 0.12 * tt.amount) + 8 * tt.amount);
          d[i + 1] = Math.min(255, d[i + 1] * (1 + 0.03 * tt.amount));
          d[i + 2] = d[i + 2] * (1 - 0.12 * tt.amount);
        }
        break;
      case 'mono':
      case 'duotone': {
        const [dr, dg, db] = hexToRgb(resolvePaint(tt.type === 'mono' ? tt.tint : tt.dark, palette, '#023EAC'));
        const [lr, lg, lb] = hexToRgb(resolvePaint(tt.type === 'mono' ? tt.paper : tt.light, palette, '#F8F4F1'));
        for (let i = 0; i < d.length; i += 4) {
          const v = curve(lum(d[i], d[i + 1], d[i + 2]), 1.15) / 255;
          d[i] = dr + (lr - dr) * v;
          d[i + 1] = dg + (lg - dg) * v;
          d[i + 2] = db + (lb - db) * v;
        }
        break;
      }
      case 'halftone': {
        const [ir, ig, ib] = hexToRgb(resolvePaint(tt.ink, palette, '#111111'));
        const lumBuf = new Float32Array(out.width * out.height);
        for (let i = 0, p = 0; i < d.length; i += 4, p++) lumBuf[p] = lum(d[i], d[i + 1], d[i + 2]) / 255;
        ctx.putImageData(img, 0, 0);
        ctx.fillStyle = resolvePaint(tt.paper, palette, '#F8F4F1');
        ctx.fillRect(0, 0, out.width, out.height);
        const step = Math.max(3, tt.dot * unit * 2);
        ctx.fillStyle = `rgb(${ir},${ig},${ib})`;
        for (let y = step / 2; y < out.height; y += step) {
          for (let x = step / 2 + ((y / step) % 2) * step * 0.5; x < out.width; x += step) {
            const v = lumBuf[Math.floor(y) * out.width + Math.floor(x)];
            const rad = (1 - v) * step * 0.62;
            if (rad > 0.3) { ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill(); }
          }
        }
        cache.set(k, out);
        return out;
      }
      case 'overlay':
        break;
    }
    ctx.putImageData(img, 0, 0);
    if (tt.type === 'overlay') {
      ctx.globalCompositeOperation = tt.mode;
      ctx.globalAlpha = tt.opacity;
      ctx.fillStyle = resolvePaint(tt.color, palette, '#A61212');
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    const g = 'grain' in tt ? tt.grain : 0;
    if (g > 0) grain(ctx, out.width, out.height, g, unit);
    if (tt.type === 'flash') vignette(ctx, 0, 0, out.width, out.height, 0.35);
  }
  if (cache.size > 40) cache.delete(cache.keys().next().value as string);
  cache.set(k, out);
  return out;
}

function colorsOf(t: Treatment, palette: Palette): string[] {
  switch (t.type) {
    case 'mono': return [resolvePaint(t.tint, palette, ''), resolvePaint(t.paper, palette, '')];
    case 'duotone': return [resolvePaint(t.dark, palette, ''), resolvePaint(t.light, palette, '')];
    case 'halftone': return [resolvePaint(t.ink, palette, ''), resolvePaint(t.paper, palette, '')];
    case 'overlay': return [resolvePaint(t.color, palette, '')];
    default: return [];
  }
}

export function clearTreatmentCache(prefix?: string) {
  if (!prefix) { cache.clear(); return; }
  for (const k of [...cache.keys()]) if (k.startsWith(prefix)) cache.delete(k);
}

/** Extra space a frame adds around the photo, as fractions of the photo width. */
export function frameInsets(frame: FrameStyle, margin = 0.06): { l: number; t: number; r: number; b: number } {
  switch (frame) {
    case 'booth': return { l: 0.035, t: 0.035, r: 0.035, b: 0.035 };
    case 'film': return { l: 0.02, t: 0.02, r: 0.02, b: 0.02 };
    case 'polaroid': return { l: 0.06, t: 0.06, r: 0.06, b: 0.24 };
    case 'white': return { l: margin, t: margin, r: margin, b: margin };
    default: return { l: 0, t: 0, r: 0, b: 0 };
  }
}

/** Draw the frame behind a photo rect (x, y, w, h are the photo area). */
export function drawFrameBack(ctx: CanvasRenderingContext2D, frame: FrameStyle, x: number, y: number, w: number, h: number, color: string, unit: number, shadow: boolean, margin?: number) {
  if (frame === 'none') {
    if (shadow) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 24 * unit; ctx.shadowOffsetY = 8 * unit; ctx.fillStyle = '#000'; ctx.fillRect(x, y, w, h); ctx.restore(); }
    return;
  }
  const ins = frameInsets(frame, margin);
  const fx = x - ins.l * w, fy = y - ins.t * w, fw = w * (1 + ins.l + ins.r), fh = h + w * (ins.t + ins.b);
  ctx.save();
  if (shadow) { ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 26 * unit; ctx.shadowOffsetY = 10 * unit; }
  if (frame === 'booth') {
    ctx.fillStyle = '#EFE6D2';
    ctx.fillRect(fx - 6 * unit, fy - 6 * unit, fw + 12 * unit, fh + 12 * unit);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = color;
    ctx.fillRect(fx, fy, fw, fh);
  } else if (frame === 'film') {
    ctx.fillStyle = color;
    roundRect(ctx, fx, fy, fw, fh, 14 * unit);
    ctx.fill();
  } else {
    ctx.fillStyle = frame === 'polaroid' ? '#FBF8F1' : color;
    ctx.fillRect(fx, fy, fw, fh);
  }
  ctx.restore();
}

/** Finishing touches on top of the photo (vignette, dust). */
export function drawFrameFront(ctx: CanvasRenderingContext2D, frame: FrameStyle, x: number, y: number, w: number, h: number, unit: number, seed: number) {
  if (frame === 'booth') {
    vignette(ctx, x, y, w, h, 0.32);
    dust(ctx, x, y, w, h, unit, seed);
  }
  if (frame === 'film') vignette(ctx, x, y, w, h, 0.18);
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
