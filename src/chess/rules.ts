// Chess rules (pure, no DOM): board, legal moves with check, mate, castling, en passant and promotion; FEN and UCI.
//
// Squares are 0…63 with a1 = 0, h1 = 7, a8 = 56 (index = rank * 8 + file). A piece is a small number:
// colour * 8 + type, type 1…6 = pawn, knight, bishop, rook, queen, king; 0 is an empty square. Positions are
// immutable from the outside: makeMove returns a new Position.

export type Color = 0 | 1; // 0 white, 1 black
export const WHITE: Color = 0;
export const BLACK: Color = 1;

export const PAWN = 1;
export const KNIGHT = 2;
export const BISHOP = 3;
export const ROOK = 4;
export const QUEEN = 5;
export const KING = 6;

/** Move flags. */
export const EP = 1;
export const CASTLE = 2;
export const DOUBLE = 4;

/** Castling rights bits. */
export const WK = 1;
export const WQ = 2;
export const BK = 4;
export const BQ = 8;

export interface Position {
  /** 64 squares, a1 = 0. */
  board: Int8Array;
  turn: Color;
  castling: number;
  /** En-passant target square or -1. */
  ep: number;
  halfmove: number;
  fullmove: number;
}

export interface Move {
  from: number;
  to: number;
  /** The moving piece (colour * 8 + type). */
  piece: number;
  /** The captured piece or 0 (for en passant the captured pawn). */
  captured: number;
  /** Promotion piece type (KNIGHT…QUEEN) or 0. */
  promo: number;
  flags: number;
}

export const colorOf = (p: number): Color => (p >> 3) as Color;
export const typeOf = (p: number): number => p & 7;
export const makePiece = (c: Color, t: number): number => c * 8 + t;
export const fileOf = (sq: number): number => sq & 7;
export const rankOf = (sq: number): number => sq >> 3;

// ─── precomputed tables ─────────────────────────────────────────────────────────────────────────────────

const KNIGHT_D = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KING_D = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const ROOK_D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_D = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

function jumps(deltas: number[][]): number[][] {
  const out: number[][] = [];
  for (let sq = 0; sq < 64; sq++) {
    const f = fileOf(sq);
    const r = rankOf(sq);
    const list: number[] = [];
    for (const [df, dr] of deltas) {
      const nf = f + df;
      const nr = r + dr;
      if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) list.push(nr * 8 + nf);
    }
    out.push(list);
  }
  return out;
}

function rays(deltas: number[][]): number[][][] {
  const out: number[][][] = [];
  for (let sq = 0; sq < 64; sq++) {
    const f = fileOf(sq);
    const r = rankOf(sq);
    const dirs: number[][] = [];
    for (const [df, dr] of deltas) {
      const ray: number[] = [];
      let nf = f + df;
      let nr = r + dr;
      while (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
        ray.push(nr * 8 + nf);
        nf += df;
        nr += dr;
      }
      dirs.push(ray);
    }
    out.push(dirs);
  }
  return out;
}

const KNIGHT_T = jumps(KNIGHT_D);
const KING_T = jumps(KING_D);
const ROOK_R = rays(ROOK_D);
const BISHOP_R = rays(BISHOP_D);

// ─── squares and FEN ────────────────────────────────────────────────────────────────────────────────────

export function squareName(sq: number): string {
  return "abcdefgh"[fileOf(sq)] + String(rankOf(sq) + 1);
}

export function parseSquare(name: string): number {
  if (!/^[a-h][1-8]$/.test(name)) return -1;
  return (name.charCodeAt(1) - 49) * 8 + (name.charCodeAt(0) - 97);
}

