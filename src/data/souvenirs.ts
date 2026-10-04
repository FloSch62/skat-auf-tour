// Souvenirs from the flea market (contract §4.12): 2–6 Mark, four slots on the camper. `icon` is the frame in the
// `items` atlas. Pure data.
import type { ItemDef } from "../game/types.ts";
import type { SouvenirId } from "../game/ids.ts";

export const SOUVENIR_DEFS: Record<SouvenirId, ItemDef<SouvenirId>> = {
  "reading-glasses": { id: "reading-glasses", name: "Lesebrille", text: "Zeigt am Tisch die gefallenen Trümpfe.", price: 4, icon: "reading-glasses" },
  notepad: { id: "notepad", name: "Notizblock", text: "Zeigt am Tisch die Augen beider Parteien.", price: 4, icon: "notepad" },
  "lucky-penny": { id: "lucky-penny", name: "Glücksgroschen", text: "Einmal pro Runde vor dem Reizen neu geben lassen.", price: 5, icon: "lucky-penny" },
  thermos: { id: "thermos", name: "Thermoskanne", text: "Der Stellplatz gibt einen Strich Sprit mehr.", price: 4, icon: "thermos" },
  "road-atlas": { id: "road-atlas", name: "Straßenatlas", text: "Hausregeln und Stammgäste eine Spalte weiter voraus sichtbar.", price: 3, icon: "road-atlas" },
  "piggy-bank": { id: "piggy-bank", name: "Sparbüchse", text: "+1 Mark nach jeder gewonnenen Runde.", price: 3, icon: "piggy-bank" },
  pennant: { id: "pennant", name: "Stammtischwimpel", text: "Der zweite Platz im Wirtshaus bringt 2 Mark.", price: 3, icon: "pennant" },
  "chess-clock": { id: "chess-clock", name: "Schachuhr", text: "Schachaufgaben bringen 2 Mark mehr.", price: 3, icon: "chess-clock" },
  pencil: { id: "pencil", name: "Bleistiftstummel", text: "Im Sudoku sind zwei Felder vorab gelöst.", price: 2, icon: "pencil" },
  "snack-board": { id: "snack-board", name: "Vesperbrett", text: "Der dritte Platz beim Preisskat kostet nur einen Strich.", price: 4, icon: "snack-board" },
  "dog-whistle": { id: "dog-whistle", name: "Hundepfeife", text: "Hundefähigkeiten wirken zweimal statt einmal.", price: 5, icon: "dog-whistle" },
  postcard: { id: "postcard", name: "Postkarte von daheim", text: "Einmal pro Tour: Bei leerem Tank gibt es zwei Striche statt der Heimfahrt.", price: 6, icon: "postcard" },
  "oil-can": { id: "oil-can", name: "Ölkännchen", text: "Ausbauten in der Werkstatt kosten 2 Mark weniger.", price: 3, icon: "oil-can" },
  magnifier: { id: "magnifier", name: "Lupe", text: "Einmal pro Aufgabe (Stammtisch, Schach) ein Hinweis, welche Karte oder Figur dran ist.", price: 4, icon: "magnifier" },
};

export function souvenirName(id: SouvenirId): string {
  return SOUVENIR_DEFS[id]?.name ?? id;
}
