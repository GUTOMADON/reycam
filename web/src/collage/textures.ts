/**
 * Procedural paper, fabric and media textures. They are generated once per
 * type into small tiles and reused as canvas patterns, so the app ships no
 * texture images and works offline at any export size.
 */
import type { Texture } from './types';
import { hexToRgb, withAlpha } from './palettes';

/** Small deterministic random generator (mulberry32). */
export function rng(seed: number) {
  let a = (seed * 2654435761) >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const tiles = new Map<string, HTMLCanvasElement>();

function tile(key: string, size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void): HTMLCanvasElement {
  let c = tiles.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d')!, size);
    tiles.set(key, c);
  }
  return c;
}

/** Gray value noise, alpha carries the strength. */
function noiseTile(key: string, size: number, density: number, alpha: number, light = false) {
  return tile(key, size, (ctx, s) => {
    const img = ctx.createImageData(s, s);
    const r = rng(size + density * 1000);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = r();
      const on = v < density;
      const g = light ? 255 : 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = g;
      img.data[i + 3] = on ? Math.round(alpha * 255 * (0.4 + r() * 0.6)) : 0;
    }
    ctx.putImageData(img, 0, 0);
  });
}

function fiberTile(key: string, dark: boolean, count: number, len: number) {
  return tile(key, 384, (ctx, s) => {
    const r = rng(count * 7 + len);
    ctx.lineCap = 'round';
    for (let i = 0; i < count; i++) {
      const x = r() * s, y = r() * s, a = r() * Math.PI * 2, l = len * (0.3 + r());
      ctx.strokeStyle = dark ? `rgba(20,10,10,${0.12 + r() * 0.25})` : `rgba(255,255,255,${0.1 + r() * 0.25})`;
      ctx.lineWidth = 0.4 + r() * 0.9;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
    }
  });
}

function blotchTile(key: string) {
  return tile(key, 256, (ctx, s) => {
    const r = rng(42);
    for (let i = 0; i < 40; i++) {
      const x = r() * s, y = r() * s, rad = 20 + r() * 70;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const a = 0.04 + r() * 0.08;
      g.addColorStop(0, r() > 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) { ctx.save(); ctx.translate(dx, dy); ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2); ctx.restore(); }
    }
  });
}

function crossTile(key: string) {
  return tile(key, 64, (ctx, s) => {
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    for (let i = -s; i < s * 2; i += 4) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + s, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i + s, 0); ctx.lineTo(i, s); ctx.stroke();
    }
  });
}

function pattern(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, scale: number) {
  const p = ctx.createPattern(c, 'repeat')!;
  if (scale !== 1 && p.setTransform) p.setTransform(new DOMMatrix().scale(scale, scale));
  return p;
}

/**
 * Overlay a texture on a rectangle that is already filled with its base color.
 * `unit` is the canvas width / 1080, so textures keep the same look at every size.
 */
