import type { Recipe } from './types';

/**
 * Camera recipes. Every number uses the same scale as the user sliders
 * (mostly -100..100), so the intensity slider can scale a whole look and
 * user edits simply add on top of it.
 */
export const RECIPES: Recipe[] = [
  { id: 'original', name: 'Original', cat: 'film', desc: 'No camera, only your edits' },

  // Film cameras
  { id: 'bolt-classic', name: 'Daily Classic', cat: 'film', desc: 'Warm everyday 35mm, faded blacks, orange date', temperature: 20, tint: 4, contrast: 10, saturation: 6, fade: 22, grain: 26, vignette: 26, highlights: -10, lift: [0.035, 0.02, 0], gain: [1, 0.97, 0.88], shadowTint: [70, 110, 90], split: 0.08, stamp: 'date', stampColor: '#ff8a1f' },
  { id: 'grit-r', name: 'Grit R', cat: 'film', desc: 'Street compact, hard contrast, cool grit', contrast: 34, blacks: -22, highlights: -8, saturation: -24, temperature: -8, tint: -6, clarity: 32, grain: 58, sharpen: 24, vignette: 32, shadowTint: [40, 85, 80], split: 0.14, stampColor: '#ff6a1a' },
  { id: 'fresh-r', name: 'Fresh R', cat: 'film', desc: 'Fresh green film tones, airy highlights', temperature: -10, tint: -22, fade: 28, contrast: -8, highlights: -14, saturation: 8, grain: 22, shadowTint: [40, 140, 120], hiTint: [255, 236, 214], split: 0.2, hsl: { green: [10, 22, 10], aqua: [0, 10, 6], blue: [-10, -12, 0], red: [0, 10, 0] }, stampColor: '#ffb347' },
  { id: 'storm-135', name: 'Storm 135', cat: 'film', desc: 'Golden consumer film, punchy skin', temperature: 26, saturation: 18, contrast: 18, highlights: -12, grain: 22, vignette: 20, lift: [0.02, 0.01, 0], gain: [1, 0.96, 0.86], hiTint: [255, 200, 120], split: 0.15 },
  { id: 'gold-200', name: 'Gold 200', cat: 'film', desc: 'Sunny yellow consumer film', temperature: 24, tint: 6, saturation: 14, contrast: 10, fade: 10, grain: 24, hsl: { yellow: [-4, 18, 6], orange: [0, 10, 4], blue: [0, -10, 0] } },
  { id: 'portrait-400', name: 'Portrait 400', cat: 'film', desc: 'Soft pastel skin, gentle contrast', contrast: -12, saturation: -6, temperature: 10, fade: 14, highlights: -16, grain: 16, hsl: { orange: [0, -8, 12], red: [-4, -6, 6] }, grade: { hi: [40, 14], sh: [200, 8] } },
  { id: 'tungsten-800', name: 'Tungsten 800', cat: 'film', desc: 'Cool night film with red halation', temperature: -24, tint: 6, contrast: 12, bloom: 40, bloomTint: [255, 90, 70], grain: 34, fade: 8 },
  { id: 'green-400', name: 'Green 400', cat: 'film', desc: 'Drugstore film with green cast', tint: -18, temperature: 4, fade: 18, contrast: 8, grain: 30, shadowTint: [60, 130, 90], split: 0.18 },
  { id: 'thunder-leak', name: 'Thunder Leak', cat: 'film', desc: 'Expired roll with heavy light leaks', leak: 85, fade: 20, grain: 30, temperature: 10, saturation: 10, vignette: 25, stamp: 'date' },
  { id: 'neon-16', name: 'Neon 16', cat: 'film', desc: 'Cool cyan film, green shadows', temperature: -14, tint: -10, saturation: -6, fade: 24, contrast: 6, shadowTint: [40, 120, 110], split: 0.2, grain: 26, stampColor: '#ffc04d' },
  { id: 'instant-flash', name: 'Instant Flash', cat: 'film', desc: 'Instant print with soft flash', exposure: 14, fade: 34, contrast: -10, saturation: -8, temperature: 8, bloom: 30, frame: 'instant', vignette: 18, shadowTint: [70, 90, 120], split: 0.12 },
  { id: 'instant-600', name: 'Instant 600', cat: 'film', desc: 'Warm instant print, creamy whites', exposure: 8, fade: 30, temperature: 18, saturation: -4, contrast: -6, frame: 'instant', grade: { sh: [210, 18] } },
  { id: 'square-spark', name: 'Square Spark', cat: 'film', desc: 'Square instant, pastel tones', frame: 'square', fade: 28, saturation: 14, temperature: 12, bloom: 20, contrast: 4 },
  { id: 'half-volt', name: 'Half Volt', cat: 'film', desc: 'Half frame diptych in one shot', frame: 'half', temperature: 14, fade: 20, grain: 32, stamp: 'date' },
  { id: 'slide-64', name: 'Slide 64', cat: 'film', desc: 'Saturated slide in a plastic mount', frame: 'slide', saturation: 34, contrast: 22, vignette: 30, temperature: 4, fade: 6 },
  { id: 'toy-lomo', name: 'Toy Lomo', cat: 'film', desc: 'Plastic lens, cross processed', vignette: 90, saturation: 40, contrast: 30, lift: [0, 0.04, 0.12], gain: [1, 1, 0.82], grain: 20, softness: 10 },
  { id: 'cross-pro', name: 'Cross Pro', cat: 'film', desc: 'Cross processed slide, yellow and cyan', contrast: 28, saturation: 26, lift: [0.02, 0.05, 0.16], gain: [1, 1, 0.75], hsl: { blue: [-20, 10, 0] } },
  { id: 'mono-strike', name: 'Mono Strike', cat: 'film', desc: 'Hard black and white, deep grain', mono: true, contrast: 38, grain: 50, vignette: 30, stampColor: '#f2f2f2' },
  { id: 'medium-120', name: 'Medium 120', cat: 'film', desc: 'Medium format, fine grain, white border', frame: 'border', fade: 12, grain: 12, saturation: 6, temperature: 6, softness: 6, contrast: 6 },
  { id: 'dispo-27', name: 'Dispo 27', cat: 'film', desc: 'Disposable with harsh flash', exposure: 12, bloom: 18, temperature: 20, saturation: 16, fade: 16, grain: 34, vignette: 36, leak: 20, stamp: 'date' },
  { id: 'sepia-old', name: 'Sepia Old', cat: 'film', desc: 'Old print, sepia and dust', sepia: true, fade: 30, grain: 40, vignette: 50, dust: 50, contrast: 10, stampColor: '#ffcf8a' },

  // Film simulations
  { id: 'vivid-50', name: 'Vivid 50', cat: 'sim', desc: 'Slide film punch for landscapes', saturation: 40, vibrance: 10, contrast: 22, blacks: -10, hsl: { blue: [0, 15, -6], green: [0, 20, 0] } },
  { id: 'standard-100', name: 'Standard 100', cat: 'sim', desc: 'Balanced everyday color', contrast: 8, saturation: 8 },
  { id: 'soft-portrait', name: 'Soft Portrait', cat: 'sim', desc: 'Soft contrast, flattering skin', contrast: -10, saturation: 12, highlights: -10, hsl: { orange: [0, -6, 10], red: [0, -4, 4] } },
  { id: 'chrome-calm', name: 'Chrome Calm', cat: 'sim', desc: 'Muted documentary color, deep shadows', saturation: -26, contrast: 14, shadows: -12, hsl: { blue: [6, -30, -6], red: [0, -10, 0] }, grade: { sh: [195, 14] } },
  { id: 'super-neg', name: 'Super Neg', cat: 'sim', desc: 'Classic negative, hard tonality, teal shadows', contrast: 22, saturation: 4, fade: 6, hsl: { green: [16, -6, 0], red: [-6, 10, 0] }, grade: { sh: [190, 28], hi: [40, 18] } },
  { id: 'amber-neg', name: 'Amber Neg', cat: 'sim', desc: 'Amber highlights, rich printed shadows', blacks: -12, saturation: 10, contrast: 10, temperature: 12, grade: { hi: [38, 48], sh: [200, 12] } },
  { id: 'cine-soft', name: 'Cine Soft', cat: 'sim', desc: 'Low contrast motion picture tone', contrast: -20, saturation: -22, fade: 12, shadows: 10, grade: { sh: [185, 20] } },
  { id: 'bleach', name: 'Bleach', cat: 'sim', desc: 'Bleach bypass, silver and gritty', saturation: -55, contrast: 38, clarity: 25, highlights: -10 },
  { id: 'fine-mono', name: 'Fine Mono', cat: 'sim', desc: 'Smooth black and white, fine grain', mono: true, contrast: 16, grain: 18, clarity: 15, stampColor: '#f2f2f2' },
  { id: 'true-color', name: 'True Color', cat: 'sim', desc: 'Faithful color, crisp tonality', contrast: 14, saturation: 4, clarity: 6 },

  // Y2K and digicam
  { id: 'y2k-flash', name: 'Y2K Flash', cat: 'y2k', desc: 'Party flash, crunchy digital, date stamp', exposure: 16, bloom: 25, sharpen: 50, temperature: -8, saturation: 14, contrast: 14, vignette: 30, stamp: 'date', stampColor: '#ff8a1f' },
  { id: 'ccd-blue', name: 'CCD Blue', cat: 'y2k', desc: 'Cool CCD sensor, early 2000s', temperature: -26, tint: -6, sharpen: 45, grain: 18, saturation: -6, highlights: 10, fade: 8, stamp: 'date', stampColor: '#ffb000' },
  { id: 'glow-party', name: 'Glow Party', cat: 'y2k', desc: 'Pink glow highlights, dreamy flash', bloom: 60, tint: 25, saturation: 18, exposure: 6, softness: 8, grade: { hi: [320, 30] }, stamp: 'date', stampColor: '#ff7ac8' },
  { id: 'digi-2000', name: 'Digi 2000', cat: 'y2k', desc: 'Early digicam crunch', sharpen: 60, temperature: -10, saturation: 12, contrast: 10, grain: 14, bloom: 10, stamp: 'date', stampColor: '#ffb000' },
  { id: 'phone-2010', name: 'Phone 2010', cat: 'y2k', desc: 'Low resolution phone camera', lofi: 45, sharpen: 40, saturation: -8, temperature: 8, highlights: 14, grain: 12 },
  { id: 'myspace', name: 'Myspace', cat: 'y2k', desc: 'Overexposed selfie, cool shadows', exposure: 18, contrast: 20, highlights: 20, saturation: 12, grade: { sh: [220, 30] }, vignette: 40, bloom: 15 },

  // Flash
  { id: 'flash-cam', name: 'Flash Cam', cat: 'flash', desc: 'Direct flash, blown highlights, dark background', exposure: 12, highlights: 26, whites: 20, contrast: 30, blacks: -26, vignette: 60, grain: 22, temperature: -10, sharpen: 30, bloom: 14 },
  { id: 'paparazzi', name: 'Paparazzi', cat: 'flash', desc: 'Red carpet flash with heavy glow', exposure: 10, highlights: 30, contrast: 34, blacks: -30, vignette: 70, bloom: 45, saturation: -10, grain: 18 },
  { id: 'party-flash', name: 'Party Flash', cat: 'flash', desc: 'Warm house party flash with date', exposure: 14, contrast: 22, temperature: 16, vignette: 55, bloom: 20, grain: 28, stamp: 'date' },
  { id: 'red-flash', name: 'Red Flash', cat: 'flash', desc: 'Flash with red gel', exposure: 8, contrast: 24, vignette: 50, grade: { mid: [355, 40], sh: [340, 30] }, bloom: 20 },
  { id: 'mono-flash', name: 'Mono Flash', cat: 'flash', desc: 'Black and white flash snapshot', mono: true, exposure: 10, contrast: 40, highlights: 20, vignette: 60, grain: 34 },
  { id: 'blurry-candid', name: 'Blurry Candid', cat: 'flash', desc: 'Soft focus candid, flash and grain', softness: 40, exposure: 8, bloom: 30, grain: 30, contrast: 12, vignette: 30, temperature: 6 },

  // Indie
  { id: 'indie-sleaze', name: 'Indie Sleaze', cat: 'indie', desc: 'Grainy, harsh, badly lit and proud of it', exposure: 6, contrast: 32, saturation: -18, temperature: -6, grain: 48, vignette: 45, bloom: 22, highlights: 18, sharpen: 20 },
  { id: 'tumblr-2014', name: 'Tumblr 2014', cat: 'indie', desc: 'Faded pastel with lilac shadows', fade: 36, contrast: -14, saturation: -10, grade: { sh: [270, 34], hi: [40, 18] } },
  { id: 'bedroom-pop', name: 'Bedroom Pop', cat: 'indie', desc: 'Pink haze and soft warm light', fade: 26, bloom: 34, temperature: 14, tint: 18, contrast: -8, softness: 8 },
  { id: 'grunge-90', name: 'Grunge 90', cat: 'indie', desc: 'Dirty green, crushed blacks', saturation: -30, tint: -16, blacks: -24, contrast: 20, grain: 44, shadowTint: [50, 90, 50], split: 0.2 },
  { id: 'thrift-film', name: 'Thrift Film', cat: 'indie', desc: 'Washed out secondhand film', fade: 40, saturation: -22, temperature: 16, dust: 30, grain: 30, contrast: -6 },
  { id: 'emo-blue', name: 'Emo Blue', cat: 'indie', desc: 'Cold blue cast, moody contrast', temperature: -30, saturation: -20, contrast: 24, vignette: 40, grain: 20 },

  // Low light
  { id: 'night-out', name: 'Night Out', cat: 'lowlight', desc: 'Lifted shadows, magenta glow, night grain', shadows: 30, blacks: 10, grain: 40, bloom: 30, grade: { sh: [230, 30], hi: [320, 22] } },
  { id: 'neon-noir', name: 'Neon Noir', cat: 'lowlight', desc: 'Teal and magenta city night', contrast: 24, blacks: -20, saturation: 20, bloom: 40, grade: { sh: [185, 40], hi: [315, 34] } },
  { id: 'candlelight', name: 'Candlelight', cat: 'lowlight', desc: 'Warm amber low key light', exposure: -6, temperature: 36, contrast: 14, bloom: 34, bloomTint: [255, 170, 90], vignette: 50, grain: 26 },
  { id: 'moody-dusk', name: 'Moody Dusk', cat: 'lowlight', desc: 'Dark, blue and quiet', exposure: -14, saturation: -24, contrast: 10, grade: { sh: [215, 40], mid: [220, 12] }, vignette: 35 },
  { id: 'blue-hour', name: 'Blue Hour', cat: 'lowlight', desc: 'Deep blue twilight', temperature: -34, tint: 8, shadows: 16, saturation: 8, fade: 10 },
  { id: 'sodium-street', name: 'Sodium Street', cat: 'lowlight', desc: 'Orange streetlight at night', temperature: 40, tint: 10, saturation: -10, contrast: 20, grain: 34, bloom: 25, bloomTint: [255, 150, 60] },

  // Nature
  { id: 'moss', name: 'Moss', cat: 'nature', desc: 'Muted moss green, natural and calm', saturation: -14, fade: 12, temperature: 6, contrast: 6, hsl: { green: [-28, -24, -14], yellow: [-12, -12, 0], aqua: [-20, -30, -10], blue: [0, -20, 0] }, shadowTint: [70, 100, 60], split: 0.16, grain: 14 },
  { id: 'forest-film', name: 'Forest Film', cat: 'nature', desc: 'Deep evergreen film', contrast: 14, blacks: -10, hsl: { green: [-10, 6, -22], yellow: [-16, 0, -6] }, grade: { sh: [150, 24] }, grain: 20 },
  { id: 'sage', name: 'Sage', cat: 'nature', desc: 'Soft sage green wash', duotone: [[38, 52, 40], [222, 232, 212]], duoAmount: 0.45, fade: 14, contrast: -6 },
  { id: 'earth-tone', name: 'Earth Tone', cat: 'nature', desc: 'Olive and clay browns', saturation: -18, temperature: 18, hsl: { green: [-24, -20, -10], blue: [0, -40, 0], orange: [-4, 8, 0] }, grade: { sh: [35, 16] } },
  { id: 'golden-hour', name: 'Golden Hour', cat: 'nature', desc: 'Sunset warmth everywhere', temperature: 34, tint: 6, saturation: 10, bloom: 26, bloomTint: [255, 190, 110], highlights: -10, leak: 18 },
  { id: 'matcha', name: 'Matcha', cat: 'nature', desc: 'Light pastel green', exposure: 8, fade: 22, tint: -14, saturation: -10, contrast: -10, hsl: { green: [-8, -10, 14] } },

  // Color washes
  { id: 'ultra-violet', name: 'Ultra Violet', cat: 'color', desc: 'Everything purple', duotone: [[26, 8, 56], [222, 190, 255]], contrast: 10, bloom: 12, stampColor: '#d9b8ff' },
  { id: 'brat-lime', name: 'Brat Lime', cat: 'color', desc: 'Loud lime green, lo fi and blurry', duotone: [[30, 46, 0], [200, 255, 70]], contrast: 16, softness: 22, stampColor: '#c6ff3d' },
  { id: 'bubble-pink', name: 'Bubble Pink', cat: 'color', desc: 'Everything pink', duotone: [[70, 10, 40], [255, 200, 228]], bloom: 22, contrast: 6, stampColor: '#ffb3d6' },
  { id: 'wine-wash', name: 'Wine Wash', cat: 'color', desc: 'Deep wine red tone', duotone: [[40, 6, 16], [246, 196, 206]], contrast: 12, stampColor: '#f2b8c6' },
  { id: 'ocean-wash', name: 'Ocean Wash', cat: 'color', desc: 'Everything blue', duotone: [[6, 18, 52], [176, 214, 255]], contrast: 10, stampColor: '#9fd0ff' },
  { id: 'lomo-purple', name: 'Lomo Purple', cat: 'color', desc: 'Purple foliage, teal skies', hsl: { green: [100, 20, 6], yellow: [80, 10, 0], blue: [-20, 10, 0] }, contrast: 16, saturation: 10 },
  { id: 'infrared', name: 'Infrared', cat: 'color', desc: 'Pink and white foliage', hsl: { green: [-120, 30, 40], yellow: [-60, 20, 20], blue: [20, 20, -10] }, contrast: 18, bloom: 20 },

  // Video
  { id: 'vhs-bolt', name: 'VHS Tape', cat: 'video', desc: 'Tape bleed, tracking and PLAY overlay', scanlines: 60, chroma: 40, softness: 18, saturation: 22, glitch: 30, grain: 20, stamp: 'vhs', contrast: 6, tint: 6, fade: 10 },
  { id: 'home-video', name: 'Home Video', cat: 'video', desc: 'Family camcorder, soft and warm', softness: 14, scanlines: 25, chroma: 20, temperature: 12, fade: 14, stamp: 'dcr' },
  { id: 'super-8', name: 'Super 8', cat: 'video', desc: 'Gate weave, flicker, rounded gate', weave: true, flicker: 50, frame: '8mm', temperature: 22, fade: 30, grain: 55, dust: 50, vignette: 45, saturation: 10, leak: 25 },
  { id: 'cine-16', name: 'Cine 16', cat: 'video', desc: 'Documentary 16mm texture', grain: 40, temperature: 8, fade: 16, contrast: 14, flicker: 20, dust: 20, vignette: 25, weave: true },
  { id: 'dcr-cam', name: 'DCR Cam', cat: 'video', desc: 'Digital camcorder with REC overlay', stamp: 'dcr', sharpen: 30, saturation: 10, temperature: -6, scanlines: 15, chroma: 10, grain: 12 },
  { id: 'kino-mono', name: 'Kino Mono', cat: 'video', desc: 'Silent era black and white reel', mono: true, contrast: 30, flicker: 60, dust: 80, grain: 60, vignette: 55, weave: true, frame: '8mm' },

  // Extras
  { id: 'fisheye-zap', name: 'Fisheye', cat: 'extra', desc: 'Round lens, skate video energy', fisheye: 100, vignette: 70, saturation: 12, contrast: 14, chroma: 20 },
  { id: 'prism-arc', name: 'Prism', cat: 'extra', desc: 'Rainbow ghosting through a prism', prism: 100, bloom: 30, saturation: 10 },
  { id: 'shift-3d', name: 'Shift 3D', cat: 'extra', desc: 'Red and cyan anaglyph offset', anaglyph: 100, contrast: 10, saturation: -10 },
  { id: 'night-vision', name: 'Night Vision', cat: 'extra', desc: 'Green night vision bloom', exposure: 10, bloom: 60, temperature: -20, tint: -26, grain: 50, saturation: -30, shadowTint: [20, 90, 40], split: 0.3 },
  { id: 'cine-gold', name: 'Cine Gold', cat: 'extra', desc: 'Teal and orange widescreen grade', shadowTint: [0, 110, 130], hiTint: [255, 170, 90], split: 0.28, contrast: 16, saturation: 6, frame: 'cinema' },
  { id: 'film-noir', name: 'Film Noir', cat: 'extra', desc: 'High contrast black and white cinema', mono: true, contrast: 46, blacks: -24, vignette: 50, grain: 22, frame: 'cinema' },
  { id: 'glitch-wave', name: 'Glitch Wave', cat: 'extra', desc: 'Datamosh slices and RGB split', glitch: 90, chroma: 70, scanlines: 30, saturation: 30 },
  { id: 'cctv-01', name: 'CCTV 01', cat: 'extra', desc: 'Security cam, green mono', mono: true, shadowTint: [0, 70, 20], hiTint: [170, 255, 190], split: 0.5, grain: 40, scanlines: 40, stamp: 'cctv', fisheye: 40, sharpen: 20, contrast: 10 },
  { id: 'dream-pop', name: 'Dream Pop', cat: 'extra', desc: 'Soft glow, pastel daydream', bloom: 70, fade: 30, saturation: 20, softness: 14, temperature: 10, tint: 18, leak: 30 },
  { id: 'pixel-8', name: 'Pixel 8bit', cat: 'extra', desc: 'Chunky pixels, game boy vibes', lofi: 90, contrast: 20, saturation: 20 },

  // Indie core 2020: blown out flash, burnt highlights, strong color
  { id: 'indie-core', name: 'Indie Core', cat: 'indie', desc: '2020 blown out flash, burnt whites and strong color', exposure: 30, highlights: 34, whites: 46, contrast: 34, blacks: -28, saturation: 22, temperature: 10, bloom: 42, grain: 30, vignette: 46, sharpen: 18, stamp: 'date', stampColor: '#ff8a1f' },
  { id: 'estourado', name: 'Overblown', cat: 'indie', desc: 'Overexposed on purpose, glowing skin and dark background', exposure: 44, highlights: 40, whites: 55, contrast: 26, blacks: -34, saturation: 10, bloom: 55, temperature: 6, vignette: 52, grain: 26 },
  { id: 'flash-2020', name: 'Flash 2020', cat: 'indie', desc: 'Direct phone flash, saturated reds and hard shadows', exposure: 26, contrast: 40, whites: 38, blacks: -36, saturation: 30, vibrance: 14, temperature: 4, tint: 6, bloom: 30, vignette: 58, sharpen: 30, grain: 22, hsl: { red: [0, 18, -4], orange: [-4, 10, 8] } },
  { id: 'blown-out', name: 'Blown Out', cat: 'indie', desc: 'Blown out light, everything washed in warm white', exposure: 52, highlights: 50, whites: 60, contrast: 10, fade: 14, saturation: -6, temperature: 16, bloom: 70, bloomTint: [255, 225, 190], softness: 6, grain: 20 },
  { id: 'bad-flash', name: 'Bad Flash', cat: 'indie', desc: 'Bad party flash, green shadows and heavy grain', exposure: 28, contrast: 36, whites: 40, blacks: -30, saturation: 12, tint: -10, grain: 54, grainSize: 30, vignette: 60, bloom: 26, shadowTint: [40, 110, 70], split: 0.18, stamp: 'date', stampColor: '#ffd23d' },
  { id: 'pink-blowout', name: 'Pink Blowout', cat: 'indie', desc: 'Pink blowout, dreamy glow and burnt highlights', exposure: 36, highlights: 38, whites: 44, tint: 22, saturation: 16, bloom: 60, bloomTint: [255, 170, 210], contrast: 18, grade: { hi: [330, 34] }, grain: 24 },
  { id: 'webcam-2020', name: 'Webcam 2020', cat: 'indie', desc: 'Laptop webcam, noise, low resolution and blown light', exposure: 24, whites: 34, contrast: 22, saturation: -8, temperature: -10, lofi: 30, sharpen: 46, grain: 32, highlights: 26, vignette: 20 },

  // Cameras inspired by popular retro camera apps
  { id: 'cp-35', name: 'CP 35', cat: 'film', desc: 'Vivid golden 35mm compact, greenish shadows', temperature: 22, saturation: 20, contrast: 18, highlights: -12, fade: 10, grain: 24, vignette: 22, shadowTint: [60, 120, 90], split: 0.14, gain: [1, 0.97, 0.88], stamp: 'date', stampColor: '#ff8a1f' },
  { id: 'ne-135', name: 'NE 135', cat: 'film', desc: 'Calm cool negative, cyan shadows', temperature: -12, saturation: -20, contrast: 6, fade: 24, grain: 22, shadowTint: [40, 120, 130], split: 0.2, highlights: -10, hsl: { green: [8, -14, 0], blue: [-6, -10, 0] } },
  { id: 'sr-135', name: 'SR 135', cat: 'film', desc: 'Reddish vintage, like an old album print', temperature: 18, tint: 10, saturation: -6, fade: 26, contrast: 8, grain: 30, vignette: 30, lift: [0.05, 0.02, 0.01], gain: [1, 0.93, 0.86], grade: { mid: [10, 16] } },
  { id: 'golfe', name: 'Golf Pastel', cat: 'film', desc: 'Japanese pastel, bright, pink and airy', exposure: 14, fade: 30, contrast: -14, saturation: -4, tint: 10, temperature: 4, highlights: -10, grade: { sh: [200, 14], hi: [340, 14] }, grain: 12 },
  { id: 'kv-88', name: 'KV 88', cat: 'film', desc: 'Warm and saturated with strong vignette and date', temperature: 26, saturation: 24, contrast: 20, vignette: 48, fade: 12, grain: 26, gain: [1, 0.96, 0.84], stamp: 'date', stampColor: '#ff6a1a' },
  { id: 's-67', name: 'S 67', cat: 'film', desc: 'Clean medium format, neutral tones and white border', frame: 'border', contrast: 10, saturation: 4, fade: 8, grain: 10, clarity: 10, temperature: 2 },
  { id: 'd-exp', name: 'D Expired', cat: 'film', desc: 'Expired film, swapped magenta and green', tint: 20, temperature: -6, fade: 30, saturation: 12, contrast: 10, grain: 40, leak: 30, shadowTint: [40, 120, 80], hiTint: [255, 190, 230], split: 0.26 },
  { id: 'ano-1998', name: '1998', cat: 'film', desc: '90s family photo, warm and faded', temperature: 20, saturation: -12, fade: 34, contrast: -4, grain: 30, softness: 6, vignette: 26, stamp: 'date', stampColor: '#ff8a1f' },
  { id: 'ct-2f', name: 'CT 2F', cat: 'film', desc: 'Premium compact, sharp, rich contrast and warm skin', contrast: 22, saturation: 14, clarity: 14, temperature: 12, blacks: -10, grain: 16, vignette: 18, hsl: { orange: [0, 8, 6], blue: [0, 12, -6] } },
  { id: 'nostalgia', name: 'Nostalgia', cat: 'film', desc: 'Soft, warm and nostalgic, like a memory', temperature: 24, fade: 32, contrast: -10, saturation: -10, bloom: 24, softness: 8, grain: 22, vignette: 24, grade: { hi: [40, 20] } },
  { id: 'hoga', name: 'Hoga', cat: 'film', desc: 'Plastic lens, heavy vignette and light leaks', vignette: 90, softness: 18, leak: 40, saturation: 16, contrast: 24, grain: 30, temperature: 8 },
  { id: 'd-fun', name: 'D Fun', cat: 'film', desc: 'Bright and playful, pop disposable colors', saturation: 36, vibrance: 16, contrast: 16, exposure: 8, temperature: 10, grain: 24, bloom: 14, stamp: 'date' },
  { id: 'sprocket', name: 'Sprocket', cat: 'film', desc: 'Film with the sprocket holes showing', frame: 'film', temperature: 14, fade: 18, contrast: 12, grain: 32, saturation: 6 },
  { id: 'okak', name: 'Okak', cat: 'film', desc: 'Cheap disposable, coarse grain and yellow green cast', tint: -10, temperature: 12, fade: 20, grain: 50, grainSize: 30, contrast: 14, vignette: 34, saturation: 8, stamp: 'date', stampColor: '#ffb000' },
  { id: 'fqs', name: 'FQS', cat: 'film', desc: 'Summer disposable, bright and slightly green', exposure: 12, tint: -14, temperature: 6, saturation: 14, contrast: 12, fade: 12, grain: 26, bloom: 12, stamp: 'date', stampColor: '#ff8a1f' },
  { id: 'classic-u', name: 'Classic U', cat: 'film', desc: 'Cool classic, deep blues and soft skin', temperature: -14, saturation: 6, contrast: 14, fade: 14, grain: 18, grade: { sh: [215, 22], hi: [40, 10] } },
  { id: 'pola-i', name: 'Pola I', cat: 'film', desc: 'Cool faded instant print with frame', frame: 'instant', fade: 32, temperature: -10, contrast: -6, saturation: -10, grade: { sh: [190, 24] }, vignette: 16 },
  { id: 'inst-mini', name: 'Inst Mini', cat: 'film', desc: 'Warm mini instant with soft flash', frame: 'instant', exposure: 12, fade: 24, temperature: 14, saturation: 6, bloom: 26, contrast: -4 },
  { id: 'mono-400', name: 'Mono 400', cat: 'film', desc: 'Classic black and white, bold grain and rich blacks', mono: true, contrast: 30, blacks: -14, grain: 42, clarity: 12, vignette: 22, stampColor: '#f2f2f2' },
  { id: 'ccd-2003', name: 'CCD 2003', cat: 'y2k', desc: 'Pocket digicam, flash and blown highlights', exposure: 18, highlights: 24, whites: 28, sharpen: 52, temperature: -14, saturation: 12, contrast: 16, bloom: 18, grain: 14, stamp: 'date', stampColor: '#ffb000' },

  // Yellow
  { id: 'mel', name: 'Honey', cat: 'yellow', desc: 'Honey yellow, warm and sweet', temperature: 30, tint: 4, saturation: 8, fade: 16, contrast: 6, gain: [1, 0.97, 0.78], grade: { hi: [45, 30], mid: [40, 12] }, grain: 16 },
  { id: 'girassol', name: 'Sunflower', cat: 'yellow', desc: 'Bright summer yellow, soft sky', temperature: 22, saturation: 22, contrast: 14, hsl: { yellow: [-6, 30, 8], orange: [6, 16, 4], blue: [0, -16, 0] }, grade: { hi: [52, 26] }, grain: 14 },
  { id: 'ambar-70', name: 'Amber 70', cat: 'yellow', desc: '70s film, amber and faded', temperature: 34, saturation: -14, fade: 34, contrast: 4, grain: 34, vignette: 30, lift: [0.06, 0.04, 0], gain: [1, 0.94, 0.74] },
  { id: 'limao-pastel', name: 'Lemon Pastel', cat: 'yellow', desc: 'Light pastel yellow green', exposure: 10, tint: -8, temperature: 14, fade: 28, contrast: -10, saturation: -6, grade: { hi: [65, 26], sh: [90, 10] } },
  { id: 'sol-verao', name: 'Summer Sun', cat: 'yellow', desc: 'Golden late afternoon light with glow', temperature: 36, exposure: 8, saturation: 12, bloom: 34, bloomTint: [255, 210, 120], highlights: -12, leak: 16, grade: { hi: [48, 24] } },
  { id: 'mostarda', name: 'Mustard', cat: 'yellow', desc: 'Retro mustard yellow, greens turn ochre', temperature: 20, saturation: -8, contrast: 16, hsl: { green: [-30, -20, -6], yellow: [-8, 16, -6], blue: [0, -30, 0] }, grade: { mid: [45, 20] }, grain: 22 },

  // Green
  { id: 'esmeralda', name: 'Emerald', cat: 'green', desc: 'Deep rich emerald green', contrast: 16, saturation: 10, tint: -12, hsl: { green: [10, 26, -12], aqua: [-14, 16, -6], yellow: [16, 10, 0] }, grade: { sh: [160, 26], mid: [150, 10] }, grain: 14 },
  { id: 'floresta-fria', name: 'Cold Forest', cat: 'green', desc: 'Cold dark green of a dense forest', temperature: -14, tint: -14, exposure: -8, contrast: 14, saturation: -14, grade: { sh: [170, 30] }, vignette: 34, grain: 20 },
  { id: 'menta', name: 'Mint', cat: 'green', desc: 'Light fresh mint green', exposure: 10, tint: -18, temperature: -6, fade: 26, contrast: -10, saturation: -6, grade: { sh: [160, 18], hi: [140, 12] } },
  { id: 'oliva-retro', name: 'Retro Olive', cat: 'green', desc: 'Military olive, earthy and vintage', tint: -10, temperature: 14, saturation: -20, fade: 18, contrast: 12, shadowTint: [70, 90, 40], split: 0.22, grain: 28 },
  { id: 'verde-drogaria', name: 'Drugstore Green', cat: 'green', desc: 'Cheap film with a strong green cast', tint: -26, temperature: 2, fade: 22, contrast: 10, grain: 34, shadowTint: [40, 140, 80], split: 0.24, vignette: 22 },
  { id: 'neon-verde', name: 'Neon Green', cat: 'green', desc: 'Bright neon green night', tint: -24, temperature: -8, contrast: 24, saturation: 20, blacks: -14, bloom: 36, bloomTint: [140, 255, 170], grade: { sh: [150, 34], hi: [120, 20] } },

  // Wine
  { id: 'vinho-tinto', name: 'Red Wine', cat: 'wine', desc: 'Deep wine shadows, warm skin', contrast: 16, saturation: -6, blacks: -10, grade: { sh: [345, 40], mid: [350, 14], hi: [30, 10] }, vignette: 30, grain: 16 },
  { id: 'bordo', name: 'Bordeaux', cat: 'wine', desc: 'Elegant bordeaux, dark rich tones', exposure: -6, contrast: 20, saturation: -14, temperature: 6, grade: { sh: [340, 46], mid: [345, 20] }, hsl: { red: [-8, 14, -14], orange: [-6, 0, 0] }, vignette: 36, grain: 18 },
  { id: 'cereja-noir', name: 'Cherry Noir', cat: 'wine', desc: 'Cherry red with crushed blacks', contrast: 32, blacks: -26, saturation: -20, hsl: { red: [-4, 34, -8], magenta: [-10, 20, 0] }, grade: { sh: [350, 30] }, vignette: 50, grain: 24 },
  { id: 'rose', name: 'Rose', cat: 'wine', desc: 'Light rose, soft and romantic', exposure: 8, fade: 26, contrast: -8, tint: 14, temperature: 6, grade: { sh: [345, 22], hi: [10, 14] }, bloom: 16 },
  { id: 'merlot-film', name: 'Merlot Film', cat: 'wine', desc: 'Faded film with wine colored shadows', fade: 22, contrast: 10, saturation: -10, temperature: 10, shadowTint: [130, 30, 60], split: 0.3, grain: 30, vignette: 24, stamp: 'date', stampColor: '#f2b8c6' },
  { id: 'veludo', name: 'Velvet', cat: 'wine', desc: 'Velvety wine with a soft glow', contrast: 12, saturation: 6, bloom: 30, bloomTint: [255, 140, 170], softness: 6, grade: { sh: [338, 34], mid: [345, 16] }, vignette: 28 },
];

RECIPES.forEach((r, i) => {
  r.seed = i * 97 + 13;
  if (r.hsl) {
    for (const b of Object.keys(r.hsl)) {
      const v = (r.hsl as any)[b];
      r['hsl_' + b + '_h'] = v[0];
      r['hsl_' + b + '_s'] = v[1];
      r['hsl_' + b + '_l'] = v[2];
    }
  }
  if (r.grade) {
    if (r.grade.sh) { r.gShH = r.grade.sh[0]; r.gShS = r.grade.sh[1]; }
    if (r.grade.mid) { r.gMidH = r.grade.mid[0]; r.gMidS = r.grade.mid[1]; }
    if (r.grade.hi) { r.gHiH = r.grade.hi[0]; r.gHiS = r.grade.hi[1]; }
  }
});

export const CATEGORIES = ['all', 'fav', 'film', 'indie', 'y2k', 'flash', 'sim', 'yellow', 'green', 'wine', 'lowlight', 'nature', 'color', 'video', 'extra', 'mine'] as const;

export function findRecipe(id: string, custom: Recipe[] = []): Recipe {
  return RECIPES.find((r) => r.id === id) || custom.find((r) => r.id === id) || RECIPES[0];
}
