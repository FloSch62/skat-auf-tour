// Code-painted backdrops in the adventure raster (contract §9: 640×360, drawn 3× on the 1920×1080 backing store).
// Until the painted Krea art arrives, every screen can paint a simple scene here: flat cel colours from the palette,
// dark ink contours, no anti-aliasing. Scenes are painted once into an offscreen canvas and cached.
//
// Px paints into its own 32-bit pixel buffer (fast per-pixel work: dithers, textures, palette-aware relighting) and
// writes it to the canvas once at the end (`flush`, done by `paintedScene`).
import { P } from "../../core/palette";
import { Rng } from "../../core/rng";

export const SW = 640;
export const SH = 360;

/** An ordered-dither fill: colour `b` where the 4×4 Bayer threshold is below q/16, else `a` (-1 = keep). */
export class Dither {
  constructor(
    readonly a: number,
    readonly b: number,
    readonly q: number,
  ) {}
}

/** A flat palette colour ("#rrggbb") or an ordered dither made by `Px.pat`. */
export type Fill = string | Dither;
export type Pt = [number, number];

const cache = new Map<string, HTMLCanvasElement>();

/** A cached 640×360 canvas painted by `paint`; draw it with `g.pixelScene(canvas)`. */
export function paintedScene(key: string, paint: (p: Px) => void, w = SW, h = SH): HTMLCanvasElement | null {
  let c = cache.get(key);
  if (c) return c;
  if (typeof document === "undefined") return null;
  c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  const px = new Px(ctx, w, h, key);
  paint(px);
  px.flush();
  cache.set(key, c);
  return c;
}

/** Drop cached paintings (dev gallery: repaint after code changes or to time a painter). */
export function forgetPainted(key?: string) {
  if (key === undefined) cache.clear();
  else cache.delete(key);
}

// 4×4 Bayer thresholds, shared by every dither so neighbouring areas line up.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// Colours as little-endian RGBA words (ImageData byte order).
const WORD = new Map<string, number>();
function word(hex: string): number {
  let v = WORD.get(hex);
  if (v === undefined) {
    const n = parseInt(hex.slice(1, 7), 16);
    v = (0xff000000 | ((n & 0xff) << 16) | (n & 0xff00) | ((n >> 16) & 0xff)) >>> 0;
    WORD.set(hex, v);
  }
  return v;
}

/** The buffer word of a palette colour (for fast comparisons with `Px.get`). */
export function colourWord(hex: string): number {
  return word(hex);
}

// Palette ramps for palette-aware relighting: each colour word knows its ramp and step.
const RAMP_OF = new Map<number, { ramp: number[]; i: number }>();
{
  const ramps = new Map<string, number[]>();
  for (const [k, v] of Object.entries(P)) {
    const name = k.replace(/\d+$/, "");
    if (!ramps.has(name)) ramps.set(name, []);
    ramps.get(name)!.push(word(v));
  }
  for (const ramp of ramps.values()) ramp.forEach((wd, i) => RAMP_OF.set(wd, { ramp, i }));
}

/** Pixel painter: integer rects, scanline fills, no anti-aliasing, into a 32-bit buffer. */
export class Px {
  readonly rng: Rng;
  /** The pixels, little-endian RGBA words, row-major. */
  readonly buf: Uint32Array;
  private clipR: [number, number, number, number];
  private clipStack: [number, number, number, number][] = [];
  constructor(readonly c: CanvasRenderingContext2D, readonly w: number, readonly h: number, seed = "px") {
    this.rng = new Rng(seed);
    this.buf = new Uint32Array(w * h);
    this.clipR = [0, 0, w, h];
  }

  /** Write the buffer to the canvas. */
  flush() {
    const img = new ImageData(new Uint8ClampedArray(this.buf.buffer as ArrayBuffer, this.buf.byteOffset, this.buf.byteLength), this.w, this.h);
    this.c.putImageData(img, 0, 0);
  }

  /** Paint inside a clip rectangle only. */
  clip(x: number, y: number, w: number, h: number, fn: () => void) {
    const [a, b, c, d] = this.clipR;
    this.clipStack.push(this.clipR);
    this.clipR = [Math.max(a, Math.round(x)), Math.max(b, Math.round(y)), Math.min(c, Math.round(x + w)), Math.min(d, Math.round(y + h))];
    try {
      fn();
    } finally {
      this.clipR = this.clipStack.pop()!;
    }
  }

