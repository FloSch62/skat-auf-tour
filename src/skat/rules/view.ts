// What one seat may know (contract §0.3: the computer never sees hidden cards). The AI only ever receives a
// `SeatView`; it contains the seat's own hand, everything that was played or announced in public, the skat only when
// this seat legitimately saw it, and the declarer's cards in ouvert games.
import { Rng } from "../../core/rng.ts";
import { ALL_CARDS, cardsOf, has, popcount } from "./cards.ts";
import type { Card, CardMask } from "./cards.ts";
import { seatAt } from "./deal.ts";
import type { HandPosition, Seat } from "./deal.ts";
import { currentSeat, legalActions, playKindOf } from "./game.ts";
import type { Action, BiddingState, GameResult, GameState, Phase, TrickRecord } from "./game.ts";
import type { RuleOptions } from "./list.ts";
import { playRules } from "./play.ts";
import type { PlayKind } from "./play.ts";
import type { Declaration } from "./value.ts";

/** An action as another seat saw it: a discard's cards are hidden unless they are the viewer's own. */
export type ViewAction = Exclude<Action, { type: "discard" }> | { type: "discard"; seat: Seat; cards?: [Card, Card] };

export interface SeatView {
  seat: Seat;
  phase: Phase;
  dealer: Seat;
  forehand: Seat;
  rules: RuleOptions;
  /** Whose decision it is (null when done). */
  current: Seat | null;
  /** Own cards. */
  hand: CardMask;
  handSizes: [number, number, number];
  /** Skat cards this seat knows (declarer after picking up; the last Schieberamsch passer; everyone at the end). */
  skat: CardMask | null;
  /** Number of cards lying in the skat now (0 while the declarer holds 12 cards). */
  skatSize: number;
  /** Cards shown to this seat by perks (skat peeks). */
  revealed: CardMask;
  /** The declarer's current cards in ouvert games (public), else 0. */
  openHand: CardMask;
  bidding: BiddingState;
  declarer: Seat | null;
  bid: number;
  skatTaken: boolean;
  declaration: Declaration | null;
  /** Card order of the game being played (null while unknown). */
  kind: PlayKind | null;
  kontra: 0 | 1 | 2;
  kontraBy: Seat | null;
  schieben: { step: HandPosition; holding: boolean; shoves: number; choice: (boolean | null)[]; myPassed: CardMask } | null;
  turn: Seat;
  trick: Card[];
  trickLeader: Seat;
  tricks: TrickRecord[];
  played: CardMask;
  /** Card points won in tricks per seat (public: anyone can count them). */
  points: [number, number, number];
  trickCounts: [number, number, number];
  history: ViewAction[];
  /** Actions this seat may take now. */
  legal: Action[];
  result: GameResult | null;
}

function knownSkat(s: GameState, seat: Seat): CardMask | null {
  if (s.phase === "done") return s.skat;
  if (s.declarer !== null) return seat === s.declarer && s.skatTaken ? s.skat : null;
  const sch = s.schieben;
  if (!sch) return null;
  // Schieberamsch: the last player who picked the skat up and passed two cards knows them, as long as nobody after
  // him picked the skat up again.
  let last: Seat | null = null;
  for (let p = 0; p < 3; p++) {
    const st = seatAt(p as HandPosition, s.dealer);
    if (sch.choice[st] === true) last = st;
  }
  if (last !== seat || sch.holding) return null;
  return sch.passed[seat] === s.skat ? s.skat : null;
}

/** The information set of one seat. Safe to hand to the AI. */
export function viewFor(s: GameState, seat: Seat): SeatView {
  const d = s.declaration;
  const open = d && d.ouvert && s.declarer !== null && (s.phase === "play" || s.phase === "re" || s.phase === "done");
  const history: ViewAction[] = s.history.map((a) =>
    a.type === "discard" && a.seat !== seat ? { type: "discard", seat: a.seat } : a,
  );
  return {
    seat,
    phase: s.phase,
    dealer: s.dealer,
    forehand: s.forehand,
    rules: { ...s.rules },
    current: currentSeat(s),
    hand: s.hands[seat],
    handSizes: [popcount(s.hands[0]), popcount(s.hands[1]), popcount(s.hands[2])],
    skat: knownSkat(s, seat),
    skatSize: popcount(s.skat),
    revealed: s.revealed[seat],
    openHand: open ? s.hands[s.declarer!] : 0,
    bidding: { ...s.bidding, passed: [...s.bidding.passed] },
    declarer: s.declarer,
    bid: s.bid,
    skatTaken: s.skatTaken,
    declaration: d ? { ...d } : null,
    kind: playKindOf(s),
    kontra: s.kontra,
    kontraBy: s.kontraBy,
    schieben: s.schieben
      ? {
          step: s.schieben.step,
          holding: s.schieben.holding,
          shoves: s.schieben.shoves,
          choice: [...s.schieben.choice],
          myPassed: s.schieben.passed[seat],
        }
      : null,
    turn: s.turn,
    trick: [...s.trick],
    trickLeader: s.trickLeader,
    tricks: s.tricks.map((t) => ({ ...t, cards: [...t.cards] as [Card, Card, Card] })),
    played: s.played,
    points: [...s.points],
    trickCounts: [...s.trickCounts],
    history,
    legal: legalActions(s, seat),
    result: s.result,
  };
}

