// The village duo in events (contract §0.9, §4.5): Schultes Häfele, the vain mayor, and Amtsbote Gottfried, his
// clerk, who takes everything literally and outwits him. Every village has a Schultes, so these are "anywhere"
// events. This is an extra deck on top of the Alpha quota of contract §4.10 (108 = 4 × 16 + 20 + 12 + 12): the
// content test counts it separately (EXTRA_DECKS in index.ts).
import type { EventDef } from "../../game/types.ts";

export const RATHAUS_EVENTS: EventDef[] = [
  // ─── Die Einweihung ────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "rat-einweihung", pool: "anywhere",
    title: "Die Einweihung", art: "rathaus", portrait: "schultes", speaker: "Schultes Häfele",
    text: "In {place} wird ein neues Bushäusle eingeweiht, mit Band und Blasmusik. Schultes Häfele steht auf einem Bierkasten. „Gottfried, wenn ich ‚Hiermit‘ sag, schneidet Se das Band durch.“ Dann holt er Luft für eine lange Rede. Dein Wohnmobil steht genau vor dem Bushäusle.",
    choices: [
      {
        text: "Das Wohnmobil schnell wegfahren.",
        outcomes: [{ outcome: {
          text: "Der Schultes baut dich sofort in die Rede ein: „… und hiermit danke ich dem Bürger, der Platz macht.“ SCHNIPP, macht die Schere. Der Amtsbote hat ‚hiermit‘ gehört. Das Band ist durch, die Rede noch lange nicht.",
          chronicle: "In {place} ein Bushäusle eingeweiht. Mit dem Amtsboten und zu früh.",
        } }],
      },
      {
        text: "Stehen bleiben und zuhören.",
        outcomes: [{ outcome: {
          text: "„Hiermit begrüße ich …“, ZACK, das Band ist durch. „Hiermit eröffne ich …“, der Amtsbote schneidet schon die Girlande. Bei ‚Hiermit schließe ich‘ ist nichts mehr übrig. Der Amtsbote drückt dir eine Brezel in die Hand: „Die war für die Ehrengäste. Es sind koine komme.“",
        } }],
      },
      {
        text: "Die Markise ausfahren, es fängt an zu regnen.",
        req: { upgrade: "awning" }, blue: true,
        outcomes: [{ outcome: {
          text: "Unter deiner Markise drängen sich Blasmusik, Gemeinderat und Schultes. Das neue Bushäusle bleibt leer: Es hat noch kein Dach. „Steht so im Haushalt“, sagt der Amtsbote. Der Schultes zahlt dir drei Mark Platzmiete aus der Vereinskasse.",
          marks: 3,
          chronicle: "In {place} die Einweihung eines Bushäusles unter der eigenen Markise gerettet.",
        } }],
      },
    ],
  },

  // ─── Das Parkverbot ────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "rat-parkverbot", pool: "anywhere",
    title: "Das Parkverbot", art: "rathaus", portrait: "schultes", speaker: "Schultes Häfele",
    text: "Kaum stehst du vor dem Rathaus von {place}, kommt Schultes Häfele die Treppe herunter. „Hier ist Parken verboten! Das hab ich gestern verfügt.“ Hinter ihm räuspert sich Amtsbote Gottfried. „Des Schild liegt aber noch im Bauhof, Herr Schultes.“",
    choices: [
      {
        text: "Das Verwarnungsgeld zahlen, zwei Mark.",
        req: { marks: 2 },
        outcomes: [{ outcome: {
          text: "Der Schultes quittiert mit großer Unterschrift. Der Amtsbote stempelt, schaut auf den Stempel und sagt: „Der isch vom Standesamt. Jetzt send Sie verheiratet. Mit der Gemeinde.“ Die zwei Mark sind trotzdem weg.",
          marks: -2,
          chronicle: "In {place} versehentlich mit der Gemeinde verheiratet worden.",
        } }],
      },
      {
        text: "Nach der Rechtsgrundlage fragen.",
        outcomes: [{ outcome: {
          text: "Der Amtsbote holt die Gemeindesatzung und liest vor. Wer dort parkt, wo das Schild nicht hängt, parkt richtig. Und vor dem Rathaus parkt seit Jahren einer falsch: der Dienstwagen. „Das ist eine Ausnahme“, sagt der Schultes. „Jawohl“, sagt der Amtsbote. „Für alle.“",
        } }],
      },
      {
        text: "Mit der Lesebrille das Kleingedruckte lesen.",
        req: { souvenir: "reading-glasses" }, blue: true,
        outcomes: [{ outcome: {
          text: "Ganz unten, in winziger Schrift: Gäste der Gemeinde parken frei und bekommen einen Gutschein für die Tankstelle. Der Schultes erinnert sich nicht, das geschrieben zu haben. Der Amtsbote schon. Ein Strich Sprit.",
          fuel: 1,
          chronicle: "In {place} das Kleingedruckte der Gemeindesatzung gelesen. Hat sich gelohnt.",
        } }],
      },
    ],
  },

  // ─── Der Bürgermeister-Pokal (special Skat round against both) ─────────────────────────────────────────────
  {
    id: "rat-pokal", pool: "anywhere",
    title: "Der Bürgermeister-Pokal", art: "rathaus", portrait: "schultes", speaker: "Schultes Häfele",
    text: "Im Ratssaal von {place} wird um den Bürgermeister-Pokal gespielt. Schultes Häfele hat ihn neunmal gewonnen. „Ich richte das Turnier aus, ich stifte den Pokal, und ich bin die Jury.“ Amtsbote Gottfried poliert den Pokal. „Zum zehnten Mal“, sagt er. „Bis jetzt.“",
    choices: [
      {
        text: "„Ich spiel mit. Wer gibt?“",
        outcomes: [{ outcome: {
          text: "Der Schultes hält eine Eröffnungsrede, der Amtsbote mischt währenddessen schon. Als die Rede zu Ende ist, liegen die Karten verteilt.",
          skat: {
            opponents: ["schultes", "amtsbote"], houseRule: "kontra", stakes: "medium",
            intro: "Im Ratssaal gilt Kontra und Re. „Auf Amtsdeutsch: Widerspruch“, sagt der Amtsbote.",
          },
          chronicle: "In {place} um den Bürgermeister-Pokal gespielt, gegen den Schultes und seinen Amtsboten.",
        } }],
      },
      {
        text: "„Den Pokal will ich Ihnen nicht wegnehmen.“",
        outcomes: [{ outcome: {
          text: "Der Schultes ist gerührt und überreicht dir zwei Mark als Anerkennung für sportliche Haltung. Der Amtsbote flüstert: „Den Pokal hat er sich letztes Jahr au selber überreicht. Mit Rede.“",
          marks: 2,
        } }],
      },
      {
        text: "Den Stammtischwimpel an die Ratstafel hängen.",
        req: { souvenir: "pennant" }, blue: true,
        outcomes: [{ outcome: {
          text: "Der Schultes erklärt das Turnier sofort zur Ehrenrunde, mit Bock auf alle Spiele. Der Amtsbote schreibt es ins Protokoll und darunter: „Auf Wunsch eines Wimpels.“",
          skat: {
            opponents: ["schultes", "amtsbote"], houseRule: "bock", stakes: "medium",
            intro: "Ehrenrunde im Ratssaal: Alle Spiele zählen doppelt. Der Schultes hält eine Rede darüber, der Amtsbote mischt.",
          },
          chronicle: "In {place} eine Ehrenrunde um den Bürgermeister-Pokal ausgelöst.",
        } }],
      },
    ],
  },

  // ─── Der Ehrengast ─────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "rat-ehrengast", pool: "anywhere",
    title: "Der Ehrengast", art: "rathaus", portrait: "amtsbote", speaker: "Amtsbote Gottfried",
    text: "Vor dem Rathaus von {place} liegt ein roter Teppich, und als du anhältst, spielt die Blasmusik einen Tusch. Schultes Häfele eilt herbei: „Herr Landrat! Welche Ehre!“ Amtsbote Gottfried schaut dein Wohnmobil an und sagt leise: „Der Landrat fährt koi Wohnmobil, Herr Schultes.“",
    choices: [
      {
        text: "Mitspielen: „Ich überbringe die Grüße aus {home}.“",
        outcomes: [{ outcome: {
          text: "Du bekommst eine Ehrenbrezel, eine Urkunde und einen Händedruck für das Lokalblatt. Erst beim Foto fällt dem Schultes auf, dass der Landrat einen Bart hat. „Den hat er sich abrasiert“, sagt der Amtsbote ernst. Die zwei Mark Reisekostenzuschuss darfst du behalten.",
          marks: 2,
          chronicle: "In {place} als Landrat empfangen worden. Mit Ehrenbrezel.",
        } }],
      },
      {
        text: "„Ich bin nur auf der Durchreise.“",
        outcomes: [{ outcome: {
          text: "„Hab i doch gsagt“, sagt der Amtsbote. Der Schultes fasst sich schnell: „Dann sind Sie eben Ehrengast zweiter Klasse.“ Für die zweite Klasse gibt es eine halbe Ehrenbrezel. Die andere Hälfte isst der Amtsbote.",
        } }],
      },
      {
        text: "{dog} marschiert vorneweg über den Teppich.",
        req: { dog: "any" }, blue: true,
        outcomes: [{ outcome: {
          text: "Der Fotograf vom Lokalblatt ist begeistert. Am nächsten Tag steht auf der Titelseite „Hoher Besuch im Rathaus“, darunter ein Foto von {dog}. Der Schultes ist am Rand zu sehen, halb. Der Amtsbote schneidet den Artikel aus und schenkt ihn dir, mit drei Mark aus der Portokasse.",
          marks: 3,
          chronicle: "In {place} hat {dog} den roten Teppich vor dem Rathaus abgeschritten.",
        } }],
      },
    ],
  },
];

/** This deck sets and reads no flags. */
export const RATHAUS_FLAGS: Record<string, string> = {};
