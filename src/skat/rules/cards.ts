// Cards as bits of a 32-bit integer (contract §5.1). Pure, no DOM.
//
// Bit layout (chosen so that suit games, Grand and Ramsch need no remapping):
//
//   bits  0– 6  Karo   7 8 9 D K 10 A      (card = suit * 7 + slot)
//   bits  7–13  Herz   7 8 9 D K 10 A
//   bits 14–20  Pik    7 8 9 D K 10 A
//   bits 21–27  Kreuz  7 8 9 D K 10 A
//   bits 28–31  Buben  Karo, Herz, Pik, Kreuz (card = 28 + suit)
//
// Inside every suit the slots are in suit-game trick order (7 < 8 < 9 < Dame < König < 10 < Ass), and the jacks sit
// above everything in their own trump order (Karo-Bube < … < Kreuz-Bube). Consequence: in suit games, Grand and
// Ramsch the strongest card of any follow class is simply its highest set bit (`highestCard(mask & classMask)`).
// Null uses its own order table (see play.ts).
//
// Masks are signed int32 values as produced by JS bitwise operators (bit 31 = Kreuz-Bube makes them negative).
// Always build and compare them with bitwise operators (`|`, `&`, `^`, `===`); never mix in `>>> 0` values.
import { SUITS } from "../../game/ids.ts";
import type { RankId, SuitId } from "../../game/ids.ts";

/** Card index 0…31 (see layout above). */
export type Card = number;
/** Set of cards as int32 bit mask. */
export type CardMask = number;
/** 0 Karo, 1 Herz, 2 Pik, 3 Kreuz (ascending Skat order, same as `SUITS` in ids.ts). */
export type Suit = 0 | 1 | 2 | 3;

export const DIAMONDS = 0;
export const HEARTS = 1;
export const SPADES = 2;
export const CLUBS = 3;

/** Slots of the non-jack cards inside a suit (suit-game order). */
export const SLOT_7 = 0;
export const SLOT_8 = 1;
export const SLOT_9 = 2;
export const SLOT_QUEEN = 3;
export const SLOT_KING = 4;
export const SLOT_10 = 5;
export const SLOT_ACE = 6;

/** RankId of every slot (sprite names). */
export const SLOT_RANKS: readonly RankId[] = ["7", "8", "9", "queen", "king", "10", "ace"];

/** The non-jack cards of each suit (7 bits). */
export const SUIT_MASKS: readonly CardMask[] = [0x7f, 0x7f << 7, 0x7f << 14, 0x7f << 21];
/** All four jacks. */
export const JACKS: CardMask = 0xf << 28;
/** Every card (int32 -1). */
export const ALL_CARDS: CardMask = -1;
/** Each suit including its jack (the follow class of a suit in Null). */
export const FULL_SUIT_MASKS: readonly CardMask[] = [0, 1, 2, 3].map((s) => SUIT_MASKS[s] | (1 << (28 + s)));

const SLOT_POINTS = [0, 0, 0, 3, 4, 10, 11];
/** Card points (Augen) per card index. */
export const CARD_POINTS: Uint8Array = (() => {
  const p = new Uint8Array(32);
  for (let c = 0; c < 28; c++) p[c] = SLOT_POINTS[c % 7];
  for (let c = 28; c < 32; c++) p[c] = 2;
  return p;
})();

/** Points of every 7-bit suit pattern (fast mask points). */
const P7: Uint8Array = (() => {
  const t = new Uint8Array(128);
  for (let m = 0; m < 128; m++) {
    let s = 0;
    for (let i = 0; i < 7; i++) if (m & (1 << i)) s += SLOT_POINTS[i];
    t[m] = s;
  }
  return t;
})();

export function cardOf(suit: Suit | number, slot: number): Card {
  return suit * 7 + slot;
}

export function jackOf(suit: Suit | number): Card {
  return 28 + suit;
}

export function bit(c: Card): CardMask {
  return 1 << c;
}

export function has(mask: CardMask, c: Card): boolean {
  return (mask & (1 << c)) !== 0;
}

