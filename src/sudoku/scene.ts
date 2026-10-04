// Sudoku station (contract §4.9): the Rätselseite of the local paper on the kiosk counter. Optionally first the
// choice between the small (6×6) and the big (9×9) puzzle, then: click a cell, click a digit on the big keypad.
// Eraser, optional pencil notes, wrong digits in red (setting), "Ein Feld verraten" (the Airedale), cells pre-filled
// by the pencil souvenir, "Weglegen" (costs nothing) and a short celebration with "Weiter". Left click only, no timer.
import type { App, Scene } from "../core/scene";
import type { Gfx } from "../core/gfx";
import { loadJson } from "../core/assets";
import { music, sfx } from "../core/audio";
import { centerY, lineHeight, wrap } from "../core/font";
import { C, P, rgba } from "../core/palette";
import { backdrop, dialog, heading, para, textHeight, whatNow } from "../screens/kit";
import { paintedScene } from "../screens/paint/painter";
import { paintKiosk } from "./kiosk";
import {
  generateSudoku, hintCell, peersOf, presolvedCells, sudokuFromPool, boxOfCell,
  type SudokuLevel, type SudokuPool, type SudokuPuzzle, type SudokuSize,
} from "./sudoku";

export interface SudokuStationOpts {
  seed: number;
  level: SudokuLevel;
  /** Missing: the station first asks for the small or the big puzzle. */
  size?: SudokuSize;
  /** Cells filled at the start (the pencil souvenir). */
  presolved?: number;
  /** "Ein Feld verraten" uses (the Airedale). */
  freeCells?: number;
  markErrors: boolean;
  onDone(result: { solved: boolean; size: SudokuSize }): void;
  /** Dev only: fill all but this many open cells with the right digits. */
  devLeaveOpen?: number;
}

type Phase = "choose" | "loading" | "play" | "quit" | "solved";

/** What a cell is: the player's own, printed in the paper, filled by the pencil souvenir, or given away. */
const OWN = 0;
const PRINTED = 1;
const PENCIL = 2;
const GIVEN_AWAY = 3;

const SHEET = { x: 20, y: 10, w: 500, h: 482 };
const PANEL = { x: 536, y: 10, w: 404, h: 482 };
const LEVEL_DE: Record<SudokuLevel, string> = { easy: "leicht", medium: "mittel", hard: "schwer" };

const QUESTION =
  "Kleines Rätsel (6×6, etwa 3 Minuten, +1 Sprit) oder großes Rätsel (9×9, etwa 10 Minuten, +2 Sprit und 2 Mark)?";

const PRAISE = [
  "Sauber gelöst! Der Kioskmann schaut über die Brille: „Des hätt i jetzt net denkt.“",
  "Alles am rechten Fleck. Die Zeitung kann zum Altpapier.",
  "Gelöst, und kein Radiergummi zerbröselt. Respekt.",
  "Fertig! Am Stammtisch wird man davon erzählen. Vielleicht.",
];

/** The "Was jetzt?" strip at the bottom edge; a rare second line grows upwards instead of off the screen. */
function bottomHint(g: Gfx, text: string) {
  const extra = wrap(text, 728, "head").length - 1;
  whatNow(g, text, { y: 500 - extra * lineHeight("head") });
}

function drawKiosk(g: Gfx) {
  backdrop(g, "bg/kiosk", (gg) => gg.pixelScene(paintedScene("kiosk", paintKiosk)));
}

