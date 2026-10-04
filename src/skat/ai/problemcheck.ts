// Verification of Stammtisch problems (contract §4.7) with the open-card solver: the generator
// (tools/skat-problems/generate.ts) builds problems with these functions, and the tests / tools/skat-problems/
// validate.ts check the bundled pack again with exactly the same code. Pure and deterministic (worlds are seeded from
// the problem id).
import { Rng, hashString } from "../../core/rng.ts";
import { ALL_CARDS, JACKS, cardsOf, maskOf, popcount } from "../rules/cards.ts";
import type { Card, CardMask } from "../rules/cards.ts";
import type { HandPosition } from "../rules/deal.ts";
import { BID_VALUES } from "../rules/value.ts";
import type { DeclKind, Declaration } from "../rules/value.ts";
import type { BidProblem, DiscardProblem, EndgameProblem } from "../problems/format.ts";
import { PointSolver, TrickSolver, legalOf } from "./dds.ts";
import { chanceAt, valueHand } from "./bid.ts";
import { evaluatePairs } from "./discard.ts";
import type { DefenderWorlds, PairResult } from "./discard.ts";
import { trumpMask } from "./handeval.ts";
import { BASE_THRESHOLD, personaFor } from "./persona.ts";

// ─── Endgames ─────────────────────────────────────────────────────────────────────────────────────────────

export interface EndgameOutcome {
  card: Card;
  /** Declarer party's final Augen (incl. what was won before and the skat), best play after this card. */
  declarerPoints: number;
  /** Does the declarer take every remaining trick (Schwarz) / no trick (Null) after this card? */
  allTricks: boolean | null;
  noTrick: boolean | null;
  achieves: boolean;
}

let ps: PointSolver | null = null;
let ts: TrickSolver | null = null;

/** Outcome of every legal card of seat 0 (the player). */
export function endgameOutcomes(p: Pick<EndgameProblem, "declaration" | "declarer" | "hands" | "trick" | "leader" | "points" | "goal">): EndgameOutcome[] {
  ps ??= new PointSolver();
  ts ??= new TrickSolver();
  const kind = p.declaration.kind;
  const hands = p.hands.map((h) => maskOf(h));
  const pos = { kind, hands, leader: p.leader, trick: p.trick, solo: p.declarer };
  const legal = cardsOf(legalOf(pos));
  const out: EndgameOutcome[] = [];
  for (const card of legal) {
    let declarerPoints = p.points[0];
    let allTricks: boolean | null = null;
    let noTrick: boolean | null = null;
    if (kind !== "null") {
      ps.setHorizon(Infinity);
      ps.load(pos, true);
      declarerPoints += ps.exactAfter(card) ?? 0;
    }
    if (kind === "null") {
      ts.load(pos, "none");
      noTrick = ts.testAfter(card) ?? false;
    }
    if (p.goal === "schwarz") {
      ts.load(pos, "all");
      allTricks = ts.testAfter(card) ?? false;
    }
    let achieves: boolean;
    switch (p.goal) {
      case "win":
        achieves = declarerPoints >= 61;
        break;
      case "schneider":
        achieves = declarerPoints >= 90;
        break;
      case "schwarz":
        achieves = !!allTricks;
        break;
      case "noTrick":
        achieves = !!noTrick;
        break;
      case "defend":
        achieves = kind === "null" ? !noTrick : declarerPoints <= 60;
        break;
    }
    out.push({ card, declarerPoints, allTricks, noTrick, achieves });
  }
  return out;
}

