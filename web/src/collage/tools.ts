/**
 * Editor tool catalog for the second template set.
 *
 * TOOLS lists the elements the Stickers tab can add (each creates a regular
 * layer). PARAMS describes the editable settings of each layer kind, so the
 * editor builds sliders, toggles, choices and text fields from data instead of
 * custom UI per tool. Adding a tool = a layer kind + an entry in each table.
 */
import type { Layer, Paint, ShapeKind, Treatment } from './types';
import type { CollageStrings } from './strings';

type K = keyof CollageStrings;

export type Param =
  | { kind: 'range'; key: string; label: K; min: number; max: number; step: number }
  | { kind: 'toggle'; key: string; label: K }
  /** Toggle that sets a paint (on) or removes it (off). */
  | { kind: 'paint'; key: string; label: K; slot: string }
  | { kind: 'text'; key: string; label: K; multiline?: boolean }
  | { kind: 'choice'; key: string; label: K; options: [unknown, K][] };

const TREAT_CHOICES: [Treatment, K][] = [
  [{ type: 'posterize', levels: 4, dark: { slot: 'tint' }, light: { slot: 'tintSecondary' } }, 'treatPoster'],
  [{ type: 'invert' }, 'treatInvert'],
  [{ type: 'mono', tint: { slot: 'tint' }, paper: { slot: 'tintSecondary' }, grain: 0.2 }, 'treatMono'],
  [{ type: 'negative', tint: { slot: 'tintSecondary' }, paper: { slot: 'tint' }, grain: 0.1 }, 'treatNegative'],
  [{ type: 'none' }, 'treatNone']
];

export const ANCHORS: [string | undefined, K][] = [[undefined, 'anchorNone'], ['face', 'anchorFace'], ['eyes', 'anchorEyes'], ['mouth', 'anchorMouth'], ['hands', 'anchorHands'], ['feet', 'anchorFeet'], ['body', 'anchorBody']];

