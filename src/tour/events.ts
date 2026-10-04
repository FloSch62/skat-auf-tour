// Event runtime (contract §4.10), modelled on TTL's: picking an event for a station (pools region / anywhere / dog /
// bike, weights, `requires`, no repeats within a tour, `once` events never again), conditions, the choice list with
// blue answers, weighted outcome rolls, applying every Outcome field to the tour, placeholders. The event list
// always comes in through env.events (no import of src/content). Pure module.
import type { ChoiceDef, Condition, EventDef, EventPool, Outcome, Profile, ProfileField, Range, TourState } from "../game/types.ts";
import type { BeerMatId, DogId, RegionId, SouvenirId, VehicleId } from "../game/ids.ts";
import { BEER_MATS, SOUVENIRS } from "../game/ids.ts";
import type { Rng } from "../core/rng.ts";
import { DOG_DEFS, dogName } from "../data/dogs.ts";
import { SOUVENIR_DEFS } from "../data/souvenirs.ts";
import { BEER_MAT_DEFS } from "../data/beerMats.ts";
import { UPGRADE_DEFS } from "../data/upgrades.ts";
import { VEHICLE_DEFS, VEHICLE_RULES } from "../data/vehicles.ts";
import { addChronicle, collectSouvenir, rememberOnceEvent, speechTitle, unlockDog } from "./book.ts";
import { BEER_MAT_SLOTS, addMarks, dogSlots, gainFuel, log, loseFuel, souvenirSlots } from "./ledger.ts";
import {
  currentNode, currentRegion, findPlace, findRegion, fuelWord, hasDog, hasFlag, markWord, placeName, rngFor, today,
  type TourEnv,
} from "./util.ts";

// ─── conditions ───────────────────────────────────────────────────────────────────────────────────────────

export interface CheckResult {
  ok: boolean;
  /** German reason shown on a disabled answer. */
  reason?: string;
}

function profileHas(profile: Profile, what: ProfileField, place: string): boolean {
  if (what === "note") return !!profile.notes?.[place]?.trim();
  return !!profile[what]?.trim();
}

/** A dog counts as locked when it is not in the Tourenbuch (without a book: everything but the shepherd). */
function dogIsLocked(book: TourEnv["book"], id: DogId): boolean {
  if (id === "shepherd") return false;
  return !book || !book.dogs.includes(id);
}

export function checkCondition(tour: TourState, env: TourEnv, c: Condition | undefined): CheckResult {
  if (!c) return { ok: true };
  if (c.dog === "any" && tour.dogs.length === 0) return { ok: false, reason: "Nur mit Hund" };
  if (c.dog && c.dog !== "any" && !hasDog(tour, c.dog)) return { ok: false, reason: `Nur mit dem ${DOG_DEFS[c.dog].breed}` };
  if (c.souvenir && !tour.souvenirs.includes(c.souvenir)) return { ok: false, reason: `Nur mit ${SOUVENIR_DEFS[c.souvenir].name}` };
  if (c.upgrade && !tour.upgrades.includes(c.upgrade)) return { ok: false, reason: `Nur mit ${UPGRADE_DEFS[c.upgrade].name}` };
  if (c.beerMat && !tour.beerMats.includes(c.beerMat)) return { ok: false, reason: `Nur mit dem Bierdeckel ${BEER_MAT_DEFS[c.beerMat].name}` };
  if (c.vehicle && tour.vehicle !== c.vehicle) return { ok: false, reason: `Nur mit ${VEHICLE_DEFS[c.vehicle].name}` };
  if (c.marks !== undefined && tour.marks < c.marks) return { ok: false, reason: `Braucht ${c.marks} Mark` };
  if (c.fuel !== undefined && tour.fuel < c.fuel) return { ok: false, reason: `Braucht ${c.fuel === 1 ? "einen Strich" : `${c.fuel} Striche`} Sprit` };
  if (c.fuelAtMost !== undefined && tour.fuel > c.fuelAtMost) return { ok: false, reason: "Der Tank ist noch zu voll" };
  if (c.flag && !hasFlag(tour, c.flag)) return { ok: false, reason: "Geht gerade nicht" };
  if (c.notFlag && hasFlag(tour, c.notFlag)) return { ok: false, reason: "Geht gerade nicht" };
  if (c.region && currentRegion(tour) !== c.region) {
    return { ok: false, reason: `Nur in ${findRegion(env.pack, c.region)?.title ?? c.region}` };
  }
  if (c.profile && !profileHas(env.profile, c.profile, currentNode(tour).place)) return { ok: false, reason: "Geht gerade nicht" };
  if (c.noProfile && profileHas(env.profile, c.noProfile, currentNode(tour).place)) return { ok: false, reason: "Geht gerade nicht" };
  if (c.dogLocked && !dogIsLocked(env.book, c.dogLocked)) return { ok: false, reason: "Geht gerade nicht" };
  if (c.dogSlot && tour.dogs.length >= dogSlots(tour)) return { ok: false, reason: "Kein Platz für noch einen Hund" };
  return { ok: true };
}

