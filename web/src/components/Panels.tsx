import { BANDS, type EditState, type Recipe } from '../engine/types';
import { formatDate, stampColorOf } from '../engine/pipeline';
import type { Strings } from '../i18n';
import type { CSSProperties } from 'react';

type SetAdj = (key: string, value: number) => void;
type SetEdit = (patch: Partial<EditState>) => void;

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  swatch?: string;
  suffix?: string;
  baseline?: number;
}

export function Slider({ label, value, min, max, onChange, swatch, suffix, baseline = 0 }: SliderProps) {
  const changed = value !== baseline;
  const shown = suffix ? value + suffix : value > 0 ? '+' + value : value < 0 ? '−' + Math.abs(value) : '0';
  const pct = ((value - min) / (max - min)) * 100;
  const zero = ((Math.max(min, Math.min(max, 0)) - min) / (max - min)) * 100;
  const fillFrom = Math.min(pct, zero), fillTo = Math.max(pct, zero);
  return (
    <label className="slider" onDoubleClick={() => onChange(baseline)}>
      <span className="slider-head">
        <span className="slider-label">
          {swatch && <span className="dot" style={{ background: swatch }} aria-hidden="true" />}
          {label}
        </span>
        <span className={changed ? 'slider-val on' : 'slider-val'}>{shown}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--fill': `linear-gradient(90deg, var(--track) ${fillFrom}%, var(--wine-2) ${fillFrom}%, var(--wine-2) ${fillTo}%, var(--track) ${fillTo}%)` } as CSSProperties}
      />
    </label>
  );
}

interface PillsProps<T extends string> {
  items: { id: T; label: string; swatch?: string }[];
  value: T;
  onPick: (id: T) => void;
  grid?: boolean;
  disabled?: boolean;
}

export function Pills<T extends string>({ items, value, onPick, grid, disabled }: PillsProps<T>) {
  return (
    <div className={grid ? 'pills grid' : 'pills'}>
      {items.map((it) => (
        <button key={it.id} type="button" data-id={it.id} disabled={disabled && it.id !== value} className={it.id === value ? 'pill on' : 'pill'} aria-pressed={it.id === value} onClick={() => onPick(it.id)}>
          {it.swatch && <span className="dot" style={{ background: it.swatch }} aria-hidden="true" />}
          {it.label}
        </button>
      ))}
    </div>
  );
}

const sliderDefs: Record<string, { key: string; min: number; max: number }[]> = {
  light: [
    { key: 'exposure', min: -100, max: 100 }, { key: 'contrast', min: -100, max: 100 }, { key: 'highlights', min: -100, max: 100 },
    { key: 'shadows', min: -100, max: 100 }, { key: 'whites', min: -100, max: 100 }, { key: 'blacks', min: -100, max: 100 },
    { key: 'brightness', min: -100, max: 100 }, { key: 'fade', min: 0, max: 100 }
  ],
  curve: [
    { key: 'curveHighlights', min: -100, max: 100 }, { key: 'curveLights', min: -100, max: 100 },
    { key: 'curveDarks', min: -100, max: 100 }, { key: 'curveShadows', min: -100, max: 100 }
  ],
  color: [
    { key: 'temperature', min: -100, max: 100 }, { key: 'tint', min: -100, max: 100 }, { key: 'vibrance', min: -100, max: 100 },
    { key: 'saturation', min: -100, max: 100 }, { key: 'hue', min: -180, max: 180 }
  ],
  detail: [
    { key: 'clarity', min: -100, max: 100 }, { key: 'dehaze', min: -100, max: 100 }, { key: 'sharpen', min: 0, max: 100 }, { key: 'softness', min: 0, max: 100 }
  ],
  effects: [
    { key: 'grain', min: 0, max: 100 }, { key: 'grainSize', min: 0, max: 100 }, { key: 'vignette', min: -100, max: 100 }, { key: 'bloom', min: 0, max: 100 },
    { key: 'leak', min: 0, max: 100 }, { key: 'dust', min: 0, max: 100 }, { key: 'chroma', min: 0, max: 100 }, { key: 'scanlines', min: 0, max: 100 },
    { key: 'glitch', min: 0, max: 100 }, { key: 'lofi', min: 0, max: 100 }, { key: 'flicker', min: 0, max: 100 }
  ]
};

