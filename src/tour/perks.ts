// What the tour hands to a table or a puzzle: perks from souvenirs, dogs and beer mats, the complete list bonus
// (beer mats and house-rule evenings merged here — the Skat side adds nothing of its own), and the RoundConfig for
// inns, the bikers' meeting, the Preisskat and special rounds from events. Pure module.
import type { ListBonus, MapNode, RoundConfig, StationState, TablePerks, TourState } from "../game/types.ts";
import type { HouseRuleId } from "../game/ids.ts";
import { FAVOURITES_BY_REGION } from "../game/ids.ts";
import type { Settings } from "../core/save.ts";
import { DIFFICULTY_DEFS } from "../data/difficulty.ts";
import { BIKERS_ROOM, TOURNAMENT_ROOM } from "../data/inns.ts";
import { hashString } from "../core/rng.ts";
import { currentRegion, dogPower, hasBeerMat, hasDog, hasSouvenir, placeName, type TourEnv } from "./util.ts";

/** The settings the perks read (helps that are also settings, contract §3). */
export type PerkSettings = Pick<Settings, "showTrumpCount" | "showPoints">;

/** List points per won game kind from house-rule evenings and beer mats (contract §4.4, §4.12). */
export const LIST_BONUS_VALUES = {
  evening: { grand: 20, null: 15, hand: 15 },
  mats: { grand: 20, null: 15, hand: 15, schneider: 15, defence: 10 },
} as const;

/**
 * The complete list bonus of a table. House-rule evenings and beer mats add up (a Grand-Abend with the Grand-Prämie
 * gives +40). At the Preisskat no special rule applies (contract §4.6: "Turnier ist Turnier"), so it is all zero.
 */
export function listBonus(tour: Pick<TourState, "beerMats">, houseRule: HouseRuleId, tournament = false): ListBonus {
  const b: ListBonus = { grand: 0, null: 0, hand: 0, schneider: 0, defence: 0 };
  if (tournament) return b;
  const E = LIST_BONUS_VALUES.evening;
  const M = LIST_BONUS_VALUES.mats;
  if (houseRule === "grand-evening") b.grand += E.grand;
  if (houseRule === "null-evening") b.null += E.null;
  if (houseRule === "hand-evening") b.hand += E.hand;
  if (hasBeerMat(tour, "grand-bonus")) b.grand += M.grand;
  if (hasBeerMat(tour, "null-bonus")) b.null += M.null;
  if (hasBeerMat(tour, "hand-bonus")) b.hand += M.hand;
  if (hasBeerMat(tour, "schneider-bonus")) b.schneider += M.schneider;
  if (hasBeerMat(tour, "defence-bonus")) b.defence += M.defence;
  return b;
}

/**
 * The table perks. At the Preisskat only the helps (reading glasses, notepad, settings) and the dogs come along;
 * redeals and beer mats are special rules and stay outside (contract §4.6).
 */
export function tablePerks(
  tour: Pick<TourState, "souvenirs" | "dogs" | "beerMats">,
  settings: PerkSettings,
  opts: { tournament?: boolean; houseRule?: HouseRuleId } = {},
): TablePerks {
  const t = !!opts.tournament;
  const power = dogPower(tour);
  return {
    showTrumps: hasSouvenir(tour, "reading-glasses") || !!settings.showTrumpCount,
    showPoints: hasSouvenir(tour, "notepad") || !!settings.showPoints,
    redeals: t ? 0 : (hasSouvenir(tour, "lucky-penny") ? 1 : 0) + (hasBeerMat(tour, "redeal") ? 1 : 0),
    skatPeeks: hasDog(tour, "schnauzer-a") ? power : 0,
    takeBacks: hasDog(tour, "wolfhound-b") ? power : 0,
    forehandFirst: !t && hasBeerMat(tour, "forehand"),
    listBonus: listBonus(tour, opts.houseRule ?? "standard", t),
  };
}

/** Games of a round: 3 at an inn, 6 for a long round, +1 with the beer mat "Viertes Spiel"; 6 / 9 at the Preisskat. */
export function roundGames(tour: Pick<TourState, "beerMats" | "stage" | "tutorial">, kind: "inn" | "bikers" | "skat" | "tournament", houseRule: HouseRuleId, base?: number): number {
  if (kind === "tournament") return isFinalStage(tour) ? 9 : 6;
  let g = base ?? (houseRule === "long-round" ? 6 : 3);
  if (hasBeerMat(tour, "extra-game")) g += 1;
  return g;
}

