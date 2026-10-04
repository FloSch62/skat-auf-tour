// Fuel and Mark (contract §4.3, §4.6–4.9, §4.11, §4.12): what every station result does to the tour. All values sit
// in one config object (ECONOMY) so the headless tour runs can tune them. Every consequence writes one German line
// into the route log and returns it. Pure module; env.book is updated in place when given.
import type { RoundResult, StationResult, TourState } from "../game/types.ts";
import type { BeerMatId, CharacterId, DogId, HouseRuleId, RegionId, StakesId } from "../game/ids.ts";
import { BEER_MATS, FAVOURITES_BY_REGION } from "../game/ids.ts";
import { DIFFICULTY_DEFS } from "../data/difficulty.ts";
import { VEHICLE_RULES } from "../data/vehicles.ts";
import { BEER_MAT_DEFS } from "../data/beerMats.ts";
import {
  addChronicle, checkDogUnlocks, recordPuzzle, recordRound, recordTrophy, recordWanderpokal,
} from "./book.ts";
import { BEER_MAT_SLOTS, addMarks, endTour, gainFuel, log, loseFuel, type FuelCause } from "./ledger.ts";
import { eventById, markSeen, pickEvent, type EventNext } from "./events.ts";
import { isFinalStage } from "./perks.ts";
import { dogName } from "../data/dogs.ts";
import {
  ATTEMPT_WORD, PLACE_WORD, bump, currentNode, currentRegion, dogPower, fuelWord, hasBeerMat, hasDog, hasSouvenir,
  hasUpgrade, markWord, placeName, rngFor, stageKey, today, usedCount, withPoints, type TourEnv,
} from "./util.ts";

// ─── the numbers ──────────────────────────────────────────────────────────────────────────────────────────

export const ECONOMY = {
  startMarks: 10,
  /** The inn pot: 5 Mark, +1 per 50 points lead over the second, at most 10 (before stakes and factors). */
  pot: { base: 5, per: 50, max: 10 },
  /** Stakes multiply the pot (×1, ×1.5, ×2) and the fuel loss; for fuel ×1.5 rounds down (one stroke). */
  stakesPot: { small: 1, medium: 1.5, high: 2 } as Record<StakesId, number>,
  stakesFuel: { small: 1, medium: 1, high: 2 } as Record<StakesId, number>,
  /** House rule "sharp" and the beer mat "double-pot" each double pot and fuel loss (they stack). */
  sharpFactor: 2,
  doublePotFactor: 2,
  /** The third place never loses more than this at one table. */
  maxInnFuelLoss: 3,
  /** Pennant: the second place brings 2 Mark. Piggy bank: +1 Mark after every won round. */
  pennant: 2,
  piggyBank: 1,
  /** Problems and chess: Mark by the attempt that solved it (1st, 2nd, 3rd and later). */
  puzzleReward: [4, 3, 2] as readonly number[],
  chessClock: 2,
  sudoku: { 6: { fuel: 1, marks: 0 }, 9: { fuel: 2, marks: 2 } } as Record<6 | 9, { fuel: number; marks: number }>,
  thermos: 1,
  /** Garage: one stroke of fuel. */
  fuelPrice: 3,
  /** Oil can: upgrades cost this much less. */
  oilCan: 2,
  /** Preisskat win: Mark and a beer mat chosen from this many. */
  tournamentWin: 10,
  beerMatChoices: 3,
};

// ─── results for the screens ──────────────────────────────────────────────────────────────────────────────

export interface StationOutcome {
  /** German one-liners (already in the route log). */
  lines: string[];
  /** Actual changes. */
  fuel: number;
  marks: number;
  /** Skat rounds: the player's place and list. */
  place?: 1 | 2 | 3;
  points?: number;
  pot?: number;
  /** Third place drove the others home (and what it cost). */
  driver?: boolean;
  /** The shepherd watched out: the third place cost no fuel. */
  shepherd?: boolean;
  /** Preisskat won: choose one beer mat (chooseBeerMat). Empty in the final. */
  beerMatChoice?: BeerMatId[];
  trophy?: RegionId;
  wanderpokal?: boolean;
  /** What the screen shows next (the bikers' talk, the continuation of a special round). */
  next?: EventNext;
  /** The Preisskat is done: region choice (state.regionChoices) or the end. */
  stageDone?: boolean;
  unlocked: DogId[];
  ended?: TourState["ended"];
}