export const PARAMS: Partial<Record<Layer['kind'], Param[]>> = {
  bubble: [
    { kind: 'text', key: 'text', label: 'textValue', multiline: true },
    { kind: 'range', key: 'spikes', label: 'spikes', min: 6, max: 30, step: 1 },
    { kind: 'range', key: 'randomness', label: 'randomness', min: 0, max: 1, step: 0.05 },
    { kind: 'range', key: 'h', label: 'size', min: 0.05, max: 0.6, step: 0.01 }
  ],
  torn: [
    { kind: 'range', key: 'points', label: 'points', min: 4, max: 14, step: 1 },
    { kind: 'range', key: 'print', label: 'print', min: 0, max: 1, step: 0.05 },
    { kind: 'text', key: 'word', label: 'word' },
    { kind: 'range', key: 'h', label: 'size', min: 0.05, max: 1, step: 0.01 },
    { kind: 'range', key: 'seed', label: 'shuffle', min: 1, max: 60, step: 1 }
  ],
  sketch: [
    { kind: 'range', key: 'density', label: 'density', min: 0.1, max: 1.5, step: 0.05 },
    { kind: 'range', key: 'width', label: 'width', min: 1, max: 8, step: 0.5 },
    { kind: 'toggle', key: 'hatch', label: 'hatch' }
  ],
  scribble: [
    { kind: 'range', key: 'density', label: 'density', min: 0.05, max: 4, step: 0.05 },
    { kind: 'range', key: 'width', label: 'width', min: 2, max: 30, step: 1 },
    { kind: 'range', key: 'padding', label: 'padding', min: 0, max: 200, step: 2 },
    { kind: 'range', key: 'h', label: 'size', min: 0.05, max: 1.2, step: 0.01 }
  ],
  cropwin: [
    { kind: 'choice', key: 'treatment', label: 'tabPhoto', options: TREAT_CHOICES },
    { kind: 'range', key: 'h', label: 'size', min: 0.03, max: 1, step: 0.01 }
  ],
  patchwork: [
    { kind: 'range', key: 'count', label: 'patches', min: 6, max: 20, step: 1 },
    { kind: 'range', key: 'share', label: 'share2', min: 0.1, max: 1, step: 0.05 },
    { kind: 'range', key: 'seed', label: 'shuffle', min: 1, max: 99, step: 1 }
  ],
  layout: [
    { kind: 'choice', key: 'mode', label: 'layoutTool', options: [['grid', 'layoutGrid'], ['strips', 'layoutStrips'], ['contact', 'layoutContact'], ['film', 'layoutFilm']] },
    { kind: 'range', key: 'rows', label: 'rows', min: 1, max: 6, step: 1 },
    { kind: 'range', key: 'cols', label: 'cols', min: 1, max: 4, step: 1 },
    { kind: 'range', key: 'gutter', label: 'gutter', min: 0, max: 60, step: 1 },
    { kind: 'range', key: 'border', label: 'border', min: 0, max: 80, step: 1 },
    { kind: 'range', key: 'scanlines', label: 'scanlines', min: 0, max: 1, step: 0.05 },
    { kind: 'toggle', key: 'torn', label: 'torn' },
    { kind: 'range', key: 'roughness', label: 'roughness', min: 0, max: 1, step: 0.05 },
    { kind: 'range', key: 'h', label: 'size', min: 0.1, max: 1, step: 0.01 }
  ],
  boxes: [
    { kind: 'range', key: 'width', label: 'width', min: 1, max: 12, step: 0.5 },
    { kind: 'toggle', key: 'rounded', label: 'rounded' },
    { kind: 'toggle', key: 'pointer', label: 'pointerOn' }
  ],
  waves: [
    { kind: 'range', key: 'count', label: 'lines', min: 1, max: 20, step: 1 },
    { kind: 'range', key: 'width', label: 'width', min: 2, max: 40, step: 1 },
    { kind: 'range', key: 'amp', label: 'amp', min: 0, max: 1.5, step: 0.05 },
    { kind: 'range', key: 'seed', label: 'shuffle', min: 1, max: 60, step: 1 }
  ],
  sticker: [
    { kind: 'text', key: 'label', label: 'labelTool' },
    { kind: 'toggle', key: 'edge', label: 'edge' },
    { kind: 'paint', key: 'glow', label: 'neon', slot: 'accent' }
  ],
  zigzag: [
    { kind: 'choice', key: 'mode', label: 'zigzag', options: [['zigzag', 'zigzag'], ['rays', 'raysTool']] },
    { kind: 'range', key: 'length', label: 'length', min: 0.2, max: 1, step: 0.05 },
    { kind: 'range', key: 'width', label: 'width', min: 2, max: 40, step: 1 }
  ],
  ribbon: [
    { kind: 'toggle', key: 'straight', label: 'threadTool' }
  ],
  outline: [
    { kind: 'toggle', key: 'dash', label: 'dashed' }
  ],
  subject: [
    { kind: 'toggle', key: 'clippings', label: 'clippings' },
    { kind: 'range', key: 'dx', label: 'offsetX', min: -0.2, max: 0.2, step: 0.005 },
    { kind: 'range', key: 'dy', label: 'offsetY', min: -0.2, max: 0.2, step: 0.005 },
    { kind: 'paint', key: 'glow', label: 'glow', slot: 'paper' }
  ],
  photo: [
    { kind: 'choice', key: 'anchor', label: 'focusOn', options: ANCHORS },
    { kind: 'range', key: 'zoom', label: 'zoom', min: 1, max: 6, step: 0.1 },
    { kind: 'range', key: 'scanlines', label: 'scanlines', min: 0, max: 1, step: 0.05 },
    { kind: 'paint', key: 'stroke', label: 'outlineText', slot: 'frame' },
    { kind: 'range', key: 'strokeWidth', label: 'strokeWidth', min: 1, max: 20, step: 0.5 },
    { kind: 'paint', key: 'glow', label: 'glow', slot: 'paper' }
  ],
  slices: [
    { kind: 'choice', key: 'mode', label: 'slicesTool', options: [['barcode', 'barcodeMode'], ['torn', 'torn'], ['tiles', 'tilesMode'], ['shards', 'shardsMode']] },
    { kind: 'range', key: 'count', label: 'patches', min: 2, max: 16, step: 1 },
    { kind: 'range', key: 'gap', label: 'gutter', min: 0, max: 30, step: 1 },
    { kind: 'range', key: 'removed', label: 'removed', min: 0, max: 0.6, step: 0.02 },
    { kind: 'range', key: 'shift', label: 'shift', min: 0, max: 1, step: 0.05 },
    { kind: 'range', key: 'photo', label: 'photos', min: 0, max: 4, step: 1 },
    { kind: 'range', key: 'seed', label: 'shuffle', min: 1, max: 60, step: 1 }
  ],
  leak: [
    { kind: 'range', key: 'strength', label: 'amount', min: 0, max: 1.5, step: 0.05 },
    { kind: 'range', key: 'seed', label: 'shuffle', min: 1, max: 99, step: 1 }
  ],
  grunge: [
    { kind: 'range', key: 'h', label: 'size', min: 0.05, max: 1, step: 0.01 },
    { kind: 'range', key: 'seed', label: 'shuffle', min: 1, max: 60, step: 1 }
  ],
  mosaic: [
    { kind: 'range', key: 'count', label: 'patches', min: 10, max: 80, step: 1 },
    { kind: 'toggle', key: 'confetti', label: 'confetti' },
    { kind: 'range', key: 'seed', label: 'shuffle', min: 1, max: 99, step: 1 }
  ],
  ornament: [
    { kind: 'choice', key: 'style', label: 'ornamentTool', options: [['dots', 'dotOrnamentTool'], ['line', 'lineOrnamentTool']] },
    { kind: 'choice', key: 'motif', label: 'motif', options: [['floral', 'motifFloral'], ['swirl', 'swirl'], ['clover', 'clover'], ['lily', 'lily'], ['bouquet', 'bouquet']] },
    { kind: 'range', key: 'dot', label: 'dotSize', min: 4, max: 24, step: 1 },
    { kind: 'toggle', key: 'square', label: 'squareDots' },
    { kind: 'range', key: 'h', label: 'size', min: 0.05, max: 1, step: 0.01 }
  ],
  punch: [
    { kind: 'range', key: 'count', label: 'patches', min: 1, max: 60, step: 1 },
    { kind: 'range', key: 'size', label: 'size', min: 0.02, max: 0.8, step: 0.01 },
    { kind: 'range', key: 'holeRot', label: 'angle', min: -90, max: 90, step: 1 },
    { kind: 'choice', key: 'holes', label: 'punchTool', options: [[['star'], 'shapeStar'], [['star', 'spiral'], 'swirl'], [['oval'], 'ovalTool'], [['circle'], 'dot']] },
    { kind: 'range', key: 'h', label: 'size', min: 0.05, max: 1, step: 0.01 },
    { kind: 'range', key: 'seed', label: 'shuffle', min: 1, max: 99, step: 1 }
  ],
  threshold: [
    { kind: 'choice', key: 'anchor', label: 'focusOn', options: [['eyes', 'anchorEyes'], ['mouth', 'anchorMouth'], ['face', 'anchorFace']] },
    { kind: 'range', key: 'size', label: 'size', min: 0.4, max: 2.5, step: 0.05 }
  ],
  frost: [
    { kind: 'range', key: 'frost', label: 'amount', min: 0, max: 1, step: 0.05 },
    { kind: 'choice', key: 'shape', label: 'shapeStar', options: [['star', 'shapeStar'], ['circle', 'dot']] }
  ],
  facedoodle: [
    { kind: 'range', key: 'width', label: 'width', min: 2, max: 20, step: 1 }
  ],
  ui: [
    { kind: 'text', key: 'title', label: 'title2' },
    { kind: 'text', key: 'message', label: 'message' },
    { kind: 'text', key: 'label', label: 'labelTool' },
    { kind: 'paint', key: 'glow', label: 'glow', slot: 'paper' }
  ]
};

