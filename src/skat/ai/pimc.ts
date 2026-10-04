// Perfect-Information Monte Carlo card play (contract §5.3 "Kartenspiel"). The seat samples worlds that fit its
// SeatView (weighted by the bidding, the declaration and the discard, see infer.ts), solves every world with open
// cards (dds.ts) after each of its candidate cards, and plays the card with the best average outcome in list points.
//
// How a world is valued: the outcome of a suit game or Grand only depends on the declarer's final Augen through the
// thresholds 31 (declarer not Schneider), 61 (won) and 90 (defenders Schneider). Early in the game each candidate card
// is classified with two null-window searches (61, then 90 or 31); from `exactTricks` tricks left on the exact Augen
// are computed as well and count a little (keeps a margin, does not give Augen away). Null and Schwarz angesagt /
// ouvert use the boolean trick solver. Ramsch (everyone for himself) plays every candidate out with the Ramsch rules
// of thumb for all three seats (ramsch.ts). Cards the search values equally are ranked by the rules of thumb (heuristics.ts). Budgets are samples × nodes,
// never the clock: the same seed always plays the same card.
import { Rng } from "../../core/rng.ts";
import { CARD_POINTS, pointsOf } from "../rules/cards.ts";
import type { Card, CardMask } from "../rules/cards.ts";
import { seegerFabian } from "../rules/list.ts";
import { playRules, trickWinner } from "../rules/play.ts";
import { settle } from "../rules/value.ts";
import type { Declaration } from "../rules/value.ts";
import type { SeatView } from "../rules/view.ts";
import { PointSolver, TrickSolver, pointSolver, trickSolver } from "./dds.ts";
import { nullRank } from "./handeval.ts";
import { heuristicScores, readTable } from "./heuristics.ts";
import { sampleWorlds } from "./infer.ts";
import type { InferenceOptions, World } from "./infer.ts";
import { ramschRollout } from "./ramsch.ts";
import { playInfo } from "./knowledge.ts";
import type { PlayInfo } from "./knowledge.ts";

export interface PimcParams {
  /** Worlds per decision. */
  samples: number;
  /** Candidate worlds per kept world for the inference resampling (1 = no inference). */
  pool: number;
  inference: InferenceOptions;
  /** Node budget per world (all searches for that world together). */
  nodesPerWorld: number;
  /** From this many tricks left (incl. the current one) on, compute exact Augen. */
  exactTricks: number;
  /** Tricks searched ahead (Infinity = to the end; weak players see less). */
  horizonTricks: number;
  /** Look for Schneider (and avoiding it) when classifying cards. */
  schneider: boolean;
}

export interface CardEval {
  card: Card;
  /** Expected list points for the deciding seat (higher is better). */
  utility: number;
  /** Probability that the declarer wins (0 in Ramsch). */
  declarerWins: number;
  /** Rule-of-thumb score (tie-break). */
  heuristic: number;
  /** Total weight of the worlds that counted. */
  weight: number;
}

/**
 * Group equivalent candidate cards: same class, nothing still in play (hands, skat or the current trick) between them
 * in trick order, and the same Augen (Null: any Augen). Every world values them the same, so one card per group is
 * searched. Groups are in ascending strength; each group lists its cards ascending.
 */
export function rootGroups(v: SeatView, cards: readonly Card[]): Card[][] {
  if (!v.kind) return cards.map((c) => [c]);
  const kind = v.kind;
  const r = playRules(kind);
  let trickMask = 0;
  for (const c of v.trick) trickMask |= 1 << c;
  const present = ~v.played | trickMask;
  const isNull = kind === "null";
  const st = (c: Card) => (isNull ? nullRank(c) : r.order[c]);
  const sorted = [...cards].sort((a, b) => r.classOf[a] - r.classOf[b] || st(a) - st(b));
  const groups: Card[][] = [];
  for (const c of sorted) {
    const g = groups[groups.length - 1];
    if (g) {
      const top = g[g.length - 1];
      if (r.classOf[top] === r.classOf[c] && (isNull || CARD_POINTS[top] === CARD_POINTS[c])) {
        let between = false;
        let m = present & r.classMask[r.classOf[c]];
        while (m !== 0) {
          const low = m & -m;
          m ^= low;
          const d = 31 - Math.clz32(low);
          if (st(d) > st(top) && st(d) < st(c)) {
            between = true;
            break;
          }
        }
        if (!between) {
          g.push(c);
          continue;
        }
      }
    }
    groups.push([c]);
  }
  return groups;
}

