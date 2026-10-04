// Content validation for the Text area (events, speech, characters, help, fixed texts).
// Run: npm test   or   node --experimental-strip-types --no-warnings --test src/content/content.test.ts
// Partial runs while a deck is being written:
//   CONTENT_DECKS=enztal,dogs     per-event checks only for these decks; quotas, flag closure and art coverage skipped
//   CONTENT_ONLY=events,speech    only these suites (events, speech, characters, help, texts)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BEER_MATS, CHARACTERS, DOGS, FAVOURITES, FAVOURITES_BY_REGION, HOUSE_RULES, MUSIC, REGIONS, REGULARS,
  SIDE_CHARACTERS, SOUVENIRS, UPGRADES, VEHICLES,
} from "../game/ids.ts";
import type { CharacterId } from "../game/ids.ts";
import type { ChoiceDef, Condition, EventDef, Outcome, SpeechSituation } from "../game/types.ts";
import { ALL_EVENTS, ALL_FLAGS, EVENT_ART_IDS, EVENT_DECKS, EXTRA_DECKS, REQUIRED_EVENT_IDS } from "./events/index.ts";
import { DUO_EXCHANGES, fillTarget, SIGI_TELLS, SPEECH, TARGET_SITUATIONS, TELL_HINTS } from "./speech.ts";
import { CHARACTER_DEFS } from "../data/characters.ts";
import * as HELP from "./help.ts";
import * as TEXTS from "./texts.ts";

// ─── Configuration ─────────────────────────────────────────────────────────────────────────────────────────

const env = (name: string) => (process.env[name] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const DECKS_UNDER_TEST = env("CONTENT_DECKS");
const ONLY = env("CONTENT_ONLY");
const PARTIAL = DECKS_UNDER_TEST.length > 0;
const suite = (name: string) => ONLY.length === 0 || ONLY.includes(name);
const CHECKED: EventDef[] = PARTIAL ? DECKS_UNDER_TEST.flatMap((d) => EVENT_DECKS[d] ?? []) : ALL_EVENTS;

// ─── Glyphs (the bitmap fonts) ─────────────────────────────────────────────────────────────────────────────

const HEAD = JSON.parse(readFileSync(new URL("../../public/fonts/head.json", import.meta.url), "utf8")) as {
  glyphs: Record<string, unknown>;
};
const GLYPHS = new Set<string>([...Object.keys(HEAD.glyphs), "\n"]);

function badGlyphs(s: string): string[] {
  return [...new Set([...s].filter((ch) => !GLYPHS.has(ch)))];
}

/**
 * Brands, real firms, anything borrowed from "Werner" (contract §0.8, §0.9), and the drinking mechanic that no longer
 * exists (no Pegel; beer is „eine Halbe“ or „ein Weizen“, never „Helles“).
 */
const FORBIDDEN = /\b(Pegel|Helles|besoffen|Suff|Bosch|Daimler|Mercedes|Porsche|BEHR|Behr|Ensinger|Dinkelacker|Schwabenbräu|Hofbräu|Wulle|Kärcher|Trigema|Coca|Fanta|Sinalco|Werner|Röhrich|Bölkstoff|Holgi|Eckat|Flaschbier|Brösel)\b/;
const PLACEHOLDER = /\{([^}]*)\}/g;

/** Keys that hold ids, not text. */
const NON_TEXT_KEYS = new Set([
  "id", "pool", "region", "art", "portrait", "music", "next", "onWin", "onLose", "flags", "clearFlags", "flag",
  "notFlag", "souvenir", "beerMat", "upgrade", "dog", "dogLeaves", "unlockDog", "opponents", "houseRule", "stakes",
  "puzzle", "vehicle", "profile", "icon",
]);

function stringsIn(value: unknown, path: string, out: [string, string][]): void {
  if (typeof value === "string") out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => stringsIn(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) if (!NON_TEXT_KEYS.has(k)) stringsIn(v, `${path}.${k}`, out);
  }
}

