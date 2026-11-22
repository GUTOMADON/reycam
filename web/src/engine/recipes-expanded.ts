import type { Category, Recipe } from './types';

function makeLooks(
  cat: Category,
  prefix: string,
  names: readonly string[],
  style: (i: number) => Partial<Recipe>,
  descriptions?: readonly string[]
): Recipe[] {
  return names.map((name, i) => {
    const unique = i * 17 + 11;
    const combined = style(i);
    return {
      id: `${prefix}-${String(i).padStart(2, '0')}`,
      name,
      cat,
      desc: descriptions?.[i] || `${name} for everyday social edits`,
      seed: i * 101 + 17,
      ...combined,
      exposure: ((combined.exposure as number | undefined) || 0) + ((unique * 7) % 19) - 9,
      contrast: ((combined.contrast as number | undefined) || 0) + ((unique * 5) % 25) - 12,
      temperature: ((combined.temperature as number | undefined) || 0) + ((unique * 3) % 31) - 15,
      tint: ((combined.tint as number | undefined) || 0) + ((unique * 11) % 21) - 10,
      saturation: ((combined.saturation as number | undefined) || 0) + ((unique * 13) % 29) - 14,
      grain: ((combined.grain as number | undefined) || 0) + ((unique * 7) % 18),
      vignette: ((combined.vignette as number | undefined) || 0) + ((unique * 9) % 16),
      hsl: cat === 'sim'
        ? { blue: [-8 + i % 9, 12 + i % 7 * 3, -4], green: [4, -6 - i % 5 * 2, 2] }
        : cat === 'nature'
          ? { green: [8 + i % 6, 14 + i % 8 * 3, 4], aqua: [-4, 8 + i % 5 * 3, 2] }
          : combined.hsl,
    };
  });
}

export const Y2K_EXTRA = makeLooks('y2k', 'y2k-new', [
  'Pocket Glow', 'CCD Room', 'Mall Camera', 'Blue Flash', 'Late Night Snap', 'Silver Selfie',
  'Digital Cherry', 'Hotspot 2004', 'Cyber Picnic', 'Pink LCD', 'Windows Photo', 'Party VGA',
  'Bubble Cam', 'My Room Blue', 'Flashback Pixel', 'Purple Messenger', 'Café Digi', 'School Hall',
  'Night Bus', 'Soft LCD', 'Orange Flash', 'Bedroom 2003', 'Friendster Glow', 'Club Snapshot',
  'Digital Grain', 'Lime Phone', 'Silver Pop', 'Camcorder Selfie', 'Plastic Camera',
  'Hot Pink Room', 'Cool Mirror', 'Weekend 2005', 'Retro Message', 'Tiny Pixel',
  'Mall Neon', 'Purple Date Stamp', 'Flash White', 'Blue Compact', 'Disposable Digi',
  'Sleepover Pink', 'Arcade Glow', 'Green LCD', 'Cloud Cam'
], (i) => ({
  exposure: i % 6 === 0 ? 14 : i % 6 === 1 ? -8 : 4,
  temperature: -24 + (i % 10) * 5,
  tint: -12 + (i % 7) * 4,
  saturation: -8 + (i % 8) * 5,
  contrast: 4 + (i % 7) * 5,
  highlights: i % 5 === 0 ? 18 : i % 5 === 1 ? -10 : 2,
  grain: 8 + (i % 5) * 7,
  sharpen: 18 + (i % 6) * 8,
  vignette: i % 7 === 0 ? 38 : 12 + (i % 4) * 5,
  bloom: i % 4 === 0 ? 22 : i % 7 === 0 ? 14 : 4,
  lofi: i % 5 === 0 ? 24 : i % 9 === 0 ? 16 : 0,
  stamp: i % 4 === 0 ? 'date' : null,
  stampColor: i % 6 === 0 ? '#ff6db2' : i % 6 === 1 ? '#8bdcff' : '#ff8a1f',
}));

export const FLASH_EXTRA = makeLooks('flash', 'flash-new', [
  'Clean Flash', 'White Wall', 'Red Room Flash', 'Blue Backlight', 'Shop Mirror', 'Party Ceiling',
  'Soft On Camera', 'Harsh Direct', 'Pink Bounce', 'Frozen Motion', 'Late Doorway',
  'Silver Hall', 'Warm Bathroom', 'Crowd Flash', 'Noir Snapshot', 'Bling Light',
  'Window Bounce', 'Green Fringe', 'Compact Burst', 'Cloudy Exposure', 'Shadow Pop',
  'Hallway Glow', 'Nightstand', 'Club Blur', 'Ice Flash', 'Peach Bloom',
  'Back Room', 'Street Corner', 'Red Curtain', 'Faded Polaroid', 'Chrome Face',
  'Cinema Flash', 'Soft Corners', 'White Dance Floor'
], (i) => ({
  exposure: 4 + (i % 7) * 3, contrast: 12 + (i % 6) * 5,
  bloom: 10 + (i % 5) * 8, saturation: -18 + (i % 7) * 7,
  temperature: -8 + (i % 8) * 5, vignette: 18 + (i % 6) * 7,
  grain: 12 + (i % 5) * 8, sharpen: i % 4 === 0 ? 44 : 20,
}));

