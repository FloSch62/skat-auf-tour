// Shared composition for the inn interiors (contract §9: "Blick über den Tisch"). We sit at our table: its top
// fills the lower ~45 % of the picture and stays calm (hand, trick and Skat lie on it); the room rises behind its
// far edge. The upper corners (opponent portraits) and the middle behind the trick are kept quiet.
import { P, Px, type Fill, type Pt } from "./painter";
import { View, sideHorizontals, sideVerticals, steps } from "./persp";
import { guest, type Guest } from "./props";

/** Eye level y = 120, focal length 300 px: a seated view into a room 6 m wide, 5 m deep, 2.6 m high. */
export const V = new View(320, 120, 300);
export const ROOM = { halfW: 3, back: 5, ceil: -1.4, floor: 1.2, table: 0.45, tableFar: 1.62 };
/** The far edge of our table in raster rows. */
export const TABLE_Y = V.y(ROOM.table, ROOM.tableFar);

export interface ShellOpts {
  halfW?: number;
  back?: number;
  ceil?: number;
  /** Ceiling: "beams" (dark wood beams running away from us), "boards", "vault" (whitewashed), "plain". */
  ceiling?: "beams" | "boards" | "vault" | "plain" | "none";
  ceilCols?: [string, string, string];
  /** Height (Y) of the wainscot top, or null for none. */
  wainscot?: number | null;
  wallCol?: string;
  wallMottle?: string;
  panelDark?: boolean;
  floorCol?: string;
}

/** Back wall rectangle in raster pixels for the shell settings. */
export function backRect(o: ShellOpts = {}) {
  const hw = o.halfW ?? ROOM.halfW;
  const back = o.back ?? ROOM.back;
  const ceil = o.ceil ?? ROOM.ceil;
  const x0 = V.x(-hw, back);
  const x1 = V.x(hw, back);
  const y0 = V.y(ceil, back);
  const y1 = V.y(ROOM.floor, back);
  return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0, wainY: o.wainscot === null ? y1 : V.y(o.wainscot ?? -0.1, back) };
}

