/**
 * Collage UI strings. English and Portuguese are complete; other languages
 * fall back to English, the same rule the rest of ReyCam uses.
 * The language comes from the app (automatic detection or the user's choice).
 */
const en = {
  title: 'Collage', cardSub: 'Cutout, stickers, doodles and paper', templates: 'Templates', mine: 'My Collages', all: 'All',
  tagStars: 'Stars', tagBooth: 'Booth', tagPaper: 'Paper', tagDoodle: 'Doodle', tagDesktop: 'Retro Desktop', tagDuo: 'Duo', tagComic: 'Comic', tagScrapbook: 'Scrapbook', tagHalftone: 'Halftone', tagNature: 'Nature',
  pickPhoto: 'Pick a photo', pickPhotos: 'Pick up to {n} photos', pickHint: 'Gallery, camera or computer. Extra photos are optional, the first one is reused.', photoN: 'Photo', useSame: 'Use the same photo',
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
  exportTitle: 'Export collage', exporting: 'Exporting…', share: 'Save / Share', videoSoon: 'Video collages are coming in a next version.', hidden: 'hidden', locked: 'locked',
  // second template set: tools
  tools: 'Tools', headsTool: 'Color heads', bubbleTool: 'Comic bubble', tornTool: 'Torn page', sketchTool: 'Sketch lines', scribbleTool: 'Scribble fill', censorTool: 'Censor bar',
  cropTool: 'Crop window', patchworkTool: 'Patchwork', threadTool: 'Thread', layoutTool: 'Photo layout', boxesTool: 'Focus boxes', cameraTool: 'Camera screen', windowTool: 'Retro window',
  taskbarTool: 'Taskbar', liquidTool: 'Liquid lines', wavesTool: 'Waves', raysTool: 'Sun rays', titleTool: 'Title', labelTool: 'Label', tapeTool: 'Tape', boltTool: 'Bolt', exclaimTool: 'Exclamation',
  spikyTool: 'Spikes', sunTool: 'Sun doodle', checkerTool: 'Checker', splatTool: 'Splat', squiggleTool: 'Squiggle', crossTool: 'X mark', ovalTool: 'Circle mark', crownTool: 'Crown', loopTool: 'Loops', cornersTool: 'Viewfinder',
  stickersFelt: 'Felt kit', stickersNature: 'Nature cutouts', stickersPack: 'Sticker pack', stickerHint: 'Tap a sticker to add it. Select it to change its colors.',
  spikes: 'Spikes', randomness: 'Randomness', density: 'Density', padding: 'Clear area', hatch: 'Hatching', print: 'Print', patches: 'Patches', share2: 'Filled', rows: 'Rows', cols: 'Columns',
  gutter: 'Gutter', border: 'Border', torn: 'Torn edges', roughness: 'Roughness', scanlines: 'Scanlines', rounded: 'Rounded', pointerOn: 'Pointer', amp: 'Wave', length: 'Length',
  edge: 'Cut edge', neon: 'Neon outline', squareSize: 'Square size', face: 'Face', offsetX: 'Offset X', offsetY: 'Offset Y', levels: 'Levels', glow: 'Glow', dashed: 'Stitched', word: 'Word',
  title2: 'Title', message: 'Message', layoutGrid: 'Grid', layoutStrips: 'Strips', layoutContact: 'Contact', layoutFilm: 'Film', focusOn: 'Focus on',
  anchorNone: 'Center', anchorFace: 'Face', anchorEyes: 'Eyes', anchorMouth: 'Mouth', anchorHands: 'Hands', anchorFeet: 'Feet', anchorBody: 'Body', shapeSparkle: 'Sparkle', shapeHeart: 'Heart',
  treatNegative: 'Negative', treatPoster: 'Posterize', treatInvert: 'Invert', treatGrade: 'Color grade', treatPaint: 'Paint over', schemeNeon: 'Neon', schemeOcean: 'Ocean', schemeSunset: 'Sunset',
  bgQuilt: 'Felt quilt', bgComic: 'Comic page', bgGhost: 'Ghost repeat', bgSunburst: 'Sunburst', bgTorn: 'Torn poster', bgJournal: 'Journal pages',
  texCrumpled: 'Crumpled', texNotebook: 'Notebook', texNewsprint: 'Newsprint', texCanvas: 'Canvas', texOil: 'Oil paint',
  fontBrush: 'Brush', fontTypewriter: 'Typewriter', fontDisplay: 'Display', textBg: 'Paper', bgStrip: 'Strip', bgTag: 'Tag', bgTape: 'Tape', outlineText: 'Outline',
  clippings: 'Clippings', castShadow: 'Cast shadow', photos: 'photos', more: 'More',
  defaultBubble: 'WOW!', defaultTitle: 'TITLE', defaultLabel: 'label',
  // third template set and filter pairing
  filter: 'Filter', filterAsk: 'Do you want to use a filter too?', filterRecommended: 'Use recommended filter', filterOther: 'Choose another filter', filterNone: 'No filter',
  filterSoon: 'The recommended filter arrives with the Lu filters. You can pick another one now.', intensity: 'Intensity',
  stickersCraft: 'Craft and Y2K', slicesTool: 'Photo slices', leakTool: 'Light leak', grungeTool: 'Grunge paint', mosaicTool: 'Face mosaic', ornamentTool: 'Ornament',
  dotOrnamentTool: 'Dot ornament', lineOrnamentTool: 'Line ornament', punchTool: 'Punch out', ovalPanelTool: 'Oval window', thresholdTool: 'Torn ink patch', frostTool: 'Frosted glass',
  faceDoodleTool: 'Face doodles', playbackTool: 'Camera screen', compactTool: 'Compact camera', swatchTool: 'Color card', gridTool: 'Camera grid', spiralTool: 'Double spiral',
  barcodeMode: 'Barcode', tilesMode: 'Pixel tiles', shardsMode: 'Shards', removed: 'Removed', shift: 'Shift', confetti: 'Confetti', motif: 'Motif', motifFloral: 'Floral',
  clover: 'Clover', lily: 'Lily', bouquet: 'Bouquet', squareDots: 'Square dots'
};

