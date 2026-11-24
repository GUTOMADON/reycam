/**
 * Collage tools added with the third template set (templates 57 to 110).
 * Same contract as effects.ts: one draw function per layer kind, called by the
 * main renderer with the shared FxEnv.
 */
import type {
  BackgroundLayer, CollagePhoto, FaceDoodleLayer, FrostLayer, GrungeLayer, LeakLayer, MosaicLayer, OrnamentLayer, PhotoLayer,
  PunchLayer, SlicesLayer, ThresholdLayer, Treatment, UiLayer
} from './types';
import type { FxEnv } from './effects';
import { cropRect, photoBox } from './render';
import { resolvePaint } from './resolve';
import { applyTexture, grain, rng, roughenStroke } from './textures';
import { treatPhoto } from './treatments';
import { FONTS, shapePath } from './assets';
import { anchorPoints } from './detect';
import { hexToRgb, rgbToHex, withAlpha } from './palettes';

const D2R = Math.PI / 180;
const TAU = Math.PI * 2;

const col = (env: FxEnv, p: Parameters<typeof resolvePaint>[0], fb: string) => resolvePaint(p, env.pal, fb);

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}

function photoOf(env: FxEnv, id: string): { pl: PhotoLayer; p: CollagePhoto } | null {
  const pl = env.byId.get(id) as PhotoLayer | undefined;
  if (!pl || pl.kind !== 'photo') return null;
  const p = env.photos[pl.photo] || env.photos[0];
  return p ? { pl, p } : null;
}

/** Source rectangle of a photo cover cropped to aspect `A`, centered on a feature. */
function coverRect(p: CollagePhoto, A: number, anchor?: string, zoom = 1, index = 0) {
  const iw = p.image.width, ih = p.image.height;
  let sw: number, sh: number;
  if (iw / ih > A) { sh = ih / zoom; sw = sh * A; } else { sw = iw / zoom; sh = sw / A; }
  let cx = iw / 2, cy = ih / 2;
  if (anchor) {
    const pts = anchorPoints(p, anchor as 'face');
    const pt = pts[index % Math.max(1, pts.length)];
    if (pt) { cx = pt.x * iw; cy = pt.y * ih; }
  }
  return { sx: Math.max(0, Math.min(iw - sw, cx - sw / 2)), sy: Math.max(0, Math.min(ih - sh, cy - sh / 2)), sw, sh };
}

// ---------------------------------------------------------------- slices

export function drawSlices(env: FxEnv, c: CanvasRenderingContext2D, l: SlicesLayer) {
  const p = env.photos[l.photo] || env.photos[0];
  if (!p) return;
  const w = l.w * env.W, h = l.h * env.H, u = env.unit;
  env.begin(c, l, w, h);
  const img = treatPhoto(p.image, p.id, l.treatment, env.pal, Math.min(env.photoMax, 1600));
  const k = img.width / p.image.width;
  const src = coverRect(p, w / h, l.anchor, l.zoom ?? 1);
  const r = rng(l.seed ?? 3);
  const gapCol = col(env, l.paint, '#F2C21A');
  const gapCol2 = col(env, l.paint2, gapCol);
  const n = Math.max(2, Math.round(l.count));
  const x0 = -w / 2, y0 = -h / 2;
  // Draw the part of the photo under a destination rectangle, shifted by (dx, dy).
  const piece = (dx: number, dy: number, dw: number, dh: number, ox = 0, oy = 0) =>
    c.drawImage(img, (src.sx + ((dx - x0) / w) * src.sw) * k, (src.sy + ((dy - y0) / h) * src.sh) * k, (dw / w) * src.sw * k, (dh / h) * src.sh * k, dx + ox, dy + oy, dw, dh);
  switch (l.mode) {
    case 'barcode': {
      const g = l.gap * u;
      const sw = (w - g * (n - 1)) / n;
      for (let i = 0; i < n; i++) {
        const x = x0 + i * (sw + g);
        piece(x, y0, sw, h, 0, (r() - 0.5) * h * l.shift * 0.1);
        if (i < n - 1) { c.fillStyle = i % 2 ? gapCol2 : gapCol; c.fillRect(x + sw, y0, g, h); }
      }
      break;
    }
    case 'torn': {
      const sh = h / n;
      for (let i = 0; i < n; i++) {
        const y = y0 + i * sh;
        const ox = (r() - 0.5) * w * l.shift * 0.12;
        c.save();
        c.beginPath();
        const edge = (yy: number, seed: number) => { const rr = rng(seed); const pts: [number, number][] = []; for (let x = 0; x <= 24; x++) pts.push([x0 - 20 + (x / 24) * (w + 40), yy + (rr() - 0.5) * 10 * u]); return pts; };
        const top = i === 0 ? [[x0 - 20, y0], [x0 + w + 20, y0]] as [number, number][] : edge(y, 100 + i);
        const bot = i === n - 1 ? [[x0 + w + 20, y0 + h], [x0 - 20, y0 + h]] as [number, number][] : edge(y + sh, 101 + i).reverse();
        [...top, ...bot].forEach(([x, yy], j) => (j ? c.lineTo(x + ox, yy) : c.moveTo(x + ox, yy)));
        c.closePath();
        // white torn paper edge
        c.save(); c.shadowColor = 'rgba(0,0,0,0.3)'; c.shadowBlur = 6 * u; c.fillStyle = gapCol; c.fill(); c.restore();
        c.clip();
        piece(x0, y - 4 * u, w, sh + 8 * u, ox, 0);
        c.restore();
      }
      break;
    }
    case 'tiles': {
      const g = l.gap * u;
      const cols = n, ts = (w - g * (cols - 1)) / cols, rows = Math.max(1, Math.round((h + g) / (ts + g)));
      const th = (h - g * (rows - 1)) / rows;
      c.fillStyle = gapCol; c.fillRect(x0, y0, w, h);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        if (r() < (l.removed ?? 0.15)) continue;
        piece(x0 + i * (ts + g), y0 + j * (th + g), ts, th);
      }
      break;
    }
    case 'shards': {
      piece(x0, y0, w, h);
      for (let i = 0; i < n; i++) {
        const cx = x0 + r() * w, cy = y0 + r() * h, rad = (60 + r() * 140) * u;
        const pts: [number, number][] = Array.from({ length: 3 + Math.floor(r() * 2) }, (_, q) => { const a = (q / 4) * TAU + r() * 1.2; return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad] as [number, number]; });
        const ox = (r() - 0.5) * 60 * u * l.shift, oy = (r() - 0.5) * 40 * u * l.shift;
        c.save();
        c.beginPath(); pts.forEach(([x, y], q) => (q ? c.lineTo(x + ox, y + oy) : c.moveTo(x + ox, y + oy))); c.closePath();
        c.save(); c.clip(); piece(x0, y0, w, h, ox, oy); c.restore();
        c.strokeStyle = gapCol; c.lineWidth = 3 * u; c.shadowColor = gapCol; c.shadowBlur = 8 * u; c.stroke();
        // glitter specks along the edge
        c.fillStyle = '#FFFFFF';
        for (let q = 0; q < 14; q++) { const [ax, ay] = pts[q % pts.length], [bx, by] = pts[(q + 1) % pts.length]; const t = r(); c.fillRect(ax + (bx - ax) * t + ox, ay + (by - ay) * t + oy, 2 * u, 2 * u); }
        c.restore();
      }
      break;
    }
  }
  c.restore();
}

