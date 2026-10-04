// Choosing a Stammtisch problem by seed (pure) and loading the generated pack (public/puzzles/skat-problems.json, AI
// workstream) with the hand-checked fixture as fallback.
import { Rng } from "../../core/rng.ts";
import type { SkatProblemData, SkatProblemPack } from "./format.ts";
import { FIXTURE_PROBLEMS } from "./fixture.ts";

/** A problem chosen deterministically from the seed. `type` narrows the choice (dev, events). */
export function pickProblem(problems: readonly SkatProblemData[], seed: number, type?: SkatProblemData["type"]): SkatProblemData {
  const pool = type ? problems.filter((p) => p.type === type) : problems;
  const list = pool.length ? pool : problems;
  return list[new Rng(seed ^ 0x51a7).int(0, list.length - 1)];
}

/** Keep only problems whose shape the station understands (a broken entry must never break the station). */
export function validProblems(pack: Partial<SkatProblemPack> | null | undefined): SkatProblemData[] {
  const list = Array.isArray(pack?.problems) ? pack!.problems : [];
  return list.filter((p) => {
    if (!p || typeof p !== "object") return false;
    if (p.type === "endgame") return Array.isArray(p.hands) && p.hands.length === 3 && Number.isInteger(p.solution) && !!p.declaration;
    if (p.type === "discard") return Array.isArray(p.cards) && p.cards.length === 12 && Array.isArray(p.solution) && !!p.declaration;
    if (p.type === "bid") return Array.isArray(p.cards) && p.cards.length === 10 && Array.isArray(p.range);
    return false;
  });
}

export function fallbackProblems(): SkatProblemData[] {
  return FIXTURE_PROBLEMS;
}
