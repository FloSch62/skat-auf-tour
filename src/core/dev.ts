// ?dev=kit — a gallery of the core UI kit, fonts and fallbacks for visual checks.
import type { DevFactory } from "../dev";
import type { Scene } from "./scene";
import { P, C } from "./palette";
import { atlas } from "./assets";
import { bubble, fuelGauge, marksChip, plate, portrait, soundWord, whatNow } from "../screens/kit";

let checked = true;
let vol = 0.6;
let sel = 1;
let name = "Gottlob";

export const dev: Record<string, DevFactory> = {
  kit: (): Scene => ({
    draw(g, app) {
      const ui = app.ui;
      g.rect(0, 0, 960, 540, P.wood0);
      g.panel(16, 16, 450, 300);
      g.text("SKAT AUF TOUR", 30, 24, { font: "huge", color: C.title, shadow: P.ink0 });
      g.text("Überschrift „big“ 31", 30, 66, { font: "big", color: P.beer3, shadow: P.ink0 });
      g.text("Fließtext in „head“: Der {gold}Erwin{/} reizt bis 48 und überreizt sich. Grüß Gott, Meister!", 30, 104, { font: "head", width: 420, shadow: P.ink0 });
      g.text("Kleinste Lesegröße „body“: Augen, Stich, Trumpf, Liste. ÄÖÜ äöü ß", 30, 160, { font: "body", width: 420 });
      ui.button("b1", 30, 190, 130, 40, "20 sagen", { variant: "go" });
      ui.button("b2", 170, 190, 130, 40, "Passe");
      ui.button("b3", 310, 190, 130, 40, "Gesperrt", { disabled: true });
      ui.button("b4", 30, 240, 130, 48, "Grand", { sub: "Wert 72 · reicht", variant: "paper" });
      checked = ui.checkbox("c1", 180, 248, "Lesebrille", checked);
      vol = ui.stepper("s1", 500, 30, 220, vol);
      sel = ui.choice("ch", 500, 80, ["Gemütlich", "Sportlich", "Scharf"], sel, { w: 140 });
      name = ui.textField("tf", 500, 130, 220, name);
      fuelGauge(g, 500, 185, 3, 5);
      marksChip(g, 500, 222, 17);
      portrait(g, "maurer", 760, 30, 96);
      portrait(g, "zocker", 860, 30, 72);
      bubble(g, "Achtzehn? Da sag ich doch glatt zwanzig!", 600, 270, 820, 140, { maxW: 300 });
      plate(g, "Gasthaus Krone", 240, 330);
      soundWord(g, "KLATSCH", 760, 420, 2);
      g.text(`Atlanten: ui ${atlas("ui") ? "ok" : "—"} · icons ${atlas("icons") ? "ok" : "—"} · cards ${atlas("cards") ? "ok" : "—"}`, 30, 380, { font: "body", color: C.textDim });
      ["panel", "panel-hi", "panel-dark", "paper", "felt", "dialog"].forEach((v, k) => g.panel(16 + k * 74, 410, 66, 50, v));
      whatNow(g, "Was jetzt? Klick auf eine Karte, die du spielen willst.", { y: 490 });
    },
  }),
};