// ---------------------------------------------------------------- light leak and prism

export function drawLeak(env: FxEnv, c: CanvasRenderingContext2D, l: LeakLayer) {
  const { W, H, unit: u } = env;
  env.info.boxes[l.id] = { cx: W / 2, cy: H / 2, w: W, h: H, rot: 0 };
  const r = rng(l.seed ?? 9);
  const colors = l.paints.map((p, i) => col(env, p, ['#9A3AF0', '#F28A1A', '#3AF07A'][i % 3]));
  c.save();
  c.globalCompositeOperation = 'screen';
  c.globalAlpha = (l.opacity ?? 1) * l.strength;
  // big soft flares from the edges
  colors.forEach((cc, i) => {
    const x = i % 2 ? W * (0.85 + r() * 0.2) : W * (-0.05 + r() * 0.2), y = H * r();
    const g = c.createRadialGradient(x, y, 0, x, y, W * (0.5 + r() * 0.3));
    g.addColorStop(0, withAlpha(cc, 0.9)); g.addColorStop(1, withAlpha(cc, 0));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  });
  // rainbow prism streak
  const sx = W * r(), a = (r() - 0.5) * 0.8;
  c.save(); c.translate(sx, H / 2); c.rotate(a);
  const g = c.createLinearGradient(-60 * u, 0, 60 * u, 0);
  ['#FF3A3A', '#FFB03A', '#F8F03A', '#3AF07A', '#3AA0FF', '#9A3AF0'].forEach((cc, i) => g.addColorStop(i / 5, withAlpha(cc, 0.45)));
  c.fillStyle = g; c.fillRect(-60 * u, -H, 120 * u, H * 2);
  c.restore();
  // bokeh and prism ghosts
  for (let i = 0; i < 16; i++) {
    const x = r() * W, y = r() * H, rad = (10 + r() * 50) * u;
    c.fillStyle = withAlpha(colors[i % colors.length], 0.25 + r() * 0.3);
    c.beginPath();
    if (i % 3 === 0) { for (let k = 0; k < 6; k++) { const aa = (k / 6) * TAU; k ? c.lineTo(x + Math.cos(aa) * rad, y + Math.sin(aa) * rad) : c.moveTo(x + rad, y); } c.closePath(); }
    else c.arc(x, y, rad, 0, TAU);
    c.fill();
  }
  c.restore();
}

// ---------------------------------------------------------------- grunge paint panel

export function drawGrunge(env: FxEnv, c: CanvasRenderingContext2D, l: GrungeLayer) {
  const w = l.w * env.W, h = l.h * env.H, u = env.unit;
  env.begin(c, l, w, h);
  const r = rng(l.seed ?? 4);
  const c1 = col(env, l.paint, '#F03A6A'), c2 = col(env, l.paint2, '#111111');
  // torn poster edges
  c.beginPath();
  const n = 18;
  for (let i = 0; i <= n; i++) c.lineTo(-w / 2 + (i / n) * w, -h / 2 + (r() - 0.5) * 14 * u);
  for (let i = 0; i <= n; i++) c.lineTo(w / 2 + (r() - 0.5) * 14 * u, -h / 2 + (i / n) * h);
  for (let i = n; i >= 0; i--) c.lineTo(-w / 2 + (i / n) * w, h / 2 + (r() - 0.5) * 14 * u);
  for (let i = n; i >= 0; i--) c.lineTo(-w / 2 + (r() - 0.5) * 14 * u, -h / 2 + (i / n) * h);
  c.closePath();
  c.fillStyle = c1; c.fill();
  c.save(); c.clip();
  applyTexture(c, -w / 2, -h / 2, w, h, 'poster', u);
  // spray mist and drips
  c.fillStyle = withAlpha(c2, 0.5);
  for (let i = 0; i < 700; i++) { const a = r() * TAU, d = Math.pow(r(), 0.6) * w * 0.35; c.fillRect(Math.cos(a) * d + w * 0.1, Math.sin(a) * d * 0.6 - h * 0.15, 2 * u, 2 * u); }
  c.fillStyle = c2;
  for (let i = 0; i < 7; i++) { const x = -w / 2 + r() * w, len = (40 + r() * 160) * u; c.fillRect(x, -h * 0.2, (3 + r() * 5) * u, len); c.beginPath(); c.arc(x + 3 * u, -h * 0.2 + len, 5 * u, 0, TAU); c.fill(); }
  // pixel glitch blocks
  for (let i = 0; i < 10; i++) { c.fillStyle = r() > 0.5 ? c2 : '#FFFFFF'; c.fillRect(-w / 2 + r() * w, -h / 2 + r() * h, (10 + r() * 60) * u, (4 + r() * 10) * u); }
  c.restore();
  c.restore();
}

