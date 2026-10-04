// Flohmarkt (bg/market): the market square on a summer evening. Fachwerk houses around, striped parasols over
// trestle tables of junk — lamps, a gramophone, records, clocks, beer steins, a rocking horse — bunting
// overhead and a few browsers.
import { P, Px, type Pt } from "./painter";
import { house, sky } from "./land";
import { bunting, figure } from "./props";

function parasol(p: Px, cx: number, topY: number, r: number, cols: [string, string]) {
  p.rect(cx, topY, 2, Math.round(r * 2.2), P.stone1);
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI + (Math.PI * i) / n;
    const a1 = Math.PI + (Math.PI * (i + 1)) / n;
    const pts: Pt[] = [
      [cx, topY - Math.round(r * 0.35)],
      [cx + Math.round(Math.cos(a0) * r), topY + Math.round(-Math.sin(a0) * r * 0.3)],
      [cx + Math.round(Math.cos(a1) * r), topY + Math.round(-Math.sin(a1) * r * 0.3)],
    ];
    p.poly(pts, i % 2 ? cols[0] : cols[1]);
  }
  p.line(cx - r, topY, cx, topY - Math.round(r * 0.35), P.ink1);
  p.line(cx + r, topY, cx, topY - Math.round(r * 0.35), P.ink1);
  for (let x = cx - r; x <= cx + r; x += 4) p.ellipse(x + 2, topY + 1, 2, 1, (x / 4) % 2 ? cols[0] : cols[1]);
  p.rect(cx - r, topY, r * 2 + 1, 1, P.ink1);
  p.px(cx, topY - Math.round(r * 0.35) - 1, P.ink1);
}

function stall(p: Px, x: number, y: number, w: number, items: ((x: number, y: number) => void)[]) {
  // trestle table with a cloth
  p.box(x, y, w, 4, P.paper3, P.ink1);
  p.rect(x + 1, y + 4, w - 2, 8, P.paper2);
  for (let k = x + 2; k < x + w - 2; k += 4) p.px(k, y + 12, P.paper1);
  p.line(x + 4, y + 12, x + 10, y + 26, P.wood1, 2);
  p.line(x + 10, y + 12, x + 4, y + 26, P.wood1, 2);
  p.line(x + w - 10, y + 12, x + w - 4, y + 26, P.wood1, 2);
  p.line(x + w - 4, y + 12, x + w - 10, y + 26, P.wood1, 2);
  const step = w / (items.length + 1);
  items.forEach((f, i) => f(Math.round(x + step * (i + 1)), y));
}

const junk = {
  lamp: (p: Px) => (x: number, y: number) => {
    p.rect(x, y - 12, 1, 12, P.beer1);
    p.box(x - 4, y - 2, 9, 2, P.beer0, P.ink1);
    p.shape([[x - 5, y - 12], [x + 5, y - 12], [x + 3, y - 18], [x - 3, y - 18]], P.brick3, P.ink1);
  },
  gramophone: (p: Px) => (x: number, y: number) => {
    p.box(x - 6, y - 6, 12, 6, P.wood2, P.ink1);
    p.line(x + 2, y - 6, x + 4, y - 12, P.beer1);
    p.shape([[x + 3, y - 12], [x + 12, y - 22], [x + 14, y - 14]], P.beer2, P.ink1);
    p.ellipse(x + 12, y - 17, 2, 4, P.beer0);
  },
  records: (p: Px) => (x: number, y: number) => {
    p.box(x - 7, y - 10, 14, 10, P.wood3, P.ink1);
    for (let k = 0; k < 4; k++) p.rect(x - 6 + k * 3, y - 13, 2, 4, [P.brick2, P.river2, P.beer2, P.forest3][k]);
  },
  clock: (p: Px) => (x: number, y: number) => {
    p.box(x - 4, y - 18, 9, 18, P.wood1, P.ink1);
    p.oval(x, y - 13, 3, 3, P.paper4, P.beer0);
    p.px(x, y - 14, P.ink0);
  },
  stein: (p: Px) => (x: number, y: number) => {
    for (const dx of [-5, 3]) {
      p.box(x + dx, y - 9, 6, 9, P.stone3, P.ink1);
      p.rect(x + dx, y - 10, 6, 2, P.stone1);
      p.rect(x + dx + 1, y - 6, 4, 1, P.river1);
      p.rect(x + dx + 6, y - 7, 2, 4, P.ink1);
    }
  },
  horse: (p: Px) => (x: number, y: number) => {
    p.line(x - 9, y - 1, x + 9, y - 1, P.wood1, 2);
    p.shape([[x - 6, y - 8], [x + 5, y - 8], [x + 9, y - 16], [x + 11, y - 12], [x + 6, y - 5], [x - 6, y - 4]], P.paper3, P.ink1);
    p.rect(x + 7, y - 16, 2, 4, P.brick2);
    p.rect(x - 7, y - 10, 2, 5, P.wood3);
  },
  frames: (p: Px) => (x: number, y: number) => {
    p.box(x - 7, y - 16, 12, 14, P.beer1, P.ink1);
    p.rect(x - 5, y - 14, 8, 10, P.river3);
    p.box(x, y - 11, 9, 11, P.wood2, P.ink1);
    p.rect(x + 2, y - 9, 5, 7, P.forest3);
  },
  box: (p: Px) => (x: number, y: number) => {
    p.box(x - 8, y - 8, 16, 8, P.paper1, P.ink1);
    p.rect(x - 6, y - 10, 4, 3, P.brick2);
    p.rect(x, y - 11, 3, 4, P.forest2);
    p.rect(x + 3, y - 9, 4, 2, P.river2);
  },
};

