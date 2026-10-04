import { test } from "node:test";
import assert from "node:assert/strict";
import type { RoundResult } from "../game/types.ts";
import {
  canMove, detourTargets, enterStage, mapView, moveTo, newTour, newTutorial, pendingRoundConfig, regionChoices,
  roadTargets, stationOpen, tankSize, tourPhase, completeTutorial,
} from "./state.ts";
import { chooseBeerMat, finishStation } from "./economy.ts";
import { column } from "./map.ts";
import { currentNode, nodeById } from "./util.ts";
import { testEnv } from "./testkit.ts";

const settings = { showTrumpCount: false, showPoints: false };

export function round(place: 1 | 2 | 3, list: [number, number, number] = place === 1 ? [120, 30, -40] : place === 2 ? [60, 90, -20] : [-60, 70, 40]): RoundResult {
  return { list, place, games: [], marks: 0 };
}

function tour(over: Partial<Parameters<typeof newTour>[0]> = {}) {
  const env = testEnv();
  const t = newTour({ seed: 1234, difficulty: "sporty", vehicle: "camper", dogs: ["shepherd"], pack: env.pack, profile: env.profile, book: env.book, events: env.events, today: env.today, ...over });
  return { t, env };
}

test("a new tour: home region, home start, fuel by difficulty and vehicle, 10 Mark, book counted", () => {
  const { t, env } = tour();
  assert.equal(t.version, 1);
  assert.equal(t.regions[0], "enztal");
  assert.equal(currentNode(t).place, "enzweihingen");
  assert.equal(t.fuel, 5);
  assert.equal(t.fuelMax, 5);
  assert.equal(t.marks, 10);
  assert.deepEqual(t.dogs, ["shepherd"]);
  assert.equal(env.book!.tours.started, 1);
  assert.ok(env.book!.stamps.enzweihingen);
  assert.equal(tankSize("cozy", "camper"), 6);
  assert.equal(tankSize("sharp", "camper"), 4);
  assert.equal(tankSize("sporty", "sidecar-rig"), 4);
  assert.equal(tourPhase(t), "map");
});

test("locked dogs and vehicles are refused", () => {
  const { t } = tour({ dogs: ["shepherd", "airedale", "wolfhound-a"], vehicle: "sidecar-rig" });
  assert.deepEqual(t.dogs, ["shepherd"]);
  assert.equal(t.vehicle, "camper");
});

test("moving by road, playing the inn, and the station must be finished first", () => {
  const { t, env } = tour();
  const road = roadTargets(t);
  assert.ok(road.length >= 2);
  assert.ok(road.every((n) => n.col === 1 && n.kind === "inn"));
  const a = moveTo(t, env, road[0].id);
  assert.ok(a.ok);
  assert.equal(tourPhase(t), "station");
  assert.ok(stationOpen(t));
  assert.equal(roadTargets(t).length, 0);
  const next = currentNode(t).next[0];
  assert.equal(canMove(t, next).ok, false);
  const cfg = pendingRoundConfig(t, settings, env)!;
  assert.equal(cfg.houseRule, "standard");
  assert.equal(cfg.games, 3);
  assert.equal(cfg.title, currentNode(t).inn!.name);
  finishStation(t, env, { kind: "inn", round: round(1) });
  assert.equal(tourPhase(t), "map");
  assert.ok(t.marks > 10);
  assert.ok(canMove(t, next).ok);
});

