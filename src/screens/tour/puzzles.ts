// Stammtisch-Aufgabe, Schachbrett, Kiosk (contract §4.7–4.9): a short intro (what happens, what it pays), the
// station scene of the Rätsel or Skat area, then the payout. The same flow serves puzzles from events and the
// awning's free problem at the pitch.
import { hasArt } from "../../core/assets";
import type { App, Scene } from "../../core/scene";
import type { Gfx } from "../../core/gfx";
import { hashString } from "../../core/rng";
import { music } from "../../core/audio";
import { settings } from "../../core/save";
import { C, P } from "../../core/palette";
import { createChessStation, drawPark } from "../../chess/scene";
import { createSudokuStation } from "../../sudoku/scene";
import { paintKiosk } from "../../sudoku/kiosk";
import { paintedScene } from "../paint/painter";
import { CHESS_LINES, KIOSK_LINES, PROBLEM_LINES, TUTORIAL } from "../../content/texts";
import { DOG_DEFS, dogName } from "../../data/dogs";
import { finishPuzzle, type StationOutcome } from "../../tour/economy";
import { puzzleConfig } from "../../tour/perks";
import { currentNode, placeName } from "../../tour/util";
import { HOOKS, SCREENS, go, leaveStation, persist, type Session } from "./session";
import { deltaChips, mainButton, nowLine, paperText, pickFor, scenery, stationPlate, topBar } from "./common";

type PuzzleKind = "problem" | "chess" | "sudoku";

interface ProblemOpts {
  seed: number;
  attempts: number;
  hints?: number;
  onDone(result: { solved: boolean; attempts: number }): void;
}
// Bound by glob: the Stammtisch problem scene comes from the Skat area (src/skat/problems/scene.ts).
const PROBLEMS = import.meta.glob<{ createProblemStation?: (app: App, o: ProblemOpts) => Scene }>("../../skat/problems/scene.ts", { eager: true });

function problemFactory() {
  for (const m of Object.values(PROBLEMS)) if (m.createProblemStation) return m.createProblemStation;
  return null;
}

const TITLE: Record<PuzzleKind, string> = { problem: "Stammtisch-Aufgabe", chess: "Schachbrett", sudoku: "Kiosk" };

function kindOf(s: Session): PuzzleKind {
  const st = s.tour.station;
  const n = currentNode(s.tour);
  return (st?.puzzle ?? (n.kind === "chess" || n.kind === "sudoku" ? n.kind : "problem")) as PuzzleKind;
}

export function puzzleBackdrop(g: Gfx, kind: PuzzleKind) {
  if (kind === "chess") drawPark(g);
  else if (kind === "sudoku") {
    if (hasArt("bg/kiosk")) scenery(g, "bg/kiosk");
    else {
      const c = paintedScene("bg/kiosk", paintKiosk);
      if (!c || !g.pixelScene(c)) scenery(g, "bg/kiosk");
    }
  } else scenery(g, "inns/village", "room");
}

function rewardText(s: Session, kind: PuzzleKind): string {
  const pc = puzzleConfig(s.tour);
  const extra: string[] = [];
  if (kind === "sudoku") {
    if (pc.presolved) extra.push(`Der Bleistiftstummel hat ${pc.presolved} Felder vorab gelöst.`);
    if (pc.freeCells) extra.push(`${dogName(s.env.profile, "airedale")} verrät dir ${pc.freeCells === 1 ? "ein Feld" : `${pc.freeCells} Felder`}.`);
    return ["Klein (6×6): +1 Sprit. Groß (9×9): +2 Sprit und 2 Mark. Weglegen kostet nichts.", ...extra].join(" ");
  }
  if (pc.attempts > 3) extra.push(`${dogName(s.env.profile, "airedale")} lässt nicht locker: ${pc.attempts} Versuche.`);
  if (pc.hints) extra.push("Die Lupe zeigt einmal, was dran ist.");
  if (kind === "chess" && s.tour.souvenirs.includes("chess-clock")) extra.push("Die Schachuhr bringt 2 Mark mehr.");
  return ["Drei Versuche. Gelöst im ersten Versuch 4 Mark, im zweiten 3, im dritten 2. Nicht gelöst kostet nichts.", ...extra].join(" ");
}

