// Everyone who sits at a Skat table (contract §4.5). Names and sentences belong to the Text area (src/content owns
// the voices in speech.ts), strength and role to Skat/Tour. The playing style itself is a parameter set in
// src/skat/ai/persona.ts, keyed by the same id. `style` is shown to the player (map preview, album, table) and says
// honestly how the figure plays. `habit` is one dry sentence of table humour with no effect on play; drinking is a
// quiet joke at most, never a mechanic (contract §0.9).
import type { CharacterDef } from "../game/types.ts";
import type { CharacterId } from "../game/ids.ts";

export const CHARACTER_DEFS: Record<CharacterId, CharacterDef> = {
  // ── Stammgäste ──
  maurer: {
    id: "maurer", name: "Maurer-Karle", role: "regular", strength: 2, drink: "beer",
    style: "Reizt lieber eins zu wenig, steht aber im Gegenspiel wie eine Wand.",
    habit: "Legt jede Karte so sorgfältig ab, als käme gleich Mörtel drauf.",
  },
  zocker: {
    id: "zocker", name: "der Erwin", role: "regular", strength: 2, drink: "beer",
    style: "Reizt alles aus, was geht, und gern ein Stück darüber.",
    habit: "Erzählt nach jedem verlorenen Spiel von seinem Grand mit vieren im Jahr einundsiebzig.",
  },
  rechnerin: {
    id: "rechnerin", name: "Frau Gerda", role: "regular", strength: 3, drink: "water",
    style: "Zählt jede Karte mit und macht kaum einen Fehler.",
    habit: "Trinkt Sprudel, schreibt die Liste selbst und findet jeden Rechenfehler.",
  },
  nullfuchs: {
    id: "nullfuchs", name: "Null-Eugen", role: "regular", strength: 2, drink: "cider",
    style: "Sucht das Nullspiel, auch wo keins ist.",
    habit: "Grinst am breitesten, wenn er gar nichts auf der Hand hat.",
  },
  grandspieler: {
    id: "grandspieler", name: "Grand-Helmut", role: "regular", strength: 2, drink: "beer",
    style: "Spielt Grand, wo andere Farbe spielen.",
    habit: "Haut jeden Buben so auf den Tisch, dass die Gläser hüpfen.",
  },
  neuling: {
    id: "neuling", name: "der junge Rolf", role: "regular", strength: 1, drink: "spezi",
    style: "Vergisst, die Trümpfe zu zählen, und schmiert zur falschen Zeit.",
    habit: "Hat die Reizwerte auf einen Bierdeckel geschrieben und schaut heimlich drauf.",
  },
  schwaetzer: {
    id: "schwaetzer", name: "Schwätzer-Sigi", role: "regular", strength: 1, drink: "wine",
    style: "Redet ohne Pause, und manchmal verrät sein Spruch das Blatt.",
    habit: "Erzählt zu jeder Karte eine Geschichte, meistens die von seinem Schwager.",
  },
  lehrer: {
    id: "lehrer", name: "Oberlehrer Walter", role: "regular", strength: 2, drink: "wine",
    style: "Spielt streng nach Lehrbuch und ist darum berechenbar.",
    habit: "Korrigiert die Liste mit dem Rotstift, auch wenn sie stimmt.",
  },
  schlitzohr: {
    id: "schlitzohr", name: "’s Schlitzohr Fritz", role: "regular", strength: 3, drink: "schnapps",
    style: "Schneidet riskant und legt gern eine Falle.",
    habit: "Zwinkert bei jedem Stich, auch wenn es gar nichts zu bedeuten hat.",
  },
  kommandant: {
    id: "kommandant", name: "Kommandant Heiner", role: "regular", strength: 2, drink: "beer",
    style: "Der Feuerwehrkommandant spielt schnell und greift sofort an.",
    habit: "Mischt im Takt der Sirenenprobe und gibt Kommandos wie bei der Übung.",
  },
  wirtin: {
    id: "wirtin", name: "die Wirtin Lore", role: "regular", strength: 2, drink: "water",
    style: "Springt ein, wenn einer fehlt, und spielt grundsolide.",
    habit: "Bringt zwischen zwei Stichen eine Halbe an Tisch drei und vergisst trotzdem keine Karte.",
  },
  altmeister: {
    id: "altmeister", name: "der alte Gottlob", role: "regular", strength: 4, drink: "wine",
    style: "Hat früher jeden Preisskat im Tal gewonnen und liest ein Spiel wie die Zeitung.",
    habit: "Bestellt ein Viertele, schweigt eine Stunde und gewinnt dann den Abend.",
  },

  // ── Favoriten für den Preisskat ──
  wengerter: {
    id: "wengerter", name: "Wengerter Hermann", role: "favourite", region: "enztal", strength: 3, drink: "wine",
    style: "Zäh wie ein Rebstock am Roßwager Steilhang: spielt sicher und lässt nichts liegen.",
    habit: "Schaut beim Reizen zum Himmel, als käme gleich ein Hagelschauer.",
  },
  muellerin: {
    id: "muellerin", name: "Müllerin Hedwig", role: "favourite", region: "enztal", strength: 4, drink: "cider",
    style: "Rechnet wie ihr Mühlrad an der Enz: gleichmäßig und ohne Pause.",
    habit: "Klopft beim Nachdenken leise im Takt ihres Mühlrads auf den Tisch.",
  },
  bahner: {
    id: "bahner", name: "Bahner Willi", role: "favourite", region: "muehlacker", strength: 3, drink: "beer",
    style: "Pünktlich wie das Stellwerk in Mühlacker: reizt genau bis zur Kante.",
    habit: "Schaut nach jedem Spiel auf die Taschenuhr: Die Runde hat wieder Verspätung.",
  },
  klosterwirt: {
    id: "klosterwirt", name: "Klosterwirt Eberhard", role: "favourite", region: "muehlacker", strength: 4, drink: "wine",
    style: "Geduldig wie die Klostermauern von Maulbronn und schlägt im letzten Stich zu.",
    habit: "Stellt Maultaschen auf den Tisch, damit der Herrgott nicht so genau hinschaut.",
  },
  floesser: {
    id: "floesser", name: "Flößer Jakob", role: "favourite", region: "schwarzwald", strength: 3, drink: "beer",
    style: "Wagt viel und steuert jedes Blatt sicher durch die Stromschnellen.",
    habit: "Erzählt von den Flößen auf der Enz, als wäre er selbst noch mitgefahren.",
  },
  brenner: {
    id: "brenner", name: "Brenner Ernst", role: "favourite", region: "schwarzwald", strength: 4, drink: "schnapps",
    style: "Spielt so klar wie sein Kirschwasser, ohne einen Tropfen zu verschenken.",
    habit: "Riecht an jeder Karte, als prüfe er einen neuen Jahrgang.",
  },
  wasenwirt: {
    id: "wasenwirt", name: "Wasenwirt Kurt", role: "favourite", region: "stuttgart", strength: 3, drink: "beer",
    style: "Laut wie ein Festzelt auf dem Wasen, aber rechnen kann er.",
    habit: "Sagt jedes Spiel so laut an, dass man es bis zum Riesenrad hört.",
  },
  schaffnerin: {
    id: "schaffnerin", name: "Schaffnerin Inge", role: "favourite", region: "stuttgart", strength: 4, drink: "water",
    style: "Hat dreißig Jahre auf der Straßenbahn kontrolliert: Bei ihr fährt kein Stich schwarz.",
    habit: "Knipst nach jedem Spiel mit ihrer alten Lochzange ein Loch in die Liste.",
  },

  // ── Nebenfiguren ──
  wachtmeister: {
    id: "wachtmeister", name: "Wachtmeister Hägele", role: "side", strength: 2, drink: "water",
    style: "Kontrolliert lieber Stiche als Führerscheine.",
    habit: "Legt die Dienstmütze neben die Karten und sagt, er sei eigentlich gar nicht da.",
  },
  anwaerter: {
    id: "anwaerter", name: "Anwärter Klaus", role: "side", strength: 1, drink: "spezi",
    style: "Lernt noch, beim Skat wie beim Strafzettel.",
    habit: "Schreibt sich jede Regel ins Notizbuch, gleich neben die Strafzettel.",
  },
  "biker-manne": {
    id: "biker-manne", name: "Biker-Manne", role: "side", strength: 2, drink: "beer",
    style: "Gibt Vollgas: reizt hoch und spielt schnell.",
    habit: "Lässt beim Reizen die Lederjacke knarzen wie einen Gasgriff.",
  },
  "biker-uschi": {
    id: "biker-uschi", name: "Biker-Uschi", role: "side", strength: 3, drink: "spezi",
    style: "Kühl wie der Fahrtwind und verliert selten.",
    habit: "Hat Kettenfett an den Fingern und trotzdem immer saubere Karten.",
  },
  meister: {
    id: "meister", name: "Meister Kächele", role: "side", strength: 2, drink: "beer",
    style: "Hat alles schon mal gesehen und sagt: Das gehört so.",
    habit: "Sagt zu jedem Fehler am Tisch: „Des g’hört so.“",
  },
  lehrling: {
    id: "lehrling", name: "Lehrling Bernd", role: "side", strength: 1, drink: "spezi",
    style: "Macht beim Skat dasselbe wie in der Werkstatt: was kaputt.",
    habit: "Hat einmal den ganzen Stapel fallen lassen, und der Meister hat gesagt, das gehört so.",
  },
  // ── Das Duo aus dem Rathaus (contract §0.9, §4.5) ──
  schultes: {
    id: "schultes", name: "Schultes Häfele", role: "side", strength: 2, drink: "wine",
    style: "Hält sich für den besten Skatspieler im Landkreis und reizt, als müsste er es jedem beweisen.",
    habit: "Hält vor jedem Spiel eine kleine Rede und nach jedem verlorenen eine längere.",
  },
  amtsbote: {
    id: "amtsbote", name: "Amtsbote Gottfried", role: "side", strength: 3, drink: "water",
    style: "Wirkt, als könnt er nicht bis drei zählen, und zählt doch jede Karte mit.",
    habit: "Sagt „Jawohl, Herr Schultes“ und spielt dann, was er für richtig hält.",
  },
};

export function characterName(id: CharacterId): string {
  return CHARACTER_DEFS[id]?.name ?? id;
}

/** The name at the start of a sentence: "der Erwin" becomes "Der Erwin" ("’s Schlitzohr Fritz" stays as it is). */
export function characterNameStart(id: CharacterId): string {
  const n = characterName(id);
  return n.charAt(0).toUpperCase() + n.slice(1);
}
