// Headless Skat games between agents (personas, the rule-based baseline) for the league, the game logs and the
// timing measurements. Every agent only gets `viewFor(state, seat)` — the same SeatView the table hands to the AI.
import { hashString } from "../../src/core/rng.ts";
import type { CharacterId } from "../../src/game/ids.ts";
import { applyAction, currentSeat, newGame, viewFor } from "../../src/skat/rules/index.ts";
import type { Action, GameState, RuleOptions, Seat, SeatView } from "../../src/skat/rules/index.ts";
import { baselineDecide } from "../../src/skat/ai/baseline.ts";
import { decideWithNote } from "../../src/skat/ai/decide.ts";

export interface Agent {
  id: string;
  decide(v: SeatView, seed: number): { action: Action; note?: string };
}

export function personaAgent(character: CharacterId, depth = 1): Agent {
  return {
    id: depth === 1 ? character : `${character}@${depth}`,
    decide: (view, seed) => decideWithNote({ view, character, depth, seed, tournament: false }),
  };
}

export const baselineAgent: Agent = { id: "baseline", decide: (v) => ({ action: baselineDecide(v) }) };

export interface LoggedAction {
  seat: Seat;
  action: Action;
  ms: number;
  note?: string;
  /** Phase in which the decision was taken. */
  phase: string;
  /** Number of cards in the seat's hand at the decision (play phase), for timing breakdowns. */
  handSize: number;
}

export interface GameRun {
  seed: number;
  dealer: Seat;
  state: GameState;
  log: LoggedAction[];
}

/** Play one game to the end. `seed` is the deal seed; decision seeds derive from it and the action index. */
export function playGame(seed: number, dealer: Seat, agents: readonly [Agent, Agent, Agent], rules: Partial<RuleOptions> = {}): GameRun {
  let s = newGame({ seed, dealer, rules });
  const log: LoggedAction[] = [];
  let guard = 0;
  while (s.phase !== "done") {
    if (++guard > 400) throw new Error(`game ${seed} does not end`);
    const seat = currentSeat(s)!;
    const view = viewFor(s, seat);
    const t0 = performance.now();
    const dseed = (hashString(`${seed}/${s.history.length}`) ^ (seat * 0x9e3779b1)) >>> 0;
    const { action, note } = agents[seat].decide(view, dseed);
    const ms = performance.now() - t0;
    log.push({ seat, action, ms, note, phase: s.phase, handSize: view.handSizes[seat] });
    s = applyAction(s, action);
  }
  return { seed, dealer, state: s, log };
}
