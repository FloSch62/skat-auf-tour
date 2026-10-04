// Checks the tour's stub Skat model (src/tour/sim.ts) against the real computer opponents: whole rounds through the
// real round module (src/skat/rules/round.ts) and AI (src/skat/ai), with a persona standing in for the player (seat 0,
// always depth 1) and the opponents at the difficulty's depth. Inn tables are drawn from generated stage maps, the
// final is nine games against the region's favourites. The same configurations are then drawn from the stub.
//   nice -n 15 node --experimental-strip-types tools/balance/tour-skat-check.ts [--inn 90] [--final 40] [--stand-in bahner]
//   … --load   re-evaluates the stub against the saved real rounds (tools/shots/tour/skat-check.json) without the AI
// At most 4 worker processes. Prints a markdown table (docs/balance-tour.md quotes it).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { PlacePack, RoundConfig, RoundResult, TablePerks } from "../../src/game/types.ts";
import type { CharacterId, DifficultyId, RegionId } from "../../src/game/ids.ts";
import { DIFFICULTIES, FAVOURITES_BY_REGION } from "../../src/game/ids.ts";
import { Rng, hashString } from "../../src/core/rng.ts";
import { DIFFICULTY_DEFS } from "../../src/data/difficulty.ts";
import { generateStage } from "../../src/tour/map.ts";
import { DEFAULT_STUB, stubSkatModel } from "../../src/tour/sim.ts";
import { MEASURED } from "../../src/tour/skatstats.ts";

interface Job {
  id: string;
  difficulty: DifficultyId;
  kind: "inn" | "final";
  opponents: [CharacterId, CharacterId];
  depth: number;
  games: number;
  seed: number;
  standIn: CharacterId;
}

const NO_PERKS: TablePerks = {
  showTrumps: false, showPoints: false, redeals: 0, skatPeeks: 0, takeBacks: 0, forehandFirst: false,
  listBonus: { grand: 0, null: 0, hand: 0, schneider: 0, defence: 0 },
};

function configOf(j: Job): RoundConfig {
  return {
    seed: j.seed, opponents: j.opponents, houseRule: "standard", games: j.games, tournament: j.kind === "final",
    title: j.id, room: "village", marks: 99, perks: NO_PERKS, depth: j.depth,
  };
}

// ─── worker: play rounds with the real AI ─────────────────────────────────────────────────────────────────

async function worker(jobs: Job[]) {
  const { startRound, startGame, finishGame, isRoundOver, roundResult } = await import("../../src/skat/rules/round.ts");
  const { applyAction, currentSeat, viewFor } = await import("../../src/skat/rules/index.ts");
  const { decideWithNote } = await import("../../src/skat/ai/decide.ts");
  for (const j of jobs) {
    const cfg = configOf(j);
    let p = startRound(cfg);
    while (!isRoundOver(p)) {
      let s = startGame(p);
      let guard = 0;
      while (s.phase !== "done") {
        if (++guard > 400) throw new Error(`round ${j.id} does not end`);
        const seat = currentSeat(s)!;
        const view = viewFor(s, seat);
        const character = seat === 0 ? j.standIn : j.opponents[seat - 1];
        const seed = (hashString(`${j.seed}/${p.games.length}/${s.history.length}`) ^ (seat * 0x9e3779b1)) >>> 0;
        const { action } = decideWithNote({ view, character, depth: seat === 0 ? 1 : j.depth, seed, tournament: cfg.tournament });
        s = applyAction(s, action);
      }
      p = finishGame(p, s).progress;
    }
    const r: RoundResult = roundResult(p);
    process.stdout.write(JSON.stringify({ id: j.id, place: r.place, list: r.list, games: r.games.length }) + "\n");
  }
}

// ─── parent ───────────────────────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args[0] === "--worker") {
  await worker(JSON.parse(args[1]) as Job[]);
  process.exit(0);
}
const opt = (k: string, d: string) => {
  const i = args.indexOf(`--${k}`);
  return i < 0 ? d : args[i + 1];
};
const INN = Number(opt("inn", "90"));
const FINAL = Number(opt("final", "40"));
const STAND_IN = opt("stand-in", "bahner") as CharacterId;
const pack = JSON.parse(readFileSync("public/packs/enztal/pack.json", "utf8")) as PlacePack;

