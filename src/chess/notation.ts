// German short algebraic notation (pure): K König, D Dame, T Turm, L Läufer, S Springer, pawns without a letter.
// "Sf3", "Dxh7#", "exd6", "e8D+", "0-0", "0-0-0". Disambiguation as in SAN (file, then rank, then both).
import {
  CASTLE, KING, PAWN, fileOf, givesMate, legalMoves, makeMove, inCheck, rankOf, squareName, typeOf,
  type Move, type Position,
} from "./rules.ts";

/** German piece letters by type (index 1…6). */
export const GERMAN_LETTER = ["", "", "S", "L", "T", "D", "K"];

/** German piece names by type (index 1…6). */
export const GERMAN_NAME = ["", "Bauer", "Springer", "Läufer", "Turm", "Dame", "König"];

/** The move in German notation, including + for check and # for mate. `pos` is the position before the move. */
export function toGerman(pos: Position, m: Move): string {
  let s: string;
  const t = typeOf(m.piece);
  if (m.flags & CASTLE) {
    s = m.to > m.from ? "0-0" : "0-0-0";
  } else if (t === PAWN) {
    s = m.captured ? "abcdefgh"[fileOf(m.from)] + "x" + squareName(m.to) : squareName(m.to);
    if (m.promo) s += GERMAN_LETTER[m.promo];
  } else {
    s = GERMAN_LETTER[t] + disambiguation(pos, m) + (m.captured ? "x" : "") + squareName(m.to);
  }
  const next = makeMove(pos, m);
  if (inCheck(next)) s += givesMate(pos, m) ? "#" : "+";
  return s;
}

function disambiguation(pos: Position, m: Move): string {
  if (typeOf(m.piece) === KING) return "";
  const rivals = legalMoves(pos).filter((o) => o.piece === m.piece && o.to === m.to && o.from !== m.from);
  if (!rivals.length) return "";
  const file = "abcdefgh"[fileOf(m.from)];
  const rank = String(rankOf(m.from) + 1);
  if (rivals.every((o) => fileOf(o.from) !== fileOf(m.from))) return file;
  if (rivals.every((o) => rankOf(o.from) !== rankOf(m.from))) return rank;
  return file + rank;
}

/** Play a line of moves from a position and return their German notation. */
export function germanLine(pos: Position, moves: Move[]): string[] {
  const out: string[] = [];
  let p = pos;
  for (const m of moves) {
    out.push(toGerman(p, m));
    p = makeMove(p, m);
  }
  return out;
}
