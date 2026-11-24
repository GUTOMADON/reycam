/**
 * Original illustrated sticker library, drawn with the canvas API.
 *
 * Three families: the felt quilt kit (sun, moon, clouds, trees, bugs, bunny),
 * vintage print nature cutouts (goldfish, apple, wings, mushroom, rock, river,
 * tree, flowers) and the sticker pack (star styles, objects, music gear,
 * tickets). Every drawing is generic and has no logo, brand name or character.
 *
 * Each sticker draws centered at (0, 0), `s` wide, with a main color `c1` and a
 * second color `c2`, so the color slots recolor it like any other element.
 */
import type { StickerArt } from './types';
import { hexToRgb, hslToHex, rgbToHsl, withAlpha } from './palettes';
import { rng } from './textures';
import { shapePath } from './assets';

const TAU = Math.PI * 2;

/** Lighter or darker version of a color. */
function shade(hex: string, d: number) {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  return hslToHex(h, s, Math.max(0, Math.min(1, l + d)));
}

/** Height / width of each art, for hit boxes. */
export const STICKER_ASPECT: Partial<Record<StickerArt, number>> = {
  river: 0.35, tulips: 1.3, cassette: 0.65, boombox: 0.62, ticket: 0.45, sneaker: 0.55, receipt: 1.6,
  polaroid: 1.18, tree: 1.4, feltTree: 1.4, mushroom: 1.0, wings: 0.75, goldfish: 0.6, cap: 0.7, shorts: 0.8,
  phone: 1.8, watch: 1.3, cameraCard: 1.25, sunglasses: 0.42, feltCloud: 0.55, snail: 0.7, bunny: 1.2, rock: 0.65,
  blockDab: 1.3, blockWave: 1.3, blockFall: 1.3, safetyPin: 0.4, paperclip: 1.6, keytag: 0.5, bow: 0.8
};

/** Default colors per art, used when the sticker is added from the library. */
export const STICKER_DEFAULTS: Record<StickerArt, [string, string]> = {
  feltSun: ['#F5B21A', '#E0602A'], feltMoon: ['#F2E3B0', '#E0802A'], feltCloud: ['#EADBC4', '#FFFFFF'], feltTree: ['#3E8A3A', '#F2F0E0'],
  bee: ['#F2C21A', '#1A1A1A'], ladybug: ['#D8281E', '#1A1A1A'], snail: ['#C88A4A', '#E8C8A0'], bunny: ['#F2EEE6', '#F2A8B8'],
  goldfish: ['#F2701A', '#F8C060'], apple: ['#D8281E', '#F6E8C8'], wings: ['#9AB08A', '#F2D04A'], mushroom: ['#D8281E', '#F6EEDC'],
  rock: ['#6A7A4A', '#8A8A7A'], river: ['#3A7AB0', '#A8D8F0'], tree: ['#3A6A2A', '#6A4A2A'], flower: ['#F2D23A', '#C8A040'], tulips: ['#3A3A3A', '#F2F2F2'],
  plushStar: ['#F6C6E0', '#FFFFFF'], sequinStar: ['#C0C8D8', '#F2D23A'], embroideredStar: ['#F2C21A', '#D8281E'], chromeStar: ['#D8DCE4', '#7A8090'],
  smileStar: ['#F6D21A', '#1A1A1A'], starfish: ['#F28A5A', '#F8C8A0'], butterfly: ['#7AC8F0', '#F28CC0'], clover: ['#3DAA3D', '#A8F0A0'],
  cassette: ['#2A2A2A', '#F2A8C8'], boombox: ['#3A3A3A', '#F2C21A'], dice: ['#FFFFFF', '#1A1A1A'], cap: ['#2A4AE0', '#FFFFFF'],
  headphones: ['#1A1A1A', '#F28CC0'], vinyl: ['#111111', '#E0281E'], camera: ['#2A2A2A', '#C8C8C8'], lips: ['#D8181E', '#FFFFFF'],
  pin: ['#E0281E', '#C8C8C8'], ticket: ['#F2E6C8', '#D8281E'], sneaker: ['#FFFFFF', '#E0281E'], planet: ['#B07AE0', '#F2C21A'],
  musicNote: ['#1A1A1A', '#1A1A1A'], sunglasses: ['#1A1A1A', '#F28CC0'], moon: ['#F2E26A', '#C8B040'], polaroid: ['#FFFFFF', '#3A7AB0'],
  receipt: ['#F8F6F0', '#1A1A1A'], phone: ['#C8CCD4', '#2A2A2A'], shorts: ['#3A6AE0', '#FFFFFF'], watch: ['#1A1A1A', '#C8C8C8'],
  glitterFlower: ['#F28CC0', '#FFF0A0'], cameraCard: ['#F05A9A', '#FFFFFF'],
  glitterHeart: ['#F28CC0', '#7AB8F0'], chromeSwirl: ['#C8CCD8', '#7A80A0'], sparkleStar: ['#FFFFFF', '#9AD8FF'], buttonStar: ['#F2C21A', '#7A5A1A'],
  clipStar: ['#F28CC0', '#E0E0E8'], balloonStar: ['#C8CCD8', '#FFFFFF'], quiltedStar: ['#C8CCD4', '#FFFFFF'], badge: ['#F2D21A', '#1A1A1A'],
  blockDab: ['#F2C21A', '#E8B890'], blockWave: ['#3A7AE0', '#E8B890'], blockFall: ['#7AE03A', '#E8B890'], safetyPin: ['#C8C8C8', '#E0B040'],
  paperclip: ['#F28CC0', '#F28CC0'], bow: ['#E0506A', '#FFFFFF'], cherries: ['#D8181E', '#FFFFFF'], lily: ['#FFF6EE', '#E0A040'], keytag: ['#D8D8D8', '#3A3A3A']
};

export const STICKER_GROUPS: { id: 'felt' | 'nature' | 'pack' | 'craft'; arts: StickerArt[] }[] = [
  { id: 'felt', arts: ['feltSun', 'feltMoon', 'feltCloud', 'feltTree', 'bee', 'ladybug', 'snail', 'bunny'] },
  { id: 'nature', arts: ['goldfish', 'apple', 'wings', 'mushroom', 'rock', 'river', 'tree', 'flower', 'tulips'] },
  {
    id: 'pack', arts: ['plushStar', 'sequinStar', 'embroideredStar', 'chromeStar', 'smileStar', 'starfish', 'butterfly', 'clover', 'glitterFlower',
      'cassette', 'boombox', 'dice', 'cap', 'headphones', 'vinyl', 'camera', 'cameraCard', 'lips', 'pin', 'ticket', 'sneaker', 'planet',
      'musicNote', 'sunglasses', 'moon', 'polaroid', 'receipt', 'phone', 'shorts', 'watch']
  },
  { id: 'craft', arts: ['glitterHeart', 'chromeSwirl', 'sparkleStar', 'buttonStar', 'clipStar', 'balloonStar', 'quiltedStar', 'badge', 'blockDab', 'blockWave', 'blockFall', 'safetyPin', 'paperclip', 'bow', 'cherries', 'lily', 'keytag'] }
];

