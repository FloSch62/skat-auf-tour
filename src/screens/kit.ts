// Shared drawing kit for all screens: the "Was jetzt?" line, wood plates, speech bubbles, portraits and backdrops
// with code fallbacks, the fuel tank and the Mark purse, Lautwörter. Everything is drawn in the canvas.
import type { Gfx } from "../core/gfx";
import { art, atlas, getJson, hasArt, loadJson } from "../core/assets";
import { centerY, lineHeight, measure, wrap, type FontId } from "../core/font";
import { C, P, rgba } from "../core/palette";
import { hashString } from "../core/rng";

export const W = 960;
export const H = 540;

/** The type scale (contract §0.5). Nothing that must be read is smaller than `body`. */
export const TYPE = {
  title: "huge",
  heading: "big",
  text: "head",
  small: "body",
} as const satisfies Record<string, FontId>;

// ─── text helpers ─────────────────────────────────────────────────────────────────────────────────────────

/** Wrapped text block; returns its height. */
export function para(g: Gfx, text: string, x: number, y: number, w: number, opts: { font?: FontId; color?: string; shadow?: string | null; align?: "left" | "center"; outline?: string | null } = {}): number {
  const font = opts.font ?? TYPE.text;
  if (opts.align === "center") {
    const lines = wrap(text, w, font);
    const lh = lineHeight(font);
    lines.forEach((l, i) => g.text(l, x + w / 2, y + i * lh, { font, color: opts.color ?? C.text, shadow: opts.shadow, align: "center", outline: opts.outline }));
    return lines.length * lh;
  }
  return g.text(text, x, y, { font, color: opts.color ?? C.text, width: w, shadow: opts.shadow, outline: opts.outline });
}

export function textHeight(text: string, w: number, font: FontId = TYPE.text): number {
  return wrap(text, w, font).length * lineHeight(font);
}

// ─── the "Was jetzt?" line (contract §0.4) ────────────────────────────────────────────────────────────────

/**
 * One sentence that says what to do now, on a paper strip. Default position: centred above the hand area.
 * Returns the strip's rectangle.
 */
export function whatNow(g: Gfx, text: string, opts: { y?: number; x?: number; w?: number; color?: string } = {}) {
  const font: FontId = "head";
  const maxW = opts.w ?? 760;
  const lines = wrap(text, maxW - 32, font);
  let widest = 0;
  for (const l of lines) widest = Math.max(widest, measure(l, font));
  const tw = Math.min(maxW, widest + 40);
  const x = opts.x ?? Math.round((W - tw) / 2);
  const lh = lineHeight(font);
  const h = 34 + (lines.length - 1) * lh;
  const y = opts.y ?? 352;
  g.panel(x, y, tw, h, "paper");
  const ty = centerY(font, y, 34);
  lines.forEach((l, i) => g.text(l, x + tw / 2, ty + i * lh, { font, align: "center", color: opts.color ?? P.ink1 }));
  return { x, y, w: tw, h };
}

// ─── plates and frames ────────────────────────────────────────────────────────────────────────────────────

/** A wood plate with a heading, centred at cx. */
export function plate(g: Gfx, text: string, cx: number, y: number, opts: { font?: FontId; color?: string; minW?: number } = {}) {
  const font = opts.font ?? "big";
  const w = Math.max(opts.minW ?? 0, measure(text, font) + 48);
  const h = lineHeight(font) + 14;
  const x = Math.round(cx - w / 2);
  g.panel(x, y, w, h, "panel-hi");
  g.text(text, cx, centerY(font, y, h), { font, align: "center", color: opts.color ?? C.title, shadow: P.ink0 });
  return { x, y, w, h };
}

/** Heading text in the title colour with a dark contour (over painted backgrounds). */
export function heading(g: Gfx, text: string, x: number, y: number, opts: { font?: FontId; align?: "left" | "center" | "right"; color?: string; outline?: string | null } = {}) {
  const outline = opts.outline !== undefined ? opts.outline : P.ink0;
  return g.text(text, x, y, { font: opts.font ?? "big", align: opts.align ?? "center", color: opts.color ?? C.title, outline });
}

// ─── speech bubble ────────────────────────────────────────────────────────────────────────────────────────

/**
 * Comic speech bubble with a tail pointing to (tx, ty). Text in `head`, ink on white. Width adapts to the text up
 * to maxW. Returns the bubble rectangle.
 */
