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

export type Ratio = '9:16' | '4:5' | '3:4' | '1:1' | '4:3' | '5:7' | '2:3' | '20:19' | '6:7' | '3:5' | '6:5' | 'free';

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
  | 'fabric' | 'crayon' | 'chalk' | 'marker' | 'paper' | 'pencil' | 'crumpled' | 'notebook' | 'newsprint' | 'canvas' | 'oil' | 'spray' | 'halftone' | 'denim' | 'riso';

export type Treatment =
  | { type: 'none' }
  | { type: 'bw'; contrast: number; grain: number }
  | { type: 'sepia'; amount: number; fade: number; grain: number }
  | { type: 'mono'; tint: Paint; paper: Paint; grain: number }
  | { type: 'duotone'; dark: Paint; light: Paint; grain: number }
  | { type: 'halftone'; dot: number; ink: Paint; paper: Paint; square?: boolean }
  | { type: 'overlay'; color: Paint; mode: 'multiply' | 'screen' | 'overlay' | 'source-over'; opacity: number }
  | { type: 'warm'; amount: number; grain: number }
  | { type: 'flash'; contrast: number; grain: number }
  /** Inverted photo mapped from `tint` (bright areas of the original) to `paper`. */
  | { type: 'negative'; tint: Paint; paper: Paint; grain: number }
  /** Few flat levels mapped between two colors (crop windows, comic look). */
  | { type: 'posterize'; levels: number; dark: Paint; light: Paint }
  | { type: 'invert' }
  /** Color grade: multiply a tint into the photo, lift or crush the blacks. */
  | { type: 'grade'; tint: Paint; amount: number; contrast: number; fade: number; grain: number; saturation?: number }
  /** Vivid hand painted illustration: posterize, gradient map, line art and hatching. */
  | { type: 'paint'; scheme: 'neon' | 'ocean' | 'sunset'; lines: number; hatch: Paint };

export type FrameStyle = 'none' | 'booth' | 'film' | 'polaroid' | 'white' | 'rough';

export type CutoutStyle = 'none' | 'clean' | 'sticker' | 'torn' | 'silhouette' | 'window';

export type ShapeKind =
  | 'star5' | 'star4' | 'sparkle' | 'burst' | 'paperStar' | 'heart' | 'dot'
  | 'asterisk' | 'swirl' | 'ring' | 'rect' | 'circle'
  | 'bolt' | 'bar' | 'exclaim' | 'crown' | 'splat' | 'checker' | 'squiggle' | 'sun' | 'loop' | 'cross' | 'oval'
  | 'spiky' | 'tornStrip' | 'corners' | 'grid3' | 'spiral2';

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
  style: 'solid' | 'stripes' | 'split' | 'crayon' | 'sky' | 'desktop' | 'desktop3d' | 'photo'
    | 'quilt' | 'comic' | 'ghost' | 'sunburst' | 'torn' | 'journal' | 'zebra' | 'stained' | 'tiles' | 'grunge' | 'gradient';
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
  /** Photo and ghost backgrounds: treatment (wins over `bw`) and a paper texture drawn over it. */
  treatment?: Treatment;
  overlay?: Texture;
  /** Ghost repeat: tiles per row. */
  tiles?: number;
  /** Quilt strips and extra scene colors, in order. */
  paints?: Paint[];
  /** Felt quilt: show the felt sun, moon, clouds and trees. */
  felt?: boolean;
  seed?: number;
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
  windowShape?: 'star' | 'burst' | 'rounded' | 'star4' | 'heart' | 'oval';
  /** Rounded photo corners, px at 1080 wide. */
  radius?: number;
  /** Soft edge of a shape window (head portal), 0 to 1, and dark inner vignette. */
  feather?: number;
  vignette?: number;
  /** Blend with what is underneath (double exposure). */
  blend?: 'lighten' | 'screen' | 'multiply';
  /** RGB split glow on the photo edges (Y2K look), px at 1080 wide. */
  rgbSplit?: number;
  /** Small stars printed on the frame margin, in this color. */
  frameStars?: Paint;
  /** Outline around the photo or the shape window (thin crop frames, glowing star window). */
  stroke?: Paint;
  strokeWidth?: number;
  /** Soft colored glow around the cutout or the window. */
  glow?: Paint;
  /** CRT scanlines over the photo, 0 to 1. */
  scanlines?: number;
  /** Face crop zoom: center the crop on a detected feature. Index picks the person, left to right. */
  anchor?: Anchor;
  anchorIndex?: number;
  /** Manual focus point of the crop (0..1 of the image), wins over `anchor`. */
  focus?: [number, number];
  /** Crop to this aspect (w / h) around the image center. */
  aspect?: number;
  /** Extra zoom inside the crop (1 = no zoom) and focus point. */
  zoom?: number;
}

