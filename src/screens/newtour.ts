// Neue Tour (contract §4.1): one decision per screen at the kitchen table: the guided first trip (offered on the very
// first tour), the difficulty, the vehicle (after the first Wanderpokal), the dogs, then off we go — with the
// partner's goodbye when there is one.
import type { App, Scene } from "../core/scene";
import type { DifficultyId, DogId, VehicleId } from "../game/ids";
import { DIFFICULTIES } from "../game/ids";
import { music, sfx } from "../core/audio";
import { saveSettings, settings } from "../core/save";
import { C, P } from "../core/palette";
import { getPack, getProfile } from "../game/world";
import { ALL_EVENTS } from "../content/events/index";
import { KITCHEN, TUTORIAL } from "../content/texts";
import { DIFFICULTY_DEFS } from "../data/difficulty";
import { DOG_DEFS, dogName } from "../data/dogs";
import { VEHICLE_DEFS } from "../data/vehicles";
import { availableVehicles, unlockedDogs } from "../tour/book";
import { loadBook } from "../tour/save";
import { newTour, newTutorial } from "../tour/state";
import { bubble, para, paintedVehicle, whatNow } from "./kit";
import { drawKitchen, goHome } from "./home";
import { go, makeSession } from "./tour/session";
import { itemIcon } from "./tour/common";
import "./tour/index";
import "./map";

type Step = "tutorial" | "difficulty" | "vehicle" | "dogs" | "go";

function newSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}

/** The difficulty in three short sentences, in the running-text size (contract §0.5); details are in the help. */
const DIFFICULTY_SHORT: Partial<Record<string, string>> = {
  cozy: "Mehr leichte Stammgäste. Tank mit 6 Strichen. Beim Preisskat kostet Platz zwei keinen Sprit.",
  sporty: "Gemischte Stammgäste. Tank mit 5 Strichen. Beim Preisskat kostet Platz zwei einen Strich.",
  sharp: "Mehr starke Stammgäste. Tank mit 4 Strichen. Beim Preisskat kosten Platz zwei und drei je zwei Striche.",
};