test("a detour costs a stroke, never empties the tank, and the sidecar makes the first free", () => {
  const { t, env } = tour({ seed: 77 });
  moveTo(t, env, roadTargets(t)[0].id);
  finishStation(t, env, { kind: "inn", round: round(2) });
  const here = currentNode(t);
  const off = detourTargets(t);
  if (!off.length) return; // this seed has full roads from here
  assert.ok(off.every((n) => n.col === here.col + 1 && !here.next.includes(n.id)));
  const fuel = t.fuel;
  const m = canMove(t, off[0].id);
  assert.ok(m.ok && m.detour && m.cost === 1);
  moveTo(t, env, off[0].id);
  assert.equal(t.fuel, fuel - 1);
  assert.equal(t.stats.detours, 1);
  assert.equal(env.book!.fun.detours, 1);
  // With one stroke left no detour is offered.
  t.fuel = 1;
  t.station = { node: t.at, done: ["arrived", "round"] };
  t.station.event = undefined;
  assert.equal(detourTargets(t).length, 0);
  // The sidecar: the first detour per stage is free, so even one stroke allows it.
  t.upgrades.push("sidecar");
  const here2 = currentNode(t);
  const offRoad = column(t.map, here2.col + 1).filter((n) => !here2.next.includes(n.id));
  assert.equal(detourTargets(t).length, offRoad.length);
  if (offRoad.length) assert.equal(canMove(t, offRoad[0].id).free, "sidecar");
  const rigTour = tour({ seed: 77, vehicle: "camper" }).t;
  rigTour.vehicle = "sidecar-rig";
  assert.equal(canMove(rigTour, column(rigTour.map, 1)[0].id).cost, 0);
});

test("visibility: inn details only for directly reachable inns (road atlas: one column further)", () => {
  const { t, env } = tour({ seed: 99 });
  let view = mapView(t);
  for (const v of view) {
    if (v.node.col === 1) assert.ok(v.revealed, "column 1 is reachable");
    if (v.node.col >= 2 && v.node.col <= 5) assert.equal(v.revealed, false);
    if (v.node.kind === "tournament") assert.ok(v.revealed);
  }
  t.souvenirs.push("road-atlas");
  view = mapView(t);
  assert.ok(view.filter((v) => v.node.col === 2).some((v) => v.revealed));
  assert.ok(view.filter((v) => v.node.col === 3).every((v) => !v.revealed));
  moveTo(t, env, roadTargets(t)[0].id);
  view = mapView(t);
  assert.equal(view.find((v) => v.node.id === t.at)!.state, "here");
});

test("a whole stage, the Preisskat win, the beer mat and the region choice", () => {
  const { t, env } = tour({ seed: 5 });
  while (currentNode(t).kind !== "tournament") {
    const next = roadTargets(t)[0];
    moveTo(t, env, next.id);
    const n = currentNode(t);
    if (n.kind === "inn" || n.kind === "bikers") finishStation(t, env, { kind: n.kind, round: round(1) });
    if (t.station) {
      t.station.event = undefined;
      t.station.special = undefined;
    }
  }
  assert.equal(tourPhase(t), "station");
  const out = finishStation(t, env, { kind: "tournament", round: round(1) });
  assert.equal(out.trophy, "enztal");
  assert.equal(out.beerMatChoice!.length, 3);
  assert.equal(tourPhase(t), "station", "beer mat still to choose");
  assert.ok(chooseBeerMat(t, out.beerMatChoice![0]).ok);
  assert.equal(t.beerMats.length, 1);
  assert.equal(tourPhase(t), "region");
  assert.equal(env.book!.trophies["enztal-sporty"], 1);
  assert.ok(env.book!.dogs.includes("airedale"), "first Preisskat win unlocks the Airedale");
  const choices = regionChoices(t, env.pack);
  assert.equal(choices.length, 2);
  assert.ok(!choices.includes("enztal"));
  assert.deepEqual(regionChoices(t, env.pack), choices, "stable");
  t.used["s.shepherd"] = 1;
  t.dogs.push("schnauzer-b");
  const r = enterStage(t, env, choices[1]);
  assert.ok(r.ok);
  assert.equal(t.stage, 1);
  assert.equal(t.regions[1], choices[1]);
  assert.equal(t.used["s.shepherd"], undefined, "per-stage counters reset");
  assert.ok(!t.dogs.includes("schnauzer-b"), "the guest heads home after his stage");
  assert.equal(currentNode(t).col, 0);
  assert.equal(tourPhase(t), "map");
  assert.equal(enterStage(t, env, choices[0]).ok, false);
});

