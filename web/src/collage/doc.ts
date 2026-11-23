/**
 * Creating, remixing and editing collage documents, undo history and the
 * on device draft store ("My Collages", IndexedDB).
 */
import type { CollageDoc, CollagePhoto, CollageTemplate, Layer, Paint, Palette } from './types';
import { presetById } from './palettes';

export const uid = () => Math.random().toString(36).slice(2, 10);

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export function paletteFor(t: CollageTemplate): Palette {
  return { ...presetById(t.palette).colors, ...t.colors };
}

export function docFromTemplate(t: CollageTemplate, keepPalette?: Palette): CollageDoc {
  const base = paletteFor(t);
  // Remix keeps the user colors for slots both templates share.
  const palette = keepPalette ? { ...base, ...Object.fromEntries(Object.entries(keepPalette).filter(([k]) => t.slots.includes(k) || k in base)) } : base;
  const now = Date.now();
  return {
    id: uid(), template: t.id, ratio: t.ratio, palette, slots: [...t.slots], layers: clone(t.layers),
    dateStamp: false, finish: t.finish, created: now, updated: now
  };
}

/** Every slot used by the document, template slots first. */
export function usedSlots(doc: CollageDoc): string[] {
  const found = new Set<string>(doc.slots);
  const visit = (v: unknown) => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) { v.forEach(visit); return; }
    const o = v as Record<string, unknown>;
    if (typeof o.slot === 'string') found.add(o.slot);
    Object.values(o).forEach(visit);
  };
  doc.layers.forEach((l) => { if (!l.hidden) visit(l); });
  return [...found].filter((s) => doc.palette[s] !== undefined);
}

/** All paints of a layer (fill, stroke, outline, tiles...), for recoloring one element. */
export function paintsOf(l: Layer): Paint[] {
  const out: Paint[] = [];
  const visit = (v: unknown, depth: number) => {
    if (!v || typeof v !== 'object' || depth > 3) return;
    if (Array.isArray(v)) { v.forEach((x) => visit(x, depth + 1)); return; }
    const o = v as Record<string, unknown>;
    if ('slot' in o || 'color' in o) { out.push(o as Paint); return; }
    Object.values(o).forEach((x) => visit(x, depth + 1));
  };
  Object.entries(l).forEach(([k, v]) => { if (k !== 'points' && k !== 'weave' && k !== 'strokes') visit(v, 0); });
  return out;
}

// ---------------------------------------------------------------- history

export class History {
  private past: string[] = [];
  private future: string[] = [];
  constructor(private limit = 60) {}
  push(doc: CollageDoc) {
    this.past.push(JSON.stringify(doc));
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }
  undo(current: CollageDoc): CollageDoc | null {
    const prev = this.past.pop();
    if (!prev) return null;
    this.future.push(JSON.stringify(current));
    return JSON.parse(prev);
  }
  redo(current: CollageDoc): CollageDoc | null {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(JSON.stringify(current));
    return JSON.parse(next);
  }
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
  clear() { this.past = []; this.future = []; }
}

// ---------------------------------------------------------------- drafts (IndexedDB)

export interface DraftSummary { id: string; template: string; updated: number; thumb: string }

interface DraftRecord extends DraftSummary {
  doc: CollageDoc;
  photos: { id: string; image: Blob; mask: Blob; segmented: boolean }[];
}

const DB = 'reycam-collage';
const STORE = 'drafts';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: 'id' }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then((db) => new Promise<T>((resolve, reject) => {
    const r = fn(db.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
}

const toBlob = (c: HTMLCanvasElement, type: string, q?: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), type, q));

export async function saveDraft(doc: CollageDoc, photos: CollagePhoto[], thumb: HTMLCanvasElement) {
  try {
    const rec: DraftRecord = {
      id: doc.id, template: doc.template, updated: Date.now(), thumb: thumb.toDataURL('image/jpeg', 0.7), doc,
      photos: await Promise.all(photos.map(async (p) => ({ id: p.id, image: await toBlob(p.image, 'image/jpeg', 0.95), mask: await toBlob(p.mask, 'image/png'), segmented: p.segmented })))
    };
    await tx('readwrite', (s) => s.put(rec));
  } catch (e) {
    console.warn('Draft not saved', e);
  }
}

export async function listDrafts(): Promise<DraftSummary[]> {
  try {
    const all = (await tx<DraftRecord[]>('readonly', (s) => s.getAll())) || [];
    return all.map(({ id, template, updated, thumb }) => ({ id, template, updated, thumb })).sort((a, b) => b.updated - a.updated);
  } catch {
    return [];
  }
}

export async function deleteDraft(id: string) {
  try { await tx('readwrite', (s) => s.delete(id)); } catch { /* storage unavailable */ }
}

async function blobToCanvas(b: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(b);
  const c = document.createElement('canvas');
  c.width = bmp.width; c.height = bmp.height;
  c.getContext('2d')!.drawImage(bmp, 0, 0);
  bmp.close?.();
  return c;
}

export async function loadDraft(id: string): Promise<{ doc: CollageDoc; photos: CollagePhoto[] } | null> {
  try {
    const rec = await tx<DraftRecord | undefined>('readonly', (s) => s.get(id));
    if (!rec) return null;
    const photos = await Promise.all(rec.photos.map(async (p) => ({ id: p.id, image: await blobToCanvas(p.image), mask: await blobToCanvas(p.mask), segmented: p.segmented })));
    return { doc: rec.doc, photos };
  } catch {
    return null;
  }
}

/** Decode a picked file into a canvas, converting HEIC like the main editor does. */
export async function fileToCanvas(f: File, maxSide = 4096): Promise<HTMLCanvasElement> {
  let bmp: ImageBitmap | null = null;
  try {
    bmp = await createImageBitmap(f, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  } catch {
    const { heicTo } = await import('heic-to');
    bmp = await heicTo({ blob: f, type: 'bitmap' });
  }
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return c;
}