export function isJack(c: Card): boolean {
  return c >= 28;
}

/** The printed suit of a card (a jack keeps its suit). */
export function suitOf(c: Card): Suit {
  return (c >= 28 ? c - 28 : (c / 7) | 0) as Suit;
}

/** Slot 0…6 of a non-jack card, -1 for a jack. */
export function slotOf(c: Card): number {
  return c >= 28 ? -1 : c % 7;
}

export function popcount(m: CardMask): number {
  m = (m - ((m >>> 1) & 0x55555555)) | 0;
  m = (m & 0x33333333) + ((m >>> 2) & 0x33333333);
  return Math.imul((m + (m >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24;
}

/** Highest card index in the mask (-1 if empty). */
export function highestCard(m: CardMask): Card {
  return 31 - Math.clz32(m);
}

/** Lowest card index in the mask (-1 if empty). */
export function lowestCard(m: CardMask): Card {
  return m === 0 ? -1 : 31 - Math.clz32(m & -m);
}

/** Card points (Augen) of all cards in the mask. */
export function pointsOf(m: CardMask): number {
  return (
    P7[m & 127] + P7[(m >>> 7) & 127] + P7[(m >>> 14) & 127] + P7[(m >>> 21) & 127] + 2 * popcount((m >>> 28) & 15)
  );
}

/** The cards of a mask in ascending index order. */
export function cardsOf(m: CardMask): Card[] {
  const out: Card[] = [];
  while (m !== 0) {
    const low = m & -m;
    out.push(31 - Math.clz32(low));
    m ^= low;
  }
  return out;
}

export function maskOf(cards: Iterable<Card>): CardMask {
  let m = 0;
  for (const c of cards) m |= 1 << c;
  return m;
}

// ─── Sprites ──────────────────────────────────────────────────────────────────────────────────────────────

/** Suit and rank ids for sprite frames (`src/game/ids.ts`). */
export function cardSprite(c: Card): { suit: SuitId; rank: RankId } {
  return { suit: SUITS[suitOf(c)], rank: c >= 28 ? "jack" : SLOT_RANKS[c % 7] };
}

export function cardFromSprite(suit: SuitId, rank: RankId): Card {
  const s = SUITS.indexOf(suit);
  if (s < 0) throw new Error(`unknown suit ${suit}`);
  if (rank === "jack") return 28 + s;
  const slot = SLOT_RANKS.indexOf(rank);
  if (slot < 0) throw new Error(`unknown rank ${rank}`);
  return s * 7 + slot;
}

// ─── Short codes for tests, tools and problems ────────────────────────────────────────────────────────────
// Suit letter D H S C (Karo Herz Pik Kreuz) + rank 7 8 9 T J Q K A ("10" is accepted for T): "CJ", "HT", "SA", "D7".

const SUIT_LETTERS = "DHSC";
const SLOT_LETTERS = "789QKTA";

export function cardCode(c: Card): string {
  const s = SUIT_LETTERS[suitOf(c)];
  return c >= 28 ? s + "J" : s + SLOT_LETTERS[c % 7];
}

export function parseCard(code: string): Card {
  const t = code.trim().toUpperCase();
  const s = SUIT_LETTERS.indexOf(t[0]);
  const r = t.slice(1) === "10" ? "T" : t.slice(1);
  if (s < 0 || r.length !== 1) throw new Error(`bad card code "${code}"`);
  if (r === "J") return 28 + s;
  const slot = SLOT_LETTERS.indexOf(r);
  if (slot < 0) throw new Error(`bad card code "${code}"`);
  return s * 7 + slot;
}

/** "CJ SJ HA HT" → mask (separators: spaces or commas). */
export function parseCards(codes: string): CardMask {
  let m = 0;
  for (const part of codes.split(/[\s,]+/)) {
    if (!part) continue;
    const c = parseCard(part);
    if (m & (1 << c)) throw new Error(`duplicate card "${part}"`);
    m |= 1 << c;
  }
  return m;
}

export function maskCodes(m: CardMask): string {
  return cardsOf(m).map(cardCode).join(" ");
}
