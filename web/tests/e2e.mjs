// End to end tests for ReyCam in a real browser (Playwright with the installed Chrome).
// Start the server first (python -m uvicorn main:app --port 8010 in /server), then: npm run test:e2e
// Writes tests/out/results.json and screenshots to tests/out/shots.
import { chromium, devices } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = join(HERE, 'fixtures');
const OUT = join(HERE, 'out');
const SHOTS = join(OUT, 'shots');
mkdirSync(SHOTS, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:8010';
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const want = (group) => !ONLY.length || ONLY.includes(group);

const results = [];
const rec = (group, name, ok, detail = '') => {
  results.push({ group, name, status: ok ? 'OK' : 'FAIL', detail: String(detail) });
  console.log(`${ok ? 'OK  ' : 'FAIL'} [${group}] ${name}${detail ? ' :: ' + detail : ''}`);
};
const consoleIssues = [];
const watch = (page, label) => {
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') consoleIssues.push(`${label} ${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => consoleIssues.push(`${label} pageerror: ${e.message}`));
};
const b64 = (file) => readFileSync(join(FIX, file)).toString('base64');
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4', mov: 'video/quicktime', txt: 'text/plain', heic: 'image/heic' };
const ffprobe = (file) => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', file]).toString());

const browser = await chromium.launch({ channel: process.env.CHANNEL || 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });

// ---------- page helpers ----------
async function settle(page, ms = 90) {
  await page.waitForTimeout(ms);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}
/** 48 by 48 RGB sample of the preview canvas, optionally of a region given in fractions. */
async function sample(page, region) {
  return page.evaluate((rg) => {
    const c = document.querySelector('canvas.preview');
    const s = document.createElement('canvas'); s.width = 48; s.height = 48;
    const x = s.getContext('2d', { willReadFrequently: true });
    const r = rg || { x: 0, y: 0, w: 1, h: 1 };
    x.drawImage(c, r.x * c.width, r.y * c.height, r.w * c.width, r.h * c.height, 0, 0, 48, 48);
    const d = x.getImageData(0, 0, 48, 48).data; const out = [];
    for (let i = 0; i < d.length; i += 4) out.push(d[i], d[i + 1], d[i + 2]);
    return out;
  }, region || null);
}
/** Decode an image file from bytes in the page and sample it like the preview. */
async function sampleBytes(page, base64, mime, region) {
  return page.evaluate(async ({ base64, mime, rg }) => {
    const bin = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
    const bmp = await createImageBitmap(new Blob([bin], { type: mime }));
    const s = document.createElement('canvas'); s.width = 48; s.height = 48;
    const x = s.getContext('2d', { willReadFrequently: true });
    const r = rg || { x: 0, y: 0, w: 1, h: 1 };
    x.drawImage(bmp, r.x * bmp.width, r.y * bmp.height, r.w * bmp.width, r.h * bmp.height, 0, 0, 48, 48);
    const d = x.getImageData(0, 0, 48, 48).data; const out = [];
    for (let i = 0; i < d.length; i += 4) out.push(d[i], d[i + 1], d[i + 2]);
    return { w: bmp.width, h: bmp.height, px: out };
  }, { base64, mime, rg: region || null });
}
/** Share of channels that moved by more than 40 levels: catches small overlays like a date. */
const moved = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 40) n++; return n / a.length; };
const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
function stats(px) {
  let L = 0, L2 = 0, C = 0, RB = 0, MG = 0; const n = px.length / 3;
  for (let i = 0; i < px.length; i += 3) {
    const r = px[i], g = px[i + 1], b = px[i + 2], l = 0.299 * r + 0.587 * g + 0.114 * b;
    L += l; L2 += l * l; C += Math.max(r, g, b) - Math.min(r, g, b); RB += r - b; MG += (r + b) / 2 - g;
  }
  L /= n; return { luma: L, std: Math.sqrt(L2 / n - L * L), chroma: C / n, rb: RB / n, mg: MG / n };
}
const canvasSize = (page) => page.evaluate(() => { const c = document.querySelector('canvas.preview'); return { w: c.width, h: c.height }; });
async function newPage(ctxOpts = {}, label = 'desktop') {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 }, locale: 'en-US', acceptDownloads: true, ...ctxOpts });
  const page = await ctx.newPage();
  watch(page, label);
  await page.goto(BASE + '/');
  await page.waitForSelector('canvas.preview');
  await page.waitForFunction(() => document.querySelector('canvas.preview')?.width > 10);
  // The app now opens on its home dashboard; editor scenarios explicitly enter the editor.
  await page.locator('.dashboard-close').click().catch(() => undefined);
  await settle(page, 300);
  return { ctx, page };
}
async function openFile(page, file) {
  await page.setInputFiles('.top-actions input[type=file]', join(FIX, file));
  await page.waitForFunction((n) => document.querySelector('.file-chip')?.textContent.includes(n), file, { timeout: 15000 }).catch(() => undefined);
  await settle(page, 400);
}
async function pickLook(page, id) {
  const card = page.locator(`.side.left [data-look="${id}"] .look-btn`);
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await settle(page);
}
const panel = (page, id) => page.click(`.panel-tabs [data-panel="${id}"]`).then(() => settle(page, 60));
async function resetAll(page) {
  await page.locator('.toolbar .tool-group .btn').nth(3).click();
  await settle(page);
}
async function toast(page) {
  await page.waitForSelector('.toast', { timeout: 6000 }).catch(() => undefined);
  return (await page.locator('.toast').textContent().catch(() => '')) || '';
}
async function setRange(locator, value) { await locator.fill(String(value)); }
async function downloadExport(page, setup) {
  await page.click('.top-actions .btn.primary');
  await page.waitForSelector('.modal');
  if (setup) await setup();
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.click('.modal .row.end .btn.primary')]);
  const path = join(OUT, 'dl_' + Date.now() + '_' + dl.suggestedFilename());
  await dl.saveAs(path);
  await page.waitForSelector('.busy', { state: 'detached', timeout: 120000 }).catch(() => undefined);
  await settle(page, 200);
  return path;
}
const shot = (page, name) => page.screenshot({ path: join(SHOTS, name + '.png') });