function checkStrings(label: string, value: unknown, errors: string[]): void {
  const all: [string, string][] = [];
  stringsIn(value, label, all);
  for (const [path, s] of all) {
    const bad = badGlyphs(s);
    if (bad.length) errors.push(`${path}: glyphs not in the font: ${bad.map((c) => JSON.stringify(c)).join(" ")}`);
    if (/'/.test(s)) errors.push(`${path}: straight apostrophe, use ’: "${s.slice(0, 60)}"`);
    if (/"/.test(s)) errors.push(`${path}: straight quote, use „…“: "${s.slice(0, 60)}"`);
    if (/\bTODO\b|\bTBD\b|\bFIXME\b|lorem ipsum|XXX/i.test(s)) errors.push(`${path}: placeholder text`);
    const f = FORBIDDEN.exec(s);
    if (f) errors.push(`${path}: forbidden name "${f[0]}"`);
    if (/ {2,}/.test(s)) errors.push(`${path}: double space in "${s.slice(0, 60)}"`);
    if (s !== s.trim()) errors.push(`${path}: leading or trailing space`);
  }
}

function report(errors: string[]) {
  assert.equal(errors.length, 0, `\n${errors.slice(0, 80).join("\n")}${errors.length > 80 ? `\n… ${errors.length - 80} more` : ""}`);
}

// ─── Events ────────────────────────────────────────────────────────────────────────────────────────────────

const BY_ID = new Map<string, EventDef>();
for (const e of ALL_EVENTS) BY_ID.set(e.id, e);

function* outcomesOf(e: EventDef): Generator<[ChoiceDef, Outcome]> {
  for (const c of e.choices) for (const w of c.outcomes) yield [c, w.outcome];
}

const rangeOf = (r: number | [number, number]): [number, number] => (Array.isArray(r) ? r : [r, r]);
const PROFILE_FIELDS = ["partner", "child", "note", "van", "bike"] as const;

/**
 * A twin is the neutral counterpart of a profile event (`requires.noProfile`, e.g. the neighbour's visit for profiles
 * without a child). Exactly one of the pair can come up, so twins don't count toward the pool quotas.
 */
const isTwin = (e: EventDef) => e.requires?.noProfile !== undefined;
/** Events of the extra decks (the Rathaus duo) come on top of the quota and are counted separately. */
const EXTRA_IDS = new Set(EXTRA_DECKS.flatMap((d) => EVENT_DECKS[d].map((e) => e.id)));
const inQuota = (e: EventDef) => !isTwin(e) && !EXTRA_IDS.has(e.id);

function conditionErrors(where: string, c: Condition | undefined, errors: string[]) {
  if (!c) return;
  if (c.dog && c.dog !== "any" && !(DOGS as readonly string[]).includes(c.dog)) errors.push(`${where}: unknown dog ${c.dog}`);
  if (c.souvenir && !(SOUVENIRS as readonly string[]).includes(c.souvenir)) errors.push(`${where}: unknown souvenir ${c.souvenir}`);
  if (c.upgrade && !(UPGRADES as readonly string[]).includes(c.upgrade)) errors.push(`${where}: unknown upgrade ${c.upgrade}`);
  if (c.beerMat && !(BEER_MATS as readonly string[]).includes(c.beerMat)) errors.push(`${where}: unknown beer mat ${c.beerMat}`);
  if (c.vehicle && !(VEHICLES as readonly string[]).includes(c.vehicle)) errors.push(`${where}: unknown vehicle ${c.vehicle}`);
  if (c.region && !(REGIONS as readonly string[]).includes(c.region)) errors.push(`${where}: unknown region ${c.region}`);
  for (const f of [c.profile, c.noProfile]) {
    if (f && !(PROFILE_FIELDS as readonly string[]).includes(f)) errors.push(`${where}: unknown profile field ${f}`);
  }
  if (c.profile && c.profile === c.noProfile) errors.push(`${where}: profile and noProfile contradict`);
  if (c.dogLocked && !(DOGS as readonly string[]).includes(c.dogLocked)) errors.push(`${where}: unknown dog ${c.dogLocked}`);
}

/** Placeholders allowed in a piece of event text, given the event and choice conditions. */
function eventPlaceholderErrors(where: string, text: string, e: EventDef, c: ChoiceDef | undefined, errors: string[]) {
  for (const m of text.matchAll(PLACEHOLDER)) {
    const p = m[1];
    if (["name", "title", "place", "home"].includes(p)) continue;
    if ((PROFILE_FIELDS as readonly string[]).includes(p)) {
      if (e.requires?.profile !== p && c?.req?.profile !== p) errors.push(`${where}: {${p}} needs a profile = "${p}" requirement on the event or choice`);
      continue;
    }
    if (p === "dog") {
      if (!e.requires?.dog && !c?.req?.dog) errors.push(`${where}: {dog} needs a dog requirement on the event or choice`);
      continue;
    }
    const d = /^dog:(.+)$/.exec(p);
    if (d) {
      if (!(DOGS as readonly string[]).includes(d[1])) errors.push(`${where}: unknown dog in {${p}}`);
      continue;
    }
    errors.push(`${where}: placeholder {${p}} not allowed in events`);
  }
}

function sentenceCount(text: string): number {
  return text.split(/[.!?…][“”«»‘’)]*(?:\s+|$)/).filter((s) => s.trim().length > 0).length;
}

if (suite("events")) {
  test("events: ids unique, pools valid, structure", () => {
    const errors: string[] = [];
    const seen = new Set<string>();
    for (const e of ALL_EVENTS) {
      if (seen.has(e.id)) errors.push(`duplicate event id ${e.id}`);
      seen.add(e.id);
    }
    for (const e of CHECKED) {
      const w = e.id;
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.id)) errors.push(`${w}: id not kebab-case`);
      if (!["region", "anywhere", "dog", "bike", "chain"].includes(e.pool)) errors.push(`${w}: pool ${e.pool}`);
      if (e.pool === "region" && !(REGIONS as readonly string[]).includes(e.region ?? "")) errors.push(`${w}: region pool without region`);
      if (e.pool !== "region" && e.pool !== "chain" && e.region) errors.push(`${w}: region set outside the region pool`);
      if (!e.title || e.title.length > 30) errors.push(`${w}: title missing or longer than 30: "${e.title}"`);
      if (!e.art || !(EVENT_ART_IDS as readonly string[]).includes(e.art)) errors.push(`${w}: art "${e.art}" not in the art list`);
      if (e.music && !(MUSIC as readonly string[]).includes(e.music)) errors.push(`${w}: unknown music ${e.music}`);
      if (e.portrait) {
        if (!(CHARACTERS as readonly string[]).includes(e.portrait)) errors.push(`${w}: portrait ${e.portrait} is no character`);
        else {
          const n = CHARACTER_DEFS[e.portrait as CharacterId].name;
          const cap = n.charAt(0).toUpperCase() + n.slice(1);
          if (e.speaker !== n && e.speaker !== cap) errors.push(`${w}: speaker "${e.speaker}" should be "${cap}"`);
        }
      }
      if (e.text.length > 430) errors.push(`${w}: text longer than 430 characters (${e.text.length})`);
      const sc = sentenceCount(e.text);
      if (sc < 2 || sc > 6) errors.push(`${w}: text has ${sc} sentences (2–5 wanted)`);
      if (e.choices.length < 2 || e.choices.length > 3) errors.push(`${w}: ${e.choices.length} choices (2–3 wanted)`);
      if (!e.choices.some((c) => !c.req)) errors.push(`${w}: every choice has a requirement (nobody may get stuck)`);
      conditionErrors(`${w}.requires`, e.requires, errors);
      eventPlaceholderErrors(`${w}.text`, e.text, e, undefined, errors);
      eventPlaceholderErrors(`${w}.title`, e.title, e, undefined, errors);
      e.choices.forEach((c, ci) => {
        const cw = `${w}.choices[${ci}]`;
        if (!c.text || c.text.length > 80) errors.push(`${cw}: choice text missing or longer than 80: "${c.text}"`);
        conditionErrors(`${cw}.req`, c.req, errors);
        if (c.blue && !(c.req?.dog || c.req?.souvenir || c.req?.upgrade || c.req?.vehicle || c.req?.beerMat)) {
          errors.push(`${cw}: blue answer without a dog, souvenir, upgrade, vehicle or beer mat requirement`);
        }
        eventPlaceholderErrors(`${cw}.text`, c.text, e, c, errors);
        if (c.outcomes.length === 0) errors.push(`${cw}: no outcomes`);
        c.outcomes.forEach((wo, oi) => {
          const o = wo.outcome;
          const ow = `${cw}.outcomes[${oi}]`;
          if (!o.text) errors.push(`${ow}: outcome without text`);
          else {
            if (o.text.length > 340) errors.push(`${ow}: outcome text longer than 340 (${o.text.length})`);
            eventPlaceholderErrors(`${ow}.text`, o.text, e, c, errors);
          }
          if (o.chronicle) {
            if (o.chronicle.length > 100) errors.push(`${ow}: chronicle longer than 100`);
            eventPlaceholderErrors(`${ow}.chronicle`, o.chronicle, e, c, errors);
          }
          if (o.fuel !== undefined) {
            const [a, b] = rangeOf(o.fuel);
            if (a < -2 || b > 2 || a > b) errors.push(`${ow}: fuel ${o.fuel} outside −2…+2`);
          }
          if (o.marks !== undefined) {
            const [a, b] = rangeOf(o.marks);
            if (a < -6 || b > 6 || a > b) errors.push(`${ow}: marks ${o.marks} outside −6…+6`);
            if (b < 0 && !(c.req?.marks !== undefined && c.req.marks >= -a)) {
              errors.push(`${ow}: costs ${-a} Mark but the choice has no req.marks ≥ ${-a}`);
            }
          }
          if (o.souvenir && o.souvenir !== "random" && !(SOUVENIRS as readonly string[]).includes(o.souvenir)) errors.push(`${ow}: unknown souvenir ${o.souvenir}`);
          if (o.beerMat && o.beerMat !== "random" && !(BEER_MATS as readonly string[]).includes(o.beerMat)) errors.push(`${ow}: unknown beer mat ${o.beerMat}`);
          if (o.upgrade && !(UPGRADES as readonly string[]).includes(o.upgrade)) errors.push(`${ow}: unknown upgrade ${o.upgrade}`);
          for (const d of [o.dog, o.dogLeaves, o.unlockDog]) {
            if (d && !(DOGS as readonly string[]).includes(d)) errors.push(`${ow}: unknown dog ${d}`);
          }
          if (o.puzzle && !["problem", "chess", "sudoku"].includes(o.puzzle)) errors.push(`${ow}: unknown puzzle ${o.puzzle}`);
          if (o.skat) {
            const [a, b] = o.skat.opponents;
            for (const id of o.skat.opponents) {
              if (!(CHARACTERS as readonly string[]).includes(id)) errors.push(`${ow}: unknown character ${id}`);
            }
            if (a === b) errors.push(`${ow}: the same opponent twice`);
            if (o.skat.houseRule && !(HOUSE_RULES as readonly string[]).includes(o.skat.houseRule)) errors.push(`${ow}: unknown house rule ${o.skat.houseRule}`);
            if (o.skat.stakes && !["small", "medium", "high"].includes(o.skat.stakes)) errors.push(`${ow}: unknown stakes ${o.skat.stakes}`);
            if (o.skat.games !== undefined && (o.skat.games < 1 || o.skat.games > 9)) errors.push(`${ow}: games ${o.skat.games}`);
            for (const t of [o.skat.onWin, o.skat.onLose]) {
              if (t && BY_ID.get(t)?.pool !== "chain") errors.push(`${ow}: skat continuation ${t} is no chain event`);
            }
            if (o.skat.intro) eventPlaceholderErrors(`${ow}.skat.intro`, o.skat.intro, e, c, errors);
          }
          if (o.next && BY_ID.get(o.next)?.pool !== "chain") errors.push(`${ow}: next ${o.next} is missing or no chain event`);
          for (const f of [...(o.flags ?? []), ...(o.clearFlags ?? [])]) {
            if (!(f in ALL_FLAGS)) errors.push(`${ow}: flag ${f} is not documented in a *_FLAGS export`);
          }
        });
      });
      for (const f of [e.requires?.flag, e.requires?.notFlag, ...e.choices.flatMap((c) => [c.req?.flag, c.req?.notFlag])]) {
        if (f && !(f in ALL_FLAGS)) errors.push(`${w}: flag ${f} is not documented in a *_FLAGS export`);
      }
      checkStrings(w, e, errors);
    }
    report(errors);
  });

  test("events: quotas per pool (contract §4.10: 108 = 4 × 16 + 20 + 12 + 12)", { skip: PARTIAL }, () => {
    const count = (f: (e: EventDef) => boolean) => ALL_EVENTS.filter(f).length;
    for (const r of REGIONS) assert.equal(count((e) => inQuota(e) && e.pool === "region" && e.region === r), 16, `region ${r}`);
    assert.equal(count((e) => inQuota(e) && e.pool === "anywhere"), 20, "anywhere");
    assert.equal(count((e) => inQuota(e) && e.pool === "dog"), 12, "dog");
    assert.equal(count((e) => inQuota(e) && e.pool === "bike"), 12, "bike");
    assert.equal(count((e) => inQuota(e) && e.pool !== "chain"), 108, "drawn events");
    // The Rathaus deck: four events with the duo, one of them a Skat round against both.
    assert.equal(EVENT_DECKS.rathaus.filter((e) => e.pool === "anywhere").length, 4, "rathaus");
    assert.ok(EVENT_DECKS.rathaus.some((e) => e.choices.some((c) => c.outcomes.some((w) => {
      const o: string[] = w.outcome.skat?.opponents ?? [];
      return o.includes("schultes") && o.includes("amtsbote");
    }))), "a Skat round against the duo");
    // Every twin has its profile event in the same pool.
    for (const t of ALL_EVENTS.filter(isTwin)) {
      const f = t.requires!.noProfile;
      assert.ok(ALL_EVENTS.some((e) => e.pool === t.pool && e.region === t.region && e.requires?.profile === f), `twin ${t.id} without a profile event`);
    }
    // The deck files hold their own pool.
    for (const r of REGIONS) assert.ok(EVENT_DECKS[r].every((e) => e.pool === "chain" || (e.pool === "region" && e.region === r)), r);
    assert.ok(EVENT_DECKS.anywhere.every((e) => e.pool === "anywhere" || e.pool === "chain"));
    assert.ok(EVENT_DECKS.rathaus.every((e) => e.pool === "anywhere" || e.pool === "chain"));
    assert.ok(EVENT_DECKS.dogs.every((e) => e.pool === "dog" || e.pool === "chain"));
    assert.ok(EVENT_DECKS.bike.every((e) => e.pool === "bike" || e.pool === "chain"));
  });

  test("events: chains are reachable, flags are closed, beer mats stay rare", { skip: PARTIAL }, () => {
    const errors: string[] = [];
    const targets = new Set<string>();
    const set = new Set<string>();
    let beerMats = 0;
    for (const e of ALL_EVENTS) {
      for (const [, o] of outcomesOf(e)) {
        if (o.next) targets.add(o.next);
        if (o.skat?.onWin) targets.add(o.skat.onWin);
        if (o.skat?.onLose) targets.add(o.skat.onLose);
        for (const f of o.flags ?? []) set.add(f);
        if (o.beerMat) beerMats++;
      }
    }
    for (const e of ALL_EVENTS) if (e.pool === "chain" && !targets.has(e.id)) errors.push(`${e.id}: chain event nobody leads to`);
    for (const e of ALL_EVENTS) {
      for (const f of [e.requires?.flag, ...e.choices.map((c) => c.req?.flag)]) {
        if (f && !set.has(f)) errors.push(`${e.id}: reads flag ${f} that no outcome sets`);
      }
    }
    for (const f of Object.keys(ALL_FLAGS)) {
      const used = ALL_EVENTS.some((e) => JSON.stringify(e).includes(`"${f}"`));
      if (!used) errors.push(`flag ${f} documented but never used`);
    }
    if (beerMats > 8) errors.push(`${beerMats} outcomes give a beer mat (at most 8: beer mats are rare)`);
    for (const [name, deck] of Object.entries(EVENT_DECKS)) {
      const n = deck.reduce((s, e) => s + [...outcomesOf(e)].filter(([, o]) => o.beerMat).length, 0);
      if (n > 2) errors.push(`${name}: ${n} beer mats (at most 2 per deck)`);
    }
    report(errors);
  });

  test("events: the contract examples exist and do what they promise", { skip: PARTIAL }, () => {
    for (const id of REQUIRED_EVENT_IDS) assert.ok(BY_ID.has(id), `missing ${id}`);
    const ev = (id: string) => BY_ID.get(id)!;
    const outs = (id: string) => [...outcomesOf(ev(id))].map(([, o]) => o);
    assert.equal(ev("any-werkstor").requires?.profile, "note");
    assert.ok(ev("any-werkstor").text.includes("{note}"));
    assert.equal(ev("dog-besuch").requires?.profile, "child");
    assert.ok(outs("dog-besuch").some((o) => o.unlockDog === "schnauzer-b"));
    // The neutral profile can unlock schnauzer-b too; unlock starters stop once the dog is unlocked.
    assert.equal(ev("dog-nachbarin").requires?.noProfile, "child");
    assert.ok(outs("dog-nachbarin").every((o) => o.unlockDog === "schnauzer-b"));
    assert.equal(ev("dog-besuch").requires?.dogLocked, "schnauzer-b");
    assert.equal(ev("dog-nachbarin").requires?.dogLocked, "schnauzer-b");
    assert.equal(ev("dog-tierschutz").requires?.dogLocked, "wolfhound-a");
    for (const e of ALL_EVENTS) {
      if (e.pool === "chain") continue;
      for (const o of outs(e.id)) if (o.unlockDog) assert.equal(e.requires?.dogLocked, o.unlockDog, `${e.id} unlocks ${o.unlockDog} without dogLocked`);
    }
    assert.ok(outs("chain-ungarn-tierheim").some((o) => o.unlockDog === "wolfhound-a"));
    assert.ok(ev("mue-schafherde").choices.some((c) => c.blue && c.req?.dog === "shepherd"));
    assert.ok(outs("any-hocketse").some((o) => o.skat));
    assert.ok(outs("any-kontrolle").some((o) => o.skat && o.skat.opponents.includes("wachtmeister") && o.skat.opponents.includes("anwaerter")));
    assert.ok(outs("any-tramper").some((o) => o.puzzle === "chess"));
    assert.ok(outs("any-regen").some((o) => o.puzzle === "sudoku"));
    assert.ok(ev("enz-falsches-vaihingen").choices.some((c) => c.req?.souvenir === "road-atlas"));
  });

  test("events: art list covered and requested", { skip: PARTIAL }, () => {
    const used = new Set(ALL_EVENTS.map((e) => e.art));
    const missing = EVENT_ART_IDS.filter((a) => !used.has(a));
    assert.deepEqual(missing, [], "art ids nobody uses");
    assert.equal(EVENT_ART_IDS.length, 40);
    const doc = readFileSync(new URL("../../docs/art-requests.md", import.meta.url), "utf8");
    const notListed = EVENT_ART_IDS.filter((a) => !doc.includes(`events/${a}`));
    assert.deepEqual(notListed, [], "art ids missing in docs/art-requests.md");
  });
}

