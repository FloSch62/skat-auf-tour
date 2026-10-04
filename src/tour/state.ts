// The running tour (contract §4.1, §4.2): a new tour, moving on the stage map (roads and motorcycle detours),
// arriving at a station, what is visible, the phase the screens should show, region choice between stages, the
// guided first trip, and the end conditions (empty tank → "Heimfahrt am Haken", final won → Wanderpokal). The state
// is plain data (saved after every station and every Skat game); every function here mutates it in place. Pure.
import type {
  BookState, EventDef, MapNode, PlacePack, Profile, RoundConfig, RoundProgress, TourState,
} from "../game/types.ts";
import type { DifficultyId, DogId, RegionId, VehicleId } from "../game/ids.ts";
import { DIFFICULTY_DEFS } from "../data/difficulty.ts";
import { REFERENCE_TANK, VEHICLE_DEFS, VEHICLE_RULES } from "../data/vehicles.ts";
import { dogName } from "../data/dogs.ts";
import { availableVehicles, recordTourStart, stampPlace, unlockedDogs } from "./book.ts";
import { dogSlots, endTour, log, loseFuel } from "./ledger.ts";
import { checkCondition, eventById, markSeen, pickEvent, stationPools } from "./events.ts";
import { ECONOMY, arrivePitch, type StationOutcome } from "./economy.ts";
import { generateStage, generateTutorialMap, entryPlace, column, successors, startNode } from "./map.ts";
import { roundConfig, specialRoundConfig, type PerkSettings } from "./perks.ts";
import { rollDogOffer, rollGarageOffer, rollMarketOffer } from "./shops.ts";
import {
  bump, currentNode, currentRegion, dogPower, findRegion, hasDog, hasSouvenir, hasUpgrade, homeRegion, nodeById,
  placeName, rngFor, stageKey, today, usedCount, type TourEnv,
} from "./util.ts";

export const TOUR_VERSION = 1;
export const STAGES = 3;

// ─── a new tour ───────────────────────────────────────────────────────────────────────────────────────────

/** Tank size: the difficulty's tank (6 / 5 / 4) shifted by the vehicle (the rig has one stroke less). */
export function tankSize(difficulty: DifficultyId, vehicle: VehicleId): number {
  return DIFFICULTY_DEFS[difficulty].fuelMax - (REFERENCE_TANK - VEHICLE_DEFS[vehicle].fuelMax);
}

export interface NewTourOptions {
  seed: number;
  difficulty: DifficultyId;
  vehicle: VehicleId;
  /** The dogs he chose at the kitchen table (unlocked ones only; at most the vehicle's seats). */
  dogs: DogId[];
  pack: PlacePack;
  profile: Profile;
  /** The Tourenbuch: checks unlocks, counts the tour as started, stamps home. */
  book?: BookState;
  /** Event definitions for pre-rolling `event` stations (optional; stations pick on arrival otherwise). */
  events?: readonly EventDef[];
  today?: string;
}

function emptyTour(o: { seed: number; difficulty: DifficultyId; vehicle: VehicleId }): Omit<TourState, "map" | "at" | "regions"> {
  const fuelMax = tankSize(o.difficulty, o.vehicle);
  return {
    version: TOUR_VERSION,
    seed: o.seed >>> 0,
    difficulty: o.difficulty,
    vehicle: o.vehicle,
    stage: 0,
    visited: [],
    fuel: fuelMax,
    fuelMax,
    marks: ECONOMY.startMarks,
    dogs: [],
    souvenirs: [],
    beerMats: [],
    upgrades: [],
    flags: [],
    seenEvents: [],
    used: {},
    trophies: [],
    route: [],
    stats: { innRounds: 0, innWins: 0, detours: 0, timesDriver: 0, puzzlesSolved: 0 },
  };
}

