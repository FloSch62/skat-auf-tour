// Campingkneipe (inns/campsite): under the striped awning of the campsite kiosk at dusk. A gas lamp hisses over
// the tables, the drinks fridge glows, and beyond the awning: caravans, an orange ridge tent, our camper with the
// motorcycle, the lake with the sunset glitter and a vineyard hill; our table wears a blue gingham oilcloth.
import { P, Px, type Pt } from "./painter";
import { V, beerSet, ourTable } from "./inn-common";
import { caravan, ridgeTent } from "./folk";
import { fbm, grass, poplar, ridge, roundTree, sky, sun, vineyard, water } from "./land";
import { figure } from "./props";

export function paintCampsite(p: Px) {
  // sky, sun and the hills across the lake
  sky(p, 0, 128, "sunset");
  sun(p, 404, 104, 9);
  const far = ridge(p, 112, 22, 80, P.dusk2, { seed: 21, rim: P.dusk3, bottom: 130 });
  void far;
  const hill = ridge(p, 122, 26, 110, P.forest1, { seed: 22, rim: P.forest2, bottom: 130, bias: (x) => (x < 260 ? (260 - x) * 0.12 : 0) });
  vineyard(p, Array.from({ length: 27 }, (_, i) => [i * 10, hill(i * 10) + 2] as Pt).concat([[260, 130], [0, 130]]), { lit: true, far: true, terrace: 6, gap: 3 });
  // the lake
  water(p, [[0, 126], [640, 126], [640, 136], [0, 136]], [P.dusk1, P.dusk2, P.brick4], 404);
  p.rect(0, 126, 640, 1, P.dusk3);
  // meadow of the campsite
  grass(p, [[0, 136], [640, 136], [640, 210], [0, 210]], [P.forest1, P.forest0, P.forest2]);
  p.relight(0, 136, 640, 74, (_x, y) => -1 + (y - 136) / 80);
  // trees along the shore
  poplar(p, 40, 140, 44, [P.forest0, P.forest1, P.forest2]);
  poplar(p, 58, 140, 36, [P.forest0, P.forest1, P.forest2]);
  roundTree(p, 600, 142, 40, [P.forest0, P.forest1, P.forest2], 9);

  // caravans, a tent, our camper
  caravan(p, 120, 150, 0.8, P.river2);
  ridgeTent(p, 232, 152, 34, 18);
  p.camper(426, 102, 0.85, true);
  caravan(p, 330, 148, 0.62, P.forest2);
  // a washing line between the caravan and the tent
  p.line(176, 128, 236, 134, P.stone3);
  for (const [lx, c] of [
    [190, P.brick2],
    [204, P.paper4],
    [216, P.river3],
  ] as [number, string][]) {
    const ly = 128 + Math.round((lx - 176) * 0.1);
    p.box(lx, ly, 7, 9, c, P.ink1);
  }
  // campers at a folding table with a lantern glow
  figure(p, 300, 170, 30, { coat: P.river1, legs: P.ink2, arm: "glass", facing: -1, hat: "none", hair: P.stone3 });
  figure(p, 384, 172, 32, { coat: P.brick2, legs: P.river0, arm: "down", facing: 1, hat: "cap" });
  p.box(332, 160, 34, 3, P.paper2, P.ink1);
  p.line(336, 163, 340, 172, P.ink2);
  p.line(362, 163, 358, 172, P.ink2);
  p.rect(346, 154, 4, 6, P.beer3);
  p.light(348, 160, 26, 14, 1, 0.5);

  // guests under the awning at the left
  beerSet(p, -3.4, -1.3, 3.6, { front: [{ coat: P.brick1, hat: "kerchief", glass: 1 }, { coat: P.olive1, hat: "hat", look: -1 }] }, P.paper3);

  // the drinks fridge on the right, glowing
  p.box(566, 84, 50, 120, P.paper4, P.ink0);
  p.rect(570, 90, 42, 100, P.river5);
  for (let r = 0; r < 4; r++) {
    p.rect(570, 110 + r * 22, 42, 2, P.stone2);
    for (let b = 0; b < 6; b++) {
      const c = [P.beer1, P.forest1, P.brick1, P.beer0, P.river1, P.paper2][(b + r) % 6];
      p.box(572 + b * 7, 96 + r * 22, 5, 14, c, P.ink1);
    }
  }
  p.rect(606, 130, 3, 18, P.stone1);
  p.light(590, 150, 54, 70, 1, 0.5);

  // the awning: striped canvas overhead, scalloped valance, poles
  const val = 52;
  for (let x = -80; x < 720; x += 32) {
    const a = V.pt((x - 320) / 100, -1.2, 1.0);
    const b = V.pt((x + 16 - 320) / 100, -1.2, 1.0);
    void a;
    void b;
  }
  for (let i = 0; i < 26; i++) {
    const x0 = -200 + i * 40;
    const col = i % 2 ? P.brick1 : P.paper2;
    const top: Pt = [x0, -40];
    const top2: Pt = [x0 + 40, -40];
    const bot: Pt = [Math.round(320 + (x0 - 320) * 0.55), val];
    const bot2: Pt = [Math.round(320 + (x0 + 40 - 320) * 0.55), val];
    p.poly([top, top2, bot2, bot], col);
  }
  p.relight(0, 0, 640, val, (x, y) => -1.2 - (1 - y / val) * 1.2 + Math.max(0, 1 - Math.hypot(x - 200, (y - val) * 2) / 110) * 1.4);
  p.rect(0, val, 640, 2, P.ink1);
  for (let x = 0; x < 640; x += 16) {
    const col = (x / 16) % 2 ? P.brick1 : P.paper2;
    p.rect(x, val + 2, 16, 4, col);
    p.ellipse(x + 8, val + 6, 7, 3, col);
    p.px(x, val + 6, P.ink1);
  }
  p.relight(0, val + 2, 640, 10, () => -0.5);
  for (const px0 of [16, 620]) {
    p.box(px0 - 2, val, 5, 160, P.stone2, P.ink1);
    p.rect(px0 - 1, val, 1, 160, P.stone4);
  }
  // the gas lamp
  const gx = 200;
  p.line(gx, 0, gx, val + 10, P.ink1);
  p.box(gx - 5, val + 10, 11, 4, P.ink2);
  p.box(gx - 4, val + 14, 9, 10, P.beer4, P.ink1);
  p.rect(gx - 2, val + 16, 5, 6, P.paper4);
  p.box(gx - 6, val + 24, 13, 3, P.ink2);
  p.ellipse(gx, val + 19, 22, 18, p.pat(null, P.beer3, 0.12));
  p.light(gx, val + 40, 140, 80, 1.5, 0.5);
  void fbm;

  ourTable(p, "oilcloth", { light: 1 });
  p.vignette(-1.5, 0.52, 0, 30);
}