// ─── Outcome tables ───────────────────────────────────────────────────────────────────────────────────────

/** Declarer list points (Seeger-Fabian, incl. Kontra/Bock factor) for final declarer Augen in each class. */
interface Outcome {
  /** Utility for the declarer at final Augen P: class boundaries 31 / 61 / 90. */
  byClass: [number, number, number, number];
  win: [boolean, boolean, boolean, boolean];
}

function factorOf(v: SeatView): number {
  return (v.kontra === 2 ? 4 : v.kontra === 1 ? 2 : 1) * (v.rules.bock ? 2 : 1);
}

function declarerList(d: Declaration, cards12: CardMask, bid: number, points: number, declTricks: number, defTricks: number, factor: number): { list: number; won: boolean } {
  const st = settle({ declaration: d, declarerCards: cards12, bid, declarerPoints: points, declarerTricks: declTricks, defenderTricks: defTricks });
  const written = st.written * factor;
  return { list: seegerFabian(0, st.won, written)[0], won: st.won };
}

function outcomeTable(v: SeatView, cards12: CardMask): Outcome {
  const d = v.declaration!;
  const f = factorOf(v);
  const reps = [30, 60, 89, 120];
  const byClass = [0, 0, 0, 0] as [number, number, number, number];
  const win = [false, false, false, false] as [boolean, boolean, boolean, boolean];
  for (let k = 0; k < 4; k++) {
    const r = declarerList(d, cards12, v.bid, reps[k], reps[k] > 0 ? 1 : 0, 1, f);
    byClass[k] = r.list;
    win[k] = r.won;
  }
  return { byClass, win };
}

// ─── Evaluation ───────────────────────────────────────────────────────────────────────────────────────────

const THRESHOLDS = [31, 61, 90];

/**
 * Evaluate candidate cards for the seat to play. Returns one entry per given card (all cards are evaluated; callers
 * pass representatives of equivalent groups to save time).
 */
export function evaluateCards(v: SeatView, cards: readonly Card[], p: PimcParams, rng: Rng): CardEval[] {
  return evaluateCardsDetailed(v, cards, p, rng).evals;
}

/** Per-world utilities of every candidate (for the paired significance test in `chooseCard`). */
interface Swing {
  rows: { m: number; u: number[] }[];
}

/**
 * `evaluateCards` plus the per-world utilities, so a caller can test whether one card is significantly better than
 * another (the worlds are shared, so the comparison is paired).
 */
export function evaluateCardsDetailed(v: SeatView, cards: readonly Card[], p: PimcParams, rng: Rng): { evals: CardEval[]; rows: Swing["rows"] } {
  const info = playInfo(v);
  const t = readTable(v, info);
  const heur = heuristicScores(v, cards, t);
  const out: CardEval[] = cards.map((card, i) => ({ card, utility: 0, declarerWins: 0, heuristic: heur[i], weight: 0 }));
  if (cards.length <= 1) return { evals: out, rows: [] };
  const worlds = sampleWorlds(v, rng, { count: p.samples, pool: p.pool, inference: p.inference });
  if (!worlds.length) return { evals: out, rows: [] };
  const swing: Swing = { rows: [] };
  if (info.kind === "ramsch") evalRamsch(v, info, worlds, cards, p, out, swing);
  else if (info.kind === "null") evalTrickGoal(v, info, worlds, cards, p, out, "none", swing);
  else if (v.declaration && v.declaration.schwarzAnnounced) evalTrickGoal(v, info, worlds, cards, p, out, "all", swing);
  else evalPoints(v, info, worlds, cards, p, out, swing);
  for (const e of out) {
    if (e.weight > 0) {
      e.utility /= e.weight;
      e.declarerWins /= e.weight;
    }
  }
  return { evals: out, rows: swing.rows };
}

function noteSwing(swing: Swing, m: number, us: readonly number[]): void {
  swing.rows.push({ m, u: [...us] });
}

