// Headless whole tours (contract §12 "npm run test:tour"): the real tour logic driven by a simple policy (choose
// paths, buy sensibly, answer events by expected value) and a stub Skat model behind a clean seam. The stub draws a
// round from player skill against opponent strength; the real computer opponents replace it later by implementing
// SkatModel. Durations follow contract §4.2. Pure module (no fs); tools/balance/tour-runs.ts does the files.
import { Rng } from "../core/rng.ts";
import type { EventDef, GameRecord, MapNode, PlacePack, Profile, RoundConfig, RoundResult, TourState } from "../game/types.ts";
import type { BeerMatId, DifficultyId, DogId, GameKind, SouvenirId, UpgradeId, VehicleId } from "../game/ids.ts";
import { MEASURED, MEDIUM_LIST, PLAYER_PROFILES, type SeatProfile } from "./skatstats.ts";
import { STATION_DEFS } from "../data/stations.ts";
import { newBook } from "./book.ts";
import { chooseBeerMat, finishPuzzle, finishStation, innFuelLoss, type StationOutcome } from "./economy.ts";
import { eventById, presentEvent, resolveChoice } from "./events.ts";
import { dogSlots, souvenirSlots } from "./ledger.ts";
import { puzzleConfig } from "./perks.ts";
import { buyFuel, buySouvenir, buyUpgrade, garageOffer, marketOffer, takeDog } from "./shops.ts";
import {
  canMove, detourTargets, enterStage, moveTo, newTour, pendingRoundConfig, regionChoices, roadTargets, tourPhase,
} from "./state.ts";
import { successors } from "./map.ts";
import { clamp, currentNode, type TourEnv } from "./util.ts";

// ─── the seam ─────────────────────────────────────────────────────────────────────────────────────────────

/** Plays a whole round without a screen. The real AI implements this later (same RoundConfig in, RoundResult out). */
export interface SkatModel {
  playRound(config: RoundConfig, rng: Rng): RoundResult;
}

/** Solves puzzles without a screen. */
export interface PuzzleModel {
  /** Problems and chess: solved, and on which attempt. */
  puzzle(kind: "problem" | "chess", attempts: number, hints: number, rng: Rng): { solved: boolean; attempts: number };
  sudoku(size: 6 | 9, prefilled: number, rng: Rng): boolean;
}

// ─── the stub Skat model ──────────────────────────────────────────────────────────────────────────────────

export interface StubSkatParams {
  /** The human seat (default: a good club player, between the strong and the very strong figures). */
  player: SeatProfile;
  /** Declarer win chance per list point the defenders are weaker than a medium figure (on average). */
  beta: number;
  /** Opponents' depth (difficulty) effect: win chance and list rating per unit of (depth − 1). */
  depthWin: number;
  depthRating: number;
  /** Matador count weights for 1…4 ("mit" or "ohne") in suit games and Grand. */
  matadors: [number, number, number, number];
  /** Share of won suit/Grand games won Schneider. */
  schneider: number;
  /** Share of declared games doubled by Kontra (house rule "kontra"). */
  kontra: number;
}

/**
 * Calibrated on the measured personas (src/tour/skatstats.ts, docs/balance-skat.md): a medium figure at a medium table
 * makes about 21.6 list points per game, the other figures their measured list within a few points; depth effects
 * from the real AI check (tools/balance/tour-skat-check.ts, docs/balance-tour.md).
 */
export const DEFAULT_STUB: StubSkatParams = {
  player: PLAYER_PROFILES.good,
  beta: 0.004,
  depthWin: 0.1,
  depthRating: 8,
  matadors: [40, 30, 18, 12],
  schneider: 0.23,
  kontra: 0.056,
};

interface Seat {
  prof: SeatProfile;
  /** Declarer win chance against two medium defenders. */
  won: number;
  /** List rating relative to a medium figure (list points per game). */
  rating: number;
}

