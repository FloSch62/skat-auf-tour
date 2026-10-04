// Werkstatt (bg/garage): the village garage after hours. A saloon up on the lift, the pegboard with tool shapes,
// oil cans and a tyre stack, the workbench with a vice, a girlie-free calendar, the roller door open onto the
// evening yard; the Meister with his hands on his hips and the apprentice holding the exhaust that just fell off.
import { P, Px } from "./painter";
import { V, ROOM, backRect, roomShell } from "./inn-common";
import { car } from "./folk";
import { figure } from "./props";
import { sky } from "./land";

function oilCan(p: Px, x: number, baseY: number, col: string, h = 12) {
  p.box(x, baseY - h, 8, h, col, P.ink1);
  p.rect(x + 1, baseY - h + 3, 6, 3, P.paper3);
  p.rect(x + 5, baseY - h - 3, 2, 3, P.stone2);
}

export function paintGarage(p: Px) {
  roomShell(p, { ceiling: "plain", wainscot: null, wallCol: P.paper2, wallMottle: P.paper1, ceilCols: [P.stone0, P.stone1, P.stone2], floorCol: P.stone1 });
  const b = backRect({ wainscot: null });
  // a painted dado and oil stains
  const dado = V.y(0.1, ROOM.back);
  p.rect(b.x0, dado, b.w, b.y1 - dado, P.river0);
  p.rect(b.x0, dado, b.w, 1, P.river1);
  for (const s of [-1, 1]) p.poly(V.sideQuad(s * ROOM.halfW, 0.1, ROOM.floor, 1.2, ROOM.back), P.river0);
  // concrete floor in front (the whole lower part)
  p.poly([[0, b.y1], [640, b.y1], [640, 360], [0, 360]], P.stone1);
  p.dith(0, b.y1, 640, 360 - b.y1, null, P.stone0, 0.12);
  for (const [x, y, rx] of [
    [250, 300, 22],
    [470, 340, 16],
    [130, 280, 12],
  ] as [number, number, number][])
    p.ellipse(x, y, rx, Math.round(rx * 0.25), p.pat(null, P.ink3, 0.5));

  // the roller door on the right wall, open onto the evening yard
  const q = V.sideQuad(ROOM.halfW, -1.0, ROOM.floor, 2.2, 4.0);
  p.within(q, () => {
    sky(p, 0, 200, "sunset", 400, 240);
    p.rect(400, 180, 240, 180, P.stone1);
    p.rect(560, 150, 30, 40, P.ink2);
  });
  p.path([...q, q[0]], P.ink1, 2);
  p.shape(V.sideQuad(ROOM.halfW, -1.25, -1.0, 2.2, 4.0), P.stone2, P.ink1);

  // pegboard with tool shapes over the bench (back wall left)
  const [px0, py0] = V.pt(-2.8, -1.1, ROOM.back);
  const [px1, py1] = V.pt(-0.6, -0.15, ROOM.back);
  p.box(px0, py0, px1 - px0, py1 - py0, P.wood4, P.ink1);
  for (let y = py0 + 3; y < py1; y += 4) for (let x = px0 + 3; x < px1; x += 4) p.px(x, y, P.wood3);
  const tools: [number, number, (x: number, y: number) => void][] = [
    [8, 6, (x, y) => { p.rect(x, y, 2, 16, P.ink2); p.rect(x - 3, y, 8, 3, P.ink2); }],
    [22, 6, (x, y) => { p.rect(x, y + 4, 2, 14, P.brick1); p.rect(x - 2, y, 6, 5, P.stone2); }],
    [34, 6, (x, y) => { p.line(x, y, x + 6, y + 16, P.stone1, 2); p.line(x + 6, y, x, y + 16, P.stone1, 2); }],
    [50, 6, (x, y) => { p.rect(x, y, 2, 18, P.stone2); p.oval(x + 1, y, 3, 3, P.stone2, P.ink1); }],
    [64, 6, (x, y) => { p.rect(x, y + 6, 3, 12, P.wood1); p.rect(x - 3, y, 9, 6, P.stone1); }],
    [80, 8, (x, y) => { for (let k = 0; k < 5; k++) p.rect(x + k * 3, y, 2, 6 + k * 2, P.stone2); }],
    [104, 6, (x, y) => { p.oval(x, y + 8, 6, 6, P.ink2, P.ink1); p.ellipse(x, y + 8, 3, 3, P.wood4); }],
  ];
  for (const [dx, dy, f] of tools) if (px0 + dx < px1 - 6) f(px0 + dx, py0 + dy);
  // workbench with a vice
  const [bx0, by0] = V.pt(-2.9, 0.15, 4.7);
  const [bx1] = V.pt(-0.5, 0.15, 4.7);
  p.box(bx0, by0, bx1 - bx0, 6, P.wood3, P.ink1);
  p.rect(bx0 + 1, by0 + 1, bx1 - bx0 - 2, 1, P.wood5);
  p.box(bx0 + 4, by0 + 6, bx1 - bx0 - 8, V.y(ROOM.floor, 4.7) - by0 - 6, P.wood1, P.ink1);
  p.box(bx0 + 10, by0 - 8, 10, 8, P.river1, P.ink1);
  p.rect(bx0 + 6, by0 - 6, 18, 2, P.stone2);
  oilCan(p, bx0 + 40, by0, P.brick2);
  oilCan(p, bx0 + 50, by0, P.beer2, 10);
  oilCan(p, bx0 + 60, by0, P.forest2, 14);
  // the calendar (a landscape picture, blank date grid)
  const [cx0, cy0] = V.pt(0.0, -1.2, ROOM.back);
  p.box(cx0, cy0, 26, 34, P.paper4, P.ink1);
  p.rect(cx0 + 2, cy0 + 2, 22, 14, P.river3);
  p.poly([[cx0 + 2, cy0 + 16], [cx0 + 10, cy0 + 8], [cx0 + 16, cy0 + 12], [cx0 + 24, cy0 + 6], [cx0 + 24, cy0 + 16]], P.forest2);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) p.rect(cx0 + 3 + c * 4, cy0 + 19 + r * 3, 2, 1, P.ink4);
  // tyre stack and a red cabinet on the right back
  const [tx, ty] = V.pt(1.1, ROOM.floor, 4.6);
  for (let k = 0; k < 4; k++) {
    p.oval(tx + 12, ty - 4 - k * 8, 14, 5, P.ink2, P.ink0);
    p.ellipse(tx + 12, ty - 5 - k * 8, 7, 2, P.ink1);
  }
  const [rx, ry] = V.pt(2.0, -0.6, 4.9);
  p.box(rx, ry, 34, V.y(ROOM.floor, 4.9) - ry, P.brick1, P.ink1);
  for (let k = 0; k < 4; k++) p.rect(rx + 3, ry + 4 + k * 12, 28, 8, P.brick2);

  // the lift with the saloon raised
  const [lx0, ly] = V.pt(-1.6, ROOM.floor, 3.6);
  const [lx1] = V.pt(1.6, ROOM.floor, 3.6);
  for (const x of [lx0 + 10, lx1 - 14]) {
    p.box(x, ly - 120, 6, 120, P.beer2, P.ink1);
    p.rect(x + 1, ly - 119, 1, 118, P.beer3);
  }
  p.box(lx0 + 4, ly - 64, lx1 - lx0 - 8, 5, P.stone2, P.ink1);
  car(p, lx0 + 10, ly - 66, [P.river0, P.river1, P.river3], 1, 2.2);
  // under the car, a lamp
  p.light((lx0 + lx1) / 2, ly - 50, 90, 20, 1, 0.5);

  // the Meister and the apprentice with the exhaust
  figure(p, 190, 330, 120, { coat: P.river1, legs: P.river1, arm: "hips", facing: 1, hat: "cap", wide: true });
  p.rect(178, 262, 24, 3, P.river0);
  // the Meister's moustache and red nose
  p.rect(190, 228, 9, 2, P.ink2);
  p.rect(196, 225, 3, 2, P.brick2);
  figure(p, 420, 332, 116, { coat: P.river2, legs: P.river1, arm: "raise", facing: -1, hat: "none", hair: P.beer1 });
  // the exhaust pipe he is holding up, a puff of soot
  p.line(380, 248, 440, 236, P.ink1, 6);
  p.line(380, 247, 440, 235, P.stone2, 4);
  p.line(382, 246, 438, 234, P.stone3);
  p.box(436, 230, 14, 10, P.stone1, P.ink1);
  p.ellipse(372, 250, 6, 5, P.ink3);
  p.ellipse(364, 246, 4, 3, P.ink4);

  // a hanging work lamp
  p.line(320, 0, 320, 40, P.ink1);
  p.shape([[310, 40], [330, 40], [336, 50], [304, 50]], P.forest1, P.ink1);
  p.rect(306, 50, 28, 2, P.beer4);
  p.light(320, 150, 220, 120, 1.5, 0.5);
  p.light(600, 260, 90, 80, 1, 0.5);
  p.vignette(-1.4, 0.55);
}
