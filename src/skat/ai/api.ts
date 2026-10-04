// The seam between the table (src/skat/table) and the computer opponents (src/skat/ai). The table only ever calls
// `getAiPlayer().decide(...)` with a SeatView — never with hidden cards (contract §0.3). The AI workstream registers
// the real player (PIMC in a Web Worker) with `setAiPlayer`; until then a simple stand-in plays legal moves.
import type { Action, SeatView } from "../rules/index.ts";
import type { CharacterId } from "../../game/ids.ts";
import { Rng } from "../../core/rng.ts";

export interface AiRequest {
  view: SeatView;
  character: CharacterId;
  /** Thinking depth multiplier from the difficulty (1 = as the persona says). */
  depth: number;
  /** Deterministic seed for this decision (deal seed ⊕ action index), so a replay plays the same. */
  seed: number;
  tournament: boolean;
}

export interface AiPlayer {
  decide(req: AiRequest): Promise<Action>;
  /** Optional: stop background work (worker) when the table closes. */
  dispose?(): void;
}

/** Stand-in: passes at 18 unless the hand is strong-ish, plays the first legal card. Only for early UI work. */
export const standInAi: AiPlayer = {
  async decide(req) {
    const legal = req.view.legal;
    if (!legal.length) throw new Error("AI asked without a legal action");
    const rng = new Rng(req.seed);
    const pass = legal.find((a) => a.type === "pass");
    if (pass && rng.chance(0.7)) return pass;
    const play = legal.filter((a) => a.type === "play");
    if (play.length) return rng.pick(play);
    const nonPerk = legal.filter((a) => a.type !== "peek" && a.type !== "takeBack" && a.type !== "kontra");
    return nonPerk[0] ?? legal[0];
  },
};

let current: AiPlayer = standInAi;

export function setAiPlayer(p: AiPlayer) {
  current = p;
}

export function getAiPlayer(): AiPlayer {
  return current;
}
