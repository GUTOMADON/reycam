import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

export interface VideoJob {
  video: HTMLVideoElement;
  file: File | null;
  fps: number;
  /** Renders the frame currently shown by the video element into the returned canvas. */
  renderFrame: () => HTMLCanvasElement;
  onProgress: (pct: number) => void;
  isCancelled: () => boolean;
}

export function webCodecsAvailable(): boolean {
  return typeof (window as any).VideoEncoder === 'function' && typeof (window as any).VideoFrame === 'function';
}

async function pickVideoConfig(w: number, h: number, fps: number) {
  const VE = (window as any).VideoEncoder;
  const bitrate = Math.round(Math.min(60_000_000, Math.max(6_000_000, w * h * fps * 0.15)));
  const candidates = [
    { muxCodec: 'avc', codec: 'avc1.640034' }, { muxCodec: 'avc', codec: 'avc1.640033' }, { muxCodec: 'avc', codec: 'avc1.640028' },
    { muxCodec: 'avc', codec: 'avc1.4d0033' }, { muxCodec: 'avc', codec: 'avc1.42003e' }, { muxCodec: 'avc', codec: 'avc1.42001f' },
    { muxCodec: 'vp9', codec: 'vp09.00.51.08' }, { muxCodec: 'vp9', codec: 'vp09.00.40.08' }
  ];
  for (const c of candidates) {
    const config: any = { codec: c.codec, width: w, height: h, bitrate, framerate: fps };
    if (c.muxCodec === 'avc') config.avc = { format: 'avc' };
    try {
      const r = await VE.isConfigSupported(config);
      if (r.supported) return { config, muxCodec: c.muxCodec as 'avc' | 'vp9' };
    } catch { /* try next */ }
  }
  return null;
}

async function decodeAudio(file: File | null): Promise<AudioBuffer | null> {
  if (!file) return null;
  try {
    const ctx = new AudioContext();
    const buf = await ctx.decodeAudioData(await file.arrayBuffer());
    ctx.close().catch(() => undefined);
    return buf.length ? buf : null;
  } catch {
    return null;
  }
}

async function pickAudioConfig(sampleRate: number, channels: number) {
  const AE = (window as any).AudioEncoder;
  if (!AE) return null;
  for (const c of [{ codec: 'mp4a.40.2', mux: 'aac' }, { codec: 'opus', mux: 'opus' }]) {
    const config = { codec: c.codec, sampleRate, numberOfChannels: channels, bitrate: 192_000 };
    try {
      const r = await AE.isConfigSupported(config);
      if (r.supported) return { config, mux: c.mux as 'aac' | 'opus' };
    } catch { /* try next */ }
  }
  return null;
}

function seekTo(v: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      v.removeEventListener('seeked', done);
      const anyV = v as any;
      if (anyV.requestVideoFrameCallback) anyV.requestVideoFrameCallback(() => resolve());
      else resolve();
      window.setTimeout(resolve, 250);
    };
    v.addEventListener('seeked', done);
    v.currentTime = time;
  });
}

/**
 * Frame accurate export: every source frame is decoded, processed at full
 * resolution and encoded with its exact timestamp, so slow devices never
 * drop frames. Audio is copied from the original file.
 */
export async function exportVideoWebCodecs(job: VideoJob): Promise<Blob | null> {
  const v = job.video;
  const duration = v.duration;
  if (!duration || !isFinite(duration)) return null;
  v.pause();
  await seekTo(v, 0);
  let canvas = job.renderFrame();
  const w = canvas.width & ~1, h = canvas.height & ~1;
  const vc = await pickVideoConfig(w, h, job.fps);
  if (!vc) return null;

  const audioBuf = await decodeAudio(job.file);
  const ac = audioBuf ? await pickAudioConfig(audioBuf.sampleRate, Math.min(2, audioBuf.numberOfChannels)) : null;

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: vc.muxCodec, width: w, height: h, frameRate: job.fps },
    audio: ac && audioBuf ? { codec: ac.mux, sampleRate: audioBuf.sampleRate, numberOfChannels: Math.min(2, audioBuf.numberOfChannels) } : undefined,
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset'
  });

  let failure: any = null;
  const VE = (window as any).VideoEncoder;
  const enc = new VE({ output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta), error: (e: any) => { failure = e; } });
  enc.configure(vc.config);

  const total = Math.max(1, Math.floor(duration * job.fps));
  const frameDur = 1_000_000 / job.fps;
  const crop = document.createElement('canvas');
  crop.width = w; crop.height = h;
  const cctx = crop.getContext('2d')!;
  for (let i = 0; i < total; i++) {
    if (job.isCancelled() || failure) break;
    if (i > 0) {
      await seekTo(v, Math.min(duration - 0.001, (i + 0.5) / job.fps));
      canvas = job.renderFrame();
    }
    let src: HTMLCanvasElement = canvas;
    if (canvas.width !== w || canvas.height !== h) { cctx.drawImage(canvas, 0, 0, w, h, 0, 0, w, h); src = crop; }
    const VF = (window as any).VideoFrame;
    const frame = new VF(src, { timestamp: Math.round(i * frameDur), duration: Math.round(frameDur) });
    enc.encode(frame, { keyFrame: i % (job.fps * 2) === 0 });
    frame.close();
    while (enc.encodeQueueSize > 4) await new Promise((r) => setTimeout(r, 4));
    job.onProgress(Math.round(((i + 1) / total) * (ac ? 92 : 99)));
  }
  await enc.flush();
  enc.close();
  if (failure) throw failure;
  if (job.isCancelled()) return null;

  if (ac && audioBuf) {
    const AE = (window as any).AudioEncoder, AD = (window as any).AudioData;
    const aenc = new AE({ output: (chunk: any, meta: any) => muxer.addAudioChunk(chunk, meta), error: (e: any) => { failure = e; } });
    aenc.configure(ac.config);
    const ch = Math.min(2, audioBuf.numberOfChannels);
    const block = 1024;
    const end = Math.min(audioBuf.length, Math.floor((total / job.fps) * audioBuf.sampleRate));
    for (let off = 0; off < end; off += block) {
      const n = Math.min(block, end - off);
      const data = new Float32Array(n * ch);
      for (let c = 0; c < ch; c++) data.set(audioBuf.getChannelData(c).subarray(off, off + n), c * n);
      const ad = new AD({ format: 'f32-planar', sampleRate: audioBuf.sampleRate, numberOfFrames: n, numberOfChannels: ch, timestamp: Math.round((off / audioBuf.sampleRate) * 1_000_000), data });
      aenc.encode(ad);
      ad.close();
    }
    await aenc.flush();
    aenc.close();
    job.onProgress(99);
  }
  muxer.finalize();
  const buf = (muxer.target as ArrayBufferTarget).buffer;
  return new Blob([buf], { type: 'video/mp4' });
}
