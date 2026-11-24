/**
 * Built in collage templates 57 to 110. Same data format as templates.ts and
 * templates-set2.ts: colors come from named slots, tools are regular layers.
 */
import type { Anchor, CollageTemplate, Layer, Localized, Paint, StickerArt, Treatment } from './types';
import { rng } from './textures';
import { STICKER_DEFAULTS } from './stickers';

const S = (slot: string): Paint => ({ slot });
const C = (color: string): Paint => ({ color });

const bg = (o: Record<string, unknown>): Layer => ({ id: 'bg', kind: 'background', x: 0.5, y: 0.5, w: 1, rot: 0, locked: true, style: 'solid', paint: S('background'), texture: 'none', ...o } as Layer);
const photo = (o: Record<string, unknown>): Layer => ({ id: 'photo', kind: 'photo', photo: 0, x: 0.5, y: 0.5, w: 0.5, rot: 0, treatment: { type: 'none' }, frame: 'none', cutout: 'none', ...o } as Layer);
const shape = (o: Record<string, unknown>): Layer => ({ kind: 'shape', rot: 0, ...o } as Layer);
const text = (o: Record<string, unknown>): Layer => ({ kind: 'text', rot: 0, w: 0.4, font: 'marker', paint: S('text'), size: 0.05, ...o } as Layer);
const sticker = (art: StickerArt, o: Record<string, unknown>): Layer => {
  const [c1, c2] = STICKER_DEFAULTS[art];
  return { kind: 'sticker', art, rot: 0, w: 0.15, paint: C(c1), paint2: C(c2), ...o } as Layer;
};
const layout = (o: Record<string, unknown>): Layer => ({ id: 'layout', kind: 'layout', mode: 'strips', x: 0.5, y: 0.5, w: 1, h: 1, rot: 0, rows: 3, cols: 1, gutter: 12, border: 12, paint: S('frame'), treatment: { type: 'none' }, cells: [{ photo: 0 }, { photo: 1 }, { photo: 2 }], ...o } as Layer);
const many = (prefix: string, pts: number[][], o: Record<string, unknown>) =>
  pts.map(([x, y, w, rot], i) => shape({ id: `${prefix}${i}`, x, y, w, rot: rot ?? (i * 23) % 60 - 30, seed: i + 1, ...o }));
const scatter = (prefix: string, n: number, seed: number, box: [number, number, number, number], size: [number, number], o: Record<string, unknown>) => {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => shape({ id: `${prefix}${i}`, x: box[0] + r() * (box[2] - box[0]), y: box[1] + r() * (box[3] - box[1]), w: size[0] + r() * (size[1] - size[0]), rot: (r() - 0.5) * 60, seed: seed * 9 + i, ...o }));
};
const grade = (tint: string, amount: number, o: Record<string, unknown> = {}): Treatment => ({ type: 'grade', tint: S(tint), amount, contrast: 1.15, fade: 0.08, grain: 0.3, ...o } as Treatment);
const BW = (contrast = 1.2, grain = 0.3): Treatment => ({ type: 'bw', contrast, grain });
const SEPIA: Treatment = { type: 'sepia', amount: 0.75, fade: 0.2, grain: 0.3 };
const cells = (n: number, offset = 0) => Array.from({ length: n }, (_, i) => ({ photo: (i + offset) % 5 }));

