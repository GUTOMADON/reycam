import { memo, useEffect, useRef, useState } from 'react';
import type { Recipe } from '../engine/types';
import type { Strings } from '../i18n';
import { lookDesc } from '../i18n';

export const CAT_KEY: Record<string, string> = {
  all: 'catAll', fav: 'catFav', moody: 'catMoody', bw: 'catBw', film: 'catFilm', sim: 'catSims', y2k: 'catY2k', flash: 'catFlash', indie: 'catIndie', lowlight: 'catLowlight',
  nature: 'catNature', yellow: 'catYellow', green: 'catGreen', wine: 'catWine', color: 'catColors', video: 'catVideo', extra: 'catExtras', lu: 'catLu', mine: 'catMine'
};

/** Accent dot shown next to each category. */
const CAT_DOT: Record<string, string> = {
  all: '#f4dce2', fav: '#ff4d6d', moody: '#3f8f86', bw: '#d9d9d9', film: '#e8a35c', indie: '#ff7a59', y2k: '#7cc4ff', flash: '#fff3b0', sim: '#c9b8a6', yellow: '#ffd23d',
  green: '#4fd16b', wine: '#9e2a4a', lowlight: '#6b6bff', nature: '#8fbf6a', color: '#d58bff', video: '#ff5c5c', extra: '#5ce1e6', lu: '#b0284f', mine: '#f08b8f'
};

export const descOf = (r: Recipe, lang: string) => lookDesc(lang, r.id, r.desc);

export function Heart({ on, size = 16 }: { on: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
      <path d="M12 20.5s-7.5-4.6-9.3-9.4C1.4 7.6 3.6 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.6 0 5.8 3.6 4.5 7.1-1.8 4.8-9.3 9.4-9.3 9.4z" />
    </svg>
  );
}

interface CardProps {
  r: Recipe;
  thumb?: string;
  selected: boolean;
  fav: boolean;
  catLabel: string;
  desc: string;
  favLabel: string;
  delLabel: string;
  onPick: (id: string) => void;
  onFav: (id: string) => void;
  onDelete: (id: string) => void;
  onVisible: (id: string) => void;
}

const LookCard = memo(function LookCard({ r, thumb, selected, fav, catLabel, desc, favLabel, delLabel, onPick, onFav, onDelete, onVisible }: CardProps) {
  const mine = r.cat === 'mine';
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = cardRef.current;
    if (!el || thumb || mine) return;
    if (!('IntersectionObserver' in window)) { onVisible(r.id); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        onVisible(r.id);
        observer.disconnect();
      }
    }, { rootMargin: '160px 0px', threshold: 0.01 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [r.id, thumb, mine, onVisible]);
  return (
    <div ref={cardRef} className={selected ? 'look on' : 'look'} data-look={r.id}>
      <button type="button" className="look-btn" onClick={() => onPick(r.id)} aria-pressed={selected} title={desc}>
        <span className="look-img">
          {thumb ? <img src={thumb} alt="" decoding="async" /> : <span className="thumb-ph" />}
          {r.badge && <span className={'look-badge ' + r.badge} aria-hidden="true">{r.badge === 'star' ? '★' : '⚡'}</span>}
        </span>
        <span className="look-name">{r.name}</span>
        <span className="look-cat">{catLabel}</span>
      </button>
      {mine ? (
        <button type="button" className="look-del" aria-label={delLabel + ' ' + r.name} onClick={() => onDelete(r.id)}>×</button>
      ) : (
        <button type="button" className={fav ? 'look-fav on' : 'look-fav'} aria-pressed={fav} aria-label={favLabel + ' ' + r.name} title={favLabel} onClick={() => onFav(r.id)}>
          <Heart on={fav} size={15} />
        </button>
      )}
    </div>
  );
});

interface LibraryProps {
  t: Strings;
  lang: string;
  categories: readonly string[];
  counts: Record<string, number>;
  total: number;
  cat: string;
  setCat: (c: string) => void;
  query: string;
  setQuery: (q: string) => void;
  looks: Recipe[];
  thumbs: Record<string, string>;
  selectedId: string;
  favs: Set<string>;
  onPick: (id: string) => void;
  onFav: (id: string) => void;
  onDelete: (id: string) => void;
  onVisible: (id: string) => void;
  mobile?: boolean;
}

