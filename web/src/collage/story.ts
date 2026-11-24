/**
 * Multi Photo Story: layout generators for vertical Story collages (and the 4:5 feed version).
 *
 * Each style is data: an id, a name, a recommended filter and a pure generator
 * `generate(photos, canvas, options, seed)` that returns frames (position, size,
 * rotation, shape, z order) and optional decorations. The same seed always gives the
 * same layout, and Shuffle only changes the seed. `buildStoryLayers` turns frames
 * into regular collage layers, so the editor, palette, filters, drafts, undo and
 * export work exactly as for templates.
 *
 * Coordinates are canvas fractions: x and y are the frame center, w and h its size.
 * The Instagram Story UI covers the top 250 px and bottom 340 px of 1920, so the
 * generators keep faces inside the band between those safe zones.
 */
import type { Layer, Localized, Paint, StickerArt } from './types';
import { rng } from './textures';
import { STICKER_DEFAULTS } from './stickers';

export interface PhotoMeta {
  /** Width / height. */
  aspect: number;
  /** Detected faces as fractions of the photo (center and radius as a fraction of the width). */
  faces: { x: number; y: number; r: number }[];
  /** 0..1, higher = better hero candidate (faces, size, sharpness). */
  quality: number;
}

export interface StoryOptions {
  /** Gap between photos and border width in px at 1080 wide. */
  gutter: number;
  border: number;
  /** Corner radius in px at 1080 wide. */
  radius: number;
  shadow: boolean;
  /** Max rotation in degrees for messy styles. */
  rotation: number;
  /** 0 = airy, 1 = packed. */
  density: number;
}

export const DEFAULT_STORY_OPTIONS: StoryOptions = { gutter: 12, border: 0, radius: 0, shadow: false, rotation: 12, density: 0.6 };

export type FrameShape = 'rect' | 'print' | 'polaroid' | 'circle' | 'heart' | 'star' | 'band';

export interface Frame {
  photo: number;
  x: number; y: number; w: number; h: number;
  rot: number;
  shape: FrameShape;
  z: number;
}

export interface StoryLayout { frames: Frame[]; strips?: { x: number; y: number; w: number; h: number; rot: number; photos: number[]; film: boolean }[]; decor?: Layer[] }

export interface StoryCanvas { w: number; h: number }

export interface StoryStyle {
  id: string;
  name: Localized;
  /** Recommended filter (look id) offered first in the filter sheet. */
  filter: string;
  defaults?: Partial<StoryOptions>;
  generate: (photos: PhotoMeta[], canvas: StoryCanvas, o: StoryOptions, seed: number) => StoryLayout;
}

// ---------------------------------------------------------------- helpers

/** Safe band (fractions of the height) that the Story UI never covers. */
export const SAFE_TOP = 250 / 1920;
export const SAFE_BOTTOM = 340 / 1920;
const safe = (c: StoryCanvas) => (c.h / c.w > 1.6 ? { top: SAFE_TOP, bottom: 1 - SAFE_BOTTOM } : { top: 0.03, bottom: 0.97 });

/** Photo indexes sorted best hero first. */
const byQuality = (p: PhotoMeta[]) => p.map((m, i) => ({ i, q: m.quality + (m.faces.length ? 0.3 : 0) })).sort((a, b) => b.q - a.q).map((v) => v.i);

/** Best grid (cols, rows) for n cells in an area of aspect A (w / h), cells close to the photo aspect. */
function bestGrid(n: number, A: number, cellAspect = 0.85) {
  let best = { cols: 1, rows: n, score: Infinity };
  for (let cols = 1; cols <= Math.min(n, 8); cols++) {
    const rows = Math.ceil(n / cols);
    const ca = (A * rows) / cols;
    const empty = rows * cols - n;
    const score = Math.abs(Math.log(ca / cellAspect)) + empty * 0.08;
    if (score < best.score) best = { cols, rows, score };
  }
  return best;
}

