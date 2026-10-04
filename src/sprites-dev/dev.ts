// Sprites workstream dev galleries (tools/sprites → public/sprites):
//   ?dev=cards[&deck=french|german|tournament][&view=hand|all|small]   the three decks, a fanned hand, overlays
//   ?dev=atlases[&atlas=icons][&bg=felt|wood|paper|dark]                 every frame of an atlas at 1:1, with anims
//   ?dev=slices                                                         every ui 9-slice at three sizes
import type { DevFactory } from "../dev";
import type { Scene } from "../core/scene";
import type { Gfx } from "../core/gfx";
import { atlas, atlasScale } from "../core/assets";
import { C, P } from "../core/palette";
import { DECKS, RANKS, SUITS, type DeckId } from "../game/ids";
import { whatNow } from "../screens/kit";
import { measure } from "../core/font";

const DECK_LABEL: Record<DeckId, string> = { french: "Französisch", german: "Deutsch", tournament: "Turnier" };
const VIEWS = ["hand", "all", "small"] as const;
const VIEW_LABEL = ["Hand", "Alle 32", "Klein"];
const BGS: Record<string, string> = { felt: P.felt1, wood: P.wood0, paper: P.paper3, dark: P.ink0 };

function background(g: Gfx, bg: string) {
  if (bg === "felt") g.panel(0, 0, 960, 540, "felt");
  else g.rect(0, 0, 960, 540, BGS[bg] ?? P.felt1);
}

/** A card frame name: `<deck>-<suit>-<rank>[-s]`. */
const card = (deck: string, suit: string, rank: string, small = false) => `${deck}-${suit}-${rank}${small ? "-s" : ""}`;

function cardsScene(params: URLSearchParams): Scene {
  let deck = Math.max(0, DECKS.indexOf((params.get("deck") ?? "french") as DeckId));
  let view = Math.max(0, VIEWS.indexOf((params.get("view") ?? "hand") as (typeof VIEWS)[number]));
  let selected = 3;
  const hand: [string, string][] = [
    ["clubs", "jack"], ["spades", "jack"], ["hearts", "ace"], ["hearts", "10"], ["hearts", "king"],
    ["hearts", "queen"], ["spades", "9"], ["diamonds", "8"], ["diamonds", "7"], ["clubs", "10"],
  ];
  const playable = new Set([2, 3, 4, 5]);
  return {
    draw(g, app) {
      const ui = app.ui;
      background(g, "felt");
      const d = DECKS[deck];
      deck = ui.choice("deck", 12, 10, DECKS.map((k) => DECK_LABEL[k]), deck, { w: 132, h: 36 });
      view = ui.choice("view", 440, 10, VIEW_LABEL, view, { w: 110, h: 36 });
      if (!atlas("cards")) {
        g.text("cards-Atlas fehlt (npm run sprites)", 480, 260, { font: "big", align: "center", color: C.text });
        return;
      }
      if (VIEWS[view] === "hand") {
        // the trick: three cards slightly turned (rotation is done at draw time)
        const trick: [string, string, number][] = [["clubs", "ace", -0.12], ["hearts", "7", 0.08], ["spades", "king", -0.03]];
        trick.forEach(([s, r, a], i) => {
          const c = g.ctx;
          c.save();
          c.translate(400 + i * 50 + 36, 120 + (i % 2) * 14 + 54);
          c.rotate(a);
          g.sprite("cards", "shadow", -36 + 3, -54 + 4);
          g.sprite("cards", card(d, s, r), -36, -54);
          c.restore();
        });
        // the skat (two backs) and the last trick (small cards)
        for (let i = 0; i < 2; i++) {
          g.sprite("cards", "shadow", 108 + i * 24 + 3, 110 + 4);
          g.sprite("cards", `back-${i + 1}`, 108 + i * 24, 110);
        }
        g.sprite("cards", "back-3", 228, 110);
        g.text("Skat", 120, 226, { font: "head", color: C.text, shadow: P.ink0 });
        ["clubs-queen", "diamonds-10", "hearts-9"].forEach((c, i) => {
          const [s, r] = c.split("-");
          g.sprite("cards", "shadow-s", 700 + i * 40 + 2, 110 + 3);
          g.sprite("cards", card(d, s, r, true), 700 + i * 40, 110);
        });
        g.text("Letzter Stich", 700, 170, { font: "head", color: C.text, shadow: P.ink0 });
        for (let i = 0; i < 3; i++) g.sprite("cards", `back-${i + 1}-s`, 830 + i * 40, 110);
        // the hand: 72×108 cards, 30 units visible each, playable ones stand higher
        const x0 = 480 - (9 * 30 + 72) / 2;
        hand.forEach(([s, r], i) => {
          const x = x0 + i * 30;
          const y = 404 - (playable.has(i) ? 12 : 0) - (i === selected ? 14 : 0);
          const over = ui.area(`h${i}`, x, y, i === hand.length - 1 ? 72 : 30, 108);
          if (over && playable.has(i)) selected = i;
          g.sprite("cards", "shadow", x + 3, y + 4);
          g.sprite("cards", card(d, s, r), x, y);
          if (i === selected) g.sprite("cards", "hl-selected", x, y);
          else if (playable.has(i)) g.sprite("cards", "hl-playable", x, y);
          else g.sprite("cards", "veil-locked", x, y);
        });
        whatNow(g, "Was jetzt? Klick auf eine Karte, die du spielen willst.", { y: 340 });
      } else if (VIEWS[view] === "all") {
        SUITS.slice().reverse().forEach((s, row) => {
          RANKS.forEach((r, col) => {
            const x = 18 + col * 118;
            const y = 56 + row * 120;
            g.sprite("cards", "shadow", x + 2, y + 3);
            g.sprite("cards", card(d, s, r), x, y);
          });
        });
        RANKS.forEach((_, col) => g.sprite("cards", `back-${(col % 3) + 1}-s`, 18 + col * 118 + 76, 56 + 3 * 120 + 54));
      } else {
        DECKS.forEach((dk, di) => {
          SUITS.slice().reverse().forEach((s, si) => {
            RANKS.forEach((r, ri) => {
              const x = 14 + (si % 2) * 470 + ri * 57;
              const y = 58 + di * 152 + Math.floor(si / 2) * 66;
              g.sprite("cards", card(dk, s, r, true), x, y);
            });
          });
        });
        ["shadow-s", "hl-playable-s", "hl-selected-s", "veil-locked-s"].forEach((o, i) => {
          const x = 600 + i * 90;
          g.sprite("cards", card(DECKS[deck], "hearts", "ace", true), x, 478 - 54);
          g.sprite("cards", o, x, 478 - 54);
        });
      }
    },
  };
}

