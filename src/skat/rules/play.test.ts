import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_CARDS, CARD_POINTS, JACKS, cardCode, cardFromSprite, cardSprite, cardsOf, highestCard, lowestCard, maskCodes,
  parseCard, parseCards, pointsOf, popcount,
} from "./cards.ts";
import { cardName, declarationName, kindName, matadorLabel } from "./names.ts";
import { deal, dealByPosition, forehandOf, positionOf, seatAt } from "./deal.ts";
import { Position, TRUMP, legalMoves, playRules, trickWinner } from "./play.ts";
import { declaration } from "./value.ts";
import type { PlayKind } from "./play.ts";

const C = parseCard;
const M = parseCards;

test("cards: 32 cards, 120 Augen, bit helpers", () => {
  assert.equal(popcount(ALL_CARDS), 32);
  assert.equal(pointsOf(ALL_CARDS), 120);
  assert.equal(CARD_POINTS.reduce((a, b) => a + b, 0), 120);
  assert.equal(popcount(JACKS), 4);
  assert.equal(pointsOf(JACKS), 8);
  assert.equal(highestCard(ALL_CARDS), C("CJ"));
  assert.equal(lowestCard(ALL_CARDS), C("D7"));
  assert.equal(lowestCard(1 << 31), 31);
  assert.equal(cardsOf(ALL_CARDS).length, 32);
  assert.equal(pointsOf(M("CA CT CK CQ CJ C9 C8 C7")), 30);
  for (let c = 0; c < 32; c++) {
    assert.equal(parseCard(cardCode(c)), c);
    const sp = cardSprite(c);
    assert.equal(cardFromSprite(sp.suit, sp.rank), c);
  }
  assert.deepEqual(cardSprite(C("CJ")), { suit: "clubs", rank: "jack" });
  assert.deepEqual(cardSprite(C("H10")), { suit: "hearts", rank: "10" });
  assert.deepEqual(cardSprite(C("DQ")), { suit: "diamonds", rank: "queen" });
  assert.equal(maskCodes(M("SA D7 CJ")), "D7 SA CJ");
  assert.throws(() => parseCards("CJ CJ"));
});

test("names: French and German deck", () => {
  assert.equal(cardName(C("CJ")), "Kreuz-Bube");
  assert.equal(cardName(C("HT")), "Herz-Zehn");
  assert.equal(cardName(C("SA")), "Pik-Ass");
  assert.equal(cardName(C("DQ")), "Karo-Dame");
  assert.equal(cardName(C("CJ"), "german"), "Eichel-Unter");
  assert.equal(cardName(C("SQ"), "german"), "Grün-Ober");
  assert.equal(cardName(C("HK"), "german"), "Herz-König");
  assert.equal(cardName(C("HK"), "german", { red: "Rot" }), "Rot-König");
  assert.equal(cardName(C("DA"), "german"), "Schellen-Daus");
  assert.equal(cardName(C("SA"), "tournament"), "Pik-Ass");
  assert.equal(kindName("spades", "german"), "Grün");
  assert.equal(declarationName(declaration("clubs", { hand: true, schneiderAnnounced: true })), "Kreuz Hand Schneider angesagt");
  assert.equal(declarationName(declaration("grand", { ouvert: true })), "Grand ouvert");
  assert.equal(declarationName(declaration("null", { hand: true, ouvert: true })), "Null ouvert Hand");
  assert.equal(matadorLabel({ count: 2, withTops: false }), "ohne 2");
});

test("deal: 3 – Skat – 4 – 3, same seed same deal, positions rotate with the dealer", () => {
  for (const seed of [1, 42, 123456789, 4294967295]) {
    const a = dealByPosition(seed);
    const b = dealByPosition(seed);
    assert.deepEqual(a, b);
    const all = a.hands[0] | a.hands[1] | a.hands[2] | (1 << a.skat[0]) | (1 << a.skat[1]);
    assert.equal(all, ALL_CARDS);
    assert.deepEqual(a.hands.map(popcount), [10, 10, 10]);
  }
  assert.notDeepEqual(dealByPosition(1).hands, dealByPosition(2).hands);
  for (const dealer of [0, 1, 2] as const) {
    const fh = forehandOf(dealer);
    assert.equal(fh, (dealer + 1) % 3);
    assert.equal(seatAt(0, dealer), fh);
    assert.equal(seatAt(2, dealer), dealer, "the dealer sits in Hinterhand");
    for (const seat of [0, 1, 2] as const) assert.equal(seatAt(positionOf(seat, dealer), dealer), seat);
    const d = deal(77, dealer);
    const p = dealByPosition(77);
    assert.equal(d.hands[fh], p.hands[0], "Vorhand gets the same cards for the same seed");
    assert.equal(d.hands[dealer], p.hands[2]);
  }
  // Seat 2 dealing puts the player (seat 0) in Vorhand.
  assert.equal(forehandOf(2), 0);
});

