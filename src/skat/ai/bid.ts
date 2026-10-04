// Bidding and the Hand decision (contract §5.3 "Reizen"). For every promising game kind the figure estimates the
// chance to win with its ten cards: worlds with a random skat and random hands for the other two are dealt, the skat
// is picked up and two cards are laid away by the rules of thumb, and the open-card solver decides the game. The
// figure bids up to the highest value whose chance clears its threshold. The valuation depends only on the hand and
// the seat position (seeded from them), so it is cached and every bidding step of one game agrees with the last.
import { Rng, hashString } from "../../core/rng.ts";
import { ALL_CARDS, JACKS, cardsOf, popcount, pointsOf } from "../rules/cards.ts";
import type { Card, CardMask } from "../rules/cards.ts";
import type { HandPosition } from "../rules/deal.ts";
import { seegerFabian } from "../rules/list.ts";
import { BID_VALUES, declaration, declarationValue, matadors, nullValue, overbidValue, BASE_VALUES } from "../rules/value.ts";
import type { DeclKind, Declaration } from "../rules/value.ts";
import { pointSolver, trickSolver } from "./dds.ts";
import { SUIT_KINDS, bestThumbDiscard, estimateKinds, grandScore, nullDanger, suitScore } from "./handeval.ts";
import type { BidStyle } from "./persona.ts";

/** Per sample results for one game kind. */
export interface KindValuation {
  kind: DeclKind;
  /** Won on the cards (≥ 61, Null: no trick) per sample. */
  win: boolean[];
  /** Defenders Schneider (≥ 90 incl. skat) per sample (suit/Grand only; false when not tested). */
  schneider: boolean[];
  /** Game value per sample (matadors over hand + skat, without Schneider). */
  value: number[];
}

export interface HandValuation {
  hand: CardMask;
  position: HandPosition;
  samples: number;
  /** Games with the skat picked up. */
  pickup: KindValuation[];
}

/** Node cap per search in valuations; a search that hits it counts as half a win (alternating, deterministic). */
export const VALUATION_NODES = 220_000;
const NODE_LIMIT = VALUATION_NODES;

/**
 * Open-card play is pessimistic for the declarer: defenders who see every card defend perfectly. Measured against the
 * PIMC card play of a medium figure (docs/notes-ai.md), "the solver gives the declarer at least 61 − 9 Augen" predicts
 * real wins far better than "at least 61". Valuations (bidding, Hand, discard) therefore test 52 and 81 instead of 61
 * and 90; the card play itself always uses the true thresholds.
 */
export const VALUATION_SLACK = 9;
export const WIN_TEST = 61 - VALUATION_SLACK;
export const SCHNEIDER_TEST = 90 - VALUATION_SLACK;

/** Kinds worth valuing for this hand (rules of thumb, relaxed by the figure's preferences). */
export function candidateKinds(cards: CardMask, bias: Partial<Record<DeclKind, number>> = {}, max = 3): DeclKind[] {
  const scored: { kind: DeclKind; s: number }[] = [];
  for (let s = 0; s < 4; s++) {
    const trumps = popcount(cards & (JACKS | (0x7f << (7 * s))));
    const sc = suitScore(cards, s);
    if (trumps >= 4 || (trumps >= 3 && sc >= 5)) scored.push({ kind: SUIT_KINDS[s], s: sc - (bias[SUIT_KINDS[s]] ?? 0) * 10 });
  }
  const nJ = popcount(cards & JACKS);
  const g = grandScore(cards);
  const gBias = bias.grand ?? 0;
  if (nJ >= 2 || g >= 4.5 || (gBias < -0.1 && nJ >= 1)) scored.push({ kind: "grand", s: g + 0.5 - gBias * 10 });
  const nd = nullDanger(cards);
  const nBias = bias.null ?? 0;
  if (nd.unsafeCards <= (nBias < -0.1 ? 4 : 3) && nd.unsafeSuits <= 2) scored.push({ kind: "null", s: 7 - nd.unsafeCards * 1.5 - nBias * 10 });
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, max).map((x) => x.kind);
}

