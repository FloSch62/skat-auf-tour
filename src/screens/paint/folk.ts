// Vehicles and dogs for the painted backdrops: cars and mopeds of the era (no brands), 70s motorcycles, and the
// dogs of the Hundewiese (shepherd, wolfhound, Airedale, giant schnauzer). Side views, cel colours, ink contours.
import { P, Px } from "./painter";

/** A boxy 80s saloon or estate, side view; (x, baseY) = bottom left at the tyres. ≈ 64×22 at s = 1. */
export function car(p: Px, x: number, baseY: number, col: [string, string, string], facing: 1 | -1 = 1, s = 1, estate = false) {
  const S = (v: number) => Math.round(v * s);
  const X = (v: number) => (facing > 0 ? x + S(v) : x + S(64 - v));
  const pts = (arr: [number, number][]) => arr.map(([a, b]) => [X(a), baseY - S(b)] as [number, number]);
  const [dark, base, lite] = col;
  // body
  p.shape(pts([[2, 4], [62, 4], [63, 9], [62, 12], [50, 13], [2, 13], [1, 9]]), base);
  // cabin
  const cab: [number, number][] = estate ? [[14, 13], [18, 21], [50, 21], [53, 13]] : [[14, 13], [20, 21], [40, 21], [47, 13]];
  p.shape(pts(cab), base);
  // windows
  const win: [number, number][] = estate ? [[16, 13], [19, 19], [49, 19], [51, 13]] : [[16, 13], [21, 19], [39, 19], [44, 13]];
  p.poly(pts(win), P.dusk2);
  const pillar = estate ? 33 : 30;
  p.poly(pts([[pillar, 13], [pillar, 19], [pillar + 2, 19], [pillar + 2, 13]]), base);
  p.line(X(17), baseY - S(14), X(20), baseY - S(18), P.dusk4);
  // shading, chrome, lights
  p.rect(Math.min(X(2), X(62)), baseY - S(8), S(60), S(1), dark);
  p.rect(Math.min(X(3), X(61)), baseY - S(12), S(58), S(1), lite);
  p.rect(Math.min(X(1), X(63)) , baseY - S(5), S(63), S(2), P.stone3);
  p.rect(facing > 0 ? X(60) : X(62), baseY - S(10), S(3), S(2), P.beer3);
  p.rect(facing > 0 ? X(1) : X(3), baseY - S(10), S(2), S(2), P.brick2);
  p.rect(X(32), baseY - S(10), S(3), S(1), P.ink2);
  // wheels
  for (const wx of [12, 51]) {
    p.oval(X(wx), baseY - S(4), S(5), S(5), P.ink1);
    p.ellipse(X(wx), baseY - S(4), S(2), S(2), P.stone2);
  }
}

