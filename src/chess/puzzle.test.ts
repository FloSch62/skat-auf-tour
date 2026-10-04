import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { ChessPuzzle } from "../game/types.ts";
import { boardKey, isCheckmate, legalMoves, makeMove, parseFen, parseUci, toFen } from "./rules.ts";
import { FALLBACK_PUZZLES, PuzzleRun, decodePuzzles, pickPuzzle, taskSentence, type ChessLevel, type ChessPuzzleFile } from "./puzzle.ts";

// A back-rank mate in 1 (setup: …a6, then Td8#).
const BACK_RANK: ChessPuzzle = {
  id: "test-backrank",
  fen: "6k1/p4ppp/8/8/8/8/5PPP/3R2K1 b - - 0 1",
  moves: ["a7a6", "d1d8"],
  rating: 600,
  themes: ["mate", "mateIn1", "backRankMate"],
};

// A knight fork in two moves: setup …Kd8, then Se6+ (king and rook), …Kd7, Sxf8+.
const FORK: ChessPuzzle = {
  id: "test-fork",
  fen: "5r2/4k3/8/2N5/8/8/8/4K3 b - - 0 1",
  moves: ["e7d8", "c5e6", "d8d7", "e6f8"],
  rating: 900,
  themes: ["fork", "short"],
};

test("setup move is played automatically and the player sits on the other side", () => {
  const run = new PuzzleRun(BACK_RANK);
  assert.equal(run.player, 0);
  assert.equal(run.history.length, 1);
  assert.equal(run.history[0].by, "setup");
  assert.equal(run.history[0].san, "a6");
  assert.equal(toFen(run.position), toFen(run.start));
  assert.equal(run.mateIn, 1);
  assert.equal(taskSentence(run), "Weiß zieht und setzt matt.");
});

test("a right move solves a mate in 1", () => {
  const run = new PuzzleRun(BACK_RANK);
  assert.equal(run.play(parseUci(run.position, "d1d8")!), "solved");
  assert.equal(run.status, "solved");
  assert.equal(run.attemptNo, 1);
  assert.equal(run.history.at(-1)!.san, "Td8#");
});

test("wrong moves cost attempts and are taken back to just before the wrong move", () => {
  const run = new PuzzleRun(FORK, 3);
  assert.equal(run.mateIn, 0);
  assert.equal(taskSentence(run), "Weiß zieht und gewinnt Material.");
  const before = toFen(run.position);
  assert.equal(run.play(parseUci(run.position, "c5b7")!), "wrong");
  assert.equal(run.status, "wrong");
  assert.equal(run.wrongMove?.san, "Sb7+");
  assert.notEqual(toFen(run.position), before);
  run.takeBack();
  assert.equal(toFen(run.position), before);
  assert.equal(run.attemptsLeft, 2);

  assert.equal(run.play(parseUci(run.position, "c5e6")!), "correct");
  assert.equal(run.status, "reply");
  const reply = run.reply();
  assert.equal(reply.san, "Kd7");
  assert.equal(run.status, "playing");
  // a wrong second move returns to the position after the reply, not to the start
  const mid = toFen(run.position);
  assert.equal(run.play(parseUci(run.position, "e6c5")!), "wrong");
  run.takeBack();
  assert.equal(toFen(run.position), mid);
  assert.equal(run.play(parseUci(run.position, "e6f8")!), "solved");
  assert.equal(run.attemptNo, 3);
  assert.equal(run.mistakes, 2);
});

test("running out of attempts fails the puzzle", () => {
  const run = new PuzzleRun(FORK, 2);
  assert.equal(run.play(parseUci(run.position, "c5b7")!), "wrong");
  run.takeBack();
  assert.equal(run.play(parseUci(run.position, "c5a6")!), "failed");
  assert.equal(run.status, "failed");
  assert.equal(run.attemptsLeft, 0);
  run.takeBack();
  assert.equal(toFen(run.position), toFen(run.start));
  assert.equal(run.status, "failed");
  assert.deepEqual(run.solution().map((m) => m.san), ["Se6+", "Kd7", "Sxf8+"]);
});

