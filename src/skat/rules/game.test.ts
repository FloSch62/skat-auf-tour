import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_CARDS, bit, cardsOf, maskCodes, parseCard, parseCards } from "./cards.ts";
import type { Card, CardMask } from "./cards.ts";
import type { Seat } from "./deal.ts";
import {
  applyAction, checkAction, currentSeat, legalActions, legalCards, legalDeclarations, newGame, replay,
} from "./game.ts";
import type { Action, GameSetup, GameState } from "./game.ts";
import { gameOptions } from "./options.ts";
import { declaration } from "./value.ts";
import { sampleWorld, unknownCards, viewFor, voidMasks } from "./view.ts";
import { Rng } from "../../core/rng.ts";
import { valueBreakdown } from "./names.ts";

const C = parseCard;
const M = parseCards;

/** Fixed deal; dealer 0 → Vorhand 1, Mittelhand 2, Hinterhand 0. */
function fixed(h0: string, h1: string, h2: string, rules: GameSetup["rules"] = {}, extra: Partial<GameSetup> = {}): GameState {
  const hands: [CardMask, CardMask, CardMask] = [M(h0), M(h1), M(h2)];
  const skat = cardsOf(ALL_CARDS & ~hands[0] & ~hands[1] & ~hands[2]) as [Card, Card];
  assert.equal(skat.length, 2);
  return newGame({ seed: 1, dealer: 0, rules, cards: { hands, skat }, ...extra });
}

function act(s: GameState, a: Action): GameState {
  return applyAction(s, a);
}

const bid = (seat: Seat, value: number): Action => ({ type: "bid", seat, value });
const hold = (seat: Seat): Action => ({ type: "hold", seat });
const pass = (seat: Seat): Action => ({ type: "pass", seat });

function playRandomToEnd(s: GameState, seed = 3): GameState {
  const rng = new Rng(seed);
  while (s.phase === "play" || s.phase === "re") {
    const acts = legalActions(s).filter((a) => a.type === "play" || a.type === "noRe");
    s = applyAction(s, rng.pick(acts));
  }
  return s;
}

const H0 = "CJ SJ CA CT CK HA HT SA D7 D8"; // strong clubs/Grand hand
const H1 = "HJ DJ C7 C8 C9 H7 H8 H9 S7 S8";
const H2 = "CQ HK HQ ST SK SQ S9 DA DT DK";
// skat: D9 DQ

test("bidding: Mittelhand reizt Vorhand, then Hinterhand the survivor", () => {
  let s = fixed(H0, H1, H2);
  assert.equal(s.forehand, 1);
  assert.equal(currentSeat(s), 2, "Mittelhand starts");
  assert.ok(checkAction(s, bid(1, 18)), "Vorhand listens, cannot bid");
  assert.ok(checkAction(s, bid(2, 19)), "19 is no bid value");
  s = act(s, bid(2, 18));
  assert.equal(currentSeat(s), 1);
  assert.deepEqual(legalActions(s).map((a) => a.type), ["hold", "pass"]);
  s = act(s, hold(1));
  assert.ok(checkAction(s, bid(2, 18)), "must exceed the held value");
  s = act(s, bid(2, 30)); // jump bid
  s = act(s, pass(1));
  assert.equal(s.bidding.stage, 2);
  assert.equal(currentSeat(s), 0, "Hinterhand reizt now");
  assert.equal(s.bidding.listener, 2);
  assert.ok(checkAction(s, bid(0, 30)));
  s = act(s, bid(0, 33));
  s = act(s, hold(2));
  s = act(s, bid(0, 36));
  s = act(s, pass(2));
  assert.equal(s.phase, "skat");
  assert.equal(s.declarer, 0);
  assert.equal(s.bid, 36);
});

test("bidding: Mittelhand passes at once, Hinterhand reizt Vorhand", () => {
  let s = fixed(H0, H1, H2);
  s = act(s, pass(2));
  assert.equal(currentSeat(s), 0);
  s = act(s, bid(0, 18));
  s = act(s, hold(1));
  s = act(s, bid(0, 20));
  s = act(s, hold(1));
  s = act(s, pass(0));
  assert.equal(s.declarer, 1, "Vorhand keeps the game at the held value");
  assert.equal(s.bid, 20);
});

