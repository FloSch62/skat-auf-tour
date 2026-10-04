// The in-tour menu (a "Menü" button on every tour screen opens it): Weiter, Hilfe, Einstellungen, Für heute aufhören.
// The tour is saved after every station and every Skat game, so leaving never loses more than the current game.
import type { App, Scene } from "../core/scene";
import { C, P } from "../core/palette";
import { dialog, para } from "./kit";
import { createHelpScene } from "./help";
import { createSettingsScene } from "./settings";
import { goHome } from "./home";

export interface MenuOpts {
  /** Called before going home (save the state). */
  onQuit?: () => void;
  /** Help page to open first (e.g. "Hausregeln" at the table). */
  helpPage?: string;
  /** Extra line under the title, e.g. what is saved. */
  note?: string;
}

export function createGameMenu(app: App, opts: MenuOpts = {}): Scene {
  const scene: Scene = {
    overlay: true,
    draw(g, a) {
      const ui = a.ui;
      const { x, y, w } = dialog(g, 420, 380);
      g.text("Pause", x + w / 2, y + 16, { font: "big", align: "center", color: C.title, shadow: P.ink0 });
      para(g, opts.note ?? "Die Tour ist gespeichert.", x + 30, y + 58, w - 60, { align: "center", color: C.textDim, shadow: P.ink0 });
      const bx = x + 50;
      const bw = w - 100;
      let by = y + 100;
      if (ui.button("m-go", bx, by, bw, 46, "Weiter spielen", { variant: "go", hotkey: "Escape" })) a.scenes.remove(scene);
      by += 56;
      if (ui.button("m-help", bx, by, bw, 46, "Hilfe")) a.scenes.push(createHelpScene(a, { page: opts.helpPage }));
      by += 56;
      if (ui.button("m-set", bx, by, bw, 46, "Einstellungen")) a.scenes.push(createSettingsScene(a));
      by += 56;
      if (ui.button("m-quit", bx, by, bw, 46, "Für heute aufhören")) {
        opts.onQuit?.();
        goHome(a);
      }
    },
  };
  return scene;
}

/** The small "Menü" button in the top-right corner of tour screens. Returns true when clicked. */
export function menuButton(app: App, x = 846, y = 8): boolean {
  return app.ui.button("menu", x, y, 106, 40, "Menü");
}