export type CollageStrings = typeof en;

const pt: CollageStrings = {
  title: 'Colagem', cardSub: 'Recorte, adesivos, rabiscos e papel', templates: 'Modelos', mine: 'Minhas Colagens', all: 'Todos',
  tagStars: 'Estrelas', tagBooth: 'Cabine', tagPaper: 'Papel', tagDoodle: 'Rabisco', tagDesktop: 'Desktop Retrô', tagDuo: 'Dupla', tagComic: 'Quadrinhos', tagScrapbook: 'Scrapbook', tagHalftone: 'Retícula', tagNature: 'Natureza',
  pickPhoto: 'Escolha uma foto', pickPhotos: 'Escolha até {n} fotos', pickHint: 'Galeria, câmera ou computador. As fotos extras são opcionais, a primeira é reutilizada.', photoN: 'Foto', useSame: 'Usar a mesma foto',
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
  exportTitle: 'Exportar colagem', exporting: 'Exportando…', share: 'Salvar / Compartilhar', videoSoon: 'Colagens com vídeo chegam numa próxima versão.', hidden: 'oculto', locked: 'travado',
  tools: 'Ferramentas', headsTool: 'Cabeças coloridas', bubbleTool: 'Balão de HQ', tornTool: 'Página rasgada', sketchTool: 'Traços de desenho', scribbleTool: 'Preencher com rabisco', censorTool: 'Tarja',
  cropTool: 'Janela de recorte', patchworkTool: 'Retalhos', threadTool: 'Linha', layoutTool: 'Grade de fotos', boxesTool: 'Caixas de foco', cameraTool: 'Tela de câmera', windowTool: 'Janela retrô',
  taskbarTool: 'Barra de tarefas', liquidTool: 'Linhas líquidas', wavesTool: 'Ondas', raysTool: 'Raios de sol', titleTool: 'Título', labelTool: 'Etiqueta', tapeTool: 'Fita', boltTool: 'Raio', exclaimTool: 'Exclamação',
  spikyTool: 'Espinhos', sunTool: 'Sol rabiscado', checkerTool: 'Xadrez', splatTool: 'Respingo', squiggleTool: 'Rabisco ondulado', crossTool: 'Marca X', ovalTool: 'Círculo', crownTool: 'Coroa', loopTool: 'Laçadas', cornersTool: 'Visor',
  stickersFelt: 'Kit de feltro', stickersNature: 'Recortes da natureza', stickersPack: 'Pacote de adesivos', stickerHint: 'Toque num adesivo para adicionar. Selecione para mudar as cores.',
  spikes: 'Pontas', randomness: 'Irregularidade', density: 'Densidade', padding: 'Área livre', hatch: 'Hachura', print: 'Impressão', patches: 'Retalhos', share2: 'Preenchidos', rows: 'Linhas', cols: 'Colunas',
  gutter: 'Espaço', border: 'Borda', torn: 'Bordas rasgadas', roughness: 'Aspereza', scanlines: 'Linhas de tela', rounded: 'Arredondado', pointerOn: 'Ponteiro', amp: 'Onda', length: 'Comprimento',
  edge: 'Borda de recorte', neon: 'Contorno neon', squareSize: 'Tamanho do quadrado', face: 'Rosto', offsetX: 'Deslocar X', offsetY: 'Deslocar Y', levels: 'Níveis', glow: 'Brilho', dashed: 'Costurado', word: 'Palavra',
  title2: 'Título', message: 'Mensagem', layoutGrid: 'Grade', layoutStrips: 'Tiras', layoutContact: 'Contato', layoutFilm: 'Filme', focusOn: 'Focar em',
  anchorNone: 'Centro', anchorFace: 'Rosto', anchorEyes: 'Olhos', anchorMouth: 'Boca', anchorHands: 'Mãos', anchorFeet: 'Pés', anchorBody: 'Corpo', shapeSparkle: 'Brilho', shapeHeart: 'Coração',
  treatNegative: 'Negativo', treatPoster: 'Posterizar', treatInvert: 'Inverter', treatGrade: 'Tom de cor', treatPaint: 'Pintura', schemeNeon: 'Neon', schemeOcean: 'Oceano', schemeSunset: 'Pôr do sol',
  bgQuilt: 'Colcha de feltro', bgComic: 'Página de HQ', bgGhost: 'Repetição fantasma', bgSunburst: 'Raios', bgTorn: 'Pôster rasgado', bgJournal: 'Páginas de diário',
  texCrumpled: 'Amassado', texNotebook: 'Caderno', texNewsprint: 'Jornal', texCanvas: 'Tela', texOil: 'Tinta a óleo',
  fontBrush: 'Pincel', fontTypewriter: 'Máquina de escrever', fontDisplay: 'Destaque', textBg: 'Papel', bgStrip: 'Tira', bgTag: 'Etiqueta', bgTape: 'Fita', outlineText: 'Contorno',
  clippings: 'Recortes', castShadow: 'Sombra', photos: 'fotos', more: 'Mais',
  defaultBubble: 'UAU!', defaultTitle: 'TÍTULO', defaultLabel: 'etiqueta',
  filter: 'Filtro', filterAsk: 'Quer usar um filtro também?', filterRecommended: 'Usar filtro recomendado', filterOther: 'Escolher outro filtro', filterNone: 'Sem filtro',
  filterSoon: 'O filtro recomendado chega com os filtros Lu. Você já pode escolher outro.', intensity: 'Intensidade',
  stickersCraft: 'Artesanato e Y2K', slicesTool: 'Fatias de foto', leakTool: 'Vazamento de luz', grungeTool: 'Tinta grunge', mosaicTool: 'Mosaico de rosto', ornamentTool: 'Ornamento',
  dotOrnamentTool: 'Ornamento de pontos', lineOrnamentTool: 'Ornamento de linhas', punchTool: 'Vazado', ovalPanelTool: 'Janela oval', thresholdTool: 'Remendo de tinta', frostTool: 'Vidro fosco',
  faceDoodleTool: 'Rabiscos no rosto', playbackTool: 'Tela de câmera', compactTool: 'Câmera compacta', swatchTool: 'Cartão de cor', gridTool: 'Grade de câmera', spiralTool: 'Espiral dupla',
  barcodeMode: 'Código de barras', tilesMode: 'Pixels', shardsMode: 'Estilhaços', removed: 'Removidos', shift: 'Deslocamento', confetti: 'Confete', motif: 'Motivo', motifFloral: 'Floral',
  clover: 'Trevo', lily: 'Lírio', bouquet: 'Buquê', squareDots: 'Pontos quadrados'
};

