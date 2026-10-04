// The rule-based opponent without lookahead (contract §5.4: "Regelgegner ohne Vorausrechnen"). It bids by counting
// trumps, jacks and aces, lays away by the rules of thumb and plays the card the rules of thumb like best. Used as the
// yardstick in the league and as a fast fallback.
import { JACKS, SUIT_MASKS, popcount } from "../rules/cards.ts";
import type { Card, CardMask } from "../rules/cards.ts";
import { positionOf } from "../rules/deal.ts";
import type { HandPosition } from "../rules/deal.ts";
import type { Action } from "../rules/game.ts";
import { declaration, declarationError, declarationValue, matadors, nextBid, sameDeclaration } from "../rules/value.ts";
import type { DeclKind, Declaration } from "../rules/value.ts";
import type { SeatView } from "../rules/view.ts";
import { SUIT_KINDS, THUMB, bestThumbDiscard, grandScore, nullDanger, suitScore, thumbBid } from "./handeval.ts";
import { heuristicCard } from "./heuristics.ts";
import { schiebenAction } from "./ramsch.ts";

/** Rule-of-thumb rating of a declared game on given cards (higher = better), or -Infinity if not sensible. */
function rate(cards: CardMask, kind: DeclKind): number {
  if (kind === "null") {
    const d = nullDanger(cards);
    return d.unsafeCards === 0 ? 2 : -Infinity;
  }
  if (kind === "grand") return popcount(cards & JACKS) >= 2 ? grandScore(cards) - THUMB.grand : -Infinity;
  const s = SUIT_KINDS.indexOf(kind);
  return popcount(cards & (JACKS | SUIT_MASKS[s])) >= 5 ? suitScore(cards, s) - THUMB.suit : -Infinity;
}

/** The best (kind, discard) by the rules of thumb for twelve cards at a bid. */
export function thumbPlan(cards12: CardMask, bid: number): { kind: DeclKind; pair: [Card, Card] } {
  let best: { kind: DeclKind; pair: [Card, Card]; s: number } | null = null;
  for (const kind of ["diamonds", "hearts", "spades", "clubs", "grand", "null"] as DeclKind[]) {
    const pair = bestThumbDiscard(cards12, kind);
    const rest = cards12 & ~(1 << pair[0]) & ~(1 << pair[1]);
    let s = rate(rest, kind);
    const value = kind === "null" ? (bid <= 23 ? 23 : 46) : declarationValue(declaration(kind), matadors(cards12, kind).count);
    if (kind === "null" && bid > 46) s = -Infinity;
    if (value < bid) s -= 50;
    if (!Number.isFinite(s)) s = -100 + (kind === "null" ? -1 : 0) + (kind === "grand" ? grandScore(rest) : 0);
    if (!best || s > best.s) best = { kind, pair, s };
  }
  return best!;
}

function sorted(p: [Card, Card]): [Card, Card] {
  return [Math.min(p[0], p[1]), Math.max(p[0], p[1])] as [Card, Card];
}

/** Decide one action for the seat by the rules of thumb. */
export function baselineDecide(v: SeatView): Action {
  const legal = v.legal.filter((a) => a.type !== "peek" && a.type !== "takeBack");
  if (legal.length === 1) return legal[0];
  const seat = v.seat;
  switch (v.phase) {
    case "bidding": {
      const pos = positionOf(seat, v.dealer) as HandPosition;
      const limit = thumbBid(v.hand, pos);
      const b = v.bidding;
      if (b.stage === 3) return { type: limit >= 18 ? "hold" : "pass", seat };
      if (b.waiting === "asker") {
        const nb = nextBid(b.value);
        return nb !== null && nb <= limit ? { type: "bid", seat, value: nb } : { type: "pass", seat };
      }
      return { type: b.value <= limit ? "hold" : "pass", seat };
    }
    case "skat": {
      // Hand only with a very strong suit hand that reaches the bid.
      let best: Declaration | null = null;
      for (let s = 0; s < 4; s++) {
        const kind = SUIT_KINDS[s] as Exclude<DeclKind, "null" | "grand">;
        const d = declaration(kind, { hand: true });
        if (suitScore(v.hand, s) >= THUMB.suit + 2.2 && declarationValue(d, matadors(v.hand, kind).count) >= v.bid) best = d;
      }
      if (best) return { type: "declare", seat, declaration: best };
      return { type: "pickUp", seat };
    }
    case "discard":
      return { type: "discard", seat, cards: sorted(thumbPlan(v.hand, v.bid).pair) };
    case "declare": {
      const cards12 = v.hand | (v.skat ?? 0);
      let kind = thumbPlan(cards12, v.bid).kind;
      // The discard is already made: rate the kinds on the ten cards that are left.
      let bestS = -Infinity;
      for (const k of ["diamonds", "hearts", "spades", "clubs", "grand", "null"] as DeclKind[]) {
        let s = rate(v.hand, k);
        const value = k === "null" ? (v.bid <= 23 ? 23 : 46) : declarationValue(declaration(k), matadors(cards12, k).count);
        if (k === "null" && v.bid > 46) continue;
        if (value < v.bid) s -= 50;
        if (s > bestS) {
          bestS = s;
          kind = k;
        }
      }
      const d = kind === "null" ? declaration("null", { ouvert: v.bid > 23 }) : declaration(kind);
      const ok = declarationError(d, { skatTaken: true, bid: v.bid }) === null;
      const options = legal.filter((a): a is Extract<Action, { type: "declare" }> => a.type === "declare");
      return (ok && options.find((a) => sameDeclaration(a.declaration, d))) || options[0];
    }
    case "schieben":
      return schiebenAction(v, 0.35);
    case "re":
      return { type: "noRe", seat };
    case "play": {
      const cards: Card[] = [];
      for (const a of legal) if (a.type === "play") cards.push(a.card);
      return { type: "play", seat, card: heuristicCard(v, cards) };
    }
    default:
      return legal[0];
  }
}
