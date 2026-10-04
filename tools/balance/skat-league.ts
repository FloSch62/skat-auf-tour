// The league without a screen (contract §5.4, milestone M3). Seeded games between the personas and the rule-based
// baseline, run in at most 4 child processes (the npm script runs under nice -n 15). Writes docs/balance-skat.md
// (acceptance, statistics per persona, decision times) and docs/balance-skat-games.md (50 complete games in German
// notation for review by a club player).
//
//   npm run test:skat                         full league (≈ 1–2 h on a desktop with 4 processes)
//   node … tools/balance/skat-league.ts --quick --out /tmp/x.md     small smoke run
//   options: --equal N --baseline N --persona N --ramsch N --kontra N --logs N --sharp N --parallel N
//            --browser file.json (from skat-browser-timing.ts) --raw file.jsonl (every game record, written as the
//            suites finish) --from-raw file.jsonl (rebuild the report from such a file without playing)
import { readFileSync, writeFileSync } from "node:fs";
import { CHARACTERS } from "../../src/game/ids.ts";
import { CHARACTER_DEFS } from "../../src/data/characters.ts";
import { PERSONAS, BASE_THRESHOLD } from "../../src/skat/ai/persona.ts";
import { VALUATION_SLACK } from "../../src/skat/ai/bid.ts";
import { agentName, gameToMarkdown } from "./skat-notation.ts";
import { runParallel } from "./skat-pool.ts";
import type { GameRec, LeagueJob } from "./skat-league-worker.ts";

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}
const quick = process.argv.includes("--quick");
const N = {
  equal: Number(arg("equal", quick ? "60" : "2000")),
  baseline: Number(arg("baseline", quick ? "60" : "5000")),
  persona: Number(arg("persona", quick ? "12" : "240")),
  ramsch: Number(arg("ramsch", quick ? "12" : "300")),
  kontra: Number(arg("kontra", quick ? "12" : "400")),
  logs: Number(arg("logs", quick ? "6" : "50")),
  sharp: Number(arg("sharp", quick ? "6" : "150")),
};
const parallel = Number(arg("parallel", "4"));
const out = arg("out", "docs/balance-skat.md");
const gamesOut = arg("games-out", out.replace(/\.md$/, "-games.md"));
const browserFile = arg("browser", "");
const rawFile = arg("raw", "");

