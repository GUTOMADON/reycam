// Collage filter tests in a real browser (Playwright with the installed Chrome).
// Start the dev server first (npm run dev), then: npm run test:collage
// Covers: recommended filter, another filter, no filter, changing the filter after the
// collage opened, undo and redo of a filter change, and export matching the preview.
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:5173';
const TEMPLATE = process.env.TPL || 'Cherry Print';
const browser = await chromium.launch({ channel: process.env.CHANNEL || 'chrome', headless: true });
let failures = 0;
const check = (name, ok, detail = '') => { if (!ok) failures++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`); };

/** Mean color of the collage photo (center of the canvas) rendered at a given size. */
const photoMean = (page, long = 600) => page.evaluate((L) => {
  const c = window.__collage.render(L);
  const x = Math.round(c.width * 0.4), y = Math.round(c.height * 0.44), w = Math.round(c.width * 0.2), h = Math.round(c.height * 0.12);
  const d = c.getContext('2d').getImageData(x, y, w, h).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
  return [r / n, g / n, b / n];
}, long);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Open the template with the sample photo and answer the filter sheet. */
async function open(answer) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + '/?test');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.click('.collage-card');
  await page.locator('.col-card-btn', { hasText: TEMPLATE }).first().click();
  await page.click('.welcome-demo');
  await page.waitForSelector('.col-filter-sheet');
  if (answer === 'recommended') await page.locator('.col-filter-options .btn.primary').click();
  else if (answer === 'none') await page.locator('.col-filter-options .btn.ghost').click();
  else { await page.locator('.col-filter-options .btn').nth(1).click(); await page.locator('.col-filter-sheet .col-chip', { hasText: answer }).first().click(); }
  await page.waitForSelector('canvas.col-canvas', { timeout: 60000 });
  await page.waitForFunction(() => !!window.__collage?.doc());
  await page.waitForTimeout(800);
  return { page, errors };
}

const none = await open('none');
const base = await photoMean(none.page);
check('no filter: document has no filter', !(await none.page.evaluate(() => window.__collage.doc().filter)));

// Change the filter after the collage opened, then undo and redo.
await none.page.evaluate(() => window.__collage.setFilter({ id: 'lu-blue', intensity: 100 }));
await none.page.waitForTimeout(300);
const changed = await photoMean(none.page);
check('change filter after opening changes the photo', dist(changed, base) > 8, `delta ${dist(changed, base).toFixed(1)}`);
await none.page.evaluate(() => window.__collage.undo());
await none.page.waitForTimeout(300);
const undone = await photoMean(none.page);
check('undo restores the unfiltered photo', dist(undone, base) < 1.5, `delta ${dist(undone, base).toFixed(1)}`);
await none.page.evaluate(() => window.__collage.redo());
await none.page.waitForTimeout(300);
const redone = await photoMean(none.page);
check('redo brings the filter back', dist(redone, changed) < 1.5, `delta ${dist(redone, changed).toFixed(1)}`);
check('no page errors (no filter)', none.errors.length === 0, none.errors.join('; '));
await none.page.close();

const rec = await open('recommended');
const recDoc = await rec.page.evaluate(() => window.__collage.doc().filter);
check('recommended filter stored in the document', !!recDoc && recDoc.id.startsWith('lu-'), JSON.stringify(recDoc));
const recMean = await photoMean(rec.page);
check('recommended filter changes the photo', dist(recMean, base) > 4, `delta ${dist(recMean, base).toFixed(1)}`);
// Export at a bigger size matches the preview size (same mean color within tolerance).
const big = await photoMean(rec.page, 2160);
check('export matches preview', dist(big, recMean) < 4, `delta ${dist(big, recMean).toFixed(1)}`);
await rec.page.close();

const other = await open('Gu Amber');
const otherDoc = await other.page.evaluate(() => window.__collage.doc().filter);
check('another filter stored in the document', otherDoc?.id === 'gu-amber', JSON.stringify(otherDoc));
const otherMean = await photoMean(other.page);
check('another filter changes the photo', dist(otherMean, base) > 4, `delta ${dist(otherMean, base).toFixed(1)}`);
await other.page.close();

await browser.close();
if (failures) { console.error(`\n${failures} collage filter test(s) failed`); process.exit(1); }
console.log('\ncollage filter tests OK');