export function applyTexture(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, type: Texture, unit: number, seed = 1) {
  if (type === 'none') return;
  const s = Math.max(0.5, unit);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const fill = (c: HTMLCanvasElement, sc: number, op: GlobalCompositeOperation = 'source-over', alpha = 1) => {
    ctx.globalCompositeOperation = op;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pattern(ctx, c, sc);
    ctx.fillRect(x, y, w, h);
  };
  switch (type) {
    case 'felt':
      fill(noiseTile('felt-d', 256, 0.55, 0.22), s);
      fill(noiseTile('felt-l', 256, 0.25, 0.12, true), s * 1.3);
      fill(fiberTile('felt-f', false, 900, 10), s);
      fill(blotchTile('blotch'), s * 2, 'source-over', 0.7);
      break;
    case 'kraft':
      fill(noiseTile('kraft', 256, 0.3, 0.18), s);
      fill(fiberTile('kraft-f', true, 260, 14), s);
      break;
    case 'watercolor':
      fill(blotchTile('blotch'), s * 3);
      fill(noiseTile('wc', 256, 0.2, 0.1), s);
      break;
    case 'poster':
    case 'paper':
      fill(noiseTile('grain', 256, 0.5, 0.14), s);
      fill(noiseTile('grain-l', 256, 0.2, 0.08, true), s);
      break;
    case 'recycled':
      fill(noiseTile('grain', 256, 0.5, 0.14), s);
      fill(fiberTile('rec-f', true, 520, 9), s);
      break;
    case 'fabric':
      fill(crossTile('cross'), s);
      fill(noiseTile('grain', 256, 0.5, 0.1), s);
      break;
    case 'folds':
      fill(noiseTile('grain', 256, 0.5, 0.12), s);
      folds(ctx, x, y, w, h, 'grid', unit);
      break;
    case 'crayon':
    case 'chalk':
    case 'pencil':
    case 'marker':
      fill(noiseTile('grain', 256, 0.5, 0.12), s);
      break;
    case 'crumpled':
      fill(wrinkleTile('wrinkle'), s * 2.2, 'source-over', 1);
      fill(noiseTile('grain', 256, 0.5, 0.12), s);
      break;
    case 'notebook':
      notebook(ctx, x, y, w, h, unit);
      fill(noiseTile('grain', 256, 0.5, 0.08), s);
      break;
    case 'newsprint':
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(236,214,160,0.55)';
      ctx.fillRect(x, y, w, h);
      fill(noiseTile('grain', 256, 0.5, 0.16), s);
      fill(fiberTile('rec-f', true, 520, 9), s, 'source-over', 0.6);
      break;
    case 'canvas':
      fill(crossTile('cross'), s * 1.4);
      fill(crossTile('cross'), s * 0.7, 'source-over', 0.6);
      fill(noiseTile('grain', 256, 0.5, 0.1), s);
      break;
    case 'denim':
      fill(crossTile('cross'), s * 0.8, 'source-over', 0.9);
      fill(fiberTile('denim-f', false, 600, 6), s);
      fill(noiseTile('grain', 256, 0.5, 0.14), s);
      break;
    case 'spray':
    case 'riso':
    case 'halftone':
      fill(dotTile('ht-dots'), s, 'multiply', 0.25);
      fill(noiseTile('grain', 256, 0.5, 0.12), s);
      break;
    case 'oil':
      fill(blotchTile('blotch'), s * 1.2, 'overlay', 0.9);
      fill(strokeTile('oil'), s, 'source-over', 0.9);
      break;
  }
  ctx.restore();
  void seed;
}