export type Anchor = 'face' | 'eyes' | 'mouth' | 'hands' | 'feet' | 'body';

/** The person cut out from a photo layer, drawn with the same transform as that layer. */
export interface SubjectLayer extends LayerBase {
  kind: 'subject';
  of: string;
  /** Shift from the photo position, as canvas fractions (cast shadow copies). */
  dx?: number;
  dy?: number;
  /** Silhouette fill collage: tiny paper clippings inside the shape. */
  clippings?: boolean;
  glow?: Paint;
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
  font: 'script' | 'marker' | 'pixel' | 'sans' | 'serif' | 'brush' | 'typewriter' | 'display';
  paint: Paint;
  /** Offset outline around the letters (hand lettered titles). */
  stroke?: Paint;
  strokeWidth?: number;
  /** Paper strip, tilted tag or washi tape behind the text. */
  bg?: Paint;
  bgStyle?: 'strip' | 'tag' | 'tape';
  texture?: Texture;
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
  widget: 'dialog' | 'icon' | 'pointer' | 'selection' | 'toolbox' | 'bin' | 'folder' | 'paint' | 'file'
    | 'window' | 'taskbar' | 'camera' | 'playback' | 'compact' | 'swatch';
  /** Retro window content. */
  content?: 'photo' | 'player' | 'notes' | 'trash';
  /** Photo shown in a window, with its own treatment and crop anchor. */
  photo?: number;
  treatment?: Treatment;
  anchor?: Anchor;
  zoom?: number;
  glow?: Paint;
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
  /** Thread connectors: straight segments between round pins. */
  straight?: boolean;
  pins?: Paint;
}