// ---------------------------------------------------------------- feature mosaic

export function drawMosaic(env: FxEnv, c: CanvasRenderingContext2D, l: MosaicLayer) {
  const ph = photoOf(env, l.of);
  if (!ph) return;
  const { pl, p } = ph;
  const b = photoBox(pl, p, env.W, env.H);
  env.info.boxes[l.id] = { ...b };
  const crop = cropRect(p, pl);
  const k = b.w / crop.sw;
  const toCanvas = (fx: number, fy: number) => {
    const lx = ((fx * p.image.width - crop.sx) / crop.sw - 0.5) * b.w, ly = ((fy * p.image.height - crop.sy) / crop.sh - 0.5) * b.h;
    const cs = Math.cos(b.rot * D2R), sn = Math.sin(b.rot * D2R);
    return [b.cx + lx * cs - ly * sn, b.cy + lx * sn + ly * cs];
  };
  const feats = [...anchorPoints(p, 'eyes'), ...anchorPoints(p, 'mouth'), ...anchorPoints(p, 'face')];
  const colors = l.paints.map((x, i) => col(env, x, ['#F2C83A', '#C83AB0', '#4AB83A', '#1A3AC8'][i % 4]));
  const r = rng(l.seed ?? 5);
  const img = p.image;
  c.save();
  c.globalAlpha = l.opacity ?? 1;
  for (let i = 0; i < l.count; i++) {
    const f = feats[i % feats.length];
    const fx = f.x + (r() - 0.5) * f.r * 0.6, fy = f.y + (r() - 0.5) * f.r * 0.5 * (img.width / img.height);
    const sw = f.r * img.width * (0.5 + r() * 0.6), sh = sw * (0.4 + r() * 0.5);
    const [cx, cy] = toCanvas(fx, fy);
    const [tx, ty] = toCanvas(f.x + (r() - 0.5) * f.r * 2.4, f.y + (r() - 0.5) * f.r * 2.4 * (img.width / img.height));
    const dw = sw * k, dh = sh * k;
    c.save();
    c.translate(tx, ty);
    c.rotate((b.rot + (r() - 0.5) * 8) * D2R);
    c.drawImage(img, fx * img.width - sw / 2, fy * img.height - sh / 2, sw, sh, -dw / 2, -dh / 2, dw, dh);
    c.globalCompositeOperation = 'multiply';
    c.globalAlpha = (l.opacity ?? 1) * (0.5 + r() * 0.2);
    c.fillStyle = colors[i % colors.length];
    c.fillRect(-dw / 2, -dh / 2, dw, dh);
    c.restore();
    void cx; void cy;
  }
  if (l.confetti) {
    for (let i = 0; i < 12; i++) {
      const f = feats[i % feats.length];
      const [x, y] = toCanvas(f.x + (r() - 0.5) * f.r * 3, f.y + (r() - 0.5) * f.r * 3);
      const s = (8 + r() * 14) * env.unit;
      c.fillStyle = colors[i % colors.length];
      c.fillRect(x - s / 2, y - s / 2, s, s);
    }
  }
  c.restore();
}

// ---------------------------------------------------------------- ornaments