/** Paired test over the worlds: is card `a` better than card `b` by at least `z` standard errors? */
function clearlyBetter(rows: Swing["rows"], a: number, b: number, z: number): boolean {
  let n = 0;
  let sum = 0;
  let sq = 0;
  for (const r of rows) {
    const d = r.u[a] - r.u[b];
    n += r.m;
    sum += r.m * d;
    sq += r.m * d * d;
  }
  if (n < 2) return true;
  const mean = sum / n;
  const variance = Math.max(0, sq / n - mean * mean);
  const se = Math.sqrt(variance / (n - 1));
  return mean > z * se + 1e-9;
}

function declarerCards12(v: SeatView, info: PlayInfo, w: World): CardMask {
  const d = info.declarer!;
  return w.hands[d] | info.playedBy[d] | w.skat;
}

function evalPoints(v: SeatView, info: PlayInfo, worlds: World[], cards: readonly Card[], p: PimcParams, out: CardEval[], swing: Swing): void {
  const decl = info.declarer!;
  const iAmDecl = v.seat === decl;
  const solver = pointSolver();
  solver.setHorizon(p.horizonTricks);
  const exact = info.tricksLeft <= p.exactTricks;
  const sign = iAmDecl ? 1 : -1;
  // Every card gets the same share of the world's budget; a search that runs out counts as undecided (half way
  // between the two classes it separates) instead of dropping the world — dropped worlds would be the close ones.
  const perCard = Math.max(20_000, Math.floor(p.nodesPerWorld / Math.max(1, cards.length)));
  const us = new Array<number>(cards.length);
  for (const w of worlds) {
    const cards12 = declarerCards12(v, info, w);
    const oc = outcomeTable(v, cards12);
    const base = info.points[decl] + pointsOf(w.skat);
    solver.load({ kind: info.kind, hands: w.hands, leader: info.leader, trick: info.trick, solo: decl }, true);
    const rem = solver.remaining();
    for (let i = 0; i < cards.length; i++) {
      let k: number;
      let pts = -1;
      const f = exact ? solver.exactAfter(cards[i], perCard) : null;
      if (f !== null) {
        pts = base + f;
        k = pts >= 90 ? 3 : pts >= 61 ? 2 : pts >= 31 ? 1 : 0;
      } else k = classify(solver, cards[i], base, rem, p.schneider, exact ? perCard / 2 : perCard);
      const lo = Math.floor(k);
      const frac = k - lo;
      const u = oc.byClass[lo] * (1 - frac) + (frac > 0 ? oc.byClass[lo + 1] * frac : 0) + (pts >= 0 ? 0.1 * pts : 0);
      const win = (oc.win[lo] ? 1 - frac : 0) + (frac > 0 && oc.win[lo + 1] ? frac : 0);
      us[i] = sign * u;
      out[i].utility += w.mult * sign * u;
      out[i].declarerWins += w.mult * win;
      out[i].weight += w.mult;
    }
    noteSwing(swing, w.mult, us);
  }
}

/**
 * Class 0…3 of the final declarer Augen after `card` via null-window tests (61 first, then 90 or 31). A test that runs
 * out of nodes gives a half class (e.g. 1.5 = undecided between lost and won).
 */
function classify(s: PointSolver, card: Card, base: number, rem: number, schneider: boolean, budget: number): number {
  const start = s.nodes;
  const test = (T: number): boolean | null => {
    const tr = T - base;
    if (tr <= 0) return true;
    if (tr > rem) return false;
    const left = budget - (s.nodes - start);
    if (left <= 0) return null;
    return s.testAfter(card, tr, left);
  };
  const win = test(THRESHOLDS[1]);
  if (win === null) return 1.5;
  if (win) {
    if (!schneider) return 2;
    const sch = test(THRESHOLDS[2]);
    if (sch === null) return 2.5;
    return sch ? 3 : 2;
  }
  if (!schneider) return 1;
  const notSchneider = test(THRESHOLDS[0]);
  if (notSchneider === null) return 0.5;
  return notSchneider ? 1 : 0;
}