/** The blue-answer label, e.g. "[Schäferhund]", "[Thermoskanne]", "[Zusatztank]", "[5 Mark]". */
export function reqLabel(c: Condition | undefined, profile?: Profile): string {
  if (!c) return "";
  const parts: string[] = [];
  if (c.dog === "any") parts.push("Hund");
  else if (c.dog) parts.push(profile ? dogName(profile, c.dog) : DOG_DEFS[c.dog].breed);
  if (c.souvenir) parts.push(SOUVENIR_DEFS[c.souvenir].name);
  if (c.upgrade) parts.push(UPGRADE_DEFS[c.upgrade].name);
  if (c.beerMat) parts.push(BEER_MAT_DEFS[c.beerMat].name);
  if (c.vehicle) parts.push(VEHICLE_DEFS[c.vehicle].name);
  if (!parts.length && c.marks !== undefined) parts.push(`${c.marks} Mark`);
  if (!parts.length && c.fuel !== undefined) parts.push(`${c.fuel} Sprit`);
  return parts.length ? `[${parts.join(", ")}]` : "";
}

// ─── placeholders ─────────────────────────────────────────────────────────────────────────────────────────

/** Fallbacks for empty profile fields (events that need them should require `profile: "partner"` etc.). */
export const PLACEHOLDER_FALLBACK = {
  name: "Kamerad",
  partner: "die Familie",
  child: "der Nachwuchs",
  van: "das Wohnmobil",
  bike: "die Maschine",
  dog: "der Hund",
  note: "",
} as const;

export interface FillCtx {
  /** The dog meant by {dog} (the event's or answer's required dog); else the first travelling dog. */
  dog?: DogId;
}

const PLACEHOLDER_RE = /\{(name|title|partner|child|van|bike|dog|place|home|note|dog:[a-z-]+)\}/g;

/**
 * Fill {name} {title} {partner} {child} {van} {bike} {dog} {dog:<id>} {place} {home} {note}. {dog} is the dog of the
 * answer's or the event's `req.dog` (with "any": the first travelling dog); {dog:<id>} is that dog's profile name even
 * when it is not travelling. Other braces (font markup like {gold}…{/} or {icon:x}) stay untouched.
 */
export function fill(text: string, tour: TourState, env: TourEnv, ctx: FillCtx = {}): string {
  const p = env.profile;
  const node = currentNode(tour);
  return text.replace(PLACEHOLDER_RE, (_m, key: string) => {
    if (key.startsWith("dog:")) {
      const id = key.slice(4) as DogId;
      return DOG_DEFS[id] ? dogName(p, id) : _m;
    }
    switch (key) {
      case "name": return env.name?.trim() || PLACEHOLDER_FALLBACK.name;
      case "title": return speechTitle(env.book);
      case "partner": return p.partner?.trim() || PLACEHOLDER_FALLBACK.partner;
      case "child": return p.child?.trim() || PLACEHOLDER_FALLBACK.child;
      case "van": return p.van?.trim() || PLACEHOLDER_FALLBACK.van;
      case "bike": return p.bike?.trim() || PLACEHOLDER_FALLBACK.bike;
      case "dog": {
        const id = ctx.dog ?? tour.dogs[0];
        return id ? dogName(p, id) : PLACEHOLDER_FALLBACK.dog;
      }
      case "place": return placeName(env.pack, node.place);
      case "home": return findPlace(env.pack, p.home)?.name ?? placeName(env.pack, p.home);
      case "note": return p.notes?.[node.place]?.trim() || PLACEHOLDER_FALLBACK.note;
    }
    return _m;
  });
}

// ─── presenting ───────────────────────────────────────────────────────────────────────────────────────────