/** null when the endgame is sound: seat 0 to move, distinct cards, exactly one card (the solution) reaches the goal. */
export function checkEndgameProblem(p: EndgameProblem): string | null {
  const all = [...p.hands[0], ...p.hands[1], ...p.hands[2], ...p.trick];
  if (popcount(maskOf(all)) !== all.length) return "duplicate cards";
  if ((p.leader + p.trick.length) % 3 !== 0) return "not seat 0 to move";
  const sizes = p.hands.map((h) => h.length);
  const left = Math.ceil((all.length) / 3);
  if (left < 4 || left > 5) return `${left} tricks left`;
  for (let s = 0; s < 3; s++) {
    const played = p.trick.filter((_, i) => (p.leader + i) % 3 === s).length;
    if (sizes[s] + played !== left) return "hand sizes do not fit the trick";
  }
  const outs = endgameOutcomes(p);
  const good = outs.filter((o) => o.achieves).map((o) => o.card);
  if (good.length !== 1) return `${good.length} cards reach the goal`;
  if (good[0] !== p.solution) return "the solution is not the winning card";
  if (outs.length < 2) return "only one legal card";
  return null;
}

// ─── Discards ─────────────────────────────────────────────────────────────────────────────────────────────

export const DISCARD_WORLDS = 64;
export const DISCARD_SCREEN = 16;
export const DISCARD_FINALISTS = 8;
/** "Clearly better": the best pair wins this much more often and earns this many more list points than the second. */
export const DISCARD_MARGIN = { chance: 0.08, ev: 8 };

/** Worlds for a discard problem: defenders' hands, the declarer's seat rotating through the three positions. */
function discardWorlds(cards12: CardMask, id: string, n: number): { pos: HandPosition; worlds: DefenderWorlds }[] {
  const rng = new Rng(hashString(`discard-problem/${id}`));
  const unknown = cardsOf(ALL_CARDS & ~cards12);
  const byPos: DefenderWorlds[] = [{ hands: [] }, { hands: [] }, { hands: [] }];
  for (let i = 0; i < n; i++) {
    const pos = (i % 3) as HandPosition;
    const others = ([0, 1, 2] as HandPosition[]).filter((q) => q !== pos);
    const deck = rng.shuffle(unknown.slice());
    const h: [CardMask, CardMask, CardMask] = [0, 0, 0];
    for (let k = 0; k < 10; k++) h[others[0]] |= 1 << deck[k];
    for (let k = 0; k < 10; k++) h[others[1]] |= 1 << deck[10 + k];
    byPos[pos].hands.push(h);
  }
  return byPos.map((worlds, pos) => ({ pos: pos as HandPosition, worlds }));
}

/** Pairs a club player would consider: never jacks; in suit games never trumps. */
export function sensiblePairs(cards12: CardMask, kind: DeclKind): [Card, Card][] {
  const forbidden = kind === "null" ? 0 : kind === "grand" ? JACKS : trumpMask(kind);
  const cs = cardsOf(cards12 & ~forbidden);
  const out: [Card, Card][] = [];
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) out.push([cs[i], cs[j]]);
  return out;
}

function evaluateAll(cards12: CardMask, kind: DeclKind, pairs: [Card, Card][], parts: { pos: HandPosition; worlds: DefenderWorlds }[]): PairResult[] {
  const acc = new Map<string, PairResult & { w: number }>();
  for (const { pos, worlds } of parts) {
    if (!worlds.hands.length) continue;
    const rs = evaluatePairs(cards12, 18, pos, pairs.map((pair) => ({ kind, pair })), worlds, { schneider: true });
    for (const r of rs) {
      const key = `${r.pair[0]},${r.pair[1]}`;
      const n = r.n;
      const e = acc.get(key);
      if (!e) acc.set(key, { ...r, ev: r.ev * n, chance: r.chance * n, w: n });
      else {
        e.ev += r.ev * n;
        e.chance += r.chance * n;
        e.n += n;
        e.w += n;
        e.certain = e.certain && r.certain;
      }
    }
  }
  return [...acc.values()].map((e) => ({ kind: e.kind, pair: e.pair, ev: e.ev / e.w, chance: e.chance / e.w, n: e.n, certain: e.certain }));
}

/**
 * Rank the sensible pairs for a discard problem: every pair on `DISCARD_SCREEN` worlds, the best `DISCARD_FINALISTS`
 * on all `DISCARD_WORLDS` (the same worlds for every pair). Best first.
 */
