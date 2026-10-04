// Vereinsheim (inns/clubhouse): pine-panelled club room of the football club. The trophy cabinet, a wall of
// visiting clubs' pennants, the window onto the floodlit pitch, the team photo, darts with a chalk tally, beer
// crates, a fluorescent tube; our table is Resopal with a felt Skat mat.
import { P, Px } from "./painter";
import { box3, sideVerticals, steps } from "./persp";
import { V, ROOM, backRect, backTable, ourTable, roomShell, smallGlass } from "./inn-common";
import { boards, crates, dartboard, figure, guest, pennant, picture, trophyCup, windowFront } from "./props";

/** Dusk view of the floodlit football pitch. */
function pitchView(p: Px, x: number, y: number, w: number, h: number) {
  p.grad(x, y, w, h, [P.dusk0, P.dusk1, P.dusk2], 4);
  const gy = y + Math.round(h * 0.62);
  p.rect(x, gy, w, h - (gy - y), P.forest1);
  p.rect(x, gy, w, 2, P.forest2);
  p.light(x + Math.round(w * 0.5), gy + 6, Math.round(w * 0.6), 10, 1.5, 0.5);
  // touchline and goal
  p.rect(x, gy + 6, w, 1, P.forest3);
  const gx = x + Math.round(w * 0.6);
  p.rect(gx, gy - 9, 1, 10, P.paper4);
  p.rect(gx + 14, gy - 9, 1, 10, P.paper4);
  p.rect(gx, gy - 9, 15, 1, P.paper4);
  p.dith(gx + 1, gy - 8, 13, 8, null, P.stone3, 0.25);
  // floodlight mast
  const mx = x + Math.round(w * 0.18);
  p.rect(mx, y + 6, 1, gy - y - 6, P.ink2);
  p.box(mx - 4, y + 3, 9, 5, P.beer4, P.ink2);
  p.ellipse(mx, y + 9, 10, 5, p.pat(null, P.beer3, 0.25));
  // tree line behind the pitch
  for (let tx = x - 2; tx < x + w; tx += 7) p.ellipse(tx, gy - 2, 5, 4 + ((tx * 13) % 3), P.dusk0);
}

