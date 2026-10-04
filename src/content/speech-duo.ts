// The village duo (contract §0.9, §4.5): Schultes Häfele, the vain mayor who thinks he is the best Skat player in
// the district, makes speeches and is usually wrong, and Amtsbote Gottfried, his clerk, who says „Jawohl, Herr
// Schultes“ and then does what is right — and wins. The tone of a dry village comedy: wordplay, things taken
// literally, the pompous one and the sly one. Everything self-invented. Merged into SPEECH in speech.ts.
//
// They usually sit together. Lines that address the partner contain the word in DUO_PARTNER_WORD; when the partner is
// not at the table, the table should skip those lines.
import type { SpeechBook } from "../game/types.ts";

/** A line containing this word addresses the partner; skip it when the partner is not at the table. */
export const DUO_PARTNER_WORD = { schultes: "Gottfried", amtsbote: "Herr Schultes" } as const;

export const DUO_SPEECH: SpeechBook = {
  // Schultes Häfele: gespreizt, Amtsdeutsch mit schwäbischem Unterfutter, hält Reden, liegt meistens daneben.
  schultes: {
    greet: [
      "Grüß Gott, grüß Gott! Der Schultes isch da, die Sitzung isch eröffnet.",
      "Ah, {name}! Heut dürfet Sie gegen den besten Spieler im Landkreis antreten. Mich.",
      "Meine sehr verehrten Damen und Herren, im Namen der Gemeinde: Wer gibt?",
      "Gottfried, rücket Se mir den Stuhl zurecht. Der {title} soll sehen, wie mr Platz nimmt.",
    ],
    bid: [
      "Selbstverständlich! Ein Schultes geht immer mit.",
      "Weiter. Das hab ich im Gemeinderat schon so beschlossen.",
      "Ich bin dabei. Einstimmig, mit meiner Stimme.",
      "Höher! Mir sind doch hier net in Hintertupfingen.",
    ],
    pass: [
      "Passe. Aus taktischen Erwägungen, die ich jetzt net erläutern kann.",
      "Ich verzichte. Großzügig, wie immer.",
      "Passe. Gottfried, schreibet Se ins Protokoll: freiwillig.",
      "Diesmal lass ich dem Volk den Vortritt.",
    ],
    declare: [
      "Meine sehr verehrten Damen und Herren: Ich spiele!",
      "Das wird ein Spiel für die Ortschronik.",
      "Gottfried, holet Se schon mal die Urkunde.",
      "Passet Se auf, so spielt mr das in der Kreisstadt.",
    ],
    trickWon: [
      "Wie geplant. Steht so im Haushaltsplan.",
      "Der Stich geht an die Gemeinde.",
      "Applaus darf gespendet werden.",
      "Gottfried, notieret Se: wieder der Schultes.",
    ],
    trickLost: [
      "Den hab ich der Opposition überlassen. Demokratie.",
      "Ein kleiner Rückschlag im Verwaltungsablauf.",
      "Das war so net vorgesehen. Gottfried, warum war das net vorgesehen?",
      "Den Stich leg ich dem Ausschuss vor.",
    ],
    gameWon: [
      "Wie ich’s gsagt hab! Ich sag’s ja immer, und dann stimmt’s auch.",
      "Ein Sieg für die ganze Gemeinde. Vor allem für mich.",
      "Das, {name}, nennt mr Amtsführung.",
      "Gottfried, das kommt ins Amtsblatt. Mit Bild.",
    ],
    gameLost: [
      "Das Ergebnis wird angefochten. Später.",
      "Formfehler. Eindeutig ein Formfehler.",
      "Gratuliere, {name}. Das war Glück, aber ich gönn’s Ihnen von Amts wegen.",
      "Das hätt jeder verloren. Jeder! Gottfried, saget Se auch was.",
    ],
    ramsch: [
      "Ramsch? In meiner Gemeinde? Na gut, wenn’s der Bürger so will.",
      "Ramsch. Da muss ein Schultes mit gutem Beispiel vorangehen. Nach hinten.",
      "Ich übernehme die Verantwortung. Aber keine Augen.",
      "Wer hat den Ramsch beantragt? Abgelehnt. Zu spät? Dann halt.",
    ],
    order: [
      "Für mich ein Viertele. Auf die Gemeindekasse. Kleiner Scherz.",
      "Einen Kaffee, bitte, und einen Teller Maultaschen für meinen Amtsboten.",
      "Bringet Se dem Tisch Brezeln. Der Schultes lädt ein. Gottfried, zahlet Se.",
      "Ein Sprudel. Ich hab morgen früh eine Rede.",
    ],
    farewell: [
      "Die Sitzung ist geschlossen. Ade mitnander!",
      "Ich muss, morgen wird ein Bushäusle eingeweiht.",
      "Auf Wiedersehen, {name}. Sie dürfet erzählen, dass Sie gegen mich gespielt haben.",
      "Gottfried, den Mantel. Die Liste lassen mir am besten liegen.",
    ],
    kontra: [
      "Einspruch! Das wird doppelt verhandelt.",
      "Das lass ich net durchgehen, das kommt vor den Gemeinderat.",
      "Widerspruch, und zwar amtlich.",
      "Das zählt jetzt doppelt. Ich hab’s nachgeschlagen. Ungefähr.",
    ],
    blunder: [
      "{target}, Sie Halbdackel, das war gegen den Beschluss!",
      "Das war ja ein Allmachtsseggl-Zug. Unerhört!",
      "Im Gemeinderat hätt mr Sie dafür abgewählt, {target}!",
      "Herrgott, Gottfried! Sie Simpel, das war doch mein Stich!",
    ],
    robbed: [
      "Mein Ass! Das war Gemeindeeigentum, {target}!",
      "Diebstahl am helllichten Tag. Gottfried, holet Se die Polizei. Halt, net wirklich.",
      "{target}, Sie Grasdackel, die Zehn war für die Ortschronik vorgesehen!",
      "Das wird ein Nachspiel haben. Im Amtsblatt.",
    ],
    selfBlame: [
      "Ich Granateseggl! Das bleibt aber unter uns, gell?",
      "Überreizt. Das passiert mir sonst nur beim Haushalt.",
      "Kruzifix, da hab ich mich selber abgewählt.",
      "Gottfried, das war ein Fehler. Von Ihnen. Ich hab bloß ausgeführt.",
    ],
    tease: [
      "Tja, das Volk hat gesprochen, {target}.",
      "Ein Antrag zu viel. Abgelehnt, {target}!",
      "So geht’s, wenn mr sich überschätzt. Gell, {target}?",
      "Überreizt? Da hätt ich Ihnen gern vorher eine Rede gehalten.",
    ],
  },

  // Amtsbote Gottfried: wortkarg, bauernschlau, nimmt alles wörtlich und gewinnt am Ende.
  amtsbote: {
    greet: [
      "Grüß Gott. I bin bloß der Amtsbote. I spiel halt mit.",
      "N’Abend, {name}. Die Karten hab i scho zählt. Sind alle da.",
      "Jawohl, Herr Schultes, i setz mi. Hinter Sie, wie immer. Also neben Sie.",
      "Grüß Gott, {title}. Nehmet Se’s net persönlich, wenn i gwinn.",
    ],
    bid: [
      "Jawohl.",
      "Wenn’s sei muss.",
      "I geh halt mit. Hab ja sonst nix vor.",
      "Jawohl, Herr Schultes. Trotzdem weiter.",
    ],
    pass: [
      "Noi, lieber net.",
      "Passe. Steht so in der Dienstanweisung.",
      "Passe. Mei Blatt hat heut Ruhetag.",
      "Jawohl, Herr Schultes, i pass. Sie wellet ja eh.",
    ],
    declare: [
      "Dann spiel halt i.",
      "I tät sage, des spiel i. Wenn’s recht isch.",
      "Jawohl, des wird gspielt. Ohne Rede.",
      "Ganz ohne Festakt, Herr Schultes. Bloß gspielt.",
    ],
    trickWon: [
      "Aha.",
      "Der lag grad so da.",
      "Den nimm i mit, der stört sonst bloß.",
      "Jawohl. Abgeheftet.",
    ],
    trickLost: [
      "Au recht.",
      "Den hab i abgegeben. Auf dem Dienstweg.",
      "Hm. Der kommt wieder.",
      "Den buch i unter Sonstiges.",
    ],
    gameWon: [
      "Gwonne. Ganz ohne Rede.",
      "Jawohl. Des wär dann erledigt.",
      "Herr Schultes, Sie hen recht ghabt: Es hat oiner gwonne. I.",
      "Des schreib i ins Protokoll, {name}. Kurz.",
    ],
    gameLost: [
      "Verlore. Des kommt vor, sogar im Rathaus.",
      "Gut gspielt, {name}. Des sag i aber bloß inoffiziell.",
      "Jawohl, Herr Schultes. Mir hen grad verlore.",
      "Des Spiel lag schief. Wie die Ortstafel am Ortsausgang.",
    ],
    ramsch: [
      "Ramsch. Dann sammle mer halt nix.",
      "Jawohl. Koine Augen, koi Ärger.",
      "Beim Ramsch isch der Dümmste der Klügste. I stell mi dumm.",
      "Ramsch. Den hat der Herr Schultes beantragt, ohne dass er’s gmerkt hat.",
    ],
    order: [
      "A Sprudel, bitte. I muss nachher den Herrn Schultes heimfahre.",
      "A Kaffee. Schwarz, wie die Zahlen in der Gemeindekasse.",
      "A Brezel, bitte. Mit Salz, ohne Rede.",
      "Für mi a Spezi. Und a Quittung, sonst glaubt mir’s koiner.",
    ],
    farewell: [
      "So. Dienstschluss. Ade.",
      "I geh dann. Der Bericht schreibt sich net von allei.",
      "Ade, {name}. Und net weitersage, wer gwonne hat.",
      "Jawohl, Herr Schultes, i hol den Mantel. Und d’ Liste.",
    ],
    kontra: [
      "Des tät i so net unterschreibe.",
      "Doppelt, bitte. Mit Durchschlag.",
      "Do leg i Widerspruch ei. Fristgerecht.",
      "Jawohl. Dagege.",
    ],
    blunder: [
      "{target}, Sie Seggl. Mit Verlaub.",
      "Des war jetzt a bissle a Dackel-Zug, {target}.",
      "Herr Schultes, des war mei Stich. Sie Granateseggl, mit Verlaub.",
      "Hm. Bachel. Des schreib i aber net ins Protokoll.",
    ],
    robbed: [
      "Mei Ass. Des hätt i gern zurück, {target}.",
      "{target}, Sie Lällebebbel, die Zehn hat mir ghört. Laut Grundbuch.",
      "Weg isch se. Wie die Akten im Keller.",
      "Jawohl. Mitgnomme. Notiert.",
    ],
    selfBlame: [
      "I Dubbel.",
      "Des war jetzt amtlich dumm.",
      "I Hornochs hab mi verzählt. Des isch mir seit einundsechzig net passiert.",
      "Do hätt i auf den Herrn Schultes höre solle. Na ja. Fast.",
    ],
    tease: [
      "Verlore. Des wird abgeheftet, {target}.",
      "{target}, des war schee. Schee daneben.",
      "Überreizt. Do hilft au koi Antrag mehr.",
      "Sie hen ja fast so hoch greizt wie der Herr Schultes, {target}.",
    ],
  },
};

