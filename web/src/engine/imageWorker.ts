type DecodeRequest = {
  id: number;
  file: File;
  maxPreviewEdge: number;
};

type DecodeResult = {
  id: number;
  full?: ImageBitmap;
  preview?: ImageBitmap | null;
  thumbnail?: ImageBitmap | null;
  error?: true;
};

async function makeScaledBitmap(source: ImageBitmap, maxEdge: number): Promise<ImageBitmap | null> {
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  if (scale >= 1) return null;
  return createImageBitmap(source, {
    resizeWidth: Math.max(1, Math.round(source.width * scale)),
    resizeHeight: Math.max(1, Math.round(source.height * scale)),
    resizeQuality: 'high'
  });
}

self.onmessage = async (event: MessageEvent<DecodeRequest>) => {
  const { id, file, maxPreviewEdge } = event.data;
  let full: ImageBitmap | null = null;
  let preview: ImageBitmap | null = null;
  let thumbnail: ImageBitmap | null = null;
  try {
    full = await createImageBitmap(file, { imageOrientation: 'from-image' });
    preview = await makeScaledBitmap(full, maxPreviewEdge);
    thumbnail = await makeScaledBitmap(preview || full, 180);
  } catch {
    full?.close();
    preview?.close();
    thumbnail?.close();
    self.postMessage({ id, error: true } satisfies DecodeResult);
    return;
  }

  const result: DecodeResult = { id, full, preview, thumbnail };
  const transfer: Transferable[] = [full];
  if (preview) transfer.push(preview);
  if (thumbnail) transfer.push(thumbnail);
  self.postMessage(result, { transfer });
};
