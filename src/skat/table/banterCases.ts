// Hand-made table situations that provoke each kind of banter (banter.ts): used by the unit test and by the dev route
// /?dev=table-banter&case=<id>. Each case is a real, legal game: fixed cards, bidding, declaration and the first cards
// of a trick are replayed through the rules engine; `script` holds the remaining cards of the trick that triggers it.
import { applyAction, declaration, newGame, parseCard, parseCards } from "../rules/index.ts";
import type { Action, Card, CardMask, GameState, Seat } from "../rules/index.ts";

export type BanterCaseId = "overtake" | "smear" | "letThrough" | "robbed" | "aceTrumped" | "lost60";

export interface BanterCase {
  id: BanterCaseId;
  /** German one-liner for the dev route. */
  title: string;
  /** The state before the scripted cards. */
  state: GameState;
  /** The cards still to come in the trick (incl. the player's, played for him in the dev route). */
  script: Action[];
}

/** Fill three hands of ten and a skat: fixed cards per seat, the rest dealt in card order to seats that may take them. */
function dealWith(fixed: [string, string, string], forbid: [CardMask, CardMask, CardMask]): { hands: [CardMask, CardMask, CardMask]; skat: [Card, Card] } {
  const hands: [CardMask, CardMask, CardMask] = [parseCards(fixed[0]), parseCards(fixed[1]), parseCards(fixed[2])];
  const used = hands[0] | hands[1] | hands[2];
  const rest: Card[] = [];
  for (let c = 0; c < 32; c++) if (!(used & (1 << c))) rest.push(c);
  const count = (m: CardMask) => {
    let n = 0;
    for (let c = 0; c < 32; c++) if (m & (1 << c)) n++;
    return n;
  };
  const leftover: Card[] = [];
  for (const c of rest) {
    const seat = ([0, 1, 2] as Seat[]).find((s) => count(hands[s]) < 10 && !(forbid[s] & (1 << c)));
    if (seat === undefined) leftover.push(c);
    else hands[seat] |= 1 << c;
  }
  if (leftover.length !== 2) throw new Error(`banter case: ${leftover.length} cards left for the skat`);
  return { hands, skat: [leftover[0], leftover[1]] };
}

const HEARTS = parseCards("H7 H8 H9 HQ HK HT HA HJ");

function play(s: GameState, seat: Seat, code: string): GameState {
  return applyAction(s, { type: "play", seat, card: parseCard(code) });
}

/** Seat 0 plays Grand Hand from Vorhand (dealer 2): both regulars pass, Vorhand takes the game. */
function playerGrand(fixed: [string, string, string], forbid: [CardMask, CardMask, CardMask]): GameState {
  let s = newGame({ seed: 1, dealer: 2, cards: dealWith(fixed, forbid) });
  s = applyAction(s, { type: "pass", seat: 1 });
  s = applyAction(s, { type: "pass", seat: 2 });
  s = applyAction(s, { type: "hold", seat: 0 });
  return applyAction(s, { type: "declare", seat: 0, declaration: declaration("grand", { hand: true }) });
}

/** The left regular (seat 1) plays Grand Hand from Vorhand (dealer 0). */
function leftGrand(fixed: [string, string, string], forbid: [CardMask, CardMask, CardMask]): GameState {
  let s = newGame({ seed: 1, dealer: 0, cards: dealWith(fixed, forbid) });
  s = applyAction(s, { type: "pass", seat: 2 });
  s = applyAction(s, { type: "pass", seat: 0 });
  s = applyAction(s, { type: "hold", seat: 1 });
  return applyAction(s, { type: "declare", seat: 1, declaration: declaration("grand", { hand: true }) });
}

const p = (seat: Seat, code: string): Action => ({ type: "play", seat, card: parseCard(code) });

