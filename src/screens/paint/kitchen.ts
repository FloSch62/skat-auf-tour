// Code-painted kitchen (Daheim, contract §2): 70s wallpaper, the window with the camper outside, cupboards, the key
// hook, the dog basket, and the kitchen table with the open Tourenbuch in front. Fallback for art "bg/kitchen".
import { P, Px } from "./painter";

export function paintKitchen(p: Px) {
  // wall with 70s wallpaper: orange circles on a warm ground
  p.rect(0, 0, 640, 250, P.wood5);
  for (let y = 10; y < 240; y += 28) {
    for (let x = (y / 28) % 2 ? 0 : 14; x < 640; x += 28) {
      p.ellipse(x, y, 9, 9, P.beer2);
      p.ellipse(x, y, 6, 6, P.wood4);
      p.ellipse(x, y, 3, 3, P.brick3);
    }
  }
  // skirting and floor tiles
  p.rect(0, 238, 640, 6, P.wood1);
  for (let y = 244; y < 360; y += 12) {
    for (let x = 0; x < 640; x += 24) {
      const odd = ((x / 24 + (y - 244) / 12) | 0) % 2;
      p.rect(x, y, 24, 12, odd ? P.wood2 : P.wood3);
    }
  }

  // window with the camper in the street
  p.box(34, 34, 210, 160, P.paper4);
  p.rect(40, 40, 198, 148, P.river4);
  p.rect(40, 40, 198, 40, P.river3);
  p.dither(40, 80, 198, 10, P.river3, P.river4, 0.5);
  // hills, a vineyard and a church tower
  p.poly([[40, 140], [80, 112], [130, 128], [180, 104], [238, 124], [238, 160], [40, 160]], P.forest3);
  for (let i = 0; i < 9; i++) p.line(150 + i * 9, 112 + (i % 2), 140 + i * 9, 140, P.forest2);
  p.box(70, 100, 10, 34, P.paper2);
  p.shape([[68, 100], [82, 100], [75, 86]], P.brick1);
  p.rect(40, 150, 198, 38, P.stone2);
  p.rect(40, 150, 198, 3, P.stone3);
  p.camper(96, 118, 1, true);
  // window frame cross and sill
  p.rect(136, 40, 6, 148, P.paper4);
  p.rect(40, 108, 198, 5, P.paper4);
  p.rect(28, 192, 222, 8, P.paper2);
  p.rect(28, 199, 222, 2, P.ink2);
  // curtains
  for (const [x0, dir] of [[20, 1], [244, -1]] as const) {
    for (let i = 0; i < 18; i++) {
      p.rect(x0 + (dir > 0 ? i : -i), 26 + (i % 3), 1, 150 - i * 3, i % 3 === 0 ? P.brick1 : P.brick2);
    }
  }
  p.rect(12, 22, 250, 5, P.wood1);

  // wall clock
  p.oval(300, 48, 18, 18, P.paper4);
  p.line(300, 48, 300, 36, P.ink0);
  p.line(300, 48, 309, 52, P.ink0);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    p.px(300 + Math.round(Math.cos(a) * 15), 48 + Math.round(Math.sin(a) * 15), P.ink2);
  }
  // calendar
  p.box(286, 86, 30, 40, P.paper4);
  p.rect(287, 87, 28, 9, P.brick2);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) p.rect(290 + c * 6, 100 + r * 6, 3, 3, P.ink4);

  // key hook board with the van keys
  p.box(276, 150, 46, 16, P.wood3);
  for (let i = 0; i < 3; i++) p.rect(284 + i * 13, 160, 2, 4, P.stone1);
  p.line(285, 164, 283, 176, P.stone2);
  p.oval(283, 179, 3, 3, P.beer2);
  p.rect(281, 182, 4, 6, P.ink2);

  // cupboards on the right
  p.box(350, 20, 270, 92, P.wood3);
  for (let i = 0; i < 4; i++) {
    p.box(356 + i * 66, 26, 60, 80, P.wood4);
    p.rect(360 + i * 66, 30, 52, 2, P.wood5);
    p.rect(i % 2 ? 360 + i * 66 : 408 + i * 66, 62, 3, 10, P.stone3);
  }
  // counter, stove and a coffee machine
  p.box(350, 160, 270, 80, P.wood3);
  p.rect(350, 156, 270, 8, P.paper2);
  p.rect(350, 156, 270, 2, P.paper4);
  for (let i = 0; i < 4; i++) {
    p.box(356 + i * 66, 170, 60, 64, P.wood4);
    p.rect(382 + i * 66, 176, 8, 3, P.stone3);
  }
  p.box(440, 128, 40, 30, P.brick2);
  p.rect(444, 132, 32, 10, P.ink2);
  p.box(520, 124, 26, 34, P.stone1);
  p.rect(524, 140, 18, 14, P.ink1);

  // dog basket (bottom right) with a sleeping shepherd
  p.oval(560, 300, 58, 22, P.wood2);
  p.ellipse(560, 296, 50, 16, P.brick1);
  p.ellipse(560, 294, 44, 12, P.brick2);
  p.oval(552, 288, 30, 11, P.wood1);
  p.ellipse(548, 285, 22, 7, P.wood3);
  p.oval(584, 284, 11, 9, P.wood1);
  p.ellipse(586, 281, 7, 5, P.wood3);
  p.shape([[586, 276], [592, 268], [594, 278]], P.wood1);
  p.shape([[578, 276], [580, 267], [586, 274]], P.wood1);
  p.oval(596, 288, 8, 4, P.wood1);
  p.ellipse(597, 287, 6, 2, P.wood3);
  p.rect(603, 286, 3, 3, P.ink0);
  p.line(586, 283, 590, 284, P.ink0);
  p.line(524, 292, 512, 298, P.wood1, 3);

  // the kitchen table in front with the open Tourenbuch
  p.rect(0, 300, 470, 60, P.wood1);
  p.rect(0, 296, 470, 6, P.wood3);
  p.rect(0, 296, 470, 2, P.wood4);
  for (let i = 0; i < 6; i++) p.line(10 + i * 80, 310, 60 + i * 80, 312, P.wood0);
  // open book
  p.shape([[120, 280], [200, 276], [204, 312], [118, 316]], P.paper4);
  p.shape([[204, 276], [286, 280], [290, 316], [206, 312]], P.paper3);
  p.line(204, 276, 205, 312, P.ink3);
  for (let i = 0; i < 5; i++) {
    p.line(128, 287 + i * 5, 194, 284 + i * 5, P.ink5);
    p.line(214, 285 + i * 5, 280, 288 + i * 5, P.ink5);
  }
  p.oval(250, 302, 8, 8, P.brick2);
  p.ellipse(250, 302, 5, 5, P.paper4);
  // coffee cup and a Brezel on a plate
  p.oval(70, 292, 12, 4, P.paper2);
  p.box(62, 278, 16, 14, P.paper4);
  p.rect(64, 280, 12, 3, P.wood0);
  p.oval(82, 285, 3, 4, P.paper4);
  p.oval(370, 300, 26, 7, P.paper4);
  p.oval(370, 296, 14, 9, P.wood3);
  p.ellipse(364, 296, 4, 4, P.paper4);
  p.ellipse(376, 296, 4, 4, P.paper4);
  p.ellipse(370, 302, 6, 2, P.paper4);
  p.speckle(358, 290, 26, 10, [P.paper4], 8);
}
