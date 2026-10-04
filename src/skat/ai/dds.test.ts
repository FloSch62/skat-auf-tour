import { test } from "node:test";
import assert from "node:assert/strict";
import { Rng } from "../../core/rng.ts";
import { CARD_POINTS, cardsOf, parseCards, popcount } from "../rules/cards.ts";
import type { Card, CardMask } from "../rules/cards.ts";
import { deal } from "../rules/deal.ts";
import { legalMoves, playRules, trickWinner } from "../rules/play.ts";
import type { PlayKind } from "../rules/play.ts";
import { PointSolver, TrickSolver, legalOf } from "./dds.ts";

/** Plain minimax over every legal card: future points of `solo` (max for solo, min for the others). */
function brutePoints(kind: PlayKind, hands: number[], leader: number, trick: Card[], solo: number, maximize = true): number {
  const r = playRules(kind);
  const turn = (leader + trick.length) % 3;
  if (hands[0] === 0 && hands[1] === 0 && hands[2] === 0 && trick.length === 0) return 0;
  const legal = cardsOf(legalMoves(r, hands[turn], trick.length ? trick[0] : -1));
  const isMax = (turn === solo) === maximize;
  let best = isMax ? -1 : 999;
  for (const c of legal) {
    const h = [...hands];
    h[turn] &= ~(1 << c);
    let v: number;
    if (trick.length < 2) v = brutePoints(kind, h, leader, [...trick, c], solo, maximize);
    else {
      const w = (leader + trickWinner(r, trick[0], trick[1], c)) % 3;
      const pts = CARD_POINTS[trick[0]] + CARD_POINTS[trick[1]] + CARD_POINTS[c];
      v = (w === solo ? pts : 0) + brutePoints(kind, h, w, [], solo, maximize);
    }
    best = isMax ? Math.max(best, v) : Math.min(best, v);
  }
  return best;
}

/** Plain search for trick goals: solo takes no trick ("none") or every trick ("all"). */
function bruteTricks(kind: PlayKind, hands: number[], leader: number, trick: Card[], solo: number, goal: "none" | "all"): boolean {
  const r = playRules(kind);
  const turn = (leader + trick.length) % 3;
  if (hands[0] === 0 && hands[1] === 0 && hands[2] === 0 && trick.length === 0) return true;
  const legal = cardsOf(legalMoves(r, hands[turn], trick.length ? trick[0] : -1));
  const want = turn === solo;
  for (const c of legal) {
    const h = [...hands];
    h[turn] &= ~(1 << c);
    let v: boolean;
    if (trick.length < 2) v = bruteTricks(kind, h, leader, [...trick, c], solo, goal);
    else {
      const w = (leader + trickWinner(r, trick[0], trick[1], c)) % 3;
      v = (w === solo) === (goal === "all") ? bruteTricks(kind, h, w, [], solo, goal) : false;
    }
    if (v === want) return want;
  }
  return !want;
}

/** A random endgame: deal, then play random legal cards until `tricksLeft` tricks remain (plus `extra` cards). */
function randomEndgame(seed: number, kind: PlayKind, tricksLeft: number, extra = 0): { hands: number[]; leader: number; trick: Card[] } {
  const rng = new Rng(seed);
  const d = deal(seed, (seed % 3) as 0 | 1 | 2);
  const r = playRules(kind);
  const hands = [...d.hands];
  let leader = d.forehand as number;
  let trick: Card[] = [];
  const target = (10 - tricksLeft) * 3 + extra;
  for (let ply = 0; ply < target; ply++) {
    const turn = (leader + trick.length) % 3;
    const c = rng.pick(cardsOf(legalMoves(r, hands[turn], trick.length ? trick[0] : -1)));
    hands[turn] &= ~(1 << c);
    trick.push(c);
    if (trick.length === 3) {
      leader = (leader + trickWinner(r, trick[0], trick[1], trick[2])) % 3;
      trick = [];
    }
  }
  return { hands, leader, trick };
}

