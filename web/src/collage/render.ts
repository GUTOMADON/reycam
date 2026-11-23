/**
 * Collage renderer. Draws a CollageDoc layer by layer on a 2D canvas.
 * The same function renders the live preview, the gallery thumbnails and the
 * full resolution export, so what the user sees is what they export.
 */
import type {
  BackgroundLayer, CollageDoc, CollagePhoto, DrawLayer, Layer, OutlineLayer, Palette, PatchLayer, PatternLayer,
  PhotoLayer, RibbonLayer, ShapeLayer, SubjectLayer, TextLayer, TilesLayer, Treatment, UiLayer, ZigzagLayer, Ratio
} from './types';
import { resolvePaint } from './resolve';
import { applyTexture, crayonFill, folds, grain, rng, roughenStroke, vignette } from './textures';
import { drawFrameBack, drawFrameFront, frameInsets, treatPhoto } from './treatments';
import {
  FONTS, PAINT_SWATCHES, drawBin, drawDesktopIcon, drawDialog, drawIcon, drawPaintWindow, drawPatch, drawPointer, drawTiles,
  drawToolbox, isLineShape, materialFill, materialFinish, shapePath
} from './assets';
import { hslToHex, withAlpha } from './palettes';

export const RATIOS: Record<Exclude<Ratio, 'free'>, number> = {
  '9:16': 9 / 16, '4:5': 4 / 5, '3:4': 3 / 4, '1:1': 1, '4:3': 4 / 3, '5:7': 5 / 7, '2:3': 2 / 3, '20:19': 20 / 19
};

export const aspectOf = (doc: Pick<CollageDoc, 'ratio' | 'freeAspect'>) => (doc.ratio === 'free' ? doc.freeAspect || 1 : RATIOS[doc.ratio]);

/** Canvas size for a long side in pixels. */
export function sizeFor(doc: Pick<CollageDoc, 'ratio' | 'freeAspect'>, longSide: number): [number, number] {
  const a = aspectOf(doc);
  return a >= 1 ? [longSide, Math.round(longSide / a)] : [Math.round(longSide * a), longSide];
}

export interface Box { cx: number; cy: number; w: number; h: number; rot: number }

export interface RenderInfo {
  boxes: Record<string, Box>;
  /** Paint frame palette swatches in canvas pixels, for the brush color picker. */
  swatches: { x: number; y: number; w: number; h: number; color: string }[];
  /** Weave tool tap targets in canvas pixels. */
  weaveDots: { layer: string; index: number; x: number; y: number }[];
}

export interface RenderOpts {
  time?: number;
  /** Largest photo side used for treatments (smaller for previews). */
  photoMax?: number;
  selected?: string | null;
  /** Ribbon segments are outlined so the user can tap them (Weave tool). */
  weaveFor?: string | null;
}

// Mask versions, bumped by the refine brushes so cached cutouts refresh.
const maskVersions = new WeakMap<HTMLCanvasElement, number>();
export const maskVersion = (m: HTMLCanvasElement) => maskVersions.get(m) || 0;
export function bumpMask(m: HTMLCanvasElement) { maskVersions.set(m, maskVersion(m) + 1); cutCache.clear(); }

const cutCache = new Map<string, { canvas: HTMLCanvasElement; pad: number }>();

const D2R = Math.PI / 180;

function photoFor(photos: CollagePhoto[], i: number | undefined): CollagePhoto | undefined {
  return photos[i ?? 0] || photos[0];
}

/** Source crop of a photo layer (cover crop to its aspect, with zoom). */
export function cropRect(p: CollagePhoto, layer: PhotoLayer) {
  const iw = p.image.width, ih = p.image.height;
  const A = layer.aspect ?? iw / ih;
  const z = Math.max(1, layer.zoom ?? 1);
  let sw: number, sh: number;
  if (iw / ih > A) { sh = ih / z; sw = sh * A; } else { sw = iw / z; sh = sw / A; }
  return { sx: (iw - sw) / 2, sy: (ih - sh) / 2, sw, sh, aspect: A };
}

/** Photo area of a photo layer in canvas pixels (without the frame). */
export function photoBox(layer: PhotoLayer, p: CollagePhoto | undefined, W: number, H: number): Box {
  const aspect = p ? cropRect(p, layer).aspect : 1;
  const w = layer.w * W;
  return { cx: layer.x * W, cy: layer.y * H, w, h: w / aspect, rot: layer.rot };
}

// ---------------------------------------------------------------- cutouts

interface CutStyle {
  style: 'clean' | 'sticker' | 'torn' | 'silhouette';
  outline: string;
  outlineWidth: number;
  rough: boolean;
  fill: string;
  shadow: boolean;
}

/**
 * The subject of a photo, treated and cut out at the given output width, with
 * its sticker outline. `pad` is the extra margin added around the photo area.
 */
