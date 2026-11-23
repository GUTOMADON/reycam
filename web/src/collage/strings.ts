/**
 * Collage UI strings. English and Portuguese are complete; other languages
 * fall back to English, the same rule the rest of ReyCam uses.
 * The language comes from the app (automatic detection or the user's choice).
 */
const en = {
  title: 'Collage', cardSub: 'Cutout, stickers, doodles and paper', templates: 'Templates', mine: 'My Collages', all: 'All',
  tagStars: 'Stars', tagBooth: 'Booth', tagPaper: 'Paper', tagDoodle: 'Doodle', tagDesktop: 'Retro Desktop', tagDuo: 'Duo',
  pickPhoto: 'Pick a photo', pickPhotos: 'Pick 2 photos', pickHint: 'Gallery, camera or computer. The second photo is optional.', photoN: 'Photo', useSame: 'Use the same photo',
  cutting: 'Cutting out the person…', loading: 'Loading…', start: 'Create collage', sample: 'Try with the sample',
  tabTemplate: 'Template', tabCutout: 'Cutout', tabPhoto: 'Photo', tabBackground: 'Background', tabStickers: 'Stickers', tabDraw: 'Draw', tabText: 'Text', tabColors: 'Colors', tabLayers: 'Layers',
  cutNone: 'Full photo', cutClean: 'Clean', cutSticker: 'Paper sticker', cutTorn: 'Torn paper', cutSilhouette: 'Silhouette', cutWindow: 'Shape window',
  outlineWidth: 'Outline', roughEdge: 'Rough edge', shadow: 'Shadow', refine: 'Refine', restore: 'Restore', erase: 'Erase', lasso: 'Lasso cut', brushSize: 'Brush size', softness: 'Softness', zoom: 'Zoom', redoCut: 'Auto cutout again', refineHint: 'Paint on the photo to fix the cutout. Lasso keeps only what you circle.', done: 'Done',
  shapeStar: 'Star', shapeBurst: 'Burst', shapeRounded: 'Rounded',
  treatNone: 'Original', treatBw: 'B&W', treatSepia: 'Sepia', treatMono: 'Monotone', treatDuo: 'Duotone', treatHalftone: 'Halftone', treatOverlay: 'Color overlay', treatWarm: 'Warm film', treatFlash: 'Flash',
  contrast: 'Contrast', grain: 'Grain', amount: 'Amount', fade: 'Fade', dotSize: 'Dot size', opacity: 'Opacity', blend: 'Blend', frame: 'Frame',
  frameNone: 'None', frameBooth: 'Photobooth', frameFilm: 'Film print', framePolaroid: 'Polaroid', frameWhite: 'White paper', margin: 'Margin', changePhoto: 'Change photo', applyTo: 'Apply to', wholePhoto: 'Whole photo', cutoutOnly: 'Cutout only',
  bgSolid: 'Solid', bgStripes: 'Stripes', bgSplit: 'Split', bgCrayon: 'Crayon', bgSky: 'Painted sky', bgDesktop: 'Retro desktop', bgPhoto: 'Your photo', texture: 'Texture',
  texNone: 'None', texFelt: 'Felt', texKraft: 'Kraft', texWatercolor: 'Watercolor', texPoster: 'Grainy poster', texRecycled: 'Recycled', texFolds: 'Folded', texFabric: 'Fabric', texCrayon: 'Crayon', texPaper: 'Paper',
  stripeWidth: 'Stripe width', angle: 'Angle', blur: 'Blur', bw: 'Black and white',
  holo: 'Holo star', paperStar: 'Paper star', burst: 'Starburst', doodleStar: 'Doodle star', sparkle: 'Sparkle', dot: 'Dot', swirl: 'Swirl', heart: 'Heart', patch: 'Patch', ribbon: 'Ribbon', zigzag: 'Zigzag rays', autoOutline: 'Auto outline',
  dialog: 'Dialog', icon: 'Icon', pointer: 'Pointer', toolbox: 'Toolbox', bin: 'Recycle bin', folder: 'Folder',
  scatter: 'Scatter', shuffle: 'Shuffle', material: 'Material', matFlat: 'Flat color', matHolo: 'Holographic', matPastel: 'Pastel rainbow', matMetallic: 'Metallic', matPearl: 'Pearl', matPuffy: 'Puffy',
  strokeWidth: 'Line', weave: 'Weave', weaveHint: 'Tap the dots on the ribbon. Dark = behind the person.', distance: 'Distance', lines: 'Lines', points: 'Points', hand: 'Hand cut',
  duplicate: 'Duplicate', flip: 'Flip', lock: 'Lock', unlock: 'Unlock', forward: 'Forward', backward: 'Backward', remove: 'Delete', hide: 'Hide', show: 'Show', size: 'Size', rotate: 'Rotate', noSelection: 'Tap an element on the collage to edit it.',
  marker: 'Marker', crayon: 'Crayon', chalk: 'Chalk', pencil: 'Pencil', width: 'Width', clearDraw: 'Clear drawing', drawHint: 'Draw on the collage with one finger.',
  addText: 'Add text', addLetters: 'Letter tiles', addPattern: 'Repeated word', font: 'Font', fontScript: 'Script', fontMarker: 'Marker', fontPixel: 'Pixel', fontSans: 'Sans', fontSerif: 'Serif', textValue: 'Text', defaultText: 'hello', defaultWord: 'LOVE',
  palettes: 'Palettes', shufflePalette: 'Shuffle from photo', slots: 'Colors in this collage', elementColor: 'This element',
  hex: 'HEX', recent: 'Recent', eyedropper: 'Pick from collage', eyedropperHint: 'Tap the collage to pick a color', relink: 'Relink to palette', ownColor: 'Own color', brightness: 'Brightness', hue: 'Hue', saturation: 'Saturation',
  ratio: 'Ratio', free: 'Free', format: 'Format', dateStamp: 'Date stamp', exported: 'Collage saved', remix: 'Remix', newCollage: 'New collage', open: 'Open', emptyMine: 'Your collages are saved here automatically.',
  exportTitle: 'Export collage', exporting: 'Exporting…', share: 'Save / Share', videoSoon: 'Video collages are coming in a next version.', hidden: 'hidden', locked: 'locked'
};

