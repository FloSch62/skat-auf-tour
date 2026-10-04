// The 1970s road-atlas paper behind the stage map (maps/<region>): cream paper, faint contour lines whose valleys
// follow the main river, pale green forests, lightly hatched vineyards and soft blue rivers. Deliberately calm and
// low in contrast: no roads, no railways, no settlements, no lettering — the tour draws its own schematic roads,
// station icons and place names on top (Lead decision 2026-10-04), so nothing here may look like a road or a stop.
import { P, Px, colourWord, type Pt } from "./painter";
import type { MapRegion } from "./mapdata";
import { smooth } from "./land";

export interface AtlasLine {
  pts: Pt[];
  /** River width class 1 (stream) … 4 (Neckar). */
  w?: number;
}

export interface AtlasSheet {
  region: MapRegion;
  rivers: AtlasLine[];
  /** Rivers that shape the valleys of the relief (indices into `rivers`; default: all with w ≥ 3). */
  valleys?: number[];
  forests: Pt[][];
  /** Forest everywhere (Schwarzwald) except organic openings (noise above `open`, default 0.64) and the valleys. */
  forestAll?: { open?: number };
  vineyards: Pt[][];
  parks?: Pt[][];
  /** Relief strength 0…1 (how hilly). */
  relief?: number;
  seed?: number;
}

// ─── 2-D noise and a distance transform ─────────────────────────────────────────────────────────────────────

function h2(i: number, j: number, seed: number): number {
  let h = (i * 374761393 + j * 668265263 + seed * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise2(x: number, y: number, seed: number): number {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = h2(i, j, seed);
  const b = h2(i + 1, j, seed);
  const c = h2(i, j + 1, seed);
  const d = h2(i + 1, j + 1, seed);
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
}

/** Chamfer distance (in pixels) from the drawn mask cells. */
function distanceField(w: number, h: number, mask: Uint8Array): Float32Array {
  const INF = 1e9;
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? 0 : INF;
  const A = 1;
  const B = Math.SQRT2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + A);
      if (y > 0) {
        v = Math.min(v, d[i - w] + A);
        if (x > 0) v = Math.min(v, d[i - w - 1] + B);
        if (x < w - 1) v = Math.min(v, d[i - w + 1] + B);
      }
      d[i] = v;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      let v = d[i];
      if (x < w - 1) v = Math.min(v, d[i + 1] + A);
      if (y < h - 1) {
        v = Math.min(v, d[i + w] + A);
        if (x < w - 1) v = Math.min(v, d[i + w + 1] + B);
        if (x > 0) v = Math.min(v, d[i + w - 1] + B);
      }
      d[i] = v;
    }
  }
  return d;
}

/** Subdivide a closed outline and jitter it with noise: ragged forest and vineyard edges. */
export function rough(pts: Pt[], amp = 6, step = 5, seed = 1): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(len / step));
    const nx = -(y1 - y0) / (len || 1);
    const ny = (x1 - x0) / (len || 1);
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      const j = (noise2(x / 14, y / 14, seed) - 0.5) * 2 * amp + (noise2(x / 4, y / 4, seed + 1) - 0.5) * amp * 0.6;
      out.push([Math.round(x + nx * j), Math.round(y + ny * j)]);
    }
  }
  return out;
}

// ─── the painter ────────────────────────────────────────────────────────────────────────────────────────────

const RIVER_COL: Record<number, [string, string, number]> = {
  1: [P.river4, P.river4, 1],
  2: [P.river3, P.river4, 2],
  3: [P.river3, P.river4, 3],
  4: [P.river3, P.river5, 5],
};

function drawRiver(p: Px, l: AtlasLine) {
  const pts = smooth(l.pts, 3);
  const [edge, body, t] = RIVER_COL[l.w ?? 2];
  if (t <= 1) return p.path(pts, edge, 1);
  p.path(pts, edge, t + 1);
  p.path(pts, body, Math.max(1, t - 1));
}

