// Stellplatz im Nordschwarzwald (bg/pitch-schwarzwald): a narrow valley between steep fir slopes, the last sun
// on the crests, mist over the young Enz, the old sawmill with its water wheel and log piles, and the camper on
// the gravel by the stream.
import { P, Px, type Pt } from "./painter";
import { campChair, cloud, fir, firEdge, gravel, grass, lantern, ribbon, ridge, sky, smooth, water } from "./land";

function logPile(p: Px, x: number, baseY: number, cols: number, rows: number, r = 4) {
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols - j; i++) {
      const cx = x + i * (r * 2 + 1) + j * (r + 1);
      const cy = baseY - r - j * (r * 2 - 1);
      p.oval(cx, cy, r, r, P.wood4, P.ink1);
      p.ellipse(cx, cy, r - 2, r - 2, P.wood5);
      p.px(cx, cy, P.wood3);
    }
  }
}

function sawmill(p: Px, x: number, baseY: number) {
  // the shed: dark boards, a broad shingled roof, an open side with the saw frame
  p.shape([[x - 6, baseY - 34], [x + 40, baseY - 58], [x + 96, baseY - 34]], P.stone0, P.ink1);
  for (let k = 1; k < 8; k++) p.line(x - 6 + k * 6, baseY - 34 - k * 3, x + 96 - k * 7, baseY - 34 - Math.round(k * 2.9), P.stone1);
  p.box(x, baseY - 34, 90, 34, P.wood1, P.ink1);
  for (let bx = x + 4; bx < x + 88; bx += 5) p.rect(bx, baseY - 33, 1, 32, P.wood0);
  p.rect(x + 50, baseY - 26, 30, 26, P.ink2);
  p.rect(x + 52, baseY - 24, 2, 24, P.stone1);
  p.rect(x + 74, baseY - 24, 2, 24, P.stone1);
  p.rect(x + 52, baseY - 18, 24, 2, P.stone2);
  p.box(x + 8, baseY - 26, 10, 8, P.beer3, P.ink1);
  p.box(x + 26, baseY - 26, 10, 8, P.beer2, P.ink1);
  p.light(x + 22, baseY - 14, 30, 16, 1, 0.5);
  // the water wheel on the race
  const wx = x - 14;
  const wy = baseY - 14;
  p.oval(wx, wy, 14, 14, P.wood2, P.ink1);
  p.ellipse(wx, wy, 11, 11, P.ink2);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    p.line(wx, wy, wx + Math.round(Math.cos(a) * 12), wy + Math.round(Math.sin(a) * 12), P.wood3);
    p.rect(wx + Math.round(Math.cos(a) * 13) - 1, wy + Math.round(Math.sin(a) * 13) - 1, 3, 3, P.wood1);
  }
  p.oval(wx, wy, 2, 2, P.stone2, P.ink1);
  // flume
  p.line(wx - 2, wy - 16, x + 6, wy - 30, P.wood1, 3);
  for (let k = 0; k < 4; k++) p.px(wx - 4 + k, wy - 14 + k * 3, P.river4);
}

export function paintPitchSchwarzwald(p: Px) {
  sky(p, 0, 180, "evening");
  cloud(p, 230, 30, 130, 6, P.dusk2, P.brick4);
  cloud(p, 60, 52, 70, 4, P.dusk2, P.brick4);
  // receding forested ridges, jagged with firs
  const r1 = ridge(p, 112, 26, 120, P.dusk2, { seed: 51, bottom: 260 });
  firEdge(p, r1, P.dusk2, 0, 640, 4, 1);
  const r2 = ridge(p, 142, 30, 90, P.dusk1, { seed: 52, bottom: 260 });
  firEdge(p, r2, P.dusk1, 0, 640, 5, 2);
  const r3 = ridge(p, 168, 18, 70, P.river0, { seed: 53, bottom: 260, bias: (x) => -Math.abs(x - 330) * 0.05 });
  firEdge(p, r3, P.river0, 0, 640, 6, 3);
  // mist lying in the valley
  p.ellipse(330, 186, 190, 10, p.pat(null, P.dusk3, 0.3));
  p.ellipse(330, 190, 130, 6, p.pat(null, P.dusk4, 0.3));

  // the steep slopes left and right, dark firs, meeting at the valley floor
  const left: Pt[] = [[0, 56], [70, 84], [170, 150], [290, 210], [0, 230]];
  const right: Pt[] = [[640, 48], [560, 84], [460, 150], [360, 210], [640, 230]];
  for (const [poly, seed] of [
    [left, 1],
    [right, 2],
  ] as [Pt[], number][]) {
    p.poly(poly, P.forest0);
    const xs = poly.map((q) => q[0]);
    const ys = poly.map((q) => q[1]);
    for (let y = Math.min(...ys) + 2; y < Math.max(...ys) + 6; y += 8) {
      for (let x = Math.min(...xs) - 4; x < Math.max(...xs) + 4; x += 7) {
        const jx = x + ((x * 7 + y * 13 + seed) % 5);
        if (!p.is(jx, y, P.forest0, P.forest1, P.forest2)) continue;
        fir(p, jx, y + 9, 17 + ((x + y) % 6), [P.forest0, P.forest1, P.forest2], P.ink0);
      }
    }
  }
  // the last sun on the crest of the right slope (only the trees, not the sky)
  p.relight(420, 30, 220, 120, (x, y) => (y < 128 - (x - 420) * 0.25 && p.is(x, y, P.forest0, P.forest1, P.forest2) ? 1 : 0));

  // valley floor: meadow, the young Enz
  grass(p, [[0, 222], [290, 208], [360, 208], [640, 222], [640, 360], [0, 360]], [P.forest1, P.forest0, P.forest2]);
  const river = smooth([[324, 206], [346, 222], [430, 246], [560, 270], [680, 300]], 3);
  const band = ribbon(river, 5, 46);
  water(p, band, [P.river1, P.river2, P.dusk3], null);
  for (const [rx, ry, r] of [
    [450, 252, 4],
    [522, 266, 5],
    [604, 284, 6],
    [384, 234, 3],
  ] as [number, number, number][]) {
    p.oval(rx, ry, r + 2, r, P.stone1, P.ink1);
    p.ellipse(rx - 1, ry - 1, r, r - 2, P.stone2);
    p.line(rx - r - 4, ry + 1, rx - r - 1, ry + 1, P.river4);
  }
  // the sawmill on the far bank, log piles
  sawmill(p, 432, 226);
  logPile(p, 532, 232, 6, 3, 4);
  logPile(p, 566, 244, 4, 2, 5);
  // firs near us
  fir(p, 22, 300, 96, [P.forest0, P.forest1, P.forest2]);
  fir(p, 54, 250, 50, [P.forest0, P.forest1, P.forest2]);
  fir(p, 612, 330, 104, [P.forest0, P.forest1, P.forest2]);

  // the pitch: gravel by the stream, the camper, chair, lantern
  gravel(p, [[80, 312], [340, 300], [380, 338], [60, 350]], P.stone2, [P.stone1, P.stone3, P.paper1]);
  p.shade([[110, 318], [290, 312], [330, 324], [120, 330]], -1);
  p.camper(116, 226, 1.5, true, true);
  campChair(p, 304, 334, [P.brick2, P.paper3], 1.5);
  lantern(p, 340, 336, 1.4);
  p.light(340, 328, 46, 20, 1.2, 0.5);
  p.vignette(-1.3, 0.6);
}
