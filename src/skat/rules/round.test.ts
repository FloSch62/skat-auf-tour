import { test } from "node:test";
import assert from "node:assert/strict";
import type { RoundConfig } from "../../game/types.ts";
import type { HouseRuleId } from "../../game/ids.ts";
import { settleRamsch } from "./ramsch.ts";
import { bonusFor, houseRuleEffects, ruleOptionsFor } from "./list.ts";
import {
  bonusForSeat, dealSeed, dealerOf, finishGame, forehandOfGame, isRoundOver, placeOf, redealsLeft, roundResult,
  startGame, startRound, useRedeal,
} from "./round.ts";
import { applyAction, currentSeat, legalActions } from "./game.ts";
import type { GameState } from "./game.ts";
import { Rng } from "../../core/rng.ts";

test("Ramsch: most points lose, ties both lose, Jungfrau doubles, Durchmarsch +120", () => {
  let r = settleRamsch({ points: [50, 40, 30], tricks: [4, 3, 3], shoves: 0, bock: false });
  assert.deepEqual(r.losers, [0]);
  assert.deepEqual(r.list, [-50, 0, 0]);
  r = settleRamsch({ points: [55, 55, 10], tricks: [4, 4, 2], shoves: 0, bock: false });
  assert.deepEqual(r.losers, [0, 1]);
  assert.deepEqual(r.list, [-55, -55, 0]);
  r = settleRamsch({ points: [40, 40, 40], tricks: [4, 3, 3], shoves: 0, bock: false });
  assert.deepEqual(r.losers, []);
  assert.deepEqual(r.list, [0, 0, 0]);
  r = settleRamsch({ points: [70, 50, 0], tricks: [6, 4, 0], shoves: 0, bock: false });
  assert.deepEqual(r.jungfrau, [2]);
  assert.deepEqual(r.list, [-140, 0, 0], "Jungfrau doubles");
  r = settleRamsch({ points: [70, 50, 0], tricks: [6, 4, 0], shoves: 2, bock: true });
  assert.equal(r.factor, 2 * 4 * 2);
  assert.deepEqual(r.list, [-70 * 16, 0, 0]);
  r = settleRamsch({ points: [0, 120, 0], tricks: [0, 10, 0], shoves: 1, bock: false });
  assert.equal(r.durchmarsch, 1);
  assert.deepEqual(r.list, [0, 240, 0], "Durchmarsch +120, a shove doubles it");
});

test("house rule effects", () => {
  assert.deepEqual(ruleOptionsFor("standard"), { allPass: "passed", kontra: false, bock: false });
  assert.equal(ruleOptionsFor("ramsch").allPass, "ramsch");
  assert.equal(ruleOptionsFor("schieberamsch").allPass, "schieberamsch");
  assert.equal(ruleOptionsFor("kontra").kontra, true);
  assert.equal(ruleOptionsFor("bock").bock, true);
  assert.equal(houseRuleEffects("grand-evening").listBonus.grand, 20);
  assert.equal(houseRuleEffects("null-evening").listBonus.null, 15);
  assert.equal(houseRuleEffects("hand-evening").listBonus.hand, 15);
  assert.equal(houseRuleEffects("sharp").potFactor, 2);
  assert.equal(houseRuleEffects("sharp").fuelLossFactor, 2);
  assert.equal(houseRuleEffects("long-round").games, 6);
  assert.equal(houseRuleEffects("kitty").kittyStake, 1);
});

test("list bonuses: won Grand/Null/Hand/Schneider for the declarer, won defence for defenders", () => {
  const bonus = { grand: 20, null: 15, hand: 15, schneider: 15, defence: 10 };
  assert.equal(bonusFor({ declarer: 0, kind: "grand", hand: true, won: true, schneider: true }, 0, bonus), 50);
  assert.equal(bonusFor({ declarer: 0, kind: "null", hand: true, won: true, schneider: false }, 0, bonus), 30);
  assert.equal(bonusFor({ declarer: 0, kind: "grand", hand: false, won: false, schneider: false }, 0, bonus), 0);
  assert.equal(bonusFor({ declarer: 1, kind: "grand", hand: false, won: false, schneider: false }, 0, bonus), 10);
  assert.equal(bonusFor({ declarer: 1, kind: "grand", hand: false, won: true, schneider: false }, 0, bonus), 0);
});

function config(houseRule: HouseRuleId = "standard", extra: Partial<RoundConfig> = {}): RoundConfig {
  return {
    seed: 4711,
    opponents: ["maurer", "zocker"],
    houseRule,
    games: 3,
    tournament: false,
    title: "Krone",
    room: "village",
    marks: 5,
    perks: {
      showTrumps: false,
      showPoints: false,
      redeals: 1,
      skatPeeks: 1,
      takeBacks: 1,
      forehandFirst: false,
      listBonus: { grand: 20, null: 0, hand: 0, schneider: 0, defence: 10 },
    },
    depth: 1,
    ...extra,
  };
}

