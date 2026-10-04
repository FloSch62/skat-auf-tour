import { test } from "node:test";
import assert from "node:assert/strict";
import type { TourState } from "../game/types.ts";
import { listBonus, puzzleConfig, roundConfig, roundGames, tablePerks } from "./perks.ts";
import { newTour } from "./state.ts";
import { testEnv } from "./testkit.ts";
import { DIFFICULTY_DEFS } from "../data/difficulty.ts";

const off = { showTrumpCount: false, showPoints: false };

test("list bonus: house-rule evenings and beer mats add up; nothing at the Preisskat", () => {
  const t = { beerMats: ["grand-bonus", "defence-bonus", "schneider-bonus"] } as unknown as TourState;
  assert.deepEqual(listBonus(t, "grand-evening"), { grand: 40, null: 0, hand: 0, schneider: 15, defence: 10 });
  assert.deepEqual(listBonus(t, "hand-evening"), { grand: 20, null: 0, hand: 15, schneider: 15, defence: 10 });
  assert.deepEqual(listBonus({ beerMats: ["null-bonus"] } as unknown as TourState, "null-evening"), { grand: 0, null: 30, hand: 0, schneider: 0, defence: 0 });
  assert.deepEqual(listBonus(t, "grand-evening", true), { grand: 0, null: 0, hand: 0, schneider: 0, defence: 0 });
});

test("table perks from souvenirs, dogs, beer mats and settings", () => {
  const t = { souvenirs: [], dogs: [], beerMats: [] } as unknown as TourState;
  assert.deepEqual(tablePerks(t, off), {
    showTrumps: false, showPoints: false, redeals: 0, skatPeeks: 0, takeBacks: 0, forehandFirst: false,
    listBonus: { grand: 0, null: 0, hand: 0, schneider: 0, defence: 0 },
  });
  assert.equal(tablePerks(t, { showTrumpCount: true, showPoints: true }).showPoints, true);
  const rich = { souvenirs: ["reading-glasses", "notepad", "lucky-penny", "dog-whistle"], dogs: ["schnauzer-a", "wolfhound-b"], beerMats: ["redeal", "forehand"] } as unknown as TourState;
  const p = tablePerks(rich, off);
  assert.equal(p.showTrumps && p.showPoints, true);
  assert.equal(p.redeals, 2);
  assert.equal(p.skatPeeks, 2, "dog whistle doubles");
  assert.equal(p.takeBacks, 2);
  assert.equal(p.forehandFirst, true);
  const tp = tablePerks(rich, off, { tournament: true });
  assert.equal(tp.redeals, 0, "Turnier ist Turnier");
  assert.equal(tp.forehandFirst, false);
  assert.equal(tp.skatPeeks, 2, "the dogs come along");
});

test("games per round", () => {
  const t = { beerMats: [], stage: 0 } as unknown as TourState;
  assert.equal(roundGames(t, "inn", "standard"), 3);
  assert.equal(roundGames(t, "inn", "long-round"), 6);
  assert.equal(roundGames({ ...t, beerMats: ["extra-game"] } as unknown as TourState, "inn", "long-round"), 7);
  assert.equal(roundGames(t, "tournament", "standard"), 6);
  assert.equal(roundGames({ ...t, stage: 2, beerMats: ["extra-game"] } as unknown as TourState, "tournament", "standard"), 9);
});

test("round configs for inn, Preisskat; seeds stable; depth from the difficulty", () => {
  const env = testEnv();
  const t = newTour({ seed: 77, difficulty: "sharp", vehicle: "camper", dogs: [], pack: env.pack, profile: env.profile });
  const inn = t.map.nodes.find((n) => n.col === 1)!;
  const a = roundConfig(t, inn, off, env);
  assert.deepEqual(roundConfig(t, inn, off, env), a);
  assert.equal(a.depth, DIFFICULTY_DEFS.sharp.depth);
  assert.equal(a.marks, 10);
  assert.equal(a.tournament, false);
  const fin = t.map.nodes.find((n) => n.kind === "tournament")!;
  const p = roundConfig(t, fin, off, env);
  assert.deepEqual(p.opponents, ["wengerter", "muellerin"]);
  assert.equal(p.title, "Preisskat in Vaihingen an der Enz");
  assert.equal(p.houseRule, "standard");
  assert.equal(p.tournament, true);
  assert.notEqual(p.seed, a.seed);
});

test("puzzle config: attempts, magnifier hints, prefilled sudoku cells", () => {
  assert.deepEqual(puzzleConfig({ souvenirs: [], dogs: [] } as unknown as TourState), { attempts: 3, hints: 0, presolved: 0, freeCells: 0 });
  assert.deepEqual(puzzleConfig({ souvenirs: ["magnifier", "pencil"], dogs: ["airedale"] } as unknown as TourState), { attempts: 4, hints: 1, presolved: 2, freeCells: 1 });
  assert.deepEqual(puzzleConfig({ souvenirs: ["dog-whistle"], dogs: ["airedale"] } as unknown as TourState), { attempts: 5, hints: 0, presolved: 0, freeCells: 2 });
});
