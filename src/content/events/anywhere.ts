// "Unterwegs" events that can happen in every region (contract §4.10: 20 for anywhere). Camper-specific scenes
// require `vehicle: "camper"`, so tours with the Gespann skip them.
import type { EventDef } from "../../game/types.ts";

export const ANYWHERE_EVENTS: EventDef[] = [
  // ─── Kehrwoche auf dem Stellplatz ──────────────────────────────────────────────────────────────────────
  {
    id: "any-kehrwoche", pool: "anywhere",
    title: "Kehrwoche", art: "kehrwoche", music: "stellplatz",
    text: "Morgens um sieben klopft es. Draußen steht eine Frau in Kittelschürze, den Reisigbesen in der Hand. „Grüß Gott. Diese Woch hat der Platz Kehrwoch, und Sie stehet auf dem Platz.“ Vor deinem Platz liegt genau ein Blatt.",
    choices: [
      {
        text: "Den Besen nehmen und den Platz kehren.",
        outcomes: [{ outcome: {
          text: "Du kehrst, sie schaut zu. Am Ende nickt sie, ein einziges Mal, und drückt dir eine Thermoskanne mit Kaffee in die Hand. „Die hat mei Mann nie benutzt.“",
          souvenir: "thermos",
          chronicle: "Auf dem Stellplatz in {place} die Kehrwoche bestanden.",
        } }],
      },
      {
        text: "„Ich bin doch nur auf der Durchreise.“",
        outcomes: [{ outcome: {
          text: "„Durchreise isch koi Ausred.“ Sie drückt dir den Besen in die Hand und bleibt stehen, bis das Blatt im Eimer ist. Der Kaffee wird kalt, der Platz ist sauber.",
        } }],
      },
      {
        text: "{dog} holt die Kehrschaufel.",
        req: { dog: "any" }, blue: true,
        outcomes: [{ outcome: {
          text: "{dog} trägt ihr die Kehrschaufel hin und wedelt. Die strenge Frau schmilzt wie Butter in der Pfanne. „So an braver Hund!“ Sie steckt dir zwei Mark zu, für eine Wurst.",
          marks: 2,
        } }],
      },
    ],
  },

  // ─── Stau und die Frage nach der Umleitung ─────────────────────────────────────────────────────────────
  {
    id: "any-stau", pool: "anywhere",
    title: "Stau vor der Baustelle", art: "traffic-jam",
    text: "Hinter der Kurve steht alles. Vorne blinkt eine Baustellenampel, daneben ein gelbes Schild: Umleitung. Der Fahrer im Wagen neben dir kurbelt das Fenster runter. „Des dauert. Die Umleitung geht über drei Dörfer, und koiner weiß, über welche.“",
    choices: [
      {
        text: "Motor aus und warten.",
        outcomes: [{ outcome: {
          text: "Du packst eine Brezel aus. Der Nachbar löst ein Kreuzworträtsel und fragt: „Stillstand mit vier Buchstaben?“ – „Stau.“ Er freut sich wie ein Kind. Nach einer Stunde springt die Ampel auf Grün.",
        } }],
      },
      {
        text: "Der Umleitung nach.",
        outcomes: [
          { outcome: {
            text: "Die Umleitung führt durch drei Dörfer und ein viertes, das auf keiner Karte steht. Irgendwann bist du wieder auf der richtigen Straße, eine Stunde und einen Strich Sprit später.",
            fuel: -1,
          } },
          { outcome: {
            text: "Die Umleitung ist kürzer als die Straße. Im Vorbeifahren winkst du den Leuten im Stau zu. Der Mann mit dem Kreuzworträtsel winkt nicht zurück.",
          } },
        ],
      },
      {
        text: "Im Straßenatlas nach einem Feldweg suchen.",
        req: { souvenir: "road-atlas" }, blue: true,
        outcomes: [{ outcome: {
          text: "Im Atlas ist ein dünner gelber Strich eingezeichnet, zwischen Obstwiesen hindurch. Er stimmt. Zehn Minuten später bist du hinter der Baustelle, und ein Bauer auf dem Traktor grüßt anerkennend.",
          chronicle: "Den Stau in {place} mit dem Straßenatlas über einen Feldweg umfahren.",
        } }],
      },
    ],
  },

  // ─── Hocketse, am Nebentisch fehlt der dritte Mann ─────────────────────────────────────────────────────
  {
    id: "any-hocketse", pool: "anywhere",
    title: "Hocketse", art: "hocketse",
    text: "Im Ort ist Hocketse: Bierbänke unter Lampions, Blechkuchen, ein Akkordeon. Am Nebentisch sitzen zwei mit Karten und einem leeren Stuhl. „Uns fehlt der dritte Mann“, sagt der Maurer-Karle. Null-Eugen grinst schon.",
    choices: [
      {
        text: "„Ich bin der dritte Mann.“",
        outcomes: [{ outcome: {
          text: "Der Maurer-Karle rückt zur Seite, Null-Eugen mischt. Das Akkordeon spielt einen Walzer, und ihr spielt Skat.",
          skat: {
            opponents: ["maurer", "nullfuchs"], houseRule: "ramsch", games: 3, stakes: "small",
            intro: "Auf der Bierbank wird gemischt. Hier gilt: Passen alle, wird Ramsch gespielt.",
          },
          chronicle: "Auf der Hocketse in {place} als dritter Mann eingesprungen.",
        } }],
      },
      {
        text: "Erst ein Stück Zwetschgenkuchen holen.",
        req: { marks: 1 },
        outcomes: [{ outcome: {
          text: "Der Kuchen ist noch warm, die Sahne kommt frisch aus der Spritztüte. Als du zurückkommst, sitzt schon ein anderer auf dem leeren Stuhl. Der Kuchen war es trotzdem wert.",
          marks: -1,
        } }],
      },
      {
        text: "Den Stammtischwimpel auf den Tisch stellen.",
        req: { souvenir: "pennant" }, blue: true,
        outcomes: [{ outcome: {
          text: "„A Stammtischler!“ Der Maurer-Karle steht auf und gibt dir die Hand, Null-Eugen holt eine Blechdose. Jetzt wird es ernst: Die Skatkasse kommt auf den Tisch.",
          skat: {
            opponents: ["maurer", "nullfuchs"], houseRule: "kitty", games: 3, stakes: "medium",
            intro: "Mit Wimpel auf dem Tisch wird um die Skatkasse gespielt: Wer ein Spiel verliert, zahlt eine Mark hinein.",
          },
          chronicle: "Auf der Hocketse in {place} mit Wimpel um die Skatkasse gespielt.",
        } }],
      },
    ],
  },

  // ─── Ein Tramper mit Schachbrett ───────────────────────────────────────────────────────────────────────
  {
    id: "any-tramper", pool: "anywhere",
    title: "Tramper mit Schachbrett", art: "hitchhiker",
    text: "Am Ortsausgang steht ein junger Mann mit Rucksack, den Daumen draußen. Unter dem Arm trägt er ein Schachbrett zum Klappen. „Mitfahren gegen eine Schachaufgabe?“, ruft er. „Matt in zwei, ganz frisch.“",
    choices: [
      {
        text: "„Steig ein und stell auf.“",
        outcomes: [{ outcome: {
          text: "Er klappt das Brett auf dem Beifahrersitz auf und stellt die Figuren. „Weiß am Zug. Ich hab Zeit, Sie auch?“",
          puzzle: "chess",
          chronicle: "Einen Tramper mitgenommen, der mit Schachaufgaben bezahlt.",
        } }],
      },
      {
        text: "„Heute nicht, tut mir leid.“",
        outcomes: [{ outcome: {
          text: "Er nickt freundlich und hebt wieder den Daumen. Im Rückspiegel siehst du, wie er sich auf den Rucksack setzt und gegen sich selbst spielt.",
        } }],
      },
      {
        text: "Die Schachuhr neben das Brett stellen.",
        req: { souvenir: "chess-clock" }, blue: true,
        outcomes: [{ outcome: {
          text: "Er sieht die Schachuhr und strahlt. „Endlich einer mit Ausrüstung!“ Die Figuren stehen, du drückst die Taste, und die Uhr fängt an zu ticken.",
          puzzle: "chess",
          chronicle: "Mit einem Tramper am Straßenrand Schach mit Uhr gespielt.",
        } }],
      },
    ],
  },

  // ─── Regen am Stellplatz und die Zeitung von gestern ───────────────────────────────────────────────────
  {
    id: "any-regen", pool: "anywhere", requires: { vehicle: "camper" },
    title: "Regen und alte Zeitung", art: "pitch-rain", music: "stellplatz",
    text: "Es regnet seit dem Frühstück, gleichmäßig und ohne jeden Plan aufzuhören. Auf dem Dach trommelt es wie bei der Blaskapelle. Auf dem Tisch liegt das Lokalblatt von gestern. Die Rätselseite ist noch leer.",
    choices: [
      {
        text: "Das Sudoku von gestern lösen.",
        outcomes: [{ outcome: {
          text: "Kaffee in die Tasse, Bleistift hinters Ohr. Draußen regnet es weiter, drinnen wird gezählt.",
          puzzle: "sudoku",
        } }],
      },
      {
        text: "Ein Nickerchen machen.",
        outcomes: [{ outcome: {
          text: "Du wachst auf, als der Regen aufhört. Die Zeitung liegt auf dem Boden, aufgeschlagen beim Wetterbericht. Dort steht: Regen.",
        } }],
      },
      {
        text: "Unter der Markise sitzen und die Nachbarn einladen.",
        req: { upgrade: "awning" }, blue: true,
        outcomes: [{ outcome: {
          text: "Unter der Markise bleibt es trocken. Bald sitzt der Nachbar von gegenüber dabei, mit seiner Zeitung von heute und einer Mark für die Kaffeekasse. Ihr löst die Rätsel zusammen.",
          marks: 1,
          puzzle: "sudoku",
        } }],
      },
    ],
  },

  // ─── Verkehrskontrolle: die zwei Dorfpolizisten suchen den dritten Mann ────────────────────────────────
  {
    id: "any-kontrolle", pool: "anywhere",
    title: "Verkehrskontrolle", art: "police", portrait: "wachtmeister", speaker: "Wachtmeister Hägele",
    text: "Ein grüner Arm mit Kelle winkt dich raus. Wachtmeister Hägele prüft Führerschein, Warndreieck und Verbandskasten, Anwärter Klaus schreibt alles mit. Dann beugt sich der Wachtmeister ans Fenster. „Spielet Sie zufällig Skat? Mir sind bloß zu zweit.“",
    choices: [
      {
        text: "„Freilich. Wer gibt?“",
        outcomes: [{ outcome: {
          text: "Anwärter Klaus holt einen Kasten Sprudel aus dem Kofferraum, Hägele legt die Dienstmütze aufs Blaulicht. Allgemeine Verkehrskontrolle, sagt er, die dauert manchmal länger.",
          skat: {
            opponents: ["wachtmeister", "anwaerter"], games: 3, stakes: "small",
            intro: "Gespielt wird auf der Motorhaube vom Streifenwagen, mit Sprudel und Spezi. Das Funkgerät bleibt an.",
          },
          chronicle: "Bei einer Verkehrskontrolle Skat auf der Motorhaube vom Streifenwagen gespielt.",
        } }],
      },
      {
        text: "„Leider nicht, ich muss weiter.“",
        outcomes: [{ outcome: {
          text: "Der Wachtmeister seufzt tief. „Gute Fahrt. Und falls Sie an einem Dritten vorbeikommet, schicket Sie ihn her.“ Anwärter Klaus schreibt auch das mit.",
        } }],
      },
      {
        text: "{dog} macht Sitz vor dem Streifenwagen.",
        req: { dog: "shepherd" }, blue: true,
        outcomes: [{ outcome: {
          text: "Hägele war früher Hundeführer. „So an Schäferhund! Platz!“ {dog} macht Platz, und der Wachtmeister strahlt. An der Tankstelle am Ortsausgang sollst du von ihm grüßen, dann gibt es einen Strich extra.",
          fuel: 1,
          chronicle: "{dog} hat bei einer Verkehrskontrolle in {place} den Wachtmeister begeistert.",
        } }],
      },
    ],
  },

  // ─── Werkstor (profile note) ───────────────────────────────────────────────────────────────────────────
  {
    id: "any-werkstor", pool: "anywhere", requires: { profile: "note" },
    title: "Werkstor", art: "factory-gate",
    text: "Am Rand von {place} stehst du auf einmal vor einem Werkstor. Im Tourenbuch steht zu {place}: „{note}“. Der Pförtner schaut aus seinem Häuschen, hinter ihm hängt die Stechuhr. Es riecht wie damals nach Öl und Kantine.",
    choices: [
      {
        text: "Beim Pförtner ans Fenster klopfen.",
        outcomes: [
          { outcome: {
            text: "„Ha, wen hen mir denn do?“ Der Pförtner kennt dich nicht, aber er kennt alle, die du kennst. Eine halbe Stunde lang geht es um Meister, Lehrlinge und den Kantinenkoch von früher.",
            chronicle: "Am Werkstor in {place} eine halbe Stunde von früher erzählt.",
          } },
          { outcome: {
            text: "Der Pförtner ist jung, aber sein Vater war auch hier. Er holt eine alte Werkszeitung aus der Schublade. Auf einem Foto steht einer, der genauso aussieht wie du damals.",
            chronicle: "Am Werkstor in {place} ein Foto von früher wiedergefunden.",
          } },
        ],
      },
      {
        text: "Einen Moment stehen bleiben und schauen.",
        outcomes: [{ outcome: {
          text: "Schichtwechsel. Fahrräder, Henkelmänner, ein paar müde Witze. Du bleibst stehen, bis das Tor wieder zugeht, und fährst dann weiter, ein bisschen leichter als vorher.",
          chronicle: "Am Werkstor in {place} den Schichtwechsel abgewartet.",
        } }],
      },
      {
        text: "Dem Pförtner einen Kaffee aus der Thermoskanne anbieten.",
        req: { souvenir: "thermos" }, blue: true,
        outcomes: [{ outcome: {
          text: "Er nimmt den Kaffee und erzählt. Am Ende winkt er dich durch, zur Werkstankstelle hinter der Halle. „Für die Ehemaligen. Aber net weitersagen.“",
          fuel: 1,
          chronicle: "Am Werkstor in {place} auf einen Kaffee reingewunken worden.",
        } }],
      },
    ],
  },

  // ─── Panne mit Ansage: der Keilriemen ──────────────────────────────────────────────────────────────────
  {
    id: "any-keilriemen", pool: "anywhere", requires: { vehicle: "camper" },
    title: "Der Keilriemen", art: "van-breakdown",
    text: "Seit Tagen quietscht es unter der Motorhaube, und du sagst jedes Mal: Das hält noch. Jetzt macht es ZACK, und die Temperaturanzeige klettert. Der Keilriemen hängt in Fetzen. Du rollst auf den Seitenstreifen.",
    choices: [
      {
        text: "Die Notfall-Strumpfhose aus dem Handschuhfach holen.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Ein Knoten, zwei Knoten, gut festziehen. Die Strumpfhose hält, und das Wohnmobil fährt wieder. Der nächste Meister lacht und lässt sie drin: „Des g’hört so.“",
            chronicle: "Den Keilriemen mit einer Strumpfhose ersetzt. Hält bis heute.",
          } },
          { weight: 1, outcome: {
            text: "Die Strumpfhose hält genau bis zur nächsten Steigung. Den Rest des Wegs schleichst du mit offener Motorhaube und viel gutem Zureden, und das kostet Sprit.",
            fuel: -1,
          } },
        ],
      },
      {
        text: "Die Maschine abladen und einen neuen Riemen holen.",
        req: { marks: 3 },
        outcomes: [{ outcome: {
          text: "Mit dem Motorrad zur nächsten Werkstatt und mit dem Riemen über der Schulter zurück. Drei Mark und eine halbe Stunde später läuft der Motor wieder rund.",
          marks: -3,
        } }],
      },
    ],
  },

  // ─── Gelbe Telefonzelle: Anruf daheim (profile partner) ────────────────────────────────────────────────
  {
    id: "any-telefon-daheim", pool: "anywhere", requires: { profile: "partner" },
    title: "Anruf daheim", art: "phone-booth",
    text: "Am Dorfrand steht eine gelbe Telefonzelle. Du hast drei Groschen in der Hand und ein bisschen Heimweh im Bauch. Nach dem zweiten Klingeln nimmt {partner} ab. „Ja, wo bisch denn du grad?“",
    choices: [
      {
        text: "Von der Tour erzählen, bis die Groschen alle sind.",
        req: { marks: 1 },
        outcomes: [{ outcome: {
          text: "Du erzählst von Stichen, Straßen und Stammgästen. {partner} hört zu, lacht an den richtigen Stellen und sagt am Ende: „Ich schick dir a Kärtle an den nächsten Stellplatz.“",
          marks: -1,
          souvenir: "postcard",
          chronicle: "Aus der gelben Zelle in {place} lange mit {partner} telefoniert.",
        } }],
      },
      {
        text: "„Alles gut, ich melde mich wieder.“",
        outcomes: [{ outcome: {
          text: "„Pass auf dich auf. Und iss was Gescheites.“ Klick. Ein Groschen fällt zurück in die Schale, und du fährst weiter, irgendwie leichter.",
        } }],
      },
    ],
  },

  // ─── Gelbe Telefonzelle: besetzt ───────────────────────────────────────────────────────────────────────
  {
    id: "any-telefonzelle", pool: "anywhere",
    title: "Besetzt", art: "phone-booth", portrait: "schwaetzer", speaker: "Schwätzer-Sigi",
    text: "Du willst nur kurz telefonieren. In der gelben Zelle steht Schwätzer-Sigi, den Hörer am Ohr, und redet. Durch die Scheibe hörst du: „… und dann hat mei Schwager gsagt, Sigi, hat er gsagt …“ Auf der Ablage stapeln sich die Groschen.",
    choices: [
      {
        text: "Geduldig warten.",
        outcomes: [{ outcome: {
          text: "Zehn Minuten. Zwanzig. Sigi wechselt vom Schwager zur Schwägerin. Als er endlich herauskommt, kennst du den ganzen Familienstammbaum, und dein Anruf hat sich erledigt.",
        } }],
      },
      {
        text: "An die Scheibe klopfen.",
        outcomes: [{ outcome: {
          text: "Sigi winkt, nickt, redet weiter und hält einen Finger hoch: noch eine Minute. Nach der Minute hält er zwei Finger hoch. Du fährst ohne Anruf weiter, aber mit dem Klatsch aus drei Dörfern.",
          chronicle: "In {place} eine Telefonzelle nicht von Schwätzer-Sigi freibekommen.",
        } }],
      },
      {
        text: "{dog} setzt sich vor die Tür und schaut.",
        req: { dog: "airedale" }, blue: true,
        outcomes: [{ outcome: {
          text: "{dog} schaut, und schaut, und hört nicht auf zu schauen. Sigi wird nervös, legt auf und hält dir die Tür auf. Zum Abschied drückt er dir einen alten Groschen in die Hand: „Mei Glücksgroschen. Bei mir wirkt er net.“",
          souvenir: "lucky-penny",
          chronicle: "{dog} hat Schwätzer-Sigi aus der Telefonzelle geschaut.",
        } }],
      },
    ],
  },

  // ─── Flohmarkt in der Gemeindehalle ────────────────────────────────────────────────────────────────────
  {
    id: "any-flohmarkt", pool: "anywhere",
    title: "Flohmarkt in der Halle", art: "flea-market",
    text: "In der Gemeindehalle ist Flohmarkt. Zwischen Fondueset und Kuckucksuhr steht ein Karton voll Kram: Wimpel, Krüge, ein Schachbrett mit nur einem Läufer. Der Händler lüftet die Schiebermütze. „Alles aus einer Haushaltsauflösung. Für Sie a Sonderpreis.“",
    choices: [
      {
        text: "Im Karton wühlen und handeln.",
        req: { marks: 3 },
        outcomes: [{ outcome: {
          text: "Ganz unten, unter einem Fondue-Kochbuch, findest du etwas Brauchbares. Der Händler will fünf Mark, du bietest zwei, ihr trefft euch bei drei. Beide sind zufrieden.",
          marks: -3,
          souvenir: "random",
        } }],
      },
      {
        text: "Nur schauen.",
        outcomes: [{ outcome: {
          text: "Du schaust. Der Händler schaut, wie du schaust. Am Ende kaufst du nichts, und er sagt trotzdem herzlich: „Bis zum nächsten Mal.“",
        } }],
      },
      {
        text: "Mit der Lesebrille die Preisschilder genau lesen.",
        req: { souvenir: "reading-glasses", marks: 1 }, blue: true,
        outcomes: [{ outcome: {
          text: "Auf dem kleinen Zettel am Karton steht: „Alles 1 Mark“. Der Händler hatte gehofft, dass das keiner liest. Er lacht und gibt sich geschlagen.",
          marks: -1,
          souvenir: "random",
          chronicle: "Auf dem Flohmarkt in {place} das Kleingedruckte gelesen.",
        } }],
      },
    ],
  },

  // ─── Feuerwehrfest mit Kommandant Heiner ───────────────────────────────────────────────────────────────
  {
    id: "any-feuerwehrfest", pool: "anywhere",
    title: "Feuerwehrfest", art: "hocketse", portrait: "kommandant", speaker: "Kommandant Heiner",
    text: "Auf dem Dorfplatz ist Feuerwehrfest: Löschfahrzeug mit offenen Türen, Grill, Blasmusik. Kommandant Heiner zeigt auf dich. „Beim Kameradschaftsskat fehlt einer. Antreten!“ Die Wirtin Lore mischt schon.",
    choices: [
      {
        text: "„Zu Befehl, Herr Kommandant.“",
        outcomes: [{ outcome: {
          text: "Heiner rückt dir einen Stuhl zurecht. „Wasser marsch!“, ruft er, und meint damit: Wer gibt?",
          skat: {
            opponents: ["kommandant", "wirtin"], houseRule: "bock", games: 3, stakes: "small",
            intro: "Kameradschaftsskat der Feuerwehr: Bockrunde, alle Spiele zählen doppelt.",
          },
          chronicle: "Beim Feuerwehrfest in {place} zum Kameradschaftsskat angetreten.",
        } }],
      },
      {
        text: "Lieber am Grill helfen.",
        outcomes: [{ outcome: {
          text: "Zwei Stunden lang rote Würste wenden. Der Grillmeister gibt dir drei Mark und eine Wurst auf die Hand. Du riechst jetzt selbst wie ein Feuerwehrfest.",
          marks: 3,
        } }],
      },
      {
        text: "{dog} legt sich unter den Tisch, als die Sirene heult.",
        req: { dog: "wolfhound-b" }, blue: true,
        outcomes: [{ outcome: {
          text: "Die Sirenenprobe heult über den Platz, alle Hunde im Dorf bellen, nur {dog} gähnt. „Des isch Disziplin!“, ruft der Kommandant und heftet {dog} eine Ehrennadel ans Halsband. Dazu gibt es zwei Mark aus der Kameradschaftskasse.",
          marks: 2,
          chronicle: "{dog} bekam beim Feuerwehrfest in {place} eine Ehrennadel.",
        } }],
      },
    ],
  },

  // ─── Oberlehrer Walters Skatkurs ───────────────────────────────────────────────────────────────────────
  {
    id: "any-skatkurs", pool: "anywhere",
    title: "Skatkurs für Anfänger", art: "inn-stube", portrait: "lehrer", speaker: "Oberlehrer Walter",
    text: "Im Nebenzimmer vom Gasthaus hält Oberlehrer Walter den Kurs „Skat für Anfänger“. An der Tafel steht: „Merke: Wer reizt, muss auch spielen.“ In der ersten Reihe schaut der junge Rolf ratlos. „Für die Übungsrunde fehlt der Dritte“, sagt Walter.",
    choices: [
      {
        text: "Mit dem Lehrer und dem jungen Rolf spielen.",
        outcomes: [{ outcome: {
          text: "Walter klatscht in die Hände. „Merke: Der Gast gibt.“ Der junge Rolf flüstert dir zu: „Wie viel war noch mal Herz?“",
          skat: {
            opponents: ["lehrer", "neuling"], houseRule: "standard", games: 3, stakes: "small",
            intro: "Übungsrunde nach Lehrbuch: Oberlehrer Walter erklärt jeden Stich, der junge Rolf schreibt mit.",
          },
          chronicle: "Im Skatkurs der Volkshochschule als Übungsgegner ausgeholfen.",
        } }],
      },
      {
        text: "Hinten sitzen und zuhören.",
        outcomes: [{ outcome: {
          text: "Walter erklärt eine Stunde lang Drücken und Schmieren. Der junge Rolf schreibt mit: „Drücken: Skat. Schmieren: Butterbrot.“ Am Ende schaut er dich an, als wärst du Preisskat-Sieger.",
        } }],
      },
      {
        text: "Mit dem Notizblock mitschreiben.",
        req: { souvenir: "notepad" }, blue: true,
        outcomes: [{ outcome: {
          text: "Walter sieht deinen Notizblock und ist gerührt. „Endlich einer, der mitschreibt!“ Er gibt dir zwei Mark aus der Kaffeekasse, für den Vorbildcharakter.",
          marks: 2,
        } }],
      },
    ],
  },

  // ─── Der alte Gottlob und der Bierdeckel ───────────────────────────────────────────────────────────────
  {
    id: "any-gottlob-bank", pool: "anywhere",
    title: "Der alte Gottlob", art: "kiosk", portrait: "altmeister", speaker: "Der alte Gottlob",
    text: "Vor dem Kiosk sitzt der alte Gottlob auf der Bank und liest das Lokalblatt. Er schaut kurz auf und zieht einen Bierdeckel aus der Jacke. Darauf hat jemand mit Bleistift ein Endspiel gezeichnet. „Preisskat achtundfünfzig. Die Karte hat damals keiner gefunden.“",
    choices: [
      {
        text: "„Lass sehen.“",
        outcomes: [{ outcome: {
          text: "Er legt den Bierdeckel auf die Bank zwischen euch. Vier Stiche noch, die Karten offen. „Eine Karte gewinnt. Die anderen net.“",
          puzzle: "problem",
        } }],
      },
      {
        text: "„Erzähl, wie war das damals?“",
        outcomes: [{ outcome: {
          text: "Er erzählt lange und mit wenigen Worten: vom vollen Saal, vom Grand Hand mit vieren, vom Pokal, der heute noch beim Bäcker im Fenster steht. Dann schiebt er dir den Bierdeckel hin. „Behalt ihn.“",
          beerMat: "hand-bonus",
          chronicle: "Vom alten Gottlob seinen Bierdeckel vom Preisskat achtundfünfzig bekommen.",
        } }],
      },
    ],
  },

  // ─── Der Mann vom Lokalblatt ───────────────────────────────────────────────────────────────────────────
  {
    id: "any-reporter", pool: "anywhere",
    title: "Der Mann vom Lokalblatt", art: "pitch-evening",
    text: "Am Stellplatz wartet ein junger Mann mit Kamera und Notizblock. Er ist vom Lokalblatt und schreibt über Leute, die auf Tour sind. „Ein Foto und drei Sätze, mehr brauch i net.“",
    choices: [
      {
        text: "Ein Foto mit dem Skatblatt in der Hand.",
        outcomes: [{ outcome: {
          text: "Du fächerst vier Buben auf, er drückt ab. Zwei Tage später hängt der Artikel in jedem Wirtshaus der Gegend: „Skatspieler aus {home} auf großer Tour“. Der Verlag schickt drei Mark Honorar.",
          marks: 3,
          chronicle: "Im Lokalblatt von {place} mit Foto und vier Buben erschienen.",
        } }],
      },
      {
        text: "„Lieber nicht, ich bin schüchtern.“",
        outcomes: [{ outcome: {
          text: "Er schreibt trotzdem drei Sätze. Am nächsten Tag steht im Lokalblatt: „Ein schüchterner Herr aus {home} war auf der Durchreise.“ Du schneidest es trotzdem aus.",
        } }],
      },
      {
        text: "{dog} kommt mit aufs Bild.",
        req: { dog: "wolfhound-a" }, blue: true,
        outcomes: [{ outcome: {
          text: "{dog} ist größer als der Reporter. Das Foto kommt auf die Titelseite: „Riesenhund auf Durchreise“. Dich sieht man auch, ganz am Rand. Für das Bild der Woche gibt es vier Mark.",
          marks: 4,
          chronicle: "{dog} kam in {place} auf die Titelseite vom Lokalblatt.",
        } }],
      },
    ],
  },

  // ─── Das Turnierplakat ─────────────────────────────────────────────────────────────────────────────────
  {
    id: "any-turnierplakat", pool: "anywhere",
    title: "Das Turnierplakat", art: "village-square",
    text: "Am Laternenmast in {place} klebt ein Plakat: Preisskat im Vereinsheim, heute Abend, Startgeld drei Mark. Darunter hat jemand mit Kuli geschrieben: „Der Erwin gewinnt eh.“",
    choices: [
      {
        text: "Startgeld zahlen und mitspielen.",
        req: { marks: 3 },
        outcomes: [{ outcome: {
          text: "Im Vereinsheim sind die Tische nummeriert. An Tisch drei sitzen der Erwin und Frau Gerda. Der Erwin zeigt auf das Plakat am Fenster und grinst.",
          marks: -3,
          skat: {
            opponents: ["zocker", "rechnerin"], houseRule: "standard", stakes: "high",
            intro: "Frau Gerda führt die Liste. Der Erwin sagt, er gewinne eh.",
          },
          chronicle: "In {place} beim Vereinsturnier gegen den Erwin und Frau Gerda angetreten.",
        } }],
      },
      {
        text: "Mit dem Kuli darunterschreiben: „Mal sehen.“",
        outcomes: [{ outcome: {
          text: "Am nächsten Morgen steht darunter: „Feigling. Erwin.“ Und darunter, in sehr ordentlicher Schrift: „Der Erwin hat letzte Woche auch nur zugeschaut. Gerda.“",
          chronicle: "In {place} einen Briefwechsel auf einem Turnierplakat geführt.",
        } }],
      },
      {
        text: "Die Sparbüchse schütteln. Das Startgeld zahlt das Sparschwein.",
        req: { souvenir: "piggy-bank" }, blue: true,
        outcomes: [{ outcome: {
          text: "Drei Mark in Groschen auf den Tresen gezählt. Der Vereinswirt zählt nach, nickt und schickt dich an Tisch drei, zum Erwin und zu Frau Gerda.",
          skat: {
            opponents: ["zocker", "rechnerin"], houseRule: "standard", stakes: "high",
            intro: "Frau Gerda führt die Liste. Der Erwin sagt, er gewinne eh.",
          },
        } }],
      },
    ],
  },

  // ─── Die Radarfalle ────────────────────────────────────────────────────────────────────────────────────
  {
    id: "any-blitzer", pool: "anywhere", requires: { vehicle: "camper" },
    title: "Die Radarfalle", art: "police",
    text: "Es geht bergab, und das Wohnmobil kommt richtig in Schwung. Kurz vor dem Ortsschild steht ein Kombi im Gebüsch, daneben ein Stativ. Der Tacho zeigt dreiundsechzig. Erlaubt sind fünfzig.",
    choices: [
      {
        text: "Auf die Bremse, Vorschrift ist Vorschrift.",
        outcomes: [{ outcome: {
          text: "Das Wohnmobil quietscht auf vorschriftsmäßige fünfzig herunter. Der Mann am Stativ hebt anerkennend den Daumen. Zum ersten Mal lobt dich jemand für deine Bremsen.",
        } }],
      },
      {
        text: "Rollen lassen. Mit der Kiste blitzt einen keiner.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Es blitzt nicht. Der Beamte schaut dir hinterher und schüttelt den Kopf, als hätte ein Traktor einen Bus überholt.",
          } },
          { weight: 1, outcome: {
            text: "Es blitzt. Der Beamte schaut auf seinen Zettel, dann auf das Wohnmobil, und winkt ab. „Bei dem Gewicht isch des a Messfehler.“",
            chronicle: "In {place} geblitzt worden. Der Beamte hielt es für einen Messfehler.",
          } },
        ],
      },
    ],
  },

  // ─── Bandsalat im Kassettenrekorder ────────────────────────────────────────────────────────────────────
  {
    id: "any-kassette", pool: "anywhere", requires: { vehicle: "camper" },
    title: "Bandsalat", art: "road-enz",
    text: "Im Kassettenrekorder läuft deine Lieblingskassette, Seite B. Dann ein Jaulen, ein Knirschen, und Stille. Als du die Kassette herausziehst, hängt ein halber Meter Band hinterher.",
    choices: [
      {
        text: "Mit dem Bleistiftstummel das Band zurückdrehen.",
        req: { souvenir: "pencil" }, blue: true,
        outcomes: [{ outcome: {
          text: "Bleistift ins Spulenloch und drehen, drehen, drehen. Nach zehn Kilometern ist das Band wieder drin. Seite B leiert jetzt ein bisschen, aber das tut die Musik von damals sowieso.",
          chronicle: "Eine Kassette mit dem Bleistift gerettet, wie früher.",
        } }],
      },
      {
        text: "Das Band mit dem kleinen Finger aufwickeln.",
        outcomes: [
          { outcome: {
            text: "Es dauert bis zum nächsten Ort, aber es klappt. Das erste Lied klingt danach, als hätte der Sänger einen Schnupfen.",
          } },
          { outcome: {
            text: "Der Finger ist zu dick, das Band reißt. Den Rest des Tages singst du die Lieder selbst, aus dem Gedächtnis und mit eigenem Text.",
          } },
        ],
      },
      {
        text: "Radio statt Kassette.",
        outcomes: [{ outcome: {
          text: "Im Radio läuft Schlager, dann Verkehrsfunk, dann wieder Schlager. Bei einem Lied pfeifst du mit, obwohl du es eigentlich nicht magst.",
        } }],
      },
    ],
  },

  // ─── Der Dackel vom Nachbarn ───────────────────────────────────────────────────────────────────────────
  {
    id: "any-dackel", pool: "anywhere",
    title: "Der Dackel nebenan", art: "pitch-evening", music: "stellplatz",
    text: "Auf dem Platz nebenan steht ein Wohnwagen, davor ein Rentnerpaar und ein Dackel namens Waldi. Du stellst dein Vesper auf den Klapptisch, drehst dich einmal um, und die Landjäger sind weg. Unter dem Wohnwagen kaut es.",
    choices: [
      {
        text: "Lachen und den Rest teilen.",
        outcomes: [{ outcome: {
          text: "Der Rentner entschuldigt sich dreimal und lädt dich zu Zwiebelkuchen ein. Zum Abschied gibt er dir zwei Mark für neue Landjäger.",
          marks: 2,
          chronicle: "Mit einem Dackel namens Waldi das Vesper geteilt.",
        } }],
      },
      {
        text: "Unter den Wohnwagen kriechen.",
        outcomes: [{ outcome: {
          text: "Du bekommst einen Landjäger zurück, angekaut, und Waldi den Rest. Die Rentnerin bringt dir zum Trost ein Stück Zwiebelkuchen und eine Bürste für die Hose.",
        } }],
      },
      {
        text: "{dog} regelt das unter Hunden.",
        req: { dog: "schnauzer-a" }, blue: true,
        outcomes: [{ outcome: {
          text: "{dog} schnüffelt einmal, legt sich vor den Wohnwagen und wartet. Nach einer Minute schiebt Waldi die Landjäger heraus, beide. Der Rentner ist so beeindruckt, dass er dir seinen Reservekanister schenkt.",
          fuel: 1,
          chronicle: "{dog} hat einem Dackel die Landjäger wieder abgehandelt.",
        } }],
      },
    ],
  },

  // ─── Der Erwin wettet ──────────────────────────────────────────────────────────────────────────────────
  {
    id: "any-erwin-wette", pool: "anywhere",
    title: "Der Erwin wettet", art: "inn-stube", portrait: "zocker", speaker: "Der Erwin",
    text: "Vor dem Gasthaus lehnt der Erwin am offenen Fenster und winkt dich heran. „Wette um drei Mark: Du weißt net, wie viel Augen im ganzen Skatblatt sind.“ Hinter ihm am Tisch verdreht Frau Gerda die Augen.",
    choices: [
      {
        text: "„Hundertzwanzig, Erwin.“",
        outcomes: [{ outcome: {
          text: "Der Erwin rechnet nach, dann grinst er: „I hab die Auge von de Buben gmeint. Achte.“ Frau Gerda schaut ihn nur an. Er zahlt, in Groschen.",
          marks: 3,
          chronicle: "Dem Erwin drei Mark abgenommen, mit einer Frage, die jeder kennt.",
        } }],
      },
      {
        text: "„Wetten ist nichts für mich.“",
        outcomes: [{ outcome: {
          text: "„Angsthas!“, ruft der Erwin, aber freundlich. Frau Gerda sagt vom Tisch her: „Hundertzwanzig. Und der Erwin schuldet mir noch zwei Mark vom Dienstag.“",
        } }],
      },
    ],
  },
];

export const ANYWHERE_FLAGS: Record<string, string> = {};
