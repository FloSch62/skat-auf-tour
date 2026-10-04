// The end of a tour (contract §4.1): "Heimfahrt am Haken" when the tank is empty, then the Abrechnung (route, Liste,
// stamps, numbers) and back to the kitchen, where the partner welcomes him. The guided first trip ends with its own
// short note. The Tourenbuch has been written along the way; nothing here can lose progress.
import type { App, Scene } from "../../core/scene";
import type { Gfx } from "../../core/gfx";
import { music, sfx } from "../../core/audio";
import { saveSettings, settings } from "../../core/save";
import { P } from "../../core/palette";
import { goHome } from "../home";
import { HOMECOMING_LINES, TOW_LINES, TUTORIAL } from "../../content/texts";
import { completeTutorial } from "../../tour/state";
import { clearTour } from "../../tour/save";
import { SCREENS, persist, type Session } from "./session";
import { fillLine, itemIcon, mainButton, nowLine, paperText, pickFor, scenery, stationPlate } from "./common";

function home(app: App, s: Session) {
  persist(s);
  if (!s.dev) clearTour();
  goHome(app, { welcome: true });
}

// ─── Heimfahrt am Haken ───────────────────────────────────────────────────────────────────────────────────

function createTow(app: App, s: Session): Scene {
  const line = pickFor(s, TOW_LINES.lines, "tow");
  let clock = 0;
  return {
    enter() {
      void music.play("heimfahrt");
      sfx.play("van-horn");
    },
    update(dt) {
      clock += dt;
    },
    draw(g, a) {
      scenery(g, "bg/homecoming", "night");
      stationPlate(g, TOW_LINES.heading);
      // the tow truck pulling the camper across the bottom (code drawing, calm)
      const x = Math.round(((clock * 40) % 1200) - 240);
      drawTow(g, settings.reducedMotion ? 300 : x, 420);
      paperText(g, line, 150, 140, 660);
      paperText(g, HOMECOMING_LINES.summary, 150, 230, 660, { font: "body" });
      nowLine(g, "Was jetzt? Klicke auf „Abrechnung“.");
      if (mainButton(a, "tow-go", "Abrechnung")) app.scenes.switchTo(createAccount(app, s));
    },
  };
}

function drawTow(g: Gfx, x: number, y: number) {
  // truck
  g.rect(x + 150, y - 34, 70, 34, P.ink0);
  g.rect(x + 152, y - 32, 66, 30, P.beer2);
  g.rect(x + 196, y - 50, 22, 18, P.ink0);
  g.rect(x + 198, y - 48, 18, 14, P.river4);
  g.rect(x + 160, y - 44, 6, 10, P.road1);
  // the hook line
  g.line(x + 150, y - 20, x + 118, y - 14, P.ink0, 2);
  // camper
  g.rect(x, y - 44, 120, 40, P.ink0);
  g.rect(x + 2, y - 42, 116, 36, P.paper3);
  g.rect(x + 2, y - 26, 116, 5, P.brick2);
  g.rect(x + 10, y - 38, 18, 10, P.river4);
  for (const wx of [x + 22, x + 96, x + 170, x + 206]) {
    g.circle(wx, y, 8, P.ink0, true);
    g.circle(wx, y, 4, P.stone2, true);
  }
}

// ─── Abrechnung ───────────────────────────────────────────────────────────────────────────────────────────

function createAccount(app: App, s: Session): Scene {
  const t = s.tour;
  const outcome = t.ended === "won" ? HOMECOMING_LINES.won : t.ended === "lost-final" ? HOMECOMING_LINES.lostFinal : HOMECOMING_LINES.empty;
  const line = pickFor(s, outcome, "home");
  const route = t.route.map((r) => r.line);
  const skat = t.route.filter((r) => r.points !== undefined);
  const listSum = skat.reduce((a, r) => a + (r.points ?? 0), 0);
  const places = [...new Set(t.route.map((r) => r.place).filter(Boolean))];
  const perPage = 9;
  return {
    enter() {
      void music.play(t.ended === "won" ? "pokal" : "heimfahrt");
    },
    draw(g, a) {
      scenery(g, "bg/homecoming");
      stationPlate(g, t.ended === "empty" ? "Abrechnung" : HOMECOMING_LINES.heading);
      paperText(g, line, 24, 118, 912);
      // route (paged)
      g.panel(24, 170, 560, 306, "paper");
      g.text("Die Route", 40, 178, { font: "head", color: P.ink1 });
      const page = a.ui.pager("route", 40, 426, 528, route.length, perPage);
      route.slice(page * perPage, page * perPage + perPage).forEach((l, i) => {
        g.text(l, 40, 206 + i * 24, { font: "body", color: P.ink2, width: 528, maxLines: 1 });
      });
      // numbers
      g.panel(600, 170, 336, 306, "paper");
      const rows: [string, string][] = [
        ["Liste der Tour", listSum < 0 ? `–${-listSum}` : String(listSum)],
        ["Skatrunden", String(skat.length)],
        ["Wirtshaus gewonnen", `${t.stats.innWins} von ${t.stats.innRounds}`],
        ["Aufgaben gelöst", String(t.stats.puzzlesSolved)],
        ["Abstecher", String(t.stats.detours)],
        ["Andere heimgefahren", String(t.stats.timesDriver)],
        ["Ortsstempel", String(places.length)],
        ["Mark am Ende", String(t.marks)],
      ];
      rows.forEach(([k, v], i) => {
        const ry = 182 + i * 30;
        g.text(k, 616, ry, { font: "head", color: P.ink2 });
        g.text(v, 920, ry, { font: "head", align: "right", color: P.ink1 });
      });
      t.trophies.forEach((r, i) => itemIcon(g, `trophy-${r}`, 640 + i * 60, 440, { label: "Pokal" }));
      if (t.ended === "won") itemIcon(g, "trophy-wander", 640 + t.trophies.length * 60, 440);
      if (!t.trophies.length) g.text("Diesmal kein Pokal.", 616, 430, { font: "head", color: P.ink3 });
      nowLine(g, "Was jetzt? Klicke auf „Heim in die Küche“.");
      if (mainButton(a, "acc-home", "Heim in die Küche")) home(app, s);
    },
  };
}

// ─── the guided first trip ────────────────────────────────────────────────────────────────────────────────

function createTutorialDone(app: App, s: Session): Scene {
  const text = TUTORIAL.steps.done.map((l) => fillLine(l, { name: settings.name || "Kamerad" })).join(" ");
  return {
    enter() {
      void music.play("daheim");
    },
    draw(g, a) {
      scenery(g, "bg/homecoming");
      stationPlate(g, "Probefahrt geschafft");
      paperText(g, text, 150, 150, 660);
      nowLine(g, "Was jetzt? Klicke auf „Heim in die Küche“.");
      if (mainButton(a, "tut-home", "Heim in die Küche")) {
        completeTutorial(s.tour, s.env);
        settings.tutorialDone = true;
        saveSettings();
        persist(s);
        goHome(app);
      }
    },
  };
}

function createEnd(app: App, s: Session): Scene {
  if (s.tour.tutorial) return createTutorialDone(app, s);
  if (s.tour.ended === "empty") return createTow(app, s);
  return createAccount(app, s);
}

SCREENS.end = createEnd;
SCREENS.tutorialDone = createTutorialDone;

