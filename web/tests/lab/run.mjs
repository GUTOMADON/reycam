// ReyCam look lab: renders looks with the real pipeline in Chromium and measures them.
//
//   node tests/lab/run.mjs distinct [--cat y2k] [--threshold 6]   every pair of looks must differ (fails if two are almost equal)
//   node tests/lab/run.mjs mirror [--cat moody] [ids...]           closeness of looks to the Mirror Mood reference photo
//   node tests/lab/run.mjs sheet --cat moody [--image showcase.jpg] [--out file.png]   contact sheet to look at
//   node tests/lab/run.mjs counts                                  looks per category
//
// Writes JSON reports to tests/out/lab. Uses the Vite dev server, so no build is needed.
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const OUT = join(ROOT, 'tests', 'out', 'lab');
mkdirSync(OUT, { recursive: true });

const argv = process.argv.slice(2);
const cmd = argv[0] || 'distinct';
const flag = (name, def) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : def; };
const ids = argv.slice(1).filter((a, i, all) => !a.startsWith('--') && !(i > 0 && all[i - 1].startsWith('--')));

const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 0, host: '127.0.0.1' } });
await server.listen();
const url = server.resolvedUrls.local[0] + 'tests/lab/lab.html';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url);
await page.waitForFunction(() => (window).labReady === true, null, { timeout: 60000 }).catch(() => undefined);
if (errors.length) { console.error('Lab page errors:\n' + errors.join('\n')); await done(2); }

const looks = await page.evaluate(() => (window).lab.looks());

async function done(code) { await browser.close(); await server.close(); process.exit(code); }

/** 3 by 3 box blur on an RGB array, so grain alone does not count as a different look. */
function blurRGB(d, w, h) {
  const out = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) {
    let s = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      s += d[(yy * w + xx) * 4 + c]; n++;
    }
    out[(y * w + x) * 3 + c] = s / n;
  }
  return out;
}

async function thumbs(list, image, size = 48) {
  const res = {};
  for (const l of list) {
    const r = await page.evaluate(([id, im, sz]) => (window).lab.render(id, im, 200, '1:1', sz, sz), [l.id, image, size]);
    res[l.id] = blurRGB(r.data, r.w, r.h);
  }
  return res;
}
const dist = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };

if (cmd === 'counts') {
  const c = {};
  looks.forEach((l) => { c[l.cat] = (c[l.cat] || 0) + 1; });
  console.log(JSON.stringify({ total: looks.length, ...c }, null, 1));
  await done(0);
}

