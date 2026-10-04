// A small exact solver for Stammtisch endgames (contract §4.7). Pure, no DOM: used by the station scene to explain
// why a wrong card fails ("Mit der Herz-Zehn kommst du nur auf 58 Augen") and by the tests to check the bundled
// fixture problems. Endgames have four or five tricks left, so a plain alpha-beta search over the fast `Position` is
// instant; the real problem generator (AI workstream, open-card solver) does the heavy lifting for the pack.
import { has, maskOf, popcount } from "../rules/index.ts";
import type { Card, CardMask } from "../rules/index.ts";
import { Position, playRules } from "../rules/index.ts";
import type { EndgameProblem } from "./format.ts";

/** What the search measures: the declarer's card points (suit, Grand) or the declarer's tricks (Schwarz, Null). */
type Measure = "points" | "tricks";

function measureOf(p: EndgameProblem): Measure {
  if (p.declaration.kind === "null") return "tricks";
  return p.goal === "schwarz" ? "tricks" : "points";
}

/** The declarer wants a high score (points, Schwarz) — in Null he wants as few tricks as possible. */
function declarerMaximises(p: EndgameProblem): boolean {
  return p.declaration.kind !== "null";
}

/** The fast position of the problem (seat 0 to play). */
export function problemPosition(p: EndgameProblem): Position {
  const hands = p.hands.map((h) => maskOf(h));
  return new Position(playRules(p.declaration.kind), hands, p.leader, p.declarer, { trick: p.trick });
}

/** Number of tricks still to be completed (including the current one). */
export function tricksLeft(p: EndgameProblem): number {
  return Math.ceil((p.trick.length + p.hands.reduce((n, h) => n + h.length, 0)) / 3);
}

function score(pos: Position, decl: number, m: Measure): number {
  return m === "points" ? pos.points[decl] : pos.tricks[decl];
}

/** Optimal score (declarer points or tricks from here on) with best play from every seat. */
function search(pos: Position, decl: number, m: Measure, declMax: boolean, alpha: number, beta: number): number {
  if (pos.isOver()) return score(pos, decl, m);
  const maximise = (pos.turn === decl) === declMax;
  let moves: CardMask = pos.legal();
  let best = maximise ? -1 : 1e9;
  while (moves !== 0) {
    const low = moves & -moves;
    moves ^= low;
    const c = 31 - Math.clz32(low);
    pos.play(c);
    const v = search(pos, decl, m, declMax, alpha, beta);
    pos.undo();
    if (maximise) {
      if (v > best) best = v;
      if (best > alpha) alpha = best;
    } else {
      if (v < best) best = v;
      if (best < beta) beta = best;
    }
    if (alpha >= beta) break;
  }
  return best;
}

export interface CardOutcome {
  card: Card;
  /** Declarer party's final card points (incl. what was won before and the skat) with best play after this card. */
  declarerPoints: number;
  /** Tricks the declarer takes from here on with best play after this card. */
  declarerTricks: number;
  /** The player's goal is reached with this card against best defence. */
  achieves: boolean;
}

/** Does a final outcome meet the problem's goal? */
export function goalMet(p: EndgameProblem, declarerPoints: number, declarerTricks: number): boolean {
  switch (p.goal) {
    case "win":
      return declarerPoints >= 61;
    case "schneider":
      return declarerPoints >= 90;
    case "schwarz":
      return declarerTricks === tricksLeft(p);
    case "noTrick":
      return declarerTricks === 0;
    case "defend":
      return p.declaration.kind === "null" ? declarerTricks > 0 : declarerPoints <= 60;
  }
}

/** Outcome of every card the player may play now (seat 0 to move). */
export function evaluateEndgame(p: EndgameProblem): CardOutcome[] {
  const pos = problemPosition(p);
  if (pos.turn !== 0) throw new Error(`problem ${p.id}: seat ${pos.turn} to play, not the player`);
  const decl = p.declarer;
  const m = measureOf(p);
  const declMax = declarerMaximises(p);
  const out: CardOutcome[] = [];
  let moves = pos.legal();
  while (moves !== 0) {
    const low = moves & -moves;
    moves ^= low;
    const c = 31 - Math.clz32(low);
    pos.play(c);
    const v = search(pos, decl, m, declMax, -1, 1e9);
    // The goal is decided by the searched measure; the other one is reported for the explanation only.
    const pts = p.points[0] + (m === "points" ? v : search(pos, decl, "points", true, -1, 1e9));
    const tricks = m === "tricks" ? v : search(pos, decl, "tricks", true, -1, 1e9);
    pos.undo();
    out.push({ card: c, declarerPoints: pts, declarerTricks: tricks, achieves: goalMet(p, pts, tricks) });
  }
  return out;
}

/** Cards that reach the goal (a well-made problem has exactly one: `solution`). */
export function winningCards(p: EndgameProblem): Card[] {
  return evaluateEndgame(p)
    .filter((o) => o.achieves)
    .map((o) => o.card);
}

/** Basic consistency: 32 distinct cards at most, seat 0 to move, card points add up to at most 120. */
export function checkEndgame(p: EndgameProblem): string | null {
  const all = [...p.hands[0], ...p.hands[1], ...p.hands[2], ...p.trick];
  const m = maskOf(all);
  if (popcount(m) !== all.length) return "duplicate cards";
  if ((p.leader + p.trick.length) % 3 !== 0) return "not the player's turn";
  if (!has(m, p.solution) || !p.hands[0].includes(p.solution)) return "solution not in the player's hand";
  return null;
}
