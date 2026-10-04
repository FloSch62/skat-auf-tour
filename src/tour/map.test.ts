import { test } from "node:test";
import assert from "node:assert/strict";
import type { MapNode, StageMap } from "../game/types.ts";
import { DIFFICULTIES, REGIONS } from "../game/ids.ts";
import {
  MAP_LAYOUT, PUZZLE_KINDS, column, maxInnsFor, stageOf, entryPlace, generateStage, generateTutorialMap, pitchFailures, successors,
  validateStage,
} from "./map.ts";
import { FIXTURE_EVENTS } from "./fixtures.ts";
import { loadDefaultProfile, loadPack } from "./testkit.ts";

const pack = loadPack();
const profile = loadDefaultProfile();

/** Every road path from the start to the Preisskat, enumerated (independent of the generator's DP helpers). */
function paths(map: StageMap): MapNode[][] {
  const start = map.nodes.find((n) => n.col === 0)!;
  const out: MapNode[][] = [];
  const walk = (n: MapNode, acc: MapNode[]) => {
    const p = [...acc, n];
    if (!n.next.length) out.push(p);
    for (const m of successors(map, n)) walk(m, p);
  };
  walk(start, []);
  return out;
}

function checkGuarantees(map: StageMap, label: string) {
  const region = pack.regions.find((r) => r.id === map.region)!;
  assert.deepEqual(validateStage(map, { region }), [], label);
  const ps = paths(map);
  assert.ok(ps.length >= 2, `${label}: at least two routes`);
  for (const p of ps) {
    assert.equal(p.length, 7, `${label}: a path crosses all seven columns`);
    const inns = p.filter((n) => n.kind === "inn").length;
    assert.ok(inns >= 2 && inns <= maxInnsFor(stageOf(map)), `${label}: path with ${inns} inns`);
    // A pitch one step away at column 3 (from the column-2 node) or column 4 (from the column-3 node).
    const pitchInReach = successors(map, p[2]).some((n) => n.kind === "pitch") || successors(map, p[3]).some((n) => n.kind === "pitch");
    assert.ok(pitchInReach, `${label}: no pitch in reach on a path`);
    for (let i = 1; i < p.length; i++) {
      if (PUZZLE_KINDS.includes(p[i].kind)) assert.notEqual(p[i].kind, p[i - 1].kind, `${label}: puzzle twice in a row`);
    }
    // Nobody twice on one path.
    const chars = p.flatMap((n) => n.inn?.opponents ?? []);
    assert.equal(new Set(chars).size, chars.length, `${label}: a character twice on a path`);
  }
  assert.ok(map.nodes.filter((n) => n.kind === "dogs").length <= 1, `${label}: dog meadows`);
  assert.ok(map.nodes.filter((n) => n.kind === "bikers").length <= 1, `${label}: bikers`);
  for (const n of column(map, 1)) {
    assert.equal(n.kind, "inn");
    assert.equal(n.inn?.houseRule, "standard");
    assert.equal(n.inn?.stakes, "small");
  }
  for (const n of map.nodes) {
    assert.ok(n.x >= 40 && n.x <= 920, `${label}: x in screen`);
    assert.ok(n.y >= MAP_LAYOUT.top - MAP_LAYOUT.jitterY - 1 && n.y <= MAP_LAYOUT.bottom + MAP_LAYOUT.jitterY + 1, `${label}: y between HUD and bar`);
  }
}

test("generator guarantees hold over thousands of seeds, all regions, stages and difficulties", () => {
  let maps = 0;
  const kindCount: Record<string, number> = {};
  for (let seed = 1; seed <= 700; seed++) {
    for (const region of REGIONS) {
      const difficulty = DIFFICULTIES[seed % 3];
      const stage = seed % 3;
      const map = generateStage({
        pack, region, stage, seed: seed * 7919, difficulty, startPlace: stage === 0 ? profile.home : undefined,
        events: FIXTURE_EVENTS, profile, dogs: seed % 2 ? ["shepherd"] : [],
      });
      checkGuarantees(map, `${region} seed ${seed}`);
      for (const n of map.nodes) kindCount[n.kind] = (kindCount[n.kind] ?? 0) + 1;
      maps++;
    }
  }
  assert.equal(maps, 2800);
  // Every station kind actually appears.
  for (const k of ["inn", "bikers", "problem", "chess", "sudoku", "pitch", "dogs", "market", "garage", "event"]) {
    assert.ok((kindCount[k] ?? 0) > 50, `kind ${k} appears`);
  }
});

