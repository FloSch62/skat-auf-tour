// Card play by the rules of thumb, without lookahead: the rule-based baseline plays the best-scored card, and the PIMC
// player uses the same scores to break ties between cards that its search values equally (so a decided game is still
// played sensibly: smear points on the partner's trick, keep tens guarded, do not give away Augen for nothing).
// Only SeatView information is used.
import { CARD_POINTS, JACKS, SUIT_MASKS, cardsOf, has, popcount } from "../rules/cards.ts";
import type { Card, CardMask } from "../rules/cards.ts";
import type { Seat } from "../rules/deal.ts";
import { beats } from "../rules/play.ts";
import type { PlayRules } from "../rules/play.ts";
import type { SeatView } from "../rules/view.ts";
import { voidMasks } from "../rules/view.ts";
import { nullRank } from "./handeval.ts";
import { playInfo } from "./knowledge.ts";
import type { PlayInfo } from "./knowledge.ts";

const TRUMP = 4;

export interface TableRead {
  info: PlayInfo;
  r: PlayRules;
  me: Seat;
  hand: CardMask;
  /** Cards not yet played and not in my hand (with the others or in the skat). */
  outstanding: CardMask;
  /** Per seat: classes it is known to be void in (as card masks). */
  voids: [CardMask, CardMask, CardMask];
  isDeclarer: boolean;
  /** Seat of my partner (null for the declarer and in Ramsch). */
  partner: Seat | null;
  /** Trick state. */
  pos: number;
  led: Card;
  winCard: Card;
  winSeat: Seat;
  trickPts: number;
}

export function readTable(v: SeatView, info: PlayInfo = playInfo(v)): TableRead {
  const r = info.rules;
  const me = v.seat;
  const hand = v.hand;
  const outstanding = ~v.played & ~hand;
  const voids = voidMasks(v);
  const decl = info.declarer;
  const isDeclarer = decl === me;
  const partner: Seat | null = decl === null || isDeclarer ? null : (([0, 1, 2] as Seat[]).find((s) => s !== me && s !== decl) ?? null);
  const pos = info.trick.length;
  let led = -1;
  let winCard = -1;
  let winSeat = info.leader;
  let trickPts = 0;
  if (pos > 0) {
    led = info.trick[0];
    winCard = led;
    for (let i = 0; i < pos; i++) {
      const c = info.trick[i];
      trickPts += CARD_POINTS[c];
      if (i > 0 && beats(r, c, winCard)) {
        winCard = c;
        winSeat = ((info.leader + i) % 3) as Seat;
      }
    }
  }
  return { info, r, me, hand, outstanding, voids, isDeclarer, partner, pos, led, winCard, winSeat, trickPts };
}

/** Is `c` higher than every outstanding card of its class (a sure winner inside the class)? */
function topOfClass(t: TableRead, c: Card): boolean {
  const cls = t.r.classMask[t.r.classOf[c]];
  const others = cls & t.outstanding;
  let m = others;
  while (m !== 0) {
    const low = m & -m;
    m ^= low;
    const o = 31 - Math.clz32(low);
    if (t.r.order[o] > t.r.order[c]) return false;
  }
  return true;
}

function classCards(t: TableRead, c: Card, mask: CardMask): CardMask {
  return mask & t.r.classMask[t.r.classOf[c]];
}

/** Cards in `mask` of the class of `c` that are stronger than `c`. */
function strongerIn(t: TableRead, c: Card, mask: CardMask): number {
  let n = 0;
  let m = classCards(t, c, mask);
  while (m !== 0) {
    const low = m & -m;
    m ^= low;
    if (t.r.order[31 - Math.clz32(low)] > t.r.order[c]) n++;
  }
  return n;
}

/** May the seat still hold cards of this class (not known void)? */
function mayHold(t: TableRead, seat: Seat, cls: number): boolean {
  return (t.voids[seat] & t.r.classMask[cls]) !== t.r.classMask[cls] && (t.r.classMask[cls] & t.outstanding) !== 0;
}

/** Rule-of-thumb score of each legal card (higher = better). */
export function heuristicScores(v: SeatView, legal: readonly Card[], t: TableRead = readTable(v)): number[] {
  if (t.info.kind === "null") return legal.map((c) => nullScore(t, c));
  if (t.info.kind === "ramsch") return legal.map((c) => ramschScore(t, c));
  return legal.map((c) => (t.pos === 0 ? leadScore(t, c) : followScore(t, c)));
}

/** The card the rules of thumb would play. */
export function heuristicCard(v: SeatView, legal: readonly Card[]): Card {
  const s = heuristicScores(v, legal);
  let best = 0;
  for (let i = 1; i < legal.length; i++) if (s[i] > s[best]) best = i;
  return legal[best];
}

// ─── Suit games and Grand ─────────────────────────────────────────────────────────────────────────────────