/** A 70s motorcycle, side view; (x, baseY) = ground under the rear wheel. ≈ 40×24 at s = 1. */
export function motorbike(p: Px, x: number, baseY: number, col: [string, string, string] = [P.brick0, P.brick1, P.brick3], facing: 1 | -1 = 1, s = 1) {
  const S = (v: number) => Math.round(v * s);
  const X = (v: number) => (facing > 0 ? x + S(v) : x - S(v));
  const [dark, base, lite] = col;
  const r = S(7);
  for (const wx of [0, 30]) {
    p.oval(X(wx), baseY - r, r, r, P.ink1);
    p.ellipse(X(wx), baseY - r, r - 2, r - 2, P.stone1);
    p.ellipse(X(wx), baseY - r, r - 3, r - 3, P.ink2);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI;
      p.line(X(wx) - Math.round(Math.cos(a) * (r - 3)), baseY - r - Math.round(Math.sin(a) * (r - 3)), X(wx) + Math.round(Math.cos(a) * (r - 3)), baseY - r + Math.round(Math.sin(a) * (r - 3)), P.stone2);
    }
    p.ellipse(X(wx), baseY - r, 1, 1, P.stone3);
  }
  // frame, engine, exhaust
  p.line(X(0), baseY - r, X(12), baseY - S(12), P.ink1, 2);
  p.line(X(30), baseY - r, X(26), baseY - S(20), P.stone2, 2);
  p.box(Math.min(X(10), X(19)), baseY - S(13), S(10), S(8), P.stone1, P.ink1);
  p.rect(Math.min(X(11), X(18)), baseY - S(12), S(8), S(2), P.stone3);
  p.line(X(10), baseY - S(5), X(-4), baseY - S(6), P.stone3, 2);
  p.line(X(10), baseY - S(4), X(-4), baseY - S(5), P.ink2);
  // tank, seat, tail
  p.shape([[X(12), baseY - S(16)], [X(16), baseY - S(20)], [X(25), baseY - S(20)], [X(26), baseY - S(15)]], base);
  p.line(X(16), baseY - S(19), X(23), baseY - S(19), lite);
  p.rect(Math.min(X(17), X(23)), baseY - S(17), S(6), S(1), dark);
  p.box(Math.min(X(2), X(13)), baseY - S(17), S(12), S(3), P.ink1);
  p.line(X(0), baseY - S(16), X(-3), baseY - S(15), base, 2);
  // handlebar and headlight
  p.line(X(26), baseY - S(20), X(24), baseY - S(25), P.stone3);
  p.line(X(24), baseY - S(25), X(21), baseY - S(25), P.ink1);
  p.oval(X(29), baseY - S(19), S(2), S(2), P.beer3, P.ink1);
}

/** A moped (Mofa) with pedals; (x, baseY) under the rear wheel. ≈ 28×18. */
export function moped(p: Px, x: number, baseY: number, col: string = P.river1, facing: 1 | -1 = 1) {
  const X = (v: number) => (facing > 0 ? x + v : x - v);
  for (const wx of [0, 22]) {
    p.oval(X(wx), baseY - 5, 5, 5, P.ink1);
    p.ellipse(X(wx), baseY - 5, 3, 3, P.stone2);
    p.ellipse(X(wx), baseY - 5, 1, 1, P.ink2);
  }
  p.line(X(0), baseY - 5, X(10), baseY - 9, col, 2);
  p.line(X(10), baseY - 9, X(19), baseY - 15, col, 2);
  p.line(X(22), baseY - 5, X(19), baseY - 15, P.stone2);
  p.box(Math.min(X(7), X(13)), baseY - 10, 7, 4, P.stone1, P.ink1);
  p.box(Math.min(X(1), X(9)), baseY - 13, 9, 3, P.ink1);
  p.line(X(19), baseY - 15, X(16), baseY - 17, P.ink1);
  p.line(X(9), baseY - 7, X(12), baseY - 4, P.ink2);
  p.rect(X(21), baseY - 14, 2, 2, P.beer3);
}

export type DogKind = "shepherd" | "wolfhound" | "airedale" | "schnauzer" | "mutt";
export type DogPose = "stand" | "sit" | "lie";

interface DogLook {
  body: string;
  dark: string;
  lite: string;
  /** Black saddle on the back (shepherd, Airedale). */
  saddle: string | null;
  ears: "up" | "fold" | "flop" | "rose";
  beard: string | null;
  /** Size factor. */
  h: number;
  /** Long thin (wolfhound) or compact build. */
  long: number;
  tail: "low" | "up" | "docked" | "long";
  shaggy: boolean;
  muzzle: string | null;
}

