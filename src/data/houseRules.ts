// House rules (contract §4.4): the board text before every round (from the help texts) and the map generator's
// weights. Pure data.
import type { HouseRuleDef } from "../game/types.ts";
import type { HouseRuleId } from "../game/ids.ts";
import { HOUSE_RULES } from "../game/ids.ts";
import { HOUSE_RULE_TEXTS } from "../content/help.ts";

/**
 * The rules as shown before a round. Name and text come from the Text area's help (src/content/help.ts), so the
 * board, the help pages and the code say the same thing (contract §4.4).
 */
export const HOUSE_RULE_DEFS: Record<HouseRuleId, HouseRuleDef> = Object.fromEntries(
  HOUSE_RULES.map((id) => [id, { id, name: HOUSE_RULE_TEXTS[id].name, text: HOUSE_RULE_TEXTS[id].text }]),
) as Record<HouseRuleId, HouseRuleDef>;

/** One short line for the map preview ("Pott und Spritverlust doppelt."). */
export function houseRuleShort(id: HouseRuleId): string {
  return HOUSE_RULE_TEXTS[id]?.short ?? "";
}

export function houseRuleName(id: HouseRuleId): string {
  return HOUSE_RULE_DEFS[id]?.name ?? id;
}

/**
 * How often each house rule turns up at an inn outside column 1 (the map generator's weights; balance runs tune
 * them). Column 1, the tutorial inn and the Preisskat always play "standard".
 */
export const HOUSE_RULE_WEIGHTS: Record<HouseRuleId, number> = {
  standard: 22,
  ramsch: 10,
  schieberamsch: 5,
  kontra: 10,
  bock: 6,
  "grand-evening": 7,
  "null-evening": 6,
  "hand-evening": 6,
  sharp: 6,
  "long-round": 3,
  kitty: 8,
};