export const Library = memo(function Library(p: LibraryProps) {
  const { t, lang, categories, counts, cat, setCat, looks, thumbs, selectedId, favs } = p;
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const label = (c: string) => (t as any)[CAT_KEY[c]] as string;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey); };
  }, [open]);

  const pick = (c: string) => { setCat(c); setOpen(false); };
  const catRow = useRef<HTMLDivElement>(null);

  // Keep the active category chip in view on phones.
  useEffect(() => {
    if (!p.mobile) return;
    catRow.current?.querySelector<HTMLElement>('.cat-chip.on')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [cat, p.mobile]);

  const cards = looks.map((r) => (
    <LookCard
      key={r.id}
      r={r}
      thumb={thumbs[r.id]}
      selected={r.id === selectedId && r.cat !== 'mine'}
      fav={favs.has(r.id)}
      catLabel={label(r.cat)}
      desc={descOf(r, lang)}
      favLabel={favs.has(r.id) ? t.favRemove : t.favAdd}
      delLabel={t.deletePreset}
      onPick={p.onPick}
      onFav={p.onFav}
      onDelete={p.onDelete}
      onVisible={p.onVisible}
    />
  ));

  const emptyNote = (
    <>
      {cat === 'mine' && looks.length === 0 && <p className="note">{t.noPresets}</p>}
      {cat === 'fav' && looks.length === 0 && <p className="empty"><Heart on={false} size={22} /><span>{t.noFavs}</span></p>}
      {cat !== 'fav' && cat !== 'mine' && looks.length === 0 && <p className="note">{t.noResults}</p>}
    </>
  );

  if (p.mobile) {
    const chips = ['all', 'fav', ...categories.filter((c) => c !== 'all' && c !== 'fav')];
    return (
      <div className="library m-lib">
        <div className="lib-search m-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          <input className="search" type="search" placeholder={t.searchLooks} aria-label={t.searchLooks} value={p.query} onChange={(e) => p.setQuery(e.target.value)} />
          {p.query && <button type="button" className="m-search-x" aria-label={t.close} onClick={() => p.setQuery('')}>×</button>}
        </div>
        <div className="m-cats" ref={catRow} role="tablist" aria-label={t.categories}>
          {chips.map((c) => (
            <button key={c} type="button" role="tab" aria-selected={cat === c} className={cat === c ? 'cat-chip on' : 'cat-chip'} onClick={() => pick(c)}>
              {c === 'fav' ? <Heart on={cat === 'fav'} size={13} /> : c === 'lu' ? <span className="bolt" aria-hidden="true">⚡</span> : c !== 'all' && <span className="dot" style={{ background: CAT_DOT[c] }} aria-hidden="true" />}
              <span>{label(c)}</span>
              {c !== 'all' && <span className="n">{counts[c] || 0}</span>}
            </button>
          ))}
        </div>
        <div className="m-grid-wrap">
          {emptyNote}
          <div className="looks m-grid">{cards}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="library">
      <div className="lib-head">
        <h2>{t.looks}</h2>
        <span className="count">{p.total}</span>
      </div>
      <div className="lib-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
        <input className="search" type="search" placeholder={t.searchLooks} aria-label={t.searchLooks} value={p.query} onChange={(e) => p.setQuery(e.target.value)} />
      </div>

      <div className="cat-bar" ref={wrap}>
        <button type="button" className={cat === 'all' ? 'seg on' : 'seg'} onClick={() => pick('all')}>{label('all')}</button>
        <button type="button" className={cat === 'fav' ? 'seg on fav' : 'seg fav'} onClick={() => pick('fav')}>
          <Heart on={cat === 'fav' || counts.fav > 0} size={14} /> {counts.fav || 0}
        </button>
        <button type="button" className={open || (cat !== 'all' && cat !== 'fav') ? 'seg grow on-soft' : 'seg grow'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span className="dot" style={{ background: CAT_DOT[cat === 'all' || cat === 'fav' ? 'all' : cat] }} aria-hidden="true" />
          <span className="ellipsis">{cat === 'all' || cat === 'fav' ? t.categories : label(cat)}</span>
          <svg className={open ? 'chev up' : 'chev'} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        {open && (
          <div className="cat-pop" role="menu">
            {categories.filter((c) => c !== 'all' && c !== 'fav').map((c) => (
              <button key={c} type="button" role="menuitemradio" aria-checked={cat === c} className={cat === c ? 'cat-item on' : 'cat-item'} onClick={() => pick(c)}>
                <span className="dot" style={{ background: CAT_DOT[c] }} aria-hidden="true" />
                <span className="ellipsis">{label(c)}</span>
                <span className="n">{counts[c] || 0}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {emptyNote}

      <div className="looks">{cards}</div>
    </div>
  );
});