test("dds: point solver equals brute force on random endgames (suit, Grand, Ramsch)", () => {
  const ps = new PointSolver();
  const kinds: PlayKind[] = ["clubs", "hearts", "diamonds", "grand", "ramsch"];
  let checked = 0;
  for (let i = 0; i < 120; i++) {
    const kind = kinds[i % kinds.length];
    const left = 3 + (i % 2);
    const e = randomEndgame(500 + i, kind, left, i % 3);
    const solo = i % 3;
    const maximize = kind !== "ramsch";
    const want = brutePoints(kind, e.hands, e.leader, e.trick, solo, maximize);
    ps.load({ kind, hands: e.hands, leader: e.leader, trick: e.trick, solo }, maximize);
    assert.equal(ps.solve(), want, `exact ${kind} #${i}`);
    // Null-window tests agree with the exact value at every threshold.
    for (const t of [want - 3, want, want + 1, want + 11]) {
      ps.load({ kind, hands: e.hands, leader: e.leader, trick: e.trick, solo }, maximize);
      assert.equal(ps.atLeast(t), want >= t, `atLeast ${t} ${kind} #${i}`);
    }
    // Values after each first card.
    const p = { kind, hands: e.hands, leader: e.leader, trick: e.trick, solo };
    const cards = cardsOf(legalOf(p));
    ps.load(p, maximize);
    const out = new Array<number>(cards.length);
    ps.valuesAfter(cards, out);
    const turn = (e.leader + e.trick.length) % 3;
    cards.forEach((c, k) => {
      const h = [...e.hands];
      h[turn] &= ~(1 << c);
      const r = playRules(kind);
      let v: number;
      if (e.trick.length < 2) v = brutePoints(kind, h, e.leader, [...e.trick, c], solo, maximize);
      else {
        const w = (e.leader + trickWinner(r, e.trick[0], e.trick[1], c)) % 3;
        const pts = CARD_POINTS[e.trick[0]] + CARD_POINTS[e.trick[1]] + CARD_POINTS[c];
        v = (w === solo ? pts : 0) + brutePoints(kind, h, w, [], solo, maximize);
      }
      assert.equal(out[k], v, `after ${c} ${kind} #${i}`);
    });
    checked++;
  }
  assert.equal(checked, 120);
});

test("dds: trick solver equals brute force for Null and Schwarz", () => {
  const ts = new TrickSolver();
  for (let i = 0; i < 120; i++) {
    const kind: PlayKind = i % 2 ? "null" : "grand";
    const goal = kind === "null" ? "none" : "all";
    const e = randomEndgame(900 + i, kind, 3 + (i % 3), i % 3);
    const solo = (i * 7) % 3;
    const want = bruteTricks(kind, e.hands, e.leader, e.trick, solo, goal);
    ts.load({ kind, hands: e.hands, leader: e.leader, trick: e.trick, solo }, goal);
    assert.equal(ts.solve(), want, `${kind} #${i}`);
  }
});

test("dds: equivalent cards collapse (Kreuz-Bube and Pik-Bube in one hand)", () => {
  // Declarer holds CJ SJ + low clubs; the solver must still find the exact value.
  const hands = [parseCards("CJ SJ CA C7"), parseCards("HJ DJ CT C8"), parseCards("HA HT SA ST")];
  const want = brutePoints("clubs", hands, 0, [], 0);
  const ps = new PointSolver();
  ps.load({ kind: "clubs", hands, leader: 0, solo: 0 });
  assert.equal(ps.solve(), want);
});

test("dds: full deals solve fast enough for PIMC (null window)", () => {
  const ps = new PointSolver();
  let nodes = 0;
  for (let i = 0; i < 6; i++) {
    const d = deal(77 + i, 2);
    ps.load({ kind: "clubs", hands: d.hands, leader: 0, solo: 1 });
    const n0 = ps.nodes;
    ps.atLeast(55);
    nodes += ps.nodes - n0;
  }
  assert.ok(nodes / 6 < 2_000_000, `average nodes ${nodes / 6}`);
});

test("dds: node budget aborts deterministically", () => {
  const d = deal(5, 0);
  const ps = new PointSolver();
  ps.load({ kind: "grand", hands: d.hands, leader: 1, solo: 1 });
  const n0 = ps.nodes;
  ps.solve(-1, 121, 1000);
  assert.equal(ps.aborted, true);
  assert.ok(ps.nodes - n0 <= 1001);
  assert.equal(popcount(d.hands[0] | d.hands[1] | d.hands[2]), 30);
});

export type { CardMask };