export function SliderGroup({ group, edit, setAdj, t }: { group: string; edit: EditState; setAdj: SetAdj; t: Strings }) {
  const labels: Record<string, string> = { hue: t.hueShift };
  return (
    <div className="stack">
      {group === 'curve' && <p className="note">{t.curveNote}</p>}
      {sliderDefs[group].map((d) => (
        <Slider key={d.key} label={labels[d.key] || (t as any)[d.key] || d.key} min={d.min} max={d.max} value={edit.adj[d.key] || 0} onChange={(v) => setAdj(d.key, v)} />
      ))}
    </div>
  );
}

export function HslPanel({ edit, setAdj, band, setBand, t }: { edit: EditState; setAdj: SetAdj; band: string; setBand: (b: string) => void; t: Strings }) {
  return (
    <div className="stack">
      <Pills items={BANDS.map((b) => ({ id: b.id, label: (t as any)[b.id], swatch: b.sw }))} value={band as any} onPick={(b) => setBand(b)} />
      <Slider label={t.hue} min={-100} max={100} value={edit.adj['hsl_' + band + '_h'] || 0} onChange={(v) => setAdj('hsl_' + band + '_h', v)} />
      <Slider label={t.saturation} min={-100} max={100} value={edit.adj['hsl_' + band + '_s'] || 0} onChange={(v) => setAdj('hsl_' + band + '_s', v)} />
      <Slider label={t.luminance} min={-100} max={100} value={edit.adj['hsl_' + band + '_l'] || 0} onChange={(v) => setAdj('hsl_' + band + '_l', v)} />
    </div>
  );
}

export function GradingPanel({ edit, setAdj, recipe, t }: { edit: EditState; setAdj: SetAdj; recipe: Recipe; t: Strings }) {
  const block = (title: string, hk: string, sk: string) => {
    const hv = edit.adj[hk] || recipe[hk] || 0;
    return (
      <div className="card" key={hk}>
        <span className="card-title">{title}</span>
        <Slider label={t.hue} min={0} max={360} value={edit.adj[hk] || 0} suffix="°" swatch={`hsl(${hv}, 80%, 60%)`} onChange={(v) => setAdj(hk, v)} />
        <Slider label={t.amount} min={0} max={100} value={edit.adj[sk] || 0} onChange={(v) => setAdj(sk, v)} />
      </div>
    );
  };
  return (
    <div className="stack">
      {block(t.gShadows, 'gShH', 'gShS')}
      {block(t.gMidtones, 'gMidH', 'gMidS')}
      {block(t.gHighlights, 'gHiH', 'gHiS')}
      <Slider label={t.gBalance} min={-100} max={100} value={edit.adj.gBal || 0} onChange={(v) => setAdj('gBal', v)} />
    </div>
  );
}

export function RetouchPanel({ edit, setAdj, onAuto, t }: { edit: EditState; setAdj: SetAdj; onAuto: () => void; t: Strings }) {
  return (
    <div className="stack">
      <button type="button" className="btn primary wide" onClick={onAuto}>{t.autoEnhance}</button>
      <p className="note">{t.autoNote}</p>
      <Slider label={t.smoothSkin} min={0} max={100} value={edit.adj.smoothSkin || 0} onChange={(v) => setAdj('smoothSkin', v)} />
      <p className="note">{t.retouchNote}</p>
      <Slider label={t.bloom} min={0} max={100} value={edit.adj.bloom || 0} onChange={(v) => setAdj('bloom', v)} />
      <Slider label={t.clarity} min={-100} max={100} value={edit.adj.clarity || 0} onChange={(v) => setAdj('clarity', v)} />
    </div>
  );
}

export function FramePanel({ edit, setEdit, recipe, t }: { edit: EditState; setEdit: SetEdit; recipe: Recipe; t: Strings }) {
  const names: Record<string, string> = { auto: t.fAuto, none: t.fNone, border: t.fBorder, instant: t.fInstant, square: t.fSquare, film: t.fFilm, slide: t.fSlide, half: t.fHalf, '8mm': t.f8mm, cinema: t.fCinema };
  return (
    <div className="stack">
      <p className="note">{t.frameNote.replace('{x}', names[recipe.frame || 'none'])}</p>
      <Pills grid items={Object.keys(names).map((id) => ({ id: id as any, label: names[id] }))} value={edit.frame} onPick={(f) => setEdit({ frame: f })} />
    </div>
  );
}

