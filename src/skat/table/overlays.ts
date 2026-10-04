// Two overlays over the table: the Liste on paper (contract §4.3: one row per game with the seed of the deal,
// contract §0.3) and the last trick ("Der letzte Stich darf nachgesehen werden wie am Tisch"). Both are pushed as
// scenes, so the table underneath pauses (the scene manager only updates the top scene).
import type { App, Scene } from "../../core/scene";
import type { Gfx } from "../../core/gfx";
import { P, C } from "../../core/palette";
import { measure } from "../../core/font";
import { atlas } from "../../core/assets";
import { dialog, whatNow } from "../../screens/kit";
import type { DeckId } from "../../game/ids";
import type { GameRecord, RoundProgress } from "../../game/types";
import { houseRuleEffects, recordLabel } from "../rules/index";
import type { Seat, TrickRecord } from "../rules/index";
import { CARD_H, CARD_W, drawCard } from "./draw";
import { shortName, signed } from "./text";

export interface ListeOpts {
  progress: RoundProgress;
  /** Display names by seat (player, left, right). */
  names: [string, string, string];
  /** Short names for the columns (default: the last word of each name). */
  short?: [string, string, string];
  deck: DeckId;
}

const ROWS_PER_PAGE = 9;

/** Bonus part of a game's list change for one seat (beer mats, evenings), for the "Prämie" note. */
export function bonusOf(r: GameRecord, seat: Seat): number {
  if (r.kind === "passed" || r.kind === "ramsch" || r.declarer === null) return 0;
  const base = seat === r.declarer ? r.value + (r.won ? 50 : -50) : r.won ? 0 : 40;
  return r.list[seat] - base;
}

/** The game column: "Kreuz mit 2 Hand · Erwin" (declarer short name). */
export function gameColumn(r: GameRecord, short: readonly string[], deck: DeckId): string {
  let s = recordLabel(r, deck);
  if (r.declarer !== null) s += ` · ${short[r.declarer]}`;
  if (r.kind === "ramsch" && r.ramsch) {
    if (r.ramsch.durchmarsch !== null) s += ` · ${short[r.ramsch.durchmarsch]}`;
    else if (r.ramsch.losers.length) s += ` · ${r.ramsch.losers.map((l) => short[l]).join(", ")}`;
  }
  return s;
}

export function createListeOverlay(app: App, opts: ListeOpts): Scene {
  let page = Math.max(0, Math.ceil(opts.progress.games.length / ROWS_PER_PAGE) - 1);
  const scene: Scene = {
    overlay: true,
    draw(g, a) {
      g.dim(0.55);
      const x = 24;
      const y = 14;
      const w = 912;
      const h = 470;
      g.panel(x, y, w, h, atlas("ui")?.slices["liste"] ? "liste" : "paper");
      drawListe(g, opts, x, y, w, h, page);
      const games = opts.progress.games.length;
      const pages = Math.max(1, Math.ceil(games / ROWS_PER_PAGE));
      if (pages > 1) {
        if (a.ui.button("liste-prev", x + 30, y + h - 52, 150, 40, "« Zurück", { disabled: page === 0, variant: "paper", sound: "page-turn" })) page--;
        if (a.ui.button("liste-next", x + 190, y + h - 52, 150, 40, "Weiter »", { disabled: page >= pages - 1, variant: "paper", sound: "page-turn" })) page++;
      }
      if (a.ui.button("liste-close", x + w - 250, y + h - 52, 220, 40, "Zurück zum Tisch", { variant: "go", hotkey: "Escape" })) a.scenes.remove(scene);
      whatNow(g, "Das ist die Liste. Klick auf „Zurück zum Tisch“.", { y: 494 });
    },
  };
  return scene;
}