export function discardRanking(cards12: CardMask, decl: Declaration, id: string): PairResult[] {
  const kind = decl.kind;
  const parts = discardWorlds(cards12, id, DISCARD_WORLDS);
  const screenParts = discardWorlds(cards12, id, DISCARD_SCREEN);
  const pairs = sensiblePairs(cards12, kind);
  const screened = evaluateAll(cards12, kind, pairs, screenParts).sort((a, b) => b.ev - a.ev || b.chance - a.chance);
  const finalists = screened.slice(0, DISCARD_FINALISTS).map((r) => r.pair);
  return evaluateAll(cards12, kind, finalists, parts).sort((a, b) => b.ev - a.ev || b.chance - a.chance);
}

/** null when the discard problem is sound: the solution is first and clearly ahead of the second-best pair. */
export function checkDiscardProblem(p: DiscardProblem): string | null {
  if (p.cards.length !== 12 || popcount(maskOf(p.cards)) !== 12) return "not twelve distinct cards";
  const r = discardRanking(maskOf(p.cards), p.declaration, p.id);
  const [a, b] = r;
  const sol = [...p.solution].sort((x, y) => x - y);
  if (a.pair[0] !== sol[0] || a.pair[1] !== sol[1]) return "the solution is not the best pair";
  if (a.chance - b.chance < DISCARD_MARGIN.chance && a.ev - b.ev < DISCARD_MARGIN.ev) return "no clear margin to the second-best pair";
  return null;
}

// ─── Bidding ──────────────────────────────────────────────────────────────────────────────────────────────

export const BID_SAMPLES = 48;
/** The range: up to the highest value a careful player bids (chance ≥ BID_CAREFUL) … a bold one (≥ BID_BOLD). */
export const BID_CAREFUL = BASE_THRESHOLD + 0.18;
export const BID_BOLD = BASE_THRESHOLD - 0.07;

export interface BidAnswer {
  range: [number, number];
  /** The kind that carries the upper end. */
  kind: DeclKind;
  /** Chance of that kind at the upper end. */
  chance: number;
}

/** The sensible bidding range for ten cards at a position (null when the hand should simply pass or is unclear). */
export function bidAnswer(cards10: CardMask, position: HandPosition): BidAnswer | null {
  const style = { ...personaFor("wirtin").bid, samples: BID_SAMPLES };
  const val = valueHand(cards10, position, style);
  const limitAt = (theta: number): { b: number; kind: DeclKind; chance: number } => {
    let best = { b: 0, kind: "grand" as DeclKind, chance: 0 };
    for (const kv of val.pickup) {
      const t = theta + (style.kindBias[kv.kind] ?? 0);
      if (kv.kind === "null") {
        const c = chanceAt(kv, 0);
        const b = c >= Math.max(0.95, t) ? 46 : c >= t ? 23 : 0;
        if (b > best.b) best = { b, kind: "null", chance: c };
        continue;
      }
      for (const b of BID_VALUES) {
        const c = chanceAt(kv, b);
        if (c < t) break;
        if (b > best.b) best = { b, kind: kv.kind, chance: c };
      }
    }
    return best;
  };
  const careful = limitAt(BID_CAREFUL);
  const bold = limitAt(BID_BOLD);
  if (careful.b < 18 || bold.b < careful.b) return null;
  return { range: [careful.b, bold.b], kind: bold.kind, chance: bold.chance };
}

/** null when the bid problem is sound: the stored range equals the solver's range. */
export function checkBidProblem(p: BidProblem): string | null {
  if (p.cards.length !== 10 || popcount(maskOf(p.cards)) !== 10) return "not ten distinct cards";
  const a = bidAnswer(maskOf(p.cards), p.position);
  if (!a) return "no clear bidding range";
  if (a.range[0] !== p.range[0] || a.range[1] !== p.range[1]) return `range ${a.range.join("–")} instead of ${p.range.join("–")}`;
  return null;
}
