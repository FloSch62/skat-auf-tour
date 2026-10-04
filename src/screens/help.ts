// Hilfe (contract §7): Bedienung, Hausregeln, Spielwert, Liste, Tour, Stationen, Sprit und Mark, Sammlung — the pages
// of src/content/help.ts as a paper booklet. Long pages are split into sheets turned with « Zurück / Weiter ».
import type { App, Scene } from "../core/scene";
import { P } from "../core/palette";
import { lineHeight, measure, wrap } from "../core/font";
import { HELP_PAGES } from "../content/help";
import { dialog } from "./kit";

const FONT = "head";
const PARA_GAP = 8;

/** Split a page's paragraphs into sheets that fit `height`. */
function sheets(paragraphs: readonly string[], width: number, height: number): string[][][] {
  const lh = lineHeight(FONT);
  const out: string[][][] = [];
  let cur: string[][] = [];
  let h = 0;
  for (const p of paragraphs) {
    const lines = wrap(p, width, FONT);
    const ph = lines.length * lh + PARA_GAP;
    if (cur.length && h + ph > height) {
      out.push(cur);
      cur = [];
      h = 0;
    }
    cur.push(lines);
    h += ph;
  }
  if (cur.length) out.push(cur);
  return out;
}

export function createHelpScene(_app: App, opts: { page?: string } = {}): Scene {
  let page = Math.max(0, HELP_PAGES.findIndex((p) => p.id === opts.page || p.title === opts.page));
  const cache = new Map<number, string[][][]>();
  const scene: Scene = {
    overlay: true,
    draw(g, a) {
      const ui = a.ui;
      const { x, y, w, h } = dialog(g, 920, 510, "paper");
      // index on the left
      const ix = x + 14;
      let iy = y + 14;
      HELP_PAGES.forEach((p, i) => {
        const font = measure(p.title, "head") > 212 ? "body" : "head";
        if (ui.button(`hp-${i}`, ix, iy, 236, 40, p.title, { variant: "paper", active: i === page, align: "left", sound: "page-turn", font })) {
          page = i;
          ui.setPage("help-sheet", 0);
        }
        iy += 46;
      });
      if (ui.button("close", ix, y + h - 54, 236, 42, "Schließen", { variant: "go", hotkey: "Escape" })) a.scenes.remove(scene);
      // the page
      const px = x + 272;
      const pw = w - 296;
      const p = HELP_PAGES[page];
      g.text(p.title, px, y + 14, { font: "big", color: P.ink1 });
      let pages = cache.get(page);
      if (!pages) {
        pages = sheets(p.paragraphs, pw, h - 130);
        cache.set(page, pages);
      }
      const sheet = ui.pager("help-sheet", px, y + h - 54, pw, pages.length, 1);
      let py = y + 58;
      const lh = lineHeight(FONT);
      for (const lines of pages[Math.min(sheet, pages.length - 1)] ?? []) {
        g.text(lines.join("\n"), px, py, { font: FONT, color: P.ink1 });
        py += lines.length * lh + PARA_GAP;
      }
    },
  };
  return scene;
}
