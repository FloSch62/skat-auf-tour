// The Stammtisch-Aufgabe (contract §4.7): one Skat problem at the regulars' table — an endgame with open cards, a
// discard (which two go into the Skat?) or a bid (how far does this hand carry?). Three attempts (the Airedale gives
// one more), the Lupe shows once where the answer lies, an explanation after solving or giving up, then "Weiter".
// Problems come from public/puzzles/skat-problems.json (AI workstream); until that exists, the hand-checked fixture.
//
// onDone({ solved, attempts }): solved → the attempt that solved it (1 = first try); not solved → the number of wrong
// answers (0 when he gave up at once). Like the chess station, the scene never pops itself and names no Mark.
import type { App, Scene } from "../../core/scene";
import type { Gfx } from "../../core/gfx";
import type { UI } from "../../core/ui";
import { loadJson } from "../../core/assets";
import { music, sfx } from "../../core/audio";
import { lineHeight, measure, wrap } from "../../core/font";
import { C, P, rgba } from "../../core/palette";
import { settings } from "../../core/save";
import { Rng } from "../../core/rng";
import { para, textHeight, whatNow } from "../../screens/kit";
import { createGameMenu, menuButton } from "../../screens/menu";
import { drawBackdrop } from "../../screens/paint/index";
import { PROBLEM_LINES } from "../../content/texts";
import type { DeckId } from "../../game/ids";
import {
  BID_VALUES, POSITION_NAMES, TRUMP, cardName, declarationName, legalMoves, maskOf, playRules, sortHand, suitName,
} from "../rules/index";
import type { Card } from "../rules/index";
import { CARD_H, CARD_W, drawBeerMat, drawCard, drawChalkboard, drawTurnedCard } from "../table/draw";
import type { BidProblem, DiscardProblem, EndgameProblem, SkatProblemData, SkatProblemPack } from "./format";
import { fallbackProblems, pickProblem, validProblems } from "./pick";
import { evaluateEndgame, tricksLeft } from "./solve";

export interface ProblemStationOpts {
  seed: number;
  /** Allowed attempts: 3, or 4 with the Airedale. */
  attempts: number;
  /** Lupe (souvenir magnifier): hints per problem (usually 0 or 1). */
  hints: number;
  onDone(r: { solved: boolean; attempts: number }): void;
  /** Dev / events: a fixed problem id, or only problems of one type. */
  problemId?: string;
  type?: SkatProblemData["type"];
  /** Dev / QA: skip the intro panel. */
  devStart?: boolean;
}

type Phase = "loading" | "intro" | "solve" | "confirm" | "result";

const BOARD = { x: 168, y: 8, w: 624, h: 118 };
const HAND_Y = 424;
const TRICK: Record<0 | 1 | 2, { x: number; y: number }> = {
  0: { x: 444, y: 208 },
  1: { x: 386, y: 176 },
  2: { x: 502, y: 176 },
};
const TYPE_NAME = { endgame: "Endspiel", discard: "Drücken", bid: "Reizen" } as const;
const ORDINAL = ["ersten", "zweiten", "dritten", "vierten", "fünften"];

const PRAISE = ["Sauber! Das hätte der alte Gottlob auch so gemacht.", "Richtig! Da nickt der ganze Stammtisch.", "Genau so. Der Wirt stellt dir eine Brezel hin."];
const LATER = ["Mit Geduld geht’s auch.", "Nicht gleich, aber sicher."];
const MISSED = ["Diesmal nicht. Hier ist die Lösung.", "Knifflig. So wäre es gegangen."];