/** Draw the ornament motif as filled and stroked paths centered at 0, fitting `s`. */
function motif(c: CanvasRenderingContext2D, kind: OrnamentLayer['motif'], s: number, lw: number, seed: number) {
  const r = rng(seed);
  const R = s / 2;
  c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
  const flower = (x: number, y: number, rad: number, petals = 5) => {
    for (let i = 0; i < petals; i++) { c.save(); c.translate(x, y); c.rotate((i / petals) * TAU); c.beginPath(); c.ellipse(0, -rad * 0.55, rad * 0.28, rad * 0.5, 0, 0, TAU); c.fill(); c.restore(); }
    c.beginPath(); c.arc(x, y, rad * 0.2, 0, TAU); c.fill();
  };
  const curl = (x: number, y: number, rad: number, dir: number, turns = 1.6) => {
    c.beginPath();
    for (let t = 0; t <= 1; t += 0.02) { const a = dir * t * TAU * turns, d = rad * (1 - t * 0.85); c.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); }
    c.stroke();
  };
  const leaf = (x: number, y: number, len: number, a: number) => { c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -len * 0.3, len, 0); c.quadraticCurveTo(len * 0.5, len * 0.3, 0, 0); c.fill(); c.restore(); };
  switch (kind) {
    case 'swirl':
      for (const sx of [-1, 1]) { c.save(); c.scale(sx, 1); curl(R * 0.45, 0, R * 0.45, 1, 1.8); curl(R * 0.2, -R * 0.3, R * 0.25, -1); leaf(R * 0.1, R * 0.2, R * 0.4, 0.6); c.restore(); }
      c.beginPath(); c.moveTo(-R * 0.1, 0); c.lineTo(R * 0.1, 0); c.stroke();
      break;
    case 'clover':
      for (let i = 0; i < 4; i++) { c.save(); c.rotate((i / 4) * TAU); c.translate(0, -R * 0.3); shapePath(c, 'heart', R * 0.6); c.fill(); c.restore(); }
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(R * 0.2, R * 0.6, R * 0.1, R * 0.95); c.stroke();
      break;
    case 'lily':
      c.beginPath(); c.moveTo(0, R); c.quadraticCurveTo(R * 0.1, 0, 0, -R * 0.2); c.stroke();
      for (const [x, y, a] of [[0, -R * 0.5, 0], [-R * 0.45, -R * 0.1, -0.7], [R * 0.45, 0, 0.7]]) {
        c.save(); c.translate(x, y); c.rotate(a);
        for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(0, R * 0.2); c.quadraticCurveTo(i * R * 0.25, -R * 0.1, i * R * 0.12, -R * 0.3); c.stroke(); }
        c.restore();
      }
      curl(-R * 0.6, R * 0.6, R * 0.3, 1); curl(R * 0.6, R * 0.5, R * 0.25, -1);
      break;
    case 'bouquet':
      for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.32; c.beginPath(); c.moveTo(0, R * 0.9); c.quadraticCurveTo(Math.cos(a) * R * 0.2, 0, Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.75); c.stroke(); flower(Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.75, R * (0.18 + r() * 0.08), 5 + (i % 2)); }
      for (let i = 0; i < 6; i++) leaf((r() - 0.5) * R * 0.6, R * (0.1 + r() * 0.4), R * 0.35, (r() - 0.5) * 3);
      break;
    case 'floral':
    default:
      flower(0, 0, R * 0.45, 6);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; curl(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62, R * 0.3, i % 2 ? 1 : -1); leaf(Math.cos(a + 0.5) * R * 0.4, Math.sin(a + 0.5) * R * 0.4, R * 0.3, a + 0.5); }
  }
}

const ornCache = new Map<string, HTMLCanvasElement>();

export function drawOrnament(env: FxEnv, c: CanvasRenderingContext2D, l: OrnamentLayer) {
  const w = l.w * env.W, h = l.h * env.H, u = env.unit;
  env.begin(c, l, w, h);
  const color = col(env, l.paint, '#C8CC9A');
  const key = [l.style, l.motif, Math.round(w), Math.round(h), color, l.dot, l.square, l.seed].join('|');
  let art = ornCache.get(key);
  if (!art) {
    art = canvas(w, h);
    const ac = art.getContext('2d', { willReadFrequently: true })!;
    ac.translate(w / 2, h / 2);
    const s = Math.min(w, h) * 0.95;
    ac.fillStyle = '#000'; ac.strokeStyle = '#000';
    motif(ac, l.motif, s, l.style === 'line' ? 3 * u : s * 0.035, l.seed ?? 1);
    if (l.style === 'dots') {
      // Resample the motif on a grid: one dot per cell that is mostly covered.
      const step = Math.max(3, l.dot * u);
      const data = ac.getImageData(0, 0, art.width, art.height).data;
      ac.setTransform(1, 0, 0, 1, 0, 0);
      ac.clearRect(0, 0, art.width, art.height);
      ac.fillStyle = color;
      for (let y = step / 2; y < art.height; y += step) for (let x = step / 2; x < art.width; x += step) {
        if (data[((y | 0) * art.width + (x | 0)) * 4 + 3] < 100) continue;
        if (l.square) ac.fillRect(x - step * 0.38, y - step * 0.38, step * 0.76, step * 0.76);
        else { ac.beginPath(); ac.arc(x, y, step * 0.4, 0, TAU); ac.fill(); }
      }
    } else {
      ac.setTransform(1, 0, 0, 1, 0, 0);
      ac.globalCompositeOperation = 'source-in';
      ac.fillStyle = color; ac.fillRect(0, 0, art.width, art.height);
    }
    if (ornCache.size > 24) ornCache.delete(ornCache.keys().next().value as string);
    ornCache.set(key, art);
  }
  c.drawImage(art, -w / 2, -h / 2);
  c.restore();
}

// ---------------------------------------------------------------- punch outs

function holePath(c: CanvasRenderingContext2D, kind: PunchLayer['holes'][number], s: number, seed: number) {
  switch (kind) {
    case 'star': shapePath(c, 'star5', s, { rounded: true, seed }); break;
    case 'oval': c.beginPath(); c.ellipse(0, 0, s / 2, s * 0.36, 0, 0, TAU); break;
    case 'circle': c.beginPath(); c.arc(0, 0, s / 2, 0, TAU); break;
    case 'spiral': {
      // A thick spiral band.
      c.beginPath();
      const turns = 2.2, n = 80;
      for (let i = 0; i <= n; i++) { const t = i / n, a = t * TAU * turns, d = (s / 2) * (0.15 + t * 0.85); c.lineTo(Math.cos(a) * d, Math.sin(a) * d); }
      for (let i = n; i >= 0; i--) { const t = i / n, a = t * TAU * turns, d = (s / 2) * (0.15 + t * 0.85) - s * 0.12; c.lineTo(Math.cos(a) * Math.max(0, d), Math.sin(a) * Math.max(0, d)); }
      c.closePath();
      break;
    }
  }
}

