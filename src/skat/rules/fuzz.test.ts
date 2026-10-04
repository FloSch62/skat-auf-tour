// Fast version of the invariant fuzzer (the million-game run is tools/balance/random-games.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { runRandomGames } from "./fuzz.ts";

test("20 000 random legal games keep every invariant", () => {
  const r = runRandomGames({ games: 20000, seed: 20261004 });
  assert.deepEqual(r.errors, []);
  assert.equal(r.games, 20000);
  // The random agent reaches every corner of the rules.
  assert.ok(r.passed > 0 && r.ramsch > 0 && r.schieberamsch > 0, "all-pass paths");
  assert.ok(r.overbid > 0 && r.ouvert > 0 && r.schwarzAnnounced > 0 && r.nullEarly > 0, "rare declarations");
  assert.ok(r.kontra > 0 && r.re > 0 && r.takeBacks > 0 && r.peeks > 0, "house rules and perks");
  for (const k of ["diamonds", "hearts", "spades", "clubs", "grand", "null"]) assert.ok((r.byKind[k] ?? 0) > 0, k);
});