// ─── Speech ────────────────────────────────────────────────────────────────────────────────────────────────

const ALL_SITUATIONS: SpeechSituation[] = [
  "greet", "bid", "pass", "declare", "trickWon", "trickLost", "gameWon", "gameLost", "ramsch", "order", "farewell",
  "kontra", "tell", "blunder", "robbed", "selfBlame", "tease",
];
/** The scolding situations (contract §0.9, §16.12). */
const SCOLDING: SpeechSituation[] = ["blunder", "robbed", "selfBlame", "tease"];
/** The village duo speaks as much as a regular. */
const DUO: CharacterId[] = ["schultes", "amtsbote"];

function wantedSituations(id: CharacterId): SpeechSituation[] {
  const fav = (FAVOURITES as readonly string[]).includes(id);
  return ALL_SITUATIONS.filter((s) => {
    if (s === "tell") return id === "schwaetzer";
    if (fav && s === "order") return false;
    return true;
  });
}

if (suite("speech")) {
  test("speech: every character speaks in every situation, in the wanted amount", () => {
    const errors: string[] = [];
    for (const id of CHARACTERS) {
      const book = SPEECH[id];
      if (!book) {
        errors.push(`${id}: no speech`);
        continue;
      }
      const wanted = wantedSituations(id);
      const regular = (REGULARS as readonly string[]).includes(id) || DUO.includes(id);
      for (const s of wanted) {
        const lines = book[s] ?? [];
        if (s === "tell") continue;
        const [min, max] = !regular ? [2, 3] : SCOLDING.includes(s) ? [3, 5] : [3, 6];
        if (lines.length < min || lines.length > max) errors.push(`${id}.${s}: ${lines.length} lines (${min}–${max} wanted)`);
      }
      for (const s of Object.keys(book) as SpeechSituation[]) {
        if (!wanted.includes(s)) errors.push(`${id}.${s}: not wanted (favourites don’t drink, only Sigi has tells)`);
      }
    }
    report(errors);
  });

  test("speech: line length, placeholders, glyphs, no duplicates", () => {
    const errors: string[] = [];
    const seen = new Map<string, string>();
    for (const [id, book] of Object.entries(SPEECH)) {
      for (const [s, lines] of Object.entries(book ?? {})) {
        for (const line of lines ?? []) {
          const w = `${id}.${s}: "${line}"`;
          if (line.length > 110) errors.push(`${w}: longer than 110 characters`);
          for (const m of line.matchAll(PLACEHOLDER)) {
            const ok = m[1] === "name" || m[1] === "title" || (s === "tell" && (m[1] === "suit" || m[1] === "hint"))
              || (m[1] === "target" && (TARGET_SITUATIONS as readonly string[]).includes(s));
            if (!ok) errors.push(`${w}: placeholder {${m[1]}} not allowed`);
          }
          if (line.includes("{target}")) {
            // Only as a vocative at the start or the end, so the line still reads well without it.
            if (!/^\{target\}, /.test(line) && !/, \{target\}[.!?…“]*$/.test(line)) errors.push(`${w}: {target} must open („{target}, …“) or close („…, {target}!“) the line`);
            if (line.split("{target}").length > 2) errors.push(`${w}: {target} twice`);
            const bare = fillTarget(line);
            if (/[{}]|^[,.!?]|\s[,.!?]/.test(bare)) errors.push(`${w}: reads badly without a target: "${bare}"`);
          }
          const key = line.toLowerCase();
          if (seen.has(key)) errors.push(`${w}: duplicate of ${seen.get(key)}`);
          seen.set(key, `${id}.${s}`);
        }
      }
      checkStrings(`speech.${id}`, book, errors);
    }
    report(errors);
  });

  test("speech: Schwätzer-Sigi’s tells", () => {
    const errors: string[] = [];
    for (const l of SIGI_TELLS.long) if (!l.includes("{suit}") || l.includes("{hint}")) errors.push(`long: "${l}" needs {suit} only`);
    for (const l of SIGI_TELLS.void) if (!l.includes("{suit}") || l.includes("{hint}")) errors.push(`void: "${l}" needs {suit} only`);
    for (const l of SIGI_TELLS.hint) if (!l.includes("{hint}") || l.includes("{suit}")) errors.push(`hint: "${l}" needs {hint} only`);
    if (SIGI_TELLS.long.length < 3 || SIGI_TELLS.void.length < 3 || SIGI_TELLS.hint.length < 4) errors.push("too few tells");
    const all = [...SIGI_TELLS.long, ...SIGI_TELLS.void, ...SIGI_TELLS.hint];
    assert.deepEqual(SPEECH.schwaetzer?.tell ?? [], all, "SPEECH.schwaetzer.tell = long + void + hint");
    // Filled in with the longest hint and suit name, the line still fits a bubble.
    const longest = Object.values(TELL_HINTS).reduce((a, h) => (h.text.length > a.length ? h.text : a), "");
    for (const l of all) {
      const filled = l.replace("{suit}", "Schellen").replace("{hint}", longest);
      if (filled.length > 110) errors.push(`"${filled}" longer than 110 when filled`);
    }
    checkStrings("tells", { SIGI_TELLS, TELL_HINTS }, errors);
    report(errors);
  });
}

