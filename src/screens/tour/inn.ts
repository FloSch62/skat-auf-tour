// The Wirtshaus (contract §4.3), the Motorradtreff, the Preisskat table and special rounds from events: the Skat
// table of the Skat area (src/skat/table/scene.ts) with the tour's intro sentence and stakes (its round panel shows
// the room, the house rule and both regulars), saved after every game, then the result with places, pot, the fuel
// consequence and a dry line.
import { roomAmbience } from "../../game/ids";
import type { App, Scene } from "../../core/scene";
import type { Gfx } from "../../core/gfx";
import type { RoundConfig, RoundProgress, RoundResult } from "../../game/types";
import type { StakesId } from "../../game/ids";
import { settings } from "../../core/save";
import { P } from "../../core/palette";
import { centerY } from "../../core/font";
import { createTableScene } from "../../skat/table/scene";
import { CHARACTER_DEFS } from "../../data/characters";
import { DIFFICULTY_DEFS } from "../../data/difficulty";
import { BIKERS_LINES, FINAL_LINES, INN_ROOMS, INN_RESULT_LINES, TOURNAMENT_LINES, TUTORIAL } from "../../content/texts";
import { speechTitle } from "../../tour/book";
import { beginRound, pendingRoundConfig } from "../../tour/state";
import { finishStation, innFuelLoss, innPot, type StationOutcome } from "../../tour/economy";
import { isFinalStage } from "../../tour/perks";
import { currentNode, currentRegion, placeName } from "../../tour/util";
import { HOOKS, SCREENS, go, leaveStation, persist, type Session } from "./session";
import { deltaChips, fillLine, mainButton, nowLine, paperText, pickFor, scenery, soundLoop, stationPlate, topBar } from "./common";

/** Dev / playtest: `?autoplay=1` lets the table play the player's seat too, quickly. */
const AUTOPLAY = typeof location !== "undefined" && new URLSearchParams(location.search).has("autoplay");

function roomOf(s: Session): string {
  const n = currentNode(s.tour);
  if (n.kind === "bikers") return "bg/bikers";
  if (n.kind === "tournament") return "inns/clubhouse";
  if (s.tour.station?.special) return "inns/village";
  return `inns/${n.inn?.room ?? "village"}`;
}

// ─── the intro sentence for the table's round panel ──────────────────────────────────────────────────────

function lossText(s: Session): string {
  const d = DIFFICULTY_DEFS[s.tour.difficulty];
  if (isFinalStage(s.tour)) return "Der Tischsieg bringt den Wanderpokal, sonst endet die Tour ohne Pokal.";
  const third = s.tour.souvenirs.includes("snack-board") ? Math.min(1, d.thirdLoss) : d.thirdLoss;
  const st = (n: number) => (n === 0 ? "kein Sprit" : n === 1 ? "ein Strich" : `${n} Striche`);
  return `Der Tischsieg bringt den Pokal und 10 Mark. Zweiter kostet ${st(d.secondLoss)}, Dritter ${st(third)}.`;
}

function consequenceText(s: Session, cfg: RoundConfig, stakes: StakesId): string {
  const pot = innPot(s.tour, [0, 0, 0], stakes, cfg.houseRule, currentNode(s.tour).kind === "bikers" ? "bikers" : "inn");
  const loss = innFuelLoss(s.tour, stakes, cfg.houseRule);
  const fuel = s.tour.tutorial ? "heute ohne Spritverlust" : loss === 1 ? "ein Strich Sprit" : `${loss} Striche Sprit`;
  return `Der Erste gewinnt den Pott (ab ${pot} Mark), der Dritte fährt die anderen heim: ${fuel}.`;
}

/** The room, the event's intro or the Preisskat, and what is at stake. */
function introFor(s: Session, cfg: RoundConfig): { intro: string; stakes: StakesId } {
  const t = s.tour;
  const node = currentNode(t);
  const place = placeName(s.env.pack, node.place);
  const special = t.station?.special;
  if (special) return { intro: `${special.intro ?? "Am Nebentisch ist ein Platz frei."} ${consequenceText(s, cfg, special.stakes)}`, stakes: special.stakes };
  if (node.kind === "tournament") {
    const line = pickFor(s, isFinalStage(t) ? FINAL_LINES.intro : TOURNAMENT_LINES[currentRegion(t)].intro, "pre-intro");
    return { intro: `${line} ${lossText(s)}`, stakes: "small" };
  }
  const stakes = node.inn?.stakes ?? "small";
  const line = node.kind === "bikers"
    ? pickFor(s, BIKERS_LINES, "bikers")
    : fillLine(pickFor(s, INN_ROOMS[node.inn?.room ?? "village"]?.intro ?? INN_ROOMS.village.intro, "intro"), { inn: cfg.title, place });
  const tut = t.tutorial ? ` ${TUTORIAL.steps.innIntro.join(" ")}` : "";
  return { intro: `${line} ${consequenceText(s, cfg, stakes)}${tut}`, stakes };
}

// ─── the table ────────────────────────────────────────────────────────────────────────────────────────────