export function newTour(o: NewTourOptions): TourState {
  const vehicle: VehicleId = !o.book || availableVehicles(o.book).includes(o.vehicle) ? o.vehicle : "camper";
  const base = emptyTour({ seed: o.seed, difficulty: o.difficulty, vehicle });
  const unlocked = o.book ? unlockedDogs(o.book) : (["shepherd"] as DogId[]);
  const region = homeRegion(o.pack, o.profile);
  const map = generateStage({
    pack: o.pack, region, stage: 0, seed: base.seed, difficulty: o.difficulty, startPlace: o.profile.home,
    events: o.events, profile: o.profile, vehicle, dogs: o.dogs, onceEvents: o.book?.events ?? [],
    unlockedDogs: o.book?.dogs ?? [],
  });
  const tour: TourState = { ...base, regions: [region], map, at: startNode(map).id };
  tour.dogs = [...new Set(o.dogs)].filter((d) => unlocked.includes(d)).slice(0, dogSlots(tour));
  tour.visited = [tour.at];
  if (o.book) {
    recordTourStart(o.book);
    stampPlace(o.book, startNode(map).place, o.today ?? new Date().toISOString().slice(0, 10));
  }
  const r = findRegion(o.pack, region);
  log(tour, `Abfahrt in ${placeName(o.pack, startNode(map).place)}: ${r?.title ?? region}`);
  return tour;
}

/** The guided first trip: four fixed stations (weak inn, kiosk, chess board, pitch), no fuel loss, skippable. */
export function newTutorial(o: { seed: number; pack: PlacePack; profile: Profile; dogs?: DogId[]; book?: BookState; today?: string }): TourState {
  const base = emptyTour({ seed: o.seed, difficulty: "cozy", vehicle: "camper" });
  const region = homeRegion(o.pack, o.profile);
  const map = generateTutorialMap({ pack: o.pack, profile: o.profile, region, seed: base.seed });
  const tour: TourState = { ...base, regions: [region], map, at: startNode(map).id, tutorial: true };
  tour.dogs = (o.dogs ?? ["shepherd"]).slice(0, dogSlots(tour));
  tour.visited = [tour.at];
  if (o.book) stampPlace(o.book, startNode(map).place, o.today ?? new Date().toISOString().slice(0, 10));
  log(tour, `Probefahrt ab ${placeName(o.pack, startNode(map).place)}`);
  return tour;
}

// ─── phases ───────────────────────────────────────────────────────────────────────────────────────────────

export type TourPhase =
  /** Choose the next station on the map. */
  | "map"
  /** A station is open (a round to play, an event to answer, a special round pending). */
  | "station"
  /** The Preisskat of stage 1 or 2 is done: choose the next region (regionChoices / enterStage). */
  | "region"
  /** The tutorial's last station is done: completeTutorial. */
  | "tutorial-done"
  /** The tour is over: Abrechnung. */
  | "ended";

/** Skat stations must be played before driving on; an event must be answered; a special round played. */
export function stationOpen(tour: TourState): boolean {
  const node = currentNode(tour);
  const st = tour.station;
  if (!st || st.node !== node.id) return false;
  if ((node.kind === "inn" || node.kind === "bikers" || node.kind === "tournament") && !st.done.includes("round")) return true;
  if (st.event || st.special) return true;
  if (st.offer?.length && node.kind === "tournament") return true; // the beer mat is still to be chosen
  return false;
}

export function tourPhase(tour: TourState): TourPhase {
  if (tour.ended) return "ended";
  if (stationOpen(tour)) return "station";
  const node = currentNode(tour);
  if (!node.next.length) {
    if (tour.tutorial) return "tutorial-done";
    if (node.kind === "tournament" && tour.station?.done.includes("round")) return tour.stage < STAGES - 1 ? "region" : "ended";
  }
  return "map";
}

/** Pause is offered at every pitch and after every Preisskat (contract §1). */
export function pauseOffered(tour: TourState): boolean {
  const k = currentNode(tour).kind;
  return k === "pitch" || (k === "tournament" && !!tour.station?.done.includes("round"));
}

