// Game values per ISkO 5 (Spielbewertung). Source: Internationale Skatordnung (Fassung Altenburg 2002 of the unified
// rules adopted 22.11.1998, valid since 1.1.1999), sections 2.4 (Spitzen), 3.3 (Reizen), 3.4 (Spielansage),
// 5.1–5.4 (Grundwerte, Gewinnstufen, Spielwerte, Überreiztes Spiel). Rule decisions: docs/notes-skat.md.
import { has } from "./cards.ts";
import type { CardMask } from "./cards.ts";
import { playRules } from "./play.ts";

/** Game kinds a declarer can announce. */
export type DeclKind = "diamonds" | "hearts" | "spades" | "clubs" | "grand" | "null";
export const DECL_KINDS: readonly DeclKind[] = ["diamonds", "hearts", "spades", "clubs", "grand", "null"];
export const SUIT_GAME_KINDS: readonly DeclKind[] = ["diamonds", "hearts", "spades", "clubs"];

/** A complete announcement (ISkO 3.4.1: Hand, Ouvert and announced levels must be announced to count). */
export interface Declaration {
  kind: DeclKind;
  /** Played without picking up the skat. */
  hand: boolean;
  schneiderAnnounced: boolean;
  schwarzAnnounced: boolean;
  /** Open game. Suit/Grand ouvert implies Hand + Schwarz angesagt (ISkO 5.2.6); Null ouvert exists with and without skat. */
  ouvert: boolean;
}

/** "mit"/"ohne" count of tops (Spitzen, ISkO 2.4) over the declarer's 12 cards (hand + skat). */
export interface Matadors {
  count: number;
  /** true = "mit" (has the Kreuz-Bube), false = "ohne". */
  withTops: boolean;
}

/** Levels (Gewinnstufen) that count on top of the matadors and the game itself (ISkO 5.2.1). */
export interface Levels {
  hand: boolean;
  schneider: boolean;
  schneiderAnnounced: boolean;
  schwarz: boolean;
  schwarzAnnounced: boolean;
  ouvert: boolean;
}

/** Base values (ISkO 5.1.1). */
export const BASE_VALUES: Readonly<Record<Exclude<DeclKind, "null">, number>> = {
  diamonds: 9,
  hearts: 10,
  spades: 11,
  clubs: 12,
  grand: 24,
};

/** Fixed Null values (ISkO 5.1.2). */
export const NULL_VALUES = { plain: 23, hand: 35, ouvert: 46, ouvertHand: 59 } as const;

/** Points needed to win a suit or Grand game (ISkO 5.2.2: the 61st Auge wins). */
export const WIN_POINTS = 61;
/** A party with this many points or fewer is Schneider (ISkO 5.2.3, SkWO 8.8). */
export const SCHNEIDER_POINTS = 30;

// ─── Bid values ───────────────────────────────────────────────────────────────────────────────────────────

/**
 * Every possible game value from 18 to 264 (ISkO 3.3.1): suit games 9…12 × 2…18 cases, Grand 24 × 2…11, the four
 * Null values. 63 values: 18 20 22 23 24 27 30 33 35 36 40 44 45 46 48 50 54 55 59 60 … 216 240 264.
 */
export const BID_VALUES: readonly number[] = (() => {
  const set = new Set<number>([23, 35, 46, 59]);
  for (const base of [9, 10, 11, 12]) for (let m = 2; m <= 18; m++) set.add(base * m);
  for (let m = 2; m <= 11; m++) set.add(24 * m);
  return [...set].filter((v) => v >= 18).sort((a, b) => a - b);
})();

export const MIN_BID = 18;
export const MAX_BID = 264;

export function isBidValue(v: number): boolean {
  return BID_VALUES.includes(v);
}

/** The next bid value above `v` (18 for 0), or null above 264. */
export function nextBid(v: number): number | null {
  for (const b of BID_VALUES) if (b > v) return b;
  return null;
}

// ─── Declarations ─────────────────────────────────────────────────────────────────────────────────────────

/** Build a normalised declaration: suit/Grand ouvert → Hand + Schneider + Schwarz angesagt; Schwarz → Schneider. */
export function declaration(kind: DeclKind, mods: Partial<Omit<Declaration, "kind">> = {}): Declaration {
  return normalizeDeclaration({
    kind,
    hand: mods.hand ?? false,
    schneiderAnnounced: mods.schneiderAnnounced ?? false,
    schwarzAnnounced: mods.schwarzAnnounced ?? false,
    ouvert: mods.ouvert ?? false,
  });
}

export function normalizeDeclaration(d: Declaration): Declaration {
  if (d.kind === "null") return { kind: "null", hand: d.hand, schneiderAnnounced: false, schwarzAnnounced: false, ouvert: d.ouvert };
  const ouvert = d.ouvert;
  const schwarz = d.schwarzAnnounced || ouvert;
  const schneider = d.schneiderAnnounced || schwarz;
  return { kind: d.kind, hand: d.hand || ouvert, schneiderAnnounced: schneider, schwarzAnnounced: schwarz, ouvert };
}

