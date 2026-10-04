// Nordschwarzwald (region "schwarzwald", Preisskat in Neuenbürg): Tannen, Nebel und Serpentinen, die Flößer von
// Calmbach und Höfen, Kurgäste aus Bad Wildbad, Uhrmacher aus der Goldstadt Pforzheim, Schinken, Kirschen und die
// Brennerei. Contract §4.10: 16 events, pool "region".
import type { EventDef } from "../../game/types.ts";

export const SCHWARZWALD_EVENTS: EventDef[] = [
  {
    id: "swa-brennerei", pool: "region", region: "schwarzwald",
    title: "Probe in der Brennerei", art: "distillery", portrait: "brenner", speaker: "Brenner Ernst",
    text: "Am Hof hinter {place} dampft der Kupferkessel, und es riecht nach Kirschen und Holzfeuer. Brenner Ernst winkt mit einem Gläschen: „Grüß Gott! Heut isch Probe, die Kirschen vom letzten Sommer.“ Wer probiert, fährt heute nicht mehr weiter.",
    choices: [
      {
        text: "Ein Gläschen probieren und über Nacht bleiben.",
        outcomes: [{ outcome: {
          text: "Ein Gläschen, drei Geschichten, und in der Stube liegen schon die Karten. Gefahren wird erst morgen, nach Kaffee und Speckbrot.",
          skat: {
            opponents: ["brenner", "schlitzohr"], stakes: "small",
            intro: "In der Stube hinter dem Kessel sitzt schon ’s Schlitzohr Fritz und mischt.",
          },
          chronicle: "In der Brennerei probiert, Skat gespielt und im Hof übernachtet.",
        } }],
      },
      {
        text: "Eine Flasche für daheim kaufen.",
        req: { marks: 3 },
        outcomes: [{ outcome: {
          text: "Ernst wickelt die Flasche in Zeitungspapier. „Für daheim, gell, net für unterwegs.“ Zum Abschied verrät er dir, wie man in Neuenbürg gegen ihn reizt: am besten gar nicht.",
          marks: -3,
          chronicle: "In der Brennerei eine Flasche Kirschwasser für daheim gekauft.",
        } }],
      },
      {
        text: "„Ich fahr noch. Einen Kaffee nehm ich gern.“",
        outcomes: [{ outcome: {
          text: "Ernst nickt. „Wer fährt, bleibt trocken. So g’hört sich des.“ Zum Kaffee gibt’s eine Tüte Kirschen für den Weg.",
        } }],
      },
    ],
  },
  {
    id: "swa-nebel", pool: "region", region: "schwarzwald",
    title: "Nebel in den Serpentinen", art: "forest-road", music: "schwarzwald",
    text: "Hinter {place} kriecht der Nebel aus dem Tal herauf. Die Serpentinen verschwinden schon nach zehn Metern im Grau. Vor dir brummt ein Milchlaster bergauf, gemächlich wie eine Kuh.",
    choices: [
      {
        text: "Hinter dem Milchlaster herfahren.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Der Fahrer kennt jede Kurve. Du hängst dich dran, und oben in der Sonne hupt er zum Abschied.",
          } },
          { weight: 1, outcome: {
            text: "Der Milchlaster biegt zu einem Hof ab, und du im Nebel hinterher. Bis du auf dem Misthaufen gewendet hast, ist ein Strich Sprit weg.",
            fuel: -1,
          } },
        ],
      },
      {
        text: "Anhalten und warten, bis sich der Nebel hebt.",
        outcomes: [{ outcome: {
          text: "Du kochst Kaffee und legst eine Patience. Nach einer Stunde reißt der Nebel auf, und die Tannen stehen da wie frisch gewaschen.",
        } }],
      },
      {
        text: "Den Verkehrsfunk im Autoradio einschalten.",
        req: { upgrade: "radio" }, blue: true,
        outcomes: [{ outcome: {
          text: "Der Sprecher meldet Nebel im Tal und freie Sicht auf der Höhenstraße. Du nimmst die Höhe, dazu läuft Blasmusik, und der Nebel bleibt unter dir.",
          chronicle: "Im Nebel dem Verkehrsfunk vertraut und über die Höhe gefahren.",
        } }],
      },
    ],
  },
  {
    id: "swa-floesser", pool: "region", region: "schwarzwald",
    title: "Das Floß auf der Enz", art: "raft", portrait: "floesser", speaker: "Flößer Jakob",
    text: "Unten an der Enz bindet der Flößerverein ein Floß zusammen, wie früher, als das Holz bis an den Rhein schwamm. Flößer Jakob stemmt die Stange in den Kies. „Mir fehlt einer am Heck. Traust di, {title}?“",
    choices: [
      {
        text: "Mit aufs Floß.",
        outcomes: [{ outcome: {
          text: "Die Stange ist schwerer als ein Grand ohne vier. Am Wehr wird es nass, und Jakob lacht, dass es bis Höfen hallt. Im Verein gibt’s für jeden Helfer drei Mark Flößerlohn, wie anno dazumal.",
          marks: 3,
          chronicle: "Mit dem Flößer Jakob auf der Enz gefahren und bis zum Gürtel nass geworden.",
        } }],
      },
      {
        text: "Lieber vom Ufer aus zuschauen.",
        outcomes: [{ outcome: {
          text: "Das Floß schießt übers Wehr, die Flößer jauchzen, und du bleibst trocken. Jakob winkt mit der Stange: „Nächstes Mal, {name}!“",
        } }],
      },
      {
        text: "Den nassen Flößern heißen Kaffee anbieten.",
        req: { souvenir: "thermos" }, blue: true,
        outcomes: [{ outcome: {
          text: "Kaffee aus der Thermoskanne, und schon gehörst du dazu. In der Vereinsstube liegt ein Kartenspiel, und Jakob schiebt dir einen Stuhl hin.",
          skat: {
            opponents: ["floesser", "kommandant"], stakes: "small",
            intro: "Kommandant Heiner hat mit der Feuerwehr am Wehr aufgepasst und mischt schon: „Antreten zum Reizen!“",
          },
          chronicle: "Mit den Flößern Kaffee getrunken und in der Vereinsstube Skat gespielt.",
        } }],
      },
    ],
  },
  {
    id: "swa-kurgaeste", pool: "region", region: "schwarzwald",
    title: "Kurgäste auf Ausflug", art: "spa", portrait: "rechnerin", speaker: "Frau Gerda",
    text: "Ein Bus voller Kurgäste aus Bad Wildbad macht in {place} Pause. Auf einer Bank sitzen Frau Gerda und Oberlehrer Walter, beide mit Kurkarte und Wolldecke. „Uns fehlt der Dritte“, sagt Gerda, „und der Bus fährt erst in einer Stunde.“",
    choices: [
      {
        text: "„Ich bin der Dritte.“",
        outcomes: [{ outcome: {
          text: "Gerda zählt die Karten nach, bevor sie gibt. Alle zweiunddreißig sind da, sie hat es nicht anders erwartet.",
          skat: {
            opponents: ["rechnerin", "lehrer"], stakes: "small",
            intro: "Walter breitet die Wolldecke als Tischtuch aus. „Merke: Auch auf der Kur gilt die Skatordnung.“",
          },
          chronicle: "Mit zwei Kurgästen aus Bad Wildbad auf der Parkbank Skat gespielt.",
        } }],
      },
      {
        text: "Zuschauen und kiebitzen.",
        outcomes: [{ outcome: {
          text: "„Kiebitze sind still“, sagt Walter streng. Du hältst den Mund und schaust, wie Gerda zählt: leise, mit den Lippen, ohne einen Fehler.",
        } }],
      },
    ],
  },
  {
    id: "swa-sommerberg", pool: "region", region: "schwarzwald",
    title: "Aufgabe vom Sommerberg", art: "kiosk",
    text: "Am Kiosk in {place} hängt ein Zettel: „Skataufgabe der Woche. Lösung oben auf dem Sommerberg, Kaffee aufs Haus.“ In Bad Wildbad fährt die Bergbahn hinauf. Daneben führt ein Wanderweg voller Wurzeln steil nach oben.",
    choices: [
      {
        text: "Mit der Bergbahn hinauf.",
        req: { marks: 2 },
        outcomes: [{ outcome: {
          text: "Die Bahn ruckelt den Berg hinauf, die Tannen ziehen vorbei. Oben legt dir der Wirt die Aufgabe auf einen Bierdeckel.",
          marks: -2, puzzle: "problem",
        } }],
      },
      {
        text: "Zu Fuß hinauf.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Nach einer Stunde bist du oben, nass geschwitzt, aber stolz. Der Wirt legt dir die Aufgabe hin.",
            puzzle: "problem",
          } },
          { weight: 1, outcome: {
            text: "Der Weg gabelt sich, und du nimmst die falsche Gabel. Als du endlich oben ankommst, hat der Wirt schon zugesperrt.",
          } },
        ],
      },
      {
        text: "{dog} vorauslaufen lassen.",
        req: { dog: "any" }, blue: true,
        outcomes: [{ outcome: {
          text: "{dog} zieht dich in Rekordzeit den Berg hinauf. Oben gibt’s für dich die Aufgabe und für {dog} einen Napf Wasser.",
          puzzle: "problem",
          chronicle: "Mit {dog} zu Fuß auf den Sommerberg gestiegen.",
        } }],
      },
    ],
  },
  {
    id: "swa-langholz", pool: "region", region: "schwarzwald",
    title: "Langholz quer", art: "forest-road",
    text: "Hinter einer Kurve liegt ein Tannenstamm quer über der Straße. Zwei Waldarbeiter stehen daneben und kratzen sich am Kopf. „Der isch vom Laster g’rutscht“, sagt der eine, „und mir machet grad Vesper.“",
    choices: [
      {
        text: "Mit anpacken.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Mit Hebel, Seil und drei Mann rollt der Stamm in den Graben. RUMMS. Zum Dank füllt dir der Ältere einen Strich aus seinem Kanister nach.",
            fuel: 1,
            chronicle: "Im Schwarzwald mit zwei Waldarbeitern einen Tannenstamm von der Straße gerollt.",
          } },
          { weight: 1, outcome: {
            text: "Der Stamm rührt sich keinen Zentimeter. Erst nach der Vesperpause zieht ihn der Rückeschlepper weg, und du kennst jetzt alle Geschichten aus dem Dorf.",
          } },
        ],
      },
      {
        text: "Warten, bis die Vesperpause vorbei ist.",
        outcomes: [{ outcome: {
          text: "Die Vesperpause dauert, so wie sie im Schwarzwald eben dauert. Dafür bekommst du ein Stück Speck und erfährst, wer im Dorf mit wem Skat spielt.",
        } }],
      },
      {
        text: "Kalten Sprudel aus dem Kühlschrank anbieten.",
        req: { upgrade: "fridge" }, blue: true,
        outcomes: [{ outcome: {
          text: "Kalter Sprudel mitten im Wald, da werden die Waldarbeiter munter. Der Stamm ist im Nu weg, und aus dem Kanister gibt’s einen Strich Sprit.",
          fuel: 1,
          chronicle: "Waldarbeiter mit kaltem Sprudel bestochen und freie Fahrt bekommen.",
        } }],
      },
    ],
  },
  {
    id: "swa-uhrmacher", pool: "region", region: "schwarzwald",
    title: "Der Uhrmacher", art: "flea-market",
    text: "Auf dem Markt in {place} hat ein alter Uhrmacher aus Pforzheim seinen Tisch aufgebaut. Taschenuhren, Wecker, eine Kuckucksuhr und eine Lupe mit Hornfassung. „Alles geht“, sagt er, „bloß i nimmer so schnell.“",
    choices: [
      {
        text: "Die Lupe kaufen.",
        req: { marks: 3 },
        outcomes: [{ outcome: {
          text: "Er putzt die Lupe am Ärmel und gibt sie dir. „Mit der sieht mr alles, was die andern übersehen.“",
          marks: -3, souvenir: "magnifier",
        } }],
      },
      {
        text: "Die Kuckucksuhr kaufen.",
        req: { marks: 4 },
        outcomes: [{ outcome: {
          text: "Der Kuckuck ruft die ganze Nacht, jede halbe Stunde. Am Morgen schenkst du die Uhr dem Platzwart, und der füllt dir vor Freude einen Strich Sprit nach.",
          marks: -4, fuel: 1,
          chronicle: "Eine Kuckucksuhr gekauft, eine Nacht nicht geschlafen und sie verschenkt.",
        } }],
      },
      {
        text: "Nur gucken.",
        outcomes: [{ outcome: {
          text: "Der Uhrmacher erzählt dir zu jeder Uhr ihre Geschichte. Als du gehst, ist es eine Stunde später, und alle Uhren auf dem Tisch sind sich darin einig.",
        } }],
      },
    ],
  },
  {
    id: "swa-schinkendieb", pool: "region", region: "schwarzwald",
    title: "Der Schinkendieb", art: "dog-thief",
    text: "Auf dem Campingtisch steht das Vesper: Brot, Rettich und Schwarzwälder Schinken. Da schießt der Hofhund vom Nachbarhof um die Ecke. ZACK, der Schinken ist weg, und der Bauer rennt fluchend hinterher.",
    choices: [
      {
        text: "Hinterherrennen.",
        outcomes: [{ outcome: {
          text: "Du rennst, der Bauer rennt, der Hund rennt schneller. Am Ende lachen alle drei, und der Bauer bringt dir ein neues Stück Schinken.",
        } }],
      },
      {
        text: "Lachen und abwarten.",
        outcomes: [{ outcome: {
          text: "„Heidanei, der Saukerle!“ Der Bauer holt aus der Räucherkammer ein ganzes Stück. „Des goht aufs Haus, weil Sie net g’schimpft hen.“",
          chronicle: "In {place} vom Hofhund beklaut und vom Bauern reich beschenkt worden.",
        } }],
      },
      {
        text: "Der Schäferhund nimmt die Verfolgung auf.",
        req: { dog: "shepherd" }, blue: true,
        outcomes: [{ outcome: {
          text: "{dog} stellt den Dieb hinter dem Misthaufen, ganz ohne Gebell. Der Bauer staunt und schenkt dir sein altes Vesperbrett. „So ein Hund, des isch ebbes wert.“",
          souvenir: "snack-board",
          chronicle: "{dog} hat in {place} einen Schinkendieb gestellt.",
        } }],
      },
    ],
  },
  {
    id: "swa-steintisch", pool: "region", region: "schwarzwald",
    title: "Zwei Rentner am Schachbrett", art: "village-square",
    text: "Am Brunnen in {place} stehen zwei Rentner über einem Steintisch mit Schachbrett und streiten. „Matt in zwei“, sagt der eine. „Nie im Leben“, sagt der andere. Dann zeigen beide auf dich: „Frag halt den do.“",
    choices: [
      {
        text: "Hinschauen und mitrechnen.",
        outcomes: [{ outcome: {
          text: "Die beiden treten zur Seite und verschränken die Arme. „Also, {title}, zeig her.“",
          puzzle: "chess",
        } }],
      },
      {
        text: "„Da halte ich mich raus.“",
        outcomes: [{ outcome: {
          text: "„Feigling“, brummen beide gleichzeitig und streiten weiter. Wenigstens sind sie sich in einem Punkt einig.",
        } }],
      },
      {
        text: "Die Schachuhr auf den Steintisch stellen.",
        req: { souvenir: "chess-clock" }, blue: true,
        outcomes: [{ outcome: {
          text: "TACKER, die Uhr läuft. Die Rentner sind beeindruckt: So ernst hat hier noch keiner Schach gespielt.",
          puzzle: "chess",
          chronicle: "In {place} zwei Rentnern am Steintisch ein Schachrätsel gelöst.",
        } }],
      },
    ],
  },
  {
    id: "swa-kirschen", pool: "region", region: "schwarzwald",
    title: "Kirschen pflücken", art: "orchard",
    text: "Am Ortsrand von {place} hängen die Kirschbäume so voll, dass sich die Äste biegen. Eine Bäuerin steht mit zwei leeren Körben unter der Leiter. „Mei Mann hat’s im Kreuz“, ruft sie. „Hätten Sie a Stündle?“",
    choices: [
      {
        text: "Auf die Leiter steigen.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Eine Stunde später sind beide Körbe voll und du hast Kirschsaft bis zu den Ellbogen. Die Bäuerin drückt dir drei Mark und eine Tüte Kirschen in die Hand.",
            marks: 3,
            chronicle: "In {place} Kirschen gepflückt, bis die Körbe voll waren.",
          } },
          { weight: 1, outcome: {
            text: "Auf der vierten Sprosse knackt es. KRACH. Die Leiter hält, die Hose nicht. Die Bäuerin flickt sie dir und zahlt trotzdem zwei Mark.",
            marks: 2,
          } },
        ],
      },
      {
        text: "„Leider nein, ich muss weiter.“",
        outcomes: [{ outcome: {
          text: "„Dann halt net“, sagt sie und wirft dir trotzdem eine Handvoll Kirschen ins Fenster. Die Kerne spuckst du bis zum nächsten Ort.",
        } }],
      },
    ],
  },
  {
    id: "swa-steige", pool: "region", region: "schwarzwald", requires: { vehicle: "camper" },
    title: "Die Steige", art: "van-breakdown",
    text: "Von der Enz geht es steil hinauf auf die Höhe. Auf halber Steige klettert die Nadel der Kühlwasseranzeige ins Rote. ZISCH, unter der Motorhaube dampft es wie in einer Waschküche.",
    choices: [
      {
        text: "Anhalten und Wasser aus dem Bach holen.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Mit dem Kaffeetopf schleppst du Bachwasser herbei, bis der Kühler satt ist. Danach schnurrt der Motor, als wäre nichts gewesen.",
            chronicle: "An der Steige den Kühler mit dem Kaffeetopf aus dem Bach gefüllt.",
          } },
          { weight: 1, outcome: {
            text: "Der Kühler trinkt den halben Bach. Bis alles wieder stimmt, läuft der Motor ein paarmal zur Probe, und ein Strich Sprit ist weg.",
            fuel: -1,
          } },
        ],
      },
      {
        text: "Den Abschleppdienst anrufen.",
        req: { marks: 4 },
        outcomes: [{ outcome: {
          text: "Der Abschleppwagen kommt nach einer Stunde, der Fahrer schraubt fünf Minuten. „Thermostat. Des g’hört so, dass der amal klemmt.“ Vier Mark, bitte.",
          marks: -4,
        } }],
      },
      {
        text: "Abwarten, ganz ruhig, wie der Wolfshund.",
        req: { dog: "wolfhound-b" }, blue: true,
        outcomes: [{ outcome: {
          text: "{dog} legt sich in den Schatten, und du legst dich daneben. Nach einer halben Stunde ist der Motor kalt, du bist ausgeruht, und weiter geht’s.",
        } }],
      },
    ],
  },
  {
    id: "swa-ehering", pool: "region", region: "schwarzwald",
    title: "Der Ring im Gully", art: "phone-booth",
    text: "Neben der gelben Telefonzelle in {place} kniet eine alte Dame am Gully. Beim Groschensuchen ist ihr der Ehering durchs Gitter gefallen. „Fünfzig Jahr hat der g’halte“, sagt sie, „und jetzt des.“",
    choices: [
      {
        text: "Mit Draht und Kaugummi angeln.",
        outcomes: [
          { weight: 1, outcome: {
            text: "Ein Stück Draht, ein Kaugummi, viel Geduld. Beim dritten Versuch hängt der Ring dran. Die Dame drückt dir ihren Glücksgroschen in die Hand.",
            souvenir: "lucky-penny",
            chronicle: "In {place} mit Draht und Kaugummi einen Ehering aus dem Gully geangelt.",
          } },
          { weight: 1, outcome: {
            text: "Der Kaugummi hält, der Draht nicht. Ihr ruft gemeinsam beim Bauhof an, zwei Männer heben das Gitter, und der Ring ist gerettet.",
          } },
        ],
      },
      {
        text: "Beim Bauhof anrufen.",
        outcomes: [{ outcome: {
          text: "Zwei Männer vom Bauhof heben das Gitter, finden den Ring und dazu zwei Mark in Groschen. „Finderlohn“, sagt der eine und teilt mit dir.",
          marks: 1,
        } }],
      },
      {
        text: "Mit der Lupe ins Dunkel schauen.",
        req: { souvenir: "magnifier" }, blue: true,
        outcomes: [{ outcome: {
          text: "Durch die Lupe siehst du ihn: Der Ring liegt auf einem Mauervorsprung gleich unter dem Gitter. Mit einem Zweig ist er in einer Minute oben, und die Dame schenkt dir ihren Glücksgroschen.",
          souvenir: "lucky-penny",
          chronicle: "In {place} mit der Lupe einen Ehering aus dem Gully gerettet.",
        } }],
      },
    ],
  },
  {
    id: "swa-wandergruppe", pool: "region", region: "schwarzwald", requires: { vehicle: "camper" },
    title: "Die Wandergruppe", art: "pitch-evening", music: "stellplatz",
    text: "Es dämmert, als eine Wandergruppe an deinem Stellplatz vorbeistolpert. Sechs Leute mit Hut, Stock und Abzeichen, alle müde. „Mir haben uns verlaufen“, sagt der Wanderführer kleinlaut. „Und der letzte Bus isch weg.“",
    choices: [
      {
        text: "Alle sechs einladen und heimfahren.",
        outcomes: [{ outcome: {
          text: "Sechs Wanderer im Alkoven, Stöcke im Gang, und alle singen. Am Ziel legen sie zusammen: vier Mark für den Sprit und ein Lied zum Abschied.",
          fuel: -1, marks: 4,
          chronicle: "Eine verirrte Wandergruppe mit Gesang im Wohnmobil heimgefahren.",
        } }],
      },
      {
        text: "Mit dem Straßenatlas den Weg zeigen.",
        req: { souvenir: "road-atlas" }, blue: true,
        outcomes: [{ outcome: {
          text: "Im Atlas findet ihr den Wanderweg: nur zwei Kilometer bis zum Gasthaus. Der Wanderführer schenkt dir zwei Mark und sein Ehrenwort, nie wieder ohne Karte loszugehen.",
          marks: 2,
        } }],
      },
      {
        text: "Einen Kaffee anbieten und gute Nacht wünschen.",
        outcomes: [{ outcome: {
          text: "Sie trinken deinen Kaffee aus und marschieren weiter, diesmal in die richtige Richtung. Hoffentlich.",
        } }],
      },
    ],
  },
  {
    id: "swa-streit", pool: "region", region: "schwarzwald",
    title: "Streit am Stammtisch", art: "inn-stube", portrait: "grandspieler", speaker: "Grand-Helmut",
    text: "In der Wirtschaft von {place} streiten Grand-Helmut und Oberlehrer Walter, dass die Gläser zittern. „Beim Handspiel gehört der Skat am End mir“, ruft Helmut. „Falsch“, sagt Walter, „der zählt nicht mit.“ Beide schauen dich an: „Du entscheidest, {title}.“",
    choices: [
      {
        text: "„Der Skat gehört dem Alleinspieler, auch beim Handspiel.“",
        outcomes: [{ outcome: {
          text: "Helmut haut auf den Tisch, dass die Karten springen. Walter schlägt die Skatordnung nach, liest zweimal und gibt dir dann stumm die Hand. Die Wette zahlt er an dich: zwei Mark.",
          marks: 2,
          chronicle: "Am Stammtisch in {place} einen Streit nach der Skatordnung entschieden.",
        } }],
      },
      {
        text: "„Beim Handspiel bleibt der Skat außen vor.“",
        outcomes: [{ outcome: {
          text: "Walter nickt zufrieden, Helmut holt die Skatordnung. Schwarz auf weiß: Der Skat gehört dem Alleinspieler, auch beim Handspiel. Die ganze Stube lacht, und du lachst mit.",
        } }],
      },
      {
        text: "Die Lesebrille aufsetzen und die Skatordnung zitieren.",
        req: { souvenir: "reading-glasses" }, blue: true,
        outcomes: [{ outcome: {
          text: "Mit der Lesebrille findest du die Stelle sofort: Der Skat gehört dem Alleinspieler, auch beim Handspiel. Der Wirt ist so beeindruckt, dass er dir einen Bierdeckel mit Widmung schenkt.",
          beerMat: "hand-bonus",
          chronicle: "Am Stammtisch in {place} die Skatordnung zitiert und einen Bierdeckel bekommen.",
        } }],
      },
    ],
  },
  // ─── Die Sägmühle ──────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "swa-saegmuehle", pool: "region", region: "schwarzwald",
    title: "Die Sägmühle", art: "forest-road",
    text: "Vor der Sägmühle bei {place} riecht es nach frischem Tannenholz, und die Gattersäge kreischt. Der Sägmüller hört deinen Scheibenwischer quietschen und hebt die Hand. „Do quietscht ebbes. Kommet Se rei, i hab für alles a Mittel.“",
    choices: [
      {
        text: "Mit in die Sägmühle.",
        outcomes: [{ outcome: {
          text: "Zwischen Brettern und Sägespänen zeigt er dir die alte Säge, die das Wasser antreibt. Für den Scheibenwischer schenkt er dir sein Ölkännchen. „I hab noch drei.“",
          souvenir: "oil-can",
          chronicle: "In einer Sägmühle im Schwarzwald ein Ölkännchen geschenkt bekommen.",
        } }],
      },
      {
        text: "Sich eine Dachbox aus Tannenholz zimmern lassen.",
        req: { marks: 5, vehicle: "camper" },
        outcomes: [{ outcome: {
          text: "Aus drei Brettern und einer Rolle Dachpappe zimmert er dir eine Dachbox. Sie riecht nach Tanne und hält dicht, versprochen.",
          marks: -5,
          upgrade: "roof-box",
          chronicle: "Im Sägewerk eine Dachbox aus Tannenholz zimmern lassen.",
        } }],
      },
      {
        text: "„Danke, das Quietschen gehört dazu.“",
        outcomes: [{ outcome: {
          text: "Der Sägmüller lacht und wirft die Säge wieder an. Der Geruch von Tannenholz fährt noch zwei Dörfer weit mit.",
        } }],
      },
    ],
  },
  {
    id: "swa-zwoelfender", pool: "region", region: "schwarzwald", requires: { vehicle: "camper" },
    title: "Der Zwölfender", art: "forest-road",
    text: "Nachts auf der Waldstraße steht plötzlich ein mächtiger Zwölfender im Scheinwerferlicht. Er rührt sich nicht und schaut, als hätte er Vorfahrt. Im Schrank hinter dir wartet das Geschirr auf deine Entscheidung.",
    choices: [
      {
        text: "Voll in die Eisen.",
        outcomes: [{ outcome: {
          text: "Das Wohnmobil steht, das Geschirr nicht: SCHEPPER. Der Zwölfender schaut dich noch einmal an und schreitet in den Wald. Zwei Tassen sind hin, sonst ist alles heil.",
          chronicle: "Nachts einem Zwölfender die Vorfahrt gelassen. Zwei Tassen weniger.",
        } }],
      },
      {
        text: "Hupen.",
        outcomes: [{ outcome: {
          text: "Er hebt den Kopf, als hätte er dich gehört und beschlossen, dass es ihn nicht interessiert. Nach fünf Minuten geht er. Du hupst ihm leise hinterher.",
        } }],
      },
      {
        text: "Der Riesenschnauzer hat ihn längst gewittert.",
        req: { dog: "schnauzer-a" }, blue: true,
        outcomes: [{ outcome: {
          text: "{dog} hat schon eine Kurve vorher leise geknurrt. Du warst langsam, rollst sanft aus, und im Schrank klappert kein einziger Löffel.",
          chronicle: "Dank {dog} einem Zwölfender rechtzeitig ausgewichen.",
        } }],
      },
    ],
  },
];

/** This deck sets and reads no tour flags. */
export const SCHWARZWALD_FLAGS: Record<string, string> = {};
