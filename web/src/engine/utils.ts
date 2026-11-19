import type { Adj, EditState } from './types';
import { ADJ_KEYS, BANDS } from './types';
import { formatDate } from './pipeline';

export function allAdjKeys(): string[] {
  const keys: string[] = [...ADJ_KEYS];
  BANDS.forEach((b) => keys.push('hsl_' + b.id + '_h', 'hsl_' + b.id + '_s', 'hsl_' + b.id + '_l'));
  return keys;
}

export function zeroAdj(): Adj {
  const a: Adj = {};
  allAdjKeys().forEach((k) => { a[k] = 0; });
  return a;
}

const DATE_STYLE_KEY = 'reycam.dateStyle.v1';
const DATE_STYLE_FIELDS = ['stampColor', 'stampSize', 'dateFormat'] as const;

/** Date color, size and format the user picked last time. */
export function loadDateStyle(): Partial<EditState> {
  try {
    const j = JSON.parse(localStorage.getItem(DATE_STYLE_KEY) || '{}');
    const out: Partial<EditState> = {};
    for (const k of DATE_STYLE_FIELDS) if (typeof j[k] === 'string') (out as any)[k] = j[k];
    if (out.dateFormat) out.dateText = formatDate(out.dateFormat);
    return out;
  } catch { return {}; }
}
export function storeDateStyle(e: Partial<EditState>) {
  try {
    const cur = JSON.parse(localStorage.getItem(DATE_STYLE_KEY) || '{}');
    for (const k of DATE_STYLE_FIELDS) if (e[k] !== undefined) cur[k] = e[k];
    localStorage.setItem(DATE_STYLE_KEY, JSON.stringify(cur));
  } catch { /* storage blocked */ }
}

export function defaultEdit(): EditState {
  return {
    camId: 'bolt-classic', intensity: 100, adj: zeroAdj(), frame: 'auto', aspect: 'original',
    stamp: 'auto', stampSize: 'small', stampColor: 'match', dateFormat: 'yy', dateText: formatDate('yy'),
    flipH: false, rotate: 0,
    ...loadDateStyle()
  };
}

/** One tap auto enhance from a small luminance and saturation histogram. */
export function autoEnhance(src: CanvasImageSource, w: number, h: number): Partial<Adj> {
  const c = document.createElement('canvas');
  const s = Math.min(1, 256 / Math.max(w, h));
  c.width = Math.max(1, Math.round(w * s));
  c.height = Math.max(1, Math.round(h * s));
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const hist = new Array(256).fill(0);
  let satSum = 0, rSum = 0, bSum = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    hist[l]++;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    satSum += mx ? (mx - mn) / mx : 0;
    rSum += r; bSum += b; n++;
  }
  const pct = (p: number) => {
    let acc = 0;
    for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= n * p) return i; }
    return 255;
  };
  const lo = pct(0.02), mid = pct(0.5), hi = pct(0.98);
  const range = Math.max(1, hi - lo);
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, Math.round(v)));
  const satAvg = satSum / n;
  const cast = (rSum - bSum) / n;
  return {
    exposure: clamp((118 - mid) * 0.45, -40, 40),
    contrast: clamp((200 - range) * 0.2, -10, 30),
    blacks: clamp(-lo * 0.6, -30, 10),
    whites: clamp((250 - hi) * 0.5, -10, 30),
    highlights: hi > 245 ? -20 : 0,
    shadows: mid < 90 ? 20 : 5,
    vibrance: clamp((0.35 - satAvg) * 80, -10, 30),
    temperature: clamp(-cast * 0.15, -15, 15)
  };
}

export async function deliverBlob(blob: Blob, name: string, preferShare: boolean): Promise<void> {
  const file = new File([blob], name, { type: blob.type });
  const nav = navigator as any;
  if (preferShare && nav.canShare && nav.canShare({ files: [file] })) {
    try { await nav.share({ files: [file], title: 'ReyCam' }); return; } catch { /* user cancelled, fall back to download */ }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

export interface Preset { id: string; name: string; edit: EditState; created: number }

const KEY = 'reycam.presets.v1';
export function loadPresets(): Preset[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
export function storePresets(list: Preset[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage full or blocked */ }
  fetch('/api/presets', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(list) }).catch(() => undefined);
}
export async function syncPresets(): Promise<Preset[] | null> {
  try {
    const r = await fetch('/api/presets');
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j) ? j : null;
  } catch { return null; }
}