const SLOT_NAMES: Record<string, Record<string, string>> = {
  en: { background: 'Background', backgroundSecondary: 'Background 2', paper: 'Paper', paper3: 'Scribbles', starPrimary: 'Stars', starSecondary: 'Stars 2', doodleFill: 'Doodle fill', doodleStroke: 'Doodle line', outline: 'Outline', outlineSecondary: 'Outline 2', tint: 'Tint', tintSecondary: 'Tint light', text: 'Text', frame: 'Frame', accent: 'Accent' },
  pt: { background: 'Fundo', backgroundSecondary: 'Fundo 2', paper: 'Papel', paper3: 'Rabiscos', starPrimary: 'Estrelas', starSecondary: 'Estrelas 2', doodleFill: 'Preenchimento', doodleStroke: 'Traço', outline: 'Contorno', outlineSecondary: 'Contorno 2', tint: 'Tom', tintSecondary: 'Tom claro', text: 'Texto', frame: 'Moldura', accent: 'Destaque' }
};

// Template specific slots (second template set).
Object.assign(SLOT_NAMES.en, {
  head1: 'Head square 1', head2: 'Head square 2', head3: 'Head square 3', headInk: 'Face ink', headInk3: 'Face ink 3', window: 'Window', wings: 'Wings', wings2: 'Wings 2',
  thread: 'Thread', pins: 'Pins', river: 'River', moss: 'Moss', strip1: 'Strip 1', strip2: 'Strip 2', strip3: 'Strip 3', strip4: 'Strip 4', strip5: 'Strip 5', paper2: 'Paper 2',
  patch1: 'Pattern 1', patch2: 'Pattern 2', patch3: 'Pattern 3', patch4: 'Pattern 4',
  c1: 'Color 1', c2: 'Color 2', c3: 'Color 3', c4: 'Color 4', c5: 'Color 5'
});
Object.assign(SLOT_NAMES.pt, {
  head1: 'Quadrado 1', head2: 'Quadrado 2', head3: 'Quadrado 3', headInk: 'Tinta do rosto', headInk3: 'Tinta do rosto 3', window: 'Janela', wings: 'Asas', wings2: 'Asas 2',
  thread: 'Linha', pins: 'Alfinetes', river: 'Rio', moss: 'Musgo', strip1: 'Faixa 1', strip2: 'Faixa 2', strip3: 'Faixa 3', strip4: 'Faixa 4', strip5: 'Faixa 5', paper2: 'Papel 2',
  patch1: 'Padrão 1', patch2: 'Padrão 2', patch3: 'Padrão 3', patch4: 'Padrão 4',
  c1: 'Cor 1', c2: 'Cor 2', c3: 'Cor 3', c4: 'Cor 4', c5: 'Cor 5'
});

