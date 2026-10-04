// Inn names and inn rooms (contract §2, §9): usual names (Lamm, Krone, …) without claiming the house exists in that
// place, plus the eight painted rooms. Pure data and a pure name roller.
import type { Rng } from "../core/rng.ts";

export interface InnBase {
  /** "Krone" */
  base: string;
  /** "zur Krone" (dative with article, for "Gasthof zur Krone"). */
  dative: string;
}

export const INN_BASES: readonly InnBase[] = [
  { base: "Lamm", dative: "zum Lamm" },
  { base: "Krone", dative: "zur Krone" },
  { base: "Ochsen", dative: "zum Ochsen" },
  { base: "Adler", dative: "zum Adler" },
  { base: "Rössle", dative: "zum Rössle" },
  { base: "Hirsch", dative: "zum Hirsch" },
  { base: "Löwen", dative: "zum Löwen" },
  { base: "Sonne", dative: "zur Sonne" },
  { base: "Traube", dative: "zur Traube" },
  { base: "Linde", dative: "zur Linde" },
];

/** Inn interior art ids (public/art/inns/<id>.png) with a German name for the help and the album. */
export const INN_ROOMS = {
  village: "Dorfwirtschaft",
  besen: "Besenwirtschaft",
  clubhouse: "Vereinsheim",
  station: "Bahnhofsgaststätte",
  beergarden: "Biergarten",
  canteen: "Kantine",
  campsite: "Campingkneipe",
  tent: "Festzelt",
} as const;
export type InnRoomId = keyof typeof INN_ROOMS;
export const INN_ROOM_IDS = Object.keys(INN_ROOMS) as InnRoomId[];

/** How often each room turns up (the village inn is the classic). */
export const INN_ROOM_WEIGHTS: Record<InnRoomId, number> = {
  village: 52, besen: 9, clubhouse: 9, station: 6, beergarden: 9, canteen: 4, campsite: 5, tent: 6,
};

/** The Preisskat is held in a club house hall; the bikers' round has its own scene (bg/motorradtreff). */
export const TOURNAMENT_ROOM: InnRoomId = "clubhouse";
export const BIKERS_ROOM = "bikers";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Name patterns per room. `{b}` = base ("Krone"), `{d}` = dative ("zur Krone"), `{D}` = capitalised dative. */
const PATTERNS: Record<InnRoomId, readonly string[]> = {
  village: ["Gasthaus {b}", "Gasthof {d}", "{D}", "Gasthaus {d}", "Gasthof {b}"],
  besen: [
    "Besenwirtschaft am Weinberg", "Besenwirtschaft im Kelterhof", "Besenwirtschaft beim Wengerter",
    "Besenwirtschaft in der Scheuer", "Besenwirtschaft {d}",
  ],
  clubhouse: [
    "Vereinsheim vom TSV", "Vereinsheim Liederkranz", "Vereinsheim der Schützen", "Vereinsheim vom Musikverein",
    "Vereinsheim Obst- und Gartenbau",
  ],
  station: ["Bahnhofsgaststätte", "Bahnhofswirtschaft", "Bahnhofsgaststätte {d}"],
  beergarden: ["Biergarten {d}", "Gartenwirtschaft {b}", "Biergarten am Bach"],
  canteen: ["Werkskantine", "Kantine im Bauhof", "Kantine der Ziegelei"],
  campsite: ["Campingkneipe am Platz", "Kiosk am Campingplatz", "Platzwirtschaft {d}"],
  tent: ["Festzelt zur Hocketse", "Festzelt vom Musikverein", "Festzelt am Sportplatz"],
};

/** Where the Schultes and his Amtsbote play (contract §4.5): the town-hall cellar and its kin. */
export const RATHAUS_NAMES: readonly string[] = ["Ratskeller", "Rathausstube", "Gasthaus zum Rathaus", "Ratsstube"];

/** A name for an inn of this room, avoiding names in `used` (adds the result to `used`). */
export function rollInnName(rng: Rng, room: InnRoomId, used: Set<string>): string {
  const bases = rng.shuffle([...INN_BASES]);
  const patterns = rng.shuffle([...PATTERNS[room]]);
  for (const p of patterns) {
    for (const b of bases) {
      const name = p.replace("{b}", b.base).replace("{D}", cap(b.dative)).replace("{d}", b.dative);
      if (!used.has(name)) {
        used.add(name);
        return name;
      }
      if (!p.includes("{")) break; // fixed names only once
    }
  }
  // Everything taken (cannot happen with ≤ 15 inns per stage): fall back to a village inn with a number.
  const b = bases[0];
  let n = 2;
  while (used.has(`Gasthaus ${b.base} ${n}`)) n++;
  const name = `Gasthaus ${b.base} ${n}`;
  used.add(name);
  return name;
}
