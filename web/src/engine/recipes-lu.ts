import type { QuickAdj, Recipe } from './types';

/**
 * LU looks (24, category "lu") and Gu looks (6, featured first in "indie").
 *
 * Every look is data: the same keys as the other ReyCam looks plus the LU stages
 * (gmap, poster, thresh, halftone, flash, glitter, flares, flashShadow...). Values
 * use the slider scale, so the intensity slider scales the whole look and the quick
 * adjustments add on top. Exposure is in slider units (60 = 1 EV).
 *
 * To add a look, add one entry here (and its Portuguese description in
 * i18n/locales/pt.json). Quick adjustment labels live in QUICK_LABELS below.
 */

const q = (id: string, map: Record<string, number>): QuickAdj => ({ id, map });
const choice = (id: string, options: string[]): QuickAdj => ({ id, kind: 'choice', options });
const shuffle = (): QuickAdj => ({ kind: 'shuffle', id: 'shuffle' });
const GRAIN = (n: number) => q('grain', { grain: n });

export const LU_LOOKS: Recipe[] = [
  // ------------------------------------------------ signature looks
  { id: 'lu-haze', name: 'Lu Haze', cat: 'lu', badge: 'star', desc: 'Dreamy washed out mirror selfie with a pink lilac haze, soft glow and colorful grain',
    temperature: 6, tint: 22, exposure: 18, contrast: -35, highlights: -20, shadows: 30, whites: -15, blacks: 25, fade: 35,
    lift: [0.15, 0.17, 0.16], gain: [0.95, 0.92, 0.93],
    grade: { hi: [330, 30], mid: [335, 10], sh: [150, 10] }, gBal: 20,
    hsl: { red: [0, 10, 0], orange: [0, -5, 12], yellow: [0, -30, 0], green: [20, -40, 0], blue: [0, -20, 0] },
    saturation: -12, vibrance: 5, bloom: 25, bloomTint: [255, 222, 236], softness: 8, clarity: -20,
    grain: 28, grainSize: 5, grainChroma: 40, vignette: 8, stamp: 'date',
    quick: [q('haze', { fade: 30, contrast: -20, softness: 8 }), q('pink', { tint: 20, gHiS: 15 }), q('glow', { bloom: 35 }), GRAIN(35)]
  },
  { id: 'lu-flash', name: 'Lu Flash', cat: 'lu', badge: 'star', desc: 'Editorial direct flash on warm film, cream wall, copper hair and matte blacks',
    temperature: 18, tint: -4, exposure: 12, contrast: 22, highlights: -30, shadows: -10, whites: 5, blacks: -20, fade: 10,
    lift: [0.06, 0.065, 0.05],
    grade: { sh: [95, 14], mid: [40, 16], hi: [50, 16] },
    hsl: { orange: [0, 35, 5], red: [0, 8, 0], yellow: [8, -15, 0], green: [0, -50, 0], aqua: [0, -40, 0], blue: [0, -40, 0] },
    skinProt: 85, vibrance: 14, saturation: -5, clarity: 8, sharpen: 25, flash: 100,
    grain: 22, grainSize: 9, grainShadow: 30, vignette: 15, stamp: 'date',
    quick: [q('flash', { flash: 80, exposure: 6 }), q('shadow', { flashShadow: 100 }), q('warmth', { temperature: 25 }), GRAIN(30)]
  },
  { id: 'lu-glitter', name: 'Lu Glitter', cat: 'lu', badge: 'star', desc: 'Dusty rose portrait on a holographic glitter wall with star flares',
    temperature: 15, tint: 18, exposure: -6, contrast: 25, highlights: -15, shadows: -5, blacks: -30,
    grade: { hi: [0, 20], mid: [15, 12], sh: [350, 6] },
    hsl: { orange: [-27, 40, 0], red: [0, 15, 0], yellow: [0, -20, 0], green: [0, -60, 0], aqua: [0, -60, 0], blue: [0, -60, 0] },
    clarity: 6, glitter: 100, flares: 100, grain: 15, vignette: 10,
    quick: [q('glitter', { glitter: 100 }), choice('colors', ['holo', 'gold', 'silver', 'pinkGlitter']), q('flares', { flares: 60 }), q('rose', { tint: 20, gHiS: 15 }), shuffle()]
  },
  // ------------------------------------------------ other LU looks
  { id: 'lu-neon', name: 'Lu Neon', cat: 'lu', desc: 'Night photos soaked in red neon with deep teal black shadows',
    temperature: 10, tint: 20, hsl: { red: [0, 40, -10], orange: [-20, 10, 0], blue: [0, -30, -40], aqua: [0, -30, -40] },
    grade: { hi: [355, 70], mid: [355, 45], sh: [180, 15] }, saturation: 20, contrast: 35, blacks: -40, bloom: 40, bloomTint: [255, 40, 50], grain: 20,
    quick: [q('red', { gHiS: 30, hsl_red_s: 30 }), q('halation', { bloom: 40 }), GRAIN(30)]
  },
  { id: 'lu-angel', name: 'Lu Angel', cat: 'lu', desc: 'Nineties Hong Kong night film, green teal shadows and soft halation',
    tint: -25, grade: { sh: [165, 30], hi: [60, 15] }, hsl: { yellow: [20, 0, 0], green: [0, 15, 0], blue: [-30, -20, 0] },
    fade: 20, contrast: -10, bloom: 20, bloomTint: [255, 230, 180], grain: 30, softness: 6,
    quick: [q('green', { tint: -25, gShS: 20 }), q('fade', { fade: 25 }), GRAIN(30)]
  },
  { id: 'lu-cry', name: 'Lu Cry', cat: 'lu', desc: 'Two ink zine print, indigo on cream paper with photocopy speckles',
    gmap: [[63, 60, 143], [243, 236, 203]], gmapAlts: [[[20, 20, 20], [243, 236, 203]], [[180, 30, 60], [250, 236, 220]], [[20, 90, 70], [240, 240, 220]]],
    thresh: 50, clarity: 40, speck: 60, softness: 4, grain: 10,
    quick: [q('threshold', { thresh: 25 }), choice('palette', ['indigo', 'black', 'redInk', 'greenInk']), q('texture', { speck: 60, grain: 20 })]
  },
  { id: 'lu-lazuli', name: 'Lu Lazuli', cat: 'lu', desc: 'Three tone screen print in black, lapis blue and cream',
    gmap: [[0, 0, 0], [76, 134, 209], [242, 235, 221]], gmapAlts: [[[0, 0, 0], [40, 80, 200], [242, 235, 221]], [[0, 0, 0], [110, 170, 230], [250, 245, 235]]],
    poster: 3, contrast: 50, streak: 10, grain: 10,
    quick: [choice('palette', ['lapis', 'cobalt', 'sky']), q('levels', { poster: 1 }), q('contrast', { contrast: 30 })]
  },
  { id: 'lu-pop', name: 'Lu Pop', cat: 'lu', desc: 'Magenta and violet halftone poster',
    gmap: [[90, 26, 160], [240, 60, 200], [255, 205, 235]], gmapAlts: [[[60, 20, 140], [255, 90, 160], [255, 220, 240]], [[30, 30, 120], [240, 60, 200], [255, 240, 200]]],
    gmapMix: 100, contrast: 30, halftone: 6, htMix: 60, grain: 25,
    quick: [q('dots', { halftone: 4 }), choice('palette', ['magenta', 'pinkPop', 'violet'])]
  },
  { id: 'lu-amora', name: 'Lu Amora', cat: 'lu', desc: 'Blue violet night film with magenta skin, lifted blacks and fine grain',
    gmap: [[23, 31, 78], [91, 67, 137], [183, 91, 151], [238, 161, 190]], gmapMix: 76,
    tint: 16, contrast: -22, shadows: 14, blacks: 18, fade: 12, saturation: -8,
    grain: 34, grainSize: 3, grainChroma: 18,
    quick: [GRAIN(35), q('fade', { fade: 24 }), q('contrast', { contrast: 28 })]
  },
  { id: 'lu-pitaya', name: 'Lu Pitaya', cat: 'lu', desc: 'High contrast solarized gradient from violet and magenta to mint cream',
    gmap: [[42, 18, 83], [177, 27, 128], [226, 59, 157], [90, 170, 111], [190, 225, 175]],
    gmapAlts: [
      [[48, 14, 85], [191, 24, 132], [240, 76, 158], [106, 183, 117], [245, 226, 183]],
      [[37, 14, 72], [150, 25, 137], [229, 77, 161], [94, 190, 127], [224, 235, 190]],
      [[53, 24, 94], [182, 34, 138], [235, 93, 164], [126, 190, 139], [243, 232, 198]]
    ],
    gmapMix: 100, poster: 5, contrast: 28, saturation: 8, grain: 8,
    quick: [choice('palette', ['pitaya', 'lima', 'menta', 'creme']), q('contrast', { contrast: 26 }), GRAIN(18)]
  },
  { id: 'lu-goiaba', name: 'Lu Goiaba', cat: 'lu', desc: 'Soft faded gradient of navy, mauve, mint and pale cyan',
    gmap: [[17, 34, 75], [79, 91, 132], [166, 119, 153], [163, 211, 187], [199, 231, 218]],
    gmapMix: 60, saturation: -18, contrast: -8, fade: 16, grain: 8,
    quick: [q('mix', { gmapMix: 40 }), GRAIN(16), q('fade', { fade: 22 })]
  },
  { id: 'lu-melancia', name: 'Lu Melancia', cat: 'lu', desc: 'Petrol shadows, carmine midtones and peach cream highlights',
    gmap: [[18, 57, 67], [174, 39, 61], [213, 91, 91], [249, 211, 179]],
    gmapAlts: [
      [[14, 50, 64], [164, 34, 69], [207, 79, 101], [246, 205, 174]],
      [[23, 64, 69], [187, 42, 58], [220, 98, 83], [252, 218, 188]]
    ],
    gmapMix: 100, contrast: 24, saturation: 6, grain: 8,
    quick: [choice('palette', ['melancia', 'carmim', 'pessego']), q('contrast', { contrast: 24 })]
  },
  { id: 'lu-morango', name: 'Lu Morango', cat: 'lu', desc: 'Deep red darkroom monochrome with warm peach highlights',
    gmap: [[18, 4, 17], [126, 20, 39], [226, 87, 79], [255, 177, 139]],
    gmapMix: 100, contrast: 42, blacks: -24, exposure: -4, saturation: -55, grain: 14, grainSize: 3,
    quick: [q('contrast', { contrast: 24 }), GRAIN(20), q('mix', { gmapMix: 18 })]
  },
  { id: 'lu-framboesa', name: 'Lu Framboesa', cat: 'lu', desc: 'Cross processed split tone with rose highlights and teal shadows',
    gmap: [[17, 58, 68], [76, 119, 119], [150, 143, 156], [230, 151, 181], [255, 218, 224]],
    gmapMix: 54, contrast: -8, fade: 14, saturation: -10, grain: 8,
    grade: { sh: [183, 24], mid: [184, 8], hi: [335, 18] },
    quick: [q('mix', { gmapMix: 38 }), q('contrast', { contrast: 22 }), GRAIN(16)]
  },
  { id: 'lu-sunset', name: 'Lu Sunset', cat: 'lu', desc: 'Y2K pink and purple wash, milky highlights and soft glow',
    tint: 25, grade: { hi: [320, 25], sh: [280, 20] }, hsl: { magenta: [0, 25, 0], red: [0, 25, 0] },
    fade: 25, bloom: 35, bloomTint: [255, 210, 235], contrast: -10, grain: 35, gain: [0.97, 0.9, 0.95],
    quick: [q('pinkAmt', { tint: 20, gHiS: 20 }), q('glow', { bloom: 35 }), GRAIN(35)]
  },
  { id: 'lu-green', name: 'Lu Green', cat: 'lu', desc: 'Acid green cross processed look with solid blacks',
    tint: -50, grade: { hi: [120, 45], mid: [80, 25] }, gain: [0.95, 1.05, 0.8], contrast: 25, blacks: -20, saturation: 15, grain: 15,
    quick: [q('strength', { tint: -30, gHiS: 25 }), q('contrast', { contrast: 30 })]
  },
  { id: 'lu-blue', name: 'Lu Blue', cat: 'lu', desc: 'Icy bluecore digicam selfie with blown whites',
    temperature: -45, tint: 5, exposure: 18, grade: { hi: [205, 30], sh: [230, 25] }, hsl: { blue: [0, 30, 0], orange: [0, -30, 0] },
    bloom: 15, bloomTint: [200, 230, 255], grain: 12,
    quick: [q('coldness', { temperature: -30 }), q('brightness', { exposure: 20 }), q('glow', { bloom: 30 })]
  },
  { id: 'lu-vision', name: 'Lu Vision', cat: 'lu', desc: 'Teal and mustard duotone with fine halftone',
    gmap: [[8, 8, 8], [29, 140, 154], [224, 166, 38]], gmapAlts: [[[8, 8, 8], [20, 100, 160], [240, 200, 60]], [[8, 8, 8], [40, 160, 120], [230, 140, 40]]],
    gmapMix: 100, contrast: 40, halftone: 4, htMix: 40, grain: 15,
    quick: [choice('palette', ['teal', 'blueGold', 'greenOrange']), q('dots', { htMix: 40 })]
  },
  { id: 'lu-alien', name: 'Lu Alien', cat: 'lu', desc: 'False color thermal scan in posterized bands',
    gmap: [[0, 0, 0], [24, 48, 216], [46, 138, 62], [240, 138, 44], [255, 220, 200]],
    gmapAlts: [[[0, 0, 20], [0, 60, 140], [0, 160, 200], [120, 230, 220], [240, 255, 250]], [[0, 0, 0], [120, 0, 20], [230, 40, 10], [255, 170, 0], [255, 250, 200]]],
    poster: 6, clarity: 40, contrast: 30, grain: 20,
    quick: [choice('palette', ['alien', 'ocean', 'fire']), q('levels', { poster: 3 }), q('detail', { clarity: 40 })]
  },
  { id: 'lu-adrenaline', name: 'Lu Adrenaline', cat: 'lu', desc: 'Raw 2000s digicam flash, cool and crisp',
    temperature: -10, saturation: -25, contrast: 25, blacks: -25, highlights: -10, grade: { sh: [210, 10] }, sharpen: 35, flash: 70,
    grain: 15, grainChroma: 60,
    quick: [q('coolness', { temperature: -25 }), q('flash', { flash: 70 }), q('noise', { grain: 25 })]
  },
  { id: 'lu-retro', name: 'Lu Retro', cat: 'lu', desc: 'Warm 70s indoor snapshot in amber and honey',
    temperature: 30, tint: 5, grade: { hi: [45, 20], sh: [30, 15] }, hsl: { orange: [0, 15, 0], blue: [0, -50, 0] },
    fade: 20, contrast: -5, grain: 25, lift: [0.06, 0.04, 0.02], stamp: 'date',
    quick: [q('warmth', { temperature: 25 }), q('fade', { fade: 25 }), GRAIN(30)]
  },
  { id: 'lu-capture', name: 'Lu Capture', cat: 'lu', desc: '90s flash film with dust, scratches and faded edges',
    contrast: 20, saturation: 10, grade: { sh: [110, 15], hi: [30, 10] }, flash: 60, dust: 35, vignette: 10, grain: 25, stamp: 'date',
    quick: [q('damage', { dust: 45 }), q('flash', { flash: 60 }), GRAIN(30)]
  },
  { id: 'lu-vhs', name: 'Lu VHS', cat: 'lu', desc: 'Party flash on tape, color bleed, scanlines and glow',
    temperature: 15, saturation: 15, chroma: 48, softness: 6, bloom: 30, scanlines: 18, glitch: 10, grain: 15, grainChroma: 50, stamp: 'vhs',
    quick: [q('tapeNoise', { grain: 20, grainChroma: 40 }), q('bleed', { chroma: 50 }), q('glow', { bloom: 30 })]
  },
  { id: 'lu-vintage', name: 'Lu Vintage', cat: 'lu', desc: 'Faded pink street film with soft focus and heavy grain',
    tint: 30, grade: { hi: [335, 30], sh: [290, 15] }, hsl: { red: [0, 20, 0], green: [0, -40, 0] },
    fade: 30, contrast: -15, grain: 40, softness: 5, lift: [0.08, 0.04, 0.08],
    quick: [q('pinkAmt', { tint: 20, gHiS: 20 }), q('fade', { fade: 25 }), GRAIN(35)]
  }
];

