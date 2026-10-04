// Stellplatz am Stuttgarter Hang (bg/pitch-stuttgart): blue hour over the Stuttgart basin. Houses climb the slopes,
// the city lights glitter below, the TV tower stands on its wooded hill with red lights, vineyards run right into
// the town; in front: a lane on the hillside with the camper, a gas-style street lamp and the Stäffele going down
// between garden walls.
import { P, Px, type Pt } from "./painter";
import { cloud, fbm, foliage, ridge, roundTree, sky, vineyard } from "./land";

/** The Stuttgart TV tower: tapering shaft, the basket with lit windows, the antenna with red lights. */
function tvTower(p: Px, cx: number, baseY: number, h: number) {
  const shaftTop = baseY - Math.round(h * 0.68);
  // shaft
  p.shape([[cx - 5, baseY], [cx - 2, shaftTop], [cx + 2, shaftTop], [cx + 5, baseY]], P.stone2, P.ink1);
  p.line(cx - 3, baseY - 2, cx - 1, shaftTop + 2, P.stone3);
  p.shade([[cx + 1, shaftTop + 1], [cx + 2, shaftTop + 1], [cx + 4, baseY - 1], [cx + 1, baseY - 1]], -1);
  // the basket
  const by = shaftTop;
  p.box(cx - 6, by - 14, 13, 15, P.stone2, P.ink1);
  for (let k = 0; k < 4; k++) {
    p.rect(cx - 5, by - 12 + k * 3, 11, 1, k % 2 ? P.beer3 : P.beer2);
  }
  p.rect(cx - 7, by - 15, 15, 2, P.stone3);
  p.rect(cx - 7, by, 15, 2, P.stone1);
  // antenna
  const top = baseY - h;
  p.rect(cx - 1, top + 6, 3, by - 15 - top - 6, P.stone3);
  for (let y = top + 8; y < by - 16; y += 6) p.rect(cx - 1, y, 3, 3, P.brick2);
  p.rect(cx, top, 1, 8, P.stone3);
  p.px(cx, top - 1, P.road1);
  p.px(cx, by - 26, P.road1);
  p.ellipse(cx, top, 3, 3, p.pat(null, P.road1, 0.25));
}

/** A hillside of town houses: varied blocks with roofs, gardens and lit windows along a slope line. */
function hillTown(p: Px, x0: number, x1: number, line: (x: number) => number, rows: number, seed: number, scale = 1) {
  for (let r = rows - 1; r >= 0; r--) {
    let x = x0 + ((seed * 7 + r * 11) % 9);
    while (x < x1) {
      const v = (x * 13 + r * 7 + seed * 5) % 17;
      const base = line(x) + Math.round(r * 10 * scale);
      if (v < 3) {
        // a garden tree instead of a house
        foliage(p, x + 4, base - 5, 5, 4, [P.forest0, P.forest0, P.forest1], x + r, null);
        x += 10;
        continue;
      }
      const w = Math.round((6 + (v % 7)) * scale);
      const h = Math.round((5 + ((x * 3 + r) % 5)) * scale);
      const wall = [P.dusk2, P.dusk1, P.stone1, P.dusk2, P.wood2][(x + r + seed) % 5];
      p.rect(x, base - h, w, h, wall);
      p.poly([[x - 1, base - h], [x + Math.round(w / 2), base - h - Math.round(w * 0.45)], [x + w + 1, base - h]], [P.brick0, P.dusk0, P.ink2][(x + r) % 3]);
      p.rect(x + w - 1, base - h, 1, h, P.dusk0);
      for (let k = 0; k < Math.max(1, Math.floor(w / 3)); k++) {
        if ((x * 31 + k * 17 + r * 7 + seed) % 5 < 2) p.px(x + 1 + k * 3, base - h + 2, P.beer3);
        if ((x * 17 + k * 29 + r * 3) % 7 < 2) p.px(x + 1 + k * 3, base - h + 4, P.beer2);
      }
      x += w + 1 + ((x + r) % 4);
    }
  }
}