export interface ChoiceView {
  index: number;
  text: string;
  enabled: boolean;
  /** Highlighted answer unlocked by a dog, souvenir or upgrade. */
  blue: boolean;
  /** "[Schäferhund]" for blue answers. */
  label: string;
  /** Why it is disabled. */
  reason?: string;
  /** Not shown at all. */
  hidden: boolean;
  /** More than one outcome is possible. */
  uncertain: boolean;
}

export interface EventView {
  id: string;
  title: string;
  text: string;
  art?: string;
  portrait?: string;
  speaker?: string;
  music?: string;
  choices: ChoiceView[];
}

function eventDog(def: EventDef): DogId | undefined {
  return def.requires?.dog && def.requires.dog !== "any" ? def.requires.dog : undefined;
}

export function presentEvent(tour: TourState, env: TourEnv, def: EventDef): EventView {
  const dog = eventDog(def);
  const choices: ChoiceView[] = def.choices.map((c, i) => {
    const res = checkCondition(tour, env, c.req);
    const blue = !!c.blue;
    const hideIfUnmet = c.hideIfUnmet ?? blue;
    const cdog = c.req?.dog && c.req.dog !== "any" ? c.req.dog : dog;
    return {
      index: i,
      text: fill(c.text, tour, env, { dog: cdog }),
      enabled: res.ok,
      blue: blue && res.ok,
      label: blue ? reqLabel(c.req, env.profile) : "",
      reason: res.ok ? undefined : res.reason,
      hidden: !res.ok && hideIfUnmet,
      uncertain: c.outcomes.filter((o) => (o.weight ?? 1) > 0).length > 1,
    };
  });
  // Never leave the player without a way on: if nothing can be chosen, the last answer is always possible.
  if (choices.length && !choices.some((c) => c.enabled && !c.hidden)) {
    const last = choices[choices.length - 1];
    last.enabled = true;
    last.hidden = false;
    last.reason = undefined;
  }
  return {
    id: def.id,
    title: fill(def.title, tour, env, { dog }),
    text: fill(def.text, tour, env, { dog }),
    art: def.art,
    portrait: def.portrait,
    speaker: def.speaker ? fill(def.speaker, tour, env, { dog }) : undefined,
    music: def.music,
    choices,
  };
}

// ─── picking ──────────────────────────────────────────────────────────────────────────────────────────────

/** Pool weights for an `event` station (dog events only with a dog aboard; they also require one). */
export const POOL_WEIGHTS: Record<EventPool, number> = { region: 4, anywhere: 4, bike: 1.5, dog: 1.5, chain: 0, tutorial: 0 };

export function eventById(env: Pick<TourEnv, "events">, id: string): EventDef | undefined {
  return env.events.find((e) => e.id === id);
}

/** Events of a pool the tour may see right now (all conditions, no repeats, `once` across tours). */
export function eligibleEvents(tour: TourState, env: TourEnv, pool: EventPool, exclude: ReadonlySet<string> = new Set()): EventDef[] {
  const region = currentRegion(tour);
  const once = env.book?.events ?? [];
  return env.events.filter((e) =>
    e.pool === pool &&
    (pool !== "region" || e.region === region) &&
    !tour.seenEvents.includes(e.id) &&
    !exclude.has(e.id) &&
    !(e.once && once.includes(e.id)) &&
    checkCondition(tour, env, e.requires).ok,
  );
}

/** Event ids pre-rolled on other nodes of the current map (kept free for those stations). */
function reservedOnMap(tour: TourState): Set<string> {
  return new Set(tour.map.nodes.filter((n) => n.event && n.id !== tour.at && !tour.visited.includes(n.id)).map((n) => n.event!));
}

/** Pick an event from the given pools (pool by POOL_WEIGHTS, then event by weight). Deterministic per tour and salt. */
export function pickEvent(tour: TourState, env: TourEnv, pools: readonly EventPool[], salt: string): EventDef | null {
  const rng = rngFor(tour.seed, tour.stage, tour.at, "event", salt, tour.seenEvents.length);
  const reserved = reservedOnMap(tour);
  const lists = pools.map((p) => {
    let l = eligibleEvents(tour, env, p, reserved);
    if (!l.length) l = eligibleEvents(tour, env, p);
    return { pool: p, list: l };
  }).filter((x) => x.list.length > 0);
  if (!lists.length) return null;
  const chosen = lists.length === 1 ? lists[0] : rng.weighted(lists, (x) => POOL_WEIGHTS[x.pool] || 1);
  return rng.weighted(chosen.list, (e) => e.weight ?? 1);
}