/** The third stage's Preisskat is the tour final (nine games, the Wanderpokal). */
export function isFinalStage(tour: Pick<TourState, "stage" | "tutorial">): boolean {
  return !tour.tutorial && tour.stage >= 2;
}

function roundSeed(tour: Pick<TourState, "seed" | "stage">, node: string, salt: string): number {
  return hashString(`${tour.seed}|${tour.stage}|${node}|${salt}`);
}

/** The round at a Skat station (inn, bikers' meeting, Preisskat). */
export function roundConfig(tour: TourState, node: MapNode, settings: PerkSettings, env?: Pick<TourEnv, "pack">): RoundConfig {
  const depth = DIFFICULTY_DEFS[tour.difficulty].depth;
  const where = env ? placeName(env.pack, node.place) : node.place;
  if (node.kind === "tournament") {
    return {
      seed: roundSeed(tour, node.id, "preisskat"),
      opponents: FAVOURITES_BY_REGION[currentRegion(tour)],
      houseRule: "standard",
      games: roundGames(tour, "tournament", "standard"),
      tournament: true,
      title: `Preisskat in ${where}`,
      room: TOURNAMENT_ROOM,
      marks: tour.marks,
      perks: tablePerks(tour, settings, { tournament: true }),
      depth,
    };
  }
  if (node.kind === "bikers") {
    const houseRule: HouseRuleId = "sharp";
    return {
      seed: roundSeed(tour, node.id, "bikers"),
      opponents: ["biker-manne", "biker-uschi"],
      houseRule,
      games: roundGames(tour, "bikers", houseRule),
      tournament: false,
      title: `Motorradtreff in ${where}`,
      room: BIKERS_ROOM,
      marks: tour.marks,
      perks: tablePerks(tour, settings, { houseRule }),
      depth,
    };
  }
  if (node.kind !== "inn" || !node.inn) throw new Error(`no Skat round at ${node.id} (${node.kind})`);
  const inn = node.inn;
  return {
    seed: roundSeed(tour, node.id, "inn"),
    opponents: inn.opponents,
    houseRule: inn.houseRule,
    games: roundGames(tour, "inn", inn.houseRule),
    tournament: false,
    title: inn.name,
    room: inn.room,
    marks: tour.marks,
    perks: tablePerks(tour, settings, { houseRule: inn.houseRule }),
    depth,
  };
}

/** A special round from an event (Hocketse, police check …), stored in tour.station.special. */
export function specialRoundConfig(tour: TourState, special: NonNullable<StationState["special"]>, settings: PerkSettings, title: string): RoundConfig {
  return {
    seed: roundSeed(tour, tour.at, `special:${special.opponents.join(",")}:${tour.route.length}`),
    opponents: special.opponents,
    houseRule: special.houseRule,
    games: special.games,
    tournament: false,
    title,
    room: "village",
    marks: tour.marks,
    perks: tablePerks(tour, settings, { houseRule: special.houseRule }),
    depth: DIFFICULTY_DEFS[tour.difficulty].depth,
  };
}

/**
 * What a puzzle station gets from the tour (contract §4.7–4.9, §4.12), named as the Rätsel stations take it
 * (createChessStation / createSudokuStation options).
 */
export interface PuzzleConfig {
  /** Attempts for problems and chess: 3, +1 with the Airedale (+2 with the dog whistle). */
  attempts: number;
  /** Hints per problem or chess puzzle (Lupe): which card or piece is to move. */
  hints: number;
  /** Sudoku cells solved in advance (Bleistiftstummel: 2). */
  presolved: number;
  /** Sudoku cells he may have for free (Airedale: 1, 2 with the dog whistle). */
  freeCells: number;
}

export function puzzleConfig(tour: Pick<TourState, "souvenirs" | "dogs">): PuzzleConfig {
  const terrier = hasDog(tour, "airedale") ? dogPower(tour) : 0;
  return {
    attempts: 3 + terrier,
    hints: hasSouvenir(tour, "magnifier") ? 1 : 0,
    presolved: hasSouvenir(tour, "pencil") ? 2 : 0,
    freeCells: terrier,
  };
}