export function paintPitchStuttgart(p: Px) {
  sky(p, 0, 190, "late");
  cloud(p, 120, 40, 140, 5, P.dusk1, P.brick3);
  cloud(p, 380, 64, 90, 4, P.dusk1, P.brick3);
  // the far rim of the basin
  ridge(p, 128, 14, 120, P.dusk1, { seed: 61, rim: P.dusk2, bottom: 260 });
  // the TV tower on its wooded hill (right)
  const hill = ridge(p, 196, 10, 80, P.forest0, { seed: 62, x0: 300, x1: 640, bias: (x) => Math.max(0, 74 - Math.abs(x - 540) * 0.42) + Math.max(0, 30 - Math.abs(x - 600) * 0.2), bottom: 260 });
  for (let x = 304; x < 640; x += 8) if (hill(x) < 190) foliage(p, x, hill(x) + 3, 6, 4, [P.forest0, P.forest0, P.forest1], x, null);
  tvTower(p, 540, hill(540) + 4, 118);
  // the left slope with houses and a vineyard
  const leftLine = (x: number) => 150 + x * 0.12 + fbm(x / 40, 7) * 6;
  p.poly([[0, 146], [120, 160], [260, 184], [300, 260], [0, 260]], P.dusk1);
  vineyard(p, [[120, 160], [258, 184], [256, 206], [112, 190]], { far: true, terrace: 5, gap: 3, slant: 0.4, tilt: 0.1 });
  p.shadeRect(110, 158, 150, 50, -1);
  hillTown(p, 0, 120, leftLine, 6, 1, 1);
  // the city in the basin: rows of lit windows
  p.rect(0, 206, 640, 54, P.dusk0);
  hillTown(p, 180, 640, (x) => 212 + Math.sin(x * 0.03) * 2, 4, 3, 1);
  for (let i = 0; i < 260; i++) {
    const x = p.rng.int(0, 639);
    const y = p.rng.int(214, 255);
    if (p.is(x, y, P.dusk0)) p.px(x, y, p.rng.chance(0.7) ? P.beer3 : P.beer4);
  }
  // the right slope below the tower with houses
  hillTown(p, 420, 640, (x) => 186 + (x - 420) * 0.02 + fbm(x / 30, 9) * 6, 3, 5, 1);

  // ── foreground: the hillside lane, garden walls, the Stäffele ──
  // retaining wall of sandstone under the lane
  const laneY = 268;
  p.rect(0, 246, 640, 22, P.forest0);
  for (let x = -6; x < 640; x += 13) foliage(p, x, 250 + ((x * 7) % 5), 9, 6, [P.forest0, P.forest1, P.forest1], x, P.ink1);
  // the lane (asphalt) with a kerb
  p.rect(0, laneY, 640, 92, P.stone1);
  p.dith(0, laneY, 640, 92, null, P.stone0, 0.18);
  p.rect(0, laneY, 640, 2, P.stone2);
  p.rect(0, laneY + 2, 640, 1, P.stone3);
  for (let x = 0; x < 640; x += 30) p.rect(x, 334, 16, 2, P.paper2);
  // the Stäffele: steps going down to the right between walls, with the handrail
  const st: Pt[] = [[430, laneY], [502, laneY], [640, 360], [560, 360]];
  p.poly(st, P.stone2);
  p.relight(420, laneY, 220, 92, (x, y) => (p.is(x, y, P.stone2, P.stone3, P.stone0) ? -0.6 * ((y - laneY) / 92) : 0));
  for (let k = 0; k < 12; k++) {
    const y = laneY + 4 + k * 8;
    const xl = 430 + Math.round((y - laneY) * (130 / 92));
    const xr = 500 + Math.round((y - laneY) * (140 / 92));
    p.rect(xl, y, xr - xl, 2, P.stone3);
    p.rect(xl, y + 2, xr - xl, 1, P.stone0);
  }
  // stone walls along both sides of the steps
  p.shape([[424, laneY - 6], [432, laneY - 6], [566, 360], [552, 360]], P.stone1, P.ink1);
  p.shape([[500, laneY - 4], [508, laneY - 4], [648, 360], [636, 360]], P.stone1, P.ink1);
  p.line(425, laneY - 6, 553, 359, P.stone3);
  p.path([[428, laneY - 12], [568, 360 - 14]], P.ink1, 2);
  for (let k = 0; k < 6; k++) {
    const t = k / 5;
    const hx = Math.round(428 + t * 140);
    const hy = Math.round(laneY - 12 + t * (360 - 14 - laneY + 12));
    p.rect(hx, hy, 2, 12, P.ink1);
  }
  // garden wall with a gate on the left of the stairs
  p.box(360, laneY - 18, 64, 18, P.brick3, P.ink1);
  for (let x = 362; x < 422; x += 10) p.rect(x, laneY - 10, 1, 9, P.brick2);
  p.rect(361, laneY - 18, 62, 2, P.stone3);
  roundTree(p, 396, laneY - 14, 52, [P.forest0, P.forest1, P.forest2], 5);
  // the street lamp
  const lx = 448;
  p.rect(lx, laneY - 74, 3, 74, P.ink1);
  p.box(lx - 4, laneY - 88, 11, 14, P.beer3, P.ink1);
  p.rect(lx - 2, laneY - 86, 7, 10, P.beer4);
  p.shape([[lx - 6, laneY - 88], [lx + 1, laneY - 94], [lx + 8, laneY - 88]], P.ink1, P.ink0);
  p.light(lx + 1, laneY - 80, 22, 20, 1.5, 0.5);
  p.light(lx + 1, laneY + 10, 90, 34, 1.5, 0.5);

  // the camper on the lane
  p.shade([[40, 330], [260, 326], [300, 338], [50, 342]], -1);
  p.camper(54, 242, 1.55, true, true);
  p.vignette(-1.3, 0.6);
}