/** Ceiling, side walls and back wall with plaster above and wainscot below. */
export function roomShell(p: Px, o: ShellOpts = {}) {
  const hw = o.halfW ?? ROOM.halfW;
  const back = o.back ?? ROOM.back;
  const ceil = o.ceil ?? ROOM.ceil;
  const wall = o.wallCol ?? P.paper2;
  const mottle = o.wallMottle ?? P.paper1;
  const wy = o.wainscot === undefined ? -0.1 : o.wainscot;
  const near = 1.2;
  const b = backRect(o);
  const [c0, c1, c2] = o.ceilCols ?? [P.wood0, P.wood1, P.wood2];

  // ceiling plane
  p.rect(0, 0, 640, b.y0 + 1, c1);
  if (o.ceiling === "beams" || o.ceiling === undefined) {
    for (const X of steps(-hw, hw, 8)) {
      const q: Pt[] = [V.pt(X - 0.09, ceil, near), V.pt(X + 0.09, ceil, near), V.pt(X + 0.09, ceil, back), V.pt(X - 0.09, ceil, back)];
      p.poly(q, c0);
      const side = X < 0 ? 0.09 : -0.09;
      const lit: Pt[] = [V.pt(X + side, ceil + 0.12, near), V.pt(X + side, ceil + 0.12, back), V.pt(X + side, ceil, back), V.pt(X + side, ceil, near)];
      p.poly(lit, c2);
      const a = V.pt(X + side, ceil + 0.12, near);
      const e = V.pt(X + side, ceil + 0.12, back);
      p.line(a[0], a[1], e[0], e[1], P.ink0);
    }
  } else if (o.ceiling === "boards") {
    for (const X of steps(-hw, hw, 20)) {
      const a = V.pt(X, ceil, near);
      const e = V.pt(X, ceil, back);
      p.line(a[0], a[1], e[0], e[1], c0);
    }
    for (const Z of [2, 2.6, 3.4, 4.3]) p.line(0, V.y(ceil, Z), 640, V.y(ceil, Z), c0);
  }

  // floor: dark boards running away from us (only a strip shows between the back wall and our table)
  p.poly(V.flatQuad(ROOM.floor, -hw, hw, near, back), o.floorCol ?? P.wood1);
  for (const X of steps(-hw, hw, 14)) {
    const a = V.pt(X, ROOM.floor, near);
    const e = V.pt(X, ROOM.floor, back);
    p.line(a[0], a[1], e[0], e[1], P.wood0);
  }

  // side walls
  for (const s of [-1, 1]) {
    const X = s * hw;
    const quad: Pt[] = [V.pt(X, ceil, near), V.pt(X, ceil, back), V.pt(X, ROOM.floor, back), V.pt(X, ROOM.floor, near)];
    p.poly(quad, wall);
    if (o.ceiling === "vault") continue;
    // cornice line
    sideHorizontals(p, V, X, [ceil + 0.02], near, back, c0);
    if (wy !== null) {
      const panel: Pt[] = [V.pt(X, wy, near), V.pt(X, wy, back), V.pt(X, ROOM.floor, back), V.pt(X, ROOM.floor, near)];
      p.poly(panel, o.panelDark ? P.wood1 : P.wood2);
      sideHorizontals(p, V, X, [wy], near, back, o.panelDark ? P.wood2 : P.wood4);
      sideHorizontals(p, V, X, [wy + 0.04], near, back, P.ink1);
      const zs = steps(1.4, back, 9);
      sideVerticals(p, V, X, wy + 0.12, ROOM.floor, zs, o.panelDark ? P.wood0 : P.wood1);
    }
  }
  // corner shadows
  for (const s of [-1, 1]) {
    const x = s < 0 ? b.x0 : b.x1;
    p.rect(x - (s < 0 ? 0 : 1), b.y0, 2, b.h, P.ink1);
  }

  // back wall
  p.rect(b.x0, b.y0, b.w, b.h, wall);
  p.speckle(b.x0, b.y0, b.w, b.wainY - b.y0, [mottle], Math.round(b.w * (b.wainY - b.y0) * 0.015));
  p.rect(b.x0, b.y0, b.w, 2, c0);
  p.rect(b.x0, b.y0 + 2, b.w, 1, P.ink2);
  if (wy !== null) p_wainscotBack(p, b.x0, b.wainY, b.w, b.y1 - b.wainY + 2, !!o.panelDark);
}

function p_wainscotBack(p: Px, x: number, y: number, w: number, h: number, dark: boolean) {
  // framed panels, scaled for the back wall distance
  const base = dark ? P.wood1 : P.wood2;
  const deep = dark ? P.wood0 : P.wood1;
  const lite = dark ? P.wood2 : P.wood3;
  p.rect(x, y, w, h, base);
  p.rect(x, y, w, 3, lite);
  p.rect(x, y, w, 1, dark ? P.wood3 : P.wood4);
  p.rect(x, y + 3, w, 1, P.ink1);
  const n = Math.round(w / 24);
  for (let i = 0; i < n; i++) {
    const x0 = Math.round(x + 2 + ((w - 4) * i) / n) + 2;
    const x1 = Math.round(x + 2 + ((w - 4) * (i + 1)) / n) - 2;
    p.rect(x0, y + 8, x1 - x0, h - 12, deep);
    p.rect(x0 + 1, y + 9, x1 - x0 - 1, h - 13, lite);
    p.rect(x0 + 1, y + 9, x1 - x0 - 2, h - 14, base);
  }
}

export type TableKind = "stammtisch" | "scrubbed" | "formica" | "laminate" | "linen" | "planks" | "oilcloth" | "paper";

export interface TableOpts {
  /** Felt Skat mat on top. */
  mat?: boolean;
  /** Light pool from the lamp above (steps). */
  light?: number;
}

/**
 * Our table: fills the picture from TABLE_Y down, boards running away from us, an optional felt Skat mat, a warm
 * light pool and darker corners. Deliberately plain: the cards lie here.
 */
