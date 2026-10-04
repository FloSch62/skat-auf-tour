import { test } from "node:test";
import assert from "node:assert/strict";
import {
  START_FEN, inCheck, isCheckmate, isStalemate, legalMoves, makeMove, moveToUci, parseFen, parseSquare, parseUci,
  perft, squareName, toFen,
} from "./rules.ts";
import { germanLine, toGerman } from "./notation.ts";

const KIWIPETE = "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1";

// Reference counts from the Chess Programming Wiki "Perft Results".
const PERFT: [string, string, number[]][] = [
  ["start", START_FEN, [20, 400, 8902, 197281]],
  ["kiwipete", KIWIPETE, [48, 2039, 97862]],
  ["position 3", "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1", [14, 191, 2812, 43238]],
  ["position 4", "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1", [6, 264, 9467]],
  ["position 4 mirrored", "r2q1rk1/pP1p2pp/Q4n2/bbp1p3/Np6/1B3NBn/pPPP1PPP/R3K2R b KQ - 0 1", [6, 264, 9467]],
  ["position 5", "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8", [44, 1486, 62379]],
  ["position 6", "r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10", [46, 2079, 89890]],
];

for (const [name, fen, counts] of PERFT) {
  test(`perft ${name} depth 1–${counts.length}`, () => {
    const pos = parseFen(fen);
    counts.forEach((n, i) => assert.equal(perft(pos, i + 1), n, `${name} depth ${i + 1}`));
  });
}

test("FEN round trips", () => {
  const fens = [
    START_FEN,
    KIWIPETE,
    "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1",
    "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2",
    "r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24",
    "4k3/8/8/8/8/8/8/4K2R w K - 12 40",
    "8/8/8/8/8/8/8/K6k b - - 99 120",
  ];
  for (const f of fens) assert.equal(toFen(parseFen(f)), f);
});

test("FEN errors are reported", () => {
  assert.throws(() => parseFen("8/8/8 w - - 0 1"));
  assert.throws(() => parseFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNX w KQkq - 0 1"));
  assert.throws(() => parseFen("rnbqkbnr/pppppppp/9/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"));
});

test("squares and UCI", () => {
  assert.equal(parseSquare("a1"), 0);
  assert.equal(parseSquare("h8"), 63);
  assert.equal(squareName(28), "e4");
  const pos = parseFen(START_FEN);
  const m = parseUci(pos, "e2e4");
  assert.ok(m);
  assert.equal(moveToUci(m!), "e2e4");
  assert.equal(parseUci(pos, "e2e5"), null);
  assert.equal(parseUci(pos, "xyz"), null);
  const after = makeMove(pos, m!);
  assert.equal(toFen(after), "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1");
});

test("castling, en passant and promotion are played correctly", () => {
  let pos = parseFen("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
  pos = makeMove(pos, parseUci(pos, "e1g1")!);
  assert.equal(toFen(pos), "r3k2r/8/8/8/8/8/8/R4RK1 b kq - 1 1");
  pos = makeMove(pos, parseUci(pos, "e8c8")!);
  assert.equal(toFen(pos), "2kr3r/8/8/8/8/8/8/R4RK1 w - - 2 2");

  let ep = parseFen("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1");
  ep = makeMove(ep, parseUci(ep, "e5d6")!);
  assert.equal(toFen(ep), "4k3/8/3P4/8/8/8/8/4K3 b - - 0 1");

  let pr = parseFen("4k3/1P6/8/8/8/8/8/4K3 w - - 0 1");
  assert.equal(legalMoves(pr).filter((m) => m.promo).length, 4);
  pr = makeMove(pr, parseUci(pr, "b7b8n")!);
  assert.equal(toFen(pr), "1N2k3/8/8/8/8/8/8/4K3 b - - 0 1");
});

test("cannot castle through check or out of check", () => {
  const through = parseFen("4k3/8/8/8/8/8/5r2/R3K2R w KQ - 0 1");
  const ucis = legalMoves(through).map(moveToUci);
  assert.ok(!ucis.includes("e1g1"), "f1 is attacked");
  assert.ok(ucis.includes("e1c1"), "the queen side is free: the f2 rook does not attack d1 or c1");
  const check = parseFen("4k3/8/8/8/8/8/4r3/R3K2R w KQ - 0 1");
  assert.ok(!legalMoves(check).some((m) => m.flags & 2), "no castling out of check");
});

test("check, mate and stalemate", () => {
  const mate = parseFen("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3");
  assert.ok(inCheck(mate));
  assert.ok(isCheckmate(mate));
  const stale = parseFen("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
  assert.ok(isStalemate(stale));
  assert.ok(!isCheckmate(stale));
});

test("German notation", () => {
  const pos = parseFen(START_FEN);
  const line = ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6", "f3g5", "d7d5", "e4d5", "f6d5", "g5f7"];
  let p = pos;
  const moves = line.map((u) => {
    const m = parseUci(p, u)!;
    p = makeMove(p, m);
    return m;
  });
  assert.deepEqual(germanLine(pos, moves), ["e4", "e5", "Sf3", "Sc6", "Lc4", "Sf6", "Sg5", "d5", "exd5", "Sxd5", "Sxf7"]);

  const fool = parseFen("rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2");
  assert.equal(toGerman(fool, parseUci(fool, "d8h4")!), "Dh4#");

  const castle = parseFen("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
  assert.equal(toGerman(castle, parseUci(castle, "e1g1")!), "0-0");
  assert.equal(toGerman(castle, parseUci(castle, "e1c1")!), "0-0-0");

  const rooks = parseFen("4k3/8/8/8/8/8/4K3/R6R w - - 0 1");
  assert.equal(toGerman(rooks, parseUci(rooks, "a1d1")!), "Tad1");
  assert.equal(toGerman(rooks, parseUci(rooks, "h1h8")!), "Th8+");

  const knights = parseFen("4k3/8/8/1N6/8/1N6/8/4K3 w - - 0 1");
  assert.equal(toGerman(knights, parseUci(knights, "b5d4")!), "S5d4");

  const promo = parseFen("8/1P2k3/8/8/8/8/8/4K3 w - - 0 1");
  assert.equal(toGerman(promo, parseUci(promo, "b7b8q")!), "b8D");

  const ep = parseFen("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1");
  assert.equal(toGerman(ep, parseUci(ep, "e5d6")!), "exd6");
});
