// Daheim: the kitchen is the start screen (contract §2, §7). The Tourenbuch lies open on the table, the keys hang on
// the hook, the dog sleeps in the basket, the camper waits outside. A wooden board offers: Tour fortsetzen, Neue Tour,
// Tourenbuch, Einstellungen, Hilfe, Credits. With a partner in the profile, he or she says one sentence.
import type { App, Scene } from "../core/scene";
import type { Gfx } from "../core/gfx";
import type { BookState, TourState } from "../game/types";
import { loadSaved, settings } from "../core/save";
import { normaliseBook, rank } from "../tour/book";
import { music } from "../core/audio";
import { P } from "../core/palette";
import { centerY, lineHeight, measure, wrap } from "../core/font";
import { getPack, getProfile, region } from "../game/world";
import { bubble, heading, whatNow } from "./kit";
import { drawBackdrop } from "./paint/index";
import { createNewTour } from "./newtour";
import { continueTour } from "./map";
import { createBookScene } from "./book";
import { createSettingsScene } from "./settings";
import { createHelpScene } from "./help";
import { createCreditsScene } from "./credits";
import { homeLines } from "./lines";

export function goHome(app: App, opts: { welcome?: boolean } = {}) {
  app.scenes.switchTo(createHome(app, opts));
}

/** The kitchen backdrop (art or the code painting), shared by the first-start questions. */
export function drawKitchen(g: Gfx) {
  drawBackdrop(g, "bg/kitchen");
}

function runSummary(run: TourState | null): string | null {
  if (!run || run.ended || !run.map) return null;
  if (run.tutorial) return "Probefahrt, gleich geht’s weiter";
  const reg = region(run.regions[run.stage] ?? run.map.region);
  return `Etappe ${run.stage + 1}, ${reg?.title ?? ""} · ${run.fuel} Sprit · ${run.marks} Mark`;
}

function rankOf(book: BookState | null): string {
  return book ? rank(normaliseBook(book)).name : "Lehrling";
}

export function createHome(app: App, opts: { welcome?: boolean } = {}): Scene {
  const run = loadSaved<TourState>("run");
  const book = loadSaved<BookState>("book");
  const summary = runSummary(run);
  const profile = getProfile();
  const lines = homeLines();
  const pick = (l: readonly string[]) => l[Math.floor(Math.random() * l.length)];
  // With a partner, he or she speaks; without, a quiet kitchen moment is told.
  const partnerLine = profile.partner ? pick(opts.welcome ? lines.partnerWelcome : lines.partnerGoodbye) : null;
  const quietLine = profile.partner ? null : pick(opts.welcome ? lines.welcomeAlone : lines.ambience);
  let t = 0;

  return {
    enter() {
      void music.play("daheim");
    },
    update(dt) {
      t += dt;
    },
    draw(g, a) {
      const ui = a.ui;
      drawKitchen(g);

      // title sign on the wall
      const title = getPack().title || "SKAT AUF TOUR";
      const sub = getPack().subtitle || "Die Enztal-Tour";
      const tw = Math.max(measure(title, "huge"), measure(sub, "big")) + 60;
      g.panel(330 - tw / 2, 8, tw, 84, "panel-hi");
      heading(g, title, 330, 16, { font: "huge" });
      g.text(sub, 330, 54, { font: "big", align: "center", color: P.paper4, shadow: P.ink0 });

      // name plate on the book
      const name = settings.name || "Unbekannt";
      const plateText = `Tourenbuch von ${name} · ${rankOf(book)}`;
      const pw = measure(plateText, "head") + 28;
      g.panel(300 - pw / 2, 486, pw, 34, "paper");
      g.text(plateText, 300, centerY("head", 486, 34), { font: "head", align: "center", color: P.ink1 });

      // the partner's sentence, or a quiet kitchen moment
      if (partnerLine && t > 0.6) {
        const text = `${profile.partner}: „${partnerLine.replace(/\{name\}/g, name)}“`;
        bubble(g, text, 30, 380, 20, 540, { maxW: 380 });
      } else if (quietLine && t > 0.6) {
        const lines = Math.min(3, wrap(quietLine, 372, "head").length);
        const qh = lines * lineHeight("head") + 16;
        g.panel(40, 306, 400, qh, "paper");
        g.text(quietLine, 54, 314, { font: "head", color: P.ink2, width: 372, maxLines: 3 });
      }

      // the board with the menu
      const bx = 650;
      const by = 120;
      const bw = 280;
      const items: { id: string; label: string; sub?: string; go: () => void; variant?: "go" | "normal" }[] = [];
      if (summary) items.push({ id: "continue", label: "Tour fortsetzen", sub: summary, variant: "go", go: () => a.scenes.switchTo(continueTour(a)) });
      items.push({ id: "new", label: "Neue Tour", variant: summary ? "normal" : "go", go: () => a.scenes.switchTo(createNewTour(a)) });
      items.push({ id: "book", label: "Tourenbuch", go: () => a.scenes.switchTo(createBookScene(a)) });
      items.push({ id: "settings", label: "Einstellungen", go: () => a.scenes.push(createSettingsScene(a)) });
      items.push({ id: "help", label: "Hilfe", go: () => a.scenes.push(createHelpScene(a)) });
      items.push({ id: "credits", label: "Über das Spiel", go: () => a.scenes.push(createCreditsScene(a)) });
      const ih = 46;
      const gap = 10;
      const tall = (it: (typeof items)[number]) => (it.sub ? ih + 18 : ih);
      const total = items.reduce((s, it) => s + tall(it) + gap, 0) - gap;
      g.panel(bx - 14, by - 14, bw + 28, total + 28, "panel");
      let y = by;
      for (const it of items) {
        const h = tall(it);
        if (ui.button(it.id, bx, y, bw, h, it.label, { variant: it.variant, sub: it.sub, sound: "ui-open" })) it.go();
        y += h + gap;
      }

      whatNow(g, summary ? "Was jetzt? „Tour fortsetzen“ fährt weiter, wo du aufgehört hast." : "Was jetzt? Klick auf „Neue Tour“ und fahr los.", { y: 30, x: 636, w: 308 });
    },
  };
}