/** The pools an `event` station draws from. */
export function stationPools(tour: TourState): EventPool[] {
  return tour.dogs.length ? ["region", "anywhere", "bike", "dog"] : ["region", "anywhere", "bike"];
}

/** What the map generator knows when it pre-rolls events (only static conditions are checked then). */
export interface StaticEventCtx {
  region: RegionId;
  profile: Profile;
  vehicle: VehicleId;
  dogs: readonly DogId[];
  /** Seen in this tour. */
  seen: readonly string[];
  /** `once` events from earlier tours. */
  once: readonly string[];
  /** Dogs unlocked in the Tourenbuch (for `dogLocked`). */
  unlocked?: readonly DogId[];
}

function staticOk(c: Condition | undefined, ctx: StaticEventCtx, place: string): boolean {
  if (!c) return true;
  if (c.region && c.region !== ctx.region) return false;
  if (c.vehicle && c.vehicle !== ctx.vehicle) return false;
  if (c.profile && !profileHas(ctx.profile, c.profile, place)) return false;
  if (c.noProfile && profileHas(ctx.profile, c.noProfile, place)) return false;
  if (c.dogLocked && c.dogLocked !== "shepherd" && (ctx.unlocked ?? []).includes(c.dogLocked)) return false;
  if (c.dog === "any" && !ctx.dogs.length) return false;
  if (c.dog && c.dog !== "any" && !ctx.dogs.includes(c.dog)) return false;
  return true;
}

/**
 * Pre-roll an event for an `event` node at map generation. Only static conditions count here; the station re-picks
 * on arrival when the pre-rolled event no longer fits (e.g. its dog has left).
 */
export function prerollEvent(events: readonly EventDef[], ctx: StaticEventCtx, place: string, rng: Rng, exclude: ReadonlySet<string>): string | undefined {
  const pools: EventPool[] = ctx.dogs.length ? ["region", "anywhere", "bike", "dog"] : ["region", "anywhere", "bike"];
  const lists = pools.map((pool) => ({
    pool,
    list: events.filter((e) =>
      e.pool === pool &&
      (pool !== "region" || e.region === ctx.region) &&
      !ctx.seen.includes(e.id) &&
      !exclude.has(e.id) &&
      !(e.once && ctx.once.includes(e.id)) &&
      staticOk(e.requires, ctx, place),
    ),
  })).filter((x) => x.list.length);
  if (!lists.length) return undefined;
  const chosen = rng.weighted(lists, (x) => POOL_WEIGHTS[x.pool] || 1);
  return rng.weighted(chosen.list, (e) => e.weight ?? 1).id;
}

/** Mark an event as shown: no repeats in this tour, `once` events never again (Tourenbuch). */
export function markSeen(tour: TourState, env: TourEnv, id: string) {
  if (!tour.seenEvents.includes(id)) tour.seenEvents.push(id);
  const def = eventById(env, id);
  if (def?.once && env.book) rememberOnceEvent(env.book, id);
}

// ─── outcomes ─────────────────────────────────────────────────────────────────────────────────────────────

export function rollRange(r: Range, rng: Rng): number {
  if (typeof r === "number") return r;
  const [a, b] = r;
  return rng.int(Math.min(a, b), Math.max(a, b));
}

export function rollOutcome(choice: ChoiceDef, rng: Rng): Outcome {
  const outs = choice.outcomes.filter((o) => (o.weight ?? 1) > 0);
  if (!outs.length) return {};
  return rng.weighted(outs, (o) => o.weight ?? 1).outcome;
}

/** What the screen must do after an outcome. */
export type EventNext =
  | { kind: "event"; id: string }
  /** A special round: build its config with `pendingRoundConfig` (state.ts), then call `finishSpecialRound`. */
  | { kind: "skat"; intro?: string }
  /** A puzzle right now: after it, call `finishPuzzle` (economy.ts). */
  | { kind: "puzzle"; puzzle: "problem" | "chess" | "sudoku" };

export interface EventResult {
  /** Outcome text, placeholders filled. */
  text?: string;
  /** Actual changes. */
  fuel: number;
  marks: number;
  /** German one-liners for what happened ("Andenken: Thermoskanne", "Lumpi fährt mit", "Kühlschrank: …"). */
  notices: string[];
  next?: EventNext;
  /** A souvenir or beer mat that found no free slot: the screen may offer a swap (shops.ts). */
  overflow?: { souvenir?: SouvenirId; beerMat?: BeerMatId };
  /** Dogs newly unlocked in the Tourenbuch. */
  unlocked: DogId[];
  /** The tour ended (empty tank). */
  ended?: TourState["ended"];
  /** The route line written for this outcome. */
  line?: string;
}

