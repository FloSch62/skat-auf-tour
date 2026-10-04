// Worlds for Perfect-Information Monte Carlo: random distributions of the unknown cards that fit everything the seat
// knows (own hand, played cards, shown voids, open cards, the skat it saw), weighted by what the bidding, the
// declaration and the discard say about the other hands — the way a club player reads the table. Only SeatView data
// is used (contract §0.3). Deterministic for a given Rng.
import type { Rng } from "../../core/rng.ts";
import { JACKS, SUIT_MASKS, cardsOf, has, popcount } from "../rules/cards.ts";
import type { Card, CardMask } from "../rules/cards.ts";
import { positionOf } from "../rules/deal.ts";
import type { HandPosition, Seat } from "../rules/deal.ts";
import { declarationValue, matadors } from "../rules/value.ts";
import type { DeclKind } from "../rules/value.ts";
import { hiddenCounts, unknownCards, voidMasks } from "../rules/view.ts";
import type { SeatView } from "../rules/view.ts";
import { grandScore, nullDanger, thumbBid, trumpMask, trumpSuitOf } from "./handeval.ts";
import { bidFacts } from "./knowledge.ts";
import type { BidFacts } from "./knowledge.ts";

export interface World {
  hands: [CardMask, CardMask, CardMask];
  skat: CardMask;
  /** How many resampled copies this world stands for. */
  mult: number;
}

export interface InferenceOptions {
  /** Use the bidding (passes and bids) of the other seats. */
  bidding: boolean;
  /** Use the declared game and the declarer's discard. */
  declaration: boolean;
  /** Respect shown voids in trumps (a careless player forgets who is out of trumps). */
  trumpVoids: boolean;
}

export const FULL_INFERENCE: InferenceOptions = { bidding: true, declaration: true, trumpVoids: true };

/** One random world with explicit void masks (like rules/view.ts `sampleWorld`, voids passed in). */
export function sampleWithVoids(
  v: SeatView,
  voids: readonly CardMask[],
  rng: Rng,
  tries = 60,
): { hands: [CardMask, CardMask, CardMask]; skat: CardMask } | null {
  const counts = hiddenCounts(v);
  const unknown = cardsOf(unknownCards(v));
  const base: [CardMask, CardMask, CardMask] = [0, 0, 0];
  base[v.seat] = v.hand;
  if (v.declarer !== null && v.declarer !== v.seat) base[v.declarer] |= v.openHand;
  const knownSkat = v.skat ?? 0;
  const opts: { c: Card; slots: number[] }[] = unknown.map((c) => {
    const slots: number[] = [];
    for (let s = 0; s < 3; s++) if (counts.seats[s] > 0 && !has(voids[s], c)) slots.push(s);
    if (counts.skat > 0) slots.push(3);
    return { c, slots };
  });
  for (let attempt = 0; attempt < tries; attempt++) {
    const cap = [counts.seats[0], counts.seats[1], counts.seats[2], counts.skat];
    const hands: [CardMask, CardMask, CardMask] = [base[0], base[1], base[2]];
    let skat = knownSkat;
    const order = rng.shuffle(opts.slice()).sort((a, b) => a.slots.length - b.slots.length);
    let ok = true;
    for (const { c, slots } of order) {
      let total = 0;
      for (const s of slots) total += cap[s];
      if (total === 0) {
        ok = false;
        break;
      }
      let r = rng.next() * total;
      let pick = -1;
      for (const s of slots) {
        if (cap[s] === 0) continue;
        r -= cap[s];
        if (r < 0) {
          pick = s;
          break;
        }
      }
      if (pick < 0) pick = slots.find((s) => cap[s] > 0)!;
      cap[pick]--;
      if (pick === 3) skat |= 1 << c;
      else hands[pick] |= 1 << c;
    }
    if (ok) return { hands, skat };
  }
  return null;
}

/** Cards each seat has played (finished tricks and the current trick). */
export function playedBySeat(v: SeatView): [CardMask, CardMask, CardMask] {
  const out: [CardMask, CardMask, CardMask] = [0, 0, 0];
  for (const t of v.tricks) for (let i = 0; i < 3; i++) out[(t.leader + i) % 3] |= 1 << t.cards[i];
  for (let i = 0; i < v.trick.length; i++) out[(v.trickLeader + i) % 3] |= 1 << v.trick[i];
  return out;
}

