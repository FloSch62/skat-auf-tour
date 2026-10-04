// The event runtime against the real decks (src/content/events): every condition evaluable, every placeholder
// resolvable with the neutral profile and (when present) the private profile, every outcome applicable.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import type { EventDef, Profile, TourState } from "../game/types.ts";
import { ALL_EVENTS } from "../content/events/index.ts";
import { applyOutcome, checkCondition, eligibleEvents, fill, presentEvent, validateEvents } from "./events.ts";
import { newTour } from "./state.ts";
import { newBook } from "./book.ts";
import { rngFor, type TourEnv } from "./util.ts";
import { loadDefaultProfile, loadPack } from "./testkit.ts";

const pack = loadPack();
const PRIVATE = new URL("../../private/profile.json", import.meta.url);
const profiles: [string, Profile][] = [["default", loadDefaultProfile()]];
if (existsSync(PRIVATE)) profiles.push(["private", JSON.parse(readFileSync(PRIVATE, "utf8")) as Profile]);

const LEFTOVER = /\{(name|title|partner|child|van|bike|dog|place|home|note|dog:[a-z-]*)\}/;

function tourFor(def: EventDef, profile: Profile): { t: TourState; env: TourEnv } {
  const book = newBook();
  const env: TourEnv = { pack, profile, name: "Karl", events: ALL_EVENTS, book, today: "1983-06-12" };
  const t = newTour({ seed: 17, difficulty: "sporty", vehicle: "camper", dogs: ["shepherd"], pack, profile, book });
  const region = def.region ?? def.requires?.region;
  if (region) t.regions[0] = region;
  // Stand on a node of the current map whose place has a profile note when the event wants one.
  const noted = t.map.nodes.find((n) => profile.notes?.[n.place]);
  t.at = (def.requires?.profile === "note" && noted ? noted : t.map.nodes[1]).id;
  t.station = { node: t.at, done: ["arrived"] };
  t.dogs = ["shepherd", "airedale"];
  return { t, env };
}

test("the real decks are valid for the runtime", () => {
  assert.ok(ALL_EVENTS.length > 0);
  assert.deepEqual(validateEvents(ALL_EVENTS), []);
});

for (const [label, profile] of profiles) {
  test(`every event presents, resolves its placeholders and applies its outcomes (${label} profile)`, () => {
    for (const def of ALL_EVENTS) {
      const { t, env } = tourFor(def, profile);
      checkCondition(t, env, def.requires);
      const view = presentEvent(t, env, def);
      for (const s of [view.title, view.text, view.speaker ?? "", ...view.choices.map((c) => c.text)]) {
        assert.doesNotMatch(s, LEFTOVER, `${def.id}: ${s}`);
      }
      def.choices.forEach((c, i) => {
        checkCondition(t, env, c.req);
        c.outcomes.forEach((w, k) => {
          for (const s of [w.outcome.text, w.outcome.chronicle, w.outcome.skat?.intro]) {
            if (s) assert.doesNotMatch(fill(s, t, env), LEFTOVER, `${def.id} choice ${i} outcome ${k}`);
          }
          const copy = structuredClone(t);
          const r = applyOutcome(copy, { ...env, book: structuredClone(env.book) }, w.outcome, rngFor(def.id, i, k));
          assert.ok(Array.isArray(r.notices));
        });
      });
    }
  });
}

test("profile-bound events are skipped with the neutral profile", () => {
  const neutral = loadDefaultProfile();
  const bound = ALL_EVENTS.filter((e) => e.requires?.profile);
  for (const def of bound) {
    const { t, env } = tourFor(def, neutral);
    assert.ok(!eligibleEvents(t, env, def.pool).some((e) => e.id === def.id), def.id);
  }
});

test("the neutral profile can unlock schnauzer-b (dog-nachbarin), and the unlock event stops afterwards", () => {
  const neutral = loadDefaultProfile();
  const def = ALL_EVENTS.find((e) => e.id === "dog-nachbarin")!;
  assert.ok(def, "dog-nachbarin exists");
  const { t, env } = tourFor(def, neutral);
  assert.ok(eligibleEvents(t, env, "dog").some((e) => e.id === "dog-nachbarin"));
  const unlocks = def.choices.flatMap((c) => c.outcomes.map((o) => o.outcome.unlockDog));
  assert.ok(unlocks.includes("schnauzer-b"));
  applyOutcome(t, env, def.choices[0].outcomes[0].outcome, rngFor("n"));
  assert.ok(env.book!.dogs.includes("schnauzer-b"));
  assert.ok(!eligibleEvents(t, env, "dog").some((e) => e.id === "dog-nachbarin" || e.id === "dog-besuch"));
});