/** UI widgets that use each text field. */
export const UI_FIELDS: Record<string, string[]> = { window: ['title', 'message', 'glow'], taskbar: ['title', 'label'], camera: ['title', 'message'], playback: ['title'], swatch: ['title'] };

export const getVal = (l: Layer, key: string): unknown => (l as unknown as Record<string, unknown>)[key];
export const setVal = (l: Layer, key: string, v: unknown) => {
  const o = l as unknown as Record<string, unknown>;
  if (v === undefined) delete o[key]; else o[key] = v;
};

// ---------------------------------------------------------------- tools

export interface ToolCtx { id: string; photo?: string; t: CollageStrings }

const S = (slot: string): Paint => ({ slot });

export interface Tool { id: string; label: K; icon: string; needsPhoto?: boolean; make: (c: ToolCtx) => Layer }

const shapeTool = (id: string, label: K, icon: string, shape: ShapeKind, o: Record<string, unknown>): Tool => ({
  id, label, icon, make: (c) => ({ id: c.id, kind: 'shape', shape, x: 0.5, y: 0.35, w: 0.14, rot: 0, seed: Math.floor(Math.random() * 1e5), ...o } as Layer)
});

export const TOOLS: Tool[] = [
  { id: 'heads', label: 'headsTool', icon: '▣', needsPhoto: true, make: (c) => ({ id: c.id, kind: 'heads', of: c.photo!, x: 0.5, y: 0.5, w: 1, rot: 0, blocks: [{ paint: S('starPrimary'), ink: S('tint'), size: 1.3, dx: 0, dy: 0, rot: -4 }, { paint: S('starSecondary'), ink: S('tint'), size: 1.3, dx: 0, dy: 0, rot: 5 }] } as Layer) },
  { id: 'bubble', label: 'bubbleTool', icon: '💥', make: (c) => ({ id: c.id, kind: 'bubble', x: 0.5, y: 0.15, w: 0.45, h: 0.15, rot: -5, text: c.t.defaultBubble, spikes: 14, randomness: 0.5, paint: S('doodleFill'), stroke: { color: '#111111' }, textPaint: { color: '#111111' }, seed: 3 } as Layer) },
  { id: 'torn', label: 'tornTool', icon: '▱', make: (c) => ({ id: c.id, kind: 'torn', x: 0.5, y: 0.45, w: 0.8, h: 0.5, rot: -4, paint: S('paper'), edge: { color: '#FFFFFF' }, points: 7, print: 0.7, seed: Math.floor(Math.random() * 50) } as Layer) },
  { id: 'sketch', label: 'sketchTool', icon: '✎', needsPhoto: true, make: (c) => ({ id: c.id, kind: 'sketch', of: c.photo!, x: 0.5, y: 0.5, w: 1, rot: 0, paint: { color: '#FFFFFF' }, density: 0.7, width: 2.5, hatch: true } as Layer) },
  { id: 'scribble', label: 'scribbleTool', icon: '≋', make: (c) => ({ id: c.id, kind: 'scribble', of: c.photo, x: 0.5, y: 0.5, w: 1, h: 1, rot: 0, paint: S('doodleStroke'), density: 2, width: 10, padding: 40, seed: 7 } as Layer) },
  shapeTool('censor', 'censorTool', '▬', 'bar', { w: 0.32, h: 0.2, fill: { color: '#FFFFFF' }, texture: 'chalk' }),
  { id: 'crop', label: 'cropTool', icon: '⌗', needsPhoto: true, make: (c) => ({ id: c.id, kind: 'cropwin', of: c.photo!, x: 0.5, y: 0.4, w: 0.3, h: 0.16, rot: 0, treatment: { type: 'posterize', levels: 4, dark: S('tint'), light: S('tintSecondary') }, guide: { color: '#FFFFFF' } } as Layer) },
  { id: 'patchwork', label: 'patchworkTool', icon: '▚', needsPhoto: true, make: (c) => ({ id: c.id, kind: 'patchwork', of: c.photo!, x: 0.5, y: 0.5, w: 1, rot: 0, count: 12, share: 0.5, patterns: ['sky', 'stripes', 'dots', 'swirls', 'spots', 'plaid', 'shapes', 'gradient'], paints: [S('starPrimary'), S('starSecondary'), S('doodleFill'), S('accent')], seed: 5 } as Layer) },
  { id: 'thread', label: 'threadTool', icon: '⟟', make: (c) => ({ id: c.id, kind: 'ribbon', of: c.photo, straight: true, pins: { color: '#FFFFFF' }, x: 0.5, y: 0.5, w: 0.8, h: 0.6, rot: 0, width: 4, paint: { color: '#D8281E' }, texture: 'none', points: [[0.1, 0.2], [0.9, 0.35], [0.15, 0.65], [0.85, 0.85]], weave: [false, true, false] } as Layer) },
  { id: 'layout', label: 'layoutTool', icon: '▦', make: (c) => ({ id: c.id, kind: 'layout', mode: 'strips', x: 0.5, y: 0.5, w: 0.6, h: 0.8, rot: 0, rows: 3, cols: 1, gutter: 12, border: 12, paint: { color: '#FFFFFF' }, treatment: { type: 'none' }, cells: [{ photo: 0 }, { photo: 1 }, { photo: 2 }] } as Layer) },
  { id: 'boxes', label: 'boxesTool', icon: '⬚', needsPhoto: true, make: (c) => ({ id: c.id, kind: 'boxes', of: c.photo!, x: 0.5, y: 0.5, w: 1, rot: 0, targets: ['face', 'hands'], paint: { color: '#9EF09A' }, width: 3, rounded: false, pointer: true } as Layer) },
  { id: 'window', label: 'windowTool', icon: '🗔', make: (c) => ({ id: c.id, kind: 'ui', widget: 'window', content: 'photo', x: 0.5, y: 0.35, w: 0.6, h: 0.3, rot: 0, title: 'photo.png', paint: S('frame') } as Layer) },
  { id: 'taskbar', label: 'taskbarTool', icon: '▭', make: (c) => ({ id: c.id, kind: 'ui', widget: 'taskbar', x: 0.5, y: 0.975, w: 1, h: 0.05, rot: 0, title: 'Start', label: '12:00', paint2: S('accent') } as Layer) },
  { id: 'camera', label: 'cameraTool', icon: '📷', make: (c) => ({ id: c.id, kind: 'ui', widget: 'camera', x: 0.5, y: 0.5, w: 1, h: 1, rot: 0, paint2: { color: '#F2C23A' }, title: new Date().toLocaleDateString(), message: 'VIDEO,PHOTO,PORTRAIT' } as Layer) },
  { id: 'liquid', label: 'liquidTool', icon: '◎', make: (c) => ({ id: c.id, kind: 'waves', mode: 'contour', x: 0.5, y: 0.5, w: 1.2, h: 1.1, rot: 0, count: 12, paints: [{ color: '#111111' }, { color: '#FFFFFF' }], width: 10, amp: 0.25, texture: 'none', seed: 3 } as Layer) },
  { id: 'waves', label: 'wavesTool', icon: '〰', make: (c) => ({ id: c.id, kind: 'waves', mode: 'parallel', x: 0.5, y: 0.5, w: 1.1, h: 0.2, rot: -10, count: 2, paints: [S('doodleStroke'), S('doodleFill')], width: 18, amp: 0.8, texture: 'crayon', seed: 3 } as Layer) },
  { id: 'rays', label: 'raysTool', icon: '☀', make: (c) => ({ id: c.id, kind: 'zigzag', mode: 'rays', x: 0.5, y: 0.6, w: 1.4, h: 1.4, rot: 0, count: 14, length: 0.85, width: 10, paint: S('doodleStroke'), texture: 'crayon' } as Layer) },
  shapeTool('bolt', 'boltTool', 'ϟ', 'bolt', { fill: S('doodleFill'), w: 0.12 }),
  shapeTool('exclaim', 'exclaimTool', '!', 'exclaim', { fill: S('doodleFill'), w: 0.06 }),
  shapeTool('spiky', 'spikyTool', '⩚', 'spiky', { fill: S('doodleFill'), w: 0.5, h: 0.5, points: 9 }),
  shapeTool('sun', 'sunTool', '☼', 'sun', { fill: null, stroke: S('doodleStroke'), strokeWidth: 6, texture: 'crayon', w: 0.18, points: 10 }),
  shapeTool('checker', 'checkerTool', '▩', 'checker', { fill: S('accent'), w: 0.15, points: 5 }),
  shapeTool('splat', 'splatTool', '✺', 'splat', { fill: S('doodleFill'), w: 0.15 }),
  shapeTool('squiggle', 'squiggleTool', '∿', 'squiggle', { fill: null, stroke: S('doodleStroke'), strokeWidth: 6, w: 0.2, points: 5 }),
  shapeTool('cross', 'crossTool', '✕', 'cross', { fill: null, stroke: S('doodleStroke'), strokeWidth: 6, w: 0.05 }),
  shapeTool('oval', 'ovalTool', '◯', 'oval', { fill: null, stroke: S('doodleStroke'), strokeWidth: 6, w: 0.3, h: 0.6, texture: 'marker' }),
  shapeTool('crown', 'crownTool', '♛', 'crown', { fill: S('starPrimary'), w: 0.25, points: 5, texture: 'crayon' }),
  shapeTool('loop', 'loopTool', '➰', 'loop', { fill: null, stroke: S('doodleStroke'), strokeWidth: 7, w: 0.3, texture: 'crayon' }),
  shapeTool('corners', 'cornersTool', '⌜', 'corners', { fill: null, stroke: S('accent'), strokeWidth: 5, w: 0.9, h: 0.9, x: 0.5, y: 0.5 }),
  // third set
  { id: 'slices', label: 'slicesTool', icon: '▥', make: (c) => ({ id: c.id, kind: 'slices', mode: 'torn', photo: 0, x: 0.5, y: 0.5, w: 0.6, h: 0.5, rot: 0, count: 5, gap: 8, paint: { color: '#FFFFFF' }, paint2: S('accent'), removed: 0.18, shift: 0.5, treatment: { type: 'none' }, seed: 3 } as Layer) },
  { id: 'leak', label: 'leakTool', icon: '🌈', make: (c) => ({ id: c.id, kind: 'leak', x: 0.5, y: 0.5, w: 1, rot: 0, paints: [{ color: '#9A3AF0' }, { color: '#F28A1A' }, { color: '#3AF07A' }], strength: 0.7, seed: Math.floor(Math.random() * 99) } as Layer) },
  { id: 'grunge', label: 'grungeTool', icon: '▧', make: (c) => ({ id: c.id, kind: 'grunge', x: 0.5, y: 0.3, w: 0.5, h: 0.2, rot: 3, paint: S('starPrimary'), paint2: { color: '#111111' }, seed: 4 } as Layer) },
  { id: 'mosaic', label: 'mosaicTool', icon: '▤', needsPhoto: true, make: (c) => ({ id: c.id, kind: 'mosaic', of: c.photo!, x: 0.5, y: 0.5, w: 1, rot: 0, count: 40, paints: [S('starPrimary'), S('starSecondary'), S('doodleFill'), S('accent')], confetti: true, seed: 5 } as Layer) },
  { id: 'dots', label: 'dotOrnamentTool', icon: '⁘', make: (c) => ({ id: c.id, kind: 'ornament', style: 'dots', motif: 'floral', x: 0.5, y: 0.35, w: 0.4, h: 0.35, rot: 0, paint: S('paper'), dot: 9, square: false } as Layer) },
  { id: 'lines', label: 'lineOrnamentTool', icon: '❦', make: (c) => ({ id: c.id, kind: 'ornament', style: 'line', motif: 'swirl', x: 0.5, y: 0.8, w: 0.5, h: 0.3, rot: 0, paint: { color: '#FFFFFF' }, dot: 8, square: false } as Layer) },
  { id: 'punch', label: 'punchTool', icon: '✩', make: (c) => ({ id: c.id, kind: 'punch', x: 0.5, y: 0.25, w: 1, h: 0.5, rot: 0, paint: S('paper'), texture: 'paper', holes: ['star'], count: 20, size: 0.07, seed: 7 } as Layer) },
  { id: 'ovalwin', label: 'ovalPanelTool', icon: '⬭', make: (c) => ({ id: c.id, kind: 'punch', x: 0.5, y: 0.5, w: 0.86, h: 0.84, rot: 0, paint: S('background'), texture: 'paper', holes: ['oval'], count: 1, size: 0.6, single: true, holeRot: -12 } as Layer) },
  { id: 'threshold', label: 'thresholdTool', icon: '◑', needsPhoto: true, make: (c) => ({ id: c.id, kind: 'threshold', of: c.photo!, anchor: 'eyes', x: 0.5, y: 0.5, w: 1, rot: 0, paint: { color: '#9E2A2A' }, ink: { color: '#111111' }, size: 1.2, seed: 2 } as Layer) },
  { id: 'frost', label: 'frostTool', icon: '❄', make: (c) => ({ id: c.id, kind: 'frost', shape: 'star', x: 0.5, y: 0.3, w: 0.22, rot: 0, frost: 0.5, seed: 3 } as Layer) },
  { id: 'facedoodle', label: 'faceDoodleTool', icon: '👓', needsPhoto: true, make: (c) => ({ id: c.id, kind: 'facedoodle', of: c.photo!, x: 0.5, y: 0.5, w: 1, rot: 0, items: ['glasses', 'mustache', 'blush', 'bow'], paints: [S('starPrimary'), S('starSecondary'), S('doodleFill'), S('accent')], width: 8 } as Layer) },
  { id: 'playback', label: 'playbackTool', icon: '▶', make: (c) => ({ id: c.id, kind: 'ui', widget: 'playback', x: 0.5, y: 0.4, w: 0.6, h: 0.25, rot: 0, paint: { color: '#F02A3A' }, title: new Date().toLocaleDateString() } as Layer) },
  { id: 'compact', label: 'compactTool', icon: '📸', make: (c) => ({ id: c.id, kind: 'ui', widget: 'compact', x: 0.5, y: 0.3, w: 0.6, h: 0.26, rot: 0, paint: { color: '#E0281E' } } as Layer) },
  { id: 'swatch', label: 'swatchTool', icon: '▨', make: (c) => ({ id: c.id, kind: 'ui', widget: 'swatch', x: 0.75, y: 0.75, w: 0.24, h: 0.2, rot: 4, title: 'YOUR COLOR' } as Layer) },
  shapeTool('grid3', 'gridTool', '#', 'grid3', { fill: null, stroke: { color: '#FFFFFF' }, strokeWidth: 2, w: 0.9, h: 1, x: 0.5, y: 0.5 }),
  shapeTool('spiral2', 'spiralTool', '@', 'spiral2', { fill: null, stroke: S('doodleStroke'), strokeWidth: 5, w: 0.25, texture: 'marker' })
];
