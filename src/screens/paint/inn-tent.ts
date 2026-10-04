// Festzelt (inns/tent): inside the beer tent at the Volksfest. Red-and-white striped canvas sweeping up to the
// ridge, poles wrapped in fir garlands with bunting, the brass band on its stage under a big Brezel emblem,
// rows of beer tables full of people, strings of bulbs; our table is a bare Biergarnitur.
import { P, Px, type Pt } from "./painter";
import { V, ROOM, beerSet, ourTable } from "./inn-common";
import { bunting, figure, stringLights } from "./props";

const HALF = 9;
const EAVE = -1.0;
const RIDGE = -5.5;
const BACK = 22;

/** The big pretzel, emblem of the bakers and of Swabia. */
export function brezel(p: Px, cx: number, cy: number, r: number, col: string = P.wood3) {
  const t = Math.max(2, Math.round(r * 0.32));
  const ring = (x: number, y: number, rx: number, ry: number) => {
    for (let a = 0; a < 90; a++) {
      const ang = (a / 90) * Math.PI * 2;
      p.ellipse(Math.round(x + Math.cos(ang) * rx), Math.round(y + Math.sin(ang) * ry), Math.floor(t / 2) + 1, Math.floor(t / 2) + 1, P.ink1);
    }
    for (let a = 0; a < 90; a++) {
      const ang = (a / 90) * Math.PI * 2;
      p.ellipse(Math.round(x + Math.cos(ang) * rx), Math.round(y + Math.sin(ang) * ry), Math.floor(t / 2), Math.floor(t / 2), col);
    }
  };
  ring(cx - Math.round(r * 0.45), cy + Math.round(r * 0.1), Math.round(r * 0.5), Math.round(r * 0.55));
  ring(cx + Math.round(r * 0.45), cy + Math.round(r * 0.1), Math.round(r * 0.5), Math.round(r * 0.55));
  p.line(cx - Math.round(r * 0.8), cy - Math.round(r * 0.3), cx + Math.round(r * 0.2), cy + Math.round(r * 0.75), P.ink1, t + 2);
  p.line(cx + Math.round(r * 0.8), cy - Math.round(r * 0.3), cx - Math.round(r * 0.2), cy + Math.round(r * 0.75), P.ink1, t + 2);
  p.line(cx - Math.round(r * 0.8), cy - Math.round(r * 0.3), cx + Math.round(r * 0.2), cy + Math.round(r * 0.75), col, t);
  p.line(cx + Math.round(r * 0.8), cy - Math.round(r * 0.3), cx - Math.round(r * 0.2), cy + Math.round(r * 0.75), col, t);
  // salt
  for (let i = 0; i < r; i++) p.px(cx + p.rng.int(-r, r), cy + p.rng.int(-Math.round(r * 0.5), Math.round(r * 0.6)), P.paper4);
}