export function CropPanel({ edit, setEdit, t }: { edit: EditState; setEdit: SetEdit; t: Strings }) {
  const ratios = ['original', '1:1', '4:5', '3:4', '9:16', '16:9', '3:2', '2:3'];
  return (
    <div className="stack">
      <span className="h">{t.aspect}</span>
      <Pills items={ratios.map((r) => ({ id: r, label: r === 'original' ? t.ratioOriginal : r }))} value={edit.aspect} onPick={(a) => setEdit({ aspect: a })} />
      <span className="h">{t.transform}</span>
      <div className="row">
        <button type="button" className="btn" onClick={() => setEdit({ flipH: !edit.flipH })}>{edit.flipH ? t.flipped : t.flip}</button>
        <button type="button" className="btn" onClick={() => setEdit({ rotate: (edit.rotate + 90) % 360 })}>{t.rotate}</button>
      </div>
    </div>
  );
}

export function StampPanel({ edit, setEdit, recipe, t, noDate, setNoDate }: { edit: EditState; setEdit: SetEdit; recipe: Recipe; t: Strings; noDate: boolean; setNoDate: (on: boolean) => void }) {
  const showing = !noDate && (edit.stamp === 'auto' ? !!recipe.stamp : edit.stamp !== 'off');
  const on = (patch: Partial<EditState>) => setEdit(showing ? patch : { ...patch, stamp: 'date' });
  const toggleNever = () => {
    const next = !noDate;
    setNoDate(next);
    setEdit({ stamp: next ? 'off' : 'auto' });
  };
  return (
    <div className="stack">
      <button type="button" role="switch" aria-checked={noDate} className={noDate ? 'switch-row on' : 'switch-row'} onClick={toggleNever} data-testid="never-date">
        <span className="switch-text">
          <span className="switch-title">{t.neverDate}</span>
          <span className="note">{t.neverDateNote}</span>
        </span>
        <span className="switch" aria-hidden="true"><span /></span>
      </button>
      <span className="h">{t.overlayStyle}</span>
      <Pills
        items={[{ id: 'off', label: t.noDate }, { id: 'auto', label: t.fAuto }, { id: 'date', label: t.date }, { id: 'vhs', label: t.vhs }, { id: 'dcr', label: t.camcorder }, { id: 'cctv', label: t.cctv }] as any}
        value={noDate ? 'off' : edit.stamp}
        disabled={noDate}
        onPick={(s: any) => setEdit({ stamp: s })}
      />
      {noDate && <p className="note">{t.dateLocked}</p>}
      <div className={noDate ? 'stack locked' : 'stack'} aria-disabled={noDate}>
        <span className="h">{t.dateSize}</span>
        <Pills
          items={[{ id: 'small', label: t.small }, { id: 'medium', label: t.medium }, { id: 'large', label: t.large }] as any}
          value={edit.stampSize}
          disabled={noDate}
          onPick={(s: any) => on({ stampSize: s })}
        />
        <span className="h">{t.dateColor}</span>
        <Pills
          items={[
            { id: 'match', label: t.matchFilter, swatch: recipe.stampColor || '#ff8a1f' }, { id: 'orange', label: t.orange, swatch: '#ff8a1f' },
            { id: 'yellow', label: t.yellow, swatch: '#ffd23d' }, { id: 'red', label: t.red, swatch: '#ff4a3d' }, { id: 'white', label: t.white, swatch: '#f4f4f4' }
          ] as any}
          value={edit.stampColor}
          disabled={noDate}
          onPick={(c: any) => on({ stampColor: c })}
        />
        <span className="h">{t.dateFormat}</span>
        <Pills items={(['yy', 'dd', 'iso', 'mon'] as const).map((f) => ({ id: f, label: formatDate(f) }))} value={edit.dateFormat} disabled={noDate} onPick={(f) => on({ dateFormat: f, dateText: formatDate(f) })} />
        <label className="field">
          <span className="h">{t.dateText}</span>
          <input type="text" className="date-input" value={edit.dateText} disabled={noDate} style={{ color: stampColorOf(edit, recipe, edit.stamp === 'auto' ? (recipe.stamp || 'date') : edit.stamp === 'off' ? 'date' : edit.stamp) }} onChange={(e) => setEdit({ dateText: e.target.value })} />
        </label>
      </div>
    </div>
  );
}

export function LayerPanel({ hasOverlay, onOverlay, clearOverlay, t }: { hasOverlay: boolean; onOverlay: (f: File) => void; clearOverlay: () => void; t: Strings }) {
  return (
    <div className="stack">
      <span className="h">{t.doubleExposure}</span>
      <p className="note">{t.layerNote}</p>
      {hasOverlay ? (
        <button type="button" className="btn wide" onClick={clearOverlay}>{t.removeSecond}</button>
      ) : (
        <label className="btn wide file">
          {t.addSecond}
          <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onOverlay(f); e.target.value = ''; }} />
        </label>
      )}
    </div>
  );
}