function evalTrickGoal(v: SeatView, info: PlayInfo, worlds: World[], cards: readonly Card[], p: PimcParams, out: CardEval[], goal: "none" | "all", swing: Swing): void {
  const decl = info.declarer!;
  const iAmDecl = v.seat === decl;
  const d = v.declaration!;
  const f = factorOf(v);
  const solver: TrickSolver = trickSolver();
  for (const w of worlds) {
    const cards12 = declarerCards12(v, info, w);
    // Null: win = no trick. Schwarz: win = every trick (all Augen).
    const winU = goal === "none" ? declarerList(d, cards12, v.bid, 0, 0, 10, f).list : declarerList(d, cards12, v.bid, 120, 10, 0, f).list;
    const loseU = goal === "none" ? declarerList(d, cards12, v.bid, 0, 1, 9, f).list : declarerList(d, cards12, v.bid, 89, 9, 1, f).list;
    solver.load({ kind: info.kind, hands: w.hands, leader: info.leader, trick: info.trick, solo: decl }, goal);
    const perCard = Math.max(20_000, Math.floor(p.nodesPerWorld / Math.max(1, cards.length)));
    const us: number[] = [];
    for (let i = 0; i < cards.length; i++) {
      const r = solver.testAfter(cards[i], perCard);
      // Undecided within the budget: half a win.
      const pw = r === null ? 0.5 : r ? 1 : 0;
      const u = pw * winU + (1 - pw) * loseU;
      us.push(iAmDecl ? u : -u);
      out[i].utility += w.mult * (iAmDecl ? u : -u);
      out[i].declarerWins += w.mult * pw;
      out[i].weight += w.mult;
    }
    noteSwing(swing, w.mult, us);
  }
}

/**
 * Ramsch: everybody plays for himself, so the two-against-one search does not fit (it assumes both others load Augen on
 * me, and once I look doomed every card seems equal). Each candidate card is played out in every world with the Ramsch
 * rules of thumb for all three seats (each avoids its own Augen). Late in the game the exact two-against-one value is
 * mixed in (then it is cheap and the endgame matters). Utility: minus my Augen, doubled when I end with the most.
 */
function evalRamsch(v: SeatView, info: PlayInfo, worlds: World[], cards: readonly Card[], p: PimcParams, out: CardEval[], swing: Swing): void {
  const me = v.seat;
  const exact = info.tricksLeft <= Math.min(4, p.exactTricks);
  const solver = pointSolver();
  solver.setHorizon(Infinity);
  for (const w of worlds) {
    const vals: number[] = [];
    let ok = true;
    if (exact) solver.load({ kind: "ramsch", hands: w.hands, leader: info.leader, trick: info.trick, solo: me }, false);
    for (const c of cards) {
      const hands = [w.hands[0], w.hands[1], w.hands[2]];
      hands[v.seat] &= ~(1 << c);
      let trick = [...info.trick, c];
      let leader: number = info.leader;
      const pts = [...info.points];
      const tricks = [...v.trickCounts];
      if (trick.length === 3) {
        const winner = (leader + trickWinnerOf(trick)) % 3;
        pts[winner] += CARD_POINTS[trick[0]] + CARD_POINTS[trick[1]] + CARD_POINTS[trick[2]];
        tricks[winner]++;
        leader = winner;
        trick = [];
      }
      const end = ramschRollout(hands, leader, trick, pts, w.skat, tricks);
      const mine = end.points[me];
      const loser = mine >= Math.max(end.points[0], end.points[1], end.points[2]);
      // The real settlement: the loser pays his Augen, doubled for every player without a trick (Jungfrau).
      const jungfrau = end.tricks.filter((x) => x === 0).length;
      let u = loser ? -mine * 2 ** jungfrau : -mine * 0.25;
      if (exact) {
        const f = solver.exactAfter(c, p.nodesPerWorld);
        if (f === null) {
          ok = false;
          break;
        }
        // Even if the others gang up on me: how many Augen can they force?
        u = 0.5 * u - 0.5 * (info.points[me] + f);
      }
      vals.push(u);
    }
    if (!ok) continue;
    noteSwing(swing, w.mult, vals);
    for (let i = 0; i < cards.length; i++) {
      out[i].utility += w.mult * vals[i];
      out[i].weight += w.mult;
    }
  }
}

function trickWinnerOf(t: readonly Card[]): number {
  return trickWinner(playRules("ramsch"), t[0], t[1], t[2]);
}

// ─── Position value (Kontra / Re) ─────────────────────────────────────────────────────────────────────────

/**
 * Probability that the declarer wins from the current position (the seat to move may be anyone). `slack` lowers the
 * Augen the declarer needs against open-card defence (bid.ts VALUATION_SLACK makes this a realistic chance).
 */
