// Child process of tools/balance/skat-league.ts: plays a slice of seeded games and prints one JSON line per game.
//   node --experimental-strip-types tools/balance/skat-league-worker.ts '<job json>'
// Job: { suite, agents: [[a, b, c], …] (one seat set per game, cycled), seeds: [first, count], rules?, logs? }
import type { CharacterId } from "../../src/game/ids.ts";
import type { RuleOptions } from "../../src/skat/rules/index.ts";
import { baselineAgent, personaAgent, playGame } from "./skat-sim.ts";
import type { Agent } from "./skat-sim.ts";

export interface LeagueJob {
  suite: string;
  /** Seat sets; game i uses agents[i % agents.length]. "baseline" or a character id, optionally "@depth". */
  agents: [string, string, string][];
  /** Deal seeds: first, count. Game i has seed first + i and dealer i % 3. */
  seeds: [number, number];
  /** Repeat every deal with each seat set (duplicate format) instead of cycling. */
  duplicate?: boolean;
  rules?: Partial<RuleOptions>;
  /** Include the full action list (game logs). */
  logs?: boolean;
}

export interface GameRec {
  suite: string;
  seed: number;
  dealer: number;
  agents: [string, string, string];
  type: "passed" | "declared" | "ramsch";
  declarer: number | null;
  kind?: string;
  hand?: boolean;
  ouvert?: boolean;
  schneiderAnnounced?: boolean;
  bid: number;
  won?: boolean;
  overbid?: boolean;
  schneider?: boolean;
  declarerPoints?: number;
  kontra?: number;
  list: [number, number, number];
  /** Highest value each seat said or held. */
  reached: [number, number, number];
  /** Decision times: [phase, ms, seat, cards in hand]. */
  times: [string, number, number, number][];
  /** Declarer's own note on the declaration (estimated chance). */
  note?: string;
  /** Full action log (only with job.logs). */
  actions?: unknown[];
  notes?: (string | undefined)[];
  ramschLosers?: number[];
  ramschJungfrau?: number;
  ramschDurchmarsch?: number | null;
}

const cache = new Map<string, Agent>();
function agentFor(spec: string): Agent {
  let a = cache.get(spec);
  if (!a) {
    if (spec.startsWith("allpass:")) {
      // Passes in the bidding (to force Ramsch deals), plays like the figure afterwards.
      const inner = agentFor(spec.slice(8));
      a = { id: spec, decide: (v, seed) => (v.phase === "bidding" ? { action: { type: "pass", seat: v.seat } } : inner.decide(v, seed)) };
    } else if (spec === "baseline") a = baselineAgent;
    else {
      const [id, d] = spec.split("@");
      a = personaAgent(id as CharacterId, d ? Number(d) : 1);
    }
    cache.set(spec, a);
  }
  return a;
}

export function runJob(job: LeagueJob, emit: (r: GameRec) => void): void {
  const [first, count] = job.seeds;
  for (let i = 0; i < count; i++) {
    const seed = first + i;
    const dealer = (seed % 3) as 0 | 1 | 2;
    const sets = job.duplicate ? job.agents : [job.agents[i % job.agents.length]];
    for (const set of sets) {
      const agents = set.map(agentFor) as [Agent, Agent, Agent];
      const g = playGame(seed, dealer, agents, job.rules ?? {});
      const r = g.state.result!;
      const reached: [number, number, number] = [0, 0, 0];
      let value = 0;
      for (const a of g.state.history) {
        if (a.type === "bid") {
          value = a.value;
          reached[a.seat] = Math.max(reached[a.seat], a.value);
        } else if (a.type === "hold") reached[a.seat] = Math.max(reached[a.seat], value || 18);
      }
      const d = r.declaration;
      const declNote = g.log.filter((l) => l.seat === r.declarer && (l.phase === "discard" || l.phase === "skat")).map((l) => l.note).filter(Boolean).join("; ");
      const rec: GameRec = {
        suite: job.suite,
        seed,
        dealer,
        agents: set,
        type: r.type,
        declarer: r.declarer,
        kind: d?.kind,
        hand: d?.hand,
        ouvert: d?.ouvert,
        schneiderAnnounced: d?.schneiderAnnounced,
        bid: r.bid,
        won: r.type === "declared" ? r.won : undefined,
        overbid: r.type === "declared" ? r.overbid : undefined,
        schneider: r.type === "declared" ? r.schneider : undefined,
        declarerPoints: r.type === "declared" ? r.declarerPoints : undefined,
        kontra: r.kontra,
        list: r.list,
        reached,
        times: g.log.map((l) => [l.phase, Math.round(l.ms * 10) / 10, l.seat, l.handSize]),
        note: declNote || undefined,
        ramschLosers: r.ramsch?.losers,
        ramschJungfrau: r.ramsch?.jungfrau.length,
        ramschDurchmarsch: r.ramsch?.durchmarsch,
      };
      if (job.logs) {
        rec.actions = g.state.history;
        rec.notes = g.log.map((l) => l.note);
      }
      emit(rec);
    }
  }
}

if (process.argv[1] && process.argv[1].endsWith("skat-league-worker.ts")) {
  const job = JSON.parse(process.argv[2]) as LeagueJob;
  runJob(job, (r) => process.stdout.write(JSON.stringify(r) + "\n"));
}