test("bidding: nobody bids, Vorhand may still play (ISkO 3.3.6) — or everybody passes", () => {
  let s = fixed(H0, H1, H2);
  s = act(s, pass(2));
  s = act(s, pass(0));
  assert.equal(s.bidding.stage, 3);
  assert.equal(currentSeat(s), 1);
  const t = act(s, hold(1));
  assert.equal(t.declarer, 1);
  assert.equal(t.bid, 18);
  assert.equal(t.phase, "skat");
  // Eingepasst.
  const u = act(s, pass(1));
  assert.equal(u.phase, "done");
  assert.equal(u.result!.type, "passed");
  assert.deepEqual(u.result!.list, [0, 0, 0]);
  // Ramsch.
  let r = fixed(H0, H1, H2, { allPass: "ramsch" });
  for (const seat of [2, 0, 1] as Seat[]) r = act(r, pass(seat));
  assert.equal(r.phase, "play");
  assert.equal(r.declarer, null);
  assert.equal(currentSeat(r), 1, "Vorhand leads in Ramsch");
  r = playRandomToEnd(r);
  assert.equal(r.result!.type, "ramsch");
  assert.equal(r.result!.points.reduce((a, b) => a + b, 0), 120, "skat goes to the last trick");
});

test("bidding up to 264: only passing is left", () => {
  let s = fixed(H0, H1, H2);
  s = act(s, bid(2, 264));
  s = act(s, hold(1));
  assert.deepEqual(legalActions(s).map((a) => a.type), ["pass"]);
});

test("skat, discard, declare; options show values and whether they reach the bid", () => {
  let s = fixed(H0, H1, H2);
  s = act(s, pass(2));
  s = act(s, bid(0, 18));
  s = act(s, pass(1));
  assert.equal(s.declarer, 0);
  assert.equal(legalDeclarations(s).length, 22, "5 × 4 Hand variants + Null Hand + Null ouvert Hand");
  const hand = gameOptions(s);
  const clubs = hand.find((o) => o.kind === "clubs")!;
  assert.equal(clubs.declaration.hand, true);
  assert.equal(clubs.value, 48, "Kreuz Hand mit 2");
  assert.equal(clubs.minValue, 48);
  assert.equal(clubs.maxValue, 108, "Herz- and Karo-Bube in the skat would make it mit 7");
  assert.equal(hand.find((o) => o.kind === "grand")!.value, 96);
  assert.equal(hand.find((o) => o.kind === "null")!.value, 35);
  const ouv = gameOptions(s, { ouvert: true });
  assert.equal(ouv.find((o) => o.kind === "grand")!.value, 24 * 9, "Grand ouvert mit 2");
  s = act(s, { type: "pickUp", seat: 0 });
  assert.equal(s.phase, "discard");
  assert.equal(maskCodes(s.hands[0] & M("D9 DQ")), maskCodes(M("D9 DQ")));
  assert.ok(checkAction(s, { type: "discard", seat: 0, cards: [C("D9"), C("D9")] }));
  assert.ok(checkAction(s, { type: "discard", seat: 0, cards: [C("D9"), C("HJ")] }), "not in hand");
  const before = gameOptions(s);
  assert.equal(before.find((o) => o.kind === "clubs")!.value, 36, "Kreuz mit 2 with the skat");
  s = act(s, { type: "discard", seat: 0, cards: [C("D7"), C("D8")] });
  assert.equal(s.phase, "declare");
  assert.equal(legalDeclarations(s).length, 7);
  const opts = gameOptions(s);
  assert.equal(opts.find((o) => o.kind === "hearts")!.value, 30);
  assert.equal(opts.find((o) => o.kind === "clubs")!.schneiderValue, 48);
  assert.equal(gameOptions(s, { ouvert: true }).find((o) => o.kind === "clubs")!.allowed, false, "no Kreuz ouvert after pick-up");
  assert.equal(gameOptions(s, { ouvert: true }).find((o) => o.kind === "null")!.allowed, true, "Null ouvert after pick-up");
  assert.ok(checkAction(s, { type: "declare", seat: 0, declaration: declaration("clubs", { hand: true }) }));
  s = act(s, { type: "declare", seat: 0, declaration: declaration("clubs") });
  assert.equal(s.phase, "play");
  assert.equal(currentSeat(s), 1, "Vorhand leads");
  assert.equal(s.skat, M("D7 D8"));
  s = playRandomToEnd(s);
  const r = s.result!;
  assert.equal(r.type, "declared");
  assert.equal(r.points.reduce((a, b) => a + b, 0), 120);
  assert.equal(r.matadors!.count, 2);
  assert.ok(valueBreakdown(r).length > 2);
});

