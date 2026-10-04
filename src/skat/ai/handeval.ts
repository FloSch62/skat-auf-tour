// Rules of thumb for hands without lookahead: how strong a hand is for each game kind, what a club player would bid
// with it, and which two cards to lay away. Used by the rule-based baseline, by the inference from bidding (what would
// a typical player have bid with this hand?), and to preselect candidates that the solver then evaluates.
import { JACKS, SUIT_MASKS, popcount, pointsOf } from "../rules/cards.ts";
import type { Card, CardMask } from "../rules/cards.ts";
import { BID_VALUES, declaration, declarationValue, matadors } from "../rules/value.ts";
import type { DeclKind } from "../rules/value.ts";

const CJ = 31;
const SJ = 30;
const ACE = 6;
const TEN = 5;
const KING = 4;

export const SUIT_KINDS: readonly ("diamonds" | "hearts" | "spades" | "clubs")[] = ["diamonds", "hearts", "spades", "clubs"];

function bitOf(c: Card): number {
  return 1 << c;
}

/** Suit index 0…3 of a suit-game kind, -1 otherwise. */
export function trumpSuitOf(kind: DeclKind | string): number {
  return kind === "diamonds" ? 0 : kind === "hearts" ? 1 : kind === "spades" ? 2 : kind === "clubs" ? 3 : -1;
}

/** Trumps of a game kind (jacks + trump suit; jacks in Grand). */
export function trumpMask(kind: DeclKind | string): CardMask {
  const s = trumpSuitOf(kind);
  if (kind === "null") return 0;
  return s >= 0 ? JACKS | SUIT_MASKS[s] : JACKS;
}

/** Side-suit strength used by suit games and Grand: aces, guarded tens, voids. */
function sideValue(cards: CardMask, suit: number): { tricks: number; risk: number; len: number } {
  const m = cards & SUIT_MASKS[suit];
  const len = popcount(m);
  if (len === 0) return { tricks: 0, risk: 0, len };
  const a = (m & bitOf(suit * 7 + ACE)) !== 0;
  const t = (m & bitOf(suit * 7 + TEN)) !== 0;
  const k = (m & bitOf(suit * 7 + KING)) !== 0;
  let tricks = 0;
  let risk = 0;
  if (a) tricks += 1;
  if (a && t) tricks += 0.8;
  else if (t && k && len >= 2) tricks += 0.35;
  if (t && !a && len <= 2) risk += 0.6; // a ten that may fall to the ace
  if (!a && len >= 3) risk += 0.25 * (len - 2);
  return { tricks, risk, len };
}

/**
 * Strength of a suit game in "sure-ish tricks" (rules of thumb). About 7 makes a playable game with the skat, 8 a
 * comfortable one. `cards` may be 10 (before the skat) or 10/12 after picking up.
 */
export function suitScore(cards: CardMask, suit: number): number {
  const trumps = cards & (JACKS | SUIT_MASKS[suit]);
  const nT = popcount(trumps);
  // Trump length first: four trumps make a weak suit game however good the side cards are.
  let s = nT * 1.2 - (nT <= 4 ? 1 : 0);
  if (cards & bitOf(CJ)) s += 0.6;
  if (cards & bitOf(SJ)) s += 0.4;
  if (trumps & bitOf(suit * 7 + ACE)) s += 0.4;
  if (trumps & bitOf(suit * 7 + TEN)) s += 0.2;
  // Few top trumps make a long suit weaker.
  if (popcount(cards & JACKS) === 0) s -= 1;
  for (let o = 0; o < 4; o++) {
    if (o === suit) continue;
    const sv = sideValue(cards, o);
    s += sv.tricks - sv.risk;
    if (sv.len === 0 && nT >= 5) s += 0.5;
  }
  return s;
}

/** Strength of a Grand (rules of thumb): jacks, aces, guarded tens, a long suit. About 7 is playable. */
export function grandScore(cards: CardMask): number {
  const nJ = popcount(cards & JACKS);
  let s = nJ * 1.3;
  if (cards & bitOf(CJ)) s += 0.5;
  if (cards & bitOf(SJ)) s += 0.3;
  let aces = 0;
  for (let o = 0; o < 4; o++) {
    const sv = sideValue(cards, o);
    s += sv.tricks * 1.2 - sv.risk;
    if (cards & bitOf(o * 7 + ACE)) aces++;
    // A long suit with ace and ten runs.
    if (sv.len >= 4 && (cards & bitOf(o * 7 + ACE)) !== 0) s += (sv.len - 3) * 0.8;
  }
  if (nJ <= 1) s -= 2;
  if (aces <= 1) s -= 1;
  return s;
}

/** Null order rank inside a suit: 7 8 9 10 B D K A → 0…7. */
export function nullRank(c: Card): number {
  if (c >= 28) return 4;
  return [0, 1, 2, 5, 6, 3, 7][c % 7];
}

/** Cards of a Null suit (with its jack). */
export function nullSuitMask(suit: number): CardMask {
  return SUIT_MASKS[suit] | (1 << (28 + suit));
}

/**
 * Unsafe cards per suit for Null: the i-th lowest card held (i = 0, 1, …) is safe when its rank is at most 2i ("every
 * other card", e.g. 7 9 B K). Returns the number of unsafe cards in total and the unsafe suits.
 */
