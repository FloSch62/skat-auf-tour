import { test } from "node:test";
import assert from "node:assert/strict";
import type { MapNode, RoundResult, TourState } from "../game/types.ts";
import type { DifficultyId, HouseRuleId, StakesId } from "../game/ids.ts";
import { ECONOMY, arrivePitch, finishPuzzle, finishRound, finishTournament, innFuelLoss, innPot, puzzleReward } from "./economy.ts";
import { newTour } from "./state.ts";
import { loseFuel } from "./ledger.ts";
import { testEnv } from "./testkit.ts";

function setup(o: { difficulty?: DifficultyId; houseRule?: HouseRuleId; stakes?: StakesId; kind?: MapNode["kind"]; stage?: number } = {}) {
  const env = testEnv();
  const t = newTour({ seed: 4242, difficulty: o.difficulty ?? "sporty", vehicle: "camper", dogs: [], pack: env.pack, profile: env.profile, book: env.book, today: env.today });
  const kind = o.kind ?? "inn";
  const node = t.map.nodes.find((n) => n.kind === kind) ?? t.map.nodes.find((n) => n.col === 1)!;
  node.kind = kind;
  if (kind === "inn") node.inn = { ...(node.inn ?? { name: "Gasthaus Krone", opponents: ["maurer", "zocker"], room: "village" }), houseRule: o.houseRule ?? "standard", stakes: o.stakes ?? "small" } as MapNode["inn"];
  t.at = node.id;
  t.stage = o.stage ?? 0;
  t.station = { node: node.id, done: ["arrived"] };
  return { t, env, node };
}

const res = (place: 1 | 2 | 3, list: [number, number, number], marks = 0): RoundResult => ({ place, list, games: [], marks });

test("pot: 5 Mark plus 1 per 50 points lead, at most 10, times stakes and the difficulty", () => {
  const t = { difficulty: "sporty", beerMats: [], vehicle: "camper" } as unknown as TourState;
  assert.equal(innPot(t, [100, 90, 0], "small", "standard", "inn"), 5);
  assert.equal(innPot(t, [190, 90, 0], "small", "standard", "inn"), 7);
  assert.equal(innPot(t, [900, 0, 0], "small", "standard", "inn"), 10);
  assert.equal(innPot(t, [190, 90, 0], "medium", "standard", "inn"), 11);
  assert.equal(innPot(t, [190, 90, 0], "high", "standard", "inn"), 14);
  assert.equal(innPot(t, [100, 90, 0], "small", "sharp", "inn"), 10);
  const cozy = { ...t, difficulty: "cozy" } as TourState;
  assert.equal(innPot(cozy, [100, 90, 0], "small", "standard", "inn"), 6);
  const mat = { ...t, beerMats: ["double-pot"] } as unknown as TourState;
  assert.equal(innPot(mat, [100, 90, 0], "small", "sharp", "inn"), 20);
  const rig = { ...t, vehicle: "sidecar-rig" } as TourState;
  assert.equal(innPot(rig, [100, 90, 0], "small", "sharp", "bikers"), 20);
  assert.equal(innPot(rig, [100, 90, 0], "small", "sharp", "inn"), 10);
});

test("fuel loss of the third place: stakes, sharp and double pot, capped", () => {
  const plain = { beerMats: [] } as unknown as TourState;
  assert.equal(innFuelLoss(plain, "small", "standard"), 1);
  assert.equal(innFuelLoss(plain, "medium", "standard"), 1);
  assert.equal(innFuelLoss(plain, "high", "standard"), 2);
  assert.equal(innFuelLoss(plain, "small", "sharp"), 2);
  const mat = { beerMats: ["double-pot"] } as unknown as TourState;
  assert.equal(innFuelLoss(mat, "high", "sharp"), ECONOMY.maxInnFuelLoss);
});

test("inn round: first gets the pot, second nothing (pennant 2), third drives home", () => {
  let { t, env } = setup();
  let out = finishRound(t, env, res(1, [212, 100, -50]), "inn");
  assert.equal(out.marks, 7);
  assert.equal(t.marks, 17);
  assert.match(out.lines[0], /: Erster mit 212 Punkten, Pott \+7 Mark$/);
  assert.equal(t.route.at(-1)!.points, 212);
  assert.equal(t.stats.innWins, 1);
  assert.equal(env.book!.innWins, 1);

  ({ t, env } = setup());
  out = finishRound(t, env, res(2, [10, 100, -50]), "inn");
  assert.equal(out.marks, 0);
  assert.match(out.lines[0], /Zweiter mit 10 Punkten, geht leer aus/);
  ({ t, env } = setup());
  t.souvenirs.push("pennant");
  out = finishRound(t, env, res(2, [10, 100, -50]), "inn");
  assert.equal(out.marks, 2);

  ({ t, env } = setup({ stakes: "high" }));
  out = finishRound(t, env, res(3, [-60, 100, 50]), "inn");
  assert.equal(out.fuel, -2);
  assert.ok(out.driver);
  assert.match(out.lines[0], /Dritter mit –60 Punkten, fährt die anderen heim, –2 Sprit/);
  assert.equal(t.stats.timesDriver, 1);
  assert.equal(env.book!.fun.timesDriver, 1);
});

