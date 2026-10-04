// Fixed German strings that are not tied to one screen: station flavour, inn and Preisskat lines, homecoming, the
// kitchen, the Tourenbuch, the first start, the guided first trip and the credits (contract §2, §4, §7).
// The UI speaks Hochdeutsch; people (Meister and Lehrling, the flea market seller, the partner) speak with a light
// Swabian colour. Drinking is a quiet joke at most (contract §0.9).
//
// Placeholders (filled by the screens; each group below says which it uses):
//   {name}    player name                        {title}   "Lehrling" before the first trophy, "Meister" after
//   {place}   current place name                 {home}    home place name
//   {inn}     inn name ("Gasthaus Krone")        {region}  region title ("Unteres Enztal")
//   {pot}     Mark won as pot                    {item}    an item name ("Thermoskanne")
//   {price}   a price in Mark                    {partner} partner name (only KITCHEN.partner*, only with a partner)
//   {rank}    Tourenbuch rank                    {count}   a number
import type { DrinkId, RegionId } from "../game/ids.ts";

/** Pick one line by a seed or counter (the screens use their Rng; this is a convenience for tests and fallbacks). */
export function pickLine(lines: readonly string[], n: number): string {
  return lines[((n % lines.length) + lines.length) % lines.length] ?? "";
}

