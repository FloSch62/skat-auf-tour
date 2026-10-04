// Saving (contract §4.1): the running tour ("run") and the Tourenbuch ("book") are separate, versioned keys in the
// browser storage, both with migration hooks. A backup is one JSON blob with settings, profile, book and the running
// tour, in the same format as core/files.ts collectBackup ({ app, version, date, data }), so either side can read
// the other's files. The DOM part (download, file picker) lives in backup-dom.ts. Pure apart from the wrapped
// storage calls of core/save.ts (which are no-ops under node).
import type { BookState, Profile, TourState } from "../game/types.ts";
import type { Settings } from "../core/save.ts";
import { loadSaved, removeSaved, saveJson } from "../core/save.ts";
import { BOOK_VERSION, newBook, normaliseBook } from "./book.ts";
import { TOUR_VERSION } from "./state.ts";

export const TOUR_KEY = "run";
export const BOOK_KEY = "book";

type Raw = Record<string, unknown>;
/** Migration from version n to n + 1 (keyed by n). Add one per format change, never edit an old one. */
export type Migration = (raw: Raw) => Raw;
export const TOUR_MIGRATIONS: Record<number, Migration> = {};
export const BOOK_MIGRATIONS: Record<number, Migration> = {};

function isObj(x: unknown): x is Raw {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function runMigrations(raw: Raw, target: number, steps: Record<number, Migration>): Raw | null {
  let v = typeof raw.version === "number" ? raw.version : 0;
  if (v > target) return null; // written by a newer game
  let cur = raw;
  while (v < target) {
    const step = steps[v];
    if (step) cur = step(cur);
    v += 1;
    cur = { ...cur, version: v };
  }
  return cur;
}

// ─── tour ─────────────────────────────────────────────────────────────────────────────────────────────────

/** A saved tour after version checks and migrations; null when it is not a tour or from a newer game. */
export function migrateTour(raw: unknown): TourState | null {
  if (!isObj(raw)) return null;
  const m = runMigrations(raw, TOUR_VERSION, TOUR_MIGRATIONS);
  if (!m) return null;
  const map = m.map as Raw | undefined;
  if (typeof m.seed !== "number" || typeof m.at !== "string" || !isObj(map) || !Array.isArray(map.nodes) || !Array.isArray(m.regions)) {
    return null;
  }
  const t = m as unknown as TourState;
  if (!t.map.nodes.some((n) => n.id === t.at)) return null;
  const stats = (isObj(m.stats) ? m.stats : {}) as Partial<TourState["stats"]>;
  return {
    ...t,
    visited: t.visited ?? [t.at],
    dogs: t.dogs ?? [],
    souvenirs: t.souvenirs ?? [],
    beerMats: t.beerMats ?? [],
    upgrades: t.upgrades ?? [],
    flags: t.flags ?? [],
    seenEvents: t.seenEvents ?? [],
    used: t.used ?? {},
    trophies: t.trophies ?? [],
    route: t.route ?? [],
    stats: {
      innRounds: stats.innRounds ?? 0, innWins: stats.innWins ?? 0, detours: stats.detours ?? 0,
      timesDriver: stats.timesDriver ?? 0, puzzlesSolved: stats.puzzlesSolved ?? 0,
    },
  };
}

export function serializeTour(t: TourState): string {
  return JSON.stringify(t);
}

export function deserializeTour(s: string): TourState | null {
  try {
    return migrateTour(JSON.parse(s));
  } catch {
    return null;
  }
}

// ─── book ─────────────────────────────────────────────────────────────────────────────────────────────────

/** A saved Tourenbuch after version checks and migrations, missing fields filled; null when unusable. */
export function migrateBook(raw: unknown): BookState | null {
  if (!isObj(raw)) return null;
  const m = runMigrations(raw, BOOK_VERSION, BOOK_MIGRATIONS);
  if (!m) return null;
  return normaliseBook(m as Partial<BookState>);
}

export function serializeBook(b: BookState): string {
  return JSON.stringify(b);
}

export function deserializeBook(s: string): BookState | null {
  try {
    return migrateBook(JSON.parse(s));
  } catch {
    return null;
  }
}

/**
 * Migrate what a restored backup or an old browser storage holds (Lead calls this after core/files restoreBackup):
 * the running tour (null when unusable or ended) and the Tourenbuch (a fresh one when unusable).
 */
export function migrate(run: unknown, book: unknown): { run: TourState | null; book: BookState } {
  const t = migrateTour(run);
  return { run: t && !t.ended ? t : null, book: migrateBook(book) ?? newBook() };
}

// ─── browser storage ──────────────────────────────────────────────────────────────────────────────────────

/** Save the running tour (after every station and every Skat game; the Probefahrt too). An ended tour is removed. */
export function saveTour(t: TourState): boolean {
  if (t.ended) {
    removeSaved(TOUR_KEY);
    return true;
  }
  return saveJson(TOUR_KEY, t);
}

export function loadTour(): TourState | null {
  return migrateTour(loadSaved<unknown>(TOUR_KEY));
}

export function clearTour() {
  removeSaved(TOUR_KEY);
}

export function saveBook(b: BookState): boolean {
  return saveJson(BOOK_KEY, b);
}

/** The Tourenbuch from the browser, or a fresh one. */
export function loadBook(): BookState {
  return migrateBook(loadSaved<unknown>(BOOK_KEY)) ?? newBook();
}

// ─── backup ───────────────────────────────────────────────────────────────────────────────────────────────

export const BACKUP_APP = "skat-auf-tour";
export const BACKUP_VERSION = 1;

export interface BackupData {
  settings: Partial<Settings>;
  profile: Profile | null;
  book: BookState;
  tour: TourState | null;
}

/** One JSON blob for "Sicherung exportieren" (contract §4.1). */
export function exportBackup(d: BackupData, date = new Date().toISOString().slice(0, 10)): string {
  const data: Record<string, unknown> = { settings: d.settings, book: d.book };
  if (d.profile) data.profile = d.profile;
  if (d.tour && !d.tour.ended && !d.tour.tutorial) data[TOUR_KEY] = d.tour;
  return JSON.stringify({ app: BACKUP_APP, version: BACKUP_VERSION, date, data }, null, 1);
}

export type ImportResult = { ok: true; data: BackupData; date: string } | { ok: false; error: string };

/** Read a backup (text or parsed JSON) with version checks; German error lines for the screen. */
export function importBackup(input: string | unknown): ImportResult {
  let raw: unknown = input;
  if (typeof input === "string") {
    try {
      raw = JSON.parse(input);
    } catch {
      return { ok: false, error: "Die Datei lässt sich nicht lesen." };
    }
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP || !isObj(raw.data)) return { ok: false, error: "Das ist keine Sicherung von SKAT AUF TOUR." };
  if (typeof raw.version === "number" && raw.version > BACKUP_VERSION) {
    return { ok: false, error: "Die Sicherung stammt aus einer neueren Fassung des Spiels." };
  }
  const data = raw.data;
  const book = data.book === undefined ? newBook() : migrateBook(data.book);
  if (!book) return { ok: false, error: "Das Tourenbuch in der Sicherung ist beschädigt oder zu neu." };
  const tourRaw = data[TOUR_KEY] ?? data.tour;
  const tour = tourRaw === undefined || tourRaw === null ? null : migrateTour(tourRaw);
  if (tourRaw && !tour) return { ok: false, error: "Die laufende Tour in der Sicherung ist beschädigt oder zu neu." };
  return {
    ok: true,
    date: typeof raw.date === "string" ? raw.date : "",
    data: {
      settings: isObj(data.settings) ? (data.settings as Partial<Settings>) : {},
      profile: isObj(data.profile) ? (data.profile as unknown as Profile) : null,
      book,
      tour,
    },
  };
}

export function backupFileName(date = new Date().toISOString().slice(0, 10)): string {
  return `skat-auf-tour-${date}.json`;
}