function seatOf(config: RoundConfig, p: StubSkatParams, seat: 0 | 1 | 2): Seat {
  if (seat === 0) {
    const perks = config.perks;
    // Honest helps (redeal, a look at the Skat, a card taken back) are worth a little.
    const bonus = 0.006 * perks.redeals + 0.004 * perks.skatPeeks + 0.004 * perks.takeBacks;
    return { prof: p.player, won: p.player.won + bonus, rating: p.player.list - MEDIUM_LIST };
  }
  const id = config.opponents[seat - 1];
  const prof = MEASURED[id] ?? MEASURED.wirtin;
  const d = config.depth - 1;
  return { prof, won: prof.won + p.depthWin * d, rating: prof.list - MEDIUM_LIST + p.depthRating * d };
}

const SUIT_KINDS = ["clubs", "spades", "hearts", "diamonds"] as const;
const SUIT_WEIGHTS = [25, 17, 12, 9];
const SUIT_BASE = { clubs: 12, spades: 11, hearts: 10, diamonds: 9 } as const;

/** A round drawn from the measured play of the three seats, with a Seeger-Fabian list and game records. */
export function stubSkatModel(params: Partial<StubSkatParams> = {}): SkatModel {
  const p = { ...DEFAULT_STUB, ...params };
  return {
    playRound(config, rng) {
      const seats = [seatOf(config, p, 0), seatOf(config, p, 1), seatOf(config, p, 2)];
      const list: [number, number, number] = [0, 0, 0];
      const lostGames = [0, 0, 0];
      const games: GameRecord[] = [];
      const ramsch = config.houseRule === "ramsch" || config.houseRule === "schieberamsch";
      const bock = config.houseRule === "bock" ? 2 : 1;
      const firstForehand = config.perks.forehandFirst ? 0 : rng.int(0, 2);
      const declareSum = seats.reduce((a, s) => a + s.prof.declares, 0);
      const passChance = clamp(1 - declareSum, 0.02, 0.12);
      for (let g = 0; g < config.games; g++) {
        const forehand = ((firstForehand + g) % 3) as 0 | 1 | 2;
        const rec: GameRecord = {
          seed: rng.int(0, 2 ** 31), forehand, declarer: null, kind: "passed", hand: false, ouvert: false,
          schneiderAnnounced: false, schwarzAnnounced: false, schneider: false, schwarz: false, matadors: 0, bid: 0,
          won: false, overbid: false, points: 0, value: 0, kontra: 0, list: [0, 0, 0],
        };
        if (rng.chance(passChance)) {
          if (ramsch) {
            const loser = rng.weighted([0, 1, 2], (s) => Math.max(0.2, 1 - seats[s].rating / 60));
            const pts = rng.int(55, 110);
            rec.kind = "ramsch";
            rec.points = pts;
            rec.value = -pts;
            rec.list[loser] = -pts;
            list[loser] -= pts;
            lostGames[loser]++;
          }
          games.push(rec);
          continue;
        }
        const decl = rng.weighted([0, 1, 2] as const, (s) => seats[s].prof.declares);
        const me = seats[decl];
        const defenders = [0, 1, 2].filter((s) => s !== decl);
        const r = rng.next();
        const kind: GameKind = r < me.prof.nul ? "null" : r < me.prof.nul + me.prof.grand ? "grand" : rng.weighted(SUIT_KINDS, (k) => SUIT_WEIGHTS[SUIT_KINDS.indexOf(k)]);
        const hand = rng.chance(me.prof.hand);
        const defRating = (seats[defenders[0]].rating + seats[defenders[1]].rating) / 2;
        const win = clamp(me.won - p.beta * defRating, 0.3, 0.97);
        const won = rng.chance(win);
        let value: number;
        let schneider = false;
        let matadors = 0;
        if (kind === "null") value = hand ? 35 : 23;
        else {
          const base = kind === "grand" ? 24 : SUIT_BASE[kind as keyof typeof SUIT_BASE];
          matadors = 1 + rng.weighted([0, 1, 2, 3], (i) => p.matadors[i]);
          schneider = won && rng.chance(p.schneider);
          value = base * (matadors + 1 + (hand ? 1 : 0) + (schneider ? 1 : 0));
        }
        value *= bock;
        let kontra: 0 | 1 | 2 = 0;
        if (config.houseRule === "kontra" && rng.chance(p.kontra)) {
          value *= 2;
          kontra = 1;
        }
        Object.assign(rec, { declarer: decl, kind, hand, won, schneider, matadors, bid: 18, kontra });
        if (won) {
          rec.value = value;
          rec.list[decl] = value + 50;
        } else {
          rec.value = -2 * value;
          rec.list[decl] = -2 * value - 50;
          for (const d of defenders) rec.list[d] += 40;
          lostGames[decl]++;
        }
        // Bonuses: the player's complete bonus from the tour, the house-rule evening for the opponents.
        const bonusOf = (seat: number) => (seat === 0 ? config.perks.listBonus : eveningOnly(config.houseRule));
        if (won) {
          const b = bonusOf(decl);
          if (kind === "grand") rec.list[decl] += b.grand;
          if (kind === "null") rec.list[decl] += b.null;
          if (hand) rec.list[decl] += b.hand;
          if (schneider) rec.list[decl] += b.schneider;
        } else for (const d of defenders) rec.list[d] += bonusOf(d).defence;
        for (let s = 0; s < 3; s++) list[s] += rec.list[s];
        games.push(rec);
      }
      // Ties go in the player's favour.
      const place = (1 + [1, 2].filter((s) => list[s] > list[0]).length) as 1 | 2 | 3;
      let marks = 0;
      if (config.houseRule === "kitty") {
        const paid = Math.min(lostGames[0], config.marks);
        const kasse = paid + lostGames[1] + lostGames[2];
        marks = (place === 1 ? kasse : 0) - paid;
      }
      return { list, place, games, marks };
    },
  };
}