export const INDIE_EXTRA = makeLooks('indie', 'indie-new', [
  'Bedroom Soft', 'Blurred Post', 'Dusty Feed', 'Soft Grunge', 'Lime Night',
  'Flash Diary', 'Motel Print', 'Sun Blush', 'Worn Magazine', 'Club Polaroid',
  'Muted Rehearsal', 'Lavender Fade', 'Kitchen Evening', 'Cheap Projector',
  'Vintage Web', 'Soft Corners', 'Crumpled Paper', 'Garage Light', 'Pastel Dust',
  'Bleached Film', 'Room Flash', 'Loose Color', 'Green Flash', 'Peach Haze',
  'Night Bus Indie', 'Faded Poster', 'Backyard Smoke', 'Soft Punk', 'Blurred Crowd',
  'Rose Tint', 'Magazine Grain', 'Silver Hall', 'Cafe Lo-Fi', 'Weekend Blur'
], (i) => ({
  exposure: i % 5 === 0 ? 10 : i % 5 === 1 ? -12 : 2,
  contrast: i % 7 === 0 ? 28 : 4 + (i % 6) * 4,
  saturation: -24 + (i % 9) * 7, fade: 8 + (i % 6) * 5,
  temperature: -4 + (i % 8) * 4, grain: 18 + (i % 5) * 9,
  vignette: 10 + (i % 7) * 6, bloom: i % 6 === 0 ? 26 : 8,
}));

export const SIM_EXTRA = makeLooks('sim', 'sim-new', [
  'Vivid Street', 'Soft Daily', 'Natural Skin', 'Cinematic Chrome', 'Neutral Archive',
  'Portrait Color', 'Landscape Deep', 'Warm Slide', 'Cool Negative', 'Sunlit Print',
  'Documentary Standard', 'Classic Ektachrome', 'Muted Travel', 'Clean Digital',
  'Rainy Color', 'Forest Chrome', 'Desert Fade', 'Winter Neutral', 'Golden Negative',
  'Blue Shadow', 'Rose Portrait', 'Red Landscape', 'Balanced 400', 'Soft 100',
  'Hard 200', 'Fine 50', 'Metro Standard', 'Vintage Neutral', 'Dusk Chrome',
  'Food Color', 'Skin Balance', 'Airy Film', 'Cold Neutral', 'Street Standard'
], (i) => ({
  exposure: i % 7 === 0 ? 8 : i % 7 === 1 ? -8 : 0,
  contrast: 4 + (i % 8) * 4, saturation: -12 + (i % 9) * 8,
  temperature: -14 + (i % 8) * 4, highlights: i % 5 === 0 ? -16 : 0,
  grain: i % 4 === 0 ? 26 : 8, vibrance: 4 + (i % 5) * 4,
}));

export const YELLOW_EXTRA = makeLooks('yellow', 'yellow-new', [
  'Honey Sunday', 'Soft Lemon', 'Golden Window', 'Sunlit Ocher', 'Amber Wall',
  'Pale Marigold', 'Warm Saffron', 'Yellow Bloom', 'Summer Card', 'Desert Light',
  'Creamy Sun', 'Mango Glow', 'Butter Print', 'Golden Grain', 'Tawny Shadow',
  'Morning Ochre', 'Sunny Street', 'Citrine Fade', 'Warm Corn', 'Soft Mustard',
  'Bronze Noon', 'Amber Dust', 'Yellow Haze', 'Harvest Light', 'Golden Hour New',
  'Pale Honey', 'Saffron Skin', 'Sunwashed', 'Ochre Night', 'Lemon Flash',
  'Warm Polaroid', 'Butter Yellow', 'Desert Gold', 'Golden Matte'
], (i) => ({
  temperature: 12 + (i % 8) * 3, tint: i % 5 * 2,
  saturation: 4 + (i % 7) * 6, contrast: 4 + (i % 6) * 4,
  hsl: { yellow: [i % 5 * 2 - 4, 10 + i % 4 * 5, 4], orange: [2, 8, 2] },
  grain: i % 4 === 0 ? 28 : 12,
}));