export function drawPunch(env: FxEnv, c: CanvasRenderingContext2D, l: PunchLayer) {
  const w = l.w * env.W, h = l.h * env.H, u = env.unit;
  env.info.boxes[l.id] = { cx: l.x * env.W, cy: l.y * env.H, w, h, rot: l.rot };
  const off = canvas(w, h);
  const oc = off.getContext('2d')!;
  oc.fillStyle = col(env, l.paint, '#F5EDC8');
  oc.fillRect(0, 0, w, h);
  applyTexture(oc, 0, 0, w, h, l.texture, u);
  oc.globalCompositeOperation = 'destination-out';
  const r = rng(l.seed ?? 7);
  const s = l.size * env.W;
  if (l.single) {
    oc.save(); oc.translate(w / 2, h / 2); oc.rotate((l.holeRot ?? 0) * D2R);
    holePath(oc, l.holes[0] ?? 'oval', s, 1);
    oc.fill(); oc.restore();
  } else {
    const cols = Math.ceil(Math.sqrt(l.count * (w / h))), rows = Math.ceil(l.count / cols);
    for (let i = 0; i < l.count; i++) {
      const gx = i % cols, gy = Math.floor(i / cols);
      oc.save();
      oc.translate(((gx + 0.5 + (r() - 0.5) * 0.6) / cols) * w, ((gy + 0.5 + (r() - 0.5) * 0.6) / rows) * h);
      oc.rotate(r() * TAU);
      holePath(oc, l.holes[i % l.holes.length], s * (0.7 + r() * 0.6), i);
      oc.fill();
      oc.restore();
    }
  }
  c.save();
  c.globalAlpha = l.opacity ?? 1;
  c.translate(l.x * env.W, l.y * env.H);
  c.rotate(l.rot * D2R);
  c.shadowColor = 'rgba(0,0,0,0.25)'; c.shadowBlur = 8 * u;
  c.drawImage(off, -w / 2, -h / 2);
  c.restore();
}

// ---------------------------------------------------------------- torn threshold patch

export function drawThreshold(env: FxEnv, c: CanvasRenderingContext2D, l: ThresholdLayer) {
  const ph = photoOf(env, l.of);
  if (!ph) return;
  const { pl, p } = ph;
  const b = photoBox(pl, p, env.W, env.H);
  env.info.boxes[l.id] = { ...b };
  const crop = cropRect(p, pl);
  const bg = col(env, l.paint, '#9E2A2A'), ink = col(env, l.ink, '#111111');
  const thr: Treatment = { type: 'posterize', levels: 2, dark: { color: ink }, light: { color: bg } };
  const img = treatPhoto(p.image, p.id, thr, env.pal, Math.min(env.photoMax, 1200));
  const kx = img.width / p.image.width;
  const r = rng(l.seed ?? 2);
  for (const f of anchorPoints(p, l.anchor)) {
    // In eyes mode, one patch per eye.
    const spots = l.anchor === 'eyes' ? [[f.x - f.r * 0.45, f.y], [f.x + f.r * 0.45, f.y]] : [[f.x, f.y]];
    for (const [fx, fy] of spots) {
      const lx = ((fx * p.image.width - crop.sx) / crop.sw - 0.5) * b.w, ly = ((fy * p.image.height - crop.sy) / crop.sh - 0.5) * b.h;
      const rad = f.r * p.image.width * (b.w / crop.sw) * l.size * (l.anchor === 'eyes' ? 0.45 : 1);
      c.save();
      c.translate(b.cx, b.cy); c.rotate(b.rot * D2R); if (pl.flip) c.scale(-1, 1);
      c.beginPath();
      for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; const d = rad * (0.8 + r() * 0.35); c.lineTo(lx + Math.cos(a) * d * 1.3, ly + Math.sin(a) * d); }
      c.closePath();
      c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 6 * env.unit; c.fillStyle = '#F8F6F0'; c.fill(); c.shadowColor = 'transparent';
      c.clip();
      c.drawImage(img, crop.sx * kx, crop.sy * kx, crop.sw * kx, crop.sh * kx, -b.w / 2 + 3 * env.unit, -b.h / 2 + 3 * env.unit, b.w, b.h);
      c.restore();
    }
  }
}

// ---------------------------------------------------------------- frosted glass

export function drawFrost(env: FxEnv, c: CanvasRenderingContext2D, l: FrostLayer) {
  const s = l.w * env.W, u = env.unit;
  env.info.boxes[l.id] = { cx: l.x * env.W, cy: l.y * env.H, w: s, h: s, rot: l.rot };
  // Snapshot what is drawn so far, then show it blurred and lightened inside the shape.
  const snap = canvas(c.canvas.width, c.canvas.height);
  snap.getContext('2d')!.drawImage(c.canvas, 0, 0);
  c.save();
  c.translate(l.x * env.W, l.y * env.H);
  c.rotate(l.rot * D2R);
  const path = () => (l.shape === 'circle' ? (c.beginPath(), c.arc(0, 0, s / 2, 0, TAU)) : shapePath(c, 'star5', s, { rounded: true, wobble: 0.15, seed: l.seed }));
  path();
  c.save();
  c.clip();
  c.rotate(-l.rot * D2R);
  c.translate(-l.x * env.W, -l.y * env.H);
  c.filter = `blur(${(6 + l.frost * 20) * u}px) brightness(${1.1 + l.frost * 0.3})`;
  c.drawImage(snap, 0, 0);
  c.filter = 'none';
  c.fillStyle = `rgba(255,255,255,${0.12 + l.frost * 0.25})`;
  c.fillRect(0, 0, env.W, env.H);
  c.restore();
  // ragged white edge
  path();
  c.strokeStyle = 'rgba(255,255,255,0.85)';
  c.lineWidth = 5 * u;
  c.setLineDash([3 * u, 2 * u, 8 * u, 3 * u]);
  c.stroke();
  c.restore();
}

