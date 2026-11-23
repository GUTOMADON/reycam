import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pipeline } from './engine/pipeline';
import { RECIPES, CATEGORIES, findRecipe } from './engine/recipes';
import type { EditState, Recipe } from './engine/types';
import { exportVideoWebCodecs, webCodecsAvailable } from './engine/videoExport';
import { autoEnhance, defaultEdit, storeDateStyle, deliverBlob, loadPresets, storePresets, syncPresets, zeroAdj, type Preset } from './engine/utils';
import { AUTO, LANGUAGES, RTL, browserLanguage, isComplete, pickSupported, strings } from './i18n';
import { LogoMark, Wordmark } from './components/Logo';
import { CropPanel, FramePanel, GradingPanel, HslPanel, LayerPanel, Pills, RetouchPanel, SliderGroup, StampPanel } from './components/Panels';
import { CAT_KEY, Heart, Library, descOf } from './components/Library';

type Media = { type: 'photo' | 'video'; el: HTMLImageElement | HTMLVideoElement; w: number; h: number; name: string; sample?: boolean; file?: File };
type ExportOpts = { format: string; quality: number; size: string; fps: number };

const PANELS = ['light', 'color', 'hsl', 'curve', 'grading', 'detail', 'effects', 'retouch', 'frame', 'crop', 'stamp', 'layer'];
const FAV_KEY = 'reycam.favs.v1';
const LANG_KEY = 'reycam.lang.v3';
const NO_DATE_KEY = 'reycam.noDate.v1';
const readPref = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
const writePref = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } };
const loadFavs = (): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')); } catch { return new Set(); } };
/** Simple line icons for the phone tab bar. */
const TAB_ICON: Record<string, string> = {
  looks: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2zM4 15l4-4 5 5M13 13l2-2 5 5',
  light: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z',
  color: 'M12 3a9 9 0 100 18c1 0 1.5-.8 1.2-1.7-.4-1 .3-2.3 1.5-2.3H17a4 4 0 004-4c0-5-4-10-9-10zM7.5 11.5h.01M10 7.5h.01M15 8h.01',
  hsl: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 3v18M3.5 9h17M3.5 15h17',
  curve: 'M4 20C10 20 9 4 20 4M4 4v16h16',
  grading: 'M8 9a5 5 0 100 10 5 5 0 000-10zM16 9a5 5 0 100 10 5 5 0 000-10zM12 3a5 5 0 100 10 5 5 0 000-10z',
  detail: 'M4 4h6v6H4zM14 14h6v6h-6zM14 4h6v6h-6zM4 14h6v6H4z',
  effects: 'M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  retouch: 'M15 4l5 5L9 20H4v-5zM13 6l5 5',
  frame: 'M3 3h18v18H3zM7 7h10v10H7z',
  crop: 'M6 2v16h16M2 6h16v16',
  stamp: 'M4 7h16v13H4zM8 3v4M16 3v4M8 12h3M8 16h8',
  layer: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5'
};
function TabIcon({ id }: { id: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={TAB_ICON[id] || TAB_ICON.effects} />
    </svg>
  );
}

const PANEL_KEY: Record<string, string> = {
  looks: 'pLooks', light: 'pLight', curve: 'pCurve', color: 'pColor', hsl: 'pHsl', grading: 'pGrading', detail: 'pDetail',
  effects: 'pEffects', retouch: 'pRetouch', frame: 'pFrame', crop: 'pCrop', stamp: 'pStamp', layer: 'pLayer'
};

function pickMime(): string {
  const list = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  if (typeof MediaRecorder === 'undefined') return '';
  return list.find((m) => MediaRecorder.isTypeSupported(m)) || '';
}

