/**
 * Built in collage templates 19 to 56. Same data format as templates.ts: every
 * color comes from a named slot, so the Colors panel recolors each element, and
 * every tool used here (color block heads, comic bubbles, torn pages, sketch,
 * scribble fill, crop windows, patchwork, layouts, boxes, waves, stickers) is a
 * regular layer kind that the editor can add to any collage.
 */
import type { Anchor, CollageTemplate, HeadBlock, Layer, Localized, Paint, PatchworkPattern, StickerArt, Treatment } from './types';
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
const subject = (of: string, o: Record<string, unknown> = {}): Layer => ({ id: 'subj-' + of, kind: 'subject', of, x: 0.5, y: 0.5, w: 1, rot: 0, cutout: 'clean', ...o } as Layer);

/** Many small shapes from a list of [x, y, w, rot]. */
const many = (prefix: string, pts: number[][], o: Record<string, unknown>) =>
  pts.map(([x, y, w, rot], i) => shape({ id: `${prefix}${i}`, x, y, w, rot: rot ?? (i * 23) % 60 - 30, seed: i + 1, ...o }));

/** Shapes scattered in a box, avoiding a central oval (the person). */
function around(prefix: string, n: number, seed: number, size: [number, number], avoid: [number, number, number, number], o: Record<string, unknown>) {
  const r = rng(seed);
  const out: Layer[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 40) {
    const x = 0.04 + r() * 0.92, y = 0.04 + r() * 0.92;
    const [cx, cy, rx, ry] = avoid;
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1) continue;
    out.push(shape({ id: `${prefix}${out.length}`, x, y, w: size[0] + r() * (size[1] - size[0]), rot: (r() - 0.5) * 60, seed: seed * 7 + out.length, ...o }));
  }
  return out;
}

/** Points on an arc above a center, for crowns of stars. */
const arc = (n: number, cx: number, cy: number, rx: number, ry: number, from = 200, to = 340) =>
  Array.from({ length: n }, (_, i) => {
    const a = ((from + ((to - from) * i) / Math.max(1, n - 1)) * Math.PI) / 180;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  });

const BW = (contrast = 1.25, grain = 0.25): Treatment => ({ type: 'bw', contrast, grain });
const grade = (tint: string, amount: number, o: Partial<Extract<Treatment, { type: 'grade' }>> = {}): Treatment =>
  ({ type: 'grade', tint: S(tint), amount, contrast: 1.15, fade: 0.08, grain: 0.3, ...o } as Treatment);

