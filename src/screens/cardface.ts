// Card faces for every screen (table, problems, help, settings preview): the `cards` atlas when it is there, else a
// clean code fallback with big corner indices. Large cards are 72×108 layout units, small ones 36×54.
import type { Gfx } from "../core/gfx";
import type { DeckId, RankId, SuitId } from "../game/ids";
import { P } from "../core/palette";

export const CARD_W = 72;
export const CARD_H = 108;
export const CARD_SW = 36;
export const CARD_SH = 54;

const LETTERS: Record<DeckId, Record<RankId, string>> = {
  french: { "7": "7", "8": "8", "9": "9", "10": "10", jack: "B", queen: "D", king: "K", ace: "A" },
  tournament: { "7": "7", "8": "8", "9": "9", "10": "10", jack: "B", queen: "D", king: "K", ace: "A" },
  german: { "7": "7", "8": "8", "9": "9", "10": "10", jack: "U", queen: "O", king: "K", ace: "A" },
};

export function suitColor(deck: DeckId, suit: SuitId): string {
  if (deck === "tournament") return { clubs: P.ink0, spades: P.forest1, hearts: P.brick1, diamonds: P.beer0 }[suit];
  if (deck === "german") return { clubs: P.wood1, spades: P.forest1, hearts: P.brick1, diamonds: P.beer0 }[suit];
  return suit === "hearts" || suit === "diamonds" ? P.brick1 : P.ink0;
}

// 9×9 suit masks
const MASKS: Record<SuitId, string[]> = {
  hearts: [".XX...XX.", "XXXX.XXXX", "XXXXXXXXX", "XXXXXXXXX", ".XXXXXXX.", "..XXXXX..", "...XXX...", "....X....", "........."],
  diamonds: ["....X....", "...XXX...", "..XXXXX..", ".XXXXXXX.", "XXXXXXXXX", ".XXXXXXX.", "..XXXXX..", "...XXX...", "....X...."],
  spades: ["....X....", "...XXX...", "..XXXXX..", ".XXXXXXX.", "XXXXXXXXX", "XXXXXXXXX", ".XX.X.XX.", "....X....", "...XXX..."],
  clubs: ["...XXX...", "...XXX...", ".X.XXX.X.", "XXXX.XXXX", "XXXXXXXXX", "XXXX.XXXX", ".X..X..X.", "....X....", "...XXX..."],
};

/** A suit symbol of `size` layout units (multiple of 9 looks best) with its top-left at (x, y). */
export function suitSymbol(g: Gfx, deck: DeckId, suit: SuitId, x: number, y: number, size = 9) {
  const frame = `suit-${deck}-${suit}`;
  if (size >= 20 && g.frameSize("icons", frame) && g.sprite("icons", frame, x, y, { noAnchor: true })) return;
  const m = MASKS[suit];
  const k = size / 9;
  const col = suitColor(deck, suit);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (m[r][c] === "X") g.rect(x + Math.floor(c * k), y + Math.floor(r * k), Math.ceil(k), Math.ceil(k), col);
    }
  }
}

/** Draw a face-up card with its top-left at (x, y). */
export function drawCardFace(g: Gfx, deck: DeckId, suit: SuitId, rank: RankId, x: number, y: number, small = false) {
  const frame = `${deck}-${suit}-${rank}${small ? "-s" : ""}`;
  if (g.sprite("cards", frame, x, y, { noAnchor: true })) return;
  const w = small ? CARD_SW : CARD_W;
  const h = small ? CARD_SH : CARD_H;
  g.rrect(x, y, w, h, 3, P.ink0);
  g.rrect(x + 1, y + 1, w - 2, h - 2, 3, P.paper4);
  const letter = LETTERS[deck][rank];
  const col = suitColor(deck, suit);
  const font = small ? "head" : "big";
  g.text(letter, x + (small ? 4 : 6), y + (small ? 1 : 3), { font, color: col });
  suitSymbol(g, deck, suit, x + (small ? 4 : 6), y + (small ? 22 : 34), small ? 9 : 18);
  if (!small) {
    // centre: a big symbol, framed for court cards
    if (rank === "jack" || rank === "queen" || rank === "king") {
      g.rect(x + 26, y + 14, 40, 80, col);
      g.rect(x + 28, y + 16, 36, 76, P.paper3);
      g.text(letter, x + 46, y + 38, { font: "huge", align: "center", color: col });
    } else {
      suitSymbol(g, deck, suit, x + 32, y + 40, 27);
    }
    g.text(letter, x + w - 6, y + h - 32, { font: "big", color: col, align: "right" });
  }
}

/** A card back (three designs). */
export function drawCardBack(g: Gfx, x: number, y: number, small = false, design: 1 | 2 | 3 = 1) {
  if (g.sprite("cards", `back-${design}${small ? "-s" : ""}`, x, y, { noAnchor: true })) return;
  const w = small ? CARD_SW : CARD_W;
  const h = small ? CARD_SH : CARD_H;
  const [a, b] = design === 1 ? [P.river1, P.river2] : design === 2 ? [P.brick0, P.brick1] : [P.felt1, P.felt2];
  g.rrect(x, y, w, h, 3, P.ink0);
  g.rrect(x + 1, y + 1, w - 2, h - 2, 3, P.paper4);
  g.rect(x + 4, y + 4, w - 8, h - 8, a);
  for (let yy = y + 6; yy < y + h - 6; yy += 4) for (let xx = x + 6 + ((yy - y) % 8 ? 2 : 0); xx < x + w - 6; xx += 4) g.rect(xx, yy, 2, 2, b);
}