const STICKER_NAMES: Record<string, Record<string, string>> = {
  en: {
    feltSun: 'Felt sun', feltMoon: 'Felt moon', feltCloud: 'Felt cloud', feltTree: 'Felt tree', bee: 'Bee', ladybug: 'Ladybug', snail: 'Snail', bunny: 'Bunny',
    goldfish: 'Goldfish', apple: 'Apple half', wings: 'Butterfly wings', mushroom: 'Mushroom', rock: 'Moss rock', river: 'River', tree: 'Painted tree', flower: 'Pressed flower', tulips: 'Tulip sketch',
    plushStar: 'Plush star', sequinStar: 'Sequin star', embroideredStar: 'Embroidered star', chromeStar: 'Chrome star', smileStar: 'Smiling star', starfish: 'Starfish', butterfly: 'Butterfly', clover: 'Clover',
    glitterFlower: 'Glitter flower', cassette: 'Cassette', boombox: 'Boombox', dice: 'Dice', cap: 'Cap', headphones: 'Headphones', vinyl: 'Vinyl record', camera: 'Compact camera', cameraCard: 'Camera card',
    lips: 'Lips', pin: 'Push pin', ticket: 'Ticket', sneaker: 'Sneaker', planet: 'Planet', musicNote: 'Music note', sunglasses: 'Sunglasses', moon: 'Moon', polaroid: 'Instant photo',
    receipt: 'Receipt', phone: 'Old phone', shorts: 'Shorts', watch: 'Watch',
    glitterHeart: 'Glitter heart', chromeSwirl: 'Chrome swirl', sparkleStar: 'Sparkle star', buttonStar: 'Button star', clipStar: 'Hair clip star', balloonStar: 'Balloon star',
    quiltedStar: 'Quilted star', badge: 'Round badge', blockDab: 'Block toy dab', blockWave: 'Block toy wave', blockFall: 'Block toy falling', safetyPin: 'Safety pin',
    paperclip: 'Paper clip', bow: 'Gingham bow', cherries: 'Cherries', lily: 'Lily', keytag: 'Key tag'
  },
  pt: {
    feltSun: 'Sol de feltro', feltMoon: 'Lua de feltro', feltCloud: 'Nuvem de feltro', feltTree: 'Árvore de feltro', bee: 'Abelha', ladybug: 'Joaninha', snail: 'Caracol', bunny: 'Coelho',
    goldfish: 'Peixinho', apple: 'Meia maçã', wings: 'Asas de borboleta', mushroom: 'Cogumelo', rock: 'Pedra com musgo', river: 'Rio', tree: 'Árvore pintada', flower: 'Flor prensada', tulips: 'Esboço de tulipas',
    plushStar: 'Estrela de pelúcia', sequinStar: 'Estrela de paetê', embroideredStar: 'Estrela bordada', chromeStar: 'Estrela cromada', smileStar: 'Estrela sorridente', starfish: 'Estrela-do-mar', butterfly: 'Borboleta', clover: 'Trevo',
    glitterFlower: 'Flor com glitter', cassette: 'Fita cassete', boombox: 'Rádio', dice: 'Dado', cap: 'Boné', headphones: 'Fones', vinyl: 'Disco de vinil', camera: 'Câmera compacta', cameraCard: 'Cartão de câmera',
    lips: 'Lábios', pin: 'Tachinha', ticket: 'Ingresso', sneaker: 'Tênis', planet: 'Planeta', musicNote: 'Nota musical', sunglasses: 'Óculos de sol', moon: 'Lua', polaroid: 'Foto instantânea',
    receipt: 'Recibo', phone: 'Celular antigo', shorts: 'Shorts', watch: 'Relógio',
    glitterHeart: 'Coração com glitter', chromeSwirl: 'Espiral cromada', sparkleStar: 'Estrela brilhante', buttonStar: 'Estrela botão', clipStar: 'Estrela de presilha', balloonStar: 'Estrela balão',
    quiltedStar: 'Estrela acolchoada', badge: 'Bóton', blockDab: 'Boneco de bloco dab', blockWave: 'Boneco de bloco acenando', blockFall: 'Boneco de bloco caindo', safetyPin: 'Alfinete',
    paperclip: 'Clipe', bow: 'Laço xadrez', cherries: 'Cerejas', lily: 'Lírio', keytag: 'Chaveiro'
  }
};

export function stickerName(lang: string, art: string): string {
  return STICKER_NAMES[lang]?.[art] ?? STICKER_NAMES.en[art] ?? art;
}

export function collageStrings(lang: string): CollageStrings {
  return lang === 'pt' ? pt : en;
}

export function slotName(lang: string, slot: string): string {
  return SLOT_NAMES[lang]?.[slot] ?? SLOT_NAMES.en[slot] ?? slot;
}