// ─── moving ───────────────────────────────────────────────────────────────────────────────────────────────

/** Why a detour is free right now (null = it costs fuel). Rig: always; sidecar: first per stage; wolfhound-a: per stage. */
export function freeDetour(tour: TourState): "rig" | "sidecar" | "wolfhound-a" | null {
  if (VEHICLE_RULES[tour.vehicle].detourCost === 0) return "rig";
  if (hasUpgrade(tour, "sidecar") && usedCount(tour, stageKey("sidecar")) === 0) return "sidecar";
  if (hasDog(tour, "wolfhound-a") && usedCount(tour, stageKey("wolfhound-a")) < dogPower(tour)) return "wolfhound-a";
  return null;
}

export function detourCost(tour: TourState): number {
  return freeDetour(tour) ? 0 : VEHICLE_RULES[tour.vehicle].detourCost;
}

/** Stations in the next column reachable by road. */
export function roadTargets(tour: TourState): MapNode[] {
  if (tour.ended || stationOpen(tour)) return [];
  return successors(tour.map, currentNode(tour));
}

/** Stations in the next column without a road from here: a detour with the motorcycle (never empties the tank). */
export function detourTargets(tour: TourState): MapNode[] {
  if (tour.ended || stationOpen(tour) || tour.tutorial) return [];
  const here = currentNode(tour);
  const cost = detourCost(tour);
  if (cost > 0 && tour.fuel <= cost) return [];
  return column(tour.map, here.col + 1).filter((n) => !here.next.includes(n.id));
}

export interface CanMove {
  ok: boolean;
  detour: boolean;
  /** Fuel the move costs (detours only). */
  cost: number;
  free?: "rig" | "sidecar" | "wolfhound-a";
  reason?: string;
}

export function canMove(tour: TourState, id: string): CanMove {
  const no = (reason: string): CanMove => ({ ok: false, detour: false, cost: 0, reason });
  if (tour.ended) return no("Die Tour ist zu Ende");
  if (stationOpen(tour)) return no("Hier ist noch etwas zu tun");
  const here = currentNode(tour);
  const target = nodeById(tour, id);
  if (!target) return no("Unbekannte Station");
  if (target.col !== here.col + 1) return no("Nur in die nächste Spalte");
  if (here.next.includes(id)) return { ok: true, detour: false, cost: 0 };
  if (tour.tutorial) return no("Auf der Probefahrt gibt es keine Abstecher");
  const free = freeDetour(tour);
  const cost = free ? 0 : VEHICLE_RULES[tour.vehicle].detourCost;
  if (cost > 0 && tour.fuel <= cost) return no("Für einen Abstecher reicht der Sprit nicht");
  return { ok: true, detour: true, cost, free: free ?? undefined };
}

export interface Arrival {
  ok: boolean;
  reason?: string;
  node?: MapNode;
  detour?: boolean;
  /** German lines for what happened on the way and on arrival (detour, pitch fuel …). */
  lines: string[];
  /** Pitch: the fuel outcome. */
  pitch?: StationOutcome;
  /** The event on screen at this station (event station, dog meadow). */
  event?: string;
  /** Rolled offer (market, garage, dog meadow). */
  offer?: string[];
  /** A new place stamp in the Tourenbuch. */
  stamp?: boolean;
}