// ====================================================================
// 1. Opening media
// ====================================================================
if (want('media')) {
  const { ctx, page } = await newPage();
  await shot(page, 'desktop_1440_start');
  for (const f of ['photo.jpg', 'photo.png', 'photo.webp', 'clip.mp4', 'clip.mov']) {
    await openFile(page, f);
    const chip = await page.locator('.file-chip').textContent();
    const sz = await canvasSize(page);
    rec('media', 'Open button: ' + f, chip.includes(f) && sz.w > 10, chip);
  }
  // Drag and drop and paste use a File built in the page from the fixture bytes.
  const viaEvent = async (kind, file) => page.evaluate(({ kind, data, name, type }) => {
    const bin = Uint8Array.from(atob(data), (ch) => ch.charCodeAt(0));
    const dt = new DataTransfer(); dt.items.add(new File([bin], name, { type }));
    if (kind === 'drop') {
      const app = document.querySelector('.app');
      app.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
      app.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    } else {
      window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
    }
  }, { kind, data: b64(file), name: file, type: MIME[file.split('.').pop()] });
  await viaEvent('drop', 'photo.png');
  await page.waitForFunction(() => document.querySelector('.file-chip')?.textContent.includes('photo.png'), null, { timeout: 8000 }).catch(() => undefined);
  rec('media', 'Drag and drop', (await page.locator('.file-chip').textContent()).includes('photo.png'));
  await viaEvent('paste', 'photo.webp');
  await page.waitForFunction(() => document.querySelector('.file-chip')?.textContent.includes('photo.webp'), null, { timeout: 8000 }).catch(() => undefined);
  rec('media', 'Paste from clipboard', (await page.locator('.file-chip').textContent()).includes('photo.webp'));
  await page.setInputFiles('.top-actions input[type=file]', join(FIX, 'notes.txt'));
  const t1 = await toast(page);
  rec('media', 'Invalid file shows a warning', /photo or a video/i.test(t1), t1);
  await page.waitForSelector('.toast', { state: 'detached', timeout: 6000 }).catch(() => undefined);
  await page.setInputFiles('.top-actions input[type=file]', join(FIX, 'photo.heic'));
  const t2 = await toast(page);
  rec('media', 'HEIC fallback avoids a false unsupported-file warning', !/Use a photo or a video file/i.test(t2), t2 || 'accepted for device-specific decoding');
  await ctx.close();
}

// ====================================================================
// 2. Every look on a photo and a video, and 3. intensity
// ====================================================================
if (want('looks')) {
  const { ctx, page } = await newPage();
  for (const kind of ['photo.jpg', 'clip.mp4']) {
    await openFile(page, kind);
    await page.waitForFunction(() => document.querySelectorAll('.side.left .look-img img').length >= document.querySelectorAll('.side.left .look').length, null, { timeout: 90000 }).catch(() => undefined);
    const ids = await page.$$eval('.side.left .look', (els) => els.map((e) => e.getAttribute('data-look')));
    const noThumb = await page.$$eval('.side.left .look', (els) => els.filter((e) => !e.querySelector('.look-img img')).map((e) => e.getAttribute('data-look')));
    rec('looks', `Thumbnails for every look (${kind})`, noThumb.length === 0, noThumb.length ? 'missing: ' + noThumb.join(', ') : ids.length + ' thumbnails');
    await pickLook(page, 'original');
    const orig = await sample(page);
    const before = consoleIssues.length;
    const same = [];
    for (const id of ids) {
      if (id === 'original') continue;
      await pickLook(page, id);
      const d = diff(await sample(page), orig);
      if (d < 1.0) same.push(`${id} (${d.toFixed(2)})`);
    }
    rec('looks', `${ids.length - 1} looks change the ${kind.startsWith('clip') ? 'video' : 'photo'} vs Original`, same.length === 0, same.length ? 'too close to Original: ' + same.join(', ') : 'all differ');
    rec('looks', `No console errors while applying looks (${kind})`, consoleIssues.length === before, consoleIssues.slice(before).join(' | '));
    await shot(page, 'looks_' + kind.replace('.', '_'));
  }
  // Intensity 0, 50 and 100
  await openFile(page, 'photo.jpg');
  await pickLook(page, 'original');
  const orig = await sample(page);
  const bad = [];
  for (const id of ['bolt-classic', 'instant-flash', 'vivid-50', 'vhs-bolt', 'super-8', 'fisheye-zap']) {
    await pickLook(page, id);
    const slider = page.locator('.toolbar .inline-range.grow input');
    const at = {};
    for (const v of [100, 50, 0]) { await setRange(slider, v); await settle(page); at[v] = diff(await sample(page), orig); }
    if (!(at[0] < 0.6 && at[50] > at[0] && at[100] > at[50] * 0.9)) bad.push(`${id}: 0=${at[0].toFixed(2)} 50=${at[50].toFixed(2)} 100=${at[100].toFixed(2)}`);
    await setRange(slider, 100);
  }
  rec('intensity', 'Intensity 0 equals Original, 50 and 100 grow', bad.length === 0, bad.join(' | ') || 'ok');
  await ctx.close();
}