const FEN_TYPES = " pnbrqk";

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function parseFen(fen: string): Position {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4) throw new Error(`FEN: too few fields: ${fen}`);
  const board = new Int8Array(64);
  const rows = parts[0].split("/");
  if (rows.length !== 8) throw new Error(`FEN: need 8 ranks: ${fen}`);
  for (let i = 0; i < 8; i++) {
    const rank = 7 - i;
    let file = 0;
    for (const ch of rows[i]) {
      if (ch >= "1" && ch <= "8") {
        file += ch.charCodeAt(0) - 48;
        continue;
      }
      const t = FEN_TYPES.indexOf(ch.toLowerCase());
      if (t <= 0) throw new Error(`FEN: bad piece '${ch}': ${fen}`);
      if (file > 7) throw new Error(`FEN: rank too long: ${fen}`);
      board[rank * 8 + file] = makePiece(ch === ch.toUpperCase() ? WHITE : BLACK, t);
      file++;
    }
    if (file !== 8) throw new Error(`FEN: rank ${rank + 1} has ${file} files: ${fen}`);
  }
  if (parts[1] !== "w" && parts[1] !== "b") throw new Error(`FEN: bad side to move: ${fen}`);
  let castling = 0;
  if (parts[2] !== "-") {
    for (const ch of parts[2]) {
      const bit = { K: WK, Q: WQ, k: BK, q: BQ }[ch];
      if (!bit) throw new Error(`FEN: bad castling '${ch}': ${fen}`);
      castling |= bit;
    }
  }
  const ep = parts[3] === "-" ? -1 : parseSquare(parts[3]);
  if (parts[3] !== "-" && ep < 0) throw new Error(`FEN: bad en passant: ${fen}`);
  return {
    board,
    turn: parts[1] === "w" ? WHITE : BLACK,
    castling,
    ep,
    halfmove: parts[4] !== undefined ? parseInt(parts[4], 10) || 0 : 0,
    fullmove: parts[5] !== undefined ? parseInt(parts[5], 10) || 1 : 1,
  };
}

export function toFen(pos: Position): string {
  const rows: string[] = [];
  for (let rank = 7; rank >= 0; rank--) {
    let row = "";
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const p = pos.board[rank * 8 + file];
      if (!p) {
        empty++;
        continue;
      }
      if (empty) row += String(empty);
      empty = 0;
      const ch = FEN_TYPES[typeOf(p)];
      row += colorOf(p) === WHITE ? ch.toUpperCase() : ch;
    }
    if (empty) row += String(empty);
    rows.push(row);
  }
  let c = "";
  if (pos.castling & WK) c += "K";
  if (pos.castling & WQ) c += "Q";
  if (pos.castling & BK) c += "k";
  if (pos.castling & BQ) c += "q";
  return [rows.join("/"), pos.turn === WHITE ? "w" : "b", c || "-", pos.ep >= 0 ? squareName(pos.ep) : "-", pos.halfmove, pos.fullmove].join(" ");
}

/** Piece placement and side to move only (for comparing positions). */
export function boardKey(pos: Position): string {
  return toFen(pos).split(" ").slice(0, 2).join(" ");
}

// ─── attacks ────────────────────────────────────────────────────────────────────────────────────────────

/** Is `sq` attacked by any piece of colour `by`? */
export function isAttacked(board: Int8Array, sq: number, by: Color): boolean {
  const f = fileOf(sq);
  const r = rankOf(sq);
  // pawns: a white pawn attacks diagonally upwards, so it stands one rank below the square
  const pr = by === WHITE ? r - 1 : r + 1;
  if (pr >= 0 && pr < 8) {
    const pawn = makePiece(by, PAWN);
    if (f > 0 && board[pr * 8 + f - 1] === pawn) return true;
    if (f < 7 && board[pr * 8 + f + 1] === pawn) return true;
  }
  const knight = makePiece(by, KNIGHT);
  for (const t of KNIGHT_T[sq]) if (board[t] === knight) return true;
  const king = makePiece(by, KING);
  for (const t of KING_T[sq]) if (board[t] === king) return true;
  const rook = makePiece(by, ROOK);
  const bishop = makePiece(by, BISHOP);
  const queen = makePiece(by, QUEEN);
  for (const ray of ROOK_R[sq]) {
    for (const t of ray) {
      const p = board[t];
      if (!p) continue;
      if (p === rook || p === queen) return true;
      break;
    }
  }
  for (const ray of BISHOP_R[sq]) {
    for (const t of ray) {
      const p = board[t];
      if (!p) continue;
      if (p === bishop || p === queen) return true;
      break;
    }
  }
  return false;
}

