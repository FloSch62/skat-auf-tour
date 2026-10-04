// A small event deck of the Tour area's own, for tests and for headless runs while src/content/events is still
// being written. It exercises every pool, condition and outcome the runtime knows. Not shown in the game.
import type { EventDef } from "../game/types.ts";

export const FIXTURE_EVENTS: EventDef[] = [
  {
    id: "fx-kehrwoche", pool: "anywhere", title: "Kehrwoche",
    text: "Auf dem Platz in {place} ist Kehrwoche. Die Nachbarin schaut streng, {name}.",
    choices: [
      { text: "Mitkehren.", outcomes: [{ outcome: { text: "Sie spendiert eine Brezel und zwei Mark.", marks: 2 } }] },
      { text: "{dog} bellt die Kehrwoche weg.", req: { dog: "any" }, blue: true, outcomes: [{ outcome: { fuel: 1, text: "Ein Strich aus dem Kanister der Nachbarin." } }] },
      { text: "Weiterfahren.", outcomes: [{ outcome: {} }] },
    ],
  },
  {
    id: "fx-stau", pool: "anywhere", title: "Stau",
    text: "Stau vor {place}. Umleitung über die Dörfer?",
    choices: [
      { text: "Umleitung.", outcomes: [{ weight: 2, outcome: { text: "Gut gegangen." } }, { weight: 1, outcome: { fuel: -1, text: "Verfahren." } }] },
      { text: "Warten.", outcomes: [{ outcome: { marks: [-1, 0], text: "Ein Kaffee an der Raststätte." } }] },
    ],
  },
  {
    id: "fx-hocketse", pool: "anywhere", title: "Hocketse",
    text: "Hocketse in {place}, am Nebentisch fehlt der dritte Mann.",
    choices: [
      {
        text: "Mitspielen.",
        outcomes: [{ outcome: { skat: { opponents: ["maurer", "zocker"], games: 3, stakes: "small", intro: "Na, {title}, setz dich.", onWin: "fx-hocketse-win", onLose: "fx-hocketse-lose" } } }],
      },
      { text: "Lieber nicht.", outcomes: [{ outcome: {} }] },
    ],
  },
  {
    id: "fx-hocketse-win", pool: "chain", title: "Hocketse: gewonnen",
    text: "Die Hocketse feiert dich.",
    choices: [{ text: "Danke.", outcomes: [{ outcome: { marks: 2, chronicle: "Auf der Hocketse in {place} gewonnen." } }] }],
  },
  {
    id: "fx-hocketse-lose", pool: "chain", title: "Hocketse: verloren",
    text: "Nächstes Mal.",
    choices: [{ text: "Weiter.", outcomes: [{ outcome: {} }] }],
  },
  {
    id: "fx-tramper", pool: "anywhere", title: "Tramper mit Schachbrett",
    text: "Ein Tramper hält ein Schachbrett hoch.",
    choices: [
      { text: "Eine Aufgabe lösen.", outcomes: [{ outcome: { puzzle: "chess" } }] },
      { text: "Weiterfahren.", outcomes: [{ outcome: {} }] },
    ],
  },
  {
    id: "fx-partner", pool: "anywhere", title: "Anruf von daheim", requires: { profile: "partner" },
    text: "{partner} ruft aus der gelben Zelle an.",
    choices: [{ text: "Grüße ausrichten.", outcomes: [{ outcome: { chronicle: "{partner} hat angerufen." } }] }],
  },
  {
    id: "fx-flohmarkt", pool: "anywhere", title: "Kofferraum-Flohmarkt", once: true,
    text: "Ein Kofferraum voller Kram.",
    choices: [
      { text: "Kramen (2 Mark).", req: { marks: 2 }, outcomes: [{ outcome: { marks: -2, souvenir: "random" } }] },
      { text: "Weiter.", outcomes: [{ outcome: {} }] },
    ],
  },
  {
    id: "fx-enz-besen", pool: "region", region: "enztal", title: "Der Besen hat offen",
    text: "Am Ortsausgang von {place} hängt der Besen raus.",
    choices: [
      { text: "Einkehren.", outcomes: [{ outcome: { beerMat: "random", text: "Der Wengerter schenkt dir einen Bierdeckel." } }] },
      { text: "Weiter.", outcomes: [{ outcome: {} }] },
    ],
  },
  {
    id: "fx-mue-schafe", pool: "region", region: "muehlacker", title: "Schafherde",
    text: "Eine Schafherde auf der Straße.",
    choices: [
      { text: "{dog} macht den Weg frei.", req: { dog: "shepherd" }, blue: true, outcomes: [{ outcome: { marks: 1, text: "Der Schäfer gibt eine Mark." } }] },
      { text: "Warten.", outcomes: [{ outcome: { fuel: -1 } }] },
    ],
  },
  {
    id: "fx-swa-brennerei", pool: "region", region: "schwarzwald", title: "Brennerei",
    text: "Die Brennerei lädt zur Probe. Gefahren wird erst morgen.",
    choices: [{ text: "Über Nacht bleiben.", outcomes: [{ outcome: { fuel: 1, upgrade: "fridge" } }] }],
  },
  {
    id: "fx-stu-wasen", pool: "region", region: "stuttgart", title: "Wasen",
    text: "Auf dem Wasen ist Volksfest.",
    choices: [{ text: "Eine Runde Riesenrad.", outcomes: [{ outcome: { marks: -1 } }] }],
  },
  {
    id: "fx-bike-rocker", pool: "bike", title: "Mofa-Rocker",
    text: "Mofa-Rocker an der Tankstelle fordern {bike} heraus.",
    choices: [
      { text: "Rennen bis zum Ortsschild.", outcomes: [{ weight: 2, outcome: { marks: 3 } }, { weight: 1, outcome: { fuel: -1 } }] },
      { text: "Abwinken.", outcomes: [{ outcome: {} }] },
    ],
  },
  {
    id: "fx-bike-schrauber", pool: "bike", title: "Benzingespräch",
    text: "Am Treff wird geschraubt.",
    choices: [{ text: "Mitschrauben.", outcomes: [{ outcome: { fuel: 1 } }] }],
  },
  {
    id: "fx-dog-besuch", pool: "dog", title: "Besuch", requires: { dog: "any" },
    text: "{child} kommt mit Hund vorbei.",
    choices: [
      { text: "Mitnehmen.", req: { dogSlot: true }, outcomes: [{ outcome: { dog: "schnauzer-b", unlockDog: "schnauzer-b" } }] },
      { text: "Grüßen.", outcomes: [{ outcome: { unlockDog: "schnauzer-b" } }] },
    ],
  },
  {
    id: "fx-dog-wiese", pool: "dog", title: "Hundewiese", requires: { dog: "any" },
    text: "{dog} tobt über die Wiese.",
    choices: [{ text: "Zuschauen.", outcomes: [{ outcome: { text: "Schön." } }] }],
  },
];
