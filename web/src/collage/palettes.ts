import type { Localized, Palette } from './types';

export interface PresetPalette {
  id: string;
  name: Localized;
  colors: Palette;
}

/** Every standard slot, in the order the Colors panel lists them. */
export const STANDARD_SLOTS = [
  'background', 'backgroundSecondary', 'paper', 'starPrimary', 'starSecondary', 'doodleFill',
  'doodleStroke', 'outline', 'outlineSecondary', 'tint', 'tintSecondary', 'text', 'frame', 'accent'
] as const;

const p = (
  background: string, backgroundSecondary: string, paper: string, starPrimary: string, starSecondary: string,
  doodleFill: string, doodleStroke: string, outline: string, outlineSecondary: string, tint: string,
  tintSecondary: string, text: string, frame: string, accent: string
): Palette => ({ background, backgroundSecondary, paper, starPrimary, starSecondary, doodleFill, doodleStroke, outline, outlineSecondary, tint, tintSecondary, text, frame, accent });

export const PRESETS: PresetPalette[] = [
  { id: 'wine-felt', name: { en: 'Wine Felt', pt: 'Feltro Vinho' }, colors: p('#7A1F2C', '#5A1420', '#F3E9D8', '#F7D6E6', '#BFE3F5', '#E8C84A', '#F3E9D8', '#F3E9D8', '#1A1A1A', '#7A1F2C', '#F3E9D8', '#FFFFFF', '#111111', '#E76F86') },
  { id: 'candy-stripe', name: { en: 'Candy Stripe', pt: 'Listra Doce' }, colors: p('#7E1D17', '#D17781', '#FBEFEA', '#FFD6E8', '#CFE8FF', '#FFC1D6', '#7E1D17', '#FFFFFF', '#7E1D17', '#7E1D17', '#FBEFEA', '#FFFFFF', '#1B1B1B', '#D17781') },
  { id: 'cherry-red', name: { en: 'Cherry Red', pt: 'Vermelho Cereja' }, colors: p('#B3172D', '#7D0F1F', '#F6EFE6', '#F4F1EA', '#D8F2E4', '#FFD7C2', '#F6EFE6', '#F6EFE6', '#2A0D10', '#B3172D', '#F6EFE6', '#FFFFFF', '#1C1414', '#FFB3C1') },
  { id: 'navy-gold', name: { en: 'Navy and Gold', pt: 'Marinho e Ouro' }, colors: p('#28415F', '#1A2C44', '#EFE6CF', '#E8C84A', '#F3DE8A', '#E8C84A', '#EFE6CF', '#EFE6CF', '#E8C84A', '#28415F', '#EFE6CF', '#EFE6CF', '#0E1A2A', '#E8C84A') },
  { id: 'sky-zine', name: { en: 'Sky Zine', pt: 'Zine Céu' }, colors: p('#D9EDF6', '#B9DCEB', '#F7F3EA', '#D9EDF6', '#FFFFFF', '#D9EDF6', '#FFFFFF', '#FFFFFF', '#1A1A1A', '#2F5D7C', '#D9EDF6', '#1A1A1A', '#1A1A1A', '#2F5D7C') },
  { id: 'crayon-pop', name: { en: 'Crayon Pop', pt: 'Giz Pop' }, colors: p('#F6A402', '#023A73', '#FFF6E0', '#FD0100', '#F6A402', '#FD0100', '#023A73', '#023A73', '#F6A402', '#FD0100', '#F6A402', '#FFFFFF', '#111111', '#FD0100') },
  { id: 'olive-love', name: { en: 'Olive Love', pt: 'Amor Oliva' }, colors: p('#56592A', '#3B3D1C', '#EDE6CC', '#F28CC0', '#9B6BE0', '#F2D541', '#C8322B', '#FFFFFF', '#3B3D1C', '#3B3D1C', '#EDE6CC', '#C8322B', '#2A2B14', '#F28CC0') },
  { id: 'mustard-teal', name: { en: 'Mustard and Teal', pt: 'Mostarda e Petróleo' }, colors: p('#F2C230', '#E0A91D', '#FFF5D6', '#1F9A8F', '#F2C230', '#1F9A8F', '#1F9A8F', '#FFFFFF', '#1F9A8F', '#1F2A28', '#F2C230', '#1F2A28', '#1F2A28', '#1F9A8F') },
  { id: 'cobalt-duotone', name: { en: 'Cobalt Duotone', pt: 'Duotone Cobalto' }, colors: p('#F8F4F1', '#EDE6E0', '#F8F4F1', '#F26297', '#3A7BEA', '#F5C518', '#3DAA3D', '#FFFFFF', '#023EAC', '#023EAC', '#F8F4F1', '#023EAC', '#1A1A1A', '#F26297') },
  { id: 'burnt-orange', name: { en: 'Burnt Orange', pt: 'Laranja Queimado' }, colors: p('#F1E7D6', '#E3D3B8', '#F1E7D6', '#D9773F', '#F0A36B', '#D9773F', '#D9773F', '#FFFFFF', '#5A3A22', '#8A5A33', '#F1E7D6', '#5A3A22', '#2A1D12', '#D9773F') },
  { id: 'pastel-holo', name: { en: 'Pastel Holo', pt: 'Holo Pastel' }, colors: p('#F7E1EE', '#DCD3F5', '#FFFFFF', '#FFC6E3', '#BDE7FF', '#FFE59E', '#B79CF2', '#FFFFFF', '#B79CF2', '#B79CF2', '#FFF6FB', '#7A5BC7', '#4B3B70', '#FF9CCB') },
  { id: 'mono-paper', name: { en: 'Mono Paper', pt: 'Papel Mono' }, colors: p('#E9E6E1', '#CFCAC2', '#FAF8F4', '#1A1A1A', '#777777', '#1A1A1A', '#1A1A1A', '#FFFFFF', '#1A1A1A', '#2A2A2A', '#FAF8F4', '#1A1A1A', '#111111', '#7A1F3D') }
];

