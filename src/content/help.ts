// In-game help (contract §7: Bedienung, Hausregeln, Spielwert-Tabelle, plus Die Tour, Stationen, Sprit und Mark,
// Hunde, Andenken, Bierdeckel). Pages are arrays of short paragraphs for `ui.pager`; the Spielwert table is structured
// data so the help screen can draw it as a table (and the test can check every example adds up).
// Numbers follow contract §4 and §5.1; when Tour or Skat change a value there, change it here too.
import type { HouseRuleId } from "../game/ids.ts";

export type HelpPageId = "controls" | "house-rules" | "game-value" | "list" | "tour" | "stations" | "fuel" | "collection";

export interface HelpPage {
  id: HelpPageId;
  title: string;
  paragraphs: string[];
}

// ─── Hausregeln ────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The house rules as the player reads them (contract §4.4). `short` fits the board above the table, `text` the help
 * page and the notice before the round. Tour may use these for src/data house rule definitions.
 */
export const HOUSE_RULE_TEXTS: Record<HouseRuleId, { name: string; short: string; text: string }> = {
  standard: {
    name: "Nach Skatordnung",
    short: "Keine Abweichung.",
    text: "Gespielt wird genau nach der Skatordnung. Passen alle drei, wird eingepasst: Das Spiel zählt nicht, der Nächste gibt.",
  },
  ramsch: {
    name: "Ramsch",
    short: "Passen alle, wird Ramsch gespielt.",
    text: "Passen alle drei, wird Ramsch gespielt: Nur die Buben sind Trumpf, der Skat geht an den letzten Stich. Wer die meisten Augen hat, bekommt sie als Minuspunkte. Bei Gleichstand verlieren beide, 40, 40, 40 zählt nichts. Ohne Stich (Jungfrau) zählt es doppelt. Alle Stiche (Durchmarsch) bringen 120 Punkte gut.",
  },
  schieberamsch: {
    name: "Schieberamsch",
    short: "Ramsch, und der Skat wird geschoben.",
    text: "Wie Ramsch, aber vorher wandert der Skat reihum: Jeder darf ihn aufnehmen und zwei Karten weitergeben (keine Buben) – oder ihn ungesehen weiterschieben, dann zählt der Ramsch doppelt, auch ein Durchmarsch. Am Tisch heißen die Knöpfe „Skat aufnehmen“ und „Schieben“.",
  },
  kontra: {
    name: "Kontra und Re",
    short: "Kontra verdoppelt, Re vervierfacht.",
    text: "Jeder Gegenspieler darf vor seiner ersten Karte Kontra sagen, dann zählt das Spiel doppelt. Der Alleinspieler darf darauf Re sagen, dann zählt es vierfach.",
  },
  bock: {
    name: "Bockrunde",
    short: "Alle Spiele zählen doppelt.",
    text: "In dieser Runde zählt jedes Spiel doppelt, gewonnen wie verloren.",
  },
  "grand-evening": {
    name: "Grand-Abend",
    short: "Jeder gewonnene Grand +20.",
    text: "Jeder gewonnene Grand bringt 20 Punkte extra in die Liste.",
  },
  "null-evening": {
    name: "Null-Abend",
    short: "Jedes gewonnene Nullspiel +15.",
    text: "Jedes gewonnene Nullspiel bringt 15 Punkte extra in die Liste.",
  },
  "hand-evening": {
    name: "Hand-Abend",
    short: "Jedes gewonnene Handspiel +15.",
    text: "Jedes gewonnene Handspiel bringt 15 Punkte extra in die Liste.",
  },
  sharp: {
    name: "Scharfe Runde",
    short: "Pott und Spritverlust doppelt.",
    text: "Der Pott ist doppelt so groß. Wer Dritter wird, verliert dafür auch doppelt so viel Sprit.",
  },
  "long-round": {
    name: "Lange Runde",
    short: "Sechs Spiele statt drei.",
    text: "Heute wird länger gespielt: sechs Spiele statt drei, jeder gibt zweimal.",
  },
  kitty: {
    name: "Skatkasse",
    short: "Wer ein Spiel verliert, zahlt 1 Mark.",
    text: "Auf dem Tisch steht die Skatkasse. Wer ein Spiel verliert, zahlt 1 Mark hinein. Wer die Runde gewinnt, bekommt die ganze Kasse.",
  },
};

// ─── Spielwert-Tabelle ─────────────────────────────────────────────────────────────────────────────────────

