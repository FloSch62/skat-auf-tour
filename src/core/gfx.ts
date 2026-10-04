// Pixel-crisp drawing helpers on the logical 960×540 context.
import { atlas, atlasScale, density, type Atlas, type AtlasFrame } from "./assets";
import { drawText, type TextOpts } from "./font";
import { P } from "./palette";
import { GLOSS, theme, type SliceStyle } from "./theme";

export type Ctx = CanvasRenderingContext2D;

export class Gfx {
  /** Seconds since start (for animations). */
  time = 0;
  constructor(readonly ctx: Ctx) {}

  rect(x: number, y: number, w: number, h: number, color: string) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  /** 1-px outline inside the given box. */
  box(x: number, y: number, w: number, h: number, color: string, t = 1) {
    x = Math.round(x);
    y = Math.round(y);
    w = Math.round(w);
    h = Math.round(h);
    const c = this.ctx;
    c.fillStyle = color;
    c.fillRect(x, y, w, t);
    c.fillRect(x, y + h - t, w, t);
    c.fillRect(x, y + t, t, h - 2 * t);
    c.fillRect(x + w - t, y + t, t, h - 2 * t);
  }

  hline(x: number, y: number, w: number, color: string) {
    this.rect(x, y, w, 1, color);
  }
  vline(x: number, y: number, h: number, color: string) {
    this.rect(x, y, 1, h, color);
  }

