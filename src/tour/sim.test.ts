import { test } from "node:test";
import assert from "node:assert/strict";
import { DIFFICULTIES } from "../game/ids.ts";
import { Rng } from "../core/rng.ts";
import { simulateTour, stubSkatModel } from "./sim.ts";
import { roundConfig } from "./perks.ts";
import { newTour } from "./state.ts";
import { FIXTURE_EVENTS } from "./fixtures.ts";
import { MEASURED, PLAYER_PROFILES } from "./skatstats.ts";
import { loadDefaultProfile, loadPack } from "./testkit.ts";

const pack = loadPack();
const profile = loadDefaultProfile();

test("whole tours run to an end on every difficulty, deterministically", () => {
  for (const difficulty of DIFFICULTIES) {
    for (let seed = 1; seed <= 60; seed++) {
      const r = simulateTour({ seed, difficulty, pack, profile, events: FIXTURE_EVENTS });
      assert.ok(r.ended, `${difficulty} ${seed} ended`);
      assert.ok(r.stations >= 5);
      assert.ok(r.fuelCurve.every((f) => f >= 0));
      if (r.ended === "won" || r.ended === "lost-final") assert.equal(r.stagesPlayed, 3);
      if (r.ended === "empty") assert.ok(r.emptyStage !== undefined);
    }
  }
  const a = simulateTour({ seed: 9, difficulty: "sporty", pack, profile, events: FIXTURE_EVENTS });
  const b = simulateTour({ seed: 9, difficulty: "sporty", pack, profile, events: FIXTURE_EVENTS });
  assert.deepEqual(a, b);
});

test("the stub reproduces the measured list points of every figure against two medium figures", () => {
  const perks = { showTrumps: false, showPoints: false, redeals: 0, skatPeeks: 0, takeBacks: 0, forehandFirst: false, listBonus: { grand: 0, null: 0, hand: 0, schneider: 0, defence: 0 } };
  const cfg = { seed: 1, opponents: ["wirtin", "wirtin"] as ["wirtin", "wirtin"], houseRule: "standard" as const, games: 3, tournament: false, title: "", room: "", marks: 99, perks, depth: 1 };
  let sq = 0;
  const ids = Object.keys(MEASURED) as (keyof typeof MEASURED)[];
  for (const id of ids) {
    const m = stubSkatModel({ player: MEASURED[id] });
    const rng = new Rng(11);
    let sum = 0;
    for (let i = 0; i < 3000; i++) sum += m.playRound(cfg, rng).list[0];
    sq += (sum / 9000 - MEASURED[id].list) ** 2;
  }
  assert.ok(Math.sqrt(sq / ids.length) < 1.5, `rmse ${Math.sqrt(sq / ids.length).toFixed(2)}`);
});

test("the stub Skat model: legal places, ties for the player, stronger player wins more", () => {
  const t = newTour({ seed: 3, difficulty: "sporty", vehicle: "camper", dogs: [], pack, profile });
  const cfg = roundConfig(t, t.map.nodes.find((n) => n.col === 1)!, { showPoints: false, showTrumpCount: false });
  const rate = (player: typeof PLAYER_PROFILES.good) => {
    const m = stubSkatModel({ player });
    const rng = new Rng(1);
    let wins = 0;
    for (let i = 0; i < 3000; i++) {
      const r = m.playRound(cfg, rng);
      assert.equal(r.games.length, cfg.games);
      const above = [r.list[1], r.list[2]].filter((x) => x > r.list[0]).length;
      assert.equal(r.place, 1 + above);
      if (r.place === 1) wins++;
    }
    return wins / 3000;
  };
  const weak = rate(PLAYER_PROFILES.casual);
  const strong = rate(PLAYER_PROFILES.tournament);
  assert.ok(strong > weak + 0.05, `${weak} vs ${strong}`);
});
