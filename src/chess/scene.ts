// The chess station: a puzzle on the outdoor board in the park (contract §4.8). The park is the backdrop; the
// playable board is a clean, large, high-contrast 2D board with the side to move at the bottom.
//
// Flow: intro (task, "Los geht's") → the opponent's setup move slides in → the player clicks a piece, its target
// squares light up, he clicks a target → right: the opponent answers slowly from the line; wrong: the move stays
// on the board with a red mark until he takes it back (one attempt gone) → solved / out of attempts / given up →
// (solution shown move by move) → result with "Weiter". Left click only, no timers.
import type { App, Scene } from "../core/scene";
import type { Gfx } from "../core/gfx";
import { loadJson } from "../core/assets";
import { music, sfx } from "../core/audio";
import { centerY, lineHeight, measure } from "../core/font";
import { C, P, rgba } from "../core/palette";
import { Rng } from "../core/rng";
import { backdrop, para, plate, soundWord, textHeight, whatNow } from "../screens/kit";
import { paintedScene } from "../screens/paint/painter";
import { paintPark } from "./park";
import type { ChessPuzzle } from "../game/types";
import {
  BISHOP, KNIGHT, QUEEN, ROOK, CASTLE, EP, colorOf, fileOf, inCheck, isCheckmate, kingSquare, makeMove, makePiece,
  rankOf, type Move, type Position,
} from "./rules.ts";
import {
  FALLBACK_PUZZLES, PuzzleRun, decodePuzzles, pickPuzzle, taskSentence, themeHint,
  type ChessLevel, type ChessPuzzleFile, type PlayedMove,
} from "./puzzle.ts";
import { GERMAN_NAME } from "./notation.ts";
import { drawPiece } from "./pieces.ts";

export interface ChessStationOpts {
  level: ChessLevel;
  seed: number;
  /** Allowed attempts: 3, or 4 with the Airedale. */
  attempts: number;
  onDone(result: { solved: boolean; attempts: number }): void;
  /** Lupe (souvenir `magnifier`): how often per puzzle the piece that must move may be shown. Default 0. */
  hints?: number;
  /** Play this puzzle id from the level file instead of picking by seed (dev, events). */
  puzzleId?: string;
}

// ─── layout (960×540) ───────────────────────────────────────────────────────────────────────────────────

const SQ = 54;
const BX = 42;
const BY = 18;
const BOARD = SQ * 8;
const FRAME = { x: BX - 26, y: BY - 8, w: BOARD + 34, h: BOARD + 34 };
const PX = FRAME.x + FRAME.w + 14;
const PW = 944 - PX;
const PANEL = { x: PX, y: 66, w: PW, h: FRAME.y + FRAME.h - 66 };
const WHAT_Y = 494;

const LIGHT = P.paper3;
const DARK = P.wood3;

const LEVEL_NAME: Record<ChessLevel, string> = { easy: "leicht", medium: "mittel", hard: "schwer" };

// ─── friendly sentences ─────────────────────────────────────────────────────────────────────────────────

const SOLVED_FIRST = [
  "Sauber! Da guckt sogar der Rentner am Nebenbrett.",
  "Respekt! Da gibt's nix zu meckern.",
  "Des hätt der alte Gottlob au net schneller gseh.",
  "Wie aus dem Lehrbuch. Und ganz ohne Lehrbuch.",
];
const SOLVED_LATER = [
  "Mit Geduld geht's auch.",
  "Nicht gleich, aber sicher. So spielt man im Park.",
  "Dranbleiben lohnt sich.",
];
const UNSOLVED = [
  "Diesmal nicht. Das Brett steht morgen auch noch da.",
  "Macht nix. Schach ist auch nur Skat ohne Karten.",
  "Knifflig, die Stellung. Jetzt weißt du, wie's geht.",
];

// ─── state ──────────────────────────────────────────────────────────────────────────────────────────────

type Phase =
  | "loading" | "intro" | "setup" | "play" | "promo" | "moving" | "reply" | "wrong" | "failed" | "confirm"
  | "solution" | "result";

