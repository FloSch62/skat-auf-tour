// Interior props for the painted inns and halls: panelling, plaster, windows, the Kachelofen, pennants and
// bunting, orange lamp shades, the Sparschrank, clocks, antlers, shelves, the beer tap, trophies, a dartboard and
// the Stammtisch sign. All flat cel colours from the Leitpalette with ink contours; sizes in raster pixels.
import { P, Px, type Fill, type Pt } from "./painter";

// ─── tiny bitmaps ───────────────────────────────────────────────────────────────────────────────────────────

/** Draw a bitmap of strings ("X" = colour, "." = empty). */
export function bitmap(p: Px, rows: string[], x: number, y: number, col: Fill, scale = 1) {
  rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) if (r[i] !== "." && r[i] !== " ") p.rect(x + i * scale, y + j * scale, scale, scale, col);
  });
}

export const SUIT_BITS: Record<"hearts" | "diamonds" | "spades" | "clubs", string[]> = {
  hearts: [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."],
  diamonds: ["...X...", "..XXX..", ".XXXXX.", "..XXX..", "...X..."],
  spades: ["...X...", "..XXX..", ".XXXXX.", "XXXXXXX", ".XXXXX.", "...X...", "..XXX.."],
  clubs: ["..XXX..", "..XXX..", "XX.X.XX", "XXXXXXX", "XX.X.XX", "...X...", "..XXX.."],
};

/** A card suit symbol (no lettering anywhere in the art). */
export function suit(p: Px, s: keyof typeof SUIT_BITS, x: number, y: number, col?: string, scale = 1) {
  bitmap(p, SUIT_BITS[s], x, y, col ?? (s === "hearts" || s === "diamonds" ? P.brick1 : P.ink1), scale);
}

// ─── walls ──────────────────────────────────────────────────────────────────────────────────────────────────

/** Warm plaster with a faint mottle. */
export function plaster(p: Px, x: number, y: number, w: number, h: number, base: string = P.paper2, mottle: string = P.paper1, n = 0.02) {
  p.rect(x, y, w, h, base);
  p.speckle(x, y, w, h, [mottle], Math.round(w * h * n));
}

/** Frame-and-panel wainscoting facing the viewer (Lamperie). */
export function wainscot(p: Px, x: number, y: number, w: number, h: number, opts: { panelW?: number; dark?: boolean } = {}) {
  const base = opts.dark ? P.wood1 : P.wood2;
  const deep = opts.dark ? P.wood0 : P.wood1;
  const lite = opts.dark ? P.wood2 : P.wood3;
  p.rect(x, y, w, h, base);
  // cap rail with a lit edge and a shadow line under it
  p.rect(x, y, w, 4, lite);
  p.rect(x, y, w, 1, opts.dark ? P.wood3 : P.wood4);
  p.rect(x, y + 4, w, 1, P.ink1);
  const pw = opts.panelW ?? 30;
  const n = Math.max(1, Math.round((w - 4) / pw));
  for (let i = 0; i < n; i++) {
    const x0 = Math.round(x + 3 + ((w - 6) * i) / n);
    const x1 = Math.round(x + 3 + ((w - 6) * (i + 1)) / n);
    const px0 = x0 + 3;
    const pw2 = x1 - x0 - 6;
    const py0 = y + 10;
    const ph = h - 18;
    if (pw2 < 4 || ph < 4) continue;
    // recessed panel: shadow top/left, light bottom/right, a little grain
    p.rect(px0, py0, pw2, ph, deep);
    p.rect(px0 + 1, py0 + 1, pw2 - 1, ph - 1, lite);
    p.rect(px0 + 1, py0 + 1, pw2 - 2, ph - 2, base);
    for (let k = 0; k < 2; k++) {
      const gx = px0 + 3 + Math.round(((pw2 - 6) * (k + 1)) / 3);
      p.rect(gx, py0 + 3, 1, ph - 6, deep);
    }
  }
  // skirting
  p.rect(x, y + h - 4, w, 4, deep);
}

/** Vertical tongue-and-groove boards (cheaper panelling, sheds, clubhouses). */
export function boards(p: Px, x: number, y: number, w: number, h: number, bw = 9, cols: [string, string, string] = [P.wood1, P.wood2, P.wood3]) {
  p.rect(x, y, w, h, cols[1]);
  for (let bx = x; bx < x + w; bx += bw) {
    p.rect(bx, y, 1, h, cols[0]);
    p.rect(bx + 1, y, 1, h, cols[2]);
    // a knot now and then
    if (p.rng.chance(0.25)) p.ellipse(bx + Math.round(bw / 2), y + p.rng.int(4, Math.max(5, h - 5)), 1, 2, cols[0]);
  }
}

/** Glazed wall tiles (station, canteen, butcher): a grid with lit top edges. */
export function tiles(p: Px, x: number, y: number, w: number, h: number, base: string, joint: string, lite: string, size = 8) {
  p.rect(x, y, w, h, base);
  for (let ty = y; ty < y + h; ty += size) p.rect(x, ty, w, 1, joint);
  for (let tx = x; tx < x + w; tx += size) p.rect(tx, y, 1, h, joint);
  for (let ty = y + 1; ty < y + h; ty += size) for (let tx = x + 1; tx < x + w; tx += size) p.rect(tx, ty, Math.min(2, x + w - tx), 1, lite);
}

// ─── windows ────────────────────────────────────────────────────────────────────────────────────────────────

/** A dusky village view for windows: sky, roofs with lit windows, a church spire. */
export function eveningView(p: Px, x: number, y: number, w: number, h: number, opts: { spire?: boolean; night?: boolean } = {}) {
  p.grad(x, y, w, h, opts.night ? [P.dusk0, P.dusk1, P.dusk2] : [P.dusk1, P.dusk2, P.dusk3, P.brick4], 4);
  const base = y + h;
  // roofs
  const r = p.rng;
  let rx = x - 4;
  while (rx < x + w) {
    const rw = r.int(14, 24);
    const top = base - r.int(Math.round(h * 0.25), Math.round(h * 0.45));
    p.poly([[rx, base], [rx, top + 6], [rx + rw / 2, top], [rx + rw, top + 6], [rx + rw, base]], P.dusk0);
    if (r.chance(0.6)) p.rect(rx + r.int(3, rw - 6), top + r.int(8, 12), 2, 3, P.beer3);
    rx += rw + r.int(0, 3);
  }
  if (opts.spire !== false) {
    const sx = x + Math.round(w * 0.65);
    const st = base - Math.round(h * 0.75);
    p.rect(sx - 3, st + 10, 7, base - st - 10, P.dusk0);
    p.poly([[sx - 4, st + 10], [sx + 4, st + 10], [sx, st]], P.dusk0);
    p.px(sx, st - 2, P.dusk0);
    p.rect(sx - 1, st + 14, 3, 3, P.beer2);
  }
}

export interface WindowOpts {
  frame?: string;
  /** Paint the view behind the glass. */
  view?: (p: Px, x: number, y: number, w: number, h: number) => void;
  cross?: boolean;
  /** Lace half-curtain over the lower part (Scheibengardine). */
  lace?: boolean;
  /** Side drapes colour. */
  drapes?: string | null;
  /** Geraniums on the sill. */
  flowers?: boolean;
  sill?: boolean;
}

/** A window facing the viewer with frame, glazing bars, lace and drapes. */
export function windowFront(p: Px, x: number, y: number, w: number, h: number, o: WindowOpts = {}) {
  const frame = o.frame ?? P.paper3;
  p.box(x, y, w, h, frame);
  p.rect(x + w - 2, y + 1, 1, h - 2, P.paper1);
  const gx = x + 3;
  const gy = y + 3;
  const gw = w - 6;
  const gh = h - 6;
  p.rect(gx - 1, gy - 1, gw + 2, gh + 2, P.ink1);
  if (o.view) {
    const view = o.view;
    p.clip(gx, gy, gw, gh, () => view(p, gx, gy, gw, gh));
  } else p.grad(gx, gy, gw, gh, [P.dusk1, P.dusk2, P.dusk3], 4);
  // glint
  p.line(gx + 2, gy + gh - 4, gx + Math.min(gw - 2, 8), gy + gh - 10, P.dusk4);
  if (o.cross !== false) {
    p.rect(x + Math.floor(w / 2) - 1, y + 2, 3, h - 4, frame);
    p.rect(x + Math.floor(w / 2) + 1, y + 2, 1, h - 4, P.paper1);
    p.rect(x + 2, y + Math.floor(h * 0.42), w - 4, 3, frame);
    p.rect(x + 2, y + Math.floor(h * 0.42) + 2, w - 4, 1, P.paper1);
  }
  if (o.lace) {
    const ly = y + Math.floor(h * 0.5);
    const lh = h - (ly - y) - 3;
    p.rect(gx, ly, gw, lh, p.pat(P.paper3, P.paper4, 0.5));
    for (let i = gx; i < gx + gw; i += 4) p.rect(i, ly + lh - 1, 2, 1, P.paper2);
    for (let i = gx + 1; i < gx + gw; i += 4) p.px(i, ly + lh, P.paper3);
    p.rect(gx, ly - 1, gw, 1, P.stone2);
  }
  if (o.drapes) {
    const dw = Math.max(4, Math.round(w * 0.22));
    for (const side of [0, 1]) {
      const dx = side ? x + w - dw + 2 : x - 3;
      p.shape([[dx, y - 3], [dx + dw, y - 3], [dx + dw - (side ? 0 : 3), y + h + 2], [dx + (side ? 3 : 0), y + h + 2]], o.drapes);
      for (let k = 2; k < dw - 1; k += 3) p.line(dx + k, y - 1, dx + k + (side ? 1 : -1), y + h, P.ink2);
    }
    p.rect(x - 6, y - 5, w + 12, 3, P.wood1);
    p.rect(x - 6, y - 5, w + 12, 1, P.wood3);
  }
  if (o.sill !== false) {
    p.box(x - 3, y + h - 1, w + 6, 4, P.paper2);
    p.rect(x - 2, y + h - 1, w + 4, 1, P.paper4);
  }
  if (o.flowers) {
    p.box(x + 2, y + h - 7, w - 4, 6, P.brick1);
    for (let i = x + 4; i < x + w - 4; i += 3) {
      p.rect(i, y + h - 10 - (i % 2), 3, 4, P.forest2);
      if (p.rng.chance(0.7)) p.rect(i + p.rng.int(0, 1), y + h - 12 - p.rng.int(0, 2), 2, 2, p.rng.pick([P.brick2, P.brick3, P.road1]));
    }
  }
}

// ─── pennants, bunting, signs ───────────────────────────────────────────────────────────────────────────────

/** A club pennant (Wimpel) hanging from a little rod, with a trim stripe, an emblem and a tassel. */
export function pennant(p: Px, x: number, y: number, w: number, h: number, main: string, trim: string = P.beer2, emblem: string | null = P.paper4) {
  const mid = Math.round(h * 0.55);
  p.shape([[x, y + 1], [x + w - 1, y + 1], [x + w - 1, y + mid], [x + Math.floor((w - 1) / 2), y + h], [x, y + mid]], main);
  p.rect(x + 1, y + 3, w - 2, 1, trim);
  p.line(x + 1, y + mid, x + Math.floor((w - 1) / 2), y + h - 1, trim);
  if (emblem) p.oval(x + Math.floor((w - 1) / 2), y + Math.round(h * 0.36), Math.max(1, Math.round(w * 0.2)), Math.max(1, Math.round(w * 0.2)), emblem, P.ink1);
  p.rect(x - 2, y, w + 4, 2, P.beer1);
  p.px(x - 2, y, P.beer3);
  p.line(x + Math.floor((w - 1) / 2), y + h + 1, x + Math.floor((w - 1) / 2), y + h + 3, trim);
  // cord
  p.line(x - 1, y - 1, x + Math.floor(w / 2), y - 4, P.ink2);
  p.line(x + w, y - 1, x + Math.floor(w / 2), y - 4, P.ink2);
}

/** A garland of triangle flags between two points with a sag. */
export function bunting(p: Px, x0: number, y0: number, x1: number, y1: number, sag: number, cols: string[], fw = 6, fh = 8) {
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / (fw + 2)));
  const at = (t: number): Pt => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + sag * 4 * t * (1 - t)];
  for (let i = 0; i < n; i++) {
    const a = at(i / n);
    const b = at((i + 1) / n);
    p.line(a[0], a[1], b[0], b[1], P.ink1);
  }
  for (let i = 0; i < n; i++) {
    const [fx, fy] = at((i + 0.5) / n);
    const x = Math.round(fx - fw / 2);
    const y = Math.round(fy);
    p.shape([[x, y], [x + fw, y], [x + Math.round(fw / 2), y + fh]], cols[i % cols.length], P.ink1);
  }
}

