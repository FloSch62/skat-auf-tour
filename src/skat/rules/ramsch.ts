// Ramsch and Schieberamsch (house rules, contract §4.4; not part of the ISkO, which forbids Ramsch at tournaments,
// SkWO 9.4). Our fixed variant (docs/notes-skat.md):
// - Played when all three pass. Only jacks are trumps (Grand order). Vorhand leads. All ten tricks are played.
// - The skat goes to the winner of the last trick.
// - Whoever has the most card points loses them as minus points in the Liste (no ±50, no +40). Two players tied for
//   the most points both lose the full amount; a three-way tie (40/40/40) scores nothing.
// - Jungfrau: every player without a trick doubles the minus points.
// - Durchmarsch: one player takes all ten tricks and gets +120 instead (nobody loses).
// - Schieberamsch: in turn (Vorhand, Mittelhand, Hinterhand) each player either picks the skat up and passes two cards
//   (no jacks) on, or shoves it on unseen ("schieben"), which doubles the game. Hinterhand's two cards form the skat.
// - Factors multiply: 2^Jungfrau × 2^shoves × Bock. Durchmarsch: 120 × 2^shoves × Bock.
import type { Seat } from "./deal.ts";

export interface RamschInput {
  /** Card points per seat including the skat (given to the last trick's winner). */
  points: readonly [number, number, number];
  tricks: readonly [number, number, number];
  /** Schieberamsch: how many players shoved the skat on unseen. */
  shoves: number;
  bock: boolean;
}

export interface RamschSettlement {
  /** Seats that lose (empty on Durchmarsch and on a three-way tie). */
  losers: Seat[];
  /** Seats without a trick (doubling). On Durchmarsch these are the two others and they do not double anything. */
  jungfrau: Seat[];
  durchmarsch: Seat | null;
  /** 2^Jungfrau × 2^shoves × Bock (Durchmarsch: 2^shoves × Bock). */
  factor: number;
  /** Signed value written for the loser(s) (negative) or the Durchmarsch player (+120 × factor); 0 when nobody loses. */
  written: number;
  /** Points the value is based on (the losers' points, 120 for Durchmarsch). */
  points: number;
  /** List change per seat. */
  list: [number, number, number];
}

export const DURCHMARSCH_POINTS = 120;

export function settleRamsch(input: RamschInput): RamschSettlement {
  const bock = input.bock ? 2 : 1;
  const shoveFactor = 2 ** input.shoves;
  const list: [number, number, number] = [0, 0, 0];
  const jungfrau = ([0, 1, 2] as Seat[]).filter((s) => input.tricks[s] === 0);
  const durchmarsch = ([0, 1, 2] as Seat[]).find((s) => input.tricks[s] === 10) ?? null;
  if (durchmarsch !== null) {
    const factor = shoveFactor * bock;
    const written = DURCHMARSCH_POINTS * factor;
    list[durchmarsch] = written;
    return { losers: [], jungfrau, durchmarsch, factor, written, points: DURCHMARSCH_POINTS, list };
  }
  const max = Math.max(...input.points);
  const losers = ([0, 1, 2] as Seat[]).filter((s) => input.points[s] === max);
  const factor = 2 ** jungfrau.length * shoveFactor * bock;
  if (losers.length === 3) return { losers: [], jungfrau, durchmarsch: null, factor, written: 0, points: max, list };
  const written = -max * factor;
  for (const s of losers) list[s] = written;
  return { losers, jungfrau, durchmarsch: null, factor, written, points: max, list };
}
