import { en, type Strings } from './en';
import pt from './locales/pt.json';
import es from './locales/es.json';
import zh from './locales/zh.json';
import hi from './locales/hi.json';
import de from './locales/de.json';

type Bundle = { ui: Partial<Strings>; looks: Record<string, string> };

/** Fully translated languages. Everything else falls back to English. */
const BUNDLES: Record<string, Bundle> = { pt, es, zh, hi, de } as Record<string, Bundle>;
export const SUPPORTED = ['en', ...Object.keys(BUNDLES)];

/** Languages offered in the picker. Untranslated ones show English text. */
const CODES = ['af', 'am', 'ar', 'ay', 'az', 'be', 'bg', 'bn', 'bs', 'ca', 'cs', 'cy', 'da', 'de', 'el', 'en', 'es', 'et', 'eu', 'fa', 'fi', 'fil', 'fo', 'fr', 'ga', 'gl', 'gn', 'gu', 'ha', 'haw', 'he', 'hi', 'hr', 'ht', 'hu', 'hy', 'id', 'ig', 'is', 'it', 'ja', 'jv', 'ka', 'kk', 'km', 'kn', 'ko', 'ku', 'ky', 'la', 'lb', 'lo', 'lt', 'lv', 'mg', 'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 'my', 'ne', 'nl', 'no', 'ny', 'or', 'pa', 'pl', 'ps', 'pt', 'qu', 'ro', 'ru', 'rw', 'sd', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'st', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tl', 'tr', 'tt', 'ug', 'uk', 'ur', 'uz', 'vi', 'xh', 'yi', 'yo', 'zh', 'zu'];
const TOP = ['en', 'pt', 'es', 'zh', 'hi', 'de'];
export const RTL = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi'];
export const AUTO = 'auto';

function nativeName(code: string): string {
  try {
    const n = new Intl.DisplayNames([code], { type: 'language' }).of(code);
    return n ? n.charAt(0).toLocaleUpperCase(code) + n.slice(1) : code;
  } catch {
    return code;
  }
}

export const LANGUAGES: { code: string; name: string }[] = (() => {
  const rest = CODES.filter((c) => !TOP.includes(c)).map((code) => ({ code, name: nativeName(code) }));
  rest.sort((a, b) => a.name.localeCompare(b.name));
  return TOP.map((code) => ({ code, name: nativeName(code) })).concat(rest);
})();

const ALIASES: Record<string, string> = { iw: 'he', in: 'id', ji: 'yi', nb: 'no', nn: 'no', tl: 'fil', cmn: 'zh', yue: 'zh' };

/** Reduce a BCP 47 tag such as pt-BR, es_MX or zh-Hant-TW to a base code the picker knows. */
export function baseCode(tag: string | null | undefined): string {
  if (!tag) return '';
  const base = tag.trim().toLowerCase().replace('_', '-').split('-')[0];
  return ALIASES[base] || base;
}

/** First translated language in a preference list, or null. */
export function pickSupported(tags: readonly string[]): string | null {
  for (const tag of tags) {
    const b = baseCode(tag);
    if (SUPPORTED.includes(b)) return b;
  }
  return null;
}

/** Language from the phone or browser settings, if we have a translation for it. */
export function browserLanguage(): string | null {
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  if (!nav) return null;
  const list = nav.languages && nav.languages.length ? nav.languages : [nav.language];
  return pickSupported(list.filter(Boolean));
}

export function strings(lang: string): Strings {
  const b = BUNDLES[lang];
  return (b ? { ...en, ...b.ui } : en) as Strings;
}

/** Translated look description, falling back to the English recipe text. */
export function lookDesc(lang: string, id: string, fallback: string): string {
  return BUNDLES[lang]?.looks[id] || fallback;
}

export function isComplete(lang: string): boolean {
  return SUPPORTED.includes(lang);
}

export type { Strings };
