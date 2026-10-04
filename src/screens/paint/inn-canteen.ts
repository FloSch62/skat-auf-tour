// Werkskantine (inns/canteen): the works canteen after the late shift. Light-blue tiles, fluorescent tubes, the
// serving hatch with the cook and steaming pots, trays on the rail, workers in blue overalls at long tables,
// orange plastic chairs, tall windows onto the factory yard at dusk; our table is grey laminate.
import { P, Px } from "./painter";
import { sideHorizontals, sideVerticals, steps } from "./persp";
import { V, ROOM, backRect, backTable, ourTable, roomShell, smallGlass } from "./inn-common";
import { figure, guest, tiles, wallClock } from "./props";
import { sky } from "./land";

/** The factory yard at dusk through the side windows: sawtooth roofs, a chimney, a lit gatehouse. */
function factoryView(p: Px, x: number, y: number, w: number, h: number) {
  sky(p, y, h, "sunset", x, w);
  const base = y + Math.round(h * 0.75);
  for (let sx = x - 10; sx < x + w + 10; sx += 14) {
    p.poly([[sx, base], [sx, base - 10], [sx + 10, base - 18], [sx + 10, base - 10], [sx + 14, base - 10], [sx + 14, base]], P.dusk0);
    p.rect(sx + 9, base - 16, 1, 6, P.beer2);
  }
  p.rect(x, base, w, h, P.dusk0);
  const cx = x + Math.round(w * 0.6);
  p.rect(cx, y + 6, 5, base - y - 6, P.dusk0);
  p.rect(cx - 1, y + 6, 7, 2, P.dusk1);
  for (let k = 0; k < 4; k++) p.ellipse(cx + 3 + k * 5, y + 2 - k * 2, 3 + k, 2 + k, p.pat(null, P.dusk3, 0.5));
}