function eveningOnly(rule: RoundConfig["houseRule"]) {
  return {
    grand: rule === "grand-evening" ? 20 : 0, null: rule === "null-evening" ? 15 : 0, hand: rule === "hand-evening" ? 15 : 0,
    schneider: 0, defence: 0,
  };
}

export const DEFAULT_PUZZLES: PuzzleModel = {
  puzzle(kind, attempts, hints, rng) {
    const p = (kind === "problem" ? 0.55 : 0.6) + 0.15 * Math.min(1, hints);
    for (let a = 1; a <= attempts; a++) if (rng.chance(p)) return { solved: true, attempts: a };
    return { solved: false, attempts };
  },
  sudoku(size, prefilled, rng) {
    return rng.chance((size === 6 ? 0.95 : 0.85) + 0.01 * prefilled);
  },
};

// ─── the policy ───────────────────────────────────────────────────────────────────────────────────────────

const SOUVENIR_PRIORITY: SouvenirId[] = [
  "thermos", "postcard", "pennant", "piggy-bank", "snack-board", "lucky-penny", "dog-whistle", "magnifier", "oil-can",
  "chess-clock", "reading-glasses", "notepad", "pencil", "road-atlas",
];
const UPGRADE_PRIORITY: UpgradeId[] = ["aux-tank", "fridge", "sidecar", "awning", "roof-box", "dog-bed", "radio"];
const DOG_PRIORITY: DogId[] = ["schnauzer-b", "wolfhound-a", "airedale", "shepherd", "wolfhound-b", "schnauzer-a"];
const MAT_PRIORITY: BeerMatId[] = ["defence-bonus", "grand-bonus", "schneider-bonus", "hand-bonus", "redeal", "forehand", "null-bonus", "extra-game", "double-pot"];