export function sameDeclaration(a: Declaration, b: Declaration): boolean {
  return (
    a.kind === b.kind &&
    a.hand === b.hand &&
    a.schneiderAnnounced === b.schneiderAnnounced &&
    a.schwarzAnnounced === b.schwarzAnnounced &&
    a.ouvert === b.ouvert
  );
}

/** Fixed value of a Null declaration. */
export function nullValue(d: Pick<Declaration, "hand" | "ouvert">): number {
  if (d.ouvert) return d.hand ? NULL_VALUES.ouvertHand : NULL_VALUES.ouvert;
  return d.hand ? NULL_VALUES.hand : NULL_VALUES.plain;
}

export function baseValue(kind: DeclKind): number {
  return kind === "null" ? 0 : BASE_VALUES[kind];
}

/**
 * Why a declaration is not allowed now, or null when it is. `skatTaken`: the declarer picked up the skat.
 * - After picking up: no Hand, no announced levels, no suit/Grand ouvert (ISkO 3.4.4); Null ouvert is fine.
 * - Without picking up, the declaration is a Hand game.
 * - Null cannot carry Schneider/Schwarz announcements.
 * - A Null game whose fixed value is below the bid is "nicht mehr durchführbar" and invalid (ISkO 3.4.4); suit and
 *   Grand games may be declared even if they cannot reach the bid (ISkO 3.4.3) and are then lost as overbid.
 */
export function declarationError(raw: Declaration, ctx: { skatTaken: boolean; bid: number }): string | null {
  if (!(raw.kind === "null" || raw.kind in BASE_VALUES)) return `unknown game kind ${String(raw.kind)}`;
  if (raw.kind === "null" && (raw.schneiderAnnounced || raw.schwarzAnnounced)) return "Null has no Schneider/Schwarz";
  const d = normalizeDeclaration(raw);
  if ((d.schneiderAnnounced || d.schwarzAnnounced) && !d.hand) return "Schneider/Schwarz can only be announced in Hand games";
  if (ctx.skatTaken && d.hand) return "Hand, announcements and suit/Grand ouvert need an untouched skat";
  if (!ctx.skatTaken && !d.hand) return "without picking up the skat the game is a Hand game";
  if (d.kind === "null" && nullValue(d) < ctx.bid) return "this Null game does not reach the bid";
  return null;
}

// ─── Matadors ─────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Tops (Spitzen, ISkO 2.4) over the declarer's 12 cards (hand + skat; the skat counts even in Hand games, 2.4.2).
 * Suit games count up to 11 (four jacks and seven trump-suit cards), Grand up to 4.
 */
export function matadors(cards12: CardMask, kind: Exclude<DeclKind, "null">): Matadors {
  const order = playRules(kind).matadorOrder;
  const first = has(cards12, order[0]);
  let n = 1;
  while (n < order.length && has(cards12, order[n]) === first) n++;
  return { count: n, withTops: first };
}

// ─── Values ───────────────────────────────────────────────────────────────────────────────────────────────

const NO_LEVELS: Levels = { hand: false, schneider: false, schneiderAnnounced: false, schwarz: false, schwarzAnnounced: false, ouvert: false };

/** Number of cases ("Summe der Fälle", ISkO 5.3.2): matadors + 1 (game) + every level that counts. */
export function multiplier(matadorCount: number, levels: Levels): number {
  return (
    matadorCount +
    1 +
    (levels.hand ? 1 : 0) +
    (levels.schneider ? 1 : 0) +
    (levels.schneiderAnnounced ? 1 : 0) +
    (levels.schwarz ? 1 : 0) +
    (levels.schwarzAnnounced ? 1 : 0) +
    (levels.ouvert ? 1 : 0)
  );
}

/** Levels a declaration carries by itself (announced levels imply the achieved ones: Schwarz angesagt counts Schneider). */
export function announcedLevels(d: Declaration): Levels {
  if (d.kind === "null") return NO_LEVELS;
  const n = normalizeDeclaration(d);
  return {
    hand: n.hand,
    schneider: n.schneiderAnnounced,
    schneiderAnnounced: n.schneiderAnnounced,
    schwarz: n.schwarzAnnounced,
    schwarzAnnounced: n.schwarzAnnounced,
    ouvert: n.ouvert,
  };
}

/**
 * Value of a won game at the announced level plus the achieved extras (for the UI, bidding estimates and problems).
 * Null: fixed value, matadors and extras are ignored.
 */
export function declarationValue(
  d: Declaration,
  matadorCount: number,
  achieved: { schneider?: boolean; schwarz?: boolean } = {},
): number {
  if (d.kind === "null") return nullValue(d);
  const lv = announcedLevels(d);
  const schwarz = lv.schwarz || !!achieved.schwarz;
  const schneider = lv.schneider || !!achieved.schneider || schwarz;
  return BASE_VALUES[d.kind] * multiplier(matadorCount, { ...lv, schneider, schwarz });
}

