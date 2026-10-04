// Chess pieces: frames from the `chess` atlas (w-K, w-D, w-T, w-L, w-S, w-B, b-…) when present, otherwise
// code-drawn pixel pieces (21×23 cells, drawn at 2 layout units per cell). No Unicode glyphs: the fonts lack them.
import type { Gfx } from "../core/gfx";
import { P } from "../core/palette";
import { colorOf, typeOf, type Color } from "./rules.ts";

/** German letters used for atlas frame names, by piece type. */
const FRAME_LETTER = ["", "B", "S", "L", "T", "D", "K"];

/** Size of a code-drawn piece in layout units. */
export const PIECE_W = 42;
export const PIECE_H = 46;
const CELL = 2;

// X outline, O fill (the fill next to the right outline is drawn as shade, next to the left one as rim light).
const PATTERNS: Record<string, string[]> = {
  base: [
    "....XXXXXXXXXXXXX....",
    "...XOOOOOOOOOOOOOX...",
    "...XOOOOOOOOOOOOOX...",
    "...XXXXXXXXXXXXXXX...",
  ],
  B: [
    ".....................",
    ".....................",
    ".....................",
    ".....................",
    ".........XXX.........",
    "........XOOOX........",
    ".......XOOOOOX.......",
    ".......XOOOOOX.......",
    ".......XOOOOOX.......",
    "........XOOOX........",
    ".......XXXXXXX.......",
    "......XOOOOOOOX......",
    ".......XXXXXXX.......",
    "........XOOOX........",
    "........XOOOX........",
    ".......XOOOOOX.......",
    "......XOOOOOOOX......",
    ".....XOOOOOOOOOX.....",
    "....XOOOOOOOOOOOX....",
  ],
  S: [
    ".....................",
    "..........X.X........",
    ".........XOXOX.......",
    "........XOOOOOX......",
    ".......XOOOOOOOX.....",
    "......XOOXOOOOOOX....",
    ".....XOOOOOOOOOOOX...",
    "....XOOOOOOOOOOOOOX..",
    "...XOOOOOOOOOOOOOOX..",
    "..XOOOOOOOOOOOOOOOX..",
    "..XOOOOOXXOOOOOOOOX..",
    "...XXXXX.XOOOOOOOOX..",
    "........XOOOOOOOOX...",
    ".......XOOOOOOOOOX...",
    "......XOOOOOOOOOX....",
    "......XOOOOOOOOOX....",
    ".....XOOOOOOOOOOX....",
    ".....XOOOOOOOOOOX....",
    "....XOOOOOOOOOOOX....",
  ],
  L: [
    "..........X..........",
    ".........XOX.........",
    ".........XXX.........",
    "........XOOOX........",
    ".......XOOOXOX.......",
    "......XOOOXOOOX......",
    "......XOOXOOOOX......",
    ".....XOOXOOOOOOX.....",
    ".....XOOOOOOOOOX.....",
    "......XOOOOOOOX......",
    ".......XOOOOOX.......",
    "......XXXXXXXXX......",
    "......XOOOOOOOX......",
    "......XXXXXXXXX......",
    ".......XOOOOOX.......",
    ".......XOOOOOX.......",
    "......XOOOOOOOX......",
    ".....XOOOOOOOOOX.....",
    "....XOOOOOOOOOOOX....",
  ],
  T: [
    ".....................",
    ".....................",
    "...XXXX.XXXXX.XXXX...",
    "...XOOX.XOOOX.XOOX...",
    "...XOOXXXOOOXXXOOX...",
    "...XOOOOOOOOOOOOOX...",
    "...XXXXXXXXXXXXXXX...",
    "....XOOOOOOOOOOOX....",
    ".....XOOOOOOOOOX.....",
    ".....XOOOOOOOOOX.....",
    ".....XOOOOOOOOOX.....",
    ".....XOOOOOOOOOX.....",
    ".....XOOOOOOOOOX.....",
    ".....XOOOOOOOOOX.....",
    ".....XOOOOOOOOOX.....",
    ".....XOOOOOOOOOX.....",
    "....XXXXXXXXXXXXX....",
    "....XOOOOOOOOOOOX....",
    "....XOOOOOOOOOOOX....",
  ],
  D: [
    ".X.......XXX.......X.",
    "XOX.....XOOOX.....XOX",
    ".XX......XXX......XX.",
    ".XOX......X......XOX.",
    ".XOOX....XOX....XOOX.",
    "..XOOX..XOOOX..XOOX..",
    "..XOOOXXOOOOOXXOOOX..",
    "..XOOOOOOOOOOOOOOOX..",
    "...XOOOOOOOOOOOOOX...",
    "...XOOOOOOOOOOOOOX...",
    "....XOOOOOOOOOOOX....",
    ".....XXXXXXXXXXX.....",
    "......XOOOOOOOX......",
    "......XXXXXXXXX......",
    ".......XOOOOOX.......",
    ".......XOOOOOX.......",
    "......XOOOOOOOX......",
    ".....XOOOOOOOOOX.....",
    "....XOOOOOOOOOOOX....",
  ],
  K: [
    ".........XXX.........",
    ".........XOX.........",
    ".......XXXOXXX.......",
    ".......XOOOOOX.......",
    ".......XXXOXXX.......",
    "..XXXX...XOX...XXXX..",
    ".XOOOOX..XOX..XOOOOX.",
    ".XOOOOOXXXOXXXOOOOOX.",
    ".XOOOOOOOOOOOOOOOOOX.",
    "..XOOOOOOOOOOOOOOOX..",
    "...XOOOOOOOOOOOOOX...",
    "....XOOOOOOOOOOOX....",
    ".....XXXXXXXXXXX.....",
    "......XOOOOOOOX......",
    "......XXXXXXXXX......",
    ".......XOOOOOX.......",
    ".......XOOOOOX.......",
    "......XOOOOOOOX......",
    ".....XOOOOOOOOOX.....",
  ],};