export default function App() {
  // Language priority: saved manual choice, then the phone or browser language, then the server suggestion.
  const [langPref, setLangPref] = useState(() => readPref(LANG_KEY) || AUTO);
  const [serverLang, setServerLang] = useState<string | null>(null);
  const autoLang = browserLanguage() || serverLang || 'en';
  const lang = langPref === AUTO ? autoLang : langPref;
  const t = useMemo(() => strings(lang), [lang]);
  const [noDate, setNoDateState] = useState(() => readPref(NO_DATE_KEY) === '1');
  const noDateRef = useRef(noDate);
  noDateRef.current = noDate;
  const [edit, setEditState] = useState<EditState>(defaultEdit);
  const [media, setMedia] = useState<Media | null>(null);
  const [cat, setCat] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [panel, setPanel] = useState('light');
  const [tab, setTab] = useState('looks');
  const [band, setBand] = useState('red');
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [visibleThumbIds, setVisibleThumbIds] = useState<Set<string>>(new Set());
  const [comparing, setComparing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportOpts, setExportOpts] = useState<ExportOpts>({ format: 'image/jpeg', quality: 95, size: 'full', fps: 30 });
  const [busy, setBusy] = useState<{ label: string; pct: number } | null>(null);
  const [toast, setToast] = useState('');
  const [presets, setPresets] = useState<Preset[]>(loadPresets);
  const [presetDialog, setPresetDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [hasOverlay, setHasOverlay] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fatal, setFatal] = useState('');
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 1099px)').matches);
  const [favs, setFavs] = useState<Set<string>>(loadFavs);
  const [moreOpen, setMoreOpen] = useState(false);
  const [page, setPage] = useState<null | 'filters' | 'edit' | 'upload'>(null);
  const [tool, setTool] = useState<string | null>(null);
  const [welcome, setWelcome] = useState(true);

  const pipeRef = useRef<Pipeline | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRef = useRef<Media | null>(null);
  const editRef = useRef(edit);
  const comparingRef = useRef(false);
  const exportingRef = useRef(false);
  const dirty = useRef(true);
  const mediaVersion = useRef(0);
  const uploadedVersion = useRef(-1);
  const history = useRef<{ past: EditState[]; future: EditState[]; last: number }>({ past: [], future: [], last: 0 });
  const clipboard = useRef<EditState | null>(null);
  const audio = useRef<{ ctx: AudioContext; gain: GainNode; dest: MediaStreamAudioDestinationNode } | null>(null);
  const toastTimer = useRef<number>();
  const urls = useRef<string[]>([]);
  const cancelRef = useRef(false);
  const userPlaying = useRef(false);
  const stageBox = useRef({ w: 1000, h: 700 });
  const interactiveUntil = useRef(0);
  const pendingFull = useRef(false);
  const lastCost = useRef(0);
  const renderRef = useRef<() => void>(() => undefined);

  editRef.current = edit;
  mediaRef.current = media;
  comparingRef.current = comparing;

  const presetRecipes: Recipe[] = useMemo(
    () => presets.map((p) => ({ ...findRecipe(p.edit.camId), id: 'preset:' + p.id, name: p.name, cat: 'mine' as const, desc: findRecipe(p.edit.camId).name })),
    [presets]
  );
  const recipe = findRecipe(edit.camId);

  const showToast = useCallback((msg: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = window.setTimeout(() => setToast(''), 2800);
  }, []);

  /** Render the current media through the pipeline into any canvas. */
  const renderTo = useCallback((out: HTMLCanvasElement, maxSize: number, r: Recipe, e: EditState, plain: boolean) => {
    const pipe = pipeRef.current, m = mediaRef.current;
    if (!pipe || !m) return;
    const isVideo = m.type === 'video';
    const newFrame = isVideo || uploadedVersion.current !== mediaVersion.current;
    uploadedVersion.current = mediaVersion.current;
    const eff: EditState = noDateRef.current ? { ...e, stamp: 'off' } : e;
    // Preview only: keep the date at least about 9 css px tall on screen. Exports pass no minimum.
    let minStampPx = 0;
    if (out === canvasRef.current && out.width) { const shown = parseFloat(out.style.width) || out.width; minStampPx = 9 * (out.width / shown); }
    pipe.render({ source: m.el, srcW: m.w, srcH: m.h, recipe: r, edit: eff, isVideo, time: isVideo ? (m.el as HTMLVideoElement).currentTime : 0, plain, maxSize, newFrame, minStampPx }, out);
  }, []);

  /** Fit the preview canvas into the stage using the cached stage size (no layout reads). */
  const fitPreview = useCallback(() => {
    const c = canvasRef.current;
    if (!c || !c.width || !c.height) return;
    const { w, h } = stageBox.current;
    const s2 = Math.min(w / c.width, h / c.height);
    const cw = Math.max(1, Math.floor(c.width * s2)) + 'px', ch = Math.max(1, Math.floor(c.height * s2)) + 'px';
    if (c.style.width !== cw) c.style.width = cw;
    if (c.style.height !== ch) c.style.height = ch;
  }, []);

  const renderPreview = useCallback(() => {
    const c = canvasRef.current, m = mediaRef.current;
    if (!c || !m) return;
    const { w: sw, h: sh } = stageBox.current;
    const displaySize = Math.max(sw, sh);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    let size = m.type === 'video'
      ? Math.min(1280, Math.max(m.w, m.h), Math.round(displaySize * pixelRatio))
      : Math.min(isMobile ? 1200 : 2000, Math.max(m.w, m.h), Math.round(displaySize * pixelRatio));
    // While a slider is moving on a slow GPU, render smaller and sharpen up when it stops.
    const reduced = m.type === 'photo' && performance.now() < interactiveUntil.current && lastCost.current > 14;
    if (reduced) { size = Math.max(640, Math.round(size * 0.6)); pendingFull.current = true; }
    const t0 = performance.now();
    renderTo(c, size, findRecipe(editRef.current.camId), editRef.current, comparingRef.current);
    if (!reduced) { lastCost.current = performance.now() - t0; pendingFull.current = false; }
    fitPreview();
  }, [renderTo, isMobile, fitPreview]);
  renderRef.current = renderPreview;

  // Track the stage size without forcing layout on every frame
  useEffect(() => {
    const stage = canvasRef.current?.parentElement;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      stageBox.current = { w: Math.max(50, r.width), h: Math.max(50, r.height) };
      fitPreview();
      dirty.current = true;
    });
    ro.observe(stage);
    return () => ro.disconnect();
  }, [fitPreview, fatal]);

  // Engine bootstrap, fonts and sample photo
  useEffect(() => {
    try {
      pipeRef.current = new Pipeline();
    } catch (err: any) {
      setFatal(String(err?.message || err));
      return;
    }
    document.fonts?.load('20px VT323').then(() => { dirty.current = true; }).catch(() => undefined);
    const img = new Image();
    img.onload = () => {
      if (mediaRef.current && !mediaRef.current.sample) return;
      mediaVersion.current++;
      setMedia({ type: 'photo', el: img, w: img.naturalWidth, h: img.naturalHeight, name: 'sample.jpg', sample: true });
    };
    img.src = import.meta.env.BASE_URL + 'sample.jpg';
    syncPresets().then((list) => { if (list && list.length) setPresets(list); });
    const mq = window.matchMedia('(max-width: 1099px)');
    const onMq = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onMq);
    return () => mq.removeEventListener('change', onMq);
  }, []);

  // Render loop
  useEffect(() => {
    let raf = 0;
    let lastProg = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (exportingRef.current) return;
      const m = mediaRef.current;
      if (!m) return;
      if (m.type === 'video') {
        const v = m.el as HTMLVideoElement;
        if (v.readyState >= 2 && !v.paused) {
          renderPreview();
          const now = performance.now();
          if (now - lastProg > 200 && v.duration) { lastProg = now; setProgress(Math.round((v.currentTime / v.duration) * 1000)); }
          return;
        }
      }
      if (dirty.current) { dirty.current = false; renderPreview(); }
      else if (pendingFull.current && performance.now() > interactiveUntil.current) renderPreview();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [renderPreview]);

  useEffect(() => { dirty.current = true; }, [comparing, media, hasOverlay, isMobile]);

  // Thumbnails for every look, rebuilt when the media or presets change
  useEffect(() => {
    if (!media || !pipeRef.current) return;
    let cancelled = false;
    const list: { id: string; r: Recipe; e: EditState }[] = [];
    const base = { ...defaultEdit(), adj: zeroAdj(), aspect: '1:1', frame: 'none' as const, stamp: 'off' as const };
    RECIPES.forEach((r) => {
      if (visibleThumbIds.has(r.id)) list.push({ id: r.id, r, e: { ...base, camId: r.id } });
    });
    presets.forEach((p) => {
      if (visibleThumbIds.has('preset:' + p.id)) list.push({ id: 'preset:' + p.id, r: findRecipe(p.edit.camId), e: { ...p.edit, aspect: '1:1', frame: 'none', stamp: 'off' } });
    });
    const c = document.createElement('canvas');
    const acc: Record<string, string> = {};
    let i = 0;
    const step = () => {
      if (cancelled) return;
      if (exportingRef.current) { window.setTimeout(step, 300); return; }
      const t0 = performance.now();
      while (i < list.length && performance.now() - t0 < 10) {
        renderTo(c, 200, list[i].r, list[i].e, false);
        acc[list[i].id] = c.toDataURL('image/jpeg', 0.82);
        i++;
      }
      if (i >= list.length || i % 12 < 3) setThumbs({ ...acc });
      if (i < list.length) window.setTimeout(step, 24);
      else { setThumbs({ ...acc }); dirty.current = true; }
    };
    const id = window.setTimeout(step, 60);
    return () => { cancelled = true; window.clearTimeout(id); };
  }, [media, presets, renderTo, visibleThumbIds]);

  // Edits with undo history
  const commit = useCallback((next: EditState) => {
    const h = history.current;
    const now = Date.now();
    if (now - h.last > 600) {
      h.past.push(editRef.current);
      if (h.past.length > 150) h.past.shift();
      h.future = [];
    }
    h.last = now;
    editRef.current = next;
    interactiveUntil.current = performance.now() + 200;
    if (exportingRef.current) dirty.current = true;
    else { dirty.current = false; renderRef.current(); }
    setEditState(next);
  }, []);
  const setEdit = useCallback((patch: Partial<EditState>) => {
    if (patch.stampColor || patch.stampSize || patch.dateFormat) storeDateStyle(patch);
    commit({ ...editRef.current, ...patch });
  }, [commit]);
  const setAdj = useCallback((key: string, v: number) => commit({ ...editRef.current, adj: { ...editRef.current.adj, [key]: v } }), [commit]);
  const undo = useCallback(() => {
    const h = history.current;
    const prev = h.past.pop();
    if (!prev) return;
    h.future.push(editRef.current);
    h.last = 0;
    editRef.current = prev;
    dirty.current = true;
    setEditState(prev);
  }, []);
  const redo = useCallback(() => {
    const h = history.current;
    const next = h.future.pop();
    if (!next) return;
    h.past.push(editRef.current);
    h.last = 0;
    editRef.current = next;
    dirty.current = true;
    setEditState(next);
  }, []);

  const pickLook = useCallback((id: string) => {
    if (id.startsWith('preset:')) {
      const p = presets.find((x) => 'preset:' + x.id === id);
      if (p) commit({ ...p.edit, dateText: editRef.current.dateText });
      return;
    }
    setEdit({ camId: id, intensity: 100 });
  }, [presets, commit, setEdit]);

  /** Estimate the frame rate from presented frames, used for frame accurate export. */
  const detectFps = (v: HTMLVideoElement) => {
    const anyV = v as any;
    if (!anyV.requestVideoFrameCallback) return;
    const times: number[] = [];
    const wasMuted = v.muted;
    const onFrame = (_now: number, meta: any) => {
      times.push(meta.mediaTime);
      if (userPlaying.current) { v.muted = wasMuted; return; }
      if (times.length < 8) { anyV.requestVideoFrameCallback(onFrame); return; }
      v.pause();
      v.muted = wasMuted;
      let best = Infinity;
      for (let i = 1; i < times.length; i++) { const d = times[i] - times[i - 1]; if (d > 0.004 && d < best) best = d; }
      const fps = best < Infinity ? Math.round(1 / best) : 30;
      const snapped = [24, 25, 30, 48, 50, 60].reduce((a, b) => (Math.abs(b - fps) < Math.abs(a - fps) ? b : a), 30);
      setExportOpts((o) => ({ ...o, fps: snapped }));
      if (userPlaying.current) return;
      v.currentTime = 0;
      dirty.current = true;
    };
    anyV.requestVideoFrameCallback(onFrame);
    v.muted = true;
    v.play().catch(() => undefined);
  };

  // Opening files
  const openFile = useCallback((f: File | undefined | null) => {
    if (!f) return;
    const url = URL.createObjectURL(f);
    urls.current.push(url);
    while (urls.current.length > 3) URL.revokeObjectURL(urls.current.shift()!);
    const isVideo = f.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|mkv|3gp)$/i.test(f.name);
    if (isVideo) {
      const v = videoRef.current!;
      v.pause();
      v.onloadeddata = () => {
        mediaVersion.current++;
        v.loop = true;
        userPlaying.current = false;
        setPlaying(false);
        setProgress(0);
        setMedia({ type: 'video', el: v, w: v.videoWidth, h: v.videoHeight, name: f.name, file: f });
        detectFps(v);
        setTab('looks'); setPage(null); setWelcome(false);
      };
      v.onerror = () => showToast(t.useMedia);
      v.src = url;
      v.load();
      return;
    }
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      mediaVersion.current++;
      setMedia({ type: 'photo', el: img, w: img.naturalWidth, h: img.naturalHeight, name: f.name, file: f });
      setPlaying(false);
      setTab('looks'); setPage(null); setWelcome(false);
    };
    img.onerror = () => showToast(/hei[cf]/i.test(f.type + f.name) ? t.heicNote : t.useMedia);
    img.src = url;
  }, [showToast, t]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files || [])[0];
      if (f) openFile(f);
    };
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      if (e.key === '\\') setComparing(true);
    };
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === '\\') setComparing(false); };
    window.addEventListener('paste', onPaste);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('paste', onPaste); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp); };
  }, [openFile, undo, redo]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL.includes(lang) ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    if (langPref !== AUTO || browserLanguage()) return;
    let alive = true;
    fetch('/api/locale')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { const l = j && pickSupported([j.lang]); if (alive && l) setServerLang(l); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [langPref]);

  const chooseLang = (v: string) => { setLangPref(v); writePref(LANG_KEY, v); };
  const setNoDate = useCallback((on: boolean) => {
    setNoDateState(on);
    noDateRef.current = on;
    writePref(NO_DATE_KEY, on ? '1' : '0');
    dirty.current = true;
  }, []);

  // Video and sound
  const ensureAudio = () => {
    const v = videoRef.current;
    if (!v) return null;
    if (!audio.current) {
      try {
        const ctx = new AudioContext();
        const src = ctx.createMediaElementSource(v);
        const gain = ctx.createGain();
        gain.gain.value = muted ? 0 : 1;
        src.connect(gain).connect(ctx.destination);
        const dest = ctx.createMediaStreamDestination();
        src.connect(dest);
        audio.current = { ctx, gain, dest };
        v.muted = false;
      } catch {
        return null;
      }
    }
    audio.current.ctx.resume().catch(() => undefined);
    return audio.current;
  };
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v || media?.type !== 'video') return;
    ensureAudio();
    if (v.paused || !userPlaying.current) { userPlaying.current = true; v.play().catch(() => undefined); setPlaying(true); }
    else { userPlaying.current = false; v.pause(); setPlaying(false); dirty.current = true; }
  };
  const toggleMute = () => {
    const a = ensureAudio();
    const next = !muted;
    setMuted(next);
    if (a) a.gain.gain.value = next ? 0 : 1;
  };
  const seek = (val: number) => {
    const v = videoRef.current;
    if (v && v.duration) { v.currentTime = (val / 1000) * v.duration; }
    setProgress(val);
    const done = () => { dirty.current = true; v?.removeEventListener('seeked', done); };
    v?.addEventListener('seeked', done);
  };

  // Export
  const exportPhoto = async () => {
    const m = mediaRef.current;
    if (!m) return;
    setBusy({ label: t.exporting, pct: 0 });
    exportingRef.current = true;
    await new Promise((r) => setTimeout(r, 30));
    try {
      const out = document.createElement('canvas');
      const size = exportOpts.size === 'full' ? Infinity : Number(exportOpts.size);
      renderTo(out, size, recipe, edit, false);
      const ext = exportOpts.format === 'image/png' ? 'png' : exportOpts.format === 'image/webp' ? 'webp' : 'jpg';
      const blob: Blob | null = await new Promise((res) => out.toBlob(res, exportOpts.format, exportOpts.quality / 100));
      if (blob) {
        const inGallery = await deliverBlob(blob, `reycam_${Date.now()}.${ext}`, isMobile);
        showToast(`${inGallery ? t.savedToGallery : t.photoSaved} · ${out.width} × ${out.height}`);
      }
    } finally {
      exportingRef.current = false;
      dirty.current = true;
      setBusy(null);
    }
  };

  const exportVideoRealtime = async () => {
    const m = mediaRef.current;
    const v = videoRef.current;
    if (!m || !v || m.type !== 'video') return;
    const mime = pickMime();
    const out = document.createElement('canvas');
    if (!mime || !(out as any).captureStream) { showToast(t.needsBrowser); return; }
    const size = exportOpts.size === 'full' ? Infinity : Number(exportOpts.size);
    exportingRef.current = true;
    v.pause();
    v.loop = false;
    await new Promise<void>((res) => { v.onseeked = () => { v.onseeked = null; res(); }; v.currentTime = 0; });
    renderTo(out, size, recipe, edit, false);
    const stream: MediaStream = (out as any).captureStream(30);
    const a = ensureAudio();
    a?.dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
    const bitrate = Math.min(40_000_000, Math.max(4_000_000, out.width * out.height * 30 * 0.12));
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate, audioBitsPerSecond: 192_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const finished = new Promise<void>((res) => { rec.onstop = () => res(); });
    const anyV = v as any;
    let active = true;
    const draw = () => {
      if (!active) return;
      renderTo(out, size, recipe, edit, false);
      setBusy({ label: t.renderingVideo, pct: v.duration ? Math.round((v.currentTime / v.duration) * 100) : 0 });
      if (anyV.requestVideoFrameCallback) anyV.requestVideoFrameCallback(draw);
      else requestAnimationFrame(draw);
    };
    v.onended = () => { active = false; if (rec.state !== 'inactive') rec.stop(); };
    setBusy({ label: t.renderingVideo, pct: 0 });
    rec.start(500);
    if (audio.current) audio.current.gain.gain.value = 0;
    await v.play().catch(() => undefined);
    draw();
    await finished;
    v.onended = null;
    v.loop = true;
    if (audio.current) audio.current.gain.gain.value = muted ? 0 : 1;
    const blob = new Blob(chunks, { type: mime.split(';')[0] });
    await deliverBlob(blob, `reycam_${Date.now()}.${mime.includes('mp4') ? 'mp4' : 'webm'}`, isMobile);
    exportingRef.current = false;
    dirty.current = true;
    setPlaying(false);
    setBusy(null);
    showToast(`${t.videoExported} · ${out.width} × ${out.height}`);
  };

  const exportVideo = async () => {
    const m = mediaRef.current;
    const v = videoRef.current;
    if (!m || !v || m.type !== 'video') return;
    if (!webCodecsAvailable()) { exportVideoRealtime(); return; }
    const size = exportOpts.size === 'full' ? Infinity : Number(exportOpts.size);
    const out = document.createElement('canvas');
    cancelRef.current = false;
    exportingRef.current = true;
    setPlaying(false);
    v.loop = false;
    setBusy({ label: t.renderingVideo, pct: 0 });
    let blob: Blob | null = null;
    try {
      blob = await exportVideoWebCodecs({
        video: v,
        file: m.file || null,
        fps: exportOpts.fps,
        renderFrame: () => { renderTo(out, size, recipe, edit, false); return out; },
        onProgress: (pct) => setBusy({ label: t.renderingVideo, pct }),
        isCancelled: () => cancelRef.current
      });
    } catch (err) {
      console.warn('WebCodecs export failed, using real time recorder', err);
      blob = null;
    }
    v.loop = true;
    exportingRef.current = false;
    dirty.current = true;
    if (blob) {
      const inGallery = await deliverBlob(blob, `reycam_${Date.now()}.mp4`, isMobile);
      setBusy(null);
      showToast(`${inGallery ? t.savedToGallery : t.videoExported} · ${out.width & ~1} × ${out.height & ~1}`);
    } else if (!cancelRef.current) {
      exportVideoRealtime();
    } else {
      setBusy(null);
    }
  };

  const doExport = () => {
    setExportOpen(false);
    if (media?.type === 'video') exportVideo(); else exportPhoto();
  };

  // Presets and clipboard
  const savePreset = () => {
    const name = presetName.trim() || recipe.name + ' edit';
    const list = [...presets, { id: String(Date.now()), name, edit: { ...edit }, created: Date.now() }];
    setPresets(list);
    storePresets(list);
    setPresetDialog(false);
    setPresetName('');
    showToast(t.presetSaved);
  };
  const deletePreset = useCallback((id: string) => {
    const list = presets.filter((p) => 'preset:' + p.id !== id);
    setPresets(list);
    storePresets(list);
  }, [presets]);

  const onOverlay = (f: File) => {
    const img = new Image();
    img.onload = () => { pipeRef.current?.setOverlay(img); setHasOverlay(true); };
    img.src = URL.createObjectURL(f);
  };
  const clearOverlay = () => { pipeRef.current?.setOverlay(null); setHasOverlay(false); };

  const runAuto = () => {
    const m = mediaRef.current;
    if (!m) return;
    const a = autoEnhance(m.el, m.w, m.h);
    commit({ ...editRef.current, adj: { ...editRef.current.adj, ...a } as any });
  };

  const toggleFav = useCallback((id: string) => {
    setFavs((prev) => {
      const next = new Set(prev);
      const adding = !next.has(id);
      if (adding) next.add(id); else next.delete(id);
      try { localStorage.setItem(FAV_KEY, JSON.stringify([...next])); } catch { /* blocked */ }
      showToast(adding ? t.favAdded : t.favRemoved);
      return next;
    });
  }, [showToast, t]);

  const allLooks: Recipe[] = useMemo(() => [...RECIPES, ...presetRecipes], [presetRecipes]);
  const q = query.trim().toLowerCase();
  const looks = useMemo(
    () => allLooks.filter((r) => (cat === 'all' || r.cat === cat || (cat === 'fav' && favs.has(r.id))) && (!q || r.name.toLowerCase().includes(q) || descOf(r, lang).toLowerCase().includes(q))),
    [allLooks, cat, q, favs, lang]
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: allLooks.length, fav: 0 };
    allLooks.forEach((r) => { c[r.cat] = (c[r.cat] || 0) + 1; if (favs.has(r.id)) c.fav++; });
    return c;
  }, [allLooks, favs]);
  const isVideo = media?.type === 'video';
  const activePanel = isMobile ? tab : panel;

  // A few eye-catching looks from different categories for the welcome screen.
  const showcase = useMemo(() => {
    const cats = ['film', 'moody', 'bw', 'y2k', 'flash', 'green'];
    return cats.map((c) => RECIPES.find((r) => r.cat === c)).filter(Boolean) as Recipe[];
  }, []);
  useEffect(() => {
    if (!welcome) return;
    setVisibleThumbIds((cur) => showcase.every((r) => cur.has(r.id)) ? cur : new Set([...cur, ...showcase.map((r) => r.id)]));
  }, [welcome, showcase]);

  // Quick filters strip on the phone editor: current category, selected look first.
  const quickLooks = useMemo(() => {
    const list = looks.slice(0, 14);
    const sel = allLooks.find((r) => r.id === edit.camId);
    return sel && !list.includes(sel) ? [sel, ...list.slice(0, 13)] : list;
  }, [looks, allLooks, edit.camId]);
  useEffect(() => {
    if (!isMobile) return;
    setVisibleThumbIds((cur) => quickLooks.every((r) => cur.has(r.id)) ? cur : new Set([...cur, ...quickLooks.map((r) => r.id)]));
  }, [isMobile, quickLooks]);

  const pickLookAndClose = useCallback((id: string) => { pickLook(id); setPage(null); }, [pickLook]);

  const library = (
    <Library
      t={t} lang={lang} categories={CATEGORIES} counts={counts} total={allLooks.length}
      cat={cat} setCat={setCat} query={query} setQuery={setQuery}
      looks={looks} thumbs={thumbs} selectedId={edit.camId} favs={favs}
      onPick={isMobile ? pickLookAndClose : pickLook} onFav={toggleFav} onDelete={deletePreset}
      onVisible={(id) => setVisibleThumbIds((current) => current.has(id) ? current : new Set([...current, id]))}
      mobile={isMobile}
    />
  );

  if (fatal) {
    return (
      <div className="fatal">
        <LogoMark size={64} />
        <h1>ReyCam</h1>
        <p>{t.webglError}</p>
        <code>{fatal}</code>
      </div>
    );
  }

  const panelBody = (id: string) => {
    switch (id) {
      case 'looks': return library;
      case 'light': case 'curve': case 'color': case 'detail': case 'effects':
        return <SliderGroup group={id} edit={edit} setAdj={setAdj} t={t} />;
      case 'hsl': return <HslPanel edit={edit} setAdj={setAdj} band={band} setBand={setBand} t={t} />;
      case 'grading': return <GradingPanel edit={edit} setAdj={setAdj} recipe={recipe} t={t} />;
      case 'retouch': return <RetouchPanel edit={edit} setAdj={setAdj} onAuto={runAuto} t={t} />;
      case 'frame': return <FramePanel edit={edit} setEdit={setEdit} recipe={recipe} t={t} />;
      case 'crop': return <CropPanel edit={edit} setEdit={setEdit} t={t} />;
      case 'stamp': return <StampPanel edit={edit} setEdit={setEdit} recipe={recipe} t={t} noDate={noDate} setNoDate={setNoDate} />;
      case 'layer': return <LayerPanel hasOverlay={hasOverlay} onOverlay={onOverlay} clearOverlay={clearOverlay} t={t} />;
      default: return null;
    }
  };

  const toolButtons = (
    <div className="tool-group">
      <button type="button" className="btn small" onClick={() => { clipboard.current = { ...edit }; showToast(t.editsCopied); }}>{t.copyEdits}</button>
      <button type="button" className="btn small" disabled={!clipboard.current} onClick={() => { if (clipboard.current) { commit({ ...clipboard.current, dateText: edit.dateText }); showToast(t.editsPasted); } }}>{t.pasteEdits}</button>
      <button type="button" className="btn small" onClick={() => { setPresetName(''); setPresetDialog(true); }}>{t.savePreset}</button>
      <button type="button" className="btn small ghost" onClick={() => commit({ ...defaultEdit(), camId: edit.camId, dateText: edit.dateText })}>{t.resetEdits}</button>
    </div>
  );

  return (
    <div
      className={dragOver ? 'app drag' : 'app'}
      onDragOver={(e) => { e.preventDefault(); if (!dragOver) setDragOver(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOver(false); }}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); openFile(e.dataTransfer.files?.[0]); }}
    >
      {welcome && (
        <div className="welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
          <div className="welcome-glow" aria-hidden="true" />
          <div className="welcome-brand">
            <LogoMark size={isMobile ? 38 : 44} />
            <Wordmark size={isMobile ? 24 : 28} />
          </div>
          <div className="welcome-collage" aria-hidden="true">
            {showcase.map((r, i) => (
              <figure key={r.id} className={'wc-card wc-' + i}>
                {thumbs[r.id] ? <img src={thumbs[r.id]} alt="" /> : <span className="thumb-ph" />}
                <figcaption>{r.name}</figcaption>
              </figure>
            ))}
          </div>
          <div className="welcome-copy">
            <span className="welcome-kicker">✦ {t.welcomeKicker}</span>
            <h1 id="welcome-title">{t.welcomeTitle}</h1>
            <p>{t.welcomeSub}</p>
            <ul className="welcome-feats">
              <li>🎞️ {t.welcomeF1}</li>
              <li>🎬 {t.welcomeF2}</li>
              <li>🔒 {t.welcomeF3}</li>
            </ul>
          </div>
          <div className="welcome-actions">
            <label className="welcome-cta">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4M6 10l6-6 6 6M4 20h16" /></svg>
              {t.welcomeStart}
              <input type="file" accept="image/*,video/*" onChange={(e) => { openFile(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            <button type="button" className="welcome-demo" onClick={() => setWelcome(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7z" /></svg>
              {t.welcomeDemo}
            </button>
          </div>
        </div>
      )}
      <header className="top">
        <div className="brand" role="button" tabIndex={0} style={{ cursor: "pointer" }} onClick={() => setWelcome(true)} onKeyDown={(e) => { if (e.key === "Enter") setWelcome(true); }}>
          <LogoMark size={isMobile ? 34 : 40} />
          <Wordmark size={isMobile ? 21 : 25} />
        </div>
        {!isMobile && media && (
          <div className="file-chip" title={media.name}>
            <span className="accent">{isVideo ? t.video : t.photo}</span>
            <span className="ellipsis">{media.sample ? t.original : media.name}</span>
            <span className="muted">{media.w} × {media.h}</span>
          </div>
        )}
        <div className="top-actions">
          {isMobile && (
            <button type="button" className="icon-btn ghost" aria-label={t.tools} aria-expanded={moreOpen} onClick={() => setMoreOpen(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
            </button>
          )}
          {!isMobile && <label className="lang">
            <span className="sr">{t.language}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg>
            <select value={langPref} onChange={(e) => chooseLang(e.target.value)} aria-label={t.language} data-testid="lang">
              <option value={AUTO}>{t.langAuto} · {LANGUAGES.find((l) => l.code === autoLang)?.name || autoLang}</option>
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </label>}
          {!isMobile && <label className="btn file">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 16V4M6 10l6-6 6 6M4 20h16" /></svg>
            <span>{t.upload}</span>
            <input type="file" accept="image/*,video/*" onChange={(e) => { openFile(e.target.files?.[0]); e.target.value = ''; }} />
          </label>}
          <button type="button" className="btn primary" onClick={() => setExportOpen(true)} disabled={!!busy}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 4v12M6 10l6 6 6-6M4 20h16" /></svg>
            {t.export}
          </button>
        </div>
      </header>
      {!isComplete(lang) && <div className="banner">{t.fallbackNote}</div>}

      <main className="main">
        {!isMobile && <aside className="side left">{library}</aside>}

        <section className={isMobile && tool ? "center tool-on" : "center"}>
          <div className="stage">
            <canvas ref={canvasRef} className="preview" />
            <div className="stage-chips">
              <span className="chip solid">{recipe.name}</span>
              {recipe.id !== 'original' && (
                <button type="button" className={favs.has(recipe.id) ? 'chip solid heart on' : 'chip solid heart'} aria-pressed={favs.has(recipe.id)} aria-label={favs.has(recipe.id) ? t.favRemove : t.favAdd} onClick={() => toggleFav(recipe.id)}>
                  <Heart on={favs.has(recipe.id)} size={15} />
                </button>
              )}
              {comparing && <span className="chip cream">{t.original}</span>}
            </div>
            {isMobile && (
              <div className="stage-tools">
                <button type="button" className="float-btn" aria-label={t.undo} onClick={undo} disabled={!history.current.past.length}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 010 12h-3" /></svg>
                </button>
                <button type="button" className="float-btn" aria-label={t.redo} onClick={redo} disabled={!history.current.future.length}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M15 14l5-5-5-5" /><path d="M20 9H10a6 6 0 000 12h3" /></svg>
                </button>
                <button
                  type="button"
                  className={comparing ? 'float-btn on' : 'float-btn'}
                  aria-label={t.compare}
                  onPointerDown={() => setComparing(true)}
                  onPointerUp={() => setComparing(false)}
                  onPointerLeave={() => setComparing(false)}
                  onPointerCancel={() => setComparing(false)}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M12 4v16" /></svg>
                </button>
              </div>
            )}
            {busy && (
              <div className="busy" role="status">
                <span>{busy.label}{busy.pct ? ` ${busy.pct}%` : ''}</span>
                <span className="bar"><span style={{ width: busy.pct + '%' }} /></span>
                {isVideo && <button type="button" className="btn small ghost" onClick={() => { cancelRef.current = true; }}>{t.cancel}</button>}
              </div>
            )}
            {dragOver && <div className="drop">{t.dropHere}</div>}
          </div>
          {media?.sample && !isMobile && <p className="note center-note">{t.sampleNote}</p>}
          <div className="toolbar">
            {!isMobile && <>
            <button
              type="button"
              className="icon-btn"
              aria-label={t.compare}
              title={t.compare}
              onPointerDown={() => setComparing(true)}
              onPointerUp={() => setComparing(false)}
              onPointerLeave={() => setComparing(false)}
              onPointerCancel={() => setComparing(false)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M12 4v16" /></svg>
            </button>
            <button type="button" className="icon-btn" aria-label={t.undo} title={t.undo} onClick={undo} disabled={!history.current.past.length}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 010 12h-3" /></svg>
            </button>
            <button type="button" className="icon-btn" aria-label={t.redo} title={t.redo} onClick={redo} disabled={!history.current.future.length}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15 14l5-5-5-5" /><path d="M20 9H10a6 6 0 000 12h3" /></svg>
            </button>
            </>}
            {isVideo && (
              <>
                <button type="button" className="btn small accent-btn" onClick={togglePlay}>{playing ? t.pause : t.play}</button>
                <button type="button" className="icon-btn" aria-label={muted ? t.unmute : t.mute} title={muted ? t.unmute : t.mute} onClick={toggleMute}>
                  {muted
                    ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 9l4 6M21 9l-4 6" /></svg>
                    : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 8a5 5 0 010 8" /></svg>}
                </button>
                <label className="inline-range">
                  <span className="sr">{t.timeline}</span>
                  <input type="range" min={0} max={1000} value={progress} onChange={(e) => seek(Number(e.target.value))} />
                </label>
              </>
            )}
            <label className="inline-range grow">
              <span className="muted">{t.intensity}</span>
              <input type="range" min={0} max={100} value={edit.intensity} onChange={(e) => setEdit({ intensity: Number(e.target.value) })} />
              <span className="val">{edit.intensity}%</span>
            </label>
            {!isMobile && toolButtons}
          </div>
          {isMobile && tool && (
            <div className="tool-dock">
              <div className="tool-dock-head">
                <span className="tool-dock-title"><TabIcon id={tool} />{(t as any)[PANEL_KEY[tool]]}</span>
                <button type="button" className="btn small primary pill-btn" onClick={() => setTool(null)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
                  {t.done}
                </button>
              </div>
              <div className="tool-dock-body">{panelBody(tool)}</div>
            </div>
          )}
          {isMobile && !tool && (
            <div className="home-extras">
              <div className="hx-head">
                <span>{t.quickLooks}</span>
                <button type="button" className="hx-link" onClick={() => setPage('filters')}>{t.seeAll} ›</button>
              </div>
              <div className="hx-strip">
                {quickLooks.map((r) => (
                  <button key={r.id} type="button" className={r.id === edit.camId ? 'hx-look on' : 'hx-look'} onClick={() => pickLook(r.id)}>
                    {thumbs[r.id] ? <img src={thumbs[r.id]} alt="" /> : <span className="thumb-ph" />}
                    <span>{r.name}</span>
                  </button>
                ))}
                <button type="button" className="hx-look hx-more" onClick={() => setPage('filters')}>
                  <span className="hx-more-ico">+{Math.max(0, allLooks.length - quickLooks.length)}</span>
                  <span>{t.seeAll}</span>
                </button>
              </div>
              <div className="hx-shortcuts" aria-label={t.shortcuts}>
                <button type="button" className="hx-sc auto" onClick={() => { runAuto(); showToast(t.autoEnhance); }}>
                  <span><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7zM19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z" /></svg></span>
                  {t.autoShort}
                </button>
                {['light', 'color', 'crop', 'frame', 'stamp'].map((p) => (
                  <button key={p} type="button" className="hx-sc" onClick={() => setTool(p)}>
                    <span><TabIcon id={p} /></span>
                    {(t as any)[PANEL_KEY[p]]}
                  </button>
                ))}
              </div>
            </div>
          )}
          {isMobile && !tool && (
            <nav className="bottom-nav" aria-label={t.tools}>
              <button type="button" className="nav-btn" onClick={() => setPage('filters')}>
                <span className="nav-ico"><TabIcon id="looks" /></span>
                <span>{t.navFilters}</span>
              </button>
              <button type="button" className="nav-btn" onClick={() => setPage('edit')}>
                <span className="nav-ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg></span>
                <span>{t.navEdit}</span>
              </button>
              <button type="button" className="nav-btn" onClick={() => setPage('upload')}>
                <span className="nav-ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4M6 10l6-6 6 6M4 20h16" /></svg></span>
                <span>{t.navUpload}</span>
              </button>
            </nav>
          )}
          {isMobile && page && (
            <div className="page" role="dialog" aria-modal="true" aria-label={page === 'filters' ? t.navFilters : page === 'edit' ? t.navEdit : t.uploadTitle}>
              <header className="page-head">
                <button type="button" className="page-back" aria-label={t.back} onClick={() => setPage(null)}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
                </button>
                <div className="page-title">
                  <span>{page === 'filters' ? t.navFilters : page === 'edit' ? t.navEdit : t.uploadTitle}</span>
                  <small>{page === 'filters' ? t.filtersHint : page === 'edit' ? t.editHint : t.upload}</small>
                </div>
                {page === 'filters' ? <span className="page-count">{looks.length}</span> : <span className="page-spacer" />}
              </header>
              {page === 'filters' && <div className="page-body filters-page">{library}</div>}
              {page === 'edit' && (
                <div className="page-body">
                  <div className="tool-grid">
                    {PANELS.map((p) => (
                      <button key={p} type="button" className="tool-card" data-panel={p} onClick={() => { setTool(p); setPage(null); }}>
                        <span className="tool-card-ico"><TabIcon id={p} /></span>
                        <span>{(t as any)[PANEL_KEY[p]]}</span>
                      </button>
                    ))}
                  </div>
                  <div className="sheet-grid">{toolButtons}</div>
                </div>
              )}
              {page === 'upload' && (
                <div className="page-body upload-page">
                  {[
                    { k: 'photo', accept: 'image/*', title: t.pickPhoto, hint: t.pickPhotoHint, icon: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2zM4 15l4-4 5 5M13 13l2-2 5 5M15.5 8.5h.01' },
                    { k: 'video', accept: 'video/*', title: t.pickVideo, hint: t.pickVideoHint, icon: 'M3 6a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2zM17 10l4-3v10l-4-3' },
                    { k: 'camera', accept: 'image/*', capture: true, title: t.takePhoto, hint: t.takePhotoHint, icon: 'M4 8a2 2 0 012-2h2l2-2h4l2 2h2a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2zM12 10a3.5 3.5 0 100 7 3.5 3.5 0 000-7z' }
                  ].map((o) => (
                    <label key={o.k} className={'upload-card ' + o.k}>
                      <span className="upload-ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={o.icon} /></svg></span>
                      <span className="upload-text"><b>{o.title}</b><small>{o.hint}</small></span>
                      <svg className="upload-go" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
                      <input type="file" accept={o.accept} {...(o.capture ? { capture: 'environment' as const } : {})} onChange={(e) => { openFile(e.target.files?.[0]); e.target.value = ''; }} />
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          {isMobile && moreOpen && (
            <div className="sheet-wrap" onClick={() => setMoreOpen(false)}>
              <div className="sheet" role="dialog" aria-label={t.tools} onClick={(e) => e.stopPropagation()}>
                <span className="sheet-grip" aria-hidden="true" />
                <div className="sheet-grid" onClick={() => setMoreOpen(false)}>{toolButtons}</div>
                <label className="lang sheet-lang">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg>
                  <span className="muted">{t.language}</span>
                  <select value={langPref} onChange={(e) => chooseLang(e.target.value)} aria-label={t.language}>
                    <option value={AUTO}>{t.langAuto} · {LANGUAGES.find((l) => l.code === autoLang)?.name || autoLang}</option>
                    {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                </label>
                <button type="button" className="btn wide" onClick={() => setMoreOpen(false)}>{t.close}</button>
              </div>
            </div>
          )}
        </section>

        {!isMobile && (
          <aside className="side right">
            <div className="look-card">
              <div className="look-card-text">
                <span className="eyebrow">{(t as any)[CAT_KEY[recipe.cat]]}</span>
                <span className="look-title">{recipe.name}</span>
                <span className="muted">{descOf(recipe, lang)}</span>
              </div>
              <button type="button" className={favs.has(recipe.id) ? 'fav-big on' : 'fav-big'} aria-pressed={favs.has(recipe.id)} aria-label={favs.has(recipe.id) ? t.favRemove : t.favAdd} title={favs.has(recipe.id) ? t.favRemove : t.favAdd} onClick={() => toggleFav(recipe.id)}>
                <Heart on={favs.has(recipe.id)} size={20} />
              </button>
            </div>
            <div className="panel-tabs">
              {PANELS.map((p) => (
                <button key={p} type="button" data-panel={p} className={panel === p ? 'chip on' : 'chip'} aria-pressed={panel === p} onClick={() => setPanel(p)}>{(t as any)[PANEL_KEY[p]]}</button>
              ))}
            </div>
            <div className="panel-body">{panelBody(panel)}</div>
          </aside>
        )}
      </main>

      <video ref={videoRef} className="hidden-video" playsInline muted preload="auto" crossOrigin="anonymous" />

      {exportOpen && (
        <div className="modal-wrap" role="dialog" aria-modal="true" aria-labelledby="export-title" onClick={(e) => { if (e.target === e.currentTarget) setExportOpen(false); }}>
          <div className="modal">
            <h3 id="export-title">{t.exportTitle}</h3>
            {isVideo ? (
              <>
                <p className="note">{t.videoExportNote}</p>
                <span className="h">{t.frameRate}</span>
                <Pills items={[24, 25, 30, 50, 60].map((f) => ({ id: String(f), label: f + ' fps' }))} value={String(exportOpts.fps)} onPick={(f) => setExportOpts({ ...exportOpts, fps: Number(f) })} />
              </>
            ) : (
              <>
                <span className="h">{t.format}</span>
                <Pills items={[{ id: 'image/jpeg', label: 'JPEG' }, { id: 'image/png', label: 'PNG' }, { id: 'image/webp', label: 'WebP' }]} value={exportOpts.format} onPick={(f) => setExportOpts({ ...exportOpts, format: f })} />
                {exportOpts.format !== 'image/png' && (
                  <label className="inline-range grow">
                    <span className="muted">{t.quality}</span>
                    <input type="range" min={60} max={100} value={exportOpts.quality} onChange={(e) => setExportOpts({ ...exportOpts, quality: Number(e.target.value) })} />
                    <span className="val">{exportOpts.quality}</span>
                  </label>
                )}
              </>
            )}
            <span className="h">{t.size}</span>
            <Pills items={[{ id: 'full', label: t.sizeFull }, { id: '4096', label: '4096' }, { id: '2048', label: '2048' }, { id: '1080', label: '1080' }]} value={exportOpts.size} onPick={(s) => setExportOpts({ ...exportOpts, size: s })} />
            <p className="note">{t.exportNote}</p>
            <div className="row end">
              <button type="button" className="btn ghost" onClick={() => setExportOpen(false)}>{t.cancel}</button>
              <button type="button" className="btn primary" onClick={doExport}>{t.export}</button>
            </div>
          </div>
        </div>
      )}

      {presetDialog && (
        <div className="modal-wrap" role="dialog" aria-modal="true" aria-labelledby="preset-title" onClick={(e) => { if (e.target === e.currentTarget) setPresetDialog(false); }}>
          <form className="modal" onSubmit={(e) => { e.preventDefault(); savePreset(); }}>
            <h3 id="preset-title">{t.savePreset}</h3>
            <label className="field">
              <span className="h">{t.presetName}</span>
              <input autoFocus type="text" className="text-input" value={presetName} placeholder={recipe.name + ' edit'} onChange={(e) => setPresetName(e.target.value)} />
            </label>
            <div className="row end">
              <button type="button" className="btn ghost" onClick={() => setPresetDialog(false)}>{t.cancel}</button>
              <button type="submit" className="btn primary">{t.save}</button>
            </div>
          </form>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
