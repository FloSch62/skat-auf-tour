// Table banter (contract §0.9: "Am Tisch wird geschimpft wie am echten Stammtisch"): when does a regular scold his
// partner, grumble about a lost Ass, blame himself or tease the declarer? Pure detection over a finished trick or
// game; the scene decides who actually speaks (chance, cool-down, one bubble at a time) and picks the line.
//
// Honest by construction: every reason is visible on the table (the cards of the trick, who did not follow, the
// counted Augen). Where a hand is consulted (could the partner have stayed under? could the player have beaten the
// declarer's card?), it only *suppresses* an unfair scolding or concerns the player's own cards, and bubbles are
// random anyway — so no bubble ever tells anybody about a hidden card.
import { CARD_POINTS, TRUMP, beats, cardsOf, legalMoves, rulesOf } from "../rules/index.ts";
import type { Card, GameResult, GameState, Seat } from "../rules/index.ts";

export type BanterSituation = "blunder" | "robbed" | "selfBlame" | "tease";

export interface Banter {
  situation: BanterSituation;
  /** Who would say it (only regulars, seats 1 and 2, ever speak). */
  speaker: Seat;
  /** Whom it is aimed at ({target}); null when he talks about himself. */
  target: Seat | null;
  /** Why (for tests and the dev route). */
  reason: "overtake" | "smearNothing" | "letThrough" | "aceTrumped" | "robbed" | "lost60" | "overbid" | "lostGame";
  /** Base chance that it is said at all (the scene adds cool-downs). */
  chance: number;
}

/** Order of preference when one trick gives several reasons (only one scolding per trick). */
const PRIORITY: Banter["reason"][] = ["overtake", "letThrough", "aceTrumped", "robbed", "lost60", "smearNothing"];

const sameParty = (decl: Seat, a: Seat, b: Seat) => a === b || (a !== decl && b !== decl);

/**
 * Banter after a trick. `before` is the state just before the trick's last card, `after` the state with the trick
 * completed. Declared games only (in Ramsch everybody is alone and Augen are bad news anyway).
 */
export function trickBanter(before: GameState, after: GameState): Banter[] {
  const decl = after.declarer;
  if (decl === null || !after.declaration || after.tricks.length === before.tricks.length) return [];
  const r = rulesOf(after);
  if (!r) return [];
  const rec = after.tricks[after.tricks.length - 1];
  const order = [0, 1, 2].map((i) => ((rec.leader + i) % 3) as Seat);
  const [c0, c1, c2] = rec.cards;
  const last = order[2];
  const before2 = beats(r, c1, c0) ? 1 : 0; // who was winning before the last card
  const winSeatBefore = order[before2];
  const winCardBefore = rec.cards[before2];
  const winCard = rec.cards[order.indexOf(rec.winner)];
  const isNull = r.isNull;
  const out: Banter[] = [];

  // the last player is a defender and his partner already had the trick (the declarer has played)
  const partnerHad = last !== decl && winSeatBefore !== decl && winSeatBefore !== last;
  if (partnerHad && !isNull && rec.winner === last) {
    // he took it from his own partner although he could have stayed under
    const legal = cardsOf(legalMoves(r, before.hands[last], c0));
    if (legal.some((c) => !beats(r, c, winCardBefore))) out.push({ situation: "blunder", speaker: winSeatBefore, target: last, reason: "overtake", chance: 0.6 });
  }
  if (partnerHad && !isNull && rec.winner === winSeatBefore) {
    // he did not follow (so he could choose any card) and threw a blank card on his partner's sure trick
    const followed = (r.follow[c0] & (1 << c2)) !== 0;
    if (!followed && CARD_POINTS[c2] === 0) out.push({ situation: "blunder", speaker: winSeatBefore, target: last, reason: "smearNothing", chance: 0.2 });
  }
  // the player, last to play as a defender, lets the declarer's trick through with a higher card of the led suit in hand
  if (!isNull && last === 0 && decl !== 0 && rec.winner === decl && rec.points >= 10) {
    const legal = cardsOf(legalMoves(r, before.hands[0], c0));
    const couldWin = legal.some((c) => r.classOf[c] === r.classOf[c0] && beats(r, c, winCard));
    const partner = ([1, 2] as Seat[]).find((s) => s !== decl)!;
    if (couldWin) out.push({ situation: "blunder", speaker: partner, target: 0, reason: "letThrough", chance: 0.5 });
  }
  if (!isNull) {
    // a regular led an Ass of a plain suit and the other party trumped it
    if (CARD_POINTS[c0] === 11 && r.classOf[c0] !== TRUMP && r.classOf[winCard] === TRUMP && !sameParty(decl, order[0], rec.winner)) {
      out.push({ situation: "selfBlame", speaker: order[0], target: null, reason: "aceTrumped", chance: 0.5 });
    }
    // a regular's Ass or Zehn went to the other party
    order.forEach((seat, i) => {
      const c: Card = rec.cards[i];
      if (CARD_POINTS[c] >= 10 && !sameParty(decl, seat, rec.winner)) out.push({ situation: "robbed", speaker: seat, target: rec.winner, reason: "robbed", chance: 0.4 });
    });
    // the defenders just reached 60 Augen: the declarer cannot win any more (his Skat counts at most for 60)
    const def = (s: GameState) => s.points[0] + s.points[1] + s.points[2] - s.points[decl];
    if (def(before) < 60 && def(after) >= 60) {
      for (const s of [1, 2] as Seat[]) if (s !== decl) out.push({ situation: "tease", speaker: s, target: decl, reason: "lost60", chance: 0.5 });
    }
  }
  return out.filter((b) => b.speaker !== 0).sort((a, b) => PRIORITY.indexOf(a.reason) - PRIORITY.indexOf(b.reason));
}

/**
 * Banter for the end of a declared game: the declarer overbid or lost — he blames himself (a regular) or the others
 * tease him. Ordered by preference; the scene may pick one at random.
 */
export function gameBanter(r: GameResult): Banter[] {
  if (r.type !== "declared" || r.declarer === null || r.won) return [];
  const decl = r.declarer;
  const reason: Banter["reason"] = r.overbid ? "overbid" : "lostGame";
  const out: Banter[] = [];
  if (decl !== 0) out.push({ situation: "selfBlame", speaker: decl, target: null, reason, chance: 0.5 });
  for (const s of [1, 2] as Seat[]) if (s !== decl) out.push({ situation: "tease", speaker: s, target: decl, reason, chance: 0.6 });
  return out;
}
