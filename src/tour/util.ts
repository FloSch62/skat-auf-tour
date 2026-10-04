// Small pure helpers shared by the tour modules: the environment passed into every call, seeded generators, pack
// lookups and German number formatting. No DOM, no world state: pack and profile always come in as arguments.
import { Rng, hashString } from "../core/rng.ts";
import type { BookState, EventDef, MapNode, PlaceDef, PlacePack, Profile, RegionDef, TourState } from "../game/types.ts";
import type { BeerMatId, DogId, RegionId, SouvenirId, UpgradeId } from "../game/ids.ts";

/**
 * Everything the tour logic needs from outside the saved state. Screens build it once from the world, the settings
 * and the content; tests and headless runs build it by hand.
 */
export interface TourEnv {
  pack: PlacePack;
  profile: Profile;
  /** Player name (settings.name) for {name}. */
  name: string;
  /** All event definitions (src/content/events), passed in so the runtime stays pure. */
  events: readonly EventDef[];
  /** The Tourenbuch; updated in place when given (stamps, statistics, unlocks, chronicle). */
  book?: BookState;
  /** ISO day for stamps and chronicle entries (tests pass a fixed one). */
  today?: string;
}

export function today(env?: Pick<TourEnv, "today">): string {
  return env?.today ?? new Date().toISOString().slice(0, 10);
}

/** A generator derived from a list of parts (tour seed, stage, node, purpose…): stable across save and load. */
export function rngFor(...parts: (string | number)[]): Rng {
  return new Rng(hashString(parts.join("|")));
}

// ─── formatting (German, the bitmap fonts have "–" but no "−") ────────────────────────────────────────────

/** "+7", "–1", "0" */
export function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `–${-n}` : "0";
}

/** "–60" for negative list points, "112" otherwise. */
export function num(n: number): string {
  return n < 0 ? `–${-n}` : String(n);
}

export function markWord(n: number): string {
  return `${signed(n)} Mark`;
}

export function fuelWord(n: number): string {
  return `${signed(n)} Sprit`;
}

/** "mit 112 Punkten", "mit 1 Punkt" */
export function withPoints(n: number): string {
  return `mit ${num(n)} ${Math.abs(n) === 1 ? "Punkt" : "Punkten"}`;
}

export const PLACE_WORD = ["", "Erster", "Zweiter", "Dritter"] as const;
export const ATTEMPT_WORD = ["", "im ersten Versuch", "im zweiten Versuch", "im dritten Versuch", "im vierten Versuch"] as const;
export const STROKES = (n: number) => (n === 1 ? "ein Strich" : `${n} Striche`);

// ─── pack lookups ─────────────────────────────────────────────────────────────────────────────────────────

export function findRegion(pack: PlacePack, id: RegionId): RegionDef | undefined {
  return pack.regions.find((r) => r.id === id);
}

export function findPlace(pack: PlacePack, id: string): PlaceDef | undefined {
  for (const r of pack.regions) {
    const p = r.places.find((q) => q.id === id);
    if (p) return p;
  }
  return undefined;
}

export function placeName(pack: PlacePack, id: string): string {
  return findPlace(pack, id)?.name ?? id;
}

export function regionOfPlace(pack: PlacePack, id: string): RegionId | undefined {
  return pack.regions.find((r) => r.places.some((q) => q.id === id))?.id;
}

/** The home region (stage 1 of every tour): the region of profile.home, else the pack's first region. */
export function homeRegion(pack: PlacePack, profile: Pick<Profile, "home">): RegionId {
  return regionOfPlace(pack, profile.home) ?? pack.regions[0]?.id ?? "enztal";
}

// ─── tour lookups ─────────────────────────────────────────────────────────────────────────────────────────

export function nodeById(tour: Pick<TourState, "map">, id: string): MapNode | undefined {
  return tour.map.nodes.find((n) => n.id === id);
}

export function currentNode(tour: Pick<TourState, "map" | "at">): MapNode {
  const n = nodeById(tour, tour.at);
  if (!n) throw new Error(`tour is at unknown node ${tour.at}`);
  return n;
}

export function currentRegion(tour: Pick<TourState, "regions" | "stage">): RegionId {
  return tour.regions[tour.stage];
}

export const hasSouvenir = (t: Pick<TourState, "souvenirs">, id: SouvenirId) => t.souvenirs.includes(id);
export const hasUpgrade = (t: Pick<TourState, "upgrades">, id: UpgradeId) => t.upgrades.includes(id);
export const hasBeerMat = (t: Pick<TourState, "beerMats">, id: BeerMatId) => t.beerMats.includes(id);
export const hasDog = (t: Pick<TourState, "dogs">, id: DogId) => t.dogs.includes(id);
export const hasFlag = (t: Pick<TourState, "flags">, f: string) => t.flags.includes(f);

/** Dog abilities work twice with the dog whistle (contract §4.12). */
export function dogPower(t: Pick<TourState, "souvenirs">): number {
  return hasSouvenir(t, "dog-whistle") ? 2 : 1;
}

/** Per-stage counter keys start with "s." and are cleared when a new stage begins. */
export function stageKey(key: string): string {
  return `s.${key}`;
}

export function usedCount(t: Pick<TourState, "used">, key: string): number {
  return t.used[key] ?? 0;
}

export function bump(t: Pick<TourState, "used">, key: string, by = 1) {
  t.used[key] = (t.used[key] ?? 0) + by;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