interface Slide {
  piece: number;
  from: number;
  to: number;
}

interface Anim {
  /** Board drawn underneath (with `hide` squares left empty). */
  base: Position;
  hide: number[];
  slides: Slide[];
  t: number;
  delay: number;
  dur: number;
  capture: boolean;
  done: () => void;
}

export function createChessStation(app: App, opts: ChessStationOpts): Scene {
  const rng = new Rng(opts.seed ^ 0x5c4e55);
  let phase: Phase = "loading";
  let run: PuzzleRun | null = null;
  let shown: Position | null = null;
  let last: { from: number; to: number } | null = null;
  let wrongSq = -1;
  let selected = -1;
  let targets: Move[] = [];
  let promoMoves: Move[] = [];
  let anim: Anim | null = null;
  let note = "";
  let solved = false;
  let gaveUp = false;
  /** Seconds since a mate was played (-1: none). */
  let mateT = -1;
  let lastText = "";
  let hintsLeft = Math.max(0, opts.hints ?? 0);
  /** Square marked by the Lupe (-1: none). */
  let hintSq = -1;
  let solution: PlayedMove[] = [];
  let solStep = 0;
  let resultLine = "";
  let doneCalled = false;

  // ─── loading ──────────────────────────────────────────────────────────────────────────────────────────

  const begin = (list: ChessPuzzle[]) => {
    const tried = new Set<string>();
    for (const source of [list, FALLBACK_PUZZLES[opts.level]]) {
      if (!source.length) continue;
      const p = (opts.puzzleId && source.find((q) => q.id === opts.puzzleId)) || pickPuzzle(source, opts.seed);
      if (tried.has(p.id)) continue;
      tried.add(p.id);
      try {
        run = new PuzzleRun(p, opts.attempts);
        break;
      } catch (e) {
        console.warn(`chess puzzle ${p.id} rejected`, e);
      }
    }
    if (!run) run = new PuzzleRun(FALLBACK_PUZZLES[opts.level][0], opts.attempts);
    console.info(`chess puzzle ${run.puzzle.id} (${run.puzzle.rating}): ${run.puzzle.fen} | ${run.puzzle.moves.join(" ")}`);
    shown = run.initial;
    phase = "intro";
  };

  void loadJson<ChessPuzzleFile>(`puzzles/chess-${opts.level}.json`).then((file) => {
    let list: ChessPuzzle[] = [];
    try {
      if (file) list = decodePuzzles(file);
    } catch (e) {
      console.warn("chess puzzle file unreadable", e);
    }
    begin(list);
  });

  // ─── geometry ─────────────────────────────────────────────────────────────────────────────────────────

  const flipped = () => run?.player === 1;
  const sqX = (sq: number) => BX + (flipped() ? 7 - fileOf(sq) : fileOf(sq)) * SQ;
  const sqY = (sq: number) => BY + (flipped() ? rankOf(sq) : 7 - rankOf(sq)) * SQ;

  // ─── animation helpers ────────────────────────────────────────────────────────────────────────────────

  /** Slide a move on the board from `before`; calls done() after it landed. */
  const animateMove = (before: Position, m: Move, delay: number, dur: number, done: () => void) => {
    const slides: Slide[] = [{ piece: m.piece, from: m.from, to: m.to }];
    const hide = [m.from];
    if (m.flags & CASTLE) {
      const kingSide = m.to > m.from;
      const rf = kingSide ? m.from + 3 : m.from - 4;
      const rt = kingSide ? m.from + 1 : m.from - 1;
      slides.push({ piece: before.board[rf], from: rf, to: rt });
      hide.push(rf);
    }
    anim = { base: before, hide, slides, t: 0, delay, dur, capture: !!m.captured, done };
  };

  /** Slide a wrong move back: the restored position is drawn underneath. */
  const animateBack = (restored: Position, m: Move, done: () => void) => {
    const slides: Slide[] = [{ piece: m.piece, from: m.to, to: m.from }];
    const hide = [m.from];
    if (m.flags & CASTLE) {
      const kingSide = m.to > m.from;
      const rf = kingSide ? m.from + 3 : m.from - 4;
      const rt = kingSide ? m.from + 1 : m.from - 1;
      slides.push({ piece: restored.board[rf], from: rt, to: rf });
      hide.push(rf);
    }
    anim = { base: restored, hide, slides, t: 0, delay: 0, dur: 0.35, capture: false, done };
  };

  const deselect = () => {
    selected = -1;
    targets = [];
  };

  // ─── game flow ────────────────────────────────────────────────────────────────────────────────────────

  const startSetup = () => {
    if (!run) return;
    phase = "setup";
    const r = run;
    animateMove(r.initial, r.setup, 0.7, 0.9, () => {
      shown = r.start;
      last = { from: r.setup.from, to: r.setup.to };
      phase = "play";
    });
  };

  const commit = (m: Move) => {
    if (!run || !shown) return;
    const r = run;
    const before = shown;
    deselect();
    note = "";
    hintSq = -1;
    const result = r.play(m);
    phase = "moving";
    animateMove(before, m, 0, 0.25, () => {
      shown = r.position;
      last = { from: m.from, to: m.to };
      if (result === "solved") {
        finishSolved();
      } else if (result === "correct") {
        phase = "reply";
        const mid = r.position;
        const reply = r.expected()!;
        animateMove(mid, reply, 0.7, 0.8, () => {
          r.reply();
          shown = r.position;
          last = { from: reply.from, to: reply.to };
          if (r.status === "solved") finishSolved();
          else phase = "play";
        });
      } else {
        wrongSq = m.to;
        phase = result === "failed" ? "failed" : "wrong";
        sfx.play("sudoku-wrong");
      }
    });
  };

  const finishSolved = () => {
    solved = true;
    mateT = shown && isCheckmate(shown) ? 0 : -1;
    resultLine = rng.pick(run!.mistakes === 0 ? SOLVED_FIRST : SOLVED_LATER);
    phase = "result";
    sfx.play("win-sting");
  };

  const takeBack = (then: () => void) => {
    if (!run || !shown) return;
    const r = run;
    const wrong = r.wrongMove?.move;
    r.takeBack();
    wrongSq = -1;
    if (!wrong) {
      shown = r.position;
      then();
      return;
    }
    phase = "moving";
    animateBack(r.position, wrong, () => {
      shown = r.position;
      then();
    });
  };

  const showSolution = () => {
    if (!run) return;
    gaveUp = true;
    deselect();
    solution = run.solution();
    solStep = 0;
    shown = run.start;
    last = { from: run.setup.from, to: run.setup.to };
    phase = "solution";
    nextSolutionStep();
  };

  const nextSolutionStep = () => {
    if (!shown) return;
    if (solStep >= solution.length) {
      resultLine = rng.pick(UNSOLVED);
      phase = "result";
      sfx.play("lose-sting");
      return;
    }
    const pm = solution[solStep];
    const before = shown;
    animateMove(before, pm.move, solStep === 0 ? 0.8 : 1.1, 0.8, () => {
      shown = makeMove(before, pm.move);
      last = { from: pm.move.from, to: pm.move.to };
      solStep++;
      nextSolutionStep();
    });
  };

  const finish = () => {
    if (doneCalled || !run) return;
    doneCalled = true;
    opts.onDone({ solved, attempts: solved ? run.attemptNo : run.mistakes });
  };

  // ─── drawing ──────────────────────────────────────────────────────────────────────────────────────────

  const drawBoard = (g: Gfx) => {
    g.panel(FRAME.x, FRAME.y, FRAME.w, FRAME.h, "panel");
    g.rect(BX - 2, BY - 2, BOARD + 4, BOARD + 4, P.ink0);
    const base = anim ? anim.base : shown;
    if (!base) return;
    for (let sq = 0; sq < 64; sq++) {
      const x = sqX(sq);
      const y = sqY(sq);
      const light = (fileOf(sq) + rankOf(sq)) % 2 === 1;
      g.rect(x, y, SQ, SQ, light ? LIGHT : DARK);
    }
    // last move
    if (last && !anim) {
      for (const sq of [last.from, last.to]) g.rect(sqX(sq), sqY(sq), SQ, SQ, rgba(P.beer2, 0.55));
    }
    // king in check
    if (!anim && inCheck(base)) {
      const k = kingSquare(base.board, base.turn);
      if (k >= 0) {
        g.rect(sqX(k), sqY(k), SQ, SQ, rgba(P.brick2, 0.75));
        g.box(sqX(k) + 2, sqY(k) + 2, SQ - 4, SQ - 4, P.brick0, 2);
      }
    }
    // wrong move
    if (wrongSq >= 0 && !anim) {
      g.rect(sqX(wrongSq), sqY(wrongSq), SQ, SQ, rgba(P.brick2, 0.6));
      g.box(sqX(wrongSq) + 1, sqY(wrongSq) + 1, SQ - 2, SQ - 2, P.brick0, 3);
    }
    // selection
    if (selected >= 0) {
      g.rect(sqX(selected), sqY(selected), SQ, SQ, rgba(P.beer3, 0.75));
      g.box(sqX(selected), sqY(selected), SQ, SQ, P.beer0, 3);
    }
    // the Lupe's hint: a pulsing blue ring around the piece that must move
    if (hintSq >= 0 && !anim && selected !== hintSq) {
      const pulse = Math.floor(g.time * 3) % 2;
      g.box(sqX(hintSq) + 1, sqY(hintSq) + 1, SQ - 2, SQ - 2, P.ink0, 1);
      g.box(sqX(hintSq) + 2, sqY(hintSq) + 2, SQ - 4, SQ - 4, pulse ? P.river2 : P.river3, 4);
    }
    // pieces
    const hidden = new Set(anim?.hide ?? []);
    for (let sq = 0; sq < 64; sq++) {
      const p = base.board[sq];
      if (!p || hidden.has(sq)) continue;
      drawPiece(g, p, sqX(sq), sqY(sq), SQ);
    }
    // targets (on top of pieces so captures are obvious)
    for (const m of targets) {
      const x = sqX(m.to);
      const y = sqY(m.to);
      if (m.captured) {
        g.box(x + 1, y + 1, SQ - 2, SQ - 2, P.ink0, 1);
        g.box(x + 2, y + 2, SQ - 4, SQ - 4, P.forest3, 4);
        g.box(x + 6, y + 6, SQ - 12, SQ - 12, P.ink0, 1);
      } else {
        g.circle(x + SQ / 2, y + SQ / 2, 10, P.ink0, true);
        g.circle(x + SQ / 2, y + SQ / 2, 8, P.forest3, true);
        g.circle(x + SQ / 2 - 2, y + SQ / 2 - 2, 3, P.forest5, true);
      }
    }
    // sliding pieces
    if (anim) {
      const a = anim;
      const t = Math.max(0, Math.min(1, (a.t - a.delay) / a.dur));
      const e = t * t * (3 - 2 * t);
      if (a.t > a.delay) {
        for (const s of a.slides) g.rect(sqX(s.from), sqY(s.from), SQ, SQ, rgba(P.beer2, 0.4));
      }
      for (const s of a.slides) {
        const x = sqX(s.from) + (sqX(s.to) - sqX(s.from)) * e;
        const y = sqY(s.from) + (sqY(s.to) - sqY(s.from)) * e;
        drawPiece(g, s.piece, Math.round(x), Math.round(y) - Math.round(Math.sin(e * Math.PI) * 4), SQ);
      }
    }
    // coordinates
    for (let i = 0; i < 8; i++) {
      const file = flipped() ? 7 - i : i;
      const rank = flipped() ? i : 7 - i;
      g.text("abcdefgh"[file], BX + i * SQ + SQ / 2, BY + BOARD + 3, { font: "head", align: "center", color: P.paper4, shadow: P.ink0 });
      g.text(String(rank + 1), BX - 13, centerY("head", BY + i * SQ, SQ), { font: "head", align: "center", color: P.paper4, shadow: P.ink0 });
    }
    if (mateT >= 0 && mateT < 2.5 && shown) {
      const k = kingSquare(shown.board, shown.turn);
      if (k >= 0) {
        const cx = Math.max(BX + 90, Math.min(BX + BOARD - 90, sqX(k) + SQ / 2));
        const cy = sqY(k) > BY + BOARD / 2 ? sqY(k) - 30 : sqY(k) + SQ + 30;
        g.alpha(Math.min(1, (2.5 - mateT) * 2), () => soundWord(g, "MATT!", cx, cy, 2, Math.min(1, mateT * 2)));
      }
    }
  };

  /** Interaction with the board squares during the player's turn. */
  const boardInput = () => {
    if (phase !== "play" || !run || !shown || anim) return;
    const ui = app.ui;
    for (let sq = 0; sq < 64; sq++) {
      const x = sqX(sq);
      const y = sqY(sq);
      const target = targets.filter((m) => m.to === sq);
      const p = shown.board[sq];
      const own = !!p && colorOf(p) === run.player;
      if (target.length) {
        if (ui.hover(x, y, SQ, SQ)) app.g.box(x, y, SQ, SQ, P.forest5, 3);
        if (ui.area(`chess-sq-${sq}`, x, y, SQ, SQ, { sound: null })) {
          if (target.length > 1) {
            promoMoves = target;
            phase = "promo";
          } else commit(target[0]);
          return;
        }
      } else if (own) {
        if (ui.hover(x, y, SQ, SQ) && sq !== selected) app.g.box(x + 1, y + 1, SQ - 2, SQ - 2, P.beer3, 2);
        if (ui.area(`chess-sq-${sq}`, x, y, SQ, SQ, { sound: null })) {
          if (sq === selected) {
            deselect();
            note = "";
          } else {
            const ms = run.movesFrom(sq);
            if (ms.length) {
              selected = sq;
              targets = ms;
              note = "";
              sfx.play("ui-click");
            } else {
              deselect();
              note = `Dieser ${GERMAN_NAME[p & 7]} kann gerade nicht ziehen. Nimm eine andere Figur.`;
            }
          }
          return;
        }
      }
    }
    // a click anywhere else deselects
    if (selected >= 0 && app.input.pressed(0)) {
      deselect();
      note = "";
    }
  };

  interface BoxButton {
    id: string;
    label: string;
    variant: "go" | "normal";
    click: () => void;
  }

  /** The message box at the bottom of the panel for the current phase (null: legend and "Aufgeben"). */
  const boxFor = (): { title: string; text: string; buttons: BoxButton[] } | null => {
    if (!run) return null;
    const r = run;
    const other = r.player === 0 ? "Schwarz" : "Weiß";
    switch (phase) {
      case "intro":
        return {
          title: "Schachbrett im Park",
          text: `Am Brett steht eine Stellung. Zuerst zieht noch ${other}, dann bist du dran.`,
          buttons: [{ id: "start", label: "Los geht's", variant: "go", click: startSetup }],
        };
      case "wrong": {
        const left = r.attemptsLeft;
        return {
          title: "Nicht ganz",
          text: `${r.wrongMove?.san ?? "Der Zug"} löst die Aufgabe nicht. ${left === 1 ? "Ein Versuch bleibt noch." : `Noch ${left} Versuche.`}`,
          buttons: [{ id: "back", label: "Zug zurücknehmen", variant: "normal", click: () => takeBack(() => (phase = "play")) }],
        };
      }
      case "failed":
        return {
          title: "Schade",
          text: `${r.wrongMove?.san ?? "Der Zug"} war es ${r.mistakes > 1 ? "auch " : ""}nicht. ${r.attempts > 1 ? "Die Versuche sind" : "Der Versuch ist"} aufgebraucht.`,
          buttons: [{ id: "show", label: "Lösung zeigen", variant: "normal", click: () => takeBack(showSolution) }],
        };
      case "confirm":
        return {
          title: "Aufgeben?",
          text: "Dann zeige ich dir die Lösung, Zug für Zug.",
          buttons: [
            { id: "no", label: "Weiterknobeln", variant: "go", click: () => (phase = "play") },
            { id: "yes", label: "Lösung zeigen", variant: "normal", click: showSolution },
          ],
        };
      case "result": {
        const title = solved ? (mateT >= 0 ? "Matt! Gelöst." : "Gelöst!") : "Nicht gelöst";
        const when = solved ? (r.mistakes === 0 ? " Im ersten Versuch." : ` Im ${r.attemptNo}. Versuch.`) : "";
        return { title, text: resultLine + when, buttons: [{ id: "next", label: "Weiter", variant: "go", click: finish }] };
      }
      default:
        return null;
    }
  };

  const drawPanel = (g: Gfx) => {
    const ui = app.ui;
    if (!run) return;
    plate(g, `Schachaufgabe · ${LEVEL_NAME[opts.level]}`, PX + PW / 2, FRAME.y, { minW: PW });
    const { x, y, w, h } = PANEL;
    g.panel(x, y, w, h, "paper");
    const ix = x + 18;
    const iw = w - 36;

    // bottom area first (its height limits the move list)
    const box = boxFor();
    const bx = x + 10;
    const bw = w - 20;
    let bottom: number;
    if (box) {
      const textH = textHeight(box.text, bw - 32, "head");
      const bh = 12 + lineHeight("big") + 6 + textH + 12 + 44 + 14;
      bottom = y + h - 10 - bh;
      g.panel(bx, bottom, bw, bh, "panel-hi");
      g.text(box.title, bx + bw / 2, bottom + 12, { font: "big", align: "center", color: C.title, shadow: P.ink0 });
      para(g, box.text, bx + 16, bottom + 12 + lineHeight("big") + 6, bw - 32, { font: "head", color: C.text, shadow: P.ink0, align: "center" });
      const n = box.buttons.length;
      const btnW = n === 1 ? 240 : 180;
      const gap = 16;
      const total = n * btnW + (n - 1) * gap;
      box.buttons.forEach((b, i) => {
        if (ui.button(`chess-box-${b.id}`, bx + Math.round((bw - total) / 2) + i * (btnW + gap), bottom + bh - 14 - 44, btnW, 44, b.label, { variant: b.variant })) b.click();
      });
    } else {
      bottom = y + h - 112;
      g.rect(ix, bottom, iw, 2, P.paper1);
      g.text("K König · D Dame · T Turm · L Läufer · S Springer\n{inkblue}Blau{/}: deine Züge · + Schach · # Matt", ix, bottom + 8, { font: "body", color: P.ink4 });
      if (phase === "play" && ui.button("chess-giveup", x + w - 18 - 160, y + h - 56, 160, 42, "Aufgeben")) {
        deselect();
        note = "";
        phase = "confirm";
      }
      if (phase === "play" && (hintsLeft > 0 || hintSq >= 0)) {
        const label = hintSq >= 0 ? "Lupe: siehe Brett" : hintsLeft > 1 ? `Lupe: welche Figur? (${hintsLeft})` : "Lupe: welche Figur?";
        if (ui.button("chess-hint", ix, y + h - 56, 230, 42, label, { disabled: hintSq >= 0 })) {
          const m = run.expected();
          if (m) {
            hintSq = m.from;
            hintsLeft--;
            note = "Die Lupe zeigt es: Mit der blau umrandeten Figur geht's los.";
            deselect();
          }
        }
      }
    }

    // task, hint, attempts
    let cy = y + 14;
    cy += para(g, taskSentence(run), ix, cy, iw, { font: "head", color: P.ink1 });
    const hint = run.mateIn ? "" : themeHint(run.puzzle);
    if (hint) cy += para(g, hint, ix, cy, iw, { font: "head", color: P.ink4 });
    cy += 10;
    g.text("Versuche:", ix, cy, { font: "head", color: P.ink1 });
    const left = run.attemptsLeft;
    let ax = ix + measure("Versuche:", "head") + 12;
    for (let i = 0; i < run.attempts; i++) {
      const used = i >= left;
      const cx = ax + 10;
      const cyy = cy + 11;
      g.circle(cx, cyy, 10, P.ink0, true);
      g.circle(cx, cyy, 8, used ? P.paper1 : P.forest2, true);
      if (used) {
        g.line(cx - 5, cyy - 5, cx + 5, cyy + 5, P.brick1, 3);
        g.line(cx - 5, cyy + 5, cx + 5, cyy - 5, P.brick1, 3);
      } else g.circle(cx - 3, cyy - 3, 3, P.forest4, true);
      ax += 26;
    }
    g.text(left === 0 ? "keiner mehr" : left === 1 ? "noch einer" : `noch ${left}`, ax + 8, cy, { font: "head", color: left <= 1 ? P.brick1 : P.ink3 });
    cy += 36;

    // the moves, flowing like the chess column of a newspaper; the newest lines win when space is short
    const avail = bottom - 8 - cy;
    const lines = flowMoves(iw);
    if (avail < lineHeight("head") * 2 || !lines.length) return;
    const showingSolution = phase === "solution" || (phase === "result" && gaveUp);
    g.text(showingSolution ? "Die Lösung:" : "Züge:", ix, cy, { font: "head", color: P.ink4 });
    cy += lineHeight("head");
    const fit = Math.floor((bottom - 8 - cy) / lineHeight("head"));
    for (const line of lines.slice(-fit)) {
      for (const tok of line) {
        g.text(tok.text, ix + tok.x, cy, { font: "head", color: tok.color });
        if (tok.strike) g.rect(ix + tok.x - 2, cy + 12, measure(tok.text, "head") + 4, 2, P.brick1);
      }
      cy += lineHeight("head");
    }
  };

  /** Tokens of the move list ("39." "Tfh3" "Txg2+" …) laid out in lines of width w. */
  const flowMoves = (w: number) => {
    const moves: { pm: PlayedMove; wrong?: boolean }[] = [];
    if (!run) return [];
    if (phase === "solution" || (phase === "result" && gaveUp)) {
      moves.push({ pm: run.history[0] });
      for (const pm of solution.slice(0, solStep)) moves.push({ pm });
    } else if (phase !== "intro" && !(phase === "setup" && anim)) {
      for (const pm of run.history) moves.push({ pm });
      if (run.wrongMove && (phase === "wrong" || phase === "failed")) moves.push({ pm: run.wrongMove, wrong: true });
    }
    const toks: { text: string; color: string; strike?: boolean; gapAfter: number }[] = [];
    moves.forEach(({ pm, wrong }, i) => {
      if (pm.color === 0) toks.push({ text: `${pm.moveNo}.`, color: P.ink4, gapAfter: 6 });
      else if (i === 0) toks.push({ text: `${pm.moveNo}. …`, color: P.ink4, gapAfter: 6 });
      const color = wrong ? P.brick1 : pm.by === "player" ? P.river1 : P.ink1;
      toks.push({ text: pm.san + (wrong ? "?" : ""), color, strike: wrong, gapAfter: 14 });
    });
    const lines: { text: string; color: string; strike?: boolean; x: number }[][] = [];
    let line: { text: string; color: string; strike?: boolean; x: number }[] = [];
    let x = 0;
    toks.forEach((t, i) => {
      const tw = measure(t.text, "head");
      // keep a move number on the same line as its move
      const next = t.gapAfter === 6 && toks[i + 1] ? t.gapAfter + measure(toks[i + 1].text, "head") : 0;
      if (x > 0 && x + tw + next > w) {
        lines.push(line);
        line = [];
        x = 0;
      }
      line.push({ text: t.text, color: t.color, strike: t.strike, x });
      x += tw + t.gapAfter;
    });
    if (line.length) lines.push(line);
    return lines;
  };

  const drawPromo = (g: Gfx) => {
    if (!run) return;
    g.dim(0.45);
    const types = [QUEEN, ROOK, BISHOP, KNIGHT];
    const bw = 104;
    const bh = 118;
    const gap = 14;
    const w = types.length * bw + (types.length - 1) * gap + 48;
    const h = 260;
    const x = Math.round((960 - w) / 2);
    const y = 120;
    g.panel(x, y, w, h, "dialog");
    g.text("Welche Figur soll es werden?", x + w / 2, y + 16, { font: "big", align: "center", color: C.title, shadow: P.ink0 });
    types.forEach((t, i) => {
      const bx = x + 24 + i * (bw + gap);
      const by = y + 62;
      const clicked = app.ui.button(`chess-promo-${t}`, bx, by, bw, bh, "", { variant: "paper" });
      drawPiece(g, makePiece(run!.player, t), bx + (bw - 84) / 2, by + 4, 84, { scale: 1.5 });
      g.text(GERMAN_NAME[t], bx + bw / 2, by + bh - 30, { font: "head", align: "center", color: P.ink1 });
      if (clicked) {
        const m = promoMoves.find((pm) => pm.promo === t);
        if (m) commit(m);
      }
    });
    if (app.ui.button("chess-promo-cancel", x + w / 2 - 80, y + h - 54, 160, 40, "Doch nicht")) {
      phase = "play";
      promoMoves = [];
    }
  };

  const currentWhatNow = (): string => {
    if (!run) return "Einen Moment, das Brett wird aufgebaut.";
    switch (phase) {
      case "intro":
        return "Lies die Aufgabe und klick auf „Los geht's“.";
      case "setup":
        return `Zuerst zieht noch ${run.player === 0 ? "Schwarz" : "Weiß"}. Schau genau hin.`;
      case "play":
        if (note) return note;
        if (selected >= 0) return "Klick auf ein grün markiertes Feld. Oder nimm eine andere Figur.";
        if (run.index > 0) return "Richtig! Jetzt der nächste Zug. Klick auf eine Figur.";
        return `${taskSentence(run)} Klick auf eine Figur.`;
      case "promo":
        return "Der Bauer wird umgewandelt. Klick auf die Figur, die er werden soll.";
      case "moving":
        return lastText;
      case "reply":
        return `Richtig! ${run.player === 0 ? "Schwarz" : "Weiß"} antwortet …`;
      case "wrong":
        return "Klick auf „Zug zurücknehmen“ und versuch es nochmal.";
      case "failed":
        return "Klick auf „Lösung zeigen“.";
      case "confirm":
        return "Willst du aufgeben? Dann zeige ich dir die Lösung.";
      case "solution":
        return solStep < solution.length ? `Die Lösung, Zug für Zug: ${solution[solStep].san}` : "Das war die Lösung.";
      case "result":
        return "Klick auf „Weiter“.";
      default:
        return "";
    }
  };

  return {
    enter() {
      void music.play("raetsel");
    },

    update(dt) {
      if (anim) {
        const a = anim;
        const wasBefore = a.t < a.delay + a.dur;
        a.t += dt;
        if (wasBefore && a.t >= a.delay + a.dur) {
          anim = null;
          sfx.play(a.capture ? "chess-capture" : "chess-move");
          a.done();
        }
      }
      if (mateT >= 0) mateT += dt;
    },

    draw(g) {
      drawPark(g);
      drawBoard(g);
      boardInput();
      drawPanel(g);

      if (phase === "promo") drawPromo(g);

      const text = currentWhatNow();
      lastText = text;
      if (text) whatNow(g, text, { y: WHAT_Y, w: 920 });
    },
  };
}

/** The park backdrop: painted art bg/park, or the code painting in the same raster. */
export function drawPark(g: Gfx) {
  backdrop(g, "bg/park", (gg) => {
    if (!gg.pixelScene(paintedScene("park", paintPark))) gg.rect(0, 0, 960, 540, P.forest1);
  });
}