export function createProblemStation(app: App, opts: ProblemStationOpts): Scene {
  const rng = new Rng(opts.seed ^ 0x7ab1e);
  const maxAttempts = Math.max(1, opts.attempts);
  let phase: Phase = "loading";
  let problem: SkatProblemData | null = null;
  let attemptsLeft = maxAttempts;
  let wrong = 0;
  let solved = false;
  let hintsLeft = Math.max(0, opts.hints);
  let hintOn = false;
  let feedback = "";
  let lifted: Card = -1;
  let selected: Card[] = [];
  let bidPick = 0;
  let doneCalled = false;
  let resultLine = "";
  let outcomes: ReturnType<typeof evaluateEndgame> | null = null;
  const flavour = rng.pick(PROBLEM_LINES);
  const deck = (): DeckId => settings.deck;

  void (async () => {
    const pack = await loadJson<SkatProblemPack>("puzzles/skat-problems.json");
    let list = validProblems(pack);
    if (!list.length) list = fallbackProblems();
    problem = (opts.problemId && list.find((p) => p.id === opts.problemId)) || pickProblem(list, opts.seed, opts.type);
    phase = opts.devStart ? "solve" : "intro";
  })();

  // ─── answers ──────────────────────────────────────────────────────────────────────────────────────────

  function right(): void {
    solved = true;
    resultLine = wrong === 0 ? rng.pick(PRAISE) : `${rng.pick(LATER)} Im ${ORDINAL[wrong] ?? `${wrong + 1}.`} Versuch.`;
    sfx.play("win-sting");
    phase = "result";
  }

  function miss(text: string): void {
    wrong++;
    attemptsLeft--;
    sfx.play("sudoku-wrong");
    lifted = -1;
    selected = [];
    bidPick = 0;
    if (attemptsLeft <= 0) {
      resultLine = `${text} ${rng.pick(MISSED)}`;
      phase = "result";
      sfx.play("lose-sting");
    } else feedback = text;
  }

  function answerEndgame(p: EndgameProblem, c: Card) {
    if (c === p.solution) return right();
    outcomes ??= evaluateEndgame(p);
    const o = outcomes.find((x) => x.card === c);
    const name = cardName(c, deck());
    const isNull = p.declaration.kind === "null";
    let why = "";
    if (o) {
      if (isNull) why = p.declarer === 0 ? "Damit bekommst du einen Stich." : "Damit kommt der Alleinspieler ohne Stich durch.";
      else if (p.goal === "schwarz") why = `Damit gibst du einen Stich ab.`;
      else if (p.declarer === 0) why = `Damit kommst du bei bestem Spiel nur auf ${o.declarerPoints} Augen.`;
      else why = `Damit kommt der Alleinspieler bei bestem Spiel auf ${o.declarerPoints} Augen.`;
    }
    miss(`${name} reicht nicht. ${why}`.trim());
  }

  function answerDiscard(p: DiscardProblem) {
    const [a, b] = [...selected].sort((x, y) => x - y);
    if (a === p.solution[0] && b === p.solution[1]) return right();
    const hits = selected.filter((c) => p.solution.includes(c)).length;
    miss(hits === 1 ? "Eine der beiden Karten stimmt, die andere nicht." : "Diese beiden sind nicht die beste Wahl.");
  }

  function answerBid(p: BidProblem) {
    const v = bidPick;
    if (v >= p.range[0] && v <= p.range[1]) return right();
    miss(v > p.range[1] ? `${v} ist zu hoch: So weit trägt das Blatt nicht.` : `${v} ist zu niedrig: Da geht noch mehr.`);
  }

  // ─── texts ────────────────────────────────────────────────────────────────────────────────────────────

  function task(p: SkatProblemData): string {
    const given = (p as { task?: string }).task;
    if (given) return given;
    if (p.type === "discard") return `Du hast den Skat aufgenommen und willst ${declarationName(p.declaration, deck())} spielen. Welche zwei Karten drückst du?`;
    if (p.type === "bid") return `Du sitzt in ${POSITION_NAMES[p.position]}. Bis wohin reizt du dieses Blatt?`;
    const game = declarationName(p.declaration, deck());
    const left = tricksLeft(p);
    switch (p.goal) {
      case "win":
        return `Du spielst ${game} und hast schon ${p.points[0]} Augen (mit Skat). Noch ${left} Stiche. Mit welcher Karte gewinnst du sicher?`;
      case "schneider":
        return `Du spielst ${game} und hast ${p.points[0]} Augen (mit Skat). Mit welcher Karte machst du die Gegner sicher Schneider?`;
      case "schwarz":
        return `Du spielst ${game}. Mit welcher Karte holst du sicher alle ${left} Stiche?`;
      case "noTrick":
        return `Du spielst ${game}. Mit welcher Karte bleibst du sicher ohne Stich?`;
      case "defend":
        if (p.declaration.kind === "null") return `${p.declarer === 1 ? "Links" : "Rechts"} spielt ${game}. Mit welcher Karte zwingt ihr ihm sicher einen Stich auf?`;
        return `${p.declarer === 1 ? "Links" : "Rechts"} spielt ${game} und hat ${p.points[0]} Augen (mit Skat), ihr habt ${p.points[1]}. Mit welcher Karte bringt ihr das Spiel sicher zu Fall?`;
    }
  }

  function whatNowText(): string {
    const p = problem;
    if (!p || phase === "loading") return "Die Karten werden ausgelegt …";
    if (phase === "intro") return "Klick auf „Los geht’s“.";
    if (phase === "confirm") return "Willst du die Lösung sehen?";
    if (phase === "result") return "Klick auf „Weiter“.";
    const fb = feedback ? `${feedback} ` : "";
    if (p.type === "endgame") return fb + (lifted >= 0 ? "Klick die Karte noch einmal, dann liegt sie." : "Klick die Karte an, die du spielst.");
    if (p.type === "discard") {
      if (selected.length < 2) return fb + "Klick zwei Karten an, die du drücken willst.";
      return fb + "Klick auf „Drücken“. Bis dahin kannst du noch tauschen.";
    }
    return fb + (bidPick ? `Klick auf „Bis ${bidPick}“ – oder wähl einen anderen Wert.` : "Klick an, bis zu welchem Wert du reizt.");
  }

  // ─── drawing ──────────────────────────────────────────────────────────────────────────────────────────

  function drawBoard(g: Gfx, p: SkatProblemData) {
    const { x, y, w, h } = BOARD;
    drawChalkboard(g, x, y, w, h);
    g.text(`Stammtisch-Aufgabe · ${TYPE_NAME[p.type]}`, x + w / 2, y + 9, { font: "body", align: "center", color: P.paper1 });
    const lines = wrap(task(p), w - 40, "head").slice(0, 3);
    lines.forEach((l, i) => g.text(l, x + w / 2, y + 30 + i * 26, { font: "head", align: "center", color: P.paper4 }));
  }

  function handX(i: number, n: number): number {
    const step = n > 1 ? Math.min(80, Math.floor((660 - CARD_W) / (n - 1))) : 0;
    const w = CARD_W + step * (n - 1);
    return Math.round(150 + (660 - w) / 2 + i * step);
  }

  /** The player's cards at the bottom; `pickable` decides which can be clicked, `onPick` handles a click. */
  function drawHand(g: Gfx, ui: UI, cards: Card[], pickable: (c: Card) => boolean, marked: (c: Card) => boolean, raisedSel: (c: Card) => boolean, onPick: (c: Card) => void, still = false) {
    const n = cards.length;
    const active = phase === "solve" && !still;
    cards.forEach((c, i) => {
      const x = handX(i, n);
      const can = active && pickable(c);
      const sel = raisedSel(c);
      const y = HAND_Y - (sel ? 26 : can ? 12 : 0);
      const state = sel ? "selected" : marked(c) ? "marked" : active && !can ? "veiled" : "plain";
      const wv = i < n - 1 ? handX(i + 1, n) - x : CARD_W;
      const hover = can && ui.hover(x, y, wv, 540 - y);
      drawCard(g, deck(), c, x, y, { state, hover });
      if (can && ui.area(`card-${c}`, x, y, wv, 540 - y)) onPick(c);
    });
  }

  function drawEndgame(g: Gfx, ui: UI, p: EndgameProblem) {
    const kind = p.declaration.kind;
    const roles = (seat: 0 | 1 | 2) => (seat === p.declarer ? "Alleinspieler" : "Gegenspieler");
    // the two other hands, open (Stammtisch problems are solved with open cards)
    for (const seat of [1, 2] as const) {
      const cards = sortHand(maskOf(p.hands[seat]), kind);
      const step = 34;
      const w = CARD_W + step * Math.max(0, cards.length - 1);
      const label = `${seat === 1 ? "Links" : "Rechts"} · ${roles(seat)}`;
      const lw = measure(label, "head") + 20;
      const x0 = seat === 1 ? 16 : 944 - Math.max(w, lw);
      g.panel(x0, 146, lw, 30, "panel-dark");
      g.text(label, x0 + 10, 150, { font: "head", color: C.text, shadow: P.ink0 });
      cards.forEach((c, i) => drawCard(g, deck(), c, x0 + i * step, 182));
    }
    // the trick so far
    p.trick.forEach((c, i) => {
      const seat = ((p.leader + i) % 3) as 0 | 1 | 2;
      const t = TRICK[seat];
      drawTurnedCard(g, deck(), c, t.x + CARD_W / 2, t.y + CARD_H / 2, seat === 1 ? 1 : seat === 2 ? 5 : 3);
    });
    // the points so far
    const pts = kind === "null" ? "Nullspiel: Wer als Alleinspieler einen Stich bekommt, verliert." : `Augen bisher: Alleinspieler ${p.points[0]} (mit Skat) · Gegenspieler ${p.points[1]}`;
    const pw = measure(pts, "body") + 24;
    g.panel(480 - pw / 2, 300, pw, 26, "panel-dark");
    g.text(pts, 480, 305, { font: "body", align: "center", color: C.textDim });
    // my cards
    const mine = sortHand(maskOf(p.hands[0]), kind);
    const led = p.trick.length ? p.trick[0] : -1;
    const legal = legalMoves(playRules(kind), maskOf(p.hands[0]), led);
    const hintClass = hintOn ? playRules(kind).classOf[p.solution] : -1;
    drawHand(
      g, ui, mine,
      (c) => (legal & (1 << c)) !== 0,
      (c) => phase === "result" ? c === p.solution : hintOn && playRules(kind).classOf[c] === hintClass,
      (c) => c === lifted,
      (c) => {
        if (settings.oneClickPlay || lifted === c) answerEndgame(p, c);
        else {
          lifted = c;
          sfx.play("card-raise");
        }
      },
    );
  }

  function drawDiscard(g: Gfx, ui: UI, p: DiscardProblem) {
    const kind = p.declaration.kind;
    const cards = sortHand(maskOf(p.cards), kind);
    // two places for the Skat in the middle
    g.text("Skat", 480, 168, { font: "head", align: "center", color: C.text, shadow: P.ink0 });
    for (let i = 0; i < 2; i++) {
      const x = 400 + i * 88;
      g.rect(x, 194, CARD_W, CARD_H, rgba(P.ink0, 0.25));
      g.box(x, 194, CARD_W, CARD_H, P.paper2, 1);
      const c = phase === "result" && !solved ? p.solution[i] : selected[i];
      if (c !== undefined) drawCard(g, deck(), c, x, 194);
    }
    drawHand(
      g, ui, cards,
      () => true,
      (c) => (phase === "result" && p.solution.includes(c)) || (hintOn && c === p.solution[0]),
      (c) => selected.includes(c),
      (c) => {
        const i = selected.indexOf(c);
        if (i >= 0) selected.splice(i, 1);
        else {
          if (selected.length >= 2) selected.shift();
          selected.push(c);
          sfx.play("card-raise");
        }
      },
    );
    if (phase === "solve" && ui.button("p-discard", 480 - 110, 312, 220, 40, "Drücken", { variant: "go", disabled: selected.length !== 2 })) answerDiscard(p);
  }

  function drawBid(g: Gfx, ui: UI, p: BidProblem) {
    const cards = sortHand(maskOf(p.cards), null);
    drawHand(g, ui, cards, () => false, () => false, () => false, () => {}, true);
    // the grid of bid values (18 … 96)
    const values = BID_VALUES.filter((v) => v <= 96);
    const cols = 8;
    const bw = 66;
    const bh = 38;
    const gap = 6;
    const x0 = 480 - (cols * bw + (cols - 1) * gap) / 2;
    const y0 = 140;
    const lo = hintOn ? values[Math.max(0, values.indexOf(p.range[0]) - 2)] : 0;
    const hi = hintOn ? values[Math.min(values.length - 1, values.indexOf(p.range[1]) + 2)] : 0;
    values.forEach((v, i) => {
      const x = x0 + (i % cols) * (bw + gap);
      const y = y0 + Math.floor(i / cols) * (bh + gap);
      const inHint = hintOn && v >= lo && v <= hi;
      const isRight = phase === "result" && v >= p.range[0] && v <= p.range[1];
      if (inHint || isRight) g.rect(x - 3, y - 3, bw + 6, bh + 6, isRight ? P.forest3 : P.beer2);
      if (ui.button(`bid-${v}`, x, y, bw, bh, String(v), { variant: "paper", active: bidPick === v, disabled: phase !== "solve" }) && phase === "solve") {
        bidPick = v;
      }
    });
    if (phase === "solve" && bidPick && ui.button("p-bid", 480 - 120, 318, 240, 34, `Bis ${bidPick}`, { variant: "go", font: "head" })) answerBid(p);
  }

  function drawSide(g: Gfx, ui: UI) {
    drawBeerMat(g, 80, 58, 48, maxAttempts, attemptsLeft);
    g.text("Versuche", 80, 110, { font: "body", align: "center", color: C.text, shadow: P.ink0 });
    if (phase !== "solve") return;
    if (hintsLeft > 0 && ui.button("p-hint", 810, 446, 142, 40, "Lupe", { variant: "paper", tooltip: "Zeigt einmal, wo die Lösung liegt." })) {
      hintsLeft--;
      hintOn = true;
      sfx.play("ui-open");
      const p = problem!;
      if (p.type === "endgame") {
        const r = playRules(p.declaration.kind);
        const cls = r.classOf[p.solution];
        feedback = `Die Lupe sagt: Spiel ${cls === TRUMP ? "Trumpf" : suitName(cls, deck())}.`;
      } else if (p.type === "discard") feedback = `Die Lupe sagt: ${cardName(p.solution[0], deck())} gehört dazu.`;
      else feedback = "Die Lupe zeigt dir den Bereich.";
    }
    if (ui.button("p-giveup", 810, 494, 142, 40, "Aufgeben")) phase = "confirm";
  }

  function drawIntro(g: Gfx, ui: UI, p: SkatProblemData) {
    const w = 640;
    const body = `${flavour}\n\n${task(p)}\n\nDu hast ${maxAttempts} Versuche.${hintsLeft ? " Die Lupe hilft dir einmal." : ""}`;
    const h = 60 + textHeight(body, w - 80) + 80;
    g.dim(0.5);
    const x = (960 - w) / 2;
    const y = Math.max(10, Math.round((484 - h) / 2));
    g.panel(x, y, w, h, "paper");
    g.text(`Stammtisch-Aufgabe: ${TYPE_NAME[p.type]}`, x + w / 2, y + 14, { font: "big", align: "center", color: P.ink1 });
    para(g, body, x + 40, y + 58, w - 80, { color: P.ink1, shadow: null, align: "center" });
    if (ui.button("p-start", x + w / 2 - 120, y + h - 58, 240, 46, "Los geht’s", { variant: "go", hotkey: "Enter" })) phase = "solve";
  }

  function drawConfirm(g: Gfx, ui: UI) {
    const w = 520;
    const h = 170;
    g.dim(0.5);
    const x = (960 - w) / 2;
    const y = 150;
    g.panel(x, y, w, h, "paper");
    g.text("Aufgeben?", x + w / 2, y + 14, { font: "big", align: "center", color: P.ink1 });
    g.text("Dann zeige ich dir die Lösung.", x + w / 2, y + 56, { font: "head", align: "center", color: P.ink3 });
    if (ui.button("p-keep", x + 30, y + h - 60, 220, 44, "Weiterknobeln", { variant: "go" })) phase = "solve";
    if (ui.button("p-show", x + w - 250, y + h - 60, 220, 44, "Lösung zeigen")) {
      resultLine = "Macht nix, so lernt man’s.";
      phase = "result";
    }
  }

  function drawResult(g: Gfx, ui: UI, p: SkatProblemData) {
    const w = 700;
    const answer =
      p.type === "endgame" ? `Die Lösung: ${cardName(p.solution, deck())}.`
      : p.type === "discard" ? `Die Lösung: ${cardName(p.solution[0], deck())} und ${cardName(p.solution[1], deck())} drücken.`
      : `Die Lösung: ${p.range[0] === p.range[1] ? `bis ${p.range[0]}` : `bis ${p.range[0]}, höchstens ${p.range[1]}`}.`;
    const text = `${resultLine}\n${answer}\n\n${p.explanation}`;
    const h = 60 + textHeight(text, w - 80) + 76;
    const x = (960 - w) / 2;
    const y = 132;
    g.panel(x, y, w, Math.min(h, 340), "paper");
    g.text(solved ? "Gelöst!" : "Nicht gelöst", x + w / 2, y + 12, { font: "big", align: "center", color: solved ? P.forest1 : P.brick1 });
    para(g, text, x + 40, y + 52, w - 80, { color: P.ink1, shadow: null, align: "center" });
    if (ui.button("p-next", x + w / 2 - 120, y + Math.min(h, 340) - 58, 240, 46, "Weiter", { variant: "go", hotkey: "Enter" }) && !doneCalled) {
      doneCalled = true;
      opts.onDone({ solved, attempts: solved ? wrong + 1 : wrong });
    }
  }

  const scene: Scene = {
    enter() {
      void music.play("raetsel");
    },
    draw(g, a) {
      const ui = a.ui;
      drawBackdrop(g, "inns/village");
      g.rect(0, 0, 960, 540, rgba(P.ink0, 0.35));
      const p = problem;
      if (p) {
        drawBoard(g, p);
        if (p.type === "endgame") drawEndgame(g, ui, p);
        else if (p.type === "discard") drawDiscard(g, ui, p);
        else drawBid(g, ui, p);
        drawSide(g, ui);
        if (phase === "intro") drawIntro(g, ui, p);
        if (phase === "confirm") drawConfirm(g, ui);
        if (phase === "result") drawResult(g, ui, p);
      }
      if (menuButton(app)) app.scenes.push(createGameMenu(app, { helpPage: "game-value" }));
      const t = whatNowText();
      const lines = wrap(t, 760 - 32, "head").length;
      whatNow(g, t, { y: phase === "result" || phase === "intro" || phase === "confirm" ? 494 : 394 - 34 - (lines - 1) * lineHeight("head") });
    },
  };
  return scene;
}
