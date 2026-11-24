/**
 * Built in collage templates 1 to 18 (19 to 56 live in templates-set2.ts). Templates are plain data: canvas ratio, photo
 * slots, color slots, default palette and layers. To add a template, add an
 * entry to the list returned by `buildTemplates` (see README, "Adding a
 * collage template"). Default texts are picked for the UI language.
 */
import type { CollageTemplate, Layer, Localized, Paint, ShapeLayer } from './types';
import { rng } from './textures';
import { buildTemplatesSet2 } from './templates-set2';
import { buildTemplatesSet3 } from './templates-set3';
import { recommendedFor } from './filters';

const S = (slot: string): Paint => ({ slot });
const C = (color: string): Paint => ({ color });

/** Scatter stars around a center, denser near it, deterministic per seed. */
function scatter(prefix: string, n: number, cx: number, cy: number, rx: number, ry: number, size: [number, number], seed: number, extra: Partial<ShapeLayer>, ring = false): ShapeLayer[] {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const a = ring ? (i / n) * Math.PI * 2 + r() * 0.3 : r() * Math.PI * 2;
    const d = ring ? 0.92 + r() * 0.16 : Math.pow(r(), 0.7) * 1.05;
    return {
      id: `${prefix}${i}`, kind: 'shape', shape: 'star5',
      x: cx + Math.cos(a) * rx * d, y: cy + Math.sin(a) * ry * d,
      w: size[0] + r() * (size[1] - size[0]), rot: (r() - 0.5) * 50, seed: seed * 31 + i,
      fill: S('starPrimary'), ...extra
    } as ShapeLayer;
  });
}

const bg = (o: Partial<Layer> & Record<string, unknown>): Layer => ({ id: 'bg', kind: 'background', x: 0.5, y: 0.5, w: 1, rot: 0, locked: true, style: 'solid', paint: S('background'), texture: 'none', ...o } as Layer);
const photo = (o: Record<string, unknown>): Layer => ({ id: 'photo', kind: 'photo', photo: 0, x: 0.5, y: 0.5, w: 0.5, rot: 0, treatment: { type: 'none' }, frame: 'none', cutout: 'none', ...o } as Layer);
const shape = (o: Record<string, unknown>): Layer => ({ kind: 'shape', rot: 0, ...o } as Layer);