function leadScore(t: TableRead, c: Card): number {
  const r = t.r;
  const isTrump = r.classOf[c] === TRUMP;
  const pts = CARD_POINTS[c];
  const top = topOfClass(t, c);
  const trumpsOut = r.trumps & t.outstanding;
  const myTrumps = t.hand & r.trumps;
  const cls = r.classOf[c];
  const lenInClass = popcount(classCards(t, c, t.hand));
  if (t.isDeclarer) {
    if (isTrump) {
      if (trumpsOut === 0) return 10 - pts; // no need to pull trumps any more
      // Pull trumps: from the top when holding the best one, else a middle trump if long in trumps.
      if (top) return 80 + r.order[c];
      if (popcount(myTrumps) >= popcount(trumpsOut) + 1) return 50 - pts * 0.5 - r.order[c] * 0.3;
      return 20 - pts;
    }
    // Side suit.
    if (top) {
      // Cash a sure winner once the defenders are out of trumps, or an ace before they can ruff it.
      const defendersVoid = t.info.declarer !== null && opponentsVoid(t, cls);
      if (trumpsOut === 0) return 70 + pts;
      return defendersVoid ? 5 : 45 + pts * 0.5 - (lenInClass >= 4 ? 5 : 0);
    }
    // A low card from a long side suit gives the lead away cheaply.
    return 25 + lenInClass * 2 - pts * 2;
  }
  // Defender leading.
  if (isTrump) {
    // Defenders rarely lead trumps; a top trump can pull the declarer's trumps in Grand.
    return top && t.info.kind === "grand" ? 30 : 5 - pts * 0.5;
  }
  const declVoid = t.info.declarer !== null && t.voids[t.info.declarer] & r.classMask[cls];
  if (declVoid) return 8 - pts; // the declarer would trump in
  if (top && pts >= 10) return 60 + pts; // cash the ace (or a ten after the ace)
  const tenHere = has(t.hand, suitCard(c, 5));
  const aceOut = has(t.outstanding, suitCard(c, 6));
  // Never lead from a ten that the ace can still catch, and never lead the ten itself.
  if (tenHere && aceOut) return 10 - pts;
  // Short suit (singleton) to trump later; otherwise a low card toward partner.
  const short = lenInClass === 1 ? 6 : 0;
  // Declarer in the middle (he plays right after me): long suit; declarer last: short suit.
  const declNext = t.info.declarer === (t.me + 1) % 3;
  return 30 + (declNext ? lenInClass * 2 : short) - pts * 1.5;
}

function suitCard(c: Card, slot: number): Card {
  const s = c >= 28 ? c - 28 : (c / 7) | 0;
  return s * 7 + slot;
}

function opponentsVoid(t: TableRead, cls: number): boolean {
  const decl = t.info.declarer;
  if (decl === null) return false;
  for (const s of [0, 1, 2] as Seat[]) {
    if (s === t.me) continue;
    if (!(t.voids[s] & t.r.classMask[cls])) return false;
  }
  return true;
}

function followScore(t: TableRead, c: Card): number {
  const r = t.r;
  const pts = CARD_POINTS[c];
  const isTrump = r.classOf[c] === TRUMP;
  const wins = beats(r, c, t.winCard);
  const last = t.pos === 2;
  const partnerWins = t.partner !== null && t.winSeat === t.partner;
  const followsLed = r.classOf[c] === r.classOf[t.led];
  // Keep a guarded ten: do not break up A-10 / K-10 for nothing.
  const tenGuardPenalty = !isTrump && c % 7 !== 5 && has(t.hand, suitCard(c, 5)) && popcount(classCards(t, c, t.hand)) === 2 ? 4 : 0;
  if (partnerWins) {
    // In the middle seat the declarer plays after me: smear only when he can hardly be void in that suit (enough of it
    // still out) and is not known to be void.
    const ledOut = popcount(classCards(t, t.led, t.outstanding));
    const safe = last || (!mayBeatPartner(t) && (r.classOf[t.led] === TRUMP || r.classOf[t.winCard] === TRUMP || ledOut >= 3));
    if (safe) {
      // Schmieren: give the partner Augen, but keep trumps and sure winners.
      const keep = (isTrump ? 8 : 0) + (topOfClass(t, c) && pts >= 10 && !followsLed ? 6 : 0);
      return 50 + pts * 2 - keep;
    }
    // The declarer is still to play and could take it: stay cheap, or take over with a sure winner.
    if (wins && topOfClass(t, c)) return 40 + pts;
    return 30 - pts * 2 - tenGuardPenalty;
  }
  // An opponent (or, as declarer, a defender) wins at the moment.
  if (wins) {
    const worth = t.trickPts + pts;
    if (last) {
      // Take it if it carries Augen; trump in only when worth it; win with the most Augen that is safe to give.
      const cost = isTrump && !followsLed ? (pts >= 10 ? 14 : 6) + r.order[c] * 0.5 : 0;
      return 60 + worth - cost - (isTrump ? r.order[c] * 0.3 : 0);
    }
    // Middle position: win if this card is a sure winner, otherwise only with a cheap card when it is worth it.
    if (topOfClass(t, c)) return 55 + pts;
    if (t.isDeclarer) return 35 + t.trickPts - pts - r.order[c];
    return 32 + t.trickPts * 0.5 - pts;
  }
  // Cannot win: give as few Augen as possible; from a short side suit to make a void.
  const shortBonus = !followsLed && !isTrump && popcount(classCards(t, c, t.hand)) === 1 && pts === 0 ? 3 : 0;
  return 20 - pts * 2.5 - (isTrump ? 4 : 0) - tenGuardPenalty + shortBonus;
}

