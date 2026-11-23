/**
 * Collage data model.
 *
 * A collage is a list of layers drawn in order on a canvas of a given ratio.
 * Positions are normalized: x and y are the layer center as a fraction of the
 * canvas width and height, and w is the layer width as a fraction of the
 * canvas width. This keeps templates resolution independent, so the same
 * document renders the preview, the gallery thumbnail and the full size export.
 *
 * Colors are never stored directly on layers by templates. Layers point to a
 * named color slot ("background", "starPrimary"...) and the collage palette
 * maps slots to colors. A layer can override its slot with its own color; the
 * editor shows that link as broken and offers to relink it.
 */

/** A localized string. English is required, other languages fall back to it. */
export type Localized = { en: string } & Partial<Record<string, string>>;

export type Ratio = '9:16' | '4:5' | '3:4' | '1:1' | '4:3' | '5:7' | '2:3' | '20:19' | 'free';

/** Standard slot names. Templates may add their own (for example "patch3"). */
export type SlotName =
  | 'background' | 'backgroundSecondary' | 'paper' | 'starPrimary' | 'starSecondary'
  | 'doodleFill' | 'doodleStroke' | 'outline' | 'outlineSecondary' | 'tint' | 'tintSecondary'
  | 'text' | 'frame' | 'accent' | (string & {});

export type Palette = Record<string, string>;

/** Paint for a fill or a stroke: a palette slot, optionally overridden by a fixed color. */
export interface Paint {
  slot?: SlotName;
  /** Fixed color that replaces the slot color for this element only (#RRGGBB or #RRGGBBAA). */
  color?: string;
}

/** Star surface. "flat" uses the paint color, the others are special materials. */
export type Material = 'flat' | 'holo' | 'pastel' | 'metallic' | 'pearl' | 'puffy';

export type Texture =
  | 'none' | 'felt' | 'kraft' | 'watercolor' | 'poster' | 'recycled' | 'folds'
  | 'fabric' | 'crayon' | 'chalk' | 'marker' | 'paper' | 'pencil';

export type Treatment =
  | { type: 'none' }
  | { type: 'bw'; contrast: number; grain: number }
  | { type: 'sepia'; amount: number; fade: number; grain: number }
  | { type: 'mono'; tint: Paint; paper: Paint; grain: number }
  | { type: 'duotone'; dark: Paint; light: Paint; grain: number }
  | { type: 'halftone'; dot: number; ink: Paint; paper: Paint }
  | { type: 'overlay'; color: Paint; mode: 'multiply' | 'screen' | 'overlay' | 'source-over'; opacity: number }
  | { type: 'warm'; amount: number; grain: number }
  | { type: 'flash'; contrast: number; grain: number };

export type FrameStyle = 'none' | 'booth' | 'film' | 'polaroid' | 'white';

export type CutoutStyle = 'none' | 'clean' | 'sticker' | 'torn' | 'silhouette' | 'window';

export type ShapeKind =
  | 'star5' | 'star4' | 'sparkle' | 'burst' | 'paperStar' | 'heart' | 'dot'
  | 'asterisk' | 'swirl' | 'ring' | 'rect' | 'circle';

export interface LayerBase {
  id: string;
  kind: string;
  x: number;
  y: number;
  w: number;
  rot: number;
  flip?: boolean;
  hidden?: boolean;
  locked?: boolean;
  opacity?: number;
  /** Mask this layer with the subject of a photo layer, so it sits behind the person. */
  behind?: string;
}

export interface BackgroundLayer extends LayerBase {
  kind: 'background';
  style: 'solid' | 'stripes' | 'split' | 'crayon' | 'sky' | 'desktop' | 'desktop3d' | 'photo';
  paint: Paint;
  paint2?: Paint;
  texture: Texture;
  texture2?: Texture;
  stripeWidth?: number;
  stripeAngle?: number;
  /** Paper fold grid or a single fold line across the middle. */
  folds?: 'none' | 'grid' | 'middle';
  /** Photo background: index of the photo, blur in px at 1080 wide, black and white. */
  photo?: number;
  blur?: number;
  bw?: boolean;
  /** Sky and desktop scenes: grass and cloud colors. */
  paint3?: Paint;
}

export interface PhotoLayer extends LayerBase {
  kind: 'photo';
  photo: number;
  treatment: Treatment;
  frame: FrameStyle;
  frameMargin?: number;
  framePaint?: Paint;
  cutout: CutoutStyle;
  outline?: Paint;
  outlineWidth?: number;
  roughEdge?: boolean;
  shadow?: boolean;
  fill?: Paint;
  windowShape?: 'star' | 'burst' | 'rounded';
  /** Crop to this aspect (w / h) around the image center. */
  aspect?: number;
  /** Extra zoom inside the crop (1 = no zoom) and focus point. */
  zoom?: number;
}

/** The person cut out from a photo layer, drawn with the same transform as that layer. */
export interface SubjectLayer extends LayerBase {
  kind: 'subject';
  of: string;
  cutout: Exclude<CutoutStyle, 'none' | 'window'>;
  treatment?: Treatment;
  outline?: Paint;
  outlineWidth?: number;
  roughEdge?: boolean;
  shadow?: boolean;
  fill?: Paint;
}