// ====================================================================
// 4. Panels and sliders
// ====================================================================
const DIRECTION = {
  exposure: (a, b) => b.luma > a.luma, brightness: (a, b) => b.luma > a.luma, contrast: (a, b) => b.std > a.std,
  highlights: (a, b) => b.luma > a.luma, shadows: (a, b) => b.luma > a.luma, whites: (a, b) => b.luma > a.luma, blacks: (a, b) => b.luma > a.luma,
  fade: (a, b) => b.std < a.std, temperature: (a, b) => b.rb > a.rb, tint: (a, b) => b.mg > a.mg, vibrance: (a, b) => b.chroma > a.chroma,
  saturation: (a, b) => b.chroma > a.chroma, dehaze: (a, b) => b.std > a.std, bloom: (a, b) => b.luma > a.luma, leak: (a, b) => b.luma > a.luma,
  scanlines: (a, b) => b.luma < a.luma, curveHighlights: (a, b) => b.luma > a.luma, curveLights: (a, b) => b.luma > a.luma,
  curveDarks: (a, b) => b.luma > a.luma, curveShadows: (a, b) => b.luma > a.luma
};
if (want('panels')) {
  const { ctx, page } = await newPage();
  await openFile(page, 'photo.jpg');
  await pickLook(page, 'original');
  await resetAll(page);
  const base = await sample(page);
  const sliderGroups = { light: 8, curve: 4, color: 5, detail: 4, effects: 11 };
  for (const [group, count] of Object.entries(sliderGroups)) {
    await panel(page, group);
    const sliders = page.locator('.side.right .panel-body .slider');
    const n = await sliders.count();
    const problems = [];
    for (let i = 0; i < n; i++) {
      const s = sliders.nth(i);
      const input = s.locator('input[type=range]');
      const key = await s.locator('.slider-label').textContent();
      const max = await input.getAttribute('max');
      if (/size/i.test(key)) await setRange(sliders.nth(0).locator('input'), 60); // grain size needs grain
      const a = stats(/size/i.test(key) ? await (settle(page).then(() => sample(page))) : base);
      const ref = /size/i.test(key) ? await sample(page) : base;
      await setRange(input, max);
      await settle(page);
      const after = await sample(page);
      const d = diff(after, ref);
      const flickerOnly = /flicker/i.test(key);
      const keyId = Object.keys(DIRECTION).find((k) => k.toLowerCase() === key.toLowerCase().replace(/\s/g, '')) || null;
      if (!flickerOnly && d < 0.3 && moved(after, ref) < 0.002) problems.push(`${key}: no visible change (${d.toFixed(2)})`);
      const engKey = { 'Exposure': 'exposure', 'Brightness': 'brightness', 'Contrast': 'contrast', 'Highlights': group === 'curve' ? 'curveHighlights' : 'highlights', 'Shadows': group === 'curve' ? 'curveShadows' : 'shadows', 'Whites': 'whites', 'Blacks': 'blacks', 'Fade': 'fade', 'Temperature': 'temperature', 'Tint': 'tint', 'Vibrance': 'vibrance', 'Saturation': 'saturation', 'Dehaze': 'dehaze', 'Bloom': 'bloom', 'Light leak': 'leak', 'Scanlines': 'scanlines', 'Lights': 'curveLights', 'Darks': 'curveDarks' }[key.trim()] || keyId;
      if (engKey && DIRECTION[engKey] && !DIRECTION[engKey](a, stats(after))) problems.push(`${key}: wrong direction`);
      if (key.trim() === 'Vignette') {
        const corner = stats(await sample(page, { x: 0, y: 0, w: 0.12, h: 0.12 }));
        await s.dblclick({ position: { x: 20, y: 8 } }); await settle(page);
        const corner0 = stats(await sample(page, { x: 0, y: 0, w: 0.12, h: 0.12 }));
        if (!(corner.luma < corner0.luma)) problems.push('Vignette: corners not darker');
      } else {
        await s.dblclick({ position: { x: 20, y: 8 } });
        await settle(page);
      }
      const val = await input.inputValue();
      if (val !== '0') problems.push(`${key}: double click left ${val}`);
      if (/size/i.test(key)) { await sliders.nth(0).dblclick({ position: { x: 20, y: 8 } }); await settle(page); }
      const back = diff(await sample(page), base);
      if (back > 0.4) problems.push(`${key}: did not return to baseline after reset (${back.toFixed(2)})`);
    }
    rec('panels', `${group}: ${n} sliders change the image, right direction, double click resets`, n === count && problems.length === 0, problems.join(' | ') || `${n} sliders`);
  }
  // HSL on a synthetic rainbow so every band has pixels. Opening it also exercises paste.
  await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 720; c.height = 360; const x = c.getContext('2d');
    for (let i = 0; i < 720; i++) for (let j = 0; j < 6; j++) { x.fillStyle = `hsl(${i / 2}, ${90 - j * 10}%, ${30 + j * 8}%)`; x.fillRect(i, j * 60, 1, 60); }
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    const dt = new DataTransfer(); dt.items.add(new File([blob], 'rainbow.png', { type: 'image/png' }));
    window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt }));
  });
  await page.waitForFunction(() => document.querySelector('.file-chip')?.textContent.includes('rainbow.png'));
  await settle(page, 300);
  await pickLook(page, 'original');
  const rb = await sample(page);
  await panel(page, 'hsl');
  const hslProblems = [];
  for (const band of ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta']) {
    await page.click(`.side.right .panel-body .pill[data-id="${band}"]`);
    const sl = page.locator('.side.right .panel-body .slider');
    for (let i = 0; i < 3; i++) {
      await setRange(sl.nth(i).locator('input'), 100); await settle(page);
      const d = diff(await sample(page), rb);
      if (d < 0.25) hslProblems.push(`${band} ${['hue', 'sat', 'lum'][i]} ${d.toFixed(2)}`);
      await sl.nth(i).dblclick({ position: { x: 20, y: 8 } }); await settle(page);
    }
  }
  rec('panels', 'HSL: 8 colors x hue, saturation, luminance', hslProblems.length === 0, hslProblems.join(', ') || '24 sliders change the image');
  await openFile(page, 'photo.jpg');
  await pickLook(page, 'original');
  const b2 = await sample(page);
  await panel(page, 'grading');
  const gp = [];
  const gs = page.locator('.side.right .panel-body .slider');
  for (const [hueIdx, amtIdx, name] of [[0, 1, 'shadows'], [2, 3, 'midtones'], [4, 5, 'highlights']]) {
    await setRange(gs.nth(amtIdx).locator('input'), 80); await settle(page);
    const d1 = diff(await sample(page), b2);
    await setRange(gs.nth(hueIdx).locator('input'), 200); await settle(page);
    const d2 = diff(await sample(page), b2);
    if (d1 < 0.3) gp.push(name + ' amount');
    if (Math.abs(d2 - d1) < 0.05) gp.push(name + ' hue');
    if (name === 'highlights') {
      const s1 = await sample(page); await setRange(gs.nth(6).locator('input'), 100); await settle(page);
      if (diff(await sample(page), s1) < 0.1) gp.push('balance');
      await gs.nth(6).dblclick({ position: { x: 20, y: 8 } });
    }
    await gs.nth(amtIdx).dblclick({ position: { x: 20, y: 8 } }); await gs.nth(hueIdx).dblclick({ position: { x: 20, y: 8 } }); await settle(page);
  }
  rec('panels', 'Grading: shadows, midtones, highlights, balance', gp.length === 0, gp.join(', ') || 'ok');
  await panel(page, 'retouch');
  await page.click('.side.right .panel-body .btn.primary.wide'); await settle(page);
  const dAuto = diff(await sample(page), b2);
  rec('panels', 'Retouch: Auto enhance changes the photo', dAuto > 0.3, dAuto.toFixed(2));
  await resetAll(page);
  await panel(page, 'retouch');
  await setRange(page.locator('.side.right .panel-body .slider').nth(0).locator('input'), 100); await settle(page);
  const dSkin = diff(await sample(page), b2);
  rec('panels', 'Retouch: Smooth skin changes skin areas', dSkin > 0.05, dSkin.toFixed(3));
  await resetAll(page);
  // Frames
  await panel(page, 'frame');
  const frames = ['none', 'border', 'instant', 'square', 'film', 'slide', 'half', '8mm', 'cinema'];
  await page.click('.side.right .panel-body .pill[data-id="none"]'); await settle(page);
  const none = await sample(page); const noneSz = await canvasSize(page);
  const fp = [];
  for (const f of frames.slice(1)) {
    await page.click(`.side.right .panel-body .pill[data-id="${f}"]`); await settle(page);
    const sz = await canvasSize(page);
    if (diff(await sample(page), none) < 1 && moved(await sample(page), none) < 0.01 && Math.abs(sz.w / sz.h - noneSz.w / noneSz.h) < 0.01) fp.push(f);
  }
  await page.click('.side.right .panel-body .pill[data-id="auto"]'); await settle(page);
  if (diff(await sample(page), none) > 0.3) fp.push('auto on Original should be none');
  await pickLook(page, 'instant-flash'); await panel(page, 'frame'); await page.click('.side.right .panel-body .pill[data-id="auto"]'); await settle(page);
  const autoSz = await canvasSize(page);
  if (autoSz.h <= autoSz.w * (noneSz.h / noneSz.w)) fp.push('auto on Instant Flash should add the instant frame');
  await shot(page, 'frame_instant');
  rec('panels', 'Frame: 10 options', fp.length === 0, fp.join(', ') || '10 frames ok');
  await pickLook(page, 'original'); await resetAll(page);
  // Crop
  await panel(page, 'crop');
  const ratios = { original: 1600 / 1067, '1:1': 1, '4:5': 0.8, '3:4': 0.75, '9:16': 9 / 16, '16:9': 16 / 9, '3:2': 1.5, '2:3': 2 / 3 };
  const cp = [];
  for (const [id, r] of Object.entries(ratios)) {
    await page.click(`.side.right .panel-body .pill[data-id="${id}"]`); await settle(page);
    const sz = await canvasSize(page);
    if (Math.abs(sz.w / sz.h - r) > 0.02) cp.push(`${id}: got ${(sz.w / sz.h).toFixed(3)}`);
  }
  await page.click('.side.right .panel-body .pill[data-id="original"]'); await settle(page);
  const pre = await sample(page);
  await page.locator('.side.right .panel-body .row .btn').nth(0).click(); await settle(page);
  const flipped = await sample(page);
  const mirror = []; for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const i = (y * 48 + (47 - x)) * 3; mirror.push(pre[i], pre[i + 1], pre[i + 2]); }
  if (diff(flipped, mirror) > 3) cp.push('flip is not a mirror: ' + diff(flipped, mirror).toFixed(2));
  await page.locator('.side.right .panel-body .row .btn').nth(0).click();
  const s0 = await canvasSize(page);
  await page.locator('.side.right .panel-body .row .btn').nth(1).click(); await settle(page);
  const s1 = await canvasSize(page);
  if (Math.abs(s1.w / s1.h - s0.h / s0.w) > 0.01) cp.push(`rotate did not swap ${JSON.stringify(s0)} -> ${JSON.stringify(s1)}`);
  for (let i = 0; i < 3; i++) await page.locator('.side.right .panel-body .row .btn').nth(1).click();
  rec('panels', 'Crop: 8 ratios, flip, rotate', cp.length === 0, cp.join(' | ') || 'ok');
  await resetAll(page);
  // Date and overlays
  await panel(page, 'stamp');
  const BR = { x: 0.72, y: 0.86, w: 0.26, h: 0.11 };
  await page.click('.side.right .panel-body .pill[data-id="off"]'); await settle(page);
  const off = await sample(page, BR); const offAll = await sample(page);
  const dp = [];
  await page.click('.side.right .panel-body .pill[data-id="date"]'); await settle(page);
  if (moved(await sample(page, BR), off) < 0.01) dp.push('date not drawn');
  for (const id of ['vhs', 'dcr', 'cctv']) { await page.click(`.side.right .panel-body .pill[data-id="${id}"]`); await settle(page); if (diff(await sample(page), offAll) < 0.3) dp.push(id + ' not drawn'); }
  await page.click('.side.right .panel-body .pill[data-id="date"]');
  for (const id of ['large', 'yellow', 'iso']) { const a = await sample(page, BR); await page.click(`.side.right .panel-body .pill[data-id="${id}"]`); await settle(page); if (moved(await sample(page, BR), a) < 0.005 && diff(await sample(page, BR), a) < 0.2) dp.push(id + ' had no effect'); }
  await page.fill('.side.right .panel-body .date-input', 'E2E 2026'); await settle(page);
  await shot(page, 'date_custom_text');
  rec('panels', 'Date: styles, size, color, format, custom text', dp.length === 0, dp.join(', ') || 'ok');
  await resetAll(page);
  // Layers (double exposure)
  await panel(page, 'layer');
  const l0 = await sample(page);
  await page.setInputFiles('.side.right .panel-body input[type=file]', join(FIX, 'second.jpg')); await settle(page, 500);
  const l1 = await sample(page);
  await page.click('.side.right .panel-body .btn.wide'); await settle(page);
  const l2 = await sample(page);
  rec('panels', 'Layers: double exposure adds and removes', diff(l1, l0) > 1 && diff(l2, l0) < 0.3, `add ${diff(l1, l0).toFixed(2)} remove ${diff(l2, l0).toFixed(2)}`);

  // ==================================================================
  // 5. Compare, undo and redo, copy and paste, presets
  // ==================================================================
  await pickLook(page, 'original'); await resetAll(page);
  const plain = await sample(page);
  await pickLook(page, 'vivid-50');
  const cmp = page.locator('.toolbar .icon-btn').nth(0);
  const box = await cmp.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await settle(page);
  const held = await sample(page);
  const chipShown = await page.locator('.stage-chips .chip.cream').count();
  await page.mouse.up(); await settle(page);
  const released = await sample(page);
  rec('workflow', 'Hold to compare shows the original', diff(held, plain) < 0.6 && diff(released, plain) > 1 && chipShown === 1, `held ${diff(held, plain).toFixed(2)} released ${diff(released, plain).toFixed(2)}`);
  await panel(page, 'light');
  const expo = page.locator('.side.right .panel-body .slider').nth(0).locator('input');
  const up = []; const steps = async () => page.waitForTimeout(700);
  await setRange(expo, 30); await steps(); await setRange(expo, 60); await steps();
  await page.locator('.toolbar .icon-btn').nth(1).click(); await settle(page); up.push(await expo.inputValue());
  await page.locator('.toolbar .icon-btn').nth(2).click(); await settle(page); up.push(await expo.inputValue());
  await page.locator('body').click({ position: { x: 5, y: 900 } });
  await page.keyboard.press('Control+z'); await settle(page); up.push(await expo.inputValue());
  await page.keyboard.press('Control+Shift+Z'); await settle(page); up.push(await expo.inputValue());
  await page.keyboard.press('Control+z'); await settle(page);
  await page.keyboard.press('Control+y'); await settle(page); up.push(await expo.inputValue());
  rec('workflow', 'Undo and redo: buttons, Ctrl Z, Ctrl Shift Z, Ctrl Y', up.join(',') === '30,60,30,60,60', up.join(','));
  const tg = page.locator('.toolbar .tool-group .btn');
  await tg.nth(0).click(); await resetAll(page);
  const afterReset = await expo.inputValue();
  await tg.nth(1).click(); await settle(page);
  rec('workflow', 'Copy and paste edits', afterReset === '0' && (await expo.inputValue()) === '60', `reset ${afterReset} pasted ${await expo.inputValue()}`);
  await tg.nth(2).click();
  await page.fill('.modal input.text-input', 'E2E Preset');
  await page.click('.modal button[type=submit]');
  await settle(page, 600);
  const api1 = await (await page.request.get(BASE + '/api/presets')).json();
  await page.reload(); await page.waitForSelector('canvas.preview'); await settle(page, 600);
  const afterReload = await page.locator('.side.left .look-name', { hasText: 'E2E Preset' }).count();
  rec('workflow', 'Save preset, still there after reload, synced to /api/presets', afterReload === 1 && api1.some((p) => p.name === 'E2E Preset'), `cards ${afterReload}, api ${api1.length}`);
  await page.locator('.side.left .look', { hasText: 'E2E Preset' }).locator('.look-del').click();
  await settle(page, 600);
  const api2 = await (await page.request.get(BASE + '/api/presets')).json();
  rec('workflow', 'Delete preset (UI and API)', (await page.locator('.side.left .look-name', { hasText: 'E2E Preset' }).count()) === 0 && !api2.some((p) => p.name === 'E2E Preset'));
  await ctx.close();
}

