// Upgrades from the garage (contract §4.12): 6–12 Mark, they stay for the tour. `icon` is the frame in the `items`
// atlas. Pure data.
import type { ItemDef } from "../game/types.ts";
import type { UpgradeId } from "../game/ids.ts";

export const UPGRADE_DEFS: Record<UpgradeId, ItemDef<UpgradeId>> = {
  "aux-tank": { id: "aux-tank", name: "Zusatztank", text: "Zwei Striche mehr im Tank, und er kommt voll.", price: 10, icon: "aux-tank" },
  "roof-box": { id: "roof-box", name: "Dachbox", text: "Zwei Plätze mehr für Andenken.", price: 6, icon: "roof-box" },
  "dog-bed": { id: "dog-bed", name: "Hundebett", text: "Ein dritter Hund darf mitfahren.", price: 7, icon: "dog-bed" },
  awning: { id: "awning", name: "Markise", text: "Am Stellplatz gibt es eine Stammtisch-Aufgabe gratis dazu.", price: 8, icon: "awning" },
  fridge: { id: "fridge", name: "Kühlschrank", text: "Einmal pro Etappe kommt ein verlorener Strich Sprit zurück.", price: 9, icon: "fridge" },
  radio: { id: "radio", name: "Autoradio", text: "Auf der Karte darfst du die Musik wählen.", price: 6, icon: "radio" },
  sidecar: { id: "sidecar", name: "Beiwagen", text: "Der erste Abstecher jeder Etappe ist frei, und ein Hund fährt im Beiwagen mit.", price: 12, icon: "sidecar" },
};

export function upgradeName(id: UpgradeId): string {
  return UPGRADE_DEFS[id]?.name ?? id;
}
