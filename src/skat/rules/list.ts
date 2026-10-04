// The Liste: extended Seeger-Fabian scoring (SkWO 5.1 / 8.12 of the ISkO booklet) and the house rules (contract §4.3,
// §4.4). The same list is used at the inn and at the Preisskat ("Turnierwertung").
//
// Per declared game, with v = single game value (ISkO 5.3) and f = Kontra/Re × Bock factor:
//   won:  declarer + v·f + 50
//   lost: declarer − 2·v·f − 50 (ISkO 5.3.4 doubles lost games once; the −50 is the Seeger-Fabian Wertungspunkt),
//         each of the two defenders + 40 (three-table)
// Passed in (eingepasst): nothing. Ramsch: see ramsch.ts (minus points without ±50/40).
import type { HouseRuleId } from "../../game/ids.ts";
import type { ListBonus } from "../../game/types.ts";
import type { Seat } from "./deal.ts";
import type { DeclKind } from "./value.ts";

export const SEEGER_WON = 50;
export const SEEGER_LOST = 50;
/** Credit for each defender when the declarer loses at a three-table (40; at a four-table it would be 30). */
export const SEEGER_DEFENCE = 40;

/** Seeger-Fabian list change for a declared game. `written` = +v·f when won, −2·v·f when lost. */
export function seegerFabian(declarer: Seat, won: boolean, written: number): [number, number, number] {
  const list: [number, number, number] = [0, 0, 0];
  list[declarer] = written + (won ? SEEGER_WON : -SEEGER_LOST);
  if (!won) for (const s of [0, 1, 2] as Seat[]) if (s !== declarer) list[s] = SEEGER_DEFENCE;
  return list;
}

export const NO_BONUS: Readonly<ListBonus> = { grand: 0, null: 0, hand: 0, schneider: 0, defence: 0 };

export function addBonus(a: ListBonus, b: ListBonus): ListBonus {
  return {
    grand: a.grand + b.grand,
    null: a.null + b.null,
    hand: a.hand + b.hand,
    schneider: a.schneider + b.schneider,
    defence: a.defence + b.defence,
  };
}

/** What a finished declared game looks like for the bonus rules. */
export interface BonusFacts {
  declarer: Seat;
  kind: DeclKind;
  hand: boolean;
  won: boolean;
  /** Won with the defenders Schneider (or Schwarz). */
  schneider: boolean;
}

/**
 * Extra list points for one seat (contract §4.12 beer mats, §4.4 evenings): a won Grand / Null / Hand game / Schneider
 * of this seat as declarer, or a won defence (the declarer lost) of this seat as defender. Ramsch and passed games
 * get no bonus.
 */
export function bonusFor(facts: BonusFacts, seat: Seat, bonus: ListBonus): number {
  if (seat === facts.declarer) {
    if (!facts.won) return 0;
    let b = 0;
    if (facts.kind === "grand") b += bonus.grand;
    if (facts.kind === "null") b += bonus.null;
    if (facts.hand) b += bonus.hand;
    if (facts.schneider) b += bonus.schneider;
    return b;
  }
  return facts.won ? 0 : bonus.defence;
}

// ─── House rules ──────────────────────────────────────────────────────────────────────────────────────────

/** Rule switches the game engine needs (game.ts). */
export interface RuleOptions {
  /** What happens when all three pass: eingepasst (ISkO 3.3.7), Ramsch or Schieberamsch. */
  allPass: "passed" | "ramsch" | "schieberamsch";
  /** Defenders may say Kontra (×2), the declarer Re (×4). */
  kontra: boolean;
  /** Every game of the round counts double. */
  bock: boolean;
}

export const STANDARD_RULES: Readonly<RuleOptions> = { allPass: "passed", kontra: false, bock: false };

/** Everything a house rule changes (contract §4.4), for the game engine, the round and the tour. */
export interface HouseRuleEffects {
  id: HouseRuleId;
  rules: RuleOptions;
  /**
   * Evening bonus for every seat (grand-evening, null-evening, hand-evening). The tour merges it into the player's
   * `TablePerks.listBonus`; the round module adds it on its own only for the two opponents (round.ts).
   */
  listBonus: ListBonus;
  /** Pot factor (sharp: ×2). Tour level. */
  potFactor: number;
  /** Fuel-loss factor for the last place (sharp: ×2). Tour level. */
  fuelLossFactor: number;
  /** Games per inn round if the rule changes it (long-round: 6). The tour sets `RoundConfig.games`. */
  games: number | null;
  /** Skatkasse: every lost game pays this many Mark into the Kasse, the round winner takes it (0 = off). */
  kittyStake: number;
}

export function houseRuleEffects(id: HouseRuleId): HouseRuleEffects {
  const e: HouseRuleEffects = {
    id,
    rules: { ...STANDARD_RULES },
    listBonus: { ...NO_BONUS },
    potFactor: 1,
    fuelLossFactor: 1,
    games: null,
    kittyStake: 0,
  };
  switch (id) {
    case "standard":
      break;
    case "ramsch":
      e.rules.allPass = "ramsch";
      break;
    case "schieberamsch":
      e.rules.allPass = "schieberamsch";
      break;
    case "kontra":
      e.rules.kontra = true;
      break;
    case "bock":
      e.rules.bock = true;
      break;
    case "grand-evening":
      e.listBonus.grand = 20;
      break;
    case "null-evening":
      e.listBonus.null = 15;
      break;
    case "hand-evening":
      e.listBonus.hand = 15;
      break;
    case "sharp":
      e.potFactor = 2;
      e.fuelLossFactor = 2;
      break;
    case "long-round":
      e.games = 6;
      break;
    case "kitty":
      e.kittyStake = 1;
      break;
    default: {
      const never: never = id;
      throw new Error(`unknown house rule ${String(never)}`);
    }
  }
  return e;
}

export function ruleOptionsFor(id: HouseRuleId): RuleOptions {
  return houseRuleEffects(id).rules;
}