/** Crumpled paper: random facets lit from the top left, tileable. */
function wrinkleTile(key: string) {
  return tile(key, 384, (ctx, s) => {
    const r = rng(41);
    for (let i = 0; i < 70; i++) {
      const cx = r() * s, cy = r() * s, rad = 30 + r() * 90;
      const a0 = r() * Math.PI * 2;
      for (const [ox, oy] of [[0, 0], [s, 0], [-s, 0], [0, s], [0, -s]]) {
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const a = a0 + (k / 5) * Math.PI * 2 + r() * 0.5;
          const px = ox + cx + Math.cos(a) * rad * (0.5 + r() * 0.6), py = oy + cy + Math.sin(a) * rad * (0.5 + r() * 0.6);
          k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.closePath();
        const light = Math.cos(a0 - 2.3);
        ctx.fillStyle = light > 0 ? `rgba(255,255,255,${0.1 * light})` : `rgba(0,0,0,${-0.13 * light})`;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.09)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  });
}

/** Halftone dot grid (black dots on transparent). */
function dotTile(key: string) {
  return tile(key, 24, (ctx, s) => {
    ctx.fillStyle = '#000';
    for (const [x, y] of [[6, 6], [18, 18]]) { ctx.beginPath(); ctx.arc(x, y, 4.2, 0, Math.PI * 2); ctx.fill(); }
    void s;
  });
}

/** Short oil paint strokes. */
function strokeTile(key: string) {
  return tile(key, 256, (ctx, s) => {
    const r = rng(23);
    ctx.lineCap = 'round';
    for (let i = 0; i < 260; i++) {
      const x = r() * s, y = r() * s, a = r() * Math.PI, len = 6 + r() * 16;
      ctx.strokeStyle = r() > 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 2 + r() * 4;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
    }
  });
}

/** Notebook ruling with a margin line and faint pencil math scribbles. */
function notebook(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, unit: number) {
  const gap = 46 * unit;
  ctx.strokeStyle = 'rgba(90,120,170,0.35)';
  ctx.lineWidth = 1.6 * unit;
  for (let yy = y + gap * 2; yy < y + h; yy += gap) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(200,60,80,0.35)';
  ctx.beginPath(); ctx.moveTo(x + 90 * unit, y); ctx.lineTo(x + 90 * unit, y + h); ctx.stroke();
  const r = rng(77);
  ctx.fillStyle = 'rgba(60,60,70,0.22)';
  ctx.font = `${30 * unit}px 'Segoe Script', 'Bradley Hand', cursive`;
  const bits = ['x² + 2x = 8', '√49 = 7', 'a/b', '3 × 4 = 12', 'f(x)', '∑ n', 'y = mx + b', '1/2 + 1/4', 'π r²', '(a+b)²'];
  for (let i = 0; i < 14; i++) {
    ctx.save();
    ctx.translate(x + r() * w, y + gap * (2 + Math.floor(r() * (h / gap))) - 8 * unit);
    ctx.rotate((r() - 0.5) * 0.1);
    ctx.fillText(bits[i % bits.length], 0, 0);
    ctx.restore();
  }
}

/** Paper fold creases: a soft shadow and a highlight along each line. */
export function folds(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, mode: 'grid' | 'middle', unit: number) {
  const lines: [number, number, number, number][] = [];
  if (mode === 'middle') lines.push([x, y + h / 2, x + w, y + h / 2]);
  else {
    for (let i = 1; i < 3; i++) lines.push([x + (w * i) / 3, y, x + (w * i) / 3, y + h]);
    for (let i = 1; i < 4; i++) lines.push([x, y + (h * i) / 4, x + w, y + (h * i) / 4]);
  }
  ctx.save();
  for (const [x0, y0, x1, y1] of lines) {
    const horiz = y0 === y1;
    ctx.lineWidth = 6 * unit;
    ctx.strokeStyle = 'rgba(0,0,0,0.10)';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.lineWidth = 1.4 * unit;
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.moveTo(x0 + (horiz ? 0 : 2 * unit), y0 + (horiz ? 2 * unit : 0));
    ctx.lineTo(x1 + (horiz ? 0 : 2 * unit), y1 + (horiz ? 2 * unit : 0));
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Wax crayon or oil pastel fill: many short overlapping strokes in the color
 * over a lighter base, so the paper shows through like a real crayon.
 */
export function crayonFill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, unit: number, seed: number, angle = -0.5) {
  const r = rng(seed);
  const [cr, cg, cb] = hexToRgb(color);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = `rgba(${Math.min(255, cr + 40)},${Math.min(255, cg + 40)},${Math.min(255, cb + 40)},1)`;
  ctx.fillRect(x, y, w, h);
  ctx.lineCap = 'round';
  const n = Math.round((w * h) / (900 * unit * unit));
  for (let i = 0; i < n; i++) {
    const px = x + r() * w, py = y + r() * h, len = (30 + r() * 70) * unit, a = angle + (r() - 0.5) * 0.4;
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.35 + r() * 0.5})`;
    ctx.lineWidth = (3 + r() * 6) * unit;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = pattern(ctx, noiseTile('crayon-holes', 256, 0.12, 0.6), Math.max(0.5, unit));
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/**
 * Break up a stroke drawn on its own canvas so it looks like crayon, chalk or
 * pencil: grain holes are punched out of it.
 */
export function roughenStroke(ctx: CanvasRenderingContext2D, w: number, h: number, type: Texture, unit: number) {
  if (type === 'halftone') {
    // Printed scribble: keep the stroke only where a dot grid is.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = pattern(ctx, dotTile('ht-dots'), Math.max(0.5, unit));
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    return;
  }
  if (type === 'spray') {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = pattern(ctx, noiseTile('rough-spray', 256, 0.4, 0.7), Math.max(0.5, unit));
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    return;
  }
  if (type !== 'crayon' && type !== 'chalk' && type !== 'pencil') return;
  const density = type === 'chalk' ? 0.32 : type === 'crayon' ? 0.22 : 0.12;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = pattern(ctx, noiseTile('rough-' + type, 256, density, 0.9), Math.max(0.5, unit));
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Film grain over the whole canvas. */
export function grain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, unit: number) {
  if (amount <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, amount);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern(ctx, noiseTile('film-d', 256, 0.5, 0.5), Math.max(0.5, unit));
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = pattern(ctx, noiseTile('film-l', 256, 0.5, 0.5, true), Math.max(0.5, unit) * 1.1);
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Soft dark corners. */
export function vignette(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, strength: number) {
  const g = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.3, x + w / 2, y + h / 2, Math.hypot(w, h) * 0.6);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, withAlpha('#000000', strength));
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** Dust specks and thin scratches, for photobooth prints. */
export function dust(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, unit: number, seed: number) {
  const r = rng(seed);
  ctx.save();
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.arc(x + r() * w, y + r() * h, (0.6 + r() * 1.6) * unit, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 0.8 * unit;
  for (let i = 0; i < 3; i++) {
    const sx = x + r() * w;
    ctx.beginPath(); ctx.moveTo(sx, y + r() * h * 0.3); ctx.lineTo(sx + (r() - 0.5) * 12 * unit, y + h * (0.5 + r() * 0.5)); ctx.stroke();
  }
  ctx.restore();
}
