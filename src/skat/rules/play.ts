// Card play: follow classes, legal moves, trick winners, and a fast mutable position with apply/undo for solvers.
// ISkO 2.3 (order of the cards), 4.2 (Bedienen), 4.4 (Stiche).
import { CARD_POINTS, popcount } from "./cards.ts";
import type { Card, CardMask, Suit } from "./cards.ts";
import type { GameKind } from "../../game/ids.ts";

/** What decides the card order: the declared game kind, or Ramsch (house rule; only jacks are trumps). */
export type PlayKind = GameKind;

/** Follow class of trumps (classes 0…3 are the plain suits Karo…Kreuz). */
export const TRUMP = 4;

export interface PlayRules {
  readonly kind: PlayKind;
  /** Trump suit for suit games, -1 otherwise. */
  readonly trumpSuit: Suit | -1;
  /** All trumps (jacks + trump suit; only jacks in Grand and Ramsch; 0 in Null). */
  readonly trumps: CardMask;
  /** Follow class per card: 0…3 plain suit, 4 trump. A jack is never its printed suit outside Null (ISkO 2.3). */
  readonly classOf: Uint8Array;
  /** Cards per follow class (index 0…4). */
  readonly classMask: Int32Array;
  /** `classMask[classOf[c]]`: the cards that follow when `c` is led. */
  readonly follow: Int32Array;
  /** Strength inside the card's class, 0 = lowest. Only comparable within one class. */
  readonly order: Uint8Array;
  readonly isNull: boolean;
  /** Matador order from the top (Kreuz-Bube first); empty for Null and Ramsch. */
  readonly matadorOrder: readonly Card[];
}

/** Null order of the slots 7 8 9 D K 10 A → 7 8 9 10 B D K A (ISkO 2.3.4). Jack = 4. */
const NULL_SLOT_ORDER = [0, 1, 2, 5, 6, 3, 7];

const SUIT_KINDS: Record<string, Suit> = { diamonds: 0, hearts: 1, spades: 2, clubs: 3 };

function build(kind: PlayKind): PlayRules {
  const classOf = new Uint8Array(32);
  const order = new Uint8Array(32);
  const isNull = kind === "null";
  const trumpSuit: Suit | -1 = kind in SUIT_KINDS ? SUIT_KINDS[kind] : -1;
  for (let c = 0; c < 32; c++) {
    if (c >= 28) {
      const s = c - 28;
      if (isNull) {
        classOf[c] = s;
        order[c] = 4;
      } else {
        classOf[c] = TRUMP;
        order[c] = 7 + s;
      }
    } else {
      const s = (c / 7) | 0;
      const slot = c % 7;
      if (isNull) {
        classOf[c] = s;
        order[c] = NULL_SLOT_ORDER[slot];
      } else {
        classOf[c] = s === trumpSuit ? TRUMP : s;
        order[c] = slot;
      }
    }
  }
  const classMask = new Int32Array(5);
  for (let c = 0; c < 32; c++) classMask[classOf[c]] |= 1 << c;
  const follow = new Int32Array(32);
  for (let c = 0; c < 32; c++) follow[c] = classMask[classOf[c]];
  const matadorOrder: Card[] = [];
  if (!isNull && kind !== "ramsch") {
    matadorOrder.push(31, 30, 29, 28);
    if (trumpSuit >= 0) for (let slot = 6; slot >= 0; slot--) matadorOrder.push(trumpSuit * 7 + slot);
  }
  return {
    kind,
    trumpSuit,
    trumps: classMask[TRUMP],
    classOf,
    classMask,
    follow,
    order,
    isNull,
    matadorOrder,
  };
}

const CACHE = new Map<PlayKind, PlayRules>();

/** Card order tables for a game kind (cached, immutable by convention). */
export function playRules(kind: PlayKind): PlayRules {
  let r = CACHE.get(kind);
  if (!r) {
    r = build(kind);
    CACHE.set(kind, r);
  }
  return r;
}

/**
 * Legal cards (ISkO 4.2): with no card led, the whole hand; otherwise the cards of the led follow class if the hand has
 * any (trump led → any trump, a jack counts as trump; suit led → that suit without its jack), else the whole hand.
 */
export function legalMoves(rules: PlayRules, hand: CardMask, led: Card): CardMask {
  if (led < 0) return hand;
  const f = hand & rules.follow[led];
  return f !== 0 ? f : hand;
}

/** Does `a` beat the card `w` that currently wins the trick? (`w` is of the led class or a trump.) */
export function beats(rules: PlayRules, a: Card, w: Card): boolean {
  const ca = rules.classOf[a];
  const cw = rules.classOf[w];
  return ca === cw ? rules.order[a] > rules.order[w] : ca === TRUMP;
}

/** Index 0…2 (in playing order) of the card that wins a complete trick (ISkO 4.4.2). */
export function trickWinner(rules: PlayRules, c0: Card, c1: Card, c2: Card): 0 | 1 | 2 {
  let w: 0 | 1 | 2 = 0;
  let wc = c0;
  if (beats(rules, c1, wc)) {
    w = 1;
    wc = c1;
  }
  if (beats(rules, c2, wc)) w = 2;
  return w;
}