export const GREEN_EXTRA = makeLooks('green', 'green-new', [
  'Moss Street', 'Deep Emerald', 'Pale Mint', 'Forest Shade', 'Olive Dusk',
  'Drugstore Green', 'Rain Garden', 'Cold Sage', 'Neon Leaf', 'Bottle Green',
  'Green Room', 'Jade Print', 'Tea Garden', 'Sea Glass', 'Wild Fern',
  'Army Shadow', 'Mint Flash', 'Emerald Night', 'Soft Cypress', 'Lime Arcade',
  'Greenhouse', 'Aqua Moss', 'Muted Olive', 'Park Rain', 'Dark Clover',
  'Sage Portrait', 'Forest Negative', 'Jade Glow', 'Pale Chlorophyll', 'Green Window',
  'Bottle Shadow', 'Neon Moss', 'Tropical Shade', 'Garden Matte'
], (i) => ({
  tint: -18 + (i % 6) * 3, temperature: -8 + (i % 7) * 3,
  saturation: -12 + (i % 8) * 5, contrast: 6 + (i % 7) * 4,
  shadowTint: [40 + i % 5 * 6, 110 + i % 4 * 8, 70 + i % 6 * 5],
  split: 0.12 + (i % 5) * 0.05, grain: i % 4 === 0 ? 34 : 14,
}));

export const WINE_EXTRA = makeLooks('wine', 'wine-new', [
  'Merlot Shadow', 'Cherry Window', 'Bordeaux Night', 'Rosewood', 'Velvet Red',
  'Wineprint', 'Ruby Room', 'Dark Rose', 'Crimson Portrait', 'Garnet Street',
  'Plum Evening', 'Burgundy Fade', 'Pink Noir', 'Carmine Dusk', 'Cabernet',
  'Red Velvet', 'Mulberry', 'Cherry Matte', 'Sangria', 'Claret Film',
  'Wine Glass', 'Dark Fuchsia', 'Raspberry Shadow', 'Ox Blood', 'Rose Cinema',
  'Brick Wine', 'Purple Red', 'Deep Pomegranate', 'Soft Maroon', 'Red Archive',
  'Velvet Shadow', 'Cherry Flash', 'Bordeaux Grain', 'Wine Haze'
], (i) => ({
  saturation: -14 + (i % 8) * 5, contrast: 8 + (i % 7) * 5,
  temperature: i % 5 * 4, shadowTint: [120 + i % 6 * 8, 30 + i % 5 * 4, 55 + i % 7 * 5],
  split: 0.18 + (i % 5) * 0.06, vignette: 18 + (i % 6) * 6,
  grain: i % 4 === 0 ? 32 : 14,
}));

export const LOWLIGHT_EXTRA = makeLooks('lowlight', 'low-new', [
  'Tunnel Blue', 'Night Window', 'Streetlamp', 'Last Train', 'Dark Apartment',
  'Moonlit', 'Gas Station', 'Subway Quiet', 'Blue Neon', 'Empty Parking',
  'Night Gym', 'Rain Underpass', 'Warm Lamp', 'Elevator', 'Cold Hall',
  'Diner Late', 'After Party', 'Night Taxi', 'Blue Corner', 'Lantern',
  'Low Neon', 'Dark Cinema', 'Rooftop Night', 'Night Kitchen', 'Bedroom Lamp',
  'Club Exit', 'Fog Street', 'Midnight Portrait', 'Garage Night', 'Hotel Hall',
  'Candle Room', 'Deep Blue', 'Night Road', 'Quiet Flash'
], (i) => ({
  exposure: -24 + (i % 7) * 5, contrast: 10 + (i % 7) * 5,
  shadows: -18 - (i % 5) * 3, saturation: -30 + (i % 8) * 4,
  temperature: -18 + (i % 8) * 5, vignette: 24 + (i % 6) * 6,
  shadowTint: i % 3 === 0 ? [20, 62, 88] : i % 3 === 1 ? [78, 58, 42] : [32, 84, 76],
  grain: 16 + (i % 5) * 7, bloom: i % 6 === 0 ? 24 : 8,
}));

export const NATURE_EXTRA = makeLooks('nature', 'nature-new', [
  'Forest Mist', 'Lake Blue', 'Moss Light', 'Golden Meadow', 'Mountain Air',
  'Wild Coast', 'Rain Leaves', 'Soft Spring', 'Pine Valley', 'Warm Desert',
  'Ocean Clear', 'Fern Shade', 'Sunlit Trail', 'Cloud Peak', 'River Stone',
  'Winter Pine', 'Canyon Dust', 'Lagoon', 'Meadow Film', 'Rock Shadow',
  'Northern Haze', 'Red Earth', 'Snow Soft', 'Green Tide', 'Golden Field',
  'Storm Coast', 'Jungle Dark', 'Fresh Leaves', 'High Desert', 'Sea Mist',
  'Woodland', 'Flower Glow', 'Volcano', 'Alpine Matte'
], (i) => ({
  saturation: -8 + (i % 9) * 5, contrast: 6 + (i % 7) * 4,
  temperature: -8 + (i % 8) * 4, highlights: i % 5 === 0 ? -18 : 0,
  vibrance: 8 + (i % 5) * 5, dehaze: i % 6 === 0 ? 28 : i % 7 === 0 ? 14 : 4,
  grain: i % 4 === 0 ? 24 : 8,
}));