export interface ValueExample {
  /** What was played, as said at the table. */
  game: string;
  /** How it is counted, in words. */
  count: string;
  /** Grundwert. */
  base: number;
  /** Spitzen plus Gewinnstufen (for Null: 1, the fixed value is the base). */
  levels: number;
  /** For a lost game the written value is doubled and negative. */
  lost?: boolean;
  /** Overbid: the game counts as the next multiple of the base that reaches the bid. */
  overbidTo?: number;
  /** The value written in the Liste for this game (before the Seeger-Fabian 50 and 40). */
  value: number;
}

export const GAME_VALUE = {
  title: "Spielwert-Tabelle",
  intro: [
    "Der Spielwert ist Grundwert mal Stufen. Die Stufen sind die Spitzen und die Gewinnstufen.",
    "Mit diesem Wert wird auch gereizt: Man darf nur so hoch reizen, wie das eigene Spiel wert ist.",
  ],
  /** Grundwerte der Farbspiele und des Grand. */
  bases: [
    { kind: "diamonds", name: "Karo", base: 9 },
    { kind: "hearts", name: "Herz", base: 10 },
    { kind: "spades", name: "Pik", base: 11 },
    { kind: "clubs", name: "Kreuz", base: 12 },
    { kind: "grand", name: "Grand", base: 24 },
  ],
  /** Spitzen und Gewinnstufen, je eine Stufe. */
  levels: [
    { name: "Spitzen", text: "mit oder ohne: so viele Trümpfe der Reihe nach vom Kreuz-Buben an fehlen oder da sind. Im Grand zählen nur die Buben, also höchstens vier." },
    { name: "Spiel", text: "eine Stufe für jedes Spiel." },
    { name: "Hand", text: "eine Stufe, wenn ohne Skat gespielt wird." },
    { name: "Schneider", text: "eine Stufe, wenn eine Partei 90 Augen oder mehr hat." },
    { name: "Schneider angesagt", text: "eine Stufe, nur im Handspiel." },
    { name: "Schwarz", text: "eine Stufe, wenn eine Partei alle Stiche macht." },
    { name: "Schwarz angesagt", text: "eine Stufe, nur im Handspiel und mit Schneider angesagt." },
    { name: "Ouvert", text: "eine Stufe. Ein offenes Farbspiel oder ein offener Grand ist immer Hand und Schwarz angesagt." },
  ],
  /** Nullspiele haben feste Werte. */
  nulls: [
    { name: "Null", value: 23 },
    { name: "Null Hand", value: 35 },
    { name: "Null ouvert", value: 46 },
    { name: "Null ouvert Hand", value: 59 },
  ],
  rules: [
    "Ein verlorenes Spiel zählt doppelt und wird abgezogen.",
    "Überreizt: Reicht der Spielwert nicht für das Reizgebot, ist das Spiel verloren. Gezählt wird das kleinste Vielfache des Grundwerts, das das Reizgebot erreicht, und das doppelt.",
    "Der Alleinspieler gewinnt mit 61 Augen. Mit 60 Augen hat er verloren.",
    "Im Gegenspiel ist man Schneider mit 30 Augen oder weniger. Wer als Alleinspieler Schneider ist, verliert eine Stufe mehr.",
    "Kontra verdoppelt, Re vervierfacht, die Bockrunde verdoppelt noch einmal (nur mit diesen Hausregeln).",
  ],
  /** Kartenaugen: Ass 11, Zehn 10, König 4, Dame 3, Bube 2, die anderen nichts. Zusammen 120. */
  cardPoints: [
    { name: "Ass", points: 11 },
    { name: "Zehn", points: 10 },
    { name: "König", points: 4 },
    { name: "Dame", points: 3 },
    { name: "Bube", points: 2 },
    { name: "Neun, Acht, Sieben", points: 0 },
  ],
  /** Die Reizwerte der Reihe nach (bis 60; höher geht es bis 264). */
  bids: [18, 20, 22, 23, 24, 27, 30, 33, 35, 36, 40, 44, 45, 46, 48, 50, 54, 55, 59, 60],
  examples: [
    { game: "Karo ohne einen", count: "ohne 1, Spiel 2", base: 9, levels: 2, value: 18 },
    { game: "Herz mit zwei", count: "mit 2, Spiel 3", base: 10, levels: 3, value: 30 },
    { game: "Kreuz mit einem, Hand", count: "mit 1, Spiel 2, Hand 3", base: 12, levels: 3, value: 36 },
    { game: "Pik ohne drei, Schneider", count: "ohne 3, Spiel 4, Schneider 5", base: 11, levels: 5, value: 55 },
    { game: "Grand mit zwei", count: "mit 2, Spiel 3", base: 24, levels: 3, value: 72 },
    { game: "Grand ohne vier, Hand, Schneider", count: "ohne 4, Spiel 5, Hand 6, Schneider 7", base: 24, levels: 7, value: 168 },
    { game: "Kreuz mit zwei, verloren", count: "mit 2, Spiel 3, macht 36, verloren doppelt", base: 12, levels: 3, lost: true, value: -72 },
    { game: "Herz mit einem, gereizt bis 33", count: "mit 1, Spiel 2 = 20 reicht nicht für 33. Nächstes Vielfaches von 10: 40, doppelt", base: 10, levels: 2, lost: true, overbidTo: 40, value: -80 },
    { game: "Null ouvert", count: "fester Wert", base: 46, levels: 1, value: 46 },
    { game: "Null Hand, verloren", count: "35, verloren doppelt", base: 35, levels: 1, lost: true, value: -70 },
  ] satisfies ValueExample[],
} as const;

