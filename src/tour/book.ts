// The Tourenbuch (contract §4.13): kept across tours, separate from the running tour, versioned. Records every Skat
// game (statistics), the album of regulars, place stamps, puzzles, the chronicle, the trophy shelf and the dog
// unlocks (contract §4.12). A lost tour never costs progress here (contract §3). Pure module.
import type { BookState, GameRecord, RoundResult, TourState } from "../game/types.ts";
import type { CharacterId, DifficultyId, DogId, RegionId, SouvenirId, VehicleId } from "../game/ids.ts";
import { DOGS } from "../game/ids.ts";
import { RANKS as TEXT_RANKS } from "../content/texts.ts";

export const BOOK_VERSION = 1;

export function newBook(): BookState {
  return {
    version: BOOK_VERSION,
    trophies: {},
    stamps: {},
    album: {},
    dogs: ["shepherd"],
    souvenirs: [],
    chronicle: [],
    skat: {
      games: 0, declared: 0, declaredWon: 0, byKind: {}, highestValue: 0, grandHand: 0, schneider: 0, schwarz: 0,
      bestList: 0, defenceWon: 0,
    },
    puzzles: { problems: 0, chess: 0, sudoku6: 0, sudoku9: 0 },
    tours: { started: 0, won: 0, empty: 0 },
    fun: { detours: 0, timesDriver: 0 },
    unlocks: { sidecarRig: false },
    innWins: 0,
    events: [],
  };
}

/** Fill missing fields of an older or partial book with defaults (used by load and migration). */
export function normaliseBook(raw: Partial<BookState>): BookState {
  const d = newBook();
  const b: BookState = {
    ...d,
    ...raw,
    version: BOOK_VERSION,
    trophies: { ...(raw.trophies ?? {}) },
    stamps: { ...(raw.stamps ?? {}) },
    album: { ...(raw.album ?? {}) },
    dogs: [...new Set<DogId>(["shepherd", ...((raw.dogs ?? []).filter((x) => (DOGS as readonly string[]).includes(x)))])],
    souvenirs: [...(raw.souvenirs ?? [])],
    chronicle: [...(raw.chronicle ?? [])],
    skat: { ...d.skat, ...(raw.skat ?? {}), byKind: { ...(raw.skat?.byKind ?? {}) } },
    puzzles: { ...d.puzzles, ...(raw.puzzles ?? {}) },
    tours: { ...d.tours, ...(raw.tours ?? {}) },
    fun: { detours: raw.fun?.detours ?? 0, timesDriver: raw.fun?.timesDriver ?? 0 },
    unlocks: { ...d.unlocks, ...(raw.unlocks ?? {}) },
    innWins: raw.innWins ?? 0,
    events: [...(raw.events ?? [])],
  };
  return b;
}

// ─── Skat statistics ──────────────────────────────────────────────────────────────────────────────────────

/**
 * One finished game at the player's table. `byKind` counts the player's own declared games by kind, plus every
 * passed ("passed") or Ramsch game at his table. Highest game, Grand Hand, Schneider and Schwarz count his won
 * declared games; `defenceWon` counts games he defended and the declarer lost.
 */
export function recordGame(book: BookState, rec: GameRecord) {
  const s = book.skat;
  s.games++;
  if (rec.declarer === null) {
    const k = rec.kind === "ramsch" ? "ramsch" : "passed";
    s.byKind[k] = (s.byKind[k] ?? 0) + 1;
    return;
  }
  if (rec.declarer === 0) {
    s.declared++;
    s.byKind[rec.kind] = (s.byKind[rec.kind] ?? 0) + 1;
    if (rec.won) {
      s.declaredWon++;
      s.highestValue = Math.max(s.highestValue, Math.abs(rec.value));
      if (rec.kind === "grand" && rec.hand) s.grandHand++;
      if (rec.schneider) s.schneider++;
      if (rec.schwarz) s.schwarz++;
    }
  } else if (!rec.won) {
    s.defenceWon++;
  }
}

/**
 * A finished round (inn, bikers, Preisskat, special round): every game, the best list, and the album of the two
 * opponents (games together; rounds he finished ahead of / behind that character).
 */
export function recordRound(book: BookState, opponents: readonly [CharacterId, CharacterId], result: RoundResult, date: string) {
  for (const g of result.games) recordGame(book, g);
  book.skat.bestList = Math.max(book.skat.bestList, result.list[0]);
  opponents.forEach((id, i) => {
    const e = book.album[id] ?? { games: 0, won: 0, lost: 0, met: date };
    e.games += result.games.length;
    if (result.list[0] > result.list[i + 1]) e.won++;
    else if (result.list[0] < result.list[i + 1]) e.lost++;
    book.album[id] = e;
  });
}

export function recordPuzzle(book: BookState, kind: "problem" | "chess" | "sudoku6" | "sudoku9") {
  if (kind === "problem") book.puzzles.problems++;
  else if (kind === "chess") book.puzzles.chess++;
  else if (kind === "sudoku6") book.puzzles.sudoku6++;
  else book.puzzles.sudoku9++;
}

