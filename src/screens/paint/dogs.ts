// Hundewiese (bg/dogs): a meadow in the golden hour behind a split-rail fence. A shepherd chases a ball, the grey
// wolfhound lopes along, the Airedale sits up, the giant schnauzer lies watching; an owner on the bench, a big
// lime tree, the camper parked by the gate.
import { P, Px } from "./painter";
import { dog } from "./folk";
import { bench, cloud, fence, foliage, grass, ribbon, ridge, roundTree, sky, smooth, sun, gravel } from "./land";
import { figure } from "./props";

export function paintDogs(p: Px) {
  sky(p, 0, 160, "sunset");
  sun(p, 96, 120, 11);
  cloud(p, 260, 50, 140, 6);
  cloud(p, 480, 28, 110, 5);
  ridge(p, 136, 20, 120, P.dusk2, { seed: 71, rim: P.dusk3, bottom: 200 });
  const hedge = ridge(p, 156, 10, 50, P.forest1, { seed: 72, rim: P.forest2, bottom: 200 });
  for (let x = 0; x < 640; x += 10) foliage(p, x, hedge(x) + 4, 8, 5, [P.forest0, P.forest1, P.forest2], x, null);
  // the meadow, lit warm from the left
  grass(p, [[0, 168], [640, 164], [640, 360], [0, 360]], [P.forest3, P.forest2, P.forest4]);
  p.relight(0, 160, 640, 200, (x) => (x < 260 ? 0.6 * (1 - x / 260) : -0.5 * ((x - 260) / 380)));
  // a worn path across the meadow
  const path = smooth([[690, 210], [520, 222], [380, 250], [260, 300], [200, 370]], 3);
  gravel(p, ribbon(path, 10, 50), P.paper1, [P.olive1, P.paper2, P.forest2]);
  // the camper by the gate in the distance
  p.camper(372, 150, 0.6, true, false);
  fence(p, 0, 450, 196, 14, P.wood2, 22);
  fence(p, 560, 640, 196, 14, P.wood2, 22);
  // the big lime tree on the right with the bench and an owner
  roundTree(p, 560, 300, 210, [P.forest1, P.forest2, P.forest3], 3);
  bench(p, 470, 290, 46);
  figure(p, 452, 294, 50, { coat: P.olive1, legs: P.river0, arm: "raise", facing: -1, hat: "hat" });
  // meadow flowers
  for (let i = 0; i < 300; i++) {
    const x = p.rng.int(0, 639);
    const y = p.rng.int(200, 359);
    if (p.is(x, y, P.forest3, P.forest2, P.forest4)) p.px(x, y, p.rng.pick([P.paper4, P.beer3, P.dusk4, P.brick4, P.paper4]));
  }
  // the dogs
  dog(p, 150, 262, "shepherd", "stand", 1, 1.6);
  p.oval(206, 272, 3, 3, P.brick2, P.ink1);
  p.px(205, 271, P.brick4);
  dog(p, 300, 236, "wolfhound", "stand", -1, 1.3);
  dog(p, 96, 318, "airedale", "sit", 1, 1.6);
  dog(p, 360, 330, "schnauzer", "lie", -1, 1.6);
  // shadows to the right of the dogs
  for (const [x, y, w] of [
    [150, 263, 30],
    [300, 237, 26],
    [96, 319, 22],
    [360, 331, 30],
  ] as [number, number, number][])
    p.light(x + 10, y + 1, w, 3, -1, 0.5);
  p.vignette(-1.2, 0.62);
}