const MEDIUM = "wirtin";
const t0 = Date.now();
const progress = (label: string) => {
  let n = 0;
  return () => {
    if (++n % 200 === 0) console.error(`${label}: ${n} games, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  };
};

const fromRaw = arg("from-raw", "");
const loaded: GameRec[] = fromRaw ? readFileSync(fromRaw, "utf8").trim().split("\n").map((l) => JSON.parse(l) as GameRec) : [];
const saved: GameRec[] = [];

async function run(job: LeagueJob, label: string): Promise<GameRec[]> {
  if (fromRaw) {
    // Rebuild the report from a previous run's records (same suites and seeds).
    const [first, count] = job.seeds;
    return loaded.filter((r) => r.suite === job.suite && r.seed >= first && r.seed < first + count);
  }
  if (job.seeds[1] <= 0) return [];
  const tick = progress(label);
  const r = await runParallel(job, { parallel, onGame: tick });
  console.error(`${label}: done (${r.length} games, ${((Date.now() - t0) / 60000).toFixed(1)} min)`);
  // Keep every record on disk as it comes, so a crash in the report never loses the run.
  if (rawFile) {
    saved.push(...r);
    writeFileSync(rawFile, saved.map((x) => JSON.stringify(x)).join("\n") + "\n");
  }
  return r;
}

// ─── Suites ───────────────────────────────────────────────────────────────────────────────────────────────

const equal = await run({ suite: "equal", agents: [[MEDIUM, MEDIUM, MEDIUM]], seeds: [100_000, N.equal] }, "medium vs two equals");

// Duplicate format: every deal twice, once one medium against two baselines and once two mediums against one baseline
// (the lone player rotates through the seats with the deal number).
const dupSets: [string, string, string][] = [];
const baselineJobs: GameRec[] = [];
{
  const sets: [string, string, string][][] = [0, 1, 2].map((k) => {
    const a: [string, string, string] = ["baseline", "baseline", "baseline"];
    a[k] = MEDIUM;
    const b: [string, string, string] = [MEDIUM, MEDIUM, MEDIUM];
    b[k] = "baseline";
    return [a, b];
  });
  for (let k = 0; k < 3; k++) {
    const count = Math.floor(N.baseline / 3) + (k < N.baseline % 3 ? 1 : 0);
    // Deal seeds k, k+3, … keep the lone seat rotating with the dealer.
    const recs = await run({ suite: "baseline", agents: sets[k], seeds: [200_000 + k * 100_000, count], duplicate: true }, `medium vs baseline (seat ${k})`);
    baselineJobs.push(...recs);
  }
  dupSets.push(...sets.flat());
}

const personaRecs: GameRec[] = [];
for (const id of CHARACTERS) {
  // Each persona plays the same deals against two medium figures, rotating through the seats.
  const sets: [string, string, string][] = [0, 1, 2].map((k) => {
    const a: [string, string, string] = [MEDIUM, MEDIUM, MEDIUM];
    a[k] = id;
    return a;
  });
  personaRecs.push(...(await run({ suite: `persona:${id}`, agents: sets, seeds: [400_000, N.persona] }, `persona ${id}`)));
}

// Ramsch: the figures pass every deal on purpose (with real bidding only a few percent of the deals are passed in),
// so every game of these suites is a Ramsch.
const RAMSCH_TABLE: [string, string, string][] = [
  ["allpass:wirtin", "allpass:rechnerin", "allpass:zocker"],
  ["allpass:zocker", "allpass:wirtin", "allpass:rechnerin"],
  ["allpass:rechnerin", "allpass:zocker", "allpass:wirtin"],
];
const ramsch = await run({ suite: "ramsch", agents: RAMSCH_TABLE, seeds: [600_000, N.ramsch], rules: { allPass: "ramsch" } }, "Ramsch house rule");
const schieb = await run({ suite: "schieberamsch", agents: RAMSCH_TABLE, seeds: [650_000, N.ramsch], rules: { allPass: "schieberamsch" } }, "Schieberamsch house rule");
const kontra = await run({ suite: "kontra", agents: [[MEDIUM, "schlitzohr", "maurer"]], seeds: [700_000, N.kontra], rules: { kontra: true } }, "Kontra house rule");

// The heaviest thinkers: very strong figures at the "Scharf" depth 1.4 (timing; also how they fare).
const sharp = await run({ suite: "sharp", agents: [["altmeister@1.4", "muellerin@1.4", "brenner@1.4"]], seeds: [750_000, N.sharp] }, "very strong at depth 1.4");

// Game logs: a mixed table of figures (weak, medium, strong) so the review sees every style.
const LOG_TABLES: [string, string, string][] = [
  ["altmeister", "zocker", "maurer"],
  ["rechnerin", "grandspieler", "neuling"],
  ["wirtin", "nullfuchs", "schlitzohr"],
  ["lehrer", "kommandant", "brenner"],
  ["schaffnerin", "meister", "biker-manne"],
];
const logs = await run({ suite: "logs", agents: LOG_TABLES, seeds: [800_000, N.logs], logs: true }, "game logs");

// ─── Statistics ───────────────────────────────────────────────────────────────────────────────────────────

interface Stat {
  seatGames: number;
  declared: number;
  won: number;
  overbid: number;
  hand: number;
  schneider: number;
  list: number;
  listSq: number;
  kinds: Record<string, number>;
  bidSum: number;
  passedDeals: number;
  maxReached: number;
  kontraSaid: number;
}

function newStat(): Stat {
  return { seatGames: 0, declared: 0, won: 0, overbid: 0, hand: 0, schneider: 0, list: 0, listSq: 0, kinds: {}, bidSum: 0, passedDeals: 0, maxReached: 0, kontraSaid: 0 };
}

function statsBy(recs: GameRec[], filter: (agent: string) => boolean = () => true): Map<string, Stat> {
  const m = new Map<string, Stat>();
  for (const r of recs) {
    for (let s = 0; s < 3; s++) {
      const a = r.agents[s];
      if (!filter(a)) continue;
      let st = m.get(a);
      if (!st) m.set(a, (st = newStat()));
      st.seatGames++;
      st.list += r.list[s];
      st.listSq += r.list[s] * r.list[s];
      st.maxReached += r.reached[s];
      if (r.type === "passed") st.passedDeals++;
      if (r.declarer === s) {
        st.declared++;
        st.bidSum += r.bid;
        if (r.won) st.won++;
        if (r.overbid) st.overbid++;
        if (r.hand) st.hand++;
        if (r.won && r.schneider) st.schneider++;
        st.kinds[r.kind!] = (st.kinds[r.kind!] ?? 0) + 1;
      }
    }
  }
  return m;
}

/** Maximum without spreading (hundreds of thousands of timings would overflow the stack). */
function maxOf(a: readonly number[]): number {
  let m = -Infinity;
  for (const x of a) if (x > m) m = x;
  return m;
}

const pct = (a: number, b: number, d = 1) => (b ? `${((100 * a) / b).toFixed(d)} %` : "–");
const f1 = (x: number) => x.toFixed(1);

/** Half width of the 95 % interval of a mean, from the sum of squares of the samples. */
function ci95(mean: number, sumSq: number, n: number): number {
  if (n < 2) return 0;
  const varr = sumSq / n - mean * mean;
  return 1.96 * Math.sqrt(Math.max(0, varr) / n);
}

// Acceptance 1 + 2: medium vs two equals.
const eq = statsBy(equal).get(MEDIUM)!;
const eqWin = eq.won / Math.max(1, eq.declared);
const eqOver = eq.overbid / Math.max(1, eq.declared);
const eqPassed = equal.filter((r) => r.type === "passed").length;

// Acceptance 3: medium vs baseline over the duplicate deals.
let mSum = 0;
let mSq = 0;
let mN = 0;
let bSum = 0;
let bSq = 0;
let bN = 0;
const diffs: number[] = [];
{
  const byDeal = new Map<string, number>();
  for (const r of baselineJobs) {
    let md = 0;
    let bd = 0;
    let mc = 0;
    let bc = 0;
    for (let s = 0; s < 3; s++) {
      if (r.agents[s] === "baseline") {
        bSum += r.list[s];
        bSq += r.list[s] ** 2;
        bN++;
        bd += r.list[s];
        bc++;
      } else {
        mSum += r.list[s];
        mSq += r.list[s] ** 2;
        mN++;
        md += r.list[s];
        mc++;
      }
    }
    // Per deal: medium's average list points minus the baseline's, summed over both lineups.
    const key = `${r.seed}`;
    byDeal.set(key, (byDeal.get(key) ?? 0) + md / mc - bd / bc);
  }
  for (const v of byDeal.values()) diffs.push(v / 2);
}
const mMean = mSum / Math.max(1, mN);
const bMean = bSum / Math.max(1, bN);
const dMean = diffs.reduce((a, b) => a + b, 0) / Math.max(1, diffs.length);
const dCi = ci95(dMean, diffs.reduce((a, b) => a + b * b, 0), diffs.length);
const blStats = statsBy(baselineJobs);

// Timing over every recorded decision.
const allRecs = [...equal, ...baselineJobs, ...personaRecs, ...ramsch, ...schieb, ...kontra, ...logs];
const sharpTimes: number[] = [];
for (const r of sharp) for (const t of r.times) sharpTimes.push(t[1]);
interface Timing {
  n: number;
  all: number[];
}
const timing = new Map<string, Timing>();
const allTimes: number[] = [];
for (const r of allRecs) {
  for (const [phase, ms, seat, hs] of r.times) {
    if (r.agents[seat] === "baseline") continue;
    const key = phase === "play" ? (hs >= 9 ? "play (10–9 cards)" : hs >= 7 ? "play (8–7 cards)" : "play (≤ 6 cards)") : phase;
    let t = timing.get(key);
    if (!t) timing.set(key, (t = { n: 0, all: [] }));
    t.n++;
    t.all.push(ms);
    allTimes.push(ms);
  }
}
const q = (a: number[], p: number) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
};
const p95 = q(allTimes, 0.95);
const LAPTOP = 2.2; // an ordinary laptop core vs this desktop core (Ryzen 9 7900X3D), measured Chromium ≈ node here
let browser: { p95: number; p99: number; max: number; n: number; ratio: number } | null = null;
if (browserFile) {
  try {
    browser = JSON.parse(readFileSync(browserFile, "utf8"));
  } catch {
    browser = null;
  }
}

// ─── Report ───────────────────────────────────────────────────────────────────────────────────────────────

const L: string[] = [];
const P = (s = "") => L.push(s);
P("# Skat AI — league without a screen (contract §5.4)");
P();
const runMinutes = fromRaw ? Number(arg("run-minutes", "0")) : (Date.now() - t0) / 60000;
P(`Generated by \`npm run test:skat\` (tools/balance/skat-league.ts) on ${new Date().toISOString().slice(0, 10)}; ${(allRecs.length + sharp.length).toLocaleString("en")} games in ${runMinutes.toFixed(0)} min, ${parallel} processes under \`nice -n 15\`${fromRaw ? " (report rebuilt from the saved game records, with the Chromium measurement)" : ""}. Every game is seeded (deal seed = the number in the logs) and every decision only sees the seat's SeatView.`);
P();
P(`"Medium" is die Wirtin Lore (strength 2, the solid medium figure) at difficulty depth 1 (Sportlich). Bidding threshold ${BASE_THRESHOLD} on the solver's win chance with ${VALUATION_SLACK} Augen slack (docs/notes-ai.md).`);
P();
P("## Acceptance (§5.4)");
P();
P("| criterion | target | measured | result |");
P("|---|---|---|---|");
P(`| medium wins its declared games against two equals | ≥ 75 % | ${pct(eq.won, eq.declared)} of ${eq.declared} declared games (${N.equal} deals) | ${eqWin >= 0.75 ? "**pass**" : "**FAIL**"} |`);
P(`| overbid declared games | < 3 % | ${pct(eq.overbid, eq.declared, 2)} (${eq.overbid} of ${eq.declared}) | ${eqOver < 0.03 ? "**pass**" : "**FAIL**"} |`);
P(`| medium beats the rule-based baseline over ${baselineJobs.length.toLocaleString("en")} games | clearly | ${f1(mMean)} vs ${f1(bMean)} list points per seat and game; duplicate difference ${f1(dMean)} ± ${f1(dCi)} (95 %) per deal | ${dMean - dCi > 0 ? "**pass**" : "**FAIL**"} |`);
P(`| decisions under 1.5 s in the browser | 95 % | node p95 ${p95.toFixed(0)} ms on this desktop → ≈ ${(p95 * LAPTOP).toFixed(0)} ms on an ordinary laptop (×${LAPTOP})${browser ? `; Chromium (worker, --disable-gpu) p95 ${browser.p95.toFixed(0)} ms over ${browser.n} decisions` : ""} | ${p95 * LAPTOP < 1500 ? "**pass**" : "**FAIL**"} |`);
P(`| fifty games reviewed, no nonsense move | club player | ${N.logs} games in docs/balance-skat-games.md | to be reviewed |`);
P();
P(`Passed in (eingepasst) with three medium figures: ${pct(eqPassed, equal.length)} of the deals. Medium declares ${pct(eq.declared, eq.seatGames)} of its seat-games, average bid ${f1(eq.bidSum / Math.max(1, eq.declared))}, Hand ${pct(eq.hand, eq.declared)}, won with Schneider ${pct(eq.schneider, eq.declared)}. Kinds: ${Object.entries(eq.kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v, eq.declared, 0)}`).join(", ")}.`);
P();
P("## Medium against the rule-based baseline");
P();
P("The baseline (src/skat/ai/baseline.ts) bids by counting trumps, jacks and aces, lays away by the rules of thumb and plays the card the rules of thumb like best — no lookahead. Every deal is played twice: one medium against two baselines and two mediums against one baseline (the lone seat rotates).");
P();
P("| | seat-games | declares | wins declared | overbid | list per game |");
P("|---|---:|---:|---:|---:|---:|");
for (const [a, s] of blStats) P(`| ${agentName(a)} | ${s.seatGames} | ${pct(s.declared, s.seatGames)} | ${pct(s.won, s.declared)} | ${pct(s.overbid, s.declared)} | ${f1(s.list / s.seatGames)} ± ${f1(ci95(s.list / s.seatGames, s.listSq, s.seatGames))} |`);
P();
P("## Personas against two medium figures");
P();
P(`Each figure plays ${N.persona} deals (the same deals for all) against two times die Wirtin Lore, rotating through the seats. "declares" = share of its seat-games in which it became declarer; "list" = average list points per game (Seeger-Fabian); "bid" = average final bid of its declared games; "reach" = average highest value it said or held.`);
P();
P("| figure | str. | declares | won | overbid | Grand | Null | Hand | bid | reach | list | style |");
P("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|");
const personaStats = new Map<string, Stat>();
for (const id of CHARACTERS) {
  const recs = personaRecs.filter((r) => r.suite === `persona:${id}`);
  const st = statsBy(recs, (a) => a === id).get(id) ?? newStat();
  personaStats.set(id, st);
  const def = CHARACTER_DEFS[id];
  P(`| ${def.name} | ${def.strength} | ${pct(st.declared, st.seatGames)} | ${pct(st.won, st.declared)} | ${pct(st.overbid, st.declared)} | ${pct(st.kinds.grand ?? 0, st.declared, 0)} | ${pct(st.kinds.null ?? 0, st.declared, 0)} | ${pct(st.hand, st.declared, 0)} | ${f1(st.bidSum / Math.max(1, st.declared))} | ${f1(st.maxReached / Math.max(1, st.seatGames))} | ${f1(st.list / Math.max(1, st.seatGames))} | ${PERSONAS[id].note} |`);
}
P();
const style = (id: string) => personaStats.get(id)!;
const med = style(MEDIUM);
const cmp = (id: string, what: string, get: (s: Stat) => number) =>
  `${CHARACTER_DEFS[id as keyof typeof CHARACTER_DEFS].name}: ${what} ${(100 * get(style(id))).toFixed(1)} % vs medium ${(100 * get(med)).toFixed(1)} %`;
P("Styles visible in the numbers:");
P();
P(`- ${cmp("zocker", "declares", (s) => s.declared / s.seatGames)}; overbid ${pct(style("zocker").overbid, style("zocker").declared)} vs ${pct(med.overbid, med.declared)}.`);
P(`- ${cmp("maurer", "declares", (s) => s.declared / s.seatGames)}.`);
P(`- ${cmp("grandspieler", "Grand share of declared games", (s) => (s.kinds.grand ?? 0) / Math.max(1, s.declared))}.`);
P(`- ${cmp("nullfuchs", "Null share of declared games", (s) => (s.kinds.null ?? 0) / Math.max(1, s.declared))}.`);
const byStrength = [1, 2, 3, 4].map((k) => {
  const ids = CHARACTERS.filter((id) => CHARACTER_DEFS[id].strength === k);
  let list = 0;
  let n = 0;
  for (const id of ids) {
    list += style(id).list;
    n += style(id).seatGames;
  }
  return `strength ${k}: ${f1(list / Math.max(1, n))}`;
});
P(`- Average list points per game by strength (against two medium figures): ${byStrength.join(", ")}.`);
P();
P("## House rules");
P();
const rs = (recs: GameRec[], label: string) => {
  const ram = recs.filter((r) => r.type === "ramsch");
  const losers = new Map<string, number>();
  const minus = new Map<string, number>();
  let durch = 0;
  let jungfrau = 0;
  for (const r of ram) {
    for (const s of r.ramschLosers ?? []) losers.set(agentName(r.agents[s]), (losers.get(agentName(r.agents[s])) ?? 0) + 1);
    for (let s = 0; s < 3; s++) minus.set(agentName(r.agents[s]), (minus.get(agentName(r.agents[s])) ?? 0) + r.list[s]);
    if (r.ramschDurchmarsch !== undefined && r.ramschDurchmarsch !== null) durch++;
    if ((r.ramschJungfrau ?? 0) > 0) jungfrau++;
  }
  P(
    `- ${label}: ${ram.length} Ramsch games (all three pass on purpose), seats rotating. Lost: ${[...losers.entries()].map(([a, k]) => `${a} ${k}`).join(", ")}; ` +
      `list per game: ${[...minus.entries()].map(([a, k]) => `${a} ${f1(k / ram.length)}`).join(", ")}; with Jungfrau ${jungfrau}, Durchmarsch ${durch}.`,
  );
};
rs(ramsch, "Ramsch (die Wirtin Lore, Frau Gerda, der Erwin)");
rs(schieb, "Schieberamsch (same table)");
{
  const st = statsBy(kontra);
  const said = kontra.filter((r) => (r.kontra ?? 0) > 0);
  const won = said.filter((r) => !r.won).length;
  P(`- Kontra und Re (die Wirtin Lore, 's Schlitzohr Fritz, Maurer-Karle): ${kontra.length} deals, Kontra in ${said.length} games (${pct(said.length, kontra.filter((r) => r.type === "declared").length)} of the declared games), of them the defenders won ${pct(won, said.length)}; Re ${kontra.filter((r) => r.kontra === 2).length} times.`);
  for (const [a, s] of st) P(`  - ${agentName(a)}: declared ${s.declared}, won ${pct(s.won, s.declared)}, list ${f1(s.list / s.seatGames)} per game.`);
}
P();
P("## Decision times");
P();
P(`Measured in node for every AI decision of all suites on this desktop (Ryzen 9 7900X3D, 4 processes in parallel under nice while the PC was in normal use). Chromium runs the solver at the same speed as node here (bundled solver benchmark: 28–30 vs 30–32 M nodes/s). An ordinary laptop core is taken as ${LAPTOP}× slower.`);
P();
P("| decision | count | median | p95 | p99 | max | p95 laptop est. |");
P("|---|---:|---:|---:|---:|---:|---:|");
const order = ["bidding", "skat", "discard", "declare", "schieben", "re", "play (10–9 cards)", "play (8–7 cards)", "play (≤ 6 cards)"];
for (const k of order) {
  const t = timing.get(k);
  if (!t) continue;
  P(`| ${k} | ${t.n} | ${q(t.all, 0.5).toFixed(0)} ms | ${q(t.all, 0.95).toFixed(0)} ms | ${q(t.all, 0.99).toFixed(0)} ms | ${maxOf(t.all).toFixed(0)} ms | ${(q(t.all, 0.95) * LAPTOP).toFixed(0)} ms |`);
}
P(`| **all** | ${allTimes.length} | ${q(allTimes, 0.5).toFixed(0)} ms | ${p95.toFixed(0)} ms | ${q(allTimes, 0.99).toFixed(0)} ms | ${maxOf(allTimes).toFixed(0)} ms | ${(p95 * LAPTOP).toFixed(0)} ms |`);
P();
if (sharpTimes.length) {
  const st = statsBy(sharp);
  const decl = [...st.values()].reduce((a, x) => a + x.declared, 0);
  const won = [...st.values()].reduce((a, x) => a + x.won, 0);
  P(`Strongest setting (der alte Gottlob, Müllerin Hedwig, Brenner Ernst at depth 1.4 = "Scharf", ${sharp.length} games, not part of the totals above): p50 ${q(sharpTimes, 0.5).toFixed(0)} ms, p95 ${q(sharpTimes, 0.95).toFixed(0)} ms (laptop ≈ ${(q(sharpTimes, 0.95) * LAPTOP).toFixed(0)} ms), p99 ${q(sharpTimes, 0.99).toFixed(0)} ms, max ${maxOf(sharpTimes).toFixed(0)} ms; declarers won ${pct(won, decl)} of ${decl}.`);
  P();
}
if (browser) {
  P(`Chromium (headless, \`--disable-gpu\`, the real Web Worker from client.ts, ${browser.n} recorded decisions replayed): p95 ${browser.p95.toFixed(0)} ms, p99 ${browser.p99.toFixed(0)} ms, max ${browser.max.toFixed(0)} ms; Chromium/node time ratio ${browser.ratio.toFixed(2)}.`);
  P();
}
P(`Budgets are samples × nodes, never the clock: the same seed always gives the same decision. Persona parameters: src/skat/ai/persona.ts.`);
P();
writeFileSync(out, L.join("\n"));
console.error(`wrote ${out}`);

// ─── Game logs ────────────────────────────────────────────────────────────────────────────────────────────

const G: string[] = [];
G.push("# Fifty games for review (contract §5.4)", "");
G.push(
  "Complete games of the computer opponents at mixed tables (weak, medium and strong figures), standard rules (ISkO). " +
    "Cards: ♣ Kreuz, ♠ Pik, ♥ Herz, ♦ Karo; B Bube, D Dame, K König, A Ass. VH/MH/HH = Vorhand, Mittelhand, " +
    "Hinterhand. Each trick lists the cards in playing order, then who takes it and the Augen. The note in italics is " +
    "the AI's own reason for the declaration. Please mark any move a club player would call nonsense (Unsinn).",
  "",
);
logs.forEach((r, i) => {
  G.push(gameToMarkdown(`Spiel ${i + 1}`, r.seed, r.dealer as 0 | 1 | 2, r.agents, r.actions as never, r.notes));
});
writeFileSync(gamesOut, G.join("\n"));
console.error(`wrote ${gamesOut}`);
