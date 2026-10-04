// What a seat knows, derived only from its SeatView (contract §0.3): roles, points so far, the cards each seat has
// played, and what the bidding said about every hand. Pure, no DOM.
import { pointsOf } from "../rules/cards.ts";
import type { Card, CardMask } from "../rules/cards.ts";
import type { Seat } from "../rules/deal.ts";
import { playRules } from "../rules/play.ts";
import type { PlayKind, PlayRules } from "../rules/play.ts";
import { nextBid } from "../rules/value.ts";
import type { SeatView } from "../rules/view.ts";

export interface BidFacts {
  /** Highest value the seat said or held (0 = none). */
  reached: [number, number, number];
  /** Lowest value the seat refused by passing (Infinity = never refused anything). */
  refused: [number, number, number];
}

/** Read the public bidding from the history: who said or held what, and at which value each seat passed. */
export function bidFacts(v: Pick<SeatView, "history" | "dealer">): BidFacts {
  const reached: [number, number, number] = [0, 0, 0];
  const refused: [number, number, number] = [Infinity, Infinity, Infinity];
  const vorhand = ((v.dealer + 1) % 3) as Seat;
  const mittelhand = ((v.dealer + 2) % 3) as Seat;
  const hinterhand = v.dealer;
  let stage = 1;
  let asker: Seat = mittelhand;
  let listener: Seat = vorhand;
  let waitingAsker = true;
  let value = 0;
  for (const a of v.history) {
    if (a.type === "bid") {
      value = a.value;
      if (value > reached[a.seat]) reached[a.seat] = value;
      waitingAsker = false;
    } else if (a.type === "hold") {
      const held = stage === 3 ? 18 : value;
      if (held > reached[a.seat]) reached[a.seat] = held;
      waitingAsker = true;
    } else if (a.type === "pass") {
      // The asker refuses the next value; the listener refuses the value just said; Vorhand alone refuses 18.
      const r = stage === 3 ? 18 : waitingAsker ? (nextBid(value) ?? 999) : value;
      if (r < refused[a.seat]) refused[a.seat] = r;
      if (stage === 1) {
        const survivor = a.seat === asker ? listener : asker;
        stage = 2;
        asker = hinterhand;
        listener = survivor;
        waitingAsker = true;
      } else if (stage === 2) {
        if (a.seat === asker && value === 0) {
          stage = 3;
          asker = vorhand;
          listener = vorhand;
        } else stage = 4;
      } else stage = 4;
    }
  }
  return { reached, refused };
}

export interface PlayInfo {
  view: SeatView;
  me: Seat;
  kind: PlayKind;
  rules: PlayRules;
  /** Declarer seat; null in Ramsch. */
  declarer: Seat | null;
  /** Cards each seat has played so far (finished tricks and the current trick). */
  playedBy: [CardMask, CardMask, CardMask];
  /** Card points won in tricks so far per seat. */
  points: [number, number, number];
  /** Cards lying in the current trick and who led it. */
  trick: Card[];
  leader: Seat;
  /** Tricks still to be completed, counting the current one. */
  tricksLeft: number;
  bids: BidFacts;
}

export function playInfo(v: SeatView): PlayInfo {
  if (!v.kind) throw new Error("playInfo outside card play");
  const playedBy: [CardMask, CardMask, CardMask] = [0, 0, 0];
  for (const t of v.tricks) for (let i = 0; i < 3; i++) playedBy[(t.leader + i) % 3] |= 1 << t.cards[i];
  for (let i = 0; i < v.trick.length; i++) playedBy[(v.trickLeader + i) % 3] |= 1 << v.trick[i];
  return {
    view: v,
    me: v.seat,
    kind: v.kind,
    rules: playRules(v.kind),
    declarer: v.declarer,
    playedBy,
    points: [v.points[0], v.points[1], v.points[2]],
    trick: [...v.trick],
    leader: v.trickLeader,
    tricksLeft: 10 - v.tricks.length,
    bids: bidFacts(v),
  };
}

/** Same party as `a`? (Ramsch: everybody plays alone.) */
export function partners(info: PlayInfo, a: Seat, b: Seat): boolean {
  if (a === b) return true;
  if (info.declarer === null) return false;
  return a !== info.declarer && b !== info.declarer;
}

/** Points of a mask, re-exported for callers that only import knowledge. */
export function augen(m: CardMask): number {
  return pointsOf(m);
}