/** Points of a face inside a frame, in canvas fractions (ignores rotation, good enough for overlap tests). */
function facePoints(f: Frame, m: PhotoMeta, ar: number) {
  // Cover crop: the photo is scaled to fill the frame (frame aspect in pixels).
  const fa = (f.w / f.h) * ar;
  const pts: [number, number][] = [];
  for (const face of m.faces) {
    let fx = face.x, fy = face.y;
    if (m.aspect > fa) fx = 0.5 + (face.x - 0.5) * (m.aspect / fa); else fy = 0.5 + (face.y - 0.5) * (fa / m.aspect);
    if (fx >= 0 && fx <= 1 && fy >= 0 && fy <= 1) pts.push([f.x + (fx - 0.5) * f.w, f.y + (fy - 0.5) * f.h]);
  }
  return pts;
}
const inside = (f: Frame, x: number, y: number, pad = 0) => Math.abs(x - f.x) < f.w / 2 + pad && Math.abs(y - f.y) < f.h / 2 + pad;

/** Frames scattered like prints on a table; later frames never cover earlier faces. */
function scatter(photos: PhotoMeta[], c: StoryCanvas, o: StoryOptions, seed: number, shape: FrameShape, sizeK = 1) {
  const r = rng(seed);
  const n = photos.length;
  const S = safe(c);
  const ar = c.w / c.h;
  // Frame width so that the frames cover the canvas about `density` times.
  const area = (0.55 + o.density * 0.9) / n;
  const frames: Frame[] = [];
  const order = byQuality(photos);
  const cols = Math.max(1, Math.round(Math.sqrt(n * ar * 1.3)));
  const rows = Math.ceil(n / cols);
  order.forEach((pi, k) => {
    const m = photos[pi];
    const a = Math.min(1.4, Math.max(0.65, m.aspect));
    const w0 = Math.min(0.85, Math.sqrt(area * a / ar) * sizeK * (k === 0 ? 1.25 : 1));
    let best: Frame | null = null, bestScore = -Infinity;
    // If no spot leaves every earlier face visible, try again with a smaller print.
    for (let tries = 0; tries < 160; tries++) {
      if (bestScore > -10 && tries >= 30 && tries % 40 === 0) break;
      const w = w0 * [1, 0.8, 0.62, 0.45][Math.min(3, Math.floor(tries / 40))];
      const h = (w * ar) / a;
      const gx = (k % cols + 0.5) / cols, gy = (Math.floor(k / cols) + 0.5) / rows;
      const x = Math.min(1 - w * 0.35, Math.max(w * 0.35, gx + (r() - 0.5) * (1 / cols) * 0.9));
      const y = S.top + h * 0.3 + (gy + (r() - 0.5) * (1 / rows) * 0.8) * (S.bottom - S.top - h * 0.6);
      const f: Frame = { photo: pi, x, y, w, h, rot: (r() * 2 - 1) * o.rotation, shape, z: k };
      // Covering an earlier face is not allowed; prefer spots that overlap less.
      const covers = frames.some((e) => facePoints(e, photos[e.photo], ar).some(([fx, fy]) => inside(f, fx, fy, 0.01)));
      const overlap = frames.reduce((s, e) => s + Math.max(0, Math.min(f.x + f.w / 2, e.x + e.w / 2) - Math.max(f.x - f.w / 2, e.x - e.w / 2)) * Math.max(0, Math.min(f.y + f.h / 2, e.y + e.h / 2) - Math.max(f.y - f.h / 2, e.y - e.h / 2)), 0);
      const score = (covers ? -10 : 0) - overlap * 4 + r() * 0.01;
      if (score > bestScore) { bestScore = score; best = f; }
      if (!covers && overlap < 0.002) break;
    }
    frames.push(best!);
  });
  return frames;
}