function nodeScore(t: TourState, n: MapNode): number {
  const need = t.fuelMax - t.fuel;
  switch (n.kind) {
    case "inn": {
      const loss = n.inn ? innFuelLoss(t, n.inn.stakes, n.inn.houseRule) : 1;
      return 3 - (t.fuel <= loss + 1 ? 2 * loss : 0) + (t.marks < 4 ? 0.5 : 0);
    }
    case "bikers": return t.fuel >= 4 ? 2.5 : -1;
    case "pitch": return need >= 2 ? 3.5 : need === 1 ? 1.5 : 0.3;
    case "sudoku": return 1.5 + (need ? 1.5 : 0);
    case "problem":
    case "chess": return 2;
    case "market": return t.marks >= 6 && t.souvenirs.length < souvenirSlots(t) ? 2 : 0.5;
    case "garage": return t.fuel <= 2 && t.marks >= 3 ? 3 : t.marks >= 12 ? 1.5 : 0.5;
    case "dogs": return t.dogs.length < dogSlots(t) ? 1.5 : 0.7;
    case "event": return 1.2;
    case "tournament": return 0;
    default: return 0;
  }
}

/** Pick the next station: road targets and (sensible) detours, one step of look-ahead. */
export function chooseNext(t: TourState): { id: string; detour: boolean } | null {
  const opts: { n: MapNode; detour: boolean; score: number }[] = [];
  const look = (n: MapNode) => {
    const nx = successors(t.map, n);
    return nx.length ? Math.max(...nx.map((m) => nodeScore(t, m))) : 0;
  };
  for (const n of roadTargets(t)) opts.push({ n, detour: false, score: nodeScore(t, n) + 0.4 * look(n) });
  for (const n of detourTargets(t)) {
    const c = canMove(t, n.id);
    if (!c.ok) continue;
    if (c.cost > 0 && t.fuel <= c.cost + 1) continue;
    opts.push({ n, detour: true, score: nodeScore(t, n) + 0.4 * look(n) - c.cost * 2.5 - 0.3 });
  }
  if (!opts.length) return null;
  opts.sort((a, b) => b.score - a.score || a.n.row - b.n.row);
  return { id: opts[0].n.id, detour: opts[0].detour };
}

function outcomeValue(t: TourState, env: TourEnv, def: EventDef, index: number): number {
  const c = def.choices[index];
  let sum = 0;
  let w = 0;
  for (const o of c.outcomes) {
    const ow = o.weight ?? 1;
    const out = o.outcome;
    const avg = (r: number | [number, number] | undefined) => (r === undefined ? 0 : typeof r === "number" ? r : (r[0] + r[1]) / 2);
    let v = 3 * avg(out.fuel) + avg(out.marks);
    if (out.souvenir) v += 2;
    if (out.beerMat) v += 2;
    if (out.upgrade) v += 3;
    if (out.dog) v += 1;
    if (out.skat) v += t.fuel >= 3 ? 1.5 : -1;
    if (out.puzzle) v += 1.5;
    if (out.next && eventById(env, out.next)) v += 0.5;
    if (avg(out.fuel) < 0 && t.fuel + avg(out.fuel) <= 0) v -= 20;
    sum += ow * v;
    w += ow;
  }
  return w ? sum / w : 0;
}

export interface SimOptions {
  seed: number;
  difficulty: DifficultyId;
  vehicle?: VehicleId;
  dogs?: DogId[];
  pack: PlacePack;
  profile: Profile;
  events: readonly EventDef[];
  skat?: SkatModel;
  puzzles?: PuzzleModel;
  /** Kept across runs to model a returning player (unlocks); a fresh book per tour otherwise. */
  book?: TourEnv["book"];
}

export interface StageReport {
  region: string;
  stations: number;
  minutes: number;
  innRounds: number;
  innWins: number;
  preisskat?: 1 | 2 | 3;
  fuelEnd: number;
  marksEnd: number;
  detours: number;
}

export interface SimReport {
  seed: number;
  difficulty: DifficultyId;
  ended: TourState["ended"];
  /** Stage (0–2) in which the tank ran empty. */
  emptyStage?: number;
  stagesPlayed: number;
  stations: number;
  minutes: number;
  stages: StageReport[];
  /** Fuel after every station (the tank curve). */
  fuelCurve: number[];
  marksCurve: number[];
  rescues: { postcard: number; guestDog: number; fridge: number; shepherd: number };
  bought: string[];
  events: number;
}

