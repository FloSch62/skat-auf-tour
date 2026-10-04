// Invariant fuzzer for the Skat rules (contract §5.2): plays random legal games and checks 120 Augen, only legal
// moves (against a naive second implementation and the fast Position), trick winners, game values against an
// independent ISkO calculation, overbid handling, Seeger-Fabian list sums, void inference and world sampling.
//
//   nice -n 15 node --experimental-strip-types --no-warnings tools/balance/random-games.ts --n 1000000 [--seed 1] [--out f.md]
import { writeFileSync } from "node:fs";
import { runRandomGames } from "../../src/skat/rules/fuzz.ts";
import type { FuzzReport } from "../../src/skat/rules/fuzz.ts";

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}

const n = Number(arg("n", "100000"));
const seed = Number(arg("seed", "1"));
const out = arg("out", "");

const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) + " %" : "–");

function summary(r: FuzzReport): string {
  const lines = [
    `Random games: ${r.games.toLocaleString("en")} (seed ${seed}), ${r.checks.toLocaleString("en")} checks, ` +
      `${(r.ms / 1000).toFixed(1)} s, errors: ${r.errors.length}`,
    "",
    "| | count | share |",
    "|---|---:|---:|",
    `| declared games | ${r.declared} | ${pct(r.declared, r.games)} |`,
    `| won by the declarer | ${r.won} | ${pct(r.won, r.declared)} |`,
    `| overbid | ${r.overbid} | ${pct(r.overbid, r.declared)} |`,
    `| Hand | ${r.hand} | ${pct(r.hand, r.declared)} |`,
    `| Schneider angesagt / Schwarz angesagt / ouvert | ${r.schneiderAnnounced} / ${r.schwarzAnnounced} / ${r.ouvert} | |`,
    `| Schneider / Schwarz on the cards | ${r.schneider} / ${r.schwarz} | |`,
    `| Null ended at the declarer's first trick | ${r.nullEarly} | |`,
    `| Kontra / Re | ${r.kontra} / ${r.re} | |`,
    `| passed in (eingepasst) | ${r.passed} | ${pct(r.passed, r.games)} |`,
    `| Ramsch (of it Schieberamsch) | ${r.ramsch} (${r.schieberamsch}) | ${pct(r.ramsch, r.games)} |`,
    `| Ramsch Jungfrau / Durchmarsch | ${r.jungfrau} / ${r.durchmarsch} | |`,
    `| take-backs / skat peeks | ${r.takeBacks} / ${r.peeks} | |`,
    `| by kind | ${Object.entries(r.byKind).map(([k, v]) => `${k} ${v}`).join(", ")} | |`,
    `| highest bid / written value range | ${r.maxBid} / ${r.minWritten} … +${r.maxWritten} | |`,
  ];
  if (r.errors.length) lines.push("", "Errors:", ...r.errors.map((e) => `- ${e}`));
  return lines.join("\n");
}

const t0 = Date.now();
const report = runRandomGames({
  games: n,
  seed,
  onProgress: (done, r) => {
    if (done % 100000 === 0) {
      console.error(`${done.toLocaleString("en")} games, ${r.errors.length} errors, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
  },
});
const text = summary(report);
console.log(text);
if (out) writeFileSync(out, text + "\n");
process.exit(report.errors.length ? 1 : 0);
