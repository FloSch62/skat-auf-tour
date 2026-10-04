// Sudoku: seeded generator, uniqueness check, technique grader and pool picker (contract §4.9, §6). Pure: no DOM.
//
// Grids are row-major number arrays, 0 = empty. 9×9 has 3×3 boxes, 6×6 has boxes 3 wide × 2 tall.
//
// Levels by the techniques a human needs (never guessing):
//   easy   — naked and hidden singles only
//   medium — plus pointing pairs (box → line), box-line reduction (line → box) and naked pairs
//   hard   — plus hidden pairs, naked and hidden triples, X-wing, swordfish and XY-wing
import { Rng } from "../core/rng.ts";

export type SudokuSize = 6 | 9;
export type SudokuLevel = "easy" | "medium" | "hard";
/** The level a grid needs, or "unsolvable" when our techniques get stuck (it would need guessing) or it is broken. */
export type SudokuGrade = SudokuLevel | "unsolvable";

export interface SudokuPuzzle {
  size: SudokuSize;
  /** Box width and height in cells (9×9: 3×3, 6×6: 3×2). */
  boxW: number;
  boxH: number;
  /** Row-major, 0 = empty. */
  givens: number[];
  solution: number[];
  /** The level the grader measured (may be the documented fallback for 6×6 hard, see GIVENS). */
  level: SudokuLevel;
  seed: number;
}

/** Pre-generated puzzles (public/puzzles/sudoku-<level>.json): givens as strings of digits, "0" = empty. */
export interface SudokuPool {
  version: number;
  level: SudokuLevel;
  "6"?: string[];
  "9"?: string[];
}

export const LEVELS: readonly SudokuLevel[] = ["easy", "medium", "hard"];
const LEVEL_NUM: Record<SudokuLevel, 1 | 2 | 3> = { easy: 1, medium: 2, hard: 3 };
const NUM_LEVEL: SudokuLevel[] = ["easy", "easy", "medium", "hard"];

/**
 * Removal window per size and level. Cells are removed in 180° symmetric pairs (newspaper look) while the grid stays
 * solvable within the level's techniques; the generator stops at the first grid that has the requested level and at
 * most `max` givens, and never goes below `floor`.
 *
 * Easy keeps many givens on purpose (a comfortable start for someone new to Sudoku). 6×6 grids rarely need the
 * medium techniques (most minimal 6×6 grids fall to singles), so 6×6 medium and hard, like 9×9 hard, come from the
 * pre-generated pools (build-pool.ts); without a pool the generator returns the closest level it reached.
 */
export const GIVENS: Record<SudokuSize, Record<SudokuLevel, { max: number; floor: number }>> = {
  9: { easy: { max: 38, floor: 36 }, medium: { max: 32, floor: 26 }, hard: { max: 30, floor: 20 } },
  6: { easy: { max: 18, floor: 16 }, medium: { max: 12, floor: 8 }, hard: { max: 12, floor: 8 } },
};

// ─── geometry ─────────────────────────────────────────────────────────────────────────────────────────────

interface Geo {
  n: number;
  boxW: number;
  boxH: number;
  cells: number;
  all: number;
  rowOf: number[];
  colOf: number[];
  boxOf: number[];
  /** rows (0..n-1), cols (n..2n-1), boxes (2n..3n-1) */
  units: number[][];
  rows: number[][];
  cols: number[][];
  boxes: number[][];
  peers: number[][];
}

const geos = new Map<number, Geo>();