/** A string of warm bulbs with small glows (beer garden, tent, campsite). Returns the bulb positions. */
export function stringLights(p: Px, x0: number, y0: number, x1: number, y1: number, sag: number, gap = 10, glow = true): Pt[] {
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / gap));
  const at = (t: number): Pt => [Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t + sag * 4 * t * (1 - t))];
  for (let i = 0; i < n; i++) {
    const a = at(i / n);
    const b = at((i + 1) / n);
    p.line(a[0], a[1], b[0], b[1], P.ink1);
  }
  const bulbs: Pt[] = [];
  for (let i = 1; i < n; i++) {
    const [bx, by] = at(i / n);
    if (glow) p.ellipse(bx, by + 2, 3, 3, p.pat(null, P.beer3, 0.25));
    p.rect(bx - 1, by + 1, 3, 3, P.beer3);
    p.px(bx, by + 1, P.beer4);
    p.px(bx, by, P.ink1);
    bulbs.push([bx, by + 2]);
  }
  return bulbs;
}

/** The hanging Stammtisch sign: wrought-iron scrolls, a brass plaque with the four suits. No lettering. */
export function stammtischSign(p: Px, cx: number, y: number, chainTop = 0) {
  const w = 46;
  const h = 18;
  const x = cx - Math.floor(w / 2);
  // chains
  for (const sx of [x + 6, x + w - 7]) for (let cy = chainTop; cy < y; cy += 3) p.rect(sx, cy, 1, 2, P.ink2);
  // scrollwork on top
  p.line(x + 4, y, x + w - 5, y, P.ink1, 2);
  p.oval(cx, y - 3, 4, 3, P.ink2, P.ink0);
  p.ellipse(cx, y - 3, 2, 1, P.wood1);
  p.oval(x + 4, y - 2, 2, 2, P.ink2, P.ink0);
  p.oval(x + w - 5, y - 2, 2, 2, P.ink2, P.ink0);
  // plaque
  p.box(x, y + 2, w, h, P.beer1);
  p.rect(x + 1, y + 3, w - 2, 1, P.beer3);
  p.rect(x + 1, y + h, w - 2, 1, P.beer0);
  p.box(x + 3, y + 5, w - 6, h - 6, P.wood1, P.beer0);
  const order: (keyof typeof SUIT_BITS)[] = ["clubs", "spades", "hearts", "diamonds"];
  order.forEach((s, i) => suit(p, s, x + 6 + i * 9, y + 7, s === "hearts" || s === "diamonds" ? P.brick3 : P.paper3));
}

