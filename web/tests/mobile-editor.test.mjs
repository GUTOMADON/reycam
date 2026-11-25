import { chromium } from 'playwright';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = join(HERE, 'fixtures');
const BASE = process.env.BASE || 'http://127.0.0.1:5173';
const WIDTHS = [360, 390, 430];
const LOOKS = ['lu-cry', 'lu-lazuli', 'lu-pop', 'lu-amora', 'lu-pitaya', 'lu-goiaba', 'lu-melancia', 'lu-morango', 'lu-framboesa'];
const NEW_LOOKS = LOOKS.slice(3);
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${message}`);
}

async function openFilters(page, category = 'lu') {
  await page.locator('.nav-btn').filter({ hasText: 'Filtros' }).click();
  if (category === 'lu') await page.locator('.cat-chip:has(.bolt)').click();
  else await page.locator('.cat-chip').first().click();
}

async function pickLook(page, id) {
  await openFilters(page);
  const card = page.locator(`.m-grid [data-look="${id}"] .look-btn`);
  await card.scrollIntoViewIfNeeded();
  await card.tap();
  await page.waitForSelector('.page', { state: 'detached' });
  await page.waitForTimeout(100);
}

async function dragSlider(cdp, page, slider) {
  await slider.scrollIntoViewIfNeeded();
  const box = await slider.boundingBox();
  if (!box || box.width < 80 || box.height < 30) return false;
  const y = box.y + box.height / 2;
  const startX = box.x + box.width * 0.25;
  const endX = box.x + box.width * 0.76;
  const before = await slider.inputValue();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: endX, y, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(50);
  return (await slider.inputValue()) !== before;
}

async function sample(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas.preview');
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 40;
    sampleCanvas.height = 40;
    const ctx = sampleCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(canvas, 0, 0, sampleCanvas.width, sampleCanvas.height);
    const pixels = ctx.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data;
    const luma = [];
    let clippedWhite = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      luma.push(0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]);
      if (pixels[i] > 250 && pixels[i + 1] > 250 && pixels[i + 2] > 250) clippedWhite++;
    }
    luma.sort((a, b) => a - b);
    return {
      median: luma[Math.floor(luma.length * 0.5)],
      p90: luma[Math.floor(luma.length * 0.9)],
      clippedWhite: clippedWhite / luma.length
    };
  });
}

const browser = await chromium.launch({ channel: process.env.CHANNEL || 'chrome', headless: true });
try {
  for (const width of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      locale: 'pt-BR'
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await page.goto(BASE);
    await page.waitForSelector('canvas.preview');
    await page.waitForFunction(() => document.querySelector('canvas.preview')?.width > 20);
    await page.locator('.dashboard-close').click().catch(() => undefined);
    await page.waitForTimeout(150);

    const navLayout = await page.locator('.bottom-nav').evaluate((nav) => {
      const navRect = nav.getBoundingClientRect();
      const safePadding = parseFloat(getComputedStyle(nav).paddingBottom);
      const contentBottom = navRect.bottom - safePadding;
      const iconRects = [...nav.querySelectorAll('.nav-ico')].map((icon) => icon.getBoundingClientRect());
      return {
        safePadding,
        navBottom: navRect.bottom,
        viewportBottom: window.innerHeight,
        iconsInsideContent: iconRects.every((rect) => rect.top >= navRect.top && rect.bottom <= contentBottom)
      };
    });
    check(navLayout.safePadding >= 24, `${width}px bottom navigation reserves room for the system bar`);
    check(navLayout.navBottom <= navLayout.viewportBottom + 1 && navLayout.iconsInsideContent, `${width}px bottom navigation icons stay clear of the screen edge`);

    check(
      await page.evaluate(() => document.body.innerText.indexOf(String.fromCharCode(92) + 'n') < 0),
      `${width}px has no visible literal slash-n text`
    );

    for (const id of LOOKS) {
      await pickLook(page, id);
      const state = await page.evaluate(() => {
        const toolbar = document.querySelector('.toolbar');
        const quick = document.querySelector('.quick-adj');
        const canvas = document.querySelector('.preview');
        const ranges = [...toolbar.querySelectorAll('input[type=range]')];
        const chips = [...toolbar.querySelectorAll('.qa-chip')];
        const stage = document.querySelector('.stage').getBoundingClientRect();
        const preview = canvas.getBoundingClientRect();
        const rects = [...toolbar.querySelectorAll('.qa-range input, .qa-chip')].map((el) => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, width: r.width, height: r.height };
        });
        return {
          scrollWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          toolbarWidth: toolbar.clientWidth,
          toolbarScroll: toolbar.scrollWidth,
          toolbarVerticalScroll: toolbar.scrollHeight > toolbar.clientHeight && getComputedStyle(toolbar).overflowY === 'auto',
          quickScroll: quick ? quick.scrollWidth : 0,
          intensityFirst: !!quick && toolbar.querySelector('.inline-range.grow').compareDocumentPosition(quick) & Node.DOCUMENT_POSITION_FOLLOWING,
          previewWidth: canvas.getBoundingClientRect().width,
          previewInsideStage: preview.top >= stage.top - 1 && preview.bottom <= stage.bottom + 1,
          ranges: ranges.map((el) => ({ height: parseFloat(getComputedStyle(el).height) })),
          rects,
          chips: chips.length
        };
      });
      check(state.scrollWidth <= width && state.bodyWidth <= width, `${width}px ${id}: no page-level horizontal overflow`);
      check(state.toolbarScroll <= state.toolbarWidth + 1 && state.quickScroll <= state.toolbarWidth + 1, `${width}px ${id}: quick controls fit without clipping`);
      check(state.intensityFirst, `${width}px ${id}: intensity precedes its filter options`);
      check(state.previewWidth >= width - 48, `${width}px ${id}: preview uses the available width (${state.previewWidth.toFixed(1)}px)`);
      check(state.previewInsideStage, `${width}px ${id}: preview stays visible inside the photo area`);
      check(state.toolbarVerticalScroll, `${width}px ${id}: long filter controls scroll vertically inside the toolbar`);
      check(state.ranges.every((range) => range.height >= 44), `${width}px ${id}: sliders have 44px touch targets`);
      check(state.rects.every((rect) => rect.left >= -1 && rect.right <= width + 1), `${width}px ${id}: all chips and sliders stay inside the viewport`);

      const sliders = page.locator('.toolbar input[type=range]');
      for (let index = 0; index < await sliders.count(); index++) {
        check(await dragSlider(cdp, page, sliders.nth(index)), `${width}px ${id}: slider ${index + 1} responds to touch dragging`);
      }
      const chips = page.locator('.qa-chips .qa-chip');
      for (let index = 0; index < await chips.count(); index++) {
        await chips.nth(index).tap();
        check(await chips.nth(index).evaluate((el) => el.classList.contains('on')), `${width}px ${id}: color chip ${index + 1} is tappable`);
      }
    }

    const fullButton = page.locator('.stage-fullscreen');
    check(await fullButton.isVisible(), `${width}px fullscreen button is visible`);
    await fullButton.tap();
    await page.waitForFunction(() => document.querySelector('.fullscreen-image')?.width > 0);
    check(await page.locator('.fullscreen-view').isVisible(), `${width}px fullscreen renders the edited image`);
    check(
      ['manipulation', 'auto'].includes(await page.locator('.fullscreen-image-wrap').evaluate((el) => getComputedStyle(el).touchAction)) ||
        (await page.locator('.fullscreen-image-wrap').evaluate((el) => getComputedStyle(el).touchAction)).includes('pinch-zoom'),
      `${width}px fullscreen permits pinch zoom`
    );
    await page.locator('.fullscreen-close').tap();
    check(!(await page.locator('.fullscreen-view').count()), `${width}px fullscreen close button works`);
    await fullButton.tap();
    await page.keyboard.press('Escape');
    check(!(await page.locator('.fullscreen-view').count()), `${width}px Escape closes fullscreen`);
    await fullButton.tap();
    await page.locator('.fullscreen-view').click({ position: { x: 2, y: 80 } });
    check(!(await page.locator('.fullscreen-view').count()), `${width}px tapping outside closes fullscreen`);

    if (width === 390) {
      await page.locator('.nav-btn').filter({ hasText: 'Editar' }).tap();
      await page.locator('.tool-card[data-panel="light"]').tap();
      const panelLayout = await page.evaluate(() => {
        const photo = document.querySelector('.stage').getBoundingClientRect();
        const dock = document.querySelector('.tool-dock').getBoundingClientRect();
        return { photoHeight: photo.height, photoBottom: photo.bottom, panelTop: dock.top };
      });
      check(panelLayout.photoHeight > 160 && panelLayout.photoBottom <= panelLayout.panelTop + 1, '390px: editing panel scrolls below a visible, unobscured photo');
    }
    await context.close();
  }

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    locale: 'pt-BR'
  });
  const page = await context.newPage();
  await page.goto(BASE);
  await page.waitForSelector('canvas.preview');
  await page.locator('.dashboard-close').click().catch(() => undefined);

  const photoBytes = readFileSync(join(FIX, 'photo.jpg'));
  const portraitBytes = readFileSync(join(FIX, 'mirror-original.jpg'));
  const dimPortrait = await sharp(portraitBytes).modulate({ brightness: 0.32 }).jpeg().toBuffer();
  for (const [name, buffer] of [['bright scene', photoBytes], ['portrait with skin', portraitBytes], ['dark portrait', dimPortrait]]) {
    await page.locator('.nav-btn').filter({ hasText: 'Importar' }).tap();
    await page.locator('.upload-card.photo input').setInputFiles({ name: 'mobile-fixture.jpg', mimeType: 'image/jpeg', buffer });
    await page.waitForSelector('.page', { state: 'detached' });
    await page.waitForTimeout(180);
    await openFilters(page, 'all');
    const original = page.locator('.m-grid [data-look="original"] .look-btn');
    await original.scrollIntoViewIfNeeded();
    await original.tap();
    await page.waitForSelector('.page', { state: 'detached' });
    const baseline = await sample(page);
    for (const id of NEW_LOOKS) {
      await pickLook(page, id);
      await page.waitForTimeout(70);
      const result = await sample(page);
      check(
        Number.isFinite(result.median) && result.median > 4 && result.median < 248 && result.p90 < 255 && result.clippedWhite < 0.35,
        `${id} on ${name}: output retains highlight/shadow detail`
      );
      check(Math.abs(result.median - baseline.median) > 1, `${id} on ${name}: gradient look changes the source image`);
    }
  }
  await context.close();
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\n${failures.length} mobile editor test(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('\nMobile editor tests passed.');
}