/** Justified rows: rows of photos at their own aspect, scaled to fill the whole area with no gaps. */
function justified(photos: number[], meta: PhotoMeta[], x0: number, y0: number, W: number, H: number, ar: number, g: number, perRow: number) {
  const frames: Frame[] = [];
  const rows: number[][] = [];
  for (let i = 0; i < photos.length; i += perRow) rows.push(photos.slice(i, i + perRow));
  // Last row too short: merge it into the previous one.
  if (rows.length > 1 && rows[rows.length - 1].length < Math.ceil(perRow / 2)) rows[rows.length - 2].push(...rows.pop()!);
  const heights = rows.map((row) => W / row.reduce((s, i) => s + meta[i].aspect, 0));
  const total = heights.reduce((s, h) => s + h, 0);
  const k = (H - g * (rows.length - 1)) / total;
  let y = y0;
  rows.forEach((row, ri) => {
    const rh = heights[ri] * k;
    const sum = row.reduce((s, i) => s + meta[i].aspect, 0);
    let x = x0;
    row.forEach((pi) => {
      const fw = ((W - g * (row.length - 1)) * meta[pi].aspect) / sum;
      // y and rh are in width units here; convert to canvas height fractions.
      frames.push({ photo: pi, x: x + fw / 2, y: (y + rh / 2) * ar, w: fw, h: rh * ar, rot: 0, shape: 'rect', z: 0 });
      x += fw + g;
    });
    y += rh + g;
  });
  return frames;
}

// ---------------------------------------------------------------- styles

