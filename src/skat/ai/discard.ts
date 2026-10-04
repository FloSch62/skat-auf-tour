// Drücken and the declaration after picking up (contract §5.3 "Drücken und Ansage"): the rules of thumb preselect the
// most promising game kinds and pairs to lay away, then every candidate is played out with open cards in sampled
// worlds of the two defenders' hands (the same worlds for every candidate). The figure takes the candidate with the
// best expected list points. The plan depends only on the twelve cards, the bid and the public bidding, so the discard
// and the later declaration agree and the result is cached.
import { Rng, hashString } from "../../core/rng.ts";
import { ALL_CARDS, cardsOf, pointsOf } from "../rules/cards.ts";
import type { Card, CardMask } from "../rules/cards.ts";
import type { HandPosition, Seat } from "../rules/deal.ts";
import { seatAt } from "../rules/deal.ts";
import { declaration, declarationValue, matadors, nullValue } from "../rules/value.ts";
import type { DeclKind, Declaration } from "../rules/value.ts";
import { pointSolver, trickSolver } from "./dds.ts";
import { discardCandidates, discardScore, estimateKinds, grandScore, nullDanger, suitScore, THUMB } from "./handeval.ts";
import { bidWeight } from "./infer.ts";
import { SCHNEIDER_TEST, VALUATION_NODES, WIN_TEST, listFor } from "./bid.ts";
import type { BidFacts } from "./knowledge.ts";

export interface PairResult {
  kind: DeclKind;
  pair: [Card, Card];
  /** Expected list points for the declarer. */
  ev: number;
  /** Share of worlds won (value reaching the bid). */
  chance: number;
  /** Worlds evaluated. */
  n: number;
  /** Null: won in every world (ouvert possible). */
  certain: boolean;
}

export interface DefenderWorlds {
  /** Hands by hand position (Vorhand leads the first trick); the declarer's entry is 0. */
  hands: [CardMask, CardMask, CardMask][];
}

/**
 * Deal the 20 unknown cards to the two defenders `count` times. With bidding facts, worlds are resampled by how well
 * each defender's hand fits his passes (a seat that passed at 18 rarely holds a Grand).
 */
export function defenderWorlds(
  cards12: CardMask,
  declPos: HandPosition,
  count: number,
  rng: Rng,
  facts?: { bids: BidFacts; dealer: Seat },
): DefenderWorlds {
  const unknown = cardsOf(ALL_CARDS & ~cards12);
  const others = ([0, 1, 2] as HandPosition[]).filter((p) => p !== declPos);
  const pool = facts ? 3 : 1;
  const cands: { h: [CardMask, CardMask, CardMask]; w: number }[] = [];
  for (let i = 0; i < count * pool; i++) {
    const deck = rng.shuffle(unknown.slice());
    const h: [CardMask, CardMask, CardMask] = [0, 0, 0];
    for (let k = 0; k < 10; k++) h[others[0]] |= 1 << deck[k];
    for (let k = 0; k < 10; k++) h[others[1]] |= 1 << deck[10 + k];
    let w = 1;
    if (facts) {
      for (const pos of others) {
        const seat = seatAt(pos, facts.dealer);
        w *= bidWeight(h[pos], pos, facts.bids, seat, false);
      }
    }
    cands.push({ h, w });
  }
  if (pool === 1) return { hands: cands.map((c) => c.h) };
  let total = 0;
  for (const c of cands) total += c.w;
  const out: [CardMask, CardMask, CardMask][] = [];
  const step = total / count;
  let u = rng.next() * step;
  let acc = 0;
  for (const c of cands) {
    acc += c.w;
    while (out.length < count && u < acc) {
      out.push(c.h);
      u += step;
    }
  }
  while (out.length < count) out.push(cands[out.length].h);
  return { hands: out };
}

const NODE_LIMIT = VALUATION_NODES;

/** Result of one candidate in one world: 0 lost, 1 won, 2 won with Schneider. */
/** Augen below the win test that still count as a near win in soft evaluations. */
const NEAR = 8;

/**
 * Result of one candidate in one world: 0 lost, 1 won, 2 won with Schneider (Null: won even open). With `soft`, a
 * lost world that comes close returns -1 (the solver gives the declarer at least the win test − 8 Augen; Null: one
 * unsafe card; counts half a win) or -2 (at least − 16; counts a fifth), so hopeless-looking candidates still differ.
 */
