// What the regulars say at the table (contract §4.5): lines from src/content/speech.ts with {name}/{title} filled, and
// Schwätzer-Sigi's tells, which must be TRUE for his hand (contract §0.3: nothing at the table lies about the cards).
// Pure: the table scene decides when somebody talks; this module only picks what.
import type { CharacterId, DeckId } from "../../game/ids.ts";
import type { SpeechSituation } from "../../game/types.ts";
import { DUO_EXCHANGES, SIGI_TELLS, SPEECH, TELL_HINTS, fillTarget, type TellHintId } from "../../content/speech.ts";
import { DUO_PARTNER_WORD } from "../../content/speech-duo.ts";
import { fillText } from "../../content/texts.ts";
import { Rng } from "../../core/rng.ts";
import { JACKS, SUIT_MASKS, has, jackOf, popcount, suitName } from "../rules/index.ts";
import type { CardMask } from "../rules/index.ts";

export interface TalkValues {
  name: string;
  title: string;
  /** Short name of whom the line is aimed at (banter); without one, {target} is dropped cleanly (fillTarget). */
  target?: string;
  /** Who sits at the table: the Schultes' and the Amtsbote's lines that address the partner need him there. */
  present?: readonly CharacterId[];
  /** Lines matching this are not true now (e.g. "überreizt" when the game was lost without overbidding). */
  avoid?: RegExp;
}

/** A line for the situation, or null when the character has none. */
export function line(id: CharacterId, situation: SpeechSituation, rng: Rng, values: TalkValues): string | null {
  let lines = SPEECH[id]?.[situation];
  if (!lines || lines.length === 0) return null;
  const partnerWord = (DUO_PARTNER_WORD as Partial<Record<string, string>>)[id];
  if (partnerWord && values.present) {
    const partner = id === "schultes" ? "amtsbote" : "schultes";
    if (!values.present.includes(partner)) lines = lines.filter((l) => !l.includes(partnerWord));
    if (lines.length === 0) return null;
  }
  if (values.avoid) lines = lines.filter((l) => !values.avoid!.test(l));
  if (lines.length === 0) return null;
  return fillTarget(fillText(rng.pick(lines), { name: values.name, title: values.title }), values.target);
}

/** One of the Schultes–Amtsbote exchanges for a situation (the Schultes speaks first, the Amtsbote answers). */
export function duoExchange(situation: string, rng: Rng, values: TalkValues): [string, string] | null {
  let list = DUO_EXCHANGES[situation];
  if (list && values.avoid) list = list.filter((e) => !values.avoid!.test(e.schultes) && !values.avoid!.test(e.amtsbote));
  if (!list || list.length === 0) return null;
  const e = rng.pick(list);
  const f = (t: string) => fillTarget(fillText(t, { name: values.name, title: values.title }), values.target);
  return [f(e.schultes), f(e.amtsbote)];
}

// ─── Schwätzer-Sigi ───────────────────────────────────────────────────────────────────────────────────────

const ACES = (1 << 6) | (1 << 13) | (1 << 20) | (1 << 27);
const TENS = (1 << 5) | (1 << 12) | (1 << 19) | (1 << 26);

/** Is a TELL_HINTS entry true for this hand? (The `when` sentences of speech.ts, as code.) */
export function hintTrue(id: TellHintId, hand: CardMask): boolean {
  const jacks = popcount(hand & JACKS);
  const aces = popcount(hand & ACES);
  switch (id) {
    case "jacks-0":
      return jacks === 0;
    case "jacks-1":
      return jacks === 1;
    case "jacks-2":
      return jacks === 2;
    case "jacks-3":
      return jacks === 3;
    case "jacks-4":
      return jacks === 4;
    case "aces-0":
      return aces === 0;
    case "aces-2":
      return aces === 2;
    case "aces-3":
      return aces >= 3;
    case "ten-bare":
      // a ten that is the only card of its suit (the jack does not belong to the suit outside Null)
      for (let s = 0; s < 4; s++) if ((hand & SUIT_MASKS[s]) === (1 << (s * 7 + 5))) return true;
      return false;
    case "trash":
      return aces === 0 && (hand & TENS) === 0 && jacks <= 1;
    case "strong":
      return jacks >= 3 || (jacks === 2 && aces >= 2);
  }
}

/** The suit he holds clearly most cards of (at least four, a unique maximum), or -1. */
export function longSuit(hand: CardMask): number {
  const n = [0, 1, 2, 3].map((s) => popcount(hand & SUIT_MASKS[s]));
  const max = Math.max(...n);
  if (max < 4 || n.filter((v) => v === max).length > 1) return -1;
  return n.indexOf(max);
}

/** Suits he holds no card of at all (not even the jack, so "Von Herz hab i nix" is true in every game). */
export function voidSuits(hand: CardMask): number[] {
  return [0, 1, 2, 3].filter((s) => (hand & SUIT_MASKS[s]) === 0 && !has(hand, jackOf(s)));
}

/**
 * One of Sigi's tells that is true for `hand`, or null if none fits. The caller decides that he talks at all
 * ("manchmal", contract §4.5); this only guarantees the words are true.
 */
export function sigiTell(hand: CardMask, deck: DeckId, rng: Rng): string | null {
  const options: string[] = [];
  const long = longSuit(hand);
  if (long >= 0) for (const l of SIGI_TELLS.long) options.push(fillText(l, { suit: suitName(long, deck) }));
  const voids = voidSuits(hand);
  if (voids.length) {
    const s = rng.pick(voids);
    for (const l of SIGI_TELLS.void) options.push(fillText(l, { suit: suitName(s, deck) }));
  }
  const hints = (Object.keys(TELL_HINTS) as TellHintId[]).filter((id) => hintTrue(id, hand));
  if (hints.length) {
    const h = rng.pick(hints);
    for (const l of SIGI_TELLS.hint) options.push(fillText(l, { hint: TELL_HINTS[h].text }));
  }
  return options.length ? rng.pick(options) : null;
}