export function ourTable(p: Px, kind: TableKind, o: TableOpts = {}) {
  const Y = ROOM.table;
  const far = ROOM.tableFar;
  const y0 = TABLE_Y;
  const top: Record<TableKind, [string, string, string, string]> = {
    // base, joint, edge light, edge shade
    stammtisch: [P.wood3, P.wood2, P.wood5, P.wood1],
    scrubbed: [P.wood4, P.wood3, P.wood5, P.wood2],
    formica: [P.wood4, P.wood3, P.wood5, P.wood2],
    laminate: [P.stone2, P.stone1, P.stone3, P.stone0],
    linen: [P.brick1, P.brick0, P.brick2, P.brick0],
    planks: [P.wood3, P.wood1, P.wood4, P.wood1],
    oilcloth: [P.river2, P.river1, P.river3, P.river0],
    paper: [P.paper4, P.paper2, P.paper4, P.paper1],
  };
  const [base, joint, lit, shade] = top[kind];
  p.rect(0, y0, 640, 360 - y0, base);
  // far edge: a lit lip and a dark line under the room
  p.rect(0, y0 - 1, 640, 1, P.ink0);
  p.rect(0, y0, 640, 1, lit);
  p.rect(0, y0 + 1, 640, 1, base);
  if (kind === "stammtisch" || kind === "scrubbed") {
    for (const X of steps(-3.2, 3.2, 14)) {
      const a = V.pt(X, Y, far);
      const e = V.pt(X, Y, 0.25);
      p.line(a[0], a[1] + 2, e[0], e[1], joint);
    }
    // grain flecks
    p.speckle(0, y0 + 3, 640, 360 - y0 - 3, [joint], 260);
  } else if (kind === "planks") {
    // a beer-garden table: boards run along the table, joints across the picture
    for (const Z of [1.25, 0.98, 0.78, 0.63, 0.52]) {
      const y = V.y(Y, Z);
      p.rect(0, y, 640, 1, joint);
      p.rect(0, y + 1, 640, 1, P.wood4);
    }
    for (let i = 0; i < 300; i++) {
      const y = p.rng.int(y0 + 3, 359);
      const x = p.rng.int(0, 630);
      p.rect(x, y, p.rng.int(3, 9), 1, P.wood2);
    }
  } else if (kind === "oilcloth") {
    // blue gingham oilcloth in perspective: rows by depth, columns by X (calm, low contrast)
    const zs = [far, 1.4, 1.2, 1.04, 0.9, 0.79, 0.7, 0.62, 0.55, 0.49, 0.44, 0.4, 0.36, 0.33];
    const xs = steps(-3.6, 3.6, 36);
    for (let j = 0; j + 1 < zs.length; j++) {
      for (let i = 0; i + 1 < xs.length; i++) {
        const q: Pt[] = [V.pt(xs[i], Y, zs[j]), V.pt(xs[i + 1], Y, zs[j]), V.pt(xs[i + 1], Y, zs[j + 1]), V.pt(xs[i], Y, zs[j + 1])];
        if (i % 2 === 0 && j % 2 === 0) p.poly(q, P.river1);
        else if (i % 2 === 0 || j % 2 === 0) p.poly(q, p.pat(P.river2, P.river1, 0.5));
      }
    }
    p.rect(0, y0, 640, 1, lit);
  } else if (kind === "linen") {
    // a deep red damask cloth: a quiet diamond pattern and two pressed folds
    for (const Z of steps(far, 0.36, 16)) {
      for (const X of steps(-3.4, 3.4, 34)) {
        const [x, y] = V.pt(X, Y, Z);
        if (y > y0 + 2) p.rect(x, y, 2, 1, P.brick2);
      }
    }
    for (const X of [-1.25, 1.25]) {
      const a = V.pt(X, Y, far);
      const e = V.pt(X, Y, 0.3);
      p.line(a[0], a[1] + 2, e[0], e[1], joint);
    }
    p.line(0, V.y(Y, 1.0), 640, V.y(Y, 1.0), joint);
  } else if (kind === "formica" || kind === "laminate") {
    p.speckle(0, y0 + 2, 640, 360 - y0 - 2, kind === "laminate" ? [joint, P.stone3] : [joint, P.wood5], 700);
    p.rect(0, y0, 640, 2, P.stone2);
    p.rect(0, y0, 640, 1, P.stone4);
  } else if (kind === "paper") {
    // a paper cover over the beer-tent table, taped seam
    p.rect(0, V.y(Y, 0.95), 640, 1, joint);
    p.speckle(0, y0 + 2, 640, 360 - y0 - 2, [P.paper3], 300);
  }
  if (o.mat) {
    const mw = 0.4;
    const mf = 1.05;
    const mn = 0.3;
    p.poly([V.pt(-mw - 0.04, Y, mf + 0.04), V.pt(mw + 0.04, Y, mf + 0.04), V.pt(mw + 0.04, Y, mn), V.pt(-mw - 0.04, Y, mn)], P.ink1);
    p.poly([V.pt(-mw - 0.03, Y, mf + 0.03), V.pt(mw + 0.03, Y, mf + 0.03), V.pt(mw + 0.03, Y, mn), V.pt(-mw - 0.03, Y, mn)], P.wood1);
    p.poly([V.pt(-mw, Y, mf), V.pt(mw, Y, mf), V.pt(mw, Y, mn), V.pt(-mw, Y, mn)], P.felt2);
    // stitched rim
    const a = V.pt(-mw + 0.03, Y, mf - 0.03);
    const e = V.pt(mw - 0.03, Y, mf - 0.03);
    for (let x = a[0]; x < e[0]; x += 3) p.px(x, a[1], P.felt3);
    for (const s of [-1, 1]) {
      const t0 = V.pt(s * (mw - 0.03), Y, mf - 0.03);
      const t1 = V.pt(s * (mw - 0.03), Y, mn + 0.05);
      const n = Math.abs(t1[1] - t0[1]) / 3;
      for (let k = 0; k < n; k++) p.px(Math.round(t0[0] + ((t1[0] - t0[0]) * k) / n), Math.round(t0[1] + ((t1[1] - t0[1]) * k) / n), P.felt3);
    }
    const [lx, ly] = V.pt(-mw - 0.03, Y, mf + 0.03);
    const [rx] = V.pt(mw + 0.03, Y, mf + 0.03);
    p.rect(lx, ly - 1, rx - lx, 1, P.wood3);
  }
  // our lamp above: a warm pool on the table, darker towards the corners
  const L = o.light ?? 1;
  if (L) p.light(320, 300, 300, 95, L, 0.6);
  p.relight(0, y0 + 2, 640, 360 - y0 - 2, (x, y) => {
    const dx = Math.abs(x - 320) / 320;
    const dy = (y - y0) / (360 - y0);
    const k = dx * dx * 0.9 + dy * 0.25;
    return k > 0.45 ? -Math.min(1, (k - 0.45) * 2.2) : 0;
  });
}

