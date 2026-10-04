// Vehicles (contract §4.12). The camper with the motorcycle on the rear rack starts every tour; the sidecar rig is
// unlocked by the first Wanderpokal. Pure data.
import type { VehicleDef } from "../game/types.ts";
import type { UpgradeId, VehicleId } from "../game/ids.ts";

export const VEHICLE_DEFS: Record<VehicleId, VehicleDef> = {
  camper: {
    id: "camper",
    name: "Wohnmobil mit Motorrad",
    text: "Tank 5, vier Andenken-Plätze, zwei Hunde. Der Stellplatz gibt +2, ein Abstecher kostet einen Strich.",
    fuelMax: 5,
    souvenirSlots: 4,
    dogSlots: 2,
  },
  "sidecar-rig": {
    id: "sidecar-rig",
    name: "Gespann",
    text:
      "Motorrad mit Beiwagen: Tank 4, zwei Andenken-Plätze, ein Hund im Beiwagen. Alle Abstecher frei, am " +
      "Motorradtreff doppelter Pott. Als Ausbau passt nur der Zusatztank.",
    fuelMax: 4,
    souvenirSlots: 2,
    dogSlots: 1,
  },
};

/** The rules behind the vehicle text (the tour logic reads these, never the text). */
export interface VehicleRules {
  /** Fuel a pitch gives (before the thermos). */
  pitchFuel: number;
  /** Fuel a motorcycle detour costs (0 = all detours free). */
  detourCost: number;
  /** Pot factor at the bikers' meeting. */
  bikersPot: number;
  /** Upgrades the garage can fit (null = all). */
  upgrades: readonly UpgradeId[] | null;
}

export const VEHICLE_RULES: Record<VehicleId, VehicleRules> = {
  camper: { pitchFuel: 2, detourCost: 1, bikersPot: 1, upgrades: null },
  "sidecar-rig": { pitchFuel: 2, detourCost: 0, bikersPot: 2, upgrades: ["aux-tank"] },
};

/** The tank on Sportlich; the difficulty shifts it (contract §4.14: 6 / 5 / 4 for the camper). */
export const REFERENCE_TANK = 5;