export const STORY_STYLES: StoryStyle[] = [
  {
    id: 'grid', name: { en: 'Grid', pt: 'Grade' }, filter: 'lu-haze',
    generate: (photos, c, o) => {
      const n = photos.length, ar = c.w / c.h, g = o.gutter / 1080;
      const m = 0.04 + (1 - o.density) * 0.06;
      const S = safe(c);
      const top = Math.min(S.top, 0.05 + (1 - o.density) * 0.06), bottom = Math.max(S.bottom, 0.95 - (1 - o.density) * 0.06);
      const areaW = 1 - m * 2, areaH = (bottom - top) / ar;
      const { cols, rows } = bestGrid(n, areaW / areaH);
      const frames: Frame[] = [];
      const ch = (areaH - g * (rows - 1)) / rows;
      let k = 0;
      for (let rI = 0; rI < rows; rI++) {
        // Leftover cells: the last row has fewer, wider photos, so there are never holes.
        const inRow = rI === rows - 1 ? n - k : cols;
        const cw = (areaW - g * (inRow - 1)) / inRow;
        for (let cI = 0; cI < inRow; cI++, k++) {
          frames.push({ photo: k, x: m + cI * (cw + g) + cw / 2, y: (top / ar + rI * (ch + g) + ch / 2) * ar, w: cw, h: ch * ar, rot: 0, shape: 'rect', z: 0 });
        }
      }
      return { frames };
    }
  },
  {
    id: 'mosaic', name: { en: 'Mosaic', pt: 'Mosaico' }, filter: 'lu-flash',
    generate: (photos, c, o) => {
      const ar = c.w / c.h, g = o.gutter / 1080, n = photos.length;
      const m = 0.03 + (1 - o.density) * 0.05;
      const order = byQuality(photos);
      const heroes = order.slice(0, n > 8 ? 2 : 1);
      const rest = photos.map((_, i) => i).filter((i) => !heroes.includes(i));
      const H = 1 / ar - m * 2;
      const perRow = n <= 4 ? 2 : n <= 12 ? 3 : n <= 20 ? 4 : 5;
      // Heroes take a full row each, the rest fill justified rows around them.
      const heroH = Math.min(H * (n > 8 ? 0.26 : 0.38), (1 - m * 2) / Math.max(0.8, photos[heroes[0]].aspect));
      const frames: Frame[] = [];
      let y = m;
      heroes.forEach((hi, k) => {
        if (k === 1) return;
        frames.push({ photo: hi, x: 0.5, y: (y + heroH / 2) * ar, w: 1 - m * 2, h: heroH * ar, rot: 0, shape: 'rect', z: 1 });
        y += heroH + g;
      });
      const second = heroes[1];
      const bottomH = second !== undefined ? heroH : 0;
      if (rest.length) frames.push(...justified(rest, photos, m, y, 1 - m * 2, H + m - y - (bottomH ? bottomH + g : 0), ar, g, perRow));
      if (second !== undefined) frames.push({ photo: second, x: 0.5, y: (H + m - bottomH / 2) * ar, w: 1 - m * 2, h: bottomH * ar, rot: 0, shape: 'rect', z: 1 });
      return { frames };
    }
  },
  {
    id: 'messy', name: { en: 'Messy', pt: 'Bagunçado' }, filter: 'lu-flash', defaults: { border: 14, shadow: true },
    generate: (photos, c, o, seed) => ({ frames: scatter(photos, c, o, seed, 'print') })
  },
  {
    id: 'polaroid', name: { en: 'Polaroid wall', pt: 'Mural de polaroids' }, filter: 'lu-retro', defaults: { rotation: 6, shadow: true },
    generate: (photos, c, o, seed) => {
      const frames = scatter(photos, c, { ...o, rotation: Math.min(o.rotation, 8) }, seed, 'polaroid', 0.95);
      const r = rng(seed + 3);
      const decor: Layer[] = frames.map((f, i) => (r() > 0.5
        ? { id: `tape${i}`, kind: 'shape', shape: 'rect', x: f.x, y: f.y - (f.h / 2) * 1.02, w: f.w * 0.32, h: 0.28, rot: f.rot + (r() - 0.5) * 16, fill: { color: '#FFFFFFAA' } } as Layer
        : { id: `pin${i}`, kind: 'sticker', art: 'pin', x: f.x, y: f.y - (f.h / 2) * 0.98, w: 0.045, rot: 0, paint: { color: ['#E0281E', '#2A62E0', '#F2C21A'][i % 3] }, paint2: { color: '#C8C8C8' } } as Layer));
      return { frames, decor };
    }
  },
  {
    id: 'strip', name: { en: 'Photo strip', pt: 'Tira de cabine' }, filter: 'lu-vintage', defaults: { border: 14 },
    generate: (photos, c, o) => {
      const n = photos.length, S = safe(c);
      const k = Math.min(5, Math.max(1, Math.ceil(n / 4)));
      const per = Math.ceil(n / k);
      const gap = 0.03 + (1 - o.density) * 0.05;
      const sw = Math.min(0.42, (1 - gap * (k + 1)) / k);
      const strips: NonNullable<StoryLayout['strips']> = [];
      for (let i = 0; i < k; i++) {
        const list = Array.from({ length: Math.min(per, n - i * per) }, (_, j) => i * per + j);
        if (!list.length) continue;
        const h = Math.min(S.bottom - S.top + 0.08, (list.length * sw * 0.8 * c.w) / c.h + 0.02);
        strips.push({ x: (1 - (k * sw + (k - 1) * gap)) / 2 + i * (sw + gap) + sw / 2, y: 0.5 + (i % 2 ? 0.02 : -0.02), w: sw, h, rot: (i % 2 ? 2 : -2), photos: list, film: false });
      }
      return { frames: [], strips };
    }
  },
  {
    id: 'film', name: { en: 'Film roll', pt: 'Rolo de filme' }, filter: 'lu-capture',
    generate: (photos, c, o) => {
      const n = photos.length;
      const k = Math.min(4, Math.max(1, Math.ceil(n / 5)));
      const per = Math.ceil(n / k);
      const sw = Math.min(0.5, 0.9 / k);
      const strips: NonNullable<StoryLayout['strips']> = [];
      for (let i = 0; i < k; i++) {
        const list = Array.from({ length: Math.min(per, n - i * per) }, (_, j) => i * per + j);
        if (!list.length) continue;
        strips.push({ x: (i + 0.5) / k, y: 0.5, w: sw, h: 1.12, rot: -8 + o.rotation * 0.2, photos: list, film: true });
      }
      return { frames: [], strips };
    }
  },
  {
    id: 'diagonal', name: { en: 'Diagonal', pt: 'Diagonal' }, filter: 'lu-sunset',
    generate: (photos, c, o) => {
      const n = photos.length, ar = c.w / c.h;
      const bandH = 1.18 / n;
      const g = o.gutter / 1080;
      const frames: Frame[] = photos.map((_, i) => ({ photo: i, x: 0.5, y: -0.09 + (i + 0.5) * bandH, w: 1.5, h: Math.max(0.02, bandH - g * ar), rot: -12, shape: 'band' as FrameShape, z: i }));
      return { frames };
    }
  },
  {
    id: 'shapes', name: { en: 'Circles and shapes', pt: 'Círculos e formas' }, filter: 'lu-pop',
    generate: (photos, c, o) => {
      const n = photos.length, ar = c.w / c.h, S = safe(c);
      const order = byQuality(photos);
      const shapes: FrameShape[] = ['circle', 'heart', 'circle', 'star'];
      const frames: Frame[] = [];
      // Phyllotaxis spiral: the best photo in the middle, the others around it, smaller outward.
      const cy = (S.top + S.bottom) / 2;
      order.forEach((pi, k) => {
        const a = k * 2.39996, d = Math.sqrt(k / n);
        const size = Math.max(0.12, (0.5 - d * 0.3) * (0.7 + o.density * 0.5) / Math.sqrt(Math.max(1, n / 6)));
        frames.push({ photo: pi, x: 0.5 + Math.cos(a) * d * 0.4, y: cy + Math.sin(a) * d * 0.36 * (S.bottom - S.top) * 1.4, w: size, h: size * ar, rot: 0, shape: k === 0 ? 'circle' : shapes[k % shapes.length], z: n - k });
      });
      return { frames };
    }
  },
  {
    id: 'scrapbook', name: { en: 'Scrapbook', pt: 'Scrapbook' }, filter: 'lu-retro', defaults: { border: 12, shadow: true, rotation: 10 },
    generate: (photos, c, o, seed) => {
      const frames = scatter(photos, c, o, seed, 'print', 0.92);
      const r = rng(seed + 9);
      const arts: StickerArt[] = ['butterfly', 'plushStar', 'flower', 'smileStar', 'clover', 'glitterHeart', 'cherries', 'bow'];
      const decor: Layer[] = [];
      frames.forEach((f, i) => {
        if (i % 2 === 0) decor.push({ id: `tape${i}`, kind: 'shape', shape: 'rect', x: f.x + (r() - 0.5) * f.w * 0.4, y: f.y - f.h / 2, w: f.w * 0.36, h: 0.26, rot: f.rot + (r() - 0.5) * 30, fill: { color: ['#F7B8D2CC', '#BFE3F5CC', '#F2E26ACC'][i % 3] } } as Layer);
      });
      const count = Math.min(10, 3 + Math.round(photos.length / 2));
      for (let i = 0; i < count; i++) {
        const art = arts[i % arts.length];
        const [c1, c2] = STICKER_DEFAULTS[art];
        decor.push({ id: `st${i}`, kind: 'sticker', art, x: 0.06 + r() * 0.88, y: 0.06 + r() * 0.88, w: 0.1 + r() * 0.06, rot: (r() - 0.5) * 40, paint: { color: c1 }, paint2: { color: c2 }, seed: i } as Layer);
      }
      decor.push({ id: 'doodle1', kind: 'shape', shape: 'swirl', x: 0.12, y: 0.9, w: 0.12, rot: 0, fill: null, stroke: { slot: 'doodleStroke' }, strokeWidth: 6, texture: 'crayon' } as Layer);
      decor.push({ id: 'label', kind: 'text', x: 0.5, y: 0.07, w: 0.6, rot: -3, text: 'memories', font: 'script', paint: { slot: 'text' }, size: 0.07 } as Layer);
      return { frames, decor };
    }
  },
  {
    id: 'focus', name: { en: 'Frame focus', pt: 'Foco central' }, filter: 'lu-haze',
    generate: (photos, c, o) => {
      const n = photos.length, ar = c.w / c.h, S = safe(c), g = o.gutter / 1080;
      const order = byQuality(photos);
      const hero = order[0], rest = order.slice(1);
      const frames: Frame[] = [];
      const heroW = rest.length > 12 ? 0.8 : 0.9;
      const heroH = Math.min((S.bottom - S.top) * 0.62, (heroW / Math.max(0.7, photos[hero].aspect)) * ar);
      const cy = (S.top + S.bottom) / 2;
      frames.push({ photo: hero, x: 0.5, y: cy, w: heroW, h: heroH, rot: 0, shape: 'rect', z: 2 });
      // Thumbnails around the hero: rows above and below, then columns on the sides.
      const top = rest.slice(0, Math.ceil(rest.length / 2)), bottom = rest.slice(Math.ceil(rest.length / 2));
      const row = (list: number[], y: number, hMax: number) => {
        // Balanced rows: 7 thumbnails become 4 + 3, never 5 + 2.
        const rowsN = Math.ceil(list.length / 5);
        const perRow = Math.ceil(list.length / rowsN);
        const tw = (0.92 - g * (perRow - 1)) / perRow;
        const th = Math.min(hMax / rowsN - g * ar, tw * ar);
        list.forEach((pi, k) => {
          const cI = k % perRow, rI = Math.floor(k / perRow);
          const inRow = rI === rowsN - 1 ? list.length - rI * perRow : perRow;
          const w2 = (0.92 - g * (inRow - 1)) / inRow;
          frames.push({ photo: pi, x: 0.04 + cI * (w2 + g) + w2 / 2, y: y + (rI + 0.5) * (th + g * ar) * (y < cy ? 1 : 1), w: w2, h: th, rot: 0, shape: 'rect', z: 1 });
        });
      };
      const space = cy - heroH / 2 - 0.02;
      if (top.length) row(top, cy - heroH / 2 - space + 0.01, space - 0.02);
      if (bottom.length) row(bottom, cy + heroH / 2 + 0.02, space - 0.02);
      void n;
      return { frames };
    }
  }
];

