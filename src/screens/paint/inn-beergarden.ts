// Biergarten (inns/beergarden): under old chestnut trees at dusk. String lights between the trunks, beer tables
// with guests left and right of a gravel path that leads to the lit inn, the serving hut with its striped
// awning; our table is a planked Biergarnitur.
import { P, Px, type Pt } from "./painter";
import { box3 } from "./persp";
import { V, beerSet, ourTable } from "./inn-common";
import { chestnut, foliage, gravel, house, ridge, sky } from "./land";
import { stringLights } from "./props";

export function paintBeergarden(p: Px) {
  // sky and the far hills
  sky(p, 0, 132, "late");
  ridge(p, 122, 16, 70, P.dusk1, { seed: 11, rim: P.dusk2, bottom: 140 });
  // the inn at the end of the garden
  house(p, 232, 134, 176, 64, { gable: false, roofH: 36, lit: 0.85, depth: 0, storeys: 2, flowers: true, seed: 3, chimney: true });
  // ground: gravel, darker far away
  p.rect(0, 132, 640, 80, P.paper0);
  gravel(p, [[0, 134], [640, 134], [640, 212], [0, 212]], P.paper0, [P.ink5, P.paper1, P.stone1]);
  p.relight(0, 132, 640, 30, (_x, y) => -(1 - (y - 132) / 30) * 1.2);
  // the path to the inn's door
  p.texture([[300, 134], [340, 134], [420, 212], [220, 212]], (x, y) => ((x * 7 + y * 13) % 11 === 0 ? P.paper2 : P.paper1));

  // far chestnuts behind the tables
  chestnut(p, 170, 146, 90, 4);
  chestnut(p, 470, 148, 84, 5);

  // the serving hut on the right
  const hut = box3(p, V, 5.6, 8.6, -1.4, 1.2, 15, 17, { front: P.wood2, side: P.wood1, ink: P.ink1 });
  const [hx, hy] = hut.front[0];
  const hw = hut.front[1][0] - hx;
  const hh = hut.front[2][1] - hy;
  p.rect(hx + 3, hy + Math.round(hh * 0.3), hw - 6, Math.round(hh * 0.32), P.beer3);
  p.rect(hx + 3, hy + Math.round(hh * 0.3), hw - 6, 1, P.beer4);
  p.rect(hx + 3, hy + Math.round(hh * 0.62), hw - 6, 3, P.wood3);
  // the landlord in the hatch, a barrel by the hut
  p.oval(hx + Math.round(hw * 0.4), hy + Math.round(hh * 0.4), 3, 3, P.brick4, P.ink1);
  p.rect(hx + Math.round(hw * 0.4) - 4, hy + Math.round(hh * 0.48), 9, 6, P.paper4);
  p.oval(hx - 6, hy + hh - 6, 5, 6, P.wood3, P.ink1);
  p.rect(hx - 11, hy + hh - 9, 11, 1, P.wood1);
  p.rect(hx - 11, hy + hh - 4, 11, 1, P.wood1);
  // striped awning over the hatch
  const aw: Pt[] = [[hx - 4, hy + Math.round(hh * 0.22)], [hx + hw + 4, hy + Math.round(hh * 0.22)], [hx + hw + 7, hy + Math.round(hh * 0.33)], [hx - 7, hy + Math.round(hh * 0.33)]];
  p.shape(aw, P.paper4, P.ink1);
  for (let x = hx - 6; x < hx + hw + 6; x += 6) p.poly([[x, hy + Math.round(hh * 0.22) + 1], [x + 3, hy + Math.round(hh * 0.22) + 1], [x + 3, hy + Math.round(hh * 0.33)], [x, hy + Math.round(hh * 0.33)]], P.brick2);
  p.rect(hx - 4, hy - 2, hw + 8, 3, P.brick0);
  p.light(hx + hw / 2, hy + hh, 50, 16, 1, 0.5);

  // beer tables with guests, far to near
  beerSet(p, -6.2, -2.4, 12, { front: [{ coat: P.river1, hat: "none" }, { coat: P.brick1, hat: "kerchief" }, { coat: P.olive1, hat: "hat" }], back: [{ coat: P.wood2 }, { coat: P.dusk1, hat: "cap" }] });
  beerSet(p, 2.2, 5.2, 10, { front: [{ coat: P.forest1, hat: "cap" }, { coat: P.paper2, hat: "none", hair: P.stone3 }], back: [{ coat: P.brick2 }, { coat: P.river0, hat: "none" }] });
  beerSet(p, -4.3, -1.3, 6.5, { front: [{ coat: P.olive1, hat: "hat", glass: 1 }, { coat: P.river2, hat: "none", hair: P.wood1 }, { coat: P.brick1, hat: "cap", look: -1 }], back: [{ coat: P.stone1, hat: "none" }, { coat: P.wood1, hat: "hat" }] });
  beerSet(p, 1.6, 4.2, 5.2, { front: [{ coat: P.dusk1, hat: "kerchief", glass: -1 }, { coat: P.forest2, hat: "none", hair: P.ink3 }], back: [{ coat: P.river1 }, { coat: P.olive0, hat: "cap" }] });

  // the near chestnut trunks framing the view
  for (const [x, w] of [
    [92, 16],
    [556, 18],
  ] as [number, number][]) {
    p.box(x - Math.floor(w / 2), 30, w, 180, P.wood1, P.ink0);
    p.rect(x - Math.floor(w / 2) + 2, 30, 3, 180, P.wood2);
    p.rect(x + Math.floor(w / 2) - 4, 30, 2, 180, P.wood0);
    for (let y = 40; y < 205; y += 9) p.rect(x - Math.floor(w / 2) + 5 + ((y * 7) % 5), y, 3, 2, P.wood0);
  }
  // the canopy: dark masses at the top, lit from below by the bulbs
  const can: [number, number, number, number, number][] = [
    [40, 4, 120, 56, 1],
    [170, -6, 90, 38, 2],
    [600, 0, 110, 60, 3],
    [470, -10, 90, 36, 4],
    [320, -22, 90, 30, 5],
    [0, 70, 50, 40, 6],
    [640, 74, 50, 40, 7],
  ];
  for (const [x, y, rx, ry, sd] of can) foliage(p, x, y, rx, ry, [P.forest0, P.forest1, P.forest2], sd, P.ink0);
  // pale flower candles, upright, mostly on the lower edge of the canopy
  for (let i = 0; i < 70; i++) {
    const x = p.rng.int(0, 639);
    const y = p.rng.int(8, 100);
    if (p.is(x, y, P.forest1, P.forest2) && p.is(x, y + 3, P.forest0, P.forest1, P.forest2) && !p.is(x, y - 1, P.paper4)) {
      p.px(x, y, P.paper4);
      p.px(x, y + 1, P.paper3);
      p.px(x, y + 2, P.paper2);
    }
  }
  // string lights between the trees
  const bulbs = [...stringLights(p, 0, 74, 250, 52, 16, 11), ...stringLights(p, 250, 52, 640, 70, 20, 11), ...stringLights(p, 96, 92, 556, 88, 26, 13)];
  for (const [bx, by] of bulbs) p.light(bx, by + 2, 16, 12, 1, 0.5);
  p.light(300, 175, 240, 40, 1, 0.5);

  ourTable(p, "planks", { light: 1 });
  p.vignette(-1.6, 0.52, 0, 30);
}