const legal = (kind: PlayKind, hand: string, led: string) => maskCodes(legalMoves(playRules(kind), M(hand), C(led)));

test("Bedienpflicht: jacks are trumps, never their printed suit (suit games and Grand)", () => {
  // Pik game, Herz led: the Herz-Bube is a trump, so a hand with only HJ in "Herz" cannot follow → free choice.
  assert.equal(legal("spades", "HJ SA C7", "HA"), maskCodes(M("C7 SA HJ")));
  // … and with a real Herz card it must play that, not the jack.
  assert.equal(legal("spades", "HJ H7 SA", "HA"), maskCodes(M("H7")));
  // Trump led (Kreuz-Bube) in Pik: any trump, i.e. Pik cards and jacks.
  assert.equal(legal("spades", "SA HJ C7 D8", "CJ"), maskCodes(M("SA HJ")));
  assert.equal(legal("spades", "HJ C7 D8", "S7"), maskCodes(M("HJ")));
  assert.equal(legal("spades", "C7 D8", "CJ"), maskCodes(M("D8 C7")));
  // Herz game, the jack of the trump suit counts as trump: Herz led → Herz-Bube follows.
  assert.equal(legal("hearts", "HJ C7 S8", "HA"), maskCodes(M("HJ")));
  assert.equal(legal("hearts", "SJ C7 S8", "H7"), maskCodes(M("SJ")));
  // Grand: Kreuz led, the Kreuz-Bube is not Kreuz.
  assert.equal(legal("grand", "CJ C7 HA", "CA"), maskCodes(M("C7")));
  assert.equal(legal("grand", "CJ HA", "CA"), maskCodes(M("HA CJ")));
  assert.equal(legal("grand", "CJ HA", "DJ"), maskCodes(M("CJ")));
  // Ramsch like Grand.
  assert.equal(legal("ramsch", "CJ C7 HA", "CA"), maskCodes(M("C7")));
  // Null: no trumps, the jack is a Kreuz card.
  assert.equal(legal("null", "CJ HA", "CA"), maskCodes(M("CJ")));
  assert.equal(legal("null", "SJ HA", "CA"), maskCodes(M("HA SJ")));
  assert.equal(legal("null", "CJ SJ", "SA"), maskCodes(M("SJ")));
  // No card led: anything.
  assert.equal(maskCodes(legalMoves(playRules("clubs"), M("CJ HA"), -1)), maskCodes(M("CJ HA")));
});

const win = (kind: PlayKind, trick: string) => {
  const [a, b, c] = trick.split(" ").map(C);
  return trickWinner(playRules(kind), a, b, c);
};

test("trick winners", () => {
  // Herz game.
  assert.equal(win("hearts", "ST SA S7"), 1, "higher card of the led suit");
  assert.equal(win("hearts", "ST H7 SA"), 1, "the only trump");
  assert.equal(win("hearts", "ST H7 HA"), 2, "higher trump overtrumps");
  assert.equal(win("hearts", "HA DJ HT"), 1, "Karo-Bube beats Herz-Ass");
  assert.equal(win("hearts", "DJ CJ SJ"), 1, "Kreuz-Bube highest");
  assert.equal(win("hearts", "SK DA CA"), 0, "discards do not win");
  assert.equal(win("hearts", "S7 SQ SK"), 2);
  assert.equal(win("hearts", "SQ ST SK"), 1, "Zehn above König");
  // Grand.
  assert.equal(win("grand", "CA CT CJ"), 2, "jack trumps");
  assert.equal(win("grand", "CA HA DA"), 0);
  assert.equal(win("grand", "HJ SJ DJ"), 1);
  // Null: 7 8 9 10 B D K A.
  assert.equal(win("null", "CT CJ C9"), 1, "Bube above Zehn in Null");
  assert.equal(win("null", "CJ CQ CK"), 2);
  assert.equal(win("null", "C7 HA SA"), 0, "no trumps in Null");
  assert.equal(win("null", "HT H9 HJ"), 2);
  // Ramsch.
  assert.equal(win("ramsch", "DJ HA CJ"), 2);
});

