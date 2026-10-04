// Outdoor kit for the painted backdrops: evening skies, the sun and clouds, noise ridges for hills, cel foliage,
// Fachwerk houses, a village church, terraced vineyards on steep slopes, fields, water, roads and fences.
// Warm evening light comes from the left (the sun sets in the west over the Enz valley).
import { P, Px, type Fill, type Pt } from "./painter";
import { Rng } from "../../core/rng";

// ─── noise ──────────────────────────────────────────────────────────────────────────────────────────────────

function hash1(i: number, seed: number): number {
  let h = (i * 374761393 + seed * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth 1-D value noise in 0…1. */
export function noise(x: number, seed = 1): number {
  const i = Math.floor(x);
  const f = x - i;
  const t = f * f * (3 - 2 * f);
  return hash1(i, seed) * (1 - t) + hash1(i + 1, seed) * t;
}

/** Fractal noise (3 octaves) in about 0…1. */
export function fbm(x: number, seed = 1): number {
  return (noise(x, seed) * 0.6 + noise(x * 2.1, seed + 7) * 0.28 + noise(x * 4.3, seed + 13) * 0.12) / 1.0;
}

// ─── sky ────────────────────────────────────────────────────────────────────────────────────────────────────

export type SkyKind = "sunset" | "dusk" | "evening" | "night" | "late";

const SKIES: Record<SkyKind, { cols: string[]; stops: number[] }> = {
  sunset: { cols: [P.dusk1, P.dusk2, P.dusk3, P.brick4, P.beer3, P.beer4], stops: [0, 0.3, 0.52, 0.72, 0.9, 1] },
  dusk: { cols: [P.dusk0, P.dusk1, P.dusk2, P.dusk3, P.brick4], stops: [0, 0.35, 0.6, 0.85, 1] },
  evening: { cols: [P.river1, P.river2, P.dusk3, P.brick4, P.beer3], stops: [0, 0.3, 0.62, 0.85, 1] },
  night: { cols: [P.ink1, P.dusk0, P.dusk1, P.dusk2], stops: [0, 0.45, 0.8, 1] },
  late: { cols: [P.dusk0, P.dusk1, P.dusk2, P.brick3, P.beer2], stops: [0, 0.4, 0.7, 0.9, 1] },
};

/** An evening sky gradient with dithered seams; stars for the darker kinds. */
export function sky(p: Px, y: number, h: number, kind: SkyKind = "sunset", x = 0, w = 640) {
  const s = SKIES[kind];
  p.grad(x, y, w, h, s.cols, Math.max(6, Math.round(h / 14)), s.stops);
  if (kind === "night" || kind === "dusk" || kind === "late") {
    const r = new Rng(`stars${kind}${y}`);
    const n = kind === "night" ? 70 : 26;
    for (let i = 0; i < n; i++) {
      const sx = x + r.int(0, w - 1);
      const sy = y + r.int(0, Math.round(h * 0.45));
      p.px(sx, sy, r.chance(0.2) ? P.beer4 : P.dusk4);
    }
  }
}

/** The low evening sun with a dithered halo. */
export function sun(p: Px, cx: number, cy: number, r: number) {
  p.ellipse(cx, cy, r * 3, Math.round(r * 2.2), p.pat(null, P.beer3, 0.25));
  p.ellipse(cx, cy, Math.round(r * 1.8), Math.round(r * 1.5), p.pat(null, P.beer3, 0.5));
  p.ellipse(cx, cy, r, r, P.beer3);
  p.ellipse(cx, cy, r - 2, r - 2, P.beer4);
}

/** A sunset cloud streak: dusky body, the underside lit warm. */
export function cloud(p: Px, x: number, y: number, w: number, h = 6, body: string = P.dusk1, lit: string = P.brick3) {
  const r = new Rng(`cloud${x},${y},${w}`);
  const n = Math.max(2, Math.round(w / 14));
  for (let i = 0; i < n; i++) {
    const cx = x + Math.round(((i + 0.5) * w) / n) + r.int(-3, 3);
    const rx = Math.round(w / n / 1.3) + r.int(0, 5);
    const ry = Math.max(2, h - r.int(0, Math.round(h / 2)));
    p.ellipse(cx, y - ry + h, rx, ry, body);
  }
  p.rect(x + 2, y + h, w - 4, 1, lit);
  for (let i = 0; i < n; i++) {
    const cx = x + Math.round(((i + 0.5) * w) / n);
    p.rect(cx - Math.round(w / n / 2), y + h - 1, Math.round(w / n / 1.2), 1, lit);
  }
}

// ─── hills ──────────────────────────────────────────────────────────────────────────────────────────────────

export interface RidgeOpts {
  /** Lowest row to fill to. */
  bottom?: number;
  /** Rim line on top (rim light or ink), drawn 1 px. */
  rim?: string | null;
  seed?: number;
  /** Extra shape: added to the height at each x. */
  bias?: (x: number) => number;
  x0?: number;
  x1?: number;
}

/** A noise ridge: top(x) = base − amp·fbm(x/scale) − bias(x). Fills down to `bottom`; returns the top line. */
export function ridge(p: Px, base: number, amp: number, scale: number, fill: Fill, o: RidgeOpts = {}): (x: number) => number {
  const seed = o.seed ?? 1;
  const bottom = o.bottom ?? 360;
  const x0 = o.x0 ?? 0;
  const x1 = o.x1 ?? 640;
  const tops: number[] = [];
  for (let x = x0; x < x1; x++) {
    const t = Math.round(base - amp * fbm(x / scale, seed) - (o.bias ? o.bias(x) : 0));
    tops.push(t);
    p.rect(x, t, 1, bottom - t, fill);
  }
  if (o.rim) for (let x = x0; x < x1; x++) p.px(x, tops[x - x0], o.rim);
  return (x: number) => tops[Math.max(0, Math.min(tops.length - 1, Math.round(x) - x0))];
}

// ─── vegetation ─────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A cel foliage blob made of overlapping lobes: ink rim, dark body, mid tone shifted toward the light (left, up),
 * light flecks, leaf speckle. cols = [dark, mid, light].
 */
export function foliage(p: Px, cx: number, cy: number, rx: number, ry: number, cols: [string, string, string] = [P.forest1, P.forest2, P.forest3], seed = 1, ink: string | null = P.ink1) {
  const r = new Rng(`fol${seed},${cx},${cy}`);
  const n = Math.max(4, Math.round((rx + ry) / 4));
  const lobes: [number, number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r.range(-0.3, 0.3);
    const d = r.range(0.35, 0.7);
    lobes.push([cx + Math.round(Math.cos(a) * rx * d), cy + Math.round(Math.sin(a) * ry * d), Math.round(rx * r.range(0.4, 0.6)), Math.round(ry * r.range(0.4, 0.6))]);
  }
  lobes.push([cx, cy, Math.round(rx * 0.7), Math.round(ry * 0.7)]);
  if (ink) for (const [x, y, a, b] of lobes) p.ellipse(x, y, a + 1, b + 1, ink);
  for (const [x, y, a, b] of lobes) p.ellipse(x, y, a, b, cols[0]);
  for (const [x, y, a, b] of lobes) p.ellipse(x - Math.round(a * 0.25), y - Math.round(b * 0.3), Math.round(a * 0.75), Math.round(b * 0.7), cols[1]);
  for (const [x, y, a, b] of lobes) if (r.chance(0.6)) p.ellipse(x - Math.round(a * 0.45), y - Math.round(b * 0.5), Math.max(1, Math.round(a * 0.35)), Math.max(1, Math.round(b * 0.3)), cols[2]);
  // leaf texture
  const k = Math.round(rx * ry * 0.12);
  for (let i = 0; i < k; i++) {
    const x = cx + r.int(-rx, rx);
    const y = cy + r.int(-ry, ry);
    const c = p.get(x, y);
    if (!c) continue;
    p.px(x, y, r.chance(0.5) ? cols[0] : cols[2]);
  }
}

/** A deciduous tree: trunk with a fork, a cel crown. */
export function roundTree(p: Px, x: number, baseY: number, h: number, cols: [string, string, string] = [P.forest1, P.forest2, P.forest3], seed = 1) {
  const tw = Math.max(2, Math.round(h * 0.07));
  p.box(x - Math.floor(tw / 2), baseY - Math.round(h * 0.5), tw, Math.round(h * 0.5) + 1, P.wood1, P.ink1);
  p.line(x, baseY - Math.round(h * 0.45), x - Math.round(h * 0.12), baseY - Math.round(h * 0.62), P.wood1, Math.max(1, tw - 1));
  p.line(x, baseY - Math.round(h * 0.45), x + Math.round(h * 0.1), baseY - Math.round(h * 0.65), P.wood1, Math.max(1, tw - 1));
  foliage(p, x, baseY - Math.round(h * 0.68), Math.round(h * 0.36), Math.round(h * 0.3), cols, seed);
}

/** A horse chestnut: broad dark crown with pale flower candles. */
export function chestnut(p: Px, x: number, baseY: number, h: number, seed = 1) {
  const tw = Math.max(3, Math.round(h * 0.09));
  p.box(x - Math.floor(tw / 2), baseY - Math.round(h * 0.55), tw, Math.round(h * 0.55) + 1, P.wood1, P.ink0);
  p.rect(x - Math.floor(tw / 2) + 1, baseY - Math.round(h * 0.55), 1, Math.round(h * 0.55), P.wood2);
  foliage(p, x, baseY - Math.round(h * 0.72), Math.round(h * 0.45), Math.round(h * 0.32), [P.forest0, P.forest1, P.forest2], seed);
  const r = new Rng(`candles${seed}`);
  for (let i = 0; i < Math.round(h * 0.6); i++) {
    const cx = x + r.int(-Math.round(h * 0.38), Math.round(h * 0.38));
    const cy = baseY - Math.round(h * 0.72) + r.int(-Math.round(h * 0.26), Math.round(h * 0.22));
    if (p.get(cx, cy) && p.get(cx, cy + 2)) {
      p.px(cx, cy, P.paper4);
      p.px(cx, cy + 1, P.paper3);
    }
  }
}

/** A Lombardy poplar. */
export function poplar(p: Px, x: number, baseY: number, h: number, cols: [string, string, string] = [P.forest1, P.forest2, P.forest3]) {
  p.rect(x - 1, baseY - Math.round(h * 0.2), 2, Math.round(h * 0.2), P.wood1);
  foliage(p, x, baseY - Math.round(h * 0.55), Math.max(3, Math.round(h * 0.13)), Math.round(h * 0.42), cols, x, P.ink1);
}

/** Jagged fir-forest silhouette on top of a ridge line: little spikes every few pixels. */
export function firEdge(p: Px, top: (x: number) => number, col: string, x0 = 0, x1 = 640, h = 5, seed = 1) {
  for (let x = x0; x < x1; x += 3) {
    const t = top(x);
    const hh = h + Math.round(noise(x * 0.3, seed) * h);
    p.poly([[x - 2, t + 2], [x + 1, t - hh], [x + 3, t + 2]], col);
  }
}

/** A fir with layered boughs and a lit left edge. */
export function fir(p: Px, x: number, baseY: number, h: number, cols: [string, string, string] = [P.forest0, P.forest1, P.forest2], ink: string | null = P.ink0) {
  p.rect(x - 1, baseY - Math.round(h * 0.12), 3, Math.round(h * 0.12) + 1, P.wood0);
  const tiers = Math.max(3, Math.min(9, Math.round(h / 7)));
  for (let i = 0; i < tiers; i++) {
    const t0 = i / tiers;
    const ty = baseY - Math.round(h * 0.1) - Math.round((h * 0.9 * i) / tiers);
    const hw = Math.max(1, Math.round(h * 0.3 * (1 - t0 * 0.85)));
    const th = Math.round((h * 0.9) / tiers) + 3;
    // bough with a drooping, jagged lower edge
    const pts: Pt[] = [[x, ty - th]];
    const teeth = Math.max(1, Math.round(hw / 3));
    for (let k = teeth; k >= -teeth; k--) {
      const bx = x + Math.round((hw * k) / teeth);
      pts.push([bx, ty + (k % 2 === 0 ? 1 : -1) + Math.round(Math.abs(k / teeth) * 2)]);
    }
    if (ink) p.shape(pts, cols[0], ink);
    else p.poly(pts, cols[0]);
    p.poly([[x - Math.round(hw * 0.75), ty - 1], [x, ty - 2], [x, ty - th + 2]], cols[1]);
    p.line(x - hw + 2, ty - 1, x - 1, ty - th + 2, cols[2]);
  }
}

/** A small fruit tree for orchards (Streuobstwiese). */
export function fruitTree(p: Px, x: number, baseY: number, h: number, seed = 1, fruit: string | null = P.brick2) {
  p.box(x - 1, baseY - Math.round(h * 0.45), 3, Math.round(h * 0.45) + 1, P.wood1, P.ink1);
  foliage(p, x, baseY - Math.round(h * 0.62), Math.round(h * 0.42), Math.round(h * 0.3), [P.forest1, P.forest2, P.forest4], seed);
  if (fruit) {
    const r = new Rng(`fruit${seed}`);
    for (let i = 0; i < 5; i++) p.px(x + r.int(-Math.round(h * 0.3), Math.round(h * 0.3)), baseY - Math.round(h * 0.62) + r.int(-4, 4), fruit);
  }
}

// ─── vineyards and fields ───────────────────────────────────────────────────────────────────────────────────

export interface VineOpts {
  /** Rows run down the slope with this x drift per row of height (slant), spacing `gap`. */
  gap?: number;
  slant?: number;
  /** Dry-stone terrace walls every `terrace` rows (0 = none), tilted by `tilt` px per px. */
  terrace?: number;
  tilt?: number;
  /** Lighter on the left (sunlit slope). */
  lit?: boolean;
  /** Distance haze: fewer details. */
  far?: boolean;
}

/** A vineyard on a steep slope: rows of vines down the hill, dry-stone terrace walls across it. */
export function vineyard(p: Px, pts: Pt[], o: VineOpts = {}) {
  const gap = o.gap ?? 3;
  const slant = o.slant ?? 0.35;
  const ter = o.terrace ?? 9;
  const tilt = o.tilt ?? 0.08;
  const far = !!o.far;
  const leaf = o.lit ? P.forest3 : P.forest2;
  const leafLit = o.lit ? P.forest4 : P.forest3;
  const soil = o.lit ? P.olive2 : P.olive1;
  p.texture(pts, (x, y) => {
    if (ter) {
      const v = (((y + x * tilt) % ter) + ter) % ter;
      if (v < 1) return far ? P.stone2 : P.stone3;
      if (v < 2) return far ? P.stone1 : P.stone1;
    }
    const u = (((x + y * slant) % gap) + gap) % gap;
    if (u < 1) return far ? leaf : (x + y) % 3 === 0 ? leafLit : leaf;
    if (u < 2 && !far) return P.forest1;
    return soil;
  });
}

/** A field or meadow with furrows (`dir` px drift per row). */
export function field(p: Px, pts: Pt[], base: string, line: string, gap = 4, dir = 0.6) {
  p.texture(pts, (x, y) => ((((x + y * dir) % gap) + gap) % gap < 1 ? line : base));
}

/** Water: sky reflections in horizontal streaks with a lit glitter path (cx = sun x or null). */
export function water(p: Px, pts: Pt[], cols: [string, string, string] = [P.river1, P.dusk2, P.brick4], glitterX: number | null = null) {
  const r = new Rng("water");
  p.texture(pts, (x, y) => {
    const n = noise(x * 0.08 + y * 1.7, y) + (y % 3 === 0 ? 0.15 : 0);
    if (glitterX !== null && Math.abs(x - glitterX) < 6 + (y % 7) && n > 0.55) return P.beer3;
    if (n > 0.86) return cols[2];
    if (n > 0.62) return cols[1];
    return cols[0];
  });
  void r;
}

// ─── buildings ──────────────────────────────────────────────────────────────────────────────────────────────

export interface HouseOpts {
  /** Gable height. */
  roofH?: number;
  /** Gable faces us (true, typical Fachwerk) or the eaves (false). */
  gable?: boolean;
  wall?: string;
  beam?: string;
  roof?: string;
  storeys?: number;
  /** Chance of a lit window. */
  lit?: number;
  shutters?: string | null;
  /** Show timber framing on the upper floors. */
  timber?: boolean;
  /** Oblique side depth in px (side wall on the right, in shade). Negative = side on the left. */
  depth?: number;
  chimney?: boolean;
  seed?: number;
  /** Flower boxes under the windows. */
  flowers?: boolean;
}

/** A Swabian Fachwerk house; (x, baseY) = bottom left of the front wall. Returns its roof apex. */
export function house(p: Px, x: number, baseY: number, w: number, wallH: number, o: HouseOpts = {}): Pt {
  const r = new Rng(`house${o.seed ?? 0},${x},${baseY}`);
  const roofH = o.roofH ?? Math.round(w * 0.75);
  const wall = o.wall ?? P.paper3;
  const beam = o.beam ?? P.wood1;
  const roof = o.roof ?? P.brick1;
  const roofLit = roof === P.brick1 ? P.brick2 : roof === P.brick0 ? P.brick1 : roof === P.stone0 ? P.stone1 : P.brick2;
  const storeys = o.storeys ?? 2;
  const gable = o.gable ?? true;
  const depth = o.depth ?? Math.round(w * 0.35);
  const top = baseY - wallH;
  const sh = wallH / storeys;
  const ink = P.ink1;

  // side wall and side roof (oblique), in shade
  if (depth) {
    const d = depth;
    const dy = Math.round(Math.abs(d) * 0.45);
    const sx = d > 0 ? x + w : x;
    p.shape([[sx, baseY], [sx, top], [sx + d, top - dy], [sx + d, baseY - dy]], wall, ink);
    p.shade([[sx, baseY], [sx, top], [sx + d, top - dy], [sx + d, baseY - dy]], -2);
    if (gable) {
      const ax = x + Math.round(w / 2);
      const ay = top - roofH;
      const ex = d > 0 ? x + w + 2 : x - 2;
      p.shape([[ax, ay], [ex, top + 1], [ex + d, top + 1 - dy], [ax + d, ay - dy]], roof, ink);
      for (let k = 3; k < roofH; k += 3) {
        const t = k / roofH;
        const lx = Math.round(ax + (ex - ax) * t);
        const ly = Math.round(ay + (top + 1 - ay) * t);
        p.line(lx, ly, lx + d, ly - dy, P.brick0);
      }
    }
  }

  // front wall
  p.box(x, top, w, wallH, wall, ink);
  // ground floor plinth
  p.rect(x + 1, baseY - 3, w - 2, 2, P.stone1);

  // roof
  let apex: Pt;
  if (gable) {
    const ax = x + Math.round(w / 2);
    const ay = top - roofH;
    apex = [ax, ay];
    p.shape([[x - 1, top], [ax, ay], [x + w + 1, top]], wall, ink);
    // verge boards / tiled edge
    p.line(x - 3, top + 1, ax, ay - 2, roof, 3);
    p.line(ax, ay - 2, x + w + 3, top + 1, roof, 3);
    p.line(x - 4, top + 2, ax, ay - 4, ink);
    p.line(ax, ay - 4, x + w + 4, top + 2, ink);
    p.line(x - 2, top + 1, ax, ay - 1, roofLit);
  } else {
    const rt = top - roofH;
    apex = [x + Math.round(w / 2), rt];
    p.shape([[x - 3, top + 1], [x + w + 3, top + 1], [x + w - 1, rt], [x + 1, rt]], roof, ink);
    for (let yy = rt + 2; yy < top; yy += 3) p.line(x + 1, yy, x + w - 1, yy, P.brick0);
    p.line(x + 2, rt + 1, x + w - 2, rt + 1, roofLit);
  }

  // timber framing on the upper storeys and the gable
  if (o.timber !== false) {
    const tw = 1;
    for (let s = 1; s < storeys; s++) {
      const y0 = Math.round(top + (storeys - s - 1) * sh);
      const y1 = Math.round(top + (storeys - s) * sh);
      p.rect(x + 1, y1 - 1, w - 2, 2, beam);
      p.rect(x + 1, y0, w - 2, 1, beam);
      const posts = Math.max(2, Math.round(w / 9));
      for (let k = 0; k <= posts; k++) {
        const px = Math.round(x + 1 + ((w - 3) * k) / posts);
        p.rect(px, y0, tw + 1, y1 - y0, beam);
      }
      // braces in the outer fields ("Schwäbischer Mann")
      const f = Math.round((w - 3) / posts);
      p.line(x + 2, y1 - 2, x + 1 + f, y0 + 1, beam);
      p.line(x + w - 3, y1 - 2, x + w - 2 - f, y0 + 1, beam);
    }
    if (gable) {
      const ax = x + Math.round(w / 2);
      p.rect(ax - 1, top - roofH + 3, 2, roofH - 3, beam);
      const cy = top - Math.round(roofH * 0.45);
      const half = Math.round((w / 2) * 0.45);
      p.rect(ax - half, cy, half * 2, 1, beam);
      p.line(ax - 1, top - 1, ax - half, cy + 1, beam);
      p.line(ax + 1, top - 1, ax + half, cy + 1, beam);
      p.rect(x + 1, top, w - 2, 1, beam);
    }
  }

  // windows
  const lit = o.lit ?? 0.4;
  const winW = Math.max(3, Math.round(w / 9));
  const winH = Math.max(4, Math.round(sh * 0.45));
  for (let s = 0; s < storeys; s++) {
    const wy = Math.round(baseY - (s + 1) * sh + sh * 0.3);
    const n = Math.max(1, Math.round(w / (winW * 3)));
    for (let k = 0; k < n; k++) {
      const wx = Math.round(x + ((k + 0.5) * w) / n - winW / 2);
      if (s === 0 && k === Math.floor(n / 2) && w > 20) {
        // the door
        p.box(wx, baseY - Math.round(sh * 0.75), winW + 1, Math.round(sh * 0.75), P.wood2, ink);
        p.rect(wx + 1, baseY - Math.round(sh * 0.75) + 1, winW - 1, 1, P.wood3);
        continue;
      }
      const on = r.chance(lit);
      p.box(wx - 1, wy - 1, winW + 2, winH + 2, P.paper4, ink);
      p.rect(wx, wy, winW, winH, on ? P.beer3 : P.river1);
      if (on) p.rect(wx, wy, winW, 1, P.beer4);
      else p.rect(wx, wy, 1, winH, P.river2);
      p.rect(wx + Math.floor(winW / 2), wy, 1, winH, P.paper4);
      if (o.shutters !== null) {
        const sc = o.shutters ?? P.forest2;
        p.rect(wx - 3, wy - 1, 2, winH + 2, sc);
        p.rect(wx + winW + 1, wy - 1, 2, winH + 2, sc);
      }
      if (o.flowers) {
        p.rect(wx - 1, wy + winH + 1, winW + 2, 2, P.brick1);
        p.px(wx, wy + winH, P.brick3);
        p.px(wx + winW - 1, wy + winH, P.brick3);
      }
    }
  }
  if (o.chimney) {
    const cx = gable ? x + Math.round(w * 0.65) : x + Math.round(w * 0.7);
    const cy = gable ? top - Math.round(roofH * 0.45) : top - roofH;
    p.box(cx, cy - 6, 4, 8, P.brick2, ink);
    p.rect(cx - 1, cy - 7, 6, 2, P.stone1);
  }
  return apex;
}

/** A tiny distant house (for villages across the valley). */
export function hut(p: Px, x: number, baseY: number, w: number, h: number, roof: string = P.brick1, wall: string = P.paper2, lit = false) {
  const rh = Math.round(w * 0.6);
  p.rect(x, baseY - h, w, h, wall);
  p.poly([[x - 1, baseY - h], [x + Math.round(w / 2), baseY - h - rh], [x + w + 1, baseY - h]], roof);
  p.rect(x + w - 2, baseY - h, 2, h, P.ink3);
  if (lit) p.px(x + Math.round(w / 3), baseY - Math.round(h / 2), P.beer3);
}

/** A village church: tower with clock and spire, a long nave. (cx, baseY) = bottom centre of the tower. */
export function church(p: Px, cx: number, baseY: number, s = 1, opts: { wall?: string; spire?: string; nave?: -1 | 1 } = {}) {
  const S = (v: number) => Math.max(1, Math.round(v * s));
  const wall = opts.wall ?? P.paper3;
  const spire = opts.spire ?? P.stone0;
  const nd = opts.nave ?? 1;
  const tw = S(14);
  const th = S(46);
  // nave
  const nx = nd > 0 ? cx + Math.floor(tw / 2) : cx - Math.floor(tw / 2) - S(40);
  house(p, nx, baseY, S(40), S(20), { gable: false, roofH: S(12), wall, timber: false, shutters: null, lit: 0.6, depth: 0, storeys: 1 });
  // tall windows on the nave
  for (let k = 0; k < 3; k++) {
    const wx = nx + S(6) + k * S(12);
    p.box(wx, baseY - S(17), S(5), S(11), P.beer2, P.ink1);
    p.rect(wx + 1, baseY - S(17) + 1, S(5) - 2, 1, P.beer4);
  }
  // tower
  const tx = cx - Math.floor(tw / 2);
  p.box(tx, baseY - th, tw, th, wall, P.ink1);
  p.shade([[tx + Math.round(tw * 0.6), baseY - th + 1], [tx + tw - 1, baseY - th + 1], [tx + tw - 1, baseY - 1], [tx + Math.round(tw * 0.6), baseY - 1]], -1);
  p.rect(tx + 1, baseY - th + S(8), tw - 2, 1, P.paper1);
  // belfry openings and the clock
  p.box(tx + S(3), baseY - th + S(2), S(3), S(5), P.ink2, P.ink1);
  p.box(tx + tw - S(6), baseY - th + S(2), S(3), S(5), P.ink2, P.ink1);
  p.oval(cx, baseY - th + S(13), S(3), S(3), P.paper4, P.ink1);
  p.px(cx, baseY - th + S(12), P.ink0);
  p.px(cx + 1, baseY - th + S(13), P.ink0);
  p.box(cx - S(2), baseY - S(9), S(5), S(9), P.wood2, P.ink1);
  // spire
  p.shape([[tx - 1, baseY - th], [cx, baseY - th - S(30)], [tx + tw, baseY - th]], spire, P.ink1);
  p.line(tx + 1, baseY - th - 1, cx, baseY - th - S(28), spire === P.stone0 ? P.stone1 : P.brick2);
  p.rect(cx, baseY - th - S(36), 1, S(6), P.beer1);
  p.rect(cx - 1, baseY - th - S(34), 3, 1, P.beer1);
  p.px(cx, baseY - th - S(37), P.beer3);
}

// ─── ground things ──────────────────────────────────────────────────────────────────────────────────────────

/** A wooden fence: posts and two rails. */
export function fence(p: Px, x0: number, x1: number, baseY: number, h: number, col: string = P.wood2, gap = 12) {
  for (let x = x0; x <= x1; x += gap) {
    p.box(x, baseY - h, 3, h, col, P.ink1);
    p.px(x + 1, baseY - h + 1, P.wood4);
  }
  for (const k of [0.3, 0.7]) {
    const y = baseY - Math.round(h * k);
    p.rect(x0, y - 1, x1 - x0 + 3, 3, P.ink1);
    p.rect(x0, y, x1 - x0 + 3, 1, col);
  }
}

/** A park bench in side-ish front view. */
export function bench(p: Px, x: number, baseY: number, w = 30) {
  p.box(x, baseY - 9, w, 3, P.wood3, P.ink1);
  p.box(x + 1, baseY - 17, w - 2, 3, P.wood3, P.ink1);
  p.box(x + 1, baseY - 13, w - 2, 3, P.wood2, P.ink1);
  for (const lx of [x + 3, x + w - 5]) {
    p.rect(lx, baseY - 17, 2, 17, P.ink1);
  }
}

/** Gravel or a dirt path: base colour with pebble speckle, darker with depth. */
export function gravel(p: Px, pts: Pt[], base: string = P.paper1, pebbles: string[] = [P.paper0, P.paper2, P.stone2]) {
  const r = new Rng("gravel");
  p.texture(pts, (x, y) => {
    const v = hash1(x * 7919 + y * 104729, 3);
    if (v < 0.08) return pebbles[0];
    if (v < 0.12) return pebbles[1 % pebbles.length];
    if (v < 0.14) return pebbles[2 % pebbles.length];
    return base;
  });
  void r;
}

/** Grass with blades: base plus darker and lighter flecks. */
export function grass(p: Px, pts: Pt[], cols: [string, string, string] = [P.forest2, P.forest1, P.forest3]) {
  p.texture(pts, (x, y) => {
    const v = hash1(x * 7919 + y * 104729, 5);
    if (v < 0.07) return cols[1];
    if (v < 0.12) return cols[2];
    return cols[0];
  });
}

/** A band along a centre line (rivers, roads) whose width goes from w0 at the first point to w1 at the last. */
export function ribbon(centre: Pt[], w0: number, w1: number): Pt[] {
  const left: Pt[] = [];
  const right: Pt[] = [];
  const n = centre.length;
  for (let i = 0; i < n; i++) {
    const [x, y] = centre[i];
    const [ax, ay] = centre[Math.max(0, i - 1)];
    const [bx, by] = centre[Math.min(n - 1, i + 1)];
    let dx = bx - ax;
    let dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const w = (w0 + ((w1 - w0) * i) / Math.max(1, n - 1)) / 2;
    left.push([Math.round(x - dy * w), Math.round(y + dx * w)]);
    right.push([Math.round(x + dy * w), Math.round(y - dx * w)]);
  }
  return [...left, ...right.reverse()];
}

/** Smooth a polyline with Chaikin corner cutting (k rounds). */
export function smooth(pts: Pt[], k = 2): Pt[] {
  let a = pts;
  for (let r = 0; r < k; r++) {
    const b: Pt[] = [a[0]];
    for (let i = 0; i + 1 < a.length; i++) {
      const [x0, y0] = a[i];
      const [x1, y1] = a[i + 1];
      b.push([x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25]);
      b.push([x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75]);
    }
    b.push(a[a.length - 1]);
    a = b;
  }
  return a;
}

/** A folding camping chair in front view (striped back, crossed legs); (x, baseY) bottom left. ≈ 14×24 at sc 1. */
export function campChair(p: Px, x: number, baseY: number, col: [string, string] = [P.river2, P.paper3], sc = 1) {
  const S = (v: number) => Math.round(v * sc);
  const w = S(14);
  const seat = baseY - S(9);
  p.line(x + 1, baseY, x + w - 1, seat + 1, P.ink1, Math.max(1, S(1.2)));
  p.line(x + w - 1, baseY, x + 1, seat + 1, P.ink1, Math.max(1, S(1.2)));
  p.line(x + 1, baseY, x + w - 1, seat + 1, P.stone3);
  p.line(x + w - 1, baseY, x + 1, seat + 1, P.stone2);
  p.box(x - 1, seat - S(2), w + 2, S(3), col[0], P.ink1);
  const bh = S(12);
  p.box(x, seat - S(2) - bh, w, bh, col[0], P.ink1);
  for (let k = 1; k < 4; k++) p.rect(x + 1, seat - S(2) - bh + Math.round((bh * k) / 4), w - 2, Math.max(1, S(1)), col[1]);
  p.rect(x - S(2), seat - S(5), S(3), S(2), P.stone2);
  p.rect(x + w - S(1), seat - S(5), S(3), S(2), P.stone2);
}

/** A campsite power post (Stromsäule) with a lit cap. */
export function powerPost(p: Px, x: number, baseY: number) {
  p.box(x, baseY - 22, 8, 22, P.paper3, P.ink1);
  p.rect(x + 1, baseY - 21, 6, 3, P.forest2);
  p.rect(x + 2, baseY - 14, 4, 3, P.ink2);
  p.box(x - 1, baseY - 25, 10, 4, P.ink2, P.ink1);
  p.px(x + 4, baseY - 24, P.beer3);
  p.line(x + 4, baseY - 12, x - 10, baseY - 2, P.ink1);
  p.line(x - 10, baseY - 2, x - 30, baseY - 1, P.ink1);
}

/** A hurricane lantern on the ground or a table, with its glow. */
export function lantern(p: Px, x: number, baseY: number, sc = 1) {
  const S = (v: number) => Math.round(v * sc);
  p.box(x - S(3), baseY - S(10), S(7), S(8), P.beer4, P.ink1);
  p.rect(x - S(1), baseY - S(8), S(3), S(4), P.beer3);
  p.box(x - S(4), baseY - S(2), S(9), S(2), P.brick1, P.ink1);
  p.rect(x - S(3), baseY - S(12), S(7), S(2), P.brick1);
  p.line(x - S(2), baseY - S(13), x + S(2), baseY - S(13), P.ink1);
  p.ellipse(x, baseY - S(6), S(14), S(10), p.pat(null, P.beer3, 0.15));
}
