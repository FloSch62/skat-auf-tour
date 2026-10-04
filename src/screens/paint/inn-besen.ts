// Besenwirtschaft (inns/besen): a whitewashed cellar vault, the broom over the arched door, wine barrels on their
// rack, a long bench table of guests along the wall, checked cloths, a vine garland, enamel lamps; our table is
// scrubbed pale wood.
import { P, Px, type Pt } from "./painter";
import { sideHorizontals, steps } from "./persp";
import { V, ROOM, TABLE_Y, backTable, ourTable, smallGlass } from "./inn-common";
import { guest, hangingLamp } from "./props";

const HW = 2.5;
const SPRING = -0.15;
const CROWN = -1.55;
const BACK = 5;

/** Points of the vault arch at depth Z (left springing → crown → right springing). */
function arch(Z: number, n = 28): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI - (Math.PI * i) / n;
    out.push(V.pt(Math.cos(a) * HW, SPRING - Math.sin(a) * (SPRING - CROWN), Z));
  }
  return out;
}

/** A wine barrel lying on its side, head towards us. */
export function barrel(p: Px, cx: number, cy: number, r: number, tap = false) {
  p.oval(cx, cy, r, r, P.wood3, P.ink0);
  // staves
  for (let i = -r + 4; i < r - 2; i += 5) {
    const h = Math.round(Math.sqrt(Math.max(0, r * r - i * i)));
    p.rect(cx + i, cy - h + 1, 1, h * 2 - 1, P.wood2);
  }
  // rim and hoop
  for (let a = 0; a < 64; a++) {
    const t = (a / 64) * Math.PI * 2;
    p.px(cx + Math.round(Math.cos(t) * (r - 2)), cy + Math.round(Math.sin(t) * (r - 2)), P.wood1);
  }
  p.light(cx - Math.round(r * 0.3), cy - Math.round(r * 0.35), Math.round(r * 0.6), Math.round(r * 0.5), 1, 0.4);
  // the bung plate
  p.box(cx - 3, cy - Math.round(r * 0.55), 7, 5, P.wood1);
  if (tap) {
    p.box(cx - 2, cy + Math.round(r * 0.45), 5, 4, P.beer1);
    p.rect(cx + 2, cy + Math.round(r * 0.45) + 1, 4, 2, P.beer2);
    p.rect(cx + 5, cy + Math.round(r * 0.45) + 3, 1, 2, P.beer0);
  }
}

/** A Reisigbesen: the broom that says "Besen hat offen". (x, y) = left end of the stick. */
export function broom(p: Px, x: number, y: number, len: number) {
  // the stick on two hooks
  p.line(x, y, x + len, y, P.ink0, 3);
  p.line(x + 1, y - 1, x + len - 1, y - 1, P.wood3);
  p.line(x + 1, y, x + len - 1, y, P.wood2);
  for (const hx of [x + 8, x + len - 10]) p.line(hx, y - 6, hx, y - 1, P.ink1);
  const bx = x + len;
  // twig bundle fanned to the right, tied with a wire
  for (let i = -8; i <= 8; i++) p.line(bx, y, bx + 30, y + i * 1.5, P.ink1);
  for (let i = -7; i <= 7; i++) p.line(bx + 1, y, bx + 28, y + i * 1.35, i % 3 ? P.wood3 : P.wood2);
  for (let i = -5; i <= 5; i += 2) p.line(bx + 8, y + i * 0.5, bx + 26, y + i * 1.2, P.wood5);
  p.box(bx + 1, y - 4, 3, 9, P.stone2, P.ink1);
  // a ribbon
  p.line(bx + 2, y + 5, bx, y + 13, P.brick2, 2);
  p.line(bx + 3, y + 5, bx + 6, y + 12, P.brick2, 2);
}

