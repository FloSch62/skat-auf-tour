// Dealing (ISkO 3.2.6): shuffle from the seeded RNG, then from the dealer's left: 3 each – 2 to the skat – 4 each –
// 3 each. Seats: 0 = player, 1 = left, 2 = right; play goes clockwise 0 → 1 → 2, so the dealer's left neighbour
// (Vorhand) is `(dealer + 1) % 3`. At a three-table the dealer plays and sits in Hinterhand.
import { Rng } from "../../core/rng.ts";
import type { Card, CardMask } from "./cards.ts";

export type Seat = 0 | 1 | 2;
/** 0 = Vorhand (forehand), 1 = Mittelhand, 2 = Hinterhand. */
export type HandPosition = 0 | 1 | 2;

export const SEATS: readonly Seat[] = [0, 1, 2];

export function nextSeat(s: Seat): Seat {
  return (s === 2 ? 0 : s + 1) as Seat;
}

export function forehandOf(dealer: Seat): Seat {
  return nextSeat(dealer);
}

/** Seat sitting at a hand position for this dealer. */
export function seatAt(pos: HandPosition, dealer: Seat): Seat {
  return ((dealer + 1 + pos) % 3) as Seat;
}

/** Hand position (Vorhand 0, Mittelhand 1, Hinterhand 2) of a seat for this dealer. */
export function positionOf(seat: Seat, dealer: Seat): HandPosition {
  return ((seat - dealer + 2) % 3) as HandPosition;
}

export interface PositionDeal {
  /** Hands by position: Vorhand, Mittelhand, Hinterhand. */
  hands: [CardMask, CardMask, CardMask];
  /** The two skat cards in dealt order (index 0/1 is what a peek refers to). */
  skat: [Card, Card];
}

/** The shuffled deck for a seed (top card first). Same seed → same order, always. */
export function shuffledDeck(seed: number): Card[] {
  const deck: Card[] = [];
  for (let c = 0; c < 32; c++) deck.push(c);
  return new Rng(seed).shuffle(deck);
}

/** Deal by hand position: 3 – Skat – 4 – 3 from the top of the shuffled deck, Vorhand first. */
export function dealByPosition(seed: number): PositionDeal {
  const deck = shuffledDeck(seed);
  const hands: [CardMask, CardMask, CardMask] = [0, 0, 0];
  let i = 0;
  const give = (n: number) => {
    for (let p = 0; p < 3; p++) for (let k = 0; k < n; k++) hands[p] |= 1 << deck[i++];
  };
  give(3);
  const skat: [Card, Card] = [deck[i], deck[i + 1]];
  i += 2;
  give(4);
  give(3);
  return { hands, skat };
}

export interface SeatDeal {
  /** Hands by seat (0 player, 1 left, 2 right). */
  hands: [CardMask, CardMask, CardMask];
  skat: [Card, Card];
  dealer: Seat;
  forehand: Seat;
}

/** Deal for a dealer seat: the same seed always gives Vorhand, Mittelhand and Hinterhand the same cards. */
export function deal(seed: number, dealer: Seat): SeatDeal {
  const d = dealByPosition(seed);
  const hands: [CardMask, CardMask, CardMask] = [0, 0, 0];
  for (let p = 0; p < 3; p++) hands[seatAt(p as HandPosition, dealer)] = d.hands[p];
  return { hands, skat: d.skat, dealer, forehand: forehandOf(dealer) };
}