// ====================================================================
// 6. Photo export
// ====================================================================
if (want('photoexport')) {
  const { ctx, page } = await newPage();
  await openFile(page, 'photo.jpg');
  await pickLook(page, 'vivid-50');
  const prev = await sample(page);
  const magic = { 'image/jpeg': [0xff, 0xd8], 'image/png': [0x89, 0x50], 'image/webp': [0x52, 0x49] };
  const expect = { full: [1600, 1067], '4096': [1600, 1067], '2048': [1600, 1067], '1080': [1080, 720] };
  for (const fmt of ['image/jpeg', 'image/png', 'image/webp']) {
    for (const size of ['full', '4096', '2048', '1080']) {
      const path = await downloadExport(page, async () => {
        await page.click(`.modal .pill[data-id="${fmt}"]`);
        await page.click(`.modal .pill[data-id="${size}"]`);
      });
      const bytes = readFileSync(path);
      const s = await sampleBytes(page, bytes.toString('base64'), fmt);
      const okMagic = bytes[0] === magic[fmt][0] && bytes[1] === magic[fmt][1];
      const [ew, eh] = expect[size];
      const d = diff(s.px, prev);
      rec('photoexport', `${fmt.split('/')[1].toUpperCase()} ${size}`, okMagic && s.w === ew && s.h === eh && d < 4, `${s.w}x${s.h}, ${basename(path)}, diff vs preview ${d.toFixed(2)}`);
    }
  }
  await ctx.close();
}

