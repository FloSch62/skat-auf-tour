// Dev routes of the Tour area (nothing is saved to the browser storage):
//   ?dev=map&seed=3&stage=1&difficulty=sporty      the stage map (stage 0–2); &at=<node id> stands at that node
//   ?dev=station&kind=market&seed=3&stage=0        a station (inn, bikers, tournament, problem, chess, sudoku, pitch,
//                                                  dogs, market, garage, event); &result=1|2|3 shows a round result
//   ?dev=event&id=any-kehrwoche                    one event
//   ?dev=region&seed=3                             the region choice after the first Preisskat
//   ?dev=beermats&seed=3                           the beer mat choice after a Preisskat win
//   ?dev=end&outcome=empty|won|lost-final          tow / Abrechnung
//   ?dev=newtour   ?dev=tutorial   ?dev=book       Neue Tour, the guided first trip, the Tourenbuch (filled by sim tours)
import type { DevFactory } from "../dev";
import type { App, Scene } from "../core/scene";
import type { DifficultyId, StationKind } from "../game/ids";
import type { RoundResult, TourState } from "../game/types";
import { Rng } from "../core/rng";
import { getPack, getProfile } from "../game/world";
import { ALL_EVENTS } from "../content/events/index";
import { newBook } from "./book";
import { arrive, enterStage, newTour, newTutorial, pendingRoundConfig, regionChoices } from "./state";
import { finishStation } from "./economy";
import { simulateTour, stubSkatModel } from "./sim";
import { column } from "./map";
import { createNewTour } from "../screens/newtour";
import { createBookScene } from "../screens/book";
import { makeSession, route, HOOKS, type Session } from "../screens/tour/session";
import "../screens/tour/index";
import "../screens/map";

function devTour(params: URLSearchParams): Session {
  const seed = Number(params.get("seed") ?? 3) || 3;
  const difficulty = (params.get("difficulty") ?? "sporty") as DifficultyId;
  const book = newBook();
  book.dogs.push("airedale", "schnauzer-b");
  const t = newTour({ seed, difficulty, vehicle: "camper", dogs: ["shepherd", "airedale"], pack: getPack(), profile: getProfile(), book, events: ALL_EVENTS });
  const s = makeSession(t, book, true);
  const stage = Math.min(2, Number(params.get("stage") ?? 0) || 0);
  for (let k = 0; k < stage; k++) toRegionPhase(s, true);
  return s;
}

/** Jump to the end of the current stage's Preisskat (won), optionally on into the next region. */
function toRegionPhase(s: Session, enter: boolean) {
  const t = s.tour;
  const fin = t.map.nodes.find((n) => n.kind === "tournament")!;
  t.at = fin.id;
  t.visited.push(fin.id);
  t.station = { node: fin.id, done: ["arrived", "round"] };
  if (enter) enterStage(t, s.env, regionChoices(t, s.env.pack)[0]);
}

function placeAt(s: Session, kind: StationKind) {
  const t = s.tour;
  let node = t.map.nodes.find((n) => n.kind === kind);
  if (!node) {
    node = column(t.map, 3)[0];
    node.kind = kind;
    if (kind === "event") node.event = undefined;
  }
  t.at = node.id;
  t.visited.push(node.id);
  t.station = { node: node.id, done: [] };
  arrive(t, s.env);
}

function stubRound(t: TourState, place: number): RoundResult {
  const cfg = pendingRoundConfig(t, { showPoints: false, showTrumpCount: false })!;
  const rng = new Rng(cfg.seed);
  const m = stubSkatModel();
  for (let i = 0; i < 50; i++) {
    const r = m.playRound(cfg, rng);
    if (r.place === place) return r;
  }
  return m.playRound(cfg, rng);
}

export const dev: Record<string, DevFactory> = {
  map: (app: App, params) => {
    const s = devTour(params);
    const at = params.get("at");
    const n = at ? s.tour.map.nodes.find((x) => x.id === at) : undefined;
    if (n) {
      s.tour.at = n.id;
      s.tour.visited.push(n.id);
      s.tour.station = { node: n.id, done: ["arrived", "round", "left"] };
    }
    return route(app, s);
  },
  station: (app: App, params): Scene => {
    const s = devTour(params);
    const kind = (params.get("kind") ?? "market") as StationKind;
    placeAt(s, kind);
    const result = Number(params.get("result") ?? 0);
    if (result && (kind === "inn" || kind === "bikers" || kind === "tournament")) {
      const cfg = pendingRoundConfig(s.tour, { showPoints: false, showTrumpCount: false }, s.env)!;
      const r = stubRound(s.tour, result);
      const out = finishStation(s.tour, s.env, { kind, round: r });
      if (kind === "tournament" && HOOKS.tournamentResult) return HOOKS.tournamentResult(app, s, out, cfg, r);
      if (HOOKS.roundResult) return HOOKS.roundResult(app, s, out, cfg, r);
      return route(app, s);
    }
    return route(app, s);
  },
  event: (app: App, params) => {
    const s = devTour(params);
    placeAt(s, "event");
    const id = params.get("id");
    if (id && s.tour.station) s.tour.station.event = id;
    return route(app, s);
  },
  region: (app: App, params) => {
    const s = devTour(params);
    toRegionPhase(s, false);
    return route(app, s);
  },
  beermats: (app: App, params) => {
    const s = devTour(params);
    toRegionPhase(s, false);
    s.tour.station!.offer = ["grand-bonus", "defence-bonus", "redeal"];
    return route(app, s);
  },
  end: (app: App, params) => {
    const s = devTour(params);
    const outcome = (params.get("outcome") ?? "empty") as NonNullable<TourState["ended"]>;
    s.tour.ended = outcome;
    if (outcome !== "empty") s.tour.trophies.push("enztal", "muehlacker");
    for (let i = 0; i < 14; i++) s.tour.route.push({ ...s.tour.route[0], line: `Station ${i + 1}: Gasthaus Krone, Roßwag: Erster mit 112 Punkten, Pott +7 Mark`, points: 50 + i });
    return route(app, s);
  },
  newtour: (app: App) => createNewTour(app),
  tutorial: (app: App) => {
    const book = newBook();
    const t = newTutorial({ seed: 1, pack: getPack(), profile: getProfile(), book });
    return route(app, makeSession(t, book, true));
  },
  book: (app: App) => {
    const book = newBook();
    for (let i = 1; i <= 6; i++) {
      simulateTour({ seed: 100 + i, difficulty: "cozy", pack: getPack(), profile: getProfile(), events: ALL_EVENTS, book, dogs: book.dogs.slice(0, 2) });
    }
    return createBookScene(app, { book });
  },
};
