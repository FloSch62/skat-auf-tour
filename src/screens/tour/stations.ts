// The calm stations (contract §4.2): Stellplatz (tank, save, offer to stop for today; crickets or rain), Hundewiese
// (take or swap a dog), Flohmarkt (three souvenirs, swap when the slots are full), Werkstatt (Meister and Lehrling,
// upgrades, fuel for Mark).
import type { App, Scene } from "../../core/scene";
import type { Gfx } from "../../core/gfx";
import type { DogId, SouvenirId, UpgradeId } from "../../game/ids";
import { music, sfx } from "../../core/audio";
import { hashString } from "../../core/rng";
import { C, P } from "../../core/palette";
import { bubble, dialog, para, portrait } from "../kit";
import { goHome } from "../home";
import {
  DOG_MEADOW_LINES, GARAGE_LINES, MARKET_LINES, PAUSE, PITCH_LINES, TUTORIAL,
} from "../../content/texts";
import { dogName } from "../../data/dogs";
import { SOUVENIR_DEFS } from "../../data/souvenirs";
import { UPGRADE_DEFS } from "../../data/upgrades";
import { souvenirSlots, dogSlots } from "../../tour/ledger";
import {
  buyFuel, buySouvenir, buyUpgrade, dogOffer, fuelOffer, garageOffer, marketOffer, takeDog,
} from "../../tour/shops";
import { currentNode, currentRegion, placeName } from "../../tour/util";
import { SCREENS, go, leaveStation, persist, type Session } from "./session";
import { startFreeProblem } from "./puzzles";
import { fillLine, itemIcon, mainButton, nowLine, paperText, pickFor, scenery, soundLoop, stationPlate, topBar } from "./common";

function leave(app: App, s: Session) {
  leaveStation(s);
  go(app, s);
}

/** A card with an item icon, name, text and a buy/take button; returns true on click. */
function offerCard(g: Gfx, a: App, id: string, x: number, y: number, w: number, icon: string, name: string, text: string, button: string, opts: { disabled?: boolean; reason?: string; owned?: boolean } = {}): boolean {
  const h = 236;
  g.panel(x, y, w, h, "paper");
  itemIcon(g, icon, x + w / 2, y + 40, { label: name, dim: opts.owned });
  g.text(name, x + w / 2, y + 72, { font: "head", align: "center", color: P.ink1 });
  para(g, text, x + 14, y + 100, w - 28, { font: "body", color: P.ink2, shadow: null, align: "center" });
  if (opts.reason) g.text(opts.reason, x + w / 2, y + h - 84, { font: "body", align: "center", color: P.brick1 });
  return a.ui.button(id, x + 14, y + h - 58, w - 28, 44, button, { variant: opts.disabled ? "normal" : "go", disabled: opts.disabled });
}

/** Choose one of several things to give up (full slots): an overlay with one button per candidate. */
function chooseOverlay<T extends string>(title: string, text: string, items: { id: T; name: string; icon: string }[], onPick: (id: T) => void): Scene {
  const scene: Scene = {
    overlay: true,
    draw(g, a) {
      const h = 170 + Math.ceil(items.length / 2) * 64;
      const { x, y, w } = dialog(g, 640, h, "paper");
      g.text(title, x + 24, y + 14, { font: "big", color: P.ink1 });
      para(g, text, x + 24, y + 54, w - 48, { color: P.ink2, shadow: null });
      items.forEach((it, i) => {
        const bx = x + 24 + (i % 2) * 300;
        const by = y + 96 + Math.floor(i / 2) * 64;
        if (a.ui.button(`ch-${it.id}`, bx, by, 288, 52, it.name, { align: "left", icon: undefined })) {
          a.scenes.remove(scene);
          onPick(it.id);
        }
        itemIcon(g, it.icon, bx + 262, by + 26);
      });
      if (a.ui.button("ch-cancel", x + w - 164, y + h - 58, 140, 44, "Doch nicht", { hotkey: "Escape" })) a.scenes.remove(scene);
    },
  };
  return scene;
}

// ─── Stellplatz ───────────────────────────────────────────────────────────────────────────────────────────

