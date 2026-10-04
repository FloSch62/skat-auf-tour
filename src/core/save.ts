// localStorage persistence (wrapped: private windows and blocked storage must not break the game).
// The running tour ("run") and the Tourenbuch ("book") are separate keys (contract §4.1); both can be exported to and
// imported from a file (src/tour/backup.ts).

const PREFIX = "sat.";

export function saveJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadSaved<T>(key: string): T | null {
  try {
    const s = localStorage.getItem(PREFIX + key);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}

export function removeSaved(key: string) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export type DeckStyle = "french" | "german" | "tournament";
export type Pace = "slow" | "normal" | "fast";
export type DrinkId = "beer" | "weizen" | "wine" | "cider" | "spezi";
export type Level = "easy" | "medium" | "hard";

export interface Settings {
  /** Player name (typed or clicked at the start, up to 12 characters). Empty until the first start. */
  name: string;
  drink: DrinkId;
  deck: DeckStyle;
  /** Play a card with one click instead of lift-then-play. */
  oneClickPlay: boolean;
  pace: Pace;
  /** Sudoku marks wrong digits. */
  sudokuMarkErrors: boolean;
  chessLevel: Level;
  sudokuLevel: Level;
  master: number;
  music: number;
  sfx: number;
  scale: "auto" | "integer" | "fit";
  /** Still backgrounds: no drifting clouds, smoke or leaves. */
  reducedMotion: boolean;
  /** Help offers (contract §3): off by default, a Skat player counts himself. */
  showTrumpCount: boolean;
  showPoints: boolean;
  /** Finished the guided first trip (or skipped it). */
  tutorialDone: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  name: "",
  drink: "beer",
  deck: "french",
  oneClickPlay: false,
  pace: "normal",
  sudokuMarkErrors: true,
  chessLevel: "easy",
  sudokuLevel: "easy",
  master: 0.8,
  music: 0.6,
  sfx: 0.8,
  scale: "auto",
  reducedMotion: false,
  showTrumpCount: false,
  showPoints: false,
  tutorialDone: false,
};

export const settings: Settings = { ...DEFAULT_SETTINGS, ...(loadSaved<Partial<Settings>>("settings") ?? {}) };

export function saveSettings() {
  saveJson("settings", settings);
}
