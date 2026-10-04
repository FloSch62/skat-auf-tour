// Speech bubbles at the Skat table (contract §4.5). Every character has his own voice; the regulars live here, the
// Preisskat favourites and the side characters in speech-guests.ts.
//
// Situations (SpeechSituation):
//   greet     sitting down at the table            bid       while bidding or holding (no numbers: the bid is shown)
//   pass      when he passes                       declare   announcing his game (never names a game type)
//   trickWon / trickLost                           gameWon / gameLost (as declarer or defender)
//   ramsch    all passed, Ramsch is played         order     ordering from the Wirtin (food, coffee, now and then a drink)
//   farewell  leaving the table                    kontra    saying Kontra OR Re (lines fit both; the table shows the word)
//   tell      Schwätzer-Sigi only: lines that give away his hand (see SIGI_TELLS)
// Placeholders: {name} (player name), {title} („Lehrling“ before the first trophy, „Meister“ afterwards).
// Favourites have no `order` lines (Preisskat is Preisskat). Drinking is a quiet joke at most (contract §0.9).
import type { SpeechBook } from "../game/types.ts";
import { GUEST_SPEECH } from "./speech-guests.ts";
import { DUO_EXCHANGES, DUO_SPEECH } from "./speech-duo.ts";

export type TellHintId =
  | "jacks-0" | "jacks-1" | "jacks-2" | "jacks-3" | "jacks-4" | "aces-0" | "aces-2" | "aces-3" | "ten-bare" | "trash"
  | "strong";

/**
 * What {hint} in Schwätzer-Sigi's `tell` lines stands for. `text` is an accusative noun phrase that fits after
 * "I hab …"; `when` says which hand it describes (the Skat area picks a true one).
 */
export const TELL_HINTS: Record<TellHintId, { text: string; when: string }> = {
  "jacks-0": { text: "keinen einzigen Buben", when: "holds no jack" },
  "jacks-1": { text: "bloß einen Buben", when: "holds exactly one jack" },
  "jacks-2": { text: "zwei Buben", when: "holds exactly two jacks" },
  "jacks-3": { text: "drei Buben", when: "holds exactly three jacks" },
  "jacks-4": { text: "alle vier Buben", when: "holds all four jacks" },
  "aces-0": { text: "kein einziges Ass", when: "holds no ace" },
  "aces-2": { text: "zwei Asse", when: "holds exactly two aces" },
  "aces-3": { text: "drei Asse", when: "holds three or four aces" },
  "ten-bare": { text: "eine blanke Zehn", when: "holds a ten that is the only card of its suit" },
  "trash": { text: "lauter Luschen", when: "holds no ace, no ten and at most one jack" },
  "strong": { text: "ein Blatt wie ein Brett", when: "holds three or more jacks, or two jacks and two aces" },
};

/**
 * Schwätzer-Sigi's tells, by meaning. `long`: {suit} is the suit he holds most cards of (his likely trump).
 * `void`: {suit} is a suit he holds no card of. `hint`: {hint} is the `text` of a TELL_HINTS entry that is true for
 * his hand. {suit} is the suit name as shown for the chosen deck (Kreuz, Pik, Herz, Karo).
 */
export const SIGI_TELLS: { long: string[]; void: string[]; hint: string[] } = {
  long: [
    "Heut hab i {suit} bis unters Dach, aber des sag i net.",
    "So viel {suit} hab i seit Jahre nimmer ghabt … ups, hab i des laut gsagt?",
    "Mei Schwager sagt immer, wer viel {suit} hat, soll schweige. Also schweig i!",
    "Wenn jetzt {suit} Trumpf wär, des wär a Fest. Rein theoretisch, gell.",
    "Lauter {suit}, a ganze Latte … i mein, schöne Karte heut, gell?",
  ],
  void: [
    "Von {suit} hab i nix, gar nix, also … vergesst des glei wieder.",
    "{suit}? Kenn i net. Heut jedenfalls net.",
    "Hoffentlich spielt koiner {suit} aus, sonst … ach, nix.",
    "Mei Nachbarin hat immer {suit} auf der Hand, i heut kein einziges. Ups.",
  ],
  hint: [
    "I hab {hint}, aber psst, gell?",
    "Wenn i des meim Schwager erzähl: I hab {hint}! Ups.",
    "Ganz im Vertraue: I hab {hint}. Nix verrate, gell.",
    "Do hab i {hint} und sag koim ebbes. Also fast koim.",
    "Heut hab i {hint}, des hat’s seit Ostern nimmer gebe.",
    "Gugg net so, i hab {hint}, des sieht man mir doch an!",
    "I sag’s ja nur dir: I hab {hint}. Und jetzt wisset’s alle.",
    "Mei Frau sagt, wenn i {hint} hab, soll i des Maul halte. Also halt i’s.",
  ],
};