export interface ZigzagLayer extends LayerBase {
  kind: 'zigzag';
  /** Nested zigzag arcs (default) or straight crayon rays from the center. */
  mode?: 'zigzag' | 'rays';
  /** Rays: length as a share of the box, 0.2 to 1. */
  length?: number;
  seed?: number;
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
  /** Dashed line, like a stitch running around a sticker outline. */
  dash?: boolean;
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

/** One face of a color block heads layer: square color, face ink, size and offset. */
export interface HeadBlock { paint: Paint; ink: Paint; size: number; dx: number; dy: number; rot: number }

/** Color block heads: a square behind each detected head, the head recolored inside it. */
export interface HeadsLayer extends LayerBase {
  kind: 'heads';
  of: string;
  /** Settings per face, left to right; cycles when there are more faces. */
  blocks: HeadBlock[];
}

/** Spiky comic speech bubble with hand lettered text. */
export interface BubbleLayer extends LayerBase {
  kind: 'bubble';
  text: string;
  spikes: number;
  randomness: number;
  h: number;
  paint: Paint;
  stroke: Paint;
  textPaint: Paint;
  seed?: number;
}

/** Torn magazine page: irregular polygon with a white cut edge and fake print. */
export interface TornLayer extends LayerBase {
  kind: 'torn';
  h: number;
  paint: Paint;
  edge?: Paint;
  points: number;
  /** Fake magazine text density: 0 = none, 1 = dense. */
  print: number;
  /** Big word printed on the page (a name, a title). */
  word?: string;
  textPaint?: Paint;
  seed?: number;
}

/** Chalk or pencil lines over the subject, from the photo edges, with hatching in the shadows. */
export interface SketchLayer extends LayerBase {
  kind: 'sketch';
  of: string;
  paint: Paint;
  density: number;
  width: number;
  hatch: boolean;
}

/** Dense crayon scribbles filling the box, cleared around the person. */
export interface ScribbleLayer extends LayerBase {
  kind: 'scribble';
  of?: string;
  h: number;
  paint: Paint;
  density: number;
  width: number;
  /** Clear area around the subject, px at 1080 wide. */
  padding: number;
  seed?: number;
}

/** A rectangle over a photo where the content gets another treatment, with crop guides. */
export interface CropWindowLayer extends LayerBase {
  kind: 'cropwin';
  of: string;
  h: number;
  treatment: Treatment;
  guide?: Paint;
}

export type PatchworkPattern = 'sky' | 'stripes' | 'dots' | 'swirls' | 'spots' | 'plaid' | 'shapes' | 'gradient';

/** The subject split into organic regions, some filled with patterns. */
export interface PatchworkLayer extends LayerBase {
  kind: 'patchwork';
  of: string;
  count: number;
  /** Share of regions that get a pattern, 0 to 1. */
  share: number;
  patterns: PatchworkPattern[];
  paints: Paint[];
  seed?: number;
}

/** Several photos in a grid, strips, contact sheet or filmstrip. */
export interface LayoutLayer extends LayerBase {
  kind: 'layout';
  mode: 'grid' | 'strips' | 'contact' | 'film';
  rows: number;
  cols: number;
  h: number;
  /** Gutter and outer border in px at 1080 wide. */
  gutter: number;
  border: number;
  paint: Paint;
  treatment: Treatment;
  /** Photo index and crop anchor per cell, cycling when shorter than the cells. */
  cells: { photo: number; anchor?: Anchor; zoom?: number; blur?: boolean; /** Manual crop center (0..1 of the photo), set by dragging the photo inside its cell. */ focus?: [number, number] }[];
  scanlines?: number;
  /** Film strip edge text and frame numbers; photo rotation inside each cell (0 or 90). */
  edgeText?: string;
  cellRot?: number;
  textPaint?: Paint;
  /** Paper shadow under the whole print. */
  shadow?: boolean;
  /** Rounded cell corners, px at 1080 wide. */
  radius?: number;
  /** Torn paper edge dividers between strips. */
  torn?: boolean;
  roughness?: number;
}

/** Focus boxes around detected faces, hands and feet, like a camera screen. */
export interface BoxesLayer extends LayerBase {
  kind: 'boxes';
  of: string;
  targets: Anchor[];
  paint: Paint;
  width: number;
  rounded: boolean;
  pointer: boolean;
}

/** Flowing wavy lines: liquid contour swirls or parallel crayon waves. */
export interface WavesLayer extends LayerBase {
  kind: 'waves';
  mode: 'contour' | 'parallel';
  count: number;
  h: number;
  paints: Paint[];
  width: number;
  amp: number;
  texture: Texture;
  seed?: number;
}

export type StickerArt =
  // felt quilt kit
  | 'feltSun' | 'feltMoon' | 'feltCloud' | 'feltTree' | 'bee' | 'ladybug' | 'snail' | 'bunny'
  // nature cutouts
  | 'goldfish' | 'apple' | 'wings' | 'mushroom' | 'rock' | 'river' | 'tree' | 'flower' | 'tulips'
  // sticker pack
  | 'plushStar' | 'sequinStar' | 'embroideredStar' | 'chromeStar' | 'smileStar' | 'starfish' | 'butterfly' | 'clover'
  | 'cassette' | 'boombox' | 'dice' | 'cap' | 'headphones' | 'vinyl' | 'camera' | 'lips' | 'pin' | 'ticket' | 'sneaker'
  | 'planet' | 'musicNote' | 'sunglasses' | 'moon' | 'polaroid' | 'receipt' | 'phone' | 'shorts' | 'watch' | 'glitterFlower' | 'cameraCard'
  // third set: Y2K, craft, toys and decor
  | 'glitterHeart' | 'chromeSwirl' | 'sparkleStar' | 'buttonStar' | 'clipStar' | 'balloonStar' | 'quiltedStar' | 'badge'
  | 'blockDab' | 'blockWave' | 'blockFall' | 'safetyPin' | 'paperclip' | 'bow' | 'cherries' | 'lily' | 'keytag';

/** An illustrated sticker from the original sticker library. */
export interface StickerLayer extends LayerBase {
  kind: 'sticker';
  /** Text on badges and key tags. */
  label?: string;
  art: StickerArt;
  paint: Paint;
  paint2?: Paint;
  /** Neon highlighter outline. */
  glow?: Paint;
  /** Thin white cut edge around the sticker. */
  edge?: boolean;
  seed?: number;
}

export type Layer =
  | BackgroundLayer | PhotoLayer | SubjectLayer | ShapeLayer | PatchLayer | TextLayer
  | TilesLayer | PatternLayer | UiLayer | RibbonLayer | ZigzagLayer | OutlineLayer | DrawLayer
  | HeadsLayer | BubbleLayer | TornLayer | SketchLayer | ScribbleLayer | CropWindowLayer | PatchworkLayer
  | LayoutLayer | BoxesLayer | WavesLayer | StickerLayer
  | SlicesLayer | LeakLayer | GrungeLayer | MosaicLayer | OrnamentLayer | PunchLayer | ThresholdLayer | FrostLayer | FaceDoodleLayer;

/** A photo cut into pieces: barcode strips, torn strips, pixel tiles or glass shards. */
export interface SlicesLayer extends LayerBase {
  kind: 'slices';
  mode: 'barcode' | 'torn' | 'tiles' | 'shards';
  photo: number;
  h: number;
  treatment: Treatment;
  anchor?: Anchor;
  zoom?: number;
  /** Strips, tears, tiles per row or shards. */
  count: number;
  /** Gap width in px at 1080 wide, gap color, and the share of removed tiles. */
  gap: number;
  paint: Paint;
  paint2?: Paint;
  removed?: number;
  /** Misalignment of the pieces, 0 to 1. */
  shift: number;
  seed?: number;
}

/** Light leaks, bokeh and prism ghosts, screen blended over everything below. */
export interface LeakLayer extends LayerBase {
  kind: 'leak';
  paints: Paint[];
  strength: number;
  seed?: number;
}

/** Torn poster block with spray paint, drips and pixel glitch. */
export interface GrungeLayer extends LayerBase {
  kind: 'grunge';
  h: number;
  paint: Paint;
  paint2: Paint;
  seed?: number;
}

/** Many small tinted crops of eyes, nose and mouth scattered over the face, plus confetti squares. */
export interface MosaicLayer extends LayerBase {
  kind: 'mosaic';
  of: string;
  count: number;
  paints: Paint[];
  confetti: boolean;
  seed?: number;
}

/** Floral and swirl ornaments drawn as dot matrix (cross stitch, LED) or thin lines. */
export interface OrnamentLayer extends LayerBase {
  kind: 'ornament';
  style: 'dots' | 'line';
  motif: 'floral' | 'swirl' | 'clover' | 'lily' | 'bouquet';
  h: number;
  paint: Paint;
  dot: number;
  square: boolean;
  seed?: number;
}

/** Flat color block with shapes punched out so what is below shows through. */
export interface PunchLayer extends LayerBase {
  kind: 'punch';
  h: number;
  paint: Paint;
  texture: Texture;
  holes: ('star' | 'spiral' | 'oval' | 'circle')[];
  count: number;
  size: number;
  /** Single centered hole (oval window, star window) instead of scattered holes. */
  single?: boolean;
  holeRot?: number;
  seed?: number;
}

/** Torn paper patch over a feature, converted to two tone threshold (ink on a flat color). */
export interface ThresholdLayer extends LayerBase {
  kind: 'threshold';
  of: string;
  anchor: Anchor;
  paint: Paint;
  ink: Paint;
  size: number;
  seed?: number;
}

/** Frosted glass shape: blurred, lightened view of what is below, with a ragged white edge. */
export interface FrostLayer extends LayerBase {
  kind: 'frost';
  shape: 'star' | 'circle';
  frost: number;
  seed?: number;
}

/** Crayon doodles placed on each face from the detected features (glasses, mustache, blush...). */
export interface FaceDoodleLayer extends LayerBase {
  kind: 'facedoodle';
  of: string;
  items: ('glasses' | 'mask' | 'mustache' | 'blush' | 'bow' | 'horns')[];
  paints: Paint[];
  width: number;
}

export type TemplateTag = 'stars' | 'booth' | 'paper' | 'doodle' | 'desktop' | 'duo' | 'comic' | 'scrapbook' | 'halftone' | 'nature';

/**
 * A built in or user template. Everything is data, so new templates can be
 * added to templates.ts (or loaded from JSON) without touching the renderer.
 */
export interface CollageTemplate {
  id: string;
  name: Localized;
  ratio: Ratio;
  tags: TemplateTag[];
  /** Number of photo slots (1 to 5). Missing photos reuse the first one. */
  photos: number;
  /** Preset palette id this template starts from. */
  palette: string;
  /** Template specific defaults on top of the preset (sampled from the reference). */
  colors: Palette;
  /** Slots shown first in the Colors panel. */
  slots: SlotName[];
  layers: Layer[];
  /** Recommended photo filter (look id) for the filter pairing sheet. */
  filter?: string;
  /** Whole image finish drawn on top of every layer. */
  finish?: 'film' | 'riso';
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
  /** Photo filter (a ReyCam look) applied to the photo slots before the template treatments. */
  filter?: { id: string; intensity: number };
  /** Multi Photo Story settings: style, seed, layout options and the 9:16 safe zone overlay. */
  story?: { style: string; seed: number; opts: import('./story').StoryOptions; safeZones: boolean };
  /** Per photo slot filter (by photo index). null = no filter for that photo, missing = use `filter`. */
  slotFilters?: Record<number, { id: string; intensity: number } | null>;
  finish?: 'film' | 'riso';
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