export function createNewTour(app: App): Scene {
  const book = loadBook();
  const profile = getProfile();
  const vehicles = availableVehicles(book);
  const firstTour = book.tours.started === 0 && !settings.tutorialDone;
  const steps: Step[] = [...(firstTour ? (["tutorial"] as Step[]) : []), "difficulty", ...(vehicles.length > 1 ? (["vehicle"] as Step[]) : []), "dogs", "go"];
  let i = 0;
  let difficulty: DifficultyId = book.tours.started === 0 ? "cozy" : "sporty";
  let vehicle: VehicleId = "camper";
  const dogs = unlockedDogs(book);
  let chosen: DogId[] = dogs.slice(0, 1);
  const goodbye = profile.partner ? KITCHEN.partnerGoodbye[Math.floor(Math.random() * KITCHEN.partnerGoodbye.length)] : null;
  const next = () => (i = Math.min(steps.length - 1, i + 1));
  const back = () => (i > 0 ? i-- : goHome(app));

  const start = (tutorial: boolean) => {
    const seed = newSeed();
    const tour = tutorial
      ? newTutorial({ seed, pack: getPack(), profile, dogs: chosen.length ? chosen : ["shepherd"], book })
      : newTour({ seed, difficulty, vehicle, dogs: chosen, pack: getPack(), profile, book, events: ALL_EVENTS });
    sfx.play("van-start");
    go(app, makeSession(tour, book));
  };

  return {
    enter() {
      void music.play("daheim");
    },
    draw(g, a) {
      const ui = a.ui;
      drawKitchen(g);
      g.dim(0.35);
      const step = steps[i];
      g.panel(40, 24, 880, 448, "paper");
      const head = (t: string) => g.text(t, 480, 38, { font: "big", align: "center", color: P.ink1 });
      if (step === "tutorial") {
        head("Die erste Fahrt");
        para(g, TUTORIAL.offer, 120, 100, 720, { color: P.ink1, shadow: null, align: "center" });
        para(g, "Wirtshaus, Kiosk, Schachbrett, Stellplatz: jede Station wird kurz erklärt.", 120, 170, 720, { color: P.ink3, shadow: null, align: "center" });
        if (ui.button("nt-tut", 300, 250, 360, 56, TUTORIAL.start, { variant: "go", sub: "vier Stationen, kein Spritverlust" })) start(true);
        if (ui.button("nt-skip", 300, 320, 360, 48, TUTORIAL.skip)) {
          settings.tutorialDone = true;
          saveSettings();
          next();
        }
        whatNow(g, "Was jetzt? Probefahrt, oder gleich richtig los?", { y: 490, x: 14, w: 560 });
      } else if (step === "difficulty") {
        head("Wie scharf soll’s werden?");
        DIFFICULTIES.forEach((d, k) => {
          const def = DIFFICULTY_DEFS[d];
          const x = 64 + k * 282;
          const sel = d === difficulty;
          g.panel(x, 96, 268, 280, sel ? "panel-hi" : "panel");
          g.text(def.name, x + 134, 108, { font: "big", align: "center", color: sel ? C.title : C.text, shadow: P.ink0 });
          para(g, DIFFICULTY_SHORT[d] ?? def.text, x + 14, 152, 240, { font: DIFFICULTY_SHORT[d] ? "head" : "body", color: C.text });
          if (ui.button(`nt-d-${d}`, x + 14, 316, 240, 46, sel ? "Gewählt" : "Wählen", { variant: sel ? "go" : "normal", active: sel })) difficulty = d;
        });
        para(g, "Gilt für die ganze Tour. Nichts wird heimlich angepasst.", 64, 388, 832, { color: P.ink3, shadow: null, align: "center" });
        whatNow(g, "Was jetzt? Wähle die Schwierigkeit, dann „Weiter“.", { y: 490, x: 14, w: 560 });
      } else if (step === "vehicle") {
        head("Womit fährst du?");
        (vehicles as VehicleId[]).forEach((v, k) => {
          const def = VEHICLE_DEFS[v];
          const x = 120 + k * 370;
          const sel = v === vehicle;
          g.panel(x, 96, 350, 290, sel ? "panel-hi" : "panel");
          if (!paintedVehicle(g, v === "camper" ? "camper" : "rig", x + 175, 220, v === "camper" ? 200 : 150) && !g.sprite("van", v === "camper" ? "camper" : "rig", x + 175, 220)) g.rect(x + 100, 170, 150, 50, P.paper3);
          g.text(def.name, x + 175, 230, { font: "head", align: "center", color: sel ? C.title : C.text, shadow: P.ink0 });
          para(g, def.text, x + 14, 258, 322, { font: "body", color: C.text });
          if (ui.button(`nt-v-${v}`, x + 14, 330, 322, 44, sel ? "Gewählt" : "Wählen", { variant: sel ? "go" : "normal", active: sel })) {
            vehicle = v;
            chosen = chosen.slice(0, VEHICLE_DEFS[v].dogSlots);
          }
        });
        whatNow(g, "Was jetzt? Wähle das Fahrzeug, dann „Weiter“.", { y: 490, x: 14, w: 560 });
      } else if (step === "dogs") {
        const slots = VEHICLE_DEFS[vehicle].dogSlots;
        head(slots === 1 ? "Wer fährt im Beiwagen mit?" : `Welche Hunde fahren mit? (bis zu ${slots})`);
        dogs.forEach((d, k) => {
          const x = 64 + (k % 3) * 282;
          const y = 88 + Math.floor(k / 3) * 186;
          const sel = chosen.includes(d);
          g.panel(x, y, 268, 176, sel ? "panel-hi" : "panel");
          itemIcon(g, d, x + 36, y + 36, { label: DOG_DEFS[d].breed });
          g.text(dogName(profile, d), x + 72, y + 12, { font: "head", color: sel ? C.title : C.text, shadow: P.ink0 });
          g.text(DOG_DEFS[d].breed, x + 72, y + 36, { font: "body", color: C.textDim, shadow: P.ink0 });
          para(g, DOG_DEFS[d].ability, x + 12, y + 66, 244, { font: "body", color: C.text });
          if (ui.button(`nt-dog-${d}`, x + 12, y + 124, 244, 44, sel ? "Fährt mit" : "Mitnehmen", { active: sel, variant: sel ? "go" : "normal" })) {
            if (sel) chosen = chosen.filter((x2) => x2 !== d);
            else chosen = [...chosen, d].slice(-slots);
          }
        });
        if (dogs.length === 1) para(g, "Mehr Hunde schaltet die Tour frei: Sie stehen dann im Tourenbuch.", 360, 300, 520, { color: P.ink3, shadow: null });
        whatNow(g, "Was jetzt? Klicke an, wer mitfährt, dann „Weiter“.", { y: 490, x: 14, w: 560 });
      } else {
        head("Alles gepackt?");
        const lines = [
          `Schwierigkeit: ${DIFFICULTY_DEFS[difficulty].name}`,
          `Fahrzeug: ${VEHICLE_DEFS[vehicle].name}`,
          `Hunde: ${chosen.length ? chosen.map((d) => dogName(profile, d)).join(" und ") : "diesmal keiner"}`,
          "Erste Etappe: die Heimatregion, am Ende wartet der Preisskat.",
        ];
        lines.forEach((l, k) => g.text(l, 120, 100 + k * 34, { font: "head", color: P.ink1 }));
        if (goodbye) bubble(g, `${profile.partner}: „${goodbye.replace(/\{name\}/g, settings.name || "")}“`, 120, 260, 100, 420, { maxW: 560 });
        whatNow(g, "Was jetzt? Klicke auf „Losfahren“.", { y: 490, x: 14, w: 560 });
        if (ui.button("nt-go", 744, 484, 200, 48, "Losfahren", { variant: "go", hotkey: "Enter" })) start(false);
      }
      if (step !== "tutorial" && step !== "go" && ui.button("nt-next", 744, 484, 200, 48, "Weiter", { variant: "go", hotkey: "Enter" })) next();
      if (ui.button("nt-back", 580, 484, 150, 48, i === 0 ? "Zur Küche" : "Zurück", { hotkey: "Escape" })) back();
    },
  };
}
