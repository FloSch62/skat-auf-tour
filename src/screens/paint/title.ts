// Titel (bg/title): the wide establishing shot of the Enz valley at sunset. Steep terraced vineyards on both sides,
// the river loop with the sun on the water, a Fachwerk village with its church on the bank, and the camper with
// the motorcycle coming down the road. The upper sky stays calm for the title lettering.
import { P, Px, type Pt } from "./painter";
import { church, cloud, foliage, fruitTree, grass, house, poplar, ribbon, ridge, sky, smooth, sun, vineyard, water } from "./land";

export function paintTitle(p: Px) {
  sky(p, 0, 190, "sunset");
  sun(p, 330, 150, 13);
  cloud(p, 40, 96, 120, 5);
  cloud(p, 470, 88, 150, 6);
  cloud(p, 220, 118, 70, 4);
  // far hills in the haze
  ridge(p, 162, 18, 140, P.dusk2, { seed: 101, rim: P.dusk3, bottom: 220 });
  ridge(p, 176, 12, 90, P.dusk1, { seed: 102, rim: P.dusk2, bottom: 220 });

  // the valley floor: meadows (the slopes come down onto them)
  grass(p, [[0, 200], [640, 200], [640, 360], [0, 360]], [P.forest2, P.forest1, P.forest3]);
  // left: a big terraced vineyard slope coming down to the river
  const lTop = (x: number) => 120 + x * 0.22 + Math.sin(x * 0.03) * 5;
  const lPts: Pt[] = [];
  for (let x = 0; x <= 300; x += 6) lPts.push([x, Math.round(lTop(x))]);
  lPts.push([316, 204], [330, 216]);
  const lFoot: Pt[] = [[330, 220], [220, 232], [120, 244], [0, 262]];
  p.poly([...lPts, ...lFoot], P.forest1);
  vineyard(p, [...lPts.map(([x, y]) => [x, y + 6] as Pt), ...lFoot.map(([x, y]) => [x, y - 3] as Pt)], { lit: true, terrace: 9, tilt: 0.24, gap: 3, slant: -0.3 });
  p.path(lFoot, P.forest1, 2);
  for (let x = 0; x < 300; x += 14) foliage(p, x, Math.round(lTop(x)) + 1, 9, 5, [P.forest0, P.forest1, P.forest2], x + 1, P.ink1);
  house(p, 120, 150, 12, 9, { roofH: 7, timber: false, shutters: null, depth: 3, storeys: 1, lit: 0, wall: P.paper2 });
  // right: the opposite slope, in shade
  const rTop = (x: number) => 130 + (640 - x) * 0.2 + Math.sin(x * 0.025) * 6;
  const rPts: Pt[] = [];
  for (let x = 640; x >= 380; x -= 6) rPts.push([x, Math.round(rTop(x))]);
  rPts.push([364, 204], [352, 216]);
  const rFoot: Pt[] = [[352, 220], [470, 230], [560, 240], [640, 252]];
  p.poly([...rPts, ...rFoot.slice().reverse()], P.forest0);
  const rVine: Pt[] = [...rPts.map(([x, y]) => [x, y + 6] as Pt), ...rFoot.map(([x, y]) => [x, y - 3] as Pt)];
  vineyard(p, rVine, { terrace: 8, tilt: -0.2, gap: 3, slant: 0.3 });
  p.shade(rVine, -1);
  p.path(rFoot, P.forest0, 2);
  for (let x = 640; x > 380; x -= 14) foliage(p, x, Math.round(rTop(x)) + 1, 9, 5, [P.forest0, P.forest0, P.forest1], x, P.ink1);

  // the river loop with the sun on the water
  const river = smooth([[300, 214], [380, 220], [430, 236], [380, 256], [220, 266], [120, 284], [80, 320], [120, 370]], 3);
  const band = ribbon(river, 10, 50);
  water(p, band, [P.river1, P.dusk2, P.brick4], 330);
  // the village on the inner bank of the loop
  const vx: [number, number, number, number, boolean, string][] = [
    [214, 240, 16, 12, true, P.brick1],
    [234, 238, 20, 13, false, P.brick0],
    [276, 238, 18, 14, true, P.brick2],
    [298, 240, 16, 11, true, P.brick1],
    [318, 241, 22, 12, false, P.brick1],
    [250, 250, 18, 12, true, P.brick0],
    [342, 244, 16, 12, true, P.brick2],
  ];
  church(p, 266, 238, 0.7);
  for (const [x, y, w, h, gable, roof] of vx) house(p, x, y, w, h, { gable, roof, roofH: Math.round(w * 0.6), depth: Math.round(w * 0.25), lit: 0.7, seed: x });
  poplar(p, 368, 246, 34);
  poplar(p, 380, 247, 26);
  fruitTree(p, 196, 250, 18, 2);

  // the road coming down from the right with the camper
  const road = smooth([[700, 262], [560, 280], [440, 300], [340, 330], [300, 380]], 3);
  p.poly(ribbon(road, 14, 46), P.stone1);
  const roadIn = ribbon(road, 12, 42);
  p.poly(roadIn, P.stone2);
  for (let i = 2; i < road.length - 2; i += 3) p.line(road[i][0], road[i][1], road[i + 1][0], road[i + 1][1], P.paper3);
  // orchard trees along the road
  for (const [x, y, h] of [
    [600, 300, 40],
    [520, 330, 50],
    [610, 352, 60],
  ] as [number, number, number][])
    fruitTree(p, x, y, h, x, P.brick2);
  p.camper(410, 254, 0.75, true, true);
  // warm light from the sun across the valley, the edges dimmer
  p.light(330, 160, 260, 70, 1, 0.5);
  p.vignette(-1.4, 0.6, 0, 20);
}