/**
 * Two-bubble exchanges for when both sit at the same table, keyed by the situation of the Schultes (he speaks
 * first, the Amtsbote answers). The table may show one instead of a single line.
 */
export const DUO_EXCHANGES: Partial<Record<string, { schultes: string; amtsbote: string }[]>> = {
  greet: [
    { schultes: "Gottfried, stellet Se mich vor.", amtsbote: "Des isch der Herr Schultes. Er hält sich für den Besten im Landkreis." },
    { schultes: "Gottfried, haben Sie die Karten dabei?", amtsbote: "Jawohl, Herr Schultes. Alle zweiunddreißig. Sogar die guten." },
  ],
  bid: [
    { schultes: "Gottfried, wie hoch darf ich reizen?", amtsbote: "So hoch Sie wellet, Herr Schultes. Verlieren dürfet Sie au." },
  ],
  pass: [
    { schultes: "Gottfried, ich pass. Sie dürfet.", amtsbote: "Jawohl, Herr Schultes. I hab eh scho." },
  ],
  declare: [
    { schultes: "Gottfried, jetzt passet Se auf und lernet was.", amtsbote: "Jawohl, Herr Schultes. I schreib mit, was mr net macht." },
  ],
  trickWon: [
    { schultes: "Gottfried, haben Sie das gesehen?", amtsbote: "Jawohl, Herr Schultes. Mit dem Ass sticht jeder." },
  ],
  trickLost: [
    { schultes: "Gottfried, warum hab ich den Stich net?", amtsbote: "Weil i ihn hab, Herr Schultes." },
  ],
  gameWon: [
    { schultes: "Gottfried, das kommt ins Amtsblatt!", amtsbote: "Jawohl, Herr Schultes. Unter Vermischtes." },
  ],
  gameLost: [
    { schultes: "Gottfried, merket Se sich des: So spielt mr Skat!", amtsbote: "Jawohl, Herr Schultes. Mir hen grad verlore." },
    { schultes: "Gottfried! Sie hen gegen Ihren eigenen Schultes gwonne!", amtsbote: "Jawohl, Herr Schultes. Dienst isch Dienst." },
  ],
  ramsch: [
    { schultes: "Gottfried, beim Ramsch gewinnt, wer am wenigsten hat.", amtsbote: "Jawohl, Herr Schultes. Dann gwinnt heut d’ Gemeindekasse." },
  ],
  order: [
    { schultes: "Gottfried, bestellet Se was für mich.", amtsbote: "Für den Herrn Schultes a Sprudel. Er hält morge a Rede." },
  ],
  kontra: [
    { schultes: "Gottfried, was heißt Kontra auf Amtsdeutsch?", amtsbote: "Widerspruch. Und Re heißt Widerspruch gegen den Widerspruch." },
  ],
  selfBlame: [
    { schultes: "Gottfried, wer hat da überreizt?", amtsbote: "Sie, Herr Schultes. I hab’s protokolliert." },
  ],
  blunder: [
    { schultes: "Gottfried, Sie Halbdackel, das war mein Stich!", amtsbote: "Jawohl, Herr Schultes. Jetzt isch’s meiner." },
  ],
  tease: [
    { schultes: "Gottfried, haben Sie das gesehen? Überreizt!", amtsbote: "Jawohl, Herr Schultes. Genau wie Sie letzte Woch." },
  ],
  farewell: [
    { schultes: "Gottfried, wir gehen.", amtsbote: "Jawohl, Herr Schultes. I fahr. Sie hen ja Ihr Viertele ghabt." },
  ],
};
