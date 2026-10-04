// Stellplatz am Stromberg (bg/pitch-muehlacker): the wooded Stromberg hills in dusky folds, the long steep roof of
// the Maulbronn monastery church with its slender ridge turret above the orchard meadows, a pond in the meadow,
// and the camper parked among the fruit trees.
import { P, Px, type Pt } from "./painter";
import { campChair, cloud, foliage, fruitTree, grass, gravel, lantern, powerPost, ribbon, ridge, roundTree, sky, smooth, sun, water } from "./land";

/** The monastery: the church with its long steep roof and ridge turret, cloister buildings with Fachwerk. */
function monastery(p: Px, x: number, baseY: number) {
  // church nave: very long, steep roof, gable to the left with a tall window
  const nw = 150;
  const wallH = 22;
  const roofH = 34;
  p.shape([[x + 30, baseY - wallH], [x + 30 + 10, baseY - wallH - roofH], [x + nw, baseY - wallH - roofH], [x + nw + 6, baseY - wallH]], P.brick0, P.ink1);
  for (let yy = baseY - wallH - roofH + 3; yy < baseY - wallH; yy += 3) p.line(x + 32 + Math.round((baseY - wallH - yy) * 0.3), yy, x + nw + 2, yy, P.brick1);
  p.line(x + 40, baseY - wallH - roofH + 1, x + nw, baseY - wallH - roofH + 1, P.brick2);
  p.box(x + 30, baseY - wallH, nw - 24, wallH, P.paper2, P.ink1);
  for (let k = 0; k < 6; k++) {
    const wx = x + 38 + k * 18;
    p.box(wx, baseY - wallH + 4, 5, 12, P.beer2, P.ink1);
    p.rect(wx + 1, baseY - wallH + 5, 3, 1, P.beer4);
  }
  // west gable facing us
  p.shape([[x, baseY], [x, baseY - wallH - 6], [x + 20, baseY - wallH - roofH - 8], [x + 40, baseY - wallH - 6], [x + 40, baseY]], P.paper3, P.ink1);
  p.box(x + 15, baseY - wallH - 14, 10, 20, P.beer2, P.ink1);
  p.rect(x + 20, baseY - wallH - 14, 1, 20, P.ink2);
  p.oval(x + 20, baseY - wallH - 24, 3, 3, P.beer3, P.ink1);
  p.box(x + 14, baseY - 14, 12, 14, P.wood1, P.ink1);
  p.line(x - 1, baseY - wallH - 6, x + 20, baseY - wallH - roofH - 9, P.brick0, 2);
  p.line(x + 20, baseY - wallH - roofH - 9, x + 41, baseY - wallH - 6, P.brick0, 2);
  // the slender ridge turret (Dachreiter)
  const tx = x + 92;
  const ty = baseY - wallH - roofH;
  p.box(tx - 3, ty - 12, 7, 12, P.stone1, P.ink1);
  p.rect(tx - 1, ty - 9, 3, 4, P.ink2);
  p.shape([[tx - 4, ty - 12], [tx, ty - 30], [tx + 4, ty - 12]], P.stone0, P.ink1);
  p.rect(tx, ty - 35, 1, 5, P.beer1);
  // cloister range with Fachwerk to the right
  const cx = x + nw + 6;
  p.box(cx, baseY - 26, 70, 26, P.paper3, P.ink1);
  p.shape([[cx - 2, baseY - 26], [cx + 72, baseY - 26], [cx + 66, baseY - 44], [cx + 4, baseY - 44]], P.brick1, P.ink1);
  for (let yy = baseY - 42; yy < baseY - 26; yy += 3) p.line(cx + 3, yy, cx + 67, yy, P.brick0);
  for (let k = 0; k < 8; k++) p.rect(cx + 2 + k * 9, baseY - 26, 2, 14, P.wood1);
  p.rect(cx + 1, baseY - 13, 68, 2, P.wood1);
  for (let k = 0; k < 7; k++) p.box(cx + 5 + k * 9, baseY - 23, 4, 6, k % 3 ? P.river1 : P.beer3, P.ink1);
  for (let k = 0; k < 6; k++) {
    p.shape([[cx + 6 + k * 11, baseY], [cx + 6 + k * 11, baseY - 8], [cx + 10 + k * 11, baseY - 11], [cx + 14 + k * 11, baseY - 8], [cx + 14 + k * 11, baseY]], P.ink2, P.ink1);
  }
  // evening light on the west faces
  p.shade([[x + 30, baseY - 1], [x + 30, baseY - wallH], [x + nw + 6, baseY - wallH], [x + nw + 6, baseY - 1]], -1);
}