// ====================================================================
// 7. Video export and 8. playback
// ====================================================================
if (want('video')) {
  const { ctx, page } = await newPage();
  await openFile(page, 'clip.mp4');
  await page.waitForTimeout(800);
  // Playback
  const v = () => page.evaluate(() => { const e = document.querySelector('video.hidden-video'); return { t: e.currentTime, paused: e.paused, d: e.duration }; });
  await page.click('.toolbar .accent-btn'); await page.waitForTimeout(1200);
  const p1 = await v();
  const a = await sample(page); await page.waitForTimeout(300); const b = await sample(page);
  await page.click('.toolbar .accent-btn'); await page.waitForTimeout(200);
  const p2 = await v();
  const muteBtn = page.locator('.toolbar .icon-btn').nth(3);
  const m1 = await muteBtn.getAttribute('aria-label'); await muteBtn.click(); const m2 = await muteBtn.getAttribute('aria-label');
  await setRange(page.locator('.toolbar .inline-range:not(.grow) input'), 500); await page.waitForTimeout(400);
  const p3 = await v();
  rec('playback', 'Play advances and updates the preview', !p1.paused && p1.t > 0.2 && diff(a, b) > 0.5, `t=${p1.t.toFixed(2)} frame diff ${diff(a, b).toFixed(2)}`);
  rec('playback', 'Pause', p2.paused);
  rec('playback', 'Mute toggles', m1 !== m2, `${m1} -> ${m2}`);
  rec('playback', 'Timeline seeks', Math.abs(p3.t - p3.d / 2) < 0.15, `t=${p3.t.toFixed(2)} of ${p3.d.toFixed(2)}`);
  await pickLook(page, 'vivid-50');
  for (const fps of [30, 24]) {
    const path = await downloadExport(page, async () => { await page.click(`.modal .pill[data-id="${fps}"]`); });
    const info = ffprobe(path);
    const vs = info.streams.find((s) => s.codec_type === 'video'), as = info.streams.find((s) => s.codec_type === 'audio');
    const frames = Number(vs.nb_read_frames || vs.nb_frames), dur = Number(info.format.duration);
    const ok = vs.codec_name === 'h264' && vs.width === 640 && vs.height === 360 && !!as && Math.abs(dur - 2) < 0.15 && Math.abs(frames - fps * 2) <= 1;
    rec('videoexport', `WebCodecs MP4 at ${fps} fps`, ok, `${vs.codec_name} ${vs.width}x${vs.height} ${frames} frames ${dur.toFixed(2)}s audio=${as ? as.codec_name : 'none'}`);
  }
  // Cancel
  await page.click('.top-actions .btn.primary'); await page.waitForSelector('.modal');
  let got = false; page.once('download', () => { got = true; });
  await page.click('.modal .row.end .btn.primary');
  await page.waitForSelector('.busy button', { timeout: 10000 });
  await page.click('.busy button');
  await page.waitForSelector('.busy', { state: 'detached', timeout: 15000 }).catch(() => undefined);
  await page.waitForTimeout(2500);
  rec('videoexport', 'Cancel stops the export without a file', !got && (await page.locator('.busy').count()) === 0);
  await ctx.close();
  // Fallback recorder without WebCodecs
  const f = await newPage({}, 'fallback');
  await f.page.addInitScript(() => { delete window.VideoEncoder; delete window.VideoFrame; });
  await f.page.reload(); await f.page.waitForSelector('canvas.preview'); await settle(f.page, 300);
  await openFile(f.page, 'clip.mp4'); await f.page.waitForTimeout(800);
  const noWC = await f.page.evaluate(() => typeof window.VideoEncoder);
  const path = await downloadExport(f.page);
  const info = ffprobe(path);
  const vs = info.streams.find((s) => s.codec_type === 'video'), as = info.streams.find((s) => s.codec_type === 'audio');
  const dur = Number(info.format.duration || vs.duration || 0);
  rec('videoexport', 'Fallback recorder without WebCodecs', noWC === 'undefined' && !!vs && vs.width === 640 && vs.height === 360 && dur > 1.4, `${basename(path)} ${vs?.codec_name} ${vs?.width}x${vs?.height} ${dur.toFixed(2)}s audio=${as ? as.codec_name : 'none'}`);
  await f.ctx.close();
}