function createTableStation(app: App, s: Session): Scene {
  const t = s.tour;
  const node = currentNode(t);
  const cfg = pendingRoundConfig(t, settings, s.env)!;
  const progress = beginRound(t, cfg);
  persist(s);
  const kind = t.station?.special ? "skat" : (node.kind as "inn" | "bikers" | "tournament");
  const { intro, stakes } = introFor(s, cfg);
  return createTableScene(app, {
    progress,
    playerName: settings.name || "Du",
    title: speechTitle(s.book),
    intro,
    stakes,
    tutorial: !!t.tutorial,
    dogs: t.dogs,
    auto: AUTOPLAY || undefined,
    speed: AUTOPLAY ? 8 : undefined,
    onProgress(p: RoundProgress) {
      t.round = p;
      persist(s);
    },
    onDone(r: RoundResult) {
      const out = finishStation(t, s.env, kind === "tournament" ? { kind: "tournament", round: r } : { kind, round: r });
      persist(s);
      const f = kind === "tournament" ? HOOKS.tournamentResult : HOOKS.roundResult;
      if (f) app.scenes.switchTo(f(app, s, out, cfg, r));
    },
  });
}

// ─── the result ───────────────────────────────────────────────────────────────────────────────────────────

/** The Liste of a round: three rows with name and points, the player's row marked. */
export function drawListe(g: Gfx, x: number, y: number, w: number, names: string[], list: readonly number[], title = "Liste") {
  const rowH = 40;
  g.panel(x, y, w, 56 + rowH * 3, "paper");
  g.text(title, x + 16, y + 10, { font: "big", color: P.ink1 });
  const order = [0, 1, 2].sort((a, b) => list[b] - list[a] || a - b);
  order.forEach((seat, i) => {
    const ry = y + 50 + i * rowH;
    if (seat === 0) g.rect(x + 8, ry, w - 16, rowH - 4, P.beer4);
    g.text(`${i + 1}.`, x + 20, centerY("head", ry, rowH - 4), { font: "head", color: P.ink3 });
    g.text(names[seat], x + 56, centerY("head", ry, rowH - 4), { font: "head", color: P.ink1 });
    const pts = list[seat] < 0 ? `–${-list[seat]}` : String(list[seat]);
    g.text(pts, x + w - 20, centerY("head", ry, rowH - 4), { font: "head", align: "right", color: list[seat] < 0 ? P.brick1 : P.ink1 });
  });
}

export function resultLine(s: Session, out: StationOutcome): string {
  const place = out.place ?? 2;
  if (place === 1) return fillLine(pickFor(s, INN_RESULT_LINES.first, "res1"), { pot: out.pot ?? 0 });
  if (place === 2) return s.tour.souvenirs.includes("pennant") ? INN_RESULT_LINES.pennant : pickFor(s, INN_RESULT_LINES.second, "res2");
  if (out.shepherd) return INN_RESULT_LINES.shepherd;
  if (s.tour.tutorial) return `${pickFor(s, INN_RESULT_LINES.third.slice(0, 2), "res3")} Auf der Probefahrt kostet das keinen Sprit.`;
  return pickFor(s, INN_RESULT_LINES.third, "res3");
}

function createRoundResult(app: App, s: Session, out: StationOutcome, cfg: RoundConfig, r: RoundResult): Scene {
  const names = [settings.name || "Du", CHARACTER_DEFS[cfg.opponents[0]].name, CHARACTER_DEFS[cfg.opponents[1]].name];
  const line = resultLine(s, out);
  // the route line says exactly what happened (pot, Skatkasse, Wimpel, fuel), then helpers like the fridge
  const extra = out.lines.filter((l) => !l.startsWith("Tank leer"));
  const murmur = soundLoop(roomAmbience(cfg.room), 1);
  return {
    enter() {
      murmur.start();
    },
    exit: () => murmur.stop(),
    draw(g, a) {
      scenery(g, roomOf(s), "room");
      topBar(g, a, s);
      stationPlate(g, out.place === 1 ? "Gewonnen!" : out.place === 2 ? "Zweiter" : "Dritter", cfg.title);
      drawListe(g, 24, 140, 440, names, r.list);
      let y = 140;
      y += paperText(g, line, 490, y, 446) + 12;
      for (const l of extra) y += paperText(g, l, 490, y, 446, { font: "body" }) + 8;
      deltaChips(g, 490, y + 4, out.fuel, out.marks);
      const ended = !!out.ended;
      nowLine(g, ended ? "Was jetzt? Der Tank ist leer. Klicke auf „Weiter“." : "Was jetzt? Klicke auf „Weiter“, dann geht die Fahrt weiter.");
      if (mainButton(a, "res-go", "Weiter")) {
        if (!out.next && !ended) leaveStation(s);
        go(app, s);
      }
    },
  };
}

HOOKS.roundResult = createRoundResult;
SCREENS.innIntro = createTableStation;
SCREENS.tournamentIntro = createTableStation;
SCREENS.special = createTableStation;
SCREENS.table = createTableStation;