export function declarerWinChance(v: SeatView, p: PimcParams, rng: Rng, slack = 0): number {
  const info = playInfo(v);
  if (info.declarer === null) return 0;
  const worlds = sampleWorlds(v, rng, { count: p.samples, pool: p.pool, inference: p.inference });
  let wins = 0;
  let total = 0;
  const decl = info.declarer;
  const d = v.declaration!;
  for (const w of worlds) {
    const cards12 = declarerCards12(v, info, w);
    let won: boolean | null;
    if (info.kind === "null" || d.schwarzAnnounced) {
      const s = trickSolver();
      s.load({ kind: info.kind, hands: w.hands, leader: info.leader, trick: info.trick, solo: decl }, info.kind === "null" ? "none" : "all");
      won = s.solve(p.nodesPerWorld);
      if (s.aborted) won = null;
    } else {
      const s = pointSolver();
      s.setHorizon(p.horizonTricks);
      s.load({ kind: info.kind, hands: w.hands, leader: info.leader, trick: info.trick, solo: decl }, true);
      const oc = outcomeTable(v, cards12);
      const k = oc.win.indexOf(true);
      if (k < 0) won = false;
      else {
        const need = [0, 31, 61 - slack, 90 - slack][k] - info.points[decl] - pointsOf(w.skat);
        const r = need <= 0 ? true : need > s.remaining() ? false : s.atLeast(need, p.nodesPerWorld);
        won = s.aborted ? null : r;
      }
    }
    if (won === null) continue;
    total += w.mult;
    if (won) wins += w.mult;
  }
  return total ? wins / total : 0.5;
}

// ─── Choosing ─────────────────────────────────────────────────────────────────────────────────────────────

export interface ChoiceOptions {
  /** Probability of taking a plausible second-best card instead of the best. */
  errorRate: number;
  /** How much worse (in list points) a "plausible" alternative may be. */
  errorTolerance: number;
}

/** The PIMC choice among legal cards: evaluate group representatives, rank by utility, tie-break by heuristics. */
export function chooseCard(v: SeatView, legal: readonly Card[], p: PimcParams, c: ChoiceOptions, seed: number): { card: Card; evals: CardEval[] } {
  if (legal.length === 1) return { card: legal[0], evals: [] };
  const rng = new Rng(seed);
  const groups = rootGroups(v, legal);
  // Represent each group by its strongest card (equivalent in every world).
  const reps = groups.map((g) => g[g.length - 1]);
  if (reps.length === 1) return { card: reps[0], evals: [] };
  const { evals, rows } = evaluateCardsDetailed(v, reps, p, rng);
  const ranked = [...evals].sort((a, b) => score(b) - score(a) || a.card - b.card);
  let pick = ranked[0];
  // The search overrides the rules of thumb only when its advantage is clear over the sampled worlds (paired test);
  // otherwise a difference that rests on one or two worlds would make it give the declarer an Ace for nothing.
  if (rows.length > 1 && pick.weight > 0) {
    const ib = evals.indexOf(pick);
    let alt = pick;
    for (const e of ranked) {
      // Only where the rules of thumb strongly disagree (e.g. an Ace given away instead of a Seven).
      if (e === pick || e.weight === 0 || e.heuristic <= alt.heuristic || e.heuristic - pick.heuristic < STRONG_DISAGREEMENT) continue;
      if (!clearlyBetter(rows, ib, evals.indexOf(e), CLEAR_Z)) alt = e;
    }
    if (alt !== pick) {
      pick = alt;
      ranked.splice(ranked.indexOf(pick), 1);
      ranked.unshift(pick);
    }
  }
  if (c.errorRate > 0 && ranked.length > 1 && rng.next() < c.errorRate) {
    const alt = ranked[1];
    if (alt.weight > 0 && pick.utility - alt.utility <= c.errorTolerance) pick = alt;
  }
  return { card: pick.card, evals: ranked };
}

/** Standard errors by which the search must beat the rule-of-thumb card to overrule it. */
const CLEAR_Z = 1.5;
/** Rule-of-thumb score gap that counts as strong disagreement (an Ace or Ten given away vs. a small card ≈ 25). */
const STRONG_DISAGREEMENT = 15;

function score(e: CardEval): number {
  return (e.weight > 0 ? e.utility : 0) + 0.002 * e.heuristic;
}

