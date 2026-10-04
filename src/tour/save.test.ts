import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BACKUP_APP, TOUR_MIGRATIONS, deserializeBook, migrate, deserializeTour, exportBackup, importBackup, migrateTour,
  serializeBook, serializeTour,
} from "./save.ts";
import { moveTo, newTour, roadTargets } from "./state.ts";
import { newBook } from "./book.ts";
import { testEnv } from "./testkit.ts";

function sample() {
  const env = testEnv();
  const t = newTour({ seed: 5, difficulty: "cozy", vehicle: "camper", dogs: ["shepherd"], pack: env.pack, profile: env.profile, book: env.book, events: env.events });
  moveTo(t, env, roadTargets(t)[0].id);
  return { t, env };
}

test("tour and book round-trip through JSON", () => {
  const { t, env } = sample();
  assert.deepEqual(deserializeTour(serializeTour(t)), t);
  assert.deepEqual(deserializeBook(serializeBook(env.book!)), env.book);
});

test("version checks: newer saves are refused, broken ones too, migrations run", () => {
  const { t } = sample();
  assert.equal(migrateTour({ ...t, version: 99 }), null);
  assert.equal(migrateTour({ nonsense: true }), null);
  assert.equal(deserializeTour("{"), null);
  assert.equal(migrateTour({ ...t, at: "nowhere" }), null);
  // An old version-0 save without stats and flags is upgraded by the hook chain.
  const old = JSON.parse(serializeTour(t));
  old.version = 0;
  delete old.stats;
  delete old.flags;
  TOUR_MIGRATIONS[0] = (raw) => ({ ...raw, flags: ["migrated"] });
  try {
    const m = migrateTour(old)!;
    assert.equal(m.version, 1);
    assert.deepEqual(m.flags, ["migrated"]);
    assert.equal(m.stats.innRounds, 0);
  } finally {
    delete TOUR_MIGRATIONS[0];
  }
});

test("migrate(run, book) for restored storage", () => {
  const { t, env } = sample();
  const m = migrate(JSON.parse(serializeTour(t)), JSON.parse(serializeBook(env.book!)));
  assert.deepEqual(m.run, JSON.parse(serializeTour(t)));
  assert.deepEqual(m.book, env.book);
  const bad = migrate("nonsense", null);
  assert.equal(bad.run, null);
  assert.equal(bad.book.version, 1);
});

test("backup export and import", () => {
  const { t, env } = sample();
  const json = exportBackup({ settings: { name: "Karl", drink: "beer" }, profile: env.profile, book: env.book!, tour: t }, "1983-06-12");
  const raw = JSON.parse(json);
  assert.equal(raw.app, BACKUP_APP);
  assert.ok(raw.data.run && raw.data.book && raw.data.settings && raw.data.profile);
  const r = importBackup(json);
  assert.ok(r.ok);
  if (r.ok) {
    assert.deepEqual(r.data.tour, t);
    assert.deepEqual(r.data.book, env.book);
    assert.equal(r.data.settings.name, "Karl");
    assert.equal(r.date, "1983-06-12");
  }
  // The Lead's collectBackup format with only a book is readable too.
  const lead = importBackup({ app: BACKUP_APP, version: 1, date: "x", data: { book: newBook() } });
  assert.ok(lead.ok && lead.data.tour === null);
  const bad = importBackup("{\"app\":\"other\"}");
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.match(bad.error, /keine Sicherung/);
  const newer = importBackup({ app: BACKUP_APP, version: 9, data: {} });
  assert.equal(newer.ok, false);
  // An ended tour is not exported.
  t.ended = "empty";
  assert.equal(JSON.parse(exportBackup({ settings: {}, profile: null, book: env.book!, tour: t })).data.run, undefined);
});
