/**
 * Original vector assets drawn with the canvas API: stars, starbursts,
 * sparkles, hearts, embroidered patches, ransom letter tiles and a generic
 * retro desktop kit. Nothing here copies a real operating system, app or brand.
 * Every function draws centered at (0, 0) in the current transform.
 */
import type { Material, ShapeKind } from './types';
import { contrastOn, hexToRgb, hslToHex, rgbToHsl, withAlpha } from './palettes';
import { rng } from './textures';

export const FONTS: Record<string, string> = {
  script: "'Segoe Script', 'Bradley Hand', 'Snell Roundhand', 'Brush Script MT', cursive",
  marker: "'Marker Felt', 'Permanent Marker', 'Comic Sans MS', 'Chalkboard SE', cursive",
  pixel: "VT323, 'Courier New', monospace",
  sans: "Inter, system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif"
};

const TAU = Math.PI * 2;

/** Build the outline of a shape of width `size` into the current path. */
export function shapePath(ctx: CanvasRenderingContext2D, kind: ShapeKind, size: number, o: { points?: number; wobble?: number; rounded?: boolean; seed?: number; h?: number } = {}) {
  const r = size / 2;
  const rand = rng(o.seed ?? 7);
  const wob = o.wobble ?? 0;
  const jit = () => 1 + (rand() - 0.5) * wob * 0.5;
  ctx.beginPath();
  switch (kind) {
    case 'star5':
    case 'paperStar': {
      const n = o.points ?? 5;
      const inner = kind === 'paperStar' ? 0.44 : 0.42;
      const pts: [number, number][] = [];
      for (let i = 0; i < n * 2; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / n + (rand() - 0.5) * wob * 0.25;
        const rad = (i % 2 ? r * inner : r) * jit();
        pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
      }
      if (o.rounded) roundedPoly(ctx, pts, r * 0.08);
      else { ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]); ctx.closePath(); }
      break;
    }
    case 'star4':
    case 'sparkle': {
      const inner = kind === 'sparkle' ? 0.16 : 0.3;
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 4;
        const rad = (i % 2 ? r * inner : r) * jit();
        if (kind === 'sparkle' && i % 2) {
          const prev = -Math.PI / 2 + ((i - 1) * Math.PI) / 4;
          ctx.quadraticCurveTo(Math.cos(a) * rad, Math.sin(a) * rad, Math.cos(prev + Math.PI / 2) * r, Math.sin(prev + Math.PI / 2) * r);
        } else if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else if (kind !== 'sparkle') ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      break;
    }
    case 'burst': {
      const n = o.points ?? 18;
      for (let i = 0; i < n * 2; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / n;
        const rad = (i % 2 ? r * (0.62 + rand() * 0.08) : r * (0.9 + rand() * 0.1)) * jit();
        i === 0 ? ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad) : ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      break;
    }
    case 'heart': {
      const s = r;
      ctx.moveTo(0, s * 0.85);
      ctx.bezierCurveTo(-s * 1.15, s * 0.05, -s * 0.85, -s * 0.95, 0, -s * 0.4);
      ctx.bezierCurveTo(s * 0.85, -s * 0.95, s * 1.15, s * 0.05, 0, s * 0.85);
      ctx.closePath();
      break;
    }
    case 'dot':
    case 'circle':
    case 'ring':
      ctx.arc(0, 0, r, 0, TAU);
      break;
    case 'rect': {
      const h = (o.h ?? 1) * size;
      ctx.rect(-r, -h / 2, size, h);
      break;
    }
    case 'asterisk':
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 4;
        ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.lineTo(-Math.cos(a) * r, -Math.sin(a) * r);
      }
      break;
    case 'swirl': {
      for (let t = 0; t <= 1; t += 0.02) {
        const a = t * TAU * 2.4, rad = r * t;
        t === 0 ? ctx.moveTo(0, 0) : ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      break;
    }
  }
}

function roundedPoly(ctx: CanvasRenderingContext2D, pts: [number, number][], rad: number) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const m0 = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
    const m1 = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
    if (i === 0) ctx.moveTo(m0[0], m0[1]);
    ctx.arcTo(p1[0], p1[1], m1[0], m1[1], rad);
  }
  ctx.closePath();
}