export function paintAtlas(p: Px, a: AtlasSheet) {
  const W = p.w;
  const H = p.h;
  const seed = a.seed ?? 1;
  // paper
  p.rect(0, 0, W, H, P.paper3);
  p.speckle(0, 0, W, H, [P.paper2, P.paper4], 2600);

  // relief: height from the distance to the valley rivers plus noise; drawn as contour lines (palette shift)
  const mask = new Uint8Array(W * H);
  const valleys = a.valleys ?? a.rivers.map((r, i) => ((r.w ?? 2) >= 3 ? i : -1)).filter((i) => i >= 0);
  for (const i of valleys) {
    const pts = smooth(a.rivers[i].pts, 3);
    for (let k = 0; k + 1 < pts.length; k++) {
      const [x0, y0] = pts[k];
      const [x1, y1] = pts[k + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      for (let s = 0; s <= n; s++) {
        const x = Math.round(x0 + ((x1 - x0) * s) / n);
        const y = Math.round(y0 + ((y1 - y0) * s) / n);
        if (x >= 0 && y >= 0 && x < W && y < H) mask[y * W + x] = 1;
      }
    }
  }
  const dist = distanceField(W, H, mask);
  const rel = a.relief ?? 0.6;
  // the noise part on a coarse grid, interpolated (smooth enough for contours, much cheaper)
  const G = 4;
  const gw = Math.ceil(W / G) + 2;
  const gh = Math.ceil(H / G) + 2;
  const grid = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) grid[j * gw + i] = noise2((i * G) / 70, (j * G) / 70, seed) * 0.6 + noise2((i * G) / 28, (j * G) / 28, seed + 3) * 0.25;
  const clearing = new Float32Array(gw * gh);
  if (a.forestAll) for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) clearing[j * gw + i] = noise2((i * G) / 46, (j * G) / 46, seed + 21) * 0.75 + noise2((i * G) / 14, (j * G) / 14, seed + 22) * 0.25;
  const height = new Float32Array(W * H);
  const amp = 0.45 + 0.3 * rel;
  for (let y = 0; y < H; y++) {
    const j = Math.floor(y / G);
    const fy = (y - j * G) / G;
    for (let x = 0; x < W; x++) {
      const i = Math.floor(x / G);
      const fx = (x - i * G) / G;
      const g0 = grid[j * gw + i] * (1 - fx) + grid[j * gw + i + 1] * fx;
      const g1 = grid[(j + 1) * gw + i] * (1 - fx) + grid[(j + 1) * gw + i + 1] * fx;
      const valley = Math.min(1, dist[y * W + x] / 90);
      height[y * W + x] = valley * 0.55 * rel + (g0 * (1 - fy) + g1 * fy) * amp;
    }
  }
  // hill shading (Schummerung): gentle darkening on slopes facing away from the north-west light
  p.relight(0, 0, W, H, (x, y) => {
    if (x < 1 || y < 1) return 0;
    const i = y * W + x;
    const s = (height[i] - height[i - 1 - W]) * 40;
    return s < -0.35 ? -0.35 : 0;
  });

  // forests
  if (a.forestAll) {
    // forest everywhere except organic openings (noise) and the meadows along the valley floors
    const F = colourWord(P.forest5);
    const open = a.forestAll.open ?? 0.64;
    for (let y = 0; y < H; y++) {
      const j = Math.floor(y / G);
      const fy = (y - j * G) / G;
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (dist[i] < 4 + noise2(x / 6, y / 6, seed + 5) * 4) continue;
        const gi = Math.floor(x / G);
        const fx = (x - gi * G) / G;
        const n = (clearing[j * gw + gi] * (1 - fx) + clearing[j * gw + gi + 1] * fx) * (1 - fy) + (clearing[(j + 1) * gw + gi] * (1 - fx) + clearing[(j + 1) * gw + gi + 1] * fx) * fy;
        if (n > open) continue;
        p.buf[i] = F;
      }
    }
  }
  a.forests.forEach((f, i) => p.poly(rough(smooth(f, 2), 7, 5, seed + i), P.forest5));
  for (const pk of a.parks ?? []) p.poly(rough(smooth(pk, 2), 3, 4, seed + 40), P.forest5);
  // forest edges and a sparse tree-dot texture
  const F5 = colourWord(P.forest5);
  const F4 = colourWord(P.forest4);
  const buf = p.buf;
  const isF = (i: number) => buf[i] === F5 || buf[i] === F4;
  p.relight(1, 1, W - 2, H - 2, (x, y) => {
    const i = y * W + x;
    if (buf[i] !== F5) return 0;
    if (!isF(i - 1) || !isF(i + 1) || !isF(i - W) || !isF(i + W)) return -1;
    return (x * 7 + y * 13) % 23 === 0 ? -1 : 0;
  });
  // vineyards: wine-coloured hatching
  for (const [i, v] of a.vineyards.entries()) {
    const pts = rough(smooth(v, 2), 3, 4, seed + 50 + i);
    p.texture(pts, (x, y) => ((x - y + 1000) % 5 === 0 ? P.dusk4 : null));
  }
  // contour lines over everything so far (brownish on paper, darker green in the woods)
  const levels = 9;
  p.relight(1, 1, W - 2, H - 2, (x, y) => {
    const i = y * W + x;
    const l = Math.floor(height[i] * levels);
    if (l !== Math.floor(height[i + 1] * levels) || l !== Math.floor(height[i + W] * levels)) return l % 3 === 0 ? -1 : -0.6;
    return 0;
  });

  // grid of the atlas (Planquadrate), very light
  for (let x = 80; x < W; x += 80) p.relight(x, 0, 1, H, () => -0.3);
  for (let y = 60; y < H; y += 80) p.relight(0, y, W, 1, () => -0.3);

  // water
  for (const r of a.rivers) drawRiver(p, r);

  // the printed frame with the black-and-white degree band
  p.rect(0, 0, W, 3, P.paper2);
  p.rect(0, H - 3, W, 3, P.paper2);
  p.rect(0, 0, 3, H, P.paper2);
  p.rect(W - 3, 0, 3, H, P.paper2);
  const fr = (x: number, y: number, w: number, h: number) => {
    p.rect(x, y, w, 1, P.paper0);
    p.rect(x, y + h - 1, w, 1, P.paper0);
    p.rect(x, y, 1, h, P.paper0);
    p.rect(x + w - 1, y, 1, h, P.paper0);
  };
  fr(3, 3, W - 6, H - 6);
  fr(6, 6, W - 12, H - 12);
  for (let x = 7; x < W - 7; x += 24) {
    p.rect(x, 4, 12, 2, P.paper0);
    p.rect(x + 12, H - 6, 12, 2, P.paper0);
  }
  for (let y = 7; y < H - 7; y += 24) {
    p.rect(4, y + 12, 2, 12, P.paper0);
    p.rect(W - 6, y, 2, 12, P.paper0);
  }
  // the fold down the middle and slightly aged edges
  p.relight(W / 2 - 3, 7, 6, H - 14, (x) => (x === W / 2 - 1 ? -0.6 : x === W / 2 ? 0.5 : x < W / 2 ? -0.25 : 0));
  p.vignette(-0.8, 0.8);
}
