// German sentences of the table that do not depend on the scene: game values as a club player says them
// ("Kreuz mit zwei, Spiel drei, Hand vier — 48"), result lines, short names for the Liste. Pure.
import type { DeckId } from "../../game/ids.ts";
import type { GameResult } from "../rules/index.ts";
import { declarationName, kindName } from "../rules/index.ts";

const WORDS = [
  "null", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf", "zwölf",
  "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn", "zwanzig",
];

/** "zwei", "drei" … (numbers above 20 stay digits). */
export function numberWord(n: number): string {
  return WORDS[n] ?? String(n);
}

/** "mit einem", "ohne zwei". */
function matadorWords(withTops: boolean, n: number): string {
  return `${withTops ? "mit" : "ohne"} ${n === 1 ? "einem" : numberWord(n)}`;
}

/** Signed number with a real minus ("+48", "-96", "0"). */
export function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `-${Math.abs(n)}` : "0";
}

/**
 * The value of a declared game as it is counted at the table: "Kreuz mit zwei, Spiel drei, Hand vier — 4 × 12 = 48."
 * Null: "Null Hand — 35." Followed by lines for overbid, Kontra/Re and Bock.
 */
export function valueLines(r: GameResult, deck: DeckId): string[] {
  const out: string[] = [];
  if (r.type !== "declared" || !r.declaration) return out;
  const d = r.declaration;
  if (d.kind === "null") {
    out.push(`${declarationName(d, deck)}: ${r.base || r.value}.`);
  } else {
    const m = r.matadors!;
    const lv = r.levels!;
    let n = m.count;
    const parts = [`${kindName(d.kind, deck)} ${matadorWords(m.withTops, m.count)}`, `Spiel ${numberWord(++n)}`];
    if (lv.hand) parts.push(`Hand ${numberWord(++n)}`);
    if (lv.schneider) parts.push(`Schneider ${numberWord(++n)}`);
    if (lv.schneiderAnnounced) parts.push(`angesagt ${numberWord(++n)}`);
    if (lv.schwarz) parts.push(`Schwarz ${numberWord(++n)}`);
    if (lv.schwarzAnnounced) parts.push(`angesagt ${numberWord(++n)}`);
    if (lv.ouvert) parts.push(`offen ${numberWord(++n)}`);
    out.push(`${parts.join(", ")}: ${n} × ${r.base} = ${n * r.base}.`);
    if (r.overbid) out.push(`Überreizt! Gereizt war bis ${r.bid}, gewertet wird ${r.value}.`);
  }
  if (r.kontra === 2) out.push("Kontra und Re: Das Spiel zählt vierfach.");
  else if (r.kontra === 1) out.push("Kontra: Das Spiel zählt doppelt.");
  const kf = r.kontra === 2 ? 4 : r.kontra === 1 ? 2 : 1;
  if (r.factor > kf) out.push("Bockrunde: Das Spiel zählt doppelt.");
  return out;
}

/** "Gewonnen mit 78 Augen: +48." / "Verloren mit 54 Augen: -96." / Null: "Kein Stich: gewonnen, +23." */
export function outcomeLine(r: GameResult): string {
  if (r.type !== "declared" || !r.declaration) return "";
  if (r.declaration.kind === "null") {
    return r.won ? `Kein einziger Stich: gewonnen, ${signed(r.written)}.` : `Ein Stich: verloren, ${signed(r.written)}.`;
  }
  const pts = r.declarerPoints;
  if (r.won) return `Gewonnen mit ${pts} Augen: ${signed(r.written)}.`;
  if (r.reason === "schneider-missed") return `${pts} Augen, aber der angesagte Schneider fehlt: ${signed(r.written)}.`;
  if (r.reason === "schwarz-missed") return `${pts} Augen, aber der angesagte Schwarz fehlt: ${signed(r.written)}.`;
  if (r.reason === "overbid" && pts > 60) return `${pts} Augen, aber überreizt: ${signed(r.written)}.`;
  return `Verloren mit ${pts} Augen: ${signed(r.written)}.`;
}

/** A short name for narrow places (Liste columns): "der Erwin" → "Erwin", "Oberlehrer Walter" → "Walter". */
export function shortName(name: string): string {
  const words = name.replace(/^(der|die|das|’s|'s)\s+/i, "").split(/\s+/);
  return words[words.length - 1] || name;
}

/** First letter upper case. */
export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── speech bubbles ─────────────────────────────────────────────────────────────────────────────────────────

const plainWords = (t: string) => t.replace(/\{[^}]*\}/g, "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);

/** `head` (a coloured action word) before `line`, unless the line already opens with the same words. Pure; tested in talk.test.ts. */
export function mergeHead(head: string, line: string): string {
  const want = plainWords(head);
  if (!want.length) return `${head} ${line}`;
  // the first words of the line, with their punctuation, as written
  const m = line.match(new RegExp(`^\\s*((?:\\S+\\s+){${want.length - 1}}\\S+)`));
  if (m && plainWords(m[1]).join(" ") === want.join(" ")) {
    const colour = head.match(/^\{([^}/]+)\}/)?.[1] ?? "inkred";
    return `{${colour}}${m[1]}{/}${line.slice(m[0].length)}`;
  }
  return `${head} ${line}`;
}