export function banterCase(id: BanterCaseId): BanterCase {
  switch (id) {
    case "overtake": {
      // the player leads Herz 7, Links takes it with the Ass, Rechts (no Herz) trumps his own partner's trick
      const s = play(playerGrand(["H7 CJ SJ CA CT SA ST DA DT D9", "HA HT HK", "HJ DJ S7"], [0, 0, HEARTS]), 0, "H7");
      return { id, title: "Rechts sticht den sicheren Stich seines Partners", state: s, script: [p(1, "HA"), p(2, "HJ")] };
    }
    case "smear": {
      // Links has the trick with the Herz-Ass, Rechts (no Herz) throws a blank Pik 7 instead of smearing
      const s = play(playerGrand(["H7 CJ SJ CA CT SA ST DA DT D9", "HA HT HK", "S7 DK DQ"], [0, 0, HEARTS]), 0, "H7");
      return { id, title: "Rechts schmiert nichts auf den Stich seines Partners", state: s, script: [p(1, "HA"), p(2, "S7")] };
    }
    case "letThrough": {
      // Links plays Grand: he leads the Herz-Zehn, Rechts follows small, the player keeps his Ass and plays the 8
      let s = leftGrand(["HA H8 S7", "HT CJ SJ HJ DJ CA CT SA ST DA", "H7"], [0, 0, 0]);
      s = play(s, 1, "HT");
      return { id, title: "Der Spieler lässt die Herz-Zehn des Alleinspielers durch", state: s, script: [p(2, "H7"), p(0, "H8")] };
    }
    case "robbed": {
      // the player plays Grand from Hinterhand; Links leads Herz 7, Rechts drops his Herz-Ass, the player (no Herz)
      // trumps it
      let t = newGame({ seed: 1, dealer: 0, cards: dealWith(["CJ SJ HJ DJ CA CT SA ST DA DT", "H7 H8", "HA H9"], [HEARTS, 0, 0]) });
      t = applyAction(t, { type: "bid", seat: 2, value: 18 });
      t = applyAction(t, { type: "pass", seat: 1 });
      t = applyAction(t, { type: "bid", seat: 0, value: 20 });
      t = applyAction(t, { type: "pass", seat: 2 });
      t = applyAction(t, { type: "declare", seat: 0, declaration: declaration("grand", { hand: true }) });
      t = play(t, 1, "H7");
      return { id, title: "Das Herz-Ass von Rechts geht an den Spieler", state: t, script: [p(2, "HA"), p(0, "DJ")] };
    }
    case "aceTrumped": {
      // Links leads his Herz-Ass, the player (Grand, no Herz) trumps it
      let t = newGame({ seed: 1, dealer: 0, cards: dealWith(["CJ SJ HJ DJ CA CT SA ST DA DT", "HA H8", "H7 H9"], [HEARTS, 0, 0]) });
      t = applyAction(t, { type: "bid", seat: 2, value: 18 });
      t = applyAction(t, { type: "pass", seat: 1 });
      t = applyAction(t, { type: "bid", seat: 0, value: 20 });
      t = applyAction(t, { type: "pass", seat: 2 });
      t = applyAction(t, { type: "declare", seat: 0, declaration: declaration("grand", { hand: true }) });
      t = play(t, 1, "HA");
      return { id, title: "Links spielt das Herz-Ass aus, der Spieler sticht", state: t, script: [p(2, "H7"), p(0, "DJ")] };
    }
    case "lost60": {
      // the player plays Grand; the defenders already counted 50 Augen (dev shortcut), Links leads the Herz-Ass,
      // Rechts smears the Herz-Zehn: 21 more make 71, the game is lost
      const s = play(playerGrand(["H7 CJ SJ CA CT SA ST DA DT D9", "HA HK HQ", "HT DJ S7"], [0, 0, 0]), 0, "H7");
      return { id, title: "Die Gegenspieler kommen über 60 Augen", state: { ...s, points: [10, 30, 20] }, script: [p(1, "HA"), p(2, "HT")] };
    }
  }
}

export const BANTER_CASES: BanterCaseId[] = ["overtake", "smear", "letThrough", "robbed", "aceTrumped", "lost60"];