/** A light pool on a wall or floor around a lamp, plus a dim halo (dither) in the air. */
export function lampGlow(p: Px, cx: number, cy: number, rx: number, ry: number, steps = 1) {
  p.light(cx, cy, rx, ry, steps, 0.5);
}

/** A beer glass or a Viertele standing on a far table (background props, not the game's drinks). */
export function smallGlass(p: Px, x: number, y: number, kind: "beer" | "wine" | "most" = "beer") {
  if (kind === "beer") {
    p.box(x, y - 7, 4, 7, P.beer2, P.ink1);
    p.rect(x + 1, y - 6, 2, 1, P.beer4);
  } else if (kind === "wine") {
    p.box(x, y - 5, 4, 5, P.brick4, P.ink1);
    p.px(x + 4, y - 4, P.ink1);
    p.px(x + 4, y - 2, P.ink1);
  } else {
    p.box(x, y - 8, 5, 8, P.stone3, P.ink1);
    p.rect(x + 1, y - 7, 1, 6, P.stone4);
  }
}

/** A background table with a top face (seen slightly from above), its legs and the dark under it. */
export function backTable(p: Px, x0: number, x1: number, z0: number, z1: number, top: Fill, edge: string = P.wood1) {
  const Y = ROOM.table;
  const [fx, fy] = V.pt(x0, Y, z0);
  const [gx] = V.pt(x1, Y, z0);
  const th = Math.max(2, Math.round(V.s(0.05, z0)));
  // shadow under the table down to the floor, and the front legs
  const floorY = V.y(ROOM.floor, z0);
  p.relight(fx + 1, fy + th, gx - fx - 1, floorY - fy - th, (x, y) => {
    const k = (y - fy - th) / Math.max(1, floorY - fy - th);
    const e = Math.min(x - fx, gx - x) / 6;
    return -Math.min(2, 1 + (1 - k) * 0.8) * Math.min(1, e);
  });
  p.shade(V.flatQuad(ROOM.floor, x0 - 0.15, x1 + 0.15, z0 - 0.1, z1 + 0.1), -1);
  // the guests' legs and the bench in the dark under the table
  const n = Math.max(2, Math.round((x1 - x0) / 0.6));
  for (let i = 0; i < n; i++) {
    const lx = Math.round(fx + ((gx - fx) * (i + 0.5)) / n);
    const ly = fy + th + Math.round((floorY - fy - th) * 0.35);
    p.rect(lx - 4, ly, 3, floorY - ly, P.ink2);
    p.rect(lx + 1, ly + 1, 3, floorY - ly - 1, P.ink2);
    p.rect(lx - 5, floorY - 2, 4, 2, P.ink0);
    p.rect(lx + 1, floorY - 2, 4, 2, P.ink0);
  }
  const lw = Math.max(2, Math.round(V.s(0.06, z0)));
  p.box(fx + 2, fy + th, lw, floorY - fy - th, edge, P.ink1);
  p.box(gx - 2 - lw, fy + th, lw, floorY - fy - th, edge, P.ink1);
  const q: Pt[] = [V.pt(x0, Y, z0), V.pt(x1, Y, z0), V.pt(x1, Y, z1), V.pt(x0, Y, z1)];
  p.shape(q, top, P.ink1);
  p.box(fx, fy, gx - fx + 1, th, edge, P.ink1);
  return { x: fx, y: fy, w: gx - fx };
}

