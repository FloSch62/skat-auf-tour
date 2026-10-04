// Card drawing for the table and the Stammtisch problems: hand cards with their states (raised, selected, veiled),
// small cards, fanned backs, and the slightly turned cards in the trick. Turned cards are the only rotated sprites
// in the game (contract §0.6): each card is pre-drawn once per turning stage into an HD canvas and cached.
import { Gfx } from "../../core/gfx";
import { atlas, markHD } from "../../core/assets";
import { P, rgba } from "../../core/palette";
import type { DeckId, SuitId } from "../../game/ids";
import { CARD_H, CARD_SH, CARD_SW, CARD_W, drawCardBack, drawCardFace, suitSymbol } from "../../screens/cardface";
import type { GlassKind } from "../../screens/kit";
import { cardSprite } from "../rules/index";
import type { Card } from "../rules/index";

export { CARD_W, CARD_H, CARD_SW, CARD_SH };

export type CardState = "plain" | "raised" | "selected" | "veiled" | "marked";

/** A face-up hand card at (x, y) with its state overlay. */
export function drawCard(g: Gfx, deck: DeckId, c: Card, x: number, y: number, opts: { state?: CardState; hover?: boolean; shadow?: boolean } = {}) {
  const { suit, rank } = cardSprite(c);
  if (opts.shadow !== false) {
    if (!g.sprite("cards", "shadow", x + 2, y + 3, { noAnchor: true, alpha: 0.9 })) g.rrect(x + 2, y + 3, CARD_W, CARD_H, 3, rgba(P.ink0, 0.35));
  }
  drawCardFace(g, deck, suit, rank, x, y);
  const st = opts.state ?? "plain";
  if (st === "veiled") {
    if (!g.sprite("cards", "veil-locked", x, y, { noAnchor: true })) g.rrect(x, y, CARD_W, CARD_H, 3, rgba(P.ink1, 0.45));
  }
  if (st === "selected") outline(g, x, y, "hl-selected", P.beer2);
  else if (st === "marked") outline(g, x, y, "hl-playable", P.forest4);
  else if (opts.hover && st !== "veiled") outline(g, x, y, "hl-playable", P.beer4);
}

function outline(g: Gfx, x: number, y: number, frame: string, color: string) {
  if (g.sprite("cards", frame, x, y)) return; // anchored 4 units outside the card
  g.box(x - 3, y - 3, CARD_W + 6, CARD_H + 6, P.ink0, 1);
  g.box(x - 2, y - 2, CARD_W + 4, CARD_H + 4, color, 2);
}

/** A small (36×54) face-up card. */
export function drawSmallCard(g: Gfx, deck: DeckId, c: Card, x: number, y: number, opts: { dim?: boolean } = {}) {
  const { suit, rank } = cardSprite(c);
  if (!g.sprite("cards", "shadow-s", x + 1, y + 2, { noAnchor: true })) g.rrect(x + 1, y + 2, CARD_SW, CARD_SH, 2, rgba(P.ink0, 0.35));
  drawCardFace(g, deck, suit, rank, x, y, true);
  if (opts.dim && !g.sprite("cards", "veil-locked-s", x, y, { noAnchor: true })) g.rrect(x, y, CARD_SW, CARD_SH, 2, rgba(P.ink1, 0.45));
}

/** A face-down card (large or small). */
export function drawBack(g: Gfx, x: number, y: number, small = false) {
  if (!small) {
    if (!g.sprite("cards", "shadow", x + 2, y + 3, { noAnchor: true, alpha: 0.9 })) g.rrect(x + 2, y + 3, CARD_W, CARD_H, 3, rgba(P.ink0, 0.35));
  } else if (!g.sprite("cards", "shadow-s", x + 1, y + 2, { noAnchor: true })) g.rrect(x + 1, y + 2, CARD_SW, CARD_SH, 2, rgba(P.ink0, 0.35));
  drawCardBack(g, x, y, small, 1);
}

/**
 * An opponent's cards as a small fan of backs (the count is public). `dir` 1 fans to the right from x, -1 to the
 * left ending at x.
 */
export function drawBackFan(g: Gfx, x: number, y: number, n: number, dir: 1 | -1, step = 8) {
  const w = CARD_SW + Math.max(0, n - 1) * step;
  const x0 = dir === 1 ? x : x - w;
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0.5;
    const lift = Math.round(Math.sin(t * Math.PI) * 4);
    drawBack(g, x0 + i * step, y - lift, true);
  }
}

// ─── turned cards for the trick (pre-drawn stages, cached) ────────────────────────────────────────────────

/** Seven turning stages in degrees (contract §10: "sieben Drehstufen für den Stich"). */
export const TURN_STAGES = [-6, -4, -2, 0, 2, 4, 6] as const;

const turned = new Map<string, HTMLCanvasElement>();
const SHADOW = 6;