export const COLOR_EXTRA = makeLooks('color', 'color-new', [
  'Candy Color', 'Soft Pop', 'Blue Punch', 'Rose Punch', 'Green Pop',
  'Orange Soda', 'Purple Neon', 'Clean Bright', 'Pastel Neon', 'Electric Cyan',
  'Magenta Bloom', 'Yellow Flash', 'Rainbow Matte', 'Vivid Day', 'Color Crush',
  'Tropical Pop', 'Ice Pink', 'Citrus Neon', 'Blue Lagoon', 'Red Lips',
  'Green Candy', 'Lavender Sky', 'Orange Room', 'Aqua City', 'Sunset Pop',
  'Cherry Soda', 'Mint Haze', 'Golden Pop', 'Indigo Night', 'Creamy Color',
  'Soft Rainbow', 'High Chroma', 'Neon Portrait', 'Candy Haze'
], (i) => ({
  saturation: 18 + (i % 8) * 5, vibrance: 8 + (i % 6) * 6,
  contrast: 8 + (i % 7) * 4, temperature: -12 + (i % 9) * 3,
  highlights: i % 5 === 0 ? -12 : 4, grain: i % 5 === 0 ? 20 : 6,
}));

export const VIDEO_EXTRA = makeLooks('video', 'video-new', [
  'Tape Travel', 'Digital Video', 'News Cam', 'Superframe', 'Night Record',
  'Beach Cam', 'Webcam Soft', 'VHS Blue', 'CCTV Blue', 'Mini DV',
  'Traffic Cam', 'Car Video', 'Concert Capture', 'Phone 720', 'Camcorder Warm',
  'Security Hall', 'Retro Broadcast', 'Video Grain', 'Flicker Day', 'Weekend Tape',
  'Subway Video', 'Action Cam', 'School Recording', 'Live Feed', 'Soft DV',
  'VHS Rose', 'Digital Flash', 'Night Webcam', 'Outdoor Broadcast', 'Indoor Tape',
  'Travel Camera', 'Analog News', 'Street Video', 'Memory Card'
], (i) => ({
  saturation: i % 6 === 0 ? 18 : i % 6 === 1 ? -28 : -4,
  contrast: 8 + (i % 7) * 4, temperature: -12 + (i % 8) * 4,
  grain: 18 + (i % 5) * 8, scanlines: i % 4 === 0 ? 26 : i % 8 === 0 ? 14 : 4,
  flicker: i % 7 === 0 ? 18 : 4, chroma: i % 5 === 0 ? 16 : 5,
  lofi: i % 6 === 0 ? 18 : 4,
}));

export const EXTRA_EXTRA = makeLooks('extra', 'extra-new', [
  'Prism Pop', 'Double Light', 'Solar Leak', 'Glass Grain', 'Dusty Frame',
  'Dream Scan', 'Halation Pink', 'Blurred Rainbow', 'Chrome Wave', 'Soft Glitch',
  'Photo Burn', 'Red Line', 'Blue Line', 'Posterize Soft', 'Lo-Fi Pixels',
  'Crystal Dust', 'Light Echo', 'Flash Bloom', 'Film Scratches', 'Crossfade',
  'Archive Leak', 'Silver Flare', 'Dreamy Prism', 'Broken Color', 'Paper Scan',
  'Light Prism', 'Pink Halation', 'Blue Scratch', 'Pixel Soft', 'Glow Frame',
  'Night Bloom', 'Sun Glitch', 'Dust Rainbow', 'Cinematic Leak'
], (i) => ({
  contrast: 6 + (i % 7) * 5, saturation: -18 + (i % 8) * 8,
  grain: i % 4 === 0 ? 44 : 12 + (i % 5) * 5,
  bloom: i % 5 === 0 ? 34 : i % 6 === 0 ? 18 : 6,
  chroma: i % 7 === 0 ? 28 : i % 6 === 0 ? 14 : 3,
  dust: i % 8 === 0 ? 42 : i % 9 === 0 ? 22 : 4,
  glitch: i % 9 === 0 ? 18 : i % 11 === 0 ? 10 : 2,
  leak: i % 6 === 0 ? 48 : i % 7 === 0 ? 22 : 5,
}));