export function paintPitchMuehlacker(p: Px) {
  sky(p, 0, 170, "sunset");
  sun(p, 560, 132, 9);
  cloud(p, 80, 40, 140, 6);
  cloud(p, 330, 64, 110, 5);
  cloud(p, 470, 24, 90, 4);
  // the Stromberg: wooded ridges in layers
  ridge(p, 136, 22, 140, P.dusk2, { seed: 41, rim: P.dusk3, bottom: 220 });
  const r2 = ridge(p, 154, 24, 100, P.forest0, { seed: 42, rim: P.forest1, bottom: 220 });
  for (let x = 0; x < 640; x += 9) foliage(p, x, r2(x) + 3, 7, 4, [P.forest0, P.forest1, P.forest1], x, null);
  const r3 = ridge(p, 176, 16, 80, P.forest1, { seed: 43, rim: P.forest2, bottom: 230 });
  for (let x = 0; x < 640; x += 11) foliage(p, x, r3(x) + 3, 8, 5, [P.forest1, P.forest2, P.forest3], x + 3, P.forest0);

  // orchard meadows sloping towards us
  grass(p, [[0, 196], [640, 186], [640, 360], [0, 360]], [P.forest2, P.forest1, P.forest3]);
  // a track through the meadow to the monastery gate
  const track = smooth([[176, 212], [190, 236], [260, 262], [330, 290], [360, 330], [340, 370]], 3);
  gravel(p, ribbon(track, 4, 40), P.paper0, [P.olive1, P.paper1, P.stone1]);
  // meadow flowers
  for (let i = 0; i < 260; i++) {
    const x = p.rng.int(0, 639);
    const y = p.rng.int(240, 359);
    if (p.is(x, y, P.forest2, P.forest1, P.forest3)) p.px(x, y, p.rng.pick([P.paper4, P.beer3, P.dusk4, P.brick4]));
  }
  // the monastery in the middle distance
  monastery(p, 150, 210);
  // rows of fruit trees
  for (let k = 0; k < 9; k++) fruitTree(p, 20 + k * 70 + ((k * 13) % 20), 226 + (k % 2) * 4, 22, k + 1, k % 3 ? P.brick2 : null);
  // the pond (Tiefer See) with the evening sky
  const pond: Pt[] = [[380, 246], [470, 240], [560, 244], [600, 254], [540, 262], [420, 262]];
  water(p, pond, [P.dusk2, P.dusk3, P.brick4], 560);
  p.path([...pond, pond[0]], P.forest1);
  for (let x = 386; x < 600; x += 4) p.line(x, 248 + Math.round(Math.abs(x - 490) * 0.05), x + 1, 241 + Math.round(Math.abs(x - 490) * 0.05), P.olive2);
  roundTree(p, 612, 262, 70, [P.forest1, P.forest2, P.forest3], 4);

  // the pitch on the meadow: gravel tracks, the camper, chair and lantern
  gravel(p, [[10, 330], [300, 318], [330, 346], [0, 356]], P.paper1, [P.paper0, P.paper2, P.stone2]);
  p.shade([[50, 336], [230, 330], [280, 342], [60, 348]], -1);
  p.camper(60, 244, 1.55, true, true);
  campChair(p, 256, 338, [P.forest2, P.paper3], 1.5);
  lantern(p, 292, 342, 1.4);
  powerPost(p, 318, 322);
  p.light(292, 334, 46, 20, 1, 0.5);
  p.vignette(-1.2, 0.62);
}