// ---------------------------------------------------------------- face doodles

export function drawFaceDoodle(env: FxEnv, c: CanvasRenderingContext2D, l: FaceDoodleLayer) {
  const ph = photoOf(env, l.of);
  if (!ph) return;
  const { pl, p } = ph;
  const b = photoBox(pl, p, env.W, env.H);
  env.info.boxes[l.id] = { ...b };
  const crop = cropRect(p, pl);
  const k = b.w / crop.sw;
  const colors = l.paints.map((x, i) => col(env, x, ['#F02AE0', '#2AA0F0', '#F27A1A', '#4AF02A', '#F2D21A'][i % 5]));
  const off = canvas(env.W, env.H);
  const oc = off.getContext('2d')!;
  oc.lineCap = 'round'; oc.lineJoin = 'round';
  oc.lineWidth = l.width * env.unit;
  const heads = anchorPoints(p, 'face');
  heads.forEach((hd, i) => {
    const item = l.items[i % l.items.length];
    const cc = colors[i % colors.length];
    const lx = ((hd.x * p.image.width - crop.sx) / crop.sw - 0.5) * b.w, ly = ((hd.y * p.image.height - crop.sy) / crop.sh - 0.5) * b.h;
    const R = (hd.r / 1.25) * p.image.width * k;
    oc.save();
    oc.translate(b.cx, b.cy); oc.rotate(b.rot * D2R); if (pl.flip) oc.scale(-1, 1);
    oc.translate(lx, ly);
    oc.strokeStyle = cc; oc.fillStyle = cc;
    switch (item) {
      case 'glasses':
        for (const sx of [-1, 1]) { oc.beginPath(); oc.arc(sx * R * 0.38, -R * 0.12, R * 0.28, 0, TAU); oc.stroke(); }
        oc.beginPath(); oc.moveTo(-R * 0.1, -R * 0.14); oc.lineTo(R * 0.1, -R * 0.14); oc.stroke();
        break;
      case 'mask':
        oc.beginPath(); oc.roundRect(-R * 0.75, -R * 0.42, R * 1.5, R * 0.6, R * 0.25); oc.stroke();
        oc.beginPath(); oc.moveTo(-R * 0.75, -R * 0.15); oc.lineTo(-R * 1.05, -R * 0.2); oc.moveTo(R * 0.75, -R * 0.15); oc.lineTo(R * 1.05, -R * 0.2); oc.stroke();
        break;
      case 'mustache':
        oc.beginPath(); oc.moveTo(0, R * 0.32); oc.quadraticCurveTo(-R * 0.3, R * 0.15, -R * 0.5, R * 0.42); oc.moveTo(0, R * 0.32); oc.quadraticCurveTo(R * 0.3, R * 0.15, R * 0.5, R * 0.42); oc.stroke();
        break;
      case 'blush':
        for (const sx of [-1, 1]) for (let q = 0; q < 3; q++) { oc.beginPath(); oc.moveTo(sx * R * (0.35 + q * 0.1), R * 0.12); oc.lineTo(sx * R * (0.3 + q * 0.1), R * 0.26); oc.stroke(); }
        break;
      case 'bow':
        oc.save(); oc.translate(R * 0.5, -R * 0.75);
        oc.beginPath(); oc.moveTo(0, 0); oc.lineTo(-R * 0.3, -R * 0.18); oc.lineTo(-R * 0.3, R * 0.18); oc.closePath(); oc.moveTo(0, 0); oc.lineTo(R * 0.3, -R * 0.18); oc.lineTo(R * 0.3, R * 0.18); oc.closePath(); oc.fill();
        oc.restore();
        break;
      case 'horns':
        for (const sx of [-1, 1]) { oc.beginPath(); oc.moveTo(sx * R * 0.3, -R * 0.85); oc.quadraticCurveTo(sx * R * 0.6, -R * 1.3, sx * R * 0.4, -R * 1.45); oc.quadraticCurveTo(sx * R * 0.45, -R * 1.1, sx * R * 0.15, -R * 0.9); oc.fill(); }
        break;
    }
    oc.restore();
  });
  roughenStroke(oc, env.W, env.H, 'crayon', env.unit);
  c.save();
  c.globalAlpha = l.opacity ?? 1;
  c.drawImage(off, 0, 0);
  c.restore();
}

// ---------------------------------------------------------------- playback screen, compact camera, swatch card

/** Average color of a photo, for the swatch card. */
const avgCache = new WeakMap<HTMLCanvasElement, string>();
function averageColor(img: HTMLCanvasElement) {
  const hit = avgCache.get(img);
  if (hit) return hit;
  const s = canvas(24, 24);
  const sc = s.getContext('2d', { willReadFrequently: true })!;
  sc.drawImage(img, img.width * 0.25, img.height * 0.25, img.width * 0.5, img.height * 0.5, 0, 0, 24, 24);
  const d = sc.getImageData(0, 0, 24, 24).data;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4;
  const hex = rgbToHex(r / n, g / n, b / n).toUpperCase();
  avgCache.set(img, hex);
  return hex;
}