/** A panelled door on a side wall (X = ±halfW) between depths z0…z1, optionally with a lit frosted pane. */
export function sideDoor(p: Px, X: number, z0: number, z1: number, top = -0.85, opts: { pane?: boolean; col?: [string, string, string] } = {}) {
  const [d, b, l] = opts.col ?? [P.wood0, P.wood1, P.wood2];
  p.shape(V.sideQuad(X, top - 0.08, ROOM.floor, z0 - 0.08, z1 + 0.08), l, P.ink0);
  p.shape(V.sideQuad(X, top, ROOM.floor, z0, z1), b, P.ink0);
  const zm = (z0 + z1) / 2;
  const inset = (z1 - z0) * 0.15;
  if (opts.pane) {
    p.shape(V.sideQuad(X, top + 0.12, -0.15, z0 + inset, z1 - inset), p.pat(P.beer3, P.beer4, 0.35), d);
    sideVerticals(p, V, X, top + 0.12, -0.15, [zm], d);
  } else p.shape(V.sideQuad(X, top + 0.12, -0.15, z0 + inset, z1 - inset), d, d);
  p.shape(V.sideQuad(X, 0.05, ROOM.floor - 0.12, z0 + inset, z1 - inset), d, d);
  const [hx, hy] = V.pt(X, 0.0, z0 + inset * 0.7);
  p.rect(hx - 1, hy, 3, 2, P.beer2);
}

