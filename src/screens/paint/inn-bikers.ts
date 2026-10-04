// Motorradtreff am Tisch (inns/bikers): the Skat round at the snack bar on the pass road. Over a weathered table we
// look at the row of motorcycles on the gravel, the kiosk with its lit hatch on the right, bikers in leather at a
// standing table, the guard rail and the Black Forest ridges at sunset.
import { P, Px, type Pt } from "./painter";
import { V, ourTable } from "./inn-common";
import { motorbike } from "./folk";
import { cloud, fir, firEdge, gravel, ridge, sky, sun } from "./land";
import { figure } from "./props";

export function paintBikersInn(p: Px) {
  sky(p, 0, 150, "sunset");
  sun(p, 250, 108, 10);
  cloud(p, 380, 40, 140, 6);
  cloud(p, 40, 60, 110, 5);
  const r1 = ridge(p, 104, 22, 130, P.dusk2, { seed: 111, bottom: 200 });
  firEdge(p, r1, P.dusk2, 0, 640, 3, 1);
  const r2 = ridge(p, 122, 18, 90, P.dusk1, { seed: 112, bottom: 200 });
  firEdge(p, r2, P.dusk1, 0, 640, 4, 2);
  // the lay-by: gravel up to the guard rail
  const ground: Pt[] = [[0, 136], [640, 128], [640, 210], [0, 210]];
  gravel(p, ground, P.paper1, [P.paper0, P.stone2, P.paper2]);
  p.relight(0, 128, 640, 30, (_x, y) => -(1 - (y - 128) / 30));
  for (let x = 0; x < 640; x += 22) p.rect(x, 126 - Math.round(x * 0.012), 2, 10, P.stone2);
  p.line(0, 128, 640, 120, P.ink1, 3);
  p.line(0, 127, 640, 119, P.stone3);
  fir(p, 20, 150, 70);
  fir(p, 52, 142, 46);
  // the kiosk at the right
  const kx = 452;
  const ky = 170;
  p.box(kx, ky - 60, 150, 60, P.wood2, P.ink1);
  for (let x = kx + 3; x < kx + 148; x += 6) p.rect(x, ky - 58, 1, 56, P.wood1);
  p.shape([[kx - 8, ky - 60], [kx + 158, ky - 60], [kx + 148, ky - 76], [kx + 2, ky - 76]], P.brick1, P.ink1);
  for (let y = ky - 74; y < ky - 60; y += 3) p.line(kx + 4, y, kx + 146, y, P.brick0);
  p.box(kx + 14, ky - 48, 70, 24, P.beer3, P.ink1);
  p.rect(kx + 15, ky - 47, 68, 2, P.beer4);
  figure(p, kx + 48, ky - 6, 40, { coat: P.brick2, apron: P.paper4, arm: "glass", facing: -1, hat: "kerchief" });
  p.box(kx + 10, ky - 26, 78, 4, P.wood3, P.ink1);
  p.box(kx + 96, ky - 50, 24, 30, P.ink2, P.wood1);
  for (let r = 0; r < 5; r++) p.rect(kx + 99, ky - 46 + r * 5, 16 - (r % 2) * 5, 1, P.paper2);
  p.light(kx + 48, ky - 20, 80, 34, 1, 0.5);
  // the row of motorcycles on the left
  const bikes: [number, [string, string, string]][] = [
    [86, [P.brick0, P.brick1, P.brick3]],
    [146, [P.river0, P.river1, P.river3]],
    [206, [P.ink1, P.ink2, P.stone2]],
  ];
  for (const [bx, col] of bikes) motorbike(p, bx, 186, col, 1, 1.2);
  // bikers at a standing table, right of centre
  const tx = 400;
  p.rect(tx - 1, 166, 3, 26, P.stone1);
  p.ellipse(tx, 165, 12, 3, P.paper2);
  p.box(tx - 6, 157, 4, 6, P.beer2, P.ink1);
  figure(p, 378, 194, 58, { coat: P.ink2, legs: P.ink1, arm: "glass", facing: 1, hat: "none", hair: P.stone2, wide: true });
  figure(p, 424, 196, 56, { coat: P.brick1, legs: P.river0, arm: "hips", facing: -1, hat: "helmet" });
  void V;
  ourTable(p, "planks", { light: 1 });
  p.vignette(-1.5, 0.52, 0, 30);
}
