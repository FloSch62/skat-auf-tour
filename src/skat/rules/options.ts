// Declaration options with their values, for the table's six buttons (Karo, Herz, Pik, Kreuz, Grand, Null; contract
// §4.3) and for bidding estimates. Hand games are valued from the declarer's own ten cards; because the unseen skat
// counts for the matadors (ISkO 2.4.2), the range over every possible skat is given as well.
import { ALL_CARDS, cardsOf } from "./cards.ts";
import type { CardMask } from "./cards.ts";
import type { GameState } from "./game.ts";
import { DECL_KINDS, declaration, declarationError, declarationValue, matadors, nullValue } from "./value.ts";
import type { DeclKind, Declaration, Matadors } from "./value.ts";

export interface DeclareMods {
  ouvert?: boolean;
  schneiderAnnounced?: boolean;
  schwarzAnnounced?: boolean;
}

export interface GameOption {
  kind: DeclKind;
  /** The normalised declaration this button would announce. */
  declaration: Declaration;
  /** Allowed now (Hand mods only before picking up; a Null below the bid is not allowed, ISkO 3.4.4). */
  allowed: boolean;
  /** Value if won at the announced level, matadors counted on the known cards. */
  value: number;
  /** Range of `value` over every possible unseen skat (equal to `value` once the skat is known). */
  minValue: number;
  maxValue: number;
  /** `value` reaches the bid. */
  reachesBid: boolean;
  /** Even the lowest possible value reaches the bid. */
  surelyReachesBid: boolean;
  /** Value if the defenders also end Schneider (null when already announced, and for Null). */
  schneiderValue: number | null;
  /** Value if the defenders also end Schwarz (null when already announced, and for Null). */
  schwarzValue: number | null;
  /** Matadors on the known cards (null for Null). */
  matadors: Matadors | null;
}

export interface OptionContext {
  /** The cards the declarer knows to be his: 10 (Hand, skat unseen) or 12 (after picking up). */
  cards: CardMask;
  /** True if the skat is unseen (Hand game): the skat may hold matadors. */
  hand: boolean;
  bid: number;
}

/** Options for an explicit card set (AI estimates, problems). */
export function optionsFor(ctx: OptionContext, mods: DeclareMods = {}): GameOption[] {
  const unseen = ctx.hand ? cardsOf(ALL_CARDS & ~ctx.cards) : [];
  return DECL_KINDS.map((kind) => {
    if (kind === "null") {
      const d = declaration("null", { hand: ctx.hand, ouvert: !!mods.ouvert });
      const v = nullValue(d);
      return {
        kind,
        declaration: d,
        allowed: v >= ctx.bid,
        value: v,
        minValue: v,
        maxValue: v,
        reachesBid: v >= ctx.bid,
        surelyReachesBid: v >= ctx.bid,
        schneiderValue: null,
        schwarzValue: null,
        matadors: null,
      };
    }
    const d = declaration(kind, {
      hand: ctx.hand,
      ouvert: !!mods.ouvert,
      schneiderAnnounced: !!mods.schneiderAnnounced,
      schwarzAnnounced: !!mods.schwarzAnnounced,
    });
    const allowed = declarationError(d, { skatTaken: !ctx.hand, bid: 0 }) === null;
    const mat = matadors(ctx.cards, kind);
    const value = declarationValue(d, mat.count);
    let minValue = value;
    let maxValue = value;
    if (ctx.hand) {
      for (let i = 0; i < unseen.length; i++)
        for (let j = i + 1; j < unseen.length; j++) {
          const m = matadors(ctx.cards | (1 << unseen[i]) | (1 << unseen[j]), kind);
          const v = declarationValue(d, m.count);
          if (v < minValue) minValue = v;
          if (v > maxValue) maxValue = v;
        }
    }
    return {
      kind,
      declaration: d,
      allowed,
      value,
      minValue,
      maxValue,
      reachesBid: value >= ctx.bid,
      surelyReachesBid: minValue >= ctx.bid,
      schneiderValue: d.schneiderAnnounced ? null : declarationValue(d, mat.count, { schneider: true }),
      schwarzValue: d.schwarzAnnounced ? null : declarationValue(d, mat.count, { schwarz: true }),
      matadors: mat,
    };
  });
}

/**
 * The six options for the declarer in the current state: phase "skat" (before picking up → Hand games with the mods),
 * "discard" (12 cards in hand, exact values for after the discard) or "declare" (after discarding).
 */
export function gameOptions(s: GameState, mods: DeclareMods = {}): GameOption[] {
  if (s.declarer === null || (s.phase !== "skat" && s.phase !== "discard" && s.phase !== "declare")) return [];
  const hand = s.phase === "skat";
  const cards = s.phase === "declare" ? s.hands[s.declarer] | s.skat : s.hands[s.declarer];
  return optionsFor({ cards, hand, bid: s.bid }, mods);
}
