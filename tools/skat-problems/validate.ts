// Re-validate every bundled Stammtisch problem with the open-card solver (the same checks the generator used).
//   nice -n 15 node --experimental-strip-types --no-warnings tools/skat-problems/validate.ts [public/puzzles/skat-problems.json]
// npm test checks a sample (src/skat/ai/problems.test.ts); this tool checks all (a few minutes: discard problems are
// re-ranked over 64 solved worlds each).
import { readFileSync } from "node:fs";
import type { SkatProblemPack } from "../../src/skat/problems/format.ts";
import { checkBidProblem, checkDiscardProblem, checkEndgameProblem } from "../../src/skat/ai/problemcheck.ts";

const file = process.argv[2] ?? "public/puzzles/skat-problems.json";
const pack = JSON.parse(readFileSync(file, "utf8")) as SkatProblemPack;
const t0 = Date.now();
let bad = 0;
const ids = new Set<string>();
const count: Record<string, number> = {};
for (const p of pack.problems) {
  count[p.type] = (count[p.type] ?? 0) + 1;
  if (ids.has(p.id)) {
    console.log(`${p.id}: duplicate id`);
    bad++;
  }
  ids.add(p.id);
  const err = p.type === "endgame" ? checkEndgameProblem(p) : p.type === "discard" ? checkDiscardProblem(p) : checkBidProblem(p);
  if (!p.explanation || p.explanation.length < 20) {
    console.log(`${p.id}: explanation missing`);
    bad++;
  }
  if (err) {
    console.log(`${p.id}: ${err}`);
    bad++;
  }
}
console.log(
  `${pack.problems.length} problems (${Object.entries(count).map(([k, v]) => `${k} ${v}`).join(", ")}), ${bad} problems with errors, ${((Date.now() - t0) / 1000).toFixed(0)} s`,
);
process.exit(bad ? 1 : 0);
