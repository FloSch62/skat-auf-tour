// The dogs (contract §4.12). Breeds are fixed, names come from the profile (the defaults here match the neutral
// profile.default.json). Pure data.
import type { DogDef, Profile } from "../game/types.ts";
import type { DogId } from "../game/ids.ts";

export const DOG_DEFS: Record<DogId, DogDef> = {
  shepherd: {
    id: "shepherd",
    breed: "Schäferhund",
    defaultName: "Hasso",
    ability: "Passt auf: Einmal pro Etappe kostet ein letzter Platz im Wirtshaus keinen Sprit.",
    unlock: "Von Anfang an dabei.",
  },
  "wolfhound-a": {
    id: "wolfhound-a",
    breed: "Irischer Wolfshund",
    defaultName: "Finn",
    ability: "Weitgereist: Ein Abstecher mit dem Motorrad pro Etappe ist frei.",
    unlock: "Ereigniskette „Sonderfahrt nach Ungarn“.",
  },
  "wolfhound-b": {
    id: "wolfhound-b",
    breed: "Irischer Wolfshund",
    defaultName: "Bran",
    ability: "Die Ruhe selbst: Einmal pro Spiel darfst du deine Karte zurücknehmen, solange der Stich offen ist.",
    unlock: "Zehn Wirtshaus-Runden gewonnen.",
  },
  airedale: {
    id: "airedale",
    breed: "Airedale Terrier",
    defaultName: "Lumpi",
    ability: "Lässt nicht locker: Ein Versuch mehr bei Aufgaben und Schach, ein Feld gratis im Sudoku.",
    unlock: "Erster Sieg bei einem Preisskat.",
  },
  "schnauzer-a": {
    id: "schnauzer-a",
    breed: "Riesenschnauzer",
    defaultName: "Bella",
    ability: "Feine Nase: Einmal pro Runde siehst du vor dem Reizen eine Karte im Skat.",
    unlock: "Fünfzehn Schachaufgaben gelöst.",
  },
  "schnauzer-b": {
    id: "schnauzer-b",
    breed: "Riesenschnauzer",
    defaultName: "Bruno",
    ability:
      "Gast für eine Etappe und bringt Vesper mit: Wird der Tank leer, ist er wieder voll. Am Ende der Etappe " +
      "fährt er heim.",
    unlock: "Ereignis „Besuch“.",
  },
};

/** The dog's name from the profile, else the neutral default. */
export function dogName(profile: Pick<Profile, "dogs"> | undefined, id: DogId): string {
  return profile?.dogs?.[id] || DOG_DEFS[id]?.defaultName || id;
}

/** "Hasso, der Schäferhund" */
export function dogLabel(profile: Pick<Profile, "dogs"> | undefined, id: DogId): string {
  return `${dogName(profile, id)}, der ${DOG_DEFS[id].breed}`;
}