export function buildTemplatesSet2(lang: string): CollageTemplate[] {
  const tr = (s: Localized) => s[lang] ?? s.en;
  const head = (slot: string, ink: string, size = 1.25, dx = 0, dy = 0, rot = 0): HeadBlock => ({ paint: S(slot), ink: S(ink), size, dx, dy, rot });
  return [
    // 19
    {
      id: 'head-bangers', name: { en: 'Head Bangers', pt: 'Cabeças Coloridas' }, ratio: '4:5', tags: ['comic', 'halftone'], photos: 1,
      palette: 'mustard-teal',
      colors: { frame: '#F2B81A', tint: '#3A3A1A', tintSecondary: '#A8F0B0', head1: '#E040C0', head2: '#8FD8F8', head3: '#F8D040', headInk: '#1A1A1A', headInk3: '#C02010', doodleFill: '#F2EA2E', text: '#111111' },
      slots: ['frame', 'tint', 'tintSecondary', 'head1', 'head2', 'head3', 'doodleFill', 'text'],
      layers: [
        bg({ paint: S('frame') }),
        photo({ w: 0.94, aspect: 0.8, treatment: { type: 'duotone', dark: S('tint'), light: S('tintSecondary'), grain: 0.45 } }),
        { id: 'heads', kind: 'heads', of: 'photo', x: 0.5, y: 0.5, w: 1, rot: 0, blocks: [head('head1', 'headInk', 1.3, 0, 0, -4), head('head2', 'headInk', 1.25, 0.01, 0, 5), head('head3', 'headInk3', 1.3, 0, 0, -3)] } as Layer,
        { id: 'bubble', kind: 'bubble', x: 0.7, y: 0.14, w: 0.5, h: 0.17, rot: -6, text: tr({ en: 'YOUR TEXT', pt: 'SEU TEXTO' }), spikes: 16, randomness: 0.6, paint: S('doodleFill'), stroke: C('#111111'), textPaint: S('text'), seed: 4 } as Layer
      ]
    },
    // 20
    {
      id: 'magazine-profile', name: { en: 'Magazine Profile', pt: 'Perfil de Revista' }, ratio: '3:4', tags: ['scrapbook', 'paper'], photos: 1,
      palette: 'pastel-holo',
      colors: { background: '#F6D8DC', paper: '#3F7A3A', window: '#F7B8D2', starPrimary: '#F05A9A', starSecondary: '#1A1A1A', text: '#1A1A1A', tint: '#F05A9A', tintSecondary: '#FCE8F0' },
      slots: ['background', 'paper', 'window', 'starPrimary', 'text'],
      layers: [
        bg({ texture: 'notebook' }),
        { id: 'page', kind: 'torn', x: 0.56, y: 0.42, w: 0.86, h: 0.56, rot: -5, paint: S('paper'), edge: C('#FFFFFF'), points: 7, print: 0.8, word: tr({ en: 'YOUR NAME', pt: 'SEU NOME' }), seed: 12 } as Layer,
        shape({ id: 'window', shape: 'rect', x: 0.52, y: 0.6, w: 0.62, h: 0.75, rot: 3, fill: S('window'), texture: 'paper' }),
        photo({ x: 0.52, y: 0.6, w: 0.62, aspect: 0.85, cutout: 'sticker', outline: C('#FFFFFF'), outlineWidth: 10 }),
        photo({ id: 'eyes', x: 0.2, y: 0.17, w: 0.3, aspect: 1, anchor: 'eyes', zoom: 4, cutout: 'window', windowShape: 'star', stroke: C('#FFFFFF'), strokeWidth: 6, treatment: { type: 'duotone', dark: S('tint'), light: S('tintSecondary'), grain: 0.2 } }),
        sticker('tulips', { id: 'tulips', x: 0.86, y: 0.75, w: 0.18, paint: C('#3A3A3A'), paint2: C('#FFFFFF') }),
        ...many('st', [[0.9, 0.1, 0.07], [0.08, 0.5, 0.06], [0.88, 0.38, 0.05], [0.14, 0.72, 0.05]], { shape: 'star5', fill: null, stroke: S('starPrimary'), strokeWidth: 5, texture: 'marker', wobble: 0.3 }),
        ...many('ast', [[0.75, 0.08, 0.05], [0.1, 0.88, 0.05]], { shape: 'asterisk', fill: null, stroke: S('starSecondary'), strokeWidth: 5, texture: 'marker' }),
        text({ id: 'name1', x: 0.5, y: 0.88, text: tr({ en: 'first name', pt: 'nome' }), font: 'marker', paint: S('text'), size: 0.06, rot: -3 }),
        text({ id: 'name2', x: 0.52, y: 0.94, text: tr({ en: 'last name', pt: 'sobrenome' }), font: 'marker', paint: S('starPrimary'), size: 0.045, rot: -2 }),
        shape({ id: 'oval', shape: 'oval', x: 0.5, y: 0.9, w: 0.56, h: 0.3, fill: null, stroke: S('starPrimary'), strokeWidth: 4, texture: 'marker' })
      ]
    },
    // 21
    {
      id: 'holo-star-frame', name: { en: 'Holo Star Frame', pt: 'Moldura de Estrelas Holo' }, ratio: '3:4', tags: ['stars', 'booth'], photos: 1,
      palette: 'pastel-holo', colors: { frame: '#FFFFFF', background: '#F4F1EC', starPrimary: '#3DAA3D', starSecondary: '#E0281E', doodleFill: '#F2994A', accent: '#3A7BEA' },
      slots: ['frame', 'background', 'starPrimary', 'starSecondary', 'doodleFill', 'accent'],
      layers: [
        bg({ texture: 'paper' }),
        photo({ w: 0.62, rot: 90, aspect: 4 / 3, frame: 'white', frameMargin: 0.07, framePaint: S('frame'), shadow: true, treatment: { type: 'warm', amount: 0.4, grain: 0.12 } }),
        ...(() => {
          const r = rng(21);
          const mats: [string, Paint][] = [['holo', S('starPrimary')], ['puffy', S('starPrimary')], ['puffy', S('starSecondary')], ['puffy', S('doodleFill')], ['puffy', S('accent')], ['metallic', C('#E8C04A')], ['metallic', C('#D8DCE4')]];
          return Array.from({ length: 28 }, (_, i) => {
            // Every third star is cut by the canvas edge, the rest sit on the print and its frame.
            const edge = i % 3 === 0;
            const a = r() * Math.PI * 2;
            const x = edge ? (i % 2 ? 0.01 : 0.99) : 0.5 + Math.cos(a) * (0.3 + r() * 0.15);
            const y = edge ? 0.05 + r() * 0.9 : 0.5 + Math.sin(a) * (0.38 + r() * 0.1);
            const [m, paint] = mats[i % mats.length];
            return shape({ id: `holo${i}`, shape: 'star5', x, y, w: 0.06 + r() * 0.05, rot: (r() - 0.5) * 50, material: m, rounded: true, fill: paint, seed: 200 + i });
          });
        })()
      ]
    },
    // 22
    {
      id: 'fairy-chase', name: { en: 'Fairy Chase', pt: 'Caça às Fadas' }, ratio: '4:5', tags: ['nature', 'scrapbook'], photos: 1,
      palette: 'sky-zine', colors: { wings: '#9AB08A', wings2: '#F2D04A', thread: '#D8281E', pins: '#FFFFFF', starPrimary: '#F2D23A', paper: '#FFFFFF', text: '#1A1A1A' },
      slots: ['wings', 'wings2', 'thread', 'pins', 'starPrimary', 'paper', 'text'],
      layers: [
        bg({ style: 'photo', overlay: 'poster', treatment: { type: 'grade', tint: C('#5AB0F0'), amount: 0.35, contrast: 1.15, fade: 0.05, grain: 0.3, saturation: 1.2 } }),
        sticker('wings', { id: 'wings', x: 0.5, y: 0.38, w: 0.95, paint: S('wings'), paint2: S('wings2'), edge: false }),
        photo({ y: 0.56, w: 0.78, cutout: 'sticker', outline: C('#FFFFFF'), outlineWidth: 12 }),
        { id: 'thread', kind: 'ribbon', of: 'photo', straight: true, pins: S('pins'), x: 0.5, y: 0.56, w: 0.8, h: 0.7, rot: 0, width: 4, paint: S('thread'), texture: 'none', points: [[0.15, 0.1], [0.85, 0.25], [0.1, 0.5], [0.9, 0.62], [0.2, 0.9], [0.8, 0.95]], weave: [false, true, false, true, false] } as Layer,
        sticker('goldfish', { id: 'fish1', x: 0.14, y: 0.2, w: 0.2, rot: -15, edge: true }),
        sticker('goldfish', { id: 'fish2', x: 0.85, y: 0.82, w: 0.17, rot: 160, edge: true }),
        sticker('apple', { id: 'apple', x: 0.86, y: 0.14, w: 0.14, edge: true }),
        ...many('ystar', [[0.3, 0.08, 0.05], [0.7, 0.1, 0.04], [0.07, 0.62, 0.05], [0.94, 0.48, 0.045], [0.15, 0.9, 0.04], [0.6, 0.93, 0.04]], { shape: 'paperStar', fill: S('starPrimary'), texture: 'paper', wobble: 0.6 }),
        text({ id: 'label1', x: 0.25, y: 0.76, text: tr({ en: 'the', pt: 'a' }), font: 'typewriter', paint: S('text'), bg: S('paper'), size: 0.035, rot: -4 }),
        text({ id: 'label2', x: 0.3, y: 0.81, text: tr({ en: 'chase', pt: 'caçada' }), font: 'typewriter', paint: S('text'), bg: S('paper'), size: 0.035, rot: 3 })
      ]
    },
    // 23
    {
      id: 'forest-elf', name: { en: 'Forest Elf', pt: 'Elfo da Floresta' }, ratio: '6:7', tags: ['nature', 'paper'], photos: 1,
      palette: 'olive-love', colors: { background: '#8A8A4A', doodleFill: '#F2D41A', river: '#3A7AB0', moss: '#5A7A2A' },
      slots: ['background', 'doodleFill', 'river', 'moss'],
      layers: [
        bg({ texture: 'crumpled' }),
        sticker('tree', { id: 'tree', x: 0.84, y: 0.45, w: 0.45, paint: S('moss'), paint2: C('#5A3A1A') }),
        shape({ id: 'halo', shape: 'burst', x: 0.48, y: 0.3, w: 0.62, points: 18, fill: S('doodleFill'), texture: 'paper', wobble: 0.35, seed: 3 }),
        shape({ id: 'burst2', shape: 'burst', x: 0.13, y: 0.32, w: 0.26, points: 14, fill: S('doodleFill'), texture: 'paper', wobble: 0.3, seed: 4 }),
        sticker('river', { id: 'river', x: 0.5, y: 0.92, w: 1.05, paint: S('river'), paint2: C('#A8D8F0') }),
        sticker('rock', { id: 'rock1', x: 0.48, y: 0.82, w: 0.6, paint: S('moss'), paint2: C('#7A7A6A') }),
        sticker('rock', { id: 'rock2', x: 0.12, y: 0.85, w: 0.3, paint: S('moss'), paint2: C('#7A7A6A'), seed: 3 }),
        photo({ y: 0.5, w: 0.66, cutout: 'clean', shadow: true }),
        sticker('mushroom', { id: 'mush1', x: 0.33, y: 0.85, w: 0.1, paint: C('#D8281E'), paint2: C('#F6EEDC') }),
        sticker('mushroom', { id: 'mush2', x: 0.41, y: 0.88, w: 0.07, paint: C('#D8281E'), paint2: C('#F6EEDC'), seed: 2 })
      ]
    },
    // 24
    {
      id: 'felt-quilt-day', name: { en: 'Felt Quilt Day', pt: 'Dia de Feltro' }, ratio: '1:1', tags: ['nature', 'paper'], photos: 1,
      palette: 'crayon-pop', colors: { strip1: '#1E2A5A', strip2: '#8FC8F0', strip3: '#F2C21A', strip4: '#D8281E', strip5: '#5A6A2A', outline: '#F5A81A', doodleStroke: '#FFFFFF' },
      slots: ['strip1', 'strip2', 'strip3', 'strip4', 'strip5', 'outline', 'doodleStroke'],
      layers: [
        bg({ style: 'quilt', paints: [S('strip1'), S('strip2'), S('strip3'), S('strip4'), S('strip5')], felt: true }),
        sticker('feltMoon', { id: 'moon', x: 0.12, y: 0.12, w: 0.12 }),
        sticker('feltSun', { id: 'sun', x: 0.84, y: 0.17, w: 0.24 }),
        sticker('feltTree', { id: 'tree1', x: 0.1, y: 0.68, w: 0.14 }),
        sticker('feltTree', { id: 'tree2', x: 0.9, y: 0.66, w: 0.13, seed: 2 }),
        photo({ y: 0.58, w: 0.62, cutout: 'sticker', outline: S('outline'), outlineWidth: 26 }),
        { id: 'stitch', kind: 'outline', of: 'photo', x: 0.5, y: 0.5, w: 1, rot: 0, distance: 12, width: 4, paint: S('doodleStroke'), texture: 'none', dash: true } as Layer,
        sticker('bee', { id: 'bee1', x: 0.25, y: 0.4, w: 0.07 }), sticker('bee', { id: 'bee2', x: 0.78, y: 0.42, w: 0.06, flip: true }),
        sticker('ladybug', { id: 'lady', x: 0.3, y: 0.9, w: 0.06 }), sticker('snail', { id: 'snail', x: 0.72, y: 0.92, w: 0.1 }),
        sticker('bunny', { id: 'bunny1', x: 0.14, y: 0.9, w: 0.09 }), sticker('bunny', { id: 'bunny2', x: 0.9, y: 0.9, w: 0.08, flip: true })
      ]
    },
    // 25
    {
      id: 'meet-the-artist', name: { en: 'Meet the Artist', pt: 'Conheça a Artista' }, ratio: '3:4', tags: ['halftone', 'scrapbook'], photos: 1,
      palette: 'pastel-holo', colors: { tint: '#F0447A', tintSecondary: '#F6E6C8', paper: '#F0447A', paper2: '#F2F0A0', starPrimary: '#F0447A', starSecondary: '#F2E04A', text: '#1A1A1A', accent: '#F0447A' },
      slots: ['tint', 'tintSecondary', 'paper', 'paper2', 'starPrimary', 'accent', 'text'],
      layers: [
        bg({ style: 'photo', overlay: 'folds', treatment: { type: 'sepia', amount: 0.5, fade: 0.4, grain: 0.3 } }),
        { id: 'torn1', kind: 'torn', x: 0.5, y: 0.56, w: 0.84, h: 0.68, rot: 3, paint: S('paper'), points: 9, print: 0, seed: 25 } as Layer,
        { id: 'torn2', kind: 'torn', x: 0.49, y: 0.57, w: 0.72, h: 0.58, rot: -2, paint: S('paper2'), points: 8, print: 0, seed: 26 } as Layer,
        photo({ y: 0.58, w: 0.66, cutout: 'clean', treatment: { type: 'halftone', dot: 4, ink: S('tint'), paper: S('tintSecondary') } }),
        ...many('sp', [[0.12, 0.2, 0.1], [0.88, 0.3, 0.08], [0.1, 0.8, 0.07]], { shape: 'burst', points: 10, fill: S('starPrimary'), wobble: 0.4 }),
        ...many('sy', [[0.86, 0.62, 0.09], [0.2, 0.4, 0.06]], { shape: 'burst', points: 9, fill: S('starSecondary'), wobble: 0.4 }),
        ...many('hrt', [[0.78, 0.88, 0.06], [0.25, 0.92, 0.05], [0.92, 0.14, 0.05]], { shape: 'heart', fill: S('accent') }),
        { id: 'scrib', kind: 'scribble', of: 'photo', x: 0.5, y: 0.5, w: 1, h: 1, rot: 0, paint: S('accent'), density: 0.08, width: 4, padding: 80, seed: 3 } as Layer,
        text({ id: 'tag1', x: 0.3, y: 0.12, text: tr({ en: 'MEET THE ARTIST', pt: 'CONHEÇA A ARTISTA' }), font: 'display', paint: C('#FFFFFF'), bg: S('accent'), bgStyle: 'tag', size: 0.04, rot: -8 }),
        text({ id: 'tag2', x: 0.7, y: 0.92, text: tr({ en: 'YOUR NAME', pt: 'SEU NOME' }), font: 'display', paint: S('text'), bg: S('starSecondary'), bgStyle: 'tag', size: 0.04, rot: 6 }),
        sticker('cameraCard', { id: 'card1', x: 0.88, y: 0.46, w: 0.13, rot: 10, paint: S('accent') }),
        sticker('cameraCard', { id: 'card2', x: 0.12, y: 0.62, w: 0.12, rot: -8, paint: S('accent') })
      ]
    },
    // 26
    {
      id: 'bed-diary', name: { en: 'Bed Diary', pt: 'Diário na Cama' }, ratio: '4:5', tags: ['doodle', 'stars'], photos: 1,
      palette: 'mono-paper', colors: { background: '#FFFFFF', doodleFill: '#E86ADF', doodleStroke: '#E8281E', text: '#1A1A1A', paper: '#FFFFFF' },
      slots: ['background', 'doodleFill', 'doodleStroke', 'text', 'paper'],
      layers: [
        bg({ texture: 'paper' }),
        { id: 'square', kind: 'scribble', x: 0.5, y: 0.52, w: 0.78, h: 0.56, rot: 0, paint: S('doodleFill'), density: 3.2, width: 16, padding: 0, seed: 9 } as Layer,
        photo({ y: 0.55, w: 0.5, aspect: 1, treatment: BW(1.3, 0.45) }),
        { id: 'pop', kind: 'subject', of: 'photo', x: 0.5, y: 0.5, w: 1, rot: 0, cutout: 'clean' } as Layer,
        shape({ id: 'censor', shape: 'bar', x: 0.5, y: 0.37, w: 0.32, h: 0.22, rot: -4, fill: S('paper'), texture: 'chalk', seed: 4 }),
        ...arc(11, 0.5, 0.36, 0.38, 0.26, 190, 350).map(([x, y], i) => shape({ id: `ring${i}`, shape: 'star5', x, y, w: 0.07, rot: i * 13, fill: null, stroke: S('doodleStroke'), strokeWidth: 5, texture: 'crayon', wobble: 0.35, seed: 300 + i })),
        text({ id: 'caption', x: 0.5, y: 0.87, text: tr({ en: 'dear diary,\ntoday was a good day', pt: 'querido diário,\nhoje foi um bom dia' }), font: 'script', paint: S('text'), size: 0.04, rot: -2 })
      ]
    },
    // 27
    {
      id: 'pink-scribble', name: { en: 'Pink Scribble', pt: 'Rabisco Rosa' }, ratio: '4:5', tags: ['doodle'], photos: 1,
      palette: 'pastel-holo', colors: { doodleStroke: '#F07AA0' }, slots: ['doodleStroke'],
      layers: [
        bg({ paint: C('#FFFFFF') }),
        photo({ w: 1, aspect: 0.8, treatment: BW(1.15, 0.35) }),
        { id: 'scribble', kind: 'scribble', of: 'photo', x: 0.5, y: 0.5, w: 1, h: 1, rot: 0, paint: S('doodleStroke'), density: 2.4, width: 10, padding: 40, seed: 27 } as Layer,
        { id: 'draw', kind: 'draw', x: 0.5, y: 0.5, w: 1, rot: 0, strokes: [] } as Layer
      ]
    },
    // 28
    {
      id: 'blue-sticker-face', name: { en: 'Blue Sticker Face', pt: 'Rosto Azul' }, ratio: '3:5', tags: ['stars', 'halftone'], photos: 1,
      palette: 'cobalt-duotone', colors: { tint: '#3A2AE0', tintSecondary: '#FFFFFF', doodleStroke: '#111111' }, slots: ['tint', 'doodleStroke'],
      layers: [
        bg({ paint: C('#FFFFFF') }),
        photo({ w: 1, aspect: 0.6, anchor: 'face', zoom: 1.2, treatment: { type: 'mono', tint: S('tint'), paper: S('tintSecondary'), grain: 0.6 } }),
        ...many('cs', [[0.3, 0.12, 0.08], [0.5, 0.08, 0.06], [0.66, 0.14, 0.09], [0.4, 0.2, 0.05], [0.58, 0.24, 0.05], [0.24, 0.26, 0.06], [0.75, 0.3, 0.05]], { shape: 'star5', fill: S('doodleStroke'), texture: 'crayon', wobble: 0.3 }),
        shape({ id: 'bigstar', shape: 'star5', x: 0.85, y: 0.5, w: 0.2, rot: 12, fill: S('doodleStroke'), texture: 'crayon', wobble: 0.3, seed: 88 }),
        ...many('ex', [[0.85, 0.36, 0.04, -30], [0.94, 0.42, 0.04, 20], [0.78, 0.38, 0.035, -60]], { shape: 'exclaim', fill: S('doodleStroke'), texture: 'crayon' })
      ]
    },
    // 29
    {
      id: 'sunburst-pop', name: { en: 'Sunburst Pop', pt: 'Explosão de Sol' }, ratio: '3:4', tags: ['comic', 'paper'], photos: 1,
      palette: 'burnt-orange', colors: { background: '#E8D2A8', backgroundSecondary: '#F2B070', outline: '#F28A1A', outlineSecondary: '#1E2A5A', doodleFill: '#E0281E', starPrimary: '#F2D21A', doodleStroke: '#E0281E' },
      slots: ['background', 'backgroundSecondary', 'outline', 'outlineSecondary', 'doodleFill', 'starPrimary', 'doodleStroke'],
      layers: [
        bg({ style: 'sunburst', paint: S('background'), paint2: S('backgroundSecondary'), texture: 'crumpled' }),
        { id: 'shadow', kind: 'subject', of: 'photo', x: 0.5, y: 0.5, w: 1, rot: 0, cutout: 'silhouette', fill: S('outlineSecondary'), dx: 0.025, dy: 0.015 } as Layer,
        photo({ y: 0.58, w: 0.8, cutout: 'clean', treatment: grade('outline', 0.25, { grain: 0.55, saturation: 1.15 }) }),
        { id: 'line', kind: 'outline', of: 'photo', x: 0.5, y: 0.5, w: 1, rot: 0, distance: 10, width: 7, paint: S('outline'), texture: 'crayon' } as Layer,
        ...[[0.14, 0.2, -15], [0.86, 0.35, 20], [0.18, 0.62, 10]].flatMap(([x, y, rot], i) => [
          shape({ id: `boltShadow${i}`, shape: 'bolt', x: x + 0.012, y: y + 0.01, w: 0.14, rot, fill: S('outlineSecondary') }),
          shape({ id: `bolt${i}`, shape: 'bolt', x, y, w: 0.14, rot, fill: S('doodleFill'), material: 'metallic' })
        ]),
        shape({ id: 'corner', shape: 'burst', x: 0.88, y: 0.1, w: 0.22, points: 14, fill: S('starPrimary'), stroke: S('doodleStroke'), strokeWidth: 6, texture: 'crayon', seed: 29 })
      ]
    },
    // 30
    {
      id: 'sketch-aura', name: { en: 'Sketch Aura', pt: 'Aura Desenhada' }, ratio: '3:4', tags: ['doodle', 'comic'], photos: 1,
      palette: 'crayon-pop', colors: { doodleFill: '#3A62D0', doodleStroke: '#F2D21A', paper3: '#FFFFFF', accent: '#F28CC0', tint: '#8A5A33' },
      slots: ['doodleFill', 'doodleStroke', 'paper3', 'accent'],
      layers: [
        bg({ style: 'photo', treatment: grade('tint', 0.45, { saturation: 0.9 }) }),
        shape({ id: 'zig', shape: 'burst', x: 0.5, y: 0.45, w: 0.98, points: 22, fill: null, stroke: S('doodleStroke'), strokeWidth: 9, texture: 'crayon', wobble: 0.5, seed: 30 }),
        shape({ id: 'aura', shape: 'burst', x: 0.5, y: 0.45, w: 0.82, points: 20, fill: S('doodleFill'), texture: 'crayon', wobble: 0.5, seed: 31 }),
        ...many('sw', [[0.2, 0.25, 0.08], [0.8, 0.3, 0.07], [0.25, 0.6, 0.06]], { shape: 'swirl', fill: null, stroke: S('accent'), strokeWidth: 5, texture: 'crayon' }),
        ...many('sk', [[0.7, 0.15, 0.06], [0.3, 0.12, 0.05]], { shape: 'star4', fill: null, stroke: S('paper3'), strokeWidth: 4, texture: 'chalk' }),
        ...many('as', [[0.85, 0.55, 0.05], [0.14, 0.42, 0.04]], { shape: 'asterisk', fill: null, stroke: S('accent'), strokeWidth: 4 }),
        photo({ y: 0.6, w: 0.78, cutout: 'clean' }),
        { id: 'line', kind: 'outline', of: 'photo', x: 0.5, y: 0.5, w: 1, rot: 0, distance: 6, width: 8, paint: S('doodleStroke'), texture: 'crayon' } as Layer,
        { id: 'sketch', kind: 'sketch', of: 'photo', x: 0.5, y: 0.5, w: 1, rot: 0, paint: S('paper3'), density: 0.8, width: 2.5, hatch: true } as Layer,
        shape({ id: 'face', shape: 'star5', x: 0.56, y: 0.33, w: 0.04, fill: S('doodleFill') })
      ]
    },
    // 31
    {
      id: 'graffiti-night', name: { en: 'Graffiti Night', pt: 'Noite de Grafite' }, ratio: '3:4', tags: ['doodle', 'comic'], photos: 1,
      palette: 'pastel-holo', colors: { tint: '#7A3AE0', tintSecondary: '#F8A0D0', starPrimary: '#F28A1A', starSecondary: '#F05A9A', accent: '#9A3AE0', doodleStroke: '#1F9A8F', doodleFill: '#F2D21A', frame: '#F2C04A' },
      slots: ['tint', 'tintSecondary', 'starPrimary', 'starSecondary', 'accent', 'doodleStroke', 'doodleFill'],
      layers: [
        bg({ paint: C('#0A0A0A') }),
        photo({ w: 1, aspect: 0.75, treatment: grade('frame', 0.45, { contrast: 1.35 }) }),
        ...[[0.32, 0.3, 0.26, 0.16], [0.66, 0.5, 0.3, 0.14], [0.4, 0.72, 0.22, 0.18], [0.78, 0.22, 0.18, 0.12]].map(([x, y, w, h], i) =>
          ({ id: `crop${i}`, kind: 'cropwin', of: 'photo', x, y, w, h, rot: 0, treatment: { type: 'posterize', levels: 4, dark: S('tint'), light: S('tintSecondary') }, guide: C('#FFFFFF') } as Layer)),
        ...many('o4', [[0.15, 0.12, 0.16], [0.86, 0.66, 0.14]], { shape: 'star4', fill: null, stroke: S('starPrimary'), strokeWidth: 7, wobble: 0.3 }),
        ...many('o5', [[0.18, 0.55, 0.14], [0.6, 0.9, 0.12]], { shape: 'star5', fill: null, stroke: S('starSecondary'), strokeWidth: 7, wobble: 0.3 }),
        shape({ id: 'o6', shape: 'star5', x: 0.82, y: 0.86, w: 0.1, fill: null, stroke: S('accent'), strokeWidth: 7 }),
        ...many('sq', [[0.3, 0.9, 0.22], [0.6, 0.08, 0.2]], { shape: 'squiggle', fill: null, stroke: S('doodleStroke'), strokeWidth: 7, texture: 'marker' }),
        shape({ id: 'sq3', shape: 'squiggle', x: 0.1, y: 0.35, w: 0.15, rot: 80, fill: null, stroke: S('doodleFill'), strokeWidth: 6 }),
        shape({ id: 'checker', shape: 'checker', x: 0.88, y: 0.1, w: 0.16, points: 5, fill: S('accent') }),
        shape({ id: 'marks', shape: 'corners', x: 0.88, y: 0.1, w: 0.2, fill: null, stroke: S('starPrimary'), strokeWidth: 5 })
      ]
    },
    // 32
    {
      id: 'memory-halftone', name: { en: 'Memory Halftone', pt: 'Memória Reticulada' }, ratio: '3:4', tags: ['halftone', 'doodle'], photos: 1,
      palette: 'crayon-pop', colors: { tint: '#E040C0', tintSecondary: '#A8F0C8', starPrimary: '#F2D21A', starSecondary: '#2A62E0', doodleFill: '#E0281E', paper: '#FFFFFF' },
      slots: ['tint', 'tintSecondary', 'starPrimary', 'starSecondary', 'doodleFill'],
      layers: [
        bg({ paint: C('#FFFFFF') }),
        photo({ w: 1, aspect: 0.75, treatment: { type: 'halftone', dot: 7, ink: C('#111111'), paper: C('#F4F2EE'), square: true } }),
        photo({ id: 'slot1', x: 0.5, y: 0.26, w: 0.36, aspect: 2.2, anchor: 'eyes', zoom: 2.8, frame: 'white', frameMargin: 0.03, treatment: { type: 'overlay', color: S('tint'), mode: 'multiply', opacity: 0.85 } }),
        photo({ id: 'slot2', x: 0.44, y: 0.37, w: 0.3, aspect: 2.2, anchor: 'mouth', zoom: 3, frame: 'white', frameMargin: 0.03, rot: -3, treatment: BW(1.1, 0.2) }),
        photo({ id: 'slot3', x: 0.56, y: 0.47, w: 0.32, aspect: 2.2, anchor: 'face', zoom: 2.2, frame: 'white', frameMargin: 0.03, rot: 4, treatment: { type: 'negative', tint: S('tintSecondary'), paper: C('#0A0A0A'), grain: 0.1 } }),
        ...many('spi', [[0.15, 0.15, 0.12], [0.86, 0.3, 0.1], [0.18, 0.66, 0.1], [0.84, 0.78, 0.12]], { shape: 'swirl', fill: null, strokeWidth: 7, texture: 'crayon', stroke: S('starPrimary') }).map((l, i) => ({ ...l, stroke: S(['starPrimary', 'starSecondary', 'doodleFill', 'paper'][i]) } as Layer)),
        shape({ id: 'crown', shape: 'crown', x: 0.5, y: 0.1, w: 0.3, points: 5, fill: S('starPrimary'), texture: 'crayon', seed: 32 }),
        shape({ id: 'wburst', shape: 'burst', x: 0.82, y: 0.12, w: 0.16, points: 14, fill: S('paper') }),
        shape({ id: 'splat1', shape: 'splat', x: 0.12, y: 0.88, w: 0.16, fill: S('doodleFill'), seed: 3 }),
        shape({ id: 'splat2', shape: 'splat', x: 0.88, y: 0.92, w: 0.14, fill: S('starSecondary'), seed: 5 })
      ]
    },
    // 33
    {
      id: 'journal-spiky', name: { en: 'Journal Spiky', pt: 'Diário Espinhoso' }, ratio: '4:5', tags: ['scrapbook', 'halftone'], photos: 3,
      palette: 'olive-love', colors: { outline: '#E8A020', doodleFill: '#1E7A5A', doodleStroke: '#FFFFFF', starPrimary: '#FFFFFF' },
      slots: ['outline', 'doodleFill', 'doodleStroke', 'starPrimary'],
      layers: [
        bg({ style: 'journal' }),
        photo({ id: 'ghost1', photo: 1, x: 0.22, y: 0.2, w: 0.42, rot: 180, cutout: 'clean', treatment: { type: 'halftone', dot: 3, ink: C('#111111'), paper: C('#EEEEEE') } }),
        photo({ id: 'ghost2', photo: 2, x: 0.92, y: 0.55, w: 0.45, rot: -8, cutout: 'clean', treatment: { type: 'halftone', dot: 3, ink: C('#111111'), paper: C('#EEEEEE') } }),
        shape({ id: 'spikes', shape: 'spiky', x: 0.5, y: 0.3, w: 0.7, h: 0.6, points: 11, fill: S('doodleFill'), seed: 33 }),
        photo({ y: 0.58, w: 0.76, cutout: 'sticker', outline: S('outline'), outlineWidth: 22, roughEdge: true }),
        { id: 'stitch', kind: 'outline', of: 'photo', x: 0.5, y: 0.5, w: 1, rot: 0, distance: 10, width: 4, paint: S('doodleStroke'), texture: 'none', dash: true } as Layer,
        ...many('tape', [[0.3, 0.1, 0.2, -20], [0.75, 0.9, 0.22, 15]], { shape: 'rect', h: 0.28, fill: C('#FFFFFF55') }),
        sticker('flower', { id: 'fl1', x: 0.1, y: 0.85, w: 0.14, rot: -20 }), sticker('flower', { id: 'fl2', x: 0.88, y: 0.14, w: 0.12, rot: 30, seed: 2 }),
        ...many('ws', [[0.2, 0.45, 0.05], [0.84, 0.3, 0.04], [0.65, 0.12, 0.04], [0.3, 0.92, 0.04]], { shape: 'star5', fill: null, stroke: S('starPrimary'), strokeWidth: 4, wobble: 0.3 })
      ]
    },
    // 34
    {
      id: 'comic-burst', name: { en: 'Comic Burst', pt: 'Explosão em Quadrinhos' }, ratio: '20:19', tags: ['comic', 'duo'], photos: 2,
      palette: 'crayon-pop', colors: { doodleFill: '#6A50B0', starSecondary: '#E0281E', background: '#F2E6B8', tint: '#6A50B0', tintSecondary: '#D8C8F8' },
      slots: ['doodleFill', 'starSecondary', 'background'],
      layers: [
        bg({ style: 'comic', paint: S('background') }),
        shape({ id: 'outer', shape: 'burst', x: 0.5, y: 0.5, w: 0.98, points: 16, fill: S('starSecondary'), texture: 'paper', wobble: 0.3, seed: 34 }),
        photo({ id: 'inside', x: 0.5, y: 0.5, w: 0.8, aspect: 1.05, cutout: 'window', windowShape: 'burst', treatment: { type: 'duotone', dark: S('tint'), light: S('tintSecondary'), grain: 0.2 } }),
        photo({ x: 0.36, y: 0.6, w: 0.56, cutout: 'sticker', outline: C('#FFFFFF'), outlineWidth: 10 }),
        photo({ id: 'photo2', photo: 1, x: 0.66, y: 0.62, w: 0.52, cutout: 'sticker', outline: C('#FFFFFF'), outlineWidth: 10 })
      ]
    },
    // 35
    {
      id: 'pattern-patch', name: { en: 'Pattern Patch', pt: 'Retalhos de Padrão' }, ratio: '3:4', tags: ['halftone', 'scrapbook'], photos: 1,
      palette: 'mono-paper', colors: { background: '#F6F0EA', starPrimary: '#C8186A', patch1: '#F28CC0', patch2: '#1F9A8F', patch3: '#E0281E', patch4: '#F2C230' },
      slots: ['background', 'starPrimary', 'patch1', 'patch2', 'patch3', 'patch4'],
      layers: [
        bg({ texture: 'paper' }),
        photo({ y: 0.56, w: 0.9, cutout: 'clean', treatment: { type: 'halftone', dot: 3, ink: C('#111111'), paper: C('#F6F0EA') } }),
        { id: 'patches', kind: 'patchwork', of: 'photo', x: 0.5, y: 0.5, w: 1, rot: 0, count: 14, share: 0.5, patterns: ['sky', 'spots', 'stripes', 'swirls', 'dots', 'shapes', 'gradient', 'plaid'] as PatchworkPattern[], paints: [S('patch1'), S('patch2'), S('patch3'), S('patch4')], seed: 35 } as Layer,
        shape({ id: 'eyestar', shape: 'star5', x: 0.42, y: 0.3, w: 0.16, rot: -10, fill: S('starPrimary') })
      ]
    },
    // 36
    {
      id: 'neon-painted', name: { en: 'Neon Painted', pt: 'Pintura Neon' }, ratio: '1:1', tags: ['comic'], photos: 1,
      palette: 'pastel-holo', colors: { background: '#F0247A', doodleStroke: '#7A1FD0', frame: '#F8F020' }, slots: ['background', 'doodleStroke', 'frame'],
      layers: [
        bg({ texture: 'paper' }),
        ...many('vd', [[0.1, 0.12, 0.12], [0.9, 0.15, 0.1], [0.12, 0.85, 0.1], [0.88, 0.88, 0.12]], { shape: 'swirl', fill: null, stroke: S('doodleStroke'), strokeWidth: 6, texture: 'marker' }),
        photo({ y: 0.54, w: 0.95, cutout: 'clean', treatment: { type: 'paint', scheme: 'neon', lines: 0.6, hatch: S('frame') } }),
        photo({ id: 'window', x: 0.5, y: 0.42, w: 0.34, aspect: 1, anchor: 'eyes', zoom: 3, cutout: 'window', windowShape: 'star4', stroke: S('frame'), strokeWidth: 7, glow: S('frame') })
      ]
    },
    // 37
    {
      id: 'paint-window-swirl', name: { en: 'Paint Window Swirl', pt: 'Janela Espiral' }, ratio: '4:5', tags: ['desktop'], photos: 1,
      palette: 'mono-paper', colors: { accent: '#2A3CE0', doodleStroke: '#111111', paper3: '#FFFFFF', tint: '#B8E01A', frame: '#0A246A' },
      slots: ['accent', 'doodleStroke', 'tint', 'paper3', 'frame'],
      layers: [
        bg({ paint: C('#111111') }),
        // Black and white photo everywhere, the person in color on top, so head and hands break out of the window.
        photo({ w: 1, aspect: 0.8, treatment: BW(1.2, 0.2) }),
        { id: 'swirls', kind: 'waves', mode: 'contour', x: 0.5, y: 0.5, w: 1.3, h: 1.2, rot: 0, count: 14, paints: [S('doodleStroke'), S('paper3')], width: 10, amp: 0.25, texture: 'none', seed: 37 } as Layer,
        shape({ id: 'glow', shape: 'circle', x: 0.5, y: 0.55, w: 0.8, fill: S('accent'), opacity: 0.65 }),
        { id: 'win', kind: 'ui', widget: 'window', x: 0.5, y: 0.6, w: 0.7, h: 0.42, rot: 0, title: tr({ en: 'untitled - Doodle Pad', pt: 'sem título - Bloco de Rabiscos' }), paint: S('frame'), glow: C('#FFFFFF') } as Layer,
        { id: 'inside', kind: 'cropwin', of: 'photo', x: 0.5, y: 0.625, w: 0.66, h: 0.35, rot: 0, treatment: { type: 'none' }, guide: C('#00000000') } as Layer,
        { id: 'pop', kind: 'subject', of: 'photo', x: 0.5, y: 0.5, w: 1, rot: 0, cutout: 'clean', treatment: { type: 'none' } } as Layer,
        photo({ id: 'eye', x: 0.72, y: 0.3, w: 0.2, aspect: 1.5, anchor: 'eyes', zoom: 4, stroke: C('#FFFFFF'), strokeWidth: 3, treatment: { type: 'overlay', color: S('tint'), mode: 'multiply', opacity: 0.9 } }),
        ...many('sp', [[0.82, 0.08, 0.07], [0.92, 0.16, 0.05], [0.75, 0.14, 0.04]], { shape: 'star4', fill: S('paper3') })
      ]
    },
    // 38
    {
      id: 'desktop-corner', name: { en: 'Desktop Corner', pt: 'Canto do Desktop' }, ratio: '1:1', tags: ['desktop'], photos: 1,
      palette: 'mono-paper', colors: { frame: '#9EF09A', tint: '#7FA8A8', accent: '#F2C21A', text: '#FFFFFF', starPrimary: '#F28CC0', backgroundSecondary: '#0A246A' },
      slots: ['frame', 'tint', 'accent', 'starPrimary'],
      layers: [
        bg({ paint: C('#101010') }),
        photo({ w: 1, aspect: 1, treatment: grade('tint', 0.55, { fade: 0.15, grain: 0.4 }) }),
        { id: 'boxes', kind: 'boxes', of: 'photo', x: 0.5, y: 0.5, w: 1, rot: 0, targets: ['face', 'hands', 'feet'] as Anchor[], paint: S('frame'), width: 3, rounded: false, pointer: true } as Layer,
        photo({ id: 'zoomFace', x: 0.8, y: 0.2, w: 0.26, aspect: 1, anchor: 'face', zoom: 3, stroke: S('frame'), strokeWidth: 3, treatment: grade('tint', 0.4) }),
        photo({ id: 'zoomHands', x: 0.8, y: 0.47, w: 0.22, aspect: 1, anchor: 'hands', zoom: 3, stroke: S('frame'), strokeWidth: 3, treatment: grade('tint', 0.4) }),
        { id: 'w1', kind: 'ui', widget: 'window', content: 'photo', anchor: 'feet', zoom: 3, x: 0.72, y: 0.8, w: 0.3, h: 0.22, rot: 0, title: 'shoe.png', paint: S('backgroundSecondary') } as Layer,
        { id: 'w2', kind: 'ui', widget: 'window', content: 'photo', anchor: 'body', zoom: 1.5, x: 0.42, y: 0.88, w: 0.28, h: 0.2, rot: 0, title: 'floor.png', paint: S('backgroundSecondary') } as Layer,
        ...([['pc', tr({ en: 'My Computer', pt: 'Meu Computador' })], ['folder', tr({ en: 'Documents', pt: 'Documentos' })], ['globe', 'Browser'], ['image', tr({ en: 'Network', pt: 'Rede' })], ['trash', tr({ en: 'Trash', pt: 'Lixeira' })]] as const)
          .map(([icon, label], i) => ({ id: `icon${i}`, kind: 'ui', widget: 'icon', icon, label, x: 0.09, y: 0.1 + i * 0.16, w: 0.13, rot: 0, paint2: S('accent'), text: S('text') } as Layer)),
        shape({ id: 'vf', shape: 'corners', x: 0.5, y: 0.5, w: 0.94, h: 0.94, fill: null, stroke: S('starPrimary'), strokeWidth: 5 })
      ]
    },
    // 39
    {
      id: 'green-flash-stars', name: { en: 'Green Flash Stars', pt: 'Estrelas de Flash Verde' }, ratio: '4:5', tags: ['stars', 'booth'], photos: 2,
      palette: 'olive-love', colors: { tint: '#6A7A1A', outline: '#FFFFFF', frame: '#F2EAD0' }, slots: ['tint', 'outline', 'frame'],
      layers: [
        bg({ paint: C('#0A0C04') }),
        photo({ x: 0.6, y: 0.5, w: 0.8, aspect: 0.64, treatment: grade('tint', 0.6, { contrast: 1.5, grain: 0.55 }) }),
        photo({ id: 'inset', photo: 1, x: 0.25, y: 0.8, w: 0.36, aspect: 0.8, frame: 'white', frameMargin: 0.035, framePaint: S('frame'), treatment: grade('tint', 0.6, { contrast: 1.5, grain: 0.55 }), shadow: true }),
        photo({ id: 'lips', x: 0.2, y: 0.18, w: 0.3, aspect: 1, anchor: 'mouth', zoom: 4, cutout: 'window', windowShape: 'star', stroke: S('outline'), strokeWidth: 6, treatment: grade('tint', 0.5, { contrast: 1.4 }) }),
        photo({ id: 'detail', x: 0.82, y: 0.84, w: 0.28, aspect: 1, anchor: 'body', zoom: 3, cutout: 'window', windowShape: 'star', stroke: S('outline'), strokeWidth: 6, treatment: grade('tint', 0.5, { contrast: 1.4 }) })
      ]
    },
    // 40
    {
      id: 'lime-contact-strip', name: { en: 'Lime Contact Strip', pt: 'Contato Lima' }, ratio: '6:7', tags: ['booth', 'doodle'], photos: 5,
      palette: 'mustard-teal', colors: { tint: '#9AD06A', doodleStroke: '#FFFFFF', frame: '#101408' }, slots: ['tint', 'doodleStroke', 'frame'],
      layers: [
        bg({ paint: S('frame') }),
        { id: 'layout', kind: 'layout', mode: 'contact', x: 0.5, y: 0.5, w: 1, h: 1, rot: 0, rows: 4, cols: 1, gutter: 10, border: 16, paint: S('frame'), treatment: grade('tint', 0.7, { fade: 0.25, contrast: 1.1 }), cells: [{ photo: 1 }, { photo: 2 }, { photo: 3 }, { photo: 4 }, { photo: 0 }] } as Layer,
        ...many('zz', [[0.62, 0.1, 0.2], [0.85, 0.9, 0.18]], { shape: 'squiggle', fill: null, stroke: S('doodleStroke'), strokeWidth: 4, points: 8 }),
        ...many('ci', [[0.9, 0.25, 0.08], [0.5, 0.85, 0.06]], { shape: 'oval', h: 1, fill: null, stroke: S('doodleStroke'), strokeWidth: 4 }),
        ...many('st', [[0.55, 0.3, 0.05], [0.92, 0.6, 0.06], [0.7, 0.75, 0.04]], { shape: 'star5', fill: null, stroke: S('doodleStroke'), strokeWidth: 4, wobble: 0.3 })
      ]
    },
    // 41
    {
      id: 'eye-strips', name: { en: 'Eye Strips', pt: 'Tiras de Olhar' }, ratio: '3:4', tags: ['paper'], photos: 1,
      palette: 'mono-paper', colors: { background: '#FFFFFF', frame: '#111111' }, slots: ['background', 'frame'],
      layers: [
        bg({ texture: 'paper' }),
        ...([['eyes', 0.4, 0.14, 0], ['mouth', 0.6, 0.3, 0], ['eyes', 0.45, 0.48, 1], ['mouth', 0.58, 0.65, 1], ['eyes', 0.42, 0.83, 0]] as const).map(([anchor, x, y, idx], i) =>
          photo({ id: `strip${i}`, x, y, w: 0.66, aspect: 4.2, anchor, anchorIndex: idx, zoom: anchor === 'eyes' ? 3 : 4, rot: (i % 2 ? 1.5 : -1.5), stroke: S('frame'), strokeWidth: 4, treatment: BW(1.6, 0.2) }))
      ]
    },
    // 42
    {
      id: 'retro-desktop-stack', name: { en: 'Retro Desktop Stack', pt: 'Janelas Empilhadas' }, ratio: '9:16', tags: ['desktop'], photos: 3,
      palette: 'mono-paper', colors: { frame: '#0A246A', accent: '#F2C21A', text: '#FFFFFF' }, slots: ['frame', 'accent', 'text'],
      layers: [
        bg({ style: 'ghost', tiles: 4, blur: 5 }),
        { id: 'trash', kind: 'ui', widget: 'window', content: 'trash', x: 0.3, y: 0.14, w: 0.5, h: 0.17, rot: -2, title: tr({ en: 'Trash', pt: 'Lixeira' }), message: tr({ en: 'empty', pt: 'vazia' }), paint: S('frame'), paint2: S('accent') } as Layer,
        { id: 'player', kind: 'ui', widget: 'window', content: 'player', photo: 1, x: 0.65, y: 0.32, w: 0.62, h: 0.24, rot: 2, title: 'player.exe', paint: S('frame'), paint2: S('accent') } as Layer,
        { id: 'paintwin', kind: 'ui', widget: 'window', content: 'photo', photo: 0, anchor: 'body', x: 0.4, y: 0.55, w: 0.7, h: 0.3, rot: -1, title: tr({ en: 'untitled - Doodle Pad', pt: 'sem título - Bloco de Rabiscos' }), paint: S('frame') } as Layer,
        { id: 'notes', kind: 'ui', widget: 'window', content: 'notes', photo: 2, x: 0.62, y: 0.77, w: 0.6, h: 0.24, rot: 1.5, title: 'notes.txt', paint: S('frame') } as Layer,
        ...([['pc', tr({ en: 'My PC', pt: 'Meu PC' })], ['folder', 'Photos'], ['music', 'mix.wav']] as const).map(([icon, label], i) => ({ id: `icon${i}`, kind: 'ui', widget: 'icon', icon, label, x: 0.1, y: 0.32 + i * 0.12, w: 0.13, rot: 0, paint2: S('accent'), text: S('text') } as Layer)),
        { id: 'taskbar', kind: 'ui', widget: 'taskbar', x: 0.5, y: 0.975, w: 1, h: 0.05, rot: 0, title: 'Start', label: '12:00', paint2: S('accent'), locked: true } as Layer
      ]
    },
    // 43
    {
      id: 'blue-monitor-grid', name: { en: 'Blue Monitor Grid', pt: 'Grade de Monitor Azul' }, ratio: '1:1', tags: ['halftone'], photos: 3,
      palette: 'cobalt-duotone', colors: { tint: '#0A1A3A', tintSecondary: '#3AB0F0', frame: '#000000' }, slots: ['tintSecondary', 'tint', 'frame'],
      layers: [
        bg({ paint: S('frame') }),
        { id: 'grid', kind: 'layout', mode: 'grid', x: 0.5, y: 0.5, w: 1, h: 1, rot: 0, rows: 3, cols: 3, gutter: 8, border: 8, paint: S('frame'), scanlines: 0.6, treatment: { type: 'mono', tint: S('tint'), paper: S('tintSecondary'), grain: 0.25 }, cells: [{ photo: 0, anchor: 'face', zoom: 2 }, { photo: 1 }, { photo: 2, anchor: 'hands', zoom: 2, blur: true }, { photo: 0, anchor: 'eyes', zoom: 3 }, { photo: 1, anchor: 'face', zoom: 1.5 }, { photo: 2 }, { photo: 0, anchor: 'body' }, { photo: 1, anchor: 'mouth', zoom: 3, blur: true }, { photo: 2, anchor: 'face', zoom: 2 }] } as Layer
      ]
    },
    // 44
    {
      id: 'star-sticker-booth', name: { en: 'Star Sticker Booth', pt: 'Cabine de Adesivos' }, ratio: '9:16', tags: ['stars', 'booth'], photos: 3,
      palette: 'wine-felt', colors: { background: '#0A0A0A', tint: '#F2A040' }, slots: ['background', 'tint'],
      layers: [
        bg({ texture: 'felt' }),
        { id: 'strip', kind: 'layout', mode: 'strips', x: 0.5, y: 0.5, w: 0.62, h: 0.8, rot: 0, rows: 3, cols: 1, gutter: 14, border: 14, paint: C('#FFFFFF'), treatment: grade('tint', 0.35, { contrast: 1.25, grain: 0.3 }), cells: [{ photo: 0 }, { photo: 1 }, { photo: 2 }] } as Layer,
        ...(() => {
          const arts: StickerArt[] = ['plushStar', 'sequinStar', 'embroideredStar', 'chromeStar', 'smileStar', 'starfish'];
          const r = rng(44);
          return Array.from({ length: 26 }, (_, i) => {
            const side = i % 2 ? 1 : -1;
            const onPhoto = i % 7 === 0;
            const x = onPhoto ? 0.5 + side * (0.2 + r() * 0.1) : 0.5 + side * (0.36 + r() * 0.12);
            return sticker(arts[i % arts.length], { id: `pk${i}`, x, y: 0.05 + r() * 0.9, w: 0.1 + r() * 0.07, rot: (r() - 0.5) * 50, seed: i });
          });
        })(),
        ...many('gl', [[0.5, 0.04, 0.06], [0.5, 0.96, 0.06]], { shape: 'star5', material: 'holo', fill: S('starPrimary') })
      ]
    },
    // 45
    {
      id: 'sun-doodles', name: { en: 'Sun Doodles', pt: 'Sóis Rabiscados' }, ratio: '9:16', tags: ['doodle', 'nature'], photos: 1,
      palette: 'burnt-orange', colors: { doodleStroke: '#F26A1A', doodleFill: '#F23A1A', starPrimary: '#F2C66A' }, slots: ['doodleStroke', 'doodleFill', 'starPrimary'],
      layers: [
        bg({ paint: C('#F2E8D8') }),
        photo({ w: 1, aspect: 9 / 16, treatment: { type: 'sepia', amount: 0.35, fade: 0.35, grain: 0.3 } }),
        ...around('sun', 9, 45, [0.18, 0.3], [0.5, 0.55, 0.3, 0.33], { shape: 'sun', points: 10, fill: null, strokeWidth: 10, texture: 'crayon' }).map((l, i) => ({ ...l, stroke: S(['doodleStroke', 'doodleFill', 'starPrimary'][i % 3]) } as Layer))
      ]
    },
    // 46
    {
      id: 'camera-screen-night', name: { en: 'Camera Screen Night', pt: 'Tela de Câmera Noturna' }, ratio: '9:16', tags: ['booth', 'stars'], photos: 1,
      palette: 'navy-gold', colors: { frame: '#F2C23A', starPrimary: '#F2D21A', accent: '#F2C23A' }, slots: ['frame', 'starPrimary'],
      layers: [
        bg({ paint: C('#050505') }),
        photo({ y: 0.47, w: 1, aspect: 9 / 12, treatment: { type: 'flash', contrast: 1.35, grain: 0.45 } }),
        { id: 'boxes', kind: 'boxes', of: 'photo', x: 0.5, y: 0.5, w: 1, rot: 0, targets: ['face'] as Anchor[], paint: S('frame'), width: 4, rounded: true, pointer: false } as Layer,
        ...many('ys', [[0.12, 0.15, 0.07], [0.85, 0.2, 0.06], [0.2, 0.72, 0.05], [0.9, 0.65, 0.06], [0.5, 0.12, 0.04]], { shape: 'star5', fill: null, stroke: S('starPrimary'), strokeWidth: 5, wobble: 0.35 }),
        ...many('yd', [[0.3, 0.2, 0.012], [0.7, 0.14, 0.01], [0.08, 0.5, 0.012], [0.94, 0.4, 0.01], [0.6, 0.75, 0.012]], { shape: 'dot', fill: S('starPrimary') }),
        { id: 'camera', kind: 'ui', widget: 'camera', x: 0.5, y: 0.5, w: 1, h: 1, rot: 0, locked: true, paint2: S('accent'), title: "'26 11 24", message: tr({ en: 'VIDEO,PHOTO,PORTRAIT', pt: 'VÍDEO,FOTO,RETRATO' }) } as Layer
      ]
    },
    // 47
    {
      id: 'star-crown', name: { en: 'Star Crown', pt: 'Coroa de Estrelas' }, ratio: '3:4', tags: ['stars', 'doodle'], photos: 1,
      palette: 'mono-paper', colors: { starPrimary: '#F2E21A' }, slots: ['starPrimary'],
      layers: [
        bg({ paint: C('#050505') }),
        photo({ w: 1, aspect: 0.75, treatment: { type: 'flash', contrast: 1.3, grain: 0.3 } }),
        ...arc(15, 0.5, 0.42, 0.42, 0.28, 195, 345).map(([x, y], i) => shape({ id: `crown${i}`, shape: 'star5', x, y, w: 0.05 + (i % 3) * 0.01, rot: i * 17, fill: S('starPrimary'), texture: 'crayon', wobble: 0.3, seed: 470 + i }))
      ]
    },
    // 48
    {
      id: 'ribbon-wave-red', name: { en: 'Ribbon Wave Red', pt: 'Onda Vermelha' }, ratio: '9:16', tags: ['doodle', 'duo'], photos: 1,
      palette: 'cherry-red', colors: { tint: '#E8501A', doodleStroke: '#E81A1A', doodleFill: '#F2C22A', starPrimary: '#F2C22A' }, slots: ['tint', 'doodleStroke', 'doodleFill', 'starPrimary'],
      layers: [
        bg({ paint: C('#1A0A04') }),
        photo({ w: 1, aspect: 9 / 16, treatment: grade('tint', 0.55, { saturation: 1.35 }) }),
        { id: 'waves', kind: 'waves', mode: 'parallel', x: 0.5, y: 0.5, w: 1.1, h: 0.25, rot: -12, count: 2, paints: [S('doodleStroke'), S('doodleFill')], width: 22, amp: 0.8, texture: 'crayon', seed: 48 } as Layer,
        ...many('rs', [[0.14, 0.18, 0.12], [0.86, 0.82, 0.12]], { shape: 'swirl', fill: null, stroke: S('doodleStroke'), strokeWidth: 8, texture: 'crayon' }),
        ...many('ys', [[0.85, 0.15, 0.09], [0.15, 0.85, 0.08]], { shape: 'star5', fill: S('starPrimary'), texture: 'crayon', wobble: 0.3 })
      ]
    },
    // 49
    {
      id: 'train-diary', name: { en: 'Train Diary', pt: 'Diário de Trem' }, ratio: '9:16', tags: ['booth', 'doodle'], photos: 3,
      palette: 'cherry-red', colors: { doodleStroke: '#D8281E', doodleFill: '#F2C21A', starPrimary: '#E8C04A', frame: '#FFFFFF', tint: '#F2A040' }, slots: ['doodleStroke', 'doodleFill', 'starPrimary', 'frame'],
      layers: [
        bg({ paint: S('frame') }),
        { id: 'strip', kind: 'layout', mode: 'strips', x: 0.5, y: 0.5, w: 1, h: 1, rot: 0, rows: 3, cols: 1, gutter: 12, border: 0, paint: S('frame'), treatment: grade('tint', 0.3, { grain: 0.25, fade: 0.12 }), cells: [{ photo: 0 }, { photo: 1 }, { photo: 2 }] } as Layer,
        ...many('loop', [[0.3, 0.08, 0.35], [0.7, 0.42, 0.3], [0.35, 0.74, 0.32]], { shape: 'loop', fill: null, stroke: S('doodleStroke'), strokeWidth: 7, texture: 'crayon' }),
        { id: 'wave', kind: 'waves', mode: 'parallel', x: 0.5, y: 0.6, w: 1.05, h: 0.06, rot: 0, count: 2, paints: [S('doodleFill'), S('doodleStroke')], width: 9, amp: 0.8, texture: 'crayon', seed: 49 } as Layer,
        ...many('gs', [[0.12, 0.3, 0.07], [0.88, 0.18, 0.06], [0.9, 0.7, 0.07]], { shape: 'paperStar', material: 'metallic', fill: S('starPrimary'), wobble: 0.4 }),
        ...many('ys', [[0.15, 0.55, 0.05], [0.8, 0.92, 0.05]], { shape: 'star5', fill: S('doodleFill'), texture: 'crayon' })
      ]
    },
    // 50
    {
      id: 'rock-star-poster', name: { en: 'Rock Star Poster', pt: 'Pôster Rock Star' }, ratio: '9:16', tags: ['comic', 'scrapbook'], photos: 3,
      palette: 'navy-gold', colors: { text: '#F2D21A', doodleStroke: '#E0281E', background: '#141A3A', accent: '#7A4AE0', starPrimary: '#F28CC0', starSecondary: '#3A7BEA', doodleFill: '#7AE07A', outline: '#C8A8F0' },
      slots: ['text', 'doodleStroke', 'background', 'accent', 'starPrimary', 'starSecondary', 'doodleFill'],
      layers: [
        bg({ paint: S('background') }),
        photo({ id: 'top', x: 0.5, y: 0.17, w: 1, aspect: 1.5, treatment: { type: 'warm', amount: 0.4, grain: 0.2 } }),
        photo({ id: 'topCut', x: 0.3, y: 0.2, w: 0.45, aspect: 0.9, cutout: 'sticker', outline: C('#FFFFFF'), outlineWidth: 10 }),
        text({ id: 'music', x: 0.66, y: 0.1, text: tr({ en: 'MUSIC', pt: 'MÚSICA' }), font: 'brush', paint: S('text'), stroke: C('#FFFFFF'), strokeWidth: 14, size: 0.12, rot: -5, texture: 'paper' }),
        text({ id: 'name', x: 0.72, y: 0.25, text: '@yourname', font: 'typewriter', paint: C('#111111'), bg: C('#FFFFFF'), size: 0.028, rot: 3 }),
        sticker('musicNote', { id: 'note1', x: 0.9, y: 0.2, w: 0.07, paint: C('#FFFFFF') }),
        { id: 'sky', kind: 'waves', mode: 'parallel', x: 0.5, y: 0.5, w: 1.1, h: 0.08, rot: -6, count: 3, paints: [S('accent'), S('outline')], width: 16, amp: 0.6, texture: 'none', seed: 50 } as Layer,
        ...many('sky', [[0.1, 0.4, 0.02], [0.3, 0.37, 0.015], [0.9, 0.42, 0.02], [0.7, 0.6, 0.015], [0.2, 0.62, 0.02]], { shape: 'star4', fill: C('#FFFFFF') }),
        sticker('planet', { id: 'planet', x: 0.82, y: 0.38, w: 0.18 }),
        sticker('boombox', { id: 'boombox', x: 0.2, y: 0.5, w: 0.25, rot: -8 }),
        text({ id: 'title', x: 0.6, y: 0.56, text: tr({ en: 'I POP LIKE\nA ROCK STAR', pt: 'EU BRILHO\nCOMO ROCK STAR' }), font: 'brush', paint: S('text'), stroke: S('doodleStroke'), strokeWidth: 12, size: 0.065, rot: -4 }),
        photo({ id: 'bottom', photo: 2, x: 0.5, y: 0.84, w: 1, aspect: 1.5, treatment: BW(1.25, 0.25) }),
        text({ id: 'cool', x: 0.5, y: 0.8, text: tr({ en: 'SUPER DUPER COOL', pt: 'SUPER DUPER LEGAL' }), font: 'brush', paint: S('starPrimary'), stroke: C('#FFFFFF'), strokeWidth: 10, size: 0.06, rot: 4 }),
        ...many('ex', [[0.12, 0.92, 0.05, -20], [0.2, 0.9, 0.04, 10]], { shape: 'exclaim', fill: S('starSecondary') }),
        shape({ id: 'gb', shape: 'burst', x: 0.86, y: 0.92, w: 0.14, points: 12, fill: S('doodleFill') }),
        shape({ id: 'lb', shape: 'burst', x: 0.72, y: 0.96, w: 0.09, points: 10, fill: S('outline') })
      ]
    },
    // 51
    {
      id: 'torn-yellow-marker', name: { en: 'Torn Yellow Marker', pt: 'Marca-Texto Amarelo' }, ratio: '9:16', tags: ['doodle', 'booth'], photos: 3,
      palette: 'navy-gold', colors: { doodleStroke: '#F2C21A', text: '#FFFFFF', tint: '#2A3A5A' }, slots: ['doodleStroke', 'text'],
      layers: [
        bg({ paint: C('#F8F6F0') }),
        { id: 'strip', kind: 'layout', mode: 'strips', x: 0.5, y: 0.5, w: 1, h: 1, rot: 0, rows: 3, cols: 1, gutter: 18, border: 0, paint: C('#F8F6F0'), torn: true, roughness: 0.6, treatment: grade('tint', 0.35, { contrast: 1.25, grain: 0.45 }), cells: [{ photo: 0 }, { photo: 1 }, { photo: 2 }] } as Layer,
        ...many('ring', [[0.45, 0.12, 0.3], [0.55, 0.45, 0.28], [0.4, 0.78, 0.3]], { shape: 'oval', h: 0.8, fill: null, stroke: S('doodleStroke'), strokeWidth: 7, texture: 'marker' }),
        ...many('x', [[0.4, 0.13, 0.04], [0.5, 0.13, 0.04]], { shape: 'cross', fill: null, stroke: S('doodleStroke'), strokeWidth: 6 }),
        shape({ id: 'bolt', shape: 'bolt', x: 0.85, y: 0.35, w: 0.12, rot: 15, fill: S('doodleStroke') }),
        ...many('ex', [[0.12, 0.55, 0.05, -15], [0.18, 0.57, 0.04, 10]], { shape: 'exclaim', fill: S('doodleStroke') }),
        { id: 'yeah', kind: 'bubble', x: 0.8, y: 0.62, w: 0.26, h: 0.08, rot: 8, text: tr({ en: 'YEAH', pt: 'ISSO' }), spikes: 10, randomness: 0.4, paint: C('#FFFFFF'), stroke: C('#111111'), textPaint: C('#111111'), seed: 51 } as Layer,
        text({ id: 'scrawl', x: 0.3, y: 0.92, text: tr({ en: 'best night ever', pt: 'melhor noite' }), font: 'script', paint: S('text'), size: 0.045, rot: -6 }),
        text({ id: 'h1', x: 0.25, y: 0.3, text: '@friend.one', font: 'typewriter', paint: C('#111111'), bg: C('#FFFFFF'), size: 0.025, rot: -3 }),
        text({ id: 'h2', x: 0.75, y: 0.68, text: '@friend.two', font: 'typewriter', paint: C('#111111'), bg: C('#FFFFFF'), size: 0.025, rot: 4 })
      ]
    },
    // 52
    {
      id: 'sun-rays-party', name: { en: 'Sun Rays Party', pt: 'Festa de Raios' }, ratio: '6:5', tags: ['doodle'], photos: 1,
      palette: 'mustard-teal', colors: { doodleStroke: '#F2C81A' }, slots: ['doodleStroke'],
      layers: [
        bg({ paint: C('#050505') }),
        photo({ id: 'base', w: 1, aspect: 1.2, treatment: { type: 'flash', contrast: 1.3, grain: 0.3 } }),
        { id: 'rays', kind: 'zigzag', mode: 'rays', x: 0.5, y: 0.6, w: 1.4, h: 1.4, rot: 0, count: 16, length: 0.85, width: 10, paint: S('doodleStroke'), texture: 'crayon', seed: 52 } as Layer,
        { id: 'subj', kind: 'subject', of: 'base', x: 0.5, y: 0.5, w: 1, rot: 0, cutout: 'clean' } as Layer
      ]
    },
    // 53
    {
      id: 'couch-sticker-party', name: { en: 'Couch Sticker Party', pt: 'Festa no Sofá' }, ratio: '4:3', tags: ['doodle', 'stars', 'duo'], photos: 1,
      palette: 'crayon-pop', colors: { background: '#F2E86A', outline: '#7AC8F0', doodleStroke: '#E0281E', starSecondary: '#2A62E0', starPrimary: '#F28CC0', accent: '#9A5AE0' },
      slots: ['background', 'outline', 'doodleStroke', 'starSecondary', 'starPrimary', 'accent'],
      layers: [
        bg({ texture: 'paper' }),
        photo({ y: 0.58, w: 0.8, cutout: 'sticker', outline: S('outline'), outlineWidth: 16, roughEdge: true }),
        ...many('sp', [[0.1, 0.18, 0.1], [0.9, 0.2, 0.09]], { shape: 'swirl', fill: null, stroke: S('doodleStroke'), strokeWidth: 6, texture: 'crayon' }),
        shape({ id: 'sp3', shape: 'swirl', x: 0.92, y: 0.75, w: 0.09, fill: null, stroke: S('starSecondary'), strokeWidth: 6, texture: 'crayon' }),
        ...many('h', [[0.25, 0.1, 0.04], [0.75, 0.08, 0.035], [0.06, 0.55, 0.035]], { shape: 'heart', fill: S('doodleStroke') }),
        ...many('ex', [[0.18, 0.4, 0.05, -15], [0.84, 0.45, 0.05, 15]], { shape: 'exclaim', fill: S('starPrimary') }),
        ...many('sq', [[0.5, 0.06, 0.18], [0.1, 0.9, 0.15]], { shape: 'squiggle', fill: null, stroke: S('accent'), strokeWidth: 5 }),
        ...([['#1A1A1A', 0.36, 0.1], ['#C8CCD4', 0.62, 0.12], ['#2A62E0', 0.95, 0.5], ['#7A2A5A', 0.05, 0.75], ['#3DAA3D', 0.88, 0.92]] as const).map(([c, x, y], i) => shape({ id: `fs${i}`, shape: 'star5', x, y, w: 0.06, rot: i * 20, fill: C(c), material: c === '#C8CCD4' ? 'metallic' : 'flat' }))
      ]
    },
    // 54
    {
      id: 'scrapbook-bedroom', name: { en: 'Scrapbook Bedroom', pt: 'Scrapbook do Quarto' }, ratio: '4:3', tags: ['scrapbook', 'duo'], photos: 2,
      palette: 'pastel-holo', colors: { accent: '#3AF0A0', tint: '#F2A040', text: '#1A1A1A', paper: '#F8E0EC', doodleStroke: '#111111', doodleFill: '#1F9A8F', starPrimary: '#B8F01A' },
      slots: ['accent', 'tint', 'paper', 'doodleStroke', 'doodleFill', 'starPrimary', 'text'],
      layers: [
        bg({ paint: C('#FFFFFF') }),
        { id: 'pair', kind: 'layout', mode: 'grid', x: 0.5, y: 0.5, w: 1, h: 1, rot: 0, rows: 1, cols: 2, gutter: 6, border: 0, paint: C('#FFFFFF'), treatment: grade('tint', 0.4, { grain: 0.35, fade: 0.12 }), cells: [{ photo: 0 }, { photo: 1 }] } as Layer,
        ...Array.from({ length: 14 }, (_, i) => shape({ id: `dash${i}`, shape: 'rect', x: 0.5, y: 0.035 + i * 0.07, w: 0.006, h: 6, fill: C('#111111'), locked: true })),
        ...(['butterfly', 'clover', 'glitterFlower', 'plushStar', 'boombox', 'sunglasses', 'moon'] as StickerArt[]).map((art, i) =>
          sticker(art, { id: `neon${i}`, x: [0.1, 0.42, 0.9, 0.6, 0.15, 0.85, 0.35][i], y: [0.15, 0.1, 0.12, 0.88, 0.82, 0.6, 0.62][i], w: 0.1 + (i % 3) * 0.02, rot: (i * 17) % 40 - 20, glow: S('accent') })),
        text({ id: 'tape1', x: 0.25, y: 0.94, text: 'XOXO', font: 'typewriter', paint: S('text'), bg: S('paper'), bgStyle: 'tape', size: 0.035, rot: -4 }),
        text({ id: 'tape2', x: 0.72, y: 0.05, text: '24.11.26', font: 'typewriter', paint: S('text'), bg: S('paper'), bgStyle: 'tape', size: 0.03, rot: 3 }),
        text({ id: 'tape3', x: 0.8, y: 0.94, text: tr({ en: 'my room', pt: 'meu quarto' }), font: 'typewriter', paint: S('text'), bg: S('paper'), bgStyle: 'tape', size: 0.03, rot: 5 }),
        ...many('x', [[0.3, 0.3, 0.04], [0.7, 0.35, 0.035]], { shape: 'cross', fill: null, stroke: S('doodleStroke'), strokeWidth: 5 }),
        ...many('sp', [[0.55, 0.25, 0.06]], { shape: 'swirl', fill: null, stroke: S('doodleStroke'), strokeWidth: 4 }),
        ...many('tick', [[0.05, 0.4, 0.08, 60], [0.95, 0.3, 0.07, -60]], { shape: 'squiggle', points: 2, fill: null, stroke: S('doodleFill'), strokeWidth: 8, texture: 'crayon' }),
        ...many('zz', [[0.45, 0.75, 0.12], [0.62, 0.2, 0.1]], { shape: 'squiggle', points: 4, fill: null, stroke: S('starPrimary'), strokeWidth: 5 }),
        ...many('hrt', [[0.2, 0.5, 0.06], [0.8, 0.8, 0.05]], { shape: 'heart', fill: C('#FFFFFF'), stroke: C('#7A9AE0'), strokeWidth: 2, texture: 'paper' })
      ]
    },
    // 55
    {
      id: 'blue-street-board', name: { en: 'Blue Street Board', pt: 'Mural Azul de Rua' }, ratio: '4:3', tags: ['scrapbook', 'duo'], photos: 3,
      palette: 'cobalt-duotone', colors: { background: '#2A4AE0', outline: '#F8F01A', doodleFill: '#E81A1A', outlineSecondary: '#111111' },
      slots: ['background', 'outline', 'doodleFill', 'outlineSecondary'],
      layers: [
        bg({ texture: 'poster' }),
        shape({ id: 'burst', shape: 'burst', x: 0.5, y: 0.42, w: 0.6, points: 20, fill: S('doodleFill'), texture: 'paper', seed: 55 }),
        shape({ id: 'smear', shape: 'bar', x: 0.5, y: 0.95, w: 0.8, h: 0.16, fill: S('doodleFill'), texture: 'crayon', seed: 56 }),
        { id: 'shadow', kind: 'subject', of: 'photo', x: 0.5, y: 0.5, w: 1, rot: 0, cutout: 'silhouette', fill: S('outlineSecondary'), dx: 0.015, dy: 0.02 } as Layer,
        photo({ y: 0.56, w: 0.56, cutout: 'sticker', outline: S('outline'), outlineWidth: 18, treatment: BW(1.2, 0.2) }),
        photo({ id: 'polaroid', photo: 1, x: 0.12, y: 0.25, w: 0.16, aspect: 1, rot: -8, frame: 'polaroid', framePaint: C('#FFFFFF'), shadow: true }),
        sticker('pin', { id: 'pin', x: 0.12, y: 0.13, w: 0.05 }),
        sticker('receipt', { id: 'receipt', x: 0.88, y: 0.25, w: 0.12, rot: 8 }),
        { id: 'film', kind: 'layout', mode: 'film', x: 0.9, y: 0.7, w: 0.14, h: 0.5, rot: 6, rows: 3, cols: 1, gutter: 6, border: 4, paint: C('#111111'), treatment: { type: 'none' }, cells: [{ photo: 2 }, { photo: 1 }, { photo: 0 }] } as Layer,
        ...(['shorts', 'cap', 'headphones', 'watch', 'sneaker', 'camera', 'vinyl', 'lips', 'dice'] as StickerArt[]).map((art, i) =>
          sticker(art, { id: `prod${i}`, x: [0.08, 0.28, 0.72, 0.2, 0.08, 0.34, 0.66, 0.78, 0.25][i], y: [0.55, 0.1, 0.1, 0.85, 0.82, 0.92, 0.9, 0.5, 0.55][i], w: 0.08 + (i % 3) * 0.015, rot: (i * 19) % 40 - 20, edge: true })),
        text({ id: 'handle', x: 0.6, y: 0.08, text: '@yourcrew', font: 'typewriter', paint: C('#111111'), bg: C('#FFFFFF'), size: 0.03, rot: -3 })
      ]
    },
    // 56
    {
      id: 'blue-burst-zine', name: { en: 'Blue Burst Zine', pt: 'Zine Explosão Azul' }, ratio: '4:5', tags: ['scrapbook', 'stars'], photos: 1,
      palette: 'cobalt-duotone', colors: { background: '#1A5AE0', doodleFill: '#F2A81A', outlineSecondary: '#E84A1A', paper3: '#FFFFFF' },
      slots: ['background', 'doodleFill', 'outlineSecondary'],
      layers: [
        bg({ style: 'torn', paint: S('background'), paint3: S('paper3') }),
        { id: 'shadow', kind: 'subject', of: 'photo', x: 0.5, y: 0.5, w: 1, rot: 0, cutout: 'silhouette', fill: S('outlineSecondary'), clippings: true, dx: -0.06, dy: 0.01 } as Layer,
        shape({ id: 'burst', shape: 'burst', x: 0.5, y: 0.3, w: 0.62, points: 20, fill: S('doodleFill'), material: 'metallic', seed: 56 }),
        photo({ y: 0.58, w: 0.78, cutout: 'sticker', outline: C('#FFFFFF'), outlineWidth: 10 }),
        ...(['phone', 'ticket', 'cassette', 'polaroid', 'lips', 'smileStar', 'receipt'] as StickerArt[]).map((art, i) =>
          sticker(art, { id: `clip${i}`, x: [0.1, 0.88, 0.12, 0.86, 0.9, 0.08, 0.5][i], y: [0.15, 0.12, 0.6, 0.55, 0.88, 0.9, 0.95][i], w: 0.09 + (i % 2) * 0.03, rot: (i * 23) % 50 - 25, edge: true }))
      ]
    }
  ];
}