// ====================================================================
// Part 3: No date
// ====================================================================
if (want('nodate')) {
  const { ctx, page } = await newPage();
  await openFile(page, 'photo.jpg');
  const BR = { x: 0.72, y: 0.86, w: 0.26, h: 0.11 };
  const exportBR = async () => { const pth = await downloadExport(page, async () => { await page.click('.modal .pill[data-id="image/png"]'); await page.click('.modal .pill[data-id="full"]'); }); return (await sampleBytes(page, readFileSync(pth).toString('base64'), 'image/png', BR)).px; };
  await pickLook(page, 'bolt-classic');
  const withDate = await exportBR();
  await panel(page, 'stamp');
  await page.click('.side.right .panel-body .pill[data-id="off"]'); await settle(page);
  const noDatePill = await exportBR();
  rec('nodate', 'No date option removes the date on Daily Classic (photo export)', moved(withDate, noDatePill) > 0.01, `changed ${(moved(withDate, noDatePill) * 100).toFixed(1)}% of the corner`);
  await page.click('.side.right .panel-body .pill[data-id="auto"]'); await settle(page);
  await page.click('[data-testid="never-date"]'); await settle(page);
  const never = await exportBR();
  rec('nodate', '"Never add a date" setting: photo export has no date', moved(never, noDatePill) < 0.001 && moved(never, withDate) > 0.01, `vs no date ${(moved(never, noDatePill) * 100).toFixed(2)}%, vs date ${(moved(never, withDate) * 100).toFixed(1)}%`);
  await page.reload(); await page.waitForSelector('canvas.preview'); await settle(page, 400);
  await openFile(page, 'photo.jpg');
  const bad = [];
  await panel(page, 'stamp');
  const rememberedFirst = await page.getAttribute('[data-testid="never-date"]', 'aria-checked');
  for (const id of ['bolt-classic', 'dispo-27', 'y2k-flash', 'vhs-bolt', 'dcr-cam', 'cctv-01']) {
    await pickLook(page, id); await panel(page, 'stamp');
    const withSetting = await sample(page, { x: 0, y: 0.72, w: 1, h: 0.28 });
    await page.click('[data-testid="never-date"]'); await settle(page);
    const withOverlay = await sample(page, { x: 0, y: 0.72, w: 1, h: 0.28 });
    await page.click('.side.right .panel-body .pill[data-id="off"]'); await settle(page);
    const explicitOff = await sample(page, { x: 0, y: 0.72, w: 1, h: 0.28 });
    await page.click('.side.right .panel-body .pill[data-id="auto"]');
    await page.click('[data-testid="never-date"]'); await settle(page);
    if (moved(withSetting, explicitOff) > 0.001) bad.push(id + ' still shows something with the setting on');
    if (moved(withOverlay, withSetting) < 0.002) bad.push(id + ' has no overlay to remove (check look)');
  }
  const remembered = await page.getAttribute('[data-testid="never-date"]', 'aria-checked');
  rec('nodate', 'Setting remembered after reload and removes date and overlays from looks that have one', rememberedFirst === 'true' && remembered === 'true' && bad.length === 0, bad.join(', ') || 'ok');
  // Video export with the setting on, against the same look with the date
  await openFile(page, 'clip.mp4'); await page.waitForTimeout(700);
  await pickLook(page, 'bolt-classic');
  const frameBR = async () => {
    const pth = await downloadExport(page);
    const png = pth + '.png';
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', pth, '-vf', 'select=eq(n\\,10)', '-frames:v', '1', png]);
    return (await sampleBytes(page, readFileSync(png).toString('base64'), 'image/png', BR)).px;
  };
  const vNever = await frameBR();
  await page.click('[data-testid="never-date"]'); await settle(page);
  const vDate = await frameBR();
  await panel(page, 'stamp'); await page.click('.side.right .panel-body .pill[data-id="off"]'); await settle(page);
  const vOff = await frameBR();
  rec('nodate', 'Video export without date when the setting is on', moved(vNever, vOff) < 0.002 && moved(vNever, vDate) > 0.01, `vs no date ${(moved(vNever, vOff) * 100).toFixed(2)}%, vs date ${(moved(vNever, vDate) * 100).toFixed(1)}%`);
  await ctx.close();
}