if (cmd === 'distinct') {
  // Visible difference between two looks, as the mean absolute RGB difference (0 to 255) of
  // blurred 48 px thumbnails on two test photos. The smaller of the two photos decides.
  const threshold = Number(flag('threshold', '6'));
  const cat = flag('cat', '');
  const imgs = ['showcase.jpg', 'mirror-original.jpg'];
  const t0 = Date.now();
  const sets = [];
  for (const im of imgs) sets.push(await thumbs(looks, im));
  const pairs = [];
  for (let i = 0; i < looks.length; i++) for (let j = i + 1; j < looks.length; j++) {
    const a = looks[i], b = looks[j];
    if (cat && a.cat !== cat && b.cat !== cat) continue;
    const d = Math.max(...sets.map((s) => dist(s[a.id], s[b.id])));
    pairs.push({ a: a.id, b: b.id, catA: a.cat, catB: b.cat, d: Math.round(d * 100) / 100 });
  }
  pairs.sort((x, y) => x.d - y.d);
  const bad = pairs.filter((p) => p.d < threshold);
  // Nearest neighbour of every look, useful when tuning a category.
  const nearest = {};
  for (const p of pairs) {
    if (!nearest[p.a] || p.d < nearest[p.a].d) nearest[p.a] = { other: p.b, d: p.d };
    if (!nearest[p.b] || p.d < nearest[p.b].d) nearest[p.b] = { other: p.a, d: p.d };
  }
  writeFileSync(join(OUT, cat ? `distinct-${cat}.json` : 'distinct.json'), JSON.stringify({ threshold, looks: looks.length, closest: pairs.slice(0, 40), tooClose: bad, nearest }, null, 1));
  console.log(`Looks: ${looks.length}, pairs checked: ${pairs.length}, threshold ${threshold}, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  console.log('Closest pairs:');
  pairs.slice(0, 15).forEach((p) => console.log(`  ${p.d.toFixed(2).padStart(6)}  ${p.a} (${p.catA})  ~  ${p.b} (${p.catB})`));
  if (bad.length) { console.log(`FAIL: ${bad.length} pair(s) below ${threshold}`); bad.slice(0, 60).forEach((p) => console.log(`  ${p.d.toFixed(2)}  ${p.a} ~ ${p.b}`)); await done(1); }
  console.log('OK: every look is visibly different');
  await done(0);
}

// ---- color science for the Mirror Mood comparison ----
const toLin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
function lab(r, g, b) {
  const R = toLin(r), G = toLin(g), B = toLin(b);
  let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, y = R * 0.2126 + G * 0.7152 + B * 0.0722, z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  x = f(x); y = f(y); z = f(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
function stats(d) {
  const n = d.length / 4, lum = new Float32Array(n);
  const bands = { shadows: [0, 0, 0, 0], midtones: [0, 0, 0, 0], highlights: [0, 0, 0, 0] };
  let sat = 0;
  for (let i = 0; i < n; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; lum[i] = l;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); sat += mx ? (mx - mn) / mx : 0;
    const k = l < 0.18 ? 'shadows' : l < 0.5 ? 'midtones' : 'highlights';
    bands[k][0] += r; bands[k][1] += g; bands[k][2] += b; bands[k][3]++;
  }
  const sorted = Array.from(lum).sort((a, b) => a - b);
  const pct = (p) => Math.round(sorted[Math.min(n - 1, Math.floor(p / 100 * n))] * 2550) / 10;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  const band = (k) => (bands[k][3] ? bands[k].slice(0, 3).map((v) => Math.round(v / bands[k][3] * 10) / 10) : null);
  return { p10: pct(10), p50: pct(50), p90: pct(90), p98: pct(98), shadowsRGB: band('shadows'), midtonesRGB: band('midtones'), highlightsRGB: band('highlights'), saturation: Math.round(sat / n * 1000) / 1000, contrast: Math.round(sd * 2550) / 10 };
}

if (cmd === 'mirror') {
  const ref = JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'mirror-reference.json'), 'utf8'));
  const [W, H] = ref.size;
  const refPx = await page.evaluate(async ([w, h]) => {
    const img = new Image(); img.src = '/tests/fixtures/mirror-reference.png'; await img.decode();
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, w, h);
    return Array.from(x.getImageData(0, 0, w, h).data);
  }, [W, H]);
  const refLab = [];
  for (let i = 0; i < refPx.length; i += 4) refLab.push(lab(refPx[i], refPx[i + 1], refPx[i + 2]));
  const refStats = stats(refPx);
  const cat = flag('cat', '');
  const list = ids.length ? looks.filter((l) => ids.includes(l.id)) : looks.filter((l) => (cat ? l.cat === cat : l.cat === 'moody') || l.id === 'original');
  const rows = [];
  for (const l of list) {
    const r = await page.evaluate(([id, w, h]) => (window).lab.render(id, 'mirror-original.jpg', Math.max(w, h), 'original', w, h), [l.id, W, H]);
    let de = 0;
    for (let i = 0, p = 0; i < r.data.length; i += 4, p++) {
      const a = lab(r.data[i], r.data[i + 1], r.data[i + 2]), b = refLab[p];
      de += Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    }
    de /= refLab.length;
    const s = stats(r.data);
    rows.push({ id: l.id, name: l.name, cat: l.cat, deltaE: Math.round(de * 10) / 10, closeness: Math.max(0, Math.round((100 - de * 2) * 10) / 10), stats: s });
  }
  rows.sort((a, b) => a.deltaE - b.deltaE);
  writeFileSync(join(OUT, 'mirror.json'), JSON.stringify({ reference: refStats, rows }, null, 1));
  console.log('Reference', JSON.stringify(refStats));
  console.log('closeness = 100 - 2 x mean CIE76 delta E per pixel against the reference');
  rows.forEach((r) => console.log(`${String(r.closeness).padStart(5)}%  dE ${String(r.deltaE).padStart(5)}  ${r.id.padEnd(28)} p50 ${r.stats.p50} sh ${JSON.stringify(r.stats.shadowsRGB)} mid ${JSON.stringify(r.stats.midtonesRGB)} hi ${JSON.stringify(r.stats.highlightsRGB)}`));
  await done(0);
}

if (cmd === 'sheet') {
  const cat = flag('cat', '');
  const image = flag('image', 'showcase.jpg');
  const out = flag('out', join(OUT, `sheet-${cat || 'all'}-${image.replace(/\W+/g, '_')}.png`));
  const list = ids.length ? looks.filter((l) => ids.includes(l.id)) : looks.filter((l) => !cat || l.cat === cat);
  const aspect = image.startsWith('mirror') ? 'original' : '1:1';
  const png = await page.evaluate(async ([list, image, aspect]) => {
    const cell = 180, labelH = 22, cols = 8;
    const rows = Math.ceil(list.length / cols);
    const c = document.createElement('canvas'); c.width = cols * cell; c.height = rows * (cell + labelH);
    const x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < list.length; i++) {
      const url = await (window).lab.dataUrl(list[i].id, image, 360, aspect);
      const img = new Image(); img.src = url; await img.decode();
      const cx = (i % cols) * cell, cy = Math.floor(i / cols) * (cell + labelH);
      const s = Math.min(cell / img.width, cell / img.height);
      x.drawImage(img, cx + (cell - img.width * s) / 2, cy + (cell - img.height * s) / 2, img.width * s, img.height * s);
      x.fillStyle = '#eee'; x.font = '12px sans-serif'; x.fillText(list[i].id.slice(0, 26), cx + 4, cy + cell + 15);
    }
    return c.toDataURL('image/png');
  }, [list, image, aspect]);
  writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
  console.log('Wrote ' + out + ' (' + list.length + ' looks)');
  await done(0);
}

console.error('Unknown command ' + cmd);
await done(2);