function outcome(): StationOutcome {
  return { lines: [], fuel: 0, marks: 0, unlocked: [] };
}

function track<T>(tour: TourState, out: StationOutcome, fn: () => T): T {
  const f = tour.fuel;
  const m = tour.marks;
  const r = fn();
  out.fuel += tour.fuel - f;
  out.marks += tour.marks - m;
  return r;
}

function markDone(tour: TourState, step: string) {
  const st = tour.station;
  if (st && !st.done.includes(step)) st.done.push(step);
}

function unlocks(env: TourEnv, out: StationOutcome) {
  if (!env.book) return;
  for (const d of checkDogUnlocks(env.book)) {
    out.unlocked.push(d);
    addChronicle(env.book, `${dogName(env.profile, d)} darf jetzt mitfahren.`, today(env));
  }
}

// ─── Skat rounds at inns, the bikers' meeting and from events ─────────────────────────────────────────────

/** The pot for the first place (contract §4.3), with stakes, difficulty and doubling. */
export function innPot(
  tour: Pick<TourState, "difficulty" | "beerMats" | "vehicle">,
  list: readonly [number, number, number],
  stakes: StakesId,
  houseRule: HouseRuleId,
  kind: "inn" | "bikers" | "skat",
): number {
  const lead = Math.max(0, list[0] - Math.max(list[1], list[2]));
  const base = Math.min(ECONOMY.pot.max, ECONOMY.pot.base + Math.floor(lead / ECONOMY.pot.per));
  let f = ECONOMY.stakesPot[stakes] * DIFFICULTY_DEFS[tour.difficulty].potFactor;
  if (houseRule === "sharp") f *= ECONOMY.sharpFactor;
  if (hasBeerMat(tour, "double-pot")) f *= ECONOMY.doublePotFactor;
  if (kind === "bikers") f *= VEHICLE_RULES[tour.vehicle].bikersPot;
  return Math.round(base * f);
}

/** The fuel the third place costs before the shepherd (contract §4.3). */
export function innFuelLoss(tour: Pick<TourState, "beerMats">, stakes: StakesId, houseRule: HouseRuleId): number {
  let n = ECONOMY.stakesFuel[stakes];
  if (houseRule === "sharp") n *= ECONOMY.sharpFactor;
  if (hasBeerMat(tour, "double-pot")) n *= ECONOMY.doublePotFactor;
  return Math.min(ECONOMY.maxInnFuelLoss, n);
}

interface RoundSetup {
  kind: "inn" | "bikers" | "skat";
  title: string;
  stakes: StakesId;
  houseRule: HouseRuleId;
  opponents: [CharacterId, CharacterId];
}

function setupAt(tour: TourState, kind: "inn" | "bikers" | "skat"): RoundSetup {
  const node = currentNode(tour);
  if (kind === "skat") {
    const sp = tour.station?.special;
    if (!sp) throw new Error("no special round pending");
    return { kind, title: "Sonderrunde", stakes: sp.stakes, houseRule: sp.houseRule, opponents: sp.opponents };
  }
  if (kind === "bikers") return { kind, title: "Motorradtreff", stakes: "small", houseRule: "sharp", opponents: ["biker-manne", "biker-uschi"] };
  if (!node.inn) throw new Error(`no inn at ${node.id}`);
  return { kind, title: node.inn.name, stakes: node.inn.stakes, houseRule: node.inn.houseRule, opponents: node.inn.opponents };
}

/**
 * Consequences of a Skat round that is not the Preisskat. First: the pot (and the piggy bank). Second: nothing
 * (pennant: 2 Mark). Third: drives the others home, −1 fuel × stakes (sharp / double pot double it); the shepherd
 * prevents that once per stage. The house rule "kitty" settles its Kasse at the table: `round.marks` is added.
 */