function geometry(size: SudokuSize): Geo {
  const cached = geos.get(size);
  if (cached) return cached;
  const n = size;
  const boxW = 3;
  const boxH = size === 9 ? 3 : 2;
  const cells = n * n;
  const rowOf: number[] = [];
  const colOf: number[] = [];
  const boxOf: number[] = [];
  const rows: number[][] = Array.from({ length: n }, () => []);
  const cols: number[][] = Array.from({ length: n }, () => []);
  const boxes: number[][] = Array.from({ length: n }, () => []);
  const boxesPerRow = n / boxW;
  for (let i = 0; i < cells; i++) {
    const r = Math.floor(i / n);
    const c = i % n;
    const b = Math.floor(r / boxH) * boxesPerRow + Math.floor(c / boxW);
    rowOf.push(r);
    colOf.push(c);
    boxOf.push(b);
    rows[r].push(i);
    cols[c].push(i);
    boxes[b].push(i);
  }
  const peers: number[][] = [];
  for (let i = 0; i < cells; i++) {
    const set = new Set<number>([...rows[rowOf[i]], ...cols[colOf[i]], ...boxes[boxOf[i]]]);
    set.delete(i);
    peers.push([...set]);
  }
  const g: Geo = {
    n, boxW, boxH, cells, all: ((1 << (n + 1)) - 2), rowOf, colOf, boxOf,
    units: [...rows, ...cols, ...boxes], rows, cols, boxes, peers,
  };
  geos.set(size, g);
  return g;
}

export function boxSize(size: SudokuSize): { boxW: number; boxH: number } {
  const g = geometry(size);
  return { boxW: g.boxW, boxH: g.boxH };
}

/** Box index of a cell (row-major boxes). */
export function boxOfCell(size: SudokuSize, cell: number): number {
  return geometry(size).boxOf[cell];
}

/** All cells that share a row, column or box with `cell` (without the cell itself). */
export function peersOf(size: SudokuSize, cell: number): readonly number[] {
  return geometry(size).peers[cell];
}

