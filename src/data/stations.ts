// Station kinds on the stage map (contract §4.2): German name, one line for the map preview, and the expected
// duration in minutes (used by the headless tour runs). Pure data.
import type { StationKind } from "../game/ids.ts";

export interface StationDef {
  id: StationKind;
  name: string;
  /** One line shown when the station is selected on the map. */
  text: string;
  /** Expected minutes [min, max] at this station (contract §4.2). */
  minutes: [number, number];
  /** Frame base in the `icons` atlas (see stationIcon for the state suffix). */
  icon: string;
}

export const STATION_DEFS: Record<StationKind, StationDef> = {
  start: { id: "start", name: "Abfahrt", text: "Hier beginnt die Etappe.", minutes: [0, 0], icon: "station-start" },
  inn: { id: "inn", name: "Wirtshaus", text: "Eine Runde Skat, drei Spiele gegen zwei Stammgäste, mit Hausregel.", minutes: [6, 9], icon: "station-inn" },
  bikers: { id: "bikers", name: "Motorradtreff", text: "Eine scharfe Runde Skat mit zwei vom Treff, danach ein Benzingespräch mit Folgen.", minutes: [6, 9], icon: "station-bikers" },
  problem: { id: "problem", name: "Stammtisch-Aufgabe", text: "Eine Skataufgabe: Endspiel, Drücken oder Reizen.", minutes: [1, 3], icon: "station-problem" },
  chess: { id: "chess", name: "Schachbrett", text: "Eine Schachaufgabe am Freiluftbrett im Park.", minutes: [2, 4], icon: "station-chess" },
  sudoku: { id: "sudoku", name: "Kiosk", text: "Das Sudoku aus dem Lokalblatt: klein (6×6) oder groß (9×9), nach Wahl.", minutes: [3, 12], icon: "station-sudoku" },
  pitch: { id: "pitch", name: "Stellplatz", text: "Tanken (+2 Sprit), speichern und Pause machen.", minutes: [1, 1], icon: "station-pitch" },
  dogs: { id: "dogs", name: "Hundewiese", text: "Einen Hund mitnehmen oder tauschen, dazu ein Hunde-Ereignis.", minutes: [1, 1], icon: "station-dogs" },
  market: { id: "market", name: "Flohmarkt", text: "Drei Andenken zur Auswahl.", minutes: [1, 2], icon: "station-market" },
  garage: { id: "garage", name: "Werkstatt", text: "Ausbau kaufen, Sprit für Mark.", minutes: [1, 2], icon: "station-garage" },
  event: { id: "event", name: "Unterwegs", text: "Unterwegs passiert etwas, mit zwei oder drei Entscheidungen.", minutes: [1, 1], icon: "station-event" },
  tournament: { id: "tournament", name: "Preisskat", text: "Das Etappenfinale: sechs Spiele in Turnierwertung gegen die zwei Favoriten.", minutes: [12, 18], icon: "station-tournament" },
};

/** Icon states in the `icons` atlas: `station-<kind>-<state>`, and `station-<kind>-sm` for small use. */
export type StationIconState = "locked" | "normal" | "reachable" | "visited" | "sm";

export function stationIcon(kind: StationKind, state: StationIconState): string {
  return state === "sm" ? `${STATION_DEFS[kind].icon}-sm` : `${STATION_DEFS[kind].icon}-${state}`;
}

export function stationName(kind: StationKind): string {
  return STATION_DEFS[kind]?.name ?? kind;
}

/** "Einsatz" names for the inn preview. */
export const STAKES_NAMES = { small: "klein", medium: "mittel", high: "hoch" } as const;
