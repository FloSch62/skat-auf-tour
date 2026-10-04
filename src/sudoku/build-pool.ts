// Pre-generates the Sudoku pools the browser cannot make quickly (contract §4.9): 6×6 medium, 6×6 hard and 9×9 hard.
// Deterministic. Run from the project root (CPU-light, but nice anyway):
//
//   nice -n 15 node --experimental-strip-types --no-warnings src/sudoku/build-pool.ts
//
// Writes public/puzzles/sudoku-medium.json and public/puzzles/sudoku-hard.json ({ version, level, "6": [...], "9": [...] },
// each entry the givens as a string of digits, "0" = empty). The station varies each pick by seed (relabelling,
// mirroring), see sudokuFromPool.
import { writeFileSync, mkdirSync } from "node:fs";
import { countSolutions, generateSudoku, gradeSudoku, gridToString, type SudokuLevel, type SudokuPool, type SudokuSize } from "./sudoku.ts";

const PLAN: { level: SudokuLevel; size: SudokuSize; count: number; attempts: number }[] = [
  { level: "medium", size: 6, count: 200, attempts: 400 },
  { level: "hard", size: 6, count: 200, attempts: 200 },
  { level: "hard", size: 9, count: 300, attempts: 60 },
];

const pools = new Map<SudokuLevel, SudokuPool>();
for (const job of PLAN) {
  const pool = pools.get(job.level) ?? { version: 1, level: job.level };
  pools.set(job.level, pool);
  const seen = new Set<string>();
  const list: string[] = [];
  const t0 = performance.now();
  for (let seed = 1; list.length < job.count && seed < job.count * 50; seed++) {
    const p = generateSudoku(seed, job.size, job.level, job.attempts);
    if (p.level !== job.level) continue;
    const s = gridToString(p.givens);
    if (seen.has(s)) continue;
    if (countSolutions(p.givens, job.size) !== 1 || gradeSudoku(p.givens, job.size) !== job.level) throw new Error(`bad puzzle ${s}`);
    seen.add(s);
    list.push(s);
  }
  pool[String(job.size) as "6" | "9"] = list;
  console.log(`${job.size}×${job.size} ${job.level}: ${list.length} puzzles in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
}

mkdirSync("public/puzzles", { recursive: true });
for (const [level, pool] of pools) {
  const body = `{"version":${pool.version},"level":"${level}",\n` +
    (["6", "9"] as const)
      .filter((k) => pool[k])
      .map((k) => `"${k}":[\n${pool[k]!.map((s) => `"${s}"`).join(",\n")}\n]`)
      .join(",\n") +
    "}\n";
  writeFileSync(`public/puzzles/sudoku-${level}.json`, body);
  console.log(`wrote public/puzzles/sudoku-${level}.json`);
}