export function createSudokuStation(app: App, opts: SudokuStationOpts): Scene {
  let phase: Phase = opts.size ? "loading" : "choose";
  let size: SudokuSize = opts.size ?? 9;
  let puzzle: SudokuPuzzle | null = null;
  let board: number[] = [];
  let kind: number[] = [];
  let notes: number[] = [];
  let selected = -1;
  let notesMode = false;
  let freeLeft = Math.max(0, opts.freeCells ?? 0);
  let message = "";
  let messageT = 0;
  let solvedT = 0;
  let finished = false;

  const say = (text: string) => {
    message = text;
    messageT = 0;
  };

  const setup = (p: SudokuPuzzle) => {
    puzzle = p;
    size = p.size;
    board = p.givens.slice();
    kind = p.givens.map((v) => (v ? PRINTED : OWN));
    notes = new Array(board.length).fill(0);
    for (const i of presolvedCells(p, Math.max(0, opts.presolved ?? 0))) {
      board[i] = p.solution[i];
      kind[i] = PENCIL;
    }
    if (opts.devLeaveOpen !== undefined) {
      const open = board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
      for (const i of open.slice(0, Math.max(0, open.length - opts.devLeaveOpen))) board[i] = p.solution[i];
    }
    selected = -1;
  };

  const begin = async (s: SudokuSize) => {
    size = s;
    phase = "loading";
    let p: SudokuPuzzle | null = null;
    if (opts.level !== "easy") {
      const pool = await loadJson<SudokuPool>(`puzzles/sudoku-${opts.level}.json`);
      if (pool) p = sudokuFromPool(pool, opts.seed, s);
    }
    setup(p ?? generateSudoku(opts.seed, s, opts.level));
    phase = "play";
    sfx.play("page-turn");
  };

  const isWrong = (i: number) => board[i] !== 0 && puzzle !== null && board[i] !== puzzle.solution[i];
  const showWrong = (i: number) => opts.markErrors && kind[i] === OWN && isWrong(i);
  const full = () => board.every((v) => v > 0);

  const checkSolved = () => {
    if (!puzzle || !full()) return;
    if (board.every((v, i) => v === puzzle!.solution[i])) {
      phase = "solved";
      solvedT = 0;
      selected = -1;
      sfx.play("sudoku-right");
    }
  };

  const clearNotesAround = (i: number, d: number) => {
    for (const p of peersOf(size, i)) notes[p] &= ~(1 << d);
  };

  const lockedText = (i: number) =>
    kind[i] === PRINTED
      ? "Diese Ziffer stand schon in der Zeitung. Klick auf ein leeres Feld."
      : "Dieses Feld ist schon gelöst. Klick auf ein leeres Feld.";

  const enter = (d: number) => {
    if (!puzzle) return;
    if (selected < 0) {
      say("Erst ein Feld im Rätsel anklicken, dann die Ziffer.");
      return;
    }
    if (kind[selected] !== OWN) {
      say(lockedText(selected));
      return;
    }
    if (notesMode) {
      if (board[selected]) {
        say("In dem Feld steht schon eine Ziffer. Erst radieren, dann notieren.");
        return;
      }
      notes[selected] ^= 1 << d;
      sfx.play("pencil", { volume: 0.4 });
      return;
    }
    if (board[selected] === d) return;
    board[selected] = d;
    notes[selected] = 0;
    clearNotesAround(selected, d);
    message = "";
    if (opts.markErrors && d !== puzzle.solution[selected]) sfx.play("sudoku-wrong");
    else sfx.play("pencil");
    checkSolved();
  };

  const erase = () => {
    if (selected < 0) {
      say("Erst das Feld anklicken, das du radieren willst.");
      return;
    }
    if (kind[selected] !== OWN) {
      say(lockedText(selected));
      return;
    }
    if (!board[selected] && !notes[selected]) return;
    board[selected] = 0;
    notes[selected] = 0;
    sfx.play("pencil", { volume: 0.5 });
  };

  const reveal = () => {
    if (!puzzle || freeLeft <= 0) return;
    const sel = selected >= 0 && kind[selected] === OWN ? selected : -1;
    const i = hintCell(board, puzzle.solution, size, sel);
    if (i < 0) return;
    board[i] = puzzle.solution[i];
    kind[i] = GIVEN_AWAY;
    notes[i] = 0;
    clearNotesAround(i, board[i]);
    selected = i;
    freeLeft--;
    message = "";
    sfx.play("pencil");
    checkSolved();
  };

  // ─── drawing ────────────────────────────────────────────────────────────────────────────────────────────

  const layout = () => {
    const cs = size === 9 ? 46 : 64;
    const gw = cs * size;
    const gx = SHEET.x + Math.round((SHEET.w - gw) / 2);
    const top = SHEET.y + 52;
    const gy = top + Math.round((SHEET.y + SHEET.h - 8 - top - gw) / 2);
    return { cs, gw, gx, gy };
  };

  const drawSheet = (g: Gfx) => {
    // the newspaper page lying on the counter
    g.alpha(0.45, () => g.rect(SHEET.x + 5, SHEET.y + 6, SHEET.w, SHEET.h, P.ink0));
    g.rect(SHEET.x, SHEET.y, SHEET.w, SHEET.h, P.ink2);
    g.rect(SHEET.x + 1, SHEET.y + 1, SHEET.w - 2, SHEET.h - 2, P.paper3);
    g.rect(SHEET.x + 1, SHEET.y + SHEET.h - 3, SHEET.w - 2, 2, P.paper2);
    g.text("Rätselecke", SHEET.x + 16, SHEET.y + 8, { font: "big", color: P.ink1 });
    const sub = `Sudoku · ${size}×${size} · ${LEVEL_DE[puzzle?.level ?? opts.level]}`;
    g.text(sub, SHEET.x + SHEET.w - 16, SHEET.y + 15, { font: "head", color: P.ink4, align: "right" });
    g.rect(SHEET.x + 12, SHEET.y + 42, SHEET.w - 24, 2, P.ink1);
    g.rect(SHEET.x + 12, SHEET.y + 46, SHEET.w - 24, 1, P.ink1);
  };

  const drawGrid = (g: Gfx, interactive: boolean) => {
    if (!puzzle) return;
    const ui = app.ui;
    const { cs, gw, gx, gy } = layout();
    const n = size;
    const selDigit = selected >= 0 ? board[selected] : 0;
    const sr = selected >= 0 ? Math.floor(selected / n) : -1;
    const sc = selected >= 0 ? selected % n : -1;
    const sb = selected >= 0 ? boxOfCell(size, selected) : -1;
    const glow = phase === "solved" ? Math.min(1, solvedT * 2) : 0;

    for (let i = 0; i < n * n; i++) {
      const r = Math.floor(i / n);
      const c = i % n;
      const x = gx + c * cs;
      const y = gy + r * cs;
      let bg: string = P.paper4;
      if (selected >= 0 && (r === sr || c === sc || boxOfCell(size, i) === sb)) bg = P.paper2;
      if (selDigit && board[i] === selDigit) bg = P.river4;
      if (showWrong(i)) bg = P.brick4;
      if (i === selected) bg = P.beer3;
      g.rect(x, y, cs, cs, bg);
      if (glow > 0) g.alpha(glow * 0.5, () => g.rect(x, y, cs, cs, P.forest5));

      if (interactive && ui.area(`cell-${i}`, x, y, cs, cs, { sound: null })) {
        selected = i;
        message = "";
        sfx.play("ui-click", { volume: 0.4 });
      }
      if (interactive && ui.hover(x, y, cs, cs) && i !== selected) g.box(x + 2, y + 2, cs - 4, cs - 4, P.ink4, 2);

      const v = board[i];
      if (v) {
        const ty = centerY("big", y, cs);
        const tx = x + Math.round(cs / 2);
        const k = kind[i];
        const col = showWrong(i) ? P.brick0 : k === PRINTED ? P.ink0 : k === PENCIL ? P.stone0 : P.river1;
        g.text(String(v), tx, ty, { font: "big", color: col, align: "center" });
        if (k === PRINTED) g.text(String(v), tx + 1, ty, { font: "big", color: col, align: "center" });
      } else if (notes[i]) {
        const cols = 3;
        const rows = size === 9 ? 3 : 2;
        const nw = (cs - 4) / cols;
        const nh = (cs - 4) / rows;
        for (let d = 1; d <= n; d++) {
          if (!(notes[i] & (1 << d))) continue;
          const nx = x + 2 + ((d - 1) % cols) * nw + nw / 2;
          const ny = y + 2 + Math.floor((d - 1) / cols) * nh;
          g.text(String(d), Math.round(nx), centerY("body", ny, nh), { font: "body", color: P.ink4, align: "center" });
        }
      }
    }

    // newsprint lines: thin between cells, thick around the boxes
    for (let k = 1; k < n; k++) {
      g.rect(gx + k * cs, gy, 1, gw, P.ink3);
      g.rect(gx, gy + k * cs, gw, 1, P.ink3);
    }
    const bw = puzzle.boxW;
    const bh = puzzle.boxH;
    for (let k = bw; k < n; k += bw) g.rect(gx + k * cs - 1, gy, 3, gw, P.ink0);
    for (let k = bh; k < n; k += bh) g.rect(gx, gy + k * cs - 1, gw, 3, P.ink0);
    g.box(gx - 2, gy - 2, gw + 4, gw + 4, P.ink0, 3);

    if (selected >= 0) {
      const x = gx + (selected % n) * cs;
      const y = gy + Math.floor(selected / n) * cs;
      g.box(x - 1, y - 1, cs + 2, cs + 2, P.beer0, 3);
    }
  };

  /** Title and the rule in one sentence; returns the y below it. */
  const panelTitle = (g: Gfx): number => {
    const cx = PANEL.x + PANEL.w / 2;
    heading(g, size === 9 ? "Großes Rätsel" : "Kleines Rätsel", cx, PANEL.y + 10, { font: "big" });
    const rule = `Jede Ziffer von 1 bis ${size} einmal in jeder Zeile, jeder Spalte und jedem Kasten.`;
    para(g, rule, PANEL.x + 16, PANEL.y + 48, PANEL.w - 32, { align: "center", color: C.textDim, shadow: P.ink0 });
    return PANEL.y + 48 + textHeight(rule, PANEL.w - 32);
  };

  const drawPanel = (g: Gfx, interactive: boolean) => {
    const ui = app.ui;
    g.panel(PANEL.x, PANEL.y, PANEL.w, PANEL.h, "panel");
    const n = size;
    const cols = 3;
    const rows = n / cols;
    const bw = 104;
    const bh = 60;
    const gap = 10;
    const kx = PANEL.x + Math.round((PANEL.w - (cols * bw + (cols - 1) * gap)) / 2);
    let y = panelTitle(g) + 10;
    const counts = new Array(n + 1).fill(0);
    for (const v of board) counts[v]++;
    const selDigit = selected >= 0 ? board[selected] : 0;
    for (let d = 1; d <= n; d++) {
      const bx = kx + ((d - 1) % cols) * (bw + gap);
      const by = y + Math.floor((d - 1) / cols) * (bh + 8);
      const done = counts[d] >= n;
      const clicked = ui.button(`digit-${d}`, bx, by, bw, bh, String(d), {
        variant: "paper",
        font: "huge",
        hotkey: `Digit${d}`,
        active: !notesMode && selDigit === d,
        color: done ? P.ink5 : notesMode ? P.ink4 : P.ink1,
        sound: null,
        disabled: !interactive,
      });
      if (clicked) enter(d);
    }
    y += rows * bh + (rows - 1) * 8 + 12;
    const half = Math.round((cols * bw + (cols - 1) * gap - 10) / 2);
    if (ui.button("erase", kx, y, half, 46, "Radieren", { hotkey: "Backspace", disabled: !interactive })) erase();
    if (ui.button("notes", kx + half + 10, y, half, 46, notesMode ? "Notizen: an" : "Notizen: aus", { active: notesMode, disabled: !interactive })) {
      notesMode = !notesMode;
      message = notesMode ? "Notizen an: Ziffern klein notieren. Nochmal klicken nimmt sie weg." : "";
      messageT = 0;
    }
    y += 56;
    const fullW = cols * bw + (cols - 1) * gap;
    if ((opts.freeCells ?? 0) > 0) {
      if (ui.button("reveal", kx, y, fullW, 44, `Ein Feld verraten (${freeLeft})`, { disabled: !interactive || freeLeft <= 0 })) reveal();
    }
    if (ui.button("quit", kx, PANEL.y + PANEL.h - 58, fullW, 44, "Weglegen", { disabled: !interactive })) {
      phase = "quit";
      sfx.play("ui-open");
    }
  };

  const drawSolvedPanel = (g: Gfx) => {
    const ui = app.ui;
    g.panel(PANEL.x, PANEL.y, PANEL.w, PANEL.h, "panel-hi");
    const cx = PANEL.x + PANEL.w / 2;
    heading(g, "Gelöst!", cx, PANEL.y + 70, { font: "huge" });
    const line = PRAISE[(opts.seed >>> 0) % PRAISE.length];
    const h = para(g, line, PANEL.x + 28, PANEL.y + 140, PANEL.w - 56, { align: "center", shadow: P.ink0 });
    para(g, size === 9 ? "Das große Rätsel ist geschafft." : "Das kleine Rätsel ist geschafft.", PANEL.x + 28, PANEL.y + 160 + h, PANEL.w - 56, {
      align: "center", color: C.textDim, shadow: P.ink0,
    });
    if (ui.button("done", PANEL.x + 36, PANEL.y + PANEL.h - 86, PANEL.w - 72, 56, "Weiter", { variant: "go", font: "big", hotkey: "Enter" }) && !finished) {
      finished = true;
      opts.onDone({ solved: true, size });
    }
  };

  const drawStamp = (g: Gfx) => {
    const { gw, gx, gy } = layout();
    const t = Math.min(1, solvedT * 4);
    const w = 300;
    const h = 92;
    const x = gx + Math.round((gw - w) / 2);
    const y = gy + Math.round((gw - h) / 2) - Math.round((1 - t) * 20);
    g.alpha(t, () => {
      g.rect(x - 3, y - 3, w + 6, h + 6, rgba(P.paper4, 0.94));
      g.box(x, y, w, h, P.brick1, 5);
      g.box(x + 9, y + 9, w - 18, h - 18, P.brick1, 2);
      g.text("GELÖST", x + w / 2, centerY("huge", y, h), { font: "huge", color: P.brick1, align: "center" });
      g.text("GELÖST", x + w / 2 + 1, centerY("huge", y, h), { font: "huge", color: P.brick1, align: "center" });
    });
  };

  const drawChoice = (g: Gfx) => {
    const ui = app.ui;
    const px = 140;
    const py = 52;
    const pw = 680;
    const ph = 362;
    g.alpha(0.45, () => g.rect(px + 6, py + 7, pw, ph, P.ink0));
    g.panel(px, py, pw, ph, "paper");
    g.text("Die Rätselseite", 480, py + 14, { font: "big", color: P.ink1, align: "center" });
    g.rect(px + 30, py + 52, pw - 60, 2, P.ink1);
    para(g, QUESTION, px + 24, py + 66, pw - 48, { align: "center", color: P.ink1, shadow: null });
    const bw = 280;
    const bh = 196;
    const by = py + 140;
    const choices: { s: SudokuSize; label: string; sub: string; x: number }[] = [
      { s: 6, label: "Kleines Rätsel", sub: "6×6 · etwa 3 Minuten", x: px + 44 },
      { s: 9, label: "Großes Rätsel", sub: "9×9 · etwa 10 Minuten", x: px + pw - 44 - bw },
    ];
    for (const ch of choices) {
      const clicked = ui.button(`size-${ch.s}`, ch.x, by, bw, bh, "", { variant: "paper", hotkey: ch.s === 6 ? "Digit6" : "Digit9" });
      const over = ui.hover(ch.x, by, bw, bh);
      miniGrid(g, ch.s, ch.x + bw / 2, by + 16, over);
      g.text(ch.label, ch.x + bw / 2, by + 108, { font: "big", color: over ? P.brick1 : P.ink1, align: "center" });
      g.text(ch.sub, ch.x + bw / 2, by + 140, { font: "head", color: P.ink4, align: "center" });
      g.text(ch.s === 6 ? "+1 Sprit" : "+2 Sprit und 2 Mark", ch.x + bw / 2, by + 164, { font: "head", color: P.forest1, align: "center" });
      if (clicked) void begin(ch.s);
    }
  };

  return {
    enter() {
      void music.play("raetsel");
      if (opts.size) void begin(opts.size);
    },
    update(dt) {
      messageT += dt;
      if (phase === "solved") solvedT += dt;
    },
    draw(g) {
      drawKiosk(g);
      if (phase === "choose") {
        g.dim(0.25);
        drawChoice(g);
        bottomHint(g, "Klick auf das Rätsel, das du lösen willst.");
        return;
      }
      if (phase === "loading" || !puzzle) {
        bottomHint(g, "Die Zeitung wird aufgeschlagen …");
        return;
      }
      const playing = phase === "play";
      drawSheet(g);
      drawGrid(g, playing);
      if (phase === "solved") {
        drawStamp(g);
        drawSolvedPanel(g);
        bottomHint(g, "Klick auf „Weiter“.");
        return;
      }
      drawPanel(g, playing);
      if (playing) {
        keyboardMove();
        bottomHint(g, currentHint());
      }
      if (phase === "quit") drawQuit(g);
    },
  };

  function currentHint(): string {
    if (message && messageT < 6) return message;
    if (full() && !board.every((v, i) => v === puzzle!.solution[i])) {
      return opts.markErrors
        ? "Alle Felder sind voll, aber die roten Ziffern stimmen noch nicht."
        : "Alles voll, aber irgendwo stimmt was nicht. Schau nochmal nach.";
    }
    if (selected < 0) return "Klick auf ein leeres Feld, dann auf eine Ziffer.";
    if (kind[selected] !== OWN) return lockedText(selected);
    if (notesMode) return "Notizen an: Klick auf Ziffern, um sie klein ins Feld zu schreiben.";
    if (showWrong(selected)) return "Die rote Ziffer passt nicht. Klick auf eine andere Ziffer oder „Radieren“.";
    if (board[selected]) return "Andere Ziffer anklicken oder „Radieren“.";
    return "Welche Ziffer gehört ins gelbe Feld? Klick auf eine der großen Ziffern.";
  }

  /** Optional arrow keys move the yellow cell (never needed). */
  function keyboardMove() {
    const inp = app.input;
    const n = size;
    const moves: [string, number, number][] = [["ArrowLeft", 0, -1], ["ArrowRight", 0, 1], ["ArrowUp", -1, 0], ["ArrowDown", 1, 0]];
    for (const [key, dr, dc] of moves) {
      if (!inp.keyPressed(key)) continue;
      const cur = selected < 0 ? 0 : selected;
      const r = Math.min(n - 1, Math.max(0, Math.floor(cur / n) + dr));
      const c = Math.min(n - 1, Math.max(0, (cur % n) + dc));
      selected = r * n + c;
      message = "";
    }
  }

  function drawQuit(g: Gfx) {
    const ui = app.ui;
    const d = dialog(g, 540, 224);
    heading(g, "Rätsel weglegen?", 480, d.y + 18, { font: "big" });
    para(g, "Das kostet nichts. Die Auflösung steht morgen in der Zeitung.", d.x + 30, d.y + 66, d.w - 60, { align: "center", shadow: P.ink0 });
    const bw = 220;
    const by = d.y + d.h - 74;
    if (ui.button("quit-yes", d.x + 36, by, bw, 50, "Weglegen", { variant: "danger" }) && !finished) {
      finished = true;
      opts.onDone({ solved: false, size });
    }
    if (ui.button("quit-no", d.x + d.w - 36 - bw, by, bw, 50, "Weiterrätseln", { variant: "go", hotkey: "Escape" })) {
      phase = "play";
    }
    bottomHint(g, "Weglegen oder weiterrätseln?");
  }
}

