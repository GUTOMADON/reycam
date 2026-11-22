import type { Recipe } from './types';

/** Additional looks for the moody category. */
const MOODY_NAMES = [
  'Mirror Mood', 'Mirror Green', 'Deep Azure', 'Cinema Dusk', 'Gym Blue', 'Night Portrait',
  'Cold Locker', 'Quiet Glass', 'Teal Shadow', 'Warm Skin Cool Room', 'Blue Hour Gym',
  'Storm Mirrors', 'Midnight Drill', 'Low Light Halo', 'Fogged Glass', 'Steel Evening',
  'Green Twilight', 'Velvet Shadow', 'Noir Trainer', 'Cyan Room', 'Pale Neon',
  'Dusky Frame', 'Blue Static', 'Museum Night', 'Green Channel', 'Soft Underlight',
  'Shadow Warmth', 'Night Rehearsal', 'Cold Cinema', 'Neon Tide', 'Slate Studio',
  'Tinted Glass', 'After Hours', 'Deep Focus', 'Blue Velvet', 'Gym Shadow',
  'Reflective Night', 'Muted Cyan', 'Darkroom Pulse', 'Evening Echo'
] as const;

export const MOODY_LOOKS: Recipe[] = MOODY_NAMES.map((name, i) => {
  const base: Recipe = i === 0
    ? {
        id: 'mirror-mood', name, cat: 'moody',
        desc: 'Dark blue-green cinema palette with warm natural skin',
        exposure: -12, contrast: 14, highlights: -8, shadows: 8, blacks: 10,
        temperature: -8, tint: -6, saturation: -34, vibrance: 2,
        shadowTint: [18, 78, 82], split: 0.38, fade: 4,
        hsl: { red: [-2, 4, 4], orange: [2, -2, 3], green: [8, -18, -8], aqua: [-4, 12, -4], blue: [-8, 12, -6] },
        grade: { sh: [188, 26], mid: [18, 8], hi: [24, 10] },
        bloom: 16, bloomTint: [255, 210, 154], clarity: 18, grain: 24, vignette: 42
      }
    : {
        id: `moody-${String(i).padStart(2, '0')}`, name, cat: 'moody',
        desc: 'Cold cinematic shadows with restrained, natural skin',
        exposure: -30 + (i % 7) * 6,
        contrast: 8 + (i % 6) * 5,
        highlights: -16 + (i % 4) * 5,
        shadows: -20 + (i % 5) * 4,
        blacks: -34 + (i % 7) * 5,
        temperature: -22 + (i % 9) * 4,
        tint: -10 + (i % 5) * 4,
        saturation: -38 + (i % 8) * 4,
        vibrance: i % 3,
        grain: i % 5 === 0 ? 30 + i : 8 + (i % 4) * 6,
        vignette: 18 + (i % 6) * 6,
        clarity: i % 4 === 0 ? 22 : 4 + (i % 4) * 3,
        bloom: i % 7 === 0 ? 24 : i % 6 === 0 ? 14 : 4,
        bloomTint: i % 5 === 0 ? [255, 192, 128] : [210, 232, 224],
        shadowTint: i % 3 === 0 ? [28, 82, 76] : i % 3 === 1 ? [38, 68, 96] : [55, 92, 86],
        split: 0.18 + (i % 5) * 0.06,
        hsl: {
          red: [0, i % 4 === 0 ? 8 : -4, 4],
          orange: [2, -4 - (i % 3), 5],
          green: [8, -16 - (i % 4) * 3, -8],
          aqua: [-4, 8 + (i % 4) * 3, -5],
          blue: [-6, 8 + (i % 5) * 2, -5]
        }
      };
  base.seed = i * 97 + 13;
  return base;
});
