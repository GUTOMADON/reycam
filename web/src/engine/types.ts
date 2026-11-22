export type RGB = [number, number, number];

export type Category =
  | 'moody' | 'bw' | 'film' | 'sim' | 'y2k' | 'flash' | 'indie' | 'lowlight' | 'nature' | 'yellow' | 'green' | 'wine' | 'color' | 'video' | 'extra' | 'mine';

export type FrameId = 'auto' | 'none' | 'border' | 'instant' | 'square' | 'film' | 'slide' | 'half' | '8mm' | 'cinema';
export type StampStyle = 'date' | 'vhs' | 'dcr' | 'cctv' | null;

/** Numeric adjustment keys shared by camera recipes and user edits. */
export const ADJ_KEYS = [
  'exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks', 'brightness', 'fade',
  'curveShadows', 'curveDarks', 'curveLights', 'curveHighlights',
  'temperature', 'tint', 'vibrance', 'saturation', 'hue',
  'clarity', 'dehaze', 'sharpen', 'softness', 'smoothSkin',
  'grain', 'grainSize', 'vignette', 'bloom', 'leak', 'dust', 'chroma', 'scanlines', 'glitch', 'flicker', 'lofi',
  'gShH', 'gShS', 'gMidH', 'gMidS', 'gHiH', 'gHiS', 'gBal'
] as const;

export const BANDS = [
  { id: 'red', c: 0, w: 42, sw: '#ff4d4d' },
  { id: 'orange', c: 30, w: 42, sw: '#ff9a3d' },
  { id: 'yellow', c: 60, w: 42, sw: '#ffe14d' },
  { id: 'green', c: 120, w: 60, sw: '#4fd16b' },
  { id: 'aqua', c: 180, w: 60, sw: '#3fd6d6' },
  { id: 'blue', c: 230, w: 60, sw: '#4d7dff' },
  { id: 'purple', c: 275, w: 42, sw: '#9d6bff' },
  { id: 'magenta', c: 315, w: 42, sw: '#ff5ccf' }
] as const;

export type BandId = typeof BANDS[number]['id'];
export type Adj = Record<string, number>;

export interface Recipe {
  id: string;
  name: string;
  cat: Category;
  desc: string;
  [key: string]: any;
  lift?: RGB;
  gain?: RGB;
  shadowTint?: RGB;
  hiTint?: RGB;
  split?: number;
  duotone?: [RGB, RGB];
  duoAmount?: number;
  bloomTint?: RGB;
  mono?: boolean;
  sepia?: boolean;
  fisheye?: number;
  prism?: number;
  anaglyph?: number;
  weave?: boolean;
  frame?: FrameId;
  stamp?: StampStyle;
  stampColor?: string;
  hsl?: Partial<Record<BandId, [number, number, number]>>;
  grade?: { sh?: [number, number]; mid?: [number, number]; hi?: [number, number] };
}

export interface EditState {
  camId: string;
  intensity: number;
  adj: Adj;
  frame: FrameId;
  aspect: string;
  stamp: 'auto' | 'off' | 'date' | 'vhs' | 'dcr' | 'cctv';
  stampSize: 'small' | 'medium' | 'large';
  stampColor: 'match' | 'orange' | 'yellow' | 'red' | 'white';
  dateFormat: 'yy' | 'dd' | 'iso' | 'mon';
  dateText: string;
  flipH: boolean;
  rotate: number;
}

export interface RenderOptions {
  recipe: Recipe;
  edit: EditState;
  time: number;
  isVideo: boolean;
  maxSize: number;
  plain: boolean;
  seed: number;
}