/** The Liste: extended Seeger-Fabian at the three-player table (contract §4.3). */
export const LIST_RULES = {
  title: "Die Liste",
  wonBonus: 50,
  lostFactor: -2,
  lostMalus: -50,
  defenceBonus: 40,
  paragraphs: [
    "Gewonnenes Spiel: Spielwert plus 50 Punkte.",
    "Verlorenes Spiel: doppelter Spielwert minus, und noch einmal 50 ab.",
    "Verliert der Alleinspieler, schreiben sich die beiden Gegenspieler je 40 Punkte gut.",
    "Beim Ramsch bekommt der Verlierer seine Augen als Minuspunkte.",
    "Wer am Ende der Runde die meisten Punkte hat, ist Erster. Bei Gleichstand gewinnt der Spieler.",
  ],
  examples: [
    { text: "Grand mit zwei gewonnen: 72 + 50 = 122 Punkte.", value: 72, won: true, list: 122 },
    { text: "Herz ohne einen verloren: 20 doppelt = 40 minus, dazu 50 ab, macht minus 90. Die Gegenspieler bekommen je 40.", value: 20, won: false, list: -90 },
  ],
} as const;

// ─── Pages ─────────────────────────────────────────────────────────────────────────────────────────────────

export const HELP_PAGES: HelpPage[] = [
  {
    id: "controls",
    title: "Bedienung",
    paragraphs: [
      "Alles geht mit der linken Maustaste. Einmal klicken genügt, nichts muss gezogen werden.",
      "Über deiner Hand steht immer ein Satz: „Was jetzt?“. Er sagt, was als Nächstes zu tun ist.",
      "Niemand drängelt. Die Stammgäste warten, bis du so weit bist.",
      "Reizen: Klicke auf den großen Knopf mit der Zahl, um sie zu sagen, oder auf „Passe“. Wirst du gereizt, heißen die Knöpfe „Ja“ und „Passe“.",
      "Spiel ansagen: Sechs Knöpfe für Karo, Herz, Pik, Kreuz, Grand und Null. Jeder zeigt, was das Spiel wert ist und ob es für dein Reizgebot reicht.",
      "Drücken: Klicke zwei Karten an, die in den Skat sollen. Bis du auf „Drücken“ klickst, kannst du es dir anders überlegen.",
      "Ausspielen: Der erste Klick hebt die Karte, der zweite spielt sie. In den Einstellungen geht es auch mit einem Klick.",
      "Rechts unten liegen „Letzter Stich“ und „Liste“. Ein Klick zeigt sie, noch ein Klick legt sie wieder weg.",
      "Sudoku: Klicke ein leeres Feld an und dann unten eine Ziffer. Schach: Klicke eine Figur an, dann das Feld, auf das sie ziehen soll.",
      "Das Spiel speichert nach jeder Station und nach jedem Skatspiel von selbst. Am Küchentisch geht es mit „Tour fortsetzen“ weiter.",
    ],
  },
  {
    id: "house-rules",
    title: "Hausregeln",
    paragraphs: [
      "Jedes Wirtshaus hat seine Hausregel. Sie steht vor der Runde auf dem Bildschirm und oben auf der Tafel am Tisch.",
      ...(Object.values(HOUSE_RULE_TEXTS).map((r) => `${r.name}: ${r.text}`)),
    ],
  },
  {
    id: "game-value",
    title: "Spielwert",
    paragraphs: [
      ...GAME_VALUE.intro,
      "Grundwerte: Karo 9, Herz 10, Pik 11, Kreuz 12, Grand 24.",
      "Stufen: Spitzen (mit oder ohne), Spiel, Hand, Schneider, Schneider angesagt, Schwarz, Schwarz angesagt, Ouvert. Jede zählt eins.",
      "Nullspiele haben feste Werte: Null 23, Null Hand 35, Null ouvert 46, Null ouvert Hand 59.",
      ...GAME_VALUE.rules,
      "Beispiel: Grand mit zwei. Mit 2, Spiel 3. Drei mal 24 macht 72.",
    ],
  },
  {
    id: "list",
    title: "Die Liste",
    paragraphs: [...LIST_RULES.paragraphs, ...LIST_RULES.examples.map((e) => e.text)],
  },
  {
    id: "tour",
    title: "Die Tour",
    paragraphs: [
      "Eine Tour führt durch drei Regionen. Die erste ist immer die Heimat, die anderen beiden suchst du dir unterwegs aus.",
      "Jede Region ist eine Karte wie im alten Autoatlas. Die Straßen führen nach vorn, von Station zu Station.",
      "Am Ende jeder Region wartet ein Preisskat gegen die zwei Besten der Gegend. Wer gewinnt, bekommt den Pokal der Region.",
      "Der dritte Preisskat geht um den Wanderpokal. Gewinnst du ihn, ist die Tour gewonnen.",
      "Ist der Tank leer, geht es heim: Heimfahrt am Haken. Das ist nicht schlimm. Was du erlebt hast, bleibt im Tourenbuch.",
      "Mit dem Motorrad kannst du einen Abstecher machen: zu einer Station in der nächsten Spalte, zu der keine Straße führt. Das kostet einen Strich Sprit.",
      "Vor der Tour wählst du, wie streng es zugeht: Gemütlich, Sportlich oder Scharf.",
    ],
  },
  {
    id: "stations",
    title: "Stationen",
    paragraphs: [
      "Wirtshaus: drei Spiele Skat gegen zwei Stammgäste, mit Hausregel. Der Erste gewinnt den Pott, der Dritte fährt die anderen heim und verbraucht einen Strich Sprit.",
      "Motorradtreff: eine scharfe Runde Skat mit zwei vom Treff, danach ein Gespräch über Maschinen.",
      "Stammtisch-Aufgabe: eine Skataufgabe zum Knobeln, drei Versuche. Wer sie gleich löst, bekommt am meisten.",
      "Schachbrett: eine Schachaufgabe im Park, drei Versuche.",
      "Kiosk: das Sudoku aus dem Lokalblatt, klein oder groß. Weglegen kostet nichts.",
      "Stellplatz: tanken, ausruhen, und wer mag, hört hier für heute auf.",
      "Hundewiese: einen Hund mitnehmen oder tauschen.",
      "Flohmarkt: drei Andenken zur Auswahl.",
      "Werkstatt: Ausbauten fürs Wohnmobil und Sprit gegen Mark.",
      "Unterwegs: Es passiert etwas. Du entscheidest, wie es weitergeht.",
      "Preisskat: das Finale der Region, sechs Spiele, ohne Schnickschnack.",
    ],
  },
  {
    id: "fuel",
    title: "Sprit und Mark",
    paragraphs: [
      "Der Tank hat fünf Striche, wenn du losfährst. Fahren auf der Straße kostet nichts.",
      "Sprit kostet: der dritte Platz im Wirtshaus, ein Preisskat ohne Sieg, ein Abstecher und manches unterwegs.",
      "Sprit gibt es am Stellplatz (zwei Striche), für ein gelöstes Sudoku und in der Werkstatt (3 Mark je Strich).",
      "Du startest mit 10 Mark. Mark gibt es für den Pott im Wirtshaus, für gelöste Aufgaben, Schach und den Preisskat.",
      "Mark brauchst du für den Flohmarkt, die Werkstatt und manches unterwegs.",
    ],
  },
  {
    id: "collection",
    title: "Hunde, Andenken, Bierdeckel",
    paragraphs: [
      "Hunde: Höchstens zwei fahren mit. Jeder kann etwas: Der Schäferhund passt auf, der Airedale lässt nicht locker, der Riesenschnauzer hat eine feine Nase. Neue Hunde schaltest du unterwegs frei.",
      "Andenken gibt es auf dem Flohmarkt für 2 bis 6 Mark. Vier passen ins Wohnmobil. Jedes hilft ein bisschen, zum Beispiel die Lesebrille, die zeigt, welche Trümpfe gefallen sind.",
      "Bierdeckel bekommst du nach einem gewonnenen Preisskat, selten auch unterwegs. Auf jedem steht eine Sonderregel für den Rest der Tour, etwa 20 Punkte extra für jeden gewonnenen Grand. Drei haben Platz.",
      "Ausbauten gibt es in der Werkstatt für 6 bis 12 Mark: Zusatztank, Dachbox, Hundebett, Markise, Kühlschrank, Autoradio und ein Beiwagen fürs Motorrad.",
      "Alles, was hilft, steht offen auf dem Tisch. Die Karten werden nie gezinkt: Jedes Blatt kommt aus dem Zufall, und keiner schaut in fremde Karten.",
    ],
  },
];