function shuffled(rng: Rng, cards: Card[]): Card[] {
  return rng.shuffle(cards.slice());
}

/**
 * Value a ten-card hand at a seat position: `samples` worlds, each kind decided by the open-card solver after picking
 * up the skat and laying away two cards by the rules of thumb.
 */
export function valueHand(hand: CardMask, position: HandPosition, style: BidStyle): HandValuation {
  const kinds = candidateKinds(hand, style.kindBias);
  const rng = new Rng(hashString(`bid/${hand}/${position}/${style.samples}`));
  const unknown = cardsOf(ALL_CARDS & ~hand);
  const pickup: KindValuation[] = kinds.map((kind) => ({ kind, win: [], schneider: [], value: [] }));
  const ps = pointSolver();
  ps.setHorizon(Infinity);
  const ts = trickSolver();
  const others = ([0, 1, 2] as HandPosition[]).filter((p) => p !== position);
  for (let i = 0; i < style.samples; i++) {
    const deck = shuffled(rng, unknown);
    let skat = 0;
    skat |= 1 << deck[0];
    skat |= 1 << deck[1];
    const hands = [0, 0, 0];
    for (let k = 0; k < 10; k++) hands[others[0]] |= 1 << deck[2 + k];
    for (let k = 0; k < 10; k++) hands[others[1]] |= 1 << deck[12 + k];
    const twelve = hand | skat;
    for (const kv of pickup) {
      const pair = bestThumbDiscard(twelve, kv.kind);
      const discard = (1 << pair[0]) | (1 << pair[1]);
      hands[position] = twelve & ~discard;
      if (kv.kind === "null") {
        ts.load({ kind: "null", hands, leader: 0, solo: position }, "none");
        const w = ts.solve(NODE_LIMIT);
        // Slack for Null: the solver plays it like Null ouvert; a hand without an unsafe card wins a plain Null.
        kv.win.push((!ts.aborted && w) || nullDanger(hands[position]).unsafeCards === 0);
        kv.schneider.push(false);
        kv.value.push(nullValue({ hand: false, ouvert: false }));
      } else {
        ps.load({ kind: kv.kind, hands, leader: 0, solo: position }, true);
        const need = WIN_TEST - pointsOf(discard);
        const w = ps.atLeast(need, NODE_LIMIT);
        kv.win.push(ps.aborted ? i % 2 === 0 : w);
        kv.schneider.push(false);
        kv.value.push(declarationValue(declaration(kv.kind), matadors(twelve, kv.kind).count));
      }
    }
  }
  return { hand, position, samples: style.samples, pickup };
}

const CACHE = new Map<string, HandValuation>();

/** Cached `valueHand` (pure function of its inputs). */
export function handValuation(hand: CardMask, position: HandPosition, style: BidStyle): HandValuation {
  const key = `${hand}/${position}/${style.samples}/${JSON.stringify(style.kindBias)}`;
  let v = CACHE.get(key);
  if (!v) {
    v = valueHand(hand, position, style);
    if (CACHE.size > 200) CACHE.clear();
    CACHE.set(key, v);
  }
  return v;
}

/** Share of samples where the kind wins and is worth at least `bid`. */
export function chanceAt(kv: KindValuation, bid: number): number {
  let n = 0;
  for (let i = 0; i < kv.win.length; i++) if (kv.win[i] && kv.value[i] >= bid) n++;
  return kv.win.length ? n / kv.win.length : 0;
}

function baseOf(kind: DeclKind): number {
  return kind === "null" ? 0 : BASE_VALUES[kind];
}

/**
 * The highest bid value the figure goes to with this hand (0 = passes at once). `seedSalt` makes the "overbid on
 * purpose" roll deterministic per game.
 */
