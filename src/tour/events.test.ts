import { test } from "node:test";
import assert from "node:assert/strict";
import type { EventDef, TourState } from "../game/types.ts";
import {
  applyOutcome, checkCondition, eligibleEvents, fill, markSeen, pickEvent, presentEvent, reqLabel, resolveChoice,
  validateEvents,
} from "./events.ts";
import { finishRound } from "./economy.ts";
import { moveTo, newTour, pendingRoundConfig, roadTargets, stationOpen, tourPhase } from "./state.ts";
import { FIXTURE_EVENTS } from "./fixtures.ts";
import { rngFor } from "./util.ts";
import { testEnv } from "./testkit.ts";

function setup(profileOver: Record<string, unknown> = {}) {
  const base = testEnv();
  const env = { ...base, profile: { ...base.profile, ...profileOver } };
  const t = newTour({ seed: 31, difficulty: "sporty", vehicle: "camper", dogs: ["shepherd"], pack: env.pack, profile: env.profile, book: env.book, today: env.today });
  moveTo(t, env, roadTargets(t)[0].id);
  t.station = { node: t.at, done: ["arrived", "round"] };
  return { t, env };
}

const ev = (id: string) => FIXTURE_EVENTS.find((e) => e.id === id)!;

test("the fixture deck is valid", () => {
  assert.deepEqual(validateEvents(FIXTURE_EVENTS), []);
  const broken: EventDef[] = [{ id: "a", pool: "anywhere", title: "A", text: "", choices: [{ text: "x", outcomes: [{ outcome: { next: "nope" } }] }] }];
  assert.deepEqual(validateEvents(broken), ["a: unknown event nope"]);
});

