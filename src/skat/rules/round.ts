// A round at the three-table (contract §4.3, §4.6): N games, the dealer rotates clockwise after every game (a passed
// game counts as a game, ISkO 3.3.7 / SkWO 9.4), the extended Seeger-Fabian Liste with bonuses, the Skatkasse. The
// round is resumable after every single game: `RoundProgress` is plain JSON, and the next deal is derived from
// `config.seed`, the game index and the redeals used for that game.
import { hashString } from "../../core/rng.ts";
import type { GameRecord, ListBonus, RoundConfig, RoundProgress, RoundResult } from "../../game/types.ts";
import type { Seat } from "./deal.ts";
import { newGame } from "./game.ts";
import type { GameState } from "./game.ts";
import { NO_BONUS, bonusFor, houseRuleEffects } from "./list.ts";

export function startRound(config: RoundConfig): RoundProgress {
  return { config, games: [], list: [0, 0, 0], kitty: 0, kittyPaid: 0, used: {} };
}

/** Index of the next game (= games played so far). */
export function gameIndex(p: RoundProgress): number {
  return p.games.length;
}

export function isRoundOver(p: RoundProgress): boolean {
  return p.games.length >= p.config.games;
}

/** Dealer of the first game: seat 2 with the forehand perk (the player then sits in Vorhand), else from the seed. */
export function firstDealer(config: RoundConfig): Seat {
  if (config.perks.forehandFirst) return 2;
  return (hashString(`dealer/${config.seed}`) % 3) as Seat;
}

export function dealerOf(p: RoundProgress, index = gameIndex(p)): Seat {
  return ((firstDealer(p.config) + index) % 3) as Seat;
}

export function forehandOfGame(p: RoundProgress, index = gameIndex(p)): Seat {
  return ((dealerOf(p, index) + 1) % 3) as Seat;
}

function redealsFor(p: RoundProgress, index: number): number {
  return p.used[`redeal:${index}`] ?? 0;
}

/** Seed of the deal for a game (changes only with a redeal of that game). */
export function dealSeed(p: RoundProgress, index = gameIndex(p)): number {
  return hashString(`${p.config.seed}/${index}/${redealsFor(p, index)}`);
}

export function redealsLeft(p: RoundProgress): number {
  return Math.max(0, p.config.perks.redeals - (p.used.redeal ?? 0));
}

export function peeksLeft(p: RoundProgress): number {
  return Math.max(0, p.config.perks.skatPeeks - (p.used.peek ?? 0));
}

/**
 * Use a redeal for the next game ("neu geben lassen", before bidding). Save the returned progress right away so a
 * reload cannot bring the old deal back. The caller then starts the game again with `startGame`.
 */
export function useRedeal(p: RoundProgress): RoundProgress {
  if (redealsLeft(p) <= 0) throw new Error("no redeal left");
  if (isRoundOver(p)) throw new Error("round is over");
  const i = gameIndex(p);
  return {
    ...p,
    used: { ...p.used, redeal: (p.used.redeal ?? 0) + 1, [`redeal:${i}`]: redealsFor(p, i) + 1 },
  };
}

/** The next game of the round, dealt and ready for bidding. */
export function startGame(p: RoundProgress): GameState {
  if (isRoundOver(p)) throw new Error("round is over");
  const e = houseRuleEffects(p.config.houseRule);
  return newGame({
    seed: dealSeed(p),
    dealer: dealerOf(p),
    rules: e.rules,
    peeks: [peeksLeft(p), 0, 0],
    takeBacks: [p.config.perks.takeBacks, 0, 0],
  });
}

/**
 * List bonus per seat. The player (seat 0) gets `perks.listBonus`, which the tour has already merged from beer mats
 * and the house-rule evening. The two opponents get only the evening bonus of the house rule (an evening is a table
 * rule for everyone; beer mats are the player's own).
 */
export function bonusForSeat(config: RoundConfig, seat: Seat): ListBonus {
  if (seat === 0) return config.perks.listBonus;
  return houseRuleEffects(config.houseRule).listBonus ?? NO_BONUS;
}

