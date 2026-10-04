// Stammtisch problems (contract §4.7): the data format shared by the generator (AI workstream, tools/skat-problems)
// and the station scene (table workstream). Cards are rule-engine card indices (0–31, src/skat/rules/cards.ts).
// Bundled as public/puzzles/skat-problems.json: { version: 1, problems: SkatProblemData[] }.
import type { Declaration } from "../rules/index.ts";

export interface EndgameProblem {
  id: string;
  type: "endgame";
  difficulty: 1 | 2 | 3;
  /** The game being played; the player always sits at the bottom (seat 0). */
  declaration: Declaration;
  /** Declarer seat (0 = the player is declarer, else he defends with seat 1 or 2's partner). */
  declarer: 0 | 1 | 2;
  /** All remaining hands, open (endgames are shown with open cards). Seat 0 = player. */
  hands: [number[], number[], number[]];
  /** Cards already lying in the current trick, in play order, and who led it. */
  trick: number[];
  leader: 0 | 1 | 2;
  /** Card points already won: [declarer party, defenders], including the skat for the declarer. */
  points: [number, number];
  /** What the player must achieve with best play from everyone. */
  goal: "win" | "schneider" | "schwarz" | "defend" | "noTrick";
  /** The only card that achieves the goal (verified by the open-card solver). */
  solution: number;
  /** One or two German sentences shown after solving or giving up. */
  explanation: string;
}

export interface DiscardProblem {
  id: string;
  type: "discard";
  difficulty: 1 | 2 | 3;
  /** Twelve cards after picking up the skat. */
  cards: number[];
  declaration: Declaration;
  /** The two cards to lay away (sorted ascending); clearly better than the second-best pair. */
  solution: [number, number];
  explanation: string;
}

export interface BidProblem {
  id: string;
  type: "bid";
  difficulty: 1 | 2 | 3;
  /** Ten cards. */
  cards: number[];
  /** 0 Vorhand, 1 Mittelhand, 2 Hinterhand. */
  position: 0 | 1 | 2;
  /** Highest sensible bid range (inclusive bid values from BID_VALUES); any value inside counts as right. */
  range: [number, number];
  explanation: string;
}

export type SkatProblemData = EndgameProblem | DiscardProblem | BidProblem;

export interface SkatProblemPack {
  version: 1;
  problems: SkatProblemData[];
}