test("placeholders: filled from tour and profile, graceful when empty, markup untouched", () => {
  const { t, env } = setup({ partner: "Erna", van: "Elvira" });
  const text = fill("{name} ({title}) fährt mit {van} und {dog} nach {place}; {partner}, {child}, {bike}, {home}. {gold}Gut{/}", t, env);
  assert.match(text, /^Karl \(Lehrling\) fährt mit Elvira und Hasso nach .+; Erna, der Nachwuchs, die Maschine, Enzweihingen\. \{gold\}Gut\{\/\}$/);
  assert.doesNotMatch(fill("{note}", t, env), /\{/);
});

test("conditions with German reasons, and blue answers", () => {
  const { t, env } = setup();
  assert.ok(checkCondition(t, env, { dog: "any" }).ok);
  assert.equal(checkCondition(t, env, { dog: "airedale" }).reason, "Nur mit dem Airedale Terrier");
  assert.equal(checkCondition(t, env, { marks: 99 }).reason, "Braucht 99 Mark");
  assert.equal(checkCondition(t, env, { souvenir: "thermos" }).reason, "Nur mit Thermoskanne");
  assert.equal(checkCondition(t, env, { profile: "partner" }).ok, false);
  assert.ok(checkCondition(t, env, { region: "enztal" }).ok);
  assert.equal(reqLabel({ dog: "shepherd" }, env.profile), "[Hasso]");
  assert.equal(reqLabel({ upgrade: "fridge" }), "[Kühlschrank]");
  const view = presentEvent(t, env, ev("fx-kehrwoche"));
  assert.equal(view.choices[1].blue, true);
  assert.equal(view.choices[1].label, "[Hund]");
  assert.equal(view.choices[1].text, "Hasso bellt die Kehrwoche weg.");
  t.dogs = [];
  const v2 = presentEvent(t, env, ev("fx-kehrwoche"));
  assert.equal(v2.choices[1].hidden, true, "blue answers hide when unmet");
  const v3 = presentEvent(t, env, ev("fx-flohmarkt"));
  t.marks = 0;
  const v4 = presentEvent(t, env, ev("fx-flohmarkt"));
  assert.equal(v3.choices[0].enabled, true);
  assert.equal(v4.choices[0].enabled, false);
  assert.equal(v4.choices[0].hidden, false, "plain answers show disabled");
});

test("eligibility: pools, region, requires, profile, no repeats, once across tours", () => {
  const { t, env } = setup();
  const ids = (p: Parameters<typeof eligibleEvents>[2]) => eligibleEvents(t, env, p).map((e) => e.id);
  assert.deepEqual(ids("region"), ["fx-enz-besen"]);
  assert.ok(!ids("anywhere").includes("fx-partner"), "no partner in the neutral profile");
  assert.ok(ids("dog").length > 0);
  markSeen(t, env, "fx-flohmarkt");
  assert.ok(!ids("anywhere").includes("fx-flohmarkt"));
  assert.deepEqual(env.book!.events, ["fx-flohmarkt"], "once events go into the book");
  const next = setup();
  next.env.book!.events = ["fx-flohmarkt"];
  assert.ok(!eligibleEvents(next.t, next.env, "anywhere").some((e) => e.id === "fx-flohmarkt"));
  const withPartner = setup({ partner: "Erna" });
  assert.ok(eligibleEvents(withPartner.t, withPartner.env, "anywhere").some((e) => e.id === "fx-partner"));
});

test("pickEvent is deterministic and never repeats within a tour", () => {
  const { t, env } = setup();
  const a = pickEvent(t, env, ["anywhere", "region", "bike"], "x");
  assert.deepEqual(pickEvent(t, env, ["anywhere", "region", "bike"], "x"), a);
  const seen = new Set<string>();
  for (let i = 0; i < 40; i++) {
    const e = pickEvent(t, env, ["anywhere", "region", "bike", "dog"], `n${i}`);
    if (!e) break;
    assert.ok(!seen.has(e.id));
    seen.add(e.id);
    markSeen(t, env, e.id);
  }
  assert.ok(seen.size >= 8);
  assert.equal(pickEvent(t, env, ["region"], "end"), null);
});

test("outcomes: fuel, Mark, souvenir, beer mat, upgrade, dog joins / leaves, unlock, flags, chronicle", () => {
  const { t, env } = setup();
  const rng = rngFor(1);
  t.fuel = 2;
  let r = applyOutcome(t, env, { fuel: 2, marks: [3, 3], souvenir: "thermos", beerMat: "redeal", upgrade: "aux-tank", flags: ["x"], chronicle: "In {place} war was los." }, rng);
  assert.equal(r.marks, 3);
  assert.deepEqual(t.souvenirs, ["thermos"]);
  assert.deepEqual(t.beerMats, ["redeal"]);
  assert.equal(t.fuelMax, 7);
  assert.equal(t.fuel, 6);
  assert.equal(r.fuel, 4);
  assert.ok(t.flags.includes("x"));
  assert.match(env.book!.chronicle.at(-1)!.text, /^In .+ war was los\.$/);
  r = applyOutcome(t, env, { dog: "airedale", unlockDog: "wolfhound-a", clearFlags: ["x"] }, rng);
  assert.deepEqual(t.dogs, ["shepherd", "airedale"]);
  assert.deepEqual(r.unlocked, ["wolfhound-a"]);
  assert.ok(env.book!.dogs.includes("wolfhound-a"));
  assert.ok(!t.flags.includes("x"));
  r = applyOutcome(t, env, { dog: "schnauzer-b" }, rng);
  assert.equal(t.dogs.length, 2, "no third seat without the dog bed");
  assert.match(r.notices[0], /Kein Platz/);
  applyOutcome(t, env, { dogLeaves: "airedale" }, rng);
  assert.deepEqual(t.dogs, ["shepherd"]);
  t.souvenirs = ["thermos", "pencil", "notepad", "pennant"];
  r = applyOutcome(t, env, { souvenir: "postcard" }, rng);
  assert.deepEqual(r.overflow, { souvenir: "postcard" });
  t.vehicle = "sidecar-rig";
  r = applyOutcome(t, env, { upgrade: "fridge" }, rng);
  assert.ok(!t.upgrades.includes("fridge"));
});

test("an event's fuel loss can end the tour, and then nothing follows", () => {
  const { t, env } = setup();
  t.fuel = 1;
  t.dogs = [];
  const r = applyOutcome(t, env, { fuel: -1, next: "fx-hocketse-win" }, rngFor(2));
  assert.equal(r.ended, "empty");
  assert.equal(r.next, undefined);
});

test("resolveChoice writes the route line and chains to the next event", () => {
  const { t, env } = setup();
  t.station!.event = "fx-kehrwoche";
  const r = resolveChoice(t, env, ev("fx-kehrwoche"), 0);
  assert.equal(r.marks, 2);
  assert.match(r.line!, /^Kehrwoche, .+: \+2 Mark$/);
  assert.equal(t.route.at(-1)!.line, r.line);
  assert.equal(t.station!.event, undefined);
  assert.equal(tourPhase(t), "map");
});

test("a special round from an event: config, consequences, onWin continues the story", () => {
  const { t, env } = setup();
  t.station!.event = "fx-hocketse";
  const r = resolveChoice(t, env, ev("fx-hocketse"), 0);
  assert.equal(r.next?.kind, "skat");
  assert.ok(stationOpen(t));
  const cfg = pendingRoundConfig(t, { showPoints: false, showTrumpCount: false }, env)!;
  assert.deepEqual(cfg.opponents, ["maurer", "zocker"]);
  assert.match(cfg.title, /^Sonderrunde in /);
  const out = finishRound(t, env, { place: 1, list: [100, 0, 0], games: [], marks: 0 }, "skat");
  assert.ok(out.marks > 0);
  assert.deepEqual(out.next, { kind: "event", id: "fx-hocketse-win" });
  assert.equal(t.station!.event, "fx-hocketse-win");
  assert.equal(t.station!.special, undefined);
  resolveChoice(t, env, ev("fx-hocketse-win"), 0);
  assert.equal(tourPhase(t), "map");
  assert.equal(t.stats.innRounds, 0, "special rounds are no inn rounds");
});

test("a puzzle from an event", () => {
  const { t, env } = setup();
  const r = resolveChoice(t, env, ev("fx-tramper"), 0);
  assert.deepEqual(r.next, { kind: "puzzle", puzzle: "chess" });
  assert.equal(t.station!.puzzle, "chess");
});

test("weighted outcomes roll by weight", () => {
  const { env } = setup();
  let lost = 0;
  for (let i = 0; i < 600; i++) {
    const s = setup();
    s.t.route.push(...Array(i % 7).fill(s.t.route[0]));
    s.t.seed = i;
    const r = resolveChoice(s.t, env, ev("fx-stau"), 0);
    if (r.fuel < 0) lost++;
  }
  assert.ok(lost > 120 && lost < 290, `about a third: ${lost}`);
});

test("the default answer is always possible", () => {
  const { t, env } = setup();
  const hard: EventDef = { id: "h", pool: "anywhere", title: "H", text: "", choices: [{ text: "a", req: { marks: 999 }, outcomes: [{ outcome: {} }] }] };
  const v = presentEvent(t, env, hard);
  assert.equal(v.choices[0].enabled, true);
  void (t as TourState);
});