// ─── lamps ──────────────────────────────────────────────────────────────────────────────────────────────────

export type ShadeColour = "orange" | "brick" | "green" | "cream" | "glass";

const SHADES: Record<ShadeColour, [string, string, string, string]> = {
  orange: [P.beer0, P.beer1, P.beer2, P.beer3],
  brick: [P.brick1, P.brick2, P.brick3, P.brick4],
  green: [P.forest0, P.forest1, P.forest2, P.forest3],
  cream: [P.paper1, P.paper2, P.paper3, P.paper4],
  glass: [P.stone2, P.stone3, P.stone4, P.paper4],
};

/** A hanging 70s lamp shade on a cord. (cx, y) is the shade top; the light comes out of the rim at y + h. */
export function hangingLamp(p: Px, cx: number, y: number, w: number, h: number, cordTop = 0, col: ShadeColour = "orange") {
  const [d, b, l, hl] = SHADES[col];
  p.line(cx, cordTop, cx, y - 2, P.ink1);
  p.rect(cx - 1, y - 3, 3, 3, P.ink2);
  const top = Math.max(2, Math.round(w * 0.22));
  const hw = Math.floor(w / 2);
  // dome: a rounded trapezoid
  const pts: Pt[] = [[cx - top, y], [cx + top, y], [cx + hw - 1, y + h - 2], [cx + hw, y + h], [cx - hw, y + h], [cx - hw + 1, y + h - 2]];
  p.shape(pts, b);
  p.poly([[cx - top + 1, y + 1], [cx - top + 3, y + 1], [cx - hw + 4, y + h - 1], [cx - hw + 2, y + h - 1]], d);
  p.line(cx + top - 1, y + 2, cx + hw - 3, y + h - 2, l);
  p.px(cx + top - 2, y + 2, hl);
  // the glowing rim seen from below
  p.rect(cx - hw + 1, y + h, w - 1, 1, P.beer4);
  p.rect(cx - hw + 3, y + h + 1, w - 5, 1, P.beer3);
}

