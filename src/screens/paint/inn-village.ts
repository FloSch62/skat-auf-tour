// Dorfwirtschaft (inns/village): holzgetäfelte Stube with a green Kachelofen in the corner (a cat on the Ofenbank),
// club pennants, the Sparschrank, a regulator clock, antlers, a lace-curtained window onto the evening village, the
// counter with the beer tap, regulars under an orange lamp, and the Stammtisch sign over our table.
import { P, Px } from "./painter";
import { box3, sideHorizontals, sideVerticals, steps } from "./persp";
import { V, ROOM, TABLE_Y, backRect, backTable, ourTable, roomShell, sideDoor, smallGlass } from "./inn-common";
import { antlers, beerTap, bottleShelf, coat, eveningView, feltHat, guest, hangingLamp, pennant, regulator, sparschrank, stammtischSign, windowFront } from "./props";

export function paintVillageInn(p: Px) {
  roomShell(p, { ceiling: "beams", wainscot: -0.1, wallCol: P.paper1, wallMottle: P.paper0 });
  const b = backRect();

  // ── back wall, left to right ──
  // club pennants
  const pc: [string, string][] = [
    [P.brick1, P.paper4],
    [P.river1, P.beer2],
    [P.forest1, P.paper3],
    [P.beer1, P.brick1],
    [P.ink2, P.paper4],
    [P.brick2, P.beer3],
    [P.dusk1, P.paper3],
  ];
  pc.forEach(([m, t], i) => pennant(p, 200 + i * 11, 50 + (i % 2) * 2, 9, 20, m, t));
  // regulator clock
  regulator(p, 285, 50, 1);
  // window onto the village
  windowFront(p, 312, 60, 56, 52, { view: (pp, x, y, w, h) => eveningView(pp, x, y, w, h), lace: true, flowers: true, drapes: P.brick1 });
  // antlers and the Sparschrank
  antlers(p, 394, 74, 0.9);
  sparschrank(p, 418, 52, 4, 5, 8);

  // ── the green Kachelofen in the left corner ──
  const ox0 = -3;
  const ox1 = -2.15;
  const oz0 = 4.15;
  const top = -0.62;
  const kf = box3(p, V, ox0, ox1, top, ROOM.floor, oz0, ROOM.back, { front: P.forest2, side: P.forest1 });
  // tiles on the front
  const [fx, fy] = kf.front[0];
  const fw = kf.front[1][0] - fx;
  const tw = Math.round(V.s(0.14, oz0));
  for (let ty = fy + 6; ty < TABLE_Y; ty += tw) {
    for (let tx = fx + 2; tx < fx + fw - 2; tx += tw) {
      p.rect(tx, ty, tw - 1, tw - 1, P.forest3);
      p.rect(tx + 1, ty + 1, tw - 2, tw - 2, P.forest2);
      p.rect(tx + 1, ty + 1, tw - 3, 1, P.forest4);
      p.ellipse(tx + Math.floor(tw / 2), ty + Math.floor(tw / 2), 1, 1, P.forest3);
      p.rect(tx + tw - 1, ty, 1, tw, P.forest1);
      p.rect(tx, ty + tw - 1, tw, 1, P.forest1);
    }
  }
  // tiles on the side
  sideVerticals(p, V, ox1, top + 0.08, ROOM.floor, steps(oz0, ROOM.back, 6), P.forest0);
  sideHorizontals(p, V, ox1, steps(top + 0.1, ROOM.floor, 13), oz0, ROOM.back, P.forest0);
  // cornice and crown
  box3(p, V, ox0, ox1 + 0.07, top - 0.08, top + 0.06, oz0 - 0.07, ROOM.back, { front: P.forest1, side: P.forest0 });
  const [cx0, cy0] = V.pt(ox0, top - 0.08, oz0 - 0.07);
  const [cx1] = V.pt(ox1 + 0.07, top - 0.08, oz0 - 0.07);
  p.rect(cx0, cy0 + 1, cx1 - cx0, 1, P.forest4);
  // brass rail in front of the stove
  const r0 = V.pt(ox0, -0.28, 3.95);
  const r1 = V.pt(ox1 + 0.12, -0.28, 3.95);
  p.rect(r0[0], r0[1], r1[0] - r0[0], 2, P.beer1);
  p.rect(r0[0], r0[1], r1[0] - r0[0], 1, P.beer3);
  for (const X of [ox0 + 0.25, ox1 + 0.1]) {
    const a = V.pt(X, -0.28, 3.95);
    p.rect(a[0], a[1], 1, 6, P.beer0);
  }
  // a towel on the rail
  p.box(r0[0] + 14, r0[1] + 1, 8, 12, P.paper4, P.ink1);
  p.rect(r0[0] + 15, r0[1] + 6, 6, 1, P.brick2);
  // Ofenbank with a sleeping cat
  const bench = box3(p, V, -3, -1.95, 0.72, ROOM.floor, 3.85, ROOM.back, { front: P.wood2, top: P.wood4, side: P.wood1 });
  const [bx, by] = bench.front[0];
  p.rect(bx + 1, by + 1, bench.front[1][0] - bx - 1, 1, P.wood3);
  p.oval(bx + 30, by - 4, 8, 4, P.ink2, P.ink0);
  p.oval(bx + 38, by - 6, 3, 3, P.ink2, P.ink0);
  p.px(bx + 37, by - 10, P.ink2);
  p.px(bx + 40, by - 10, P.ink2);
  p.rect(bx + 22, by - 2, 5, 1, P.ink2);
  p.px(bx + 39, by - 6, P.olive3);
  p.rect(bx + 27, by - 7, 6, 1, P.ink4);

  // ── the regulars' table under the orange lamp ──
  const t = backTable(p, -1.75, -0.55, 3.7, 4.4, P.wood3, P.wood1);
  guest(p, 210, t.y - 1, 36, { coat: P.olive1, hat: "hat", look: 1, wide: true });
  guest(p, 240, t.y - 2, 34, { coat: P.river1, hat: "none", hair: P.stone2, glass: 1, look: -1 });
  guest(p, 268, t.y - 1, 35, { coat: P.wood2, hat: "cap", look: -1 });
  smallGlass(p, t.x + 12, t.y + 1, "beer");
  smallGlass(p, t.x + 40, t.y + 2, "wine");
  smallGlass(p, t.x + 72, t.y + 1, "beer");
  p.rect(t.x + 52, t.y - 1, 9, 2, P.paper4);
  hangingLamp(p, 238, 74, 28, 13, V.y(ROOM.ceil, 4.0), "orange");

  // ── the counter in the back right with the beer tap and the landlady ──
  // shelf with bottles behind it
  bottleShelf(p, 462, 90, 36, { glasses: true });
  bottleShelf(p, 462, 72, 36);
  guest(p, 484, 131, 32, { coat: P.brick1, hat: "kerchief", look: -1 });
  p.rect(474, 116, 20, 15, P.paper4);
  p.rect(474, 116, 20, 1, P.paper2);
  const cnt = box3(p, V, 1.75, ROOM.halfW, 0.15, ROOM.floor, 4.1, ROOM.back, { front: P.wood2, side: P.wood1, top: P.wood4 });
  const [kx, ky] = cnt.front[0];
  const kw = cnt.front[1][0] - kx;
  p.rect(kx + 1, ky + 1, kw - 1, 2, P.wood4);
  p.rect(kx + 1, ky + 3, kw - 1, 1, P.ink1);
  for (let i = 0; i < 4; i++) {
    const px0 = kx + 4 + Math.round(((kw - 6) * i) / 4);
    const pw = Math.round((kw - 6) / 4) - 4;
    p.rect(px0, ky + 9, pw, TABLE_Y - ky, P.wood1);
    p.rect(px0 + 1, ky + 10, pw - 1, TABLE_Y - ky, P.wood3);
    p.rect(px0 + 1, ky + 10, pw - 2, TABLE_Y - ky, P.wood2);
  }
  beerTap(p, kx + 22, ky + 1);
  smallGlass(p, kx + 40, ky + 1, "beer");
  smallGlass(p, kx + 46, ky + 1, "beer");
  hangingLamp(p, 474, 50, 24, 12, V.y(ROOM.ceil, 4.3), "orange");

  // ── the door to the hall and the coat rack on the right wall ──
  sideDoor(p, ROOM.halfW, 3.75, 4.45, -0.85, { pane: true });
  const [rx0, ry] = V.pt(3, -0.42, 3.0);
  const [rx1, ry1] = V.pt(3, -0.42, 3.55);
  p.line(rx0, ry, rx1, ry1, P.wood0, 2);
  coat(p, rx0 - 8, ry + 2, 46, P.olive1);
  coat(p, rx1 - 4, ry1 + 2, 40, P.wood1);
  feltHat(p, rx0 - 10, ry - 2, P.olive1);

  // the Stammtisch sign over our table
  stammtischSign(p, 162, 26, 0);

  // ── light ──
  p.light(238, 104, 92, 64, 2, 0.5);
  p.light(474, 92, 70, 54, 2, 0.5);
  p.light(240, 140, 40, 20, 1, 0.6);
  p.light(324, 86, 40, 30, 1, 0.5);
  ourTable(p, "stammtisch", { light: 1 });
  p.vignette(-1.6, 0.5, 0, 30);
  void b;
}
