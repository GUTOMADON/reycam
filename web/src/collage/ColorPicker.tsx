import { useEffect, useRef, useState } from 'react';
import { hexToRgb, hslToHex, rgbToHex, rgbToHsl } from './palettes';
import type { CollageStrings } from './strings';

const RECENT_KEY = 'reycam.collage.recentColors';

function readRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}

export function pushRecent(hex: string) {
  try {
    const list = [hex, ...readRecent().filter((c) => c.toLowerCase() !== hex.toLowerCase())].slice(0, 12);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch { /* storage blocked */ }
}

/** HSV style wheel: angle = hue, distance = saturation. */
function hsvToHex(h: number, s: number, v: number, a: number) {
  const l = v * (1 - s / 2);
  const sl = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
  return hslToHex(h, sl, l, a);
}
function hexToHsv(hex: string): [number, number, number, number] {
  const [r, g, b, a] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const v = l + s * Math.min(l, 1 - l);
  return [h, v === 0 ? 0 : 2 * (1 - l / v), v, a];
}

interface Props {
  value: string;
  t: CollageStrings;
  title: string;
  linked?: boolean;
  onChange: (hex: string, final: boolean) => void;
  onRelink?: () => void;
  onEyedropper: () => void;
  onClose: () => void;
}

export function ColorPicker({ value, t, title, linked, onChange, onRelink, onEyedropper, onClose }: Props) {
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [hex, setHex] = useState(value.slice(0, 7).toUpperCase());
  const wheel = useRef<HTMLCanvasElement>(null);
  const recent = readRecent();

  useEffect(() => { setHsv(hexToHsv(value)); setHex(value.slice(0, 7).toUpperCase()); }, [value]);

  useEffect(() => {
    const c = wheel.current;
    if (!c) return;
    const s = c.width, ctx = c.getContext('2d')!;
    const img = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const dx = x - s / 2, dy = y - s / 2, d = Math.hypot(dx, dy) / (s / 2);
      const i = (y * s + x) * 4;
      if (d > 1) { img.data[i + 3] = 0; continue; }
      const [r, g, b] = hexToRgb(hsvToHex((Math.atan2(dy, dx) * 180) / Math.PI + 90, d, hsv[2], 1));
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [hsv[2]]);

  const emit = (n: [number, number, number, number], final = false) => {
    setHsv(n);
    const out = hsvToHex(n[0], n[1], n[2], n[3]);
    setHex(out.slice(0, 7).toUpperCase());
    onChange(out, final);
    if (final) pushRecent(out.slice(0, 7));
  };

  const pickWheel = (e: React.PointerEvent<HTMLCanvasElement>, final: boolean) => {
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
    const d = Math.min(1, Math.hypot(dx, dy) / (r.width / 2));
    emit([(Math.atan2(dy, dx) * 180) / Math.PI + 90, d, hsv[2] || 0.6, hsv[3]], final);
  };

  const a = ((hsv[0] - 90) * Math.PI) / 180;
  return (
    <div className="col-picker" role="dialog" aria-label={title}>
      <div className="col-picker-head">
        <span className="col-swatch big" style={{ background: value }} />
        <b>{title}</b>
        {linked === false && onRelink && <button type="button" className="col-chip" onClick={onRelink}>🔗 {t.relink}</button>}
        <button type="button" className="col-x" aria-label={t.done} onClick={onClose}>✓</button>
      </div>
      <div className="col-picker-body">
        <div className="col-wheel-wrap">
          <canvas
            ref={wheel}
            width={180}
            height={180}
            className="col-wheel"
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); pickWheel(e, false); }}
            onPointerMove={(e) => { if (e.buttons) pickWheel(e, false); }}
            onPointerUp={(e) => pickWheel(e, true)}
          />
          <span className="col-wheel-dot" style={{ left: `${50 + Math.cos(a) * hsv[1] * 50}%`, top: `${50 + Math.sin(a) * hsv[1] * 50}%`, background: value }} />
        </div>
        <div className="col-picker-side">
          <label className="col-range">
            <span>{t.brightness}</span>
            <input type="range" min={0} max={100} value={Math.round(hsv[2] * 100)} onChange={(e) => emit([hsv[0], hsv[1], Number(e.target.value) / 100, hsv[3]])} onPointerUp={() => emit(hsv, true)} />
          </label>
          <label className="col-range">
            <span>{t.opacity}</span>
            <input type="range" min={0} max={100} value={Math.round(hsv[3] * 100)} onChange={(e) => emit([hsv[0], hsv[1], hsv[2], Number(e.target.value) / 100])} onPointerUp={() => emit(hsv, true)} />
          </label>
          <label className="col-hex">
            <span>{t.hex}</span>
            <input
              value={hex}
              maxLength={7}
              onChange={(e) => {
                const v = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value;
                setHex(v.toUpperCase());
                if (/^#[0-9a-fA-F]{6}$/.test(v)) { const [r, g, b] = hexToRgb(v); emit(hexToHsv(rgbToHex(r, g, b, hsv[3])), true); }
              }}
            />
          </label>
          <button type="button" className="col-chip" onClick={onEyedropper}>💧 {t.eyedropper}</button>
        </div>
      </div>
      {recent.length > 0 && (
        <div className="col-recent">
          <span>{t.recent}</span>
          {recent.map((c) => <button key={c} type="button" className="col-swatch" style={{ background: c }} aria-label={c} onClick={() => emit(hexToHsv(c), true)} />)}
        </div>
      )}
    </div>
  );
}
