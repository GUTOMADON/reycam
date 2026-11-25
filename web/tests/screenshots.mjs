// Captures the README screenshots with the dog-and-guinea-pigs test photo. Server must run on BASE.
// Run with: node tests/screenshots.mjs
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '..', 'docs', 'screenshots');
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:8010';
const PHOTO = join(HERE, '..', '..', 'docs', 'screenshots', 'sample-photo.png');
const browser = await chromium.launch({ channel: process.env.CHANNEL || 'chrome', headless: true });
const wait = (p, ms = 400) => p.waitForTimeout(ms);

async function open(opts) {
  const ctx = await browser.newContext({ locale: 'en-US', deviceScaleFactor: 1, ...opts });
  const page = await ctx.newPage();
  await page.goto(BASE + '/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('reycam.lang.v3', 'en'); });
  await page.reload();
  await page.waitForFunction(() => document.querySelector('canvas.preview')?.width > 10);
  if (opts.isMobile) {
    await page.locator('.dashboard-close').click().catch(() => undefined);
    await page.locator('.nav-btn').filter({ hasText: 'Import' }).click();
    await page.locator('.upload-card.photo input').setInputFiles(PHOTO);
    await page.waitForSelector('.page', { state: 'detached' });
  } else {
    await page.setInputFiles('.top-actions input[type=file]', PHOTO);
  }
  await page.waitForFunction(() => document.querySelector('.file-chip, .stage') !== null);
  await page.waitForFunction(() => document.querySelectorAll('.look-img img').length > 8, null, { timeout: 20000 }).catch(() => undefined);
  await wait(page, 600);
  return { ctx, page };
}

// Desktop editor with a few looks
{
  const { ctx, page } = await open({ viewport: { width: 1440, height: 900 } });
  const look = async (id) => { await page.locator(`.side.left [data-look="${id}"] .look-btn`).scrollIntoViewIfNeeded(); await page.click(`.side.left [data-look="${id}"] .look-btn`); await wait(page); };
  await look('cp-35');
  await page.click('.panel-tabs [data-panel="light"]'); await wait(page);
  await page.screenshot({ path: join(OUT, 'editor-desktop.png') });
  for (const [id, file] of [['indie-sleaze', 'look-indie'], ['ccd-2003', 'look-y2k'], ['vinho-tinto', 'look-wine'], ['instant-flash', 'look-instant'], ['mono-400', 'look-mono'], ['vhs-bolt', 'look-vhs']]) {
    await look(id);
    await page.locator('canvas.preview').screenshot({ path: join(OUT, file + '.png') });
  }
  await look('bolt-classic');
  await page.click('.panel-tabs [data-panel="stamp"]'); await page.click('.side.right .panel-body .pill[data-id="yellow"]'); await wait(page);
  await page.screenshot({ path: join(OUT, 'date-panel.png') });
  await page.click('.cat-bar .seg.grow'); await wait(page, 300);
  await page.locator('.side.left').screenshot({ path: join(OUT, 'categories.png') });
  await page.keyboard.press('Escape');
  await page.click('.top-actions .btn.primary'); await wait(page);
  await page.screenshot({ path: join(OUT, 'export-dialog.png') });
  await ctx.close();
}
// Original vs look, side by side source shots
{
  const { ctx, page } = await open({ viewport: { width: 1440, height: 900 } });
  await page.click('.side.left [data-look="original"] .look-btn'); await wait(page);
  await page.locator('canvas.preview').screenshot({ path: join(OUT, 'look-original.png') });
  await ctx.close();
}
// Phones
for (const [name, dev] of [['iphone', devices['iPhone 13']], ['android', devices['Pixel 7']]]) {
  const { ctx, page } = await open({ ...dev, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await page.screenshot({ path: join(OUT, `mobile-${name}.png`) });
  await ctx.close();
}
await browser.close();
console.log('screenshots written to', OUT);