const REGULAR_SPEECH: SpeechBook = {
  // Maurer-Karle: bedächtig, wenig Worte, alles wird gemauert.
  maurer: {
    greet: [
      "Grüß Gott. Hock di na, {name}.",
      "So. Erst mal sitze. Dann schaffe mer.",
      "N’Abend. Des Fundament steht, jetzt kann’s losgehe.",
      "Ah, der {title}. Langsam, gell. Mir hen Zeit.",
    ],
    bid: [
      "Hm. Des trägt no.",
      "Langsam. Erst messe, dann mauere.",
      "No a Stockwerk. Aber net mehr.",
      "I sag ja. Aber ganz vorsichtig.",
    ],
    pass: [
      "Passe. Auf Sand bau i net.",
      "Passe. Des Blatt hat koi Fundament.",
      "Passe. Ihr saget, i mauer? Des isch halt mei Beruf.",
      "Passe. Lieber eins zu wenig als eins zu viel.",
    ],
    declare: [
      "So. Jetzt wird gmauert.",
      "Des wird a solide Sach. Stein auf Stein.",
      "I hab’s mit der Wasserwaag nachgmesse. Des passt.",
      "Gut. Dann bau mer des Häusle.",
    ],
    trickWon: [
      "Der sitzt.",
      "Stein auf Stein.",
      "So. Und weiter im Text.",
      "Des hält.",
    ],
    trickLost: [
      "Hm. Der war locker.",
      "Do fehlt a bissle Mörtel.",
      "Macht nix. Des Fundament steht.",
      "Den hätt i abstütze müsse.",
    ],
    gameWon: [
      "Richtfest. Gut gmacht, Karle.",
      "Siehsch, {name}: langsam, aber gründlich.",
      "Des steht jetzt. Des fällt nimmer um.",
      "Sauber verfugt. So g’hört sich des.",
    ],
    gameLost: [
      "Hm. Do isch mir die Wand umgfalle.",
      "Nächstes Mal mess i zweimal.",
      "Na ja. Abreiße, neu baue.",
      "Gratuliere, {name}. Des war sauber.",
    ],
    ramsch: [
      "Ramsch. Dann wird halt Schutt gschippt.",
      "Jeder räumt sein Dreck selber weg, gell.",
      "Bloß koine Augen sammle. Die wiege schwer.",
      "Ramsch isch wie Abriss. Koiner will’s, alle müsset.",
    ],
    order: [
      "A Halbe, wenn’s recht isch.",
      "A Brezel. Und a Butter dazu.",
      "A Vesper, bitte. Mit Schwarzwurst.",
      "No an Kaffee. Schwarz wie Teer.",
    ],
    farewell: [
      "So. Feierabend. Ade, {name}.",
      "Morge früh isch Baustell. Ade mitnander.",
      "Des war a guter Abend. Bis zum nächste Mal.",
      "Gut Nacht. Und lass die Karte liege.",
    ],
    kontra: [
      "Des trägt net. Doppelt.",
      "Do halt i dagege. Wie a Stützmauer.",
      "Des schau mer uns genauer an. Doppelt.",
      "So net, Freundle. I halt dagege.",
    ],
    blunder: [
      "{target}, du Seggl. Des war schief gmauert.",
      "Hm. Do hasch mir die Wand eingrisse, du Grasdackel.",
      "{target}, du Halbdackel. I hab doch die Stütz gebraucht.",
      "Wer mir den Mörtel wegnimmt, isch a Seggl. So.",
    ],
    robbed: [
      "Mei Ass isch weg. Du Bachel, {target}.",
      "Hm. Der Eckstein isch raus.",
      "{target}, des war mei Zehn. Des merk i mir.",
      "Do nimmt mir oiner die Ziegel vom Dach.",
    ],
    selfBlame: [
      "I Seggl. Erst mauere, dann messe. Falschrum.",
      "Karle, du Granateseggl. Des war oi Stockwerk zu hoch.",
      "Hm. Do hab i auf Sand baut. Dackel.",
      "Selber schuld. Wasserwaag vergesse.",
    ],
    tease: [
      "{target}, zu hoch baut. Des fällt halt um.",
      "Ohne Fundament wird des nix. Merk dir des, {target}.",
      "Do hat oiner überreizt. I sag nix. Fast nix.",
      "Richtfest isch abgsagt, {target}.",
    ],
  },

  // Der Erwin: großspurig, reizt alles, hat immer schon mal einen Grand mit vieren gewonnen.
  zocker: {
    greet: [
      "Ha, {name}! Heut nehm i euch aus wie a Weihnachtsgans.",
      "Hock di na, {title}. Und schau zu, wie man des macht.",
      "Grüß Gott! Der Erwin isch da, jetzt wird’s teuer.",
      "Pack dei Geldbeutel aus, {name}. Den brauchsch heut.",
    ],
    bid: [
      "Weiter! I hab Zeit!",
      "Des isch doch nix! Höher!",
      "Ja, ja, und nomol ja!",
      "Wer bietet mehr? Koiner? Doch, i!",
    ],
    pass: [
      "Passe. Aber nur, weil i heut gnädig bin.",
      "Passe. Des Blatt isch unter meiner Würde.",
      "Ha, lass gut sei. Passe.",
      "Passe. Sonst gwinn i wieder alles, des wird langweilig.",
    ],
    declare: [
      "So! Jetzt zeig i euch, wie des geht!",
      "Des spiel i mit verbundene Auge!",
      "Haltet euch fest, jetzt kommt der Erwin!",
      "Des isch so gut wie gwonne. Schreibt’s scho auf!",
    ],
    trickWon: [
      "Na? Na? Was sag i!",
      "KLATSCH! Und der nächste glei hinterher.",
      "Des isch Skat, Leut. Des isch Skat!",
      "Hab i’s net gsagt?",
    ],
    trickLost: [
      "Den hab i euch gschenkt. Mit Absicht.",
      "Taktik! Des verstehsch du net.",
      "Heilandsack. Na gut, den oine.",
      "Der zählt net, i war abglenkt.",
    ],
    gameWon: [
      "Des isch doch nix! Des mach i im Schlaf!",
      "Siehsch, {name}? So spielt man Skat!",
      "Schreibt’s auf. Mit großem E wie Erwin.",
      "Wie anno einundsiebzig. Genau so!",
    ],
    gameLost: [
      "Verlore? Noi. I hab bloß später gwonne als ihr.",
      "Überreizt? I? Höchstens a bissle.",
      "Glück ghabt, {name}. Pures Glück.",
      "Nächstes Spiel hol i des doppelt zrück.",
    ],
    ramsch: [
      "Ramsch? I gwinn sogar beim Ramsch!",
      "Durchmarsch, Leut. Ihr werdet’s sehe.",
      "Ramsch isch was für Feiglinge. Aber bitte.",
      "Koiner hat sich traut? Typisch.",
    ],
    order: [
      "Frau Wirtin! A Weizen, aber a großes!",
      "Für mi die Maultasche. Die doppelte Portion.",
      "Brezeln für den ganze Tisch, der Erwin zahlt!",
      "A Kaffee, schwarz und stark, wie mei Spiel.",
    ],
    farewell: [
      "Ade, {name}. Und üb a bissle bis zum nächste Mal.",
      "So, i muss. Die Leut warte auf mi.",
      "Morge hol i mir des zrück. Ade!",
      "War nett. Für euch.",
    ],
    kontra: [
      "Ha! Des glaubsch doch selber net! Doppelt!",
      "Do geh i mit, und zwar richtig!",
      "Des Spiel kauf i dir net ab!",
      "Doppelt! Des wird teuer für di!",
    ],
    blunder: [
      "{target}, du saublöder Grasdackel! Wegen dir!",
      "Wer schmiert denn do, du Granateseggl? I wollt doch …",
      "Des war mei Stich! Mei! Du Allmachtsdackel, {target}!",
      "Kruzifix! Mit so am Partner gwinnt ja koiner!",
    ],
    robbed: [
      "Mei Ass! Des isch Diebstahl, {target}!",
      "{target}, gib mir mei Zehn zrück, du Hornochs!",
      "Heilandsack, die Zehn war vom Feinsten!",
      "Des hat mir no koiner gmacht. Doch, letzte Woch.",
    ],
    selfBlame: [
      "Überreizt? Des war net i, des war des Blatt!",
      "I Granateseggl. Aber nur heut, gell.",
      "A Fehler! Von euch, weil ihr mi net aufghalte hen.",
      "Erwin, du Dackel. Des hättsch wisse müsse. Hab i au.",
    ],
    tease: [
      "{target}, überreizt! Des passiert mir nie. Fast nie.",
      "Ha! Do gugg her, unser Alleinspieler!",
      "So a Spiel hätt i im Schlaf gwonne, {target}.",
      "Des isch Lehrgeld. Zahlbar sofort.",
    ],
  },

  // Frau Gerda: präzise, rechnet in Augen, trinkt Sprudel, spricht fast Hochdeutsch.
  rechnerin: {
    greet: [
      "Guten Abend, {name}. Ich habe die Liste schon vorbereitet.",
      "Grüß Gott. Bleistift gespitzt, Sprudel steht. Wir können.",
      "Ah, der {title}. Setzen Sie sich, ich führe die Liste.",
      "Grüß Gott mitnander. Drei Spiele, ich zähl mit.",
    ],
    bid: [
      "Ja. Das ist gerechnet.",
      "Ich halte. Exakt bis hierher.",
      "Ja. Dafür reicht es, ich hab’s nachgezählt.",
      "Gehalten. Ohne Rundungsfehler.",
    ],
    pass: [
      "Passe. Die Zahlen sprechen dagegen.",
      "Passe. Das wären höchstens fünfzig Augen.",
      "Nein. Das rechnet sich net.",
      "Passe. Ich spiele nur, was aufgeht.",
    ],
    declare: [
      "Ich habe es durchgerechnet. Es geht auf.",
      "So. Das spielen wir jetzt ordentlich.",
      "Einundsechzig Augen, mindestens. Fangen wir an.",
      "Bitte, ich habe angesagt. Notieren Sie es.",
    ],
    trickWon: [
      "Elf und zehn. Einundzwanzig.",
      "Das war zu erwarten.",
      "Notiert.",
      "Der Stich ist meiner, wie gerechnet.",
    ],
    trickLost: [
      "Gut. Den hatte ich eingeplant.",
      "Hm. Dann fehlen noch vier Augen.",
      "Das ändert die Rechnung nur wenig.",
      "Man sagt, ich sei kleinlich. Ich nenne es genau.",
    ],
    gameWon: [
      "Siebenundsechzig Augen. Gewonnen, wie berechnet.",
      "Die Liste stimmt, {name}. Ich habe sie zweimal geprüft.",
      "Schön. Das trage ich gleich ein.",
      "Mathematik, mein Lieber. Kein Glück.",
    ],
    gameLost: [
      "Neunundfünfzig. Zwei Augen. Zwei!",
      "Das war knapp gerechnet. Zu knapp.",
      "Gut gespielt, {name}. Ich schreibe es ehrlich auf.",
      "Da habe ich mich verzählt. Das kommt selten vor.",
    ],
    ramsch: [
      "Ramsch. Ich zähle jedes Auge, das Sie mir schieben.",
      "Bitte keine Augen zu mir. Ich führe Buch.",
      "Ramsch ist reine Rechenarbeit. Mir recht.",
      "Die Jungfrau verdoppelt, vergessen Sie das net.",
    ],
    order: [
      "Einen Sprudel, bitte. Mit Zitrone.",
      "Noch einen Sprudel. Und einen frischen Bleistift.",
      "Eine Brezel, bitte. Die Hälfte reicht mir.",
      "Einen Pfefferminztee, wenn es keine Umstände macht.",
    ],
    farewell: [
      "Die Liste liegt beim Wirt. Gute Nacht, {name}.",
      "Ade. Ihr Ergebnis habe ich abgeschrieben, zur Sicherheit.",
      "Auf Wiedersehen. Es ist alles verbucht.",
      "Gute Heimfahrt. Und zählen Sie mit, gell.",
    ],
    kontra: [
      "Das geht rechnerisch nicht auf. Doppelt.",
      "Ich habe nachgezählt. Ich halte dagegen.",
      "Bitte. Dann zählt es eben doppelt.",
      "Das rechnen wir jetzt mal ganz genau nach.",
    ],
    blunder: [
      "{target}, das waren elf Augen. Elf. Seggl.",
      "Sie haben übertrumpft. Den eigenen Partner. Notiert, Grasdackel.",
      "{target}, zwei Fehler in einem Stich. Das schafft nicht jeder.",
      "Das nennt man Halbdackel-Rechnung. Eins plus eins gleich null.",
    ],
    robbed: [
      "{target}, meine Zehn. Zehn Augen. Ich schreibe sie mir auf.",
      "Das Ass ist weg. Das kostet uns genau elf. Dubbel.",
      "{target}, das war geplant, gell? Von mir nämlich nicht.",
      "Elf Augen an die falsche Partei. Das tut mir statistisch weh.",
    ],
    selfBlame: [
      "Ich habe mich verzählt. Ich. Gerda, du Seggl.",
      "Ein Rechenfehler. Er wird nicht wieder vorkommen.",
      "Neunundfünfzig. Zwei zu wenig. Ich Granateseggl.",
      "Notiert: heute einmal Dackel gewesen.",
    ],
    tease: [
      "Überreizt um zwölf. Ich hätte es Ihnen ausrechnen können, {target}.",
      "{target}, sechzig Augen sind nicht einundsechzig. Zweite Klasse.",
      "Das Spiel war verloren, bevor Sie angesagt haben. Rechnerisch.",
      "Ich schreibe es auf. In Rot, gell.",
    ],
  },

  // Null-Eugen: schlau und verschmitzt, liebt das Nichts.
  nullfuchs: {
    greet: [
      "Grüß Gott, {name}. Heut isch a guter Abend für nix.",
      "Na, {title}? Wenig auf der Hand, viel im Kopf, gell.",
      "N’Abend mitnander. I hab extra nix mitbracht.",
      "Null Ahnung, sagt mei Frau. Stimmt, i spiel ja Null.",
    ],
    bid: [
      "Ja. Mit nix in der Hand kommt man weit.",
      "Halt. I hab do so a Idee.",
      "Ja, ja. Lass mi no a bissle mitschwimme.",
      "Weiter, weiter. Was nix isch, kann nix verliere.",
    ],
    pass: [
      "Passe. Des isch mir zu viel Blatt.",
      "Passe. Zu viele Buben, des mag i net.",
      "Na, lass. I wart auf mei Nix.",
      "Passe. Heut isch des Nichts woanders.",
    ],
    declare: [
      "Ha, jetzt wird’s spannend, gell?",
      "Wer nix hat, der hat was vor.",
      "Gugg mi net so an. I weiß, was i tu.",
      "Des spiel i. Ihr werdet staune.",
    ],
    trickWon: [
      "Hoppla. Den wollt i gar net.",
      "Na sowas. Der isch mir zugelaufe.",
      "Hehe. Siehsch.",
      "Manchmal muss man au mal was nehme.",
    ],
    trickLost: [
      "Bitte, nimm du. I bin bescheide.",
      "Nix kriegt. Wunderbar.",
      "Den lass i gern liege.",
      "Recht so. Mir gfallt’s leer.",
    ],
    gameWon: [
      "Mit nix gwonne. Des isch Kunst, {name}.",
      "Hehe. Des hat koiner komme sehe.",
      "Siehsch, {title}: Weniger isch manchmal mehr.",
      "Und wieder nix verlore. Schön.",
    ],
    gameLost: [
      "Hm. Do war doch ebbes zu viel.",
      "Oi Karte zu viel. Oine!",
      "Na gut. Nix isch au net immer nix.",
      "Respekt, {name}. Du hasch mi erwischt.",
    ],
    ramsch: [
      "Ramsch! Endlich a Spiel für mi.",
      "Beim Ramsch bin i daheim. Nix nehme, alles verschenke.",
      "Ha, Ramsch. Jetzt pass auf, wie wenig i krieg.",
      "Jungfrau bleibe, des isch mei Spezialität.",
    ],
    order: [
      "An Most, bitte. Aber koin trübe.",
      "A Brezel. Nix dazu. Nix isch am beschte.",
      "A Spezi, bitte. Mit Strohhalm.",
      "Maultasche. Do isch was drin, was man net sieht.",
    ],
    farewell: [
      "Ade, {name}. I hab heut viel gwonne, mit wenig.",
      "Gut Nacht. Und denk dran: Nix isch au ebbes.",
      "So, i geh. Und nehm nix mit, wie immer.",
      "Bis bald. I bring wieder nix mit.",
    ],
    kontra: [
      "Na, na. Des schaut mir verdächtig aus. Doppelt.",
      "Hehe. Do halt i mal dagege.",
      "Des isch mir zu sicher. I geh mit, doppelt.",
      "Bloß net so frech, gell. Doppelt.",
    ],
    blunder: [
      "{target}, du Seggl, jetzt hab i was. I wollt doch nix!",
      "Hehe, du Halbdackel. Mir hasch grad an Stich zugschobe.",
      "Des war a Stich zu viel für mi. Danke für nix, {target}.",
      "Bachel. Wer schmiert dem Null-Eugen Augen zu?",
    ],
    robbed: [
      "Mei Ass? Nimm’s halt. I wollt’s eh loswerde.",
      "{target}, du Simpel, des war mei Ausred für später.",
      "Die Zehn isch weg. Jetzt hab i endlich gar nix. Fast schön.",
      "Hm. Gschnappt. Des merk i mir, {target}.",
    ],
    selfBlame: [
      "Null gspielt und an Stich kriegt. I Granateseggl.",
      "Eugen, du Dackel. Oi Sieben zu wenig.",
      "Hehe. Des war nix. Also, des war net nix. Des war schlecht.",
      "Zu viel gwollt mit zu wenig. Seggl.",
    ],
    tease: [
      "{target}, hehe. Des war jetzt aber gar nix.",
      "Viel Blatt, wenig Spiel. Kenn i, {target}.",
      "So viel Trumpf und trotzdem verlore? Respekt.",
      "{target}, nächstes Mal spielsch Null. Do brauchsch wenigstens nix.",
    ],
  },

  // Grand-Helmut: laut, lauter, Grand.
  grandspieler: {
    greet: [
      "GRÜSS GOTT! Der Helmut isch da!",
      "Hock di na, {name}! Heut wird Grand gspielt, wenn’s geht!",
      "So, Leut! Karte her, Tisch frei!",
      "Ha, der {title}! Hasch dir Ohrenschützer mitbracht?",
    ],
    bid: [
      "JA! Was sonst!",
      "Weiter! Immer weiter!",
      "Ja, und zwar laut!",
      "HALT! I mein: ja!",
    ],
    pass: [
      "Passe. Aber nur heut!",
      "PASSE! Des Blatt isch a Witz!",
      "Passe? I? Noi, i hab bloß laut nachdenkt. PASSE!",
      "Passe. Des Blatt isch so leer wie mei Garage.",
    ],
    declare: [
      "SO! Jetzt wird gspielt!",
      "Haltet eure Gläser fest!",
      "Des spiel i, und zwar mit Karacho!",
      "Aufpasse, jetzt kracht’s!",
    ],
    trickWon: [
      "KLATSCH! Des war meiner!",
      "Ha! Der sitzt!",
      "Und DES isch a Stich!",
      "RUMMS! Weiter geht’s!",
    ],
    trickLost: [
      "HEILANDSACK!",
      "Was? Den? Ja sauber!",
      "Der zählt nur halb!",
      "Ha, glei hol i mir den zrück!",
    ],
    gameWon: [
      "GWONNE! Hat des d’ Küche au ghört?",
      "Des isch Skat, {name}! Laut und deutlich!",
      "So spielt der Helmut! Schreibt’s groß auf!",
      "Ha! Und die Gläser stehn no!",
    ],
    gameLost: [
      "Ha, verlore. Aber laut verlore!",
      "Gut gspielt, {name}. Des sag i aber nur oimal.",
      "Herrgott nomol. Nächstes Mal!",
      "Des war a Unfall. A lauter Unfall.",
    ],
    ramsch: [
      "RAMSCH! Ha, des isch was für Feiglinge!",
      "Ramsch? I wollt doch an Grand spiele!",
      "Na gut, Ramsch. Dann eben leise. Fast.",
      "Beim Ramsch sin wenigstens die Buben Trumpf!",
    ],
    order: [
      "Frau Wirtin! A Brezel! Die größte, wo’s gibt!",
      "A Weizen, und a Brezel, aber flott!",
      "Für mi Maultasche, mit Zwiebel!",
      "An Kaffee! Damit i wach bleib für den Grand!",
    ],
    farewell: [
      "ADE! Bis zum nächste Grand!",
      "So, i geh. Ihr dürft jetzt wieder leise sei.",
      "Gut Nacht, {name}! Und schlaf gut, wenn du kannsch!",
      "Ade mitnander! Der Helmut kommt wieder!",
    ],
    kontra: [
      "DOPPELT! Und zwar sofort!",
      "Ha! Des lass i mir net gfalle!",
      "Do sag i was dagege, und zwar laut!",
      "Aufpasse, des kostet jetzt doppelt!",
    ],
    blunder: [
      "{target}, DU SEGGL! Des war MEI Stich!",
      "WER schmiert denn do? Du GRANATESEGGL!",
      "Herrgottsakrament! A Hornochs, a ganz a großer, {target}!",
      "KLATSCH, und weg! Du saublöder Grasdackel!",
    ],
    robbed: [
      "MEI ASS! Du Rindvieh, {target}!",
      "Die Zehn! DIE ZEHN! Des gibt’s doch net!",
      "{target}, gib die Zehn her, des war a Missverständnis!",
      "HEILANDSACK! Mei schönes Ass!",
    ],
    selfBlame: [
      "I HORNOCHS! Richtiges Spiel, falsch gspielt!",
      "Helmut, du Granateseggl! LAUT verlore!",
      "Des war a Fehler. A lauter Fehler. Von mir.",
      "I Dackel! Hätt i bloß Farbe gspielt! Noi, des sag i net.",
    ],
    tease: [
      "{target}, do hasch dir a Ei glegt!",
      "ÜBERREIZT! Des hört man bis in d’ Küch!",
      "Des war nix! Gar nix! Aber laut war’s net, {target}.",
      "Verlore? Ha! Willkomme im Club!",
    ],
  },

  // Der junge Rolf: unsicher, fragt nach, entschuldigt sich.
  neuling: {
    greet: [
      "Ähm, Grüß Gott. Darf i mi dazuhocke?",
      "Hallo, {name}. I bin der Rolf. I bin no net so gut.",
      "Grüß Gott. I hoff, i mach heut net so viel falsch.",
      "Oh, der {title}. Do muss i mi anstrenge.",
    ],
    bid: [
      "Ja? Ja. Ja, glaub scho.",
      "Darf i do no ja sage?",
      "Ähm … ja. Hoffentlich.",
      "I sag mal ja. Oder? Ja.",
    ],
    pass: [
      "Passe. Glaub i. Ja, passe.",
      "Noi, lieber net. Passe.",
      "Passe. Tschuldigung.",
      "Do trau i mi net. Passe.",
    ],
    declare: [
      "I probier’s halt mal.",
      "Des müsst gehe. Hat mei Onkel gsagt.",
      "Ähm, so. Des spiel i. Glaub i.",
      "Bitte net lache, gell.",
    ],
    trickWon: [
      "Oh! Der isch meiner? Echt?",
      "Ha, des hat klappt!",
      "Den hab i? Super.",
      "Mit em Kopf spiele, sagt mei Onkel. Aber die Karte sin doch in der Hand.",
    ],
    trickLost: [
      "Oh. Des war wohl falsch.",
      "Ähm. Hätt i do Trumpf spiele solle?",
      "Mist. Den hab i verschmiert.",
      "Wie viel Trümpf sin eigentlich scho draußen?",
    ],
    gameWon: [
      "I hab gwonne? Echt jetzt?",
      "Wahnsinn! Des muss i daheim erzähle.",
      "Danke, {name}. Bei dir hab i viel abgschaut.",
      "Hat mei Bierdeckel mit de Reizwerte doch was gnützt.",
    ],
    gameLost: [
      "Oh. Des tut mir leid.",
      "Hab i scho wieder die Trümpf net zählt.",
      "Gut gspielt, {name}. I lern des no.",
      "Nächstes Mal pass i besser auf. Versproche.",
    ],
    ramsch: [
      "Ramsch? Wie ging des nomol?",
      "Do darf i jetzt koine Stiche mache, oder?",
      "Ramsch. Hoffentlich werd i Jungfrau.",
      "Oh je. Beim Ramsch krieg i immer alles.",
    ],
    order: [
      "A Spezi, bitte. Mit Eis, wenn’s geht.",
      "Ähm, a Brezel? Danke.",
      "Für mi no a Spezi. Bitte.",
      "Darf i a Paar Saitewürstle? Bitte.",
    ],
    farewell: [
      "Danke fürs Mitspiele. Ade, {name}.",
      "I muss heim, sonst schimpft mei Mutter.",
      "Ade mitnander. Und danke für die Geduld.",
      "Bis bald. I üb bis dahin, ehrlich.",
    ],
    kontra: [
      "Ähm … doppelt? Darf i des?",
      "I trau mi jetzt einfach mal. Doppelt.",
      "Des stimmt doch net, oder? Doppelt.",
      "Ui. I sag dagege. Hoffentlich war des richtig.",
    ],
    blunder: [
      "{target}, du … Seggl? Darf mr des sage?",
      "Des war doch mei Stich, oder? Du … Dackel. Tschuldigung.",
      "Mei Onkel sagt da Grasdackel dazu. I sag lieber nix, {target}.",
      "Oh. Do hab i mi auf di verlasse, {target}.",
    ],
    robbed: [
      "Mei Ass … weg. Ui.",
      "{target}, des war doch mei Zehn. Oder? Ja, war’s.",
      "Ah, so geht des. Des schreib i mir auf.",
      "{target}, du Bachel. Oh, des isch mir rausgrutscht.",
    ],
    selfBlame: [
      "I Seggl. I hab scho wieder net mitzählt.",
      "Rolf, du Granateseggl. Ähm, tschuldigung, des gilt mir.",
      "Überreizt? I wollt doch bloß ja sage.",
      "I Halbdackel. Des Ass hätt i spiele müsse.",
    ],
    tease: [
      "{target}, des war jetzt aber au nix. Glaub i.",
      "Oh, verlore. Des passiert also net bloß mir.",
      "Überreizt? Do bin i ja beruhigt, {target}.",
      "Darf i des sage? Seggl. So, gsagt.",
    ],
  },

  // Schwätzer-Sigi: plappert ohne Punkt und Komma, meistens über den Schwager.
  schwaetzer: {
    greet: [
      "Grüß Gott, {name}! Hasch scho ghört, mei Schwager hat a neues Auto, a grünes, stell dir vor!",
      "Ha, der {title}! Hock di na, i erzähl dir glei, was bei uns in der Kehrwoch passiert isch!",
      "Grüß Gott mitnander, schön, dass ihr da seid, i hab heut so viel zu erzähle!",
      "Na endlich, i sitz scho a halbe Stund do und hab mit niemand gschwätzt!",
    ],
    bid: [
      "Ja, freilich, i halt, mei Schwager sagt immer, wer net reizt, der net gwinnt!",
      "Ja, ja, weiter, des erinnert mi an den Preisskat neunzehnhundertachtzig …",
      "Halt, halt, i mein ja, also ja, gell?",
      "Ja! Oder? Wart, ja, ganz sicher ja, glaub i.",
    ],
    pass: [
      "Passe, aber net weil i nix hab, also doch, aber psst.",
      "Passe. Mei Nachbarin sagt, i soll net immer so viel riskiere.",
      "Passe, und weisch was, des isch scho des dritte Mal heut.",
      "Passe. Mei Frau sagt, i soll öfter mal passe. Beim Reden, hat sie gmeint.",
    ],
    declare: [
      "So, jetzt spiel i, und dann erzähl i euch was über mein Schwager.",
      "Des spiel i, des hat mei Vadder scho so gspielt, und dem sei Vadder au!",
      "Aufpasse, des wird a Spiel, von dem red man no lang!",
      "I hab mir des genau überlegt, also so halb.",
    ],
    trickWon: [
      "Ha, der isch meiner, des hätt mei Schwager net besser gmacht!",
      "Siehsch, und dann hab i zu meiner Frau gsagt …",
      "Der Stich g’hört mir, wie die Kehrwoch diese Woch!",
      "Ha! Und des, obwohl i grad gschwätzt hab!",
    ],
    trickLost: [
      "Oh, den hab i net komme sehe, i war grad beim Erzähle.",
      "Na ja, wo war i stehe blieben? Ach ja, mei Schwager …",
      "Den gönn i dir, du hasch ja sonst nix zum Lache.",
      "Herrje, jetzt hab i vor lauter Schwätze die Trümpf vergesse.",
    ],
    gameWon: [
      "Gwonne! Des erzähl i morge der ganze Straße!",
      "Ha, {name}, des muss i glei meim Schwager verzähle!",
      "Gwonne, und des, obwohl i die ganze Zeit gredet hab!",
      "Siehsch, Schwätze und Spiele, des geht beides!",
    ],
    gameLost: [
      "Verlore, aber i weiß au warum: I hab zu viel verrate.",
      "Ha, {name}, du hasch ja zughört, des war net fair!",
      "Na ja, verlore, des passiert meim Schwager au dauernd.",
      "Jetzt hab i mi verschwätzt, glaub i.",
    ],
    ramsch: [
      "Ramsch! Weisch, wie mei Schwager amol beim Ramsch …",
      "Ramsch, des isch wie bei uns daheim, jeder schiebt’s dem andre zu!",
      "Ha, Ramsch, do muss i ja gar nix verrate, do hab i eh nix!",
      "Ramsch, do red i jetzt ausnahmsweis mal net. Also fast net.",
    ],
    order: [
      "A Sprudel, bitte, und hen Se scho ghört, was der Metzger erzählt?",
      "Für mi a Viertele Trollinger, und für mei Mundwerk a Brezel.",
      "A Kaffee bitte, und wisset Se, wer gestern im Rössle war?",
      "Maultasche, bitte! Die mag mei Schwager au so gern.",
    ],
    farewell: [
      "Ade, {name}, und grüß mir die Leut, i kenn sie zwar net, aber trotzdem!",
      "So, i muss, mei Frau wartet, die will au no was erzählt kriege.",
      "Ade mitnander, nächste Woch erzähl i den Rest!",
      "Gut Nacht, und wenn ihr mein Schwager seht: I hab gwonne. Fast.",
    ],
    kontra: [
      "Do sag i dagege, des hätt mei Schwager au gmacht!",
      "Doppelt! Des wird a Gschicht für morge!",
      "Halt, des glaub i dir net, doppelt, jawohl!",
      "Ha, do halt i dagege, und des erzähl i dann rum!",
    ],
    blunder: [
      "{target}, du Seggl, des hätt net amol mei Schwager gmacht, und der isch a Seggl!",
      "Ha, do schmiert der mir des Ass weg, du Grasdackel, des erzähl i der ganze Straße!",
      "Jetzt sag i dir was, du Lällebebbel, äh, des bin ja i, also du Halbdackel, {target}!",
      "Des war a Stich wie a Kehrwoch ohne Besen: völlig für nix, {target}!",
    ],
    robbed: [
      "Mei Zehn! Die hab i extra aufghobe, für mein Schwager sei Gschicht, {target}!",
      "{target}, des Ass hasch mir abgluchst, während i gredet hab, des isch unfair!",
      "Ha, jetzt isch mei Ass weg, und i wollt grad verzähle, dass i’s hab!",
      "Weisch, wie mei Nachbarin zu so oim sagt? Simpel. Des sag i jetzt au.",
    ],
    selfBlame: [
      "I Granateseggl, i hab vor lauter Schwätze die Karte verwechselt!",
      "Sigi, du Lällebebbel, erst denke, dann rede, sagt mei Frau, und i mach’s umgekehrt!",
      "I Dackel, des hab i doch selber verrate, gell?",
      "Überreizt, weil i grad vom Schwager verzählt hab, des zählt net, oder doch?",
    ],
    tease: [
      "{target}, des erzähl i morge beim Bäcker, aber nur deine Seite!",
      "Überreizt! Des hat mei Schwager au amol gmacht, der redet heut no net drüber!",
      "Ha, verlore! I sag’s koim, also koim außer meiner Frau, {target}!",
      "So a Spiel, do sagt mei Nachbarin: Hirbel. Aber lieb gmeint.",
    ],
    tell: [...SIGI_TELLS.long, ...SIGI_TELLS.void, ...SIGI_TELLS.hint],
  },

  // Oberlehrer Walter: belehrend, „Merke:“, spricht Hochdeutsch mit Rotstift.
  lehrer: {
    greet: [
      "Guten Abend, {name}. Setzen. Heute nehmen wir das Reizen durch.",
      "Grüß Gott. Merke: Wer pünktlich kommt, gibt nicht als Erster.",
      "Ah, der {title}. Schön, dann können wir anfangen. Ruhe bitte.",
      "Guten Abend. Ich habe die Skatordnung dabei, falls Fragen sind.",
    ],
    bid: [
      "Ja. Nach Lehrbuch ist das ein klares Ja.",
      "Ich halte. Merke: Reizen heißt rechnen, nicht raten.",
      "Ja. Spitzen mal Grundwert, das reicht.",
      "Gehalten. Das steht so im Lehrbuch.",
    ],
    pass: [
      "Passe. Merke: Wer überreizt, zahlt doppelt.",
      "Passe. Ein solches Blatt spielt man nicht, man trägt es.",
      "Passe. Das lehrt die Erfahrung.",
      "Passe. Ein Spiel ohne Trümpfe ist wie Unterricht ohne Kreide.",
    ],
    declare: [
      "So. Nun passen Sie gut auf, das ist Lehrstoff.",
      "Ich spiele, und zwar nach allen Regeln der Kunst.",
      "Angesagt. Mitschreiben ist erlaubt.",
      "Merke: Ein gutes Spiel beginnt beim Drücken.",
    ],
    trickWon: [
      "Merke: Ein Stich ist kein Mückenstich. Er tut nur dem anderen weh.",
      "Merke: Trumpf zieht Trumpf.",
      "Wie im Lehrbuch. Seite zwölf.",
      "Setzen. Eins.",
    ],
    trickLost: [
      "Hm. Das steht so nicht im Lehrbuch.",
      "Ein Fehler, aber ein lehrreicher.",
      "Das war gegen die Regel. Gegen meine jedenfalls.",
      "Notieren Sie das bitte nicht.",
    ],
    gameWon: [
      "Gewonnen. Merke: Ordnung schlägt Glück.",
      "Sehr schön, {name}. Daraus können Sie lernen.",
      "So macht man das. Klassenziel erreicht.",
      "Gewonnen, wie es die Skatordnung vorsieht.",
    ],
    gameLost: [
      "Verloren. Das bespreche ich nächste Stunde.",
      "Gut gespielt, {name}. Dafür gebe ich eine Zwei plus.",
      "Hm. Da hat das Lehrbuch eine Lücke.",
      "Nachsitzen. Für mich selber.",
    ],
    ramsch: [
      "Ramsch. Merke: Der Skat geht an den letzten Stich.",
      "Ramsch steht nicht in der Skatordnung, aber bitte.",
      "Wer keinen Stich macht, ist Jungfrau. Das verdoppelt.",
      "Ein Durchmarsch bringt hundertzwanzig. Nur zur Erinnerung.",
    ],
    order: [
      "Ein Viertele Lemberger, bitte. Im Henkelglas, wie es sich gehört.",
      "Einen Kaffee, bitte. Mit Milch, ohne Zucker.",
      "Eine Brezel. Die Form ist übrigens kein Zufall.",
      "Für mich eine Flädlesuppe, wenn noch was da ist.",
    ],
    farewell: [
      "Die Stunde ist um. Auf Wiedersehen, {name}.",
      "Hausaufgabe: Trümpfe zählen. Gute Nacht.",
      "Ich gehe. Die Hefte korrigieren sich nicht selbst.",
      "Auf Wiedersehen. Und schreiben Sie sauber, gell.",
    ],
    kontra: [
      "Merke: Wer das nicht gewinnt, zahlt doppelt.",
      "Einspruch. Das wird nachgeprüft.",
      "Das halte ich für falsch gerechnet. Doppelt.",
      "So nicht. Das zählt jetzt doppelt.",
    ],
    blunder: [
      "{target}, setzen. Sechs. Seggl.",
      "Merke: Man übertrumpft nicht den eigenen Partner, du Grasdackel.",
      "Ein Fehler wie aus dem Lehrbuch. Aus dem Kapitel Dackel.",
      "{target}, nachsitzen. Thema: Bedienen.",
    ],
    robbed: [
      "Meine Zehn. Das wird ein Nachspiel haben, {target}.",
      "{target}, das Ass gehörte mir. Das steht so in meinen Notizen.",
      "Merke: Wer ein Ass nimmt, nimmt elf Augen. Und meine Würde.",
      "Das war unpädagogisch, du Simpel.",
    ],
    selfBlame: [
      "Merke: Auch ein Oberlehrer kann ein Seggl sein.",
      "Das stand im Lehrbuch auf der nächsten Seite. Ich Granateseggl.",
      "Setzen, Walter. Sechs.",
      "Ein Fehler, und zwar meiner. Das unterstreiche ich rot.",
    ],
    tease: [
      "{target}, überreizt. Das hatten wir in der dritten Stunde.",
      "{target}, das Klassenziel ist nicht erreicht.",
      "Merke: Erst rechnen, dann reizen. Nicht umgekehrt.",
      "Ein Spiel zum Abschreiben. Bitte nicht abschreiben.",
    ],
  },

  // ’s Schlitzohr Fritz: listig, zwinkert, stellt Fallen.
  schlitzohr: {
    greet: [
      "Ja grüß di, {name}. Schön, dass du dei Geld mitbracht hasch.",
      "N’Abend, {title}. Hock di, i beiß net. Meistens.",
      "Grüß Gott. Heut bin i ganz harmlos. Ehrlich.",
      "Na, wer gibt? I misch net, sonst sagt ihr wieder was.",
    ],
    bid: [
      "Ja. Oder bluff i? Rat mal.",
      "Hm, ja. Mal sehe, wie weit du mitgehsch.",
      "I halt. Ganz unschuldig.",
      "Ja. Und jetzt gugg mir mal in die Auge.",
    ],
    pass: [
      "Passe. Oder doch net? Doch, passe.",
      "Passe. Mei Falle stell i woanders auf.",
      "Passe. Heut lass i euch mal laufe.",
      "Ha, passe. Aber merk dir des Blatt.",
    ],
    declare: [
      "So. Und jetzt schnappt die Falle zu.",
      "Des spiel i. Vielleicht hab i was, vielleicht net.",
      "Angesagt. Wer mitzählt, isch selber schuld.",
      "Ehrlich währt am längsten, sagt mr. Drum spiel i lieber kurz.",
    ],
    trickWon: [
      "Hoppla. Wer hat den do hingelegt?",
      "Gschnitte, gell? Des tut weh.",
      "ZACK. Rein in die Falle.",
      "Den hasch mir quasi gschenkt.",
    ],
    trickLost: [
      "Den lass i laufe. Mit Absicht, natürlich.",
      "Ha, du hasch’s gmerkt. Respekt.",
      "Na wart. Der nächste isch meiner.",
      "Gut. Jetzt weiß i, wo dei Dame sitzt.",
    ],
    gameWon: [
      "Hehe. Hasch die Falle gar net gsehe, {name}?",
      "Gschnitte, und zwar sauber.",
      "So gwinnt man: mit am Lächle.",
      "Sag nix, {title}. Lern was draus.",
    ],
    gameLost: [
      "Hoppla. Do bin i in mei eigene Falle tappt.",
      "Respekt, {name}. Di muss i im Aug behalte.",
      "Der Schnitt ging daneben. Kommt vor.",
      "Ha, verlore. Aber schön gspielt war’s trotzdem.",
    ],
    ramsch: [
      "Ramsch. Do kann man wunderbar schmiere.",
      "Ramsch? Dann schieb i euch die Augen zu, ganz lieb.",
      "Beim Ramsch gwinnt der Listigste. Also i.",
      "Ramsch. Jetzt wird’s gemütlich. Für mi.",
    ],
    order: [
      "A Kirschwässerle. Klein. Ganz klein.",
      "A Kaffee, und den Zucker extra, gell.",
      "Für mi a Brezel. Des Mittelstück, wenn’s geht.",
      "Schreibet Se’s beim Nachbartisch auf.",
    ],
    farewell: [
      "Ade, {name}. Pass auf dein Geldbeutel auf, gell.",
      "So, i verschwind. Wie a Fuchs.",
      "Gut Nacht. Und wenn oiner fragt: I war gar net do.",
      "Bis bald. I hab mir alles gmerkt.",
    ],
    kontra: [
      "Ha, do bisch mir zu sicher. Doppelt.",
      "Nanana. Des riecht nach Falle. Doppelt.",
      "Do halt i dagege. Mit am Lächle.",
      "Schau mer mal, wer hier wen reinlegt.",
    ],
    blunder: [
      "{target}, du Seggl. Des war mei Falle, net deine.",
      "Hehe, du Halbdackel. Jetzt sin mir beide neigfalle.",
      "Mei schöner Plan, und du schmierst mir dazwische, {target}!",
      "Gschickt, gschickt. Für en Grasdackel.",
    ],
    robbed: [
      "Mei Ass? Des hab i dir hingelegt. Glaubsch des, {target}?",
      "{target}, du Schlawiner. Mei Zehn. Respekt.",
      "Hoppla. Do hat mi oiner abgstaubt.",
      "Na wart, du Bachel. Des kriegsch zrück. Mit Zinse.",
    ],
    selfBlame: [
      "In die eigene Falle. I Granateseggl.",
      "Fritz, du Dackel. Zu fein gschnitte.",
      "Hehe. Des war jetzt aber koi Absicht. Ehrlich.",
      "Do hab i mi selber reinglegt. Des isch die Höchststraf.",
    ],
    tease: [
      "{target}, überreizt? Des hätt i dir vorher sage könne. Hab i aber net.",
      "Hehe. Wer hoch reizt, fällt tief, {target}.",
      "Des war a schöne Falle. Leider deine eigene.",
      "Die Falle hasch dir selber gstellt, {target}.",
    ],
  },

  // Kommandant Heiner: Feuerwehrkommandant, kurz und knapp im Befehlston.
  kommandant: {
    greet: [
      "Antreten! Grüß Gott, {name}.",
      "Kommandant Heiner, zur Stelle. Karte raus!",
      "Lage: drei Mann, ein Tisch. Einsatz beginnt.",
      "Ah, der {title}. Wegtreten verboten, jetzt wird gspielt!",
    ],
    bid: [
      "Ja! Weiter!",
      "Gehalten! Nächste Stufe!",
      "Ja. Zack, zack.",
      "Einsatzstufe achtzehn? Bestätigt!",
    ],
    pass: [
      "Passe. Rückzug, geordnet.",
      "Passe. Kein Einsatz bei dieser Lage.",
      "Negativ. Passe.",
      "Passe. Schlauch einrollen.",
    ],
    declare: [
      "Wasser marsch!",
      "Einsatz! Alle Mann an die Spritze!",
      "Angriff! Auf mein Kommando!",
      "Alarm! Jetzt wird gspielt!",
    ],
    trickWon: [
      "Treffer!",
      "Zack! Brandherd gelöscht.",
      "Der g’hört der Wehr.",
      "Sauber. Nächster!",
    ],
    trickLost: [
      "Rückschlag. Weiter vorrücken!",
      "Sapperlot. Funkenflug.",
      "Der war verlore. Abhaken.",
      "Lage neu beurteilen!",
    ],
    gameWon: [
      "Einsatz beendet. Lage unter Kontrolle!",
      "Sieg! Antreten zum Aufschreiben!",
      "Gut gmacht, {name}! Für einen Zivilisten.",
      "Feuer aus! So macht man des.",
    ],
    gameLost: [
      "Rückzug! Geordnet!",
      "Einsatz gescheitert. Nachbesprechung morge.",
      "Respekt, {name}. Saubere Arbeit.",
      "Abgebrannt. Bis auf die Grundmauern.",
    ],
    ramsch: [
      "Ramsch! Jeder löscht sein eigenes Feuer!",
      "Ramsch. Keine Augen aufnehmen, das ist ein Befehl!",
      "Alle hen passt? Alarmstufe Ramsch!",
      "Ramsch. Augen weg wie Glut vom Heuboden!",
    ],
    order: [
      "Frau Wirtin! Einmal Maultasche, im Laufschritt!",
      "Einen Sprudel! I hab heut Bereitschaft.",
      "A Halbe, bitte. Übung isch vorbei.",
      "Kaffee! Schwarz! Wie bei der Nachtübung.",
    ],
    farewell: [
      "Wegtreten! Ade mitnander.",
      "Einsatz beendet. Abrücken.",
      "Gute Nacht, {name}. Die Wache ruft.",
      "I muss. Morge früh isch Übung.",
    ],
    kontra: [
      "Gegenangriff! Doppelt!",
      "Halt! Des lass i net durch!",
      "Lage ernst. I halt dagege.",
      "Alarmstufe zwei! Des zählt doppelt!",
    ],
    blunder: [
      "{target}, Befehlsverweigerung! Seggl!",
      "Wer schmiert auf eigene Faust? Du Granateseggl!",
      "Falscher Schlauch, falsches Feuer, {target}!",
      "Rindvieh! Des war a Rückzug in die falsche Richtung!",
    ],
    robbed: [
      "Mei Ass! Feindbeschuss, {target}!",
      "{target}, die Zehn war Ausrüstung der Wehr!",
      "Verlust gemeldet: eine Zehn. Täter: Hornochs.",
      "Sapperlot! Ausgeräuchert!",
    ],
    selfBlame: [
      "Kommandant an Kommandant: Du Seggl!",
      "Einsatz falsch geplant. I Granateseggl.",
      "Fehlalarm. Von mir ausgelöst. Dackel.",
      "Rückzug. Nachbesprechung mit mir selber.",
    ],
    tease: [
      "{target}, Lage verloren! Wegtreten!",
      "{target}, überreizt. Leiter zu kurz.",
      "Einsatz gescheitert. Ab zur Übung!",
      "Des Feuer hat di glöscht, {target}.",
    ],
  },

  // Die Wirtin Lore: resolut und herzlich, führt das Haus und spielt nebenher.
  wirtin: {
    greet: [
      "Grüß Gott, {name}! Hock di na, i bring glei was.",
      "Ah, der {title}! Schön, dass d’ wieder do bisch.",
      "So, mir fehlt grad oiner am Tisch. Gut, dass du kommsch, Bub.",
      "Grüß Gott. Schuh abstreife, Karte mische, des isch die Hausordnung.",
    ],
    bid: [
      "Ja. Und jetzt net trödle, i hab Gäst.",
      "I halt. Mach weiter, Bub.",
      "Ja, gell. Des geht no.",
      "Ja. Aber schnell, die Supp kocht.",
    ],
    pass: [
      "Passe. I muss eh glei in d’ Küch.",
      "Passe. Ihr macht des scho.",
      "Na, passe. Do hab i Bessers zu tun.",
      "Passe. Und koiner schaut in mei Blatt, gell!",
    ],
    declare: [
      "So, des spiel i. Und dann gibt’s Esse.",
      "Jetzt passet auf, die Wirtin spielt.",
      "Des spiel i. Zwischen zwoi Bestellunge.",
      "Net mei Tisch, sagsch? Bub, des ganze Haus isch mei Tisch.",
    ],
    trickWon: [
      "So. Der isch meiner.",
      "Gell, do schausch.",
      "Den nehm i mit in d’ Küch.",
      "Sauber. Wie a frisch gwischter Tisch.",
    ],
    trickLost: [
      "Na, nimm’n halt.",
      "Ui. Den hab i verschwitzt.",
      "Macht nix. Des holet mir nach.",
      "Do war i mit de Gedanke grad bei Tisch drei.",
    ],
    gameWon: [
      "Gwonne. Und die Gläser sin au no voll.",
      "Siehsch, {name}, die Lore kann’s no.",
      "So. Des Haus gwinnt. Wie immer, gell.",
      "Gwonne. Jetzt bring i erst mal Brezeln.",
    ],
    gameLost: [
      "Na, gratuliere, {name}. Hasch verdient.",
      "Verlore. Des isch mir wurscht, i hab ja die Wirtschaft.",
      "Ui, des war nix. I war mit em Kopf in der Küch.",
      "Na gut. Dafür kriegsch koin Nachtisch. Spaß!",
    ],
    ramsch: [
      "Ramsch. Jetzt wird aufgräumt wie bei der Kehrwoch.",
      "Ramsch! Des Häufle Augen kriegt der, wo’s verdient.",
      "Koiner traut sich? Na, dann Ramsch.",
      "Bei mir im Haus wird Ramsch gspielt, wenn alle passe. Basta.",
    ],
    order: [
      "I hol mir selber an Kaffee, sonst macht’s ja koiner.",
      "So, wer wollt die Halbe? Und wer des Weizen?",
      "Brezeln für alle, aufs Haus. Aber nur heut.",
      "I nehm a Sprudel. Im Dienst gibt’s nix anders.",
    ],
    farewell: [
      "Ade, {name}. Und komm bald wieder, gell!",
      "So, Sperrstund. Raus mit euch, aber freundlich.",
      "Gut Nacht. Und fahr vorsichtig heim.",
      "Ade mitnander. Die Stühl stell i selber hoch.",
    ],
    kontra: [
      "Ha! Net in meim Haus. Doppelt.",
      "Des lass i mir von dir net biete.",
      "So. Jetzt wird’s ernst, Bub.",
      "Do halt i dagege. Und zwar resolut.",
    ],
    blunder: [
      "Du bisch mir a Seggl. Aber a liebs, {target}.",
      "{target}, du Grasdackel! In meim Haus schmiert mr net so!",
      "Heilandsack, des war mei Stich! Und du trägsch nachher die Gläser, gell!",
      "Do schaff i den ganze Tag, und du verschenksch mir des Spiel, du Halbdackel.",
    ],
    robbed: [
      "{target}, mei Ass! Des setz i dir auf d’ Rechnung.",
      "Na wart. Mei Zehn, des merk i mir.",
      "Do klaut mir oiner im eigene Haus die Zehn. Sauber, {target}.",
      "Ha, gschickt. Aber Nachtisch kriegsch koin.",
    ],
    selfBlame: [
      "I Seggl! I war mit em Kopf bei der Supp.",
      "Lore, du Granateseggl. Des hättsch sehe müsse.",
      "Des kommt davon, wenn mr nebenher Gläser spült.",
      "Do hab i mi verzählt. I, die Wirtin! Dackel.",
    ],
    tease: [
      "{target}, des war nix. Aber a Brezel gibt’s trotzdem.",
      "Überreizt, gell. Des passiert in de beste Häuser. Au in meim.",
      "Hasch dir des schöner vorgstellt, {target}?",
      "Verlore. Do gibt’s nix zum Mecker, des Haus hat gwonne.",
    ],
  },

  // Der alte Gottlob: weise, wortkarg, Preisskat-Legende.
  altmeister: {
    greet: [
      "Grüß Gott.",
      "So. {name}. Hock di.",
      "N’Abend, {title}.",
      "Wer gibt?",
    ],
    bid: [
      "Ja.",
      "Hm. Ja.",
      "Weiter.",
      "Freilich.",
    ],
    pass: [
      "Passe.",
      "Noi.",
      "Lass.",
      "Passe. Heut net.",
    ],
    declare: [
      "So.",
      "Des spiel i.",
      "Wie anno achtundfünfzig.",
      "Gugg zu, {title}.",
    ],
    trickWon: [
      "Hm. So.",
      "Recht so.",
      "Gell.",
      "So isch’s recht.",
    ],
    trickLost: [
      "Soll sei.",
      "Hm. Gut gspielt.",
      "Den hab i komme sehe.",
      "Na also.",
    ],
    gameWon: [
      "So. Wie früher.",
      "Des Spiel kenn i, seit i denke kann.",
      "Merk dir des, {name}.",
      "Neunzehnhundertsechzig, Preisskat in Vaihingen. Genau so.",
    ],
    gameLost: [
      "Hm. Respekt.",
      "Gut, {name}. Sehr gut.",
      "Des passiert. Au mir.",
      "Do hasch mi.",
    ],
    ramsch: [
      "Ramsch. Hm.",
      "Ramsch hen mir früher net gspielt.",
      "Ramsch. Na gut.",
      "Jeder für sich.",
    ],
    order: [
      "A Viertele.",
      "Wie immer.",
      "A Brezel.",
      "A Tass Kaffee, bitte.",
    ],
    farewell: [
      "Ade.",
      "Gut Nacht, {name}.",
      "Alt bin i net. I hab bloß früher angfange.",
      "Spiel fleißig, {title}.",
    ],
    kontra: [
      "Doppelt.",
      "Noi. Doppelt.",
      "Des net.",
      "Hm. Dagege.",
    ],
    blunder: [
      "Seggl.",
      "Dackel, {target}.",
      "Hm. Bachel.",
      "Granateseggl, {target}.",
    ],
    robbed: [
      "Soso.",
      "Hm. Mei Ass, {target}.",
      "Gschnappt.",
      "Merk i mir.",
    ],
    selfBlame: [
      "Alter Dackel.",
      "Hm. Seggl, i.",
      "Des war i. Hm.",
      "Zu alt für so was. Noi. Zu dumm.",
    ],
    tease: [
      "Zu hoch, {target}.",
      "Hm. Überreizt.",
      "Lehrgeld, {target}.",
      "Hab’s gwusst.",
    ],
  },
};

export const SPEECH: SpeechBook = { ...REGULAR_SPEECH, ...GUEST_SPEECH, ...DUO_SPEECH };

export { DUO_EXCHANGES };

/**
 * The scolding situations (contract §0.9): `blunder` (someone spoilt the speaker's trick or plan), `robbed` (his Ass or
 * Zehn was just taken), `tease` (the declarer just lost or overbid) may address {target}; `selfBlame` scolds himself.
 * {target} stands only as a vocative at the start („{target}, du Seggl!“) or at the end („Du Seggl, {target}!“).
 */
export const TARGET_SITUATIONS = ["blunder", "robbed", "tease"] as const;

/**
 * Fill {target} with the short name of the one addressed, or drop it cleanly when there is none:
 * „{target}, du Seggl!“ → „Karl, du Seggl!“ or „Du Seggl!“; „Des war nix, {target}.“ → „Des war nix.“
 */
export function fillTarget(line: string, target?: string): string {
  if (target) return line.replace("{target}", target);
  let out = line.replace(/^\{target\}, /, "").replace(/, \{target\}(?=[.!?…“]*$)/, "");
  out = out.replace("{target}", "").replace(/ {2,}/g, " ").trim();
  return out.charAt(0).toUpperCase() + out.slice(1);
}