/** Drive to a station in the next column (by road, or as a motorcycle detour), then arrive there. */
export function moveTo(tour: TourState, env: TourEnv, id: string): Arrival {
  const can = canMove(tour, id);
  if (!can.ok) return { ok: false, reason: can.reason, lines: [] };
  const target = nodeById(tour, id)!;
  const lines: string[] = [];
  if (can.detour) {
    const where = placeName(env.pack, target.place);
    if (can.free) {
      if (can.free !== "rig") bump(tour, stageKey(can.free));
      const why = can.free === "rig" ? "mit dem Gespann" : can.free === "sidecar" ? "mit dem Beiwagen" : `${dogName(env.profile, "wolfhound-a")} kennt den Weg`;
      lines.push(`Abstecher mit dem Motorrad nach ${where}, frei (${why})`);
    } else {
      const r = loseFuel(tour, can.cost, env, "detour");
      lines.push(`Abstecher mit dem Motorrad nach ${where}, ${r.lost ? `–${r.lost} Sprit` : "kein Spritverlust"}`, ...r.notes);
    }
    tour.stats.detours++;
    if (env.book) env.book.fun.detours++;
  }
  tour.at = target.id;
  tour.visited.push(target.id);
  tour.station = { node: target.id, done: [] };
  delete tour.round;
  for (const l of lines) log(tour, l);
  const a = arrive(tour, env);
  return { ...a, detour: can.detour, lines: [...lines, ...a.lines] };
}

/** Roll what the station holds (offers, events) and apply arrival effects (pitch fuel). Called by moveTo. */
export function arrive(tour: TourState, env: TourEnv): Arrival {
  const node = currentNode(tour);
  const st = (tour.station ??= { node: node.id, done: [] });
  const out: Arrival = { ok: true, node, lines: [] };
  if (st.done.includes("arrived")) return out;
  st.done.push("arrived");
  if (env.book) out.stamp = stampPlace(env.book, node.place, today(env));
  switch (node.kind) {
    case "pitch":
      out.pitch = arrivePitch(tour, env);
      out.lines.push(...out.pitch.lines);
      break;
    case "market":
      st.offer = rollMarketOffer(tour);
      break;
    case "garage":
      st.offer = rollGarageOffer(tour);
      break;
    case "dogs": {
      st.offer = rollDogOffer(tour, env);
      const ev = pickEvent(tour, env, ["dog"], "meadow");
      if (ev) st.event = ev.id;
      break;
    }
    case "event": {
      const pre = node.event ? eventById(env, node.event) : undefined;
      const ok = pre && !tour.seenEvents.includes(pre.id) && checkCondition(tour, env, pre.requires).ok;
      const ev = ok ? pre : pickEvent(tour, env, stationPools(tour), "station");
      if (ev) st.event = ev.id;
      else {
        const line = `Unterwegs in ${placeName(env.pack, node.place)}: nichts los, schöne Fahrt`;
        log(tour, line);
        out.lines.push(line);
      }
      break;
    }
  }
  if (st.event) {
    markSeen(tour, env, st.event);
    out.event = st.event;
  }
  out.offer = st.offer;
  return out;
}

// ─── visibility (contract §4.2) ───────────────────────────────────────────────────────────────────────────

export type NodeState = "visited" | "here" | "road" | "detour" | "ahead" | "passed";

export interface NodeView {
  node: MapNode;
  state: NodeState;
  /** Inn details (house rule, regulars, stakes) may be shown: directly reachable, visited, or the road atlas. */
  revealed: boolean;
}

/** Every node with its state and whether its inn details are visible. */
export function mapView(tour: TourState): NodeView[] {
  const here = currentNode(tour);
  const road = new Set(roadTargets(tour).map((n) => n.id));
  const detour = new Set(detourTargets(tour).map((n) => n.id));
  // The road atlas shows one column further: nodes two road steps ahead.
  const atlas = new Set<string>();
  if (hasSouvenir(tour, "road-atlas")) for (const n of successors(tour.map, here)) for (const m of successors(tour.map, n)) atlas.add(m.id);
  return tour.map.nodes.map((n) => {
    let state: NodeState;
    if (n.id === here.id) state = "here";
    else if (tour.visited.includes(n.id)) state = "visited";
    else if (road.has(n.id)) state = "road";
    else if (detour.has(n.id)) state = "detour";
    else if (n.col > here.col) state = "ahead";
    else state = "passed";
    const revealed = state === "here" || state === "visited" || state === "road" || state === "detour" || atlas.has(n.id) || n.kind === "tournament";
    return { node: n, state, revealed };
  });
}

// ─── rounds ───────────────────────────────────────────────────────────────────────────────────────────────