export function buildTemplates(lang: string): CollageTemplate[] {
  const tr = (s: Localized) => s[lang] ?? s.en;
  const set1: CollageTemplate[] = [
    {
      id: 'star-confetti-booth', name: { en: 'Star Confetti Booth', pt: 'Cabine de Estrelas' }, ratio: '9:16', tags: ['stars', 'booth'], photos: 1,
      palette: 'wine-felt', colors: { background: '#7A1F2C', frame: '#111111' }, slots: ['background', 'frame', 'starPrimary'],
      layers: [
        bg({ texture: 'felt' }),
        photo({ w: 0.46, aspect: 0.74, treatment: { type: 'bw', contrast: 1.15, grain: 0.22 }, frame: 'booth', framePaint: S('frame'), shadow: true }),
        ...scatter('star', 25, 0.5, 0.5, 0.42, 0.36, [0.035, 0.065], 4, { material: 'holo' })
      ]
    },
    {
      id: 'candy-stripe-booth', name: { en: 'Candy Stripe Booth', pt: 'Cabine Listrada' }, ratio: '4:5', tags: ['stars', 'booth'], photos: 1,
      palette: 'candy-stripe', colors: { background: '#7E1D17', backgroundSecondary: '#D17781' }, slots: ['background', 'backgroundSecondary', 'starPrimary'],
      layers: [
        bg({ style: 'stripes', paint2: S('backgroundSecondary'), stripeWidth: 0.07, texture: 'fabric', folds: 'grid' }),
        photo({ w: 0.44, aspect: 0.74, treatment: { type: 'bw', contrast: 1.1, grain: 0.18 }, shadow: true }),
        ...scatter('star', 20, 0.5, 0.5, 0.38, 0.33, [0.05, 0.08], 9, { material: 'puffy' }, true)
      ]
    },
    {
      id: 'cherry-print', name: { en: 'Cherry Print', pt: 'Cópia Cereja' }, ratio: '3:4', tags: ['stars', 'paper'], photos: 1,
      palette: 'cherry-red', colors: { background: '#B3172D', frame: '#1C1414' }, slots: ['background', 'frame', 'starPrimary'],
      layers: [
        bg({ texture: 'poster' }),
        photo({ w: 0.42, aspect: 0.8, treatment: { type: 'warm', amount: 0.8, grain: 0.15 }, frame: 'film', framePaint: S('frame'), shadow: true }),
        ...scatter('star', 14, 0.5, 0.5, 0.33, 0.28, [0.05, 0.075], 12, { material: 'pearl' }, true)
      ]
    },
    {
      id: 'ransom-letters', name: { en: 'Ransom Letters', pt: 'Letras Recortadas' }, ratio: '4:5', tags: ['paper', 'stars', 'scrapbook'], photos: 1,
      palette: 'wine-felt', colors: { background: '#601E28', starPrimary: '#E9E0D1', paper: '#E9DCC4', tintSecondary: '#FFFFFF', doodleFill: '#B3172D', doodleStroke: '#601E28', text: '#FFFFFF' },
      slots: ['background', 'starPrimary', 'paper', 'tintSecondary', 'doodleFill', 'doodleStroke', 'text'],
      layers: [
        bg({ texture: 'recycled' }),
        ...[[0.08, 0.1, 0.34, -12], [0.9, 0.08, 0.26, 18], [0.95, 0.42, 0.22, 8], [0.04, 0.55, 0.28, -20], [0.88, 0.82, 0.36, 12], [0.12, 0.92, 0.3, 24], [0.5, -0.02, 0.2, 4], [0.62, 0.97, 0.18, -8]]
          .map(([x, y, w, rot], i) => shape({ id: `pstar${i}`, shape: 'paperStar', x, y, w, rot, fill: S('starPrimary'), wobble: 0.8, texture: 'paper', seed: 50 + i })),
        photo({ w: 0.5, aspect: 0.78, treatment: { type: 'bw', contrast: 0.95, grain: 0.2 }, shadow: true }),
        { id: 'tiles', kind: 'tiles', x: 0.5, y: 0.17, w: 0.22, rot: -4, text: 'XO', tiles: [S('paper'), S('tintSecondary')], letters: [S('doodleFill'), S('doodleStroke')], seed: 5 } as Layer,
        { id: 'caption', kind: 'text', x: 0.5, y: 0.86, w: 0.6, rot: -3, text: tr({ en: 'my favorite person', pt: 'minha pessoa favorita' }), font: 'script', paint: S('text'), size: 0.055 } as Layer
      ]
    },
    {
      id: 'red-star-overlay', name: { en: 'Red Star Overlay', pt: 'Estrela Vermelha' }, ratio: '4:5', tags: ['stars'], photos: 1,
      palette: 'cherry-red', colors: { background: '#A61212', tint: '#E0161E' }, slots: ['background', 'tint'],
      layers: [
        bg({ texture: 'poster' }),
        photo({ x: 0.42, y: 0.56, w: 0.6, aspect: 0.8, treatment: { type: 'bw', contrast: 1.2, grain: 0.15 } }),
        shape({ id: 'bigstar', shape: 'star5', x: 0.45, y: 0.4, w: 0.66, rot: -6, fill: S('tint'), opacity: 0.72, blend: 'multiply' })
      ]
    },
    {
      id: 'crayon-split-duo', name: { en: 'Crayon Split Duo', pt: 'Dupla de Giz' }, ratio: '9:16', tags: ['duo', 'doodle'], photos: 2,
      palette: 'crayon-pop', colors: { background: '#F6A402', backgroundSecondary: '#023A73', doodleFill: '#FD0100', outline: '#023A73', outlineSecondary: '#F6A402' },
      slots: ['background', 'backgroundSecondary', 'doodleFill', 'outline', 'outlineSecondary'],
      layers: [
        bg({ style: 'split', paint2: S('backgroundSecondary'), texture: 'crayon' }),
        shape({ id: 'burst-top', shape: 'burst', x: 0.5, y: 0.25, w: 0.95, points: 16, fill: S('doodleFill'), texture: 'crayon', wobble: 0.4, seed: 2 }),
        shape({ id: 'burst-b1', shape: 'burst', x: 0.18, y: 0.66, w: 0.32, points: 12, fill: S('doodleFill'), texture: 'crayon', seed: 3 }),
        shape({ id: 'burst-b2', shape: 'burst', x: 0.85, y: 0.9, w: 0.36, points: 12, fill: S('doodleFill'), texture: 'crayon', seed: 4 }),
        photo({ id: 'photo', x: 0.5, y: 0.25, w: 0.5, rot: 90, cutout: 'sticker', outline: S('outline'), outlineWidth: 28, roughEdge: true, shadow: true }),
        photo({ id: 'photo2', photo: 1, x: 0.5, y: 0.75, w: 0.5, rot: -90, flip: true, cutout: 'sticker', outline: S('outlineSecondary'), outlineWidth: 28, roughEdge: true, shadow: true })
      ]
    },
    {
      id: 'paper-stars-night', name: { en: 'Paper Stars Night', pt: 'Noite de Estrelas' }, ratio: '4:5', tags: ['paper', 'stars'], photos: 1,
      palette: 'navy-gold', colors: { background: '#28415F', outline: '#EFE6CF', starPrimary: '#E8C84A' }, slots: ['background', 'outline', 'starPrimary'],
      layers: [
        bg({ texture: 'poster' }),
        photo({ x: 0.48, y: 0.6, w: 0.72, cutout: 'torn', outline: S('outline'), outlineWidth: 20, shadow: true }),
        ...[[0.2, 0.13, 0.17, -14], [0.5, 0.08, 0.13, 8], [0.78, 0.15, 0.16, 20], [0.86, 0.45, 0.14, -6], [0.88, 0.64, 0.11, 16]]
          .map(([x, y, w, rot], i) => shape({ id: `pstar${i}`, shape: 'paperStar', x, y, w, rot, fill: S('starPrimary'), wobble: 0.6, texture: 'paper', seed: 80 + i }))
      ]
    },
    {
      id: 'sky-silhouette-split', name: { en: 'Sky Silhouette Split', pt: 'Céu e Silhueta' }, ratio: '3:4', tags: ['paper', 'doodle', 'nature'], photos: 1,
      palette: 'sky-zine', colors: { background: '#D9EDF6', paper3: '#FFFFFF', text: '#1A1A1A', paper: '#F7F3EA' }, slots: ['background', 'paper3', 'text', 'paper'],
      layers: [
        bg({ style: 'sky', paint3: S('paper3'), folds: 'middle' }),
        photo({ id: 'bottom', x: 0.5, y: 0.75, w: 1, aspect: 1.5, treatment: { type: 'bw', contrast: 1.4, grain: 0.2 } }),
        { id: 'silhouette', kind: 'subject', of: 'bottom', x: 0.5, y: 0.75, w: 1, rot: 0, cutout: 'silhouette', fill: S('background') } as Layer,
        ...scatter('bstar', 7, 0.5, 0.78, 0.42, 0.16, [0.04, 0.07], 21, { fill: S('background') }),
        ...Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return photo({ id: `win${i}`, x: 0.5 + Math.cos(a) * 0.36, y: 0.25 + Math.sin(a) * 0.17, w: 0.11, rot: i * 13, aspect: 1, zoom: 2.4, cutout: 'window', windowShape: 'star', treatment: { type: 'bw', contrast: 1.3, grain: 0.1 } });
        }),
        photo({ id: 'top', x: 0.5, y: 0.27, w: 0.48, cutout: 'clean', treatment: { type: 'bw', contrast: 1.25, grain: 0.15 } }),
        { id: 'caption', kind: 'text', x: 0.82, y: 0.4, w: 0.25, rot: -8, text: tr({ en: 'sunny days', pt: 'dias de sol' }), font: 'script', paint: S('text'), size: 0.04 } as Layer,
        shape({ id: 'note', shape: 'rect', x: 0.88, y: 0.08, w: 0.12, rot: 6, fill: S('paper'), texture: 'paper' }),
        shape({ id: 'asterisk', shape: 'asterisk', x: 0.88, y: 0.08, w: 0.07, rot: 6, fill: null, stroke: S('text'), strokeWidth: 5, texture: 'marker' })
      ]
    },
    {
      id: 'doodle-stars-print', name: { en: 'Doodle Stars Print', pt: 'Estrelas Rabiscadas' }, ratio: '5:7', tags: ['doodle', 'stars'], photos: 1,
      palette: 'mustard-teal', colors: { frame: '#FFFFFF', doodleFill: '#F6BC00', doodleStroke: '#D21F1F', accent: '#F6BC00' }, slots: ['frame', 'doodleFill', 'doodleStroke', 'accent'],
      layers: [
        bg({ paint: S('frame'), texture: 'paper' }),
        photo({ y: 0.46, w: 0.84, aspect: 0.72 }),
        shape({ id: 'bigstar', shape: 'star5', x: 0.5, y: 0.26, w: 0.5, rot: -8, fill: S('doodleFill'), stroke: S('doodleStroke'), strokeWidth: 7, offset: 0.025, texture: 'marker', wobble: 0.25, seed: 9, behind: 'photo' }),
        ...[[0.16, 0.2, 0.15, 12], [0.84, 0.62, 0.17, -14], [0.2, 0.74, 0.11, 22]].map(([x, y, w, rot], i) => shape({ id: `ystar${i}`, shape: 'star5', x, y, w, rot, fill: S('doodleFill'), stroke: S('doodleStroke'), strokeWidth: 6, offset: 0.03, texture: 'marker', wobble: 0.3, seed: 20 + i })),
        ...[[0.82, 0.18, 0.08], [0.12, 0.45, 0.06], [0.88, 0.4, 0.05], [0.6, 0.78, 0.06]].map(([x, y, w], i) => shape({ id: `spark${i}`, shape: i % 2 ? 'star5' : 'star4', x, y, w, rot: i * 17, fill: null, stroke: S('doodleStroke'), strokeWidth: 5, texture: 'marker', seed: 40 + i })),
        ...[[0.3, 0.12], [0.7, 0.1], [0.92, 0.28], [0.08, 0.6], [0.72, 0.72], [0.4, 0.8]].map(([x, y], i) => shape({ id: `dot${i}`, shape: 'dot', x, y, w: 0.018, fill: S('accent') }))
      ]
    },
    {
      id: 'retro-desktop-dialog', name: { en: 'Retro Desktop Dialog', pt: 'Diálogo Retrô' }, ratio: '9:16', tags: ['desktop'], photos: 1,
      palette: 'pastel-holo', colors: { background: '#6FA8DC', backgroundSecondary: '#5BA84A', paper: '#FFFFFF', frame: '#7B4FD6', text: '#111111', accent: '#5B8DEF' },
      slots: ['frame', 'text', 'background', 'backgroundSecondary', 'paper', 'accent'], finish: 'film',
      layers: [
        bg({ style: 'desktop', paint2: S('backgroundSecondary'), paint3: S('paper') }),
        photo({ x: 0.36, y: 0.63, w: 0.64, cutout: 'clean' }),
        { id: 'selection', kind: 'ui', widget: 'selection', x: 0.36, y: 0.63, w: 0.62, h: 0.44, rot: 0, paint: S('frame') } as Layer,
        { id: 'pointer', kind: 'ui', widget: 'pointer', x: 0.69, y: 0.87, w: 0.07, rot: 0 } as Layer,
        {
          id: 'dialog', kind: 'ui', widget: 'dialog', x: 0.5, y: 0.17, w: 0.86, h: 0.16, rot: 0, icon: 'trash', paint: S('frame'), text: S('text'),
          title: tr({ en: 'Delete confirmation', pt: 'Confirmação de delete' }), message: tr({ en: 'Do you really want to delete your outfit?', pt: 'Você realmente quer deletar seu Outfit?' }),
          buttons: [tr({ en: 'yes', pt: 'sim' }), tr({ en: 'no', pt: 'não' })]
        } as Layer,
        ...[['pc', tr({ en: 'My PC', pt: 'Meu PC' })], ['trash', tr({ en: 'Trash', pt: 'Lixeira' })], ['globe', 'Internet.exe'], ['folder', 'Outfits']]
          .map(([icon, label], i) => ({ id: `icon${i}`, kind: 'ui', widget: 'icon', icon, label, x: 0.88, y: 0.36 + i * 0.1, w: 0.17, rot: 0, paint2: S('accent') } as Layer))
      ]
    },
    {
      id: 'system-warning-3d', name: { en: 'System Warning 3D', pt: 'Alerta do Sistema 3D' }, ratio: '4:5', tags: ['desktop'], photos: 1,
      palette: 'pastel-holo', colors: { background: '#3BA3FF', backgroundSecondary: '#45C14A', paper: '#FFFFFF', frame: '#1F2F6B', text: '#111111', accent: '#F2994A' },
      slots: ['frame', 'text', 'accent', 'background', 'backgroundSecondary'],
      layers: [
        bg({ style: 'desktop3d', paint2: S('backgroundSecondary'), paint3: S('paper') }),
        { id: 'toolbox', kind: 'ui', widget: 'toolbox', style: '3d', x: 0.9, y: 0.44, w: 0.13, h: 0.5, rot: 0, paint2: S('accent') } as Layer,
        photo({ x: 0.34, y: 0.62, w: 0.6, cutout: 'clean', shadow: true }),
        {
          id: 'dialog', kind: 'ui', widget: 'dialog', style: '3d', x: 0.56, y: 0.2, w: 0.66, h: 0.2, rot: -3, icon: 'warning', paint: S('frame'), text: S('text'),
          title: 'System Warning', message: tr({ en: 'Are you sure you want to quit?', pt: 'Tem certeza que quer sair?' }), buttons: [tr({ en: 'yes', pt: 'sim' }), tr({ en: 'cancel', pt: 'cancelar' })]
        } as Layer,
        { id: 'bin', kind: 'ui', widget: 'bin', x: 0.66, y: 0.86, w: 0.13, rot: 0, paint2: S('accent') } as Layer,
        { id: 'zip', kind: 'ui', widget: 'folder', style: '3d', label: '.zip', x: 0.84, y: 0.86, w: 0.15, rot: 0, paint2: S('accent') } as Layer,
        { id: 'file1', kind: 'ui', widget: 'file', style: '3d', icon: 'image', label: 'photo.png', x: 0.12, y: 0.16, w: 0.15, rot: -6, paint2: S('accent') } as Layer,
        { id: 'file2', kind: 'ui', widget: 'file', style: '3d', icon: 'music', label: 'song.wav', x: 0.12, y: 0.34, w: 0.15, rot: 5, paint2: S('accent') } as Layer
      ]
    },
    {
      id: 'retro-paint-frame', name: { en: 'Retro Paint Frame', pt: 'Moldura Paint Retrô' }, ratio: '2:3', tags: ['desktop'], photos: 1,
      palette: 'mono-paper', colors: { frame: '#C0C0C0', accent: '#0A246A' }, slots: ['frame', 'accent'],
      layers: [
        bg({ paint: S('frame') }),
        {
          id: 'paint', kind: 'ui', widget: 'paint', x: 0.5, y: 0.5, w: 1, h: 1, rot: 0, locked: true, paint: S('frame'), paint2: S('accent'),
          title: tr({ en: 'untitled - Doodle Pad', pt: 'sem título - Bloco de Rabiscos' }),
          message: tr({ en: 'For Help, tap a color below, then draw on the photo.', pt: 'Para ajuda, toque numa cor abaixo e desenhe na foto.' })
        } as Layer,
        { id: 'draw', kind: 'draw', x: 0.5, y: 0.5, w: 1, rot: 0, strokes: [] } as Layer
      ]
    },
    {
      id: 'love-wall', name: { en: 'Love Wall', pt: 'Muro do Amor' }, ratio: '9:16', tags: ['duo', 'paper', 'scrapbook'], photos: 1,
      palette: 'olive-love', colors: { background: '#56592A', backgroundSecondary: '#3B3D1C', text: '#C8322B' }, slots: ['background', 'backgroundSecondary', 'text'],
      layers: [
        bg({ texture: 'poster' }),
        shape({ id: 'panel', shape: 'rect', x: 0.52, y: 0.6, w: 0.86, h: 0.95, fill: S('backgroundSecondary') }),
        { id: 'pattern', kind: 'pattern', word: 'LOVE', x: 0.52, y: 0.6, w: 0.86, h: 0.46, rows: 11, rot: 0, paint: S('text') } as Layer,
        photo({ x: 0.54, y: 0.72, w: 0.92, cutout: 'clean', treatment: { type: 'bw', contrast: 1.15, grain: 0.2 } }),
        ...([['star', 'glitter', '#F28CC0', '#FFFFFF'], ['heart', 'dots', '#9B6BE0', '#FFFFFF'], ['star', 'stripes', '#3DAA3D', '#F2D541'], ['heart', 'spiral', '#F2D541', '#C8322B'], ['star', 'sunburst', '#F2994A', '#FFF3B0'], ['heart', 'rhinestone', '#C8322B', '#BDE7FF'], ['star', 'dots', '#3A7BEA', '#FFFFFF'], ['heart', 'glitter', '#F26297', '#FFFFFF']] as const)
          .map(([sh, pat, c1, c2], i) => {
            const tt = i / 7;
            return { id: `patch${i}`, kind: 'patch', shape: sh, pattern: pat, x: 0.13 + Math.sin(tt * Math.PI) * 0.12, y: 0.12 + tt * 0.8, w: 0.17, rot: (i % 2 ? 12 : -10), paint: C(c1), paint2: C(c2), seed: i + 1 } as Layer;
          })
      ]
    },
    {
      id: 'starburst-postcard', name: { en: 'Starburst Postcard', pt: 'Cartão Explosão' }, ratio: '4:3', tags: ['paper', 'doodle', 'scrapbook'], photos: 1,
      palette: 'burnt-orange', colors: { background: '#E1DDDE', doodleFill: '#E2462F' }, slots: ['background', 'doodleFill'],
      layers: [
        bg({ texture: 'watercolor' }),
        photo({ y: 0.54, w: 0.48, aspect: 1.25, treatment: { type: 'warm', amount: 0.6, grain: 0.18 }, shadow: true }),
        shape({ id: 'burst', shape: 'burst', x: 0.5, y: 0.4, w: 0.5, points: 22, fill: S('doodleFill'), texture: 'paper', wobble: 0.3, seed: 6 }),
        { id: 'subject', kind: 'subject', of: 'photo', x: 0.5, y: 0.54, w: 0.48, rot: 0, cutout: 'clean' } as Layer
      ]
    },
    {
      id: 'chalk-outline-crew', name: { en: 'Chalk Outline Crew', pt: 'Turma de Giz' }, ratio: '4:3', tags: ['doodle'], photos: 1,
      palette: 'mustard-teal', colors: { doodleStroke: '#F2C230' }, slots: ['doodleStroke'],
      layers: [
        bg({ paint: C('#0E0E0E') }),
        photo({ w: 1, aspect: 4 / 3, treatment: { type: 'flash', contrast: 1.5, grain: 0.25 } }),
        { id: 'outline', kind: 'outline', of: 'photo', x: 0.5, y: 0.5, w: 1, rot: 0, distance: 20, width: 8, paint: S('doodleStroke'), texture: 'chalk' } as Layer,
        ...[[0.1, 0.15, 0.1], [0.88, 0.12, 0.09], [0.06, 0.55, 0.07], [0.94, 0.5, 0.08], [0.3, 0.07, 0.06], [0.72, 0.08, 0.07], [0.9, 0.86, 0.06]]
          .map(([x, y, w], i) => shape({ id: `cstar${i}`, shape: 'star5', x, y, w, rot: i * 11, fill: null, stroke: S('doodleStroke'), strokeWidth: 6, texture: 'chalk', wobble: 0.35, seed: 60 + i }))
      ]
    },
    {
      id: 'ribbon-swirl', name: { en: 'Ribbon Swirl', pt: 'Fita Espiral' }, ratio: '3:4', tags: ['doodle', 'duo'], photos: 1,
      palette: 'burnt-orange', colors: { doodleStroke: '#D9773F', tint: '#5A3A22', paper: '#F1E7D6' }, slots: ['doodleStroke', 'tint', 'paper'],
      layers: [
        bg({ paint: S('paper') }),
        photo({ w: 1, aspect: 3 / 4, treatment: { type: 'mono', tint: S('tint'), paper: S('paper'), grain: 0.2 } }),
        {
          id: 'ribbon', kind: 'ribbon', of: 'photo', x: 0.5, y: 0.52, w: 0.92, h: 0.9, rot: 0, width: 46, paint: S('doodleStroke'), texture: 'crayon',
          points: [[0.5, 0.0], [0.82, 0.16], [0.6, 0.32], [0.18, 0.42], [0.2, 0.62], [0.6, 0.66], [0.88, 0.78], [0.55, 0.96]],
          weave: [false, false, true, false, true, false, false]
        } as Layer,
        ...[[0.12, 0.08, 0.09], [0.32, 0.05, 0.06], [0.88, 0.06, 0.08], [0.06, 0.3, 0.07], [0.95, 0.3, 0.06], [0.07, 0.62, 0.06], [0.94, 0.6, 0.07], [0.7, 0.04, 0.05]]
          .map(([x, y, w], i) => shape({ id: `spark${i}`, shape: 'star4', x, y, w, rot: i * 9, fill: null, stroke: S('doodleStroke'), strokeWidth: 5, texture: 'crayon', seed: 70 + i }))
      ]
    },
    {
      id: 'cobalt-duotone-pop', name: { en: 'Cobalt Duotone Pop', pt: 'Duotone Cobalto' }, ratio: '1:1', tags: ['duo', 'stars', 'halftone'], photos: 1,
      palette: 'cobalt-duotone', colors: { background: '#F8F4F1', tint: '#023EAC', tintSecondary: '#F8F4F1', starPrimary: '#F26297', starSecondary: '#3A7BEA', doodleFill: '#F5C518', doodleStroke: '#3DAA3D' },
      slots: ['background', 'tint', 'starPrimary', 'starSecondary', 'doodleFill', 'doodleStroke'],
      layers: [
        bg({ texture: 'paper' }),
        photo({ y: 0.6, w: 0.9, cutout: 'clean', treatment: { type: 'mono', tint: S('tint'), paper: S('tintSecondary'), grain: 0.35 } }),
        ...[[0.12, 0.12], [0.3, 0.06], [0.52, 0.1], [0.72, 0.05], [0.9, 0.14], [0.08, 0.36], [0.92, 0.38], [0.2, 0.24], [0.8, 0.26], [0.62, 0.22]]
          .map(([x, y], i) => shape({ id: `fstar${i}`, shape: 'star5', x, y, w: 0.06 + (i % 3) * 0.015, rot: i * 23, fill: S(['starPrimary', 'starSecondary', 'doodleFill', 'doodleStroke'][i % 4]), wobble: 0.35, seed: 90 + i })),
        shape({ id: 'cheek1', shape: 'star5', x: 0.44, y: 0.47, w: 0.022, rot: 10, fill: S('starPrimary') }),
        shape({ id: 'cheek2', shape: 'star5', x: 0.465, y: 0.455, w: 0.016, rot: -8, fill: S('starPrimary') })
      ]
    },
    {
      id: 'zigzag-rays', name: { en: 'Zigzag Rays', pt: 'Raios em Zigue-Zague' }, ratio: '20:19', tags: ['doodle', 'duo', 'comic'], photos: 1,
      palette: 'mustard-teal', colors: { background: '#F2C230', doodleStroke: '#1F9A8F' }, slots: ['background', 'doodleStroke'],
      layers: [
        bg({ texture: 'paper' }),
        { id: 'rays', kind: 'zigzag', x: 0.5, y: 0.9, w: 1.7, h: 1.7, rot: 0, count: 6, width: 14, paint: S('doodleStroke'), texture: 'crayon' } as Layer,
        photo({ y: 0.66, w: 0.86, cutout: 'clean', treatment: { type: 'bw', contrast: 1.2, grain: 0.3 } })
      ]
    }
  ];
  const all = set1.concat(buildTemplatesSet2(lang), buildTemplatesSet3(lang));
  // Recommended filter per template number (filter pairing sheet).
  all.forEach((tpl, i) => { tpl.filter = tpl.filter ?? recommendedFor(i + 1); });
  return all;
}

export const TAGS = ['stars', 'booth', 'paper', 'doodle', 'desktop', 'duo', 'comic', 'scrapbook', 'halftone', 'nature'] as const;