// ─── every frame of an atlas ───────────────────────────────────────────────────────────────────────────────

const ATLASES = ["ui", "icons", "items", "drinks", "words", "chess", "van", "fx", "sudoku", "cards"];

interface Cell {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function layout(name: string): Cell[][] {
  const a = atlas(name);
  if (!a) return [];
  const s = atlasScale(a);
  const pages: Cell[][] = [[]];
  let x = 12;
  let y = 64;
  let rowH = 0;
  const animFrames = new Set(Object.values(a.anims).flatMap((an) => an.frames.slice(1)));
  for (const [fn, f] of Object.entries(a.frames)) {
    if (animFrames.has(fn)) continue;
    const w = Math.ceil(f.w / s);
    const h = Math.ceil(f.h / s);
    const animName = Object.entries(a.anims).find(([, an]) => an.frames[0] === fn)?.[0];
    const cw = Math.max(w, measure(animName ? `${animName} ▸` : fn, "small")) + 10;
    const ch = h + 16;
    if (x + cw > 950) {
      x = 12;
      y += rowH + 4;
      rowH = 0;
    }
    if (y + ch > 486) {
      pages.push([]);
      x = 12;
      y = 64;
      rowH = 0;
    }
    pages[pages.length - 1].push({ name: fn, x, y, w, h });
    x += cw;
    rowH = Math.max(rowH, ch);
  }
  return pages;
}

function atlasesScene(params: URLSearchParams): Scene {
  let sel = Math.max(0, ATLASES.indexOf(params.get("atlas") ?? "icons"));
  let bg = params.get("bg") ?? "felt";
  let cache: { name: string; pages: Cell[][] } | null = null;
  return {
    draw(g, app) {
      const ui = app.ui;
      background(g, bg);
      sel = ui.choice("atlas", 8, 8, ATLASES, sel, { w: 84, h: 34, gap: 4 });
      const bgs = Object.keys(BGS);
      const bi = ui.choice("bg", 8, 500, bgs, Math.max(0, bgs.indexOf(bg)), { w: 70, h: 32, gap: 4 });
      bg = bgs[bi];
      const name = ATLASES[sel];
      const a = atlas(name);
      if (!a) {
        g.text(`${name}: Atlas fehlt`, 480, 260, { font: "big", align: "center", color: C.text });
        return;
      }
      if (!cache || cache.name !== name || cache.pages.length === 0) cache = { name, pages: layout(name) };
      const page = ui.pager(`pg-${name}`, 320, 500, 630, cache.pages.length, 1);
      const s = atlasScale(a);
      const ink = bg === "paper" ? P.ink1 : C.text;
      for (const c of cache.pages[page] ?? []) {
        const f = a.frames[c.name];
        // animations play in place of their first frame
        const anim = Object.entries(a.anims).find(([, an]) => an.frames[0] === c.name);
        const fn = anim ? g.animFrame(name, anim[0], g.time) ?? c.name : c.name;
        const ff = a.frames[fn] ?? f;
        g.sprite(name, fn, c.x + ff.ax / s, c.y + ff.ay / s);
        if (a.slices[c.name]) g.box(c.x, c.y, c.w, c.h, P.beer2);
        const label = anim ? `${anim[0]} ▸` : c.name;
        g.text(label, c.x, c.y + c.h + 2, { font: "small", color: ink });
      }
    },
  };
}

export const dev: Record<string, DevFactory> = {
  cards: (_app, params) => cardsScene(params),
  atlases: (_app, params) => atlasesScene(params),
  slices: (): Scene => ({
    draw(g) {
      g.rect(0, 0, 960, 540, P.wood0);
      const a = atlas("ui");
      const names = a ? Object.keys(a.slices) : [];
      names.forEach((n, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = 10 + col * 238;
        const y = 8 + row * 76;
        g.panel(x, y, 132, 56, n);
        g.panel(x + 140, y + 12, 44, 32, n);
        g.panel(x + 190, y, 40, 56, n);
        g.text(n, x + 6, y + 58, { font: "small", color: C.text });
      });
    },
  }),
};