function declarerCanTrump(t: TableRead): boolean {
  const d = t.info.declarer;
  if (d === null || d === t.me) return false;
  const ledCls = t.r.classOf[t.led];
  if (ledCls === TRUMP) return false;
  const declVoidInLed = (t.voids[d] & t.r.classMask[ledCls]) !== 0;
  const declMayHaveTrump = (t.voids[d] & t.r.trumps) !== t.r.trumps;
  return declVoidInLed && declMayHaveTrump;
}

/** Can the player after me (the declarer) still beat my partner's winning card? Rough: an outstanding higher card. */
function mayBeatPartner(t: TableRead): boolean {
  return strongerIn(t, t.winCard, t.outstanding) > 0 || declarerCanTrump(t);
}

// ─── Null ─────────────────────────────────────────────────────────────────────────────────────────────────

function nullBeats(a: Card, w: Card): boolean {
  const sa = a >= 28 ? a - 28 : (a / 7) | 0;
  const sw = w >= 28 ? w - 28 : (w / 7) | 0;
  return sa === sw && nullRank(a) > nullRank(w);
}

function nullScore(t: TableRead, c: Card): number {
  const rank = nullRank(c);
  const decl = t.info.declarer;
  if (t.isDeclarer) {
    if (t.pos === 0) {
      // Lead the lowest card of a suit where it cannot win: lowest rank first, prefer suits the others still hold.
      return 40 - rank * 4;
    }
    const follows = t.r.classOf[c] === t.r.classOf[t.led];
    if (!follows) return 50 + rank * 2; // void: discard a dangerous high card
    if (!nullBeats(c, t.winCard)) return 60 + rank; // duck as high as possible (get rid of danger)
    return 10 - rank; // must go over: as low as possible, the last player may still overtake
  }
  // Defenders: make the declarer take a trick.
  if (t.pos === 0) {
    // Lead low in a suit the declarer still holds.
    const declVoid = decl !== null && (t.voids[decl] & t.r.classMask[t.r.classOf[c]]) === t.r.classMask[t.r.classOf[c]];
    return (declVoid ? 0 : 30) - rank * 3;
  }
  const declWinning = t.winSeat === decl;
  if (declWinning) {
    // Stay under the declarer's card if possible.
    if (t.r.classOf[c] === t.r.classOf[t.led]) return nullBeats(c, t.winCard) ? 5 - rank : 40 + rank;
    return 30 + rank;
  }
  // Partner (or I) winning, declarer still to play after me: play low so he must go over.
  if (decl !== null && t.pos === 1) return t.r.classOf[c] === t.r.classOf[t.led] ? 30 - rank * 2 : 20 + rank;
  return 20 + rank;
}

// ─── Ramsch ───────────────────────────────────────────────────────────────────────────────────────────────

function ramschScore(t: TableRead, c: Card): number {
  const r = t.r;
  const pts = CARD_POINTS[c];
  const isTrump = r.classOf[c] === TRUMP;
  if (t.pos === 0) {
    // Lead low cards that others can beat; never a jack early.
    const higherOut = strongerIn(t, c, t.outstanding);
    return 30 + Math.min(higherOut, 4) * 3 - pts * 2 - (isTrump ? 15 : 0);
  }
  const follows = r.classOf[c] === r.classOf[t.led];
  const wins = beats(r, c, t.winCard);
  if (!wins) {
    // Stay under: as high as possible (get rid of danger), dumping Augen when void.
    if (follows) return 60 + r.order[c] * 2 + (pts >= 10 ? 4 : 0);
    return 55 + pts * 1.5 + (isTrump ? 6 : 0);
  }
  // This card would win.
  const last = t.pos === 2;
  if (last) {
    // Forced to take it: take it with the highest card (unload danger), but few Augen.
    return 20 + r.order[c] - pts;
  }
  return 10 - pts - t.trickPts * 0.5;
}

/** Augen of a card (re-export for scoring helpers). */
export function augenOf(c: Card): number {
  return CARD_POINTS[c];
}

export { cardsOf, JACKS, SUIT_MASKS };
