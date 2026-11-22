// Renders looks with the real ReyCam pipeline for the lab tests (tests/lab/run.mjs).
import { Pipeline } from '../../src/engine/pipeline';
import { RECIPES } from '../../src/engine/recipes';
import { defaultEdit, zeroAdj } from '../../src/engine/utils';
import type { EditState } from '../../src/engine/types';

const pipe = new Pipeline();
const images: Record<string, HTMLImageElement> = {};

async function image(name: string): Promise<HTMLImageElement> {
  if (images[name]) return images[name];
  const img = new Image();
  img.src = '/tests/fixtures/' + name;
  await img.decode();
  images[name] = img;
  return img;
}

/** Same settings as the library thumbnails: square crop, no frame, no date. */
function thumbEdit(id: string, aspect: string): EditState {
  return { ...defaultEdit(), adj: zeroAdj(), aspect, frame: 'none', stamp: 'off', camId: id };
}

async function render(id: string, imageName: string, size: number, aspect = '1:1', outW = 0, outH = 0) {
  const recipe = RECIPES.find((r) => r.id === id);
  if (!recipe) throw new Error('unknown look ' + id);
  const img = await image(imageName);
  const c = document.createElement('canvas');
  pipe.render({ source: img, srcW: img.naturalWidth, srcH: img.naturalHeight, recipe, edit: thumbEdit(id, aspect), isVideo: false, time: 0, plain: false, maxSize: size, newFrame: true }, c);
  const w = outW || c.width, h = outH || c.height;
  const s = document.createElement('canvas');
  s.width = w; s.height = h;
  const x = s.getContext('2d', { willReadFrequently: true })!;
  x.drawImage(c, 0, 0, w, h);
  return { w, h, png: outW ? '' : '', data: Array.from(x.getImageData(0, 0, w, h).data) };
}

async function dataUrl(id: string, imageName: string, size: number, aspect = '1:1') {
  const recipe = RECIPES.find((r) => r.id === id)!;
  const img = await image(imageName);
  const c = document.createElement('canvas');
  pipe.render({ source: img, srcW: img.naturalWidth, srcH: img.naturalHeight, recipe, edit: thumbEdit(id, aspect), isVideo: false, time: 0, plain: false, maxSize: size, newFrame: true }, c);
  return c.toDataURL('image/jpeg', 0.9);
}

(window as any).lab = {
  looks: () => RECIPES.map((r) => ({ id: r.id, name: r.name, cat: r.cat, desc: r.desc })),
  render,
  dataUrl
};
(window as any).labReady = true;