export function finishRound(tour: TourState, env: TourEnv, round: RoundResult, kind: "inn" | "bikers" | "skat"): StationOutcome {
  const out = outcome();
  const s = setupAt(tour, kind);
  const place = placeName(env.pack, currentNode(tour).place);
  const parts: string[] = [`${PLACE_WORD[round.place]} ${withPoints(round.list[0])}`];
  out.place = round.place;
  out.points = round.list[0];
  delete tour.round;
  let fuelNotes: string[] = [];
  let empty = false;
  track(tour, out, () => {
    if (round.marks) {
      addMarks(tour, round.marks);
      parts.push(`Skatkasse ${markWord(round.marks)}`);
    }
    if (round.place === 1) {
      const pot = innPot(tour, round.list, s.stakes, s.houseRule, kind);
      out.pot = pot;
      addMarks(tour, pot);
      parts.push(`Pott ${markWord(pot)}`);
      if (hasSouvenir(tour, "piggy-bank")) {
        addMarks(tour, ECONOMY.piggyBank);
        parts.push(`Sparbüchse ${markWord(ECONOMY.piggyBank)}`);
      }
    } else if (round.place === 2) {
      if (hasSouvenir(tour, "pennant")) {
        addMarks(tour, ECONOMY.pennant);
        parts.push(`Wimpel ${markWord(ECONOMY.pennant)}`);
      } else parts.push("geht leer aus");
    } else {
      out.driver = true;
      const loss = innFuelLoss(tour, s.stakes, s.houseRule);
      if (!tour.tutorial && hasDog(tour, "shepherd") && usedCount(tour, stageKey("shepherd")) < dogPower(tour)) {
        bump(tour, stageKey("shepherd"));
        out.shepherd = true;
        parts.push(`fährt die anderen heim, aber ${dogName(env.profile, "shepherd")} passt auf: kein Sprit verloren`);
      } else {
        const r = loseFuel(tour, loss, env, kind as FuelCause);
        fuelNotes = r.notes;
        empty = r.empty;
        parts.push(tour.tutorial ? "fährt die anderen heim (Probefahrt: kein Spritverlust)" : `fährt die anderen heim, ${fuelWord(-r.lost)}`);
      }
      tour.stats.timesDriver++;
      if (env.book) env.book.fun.timesDriver++;
    }
  });
  if (kind === "inn") {
    tour.stats.innRounds++;
    if (round.place === 1) {
      tour.stats.innWins++;
      if (env.book && !tour.tutorial) env.book.innWins++;
    }
  }
  if (env.book) recordRound(env.book, s.opponents, round, today(env));
  const head = kind === "inn" ? `${s.title}, ${place}` : `${s.title} in ${place}`;
  const line = `${head}: ${parts.join(", ")}`;
  // The route line comes before the "Tank leer" line that loseFuel may have written.
  insertBeforeEnd(tour, line, round.list[0], empty);
  out.lines.push(line, ...fuelNotes.filter((n) => !n.startsWith("Probefahrt")));
  unlocks(env, out);
  markDone(tour, "round");
  if (empty) {
    out.ended = "empty";
    return out;
  }
  if (kind === "bikers") {
    const ev = pickEvent(tour, env, ["bike"], "talk");
    if (ev && tour.station) {
      tour.station.event = ev.id;
      markSeen(tour, env, ev.id);
      out.next = { kind: "event", id: ev.id };
    }
  }
  if (kind === "skat") {
    const sp = tour.station?.special;
    const nextId = round.place === 1 ? sp?.onWin : sp?.onLose;
    if (tour.station) delete tour.station.special;
    if (nextId && eventById(env, nextId) && tour.station) {
      tour.station.event = nextId;
      markSeen(tour, env, nextId);
      out.next = { kind: "event", id: nextId };
    }
  }
  return out;
}

/** Log a station line; when the tank just ran empty, it goes before the "Tank leer" line already written. */
function insertBeforeEnd(tour: TourState, line: string, points: number | undefined, empty: boolean) {
  log(tour, line, { points });
  if (empty && tour.route.length >= 2) {
    const last = tour.route.pop()!;
    const endLine = tour.route.pop()!;
    tour.route.push(last, endLine);
  }
}

// ─── the Preisskat (contract §4.6, §4.14) ─────────────────────────────────────────────────────────────────

