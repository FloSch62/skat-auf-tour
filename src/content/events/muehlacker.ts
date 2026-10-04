// Unterwegs um Mühlacker und am Stromberg (contract §4.10): 16 regional events. Local colour: the Mühlacker rail
// junction, the big Sender mast, Löffelstelz above Dürrmenz, Mühlhausen in the Enz loop, Maulbronn monastery and the
// Maultaschen legend, Knittlingen and Doktor Faust, Streuobst, Most, shepherds and sheep on the Stromberg.
import type { EventDef } from "../../game/types.ts";

export const MUEHLACKER_EVENTS: EventDef[] = [
  {
    id: "mue-schafherde", pool: "region", region: "muehlacker",
    title: "Schafherde", art: "sheep",
    text: "Hinter einer Kurve am Stromberg steht die Straße voller Schafe. Sechshundert Stück, schätzt du, und keins hat es eilig. Der Schäfer lehnt auf seinem Stab und zuckt mit den Schultern: „Die laufet, wann sie wellet.“",
    choices: [
      {
        text: "Motor aus und warten.",
        outcomes: [{ outcome: {
          text: "Eine halbe Stunde lang zieht die Herde vorbei, Schaf für Schaf. Ein Lamm schaut zum Fenster herein. Es gibt Schlimmeres.",
        } }],
      },
      {
        text: "Hupen.",
        outcomes: [{ outcome: {
          text: "Die Schafe bleiben erst recht stehen, und der Schäfer hebt den Stab. Du nimmst den Umweg über Schützingen und verlierst einen Strich.",
          fuel: -1,
        } }],
      },
      {
        text: "Der Schäferhund kennt das Geschäft.",
        req: { dog: "shepherd" }, blue: true,
        outcomes: [{ outcome: {
          text: "{dog} springt raus, ein Pfiff, ein Bogen, und die Herde steht ordentlich auf der Wiese. Der Schäfer staunt: „So oin hätt i au gern.“ Die Straße ist frei.",
          flags: ["schaefer-freund"],
          chronicle: "Am Stromberg hat {dog} eine Schafherde von der Straße geholt.",
        } }],
      },
    ],
  },
  {
    id: "mue-mostfass", pool: "region", region: "muehlacker",
    title: "Das Mostfass", art: "cellar",
    text: "Im Keller vom Besen in {place} sitzt du gerade beim Vesper, da macht es hinten PLOPP. Der Spund ist aus dem großen Mostfass geflogen, ein Strahl Most schießt quer durch den Keller. Der Besenwirt hält den Daumen drauf und ruft: „Helfet mir halt!“",
    choices: [
      {
        text: "Den Spund suchen.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Du tastest im Most nach dem Holzpfropfen, bis zu den Knöcheln im Nassen. Gefunden, eingeschlagen, Ruhe. Der Wirt zahlt dir drei Mark und das Vesper.",
            marks: 3,
            chronicle: "Im Besen in {place} das Mostfass gerettet.",
          } },
          { weight: 1, outcome: {
            text: "Der Spund ist weg. Ihr haltet abwechselnd den Daumen drauf, bis der Nachbar mit einem Korken kommt. Der Keller riecht noch wochenlang nach Äpfeln.",
          } },
        ],
      },
      {
        text: "Einen Eimer drunterhalten.",
        outcomes: [{ outcome: {
          text: "Du rettest vier Eimer Most. Der Wirt meint, die gehören jetzt dir. Du schenkst sie dem Stammtisch, und der Stammtisch bedankt sich laut.",
        } }],
      },
      {
        text: "Der Airedale findet alles, was rollt.",
        req: { dog: "airedale" }, blue: true,
        outcomes: [{ outcome: {
          text: "{dog} taucht unters Regal und kommt mit dem Spund im Maul zurück. Der Wirt ist so gerührt, dass er vier Mark rausrückt und eine Wurst für {dog}.",
          marks: 4,
          chronicle: "{dog} hat im Besen in {place} den Spund vom Mostfass gefunden.",
        } }],
      },
    ],
  },
  {
    id: "mue-wunschkonzert", pool: "region", region: "muehlacker",
    title: "Grüße im Radio", art: "phone-booth",
    text: "Über dem Stromberg steht der rot-weiße Mast vom Sender Mühlacker, man sieht ihn von überall. Im Radio läuft das Wunschkonzert, und der Sprecher liest Grüße vor. Hundert Meter weiter steht eine gelbe Telefonzelle.",
    choices: [
      {
        text: "Anrufen und einen Gruß nach {home} schicken.",
        req: { marks: 1 },
        outcomes: [{ outcome: {
          text: "Zwei Groschen, dreimal besetzt, dann bist du durch. Am Abend sagt der Sprecher deinen Namen und grüßt ganz {home}.",
          marks: -1,
          chronicle: "Im Wunschkonzert einen Gruß nach {home} geschickt.",
        } }],
      },
      {
        text: "Lieber eine Kassette einlegen.",
        outcomes: [{ outcome: {
          text: "Blasmusik vom Band. In der zweiten Kurve gibt es Bandsalat, und an der nächsten Schranke spulst du mit dem Bleistift zurück.",
        } }],
      },
      {
        text: "Am Autoradio den Verkehrsfunk dazuschalten.",
        req: { upgrade: "radio" }, blue: true,
        outcomes: [{ outcome: {
          text: "Der Verkehrsfunk meldet eine Sperrung, von der du nichts gewusst hättest. Du fährst außen herum und sparst dir eine Stunde Stop-and-go.",
          fuel: 1,
        } }],
      },
    ],
  },
  {
    id: "mue-loeffelstelz", pool: "region", region: "muehlacker",
    title: "Auf der Löffelstelz", art: "road-enz",
    text: "Oben auf der Burgruine Löffelstelz über Dürrmenz sitzt ein Mann vom Heimatverein mit einer Spendendose. „Für die Mauer“, sagt er, „die bröckelt.“ Unten glänzt die Enz, und hinten steht der Sender.",
    choices: [
      {
        text: "Eine Mark in die Dose.",
        req: { marks: 1 },
        outcomes: [{ outcome: {
          text: "Er bedankt sich und erzählt dir die ganze Geschichte der Burg, mit allen Grafen. Danach weißt du mehr, als du wolltest.",
          marks: -1,
          chronicle: "Eine Mark für die Löffelstelz gegeben. Die Mauer steht noch.",
        } }],
      },
      {
        text: "Mit anpacken und Steine schleppen.",
        outcomes: [{ outcome: {
          text: "Eine Stunde Steine schleppen. Zum Dank schenkt dir der Heimatforscher seine alte Lupe: „Für die Kleinigkeiten. Die meisten übersehen die.“",
          souvenir: "magnifier",
          chronicle: "Auf der Löffelstelz Steine geschleppt und eine Lupe bekommen.",
        } }],
      },
      {
        text: "Nur die Aussicht genießen.",
        outcomes: [{ outcome: {
          text: "Die Enz macht ihre Schleife, die Züge rollen nach Mühlacker, der Wind riecht nach Heu. Fünf Minuten, die nichts kosten.",
        } }],
      },
    ],
  },
  {
    id: "mue-maultaschen", pool: "region", region: "muehlacker",
    title: "Herrgottsbscheißerle", art: "monastery", portrait: "klosterwirt", speaker: "Klosterwirt Eberhard",
    text: "Auf dem Markt in {place} hat der Klosterwirt Eberhard aus Maulbronn einen Stand mit Maultaschen. „Die hen d’ Mönche erfunde“, sagt er, „damit der Herrgott in der Fastenzeit des Fleisch net sieht.“ Unterm Tresen liegt ein Skatblatt.",
    choices: [
      {
        text: "Eine Portion Maultaschen, bitte.",
        req: { marks: 2 },
        outcomes: [{ outcome: {
          text: "Geschmälzt, mit Kartoffelsalat. Satt bis morgen Abend, da musst du unterwegs nirgends anhalten.",
          marks: -2, fuel: 1,
        } }],
      },
      {
        text: "Eine Runde Skat, wenn er Zeit hat.",
        outcomes: [{ outcome: {
          text: "Oberlehrer Walter kauft gerade Maultaschen und wird zum dritten Mann ernannt. Der Stand bleibt offen, die Kundschaft zahlt in die Dose.",
          skat: { opponents: ["klosterwirt", "lehrer"], houseRule: "standard", intro: "Der Klosterwirt mischt in aller Ruhe. Er hat Zeit, er hat immer Zeit." },
          chronicle: "Am Maultaschenstand mit dem Klosterwirt Eberhard Skat gespielt.",
        } }],
      },
      {
        text: "Mit der Lupe nach dem versteckten Fleisch suchen.",
        req: { souvenir: "magnifier" }, blue: true,
        outcomes: [{ outcome: {
          text: "Du hältst die Lupe über die Maultasche. Der Klosterwirt lacht so laut, dass der ganze Markt herschaut, und gibt dir die Portion umsonst. Satt bis morgen.",
          fuel: 1,
          chronicle: "Mit der Lupe im Herrgottsbscheißerle nach dem Fleisch gesucht.",
        } }],
      },
    ],
  },
  {
    id: "mue-schranke", pool: "region", region: "muehlacker",
    title: "An der Schranke", art: "railway", portrait: "bahner", speaker: "Bahner Willi",
    text: "Am Bahnübergang bei {place} geht die Schranke runter, und ein Güterzug rollt heran, endlos. Im Schrankenhäuschen sitzt Bahner Willi mit der Taschenuhr. „Wette gefällig? Ich sag, es sind vierundsechzig Wagen. Wer näher dran isch, kriegt zwei Mark.“",
    choices: [
      {
        text: "Die Wagen mitzählen.",
        outcomes: [
          { weight: 1, outcome: {
            text: "Du zählst dreiundsechzig, und es sind dreiundsechzig. Willi zahlt und schaut auf die Uhr: „Pünktlich verlore.“",
            marks: 2,
          } },
          { weight: 1, outcome: {
            text: "Bei vierzig verzählst du dich, weil ein Kesselwagen so schön glänzt. Willi gewinnt und will nur einen Händedruck.",
          } },
        ],
      },
      {
        text: "Motor aus und das Lokalblatt aufschlagen.",
        outcomes: [{ outcome: {
          text: "Der Zug dauert. Auf der Rätselseite wartet ein Zahlenrätsel, und die Schranke bleibt noch eine Weile unten.",
          puzzle: "sudoku",
        } }],
      },
      {
        text: "Im Notizblock Strich für Strich mitzählen.",
        req: { souvenir: "notepad" }, blue: true,
        outcomes: [{ outcome: {
          text: "Strich für Strich, Wagen für Wagen: einundsechzig. Willi zählt nach, nickt anerkennend und zahlt drei Mark. „Ordnung muss sei.“",
          marks: 3,
          chronicle: "An der Schranke gegen den Bahner Willi eine Wette gewonnen.",
        } }],
      },
    ],
  },
  {
    id: "mue-faust", pool: "region", region: "muehlacker", music: "stammtisch",
    title: "Der Herr mit der Feder", art: "inn-stube",
    text: "In der Wirtschaft von {place} sitzt einer mit roter Weste und Hahnenfeder am Hut. Er beugt sich zu dir: „Einen Grand mit vieren, jedes Spiel, für immer. Dafür nur eine Kleinigkeit: deine Seele.“ Drüben in Knittlingen soll der Doktor Faust geboren sein.",
    choices: [
      {
        text: "Lieber selber spielen. Wer gibt?",
        outcomes: [{ outcome: {
          text: "Er lacht und klopft dir auf die Schulter. Am Nebentisch legt Null-Eugen die Zeitung weg und rückt näher.",
          skat: { opponents: ["schlitzohr", "nullfuchs"], houseRule: "standard", intro: "Der mit der Feder nimmt den Hut ab. Darunter grinst ’s Schlitzohr Fritz: „War bloß a Spaß. Abhebe!“" },
        } }],
      },
      {
        text: "Den Pakt unterschreiben.",
        outcomes: [{ outcome: {
          text: "Er zieht einen Bierdeckel aus der Weste und lässt dich unterschreiben. Dann nimmt er den Hut ab: Es ist ’s Schlitzohr Fritz, er probt fürs Faust-Spiel. Den Bierdeckel darfst du behalten.",
          beerMat: "random",
          chronicle: "In {place} die Seele für einen Grand verkauft. Auf einem Bierdeckel.",
        } }],
      },
      {
        text: "„Meine Grands spiel ich selber.“",
        outcomes: [{ outcome: {
          text: "„Recht so“, sagt er und tippt an die Feder. „Die meisten unterschreiben schneller.“",
        } }],
      },
    ],
  },
  {
    id: "mue-streuobst", pool: "region", region: "muehlacker",
    title: "Äpfel am Stromberg", art: "orchard",
    text: "Auf einer Streuobstwiese am Stromberg kämpft ein alter Bauer mit einer Leiter, die länger ist als er. Die Bäume hängen voll, morgen kommt der Mostwagen. „Hen Sie zwei Händ übrig?“",
    choices: [
      {
        text: "Rauf auf die Leiter.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Zwei Stunden pflücken, drei Säcke voll. Der Bauer zahlt drei Mark und gibt dir ein Glas Apfelgelee mit.",
            marks: 3,
          } },
          { weight: 1, outcome: {
            text: "KRACH. Die Sprosse bricht, und du landest weich in einem Haufen Äpfel. Der Bauer lacht Tränen und zahlt trotzdem.",
            marks: 2,
            chronicle: "Am Stromberg von der Leiter in die Äpfel gefallen.",
          } },
        ],
      },
      {
        text: "Schütteln statt pflücken.",
        outcomes: [{ outcome: {
          text: "HUI. Es regnet Äpfel, einer trifft den Bauern auf den Hut. Er nimmt es mit Humor und gibt dir eine Mark für die Arbeit.",
          marks: 1,
        } }],
      },
      {
        text: "Die Säcke in der Dachbox zur Mosterei fahren.",
        req: { upgrade: "roof-box" }, blue: true,
        outcomes: [{ outcome: {
          text: "Vier Säcke in der Dachbox, ab zur Mosterei. Der Bauer spart sich den Mostwagen und gibt dir vier Mark. Das Wohnmobil riecht eine Woche nach Apfel.",
          marks: 4,
          chronicle: "Äpfel vom Stromberg in der Dachbox zur Mosterei gefahren.",
        } }],
      },
    ],
  },
  {
    id: "mue-hammer", pool: "region", region: "muehlacker",
    requires: { vehicle: "camper" },
    title: "Der Hammer vom Gerüst", art: "village-square",
    text: "In {place} wird ein Fachwerkhaus gerichtet, oben auf dem Gerüst singt ein Zimmermann. Dann rutscht ihm der Hammer weg. RUMMS. Mitten aufs Dach vom Wohnmobil. „Heilandsack!“, ruft er und klettert runter.",
    choices: [
      {
        text: "„Lass gut sein, das Wohnmobil hat Schlimmeres erlebt.“",
        outcomes: [{ outcome: {
          text: "Der Zimmermann ist erleichtert und drückt dir eine Mark in die Hand. Eine Delle mehr fällt auf dem Dach eh nicht auf.",
          marks: 1,
        } }],
      },
      {
        text: "Er soll die Delle rausklopfen.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Er klopft von innen mit dem Holzhammer. Die Delle ist fast weg, nur wenn die Sonne tief steht, sieht man sie noch.",
          } },
          { weight: 1, outcome: {
            text: "Er klopft, und jetzt hat das Dach zwei Dellen. Er meint, das sei jetzt wenigstens symmetrisch.",
            chronicle: "In {place} zwei Dellen im Dach bekommen. Symmetrisch.",
          } },
        ],
      },
      {
        text: "Ihm einen Kaffee aus der Thermoskanne anbieten.",
        req: { souvenir: "thermos" }, blue: true,
        outcomes: [{ outcome: {
          text: "Ihr trinkt Kaffee auf der Stufe vom Wohnmobil. Zum Abschied schenkt er dir einen alten Groschen, den er in einem Balken von 1712 gefunden hat.",
          souvenir: "lucky-penny",
          chronicle: "In {place} mit einem Zimmermann Kaffee getrunken.",
        } }],
      },
    ],
  },
  {
    id: "mue-klostersee", pool: "region", region: "muehlacker",
    title: "Am Klostersee", art: "pitch-evening",
    text: "Am Klostersee bei Maulbronn sitzen zwei Angler auf dem Steg. Es beißt nichts, schon den ganzen Nachmittag. Zwischen den Ruten liegt ein Skatblatt auf einem Eimer. „Solang nix beißt, wird gereizt. Mir bräuchte bloß en Dritte.“",
    choices: [
      {
        text: "Mich auf den Eimer setzen. Wer gibt?",
        outcomes: [{ outcome: {
          text: "Die Angler sind der Maurer-Karle und der Erwin. Der Erwin behauptet, er habe hier mal einen Hecht mit vier Kilo gefangen. Mit einer Hand.",
          skat: { opponents: ["maurer", "zocker"], houseRule: "kitty", intro: "Der Maurer-Karle legt die Angel quer. „Wenn oiner beißt, wird unterbroche.“" },
        } }],
      },
      {
        text: "Der Wolfshund setzt sich still zu den Anglern.",
        req: { dog: "wolfhound-b" }, blue: true,
        outcomes: [{ outcome: {
          text: "{dog} sitzt so still am Steg, dass sogar die Karpfen neugierig werden. Endlich beißt einer. Die Angler legen zwei Mark für den Glücksbringer zusammen.",
          marks: 2,
          chronicle: "{dog} hat am Klostersee einen Karpfen herbeigeschwiegen.",
        } }],
      },
      {
        text: "Nur zuschauen und weiterfahren.",
        outcomes: [{ outcome: {
          text: "Du schaust eine Weile zu, wie nichts beißt. Es ist erstaunlich erholsam.",
        } }],
      },
    ],
  },
  {
    id: "mue-kanu", pool: "region", region: "muehlacker",
    title: "Kanu kieloben", art: "road-enz",
    text: "Unter den Felsen bei Mühlhausen treibt ein Kanu kieloben durch die Enzschleife. Am Ufer stehen zwei tropfnasse Paddler und schauen ihm nach. „Des war geliehe“, sagt der eine kleinlaut.",
    choices: [
      {
        text: "Mit dem Abschleppseil hinterher.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Du wirfst das Seil, beim dritten Mal sitzt es. Das Kanu ist gerettet, und die beiden legen zusammen: zwei Mark und ein nasser Händedruck.",
            marks: 2,
            chronicle: "In der Enzschleife bei Mühlhausen ein Kanu an Land gezogen.",
          } },
          { weight: 1, outcome: {
            text: "Das Seil fällt dreimal ins Wasser, das Kanu treibt um die Kurve. Die beiden lachen trotzdem: Jetzt sind wenigstens alle nass.",
          } },
        ],
      },
      {
        text: "Die zwei zum Bahnhof nach Mühlacker fahren.",
        outcomes: [{ outcome: {
          text: "Die beiden sitzen tropfend auf der Sitzbank und erzählen vom Studium. Am Bahnhof drücken sie dir drei Mark in die Hand. Der Umweg kostet einen Strich.",
          fuel: -1, marks: 3,
        } }],
      },
      {
        text: "Der Hund holt das Paddel.",
        req: { dog: "any" }, blue: true,
        outcomes: [{ outcome: {
          text: "{dog} springt in die Enz, schwimmt los und bringt wenigstens das Paddel zurück. Die Paddler sind gerührt und teilen ihr Pausenbrot mit {dog}.",
          chronicle: "{dog} hat in der Enz ein Paddel gerettet.",
        } }],
      },
    ],
  },
  {
    id: "mue-gewitter", pool: "region", region: "muehlacker",
    title: "Gewitter am Stromberg", art: "pitch-rain",
    text: "Über dem Stromberg wird der Himmel schwarz, dann kracht es. KRACH. Regen wie aus Kübeln, die Scheibenwischer geben auf. Am Weinberg steht ein kleines Häusle mit Licht im Fenster.",
    choices: [
      {
        text: "Im Weinberghäusle unterstehen.",
        outcomes: [{ outcome: {
          text: "Drin sitzt ein Wengerter aus Schützingen bei Kerzenlicht und legt Karten. „Grad recht. Ich hab a Aufgab, die krieg i net raus.“",
          puzzle: "problem",
        } }],
      },
      {
        text: "Im Wohnmobil abwarten.",
        outcomes: [{ outcome: {
          text: "Du kochst dir einen Kaffee und hörst dem Regen auf dem Dach zu. Nach einer Stunde ist alles vorbei, und der Stromberg dampft.",
        } }],
      },
      {
        text: "Beim Schäfer im Schäferkarren unterstehen.",
        req: { flag: "schaefer-freund" }, hideIfUnmet: true,
        outcomes: [{ outcome: {
          text: "Der Schäfer von der Straße winkt dich in seinen Karren. Ofen an, Brot und Speck auf dem Brett, Geschichten vom Stromberg. Zum Abschied schenkt er dir das Vesperbrett.",
          souvenir: "snack-board",
          chronicle: "Beim Gewitter im Schäferkarren gesessen und ein Vesperbrett bekommen.",
        } }],
      },
    ],
  },
  // ─── Die Mischmaschine ─────────────────────────────────────────────────────────────────────────────────────
  {
    id: "mue-mischmaschine", pool: "region", region: "muehlacker",
    title: "Die Mischmaschine", art: "flea-market",
    text: "Auf dem Krämermarkt in {place} führt ein Händler eine Kartenmischmaschine vor, mit Kurbel und Federwerk. „Nie wieder schief gemischt! Fünf Mark, und der Stammtisch liegt Ihnen zu Füßen.“ Dann kurbelt er, SCHEPPER, und die Karten fliegen ihm um die Ohren.",
    choices: [
      {
        text: "„Für fünf Mark misch ich ein Jahr lang selber.“",
        outcomes: [{ outcome: {
          text: "Die Umstehenden lachen, der Händler auch. „Recht hen Se“, sagt er leise und sammelt den Kreuz-Buben unter dem Tisch auf.",
        } }],
      },
      {
        text: "An der Kurbel selbst einmal probieren.",
        outcomes: [
          { weight: 1, outcome: {
            text: "Die Maschine rattert und spuckt alle vier Buben obenauf. Der ganze Markt lacht. „So was kauft mir jetzt koiner mehr“, seufzt der Händler und gibt dir zwei Mark, damit du weitergehst.",
            marks: 2,
            chronicle: "Auf dem Krämermarkt in {place} mit der Mischmaschine alle vier Buben gemischt.",
          } },
          { weight: 1, outcome: {
            text: "Die Maschine frisst eine Karte und gibt sie nicht wieder her. Der Händler klopft dagegen, die Maschine bleibt stur. Ihr trennt euch als Freunde.",
          } },
        ],
      },
      {
        text: "Mit der Lesebrille ins Federwerk schauen.",
        req: { souvenir: "reading-glasses" }, blue: true,
        outcomes: [{ outcome: {
          text: "Zwischen zwei Zahnrädern klemmt eine Karo-Sieben. Raus damit, und die Maschine mischt wie ein Uhrwerk. Der Händler verkauft drei Stück in zehn Minuten und gibt dir drei Mark ab.",
          marks: 3,
          chronicle: "Auf dem Krämermarkt in {place} eine Kartenmischmaschine repariert.",
        } }],
      },
    ],
  },
  {
    id: "mue-tankstelle", pool: "region", region: "muehlacker",
    title: "Tankstellen-Jubiläum", art: "petrol-station",
    text: "Die kleine Tankstelle in {place} wird zwanzig Jahre alt. Heute ist jeder Liter einen Groschen billiger, und der Tankwart wischt jedem die Scheibe. Vor den Zapfsäulen steht eine kleine Schlange.",
    choices: [
      {
        text: "Nachtanken zum Jubiläumspreis.",
        req: { marks: 2 },
        outcomes: [{ outcome: {
          text: "Der Tankwart prüft das Öl und erzählt von früher, als der Liter noch sechzig Pfennig kostete. Ein Strich mehr im Tank für zwei Mark.",
          marks: -2, fuel: 1,
        } }],
      },
      {
        text: "Auch den Zusatztank füllen.",
        req: { upgrade: "aux-tank", marks: 4 }, blue: true,
        outcomes: [{ outcome: {
          text: "Haupttank und Zusatztank, beides randvoll. Der Tankwart staunt, wie viel reingeht, und schenkt dir einen Duftbaum.",
          marks: -4, fuel: 2,
        } }],
      },
      {
        text: "Nur die Scheibe wischen lassen.",
        outcomes: [{ outcome: {
          text: "Er wischt die Scheibe, als ginge es um sein Leben. Die Welt sieht gleich klarer aus.",
        } }],
      },
    ],
  },
  {
    id: "mue-briefe", pool: "region", region: "muehlacker",
    title: "Briefe im Wind", art: "village-square",
    text: "In {place} kommt dir der Briefträger auf dem Fahrrad entgegen. Eine Böe, HUI, und seine Briefe flattern über die ganze Straße. „Heidanei“, ruft er, „die Rente vom halbe Dorf!“",
    choices: [
      {
        text: "Aussteigen und Briefe einsammeln.",
        outcomes: [{ outcome: {
          text: "Zehn Minuten später hat er alles wieder. Übrig bleibt eine Ansichtskarte ohne Adresse. „Nehmet Sie die. Schreibet Sie heim.“",
          souvenir: "postcard",
          chronicle: "In {place} dem Briefträger die Post zusammengesucht.",
        } }],
      },
      {
        text: "Im Schritttempo drumherum fahren.",
        outcomes: [{ outcome: {
          text: "Du fährst so langsam, dass kein Brief unter die Räder kommt. Der Briefträger winkt dankbar.",
        } }],
      },
      {
        text: "Die feine Nase findet den letzten Brief.",
        req: { dog: "schnauzer-a" }, blue: true,
        outcomes: [{ outcome: {
          text: "{dog} schnüffelt in der Hecke und kommt mit dem letzten Brief zurück, kaum angesabbert. Der Briefträger gibt eine Mark und eine Ansichtskarte: „Schreibet Sie heim.“",
          marks: 1, souvenir: "postcard",
          chronicle: "{dog} hat in {place} einen verlorenen Brief gefunden.",
        } }],
      },
    ],
  },
  {
    id: "mue-sigi", pool: "region", region: "muehlacker",
    title: "Der Sigi am Wohnmobil", art: "pitch-evening", portrait: "schwaetzer", speaker: "Schwätzer-Sigi",
    text: "Kaum stehst du in {place}, lehnt schon Schwätzer-Sigi am Wohnmobil. In fünf Minuten erzählt er vom Schwager, vom Wetter, vom Bürgermeister und welche Wirtschaft heute welche Hausregel hat. Luft holt er dabei keine.",
    choices: [
      {
        text: "Zuhören, eine ganze Stunde lang.",
        outcomes: [{ outcome: {
          text: "Danach weißt du alles über das Tal und noch mehr über den Schwager. Zum Abschied schenkt er dir seinen alten Straßenatlas: „Brauch i nimmer, i kenn eh älles.“",
          souvenir: "road-atlas",
          chronicle: "Schwätzer-Sigi eine Stunde zugehört und seinen Straßenatlas bekommen.",
        } }],
      },
      {
        text: "Höflich nicken und einsteigen.",
        outcomes: [{ outcome: {
          text: "Er redet weiter, auch als du schon losfährst. Im Rückspiegel siehst du ihn noch winken und reden.",
        } }],
      },
      {
        text: "Der Hund gähnt, laut und ausführlich.",
        req: { dog: "any" }, blue: true,
        outcomes: [{ outcome: {
          text: "{dog} gähnt herzhaft. Der Sigi stockt, lacht und sagt: „Ha, des Hundle hat recht.“ Nach zehn Minuten ist er weg und lässt dir eine Tüte Brezeln da.",
          chronicle: "{dog} hat Schwätzer-Sigi mit einem Gähnen zum Schweigen gebracht.",
        } }],
      },
    ],
  },
];

export const MUEHLACKER_FLAGS: Record<string, string> = {
  "schaefer-freund": "The shepherd dog cleared the Stromberg sheep off the road (mue-schafherde); the shepherd offers his cart in the thunderstorm (mue-gewitter).",
};