/** A small empty newspaper grid as a picture on the size buttons. */
function miniGrid(g: Gfx, size: SudokuSize, cx: number, y: number, hot: boolean) {
  const cs = size === 9 ? 9 : 13;
  const w = cs * size;
  const x = Math.round(cx - w / 2);
  g.rect(x, y, w, w, hot ? P.paper4 : P.paper3);
  for (let k = 1; k < size; k++) {
    g.rect(x + k * cs, y, 1, w, P.ink4);
    g.rect(x, y + k * cs, w, 1, P.ink4);
  }
  const bw = 3;
  const bh = size === 9 ? 3 : 2;
  for (let k = bw; k < size; k += bw) g.rect(x + k * cs - 1, y, 2, w, P.ink0);
  for (let k = bh; k < size; k += bh) g.rect(x, y + k * cs - 1, w, 2, P.ink0);
  g.box(x - 1, y - 1, w + 2, w + 2, P.ink0, 2);
  // a few printed digits as dark dots
  const dots = size === 9 ? [0, 4, 10, 15, 21, 30, 38, 40, 42, 50, 59, 65, 70, 76, 80] : [1, 8, 13, 17, 22, 27, 34];
  for (const i of dots) g.rect(x + (i % size) * cs + Math.floor(cs / 2) - 1, y + Math.floor(i / size) * cs + Math.floor(cs / 2) - 2, 3, 4, P.ink1);
}