const COLORS: Record<Color, { outline: string; fill: string; shade: string; rim: string }> = {
  0: { outline: P.ink0, fill: P.paper4, shade: P.paper1, rim: P.paper4 },
  1: { outline: P.ink0, fill: P.ink2, shade: P.ink1, rim: P.stone1 },
};

const cache = new Map<string, HTMLCanvasElement>();

function pieceCanvas(color: Color, type: number): HTMLCanvasElement {
  const key = `${color}${type}`;
  let cv = cache.get(key);
  if (cv) return cv;
  const rows = [...PATTERNS[FRAME_LETTER[type]], ...PATTERNS.base];
  const c = COLORS[color];
  cv = document.createElement("canvas");
  cv.width = 21;
  cv.height = rows.length;
  const x = cv.getContext("2d")!;
  rows.forEach((row, r) => {
    for (let q = 0; q < row.length; q++) {
      const ch = row[q];
      if (ch === ".") continue;
      let col = c.outline;
      if (ch === "O") col = row[q + 1] === "X" ? c.shade : row[q - 1] === "X" ? c.rim : c.fill;
      x.fillStyle = col;
      x.fillRect(q, r, 1, 1);
    }
  });
  cache.set(key, cv);
  return cv;
}

/**
 * Draw a piece centred in a square of size `size` at (x, y). `scale` enlarges the code-drawn piece (promotion
 * buttons). Returns nothing; never fails.
 */
export function drawPiece(g: Gfx, piece: number, x: number, y: number, size: number, opts: { scale?: number; alpha?: number } = {}) {
  const color = colorOf(piece);
  const type = typeOf(piece);
  const frame = `${color === 0 ? "w" : "b"}-${FRAME_LETTER[type]}`;
  const fs = g.frameSize("chess", frame);
  if (fs && g.sprite("chess", frame, Math.round(x + (size - fs.w) / 2), Math.round(y + (size - fs.h) / 2), { noAnchor: true, alpha: opts.alpha })) return;
  if (typeof document === "undefined") return;
  const k = opts.scale ?? 1;
  const w = PIECE_W * k;
  const h = PIECE_H * k;
  const px = Math.round(x + (size - w) / 2);
  const py = Math.round(y + (size - h) / 2 + 2 * k);
  const ctx = g.ctx;
  const smooth = ctx.imageSmoothingEnabled;
  const prev = ctx.globalAlpha;
  ctx.imageSmoothingEnabled = false;
  if (opts.alpha !== undefined) ctx.globalAlpha = prev * opts.alpha;
  ctx.drawImage(pieceCanvas(color, type), px, py, 21 * CELL * k, 23 * CELL * k);
  ctx.globalAlpha = prev;
  ctx.imageSmoothingEnabled = smooth;
}