if (suite("speech")) {
  test("speech: the duo’s exchanges and the {target} helper", () => {
    const errors: string[] = [];
    const n = Object.values(DUO_EXCHANGES).reduce((a, l) => a + (l?.length ?? 0), 0);
    if (n < 8) errors.push(`only ${n} duo exchanges (at least 8)`);
    for (const [s, list] of Object.entries(DUO_EXCHANGES)) {
      if (!(ALL_SITUATIONS as string[]).includes(s)) errors.push(`exchange situation ${s} unknown`);
      for (const ex of list ?? []) {
        for (const l of [ex.schultes, ex.amtsbote]) {
          if (l.length > 110) errors.push(`exchange line longer than 110: ${l}`);
          for (const m of l.matchAll(PLACEHOLDER)) if (!["name", "title"].includes(m[1])) errors.push(`exchange placeholder {${m[1]}}: ${l}`);
        }
      }
    }
    checkStrings("exchanges", DUO_EXCHANGES, errors);
    assert.equal(fillTarget("{target}, du Seggl!", "Karl"), "Karl, du Seggl!");
    assert.equal(fillTarget("{target}, du Seggl!"), "Du Seggl!");
    assert.equal(fillTarget("Des war nix, {target}."), "Des war nix.");
    report(errors);
  });
}