export interface ShapeLayer extends LayerBase {
  kind: 'shape';
  shape: ShapeKind;
  fill?: Paint | null;
  stroke?: Paint | null;
  strokeWidth?: number;
  /** Offset of the stroke from the fill, as a fraction of the shape size (sloppy print look). */
  offset?: number;
  material?: Material;
  texture?: Texture;
  points?: number;
  /** 0 = perfect, 1 = very irregular (hand cut). */
  wobble?: number;
  rounded?: boolean;
  seed?: number;
  h?: number;
  /** Blend with what is underneath (template 5 star is multiply). */
  blend?: 'multiply' | 'screen' | 'overlay';
}

export interface PatchLayer extends LayerBase {
  kind: 'patch';
  shape: 'star' | 'heart';
  pattern: 'glitter' | 'stripes' | 'dots' | 'spiral' | 'rhinestone' | 'sunburst' | 'plain';
  paint: Paint;
  paint2: Paint;
  seed?: number;
}

export interface TextLayer extends LayerBase {
  kind: 'text';
  text: string;
  font: 'script' | 'marker' | 'pixel' | 'sans' | 'serif';
  paint: Paint;
  /** Font size as a fraction of the canvas width. */
  size: number;
  align?: 'left' | 'center' | 'right';
}

export interface TilesLayer extends LayerBase {
  kind: 'tiles';
  text: string;
  tiles: Paint[];
  letters: Paint[];
  seed?: number;
}

export interface PatternLayer extends LayerBase {
  kind: 'pattern';
  word: string;
  paint: Paint;
  rows: number;
  h: number;
}

export interface UiLayer extends LayerBase {
  kind: 'ui';
  widget: 'dialog' | 'icon' | 'pointer' | 'selection' | 'toolbox' | 'bin' | 'folder' | 'paint' | 'file';
  style?: 'flat' | '3d';
  title?: string;
  message?: string;
  buttons?: string[];
  label?: string;
  icon?: 'pc' | 'trash' | 'globe' | 'folder' | 'image' | 'music' | 'zip' | 'warning';
  paint?: Paint;
  paint2?: Paint;
  /** Message and label color. */
  text?: Paint;
  h?: number;
}

export interface RibbonLayer extends LayerBase {
  kind: 'ribbon';
  /** Path points relative to the layer box (0..1 on both axes), box height is h * canvas height. */
  points: [number, number][];
  h: number;
  width: number;
  paint: Paint;
  texture: Texture;
  /** Per segment: true = passes behind the subject of photo layer `of`. */
  weave: boolean[];
  of?: string;
}

export interface ZigzagLayer extends LayerBase {
  kind: 'zigzag';
  count: number;
  paint: Paint;
  width: number;
  texture: Texture;
  h: number;
}

/** Hand drawn line that follows the subject of a photo layer. */
export interface OutlineLayer extends LayerBase {
  kind: 'outline';
  of: string;
  distance: number;
  width: number;
  paint: Paint;
  texture: Texture;
}

export interface Stroke {
  brush: 'marker' | 'crayon' | 'chalk' | 'pencil';
  color: string;
  width: number;
  /** Points in canvas fractions with a width factor from pointer pressure or speed. */
  pts: [number, number, number][];
}

export interface DrawLayer extends LayerBase {
  kind: 'draw';
  strokes: Stroke[];
}

export type Layer =
  | BackgroundLayer | PhotoLayer | SubjectLayer | ShapeLayer | PatchLayer | TextLayer
  | TilesLayer | PatternLayer | UiLayer | RibbonLayer | ZigzagLayer | OutlineLayer | DrawLayer;

export type TemplateTag = 'stars' | 'booth' | 'paper' | 'doodle' | 'desktop' | 'duo';

/**
 * A built in or user template. Everything is data, so new templates can be
 * added to templates.ts (or loaded from JSON) without touching the renderer.
 */
export interface CollageTemplate {
  id: string;
  name: Localized;
  ratio: Ratio;
  tags: TemplateTag[];
  /** Number of photo slots. Missing photos reuse the first one. */
  photos: 1 | 2;
  /** Preset palette id this template starts from. */
  palette: string;
  /** Template specific defaults on top of the preset (sampled from the reference). */
  colors: Palette;
  /** Slots shown first in the Colors panel. */
  slots: SlotName[];
  layers: Layer[];
  /** Whole image finish drawn on top of every layer. */
  finish?: 'film';
}

/** The editable document of one collage. */
export interface CollageDoc {
  id: string;
  template: string;
  ratio: Ratio;
  /** Width / height for the "free" ratio. */
  freeAspect?: number;
  palette: Palette;
  slots: SlotName[];
  layers: Layer[];
  dateStamp: boolean;
  finish?: 'film';
  created: number;
  updated: number;
}

/** A user photo with its subject mask, kept in memory while editing. */
export interface CollagePhoto {
  id: string;
  /** Original pixels, never modified. */
  image: HTMLCanvasElement;
  /** Subject mask, same size as image. Alpha = subject. Edited by the refine brushes. */
  mask: HTMLCanvasElement;
  /** True once the automatic cutout ran (or failed, leaving a full mask). */
  segmented: boolean;
}