// ====================================================================
// Part 2: automatic language
// ====================================================================
if (want('lang')) {
  const cases = [['pt-BR', 'pt', 'Exportar'], ['pt-PT', 'pt', 'Exportar'], ['es-MX', 'es', 'Exportar'], ['zh-TW', 'zh', '导出'], ['zh-CN', 'zh', '导出'], ['de-DE', 'de', 'Exportieren'], ['hi-IN', 'hi', 'एक्सपोर्ट'], ['it-IT', 'en', 'Export']];
  for (const [locale, lang, word] of cases) {
    const { ctx, page } = await newPage({ locale }, 'lang-' + locale);
    const got = await page.evaluate(() => document.documentElement.lang);
    const text = await page.locator('.top-actions .btn.primary').textContent();
    rec('lang', `Browser ${locale} -> ${lang}`, got === lang && text.includes(word), `lang=${got} button="${text.trim()}"`);
    if (locale === 'pt-BR') {
      await pickLook(page, 'bolt-classic');
      const desc = await page.locator('.look-card .muted').textContent();
      const cat = await page.locator('.look-card .eyebrow').textContent();
      rec('lang', 'Portuguese look description and category', /pretos desbotados/.test(desc) && cat === 'Filme', `${cat}: ${desc}`);
      await shot(page, 'lang_pt_BR');
    }
    await ctx.close();
  }
  // Server suggestion when the browser language has no translation
  {
    const { ctx, page } = await newPage({ locale: 'fr-FR', extraHTTPHeaders: { 'cf-ipcountry': 'BR' } }, 'lang-server');
    await page.waitForFunction(() => document.documentElement.lang === 'pt', null, { timeout: 5000 }).catch(() => undefined);
    rec('lang', 'Browser fr-FR plus CDN country BR uses server suggestion pt', (await page.evaluate(() => document.documentElement.lang)) === 'pt');
    await ctx.close();
  }
  {
    const { ctx, page } = await newPage({ locale: 'es-ES' }, 'lang-manual');
    await page.selectOption('[data-testid="lang"]', 'de');
    await page.reload(); await page.waitForSelector('canvas.preview');
    const kept = await page.evaluate(() => document.documentElement.lang);
    await page.selectOption('[data-testid="lang"]', 'ar'); await settle(page);
    const ar = await page.evaluate(() => [document.documentElement.lang, document.documentElement.dir]);
    await shot(page, 'lang_ar_rtl');
    const rtl = [];
    for (const l of ['he', 'fa', 'ur']) { await page.selectOption('[data-testid="lang"]', l); rtl.push(await page.evaluate(() => document.documentElement.dir)); }
    await page.selectOption('[data-testid="lang"]', 'auto'); await settle(page);
    const auto = await page.evaluate(() => [document.documentElement.lang, document.documentElement.dir]);
    rec('lang', 'Manual choice beats browser and survives reload', kept === 'de', kept);
    rec('lang', 'Arabic, Hebrew, Persian, Urdu switch to right to left', ar[1] === 'rtl' && rtl.every((d) => d === 'rtl'), `${ar.join(' ')} ${rtl.join(' ')}`);
    rec('lang', '"Automatic" goes back to the browser language', auto[0] === 'es' && auto[1] === 'ltr', auto.join(' '));
    await ctx.close();
  }
}

// ====================================================================
// 9. Layout on phones and computers
// ====================================================================
if (want('layout')) {
  const phones = [['iphone', devices['iPhone 13']], ['android', devices['Pixel 7']]];
  for (const [name, dev] of phones) {
    const { ctx, page } = await newPage({ ...dev, viewport: { width: 390, height: 844 } }, name);
    await settle(page, 600);
    const lay = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const head = document.querySelector('.top');
      const outside = [...head.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.right > vw + 0.5 || r.left < -0.5); }).map((e) => e.className || e.tagName);
      const small = [...document.querySelectorAll('button, select, .btn.file, input[type=text], input[type=search]')].filter((e) => {
        const r = e.getBoundingClientRect(); const st = getComputedStyle(e);
        return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && r.bottom > 0 && r.top < innerHeight && (r.height < 44 || r.width < 44);
      }).map((e) => `${e.className || e.tagName}(${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)})`);
      return { pageScroll: document.documentElement.scrollWidth > vw, outside, small: [...new Set(small)] };
    });
    await shot(page, `mobile_${name}_looks`);
    await page.locator('.bottom-nav .nav-btn').nth(1).click();
    const tabsScroll = await page.evaluate(() => { const tabs = document.querySelector('.m-cats'); return !!tabs && tabs.scrollWidth > tabs.clientWidth; });
    await page.locator('.m-cats button').last().scrollIntoViewIfNeeded();
    const scrolled = await page.evaluate(() => document.querySelector('.m-cats').scrollLeft > 0);
    await page.locator('.page-back:not(.page-home)').click();
    await page.locator('.bottom-nav .nav-btn').nth(2).click();
    await page.locator('.tool-card[data-panel="light"]').click(); await settle(page);
    const before = await sample(page);
    await setRange(page.locator('.tool-dock-body .slider').nth(0).locator('input'), 60); await settle(page);
    const changed = diff(await sample(page), before) > 0.5;
    await shot(page, `mobile_${name}_light`);
    await page.locator('.tool-dock-head .pill-btn').click();
    await page.locator('.bottom-nav .nav-btn').nth(2).click();
    await page.locator('.tool-card[data-panel="stamp"]').click(); await settle(page);
    await shot(page, `mobile_${name}_date`);
    rec('layout', `${name} 390x844: header fits, no page side scroll`, !lay.pageScroll && lay.outside.length === 0, lay.outside.join(', ') || 'ok');
    rec('layout', `${name}: category tabs scroll`, tabsScroll && scrolled);
    rec('layout', `${name}: touch targets at least 44 px`, lay.small.length === 0, lay.small.slice(0, 12).join(', ') + (lay.small.length > 12 ? ` (+${lay.small.length - 12})` : ''));
    rec('layout', `${name}: bottom panel usable (slider edits the photo)`, changed);
    await ctx.close();
  }
  for (const w of [1280, 1920]) {
    const { ctx, page } = await newPage({ viewport: { width: w, height: w === 1280 ? 800 : 1080 } });
    const over = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    const sides = await page.evaluate(() => ['.side.left', '.center', '.side.right'].map((s) => Math.round(document.querySelector(s).getBoundingClientRect().width)));
    await shot(page, `desktop_${w}`);
    rec('layout', `Desktop ${w}: three columns, no side scroll`, !over && sides.every((x) => x > 200), sides.join(' / '));
    await ctx.close();
  }
}

