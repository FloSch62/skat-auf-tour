// German names in the words of the Skatordnung (contract §0.10). The rules only know suits and ranks; the deck
// (french, german, tournament) is presentation. French and tournament decks: Kreuz, Pik, Herz, Karo with Ass, Zehn,
// König, Dame, Bube. German deck: Eichel, Grün, Herz (or Rot), Schellen with Daus, Zehn, König, Ober, Unter
// (ISkO 1.2.1: "Kreuz (Eicheln), Pik (Grün), Herz (Rot) und Karo (Schellen)").
import type { DeckId } from "../../game/ids.ts";
import type { GameRecord } from "../../game/types.ts";
import { suitOf } from "./cards.ts";
import type { Card, Suit } from "./cards.ts";
import type { Action, GameResult } from "./game.ts";
import type { Declaration, Matadors } from "./value.ts";
import type { PlayKind } from "./play.ts";

export interface NameStyle {
  /** German deck: call the red suit "Herz" (default) or "Rot". */
  red?: "Herz" | "Rot";
}

const FRENCH_SUITS = ["Karo", "Herz", "Pik", "Kreuz"];
const GERMAN_SUITS = ["Schellen", "Herz", "Grün", "Eichel"];
const FRENCH_SLOTS = ["Sieben", "Acht", "Neun", "Dame", "König", "Zehn", "Ass"];
const GERMAN_SLOTS = ["Sieben", "Acht", "Neun", "Ober", "König", "Zehn", "Daus"];

export function suitName(s: Suit | number, deck: DeckId = "french", style: NameStyle = {}): string {
  if (deck === "german") return s === 1 ? (style.red ?? "Herz") : GERMAN_SUITS[s];
  return FRENCH_SUITS[s];
}

export function rankName(c: Card, deck: DeckId = "french"): string {
  if (c >= 28) return deck === "german" ? "Unter" : "Bube";
  return (deck === "german" ? GERMAN_SLOTS : FRENCH_SLOTS)[c % 7];
}

/** "Kreuz-Bube", "Herz-Zehn", "Pik-Ass"; German deck: "Eichel-Unter", "Grün-Ober", "Herz-König", "Schellen-Daus". */
export function cardName(c: Card, deck: DeckId = "french", style: NameStyle = {}): string {
  return `${suitName(suitOf(c), deck, style)}-${rankName(c, deck)}`;
}

const KIND_SUIT: Partial<Record<PlayKind, Suit>> = { diamonds: 0, hearts: 1, spades: 2, clubs: 3 };

/** "Kreuz", "Grand", "Null", "Ramsch" (German deck: "Eichel", "Grün", …). */
export function kindName(kind: PlayKind, deck: DeckId = "french", style: NameStyle = {}): string {
  const s = KIND_SUIT[kind];
  if (s !== undefined) return suitName(s, deck, style);
  return kind === "grand" ? "Grand" : kind === "null" ? "Null" : "Ramsch";
}

/**
 * "Kreuz", "Kreuz Hand", "Kreuz Hand Schneider angesagt", "Grand Hand Schwarz angesagt", "Grand ouvert",
 * "Null ouvert Hand" (ISkO 5.1.2 names).
 */
export function declarationName(d: Declaration, deck: DeckId = "french", style: NameStyle = {}): string {
  const k = kindName(d.kind, deck, style);
  if (d.kind === "null") return `${k}${d.ouvert ? " ouvert" : ""}${d.hand ? " Hand" : ""}`;
  if (d.ouvert) return `${k} ouvert`;
  const parts = [k];
  if (d.hand) parts.push("Hand");
  if (d.schwarzAnnounced) parts.push("Schwarz angesagt");
  else if (d.schneiderAnnounced) parts.push("Schneider angesagt");
  return parts.join(" ");
}

/** "mit 2" / "ohne 3". */
export function matadorLabel(m: Matadors): string {
  return `${m.withTops ? "mit" : "ohne"} ${m.count}`;
}

/**
 * The value as a club player writes it down: ["mit 2", "Spiel 3", "Hand 4", "4 × 12 = 48"]; lost games add
 * "verloren: −96", overbid games "überreizt". Null: ["Null Hand", "35"].
 */
export function valueBreakdown(r: GameResult, deck: DeckId = "french"): string[] {
  if (r.type === "passed") return ["eingepasst"];
  if (r.type === "ramsch") {
    const out = [r.ramsch && r.ramsch.durchmarsch !== null ? "Durchmarsch" : `${r.value} Augen`];
    if (r.factor > 1) out.push(`× ${r.factor}`);
    out.push(`${r.written > 0 ? "+" : ""}${r.written}`);
    return out;
  }
  const d = r.declaration!;
  const out: string[] = [];
  if (d.kind === "null") {
    out.push(declarationName(d, deck), `${r.value}`);
  } else {
    const lv = r.levels!;
    let n = r.matadors!.count;
    out.push(matadorLabel(r.matadors!));
    out.push(`Spiel ${++n}`);
    if (lv.hand) out.push(`Hand ${++n}`);
    if (lv.schneider) out.push(`Schneider ${++n}`);
    if (lv.schneiderAnnounced) out.push(`angesagt ${++n}`);
    if (lv.schwarz) out.push(`Schwarz ${++n}`);
    if (lv.schwarzAnnounced) out.push(`angesagt ${++n}`);
    if (lv.ouvert) out.push(`offen ${++n}`);
    out.push(`${n} × ${r.base} = ${n * r.base}`);
    if (r.overbid) out.push(`überreizt (Reizwert ${r.bid}): ${r.value}`);
  }
  if (r.kontra === 1) out.push("Kontra × 2");
  if (r.kontra === 2) out.push("Kontra und Re × 4");
  if (r.factor > (r.kontra === 2 ? 4 : r.kontra === 1 ? 2 : 1)) out.push("Bock × 2");
  out.push(r.won ? `gewonnen: +${r.written}` : `verloren: ${r.written}`);
  return out;
}

