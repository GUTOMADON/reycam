/**
 * Filter pairing: a ReyCam look applied to the collage photo slots before the
 * template treatments. Looks run on the same WebGL renderer as the main editor,
 * through one shared instance, and results are cached per photo, look and
 * intensity, so moving stickers never re-runs the filter.
 *
 * The recommended "Lu" filters are created in a later step of the project. The
 * pairing table below is ready: a recommendation turns on as soon as a look
 * with that id exists in RECIPES. Until then the sheet offers the other looks.
 */
import { RECIPES, findRecipe } from '../engine/recipes';
import { GLRenderer, effectiveParams } from '../engine/renderer';
import { defaultEdit } from '../engine/utils';
import type { Recipe } from '../engine/types';

/** Recommended Lu filter per template number (1 based, gallery order). */
const PAIRING: Record<string, number[]> = {
  'lu-haze': [1, 2, 3, 21, 26, 44, 72, 74, 79, 87, 99, 105],
  'lu-flash': [9, 14, 22, 39, 49, 51, 57, 60, 70, 76, 88, 101],
  'lu-glitter': [42, 54, 63, 65, 109],
  'lu-neon': [5, 48, 108],
  'lu-angel': [38, 40, 46, 81, 89, 102],
  'lu-cry': [17, 28, 85, 97, 106],
  'lu-lazuli': [8, 43, 100],
  'lu-pop': [20, 25, 36, 110],
  'lu-sunset': [4, 13, 47, 84],
  'lu-green': [19],
  'lu-blue': [37, 59, 62, 67],
  'lu-vision': [18, 32, 98],
  'lu-alien': [35],
  'lu-adrenaline': [10, 11, 12, 15, 41, 52, 58, 75, 86, 91],
  'lu-retro': [6, 7, 16, 23, 24, 29, 30, 33, 45, 53, 77, 78, 80, 82, 83, 94, 95, 96, 104],
  'lu-capture': [27, 31, 34, 64, 66, 69, 73, 90, 92, 103, 107],
  'lu-vhs': [50, 55, 56, 61],
  'lu-vintage': [68, 71, 93]
};

const BY_NUMBER: Record<number, string> = {};
for (const [id, nums] of Object.entries(PAIRING)) for (const n of nums) BY_NUMBER[n] = id;

/** Recommended filter id for template number `n` (1 based). */
export const recommendedFor = (n: number): string | undefined => BY_NUMBER[n];

/** Display name of a Lu filter id ("lu-haze" -> "Lu Haze"). */
export const luName = (id: string) => id.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

export const lookExists = (id: string) => RECIPES.some((r) => r.id === id);

/** Looks offered in the "choose another filter" strip: Lu filters first once they exist. */
export function filterChoices(): Recipe[] {
  const lu = RECIPES.filter((r) => r.id.startsWith('lu-'));
  return [...lu, ...RECIPES.filter((r) => !r.id.startsWith('lu-') && r.cat !== 'video')];
}

export const DEFAULT_INTENSITY = 70;

// ---------------------------------------------------------------- applying a look

let gl: GLRenderer | null = null;
let glFailed = false;
const cache = new Map<string, HTMLCanvasElement>();

/** The photo with a look applied at `intensity` (0 to 100). Returns the source if WebGL is missing. */
export function applyLook(src: HTMLCanvasElement, key: string, lookId: string, intensity: number): HTMLCanvasElement {
  const k = `${key}|${lookId}|${intensity}|${src.width}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const out = runLook(src, lookId, intensity) ?? runLook(src, lookId, intensity, true);
  if (!out) {
    // Never fail silently: the editor shows a message and keeps the unfiltered photo.
    filterFailed = true;
    failListeners.forEach((fn) => fn());
    return src;
  }
  if (cache.size > 16) cache.delete(cache.keys().next().value as string);
  cache.set(k, out);
  return out;
}

let filterFailed = false;
const failListeners = new Set<() => void>();
/** True when a filter could not run on this device (no WebGL2 or the context keeps failing). */
export const filterUnavailable = () => filterFailed;
export function onFilterFailed(fn: () => void) { failListeners.add(fn); return () => { failListeners.delete(fn); }; }

/**
 * One filter pass on the shared WebGL renderer. Returns null when it fails. The
 * renderer is recreated when its context was lost (iOS drops WebGL contexts when the
 * app goes to the background or too many are alive), and the result is checked so an
 * empty frame is never used as a filtered photo.
 */
function runLook(src: HTMLCanvasElement, lookId: string, intensity: number, fresh = false): HTMLCanvasElement | null {
  if (glFailed) return null;
  try {
    if (fresh || !gl || gl.gl.isContextLost()) gl = new GLRenderer();
  } catch {
    glFailed = true;
    return null;
  }
  const recipe = findRecipe(lookId);
  const edit = { ...defaultEdit(), camId: recipe.id, intensity };
  const P = effectiveParams(recipe, edit, false);
  // Looks are photo grades: no frame, date stamp or overlays here.
  P.vignette = Math.min(P.vignette || 0, 40);
  const max = Math.min(1600, Math.max(src.width, src.height));
  const s = max / Math.max(src.width, src.height);
  const w = Math.round(src.width * s), h = Math.round(src.height * s);
  gl.setSource(src, true);
  gl.render(w, h, [0, 0, 1, 1], 0, false, P, recipe, false, 7, intensity / 100);
  if (gl.gl.isContextLost()) return null;
  const out = document.createElement('canvas');
  out.width = src.width; out.height = src.height;
  const octx = out.getContext('2d', { willReadFrequently: true })!;
  octx.drawImage(gl.canvas, 0, 0, src.width, src.height);
  // A lost or unflushed context gives a transparent frame: treat it as a failure.
  const probe = octx.getImageData(Math.floor(src.width / 2), Math.floor(src.height / 2), 1, 1).data;
  if (probe[3] === 0) return null;
  return out;
}

// ---------------------------------------------------------------- remembered choice per template

export type FilterChoice = { id: string; intensity: number } | null;
const STORE = 'reycam-collage-filter:';

export function rememberedFilter(templateId: string): FilterChoice | undefined {
  try {
    const v = localStorage.getItem(STORE + templateId);
    if (v === null) return undefined;
    return JSON.parse(v) as FilterChoice;
  } catch { return undefined; }
}

export function rememberFilter(templateId: string, choice: FilterChoice) {
  try { localStorage.setItem(STORE + templateId, JSON.stringify(choice)); } catch { /* storage blocked */ }
}