// ====================================================================
// 10. PWA, 11. API, 12. accessibility
// ====================================================================
if (want('pwa')) {
  const { ctx, page } = await newPage();
  const man = await (await page.request.get(BASE + '/manifest.webmanifest')).json();
  const icons = [];
  for (const ic of man.icons) {
    const r = await page.request.get(BASE + ic.src);
    const dims = await page.evaluate(async (src) => { const i = new Image(); i.src = src; await i.decode(); return i.naturalWidth + 'x' + i.naturalHeight; }, ic.src);
    icons.push(r.ok() && dims === ic.sizes);
  }
  const has = man.name && man.short_name && man.start_url && man.display === 'standalone' && man.icons.some((i) => i.sizes === '192x192') && man.icons.some((i) => i.sizes === '512x512');
  rec('pwa', 'Manifest valid and linked', has && (await page.locator('link[rel=manifest]').count()) === 1, JSON.stringify({ name: man.name, display: man.display, icons: man.icons.length }));
  rec('pwa', 'Icons load with the declared sizes', icons.every(Boolean));
  const sw = await page.evaluate(async () => { const r = await Promise.race([navigator.serviceWorker.ready, new Promise((res) => setTimeout(() => res(null), 8000))]); return r ? r.active?.scriptURL : null; });
  rec('pwa', 'Service worker registered and active', !!sw && sw.endsWith('/sw.js'), sw);
  await ctx.setOffline(true);
  await page.reload().catch(() => undefined);
  const offline = await page.waitForSelector('canvas.preview', { timeout: 8000 }).then(() => true).catch(() => false);
  await ctx.setOffline(false);
  rec('pwa', 'Installable criteria (manifest, icons 192 and 512, SW with offline fetch)', has && !!sw && offline, offline ? 'app shell loads offline' : 'offline reload failed');
  await ctx.close();
}
if (want('api')) {
  const r = await (await fetch(BASE + '/api/health')).json();
  rec('api', 'GET /api/health', r.status === 'ok');
  const put = await fetch(BASE + '/api/presets', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify([{ id: 'x', name: 'API', edit: { camId: 'original' } }]) });
  const got = await (await fetch(BASE + '/api/presets')).json();
  rec('api', 'PUT and GET /api/presets', put.status === 200 && got[0]?.name === 'API');
  const codes = [];
  for (const body of ['{"a":1}', '[{"id":1}]', '{broken', '[{"id":"1","edit":"x"}]']) codes.push((await fetch(BASE + '/api/presets', { method: 'PUT', headers: { 'content-type': 'application/json' }, body })).status);
  rec('api', 'Invalid payloads rejected with 400', codes.every((c) => c === 400), codes.join(','));
  await fetch(BASE + '/api/presets', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '[]' });
  const loc = await (await fetch(BASE + '/api/locale', { headers: { 'accept-language': 'pt-BR,pt;q=0.9', 'cf-ipcountry': 'BR' } })).json();
  rec('api', 'GET /api/locale', loc.lang === 'pt' && loc.country === 'BR', JSON.stringify(loc));
  const nf = await fetch(BASE + '/api/nope');
  rec('api', 'Unknown /api path returns 404, not the app', nf.status === 404, nf.status);
}
if (want('a11y')) {
  const { ctx, page } = await newPage();
  const unlabeled = await page.$$eval('button, select, input', (els) => els.filter((e) => {
    const vis = e.getBoundingClientRect().width > 0;
    const text = (e.innerText || '').trim();
    const lab = e.getAttribute('aria-label') || e.getAttribute('title') || (e.id && document.querySelector(`label[for="${e.id}"]`)) || e.closest('label');
    return vis && !text && !lab && e.type !== 'hidden';
  }).map((e) => e.outerHTML.slice(0, 80)));
  rec('a11y', 'Icon buttons and inputs have labels', unlabeled.length === 0, unlabeled.slice(0, 5).join(' | '));
  const noFocus = [];
  let reached = 0;
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const f = await page.evaluate(() => {
      const e = document.activeElement; if (!e || e === document.body) return null;
      const s = getComputedStyle(e);
      const visible = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none';
      return { visible, what: (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 30) };
    });
    if (f) { reached++; if (!f.visible) noFocus.push(f.what); }
  }
  rec('a11y', 'Keyboard reaches controls with a visible focus ring', reached >= 30 && noFocus.length === 0, noFocus.slice(0, 6).join(', ') || `${reached} stops`);
  const low = await page.evaluate(() => {
    const parse = (c) => { const m = c.match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 0]; };
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const bgOf = (e) => { for (let n = e; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c.length < 4 || c[3] > 0.5) { if (c.length >= 3 && (c.length < 4 || c[3] > 0)) return c; } } return [14, 7, 9]; };
    const out = [];
    for (const e of document.querySelectorAll('span, p, h2, h3, button, label, a')) {
      if (!e.childNodes.length || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const r = e.getBoundingClientRect(); if (!r.width) continue;
      const s = getComputedStyle(e); const fg = parse(s.color); const bg = bgOf(e);
      if (e.closest('button:disabled')) continue;
      const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const large = parseFloat(s.fontSize) >= 18.66 || (parseFloat(s.fontSize) >= 14 && Number(s.fontWeight) >= 700);
      if (ratio < (large ? 3 : 4.5)) out.push(`${e.textContent.trim().slice(0, 20)} ${ratio.toFixed(2)}`);
    }
    return out;
  });
  rec('a11y', 'Text contrast meets WCAG AA', low.length === 0, low.slice(0, 8).join(' | '));
  await ctx.close();
}

// ====================================================================
// 13. Console
// ====================================================================
const relevant = consoleIssues.filter((m) => !/ERR_INTERNET_DISCONNECTED|favicon|DevTools|GPU stall|GroupMarkerNotSet|Automatic fallback to software WebGL|OpenGL error checking is disabled/i.test(m));
rec('console', 'No console errors or relevant warnings during the run', relevant.length === 0, [...new Set(relevant)].slice(0, 10).join(' || '));

writeFileSync(join(OUT, 'results.json'), JSON.stringify({ when: new Date().toISOString(), results, console: consoleIssues }, null, 2));
const fails = results.filter((r) => r.status === 'FAIL');
console.log(`\n${results.length - fails.length} passed, ${fails.length} failed`);
await browser.close();
process.exit(fails.length ? 1 : 0);