/** Apply every field of an outcome to the tour (and the Tourenbuch in env.book). */
export function applyOutcome(tour: TourState, env: TourEnv, o: Outcome, rng: Rng, ctx: FillCtx = {}): EventResult {
  const r: EventResult = { fuel: 0, marks: 0, notices: [], unlocked: [] };
  const fuelBefore = tour.fuel;
  const marksBefore = tour.marks;
  if (o.marks !== undefined) addMarks(tour, rollRange(o.marks, rng));
  if (o.souvenir) {
    const free = SOUVENIRS.filter((s) => !tour.souvenirs.includes(s));
    const id = o.souvenir === "random" ? (free.length ? rng.pick(free) : undefined) : o.souvenir;
    if (id && !tour.souvenirs.includes(id)) {
      if (tour.souvenirs.length < souvenirSlots(tour)) {
        tour.souvenirs.push(id);
        if (env.book) collectSouvenir(env.book, id);
        r.notices.push(`Andenken: ${SOUVENIR_DEFS[id].name}`);
      } else {
        r.overflow = { ...r.overflow, souvenir: id };
        r.notices.push(`${SOUVENIR_DEFS[id].name}: kein Platz mehr, tauschen?`);
      }
    }
  }
  if (o.beerMat) {
    const free = BEER_MATS.filter((m) => !tour.beerMats.includes(m));
    const id = o.beerMat === "random" ? (free.length ? rng.pick(free) : undefined) : o.beerMat;
    if (id && !tour.beerMats.includes(id)) {
      if (tour.beerMats.length < BEER_MAT_SLOTS) {
        tour.beerMats.push(id);
        r.notices.push(`Bierdeckel: ${BEER_MAT_DEFS[id].name}`);
      } else {
        r.overflow = { ...r.overflow, beerMat: id };
        r.notices.push(`Bierdeckel ${BEER_MAT_DEFS[id].name}: kein Platz mehr, tauschen?`);
      }
    }
  }
  if (o.upgrade && !tour.upgrades.includes(o.upgrade)) {
    const allowed = VEHICLE_RULES[tour.vehicle].upgrades;
    if (allowed && !allowed.includes(o.upgrade)) {
      r.notices.push(`${UPGRADE_DEFS[o.upgrade].name}: passt nicht ans ${VEHICLE_DEFS[tour.vehicle].name}`);
    } else {
      tour.upgrades.push(o.upgrade);
      if (o.upgrade === "aux-tank") {
        tour.fuelMax += 2;
        gainFuel(tour, 2);
      }
      r.notices.push(`Ausbau: ${UPGRADE_DEFS[o.upgrade].name}`);
    }
  }
  if (o.dogLeaves && hasDog(tour, o.dogLeaves)) {
    tour.dogs = tour.dogs.filter((d) => d !== o.dogLeaves);
    r.notices.push(`${dogName(env.profile, o.dogLeaves)} bleibt hier`);
  }
  if (o.dog && !hasDog(tour, o.dog)) {
    if (tour.dogs.length < dogSlots(tour)) {
      tour.dogs.push(o.dog);
      r.notices.push(`${dogName(env.profile, o.dog)} fährt mit`);
    } else {
      r.notices.push(`Kein Platz für ${dogName(env.profile, o.dog)}`);
    }
  }
  if (o.unlockDog && env.book && unlockDog(env.book, o.unlockDog)) {
    r.unlocked.push(o.unlockDog);
    r.notices.push(`Im Tourenbuch: ${dogName(env.profile, o.unlockDog)}, der ${DOG_DEFS[o.unlockDog].breed}, darf künftig mitfahren`);
  }
  if (o.flags) for (const f of o.flags) if (!tour.flags.includes(f)) tour.flags.push(f);
  if (o.clearFlags) tour.flags = tour.flags.filter((f) => !o.clearFlags!.includes(f));
  if (o.chronicle && env.book) addChronicle(env.book, fill(o.chronicle, tour, env, ctx), today(env));
  // Fuel last: an empty tank ends the tour, and nothing may follow it.
  if (o.fuel !== undefined) {
    const v = rollRange(o.fuel, rng);
    if (v > 0) gainFuel(tour, v);
    else if (v < 0) {
      const loss = loseFuel(tour, -v, env, "event");
      r.notices.push(...loss.notes);
      if (loss.empty) r.ended = "empty";
    }
  }
  r.fuel = tour.fuel - fuelBefore;
  r.marks = tour.marks - marksBefore;
  if (o.text) r.text = fill(o.text, tour, env, ctx);
  if (!tour.ended) {
    const st = tour.station;
    if (o.skat) {
      if (st) {
        st.special = {
          opponents: o.skat.opponents,
          houseRule: o.skat.houseRule ?? "standard",
          games: o.skat.games ?? 3,
          stakes: o.skat.stakes ?? "small",
          intro: o.skat.intro ? fill(o.skat.intro, tour, env, ctx) : undefined,
          onWin: o.skat.onWin,
          onLose: o.skat.onLose,
        };
      }
      r.next = { kind: "skat", intro: st?.special?.intro };
    } else if (o.puzzle) {
      if (st) st.puzzle = o.puzzle;
      r.next = { kind: "puzzle", puzzle: o.puzzle };
    } else if (o.next && eventById(env, o.next)) {
      r.next = { kind: "event", id: o.next };
    }
  }
  return r;
}

