// Code-painted kiosk (contract §2, §9: "Sudoku auf der Rätselseite des Lokalblatts am Kiosk"): a wooden kiosk with
// a striped awning in the evening light, magazines in the window, newspaper stacks and sweet jars on the counter.
// Fallback for the painted art "bg/kiosk" (640×360 adventure raster). No lettering anywhere (contract §0.8).
import { P, type Px } from "../screens/paint/painter";

export function paintKiosk(p: Px) {
  // pavement everywhere, then the evening sky and the street behind
  p.rect(0, 0, 640, 360, P.stone2);
  for (let r = 0; r < 19; r++) for (let x = r % 2 ? 0 : 12; x < 640; x += 24) p.rect(x, 136 + r * 12, 1, 12, P.stone1);
  for (let y = 136; y < 360; y += 12) p.rect(0, y, 640, 1, P.stone1);
  p.bands(0, 0, 640, 96, [P.river3, P.river4, P.dusk4, P.beer4]);
  for (let i = 0; i < 7; i++) {
    const x = i * 100 - 30;
    const h = 44 + ((i * 7) % 3) * 10;
    const top = 112 - h;
    p.box(x, top, 84, h + 20, i % 2 ? P.paper2 : P.paper3);
    p.shape([[x - 6, top], [x + 90, top], [x + 42, top - 30]], i % 3 ? P.brick1 : P.brick0);
    // Fachwerk beams
    p.rect(x + 1, top + 14, 82, 2, P.wood1);
    for (let k = 0; k < 4; k++) p.rect(x + 8 + k * 22, top + 1, 2, h + 18, P.wood1);
    p.line(x + 10, top + 16, x + 28, top + h, P.wood1);
    for (let k = 0; k < 3; k++) p.box(x + 13 + k * 22, top + 22, 10, 12, P.river2);
  }
  p.rect(0, 112, 640, 20, P.stone2);
  p.rect(0, 112, 640, 2, P.stone3);
  for (let x = 0; x < 640; x += 24) p.rect(x, 120, 1, 12, P.stone1);

  // kiosk body: posts, roof slab and the striped awning with a scalloped edge
  p.rect(36, 30, 568, 330, P.wood1);
  p.rect(36, 30, 4, 330, P.wood0);
  p.rect(600, 30, 4, 330, P.wood0);
  p.box(30, 14, 580, 18, P.wood2);
  p.rect(31, 15, 578, 3, P.wood4);
  for (let k = 0; k < 29; k++) {
    const x = 30 + k * 20;
    const col = k % 2 ? P.paper4 : P.brick2;
    p.rect(x, 32, 20, 30, col);
    p.ellipse(x + 10, 62, 9, 6, col);
  }
  p.rect(30, 32, 580, 1, P.ink0);
  for (let x = 30; x < 610; x += 20) p.px(x, 62, P.ink0);

  // window behind the counter: magazine rack and hanging newspapers
  p.box(70, 74, 500, 170, P.wood0);
  p.rect(72, 76, 496, 166, P.ink2);
  const mags = [P.brick2, P.river2, P.beer2, P.forest3, P.dusk2, P.road1, P.olive2, P.river3, P.brick3, P.forest2];
  for (let row = 0; row < 3; row++) {
    const y = 84 + row * 52;
    p.rect(74, y + 44, 492, 4, P.wood3);
    for (let k = 0; k < 13; k++) {
      const x = 82 + k * 37 + (row % 2) * 8;
      if (x + 30 > 566) break;
      const col = mags[(k * 3 + row * 5) % mags.length];
      p.box(x, y + 4, 30, 40, col);
      p.rect(x + 3, y + 8, 24, 6, P.paper4);
      p.rect(x + 3, y + 18, 14, 14, mags[(k + row + 4) % mags.length]);
      p.rect(x + 19, y + 18, 8, 2, P.paper3);
      p.rect(x + 19, y + 23, 8, 2, P.paper3);
    }
  }
  // the clothes line with folded newspapers
  p.line(74, 80, 566, 80, P.stone1);

  // counter top and front
  p.rect(20, 246, 600, 114, P.wood2);
  for (let x = 24; x < 620; x += 30) p.rect(x, 262, 2, 98, P.wood1);
  p.rect(20, 262, 600, 3, P.wood0);
  p.box(10, 238, 620, 14, P.wood4);
  p.rect(11, 239, 618, 3, P.wood5);

  // newspaper stacks (grey text lines, no letters)
  const stack = (x: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const y = 236 - i * 4;
      p.box(x - (i % 2), y - 10, 74, 12, i % 2 ? P.paper2 : P.paper3, P.ink2);
    }
    const top = 236 - (n - 1) * 4 - 10;
    p.box(x, top - 26, 74, 30, P.paper3, P.ink2);
    p.rect(x + 6, top - 22, 40, 4, P.ink3);
    for (let k = 0; k < 4; k++) p.rect(x + 6, top - 14 + k * 4, 62 - (k % 2) * 14, 1, P.stone1);
  };
  stack(36, 4);
  stack(120, 6);
  stack(520, 5);

  // sweet jars and a coin tray
  for (const [x, col] of [[230, P.brick3], [262, P.forest4], [294, P.beer2]] as const) {
    p.box(x, 206, 24, 32, P.river5, P.ink1);
    p.rect(x + 2, 214, 20, 22, col);
    p.speckle(x + 2, 214, 20, 22, [P.paper4, P.brick1, P.forest3], 30);
    p.box(x + 4, 200, 16, 7, P.wood3);
  }
  p.box(400, 228, 70, 10, P.stone2);
  p.oval(420, 230, 4, 2, P.beer2);
  p.oval(436, 231, 4, 2, P.stone3);
  p.oval(450, 229, 4, 2, P.beer3);
}