export function paintBesen(p: Px) {
  const near = 1.3;
  // vault surface: nested arches from near (dim) to the back (lit)
  const bandCols = [P.stone2, P.paper1, P.paper1, P.paper2, P.paper2, P.paper3];
  const zs = [near, 1.7, 2.2, 2.8, 3.5, 4.2];
  p.rect(0, 0, 640, TABLE_Y, P.stone2);
  zs.forEach((Z, i) => {
    const a = arch(Z);
    const poly: Pt[] = [[a[0][0], 400], ...a, [a[a.length - 1][0], 400]];
    p.poly(poly, bandCols[i]);
    if (i > 0) {
      // dithered seam on the side towards us
      const prev = arch(Z - 0.12);
      p.poly([[prev[0][0], 400], ...prev, [prev[prev.length - 1][0], 400]], p.pat(null, bandCols[i], 0.5));
      p.poly([[a[0][0], 400], ...a, [a[a.length - 1][0], 400]], bandCols[i]);
    }
  });
  // side walls below the springing line, whitewashed, with a dark plinth
  for (const sd of [-1, 1]) {
    const X = sd * HW;
    p.poly(V.sideQuad(X, SPRING, ROOM.floor, near, BACK), P.paper2);
    sideHorizontals(p, V, X, [SPRING], near, BACK, P.paper1);
    p.poly(V.sideQuad(X, 1.0, ROOM.floor, near, BACK), P.stone1);
  }
  // stone floor (only a sliver shows)
  p.poly(V.flatQuad(ROOM.floor, -HW, HW, near, BACK), P.stone1);
  for (const X of steps(-HW, HW, 10)) {
    const f0 = V.pt(X, ROOM.floor, near);
    const f1 = V.pt(X, ROOM.floor, BACK);
    p.line(f0[0], f0[1], f1[0], f1[1], P.stone0);
  }

  // back wall, arched
  const a = arch(BACK);
  const floorY = V.y(ROOM.floor, BACK);
  const wall: Pt[] = [[a[0][0], floorY], ...a, [a[a.length - 1][0], floorY]];
  p.poly(wall, P.paper3);
  p.speckle(a[0][0], V.y(CROWN, BACK), a[a.length - 1][0] - a[0][0], 80, [P.paper2], 120);
  for (let i = 0; i + 1 < a.length; i++) p.line(a[i][0], a[i][1], a[i + 1][0], a[i + 1][1], P.paper1);
  const plinth = V.y(1.0, BACK);
  p.rect(a[0][0], plinth, a[a.length - 1][0] - a[0][0], floorY - plinth, P.stone1);

  // vine garland along the springing line of the back arch
  const gl = V.pt(-HW, SPRING - 0.05, BACK);
  const gr = V.pt(HW, SPRING - 0.05, BACK);
  for (let x = gl[0]; x < gr[0]; x += 2) {
    const yy = gl[1] + Math.round(Math.sin(x * 0.21) * 2);
    p.rect(x, yy, 2, 2, (x >> 1) % 3 ? P.forest2 : P.olive2);
    if (x % 9 === 0) p.rect(x, yy + 2, 2, 3, P.dusk1);
  }

  // the arched door in the middle of the back wall, the broom over it
  const [dx0, dy0] = V.pt(-0.42, -0.72, BACK);
  const [dx1, dy1] = V.pt(0.42, ROOM.floor, BACK);
  const dw = dx1 - dx0;
  const doorPts: Pt[] = [[dx0, dy1], [dx0, dy0 + 6]];
  for (let i = 0; i <= 12; i++) {
    const t = Math.PI - (Math.PI * i) / 12;
    doorPts.push([Math.round(dx0 + dw / 2 + Math.cos(t) * (dw / 2)), Math.round(dy0 + 6 - Math.sin(t) * 10)]);
  }
  doorPts.push([dx1, dy1]);
  p.shape(doorPts.map(([x, y]) => [x + (x < dx0 + dw / 2 ? -4 : 4), y - 4] as Pt), P.stone2, P.ink1);
  p.shape(doorPts, P.wood2, P.ink0);
  for (let x = dx0 + 6; x < dx1 - 2; x += 7) p.line(x, dy0 - 2, x, dy1, P.wood1);
  p.rect(dx0 + 1, dy0 + 20, dw - 1, 3, P.ink2);
  p.rect(dx0 + 1, dy0 + 60, dw - 1, 3, P.ink2);
  p.box(dx1 - 11, dy0 + 40, 5, 4, P.ink1);
  p.px(dx1 - 10, dy0 + 41, P.stone3);
  p.light(dx0 + dw / 2, dy0 + 10, 20, 14, 1, 0.5);
  broom(p, dx0 - 26, dy0 - 18, 52);

  // niches with bottles left and right of the door
  for (const nxm of [-1.45, 1.0]) {
    const [nx, ny] = V.pt(nxm, -0.9, BACK);
    p.box(nx, ny, 26, 24, P.paper1, P.paper0);
    p.rect(nx + 1, ny + 1, 24, 3, P.stone2);
    for (let i = 0; i < 4; i++) {
      const bx = nx + 3 + i * 6;
      const c = i % 2 ? P.forest1 : P.beer0;
      p.box(bx, ny + 11, 5, 12, c, P.ink0);
      p.rect(bx + 1, ny + 6, 3, 6, P.ink0);
      p.rect(bx + 2, ny + 7, 1, 4, c);
      p.rect(bx + 1, ny + 14, 1, 6, P.stone3);
      p.rect(bx + 1, ny + 17, 3, 3, P.paper3);
    }
  }

  // barrels on their rack against the back wall, left
  const bz = 4.75;
  const rackY = V.y(0.95, bz);
  p.box(V.x(-2.5, bz), rackY, V.x(-1.0, bz) - V.x(-2.5, bz), 5, P.wood1);
  const rr = Math.round(V.s(0.34, bz));
  barrel(p, V.x(-2.1, bz), rackY - rr + 1, rr, true);
  barrel(p, V.x(-1.4, bz), rackY - rr + 1, rr, false);
  barrel(p, V.x(-1.75, bz), rackY - rr * 3 + 4, rr - 1, false);

  // the table of guests at the left
  const ty = V.y(ROOM.table, 3.3);
  guest(p, V.x(-2.0, 4.1), ty, 40, { coat: P.olive1, hat: "none", hair: P.stone3, look: 1, glass: 1 });
  guest(p, V.x(-1.3, 4.1), ty, 39, { coat: P.dusk1, hat: "kerchief", look: -1 });
  backTable(p, -2.45, -0.95, 3.3, 3.9, P.paper4, P.paper1);
  checks(p, -2.45, -0.95, 3.3, 3.9);
  smallGlass(p, V.x(-1.75, 3.55), V.y(ROOM.table, 3.55), "wine");
  smallGlass(p, V.x(-1.5, 3.45), V.y(ROOM.table, 3.45), "most");

  // the table at the right
  const ry = V.y(ROOM.table, 3.7);
  guest(p, V.x(0.95, 4.6), ry, 38, { coat: P.wood2, hat: "cap", look: 1 });
  guest(p, V.x(1.6, 4.6), ry, 37, { coat: P.brick1, hat: "none", hair: P.wood1, glass: -1, look: -1 });
  guest(p, V.x(2.2, 4.5), ry, 39, { coat: P.river1, hat: "hat", look: -1, wide: true });
  backTable(p, 0.65, 2.45, 3.7, 4.3, P.paper4, P.paper1);
  checks(p, 0.65, 2.45, 3.7, 4.3);
  smallGlass(p, V.x(1.2, 3.95), V.y(ROOM.table, 3.95), "wine");
  smallGlass(p, V.x(1.9, 4.0), V.y(ROOM.table, 4.0), "wine");

  // enamel lamps
  hangingLamp(p, V.x(-1.7, 3.6), V.y(-0.8, 3.6), 30, 13, V.y(CROWN, 3.6) + 20, "cream");
  hangingLamp(p, V.x(1.55, 3.9), V.y(-0.75, 3.9), 30, 13, V.y(CROWN, 3.9) + 14, "green");

  // light
  p.light(V.x(-1.7, 3.6), V.y(-0.2, 3.6), 96, 76, 1.5, 0.5);
  p.light(V.x(1.55, 3.9), V.y(-0.2, 3.9), 96, 70, 1.5, 0.5);
  p.light(320, 70, 170, 60, 1, 0.6);
  ourTable(p, "scrubbed", { light: 1 });
  p.vignette(-1.6, 0.48, 0, 30);
}

/** Red checks on a background table's cloth. */
function checks(p: Px, x0: number, x1: number, z0: number, z1: number) {
  for (const X of steps(x0 + 0.08, x1 - 0.08, Math.round((x1 - x0) * 6))) {
    const f = V.pt(X, ROOM.table, z0);
    const b = V.pt(X, ROOM.table, z1);
    p.line(f[0], f[1], b[0], b[1], P.brick3);
  }
  for (const Z of steps(z0 + 0.05, z1 - 0.05, 3)) {
    const l = V.pt(x0 + 0.04, ROOM.table, Z);
    const r = V.pt(x1 - 0.04, ROOM.table, Z);
    p.line(l[0], l[1], r[0], r[1], P.brick3);
  }
}