/** Stamp a place on its first visit. Returns true when the stamp is new. */
export function stampPlace(book: BookState, place: string, date: string): boolean {
  if (book.stamps[place]) return false;
  book.stamps[place] = date;
  return true;
}

export function addChronicle(book: BookState, text: string, date: string) {
  book.chronicle.push({ date, text });
}

export function collectSouvenir(book: BookState, id: SouvenirId) {
  if (!book.souvenirs.includes(id)) book.souvenirs.push(id);
}

// ─── trophies and rank ────────────────────────────────────────────────────────────────────────────────────

export function trophyKey(region: RegionId, difficulty: DifficultyId): string {
  return `${region}-${difficulty}`;
}

export function wanderKey(difficulty: DifficultyId): string {
  return `wander-${difficulty}`;
}

export function recordTrophy(book: BookState, region: RegionId, difficulty: DifficultyId) {
  const k = trophyKey(region, difficulty);
  book.trophies[k] = (book.trophies[k] ?? 0) + 1;
}

/** The Wanderpokal; the first one unlocks the sidecar rig (contract §4.12). */
export function recordWanderpokal(book: BookState, difficulty: DifficultyId) {
  const k = wanderKey(difficulty);
  book.trophies[k] = (book.trophies[k] ?? 0) + 1;
  book.unlocks.sidecarRig = true;
}

/** All trophies on the shelf, repeats included. */
export function trophyCount(book: BookState): number {
  return Object.values(book.trophies).reduce((a, b) => a + b, 0);
}

export function regionTrophies(book: BookState): number {
  return Object.entries(book.trophies).filter(([k]) => !k.startsWith("wander-")).reduce((a, [, v]) => a + v, 0);
}

export type RankId = (typeof TEXT_RANKS)[number]["id"];

/**
 * Rank on the cover by trophy count, repeats included (contract §4.13). Names, thresholds and the cover line come
 * from the Text area (src/content/texts.ts RANKS: Lehrling 0, Geselle 1, Meister 8, Altmeister 25). A good player
 * brings home two to three trophies per tour (docs/balance-tour.md).
 */
export const RANKS: readonly { id: RankId; name: string; min: number; text: string }[] = TEXT_RANKS.map((r) => ({
  id: r.id, name: r.name, min: r.minTrophies, text: r.text,
}));

export function rank(book: BookState): { id: RankId; name: string; text: string; next?: number } {
  const n = trophyCount(book);
  let i = 0;
  while (i + 1 < RANKS.length && n >= RANKS[i + 1].min) i++;
  return { id: RANKS[i].id, name: RANKS[i].name, text: RANKS[i].text, next: RANKS[i + 1]?.min };
}

/** {title} in speech: "Lehrling" until the first trophy, then "Meister" (contract §4.5). */
export function speechTitle(book: BookState | undefined): "Lehrling" | "Meister" {
  return book && trophyCount(book) > 0 ? "Meister" : "Lehrling";
}

// ─── unlocks ──────────────────────────────────────────────────────────────────────────────────────────────

/** Unlock thresholds (contract §4.12). */
export const UNLOCKS = {
  wolfhoundBInnWins: 10,
  schnauzerAChess: 15,
} as const;

/** Unlock a dog for future tours (and the dog meadow). Returns true when it is new. */
export function unlockDog(book: BookState, id: DogId): boolean {
  if (book.dogs.includes(id)) return false;
  book.dogs.push(id);
  return true;
}

/**
 * Check the counted unlock conditions and unlock what is due. Returns the newly unlocked dogs. Event-driven unlocks
 * (wolfhound-a by the chain "Sonderfahrt nach Ungarn", schnauzer-b by "Besuch") come through the
 * events' `unlockDog` outcome.
 */
export function checkDogUnlocks(book: BookState): DogId[] {
  const out: DogId[] = [];
  if (book.innWins >= UNLOCKS.wolfhoundBInnWins && unlockDog(book, "wolfhound-b")) out.push("wolfhound-b");
  if (regionTrophies(book) > 0 && unlockDog(book, "airedale")) out.push("airedale");
  if (book.puzzles.chess >= UNLOCKS.schnauzerAChess && unlockDog(book, "schnauzer-a")) out.push("schnauzer-a");
  return out;
}

export function unlockedDogs(book: BookState): DogId[] {
  return DOGS.filter((d) => d === "shepherd" || book.dogs.includes(d));
}

export function availableVehicles(book: BookState): VehicleId[] {
  return book.unlocks.sidecarRig ? ["camper", "sidecar-rig"] : ["camper"];
}

// ─── tours ────────────────────────────────────────────────────────────────────────────────────────────────

export function recordTourStart(book: BookState) {
  book.tours.started++;
}

/** The tour has ended (called once by the tour logic). */
export function recordTourEnd(book: BookState, tour: Pick<TourState, "ended" | "tutorial">) {
  if (tour.tutorial) return;
  if (tour.ended === "won") book.tours.won++;
  else if (tour.ended === "empty") book.tours.empty++;
}

/** Remember a `once` event so later tours skip it. */
export function rememberOnceEvent(book: BookState, id: string) {
  book.events ??= [];
  if (!book.events.includes(id)) book.events.push(id);
}