function playOut(kind: DeclKind, cards12: CardMask, pair: [Card, Card], declPos: HandPosition, world: [CardMask, CardMask, CardMask], schneider: boolean, salt = 0, soft = false): number {
  const discard = (1 << pair[0]) | (1 << pair[1]);
  const hands = [world[0], world[1], world[2]];
  hands[declPos] = cards12 & ~discard;
  if (kind === "null") {
    const ts = trickSolver();
    ts.load({ kind: "null", hands, leader: 0, solo: declPos }, "none");
    const w = ts.solve(NODE_LIMIT);
    if (!ts.aborted && w) return 2; // 2 = won even open (ouvert possible)
    const unsafe = nullDanger(hands[declPos]).unsafeCards;
    return unsafe === 0 ? 1 : soft && unsafe === 1 ? -1 : 0;
  }
  const ps = pointSolver();
  ps.setHorizon(Infinity);
  ps.load({ kind, hands, leader: 0, solo: declPos }, true);
  const sk = pointsOf(discard);
  const w = ps.atLeast(WIN_TEST - sk, NODE_LIMIT);
  if (ps.aborted) return salt % 2;
  if (!w) {
    if (!soft) return 0;
    if (ps.atLeast(WIN_TEST - NEAR - sk, NODE_LIMIT) && !ps.aborted) return -1;
    return ps.atLeast(WIN_TEST - 2 * NEAR - sk, NODE_LIMIT) && !ps.aborted ? -2 : 0;
  }
  if (!schneider) return 1;
  const s = ps.atLeast(SCHNEIDER_TEST - sk, NODE_LIMIT);
  return !ps.aborted && s ? 2 : 1;
}

/**
 * Evaluate candidate (kind, pair) choices over the same worlds. With `halving`, weak candidates are dropped after
 * half of the worlds (successive halving) to save time.
 */
export function evaluatePairs(
  cards12: CardMask,
  bid: number,
  declPos: HandPosition,
  cands: { kind: DeclKind; pair: [Card, Card] }[],
  worlds: DefenderWorlds,
  opts: { schneider?: boolean; halving?: boolean; soft?: boolean } = {},
): PairResult[] {
  const schneider = opts.schneider ?? true;
  const res = cands.map((c) => ({ ...c, sum: 0, wins: 0, n: 0, allWon: true, openLost: false }));
  // Null with the skat: 23, or Null ouvert (46) when the bid is above 23 (the open-card solver values both alike).
  const value = (kind: DeclKind, sch: boolean) =>
    kind === "null" ? (bid <= 23 ? 23 : 46) : declarationValue(declaration(kind), matadors(cards12, kind).count, { schneider: sch });
  const run = (r: (typeof res)[number], from: number, to: number) => {
    for (let i = from; i < to; i++) {
      const o = playOut(r.kind, cards12, r.pair, declPos, worlds.hands[i], schneider, i, !!opts.soft);
      const v = value(r.kind, o === 2 && r.kind !== "null");
      const won = o > 0;
      if (r.kind === "null" && o !== 2) r.openLost = true;
      if (r.kind === "null" && v < bid) r.sum += -1000;
      else if (o < 0) {
        const part = o === -1 ? 0.5 : 0.2;
        r.sum += part * listFor(r.kind, v, bid, true) + (1 - part) * listFor(r.kind, v, bid, false);
        if (v >= bid) r.wins += part;
      } else r.sum += listFor(r.kind, v, bid, won);
      if (won && v >= bid) r.wins++;
      if (!won) r.allWon = false;
      r.n++;
    }
  };
  const total = worlds.hands.length;
  if (opts.halving && res.length > 3 && total >= 8) {
    // Screen every candidate on a few worlds, then finish the best three (the same worlds for all, so fair).
    const screen = Math.max(3, Math.round(total / 3));
    for (const r of res) run(r, 0, screen);
    const sorted = [...res].sort((a, b) => b.sum - a.sum);
    const cut = sorted[2].sum;
    for (const r of res) if (r.sum >= cut) run(r, screen, total);
  } else {
    for (const r of res) run(r, 0, total);
  }
  return res.map((r) => ({
    kind: r.kind,
    pair: r.pair,
    ev: r.n ? r.sum / r.n : -999,
    chance: r.n ? r.wins / r.n : 0,
    n: r.n,
    certain: r.allWon && !r.openLost && r.n === total,
  }));
}

/** Kinds worth trying after picking up, best first by the rules of thumb; kinds that reach the bid come first. */
export function discardKinds(cards12: CardMask, bid: number, max: number): DeclKind[] {
  const est = estimateKinds(cards12, 1);
  const rated = est.map((e) => {
    let s: number;
    if (e.kind === "null") s = 1.5 - nullDanger(cards12).unsafeCards * 1.2;
    else if (e.kind === "grand") s = grandScore(cards12) - THUMB.grand;
    else s = suitScore(cards12, ["diamonds", "hearts", "spades", "clubs"].indexOf(e.kind)) - THUMB.suit;
    const reaches = e.kind === "null" ? 46 >= bid : e.value >= bid;
    return { kind: e.kind, s: s + (reaches ? 0 : -6) };
  });
  rated.sort((a, b) => b.s - a.s);
  return rated.slice(0, max).map((r) => r.kind);
}

export interface DiscardPlan {
  pair: [Card, Card];
  declaration: Declaration;
  ev: number;
  chance: number;
  results: PairResult[];
}