export function bubble(g: Gfx, text: string, x: number, y: number, tx: number, ty: number, opts: { maxW?: number; font?: FontId; align?: "left" | "right" } = {}) {
  const font = opts.font ?? "head";
  const maxW = opts.maxW ?? 280;
  const lines = wrap(text, maxW - 24, font);
  let w = 0;
  for (const l of lines) w = Math.max(w, measure(l, font));
  w = Math.round(w + 24);
  const lh = lineHeight(font);
  const h = lines.length * lh + 14;
  const bx = opts.align === "right" ? Math.round(x - w) : Math.round(x);
  const by = Math.round(y);
  // tail: a small triangle from the bubble edge towards the speaker
  const cx = Math.max(bx + 14, Math.min(bx + w - 14, tx));
  const below = ty > by + h;
  const ey = below ? by + h - 2 : by + 2;
  const steps = Math.max(4, Math.abs(ty - ey));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = Math.round(cx + (tx - cx) * t);
    const py = Math.round(ey + (ty - ey) * t);
    const half = Math.round((1 - t) * 7);
    g.rect(px - half - 1, py - 1, half * 2 + 3, 3, P.ink0);
  }
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = Math.round(cx + (tx - cx) * t);
    const py = Math.round(ey + (ty - ey) * t);
    const half = Math.round((1 - t) * 7);
    if (half > 0) g.rect(px - half, py, half * 2 + 1, 1, P.paper4);
  }
  g.panel(bx, by, w, h, "bubble");
  g.text(lines.join("\n"), bx + 12, by + 7, { font, color: P.ink1 });
  return { x: bx, y: by, w, h };
}

// ─── portraits and backdrops ──────────────────────────────────────────────────────────────────────────────

const FACE = [P.brick4, P.wood5, P.paper1, P.brick3, P.wood4];
const COAT = [P.olive1, P.river1, P.wood2, P.brick1, P.forest1, P.dusk1, P.stone1];

/**
 * A portrait from public/art/portraits/<id>.png, or a code fallback: a framed cel-style bust with cap or hair, a
 * moustache and a red nose, coloured from the id so every figure stays recognisable.
 */
export function portrait(g: Gfx, id: string, x: number, y: number, size = 96, opts: { frame?: boolean; dim?: boolean } = {}) {
  const img = art(`portraits/${id}`);
  if (opts.frame !== false) g.panel(x - 4, y - 4, size + 8, size + 8, "panel-dark");
  if (img) {
    g.pixelFit(img, x, y, size, size, opts.dim ? 0.5 : 1);
    return;
  }
  const h = hashString(id);
  const s = size / 96;
  const r = (px: number, py: number, w: number, hh: number, c: string) => g.rect(x + Math.round(px * s), y + Math.round(py * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(hh * s)), c);
  g.alpha(opts.dim ? 0.5 : 1, () => {
    r(0, 0, 96, 96, [P.wood1, P.dusk0, P.felt0, P.ink2][h % 4]);
    r(0, 60, 96, 36, [P.wood0, P.ink1, P.felt1][h % 3]);
    const coat = COAT[(h >> 3) % COAT.length];
    const face = FACE[(h >> 6) % FACE.length];
    r(14, 70, 68, 26, P.ink0);
    r(16, 72, 64, 24, coat);
    r(28, 22, 40, 50, P.ink0);
    r(30, 24, 36, 46, face);
    // cap or hair
    const hat = (h >> 9) % 3;
    if (hat === 0) {
      r(24, 16, 48, 12, P.ink0);
      r(26, 18, 44, 8, [P.stone1, P.olive1, P.wood2][(h >> 11) % 3]);
      r(22, 26, 52, 4, P.ink0);
    } else if (hat === 1) {
      r(28, 18, 40, 10, [P.ink2, P.stone2, P.wood1][(h >> 11) % 3]);
    } else {
      r(30, 20, 36, 6, P.stone3);
    }
    // eyes, nose, moustache
    r(38, 40, 5, 5, P.ink0);
    r(53, 40, 5, 5, P.ink0);
    r(44, 46, 8, 10, P.brick3);
    if ((h >> 13) % 2 === 0) r(36, 56, 24, 5, [P.ink1, P.stone2, P.wood1][(h >> 14) % 3]);
    r(42, 62, 12, 2, P.ink1);
  });
}

/**
 * A backdrop from public/art/<id>.png (640×360 adventure raster, drawn 3×), or the code fallback painter.
 * Returns true when the painted art was drawn.
 */
export function backdrop(g: Gfx, id: string, fallback: (g: Gfx) => void, offsetX = 0, offsetY = 0): boolean {
  const img = art(id);
  if (img && g.pixelScene(img, offsetX, offsetY)) return true;
  if (img) {
    g.cover(img);
    return true;
  }
  fallback(g);
  return false;
}

/** Simple vertical gradient in bands (code fallback skies, walls). */
export function bands(g: Gfx, x: number, y: number, w: number, h: number, colors: string[]) {
  const n = colors.length;
  for (let i = 0; i < n; i++) {
    const y0 = y + Math.round((h * i) / n);
    const y1 = y + Math.round((h * (i + 1)) / n);
    g.rect(x, y0, w, y1 - y0, colors[i]);
  }
}

