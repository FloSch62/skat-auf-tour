// Game values against worked examples. "ISkO x.y" = example printed in the Internationale Skatordnung (Altenburg 2002
// edition of the 1998 rules) or its booklet part "Wissenswertes für Skatspieler"; the rest are standard club cases.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCards } from "./cards.ts";
import {
  BID_VALUES, declaration, declarationError, declarationValue, matadors, nextBid, settle,
} from "./value.ts";
import type { DeclKind, Declaration } from "./value.ts";
import { seegerFabian } from "./list.ts";

test("bid list: every game value from 18 to 264", () => {
  assert.deepEqual(BID_VALUES, [
    18, 20, 22, 23, 24, 27, 30, 33, 35, 36, 40, 44, 45, 46, 48, 50, 54, 55, 59, 60, 63, 66, 70, 72, 77, 80, 81, 84, 88,
    90, 96, 99, 100, 108, 110, 117, 120, 121, 126, 130, 132, 135, 140, 143, 144, 150, 153, 154, 156, 160, 162, 165, 168,
    170, 176, 180, 187, 192, 198, 204, 216, 240, 264,
  ]);
  assert.equal(nextBid(0), 18);
  assert.equal(nextBid(18), 20);
  assert.equal(nextBid(22), 23);
  assert.equal(nextBid(59), 60);
  assert.equal(nextBid(216), 240);
  assert.equal(nextBid(264), null);
});

test("matadors with/without, skat included", () => {
  const m = (cards: string, kind: Exclude<DeclKind, "null">) => matadors(parseCards(cards), kind);
  assert.deepEqual(m("CJ D7 D8 HA HT HK SA ST S7 C7 C8 C9", "diamonds"), { count: 1, withTops: true });
  assert.deepEqual(m("CJ SJ HA HT HK SA ST S7 C7 C8 C9 D7", "diamonds"), { count: 2, withTops: true });
  assert.deepEqual(m("CJ SJ HJ HA HT HK SA ST S7 C7 C8 C9", "grand"), { count: 3, withTops: true });
  assert.deepEqual(m("CJ SJ HJ DJ CA CT HA HT SA ST DA DT", "grand"), { count: 4, withTops: true });
  assert.deepEqual(m("CJ SJ HJ DJ CA CT HA HT SA ST DA DT", "clubs"), { count: 6, withTops: true });
  assert.deepEqual(m("CJ SJ HJ DJ CA CT CK CQ C9 C8 C7 HA", "clubs"), { count: 11, withTops: true });
  assert.deepEqual(m("SJ HA HT HK SA ST S7 C7 C8 C9 D7 D8", "hearts"), { count: 1, withTops: false });
  assert.deepEqual(m("HJ HA HT HK SA ST S7 C7 C8 C9 D7 D8", "hearts"), { count: 2, withTops: false });
  assert.deepEqual(m("DJ HA HT HK SA ST S7 C7 C8 C9 D7 D8", "hearts"), { count: 3, withTops: false });
  assert.deepEqual(m("HA HT HK SA ST S7 C7 C8 C9 D7 D8 D9", "hearts"), { count: 4, withTops: false });
  assert.deepEqual(m("HT HK HQ SA ST S7 C7 C8 C9 D7 D8 D9", "hearts"), { count: 5, withTops: false });
  assert.deepEqual(m("H7 SA ST S7 C7 C8 C9 D7 D8 D9 DA DT", "hearts"), { count: 10, withTops: false });
  assert.deepEqual(m("SA ST S7 C7 C8 C9 D7 D8 D9 DA DT DK", "hearts"), { count: 11, withTops: false });
  assert.deepEqual(m("SA ST S7 C7 C8 C9 D7 D8 D9 DA DT DK", "grand"), { count: 4, withTops: false });
  // The skat counts: Kreuz-Bube in the skat turns "ohne 3" into "mit 1".
  assert.deepEqual(m("DJ HA HT HK SA ST S7 C7 C8 C9", "hearts"), { count: 3, withTops: false });
  assert.deepEqual(m("DJ HA HT HK SA ST S7 C7 C8 C9 CJ D8", "hearts"), { count: 1, withTops: true });
});

interface Example {
  name: string;
  decl: Declaration;
  /** The declarer's 12 cards (hand + skat). */
  cards: string;
  bid: number;
  points: number;
  tricks: number;
  /** Defender tricks (default 10 − tricks). */
  defTricks?: number;
  won: boolean;
  value: number;
  written: number;
  overbid?: boolean;
}