test("Kontra and Re: before the defender's first card, ×2 / ×4", () => {
  let s = fixed(H0, H1, H2, { kontra: true });
  s = act(s, pass(2));
  s = act(s, bid(0, 18));
  s = act(s, pass(1));
  s = act(s, { type: "declare", seat: 0, declaration: declaration("grand", { hand: true }) });
  // Vorhand (seat 1, defender) is to lead and may say Kontra.
  assert.ok(legalActions(s).some((a) => a.type === "kontra"));
  s = act(s, { type: "kontra", seat: 1 });
  assert.equal(s.phase, "re");
  assert.equal(currentSeat(s), 0);
  s = act(s, { type: "re", seat: 0 });
  assert.equal(s.kontra, 2);
  assert.equal(currentSeat(s), 1);
  assert.ok(!legalActions(s).some((a) => a.type === "kontra"), "only one Kontra");
  s = playRandomToEnd(s);
  const r = s.result!;
  assert.equal(r.factor, 4);
  assert.equal(r.written, (r.won ? r.value : -2 * r.value) * 4);
  // The declarer cannot say Kontra, and a defender who already played cannot either.
  let t = fixed(H0, H1, H2, { kontra: true });
  t = act(t, pass(2));
  t = act(t, bid(0, 18));
  t = act(t, pass(1));
  t = act(t, { type: "declare", seat: 0, declaration: declaration("grand", { hand: true }) });
  t = act(t, { type: "play", seat: 1, card: C("C7") });
  assert.ok(legalActions(t).some((a) => a.type === "kontra"), "Mittelhand before his first card");
  t = act(t, { type: "play", seat: 2, card: C("CQ") });
  assert.ok(!legalActions(t).some((a) => a.type === "kontra"), "declarer has no Kontra");
  t = act(t, { type: "play", seat: 0, card: C("CA") });
  assert.ok(!legalActions(t).some((a) => a.type === "kontra"));
  // Without the house rule there is no Kontra.
  let u = fixed(H0, H1, H2);
  u = act(u, pass(2));
  u = act(u, bid(0, 18));
  u = act(u, pass(1));
  u = act(u, { type: "declare", seat: 0, declaration: declaration("grand", { hand: true }) });
  assert.ok(!legalActions(u).some((a) => a.type === "kontra"));
});

test("Null ends at the declarer's first trick; Null ouvert shows the declarer's cards", () => {
  // Seat 1 (Vorhand) plays Null and must take the first trick with the Kreuz-Ass.
  let s = fixed("C7 H7 H8 S9 ST SJ D9 DT DJ DQ", "CA HA HK HQ SA SK SQ DA DK D7", "C8 C9 CT CJ CQ CK H9 HT HJ S7");
  s = act(s, pass(2));
  s = act(s, pass(0));
  s = act(s, hold(1));
  s = act(s, { type: "declare", seat: 1, declaration: declaration("null", { hand: true, ouvert: true }) });
  const v2 = viewFor(s, 2);
  assert.equal(v2.openHand, s.hands[1], "ouvert: the declarer's hand is public");
  assert.equal(viewFor(s, 0).openHand, s.hands[1]);
  s = act(s, { type: "play", seat: 1, card: C("CA") });
  s = act(s, { type: "play", seat: 2, card: C("C8") });
  s = act(s, { type: "play", seat: 0, card: C("C7") });
  assert.equal(s.phase, "done");
  const r = s.result!;
  assert.equal(r.earlyEnd, true);
  assert.equal(r.won, false);
  assert.equal(r.value, 59);
  assert.equal(r.written, -118);
  assert.deepEqual(r.list, [40, -168, 40]);
});

