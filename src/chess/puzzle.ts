// Puzzle runner (pure). A Lichess puzzle: FEN + UCI line; the first move is the opponent's setup move, played
// automatically. The player must find each of his moves of the line; the opponent's replies come from the line
// (no engine). Any move that gives mate is accepted (Lichess convention: alternative mates count).
//
// A wrong move costs one attempt. It is shown on the board and then taken back: the position returns to just
// before the wrong move, so moves already found stay on the board (clearer for a beginner than starting over).
import type { ChessPuzzle } from "../game/types.ts";
import {
  givesMate, legalMoves, makeMove, parseFen, parseUci, sameMove, moveToUci,
  type Color, type Move, type Position,
} from "./rules.ts";
import { toGerman } from "./notation.ts";

export type ChessLevel = "easy" | "medium" | "hard";

export type RunStatus =
  /** The player is to move. */
  | "playing"
  /** The player's move was right; the opponent's reply is due (call reply()). */
  | "reply"
  /** The player's move was wrong; it is still on the board (call takeBack()). */
  | "wrong"
  | "solved"
  /** Out of attempts (the last wrong move is still on the board). */
  | "failed";

export interface PlayedMove {
  move: Move;
  /** German notation ("Sf3", "Dxh7#"). */
  san: string;
  uci: string;
  by: "setup" | "player" | "opponent";
  color: Color;
  /** Full move number of this move (for "12. Sf3" / "12... Sf6"). */
  moveNo: number;
}

export type TryResult = "correct" | "solved" | "wrong" | "failed";

export class PuzzleRun {
  readonly initial: Position;
  readonly setup: Move;
  /** Position after the setup move: the player is to move. */
  readonly start: Position;
  readonly player: Color;
  /** The whole line after the setup move as legal moves (player, opponent, player, …). */
  readonly line: Move[];
  /** Number of player moves in the line (mate in N → N). */
  readonly playerMoves: number;
  /** Mate in N when the puzzle is a mate (from themes or the final position), else 0. */
  readonly mateIn: number;

  position: Position;
  /** Index into `line` of the next expected move. */
  index = 0;
  status: RunStatus = "playing";
  /** Wrong moves so far. */
  mistakes = 0;
  /** Moves on the board since the FEN, including the setup move. */
  history: PlayedMove[] = [];
  /** The wrong move currently shown (status wrong/failed). */
  wrongMove: PlayedMove | null = null;
  private before: Position | null = null;
  readonly puzzle: ChessPuzzle;
  /** Allowed attempts (3; the Airedale gives one more). */
  readonly attempts: number;

  constructor(puzzle: ChessPuzzle, attempts = 3) {
    this.puzzle = puzzle;
    this.attempts = Math.max(1, attempts);
    this.initial = parseFen(puzzle.fen);
    const ms = puzzle.moves;
    if (ms.length < 2) throw new Error(`puzzle ${puzzle.id}: line too short`);
    const setup = parseUci(this.initial, ms[0]);
    if (!setup) throw new Error(`puzzle ${puzzle.id}: illegal setup move ${ms[0]}`);
    this.setup = setup;
    this.start = makeMove(this.initial, setup);
    this.player = this.start.turn;
    const line: Move[] = [];
    let p = this.start;
    for (const u of ms.slice(1)) {
      const m = parseUci(p, u);
      if (!m) throw new Error(`puzzle ${puzzle.id}: illegal move ${u}`);
      line.push(m);
      p = makeMove(p, m);
    }
    this.line = line;
    this.playerMoves = Math.ceil(line.length / 2);
    const theme = puzzle.themes.find((t) => /^mateIn\d$/.test(t));
    const endsInMate = line.length % 2 === 1 && legalMoves(p).length === 0;
    this.mateIn = theme ? Number(theme.slice(6)) : endsInMate ? this.playerMoves : 0;
    this.position = this.start;
    this.history.push(this.record(this.initial, setup, "setup"));
  }

  get attemptsLeft(): number {
    return Math.max(0, this.attempts - this.mistakes);
  }

  /** The attempt the player is on (1-based); after solving, the attempt that solved it. */
  get attemptNo(): number {
    return Math.min(this.attempts, this.mistakes + 1);
  }

  get done(): boolean {
    return this.status === "solved" || this.status === "failed";
  }

  /** Legal moves of the player from a square (empty unless the player is to move). */
  movesFrom(sq: number): Move[] {
    if (this.status !== "playing") return [];
    return legalMoves(this.position).filter((m) => m.from === sq);
  }