const D = declaration;
const MIT1_CLUBS_SUITGAME = "CJ HA HT HK HQ SA ST S7 C7 C8 D7 D8"; // mit 1 for every suit (has CJ, no SJ)
const MIT1 = MIT1_CLUBS_SUITGAME;
const OHNE1 = "SJ HA HT HK SA ST S7 C7 C8 C9 D7 D8"; // ohne 1 (no CJ, has SJ) in every suit game and Grand

const EXAMPLES: Example[] = [
  // ── simple games ──
  { name: "Karo mit 1 = 18", decl: D("diamonds"), cards: MIT1, bid: 18, points: 70, tricks: 6, won: true, value: 18, written: 18 },
  { name: "Karo ohne 1 = 18", decl: D("diamonds"), cards: OHNE1, bid: 18, points: 61, tricks: 5, won: true, value: 18, written: 18 },
  { name: "60 Augen verlieren: Karo mit 1 −36", decl: D("diamonds"), cards: MIT1, bid: 18, points: 60, tricks: 5, won: false, value: 18, written: -36 },
  { name: "Herz ohne 4 = 50", decl: D("hearts"), cards: "HA HT HK HQ H9 SA ST CA CT DA DT D9", bid: 50, points: 80, tricks: 7, won: true, value: 50, written: 50 },
  { name: "Pik mit 2 = 33", decl: D("spades"), cards: "CJ SJ SA ST SK HA HT DA DT D9 C7 C8", bid: 33, points: 75, tricks: 6, won: true, value: 33, written: 33 },
  { name: "Kreuz mit 4 = 60", decl: D("clubs"), cards: "CJ SJ HJ DJ CT CK HA HT SA ST DA D7", bid: 60, points: 88, tricks: 8, won: true, value: 60, written: 60 },
  { name: "Grand mit 1 = 48", decl: D("grand"), cards: "CJ HJ CA CT HA HT SA ST DA DT D9 D8", bid: 48, points: 66, tricks: 6, won: true, value: 48, written: 48 },
  // ── Schneider / Schwarz ──
  { name: "Defenders with 30 are Schneider: Karo mit 1 = 27", decl: D("diamonds"), cards: MIT1, bid: 18, points: 90, tricks: 8, won: true, value: 27, written: 27 },
  { name: "Defenders with 31 are not Schneider", decl: D("diamonds"), cards: MIT1, bid: 18, points: 89, tricks: 8, won: true, value: 18, written: 18 },
  { name: "Declarer with 30 is Schneider: Karo mit 1 −54", decl: D("diamonds"), cards: MIT1, bid: 18, points: 30, tricks: 2, won: false, value: 27, written: -54 },
  { name: "Declarer with 31 is not Schneider", decl: D("diamonds"), cards: MIT1, bid: 18, points: 31, tricks: 3, won: false, value: 18, written: -36 },
  { name: "Lost Schwarz: Kreuz mit 2, no trick −120", decl: D("clubs"), cards: "CJ SJ CA CT HA HT SA ST DA DT D9 D8", bid: 36, points: 0, tricks: 0, won: false, value: 60, written: -120 },
  { name: "Schwarz without a trick even with skat points: Kreuz mit 2 −120", decl: D("clubs"), cards: "CJ SJ CA CT HA HT SA ST DA DT D9 D8", bid: 36, points: 21, tricks: 0, won: false, value: 60, written: -120 },
  { name: "Grand mit 2 Schwarz (not announced) = 120", decl: D("grand"), cards: "CJ SJ CA CT HA HT SA ST DA DT D9 D8", bid: 72, points: 120, tricks: 10, won: true, value: 120, written: 120 },
  { name: "ISkO 5.2.4: one trick without Augen is Schneider, not Schwarz: Grand mit 1 = 72", decl: D("grand"), cards: "CJ HJ CA CT HA HT SA ST DA DT D9 D8", bid: 48, points: 120, tricks: 9, defTricks: 1, won: true, value: 72, written: 72 },
  // ── Hand games and announcements ──
  { name: "Grand Hand ohne 2 = 96", decl: D("grand", { hand: true }), cards: "HJ DJ CA CT CK HA HT HK SA ST DA DT", bid: 96, points: 75, tricks: 7, won: true, value: 96, written: 96 },
  { name: "Grand Hand mit 4 Schneider = 168", decl: D("grand", { hand: true }), cards: "CJ SJ HJ DJ CA CT HA HT SA ST DA DT", bid: 120, points: 95, tricks: 9, won: true, value: 168, written: 168 },
  { name: "Grand Hand mit 1 Schwarz (not announced) = 120", decl: D("grand", { hand: true }), cards: "CJ HJ CA CT HA HT SA ST DA DT D9 D8", bid: 48, points: 120, tricks: 10, won: true, value: 120, written: 120 },
  { name: "Grand Hand ohne 4 Schneider angesagt = 192", decl: D("grand", { hand: true, schneiderAnnounced: true }), cards: "CA CT CK HA HT HK SA ST SK DA DT DK", bid: 192, points: 92, tricks: 9, won: true, value: 192, written: 192 },
  { name: "Herz Hand Schneider angesagt mit 1 = 50", decl: D("hearts", { hand: true, schneiderAnnounced: true }), cards: MIT1, bid: 50, points: 91, tricks: 8, won: true, value: 50, written: 50 },
  { name: "Schneider angesagt missed: Herz Hand mit 1 −100", decl: D("hearts", { hand: true, schneiderAnnounced: true }), cards: MIT1, bid: 50, points: 85, tricks: 8, won: false, value: 50, written: -100 },
  { name: "Schneider angesagt, Schwarz reached: Herz Hand mit 1 = 60", decl: D("hearts", { hand: true, schneiderAnnounced: true }), cards: MIT1, bid: 50, points: 120, tricks: 10, won: true, value: 60, written: 60 },
  { name: "ISkO 5.2.5 no Eigenschneider: Kreuz Hand Schneider angesagt mit 1, declarer 20 Augen −120", decl: D("clubs", { hand: true, schneiderAnnounced: true }), cards: MIT1, bid: 60, points: 20, tricks: 2, won: false, value: 60, written: -120 },
  { name: "Schneider angesagt, declarer schwarz: Kreuz Hand mit 1 −144", decl: D("clubs", { hand: true, schneiderAnnounced: true }), cards: MIT1, bid: 60, points: 0, tricks: 0, won: false, value: 72, written: -144 },
  { name: "Pik Hand Schwarz angesagt ohne 2 = 88", decl: D("spades", { hand: true, schwarzAnnounced: true }), cards: "HJ DJ SA ST SK SQ S9 HA HT CA CT DA", bid: 88, points: 120, tricks: 10, won: true, value: 88, written: 88 },
  { name: "Schwarz angesagt, defenders got a trick: Pik Hand ohne 2 −176", decl: D("spades", { hand: true, schwarzAnnounced: true }), cards: "HJ DJ SA ST SK SQ S9 HA HT CA CT DA", bid: 88, points: 110, tricks: 9, won: false, value: 88, written: -176 },
  // ── Ouvert ──
  { name: "ISkO 5.2.6: Kreuz ouvert mit 2 = 9 × 12 = 108", decl: D("clubs", { ouvert: true }), cards: "CJ SJ CA CT CK CQ C9 C8 HA HT SA ST", bid: 108, points: 120, tricks: 10, won: true, value: 108, written: 108 },
  { name: "ISkO 5.2.6: Grand ouvert mit 4 = 11 × 24 = 264", decl: D("grand", { ouvert: true }), cards: "CJ SJ HJ DJ CA CT HA HT SA ST DA DT", bid: 264, points: 120, tricks: 10, won: true, value: 264, written: 264 },
  { name: "Kreuz ouvert mit 11 = 18 × 12 = 216", decl: D("clubs", { ouvert: true }), cards: "CJ SJ HJ DJ CA CT CK CQ C9 C8 C7 HA", bid: 216, points: 120, tricks: 10, won: true, value: 216, written: 216 },
  { name: "Kreuz ouvert lost (one trick given): −216", decl: D("clubs", { ouvert: true }), cards: "CJ SJ CA CT CK CQ C9 C8 HA HT SA ST", bid: 108, points: 115, tricks: 9, won: false, value: 108, written: -216 },
  // ── Null ──
  { name: "Null = 23", decl: D("null"), cards: "C7 C8 C9 H7 H8 S7 S8 D7 D8 D9 CA HA", bid: 23, points: 0, tricks: 0, won: true, value: 23, written: 23 },
  { name: "Null lost = −46", decl: D("null"), cards: "C7 C8 C9 H7 H8 S7 S8 D7 D8 D9 CA HA", bid: 18, points: 4, tricks: 1, won: false, value: 23, written: -46 },
  { name: "Null Hand = 35", decl: D("null", { hand: true }), cards: "C7 C8 C9 H7 H8 S7 S8 D7 D8 D9 CA HA", bid: 35, points: 0, tricks: 0, won: true, value: 35, written: 35 },
  { name: "Null Hand lost = −70", decl: D("null", { hand: true }), cards: "C7 C8 C9 H7 H8 S7 S8 D7 D8 D9 CA HA", bid: 35, points: 3, tricks: 1, won: false, value: 35, written: -70 },
  { name: "Null ouvert = 46", decl: D("null", { ouvert: true }), cards: "C7 C8 C9 H7 H8 S7 S8 D7 D8 D9 CA HA", bid: 46, points: 0, tricks: 0, won: true, value: 46, written: 46 },
  { name: "Null ouvert lost = −92", decl: D("null", { ouvert: true }), cards: "C7 C8 C9 H7 H8 S7 S8 D7 D8 D9 CA HA", bid: 46, points: 0, tricks: 1, won: false, value: 46, written: -92 },
  { name: "Null ouvert Hand = 59", decl: D("null", { ouvert: true, hand: true }), cards: "C7 C8 C9 H7 H8 S7 S8 D7 D8 D9 CA HA", bid: 59, points: 0, tricks: 0, won: true, value: 59, written: 59 },
  { name: "Null ouvert Hand lost = −118", decl: D("null", { ouvert: true, hand: true }), cards: "C7 C8 C9 H7 H8 S7 S8 D7 D8 D9 CA HA", bid: 59, points: 0, tricks: 1, won: false, value: 59, written: -118 },
  // ── Overbid (ISkO 5.4) ──
  { name: "ISkO 5.4.1: bid 50, Kreuz-Bube in the skat, Herz mit 1 überreizt −100", decl: D("hearts"), cards: MIT1, bid: 50, points: 75, tricks: 7, won: false, value: 50, written: -100, overbid: true },
  { name: "ISkO 5.4.1: bid 59, Pik-Bube in the skat, Kreuz ohne 1 überreizt −120", decl: D("clubs"), cards: OHNE1, bid: 59, points: 70, tricks: 6, won: false, value: 60, written: -120, overbid: true },
  { name: "ISkO 5.4.1: bid 59, Herz ohne 1 überreizt −120", decl: D("hearts"), cards: OHNE1, bid: 59, points: 70, tricks: 6, won: false, value: 60, written: -120, overbid: true },
  { name: "ISkO 5.4.2: Herz Hand ohne 3 at 36, Kreuz-Bube in the skat: lost with 4 × 10 = −80", decl: D("hearts", { hand: true }), cards: "CJ HA HT HK SA ST S7 C7 C8 C9 D7 D8", bid: 36, points: 80, tricks: 7, won: false, value: 40, written: -80, overbid: true },
  { name: "Wissenswertes: overbid Kreuz Hand at 40 pays 48 → −96", decl: D("clubs", { hand: true }), cards: MIT1, bid: 40, points: 75, tricks: 6, won: false, value: 48, written: -96, overbid: true },
  { name: "Wissenswertes: bid 30, Pik ohne 2 finds Kreuz-Bube, Herz mit 1 −60", decl: D("hearts"), cards: MIT1, bid: 30, points: 50, tricks: 4, won: false, value: 30, written: -60, overbid: true },
  { name: "Wissenswertes: Herz Hand ohne 2 at 40, Kreuz-Bube in the skat, won Schneider = 40", decl: D("hearts", { hand: true }), cards: MIT1, bid: 40, points: 92, tricks: 8, won: true, value: 40, written: 40 },
  { name: "Overbid rescued by Schneider: Pik mit 1 at 30, Schneider = 33", decl: D("spades"), cards: MIT1, bid: 30, points: 95, tricks: 8, won: true, value: 33, written: 33 },
  { name: "Lost with own Schneider reaching the bid is not overbid: Pik mit 1 at 30 −66", decl: D("spades"), cards: MIT1, bid: 30, points: 28, tricks: 3, won: false, value: 33, written: -66, overbid: false },
  { name: "ISkO 3.4.3: Pik ohne 4 at 50, Kreuz-Bube in the skat, Pik mit 1 overbid −110", decl: D("spades"), cards: "CJ HA HT HK SA ST S7 C7 C8 C9 D7 D8", bid: 50, points: 70, tricks: 6, won: false, value: 55, written: -110, overbid: true },
  { name: "Grand Hand ohne 2 at 96, Kreuz-Bube in the skat: mit 1 Hand overbid −192", decl: D("grand", { hand: true }), cards: "CJ DJ CA CT CK HA HT HK SA ST DA DT", bid: 96, points: 80, tricks: 7, won: false, value: 96, written: -192, overbid: true },
  { name: "Lost and overbid at once: Karo mit 1 at 30, 40 Augen → 36 → −72", decl: D("diamonds"), cards: MIT1, bid: 30, points: 40, tricks: 3, won: false, value: 36, written: -72, overbid: true },
];