export function kingSquare(board: Int8Array, c: Color): number {
  const king = makePiece(c, KING);
  for (let sq = 0; sq < 64; sq++) if (board[sq] === king) return sq;
  return -1;
}

/** Is the side to move in check? */
export function inCheck(pos: Position): boolean {
  const k = kingSquare(pos.board, pos.turn);
  return k >= 0 && isAttacked(pos.board, k, (pos.turn ^ 1) as Color);
}

// ─── move generation ────────────────────────────────────────────────────────────────────────────────────

function mv(from: number, to: number, piece: number, captured: number, promo = 0, flags = 0): Move {
  return { from, to, piece, captured, promo, flags };
}

/** Pseudo-legal moves (own king may be left in check). */
export function pseudoMoves(pos: Position): Move[] {
  const out: Move[] = [];
  const b = pos.board;
  const us = pos.turn;
  const them = (us ^ 1) as Color;
  for (let sq = 0; sq < 64; sq++) {
    const p = b[sq];
    if (!p || colorOf(p) !== us) continue;
    const t = typeOf(p);
    if (t === PAWN) {
      const dir = us === WHITE ? 8 : -8;
      const startRank = us === WHITE ? 1 : 6;
      const promoRank = us === WHITE ? 7 : 0;
      const one = sq + dir;
      const addPawn = (to: number, captured: number, flags: number) => {
        if (rankOf(to) === promoRank) {
          for (const pr of [QUEEN, ROOK, BISHOP, KNIGHT]) out.push(mv(sq, to, p, captured, pr, flags));
        } else out.push(mv(sq, to, p, captured, 0, flags));
      };
      if (one >= 0 && one < 64 && !b[one]) {
        addPawn(one, 0, 0);
        const two = one + dir;
        if (rankOf(sq) === startRank && !b[two]) out.push(mv(sq, two, p, 0, 0, DOUBLE));
      }
      const f = fileOf(sq);
      for (const df of [-1, 1]) {
        if (f + df < 0 || f + df > 7) continue;
        const to = one + df;
        if (to < 0 || to >= 64) continue;
        const q = b[to];
        if (q && colorOf(q) === them) addPawn(to, q, 0);
        else if (!q && to === pos.ep) out.push(mv(sq, to, p, makePiece(them, PAWN), 0, EP));
      }
      continue;
    }
    if (t === KNIGHT || t === KING) {
      for (const to of t === KNIGHT ? KNIGHT_T[sq] : KING_T[sq]) {
        const q = b[to];
        if (!q) out.push(mv(sq, to, p, 0));
        else if (colorOf(q) === them) out.push(mv(sq, to, p, q));
      }
      if (t === KING) castles(pos, sq, out);
      continue;
    }
    const dirs = t === ROOK ? ROOK_R[sq] : t === BISHOP ? BISHOP_R[sq] : [...ROOK_R[sq], ...BISHOP_R[sq]];
    for (const ray of dirs) {
      for (const to of ray) {
        const q = b[to];
        if (!q) {
          out.push(mv(sq, to, p, 0));
          continue;
        }
        if (colorOf(q) === them) out.push(mv(sq, to, p, q));
        break;
      }
    }
  }
  return out;
}

function castles(pos: Position, sq: number, out: Move[]) {
  const b = pos.board;
  const us = pos.turn;
  const them = (us ^ 1) as Color;
  const home = us === WHITE ? 4 : 60;
  if (sq !== home) return;
  const king = b[sq];
  const rook = makePiece(us, ROOK);
  const kRight = us === WHITE ? WK : BK;
  const qRight = us === WHITE ? WQ : BQ;
  if (!(pos.castling & (kRight | qRight))) return;
  if (isAttacked(b, sq, them)) return;
  if ((pos.castling & kRight) !== 0 && b[sq + 3] === rook && !b[sq + 1] && !b[sq + 2] && !isAttacked(b, sq + 1, them) && !isAttacked(b, sq + 2, them)) {
    out.push(mv(sq, sq + 2, king, 0, 0, CASTLE));
  }
  if ((pos.castling & qRight) !== 0 && b[sq - 4] === rook && !b[sq - 1] && !b[sq - 2] && !b[sq - 3] && !isAttacked(b, sq - 1, them) && !isAttacked(b, sq - 2, them)) {
    out.push(mv(sq, sq - 2, king, 0, 0, CASTLE));
  }
}

