// Motorradtreff (bg/bikers): a snack bar at a hairpin of the pass road at sunset. The kiosk with its lit hatch and
// a parasol, standing tables, a row of 70s motorcycles on the gravel, bikers in leather, the guard rail and the
// road winding down into the forested valley.
import { P, Px, type Pt } from "./painter";
import { motorbike } from "./folk";
import { cloud, fir, firEdge, gravel, ribbon, ridge, sky, smooth, sun } from "./land";
import { figure } from "./props";

export function paintBikers(p: Px) {
  sky(p, 0, 190, "sunset");
  sun(p, 470, 150, 12);
  cloud(p, 70, 40, 160, 6);
  cloud(p, 330, 70, 120, 5);
  // layered mountains of the Black Forest
  const r1 = ridge(p, 150, 34, 140, P.dusk2, { seed: 81, bottom: 260 });
  firEdge(p, r1, P.dusk2, 0, 640, 3, 1);
  const r2 = ridge(p, 182, 30, 100, P.dusk1, { seed: 82, bottom: 280 });
  firEdge(p, r2, P.dusk1, 0, 640, 4, 2);
  const r3 = ridge(p, 214, 26, 80, P.forest0, { seed: 83, bottom: 300 });
  firEdge(p, r3, P.forest0, 0, 640, 5, 3);
  // the pass road winding down the slope
  const road = smooth([[700, 236], [560, 240], [470, 252], [520, 270], [640, 282]], 2);
  p.poly(ribbon(road, 6, 12), P.stone1);
  // the lay-by: gravel and the road edge in front
  const fg: Pt[] = [[0, 250], [640, 290], [640, 360], [0, 360]];
  p.poly(fg, P.stone1);
  gravel(p, [[0, 262], [440, 286], [430, 360], [0, 360]], P.paper1, [P.paper0, P.stone2, P.paper2]);
  p.dith(440, 286, 200, 74, P.stone1, P.stone0, 0.25);
  for (let x = 452; x < 640; x += 26) p.rect(x, 330 + Math.round((x - 452) * 0.04), 14, 2, P.paper3);
  // guard rail along the valley edge
  for (let x = 0; x < 640; x += 24) {
    const y = 250 + Math.round(x * 0.0625);
    p.rect(x, y - 10, 2, 12, P.stone2);
  }
  p.line(0, 242, 640, 282, P.ink1, 4);
  p.line(0, 241, 640, 281, P.stone3, 2);
  // firs by the kiosk
  fir(p, 34, 270, 80);
  fir(p, 70, 262, 60);
  // the kiosk
  const kx = 104;
  const ky = 272;
  p.box(kx, ky - 64, 110, 64, P.wood2, P.ink1);
  for (let x = kx + 3; x < kx + 108; x += 6) p.rect(x, ky - 62, 1, 60, P.wood1);
  p.shape([[kx - 8, ky - 64], [kx + 118, ky - 64], [kx + 108, ky - 80], [kx + 2, ky - 80]], P.brick1, P.ink1);
  for (let y = ky - 78; y < ky - 64; y += 3) p.line(kx + 4, y, kx + 106, y, P.brick0);
  // the hatch with light and the landlady
  p.box(kx + 12, ky - 52, 60, 26, P.beer3, P.ink1);
  p.rect(kx + 13, ky - 51, 58, 2, P.beer4);
  figure(p, kx + 42, ky - 6, 42, { coat: P.brick2, apron: P.paper4, arm: "glass", facing: 1, hat: "kerchief" });
  p.box(kx + 8, ky - 28, 68, 4, P.wood3, P.ink1);
  for (const [dx, c] of [
    [16, P.beer2],
    [24, P.beer2],
    [56, P.brick2],
  ] as [number, string][])
    p.box(kx + dx, ky - 36, 5, 8, c, P.ink1);
  // a blank menu board and a parasol
  p.box(kx + 80, ky - 54, 22, 30, P.ink2, P.wood1);
  for (let r = 0; r < 5; r++) p.rect(kx + 83, ky - 50 + r * 5, 14 - (r % 2) * 4, 1, P.paper2);
  p.light(kx + 42, ky - 20, 70, 30, 1, 0.5);
  // standing tables with bikers
  for (const [tx, ty] of [
    [254, 300],
    [330, 306],
  ] as [number, number][]) {
    p.rect(tx - 1, ty - 26, 3, 26, P.stone1);
    p.ellipse(tx, ty - 27, 12, 3, P.paper2);
    p.ellipse(tx, ty - 28, 12, 2, P.paper3);
    p.box(tx - 6, ty - 34, 4, 6, P.beer2, P.ink1);
    p.box(tx + 3, ty - 33, 4, 5, P.brick3, P.ink1);
  }
  figure(p, 236, 302, 62, { coat: P.ink2, legs: P.ink1, arm: "glass", facing: 1, hat: "none", hair: P.stone2, wide: true });
  figure(p, 276, 304, 58, { coat: P.brick1, legs: P.river0, arm: "hips", facing: -1, hat: "none", hair: P.wood1 });
  figure(p, 350, 310, 60, { coat: P.ink2, legs: P.ink1, arm: "raise", facing: -1, hat: "helmet" });
  // the row of motorcycles on the gravel
  const bikes: [number, [string, string, string]][] = [
    [34, [P.brick0, P.brick1, P.brick3]],
    [128, [P.river0, P.river1, P.river3]],
    [222, [P.ink1, P.ink2, P.stone2]],
    [316, [P.beer0, P.beer1, P.beer3]],
  ];
  for (const [bx, col] of bikes) motorbike(p, bx, 348, col, 1, 1.6);
  p.vignette(-1.2, 0.6);
}