// ─── fuel and money ───────────────────────────────────────────────────────────────────────────────────────

/** Fuel tank: a row of segments ("Striche"), labelled "Sprit". Returns its width. */
export function fuelGauge(g: Gfx, x: number, y: number, fuel: number, max: number, opts: { label?: boolean } = {}): number {
  const seg = 16;
  const gap = 4;
  const h = 26;
  let cx = x;
  if (opts.label !== false) {
    g.text("Sprit", cx, centerY("head", y, h), { font: "head", color: C.text, shadow: P.ink0 });
    cx += measure("Sprit", "head") + 8;
  }
  g.rrect(cx - 3, y - 3, max * (seg + gap) - gap + 6, h + 6, 2, P.ink0);
  for (let i = 0; i < max; i++) {
    const on = i < fuel;
    const sx = cx + i * (seg + gap);
    g.rect(sx, y, seg, h, on ? P.brick2 : P.ink2);
    if (on) {
      g.rect(sx, y, seg, 3, P.brick4);
      g.rect(sx, y + h - 3, seg, 3, P.brick1);
    }
  }
  return cx + max * (seg + gap) - gap - x;
}

/** Mark purse: a coin and the amount. Returns its width. */
export function marksChip(g: Gfx, x: number, y: number, marks: number): number {
  const h = 26;
  coin(g, x + 13, y + 13, 12);
  const text = `${marks} Mark`;
  g.text(text, x + 32, centerY("head", y, h), { font: "head", color: C.money, shadow: P.ink0 });
  return 32 + measure(text, "head");
}

export function coin(g: Gfx, cx: number, cy: number, r: number) {
  if (g.sprite("icons", "mark", cx, cy)) return;
  g.circle(cx, cy, r, P.ink0, true);
  g.circle(cx, cy, r - 1, P.beer1, true);
  g.circle(cx, cy, r - 3, P.beer2, true);
  g.text("DM", cx, cy - 7, { font: "body", align: "center", color: P.beer0 });
}

// ─── Lautwörter ───────────────────────────────────────────────────────────────────────────────────────────

/**
 * A sound word (KLATSCH, RÖÖÖHR …) from the words atlas (frame "<word>-<size>"), or big outlined comic letters.
 * size: 0 small, 1 medium, 2 large. `t` 0…1 animates a pop-in.
 */
export function soundWord(g: Gfx, word: string, cx: number, cy: number, size: 0 | 1 | 2 = 1, t = 1) {
  const id = word.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue");
  const a = Math.min(1, t * 3);
  if (atlas("words") && g.sprite("words", `${id}-${size}`, cx, cy, { alpha: a })) return;
  const font: FontId = size === 2 ? "huge" : size === 1 ? "big" : "head";
  const color = [P.beer3, P.road2, P.brick3][hashString(word) % 3];
  g.alpha(a, () => g.text(word, cx, cy - lineHeight(font) / 2, { font, align: "center", color, outline: P.ink0, shadow: P.ink0 }));
}

// ─── misc ─────────────────────────────────────────────────────────────────────────────────────────────────

/** A dim veil and a centred dialog panel; returns its rectangle. */
export function dialog(g: Gfx, w: number, h: number, variant = "dialog") {
  g.dim(0.55);
  const x = Math.round((W - w) / 2);
  const y = Math.round((H - h) / 2);
  g.panel(x, y, w, h, variant);
  return { x, y, w, h };
}

export function shade(g: Gfx, x: number, y: number, w: number, h: number, a = 0.35) {
  g.rect(x, y, w, h, rgba(P.ink0, a));
}

// ─── drinks ───────────────────────────────────────────────────────────────────────────────────────────────

export type GlassKind = "beer" | "weizen" | "wine" | "cider" | "schnapps" | "spezi" | "water";

/**
 * A glass standing on (cx, bottom): drinks atlas frame "<kind>-<fill>" (fill 3 full … 0 empty), or a code fallback.
 * `scale` enlarges the fallback (the atlas frames are drawn as they are).
 */