for (const ex of EXAMPLES) {
  test(`value: ${ex.name}`, () => {
    const st = settle({
      declaration: ex.decl,
      declarerCards: parseCards(ex.cards),
      bid: ex.bid,
      declarerPoints: ex.points,
      declarerTricks: ex.tricks,
      defenderTricks: ex.defTricks ?? 10 - ex.tricks,
    });
    assert.equal(st.won, ex.won, "won");
    assert.equal(st.value, ex.value, "value");
    assert.equal(st.written, ex.written, "written");
    if (ex.overbid !== undefined) assert.equal(st.overbid, ex.overbid, "overbid");
  });
}

test("at least 30 worked examples", () => {
  assert.ok(EXAMPLES.length >= 30);
});

test("declarationValue for the UI and estimates", () => {
  assert.equal(declarationValue(D("clubs"), 2), 36);
  assert.equal(declarationValue(D("clubs"), 2, { schneider: true }), 48);
  assert.equal(declarationValue(D("clubs"), 2, { schwarz: true }), 60);
  assert.equal(declarationValue(D("grand", { ouvert: true }), 4), 264);
  assert.equal(declarationValue(D("null", { hand: true, ouvert: true }), 0), 59);
});

test("declaration validity (ISkO 3.4.4)", () => {
  const ctxSkat = { skatTaken: true, bid: 18 };
  const ctxHand = { skatTaken: false, bid: 18 };
  assert.equal(declarationError(D("clubs"), ctxSkat), null);
  assert.notEqual(declarationError(D("clubs", { hand: true }), ctxSkat), null, "Hand after pick-up");
  assert.notEqual(declarationError({ ...D("clubs"), schneiderAnnounced: true }, ctxSkat), null, "announcement after pick-up");
  assert.notEqual(declarationError({ ...D("grand"), ouvert: true }, ctxSkat), null, "Grand ouvert after pick-up");
  assert.equal(declarationError(D("null", { ouvert: true }), ctxSkat), null, "Null ouvert with skat is fine");
  assert.notEqual(declarationError(D("clubs"), ctxHand), null, "not picking up means Hand");
  assert.equal(declarationError(D("clubs", { hand: true, schwarzAnnounced: true }), ctxHand), null);
  assert.notEqual(declarationError({ ...D("null", { hand: true }), schneiderAnnounced: true }, ctxHand), null);
  assert.notEqual(declarationError(D("null"), { skatTaken: true, bid: 24 }), null, "Null below the bid");
  assert.equal(declarationError(D("null", { ouvert: true }), { skatTaken: true, bid: 46 }), null);
  assert.notEqual(declarationError(D("null", { ouvert: true }), { skatTaken: true, bid: 48 }), null);
  assert.equal(declarationError(D("diamonds"), { skatTaken: true, bid: 264 }), null, "overbid suit games may be declared");
  // Normalisation: ouvert implies Hand and Schwarz/Schneider angesagt; Schwarz implies Schneider.
  assert.deepEqual(D("grand", { ouvert: true }), {
    kind: "grand", hand: true, schneiderAnnounced: true, schwarzAnnounced: true, ouvert: true,
  });
  assert.equal(D("hearts", { hand: true, schwarzAnnounced: true }).schneiderAnnounced, true);
});

test("Seeger-Fabian list: won +value+50, lost −2·value−50 and +40 per defender", () => {
  assert.deepEqual(seegerFabian(0, true, 72), [122, 0, 0]);
  assert.deepEqual(seegerFabian(1, false, -70), [40, -120, 40]);
  assert.deepEqual(seegerFabian(2, false, -192), [40, 40, -242]);
  // ISkO 5.4.1 overbid Herz mit 1 at 50: written −100, list −150.
  assert.deepEqual(seegerFabian(0, false, -100), [-150, 40, 40]);
});