function cutout(p: CollagePhoto, layer: PhotoLayer, treatment: Treatment | undefined, palette: Palette, outW: number, st: CutStyle, unit: number, photoMax: number) {
  const crop = cropRect(p, layer);
  const outH = Math.max(1, Math.round(outW / crop.aspect));
  const ow = Math.round(st.style === 'clean' || st.style === 'silhouette' ? 0 : st.outlineWidth * unit);
  const pad = ow + Math.round(st.shadow ? 18 * unit : 2);
  const key = [p.id, maskVersion(p.mask), JSON.stringify(treatment), Math.round(outW / 8), JSON.stringify(st), crop.sx | 0, crop.sy | 0, crop.sw | 0, photoMax, treatment ? JSON.stringify(palette) : ''].join('|');
  const hit = cutCache.get(key);
  if (hit) return hit;

  const treated = treatPhoto(p.image, p.id, treatment, palette, photoMax);
  const kx = treated.width / p.image.width;
  // subject pixels
  const subj = document.createElement('canvas');
  subj.width = outW; subj.height = outH;
  const sc = subj.getContext('2d')!;
  if (st.style === 'silhouette') {
    sc.fillStyle = st.fill;
    sc.fillRect(0, 0, outW, outH);
  } else {
    sc.drawImage(treated, crop.sx * kx, crop.sy * kx, crop.sw * kx, crop.sh * kx, 0, 0, outW, outH);
  }
  sc.globalCompositeOperation = 'destination-in';
  sc.drawImage(p.mask, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, outW, outH);

  const out = document.createElement('canvas');
  out.width = outW + pad * 2; out.height = outH + pad * 2;
  const oc = out.getContext('2d')!;
  if (ow > 0) {
    // Dilate the mask by drawing it around a circle, then tint it.
    const sil = document.createElement('canvas');
    sil.width = out.width; sil.height = out.height;
    const sl = sil.getContext('2d')!;
    const r = rng(7);
    const steps = 28;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const rad = ow * (st.rough ? 0.78 + r() * 0.44 : 1);
      sl.drawImage(p.mask, crop.sx, crop.sy, crop.sw, crop.sh, pad + Math.cos(a) * rad, pad + Math.sin(a) * rad, outW, outH);
    }
    sl.drawImage(p.mask, crop.sx, crop.sy, crop.sw, crop.sh, pad, pad, outW, outH);
    sl.globalCompositeOperation = 'source-in';
    sl.fillStyle = st.outline;
    sl.fillRect(0, 0, sil.width, sil.height);
    if (st.style === 'torn') {
      sl.globalCompositeOperation = 'source-atop';
      applyTexture(sl, 0, 0, sil.width, sil.height, 'kraft', unit);
    }
    if (st.shadow) { oc.shadowColor = 'rgba(0,0,0,0.38)'; oc.shadowBlur = 14 * unit; oc.shadowOffsetY = 6 * unit; }
    oc.drawImage(sil, 0, 0);
    oc.shadowColor = 'transparent';
  } else if (st.shadow) {
    oc.shadowColor = 'rgba(0,0,0,0.38)'; oc.shadowBlur = 14 * unit; oc.shadowOffsetY = 6 * unit;
  }
  oc.drawImage(subj, pad, pad);
  const res = { canvas: out, pad };
  if (cutCache.size > 24) cutCache.delete(cutCache.keys().next().value as string);
  cutCache.set(key, res);
  return res;
}

/** Draw the subject mask of a photo layer (alpha only), used to hide things behind the person. */
function drawSubjectMask(ctx: CanvasRenderingContext2D, layer: PhotoLayer, p: CollagePhoto, W: number, H: number) {
  const b = photoBox(layer, p, W, H);
  const crop = cropRect(p, layer);
  ctx.save();
  ctx.translate(b.cx, b.cy);
  ctx.rotate(b.rot * D2R);
  if (layer.flip) ctx.scale(-1, 1);
  ctx.drawImage(p.mask, crop.sx, crop.sy, crop.sw, crop.sh, -b.w / 2, -b.h / 2, b.w, b.h);
  ctx.restore();
}

// ---------------------------------------------------------------- main