/** Replace {key} placeholders; unknown keys stay visible so a test or a look at the screen finds them. */
export function fillText(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{([a-z]+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}

// ─── Erster Start (contract §4.1) ──────────────────────────────────────────────────────────────────────────

export const FIRST_START = {
  nameQuestion: "Wie heißt du?",
  nameHint: "Tippe deinen Namen oder klicke die Buchstaben an. Höchstens zwölf Zeichen.",
  nameOk: "So heiß ich",
  nameDelete: "Löschen",
  drinkQuestion: "Was trinkst du?",
  drinkHint: "Das Glas steht dann am Tisch vor dir. Mehr hat es nicht zu bedeuten.",
  drinks: {
    beer: { name: "Halbe", line: "Eine Halbe, wie sich’s gehört." },
    weizen: { name: "Weizen", line: "Ein Weizen, schön eingeschenkt." },
    wine: { name: "Viertele", line: "Ein Viertele im Henkelglas, wie sich’s gehört." },
    cider: { name: "Most", line: "Most aus dem Krug, vom eigenen Stückle." },
    spezi: { name: "Spezi", line: "Ein Spezi. Wer fährt, bleibt klar im Kopf." },
  } satisfies Record<DrinkId, { name: string; line: string }>,
  welcome: "Grüß Gott, {name}. Das Tourenbuch liegt bereit.",
  changeLater: "Name und Getränk lassen sich jederzeit in den Einstellungen ändern.",
} as const;

// ─── Daheim: die Küche (contract §2) ───────────────────────────────────────────────────────────────────────

export const KITCHEN = {
  /** Speaker label for the partner lines. */
  speaker: "{partner}",
  /** Said when he leaves for a tour (only with a partner in the profile). */
  partnerGoodbye: [
    "Fahr vorsichtig, {name}. Und ruf an, wenn du angekommen bist.",
    "Hast du die Brezeln eingepackt? Und die Karten? Dann ab mit dir.",
    "Bring mir was Schönes mit. Einen Pokal zum Beispiel.",
    "Und denk dran: Wer fährt, trinkt Spezi.",
    "Grüß mir die Stammtische. Und lass dich nicht über den Tisch ziehen.",
    "Der Hund hat schon gemerkt, dass es losgeht. Der sitzt längst im Wohnmobil.",
  ],
  /** Said when he comes home (only with a partner in the profile). */
  partnerWelcome: [
    "Da bist du ja wieder. Erzähl, wer hat gewonnen?",
    "Grüß dich, {name}. Der Kaffee ist gleich durch.",
    "Na, Weltmeister? Gibt’s was Neues fürs Regal?",
    "Du riechst nach Wirtsstube. Erzähl beim Vesper.",
    "Schön, dass du wieder da bist. Der Hund hat jeden Abend am Fenster gewartet.",
  ],
  /** Kitchen moments without a partner (always usable). */
  ambience: [
    "Der Kaffee ist durch. Das Tourenbuch liegt offen auf dem Tisch.",
    "Draußen steht das Wohnmobil, das Motorrad auf dem Heckträger. Die Schlüssel hängen am Haken.",
    "Der Hund hebt im Korb den Kopf und klopft mit dem Schwanz auf den Boden.",
    "Auf dem Kalender ist der nächste Preisskat rot eingekringelt.",
    "Das Radio spielt leise. Im Atlas steckt noch der Bierdeckel von der letzten Tour als Lesezeichen.",
  ],
  /** Coming home without a partner. */
  welcomeAlone: [
    "Daheim. Die Küche riecht nach Kaffee von gestern. Schön ist es trotzdem.",
    "Die Schlüssel kommen an den Haken, das Tourenbuch auf den Tisch.",
    "Der Hund läuft dreimal durch alle Zimmer und legt sich dann in seinen Korb.",
  ],
} as const;

// ─── Neue Tour, Regionswahl, Pause ─────────────────────────────────────────────────────────────────────────

/** One sentence per region for the Regionswahl and the start of a stage. */
export const REGION_BLURBS: Record<RegionId, string> = {
  enztal: "Enzschleifen, Steillagen und Besenwirtschaften. Der Preisskat ist in Vaihingen an der Enz.",
  muehlacker: "Bahnknoten, Klostermauern und Streuobst am Stromberg. Der Preisskat ist in Mühlacker.",
  schwarzwald: "Tannen, Nebel und Serpentinen. Der Preisskat ist in Neuenbürg.",
  stuttgart: "Stäffele, Straßenbahn und der Wasen. Der Preisskat ist in Bad Cannstatt.",
};

export const REGION_CHOICE = {
  heading: "Wohin geht’s weiter?",
  text: "Zwei Regionen stehen zur Wahl. Der Atlas liegt aufgeschlagen auf dem Beifahrersitz.",
} as const;

export const PAUSE = {
  question: "Für heute aufhören?",
  text: "Das Spiel merkt sich alles. Am Küchentisch geht es mit „Tour fortsetzen“ genau hier weiter.",
  stay: "Weiterfahren",
  stop: "Für heute aufhören",
  lines: [
    "Die Markise ist ausgefahren, die Grillen zirpen. Ein guter Moment, um Feierabend zu machen.",
    "Morgen ist auch noch ein Tag. Die Stammtische laufen nicht weg.",
    "Das Tourenbuch bekommt ein Lesezeichen. Weiter geht’s, wann du willst.",
  ],
} as const;

// ─── Stationen: Flair (contract §4.2) ──────────────────────────────────────────────────────────────────────

/** Arriving at the pitch (Stellplatz). */
export const PITCH_LINES = {
  arrive: [
    "Der Motor tickt beim Abkühlen. Ein ruhiger Platz, ein Wasserhahn, ein Mülleimer. Mehr braucht’s nicht.",
    "Der Platzwart winkt mit der Zeitung. „Da hinten isch frei, beim Kirschbaum.“",
    "Die Markise geht raus, der Campingstuhl auf. Irgendwo bellt ein Hund zurück.",
    "Die Sonne steht schon tief. Am Nachbarwohnwagen wird ein Kartentisch aufgeklappt.",
    "Tank auf, Klappe zu, Schlüssel ab. Jetzt ist erst mal Ruhe.",
  ],
  byRegion: {
    enztal: [
      "Unten glitzert die Enz in ihrer Schleife, oben stehen die Reben in Reih und Glied.",
      "Vom Weinberg her läutet eine Kirchenglocke den Feierabend ein.",
    ],
    muehlacker: [
      "Am Horizont blinkt der große Sendemast. Irgendwo rumpelt ein Güterzug durch den Bahnknoten.",
      "Hinter dem Platz fängt die Streuobstwiese an. Es riecht nach Äpfeln und frisch gemähtem Gras.",
    ],
    schwarzwald: [
      "Tannen ringsum, und im Tal steigt der Nebel. Die Luft ist so frisch, dass man sie trinken könnte.",
      "Ein Bach rauscht hinter dem Wohnmobil. Nachts wird es hier oben kühl.",
    ],
    stuttgart: [
      "Ein Stellplatz in Stuttgart, eingeklemmt zwischen Hang und Hochhaus. Aber er ist frei.",
      "Von unten hört man die Straßenbahn quietschen, oben leuchtet der Fernsehturm.",
    ],
  } satisfies Record<RegionId, string[]>,
  refuel: [
    "GLUCK, GLUCK. Der Tank nimmt, was er kriegt.",
    "Zwei Striche mehr auf der Anzeige. Das Wohnmobil brummt zufrieden.",
    "Der Tankwart wischt noch schnell die Scheibe. „Gute Fahrt, gell!“",
  ],
} as const;

/** The dog meadow (Hundewiese). */
export const DOG_MEADOW_LINES = [
  "Auf der Wiese toben die Hunde, als gäb’s kein Morgen. Ein Ball fliegt, drei rennen hinterher.",
  "Eine ältere Dame mit Dackel nickt dir zu. „Der Ihre isch aber a Prachtkerle.“",
  "Am Zaun steht ein Hund und schaut, als ob er schon lange auf dich gewartet hätte.",
  "WUFF. Einer gibt den Ton an, die anderen machen mit.",
  "Ein Bub wirft Stöckchen, und jeder Hund auf der Wiese fühlt sich gemeint.",
];

/** The flea market seller (moderate Swabian). {item} = item name, {price} = Mark. */
export const MARKET_LINES = {
  greet: [
    "Grüß Gott! Gucken kostet nix, kaufen a bissle was.",
    "Kommet Se näher, des isch alles echt und alles alt!",
    "Heut isch Räumungsverkauf. Des sag i aber jeden Sonntag.",
    "Für Sie mach i an Sonderpreis. Für alle andere au.",
  ],
  praise: [
    "Die {item}? Die hat scho mein Vadder benutzt. Und der hat nie verloren.",
    "A {item}, so was kriegt mr heut gar nimmer.",
    "Die {item} isch fast neu. Nur a bissle gebraucht.",
    "Mit der {item} haben Sie Glück, des garantier i. Schriftlich gibt’s des aber net.",
  ],
  sold: [
    "Ein guter Kauf. Ich pack’s Ihnen in Zeitungspapier.",
    "Des Geld isch gut angelegt, Sie werden’s sehen.",
    "Danke schön, und viel Glück damit am Stammtisch.",
  ],
  leave: [
    "Nix dabei? Nächsten Sonntag hab i wieder ganz anderes. Also fast.",
    "Ade, und erzählen Sie’s weiter!",
    "Dann halt ’s nächste Mal. I lauf ja net weg.",
  ],
  tooExpensive: [
    "Für {price} Mark? Da müsst mr erst noch an Stammtisch, gell?",
    "Des reicht grad net. Aber anschauen derf mr’s trotzdem.",
  ],
} as const;

/** The garage: Meister Kächele and Lehrling Bernd. Banter pairs are shown as two bubbles, Meister first. */
export const GARAGE_LINES = {
  banter: [
    { meister: "Bernd, hol mal den Drehmomentschlüssel.", lehrling: "Welcher isch des, der blaue?" },
    { meister: "Was hat’s denn da grad gscheppert?", lehrling: "Nix, Meister. Des war scho so." },
    { meister: "Bernd, wo isch die Achter-Nuss?", lehrling: "Die hab i dem Hund gegeben. Zum Spielen." },
    { meister: "Des Geräusch? Des g’hört so.", lehrling: "Echt? Dann hab i des gestern au richtig gemacht." },
    { meister: "Erst denken, dann schrauben.", lehrling: "Und wenn i beim Denken schon fertig geschraubt hab?" },
    { meister: "Mit Draht und gutem Zureden hält des noch zehn Jahr.", lehrling: "Soll i mit ihm reden, oder Sie?" },
    { meister: "Bernd, Kaffee.", lehrling: "Mit Milch oder mit Öl?" },
  ],
  greet: [
    "Grüß Gott. Was klappert denn diesmal?",
    "Ah, des Wohnmobil wieder. Stellet Se’s drüben hin, der Bernd guckt’s an. Leider.",
    "Kommet Se rein. Kaffee isch durch, das Werkzeug liegt rum.",
  ],
  upgrade: [
    "Die {item} isch drin. Hält bombenfest. Also fast.",
    "So, {item} eingebaut. Der Bernd hat nur zweimal danebengehauen.",
    "Fertig. Wenn’s quietscht: Des g’hört so.",
  ],
  fuel: [
    "Voll isch er. Fahret Se vorsichtig, der Tank isch schwerer als er aussieht.",
    "GLUCK, GLUCK, GLUCK. So, der hat genug.",
  ],
  leave: [
    "Ade! Und wenn’s raucht, kommet Se wieder.",
    "Gute Fahrt. Und net zu schnell in die Kurve, gell?",
    "Bernd, wink mal. Net mit dem Schraubenschlüssel!",
  ],
} as const;

/** Kiosk with the local paper (Sudoku). */
export const KIOSK_LINES = [
  "Die Kioskfrau schiebt das Lokalblatt über den Tresen. „Die Rätselseite isch heut schwer, sagt mei Mann.“",
  "Zwischen Bonbongläsern und Kreuzworthefte liegt das Lokalblatt. Hinten ist das Zahlenrätsel.",
  "„Bleistift isch umsonst“, sagt die Kioskfrau. „Radiergummi kostet extra. Nur Spaß.“",
];

/** The park with the open-air chessboard. */
export const CHESS_LINES = [
  "Zwei ältere Herren stehen am Freiluftbrett und streiten, wer zuletzt gezogen hat.",
  "Die großen Figuren stehen auf ihren Feldern, als warteten sie nur auf dich.",
  "„Weiß isch dran“, sagt ein Rentner mit Hut. „Und Weiß gewinnt. Wenn mr’s sieht.“",
];

/** Stammtisch-Aufgabe: someone lays out cards on the table. */
export const PROBLEM_LINES = [
  "Am Stammtisch liegen die Karten offen. „Wer’s rausfindet, kriegt was“, sagt der Wirt.",
  "Ein Stammgast legt die Karten hin und verschränkt die Arme. „So. Und jetzt du.“",
  "Auf dem Bierdeckel steht eine Aufgabe, darunter drei Striche. Drei Versuche.",
];

/** Motorradtreff before the round. */
export const BIKERS_LINES = [
  "Auf der Wiese stehen die Maschinen in Reih und Glied. Am Lagerfeuer wird ein Kartentisch freigeräumt.",
  "RÖÖÖHR. Einer lässt zur Begrüßung den Motor laufen. Dann wird gemischt.",
  "Lederjacken, Kaffee aus der Kanne und ein Skatblatt mit Ölfleck. Hier wird scharf gespielt.",
];

// ─── Wirtshaus (contract §4.3) ─────────────────────────────────────────────────────────────────────────────

/** Inn names (contract §2): common names without claiming the house really exists there. */
export const INN_NAMES = [
  "Gasthaus Lamm", "Gasthof Krone", "Gasthaus Ochsen", "Gasthof Adler", "Gasthaus Rössle", "Gasthof Hirsch",
  "Gasthaus Löwen", "Gasthaus Sonne", "Weinstube Traube", "Gasthaus Linde",
];

/**
 * The eight inn interiors (contract §9: public/art/inns/<room>.png). Proposed room ids with fitting names and intro
 * lines. Intro lines use {inn} and {place}.
 */
export const INN_ROOMS: Record<string, { label: string; names: string[]; intro: string[] }> = {
  village: {
    label: "Dorfwirtschaft",
    names: INN_NAMES,
    intro: [
      "{inn} in {place}. Holz an den Wänden, der Kachelofen bollert, am Stammtisch sind zwei Stühle besetzt.",
      "Die Tür klemmt, die Glocke bimmelt, alle drehen sich um. {inn}, {place}.",
      "Im {inn} riecht es nach Bratensoße. Hinten am Stammtisch wird schon gemischt.",
    ],
  },
  besen: {
    label: "Besenwirtschaft",
    names: ["Besen am Weinberg", "Besen beim Wengerter", "Besen im Hof"],
    intro: [
      "Über der Tür hängt der Besen: Es hat offen. Drinnen sitzt man eng auf Holzbänken.",
      "Im Besen in {place} gibt’s Schlachtplatte, Zwiebelkuchen und einen freien Platz am Kartentisch.",
    ],
  },
  clubhouse: {
    label: "Vereinsheim",
    names: ["Vereinsheim vom Sportverein", "Schützenhaus", "Sängerheim"],
    intro: [
      "Im Vereinsheim hängen Wimpel und Mannschaftsfotos. Am Ecktisch wird Skat gespielt, seit es den Verein gibt.",
      "Im Schaukasten stehen Pokale vom Kegeln. Am Kartentisch fehlt einer. Du.",
    ],
  },
  station: {
    label: "Bahnhofsgaststätte",
    names: ["Bahnhofsgaststätte", "Bahnhofswirtschaft"],
    intro: [
      "In der Bahnhofsgaststätte von {place} rattert alle paar Minuten ein Zug vorbei. Die Gläser klirren mit.",
      "Hier wartet man auf den Zug und spielt Skat, bis er kommt. Manche warten seit Jahren.",
    ],
  },
  beergarden: {
    label: "Biergarten",
    names: ["Biergarten am Fluss", "Gartenwirtschaft unter den Kastanien"],
    intro: [
      "Unter den Kastanien stehen die Bierbänke. Auf einem Tisch liegt schon ein Skatblatt, beschwert mit einem Aschenbecher.",
      "Die Gartenwirtschaft in {place}: Kies unter den Füßen, Schatten von oben, Karten auf dem Tisch.",
    ],
  },
  canteen: {
    label: "Kantine",
    names: ["Werkskantine", "Kantine am Werkstor"],
    intro: [
      "Nach der Schicht wird in der Kantine Skat gespielt. Die Henkelmänner stehen noch auf dem Tresen.",
      "Neonlicht, Resopal und Kaffee aus dem Automaten. Hier spielen die, die früh raus müssen.",
    ],
  },
  campsite: {
    label: "Campingkneipe",
    names: ["Campingklause", "Kiosk am Campingplatz"],
    intro: [
      "Die Campingklause hat drei Tische, und an einem wird gespielt. Draußen klappern Wohnwagentüren.",
      "Lauter Leute in Badelatschen und ein Kartentisch. Ein schöner Abend fängt so an.",
    ],
  },
  tent: {
    label: "Festzelt",
    names: ["Festzelt", "Zelt vom Musikverein"],
    intro: [
      "Im Festzelt spielt die Kapelle, am Rand steht ein Kartentisch. Man muss ein bisschen lauter reizen.",
      "Bierbänke, Blasmusik und ein freier Platz bei zwei Stammgästen. Das Fest in {place} ist in vollem Gang.",
    ],
  },
};

/** Before the first game: the house rule is shown with this lead-in, then HOUSE_RULE_TEXTS (help.ts). */
export const INN_RULE_LEAD = "Hier gilt:";

/** Result lines after an inn round. {pot} = Mark won. */
export const INN_RESULT_LINES = {
  first: [
    "Erster! Der Pott gehört dir: {pot} Mark. Die Wirtin stellt dir eins aufs Haus hin.",
    "Ganz vorn in der Liste. {pot} Mark wandern in deinen Geldbeutel.",
    "Gewonnen! Die beiden schauen in die Liste, als hätte sich jemand verrechnet. Hat sich aber keiner. {pot} Mark.",
  ],
  second: [
    "Zweiter. Kein Pott, aber auch kein Sprit weg. Man trennt sich in Frieden.",
    "Platz zwei. „Knapp daneben isch au vorbei“, sagt einer und klopft dir auf die Schulter.",
    "Zweiter. Fürs Regal reicht’s nicht, für ein gutes Gewissen schon.",
  ],
  third: [
    "Du bleibst trocken und fährst die anderen heim.",
    "Dritter. Du hast den Schlüssel, die anderen haben die Gläser. Also fährst du alle heim.",
    "Letzter Platz heißt Taxi spielen. Die zwei singen auf dem Rücksitz, du schaltest das Radio lauter.",
    "Dritter. Das kostet einen Strich Sprit, denn heimgefahren werden muss jeder.",
  ],
  /** Shepherd's ability (contract §4.12): the dog watches out and the last place costs no fuel this time. */
  shepherd: "Der Schäferhund hat aufgepasst: Die zwei laufen heute zu Fuß heim, der Tank bleibt, wie er ist.",
  /** Pennant souvenir: second place pays 2 Mark. */
  pennant: "Der Stammtischwimpel macht Eindruck: Für Platz zwei gibt’s 2 Mark aus der Kasse.",
} as const;

// ─── Preisskat (contract §4.6) ─────────────────────────────────────────────────────────────────────────────

/** Per region: intro before the six games and the ceremony afterwards. */
export const TOURNAMENT_LINES: Record<RegionId, { intro: string[]; win: string[]; second: string[]; third: string[] }> = {
  enztal: {
    intro: [
      "Preisskat in Vaihingen an der Enz. Über der Stadt thront das Schloss, im Saal stehen die Tische in Reihen.",
      "Der Saal ist voll, die Listen liegen bereit. Am Tisch warten die zwei Besten aus dem Enztal.",
    ],
    win: [
      "Der Pokal vom Unteren Enztal gehört dir. Der Wengerter schüttelt dir die Hand, die Müllerin nickt.",
      "Applaus im Saal. Der Pokal glänzt, und unten an der Enz läuten die Glocken. Zufall, aber schön.",
    ],
    second: [
      "Zweiter beim Preisskat. Der Pokal bleibt im Tal, aber man kennt jetzt deinen Namen.",
    ],
    third: [
      "Dritter. Heute waren die Enztaler stärker. Nächstes Mal bringst du mehr Glück mit.",
    ],
  },
  muehlacker: {
    intro: [
      "Preisskat in Mühlacker. Draußen rangiert ein Güterzug, drinnen werden die Karten gemischt.",
      "Am Turniertisch in Mühlacker sitzen der Bahner und der Klosterwirt. Pünktlich um acht geht es los.",
    ],
    win: [
      "Der Pokal von Mühlacker und dem Stromberg ist deiner. Der Bahner schaut auf die Uhr: „Pünktlich gewonnen.“",
      "Gewonnen! Der Klosterwirt sagt, so was habe er seit den Mönchen nicht mehr gesehen.",
    ],
    second: [
      "Zweiter in Mühlacker. Knapp, aber der Zug war schon abgefahren.",
    ],
    third: [
      "Dritter. Heute hielt der Stromberg zusammen. Es kommt ein anderer Tag.",
    ],
  },
  schwarzwald: {
    intro: [
      "Preisskat in Neuenbürg. Das Schloss schaut über die Enzschleife, im Saal ist es still wie im Tannenwald.",
      "Der Flößer und der Brenner warten schon. Die Karten liegen bereit, der Kaffee ist stark.",
    ],
    win: [
      "Der Pokal vom Nordschwarzwald gehört dir. Der Flößer sagt: „Sauber durch die Stromschnelle.“",
      "Gewonnen! Der Brenner hebt den Daumen: so klar gespielt wie sein bester Jahrgang.",
    ],
    second: [
      "Zweiter in Neuenbürg. Der Nebel hat sich gelichtet, der Pokal leider auch.",
    ],
    third: [
      "Dritter. Im Schwarzwald wachsen die Bäume langsam, und die Pokale auch.",
    ],
  },
  stuttgart: {
    intro: [
      "Preisskat in Bad Cannstatt. Vom Wasen her hört man die Kapelle, im Saal das Mischen der Karten.",
      "Der Wasenwirt und die Schaffnerin sitzen schon. „Fahrscheine bitte“, sagt sie. Gemeint sind die Listen.",
    ],
    win: [
      "Der Pokal von Stuttgart gehört dir. Die Schaffnerin knipst dir ein Loch in die Liste: gültig.",
      "Gewonnen! Der Wasenwirt ruft es so laut, dass man es bis zum Riesenrad hört.",
    ],
    second: [
      "Zweiter in Cannstatt. Endstation knapp verpasst, aber die Fahrt war schön.",
    ],
    third: [
      "Dritter. Die Großstadt hat heute die besseren Karten gehabt.",
    ],
  },
};

/** The third Preisskat is the tour final (nine games, the Wanderpokal). */
export const FINAL_LINES = {
  intro: [
    "Das Tourfinale. Neun Spiele, und am Ende steht der Wanderpokal auf dem Tisch.",
    "Um den Wanderpokal wird nicht geredet, um den wird gespielt. Neun Spiele.",
  ],
  win: [
    "Der Wanderpokal! Dein Name kommt auf das kleine Schild unten am Sockel, gleich unter den anderen.",
    "Gewonnen! Die ganze Tour, und am Ende der Wanderpokal. Daheim muss ein Platz im Regal frei werden.",
  ],
  lose: [
    "Der Wanderpokal wandert diesmal zu einem anderen. Aber die Tour war gut, und das Tourenbuch ist voll.",
    "Knapp vorbei. Der Wanderpokal bleibt hier. Nächste Tour holst du ihn.",
  ],
} as const;

/** Preisskat rules reminder (contract §4.6). */
export const TOURNAMENT_RULE = "Preisskat: sechs Spiele, Liste nach Seeger-Fabian. Turnier ist Turnier.";

// ─── Heimkehr, Abrechnung, Heimfahrt am Haken (contract §4.1) ──────────────────────────────────────────────

export const HOMECOMING_LINES = {
  heading: "Heimkehr",
  won: [
    "Mit dem Wanderpokal auf dem Beifahrersitz geht es heim. Er ist angeschnallt.",
    "Die ganze Tour gewonnen. Das Wohnmobil fährt die letzten Kilometer wie von selbst.",
  ],
  lostFinal: [
    "Ohne Wanderpokal, aber mit vollem Tourenbuch geht es heim.",
    "Das Finale ging daneben. Der Rest der Tour war trotzdem ein Fest.",
  ],
  empty: [
    "Der Tank ist leer. Die Tour ist vorbei, die Erinnerungen bleiben.",
    "Kein Strich mehr im Tank. Zeit für die Heimfahrt.",
  ],
  summary: "Was bleibt, steht im Tourenbuch: Route, Liste und Stempel.",
} as const;

export const TOW_LINES = {
  heading: "Heimfahrt am Haken",
  lines: [
    "Der Abschleppwagen kommt mit gelber Rundumleuchte. Der Fahrer kennt dich schon von der letzten Tour.",
    "Am Haken geht es heim. Der Fahrer pfeift, das Wohnmobil schaukelt hinterher wie ein Anhänger beim Umzug.",
    "„Da hat’s ja gar nix mehr drin“, sagt der Mann vom Abschleppdienst. Dann geht es heim, ganz gemütlich.",
    "Leer gefahren. Aber was für eine Tour. Das Motorrad schaut vom Heckträger zurück.",
  ],
  postcard: "Die Postkarte von daheim hilft: Jemand hat zwei Striche Sprit vorbeigebracht. Weiter geht’s.",
} as const;

// ─── Tourenbuch (contract §4.13) ───────────────────────────────────────────────────────────────────────────

export const BOOK = {
  title: "Tourenbuch",
  cover: "Tourenbuch von {name}",
  rankLine: "Rang: {rank}",
  sections: {
    trophies: "Pokalregal",
    stamps: "Ortsstempel",
    album: "Album der Stammgäste",
    dogs: "Hunde",
    souvenirs: "Andenken",
    chronicle: "Chronik",
    stats: "Skat-Statistik",
    fun: "Nicht ganz so ernst",
  },
  empty: {
    trophies: "Das Regal wartet noch auf den ersten Pokal.",
    stamps: "Noch kein Ortsstempel. Die Straße ruft.",
    album: "Noch niemanden am Tisch getroffen.",
    chronicle: "Noch ist nichts passiert. Das ändert sich schnell.",
  },
  difficulty: { cozy: "Gemütlich", sporty: "Sportlich", sharp: "Scharf" },
  wanderpokal: "Wanderpokal",
  stats: {
    games: "Spiele",
    declared: "Alleinspiele",
    declaredWon: "Alleinspiele gewonnen",
    byKind: "Spielarten",
    highestValue: "Höchstes Spiel",
    grandHand: "Grand Hand",
    schneider: "Schneider",
    schwarz: "Schwarz",
    bestList: "Beste Liste",
    defenceWon: "Gegenspiele gewonnen",
    tours: "Touren",
    toursWon: "Touren gewonnen",
    innWins: "Wirtshaus-Runden gewonnen",
  },
  kinds: { diamonds: "Karo", hearts: "Herz", spades: "Pik", clubs: "Kreuz", grand: "Grand", null: "Null", ramsch: "Ramsch", passed: "Eingepasst" },
  fun: {
    detours: "Abstecher mit dem Motorrad",
    timesDriver: "Die anderen heimgefahren",
    driverJoke: "Fahrer vom Dienst: {count} Mal.",
  },
  album: { games: "Spiele", won: "gewonnen", lost: "verloren", met: "Zuerst getroffen" },
} as const;

/**
 * Ranks on the cover (contract §4.13), by the number of trophies won so far (regional and Wanderpokal, repeats
 * count). The regulars call him {title}: "Lehrling" until the first trophy, "Meister" afterwards (contract §4.5).
 */
export const RANKS = [
  { id: "lehrling", name: "Lehrling", minTrophies: 0, text: "Noch kein Pokal. Am Stammtisch heißt du der Lehrling." },
  { id: "geselle", name: "Geselle", minTrophies: 1, text: "Der erste Pokal steht im Regal. Man grüßt dich mit Namen." },
  { id: "meister", name: "Meister", minTrophies: 8, text: "Acht Pokale. Wenn du reinkommst, wird es am Stammtisch leiser." },
  { id: "altmeister", name: "Altmeister", minTrophies: 25, text: "Ein ganzes Regal voll. Von dir erzählen sie noch in zwanzig Jahren." },
] as const;

/** {title} in speech: "Lehrling" before the first trophy, "Meister" after (contract §4.5). */
export const SPEECH_TITLES = { before: "Lehrling", after: "Meister" } as const;

// ─── Die geführte Probefahrt (contract §4.1) ───────────────────────────────────────────────────────────────

/** Step by step, very simple. Shown as the "Was jetzt?" sentence or a small paper note. */
export const TUTORIAL = {
  offer: "Zum Eingewöhnen gibt es eine kleine Probefahrt mit vier Stationen. Sie kostet keinen Sprit.",
  start: "Probefahrt",
  skip: "Überspringen",
  steps: {
    map: [
      "Das ist die Karte. Die Straßen führen nach rechts, von Station zu Station.",
      "Klicke auf das Wirtshaus, das leuchtet.",
    ],
    innIntro: [
      "Im Wirtshaus spielst du drei Spiele Skat gegen zwei Stammgäste.",
      "Die zwei heute nehmen es gemütlich. Ein guter Anfang.",
    ],
    bid: [
      "Jetzt wird gereizt. Klicke auf den großen Knopf mit der Zahl, um sie zu sagen.",
      "Willst du nicht weiter, klicke auf „Passe“.",
    ],
    declare: [
      "Du hast das Spiel. Wähle, was du spielen willst.",
      "Jeder Knopf zeigt, was das Spiel wert ist und ob es für dein Reizgebot reicht.",
    ],
    discard: [
      "Der Skat ist bei dir. Klicke zwei Karten an, die weg sollen.",
      "Dann klicke auf „Drücken“. Vorher kannst du es dir noch anders überlegen.",
    ],
    play: [
      "Klicke eine Karte an. Sie hebt sich ein Stück.",
      "Klicke sie noch einmal, dann liegt sie auf dem Tisch.",
    ],
    lastTrick: ["Unten rechts kannst du den letzten Stich und die Liste ansehen. Ein Klick genügt."],
    list: [
      "Das ist die Liste. Wer nach drei Spielen vorn liegt, gewinnt den Pott.",
      "Der Dritte fährt die anderen heim, das kostet sonst einen Strich Sprit. Heute nicht.",
    ],
    kiosk: [
      "Am Kiosk gibt es das Lokalblatt mit dem Zahlenrätsel.",
      "Klicke ein leeres Feld an und dann unten eine Ziffer. Weglegen kostet nichts.",
    ],
    chess: [
      "Im Park steht ein Schachbrett mit einer Aufgabe.",
      "Klicke eine Figur an. Die Felder, auf die sie ziehen kann, leuchten. Dann klicke das Feld.",
    ],
    pitch: [
      "Am Stellplatz wird getankt: zwei Striche mehr.",
      "Hier kannst du auch für heute aufhören. Das Spiel merkt sich alles.",
    ],
    gauges: [
      "Oben siehst du den Tank und deine Mark. Ist der Tank leer, ist die Tour vorbei.",
    ],
    done: [
      "Das war die Probefahrt. Jetzt geht es richtig los.",
      "Am Küchentisch wartet die erste Tour. Viel Glück, {name}.",
    ],
  },
} as const;

// ─── Credits (contract §7) ─────────────────────────────────────────────────────────────────────────────────

export const CREDITS: { heading: string; lines: string[] }[] = [
  { heading: "SKAT AUF TOUR", lines: ["Ein Spiel von Florian für seinen Vater."] },
  {
    heading: "Gemacht mit",
    lines: [
      "TypeScript, Vite und einer einzigen Leinwand",
      "Bilder: gemalt mit Krea 2 und nachbearbeitet; Karten, Knöpfe und Symbole im Programm gezeichnet",
      "Musik: für dieses Spiel komponiert, eingespielt mit dem Musikmodell YuE2 (m-a-p/YuE2-3B)",
      "Geräusche: im Programm erzeugt",
      "Wirtsstube: BonnyOrbit (freesound.org), CC0",
      "Festsaal und Biergarten: Garuda1982 (freesound.org), CC BY 4.0",
    ],
  },
  {
    heading: "Schriften",
    lines: [
      "Jersey 10, 15, 20 und 25 · The Soft Type Project Authors",
      "Silkscreen · The Silkscreen Project Authors",
      "Tiny5 · The Tiny5 Project Authors",
      "Alle unter der SIL Open Font License (OFL)",
    ],
  },
  {
    heading: "Schachaufgaben",
    lines: ["Aus der Aufgabendatenbank von Lichess, frei unter CC0"],
  },
  {
    heading: "Skat",
    lines: ["Gespielt nach der Internationalen Skatordnung. Jede Abweichung ist eine Hausregel und steht vor der Runde."],
  },
  {
    heading: "Lizenz",
    lines: [
      "Freie Software unter der GNU General Public License, Version 3 (GPLv3).",
      "Alle Figuren, Wirtshäuser und Geschichten sind erfunden. Die Orte gibt es wirklich.",
    ],
  },
  { heading: "Danke", lines: ["An alle Stammtische, die einen Platz frei haben.", "Gut Blatt!"] },
];