  /** Paint inside a polygon only (e.g. a view through a window seen at an angle). */
  within(pts: Pt[], fn: () => void) {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [x, y] of pts) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    x0 = Math.max(0, Math.floor(x0));
    y0 = Math.max(0, Math.floor(y0));
    x1 = Math.min(this.w, Math.ceil(x1) + 1);
    y1 = Math.min(this.h, Math.ceil(y1) + 1);
    if (x1 <= x0 || y1 <= y0) return;
    const bw = x1 - x0;
    const saved = new Uint32Array(bw * (y1 - y0));
    for (let y = y0; y < y1; y++) saved.set(this.buf.subarray(y * this.w + x0, y * this.w + x1), (y - y0) * bw);
    const mask = new Uint8Array(bw * (y1 - y0));
    this.spans(pts, (y, a, b) => {
      if (y < y0 || y >= y1) return;
      for (let x = Math.max(a, x0); x < Math.min(b, x1); x++) mask[(y - y0) * bw + (x - x0)] = 1;
    });
    this.clip(x0, y0, bw, y1 - y0, fn);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y - y0) * bw + (x - x0);
        if (!mask[i]) this.buf[y * this.w + x] = saved[i];
      }
    }
  }

  /** The colour word at a pixel (0 = transparent / outside). */
  get(x: number, y: number): number {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.buf[y * this.w + x];
  }

  /** Whether the pixel has one of the given palette colours. */
  is(x: number, y: number, ...cols: string[]): boolean {
    const v = this.get(x, y);
    for (const c of cols) if (word(c) === v) return true;
    return false;
  }

  rect(x: number, y: number, w: number, h: number, col: Fill) {
    if (w <= 0 || h <= 0) return;
    let x0 = Math.round(x);
    let y0 = Math.round(y);
    let x1 = x0 + Math.round(w);
    let y1 = y0 + Math.round(h);
    const [cx0, cy0, cx1, cy1] = this.clipR;
    if (x0 < cx0) x0 = cx0;
    if (y0 < cy0) y0 = cy0;
    if (x1 > cx1) x1 = cx1;
    if (y1 > cy1) y1 = cy1;
    if (x1 <= x0 || y1 <= y0) return;
    const buf = this.buf;
    const W = this.w;
    if (typeof col === "string") {
      const v = word(col);
      for (let yy = y0; yy < y1; yy++) buf.fill(v, yy * W + x0, yy * W + x1);
      return;
    }
    const { a, b, q } = col;
    for (let yy = y0; yy < y1; yy++) {
      const row = (yy & 3) << 2;
      let o = yy * W + x0;
      for (let xx = x0; xx < x1; xx++, o++) {
        if (BAYER[row | (xx & 3)] < q) buf[o] = b;
        else if (a >= 0) buf[o] = a;
      }
    }
  }

  px(x: number, y: number, col: Fill) {
    this.rect(x, y, 1, 1, col);
  }

  /** Rectangle with a 1-px ink contour. */
  box(x: number, y: number, w: number, h: number, fill: Fill, ink: string = P.ink0) {
    this.rect(x, y, w, h, ink);
    this.rect(x + 1, y + 1, w - 2, h - 2, fill);
  }

  /** Vertical bands of colours (skies, walls). */
  bands(x: number, y: number, w: number, h: number, cols: Fill[]) {
    const n = cols.length;
    for (let i = 0; i < n; i++) {
      const y0 = y + Math.round((h * i) / n);
      const y1 = y + Math.round((h * (i + 1)) / n);
      this.rect(x, y0, w, y1 - y0, cols[i]);
    }
  }

  /** Two-colour ordered dither between bands (soft transitions without new colours). */
  dither(x: number, y: number, w: number, h: number, a: string, b: string, density = 0.5) {
    const M = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const t = (M[((j & 3) << 2) | (i & 3)] + 0.5) / 16;
        this.px(x + i, y + j, t < density ? b : a);
      }
    }
  }

  /**
   * An ordered-dither fill anchored to the picture origin: `b` where the Bayer threshold is below `density`,
   * otherwise `a` (null = leave the pixels underneath). Use it as a fill for rect, poly, ellipse, shape.
   */
  pat(a: string | null, b: string, density = 0.5): Fill {
    const q = Math.max(0, Math.min(16, Math.round(density * 16)));
    if (q === 0 && a) return a;
    if (q === 16) return b;
    return new Dither(a ? word(a) : -1, word(b), q);
  }

  /** Dithered rectangle (aligned to the picture). */
  dith(x: number, y: number, w: number, h: number, a: string | null, b: string, density = 0.5) {
    this.rect(x, y, w, h, this.pat(a, b, density));
  }

  /**
   * Vertical gradient through palette colours: solid bands with dithered seams of `seam` rows between them.
   * `stops` (0…1, one per colour) place the band centres; default evenly spaced.
   */
  grad(x: number, y: number, w: number, h: number, cols: string[], seam = 8, stops?: number[]) {
    const n = cols.length;
    if (n === 1) return this.rect(x, y, w, h, cols[0]);
    const at = stops ?? cols.map((_, i) => i / (n - 1));
    for (let j = 0; j < h; j++) {
      const t = (j + 0.5) / h;
      let k = 0;
      while (k < n - 2 && t > at[k + 1]) k++;
      const mid = (at[k] + at[k + 1]) / 2;
      const half = seam / 2 / h;
      let d = (t - (mid - half)) / (2 * half || 1);
      d = Math.max(0, Math.min(1, d));
      this.rect(x, y + j, w, 1, this.pat(cols[k], cols[k + 1], d));
    }
  }

  /** Horizontal gradient (left → right) through palette colours with dithered seams. */
  hgrad(x: number, y: number, w: number, h: number, cols: string[], seam = 8) {
    const n = cols.length;
    for (let i = 0; i < w; i++) {
      const t = ((i + 0.5) / w) * (n - 1);
      const k = Math.min(n - 2, Math.floor(t));
      const f = t - k;
      const half = seam / 2 / (w / (n - 1));
      const d = Math.max(0, Math.min(1, (f - (0.5 - half)) / (2 * half || 1)));
      this.rect(x + i, y, 1, h, this.pat(cols[k], cols[k + 1], d));
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, col: Fill, t = 1) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    const o = Math.floor(t / 2);
    for (let guard = 0; guard < 4000; guard++) {
      this.rect(x0 - o, y0 - o, t, t, col);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** Polyline through points. */
  path(pts: Pt[], col: Fill, t = 1) {
    for (let i = 0; i + 1 < pts.length; i++) this.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col, t);
  }

  /** Filled ellipse by scanlines. */
  ellipse(cx: number, cy: number, rx: number, ry: number, col: Fill) {
    for (let y = -ry; y <= ry; y++) {
      const k = 1 - (y * y) / (ry * ry + 0.25);
      if (k < 0) continue;
      const hw = Math.round(rx * Math.sqrt(k));
      this.rect(cx - hw, cy + y, hw * 2 + 1, 1, col);
    }
  }

  /** Ellipse with a 1-px contour. */
  oval(cx: number, cy: number, rx: number, ry: number, fill: Fill, ink: string = P.ink0) {
    this.ellipse(cx, cy, rx + 1, ry + 1, ink);
    this.ellipse(cx, cy, rx, ry, fill);
  }

  /** Scanline spans of a polygon (even-odd): calls `fn(y, x0, x1)` for every filled run [x0, x1). */
  spans(pts: Pt[], fn: (y: number, x0: number, x1: number) => void) {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of pts) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    minY = Math.max(minY, -1);
    maxY = Math.min(maxY, this.h + 1);
    const xs: number[] = [];
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      xs.length = 0;
      const sy = y + 0.5;
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % pts.length];
        if ((y0 <= sy && y1 > sy) || (y1 <= sy && y0 > sy)) xs.push(x0 + ((sy - y0) / (y1 - y0)) * (x1 - x0));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const a = Math.round(xs[i]);
        const b = Math.round(xs[i + 1]);
        if (b > a) fn(y, a, b);
      }
    }
  }

  /** Filled polygon by even-odd scanlines (integer vertices). */
  poly(pts: Pt[], col: Fill) {
    this.spans(pts, (y, a, b) => this.rect(a, y, b - a, 1, col));
  }

  /** Polygon with a 1-px contour (drawn as the outline of the fill). */
  shape(pts: Pt[], fill: Fill, ink: string = P.ink0) {
    this.poly(pts, fill);
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      this.line(x0, y0, x1, y1, ink);
    }
  }

  /** Fill a polygon pixel by pixel from `fn(x, y)` (a palette colour or null to leave the pixel). */
  texture(pts: Pt[], fn: (x: number, y: number) => string | null) {
    const W = this.w;
    const [cx0, cy0, cx1, cy1] = this.clipR;
    let lastC = "";
    let lastW = 0;
    this.spans(pts, (y, a, b) => {
      if (y < cy0 || y >= cy1) return;
      for (let x = Math.max(a, cx0); x < Math.min(b, cx1); x++) {
        const c = fn(x, y);
        if (!c) continue;
        if (c !== lastC) {
          lastC = c;
          lastW = word(c);
        }
        this.buf[y * W + x] = lastW;
      }
    });
  }

  /** Scattered single pixels (leaves, grass, gravel), seeded. */
  speckle(x: number, y: number, w: number, h: number, cols: string[], n: number) {
    for (let i = 0; i < n; i++) this.px(x + this.rng.int(0, w - 1), y + this.rng.int(0, h - 1), this.rng.pick(cols));
  }

  // ─── palette-aware light and shade ────────────────────────────────────────────────────────────────────

  /**
   * Shift every palette pixel in the rectangle along its own ramp by `level(x, y)` steps (positive = lighter,
   * negative = darker). Fractions are dithered with the Bayer matrix, so light pools and shadows get soft but
   * crisp edges without leaving the Leitpalette.
   */
  relight(x0: number, y0: number, w: number, h: number, level: (x: number, y: number) => number) {
    const [cx0, cy0, cx1, cy1] = this.clipR;
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    const x1 = Math.min(cx1, Math.round(x0 + w));
    const y1 = Math.min(cy1, Math.round(y0 + h));
    x0 = Math.max(cx0, x0);
    y0 = Math.max(cy0, y0);
    const buf = this.buf;
    const W = this.w;
    let lastKey = -1;
    let last: { ramp: number[]; i: number } | undefined;
    for (let y = y0; y < y1; y++) {
      const row = (y & 3) << 2;
      let o = y * W + x0;
      for (let x = x0; x < x1; x++, o++) {
        const v = level(x, y);
        if (!v) continue;
        const n = Math.floor(v + (BAYER[row | (x & 3)] + 0.5) / 16);
        if (!n) continue;
        const key = buf[o];
        if (key !== lastKey) {
          lastKey = key;
          last = RAMP_OF.get(key);
        }
        if (!last) continue;
        buf[o] = last.ramp[Math.max(0, Math.min(last.ramp.length - 1, last.i + n))];
      }
    }
  }

  /**
   * A pool of light (or shade, with negative `steps`): strongest in the centre, falling off to the ellipse rim.
   * `seam` 0…1 is how wide the dithered transition between steps is (1 = smooth ramp, 0.3 = cel bands).
   */
  light(cx: number, cy: number, rx: number, ry: number, steps = 1, seam = 0.5) {
    const s = Math.abs(steps);
    const sign = Math.sign(steps);
    const irx = 1 / rx;
    const iry = 1 / ry;
    this.relight(cx - rx, cy - ry, rx * 2 + 1, ry * 2 + 1, (x, y) => {
      const dx = (x - cx) * irx;
      const dy = (y - cy) * iry;
      const q = dx * dx + dy * dy;
      if (q >= 1) return 0;
      return sign * celRamp((1 - Math.sqrt(q)) * s, seam);
    });
  }

  /** Shift a polygon area by `steps` (negative = shadow). */
  shade(pts: Pt[], steps = -1) {
    this.spans(pts, (y, a, b) => this.relight(a, y, b - a, 1, () => steps));
  }

  /** Shift a rectangle by `steps`. */
  shadeRect(x: number, y: number, w: number, h: number, steps = -1) {
    this.relight(x, y, w, h, () => steps);
  }

  /**
   * Darken toward the picture edges (an elliptical vignette): `steps` at the corners, nothing inside the inner
   * ellipse of relative size `inner`. Optional centre offset in pixels.
   */
  vignette(steps = -1, inner = 0.7, ox = 0, oy = 0) {
    const cx = this.w / 2 + ox;
    const cy = this.h / 2 + oy;
    const iw = 2 / this.w;
    const ih = 2 / this.h;
    this.relight(0, 0, this.w, this.h, (x, y) => {
      const dx = (x - cx) * iw;
      const dy = (y - cy) * ih;
      const q = (dx * dx + dy * dy) * 0.5;
      if (q <= inner * inner) return 0;
      return steps * Math.min(1, (Math.sqrt(q) - inner) / (1 - inner));
    });
  }

  // ─── objects shared by many scenes ────────────────────────────────────────────────────────────────────

  /** A simple cel tree: trunk and a round crown with shade and light. */
  tree(x: number, y: number, r: number, crown: string[] = [P.forest1, P.forest2, P.forest3]) {
    this.box(x - 2, y - r, 5, r + 2, P.wood1);
    this.oval(x, y - r - r * 0.6, r, Math.round(r * 0.85), crown[1]);
    this.ellipse(x + Math.round(r * 0.25), y - r - Math.round(r * 0.4), Math.round(r * 0.7), Math.round(r * 0.55), crown[0]);
    this.ellipse(x - Math.round(r * 0.3), y - r - Math.round(r * 0.9), Math.round(r * 0.45), Math.round(r * 0.35), crown[2]);
  }

  /** A fir tree (Schwarzwald). */
  fir(x: number, y: number, h: number) {
    this.rect(x - 1, y - 4, 3, 5, P.wood0);
    const tiers = 4;
    for (let i = 0; i < tiers; i++) {
      const ty = y - 4 - Math.round((h * i) / tiers);
      const hw = Math.round((h / 2.6) * (1 - i / (tiers + 0.5)));
      this.shape([[x - hw, ty], [x + hw, ty], [x, ty - Math.round(h / 2.2)]], i % 2 ? P.forest1 : P.forest0);
    }
  }

  /**
   * The cream alcove camper with the orange-brown stripe, side view to the right (≈ 120×62 at scale 1): the alcove
   * over the cab, curtained windows (warmly lit with `lit`), roof vent and ladder, the motorcycle on the rear rack.
   */
  camper(x: number, y: number, scale = 1, bike = true, lit = false) {
    const s = (v: number) => Math.round(v * scale);
    const X = (v: number) => x + s(v);
    const Y = (v: number) => y + s(v);
    const ink = P.ink0;
    // body and alcove (rounded alcove nose)
    this.shape([[X(4), Y(20)], [X(70), Y(20)], [X(70), Y(4)], [X(104), Y(4)], [X(110), Y(7)], [X(113), Y(12)], [X(113), Y(16)], [X(118), Y(30)], [X(118), Y(50)], [X(4), Y(50)]], P.paper3, ink);
    this.shape([[X(4), Y(20)], [X(4), Y(50)], [X(70), Y(50)], [X(70), Y(20)]], P.paper3, ink);
    // light from the left: lit top edges, shaded lower body and alcove underside
    this.rect(X(5), Y(21), s(64), 1, P.paper4);
    this.rect(X(71), Y(5), s(32), 1, P.paper4);
    this.rect(X(5), Y(43), s(112), s(6), P.paper2);
    this.shade([[X(98), Y(17)], [X(113), Y(17)], [X(118), Y(30)], [X(118), Y(49)], [X(112), Y(49)], [X(112), Y(30)]], -1);
    // roof vent, ladder
    this.box(X(30), Y(17), s(10), s(4), P.stone2, ink);
    this.box(X(78), Y(1), s(12), s(4), P.stone2, ink);
    for (let k = 0; k < 5; k++) this.rect(X(5), Y(22 + k * 5), s(4), 1, P.stone1);
    this.rect(X(5), Y(21), 1, s(24), P.stone1);
    this.rect(X(8), Y(21), 1, s(24), P.stone1);
    // the stripe
    this.rect(X(5), Y(35), s(113), s(5), P.wood2);
    this.rect(X(5), Y(35), s(113), 1, P.wood3);
    this.rect(X(5), Y(40), s(113), s(2), P.brick2);
    this.rect(X(71), Y(9), s(38), s(2), P.wood2);
    // windows: curtains or warm light
    const win = (wx: number, wy: number, ww: number, wh: number) => {
      this.box(X(wx), Y(wy), s(ww), s(wh), lit ? P.beer3 : P.dusk2, ink);
      if (lit) {
        this.rect(X(wx) + 1, Y(wy) + 1, s(ww) - 2, 1, P.beer4);
        this.rect(X(wx) + 1, Y(wy) + 1, s(3), s(wh) - 2, P.brick3);
        this.rect(X(wx + ww) - s(3) - 1, Y(wy) + 1, s(3), s(wh) - 2, P.brick3);
      } else {
        this.rect(X(wx) + 1, Y(wy) + 1, s(ww) - 2, s(3), P.brick3);
        this.line(X(wx) + 2, Y(wy + wh) - 2, X(wx) + s(6), Y(wy) + s(4), P.dusk4);
      }
    };
    win(20, 24, 18, 10);
    win(46, 24, 18, 10);
    win(78, 8, 16, 8);
    // cab: windscreen, door, mirror
    this.shape([[X(98), Y(18)], [X(111), Y(18)], [X(116), Y(29)], [X(98), Y(29)]], P.river3, ink);
    this.line(X(100), Y(27), X(104), Y(20), P.river5);
    this.rect(X(97), Y(17), 1, s(31), ink);
    this.rect(X(108), Y(31), s(3), 1, ink);
    this.box(X(115), Y(20), s(3), s(5), P.ink2, ink);
    // entry door with a step
    this.box(X(70), Y(22), s(12), s(26), P.paper2, ink);
    this.box(X(72), Y(25), s(8), s(7), lit ? P.beer3 : P.dusk2, ink);
    this.px(X(80), Y(36), P.stone2);
    this.rect(X(69), Y(49), s(14), s(2), P.stone1);
    // marker lights, bumper, headlight
    this.rect(X(116), Y(38), s(3), s(4), P.beer3);
    this.rect(X(5), Y(30), s(2), s(4), P.brick2);
    this.rect(X(112), Y(46), s(8), s(3), P.stone2);
    this.rect(X(112), Y(46), s(8), 1, P.stone4);
    // wheels with hubcaps and arches
    for (const wx of [24, 96]) {
      this.ellipse(X(wx), Y(48), s(10), s(5), P.ink2);
      this.oval(X(wx), Y(51), s(8), s(8), P.ink1, ink);
      this.ellipse(X(wx), Y(51), s(5), s(5), P.stone2);
      this.ellipse(X(wx) - 1, Y(50), s(3), s(3), P.stone3);
      this.ellipse(X(wx), Y(51), s(1), s(1), P.ink1);
    }
    this.rect(X(32), Y(48), s(2), s(6), P.ink2);
    if (bike) {
      // rear rack with the motorcycle
      this.rect(X(-10), Y(44), s(15), s(2), P.stone1);
      this.rect(X(-10), Y(44), s(15), 1, P.stone3);
      this.oval(X(-12), Y(40), s(5), s(5), P.ink2, ink);
      this.ellipse(X(-12), Y(40), s(2), s(2), P.stone2);
      this.oval(X(2), Y(40), s(5), s(5), P.ink2, ink);
      this.ellipse(X(2), Y(40), s(2), s(2), P.stone2);
      this.shape([[X(-12), Y(38)], [X(-5), Y(30)], [X(4), Y(30)], [X(2), Y(38)]], P.brick1, ink);
      this.line(X(-4), Y(31), X(2), Y(31), P.brick3);
      this.rect(X(-6), Y(27), s(8), s(3), P.ink1);
      this.box(X(-6), Y(35), s(7), s(4), P.stone1, ink);
      this.line(X(3), Y(30), X(6), Y(24), P.stone2);
      this.px(X(6), Y(24), P.beer3);
    }
  }
}

/** Map a 0…steps ramp onto cel bands with dithered seams of relative width `seam`. */
export function celRamp(v: number, seam = 0.5): number {
  if (v <= 0) return 0;
  const fl = Math.floor(v);
  const f = v - fl;
  const w = Math.max(0.05, seam);
  return fl + Math.max(0, Math.min(1, (f - 0.5) / w + 0.5));
}

/** Shared palette shortcuts for painters. */
export { P };