export function bidLimit(val: HandValuation, style: BidStyle, seedSalt = 0): number {
  let limit = 0;
  for (const kv of val.pickup) {
    const theta = style.threshold + (style.kindBias[kv.kind] ?? 0);
    if (kv.kind === "null") {
      // Null 23; Null ouvert 46 when the solver finds no way to give the declarer a trick in (almost) every world.
      const p = chanceAt(kv, 0);
      const v = p >= Math.max(0.95, theta) ? 46 : p >= theta ? 23 : 0;
      if (v > limit) limit = v;
      continue;
    }
    for (const b of BID_VALUES) {
      if (chanceAt(kv, b) < theta) break;
      if (b > limit) limit = b;
    }
  }
  if (limit > 0 && style.overbidChance > 0) {
    const r = new Rng(hashString(`over/${val.hand}/${seedSalt}`));
    if (r.next() < style.overbidChance) {
      const i = BID_VALUES.indexOf(limit);
      limit = BID_VALUES[Math.min(BID_VALUES.length - 1, i + style.overbidSteps)];
    }
  }
  return limit;
}

// ─── Expected list points ─────────────────────────────────────────────────────────────────────────────────

/** List points (Seeger-Fabian) for the declarer of a game with value `value` at bid `bid`, won on the cards or not. */
export function listFor(kind: DeclKind, value: number, bid: number, won: boolean): number {
  const base = kind === "null" ? value : BASE_VALUES[kind];
  if (value < bid) {
    // Overbid: lost at the smallest multiple of the base value that reaches the bid (Null cannot be declared then).
    const ov = kind === "null" ? value : overbidValue(base, bid);
    return seegerFabian(0, false, -2 * ov)[0];
  }
  return seegerFabian(0, won, won ? value : -2 * value)[0];
}

/** Expected list points of each picked-up kind at the given bid. */
export function pickupEV(val: HandValuation, bid: number): { kind: DeclKind; ev: number; chance: number }[] {
  return val.pickup.map((kv) => {
    let ev = 0;
    for (let i = 0; i < kv.win.length; i++) {
      const value = kv.value[i] + (kv.win[i] && kv.schneider[i] ? baseOf(kv.kind) : 0);
      ev += kv.kind === "null" && value < bid ? -1000 : listFor(kv.kind, value, bid, kv.win[i]);
    }
    return { kind: kv.kind, ev: kv.win.length ? ev / kv.win.length : -999, chance: chanceAt(kv, bid) };
  });
}

// ─── Hand games ───────────────────────────────────────────────────────────────────────────────────────────

export interface HandGameChoice {
  declaration: Declaration;
  ev: number;
  chance: number;
}

/**
 * The best Hand game for ten cards at this bid, valued like `valueHand` but without picking up the skat (the unseen
 * skat counts for the Augen and the matadors). Announcements only when the solver says they are (nearly) certain.
 */