// ─── Inference helpers for the AI ─────────────────────────────────────────────────────────────────────────

/**
 * Cards each seat can no longer hold because it did not follow a led class (ISkO 4.2: who can follow must follow).
 * The viewer's own entry is the complement of its hand.
 */
export function voidMasks(v: SeatView): [CardMask, CardMask, CardMask] {
  const out: [CardMask, CardMask, CardMask] = [0, 0, 0];
  if (!v.kind) return out;
  const r = playRules(v.kind);
  const visit = (leader: Seat, cards: readonly Card[]) => {
    const led = cards[0];
    for (let i = 1; i < cards.length; i++) {
      const s = ((leader + i) % 3) as Seat;
      if (!has(r.follow[led], cards[i])) out[s] |= r.follow[led];
    }
  };
  for (const t of v.tricks) visit(t.leader, t.cards);
  if (v.trick.length) visit(v.trickLeader, v.trick);
  out[v.seat] = ~v.hand;
  return out;
}

/** Cards whose place this seat does not know (in another hand or in the skat). */
export function unknownCards(v: SeatView): CardMask {
  return ALL_CARDS & ~v.hand & ~v.played & ~(v.skat ?? 0) & ~v.openHand;
}

/** How many unknown cards each other seat and the skat hold (the viewer's own count is 0). */
export function hiddenCounts(v: SeatView): { seats: [number, number, number]; skat: number } {
  const seats: [number, number, number] = [0, 0, 0];
  for (const s of [0, 1, 2] as Seat[]) {
    if (s === v.seat) continue;
    seats[s] = v.handSizes[s] - (s === v.declarer ? popcount(v.openHand) : 0);
  }
  return { seats, skat: v.skat === null ? v.skatSize : 0 };
}

export interface SampledWorld {
  hands: [CardMask, CardMask, CardMask];
  skat: CardMask;
}

/**
 * One random distribution of the unknown cards that fits everything the seat knows: hand sizes, open cards, known
 * skat and shown voids (no bidding inference — weight samples yourself). Most-constrained cards are placed first; on a
 * dead end it restarts. Returns null if no fitting world was found in `tries` attempts.
 */
export function sampleWorld(v: SeatView, rng: Rng, tries = 200): SampledWorld | null {
  const counts = hiddenCounts(v);
  const voids = voidMasks(v);
  const unknown = cardsOf(unknownCards(v));
  const base: [CardMask, CardMask, CardMask] = [0, 0, 0];
  base[v.seat] = v.hand;
  if (v.declarer !== null && v.declarer !== v.seat) base[v.declarer] |= v.openHand;
  const knownSkat = v.skat ?? 0;
  // Slots 0…2 seats, 3 skat.
  const allowed = (c: Card): number[] => {
    const out: number[] = [];
    for (let s = 0; s < 3; s++) if (counts.seats[s] > 0 && !has(voids[s], c)) out.push(s);
    if (counts.skat > 0) out.push(3);
    return out;
  };
  const options = unknown.map((c) => ({ c, slots: allowed(c) }));
  for (let attempt = 0; attempt < tries; attempt++) {
    const cap = [counts.seats[0], counts.seats[1], counts.seats[2], counts.skat];
    const hands: [CardMask, CardMask, CardMask] = [base[0], base[1], base[2]];
    let skat = knownSkat;
    const order = rng.shuffle(options.slice()).sort((a, b) => a.slots.length - b.slots.length);
    let ok = true;
    for (const { c, slots } of order) {
      let total = 0;
      for (const s of slots) total += cap[s];
      if (total === 0) {
        ok = false;
        break;
      }
      let r = rng.next() * total;
      let pick = slots[slots.length - 1];
      for (const s of slots) {
        r -= cap[s];
        if (r < 0 && cap[s] > 0) {
          pick = s;
          break;
        }
      }
      if (cap[pick] === 0) pick = slots.find((s) => cap[s] > 0)!;
      cap[pick]--;
      if (pick === 3) skat |= 1 << c;
      else hands[pick] |= 1 << c;
    }
    if (ok) return { hands, skat };
  }
  return null;
}