export function paintTent(p: Px) {
  // canvas: side walls up to the eaves, the roof rising to the ridge — stripes run from eave to ridge
  const near = 1.5;
  p.rect(0, 0, 640, 360, P.paper2);
  const stripe = (X0: number, X1: number, col: string) => {
    // roof panel between X0 and X1 from the eave line (near) to the ridge (back)
    const q: Pt[] = [V.pt(X0, EAVE + (RIDGE - EAVE) * (1 - Math.abs(X0) / HALF), near), V.pt(X1, EAVE + (RIDGE - EAVE) * (1 - Math.abs(X1) / HALF), near), V.pt(X1, EAVE + (RIDGE - EAVE) * (1 - Math.abs(X1) / HALF), BACK), V.pt(X0, EAVE + (RIDGE - EAVE) * (1 - Math.abs(X0) / HALF), BACK)];
    p.poly(q, col);
  };
  const n = 18;
  for (let i = 0; i < n; i++) {
    const X0 = -HALF + (2 * HALF * i) / n;
    const X1 = -HALF + (2 * HALF * (i + 1)) / n;
    stripe(X0, X1, i % 2 ? P.brick2 : P.paper3);
  }
  // side walls of the tent (vertical canvas with windows)
  for (const s of [-1, 1]) {
    const X = s * HALF;
    p.poly(V.sideQuad(X, EAVE, ROOM.floor, near, BACK), P.paper2);
    for (let z = 2; z < BACK; z *= 1.35) p.poly(V.sideQuad(X, EAVE + 0.4, 0.2, z, z * 1.18), P.dusk2);
    for (let z = 2; z < BACK; z *= 1.35) {
      const a = V.pt(X, EAVE, z);
      const b = V.pt(X, ROOM.floor, z);
      p.line(a[0], a[1], b[0], b[1], P.paper1);
    }
  }
  // back gable wall
  const gl = V.pt(-HALF, EAVE, BACK);
  const gr = V.pt(HALF, EAVE, BACK);
  const gt = V.pt(0, RIDGE, BACK);
  const gb = V.y(ROOM.floor, BACK);
  p.poly([[gl[0], gb], gl, gt, gr, [gr[0], gb]], P.paper3);
  for (let i = 1; i < 8; i++) {
    const x = Math.round(gl[0] + ((gr[0] - gl[0]) * i) / 8);
    p.line(x, Math.max(gt[1] + Math.abs(x - gt[0]) * ((gl[1] - gt[1]) / (gt[0] - gl[0])), gt[1]), x, gb, P.paper2);
  }
  // floor
  p.poly(V.flatQuad(ROOM.floor, -HALF, HALF, near, BACK), P.wood2);
  // the shade of the canvas: darker high up, warmer low
  p.relight(0, 0, 640, 140, (_x, y) => -1.6 + (y / 140) * 1.4);

  // the stage at the back with the brass band
  const sz = BACK - 1.5;
  const [sx0, sy0] = V.pt(-3.6, 0.1, sz);
  const [sx1, sy1] = V.pt(3.6, ROOM.floor, sz);
  // backdrop: fir-green cloth with the Brezel
  const [bx0, by0] = V.pt(-3.6, -3.4, BACK);
  const [bx1] = V.pt(3.6, -3.4, BACK);
  p.box(bx0, by0, bx1 - bx0, sy0 - by0, P.forest1, P.ink1);
  p.rect(bx0 + 2, by0 + 2, bx1 - bx0 - 4, 2, P.forest2);
  brezel(p, Math.round((bx0 + bx1) / 2), by0 + 14, 10, P.wood3);
  // musicians
  const band: { x: number; coat: string; inst: "tuba" | "trumpet" | "drum" | "trombone" | "clarinet" }[] = [
    { x: -2.8, coat: P.river0, inst: "clarinet" },
    { x: -1.7, coat: P.river0, inst: "trumpet" },
    { x: -0.6, coat: P.river0, inst: "tuba" },
    { x: 0.6, coat: P.river0, inst: "trombone" },
    { x: 1.7, coat: P.river0, inst: "trumpet" },
    { x: 2.8, coat: P.river0, inst: "drum" },
  ];
  for (const m of band) {
    const [mx] = V.pt(m.x, 0.1, sz + 0.4);
    const h = Math.round(V.s(1.7, sz + 0.4));
    figure(p, mx, sy0 + 1, h, { coat: m.coat, legs: P.ink1, arm: "raise", facing: m.x < 0 ? 1 : -1, hat: "hat" });
    const hy = sy0 - Math.round(h * 0.6);
    if (m.inst === "tuba") {
      p.oval(mx + 3, hy, 6, 7, P.beer1, P.ink1);
      p.ellipse(mx + 2, hy - 2, 2, 3, P.beer3);
      p.oval(mx + 6, hy - 10, 5, 3, P.beer2, P.ink1);
      p.ellipse(mx + 6, hy - 10, 3, 1, P.beer0);
    } else if (m.inst === "drum") {
      p.oval(mx - 1, hy + 4, 6, 6, P.paper4, P.ink1);
      p.rect(mx - 7, hy + 1, 12, 1, P.brick2);
      p.rect(mx - 7, hy + 7, 12, 1, P.brick2);
    } else if (m.inst === "trombone") {
      p.line(mx - 2, hy - 4, mx - 12, hy - 5, P.beer2, 2);
      p.line(mx - 4, hy - 1, mx - 12, hy - 2, P.beer1);
      p.oval(mx - 13, hy - 5, 2, 3, P.beer3, P.ink1);
    } else if (m.inst === "trumpet") {
      const d = m.x < 0 ? 1 : -1;
      p.line(mx + d * 2, hy - 5, mx + d * 9, hy - 7, P.beer2, 2);
      p.oval(mx + d * 10, hy - 7, 1, 2, P.beer3, P.ink1);
    } else {
      p.line(mx, hy - 5, mx + 2, hy + 4, P.ink2, 2);
      p.px(mx + 2, hy + 5, P.stone3);
    }
  }
  // stage front: planks with a fir garland and bunting
  p.box(sx0 - 4, sy0, sx1 - sx0 + 8, sy1 - sy0, P.wood2, P.ink1);
  for (let x = sx0; x < sx1; x += 8) p.rect(x, sy0 + 2, 1, sy1 - sy0 - 2, P.wood1);
  for (let x = sx0 - 2; x < sx1 + 2; x += 3) p.ellipse(x, sy0 + 2 + Math.round(Math.sin(x * 0.18) * 2), 2, 2, (x / 3) % 2 ? P.forest1 : P.forest2);
  bunting(p, sx0 - 4, sy0 + 1, sx1 + 4, sy0 + 1, 6, [P.paper4, P.river2], 5, 6);
  p.light((sx0 + sx1) / 2, sy0 - 20, 90, 50, 1.5, 0.5);

  // poles with fir garlands
  for (const X of [-4.5, 4.5]) {
    for (const Z of [4.5, 9, 15]) {
      const top = V.pt(X, EAVE + (RIDGE - EAVE) * (1 - Math.abs(X) / HALF), Z);
      const bot = V.pt(X, ROOM.floor, Z);
      const w = Math.max(2, Math.round(V.s(0.14, Z)));
      p.box(top[0] - Math.floor(w / 2), top[1], w, bot[1] - top[1], P.wood3, P.ink1);
      for (let y = top[1] + 4; y < bot[1]; y += Math.max(3, w)) p.ellipse(top[0], y, Math.ceil(w * 0.8), Math.max(1, Math.round(w * 0.4)), ((y >> 2) & 1) ? P.forest1 : P.forest2);
    }
  }
  // bunting and bulbs across the tent
  for (const Z of [5, 8, 12]) {
    const l = V.pt(-4.5, EAVE + (RIDGE - EAVE) * 0.5, Z);
    const r = V.pt(4.5, EAVE + (RIDGE - EAVE) * 0.5, Z);
    bunting(p, l[0], l[1], r[0], r[1], Math.round(V.s(0.6, Z)), [P.paper4, P.river2, P.brick2, P.beer2], Math.max(4, Math.round(V.s(0.25, Z))), Math.max(5, Math.round(V.s(0.32, Z))));
    const bulbs = stringLights(p, l[0], l[1] + 6, r[0], r[1] + 6, Math.round(V.s(0.9, Z)), Math.max(8, Math.round(V.s(0.5, Z))));
    for (const [bx, by] of bulbs) p.light(bx, by, 10, 8, 1, 0.5);
  }

  // rows of beer tables, left and right of the aisle
  const cols = [P.river1, P.brick1, P.olive1, P.wood2, P.forest1, P.dusk1, P.stone1, P.brick2, P.river0];
  const hats: ("none" | "hat" | "cap" | "kerchief")[] = ["none", "hat", "cap", "kerchief"];
  let k = 0;
  const g = () => {
    k++;
    return { coat: cols[(k * 4) % cols.length], hat: hats[(k * 3) % hats.length], hair: k % 3 ? P.ink3 : P.stone3, glass: (k % 4 === 0 ? 1 : 0) as 0 | 1, look: ((k % 2) * 2 - 1) as -1 | 1 };
  };
  for (const Z of [15, 11, 8, 6]) {
    const nF = Z > 10 ? 4 : 3;
    beerSet(p, -7.5, -1.4, Z, { front: Array.from({ length: nF }, g), back: Array.from({ length: nF - 1 }, g) });
    beerSet(p, 1.4, 7.5, Z, { front: Array.from({ length: nF }, g), back: Array.from({ length: nF - 1 }, g) });
  }
  p.light(320, 170, 300, 50, 1, 0.5);
  ourTable(p, "planks", { light: 1 });
  p.vignette(-1.6, 0.5, 0, 30);
}
