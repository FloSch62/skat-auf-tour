// Bahnhofsgaststätte (inns/station): a tall room with green-glazed tiles below and cream walls above, milk-glass
// globe lamps, the big station clock, a yellow timetable, a long window onto the platform where a train waits
// with lit compartments, the buffet with the waiter; our table has a starched white cloth.
import { P, Px } from "./painter";
import { box3, sideHorizontals, steps } from "./persp";
import { V, ROOM, backRect, backTable, ourTable, roomShell, smallGlass } from "./inn-common";
import { coat, feltHat, figure, guest, tiles, wallClock } from "./props";

const CEIL = -2.0;

/** The platform at dusk with a waiting train (oceanic blue and beige coaches, lit windows). */
function platformView(p: Px, x: number, y: number, w: number, h: number) {
  p.grad(x, y, w, h, [P.dusk1, P.dusk2, P.dusk3, P.brick4], 4);
  // platform roof on its columns
  p.rect(x, y + 6, w, 5, P.ink2);
  p.rect(x, y + 11, w, 1, P.stone1);
  for (let cx = x + 18; cx < x + w; cx += 46) {
    p.rect(cx, y + 11, 3, h, P.ink2);
    p.line(cx - 8, y + 11, cx + 1, y + 18, P.ink2);
    p.line(cx + 11, y + 11, cx + 2, y + 18, P.ink2);
    // a hanging platform lamp
    p.rect(cx + 20, y + 12, 1, 4, P.ink2);
    p.box(cx + 17, y + 16, 7, 3, P.ink2);
    p.rect(cx + 18, y + 19, 5, 1, P.beer3);
    p.light(cx + 20, y + 28, 14, 12, 1, 0.5);
  }
  // the train
  const ty = y + Math.round(h * 0.38);
  const th = Math.round(h * 0.42);
  p.rect(x, ty, w, th, P.river1);
  p.rect(x, ty + Math.round(th * 0.45), w, Math.round(th * 0.55), P.paper2);
  p.rect(x, ty, w, 2, P.river0);
  p.rect(x, ty - 3, w, 3, P.stone1);
  for (let k = 0; k < 3; k++) {
    // coach gaps
    const gx = x + 50 + k * 70;
    p.rect(gx, ty - 3, 3, th + 3, P.ink1);
  }
  for (let wx = x + 4; wx < x + w - 6; wx += 13) {
    p.rect(wx, ty + 5, 9, 7, P.beer3);
    p.rect(wx, ty + 5, 9, 1, P.beer4);
    if ((wx >> 2) % 3 === 0) p.rect(wx + 3, ty + 8, 3, 4, P.ink3);
  }
  p.rect(x, ty + th, w, 3, P.ink1);
  // platform edge with the white line
  p.rect(x, ty + th + 3, w, h, P.stone1);
  p.rect(x, ty + th + 4, w, 1, P.paper4);
  p.dith(x, ty + th + 6, w, h, P.stone1, P.stone0, 0.4);
  // a conductor with a signal disc
  const fx = x + Math.round(w * 0.7);
  figure(p, fx, y + h - 1, 28, { coat: P.river0, legs: P.ink1, hat: "cap", arm: "raise", facing: -1 });
  p.oval(fx - 6, y + h - 32, 2, 2, P.paper4, P.ink1);
  p.px(fx - 6, y + h - 32, P.road1);
}

/** A milk-glass globe lamp on a rod. */
function globeLamp(p: Px, cx: number, cy: number, r: number, top: number) {
  p.rect(cx, top, 1, cy - r - top, P.ink1);
  p.box(cx - 2, cy - r - 2, 5, 3, P.beer0);
  p.oval(cx, cy, r, r, P.paper3, P.ink1);
  p.ellipse(cx - Math.round(r * 0.25), cy - Math.round(r * 0.25), Math.round(r * 0.55), Math.round(r * 0.55), P.paper4);
  p.ellipse(cx - Math.round(r * 0.35), cy - Math.round(r * 0.4), 1, 1, P.beer4);
}