// ─── Characters ────────────────────────────────────────────────────────────────────────────────────────────

if (suite("characters")) {
  test("characters: every id defined with its role and region", () => {
    const errors: string[] = [];
    assert.deepEqual(Object.keys(CHARACTER_DEFS).sort(), [...CHARACTERS].sort());
    const names = new Set<string>();
    for (const id of CHARACTERS) {
      const c = CHARACTER_DEFS[id];
      if (c.id !== id) errors.push(`${id}: id field ${c.id}`);
      const role = (REGULARS as readonly string[]).includes(id) ? "regular"
        : (FAVOURITES as readonly string[]).includes(id) ? "favourite" : "side";
      if (c.role !== role) errors.push(`${id}: role ${c.role}, expected ${role}`);
      if (role === "favourite") {
        const r = REGIONS.find((r) => (FAVOURITES_BY_REGION[r] as readonly string[]).includes(id));
        if (c.region !== r) errors.push(`${id}: region ${c.region}, expected ${r}`);
      }
      if (names.has(c.name)) errors.push(`${id}: duplicate name ${c.name}`);
      names.add(c.name);
      for (const s of [c.style, c.habit]) if (!/[.!][“”]?$/.test(s)) errors.push(`${id}: sentence without full stop: ${s}`);
    }
    assert.equal(SIDE_CHARACTERS.length, 8);
    checkStrings("characters", CHARACTER_DEFS, errors);
    report(errors);
  });
}