/** "Kehrwoche, Riet: +1 Sprit, –2 Mark, Andenken: Thermoskanne" */
function eventLine(title: string, place: string, r: EventResult): string {
  const parts: string[] = [];
  if (r.fuel) parts.push(fuelWord(r.fuel));
  if (r.marks) parts.push(markWord(r.marks));
  for (const n of r.notices) if (!n.startsWith("Tank leer")) parts.push(n);
  return parts.length ? `${title}, ${place}: ${parts.join(", ")}` : `${title}, ${place}`;
}

/**
 * The player chose answer `index` of the event on screen: roll the outcome, apply it, write the route line, and
 * move the station on to the next event if there is one.
 */
export function resolveChoice(tour: TourState, env: TourEnv, def: EventDef, index: number): EventResult {
  const choice = def.choices[index];
  if (!choice) return { fuel: 0, marks: 0, notices: [], unlocked: [] };
  const rng = rngFor(tour.seed, tour.stage, tour.at, def.id, index, tour.route.length);
  const dog = choice.req?.dog && choice.req.dog !== "any" ? choice.req.dog : eventDog(def);
  const r = applyOutcome(tour, env, rollOutcome(choice, rng), rng, { dog });
  const title = fill(def.title, tour, env, { dog });
  r.line = eventLine(title, placeName(env.pack, currentNode(tour).place), r);
  if (!tour.ended) log(tour, r.line, { kind: "event" });
  const st = tour.station;
  if (st) {
    if (!st.done.includes(`event:${def.id}`)) st.done.push(`event:${def.id}`);
    if (r.next?.kind === "event") {
      st.event = r.next.id;
      markSeen(tour, env, r.next.id);
    } else {
      delete st.event;
    }
  }
  return r;
}

/** Every event id an event refers to (next, onWin, onLose), for content checks. */
export function referencedEvents(def: EventDef): string[] {
  const out: string[] = [];
  for (const c of def.choices) for (const w of c.outcomes) {
    const o = w.outcome;
    if (o.next) out.push(o.next);
    if (o.skat?.onWin) out.push(o.skat.onWin);
    if (o.skat?.onLose) out.push(o.skat.onLose);
  }
  return out;
}

/** Problems in an event list the runtime cannot handle (unknown references, empty choices, duplicate ids). */
export function validateEvents(events: readonly EventDef[]): string[] {
  const errs: string[] = [];
  const ids = new Set<string>();
  for (const e of events) {
    if (ids.has(e.id)) errs.push(`duplicate event id ${e.id}`);
    ids.add(e.id);
  }
  for (const e of events) {
    if (!e.choices.length) errs.push(`${e.id}: no choices`);
    if (e.pool === "region" && !e.region) errs.push(`${e.id}: region pool without region`);
    for (const ref of referencedEvents(e)) if (!ids.has(ref)) errs.push(`${e.id}: unknown event ${ref}`);
    e.choices.forEach((c, i) => {
      if (!c.outcomes.length) errs.push(`${e.id}: choice ${i} has no outcomes`);
    });
  }
  return errs;
}