export function renderCollage(ctx: CanvasRenderingContext2D, doc: CollageDoc, photos: CollagePhoto[], W: number, H: number, opts: RenderOpts = {}): RenderInfo {
  const unit = W / 1080;
  const pal = doc.palette;
  const t = opts.time ?? 0;
  const photoMax = opts.photoMax ?? 2400;
  const info: RenderInfo = { boxes: {}, swatches: [], weaveDots: [] };
  const byId = new Map(doc.layers.map((l) => [l.id, l]));
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  for (const layer of doc.layers) {
    if (layer.hidden) continue;
    const behindOf = layer.behind ? (byId.get(layer.behind) as PhotoLayer | undefined) : undefined;
    const behindPhoto = behindOf ? photoFor(photos, behindOf.photo) : undefined;
    if (behindOf && behindPhoto && layer.kind !== 'ribbon') {
      // Draw on its own canvas, then cut the person out of it.
      const off = document.createElement('canvas');
      off.width = W; off.height = H;
      const oc = off.getContext('2d')!;
      drawLayer(oc, layer);
      oc.globalCompositeOperation = 'destination-out';
      drawSubjectMask(oc, behindOf, behindPhoto, W, H);
      ctx.drawImage(off, 0, 0);
    } else {
      drawLayer(ctx, layer);
    }
  }

  if (doc.finish === 'film') finishFilm(ctx, W, H);
  if (doc.dateStamp) drawDateStamp(ctx, W, H, unit);

  if (opts.selected && info.boxes[opts.selected]) {
    const b = info.boxes[opts.selected];
    ctx.save();
    ctx.translate(b.cx, b.cy);
    ctx.rotate(b.rot * D2R);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(1.5, 3 * unit);
    ctx.setLineDash([10 * unit, 7 * unit]);
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 4 * unit;
    ctx.strokeRect(-b.w / 2 - 6 * unit, -b.h / 2 - 6 * unit, b.w + 12 * unit, b.h + 12 * unit);
    ctx.restore();
  }
  ctx.restore();
  return info;

  // ------------------------------------------------------------ per layer

  function begin(c: CanvasRenderingContext2D, l: Layer, w: number, h: number) {
    info.boxes[l.id] = { cx: l.x * W, cy: l.y * H, w, h, rot: l.rot };
    c.save();
    c.globalAlpha = l.opacity ?? 1;
    c.translate(l.x * W, l.y * H);
    c.rotate(l.rot * D2R);
    if (l.flip) c.scale(-1, 1);
  }

  function drawLayer(c: CanvasRenderingContext2D, l: Layer) {
    switch (l.kind) {
      case 'background': return drawBackground(c, l);
      case 'photo': return drawPhoto(c, l);
      case 'subject': return drawSubject(c, l);
      case 'shape': return drawShape(c, l);
      case 'patch': return drawPatchLayer(c, l);
      case 'text': return drawText(c, l);
      case 'tiles': return drawTilesLayer(c, l);
      case 'pattern': return drawPattern(c, l);
      case 'ui': return drawUi(c, l);
      case 'ribbon': return drawRibbon(c, l);
      case 'zigzag': return drawZigzag(c, l);
      case 'outline': return drawOutline(c, l);
      case 'draw': return drawStrokes(c, l);
    }
  }

  function drawBackground(c: CanvasRenderingContext2D, l: BackgroundLayer) {
    info.boxes[l.id] = { cx: W / 2, cy: H / 2, w: W, h: H, rot: 0 };
    const c1 = resolvePaint(l.paint, pal, '#7A1F2C');
    const c2 = resolvePaint(l.paint2, pal, '#D17781');
    const c3 = resolvePaint(l.paint3, pal, '#FFFFFF');
    c.save();
    switch (l.style) {
      case 'solid':
        c.fillStyle = c1; c.fillRect(0, 0, W, H);
        applyTexture(c, 0, 0, W, H, l.texture, unit);
        break;
      case 'crayon':
        crayonFill(c, 0, 0, W, H, c1, unit, 11);
        break;
      case 'stripes': {
        c.fillStyle = c1; c.fillRect(0, 0, W, H);
        const sw = (l.stripeWidth ?? 0.08) * W;
        c.save();
        c.translate(W / 2, H / 2);
        c.rotate((l.stripeAngle ?? 0) * D2R);
        c.fillStyle = c2;
        const R = Math.hypot(W, H);
        for (let x = -R; x < R; x += sw * 2) c.fillRect(x + sw, -R, sw, R * 2);
        c.restore();
        applyTexture(c, 0, 0, W, H, l.texture, unit);
        break;
      }
      case 'split': {
        const half = H / 2;
        if (l.texture === 'crayon') { crayonFill(c, 0, 0, W, half, c1, unit, 3); crayonFill(c, 0, half, W, H - half, c2, unit, 5, 0.4); }
        else {
          c.fillStyle = c1; c.fillRect(0, 0, W, half);
          c.fillStyle = c2; c.fillRect(0, half, W, H - half);
          applyTexture(c, 0, 0, W, half, l.texture, unit);
          applyTexture(c, 0, half, W, H - half, l.texture2 ?? l.texture, unit);
        }
        break;
      }
      case 'sky': {
        c.fillStyle = c1; c.fillRect(0, 0, W, H);
        applyTexture(c, 0, 0, W, H, 'paper', unit);
        // White hand drawn scribbles.
        const r = rng(5);
        c.strokeStyle = c3; c.lineCap = 'round'; c.lineJoin = 'round';
        for (let i = 0; i < 9; i++) {
          c.lineWidth = (5 + r() * 6) * unit;
          const cx = r() * W, cy = r() * H * (l.folds === 'middle' ? 0.5 : 1), s = (60 + r() * 120) * unit;
          c.beginPath();
          for (let k = 0; k <= 40; k++) {
            const a = (k / 40) * Math.PI * 4 + r() * 0.2;
            const px = cx + Math.cos(a) * s * (0.6 + k / 60) + k * 3 * unit, py = cy + Math.sin(a) * s * 0.45;
            k ? c.lineTo(px, py) : c.moveTo(px, py);
          }
          c.stroke();
        }
        break;
      }
      case 'desktop':
      case 'desktop3d': {
        const glossy = l.style === 'desktop3d';
        const sky = c.createLinearGradient(0, 0, 0, H * 0.7);
        sky.addColorStop(0, c1);
        sky.addColorStop(1, glossy ? hslLight(c1, 0.25) : hslLight(c1, 0.3));
        c.fillStyle = sky; c.fillRect(0, 0, W, H);
        // clouds
        const r = rng(9);
        c.fillStyle = withAlpha(c3, glossy ? 0.95 : 0.85);
        for (let i = 0; i < 7; i++) {
          const cx = r() * W, cy = H * (0.08 + r() * 0.35), s = (70 + r() * 110) * unit;
          for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(cx + (k - 2) * s * 0.45, cy + Math.sin(k * 1.7) * s * 0.12, s * 0.42, s * 0.28, 0, 0, Math.PI * 2); c.fill(); }
        }
        // grass hill
        const g = c.createLinearGradient(0, H * 0.55, 0, H);
        g.addColorStop(0, hslLight(c2, 0.12)); g.addColorStop(1, hslLight(c2, -0.12));
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(0, H * 0.68);
        c.bezierCurveTo(W * 0.3, H * 0.56, W * 0.7, H * 0.6, W, H * 0.66);
        c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
        if (glossy) {
          const sh = c.createLinearGradient(0, 0, 0, H);
          sh.addColorStop(0, 'rgba(255,255,255,0.25)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)');
          c.fillStyle = sh; c.fillRect(0, 0, W, H);
        } else {
          c.fillStyle = 'rgba(255,240,220,0.12)'; c.fillRect(0, 0, W, H);
        }
        break;
      }
      case 'photo': {
        const p = photoFor(photos, l.photo);
        c.fillStyle = c1; c.fillRect(0, 0, W, H);
        if (p) {
          const img = treatPhoto(p.image, p.id, l.bw ? { type: 'bw', contrast: 1.1, grain: 0 } : undefined, pal, Math.min(photoMax, 1600));
          const k = Math.max(W / img.width, H / img.height);
          if (l.blur) c.filter = `blur(${l.blur * unit}px)`;
          c.drawImage(img, (W - img.width * k) / 2, (H - img.height * k) / 2, img.width * k, img.height * k);
          c.filter = 'none';
        }
        break;
      }
    }
    if (l.folds && l.folds !== 'none') folds(c, 0, 0, W, H, l.folds, unit);
    c.restore();
  }

  function drawPhoto(c: CanvasRenderingContext2D, l: PhotoLayer) {
    const p = photoFor(photos, l.photo);
    if (!p) return;
    const b = photoBox(l, p, W, H);
    const ins = frameInsets(l.frame, l.frameMargin);
    begin(c, l, b.w * (1 + ins.l + ins.r), b.h + b.w * (ins.t + ins.b));
    const x = -b.w / 2, y = -b.h / 2;
    if (l.cutout === 'none' || l.cutout === 'window') {
      const shiftY = (ins.t - ins.b) * b.w / 2;
      c.translate(0, shiftY);
      drawFrameBack(c, l.frame, x, y, b.w, b.h, resolvePaint(l.framePaint, pal, '#111111'), unit, !!l.shadow, l.frameMargin);
      const treated = treatPhoto(p.image, p.id, l.treatment, pal, photoMax);
      const crop = cropRect(p, l);
      const kx = treated.width / p.image.width;
      c.save();
      if (l.cutout === 'window') {
        shapePath(c, l.windowShape === 'burst' ? 'burst' : l.windowShape === 'rounded' ? 'rect' : 'star5', b.w, { h: b.h / b.w });
        c.clip();
      }
      c.drawImage(treated, crop.sx * kx, crop.sy * kx, crop.sw * kx, crop.sh * kx, x, y, b.w, b.h);
      c.restore();
      drawFrameFront(c, l.frame, x, y, b.w, b.h, unit, 3);
    } else {
      const st: CutStyle = {
        style: l.cutout as CutStyle['style'],
        outline: resolvePaint(l.outline, pal, '#FFFFFF'),
        outlineWidth: l.cutout === 'sticker' || l.cutout === 'torn' ? l.outlineWidth ?? 18 : 0,
        rough: !!l.roughEdge || l.cutout === 'torn',
        fill: resolvePaint(l.fill, pal, '#D9EDF6'),
        shadow: !!l.shadow
      };
      const cut = cutout(p, l, l.treatment, pal, Math.round(b.w), st, unit, photoMax);
      const k = b.w / (cut.canvas.width - cut.pad * 2);
      c.drawImage(cut.canvas, x - cut.pad * k, y - cut.pad * k, cut.canvas.width * k, cut.canvas.height * k);
    }
    c.restore();
  }

  function drawSubject(c: CanvasRenderingContext2D, l: SubjectLayer) {
    const of = byId.get(l.of) as PhotoLayer | undefined;
    if (!of) return;
    const p = photoFor(photos, of.photo);
    if (!p) return;
    const b = photoBox(of, p, W, H);
    c.save();
    c.globalAlpha = l.opacity ?? 1;
    c.translate(b.cx, b.cy);
    c.rotate(b.rot * D2R);
    if (of.flip) c.scale(-1, 1);
    const ins = frameInsets(of.frame, of.frameMargin);
    c.translate(0, (ins.t - ins.b) * b.w / 2);
    const st: CutStyle = {
      style: l.cutout,
      outline: resolvePaint(l.outline, pal, '#FFFFFF'),
      outlineWidth: l.cutout === 'sticker' || l.cutout === 'torn' ? l.outlineWidth ?? 14 : 0,
      rough: !!l.roughEdge || l.cutout === 'torn',
      fill: resolvePaint(l.fill, pal, '#D9EDF6'),
      shadow: !!l.shadow
    };
    const cut = cutout(p, of, l.treatment ?? of.treatment, pal, Math.round(b.w), st, unit, photoMax);
    const k = b.w / (cut.canvas.width - cut.pad * 2);
    c.drawImage(cut.canvas, -b.w / 2 - cut.pad * k, -b.h / 2 - cut.pad * k, cut.canvas.width * k, cut.canvas.height * k);
    c.restore();
  }

  function drawShape(c: CanvasRenderingContext2D, l: ShapeLayer) {
    const size = l.w * W;
    const h = size * (l.h ?? 1);
    begin(c, l, size, h);
    if (l.blend) c.globalCompositeOperation = l.blend;
    const opts = { points: l.points, wobble: l.wobble, rounded: l.rounded, seed: l.seed, h: l.h };
    const fillCol = l.fill === null ? null : resolvePaint(l.fill, pal, '#F5C518');
    const strokeCol = l.stroke ? resolvePaint(l.stroke, pal, '#D21F1F') : null;
    const material = l.material ?? 'flat';
    const tex = l.texture ?? 'none';
    const rough = tex === 'crayon' || tex === 'chalk' || tex === 'pencil';
    let target = c;
    let off: HTMLCanvasElement | null = null;
    const pad = size * 0.3 + (l.strokeWidth ?? 0) * unit * 2;
    if (rough) {
      off = document.createElement('canvas');
      off.width = Math.ceil(size + pad * 2); off.height = Math.ceil(h + pad * 2);
      target = off.getContext('2d')!;
      target.translate(off.width / 2, off.height / 2);
    }
    if (material === 'puffy' || (tex === 'paper' && fillCol)) {
      target.shadowColor = 'rgba(0,0,0,0.3)';
      target.shadowBlur = size * 0.06;
      target.shadowOffsetY = size * 0.03;
    }
    if (fillCol && !isLineShape(l.shape)) {
      shapePath(target, l.shape, size, opts);
      target.fillStyle = materialFill(target, material, fillCol, size, t, l.seed ?? 1);
      target.fill();
      target.shadowColor = 'transparent';
      if (material !== 'flat') { shapePath(target, l.shape, size, opts); materialFinish(target, material, size); }
      if (tex === 'paper') { target.save(); shapePath(target, l.shape, size, opts); target.clip(); applyTexture(target, -size, -h, size * 2, h * 2, 'paper', unit); target.restore(); }
    }
    target.shadowColor = 'transparent';
    if (strokeCol || isLineShape(l.shape)) {
      target.save();
      const o = (l.offset ?? 0) * size;
      target.translate(o, -o * 0.6);
      shapePath(target, l.shape, size, opts);
      target.strokeStyle = strokeCol || fillCol || '#000';
      target.lineWidth = (l.strokeWidth ?? 6) * unit;
      target.lineJoin = 'round';
      target.lineCap = 'round';
      if (tex === 'marker') target.globalAlpha *= 0.92;
      target.stroke();
      target.restore();
    }
    if (off) {
      roughenStroke(target, off.width, off.height, tex, unit);
      c.drawImage(off, -off.width / 2, -off.height / 2);
    }
    c.restore();
  }

  function drawPatchLayer(c: CanvasRenderingContext2D, l: PatchLayer) {
    const size = l.w * W;
    begin(c, l, size, size);
    drawPatch(c, l.shape, l.pattern, resolvePaint(l.paint, pal, '#F28CC0'), resolvePaint(l.paint2, pal, '#FFFFFF'), size, unit, l.seed ?? 1);
    c.restore();
  }

  function drawText(c: CanvasRenderingContext2D, l: TextLayer) {
    const fs = l.size * W;
    c.save();
    c.font = `${l.font === 'pixel' ? 400 : 700} ${fs}px ${FONTS[l.font]}`;
    const lines = l.text.split('\n');
    const tw = Math.max(...lines.map((s) => c.measureText(s).width), fs);
    c.restore();
    begin(c, l, tw, fs * 1.2 * lines.length);
    c.font = `${l.font === 'pixel' ? 400 : 700} ${fs}px ${FONTS[l.font]}`;
    c.fillStyle = resolvePaint(l.paint, pal, '#FFFFFF');
    c.textAlign = l.align ?? 'center';
    c.textBaseline = 'middle';
    const ax = c.textAlign === 'left' ? -tw / 2 : c.textAlign === 'right' ? tw / 2 : 0;
    lines.forEach((s, i) => c.fillText(s, ax, (i - (lines.length - 1) / 2) * fs * 1.2));
    c.restore();
  }

  function drawTilesLayer(c: CanvasRenderingContext2D, l: TilesLayer) {
    const size = l.w * W;
    const th = (size / Math.max(1, [...l.text].length)) * 1.15;
    begin(c, l, size, th);
    drawTiles(c, l.text, l.tiles.map((p) => resolvePaint(p, pal, '#F3E9D8')), l.letters.map((p) => resolvePaint(p, pal, '#B3172D')), size, l.seed ?? 3);
    c.restore();
  }

  function drawPattern(c: CanvasRenderingContext2D, l: PatternLayer) {
    const w = l.w * W, h = l.h * H;
    begin(c, l, w, h);
    c.beginPath(); c.rect(-w / 2, -h / 2, w, h); c.clip();
    const rowH = h / l.rows;
    const fs = rowH * 0.95;
    c.font = `700 ${fs}px ${FONTS.marker}`;
    c.fillStyle = resolvePaint(l.paint, pal, '#C8322B');
    c.textBaseline = 'middle';
    const r = rng(17);
    const word = l.word || 'LOVE';
    for (let i = 0; i < l.rows; i++) {
      let x = -w / 2 - (i % 2) * fs;
      const y = -h / 2 + rowH * (i + 0.5);
      while (x < w / 2) {
        c.save();
        c.translate(x, y + (r() - 0.5) * rowH * 0.1);
        c.rotate((r() - 0.5) * 0.08);
        c.scale(0.85 + r() * 0.15, 1);
        c.fillText(word, 0, 0);
        const ww = c.measureText(word).width;
        c.restore();
        x += ww * 0.92 + fs * 0.25;
      }
    }
    c.restore();
  }

  function drawUi(c: CanvasRenderingContext2D, l: UiLayer) {
    const w = l.w * W;
    const h = (l.h ?? 0.3) * H;
    const accent = resolvePaint(l.paint2, pal, '#5B8DEF');
    const bar = resolvePaint(l.paint, pal, '#2A3F8F');
    const style = l.style ?? 'flat';
    switch (l.widget) {
      case 'dialog':
        begin(c, l, w, h);
        drawDialog(c, w, h, { title: l.title ?? '', message: l.message ?? '', buttons: l.buttons ?? [], icon: l.icon ?? 'trash', bar, style, font: FONTS.pixel, unit, text: resolvePaint(l.text, pal, '#111111') });
        break;
      case 'icon':
      case 'file':
        begin(c, l, w, w * 1.1);
        c.translate(0, -w * 0.18);
        drawDesktopIcon(c, l.icon ?? 'folder', l.label ?? '', w * 0.62, accent, FONTS.pixel, style, resolvePaint(l.text, pal, '#FFFFFF'));
        break;
      case 'pointer':
        begin(c, l, w, w * 0.9);
        c.translate(-w * 0.3, -w * 0.45);
        drawPointer(c, w);
        break;
      case 'selection':
        begin(c, l, w, h);
        c.strokeStyle = bar;
        c.lineWidth = 3 * unit;
        c.fillStyle = withAlpha(bar, 0.08);
        c.fillRect(-w / 2, -h / 2, w, h);
        c.strokeRect(-w / 2, -h / 2, w, h);
        break;
      case 'toolbox':
        begin(c, l, w, h);
        drawToolbox(c, w, h, accent, style);
        break;
      case 'bin':
        begin(c, l, w, w);
        drawBin(c, w, accent);
        break;
      case 'folder':
        begin(c, l, w, w * 1.1);
        c.translate(0, -w * 0.18);
        drawDesktopIcon(c, 'zip', l.label ?? '.zip', w * 0.7, accent, FONTS.pixel, style);
        break;
      case 'paint': {
        info.boxes[l.id] = { cx: l.x * W, cy: l.y * H, w, h, rot: 0 };
        c.save();
        c.translate(l.x * W - w / 2, l.y * H - h / 2);
        const res = drawPaintWindow(c, w, h, { title: l.title ?? '', status: l.message ?? '', face: resolvePaint(l.paint, pal, '#C0C0C0'), bar: accent, font: FONTS.pixel, swatches: PAINT_SWATCHES });
        const p = photoFor(photos, 0);
        if (p) {
          const img = treatPhoto(p.image, p.id, undefined, pal, photoMax);
          const k = Math.max(res.canvas.w / img.width, res.canvas.h / img.height);
          c.save();
          c.beginPath(); c.rect(res.canvas.x, res.canvas.y, res.canvas.w, res.canvas.h); c.clip();
          c.drawImage(img, res.canvas.x + (res.canvas.w - img.width * k) / 2, res.canvas.y + (res.canvas.h - img.height * k) / 2, img.width * k, img.height * k);
          c.restore();
        }
        info.swatches = res.swatches.map((s) => ({ ...s, x: s.x + l.x * W - w / 2, y: s.y + l.y * H - h / 2 }));
        void drawIcon;
        break;
      }
    }
    c.restore();
  }

  function ribbonPath(l: RibbonLayer, w: number, h: number) {
    // Catmull-Rom through the points, sampled per segment.
    const pts = l.points.map(([px, py]) => [(px - 0.5) * w, (py - 0.5) * h] as [number, number]);
    const segs: [number, number][][] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const seg: [number, number][] = [];
      for (let k = 0; k <= 16; k++) {
        const s = k / 16, s2 = s * s, s3 = s2 * s;
        seg.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * s + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * s2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * s3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * s + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * s2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * s3)
        ]);
      }
      segs.push(seg);
    }
    return segs;
  }

  function drawRibbon(c: CanvasRenderingContext2D, l: RibbonLayer) {
    const w = l.w * W, h = l.h * H;
    info.boxes[l.id] = { cx: l.x * W, cy: l.y * H, w, h, rot: l.rot };
    const segs = ribbonPath(l, w, h);
    const col = resolvePaint(l.paint, pal, '#D9773F');
    const of = l.of ? (byId.get(l.of) as PhotoLayer | undefined) : undefined;
    const p = of ? photoFor(photos, of.photo) : undefined;
    const paintSegs = (target: CanvasRenderingContext2D, behind: boolean) => {
      target.save();
      target.translate(l.x * W, l.y * H);
      target.rotate(l.rot * D2R);
      if (l.flip) target.scale(-1, 1);
      target.strokeStyle = col;
      target.lineWidth = l.width * unit;
      target.lineCap = 'round';
      target.lineJoin = 'round';
      segs.forEach((seg, i) => {
        if (!!l.weave[i] !== behind) return;
        target.beginPath();
        seg.forEach(([x, y], k) => (k ? target.lineTo(x, y) : target.moveTo(x, y)));
        target.stroke();
      });
      target.restore();
    };
    for (const behind of [true, false]) {
      const off = document.createElement('canvas');
      off.width = W; off.height = H;
      const oc = off.getContext('2d')!;
      paintSegs(oc, behind);
      roughenStroke(oc, W, H, l.texture, unit);
      if (behind && of && p) { oc.globalCompositeOperation = 'destination-out'; drawSubjectMask(oc, of, p, W, H); }
      c.save();
      c.globalAlpha = l.opacity ?? 1;
      c.drawImage(off, 0, 0);
      c.restore();
    }
    if (opts.weaveFor === l.id) {
      c.save();
      c.translate(l.x * W, l.y * H);
      c.rotate(l.rot * D2R);
      segs.forEach((seg, i) => {
        const [mx, my] = seg[8];
        c.fillStyle = l.weave[i] ? 'rgba(20,20,20,0.85)' : 'rgba(255,255,255,0.95)';
        c.strokeStyle = l.weave[i] ? '#FFFFFF' : '#111111';
        c.lineWidth = 2 * unit;
        c.beginPath(); c.arc(mx, my, 16 * unit, 0, Math.PI * 2); c.fill(); c.stroke();
        const cs = Math.cos(l.rot * D2R), sn = Math.sin(l.rot * D2R);
        info.weaveDots.push({ layer: l.id, index: i, x: l.x * W + mx * cs - my * sn, y: l.y * H + mx * sn + my * cs });
      });
      c.restore();
    }
  }

  function drawZigzag(c: CanvasRenderingContext2D, l: ZigzagLayer) {
    const w = l.w * W, h = l.h * H;
    info.boxes[l.id] = { cx: l.x * W, cy: l.y * H, w, h, rot: l.rot };
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const oc = off.getContext('2d')!;
    oc.translate(l.x * W, l.y * H);
    oc.rotate(l.rot * D2R);
    oc.strokeStyle = resolvePaint(l.paint, pal, '#1F9A8F');
    oc.lineWidth = l.width * unit;
    oc.lineJoin = 'miter';
    oc.lineCap = 'round';
    const maxR = Math.max(w, h);
    for (let i = 0; i < l.count; i++) {
      const rad = maxR * (0.25 + (i / Math.max(1, l.count - 1)) * 0.75) * 0.5;
      const teeth = 10 + i * 4, amp = rad * 0.08;
      oc.beginPath();
      for (let k = 0; k <= teeth * 2; k++) {
        const a = Math.PI + (k / (teeth * 2)) * Math.PI;
        const rr = rad + (k % 2 ? amp : -amp);
        const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
        k ? oc.lineTo(x, y) : oc.moveTo(x, y);
      }
      oc.stroke();
    }
    roughenStroke(oc, W, H, l.texture, unit);
    c.save();
    c.globalAlpha = l.opacity ?? 1;
    c.drawImage(off, 0, 0);
    c.restore();
  }

  function drawOutline(c: CanvasRenderingContext2D, l: OutlineLayer) {
    const of = byId.get(l.of) as PhotoLayer | undefined;
    if (!of) return;
    const p = photoFor(photos, of.photo);
    if (!p) return;
    const b = photoBox(of, p, W, H);
    info.boxes[l.id] = { ...b };
    const crop = cropRect(p, of);
    const d = l.distance * unit, lw = l.width * unit;
    const pad = Math.ceil(d + lw + 10);
    const mk = (rad: number, seed: number) => {
      const m = document.createElement('canvas');
      m.width = Math.ceil(b.w) + pad * 2; m.height = Math.ceil(b.h) + pad * 2;
      const mc = m.getContext('2d')!;
      const r = rng(seed);
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2, rr = rad * (0.85 + r() * 0.3);
        mc.drawImage(p.mask, crop.sx, crop.sy, crop.sw, crop.sh, pad + Math.cos(a) * rr, pad + Math.sin(a) * rr, b.w, b.h);
      }
      return m;
    };
    const outer = mk(d + lw, 3);
    const oc = outer.getContext('2d')!;
    oc.globalCompositeOperation = 'destination-out';
    oc.drawImage(mk(d, 4), 0, 0);
    oc.globalCompositeOperation = 'source-in';
    oc.fillStyle = resolvePaint(l.paint, pal, '#F2C230');
    oc.fillRect(0, 0, outer.width, outer.height);
    oc.globalCompositeOperation = 'source-over';
    roughenStroke(oc, outer.width, outer.height, l.texture, unit);
    c.save();
    c.globalAlpha = l.opacity ?? 1;
    c.translate(b.cx, b.cy);
    c.rotate(b.rot * D2R);
    c.drawImage(outer, -b.w / 2 - pad, -b.h / 2 - pad);
    c.restore();
  }

  function drawStrokes(c: CanvasRenderingContext2D, l: DrawLayer) {
    info.boxes[l.id] = { cx: W / 2, cy: H / 2, w: W, h: H, rot: 0 };
    if (!l.strokes.length) return;
    const groups: Record<string, typeof l.strokes> = {};
    l.strokes.forEach((s) => { (groups[s.brush] ||= []).push(s); });
    for (const [brush, strokes] of Object.entries(groups)) {
      const off = document.createElement('canvas');
      off.width = W; off.height = H;
      const oc = off.getContext('2d')!;
      oc.lineCap = 'round'; oc.lineJoin = 'round';
      for (const s of strokes) {
        oc.strokeStyle = s.color;
        oc.globalAlpha = brush === 'marker' ? 0.9 : 1;
        for (let i = 1; i < s.pts.length; i++) {
          const [x0, y0, w0] = s.pts[i - 1], [x1, y1, w1] = s.pts[i];
          oc.lineWidth = s.width * unit * ((w0 + w1) / 2);
          oc.beginPath(); oc.moveTo(x0 * W, y0 * H); oc.lineTo(x1 * W, y1 * H); oc.stroke();
        }
        if (s.pts.length === 1) { oc.fillStyle = s.color; oc.beginPath(); oc.arc(s.pts[0][0] * W, s.pts[0][1] * H, s.width * unit / 2, 0, Math.PI * 2); oc.fill(); }
      }
      roughenStroke(oc, W, H, brush as 'crayon', unit);
      c.save();
      c.globalAlpha = l.opacity ?? 1;
      c.drawImage(off, 0, 0);
      c.restore();
    }
  }
}