export const presetById = (id: string) => PRESETS.find((x) => x.id === id) || PRESETS[0];

// ---------------------------------------------------------------- color math

export function hexToRgb(hex: string): [number, number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16) || 0;
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}

export function rgbToHex(r: number, g: number, b: number, a = 1): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b) + (a < 1 ? c(a * 255) : '');
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

export function hslToHex(h: number, s: number, l: number, a = 1): string {
  h = ((h % 360) + 360) % 360;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255, a);
}

export function withAlpha(hex: string, a: number): string {
  const [r, g, b, a0] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a0 * a})`;
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Black or white, whichever reads better on the given color. */
export function contrastOn(hex: string): string {
  return luminance(hex) > 0.55 ? '#111111' : '#FFFFFF';
}

/** A few dominant colors of an image (simple k-means on a small sample). */
export function dominantColors(src: HTMLCanvasElement, k = 5): string[] {
  const c = document.createElement('canvas');
  c.width = 48; c.height = 48;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0, 48, 48);
  const d = ctx.getImageData(0, 0, 48, 48).data;
  const px: [number, number, number][] = [];
  for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
  let cent = Array.from({ length: k }, (_, i) => px[Math.floor((i + 0.5) * px.length / k)]);
  for (let it = 0; it < 8; it++) {
    const sum = cent.map(() => [0, 0, 0, 0]);
    for (const q of px) {
      let best = 0, bd = Infinity;
      cent.forEach((cc, j) => { const dd = (q[0] - cc[0]) ** 2 + (q[1] - cc[1]) ** 2 + (q[2] - cc[2]) ** 2; if (dd < bd) { bd = dd; best = j; } });
      const s = sum[best]; s[0] += q[0]; s[1] += q[1]; s[2] += q[2]; s[3]++;
    }
    cent = sum.map((s, j) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : cent[j]) as [number, number, number]);
  }
  return cent.map((cc) => rgbToHex(cc[0], cc[1], cc[2]));
}

/**
 * A harmonious palette built from the photo colors. Picks the most colorful
 * photo color as the base hue, then derives the slots with a random harmony
 * (complementary, analogous, triadic or split complementary).
 */
export function shufflePalette(photo: HTMLCanvasElement | null, seed = Math.random()): Palette {
  let baseHue = seed * 360;
  if (photo) {
    const cols = dominantColors(photo).map((h) => { const [r, g, b] = hexToRgb(h); return rgbToHsl(r, g, b); });
    cols.sort((a, b) => b[1] * (1 - Math.abs(b[2] - 0.5)) - a[1] * (1 - Math.abs(a[2] - 0.5)));
    const pick = cols[Math.floor(seed * Math.min(3, cols.length))] || cols[0];
    if (pick && pick[1] > 0.08) baseHue = pick[0];
  }
  const modes = [[0, 180], [0, 30, -30], [0, 120, 240], [0, 150, 210]];
  const m = modes[Math.floor(seed * 997) % modes.length];
  const h2 = baseHue + m[1];
  const h3 = baseHue + (m[2] ?? m[1] + 20);
  const dark = seed > 0.5;
  const bg = dark ? hslToHex(baseHue, 0.55, 0.28) : hslToHex(baseHue, 0.5, 0.82);
  const bg2 = dark ? hslToHex(baseHue, 0.5, 0.2) : hslToHex(h2, 0.45, 0.7);
  const paper = hslToHex(40, 0.45, 0.92);
  return {
    background: bg, backgroundSecondary: bg2, paper,
    starPrimary: hslToHex(h2, 0.8, 0.62), starSecondary: hslToHex(h3, 0.75, 0.7),
    doodleFill: hslToHex(h3, 0.85, 0.55), doodleStroke: hslToHex(h2, 0.8, 0.45),
    outline: paper, outlineSecondary: hslToHex(h2, 0.7, 0.4),
    tint: hslToHex(baseHue, 0.75, 0.32), tintSecondary: paper,
    text: dark ? '#FFFFFF' : hslToHex(baseHue, 0.6, 0.2), frame: '#111111', accent: hslToHex(h3, 0.85, 0.6)
  };
}
