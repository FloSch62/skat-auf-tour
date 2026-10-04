// The ledger: every change of fuel and Mark goes through here, every consequence writes one German line into the
// route log, and an empty tank ends the tour ("Heimfahrt am Haken") unless the guest schnauzer-b's Vesper or the postcard from home
// helps. Pure module; the Tourenbuch in env.book is updated in place when given.
import type { RouteEntry, TourState } from "../game/types.ts";
import type { StationKind } from "../game/ids.ts";
import { DOG_DEFS, dogName } from "../data/dogs.ts";
import { VEHICLE_DEFS } from "../data/vehicles.ts";
import { addChronicle, recordTourEnd } from "./book.ts";
import {
  STROKES, bump, currentNode, dogPower, hasDog, hasSouvenir, hasUpgrade, nodeById, placeName, stageKey, today,
  usedCount, type TourEnv,
} from "./util.ts";

/** Where a fuel loss comes from (the fridge and the rescues treat all alike; the tutorial waives them all). */
export type FuelCause = "inn" | "bikers" | "tournament" | "detour" | "event" | "skat";

export interface FuelLoss {
  /** Strokes actually lost after the fridge (before rescues). */
  lost: number;
  /** German lines for what helped or happened ("Kühlschrank: ein Strich zurück", "Tank leer …"). */
  notes: string[];
  /** The tour ended because the tank ran empty. */
  empty: boolean;
}

// ─── slots ────────────────────────────────────────────────────────────────────────────────────────────────

export function souvenirSlots(tour: Pick<TourState, "vehicle" | "upgrades">): number {
  return VEHICLE_DEFS[tour.vehicle].souvenirSlots + (hasUpgrade(tour, "roof-box") ? 2 : 0);
}

export function dogSlots(tour: Pick<TourState, "vehicle" | "upgrades">): number {
  return VEHICLE_DEFS[tour.vehicle].dogSlots + (hasUpgrade(tour, "dog-bed") ? 1 : 0);
}

export const BEER_MAT_SLOTS = 3;

// ─── route log ────────────────────────────────────────────────────────────────────────────────────────────

/** Append one line to the route log for the current node (with the fuel and Mark after the change). */
export function log(tour: TourState, line: string, extra: { points?: number; kind?: StationKind; node?: string } = {}): RouteEntry {
  const n = nodeById(tour, extra.node ?? tour.at);
  const e: RouteEntry = {
    stage: tour.stage,
    node: n?.id ?? tour.at,
    place: n?.place ?? "",
    kind: extra.kind ?? n?.kind ?? "start",
    line,
    fuel: tour.fuel,
    marks: tour.marks,
  };
  if (extra.points !== undefined) e.points = extra.points;
  tour.route.push(e);
  return e;
}

// ─── Mark ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Add (or with a negative n, take) Mark; never below zero. Returns the actual change. */
export function addMarks(tour: TourState, n: number): number {
  const before = tour.marks;
  tour.marks = Math.max(0, tour.marks + Math.round(n));
  return tour.marks - before;
}

// ─── fuel ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Add fuel up to the tank size. Returns the actual change. */
export function gainFuel(tour: TourState, n: number): number {
  const before = tour.fuel;
  tour.fuel = Math.max(0, Math.min(tour.fuelMax, tour.fuel + Math.round(n)));
  return tour.fuel - before;
}

/**
 * Lose fuel. The tutorial loses nothing. The fridge gives one stroke back once per stage. When the tank runs empty:
 * The guest schnauzer-b unpacks his Vesper (tank full, then he heads home), else the postcard from home gives two
 * strokes once per tour, else the tour ends.
 */
export function loseFuel(tour: TourState, n: number, env: TourEnv | undefined, cause: FuelCause): FuelLoss {
  const notes: string[] = [];
  let loss = Math.max(0, Math.round(n));
  if (loss === 0) return { lost: 0, notes, empty: false };
  if (tour.tutorial) {
    notes.push("Probefahrt: kein Spritverlust");
    return { lost: 0, notes, empty: false };
  }
  if (hasUpgrade(tour, "fridge") && usedCount(tour, stageKey("fridge")) === 0) {
    bump(tour, stageKey("fridge"));
    loss -= 1;
    notes.push("Kühlschrank: ein Strich zurück");
  }
  tour.fuel = Math.max(0, tour.fuel - loss);
  if (tour.fuel > 0) return { lost: loss, notes, empty: false };

  // The tank is empty.
  if (hasDog(tour, "schnauzer-b") && usedCount(tour, stageKey("guestDog")) < dogPower(tour)) {
    bump(tour, stageKey("guestDog"));
    tour.fuel = tour.fuelMax;
    const name = dogName(env?.profile, "schnauzer-b");
    if (usedCount(tour, stageKey("guestDog")) >= dogPower(tour)) {
      tour.dogs = tour.dogs.filter((d) => d !== "schnauzer-b");
      notes.push(`${name} packt die Vesper aus: Tank voll. Dann fährt er heim.`);
    } else {
      notes.push(`${name} packt die Vesper aus: Tank voll`);
    }
    return { lost: loss, notes, empty: false };
  }
  if (hasSouvenir(tour, "postcard") && usedCount(tour, "postcard") === 0) {
    bump(tour, "postcard");
    tour.fuel = Math.min(tour.fuelMax, 2);
    notes.push(`Postkarte von daheim: ${STROKES(tour.fuel)}, es geht weiter`);
    return { lost: loss, notes, empty: false };
  }
  notes.push(endTour(tour, "empty", env));
  return { lost: loss, notes, empty: true };
}

// ─── the end ──────────────────────────────────────────────────────────────────────────────────────────────

const END_LINE: Record<NonNullable<TourState["ended"]>, string> = {
  empty: "Tank leer: Heimfahrt am Haken",
  won: "Der Wanderpokal fährt mit heim",
  "lost-final": "Kein Wanderpokal diesmal, die Tour ist zu Ende",
};

/** End the tour (once). Writes the last route line and the Tourenbuch's tour counters. Returns the line. */
export function endTour(tour: TourState, reason: NonNullable<TourState["ended"]>, env: TourEnv | undefined): string {
  if (tour.ended) return END_LINE[tour.ended];
  tour.ended = reason;
  delete tour.round;
  let line = END_LINE[reason];
  if (tour.tutorial) line = "Die Probefahrt ist geschafft";
  else if (reason === "empty" && env) line = `Tank leer in ${placeName(env.pack, currentNode(tour).place)}: Heimfahrt am Haken`;
  log(tour, line);
  if (env?.book && !tour.tutorial) {
    recordTourEnd(env.book, tour);
    if (reason === "won") addChronicle(env.book, "Den Wanderpokal heimgebracht.", today(env));
  }
  return line;
}

/** A dog's name for lines ("Hasso"). */
export function dogLine(env: TourEnv | undefined, id: keyof typeof DOG_DEFS): string {
  return dogName(env?.profile, id);
}
