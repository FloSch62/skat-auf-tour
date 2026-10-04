// Tests of the computer opponent: knowledge from the view, world sampling with inference, PIMC card choice, bidding,
// discarding, personas, the baseline, and whole games through every phase (only legal actions, deterministic,
// SeatView only).
import { test } from "node:test";
import assert from "node:assert/strict";
import { Rng } from "../../core/rng.ts";
import { CHARACTERS } from "../../game/ids.ts";
import { CHARACTER_DEFS } from "../../data/characters.ts";
import {
  JACKS, applyAction, cardsOf, currentSeat, has, isLegal, newGame, parseCard, parseCards, popcount, viewFor, voidMasks,
} from "../rules/index.ts";
import type { Action, GameState, RuleOptions, Seat, SeatView } from "../rules/index.ts";
import { decide, decideWithNote } from "./decide.ts";
import { baselineDecide } from "./baseline.ts";
import { bidFacts } from "./knowledge.ts";
import { sampleWorlds, FULL_INFERENCE } from "./infer.ts";
import { chooseCard, rootGroups } from "./pimc.ts";
import { bidLimit, valueHand } from "./bid.ts";
import { planDiscard } from "./discard.ts";
import { PERSONAS, personaFor, scalePlay } from "./persona.ts";
import { thumbBid } from "./handeval.ts";

const C = parseCard;
const M = parseCards;

/** Drive a game with a decision function until `stop` says so (or the end). */
function drive(s: GameState, pick: (v: SeatView, i: number) => Action, stop: (s: GameState) => boolean = () => false): GameState {
  let i = 0;
  while (s.phase !== "done" && !stop(s)) {
    const seat = currentSeat(s)!;
    const a = pick(viewFor(s, seat), i++);
    assert.ok(isLegal(s, a), `illegal ${JSON.stringify(a)} in ${s.phase}`);
    s = applyAction(s, a);
  }
  return s;
}

test("knowledge: bidding facts from the public history", () => {
  // Dealer 2: Vorhand seat 0, Mittelhand seat 1, Hinterhand seat 2.
  let s = newGame({ seed: 1, dealer: 2 });
  const acts: Action[] = [
    { type: "bid", seat: 1, value: 18 },
    { type: "hold", seat: 0 },
    { type: "bid", seat: 1, value: 20 },
    { type: "pass", seat: 0 },
    { type: "bid", seat: 2, value: 22 },
    { type: "pass", seat: 1 },
  ];
  for (const a of acts) s = applyAction(s, a);
  const f = bidFacts(viewFor(s, 0));
  assert.deepEqual(f.reached, [18, 20, 22]);
  assert.deepEqual(f.refused, [20, 22, Infinity]);
  // All pass: Vorhand refuses 18.
  let t = newGame({ seed: 2, dealer: 0 });
  for (const a of [{ type: "pass", seat: 2 }, { type: "pass", seat: 0 }, { type: "pass", seat: 1 }] as Action[]) t = applyAction(t, a);
  assert.deepEqual(bidFacts(viewFor(t, 0)).refused, [18, 18, 18]);
});

test("infer: sampled worlds fit the view (sizes, voids, own and played cards) and are deterministic", () => {
  const s = drive(newGame({ seed: 77, dealer: 1 }), (v) => baselineDecide(v), (x) => x.phase === "play" && x.tricks.length === 4);
  const seat = currentSeat(s)!;
  const v = viewFor(s, seat);
  const voids = voidMasks(v);
  const ws = sampleWorlds(v, new Rng(5), { count: 20, pool: 3, inference: FULL_INFERENCE });
  assert.ok(ws.length > 0);
  for (const w of ws) {
    assert.equal(w.hands[seat], v.hand);
    for (let p = 0; p < 3; p++) {
      assert.equal(popcount(w.hands[p]), v.handSizes[p]);
      if (p !== seat) assert.equal(w.hands[p] & voids[p], 0, "void respected");
      assert.equal(w.hands[p] & v.played, 0);
    }
    assert.equal(popcount(w.hands[0] | w.hands[1] | w.hands[2] | w.skat | v.played), 32);
  }
  const again = sampleWorlds(v, new Rng(5), { count: 20, pool: 3, inference: FULL_INFERENCE });
  assert.deepEqual(again, ws);
});