const DOG: Record<DogKind, DogLook> = {
  shepherd: { body: P.wood4, dark: P.wood2, lite: P.wood5, saddle: P.ink1, ears: "up", beard: null, h: 1, long: 1, tail: "low", shaggy: false, muzzle: P.ink1 },
  wolfhound: { body: P.stone2, dark: P.stone1, lite: P.stone3, saddle: null, ears: "rose", beard: P.stone1, h: 1.3, long: 1.12, tail: "long", shaggy: true, muzzle: null },
  airedale: { body: P.wood4, dark: P.wood3, lite: P.wood5, saddle: P.ink1, ears: "fold", beard: P.wood3, h: 0.92, long: 0.95, tail: "up", shaggy: true, muzzle: null },
  schnauzer: { body: P.ink2, dark: P.ink1, lite: P.ink4, saddle: null, ears: "fold", beard: P.stone2, h: 1.08, long: 0.95, tail: "docked", shaggy: false, muzzle: null },
  mutt: { body: P.wood3, dark: P.wood2, lite: P.wood4, saddle: null, ears: "flop", beard: null, h: 0.85, long: 1, tail: "up", shaggy: false, muzzle: null },
};

type V2 = [number, number];

/** A dog in side view; (x, baseY) = ground under the middle of the body; facing right by default. ≈ 32×26 at s = 1. */
export function dog(p: Px, x: number, baseY: number, kind: DogKind = "shepherd", pose: DogPose = "stand", facing: 1 | -1 = 1, s = 1) {
  const d = DOG[kind];
  const k = s * d.h;
  const L = d.long;
  const T = ([a, b]: V2): V2 => [Math.round(x + facing * a * k * (a < 0 ? L : 1)), Math.round(baseY + b * k)];
  const poly = (pts: V2[]) => pts.map(T);
  const ink = P.ink0;

  if (pose === "stand") {
    // far legs (darker), tail
    p.shape(poly([[5, -10], [7, -10], [7, 0], [4, 0]]), d.dark, ink);
    p.shape(poly([[-8, -10], [-5, -9], [-6, -4], [-5, 0], [-8, 0], [-9, -5]]), d.dark, ink);
    tail(p, T, d, [-11, -13], k);
    // body, neck and head in one outline
    const body: V2[] = [[-11, -14], [-4, -15], [5, -15], [8, -18], [9, -21], [13, -22], [15, -20], [20, -19], [20, -17], [15, -16], [12, -15], [10, -12], [9, -9], [4, -8], [-6, -9], [-10, -10], [-12, -12]];
    p.shape(poly(body), d.body, ink);
    if (d.saddle) p.poly(poly([[-11, -13], [-4, -15], [5, -15], [7, -13], [4, -12], [-9, -11]]), d.saddle);
    p.poly(poly([[-6, -9], [4, -8], [8, -10], [-4, -11]]), d.dark);
    p.line(...T([-9, -14]), ...T([4, -15]), d.lite);
    // near legs
    p.shape(poly([[7, -10], [10, -10], [10, 0], [6, 0]]), d.body, ink);
    p.shape(poly([[-11, -11], [-6, -10], [-6, -6], [-5, -3], [-5, 0], [-8, 0], [-9, -4], [-11, -7]]), d.body, ink);
    p.rect(...T([6.5, -1]), 3, 1, d.dark);
    head(p, T, d, [9, -21], k);
    if (d.shaggy) shag(p, T, d, [[-10, -14], [6, -15]], [[-6, -9], [6, -9]]);
    return;
  }
  if (pose === "sit") {
    tail(p, T, d, [-9, -2], k, true);
    const body: V2[] = [[-8, 0], [-11, -4], [-10, -9], [-4, -15], [2, -19], [4, -22], [5, -25], [9, -26], [11, -24], [16, -23], [16, -21], [11, -20], [8, -19], [8, -14], [7, -8], [7, 0]];
    p.shape(poly(body), d.body, ink);
    if (d.saddle) p.poly(poly([[-10, -8], [-4, -14], [2, -18], [3, -14], [-2, -9], [-8, -5]]), d.saddle);
    p.line(...T([-9, -9]), ...T([1, -18]), d.lite);
    // haunch and front leg
    p.oval(...T([-4, -4]), Math.round(5 * k), Math.round(4 * k), d.dark, ink);
    p.shape(poly([[4, -10], [7, -10], [7, 0], [3, 0]]), d.body, ink);
    p.rect(...T([-1, -1]), Math.round(4 * k), 1, d.dark);
    head(p, T, d, [5, -25], k);
    if (d.shaggy) shag(p, T, d, [[-9, -9], [2, -18]], [[5, -10], [7, -2]]);
    return;
  }
  // lying, head up
  tail(p, T, d, [-12, -2], k, true);
  const body: V2[] = [[-12, 0], [-13, -3], [-10, -7], [0, -8], [6, -9], [7, -13], [9, -16], [13, -17], [15, -15], [20, -14], [20, -12], [15, -11], [12, -9], [10, -4], [18, -3], [18, 0]];
  p.shape(poly(body), d.body, ink);
  if (d.saddle) p.poly(poly([[-12, -3], [-10, -7], [0, -8], [5, -8], [2, -5], [-8, -3]]), d.saddle);
  p.oval(...T([-7, -3]), Math.round(4 * k), Math.round(3 * k), d.dark, ink);
  p.line(...T([10, -1]), ...T([17, -1]), d.dark);
  head(p, T, d, [9, -16], k);
}