export function paintClubhouse(p: Px) {
  roomShell(p, { ceiling: "boards", wainscot: null, wallCol: P.wood4, wallMottle: P.wood3, ceilCols: [P.wood2, P.wood3, P.wood4] });
  const b = backRect({ wainscot: null });
  // pine boards on the walls
  boards(p, b.x0, b.y0 + 3, b.w, b.h, 8, [P.wood3, P.wood4, P.wood5]);
  for (const s of [-1, 1]) sideVerticals(p, V, s * ROOM.halfW, ROOM.ceil + 0.03, ROOM.floor, steps(1.25, ROOM.back, 22), P.wood3);
  // a green-and-white club stripe along the walls
  const sy = V.y(-0.95, ROOM.back);
  p.rect(b.x0, sy, b.w, 3, P.forest2);
  p.rect(b.x0, sy + 3, b.w, 2, P.paper4);
  for (const s of [-1, 1]) {
    const X = s * ROOM.halfW;
    p.poly(V.sideQuad(X, -0.95, -0.9, 1.3, ROOM.back), P.forest2);
    p.poly(V.sideQuad(X, -0.9, -0.87, 1.3, ROOM.back), P.paper4);
  }

  // ── the trophy cabinet (left) ──
  const cab = box3(p, V, -2.75, -1.55, -0.78, ROOM.floor, 4.55, ROOM.back, { front: P.wood2, side: P.wood1 });
  const [cx, cy] = cab.front[0];
  const cw = cab.front[1][0] - cx;
  p.rect(cx + 3, cy + 3, cw - 5, 76, P.ink2);
  for (let k = 0; k < 3; k++) {
    const shelfY = cy + 26 + k * 25;
    p.rect(cx + 3, shelfY, cw - 5, 2, P.wood3);
    const cups: [number, number, "gold" | "silver"][] =
      k === 0 ? [[10, 18, "gold"], [26, 22, "gold"], [42, 15, "silver"], [56, 19, "gold"]] : k === 1 ? [[12, 15, "silver"], [30, 20, "gold"], [48, 14, "silver"]] : [[16, 13, "gold"], [36, 16, "silver"], [54, 12, "gold"]];
    for (const [dx, h, m] of cups) if (dx < cw - 6) trophyCup(p, cx + dx, shelfY, h, m);
  }
  p.light(cx + Math.round(cw / 2), cy + 30, Math.round(cw / 2), 40, 1, 0.6);
  // glass reflections and the frame bars
  for (let k = 0; k < 3; k++) p.line(cx + 6 + k * 18, cy + 76, cx + 16 + k * 18, cy + 6, p.pat(null, P.stone4, 0.5));
  p.rect(cx + Math.round(cw / 2), cy + 2, 2, 78, P.wood2);
  p.rect(cx + 2, cy + 79, cw - 3, 2, P.wood1);

  // ── pennants of visiting clubs ──
  const pcols = [P.brick1, P.river1, P.forest1, P.beer1, P.ink2, P.brick2, P.dusk1, P.olive1, P.river2, P.paper4, P.forest2, P.brick0];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const i = r * 4 + c;
      pennant(p, 232 + c * 14 + (r % 2) * 4, 50 + r * 23, 10, 17, pcols[i], pcols[(i + 5) % pcols.length] === pcols[i] ? P.paper4 : pcols[(i + 5) % pcols.length]);
    }
  }

  // ── window onto the floodlit pitch ──
  windowFront(p, 306, 60, 62, 50, { view: pitchView, frame: P.paper3, cross: true, sill: true });

  // ── team photo and the club scarf ──
  picture(p, 380, 64, 40, 26, "photo", P.wood1);
  p.rect(372, 54, 56, 5, P.forest2);
  for (let x = 374; x < 426; x += 4) p.rect(x, 54, 2, 5, P.paper4);
  p.rect(370, 56, 3, 12, P.forest2);
  p.rect(427, 56, 3, 12, P.forest2);

  // ── darts with the chalk tally ──
  p.box(436, 56, 36, 44, P.wood1);
  dartboard(p, 454, 76, 13);
  p.box(478, 60, 20, 30, P.ink2, P.wood1);
  for (let r = 0; r < 4; r++) for (let k = 0; k < 3 + (r % 2); k++) p.rect(481 + k * 3, 64 + r * 6, 1, 4, P.paper3);
  p.line(480, 70, 492, 66, P.paper3);

  // beer crates, a dart player and a friend watching
  crates(p, 426, V.y(ROOM.floor, 4.85), 5, 16, 9);
  figure(p, 404, 196, 64, { coat: P.forest2, legs: P.river0, arm: "throw", facing: 1, hat: "none", hair: P.wood1 });
  figure(p, 486, 197, 60, { coat: P.brick1, legs: P.ink2, arm: "glass", facing: -1, hat: "cap", wide: true });

  // ── a table of club members on the left ──
  const ty = V.y(ROOM.table, 3.4);
  guest(p, V.x(-1.0, 3.9), ty, 40, { coat: P.forest2, hat: "none", hair: P.ink3, look: 1, glass: 1 });
  guest(p, V.x(-0.35, 3.9), ty, 38, { coat: P.paper3, hat: "none", hair: P.stone2, look: -1 });
  backTable(p, -1.5, 0.05, 3.4, 4.0, P.olive3, P.olive1);
  smallGlass(p, V.x(-0.85, 3.6), V.y(ROOM.table, 3.6), "beer");
  smallGlass(p, V.x(-0.5, 3.7), V.y(ROOM.table, 3.7), "beer");

  // fluorescent tubes on the ceiling
  for (const [X, z0, z1] of [
    [0, 2.0, 3.0],
    [-1.2, 3.2, 4.2],
    [1.2, 3.2, 4.2],
  ] as [number, number, number][]) {
    p.shape([V.pt(X - 0.1, ROOM.ceil, z0), V.pt(X + 0.1, ROOM.ceil, z0), V.pt(X + 0.1, ROOM.ceil, z1), V.pt(X - 0.1, ROOM.ceil, z1)], P.stone3, P.ink2);
    p.poly([V.pt(X - 0.05, ROOM.ceil + 0.02, z0 + 0.05), V.pt(X + 0.05, ROOM.ceil + 0.02, z0 + 0.05), V.pt(X + 0.05, ROOM.ceil + 0.02, z1 - 0.05), V.pt(X - 0.05, ROOM.ceil + 0.02, z1 - 0.05)], P.paper4);
  }

  // light
  p.light(V.x(-0.7, 3.7), V.y(-0.1, 3.7), 100, 60, 1, 0.5);
  p.light(320, 50, 220, 70, 1, 0.6);
  ourTable(p, "formica", { mat: true, light: 1 });
  p.vignette(-1.6, 0.5, 0, 30);
}