export interface DiscardStyle {
  samples: number;
  candidates: number;
  kinds: number;
  /** A figure's favourite kinds: list points added when choosing (Grand-Helmut loves Grand, Null-Eugen Null). */
  prefer?: Partial<Record<DeclKind, number>>;
  /** The favourite counts only for candidates with at least this chance (default 0.35). */
  preferMinChance?: number;
}

/** The figure's preference for a candidate's kind — only for a game with a real chance (never a hopeless favourite). */
function bonus(style: DiscardStyle, r: Pick<PairResult, "kind" | "chance">): number {
  return r.chance >= (style.preferMinChance ?? 0.35) ? (style.prefer?.[r.kind] ?? 0) : 0;
}

const CACHE = new Map<string, DiscardPlan>();

/**
 * Choose two cards to lay away and the game to declare. `declPos` is the declarer's hand position; `facts` (optional)
 * lets the defenders' passes shape the worlds.
 */
export function planDiscard(
  cards12: CardMask,
  bid: number,
  declPos: HandPosition,
  style: DiscardStyle,
  facts?: { bids: BidFacts; dealer: Seat },
  salt = "",
): DiscardPlan {
  const key = `${cards12}/${bid}/${declPos}/${style.samples}/${style.candidates}/${style.kinds}/${JSON.stringify(style.prefer ?? {})}/${style.preferMinChance ?? ""}/${salt}/${facts ? JSON.stringify(facts.bids) : ""}`;
  const hit = CACHE.get(key);
  if (hit) return hit;
  const rng = new Rng(hashString(`discard/${cards12}/${bid}/${declPos}/${salt}`));
  const worlds = defenderWorlds(cards12, declPos, style.samples, rng, facts);
  // Which kinds? Every kind is tried once with its rule-of-thumb discard on a third of the worlds; the best go on.
  const all: DeclKind[] = ["diamonds", "hearts", "spades", "clubs", "grand"];
  if (46 >= bid) all.push("null");
  const screenWorlds = { hands: worlds.hands.slice(0, Math.max(4, Math.round(style.samples / 2.5))) };
  const quick = evaluatePairs(cards12, bid, declPos, all.map((kind) => ({ kind, pair: discardCandidates(cards12, kind, 1)[0] })), screenWorlds, { schneider: false, soft: true });
  quick.sort((a, b) => b.ev + bonus(style, b) - a.ev - bonus(style, a) || b.chance - a.chance);
  const kinds = quick.slice(0, style.kinds).map((r) => r.kind);
  const cands: { kind: DeclKind; pair: [Card, Card] }[] = [];
  for (const kind of kinds) for (const pair of discardCandidates(cards12, kind, style.candidates)) cands.push({ kind, pair });
  const results = evaluatePairs(cards12, bid, declPos, cands, worlds, { halving: true, soft: true });
  results.sort(
    (a, b) =>
      b.ev + bonus(style, b) - a.ev - bonus(style, a) ||
      discardScore(cards12, b.kind, b.pair[0], b.pair[1]) - discardScore(cards12, a.kind, a.pair[0], a.pair[1]),
  );
  const best = results[0];
  let decl: Declaration;
  if (best.kind === "null") decl = declaration("null", { ouvert: bid > 23 || (best.certain && best.n >= 8) });
  else decl = declaration(best.kind);
  const plan: DiscardPlan = { pair: [Math.min(...best.pair), Math.max(...best.pair)] as [Card, Card], declaration: decl, ev: best.ev, chance: best.chance, results };
  if (CACHE.size > 100) CACHE.clear();
  CACHE.set(key, plan);
  return plan;
}

/** The game to declare with a fixed discard (when the discard was not this module's own plan). */
export function declareFor(cards10: CardMask, skat: CardMask, bid: number, declPos: HandPosition, style: DiscardStyle, salt = ""): Declaration {
  const cards12 = cards10 | skat;
  const pair = cardsOf(skat) as [Card, Card];
  const usable: DeclKind[] = ["diamonds", "hearts", "spades", "clubs", "grand"];
  if (46 >= bid) usable.push("null");
  const rng = new Rng(hashString(`declare/${cards12}/${bid}/${salt}`));
  const worlds = defenderWorlds(cards12, declPos, Math.max(4, Math.round(style.samples / 2)), rng);
  const shortlist = discardKinds(cards12, bid, 3).filter((k) => usable.includes(k));
  const results = evaluatePairs(cards12, bid, declPos, shortlist.map((kind) => ({ kind, pair })), worlds, { soft: true });
  results.sort((a, b) => b.ev + bonus(style, b) - a.ev - bonus(style, a));
  const best = results[0];
  if (!best) return declaration("grand");
  if (best.kind === "null") return declaration("null", { ouvert: bid > 23 || best.certain });
  return declaration(best.kind);
}
