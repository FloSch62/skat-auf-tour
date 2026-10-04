// The running tour on screen: the session (tour, Tourenbuch, environment), saving after every step, and the router
// that picks the right screen for the saved state, so "Tour fortsetzen" resumes exactly where he stopped (also in
// the middle of a Skat round via TourState.round).
import type { App, Scene } from "../../core/scene";
import type { BookState, RoundConfig, RoundResult, TourState } from "../../game/types";
import type { StationOutcome } from "../../tour/economy";
import { settings } from "../../core/save";
import { getPack, getProfile } from "../../game/world";
import { ALL_EVENTS } from "../../content/events/index";
import { currentNode, type TourEnv } from "../../tour/util";
import { tourPhase } from "../../tour/state";
import { loadBook, loadTour, saveBook, saveTour } from "../../tour/save";

export interface Session {
  tour: TourState;
  book: BookState;
  env: TourEnv;
  /** Dev routes: nothing is written to the browser storage. */
  dev?: boolean;
}

export function buildEnv(book: BookState): TourEnv {
  return { pack: getPack(), profile: getProfile(), name: settings.name, events: ALL_EVENTS, book };
}

export function makeSession(tour: TourState, book: BookState, dev = false): Session {
  return { tour, book, env: buildEnv(book), dev };
}

/** The saved tour and book, or null when there is no running tour. */
export function loadSession(): Session | null {
  const tour = loadTour();
  if (!tour || tour.ended) return null;
  return makeSession(tour, loadBook());
}

/** Save the tour (removed when ended) and the Tourenbuch. */
export function persist(s: Session) {
  s.env.name = settings.name;
  if (s.dev) return;
  saveTour(s.tour);
  saveBook(s.book);
}

/** Mark the current station as left (the next routing shows the map). */
export function leaveStation(s: Session) {
  const st = s.tour.station;
  if (st && !st.done.includes("left")) st.done.push("left");
  persist(s);
}

/** Save and switch to whatever screen the state asks for. */
export function go(app: App, s: Session) {
  persist(s);
  app.scenes.switchTo(route(app, s));
}

// The screens register themselves here (avoids import cycles between the router and the screens).
type Factory = (app: App, s: Session) => Scene;
export const SCREENS: Partial<Record<
  | "map" | "end" | "tutorialDone" | "region" | "special" | "event" | "innIntro" | "table" | "tournamentIntro"
  | "beerMats" | "pitch" | "market" | "garage" | "dogs" | "puzzle",
  Factory
>> = {};

/** Screens with extra arguments (registered by their modules). */
export const HOOKS: {
  tournamentResult?: (app: App, s: Session, out: StationOutcome, cfg: RoundConfig, r: RoundResult) => Scene;
  puzzleResult?: (app: App, s: Session, out: StationOutcome) => Scene;
  roundResult?: (app: App, s: Session, out: StationOutcome, cfg: RoundConfig, r: RoundResult) => Scene;
} = {};

function screen(name: keyof typeof SCREENS, app: App, s: Session): Scene {
  const f = SCREENS[name];
  if (!f) throw new Error(`screen ${name} not registered`);
  return f(app, s);
}

/** The screen for the current state of the tour. */
export function route(app: App, s: Session): Scene {
  const t = s.tour;
  const phase = tourPhase(t);
  if (phase === "ended") return screen("end", app, s);
  if (phase === "tutorial-done") {
    // the last station (the pitch) is shown before the trip counts as done
    const st = t.station;
    if (st && st.node === t.at && currentNode(t).kind === "pitch" && !st.done.includes("left")) return screen("pitch", app, s);
    return screen("tutorialDone", app, s);
  }
  if (phase === "region") return screen("region", app, s);
  const node = currentNode(t);
  const st = t.station;
  if (st && st.node === node.id) {
    const skat = node.kind === "inn" || node.kind === "bikers" || node.kind === "tournament";
    if (st.special) return t.round ? screen("table", app, s) : screen("special", app, s);
    if (st.event) return screen("event", app, s);
    if (skat && !st.done.includes("round")) {
      if (t.round) return screen("table", app, s);
      return node.kind === "tournament" ? screen("tournamentIntro", app, s) : screen("innIntro", app, s);
    }
    if (node.kind === "tournament" && st.offer?.length) return screen("beerMats", app, s);
    if (st.puzzle && node.kind !== "pitch") return screen("puzzle", app, s);
    if (!st.done.includes("left")) {
      switch (node.kind) {
        case "pitch": return screen("pitch", app, s);
        case "market": return screen("market", app, s);
        case "garage": return screen("garage", app, s);
        case "dogs": return screen("dogs", app, s);
        case "problem":
        case "chess":
        case "sudoku":
          if (!st.done.includes(`puzzle:${node.kind}`)) return screen("puzzle", app, s);
          break;
      }
    }
  }
  return screen("map", app, s);
}

/** Resume the saved tour (kitchen: "Tour fortsetzen"); null when there is none. */
export function resume(app: App): Scene | null {
  const s = loadSession();
  return s ? route(app, s) : null;
}