/** A warm cone of light below a lamp: lightens what is under it. */
export function lampCone(p: Px, cx: number, y: number, topW: number, bottomW: number, h: number, steps = 1) {
  p.shade([[cx - topW / 2, y], [cx + topW / 2, y], [cx + bottomW / 2, y + h], [cx - bottomW / 2, y + h]], steps);
}

// ─── furniture and wall things ──────────────────────────────────────────────────────────────────────────────

/** The Sparschrank: a wall cabinet with little numbered savings compartments. */
export function sparschrank(p: Px, x: number, y: number, cols = 4, rows = 5, c = 8) {
  const w = cols * c + 7;
  const h = rows * c + 12;
  // crown and body
  p.box(x - 2, y, w + 4, 5, P.wood3);
  p.rect(x - 1, y + 1, w + 2, 1, P.wood4);
  p.box(x, y + 4, w, h - 4, P.wood2);
  p.rect(x + 1, y + 5, 1, h - 6, P.wood3);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const dx = x + 4 + i * c;
      const dy = y + 8 + j * c;
      p.box(dx, dy, c - 1, c - 1, P.wood3, P.wood0);
      p.rect(dx + 1, dy + 1, c - 3, 1, P.wood4);
      p.rect(dx + 2, dy + 3, c - 5, 1, P.ink0);
      p.px(dx + c - 3, dy + c - 3, P.beer2);
    }
  }
  p.box(x - 2, y + h - 1, w + 4, 3, P.wood1);
}

/** A regulator wall clock with a pendulum. */
export function regulator(p: Px, x: number, y: number, s = 1) {
  const w = Math.round(16 * s);
  const h = Math.round(42 * s);
  p.shape([[x, y + 4], [x + Math.floor(w / 2), y], [x + w, y + 4]], P.wood2);
  p.box(x, y + 4, w, h, P.wood1);
  p.rect(x + 1, y + 5, 1, h - 2, P.wood3);
  const cx = x + Math.floor(w / 2);
  const cy = y + 4 + Math.round(8 * s);
  p.oval(cx, cy, Math.round(5 * s), Math.round(5 * s), P.paper4, P.beer0);
  p.line(cx, cy, cx, cy - Math.round(4 * s), P.ink0);
  p.line(cx, cy, cx + Math.round(3 * s), cy + 1, P.ink0);
  const gy = y + Math.round(17 * s);
  p.box(x + 3, gy, w - 6, h - Math.round(16 * s), P.ink2, P.wood0);
  p.line(cx, gy + 1, cx, gy + Math.round(18 * s), P.beer0);
  p.oval(cx, gy + Math.round(20 * s), Math.round(2 * s), Math.round(2 * s), P.beer2, P.beer0);
  p.rect(x - 1, y + h + 3, w + 2, 2, P.wood2);
}

