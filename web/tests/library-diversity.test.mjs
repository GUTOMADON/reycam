import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || 'http://127.0.0.1:8000';
const OUT = join(HERE, 'out');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: process.env.CHANNEL || 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, locale: 'en-US', acceptDownloads: true });
const page = await context.newPage();
await page.goto(BASE + '/');
await page.waitForSelector('canvas.preview');
await page.waitForFunction(() => document.querySelector('canvas.preview')?.width > 10);

await page.setInputFiles('.top-actions input[type=file]', join(HERE, 'fixtures', 'mirror-original.jpg'));
await page.waitForTimeout(500);

async function pick(id) {
  const card = page.locator(`.side.left [data-look="${id}"] .look-btn`);
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await page.waitForTimeout(20);
}

async function sample() {
  return page.evaluate(() => {
    const c = document.querySelector('canvas.preview');
    const s = document.createElement('canvas');
    s.width = 48; s.height = 48;
    const x = s.getContext('2d', { willReadFrequently: true });
    x.drawImage(c, 0, 0, 48, 48);
    const d = x.getImageData(0, 0, 48, 48).data;
    const px = [];
    for (let i = 0; i < d.length; i += 4) px.push(d[i], d[i + 1], d[i + 2]);
    return px;
  });
}

const diff = (a, b) => {
  let total = 0;
  for (let i = 0; i < a.length; i++) total += Math.abs(a[i] - b[i]);
  return total / a.length;
};

const stats = (px) => {
  const lum = [];
  let sat = 0;
  for (let i = 0; i < px.length; i += 3) {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    lum.push(0.299 * r + 0.587 * g + 0.114 * b);
    sat += (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
  }
  lum.sort((a, b) => a - b);
  const pct = (p) => lum[Math.min(lum.length - 1, Math.floor(lum.length * p))];
  let mean = 0;
  lum.forEach((v) => mean += v);
  mean /= lum.length;
  let variance = 0;
  lum.forEach((v) => variance += (v - mean) * (v - mean));
  return { p10: pct(0.10), p50: pct(0.50), p90: pct(0.90), p98: pct(0.98), saturation: sat / (px.length / 3), contrast: Math.sqrt(variance / lum.length) };
};

await pick('mirror-mood');
await page.waitForTimeout(300);
const mirrorPx = await sample();
const mirrorStats = stats(mirrorPx);
const reference = JSON.parse(readFileSync(join(HERE, 'fixtures', 'mirror-reference.json'), 'utf8')).reference;

const closeness = (() => {
  const fields = ['p10', 'p50', 'p90', 'p98', 'saturation', 'contrast'];
  let score = 0;
  fields.forEach((key) => {
    const actual = mirrorStats[key];
    const target = key === 'saturation' ? reference.saturation : reference[key];
    if (key === 'saturation') score += 100 * (1 - Math.min(1, Math.abs(actual - target)));
    else if (key === 'contrast') score += 100 * (1 - Math.min(1, Math.abs(actual - target) / 100));
    else score += 100 * (1 - Math.min(1, Math.abs(actual - target) / 255));
  });
  return Number((score / fields.length).toFixed(1));
})();

const categories = ['moody', 'bw', 'film', 'indie', 'y2k', 'flash', 'sim', 'yellow', 'green', 'wine', 'lowlight', 'nature', 'color', 'video', 'extra'];
const categoryLabels = {
  moody: 'Moody', bw: 'Black and White', film: 'Film', indie: 'Indie', y2k: 'Y2K',
  flash: 'Flash', sim: 'Simulations', yellow: 'Yellow', green: 'Green', wine: 'Wine',
  lowlight: 'Low light', nature: 'Nature', color: 'Colors', video: 'Video', extra: 'Extras'
};
const counts = {};
for (const cat of categories) {
  await page.locator('.cat-bar .seg.grow').click();
  const item = page.locator('.cat-item').filter({ hasText: categoryLabels[cat] });
  await item.first().click();
  await page.waitForTimeout(80);
  counts[cat] = await page.locator('.looks [data-look]').count();
}

await page.locator('.cat-bar .seg').filter({ hasText: 'All' }).click().catch(() => {});
await page.waitForTimeout(100);

const ids = await page.locator('.looks [data-look]').evaluateAll((els) => els.map((el) => el.getAttribute('data-look')).filter(Boolean));
const similar = [];
const signatures = [];
for (const id of ids) {
  await pick(id);
  const px = await sample();
  for (const previous of signatures) {
    if (diff(px, previous.px) < 5) similar.push({ a: previous.id, b: id, difference: Number(diff(px, previous.px).toFixed(2)) });
  }
  signatures.push({ id, px });
}

const minimums = { moody: 30, bw: 30, film: 30, indie: 30, y2k: 50, flash: 30, sim: 30, yellow: 30, green: 30, wine: 30, lowlight: 30, nature: 30, color: 30, video: 30, extra: 30 };
const failures = [];
for (const [cat, minimum] of Object.entries(minimums)) if ((counts[cat] || 0) < minimum) failures.push(`${cat}: ${counts[cat] || 0} < ${minimum}`);
if (similar.length) failures.push(`${similar.length} nearly identical thumbnail pair(s)`);

const report = { reference, mirrorStats, mirrorCloseness: closeness, counts, minimums, similarPairs: similar.slice(0, 100), failures };
writeFileSync(join(OUT, 'library-diversity.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
if (failures.length) process.exit(1);
