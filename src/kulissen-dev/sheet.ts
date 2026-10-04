// A test sheet of the outdoor and folk props (dev only: ?dev=scene&id=_props).
import { P, Px } from "../screens/paint/painter";
import { church, chestnut, fence, fir, fruitTree, house, hut, poplar, ridge, roundTree, sky, sun, cloud, vineyard, water, bench } from "../screens/paint/land";
import { car, dog, moped, motorbike } from "../screens/paint/folk";

export function paintPropSheet(p: Px) {
  sky(p, 0, 200, "sunset");
  sun(p, 520, 150, 12);
  cloud(p, 380, 60, 120, 7);
  cloud(p, 100, 40, 90, 5);
  ridge(p, 170, 40, 90, P.dusk2, { seed: 3, rim: P.dusk3 });
  ridge(p, 190, 30, 60, P.forest1, { seed: 5, rim: P.forest2 });
  vineyard(p, [[0, 200], [160, 150], [300, 200]], { lit: true });
  water(p, [[300, 200], [640, 200], [640, 230], [300, 230]], [P.river1, P.dusk2, P.brick4], 520);
  p.rect(0, 230, 640, 130, P.forest2);
  house(p, 20, 300, 44, 34, { flowers: true, chimney: true });
  house(p, 110, 300, 52, 30, { gable: false, roofH: 18, depth: 14 });
  church(p, 230, 300, 1);
  hut(p, 300, 300, 10, 8, P.brick1, P.paper2, true);
  roundTree(p, 330, 300, 40);
  chestnut(p, 380, 300, 60, 2);
  poplar(p, 420, 300, 50);
  fir(p, 450, 300, 44);
  fruitTree(p, 480, 300, 26, 4);
  fence(p, 500, 630, 300, 14);
  bench(p, 560, 300, 30);
  car(p, 20, 350, [P.river0, P.river1, P.river3], 1);
  car(p, 100, 350, [P.brick0, P.brick1, P.brick3], -1, 1, true);
  motorbike(p, 190, 350, [P.brick0, P.brick1, P.brick3], 1);
  motorbike(p, 270, 350, [P.ink1, P.ink2, P.stone2], -1);
  moped(p, 290, 350, P.river1, 1);
  dog(p, 350, 350, "shepherd", "stand");
  dog(p, 390, 350, "wolfhound", "stand", -1);
  dog(p, 430, 350, "airedale", "sit");
  dog(p, 470, 350, "schnauzer", "sit", -1);
  dog(p, 520, 350, "mutt", "lie");
  dog(p, 580, 350, "shepherd", "sit");
  dog(p, 620, 350, "schnauzer", "stand", -1);
}

export function paintCamperSheet(p: Px) {
  p.rect(0, 0, 640, 360, P.forest3);
  p.camper(40, 60, 1, true, false);
  p.camper(220, 40, 1.5, true, true);
  p.camper(40, 200, 2, false, false);
  p.camper(400, 220, 0.6, true, true);
}
