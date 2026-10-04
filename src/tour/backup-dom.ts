// The browser side of backups: offer the file for download, let him pick one, write it into the browser storage.
// The JSON itself is built and checked in save.ts (pure). The file dialog is the one unavoidable piece of browser
// chrome (contract §4.1).
import { downloadJson, pickJsonFile } from "../core/files";
import { saveJson, type Settings } from "../core/save";
import type { BookState, Profile, TourState } from "../game/types";
import { BOOK_KEY, TOUR_KEY, backupFileName, clearTour, exportBackup, importBackup, type ImportResult } from "./save";

/** Download a backup of settings, profile, Tourenbuch and the running tour. */
export function downloadBackup(d: { settings: Partial<Settings>; profile: Profile | null; book: BookState; tour: TourState | null }) {
  downloadJson(backupFileName(), JSON.parse(exportBackup(d)));
}

/**
 * Let him choose a backup file and restore it into the browser storage. Resolves with the result (German error on
 * failure, null when cancelled). The caller reloads settings/profile/book afterwards.
 */
export async function restoreBackupFromFile(): Promise<ImportResult | null> {
  const raw = await pickJsonFile();
  if (raw === null) return null;
  const r = importBackup(raw);
  if (!r.ok) return r;
  const { settings, profile, book, tour } = r.data;
  if (Object.keys(settings).length) saveJson("settings", settings);
  if (profile) saveJson("profile", profile);
  saveJson(BOOK_KEY, book);
  if (tour) saveJson(TOUR_KEY, tour);
  else clearTour();
  return r;
}
