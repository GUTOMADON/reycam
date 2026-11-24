/**
 * The Collage category: template gallery, photo picking with automatic
 * cutout, and the layer editor (move, pinch, rotate, recolor, draw, text,
 * weave, refine, scatter, palettes, export). Opens as a full screen page on
 * phones and desktop.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  BackgroundLayer, CollageDoc, CollagePhoto, CollageTemplate, CutoutStyle, DrawLayer, FrameStyle, Layer, Material, Paint,
  PhotoLayer, RibbonLayer, ShapeKind, ShapeLayer, Stroke, SubjectLayer, TextLayer, Texture, Treatment, UiLayer, ZigzagLayer
} from './types';
import { buildTemplates, TAGS } from './templates';
import { History, deleteDraft, docFromTemplate, fileToCanvas, listDrafts, loadDraft, paintsOf, saveDraft, uid, usedSlots, type DraftSummary } from './doc';
import { PRESETS, rgbToHex, shufflePalette } from './palettes';
import { bumpMask, cropRect, photoBox, renderCollage, sizeFor, RATIOS, type RenderInfo } from './render';
import { frameInsets } from './treatments';
import { preloadSegmenter, segment } from './segment';
import { collageStrings, slotName, stickerName } from './strings';
import { PARAMS, TOOLS, UI_FIELDS, getVal, setVal, type Param } from './tools';
import { STICKER_ASPECT, STICKER_DEFAULTS, STICKER_GROUPS, drawStickerArt } from './stickers';
import type { HeadsLayer, StickerArt, StickerLayer } from './types';
import { DEFAULT_INTENSITY, filterChoices, lookExists, luName, rememberFilter, rememberedFilter, type FilterChoice } from './filters';
import { resolvePaint, isOverridden } from './resolve';
import { ColorPicker, pushRecent } from './ColorPicker';
import { rng } from './textures';
import { deliverBlob } from '../engine/utils';
import './collage.css';
import { MAX_CANVAS_AREA } from '../platform';
import type { Strings } from '../i18n';

type Screen = 'gallery' | 'pick' | 'editor';
type Tab = 'template' | 'cutout' | 'photo' | 'background' | 'stickers' | 'draw' | 'text' | 'colors' | 'layers';
type Mode = 'move' | 'draw' | 'erase' | 'restore' | 'lasso' | 'eyedrop' | 'weave';
type ColorTarget = { kind: 'slot'; slot: string } | { kind: 'paint'; layer: string; index: number } | { kind: 'brush' };

interface Props {
  lang: string;
  appT: Strings;
  isMobile: boolean;
  showToast: (s: string) => void;
  onClose: () => void;
}

const TABS: Tab[] = ['template', 'cutout', 'photo', 'background', 'stickers', 'draw', 'text', 'colors', 'layers'];
const D2R = Math.PI / 180;

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

async function loadSample(): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.src = import.meta.env.BASE_URL + 'sample.jpg';
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d')!.drawImage(img, 0, 0);
  return c;
}

function fullMask(img: HTMLCanvasElement) {
  const m = document.createElement('canvas');
  m.width = img.width; m.height = img.height;
  const ctx = m.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, m.width, m.height);
  return m;
}

export default function CollageApp({ lang, appT, isMobile, showToast, onClose }: Props) {
  const t = collageStrings(lang);
  const templates = useMemo(() => buildTemplates(lang), [lang]);
  const [screen, setScreen] = useState<Screen>('gallery');
  const [filter, setFilter] = useState<string>('all');
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [template, setTemplate] = useState<CollageTemplate | null>(null);
  const [picked, setPicked] = useState<(HTMLCanvasElement | null)[]>([null, null]);
  const [busy, setBusy] = useState('');
  const [doc, setDocState] = useState<CollageDoc | null>(null);
  const [photos, setPhotos] = useState<CollagePhoto[]>([]);
  const [tab, setTab] = useState<Tab>('template');
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('move');
  const [colorTarget, setColorTarget] = useState<ColorTarget | null>(null);
  const [brush, setBrush] = useState<{ type: Stroke['brush']; color: string; width: number }>({ type: 'marker', color: '#D21F1F', width: 10 });
  const [refine, setRefine] = useState({ size: 40, soft: 0.5, zoom: 1 });
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFmt, setExportFmt] = useState<'image/png' | 'image/jpeg'>('image/jpeg');
  const [scatterN, setScatterN] = useState(12);
  const [, force] = useState(0);
  const history = useRef(new History(60));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<RenderInfo>({ boxes: {}, swatches: [], weaveDots: [] });
  const docRef = useRef<CollageDoc | null>(null);
  docRef.current = doc;
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [stageSize, setStageSize] = useState({ w: 360, h: 480 });

  // ------------------------------------------------------------ gallery

  useEffect(() => { preloadSegmenter(); listDrafts().then(setDrafts); }, []);

  // Live template previews with the sample photo, rendered one by one.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const img = await loadSample().catch(() => null);
      if (!img || cancelled) return;
      const sample: CollagePhoto = { id: 'sample', image: img, mask: fullMask(img), segmented: false };
      const seg = await segment(img);
      sample.mask = seg.mask;
      for (const tpl of templates) {
        if (cancelled) return;
        const d = docFromTemplate(tpl);
        const [w, h] = sizeFor(d, 360);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        renderCollage(c.getContext('2d')!, d, [sample, sample], w, h, { photoMax: 500 });
        const url = c.toDataURL('image/jpeg', 0.8);
        setPreviews((p) => ({ ...p, [tpl.id]: url }));
        await new Promise((r) => setTimeout(r, 16));
      }
    })();
    return () => { cancelled = true; };
  }, [templates]);

  // ------------------------------------------------------------ document helpers

  const setDoc = useCallback((next: CollageDoc, record = true) => {
    if (record && docRef.current) history.current.push(docRef.current);
    next.updated = Date.now();
    setDocState(next);
  }, []);

  const mutate = useCallback((fn: (d: CollageDoc) => void, record = true) => {
    const cur = docRef.current;
    if (!cur) return;
    const next = clone(cur);
    fn(next);
    setDoc(next, record);
  }, [setDoc]);

  const layerById = (id: string | null) => (id && doc ? doc.layers.find((l) => l.id === id) : undefined);
  const sel = layerById(selected);
  const firstPhotoLayer = doc?.layers.find((l) => l.kind === 'photo') as PhotoLayer | undefined;
  const photoLayer = (sel?.kind === 'photo' ? sel : sel?.kind === 'subject' ? layerById((sel as SubjectLayer).of) : firstPhotoLayer) as PhotoLayer | undefined;

  // ------------------------------------------------------------ start a collage

  // ------------------------------------------------------------ filter pairing sheet

  const [filterAsk, setFilterAsk] = useState<{ imgs: (HTMLCanvasElement | null)[]; choosing: boolean } | null>(null);

  /** Show the "use a filter too?" sheet, or go straight on with the remembered choice. */
  const askFilter = (tpl: CollageTemplate, imgs: (HTMLCanvasElement | null)[]) => {
    const remembered = rememberedFilter(tpl.id);
    if (remembered !== undefined) { startWith(tpl, imgs, remembered); return; }
    setFilterAsk({ imgs, choosing: false });
  };

  const chooseFilter = (tpl: CollageTemplate, choice: FilterChoice) => {
    const imgs = filterAsk?.imgs ?? [];
    rememberFilter(tpl.id, choice);
    setFilterAsk(null);
    startWith(tpl, imgs, choice);
  };

  const filterSheet = (tpl: CollageTemplate) => {
    const rec = tpl.filter;
    const recReady = !!rec && lookExists(rec);
    return (
      <div className="modal-wrap" onClick={() => setFilterAsk(null)}>
        <div className="modal col-filter-sheet" onClick={(e) => e.stopPropagation()}>
          <h3>{t.filterAsk}</h3>
          {!filterAsk!.choosing ? (
            <div className="col-filter-options">
              <button type="button" className="btn primary" disabled={!recReady} onClick={() => chooseFilter(tpl, { id: rec!, intensity: DEFAULT_INTENSITY })}>
                {t.filterRecommended}{rec ? ` · ${luName(rec)}` : ''}
              </button>
              {!recReady && rec && <p className="note">{t.filterSoon}</p>}
              <button type="button" className="btn" onClick={() => setFilterAsk({ ...filterAsk!, choosing: true })}>{t.filterOther}</button>
              <button type="button" className="btn ghost" onClick={() => chooseFilter(tpl, null)}>{t.filterNone}</button>
            </div>
          ) : (
            <div className="col-filter-strip">
              {filterChoices().map((r) => (
                <button key={r.id} type="button" className="col-chip" onClick={() => chooseFilter(tpl, { id: r.id, intensity: DEFAULT_INTENSITY })}>{r.name}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const startWith = async (tpl: CollageTemplate, imgs: (HTMLCanvasElement | null)[], filter: FilterChoice = null) => {
    const first = imgs[0];
    if (!first) return;
    setBusy(t.cutting);
    const list: CollagePhoto[] = [];
    for (let i = 0; i < tpl.photos; i++) {
      const img = imgs[i] || first;
      if (i > 0 && img === first) { list.push(list[0]); continue; }
      const seg = await segment(img);
      list.push({ id: uid(), image: img, mask: seg.mask, segmented: seg.ok });
    }
    const d = docFromTemplate(tpl);
    if (filter) d.filter = filter;
    history.current.clear();
    setPhotos(list);
    setDocState(d);
    setSelected(null);
    setTab(isMobile ? 'colors' : 'colors');
    setMode('move');
    setBusy('');
    setScreen('editor');
  };

  const openDraft = async (id: string) => {
    setBusy(t.loading);
    const res = await loadDraft(id);
    setBusy('');
    if (!res) return;
    history.current.clear();
    setPhotos(res.photos);
    setDocState(res.doc);
    setTemplate(templates.find((x) => x.id === res.doc.template) || null);
    setSelected(null);
    setScreen('editor');
  };

  // ------------------------------------------------------------ rendering

  useEffect(() => {
    if (screen !== 'editor') return;
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStageSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setStageSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [screen]);

  const [cw, ch] = useMemo(() => {
    if (!doc) return [0, 0];
    const a = doc.ratio === 'free' ? doc.freeAspect || 1 : RATIOS[doc.ratio];
    const maxW = Math.max(100, stageSize.w - 16), maxH = Math.max(100, stageSize.h - 16);
    return maxW / maxH > a ? [maxH * a, maxH] : [maxW, maxW / a];
  }, [doc?.ratio, doc?.freeAspect, stageSize]);

  const hasHolo = !!doc?.layers.some((l) => l.kind === 'shape' && !l.hidden && ((l as ShapeLayer).material === 'holo' || (l as ShapeLayer).material === 'pastel'));
  const draw = useCallback((time = 0) => {
    const c = canvasRef.current, d = docRef.current;
    if (!c || !d) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(cw * dpr), H = Math.round(ch * dpr);
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    infoRef.current = renderCollage(c.getContext('2d')!, d, photos, W, H, {
      time, photoMax: 1400, selected: mode === 'move' ? selected : null, weaveFor: mode === 'weave' ? selected : null
    });
  }, [cw, ch, photos, selected, mode]);

  useEffect(() => { draw(performance.now() / 1000); }, [doc, draw]);

  useEffect(() => {
    if (!hasHolo || screen !== 'editor') return;
    let raf = 0, last = 0;
    const loop = (ts: number) => {
      if (ts - last > 90) { last = ts; draw(ts / 1000); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [hasHolo, screen, draw]);

  // Autosave the draft on the device.
  useEffect(() => {
    if (!doc || !photos.length) return;
    const id = window.setTimeout(() => {
      const [w, h] = sizeFor(doc, 300);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      renderCollage(c.getContext('2d')!, doc, photos, w, h, { photoMax: 400 });
      saveDraft(doc, photos, c).then(() => listDrafts().then(setDrafts));
    }, 1500);
    return () => window.clearTimeout(id);
  }, [doc, photos]);

  // ------------------------------------------------------------ gestures

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ start?: Layer; startPts?: { x: number; y: number }[]; recorded?: boolean; stroke?: Stroke; lasso?: [number, number][]; lastTap?: number } | null>(null);
  const lastTap = useRef(0);

  const toCanvas = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const hitTest = (fx: number, fy: number): string | null => {
    const d = docRef.current, c = canvasRef.current;
    if (!d || !c) return null;
    const px = fx * c.width, py = fy * c.height;
    for (let i = d.layers.length - 1; i >= 0; i--) {
      const l = d.layers[i];
      if (l.hidden || l.locked || l.kind === 'background' || l.kind === 'draw' || l.kind === 'subject') continue;
      const b = infoRef.current.boxes[l.id];
      if (!b) continue;
      const dx = px - b.cx, dy = py - b.cy;
      const lx = dx * Math.cos(-b.rot * D2R) - dy * Math.sin(-b.rot * D2R);
      const ly = dx * Math.sin(-b.rot * D2R) + dy * Math.cos(-b.rot * D2R);
      const pad = 10;
      if (Math.abs(lx) <= b.w / 2 + pad && Math.abs(ly) <= b.h / 2 + pad) return l.id;
    }
    return null;
  };

  /** Canvas fraction to photo mask pixels for the refine brushes. */
  const toMask = (fx: number, fy: number, pl: PhotoLayer, p: CollagePhoto) => {
    const c = canvasRef.current!;
    const W = c.width, H = c.height;
    const b = photoBox(pl, p, W, H);
    const ins = frameInsets(pl.frame, pl.frameMargin);
    const shift = pl.cutout === 'none' || pl.cutout === 'window' ? (ins.t - ins.b) * b.w / 2 : 0;
    const dx = fx * W - b.cx, dy = fy * H - b.cy;
    let lx = dx * Math.cos(-b.rot * D2R) - dy * Math.sin(-b.rot * D2R);
    const ly = dx * Math.sin(-b.rot * D2R) + dy * Math.cos(-b.rot * D2R) - shift;
    if (pl.flip) lx = -lx;
    const crop = cropRect(p, pl);
    return { x: crop.sx + (lx / b.w + 0.5) * crop.sw, y: crop.sy + (ly / b.h + 0.5) * crop.sh, k: crop.sw / b.w };
  };

  const brushMask = (fx: number, fy: number) => {
    const pl = photoLayer;
    if (!pl) return;
    const p = photos[pl.photo] || photos[0];
    const m = toMask(fx, fy, pl, p);
    const r = refine.size * (canvasRef.current!.width / 1080) * m.k;
    const ctx = p.mask.getContext('2d')!;
    const g = ctx.createRadialGradient(m.x, m.y, r * (1 - refine.soft), m.x, m.y, r);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    bumpMask(p.mask);
    draw();
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!doc) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = toCanvas(e);
    pointers.current.set(e.pointerId, pt);
    const c = canvasRef.current!;
    // Paint frame swatches pick the brush color.
    const sw = infoRef.current.swatches.find((s) => pt.x * c.width >= s.x && pt.x * c.width <= s.x + s.w && pt.y * c.height >= s.y && pt.y * c.height <= s.y + s.h);
    if (sw) { setBrush((b) => ({ ...b, color: sw.color })); setMode('draw'); setTab('draw'); return; }
    if (mode === 'eyedrop') {
      const px = c.getContext('2d')!.getImageData(Math.floor(pt.x * c.width), Math.floor(pt.y * c.height), 1, 1).data;
      applyColor(rgbToHex(px[0], px[1], px[2]), true);
      setMode('move');
      return;
    }
    if (mode === 'weave') {
      const dot = infoRef.current.weaveDots.find((d) => Math.hypot(d.x - pt.x * c.width, d.y - pt.y * c.height) < 28 * (c.width / cw));
      if (dot) mutate((d) => { const r = d.layers.find((l) => l.id === dot.layer) as RibbonLayer; r.weave[dot.index] = !r.weave[dot.index]; });
      return;
    }
    if (mode === 'draw') {
      const stroke: Stroke = { brush: brush.type, color: brush.color, width: brush.width, pts: [[pt.x, pt.y, 1]] };
      gesture.current = { stroke };
      return;
    }
    if (mode === 'erase' || mode === 'restore') { history.current.push(doc); brushMask(pt.x, pt.y); gesture.current = {}; return; }
    if (mode === 'lasso') { gesture.current = { lasso: [[pt.x, pt.y]] }; return; }

    if (pointers.current.size === 1) {
      const now = Date.now();
      const id = hitTest(pt.x, pt.y);
      if (now - lastTap.current < 300 && id && id === selected) {
        // Double tap: reset the element to its template position.
        const orig = template?.layers.find((l) => l.id === id);
        if (orig) mutate((d) => { const l = d.layers.find((x) => x.id === id)!; Object.assign(l, { x: orig.x, y: orig.y, w: orig.w, rot: orig.rot }); });
      }
      lastTap.current = now;
      setSelected(id);
      const l = id ? doc.layers.find((x) => x.id === id) : undefined;
      gesture.current = { start: l ? clone(l) : undefined, startPts: [pt], recorded: false };
    } else if (pointers.current.size === 2 && selected) {
      const l = doc.layers.find((x) => x.id === selected);
      gesture.current = { start: l ? clone(l) : undefined, startPts: [...pointers.current.values()], recorded: gesture.current?.recorded };
    }
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointers.current.has(e.pointerId) || !doc) return;
    const pt = toCanvas(e);
    pointers.current.set(e.pointerId, pt);
    const g = gesture.current;
    if (!g) return;
    if (g.stroke) {
      const last = g.stroke.pts[g.stroke.pts.length - 1];
      const speed = Math.hypot(pt.x - last[0], pt.y - last[1]) * 60;
      const pressure = e.pressure && e.pointerType === 'pen' ? 0.4 + e.pressure : Math.max(0.55, Math.min(1.25, 1.2 - speed));
      g.stroke.pts.push([pt.x, pt.y, pressure]);
      const c = canvasRef.current!, ctx = c.getContext('2d')!;
      ctx.strokeStyle = brush.color; ctx.lineCap = 'round';
      ctx.lineWidth = brush.width * (c.width / 1080) * pressure;
      ctx.beginPath(); ctx.moveTo(last[0] * c.width, last[1] * c.height); ctx.lineTo(pt.x * c.width, pt.y * c.height); ctx.stroke();
      return;
    }
    if (mode === 'erase' || mode === 'restore') { brushMask(pt.x, pt.y); return; }
    if (g.lasso) {
      const c = canvasRef.current!, ctx = c.getContext('2d')!;
      const last = g.lasso[g.lasso.length - 1];
      g.lasso.push([pt.x, pt.y]);
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(last[0] * c.width, last[1] * c.height); ctx.lineTo(pt.x * c.width, pt.y * c.height); ctx.stroke();
      return;
    }
    if (!g.start || g.start.locked) return;
    const pts = [...pointers.current.values()];
    const first = !g.recorded;
    if (first) { history.current.push(doc); g.recorded = true; }
    const start = g.start;
    mutate((d) => {
      const l = d.layers.find((x) => x.id === start.id);
      if (!l) return;
      if (pts.length >= 2 && g.startPts && g.startPts.length >= 2) {
        const [a0, b0] = g.startPts, [a1, b1] = pts;
        const aspect = cw / ch;
        const d0 = Math.hypot((b0.x - a0.x) * aspect, b0.y - a0.y), d1 = Math.hypot((b1.x - a1.x) * aspect, b1.y - a1.y);
        const r0 = Math.atan2(b0.y - a0.y, (b0.x - a0.x) * aspect), r1 = Math.atan2(b1.y - a1.y, (b1.x - a1.x) * aspect);
        l.w = Math.max(0.02, start.w * (d1 / Math.max(0.001, d0)));
        l.rot = start.rot + (r1 - r0) / D2R;
        l.x = start.x + ((a1.x + b1.x) - (a0.x + b0.x)) / 2;
        l.y = start.y + ((a1.y + b1.y) - (a0.y + b0.y)) / 2;
      } else if (g.startPts) {
        let nx = start.x + (pt.x - g.startPts[0].x);
        let ny = start.y + (pt.y - g.startPts[0].y);
        // Snap to center and edges, with a short vibration where supported.
        const snap = (v: number, target: number) => (Math.abs(v - target) < 0.012 ? target : v);
        const sx = snap(nx, 0.5), sy = snap(ny, 0.5);
        if ((sx !== nx && l.x !== 0.5) || (sy !== ny && l.y !== 0.5)) navigator.vibrate?.(8);
        nx = sx; ny = sy;
        l.x = nx; l.y = ny;
      }
    }, false);
  };

  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (g?.stroke && doc) {
      const stroke = g.stroke;
      mutate((d) => {
        let dl = d.layers.find((l) => l.kind === 'draw') as DrawLayer | undefined;
        if (!dl) { dl = { id: 'draw-' + uid(), kind: 'draw', x: 0.5, y: 0.5, w: 1, rot: 0, strokes: [] }; d.layers.push(dl); }
        dl.strokes.push(stroke);
      });
      gesture.current = null;
      return;
    }
    if (g?.lasso && photoLayer && g.lasso.length > 3) {
      const p = photos[photoLayer.photo] || photos[0];
      history.current.push(doc!);
      const ctx = p.mask.getContext('2d')!;
      ctx.save();
      ctx.beginPath();
      g.lasso.forEach(([x, y], i) => { const m = toMask(x, y, photoLayer, p); i ? ctx.lineTo(m.x, m.y) : ctx.moveTo(m.x, m.y); });
      ctx.closePath();
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.restore();
      bumpMask(p.mask);
      draw();
      force((n) => n + 1);
    }
    if (pointers.current.size === 0) gesture.current = null;
    else if (g) g.startPts = [...pointers.current.values()];
  };

  // ------------------------------------------------------------ colors

  const colorValue = (ct: ColorTarget | null): string => {
    if (!ct || !doc) return '#FFFFFF';
    if (ct.kind === 'brush') return brush.color;
    if (ct.kind === 'slot') return doc.palette[ct.slot] || '#FFFFFF';
    const l = layerById(ct.layer);
    return l ? resolvePaint(paintsOf(l)[ct.index], doc.palette, '#FFFFFF') : '#FFFFFF';
  };

  function applyColor(hex: string, final: boolean) {
    const ct = colorTarget;
    if (!ct) return;
    if (ct.kind === 'brush') { setBrush((b) => ({ ...b, color: hex })); return; }
    const recordFirst = final || !gesture.current?.recorded;
    mutate((d) => {
      if (ct.kind === 'slot') d.palette[ct.slot] = hex;
      else {
        const l = d.layers.find((x) => x.id === ct.layer);
        if (l) paintsOf(l)[ct.index].color = hex;
      }
    }, recordFirst && final);
  }

  const relink = (ct: ColorTarget) => {
    if (ct.kind !== 'paint') return;
    mutate((d) => { const l = d.layers.find((x) => x.id === ct.layer); if (l) delete paintsOf(l)[ct.index].color; });
  };

  const applyPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    mutate((d) => { d.palette = { ...d.palette, ...p.colors }; });
  };

  const shuffle = () => {
    const photo = photos[0]?.image ?? null;
    const pal = shufflePalette(photo, Math.random());
    mutate((d) => { d.palette = { ...d.palette, ...pal }; });
  };

  // ------------------------------------------------------------ add elements

  const addLayer = (l: Layer, above = true) => {
    mutate((d) => { if (above) d.layers.push(l); else d.layers.splice(1, 0, l); });
    setSelected(l.id);
  };

  const subjectPhotoId = () => firstPhotoLayer?.id;

  const addShape = (shape: ShapeKind, extra: Partial<ShapeLayer> = {}) => addLayer({
    id: uid(), kind: 'shape', shape, x: 0.5 + (Math.random() - 0.5) * 0.3, y: 0.3 + Math.random() * 0.2, w: 0.14, rot: (Math.random() - 0.5) * 30,
    fill: { slot: 'starPrimary' }, seed: Math.floor(Math.random() * 1e6), ...extra
  } as ShapeLayer);

  const addSticker = (art: StickerArt) => {
    const [c1, c2] = STICKER_DEFAULTS[art];
    addLayer({ id: uid(), kind: 'sticker', art, x: 0.5 + (Math.random() - 0.5) * 0.3, y: 0.3 + Math.random() * 0.3, w: 0.16, rot: (Math.random() - 0.5) * 20, paint: { color: c1 }, paint2: { color: c2 }, seed: Math.floor(Math.random() * 999) } as StickerLayer);
  };

  /** Sliders, toggles, choices and text fields built from the PARAMS table. */
  const paramControls = (l: Layer) => {
    let list = PARAMS[l.kind] ?? [];
    if (l.kind === 'ui') { const f = UI_FIELDS[(l as UiLayer).widget]; if (!f) return null; list = list.filter((p) => f.includes(p.key)); }
    if (l.kind === 'sticker' && (l as StickerLayer).art !== 'badge' && (l as StickerLayer).art !== 'keytag') list = list.filter((p) => p.key !== 'label');
    if (!list.length) return null;
    const set = (key: string, v: unknown, record = true) => mutate((d) => { const x = d.layers.find((y) => y.id === l.id); if (x) setVal(x, key, v); }, record);
    return (
      <div className="col-fields">
        {list.map((p: Param) => {
          const v = getVal(l, p.key);
          switch (p.kind) {
            case 'range': return <div key={p.key}>{range(t[p.label] as string, typeof v === 'number' ? v : p.min, p.min, p.max, p.step, (n) => set(p.key, n, false), p.key)}</div>;
            case 'toggle': return <div key={p.key} className="col-row">{chip(!!v, t[p.label] as string, () => set(p.key, !v))}</div>;
            case 'paint': return <div key={p.key} className="col-row">{chip(!!v, t[p.label] as string, () => set(p.key, v ? undefined : { slot: p.slot }))}</div>;
            case 'text': return p.multiline
              ? <textarea key={p.key} className="text-input" aria-label={t[p.label] as string} value={String(v ?? '')} onChange={(e) => set(p.key, e.target.value, false)} />
              : <input key={p.key} className="text-input" aria-label={t[p.label] as string} placeholder={t[p.label] as string} value={String(v ?? '')} onChange={(e) => set(p.key, e.target.value, false)} />;
            case 'choice': return (
              <div key={p.key} className="col-row"><span className="col-label">{t[p.label] as string}</span>
                {p.options.map(([val, lab], i) => chip(JSON.stringify(v) === JSON.stringify(val) || (p.key === 'treatment' && (v as Treatment | undefined)?.type === (val as Treatment).type), t[lab] as string, () => set(p.key, val), String(i)))}
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  /** Color block heads: one row per face with its square color, size and offset. */
  const headsControls = (l: HeadsLayer) => {
    const setB = (i: number, fn: (b: HeadsLayer['blocks'][number]) => void, record = false) => mutate((d) => { const x = d.layers.find((y) => y.id === l.id) as HeadsLayer; fn(x.blocks[i]); }, record);
    return (
      <div className="col-fields">
        {l.blocks.map((b, i) => (
          <div key={i}>
            <div className="col-row">
              <span className="col-label">{t.face} {i + 1}</span>
              {swatchBtn(b.paint, { kind: 'paint', layer: l.id, index: paintsOf(l).indexOf(b.paint) }, slotName(lang, b.paint.slot ?? ''))}
              {swatchBtn(b.ink, { kind: 'paint', layer: l.id, index: paintsOf(l).indexOf(b.ink) }, slotName(lang, b.ink.slot ?? ''))}
              {l.blocks.length > 1 && <button type="button" className="col-chip" onClick={() => mutate((d) => { (d.layers.find((y) => y.id === l.id) as HeadsLayer).blocks.splice(i, 1); })}>×</button>}
            </div>
            {range(t.squareSize, b.size, 0.6, 2.5, 0.05, (v) => setB(i, (x) => { x.size = v; }), 's' + i)}
            {range(t.offsetX, b.dx, -0.2, 0.2, 0.005, (v) => setB(i, (x) => { x.dx = v; }), 'x' + i)}
            {range(t.offsetY, b.dy, -0.2, 0.2, 0.005, (v) => setB(i, (x) => { x.dy = v; }), 'y' + i)}
          </div>
        ))}
        <button type="button" className="col-chip on" onClick={() => mutate((d) => { const x = d.layers.find((y) => y.id === l.id) as HeadsLayer; x.blocks.push({ ...clone(x.blocks[x.blocks.length - 1]), rot: (Math.random() - 0.5) * 12 }); })}>＋ {t.face}</button>
      </div>
    );
  };

  /** Scatter N stickers around the subject while keeping the face clear. */
  const scatter = (seed = Math.random()) => {
    if (!doc) return;
    const r = rng(Math.floor(seed * 1e6));
    const c = canvasRef.current!;
    const pl = firstPhotoLayer;
    const b = pl ? infoRef.current.boxes[pl.id] : undefined;
    const face = b ? { x: b.cx / c.width, y: (b.cy - b.h * 0.22) / c.height, rx: (b.w / c.width) * 0.28, ry: (b.h / c.height) * 0.2 } : { x: 0.5, y: 0.35, rx: 0.12, ry: 0.1 };
    const cx = b ? b.cx / c.width : 0.5, cy = b ? b.cy / c.height : 0.5;
    const rx = b ? Math.min(0.48, (b.w / c.width) * 0.7) : 0.4, ry = b ? Math.min(0.48, (b.h / c.height) * 0.65) : 0.4;
    const items: ShapeLayer[] = [];
    let guard = 0;
    while (items.length < scatterN && guard++ < 500) {
      const a = r() * Math.PI * 2, dd = 0.45 + r() * 0.6;
      const x = cx + Math.cos(a) * rx * dd, y = cy + Math.sin(a) * ry * dd;
      if (x < 0.03 || x > 0.97 || y < 0.03 || y > 0.97) continue;
      if (((x - face.x) / face.rx) ** 2 + ((y - face.y) / face.ry) ** 2 < 1) continue;
      items.push({ id: 'sc_' + uid(), kind: 'shape', shape: 'star5', x, y, w: 0.035 + r() * 0.035, rot: (r() - 0.5) * 60, fill: { slot: 'starPrimary' }, material: 'holo', seed: Math.floor(r() * 1e6) });
    }
    mutate((d) => { d.layers = d.layers.filter((l) => !l.id.startsWith('sc_')).concat(items); });
  };

  // ------------------------------------------------------------ export

  const doExport = async () => {
    if (!doc) return;
    setBusy(t.exporting);
    await new Promise((r) => setTimeout(r, 30));
    try {
      const longPhoto = Math.max(...photos.map((p) => Math.max(p.image.width, p.image.height)), 0);
      let long = Math.max(2160, longPhoto);
      let [W, H] = sizeFor(doc, long);
      if (W * H > MAX_CANVAS_AREA) { const k = Math.sqrt(MAX_CANVAS_AREA / (W * H)); long = Math.floor(long * k); [W, H] = sizeFor(doc, long); }
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      renderCollage(c.getContext('2d')!, doc, photos, W, H, { photoMax: Math.max(W, H) });
      const blob: Blob | null = await new Promise((r) => c.toBlob(r, exportFmt, 0.95));
      if (blob) {
        const saved = await deliverBlob(blob, `reycam_collage_${Date.now()}.${exportFmt === 'image/png' ? 'png' : 'jpg'}`, isMobile);
        showToast(`${saved ? appT.savedToGallery : t.exported} · ${W} × ${H}`);
      }
    } finally {
      setBusy('');
      setExportOpen(false);
    }
  };

  // ------------------------------------------------------------ UI pieces

  const chip = (on: boolean, label: string, onClick: () => void, key?: string) => (
    <button key={key ?? label} type="button" className={on ? 'col-chip on' : 'col-chip'} onClick={onClick}>{label}</button>
  );
  const range = (label: string, value: number, min: number, max: number, step: number, set: (v: number) => void, key?: string) => (
    <label className="col-range" key={key ?? label}>
      <span>{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onPointerDown={() => { if (docRef.current) history.current.push(docRef.current); }}
        onChange={(e) => set(Number(e.target.value))}
      />
      <em>{Math.round(value * 100) / 100}</em>
    </label>
  );
  const setL = <K extends Layer>(id: string, patch: (l: K) => void) => mutate((d) => { const l = d.layers.find((x) => x.id === id) as K | undefined; if (l) patch(l); }, false);
  const swatchBtn = (paint: Paint | undefined | null, ct: ColorTarget, label?: string) => {
    if (!doc) return null;
    const col = paint ? resolvePaint(paint, doc.palette, '#FFFFFF') : colorValue(ct);
    return (
      <button type="button" className="col-swatch-btn" onClick={() => setColorTarget(ct)}>
        <span className="col-swatch" style={{ background: col }} />
        {label && <span>{label}</span>}
        {paint && isOverridden(paint) && <span className="col-broken" title={t.ownColor}>⛓</span>}
      </button>
    );
  };

  const elementColors = (l: Layer) => {
    const paints = paintsOf(l);
    if (!paints.length) return null;
    return (
      <div className="col-row">
        <span className="col-label">{t.elementColor}</span>
        {paints.map((p, i) => <span key={i}>{swatchBtn(p, { kind: 'paint', layer: l.id, index: i }, p.slot ? slotName(lang, p.slot) : undefined)}</span>)}
      </div>
    );
  };

  // ------------------------------------------------------------ panels

  const panelTemplate = () => (
    <>
      <div className="col-row">
        <span className="col-label">{t.ratio}</span>
        {(['9:16', '4:5', '3:4', '1:1', '4:3', 'free'] as const).map((r) => chip(doc!.ratio === r, r === 'free' ? t.free : r, () => mutate((d) => { d.ratio = r; if (r === 'free') d.freeAspect = d.freeAspect || 0.8; })))}
      </div>
      {doc!.ratio === 'free' && range(t.ratio, doc!.freeAspect || 0.8, 0.5, 2, 0.01, (v) => mutate((d) => { d.freeAspect = v; }, false))}
      <div className="col-row"><span className="col-label">{t.remix}</span></div>
      <div className="col-tpl-strip">
        {templates.map((tp) => (
          <button key={tp.id} type="button" className={doc!.template === tp.id ? 'col-tpl-mini on' : 'col-tpl-mini'} onClick={() => {
            const next = docFromTemplate(tp, doc!.palette);
            next.id = doc!.id; next.created = doc!.created; next.dateStamp = doc!.dateStamp;
            const need = tp.photos;
            if (photos.length < need) setPhotos([...photos, ...Array(need - photos.length).fill(photos[0])]);
            setTemplate(tp); setSelected(null); setDoc(next);
          }}>
            {previews[tp.id] ? <img src={previews[tp.id]} alt="" /> : <span className="thumb-ph" />}
            <span>{tp.name[lang] ?? tp.name.en}</span>
          </button>
        ))}
      </div>
    </>
  );

  const panelCutout = () => {
    const pl = photoLayer;
    if (!pl) return <p className="note">{t.noSelection}</p>;
    const styles: [CutoutStyle, string][] = [['none', t.cutNone], ['clean', t.cutClean], ['sticker', t.cutSticker], ['torn', t.cutTorn], ['silhouette', t.cutSilhouette], ['window', t.cutWindow]];
    return (
      <>
        <div className="col-row">{styles.map(([s, label]) => chip(pl.cutout === s, label, () => mutate((d) => { const l = d.layers.find((x) => x.id === pl.id) as PhotoLayer; l.cutout = s; if ((s === 'sticker' || s === 'torn') && !l.outline) l.outline = { slot: 'outline' }; if (s === 'silhouette' && !l.fill) l.fill = { slot: 'background' }; }), s))}</div>
        {(pl.cutout === 'sticker' || pl.cutout === 'torn') && (
          <>
            {range(t.outlineWidth, pl.outlineWidth ?? 18, 0, 60, 1, (v) => setL<PhotoLayer>(pl.id, (l) => { l.outlineWidth = v; }))}
            <div className="col-row">
              {chip(!!pl.roughEdge, t.roughEdge, () => mutate((d) => { const l = d.layers.find((x) => x.id === pl.id) as PhotoLayer; l.roughEdge = !l.roughEdge; }))}
              {swatchBtn(pl.outline, { kind: 'paint', layer: pl.id, index: paintsOf(pl).indexOf(pl.outline as Paint) }, t.outlineWidth)}
            </div>
          </>
        )}
        {pl.cutout === 'silhouette' && <div className="col-row">{swatchBtn(pl.fill, { kind: 'paint', layer: pl.id, index: paintsOf(pl).indexOf(pl.fill as Paint) }, t.cutSilhouette)}</div>}
        {pl.cutout === 'window' && <div className="col-row">{([['star', t.shapeStar], ['burst', t.shapeBurst], ['rounded', t.shapeRounded], ['star4', t.shapeSparkle], ['heart', t.shapeHeart]] as const).map(([s, label]) => chip((pl.windowShape ?? 'star') === s, label, () => mutate((d) => { (d.layers.find((x) => x.id === pl.id) as PhotoLayer).windowShape = s; }), s))}</div>}
        <div className="col-row">{chip(!!pl.shadow, t.shadow, () => mutate((d) => { const l = d.layers.find((x) => x.id === pl.id) as PhotoLayer; l.shadow = !l.shadow; }))}</div>
        <div className="col-row">
          <span className="col-label">{t.refine}</span>
          {chip(mode === 'restore', '✚ ' + t.restore, () => setMode(mode === 'restore' ? 'move' : 'restore'))}
          {chip(mode === 'erase', '− ' + t.erase, () => setMode(mode === 'erase' ? 'move' : 'erase'))}
          {chip(mode === 'lasso', '◌ ' + t.lasso, () => setMode(mode === 'lasso' ? 'move' : 'lasso'))}
        </div>
        {(mode === 'erase' || mode === 'restore' || mode === 'lasso') && (
          <>
            <p className="note">{t.refineHint}</p>
            {range(t.brushSize, refine.size, 6, 160, 1, (v) => setRefine((r) => ({ ...r, size: v })))}
            {range(t.softness, refine.soft, 0, 1, 0.05, (v) => setRefine((r) => ({ ...r, soft: v })))}
            {range(t.zoom, refine.zoom, 1, 4, 0.1, (v) => setRefine((r) => ({ ...r, zoom: v })))}
          </>
        )}
        <button type="button" className="btn small" onClick={async () => {
          const p = photos[pl.photo] || photos[0];
          setBusy(t.cutting);
          const seg = await segment(p.image);
          p.mask.getContext('2d')!.clearRect(0, 0, p.mask.width, p.mask.height);
          p.mask.getContext('2d')!.drawImage(seg.mask, 0, 0);
          bumpMask(p.mask);
          setBusy('');
          draw();
        }}>{t.redoCut}</button>
      </>
    );
  };

  const treatmentOf = (pl: PhotoLayer): { target: 'photo' | 'subject'; tr: Treatment; subj?: SubjectLayer } => {
    const subj = doc!.layers.find((l) => l.kind === 'subject' && (l as SubjectLayer).of === pl.id) as SubjectLayer | undefined;
    if (subj?.treatment) return { target: 'subject', tr: subj.treatment, subj };
    return { target: 'photo', tr: pl.treatment, subj };
  };

  /** Photo filter (filter pairing): change, remove or dose it. Applies to every photo slot. */
  const filterControls = () => (
    <>
      <div className="col-row">
        <span className="col-label">{t.filter}</span>
        {chip(!doc!.filter, t.filterNone, () => { mutate((d) => { delete d.filter; }); rememberFilter(doc!.template, null); }, 'nofilter')}
      </div>
      <div className="col-filter-strip">
        {filterChoices().map((r) => chip(doc!.filter?.id === r.id, r.name, () => {
          const next = { id: r.id, intensity: doc!.filter?.intensity ?? DEFAULT_INTENSITY };
          mutate((d) => { d.filter = next; });
          rememberFilter(doc!.template, next);
        }, r.id))}
      </div>
      {doc!.filter && range(t.intensity, doc!.filter.intensity, 0, 100, 5, (v) => mutate((d) => { if (d.filter) d.filter.intensity = v; }, false), 'fint')}
    </>
  );

  const panelPhoto = () => {
    const pl = photoLayer;
    if (!pl) return <>{filterControls()}<p className="note">{t.noSelection}</p></>;
    const { target, tr } = treatmentOf(pl);
    const setTr = (next: Treatment, record = true) => mutate((d) => {
      if (target === 'subject') (d.layers.find((l) => l.kind === 'subject' && (l as SubjectLayer).of === pl.id) as SubjectLayer).treatment = next;
      else (d.layers.find((x) => x.id === pl.id) as PhotoLayer).treatment = next;
    }, record);
    const presets: [Treatment['type'], string, Treatment][] = [
      ['none', t.treatNone, { type: 'none' }], ['bw', t.treatBw, { type: 'bw', contrast: 1.15, grain: 0.2 }], ['sepia', t.treatSepia, { type: 'sepia', amount: 0.8, fade: 0.2, grain: 0.15 }],
      ['mono', t.treatMono, { type: 'mono', tint: { slot: 'tint' }, paper: { slot: 'tintSecondary' }, grain: 0.2 }], ['duotone', t.treatDuo, { type: 'duotone', dark: { slot: 'tint' }, light: { slot: 'accent' }, grain: 0.1 }],
      ['halftone', t.treatHalftone, { type: 'halftone', dot: 6, ink: { slot: 'tint' }, paper: { slot: 'paper' } }], ['overlay', t.treatOverlay, { type: 'overlay', color: { slot: 'tint' }, mode: 'multiply', opacity: 0.6 }],
      ['warm', t.treatWarm, { type: 'warm', amount: 0.8, grain: 0.15 }], ['flash', t.treatFlash, { type: 'flash', contrast: 1.45, grain: 0.25 }],
      ['negative', t.treatNegative, { type: 'negative', tint: { slot: 'tintSecondary' }, paper: { slot: 'tint' }, grain: 0.1 }],
      ['posterize', t.treatPoster, { type: 'posterize', levels: 4, dark: { slot: 'tint' }, light: { slot: 'tintSecondary' } }],
      ['invert', t.treatInvert, { type: 'invert' }],
      ['grade', t.treatGrade, { type: 'grade', tint: { slot: 'tint' }, amount: 0.45, contrast: 1.15, fade: 0.1, grain: 0.3 }],
      ['paint', t.treatPaint, { type: 'paint', scheme: 'neon', lines: 0.6, hatch: { slot: 'doodleFill' } }]
    ];
    const frames: [FrameStyle, string][] = [['none', t.frameNone], ['booth', t.frameBooth], ['film', t.frameFilm], ['polaroid', t.framePolaroid], ['white', t.frameWhite]];
    const trPaints: [string, Paint][] = tr.type === 'mono' || tr.type === 'negative' ? [['tint', tr.tint], ['paper', tr.paper]] : tr.type === 'duotone' || tr.type === 'posterize' ? [['dark', tr.dark], ['light', tr.light]] : tr.type === 'halftone' ? [['ink', tr.ink], ['paper', tr.paper]] : tr.type === 'overlay' ? [['color', tr.color]] : tr.type === 'grade' ? [['tint', tr.tint]] : tr.type === 'paint' ? [['hatch', tr.hatch]] : [];
    return (
      <>
        {filterControls()}
        {pl.cutout === 'none' && (
          <div className="col-row">
            <span className="col-label">{t.applyTo}</span>
            {chip(target === 'photo', t.wholePhoto, () => mutate((d) => { d.layers = d.layers.filter((l) => !(l.kind === 'subject' && (l as SubjectLayer).of === pl.id && l.id.startsWith('subj_'))); }))}
            {chip(target === 'subject', t.cutoutOnly, () => mutate((d) => {
              const i = d.layers.findIndex((l) => l.id === pl.id);
              const existing = d.layers.find((l) => l.kind === 'subject' && (l as SubjectLayer).of === pl.id) as SubjectLayer | undefined;
              if (existing) existing.treatment = existing.treatment ?? { type: 'bw', contrast: 1.15, grain: 0.2 };
              else d.layers.splice(i + 1, 0, { id: 'subj_' + uid(), kind: 'subject', of: pl.id, x: pl.x, y: pl.y, w: pl.w, rot: 0, cutout: 'clean', treatment: { type: 'bw', contrast: 1.15, grain: 0.2 } } as SubjectLayer);
            }))}
          </div>
        )}
        <div className="col-row">{presets.map(([k, label, val]) => chip(tr.type === k, label, () => setTr(val), k))}</div>
        {(tr.type === 'bw' || tr.type === 'flash') && range(t.contrast, tr.contrast, 0.5, 2, 0.05, (v) => setTr({ ...tr, contrast: v }, false))}
        {tr.type === 'sepia' && <>{range(t.amount, tr.amount, 0, 1, 0.05, (v) => setTr({ ...tr, amount: v }, false))}{range(t.fade, tr.fade, 0, 1, 0.05, (v) => setTr({ ...tr, fade: v }, false))}</>}
        {tr.type === 'warm' && range(t.amount, tr.amount, 0, 1.5, 0.05, (v) => setTr({ ...tr, amount: v }, false))}
        {tr.type === 'halftone' && range(t.dotSize, tr.dot, 2, 20, 0.5, (v) => setTr({ ...tr, dot: v }, false))}
        {tr.type === 'posterize' && range(t.levels, tr.levels, 2, 8, 1, (v) => setTr({ ...tr, levels: v }, false))}
        {tr.type === 'grade' && <>{range(t.amount, tr.amount, 0, 1, 0.05, (v) => setTr({ ...tr, amount: v }, false))}{range(t.contrast, tr.contrast, 0.5, 2, 0.05, (v) => setTr({ ...tr, contrast: v }, false))}{range(t.fade, tr.fade, 0, 1, 0.05, (v) => setTr({ ...tr, fade: v }, false))}</>}
        {tr.type === 'paint' && (
          <>
            <div className="col-row">{(['neon', 'ocean', 'sunset'] as const).map((sc) => chip(tr.scheme === sc, t[('scheme' + sc[0].toUpperCase() + sc.slice(1)) as 'schemeNeon'], () => setTr({ ...tr, scheme: sc }), sc))}</div>
            {range(t.lines, tr.lines, 0, 1, 0.05, (v) => setTr({ ...tr, lines: v }, false))}
          </>
        )}
        {tr.type === 'overlay' && (
          <>
            <div className="col-row">{(['multiply', 'screen', 'overlay', 'source-over'] as const).map((m) => chip(tr.mode === m, m === 'source-over' ? 'normal' : m, () => setTr({ ...tr, mode: m }), m))}</div>
            {range(t.opacity, tr.opacity, 0, 1, 0.05, (v) => setTr({ ...tr, opacity: v }, false))}
          </>
        )}
        {'grain' in tr && range(t.grain, tr.grain, 0, 1, 0.05, (v) => setTr({ ...tr, grain: v } as Treatment, false))}
        {trPaints.length > 0 && (
          <div className="col-row">
            {trPaints.map(([k, p]) => (
              <button key={k} type="button" className="col-swatch-btn" onClick={() => {
                // Treatment colors follow their slot; edit the slot so every element using it updates.
                if (p.slot) setColorTarget({ kind: 'slot', slot: p.slot });
              }}>
                <span className="col-swatch" style={{ background: resolvePaint(p, doc!.palette, '#000') }} />
                <span>{p.slot ? slotName(lang, p.slot) : k}</span>
              </button>
            ))}
          </div>
        )}
        <div className="col-row"><span className="col-label">{t.frame}</span>{frames.map(([f, label]) => chip(pl.frame === f, label, () => mutate((d) => { const l = d.layers.find((x) => x.id === pl.id) as PhotoLayer; l.frame = f; if (f === 'booth' || f === 'film' || f === 'white') l.framePaint = l.framePaint ?? { slot: 'frame' }; }), f))}</div>
        {sel?.kind === 'subject' ? paramControls(sel) : paramControls(pl)}
        {pl.frame === 'white' && range(t.margin, pl.frameMargin ?? 0.06, 0.01, 0.2, 0.01, (v) => setL<PhotoLayer>(pl.id, (l) => { l.frameMargin = v; }))}
        <label className="btn small file">
          {t.changePhoto}
          <input type="file" accept="image/*,.heic,.heif" onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            setBusy(t.cutting);
            try {
              const img = await fileToCanvas(f);
              const seg = await segment(img);
              const np: CollagePhoto = { id: uid(), image: img, mask: seg.mask, segmented: seg.ok };
              setPhotos((list) => list.map((p, i) => (i === pl.photo ? np : p === list[pl.photo] ? np : p)));
            } finally { setBusy(''); }
          }} />
        </label>
      </>
    );
  };

  const panelBackground = () => {
    const b = doc!.layers.find((l) => l.kind === 'background') as BackgroundLayer | undefined;
    if (!b) return null;
    const setB = (fn: (l: BackgroundLayer) => void, record = true) => mutate((d) => { fn(d.layers.find((l) => l.id === b.id) as BackgroundLayer); }, record);
    const styles: [BackgroundLayer['style'], string][] = [['solid', t.bgSolid], ['stripes', t.bgStripes], ['split', t.bgSplit], ['crayon', t.bgCrayon], ['sky', t.bgSky], ['desktop', t.bgDesktop], ['photo', t.bgPhoto],
      ['quilt', t.bgQuilt], ['comic', t.bgComic], ['ghost', t.bgGhost], ['sunburst', t.bgSunburst], ['torn', t.bgTorn], ['journal', t.bgJournal]];
    const textures: [Texture, string][] = [['none', t.texNone], ['felt', t.texFelt], ['kraft', t.texKraft], ['watercolor', t.texWatercolor], ['poster', t.texPoster], ['recycled', t.texRecycled], ['folds', t.texFolds], ['fabric', t.texFabric], ['crayon', t.texCrayon],
      ['crumpled', t.texCrumpled], ['notebook', t.texNotebook], ['newsprint', t.texNewsprint], ['canvas', t.texCanvas], ['oil', t.texOil]];
    return (
      <>
        <div className="col-row">{styles.map(([s, label]) => chip(b.style === s || (s === 'desktop' && b.style === 'desktop3d'), label, () => setB((l) => {
          l.style = s;
          if (!l.paint2) l.paint2 = { slot: 'backgroundSecondary' };
          if (s === 'sky' || s === 'desktop' || s === 'torn') l.paint3 = l.paint3 ?? { slot: 'paper' };
          if (s === 'quilt' && !l.paints) l.paints = [{ slot: 'background' }, { slot: 'backgroundSecondary' }, { slot: 'starPrimary' }, { slot: 'doodleFill' }, { slot: 'tint' }];
          if (s === 'sunburst' && l.texture === 'none') l.texture = 'crumpled';
        }), s))}</div>
        <div className="col-row">
          {swatchBtn(b.paint, { kind: 'paint', layer: b.id, index: paintsOf(b).indexOf(b.paint) }, slotName(lang, b.paint.slot ?? 'background'))}
          {b.style === 'quilt' && (b.paints ?? []).map((p, i) => <span key={i}>{swatchBtn(p, { kind: 'paint', layer: b.id, index: paintsOf(b).indexOf(p) }, slotName(lang, p.slot ?? ''))}</span>)}
          {(b.style === 'torn') && b.paint3 && swatchBtn(b.paint3, { kind: 'paint', layer: b.id, index: paintsOf(b).indexOf(b.paint3) }, slotName(lang, b.paint3.slot ?? 'paper'))}
          {(b.style === 'stripes' || b.style === 'split' || b.style === 'sunburst' || b.style.startsWith('desktop')) && b.paint2 && swatchBtn(b.paint2, { kind: 'paint', layer: b.id, index: paintsOf(b).indexOf(b.paint2) }, slotName(lang, b.paint2.slot ?? 'backgroundSecondary'))}
          {(b.style === 'sky' || b.style.startsWith('desktop')) && b.paint3 && swatchBtn(b.paint3, { kind: 'paint', layer: b.id, index: paintsOf(b).indexOf(b.paint3) }, slotName(lang, b.paint3.slot ?? 'paper'))}
        </div>
        {(b.style === 'solid' || b.style === 'stripes' || b.style === 'split' || b.style === 'sunburst') && <div className="col-row"><span className="col-label">{t.texture}</span>{textures.map(([x, label]) => chip(b.texture === x, label, () => setB((l) => { l.texture = x; }), x))}</div>}
        {b.style === 'photo' && <div className="col-row"><span className="col-label">{t.texture}</span>{textures.map(([x, label]) => chip((b.overlay ?? 'none') === x, label, () => setB((l) => { l.overlay = x === 'none' ? undefined : x; }), x))}</div>}
        {b.style === 'ghost' && <>{range(t.cols, b.tiles ?? 4, 2, 8, 1, (v) => setB((l) => { l.tiles = v; }, false))}{range(t.blur, b.blur ?? 6, 0, 30, 1, (v) => setB((l) => { l.blur = v; }, false))}</>}
        {b.style === 'quilt' && <div className="col-row">{chip(b.felt !== false, t.stickersFelt, () => setB((l) => { l.felt = l.felt === false; }))}</div>}
        {(b.style === 'comic' || b.style === 'torn' || b.style === 'journal') && range(t.shuffle, b.seed ?? 12, 1, 60, 1, (v) => setB((l) => { l.seed = v; }, false))}
        {b.style === 'stripes' && <>{range(t.stripeWidth, b.stripeWidth ?? 0.07, 0.02, 0.25, 0.005, (v) => setB((l) => { l.stripeWidth = v; }, false))}{range(t.angle, b.stripeAngle ?? 0, -90, 90, 1, (v) => setB((l) => { l.stripeAngle = v; }, false))}</>}
        {b.style === 'photo' && <>{range(t.blur, b.blur ?? 0, 0, 40, 1, (v) => setB((l) => { l.blur = v; }, false))}<div className="col-row">{chip(!!b.bw, t.bw, () => setB((l) => { l.bw = !l.bw; }))}</div></>}
        <div className="col-row">{chip(b.folds === 'grid', t.texFolds, () => setB((l) => { l.folds = l.folds === 'grid' ? 'none' : 'grid'; }))}</div>
      </>
    );
  };

  const panelStickers = () => {
    const s = sel;
    return (
      <>
        <div className="col-add-grid">
          {([
            ['★', t.holo, () => addShape('star5', { material: 'holo', w: 0.07 })],
            ['✦', t.paperStar, () => addShape('paperStar', { wobble: 0.7, texture: 'paper', w: 0.18 })],
            ['✺', t.burst, () => addShape('burst', { fill: { slot: 'doodleFill' }, points: 18, w: 0.3 })],
            ['☆', t.doodleStar, () => addShape('star5', { fill: { slot: 'doodleFill' }, stroke: { slot: 'doodleStroke' }, strokeWidth: 6, offset: 0.03, texture: 'marker', wobble: 0.3 })],
            ['✧', t.sparkle, () => addShape('star4', { fill: null, stroke: { slot: 'doodleStroke' }, strokeWidth: 5, texture: 'crayon', w: 0.08 })],
            ['•', t.dot, () => addShape('dot', { fill: { slot: 'accent' }, w: 0.025 })],
            ['@', t.swirl, () => addShape('swirl', { fill: null, stroke: { slot: 'doodleStroke' }, strokeWidth: 6, texture: 'crayon', w: 0.14 })],
            ['♥', t.heart, () => addShape('heart', { fill: { slot: 'starPrimary' }, w: 0.1 })],
            ['❋', t.patch, () => addLayer({ id: uid(), kind: 'patch', shape: Math.random() > 0.5 ? 'star' : 'heart', pattern: (['glitter', 'stripes', 'dots', 'spiral', 'rhinestone', 'sunburst'] as const)[Math.floor(Math.random() * 6)], x: 0.5, y: 0.3, w: 0.16, rot: 0, paint: { slot: 'starPrimary' }, paint2: { slot: 'paper' }, seed: Math.floor(Math.random() * 999) })],
            ['〰', t.ribbon, () => addLayer({ id: uid(), kind: 'ribbon', of: subjectPhotoId(), x: 0.5, y: 0.5, w: 0.9, h: 0.8, rot: 0, width: 40, paint: { slot: 'doodleStroke' }, texture: 'crayon', points: [[0.5, 0], [0.85, 0.2], [0.2, 0.45], [0.8, 0.7], [0.5, 1]], weave: [false, true, false, true] } as RibbonLayer, false)],
            ['⩘', t.zigzag, () => addLayer({ id: uid(), kind: 'zigzag', x: 0.5, y: 0.9, w: 1.6, h: 1.6, rot: 0, count: 5, width: 12, paint: { slot: 'doodleStroke' }, texture: 'crayon' } as ZigzagLayer, false)],
            ['◯', t.autoOutline, () => { const pid = subjectPhotoId(); if (pid) addLayer({ id: uid(), kind: 'outline', of: pid, x: 0.5, y: 0.5, w: 1, rot: 0, distance: 20, width: 7, paint: { slot: 'doodleStroke' }, texture: 'chalk' }); }],
            ['▭', t.dialog, () => addLayer({ id: uid(), kind: 'ui', widget: 'dialog', x: 0.5, y: 0.2, w: 0.8, h: 0.16, rot: 0, icon: 'warning', title: 'ReyCam', message: t.defaultText, buttons: ['OK'], paint: { slot: 'frame' }, text: { slot: 'text' } } as UiLayer)],
            ['🗂', t.icon, () => addLayer({ id: uid(), kind: 'ui', widget: 'icon', icon: (['pc', 'trash', 'globe', 'folder', 'image', 'music'] as const)[Math.floor(Math.random() * 6)], label: 'file', x: 0.85, y: 0.3, w: 0.16, rot: 0, paint2: { slot: 'accent' } } as UiLayer)],
            ['↖', t.pointer, () => addLayer({ id: uid(), kind: 'ui', widget: 'pointer', x: 0.6, y: 0.6, w: 0.07, rot: 0 } as UiLayer)],
            ['▥', t.toolbox, () => addLayer({ id: uid(), kind: 'ui', widget: 'toolbox', x: 0.9, y: 0.45, w: 0.13, h: 0.45, rot: 0, paint2: { slot: 'accent' } } as UiLayer)],
            ['♻', t.bin, () => addLayer({ id: uid(), kind: 'ui', widget: 'bin', x: 0.8, y: 0.85, w: 0.13, rot: 0, paint2: { slot: 'accent' } } as UiLayer)],
            ['📁', t.folder, () => addLayer({ id: uid(), kind: 'ui', widget: 'folder', label: '.zip', x: 0.2, y: 0.85, w: 0.15, rot: 0, paint2: { slot: 'accent' } } as UiLayer)]
          ] as [string, string, () => void][]).map(([ico, label, fn]) => (
            <button key={label} type="button" className="col-add" onClick={fn}><span>{ico}</span>{label}</button>
          ))}
        </div>
        <div className="col-row"><span className="col-label">{t.tools}</span></div>
        <div className="col-add-grid">
          {TOOLS.map((tool) => (
            <button key={tool.id} type="button" className="col-add" disabled={tool.needsPhoto && !subjectPhotoId()} onClick={() => {
              const layer = tool.make({ id: uid(), photo: subjectPhotoId(), t });
              // Full canvas effects go right above the photos, the rest on top.
              const below = layer.kind === 'scribble' || (layer.kind === 'waves' && layer.mode === 'contour') || (layer.kind === 'zigzag');
              addLayer(layer, !below);
            }}><span>{tool.icon}</span>{t[tool.label] as string}</button>
          ))}
        </div>
        {STICKER_GROUPS.map((g) => (
          <div key={g.id}>
            <div className="col-row"><span className="col-label">{g.id === 'felt' ? t.stickersFelt : g.id === 'nature' ? t.stickersNature : g.id === 'craft' ? t.stickersCraft : t.stickersPack}</span></div>
            <div className="col-sticker-grid">
              {g.arts.map((art) => (
                <button key={art} type="button" className="col-sticker" aria-label={stickerName(lang, art)} title={stickerName(lang, art)} onClick={() => addSticker(art)}>
                  <StickerThumb art={art} />
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="note">{t.stickerHint}</p>
        <div className="col-row">
          <span className="col-label">{t.scatter}</span>
          {range('N', scatterN, 4, 40, 1, setScatterN)}
          <button type="button" className="col-chip on" onClick={() => scatter()}>🎲 {t.shuffle}</button>
        </div>
        {s && s.kind === 'shape' && (() => {
          const l = s as ShapeLayer;
          const mats: [Material, string][] = [['flat', t.matFlat], ['holo', t.matHolo], ['pastel', t.matPastel], ['metallic', t.matMetallic], ['pearl', t.matPearl], ['puffy', t.matPuffy]];
          const texs: [Texture, string][] = [['none', t.texNone], ['paper', t.texPaper], ['marker', t.marker], ['crayon', t.crayon], ['chalk', t.chalk]];
          return (
            <>
              {l.fill !== null && <div className="col-row"><span className="col-label">{t.material}</span>{mats.map(([m, label]) => chip((l.material ?? 'flat') === m, label, () => mutate((d) => { (d.layers.find((x) => x.id === l.id) as ShapeLayer).material = m; }), m))}</div>}
              <div className="col-row"><span className="col-label">{t.texture}</span>{texs.map(([x, label]) => chip((l.texture ?? 'none') === x, label, () => mutate((d) => { (d.layers.find((y) => y.id === l.id) as ShapeLayer).texture = x; }), x))}</div>
              {(l.stroke || l.fill === null) && range(t.strokeWidth, l.strokeWidth ?? 6, 1, 30, 1, (v) => setL<ShapeLayer>(l.id, (x) => { x.strokeWidth = v; }))}
              {l.shape === 'burst' && range(t.points, l.points ?? 18, 8, 40, 1, (v) => setL<ShapeLayer>(l.id, (x) => { x.points = v; }))}
              {(l.shape === 'star5' || l.shape === 'paperStar' || l.shape === 'burst') && range(t.hand, l.wobble ?? 0, 0, 1, 0.05, (v) => setL<ShapeLayer>(l.id, (x) => { x.wobble = v; }))}
              <div className="col-row">{chip(!!l.behind, t.weave, () => mutate((d) => { const x = d.layers.find((y) => y.id === l.id) as ShapeLayer; x.behind = x.behind ? undefined : subjectPhotoId(); }))}</div>
            </>
          );
        })()}
        {s && s.kind === 'ribbon' && (
          <>
            <div className="col-row">{chip(mode === 'weave', '⇅ ' + t.weave, () => setMode(mode === 'weave' ? 'move' : 'weave'))}</div>
            {mode === 'weave' && <p className="note">{t.weaveHint}</p>}
            {range(t.width, (s as RibbonLayer).width, 6, 120, 1, (v) => setL<RibbonLayer>(s.id, (x) => { x.width = v; }))}
          </>
        )}
        {s && s.kind === 'zigzag' && range(t.lines, (s as ZigzagLayer).count, 2, 10, 1, (v) => setL<ZigzagLayer>(s.id, (x) => { x.count = v; }))}
        {s && s.kind === 'outline' && (
          <>
            {range(t.distance, s.distance, 0, 80, 1, (v) => setL<Layer>(s.id, (x) => { (x as typeof s).distance = v; }))}
            {range(t.width, s.width, 2, 30, 1, (v) => setL<Layer>(s.id, (x) => { (x as typeof s).width = v; }))}
          </>
        )}
        {s && s.kind === 'heads' && headsControls(s as HeadsLayer)}
        {s && s.kind !== 'photo' && s.kind !== 'subject' && paramControls(s)}
        {s && s.kind === 'ui' && (s.widget === 'dialog' || s.widget === 'icon' || s.widget === 'file' || s.widget === 'folder') && (
          <div className="col-fields">
            {s.widget === 'dialog' ? (
              <>
                <input className="text-input" value={s.title ?? ''} onChange={(e) => setL<UiLayer>(s.id, (x) => { x.title = e.target.value; })} />
                <textarea className="text-input" value={s.message ?? ''} onChange={(e) => setL<UiLayer>(s.id, (x) => { x.message = e.target.value; })} />
                <input className="text-input" value={(s.buttons ?? []).join(', ')} onChange={(e) => setL<UiLayer>(s.id, (x) => { x.buttons = e.target.value.split(',').map((v) => v.trim()).filter(Boolean); })} />
              </>
            ) : <input className="text-input" value={s.label ?? ''} onChange={(e) => setL<UiLayer>(s.id, (x) => { x.label = e.target.value; })} />}
          </div>
        )}
      </>
    );
  };

  const panelDraw = () => (
    <>
      <p className="note">{t.drawHint}</p>
      <div className="col-row">
        {chip(mode === 'draw', '✎ ' + t.tabDraw, () => setMode(mode === 'draw' ? 'move' : 'draw'))}
        {(['marker', 'crayon', 'chalk', 'pencil'] as const).map((b) => chip(brush.type === b, t[b], () => { setBrush((x) => ({ ...x, type: b })); setMode('draw'); }, b))}
      </div>
      <div className="col-row">
        <button type="button" className="col-swatch-btn" onClick={() => setColorTarget({ kind: 'brush' })}><span className="col-swatch" style={{ background: brush.color }} /></button>
        {range(t.width, brush.width, 2, 60, 1, (v) => setBrush((b) => ({ ...b, width: v })))}
      </div>
      <button type="button" className="btn small ghost" onClick={() => mutate((d) => { d.layers.forEach((l) => { if (l.kind === 'draw') (l as DrawLayer).strokes = []; }); })}>{t.clearDraw}</button>
    </>
  );

  const panelText = () => {
    const s = sel;
    return (
      <>
        <div className="col-row">
          <button type="button" className="col-chip on" onClick={() => addLayer({ id: uid(), kind: 'text', text: t.defaultText, font: 'script', paint: { slot: 'text' }, size: 0.07, x: 0.5, y: 0.85, w: 0.4, rot: -4 } as TextLayer)}>＋ {t.addText}</button>
          <button type="button" className="col-chip on" onClick={() => addLayer({ id: uid(), kind: 'tiles', text: t.defaultWord, tiles: [{ slot: 'paper' }, { slot: 'tintSecondary' }, { slot: 'starPrimary' }], letters: [{ slot: 'tint' }, { slot: 'doodleStroke' }], x: 0.5, y: 0.12, w: 0.5, rot: -3, seed: Math.floor(Math.random() * 999) })}>＋ {t.addLetters}</button>
          <button type="button" className="col-chip on" onClick={() => addLayer({ id: uid(), kind: 'pattern', word: t.defaultWord, paint: { slot: 'text' }, rows: 8, x: 0.5, y: 0.5, w: 0.9, h: 0.5, rot: 0 }, false)}>＋ {t.addPattern}</button>
          <button type="button" className="col-chip on" onClick={() => addLayer({ id: uid(), kind: 'text', text: t.defaultTitle, font: 'brush', paint: { slot: 'starPrimary' }, stroke: { color: '#FFFFFF' }, strokeWidth: 14, texture: 'paper', size: 0.11, x: 0.5, y: 0.14, w: 0.6, rot: -4 } as TextLayer)}>＋ {t.titleTool}</button>
          <button type="button" className="col-chip on" onClick={() => addLayer({ id: uid(), kind: 'text', text: t.defaultLabel, font: 'typewriter', paint: { color: '#111111' }, bg: { color: '#FFFFFF' }, bgStyle: 'tag', size: 0.035, x: 0.3, y: 0.8, w: 0.3, rot: -6 } as TextLayer)}>＋ {t.labelTool}</button>
          <button type="button" className="col-chip on" onClick={() => addLayer({ id: uid(), kind: 'text', text: 'XOXO', font: 'typewriter', paint: { color: '#111111' }, bg: { slot: 'paper' }, bgStyle: 'tape', size: 0.035, x: 0.7, y: 0.9, w: 0.3, rot: 4 } as TextLayer)}>＋ {t.tapeTool}</button>
        </div>
        {s && (s.kind === 'text' || s.kind === 'tiles' || s.kind === 'pattern') && (
          <div className="col-fields">
            <textarea className="text-input" value={s.kind === 'pattern' ? s.word : s.text} onChange={(e) => setL<Layer>(s.id, (x) => { if (x.kind === 'pattern') x.word = e.target.value; else (x as TextLayer).text = e.target.value; })} />
            {s.kind === 'text' && (
              <>
                <div className="col-row">{(['script', 'marker', 'pixel', 'sans', 'serif', 'brush', 'typewriter', 'display'] as const).map((f) => chip(s.font === f, t[('font' + f[0].toUpperCase() + f.slice(1)) as 'fontScript'], () => mutate((d) => { (d.layers.find((x) => x.id === s.id) as TextLayer).font = f; }), f))}</div>
                {range(t.size, s.size, 0.02, 0.25, 0.005, (v) => setL<TextLayer>(s.id, (x) => { x.size = v; }))}
                <div className="col-row">
                  <span className="col-label">{t.textBg}</span>
                  {chip(!s.bg, t.frameNone, () => mutate((d) => { const x = d.layers.find((y) => y.id === s.id) as TextLayer; delete x.bg; }), 'nobg')}
                  {(['strip', 'tag', 'tape'] as const).map((b) => chip(!!s.bg && (s.bgStyle ?? 'strip') === b, t[('bg' + b[0].toUpperCase() + b.slice(1)) as 'bgStrip'], () => mutate((d) => { const x = d.layers.find((y) => y.id === s.id) as TextLayer; x.bg = x.bg ?? { slot: 'paper' }; x.bgStyle = b; }), b))}
                </div>
                <div className="col-row">{chip(!!s.stroke, t.outlineText, () => mutate((d) => { const x = d.layers.find((y) => y.id === s.id) as TextLayer; if (x.stroke) delete x.stroke; else { x.stroke = { color: '#FFFFFF' }; x.strokeWidth = x.strokeWidth ?? 12; } }))}</div>
                {s.stroke && range(t.strokeWidth, s.strokeWidth ?? 12, 2, 40, 1, (v) => setL<TextLayer>(s.id, (x) => { x.strokeWidth = v; }))}
              </>
            )}
            {s.kind === 'pattern' && range(t.lines, s.rows, 3, 20, 1, (v) => setL<Layer>(s.id, (x) => { (x as typeof s).rows = v; }))}
          </div>
        )}
      </>
    );
  };

  const panelColors = () => (
    <>
      <div className="col-row"><span className="col-label">{t.slots}</span></div>
      <div className="col-slots">
        {usedSlots(doc!).map((slot) => (
          <button key={slot} type="button" className="col-slot" onClick={() => setColorTarget({ kind: 'slot', slot })}>
            <span className="col-swatch" style={{ background: doc!.palette[slot] }} />
            <span>{slotName(lang, slot)}</span>
          </button>
        ))}
      </div>
      <div className="col-row">
        <span className="col-label">{t.palettes}</span>
        <button type="button" className="col-chip on" onClick={shuffle}>🎲 {t.shufflePalette}</button>
      </div>
      <div className="col-presets">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" className="col-preset" onClick={() => applyPreset(p.id)}>
            <span className="col-preset-dots">{['background', 'backgroundSecondary', 'starPrimary', 'doodleFill', 'tint'].map((k) => <i key={k} style={{ background: p.colors[k] }} />)}</span>
            <span>{p.name[lang] ?? p.name.en}</span>
          </button>
        ))}
      </div>
    </>
  );

  const panelLayers = () => (
    <div className="col-layers">
      {[...doc!.layers].reverse().map((l, ri) => {
        const i = doc!.layers.length - 1 - ri;
        return (
          <div key={l.id} className={selected === l.id ? 'col-layer on' : 'col-layer'} onClick={() => setSelected(l.id)}>
            <LayerThumb doc={doc!} layer={l} photos={photos} />
            <span className="col-layer-name">{layerName(l)}</span>
            <button type="button" aria-label={l.hidden ? t.show : t.hide} onClick={(e) => { e.stopPropagation(); mutate((d) => { d.layers[i].hidden = !d.layers[i].hidden; }); }}>{l.hidden ? '◌' : '👁'}</button>
            <button type="button" aria-label={l.locked ? t.unlock : t.lock} onClick={(e) => { e.stopPropagation(); mutate((d) => { d.layers[i].locked = !d.layers[i].locked; }); }}>{l.locked ? '🔒' : '🔓'}</button>
            <button type="button" aria-label={t.forward} disabled={i === doc!.layers.length - 1} onClick={(e) => { e.stopPropagation(); mutate((d) => { const [x] = d.layers.splice(i, 1); d.layers.splice(i + 1, 0, x); }); }}>▲</button>
            <button type="button" aria-label={t.backward} disabled={i <= 1} onClick={(e) => { e.stopPropagation(); mutate((d) => { const [x] = d.layers.splice(i, 1); d.layers.splice(i - 1, 0, x); }); }}>▼</button>
          </div>
        );
      })}
    </div>
  );

  function layerName(l: Layer): string {
    switch (l.kind) {
      case 'background': return t.tabBackground;
      case 'photo': return t.tabPhoto + ((l as PhotoLayer).cutout !== 'none' ? ' · ' + t.tabCutout : '');
      case 'subject': return t.tabCutout;
      case 'shape': { const s = l as ShapeLayer; return s.material && s.material !== 'flat' ? t.holo : s.shape === 'burst' ? t.burst : s.shape === 'heart' ? t.heart : s.shape === 'dot' ? t.dot : s.shape === 'star4' || s.shape === 'sparkle' ? t.sparkle : s.shape === 'paperStar' ? t.paperStar : s.shape === 'swirl' ? t.swirl : t.doodleStar; }
      case 'patch': return t.patch;
      case 'text': return '“' + (l as TextLayer).text.slice(0, 16) + '”';
      case 'tiles': return t.addLetters;
      case 'pattern': return t.addPattern;
      case 'ui': return (l as UiLayer).widget === 'dialog' ? t.dialog : (l as UiLayer).label || t.icon;
      case 'ribbon': return t.ribbon;
      case 'zigzag': return t.zigzag;
      case 'outline': return t.autoOutline;
      case 'draw': return t.tabDraw;
      case 'heads': return t.headsTool;
      case 'bubble': return t.bubbleTool;
      case 'torn': return t.tornTool;
      case 'sketch': return t.sketchTool;
      case 'scribble': return t.scribbleTool;
      case 'cropwin': return t.cropTool;
      case 'patchwork': return t.patchworkTool;
      case 'layout': return t.layoutTool;
      case 'boxes': return t.boxesTool;
      case 'waves': return (l as { mode?: string }).mode === 'contour' ? t.liquidTool : t.wavesTool;
      case 'sticker': return stickerName(lang, (l as StickerLayer).art);
      case 'slices': return t.slicesTool;
      case 'leak': return t.leakTool;
      case 'grunge': return t.grungeTool;
      case 'mosaic': return t.mosaicTool;
      case 'ornament': return t.ornamentTool;
      case 'punch': return t.punchTool;
      case 'threshold': return t.thresholdTool;
      case 'frost': return t.frostTool;
      case 'facedoodle': return t.faceDoodleTool;
    }
    return '';
  }

  // Selected element action bar.
  const selectionBar = () => {
    if (!sel || sel.kind === 'background' || !doc) return null;
    const i = doc.layers.findIndex((l) => l.id === sel.id);
    return (
      <div className="col-selbar">
        <div className="col-selbar-actions">
          <button type="button" onClick={() => { const copy = clone(sel); copy.id = uid(); copy.x += 0.04; copy.y += 0.04; mutate((d) => { d.layers.splice(i + 1, 0, copy); }); setSelected(copy.id); }}>⧉<span>{t.duplicate}</span></button>
          <button type="button" onClick={() => mutate((d) => { d.layers[i].flip = !d.layers[i].flip; })}>⇋<span>{t.flip}</span></button>
          <button type="button" onClick={() => mutate((d) => { d.layers[i].locked = !d.layers[i].locked; })}>{sel.locked ? '🔒' : '🔓'}<span>{sel.locked ? t.unlock : t.lock}</span></button>
          <button type="button" disabled={i === doc.layers.length - 1} onClick={() => mutate((d) => { const [x] = d.layers.splice(i, 1); d.layers.splice(i + 1, 0, x); })}>▲<span>{t.forward}</span></button>
          <button type="button" disabled={i <= 1} onClick={() => mutate((d) => { const [x] = d.layers.splice(i, 1); d.layers.splice(i - 1, 0, x); })}>▼<span>{t.backward}</span></button>
          <button type="button" className="danger" onClick={() => { mutate((d) => { d.layers.splice(i, 1); }); setSelected(null); }}>🗑<span>{t.remove}</span></button>
        </div>
        {sel.kind !== 'draw' && (
          <div className="col-selbar-ranges">
            {range(t.size, Math.round(sel.w * 100) / 100, 0.02, 2, 0.01, (v) => setL<Layer>(sel.id, (x) => { x.w = v; }), 'size')}
            {range(t.rotate, Math.round(sel.rot), -180, 180, 1, (v) => setL<Layer>(sel.id, (x) => { x.rot = v; }), 'rot')}
            {range(t.opacity, sel.opacity ?? 1, 0.05, 1, 0.05, (v) => setL<Layer>(sel.id, (x) => { x.opacity = v; }), 'op')}
          </div>
        )}
        {elementColors(sel)}
      </div>
    );
  };

  // ------------------------------------------------------------ screens

  if (screen === 'gallery') {
    const list = filter === 'mine' ? [] : templates.filter((x) => filter === 'all' || x.tags.includes(filter as never));
    return (
      <div className="col-page">
        <header className="page-head">
          <button type="button" className="page-back" aria-label={appT.back} onClick={onClose}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg></button>
          <div className="page-title"><span>{t.title} <span className="col-holo-star">★</span></span><small>{t.cardSub}</small></div>
          <span className="page-count">{templates.length}</span>
        </header>
        <div className="col-filters">
          {chip(filter === 'all', t.all, () => setFilter('all'))}
          {chip(filter === 'mine', `${t.mine} (${drafts.length})`, () => setFilter('mine'))}
          {TAGS.filter((tag) => templates.some((x) => x.tags.includes(tag))).map((tag) => chip(filter === tag, t[('tag' + tag[0].toUpperCase() + tag.slice(1)) as 'tagStars'], () => setFilter(tag), tag))}
        </div>
        <div className="col-gallery">
          {filter === 'mine' && !drafts.length && <p className="note">{t.emptyMine}</p>}
          {filter === 'mine' && drafts.map((d) => (
            <div key={d.id} className="col-card">
              <button type="button" className="col-card-btn" onClick={() => openDraft(d.id)}><img src={d.thumb} alt="" /><span>{templates.find((x) => x.id === d.template)?.name[lang] ?? d.template}</span></button>
              <button type="button" className="col-card-del" aria-label={t.remove} onClick={async () => { await deleteDraft(d.id); setDrafts(await listDrafts()); }}>×</button>
            </div>
          ))}
          {list.map((tp) => (
            <button key={tp.id} type="button" className="col-card col-card-btn" onClick={() => { setTemplate(tp); setPicked(Array(tp.photos).fill(null)); setScreen('pick'); }}>
              {previews[tp.id] ? <img src={previews[tp.id]} alt="" /> : <span className="thumb-ph" style={{ aspectRatio: String(RATIOS[tp.ratio as keyof typeof RATIOS] ?? 1) }} />}
              <span>{tp.name[lang] ?? tp.name.en}</span>
            </button>
          ))}
        </div>
        {busy && <div className="col-busy"><span className="col-spinner" />{busy}</div>}
      </div>
    );
  }

  if (screen === 'pick' && template) {
    return (
      <div className="col-page">
        <header className="page-head">
          <button type="button" className="page-back" aria-label={appT.back} onClick={() => setScreen('gallery')}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg></button>
          <div className="page-title"><span>{template.name[lang] ?? template.name.en}</span><small>{template.photos > 1 ? t.pickPhotos.replace('{n}', String(template.photos)) : t.pickPhoto}</small></div>
          <span className="page-spacer" />
        </header>
        <div className="col-pick">
          {previews[template.id] && <img className="col-pick-preview" src={previews[template.id]} alt="" />}
          <p className="note">{t.pickHint}</p>
          <div className="col-pick-slots">
            {Array.from({ length: template.photos }, (_, i) => (
              <label key={i} className="col-pick-slot">
                {picked[i] ? <img src={picked[i]!.toDataURL('image/jpeg', 0.6)} alt="" /> : <span className="col-pick-plus">＋</span>}
                <span>{t.photoN} {i + 1}{i > 0 ? ' · ' + t.useSame : ''}</span>
                <input type="file" accept="image/*,video/*,.heic,.heif" onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  if (f.type.startsWith('video/')) { showToast(t.videoSoon); return; }
                  setBusy(t.loading);
                  try { const c = await fileToCanvas(f); setPicked((p) => { const n = [...p]; n[i] = c; return n; }); } finally { setBusy(''); }
                }} />
              </label>
            ))}
          </div>
          <button type="button" className="welcome-cta col-start" disabled={!picked[0] || !!busy} onClick={() => askFilter(template, picked)}>{t.start}</button>
          <button type="button" className="welcome-demo" disabled={!!busy} onClick={async () => { const s = await loadSample(); askFilter(template, [s, null]); }}>{t.sample}</button>
        </div>
        {filterAsk && filterSheet(template)}
        {busy && <div className="col-busy"><span className="col-spinner" />{busy}</div>}
      </div>
    );
  }

  if (!doc) return null;
  const tabLabel: Record<Tab, string> = { template: t.tabTemplate, cutout: t.tabCutout, photo: t.tabPhoto, background: t.tabBackground, stickers: t.tabStickers, draw: t.tabDraw, text: t.tabText, colors: t.tabColors, layers: t.tabLayers };
  const tabIcon: Record<Tab, string> = { template: '▦', cutout: '✂', photo: '◐', background: '▨', stickers: '★', draw: '✎', text: 'T', colors: '🎨', layers: '☰' };
  const pickerTitle = colorTarget?.kind === 'slot' ? slotName(lang, colorTarget.slot) : colorTarget?.kind === 'brush' ? t.tabDraw : t.elementColor;
  const pickerPaint = colorTarget?.kind === 'paint' ? paintsOf(layerById(colorTarget.layer)!)?.[colorTarget.index] : undefined;

  return (
    <div className={isMobile ? 'col-page col-editor mobile' : 'col-page col-editor'}>
      <header className="col-top">
        <button type="button" className="page-back" aria-label={appT.back} onClick={() => { setScreen('gallery'); listDrafts().then(setDrafts); }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg></button>
        <div className="col-top-mid">
          <button type="button" className="float-btn" aria-label={appT.undo} disabled={!history.current.canUndo} onClick={() => { const p = history.current.undo(doc); if (p) setDocState(p); }}>↶</button>
          <button type="button" className="float-btn" aria-label={appT.redo} disabled={!history.current.canRedo} onClick={() => { const n = history.current.redo(doc); if (n) setDocState(n); }}>↷</button>
        </div>
        <button type="button" className="btn primary pill-btn" onClick={() => setExportOpen(true)}>{appT.export}</button>
      </header>
      <div className="col-stage" ref={stageRef}>
        <div className="col-canvas-wrap" style={{ transform: refine.zoom > 1 && (mode === 'erase' || mode === 'restore' || mode === 'lasso') ? `scale(${refine.zoom})` : undefined }}>
          <canvas
            ref={canvasRef}
            className={'col-canvas mode-' + mode}
            style={{ width: cw, height: ch }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>
        {mode === 'eyedrop' && <div className="col-hint">{t.eyedropperHint}</div>}
      </div>
      {selectionBar()}
      <div className="col-panel">
        {tab === 'template' && panelTemplate()}
        {tab === 'cutout' && panelCutout()}
        {tab === 'photo' && panelPhoto()}
        {tab === 'background' && panelBackground()}
        {tab === 'stickers' && panelStickers()}
        {tab === 'draw' && panelDraw()}
        {tab === 'text' && panelText()}
        {tab === 'colors' && panelColors()}
        {tab === 'layers' && panelLayers()}
      </div>
      <nav className="col-tabs">
        {TABS.map((x) => (
          <button key={x} type="button" className={tab === x ? 'col-tab on' : 'col-tab'} onClick={() => { setTab(x); if (x !== 'draw' && mode === 'draw') setMode('move'); if (x !== 'cutout' && (mode === 'erase' || mode === 'restore' || mode === 'lasso')) setMode('move'); }}>
            <span>{tabIcon[x]}</span>{tabLabel[x]}
          </button>
        ))}
      </nav>

      {colorTarget && (
        <div className="col-picker-wrap" onClick={() => setColorTarget(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <ColorPicker
              value={colorValue(colorTarget)}
              t={t}
              title={pickerTitle}
              linked={colorTarget.kind === 'paint' ? !isOverridden(pickerPaint) : undefined}
              onRelink={() => relink(colorTarget)}
              onChange={(hex, final) => applyColor(hex, final)}
              onEyedropper={() => { setMode('eyedrop'); }}
              onClose={() => { pushRecent(colorValue(colorTarget).slice(0, 7)); setColorTarget(null); }}
            />
          </div>
        </div>
      )}
      {mode === 'eyedrop' && colorTarget && <div className="col-eyedrop-catch" />}

      {exportOpen && (
        <div className="modal-wrap" onClick={() => setExportOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t.exportTitle}</h3>
            <div className="col-row"><span className="col-label">{t.ratio}</span>{(['9:16', '4:5', '3:4', '1:1', '4:3'] as const).map((r) => chip(doc.ratio === r, r, () => mutate((d) => { d.ratio = r; }), r))}</div>
            <div className="col-row"><span className="col-label">{t.format}</span>{chip(exportFmt === 'image/jpeg', 'JPEG', () => setExportFmt('image/jpeg'))}{chip(exportFmt === 'image/png', 'PNG', () => setExportFmt('image/png'))}</div>
            <div className="col-row">{chip(doc.dateStamp, t.dateStamp, () => mutate((d) => { d.dateStamp = !d.dateStamp; }))}</div>
            <div className="row">
              <button type="button" className="btn" onClick={() => setExportOpen(false)}>{appT.cancel}</button>
              <button type="button" className="btn primary" disabled={!!busy} onClick={doExport}>{t.share}</button>
            </div>
          </div>
        </div>
      )}
      {busy && <div className="col-busy"><span className="col-spinner" />{busy}</div>}
    </div>
  );
}

/** Library button preview of one sticker art. */
function StickerThumb({ art }: { art: StickerArt }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const s = 56 * Math.min(2, window.devicePixelRatio || 1);
    c.width = s; c.height = s;
    const ctx = c.getContext('2d')!;
    const k = Math.min(1, 1 / (STICKER_ASPECT[art] ?? 1));
    ctx.translate(s / 2, s / 2);
    const [c1, c2] = STICKER_DEFAULTS[art];
    try { drawStickerArt(ctx, art, s * 0.8 * k, c1, c2, 1); } catch { /* preview only */ }
  }, [art]);
  return <canvas ref={ref} aria-hidden="true" />;
}

/** Small thumbnail of one layer for the Layers panel. */
function LayerThumb({ doc, layer, photos }: { doc: CollageDoc; layer: Layer; photos: CollagePhoto[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify(layer) + JSON.stringify(doc.palette) + doc.ratio;
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const [w, h] = sizeFor(doc, 64);
    c.width = w; c.height = h;
    const one: CollageDoc = { ...doc, layers: layer.kind === 'subject' ? doc.layers.filter((l) => l.id === (layer as SubjectLayer).of || l.id === layer.id) : [{ ...layer, hidden: false }], dateStamp: false, finish: undefined };
    try { renderCollage(c.getContext('2d')!, one, photos, w, h, { photoMax: 160 }); } catch { /* thumbnail only */ }
  }, [key, photos]);
  return <canvas ref={ref} className="col-layer-thumb" />;
}