/** A round wall clock (station, canteen). */
export function wallClock(p: Px, cx: number, cy: number, r: number, rim: string = P.ink1, face: string = P.paper4) {
  p.oval(cx, cy, r + 1, r + 1, rim);
  p.ellipse(cx, cy, r - 1, r - 1, face);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const rr = r - 3;
    p.rect(cx + Math.round(Math.cos(a) * rr), cy + Math.round(Math.sin(a) * rr), i % 3 ? 1 : 2, i % 3 ? 1 : 2, P.ink1);
  }
  p.line(cx, cy, cx - Math.round(r * 0.35), cy - Math.round(r * 0.45), P.ink0, r > 8 ? 2 : 1);
  p.line(cx, cy, cx + Math.round(r * 0.1), cy - Math.round(r * 0.75), P.ink0);
  p.line(cx, cy, cx + Math.round(r * 0.55), cy + Math.round(r * 0.3), P.brick1);
  p.px(cx, cy, P.brick1);
}

/** Antlers on an oval wooden shield. */
export function antlers(p: Px, cx: number, cy: number, s = 1) {
  const S = (v: number) => Math.round(v * s);
  p.oval(cx, cy + S(3), S(6), S(8), P.wood3, P.wood0);
  p.ellipse(cx - S(2), cy + S(1), S(2), S(4), P.wood4);
  const bone = P.paper1;
  for (const d of [-1, 1]) {
    const pts: Pt[] = [[cx + d * S(2), cy], [cx + d * S(8), cy - S(6)], [cx + d * S(12), cy - S(16)], [cx + d * S(13), cy - S(24)]];
    p.path(pts, P.ink1, 3);
    p.path(pts, bone, 1);
    for (const [ax, ay, bx, by] of [
      [8, -6, 4, -14],
      [12, -16, 18, -20],
      [11, -12, 6, -20],
    ]) {
      p.line(cx + d * S(ax), cy + S(ay), cx + d * S(bx), cy + S(by), P.ink1, 2);
      p.line(cx + d * S(ax), cy + S(ay), cx + d * S(bx), cy + S(by), bone);
    }
  }
  p.rect(cx - S(2), cy - S(2), S(4) + 1, S(3), P.wood1);
}

/** A framed picture: a little painted landscape, a portrait or a group photo. */
export function picture(p: Px, x: number, y: number, w: number, h: number, kind: "landscape" | "photo" | "portrait" = "landscape", frame: string = P.beer1) {
  p.box(x, y, w, h, frame);
  p.rect(x + 1, y + 1, w - 2, 1, kind === "photo" ? P.wood3 : P.beer3);
  const ix = x + 2;
  const iy = y + 2;
  const iw = w - 4;
  const ih = h - 4;
  if (kind === "landscape") {
    p.grad(ix, iy, iw, ih, [P.river3, P.river4, P.beer4], 2);
    p.poly([[ix, iy + ih], [ix, iy + ih * 0.55], [ix + iw * 0.3, iy + ih * 0.35], [ix + iw * 0.6, iy + ih * 0.6], [ix + iw, iy + ih * 0.45], [ix + iw, iy + ih]], P.forest2);
    p.poly([[ix, iy + ih], [ix, iy + ih * 0.8], [ix + iw, iy + ih * 0.7], [ix + iw, iy + ih]], P.forest3);
  } else if (kind === "photo") {
    p.rect(ix, iy, iw, ih, P.paper1);
    p.rect(ix, iy + Math.round(ih * 0.65), iw, ih - Math.round(ih * 0.65), P.paper0);
    for (let i = 0; i < Math.max(2, Math.floor(iw / 5)); i++) {
      const fx = ix + 2 + i * 5;
      p.rect(fx, iy + Math.round(ih * 0.3), 3, Math.round(ih * 0.6), P.ink4);
      p.rect(fx + 1, iy + Math.round(ih * 0.18), 2, 2, P.ink5);
    }
  } else {
    p.rect(ix, iy, iw, ih, P.olive0);
    p.ellipse(x + Math.floor(w / 2), iy + Math.round(ih * 0.4), Math.max(2, Math.round(iw * 0.22)), Math.max(2, Math.round(ih * 0.2)), P.wood4);
    p.ellipse(x + Math.floor(w / 2), iy + ih, Math.round(iw * 0.4), Math.round(ih * 0.35), P.ink2);
  }
}

/** A wall shelf with bottles and glasses. */
export function bottleShelf(p: Px, x: number, y: number, w: number, opts: { glasses?: boolean } = {}) {
  const cols = [P.forest1, P.beer0, P.river1, P.brick0, P.olive1, P.paper2, P.forest0];
  let bx = x + 2;
  while (bx < x + w - 5) {
    if (opts.glasses && p.rng.chance(0.4)) {
      const gh = p.rng.int(5, 7);
      p.rect(bx, y - gh, 4, gh, P.stone3);
      p.rect(bx + 1, y - gh + 1, 2, gh - 2, P.river5);
      p.rect(bx, y - gh, 4, 1, P.stone4);
      bx += 5;
      continue;
    }
    const bh = p.rng.int(9, 14);
    const c = p.rng.pick(cols);
    p.box(bx, y - bh + 4, 5, bh - 4, c, P.ink0);
    p.rect(bx + 1, y - bh, 3, 5, P.ink0);
    p.rect(bx + 2, y - bh + 1, 1, 4, c);
    p.rect(bx + 1, y - bh + 6, 1, bh - 8, P.stone3);
    if (p.rng.chance(0.5)) p.rect(bx + 1, y - bh + 8, 3, 3, P.paper3);
    bx += 6;
  }
  p.box(x, y, w, 3, P.wood3);
  p.rect(x + 1, y, w - 2, 1, P.wood5);
  p.rect(x + 3, y + 3, 2, 4, P.wood1);
  p.rect(x + w - 5, y + 3, 2, 4, P.wood1);
}