function createPitch(app: App, s: Session): Scene {
  const t = s.tour;
  const region = currentRegion(t);
  const rainy = hashString(`${t.seed}|${t.at}|rain`) % 4 === 0;
  const night = soundLoop(rainy ? "rain" : "crickets", 0.8);
  const line = pickFor(s, [...PITCH_LINES.arrive, ...PITCH_LINES.byRegion[region]], "pitch");
  const refuel = pickFor(s, PITCH_LINES.refuel, "refuel");
  const pauseLine = pickFor(s, PAUSE.lines, "pause");
  const idx = t.route.findIndex((r) => r.node === t.at && r.kind === "pitch" && r.line.startsWith("Stellplatz"));
  const gained = idx > 0 ? t.route[idx].fuel - t.route[idx - 1].fuel : 0;
  const awning = t.upgrades.includes("awning") && !!t.station?.puzzle;
  return {
    enter() {
      void music.play("stellplatz");
      night.start();
    },
    exit: () => night.stop(),
    draw(g, a) {
      scenery(g, `bg/pitch-${region}`, "night");
      topBar(g, a, s);
      stationPlate(g, "Stellplatz", placeName(s.env.pack, currentNode(t).place));
      let y = 140;
      y += paperText(g, line, 150, y, 660) + 10;
      y += paperText(g, gained > 0 ? `${refuel} Getankt: ${gained === 1 ? "ein Strich" : `${gained} Striche`} Sprit.` : "Der Tank war schon voll.", 150, y, 660) + 10;
      if (t.tutorial) y += paperText(g, TUTORIAL.steps.pitch.join(" "), 150, y, 660, { font: "body" }) + 10;
      y += paperText(g, `${PAUSE.question} ${pauseLine} ${PAUSE.text}`, 150, y, 660, { font: "body" }) + 10;
      if (awning && a.ui.button("pitch-problem", 150, y + 4, 330, 46, "Stammtisch-Aufgabe (gratis)", { sub: "Die Markise ist ausgefahren" })) {
        startFreeProblem(app, s);
      }
      nowLine(g, "Was jetzt? Weiter, oder Feierabend?", 470);
      if (a.ui.button("pitch-stop", 500, 486, 230, 46, PAUSE.stop)) {
        persist(s);
        goHome(app);
      }
      if (mainButton(a, "pitch-go", PAUSE.stay)) leave(app, s);
    },
  };
}

// ─── Hundewiese ───────────────────────────────────────────────────────────────────────────────────────────

function createDogMeadow(app: App, s: Session): Scene {
  const t = s.tour;
  const line = pickFor(s, DOG_MEADOW_LINES, "meadow");
  let note = "";
  const take = (id: DogId, swapOut?: DogId) => {
    const r = takeDog(t, s.env, id, swapOut);
    if (r.ok) {
      sfx.play("dog-bark-big");
      note = r.line ?? "";
      persist(s);
    } else if (r.needsReplace) {
      app.scenes.push(chooseOverlay("Wer fährt heim?", `Es ist kein Platz mehr frei. Wer darf heimfahren, damit ${dogName(s.env.profile, id)} mitkommt?`,
        t.dogs.map((d) => ({ id: d, name: dogName(s.env.profile, d), icon: d })), (d) => take(id, d)));
    } else note = r.reason ?? "";
  };
  return {
    enter() {
      void music.play("stellplatz");
    },
    draw(g, a) {
      scenery(g, "bg/dogs");
      topBar(g, a, s);
      stationPlate(g, "Hundewiese", placeName(s.env.pack, currentNode(t).place));
      paperText(g, line, 150, 140, 660);
      const offer = dogOffer(t, s.env);
      if (!offer.length) {
        paperText(g, t.dogs.length
          ? "Heute ist kein anderer Hund aus dem Tourenbuch auf der Wiese. Deine Hunde toben trotzdem mit."
          : "Heute ist kein Hund aus dem Tourenbuch auf der Wiese.", 150, 218, 660);
      }
      offer.forEach((o, i) => {
        const x = offer.length === 1 ? 330 : 190 + i * 300;
        const full = t.dogs.length >= dogSlots(t);
        const label = o.owned ? "Fährt mit" : full ? "Tauschen" : "Mitnehmen";
        if (offerCard(g, a, `dog-${o.id}`, x, 218, 280, o.id, o.name, o.text, label, { disabled: o.owned, owned: o.owned })) take(o.id);
      });
      if (note) g.text(note, 480, 458, { font: "head", align: "center", color: P.paper4, outline: P.ink0 });
      nowLine(g, offer.length ? "Was jetzt? Nimm einen Hund mit, oder fahr weiter." : "Was jetzt? Klicke auf „Weiterfahren“.");
      if (mainButton(a, "dogs-go", "Weiterfahren")) leave(app, s);
    },
  };
}

// ─── Flohmarkt ────────────────────────────────────────────────────────────────────────────────────────────