  /** The player plays a move (must be legal in the current position). */
  play(m: Move): TryResult {
    if (this.status !== "playing") throw new Error(`play() while ${this.status}`);
    const expected = this.line[this.index];
    const mate = givesMate(this.position, m);
    const right = sameMove(m, expected) || mate;
    const rec = this.record(this.position, m, "player");
    if (!right) {
      this.mistakes++;
      this.before = this.position;
      this.position = makeMove(this.position, m);
      this.wrongMove = rec;
      this.status = this.mistakes >= this.attempts ? "failed" : "wrong";
      return this.status === "failed" ? "failed" : "wrong";
    }
    this.history.push(rec);
    this.position = makeMove(this.position, m);
    this.index++;
    if (mate || this.index >= this.line.length) {
      this.status = "solved";
      return "solved";
    }
    this.status = "reply";
    return "correct";
  }

  /** The opponent's reply after a correct move; plays it and returns it. */
  reply(): PlayedMove {
    if (this.status !== "reply") throw new Error(`reply() while ${this.status}`);
    const m = this.line[this.index];
    const rec = this.record(this.position, m, "opponent");
    this.history.push(rec);
    this.position = makeMove(this.position, m);
    this.index++;
    this.status = this.index >= this.line.length ? "solved" : "playing";
    return rec;
  }

  /** Take back the wrong move shown on the board. */
  takeBack() {
    if (this.status !== "wrong" && this.status !== "failed") return;
    if (this.before) this.position = this.before;
    this.before = null;
    this.wrongMove = null;
    if (this.status === "wrong") this.status = "playing";
  }

  /** The complete solution from the puzzle start (after the setup move), in German notation. */
  solution(): PlayedMove[] {
    const out: PlayedMove[] = [];
    let p = this.start;
    this.line.forEach((m, i) => {
      out.push(this.record(p, m, i % 2 === 0 ? "player" : "opponent"));
      p = makeMove(p, m);
    });
    return out;
  }

  /** The player's next move of the solution (for showing it). */
  expected(): Move | null {
    return this.line[this.index] ?? null;
  }

  private record(pos: Position, m: Move, by: PlayedMove["by"]): PlayedMove {
    return { move: m, san: toGerman(pos, m), uci: moveToUci(m), by, color: pos.turn, moveNo: pos.fullmove };
  }
}

/** The one-sentence task: "Weiß zieht und setzt matt in 2 Zügen." */
export function taskSentence(run: PuzzleRun): string {
  const side = run.player === 0 ? "Weiß" : "Schwarz";
  if (run.mateIn === 1) return `${side} zieht und setzt matt.`;
  if (run.mateIn > 1) return `${side} zieht und setzt matt in ${run.mateIn} Zügen.`;
  return `${side} zieht und gewinnt Material.`;
}

/** A gentle hint from the puzzle themes (non-mate puzzles), or "". */
export function themeHint(p: ChessPuzzle): string {
  const t = new Set(p.themes);
  const hints: [string, string][] = [
    ["fork", "Tipp: eine Gabel."],
    ["pin", "Tipp: eine Fesselung."],
    ["skewer", "Tipp: ein Spieß."],
    ["discoveredAttack", "Tipp: ein Abzugsangriff."],
    ["doubleCheck", "Tipp: ein Doppelschach."],
    ["hangingPiece", "Tipp: da steht etwas ungedeckt."],
    ["trappedPiece", "Tipp: eine Figur sitzt in der Falle."],
    ["deflection", "Tipp: eine Ablenkung."],
    ["attraction", "Tipp: eine Hinlenkung."],
    ["capturingDefender", "Tipp: schlag den Verteidiger."],
    ["xRayAttack", "Tipp: ein Röntgenangriff."],
    ["intermezzo", "Tipp: ein Zwischenzug."],
  ];
  return hints.find(([theme]) => t.has(theme))?.[1] ?? "";
}

// ─── puzzle files (public/puzzles/chess-<level>.json) ──────────────────────────────────────────────────

export interface ChessPuzzleFile {
  source?: string;
  level?: string;
  fields: string[];
  puzzles: (string | number)[][];
}