const jobs: Job[] = [];
// --depth-cozy / --depth-sporty / --depth-sharp try other depths than src/data/difficulty.ts.
for (const difficulty of DIFFICULTIES) {
  const depth = Number(opt(`depth-${difficulty}`, String(DIFFICULTY_DEFS[difficulty].depth)));
  // inn tables as the generator seats them
  const tables: [CharacterId, CharacterId][] = [];
  for (let seed = 1; tables.length < INN && INN > 0; seed++) {
    const map = generateStage({ pack, region: "enztal", stage: seed % 3, seed: seed * 977, difficulty });
    for (const n of map.nodes) if (n.inn && !n.inn.opponents.includes(STAND_IN)) tables.push(n.inn.opponents);
  }
  tables.slice(0, INN).forEach((opponents, i) =>
    jobs.push({ id: `${difficulty}-inn-${i}`, difficulty, kind: "inn", opponents, depth, games: 3, seed: hashString(`inn/${difficulty}/${i}`), standIn: STAND_IN }));
  const regions = (Object.keys(FAVOURITES_BY_REGION) as RegionId[]).filter((r) => !FAVOURITES_BY_REGION[r].includes(STAND_IN as never));
  for (let i = 0; i < FINAL; i++) {
    const region = regions[i % regions.length];
    jobs.push({ id: `${difficulty}-final-${i}`, difficulty, kind: "final", opponents: FAVOURITES_BY_REGION[region], depth, games: 9, seed: hashString(`final/${difficulty}/${i}`), standIn: STAND_IN });
  }
}

const t0 = Date.now();
const SAVE = opt("save", "tools/shots/tour/skat-check.json");
const LOAD = args.includes("--load");
const PROCS = 4;
const slices: Job[][] = Array.from({ length: PROCS }, () => []);
jobs.forEach((j, i) => slices[i % PROCS].push(j));
const self = fileURLToPath(import.meta.url);
const results = new Map<string, { place: number; list: number[]; games: number }>();
if (LOAD) for (const r of JSON.parse(readFileSync(SAVE, "utf8"))) results.set(r.id, r);
else await Promise.all(slices.map((slice) => new Promise<void>((resolve, reject) => {
  const child = spawn(process.execPath, ["--experimental-strip-types", "--no-warnings", self, "--worker", JSON.stringify(slice)], { stdio: ["ignore", "pipe", "inherit"] });
  let buf = "";
  child.stdout.on("data", (d: Buffer) => {
    buf += d.toString();
    let k: number;
    while ((k = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, k);
      buf = buf.slice(k + 1);
      if (line.trim()) {
        const r = JSON.parse(line);
        results.set(r.id, r);
        if (results.size % 20 === 0) process.stderr.write(`${results.size}/${jobs.length} rounds, ${((Date.now() - t0) / 60000).toFixed(1)} min\n`);
      }
    }
  });
  child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`worker exit ${code}`))));
})));

if (!LOAD) {
  mkdirSync(dirname(SAVE), { recursive: true });
  writeFileSync(SAVE, JSON.stringify([...results.values()]));
}

const pct = (x: number) => `${(100 * x).toFixed(0)} %`;

