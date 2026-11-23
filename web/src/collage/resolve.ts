import type { Paint, Palette } from './types';

/** Color for a paint: its own override first, then the palette slot, then the fallback. */
export function resolvePaint(p: Paint | null | undefined, palette: Palette, fallback: string): string {
  if (!p) return fallback;
  if (p.color) return p.color;
  if (p.slot && palette[p.slot]) return palette[p.slot];
  return fallback;
}

/** True when the element no longer follows its slot (shown as a broken link). */
export const isOverridden = (p: Paint | null | undefined) => !!(p && p.color && p.slot);