/** How plausible the declarer's holding is for the declared game (start-of-play ten cards + the skat). */
function declarerWeight(kind: DeclKind, ten: CardMask, skat: CardMask, bid: number, hand: boolean): number {
  let w = 1;
  if (kind === "null") {
    const d = nullDanger(ten);
    w *= d.unsafeCards === 0 ? 1 : d.unsafeCards === 1 ? 0.55 : d.unsafeCards === 2 ? 0.2 : 0.05;
    return w;
  }
  const trumps = trumpMask(kind);
  const twelve = ten | skat;
  // The declared value usually reaches the bid (players rarely declare a game they know is overbid).
  const m = matadors(twelve, kind);
  const value = declarationValue({ kind, hand, schneiderAnnounced: false, schwarzAnnounced: false, ouvert: false }, m.count);
  if (value < bid) w *= 0.08;
  if (kind === "grand") {
    const nJ = popcount(ten & JACKS);
    w *= nJ >= 3 ? 1 : nJ === 2 ? 0.8 : nJ === 1 ? 0.2 : 0.04;
    const g = grandScore(ten);
    w *= g >= 6.5 ? 1 : g >= 5 ? 0.6 : 0.25;
  } else {
    const nT = popcount(ten & trumps);
    w *= nT >= 6 ? 1 : nT === 5 ? 0.75 : nT === 4 ? 0.25 : nT === 3 ? 0.05 : 0.01;
    const nJ = popcount(ten & JACKS);
    if (nJ === 0) w *= 0.4;
  }
  if (!hand) {
    // Pushed cards: almost never jacks or trumps; rarely aces.
    const sk = skat;
    const t = popcount(sk & trumps);
    if (sk & JACKS) w *= 0.03;
    else if (t) w *= t === 1 ? 0.15 : 0.03;
    for (let s = 0; s < 4; s++) if (has(sk, s * 7 + 6) && !(trumps & SUIT_MASKS[s])) w *= kind === "grand" ? 0.3 : 0.5;
  }
  return w;
}

/** How plausible a seat's original ten cards are given what it said in the bidding. */
export function bidWeight(ten: CardMask, pos: HandPosition, facts: BidFacts, seat: Seat, isDeclarer: boolean): number {
  let w = 1;
  const refused = facts.refused[seat];
  const reached = facts.reached[seat];
  if (refused !== Infinity) {
    // He passed: hands that a careful player would still have bid are unlikely (soft: styles differ).
    const careful = thumbBid(ten, pos, 0.6);
    if (careful >= refused) w *= careful >= refused * 1.5 ? 0.12 : 0.3;
  }
  if (reached > 0 && !isDeclarer) {
    // He bid this far: hands without any game are unlikely (bold reading, he may have bid on the skat).
    const bold = thumbBid(ten, pos, -1.2);
    if (bold === 0) w *= 0.25;
    else if (bold < reached) w *= 0.6;
  }
  return w;
}

/** A read from the card play: `seat` led the King of a plain suit while Ace and Ten were still out. */
export interface KingLead {
  seat: Seat;
  ten: Card;
  suit: CardMask;
}

/**
 * Classic table reads from the play so far. Leading the King of a plain suit while the Ace and the Ten are out means,
 * almost always, "I hold the Ten and want the Ace out" (or the King was alone).
 */
export function playReads(v: SeatView): KingLead[] {
  const out: KingLead[] = [];
  if (!v.kind || v.kind === "null" || v.kind === "ramsch") return out;
  const trumps = trumpMask(v.kind);
  let before = 0;
  const visit = (leader: Seat, cards: readonly Card[]) => {
    const led = cards[0];
    if (led < 28 && led % 7 === 4 && !(trumps & (1 << led)) && leader !== v.seat) {
      const suit = (led / 7) | 0;
      const ace = suit * 7 + 6;
      const ten = suit * 7 + 5;
      const out10 = !(before & (1 << ten)) && !(v.hand & (1 << ten));
      const outA = !(before & (1 << ace));
      if (out10 && outA) out.push({ seat: leader, ten, suit: SUIT_MASKS[suit] });
    }
    for (const c of cards) before |= 1 << c;
  };
  for (const t of v.tricks) visit(t.leader, t.cards);
  if (v.trick.length) visit(v.trickLeader, v.trick);
  return out;
}