function tail(p: Px, T: (v: V2) => V2, d: DogLook, at: V2, k: number, ground = false) {
  const w = Math.max(2, Math.round(2.2 * k));
  const [ax, ay] = at;
  let pts: V2[];
  if (ground) pts = [[ax, ay], [ax - 4, ay + 1], [ax - 8, ay + 2]];
  else if (d.tail === "low") pts = [[ax, ay], [ax - 4, ay + 2], [ax - 6, ay + 7], [ax - 5, ay + 10]];
  else if (d.tail === "long") pts = [[ax, ay], [ax - 4, ay + 3], [ax - 6, ay + 9], [ax - 9, ay + 11]];
  else if (d.tail === "docked") pts = [[ax, ay], [ax - 1, ay - 4]];
  else pts = [[ax, ay], [ax - 2, ay - 4], [ax - 2, ay - 7]];
  const tp = pts.map(T);
  for (let i = 0; i + 1 < tp.length; i++) p.line(tp[i][0], tp[i][1], tp[i + 1][0], tp[i + 1][1], P.ink0, w + 2);
  for (let i = 0; i + 1 < tp.length; i++) p.line(tp[i][0], tp[i][1], tp[i + 1][0], tp[i + 1][1], d.saddle && d.tail === "low" ? d.saddle : d.body, w);
}

function head(p: Px, T: (v: V2) => V2, d: DogLook, at: V2, k: number) {
  const [hx, hy] = at;
  // eye and nose
  p.px(...T([hx + 4, hy + 2]), P.ink0);
  p.rect(...T([hx + 10, hy + 2]), Math.max(1, Math.round(k * 1.5)), Math.max(1, Math.round(k * 1.5)), P.ink0);
  if (d.muzzle) p.poly([T([hx + 6, hy + 3]), T([hx + 11, hy + 2]), T([hx + 11, hy + 4]), T([hx + 6, hy + 5])], d.muzzle);
  if (d.beard) p.poly([T([hx + 5, hy + 5]), T([hx + 11, hy + 4]), T([hx + 10, hy + 7]), T([hx + 6, hy + 7])], d.beard);
  if (d.beard && d.body === P.ink2) p.rect(...T([hx + 3, hy + 1]), Math.max(2, Math.round(2 * k)), 1, d.beard);
  // ears
  if (d.ears === "up") p.shape([T([hx, hy + 1]), T([hx + 1, hy - 6]), T([hx + 4, hy])], d.saddle ?? d.dark, P.ink0);
  else if (d.ears === "fold") p.shape([T([hx + 1, hy]), T([hx + 4, hy - 2]), T([hx + 5, hy + 2])], d.dark, P.ink0);
  else if (d.ears === "rose") p.shape([T([hx - 1, hy + 1]), T([hx + 2, hy - 1]), T([hx + 1, hy + 2])], d.dark, P.ink0);
  else p.shape([T([hx, hy]), T([hx + 3, hy]), T([hx + 2, hy + 6]), T([hx - 1, hy + 5])], d.dark, P.ink0);
  void k;
}