export function paintMarket(p: Px) {
  sky(p, 0, 120, "sunset");
  // houses around the square
  const row: [number, number, number, Partial<{ gable: boolean; roof: string; wall: string }>][] = [
    [-10, 64, 70, { gable: true }],
    [60, 56, 64, { gable: false, roof: P.brick0, wall: P.paper2 }],
    [126, 60, 76, { gable: true, wall: P.brick4 }],
    [196, 70, 66, { gable: true }],
    [276, 58, 74, { gable: false, roof: P.brick1, wall: P.paper3 }],
    [344, 64, 80, { gable: true, wall: P.paper2 }],
    [418, 60, 70, { gable: true, roof: P.brick0, wall: P.beer4 }],
    [488, 72, 64, { gable: false, wall: P.paper3 }],
    [568, 66, 76, { gable: true }],
  ];
  // a back row of roofs and dark alleys between the houses
  for (let x = -10; x < 650; x += 38) house(p, x, 150, 40, 40, { gable: true, roofH: 30, storeys: 2, lit: 0.4, depth: 0, wall: P.dusk3, roof: P.brick0, timber: false, seed: x + 1 });
  p.rect(0, 120, 640, 58, P.dusk0);
  for (const [x, w, h, o] of row) house(p, x, 178, w, h, { gable: o.gable, roof: o.roof, wall: o.wall, roofH: o.gable ? Math.round(w * 0.7) : 30, storeys: 3, lit: 0.5, depth: 0, flowers: true, seed: x });
  p.light(80, 130, 200, 70, 1, 0.5);
  // the square: cobbles
  p.rect(0, 178, 640, 182, P.stone2);
  p.texture([[0, 178], [640, 178], [640, 360], [0, 360]], (x, y) => {
    const row2 = Math.floor((y - 178) / (3 + (y - 178) / 30));
    const off = row2 % 2 ? 3 : 0;
    const bw = 6 + Math.floor((y - 178) / 25);
    if ((y - 178) % (3 + Math.floor((y - 178) / 30)) === 0) return P.stone1;
    if ((x + off) % bw === 0) return P.stone1;
    return null;
  });
  p.relight(0, 178, 640, 182, (x, y) => (x > 400 ? -0.4 * ((x - 400) / 240) : 0) + (y < 200 ? -0.5 : 0));
  // bunting across the square
  bunting(p, 0, 92, 330, 108, 18, [P.brick2, P.paper4, P.river2, P.beer2, P.forest3], 6, 8);
  bunting(p, 330, 108, 640, 90, 18, [P.beer2, P.river2, P.paper4, P.brick2, P.forest3], 6, 8);
  // stalls in the back row
  parasol(p, 110, 166, 40, [P.brick2, P.paper4]);
  stall(p, 64, 196, 96, [junk.lamp(p), junk.records(p), junk.clock(p)]);
  parasol(p, 330, 162, 44, [P.river2, P.paper4]);
  stall(p, 280, 194, 104, [junk.gramophone(p), junk.stein(p), junk.frames(p)]);
  parasol(p, 540, 168, 40, [P.forest2, P.beer3]);
  stall(p, 494, 198, 92, [junk.horse(p), junk.box(p), junk.lamp(p)]);
  // browsers
  figure(p, 200, 240, 60, { coat: P.brick1, legs: P.ink2, arm: "hips", facing: 1, hat: "hat" });
  figure(p, 236, 238, 56, { coat: P.dusk1, legs: P.ink1, arm: "down", facing: -1, hat: "none", hair: P.wood2, skirt: true });
  figure(p, 440, 244, 62, { coat: P.olive1, legs: P.river0, arm: "glass", facing: -1, hat: "cap", wide: true });
  // a crate of old things in front
  p.box(60, 300, 60, 30, P.wood3, P.ink1);
  for (let k = 0; k < 3; k++) p.rect(62, 306 + k * 8, 56, 1, P.wood2);
  for (const [dx, c] of [
    [8, P.beer2],
    [22, P.river2],
    [36, P.brick2],
    [48, P.paper3],
  ] as [number, string][])
    p.box(60 + dx, 292, 8, 9, c, P.ink1);
  p.vignette(-1.2, 0.6);
}
