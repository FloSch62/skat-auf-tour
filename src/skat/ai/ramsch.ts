// Ramsch and Schieberamsch (house rules, contract §4.4): avoid Augen, keep the others from staying Jungfrau when I am
// the likely loser, go for a Durchmarsch when the open-card solver says it works in nearly every world, and stop
// somebody else's Durchmarsch. Schieberamsch: shove the skat on with a harmless hand, otherwise pick it up and pass the
// two most dangerous cards (never jacks).
import { Rng } from "../../core/rng.ts";
import { CARD_POINTS, JACKS, SUIT_MASKS, cardsOf, pointsOf, popcount } from "../rules/cards.ts";
import { playRules, trickWinner } from "../rules/play.ts";
import type { Card, CardMask } from "../rules/cards.ts";
import type { Action } from "../rules/game.ts";
import type { SeatView } from "../rules/view.ts";
import { trickSolver } from "./dds.ts";
import { sampleWorlds } from "./infer.ts";
import { playInfo } from "./knowledge.ts";
import type { PlayStyle } from "./persona.ts";

/** How dangerous a hand is in Ramsch (0 harmless … 1 a sure loser): high jacks, aces and tens, few low cards. */
export function ramschDanger(hand: CardMask): number {
  let d = 0;
  const jw = [0.45, 0.6, 0.8, 1.0];
  for (let s = 0; s < 4; s++) if (hand & (1 << (28 + s))) d += jw[s];
  for (let s = 0; s < 4; s++) {
    const m = hand & SUIT_MASKS[s];
    const len = popcount(m);
    if (!len) {
      d -= 0.2; // a void lets me get rid of high cards
      continue;
    }
    const low = popcount(m & (0b111 << (7 * s)));
    if (m & (1 << (s * 7 + 6))) d += low >= 2 ? 0.35 : 0.7;
    if (m & (1 << (s * 7 + 5))) d += low >= 2 ? 0.25 : 0.5;
    if (m & (1 << (s * 7 + 4))) d += 0.15;
    d -= low * 0.08;
  }
  return Math.max(0, Math.min(1, d / 4));
}

/** The two non-jack cards to pass on in Schieberamsch: the ones that reduce the danger most. */
export function ramschPassCards(hand: CardMask): [Card, Card] {
  const cs = cardsOf(hand & ~JACKS);
  let best: [Card, Card] = [cs[0], cs[1]];
  let bestD = Infinity;
  for (let i = 0; i < cs.length; i++)
    for (let j = i + 1; j < cs.length; j++) {
      const d = ramschDanger(hand & ~(1 << cs[i]) & ~(1 << cs[j])) - (CARD_POINTS[cs[i]] + CARD_POINTS[cs[j]]) * 0.002;
      if (d < bestD) {
        bestD = d;
        best = [cs[i], cs[j]];
      }
    }
  return best;
}

/** Schieberamsch decision: shove on (doubles) or pick up; when holding, which two cards to pass. */
export function schiebenAction(v: SeatView, shoveDanger: number): Action {
  const holding = v.schieben?.holding ?? false;
  if (holding) {
    const pair = ramschPassCards(v.hand);
    return { type: "discard", seat: v.seat, cards: [Math.min(...pair), Math.max(...pair)] as [Card, Card] };
  }
  const shove = v.legal.find((a) => a.type === "shove");
  const pick = v.legal.find((a) => a.type === "pickUp");
  if (shove && ramschDanger(v.hand) <= shoveDanger) return shove;
  return pick ?? shove ?? v.legal[0];
}

/**
 * Durchmarsch questions with the trick solver: may I still take every trick (when I took all so far), or can
 * someone who took every trick so far still do it? Returns a card to force, or null to let PIMC decide.
 */
export function durchmarschCard(v: SeatView, legal: readonly Card[], style: PlayStyle, seed: number): Card | null {
  const info = playInfo(v);
  const done = v.tricks.length;
  const winners = new Set(v.tricks.map((t) => t.winner));
  if (legal.length < 2) return null;
  const rng = new Rng(seed ^ 0x5eed);
  // My own Durchmarsch.
  const allMine = done === 0 || (winners.size === 1 && winners.has(v.seat));
  const jacks = popcount(v.hand & JACKS);
  if (allMine && (done > 0 || jacks >= 3)) {
    const p = trickChances(v, legal, v.seat, style, rng);
    let bi = -1;
    for (let i = 0; i < legal.length; i++) if (p[i] >= 0 && (bi < 0 || p[i] > p[bi])) bi = i;
    if (bi >= 0 && p[bi] >= 0.7) return legal[bi];
    return null;
  }
  // Someone else on the way to a Durchmarsch.
  if (done >= 3 && winners.size === 1 && !winners.has(v.seat)) {
    const x = [...winners][0];
    if (x === info.me) return null;
    const p = trickChances(v, legal, x, style, rng);
    let lo = -1;
    let hi = -1;
    for (let i = 0; i < legal.length; i++) {
      if (p[i] < 0) continue;
      if (lo < 0 || p[i] < p[lo]) lo = i;
      if (hi < 0 || p[i] > p[hi]) hi = i;
    }
    if (lo >= 0 && p[hi] - p[lo] >= 0.25 && p[hi] >= 0.4) return legal[lo];
  }
  return null;
}