const ROOK_CORNER_RIGHT: Record<number, number> = { 0: WQ, 7: WK, 56: BQ, 63: BK };

/** Play a move (assumed pseudo-legal) and return the new position. */
export function makeMove(pos: Position, m: Move): Position {
  const b = new Int8Array(pos.board);
  const us = pos.turn;
  b[m.from] = 0;
  b[m.to] = m.promo ? makePiece(us, m.promo) : m.piece;
  if (m.flags & EP) b[m.to + (us === WHITE ? -8 : 8)] = 0;
  if (m.flags & CASTLE) {
    if (m.to === m.from + 2) {
      b[m.from + 1] = b[m.from + 3];
      b[m.from + 3] = 0;
    } else {
      b[m.from - 1] = b[m.from - 4];
      b[m.from - 4] = 0;
    }
  }
  let castling = pos.castling;
  if (typeOf(m.piece) === KING) castling &= us === WHITE ? ~(WK | WQ) : ~(BK | BQ);
  castling &= ~(ROOK_CORNER_RIGHT[m.from] ?? 0);
  castling &= ~(ROOK_CORNER_RIGHT[m.to] ?? 0);
  return {
    board: b,
    turn: (us ^ 1) as Color,
    castling,
    ep: m.flags & DOUBLE ? (m.from + m.to) >> 1 : -1,
    halfmove: typeOf(m.piece) === PAWN || m.captured ? 0 : pos.halfmove + 1,
    fullmove: pos.fullmove + (us === BLACK ? 1 : 0),
  };
}

/** Does this pseudo-legal move leave the mover's king safe? */
function leavesKingSafe(pos: Position, m: Move): boolean {
  const next = makeMove(pos, m);
  const k = typeOf(m.piece) === KING ? m.to : kingSquare(next.board, pos.turn);
  return k < 0 || !isAttacked(next.board, k, next.turn);
}

export function legalMoves(pos: Position): Move[] {
  return pseudoMoves(pos).filter((m) => leavesKingSafe(pos, m));
}

export function legalMovesFrom(pos: Position, from: number): Move[] {
  return legalMoves(pos).filter((m) => m.from === from);
}

export function isCheckmate(pos: Position): boolean {
  return inCheck(pos) && legalMoves(pos).length === 0;
}

export function isStalemate(pos: Position): boolean {
  return !inCheck(pos) && legalMoves(pos).length === 0;
}

/** Does playing `m` give checkmate? */
export function givesMate(pos: Position, m: Move): boolean {
  return isCheckmate(makeMove(pos, m));
}

export function sameMove(a: Move, b: Move): boolean {
  return a.from === b.from && a.to === b.to && a.promo === b.promo;
}

// ─── UCI ────────────────────────────────────────────────────────────────────────────────────────────────

const UCI_PROMO = " pnbrqk";

export function moveToUci(m: Move): string {
  return squareName(m.from) + squareName(m.to) + (m.promo ? UCI_PROMO[m.promo] : "");
}

/** The legal move matching a UCI string ("e2e4", "e7e8q"), or null. */
export function parseUci(pos: Position, uci: string): Move | null {
  const s = uci.trim().toLowerCase();
  if (!/^[a-h][1-8][a-h][1-8][nbrq]?$/.test(s)) return null;
  const from = parseSquare(s.slice(0, 2));
  const to = parseSquare(s.slice(2, 4));
  const promo = s.length === 5 ? UCI_PROMO.indexOf(s[4]) : 0;
  for (const m of legalMoves(pos)) {
    if (m.from === from && m.to === to && m.promo === promo) return m;
  }
  return null;
}

// ─── perft ──────────────────────────────────────────────────────────────────────────────────────────────

export function perft(pos: Position, depth: number): number {
  if (depth === 0) return 1;
  const moves = legalMoves(pos);
  if (depth === 1) return moves.length;
  let n = 0;
  for (const m of moves) n += perft(makeMove(pos, m), depth - 1);
  return n;
}
