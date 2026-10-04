// The bundled Stammtisch problems (public/puzzles/skat-problems.json) checked again with the open-card solver. A sample
// keeps npm test fast; tools/skat-problems/validate.ts checks every problem.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { SkatProblemPack } from "../problems/format.ts";
import { winningCards } from "../problems/solve.ts";
import { checkBidProblem, checkDiscardProblem, checkEndgameProblem } from "./problemcheck.ts";

const FILE = fileURLToPath(new URL("../../../public/puzzles/skat-problems.json", import.meta.url));

function every<T>(list: T[], n: number): T[] {
  if (list.length <= n) return list;
  const step = list.length / n;
  return Array.from({ length: n }, (_, i) => list[Math.floor(i * step)]);
}

test("problem pack: shape, counts and unique ids", { skip: !existsSync(FILE) }, () => {
  const pack = JSON.parse(readFileSync(FILE, "utf8")) as SkatProblemPack;
  assert.equal(pack.version, 1);
  const ids = new Set(pack.problems.map((p) => p.id));
  assert.equal(ids.size, pack.problems.length);
  assert.ok(pack.problems.length >= 300, `${pack.problems.length} problems`);
  for (const p of pack.problems) {
    assert.ok([1, 2, 3].includes(p.difficulty), p.id);
    assert.ok(p.explanation.length >= 20, `${p.id} explanation`);
  }
});

test("problem pack: a sample of endgames is unique by the solver", { skip: !existsSync(FILE) }, () => {
  const pack = JSON.parse(readFileSync(FILE, "utf8")) as SkatProblemPack;
  const endgames = pack.problems.filter((p) => p.type === "endgame");
  for (const p of every(endgames, 30)) {
    assert.equal(checkEndgameProblem(p), null, p.id);
    // The station's own plain alpha-beta (src/skat/problems/solve.ts) must agree: exactly the solution.
    assert.deepEqual(winningCards(p), [p.solution], `${p.id} (station solver)`);
  }
});

test("problem pack: a sample of bid and discard problems holds", { skip: !existsSync(FILE) }, () => {
  const pack = JSON.parse(readFileSync(FILE, "utf8")) as SkatProblemPack;
  for (const p of every(pack.problems.filter((x) => x.type === "bid"), 3)) assert.equal(checkBidProblem(p), null, p.id);
  for (const p of every(pack.problems.filter((x) => x.type === "discard"), 1)) assert.equal(checkDiscardProblem(p), null, p.id);
});
