/**
 * Body feature detection from the subject mask.
 *
 * The collage tools that need faces, eyes, mouths, hands or feet (color block
 * heads, face crop zoom, detection boxes) read them from the person mask that
 * the cutout already produced. This keeps everything on the device and offline
 * with no second model to download: heads are the peaks of the mask outline,
 * eyes and mouth sit at fixed proportions inside each head, hands are the side
 * extremes of the body and feet its lowest points. Results are cached per mask
 * version, so the refine brushes update them.
 *
 * All positions are fractions of the photo (0..1 on both axes).
 */
import type { Anchor, CollagePhoto } from './types';

export interface Head { x: number; y: number; /** Radius as a fraction of the photo width. */ r: number }

export interface Features {
  heads: Head[];
  hands: { x: number; y: number }[];
  feet: { x: number; y: number }[];
  body: { x: number; y: number; w: number; h: number };
}

const cache = new WeakMap<HTMLCanvasElement, { v: number; f: Features }>();
const versions = new WeakMap<HTMLCanvasElement, number>();

/** Called by the refine brushes through bumpMask. */
export function invalidateFeatures(mask: HTMLCanvasElement) { versions.set(mask, (versions.get(mask) || 0) + 1); }

/** Changes whenever the mask is edited, for caches keyed by mask content. */
export const maskStamp = (mask: HTMLCanvasElement) => versions.get(mask) || 0;

const FALLBACK: Features = { heads: [{ x: 0.5, y: 0.3, r: 0.12 }], hands: [{ x: 0.25, y: 0.6 }, { x: 0.75, y: 0.6 }], feet: [{ x: 0.5, y: 0.95 }], body: { x: 0.5, y: 0.55, w: 0.6, h: 0.9 } };

export function features(p: CollagePhoto): Features {
  const v = versions.get(p.mask) || 0;
  const hit = cache.get(p.mask);
  if (hit && hit.v === v) return hit.f;
  const f = compute(p.mask);
  cache.set(p.mask, { v, f });
  return f;
}