/** Turn a finished game into a `GameRecord` and the updated progress (Liste, Skatkasse, used perks). */
export function finishGame(p: RoundProgress, s: GameState): { progress: RoundProgress; record: GameRecord } {
  const r = s.result;
  if (s.phase !== "done" || !r) throw new Error("game is not finished");
  const config = p.config;
  const d = r.declaration;
  const list: [number, number, number] = [r.list[0], r.list[1], r.list[2]];
  if (r.type === "declared" && d && r.declarer !== null) {
    const facts = { declarer: r.declarer, kind: d.kind, hand: d.hand, won: r.won, schneider: r.won && r.schneider };
    for (const seat of [0, 1, 2] as Seat[]) list[seat] += bonusFor(facts, seat, bonusForSeat(config, seat));
  }
  const record: GameRecord = {
    seed: s.seed,
    forehand: s.forehand,
    declarer: r.type === "declared" ? r.declarer : null,
    kind: r.type === "passed" ? "passed" : r.type === "ramsch" ? "ramsch" : d!.kind,
    hand: d?.hand ?? false,
    ouvert: d?.ouvert ?? false,
    schneiderAnnounced: d?.schneiderAnnounced ?? false,
    schwarzAnnounced: d?.schwarzAnnounced ?? false,
    schneider: r.schneider,
    schwarz: r.schwarz,
    matadors: r.matadors?.count ?? 0,
    bid: r.type === "declared" ? r.bid : 0,
    won: r.won,
    overbid: r.overbid,
    points: r.type === "declared" ? r.declarerPoints : r.type === "ramsch" ? r.value : 0,
    value: r.written,
    kontra: r.kontra,
    list,
  };
  if (r.matadors) record.withTops = r.matadors.withTops;
  if (r.ramsch) record.ramsch = { ...r.ramsch, losers: [...r.ramsch.losers], jungfrau: [...r.ramsch.jungfrau] };

  // Skatkasse: every lost game pays the stake (declarer who lost; in Ramsch every loser). The player pays only what he
  // has at the table; opponents always pay.
  const stake = houseRuleEffects(config.houseRule).kittyStake;
  let kitty = p.kitty;
  let kittyPaid = p.kittyPaid;
  if (stake > 0) {
    const payers: Seat[] =
      r.type === "declared" && !r.won && r.declarer !== null ? [r.declarer] : r.type === "ramsch" ? r.ramsch!.losers : [];
    for (const seat of payers) {
      const pay = seat === 0 ? Math.max(0, Math.min(stake, config.marks - kittyPaid)) : stake;
      kitty += pay;
      if (seat === 0) kittyPaid += pay;
    }
  }
  const peeksUsed = s.history.filter((a) => a.type === "peek" && a.seat === 0).length;
  const used = peeksUsed ? { ...p.used, peek: (p.used.peek ?? 0) + peeksUsed } : p.used;
  const progress: RoundProgress = {
    ...p,
    games: [...p.games, record],
    list: [p.list[0] + list[0], p.list[1] + list[1], p.list[2] + list[2]],
    kitty,
    kittyPaid,
    used,
  };
  return { progress, record };
}

/** Player's place: 1 + number of opponents strictly ahead (ties in the player's favour). */
export function placeOf(list: readonly [number, number, number]): 1 | 2 | 3 {
  return (1 + (list[1] > list[0] ? 1 : 0) + (list[2] > list[0] ? 1 : 0)) as 1 | 2 | 3;
}

/** Final result of the round. The round winner takes the Skatkasse; `marks` = Kasse won − Mark paid in. */
export function roundResult(p: RoundProgress): RoundResult {
  const place = placeOf(p.list);
  return {
    list: [p.list[0], p.list[1], p.list[2]],
    place,
    games: [...p.games],
    marks: (place === 1 ? p.kitty : 0) - p.kittyPaid,
  };
}