function popcount(m: number): number {
  m = m - ((m >>> 1) & 0x55555555);
  m = (m & 0x33333333) + ((m >>> 2) & 0x33333333);
  return (((m + (m >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

function lowDigit(m: number): number {
  return 31 - Math.clz32(m & -m);
}

function digitsOf(m: number): number[] {
  const out: number[] = [];
  while (m) {
    const d = lowDigit(m);
    out.push(d);
    m &= m - 1;
  }
  return out;
}

// ─── brute force: counting and solving ───────────────────────────────────────────────────────────────────

/**
 * Number of solutions, counted up to `limit` (2 is enough to prove uniqueness). 0 for contradictory grids.
 */
export function countSolutions(grid: readonly number[], size: SudokuSize, limit = 2): number {
  let count = 0;
  search(grid, size, null, () => ++count >= limit);
  return count;
}

/** The first solution found, or null. */
export function solveSudoku(grid: readonly number[], size: SudokuSize): number[] | null {
  let out: number[] | null = null;
  search(grid, size, null, (vals) => {
    out = vals.slice();
    return true;
  });
  return out;
}

/** Depth-first search with fewest-candidates-first; `onSolution` returns true to stop. */
function search(grid: readonly number[], size: SudokuSize, rng: Rng | null, onSolution: (vals: number[]) => boolean) {
  const g = geometry(size);
  const vals = grid.slice(0, g.cells) as number[];
  const rowM = new Int32Array(g.n);
  const colM = new Int32Array(g.n);
  const boxM = new Int32Array(g.n);
  for (let i = 0; i < g.cells; i++) {
    const d = vals[i];
    if (!d) continue;
    if (d < 1 || d > g.n) return;
    const bit = 1 << d;
    if ((rowM[g.rowOf[i]] | colM[g.colOf[i]] | boxM[g.boxOf[i]]) & bit) return;
    rowM[g.rowOf[i]] |= bit;
    colM[g.colOf[i]] |= bit;
    boxM[g.boxOf[i]] |= bit;
  }
  const rec = (): boolean => {
    let best = -1;
    let bestMask = 0;
    let bestCnt = 99;
    for (let i = 0; i < g.cells; i++) {
      if (vals[i]) continue;
      const m = g.all & ~(rowM[g.rowOf[i]] | colM[g.colOf[i]] | boxM[g.boxOf[i]]);
      const cnt = popcount(m);
      if (cnt === 0) return false;
      if (cnt < bestCnt) {
        best = i;
        bestMask = m;
        bestCnt = cnt;
        if (cnt === 1) break;
      }
    }
    if (best < 0) return onSolution(vals);
    const ds = digitsOf(bestMask);
    if (rng) rng.shuffle(ds);
    const r = g.rowOf[best];
    const c = g.colOf[best];
    const b = g.boxOf[best];
    for (const d of ds) {
      const bit = 1 << d;
      vals[best] = d;
      rowM[r] |= bit;
      colM[c] |= bit;
      boxM[b] |= bit;
      const stop = rec();
      rowM[r] &= ~bit;
      colM[c] &= ~bit;
      boxM[b] &= ~bit;
      vals[best] = 0;
      if (stop) return true;
    }
    return false;
  };
  rec();
}

/** A random complete grid. */
function fullGrid(size: SudokuSize, rng: Rng): number[] {
  let out: number[] = [];
  search(new Array(size * size).fill(0), size, rng, (vals) => {
    out = vals.slice();
    return true;
  });
  return out;
}

/** Whether a complete grid obeys the rules (every row, column and box holds each digit once). */
export function isValidSolution(grid: readonly number[], size: SudokuSize): boolean {
  const g = geometry(size);
  if (grid.length !== g.cells) return false;
  for (const u of g.units) {
    let m = 0;
    for (const i of u) {
      const d = grid[i];
      if (d < 1 || d > g.n) return false;
      m |= 1 << d;
    }
    if (m !== g.all) return false;
  }
  return true;
}

// ─── human techniques ─────────────────────────────────────────────────────────────────────────────────────

class Logic {
  vals: number[];
  cand: Int32Array;
  broken = false;
  empty = 0;

  readonly g: Geo;

  constructor(g: Geo, grid: readonly number[]) {
    this.g = g;
    this.vals = new Array(g.cells).fill(0);
    this.cand = new Int32Array(g.cells).fill(g.all);
    for (let i = 0; i < g.cells; i++) if (!grid[i]) this.empty++;
    for (let i = 0; i < g.cells; i++) {
      const d = grid[i];
      if (!d) continue;
      if (!(this.cand[i] & (1 << d))) this.broken = true;
      this.set(i, d);
    }
    for (let i = 0; i < g.cells; i++) if (!this.vals[i] && !this.cand[i]) this.broken = true;
  }

  private set(i: number, d: number) {
    this.vals[i] = d;
    this.cand[i] = 0;
    const bit = ~(1 << d);
    for (const p of this.g.peers[i]) this.cand[p] &= bit;
  }

  place(i: number, d: number) {
    if (this.vals[i] || !(this.cand[i] & (1 << d))) {
      this.broken = true;
      return;
    }
    this.set(i, d);
    this.empty--;
    for (const p of this.g.peers[i]) if (!this.vals[p] && !this.cand[p]) this.broken = true;
  }

  /** Remove digits (mask) from a cell; returns true when something changed. */
  elim(i: number, mask: number): boolean {
    if (this.vals[i] || !(this.cand[i] & mask)) return false;
    this.cand[i] &= ~mask;
    if (!this.cand[i]) this.broken = true;
    return true;
  }

  // level 1

  nakedSingle(): boolean {
    const { g, cand, vals } = this;
    let progress = false;
    for (let i = 0; i < g.cells; i++) {
      if (vals[i] || popcount(cand[i]) !== 1) continue;
      this.place(i, lowDigit(cand[i]));
      progress = true;
      if (this.broken) return true;
    }
    return progress;
  }

  hiddenSingle(): boolean {
    const { g, cand, vals } = this;
    let progress = false;
    for (const u of g.units) {
      let placed = 0;
      for (const i of u) if (vals[i]) placed |= 1 << vals[i];
      for (let d = 1; d <= g.n; d++) {
        const bit = 1 << d;
        if (placed & bit) continue;
        let where = -1;
        let n = 0;
        for (const i of u) {
          if (cand[i] & bit) {
            where = i;
            if (++n > 1) break;
          }
        }
        if (n === 0) {
          this.broken = true;
          return true;
        }
        if (n === 1) {
          this.place(where, d);
          placed |= bit;
          progress = true;
          if (this.broken) return true;
        }
      }
    }
    return progress;
  }

  // level 2

  /** Pointing pairs (box → line) and box-line reduction (line → box). */
  intersections(): boolean {
    const { g, cand } = this;
    let progress = false;
    for (let b = 0; b < g.n; b++) {
      const box = g.boxes[b];
      for (let d = 1; d <= g.n; d++) {
        const bit = 1 << d;
        let row = -2;
        let col = -2;
        for (const i of box) {
          if (!(cand[i] & bit)) continue;
          row = row === -2 ? g.rowOf[i] : row === g.rowOf[i] ? row : -1;
          col = col === -2 ? g.colOf[i] : col === g.colOf[i] ? col : -1;
        }
        if (row >= 0) for (const i of g.rows[row]) if (g.boxOf[i] !== b) progress = this.elim(i, bit) || progress;
        if (col >= 0) for (const i of g.cols[col]) if (g.boxOf[i] !== b) progress = this.elim(i, bit) || progress;
      }
    }
    if (progress) return true;
    for (const line of [...g.rows, ...g.cols]) {
      for (let d = 1; d <= g.n; d++) {
        const bit = 1 << d;
        let box = -2;
        for (const i of line) {
          if (!(cand[i] & bit)) continue;
          box = box === -2 ? g.boxOf[i] : box === g.boxOf[i] ? box : -1;
        }
        if (box < 0) continue;
        for (const i of g.boxes[box]) if (!line.includes(i)) progress = this.elim(i, bit) || progress;
      }
    }
    return progress;
  }

  /** Naked subsets of size k: k cells whose candidates together are only k digits. */
  nakedSubset(k: number): boolean {
    const { g, cand, vals } = this;
    let progress = false;
    for (const u of g.units) {
      const open = u.filter((i) => !vals[i] && popcount(cand[i]) <= k);
      const free = u.filter((i) => !vals[i]).length;
      if (open.length < k || free <= k) continue;
      for (const combo of combos(open.length, k)) {
        let m = 0;
        for (const j of combo) m |= cand[open[j]];
        if (popcount(m) !== k) continue;
        const inSet = new Set(combo.map((j) => open[j]));
        for (const i of u) if (!inSet.has(i)) progress = this.elim(i, m) || progress;
        if (progress) return true;
      }
    }
    return progress;
  }

  // level 3

  /** Hidden subsets of size k: k digits that fit only into the same k cells of a unit. */
  hiddenSubset(k: number): boolean {
    const { g, cand, vals } = this;
    for (const u of g.units) {
      let placed = 0;
      for (const i of u) if (vals[i]) placed |= 1 << vals[i];
      const digits: number[] = [];
      const where: number[][] = [];
      for (let d = 1; d <= g.n; d++) {
        if (placed & (1 << d)) continue;
        const cells = u.filter((i) => cand[i] & (1 << d));
        if (cells.length >= 2 && cells.length <= k) {
          digits.push(d);
          where.push(cells);
        }
      }
      const free = g.n - popcount(placed);
      if (digits.length < k || free <= k) continue;
      for (const combo of combos(digits.length, k)) {
        const cells = new Set<number>();
        let m = 0;
        for (const j of combo) {
          m |= 1 << digits[j];
          for (const i of where[j]) cells.add(i);
        }
        if (cells.size !== k) continue;
        let progress = false;
        for (const i of cells) progress = this.elim(i, ~m & g.all) || progress;
        if (progress) return true;
      }
    }
    return false;
  }

  /** X-wing (k = 2) and swordfish (k = 3) on rows and on columns. */
  fish(k: number): boolean {
    const { g, cand } = this;
    for (const [base, cover, pos] of [[g.rows, g.cols, g.colOf], [g.cols, g.rows, g.rowOf]] as const) {
      for (let d = 1; d <= g.n; d++) {
        const bit = 1 << d;
        const lines: number[] = [];
        const masks: number[] = [];
        for (let l = 0; l < g.n; l++) {
          let m = 0;
          for (const i of base[l]) if (cand[i] & bit) m |= 1 << pos[i];
          const c = popcount(m);
          if (c >= 2 && c <= k) {
            lines.push(l);
            masks.push(m);
          }
        }
        if (lines.length < k) continue;
        for (const combo of combos(lines.length, k)) {
          let m = 0;
          for (const j of combo) m |= masks[j];
          if (popcount(m) !== k) continue;
          const chosen = new Set(combo.map((j) => lines[j]));
          let progress = false;
          for (const c of digitsOf(m)) {
            for (const i of cover[c]) {
              const line = base === g.rows ? g.rowOf[i] : g.colOf[i];
              if (!chosen.has(line)) progress = this.elim(i, bit) || progress;
            }
          }
          if (progress) return true;
        }
      }
    }
    return false;
  }

  /** XY-wing: a pivot {x,y} sees pincers {x,z} and {y,z}; z goes from every cell that sees both pincers. */
  xyWing(): boolean {
    const { g, cand, vals } = this;
    for (let p = 0; p < g.cells; p++) {
      if (vals[p] || popcount(cand[p]) !== 2) continue;
      const pm = cand[p];
      const wings = g.peers[p].filter((i) => !vals[i] && popcount(cand[i]) === 2 && popcount(cand[i] & pm) === 1);
      for (let a = 0; a < wings.length; a++) {
        for (let b = a + 1; b < wings.length; b++) {
          const ma = cand[wings[a]];
          const mb = cand[wings[b]];
          if (ma === mb) continue;
          const z = ma & mb & ~pm;
          if (popcount(z) !== 1) continue;
          if ((ma & pm) === (mb & pm)) continue;
          const pa = new Set(g.peers[wings[a]]);
          let progress = false;
          for (const i of g.peers[wings[b]]) if (i !== p && pa.has(i)) progress = this.elim(i, z) || progress;
          if (progress) return true;
        }
      }
    }
    return false;
  }

  /**
   * Solve with techniques up to `maxLevel`, always using the simplest that helps. Returns the highest level needed
   * (1–3), or 0 when stuck or broken.
   */
  solve(maxLevel: number): number {
    if (this.broken) return 0;
    let used = 1;
    for (let guard = 0; guard < 2000; guard++) {
      if (this.empty === 0) return this.broken ? 0 : used;
      if (this.nakedSingle() || this.hiddenSingle()) {
        if (this.broken) return 0;
        continue;
      }
      if (maxLevel >= 2 && (this.intersections() || this.nakedSubset(2))) {
        if (this.broken) return 0;
        used = Math.max(used, 2);
        continue;
      }
      if (
        maxLevel >= 3 &&
        (this.hiddenSubset(2) || this.nakedSubset(3) || this.hiddenSubset(3) || this.fish(2) || this.xyWing() || this.fish(3))
      ) {
        if (this.broken) return 0;
        used = 3;
        continue;
      }
      return 0;
    }
    return 0;
  }
}

/** All k-subsets of 0..n-1 (n ≤ 9, k ≤ 3), cached. */
const comboCache = new Map<string, number[][]>();
function combos(n: number, k: number): number[][] {
  const key = `${n}/${k}`;
  let out = comboCache.get(key);
  if (out) return out;
  out = [];
  const cur: number[] = [];
  const rec = (start: number) => {
    if (cur.length === k) {
      out!.push(cur.slice());
      return;
    }
    for (let i = start; i < n; i++) {
      cur.push(i);
      rec(i + 1);
      cur.pop();
    }
  };
  rec(0);
  comboCache.set(key, out);
  return out;
}

/** Highest technique level (1–3) needed with techniques up to maxLevel, or 0 when that is not enough. */
function logicLevel(grid: readonly number[], size: SudokuSize, maxLevel: number): number {
  return new Logic(geometry(size), grid).solve(maxLevel);
}

/** The level a grid needs: the simplest technique set that solves it without guessing. */
export function gradeSudoku(grid: readonly number[], size: SudokuSize): SudokuGrade {
  const lv = logicLevel(grid, size, 3);
  return lv === 0 ? "unsolvable" : NUM_LEVEL[lv];
}

/** Solve by the human techniques only; returns the grade and the grid as far as logic got (for tests and hints). */
export function solveLogically(grid: readonly number[], size: SudokuSize): { grade: SudokuGrade; grid: number[] } {
  const logic = new Logic(geometry(size), grid);
  const lv = logic.solve(3);
  return { grade: lv === 0 ? "unsolvable" : NUM_LEVEL[lv], grid: logic.vals.slice() };
}

// ─── generator ────────────────────────────────────────────────────────────────────────────────────────────

/** Cells removed together so the givens stay 180° symmetric (the centre of 9×9 stands alone). */
function symmetricPairs(size: SudokuSize): number[][] {
  const cells = size * size;
  const out: number[][] = [];
  for (let i = 0; i < cells; i++) {
    const j = cells - 1 - i;
    if (j < i) break;
    out.push(i === j ? [i] : [i, j]);
  }
  return out;
}

function countGivens(grid: readonly number[]): number {
  let n = 0;
  for (const v of grid) if (v) n++;
  return n;
}

/** One generation attempt from a fresh full grid. */
function attempt(size: SudokuSize, level: SudokuLevel, rng: Rng): { givens: number[]; solution: number[]; level: number } {
  const target = LEVEL_NUM[level];
  const win = GIVENS[size][level];
  const solution = fullGrid(size, rng);
  const grid = solution.slice();
  let givens = grid.length;
  let current = 1;
  for (const pair of rng.shuffle(symmetricPairs(size))) {
    if (current === target && givens <= win.max) break;
    if (givens - pair.length < win.floor) continue;
    for (const i of pair) grid[i] = 0;
    const lv = logicLevel(grid, size, target);
    if (lv === 0) {
      for (const i of pair) grid[i] = solution[i];
      continue;
    }
    givens -= pair.length;
    current = lv;
  }
  return { givens: grid, solution, level: current };
}

/**
 * A puzzle with exactly one solution at the requested level, deterministic for (seed, size, level). Tries a bounded
 * number of fresh grids; when none reaches the level, the closest one below is returned (its `level` says which).
 */
export function generateSudoku(seed: number, size: SudokuSize, level: SudokuLevel, maxAttempts = 60): SudokuPuzzle {
  const rng = new Rng(`sudoku/${size}/${level}/${seed}`);
  const { boxW, boxH } = boxSize(size);
  let best: { givens: number[]; solution: number[]; level: number } | null = null;
  const target = LEVEL_NUM[level];
  for (let k = 0; k < maxAttempts; k++) {
    const a = attempt(size, level, rng);
    if (a.level === target) {
      best = a;
      break;
    }
    if (!best || a.level > best.level || (a.level === best.level && countGivens(a.givens) < countGivens(best.givens))) best = a;
  }
  const b = best!;
  return { size, boxW, boxH, givens: b.givens, solution: b.solution, level: NUM_LEVEL[b.level], seed };
}

// ─── pool ─────────────────────────────────────────────────────────────────────────────────────────────────

export function gridToString(grid: readonly number[]): string {
  return grid.map((v) => String(v)).join("");
}

export function gridFromString(s: string): number[] {
  return [...s].map((ch) => (ch >= "1" && ch <= "9" ? ch.charCodeAt(0) - 48 : 0));
}

/**
 * A puzzle from a pre-generated pool, picked and varied by seed: the digits are relabelled and the grid is
 * mirrored or rotated (moves that keep the box structure, the symmetry and the needed techniques). Returns null when
 * the pool has no puzzle of this size.
 */
export function sudokuFromPool(pool: SudokuPool, seed: number, size: SudokuSize): SudokuPuzzle | null {
  const list = pool[String(size) as "6" | "9"];
  if (!list || list.length === 0) return null;
  const rng = new Rng(`sudoku-pool/${size}/${pool.level}/${seed}`);
  const base = gridFromString(list[rng.int(0, list.length - 1)]);
  const n = size;
  const relabel = [0, ...rng.shuffle(Array.from({ length: n }, (_, i) => i + 1))];
  // 9×9: the 8 symmetries of the square; 6×6 (boxes 3×2): identity, mirror left-right, mirror top-bottom, half turn.
  const t = size === 9 ? rng.int(0, 7) : rng.int(0, 3);
  const map = (r: number, c: number): [number, number] => {
    const m = n - 1;
    if (size === 6) return t === 0 ? [r, c] : t === 1 ? [r, m - c] : t === 2 ? [m - r, c] : [m - r, m - c];
    const [rr, cc] = t & 4 ? [c, r] : [r, c];
    return [t & 1 ? m - rr : rr, t & 2 ? m - cc : cc];
  };
  const givens = new Array(n * n).fill(0);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const [r2, c2] = map(r, c);
      givens[r2 * n + c2] = relabel[base[r * n + c]];
    }
  }
  const solution = solveSudoku(givens, size);
  if (!solution) return null;
  const { boxW, boxH } = boxSize(size);
  const g = gradeSudoku(givens, size);
  return { size, boxW, boxH, givens, solution, level: g === "unsolvable" ? pool.level : g, seed };
}

// ─── helpers for the station ──────────────────────────────────────────────────────────────────────────────

/** Empty cells filled before the start (the pencil souvenir), chosen by seed, never two in the same box. */
export function presolvedCells(puzzle: SudokuPuzzle, count: number): number[] {
  if (count <= 0) return [];
  const rng = new Rng(`sudoku-pencil/${puzzle.seed}/${puzzle.size}`);
  const g = geometry(puzzle.size);
  const empty = rng.shuffle(puzzle.givens.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0));
  const out: number[] = [];
  const usedBoxes = new Set<number>();
  for (const i of empty) {
    if (out.length >= count) break;
    if (usedBoxes.has(g.boxOf[i])) continue;
    usedBoxes.add(g.boxOf[i]);
    out.push(i);
  }
  for (const i of empty) if (out.length < count && !out.includes(i)) out.push(i);
  return out;
}

/**
 * The cell to reveal for "Ein Feld verraten": the selected cell when it is empty or wrong, otherwise the first wrong
 * digit on the board, otherwise the cell that is easiest to find next (a naked single, then a hidden single, judged
 * from the digits on the board), otherwise the first empty cell. -1 when the board is complete and correct.
 */
export function hintCell(board: readonly number[], solution: readonly number[], size: SudokuSize, selected = -1): number {
  if (selected >= 0 && board[selected] !== solution[selected]) return selected;
  const g = geometry(size);
  for (let i = 0; i < g.cells; i++) if (board[i] && board[i] !== solution[i]) return i;
  const logic = new Logic(g, board);
  if (!logic.broken) {
    for (let i = 0; i < g.cells; i++) if (!board[i] && popcount(logic.cand[i]) === 1) return i;
    for (const u of g.units) {
      for (let d = 1; d <= g.n; d++) {
        const cells = u.filter((i) => !board[i] && logic.cand[i] & (1 << d));
        if (cells.length === 1) return cells[0];
      }
    }
  }
  for (let i = 0; i < g.cells; i++) if (!board[i]) return i;
  return -1;
}