/** The round the station wants played now: a special round from an event, or the station's own round. */
export function pendingRoundConfig(tour: TourState, settings: PerkSettings, env?: Pick<TourEnv, "pack">): RoundConfig | null {
  const node = currentNode(tour);
  const st = tour.station;
  if (st?.special) {
    const where = env ? placeName(env.pack, node.place) : node.place;
    return specialRoundConfig(tour, st.special, settings, `Sonderrunde in ${where}`);
  }
  if ((node.kind === "inn" || node.kind === "bikers" || node.kind === "tournament") && !st?.done.includes("round")) {
    return roundConfig(tour, node, settings, env);
  }
  return null;
}

/** Start (or restart) the round in progress; the Skat table updates it after every game. */
export function beginRound(tour: TourState, config: RoundConfig): RoundProgress {
  if (tour.round && tour.round.config.seed === config.seed) return tour.round;
  tour.round = { config, games: [], list: [0, 0, 0], kitty: 0, kittyPaid: 0, used: {} };
  return tour.round;
}

// ─── stages ───────────────────────────────────────────────────────────────────────────────────────────────

/** After the Preisskat of stage 1 and 2: two of the remaining regions (the home region is always stage 1). */
export function regionChoices(tour: TourState, pack: PlacePack): RegionId[] {
  const left = pack.regions.map((r) => r.id).filter((id) => !tour.regions.includes(id));
  if (left.length <= 2) return left;
  const rng = rngFor(tour.seed, "regions", tour.stage);
  return rng.shuffle(left.slice()).slice(0, 2).sort((a, b) => left.indexOf(a) - left.indexOf(b));
}

/** Drive on into the chosen region: stage + 1, a new map, per-stage counters reset, the guest schnauzer-b heads home. */
export function enterStage(tour: TourState, env: TourEnv, region: RegionId): { ok: boolean; reason?: string; lines: string[] } {
  if (tourPhase(tour) !== "region") return { ok: false, reason: "Erst den Preisskat spielen", lines: [] };
  if (!regionChoices(tour, env.pack).includes(region)) return { ok: false, reason: "Diese Region steht nicht zur Wahl", lines: [] };
  const lines: string[] = [];
  if (hasDog(tour, "schnauzer-b")) {
    tour.dogs = tour.dogs.filter((d) => d !== "schnauzer-b");
    lines.push(`${dogName(env.profile, "schnauzer-b")} fährt heim, die Etappe ist vorbei`);
  }
  for (const k of Object.keys(tour.used)) if (k.startsWith("s.")) delete tour.used[k];
  tour.stage += 1;
  tour.regions.push(region);
  const r = findRegion(env.pack, region)!;
  tour.map = generateStage({
    pack: env.pack, region, stage: tour.stage, seed: tour.seed, difficulty: tour.difficulty, startPlace: entryPlace(r),
    events: env.events, profile: env.profile, vehicle: tour.vehicle, dogs: tour.dogs, seenEvents: tour.seenEvents,
    onceEvents: env.book?.events ?? [], unlockedDogs: env.book?.dogs ?? [],
  });
  const start = startNode(tour.map);
  tour.at = start.id;
  tour.visited = [start.id];
  delete tour.station;
  delete tour.round;
  if (env.book) stampPlace(env.book, start.place, today(env));
  lines.push(`Weiter nach ${r.title}: Abfahrt in ${placeName(env.pack, start.place)}`);
  for (const l of lines) log(tour, l);
  return { ok: true, lines };
}

/** The guided first trip is done. */
export function completeTutorial(tour: TourState, env?: TourEnv): string {
  return endTour(tour, "won", env);
}

/** Give up the running tour (from the kitchen: "Tour beenden"); counts as an empty tank in the book. */
export function abandonTour(tour: TourState, env?: TourEnv): string {
  return endTour(tour, "empty", env);
}

/** Region of the current stage (convenience for screens). */
export { currentRegion };
