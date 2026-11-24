/**
 * Photo treatments (pixel color mapping) and print frames. Treatments run on a
 * copy of the source pixels and are cached by their settings, so moving a
 * sticker never recomputes the photo.
 */
import type { FrameStyle, Paint, Palette, Treatment } from './types';
import { hexToRgb } from './palettes';
import { dust, grain, rng, vignette } from './textures';
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

/**
 * Photo filter applied before the treatment (filter pairing). The renderer sets
 * it for the duration of one render. Treatments that turn the photo into one or
 * two colors skip it, since the filter colors would be lost anyway.
 */
/** Per photo filter: `keyFor` names the filter of a photo ('' = none), `apply` runs it on the source pixels. */
type PhotoFilter = { keyFor: (photoKey: string) => string; apply: (src: HTMLCanvasElement, photoKey: string) => HTMLCanvasElement };
let activeFilter: PhotoFilter | null = null;
export function setPhotoFilter(f: PhotoFilter | null) { activeFilter = f; }
export const photoFilterKey = (photoKey: string) => activeFilter?.keyFor(photoKey) ?? '';
const SINGLE_TONE = new Set<Treatment['type']>(['mono', 'duotone', 'posterize', 'negative', 'halftone', 'invert']);

/** The treated photo. `key` identifies the source pixels (photo id + mask version). */
export function treatPhoto(src: HTMLCanvasElement, key: string, t: Treatment | undefined, palette: Palette, maxDim: number): HTMLCanvasElement {
  const tt: Treatment = t || { type: 'none' };
  const fk = activeFilter && !SINGLE_TONE.has(tt.type) ? activeFilter.keyFor(key) : '';
  if (fk) {
    src = activeFilter!.apply(src, key);
    key = key + '|f:' + fk;
  }
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
            if (rad > 0.3) {
              if (tt.square) { const s = rad * 1.6; ctx.fillRect(x - s / 2, y - s / 2, s, s); }
              else { ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill(); }
            }
          }
        }
        cache.set(k, out);
        return out;
      }
      case 'overlay':
        break;
      default: {
        const orig = tt.type === 'paint' ? new Uint8ClampedArray(d) : null;
        extraPass(tt, d, out.width, out.height, palette);
        if (orig && tt.type === 'paint') {
          ctx.putImageData(img, 0, 0);
          paintHatch(ctx, orig, out.width, out.height, resolvePaint(tt.hatch, palette, '#F8F020'), unit);
          if (cache.size > 40) cache.delete(cache.keys().next().value as string);
          cache.set(k, out);
          return out;
        }
      }
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

/** Every color a treatment uses, so the cache refreshes when a slot changes. */
function colorsOf(t: Treatment, palette: Palette): string[] {
  return Object.values(t)
    .filter((v): v is Paint => !!v && typeof v === 'object' && ('slot' in v || 'color' in v))
    .map((p) => resolvePaint(p, palette, ''));
}

/** Neon, ocean and sunset ramps for the paint over mode, dark to light. */
const SCHEMES: Record<string, string[]> = {
  neon: ['#2A0A5E', '#7A1FD0', '#E0247A', '#FF4A3A', '#FF9A2A', '#3A8CFF'],
  ocean: ['#061A3A', '#0A4A8A', '#1A8AC0', '#3AD0C8', '#A8F0E0', '#F8F0A0'],
  sunset: ['#2A0A1A', '#8A1A3A', '#E0402A', '#F88A2A', '#F8C84A', '#FFF0C0']
};