function createPuzzleIntro(app: App, s: Session): Scene {
  const kind = kindOf(s);
  const n = currentNode(s.tour);
  const place = placeName(s.env.pack, n.place);
  const fromStation = n.kind === kind;
  const flavour = pickFor(s, kind === "chess" ? CHESS_LINES : kind === "sudoku" ? KIOSK_LINES : PROBLEM_LINES, `pz-${kind}`);
  const tut = s.tour.tutorial ? (kind === "sudoku" ? TUTORIAL.steps.kiosk : kind === "chess" ? TUTORIAL.steps.chess : []) : [];
  return {
    enter() {
      void music.play("raetsel");
    },
    draw(g, a) {
      puzzleBackdrop(g, kind);
      topBar(g, a, s);
      stationPlate(g, TITLE[kind], place);
      let y = 140;
      y += paperText(g, flavour, 150, y, 660) + 12;
      y += paperText(g, rewardText(s, kind), 150, y, 660) + 12;
      if (tut.length) paperText(g, tut.join(" "), 150, y, 660, { font: "body" });
      nowLine(g, kind === "sudoku" ? "Was jetzt? Klicke auf „Lokalblatt nehmen“." : "Was jetzt? Klicke auf „Aufgabe ansehen“.", 560);
      if (fromStation && !s.tour.tutorial && a.ui.button("pz-skip", 580, 486, 150, 46, "Weiterfahren")) {
        leaveStation(s);
        go(app, s);
      }
      if (mainButton(a, "pz-go", kind === "sudoku" ? "Lokalblatt nehmen" : "Aufgabe ansehen")) app.scenes.switchTo(createPuzzlePlay(app, s, kind));
    },
  };
}

function createPuzzlePlay(app: App, s: Session, kind: PuzzleKind): Scene {
  const t = s.tour;
  const pc = puzzleConfig(t);
  const seed = hashString(`${t.seed}|${t.stage}|${t.at}|${kind}|${t.route.length}`);
  const done = (out: StationOutcome) => {
    persist(s);
    app.scenes.switchTo(createPuzzleResult(app, s, out, kind));
  };
  if (kind === "chess") {
    return createChessStation(app, {
      level: settings.chessLevel, seed, attempts: pc.attempts, hints: pc.hints,
      onDone: (r) => done(finishPuzzle(t, s.env, { kind: "chess", solved: r.solved, attempts: r.attempts })),
    });
  }
  if (kind === "sudoku") {
    return createSudokuStation(app, {
      seed, level: settings.sudokuLevel, markErrors: settings.sudokuMarkErrors, presolved: pc.presolved, freeCells: pc.freeCells,
      onDone: (r) => done(finishPuzzle(t, s.env, { kind: "sudoku", solved: r.solved, size: r.size })),
    });
  }
  const f = problemFactory();
  if (f) {
    return f(app, { seed, attempts: pc.attempts, hints: pc.hints, onDone: (r) => done(finishPuzzle(t, s.env, { kind: "problem", solved: r.solved, attempts: r.attempts })) });
  }
  // Until the Stammtisch problems are delivered: say so, and let him go on without loss.
  return {
    draw(g, a) {
      puzzleBackdrop(g, "problem");
      topBar(g, a, s);
      stationPlate(g, TITLE.problem);
      paperText(g, "Die Stammtisch-Aufgaben werden gerade am Stammtisch ausgeknobelt. Heute liegt noch keine auf dem Tisch.", 150, 160, 660);
      nowLine(g, "Was jetzt? Klicke auf „Weiter“.", 560);
      if (mainButton(a, "pz-none", "Weiter")) done(finishPuzzle(t, s.env, { kind: "problem", solved: false, attempts: 0 }));
    },
  };
}

function createPuzzleResult(app: App, s: Session, out: StationOutcome, kind: PuzzleKind): Scene {
  const n = currentNode(s.tour);
  const solved = out.fuel > 0 || out.marks > 0;
  const unlocked = out.unlocked.map((d) => `${dogName(s.env.profile, d)}, der ${DOG_DEFS[d].breed}, darf jetzt mitfahren. Das steht im Tourenbuch.`);
  return {
    draw(g, a) {
      puzzleBackdrop(g, kind);
      topBar(g, a, s);
      stationPlate(g, solved ? "Gelöst!" : TITLE[kind]);
      let y = 150;
      for (const l of out.lines) y += paperText(g, l, 150, y, 660) + 10;
      for (const l of unlocked) y += paperText(g, l, 150, y, 660) + 10;
      deltaChips(g, 150, y + 4, out.fuel, out.marks);
      if (!solved) g.text("Nicht gelöst kostet nichts.", 150, y + 8, { font: "head", color: C.text, outline: P.ink0 });
      nowLine(g, "Was jetzt? Klicke auf „Weiter“.", 560);
      if (mainButton(a, "pzr-go", "Weiter")) {
        if (n.kind === kind) leaveStation(s);
        go(app, s);
      }
    },
  };
}

SCREENS.puzzle = createPuzzleIntro;
HOOKS.puzzleResult = (app, s, out) => createPuzzleResult(app, s, out, kindOf(s));

/** For the pitch's awning: start the free problem. */
export function startFreeProblem(app: App, s: Session) {
  app.scenes.switchTo(createPuzzleIntro(app, s));
}