test("the final: a table win brings the Wanderpokal and ends the tour; otherwise it ends without", () => {
  for (const place of [1, 2] as const) {
    const { t, env } = tour({ seed: 11 });
    t.stage = 2;
    t.regions = ["enztal", "muehlacker", "schwarzwald"];
    const fin = t.map.nodes.find((n) => n.kind === "tournament")!;
    t.at = fin.id;
    t.station = { node: fin.id, done: ["arrived"] };
    assert.equal(pendingRoundConfig(t, settings, env)!.games, 9);
    const out = finishStation(t, env, { kind: "tournament", round: round(place) });
    assert.equal(tourPhase(t), "ended");
    if (place === 1) {
      assert.equal(t.ended, "won");
      assert.ok(out.wanderpokal);
      assert.equal(env.book!.trophies["wander-sporty"], 1);
      assert.ok(env.book!.unlocks.sidecarRig);
      assert.equal(env.book!.tours.won, 1);
    } else {
      assert.equal(t.ended, "lost-final");
      assert.equal(t.fuel, 5, "no fuel loss in the final");
    }
  }
});

test("empty tank ends the tour: Heimfahrt am Haken (postcard and the guest schnauzer help first)", () => {
  const { t, env } = tour({ seed: 3 });
  moveTo(t, env, roadTargets(t)[0].id);
  t.fuel = 1;
  t.dogs = [];
  const out = finishStation(t, env, { kind: "inn", round: round(3) });
  assert.equal(t.ended, "empty");
  assert.equal(out.ended, "empty");
  assert.equal(tourPhase(t), "ended");
  assert.match(t.route[t.route.length - 1].line, /Heimfahrt am Haken/);
  assert.equal(env.book!.tours.empty, 1);

  const b = tour({ seed: 3 });
  moveTo(b.t, b.env, roadTargets(b.t)[0].id);
  b.t.fuel = 1;
  b.t.dogs = [];
  b.t.souvenirs.push("postcard");
  finishStation(b.t, b.env, { kind: "inn", round: round(3) });
  assert.equal(b.t.ended, undefined);
  assert.equal(b.t.fuel, 2);
  assert.equal(b.t.used.postcard, 1);

  const c = tour({ seed: 3 });
  moveTo(c.t, c.env, roadTargets(c.t)[0].id);
  c.t.fuel = 1;
  c.t.dogs = ["schnauzer-b"];
  finishStation(c.t, c.env, { kind: "inn", round: round(3) });
  assert.equal(c.t.ended, undefined);
  assert.equal(c.t.fuel, c.t.fuelMax);
  assert.ok(!c.t.dogs.includes("schnauzer-b"));
});

test("the guided first trip: four fixed stations, no fuel loss, then done", () => {
  const env = testEnv();
  const t = newTutorial({ seed: 1, pack: env.pack, profile: env.profile, book: env.book, today: env.today });
  assert.ok(t.tutorial);
  assert.equal(roadTargets(t).length, 1);
  assert.equal(detourTargets(t).length, 0);
  moveTo(t, env, roadTargets(t)[0].id);
  assert.deepEqual(pendingRoundConfig(t, settings, env)!.opponents, ["neuling", "schwaetzer"]);
  const fuel = t.fuel;
  finishStation(t, env, { kind: "inn", round: round(3) });
  assert.equal(t.fuel, fuel, "no fuel loss");
  for (const kind of ["sudoku", "chess", "pitch"]) {
    moveTo(t, env, roadTargets(t)[0].id);
    assert.equal(currentNode(t).kind, kind);
  }
  assert.equal(tourPhase(t), "tutorial-done");
  completeTutorial(t, env);
  assert.equal(t.ended, "won");
  assert.equal(env.book!.tours.won, 0, "the tutorial is no tour in the book");
});

test("arrival rolls offers and events; nodeById finds them", () => {
  const { t, env } = tour({ seed: 21 });
  for (let i = 0; i < 6 && !t.ended; i++) {
    const n = roadTargets(t)[0];
    if (!n) break;
    const a = moveTo(t, env, n.id);
    assert.ok(a.ok);
    const node = nodeById(t, n.id)!;
    if (node.kind === "market") assert.equal(a.offer!.length, 3);
    if (node.kind === "event") assert.ok(a.event || a.lines.length);
    if (node.kind === "inn" || node.kind === "bikers" || node.kind === "tournament") finishStation(t, env, { kind: node.kind, round: round(2) });
    if (t.station) {
      t.station.event = undefined;
      t.station.special = undefined;
      t.station.offer = [];
    }
  }
});