test("the Schultes and his Amtsbote: together, at one inn in one stage of most tours, never in column 1", () => {
  let tours = 0;
  let withDuo = 0;
  for (let seed = 1; seed <= 600; seed++) {
    let inns = 0;
    for (let stage = 0; stage < 3; stage++) {
      const region = REGIONS[stage];
      const map = generateStage({ pack, region, stage, seed: seed * 101, difficulty: "sporty" });
      for (const n of map.nodes) {
        const ops: readonly string[] = n.inn?.opponents ?? [];
        if (ops.includes("schultes") || ops.includes("amtsbote")) {
          assert.ok(ops.includes("schultes") && ops.includes("amtsbote"), "always together");
          assert.ok(n.col >= 2 && n.col <= 5, "not in column 1");
          assert.ok(n.inn!.room === "village" || n.inn!.room === "clubhouse");
          inns++;
        }
      }
      assert.deepEqual(validateStage(map, { region: pack.regions.find((r) => r.id === region) }), []);
    }
    assert.ok(inns <= 1, "at most one duo inn per tour");
    tours++;
    if (inns) withDuo++;
  }
  assert.ok(withDuo / tours > 0.7 && withDuo / tours < 0.95, `duo in ${withDuo} of ${tours} tours`);
});

test("the map is deterministic for a seed and differs between seeds", () => {
  const o = { pack, region: "enztal" as const, stage: 0, seed: 42, difficulty: "sporty" as const, startPlace: profile.home };
  assert.deepEqual(generateStage(o), generateStage(o));
  assert.notDeepEqual(generateStage(o), generateStage({ ...o, seed: 43 }));
});

test("stage 1 starts at home, the Preisskat is at the region's tournament place, places follow the travel direction", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const map = generateStage({ pack, region: "enztal", stage: 0, seed, difficulty: "cozy", startPlace: "enzweihingen" });
    assert.equal(map.nodes.find((n) => n.col === 0)!.place, "enzweihingen");
    assert.equal(map.nodes.find((n) => n.col === 6)!.place, "vaihingen");
    // Average x of the places grows column by column (direction east).
    const region = pack.regions.find((r) => r.id === "enztal")!;
    const avgX = (c: number) => {
      const ns = column(map, c);
      return ns.reduce((a, n) => a + region.places.find((p) => p.id === n.place)!.x, 0) / ns.length;
    };
    for (let c = 2; c <= 5; c++) assert.ok(avgX(c) >= avgX(c - 1) - 1e-9, `seed ${seed}: column ${c} west of column ${c - 1}`);
  }
  const sw = pack.regions.find((r) => r.id === "schwarzwald")!;
  const map = generateStage({ pack, region: "schwarzwald", stage: 1, seed: 9, difficulty: "sharp" });
  assert.equal(map.nodes.find((n) => n.col === 0)!.place, entryPlace(sw));
});

test("the strength mix follows the difficulty", () => {
  const strengthOf = (id: string) => ({ neuling: 1, schwaetzer: 1, anwaerter: 1, rechnerin: 3, schlitzohr: 3, altmeister: 4 } as Record<string, number>)[id] ?? 2;
  const avg: Record<string, number> = {};
  for (const d of DIFFICULTIES) {
    let sum = 0;
    let n = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const map = generateStage({ pack, region: "enztal", stage: 0, seed, difficulty: d, startPlace: "enzweihingen" });
      // The first inns are drawn before the pool thins out: column 1 shows the mix best.
      for (const node of column(map, 1)) for (const c of node.inn!.opponents) {
        sum += strengthOf(c);
        n++;
      }
    }
    avg[d] = sum / n;
  }
  assert.ok(avg.cozy < avg.sporty && avg.sporty < avg.sharp, JSON.stringify(avg));
});

test("events are pre-rolled, distinct and fit the region", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const map = generateStage({ pack, region: "muehlacker", stage: 1, seed, difficulty: "sporty", events: FIXTURE_EVENTS, profile, dogs: [] });
    const evs = map.nodes.filter((n) => n.kind === "event");
    for (const n of evs) {
      assert.ok(n.event, "pre-rolled");
      const def = FIXTURE_EVENTS.find((e) => e.id === n.event)!;
      assert.ok(def.pool !== "region" || def.region === "muehlacker");
      assert.ok(def.pool !== "chain" && def.pool !== "dog", "no chain or dog events without a dog");
      assert.notEqual(def.id, "fx-partner", "profile events skipped without a partner");
    }
  }
});

test("pitchFailures finds a missing pitch", () => {
  const map = generateStage({ pack, region: "enztal", stage: 0, seed: 5, difficulty: "cozy" });
  assert.equal(pitchFailures(map).length, 0);
  for (const n of map.nodes) if (n.kind === "pitch") n.kind = "event";
  assert.ok(pitchFailures(map).length > 0);
});

test("tutorial map: home, weak inn, kiosk, chess board, pitch", () => {
  const map = generateTutorialMap({ pack, profile, region: "enztal", seed: 1 });
  assert.deepEqual(map.nodes.map((n) => n.kind), ["start", "inn", "sudoku", "chess", "pitch"]);
  assert.equal(map.nodes[0].place, "enzweihingen");
  assert.deepEqual(map.nodes[1].inn!.opponents, ["neuling", "schwaetzer"]);
  assert.equal(map.nodes[1].inn!.houseRule, "standard");
  assert.deepEqual(validateStage(map, { tutorial: true }), []);
  assert.equal(new Set(map.nodes.map((n) => n.place)).size, 5);
});
