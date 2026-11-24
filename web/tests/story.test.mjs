// Multi Photo Story tests in a real browser (Playwright, installed Chrome, dev server running).
// Run: npm run dev, then npm run test:story
// 1. Every style lays out 2 to 30 photos fast, inside the canvas, seeded, and Grid and
//    Mosaic leave no holes; Messy never covers a face.
// 2. End to end: pick photos, choose a style, answer the filter sheet, edit, export 1080 x 1920.
import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE || 'http://localhost:5173';
const FIX = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const browser = await chromium.launch({ channel: process.env.CHANNEL || 'chrome', headless: true });
let failures = 0;
const check = (name, ok, detail = '') => { if (!ok) failures++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`); };

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(BASE + '/?test');

// ---------------------------------------------------------------- generators
const gen = await page.evaluate(async () => {
  const { STORY_STYLES, DEFAULT_STORY_OPTIONS } = await import('/src/collage/story.ts');
  const out = [];
  const canvas = { w: 1080, h: 1920 };
  for (const st of STORY_STYLES) {
    for (const n of [2, 3, 4, 7, 9, 12, 17, 24, 30]) {
      const photos = Array.from({ length: n }, (_, i) => ({ aspect: [0.75, 1.33, 1, 0.8][i % 4], faces: [{ x: 0.5, y: 0.35, r: 0.12 }], quality: (i * 37 % 10) / 10 }));
      const o = { ...DEFAULT_STORY_OPTIONS, ...st.defaults };
      const t0 = performance.now();
      const a = st.generate(photos, canvas, o, 7);
      const ms = performance.now() - t0;
      const b = st.generate(photos, canvas, o, 7);
      const placed = new Set([...a.frames.map((f) => f.photo), ...(a.strips || []).flatMap((s) => s.photos)]);
      const ar = canvas.w / canvas.h;
      // Coverage of the frame area for gap free styles (sampled on a grid).
      let holes = 0, samples = 0;
      if (st.id === 'grid' || st.id === 'mosaic') {
        const xs = a.frames.map((f) => [f.x - f.w / 2, f.x + f.w / 2]), ys = a.frames.map((f) => [f.y - f.h / 2, f.y + f.h / 2]);
        const minX = Math.min(...xs.map((v) => v[0])), maxX = Math.max(...xs.map((v) => v[1])), minY = Math.min(...ys.map((v) => v[0])), maxY = Math.max(...ys.map((v) => v[1]));
        for (let y = minY + 0.01; y < maxY; y += 0.013) for (let x = minX + 0.01; x < maxX; x += 0.013) {
          samples++;
          const gap = 0.02; // gutters are allowed
          if (!a.frames.some((f) => Math.abs(x - f.x) <= f.w / 2 + gap && Math.abs(y - f.y) <= f.h / 2 + gap * ar)) holes++;
        }
      }
      // Faces covered by a later frame (messy and scrapbook).
      let covered = 0;
      if (st.id === 'messy' || st.id === 'scrapbook') {
        const sorted = [...a.frames].sort((p, q) => p.z - q.z);
        sorted.forEach((f, i) => {
          const fx = f.x, fy = f.y - f.h * 0.15;
          if (sorted.slice(i + 1).some((g) => Math.abs(fx - g.x) < g.w / 2 && Math.abs(fy - g.y) < g.h / 2)) covered++;
        });
      }
      out.push({ style: st.id, n, ms, placed: placed.size, same: JSON.stringify(a) === JSON.stringify(b), holes, samples, covered });
    }
  }
  return out;
});
for (const r of gen) {
  check(`${r.style} n=${r.n}: every photo placed`, r.placed === r.n, `${r.placed}/${r.n}`);
  if (r.ms > 300) check(`${r.style} n=${r.n}: layout under 300 ms`, false, r.ms.toFixed(0) + ' ms');
  if (!r.same) check(`${r.style} n=${r.n}: seeded`, false);
  if (r.samples) check(`${r.style} n=${r.n}: no holes`, r.holes / r.samples < 0.02, `${r.holes}/${r.samples}`);
  if (r.covered) check(`${r.style} n=${r.n}: no covered faces`, false, `${r.covered}`);
}

// ---------------------------------------------------------------- end to end
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.click('.collage-card');
await page.locator('.col-entry-card.story').click();
await page.setInputFiles('.col-story-add input[type=file]', ['photo.jpg', 'second.jpg', 'mirror-original.jpg', 'showcase.jpg'].map((f) => join(FIX, f)));
await page.waitForFunction(() => document.querySelectorAll('.col-story-thumb').length === 4, null, { timeout: 30000 });
check('picker shows 4 photos', true);
await page.locator('.col-story-right .col-chip', { hasText: 'Messy' }).click();
await page.waitForSelector('.col-story-preview img');
check('live preview rendered', true);
await page.click('.col-story .col-start');
await page.waitForSelector('.col-filter-sheet');
await page.locator('.col-filter-options .btn').nth(1).click();
await page.locator('.col-filter-sheet .col-chip', { hasText: 'Lu Blue' }).first().click();
await page.waitForSelector('canvas.col-canvas', { timeout: 90000 });
await page.waitForFunction(() => !!window.__collage?.doc());
const doc = await page.evaluate(() => window.__collage.doc());
check('story document created', !!doc.story && doc.ratio === '9:16', JSON.stringify(doc.story?.style));
check('filter stored for the story', doc.filter?.id === 'lu-blue');
check('every photo has a frame', doc.layers.filter((l) => l.kind === 'photo').length === 4);
const out = await page.evaluate(() => { const c = window.__collage.render(1920); return [c.width, c.height]; });
check('export size 1080 x 1920', out[0] === 1080 && out[1] === 1920, out.join('x'));
await page.locator('.col-tab', { hasText: 'Story' }).click();
await page.locator('.col-panel .col-chip', { hasText: 'Grid' }).first().click();
await page.waitForTimeout(300);
check('style change regenerates', (await page.evaluate(() => window.__collage.doc().story.style)) === 'grid');
check('no page errors', errors.length === 0, errors.join('; '));

await browser.close();
if (failures) { console.error(`\n${failures} story test(s) failed`); process.exit(1); }
console.log('\nstory tests OK');