function stitch(ctx: CanvasRenderingContext2D, color: string, s: number) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.018;
  ctx.setLineDash([s * 0.035, s * 0.03]);
  ctx.stroke();
  ctx.restore();
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, rot = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fillStyle = fill; ctx.fill();
}

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}

/** Draw one sticker art. */
export function drawStickerArt(ctx: CanvasRenderingContext2D, art: StickerArt, s: number, c1: string, c2: string, seed: number, label?: string) {
  const r = s / 2;
  const rand = rng(seed);
  const h = s * (STICKER_ASPECT[art] ?? 1);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  switch (art) {
    // ------------------------------------------------ felt quilt kit
    case 'feltSun': {
      ctx.fillStyle = c1;
      for (let i = 0; i < 12; i++) { ctx.save(); ctx.rotate((i / 12) * TAU); ctx.beginPath(); ctx.ellipse(0, -r * 0.78, r * 0.12, r * 0.22, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      ellipse(ctx, 0, 0, r * 0.55, r * 0.55, c1);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, TAU); stitch(ctx, shade(c1, 0.25), s);
      ctx.strokeStyle = c2; ctx.lineWidth = s * 0.03; ctx.beginPath();
      for (let t = 0; t <= 1; t += 0.02) { const a = t * TAU * 3, d = r * 0.42 * t; t ? ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d) : ctx.moveTo(0, 0); }
      ctx.stroke();
      break;
    }
    case 'feltMoon': {
      ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, TAU); ctx.fillStyle = c1; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, TAU); stitch(ctx, shade(c1, -0.2), s);
      ctx.strokeStyle = c2; ctx.lineWidth = s * 0.04; ctx.beginPath();
      for (let t = 0; t <= 1; t += 0.02) { const a = t * TAU * 2.5, d = r * 0.6 * t; t ? ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d) : ctx.moveTo(0, 0); }
      ctx.stroke();
      break;
    }
    case 'feltCloud': {
      ctx.fillStyle = c1;
      ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = s * 0.04; ctx.shadowOffsetY = s * 0.02;
      ctx.beginPath();
      for (const [x, y, rr] of [[-0.55, 0.05, 0.3], [-0.2, -0.12, 0.38], [0.2, -0.1, 0.35], [0.55, 0.05, 0.28], [0, 0.08, 0.3]]) ctx.moveTo(x * r + rr * r, y * r), ctx.arc(x * r, y * r, rr * r, 0, TAU);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.beginPath(); ctx.moveTo(-r * 0.75, h * 0.25); ctx.lineTo(r * 0.75, h * 0.25); stitch(ctx, c2, s);
      break;
    }
    case 'feltTree': {
      ctx.fillStyle = '#6A4A2A'; ctx.fillRect(-r * 0.1, h * 0.1, r * 0.2, h * 0.4);
      ctx.beginPath(); ctx.ellipse(0, -h * 0.12, r * 0.85, h * 0.34, 0, 0, TAU); ctx.fillStyle = c1; ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -h * 0.12, r * 0.75, h * 0.29, 0, 0, TAU); stitch(ctx, shade(c1, 0.25), s);
      for (let i = 0; i < 10; i++) ellipse(ctx, (rand() - 0.5) * r * 1.2, -h * 0.12 + (rand() - 0.5) * h * 0.4, s * 0.03, s * 0.03, c2);
      break;
    }
    case 'bee': {
      ellipse(ctx, -r * 0.15, -r * 0.4, r * 0.3, r * 0.22, 'rgba(255,255,255,0.85)', -0.4);
      ellipse(ctx, r * 0.15, -r * 0.4, r * 0.3, r * 0.22, 'rgba(255,255,255,0.85)', 0.4);
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, r * 0.6, r * 0.4, 0, 0, TAU); ctx.fillStyle = c1; ctx.fill(); ctx.clip();
      ctx.fillStyle = c2; for (const x of [-0.2, 0.15, 0.5]) ctx.fillRect(x * r, -r, r * 0.14, s);
      ctx.restore();
      ellipse(ctx, -r * 0.48, -r * 0.05, r * 0.06, r * 0.06, c2);
      break;
    }
    case 'ladybug': {
      ellipse(ctx, 0, -r * 0.55, r * 0.3, r * 0.25, c2);
      ellipse(ctx, 0, 0.05 * r, r * 0.65, r * 0.6, c1);
      ctx.strokeStyle = c2; ctx.lineWidth = s * 0.03; ctx.beginPath(); ctx.moveTo(0, -r * 0.5); ctx.lineTo(0, r * 0.65); ctx.stroke();
      for (const [x, y] of [[-0.3, -0.15], [0.3, -0.15], [-0.35, 0.25], [0.35, 0.25], [-0.15, 0.45], [0.15, 0.45]]) ellipse(ctx, x * r, y * r, r * 0.09, r * 0.09, c2);
      break;
    }
    case 'snail': {
      ctx.beginPath(); ctx.moveTo(-r, h * 0.35); ctx.quadraticCurveTo(-r * 0.2, h * 0.15, r * 0.9, h * 0.35); ctx.lineTo(r * 0.95, h * 0.45); ctx.lineTo(-r, h * 0.45); ctx.closePath(); ctx.fillStyle = c2; ctx.fill();
      ctx.strokeStyle = c2; ctx.lineWidth = s * 0.03; ctx.beginPath(); ctx.moveTo(-r * 0.8, h * 0.25); ctx.lineTo(-r * 0.95, -h * 0.15); ctx.stroke();
      ellipse(ctx, r * 0.1, 0, r * 0.55, r * 0.5, c1);
      ctx.strokeStyle = shade(c1, -0.25); ctx.lineWidth = s * 0.035; ctx.beginPath();
      for (let t = 0; t <= 1; t += 0.02) { const a = t * TAU * 2.4, d = r * 0.45 * (1 - t); ctx.lineTo(r * 0.1 + Math.cos(a) * d, Math.sin(a) * d); }
      ctx.stroke();
      break;
    }
    case 'bunny': {
      ellipse(ctx, -r * 0.22, -h * 0.28, r * 0.13, h * 0.22, c1, -0.15);
      ellipse(ctx, r * 0.22, -h * 0.28, r * 0.13, h * 0.22, c1, 0.15);
      ellipse(ctx, -r * 0.22, -h * 0.28, r * 0.06, h * 0.15, c2, -0.15);
      ellipse(ctx, r * 0.22, -h * 0.28, r * 0.06, h * 0.15, c2, 0.15);
      ellipse(ctx, 0, h * 0.25, r * 0.6, h * 0.25, c1);
      ellipse(ctx, 0, 0, r * 0.38, r * 0.32, c1);
      ellipse(ctx, -r * 0.13, -r * 0.03, r * 0.04, r * 0.05, '#1A1A1A');
      ellipse(ctx, r * 0.13, -r * 0.03, r * 0.04, r * 0.05, '#1A1A1A');
      ellipse(ctx, 0, r * 0.1, r * 0.05, r * 0.035, c2);
      break;
    }
    // ------------------------------------------------ nature cutouts
    case 'goldfish': {
      ctx.beginPath(); ctx.moveTo(r * 0.35, 0); ctx.lineTo(r, -h * 0.45); ctx.quadraticCurveTo(r * 0.8, 0, r, h * 0.45); ctx.closePath(); ctx.fillStyle = c2; ctx.fill();
      const g = ctx.createLinearGradient(-r, -h / 2, r, h / 2); g.addColorStop(0, shade(c1, 0.1)); g.addColorStop(1, shade(c1, -0.15));
      ctx.beginPath(); ctx.ellipse(-r * 0.15, 0, r * 0.6, h * 0.36, 0, 0, TAU); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = withAlpha(shade(c1, -0.3), 0.6); ctx.lineWidth = s * 0.008;
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(-r * 0.1 + i * r * 0.1, 0, h * 0.18, -1, 1); ctx.stroke(); }
      ellipse(ctx, -r * 0.5, -h * 0.06, r * 0.06, r * 0.06, '#111');
      ellipse(ctx, -r * 0.52, -h * 0.08, r * 0.02, r * 0.02, '#fff');
      break;
    }
    case 'apple': {
      ellipse(ctx, 0, 0, r * 0.9, r * 0.85, c1);
      ellipse(ctx, 0, 0, r * 0.78, r * 0.72, c2);
      ctx.fillStyle = '#3A2A1A';
      for (const [x, y, a] of [[-0.12, 0.05, 0.4], [0.12, 0.05, -0.4]]) { ctx.beginPath(); ctx.ellipse(x * r, y * r, r * 0.05, r * 0.09, a, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = withAlpha('#C8A060', 0.6); ctx.lineWidth = s * 0.01; ctx.beginPath(); ctx.ellipse(0, 0.05 * r, r * 0.28, r * 0.36, 0, 0, TAU); ctx.stroke();
      break;
    }
    case 'wings': {
      for (const sx of [-1, 1]) {
        ctx.save(); ctx.scale(sx, 1);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(r * 0.3, -h * 0.7, r * 1.05, -h * 0.6, r * 0.95, -h * 0.05); ctx.bezierCurveTo(r * 0.9, h * 0.1, r * 0.4, h * 0.05, 0, 0); ctx.fillStyle = c1; ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(r * 0.5, h * 0.05, r * 0.75, h * 0.55, r * 0.35, h * 0.5); ctx.bezierCurveTo(r * 0.15, h * 0.45, 0, h * 0.2, 0, 0); ctx.fillStyle = c2; ctx.fill();
        ctx.strokeStyle = withAlpha('#3A3A2A', 0.5); ctx.lineWidth = s * 0.008;
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * (0.5 + i * 0.13), -h * (0.4 - i * 0.12)); ctx.stroke(); }
        ctx.restore();
      }
      break;
    }
    case 'mushroom': {
      ctx.beginPath(); ctx.moveTo(-r * 0.2, 0); ctx.quadraticCurveTo(-r * 0.25, h * 0.4, -r * 0.3, h * 0.48); ctx.lineTo(r * 0.3, h * 0.48); ctx.quadraticCurveTo(r * 0.25, h * 0.4, r * 0.2, 0); ctx.closePath(); ctx.fillStyle = c2; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-r * 0.9, h * 0.05); ctx.bezierCurveTo(-r * 0.9, -h * 0.55, r * 0.9, -h * 0.55, r * 0.9, h * 0.05); ctx.closePath(); ctx.fillStyle = c1; ctx.fill();
      for (let i = 0; i < 6; i++) ellipse(ctx, (rand() - 0.5) * r * 1.3, -h * (0.05 + rand() * 0.3), r * (0.06 + rand() * 0.06), r * (0.05 + rand() * 0.04), c2);
      break;
    }
    case 'rock': {
      ctx.beginPath(); ctx.moveTo(-r, h * 0.45);
      for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI; ctx.lineTo(Math.cos(a) * r * (0.85 + rand() * 0.15), h * 0.3 + Math.sin(a) * h * (0.7 + rand() * 0.2)); }
      ctx.lineTo(r, h * 0.45); ctx.closePath();
      ctx.fillStyle = c2; ctx.fill();
      ctx.save(); ctx.clip();
      for (let i = 0; i < 40; i++) ellipse(ctx, (rand() - 0.5) * s, -h * 0.5 + rand() * h * 0.5, r * (0.1 + rand() * 0.2), r * (0.06 + rand() * 0.1), shade(c1, (rand() - 0.5) * 0.2));
      ctx.restore();
      break;
    }
    case 'river': {
      const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, c2); g.addColorStop(1, c1);
      ctx.beginPath(); ctx.moveTo(-r, -h * 0.2);
      for (let i = 0; i <= 10; i++) ctx.lineTo(-r + (i / 10) * s, -h * 0.35 + Math.sin(i) * h * 0.12);
      ctx.lineTo(r, h / 2); ctx.lineTo(-r, h / 2); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = s * 0.006;
      for (let i = 0; i < 14; i++) { const x = (rand() - 0.5) * s, y = (rand() - 0.2) * h * 0.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s * 0.08, y); ctx.stroke(); }
      break;
    }
    case 'tree': {
      ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(-r * 0.12, h / 2); ctx.lineTo(-r * 0.06, -h * 0.1); ctx.lineTo(r * 0.06, -h * 0.1); ctx.lineTo(r * 0.14, h / 2); ctx.fill();
      for (let i = 0; i < 22; i++) {
        const x = (rand() - 0.5) * s * 0.9, y = -h * 0.15 - rand() * h * 0.32;
        ellipse(ctx, x, y, r * (0.2 + rand() * 0.22), r * (0.16 + rand() * 0.18), shade(c1, (rand() - 0.5) * 0.25));
      }
      break;
    }
    case 'flower': {
      ctx.strokeStyle = '#6A7A3A'; ctx.lineWidth = s * 0.02; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(r * 0.1, r * 0.5, 0, r); ctx.stroke();
      for (let i = 0; i < 7; i++) { ctx.save(); ctx.rotate((i / 7) * TAU); ellipse(ctx, 0, -r * 0.35, r * 0.15, r * 0.32, withAlpha(c1, 0.9)); ctx.restore(); }
      ellipse(ctx, 0, 0, r * 0.15, r * 0.15, c2);
      break;
    }
    case 'tulips': {
      ctx.strokeStyle = c1; ctx.lineWidth = s * 0.012; ctx.fillStyle = 'transparent';
      for (const [x, a] of [[-0.35, -0.15], [0, 0], [0.35, 0.18]]) {
        ctx.save(); ctx.translate(x * r, 0); ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(0, -h * 0.15); ctx.quadraticCurveTo(r * 0.08, h * 0.2, 0, h * 0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r * 0.16, -h * 0.35); ctx.lineTo(-r * 0.16, -h * 0.2); ctx.quadraticCurveTo(0, -h * 0.08, r * 0.16, -h * 0.2); ctx.lineTo(r * 0.16, -h * 0.35); ctx.lineTo(r * 0.06, -h * 0.27); ctx.lineTo(0, -h * 0.37); ctx.lineTo(-r * 0.06, -h * 0.27); ctx.closePath(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, h * 0.2); ctx.quadraticCurveTo(r * 0.3, h * 0.05, r * 0.25, h * 0.25); ctx.stroke();
        for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(-r * 0.12, -h * (0.3 - k * 0.02)); ctx.lineTo(-r * 0.04, -h * (0.22 - k * 0.02)); ctx.stroke(); }
        ctx.restore();
      }
      break;
    }
    // ------------------------------------------------ sticker pack: stars
    case 'plushStar': {
      shapePath(ctx, 'star5', s, { rounded: true });
      const g = ctx.createRadialGradient(-r * 0.2, -r * 0.3, r * 0.1, 0, 0, r); g.addColorStop(0, shade(c1, 0.12)); g.addColorStop(1, shade(c1, -0.12));
      ctx.fillStyle = g; ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = s * 0.06; ctx.shadowOffsetY = s * 0.03; ctx.fill(); ctx.shadowColor = 'transparent';
      shapePath(ctx, 'star5', s * 0.86, { rounded: true }); stitch(ctx, c2, s);
      break;
    }
    case 'sequinStar': {
      shapePath(ctx, 'star5', s); ctx.fillStyle = c1; ctx.fill(); ctx.save(); ctx.clip();
      for (let y = -r; y < r; y += s * 0.07) for (let x = -r + ((y / (s * 0.07)) % 2) * s * 0.035; x < r; x += s * 0.07) {
        const l = rand();
        ellipse(ctx, x, y, s * 0.032, s * 0.032, l > 0.85 ? '#FFFFFF' : l > 0.6 ? c2 : shade(c1, (l - 0.5) * 0.4));
      }
      ctx.restore();
      break;
    }
    case 'embroideredStar': {
      shapePath(ctx, 'star5', s); ctx.fillStyle = c1; ctx.fill();
      ctx.save(); ctx.clip(); ctx.strokeStyle = withAlpha(shade(c1, -0.15), 0.6); ctx.lineWidth = s * 0.01;
      for (let x = -r; x < r; x += s * 0.025) { ctx.beginPath(); ctx.moveTo(x, -r); ctx.lineTo(x + r * 0.4, r); ctx.stroke(); }
      ctx.restore();
      shapePath(ctx, 'star5', s); ctx.strokeStyle = c2; ctx.lineWidth = s * 0.06; ctx.stroke();
      break;
    }
    case 'chromeStar': {
      shapePath(ctx, 'star5', s, { rounded: true });
      const g = ctx.createLinearGradient(-r, -r, r, r);
      g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.3, c1); g.addColorStop(0.5, c2); g.addColorStop(0.65, '#FFFFFF'); g.addColorStop(1, c2);
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = withAlpha(c2, 0.8); ctx.lineWidth = s * 0.015; ctx.stroke();
      break;
    }
    case 'smileStar': {
      shapePath(ctx, 'star5', s, { rounded: true }); ctx.fillStyle = c1; ctx.fill();
      ctx.strokeStyle = c2; ctx.lineWidth = s * 0.025; ctx.stroke();
      ellipse(ctx, -r * 0.15, -r * 0.05, r * 0.05, r * 0.08, c2); ellipse(ctx, r * 0.15, -r * 0.05, r * 0.05, r * 0.08, c2);
      ctx.beginPath(); ctx.arc(0, r * 0.08, r * 0.16, 0.2, Math.PI - 0.2); ctx.stroke();
      break;
    }
    case 'starfish': {
      shapePath(ctx, 'star5', s, { rounded: true, wobble: 0.3, seed }); ctx.fillStyle = c1; ctx.fill();
      for (let i = 0; i < 40; i++) { const a = rand() * TAU, d = rand() * r * 0.7; ellipse(ctx, Math.cos(a) * d, Math.sin(a) * d, s * 0.012, s * 0.012, c2); }
      break;
    }
    case 'butterfly': {
      for (const sx of [-1, 1]) {
        ctx.save(); ctx.scale(sx, 1);
        ellipse(ctx, r * 0.42, -r * 0.3, r * 0.45, r * 0.38, c1, 0.5);
        ellipse(ctx, r * 0.32, r * 0.32, r * 0.3, r * 0.25, c2, -0.4);
        ellipse(ctx, r * 0.45, -r * 0.3, r * 0.12, r * 0.12, '#FFFFFF');
        ctx.restore();
      }
      ellipse(ctx, 0, 0, r * 0.06, r * 0.5, '#1A1A1A');
      ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = s * 0.015;
      ctx.beginPath(); ctx.moveTo(0, -r * 0.45); ctx.quadraticCurveTo(-r * 0.1, -r * 0.75, -r * 0.25, -r * 0.8); ctx.moveTo(0, -r * 0.45); ctx.quadraticCurveTo(r * 0.1, -r * 0.75, r * 0.25, -r * 0.8); ctx.stroke();
      break;
    }
    case 'clover': {
      for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate((i / 4) * TAU + Math.PI / 4); ctx.translate(0, -r * 0.4); shapePath(ctx, 'heart', r * 0.9); ctx.fillStyle = c1; ctx.fill(); ctx.restore(); }
      ellipse(ctx, 0, 0, r * 0.1, r * 0.1, c2);
      ctx.strokeStyle = c1; ctx.lineWidth = s * 0.04; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(r * 0.2, r * 0.6, r * 0.1, r * 0.95); ctx.stroke();
      break;
    }
    case 'glitterFlower': {
      for (let i = 0; i < 5; i++) { ctx.save(); ctx.rotate((i / 5) * TAU); ellipse(ctx, 0, -r * 0.45, r * 0.3, r * 0.45, c1); ctx.restore(); }
      for (let i = 0; i < 60; i++) { const a = rand() * TAU, d = rand() * r * 0.85; ellipse(ctx, Math.cos(a) * d, Math.sin(a) * d, s * 0.008, s * 0.008, 'rgba(255,255,255,0.9)'); }
      ellipse(ctx, 0, 0, r * 0.25, r * 0.25, c2);
      break;
    }
    // ------------------------------------------------ sticker pack: objects
    case 'cassette': {
      rrect(ctx, -r, -h / 2, s, h, s * 0.05); ctx.fillStyle = c1; ctx.fill();
      rrect(ctx, -r * 0.82, -h * 0.38, s * 0.82, h * 0.42, s * 0.03); ctx.fillStyle = c2; ctx.fill();
      rrect(ctx, -r * 0.5, -h * 0.25, r, h * 0.2, s * 0.05); ctx.fillStyle = '#F8F8F0'; ctx.fill();
      for (const x of [-0.3, 0.3]) { ellipse(ctx, x * r, -h * 0.15, r * 0.1, r * 0.1, c1); ellipse(ctx, x * r, -h * 0.15, r * 0.04, r * 0.04, '#F8F8F0'); }
      ctx.fillStyle = shade(c1, 0.15); ctx.beginPath(); ctx.moveTo(-r * 0.6, h / 2); ctx.lineTo(-r * 0.5, h * 0.2); ctx.lineTo(r * 0.5, h * 0.2); ctx.lineTo(r * 0.6, h / 2); ctx.fill();
      break;
    }
    case 'boombox': {
      ctx.strokeStyle = c1; ctx.lineWidth = s * 0.04; ctx.beginPath(); ctx.moveTo(-r * 0.6, -h * 0.35); ctx.lineTo(-r * 0.5, -h * 0.55); ctx.lineTo(r * 0.5, -h * 0.55); ctx.lineTo(r * 0.6, -h * 0.35); ctx.stroke();
      rrect(ctx, -r, -h * 0.35, s, h * 0.8, s * 0.05); ctx.fillStyle = c1; ctx.fill();
      for (const x of [-0.58, 0.58]) { ellipse(ctx, x * r, h * 0.08, r * 0.3, r * 0.3, '#111'); ellipse(ctx, x * r, h * 0.08, r * 0.18, r * 0.18, shade(c1, 0.2)); ellipse(ctx, x * r, h * 0.08, r * 0.06, r * 0.06, c2); }
      rrect(ctx, -r * 0.22, -h * 0.22, r * 0.44, h * 0.22, s * 0.01); ctx.fillStyle = c2; ctx.fill();
      for (let i = 0; i < 4; i++) { ctx.fillStyle = shade(c1, 0.3); ctx.fillRect(-r * 0.22 + i * r * 0.12, h * 0.12, r * 0.08, h * 0.06); }
      break;
    }
    case 'dice': {
      ctx.save(); ctx.rotate(0.2);
      rrect(ctx, -r * 0.8, -r * 0.8, r * 1.6, r * 1.6, s * 0.14); ctx.fillStyle = c1; ctx.fill(); ctx.strokeStyle = withAlpha(c2, 0.3); ctx.lineWidth = s * 0.02; ctx.stroke();
      for (const [x, y] of [[-0.42, -0.42], [0.42, -0.42], [0, 0], [-0.42, 0.42], [0.42, 0.42]]) ellipse(ctx, x * r, y * r, r * 0.13, r * 0.13, c2);
      ctx.restore();
      break;
    }
    case 'cap': {
      ctx.beginPath(); ctx.moveTo(-r * 0.75, h * 0.2); ctx.bezierCurveTo(-r * 0.75, -h * 0.75, r * 0.75, -h * 0.75, r * 0.75, h * 0.2); ctx.closePath(); ctx.fillStyle = c1; ctx.fill();
      ctx.beginPath(); ctx.ellipse(r * 0.45, h * 0.25, r * 0.6, h * 0.14, 0.1, 0, TAU); ctx.fillStyle = shade(c1, -0.12); ctx.fill();
      ctx.strokeStyle = c2; ctx.lineWidth = s * 0.012; ctx.beginPath(); ctx.moveTo(0, -h * 0.52); ctx.lineTo(0, h * 0.2); ctx.stroke();
      ellipse(ctx, 0, -h * 0.5, r * 0.06, r * 0.04, c2);
      break;
    }
    case 'headphones': {
      ctx.strokeStyle = c1; ctx.lineWidth = s * 0.08; ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.7, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      for (const sx of [-1, 1]) { rrect(ctx, sx * r * 0.72 - r * 0.2, -r * 0.05, r * 0.4, r * 0.6, s * 0.08); ctx.fillStyle = c1; ctx.fill(); rrect(ctx, sx * r * 0.72 - r * 0.12, r * 0.03, r * 0.24, r * 0.44, s * 0.05); ctx.fillStyle = c2; ctx.fill(); }
      break;
    }
    case 'vinyl': {
      ellipse(ctx, 0, 0, r * 0.95, r * 0.95, c1);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = s * 0.006;
      for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(0, 0, r * (0.45 + i * 0.055), 0, TAU); ctx.stroke(); }
      ellipse(ctx, 0, 0, r * 0.32, r * 0.32, c2); ellipse(ctx, 0, 0, r * 0.04, r * 0.04, '#F8F8F0');
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = s * 0.03; ctx.beginPath(); ctx.arc(0, 0, r * 0.75, -2.4, -1.8); ctx.stroke();
      break;
    }
    case 'camera': {
      rrect(ctx, -r, -r * 0.45, s, r * 1.1, s * 0.08); ctx.fillStyle = c1; ctx.fill();
      rrect(ctx, -r * 0.7, -r * 0.62, r * 0.4, r * 0.2, s * 0.03); ctx.fill();
      ellipse(ctx, r * 0.05, r * 0.1, r * 0.42, r * 0.42, c2); ellipse(ctx, r * 0.05, r * 0.1, r * 0.3, r * 0.3, '#151515'); ellipse(ctx, -r * 0.05, 0, r * 0.08, r * 0.08, 'rgba(255,255,255,0.6)');
      rrect(ctx, r * 0.55, -r * 0.35, r * 0.3, r * 0.15, s * 0.02); ctx.fillStyle = '#F8F8F0'; ctx.fill();
      break;
    }
    case 'cameraCard': {
      rrect(ctx, -r, -h / 2, s, h, s * 0.06); ctx.fillStyle = c1; ctx.fill();
      ctx.save(); ctx.translate(0, h * 0.05); ctx.strokeStyle = c2; ctx.lineWidth = s * 0.03;
      rrect(ctx, -r * 0.6, -r * 0.3, r * 1.2, r * 0.75, s * 0.06); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, r * 0.08, r * 0.24, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.rect(-r * 0.45, -r * 0.45, r * 0.3, r * 0.15); ctx.stroke();
      ctx.restore();
      break;
    }
    case 'lips': {
      ctx.beginPath(); ctx.moveTo(-r, 0); ctx.bezierCurveTo(-r * 0.6, -r * 0.6, -r * 0.15, -r * 0.45, 0, -r * 0.25); ctx.bezierCurveTo(r * 0.15, -r * 0.45, r * 0.6, -r * 0.6, r, 0); ctx.bezierCurveTo(r * 0.6, r * 0.65, -r * 0.6, r * 0.65, -r, 0); ctx.fillStyle = c1; ctx.fill();
      ctx.strokeStyle = shade(c1, -0.25); ctx.lineWidth = s * 0.02; ctx.beginPath(); ctx.moveTo(-r * 0.9, 0); ctx.quadraticCurveTo(0, r * 0.12, r * 0.9, 0); ctx.stroke();
      ellipse(ctx, -r * 0.35, r * 0.25, r * 0.14, r * 0.06, withAlpha(c2, 0.6), 0.2);
      break;
    }
    case 'pin': {
      ctx.strokeStyle = c2; ctx.lineWidth = s * 0.05; ctx.beginPath(); ctx.moveTo(0, r * 0.1); ctx.lineTo(r * 0.1, r); ctx.stroke();
      const g = ctx.createRadialGradient(-r * 0.15, -r * 0.35, r * 0.05, 0, -r * 0.2, r * 0.5); g.addColorStop(0, shade(c1, 0.3)); g.addColorStop(1, c1);
      ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.45, 0, TAU);
      ctx.fillStyle = g; ctx.fill();
      break;
    }
    case 'ticket': {
      ctx.beginPath(); ctx.moveTo(-r, -h / 2); ctx.lineTo(r, -h / 2); ctx.lineTo(r, -h * 0.12); ctx.arc(r, 0, h * 0.12, -Math.PI / 2, Math.PI / 2, true); ctx.lineTo(r, h / 2); ctx.lineTo(-r, h / 2); ctx.lineTo(-r, h * 0.12); ctx.arc(-r, 0, h * 0.12, Math.PI / 2, -Math.PI / 2, true); ctx.closePath();
      ctx.fillStyle = c1; ctx.fill();
      ctx.fillStyle = c2; ctx.fillRect(-r * 0.85, -h * 0.35, r * 1.1, h * 0.16);
      ctx.fillStyle = '#1A1A1A';
      for (let x = -r * 0.85; x < r * 0.25; x += s * (0.008 + rand() * 0.012)) ctx.fillRect(x, h * 0.02, s * (0.004 + rand() * 0.008), h * 0.3);
      ctx.setLineDash([s * 0.02, s * 0.02]); ctx.strokeStyle = withAlpha('#1A1A1A', 0.5); ctx.lineWidth = s * 0.008; ctx.beginPath(); ctx.moveTo(r * 0.45, -h / 2); ctx.lineTo(r * 0.45, h / 2); ctx.stroke();
      break;
    }
    case 'sneaker': {
      ctx.beginPath(); ctx.moveTo(-r, h * 0.3); ctx.lineTo(-r * 0.95, -h * 0.4); ctx.quadraticCurveTo(-r * 0.6, -h * 0.5, -r * 0.35, -h * 0.25); ctx.quadraticCurveTo(r * 0.3, -h * 0.1, r * 0.9, h * 0.05); ctx.quadraticCurveTo(r, h * 0.2, r * 0.95, h * 0.3); ctx.closePath(); ctx.fillStyle = c1; ctx.fill();
      ctx.fillStyle = shade(c1, -0.1); ctx.fillRect(-r, h * 0.25, s * 0.97, h * 0.18);
      ctx.strokeStyle = c2; ctx.lineWidth = s * 0.035; ctx.beginPath(); ctx.moveTo(-r * 0.55, h * 0.05); ctx.quadraticCurveTo(0, -h * 0.2, r * 0.4, h * 0.12); ctx.stroke();
      ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = s * 0.012; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.3 + i * r * 0.12, -h * 0.25 + i * h * 0.04); ctx.lineTo(-r * 0.2 + i * r * 0.12, -h * 0.12 + i * h * 0.04); ctx.stroke(); }
      break;
    }
    case 'planet': {
      ellipse(ctx, 0, 0, r * 0.55, r * 0.55, c1);
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, TAU); ctx.clip(); ctx.fillStyle = shade(c1, -0.12); for (let i = -2; i <= 2; i++) ctx.fillRect(-r, i * r * 0.2, s, r * 0.07); ctx.restore();
      ctx.strokeStyle = c2; ctx.lineWidth = s * 0.05; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r * 0.25, -0.35, 0.1, Math.PI - 0.1); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r * 0.25, -0.35, Math.PI + 0.55, TAU - 0.55); ctx.stroke();
      break;
    }
    case 'musicNote': {
      ellipse(ctx, -r * 0.45, r * 0.55, r * 0.25, r * 0.18, c1, -0.4); ellipse(ctx, r * 0.45, r * 0.35, r * 0.25, r * 0.18, c1, -0.4);
      ctx.fillStyle = c1; ctx.fillRect(-r * 0.25, -r * 0.7, r * 0.08, r * 1.25); ctx.fillRect(r * 0.65, -r * 0.9, r * 0.08, r * 1.25);
      ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.7); ctx.lineTo(r * 0.73, -r * 0.9); ctx.lineTo(r * 0.73, -r * 0.65); ctx.lineTo(-r * 0.25, -r * 0.45); ctx.fill();
      break;
    }
    case 'sunglasses': {
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * r * 0.5, 0, r * 0.42, h * 0.42, 0, 0, TAU); ctx.fillStyle = c1; ctx.fill(); ctx.strokeStyle = c2; ctx.lineWidth = s * 0.03; ctx.stroke(); ellipse(ctx, sx * r * 0.5 - r * 0.15, -h * 0.12, r * 0.1, h * 0.08, 'rgba(255,255,255,0.4)'); }
      ctx.strokeStyle = c2; ctx.lineWidth = s * 0.03; ctx.beginPath(); ctx.moveTo(-r * 0.1, -h * 0.1); ctx.quadraticCurveTo(0, -h * 0.25, r * 0.1, -h * 0.1); ctx.stroke();
      break;
    }
    case 'moon': {
      ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, TAU); ctx.arc(r * 0.35, -r * 0.2, r * 0.7, 0, TAU, true); ctx.fillStyle = c1; ctx.fill('evenodd');
      break;
    }
    case 'polaroid': {
      ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = s * 0.05; ctx.shadowOffsetY = s * 0.02;
      ctx.fillStyle = c1; ctx.fillRect(-r, -h / 2, s, h); ctx.shadowColor = 'transparent';
      const g = ctx.createLinearGradient(0, -h / 2, 0, h * 0.25); g.addColorStop(0, c2); g.addColorStop(1, shade(c2, 0.3));
      ctx.fillStyle = g; ctx.fillRect(-r * 0.88, -h / 2 + r * 0.12, s * 0.88, s * 0.88);
      break;
    }
    case 'receipt': {
      ctx.beginPath(); ctx.moveTo(-r, -h / 2);
      for (let i = 0; i <= 12; i++) ctx.lineTo(-r + (i / 12) * s, -h / 2 + (i % 2) * s * 0.04);
      ctx.lineTo(r, h / 2);
      for (let i = 12; i >= 0; i--) ctx.lineTo(-r + (i / 12) * s, h / 2 - (i % 2) * s * 0.04);
      ctx.closePath(); ctx.fillStyle = c1; ctx.fill();
      ctx.fillStyle = withAlpha(c2, 0.75);
      for (let i = 0; i < 9; i++) ctx.fillRect(-r * 0.75, -h * 0.38 + i * h * 0.06, s * (0.35 + rand() * 0.25), h * 0.02);
      for (let x = -r * 0.75; x < r * 0.75; x += s * (0.012 + rand() * 0.015)) ctx.fillRect(x, h * 0.22, s * (0.005 + rand() * 0.01), h * 0.16);
      break;
    }
    case 'phone': {
      rrect(ctx, -r * 0.55, -h / 2, s * 0.55, h, s * 0.08); ctx.fillStyle = c1; ctx.fill();
      rrect(ctx, -r * 0.42, -h * 0.1, s * 0.42, h * 0.3, s * 0.02); ctx.fillStyle = '#9AB08A'; ctx.fill();
      ctx.fillStyle = c2;
      for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) ctx.fillRect(-r * 0.4 + i * r * 0.28, h * 0.26 + j * h * 0.055, r * 0.2, h * 0.035);
      ctx.fillRect(-r * 0.05, -h * 0.75, r * 0.1, h * 0.28);
      break;
    }
    case 'shorts': {
      ctx.beginPath(); ctx.moveTo(-r * 0.8, -h / 2); ctx.lineTo(r * 0.8, -h / 2); ctx.lineTo(r * 0.95, h / 2); ctx.lineTo(r * 0.1, h / 2); ctx.lineTo(0, -h * 0.05); ctx.lineTo(-r * 0.1, h / 2); ctx.lineTo(-r * 0.95, h / 2); ctx.closePath(); ctx.fillStyle = c1; ctx.fill();
      ctx.fillStyle = c2; ctx.fillRect(-r * 0.8, -h / 2, s * 0.8, h * 0.1);
      ctx.fillRect(-r * 0.9, h * 0.2, r * 0.08, h * 0.3); ctx.fillRect(r * 0.82, h * 0.2, r * 0.08, h * 0.3);
      break;
    }
    // ------------------------------------------------ third set: Y2K, craft, toys, decor
    case 'glitterHeart': {
      shapePath(ctx, 'heart', s); ctx.fillStyle = c1; ctx.fill(); ctx.save(); ctx.clip();
      for (let i = 0; i < 140; i++) ellipse(ctx, (rand() - 0.5) * s, (rand() - 0.5) * s, s * 0.012, s * 0.012, rand() > 0.5 ? '#FFFFFF' : c2);
      ctx.restore();
      shapePath(ctx, 'heart', s); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = s * 0.03; ctx.stroke();
      break;
    }
    case 'chromeSwirl': {
      const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.35, c1); g.addColorStop(0.55, c2); g.addColorStop(0.75, '#FFFFFF'); g.addColorStop(1, c2);
      ctx.strokeStyle = g; ctx.lineWidth = s * 0.09; ctx.beginPath();
      for (let t = 0; t <= 1; t += 0.01) { const a = t * TAU * 1.8, d = r * 0.85 * (1 - t * 0.8); ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d); }
      ctx.stroke();
      break;
    }
    case 'sparkleStar': {
      ctx.shadowColor = c2; ctx.shadowBlur = s * 0.15;
      shapePath(ctx, 'sparkle', s); ctx.fillStyle = c1; ctx.fill();
      shapePath(ctx, 'sparkle', s * 0.5); ctx.fillStyle = '#FFFFFF'; ctx.fill();
      break;
    }
    case 'buttonStar': {
      shapePath(ctx, 'star5', s, { rounded: true }); ctx.fillStyle = c1; ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = s * 0.05; ctx.shadowOffsetY = s * 0.02; ctx.fill(); ctx.shadowColor = 'transparent';
      shapePath(ctx, 'star5', s * 0.8, { rounded: true }); ctx.strokeStyle = shade(c1, -0.15); ctx.lineWidth = s * 0.02; ctx.stroke();
      for (const [x, y] of [[-0.08, -0.08], [0.08, -0.08], [-0.08, 0.08], [0.08, 0.08]]) ellipse(ctx, x * s, y * s, s * 0.03, s * 0.03, c2);
      break;
    }
    case 'clipStar': {
      rrect(ctx, -r * 0.9, -r * 0.12, s * 0.9, r * 0.24, r * 0.12); ctx.fillStyle = c2; ctx.fill();
      shapePath(ctx, 'star5', s * 0.6, { rounded: true }); ctx.fillStyle = c1; ctx.fill();
      ellipse(ctx, -r * 0.08, -r * 0.1, r * 0.08, r * 0.05, 'rgba(255,255,255,0.6)');
      break;
    }
    case 'balloonStar': {
      ctx.strokeStyle = '#555'; ctx.lineWidth = s * 0.01; ctx.beginPath(); ctx.moveTo(0, r * 0.4); ctx.quadraticCurveTo(r * 0.2, r * 0.8, 0, r); ctx.stroke();
      shapePath(ctx, 'star5', s * 0.85, { rounded: true });
      const g = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.05, 0, 0, r * 0.6); g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.3, c1); g.addColorStop(1, shade(c1, -0.2));
      ctx.fillStyle = g; ctx.fill();
      break;
    }
    case 'quiltedStar': {
      shapePath(ctx, 'star5', s, { rounded: true }); ctx.fillStyle = c1; ctx.fill(); ctx.save(); ctx.clip();
      ctx.strokeStyle = c2; ctx.lineWidth = s * 0.012;
      for (let k = -s; k < s; k += s * 0.12) { ctx.beginPath(); ctx.moveTo(k, -r); ctx.lineTo(k + s, r); ctx.stroke(); ctx.beginPath(); ctx.moveTo(k, r); ctx.lineTo(k + s, -r); ctx.stroke(); }
      ctx.restore();
      shapePath(ctx, 'star5', s, { rounded: true }); ctx.strokeStyle = shade(c1, -0.2); ctx.lineWidth = s * 0.02; ctx.stroke();
      break;
    }
    case 'badge': {
      ellipse(ctx, 0, 0, r * 0.95, r * 0.95, c2);
      ellipse(ctx, 0, 0, r * 0.85, r * 0.85, c1);
      ctx.fillStyle = c2; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const words = (label || 'STAR').split(' ');
      const fs = (s * 0.5) / Math.max(2, words.length);
      ctx.font = `700 ${fs}px 'Space Grotesk', 'Arial Black', sans-serif`;
      words.forEach((w, i) => ctx.fillText(w, 0, (i - (words.length - 1) / 2) * fs * 1.05, s * 0.75));
      break;
    }
    case 'blockDab':
    case 'blockWave':
    case 'blockFall': {
      // Original blocky toy figure: square head, box body, block limbs.
      const u2 = s / 10;
      const pose = art === 'blockDab' ? [[-140, -40], [-40, 40]] : art === 'blockWave' ? [[-160, 0], [0, 20]] : [[-200, 200], [30, -30]];
      const limb = (x: number, y: number, a: number, w: number, h: number, color: string) => { ctx.save(); ctx.translate(x, y); ctx.rotate((a * Math.PI) / 180); ctx.fillStyle = color; ctx.fillRect(-w / 2, 0, w, h); ctx.restore(); };
      if (art === 'blockFall') ctx.rotate(0.6);
      limb(-u2 * 0.8, u2 * 1.2, pose[1][0] * 0.1, u2 * 0.9, u2 * 2.8, '#3A3A8A');
      limb(u2 * 0.8, u2 * 1.2, pose[1][1] * 0.1, u2 * 0.9, u2 * 2.8, '#3A3A8A');
      limb(-u2 * 1.4, -u2 * 1.6, pose[0][0] * 0.9, u2 * 0.9, u2 * 2.6, c1);
      limb(u2 * 1.4, -u2 * 1.6, -pose[0][1] * 0.9 - 20, u2 * 0.9, u2 * 2.6, c1);
      ctx.fillStyle = c1; ctx.fillRect(-u2 * 1.4, -u2 * 1.8, u2 * 2.8, u2 * 3.2);
      ctx.fillStyle = c2; ctx.fillRect(-u2 * 1.1, -u2 * 4.4, u2 * 2.2, u2 * 2.4);
      ctx.fillStyle = '#1A1A1A'; ctx.fillRect(-u2 * 0.6, -u2 * 3.6, u2 * 0.35, u2 * 0.35); ctx.fillRect(u2 * 0.25, -u2 * 3.6, u2 * 0.35, u2 * 0.35);
      ctx.fillRect(-u2 * 0.4, -u2 * 2.8, u2 * 0.8, u2 * 0.2);
      break;
    }
    case 'safetyPin': {
      ctx.strokeStyle = c1; ctx.lineWidth = s * 0.04; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-r * 0.8, r * 0.05); ctx.lineTo(r * 0.6, -r * 0.1); ctx.arc(r * 0.68, 0, r * 0.12, -Math.PI / 2, Math.PI / 2); ctx.lineTo(-r * 0.8, r * 0.12); ctx.stroke();
      rrect(ctx, -r * 0.95, -r * 0.12, r * 0.3, r * 0.3, s * 0.02); ctx.fillStyle = c2; ctx.fill();
      break;
    }
    case 'paperclip': {
      ctx.strokeStyle = c1; ctx.lineWidth = s * 0.035; ctx.beginPath();
      ctx.moveTo(-r * 0.15, r * 0.5); ctx.lineTo(-r * 0.15, -r * 0.6); ctx.arc(0, -r * 0.6, r * 0.15, Math.PI, 0); ctx.lineTo(r * 0.15, r * 0.7); ctx.arc(-r * 0.03, r * 0.7, r * 0.18, 0, Math.PI); ctx.lineTo(-r * 0.21, -r * 0.4);
      ctx.stroke();
      break;
    }
    case 'bow': {
      for (const sx of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(sx * r * 0.5, -r * 0.6, sx * r, -r * 0.3, sx * r * 0.9, r * 0.1); ctx.bezierCurveTo(sx * r * 0.7, r * 0.4, sx * r * 0.3, r * 0.2, 0, 0); ctx.fillStyle = c1; ctx.fill();
        ctx.save(); ctx.clip(); ctx.fillStyle = withAlpha(c2, 0.55);
        for (let k = -s; k < s; k += s * 0.1) { ctx.fillRect(k, -r, s * 0.05, s); ctx.fillRect(-r, k, s, s * 0.05); }
        ctx.restore();
        ctx.beginPath(); ctx.moveTo(sx * r * 0.05, r * 0.05); ctx.lineTo(sx * r * 0.4, r * 0.85); ctx.lineTo(sx * r * 0.2, r * 0.8); ctx.closePath(); ctx.fillStyle = c1; ctx.fill();
      }
      ellipse(ctx, 0, 0, r * 0.14, r * 0.16, shade(c1, -0.15));
      break;
    }
    case 'cherries': {
      ctx.strokeStyle = '#3A6A2A'; ctx.lineWidth = s * 0.025; ctx.beginPath(); ctx.moveTo(-r * 0.35, r * 0.3); ctx.quadraticCurveTo(-r * 0.1, -r * 0.5, r * 0.2, -r * 0.8); ctx.moveTo(r * 0.35, r * 0.35); ctx.quadraticCurveTo(r * 0.3, -r * 0.3, r * 0.2, -r * 0.8); ctx.stroke();
      ellipse(ctx, r * 0.35, -r * 0.75, r * 0.25, r * 0.1, '#4A8A3A', -0.5);
      for (const x of [-0.35, 0.35]) { ellipse(ctx, x * r, r * 0.45, r * 0.3, r * 0.3, c1); ellipse(ctx, x * r - r * 0.1, r * 0.35, r * 0.07, r * 0.05, 'rgba(255,255,255,0.6)'); }
      break;
    }
    case 'lily': {
      ctx.strokeStyle = '#4A7A3A'; ctx.lineWidth = s * 0.025; ctx.beginPath(); ctx.moveTo(0, r * 0.1); ctx.quadraticCurveTo(r * 0.1, r * 0.6, 0, r); ctx.stroke();
      for (let i = 0; i < 6; i++) { ctx.save(); ctx.rotate((i / 6) * TAU); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(r * 0.2, -r * 0.35, 0, -r * 0.7); ctx.quadraticCurveTo(-r * 0.2, -r * 0.35, 0, 0); ctx.fillStyle = c1; ctx.fill(); ctx.strokeStyle = shade(c1, -0.15); ctx.lineWidth = s * 0.006; ctx.stroke(); ctx.restore(); }
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.3; ellipse(ctx, Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25, s * 0.015, s * 0.025, c2); }
      break;
    }
    case 'keytag': {
      ctx.strokeStyle = '#B8B8B8'; ctx.lineWidth = s * 0.03; ctx.beginPath(); ctx.arc(-r * 0.75, -h * 0.05, r * 0.2, 0, TAU); ctx.stroke();
      const g = ctx.createLinearGradient(-r, -h / 2, r, h / 2); g.addColorStop(0, '#F2F2F2'); g.addColorStop(0.5, c1); g.addColorStop(1, '#9A9A9A');
      rrect(ctx, -r * 0.55, -h * 0.3, s * 0.75, h * 0.5, h * 0.25); ctx.fillStyle = g; ctx.fill();
      ctx.fillStyle = c2; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `${h * 0.22}px 'Segoe Script', 'Bradley Hand', cursive`;
      ctx.fillText(label || 'with love', r * 0.2, -h * 0.05, s * 0.65);
      break;
    }
    case 'watch': {
      ctx.fillStyle = c1; rrect(ctx, -r * 0.3, -h / 2, r * 0.6, h, s * 0.05); ctx.fill();
      ellipse(ctx, 0, 0, r * 0.55, r * 0.55, c2); ellipse(ctx, 0, 0, r * 0.45, r * 0.45, '#F8F8F0');
      ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = s * 0.03; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.3); ctx.moveTo(0, 0); ctx.lineTo(r * 0.2, r * 0.05); ctx.stroke();
      break;
    }
  }
  ctx.restore();
}