/** A chrome beer tap with two handles on a drip tray. (x, y) = foot on the counter. */
export function beerTap(p: Px, x: number, y: number) {
  p.box(x - 10, y - 2, 21, 3, P.stone2);
  p.box(x - 3, y - 18, 7, 17, P.stone2);
  p.rect(x - 2, y - 17, 2, 15, P.stone4);
  p.box(x - 9, y - 22, 19, 5, P.stone3);
  p.rect(x - 8, y - 21, 17, 1, P.stone4);
  for (const hx of [x - 7, x + 6]) {
    p.rect(hx, y - 17, 2, 6, P.stone1);
    p.box(hx - 1, y - 31, 4, 10, P.ink1);
    p.px(hx, y - 30, P.stone2);
  }
  p.oval(x + 1, y - 34, 2, 2, P.beer2, P.beer0);
}

/** A trophy cup on a little plinth. (cx, baseY) = bottom centre. */
export function trophyCup(p: Px, cx: number, baseY: number, h: number, metal: "gold" | "silver" = "gold") {
  const [d, b, l, hl] = metal === "gold" ? [P.beer0, P.beer1, P.beer2, P.beer4] : [P.stone0, P.stone2, P.stone3, P.stone4];
  const pw = Math.max(5, Math.round(h * 0.5));
  const ph = Math.max(3, Math.round(h * 0.2));
  p.box(cx - Math.floor(pw / 2), baseY - ph, pw, ph, P.wood1);
  p.rect(cx - Math.floor(pw / 2) + 1, baseY - ph + 1, pw - 2, 1, P.wood3);
  const stemTop = baseY - ph - Math.round(h * 0.25);
  p.rect(cx - 1, stemTop, 3, baseY - ph - stemTop, d);
  p.rect(cx - 2, baseY - ph - 2, 5, 2, b);
  const cw = Math.max(4, Math.round(h * 0.32));
  const top = baseY - h;
  p.shape([[cx - cw, top], [cx + cw, top], [cx + Math.round(cw * 0.6), stemTop - 1], [cx - Math.round(cw * 0.6), stemTop - 1]], b);
  p.line(cx + cw - 2, top + 2, cx + Math.round(cw * 0.5), stemTop - 2, d);
  p.line(cx - cw + 2, top + 1, cx - Math.round(cw * 0.5), stemTop - 3, l);
  p.px(cx - cw + 2, top + 1, hl);
  // handles
  for (const s of [-1, 1]) {
    const hx = cx + s * (cw + 2);
    p.line(cx + s * cw, top + 2, hx, top + 3, P.ink0);
    p.line(hx, top + 3, cx + s * Math.round(cw * 0.7), stemTop - 4, P.ink0);
    p.line(cx + s * (cw - 0), top + 3, hx - s, top + 4, b);
  }
  p.rect(cx - cw, top, cw * 2 + 1, 1, l);
}

/** A dartboard with the wire rings and a few darts. */
export function dartboard(p: Px, cx: number, cy: number, r: number) {
  p.oval(cx, cy, r + 2, r + 2, P.ink1);
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y) / r;
      if (d > 1) continue;
      const seg = Math.floor(((Math.atan2(y, x) + Math.PI) / (Math.PI * 2)) * 20 + 0.5) % 20;
      let col: string;
      if (d < 0.08) col = P.brick1;
      else if (d < 0.16) col = P.felt2;
      else if ((d > 0.52 && d < 0.6) || d > 0.9) col = seg % 2 ? P.felt2 : P.brick1;
      else col = seg % 2 ? P.paper3 : P.ink1;
      p.px(cx + x, cy + y, col);
    }
  }
  for (const [dx, dy] of [
    [2, -3],
    [-4, 2],
    [5, 4],
  ]) {
    p.line(cx + dx, cy + dy, cx + dx + 3, cy + dy - 2, P.stone3);
    p.rect(cx + dx + 3, cy + dy - 3, 2, 2, P.brick2);
  }
}

/** Seated background guest seen over a table edge: shoulders, head, an optional hat and a glass. */
export interface Guest {
  coat: string;
  skin?: string;
  hair?: string;
  hat?: "cap" | "hat" | "none" | "bald" | "kerchief";
  /** Raise a glass on this side. */
  glass?: -1 | 0 | 1;
  /** Head turned: -1 left, 1 right (nose pixel). */
  look?: -1 | 0 | 1;
  /** Broad build. */
  wide?: boolean;
}

