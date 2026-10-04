// Pokal (bg/trophy): the village festival hall after the Preisskat. A stage with red curtains and a garland, the
// winners' podium, a table with the trophies under the spotlight, flags and bunting, the audience's heads in front.
import { P, Px } from "./painter";
import { V, ROOM, backRect, backOf, roomShell } from "./inn-common";
import { bunting, trophyCup } from "./props";

export function paintTrophy(p: Px) {
  roomShell(p, { ceiling: "boards", wainscot: -0.2, wallCol: P.paper1, wallMottle: P.paper0, ceilCols: [P.wood0, P.wood1, P.wood2], panelDark: true });
  const b = backRect({ wainscot: -0.2 });
  // the stage: raised floor, curtains, a pelmet with a fir garland
  const sy = V.y(0.55, ROOM.back);
  const [sx0] = V.pt(-2.6, 0, ROOM.back);
  const [sx1] = V.pt(2.6, 0, ROOM.back);
  p.rect(sx0, b.y0 + 4, sx1 - sx0, sy - b.y0 - 4, P.dusk0);
  // curtains gathered at the sides
  for (const side of [0, 1]) {
    const cx0 = side ? sx1 - 46 : sx0;
    for (let k = 0; k < 46; k += 3) {
      const col = (k / 3) % 2 ? P.brick1 : P.brick0;
      p.rect(cx0 + k, b.y0 + 4, 3, sy - b.y0 - 4, col);
    }
    p.rect(side ? sx1 - 48 : sx0 + 44, b.y0 + 50, 4, 8, P.beer2);
  }
  p.rect(sx0, b.y0 + 4, sx1 - sx0, 14, P.brick1);
  for (let x = sx0; x < sx1; x += 8) p.ellipse(x + 4, b.y0 + 18, 4, 3, P.brick1);
  p.rect(sx0, b.y0 + 4, sx1 - sx0, 2, P.beer2);
  for (let x = sx0; x < sx1; x += 3) p.ellipse(x, b.y0 + 22 + Math.round(Math.sin(x * 0.12) * 3), 2, 2, (x / 3) % 2 ? P.forest1 : P.forest2);
  // the stage front
  p.box(sx0 - 6, sy, sx1 - sx0 + 12, b.y1 - sy + 4, P.wood2, P.ink1);
  for (let x = sx0; x < sx1; x += 10) p.rect(x, sy + 2, 1, b.y1 - sy, P.wood1);
  // the podium 2-1-3
  const pc = (sx0 + sx1) / 2;
  const steps: [number, number, string][] = [
    [-30, 16, P.stone3],
    [0, 26, P.beer2],
    [30, 10, P.brick3],
  ];
  for (const [dx, h, c] of steps) {
    p.box(pc + dx - 14, sy - h, 28, h, P.paper4, P.ink1);
    p.rect(pc + dx - 13, sy - h + 1, 26, 3, c);
  }
  // the trophies on the podium and a table
  trophyCup(p, pc, sy - 26, 30, "gold");
  trophyCup(p, pc - 30, sy - 16, 22, "silver");
  trophyCup(p, pc + 30, sy - 10, 18, "gold");
  const [tx0, ty] = V.pt(1.3, 0.1, ROOM.back - 0.4);
  p.box(tx0, ty, 40, 6, P.paper4, P.ink1);
  p.rect(tx0 + 2, ty + 6, 36, 10, P.forest2);
  trophyCup(p, tx0 + 10, ty, 16, "silver");
  trophyCup(p, tx0 + 28, ty, 20, "gold");
  // spotlights from above
  p.light(pc, sy - 30, 70, 50, 2, 0.5);
  p.light(tx0 + 20, ty - 10, 34, 24, 1, 0.5);
  // flags and bunting across the hall
  for (const Z of [3.2, 4.4]) {
    const l = V.pt(-ROOM.halfW, ROOM.ceil + 0.12, Z);
    const r = V.pt(ROOM.halfW, ROOM.ceil + 0.12, Z);
    bunting(p, l[0], l[1], r[0], r[1], Math.round(V.s(0.35, Z)), [P.paper4, P.brick2, P.beer2, P.forest2, P.river2], Math.round(V.s(0.11, Z)), Math.round(V.s(0.15, Z)));
  }
  // the audience in front: rows of heads seen from behind
  const cols = [P.olive1, P.river1, P.brick1, P.wood2, P.dusk1, P.stone1, P.forest1];
  const hairs = [P.stone3, P.ink3, P.wood1, P.stone2, P.ink2];
  let k = 0;
  for (const [y, n, size] of [
    [326, 12, 50],
    [370, 9, 70],
  ] as [number, number, number][]) {
    for (let i = 0; i < n; i++) {
      k++;
      const x = Math.round(((i + 0.5) * 640) / n + ((k * 37) % 21) - 10);
      backOf(p, x, y, size, cols[k % cols.length], hairs[k % hairs.length], k % 5 === 0 ? "hat" : undefined);
    }
  }
  p.vignette(-1.6, 0.5, 0, -20);
}