export function nullDanger(cards: CardMask): { unsafeCards: number; unsafeSuits: number; worst: CardMask } {
  let unsafeCards = 0;
  let unsafeSuits = 0;
  let worst = 0;
  for (let s = 0; s < 4; s++) {
    const m = cards & nullSuitMask(s);
    if (!m) continue;
    const held: Card[] = [];
    for (let c = 0; c < 32; c++) if (m & bitOf(c)) held.push(c);
    held.sort((a, b) => nullRank(a) - nullRank(b));
    let bad = 0;
    for (let i = 0; i < held.length; i++) {
      if (nullRank(held[i]) > 2 * i) {
        bad++;
        worst |= bitOf(held[i]);
      }
    }
    if (bad) {
      unsafeCards += bad;
      unsafeSuits++;
    }
  }
  return { unsafeCards, unsafeSuits, worst };
}

export interface KindEstimate {
  kind: DeclKind;
  /** Rule-of-thumb strength (suit/Grand ≈ tricks; Null: negative danger). */
  score: number;
  /** Playable by the rules of thumb with the skat (10 cards) or as it stands (12 cards). */
  playable: boolean;
  /** Game value with the known cards (matadors on these cards; Null 23). */
  value: number;
}

/** Thresholds of the rules of thumb (tuned so the baseline wins most of its games). */
export const THUMB = { suit: 8.4, grand: 7.6, nullUnsafe: 1 };

/** Rule-of-thumb estimates for every kind. `position` 0 Vorhand … 2 Hinterhand (Vorhand leads: a little easier). */
export function estimateKinds(cards: CardMask, position = 1, shift = 0): KindEstimate[] {
  const out: KindEstimate[] = [];
  const bonus = position === 0 ? 0.3 : 0;
  for (let s = 0; s < 4; s++) {
    const kind = SUIT_KINDS[s];
    const score = suitScore(cards, s) + bonus;
    const nT = popcount(cards & (JACKS | SUIT_MASKS[s]));
    const playable = nT >= 5 && score >= THUMB.suit + shift;
    const m = matadors(cards, kind as Exclude<DeclKind, "null">);
    out.push({ kind, score, playable, value: declarationValue(declaration(kind), m.count) });
  }
  {
    const score = grandScore(cards) + bonus;
    const nJ = popcount(cards & JACKS);
    const playable = nJ >= 2 && score >= THUMB.grand + shift;
    const m = matadors(cards, "grand");
    out.push({ kind: "grand", score, playable, value: declarationValue(declaration("grand"), m.count) });
  }
  {
    const d = nullDanger(cards);
    const playable = d.unsafeCards <= THUMB.nullUnsafe && d.unsafeSuits <= 1;
    out.push({ kind: "null", score: -d.unsafeCards, playable, value: 23 });
  }
  return out;
}

/**
 * What a typical club player would bid with these ten cards (0 = pass). Counts matadors on the own cards only, so it
 * is the "safe" value. `shift` makes the player bolder (negative) or more careful (positive).
 */
export function thumbBid(cards: CardMask, position = 1, shift = 0): number {
  let best = 0;
  for (const e of estimateKinds(cards, position, shift)) {
    if (!e.playable) continue;
    if (e.value > best) best = e.value;
  }
  return best;
}

/** The highest bid value not above `v` (0 below 18). */
export function bidFloor(v: number): number {
  let out = 0;
  for (const b of BID_VALUES) if (b <= v) out = b;
  return out;
}

// ─── Discards ─────────────────────────────────────────────────────────────────────────────────────────────

/** Rule-of-thumb score of laying away the pair (a, b) for a game kind (higher = better). */
export function discardScore(cards12: CardMask, kind: DeclKind, a: Card, b: Card): number {
  const pair = bitOf(a) | bitOf(b);
  const rest = cards12 & ~pair;
  if (kind === "null") {
    const before = nullDanger(cards12);
    const after = nullDanger(rest);
    return (before.unsafeCards - after.unsafeCards) * 20 + (after.unsafeSuits === 0 ? 15 : 0) + nullRank(a) + nullRank(b);
  }
  const trumps = trumpMask(kind);
  if (pair & JACKS) return -1000;
  let s = pointsOf(pair) * 1.0;
  if (pair & trumps) s -= 40 * popcount(pair & trumps);
  for (let o = 0; o < 4; o++) {
    if (SUIT_MASKS[o] & trumps) continue;
    const before = popcount(cards12 & SUIT_MASKS[o]);
    const after = popcount(rest & SUIT_MASKS[o]);
    if (before > 0 && after === 0) s += 14; // a void to trump in
    const ace = bitOf(o * 7 + ACE);
    const ten = bitOf(o * 7 + TEN);
    if (pair & ace) s -= kind === "grand" ? 25 : 14; // aces win tricks
    if (pair & ten && rest & ace) s -= 10; // keep A-10 together
    if (rest & ten && !(rest & ace) && after <= 2) s -= 6; // an unguarded ten left behind
    if (after === 1 && !(rest & ace)) s -= 2; // a singleton that is not an ace
  }
  return s;
}

/** The best pairs to lay away for a kind by the rules of thumb, best first. */
export function discardCandidates(cards12: CardMask, kind: DeclKind, limit = 6): [Card, Card][] {
  const cs: Card[] = [];
  for (let c = 0; c < 32; c++) if (cards12 & bitOf(c)) cs.push(c);
  const scored: { p: [Card, Card]; s: number }[] = [];
  for (let i = 0; i < cs.length; i++)
    for (let j = i + 1; j < cs.length; j++) scored.push({ p: [cs[i], cs[j]], s: discardScore(cards12, kind, cs[i], cs[j]) });
  scored.sort((x, y) => y.s - x.s || x.p[0] - y.p[0] || x.p[1] - y.p[1]);
  return scored.slice(0, limit).map((x) => x.p);
}

/** Rule-of-thumb best discard and its score after the discard. */
export function bestThumbDiscard(cards12: CardMask, kind: DeclKind): [Card, Card] {
  return discardCandidates(cards12, kind, 1)[0];
}