test("the shepherd prevents one fuel loss per stage, twice with the dog whistle", () => {
  const { t, env } = setup();
  t.dogs = ["shepherd"];
  let out = finishRound(t, env, res(3, [-60, 100, 50]), "inn");
  assert.ok(out.shepherd);
  assert.equal(out.fuel, 0);
  t.station!.done = ["arrived"];
  out = finishRound(t, env, res(3, [-60, 100, 50]), "inn");
  assert.equal(out.fuel, -1);
  const w = setup();
  w.t.dogs = ["shepherd"];
  w.t.souvenirs.push("dog-whistle");
  finishRound(w.t, w.env, res(3, [-60, 100, 50]), "inn");
  w.t.station!.done = ["arrived"];
  assert.equal(finishRound(w.t, w.env, res(3, [-60, 100, 50]), "inn").fuel, 0);
});

test("kitty and piggy bank", () => {
  const { t, env } = setup({ houseRule: "kitty" });
  t.souvenirs.push("piggy-bank");
  const out = finishRound(t, env, res(1, [100, 90, 0], 3), "inn");
  assert.equal(out.marks, 3 + 5 + 1);
  assert.match(out.lines[0], /Skatkasse \+3 Mark, Pott \+5 Mark, Sparbüchse \+1 Mark/);
  const l = setup({ houseRule: "kitty" });
  assert.equal(finishRound(l.t, l.env, res(2, [0, 90, 10], -2), "inn").marks, -2);
});

test("bikers' round is sharp and leads into a bike talk", () => {
  const { t, env } = setup({ kind: "bikers" });
  const out = finishRound(t, env, res(1, [100, 90, 0]), "bikers");
  assert.equal(out.pot, 10);
  assert.equal(out.next?.kind, "event");
  assert.ok(env.events.find((e) => e.id === (out.next as { id: string }).id)!.pool === "bike");
  assert.match(out.lines[0], /^Motorradtreff in /);
});

test("Preisskat consequences by difficulty and the snack board", () => {
  const cases: [DifficultyId, 2 | 3, number][] = [["cozy", 2, 0], ["cozy", 3, -2], ["sporty", 2, -1], ["sporty", 3, -2], ["sharp", 2, -2], ["sharp", 3, -2]];
  for (const [d, place, delta] of cases) {
    const { t, env } = setup({ difficulty: d, kind: "tournament" });
    const out = finishTournament(t, env, res(place, place === 2 ? [100, 200, 0] : [-10, 200, 100]));
    assert.equal(out.fuel, delta, `${d} place ${place}`);
    assert.ok(out.stageDone);
  }
  const s = setup({ kind: "tournament" });
  s.t.souvenirs.push("snack-board");
  assert.equal(finishTournament(s.t, s.env, res(3, [-10, 200, 100])).fuel, -1);
  const w = setup({ kind: "tournament" });
  const out = finishTournament(w.t, w.env, res(1, [300, 200, 100]));
  assert.equal(out.marks, ECONOMY.tournamentWin);
  assert.equal(out.trophy, "enztal");
  assert.deepEqual(w.t.trophies, ["enztal"]);
  assert.equal(w.t.station!.offer!.length, 3);
});

test("puzzles: 4/3/2 Mark by attempt, chess clock +2, sudoku fuel", () => {
  assert.deepEqual([1, 2, 3, 4].map(puzzleReward), [4, 3, 2, 2]);
  const { t, env } = setup({ kind: "problem" });
  assert.equal(finishPuzzle(t, env, { kind: "problem", solved: true, attempts: 1 }).marks, 4);
  assert.equal(finishPuzzle(t, env, { kind: "problem", solved: false, attempts: 3 }).marks, 0);
  t.souvenirs.push("chess-clock");
  const c = finishPuzzle(t, env, { kind: "chess", solved: true, attempts: 2 });
  assert.equal(c.marks, 5);
  assert.match(c.lines[0], /^Schachbrett in .*: im zweiten Versuch gelöst, \+5 Mark \(Schachuhr\)$/);
  t.fuel = 2;
  const s9 = finishPuzzle(t, env, { kind: "sudoku", solved: true, size: 9 });
  assert.equal(s9.fuel, 2);
  assert.equal(s9.marks, 2);
  assert.equal(finishPuzzle(t, env, { kind: "sudoku", solved: true, size: 6 }).fuel, 1);
  assert.equal(env.book!.puzzles.chess, 1);
  assert.equal(env.book!.puzzles.sudoku9, 1);
  assert.equal(t.stats.puzzlesSolved, 4);
});

test("chess puzzles unlock Riesenschnauzer schnauzer-a at fifteen", () => {
  const { t, env } = setup({ kind: "chess" });
  let unlocked: string[] = [];
  for (let i = 0; i < 15; i++) unlocked = unlocked.concat(finishPuzzle(t, env, { kind: "chess", solved: true, attempts: 1 }).unlocked);
  assert.deepEqual(unlocked, ["schnauzer-a"]);
});

test("pitch: +2, thermos +1, capped at the tank; awning offers a free problem", () => {
  const { t, env } = setup({ kind: "pitch" });
  t.fuel = 1;
  assert.equal(arrivePitch(t, env).fuel, 2);
  t.fuel = 1;
  t.souvenirs.push("thermos");
  t.upgrades.push("awning");
  assert.equal(arrivePitch(t, env).fuel, 3);
  assert.equal(t.station!.puzzle, "problem");
  t.fuel = t.fuelMax - 1;
  assert.equal(arrivePitch(t, env).fuel, 1);
});

test("fridge: one stroke back once per stage", () => {
  const { t, env } = setup();
  t.upgrades.push("fridge");
  assert.equal(loseFuel(t, 2, env, "inn").lost, 1);
  assert.equal(loseFuel(t, 1, env, "inn").lost, 1);
});