/** Plays a game with a scripted bidding: `declarer` takes it and plays Grand Hand; everybody else passes. */
function playGame(s: GameState, rng: Rng, mode: "pass" | "grand", declarer = 0): GameState {
  while (s.phase !== "done") {
    const seat = currentSeat(s)!;
    const acts = legalActions(s).filter((a) => a.type !== "peek" && a.type !== "takeBack" && a.type !== "kontra");
    let a = acts[0];
    if (s.phase === "bidding") {
      if (mode === "grand" && seat === declarer) a = acts.find((x) => x.type === "bid" || x.type === "hold")!;
      else a = acts.find((x) => x.type === "pass")!;
    } else if (s.phase === "skat") {
      a = acts.find((x) => x.type === "declare" && x.declaration.kind === "grand" && !x.declaration.schneiderAnnounced)!;
    } else {
      a = rng.pick(acts);
    }
    s = applyAction(s, a);
  }
  return s;
}

test("round: dealer rotation, forehand perk, deterministic seeds, redeal", () => {
  let p = startRound(config());
  const dealers = [0, 1, 2].map((i) => dealerOf(p, i));
  assert.deepEqual(new Set(dealers).size, 3, "everybody deals once in three games");
  assert.equal(dealerOf(p, 1), (dealerOf(p, 0) + 1) % 3);
  const q = startRound(config("standard", { perks: { ...config().perks, forehandFirst: true } }));
  assert.equal(forehandOfGame(q, 0), 0, "forehand perk: the player leads the first game");
  assert.equal(dealSeed(p, 0), dealSeed(startRound(config()), 0), "same round seed, same deals");
  const g0 = startGame(p);
  assert.equal(g0.seed, dealSeed(p));
  assert.equal(g0.peeksLeft[0], 1);
  assert.equal(g0.takeBacksLeft[0], 1);
  assert.equal(redealsLeft(p), 1);
  const p2 = useRedeal(p);
  assert.equal(redealsLeft(p2), 0);
  assert.notEqual(dealSeed(p2), dealSeed(p), "a redeal gives a new deal");
  assert.equal(startGame(JSON.parse(JSON.stringify(p2))).seed, dealSeed(p2), "resumable from JSON");
  assert.throws(() => useRedeal(p2));
});

test("round: Liste, records, bonuses, place with ties for the player", () => {
  const rng = new Rng(1);
  let p = startRound(config("grand-evening"));
  const records = [];
  while (!isRoundOver(p)) {
    const s = playGame(startGame(p), rng, "grand", (p.games.length % 3) as 0 | 1 | 2);
    const { progress, record } = finishGame(p, s);
    records.push(record);
    // Every list entry equals the Seeger-Fabian entry plus the seat's bonus.
    const r = s.result!;
    for (const seat of [0, 1, 2] as const) {
      const facts = { declarer: r.declarer!, kind: r.declaration!.kind, hand: r.declaration!.hand, won: r.won, schneider: r.won && r.schneider };
      assert.equal(record.list[seat], r.list[seat] + bonusFor(facts, seat, bonusForSeat(p.config, seat)));
    }
    assert.equal(record.kind, "grand");
    assert.equal(record.hand, true);
    assert.equal(typeof record.withTops, "boolean");
    p = progress;
  }
  assert.equal(p.games.length, 3);
  for (const seat of [0, 1, 2] as const) assert.equal(p.list[seat], records.reduce((a, r) => a + r.list[seat], 0));
  assert.equal(bonusForSeat(p.config, 1).grand, 20, "opponents get the evening bonus from the house rule");
  assert.equal(bonusForSeat(p.config, 0).defence, 10, "the player gets his perks (incl. the evening, merged by the tour)");
  const res = roundResult(p);
  assert.equal(res.place, placeOf(p.list));
  assert.equal(placeOf([100, 100, 50]), 1);
  assert.equal(placeOf([100, 120, 100]), 2);
  assert.equal(placeOf([0, 10, 20]), 3);
  assert.equal(res.marks, 0);
});

test("round: passed games count as games; Skatkasse", () => {
  const rng = new Rng(2);
  let p = startRound(config("kitty", { marks: 1 }));
  const s = playGame(startGame(p), rng, "pass");
  assert.equal(s.result!.type, "passed");
  ({ progress: p } = finishGame(p, s));
  assert.equal(p.games[0].kind, "passed");
  assert.equal(p.games[0].declarer, null);
  // Force losses by the player: a hopeless Grand Hand is likely lost; check the Kasse bookkeeping game by game.
  while (!isRoundOver(p)) {
    const g = playGame(startGame(p), rng, "grand", 0);
    const before = p;
    ({ progress: p } = finishGame(p, g));
    const lost = !g.result!.won;
    const canPay = before.config.marks - before.kittyPaid >= 1;
    assert.equal(p.kittyPaid - before.kittyPaid, lost && canPay ? 1 : 0);
    assert.equal(p.kitty - before.kitty, lost && canPay ? 1 : 0);
  }
  assert.ok(p.kittyPaid <= 1, "the player never pays more than he has");
  const res = roundResult(p);
  assert.equal(res.marks, (res.place === 1 ? p.kitty : 0) - p.kittyPaid);
  // Opponents always pay.
  let o = startRound(config("kitty", { marks: 0 }));
  const g = playGame(startGame(o), new Rng(5), "grand", 1);
  ({ progress: o } = finishGame(o, g));
  assert.equal(o.kitty, g.result!.won ? 0 : 1);
  assert.equal(o.kittyPaid, 0);
});