function screenPhoto(env: FxEnv, c: CanvasRenderingContext2D, l: UiLayer, x: number, y: number, w: number, h: number) {
  const p = env.photos[l.photo ?? 0] || env.photos[0];
  if (!p) return;
  const img = treatPhoto(p.image, p.id, l.treatment, env.pal, Math.min(env.photoMax, 1400));
  const k = img.width / p.image.width;
  const src = coverRect(p, w / h, l.anchor, l.zoom ?? 1);
  c.drawImage(img, src.sx * k, src.sy * k, src.sw * k, src.sh * k, x, y, w, h);
}

export function drawUiExtra2(env: FxEnv, c: CanvasRenderingContext2D, l: UiLayer) {
  const { unit: u } = env;
  const w = l.w * env.W, h = (l.h ?? 0.3) * env.H;
  const accent = col(env, l.paint, '#F02A3A');
  const ink = col(env, l.text, '#FFFFFF');
  env.begin(c, l, w, h);
  switch (l.widget) {
    case 'playback': {
      c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 26 * u); c.fillStyle = accent; c.fill();
      const ix = -w / 2 + 22 * u, iy = -h / 2 + 22 * u, iw = w - 44 * u, ih = h - 44 * u;
      c.save(); c.beginPath(); c.roundRect(ix, iy, iw, ih, 10 * u); c.clip();
      screenPhoto(env, c, l, ix, iy, iw, ih);
      c.restore();
      c.fillStyle = ink; c.strokeStyle = ink; c.lineWidth = 2.5 * u;
      // battery, side icons, playback label and date
      c.strokeRect(ix + iw - 70 * u, iy + 16 * u, 46 * u, 22 * u); c.fillRect(ix + iw - 24 * u, iy + 22 * u, 5 * u, 10 * u); c.fillRect(ix + iw - 66 * u, iy + 20 * u, 30 * u, 14 * u);
      c.font = `${26 * u}px ${FONTS.pixel}`; c.textBaseline = 'top'; c.textAlign = 'left';
      c.fillText('▶ 100-0042', ix + 16 * u, iy + 14 * u);
      ['◐', '⚡', '▣'].forEach((g, i) => c.fillText(g, ix + 16 * u, iy + ih * 0.35 + i * 34 * u));
      c.textAlign = 'right'; c.textBaseline = 'bottom';
      c.fillStyle = '#FFB15C'; c.font = `${36 * u}px VT323, monospace`;
      c.fillText(l.title || "'26 11 24", ix + iw - 16 * u, iy + ih - 12 * u);
      break;
    }
    case 'compact': {
      // Original silver compact camera body, screen on the back with the photo.
      const g = c.createLinearGradient(0, -h / 2, 0, h / 2);
      g.addColorStop(0, '#F2F2F4'); g.addColorStop(0.5, '#C8CAD0'); g.addColorStop(1, '#9A9CA4');
      c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 18 * u; c.shadowOffsetY = 8 * u;
      c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 30 * u); c.fillStyle = g; c.fill();
      c.shadowColor = 'transparent';
      const sx = -w / 2 + w * 0.06, sy = -h / 2 + h * 0.12, sw = w * 0.62, sh = h * 0.76;
      c.fillStyle = '#111'; c.beginPath(); c.roundRect(sx - 6 * u, sy - 6 * u, sw + 12 * u, sh + 12 * u, 10 * u); c.fill();
      c.save(); c.beginPath(); c.rect(sx, sy, sw, sh); c.clip(); screenPhoto(env, c, l, sx, sy, sw, sh); c.restore();
      // buttons and dial
      const bx = sx + sw + w * 0.08;
      c.fillStyle = '#7A7C84';
      c.beginPath(); c.arc(bx + w * 0.1, -h * 0.12, w * 0.08, 0, TAU); c.fill();
      c.fillStyle = '#E8E8EC'; c.beginPath(); c.arc(bx + w * 0.1, -h * 0.12, w * 0.035, 0, TAU); c.fill();
      for (let i = 0; i < 3; i++) { c.fillStyle = '#8A8C94'; c.beginPath(); c.roundRect(bx, h * 0.12 + i * h * 0.12, w * 0.2, h * 0.07, 6 * u); c.fill(); }
      c.fillStyle = accent; c.beginPath(); c.arc(bx + w * 0.18, -h * 0.38, 6 * u, 0, TAU); c.fill();
      break;
    }
    case 'swatch': {
      const p = env.photos[l.photo ?? 0] || env.photos[0];
      const hex = l.paint ? col(env, l.paint, '#888888').slice(0, 7).toUpperCase() : p ? averageColor(p.image) : '#888888';
      c.shadowColor = 'rgba(0,0,0,0.25)'; c.shadowBlur = 12 * u; c.shadowOffsetY = 4 * u;
      c.fillStyle = '#FFFFFF'; c.fillRect(-w / 2, -h / 2, w, h);
      c.shadowColor = 'transparent';
      const m = w * 0.08;
      c.fillStyle = hex; c.fillRect(-w / 2 + m, -h / 2 + m, w - m * 2, h * 0.68 - m);
      c.fillStyle = '#111'; c.textAlign = 'left'; c.textBaseline = 'top';
      c.font = `700 ${h * 0.085}px ${FONTS.sans}`;
      c.fillText(l.title || 'YOUR COLOR', -w / 2 + m, h * 0.2, w - m * 2);
      c.font = `400 ${h * 0.07}px ${FONTS.sans}`;
      c.fillText(hex, -w / 2 + m, h * 0.32, w - m * 2);
      void hexToRgb;
      break;
    }
  }
  c.restore();
}