/** A seated guest; (cx, tableY) = centre on the table edge, h = shoulder-to-crown height in pixels. */
export function guest(p: Px, cx: number, tableY: number, h: number, g: Guest) {
  const skin = g.skin ?? P.brick4;
  const hair = g.hair ?? P.ink3;
  const sw = Math.round(h * (g.wide ? 0.62 : 0.5));
  const headR = Math.max(2, Math.round(h * 0.17));
  const neckY = tableY - Math.round(h * 0.62);
  // body
  p.shape([[cx - sw, tableY], [cx - sw + 2, neckY + 4], [cx - 3, neckY], [cx + 3, neckY], [cx + sw - 2, neckY + 4], [cx + sw, tableY]], g.coat);
  p.shade([[cx + 1, neckY + 1], [cx + sw - 2, neckY + 5], [cx + sw - 1, tableY - 1], [cx + 1, tableY - 1]], -1);
  // head
  const hy = neckY - headR + 1;
  p.oval(cx, hy, headR, headR + 1, skin);
  if (g.look) p.px(cx + g.look * (headR + 1), hy + 1, skin);
  if (g.look) p.rect(cx + g.look * (headR - 1), hy + 1, 1, 1, P.brick2);
  const hat = g.hat ?? "none";
  if (hat === "cap") {
    p.shape([[cx - headR - 1, hy - 1], [cx - headR + 1, hy - headR - 1], [cx + headR - 1, hy - headR - 1], [cx + headR + 1, hy - 1]], P.stone1);
    p.rect(cx + (g.look ?? 1) * headR - 2, hy - 1, 5, 2, P.stone0);
  } else if (hat === "hat") {
    p.rect(cx - headR - 3, hy - 2, headR * 2 + 7, 2, P.olive0);
    p.shape([[cx - headR, hy - 2], [cx - headR + 1, hy - headR - 3], [cx + headR - 1, hy - headR - 3], [cx + headR, hy - 2]], P.olive1);
    p.rect(cx - headR + 1, hy - 4, headR * 2 - 1, 1, P.brick1);
  } else if (hat === "kerchief") {
    p.shape([[cx - headR - 1, hy + 2], [cx - headR, hy - headR], [cx + headR, hy - headR], [cx + headR + 1, hy + 2]], P.brick2);
  } else if (hat === "none") {
    p.ellipse(cx, hy - headR + 1, headR, Math.max(1, Math.round(headR * 0.5)), hair);
  } else {
    p.rect(cx - headR, hy - 1, 1, 3, hair);
    p.rect(cx + headR, hy - 1, 1, 3, hair);
  }
  if (g.glass) {
    const gx = cx + g.glass * (sw - 1);
    const gy = neckY + 2;
    p.line(cx + g.glass * (sw - 3), tableY - 3, gx, gy + 6, g.coat, 3);
    p.box(gx - 2, gy - 4, 5, 8, P.beer2, P.ink1);
    p.rect(gx - 1, gy - 3, 3, 2, P.beer4);
    p.rect(gx - 2, gy + 3, 5, 2, skin);
  }
}

/** A coat hanging from a peg (front view); (x, y) = the peg. */
export function coat(p: Px, x: number, y: number, h: number, col: string) {
  const hw = Math.max(3, Math.round(h * 0.2));
  p.rect(x - 1, y - 1, 3, 3, P.wood0);
  p.shape([[x - 2, y + 1], [x + 2, y + 1], [x + hw, y + 5], [x + hw + 1, y + h], [x - hw - 1, y + h], [x - hw, y + 5]], col);
  p.shade([[x + 1, y + 2], [x + hw - 1, y + 6], [x + hw, y + h - 1], [x + 1, y + h - 1]], -1);
  p.line(x - 2, y + 2, x, y + 8, P.ink1);
  p.line(x + 2, y + 2, x, y + 8, P.ink1);
  p.line(x, y + 8, x, y + h - 1, P.ink1);
  p.line(x - hw + 2, y + 7, x - hw + 2, y + h - 5, P.ink2);
  for (let by = y + 11; by < y + h - 3; by += 6) p.px(x + 1, by, P.stone2);
}

/** A felt hat (Trachtenhut) seen from the side; (cx, y) = the brim centre. */
export function feltHat(p: Px, cx: number, y: number, col: string = P.olive1) {
  p.ellipse(cx, y, 7, 2, P.olive0);
  p.shape([[cx - 5, y - 1], [cx - 4, y - 7], [cx + 4, y - 7], [cx + 5, y - 1]], col);
  p.rect(cx - 4, y - 3, 9, 1, P.brick1);
  p.px(cx + 4, y - 8, P.paper3);
  p.px(cx + 5, y - 9, P.paper3);
}

export interface Figure {
  coat: string;
  legs?: string;
  skin?: string;
  hair?: string;
  hat?: "cap" | "hat" | "none" | "bald" | "kerchief" | "helmet";
  /** Arm pose on the facing side. */
  arm?: "down" | "raise" | "throw" | "glass" | "hips";
  facing?: -1 | 1;
  wide?: boolean;
  /** Skirt instead of trousers. */
  skirt?: boolean;
  apron?: string;
}