test("an alternative mating move is accepted", () => {
  // Two rooks: both Tb8# and Tc8# mate; the line says Tb8.
  const p: ChessPuzzle = {
    id: "test-alt",
    fen: "6k1/p4ppp/8/8/8/8/1RR2PPP/6K1 b - - 0 1",
    moves: ["a7a6", "b2b8"],
    rating: 700,
    themes: ["mate", "mateIn1"],
  };
  const run = new PuzzleRun(p);
  assert.equal(run.play(parseUci(run.position, "c2c8")!), "solved");
  assert.equal(run.history.at(-1)!.san, "Tc8#");
});

test("puzzle selection by seed is deterministic and spreads", () => {
  const list = Array.from({ length: 300 }, (_, i) => ({ ...BACK_RANK, id: String(i) }));
  assert.equal(pickPuzzle(list, 3).id, pickPuzzle(list, 3).id);
  const ids = new Set(Array.from({ length: 50 }, (_, s) => pickPuzzle(list, s).id));
  assert.ok(ids.size > 40);
});

// ─── every bundled puzzle ──────────────────────────────────────────────────────────────────────────────

function validate(p: ChessPuzzle, level: string) {
  const start = parseFen(p.fen);
  let pos = start;
  for (const u of p.moves) {
    const m = parseUci(pos, u);
    assert.ok(m, `${level} ${p.id}: ${u} is not legal in ${toFen(pos)}`);
    pos = makeMove(pos, m!);
  }
  const theme = p.themes.find((t) => /^mateIn\d$/.test(t));
  if (theme) {
    const n = Number(theme.slice(6));
    assert.equal(p.moves.length, 2 * n, `${level} ${p.id}: mate in ${n} needs ${2 * n} moves`);
    assert.ok(isCheckmate(pos), `${level} ${p.id}: final position is not mate`);
  } else {
    assert.ok(legalMoves(pos).length > 0 || !isCheckmate(pos));
  }
  const run = new PuzzleRun(p);
  // replay the solution through the runner
  let k = 0;
  while (!run.done) {
    if (run.status === "reply") {
      run.reply();
      continue;
    }
    const m = run.expected()!;
    const r = run.play(m);
    assert.ok(r === "correct" || r === "solved", `${level} ${p.id}: runner rejected its own line at ${k}`);
    k++;
  }
  assert.equal(run.status, "solved");
  assert.equal(run.attemptNo, 1);
}

const LEVELS: ChessLevel[] = ["easy", "medium", "hard"];
const files = Object.fromEntries(
  LEVELS.map((l) => [l, JSON.parse(readFileSync(new URL(`../../public/puzzles/chess-${l}.json`, import.meta.url), "utf8")) as ChessPuzzleFile]),
) as Record<ChessLevel, ChessPuzzleFile>;

for (const level of LEVELS) {
  test(`bundled ${level} puzzles: 300, legal, mates are mates, distinct`, () => {
    const puzzles = decodePuzzles(files[level]);
    assert.equal(puzzles.length, 300);
    const seen = new Set<string>();
    for (const p of puzzles) {
      validate(p, level);
      const run = new PuzzleRun(p);
      const key = boardKey(run.start);
      assert.ok(!seen.has(key), `${level} ${p.id}: duplicate start position`);
      seen.add(key);
    }
    const mates = puzzles.filter((p) => p.themes.some((t) => t.startsWith("mateIn")));
    if (level === "easy") assert.ok(mates.every((p) => p.themes.includes("mateIn1")));
    if (level === "medium") assert.ok(mates.every((p) => p.themes.includes("mateIn2")));
    if (level === "hard") assert.equal(mates.filter((p) => p.themes.includes("mateIn3")).length, 300);
  });
}

test("no start position appears in two levels", () => {
  const all = new Set<string>();
  for (const level of LEVELS) {
    for (const p of decodePuzzles(files[level])) {
      const key = boardKey(new PuzzleRun(p).start);
      assert.ok(!all.has(key), `${p.id} appears twice`);
      all.add(key);
    }
  }
});

test("built-in fallback puzzles are valid", () => {
  for (const level of LEVELS) {
    assert.ok(FALLBACK_PUZZLES[level].length >= 3, `${level}: fallback puzzles`);
    for (const p of FALLBACK_PUZZLES[level]) validate(p, `fallback ${level}`);
  }
});