function createMarket(app: App, s: Session): Scene {
  const t = s.tour;
  let say = pickFor(s, MARKET_LINES.greet, "greet");
  const buy = (id: SouvenirId, replace?: SouvenirId) => {
    const r = buySouvenir(t, s.env, id, replace);
    if (r.ok) {
      sfx.play("coin");
      say = pickFor(s, MARKET_LINES.sold, `sold-${id}`);
      persist(s);
    } else if (r.needsReplace) {
      app.scenes.push(chooseOverlay("Welches Andenken bleibt da?", `Alle ${souvenirSlots(t)} Plätze sind voll. Welches Andenken legst du dafür auf den Tisch zurück?`,
        t.souvenirs.map((x) => ({ id: x, name: SOUVENIR_DEFS[x].name, icon: x })), (x) => buy(id, x)));
    } else say = fillLine(pickFor(s, MARKET_LINES.tooExpensive, `exp-${id}`), { price: SOUVENIR_DEFS[id].price ?? 0 });
  };
  return {
    enter() {
      void music.play("stellplatz");
    },
    draw(g, a) {
      scenery(g, "bg/market");
      topBar(g, a, s);
      stationPlate(g, "Flohmarkt", placeName(s.env.pack, currentNode(t).place));
      portrait(g, "flohmarkt", 40, 140, 64);
      bubble(g, say, 124, 140, 110, 170, { maxW: 700 });
      const offer = marketOffer(t);
      offer.forEach((o, i) => {
        const x = 40 + i * 300;
        const label = o.owned ? "Gekauft" : `Kaufen: ${o.price} Mark`;
        if (offerCard(g, a, `buy-${o.id}`, x, 216, 280, o.id, o.name, o.text, label, { disabled: o.owned || !o.affordable, owned: o.owned, reason: o.owned ? undefined : o.affordable ? undefined : "Dafür reicht das Geld nicht." })) buy(o.id);
      });
      g.text(`Andenken dabei: ${t.souvenirs.length} von ${souvenirSlots(t)}`, 40, 456, { font: "head", color: C.text, outline: P.ink0 });
      nowLine(g, "Was jetzt? Kauf ein Andenken, oder fahr weiter.");
      if (mainButton(a, "market-go", "Weiterfahren")) leave(app, s);
    },
  };
}

// ─── Werkstatt ────────────────────────────────────────────────────────────────────────────────────────────

function createGarage(app: App, s: Session): Scene {
  const t = s.tour;
  const banter = GARAGE_LINES.banter[hashString(`${t.seed}|${t.at}|banter`) % GARAGE_LINES.banter.length];
  let meister = `${pickFor(s, GARAGE_LINES.greet, "greet")} ${banter.meister}`;
  let lehrling: string = banter.lehrling;
  const upgrade = (id: UpgradeId) => {
    const r = buyUpgrade(t, s.env, id);
    if (r.ok) {
      sfx.play("wrench");
      meister = fillLine(pickFor(s, GARAGE_LINES.upgrade, `up-${id}`), { item: UPGRADE_DEFS[id].name });
      lehrling = "";
      persist(s);
    } else meister = r.reason ?? "";
  };
  return {
    enter() {
      void music.play("stellplatz");
    },
    draw(g, a) {
      scenery(g, "bg/garage", "room");
      topBar(g, a, s);
      stationPlate(g, "Werkstatt", placeName(s.env.pack, currentNode(t).place));
      portrait(g, "meister", 30, 140, 64);
      bubble(g, meister, 112, 140, 98, 170, { maxW: 380 });
      portrait(g, "lehrling", 866, 140, 64);
      if (lehrling) bubble(g, lehrling, 852, 140, 864, 170, { maxW: 320, align: "right" });
      const offer = garageOffer(t);
      offer.forEach((o, i) => {
        const x = 30 + i * 230;
        const label = o.owned ? "Eingebaut" : `${o.price} Mark`;
        if (offerCard(g, a, `up-${o.id}`, x, 226, 216, o.id, o.name, o.text, label, { disabled: o.owned || !o.affordable, owned: o.owned, reason: o.owned || o.affordable ? undefined : "Zu teuer." })) upgrade(o.id);
      });
      if (!offer.length) paperText(g, "Für dieses Fahrzeug hat die Werkstatt heute keinen Ausbau da.", 30, 226, 660);
      // fuel
      const fo = fuelOffer(t);
      const fx = 730;
      g.panel(fx, 226, 210, 236, "paper");
      itemIcon(g, "aux-tank", fx + 105, 266);
      g.text("Sprit", fx + 105, 298, { font: "head", align: "center", color: P.ink1 });
      para(g, `Ein Strich kostet ${fo.price} Mark.`, fx + 14, 326, 182, { font: "body", color: P.ink2, shadow: null, align: "center" });
      const full = t.fuel >= t.fuelMax;
      if (a.ui.button("fuel-1", fx + 14, 404, 182, 44, full ? "Tank ist voll" : "1 Strich tanken", { variant: full || !fo.max ? "normal" : "go", disabled: !fo.max })) {
        const r = buyFuel(t, s.env, 1);
        if (r.ok) {
          sfx.play("fuel");
          meister = pickFor(s, GARAGE_LINES.fuel, `fuel-${t.fuel}`);
          lehrling = "";
          persist(s);
        }
      }
      nowLine(g, "Was jetzt? Bau etwas ein, tank nach, oder fahr weiter.");
      if (mainButton(a, "garage-go", "Weiterfahren")) leave(app, s);
    },
  };
}

SCREENS.pitch = createPitch;
SCREENS.dogs = createDogMeadow;
SCREENS.market = createMarket;
SCREENS.garage = createGarage;