/** Gu looks: warm indoor events, amber selfies, red night and dusk. Featured first in Indie. */
export const GU_LOOKS: Recipe[] = [
  { id: 'gu-candle', name: 'Gu Candle', cat: 'indie', badge: 'bolt', desc: 'Candlelit event, chocolate shadows, amber highlights and wine reds',
    temperature: 18, tint: 4, exposure: -6, contrast: 15, highlights: -25, shadows: -15, blacks: -20, lift: [0.04, 0.035, 0.03],
    grade: { sh: [25, 12], hi: [40, 15] }, hsl: { red: [0, 10, -5], orange: [0, 5, 0], yellow: [0, -10, 0], green: [0, -45, 0], aqua: [0, -45, 0], blue: [0, -50, 0] },
    bloom: 15, bloomTint: [255, 200, 140], sharpen: 25, grain: 8, vignette: 12,
    quick: [q('warmth', { temperature: 25 }), q('candle', { bloom: 30 }), q('depth', { blacks: -25, shadows: -20 })]
  },
  { id: 'gu-soiree', name: 'Gu Soirée', cat: 'indie', badge: 'bolt', desc: 'Soft golden group portrait with glowing skin and cream whites',
    temperature: 14, tint: 6, exposure: 6, contrast: 5, highlights: -30, shadows: 20, whites: -10, blacks: -5, fade: 8,
    grade: { mid: [35, 10], hi: [45, 10] }, hsl: { orange: [0, -5, 8], red: [0, 5, 0], green: [0, -40, 0], blue: [0, -40, 0] },
    smoothSkin: 15, grain: 6, vignette: 8,
    quick: [q('warmth', { temperature: 25 }), q('skinGlow', { hsl_orange_l: 15, smoothSkin: 20 }), q('fade', { fade: 20 })]
  },
  { id: 'gu-amber', name: 'Gu Amber', cat: 'indie', badge: 'bolt', desc: 'Honey amber mirror selfie, almost a warm monochrome',
    temperature: 40, tint: 8, saturation: -20, gmap: [[42, 22, 8], [194, 128, 62], [244, 220, 192]], gmapMix: 45,
    contrast: -10, highlights: -20, blacks: 10, fade: 12,
    hsl: { red: [0, -70, 0], green: [0, -70, 0], aqua: [0, -70, 0], blue: [0, -70, 0], purple: [0, -70, 0], magenta: [0, -70, 0] },
    bloom: 12, bloomTint: [255, 210, 160], grain: 15, grainSize: 5,
    quick: [q('amber', { gmapMix: 40, temperature: 15 }), q('haze', { fade: 20, bloom: 20 }), GRAIN(25)]
  },
  { id: 'gu-bronze', name: 'Gu Bronze', cat: 'indie', badge: 'bolt', desc: 'Dark bronze and sepia gym look with gold highlights',
    temperature: 45, tint: 5, exposure: -12, contrast: 20, highlights: -10, shadows: -20, blacks: -15,
    gmap: [[18, 10, 4], [138, 90, 34], [232, 194, 138]], gmapMix: 60,
    hsl: { red: [0, -80, 0], yellow: [0, -80, 0], green: [0, -80, 0], aqua: [0, -80, 0], blue: [0, -80, 0], purple: [0, -80, 0], magenta: [0, -80, 0] },
    clarity: 10, grain: 25, grainSize: 9, grainShadow: 40, vignette: 20,
    quick: [q('bronze', { gmapMix: 35, temperature: 15 }), q('darkness', { exposure: -20, blacks: -20 }), GRAIN(30)]
  },
  { id: 'gu-ember', name: 'Gu Ember', cat: 'indie', badge: 'bolt', desc: 'Night selfie in warm orange light, rust tones and soft noise',
    temperature: 30, tint: 18, exposure: -15, contrast: 10, highlights: -15, shadows: -10, blacks: -30,
    grade: { sh: [10, 40], mid: [12, 35], hi: [22, 25] },
    hsl: { red: [0, 20, 0], orange: [-10, 20, 0], yellow: [-30, 0, 0], green: [0, -80, 0], aqua: [0, -80, 0], blue: [0, -80, 0] },
    softness: 5, grain: 20, grainChroma: 50, vignette: 25,
    quick: [q('ember', { tint: 15, gMidS: 20 }), q('softness', { softness: 8 }), q('noise', { grain: 25, grainChroma: 30 })]
  },
  { id: 'gu-dusk', name: 'Gu Dusk', cat: 'indie', badge: 'bolt', desc: 'Underexposed blue hour, slate sky and muted warm buildings',
    exposure: -36, temperature: -8, contrast: 10, highlights: -20, shadows: -15, blacks: -10,
    grade: { sh: [220, 18], hi: [35, 10] }, hsl: { blue: [0, -20, -20], aqua: [30, 0, 0], orange: [0, -10, 0], green: [0, -25, 0] },
    fade: 6, grain: 12, vignette: 15,
    quick: [q('darkness', { exposure: -25 }), q('blueSky', { gShS: 20, hsl_blue_s: 25 }), q('warmBuildings', { gHiS: 20, hsl_orange_s: 20 })]
  }
];

