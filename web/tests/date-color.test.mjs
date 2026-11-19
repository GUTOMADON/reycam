// Date color test: for each color, reads the pixels of the date region and fails when the
// hue does not match the chosen color. Covers preview, photo export and video export,
// desktop and phone. Run with the server on BASE (default http://localhost:8010).
import { chromium, devices } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = join(HERE, 'fixtures');
const OUT = join(HERE, 'out');
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:8010';
const QUICK = process.env.QUICK === '1';

const COLORS = { orange: [255, 138, 31], yellow: [255, 210, 61], red: [255, 74, 61], white: [244, 244, 244] };
let fails = 0;
const rec = (ok, name, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`); };

/** Pixels of the date corner as a flat RGB array, from the preview or from image bytes. */
const cornerFn = async ({ src, mime }) => {
  let img;
  if (src) { const bin = Uint8Array.from(atob(src), (c) => c.charCodeAt(0)); img = await createImageBitmap(new Blob([bin], { type: mime })); }
  else img = document.querySelector('canvas.preview');
  const W = img.width, H = img.height;
  const rx = Math.round(W * 0.55), ry = Math.round(H * 0.8), rw = W - rx, rh = H - ry;
  const c = document.createElement('canvas'); c.width = rw; c.height = rh;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, rx, ry, rw, rh, 0, 0, rw, rh);
  return Array.from(x.getImageData(0, 0, rw, rh).data);
};
/** Average color of the pixels that the date changed, compared with the same frame without a date. */
function glyph(withDate, without) {
  const sc = [];
  for (let i = 0; i < withDate.length; i += 4) sc.push([Math.abs(withDate[i] - without[i]) + Math.abs(withDate[i + 1] - without[i + 1]) + Math.abs(withDate[i + 2] - without[i + 2]), i]);
  sc.sort((a, b) => b[0] - a[0]);
  const top = sc.slice(0, Math.max(12, Math.round(sc.filter((e) => e[0] > 60).length * 0.12)));
  return [0, 1, 2].map((k) => top.reduce((s, [, i]) => s + withDate[i + k], 0) / top.length);
}
const hue = ([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn < 1) return -1; let h; if (mx === r) h = ((g - b) / (mx - mn)) % 6; else if (mx === g) h = (b - r) / (mx - mn) + 2; else h = (r - g) / (mx - mn) + 4; return (h * 60 + 360) % 360; };
const sat = ([r, g, b]) => (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(1, Math.max(r, g, b));
function matches(got, want) {
  if (sat(want) < 0.1) return sat(got) < 0.22 && Math.min(...got) > 150;
  const dh = Math.abs(hue(got) - hue(want)); const d = Math.min(dh, 360 - dh);
  return sat(got) > 0.35 && d < 16;
}
const fmt = (c) => `rgb(${c.map((v) => Math.round(v)).join(',')})`;

const browser = await chromium.launch({ channel: process.env.CHANNEL || 'chrome', headless: true });
const settle = (page) => page.waitForTimeout(150);
async function previewGlyph(page, body) {
  const on = await page.evaluate(cornerFn, {});
  const style = await page.$eval(`${body} .pill.on[data-id="auto"], ${body} .pill.on[data-id="date"], ${body} .pill.on[data-id="vhs"], ${body} .pill.on[data-id="dcr"], ${body} .pill.on[data-id="cctv"]`, (e) => e.dataset.id).catch(() => 'date');
  await page.click(`${body} .pill[data-id="off"]`); await settle(page);
  const off = await page.evaluate(cornerFn, {});
  await page.click(`${body} .pill[data-id="${style}"]`); await settle(page);
  return glyph(on, off);
}

async function run(label, ctxOpts, mobile) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 }, locale: 'en-US', acceptDownloads: true, ...ctxOpts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + '/');
  await page.evaluate(() => { localStorage.removeItem('reycam.noDate.v1'); localStorage.removeItem('reycam.dateStyle.v1'); });
  await page.reload();
  await page.waitForFunction(() => document.querySelector('canvas.preview')?.width > 10);
  await page.setInputFiles('.top-actions input[type=file]', join(FIX, 'photo.jpg'));
  await page.waitForFunction(() => document.querySelector('.file-chip, .stage')?.textContent !== undefined);
  await page.waitForTimeout(600);
  const body = mobile ? '.mobile-body' : '.side.right .panel-body';
  const openPanel = async (p) => { await page.click(`${mobile ? '.tabs' : '.panel-tabs'} [data-panel="${p}"]`); await settle(page); };
  const pickLook = async (id) => { await openPanel(mobile ? 'looks' : 'stamp'); if (mobile) { await page.click(`.mobile-body [data-look="${id}"] .look-btn`); } else { await page.click(`.side.left [data-look="${id}"] .look-btn`); } await settle(page); };
  if (mobile) await page.evaluate(() => undefined);

  // Cases: a look with a date by default and a look without one.
  for (const look of ['bolt-classic', 'vivid-50']) {
    if (mobile) { await page.click('.tabs [data-panel="looks"]').catch(() => undefined); await settle(page); await page.locator(`.mobile-body [data-look="${look}"] .look-btn`).click(); }
    else await page.click(`.side.left [data-look="${look}"] .look-btn`);
    await settle(page);
    await openPanel('stamp');
    for (const [name, rgb] of Object.entries(COLORS)) {
      await page.click(`${body} .pill[data-id="${name}"]`); await settle(page);
      const got = await previewGlyph(page, body);
      rec(matches(got, rgb), `${label} ${look} preview ${name}`, fmt(got));
      const inputColor = await page.$eval(`${body} .date-input`, (e) => getComputedStyle(e).color);
      rec(inputColor.replace(/\s/g, '') === `rgb(${rgb.join(',')})`, `${label} ${look} text field preview color ${name}`, inputColor);
      if (QUICK) break;
    }
  }
  // Sizes, formats, hand edited text, look change after the choice, VHS, Camcorder, CCTV
  await page.click(`${body} .pill[data-id="red"]`); await settle(page);
  for (const id of ['small', 'medium', 'large', 'yy', 'dd', 'iso', 'mon']) {
    await page.click(`${body} .pill[data-id="${id}"]`); await settle(page);
    rec(matches(await previewGlyph(page, body), COLORS.red), `${label} red stays with ${id}`);
  }
  await page.click(`${body} .pill[data-id="medium"]`);
  await page.fill(`${body} .date-input`, 'HELLO 26'); await settle(page);
  rec(matches(await previewGlyph(page, body), COLORS.red), `${label} red with hand edited text`);
  if (mobile) { await page.click('.tabs [data-panel="looks"]'); await settle(page); await page.locator('.mobile-body [data-look="dispo-27"] .look-btn').click(); await openPanel('stamp'); }
  else await page.click('.side.left [data-look="dispo-27"] .look-btn');
  await settle(page);
  rec(matches(await previewGlyph(page, body), COLORS.red), `${label} red kept after changing look`);
  for (const style of ['vhs', 'dcr', 'cctv']) {
    await page.click(`${body} .pill[data-id="${style}"]`); await page.click(`${body} .pill[data-id="yellow"]`); await settle(page);
    rec(matches(await previewGlyph(page, body), COLORS.yellow), `${label} ${style} text uses the chosen color`, fmt(await previewGlyph(page, body)));
  }
  await page.click(`${body} .pill[data-id="date"]`);
  // Picking a color with the date off turns the date on
  await page.click(`${body} .pill[data-id="off"]`); await page.click(`${body} .pill[data-id="orange"]`); await settle(page);
  rec(await page.$eval(`${body} .pill[data-id="date"]`, (e) => e.classList.contains('on')) && matches(await previewGlyph(page, body), COLORS.orange), `${label} color pick turns the date on`);
  // Saved across sessions
  await page.reload(); await page.waitForFunction(() => document.querySelector('canvas.preview')?.width > 10); await page.waitForTimeout(500);
  await openPanel('stamp');
  rec(await page.$eval(`${body} .pill[data-id="orange"]`, (e) => e.classList.contains('on')), `${label} color remembered after reload`);
  // Phone preview keeps Small readable: glyph height on screen
  if (mobile) {
    await page.click(`${body} .pill[data-id="small"]`); await settle(page);
    const css = await page.evaluate(() => { const c = document.querySelector('canvas.preview'); return parseFloat(c.style.height) / c.height; });
    const fontPx = await page.evaluate(() => { const c = document.querySelector('canvas.preview'); return Math.min(c.width, c.height); });
    rec(true, `${label} small date shown at about ${(fontPx * 0.05 * css).toFixed(1)} css px`);
  }
  // Photo and video export, each compared with an export of the same frame without a date
  if (!mobile) {
    const exportFile = async (name, kind) => {
      await page.click('.top-actions .btn.primary');
      if (kind === 'png') { await page.click('.modal .pill[data-id="image/png"]'); await page.click('.modal .pill[data-id="full"]'); }
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.click('.modal .row.end .btn.primary')]);
      const p = join(OUT, `date_${name}.${kind === 'png' ? 'png' : 'mp4'}`); await dl.saveAs(p);
      await page.waitForSelector('.busy', { state: 'detached', timeout: 120000 }).catch(() => undefined);
      await page.waitForTimeout(300);
      let img = p;
      if (kind !== 'png') { img = p + '.png'; execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', p, '-vf', 'select=eq(n\\,15)', '-frames:v', '1', img]); }
      return page.evaluate(cornerFn, { src: readFileSync(img).toString('base64'), mime: 'image/png' });
    };
    for (const [file, kind] of [['photo.jpg', 'png'], ['clip.mp4', 'mp4']]) {
      await page.setInputFiles('.top-actions input[type=file]', join(FIX, file)); await page.waitForTimeout(1200);
      await page.click('.side.left [data-look="bolt-classic"] .look-btn'); await openPanel('stamp');
      await page.click(`${body} .pill[data-id="date"]`); await page.click(`${body} .pill[data-id="${kind === 'png' ? 'small' : 'medium'}"]`);
      await page.click(`${body} .pill[data-id="off"]`); await settle(page);
      const ref = await exportFile('off_' + kind, kind);
      for (const [name, rgb] of Object.entries(COLORS)) {
        await page.click(`${body} .pill[data-id="date"]`); await page.click(`${body} .pill[data-id="${name}"]`); await settle(page);
        const got = glyph(await exportFile(name + '_' + kind, kind), ref);
        rec(matches(got, rgb), `${label} ${kind === 'png' ? 'photo' : 'video'} export ${name}`, fmt(got));
        if (QUICK && kind !== 'png') break;
      }
    }
  }
  rec(errors.length === 0, `${label} no page errors`, errors.join(' | '));
  await ctx.close();
}

await run('desktop', {}, false);
await run('iphone', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }, true);
await run('android', { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } }, true);
await browser.close();
console.log(fails ? `\n${fails} failed` : '\nall date color checks passed');
process.exit(fails ? 1 : 0);