export function bestHandGame(hand: CardMask, position: HandPosition, bid: number, style: BidStyle, samples: number): HandGameChoice | null {
  const kinds = candidateKinds(hand, style.kindBias, 3);
  if (!kinds.length) return null;
  const rng = new Rng(hashString(`hand/${hand}/${position}/${samples}`));
  const unknown = cardsOf(ALL_CARDS & ~hand);
  const others = ([0, 1, 2] as HandPosition[]).filter((p) => p !== position);
  const ps = pointSolver();
  ps.setHorizon(Infinity);
  const ts = trickSolver();
  type Acc = { kind: DeclKind; win: number; sch: number; strict: number; schwarz: number; n: number; values: number[]; wins: boolean[]; schs: boolean[]; stricts: boolean[] };
  const acc: Acc[] = kinds.map((kind) => ({ kind, win: 0, sch: 0, strict: 0, schwarz: 0, n: 0, values: [], wins: [], schs: [], stricts: [] }));
  for (let i = 0; i < samples; i++) {
    const deck = shuffled(rng, unknown);
    const skat = (1 << deck[0]) | (1 << deck[1]);
    const hands = [0, 0, 0];
    hands[position] = hand;
    for (let k = 0; k < 10; k++) hands[others[0]] |= 1 << deck[2 + k];
    for (let k = 0; k < 10; k++) hands[others[1]] |= 1 << deck[12 + k];
    for (const a of acc) {
      a.n++;
      if (a.kind === "null") {
        ts.load({ kind: "null", hands, leader: 0, solo: position }, "none");
        const dd = ts.solve(NODE_LIMIT) && !ts.aborted;
        const w = dd || nullDanger(hand).unsafeCards === 0;
        if (dd) a.strict++;
        if (w) a.win++;
        a.wins.push(w);
        a.schs.push(false);
        a.values.push(35);
        continue;
      }
      ps.load({ kind: a.kind, hands, leader: 0, solo: position }, true);
      const sk = pointsOf(skat);
      const w0 = ps.atLeast(WIN_TEST - sk, NODE_LIMIT);
      const w = ps.aborted ? i % 2 === 0 : w0;
      const sch = w && ps.atLeast(SCHNEIDER_TEST - sk, NODE_LIMIT) && !ps.aborted;
      // An announcement must hold against perfect defence: the strict 90 (no slack).
      const strict = sch && ps.atLeast(90 - sk, NODE_LIMIT) && !ps.aborted;
      if (w) a.win++;
      if (sch) a.sch++;
      if (strict) a.strict++;
      const mat = matadors(hand | skat, a.kind).count;
      a.values.push(mat);
      a.wins.push(w);
      a.schs.push(sch);
      a.stricts.push(strict);
      if (strict) {
        ts.load({ kind: a.kind, hands, leader: 0, solo: position }, "all");
        if (ts.solve(NODE_LIMIT) && !ts.aborted) a.schwarz++;
      }
    }
  }
  let best: HandGameChoice | null = null;
  for (const a of acc) {
    if (a.kind === "null") {
      const chance = a.win / a.n;
      // Ouvert only when the solver (which plays it open anyway) finds no hole in any world.
      const ouvert = a.strict === a.n && a.n >= 12;
      const d = declaration("null", { hand: true, ouvert });
      const value = nullValue(d);
      if (value < bid) continue;
      const ev = chance * listFor("null", value, bid, true) + (1 - chance) * listFor("null", value, bid, false);
      const pref = chance >= (style.preferMinChance ?? 0.35) ? (style.prefer?.null ?? 0) : 0;
      if (!best || ev + pref > best.ev) best = { declaration: d, ev: ev + pref, chance };
      continue;
    }
    const variants: Declaration[] = [declaration(a.kind, { hand: true })];
    if (a.strict / a.n >= style.schneiderAnnounce) variants.push(declaration(a.kind, { hand: true, schneiderAnnounced: true }));
    // Schwarz angesagt only when the solver takes every trick in every world; then ouvert (open, one level more) is
    // just as safe: the solver plays with open cards anyway.
    if (a.schwarz === a.n && a.n >= 12) {
      variants.push(declaration(a.kind, { hand: true, schwarzAnnounced: true }));
      if (a.n >= 16) variants.push(declaration(a.kind, { ouvert: true }));
    }
    for (const d of variants) {
      let ev = 0;
      let wins = 0;
      for (let i = 0; i < a.n; i++) {
        const needSch = d.schneiderAnnounced;
        const needSchwarz = d.schwarzAnnounced;
        const won = needSchwarz ? a.schwarz === a.n : needSch ? a.stricts[i] : a.wins[i];
        const value = declarationValue(d, a.values[i], { schneider: a.schs[i] && won });
        ev += listFor(a.kind, value, bid, won);
        if (won && value >= bid) wins++;
      }
      ev = ev / a.n + (wins / a.n >= (style.preferMinChance ?? 0.35) ? (style.prefer?.[a.kind] ?? 0) : 0);
      if (!best || ev > best.ev) best = { declaration: d, ev, chance: wins / a.n };
    }
  }
  return best;
}

/** Re-exported for tools (estimates without lookahead). */
export { estimateKinds };
