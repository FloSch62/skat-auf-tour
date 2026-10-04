import { test } from "node:test";
import assert from "node:assert/strict";
import type { GameRecord } from "../game/types.ts";
import {
  availableVehicles, checkDogUnlocks, newBook, normaliseBook, rank, recordGame, recordRound, recordTrophy,
  recordWanderpokal, speechTitle, stampPlace, trophyCount, unlockedDogs,
} from "./book.ts";

function game(o: Partial<GameRecord>): GameRecord {
  return {
    seed: 1, forehand: 0, declarer: 0, kind: "clubs", hand: false, ouvert: false, schneiderAnnounced: false,
    schwarzAnnounced: false, schneider: false, schwarz: false, matadors: 1, bid: 18, won: true, overbid: false,
    points: 70, value: 24, kontra: 0, list: [74, 0, 0], ...o,
  };
}

test("Skat statistics", () => {
  const b = newBook();
  recordGame(b, game({}));
  recordGame(b, game({ kind: "grand", hand: true, value: 144, schneider: true }));
  recordGame(b, game({ won: false, value: -48 }));
  recordGame(b, game({ declarer: 1, won: false }));
  recordGame(b, game({ declarer: 2, won: true }));
  recordGame(b, game({ declarer: null, kind: "passed" }));
  recordGame(b, game({ declarer: null, kind: "ramsch" }));
  const s = b.skat;
  assert.equal(s.games, 7);
  assert.equal(s.declared, 3);
  assert.equal(s.declaredWon, 2);
  assert.deepEqual(s.byKind, { clubs: 2, grand: 1, passed: 1, ramsch: 1 });
  assert.equal(s.highestValue, 144);
  assert.equal(s.grandHand, 1);
  assert.equal(s.schneider, 1);
  assert.equal(s.defenceWon, 1);
});

test("album and best list from a round", () => {
  const b = newBook();
  recordRound(b, ["maurer", "zocker"], { place: 2, list: [100, 150, -20], games: [game({}), game({})], marks: 0 }, "1983-06-12");
  recordRound(b, ["maurer", "rechnerin"], { place: 1, list: [300, 150, -20], games: [game({})], marks: 0 }, "1983-06-13");
  assert.deepEqual(b.album.maurer, { games: 3, won: 1, lost: 1, met: "1983-06-12" });
  assert.deepEqual(b.album.zocker, { games: 2, won: 1, lost: 0, met: "1983-06-12" });
  assert.equal(b.skat.bestList, 300);
});

test("stamps once per place", () => {
  const b = newBook();
  assert.equal(stampPlace(b, "rosswag", "1983-06-12"), true);
  assert.equal(stampPlace(b, "rosswag", "1984-01-01"), false);
  assert.equal(b.stamps.rosswag, "1983-06-12");
});

test("trophies, rank, speech title, sidecar rig", () => {
  const b = newBook();
  assert.equal(rank(b).name, "Lehrling");
  assert.equal(speechTitle(b), "Lehrling");
  recordTrophy(b, "enztal", "cozy");
  assert.equal(rank(b).name, "Geselle");
  assert.equal(speechTitle(b), "Meister");
  assert.deepEqual(availableVehicles(b), ["camper"]);
  recordWanderpokal(b, "cozy");
  assert.deepEqual(availableVehicles(b), ["camper", "sidecar-rig"]);
  for (let i = 0; i < 3; i++) recordTrophy(b, "stuttgart", "sharp");
  assert.equal(trophyCount(b), 5);
  assert.equal(rank(b).name, "Geselle");
  b.trophies["muehlacker-sporty"] = 3;
  assert.equal(trophyCount(b), 8);
  assert.equal(rank(b).name, "Meister");
  b.trophies["muehlacker-sporty"] = 20;
  assert.equal(rank(b).name, "Altmeister");
  assert.ok(rank(b).text.length > 0);
});

test("dog unlocks by counts", () => {
  const b = newBook();
  assert.deepEqual(unlockedDogs(b), ["shepherd"]);
  b.innWins = 10;
  b.puzzles.chess = 15;
  recordTrophy(b, "enztal", "sporty");
  assert.deepEqual(checkDogUnlocks(b).sort(), ["airedale", "schnauzer-a", "wolfhound-b"]);
  assert.deepEqual(checkDogUnlocks(b), [], "only once");
});

test("normalise fills a partial or old book", () => {
  const b = normaliseBook({ trophies: { "enztal-cozy": 1 }, dogs: ["airedale", "nonsense" as never] } as never);
  assert.deepEqual(b.dogs, ["shepherd", "airedale"]);
  assert.equal(b.skat.games, 0);
  assert.deepEqual(b.fun, { detours: 0, timesDriver: 0 });
  assert.deepEqual(b.events, []);
});