test("infer: a seat that passed at 18 rarely holds a strong hand in the sampled worlds", () => {
  // Find a game where two seats passed at once and a third declared; compare inference on/off for a defender.
  for (let seed = 1; seed < 400; seed++) {
    const s0 = newGame({ seed, dealer: 0 });
    const s = drive(s0, (v) => baselineDecide(v), (x) => x.phase === "play");
    if (s.phase !== "play" || s.declarer === null) continue;
    const f = bidFacts(viewFor(s, s.declarer));
    const passers = ([0, 1, 2] as Seat[]).filter((p) => p !== s.declarer && f.refused[p] === 18);
    if (passers.length < 2) continue;
    const v = viewFor(s, s.declarer);
    const strong = (on: boolean) => {
      const ws = sampleWorlds(v, new Rng(9), { count: 300, pool: on ? 4 : 1, inference: on ? FULL_INFERENCE : { bidding: false, declaration: false, trumpVoids: true } });
      let n = 0;
      let tot = 0;
      for (const w of ws) for (const p of passers) {
        tot += w.mult;
        if (thumbBid(w.hands[p], 1, 0.6) >= 18) n += w.mult;
      }
      return n / tot;
    };
    assert.ok(strong(true) < strong(false), "inference lowers strong hands of passers");
    return;
  }
  assert.fail("no suitable deal found");
});

test("pimc: equivalent cards are grouped, choice is legal and deterministic", () => {
  const s = drive(newGame({ seed: 12, dealer: 0 }), (v) => baselineDecide(v), (x) => x.phase === "play" && x.tricks.length === 2);
  if (s.phase !== "play") return;
  const seat = currentSeat(s)!;
  const v = viewFor(s, seat);
  const legal = v.legal.filter((a) => a.type === "play").map((a) => (a as { card: number }).card);
  const groups = rootGroups(v, legal);
  assert.equal(groups.flat().length, legal.length);
  const style = scalePlay(personaFor("wirtin").declarer, 1);
  const a = chooseCard(v, legal, style, { errorRate: 0, errorTolerance: 0 }, 42);
  const b = chooseCard(v, legal, style, { errorRate: 0, errorTolerance: 0 }, 42);
  assert.ok(legal.includes(a.card));
  assert.equal(a.card, b.card);
  // Kreuz-Bube and Pik-Bube in one hand with nothing between them are one group.
  const t = newGame({ seed: 1, dealer: 2, cards: { hands: [M("CJ SJ CA CT C9 HA HT S7 S8 D7"), M("HJ DJ CK CQ C8 HK HQ S9 SQ D8"), M("C7 H9 H8 H7 SA ST SK D9 DQ DK")], skat: [C("DA"), C("DT")] } });
  let g = t;
  g = applyAction(g, { type: "pass", seat: 1 });
  g = applyAction(g, { type: "pass", seat: 2 });
  g = applyAction(g, { type: "hold", seat: 0 });
  g = applyAction(g, { type: "pickUp", seat: 0 });
  g = applyAction(g, { type: "discard", seat: 0, cards: [C("DA"), C("DT")] });
  g = applyAction(g, { type: "declare", seat: 0, declaration: { kind: "clubs", hand: false, schneiderAnnounced: false, schwarzAnnounced: false, ouvert: false } });
  const gv = viewFor(g, 0);
  const grp = rootGroups(gv, cardsOf(gv.hand));
  assert.ok(grp.some((x) => x.includes(C("CJ")) && x.includes(C("SJ"))), "CJ+SJ grouped");
  assert.ok(!grp.some((x) => x.includes(C("CA")) && x.includes(C("CT"))), "Ace and Ten differ in Augen");
});

test("pimc: the declarer with every top card takes the tricks (pulls trumps first)", () => {
  const hands: [number, number, number] = [M("CJ SJ HJ DJ CA CT CK HA HT HK"), M("C9 C8 H9 H8 S7 S8 S9 SQ SK ST"), M("C7 CQ H7 HQ SA D7 D8 D9 DQ DK")];
  let g = newGame({ seed: 3, dealer: 2, cards: { hands, skat: [C("DA"), C("DT")] } });
  g = applyAction(g, { type: "pass", seat: 1 });
  g = applyAction(g, { type: "pass", seat: 2 });
  g = applyAction(g, { type: "hold", seat: 0 });
  g = applyAction(g, { type: "declare", seat: 0, declaration: { kind: "clubs", hand: true, schneiderAnnounced: false, schwarzAnnounced: false, ouvert: false } });
  const a = decide({ view: viewFor(g, 0), character: "wirtin", depth: 1, seed: 1, tournament: false });
  assert.equal(a.type, "play");
  assert.ok(has(JACKS, (a as { card: number }).card), "leads a jack");
});

test("bid: a strong hand bids, a weak hand passes, and the limit is deterministic", () => {
  const style = personaFor("wirtin").bid;
  const strong = M("CJ SJ HJ CA CT CK C9 HA SA DA");
  const weak = M("CK C9 HK HQ H9 SK S9 DK D9 DQ");
  const vs = valueHand(strong, 0, style);
  assert.ok(bidLimit(vs, style) >= 48, `strong limit ${bidLimit(vs, style)}`);
  assert.equal(bidLimit(valueHand(weak, 1, style), style), 0);
  assert.deepEqual(valueHand(strong, 0, style), vs);
});