export type CollageStrings = typeof en;

const pt: CollageStrings = {
  title: 'Colagem', cardSub: 'Recorte, adesivos, rabiscos e papel', templates: 'Modelos', mine: 'Minhas Colagens', all: 'Todos',
  tagStars: 'Estrelas', tagBooth: 'Cabine', tagPaper: 'Papel', tagDoodle: 'Rabisco', tagDesktop: 'Desktop Retrô', tagDuo: 'Dupla',
  pickPhoto: 'Escolha uma foto', pickPhotos: 'Escolha 2 fotos', pickHint: 'Galeria, câmera ou computador. A segunda foto é opcional.', photoN: 'Foto', useSame: 'Usar a mesma foto',
  cutting: 'Recortando a pessoa…', loading: 'Carregando…', start: 'Criar colagem', sample: 'Testar com o exemplo',
  tabTemplate: 'Modelo', tabCutout: 'Recorte', tabPhoto: 'Foto', tabBackground: 'Fundo', tabStickers: 'Adesivos', tabDraw: 'Desenhar', tabText: 'Texto', tabColors: 'Cores', tabLayers: 'Camadas',
  cutNone: 'Foto inteira', cutClean: 'Limpo', cutSticker: 'Adesivo de papel', cutTorn: 'Papel rasgado', cutSilhouette: 'Silhueta', cutWindow: 'Janela em forma',
  outlineWidth: 'Contorno', roughEdge: 'Borda irregular', shadow: 'Sombra', refine: 'Ajustar', restore: 'Restaurar', erase: 'Apagar', lasso: 'Laço', brushSize: 'Tamanho do pincel', softness: 'Suavidade', zoom: 'Zoom', redoCut: 'Recortar de novo', refineHint: 'Pinte na foto para corrigir o recorte. O laço mantém só o que você circular.', done: 'Concluir',
  shapeStar: 'Estrela', shapeBurst: 'Explosão', shapeRounded: 'Arredondado',
  treatNone: 'Original', treatBw: 'P&B', treatSepia: 'Sépia', treatMono: 'Monotom', treatDuo: 'Duotom', treatHalftone: 'Retícula', treatOverlay: 'Sobreposição', treatWarm: 'Filme quente', treatFlash: 'Flash',
  contrast: 'Contraste', grain: 'Grão', amount: 'Intensidade', fade: 'Desbotar', dotSize: 'Tamanho do ponto', opacity: 'Opacidade', blend: 'Mistura', frame: 'Moldura',
  frameNone: 'Nenhuma', frameBooth: 'Cabine', frameFilm: 'Filme', framePolaroid: 'Polaroid', frameWhite: 'Papel branco', margin: 'Margem', changePhoto: 'Trocar foto', applyTo: 'Aplicar em', wholePhoto: 'Foto inteira', cutoutOnly: 'Só no recorte',
  bgSolid: 'Liso', bgStripes: 'Listras', bgSplit: 'Dividido', bgCrayon: 'Giz de cera', bgSky: 'Céu pintado', bgDesktop: 'Desktop retrô', bgPhoto: 'Sua foto', texture: 'Textura',
  texNone: 'Nenhuma', texFelt: 'Feltro', texKraft: 'Kraft', texWatercolor: 'Aquarela', texPoster: 'Pôster granulado', texRecycled: 'Reciclado', texFolds: 'Dobrado', texFabric: 'Tecido', texCrayon: 'Giz de cera', texPaper: 'Papel',
  stripeWidth: 'Largura da listra', angle: 'Ângulo', blur: 'Desfoque', bw: 'Preto e branco',
  holo: 'Estrela holo', paperStar: 'Estrela de papel', burst: 'Explosão', doodleStar: 'Estrela rabiscada', sparkle: 'Brilho', dot: 'Ponto', swirl: 'Espiral', heart: 'Coração', patch: 'Patch', ribbon: 'Fita', zigzag: 'Raios zigue-zague', autoOutline: 'Contorno automático',
  dialog: 'Janela', icon: 'Ícone', pointer: 'Ponteiro', toolbox: 'Ferramentas', bin: 'Lixeira', folder: 'Pasta',
  scatter: 'Espalhar', shuffle: 'Embaralhar', material: 'Material', matFlat: 'Cor lisa', matHolo: 'Holográfico', matPastel: 'Arco-íris pastel', matMetallic: 'Metálico', matPearl: 'Pérola', matPuffy: 'Fofinho',
  strokeWidth: 'Traço', weave: 'Entrelaçar', weaveHint: 'Toque nos pontos da fita. Escuro = atrás da pessoa.', distance: 'Distância', lines: 'Linhas', points: 'Pontas', hand: 'Recorte à mão',
  duplicate: 'Duplicar', flip: 'Espelhar', lock: 'Travar', unlock: 'Destravar', forward: 'Para frente', backward: 'Para trás', remove: 'Apagar', hide: 'Ocultar', show: 'Mostrar', size: 'Tamanho', rotate: 'Girar', noSelection: 'Toque num elemento da colagem para editar.',
  marker: 'Marcador', crayon: 'Giz de cera', chalk: 'Giz', pencil: 'Lápis', width: 'Espessura', clearDraw: 'Limpar desenho', drawHint: 'Desenhe na colagem com um dedo.',
  addText: 'Adicionar texto', addLetters: 'Letras recortadas', addPattern: 'Palavra repetida', font: 'Fonte', fontScript: 'Cursiva', fontMarker: 'Marcador', fontPixel: 'Pixel', fontSans: 'Sans', fontSerif: 'Serifa', textValue: 'Texto', defaultText: 'oi', defaultWord: 'AMOR',
  palettes: 'Paletas', shufflePalette: 'Embaralhar da foto', slots: 'Cores desta colagem', elementColor: 'Este elemento',
  hex: 'HEX', recent: 'Recentes', eyedropper: 'Pegar da colagem', eyedropperHint: 'Toque na colagem para pegar uma cor', relink: 'Religar à paleta', ownColor: 'Cor própria', brightness: 'Brilho', hue: 'Matiz', saturation: 'Saturação',
  ratio: 'Proporção', free: 'Livre', format: 'Formato', dateStamp: 'Data', exported: 'Colagem salva', remix: 'Remix', newCollage: 'Nova colagem', open: 'Abrir', emptyMine: 'Suas colagens ficam salvas aqui automaticamente.',
  exportTitle: 'Exportar colagem', exporting: 'Exportando…', share: 'Salvar / Compartilhar', videoSoon: 'Colagens com vídeo chegam numa próxima versão.', hidden: 'oculto', locked: 'travado'
};

const SLOT_NAMES: Record<string, Record<string, string>> = {
  en: { background: 'Background', backgroundSecondary: 'Background 2', paper: 'Paper', paper3: 'Scribbles', starPrimary: 'Stars', starSecondary: 'Stars 2', doodleFill: 'Doodle fill', doodleStroke: 'Doodle line', outline: 'Outline', outlineSecondary: 'Outline 2', tint: 'Tint', tintSecondary: 'Tint light', text: 'Text', frame: 'Frame', accent: 'Accent' },
  pt: { background: 'Fundo', backgroundSecondary: 'Fundo 2', paper: 'Papel', paper3: 'Rabiscos', starPrimary: 'Estrelas', starSecondary: 'Estrelas 2', doodleFill: 'Preenchimento', doodleStroke: 'Traço', outline: 'Contorno', outlineSecondary: 'Contorno 2', tint: 'Tom', tintSecondary: 'Tom claro', text: 'Texto', frame: 'Moldura', accent: 'Destaque' }
};

export function collageStrings(lang: string): CollageStrings {
  return lang === 'pt' ? pt : en;
}

export function slotName(lang: string, slot: string): string {
  return SLOT_NAMES[lang]?.[slot] ?? SLOT_NAMES.en[slot] ?? slot;
}