/** Open shapes are stroked only. */
export const isLineShape = (k: ShapeKind) => k === 'asterisk' || k === 'swirl' || k === 'ring';

/**
 * Fill style for a star material. Holographic stars shift their rainbow over
 * time (`t` in seconds) and with each star's seed, so no two stars look alike.
 */
export function materialFill(ctx: CanvasRenderingContext2D, material: Material, base: string, size: number, t: number, seed: number): CanvasGradient | string {
  const r = size / 2;
  if (material === 'flat') return base;
  const shift = (seed * 0.137 + t * 0.12) % 1;
  if (material === 'holo' || material === 'puffy') {
    const a = shift * TAU;
    const g = ctx.createLinearGradient(Math.cos(a) * -r, Math.sin(a) * -r, Math.cos(a) * r, Math.sin(a) * r);
    const hues = [320, 280, 210, 160, 55, 25];
    hues.forEach((h, i) => g.addColorStop(i / (hues.length - 1), hslToHex(h + shift * 360, 0.85, 0.78)));
    return g;
  }
  if (material === 'pastel') {
    const g = ctx.createLinearGradient(-r, -r, r, r);
    [340, 270, 200, 140, 50].forEach((h, i, arr) => g.addColorStop(i / (arr.length - 1), hslToHex(h + shift * 120, 0.7, 0.86)));
    return g;
  }
  if (material === 'pearl') {
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.45, hslToHex(140 + shift * 60, 0.45, 0.9));
    g.addColorStop(0.8, hslToHex(20 + shift * 40, 0.6, 0.88));
    g.addColorStop(1, '#EDE8F2');
    return g;
  }
  // metallic: the base color with a bright sheen band
  const [cr, cg, cb] = hexToRgb(base);
  const [h, s, l] = rgbToHsl(cr, cg, cb);
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, hslToHex(h, s, Math.max(0.15, l - 0.25)));
  g.addColorStop(0.45, hslToHex(h, s * 0.6, Math.min(0.95, l + 0.35)));
  g.addColorStop(0.55, hslToHex(h, s, l));
  g.addColorStop(1, hslToHex(h, s, Math.max(0.1, l - 0.3)));
  return g;
}

/** Shine and edge for holographic and puffy stickers. */
export function materialFinish(ctx: CanvasRenderingContext2D, material: Material, size: number) {
  if (material === 'flat' || material === 'pastel') return;
  const r = size / 2;
  ctx.save();
  ctx.clip();
  const g = ctx.createLinearGradient(-r, -r, r * 0.2, r * 0.2);
  g.addColorStop(0, 'rgba(255,255,255,0.65)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, size, size);
  if (material === 'puffy') {
    ctx.globalCompositeOperation = 'multiply';
    const d = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
    d.addColorStop(0, 'rgba(255,255,255,0)');
    d.addColorStop(1, 'rgba(120,90,140,0.35)');
    ctx.fillStyle = d;
    ctx.fillRect(-r, -r, size, size);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- patches

export function drawPatch(ctx: CanvasRenderingContext2D, shape: 'star' | 'heart', pattern: string, c1: string, c2: string, size: number, unit: number, seed: number) {
  const r = size / 2;
  const kind: ShapeKind = shape === 'star' ? 'star5' : 'heart';
  ctx.save();
  // embroidered border
  shapePath(ctx, kind, size, { rounded: true, seed });
  ctx.fillStyle = c2;
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 4 * unit;
  ctx.shadowOffsetY = 2 * unit;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  shapePath(ctx, kind, size * 0.84, { rounded: true, seed });
  ctx.fillStyle = c1;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const rand = rng(seed);
  switch (pattern) {
    case 'stripes':
      ctx.fillStyle = c2;
      for (let x = -r; x < r; x += size * 0.14) ctx.fillRect(x, -r, size * 0.06, size);
      break;
    case 'dots':
      ctx.fillStyle = c2;
      for (let y = -r; y < r; y += size * 0.16) for (let x = -r + ((y / (size * 0.16)) % 2) * size * 0.08; x < r; x += size * 0.16) { ctx.beginPath(); ctx.arc(x, y, size * 0.035, 0, TAU); ctx.fill(); }
      break;
    case 'spiral':
      ctx.strokeStyle = c2;
      ctx.lineWidth = size * 0.05;
      shapePath(ctx, 'swirl', size * 0.9, {});
      ctx.stroke();
      break;
    case 'sunburst':
      ctx.fillStyle = c2;
      for (let i = 0; i < 16; i += 2) {
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.arc(0, 0, r, (i * TAU) / 16, ((i + 1) * TAU) / 16);
        ctx.closePath(); ctx.fill();
      }
      break;
    case 'glitter':
      for (let i = 0; i < 140; i++) {
        ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.8)' : withAlpha(c2, 0.9);
        ctx.fillRect((rand() - 0.5) * size, (rand() - 0.5) * size, size * 0.025, size * 0.025);
      }
      break;
    case 'rhinestone':
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU, d = r * 0.42;
        const g = ctx.createRadialGradient(Math.cos(a) * d - size * 0.01, Math.sin(a) * d - size * 0.01, 0, Math.cos(a) * d, Math.sin(a) * d, size * 0.05);
        g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.5, c2); g.addColorStop(1, withAlpha('#000000', 0.4));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, size * 0.05, 0, TAU); ctx.fill();
      }
      break;
  }
  ctx.restore();
  // stitches
  shapePath(ctx, kind, size * 0.92, { rounded: true, seed });
  ctx.setLineDash([size * 0.03, size * 0.025]);
  ctx.strokeStyle = withAlpha(contrastOn(c2) === '#FFFFFF' ? '#FFFFFF' : '#000000', 0.55);
  ctx.lineWidth = Math.max(1, size * 0.012);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- letter tiles

