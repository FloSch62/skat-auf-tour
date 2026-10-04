// Difficulty (contract §4.14): chosen before the tour, valid for the whole tour, no hidden adjustment. Pure data.
import type { DifficultyDef } from "../game/types.ts";
import type { DifficultyId } from "../game/ids.ts";

export const DIFFICULTY_DEFS: Record<DifficultyId, DifficultyDef> = {
  cozy: {
    id: "cozy",
    name: "Gemütlich",
    text: "Mehr schwache und mittlere Stammgäste, Tank mit 6 Strichen, Pott ×1,25. Beim Preisskat kostet der zweite Platz keinen Sprit.",
    fuelMax: 6,
    potFactor: 1.25,
    secondLoss: 0,
    thirdLoss: 2,
    // weak, medium, strong, very strong
    mix: [5, 4, 1, 0],
    depth: 0.6,
  },
  sporty: {
    id: "sporty",
    name: "Sportlich",
    text: "Gemischte Stammgäste, Tank mit 5 Strichen. Beim Preisskat kostet der zweite Platz einen Strich, der dritte zwei.",
    fuelMax: 5,
    potFactor: 1,
    secondLoss: 1,
    thirdLoss: 2,
    mix: [2, 5, 2.5, 0.5],
    depth: 1,
  },
  sharp: {
    id: "sharp",
    name: "Scharf",
    text: "Mehr starke Stammgäste, die tiefer rechnen, Tank mit 4 Strichen. Beim Preisskat kosten der zweite und der dritte Platz zwei Striche.",
    fuelMax: 4,
    potFactor: 1,
    secondLoss: 2,
    thirdLoss: 2,
    mix: [1, 3.5, 4, 1.5],
    // Real AI check (docs/notes-tour.md): the favourites win the final clearly more often at 1.8 than at 1.4.
    depth: 1.8,
  },
};

export function difficultyName(id: DifficultyId): string {
  return DIFFICULTY_DEFS[id]?.name ?? id;
}
