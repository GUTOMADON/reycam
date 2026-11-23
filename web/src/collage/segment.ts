/**
 * On device person segmentation with the MediaPipe Image Segmenter and the
 * selfie segmenter model (about 250 KB). The model and the WebAssembly runtime
 * are served from the app itself (public/models and public/mediapipe), so the
 * cutout works offline and photos never leave the device.
 *
 * Why this model: it runs in well under a second on a recent iPhone in Safari
 * and as an installed app, handles several people at once, and is tiny compared
 * with RMBG or BiRefNet (40 to 900 MB), which are too heavy for a free web app.
 */
import type { ImageSegmenter } from '@mediapipe/tasks-vision';

let segmenter: Promise<ImageSegmenter> | null = null;

function load(): Promise<ImageSegmenter> {
  if (!segmenter) {
    segmenter = (async () => {
      const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision');
      const base = import.meta.env.BASE_URL;
      const fileset = await FilesetResolver.forVisionTasks(base + 'mediapipe');
      const opts = (delegate: 'GPU' | 'CPU') => ({
        baseOptions: { modelAssetPath: base + 'models/selfie_segmenter.tflite', delegate },
        runningMode: 'IMAGE' as const,
        outputCategoryMask: false,
        outputConfidenceMasks: true
      });
      try { return await ImageSegmenter.createFromOptions(fileset, opts('GPU')); }
      catch { return await ImageSegmenter.createFromOptions(fileset, opts('CPU')); }
    })();
    segmenter.catch(() => { segmenter = null; });
  }
  return segmenter;
}

/** Start downloading the model early (when the Collage gallery opens). */
export function preloadSegmenter() {
  load().catch(() => undefined);
}

/**
 * Subject mask for an image, as a canvas of the same size whose alpha is the
 * subject. On failure the mask covers the whole image, so the editor still works.
 */
export async function segment(image: HTMLCanvasElement): Promise<{ mask: HTMLCanvasElement; ok: boolean }> {
  const mask = document.createElement('canvas');
  mask.width = image.width;
  mask.height = image.height;
  const mctx = mask.getContext('2d')!;
  try {
    const seg = await load();
    // The model works at 256 px, a 768 px input keeps edges sharp after upscaling.
    const k = Math.min(1, 768 / Math.max(image.width, image.height));
    const small = document.createElement('canvas');
    small.width = Math.max(1, Math.round(image.width * k));
    small.height = Math.max(1, Math.round(image.height * k));
    small.getContext('2d')!.drawImage(image, 0, 0, small.width, small.height);
    const result = seg.segment(small);
    const conf = result.confidenceMasks?.[0];
    if (!conf) throw new Error('no mask');
    const data = conf.getAsFloat32Array();
    const mw = conf.width, mh = conf.height;
    const m = document.createElement('canvas');
    m.width = mw; m.height = mh;
    const mc = m.getContext('2d')!;
    const img = mc.createImageData(mw, mh);
    for (let i = 0; i < data.length; i++) {
      // Smooth step around 0.5 gives clean but soft edges.
      const v = Math.max(0, Math.min(1, (data[i] - 0.3) / 0.4));
      const a = v * v * (3 - 2 * v);
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = 255;
      img.data[i * 4 + 3] = Math.round(a * 255);
    }
    mc.putImageData(img, 0, 0);
    result.close?.();
    mctx.imageSmoothingQuality = 'high';
    mctx.filter = `blur(${Math.max(0.5, image.width / 1400)}px)`;
    mctx.drawImage(m, 0, 0, mask.width, mask.height);
    mctx.filter = 'none';
    return { mask, ok: true };
  } catch (e) {
    console.warn('Segmentation unavailable, using the full photo', e);
    mctx.fillStyle = '#fff';
    mctx.fillRect(0, 0, mask.width, mask.height);
    return { mask, ok: false };
  }
}
