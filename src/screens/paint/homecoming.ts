// Heimkehr (bg/homecoming): late evening in the home village. The camper rolls up the drive with its headlights
// on, the dog runs out to meet it, the porch lamp burns, someone waits in the lit doorway; the house with its
// garage, the garden fence and the neighbours' roofs under the first stars.
import { P, Px, type Pt } from "./painter";
import { dog } from "./folk";
import { fence, foliage, fruitTree, grass, house, ridge, roundTree, sky, vineyard } from "./land";
import { figure } from "./props";

export function paintHomecoming(p: Px) {
  sky(p, 0, 190, "dusk");
  p.oval(520, 40, 8, 8, P.paper4, P.dusk2);
  p.ellipse(523, 38, 6, 6, P.dusk1);
  // the vineyard hill behind the village, the neighbours' roofs
  const hill = ridge(p, 150, 30, 160, P.dusk1, { seed: 91, rim: P.dusk2, bottom: 230 });
  vineyard(p, Array.from({ length: 33 }, (_, i) => [i * 20, hill(i * 20) + 4] as Pt).concat([[640, 200], [0, 200]]), { far: true, terrace: 6, gap: 3 });
  p.shadeRect(0, 100, 640, 110, -2);
  let nx = -10;
  let k = 0;
  while (nx < 660) {
    k++;
    const w = 18 + ((k * 7) % 14);
    const h = 12 + ((k * 5) % 8);
    if (k % 4 === 0) foliage(p, nx + 8, 190, 10, 8, [P.forest0, P.forest0, P.forest1], k, null);
    else house(p, nx, 198 - ((k * 3) % 5), w, h, { gable: k % 3 !== 0, roofH: Math.round(w * 0.55), storeys: 1, lit: 0.5, depth: 0, timber: false, wall: k % 2 ? P.dusk2 : P.dusk1, roof: P.dusk0, seed: k });
    nx += w + 4 + ((k * 11) % 9);
  }
  // the home: a Swabian house with Fachwerk gable, the garage beside it
  grass(p, [[0, 196], [640, 196], [640, 360], [0, 360]], [P.forest1, P.forest0, P.forest2]);
  house(p, 360, 268, 130, 74, { gable: true, roofH: 70, storeys: 2, lit: 0.9, depth: 40, flowers: true, chimney: true, seed: 7, wall: P.paper3, shutters: P.forest2 });
  // the lit doorway with someone waiting
  p.box(414, 226, 22, 42, P.beer3, P.ink1);
  p.rect(415, 227, 20, 2, P.beer4);
  figure(p, 425, 266, 36, { coat: P.brick1, legs: P.ink2, arm: "raise", facing: -1, hat: "none", hair: P.stone3, skirt: true });
  // porch lamp
  p.box(440, 220, 5, 6, P.beer4, P.ink1);
  p.light(442, 240, 70, 46, 1.5, 0.5);
  // the garage with its door open
  p.box(280, 228, 80, 40, P.paper2, P.ink1);
  p.shape([[276, 228], [364, 228], [364, 222], [276, 222]], P.brick0, P.ink1);
  p.box(290, 236, 60, 32, P.ink2, P.ink1);
  p.rect(291, 237, 58, 6, P.stone1);
  // garden: fruit tree, a hedge, the fence and gate
  roundTree(p, 560, 290, 110, [P.forest0, P.forest1, P.forest2], 6);
  fruitTree(p, 600, 250, 40, 9, P.brick2);
  for (let x = 498; x < 640; x += 12) foliage(p, x, 272, 8, 6, [P.forest0, P.forest1, P.forest1], x, P.ink1);
  fence(p, 470, 640, 300, 14, P.paper2, 10);
  fence(p, 0, 240, 300, 14, P.paper2, 10);
  // the drive
  const drive: Pt[] = [[262, 268], [360, 268], [420, 360], [150, 360]];
  p.poly(drive, P.stone1);
  p.texture(drive, (x, y) => ((x + y * 2) % 9 === 0 ? P.stone0 : null));
  // the camper arriving, headlights on
  p.camper(150, 236, 1.25, true, true);
  const hx = 150 + Math.round(116 * 1.25);
  const hy = 236 + Math.round(40 * 1.25);
  p.rect(hx - 2, hy, 4, 4, P.beer4);
  p.poly([[hx, hy - 4], [hx + 120, hy - 26], [hx + 130, hy + 30], [hx, hy + 8]], p.pat(null, P.beer4, 0.25));
  p.light(hx + 70, hy + 6, 70, 24, 1.5, 0.5);
  // the dog running to meet it
  dog(p, 330, 330, "shepherd", "stand", -1, 1.5);
  p.vignette(-1.3, 0.6);
}