/** The pre-drawn turned card (HD canvas, 2 backing px per layout unit) for a stage index 0…6. */
export function turnedCard(deck: DeckId, c: Card, stage: number): HTMLCanvasElement {
  const ready = atlas("cards") ? 1 : 0;
  const key = `${deck}|${c}|${stage}|${ready}`;
  let cv = turned.get(key);
  if (cv) {
    // least recently used order: a hit moves to the end
    turned.delete(key);
    turned.set(key, cv);
    return cv;
  }
  const deg = TURN_STAGES[Math.max(0, Math.min(TURN_STAGES.length - 1, stage))];
  // 1. the flat card with a soft shadow, at full backing resolution
  const flat = document.createElement("canvas");
  flat.width = (CARD_W + SHADOW) * 2;
  flat.height = (CARD_H + SHADOW) * 2;
  const fc = flat.getContext("2d")!;
  fc.imageSmoothingEnabled = false;
  fc.scale(2, 2);
  const fg = new Gfx(fc);
  fg.rrect(3, 4, CARD_W, CARD_H, 3, rgba(P.ink0, 0.32));
  const { suit, rank } = cardSprite(c);
  drawCardFace(fg, deck, suit, rank, 0, 0);
  // 2. turned once with high-quality filtering (a slight softening is better for the letters than jagged steps)
  const rad = (deg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const w = Math.ceil(flat.width * cos + flat.height * sin) + 4;
  const h = Math.ceil(flat.width * sin + flat.height * cos) + 4;
  cv = document.createElement("canvas");
  cv.width = w + (w % 2);
  cv.height = h + (h % 2);
  const c2 = cv.getContext("2d")!;
  c2.imageSmoothingEnabled = deg !== 0;
  c2.imageSmoothingQuality = "high";
  c2.translate(cv.width / 2, cv.height / 2);
  c2.rotate(rad);
  c2.drawImage(flat, -CARD_W - SHADOW, -CARD_H - SHADOW);
  markHD(cv);
  // a trick needs three cards and a hand of turning stages; keep a small LRU so a long evening stays light
  // (each turned card is a ~180×250 px canvas)
  if (turned.size >= 48) turned.delete(turned.keys().next().value!);
  turned.set(key, cv);
  return cv;
}

/** Draw a trick card turned by `stage`, centred on (cx, cy) (the centre of the unturned card). */
export function drawTurnedCard(g: Gfx, deck: DeckId, c: Card, cx: number, cy: number, stage: number) {
  const cv = turnedCard(deck, c, stage);
  // the card sits at the top-left of its padded flat canvas: shift so the card centre lands on (cx, cy)
  g.image(cv, Math.round(cx - cv.width / 4 + SHADOW / 2), Math.round(cy - cv.height / 4 + SHADOW / 2));
}

// ─── icons ────────────────────────────────────────────────────────────────────────────────────────────────

const SUITS: SuitId[] = ["diamonds", "hearts", "spades", "clubs"];

/** A suit symbol (index 0 Karo … 3 Kreuz) of `size` units with its top-left at (x, y). */
export function suitIcon(g: Gfx, deck: DeckId, suit: number, x: number, y: number, size = 18) {
  suitSymbol(g, deck, SUITS[suit], x, y, size);
}

/** Inline icon markup for a suit (for texts: "{icon:suit-french-hearts-sm}"). */
export function suitMarkup(deck: DeckId, suit: number): string {
  return `{icon:suit-${deck}-${SUITS[suit]}-sm}`;
}

/** A glass kind for a drink (scenery only, contract §0.9). */
export function glassFor(drink: string, salt = 0): GlassKind {
  switch (drink) {
    case "beer":
      return salt % 3 === 0 ? "weizen" : "beer";
    case "wine":
      return "wine";
    case "cider":
      return "cider";
    case "schnapps":
      return "schnapps";
    case "water":
      return "water";
    case "spezi":
      return "spezi";
    default:
      return "beer";
  }
}

/** A slate in a wooden frame (the Tafel above the table, the Stammtisch board). Text on it in chalk colours. */
export function drawChalkboard(g: Gfx, x: number, y: number, w: number, h: number) {
  g.rect(x - 1, y - 1, w + 2, h + 2, P.ink0);
  g.rect(x, y, w, h, P.wood3);
  g.rect(x + 2, y + 2, w - 4, h - 4, P.wood1);
  g.rect(x + 5, y + 5, w - 10, h - 10, P.felt0);
  g.alpha(0.08, () => {
    g.rect(x + 20, y + Math.round(h * 0.35), Math.round(w * 0.3), 2, P.paper4);
    g.rect(x + Math.round(w * 0.5), y + Math.round(h * 0.7), Math.round(w * 0.35), 2, P.paper4);
  });
}

/** A round beer mat with pencil strokes for the attempts left (used ones crossed out). */
export function drawBeerMat(g: Gfx, cx: number, cy: number, r: number, total: number, left: number) {
  g.circle(cx + 2, cy + 3, r, rgba(P.ink0, 0.35), true);
  g.circle(cx, cy, r, P.ink1, true);
  g.circle(cx, cy, r - 2, P.paper3, true);
  g.circle(cx, cy, r - 6, P.brick2);
  g.circle(cx, cy, r - 8, P.brick2);
  const step = 12;
  const x0 = Math.round(cx - ((total - 1) * step) / 2);
  for (let i = 0; i < total; i++) {
    const x = x0 + i * step;
    const used = i >= left;
    g.rect(x - 1, cy - 14, 3, 28, used ? P.ink5 : P.ink1);
    if (used) g.line(x - 6, cy + 8, x + 6, cy - 8, P.brick1, 2);
  }
}