/**
 * Weight of a full world for the viewer: bidding of every other seat, the declared game, the discard and the reads
 * from the card play. The world's hands are the current hands; original hands are rebuilt with the played cards.
 */
export function worldWeight(
  v: SeatView,
  world: { hands: readonly CardMask[]; skat: CardMask },
  played: readonly CardMask[],
  facts: BidFacts,
  opts: InferenceOptions,
  reads: readonly KingLead[] = [],
): number {
  let w = 1;
  for (const r of reads) {
    const ten = world.hands[r.seat] | played[r.seat];
    if (ten & (1 << r.ten)) continue;
    w *= popcount(ten & r.suit) === 1 ? 0.4 : 0.25;
  }
  const decl = v.declarer;
  for (let s = 0 as Seat; s < 3; s = (s + 1) as Seat) {
    if (s === v.seat) continue;
    const ten = world.hands[s] | played[s];
    const pos = positionOf(s, v.dealer);
    if (opts.declaration && decl === s && v.declaration) {
      const d = v.declaration;
      w *= declarerWeight(d.kind, ten, world.skat, v.bid, d.hand);
    }
    if (opts.bidding) {
      // The declarer's bidding was on the hand before the skat; his ten are after the discard, close enough.
      w *= bidWeight(ten, pos, facts, s, decl === s);
    }
  }
  return w;
}

export interface SampleOptions {
  /** Worlds to return (before merging duplicates). */
  count: number;
  /** Candidate worlds drawn per returned world (importance resampling); 1 = no inference. */
  pool: number;
  inference: InferenceOptions;
}

/**
 * Draw `count` worlds: `count × pool` candidates consistent with the view, weighted by inference, then systematic
 * resampling (duplicates merged with a multiplicity). Falls back to unweighted candidates if every weight is tiny.
 */
export function sampleWorlds(v: SeatView, rng: Rng, o: SampleOptions): World[] {
  const voids = voidMasks(v);
  if (!o.inference.trumpVoids && v.kind) {
    const tm = v.kind === "null" ? 0 : trumpMask(v.kind === "ramsch" ? "grand" : v.kind);
    for (let s = 0; s < 3; s++) if (s !== v.seat) voids[s] &= ~tm;
  }
  const played = playedBySeat(v);
  const facts = bidFacts(v);
  const reads = o.inference.declaration ? playReads(v) : [];
  const n = Math.max(1, o.count * Math.max(1, o.pool));
  const cands: { hands: [CardMask, CardMask, CardMask]; skat: CardMask; w: number }[] = [];
  const useInference = o.pool > 1 && (o.inference.bidding || o.inference.declaration || reads.length > 0);
  for (let i = 0; i < n; i++) {
    let wd = sampleWithVoids(v, voids, rng);
    if (!wd && !o.inference.trumpVoids) wd = sampleWithVoids(v, voidMasks(v), rng);
    if (!wd) continue;
    const w = useInference ? worldWeight(v, wd, played, facts, o.inference, reads) : 1;
    cands.push({ ...wd, w });
  }
  if (!cands.length) return [];
  if (!useInference) return mergeDuplicates(cands.slice(0, o.count).map((c) => ({ hands: c.hands, skat: c.skat, mult: 1 })));
  let total = 0;
  for (const c of cands) total += c.w;
  if (!(total > 0)) return mergeDuplicates(cands.slice(0, o.count).map((c) => ({ hands: c.hands, skat: c.skat, mult: 1 })));
  // Systematic resampling.
  const out: World[] = [];
  const step = total / o.count;
  let u = rng.next() * step;
  let acc = 0;
  let k = 0;
  for (const c of cands) {
    acc += c.w;
    let m = 0;
    while (k < o.count && u < acc) {
      m++;
      k++;
      u += step;
    }
    if (m) out.push({ hands: c.hands, skat: c.skat, mult: m });
  }
  return out;
}

function mergeDuplicates(ws: World[]): World[] {
  const seen = new Map<string, World>();
  for (const w of ws) {
    const key = `${w.hands[0]},${w.hands[1]},${w.hands[2]},${w.skat}`;
    const e = seen.get(key);
    if (e) e.mult += w.mult;
    else seen.set(key, { ...w });
  }
  return [...seen.values()];
}

/** Trump suit of a declared kind (re-export for callers). */
export { trumpSuitOf };
