// Banter detection (banter.ts) on hand-made, legal situations (banterCases.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction } from "../rules/index.ts";
import type { GameResult, GameState } from "../rules/index.ts";
import { gameBanter, trickBanter } from "./banter.ts";
import { BANTER_CASES, banterCase } from "./banterCases.ts";

function runCase(id: Parameters<typeof banterCase>[0]) {
  const c = banterCase(id);
  let s: GameState = c.state;
  let before = s;
  for (const a of c.script) {
    before = s;
    s = applyAction(s, a);
  }
  return trickBanter(before, s);
}

test("every case provokes its banter first (one scolding per trick)", () => {
  const want = {
    overtake: { situation: "blunder", speaker: 1, target: 2 },
    smear: { situation: "blunder", speaker: 1, target: 2 },
    letThrough: { situation: "blunder", speaker: 2, target: 0 },
    robbed: { situation: "robbed", speaker: 2, target: 0 },
    aceTrumped: { situation: "selfBlame", speaker: 1, target: null },
    lost60: { situation: "tease", speaker: 1, target: 0 },
  } as const;
  for (const id of BANTER_CASES) {
    const b = runCase(id);
    assert.ok(b.length > 0, `${id}: no banter`);
    const { situation, speaker, target } = b[0];
    assert.deepEqual({ situation, speaker, target }, want[id], id);
    assert.ok(b.every((x) => x.speaker !== 0), `${id}: the player never speaks`);
  }
});

test("no banter when the partner was forced over, or the trick went fine", () => {
  // the same overtake trick, but Rechts holds only trumps: he had to take it, nobody scolds him
  const c = banterCase("overtake");
  const forced: GameState = { ...c.state, hands: [c.state.hands[0], c.state.hands[1], c.state.hands[2] & (0xf << 28)] };
  let s = applyAction(forced, c.script[0]);
  const before = s;
  s = applyAction(s, c.script[1]);
  assert.ok(!trickBanter(before, s).some((b) => b.reason === "overtake"));
  // a plain first trick of the player's Grand: his own Herz 7 led, partner wins, the other follows: nothing to say
  const r = runCase("smear").filter((b) => b.reason !== "smearNothing");
  assert.deepEqual(r, []);
});

test("game end: a lost or overbid declarer blames himself, the others tease", () => {
  const lost = { type: "declared", declarer: 1, won: false, overbid: true } as unknown as GameResult;
  const b = gameBanter(lost);
  assert.deepEqual(b.map((x) => [x.situation, x.speaker, x.target, x.reason]), [
    ["selfBlame", 1, null, "overbid"],
    ["tease", 2, 1, "overbid"],
  ]);
  const playerLost = { type: "declared", declarer: 0, won: false, overbid: false } as unknown as GameResult;
  assert.deepEqual(gameBanter(playerLost).map((x) => [x.situation, x.speaker, x.target]), [["tease", 1, 0], ["tease", 2, 0]]);
  assert.deepEqual(gameBanter({ type: "declared", declarer: 2, won: true } as unknown as GameResult), []);
});