  /** Bresenham line of 1-px squares (thickness t). */
  line(x0: number, y0: number, x1: number, y1: number, color: string, t = 1) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const c = this.ctx;
    c.fillStyle = color;
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    const o = Math.floor(t / 2);
    for (let guard = 0; guard < 4000; guard++) {
      c.fillRect(x0 - o, y0 - o, t, t);
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

  /** Midpoint circle outline (or filled). */
  circle(cx: number, cy: number, r: number, color: string, fill = false) {
    cx = Math.round(cx);
    cy = Math.round(cy);
    r = Math.round(r);
    const c = this.ctx;
    c.fillStyle = color;
    let x = r;
    let y = 0;
    let err = 1 - r;
    while (x >= y) {
      if (fill) {
        c.fillRect(cx - x, cy + y, 2 * x + 1, 1);
        c.fillRect(cx - x, cy - y, 2 * x + 1, 1);
        c.fillRect(cx - y, cy + x, 2 * y + 1, 1);
        c.fillRect(cx - y, cy - x, 2 * y + 1, 1);
      } else {
        const pts = [
          [x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y],
        ];
        for (const [px, py] of pts) c.fillRect(cx + px, cy + py, 1, 1);
      }
      y++;
      if (err < 0) err += 2 * y + 1;
      else {
        x--;
        err += 2 * (y - x) + 1;
      }
    }
  }

  /** Pixel ellipse outline, used for shield bubbles. */
  ellipse(cx: number, cy: number, rx: number, ry: number, color: string, t = 1, dash = 0, phase = 0) {
    const c = this.ctx;
    c.fillStyle = color;
    const steps = Math.max(24, Math.round((rx + ry) * 3));
    let lastX = NaN;
    let lastY = NaN;
    for (let i = 0; i < steps; i++) {
      if (dash > 0 && Math.floor((i + phase) / dash) % 2 === 1) continue;
      const a = (i / steps) * Math.PI * 2;
      const x = Math.round(cx + Math.cos(a) * rx);
      const y = Math.round(cy + Math.sin(a) * ry);
      if (x === lastX && y === lastY) continue;
      c.fillRect(x - Math.floor(t / 2), y - Math.floor(t / 2), t, t);
      lastX = x;
      lastY = y;
    }
  }

  /**
   * Draw an image at (x, y) in layout units. Its size follows its density (HD art is drawn at half its pixel size,
   * i.e. 1:1 on the 1920×1080 backing store); `scale` multiplies that.
   */
  image(img: CanvasImageSource | null, x: number, y: number, scale = 1, alpha = 1) {
    if (!img) return;
    const d = density(img);
    const w = ((img as HTMLImageElement).width / d) * scale;
    const h = ((img as HTMLImageElement).height / d) * scale;
    const c = this.ctx;
    const a = c.globalAlpha;
    c.globalAlpha = a * alpha;
    c.drawImage(img, snap(x, d / scale), snap(y, d / scale), w, h);
    c.globalAlpha = a;
  }

  /** Draw an image stretched to cover the whole 960×540 screen (backgrounds of any resolution). */
  cover(img: CanvasImageSource | null, alpha = 1, offsetX = 0, offsetY = 0) {
    if (!img) return;
    const iw = (img as HTMLImageElement).width;
    const ih = (img as HTMLImageElement).height;
    const s = Math.max(960 / iw, 540 / ih);
    const c = this.ctx;
    const a = c.globalAlpha;
    const smooth = c.imageSmoothingEnabled;
    c.globalAlpha = a * alpha;
    // painted art is resampled smoothly unless it lands 1:1 on the backing store (1920×1080 art at 1080p)
    c.imageSmoothingEnabled = Math.abs(iw * s * 2 - iw) > 0.5;
    c.imageSmoothingQuality = "high";
    c.drawImage(img, Math.round((960 - iw * s) / 2 + offsetX), Math.round((540 - ih * s) / 2 + offsetY), iw * s, ih * s);
    c.imageSmoothingEnabled = smooth;
    c.globalAlpha = a;
  }

  /**
   * Draw a low-resolution pixel-art scene (DIRECTION v5: e.g. 640×360 drawn 3×, 480×270 drawn 4×) over the whole
   * screen at an integer number of backing pixels per art pixel, smoothing off. Larger images (overscan) are centred.
   * Offsets are in layout units and snap to the art-pixel grid; an offset that exposes an edge repeats the border
   * column/row. Returns the art-pixel size in layout units, or 0 when `img` is not a low-resolution scene.
   */
  pixelScene(img: CanvasImageSource | null, offsetX = 0, offsetY = 0, alpha = 1): number {
    const cell = pixelSceneCell(img);
    if (!img || !cell) return 0;
    const iw = (img as HTMLImageElement).width;
    const ih = (img as HTMLImageElement).height;
    const w = iw * cell;
    const h = ih * cell;
    const x = Math.round(((960 - w) / 2 + offsetX) / cell) * cell;
    const y = Math.round(((540 - h) / 2 + offsetY) / cell) * cell;
    const c = this.ctx;
    const a = c.globalAlpha;
    const smooth = c.imageSmoothingEnabled;
    c.globalAlpha = a * alpha;
    c.imageSmoothingEnabled = false;
    c.drawImage(img, x, y, w, h);
    if (x > 0) c.drawImage(img, 0, 0, 1, ih, 0, y, x, h);
    if (x + w < 960) c.drawImage(img, iw - 1, 0, 1, ih, x + w, y, 960 - x - w, h);
    if (y > 0) c.drawImage(img, 0, 0, iw, 1, x, 0, w, y);
    if (y + h < 540) c.drawImage(img, 0, ih - 1, iw, 1, x, y + h, w, 540 - y - h);
    c.imageSmoothingEnabled = smooth;
    c.globalAlpha = a;
    return cell;
  }

  /**
   * Draw a low-resolution illustration inside a layout box at the largest integer number of backing pixels per art
   * pixel that fits, centred on the backing grid, smoothing off (DIRECTION v5 event art: 213×106 drawn 3× in the
   * 320×160 event frame). Returns the backing pixels per art pixel, or 0 when the image does not fit.
   */
  pixelFit(img: CanvasImageSource | null, x: number, y: number, w: number, h: number, alpha = 1): number {
    if (!img) return 0;
    const iw = (img as HTMLImageElement).width;
    const ih = (img as HTMLImageElement).height;
    // HD painted art (contract §9 "HD painted"): fit smoothly instead of on an integer pixel grid
    if (density(img) >= 2 && Math.min((w * 2) / iw, (h * 2) / ih) < 2) return this.fit(img, x, y, w, h, alpha);
    const k = Math.floor(Math.min((w * 2) / iw, (h * 2) / ih));
    if (k < 1) return this.fit(img, x, y, w, h, alpha);
    const c = this.ctx;
    const a = c.globalAlpha;
    const smooth = c.imageSmoothingEnabled;
    c.globalAlpha = a * alpha;
    c.imageSmoothingEnabled = false;
    const bx = Math.round(x * 2) + Math.floor((Math.round(w * 2) - iw * k) / 2);
    const by = Math.round(y * 2) + Math.floor((Math.round(h * 2) - ih * k) / 2);
    c.drawImage(img, bx / 2, by / 2, (iw * k) / 2, (ih * k) / 2);
    c.imageSmoothingEnabled = smooth;
    c.globalAlpha = a;
    return k;
  }

  /**
   * Draw an image scaled to fit (contain) a layout box, centred, with high-quality smoothing (painted HD art).
   * Returns 1 when drawn.
   */
  fit(img: CanvasImageSource | null, x: number, y: number, w: number, h: number, alpha = 1): number {
    if (!img) return 0;
    const iw = (img as HTMLImageElement).width;
    const ih = (img as HTMLImageElement).height;
    if (!iw || !ih) return 0;
    const s = Math.min(w / iw, h / ih);
    const dw = iw * s;
    const dh = ih * s;
    const c = this.ctx;
    const a = c.globalAlpha;
    const smooth = c.imageSmoothingEnabled;
    c.globalAlpha = a * alpha;
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    c.drawImage(img, snap(x + (w - dw) / 2, 2), snap(y + (h - dh) / 2, 2), dw, dh);
    c.imageSmoothingEnabled = smooth;
    c.globalAlpha = a;
    return 1;
  }

  /**
   * Draw part of an image. Source rect in image pixels; destination in layout units at the image's density `d`
   * (pass the atlas scale for HD atlases).
   */
  sub(img: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, x: number, y: number, flipX = false, d = density(img)) {
    const c = this.ctx;
    x = snap(x, d);
    y = snap(y, d);
    const dw = sw / d;
    const dh = sh / d;
    if (!flipX) {
      c.drawImage(img, sx, sy, sw, sh, x, y, dw, dh);
      return;
    }
    c.save();
    c.translate(x + dw, y);
    c.scale(-1, 1);
    c.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
    c.restore();
  }

  frame(atlasName: string, frameName: string): AtlasFrame | null {
    return atlas(atlasName)?.frames[frameName] ?? null;
  }

  /** Size of an atlas frame in layout units (frame pixels / atlas scale). */
  frameSize(atlasName: string, frameName: string): { w: number; h: number } | null {
    const a = atlas(atlasName);
    const f = a?.frames[frameName];
    if (!a || !f) return null;
    const s = atlasScale(a);
    return { w: f.w / s, h: f.h / s };
  }

  /**
   * Draw an atlas frame with its anchor at (x, y). Returns false if the atlas/frame is missing (draw a fallback).
   */
  sprite(
    atlasName: string,
    frameName: string,
    x: number,
    y: number,
    opts: { flipX?: boolean; alpha?: number; image?: CanvasImageSource; noAnchor?: boolean } = {},
  ): boolean {
    const a = atlas(atlasName);
    const f = a?.frames[frameName];
    if (!a || !f) return false;
    const s = atlasScale(a);
    const ax = (opts.noAnchor ? 0 : opts.flipX ? f.w - 1 - f.ax : f.ax) / s;
    const ay = (opts.noAnchor ? 0 : f.ay) / s;
    const c = this.ctx;
    const prev = c.globalAlpha;
    if (opts.alpha !== undefined) c.globalAlpha = prev * opts.alpha;
    this.sub(opts.image ?? a.image, f.x, f.y, f.w, f.h, x - ax, y - ay, opts.flipX, s);
    c.globalAlpha = prev;
    return true;
  }

  /** Frame name of an animation at time t (seconds). */
  animFrame(atlasName: string, animName: string, t: number): string | null {
    const a = atlas(atlasName);
    const an = a?.anims[animName];
    if (!an || an.frames.length === 0) return null;
    let i = Math.floor(t * an.fps);
    i = an.loop ? i % an.frames.length : Math.min(i, an.frames.length - 1);
    return an.frames[i];
  }

  anim(
    atlasName: string,
    animName: string,
    t: number,
    x: number,
    y: number,
    opts: { flipX?: boolean; alpha?: number } = {},
  ): boolean {
    const f = this.animFrame(atlasName, animName, t);
    return f ? this.sprite(atlasName, f, x, y, opts) : false;
  }

  animDone(atlasName: string, animName: string, t: number): boolean {
    const an = atlas(atlasName)?.anims[animName];
    if (!an) return true;
    return !an.loop && t * an.fps >= an.frames.length;
  }

  /** 9-slice from the ui atlas; procedural fallback when the atlas isn't there yet. */
  panel(x: number, y: number, w: number, h: number, variant = "panel") {
    x = Math.round(x);
    y = Math.round(y);
    w = Math.round(w);
    h = Math.round(h);
    const themed = theme.slices[variant];
    if (themed) {
      themedPanel(this, x, y, w, h, themed);
      return;
    }
    const a = atlas("ui");
    const s = a?.slices[variant] ?? (variant !== "panel" ? a?.slices["panel"] : undefined);
    if (a && s) {
      // A 9-slice tiles its edges and centre from small source cells, which can mean hundreds of blits for one large
      // panel. Each size is composed once into an offscreen canvas and reused.
      if (w > 0 && h > 0 && typeof document !== "undefined") {
        const key = `${variant}|${w}|${h}`;
        let cv = panelCache.get(key);
        if (!cv) {
          const k = atlasScale(a);
          cv = document.createElement("canvas");
          cv.width = Math.ceil(w * k);
          cv.height = Math.ceil(h * k);
          const cc = cv.getContext("2d")!;
          cc.imageSmoothingEnabled = false;
          cc.scale(k, k);
          nineSlice(cc, a, s, 0, 0, w, h);
          if (panelCache.size > 400) panelCache.clear();
          panelCache.set(key, cv);
        }
        const c = this.ctx;
        const smooth = c.imageSmoothingEnabled;
        c.imageSmoothingEnabled = false;
        c.drawImage(cv, x, y, w, h);
        c.imageSmoothingEnabled = smooth;
        const gloss = GLOSS[theme.id]?.[variant];
        if (gloss && w > 30 && h > 30) this.alpha(0.1, () => this.rect(x + 6, y + 6, w - 12, Math.round((h - 12) * 0.38), gloss));
        return;
      }
      nineSlice(this.ctx, a, s, x, y, w, h);
      return;
    }
    fallbackPanel(this, x, y, w, h, variant);
  }

  text(text: string, x: number, y: number, opts: TextOpts = {}): number {
    return drawText(this.ctx, text, x, y, opts);
  }

  clip(x: number, y: number, w: number, h: number, fn: () => void) {
    const c = this.ctx;
    c.save();
    c.beginPath();
    c.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    c.clip();
    try {
      fn();
    } finally {
      c.restore();
    }
  }

  alpha(a: number, fn: () => void) {
    const c = this.ctx;
    const prev = c.globalAlpha;
    c.globalAlpha = prev * a;
    try {
      fn();
    } finally {
      c.globalAlpha = prev;
    }
  }

  /** Filled rounded rectangle (r ≤ 4), integer-snapped. */
  rrect(x: number, y: number, w: number, h: number, r: number, color: string) {
    x = Math.round(x);
    y = Math.round(y);
    w = Math.round(w);
    h = Math.round(h);
    const c = this.ctx;
    c.fillStyle = color;
    const inset = r <= 1 ? [1] : r === 2 ? [2, 1] : r === 3 ? [3, 1, 1] : [4, 2, 1, 1];
    for (let i = 0; i < inset.length; i++) {
      c.fillRect(x + inset[i], y + i, w - 2 * inset[i], 1);
      c.fillRect(x + inset[i], y + h - 1 - i, w - 2 * inset[i], 1);
    }
    c.fillRect(x, y + inset.length, w, h - 2 * inset.length);
  }

  /** Dim the whole screen (modals). */
  dim(a = 0.6, color: string = P.ink0) {
    this.alpha(a, () => this.rect(0, 0, 960, 540, color));
  }
}

const panelCache = new Map<string, HTMLCanvasElement>();

/** 9-slice with insets in atlas pixels; the destination is in layout units (atlas scale k = HD atlases). */
function nineSlice(c: Ctx, a: Atlas, s: { x: number; y: number; w: number; h: number; l: number; t: number; r: number; b: number }, x: number, y: number, w: number, h: number) {
  const img = a.image;
  const k = atlasScale(a);
  const { l, t, r, b } = s;
  const cw = s.w - l - r;
  const ch = s.h - t - b;
  const L = l / k, T = t / k, R = r / k, B = b / k;
  const iw = Math.max(0, w - L - R);
  const ih = Math.max(0, h - T - B);
  // corners
  c.drawImage(img, s.x, s.y, l, t, x, y, L, T);
  c.drawImage(img, s.x + s.w - r, s.y, r, t, x + w - R, y, R, T);
  c.drawImage(img, s.x, s.y + s.h - b, l, b, x, y + h - B, L, B);
  c.drawImage(img, s.x + s.w - r, s.y + s.h - b, r, b, x + w - R, y + h - B, R, B);
  // edges and centre are tiled (not stretched) to keep pixels crisp
  tile(c, img, k, s.x + l, s.y, cw, t, x + L, y, iw, T);
  tile(c, img, k, s.x + l, s.y + s.h - b, cw, b, x + L, y + h - B, iw, B);
  tile(c, img, k, s.x, s.y + t, l, ch, x, y + T, L, ih);
  tile(c, img, k, s.x + s.w - r, s.y + t, r, ch, x + w - R, y + T, R, ih);
  tile(c, img, k, s.x + l, s.y + t, cw, ch, x + L, y + T, iw, ih);
}

/** Tile a source rect (image px) over a destination rect (layout units) at scale k (image px per layout unit). */
function tile(c: Ctx, img: CanvasImageSource, k: number, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number) {
  if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) return;
  const tw = sw / k;
  const th = sh / k;
  for (let y = 0; y < dh; y += th) {
    const hh = Math.min(th, dh - y);
    for (let x = 0; x < dw; x += tw) {
      const ww = Math.min(tw, dw - x);
      c.drawImage(img, sx, sy, ww * k, hh * k, dx + x, dy + y, ww, hh);
    }
  }
}

