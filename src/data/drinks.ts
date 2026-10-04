// The player's Stammgetränk (contract §4.1): scenery only, drinking is a quiet joke and never a mechanic (§0.9).
// `glass` is the frame base in the `drinks` atlas (`<glass>-0` empty … `<glass>-3` full). Pure data.
import type { DrinkId } from "../game/ids.ts";

export interface DrinkDef {
  id: DrinkId;
  /** Button label at the start ("Was trinkst du?"). */
  name: string;
  /** What stands on the table, as a phrase. */
  text: string;
  /** Glass in the `drinks` atlas. */
  glass: "beer" | "weizen" | "wine" | "cider" | "spezi";
  /** A second glass that may stand there instead (beer: eine Halbe or ein Weizen). */
  alt?: "weizen";
}

export const DRINK_DEFS: Record<DrinkId, DrinkDef> = {
  beer: { id: "beer", name: "Halbe", text: "eine Halbe", glass: "beer" },
  weizen: { id: "weizen", name: "Weizen", text: "ein Weizen", glass: "weizen" },
  wine: { id: "wine", name: "Viertele", text: "ein Viertele im Henkelglas", glass: "wine" },
  cider: { id: "cider", name: "Most", text: "ein Most aus dem Krug", glass: "cider" },
  spezi: { id: "spezi", name: "Spezi", text: "ein Spezi mit Strohhalm", glass: "spezi" },
};

/** The glass frame for a drink at a fill level 0 (empty) … 3 (full); `seed` picks the alternative glass when there is one. */
export function glassFrame(id: DrinkId, fill: 0 | 1 | 2 | 3, seed = 0): string {
  const d = DRINK_DEFS[id];
  const glass = d.alt && seed % 2 === 1 ? d.alt : d.glass;
  return `${glass}-${fill}`;
}