const TILE_FONTS = [FONTS.serif, FONTS.sans, FONTS.marker, "'Courier New', monospace", "Impact, 'Arial Black', sans-serif", FONTS.script];

/** Ransom note: each letter on its own paper tile with its own font and tilt. Returns total width. */
export function drawTiles(ctx: CanvasRenderingContext2D, text: string, tiles: string[], letters: string[], size: number, seed: number) {
  const chars = [...text];
  const rand = rng(seed);
  const tw = size / Math.max(1, chars.length);
  const th = tw * 1.15;
  chars.forEach((ch, i) => {
    const x = -size / 2 + tw * (i + 0.5);
    ctx.save();
    ctx.translate(x, (rand() - 0.5) * th * 0.15);
    ctx.rotate((rand() - 0.5) * 0.35);
    if (ch.trim()) {
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = tw * 0.08;
      ctx.shadowOffsetY = tw * 0.04;
      ctx.fillStyle = tiles[i % tiles.length];
      ctx.fillRect(-tw * 0.46, -th / 2, tw * 0.92, th);
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = letters[i % letters.length];
      ctx.font = `700 ${tw * 0.78}px ${TILE_FONTS[Math.floor(rand() * TILE_FONTS.length)]}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rand() > 0.5 ? ch.toUpperCase() : ch, 0, tw * 0.04);
    }
    ctx.restore();
  });
  return th;
}

// ---------------------------------------------------------------- retro desktop kit

/** Raised or sunken bevel in the generic 90s style. */
function bevel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, u: number, face: string, sunken = false) {
  ctx.fillStyle = face;
  ctx.fillRect(x, y, w, h);
  const hi = sunken ? '#7B7B7B' : '#FFFFFF';
  const lo = sunken ? '#FFFFFF' : '#5A5A5A';
  ctx.fillStyle = hi;
  ctx.fillRect(x, y, w, 2 * u); ctx.fillRect(x, y, 2 * u, h);
  ctx.fillStyle = lo;
  ctx.fillRect(x, y + h - 2 * u, w, 2 * u); ctx.fillRect(x + w - 2 * u, y, 2 * u, h);
}

export function drawIcon(ctx: CanvasRenderingContext2D, icon: string, s: number, accent: string) {
  const u = s / 32;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.5 * u;
  ctx.strokeStyle = '#1A1A1A';
  switch (icon) {
    case 'pc':
      ctx.fillStyle = '#D9D5CC'; ctx.fillRect(-12 * u, -13 * u, 24 * u, 18 * u); ctx.strokeRect(-12 * u, -13 * u, 24 * u, 18 * u);
      ctx.fillStyle = accent; ctx.fillRect(-9 * u, -10 * u, 18 * u, 12 * u);
      ctx.fillStyle = '#C9C4B8'; ctx.fillRect(-14 * u, 8 * u, 28 * u, 6 * u); ctx.strokeRect(-14 * u, 8 * u, 28 * u, 6 * u);
      break;
    case 'trash':
      ctx.fillStyle = '#CFD6DA'; ctx.beginPath(); ctx.moveTo(-10 * u, -9 * u); ctx.lineTo(10 * u, -9 * u); ctx.lineTo(8 * u, 14 * u); ctx.lineTo(-8 * u, 14 * u); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillRect(-12 * u, -13 * u, 24 * u, 4 * u); ctx.strokeRect(-12 * u, -13 * u, 24 * u, 4 * u);
      for (const x of [-4, 0, 4]) { ctx.beginPath(); ctx.moveTo(x * u, -5 * u); ctx.lineTo(x * u, 10 * u); ctx.stroke(); }
      break;
    case 'globe':
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(0, 0, 12 * u, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4CAF50'; ctx.beginPath(); ctx.ellipse(-3 * u, -3 * u, 5 * u, 4 * u, 0.4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(5 * u, 5 * u, 4 * u, 3 * u, -0.3, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, 5 * u, 12 * u, 0, 0, TAU); ctx.stroke();
      break;
    case 'folder':
    case 'zip':
      ctx.fillStyle = '#F2C94C'; ctx.beginPath(); ctx.moveTo(-14 * u, -9 * u); ctx.lineTo(-4 * u, -9 * u); ctx.lineTo(-1 * u, -6 * u); ctx.lineTo(14 * u, -6 * u); ctx.lineTo(14 * u, 12 * u); ctx.lineTo(-14 * u, 12 * u); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (icon === 'zip') { ctx.fillStyle = '#1A1A1A'; for (let y = -5; y < 12; y += 3) ctx.fillRect(-1 * u, y * u, 2 * u, 1.5 * u); }
      break;
    case 'image':
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-11 * u, -14 * u, 22 * u, 28 * u); ctx.strokeRect(-11 * u, -14 * u, 22 * u, 28 * u);
      ctx.fillStyle = accent; ctx.fillRect(-8 * u, -9 * u, 16 * u, 12 * u);
      ctx.fillStyle = '#4CAF50'; ctx.beginPath(); ctx.moveTo(-8 * u, 3 * u); ctx.lineTo(-2 * u, -3 * u); ctx.lineTo(8 * u, 3 * u); ctx.fill();
      break;
    case 'music':
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-11 * u, -14 * u, 22 * u, 28 * u); ctx.strokeRect(-11 * u, -14 * u, 22 * u, 28 * u);
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(-3 * u, 6 * u, 3.5 * u, 0, TAU); ctx.fill(); ctx.fillRect(-0.5 * u, -8 * u, 2 * u, 14 * u); ctx.fillRect(-0.5 * u, -8 * u, 7 * u, 2.5 * u);
      break;
    case 'warning':
      ctx.fillStyle = '#F2C94C'; ctx.beginPath(); ctx.moveTo(0, -13 * u); ctx.lineTo(13 * u, 11 * u); ctx.lineTo(-13 * u, 11 * u); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1A1A1A'; ctx.fillRect(-1.5 * u, -5 * u, 3 * u, 9 * u); ctx.fillRect(-1.5 * u, 6 * u, 3 * u, 3 * u);
      break;
  }
  ctx.restore();
}

/** Arrow mouse pointer. */
export function drawPointer(ctx: CanvasRenderingContext2D, s: number) {
  const u = s / 24;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 18 * u); ctx.lineTo(4.5 * u, 13.5 * u); ctx.lineTo(8 * u, 21 * u); ctx.lineTo(11 * u, 19.5 * u); ctx.lineTo(7.5 * u, 12.5 * u); ctx.lineTo(13 * u, 12.5 * u); ctx.closePath();
  ctx.fillStyle = '#FFFFFF'; ctx.fill();
  ctx.lineWidth = 1.4 * u; ctx.strokeStyle = '#111111'; ctx.stroke();
  ctx.restore();
}

/** Dialog window with title bar, icon, message and buttons. */
export function drawDialog(ctx: CanvasRenderingContext2D, w: number, h: number, o: { title: string; message: string; buttons: string[]; icon: string; bar: string; style: 'flat' | '3d'; font: string; unit: number; text?: string }) {
  const u = Math.max(0.5, w / 420);
  const x = -w / 2, y = -h / 2;
  ctx.save();
  if (o.style === '3d') {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 10 * u, y + 12 * u, w, h);
    ctx.fillStyle = '#9EA3AE';
    ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w + 12 * u, y + 10 * u); ctx.lineTo(x + w + 12 * u, y + h + 10 * u); ctx.lineTo(x + 12 * u, y + h + 10 * u); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
  } else {
    ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 10 * u; ctx.shadowOffsetY = 4 * u;
  }
  bevel(ctx, x, y, w, h, u, '#D4D0C8');
  ctx.shadowColor = 'transparent';
  const barH = 30 * u;
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, o.bar); g.addColorStop(1, withAlpha(o.bar, 0.65));
  ctx.fillStyle = g;
  ctx.fillRect(x + 4 * u, y + 4 * u, w - 8 * u, barH);
  ctx.fillStyle = contrastOn(o.bar);
  ctx.font = `700 ${17 * u}px ${o.font}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(o.title, x + 12 * u, y + 4 * u + barH / 2, w - 60 * u);
  bevel(ctx, x + w - 30 * u, y + 8 * u, 22 * u, 22 * u, u, '#D4D0C8');
  ctx.fillStyle = '#111'; ctx.font = `700 ${16 * u}px ${FONTS.sans}`; ctx.textAlign = 'center'; ctx.fillText('×', x + w - 19 * u, y + 19 * u);
  ctx.textAlign = 'left';
  ctx.save(); ctx.translate(x + 36 * u, y + barH + 42 * u); drawIcon(ctx, o.icon, 40 * u, '#5B8DEF'); ctx.restore();
  ctx.fillStyle = o.text ?? '#111';
  ctx.font = `${18 * u}px ${o.font}`;
  wrapText(ctx, o.message, x + 70 * u, y + barH + 30 * u, w - 86 * u, 22 * u);
  const bw = Math.min(110 * u, (w - 40 * u) / Math.max(1, o.buttons.length) - 10 * u), bh = 30 * u;
  const total = o.buttons.length * bw + (o.buttons.length - 1) * 12 * u;
  o.buttons.forEach((b, i) => {
    const bx = -total / 2 + i * (bw + 12 * u), by = y + h - bh - 14 * u;
    bevel(ctx, bx, by, bw, bh, u, '#D4D0C8');
    ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.font = `${17 * u}px ${o.font}`;
    ctx.fillText(b, bx + bw / 2, by + bh / 2 + 1 * u);
  });
  ctx.restore();
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(/\s+/);
  let line = '', yy = y;
  ctx.textBaseline = 'top';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; }
    else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}

/** Desktop icon with its label underneath. */
export function drawDesktopIcon(ctx: CanvasRenderingContext2D, icon: string, label: string, s: number, accent: string, font: string, style: 'flat' | '3d', labelColor = '#FFFFFF') {
  ctx.save();
  if (style === '3d') { ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = s * 0.1; ctx.shadowOffsetY = s * 0.08; }
  drawIcon(ctx, icon, s, accent);
  ctx.shadowColor = 'transparent';
  ctx.font = `${s * 0.36}px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = 'rgba(20,40,120,0.55)';
  ctx.fillRect(-tw / 2 - s * 0.06, s * 0.55, tw + s * 0.12, s * 0.42);
  ctx.fillStyle = labelColor;
  ctx.fillText(label, 0, s * 0.58);
  ctx.restore();
}

/** Tall paint toolbox column with simple original tool glyphs. */
export function drawToolbox(ctx: CanvasRenderingContext2D, w: number, h: number, accent: string, style: 'flat' | '3d') {
  const u = w / 90;
  const x = -w / 2, y = -h / 2;
  ctx.save();
  if (style === '3d') { ctx.fillStyle = '#8F949E'; ctx.fillRect(x + 8 * u, y + 8 * u, w, h); }
  bevel(ctx, x, y, w, h, u, '#D4D0C8');
  const rows = Math.floor((h - 12 * u) / (w * 0.5));
  const glyphs = ['pencil', 'brush', 'fill', 'eraser', 'line', 'rect', 'ellipse', 'text', 'spray', 'pick', 'zoom', 'select'];
  for (let i = 0; i < rows * 2; i++) {
    const cx = x + (i % 2 ? w * 0.72 : w * 0.28), cy = y + 10 * u + Math.floor(i / 2) * w * 0.5 + w * 0.22;
    bevel(ctx, cx - w * 0.2, cy - w * 0.2, w * 0.4, w * 0.4, u * 0.6, '#E4E0D8');
    ctx.save(); ctx.translate(cx, cy); toolGlyph(ctx, glyphs[i % glyphs.length], w * 0.26, accent); ctx.restore();
  }
  ctx.restore();
}

function toolGlyph(ctx: CanvasRenderingContext2D, g: string, s: number, accent: string) {
  const u = s / 20;
  ctx.lineWidth = 1.6 * u; ctx.strokeStyle = '#1A1A1A'; ctx.fillStyle = accent; ctx.lineCap = 'round';
  ctx.beginPath();
  switch (g) {
    case 'pencil': ctx.moveTo(-7 * u, 7 * u); ctx.lineTo(6 * u, -6 * u); ctx.stroke(); break;
    case 'brush': ctx.moveTo(6 * u, -7 * u); ctx.lineTo(-2 * u, 2 * u); ctx.stroke(); ctx.beginPath(); ctx.arc(-4 * u, 4 * u, 3 * u, 0, TAU); ctx.fill(); break;
    case 'fill': ctx.rect(-6 * u, -3 * u, 9 * u, 9 * u); ctx.stroke(); ctx.beginPath(); ctx.arc(6 * u, 5 * u, 2 * u, 0, TAU); ctx.fill(); break;
    case 'eraser': ctx.rect(-7 * u, -3 * u, 14 * u, 7 * u); ctx.fillStyle = '#F5B8C4'; ctx.fill(); ctx.stroke(); break;
    case 'line': ctx.moveTo(-7 * u, 6 * u); ctx.lineTo(7 * u, -6 * u); ctx.stroke(); break;
    case 'rect': ctx.rect(-7 * u, -5 * u, 14 * u, 10 * u); ctx.stroke(); break;
    case 'ellipse': ctx.ellipse(0, 0, 7 * u, 5 * u, 0, 0, TAU); ctx.stroke(); break;
    case 'text': ctx.font = `700 ${14 * u}px ${FONTS.serif}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1A1A1A'; ctx.fillText('A', 0, 1 * u); break;
    case 'spray': for (let i = 0; i < 9; i++) { ctx.fillStyle = accent; ctx.fillRect(Math.sin(i * 2.3) * 6 * u, Math.cos(i * 1.7) * 6 * u, 1.6 * u, 1.6 * u); } break;
    case 'pick': ctx.moveTo(-6 * u, 6 * u); ctx.lineTo(4 * u, -4 * u); ctx.stroke(); ctx.beginPath(); ctx.arc(5 * u, -5 * u, 2.5 * u, 0, TAU); ctx.fill(); break;
    case 'zoom': ctx.arc(-1 * u, -1 * u, 5 * u, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(3 * u, 3 * u); ctx.lineTo(7 * u, 7 * u); ctx.stroke(); break;
    case 'select': ctx.setLineDash([2 * u, 2 * u]); ctx.rect(-7 * u, -6 * u, 14 * u, 12 * u); ctx.stroke(); ctx.setLineDash([]); break;
  }
}

/** Recycle bin box with arrows. */
export function drawBin(ctx: CanvasRenderingContext2D, s: number, accent: string) {
  const u = s / 60;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 30 * u, 26 * u, 6 * u, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#E8ECEF'; ctx.strokeStyle = '#2A2A2A'; ctx.lineWidth = 2 * u;
  ctx.beginPath(); ctx.moveTo(-22 * u, -22 * u); ctx.lineTo(22 * u, -22 * u); ctx.lineTo(18 * u, 28 * u); ctx.lineTo(-18 * u, 28 * u); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#CDD3D8'; ctx.fillRect(-26 * u, -30 * u, 52 * u, 9 * u); ctx.strokeRect(-26 * u, -30 * u, 52 * u, 9 * u);
  ctx.strokeStyle = accent; ctx.lineWidth = 3.5 * u;
  for (let i = 0; i < 3; i++) {
    const a = (i * TAU) / 3 - Math.PI / 2;
    ctx.beginPath(); ctx.arc(0, 4 * u, 10 * u, a, a + 1.4); ctx.stroke();
  }
  ctx.restore();
}

/**
 * Retro paint program window. The photo goes into the returned canvas rect;
 * the palette swatch rects are returned so the editor can make them tappable.
 */
export function drawPaintWindow(ctx: CanvasRenderingContext2D, W: number, H: number, o: { title: string; status: string; face: string; bar: string; font: string; swatches: string[] }) {
  const u = W / 540;
  const bar = 34 * u, menu = 26 * u, tool = 64 * u, pal = 70 * u, status = 28 * u, sb = 18 * u;
  bevel(ctx, 0, 0, W, H, u, o.face);
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, o.bar); g.addColorStop(1, withAlpha(o.bar, 0.6));
  ctx.fillStyle = g;
  ctx.fillRect(4 * u, 4 * u, W - 8 * u, bar);
  ctx.fillStyle = contrastOn(o.bar);
  ctx.font = `700 ${18 * u}px ${o.font}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(o.title, 12 * u, 4 * u + bar / 2);
  ['_', '□', '×'].forEach((c, i) => {
    const bx = W - (3 - i) * 28 * u - 4 * u;
    bevel(ctx, bx, 9 * u, 24 * u, 22 * u, u, o.face);
    ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.font = `700 ${14 * u}px ${FONTS.sans}`; ctx.fillText(c, bx + 12 * u, 20 * u);
  });
  ctx.textAlign = 'left';
  ctx.fillStyle = '#111';
  ctx.font = `${16 * u}px ${o.font}`;
  ['File', 'Edit', 'View', 'Image', 'Colors', 'Help'].forEach((m, i) => ctx.fillText(m, 12 * u + i * 62 * u, bar + 4 * u + menu / 2));
  const top = 4 * u + bar + menu;
  // toolbox
  const tbH = H - top - pal - status - 8 * u;
  ctx.save(); ctx.translate(4 * u + tool / 2, top + tbH / 2); drawToolbox(ctx, tool, tbH, '#3A6FD8', 'flat'); ctx.restore();
  // canvas area
  const cx = 8 * u + tool, cy = top + 4 * u, cw = W - cx - 8 * u - sb, ch = H - cy - pal - status - 8 * u - sb;
  bevel(ctx, cx - 2 * u, cy - 2 * u, cw + sb + 4 * u, ch + sb + 4 * u, u, '#808080', true);
  bevel(ctx, cx + cw, cy, sb, ch, u, o.face);
  bevel(ctx, cx, cy + ch, cw, sb, u, o.face);
  // palette
  const py = H - pal - status - 2 * u;
  const cols = 14, sw = (W - 70 * u) / cols, sh = (pal - 12 * u) / 2;
  bevel(ctx, 8 * u, py + 6 * u, 44 * u, 44 * u, u, '#FFFFFF', true);
  const rects: { x: number; y: number; w: number; h: number; color: string }[] = [];
  o.swatches.forEach((c, i) => {
    const sx = 60 * u + (i % cols) * sw, sy = py + 6 * u + Math.floor(i / cols) * sh;
    bevel(ctx, sx, sy, sw - 2 * u, sh - 2 * u, u * 0.5, c, true);
    rects.push({ x: sx, y: sy, w: sw - 2 * u, h: sh - 2 * u, color: c });
  });
  // status bar
  bevel(ctx, 4 * u, H - status - 4 * u, W - 8 * u, status, u, o.face, true);
  ctx.fillStyle = '#111'; ctx.font = `${15 * u}px ${o.font}`; ctx.textBaseline = 'middle';
  ctx.fillText(o.status, 12 * u, H - status / 2 - 4 * u, W - 24 * u);
  return { canvas: { x: cx, y: cy, w: cw, h: ch }, swatches: rects };
}

/** 28 classic swatches for the paint frame (original selection). */
export const PAINT_SWATCHES = [
  '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#808040', '#004040', '#0080FF', '#004080', '#4000FF', '#804000',
  '#FFFFFF', '#C0C0C0', '#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FFFF80', '#00FF80', '#80FFFF', '#8080FF', '#FF0080', '#FF8040'
];