/** Smallest multiple of the base value that reaches the bid (ISkO 5.4.1). */
export function overbidValue(base: number, bid: number): number {
  return base * Math.ceil(bid / base);
}

export type LossReason =
  /** Fewer than 61 points (suit/Grand). */
  | "points"
  /** Schneider announced (Hand) but the defenders got more than 30. */
  | "schneider-missed"
  /** Schwarz announced or ouvert, and the defenders took a trick. */
  | "schwarz-missed"
  /** The game value at the end stayed below the bid (ISkO 5.4). */
  | "overbid"
  /** Null: the declarer took a trick. */
  | "null-trick";

export interface SettleInput {
  declaration: Declaration;
  /** The declarer's 12 cards: hand at the start of play + skat (for matadors). */
  declarerCards: CardMask;
  bid: number;
  /** Card points of the declarer including the skat. */
  declarerPoints: number;
  declarerTricks: number;
  defenderTricks: number;
}

export interface Settlement {
  won: boolean;
  /** Single game value, positive, after the overbid adjustment (ISkO 5.4). Null: the fixed value. */
  value: number;
  overbid: boolean;
  reason: LossReason | null;
  base: number;
  /** Cases (matadors + game + levels); 0 for Null. */
  multiplier: number;
  matadors: Matadors | null;
  /** Levels counted in the value (null for Null). */
  levels: Levels | null;
  /** The losing party ended with 30 or fewer points (won: the defenders; lost: the declarer). */
  schneider: boolean;
  /** The losing party took no trick. */
  schwarz: boolean;
  /** Value as written in the list without house-rule factors: +value when won, −2 × value when lost (ISkO 5.3.4). */
  written: number;
}

/**
 * Settle a finished declared game (ISkO 5.2–5.4).
 *
 * Suit/Grand:
 * - On the cards the declarer wins with ≥ 61 points and, if announced, the defenders Schneider (≤ 30) / Schwarz (no
 *   trick). Ouvert counts as Schwarz angesagt (5.2.6).
 * - Won: Schneider/Schwarz count when the defenders are Schneider/Schwarz; announced levels count as announced.
 * - Lost: announced levels count ("mindestens in der angesagten Gewinnstufe verloren", 5.2.5); Schneider/Schwarz count
 *   when the declarer himself is Schneider (≤ 30 incl. skat) / took no trick. A level is never counted twice (no
 *   "Eigenschneider", 5.2.5).
 * - Overbid (5.4): if the value at the end is below the bid the game is lost and valued at the smallest multiple of
 *   the base value that reaches the bid — also a Hand game "won" on the cards whose skat held a top (5.4.2).
 * - Lost games are written double, Hand games included (5.3.4, since 1999).
 * Null: lost as soon as the declarer takes a trick; fixed values; lost = −2 × value.
 */
export function settle(input: SettleInput): Settlement {
  const d = normalizeDeclaration(input.declaration);
  if (d.kind === "null") {
    const value = nullValue(d);
    const won = input.declarerTricks === 0 && value >= input.bid;
    const reason: LossReason | null = input.declarerTricks > 0 ? "null-trick" : won ? null : "overbid";
    return {
      won,
      value,
      overbid: value < input.bid,
      reason,
      base: value,
      multiplier: 0,
      matadors: null,
      levels: null,
      schneider: false,
      schwarz: false,
      written: won ? value : -2 * value,
    };
  }
  const base = BASE_VALUES[d.kind];
  const mat = matadors(input.declarerCards, d.kind);
  const defenderPoints = 120 - input.declarerPoints;
  const announced = announcedLevels(d);
  const defSchneider = defenderPoints <= SCHNEIDER_POINTS;
  const defSchwarz = input.defenderTricks === 0;
  const declSchneider = input.declarerPoints <= SCHNEIDER_POINTS;
  const declSchwarz = input.declarerTricks === 0;

  let reason: LossReason | null = null;
  if (input.declarerPoints < WIN_POINTS) reason = "points";
  else if (announced.schwarzAnnounced && !defSchwarz) reason = "schwarz-missed";
  else if (announced.schneiderAnnounced && !defSchneider) reason = "schneider-missed";
  const wonOnCards = reason === null;

  const levels: Levels = wonOnCards
    ? { ...announced, schneider: announced.schneider || defSchneider, schwarz: announced.schwarz || defSchwarz }
    : { ...announced, schneider: announced.schneider || declSchneider, schwarz: announced.schwarz || declSchwarz };
  const mult = multiplier(mat.count, levels);
  let value = base * mult;
  const overbid = value < input.bid;
  if (overbid) {
    value = overbidValue(base, input.bid);
    if (wonOnCards) reason = "overbid";
  }
  const won = wonOnCards && !overbid;
  return {
    won,
    value,
    overbid,
    reason,
    base,
    multiplier: mult,
    matadors: mat,
    levels,
    schneider: wonOnCards ? defSchneider : declSchneider,
    schwarz: wonOnCards ? defSchwarz : declSchwarz,
    written: won ? value : -2 * value,
  };
}