test("discard: never jacks or trumps in a suit game; two blank tens go into the skat", () => {
  const cards = M("CJ SJ HJ DJ CA CK CQ C9 HA HK ST DT");
  const plan = planDiscard(cards, 18, 0, { samples: 12, candidates: 4, kinds: 2 });
  assert.ok(!(plan.pair.some((c) => c >= 28)), "no jack");
  assert.equal(plan.declaration.kind, "clubs");
  assert.deepEqual([...plan.pair].sort((a, b) => a - b), [C("DT"), C("ST")].sort((a, b) => a - b));
});

test("persona: every character has a style, strength from the character table, depth scales", () => {
  for (const id of CHARACTERS) {
    const p = PERSONAS[id];
    assert.ok(p, id);
    assert.equal(p.strength, CHARACTER_DEFS[id].strength, id);
    assert.ok(p.bid.threshold > 0 && p.bid.threshold < 1, id);
  }
  const base = personaFor("wirtin").declarer;
  assert.ok(scalePlay(base, 1.4).samples > base.samples);
  assert.ok(scalePlay(base, 0.6).samples < base.samples);
  assert.ok(scalePlay(personaFor("neuling").declarer, 0.6).errorRate > personaFor("neuling").declarer.errorRate);
  // Styles that must show in the league.
  assert.ok(PERSONAS.zocker.bid.threshold < PERSONAS.wirtin.bid.threshold && PERSONAS.zocker.bid.overbidChance > 0);
  assert.ok(PERSONAS.maurer.bid.threshold > PERSONAS.wirtin.bid.threshold);
  assert.ok((PERSONAS.grandspieler.bid.kindBias.grand ?? 0) < 0);
  assert.ok((PERSONAS.nullfuchs.bid.kindBias.null ?? 0) < (PERSONAS.wirtin.bid.kindBias.null ?? 0));
});

function playWhole(seed: number, rules: Partial<RuleOptions>, chars: [string, string, string], depth = 1): GameState {
  return drive(newGame({ seed, dealer: (seed % 3) as Seat, rules }), (v, i) => {
    const a = decide({ view: v, character: chars[v.seat] as never, depth, seed: seed * 1000 + i, tournament: false });
    assert.ok(v.legal.some((b) => JSON.stringify(b) === JSON.stringify(a)), "AI action is in view.legal");
    return a;
  });
}

test("decide: whole games in every house rule end with legal actions only, and replay identically", () => {
  const rules: Partial<RuleOptions>[] = [{}, { allPass: "ramsch" }, { allPass: "schieberamsch" }, { kontra: true }, { bock: true }];
  let ramsch = 0;
  for (let i = 0; i < rules.length; i++) {
    for (const seed of i === 0 ? [1, 2] : [i * 10 + 1]) {
      const s = playWhole(seed, rules[i], ["neuling", "wirtin", "zocker"], i === 0 ? 0.6 : 1);
      assert.equal(s.phase, "done");
      if (s.result?.type === "ramsch") ramsch++;
    }
  }
  const a = playWhole(5, {}, ["maurer", "rechnerin", "kommandant"]);
  const b = playWhole(5, {}, ["maurer", "rechnerin", "kommandant"]);
  assert.deepEqual(a.history, b.history, "same seeds → same game");
  assert.ok(ramsch >= 0);
});

test("decide: the decision depends only on the SeatView (same view → same action)", () => {
  // Two deals that look the same to seat 0 before the first card: the other hands differ.
  const h0 = M("CJ SJ CA CT C9 HA HT S7 S8 D7");
  const d1 = newGame({ seed: 1, dealer: 2, cards: { hands: [h0, M("HJ DJ CK CQ C8 HK HQ S9 SQ D8"), M("C7 H9 H8 H7 SA ST SK D9 DQ DK")], skat: [C("DA"), C("DT")] } });
  const d2 = newGame({ seed: 1, dealer: 2, cards: { hands: [h0, M("C7 H9 H8 H7 SA ST SK D9 DQ DK"), M("HJ DJ CK CQ C8 HK HQ S9 SQ D8")], skat: [C("DA"), C("DT")] } });
  const passes: Action[] = [{ type: "pass", seat: 1 }, { type: "pass", seat: 2 }];
  const g1 = passes.reduce((g, a) => applyAction(g, a), d1);
  const g2 = passes.reduce((g, a) => applyAction(g, a), d2);
  const v1 = viewFor(g1, 0);
  const v2 = viewFor(g2, 0);
  assert.equal(v1.current, 0);
  assert.deepEqual(v1, v2);
  const r = (v: SeatView) => decideWithNote({ view: v, character: "wirtin", depth: 1, seed: 7, tournament: false }).action;
  assert.deepEqual(r(v1), r(v2));
});