/**
 * A beer-garden / beer-tent set (Biergarnitur) running across the picture at depth Z: the table on trestles, a
 * bench behind with guests facing us, a bench in front with guests' backs. X0…X1 in metres.
 */
export function beerSet(p: Px, X0: number, X1: number, Z: number, guests: { front?: Guest[]; back?: Guest[] } = {}, top: string = P.wood4) {
  const Y = ROOM.table;
  const depth = 0.5;
  const s = V.s(1, Z);
  const [lx, ty] = V.pt(X0, Y, Z);
  const [rx] = V.pt(X1, Y, Z);
  const [, ty2] = V.pt(X0, Y, Z + depth);
  const floorY = V.y(ROOM.floor, Z);
  // guests behind the table, facing us
  const fr = guests.front ?? [];
  fr.forEach((g, i) => {
    const gx = Math.round(lx + ((rx - lx) * (i + 0.5)) / fr.length);
    guest(p, gx, ty, Math.round(s * 0.62), g);
  });
  // trestles
  for (const X of [X0 + 0.25, X1 - 0.25]) {
    const [tx] = V.pt(X, Y, Z);
    p.line(tx - Math.round(s * 0.12), floorY, tx + Math.round(s * 0.12), ty + 2, P.ink1, Math.max(1, Math.round(s * 0.03)));
    p.line(tx + Math.round(s * 0.12), floorY, tx - Math.round(s * 0.12), ty + 2, P.ink1, Math.max(1, Math.round(s * 0.03)));
  }
  // table top
  p.shape([[lx, ty], [rx, ty], [V.x(X1, Z + depth), ty2], [V.x(X0, Z + depth), ty2]], top, P.ink1);
  p.box(lx, ty, rx - lx + 1, Math.max(2, Math.round(s * 0.05)), P.wood2, P.ink1);
  // the bench in front and the backs of guests sitting on it
  const by = V.y(ROOM.table + 0.3, Z - 0.35);
  const [blx] = V.pt(X0, ROOM.table + 0.3, Z - 0.35);
  const [brx] = V.pt(X1, ROOM.table + 0.3, Z - 0.35);
  const bk = guests.back ?? [];
  bk.forEach((g, i) => {
    const gx = Math.round(blx + ((brx - blx) * (i + 0.5)) / bk.length);
    backOf(p, gx, by, Math.round(V.s(0.75, Z - 0.35)), g.coat, g.hair ?? P.ink3, g.hat);
  });
  p.box(blx, by, brx - blx + 1, Math.max(2, Math.round(V.s(0.05, Z - 0.35))), P.wood3, P.ink1);

}

/** A guest seen from behind: shoulders and the back of the head (on the near bench). */
export function backOf(p: Px, cx: number, seatY: number, h: number, coat: string, hair: string, hat?: string) {
  const sw = Math.round(h * 0.28);
  const headR = Math.max(2, Math.round(h * 0.11));
  const shoulderY = seatY - Math.round(h * 0.62);
  p.shape([[cx - sw - 1, seatY], [cx - sw, shoulderY + 3], [cx - 3, shoulderY], [cx + 3, shoulderY], [cx + sw, shoulderY + 3], [cx + sw + 1, seatY]], coat, P.ink0);
  p.shade([[cx + 1, shoulderY + 1], [cx + sw, shoulderY + 4], [cx + sw, seatY - 1], [cx + 1, seatY - 1]], -1);
  p.rect(cx - 2, shoulderY - 2, 5, 3, P.brick3);
  const hy = shoulderY - headR - 1;
  p.oval(cx, hy, headR, headR + 1, hat === "cap" ? P.stone1 : hat === "hat" ? P.olive1 : hair);
  if (hat === "hat") p.rect(cx - headR - 2, hy + 1, headR * 2 + 5, 2, P.olive0);
  if (hat === "kerchief") p.ellipse(cx, hy, headR, headR, P.brick2);
  p.px(cx - headR - 1, hy + 1, P.brick3);
  p.px(cx + headR + 1, hy + 1, P.brick3);
}