test("views never show hidden cards", () => {
  let s = fixed(H0, H1, H2);
  s = act(s, pass(2));
  s = act(s, bid(0, 18));
  s = act(s, pass(1));
  const v1 = viewFor(s, 1);
  assert.equal(v1.skat, null);
  assert.equal(viewFor(s, 0).skat, null, "the declarer has not seen the skat yet");
  s = act(s, { type: "pickUp", seat: 0 });
  s = act(s, { type: "discard", seat: 0, cards: [C("D7"), C("D8")] });
  s = act(s, { type: "declare", seat: 0, declaration: declaration("clubs") });
  const d = viewFor(s, 0);
  const o = viewFor(s, 2);
  assert.equal(d.skat, M("D7 D8"), "declarer knows his discard");
  assert.equal(o.skat, null, "defenders do not");
  assert.equal(o.openHand, 0);
  const disc = o.history.find((a) => a.type === "discard")!;
  assert.ok(!("cards" in disc) || disc.cards === undefined, "the discard's cards are hidden from others");
  assert.ok(!("hands" in o) && !("undo" in o) && !("playHands" in o) && !("dealtSkat" in o));
  assert.equal(o.hand, s.hands[2]);
  assert.equal(unknownCards(o), ALL_CARDS & ~s.hands[2]);
  // Voids and sampling.
  s = act(s, { type: "play", seat: 1, card: C("H7") });
  s = act(s, { type: "play", seat: 2, card: C("HK") });
  s = act(s, { type: "play", seat: 0, card: C("HA") });
  s = act(s, { type: "play", seat: 0, card: C("SA") });
  s = act(s, { type: "play", seat: 1, card: C("S7") });
  s = act(s, { type: "play", seat: 2, card: C("SK") });
  const v = viewFor(s, 1);
  const w = sampleWorld(v, new Rng(4))!;
  assert.equal(w.hands[1], s.hands[1]);
  assert.equal((w.hands[0] | w.hands[1] | w.hands[2] | w.skat | s.played), ALL_CARDS);
  assert.equal(voidMasks(v)[1], ~s.hands[1]);
});

test("take-back perk: the own card returns while nobody has played after it", () => {
  let s = fixed(H0, H1, H2, {}, { takeBacks: [1, 0, 0] });
  s = act(s, pass(2));
  s = act(s, pass(0));
  s = act(s, hold(1));
  s = act(s, { type: "declare", seat: 1, declaration: declaration("grand", { hand: true }) });
  s = act(s, { type: "play", seat: 1, card: C("HJ") });
  s = act(s, { type: "play", seat: 2, card: C("DA") });
  const before = s;
  s = act(s, { type: "play", seat: 0, card: C("CJ") });
  assert.equal(s.tricks.length, 1);
  assert.ok(legalActions(s, 0).some((a) => a.type === "takeBack"));
  const back = act(s, { type: "takeBack", seat: 0 });
  assert.equal(back.hands[0], before.hands[0]);
  assert.equal(back.tricks.length, 0);
  assert.equal(back.turn, 0);
  assert.equal(back.takeBacksLeft[0], 0);
  assert.deepEqual(back.history, before.history);
  const again = act(back, { type: "play", seat: 0, card: C("SJ") });
  assert.ok(!legalActions(again, 0).some((a) => a.type === "takeBack"), "only one per game");
  // Not after another seat has played.
  let t = fixed(H0, H1, H2, {}, { takeBacks: [1, 0, 0] });
  t = act(t, pass(2));
  t = act(t, pass(0));
  t = act(t, hold(1));
  t = act(t, { type: "declare", seat: 1, declaration: declaration("grand", { hand: true }) });
  assert.ok(!legalActions(t, 0).some((a) => a.type === "takeBack"));
});