/**
 * Art-pixel size in layout units of a low-resolution pixel-art scene: the smallest integer number of backing pixels
 * (1920×1080 store) per art pixel that covers the screen, ≥ 2 (so 640×360 → 1.5, 480×270 → 2). 0 for HD art.
 */
export function pixelSceneCell(img: CanvasImageSource | null | undefined): number {
  const iw = (img as HTMLImageElement | null)?.width ?? 0;
  const ih = (img as HTMLImageElement | null)?.height ?? 0;
  if (!iw || !ih || iw > 960) return 0;
  const k = Math.max(Math.ceil(1920 / iw - 1e-6), Math.ceil(1080 / ih - 1e-6));
  return k >= 2 ? k / 2 : 0;
}

/** Round a layout coordinate to the nearest backing pixel for density d (d = 2 → half units). */
export function snap(v: number, d = 1): number {
  const k = Math.max(1, Math.min(2, d));
  return Math.round(v * k) / k;
}

/**
 * Code fallbacks for every 9-slice the ui atlas will deliver (contract §10). Wood frames for panels and buttons,
 * paper for the Liste, the Tourenbuch and events, felt for the card table, a white bubble for speech.
 */
const FALLBACK: Record<string, { fill: string; outer: string; frame: string; inner: string; hi?: string }> = {
  panel: { fill: P.wood1, outer: P.ink0, frame: P.wood3, inner: P.wood0, hi: P.wood4 },
  "panel-hi": { fill: P.wood2, outer: P.ink0, frame: P.wood5, inner: P.wood1, hi: P.beer3 },
  "panel-dark": { fill: P.wood0, outer: P.ink0, frame: P.wood2, inner: P.ink1 },
  paper: { fill: P.paper3, outer: P.ink1, frame: P.paper1, inner: P.paper2, hi: P.paper4 },
  "paper-dark": { fill: P.paper2, outer: P.ink1, frame: P.paper0, inner: P.paper1 },
  felt: { fill: P.felt1, outer: P.ink0, frame: P.wood2, inner: P.felt0, hi: P.wood4 },
  bubble: { fill: P.paper4, outer: P.ink0, frame: P.paper4, inner: P.paper4 },
  tooltip: { fill: P.paper4, outer: P.ink0, frame: P.paper2, inner: P.paper3 },
  dialog: { fill: P.wood1, outer: P.ink0, frame: P.wood4, inner: P.wood0, hi: P.wood5 },
  "button-normal": { fill: P.wood2, outer: P.ink0, frame: P.wood4, inner: P.wood1, hi: P.wood5 },
  "button-hover": { fill: P.wood3, outer: P.ink0, frame: P.beer3, inner: P.wood2, hi: P.beer4 },
  "button-pressed": { fill: P.wood1, outer: P.ink0, frame: P.wood4, inner: P.ink2 },
  "button-disabled": { fill: P.ink3, outer: P.ink0, frame: P.ink5, inner: P.ink2 },
  "button-go": { fill: P.forest1, outer: P.ink0, frame: P.forest4, inner: P.forest0, hi: P.forest5 },
  "button-go-hover": { fill: P.forest2, outer: P.ink0, frame: P.forest5, inner: P.forest1, hi: P.paper4 },
  "button-danger": { fill: P.brick0, outer: P.ink0, frame: P.brick3, inner: P.ink1, hi: P.brick4 },
  "button-danger-hover": { fill: P.brick1, outer: P.ink0, frame: P.brick4, inner: P.brick0, hi: P.paper4 },
  "button-paper": { fill: P.paper3, outer: P.ink1, frame: P.paper0, inner: P.paper2, hi: P.paper4 },
  "button-paper-hover": { fill: P.paper4, outer: P.ink0, frame: P.beer1, inner: P.paper3, hi: P.beer3 },
};