/** Per card: chance that `solo` takes every remaining trick (-1 when unknown). */
function trickChances(v: SeatView, legal: readonly Card[], solo: number, style: PlayStyle, rng: Rng): number[] {
  const info = playInfo(v);
  const worlds = sampleWorlds(v, rng, { count: Math.max(6, Math.round(style.samples / 2)), pool: 1, inference: style.inference });
  const ts = trickSolver();
  const wins = legal.map(() => 0);
  let total = 0;
  for (const w of worlds) {
    ts.load({ kind: "ramsch", hands: w.hands, leader: info.leader, trick: info.trick, solo }, "all");
    const res: boolean[] = [];
    let ok = true;
    for (const c of legal) {
      const r = ts.testAfter(c, 200_000);
      if (r === null) {
        ok = false;
        break;
      }
      res.push(r);
    }
    if (!ok) continue;
    total += w.mult;
    for (let i = 0; i < legal.length; i++) if (res[i]) wins[i] += w.mult;
  }
  return total ? wins.map((x) => x / total) : legal.map(() => -1);
}

// ─── Rollouts (selfish players) ───────────────────────────────────────────────────────────────────────────

const RR = playRules("ramsch");

/** Rule-of-thumb Ramsch card for a seat in an open position (used in rollouts): stay under, unload danger. */
export function ramschPolicy(hand: CardMask, trick: readonly Card[], outstanding: CardMask): Card {
  const led = trick.length ? trick[0] : -1;
  let legal = hand;
  if (led >= 0) {
    const f = hand & RR.follow[led];
    if (f) legal = f;
  }
  const cards = cardsOf(legal);
  if (led < 0) {
    // Lead a low card that others can go over; jacks last.
    let best = cards[0];
    let bs = -Infinity;
    for (const c of cards) {
      let higher = 0;
      let m = outstanding & RR.classMask[RR.classOf[c]];
      while (m) {
        const low = m & -m;
        m ^= low;
        if (RR.order[31 - Math.clz32(low)] > RR.order[c]) higher++;
      }
      const sc = Math.min(higher, 4) * 3 - CARD_POINTS[c] * 2 - (c >= 28 ? 15 : 0) - RR.order[c] * 0.1;
      if (sc > bs) {
        bs = sc;
        best = c;
      }
    }
    return best;
  }
  let win = trick[0];
  for (let i = 1; i < trick.length; i++) {
    const c = trick[i];
    const cw = RR.classOf[c] === RR.classOf[win] ? RR.order[c] > RR.order[win] : RR.classOf[c] === 4;
    if (cw) win = c;
  }
  let best = cards[0];
  let bs = -Infinity;
  for (const c of cards) {
    const beats = RR.classOf[c] === RR.classOf[win] ? RR.order[c] > RR.order[win] : RR.classOf[c] === 4 && RR.classOf[win] !== 4;
    const follows = RR.classOf[c] === RR.classOf[led];
    let sc: number;
    if (!beats) sc = follows ? 60 + RR.order[c] * 2 : 55 + CARD_POINTS[c] * 1.5 + (c >= 28 ? 6 : 0);
    else if (trick.length === 2) sc = 20 + RR.order[c] - CARD_POINTS[c];
    else sc = 10 - CARD_POINTS[c] - RR.order[c];
    if (sc > bs) {
      bs = sc;
      best = c;
    }
  }
  return best;
}

/**
 * Play an open Ramsch position to the end with the policy. Returns final Augen (skat to the last trick) and tricks per
 * seat.
 */
export function ramschRollout(
  hands: readonly CardMask[],
  leader: number,
  trick: readonly Card[],
  points: readonly number[],
  skat: CardMask,
  tricks: readonly number[] = [0, 0, 0],
): { points: number[]; tricks: number[] } {
  const h = [hands[0], hands[1], hands[2]];
  const pts = [points[0], points[1], points[2]];
  const tr = [tricks[0], tricks[1], tricks[2]];
  const t = [...trick];
  let lead = leader;
  let lastWinner = leader;
  for (let guard = 0; guard < 40; guard++) {
    if (t.length === 0 && (h[0] | h[1] | h[2]) === 0) break;
    const turn = (lead + t.length) % 3;
    const outstanding = (h[0] | h[1] | h[2]) & ~h[turn];
    const c = ramschPolicy(h[turn], t, outstanding);
    h[turn] &= ~(1 << c);
    t.push(c);
    if (t.length === 3) {
      const w = (lead + trickWinner(RR, t[0], t[1], t[2])) % 3;
      pts[w] += CARD_POINTS[t[0]] + CARD_POINTS[t[1]] + CARD_POINTS[t[2]];
      tr[w]++;
      lead = w;
      lastWinner = w;
      t.length = 0;
    }
  }
  pts[lastWinner] += pointsOf(skat);
  return { points: pts, tricks: tr };
}