/** The Liste sheet itself (also used by the final panel's preview). */
export function drawListe(g: Gfx, opts: ListeOpts, x: number, y: number, w: number, _h: number, page: number) {
  const { progress, names, deck } = opts;
  const short = opts.short ?? (names.map(shortName) as [string, string, string]);
  const cfg = progress.config;
  const ink = P.ink1;
  const dim = P.ink4;
  g.text("Liste", x + 40, y + 20, { font: "big", color: ink });
  g.text(`${cfg.title} · ${cfg.games} Spiele`, x + 40 + measure("Liste", "big") + 18, y + 28, { font: "head", color: dim });
  // columns: Nr. | Spiel | Wert | player | left | right | Blatt-Nr. (seed of the deal, contract §0.3)
  const colW = 88;
  const cols = {
    nr: x + 40,
    game: x + 68,
    value: x + 416,
    p0: x + 488,
    p1: x + 588,
    p2: x + 688,
    seed: x + w - 24,
  };
  const head = y + 62;
  const hf = "head";
  g.text("Nr.", cols.nr, head, { font: "body", color: dim });
  g.text("Spiel", cols.game, head, { font: "body", color: dim });
  g.text("Wert", cols.value + 60, head, { font: "body", color: dim, align: "right" });
  [cols.p0, cols.p1, cols.p2].forEach((cx, s) => {
    const n = short[s];
    const big = measure(n, hf) <= colW - 6;
    g.text(n, cx + colW, big ? head - 4 : head, { font: big ? hf : "body", color: s === 0 ? P.river0 : ink, align: "right" });
  });
  g.text("Blatt-Nr.", cols.seed, head, { font: "body", color: dim, align: "right" });
  const rule = (yy: number, color: string = P.river3) => g.rect(x + 30, yy, w - 50, 1, color);
  rule(head + 22, P.brick3);
  for (const cx of [cols.value + 66, cols.p0 + colW + 6, cols.p1 + colW + 6, cols.p2 + colW + 6]) g.rect(cx, head - 4, 1, 9 * 30 + 64, P.paper1);
  const rows = progress.games.slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE);
  let ry = head + 30;
  rows.forEach((r, i) => {
    const n = page * ROWS_PER_PAGE + i + 1;
    g.text(String(n), cols.nr, ry, { font: hf, color: dim });
    const label = gameColumn(r, short, deck);
    const room = cols.value - cols.game - 4;
    g.text(label, cols.game, measure(label, hf) > room ? ry + 3 : ry, { font: measure(label, hf) > room ? "body" : hf, color: ink, maxLines: 1, width: room });
    const showValue = r.kind !== "passed";
    g.text(showValue ? signed(r.value) : "–", cols.value + 60, ry, { font: hf, color: r.value < 0 ? P.brick1 : ink, align: "right" });
    [cols.p0, cols.p1, cols.p2].forEach((cx, s) => {
      const v = r.list[s];
      const b = bonusOf(r, s as Seat);
      const text = v === 0 ? "" : signed(v);
      g.text(text, cx + colW, ry, { font: hf, color: v < 0 ? P.brick1 : s === 0 ? P.river0 : ink, align: "right" });
      if (b > 0) g.text(`Prämie ${signed(b)}`, cx + colW, ry + 20, { font: "body", color: P.forest1, align: "right" });
    });
    g.text(String(r.seed), cols.seed, ry + 3, { font: "body", color: dim, align: "right" });
    ry += 30;
    rule(ry - 5);
  });
  if (!progress.games.length) g.text("Noch kein Spiel gespielt.", cols.game, ry, { font: hf, color: dim });
  // totals
  const ty = head + 30 + ROWS_PER_PAGE * 30 + 6;
  rule(ty - 6, P.ink3);
  rule(ty - 3, P.ink3);
  g.text("Summe", cols.game, ty, { font: hf, color: ink });
  [cols.p0, cols.p1, cols.p2].forEach((cx, s) => {
    const v = progress.list[s];
    g.text(signed(v), cx + colW, ty, { font: "big", color: v < 0 ? P.brick1 : s === 0 ? P.river0 : ink, align: "right" });
  });
  const kitty = houseRuleEffects(cfg.houseRule).kittyStake > 0;
  if (kitty) g.text(`Skatkasse: ${progress.kitty} Mark`, cols.game, ty + 34, { font: hf, color: dim });
}

// ─── last trick ───────────────────────────────────────────────────────────────────────────────────────────

export interface LastTrickOpts {
  trick: TrickRecord;
  names: [string, string, string];
  deck: DeckId;
}

export function createLastTrickOverlay(app: App, opts: LastTrickOpts): Scene {
  const scene: Scene = {
    overlay: true,
    draw(g, a) {
      const { x, y, w, h } = dialog(g, 560, 360, "felt");
      g.text("Der letzte Stich", x + w / 2, y + 14, { font: "big", align: "center", color: C.title, shadow: P.ink0 });
      const t = opts.trick;
      const pos: Record<Seat, [number, number]> = {
        1: [x + 70, y + 64],
        0: [x + w / 2 - CARD_W / 2, y + 96],
        2: [x + w - 70 - CARD_W, y + 64],
      };
      for (let i = 0; i < 3; i++) {
        const seat = ((t.leader + i) % 3) as Seat;
        const [cx, cy] = pos[seat];
        drawCard(g, opts.deck, t.cards[i], cx, cy, { state: seat === t.winner ? "marked" : "plain" });
        const label = seat === 0 ? "Du" : opts.names[seat];
        g.text(label, cx + CARD_W / 2, cy + CARD_H + 8, { font: "head", align: "center", color: seat === t.winner ? P.beer3 : C.text, shadow: P.ink0 });
        if (i === 0) g.text("kam raus", cx + CARD_W / 2, cy + CARD_H + 30, { font: "body", align: "center", color: C.textDim, shadow: P.ink0 });
      }
      const who = t.winner === 0 ? "Du hast den Stich bekommen" : `${opts.names[t.winner]} hat den Stich bekommen`;
      g.text(`${who}: ${t.points} Augen.`, x + w / 2, y + h - 98, { font: "head", align: "center", color: C.text, shadow: P.ink0 });
      if (a.ui.button("lt-close", x + w / 2 - 110, y + h - 60, 220, 42, "Zurück zum Tisch", { variant: "go", hotkey: "Escape" })) a.scenes.remove(scene);
      whatNow(g, "Klick auf „Zurück zum Tisch“, dann geht es weiter.", { y: 494 });
    },
  };
  return scene;
}