/** Three beer mats to choose from after a Preisskat win (not owned yet). */
export function beerMatChoices(tour: TourState): BeerMatId[] {
  const rng = rngFor(tour.seed, tour.stage, "beer-mats");
  return rng.shuffle(BEER_MATS.filter((m) => !tour.beerMats.includes(m))).slice(0, ECONOMY.beerMatChoices);
}

export function finishTournament(tour: TourState, env: TourEnv, round: RoundResult): StationOutcome {
  const out = outcome();
  const region = currentRegion(tour);
  const final = isFinalStage(tour);
  const place = placeName(env.pack, currentNode(tour).place);
  const diff = DIFFICULTY_DEFS[tour.difficulty];
  out.place = round.place;
  out.points = round.list[0];
  out.stageDone = true;
  delete tour.round;
  if (env.book) recordRound(env.book, FAVOURITES_BY_REGION[region], round, today(env));
  const head = `Preisskat in ${place}: ${round.place === 1 ? "Tischsieg" : PLACE_WORD[round.place]} ${withPoints(round.list[0])}`;
  let fuelNotes: string[] = [];
  let empty = false;
  let line = head;
  track(tour, out, () => {
    if (round.place === 1) {
      tour.trophies.push(region);
      out.trophy = region;
      addMarks(tour, ECONOMY.tournamentWin);
      if (env.book) {
        recordTrophy(env.book, region, tour.difficulty);
        addChronicle(env.book, `Preisskat in ${place} gewonnen.`, today(env));
      }
      if (final) {
        out.wanderpokal = true;
        if (env.book) recordWanderpokal(env.book, tour.difficulty);
        line = `${head}, Pokal, Wanderpokal und ${markWord(ECONOMY.tournamentWin)}`;
      } else {
        out.beerMatChoice = beerMatChoices(tour);
        if (tour.station) tour.station.offer = out.beerMatChoice;
        line = `${head}, Pokal und ${markWord(ECONOMY.tournamentWin)}`;
      }
    } else if (final) {
      line = `${head}, kein Pokal`;
    } else {
      let loss = round.place === 2 ? diff.secondLoss : diff.thirdLoss;
      if (round.place === 3 && hasSouvenir(tour, "snack-board")) loss = Math.min(loss, 1);
      if (loss > 0) {
        const r = loseFuel(tour, loss, env, "tournament");
        fuelNotes = r.notes;
        empty = r.empty;
        line = `${head}, kein Pokal, ${fuelWord(-r.lost)}`;
      } else line = `${head}, kein Pokal, kein Spritverlust`;
    }
  });
  insertBeforeEnd(tour, line, round.list[0], empty);
  out.lines.push(line, ...fuelNotes);
  unlocks(env, out);
  markDone(tour, "round");
  if (empty) out.ended = "empty";
  else if (final) {
    out.lines.push(endTour(tour, round.place === 1 ? "won" : "lost-final", env));
    out.ended = tour.ended;
  }
  return out;
}


/** Take one of the offered beer mats (three slots; when full, `replace` names the one to give up). */
export function chooseBeerMat(tour: TourState, id: BeerMatId, replace?: BeerMatId): { ok: boolean; reason?: string; line?: string } {
  const offer = tour.station?.offer ?? [];
  if (!offer.includes(id)) return { ok: false, reason: "Dieser Bierdeckel liegt nicht auf dem Tisch" };
  if (tour.beerMats.includes(id)) return { ok: false, reason: "Den hast du schon" };
  if (tour.beerMats.length >= BEER_MAT_SLOTS) {
    if (!replace || !tour.beerMats.includes(replace)) return { ok: false, reason: "Drei Bierdeckel sind genug: einen abgeben" };
    tour.beerMats = tour.beerMats.filter((m) => m !== replace);
  }
  tour.beerMats.push(id);
  if (tour.station) tour.station.offer = [];
  const line = `Bierdeckel gewählt: ${BEER_MAT_DEFS[id].name}`;
  log(tour, line);
  return { ok: true, line };
}

// ─── puzzles (contract §4.7–4.9) ──────────────────────────────────────────────────────────────────────────

export function puzzleReward(attempts: number): number {
  const r = ECONOMY.puzzleReward;
  return r[Math.min(r.length - 1, Math.max(0, attempts - 1))];
}