export function trickPoints(c0: Card, c1: Card, c2: Card): number {
  return CARD_POINTS[c0] + CARD_POINTS[c1] + CARD_POINTS[c2];
}

// ─── Fast position for solvers ────────────────────────────────────────────────────────────────────────────

export interface PositionStart {
  /** Cards already lying in the current (unfinished) trick, in playing order. */
  trick?: readonly Card[];
  /** Card points already won in tricks per seat. */
  points?: readonly [number, number, number];
  /** Tricks already won per seat. */
  tricks?: readonly [number, number, number];
  /** Cards already played (only informational for solvers; kept up to date). */
  played?: CardMask;
}

/**
 * A mutable play position with O(1) `play` / `undo`. Seats are 0…2 in playing order (clockwise). No legality checks in
 * `play` (call `legal()` first); the high-level state machine (game.ts) is the checked layer.
 *
 * Points do not include the skat; add it yourself (declarer in suit/Grand/Null, last trick in Ramsch).
 */
export class Position {
  readonly rules: PlayRules;
  readonly hands: Int32Array = new Int32Array(3);
  readonly points: Int32Array = new Int32Array(3);
  readonly tricks: Int32Array = new Int32Array(3);
  /** Declarer seat, -1 for Ramsch. Used to end Null games at the declarer's first trick. */
  readonly declarer: number;
  /** Seat to play. */
  turn: number;
  /** Seat that led the current trick. */
  leader: number;
  played: CardMask;
  /** Cards played since the start of this position (ply = index). */
  readonly seq: Int8Array = new Int8Array(32);
  ply = 0;
  /** Ply at which the position has no cards left. */
  readonly endPly: number;
  private readonly winners: Int8Array = new Int8Array(11);
  private readonly leaders: Int8Array = new Int8Array(11);

  constructor(rules: PlayRules, hands: readonly CardMask[], leader: number, declarer: number, start: PositionStart = {}) {
    this.rules = rules;
    this.declarer = declarer;
    this.hands[0] = hands[0];
    this.hands[1] = hands[1];
    this.hands[2] = hands[2];
    if (start.points) for (let i = 0; i < 3; i++) this.points[i] = start.points[i];
    if (start.tricks) for (let i = 0; i < 3; i++) this.tricks[i] = start.tricks[i];
    this.played = start.played ?? 0;
    this.leader = leader;
    const t = start.trick ?? [];
    for (let i = 0; i < t.length; i++) {
      this.seq[i] = t[i];
      this.played |= 1 << t[i];
    }
    this.ply = t.length;
    this.turn = (leader + t.length) % 3;
    this.endPly = t.length + popcount(hands[0]) + popcount(hands[1]) + popcount(hands[2]);
  }

  /** Card that was led to the current trick, or -1. */
  led(): Card {
    const k = this.ply % 3;
    return k === 0 ? -1 : this.seq[this.ply - k];
  }

  /** Legal cards for the seat to play. */
  legal(): CardMask {
    return legalMoves(this.rules, this.hands[this.turn], this.led());
  }

  /** Number of cards in the current trick (0…2). */
  trickLength(): number {
    return this.ply % 3;
  }

  isOver(): boolean {
    if (this.ply >= this.endPly) return true;
    return this.rules.isNull && this.declarer >= 0 && this.tricks[this.declarer] > 0;
  }

  play(card: Card): void {
    const p = this.ply;
    const seat = this.turn;
    this.seq[p] = card;
    this.hands[seat] ^= 1 << card;
    this.played |= 1 << card;
    this.ply = p + 1;
    if (p % 3 < 2) {
      this.turn = seat === 2 ? 0 : seat + 1;
      return;
    }
    const a = this.seq[p - 2];
    const b = this.seq[p - 1];
    const w = (this.leader + trickWinner(this.rules, a, b, card)) % 3;
    const t = (p / 3) | 0;
    this.winners[t] = w;
    this.leaders[t] = this.leader;
    this.points[w] += CARD_POINTS[a] + CARD_POINTS[b] + CARD_POINTS[card];
    this.tricks[w]++;
    this.leader = w;
    this.turn = w;
  }

  undo(): void {
    const p = --this.ply;
    const card = this.seq[p];
    let seat: number;
    if (p % 3 === 2) {
      const t = (p / 3) | 0;
      const w = this.winners[t];
      this.points[w] -= CARD_POINTS[this.seq[p - 2]] + CARD_POINTS[this.seq[p - 1]] + CARD_POINTS[card];
      this.tricks[w]--;
      this.leader = this.leaders[t];
      seat = (this.leader + 2) % 3;
    } else {
      seat = this.turn === 0 ? 2 : this.turn - 1;
    }
    this.turn = seat;
    this.hands[seat] |= 1 << card;
    this.played &= ~(1 << card);
  }

  /** Winner seat of the most recently completed trick, or -1. */
  lastTrickWinner(): number {
    const done = (this.ply / 3) | 0;
    return done === 0 ? -1 : this.winners[done - 1];
  }
}
