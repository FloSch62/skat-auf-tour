// Measured play of every character (docs/balance-skat.md, "Personas against two medium figures", 2026-10-04: 240
// deals each against two times die Wirtin Lore at depth 1). The headless tour runs draw Skat rounds from these
// numbers (src/tour/sim.ts stubSkatModel) until a whole tour can be played with the real AI. Pure data.
import type { CharacterId } from "../game/ids.ts";

export interface SeatProfile {
  /** Share of its seat-games in which it became declarer. */
  declares: number;
  /** Share of its declared games it won. */
  won: number;
  /** Shares of its declared games: Grand, Null, Hand. */
  grand: number;
  nul: number;
  hand: number;
  /** Average list points per game (Seeger-Fabian) against two medium figures. */
  list: number;
}

const p = (declares: number, won: number, grand: number, nul: number, hand: number, list: number): SeatProfile => ({
  declares: declares / 100, won: won / 100, grand: grand / 100, nul: nul / 100, hand: hand / 100, list,
});

export const MEASURED: Record<CharacterId, SeatProfile> = {
  maurer: p(16.7, 77.5, 30, 0, 20, 14.3),
  zocker: p(40.4, 71.1, 19, 4, 10, 16.7),
  rechnerin: p(29.2, 75.7, 21, 0, 4, 17.8),
  nullfuchs: p(28.3, 69.1, 24, 6, 12, 12.2),
  grandspieler: p(37.9, 67.0, 45, 3, 14, 11.3),
  neuling: p(29.6, 54.9, 27, 1, 8, 2.6),
  schwaetzer: p(39.6, 57.9, 25, 6, 6, 3.3),
  lehrer: p(28.3, 76.5, 25, 1, 4, 16.6),
  schlitzohr: p(30.8, 75.7, 27, 1, 9, 16.5),
  kommandant: p(37.1, 74.2, 17, 3, 7, 16.9),
  wirtin: p(31.5, 78.4, 35, 2, 10, 21.6),
  altmeister: p(29.2, 75.7, 24, 1, 4, 17.4),
  wengerter: p(28.8, 73.9, 25, 0, 4, 16.2),
  muellerin: p(29.2, 82.9, 24, 1, 4, 20.6),
  bahner: p(30.8, 77.0, 26, 0, 4, 18.2),
  klosterwirt: p(29.2, 72.9, 24, 1, 4, 14.1),
  floesser: p(36.3, 70.1, 22, 6, 8, 13.3),
  brenner: p(29.2, 82.9, 24, 1, 4, 21.8),
  wasenwirt: p(30.8, 78.4, 24, 0, 4, 19.2),
  schaffnerin: p(29.2, 80.0, 27, 1, 4, 19.1),
  wachtmeister: p(28.3, 80.9, 24, 1, 12, 20.0),
  anwaerter: p(29.6, 54.9, 30, 3, 8, 2.0),
  "biker-manne": p(33.3, 67.5, 24, 4, 10, 11.8),
  "biker-uschi": p(30.8, 82.4, 24, 0, 4, 21.5),
  meister: p(28.3, 72.1, 24, 1, 12, 14.4),
  lehrling: p(29.6, 52.1, 27, 1, 8, -0.2),
  schultes: p(42.5, 66.7, 26, 7, 12, 12.3),
  amtsbote: p(30.8, 79.7, 24, 0, 9, 19.7),
};

/** The medium reference (die Wirtin Lore): list points per game of a medium figure at a medium table. */
export const MEDIUM_LIST = MEASURED.wirtin.list;

/**
 * Human player profiles for the headless runs. The default is a good club player, between the strong and the very
 * strong figures (their averages: declares 30 %, wins 77.5 %, 17.8 and 18.6 list points per game).
 */
export const PLAYER_PROFILES = {
  casual: p(30, 70, 25, 2, 8, 12),
  club: p(30, 75, 25, 1, 6, 16),
  good: p(30, 77.5, 25, 1, 6, 18.2),
  tournament: p(31, 80, 27, 1, 6, 21),
} as const satisfies Record<string, SeatProfile>;
export type PlayerProfileId = keyof typeof PLAYER_PROFILES;