/** Decode the compact puzzle file written by tools/chess/select-puzzles.py. */
export function decodePuzzles(file: ChessPuzzleFile): ChessPuzzle[] {
  const f = file.fields;
  const at = (name: string) => f.indexOf(name);
  const [iId, iFen, iMoves, iRating, iThemes] = [at("id"), at("fen"), at("moves"), at("rating"), at("themes")];
  return file.puzzles.map((row) => ({
    id: String(row[iId]),
    fen: String(row[iFen]),
    moves: String(row[iMoves]).split(" ").filter(Boolean),
    rating: Number(row[iRating]) || 0,
    themes: iThemes >= 0 ? String(row[iThemes]).split(" ").filter(Boolean) : [],
  }));
}

/** Pick a puzzle by seed (deterministic). */
export function pickPuzzle(puzzles: ChessPuzzle[], seed: number): ChessPuzzle {
  if (!puzzles.length) throw new Error("no puzzles");
  // Knuth's multiplicative hash spreads consecutive seeds over the whole (rating-sorted) list.
  const i = Math.imul(seed >>> 0, 2654435761) >>> 0;
  return puzzles[i % puzzles.length];
}

/**
 * A few built-in puzzles per level (from the same Lichess database, CC0) for when the puzzle file cannot be
 * loaded. The station never breaks.
 */
export const FALLBACK_PUZZLES: Record<ChessLevel, ChessPuzzle[]> = {
  easy: [
    { id: "9ZwKX", fen: "rn2kbnr/pp4pp/2p1B1b1/4N3/3P1PP1/2N5/PP1K1q1P/R1BQ3R w kq - 3 13", moves: ["c3e2", "f8b4"], rating: 894, themes: ["mate", "mateIn1", "oneMove", "opening"] },
    { id: "jeOUB", fen: "2kr3r/bp3Rp1/p1pp3p/P7/NQP1P3/6Bq/1P2b2P/R6K b - - 0 23", moves: ["h3g4", "b4b7"], rating: 1054, themes: ["mate", "mateIn1", "middlegame", "oneMove", "queensideAttack"] },
    { id: "onUTb", fen: "6rk/R5pp/1p6/8/1P3QP1/P2q3K/7P/8 w - - 1 37", moves: ["h3h4", "g7g5", "f4g5", "g8g5"], rating: 1172, themes: ["advantage", "endgame", "fork", "short"] },
  ],
  medium: [
    { id: "LOyZV", fen: "3k1N1r/1p3ppp/8/2p5/3n4/3q4/P1p1NPPP/R1Q2K1R w - - 2 18", moves: ["c1e3", "d3d1", "a1d1", "c2d1q"], rating: 1242, themes: ["advancedPawn", "mate", "mateIn2", "middlegame", "promotion", "short"] },
    { id: "QaCea", fen: "3r1r2/p3k1pp/1npNp3/1p2P3/8/P3PR2/1P2K1PP/5R2 b - - 6 25", moves: ["h7h6", "f3f7", "f8f7", "f1f7"], rating: 1383, themes: ["collinearMove", "endgame", "hookMate", "mate", "mateIn2", "short"] },
    { id: "nW80j", fen: "3k1r1r/np6/1q1P4/p2Q1B2/3P4/P3P3/1P4PP/5RK1 b - - 0 34", moves: ["b6c6", "d5a5", "b7b6", "a5a7"], rating: 1439, themes: ["crushing", "fork", "master", "middlegame", "short"] },
  ],
  hard: [
    { id: "EQr39", fen: "5rk1/5ppp/1b2p3/1N2n1B1/1Q6/3q3P/5PP1/2R3K1 b - - 0 27", moves: ["d3e2", "b4f8", "g8f8", "c1c8", "b6d8", "c8d8"], rating: 1237, themes: ["attraction", "long", "mate", "mateIn3", "middlegame", "pillsburysMate", "sacrifice"] },
    { id: "Za1uR", fen: "rn4k1/ppp2rpp/5q2/8/8/2P5/P1P1QPPP/2KR2NR b - - 0 13", moves: ["f6c3", "d1d8", "f7f8", "e2e6", "g8h8", "d8f8"], rating: 1393, themes: ["backRankMate", "deflection", "long", "mate", "mateIn3", "middlegame", "pin"] },
    { id: "hajin", fen: "5rk1/1pp2Bpp/p2p4/6Q1/1P6/8/P4PPP/qb2R1K1 b - - 0 19", moves: ["f8f7", "e1e8", "f7f8", "g5d5", "g8h8", "e8f8"], rating: 1493, themes: ["backRankMate", "deflection", "endgame", "long", "mate", "mateIn3"] },
  ],
};
