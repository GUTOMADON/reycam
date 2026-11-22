/**
 * Device and environment checks. ReyCam runs as a static site, as an installed
 * web app on the Home Screen, inside the Capacitor iOS app, or behind the
 * optional FastAPI server, and a few behaviors depend on which one it is.
 */
const nav: Navigator | null = typeof navigator !== 'undefined' ? navigator : null;
const ua = nav ? nav.userAgent : '';

/** iPhone, iPod or iPad. iPadOS reports a Mac user agent, so touch support tells them apart. */
export const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && !!nav && nav.maxTouchPoints > 1);

/** Safari itself, not Chrome, Firefox, Edge or an app that shows pages in its own browser. */
export const isIOSSafari = isIOS && /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|YaBrowser|DuckDuckGo|Brave|GSA\/|FBAN|FBAV|FB_IAB|Instagram|Line\/|LinkedInApp|Twitter|musical_ly|BytedanceWebview|Snapchat|Pinterest/.test(ua);

/** Running inside the Capacitor app (Capacitor injects this object before the page loads). */
export function isNative(): boolean {
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

/** Opened from the Home Screen as an installed web app. */
export function isStandalone(): boolean {
  if ((nav as any)?.standalone === true) return true;
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches;
  } catch {
    return false;
  }
}

/**
 * True only when the page comes from the ReyCam FastAPI server, which adds
 * <meta name="reycam-api">, or when a developer sets VITE_API=1. Static hosts
 * never call /api, so presets, favorites and language stay on the device.
 */
export function hasApi(): boolean {
  if (import.meta.env.VITE_API === '1') return true;
  return typeof document !== 'undefined' && !!document.querySelector('meta[name="reycam-api"]');
}

/**
 * Largest pixel area one canvas may hold. Safari on iPhone and iPad refuses
 * canvases above 4096 x 4096 pixels, Android browsers have similar limits and
 * desktop browsers allow much more.
 */
export const MAX_CANVAS_AREA = isIOS ? 16_777_216 : /Android/i.test(ua) ? 16_000_000 : 50_000_000;