test("play rules tables: classes, highest bit = strongest card outside Null", () => {
  const r = playRules("diamonds");
  assert.equal(r.classOf[C("DJ")], TRUMP);
  assert.equal(r.classOf[C("DA")], TRUMP);
  assert.equal(r.classOf[C("HA")], 1);
  assert.equal(popcount(r.trumps), 11);
  assert.equal(popcount(playRules("grand").trumps), 4);
  assert.equal(playRules("null").trumps, 0);
  for (const kind of ["diamonds", "hearts", "spades", "clubs", "grand", "ramsch"] as PlayKind[]) {
    const pr = playRules(kind);
    for (let k = 0; k <= TRUMP; k++) {
      const cs = cardsOf(pr.classMask[k]);
      for (let i = 1; i < cs.length; i++) assert.ok(pr.order[cs[i]] > pr.order[cs[i - 1]], `${kind} class ${k} order`);
    }
  }
  assert.deepEqual(playRules("hearts").matadorOrder.map(cardCode), ["CJ", "SJ", "HJ", "DJ", "HA", "HT", "HK", "HQ", "H9", "H8", "H7"]);
});

test("Position: play/undo restores everything, points add up to 120", () => {
  const d = deal(99, 0);
  const r = playRules("grand");
  const p = new Position(r, d.hands, d.forehand, 1);
  const snaps: string[] = [];
  const snap = () => JSON.stringify([...p.hands, ...p.points, ...p.tricks, p.turn, p.leader, p.played, p.ply]);
  let seed = 5;
  while (!p.isOver()) {
    snaps.push(snap());
    const m = p.legal();
    const cs = cardsOf(m);
    seed = (seed * 1103515245 + 12345) >>> 0;
    p.play(cs[seed % cs.length]);
  }
  assert.equal(p.points[0] + p.points[1] + p.points[2], 120 - pointsOf((1 << d.skat[0]) | (1 << d.skat[1])));
  assert.equal(p.tricks[0] + p.tricks[1] + p.tricks[2], 10);
  for (let i = snaps.length - 1; i >= 0; i--) {
    p.undo();
    assert.equal(snap(), snaps[i]);
  }
});

test("Position: Null ends at the declarer's first trick; partial start trick", () => {
  // Declarer seat 0 must take the first trick with CA.
  const hands = [M("CA HA H7 S7 S8 S9 D7 D8 D9 DT"), M("C7 C8 C9 H8 H9 S7".replace("S7", "SQ") + " SK SA DQ DK"), 0];
  hands[2] = ALL_CARDS & ~hands[0] & ~hands[1] & ~M("CT CJ");
  const p = new Position(playRules("null"), hands, 0, 0);
  p.play(C("CA"));
  p.play(C("C7"));
  assert.ok(!p.isOver());
  const third = cardsOf(p.legal())[0];
  p.play(third);
  assert.equal(p.tricks[0], 1);
  assert.ok(p.isOver());
  // Start in the middle of a trick.
  const q = new Position(playRules("grand"), [M("CA"), M("C7"), M("C8")], 1, 0, { trick: [C("C9")], points: [0, 0, 0] });
  assert.equal(q.turn, 2);
  assert.equal(maskCodes(q.legal()), "C8");
  q.play(C("C8"));
  q.play(C("CA"));
  assert.equal(q.lastTrickWinner(), 0);
  assert.equal(q.points[0], 11);
  q.undo();
  q.undo();
  assert.equal(q.turn, 2);
  assert.equal(q.points[0], 0);
});

test("display order: jacks, trump suit, alternating colours; Null keeps jacks in their suit", async () => {
  const { sortHand, recordLabel } = await import("./names.ts");
  const codes = (cs: number[]) => cs.map(cardCode).join(" ");
  const hand = M("D7 HA SJ CT C7 SA HT DJ D9 S8");
  assert.equal(codes(sortHand(hand)), "SJ DJ CT C7 HA HT SA S8 D9 D7");
  assert.equal(codes(sortHand(hand, "diamonds")), "SJ DJ D9 D7 CT C7 HA HT SA S8");
  assert.equal(codes(sortHand(hand, "null")), "CT C7 HA HT SA SJ S8 DJ D9 D7");
  assert.equal(
    recordLabel({
      seed: 1, forehand: 0, declarer: 0, kind: "clubs", hand: true, ouvert: false, schneiderAnnounced: false,
      schwarzAnnounced: false, schneider: true, schwarz: false, matadors: 2, withTops: true, bid: 48, won: true,
      overbid: false, points: 95, value: 60, kontra: 0, list: [110, 0, 0],
    }),
    "Kreuz mit 2 Hand Schneider",
  );
});