export function buildTemplatesSet3(lang: string): CollageTemplate[] {
  const tr = (s: Localized) => s[lang] ?? s.en;
  const date = "'26 11 24";
  return [
    // 57
    {
      id: 'party-grunge-wall', name: { en: 'Party Grunge Wall', pt: 'Mural Grunge da Festa' }, ratio: '9:16', tags: ['scrapbook', 'booth'], photos: 5,
      palette: 'crayon-pop', colors: { background: '#0A0A0A', accent: '#3AC8E0', frame: '#F02A3A', starPrimary: '#F03A6A', doodleFill: '#F2C21A', tint: '#F2A040' },
      slots: ['accent', 'frame', 'starPrimary', 'doodleFill', 'tint'],
      layers: [
        bg({}),
        { id: 'g1', kind: 'grunge', x: 0.75, y: 0.12, w: 0.5, h: 0.2, rot: 3, paint: S('starPrimary'), paint2: C('#111111'), seed: 1 } as Layer,
        { id: 'g2', kind: 'grunge', x: 0.25, y: 0.55, w: 0.45, h: 0.18, rot: -4, paint: S('doodleFill'), paint2: C('#111111'), seed: 2 } as Layer,
        { id: 'g3', kind: 'grunge', x: 0.8, y: 0.85, w: 0.4, h: 0.16, rot: 2, paint: S('accent'), paint2: C('#111111'), seed: 3 } as Layer,
        { id: 'barcode', kind: 'slices', mode: 'barcode', photo: 0, x: 0.28, y: 0.15, w: 0.5, h: 0.24, rot: -3, count: 9, gap: 8, paint: S('doodleFill'), paint2: C('#F28A1A'), shift: 0.4, treatment: grade('tint', 0.35), seed: 4 } as Layer,
        photo({ id: 'p2', photo: 1, x: 0.7, y: 0.34, w: 0.46, aspect: 0.8, treatment: grade('tint', 0.35), shadow: true }),
        shape({ id: 'burst', shape: 'burst', x: 0.7, y: 0.34, w: 0.62, points: 18, fill: null, stroke: S('accent'), strokeWidth: 7, wobble: 0.4 }),
        { id: 'play', kind: 'ui', widget: 'playback', photo: 2, x: 0.33, y: 0.4, w: 0.5, h: 0.2, rot: 2, paint: S('frame'), title: date } as Layer,
        photo({ id: 'p4', photo: 3, x: 0.68, y: 0.62, w: 0.48, aspect: 1, treatment: grade('tint', 0.35), stroke: S('starPrimary'), strokeWidth: 5 }),
        shape({ id: 'hl', shape: 'oval', x: 0.68, y: 0.58, w: 0.22, h: 0.9, fill: null, stroke: S('accent'), strokeWidth: 6, texture: 'marker' }),
        photo({ id: 'p5', photo: 4, x: 0.3, y: 0.8, w: 0.5, aspect: 1.2, treatment: grade('tint', 0.35) }),
        photo({ id: 'p6', photo: 0, x: 0.75, y: 0.93, w: 0.3, aspect: 1.3, anchor: 'face', zoom: 1.5, treatment: grade('tint', 0.35) }),
        shape({ id: 'pstar', shape: 'star5', x: 0.12, y: 0.68, w: 0.22, rot: -12, fill: S('starPrimary'), texture: 'spray', wobble: 0.3 }),
        text({ id: 'd1', x: 0.38, y: 0.88, text: date, font: 'pixel', paint: C('#FFB15C'), size: 0.035 })
      ]
    },
    // 58
    {
      id: 'crayon-faces', name: { en: 'Crayon Faces', pt: 'Rostos de Giz' }, ratio: '3:4', tags: ['doodle', 'duo'], photos: 1,
      palette: 'crayon-pop', colors: { c1: '#F02AE0', c2: '#2AA0F0', c3: '#F27A1A', c4: '#4AF02A', c5: '#F2D21A', doodleStroke: '#E0281E' },
      slots: ['c1', 'c2', 'c3', 'c4', 'c5', 'doodleStroke'],
      layers: [
        bg({ paint: C('#111111') }),
        photo({ w: 1, aspect: 0.75, treatment: BW(1.2, 0.25) }),
        { id: 'faces', kind: 'facedoodle', of: 'photo', x: 0.5, y: 0.5, w: 1, rot: 0, items: ['glasses', 'mustache', 'mask', 'blush', 'bow', 'horns'], paints: [S('c1'), S('c2'), S('c3'), S('c4'), S('c5')], width: 9 } as Layer,
        ...scatter('sp', 6, 58, [0.05, 0.05, 0.95, 0.35], [0.06, 0.1], { shape: 'burst', points: 8, fill: null, stroke: S('c5'), strokeWidth: 6, texture: 'crayon' }),
        ...scatter('bub', 6, 59, [0.05, 0.2, 0.95, 0.6], [0.03, 0.05], { shape: 'circle', fill: null, stroke: S('c2'), strokeWidth: 5, texture: 'crayon' }),
        ...scatter('ht', 4, 60, [0.05, 0.1, 0.95, 0.5], [0.05, 0.07], { shape: 'heart', fill: S('doodleStroke'), texture: 'crayon' }),
        shape({ id: 'flames', shape: 'spiky', x: 0.5, y: 0.93, w: 1.05, h: 0.22, points: 14, fill: S('c4'), texture: 'crayon', seed: 58 })
      ]
    },
    // 59
    {
      id: 'double-burst-spray', name: { en: 'Double Burst Spray', pt: 'Explosão Dupla em Spray' }, ratio: '2:3', tags: ['comic', 'duo'], photos: 1,
      palette: 'cobalt-duotone', colors: { doodleStroke: '#2A50E0', doodleFill: '#C8F05A' }, slots: ['doodleStroke', 'doodleFill'],
      layers: [
        bg({ paint: C('#111111') }),
        photo({ w: 1, aspect: 2 / 3 }),
        shape({ id: 'b1', shape: 'burst', x: 0.45, y: 0.32, w: 0.85, points: 20, fill: null, stroke: S('doodleStroke'), strokeWidth: 16, texture: 'spray', wobble: 0.5, behind: 'photo', seed: 1 }),
        shape({ id: 'b2', shape: 'burst', x: 0.56, y: 0.36, w: 0.75, points: 18, fill: null, stroke: S('doodleFill'), strokeWidth: 14, texture: 'spray', wobble: 0.5, behind: 'photo', seed: 2 }),
        shape({ id: 'b3', shape: 'burst', x: 0.47, y: 0.85, w: 0.32, points: 14, fill: null, stroke: S('doodleStroke'), strokeWidth: 10, texture: 'spray', behind: 'photo', seed: 3 }),
        shape({ id: 'b4', shape: 'burst', x: 0.53, y: 0.87, w: 0.26, points: 12, fill: null, stroke: S('doodleFill'), strokeWidth: 9, texture: 'spray', behind: 'photo', seed: 4 })
      ]
    },
    // 60
    {
      id: 'red-travel-diary', name: { en: 'Red Travel Diary', pt: 'Diário de Viagem Vermelho' }, ratio: '9:16', tags: ['scrapbook', 'stars'], photos: 5,
      palette: 'cherry-red', colors: { background: '#D00A0A', starPrimary: '#F8F00A', starSecondary: '#1E2A5A', doodleStroke: '#2A6AE0', accent: '#F28A1A', tint: '#F2A040', text: '#FFFFFF' },
      slots: ['background', 'starPrimary', 'starSecondary', 'doodleStroke', 'accent', 'text'],
      layers: [
        bg({ texture: 'paper' }),
        ...Array.from({ length: 9 }, (_, i) => photo({ id: `p${i}`, photo: i % 5, x: 0.3 + (i % 2) * 0.4 + (i % 3 - 1) * 0.03, y: 0.08 + i * 0.105, w: 0.46, aspect: 1.25, rot: (i % 2 ? 5 : -5), frame: 'white', frameMargin: 0.03, framePaint: C('#FFFFFF'), shadow: true, treatment: grade('tint', 0.3, { saturation: 1.3 }) })),
        ...many('ys', [[0.9, 0.2, 0.07], [0.08, 0.45, 0.06], [0.92, 0.7, 0.06]], { shape: 'star5', fill: S('starPrimary') }),
        ...many('ps', [[0.1, 0.12, 0.08], [0.88, 0.5, 0.07]], { shape: 'paperStar', fill: C('#FFFFFF'), stroke: S('starSecondary'), strokeWidth: 4, texture: 'paper', wobble: 0.5 }),
        shape({ id: 'cs', shape: 'star5', x: 0.1, y: 0.82, w: 0.09, fill: null, stroke: S('doodleStroke'), strokeWidth: 7, texture: 'crayon' }),
        shape({ id: 'os', shape: 'star5', x: 0.9, y: 0.92, w: 0.07, fill: S('accent'), texture: 'crayon' }),
        ...Array.from({ length: 8 }, (_, i) => shape({ id: `rain${i}`, shape: 'rect', x: 0.6 + i * 0.03, y: 0.3 + (i % 3) * 0.02, w: 0.006, h: 12, fill: S('starPrimary') })),
        text({ id: 'note', x: 0.5, y: 0.965, text: tr({ en: "i'm on my way", pt: 'tô a caminho' }), font: 'script', paint: S('text'), size: 0.05, rot: -3 }),
        ...many('wv', [[0.15, 0.3, 0.15], [0.85, 0.08, 0.12]], { shape: 'squiggle', fill: null, stroke: S('text'), strokeWidth: 5 })
      ]
    },
    // 61
    {
      id: 'torn-portrait-grid', name: { en: 'Torn Portrait Grid', pt: 'Grade de Retratos Rasgados' }, ratio: '1:1', tags: ['paper', 'booth'], photos: 5,
      palette: 'cherry-red', colors: { background: '#E8281E', paper: '#FFFFFF' }, slots: ['background', 'paper'],
      layers: [
        bg({ texture: 'paper' }),
        ...Array.from({ length: 6 }, (_, i) => ({ id: `t${i}`, kind: 'slices', mode: 'torn', photo: i % 5, anchor: 'face', zoom: 1.3, x: 0.19 + (i % 3) * 0.31, y: 0.27 + Math.floor(i / 3) * 0.46, w: 0.27, h: 0.4, rot: (i % 2 ? 2 : -2), count: 4, gap: 0, paint: S('paper'), shift: 0.6, treatment: { type: 'none' }, seed: i + 1 } as Layer))
      ]
    },
    // 62
    {
      id: 'camera-night-blue', name: { en: 'Camera Night Blue', pt: 'Câmera Noite Azul' }, ratio: '4:3', tags: ['booth'], photos: 1,
      palette: 'cobalt-duotone', colors: { tint: '#3A3AE0', text: '#FFB15C' }, slots: ['tint', 'text'],
      layers: [
        bg({ paint: C('#0A0A1A') }),
        photo({ w: 1, aspect: 4 / 3, treatment: grade('tint', 0.7, { contrast: 1.1, saturation: 0.8 }), glow: C('#6A6AF0') }),
        photo({ id: 'eye1', x: 0.3, y: 0.3, w: 0.3, aspect: 1.6, anchor: 'eyes', zoom: 3.5, stroke: C('#FFFFFF'), strokeWidth: 3 }),
        photo({ id: 'eye2', x: 0.4, y: 0.4, w: 0.28, aspect: 1.6, anchor: 'eyes', zoom: 4.5, stroke: C('#FFFFFF'), strokeWidth: 3 }),
        sticker('camera', { id: 'cam', x: 0.85, y: 0.7, w: 0.22, rot: -12 }),
        text({ id: 'date', x: 0.84, y: 0.93, text: `${date}  23:41`, font: 'pixel', paint: S('text'), size: 0.04 })
      ]
    },
    // 63
    {
      id: 'prism-eyes', name: { en: 'Prism Eyes', pt: 'Olhos de Prisma' }, ratio: '4:3', tags: ['booth'], photos: 1,
      palette: 'pastel-holo', colors: { c1: '#9A3AF0', c2: '#F28A1A', c3: '#3AF07A' }, slots: ['c1', 'c2', 'c3'],
      layers: [
        bg({ paint: C('#111111') }),
        photo({ w: 1, aspect: 4 / 3, treatment: { type: 'flash', contrast: 1.2, grain: 0.25 } }),
        ...([['eyes', 0.25, 0.25], ['mouth', 0.7, 0.35], ['eyes', 0.55, 0.62], ['mouth', 0.3, 0.78], ['eyes', 0.78, 0.82]] as const).map(([a, x, y], i) =>
          photo({ id: `w${i}`, x, y, w: 0.4, aspect: 2.6, anchor: a, zoom: 3 + i * 0.3, opacity: 0.8, stroke: C('#FFFFFF'), strokeWidth: 2 })),
        { id: 'leak', kind: 'leak', x: 0.5, y: 0.5, w: 1, rot: 0, paints: [S('c1'), S('c2'), S('c3')], strength: 0.8, seed: 63, locked: true } as Layer
      ]
    },
    // 64
    {
      id: 'punk-zine', name: { en: 'Punk Zine', pt: 'Zine Punk' }, ratio: '9:16', tags: ['scrapbook', 'comic'], photos: 3,
      palette: 'crayon-pop', colors: { doodleFill: '#E0206A', accent: '#F28CC0', text: '#FFFFFF', tint: '#3A5AE0' }, slots: ['doodleFill', 'accent', 'tint', 'text'],
      layers: [
        bg({ paint: C('#050505') }),
        shape({ id: 'burst', shape: 'burst', x: 0.5, y: 0.3, w: 0.95, points: 26, fill: S('doodleFill'), texture: 'spray', strokeWidth: 20, stroke: S('doodleFill') }),
        photo({ y: 0.42, w: 0.95, cutout: 'clean', treatment: grade('tint', 0.2, { saturation: 1.4 }) }),
        photo({ id: 'p2', photo: 1, x: 0.25, y: 0.82, w: 0.38, aspect: 0.9, frame: 'rough', framePaint: C('#FFFFFF'), rot: -6 }),
        photo({ id: 'p3', photo: 2, x: 0.75, y: 0.8, w: 0.36, aspect: 1, frame: 'rough', framePaint: C('#FFFFFF'), rot: 5 }),
        text({ id: 'l1', x: 0.25, y: 0.06, text: tr({ en: 'NO RULES', pt: 'SEM REGRAS' }), font: 'display', paint: C('#111111'), bg: S('accent'), size: 0.045, rot: -4 }),
        text({ id: 'l2', x: 0.75, y: 0.66, text: tr({ en: 'LOUD', pt: 'ALTO' }), font: 'display', paint: C('#111111'), bg: S('accent'), size: 0.045, rot: 6 }),
        sticker('safetyPin', { id: 'pin1', x: 0.18, y: 0.7, w: 0.14, rot: -20 }), sticker('safetyPin', { id: 'pin2', x: 0.85, y: 0.68, w: 0.12, rot: 25 }),
        ...many('x', [[0.1, 0.25, 0.05], [0.9, 0.3, 0.05], [0.5, 0.94, 0.04]], { shape: 'cross', fill: null, stroke: S('text'), strokeWidth: 5 }),
        text({ id: 'hand', x: 0.5, y: 0.97, text: tr({ en: 'stay weird', pt: 'seja estranho' }), font: 'script', paint: S('text'), size: 0.04 })
      ]
    },
    // 65
    {
      id: 'final-girl-glitter', name: { en: 'Final Girl Glitter', pt: 'Glitter Final' }, ratio: '4:3', tags: ['stars'], photos: 1,
      palette: 'pastel-holo', colors: { doodleStroke: '#F2E21A', doodleFill: '#F02A3A', starPrimary: '#F28CC0', starSecondary: '#7AB8F0', text: '#F28CC0', tint: '#3A6AE0' },
      slots: ['doodleStroke', 'doodleFill', 'starPrimary', 'starSecondary', 'text'],
      layers: [
        bg({ paint: C('#0A0A2A') }),
        photo({ w: 1, aspect: 4 / 3, rgbSplit: 10, treatment: grade('tint', 0.5, { contrast: 1.3, fade: 0.2 }) }),
        shape({ id: 'o1', shape: 'burst', x: 0.5, y: 0.4, w: 0.48, points: 16, fill: null, stroke: S('doodleFill'), strokeWidth: 8, texture: 'spray', wobble: 0.4 }),
        shape({ id: 'o2', shape: 'burst', x: 0.5, y: 0.4, w: 0.42, points: 16, fill: null, stroke: S('doodleStroke'), strokeWidth: 5, texture: 'spray', wobble: 0.4, seed: 2 }),
        sticker('sparkleStar', { id: 'eye', x: 0.46, y: 0.36, w: 0.08 }),
        sticker('glitterHeart', { id: 'h1', x: 0.12, y: 0.75, w: 0.12, paint: S('starPrimary') }), sticker('glitterHeart', { id: 'h2', x: 0.88, y: 0.2, w: 0.1, paint: S('starSecondary') }),
        sticker('chromeSwirl', { id: 'sw1', x: 0.88, y: 0.78, w: 0.14 }), sticker('chromeSwirl', { id: 'sw2', x: 0.12, y: 0.18, w: 0.12, flip: true }),
        text({ id: 'title', x: 0.5, y: 0.08, text: '#finalgirl', font: 'display', paint: S('text'), size: 0.045 })
      ]
    },
    // 66
    {
      id: 'magazine-cutout-pop', name: { en: 'Magazine Cutout Pop', pt: 'Recorte de Revista Pop' }, ratio: '4:5', tags: ['scrapbook', 'paper'], photos: 1,
      palette: 'burnt-orange', colors: { doodleFill: '#F2A02A', starPrimary: '#F2D21A', accent: '#C83A2A' }, slots: ['doodleFill', 'starPrimary', 'accent'],
      layers: [
        bg({ paint: C('#F2ECE0'), texture: 'newsprint' }),
        { id: 'shape1', kind: 'torn', x: 0.25, y: 0.3, w: 0.5, h: 0.4, rot: -8, paint: S('doodleFill'), points: 6, print: 0, seed: 66 } as Layer,
        { id: 'brick', kind: 'grunge', x: 0.8, y: 0.8, w: 0.35, h: 0.25, rot: 4, paint: S('accent'), paint2: C('#7A1A10'), seed: 6 } as Layer,
        { id: 'sliced', kind: 'slices', mode: 'torn', photo: 0, x: 0.52, y: 0.5, w: 0.7, h: 0.75, rot: 0, count: 6, gap: 0, paint: C('#FFFFFF'), shift: 0.15, treatment: { type: 'grade', tint: C('#F2A040'), amount: 0.2, contrast: 1.2, fade: 0, grain: 0.35, saturation: 1.4 }, seed: 66 } as Layer,
        photo({ id: 'small', x: 0.12, y: 0.75, w: 0.24, cutout: 'sticker', outline: C('#FFFFFF'), outlineWidth: 8 }),
        ...many('gs', [[0.42, 0.36, 0.06], [0.56, 0.36, 0.06]], { shape: 'star5', fill: S('starPrimary') }),
        ...many('brk', [[0.3, 0.7, 0.05], [0.7, 0.68, 0.05]], { shape: 'rect', h: 0.6, fill: S('accent'), material: 'puffy' }),
        sticker('receipt', { id: 'barcode', x: 0.88, y: 0.15, w: 0.1, rot: 8 })
      ]
    },
    // 67
    {
      id: 'teal-camera-star', name: { en: 'Teal Camera Star', pt: 'Estrela Câmera Azul-Petróleo' }, ratio: '4:5', tags: ['stars', 'halftone'], photos: 2,
      palette: 'mustard-teal', colors: { tint: '#1AC8C8', outline: '#1AC8C8', frame: '#1A8A8A', doodleStroke: '#111111' }, slots: ['tint', 'outline', 'frame'],
      layers: [
        bg({ paint: S('frame') }),
        photo({ x: 0.55, w: 0.9, aspect: 0.72, scanlines: 0.35, treatment: grade('tint', 0.6, { contrast: 1.2 }) }),
        photo({ id: 'lips', x: 0.25, y: 0.75, w: 0.3, aspect: 1, anchor: 'mouth', zoom: 4, cutout: 'window', windowShape: 'star', stroke: S('outline'), strokeWidth: 6 }),
        { id: 'ptr', kind: 'ui', widget: 'pointer', x: 0.38, y: 0.86, w: 0.07, rot: 0 } as Layer,
        { id: 'cam', kind: 'ui', widget: 'compact', photo: 1, x: 0.78, y: 0.2, w: 0.36, h: 0.17, rot: 8, paint: S('outline'), treatment: { type: 'none' } } as Layer,
        ...many('hs', [[0.1, 0.15, 0.08], [0.92, 0.55, 0.06], [0.15, 0.45, 0.05]], { shape: 'star5', fill: S('doodleStroke'), texture: 'halftone' }),
        ...many('sp', [[0.6, 0.1, 0.05], [0.85, 0.9, 0.05]], { shape: 'star4', fill: S('doodleStroke') })
      ]
    },
    // 68
    {
      id: 'contact-sheet', name: { en: 'Contact Sheet', pt: 'Folha de Contato' }, ratio: '2:3', tags: ['booth', 'paper'], photos: 5,
      palette: 'mono-paper', colors: { frame: '#111111', text: '#F2A040', tint: '#F2C080' }, slots: ['frame', 'text'],
      layers: [
        bg({ paint: S('frame') }),
        ...[0, 1, 2].map((i) => layout({ id: `row${i}`, mode: 'grid', rows: 1, cols: 3, x: 0.5, y: 0.2 + i * 0.3, w: 1.05, h: 0.26, rot: i === 1 ? -5 : 0, gutter: 14, border: 14, paint: S('frame'), textPaint: S('text'), edgeText: 'SAFETY FILM 400', treatment: grade('tint', 0.3, { fade: 0.25 }), cells: cells(3, i * 3) }))
      ]
    },
    // 69
    {
      id: 'night-mono-mix', name: { en: 'Night Mono Mix', pt: 'Mix Noturno Mono' }, ratio: '9:16', tags: ['booth'], photos: 4,
      palette: 'mono-paper', colors: { frame: '#000000', tint: '#F2A040' }, slots: ['frame'],
      layers: [
        bg({ paint: S('frame') }),
        photo({ id: 'mono', x: 0.3, y: 0.5, w: 0.98, aspect: 1.75, rot: 90, treatment: BW(1.3, 0.5) }),
        layout({ x: 0.8, w: 0.38, h: 1, rows: 3, gutter: 14, border: 10, paint: S('frame'), treatment: grade('tint', 0.35, { contrast: 1.25 }), cells: [{ photo: 1 }, { photo: 2 }, { photo: 3 }] })
      ]
    },
    // 70
    {
      id: 'rough-white-frames', name: { en: 'Rough White Frames', pt: 'Molduras Brancas Rústicas' }, ratio: '3:4', tags: ['booth', 'paper'], photos: 5,
      palette: 'mono-paper', colors: { frame: '#FFFFFF', tint: '#C87A3A' }, slots: ['frame'],
      layers: [
        bg({ paint: C('#1A1410') }),
        ...Array.from({ length: 6 }, (_, i) => photo({ id: `p${i}`, photo: i % 5, x: 0.27 + (i % 2) * 0.46, y: 0.18 + Math.floor(i / 2) * 0.32, w: 0.4, aspect: 1.1, rot: (i % 2 ? 3 : -3), frame: 'rough', framePaint: S('frame'), treatment: grade('tint', 0.4, { contrast: 1.3, grain: 0.55 }) }))
      ]
    },
    // 71
    {
      id: 'film-negative-strips', name: { en: 'Film Negative Strips', pt: 'Tiras de Negativo' }, ratio: '9:16', tags: ['booth'], photos: 5,
      palette: 'mono-paper', colors: { frame: '#141414', text: '#F2A040', background: '#E8E2D6', tint: '#F2C080' }, slots: ['frame', 'text', 'background'],
      layers: [
        bg({ texture: 'paper' }),
        layout({ id: 's1', mode: 'film', x: 0.28, w: 0.42, h: 0.96, rows: 4, rot: -2, cellRot: 90, paint: S('frame'), textPaint: S('text'), edgeText: 'NEG 200 ▸ 24', treatment: grade('tint', 0.3, { fade: 0.2 }), cells: cells(4), shadow: true }),
        layout({ id: 's2', mode: 'film', x: 0.72, w: 0.42, h: 0.96, rows: 4, rot: 2, cellRot: 90, paint: S('frame'), textPaint: S('text'), edgeText: 'NEG 200 ▸ 25', treatment: grade('tint', 0.3, { fade: 0.2 }), cells: cells(4, 1), shadow: true })
      ]
    },
    // 72
    {
      id: 'cream-album', name: { en: 'Cream Album', pt: 'Álbum Creme' }, ratio: '9:16', tags: ['paper', 'booth'], photos: 3,
      palette: 'mono-paper', colors: { background: '#FBF0D8', tint: '#7AA0C0', starPrimary: '#F2D21A' }, slots: ['background', 'starPrimary'],
      layers: [
        bg({ texture: 'paper' }),
        ...[0, 1, 2].map((i) => photo({ id: `p${i}`, photo: i, x: 0.38, y: 0.2 + i * 0.3, w: 0.56, aspect: 1.25, shadow: true, treatment: grade('tint', 0.35, { fade: 0.25 }) })),
        shape({ id: 'sp', shape: 'sparkle', x: 0.62, y: 0.47, w: 0.07, fill: S('starPrimary') })
      ]
    },
    // 73
    {
      id: 'blur-base-stack', name: { en: 'Blur Base Stack', pt: 'Pilha com Fundo Desfocado' }, ratio: '9:16', tags: ['booth'], photos: 3,
      palette: 'mono-paper', colors: { tint: '#F2A040' }, slots: ['tint'],
      layers: [
        bg({ style: 'photo', blur: 24, treatment: grade('tint', 0.3) }),
        ...[0, 1, 2].map((i) => photo({ id: `p${i}`, photo: i, x: 0.44 + i * 0.06, y: 0.22 + i * 0.28, w: 0.72, aspect: 1.3, rot: (i - 1) * 3, shadow: true, treatment: grade('tint', 0.35, { contrast: 1.25 }) }))
      ]
    },
    // 74
    {
      id: 'puffy-star-booth', name: { en: 'Puffy Star Booth', pt: 'Cabine de Estrelas Fofas' }, ratio: '9:16', tags: ['stars', 'booth'], photos: 3,
      palette: 'pastel-holo', colors: { tint: '#7AA0D0', c1: '#9A3AF0', c2: '#F28A1A', c3: '#3AA0F0' }, slots: ['tint', 'c1', 'c2', 'c3'],
      layers: [
        bg({ style: 'photo', blur: 20, treatment: grade('tint', 0.4, { contrast: 0.9, fade: 0 }) }),
        { id: 'leak', kind: 'leak', x: 0.5, y: 0.5, w: 1, rot: 0, paints: [S('c1'), S('c2'), S('c3')], strength: 0.7, seed: 74 } as Layer,
        layout({ x: 0.5, w: 0.62, h: 0.82, gutter: 14, border: 14, paint: C('#FFFFFF'), shadow: true, treatment: grade('tint', 0.35) }),
        ...(['buttonStar', 'clipStar', 'balloonStar', 'embroideredStar', 'quiltedStar', 'sequinStar', 'buttonStar', 'clipStar', 'balloonStar', 'quiltedStar'] as StickerArt[]).map((art, i) =>
          sticker(art, { id: `st${i}`, x: i % 2 ? 0.88 : 0.12, y: 0.08 + i * 0.09, w: 0.12 + (i % 3) * 0.02, rot: (i * 21) % 50 - 25, seed: i })),
        sticker('badge', { id: 'badge', x: 0.8, y: 0.93, w: 0.2, label: tr({ en: 'IM A STAR', pt: 'SOU ESTRELA' }) })
      ]
    },
    // 75
    {
      id: 'face-mosaic', name: { en: 'Face Mosaic', pt: 'Mosaico de Rosto' }, ratio: '6:5', tags: ['halftone'], photos: 1,
      palette: 'mono-paper', colors: { c1: '#F2C83A', c2: '#C83AB0', c3: '#4AB83A', c4: '#1A3AC8' }, slots: ['c1', 'c2', 'c3', 'c4'],
      layers: [
        bg({ paint: C('#8A8A8A') }),
        photo({ w: 1, aspect: 1.2, treatment: { type: 'grade', tint: C('#8A8A8A'), amount: 0.3, contrast: 0.9, fade: 0.2, grain: 0.2, saturation: 0.2 } }),
        { id: 'mosaic', kind: 'mosaic', of: 'photo', x: 0.5, y: 0.5, w: 1, rot: 0, count: 45, paints: [S('c1'), S('c2'), S('c3'), S('c4')], confetti: true, seed: 75 } as Layer
      ]
    },
    // 76
    {
      id: 'red-ornament-night', name: { en: 'Red Ornament Night', pt: 'Noite com Ornamentos' }, ratio: '4:3', tags: ['paper'], photos: 3,
      palette: 'cherry-red', colors: { background: '#C02A2A', frame: '#6A9A4A', paper: '#FFFFFF' }, slots: ['background', 'frame', 'paper'],
      layers: [
        bg({ texture: 'paper' }),
        photo({ x: 0.66, y: 0.5, w: 0.6, aspect: 0.75, treatment: { type: 'flash', contrast: 1.25, grain: 0.3 } }),
        photo({ id: 'i1', photo: 1, x: 0.2, y: 0.3, w: 0.26, aspect: 0.8, frame: 'white', frameMargin: 0.03, framePaint: S('frame') }),
        photo({ id: 'i2', photo: 2, x: 0.25, y: 0.7, w: 0.24, aspect: 0.8, frame: 'white', frameMargin: 0.03, framePaint: S('frame') }),
        { id: 'orn', kind: 'ornament', style: 'line', motif: 'swirl', x: 0.22, y: 0.82, w: 0.42, h: 0.34, rot: 0, paint: S('paper'), dot: 8, square: false, opacity: 0.85 } as Layer
      ]
    },
    // 77
    {
      id: 'dot-matrix-park', name: { en: 'Dot Matrix Park', pt: 'Parque em Pontos' }, ratio: '6:5', tags: ['nature', 'halftone'], photos: 1,
      palette: 'olive-love', colors: { frame: '#A8B85A', paper: '#C8CC9A' }, slots: ['frame', 'paper'],
      layers: [
        bg({ style: 'photo', blur: 18, treatment: { type: 'grade', tint: C('#FFFFFF'), amount: 0.2, contrast: 0.9, fade: 0.2, grain: 0.1 } }),
        photo({ w: 0.6, aspect: 1.2, frame: 'white', frameMargin: 0.04, framePaint: S('frame'), shadow: true }),
        { id: 'orn1', kind: 'ornament', style: 'dots', motif: 'floral', x: 0.2, y: 0.25, w: 0.34, h: 0.4, rot: 0, paint: S('paper'), dot: 9, square: true } as Layer,
        { id: 'orn2', kind: 'ornament', style: 'dots', motif: 'swirl', x: 0.8, y: 0.78, w: 0.4, h: 0.3, rot: 0, paint: S('paper'), dot: 9, square: true } as Layer,
        ...many('sf', [[0.9, 0.15, 0.04], [0.1, 0.85, 0.035], [0.55, 0.08, 0.03]], { shape: 'asterisk', fill: null, stroke: S('paper'), strokeWidth: 4 })
      ]
    },
    // 78
    {
      id: 'oval-window', name: { en: 'Oval Window', pt: 'Janela Oval' }, ratio: '4:5', tags: ['paper', 'nature'], photos: 1,
      palette: 'cherry-red', colors: { background: '#A80E12' }, slots: ['background'],
      layers: [
        bg({ style: 'photo', blur: 26 }),
        { id: 'panel', kind: 'punch', x: 0.5, y: 0.5, w: 0.86, h: 0.84, rot: 0, paint: S('background'), texture: 'paper', holes: ['oval'], count: 1, size: 0.62, single: true, holeRot: -14 } as Layer,
        // The sharp photo sits exactly in the hole; its subject comes back on top so leaves and hair pass over the panel.
        photo({ id: 'sharp', w: 0.62, aspect: 1 / 0.72, rot: -14, cutout: 'window', windowShape: 'oval' }),
        { id: 'front', kind: 'subject', of: 'sharp', x: 0.5, y: 0.5, w: 1, rot: 0, cutout: 'clean' } as Layer
      ]
    },
    // 79
    {
      id: 'star-punch-cream', name: { en: 'Star Punch Cream', pt: 'Estrelas Vazadas Creme' }, ratio: '3:4', tags: ['stars', 'paper'], photos: 1,
      palette: 'mono-paper', colors: { paper: '#F5EDC8' }, slots: ['paper'],
      layers: [
        bg({ paint: C('#111111') }),
        photo({ w: 1, aspect: 0.75 }),
        { id: 'punch', kind: 'punch', x: 0.5, y: 0.25, w: 1, h: 0.5, rot: 0, paint: S('paper'), texture: 'paper', holes: ['star'], count: 28, size: 0.07, seed: 79 } as Layer,
        ...scatter('cs', 14, 80, [0.05, 0.55, 0.95, 0.97], [0.05, 0.09], { shape: 'star5', rounded: true, fill: S('paper') })
      ]
    },
    // 80
    {
      id: 'star-punch-mustard', name: { en: 'Star Punch Mustard', pt: 'Estrelas Vazadas Mostarda' }, ratio: '3:5', tags: ['stars', 'paper'], photos: 1,
      palette: 'mustard-teal', colors: { paper: '#F5CC5A' }, slots: ['paper'],
      layers: [
        bg({ paint: C('#111111') }),
        photo({ w: 1, aspect: 0.6 }),
        ...scatter('ys', 12, 81, [0.05, 0.05, 0.95, 0.45], [0.05, 0.09], { shape: 'star5', rounded: true, fill: S('paper') }),
        { id: 'punch', kind: 'punch', x: 0.5, y: 0.75, w: 1, h: 0.5, rot: 0, paint: S('paper'), texture: 'paper', holes: ['star'], count: 22, size: 0.07, seed: 80 } as Layer
      ]
    },
    // 81
    {
      id: 'green-dot-garden', name: { en: 'Green Dot Garden', pt: 'Jardim de Pontos' }, ratio: '3:4', tags: ['nature', 'halftone'], photos: 2,
      palette: 'olive-love', colors: { background: '#6A9A40', paper: '#F2C8C8', text: '#FFB15C' }, slots: ['background', 'paper', 'text'],
      layers: [
        bg({ texture: 'paper' }),
        photo({ y: 0.25, w: 1, aspect: 2 }),
        photo({ id: 'inset', photo: 1, x: 0.36, y: 0.72, w: 0.46, aspect: 1, frame: 'white', frameMargin: 0.03, framePaint: C('#FFFFFF') }),
        { id: 'clover', kind: 'ornament', style: 'dots', motif: 'clover', x: 0.8, y: 0.62, w: 0.3, h: 0.24, rot: 0, paint: S('paper'), dot: 8, square: false } as Layer,
        { id: 'flower', kind: 'ornament', style: 'dots', motif: 'floral', x: 0.78, y: 0.86, w: 0.28, h: 0.22, rot: 0, paint: S('paper'), dot: 8, square: false } as Layer,
        ...many('trail', [[0.62, 0.55, 0.012], [0.66, 0.52, 0.01], [0.7, 0.5, 0.012], [0.92, 0.75, 0.01]], { shape: 'dot', fill: S('paper') }),
        ...many('sk', [[0.9, 0.55, 0.04], [0.62, 0.95, 0.035]], { shape: 'sparkle', fill: S('paper') }),
        text({ id: 'date', x: 0.25, y: 0.95, text: date, font: 'pixel', paint: S('text'), size: 0.04 })
      ]
    },
    // 82
    {
      id: 'dot-bouquet-sky', name: { en: 'Dot Bouquet Sky', pt: 'Buquê de Pontos no Céu' }, ratio: '2:3', tags: ['nature', 'halftone'], photos: 1,
      palette: 'olive-love', colors: { paper: '#7A8A4A' }, slots: ['paper'],
      layers: [
        bg({ paint: C('#111111') }),
        photo({ w: 1, aspect: 2 / 3 }),
        { id: 'bouquet', kind: 'ornament', style: 'dots', motif: 'bouquet', x: 0.5, y: 0.36, w: 0.9, h: 0.6, rot: 0, paint: S('paper'), dot: 11, square: false, behind: 'photo' } as Layer
      ]
    },
    // 83
    {
      id: 'indigo-bouquet-sunset', name: { en: 'Indigo Bouquet Sunset', pt: 'Buquê Índigo no Pôr do Sol' }, ratio: '4:5', tags: ['nature', 'halftone'], photos: 1,
      palette: 'mono-paper', colors: { paper: '#DADADA', doodleStroke: '#3A2A8A', tint: '#F2A040' }, slots: ['paper', 'doodleStroke'],
      layers: [
        bg({ style: 'photo', treatment: grade('tint', 0.4, { grain: 0.45 }) }),
        shape({ id: 'panel', shape: 'rect', x: 0.5, y: 0.52, w: 0.62, h: 1.05, fill: S('paper'), texture: 'paper' }),
        { id: 'bouquet', kind: 'ornament', style: 'dots', motif: 'bouquet', x: 0.5, y: 0.36, w: 0.55, h: 0.4, rot: 0, paint: S('doodleStroke'), dot: 8, square: false } as Layer,
        photo({ y: 0.58, w: 0.6, cutout: 'clean', treatment: grade('tint', 0.3) })
      ]
    },
    // 84
    {
      id: 'night-beach-stars', name: { en: 'Night Beach Stars', pt: 'Estrelas na Praia' }, ratio: '1:1', tags: ['stars', 'nature'], photos: 2,
      palette: 'pastel-holo', colors: { c1: '#B79CF2', c2: '#7AB8F0', c3: '#F6EED8', doodleFill: '#F2D21A', accent: '#F28A1A', tint: '#3AA0A0' },
      slots: ['c1', 'c2', 'c3', 'doodleFill', 'accent'],
      layers: [
        bg({ paint: C('#1A1030') }),
        photo({ x: 0.36, w: 0.7, aspect: 0.7 }),
        photo({ id: 'strip', photo: 1, x: 0.86, w: 0.26, aspect: 0.26, treatment: { type: 'duotone', dark: C('#3A1A6A'), light: S('tint'), grain: 0.2 } }),
        ...scatter('fs', 10, 84, [0.05, 0.05, 0.95, 0.95], [0.035, 0.06], { shape: 'star5', fill: S('c1') }).map((l, i) => ({ ...l, fill: S(['c1', 'c2', 'c3'][i % 3]) } as Layer)),
        ...many('ys', [[0.15, 0.12, 0.08], [0.7, 0.88, 0.07]], { shape: 'star5', fill: null, stroke: S('doodleFill'), strokeWidth: 5, wobble: 0.3 }),
        shape({ id: 'sun', shape: 'burst', x: 0.88, y: 0.12, w: 0.14, points: 12, fill: S('accent'), stroke: C('#111111'), strokeWidth: 4 }),
        shape({ id: 'sunSpiral', shape: 'swirl', x: 0.88, y: 0.12, w: 0.06, fill: null, stroke: C('#111111'), strokeWidth: 3 })
      ]
    },
    // 85
    {
      id: 'pink-halftone-strokes', name: { en: 'Pink Halftone Strokes', pt: 'Traços Rosa Reticulados' }, ratio: '4:5', tags: ['halftone', 'paper'], photos: 1,
      palette: 'pastel-holo', colors: { background: '#FFFFFF', doodleStroke: '#F01A8A' }, slots: ['background', 'doodleStroke'],
      layers: [
        bg({ texture: 'paper' }),
        photo({ x: 0.4, w: 0.6, aspect: 0.8, rot: -3, shadow: true, treatment: BW(1.2, 0.2) }),
        sticker('paperclip', { id: 'clip', x: 0.32, y: 0.14, w: 0.06, paint: S('doodleStroke') }),
        { id: 'ink1', kind: 'ribbon', x: 0.55, y: 0.5, w: 0.9, h: 0.8, rot: 0, width: 70, paint: S('doodleStroke'), texture: 'halftone', points: [[0.05, 0.3], [0.4, 0.5], [0.7, 0.2], [0.95, 0.4]], weave: [false, false, false] } as Layer,
        { id: 'ink2', kind: 'ribbon', x: 0.6, y: 0.7, w: 0.8, h: 0.4, rot: 0, width: 55, paint: S('doodleStroke'), texture: 'halftone', points: [[0.1, 0.8], [0.5, 0.2], [0.8, 0.9], [0.95, 0.3]], weave: [false, false, false] } as Layer
      ]
    },
    // 86
    {
      id: 'white-star-block', name: { en: 'White Star Block', pt: 'Bloco Estrela Branca' }, ratio: '9:16', tags: ['stars'], photos: 1,
      palette: 'mono-paper', colors: { background: '#FFFFFF', starPrimary: '#FFFFFF' }, slots: ['background', 'starPrimary'],
      layers: [
        bg({}),
        photo({ y: 0.17, w: 0.42, aspect: 1 }),
        photo({ id: 'big', y: 0.67, w: 1, aspect: 1, anchor: 'face', zoom: 2 }),
        shape({ id: 'mask', shape: 'star5', x: 0.5, y: 0.65, w: 0.6, rot: -6, fill: S('starPrimary') })
      ]
    },
    // 87
    {
      id: 'autumn-swirls', name: { en: 'Autumn Swirls', pt: 'Espirais de Outono' }, ratio: '4:5', tags: ['nature', 'paper'], photos: 1,
      palette: 'burnt-orange', colors: { paper: '#F5F0E8' }, slots: ['paper'],
      layers: [
        bg({ paint: C('#111111') }),
        photo({ w: 1, aspect: 0.8, treatment: { type: 'warm', amount: 0.5, grain: 0.25 } }),
        { id: 'punch', kind: 'punch', x: 0.5, y: 0.25, w: 1, h: 0.5, rot: 0, paint: S('paper'), texture: 'paper', holes: ['star', 'spiral'], count: 18, size: 0.09, seed: 87 } as Layer,
        ...scatter('cs', 8, 88, [0.05, 0.55, 0.95, 0.97], [0.06, 0.1], { shape: 'star5', rounded: true, fill: S('paper') }),
        ...scatter('sw', 5, 89, [0.05, 0.55, 0.95, 0.97], [0.06, 0.1], { shape: 'swirl', fill: null, stroke: S('paper'), strokeWidth: 9 })
      ]
    },
    // 88
    {
      id: 'pixel-tiles-night', name: { en: 'Pixel Tiles Night', pt: 'Pixels Noturnos' }, ratio: '6:5', tags: ['booth'], photos: 3,
      palette: 'mono-paper', colors: { background: '#FFFFFF', tint: '#F2A040' }, slots: ['background', 'tint'],
      layers: [
        bg({}),
        { id: 'tiles', kind: 'slices', mode: 'tiles', photo: 0, x: 0.45, y: 0.52, w: 0.62, h: 0.75, rot: 0, count: 8, gap: 5, removed: 0.18, paint: S('background'), shift: 0, treatment: grade('tint', 0.4), seed: 88 } as Layer,
        photo({ id: 'p2', photo: 1, x: 0.85, y: 0.2, w: 0.26, aspect: 0.9, treatment: grade('tint', 0.4) }),
        photo({ id: 'p3', photo: 2, x: 0.12, y: 0.82, w: 0.22, aspect: 0.9, treatment: grade('tint', 0.4) })
      ]
    },
    // 89
    {
      id: 'green-line-lily', name: { en: 'Green Line Lily', pt: 'Lírio em Linhas Verdes' }, ratio: '3:4', tags: ['nature', 'paper'], photos: 2,
      palette: 'olive-love', colors: { paper: '#FFFFFF', doodleStroke: '#8ABA8A' }, slots: ['paper', 'doodleStroke'],
      layers: [
        bg({ paint: S('paper'), texture: 'paper' }),
        photo({ y: 0.25, w: 1, aspect: 2 }),
        photo({ id: 'inset', photo: 1, x: 0.36, y: 0.72, w: 0.44, aspect: 1, shadow: true }),
        { id: 'lily', kind: 'ornament', style: 'line', motif: 'lily', x: 0.8, y: 0.72, w: 0.34, h: 0.4, rot: 0, paint: S('doodleStroke'), dot: 8, square: false } as Layer,
        { id: 'swirl', kind: 'ornament', style: 'line', motif: 'swirl', x: 0.36, y: 0.94, w: 0.5, h: 0.12, rot: 0, paint: S('doodleStroke'), dot: 8, square: false } as Layer
      ]
    },
    // 90
    {
      id: 'pastel-dots', name: { en: 'Pastel Dots', pt: 'Bolinhas Pastel' }, ratio: '4:5', tags: ['paper'], photos: 1,
      palette: 'pastel-holo', colors: { c1: '#6A90E0', c2: '#8ACC78', c3: '#F07AB0' }, slots: ['c1', 'c2', 'c3'],
      layers: [
        bg({ paint: C('#FFFFFF'), texture: 'paper' }),
        photo({ y: 0.25, w: 1, aspect: 2, treatment: { type: 'warm', amount: 0.2, grain: 0.4 } }),
        photo({ id: 'inset', y: 0.72, w: 0.5, aspect: 1, treatment: { type: 'warm', amount: 0.2, grain: 0.4 } }),
        ...scatter('dot', 12, 90, [0.08, 0.55, 0.92, 0.97], [0.035, 0.07], { shape: 'dot', fill: S('c1'), texture: 'paper' }).map((l, i) => ({ ...l, fill: S(['c1', 'c2', 'c3'][i % 3]) } as Layer))
      ]
    },
    // 91
    {
      id: 'zebra-frame', name: { en: 'Zebra Frame', pt: 'Moldura Zebra' }, ratio: '4:5', tags: ['paper'], photos: 1,
      palette: 'mono-paper', colors: { background: '#F0E8D8', backgroundSecondary: '#111111', frame: '#9A9A9A' }, slots: ['background', 'backgroundSecondary', 'frame'],
      layers: [
        bg({ style: 'zebra', paint2: S('backgroundSecondary') }),
        photo({ w: 0.66, aspect: 0.8, frame: 'white', frameMargin: 0.05, framePaint: S('frame'), shadow: true, treatment: BW(1.15, 0.2) })
      ]
    },
    // 92
    {
      id: 'orange-star-print', name: { en: 'Orange Star Print', pt: 'Cópia com Estrelas Laranja' }, ratio: '4:5', tags: ['paper', 'stars'], photos: 1,
      palette: 'burnt-orange', colors: { background: '#F57A1A', frame: '#F6EBD0', starSecondary: '#4A2A1A' }, slots: ['background', 'frame', 'starSecondary'],
      layers: [
        bg({ texture: 'paper' }),
        photo({ id: 'print', y: 0.22, w: 0.34, aspect: 0.8, frame: 'white', frameMargin: 0.12, framePaint: S('frame'), frameStars: S('starSecondary'), shadow: true, treatment: BW(1.1, 0.2) }),
        photo({ id: 'big', y: 0.74, w: 0.52, aspect: 1 / 1.92, rot: 90, treatment: BW(1.2, 0.25) })
      ]
    },
    // 93
    {
      id: 'navy-booth-strip', name: { en: 'Navy Booth Strip', pt: 'Tira de Cabine Marinho' }, ratio: '3:4', tags: ['booth'], photos: 3,
      palette: 'navy-gold', colors: { background: '#1E3A78', frame: '#FFFFFF' }, slots: ['background', 'frame'],
      layers: [
        bg({ texture: 'paper' }),
        shape({ id: 'light', shape: 'circle', x: 0.5, y: -0.1, w: 1.4, fill: C('#FFFFFF'), opacity: 0.12 }),
        layout({ w: 0.42, h: 0.6, rot: 90, gutter: 12, border: 14, paint: S('frame'), shadow: true, treatment: SEPIA })
      ]
    },
    // 94
    {
      id: 'denim-booth-stars', name: { en: 'Denim Booth Stars', pt: 'Cabine Jeans com Estrelas' }, ratio: '2:3', tags: ['booth', 'stars'], photos: 3,
      palette: 'navy-gold', colors: { background: '#7A9AB8', frame: '#111111', accent: '#BFE3F5' }, slots: ['background', 'frame', 'accent'],
      layers: [
        bg({ texture: 'denim', folds: 'middle' }),
        ...[0, 1, 2].map((i) => photo({ id: `b${i}`, photo: i, x: 0.5, y: 0.2 + i * 0.3, w: 0.5, aspect: 1.2, frame: 'booth', framePaint: S('frame'), shadow: true, treatment: SEPIA })),
        ...[0, 1, 2].map((i) => ({ id: `glow${i}`, kind: 'outline', of: `b${i}`, x: 0.5, y: 0.5, w: 1, rot: 0, distance: 3, width: 4, paint: S('accent'), texture: 'none' } as Layer)),
        ...scatter('cs', 12, 94, [0.08, 0.05, 0.92, 0.95], [0.04, 0.06], { shape: 'star5', material: 'metallic', fill: C('#D8DCE4') }).map((l, i) => ({ ...l, x: i % 2 ? 0.1 + (i % 3) * 0.04 : 0.9 - (i % 3) * 0.04 } as Layer))
      ]
    },
    // 95
    {
      id: 'kraft-booth-grid', name: { en: 'Kraft Booth Grid', pt: 'Grade de Cabine Kraft' }, ratio: '3:4', tags: ['booth', 'paper'], photos: 5,
      palette: 'olive-love', colors: { background: '#A8B860', frame: '#111111', tint: '#C8A070' }, slots: ['background', 'frame'],
      layers: [
        bg({ texture: 'kraft', folds: 'grid' }),
        layout({ mode: 'grid', rows: 3, cols: 2, w: 0.7, h: 0.75, gutter: 4, border: 4, paint: S('frame'), shadow: true, treatment: { type: 'sepia', amount: 0.4, fade: 0.1, grain: 0.3 }, cells: cells(6) })
      ]
    },
    // 96
    {
      id: 'red-side-strip', name: { en: 'Red Side Strip', pt: 'Tira Lateral Vermelha' }, ratio: '4:5', tags: ['booth'], photos: 3,
      palette: 'wine-felt', colors: { background: '#7E1616', frame: '#F6EED8' }, slots: ['background', 'frame'],
      layers: [
        bg({ texture: 'felt' }),
        layout({ x: 0.78, w: 0.3, h: 0.82, gutter: 10, border: 12, paint: S('frame'), cellRot: 90, shadow: true, treatment: SEPIA })
      ]
    },
    // 97
    {
      id: 'torn-red-eyes', name: { en: 'Torn Red Eyes', pt: 'Olhos Rasgados Vermelhos' }, ratio: '2:3', tags: ['halftone', 'paper'], photos: 1,
      palette: 'cherry-red', colors: { doodleFill: '#9E2A2A', doodleStroke: '#111111' }, slots: ['doodleFill', 'doodleStroke'],
      layers: [
        bg({ paint: C('#F2F0EC') }),
        ...[0, 1, 2].map((i) => photo({ id: `r${i}`, y: 0.17 + i * 0.33, w: 1, aspect: 2, anchor: 'eyes', zoom: 2.2, treatment: BW(1.3, 0.5) })),
        ...[0, 2].map((i) => ({ id: `patch${i}`, kind: 'threshold', of: `r${i}`, anchor: 'eyes', x: 0.5, y: 0.5, w: 1, rot: 0, paint: S('doodleFill'), ink: S('doodleStroke'), size: 1.2, seed: i + 1 } as Layer))
      ]
    },
    // 98
    {
      id: 'halftone-star-eye', name: { en: 'Halftone Star Eye', pt: 'Olho Estrela Reticulado' }, ratio: '9:16', tags: ['halftone', 'stars'], photos: 1,
      palette: 'pastel-holo', colors: { c1: '#E060A0', c2: '#50D040', c3: '#6050E0' }, slots: ['c1', 'c2', 'c3'],
      layers: [
        bg({ paint: C('#0A0A0A'), texture: 'crumpled' }),
        ...[0, 1, 2].map((i) => photo({ id: `r${i}`, y: 0.18 + i * 0.32, w: 0.92, aspect: 1.5, anchor: 'face', zoom: 1.8, treatment: { type: 'halftone', dot: 6, ink: C('#111111'), paper: C('#F2F2F2') } })),
        ...[0, 1, 2].map((i) => photo({ id: `s${i}`, x: 0.42, y: 0.15 + i * 0.32, w: 0.2, aspect: 1, anchor: 'eyes', zoom: 4, cutout: 'window', windowShape: 'star', treatment: { type: 'mono', tint: S(`c${i + 1}`), paper: C('#FFFFFF'), grain: 0.1 } }))
      ]
    },
    // 99
    {
      id: 'pink-booth-grid', name: { en: 'Pink Booth Grid', pt: 'Grade de Cabine Rosa' }, ratio: '3:4', tags: ['booth', 'halftone'], photos: 5,
      palette: 'pastel-holo', colors: { tint: '#F0509A', accent: '#70C030', starPrimary: '#F2D21A' }, slots: ['tint', 'accent', 'starPrimary'],
      layers: [
        bg({ paint: C('#FFFFFF') }),
        layout({ mode: 'grid', rows: 3, cols: 3, w: 0.9, h: 0.86, gutter: 10, border: 0, radius: 18, paint: C('#FFFFFF'), treatment: { type: 'mono', tint: C('#3A0A2A'), paper: S('tint'), grain: 0.2 }, cells: cells(9) }),
        photo({ id: 'accentCell', photo: 4, x: 0.8, y: 0.5, w: 0.28, aspect: 1, treatment: { type: 'mono', tint: C('#1A3A0A'), paper: S('accent'), grain: 0.2 } }),
        sticker('smileStar', { id: 'smile', x: 0.88, y: 0.32, w: 0.12, paint: S('starPrimary') }),
        sticker('musicNote', { id: 'note', x: 0.92, y: 0.68, w: 0.08, paint: S('starPrimary') })
      ]
    },
    // 100
    {
      id: 'cyan-star-stripes', name: { en: 'Cyan Star Stripes', pt: 'Listras com Estrela Ciano' }, ratio: '4:5', tags: ['stars', 'paper'], photos: 1,
      palette: 'sky-zine', colors: { tint: '#40C0E0' }, slots: ['tint'],
      layers: [
        bg({ paint: C('#FFFFFF') }),
        ...[0, 1, 2].map((i) => photo({ id: `r${i}`, y: 0.2 + i * 0.3, w: 0.9, aspect: 3.2, anchor: 'eyes', zoom: 2.5, treatment: BW(1.25, 0.25) })),
        shape({ id: 'st1', shape: 'star5', x: 0.7, y: 0.24, w: 0.1, fill: S('tint') }),
        shape({ id: 'st3', shape: 'star5', x: 0.3, y: 0.84, w: 0.1, fill: S('tint') }),
        { id: 'band', kind: 'punch', x: 0.5, y: 0.5, w: 0.9, h: 0.25, rot: 0, paint: S('tint'), texture: 'none', holes: ['star'], count: 1, size: 0.14, single: true, opacity: 0.85 } as Layer
      ]
    },
    // 101
    {
      id: 'block-toy-party', name: { en: 'Block Toy Party', pt: 'Festa de Bonecos de Bloco' }, ratio: '9:16', tags: ['scrapbook'], photos: 3,
      palette: 'burnt-orange', colors: { frame: '#4A2A1A', c1: '#F2C21A', c2: '#3A7AE0', c3: '#7AE03A' }, slots: ['frame', 'c1', 'c2', 'c3'],
      layers: [
        bg({ style: 'stained' }),
        ...[0, 1, 2].map((i) => photo({ id: `p${i}`, photo: i, x: i % 2 ? 0.62 : 0.38, y: 0.2 + i * 0.3, w: 0.58, aspect: 1.2, frame: 'film', framePaint: S('frame'), shadow: true, rot: i % 2 ? 3 : -3 })),
        sticker('blockDab', { id: 'f1', x: 0.84, y: 0.14, w: 0.26, paint: S('c1') }),
        sticker('blockWave', { id: 'f2', x: 0.14, y: 0.5, w: 0.26, paint: S('c2') }),
        sticker('blockFall', { id: 'f3', x: 0.86, y: 0.84, w: 0.26, paint: S('c3') })
      ]
    },
    // 102
    {
      id: 'camera-tile-swatch', name: { en: 'Camera Tile Swatch', pt: 'Câmera, Azulejo e Cor' }, ratio: '4:5', tags: ['scrapbook'], photos: 1,
      palette: 'olive-love', colors: { background: '#7FA878', starPrimary: '#F2D21A' }, slots: ['background', 'starPrimary'],
      layers: [
        bg({ style: 'tiles' }),
        { id: 'cam', kind: 'ui', widget: 'compact', x: 0.5, y: 0.22, w: 0.62, h: 0.26, rot: -4, paint: C('#E0281E') } as Layer,
        sticker('bow', { id: 'bow', x: 0.2, y: 0.1, w: 0.14, rot: -15 }),
        shape({ id: 'star', shape: 'star5', x: 0.84, y: 0.1, w: 0.07, fill: S('starPrimary') }),
        ...many('sp', [[0.88, 0.32, 0.04], [0.12, 0.34, 0.035]], { shape: 'sparkle', fill: S('starPrimary') }),
        sticker('cherries', { id: 'cher', x: 0.85, y: 0.38, w: 0.1 }),
        photo({ y: 0.72, w: 1, aspect: 1.8 }),
        { id: 'swatch', kind: 'ui', widget: 'swatch', x: 0.82, y: 0.72, w: 0.24, h: 0.2, rot: 5, title: tr({ en: 'SUNNY DAY', pt: 'DIA DE SOL' }) } as Layer
      ]
    },
    // 103
    {
      id: 'camera-stripe-fabric', name: { en: 'Camera Stripe Fabric', pt: 'Câmera em Tecido Listrado' }, ratio: '3:4', tags: ['scrapbook', 'paper'], photos: 1,
      palette: 'navy-gold', colors: { background: '#2A3460', backgroundSecondary: '#EDE6D4' }, slots: ['background', 'backgroundSecondary'],
      layers: [
        bg({ style: 'stripes', paint2: S('backgroundSecondary'), stripeWidth: 0.06, texture: 'fabric' }),
        { id: 'cam', kind: 'ui', widget: 'compact', x: 0.5, y: 0.24, w: 0.66, h: 0.28, rot: 3, paint: C('#2A3460') } as Layer,
        photo({ y: 0.74, w: 1, aspect: 1.5 })
      ]
    },
    // 104
    {
      id: 'cozy-moodboard', name: { en: 'Cozy Moodboard', pt: 'Moodboard Aconchegante' }, ratio: '4:5', tags: ['scrapbook', 'booth'], photos: 5,
      palette: 'burnt-orange', colors: { starPrimary: '#E8C04A', frame: '#F2C23A', tint: '#F2A040' }, slots: ['starPrimary', 'frame'],
      layers: [
        bg({ paint: C('#F4EEE4') }),
        layout({ mode: 'grid', rows: 2, cols: 2, gutter: 8, border: 8, paint: C('#F4EEE4'), treatment: grade('tint', 0.3), cells: cells(4) }),
        shape({ id: 'grid', shape: 'grid3', x: 0.26, y: 0.26, w: 0.45, h: 1, fill: null, stroke: C('#FFFFFF'), strokeWidth: 2 }),
        { id: 'boxes', kind: 'boxes', of: 'focus', x: 0.5, y: 0.5, w: 1, rot: 0, targets: ['face'] as Anchor[], paint: S('frame'), width: 3, rounded: false, pointer: false } as Layer,
        photo({ id: 'focus', x: 0.26, y: 0.26, w: 0.45, aspect: 0.8, opacity: 0.01 }),
        layout({ id: 'film', mode: 'film', x: 0.5, y: 0.5, w: 0.3, h: 0.7, rot: -28, rows: 3, paint: C('#111111'), treatment: BW(1.1, 0.3), cells: cells(3, 2), shadow: true }),
        sticker('lily', { id: 'lily', x: 0.86, y: 0.86, w: 0.18 }),
        shape({ id: 's8a', shape: 'star5', points: 8, x: 0.12, y: 0.88, w: 0.09, fill: S('starPrimary'), material: 'metallic' }),
        shape({ id: 's8b', shape: 'star5', points: 8, x: 0.9, y: 0.12, w: 0.07, fill: S('starPrimary'), material: 'metallic' }),
        sticker('keytag', { id: 'tag', x: 0.72, y: 0.62, w: 0.26, rot: -8, label: tr({ en: 'with love', pt: 'com amor' }) })
      ]
    },
    // 105
    {
      id: 'head-portal', name: { en: 'Head Portal', pt: 'Portal na Cabeça' }, ratio: '3:4', tags: ['booth'], photos: 2,
      palette: 'mono-paper', colors: { starPrimary: '#F2D21A' }, slots: ['starPrimary'],
      layers: [
        bg({ paint: C('#050505') }),
        photo({ w: 1, aspect: 0.75, anchor: 'face', zoom: 1.4, treatment: { type: 'flash', contrast: 1.25, grain: 0.3 } }),
        photo({ id: 'portal', photo: 1, x: 0.5, y: 0.22, w: 0.4, aspect: 1.5, cutout: 'window', windowShape: 'oval', feather: 0.4, vignette: 0.6 }),
        shape({ id: 'cheek', shape: 'star5', x: 0.62, y: 0.55, w: 0.05, fill: S('starPrimary') })
      ]
    },
    // 106
    {
      id: 'white-swirls', name: { en: 'White Swirls', pt: 'Espirais Brancas' }, ratio: '1:1', tags: ['doodle'], photos: 1,
      palette: 'mono-paper', colors: { doodleStroke: '#FFFFFF' }, slots: ['doodleStroke'],
      layers: [
        bg({ paint: C('#111111') }),
        photo({ w: 1, aspect: 1, treatment: BW(1.25, 0.4) }),
        ...scatter('sp', 6, 106, [0.1, 0.1, 0.9, 0.9], [0.18, 0.3], { shape: 'spiral2', fill: null, stroke: S('doodleStroke'), strokeWidth: 5, texture: 'marker' }).map((l, i) => ({ ...l, behind: i % 2 ? 'photo' : undefined } as Layer))
      ]
    },
    // 107
    {
      id: 'birthday-poster', name: { en: 'Birthday Poster', pt: 'Pôster de Aniversário' }, ratio: '4:5', tags: ['halftone', 'comic'], photos: 1,
      palette: 'crayon-pop', colors: { background: '#F2C030', tint: '#7A3AE0', tintSecondary: '#F8A0D0', c1: '#E0281E', c2: '#2A62E0', c3: '#F28A1A', text: '#111111' },
      slots: ['background', 'tint', 'tintSecondary', 'c1', 'c2', 'c3', 'text'],
      layers: [
        bg({ texture: 'halftone' }),
        photo({ x: 0.45, y: 0.6, w: 0.85, cutout: 'clean', treatment: { type: 'halftone', dot: 4, ink: C('#111111'), paper: C('#F2F2F2') } }),
        ...[[0.3, 0.45], [0.6, 0.6], [0.4, 0.8]].map(([x, y], i) => ({ id: `cw${i}`, kind: 'cropwin', of: 'photo', x, y, w: 0.22, h: 0.13, rot: 0, treatment: { type: 'posterize', levels: 3, dark: S('tint'), light: S('tintSecondary') }, guide: C('#FFFFFF') } as Layer)),
        ...many('st', [[0.12, 0.3, 0.1], [0.88, 0.5, 0.09], [0.15, 0.9, 0.08]], { shape: 'star5', fill: S('c1'), texture: 'halftone' }).map((l, i) => ({ ...l, fill: S(['c1', 'c2', 'c3'][i]) } as Layer)),
        text({ id: 'title', x: 0.68, y: 0.12, text: tr({ en: 'HAPPY\nBIRTHDAY!', pt: 'FELIZ\nANIVERSÁRIO!' }), font: 'brush', paint: S('text'), size: 0.08, rot: -3 }),
        text({ id: 'name', x: 0.72, y: 0.25, text: tr({ en: 'YOUR NAME', pt: 'SEU NOME' }), font: 'display', paint: S('c1'), size: 0.05 }),
        text({ id: 'date', x: 0.2, y: 0.96, text: '24.11.26', font: 'display', paint: S('text'), size: 0.04 })
      ]
    },
    // 108
    {
      id: 'red-grunge-shards', name: { en: 'Red Grunge Shards', pt: 'Estilhaços Grunge Vermelhos' }, ratio: '4:5', tags: ['scrapbook', 'comic'], photos: 1,
      palette: 'cherry-red', colors: { background: '#E87A8A', tint: '#E0281E', accent: '#F2E6F0', text: '#F2D21A' }, slots: ['background', 'tint', 'accent', 'text'],
      layers: [
        bg({ style: 'grunge', paint2: C('#3A0A0A') }),
        { id: 'shards', kind: 'slices', mode: 'shards', photo: 0, x: 0.5, y: 0.5, w: 0.74, h: 0.8, rot: 0, count: 7, gap: 0, paint: S('accent'), shift: 0.8, treatment: grade('tint', 0.7, { grain: 0.6, contrast: 1.3 }), seed: 108 } as Layer,
        photo({ id: 'eyes1', x: 0.1, y: 0.3, w: 0.36, aspect: 3, anchor: 'eyes', zoom: 3, treatment: grade('tint', 0.7) }),
        photo({ id: 'lips1', x: 0.9, y: 0.66, w: 0.34, aspect: 3, anchor: 'mouth', zoom: 4, treatment: grade('tint', 0.7) }),
        text({ id: 'sig', x: 0.7, y: 0.92, text: tr({ en: 'xoxo you', pt: 'beijos, você' }), font: 'script', paint: S('text'), size: 0.06, rot: -8 })
      ]
    },
    // 109
    {
      id: 'frosted-glass-stars', name: { en: 'Frosted Glass Stars', pt: 'Estrelas de Vidro Fosco' }, ratio: '3:4', tags: ['stars', 'nature'], photos: 1,
      palette: 'sky-zine', colors: { background: '#4A7AC8' }, slots: ['background'],
      layers: [
        bg({ texture: 'canvas' }),
        { id: 'f1', kind: 'frost', shape: 'star', x: 0.2, y: 0.2, w: 0.24, rot: -10, frost: 0.6, seed: 1 } as Layer,
        { id: 'f2', kind: 'frost', shape: 'star', x: 0.82, y: 0.3, w: 0.2, rot: 15, frost: 0.6, seed: 2 } as Layer,
        photo({ y: 0.58, w: 0.8, cutout: 'clean' }),
        { id: 'f3', kind: 'frost', shape: 'star', x: 0.42, y: 0.5, w: 0.22, rot: 5, frost: 0.5, seed: 3 } as Layer,
        { id: 'f4', kind: 'frost', shape: 'star', x: 0.6, y: 0.78, w: 0.2, rot: -18, frost: 0.5, seed: 4 } as Layer
      ]
    },
    // 110
    {
      id: 'riso-punk-poster', name: { en: 'Riso Punk Poster', pt: 'Pôster Punk Riso' }, ratio: '3:4', tags: ['halftone', 'comic'], photos: 1,
      palette: 'crayon-pop', colors: { background: '#E83A8A', backgroundSecondary: '#3A70D0', doodleStroke: '#F2E030' }, slots: ['background', 'backgroundSecondary', 'doodleStroke'],
      finish: 'riso',
      layers: [
        bg({ style: 'stripes', paint2: S('backgroundSecondary'), stripeWidth: 0.12, stripeAngle: 90 }),
        photo({ y: 0.6, w: 0.85, cutout: 'clean', treatment: { type: 'halftone', dot: 4, ink: C('#111111'), paper: C('#F2F2F2') } }),
        { id: 'zig', kind: 'outline', of: 'photo', x: 0.5, y: 0.5, w: 1, rot: 0, distance: 18, width: 9, paint: S('doodleStroke'), texture: 'crayon' } as Layer,
        ...many('eye', [[0.42, 0.38, 0.06], [0.56, 0.38, 0.06]], { shape: 'star5', fill: S('doodleStroke'), texture: 'crayon' }),
        ...scatter('ys', 6, 110, [0.05, 0.05, 0.95, 0.3], [0.05, 0.09], { shape: 'star5', fill: null, stroke: S('doodleStroke'), strokeWidth: 6, texture: 'crayon' }),
        ...many('ex', [[0.1, 0.55, 0.06, -15], [0.9, 0.6, 0.06, 15]], { shape: 'exclaim', fill: S('doodleStroke') }),
        shape({ id: 'burst', shape: 'asterisk', x: 0.85, y: 0.15, w: 0.16, fill: null, stroke: S('doodleStroke'), strokeWidth: 6 })
      ]
    }
  ];
}