/** A standing background figure (no face detail): (cx, footY) bottom centre, h total height in pixels. */
export function figure(p: Px, cx: number, footY: number, h: number, f: Figure) {
  const skin = f.skin ?? P.brick4;
  const dir = f.facing ?? 1;
  const headR = Math.max(2, Math.round(h * 0.08));
  const sw = Math.max(3, Math.round(h * (f.wide ? 0.17 : 0.13)));
  const hipY = footY - Math.round(h * 0.47);
  const neckY = footY - Math.round(h * 0.82);
  const legs = f.legs ?? P.ink2;
  // legs or skirt
  if (f.skirt) {
    p.shape([[cx - sw + 1, hipY], [cx + sw - 1, hipY], [cx + sw + 1, footY - Math.round(h * 0.18)], [cx - sw - 1, footY - Math.round(h * 0.18)]], f.coat);
    p.rect(cx - 3, footY - Math.round(h * 0.18), 2, Math.round(h * 0.18) - 1, skin);
    p.rect(cx + 1, footY - Math.round(h * 0.18), 2, Math.round(h * 0.18) - 1, skin);
  } else {
    const lw = Math.max(2, Math.round(sw * 0.7));
    p.box(cx - lw - 1, hipY, lw + 1, footY - hipY, legs, P.ink0);
    p.box(cx, hipY, lw + 1, footY - hipY, legs, P.ink0);
  }
  p.rect(cx - sw + (dir > 0 ? 1 : -1), footY - 2, sw, 2, P.ink0);
  p.rect(cx + (dir > 0 ? 2 : -2), footY - 2, sw, 2, P.ink0);
  // torso
  p.shape([[cx - sw, hipY + 1], [cx - sw, neckY + 3], [cx - 2, neckY], [cx + 2, neckY], [cx + sw, neckY + 3], [cx + sw, hipY + 1]], f.coat);
  if (f.apron) p.rect(cx - sw + 2, neckY + 6, sw * 2 - 3, hipY - neckY + 4, f.apron);
  p.shade([[cx + 1, neckY + 2], [cx + sw - 1, neckY + 4], [cx + sw - 1, hipY], [cx + 1, hipY]], -1);
  // arms
  const sx = cx + dir * sw;
  const arm = f.arm ?? "down";
  const aw = Math.max(2, Math.round(h * 0.06));
  if (arm === "down") p.line(sx, neckY + 4, sx + dir, hipY + 2, f.coat, aw);
  else if (arm === "raise") p.line(sx, neckY + 4, sx + dir * 4, neckY - Math.round(h * 0.18), f.coat, aw);
  else if (arm === "throw") {
    p.line(sx, neckY + 4, sx + dir * 6, neckY - 4, f.coat, aw);
    p.rect(sx + dir * 6 - 1, neckY - 6, 3, 3, skin);
  } else if (arm === "glass") {
    p.line(sx, neckY + 4, sx + dir * 5, neckY + 10, f.coat, aw);
    p.box(sx + dir * 5 - 2, neckY + 4, 5, 7, P.beer2, P.ink1);
  } else p.line(sx, neckY + 4, sx + dir * 4, hipY - 4, f.coat, aw);
  p.line(cx - dir * sw, neckY + 4, cx - dir * (sw + 1), hipY + 2, f.coat, aw);
  // head
  const hy = neckY - headR;
  p.oval(cx, hy, headR, headR + 1, skin);
  p.px(cx + dir * (headR + 1), hy + 1, skin);
  const hat = f.hat ?? "none";
  if (hat === "cap") {
    p.shape([[cx - headR - 1, hy - 1], [cx - headR + 1, hy - headR - 1], [cx + headR - 1, hy - headR - 1], [cx + headR + 1, hy - 1]], P.stone1);
    p.rect(cx + dir * headR - 1, hy - 1, 4, 2, P.stone0);
  } else if (hat === "hat") {
    p.rect(cx - headR - 2, hy - 2, headR * 2 + 5, 2, P.olive0);
    p.rect(cx - headR + 1, hy - headR - 3, headR * 2 - 1, headR + 2, P.olive1);
  } else if (hat === "helmet") {
    p.ellipse(cx, hy - 1, headR + 1, headR + 1, P.brick2);
    p.rect(cx - headR - 1, hy, headR * 2 + 3, 2, P.brick1);
  } else if (hat === "kerchief") {
    p.ellipse(cx, hy - 1, headR + 1, headR, P.brick2);
  } else if (hat === "none") p.ellipse(cx - dir, hy - headR + 1, headR, Math.max(1, Math.round(headR * 0.6)), f.hair ?? P.ink3);
}

/** A stack of beer crates with bottle tops. (x, baseY) bottom left. */
export function crates(p: Px, x: number, baseY: number, n: number, w = 16, h = 9, col: string = P.brick1) {
  for (let i = 0; i < n; i++) {
    const y = baseY - (i + 1) * h;
    const c = i % 2 ? col : P.forest1;
    p.box(x, y, w, h, c);
    p.rect(x + 1, y + 1, w - 2, 1, P.ink1);
    p.rect(x + 3, y + 4, w - 6, 2, P.ink1);
    if (i === n - 1) for (let bx = x + 2; bx < x + w - 2; bx += 3) p.rect(bx, y - 2, 2, 2, P.beer1);
  }
}