/** Labels of quick adjustments and their options, English and Portuguese. */
export const QUICK_LABELS: Record<string, { en: string; pt: string }> = {
  haze: { en: 'Haze', pt: 'Névoa' }, pink: { en: 'Pink tint', pt: 'Tom rosa' }, glow: { en: 'Glow', pt: 'Brilho' }, grain: { en: 'Grain', pt: 'Granulação' },
  flash: { en: 'Flash strength', pt: 'Força do flash' }, shadow: { en: 'Flash shadow', pt: 'Sombra do flash' }, warmth: { en: 'Warmth', pt: 'Calor' },
  glitter: { en: 'Glitter amount', pt: 'Quantidade de glitter' }, colors: { en: 'Glitter colors', pt: 'Cores do glitter' }, flares: { en: 'Flares', pt: 'Estrelas de luz' },
  rose: { en: 'Rose tint', pt: 'Tom rosado' }, shuffle: { en: 'Shuffle sparkle', pt: 'Embaralhar brilho' },
  red: { en: 'Red strength', pt: 'Força do vermelho' }, halation: { en: 'Halation', pt: 'Halo' }, green: { en: 'Green amount', pt: 'Quantidade de verde' }, fade: { en: 'Fade', pt: 'Desbotar' },
  threshold: { en: 'Threshold', pt: 'Limiar' }, texture: { en: 'Texture', pt: 'Textura' }, palette: { en: 'Colors', pt: 'Cores' }, levels: { en: 'Levels', pt: 'Níveis' },
  contrast: { en: 'Contrast', pt: 'Contraste' }, dots: { en: 'Dots', pt: 'Pontos' }, pinkAmt: { en: 'Pink', pt: 'Rosa' }, strength: { en: 'Strength', pt: 'Intensidade' },
  coldness: { en: 'Coldness', pt: 'Frio' }, brightness: { en: 'Brightness', pt: 'Brilho' }, detail: { en: 'Detail', pt: 'Detalhe' }, coolness: { en: 'Coolness', pt: 'Frieza' },
  noise: { en: 'Noise', pt: 'Ruído' }, damage: { en: 'Damage', pt: 'Desgaste' }, tapeNoise: { en: 'Tape noise', pt: 'Ruído de fita' }, bleed: { en: 'Color bleed', pt: 'Vazamento de cor' },
  candle: { en: 'Candle glow', pt: 'Brilho de vela' }, depth: { en: 'Shadow depth', pt: 'Profundidade das sombras' }, skinGlow: { en: 'Skin glow', pt: 'Brilho da pele' },
  amber: { en: 'Amber amount', pt: 'Quantidade de âmbar' }, bronze: { en: 'Bronze amount', pt: 'Quantidade de bronze' }, darkness: { en: 'Darkness', pt: 'Escuridão' },
  ember: { en: 'Ember strength', pt: 'Força da brasa' }, softness: { en: 'Softness', pt: 'Suavidade' }, blueSky: { en: 'Blue sky', pt: 'Céu azul' }, warmBuildings: { en: 'Warm buildings', pt: 'Prédios quentes' },
  // choice options
  holo: { en: 'Holographic', pt: 'Holográfico' }, gold: { en: 'Gold', pt: 'Dourado' }, silver: { en: 'Silver', pt: 'Prata' }, pinkGlitter: { en: 'Pink', pt: 'Rosa' },
  indigo: { en: 'Indigo', pt: 'Índigo' }, black: { en: 'Black', pt: 'Preto' }, lapis: { en: 'Lapis', pt: 'Lápis-lazúli' }, cobalt: { en: 'Cobalt', pt: 'Cobalto' }, sky: { en: 'Sky', pt: 'Céu' },
  magenta: { en: 'Magenta', pt: 'Magenta' }, pinkPop: { en: 'Pink', pt: 'Rosa' }, violet: { en: 'Violet', pt: 'Violeta' }, teal: { en: 'Teal and gold', pt: 'Azul-petróleo e dourado' },
  blueGold: { en: 'Blue and gold', pt: 'Azul e dourado' }, greenOrange: { en: 'Green and orange', pt: 'Verde e laranja' }, alien: { en: 'Alien', pt: 'Alien' }, ocean: { en: 'Ocean', pt: 'Oceano' }, fire: { en: 'Fire', pt: 'Fogo' },
  redInk: { en: 'Red', pt: 'Vermelho' }, greenInk: { en: 'Green', pt: 'Verde' },
  pitaya: { en: 'Pitaya', pt: 'Pitaya' }, lima: { en: 'Lime', pt: 'Lima' }, menta: { en: 'Mint', pt: 'Menta' }, creme: { en: 'Cream', pt: 'Creme' },
  melancia: { en: 'Watermelon', pt: 'Melancia' }, carmim: { en: 'Carmine', pt: 'Carmim' }, pessego: { en: 'Peach', pt: 'Pêssego' },
  mix: { en: 'Mix', pt: 'Mistura' }
};

export const quickLabel = (lang: string, id: string) => (lang.startsWith('pt') ? QUICK_LABELS[id]?.pt : QUICK_LABELS[id]?.en) ?? id;
