/**
 * Person mask effects of the LU looks, drawn in the 2D pass after the GPU grade:
 *  - glitter: a seeded point field of colored dots and flakes on the background only,
 *  - star flares: four point sparkles, mostly on the background, a few on bright edges,
 *  - flash shadow: a hard shadow of the person cast on the wall behind them.
 *
 * The person mask comes from the on device segmenter (the same one the collage uses).
 * It is computed once per photo, and about twice a second on video, then cached. When
 * segmentation is not ready or fails, glitter and flares cover the whole image at lower
 * strength and the flash shadow is skipped.
 */
import { features } from '../collage/detect';

type Mask = { canvas: HTMLCanvasElement; ok: boolean };

const masks = new Map<string, Mask>();
const pending = new Set<string>();
const listeners = new Set<() => void>();
let lastVideoMask: Mask | null = null;

/** Called when a mask finishes, so the editor can render again with it. */
export function onMaskReady(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export const maskPending = () => pending.size > 0;

const ids = new WeakMap<object, number>();
let nextId = 1;
const idOf = (o: object) => { let v = ids.get(o); if (!v) { v = nextId++; ids.set(o, v); } return v; };

/**
 * The person mask for the current frame, or null while it is being computed.
 * `frame` is the graded image at the output geometry; it is copied, so the caller can reuse it.
 */
export function personMask(source: object, frame: HTMLCanvasElement, isVideo: boolean, time: number): Mask | null {
  const key = `${idOf(source)}|${frame.width}x${frame.height}|${isVideo ? Math.floor(time * 2) : 0}`;
  const hit = masks.get(key);
  if (hit) return hit;
  if (!pending.has(key) && (!isVideo || pending.size === 0)) {
    pending.add(key);
    // Small copy: the segmenter works at 256 px, and the frame canvas is reused right after.
    const k = Math.min(1, 640 / Math.max(frame.width, frame.height));
    const copy = document.createElement('canvas');
    copy.width = Math.max(1, Math.round(frame.width * k));
    copy.height = Math.max(1, Math.round(frame.height * k));
    copy.getContext('2d')!.drawImage(frame, 0, 0, copy.width, copy.height);
    import('../collage/segment')
      .then(({ segment }) => segment(copy))
      .then((res) => ({ canvas: res.mask, ok: res.ok }))
      .catch(() => ({ canvas: copy, ok: false }))
      .then((m) => {
        pending.delete(key);
        if (masks.size > 12) masks.delete(masks.keys().next().value as string);
        masks.set(key, m);
        if (isVideo) lastVideoMask = m;
        listeners.forEach((fn) => fn());
      });
  }
  return isVideo ? lastVideoMask : null;
}

/** Head position of the person (fractions of the frame), for the flash falloff center. */
export function headCenter(mask: Mask | null): [number, number] | null {
  if (!mask || !mask.ok) return null;
  const f = features({ id: 'lu', image: mask.canvas, mask: mask.canvas, segmented: true });
  const h = f.heads[0];
  return h ? [h.x, h.y] : null;
}

function rng(seed: number) {
  let s = (Math.floor(seed) % 2147483647) || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Draw the mask scaled to w x h, softened by `feather` px. */
function maskLayer(mask: Mask, w: number, h: number, feather: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  if (feather > 0) ctx.filter = `blur(${feather}px)`;
  ctx.drawImage(mask.canvas, 0, 0, w, h);
  return c;
}

const PALETTES: Record<string, string[]> = {
  holo: ['#FFFFFF', '#FFB3D1', '#9EF0D4', '#FFE680', '#9CC9FF', '#CDB4FF', '#FFB27A'],
  gold: ['#FFFFFF', '#FFE680', '#FFD24A', '#F2B13A', '#FFF2C0'],
  silver: ['#FFFFFF', '#E6ECF5', '#C8D0DC', '#B4C2D8', '#F5F5F5'],
  pink: ['#FFFFFF', '#FFB3D1', '#FF8AC0', '#FFD6E8', '#F59AC8']
};
const PALETTE_IDS = ['holo', 'gold', 'silver', 'pink'];

export interface LuFxParams {
  glitter: number;      // 0..1
  flares: number;       // 0..1 (scales the 10 to 14 flares count)
  flashShadow: number;  // 0..1
  palette: number;      // index into PALETTE_IDS
  seed: number;
  time: number;
  isVideo: boolean;
}

/** Glitter, flares and flash shadow on top of the graded frame in `ctx`. */
export function drawLuFx(ctx: CanvasRenderingContext2D, w: number, h: number, mask: Mask | null, p: LuFxParams) {
  const unit = Math.max(w, h) / 1600;
  const usable = mask && mask.ok ? mask : null;
  const person = usable ? maskLayer(usable, w, h, 2 * unit) : null;

  if (p.flashShadow > 0 && person) {
    // Copy of the person, offset diagonally, darkened, only on the background.
    const sh = document.createElement('canvas');
    sh.width = w; sh.height = h;
    const sc = sh.getContext('2d')!;
    sc.filter = `blur(${Math.max(1, unit)}px)`;
    sc.drawImage(person, w * 0.04, w * 0.03);
    sc.filter = 'none';
    sc.globalCompositeOperation = 'source-in';
    const v = Math.round(255 * (1 - 0.55 * p.flashShadow));
    sc.fillStyle = `rgb(${v},${v},${v})`;
    sc.fillRect(0, 0, w, h);
    sc.globalCompositeOperation = 'destination-out';
    sc.drawImage(person, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(sh, 0, 0);
    ctx.restore();
  }

  if (p.glitter > 0) {
    const g = document.createElement('canvas');
    g.width = w; g.height = h;
    const gc = g.getContext('2d')!;
    const r = rng(p.seed * 7919 + 11);
    const colors = PALETTES[PALETTE_IDS[p.palette] || 'holo'];
    // About one dot per 120 square px, fewer at preview size, white 40 percent.
    const n = Math.min(220000, Math.round((w * h) / 120 * p.glitter));
    for (let i = 0; i < n; i++) {
      const x = r() * w, y = r() * h;
      const big = r() < 0.012;
      const s = big ? (6 + r() * 2) * unit : (1 + r() * 3) * Math.max(0.6, unit);
      const tw = p.isVideo ? 0.35 + 0.65 * Math.abs(Math.sin(p.time * (1.5 + r() * 3) + i)) : 0.55 + r() * 0.45;
      gc.globalAlpha = tw;
      gc.fillStyle = r() < 0.4 ? '#FFFFFF' : colors[Math.floor(r() * colors.length)];
      if (big) { gc.beginPath(); gc.ellipse(x, y, s / 2, s / 3, r() * 3, 0, Math.PI * 2); gc.fill(); }
      else gc.fillRect(x, y, s, s);
    }
    gc.globalAlpha = 1;
    // Fine sparkle texture under the dots, like glitter paper.
    gc.globalCompositeOperation = 'destination-over';
    gc.globalAlpha = 0.15;
    for (let i = 0; i < n / 3; i++) { gc.fillStyle = '#FFFFFF'; gc.fillRect(r() * w, r() * h, 1, 1); }
    gc.globalAlpha = 1;
    gc.globalCompositeOperation = 'source-over';
    if (person) { gc.globalCompositeOperation = 'destination-out'; gc.drawImage(person, 0, 0); }
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = (person ? 0.85 : 0.35) * Math.min(1, p.glitter);
    ctx.filter = `blur(${2 * unit}px)`;
    ctx.drawImage(g, 0, 0);
    ctx.filter = 'none';
    ctx.drawImage(g, 0, 0);
    ctx.restore();
  }

  if (p.flares > 0) {
    const r = rng(p.seed * 104729 + 7);
    const count = Math.round((10 + r() * 4) * Math.min(1.6, p.flares));
    // Small luminance and mask probes to place flares (background vs bright person edges).
    const pw = 96, ph = Math.max(1, Math.round((96 * h) / w));
    const probe = document.createElement('canvas');
    probe.width = pw; probe.height = ph;
    const pc = probe.getContext('2d', { willReadFrequently: true })!;
    pc.drawImage(ctx.canvas, 0, 0, pw, ph);
    const lum = pc.getImageData(0, 0, pw, ph).data;
    let mk: Uint8ClampedArray | null = null;
    if (person) { pc.clearRect(0, 0, pw, ph); pc.drawImage(person, 0, 0, pw, ph); mk = pc.getImageData(0, 0, pw, ph).data; }
    const pts: [number, number][] = [];
    const onPerson = Math.round(count * 0.3);
    for (let i = 0; i < count; i++) {
      const wantPerson = mk && i < onPerson;
      // Best of 12 candidates: far from other flares (blue noise), on the right area.
      let best: [number, number] | null = null, bestD = -1;
      for (let k = 0; k < 12; k++) {
        const x = r(), y = r();
        const q = ((Math.floor(y * ph) * pw) + Math.floor(x * pw)) * 4;
        const inPerson = mk ? mk[q + 3] > 128 : false;
        const bright = (lum[q] + lum[q + 1] + lum[q + 2]) / 765 > 0.8;
        if (mk && (wantPerson ? !(inPerson && bright) : inPerson)) continue;
        const d = pts.reduce((m, [px, py]) => Math.min(m, Math.hypot(px - x, py - y)), 9);
        if (d > bestD) { bestD = d; best = [x, y]; }
      }
      if (best) pts.push(best);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    pts.forEach(([fx, fy], i) => {
      const x = fx * w, y = fy * h;
      const len = (40 + r() * 80) * unit * 1.4;
      const pulse = p.isVideo ? 0.8 + 0.2 * Math.sin(p.time * 2 + i) : 1;
      const rot = (p.isVideo ? Math.sin(p.time * 0.5 + i) * 0.05 : 0) + (r() - 0.5) * 0.1;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        const L = (k % 2 ? 0.4 : 1) * len * pulse;
        const g = ctx.createLinearGradient(0, 0, Math.cos(a) * L, Math.sin(a) * L);
        g.addColorStop(0, 'rgba(255,255,255,0.95)');
        g.addColorStop(0.75, k % 4 === 0 ? 'rgba(200,220,255,0.35)' : 'rgba(255,200,230,0.35)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = (k % 2 ? 1 : 1.8) * unit;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L); ctx.stroke();
      }
      const core = (3 + r() * 3) * unit;
      const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, core * 3);
      cg.addColorStop(0, 'rgba(255,255,255,1)'); cg.addColorStop(0.35, 'rgba(255,255,255,0.6)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(0, 0, core * 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }
}