export function paintCanteen(p: Px) {
  roomShell(p, { ceiling: "plain", wainscot: null, wallCol: P.paper3, wallMottle: P.paper2, ceilCols: [P.stone2, P.stone3, P.stone4], floorCol: P.stone1 });
  const b = backRect({ wainscot: null });
  // light-blue tiles up to 1.6 m
  const tileTop = -0.4;
  const ty0 = V.y(tileTop, ROOM.back);
  tiles(p, b.x0, ty0, b.w, b.y1 - ty0, P.river4, P.river3, P.river5, 6);
  for (const s of [-1, 1]) {
    const X = s * ROOM.halfW;
    p.poly(V.sideQuad(X, tileTop, ROOM.floor, 1.2, ROOM.back), P.river4);
    sideHorizontals(p, V, X, steps(tileTop, ROOM.floor, 14), 1.2, ROOM.back, P.river3);
    sideVerticals(p, V, X, tileTop, ROOM.floor, steps(1.4, ROOM.back, 18), P.river3);
  }
  // tall windows on the right wall onto the factory yard
  for (const [z0, z1] of [
    [2.3, 3.0],
    [3.5, 4.1],
    [4.45, 4.9],
  ] as [number, number][]) {
    const q = V.sideQuad(ROOM.halfW, -1.25, -0.5, z0, z1);
    const xs = q.map((pt) => pt[0]);
    const ys = q.map((pt) => pt[1]);
    const bx0 = Math.min(...xs);
    const by0 = Math.min(...ys);
    p.within(q, () => factoryView(p, bx0, by0, Math.max(...xs) - bx0, Math.max(...ys) - by0));
    p.path([...q, q[0]], P.stone3, 2);
    sideVerticals(p, V, ROOM.halfW, -1.25, -0.5, [(z0 + z1) / 2], P.stone3);
  }

  // the serving hatch in the back wall
  const [hx0, hy0] = V.pt(-1.0, -0.85, ROOM.back);
  const [hx1, hy1] = V.pt(1.1, -0.05, ROOM.back);
  p.box(hx0 - 3, hy0 - 3, hx1 - hx0 + 6, hy1 - hy0 + 6, P.stone3, P.ink1);
  p.rect(hx0, hy0, hx1 - hx0, hy1 - hy0, P.stone1);
  p.rect(hx0, hy0, hx1 - hx0, 6, P.stone0);
  // kitchen inside: tiled wall, pots, the cook
  tiles(p, hx0, hy0 + 6, hx1 - hx0, hy1 - hy0 - 6, P.paper2, P.paper1, P.paper3, 5);
  p.clip(hx0, hy0, hx1 - hx0, hy1 - hy0, () => figure(p, hx0 + 70, hy1 + 26, 60, { coat: P.paper4, legs: P.paper2, arm: "raise", facing: -1, hat: "none", hair: P.ink2 }));
  p.box(hx0 + 64, hy1 - 51, 13, 6, P.paper4, P.stone2);
  p.ellipse(hx0 + 70, hy1 - 53, 6, 3, P.paper4);
  for (const [px0, w] of [
    [hx0 + 10, 18],
    [hx0 + 34, 14],
  ] as [number, number][]) {
    p.box(px0, hy1 - 14, w, 12, P.stone2, P.ink1);
    p.rect(px0 - 2, hy1 - 14, w + 4, 2, P.stone3);
    for (let k = 0; k < 3; k++) p.ellipse(px0 + w / 2 + k * 2 - 2, hy1 - 20 - k * 5, 4 + k, 3, p.pat(null, P.paper4, 0.5 - k * 0.12));
  }
  // the counter with the tray rail
  p.box(hx0 - 8, hy1, hx1 - hx0 + 16, 6, P.stone3, P.ink1);
  p.rect(hx0 - 8, hy1 + 1, hx1 - hx0 + 16, 1, P.stone4);
  p.rect(hx0 - 12, hy1 + 9, hx1 - hx0 + 24, 2, P.stone2);
  for (let k = 0; k < 4; k++) {
    const tx = hx0 + 6 + k * 30;
    p.box(tx, hy1 - 3, 20, 3, P.brick3, P.ink1);
    p.ellipse(tx + 7, hy1 - 4, 4, 1, P.paper4);
  }
  // the canteen clock and a notice board with pinned sheets
  wallClock(p, 228, 52, 11, P.ink1, P.paper4);
  p.box(398, 50, 46, 34, P.wood3, P.wood1);
  for (const [nx, ny, c] of [
    [402, 54, P.paper4],
    [416, 56, P.road2],
    [430, 53, P.paper3],
    [405, 68, P.river4],
    [422, 70, P.paper4],
  ] as [number, number, string][]) {
    p.box(nx, ny, 11, 12, c, P.ink2);
    p.px(nx + 5, ny + 1, P.brick2);
    for (let r = 0; r < 3; r++) p.rect(nx + 2, ny + 4 + r * 2, 7, 1, P.ink5);
  }

  // workers at the long tables
  const t1y = V.y(ROOM.table, 3.3);
  guest(p, V.x(-2.15, 3.7), t1y, 40, { coat: P.river1, hat: "none", hair: P.ink3, look: 1 });
  guest(p, V.x(-1.45, 3.7), t1y, 40, { coat: P.river1, hat: "cap", look: 1, glass: 1 });
  guest(p, V.x(-0.8, 3.7), t1y, 38, { coat: P.river0, hat: "none", hair: P.stone3, look: -1 });
  backTable(p, -2.6, -0.4, 3.3, 3.9, P.stone3, P.stone1);
  smallGlass(p, V.x(-1.75, 3.6), V.y(ROOM.table, 3.6), "most");
  const t2y = V.y(ROOM.table, 3.0);
  guest(p, V.x(1.5, 3.4), t2y, 42, { coat: P.river1, hat: "cap", look: -1, wide: true });
  guest(p, V.x(2.25, 3.4), t2y, 40, { coat: P.olive1, hat: "none", hair: P.wood1, look: -1 });
  backTable(p, 1.0, 2.75, 3.0, 3.6, P.stone3, P.stone1);
  smallGlass(p, V.x(1.8, 3.3), V.y(ROOM.table, 3.3), "beer");
  // orange plastic chairs in the gap
  for (const X of [0.15, 0.6]) {
    const [cx, cy] = V.pt(X, 0.75, 3.6);
    p.box(cx - 5, cy - 12, 11, 9, P.brick3, P.ink1);
    p.box(cx - 5, cy - 3, 11, 3, P.brick2, P.ink1);
    p.rect(cx - 4, cy, 1, V.y(ROOM.floor, 3.6) - cy, P.stone1);
    p.rect(cx + 4, cy, 1, V.y(ROOM.floor, 3.6) - cy, P.stone1);
  }

  // fluorescent tubes
  for (const Z of [2.2, 3.2, 4.2]) {
    for (const X of [-1.3, 1.3]) {
      const q = [V.pt(X - 0.6, ROOM.ceil, Z), V.pt(X + 0.6, ROOM.ceil, Z), V.pt(X + 0.6, ROOM.ceil, Z + 0.15), V.pt(X - 0.6, ROOM.ceil, Z + 0.15)];
      p.shape(q, P.paper4, P.stone1);
    }
  }
  p.light(320, 40, 300, 50, 1, 0.6);
  ourTable(p, "laminate", { light: 1 });
  p.vignette(-1.5, 0.52, 0, 30);
}