// ─── Help and fixed texts ──────────────────────────────────────────────────────────────────────────────────

if (suite("help")) {
  test("help: pages, house rules, Spielwert examples add up", () => {
    const errors: string[] = [];
    const ids = HELP.HELP_PAGES.map((p) => p.id);
    for (const id of ["controls", "house-rules", "game-value", "list", "tour", "stations", "fuel", "collection"] as const) {
      if (!ids.includes(id)) errors.push(`help page ${id} missing`);
    }
    for (const p of HELP.HELP_PAGES) {
      if (!p.title || p.paragraphs.length < 2) errors.push(`help ${p.id}: needs a title and paragraphs`);
      for (const para of p.paragraphs) if (para.length > 320) errors.push(`help ${p.id}: paragraph longer than 320: ${para.slice(0, 50)}`);
    }
    assert.deepEqual(Object.keys(HELP.HOUSE_RULE_TEXTS).sort(), [...HOUSE_RULES].sort(), "a text for every house rule");
    for (const ex of HELP.GAME_VALUE.examples) {
      const plain = ex.base * ex.levels;
      const counted = "overbidTo" in ex && ex.overbidTo ? ex.overbidTo : plain;
      const want = "lost" in ex && ex.lost ? -2 * counted : counted;
      if (want !== ex.value) errors.push(`Spielwert example "${ex.game}": ${ex.value}, computed ${want}`);
      if ("overbidTo" in ex && ex.overbidTo && (ex.overbidTo % ex.base !== 0 || ex.overbidTo <= plain)) errors.push(`"${ex.game}": overbid value`);
    }
    for (const ex of HELP.LIST_RULES.examples) {
      const want = ex.won ? ex.value + HELP.LIST_RULES.wonBonus : HELP.LIST_RULES.lostFactor * ex.value + HELP.LIST_RULES.lostMalus;
      if (want !== ex.list) errors.push(`list example "${ex.text}": ${ex.list}, computed ${want}`);
    }
    const bases = Object.fromEntries(HELP.GAME_VALUE.bases.map((b) => [b.kind, b.base]));
    assert.deepEqual(bases, { diamonds: 9, hearts: 10, spades: 11, clubs: 12, grand: 24 });
    assert.deepEqual(HELP.GAME_VALUE.nulls.map((n) => n.value), [23, 35, 46, 59]);
    checkStrings("help", HELP, errors);
    for (const [path, str] of (() => { const o: [string, string][] = []; stringsIn(HELP, "help", o); return o; })()) {
      for (const m of str.matchAll(PLACEHOLDER)) errors.push(`${path}: placeholder {${m[1]}} in help`);
    }
    report(errors);
  });
}