export function glass(g: Gfx, kind: GlassKind, cx: number, bottom: number, fill: 0 | 1 | 2 | 3 = 3, scale = 1) {
  if (scale === 1 && g.sprite("drinks", `${kind}-${fill}`, cx, bottom)) return;
  const s = (v: number) => Math.round(v * scale);
  const liquid: Record<GlassKind, string> = { beer: P.beer2, weizen: P.beer1, wine: P.beer3, cider: P.beer1, schnapps: P.paper4, spezi: P.wood2, water: P.river4 };
  const shape: Record<GlassKind, [number, number]> = { beer: [14, 26], weizen: [10, 36], wine: [12, 22], cider: [16, 26], schnapps: [8, 12], spezi: [10, 32], water: [11, 24] };
  const [w, h] = shape[kind];
  const x = Math.round(cx - s(w) / 2);
  const y = bottom - s(h);
  g.rect(x - 1, y - 1, s(w) + 2, s(h) + 2, P.ink0);
  g.rect(x, y, s(w), s(h), kind === "spezi" ? P.wood1 : P.river5);
  const lv = Math.round((s(h) - s(3)) * (fill / 3));
  if (lv > 0) g.rect(x + 1, bottom - 1 - lv, s(w) - 2, lv, liquid[kind]);
  if ((kind === "beer" || kind === "weizen") && fill > 0) g.rect(x + 1, bottom - 1 - lv - s(3), s(w) - 2, s(3), P.paper4);
  if (kind === "beer") {
    g.rect(x + s(w), y + s(6), s(4), s(12), P.ink0);
    g.rect(x + s(w) + 1, y + s(7), s(2), s(10), P.river5);
  }
  if (kind === "cider") g.rect(x + s(w), y + s(6), s(4), s(12), P.ink0);
  if (kind === "wine") {
    g.rect(x + s(w), y + s(5), s(3), s(10), P.ink0);
    g.rect(x + s(w) + 1, y + s(6), s(1), s(8), P.river5);
  }
  if (kind === "spezi") g.rect(x + s(3), y - s(5), s(w) - s(6), s(5), P.ink0);
  g.rect(x + 1, y + 1, 1, s(h) - 3, P.paper4);
}

// ─── painted art cut-outs (HD, 2× density) ────────────────────────────────────────────────────────────────

/**
 * Draw a painted cut-out (items, dogs, trophies, vehicles; public/art at 2× density) scaled to fit a layout box,
 * smoothly. `anchor` "bottom" stands it on the box's bottom edge (busts, trophies, vehicles). Returns false when the
 * art is not painted (yet), so the caller draws its atlas or code fallback.
 */
export function artFit(g: Gfx, id: string, x: number, y: number, w: number, h: number, opts: { anchor?: "center" | "bottom"; alpha?: number } = {}): boolean {
  if (!hasArt(id)) return false;
  const img = art(id);
  if (!img) return true; // loading: draw nothing rather than flashing the fallback
  const s = Math.min(w / img.width, h / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  const dx = x + (w - dw) / 2;
  const dy = opts.anchor === "bottom" ? y + h - dh : y + (h - dh) / 2;
  const c = g.ctx;
  const smooth = c.imageSmoothingEnabled;
  const a = c.globalAlpha;
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  c.globalAlpha = a * (opts.alpha ?? 1);
  c.drawImage(img, Math.round(dx * 2) / 2, Math.round(dy * 2) / 2, dw, dh);
  c.globalAlpha = a;
  c.imageSmoothingEnabled = smooth;
  return true;
}

interface VanMeta {
  /** Camper + crosswise rear carrier + the motorcycle seen head-on; `van` = offset of the camper body inside. */
  camper?: { w: number; h: number; ground: number; van: [number, number] };
  van: { w: number; h: number; ground: number };
  bike: { w: number; h: number; ground: number };
  rig: { w: number; h: number; ground: number };
  rack: { x: number; y: number; bikeScale: number; over: boolean };
}

/**
 * The painted camper (with the motorcycle on its rack) or the sidecar rig, side view facing right, standing on the
 * ground line `groundY`, horizontally centred at cx, `width` layout units wide. False when not painted yet.
 */
export function paintedVehicle(g: Gfx, kind: "camper" | "rig", cx: number, groundY: number, width: number): boolean {
  const meta = getJson<VanMeta>("art/van/van.json");
  if (!meta) {
    void loadJson("art/van/van.json");
    return hasArt(kind === "camper" ? "van/van" : "van/rig") ? true : false;
  }
  if (kind === "rig") {
    const r = meta.rig;
    const s = width / r.w;
    return artFit(g, "van/rig", cx - width / 2, groundY - r.ground * s, width, r.h * s);
  }
  const v = meta.van;
  const s = width / v.w;
  if (meta.camper && hasArt("van/camper")) {
    // `width` is the camper body; the carrier sticks out behind it (to the left)
    const c = meta.camper;
    const left = cx - width / 2 - c.van[0] * s;
    return artFit(g, "van/camper", left, groundY - c.ground * s, c.w * s, c.h * s);
  }
  const left = cx - width / 2;
  const top = groundY - v.ground * s;
  if (!artFit(g, "van/van", left, top, width, v.h * s)) return false;
  const b = meta.bike;
  const bs = s * meta.rack.bikeScale;
  const bw = b.w * bs;
  const bh = b.h * bs;
  artFit(g, "van/bike", left + meta.rack.x * s - bw / 2, top + meta.rack.y * s - b.ground * bs, bw, bh);
  return true;
}