/** A themed frame (contract §10 UI): ink outline, rounded corners, a coloured frame band, an optional thin inner line
 * (enamel-sign look), the fill, a top highlight and a soft gloss band. */
function themedPanel(g: Gfx, x: number, y: number, w: number, h: number, s: SliceStyle) {
  const r = Math.min(4, Math.floor(Math.min(w, h) / 6));
  g.rrect(x, y, w, h, r, s.outer);
  g.rrect(x + 1, y + 1, w - 2, h - 2, r, s.frame);
  let i = 3;
  if (s.line && w > 24 && h > 24) {
    g.rect(x + 3, y + 3, w - 6, h - 6, s.inner);
    g.rect(x + 4, y + 4, w - 8, h - 8, s.line);
    i = 5;
  }
  g.rect(x + i, y + i, w - 2 * i, h - 2 * i, s.inner);
  g.rect(x + i + 1, y + i + 1, w - 2 * i - 2, h - 2 * i - 1, s.fill);
  if (s.hi && w > 12) {
    g.rect(x + i + 2, y + i + 1, w - 2 * i - 4, 1, s.hi);
    // gloss: a faint lighter band in the upper part of the fill
    if (h > 20) g.alpha(0.12, () => g.rect(x + i + 1, y + i + 2, w - 2 * i - 2, Math.max(2, Math.floor((h - 2 * i) * 0.38)), s.hi!));
  }
}

