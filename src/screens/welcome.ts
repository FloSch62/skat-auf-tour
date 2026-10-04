// First start (contract §4.1): two questions at the kitchen table. "Wie heißt du?" — type or click letters, up to
// twelve characters — and "Was trinkst du?" (Bier, Viertele, Most, Spezi). Also used from the settings to change both.
import type { App, Scene } from "../core/scene";
import type { DrinkId } from "../core/save";
import { saveSettings, settings } from "../core/save";
import { sfx } from "../core/audio";
import { P } from "../core/palette";
import { centerY, measure } from "../core/font";
import { drawKitchen } from "./home";
import { glass, heading, para, whatNow, type GlassKind } from "./kit";
import { FIRST_START } from "../content/texts";

const ROWS = ["ABCDEFGHIJ", "KLMNOPQRST", "UVWXYZÄÖÜß"];
const MAX = 12;

const GLASS: Record<DrinkId, GlassKind> = { beer: "beer", weizen: "weizen", wine: "wine", cider: "cider", spezi: "spezi" };

export const DRINK_CHOICES: { id: DrinkId; label: string; glass: GlassKind; line: string }[] = (
  ["beer", "weizen", "wine", "cider", "spezi"] as DrinkId[]
).map((id) => ({ id, label: FIRST_START.drinks[id].name, glass: GLASS[id], line: FIRST_START.drinks[id].line }));

export function createWelcome(app: App, opts: { done: () => void; editing?: boolean }): Scene {
  let step: 0 | 1 = 0;
  let name = settings.name;
  let drink: DrinkId = settings.drink;

  const add = (ch: string) => {
    if ([...name].length >= MAX) return;
    const startOfWord = name.length === 0 || name.endsWith(" ") || name.endsWith("-");
    name += startOfWord ? ch.toUpperCase() : ch.toLowerCase();
    sfx.play("pencil", { volume: 0.6 });
  };

  return {
    draw(g, a) {
      const ui = a.ui;
      drawKitchen(g);
      g.dim(0.35);
      const px = 150;
      const py = 30;
      const pw = 660;
      const ph = 400;
      g.panel(px, py, pw, ph, "paper");

      if (step === 0) {
        heading(g, opts.editing ? "Wie heißt du?" : "Grüß Gott! Wie heißt du?", 480, py + 16, { font: "big", color: P.ink1, outline: null });
        // typed input
        for (const ch of a.input.typed) {
          if (ch === "\b") name = [...name].slice(0, -1).join("");
          else if (ch === "\n") {
            if (name.trim()) step = 1;
          } else if (/^[\p{L} .'-]$/u.test(ch) && [...name].length < MAX) name += ch;
        }
        // the name line
        const fx = 300;
        const fy = py + 64;
        g.panel(fx, fy, 360, 46, "button-paper");
        const shown = name || "";
        g.text(shown, 480, centerY("big", fy, 46), { font: "big", align: "center", color: P.ink1 });
        if (Math.floor(a.time * 2) % 2 === 0) g.rect(480 + measure(shown, "big") / 2 + 3, fy + 10, 3, 26, P.ink1);
        // letter grid
        const bw = 52;
        const bh = 42;
        const gap = 6;
        const gx = 480 - (10 * bw + 9 * gap) / 2;
        let y = fy + 60;
        ROWS.forEach((row, r) => {
          [...row].forEach((ch, i) => {
            const label = ch === "ß" ? "ß" : ch;
            if (ui.button(`k-${r}-${i}`, gx + i * (bw + gap), y, bw, bh, label, { variant: "paper", font: "big", sound: null })) add(ch);
          });
          y += bh + gap;
        });
        if (ui.button("k-dash", gx, y, bw, bh, "-", { variant: "paper", font: "big", sound: null })) add("-");
        if (ui.button("k-space", gx + bw + gap, y, 3 * bw + 2 * gap, bh, "Leerzeichen", { variant: "paper", sound: null })) {
          if (name && !name.endsWith(" ") && [...name].length < MAX) name += " ";
        }
        if (ui.button("k-del", gx + 4 * (bw + gap), y, 3 * bw + 2 * gap, bh, "Löschen", { variant: "paper", disabled: !name })) name = [...name].slice(0, -1).join("");
        if (ui.button("k-next", gx + 7 * (bw + gap), y, 3 * bw + 2 * gap, bh, "Weiter", { variant: "go", disabled: !name.trim() })) {
          name = name.trim();
          step = 1;
        }
        whatNow(g, "Klick die Buchstaben deines Namens an oder tipp ihn ein. Dann „Weiter“.", { y: 450 });
        return;
      }

      heading(g, FIRST_START.drinkQuestion, 480, py + 16, { font: "big", color: P.ink1, outline: null });
      para(g, FIRST_START.drinkHint, px + 40, py + 60, pw - 80, { color: P.ink3, align: "center" });
      const cw = 112;
      const cg = 12;
      const cx0 = 480 - (DRINK_CHOICES.length * cw + (DRINK_CHOICES.length - 1) * cg) / 2;
      DRINK_CHOICES.forEach((d, i) => {
        const x = cx0 + i * (cw + cg);
        const y = py + 110;
        const h = 180;
        const sel = drink === d.id;
        if (ui.area(`d-${d.id}`, x, y, cw, h, { sound: "glass-clink" })) drink = d.id;
        const over = ui.hover(x, y, cw, h);
        g.panel(x, y, cw, h, sel ? "button-paper-hover" : over ? "button-paper" : "paper-dark");
        glass(g, d.glass, x + cw / 2, y + 112, 3, 2);
        g.text(d.label, x + cw / 2, y + 124, { font: "big", align: "center", color: sel ? P.brick1 : P.ink1 });
        if (sel) g.rect(x + 16, y + h - 14, cw - 32, 4, P.brick1);
      });
      const line = DRINK_CHOICES.find((d) => d.id === drink)?.line ?? "";
      g.text(line, 480, py + 306, { font: "head", align: "center", color: P.ink3 });
      if (ui.button("back", px + 40, py + ph - 62, 160, 44, "Zurück", { variant: "paper" })) step = 0;
      if (ui.button("done", px + pw - 220, py + ph - 62, 180, 44, opts.editing ? "Übernehmen" : "Fertig", { variant: "go" })) {
        settings.name = name.trim();
        settings.drink = drink;
        saveSettings();
        opts.done();
      }
      whatNow(g, "Klick auf dein Getränk und dann auf „" + (opts.editing ? "Übernehmen" : "Fertig") + "“.", { y: 450 });
    },
  };
}
