// Schwätzer-Sigi's tells must be true for his hand (contract §0.3), and the club-speak value lines must add up.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Rng } from "../../core/rng.ts";
import { SIGI_TELLS, TELL_HINTS } from "../../content/speech.ts";
import { JACKS, SUIT_MASKS, deal, has, jackOf, parseCards, popcount, suitName } from "../rules/index.ts";
import { duoExchange, hintTrue, line, longSuit, sigiTell, voidSuits } from "./talk.ts";
import { mergeHead, numberWord, shortName, signed } from "./text.ts";

test("tell hints describe the hand truthfully", () => {
  const h = parseCards("CJ SJ HA DA H7 H8 H9 HK S7 C9");
  assert.ok(hintTrue("jacks-2", h));
  assert.ok(!hintTrue("jacks-1", h));
  assert.ok(hintTrue("aces-2", h));
  assert.ok(hintTrue("strong", h)); // two jacks and two aces
  assert.ok(!hintTrue("trash", h));
  assert.ok(hintTrue("ten-bare", parseCards("ST CJ HA H7 H8 D7 D8 D9 C7 C8")));
  assert.ok(!hintTrue("ten-bare", parseCards("ST S7 HA H7 H8 D7 D8 D9 C7 C8")));
  assert.equal(longSuit(h), 1); // Herz: A K 9 8 7
  assert.deepEqual(voidSuits(parseCards("CJ CA CT CK C9 C8 HA HT H9 H8")), [0, 2]);
});

test("every tell Sigi says is true for random hands", () => {
  const hints = Object.entries(TELL_HINTS);
  for (let seed = 1; seed <= 400; seed++) {
    const hand = deal(seed, 0).hands[1];
    const line = sigiTell(hand, "french", new Rng(seed));
    if (!line) continue;
    // which template did he use?
    const long = SIGI_TELLS.long.some((t) => {
      const s = longSuit(hand);
      return s >= 0 && line === t.replace("{suit}", suitName(s));
    });
    const voided = SIGI_TELLS.void.some((t) => [0, 1, 2, 3].some((s) => line === t.replace("{suit}", suitName(s)) && (hand & SUIT_MASKS[s]) === 0 && !has(hand, jackOf(s))));
    const hinted = SIGI_TELLS.hint.some((t) => hints.some(([id, h]) => line === t.replace("{hint}", h.text) && hintTrue(id as keyof typeof TELL_HINTS, hand)));
    assert.ok(long || voided || hinted, `seed ${seed}: "${line}" is not true for ${popcount(hand & JACKS)} jacks`);
  }
});

test("small text helpers", () => {
  assert.equal(numberWord(3), "drei");
  assert.equal(numberWord(25), "25");
  assert.equal(signed(-96), "-96");
  assert.equal(signed(48), "+48");
  assert.equal(shortName("der Erwin"), "Erwin");
  assert.equal(shortName("’s Schlitzohr Fritz"), "Fritz");
  assert.equal(shortName("Maurer-Karle"), "Maurer-Karle");
});

test("the action word is not repeated when the line starts with it", () => {
  assert.equal(mergeHead("{inkred}Passe.{/}", "Passe. Des Blatt hat koi Fundament."), "{inkred}Passe.{/} Des Blatt hat koi Fundament.");
  assert.equal(mergeHead("{inkred}Passe.{/}", "passe, heut net!"), "{inkred}passe,{/} heut net!");
  assert.equal(mergeHead("{inkred}Kontra!{/}", "Kontra! Und zwar resolut."), "{inkred}Kontra!{/} Und zwar resolut.");
  assert.equal(mergeHead("{inkred}Ich spiel.{/}", "Ich spiel. Basta."), "{inkred}Ich spiel.{/} Basta.");
  assert.equal(mergeHead("{inkred}Ja.{/}", "Jawohl, gern."), "{inkred}Ja.{/} Jawohl, gern.");
  assert.equal(mergeHead("{inkred}20.{/}", "Hm. Des trägt no."), "{inkred}20.{/} Hm. Des trägt no.");
  assert.equal(mergeHead("{inkblue}Grand Hand!{/}", "Grand Hand, jawoll!"), "{inkblue}Grand Hand,{/} jawoll!");
});

test("banter lines: {target} filled or dropped, duo lines need the partner, no false 'überreizt'", () => {
  for (let seed = 0; seed < 60; seed++) {
    const rng = new Rng(seed);
    const alone = line("schultes", "blunder", rng, { name: "Gottlob", title: "Lehrling", present: ["schultes", "maurer"] });
    if (alone) assert.ok(!alone.includes("Gottfried") && !alone.includes("{"), alone);
    const aimed = line("wengerter", "blunder", rng, { name: "Gottlob", title: "Lehrling", target: "Gottlob" });
    if (aimed) assert.ok(!aimed.includes("{target}"), aimed);
    const plain = line("wengerter", "tease", rng, { name: "Gottlob", title: "Lehrling" });
    if (plain) assert.ok(!plain.includes("{"), plain);
    const honest = line("schultes", "selfBlame", rng, { name: "Gottlob", title: "Lehrling", present: ["schultes", "amtsbote"], avoid: /überreiz/i });
    if (honest) assert.ok(!/überreiz/i.test(honest), honest);
    const pair = duoExchange("selfBlame", rng, { name: "Gottlob", title: "Lehrling", avoid: /überreiz/i });
    if (pair) assert.ok(!/überreiz/i.test(pair.join(" ")));
  }
  assert.ok(duoExchange("blunder", new Rng(1), { name: "Gottlob", title: "Lehrling" }));
});