const PUZZLE_TITLE = { problem: "Stammtisch-Aufgabe", chess: "Schachbrett", sudoku: "Kiosk" } as const;

/** A problem, chess puzzle or sudoku is done (at its station, from an event, or the awning's free problem). */
export function finishPuzzle(
  tour: TourState,
  env: TourEnv,
  result: { kind: "problem" | "chess"; solved: boolean; attempts: number } | { kind: "sudoku"; solved: boolean; size: 6 | 9 },
): StationOutcome {
  const out = outcome();
  const place = placeName(env.pack, currentNode(tour).place);
  let line: string;
  track(tour, out, () => {
    if (result.kind === "sudoku") {
      const big = result.size === 9;
      if (!result.solved) {
        line = `${PUZZLE_TITLE.sudoku} in ${place}: Rätsel weggelegt`;
        return;
      }
      const r = ECONOMY.sudoku[result.size];
      gainFuel(tour, r.fuel);
      addMarks(tour, r.marks);
      tour.stats.puzzlesSolved++;
      if (env.book) recordPuzzle(env.book, big ? "sudoku9" : "sudoku6");
      line = `${PUZZLE_TITLE.sudoku} in ${place}: ${big ? "großes" : "kleines"} Rätsel gelöst, ${fuelWord(r.fuel)}${r.marks ? ` und ${markWord(r.marks)}` : ""}`;
      return;
    }
    if (!result.solved) {
      line = `${PUZZLE_TITLE[result.kind]} in ${place}: nicht gelöst`;
      return;
    }
    let m = puzzleReward(result.attempts);
    const extra = result.kind === "chess" && hasSouvenir(tour, "chess-clock") ? ECONOMY.chessClock : 0;
    m += extra;
    addMarks(tour, m);
    tour.stats.puzzlesSolved++;
    if (env.book) recordPuzzle(env.book, result.kind);
    line = `${PUZZLE_TITLE[result.kind]} in ${place}: ${ATTEMPT_WORD[Math.min(4, result.attempts)] ?? ""} gelöst, ${markWord(m)}${extra ? " (Schachuhr)" : ""}`;
  });
  log(tour, line!);
  out.lines.push(line!);
  unlocks(env, out);
  markDone(tour, `puzzle:${result.kind}`);
  if (tour.station) delete tour.station.puzzle;
  return out;
}

// ─── pitch, garage fuel ───────────────────────────────────────────────────────────────────────────────────

/** Fuel at a pitch: +2 (vehicle), thermos +1. Applied once on arrival. */
export function pitchFuel(tour: Pick<TourState, "vehicle" | "souvenirs">): number {
  return VEHICLE_RULES[tour.vehicle].pitchFuel + (hasSouvenir(tour, "thermos") ? ECONOMY.thermos : 0);
}

export function arrivePitch(tour: TourState, env: TourEnv): StationOutcome {
  const out = outcome();
  const place = placeName(env.pack, currentNode(tour).place);
  const want = pitchFuel(tour);
  const got = track(tour, out, () => gainFuel(tour, want));
  const thermos = hasSouvenir(tour, "thermos") ? " (Thermoskanne)" : "";
  const line = got > 0 ? `Stellplatz in ${place}: getankt, ${fuelWord(got)}${thermos}` : `Stellplatz in ${place}: Tank war schon voll`;
  log(tour, line);
  out.lines.push(line);
  markDone(tour, "fuel");
  if (hasUpgrade(tour, "awning") && tour.station) tour.station.puzzle = "problem";
  return out;
}

/** Dispatch a station result from a screen to the right consequence. */
export function finishStation(tour: TourState, env: TourEnv, result: StationResult): StationOutcome {
  switch (result.kind) {
    case "inn":
    case "bikers":
    case "skat":
      return finishRound(tour, env, result.round, result.kind);
    case "tournament":
      return finishTournament(tour, env, result.round);
    case "problem":
    case "chess":
      return finishPuzzle(tour, env, { kind: result.kind, solved: result.solved, attempts: result.attempts });
    case "sudoku":
      return finishPuzzle(tour, env, { kind: "sudoku", solved: result.solved, size: result.size });
    case "none":
      return outcome();
  }
}
