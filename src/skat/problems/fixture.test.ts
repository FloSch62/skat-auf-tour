// The fixture problems are hand-made: the exact solver checks that every endgame has exactly one winning card and
// that the other problem types are well-formed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BID_VALUES, cardCode, isJack, maskOf, popcount } from "../rules/index.ts";
import { FIXTURE_PROBLEMS } from "./fixture.ts";
import { checkEndgame, winningCards } from "./solve.ts";
import { pickProblem } from "./pick.ts";

test("fixture endgames have exactly one winning card, the solution", () => {
  for (const p of FIXTURE_PROBLEMS) {
    if (p.type !== "endgame") continue;
    assert.equal(checkEndgame(p), null, p.id);
    const win = winningCards(p);
    assert.deepEqual(win.map(cardCode), [cardCode(p.solution)], p.id);
  }
});

test("fixture discard and bid problems are well-formed", () => {
  for (const p of FIXTURE_PROBLEMS) {
    if (p.type === "discard") {
      assert.equal(p.cards.length, 12, p.id);
      assert.equal(popcount(maskOf(p.cards)), 12, p.id);
      assert.ok(p.cards.includes(p.solution[0]) && p.cards.includes(p.solution[1]), p.id);
      assert.ok(p.solution[0] < p.solution[1], `${p.id}: solution sorted`);
    }
    if (p.type === "bid") {
      assert.equal(p.cards.length, 10, p.id);
      assert.ok(BID_VALUES.includes(p.range[0]) && BID_VALUES.includes(p.range[1]), p.id);
      assert.ok(p.range[0] <= p.range[1], p.id);
    }
  }
});

test("every problem type is in the fixture and picking is deterministic", () => {
  const types = new Set(FIXTURE_PROBLEMS.map((p) => p.type));
  assert.deepEqual([...types].sort(), ["bid", "discard", "endgame"]);
  assert.equal(pickProblem(FIXTURE_PROBLEMS, 5).id, pickProblem(FIXTURE_PROBLEMS, 5).id);
  const ids = new Set<string>();
  for (let s = 0; s < 60; s++) ids.add(pickProblem(FIXTURE_PROBLEMS, s).id);
  assert.ok(ids.size >= 5, "seeds spread over the problems");
  // jacks never appear in a discard solution of a suit game here (sanity of the hand-made data)
  for (const p of FIXTURE_PROBLEMS) if (p.type === "discard") assert.ok(!p.solution.some(isJack), p.id);
});
