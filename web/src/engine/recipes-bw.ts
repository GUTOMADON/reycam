import type { Recipe } from './types';

/** Additional looks for the bw category. */
const BW_NAMES = [
  'Silver 35', 'Darkroom Ink', 'Soft Portrait Mono', 'Street Flash', 'Noir Contrast',
  'Fine Grain Paper', 'Cold Steel', 'Warm Silver', 'Sepia Whisper', 'Leaded Nocturne',
  'High Key Mono', 'Low Key Mono', 'Red Filter Mono', 'Yellow Filter Mono', 'Green Filter Mono',
  'Old Press', 'Newsprint 1950', 'Documentary Street', 'Studio Soft', 'Museum Silver',
  'Flash Street', 'Faded Snapshot', 'Heavy Grain', 'Fine 100', 'Push 400',
  'Canyon Red', 'Foggy Road', 'Matte Silver', 'Deep Shadows', 'Bright Negative',
  'Retouch Mono', 'Cinematic Noir', 'Archive 1965', 'Minimal Chrome', 'Soft Cloud',
  'Classic Press', 'Urban Rain', 'Silver Dust'
] as const;

export const BW_LOOKS: Recipe[] = BW_NAMES.map((name, i) => ({
  id: `bw-${String(i).padStart(2, '0')}`,
  name,
  cat: 'bw',
  desc: i % 8 === 0 ? 'Soft monochrome portrait with clean highlights'
    : i % 7 === 0 ? 'Faded black and white snapshot with warm print tones'
      : i % 5 === 0 ? 'Graphic monochrome with deep shadows and coarse grain'
        : 'Distinct silver-halide style with balanced contrast',
  mono: true,
  exposure: i % 6 === 0 ? 12 : i % 6 === 1 ? -10 : i % 6 === 2 ? 4 : -4,
  contrast: 8 + (i % 9) * 4,
  highlights: i % 4 === 0 ? -22 : i % 4 === 1 ? 12 : -6,
  shadows: i % 5 === 0 ? -22 : i % 5 === 1 ? 18 : 2,
  blacks: i % 7 === 0 ? -28 : i % 7 === 1 ? 16 : -8,
  grain: i % 3 === 0 ? 52 : i % 3 === 1 ? 14 : 28,
  grainSize: i % 4 === 0 ? 28 : 12,
  clarity: i % 6 === 0 ? -12 : i % 6 === 1 ? 20 : 5,
  vignette: i % 5 === 0 ? 48 : i % 5 === 1 ? 8 : 22,
  fade: i % 8 === 0 ? 24 : i % 8 === 1 ? 12 : 2,
  sepia: i === 8 || i === 27,
  dust: i % 9 === 0 ? 44 : 0,
  seed: i * 83 + 31
}));