/** Pixel passes for the treatments added with the second template set. */
function extraPass(tt: Treatment, d: Uint8ClampedArray, w: number, h: number, palette: Palette) {
  switch (tt.type) {
    case 'negative': {
      const [dr, dg, db] = hexToRgb(resolvePaint(tt.tint, palette, '#A8F0C8'));
      const [lr, lg, lb] = hexToRgb(resolvePaint(tt.paper, palette, '#0A0A0A'));
      for (let i = 0; i < d.length; i += 4) {
        const v = 1 - curve(lum(d[i], d[i + 1], d[i + 2]), 1.2) / 255;
        d[i] = lr + (dr - lr) * v; d[i + 1] = lg + (dg - lg) * v; d[i + 2] = lb + (db - lb) * v;
      }
      return true;
    }
    case 'invert':
      for (let i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]; }
      return true;
    case 'posterize': {
      const [dr, dg, db] = hexToRgb(resolvePaint(tt.dark, palette, '#7A3AE0'));
      const [lr, lg, lb] = hexToRgb(resolvePaint(tt.light, palette, '#F8A0D0'));
      const n = Math.max(2, Math.round(tt.levels));
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.round((lum(d[i], d[i + 1], d[i + 2]) / 255) * (n - 1)) / (n - 1);
        d[i] = dr + (lr - dr) * v; d[i + 1] = dg + (lg - dg) * v; d[i + 2] = db + (lb - db) * v;
      }
      return true;
    }
    case 'grade': {
      const [tr, tg, tb] = hexToRgb(resolvePaint(tt.tint, palette, '#6A7A1A'));
      const a = tt.amount, sat = tt.saturation ?? 1, lift = tt.fade * 60;
      for (let i = 0; i < d.length; i += 4) {
        const v = lum(d[i], d[i + 1], d[i + 2]);
        for (let c = 0; c < 3; c++) {
          let x = v + (d[i + c] - v) * sat;
          x = curve(x, tt.contrast);
          const tint = c === 0 ? tr : c === 1 ? tg : tb;
          x = x * (1 - a) + ((x * tint) / 255) * a * 1.25 + ((tint - 128) * a) / 6;
          d[i + c] = lift + x * (1 - lift / 255);
        }
      }
      return true;
    }
    case 'paint': {
      const ramp = (SCHEMES[tt.scheme] || SCHEMES.neon).map(hexToRgb);
      const L = new Float32Array(w * h);
      for (let i = 0, p = 0; i < d.length; i += 4, p++) L[p] = lum(d[i], d[i + 1], d[i + 2]) / 255;
      for (let p = 0; p < L.length; p++) {
        const v = Math.min(ramp.length - 1, Math.floor(Math.pow(L[p], 0.9) * ramp.length));
        const [r, g, b] = ramp[v];
        // Black sketch lines where the local gradient is strong.
        const x = p % w, y = (p / w) | 0;
        const gx = x > 0 && x < w - 1 ? L[p + 1] - L[p - 1] : 0;
        const gy = y > 0 && y < h - 1 ? L[p + w] - L[p - w] : 0;
        const edge = Math.hypot(gx, gy) > 0.16 * (1.2 - tt.lines * 0.6);
        const i = p * 4;
        d[i] = edge ? 12 : r; d[i + 1] = edge ? 6 : g; d[i + 2] = edge ? 24 : b;
      }
      return true;
    }
  }
  return false;
}

/** Hatching strokes for the paint over mode, drawn after the pixel pass. */
function paintHatch(ctx: CanvasRenderingContext2D, src: Uint8ClampedArray, w: number, h: number, color: string, unit: number) {
  const r = rng(13);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.2 * unit;
  const n = Math.round((w * h) / (2600 * unit * unit));
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h;
    const p = ((y | 0) * w + (x | 0)) * 4;
    const v = lum(src[p], src[p + 1], src[p + 2]);
    if (v > 150 || v < 25) continue;
    const len = (10 + r() * 16) * unit;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) { const o = k * 5 * unit; ctx.moveTo(x + o, y); ctx.lineTo(x + o + len * 0.6, y - len); }
    ctx.stroke();
  }
  ctx.restore();
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
    case 'rough': return { l: 0.05, t: 0.05, r: 0.05, b: 0.05 };
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
  } else if (frame === 'rough') {
    // Hand drawn white frame of irregular thickness.
    const r = rng(Math.round(w + h));
    const jag = (n: number, a: number, b: number) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
    ctx.beginPath();
    jag(14, fx, fx + fw).forEach((px, i) => (i ? ctx.lineTo(px, fy + (r() - 0.5) * w * 0.03) : ctx.moveTo(px, fy)));
    jag(14, fy, fy + fh).forEach((py) => ctx.lineTo(fx + fw + (r() - 0.5) * w * 0.03, py));
    jag(14, fx + fw, fx).forEach((px) => ctx.lineTo(px, fy + fh + (r() - 0.5) * w * 0.03));
    jag(14, fy + fh, fy).forEach((py) => ctx.lineTo(fx + (r() - 0.5) * w * 0.03, py));
    ctx.closePath();
    ctx.fillStyle = color;
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
