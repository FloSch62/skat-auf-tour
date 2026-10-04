// Code-painted park with the big outdoor chessboard (contract §2: "Schach am Freiluftbrett im Park"). Fallback for
// the painted art "bg/park" (640×360 adventure raster, drawn 3×). Evening light, chestnut trees, a church tower
// behind the hedge, a paved square with the painted board and two knee-high wooden pieces. No lettering.
import { P, type Pt, type Px } from "../screens/paint/painter";

export function paintPark(p: Px) {
  // sky and the town behind the park
  p.grad(0, 0, 640, 150, [P.river3, P.river4, P.dusk4, P.beer4], 10);
  p.ellipse(120, 40, 34, 10, P.river5);
  p.ellipse(150, 34, 22, 8, P.river5);
  p.ellipse(520, 58, 40, 10, P.dusk4);
  // church tower and roofs
  p.box(470, 40, 26, 90, P.paper2);
  p.shape([[466, 42], [500, 42], [483, 6]], P.brick0);
  p.box(478, 60, 10, 14, P.ink2);
  p.oval(483, 52, 5, 5, P.paper4);
  for (const [x, w, h] of [[360, 70, 40], [420, 46, 52], [520, 80, 44], [592, 60, 36]] as const) {
    p.box(x, 130 - h, w, h + 6, P.paper3);
    p.shape([[x - 4, 130 - h], [x + w + 4, 130 - h], [x + w / 2, 130 - h - 22]], P.brick1);
    p.box(x + 10, 140 - h, 8, 10, P.river2);
    if (w > 50) p.box(x + w - 20, 140 - h, 8, 10, P.river2);
  }
  // hedge and lawn
  p.grad(0, 118, 640, 70, [P.forest1, P.forest2, P.forest3], 6);
  for (let x = -10; x < 650; x += 22) p.oval(x, 122 + ((x * 7) % 5), 14, 9, x % 44 ? P.forest1 : P.forest2);
  p.speckle(0, 140, 640, 50, [P.forest4, P.forest2], 260);
  // chestnut trees left and right
  p.tree(40, 196, 34);
  p.tree(150, 178, 26);
  p.tree(600, 200, 36);
  p.tree(548, 176, 22);

  // the paved square
  const top = 186;
  p.rect(0, top, 640, 360 - top, P.stone2);
  for (let y = top; y < 360; y += 10) p.rect(0, y, 640, 1, P.stone1);
  for (let r = 0, y = top; y < 360; y += 10, r++) for (let x = (r % 2) * 14; x < 640; x += 28) p.rect(x, y, 1, 10, P.stone1);
  p.rect(0, top, 640, 2, P.stone3);

  // the painted board in perspective: rows get deeper towards the viewer
  const cx = 330;
  const rows: number[] = [];
  let y = 214;
  for (let r = 0; r <= 8; r++) {
    rows.push(y);
    y += 12 + r * 2.4;
  }
  const halfW = (yy: number) => 120 + (yy - 214) * 1.15;
  const corner = (c: number, yy: number): Pt => [Math.round(cx - halfW(yy) + (2 * halfW(yy) * c) / 8), Math.round(yy)];
  p.shape([corner(0, rows[0] - 3), corner(8, rows[0] - 3), corner(8, rows[8] + 3), corner(0, rows[8] + 3)].map(([x, yy], i) => [x + (i === 0 || i === 3 ? -4 : 4), yy] as Pt), P.wood1);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const quad: Pt[] = [corner(c, rows[r]), corner(c + 1, rows[r]), corner(c + 1, rows[r + 1]), corner(c, rows[r + 1])];
      p.poly(quad, (r + c) % 2 ? P.ink2 : P.paper3);
    }
  }
  // two big wooden pieces standing on the board: a king and a pawn
  woodenPiece(p, 268, rows[3] + 8, 1.3, true, P.paper3);
  woodenPiece(p, 400, rows[5] + 10, 1.0, false, P.ink2);

  // a bench, a lamp post and a litter bin
  p.box(36, 268, 92, 8, P.wood3);
  p.box(36, 252, 92, 6, P.wood3);
  p.rect(44, 276, 4, 20, P.ink1);
  p.rect(116, 276, 4, 20, P.ink1);
  p.rect(150, 140, 4, 100, P.ink1);
  p.rect(146, 238, 12, 4, P.ink1);
  p.box(142, 128, 20, 14, P.beer3);
  p.rect(140, 126, 24, 3, P.ink1);
  p.box(590, 270, 18, 26, P.forest1);

  // evening light from the left, a soft vignette
  p.vignette(-1, 0.78);
}

/** A knee-high wooden piece: a king (with cross) or a pawn, standing on the board. */
function woodenPiece(p: Px, x: number, base: number, s: number, king: boolean, col: string) {
  const S = (v: number) => Math.round(v * s);
  p.oval(x, base, S(16), S(5), P.ink1);
  p.shape([[x - S(14), base], [x + S(14), base], [x + S(9), base - S(10)], [x - S(9), base - S(10)]], col);
  if (king) {
    p.shape([[x - S(7), base - S(10)], [x + S(7), base - S(10)], [x + S(5), base - S(44)], [x - S(5), base - S(44)]], col);
    p.shape([[x - S(11), base - S(44)], [x + S(11), base - S(44)], [x + S(8), base - S(54)], [x - S(8), base - S(54)]], col);
    p.box(x - S(2), base - S(68), S(5), S(14), col);
    p.box(x - S(6), base - S(64), S(13), S(4), col);
  } else {
    p.shape([[x - S(6), base - S(10)], [x + S(6), base - S(10)], [x + S(4), base - S(24)], [x - S(4), base - S(24)]], col);
    p.oval(x, base - S(30), S(8), S(8), col);
  }
}
