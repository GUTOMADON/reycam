import { ADJ_KEYS, BANDS, type Recipe, type EditState } from './types';

const VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

/** Shared source transform: rotation in 90 degree steps, horizontal flip, center crop. */
const XFORM = `
uniform int u_rot;
uniform float u_flip;
uniform vec4 u_crop;
vec2 srcUV(vec2 o) {
  vec2 q = o;
  if (u_flip > 0.5) q.x = 1.0 - q.x;
  if (u_rot == 1) q = vec2(q.y, 1.0 - q.x);
  else if (u_rot == 2) q = vec2(1.0 - q.x, 1.0 - q.y);
  else if (u_rot == 3) q = vec2(1.0 - q.y, q.x);
  q.y = 1.0 - q.y;
  return u_crop.xy + q * u_crop.zw;
}`;

const BLUR_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_src;
uniform int u_fromSrc;
uniform vec2 u_texel;
${XFORM}
vec3 tap(vec2 o) {
  if (u_fromSrc == 1) return texture(u_src, srcUV(clamp(o, 0.0, 1.0))).rgb;
  return texture(u_src, clamp(o, 0.0, 1.0)).rgb;
}
void main() {
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  for (int y = -2; y <= 2; y++) {
    for (int x = -2; x <= 2; x++) {
      float w = 1.0 / (1.0 + float(x * x + y * y));
      acc += tap(v_uv + vec2(float(x), float(y)) * u_texel) * w;
      wsum += w;
    }
  }
  outColor = vec4(acc / wsum, 1.0);
}`;

const MAIN_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_src;
uniform sampler2D u_blur;
uniform sampler2D u_over;
uniform int u_hasOver;
uniform vec2 u_out;
uniform int u_plain;
${XFORM}

uniform float u_exposure, u_brightness, u_contrast, u_highlights, u_shadows, u_whites, u_blacks, u_fade;
uniform vec4 u_curve;
uniform vec3 u_lift, u_gain, u_wb;
uniform mat3 u_hueM;
uniform float u_sat, u_vib;
uniform float u_hslH[8];
uniform float u_hslS[8];
uniform float u_hslL[8];
uniform float u_hslC[8];
uniform float u_hslW[8];
uniform int u_useHsl;
uniform float u_mono, u_sepia, u_split;
uniform vec3 u_shTint, u_hiTint;
uniform vec3 u_gSh, u_gMid, u_gHi;
uniform float u_gBal;
uniform vec3 u_duoA, u_duoB;
uniform float u_duo;
uniform float u_grain, u_grainSize, u_seed;
uniform float u_vignette, u_scan, u_shift, u_vshift, u_fish;
uniform float u_sharpen, u_soft, u_clarity, u_bloom, u_smooth, u_lofi;
uniform vec3 u_bloomTint;
// LU and Gu stages
uniform vec3 u_gmap[5];
uniform int u_gmapN;
uniform float u_gmapMix, u_poster, u_thresh, u_ht, u_htMix, u_streak, u_speck, u_skinProt;
uniform float u_flash, u_grainChroma, u_grainShadow;
uniform vec2 u_flashC;
uniform float u_struct;

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32 + u_seed); return fract(p.x * p.y); }
vec3 src(vec2 o) { return texture(u_src, srcUV(clamp(o, 0.0, 1.0))).rgb; }
vec3 screenB(vec3 a, vec3 b) { return 1.0 - (1.0 - a) * (1.0 - b); }

vec3 rgb2hsl(vec3 c) {
  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
  float l = (mx + mn) * 0.5, d = mx - mn, h = 0.0, s = 0.0;
  if (d > 0.00001) {
    s = l > 0.5 ? d / (2.0 - mx - mn) : d / (mx + mn);
    if (mx == c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
    else if (mx == c.g) h = (c.b - c.r) / d + 2.0;
    else h = (c.r - c.g) / d + 4.0;
    h *= 60.0;
  }
  return vec3(h, s, l);
}
float hue2c(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0 / 6.0) return p + (q - p) * 6.0 * t;
  if (t < 0.5) return q;
  if (t < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
  return p;
}
vec3 hsl2rgb(vec3 h) {
  if (h.y <= 0.0) return vec3(h.z);
  float q = h.z < 0.5 ? h.z * (1.0 + h.y) : h.z + h.y - h.z * h.y;
  float p = 2.0 * h.z - q;
  float k = h.x / 360.0;
  return vec3(hue2c(p, q, k + 1.0 / 3.0), hue2c(p, q, k), hue2c(p, q, k - 1.0 / 3.0));
}
float bump(float x, float c) { return max(0.0, 1.0 - abs(x - c) / 0.25); }

/** Gradient map through up to 5 evenly spaced stops. */
vec3 gradientMap(float l) {
  if (u_gmapN < 2) return vec3(l);
  float x = clamp(l, 0.0, 1.0) * float(u_gmapN - 1);
  int i = int(min(floor(x), float(u_gmapN - 2)));
  vec3 a = u_gmap[0], b = u_gmap[1];
  for (int k = 0; k < 4; k++) { if (k == i) { a = u_gmap[k]; b = u_gmap[k + 1]; } }
  return mix(a, b, x - float(i));
}
/** Skin likelihood from hue, saturation and lightness (used for skin protection). */
float skinW(vec3 c) {
  vec3 hs = rgb2hsl(clamp(c, 0.0, 1.0));
  return smoothstep(2.0, 12.0, hs.x) * (1.0 - smoothstep(32.0, 45.0, hs.x)) * smoothstep(0.1, 0.22, hs.y) * (1.0 - smoothstep(0.55, 0.75, hs.y)) * smoothstep(0.3, 0.5, hs.z);
}

vec3 tone(vec3 v) {
  vec3 x = v * u_exposure;
  x += u_brightness;
  x = (x - 0.5) * u_contrast + 0.5;
  x += u_highlights * 0.25 * smoothstep(0.45, 1.0, x);
  x += u_shadows * 0.25 * (1.0 - smoothstep(0.0, 0.55, x));
  x += u_whites * 0.18 * smoothstep(0.7, 1.05, x);
  x += u_blacks * 0.14 * (1.0 - smoothstep(-0.05, 0.3, x));
  vec3 cx = clamp(x, 0.0, 1.0);
  x += 0.12 * (u_curve.x * vec3(bump(cx.r, 0.125), bump(cx.g, 0.125), bump(cx.b, 0.125))
             + u_curve.y * vec3(bump(cx.r, 0.375), bump(cx.g, 0.375), bump(cx.b, 0.375))
             + u_curve.z * vec3(bump(cx.r, 0.625), bump(cx.g, 0.625), bump(cx.b, 0.625))
             + u_curve.w * vec3(bump(cx.r, 0.875), bump(cx.g, 0.875), bump(cx.b, 0.875)));
  x = u_lift + x * (u_gain - u_lift);
  x += u_wb;
  x = u_fade * 0.22 + x * (1.0 - u_fade * 0.3);
  return x;
}

void main() {
  vec2 o = v_uv;
  vec2 px = 1.0 / u_out;
  if (u_plain == 1) { outColor = vec4(src(o), 1.0); return; }

  if (u_lofi > 0.0) {
    float cx = max(24.0, 640.0 * pow(0.06, u_lofi / 100.0));
    vec2 cells = vec2(cx, cx * u_out.y / u_out.x);
    o = (floor(o * cells) + 0.5) / cells;
  }
  if (u_fish > 0.02) {
    vec2 d = (o - 0.5) * vec2(u_out.x / max(u_out.x, u_out.y), u_out.y / max(u_out.x, u_out.y)) * 2.0;
    float r2 = dot(d, d);
    if (u_fish > 0.75 && r2 > 1.0) { outColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
    float f = 1.0 - u_fish * 0.45 * (1.0 - min(1.0, r2));
    o = 0.5 + (o - 0.5) * f;
  }

  vec3 c = src(o);
  if (u_shift > 0.0) {
    c.r = src(o + vec2(u_shift, u_vshift)).r;
    c.b = src(o - vec2(u_shift, u_vshift)).b;
  }
  if (u_soft > 0.0) {
    float r = u_soft;
    vec3 acc = c;
    for (int i = 0; i < 12; i++) {
      float a = float(i) * 0.5236;
      acc += src(o + vec2(cos(a), sin(a)) * px * r);
      acc += src(o + vec2(cos(a + 0.26), sin(a + 0.26)) * px * r * 0.5);
    }
    c = acc / 25.0;
  }
  if (u_smooth > 0.0) {
    vec3 hs = rgb2hsl(c);
    float skin = smoothstep(0.0, 8.0, hs.x) * (1.0 - smoothstep(40.0, 55.0, hs.x)) * smoothstep(0.12, 0.25, hs.y) * smoothstep(0.15, 0.3, hs.z);
    if (hs.x > 340.0) skin = smoothstep(0.12, 0.25, hs.y) * 0.6;
    vec3 acc = c; float ws = 1.0;
    float r = max(2.0, u_out.x / 420.0);
    for (int i = 0; i < 16; i++) {
      float a = float(i) * 0.3927;
      vec3 t = src(o + vec2(cos(a), sin(a)) * px * r * (1.0 + float(i % 3)));
      float w = exp(-dot(t - c, t - c) * 40.0);
      acc += t * w; ws += w;
    }
    c = mix(c, acc / ws, u_smooth * skin);
  }
  if (u_sharpen > 0.0) {
    vec2 sp = px * max(1.0, u_out.x / 1600.0);
    vec3 n = src(o + vec2(0.0, sp.y)), s = src(o - vec2(0.0, sp.y)), e = src(o + vec2(sp.x, 0.0)), w = src(o - vec2(sp.x, 0.0));
    c += u_sharpen * (4.0 * c - n - s - e - w);
  }
  vec3 bl = texture(u_blur, o).rgb;
  if (abs(u_clarity) > 0.001) {
    float l = luma(c);
    float mw = 1.0 - pow(2.0 * clamp(l, 0.0, 1.0) - 1.0, 2.0) * 0.7;
    c += (c - bl) * u_clarity * 0.9 * mw;
  }
  if (u_hasOver == 1) {
    vec3 ov = texture(u_over, vec2(o.x, 1.0 - o.y)).rgb;
    c = screenB(c, ov * 0.6);
  }

  if (u_flash > 0.0) {
    // Direct flash: brighter at the subject, falling off toward the corners.
    vec2 d = (v_uv - u_flashC) * vec2(u_out.x / max(u_out.x, u_out.y), u_out.y / max(u_out.x, u_out.y));
    float r = clamp(length(d) / 0.75, 0.0, 1.0);
    c *= exp2(u_flash * mix(0.2, -0.3, smoothstep(0.0, 1.0, r)));
  }
  float skinK = u_skinProt > 0.0 ? skinW(c) * u_skinProt : 0.0;
  c = tone(c);
  c = u_hueM * c;
  float lum = luma(c);
  if (u_sat != 1.0 || u_vib != 0.0) {
    float f = u_sat;
    if (u_vib != 0.0) {
      float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
      f += u_vib * (1.0 - clamp(mx - mn, 0.0, 1.0));
    }
    c = lum + (c - lum) * f;
  }
  if (u_useHsl == 1) {
    vec3 h = rgb2hsl(clamp(c, 0.0, 1.0));
    if (h.y > 0.0001) {
      float dH = 0.0, dS = 0.0, dL = 0.0;
      for (int i = 0; i < 8; i++) {
        float dist = abs(h.x - u_hslC[i]);
        if (dist > 180.0) dist = 360.0 - dist;
        float wgt = 1.0 - dist / u_hslW[i];
        if (wgt > 0.0) { dH += wgt * u_hslH[i]; dS += wgt * u_hslS[i]; dL += wgt * u_hslL[i]; }
      }
      float s0 = h.y;
      h.x = mod(h.x + dH + 360.0, 360.0);
      if (skinK > 0.0 && dS > 0.08) dS = mix(dS, 0.08, clamp(skinK, 0.0, 1.0));
      h.y = clamp(h.y * (1.0 + dS), 0.0, 1.0);
      h.z = clamp(h.z + dL * 0.3 * s0, 0.0, 1.0);
      c = hsl2rgb(h);
    }
    lum = luma(c);
  }
  if (u_mono > 0.0) c = mix(c, vec3(lum), u_mono);
  if (u_sepia > 0.0) c = mix(c, vec3(lum * 1.07 + 0.04, lum * 0.86 + 0.016, lum * 0.62), u_sepia);
  if (u_split > 0.0) {
    float l01 = clamp(lum, 0.0, 1.0);
    c += (u_shTint - 0.5) * u_split * (1.0 - l01) + (u_hiTint - 0.5) * u_split * l01;
  }
  {
    float l01 = clamp(lum - u_gBal * 0.25, 0.0, 1.0);
    float wS = (1.0 - l01) * (1.0 - l01), wH = l01 * l01, wM = max(0.0, 1.0 - wS - wH);
    c += u_gSh * wS + u_gMid * wM + u_gHi * wH;
  }
  if (u_duo > 0.0) {
    float l01 = clamp(luma(c), 0.0, 1.0);
    c = mix(c, mix(u_duoA, u_duoB, l01), u_duo);
  }
  if (u_gmapMix > 0.0 || u_poster > 1.5 || u_thresh > 0.0) {
    float l = clamp(luma(c), 0.0, 1.0);
    if (u_thresh > 0.0) {
      // Two inks with ordered noise dithering, like a photocopy or riso print.
      float dn = hash(floor(gl_FragCoord.xy / max(1.0, u_out.x / 1400.0))) - 0.5;
      l = smoothstep(u_thresh - 0.03, u_thresh + 0.03, l + dn * 0.22);
    } else if (u_poster > 1.5) {
      // Posterize with a short smooth edge between levels.
      float x = l * (u_poster - 1.0);
      float f = fract(x);
      l = (floor(x) + smoothstep(0.42, 0.58, f)) / (u_poster - 1.0);
    }
    vec3 gm = u_gmapN >= 2 ? gradientMap(l) : vec3(l);
    // Structural looks (threshold, posterize) blend with the original by intensity, plain maps by gmapMix.
    c = mix(c, gm, (u_thresh > 0.0 || u_poster > 1.5) ? u_struct : u_gmapMix);
  }
  if (u_ht > 0.0) {
    // Round halftone dots on a 45 degree grid; dot size follows darkness.
    float cell = max(3.0, u_ht * u_out.x / 1000.0);
    vec2 q = gl_FragCoord.xy * mat2(0.7071, -0.7071, 0.7071, 0.7071) / cell;
    vec2 f = fract(q) - 0.5;
    float l = clamp(luma(c), 0.0, 1.0);
    float rad = sqrt(1.0 - l) * 0.62;
    float dotv = 1.0 - smoothstep(rad - 0.06, rad + 0.06, length(f));
    vec3 ink = u_gmapN >= 2 ? u_gmap[0] : c * 0.35;
    vec3 paper = u_gmapN >= 2 ? mix(c, u_gmap[u_gmapN - 1], 0.35) : min(c * 1.12, vec3(1.0));
    c = mix(c, mix(paper, ink, dotv), u_htMix);
  }
  if (u_streak > 0.0) {
    float col = hash(vec2(floor(gl_FragCoord.x / max(1.0, u_out.x / 500.0)), 7.0));
    float on = step(0.975, col) * smoothstep(0.55, 0.9, luma(c));
    c = mix(c, u_gmapN >= 2 ? u_gmap[1] : c * 0.7, on * u_streak);
  }
  if (u_speck > 0.0) {
    vec2 g = floor(gl_FragCoord.xy / max(1.0, u_out.x / 900.0));
    float n = hash(g * 1.7 + 3.0);
    c = mix(c, u_gmapN >= 2 ? u_gmap[0] : vec3(0.1), step(1.0 - u_speck * 0.02, n));
    c *= 1.0 - (hash(g + 11.0) - 0.5) * 0.08 * u_speck;
  }
  if (u_bloom > 0.0) {
    vec3 b = tone(bl) * 1.15 * u_bloomTint;
    c = mix(c, screenB(clamp(c, 0.0, 1.0), clamp(b, 0.0, 1.0)), u_bloom * 0.55);
  }
  if (u_grain > 0.0) {
    vec2 g = floor(gl_FragCoord.xy / max(1.0, u_grainSize));
    float n = (hash(g) + hash(g + 17.0) + hash(g + 41.0) - 1.5) / 1.5;
    float sw = 1.0 + u_grainShadow * (1.0 - clamp(luma(c), 0.0, 1.0));
    c += n * u_grain * sw;
    if (u_grainChroma > 0.0) c += (vec3(hash(g + 3.1), hash(g + 7.3), hash(g + 11.7)) - 0.5) * u_grain * u_grainChroma * 1.4;
  }
  float f2 = 1.0;
  if (u_scan > 0.0 && mod(floor(gl_FragCoord.y), 3.0) < 1.0) f2 = 1.0 - u_scan * 0.45;
  if (abs(u_vignette) > 0.001) {
    vec2 d = v_uv - 0.5;
    float r = length(d) / 0.7071;
    f2 *= 1.0 - u_vignette * 0.85 * smoothstep(0.35, 1.0, r);
  }
  c *= f2;
  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

export type Source = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageBitmap;

function hueVec(deg: number): [number, number, number] {
  const h = (deg * Math.PI) / 180;
  return [Math.cos(h) * 0.5, Math.cos(h - 2.0944) * 0.5, Math.cos(h + 2.0944) * 0.5];
}

/** Effective parameters: recipe scaled by intensity plus user edits. */
export function effectiveParams(recipe: Recipe, edit: EditState, plain: boolean): Record<string, number> {
  const t = plain ? 0 : edit.intensity / 100;
  const P: Record<string, number> = {};
  const hueKeys: Record<string, 1> = { gShH: 1, gMidH: 1, gHiH: 1 };
  const all: string[] = [...ADJ_KEYS];
  BANDS.forEach((b) => { all.push('hsl_' + b.id + '_h', 'hsl_' + b.id + '_s', 'hsl_' + b.id + '_l'); });
  for (const k of all) {
    if (plain) { P[k] = 0; continue; }
    if (hueKeys[k]) { P[k] = edit.adj[k] ? edit.adj[k] : (recipe[k] || 0); continue; }
    P[k] = (recipe[k] || 0) * t + (edit.adj[k] || 0);
  }
  // Quick adjustments of the look (LU and Gu): each range adds its mapped amounts.
  if (!plain && recipe.quick) {
    for (const q of recipe.quick) {
      const v = edit.quick?.[q.id] ?? 0;
      if (q.kind === 'choice') { P['choice_' + q.id] = v; continue; }
      if (q.kind === 'shuffle') { P.sparkleSeed = v; continue; }
      if (!v || !q.map) continue;
      for (const [k, amt] of Object.entries(q.map)) P[k] = (P[k] || 0) + (amt * v) / 100;
    }
  }
  const dz = P.dehaze / 100;
  if (dz !== 0) {
    P.contrast += dz * 25;
    P.saturation += dz * 18;
    P.blacks -= dz * 30;
    if (dz < 0) P.fade += -dz * 40;
  }
  return P;
}

export class GLRenderer {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  private main: WebGLProgram;
  private blur: WebGLProgram;
  private srcTex: WebGLTexture;
  private overTex: WebGLTexture;
  private fbo: { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number }[] = [];
  private uniCache = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
  maxSize: number;
  private lastSource: Source | null = null;
  private hasOverlay = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    const gl = this.canvas.getContext('webgl2', { preserveDrawingBuffer: false, premultipliedAlpha: false, antialias: false, powerPreference: 'high-performance', depth: false, stencil: false });
    if (!gl) throw new Error('WebGL2 is not available on this device');
    this.gl = gl;
    this.main = this.program(VERT, MAIN_FRAG);
    this.blur = this.program(VERT, BLUR_FRAG);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    for (const p of [this.main, this.blur]) {
      const loc = gl.getAttribLocation(p, 'a_pos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }
    this.srcTex = this.texture();
    this.overTex = this.texture();
    this.maxSize = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), 16384);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  }

  private program(vs: string, fs: string): WebGLProgram {
    const gl = this.gl;
    const mk = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader error');
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'a_pos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link error');
    return p;
  }

  private texture(): WebGLTexture {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    return t;
  }

  private u(p: WebGLProgram, name: string) {
    let m = this.uniCache.get(p);
    if (!m) { m = new Map(); this.uniCache.set(p, m); }
    if (!m.has(name)) m.set(name, this.gl.getUniformLocation(p, name));
    return m.get(name)!;
  }

  private ensureFbo(i: number, w: number, h: number) {
    const gl = this.gl;
    let f = this.fbo[i];
    if (f && f.w === w && f.h === h) return f;
    if (!f) {
      const tex = this.texture();
      const fb = gl.createFramebuffer()!;
      f = { fb, tex, w: 0, h: 0 };
      this.fbo[i] = f;
    }
    gl.bindTexture(gl.TEXTURE_2D, f.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, f.tex, 0);
    f.w = w; f.h = h;
    return f;
  }

  /** Upload a new frame. Images upload once, video uploads every call. */
  setSource(src: Source, force = false) {
    const gl = this.gl;
    if (!force && src === this.lastSource && !(src instanceof HTMLVideoElement)) return;
    // A video element without a decoded frame (loading or switching source) cannot be uploaded.
    if (src instanceof HTMLVideoElement && (src.readyState < 2 || !src.videoWidth)) return;
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src as any);
    this.lastSource = src;
  }

  setOverlay(img: Source | null) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.overTex);
    if (img) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img as any);
    this.hasOverlay = !!img;
  }

  /**
   * Render the processed image into this.canvas at w by h.
   * crop is in normalized source coordinates after rotation (x, y, w, h).
   */
  render(w: number, h: number, crop: [number, number, number, number], rotSteps: number, flip: boolean, P: Record<string, number>, recipe: Recipe, plain: boolean, seed: number, intensity = 1) {
    const gl = this.gl;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    const t = plain ? 0 : Math.max(0, intensity);
    const xform = (p: WebGLProgram) => {
      gl.uniform1i(this.u(p, 'u_rot'), rotSteps);
      gl.uniform1f(this.u(p, 'u_flip'), flip ? 1 : 0);
      gl.uniform4f(this.u(p, 'u_crop'), crop[0], crop[1], crop[2], crop[3]);
    };

    let blurTexture = this.srcTex;
    if (!plain && (Math.abs(P.clarity) > 0.001 || P.bloom > 0)) {
      const bw = Math.max(16, Math.round(w / 6)), bh = Math.max(16, Math.round(h / 6));
      const a = this.ensureFbo(0, bw, bh);
      const b = this.ensureFbo(1, bw, bh);
      gl.useProgram(this.blur);
      xform(this.blur);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(this.u(this.blur, 'u_src'), 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, a.fb);
      gl.viewport(0, 0, bw, bh);
      gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
      gl.uniform1i(this.u(this.blur, 'u_fromSrc'), 1);
      gl.uniform2f(this.u(this.blur, 'u_texel'), 1.5 / bw, 1.5 / bh);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, b.fb);
      gl.bindTexture(gl.TEXTURE_2D, a.tex);
      gl.uniform1i(this.u(this.blur, 'u_fromSrc'), 0);
      gl.uniform2f(this.u(this.blur, 'u_texel'), 2.0 / bw, 2.0 / bh);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      blurTexture = b.tex;
    }

    const p = this.main;
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    xform(p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.srcTex); gl.uniform1i(this.u(p, 'u_src'), 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, blurTexture); gl.uniform1i(this.u(p, 'u_blur'), 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.overTex); gl.uniform1i(this.u(p, 'u_over'), 2);
    gl.uniform1i(this.u(p, 'u_hasOver'), this.hasOverlay && !plain ? 1 : 0);
    gl.uniform2f(this.u(p, 'u_out'), w, h);
    gl.uniform1i(this.u(p, 'u_plain'), plain ? 1 : 0);

    const f1 = (n: string, v: number) => gl.uniform1f(this.u(p, n), v);
    const f3 = (n: string, v: number[]) => gl.uniform3f(this.u(p, n), v[0], v[1], v[2]);
    const scale = Math.max(w, h) / 1600;
    f1('u_exposure', Math.pow(2, P.exposure / 60));
    f1('u_brightness', (P.brightness / 100) * 0.25);
    f1('u_contrast', 1 + P.contrast / 100);
    f1('u_highlights', P.highlights / 100);
    f1('u_shadows', P.shadows / 100);
    f1('u_whites', P.whites / 100);
    f1('u_blacks', P.blacks / 100);
    f1('u_fade', Math.max(0, P.fade) / 100);
    gl.uniform4f(this.u(p, 'u_curve'), P.curveShadows / 100, P.curveDarks / 100, P.curveLights / 100, P.curveHighlights / 100);
    f3('u_lift', recipe.lift ? recipe.lift.map((v) => v * t) : [0, 0, 0]);
    f3('u_gain', recipe.gain ? recipe.gain.map((v) => 1 + (v - 1) * t) : [1, 1, 1]);
    const temp = P.temperature / 100, tint = P.tint / 100;
    f3('u_wb', [temp * 0.08, -tint * 0.06, -temp * 0.08]);
    let hm = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    if (Math.abs(P.hue) > 0.5) {
      const an = (P.hue * Math.PI) / 180, cA = Math.cos(an), sA = Math.sin(an);
      const r = [
        0.213 + cA * 0.787 - sA * 0.213, 0.715 - cA * 0.715 - sA * 0.715, 0.072 - cA * 0.072 + sA * 0.928,
        0.213 - cA * 0.213 + sA * 0.143, 0.715 + cA * 0.285 + sA * 0.14, 0.072 - cA * 0.072 - sA * 0.283,
        0.213 - cA * 0.213 - sA * 0.787, 0.715 - cA * 0.715 + sA * 0.715, 0.072 + cA * 0.928 + sA * 0.072
      ];
      hm = [r[0], r[3], r[6], r[1], r[4], r[7], r[2], r[5], r[8]];
    }
    gl.uniformMatrix3fv(this.u(p, 'u_hueM'), false, new Float32Array(hm));
    f1('u_sat', 1 + P.saturation / 100);
    f1('u_vib', P.vibrance / 100);
    const H: number[] = [], S: number[] = [], L: number[] = [], C: number[] = [], W: number[] = [];
    let useHsl = 0;
    BANDS.forEach((bd) => {
      const hh = P['hsl_' + bd.id + '_h'] || 0, ss = P['hsl_' + bd.id + '_s'] || 0, ll = P['hsl_' + bd.id + '_l'] || 0;
      if (hh || ss || ll) useHsl = 1;
      H.push(hh * 0.3); S.push(ss / 100); L.push(ll / 100); C.push(bd.c); W.push(bd.w);
    });
    gl.uniform1fv(this.u(p, 'u_hslH[0]'), H);
    gl.uniform1fv(this.u(p, 'u_hslS[0]'), S);
    gl.uniform1fv(this.u(p, 'u_hslL[0]'), L);
    gl.uniform1fv(this.u(p, 'u_hslC[0]'), C);
    gl.uniform1fv(this.u(p, 'u_hslW[0]'), W);
    gl.uniform1i(this.u(p, 'u_useHsl'), useHsl);
    f1('u_mono', recipe.mono ? t : 0);
    f1('u_sepia', recipe.sepia ? t : 0);
    f1('u_split', (recipe.split || 0) * t);
    f3('u_shTint', (recipe.shadowTint || [128, 128, 128]).map((v) => v / 255));
    f3('u_hiTint', (recipe.hiTint || [128, 128, 128]).map((v) => v / 255));
    const g = (hueKey: string, satKey: string, k: number) => hueVec(P[hueKey]).map((v) => (v * (P[satKey] / 100) * k) / 255);
    f3('u_gSh', g('gShH', 'gShS', 70));
    f3('u_gMid', g('gMidH', 'gMidS', 60));
    f3('u_gHi', g('gHiH', 'gHiS', 70));
    f1('u_gBal', P.gBal / 100);
    if (recipe.duotone) {
      f3('u_duoA', recipe.duotone[0].map((v) => v / 255));
      f3('u_duoB', recipe.duotone[1].map((v) => v / 255));
      f1('u_duo', (recipe.duoAmount ?? 1) * t);
    } else f1('u_duo', 0);
    f1('u_grain', (Math.max(0, P.grain) / 100) * 0.235);
    f1('u_grainSize', Math.max(1, (1 + (P.grainSize || 0) / 25) * Math.max(1, scale)));
    f1('u_seed', seed);
    f1('u_vignette', P.vignette / 100);
    f1('u_scan', Math.max(0, P.scanlines) / 100);
    const prism = ((recipe.prism || 0) / 100) * t, ana = ((recipe.anaglyph || 0) / 100) * t;
    const shiftPx = (Math.max(0, P.chroma) / 100) * w / 160 + (prism * w) / 60 + (ana * w) / 45;
    f1('u_shift', shiftPx / w);
    f1('u_vshift', (prism * h) / 90 / h);
    f1('u_fish', ((recipe.fisheye || 0) / 100) * t);
    f1('u_sharpen', (Math.max(0, P.sharpen) / 100) * 0.6);
    f1('u_soft', P.softness > 0 ? (P.softness / 100) * (w / 260) * 2 : 0);
    f1('u_clarity', P.clarity / 100);
    f1('u_bloom', Math.max(0, P.bloom) / 100);
    f3('u_bloomTint', (recipe.bloomTint || [255, 255, 255]).map((v) => v / 255));
    f1('u_smooth', Math.max(0, P.smoothSkin) / 100);
    f1('u_lofi', Math.max(0, P.lofi));
    // LU and Gu stages
    // A palette quick adjustment can swap the gradient map for one of the alternates.
    const gm = (P.choice_palette > 0 && recipe.gmapAlts?.[P.choice_palette - 1]) || recipe.gmap || [];
    const stops: number[] = [];
    for (let k = 0; k < 5; k++) { const c = gm[Math.min(k, Math.max(0, gm.length - 1))] || [0, 0, 0]; stops.push(c[0] / 255, c[1] / 255, c[2] / 255); }
    gl.uniform3fv(this.u(p, 'u_gmap[0]'), new Float32Array(stops));
    gl.uniform1i(this.u(p, 'u_gmapN'), Math.min(5, gm.length));
    f1('u_gmapMix', Math.max(0, Math.min(1, (P.gmapMix || 0) / 100)));
    const tt = Math.max(t, 0.01);
    const levels = Math.round((P.poster || 0) / tt);
    f1('u_poster', t > 0 && levels >= 2 ? levels : 0);
    f1('u_thresh', P.thresh > 0 && t > 0 ? Math.max(0.05, Math.min(0.95, P.thresh / tt / 100)) : 0);
    f1('u_struct', t);
    f1('u_ht', (P.halftone || 0) > 0 && t > 0 ? P.halftone / tt : 0);
    f1('u_htMix', Math.max(0, Math.min(1, (P.htMix || 0) / 100)));
    f1('u_streak', Math.max(0, (P.streak || 0) / 100));
    f1('u_speck', Math.max(0, (P.speck || 0) / 100));
    f1('u_skinProt', Math.max(0, Math.min(1, (P.skinProt || 0) / 100)));
    f1('u_flash', Math.max(0, (P.flash || 0) / 100));
    gl.uniform2f(this.u(p, 'u_flashC'), P.flashX ?? 0.5, 1 - (P.flashY ?? 0.42));
    f1('u_grainChroma', Math.max(0, (P.grainChroma || 0) / 100));
    f1('u_grainShadow', Math.max(0, (P.grainShadow || 0) / 100));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
