// Stellplatz an der Enzschleife (bg/pitch-enztal): dusk at the river loop. Terraced vineyards climb the outer bank
// in the last sun, the village with its church sits on the spur inside the loop, and on the meadow by the water
// stands the camper with lit windows, a chair, a lantern and the power post.
import { P, Px, type Pt } from "./painter";
import { campChair, church, cloud, fence, foliage, fruitTree, grass, gravel, house, lantern, poplar, powerPost, ribbon, ridge, sky, smooth, sun, vineyard, water } from "./land";

export function paintPitchEnztal(p: Px) {
  sky(p, 0, 170, "sunset");
  sun(p, 118, 128, 10);
  cloud(p, 210, 46, 150, 6);
  cloud(p, 40, 70, 90, 5);
  cloud(p, 420, 30, 120, 5);
  // far hills (the Stromberg in the haze)
  ridge(p, 150, 26, 120, P.dusk2, { seed: 31, rim: P.dusk3, bottom: 200 });
  ridge(p, 162, 14, 70, P.dusk1, { seed: 32, rim: P.dusk2, bottom: 200 });

  // the outer bank of the loop: a steep vineyard slope on the right, lit by the low sun
  const slopeTop = (x: number) => 168 - Math.max(0, x - 250) * 0.24 - Math.sin(x * 0.02) * 4;
  const slope: Pt[] = [];
  for (let x = 250; x <= 640; x += 6) slope.push([x, Math.round(slopeTop(x))]);
  p.poly([...slope, [640, 200], [250, 200]], P.forest1);
  vineyard(p, [...slope.map(([x, y]) => [x, y + 8] as Pt), [640, 196], [250, 196]], { lit: true, terrace: 8, tilt: -0.2, gap: 3, slant: 0.25 });
  // forest crown on the ridge above the vines
  for (let x = 262; x < 650; x += 16) foliage(p, x, Math.round(slopeTop(x)) + 2, 11, 6, [P.forest0, P.forest1, P.forest2], x, P.ink1);
  // a vineyard hut (Wengerthäusle)
  house(p, 470, 140, 12, 9, { roofH: 7, timber: false, shutters: null, depth: 4, storeys: 1, lit: 0, wall: P.paper2 });

  // the land on the inner bank: meadows down to the water, the village on the spur
  grass(p, [[0, 178], [120, 170], [250, 176], [420, 190], [560, 196], [640, 196], [640, 360], [0, 360]], [P.forest2, P.forest1, P.forest3]);
  const village: [number, number, number, number, Partial<{ gable: boolean; roof: string }>][] = [
    [96, 186, 16, 12, { gable: true }],
    [116, 184, 20, 12, { gable: false }],
    [176, 186, 18, 13, { gable: true, roof: P.brick0 }],
    [198, 188, 16, 11, { gable: true }],
    [218, 189, 22, 12, { gable: false, roof: P.brick2 }],
    [246, 192, 16, 11, { gable: true }],
    [266, 193, 18, 12, { gable: true, roof: P.brick0 }],
  ];
  church(p, 156, 186, 0.62);
  for (const [x, y, w, h, o] of village) house(p, x, y, w, h, { roofH: Math.round(w * 0.6), gable: o.gable, roof: o.roof, depth: Math.round(w * 0.25), storeys: 2, lit: 0.6, seed: x });
  poplar(p, 300, 198, 30);
  poplar(p, 312, 199, 24);
  fruitTree(p, 70, 194, 16, 3);

  // the Enz: out of the bend at the foot of the vineyards, past the village, towards us
  const river = smooth([[680, 194], [560, 198], [440, 206], [300, 214], [170, 222], [60, 234], [-30, 248]], 3);
  const band = ribbon(river, 8, 34);
  water(p, band, [P.river1, P.dusk2, P.brick4], 118);
  for (let i = 0; i + 1 < river.length; i++) {
    const w = 4 + Math.round((i / river.length) * 17);
    p.line(river[i][0], river[i][1] - w, river[i + 1][0], river[i + 1][1] - w, P.forest1);
    p.line(river[i][0], river[i][1] + w, river[i + 1][0], river[i + 1][1] + w, P.olive1);
  }

  // the meadow of the Stellplatz
  const near: Pt[] = [[0, 266], [180, 244], [420, 226], [640, 218], [640, 360], [0, 360]];
  grass(p, near, [P.forest3, P.forest2, P.forest4]);
  // gravel pitch
  gravel(p, [[30, 300], [330, 292], [360, 336], [10, 344]], P.paper1, [P.paper0, P.paper2, P.stone2]);
  // reeds and a fence along the bank
  for (let x = 4; x < 640; x += 5) {
    const y = (x < 180 ? 266 - Math.round(x * 0.12) : x < 420 ? 244 - Math.round((x - 180) * 0.075) : 226 - Math.round((x - 420) * 0.036)) + (x % 3);
    p.line(x, y + 4, x + 1, y - 6 - (x % 4), x % 2 ? P.olive1 : P.olive2);
  }
  fence(p, 400, 640, 246, 12, P.wood2, 18);

  // the camper with the motorcycle, lit windows, its long shadow to the right
  p.shade([[60, 318], [280, 316], [340, 328], [80, 330]], -1);
  p.camper(70, 222, 1.62, true, true);
  // awning chair, lantern, power post
  campChair(p, 282, 326, [P.brick2, P.paper3], 1.6);
  lantern(p, 318, 330, 1.5);
  powerPost(p, 352, 300);
  p.light(312, 318, 50, 22, 1, 0.5);

  // a pear tree on the right edge of the meadow
  fruitTree(p, 600, 300, 70, 8, P.beer2);
  // evening light: warm from the left, the right side dims
  p.relight(0, 0, 640, 360, (x, y) => (y > 200 ? -Math.max(0, (x - 360) / 280) * 0.9 : 0));
  p.vignette(-1.2, 0.62);
}
