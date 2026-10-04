// Über das Spiel: who made it and with what (src/content/texts.ts CREDITS).
import type { App, Scene } from "../core/scene";
import { P } from "../core/palette";
import { lineHeight } from "../core/font";
import { CREDITS } from "../content/texts";
import { dialog } from "./kit";

export function createCreditsScene(_app: App): Scene {
  const scene: Scene = {
    overlay: true,
    draw(g, a) {
      const { x, y, w, h } = dialog(g, 820, 510, "paper");
      const [first, ...rest] = CREDITS;
      g.text(first.heading, x + w / 2, y + 14, { font: "big", align: "center", color: P.ink1 });
      g.text(first.lines.join(" "), x + w / 2, y + 50, { font: "head", align: "center", color: P.ink3 });
      // two columns of sections
      const colW = (w - 80) / 2;
      const lh = lineHeight("body");
      let col = 0;
      let cy = y + 92;
      const half = Math.ceil(rest.length / 2);
      rest.forEach((s, i) => {
        if (i === half) {
          col = 1;
          cy = y + 92;
        }
        const cx = x + 30 + col * (colW + 20);
        g.text(s.heading, cx, cy, { font: "head", color: P.brick1 });
        cy += 24;
        for (const l of s.lines) cy += g.text(l, cx, cy, { font: "body", color: P.ink1, width: colW }) + 1;
        cy += lh * 0.6;
      });
      if (a.ui.button("close", x + w / 2 - 90, y + h - 58, 180, 44, "Schließen", { variant: "go", hotkey: "Escape" })) a.scenes.remove(scene);
    },
  };
  return scene;
}