export function paintStation(p: Px) {
  roomShell(p, { ceiling: "plain", ceil: CEIL, wainscot: null, wallCol: P.paper2, wallMottle: P.paper1, ceilCols: [P.paper0, P.paper1, P.paper2] });
  const b = backRect({ ceil: CEIL, wainscot: null });
  // ceiling cornice and a stucco band
  p.rect(b.x0, b.y0, b.w, 4, P.paper3);
  p.rect(b.x0, b.y0 + 4, b.w, 1, P.paper0);
  for (const s of [-1, 1]) sideHorizontals(p, V, s * ROOM.halfW, [CEIL + 0.06, CEIL + 0.1], 1.2, ROOM.back, P.paper0);
  // tiles: green glazed up to 1.5 m, with a dark wooden rail on top
  const tileTop = -0.3;
  const ty0 = V.y(tileTop, ROOM.back);
  tiles(p, b.x0, ty0, b.w, b.y1 - ty0, P.forest2, P.forest1, P.forest3, 7);
  p.rect(b.x0, ty0 - 3, b.w, 3, P.wood1);
  p.rect(b.x0, ty0 - 3, b.w, 1, P.wood3);
  for (const s of [-1, 1]) {
    const X = s * ROOM.halfW;
    p.poly(V.sideQuad(X, tileTop, ROOM.floor, 1.2, ROOM.back), P.forest2);
    sideHorizontals(p, V, X, steps(tileTop, ROOM.floor, 12), 1.2, ROOM.back, P.forest1);
    p.poly(V.sideQuad(X, tileTop - 0.06, tileTop, 1.2, ROOM.back), P.wood1);
  }

  // ── the long window onto the platform ──
  const [wx0, wy0] = V.pt(-1.0, -1.5, ROOM.back);
  const [wx1, wy1] = V.pt(1.95, -0.42, ROOM.back);
  p.box(wx0 - 3, wy0 - 3, wx1 - wx0 + 6, wy1 - wy0 + 6, P.wood1);
  p.rect(wx0, wy0, wx1 - wx0, wy1 - wy0, P.ink1);
  p.clip(wx0, wy0, wx1 - wx0, wy1 - wy0, () => platformView(p, wx0, wy0, wx1 - wx0, wy1 - wy0));
  // mullions and transom
  for (let k = 1; k < 4; k++) {
    const mx = wx0 + Math.round(((wx1 - wx0) * k) / 4);
    p.rect(mx - 1, wy0, 3, wy1 - wy0, P.wood1);
    p.rect(mx - 1, wy0, 1, wy1 - wy0, P.wood3);
  }
  p.rect(wx0, wy0 + 14, wx1 - wx0, 3, P.wood1);
  p.box(wx0 - 5, wy1 + 1, wx1 - wx0 + 10, 4, P.wood2);
  // short curtains at the top
  for (let k = 0; k < 4; k++) {
    const cx0 = wx0 + Math.round(((wx1 - wx0) * k) / 4) + 2;
    const cw = Math.round((wx1 - wx0) / 4) - 4;
    p.rect(cx0, wy0, cw, 13, p.pat(P.paper3, P.paper4, 0.5));
    for (let i = cx0; i < cx0 + cw; i += 3) p.px(i, wy0 + 13, P.paper2);
  }

  // ── the station clock and the timetable on the left part ──
  p.rect(200, 34, 2, 12, P.ink1);
  wallClock(p, 201, 62, 17, P.ink1, P.paper4);
  p.box(166, 92, 26, 36, P.road2, P.ink1);
  p.rect(167, 93, 24, 4, P.road0);
  for (let r = 0; r < 7; r++) {
    p.rect(169, 100 + r * 4, 8, 1, P.ink2);
    p.rect(180, 100 + r * 4, 9, 1, P.ink3);
  }
  // a newspaper rack with papers on sticks
  for (let k = 0; k < 3; k++) {
    const nx = 214 + k * 9;
    p.rect(nx, 92, 7, 2, P.wood1);
    p.box(nx, 94, 7, 22, k === 1 ? P.paper2 : P.paper3, P.ink2);
    for (let r = 0; r < 4; r++) p.rect(nx + 2, 98 + r * 4, 3, 1, P.ink4);
  }

  // ── the buffet on the right with the waiter ──
  figure(p, 470, 170, 64, { coat: P.ink1, legs: P.ink1, apron: P.paper4, arm: "hips", facing: -1, hat: "none", hair: P.ink2 });
  const bf = box3(p, V, 1.75, ROOM.halfW, 0.1, ROOM.floor, 4.0, ROOM.back, { front: P.wood1, side: P.wood0, top: P.paper2 });
  const [kx, ky] = bf.front[0];
  const kw = bf.front[1][0] - kx;
  // glass cake display on the counter
  p.box(kx + 6, ky - 12, 30, 12, p.pat(P.river5, P.stone4, 0.3), P.stone1);
  p.oval(kx + 14, ky - 4, 5, 3, P.brick4, P.ink2);
  p.oval(kx + 27, ky - 4, 5, 3, P.wood4, P.ink2);
  p.ellipse(kx + 27, ky - 6, 3, 1, P.paper4);
  // coffee machine
  p.box(kx + kw - 30, ky - 20, 18, 20, P.stone2);
  p.rect(kx + kw - 28, ky - 18, 14, 3, P.stone4);
  p.rect(kx + kw - 24, ky - 10, 6, 6, P.ink2);
  for (let i = 0; i < 4; i++) p.rect(kx + 4 + i * Math.round(kw / 4), ky + 6, Math.round(kw / 4) - 6, 40, P.wood2);

  // ── a traveller and a railwayman at a table ──
  const ty = V.y(ROOM.table, 3.5);
  guest(p, V.x(-1.6, 4.0), ty, 40, { coat: P.stone1, hat: "hat", look: 1 });
  guest(p, V.x(-0.85, 4.0), ty, 40, { coat: P.river0, hat: "cap", look: -1, glass: -1, wide: true });
  backTable(p, -2.1, -0.45, 3.5, 4.1, P.paper4, P.paper1);
  smallGlass(p, V.x(-1.35, 3.75), V.y(ROOM.table, 3.75), "beer");
  smallGlass(p, V.x(-1.1, 3.8), V.y(ROOM.table, 3.8), "beer");
  // a suitcase by the table
  const [sx, sy] = V.pt(-2.35, ROOM.floor, 3.4);
  p.box(sx, sy - 52, 26, 18, P.wood3, P.ink0);
  p.rect(sx + 1, sy - 51, 24, 2, P.wood4);
  p.rect(sx + 9, sy - 56, 8, 4, P.ink1);
  p.rect(sx + 4, sy - 46, 2, 10, P.brick2);

  // a coat stand at the left wall
  const [cx, cy] = V.pt(-ROOM.halfW + 0.2, -0.75, 3.1);
  p.rect(cx, cy - 4, 2, 120, P.wood0);
  coat(p, cx - 3, cy, 48, P.olive1);
  coat(p, cx + 6, cy + 2, 44, P.ink3);
  feltHat(p, cx + 1, cy - 4, P.ink3);

  // globe lamps
  globeLamp(p, V.x(-1.2, 3.6), V.y(-1.05, 3.6), 9, 0);
  globeLamp(p, V.x(1.3, 3.6), V.y(-1.05, 3.6), 9, 0);
  globeLamp(p, V.x(0.1, 4.6), V.y(-1.1, 4.6), 7, V.y(CEIL, 4.6));

  // light
  p.light(V.x(-1.2, 3.6), V.y(-0.9, 3.6), 110, 60, 1, 0.3);
  p.light(V.x(1.3, 3.6), V.y(-0.9, 3.6), 100, 60, 1, 0.3);
  ourTable(p, "linen", { light: 1 });
  p.vignette(-1.6, 0.5, 0, 30);
}