function shag(p: Px, T: (v: V2) => V2, d: DogLook, back: [V2, V2], belly: [V2, V2]) {
  for (const [[ax, ay], [bx, by]] of [back, belly]) {
    for (let t = 0; t <= 1; t += 0.12) {
      const [x, y] = T([ax + (bx - ax) * t, ay + (by - ay) * t]);
      p.px(x, y + ((Math.round(t * 20) & 1) ? 1 : -1), d.lite);
      p.px(x + 1, y + 1, d.dark);
    }
  }
}

/** A rounded touring caravan (side view, drawbar to the right); (x, baseY) = bottom left. ≈ 70×36 at s = 1. */
export function caravan(p: Px, x: number, baseY: number, s = 1, stripe: string = P.brick2) {
  const S = (v: number) => Math.round(v * s);
  const top = baseY - S(34);
  const w = S(66);
  // body with rounded ends
  p.shape(
    [
      [x + S(4), baseY - S(6)],
      [x, baseY - S(14)],
      [x + S(2), top + S(6)],
      [x + S(10), top],
      [x + w - S(10), top],
      [x + w - S(2), top + S(6)],
      [x + w, baseY - S(14)],
      [x + w - S(4), baseY - S(6)],
    ],
    P.paper3,
  );
  p.rect(x + S(2), top + S(1), w - S(4), S(2), P.paper4);
  p.rect(x + S(1), baseY - S(16), w - S(2), S(3), stripe);
  p.box(x + S(8), top + S(8), S(16), S(9), P.dusk2, P.ink1);
  p.box(x + S(40), top + S(8), S(18), S(9), P.beer3, P.ink1);
  p.rect(x + S(40), top + S(8), S(18), S(3), p.pat(P.beer3, P.brick3, 0.5));
  p.box(x + S(28), top + S(10), S(9), S(22), P.paper2, P.ink1);
  p.shade([[x + S(4), baseY - S(6)], [x, baseY - S(14)], [x + w, baseY - S(14)], [x + w - S(4), baseY - S(6)]], -1);
  // wheel, drawbar, jockey wheel
  p.oval(x + S(34), baseY - S(5), S(5), S(5), P.ink1);
  p.ellipse(x + S(34), baseY - S(5), S(2), S(2), P.stone2);
  p.line(x + w - S(3), baseY - S(8), x + w + S(12), baseY - S(6), P.ink2, 2);
  p.rect(x + w + S(8), baseY - S(6), S(2), S(6), P.ink2);
}

/** An 80s ridge tent in orange with a blue groundsheet edge; (x, baseY) bottom left. */
export function ridgeTent(p: Px, x: number, baseY: number, w: number, h: number, col: [string, string] = [P.brick3, P.brick2]) {
  const cx = x + Math.round(w * 0.42);
  p.shape([[x, baseY], [cx, baseY - h], [x + w, baseY - h + Math.round(h * 0.15)], [x + w + Math.round(w * 0.12), baseY]], col[1], P.ink1);
  p.shape([[x, baseY], [cx, baseY - h], [cx + Math.round(w * 0.12), baseY]], col[0], P.ink1);
  p.poly([[cx - 2, baseY], [cx, baseY - Math.round(h * 0.55)], [cx + 3, baseY]], P.ink2);
  p.rect(x - 2, baseY - 1, w + Math.round(w * 0.12) + 5, 2, P.river1);
  p.line(cx, baseY - h, cx, baseY - h - 3, P.stone2);
  p.line(x, baseY, x - 4, baseY + 1, P.stone2);
}