export const styleById = (id: string) => STORY_STYLES.find((s) => s.id === id) || STORY_STYLES[0];

// ---------------------------------------------------------------- frames to layers

const S = (slot: string): Paint => ({ slot });

/**
 * Collage layers for a generated layout. Locked photo layers of the previous layout keep
 * their place (the generator result for that photo is ignored), everything else is new.
 */
export function buildStoryLayers(layout: StoryLayout, c: StoryCanvas, o: StoryOptions, locked: Layer[] = []): Layer[] {
  const ar = c.w / c.h;
  const lockedPhotos = new Set(locked.filter((l) => l.kind === 'photo').map((l) => (l as { photo: number }).photo));
  const layers: Layer[] = [];
  const sorted = [...layout.frames].sort((a, b) => a.z - b.z);
  sorted.forEach((f, i) => {
    if (lockedPhotos.has(f.photo)) return;
    const aspect = f.w / (f.h / ar);
    const base = { id: `sp${f.photo}`, kind: 'photo', photo: f.photo, x: f.x, y: f.y, w: f.w, rot: f.rot, aspect, treatment: { type: 'none' }, cutout: 'none', frame: 'none', shadow: o.shadow, radius: o.radius } as Record<string, unknown>;
    switch (f.shape) {
      case 'print': Object.assign(base, { frame: o.border > 0 ? 'white' : 'none', frameMargin: o.border / 1080 / Math.max(0.05, f.w), framePaint: S('frame') }); break;
      case 'polaroid': Object.assign(base, { frame: 'polaroid', framePaint: S('frame') }); break;
      case 'circle': Object.assign(base, { cutout: 'window', windowShape: 'oval', aspect: 1, stroke: o.border > 0 ? S('frame') : undefined, strokeWidth: o.border }); break;
      case 'heart': Object.assign(base, { cutout: 'window', windowShape: 'heart', aspect: 1 }); break;
      case 'star': Object.assign(base, { cutout: 'window', windowShape: 'star', aspect: 1 }); break;
      default: Object.assign(base, { frame: o.border > 0 ? 'white' : 'none', frameMargin: o.border / 1080 / Math.max(0.05, f.w), framePaint: S('frame') });
    }
    void i;
    layers.push(base as unknown as Layer);
  });
  (layout.strips || []).forEach((st, i) => {
    layers.push({
      id: `strip${i}`, kind: 'layout', mode: st.film ? 'film' : 'strips', x: st.x, y: st.y, w: st.w, h: st.h, rot: st.rot,
      rows: st.photos.length, cols: 1, gutter: st.film ? 10 : Math.max(6, o.gutter), border: st.film ? 6 : Math.max(8, o.border), paint: st.film ? { color: '#141414' } : S('frame'),
      treatment: { type: 'none' }, cells: st.photos.map((p) => ({ photo: p })), shadow: true, radius: o.radius / 2, edgeText: st.film ? 'STORY 400' : undefined
    } as Layer);
  });
  return [...layers, ...locked, ...(layout.decor || [])];
}
