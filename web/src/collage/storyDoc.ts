/**
 * Multi Photo Story documents. A story is a regular CollageDoc (so drafts, undo, redo,
 * autosave, palettes, filters per photo and export work as for templates) with a
 * `story` field holding the style, seed and layout options. Generated layers have ids
 * starting with "g-"; regenerating replaces them, keeps locked photos in place and
 * leaves everything the user added (stickers, text, drawings) untouched.
 */
import type { CollageDoc, CollagePhoto, Layer, Palette, Ratio } from './types';
import { DEFAULT_STORY_OPTIONS, buildStoryLayers, styleById, type PhotoMeta, type StoryOptions } from './story';
import { presetById } from './palettes';
import { features } from './detect';
import { uid } from './doc';

export const STORY_TEMPLATE_ID = 'story';
export const STORY_SOFT_LIMIT = 30;
export const STORY_HARD_LIMIT = 40;

const RATIO_AR: Record<string, number> = { '9:16': 9 / 16, '4:5': 4 / 5 };

/** Aspect, faces (from the person mask) and a simple quality score per photo. */
export function photoMeta(photos: CollagePhoto[]): PhotoMeta[] {
  return photos.map((p) => {
    const aspect = p.image.width / p.image.height;
    const faces = p.segmented ? features(p).heads.map((h) => ({ x: h.x, y: h.y, r: h.r })) : [];
    const px = Math.min(1, (p.image.width * p.image.height) / (1440 * 1080));
    return { aspect, faces, quality: px * 0.5 + (faces.length ? 0.4 : 0) + (faces[0] ? Math.min(0.1, faces[0].r) : 0) };
  });
}

export function storyPalette(): Palette {
  return { ...presetById('mono-paper').colors, background: '#F4EEE6', backgroundSecondary: '#E2D6C6', frame: '#FFFFFF', text: '#1A1A1A', doodleStroke: '#9E2A4A' };
}

/** Generated layers for a style, seed and options. */
function generated(meta: PhotoMeta[], ratio: Ratio, style: string, seed: number, opts: StoryOptions, locked: Layer[] = []) {
  const ar = RATIO_AR[ratio] ?? 9 / 16;
  const canvas = { w: 1080, h: 1080 / ar };
  const layout = styleById(style).generate(meta, canvas, opts, seed);
  return buildStoryLayers(layout, canvas, opts, locked).map((l) => (l.id.startsWith('g-') ? l : { ...l, id: 'g-' + l.id }));
}

/** New story document for the photos. */
export function makeStoryDoc(photos: CollagePhoto[], style: string, seed: number, opts?: Partial<StoryOptions>, ratio: Ratio = '9:16'): CollageDoc {
  const st = styleById(style);
  const o: StoryOptions = { ...DEFAULT_STORY_OPTIONS, ...st.defaults, ...opts };
  const now = Date.now();
  const bg = { id: 'bg', kind: 'background', x: 0.5, y: 0.5, w: 1, rot: 0, locked: true, style: 'solid', paint: { slot: 'background' }, paint2: { slot: 'backgroundSecondary' }, texture: 'paper' } as Layer;
  return {
    id: uid(), template: STORY_TEMPLATE_ID, ratio, palette: storyPalette(), slots: ['background', 'frame', 'text', 'doodleStroke'],
    layers: [bg, ...generated(photoMeta(photos), ratio, style, seed, o)],
    dateStamp: false, created: now, updated: now,
    story: { style, seed, opts: o, safeZones: true }
  };
}

/**
 * Lay the photos out again (new style, seed, options or photo count). Locked photos keep
 * their frame, user layers stay, generated layers are rebuilt.
 */
export function regenerateStory(doc: CollageDoc, photos: CollagePhoto[], ratio: Ratio = doc.ratio) {
  const s = doc.story!;
  const locked = doc.layers.filter((l) => l.id.startsWith('g-') && l.locked && l.kind === 'photo' && (l as { photo: number }).photo < photos.length);
  const user = doc.layers.filter((l) => l.kind !== 'background' && !l.id.startsWith('g-'));
  const bg = doc.layers.filter((l) => l.kind === 'background');
  doc.layers = [...bg, ...generated(photoMeta(photos), ratio, s.style, s.seed, s.opts, locked), ...user];
}

/** A copy of the story laid out again for the 4:5 feed (1080 by 1350). */
export function feedVersion(doc: CollageDoc, photos: CollagePhoto[]): CollageDoc {
  const copy: CollageDoc = JSON.parse(JSON.stringify(doc));
  copy.ratio = '4:5';
  regenerateStory(copy, photos, '4:5');
  return copy;
}