function hslLight(hex: string, d: number) {
  const n = parseInt(hex.slice(1, 7), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const dd = max - min;
    s = l > 0.5 ? dd / (2 - max - min) : dd / (max + min);
    const rr = r / 255, gg = g / 255, bb = b / 255;
    h = max === rr ? (gg - bb) / dd + (gg < bb ? 6 : 0) : max === gg ? (bb - rr) / dd + 2 : (rr - gg) / dd + 4;
    h *= 60;
  }
  return hslToHex(h, s, Math.max(0, Math.min(1, l + d)));
}

/** Small orange date in the corner, like the other ReyCam looks. */
function drawDateStamp(ctx: CanvasRenderingContext2D, W: number, H: number, unit: number) {
  const d = new Date();
  const txt = `'${String(d.getFullYear()).slice(2)} ${String(d.getMonth() + 1).padStart(2, ' ')} ${String(d.getDate()).padStart(2, '0')}`;
  ctx.save();
  ctx.font = `${46 * unit}px VT323, monospace`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = 'rgba(255,120,40,0.8)';
  ctx.shadowBlur = 8 * unit;
  ctx.fillStyle = '#FFB15C';
  ctx.fillText(txt, W - 44 * unit, H - 36 * unit);
  ctx.restore();
}

/** Film grain and vignette finish used by the retro desktop templates. */
export function finishFilm(ctx: CanvasRenderingContext2D, W: number, H: number) {
  grain(ctx, W, H, 0.35, W / 1080);
  vignette(ctx, 0, 0, W, H, 0.3);
}