function compute(mask: HTMLCanvasElement): Features {
  const N = 128;
  const k = N / Math.max(mask.width, mask.height);
  const w = Math.max(8, Math.round(mask.width * k)), h = Math.max(8, Math.round(mask.height * k));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return FALLBACK;
  ctx.drawImage(mask, 0, 0, w, h);
  const a = ctx.getImageData(0, 0, w, h).data;
  const on = (x: number, y: number) => a[(y * w + x) * 4 + 3] > 127;

  // Top profile: first subject row per column.
  const top = new Array<number>(w).fill(h);
  let minX = w, maxX = -1, minY = h, maxY = -1, count = 0;
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      if (on(x, y)) {
        if (top[x] === h) top[x] = y;
        count++;
        if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  // An empty or full mask (segmentation failed) says nothing useful.
  if (count < w * h * 0.01 || count > w * h * 0.97) return FALLBACK;

  // Smooth the profile, then find peaks (local minima of y) far enough apart.
  const sm = top.map((_, x) => {
    let s = 0, n = 0;
    for (let d = -3; d <= 3; d++) { const t = top[x + d]; if (t !== undefined && t < h) { s += t; n++; } }
    return n ? s / n : h;
  });
  const bodyH = maxY - minY + 1;
  const headR = Math.max(3, bodyH * 0.11);
  const cands: { x: number; y: number }[] = [];
  for (let x = 2; x < w - 2; x++) {
    if (sm[x] >= h) continue;
    let isMin = true;
    for (let d = -Math.round(headR); d <= Math.round(headR); d++) {
      const t = sm[x + d];
      if (t !== undefined && t < sm[x] - 0.01) { isMin = false; break; }
    }
    if (isMin) cands.push({ x, y: sm[x] });
  }
  // Keep the highest peaks, at least 1.6 head radii apart, ignoring low bumps (shoulders, hands).
  cands.sort((p, q) => p.y - q.y);
  const heads: Head[] = [];
  for (const cnd of cands) {
    if (cnd.y > minY + bodyH * 0.45) break;
    if (heads.some((hd) => Math.abs(hd.x * w - cnd.x) < headR * 1.6)) continue;
    // Head width: mask run at one radius below the top.
    const yy = Math.min(h - 1, Math.round(cnd.y + headR));
    let l = cnd.x, r = cnd.x;
    while (l > 0 && on(l - 1, yy) && cnd.x - l < headR * 1.6) l--;
    while (r < w - 1 && on(r + 1, yy) && r - cnd.x < headR * 1.6) r++;
    const rad = Math.max(headR * 0.7, (r - l) / 2);
    heads.push({ x: (l + r) / 2 / w, y: (cnd.y + rad) / h, r: rad / w });
    if (heads.length >= 8) break;
  }
  heads.sort((p, q) => p.x - q.x);

  // Hands: side extremes in the middle band of the body.
  let lx = w, ly = 0, rx = -1, ry = 0;
  for (let y = Math.round(minY + bodyH * 0.3); y < Math.round(minY + bodyH * 0.8); y++) {
    for (let x = 0; x < w; x++) if (on(x, y)) { if (x < lx) { lx = x; ly = y; } break; }
    for (let x = w - 1; x >= 0; x--) if (on(x, y)) { if (x > rx) { rx = x; ry = y; } break; }
  }
  const hands = rx >= 0 ? [{ x: lx / w, y: ly / h }, { x: rx / w, y: ry / h }] : FALLBACK.hands;

  // Feet: lowest subject pixels, left and right half of the body.
  const feet: { x: number; y: number }[] = [];
  const mid = (minX + maxX) / 2;
  for (const [x0, x1] of [[minX, mid], [mid, maxX + 1]] as const) {
    let by = -1, bx = 0;
    for (let x = Math.round(x0); x < Math.round(x1); x++) for (let y = h - 1; y > by; y--) if (on(x, y)) { by = y; bx = x; break; }
    if (by > minY + bodyH * 0.7) feet.push({ x: bx / w, y: by / h });
  }

  return {
    heads: heads.length ? heads : [{ x: (minX + maxX) / 2 / w, y: (minY + headR) / h, r: headR / w }],
    hands,
    feet: feet.length ? feet : [{ x: (minX + maxX) / 2 / w, y: maxY / h }],
    body: { x: (minX + maxX) / 2 / w, y: (minY + maxY) / 2 / h, w: (maxX - minX + 1) / w, h: bodyH / h }
  };
}

/** Center and size (fractions of the photo width) of a feature, for crops and boxes. */
export function anchorPoints(p: CollagePhoto, anchor: Anchor): { x: number; y: number; r: number }[] {
  const f = features(p);
  const ar = p.image.height / p.image.width;
  switch (anchor) {
    case 'face': return f.heads.map((hd) => ({ x: hd.x, y: hd.y, r: hd.r * 1.25 }));
    case 'eyes': return f.heads.map((hd) => ({ x: hd.x, y: hd.y - (hd.r * 0.15) / ar, r: hd.r * 0.75 }));
    case 'mouth': return f.heads.map((hd) => ({ x: hd.x, y: hd.y + (hd.r * 0.5) / ar, r: hd.r * 0.5 }));
    case 'hands': return f.hands.map((pt) => ({ ...pt, r: (f.heads[0]?.r ?? 0.1) * 0.9 }));
    case 'feet': return f.feet.map((pt) => ({ x: pt.x, y: pt.y - ((f.heads[0]?.r ?? 0.1) * 0.5) / ar, r: (f.heads[0]?.r ?? 0.1) * 0.9 }));
    case 'body': return [{ x: f.body.x, y: f.body.y, r: Math.max(f.body.w, f.body.h / ar) / 2 }];
  }
}