/** Minutes for one station (contract §4.2: inn 6–9 for three games, Preisskat 12–18 for six, …). */
export function stationMinutes(kind: MapNode["kind"], games = 3, sudokuSize: 6 | 9 = 6): number {
  const [a, b] = STATION_DEFS[kind].minutes;
  const mid = (a + b) / 2;
  if (kind === "inn" || kind === "bikers") return mid * (games / 3);
  if (kind === "tournament") return mid * (games / 6);
  if (kind === "sudoku") return sudokuSize === 9 ? 10 : 3;
  return mid;
}

/** Minutes per drive on the map (choosing, watching the van move). */
export const DRIVE_MINUTES = 0.5;

/** Play one whole tour headless. */
export function simulateTour(o: SimOptions): SimReport {
  const skat = o.skat ?? stubSkatModel();
  const puzzles = o.puzzles ?? DEFAULT_PUZZLES;
  const book = o.book ?? newBook();
  const env: TourEnv = { pack: o.pack, profile: o.profile, name: "Karl", events: o.events, book, today: "1983-06-12" };
  const t = newTour({
    seed: o.seed, difficulty: o.difficulty, vehicle: o.vehicle ?? "camper", dogs: o.dogs ?? ["shepherd"], pack: o.pack,
    profile: o.profile, book, events: o.events, today: env.today,
  });
  const rng = new Rng((o.seed ^ 0x5eed) >>> 0);
  const settings = { showTrumpCount: false, showPoints: false };
  const rep: SimReport = {
    seed: o.seed, difficulty: o.difficulty, ended: undefined, stagesPlayed: 1, stations: 0, minutes: 0, stages: [],
    fuelCurve: [t.fuel], marksCurve: [t.marks], rescues: { postcard: 0, guestDog: 0, fridge: 0, shepherd: 0 }, bought: [], events: 0,
  };
  let stage: StageReport = { region: t.regions[0], stations: 0, minutes: 0, innRounds: 0, innWins: 0, fuelEnd: 0, marksEnd: 0, detours: 0 };
  const note = (out: StationOutcome | { lines: string[] }) => {
    for (const l of out.lines) {
      if (l.startsWith("Postkarte")) rep.rescues.postcard++;
      if (l.includes("Vesper")) rep.rescues.guestDog++;
      if (l.startsWith("Kühlschrank")) rep.rescues.fridge++;
    }
    if ("shepherd" in out && out.shepherd) rep.rescues.shepherd++;
  };
  const playRound = (kind: "inn" | "bikers" | "tournament" | "skat") => {
    const cfg = pendingRoundConfig(t, settings, env);
    if (!cfg) return;
    const res = skat.playRound(cfg, rng);
    const out = finishStation(t, env, { kind, round: res });
    note(out);
    if (kind === "inn" || kind === "bikers" || kind === "skat") stage.minutes += stationMinutes("inn", cfg.games);
    if (kind === "tournament") stage.minutes += stationMinutes("tournament", cfg.games);
    if (kind === "inn") {
      stage.innRounds++;
      if (res.place === 1) stage.innWins++;
    }
    if (kind === "tournament") {
      stage.preisskat = res.place;
      if (out.beerMatChoice?.length) {
        const pick = MAT_PRIORITY.find((m) => out.beerMatChoice!.includes(m)) ?? out.beerMatChoice[0];
        const replace = t.beerMats.length >= 3 ? t.beerMats[0] : undefined;
        chooseBeerMat(t, pick, replace);
      }
    }
  };
  const playPuzzle = (kind: "problem" | "chess" | "sudoku") => {
    const pc = puzzleConfig(t);
    if (kind === "sudoku") {
      const size: 6 | 9 = t.fuelMax - t.fuel >= 2 ? 9 : 6;
      note(finishPuzzle(t, env, { kind: "sudoku", solved: puzzles.sudoku(size, pc.presolved + pc.freeCells, rng), size }));
      stage.minutes += stationMinutes("sudoku", 3, size);
    } else {
      const r = puzzles.puzzle(kind, pc.attempts, pc.hints, rng);
      note(finishPuzzle(t, env, { kind, ...r }));
      stage.minutes += stationMinutes(kind);
    }
  };
  const playEvents = () => {
    let guard = 0;
    while (t.station?.event && !t.ended && guard++ < 8) {
      const def = eventById(env, t.station.event);
      if (!def) {
        delete t.station.event;
        break;
      }
      rep.events++;
      stage.minutes += stationMinutes("event");
      const view = presentEvent(t, env, def);
      const usable = view.choices.filter((c) => c.enabled && !c.hidden);
      const best = usable.reduce((a, c) => (outcomeValue(t, env, def, c.index) > outcomeValue(t, env, def, a.index) ? c : a), usable[0]);
      const r = resolveChoice(t, env, def, best.index);
      note({ lines: r.notices });
      if (r.next?.kind === "skat") playRound("skat");
      else if (r.next?.kind === "puzzle") playPuzzle(r.next.puzzle);
    }
  };
  const shop = () => {
    const node = currentNode(t);
    if (node.kind === "market") {
      const offer = marketOffer(t).filter((v) => !v.owned);
      const want = SOUVENIR_PRIORITY.find((id) => offer.some((v) => v.id === id && t.marks - v.price >= 3));
      if (want && t.souvenirs.length < souvenirSlots(t) && buySouvenir(t, env, want).ok) rep.bought.push(want);
      stage.minutes += stationMinutes("market");
    } else if (node.kind === "garage") {
      if (t.fuel <= 2) buyFuel(t, env, Math.min(2, t.fuelMax - t.fuel));
      const offer = garageOffer(t).filter((v) => !v.owned);
      const want = UPGRADE_PRIORITY.find((id) => offer.some((v) => v.id === id && t.marks - v.price >= 4));
      if (want && buyUpgrade(t, env, want).ok) rep.bought.push(want);
      stage.minutes += stationMinutes("garage");
    } else if (node.kind === "dogs") {
      const offer = (t.station?.offer ?? []) as DogId[];
      const want = DOG_PRIORITY.find((d) => offer.includes(d));
      if (want && t.dogs.length < dogSlots(t)) takeDog(t, env, want);
      stage.minutes += stationMinutes("dogs");
    } else if (node.kind === "pitch") {
      stage.minutes += stationMinutes("pitch");
      if (t.station?.puzzle === "problem") playPuzzle("problem");
    }
  };

  for (let steps = 0; steps < 200 && !t.ended; steps++) {
    const phase = tourPhase(t);
    if (phase === "region") {
      stage.fuelEnd = t.fuel;
      stage.marksEnd = t.marks;
      rep.stages.push(stage);
      const choices = regionChoices(t, o.pack);
      const r = choices[rng.int(0, choices.length - 1)];
      enterStage(t, env, r);
      rep.stagesPlayed++;
      stage = { region: r, stations: 0, minutes: 1, innRounds: 0, innWins: 0, fuelEnd: 0, marksEnd: 0, detours: 0 };
      continue;
    }
    if (phase !== "map") break;
    const next = chooseNext(t);
    if (!next) break;
    const a = moveTo(t, env, next.id);
    if (!a.ok) break;
    note(a);
    if (next.detour) stage.detours++;
    stage.stations++;
    stage.minutes += DRIVE_MINUTES;
    const kind = currentNode(t).kind;
    if (kind === "inn" || kind === "bikers" || kind === "tournament") playRound(kind);
    else if (kind === "problem" || kind === "chess" || kind === "sudoku") playPuzzle(kind);
    else shop();
    playEvents();
    rep.fuelCurve.push(t.fuel);
    rep.marksCurve.push(t.marks);
  }
  stage.fuelEnd = t.fuel;
  stage.marksEnd = t.marks;
  rep.stages.push(stage);
  rep.ended = t.ended;
  if (t.ended === "empty") rep.emptyStage = t.stage;
  rep.stations = rep.stages.reduce((a, s) => a + s.stations, 0);
  rep.minutes = rep.stages.reduce((a, s) => a + s.minutes, 0);
  return rep;
}