function fallbackPanel(g: Gfx, x: number, y: number, w: number, h: number, variant: string) {
  const s = FALLBACK[variant] ?? FALLBACK.panel;
  // rounded 2-unit corners, a frame band, an inner shadow line and a top highlight
  g.rect(x + 2, y, w - 4, h, s.outer);
  g.rect(x, y + 2, w, h - 4, s.outer);
  g.rect(x + 1, y + 1, w - 2, h - 2, s.outer);
  g.rect(x + 2, y + 1, w - 4, h - 2, s.frame);
  g.rect(x + 1, y + 2, w - 2, h - 4, s.frame);
  g.rect(x + 3, y + 3, w - 6, h - 6, s.inner);
  g.rect(x + 4, y + 4, w - 8, h - 7, s.fill);
  if (s.hi && w > 12) g.rect(x + 4, y + 2, w - 8, 1, s.hi);
}

// ─── silhouettes / tinted copies (hit flashes, palette swaps) ─────────────────────────────────────────────

const tintCache = new Map<string, HTMLCanvasElement>();

/** A copy of an image with every opaque pixel set to `color` (cached). */
export function silhouette(img: HTMLImageElement | HTMLCanvasElement, key: string, color: string): HTMLCanvasElement {
  const k = `${key}|${color}`;
  let c = tintCache.get(k);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const x = c.getContext("2d")!;
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = "source-in";
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  tintCache.set(k, c);
  return c;
}

/** A copy of an image with exact colours replaced (palette swap, cached). Map keys/values are #rrggbb. */
export function paletteSwap(img: HTMLImageElement | HTMLCanvasElement, key: string, map: Record<string, string>): HTMLCanvasElement {
  let c = tintCache.get(`swap|${key}`);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const x = c.getContext("2d", { willReadFrequently: true })!;
  x.drawImage(img, 0, 0);
  const data = x.getImageData(0, 0, c.width, c.height);
  const lut = new Map<number, [number, number, number]>();
  for (const [from, to] of Object.entries(map)) {
    const f = parseInt(from.replace("#", ""), 16);
    const t = parseInt(to.replace("#", ""), 16);
    lut.set(f, [(t >> 16) & 255, (t >> 8) & 255, t & 255]);
  }
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const v = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    const to = lut.get(v);
    if (to) {
      d[i] = to[0];
      d[i + 1] = to[1];
      d[i + 2] = to[2];
    }
  }
  x.putImageData(data, 0, 0);
  tintCache.set(`swap|${key}`, c);
  return c;
}