/** What a seat says at the table: "18", "Ja", "Passe", "Kontra", "Re", "Hand", "Ich schiebe" … */
export function actionLabel(a: Action, deck: DeckId = "french"): string {
  switch (a.type) {
    case "bid":
      return String(a.value);
    case "hold":
      return "Ja";
    case "pass":
      return "Passe";
    case "peek":
      return "Skat ansehen";
    case "pickUp":
      return "Skat aufnehmen";
    case "discard":
      return "Drücken";
    case "declare":
      return declarationName(a.declaration, deck);
    case "shove":
      return "Schieben";
    case "kontra":
      return "Kontra";
    case "re":
      return "Re";
    case "noRe":
      return "Kein Re";
    case "play":
      return cardName(a.card, deck);
    case "takeBack":
      return "Zurücknehmen";
  }
}

/** Names of the hand positions. */
export const POSITION_NAMES = ["Vorhand", "Mittelhand", "Hinterhand"] as const;


// ─── Display helpers ──────────────────────────────────────────────────────────────────────────────────────

const BLACK = [false, false, true, true]; // Karo, Herz red; Pik, Kreuz black
const SLOT_DISPLAY = [6, 5, 4, 3, 2, 1, 0]; // A 10 K D 9 8 7
const NULL_DISPLAY = [6, 4, 3, -1, 5, 2, 1, 0]; // A K D B 10 9 8 7 (-1 = jack)

/**
 * Hand order for display: jacks (Kreuz, Pik, Herz, Karo) first except in Null, then the trump suit, then the other
 * suits with alternating colours where possible; inside a suit high to low (Null: A K D B 10 9 8 7). `kind` null =
 * before the declaration (sorted like Grand).
 */
export function sortHand(mask: number, kind: PlayKind | null = null): Card[] {
  const out: Card[] = [];
  const isNull = kind === "null";
  if (!isNull) for (const j of [31, 30, 29, 28]) if (mask & (1 << j)) out.push(j);
  const trump = KIND_SUIT[kind ?? "grand"];
  const present = [3, 1, 2, 0].filter((s) => (mask & (0x7f << (7 * s))) !== 0 || (isNull && (mask & (1 << (28 + s))) !== 0));
  const order: number[] = [];
  if (trump !== undefined && present.includes(trump)) order.push(trump);
  const rest = present.filter((s) => s !== trump);
  while (rest.length) {
    const last = order.length ? order[order.length - 1] : -1;
    let i = last < 0 ? 0 : rest.findIndex((s) => BLACK[s] !== BLACK[last]);
    if (i < 0) i = 0;
    order.push(rest.splice(i, 1)[0]);
  }
  for (const s of order) {
    if (isNull) {
      for (const slot of NULL_DISPLAY) {
        const c = slot < 0 ? 28 + s : s * 7 + slot;
        if (mask & (1 << c)) out.push(c);
      }
    } else {
      for (const slot of SLOT_DISPLAY) if (mask & (1 << (s * 7 + slot))) out.push(s * 7 + slot);
    }
  }
  return out;
}

/**
 * One line of the Liste for a finished game: "Kreuz mit 2 Hand Schneider", "Null ouvert", "Grand ohne 1 überreizt",
 * "Ramsch, Jungfrau", "eingepasst".
 */
export function recordLabel(r: GameRecord, deck: DeckId = "french"): string {
  if (r.kind === "passed") return "eingepasst";
  if (r.kind === "ramsch") {
    const parts = ["Ramsch"];
    if (r.ramsch?.durchmarsch !== null && r.ramsch?.durchmarsch !== undefined) parts.push("Durchmarsch");
    else if (r.ramsch?.jungfrau.length) parts.push("Jungfrau");
    if (r.ramsch?.shoves) parts.push(r.ramsch.shoves === 1 ? "einmal geschoben" : `${r.ramsch.shoves}-mal geschoben`);
    return parts.join(", ");
  }
  if (r.kind === "null") return declarationName({ kind: "null", hand: r.hand, ouvert: r.ouvert, schneiderAnnounced: false, schwarzAnnounced: false }, deck);
  const parts = [kindName(r.kind, deck)];
  if (r.withTops !== undefined) parts.push(`${r.withTops ? "mit" : "ohne"} ${r.matadors}`);
  if (r.ouvert) parts.push("ouvert");
  else {
    if (r.hand) parts.push("Hand");
    if (r.schwarzAnnounced) parts.push("Schwarz angesagt");
    else if (r.schneiderAnnounced) parts.push("Schneider angesagt");
  }
  if (r.schwarz) parts.push("Schwarz");
  else if (r.schneider) parts.push("Schneider");
  if (r.overbid) parts.push("überreizt");
  if (r.kontra === 1) parts.push("Kontra");
  if (r.kontra === 2) parts.push("Kontra, Re");
  return parts.join(" ");
}