/** Placeholders the fixed texts may use (see the header of texts.ts). */
const TEXT_PLACEHOLDERS = new Set(["name", "title", "place", "home", "inn", "region", "pot", "item", "price", "partner", "rank", "count"]);

if (suite("texts")) {
  test("texts: groups filled, placeholders, glyphs", () => {
    const errors: string[] = [];
    const all: [string, string][] = [];
    stringsIn(TEXTS, "texts", all);
    for (const [path, str] of all) {
      for (const m of str.matchAll(PLACEHOLDER)) {
        if (!TEXT_PLACEHOLDERS.has(m[1])) errors.push(`${path}: placeholder {${m[1]}} not allowed`);
        if (m[1] === "partner" && !/^texts\.KITCHEN\.(speaker|partnerGoodbye|partnerWelcome)/.test(path)) errors.push(`${path}: {partner} outside the partner lines`);
      }
    }
    for (const r of REGIONS) {
      const t = TEXTS.TOURNAMENT_LINES[r];
      if (!t || !t.intro.length || !t.win.length || !t.second.length || !t.third.length) errors.push(`tournament lines for ${r}`);
      if (!TEXTS.REGION_BLURBS[r]) errors.push(`region blurb for ${r}`);
      if (!TEXTS.PITCH_LINES.byRegion[r]?.length) errors.push(`pitch lines for ${r}`);
    }
    if (!TEXTS.INN_RESULT_LINES.third.includes("Du bleibst trocken und fährst die anderen heim.")) errors.push("the third-place line");
    assert.deepEqual(TEXTS.RANKS.map((r) => r.name), ["Lehrling", "Geselle", "Meister", "Altmeister"]);
    for (const [k, v] of Object.entries({
      partnerGoodbye: TEXTS.KITCHEN.partnerGoodbye, partnerWelcome: TEXTS.KITCHEN.partnerWelcome, ambience: TEXTS.KITCHEN.ambience,
      dogMeadow: TEXTS.DOG_MEADOW_LINES, market: TEXTS.MARKET_LINES.greet, garage: TEXTS.GARAGE_LINES.banter,
      tow: TEXTS.TOW_LINES.lines, credits: TEXTS.CREDITS, innNames: TEXTS.INN_NAMES, homeEmpty: TEXTS.HOMECOMING_LINES.empty,
    })) if (!v.length) errors.push(`${k} is empty`);
    for (const [room, def] of Object.entries(TEXTS.INN_ROOMS)) if (!def.names.length || !def.intro.length) errors.push(`inn room ${room}`);
    for (const pair of TEXTS.GARAGE_LINES.banter) if (pair.meister.length > 110 || pair.lehrling.length > 110) errors.push(`garage bubble too long: ${pair.meister}`);
    assert.equal(TEXTS.fillText("Grüß Gott, {name}. {x}", { name: "Karl" }), "Grüß Gott, Karl. {x}");
    checkStrings("texts", TEXTS, errors);
    report(errors);
  });
}
