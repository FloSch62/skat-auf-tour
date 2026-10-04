import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import {
  countSolutions, generateSudoku, gradeSudoku, gridFromString, hintCell, isValidSolution, presolvedCells, solveLogically,
  sudokuFromPool, GIVENS, LEVELS, type SudokuLevel, type SudokuPool, type SudokuPuzzle, type SudokuSize,
} from "./sudoku.ts";

const RANK: Record<SudokuLevel, number> = { easy: 1, medium: 2, hard: 3 };

function checkPuzzle(p: SudokuPuzzle, where: string) {
  const cells = p.size * p.size;
  assert.equal(p.givens.length, cells, where);
  assert.ok(isValidSolution(p.solution, p.size), `${where}: solution breaks the rules`);
  for (let i = 0; i < cells; i++) if (p.givens[i]) assert.equal(p.givens[i], p.solution[i], `${where}: given ≠ solution at ${i}`);
  assert.equal(countSolutions(p.givens, p.size), 1, `${where}: not unique`);
  const logic = solveLogically(p.givens, p.size);
  assert.equal(logic.grade, p.level, `${where}: graded ${logic.grade}, says ${p.level}`);
  assert.deepEqual(logic.grid, p.solution, `${where}: logic reached a different grid`);
}

/** Generated in the browser: these levels must always be hit (no pool needed). */
const DIRECT: [SudokuSize, SudokuLevel, number][] = [
  [9, "easy", 150],
  [9, "medium", 150],
  [6, "easy", 300],
];

for (const [size, level, n] of DIRECT) {
  test(`generate ${size}×${size} ${level}: unique, graded ${level}, ${n} seeds`, () => {
    for (let seed = 0; seed < n; seed++) {
      const p = generateSudoku(seed, size, level);
      assert.equal(p.level, level, `seed ${seed}`);
      checkPuzzle(p, `${size}/${level}/${seed}`);
      const givens = p.givens.filter(Boolean).length;
      const win = GIVENS[size][level];
      assert.ok(givens >= win.floor, `seed ${seed}: ${givens} givens below floor`);
      if (level === "easy") assert.ok(givens <= win.max, `seed ${seed}: easy with ${givens} givens`);
    }
  });
}

test("generate 9×9 hard without a pool (fallback path): unique and correctly graded", () => {
  for (let seed = 0; seed < 20; seed++) {
    const p = generateSudoku(seed, 9, "hard");
    assert.equal(p.level, "hard", `seed ${seed}`);
    checkPuzzle(p, `9/hard/${seed}`);
  }
});

test("generate 6×6 medium and hard without a pool: unique, graded honestly, never above the request", () => {
  for (const level of ["medium", "hard"] as const) {
    for (let seed = 0; seed < 10; seed++) {
      const p = generateSudoku(seed, 6, level, 20);
      assert.ok(RANK[p.level] <= RANK[level], `${level} seed ${seed} came out ${p.level}`);
      checkPuzzle(p, `6/${level}/${seed}`);
    }
  }
});

test("same seed, same puzzle; different seed, different puzzle", () => {
  for (const size of [6, 9] as const) {
    for (const level of LEVELS) {
      const a = generateSudoku(7, size, level, 10);
      const b = generateSudoku(7, size, level, 10);
      assert.deepEqual(a.givens, b.givens);
      assert.deepEqual(a.solution, b.solution);
    }
    assert.notDeepEqual(generateSudoku(1, size, "easy").givens, generateSudoku(2, size, "easy").givens);
  }
});

test("countSolutions: empty grid has many, contradictions have none, a solution has one", () => {
  assert.equal(countSolutions(new Array(81).fill(0), 9), 2);
  assert.equal(countSolutions(new Array(36).fill(0), 6, 5), 5);
  const bad = new Array(81).fill(0);
  bad[0] = 5;
  bad[1] = 5;
  assert.equal(countSolutions(bad, 9), 0);
  assert.equal(gradeSudoku(bad, 9), "unsolvable");
  const p = generateSudoku(3, 9, "easy");
  assert.equal(countSolutions(p.solution, 9), 1);
  assert.equal(gradeSudoku(p.solution, 9), "easy");
});

const POOLS: [SudokuLevel, SudokuSize[]][] = [
  ["medium", [6]],
  ["hard", [6, 9]],
];

for (const [level, sizes] of POOLS) {
  const path = `public/puzzles/sudoku-${level}.json`;
  test(`pool ${path}: every entry unique and graded ${level}; picks vary by seed`, () => {
    assert.ok(existsSync(path), `${path} missing (run src/sudoku/build-pool.ts)`);
    const pool = JSON.parse(readFileSync(path, "utf8")) as SudokuPool;
    assert.equal(pool.level, level);
    for (const size of sizes) {
      const list = pool[String(size) as "6" | "9"] ?? [];
      assert.ok(list.length >= 100, `${size}×${size}: only ${list.length} entries`);
      assert.equal(new Set(list).size, list.length, "duplicates");
      for (const s of list) {
        assert.equal(s.length, size * size);
        const g = gridFromString(s);
        assert.equal(countSolutions(g, size), 1, s);
        assert.equal(gradeSudoku(g, size), level, s);
      }
      const seen = new Set<string>();
      for (let seed = 0; seed < 30; seed++) {
        const p = sudokuFromPool(pool, seed, size);
        assert.ok(p, `no pick for seed ${seed}`);
        assert.equal(p.size, size);
        checkPuzzle(p, `pool ${size}/${level}/${seed}`);
        assert.equal(p.level, level);
        assert.deepEqual(sudokuFromPool(pool, seed, size)!.givens, p.givens, "not deterministic");
        seen.add(p.givens.join(""));
      }
      assert.ok(seen.size >= 25, `picks repeat too often (${seen.size}/30)`);
    }
  });
}

test("presolved cells are distinct empty cells; hints point at a findable or wrong cell", () => {
  for (const size of [6, 9] as const) {
    const p = generateSudoku(11, size, "medium", 20);
    const pre = presolvedCells(p, 2);
    assert.equal(pre.length, 2);
    assert.notEqual(pre[0], pre[1]);
    for (const i of pre) assert.equal(p.givens[i], 0);
    assert.deepEqual(presolvedCells(p, 2), pre);

    const board = p.givens.slice();
    const h = hintCell(board, p.solution, size);
    assert.ok(h >= 0 && board[h] === 0);
    // selected wrong cell is revealed first
    const empty = board.findIndex((v) => v === 0);
    board[empty] = (p.solution[empty] % size) + 1;
    assert.equal(hintCell(board, p.solution, size, empty), empty);
    assert.equal(hintCell(board, p.solution, size), empty);
    assert.equal(hintCell(p.solution, p.solution, size), -1);
  }
});