// ---------------------------------------------------------------- backgrounds

export function drawBackgroundExtra2(env: FxEnv, c: CanvasRenderingContext2D, l: BackgroundLayer): boolean {
  const { W, H, unit: u } = env;
  const c1 = col(env, l.paint, '#F0E8D8'), c2 = col(env, l.paint2, '#111111');
  const r = rng(l.seed ?? 5);
  switch (l.style) {
    case 'zebra': {
      c.fillStyle = c1; c.fillRect(0, 0, W, H);
      c.fillStyle = c2;
      for (let i = 0; i < 26; i++) {
        const y0 = (i / 26) * H * 1.2 - H * 0.1, th = (18 + r() * 26) * u;
        c.beginPath();
        c.moveTo(-20, y0);
        for (let x = 0; x <= W + 40; x += 40 * u) c.lineTo(x, y0 + Math.sin(x / (160 * u) + i) * 50 * u + (r() - 0.5) * 8 * u);
        for (let x = W + 40; x >= -20; x -= 40 * u) c.lineTo(x, y0 + th * (0.4 + Math.abs(Math.sin(x / (90 * u) + i * 2))) + Math.sin(x / (160 * u) + i) * 50 * u);
        c.closePath(); c.fill();
      }
      applyTexture(c, 0, 0, W, H, 'felt', u);
      return true;
    }
    case 'stained': {
      const inks = (l.paints?.length ? l.paints : [l.paint, l.paint2 ?? l.paint]).map((p, i) => col(env, p, ['#6A3A1A', '#E07A2A', '#E06A8A', '#F2B04A'][i % 4]));
      c.fillStyle = '#2A160C'; c.fillRect(0, 0, W, H);
      const cell = 120 * u;
      for (let y = 0; y < H + cell; y += cell) for (let x = 0; x < W + cell; x += cell) {
        const cx = x + (r() - 0.5) * cell * 0.3, cy = y + (r() - 0.5) * cell * 0.3;
        for (let k = 0; k < 6; k++) {
          c.save(); c.translate(cx, cy); c.rotate((k / 6) * TAU + r() * 0.2);
          c.beginPath(); c.ellipse(0, -cell * 0.28, cell * 0.14, cell * 0.26, 0, 0, TAU);
          c.fillStyle = inks[(k + Math.floor(x / cell)) % inks.length]; c.fill();
          c.strokeStyle = '#2A160C'; c.lineWidth = 4 * u; c.stroke();
          c.restore();
        }
        c.beginPath(); c.arc(cx, cy, cell * 0.1, 0, TAU); c.fillStyle = inks[inks.length - 1]; c.fill();
      }
      c.fillStyle = 'rgba(255,240,220,0.08)'; c.fillRect(0, 0, W, H);
      return true;
    }
    case 'tiles': {
      c.fillStyle = shadeLight(c1, -0.2); c.fillRect(0, 0, W, H);
      const t = 110 * u, g = 6 * u;
      for (let y = 0; y < H; y += t) for (let x = 0; x < W; x += t) {
        const gr = c.createLinearGradient(x, y, x + t, y + t);
        gr.addColorStop(0, shadeLight(c1, 0.12)); gr.addColorStop(1, shadeLight(c1, -0.05));
        c.fillStyle = gr; c.fillRect(x + g / 2, y + g / 2, t - g, t - g);
      }
      applyTexture(c, 0, 0, W, H, 'paper', u);
      return true;
    }
    case 'grunge': {
      c.fillStyle = c1; c.fillRect(0, 0, W, H);
      applyTexture(c, 0, 0, W, H, 'crumpled', u);
      c.fillStyle = withAlpha(c2, 0.35);
      c.font = `${30 * u}px ${FONTS.script}`;
      const notes = ['call me later', 'meet at 9', 'no sleep', 'tues / thurs', 'remember this', 'room 12'];
      for (let i = 0; i < 16; i++) { c.save(); c.translate(r() * W, r() * H); c.rotate((r() - 0.5) * 0.6); c.fillText(notes[i % notes.length], 0, 0); c.restore(); }
      c.font = `${22 * u}px ${FONTS.typewriter}`;
      for (let i = 0; i < 8; i++) { const x = r() * W, y = r() * H; for (let k = 0; k < 4; k++) c.fillText(Array.from({ length: 6 }, () => Math.floor(r() * 10)).join(' '), x, y + k * 26 * u); }
      grain(c, W, H, 0.3, u);
      return true;
    }
  }
  return false;
}

function shadeLight(hex: string, d: number) {
  const [r, g, b] = hexToRgb(hex);
  const f = (v: number) => (d > 0 ? v + (255 - v) * d : v * (1 + d));
  return rgbToHex(f(r), f(g), f(b));
}

/** Retro print finish: riso misregistration, halftone and paper wear over the whole collage. */
export function finishRiso(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const u = W / 1080;
  const snap = canvas(W, H);
  snap.getContext('2d')!.drawImage(ctx.canvas, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.35;
  ctx.drawImage(snap, 5 * u, 3 * u);
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.12;
  ctx.drawImage(snap, -4 * u, -2 * u);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#000';
  const step = 9 * u;
  for (let y = 0; y < H; y += step) for (let x = ((y / step) % 2) * step / 2; x < W; x += step) { ctx.beginPath(); ctx.arc(x, y, 1.4 * u, 0, TAU); ctx.fill(); }
  ctx.restore();
  ctx.save();
  applyTexture(ctx, 0, 0, W, H, 'folds', u);
  ctx.restore();
  grain(ctx, W, H, 0.3, u);
}
