// Beer mats (contract §4.12): a special rule for the rest of the tour, chosen after a Preisskat win (one of three)
// and rarely from events. Three slots. `icon` is the frame in the `items` atlas. Pure data.
import type { ItemDef } from "../game/types.ts";
import type { BeerMatId } from "../game/ids.ts";

export const BEER_MAT_DEFS: Record<BeerMatId, ItemDef<BeerMatId>> = {
  "grand-bonus": { id: "grand-bonus", name: "Grand-Prämie", text: "Jeder gewonnene Grand +20 Listenpunkte.", icon: "grand-bonus" },
  "null-bonus": { id: "null-bonus", name: "Null-Prämie", text: "Jedes gewonnene Nullspiel +15 Listenpunkte.", icon: "null-bonus" },
  "hand-bonus": { id: "hand-bonus", name: "Hand-Prämie", text: "Jedes gewonnene Handspiel +15 Listenpunkte.", icon: "hand-bonus" },
  "schneider-bonus": { id: "schneider-bonus", name: "Schneider-Prämie", text: "Jeder Schneider +15 Listenpunkte.", icon: "schneider-bonus" },
  "defence-bonus": { id: "defence-bonus", name: "Gegenspiel-Prämie", text: "Jedes gewonnene Gegenspiel +10 Listenpunkte.", icon: "defence-bonus" },
  redeal: { id: "redeal", name: "Neu geben", text: "Einmal pro Runde neu geben lassen.", icon: "redeal" },
  "extra-game": { id: "extra-game", name: "Viertes Spiel", text: "Jede Wirtshaus-Runde hat ein Spiel mehr.", icon: "extra-game" },
  forehand: { id: "forehand", name: "Vorhand", text: "Im ersten Spiel jeder Runde sitzt du in Vorhand.", icon: "forehand" },
  "double-pot": { id: "double-pot", name: "Doppelter Pott", text: "Pott und Spritverlust im Wirtshaus doppelt.", icon: "double-pot" },
};

export function beerMatName(id: BeerMatId): string {
  return BEER_MAT_DEFS[id]?.name ?? id;
}