// --grid: which stub coupling fits the real rounds best (weighted squared error of 1st and 3rd place shares).
if (args.includes("--grid")) {
  const cells = DIFFICULTIES.flatMap((d) => (["inn", "final"] as const).map((k) => ({ d, k, js: jobs.filter((j) => j.difficulty === d && j.kind === k) })));
  const real = cells.map((c) => {
    const rs = c.js.map((j) => results.get(j.id)!).filter(Boolean);
    return { n: rs.length, p1: rs.filter((r) => r.place === 1).length / rs.length, p3: rs.filter((r) => r.place === 3).length / rs.length };
  });
  const out: { e: number; b: number; w: number; r: number; cells: string }[] = [];
  for (const b of [0.002, 0.004, 0.008, 0.012]) for (const w of [0, 0.03, 0.06, 0.1, 0.15]) for (const r of [0, 4, 8, 12]) {
    const m = stubSkatModel({ player: MEASURED[STAND_IN], beta: b, depthWin: w, depthRating: r });
    let e = 0;
    const shown: string[] = [];
    cells.forEach((c, i) => {
      let s1 = 0, s3 = 0, n = 0;
      const R = Math.ceil(2000 / c.js.length);
      for (const j of c.js) {
        const rng = new Rng(j.seed);
        for (let k = 0; k < R; k++) {
          const res = m.playRound(configOf(j), rng);
          if (res.place === 1) s1++;
          if (res.place === 3) s3++;
          n++;
        }
      }
      e += real[i].n * ((s1 / n - real[i].p1) ** 2 + (s3 / n - real[i].p3) ** 2);
      shown.push(`${pct(s1 / n)}/${pct(s3 / n)}`);
    });
    out.push({ e, b, w, r, cells: shown.join(" · ") });
  }
  out.sort((a, b) => a.e - b.e);
  console.log(`real: ${real.map((x) => `${pct(x.p1)}/${pct(x.p3)}`).join(" · ")}`);
  for (const o of out.slice(0, 8)) console.log(`beta ${o.b} depthWin ${o.w} depthRating ${o.r}: err ${o.e.toFixed(2)} | ${o.cells}`);
  process.exit(0);
}

// The stub on the same configurations, the player played by the stand-in's measured profile.
const stub = stubSkatModel({ player: MEASURED[STAND_IN] });
const STUB_N = 6000;
const lines: string[] = [];
lines.push(`Real AI vs stub: ${MEASURED[STAND_IN] ? STAND_IN : "?"} (depth 1) stands in for the player; ${INN} inn rounds and ${FINAL} finals per difficulty (${((Date.now() - t0) / 60000).toFixed(0)} min, 4 processes).`);
lines.push("");
lines.push("| | real 1st / 3rd | stub 1st / 3rd | real list/game (player, opp.) | stub list/game (player, opp.) |");
lines.push("|---|---|---|---|---|");
for (const difficulty of DIFFICULTIES) {
  for (const kind of ["inn", "final"] as const) {
    const js = jobs.filter((j) => j.difficulty === difficulty && j.kind === kind);
    const rs = js.map((j) => results.get(j.id)!).filter(Boolean);
    const first = rs.filter((r) => r.place === 1).length / rs.length;
    const third = rs.filter((r) => r.place === 3).length / rs.length;
    const gamesN = rs.reduce((a, r) => a + r.games, 0);
    const lp = rs.reduce((a, r) => a + r.list[0], 0) / gamesN;
    const lo = rs.reduce((a, r) => a + r.list[1] + r.list[2], 0) / gamesN / 2;
    let s1 = 0, s3 = 0, sp = 0, so = 0, sg = 0;
    const R = Math.ceil(STUB_N / js.length);
    for (const j of js) {
      const rng = new Rng(j.seed);
      for (let k = 0; k < R; k++) {
        const r = stub.playRound(configOf(j), rng);
        if (r.place === 1) s1++;
        if (r.place === 3) s3++;
        sp += r.list[0];
        so += (r.list[1] + r.list[2]) / 2;
        sg += r.games.length;
      }
    }
    const n = js.length * R;
    lines.push(`| ${DIFFICULTY_DEFS[difficulty].name} ${kind === "inn" ? "Wirtshaus" : "Finale"} | ${pct(first)} / ${pct(third)} | ${pct(s1 / n)} / ${pct(s3 / n)} | ${lp.toFixed(1)}, ${lo.toFixed(1)} | ${(sp / sg).toFixed(1)}, ${(so / sg).toFixed(1)} |`);
  }
}
lines.push("");
lines.push(`Stub parameters: ${JSON.stringify({ beta: DEFAULT_STUB.beta, depthWin: DEFAULT_STUB.depthWin, depthRating: DEFAULT_STUB.depthRating })}`);
console.log(lines.join("\n"));