test("peek perk: one skat card, only before the own first bidding decision", () => {
  let s = fixed(H0, H1, H2, {}, { peeks: [1, 0, 0] });
  assert.ok(legalActions(s, 0).some((a) => a.type === "peek"));
  s = act(s, { type: "peek", seat: 0, index: 1 });
  assert.equal(viewFor(s, 0).revealed, bit(s.dealtSkat[1]));
  assert.equal(viewFor(s, 1).revealed, 0);
  assert.ok(!legalActions(s, 0).some((a) => a.type === "peek"));
  let t = fixed(H0, H1, H2, {}, { peeks: [2, 0, 0] });
  t = act(t, pass(2));
  t = act(t, pass(0));
  assert.ok(!legalActions(t, 0).some((a) => a.type === "peek"), "after his own bidding decision");
});

test("Schieberamsch: shove doubles, jacks may not be pushed", () => {
  let s = fixed(H0, H1, H2, { allPass: "schieberamsch" });
  for (const seat of [2, 0, 1] as Seat[]) s = act(s, pass(seat));
  assert.equal(s.phase, "schieben");
  assert.equal(currentSeat(s), 1, "Vorhand first");
  s = act(s, { type: "shove", seat: 1 });
  assert.equal(currentSeat(s), 2);
  s = act(s, { type: "pickUp", seat: 2 });
  assert.equal(s.hands[2] & M("D9 DQ"), M("D9 DQ"));
  assert.ok(checkAction(s, { type: "discard", seat: 2, cards: [C("D9"), C("HJ")] }), "not his card");
  s = act(s, { type: "discard", seat: 2, cards: [C("DA"), C("DT")] });
  assert.equal(currentSeat(s), 0);
  s = act(s, { type: "pickUp", seat: 0 });
  assert.ok(checkAction(s, { type: "discard", seat: 0, cards: [C("CJ"), C("D7")] }), "jacks may not be pushed");
  assert.ok(legalActions(s).every((a) => a.type !== "discard" || !a.cards.some((c) => c >= 28)));
  s = act(s, { type: "discard", seat: 0, cards: [C("DA"), C("DT")] });
  assert.equal(s.phase, "play");
  assert.equal(viewFor(s, 0).skat, M("DA DT"), "the last passer knows the skat");
  assert.equal(viewFor(s, 2).skat, null);
  s = playRandomToEnd(s);
  const r = s.result!;
  assert.equal(r.ramsch!.shoves, 1);
  assert.equal(r.factor % 2, 0);
  assert.equal(r.points.reduce((a, b) => a + b, 0), 120);
});

test("Ramsch Durchmarsch with a fixed deal", () => {
  let s = fixed("C7 C8 C9 H7 H8 H9 S7 S8 S9 D7", "CJ SJ HJ DJ CA CT SA ST HA DA", "CQ CK HK HQ SK SQ DK DQ D8 D9", { allPass: "ramsch" });
  for (const seat of [2, 0, 1] as Seat[]) s = act(s, pass(seat));
  const lead = ["CJ", "SJ", "HJ", "DJ", "CA", "CT", "SA", "ST", "HA", "DA"];
  for (const code of lead) {
    s = act(s, { type: "play", seat: 1, card: C(code) });
    for (const seat of [2, 0] as Seat[]) s = act(s, { type: "play", seat, card: cardsOf(legalCards(s))[0] });
  }
  const r = s.result!;
  assert.equal(r.ramsch!.durchmarsch, 1);
  assert.deepEqual(r.list, [0, 120, 0]);
  assert.equal(r.won, true);
});

test("replay: the same setup and actions give the same game", () => {
  let s = newGame({ seed: 2024, dealer: 1 });
  const rng = new Rng(9);
  while (s.phase !== "done") {
    const acts = legalActions(s).filter((a) => a.type !== "peek" && a.type !== "takeBack" && a.type !== "kontra");
    const a = s.phase === "bidding" ? acts.find((x) => x.type === "pass") ?? acts[0] : rng.pick(acts);
    if (s.phase === "bidding" && s.bidding.stage === 3) s = applyAction(s, { type: "hold", seat: currentSeat(s)! });
    else s = applyAction(s, a);
  }
  const again = replay({ seed: 2024, dealer: 1 }, s.history);
  assert.deepEqual(again.result, s.result);
  assert.deepEqual(JSON.parse(JSON.stringify(s)).result, s.result, "states are JSON-serialisable");
});
