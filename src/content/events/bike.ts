// Motorcycle events (contract §4.10): pool "bike", 12 drawn events. They happen with the machine off the rack (or on
// the Gespann), at the garage or at the Motorradtreff. The rider stays sober; at the Treff the bikers camp and their
// machines stand in the meadow until morning. Texts say „die Maschine“ and never name the camper, so they also fit the
// Gespann.
import type { EventDef } from "../../game/types.ts";

export const BIKE_EVENTS: EventDef[] = [
  // ─── Werkstatt: dem Lehrling fällt der Auspuff ab ──────────────────────────────────────────────────────────
  {
    id: "bike-auspuff", pool: "bike",
    title: "Das gehört so", art: "exhaust",
    portrait: "meister", speaker: "Meister Kächele",
    text: "In der Werkstatt soll Lehrling Bernd nur die Kette nachspannen. RUMMS. Der Auspuff liegt auf dem Boden, Bernd hält noch die Schelle in der Hand. Meister Kächele schaut kurz hin. „Des g’hört so.“",
    choices: [
      {
        text: "„Und was kostet es, wenn es so gehört?“",
        req: { marks: 4 },
        outcomes: [{ outcome: {
          text: "Kächele schweißt, Bernd hält die Lampe, und zwar meistens dahin, wo nichts zu sehen ist. Hinterher klingt die Maschine satter als vorher. „Hab i doch g’sagt.“",
          marks: -4,
          chronicle: "Bei Meister Kächele ist der Auspuff abgefallen. Es hat so gehört.",
        } }],
      },
      {
        text: "Selbst festmachen, mit Draht und gutem Zureden.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Zwei Meter Bindedraht, eine Zange und ein paar freundliche Worte. Der Auspuff hält. Kächele nickt anerkennend: „Des hätt i jetzt au so g’macht.“",
          } },
          { weight: 1, outcome: {
            text: "Der Auspuff hält, aber jetzt klingt die Maschine wie ein Traktor beim Heuen. RÖÖÖHR. Im nächsten Dorf drehen sich alle Köpfe um. Es gibt Schlimmeres.",
          } },
        ],
      },
      {
        text: "„Spielen wir nach Feierabend um die Schweißnaht?“",
        outcomes: [{ outcome: {
          text: "Kächele wischt sich die Hände an der Hose ab. „Bernd, hol die Karten. Und fass nix an auf dem Weg.“",
          skat: {
            opponents: ["meister", "lehrling"],
            intro: "Gespielt wird auf der Werkbank, zwischen Ölkanne und Schraubstock. Bernd mischt. Hoffentlich.",
          },
        } }],
      },
    ],
  },

  // ─── Mofa-Rocker an der Tankstelle ─────────────────────────────────────────────────────────────────────────
  {
    id: "bike-mofa-rocker", pool: "bike",
    title: "Bis zum Ortsschild", art: "petrol-station",
    text: "An der Tankstelle lehnen drei Mofa-Rocker in Kutten an ihren Mofas. TACKER-TACKER, macht der Leerlauf. Der Größte zeigt auf deine Maschine. „Bis zum Ortsschild. Wer verliert, zahlt das Eis.“",
    choices: [
      {
        text: "„Na gut. Aber ihr fahrt ordentlich.“",
        outcomes: [{ outcome: {
          text: "Die Mofas knattern los, mit Rückenwind fünfundzwanzig Sachen. Du lässt ihnen einen Vorsprung und bist trotzdem im zweiten Gang am Ortsschild. Die Jungs zahlen das Eis und wollen alles über die Maschine wissen.",
          chronicle: "Gegen drei Mofa-Rocker bis zum Ortsschild gefahren. Im zweiten Gang gewonnen.",
        } }],
      },
      {
        text: "„Lieber gleich ein Eis für alle.“",
        req: { marks: 2 },
        outcomes: [{ outcome: {
          text: "Für zwei Mark gibt’s fünf Eis am Stiel. Die Rocker zeigen dir ihre frisierten Mofas, du zeigst ihnen, wie man eine Zündkerze wechselt. Respekt auf beiden Seiten.",
          marks: -2,
        } }],
      },
      {
        text: "Der Kleinste darf eine Runde im Beiwagen mitfahren.",
        req: { upgrade: "sidecar" }, blue: true,
        outcomes: [{ outcome: {
          text: "Der Kleinste sitzt im Beiwagen und strahlt bis zum Ortsschild und zurück. Der Tankwart ist sein Onkel. Er füllt dir einen Strich Sprit auf, ohne die Kasse aufzumachen.",
          fuel: 1,
        } }],
      },
    ],
  },

  // ─── Motorradtreff: der dritte Mann ────────────────────────────────────────────────────────────────────────
  {
    id: "bike-treff", pool: "bike", music: "motorradtreff",
    title: "Der dritte Mann am Treff", art: "bike-meet",
    portrait: "biker-uschi", speaker: "Biker-Uschi",
    text: "Am Motorradtreff stehen die Maschinen in einer Reihe, dahinter die Zelte. Biker-Manne hat einen Kartentisch auf eine Kiste gestellt. Biker-Uschi mischt. „Uns fehlt der Dritte. Hast du Hände?“",
    choices: [
      {
        text: "„Zwei Stück. Wer gibt?“",
        outcomes: [{ outcome: {
          text: "Manne rückt eine Kiste als Stuhl heran. Die Maschinen stehen bis morgen auf der Wiese, die Zelte sind schon aufgebaut. Es kann losgehen.",
          skat: {
            opponents: ["biker-manne", "biker-uschi"],
            intro: "Am Lagerfeuer, auf einer Kiste, mit Kettenfett an den Karten. Manne reizt schon, bevor gegeben ist.",
          },
        } }],
      },
      {
        text: "Lieber am Lagerfeuer Benzin reden.",
        outcomes: [{ outcome: {
          text: "Es geht um Vergaser, Kurven und eine Pässefahrt in den Alpen, die jedes Jahr ein bisschen länger wird. Um Mitternacht kennst du jeden Kolben am Platz beim Vornamen.",
          chronicle: "Am Motorradtreff bis Mitternacht Benzin geredet.",
        } }],
      },
      {
        text: "Erst eine Runde mit dem Gespann über die Wiese.",
        req: { vehicle: "sidecar-rig" }, blue: true,
        outcomes: [{ outcome: {
          text: "Uschi steigt in den Beiwagen und juchzt in jeder Kurve. Hinterher schreibt sie dir die Hausregel vom Treff auf einen Bierdeckel: doppelter Pott, doppeltes Risiko.",
          beerMat: "double-pot",
          chronicle: "Mit Biker-Uschi im Beiwagen über die Treffwiese gefahren.",
        } }],
      },
    ],
  },

  // ─── Der Kickstarter will nicht ────────────────────────────────────────────────────────────────────────────
  {
    id: "bike-kickstarter", pool: "bike",
    title: "Sie will nicht", art: "bike-roadside",
    text: "Die Maschine will nicht. Du trittst den Kickstarter einmal, zweimal, zehnmal. Nichts. Ein Bussard sitzt auf dem Weidezaun und schaut zu, als hätte er heute nichts mehr vor.",
    choices: [
      {
        text: "Zündkerze raus, abwischen, wieder rein.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Die Kerze ist verrußt wie ein Ofenrohr. Abwischen, reinschrauben, treten. RÖÖÖHR. Der Bussard fliegt beleidigt davon.",
          } },
          { weight: 1, outcome: {
            text: "Die Kerze ist sauber, die Maschine bleibt stumm. Ein Bauer zieht dich mit dem Traktor bis ins Dorf, und dort springt sie an, als wäre nichts gewesen. Der Umweg kostet einen Strich Sprit.",
            fuel: -1,
          } },
        ],
      },
      {
        text: "Bergab rollen lassen und den Gang reinwerfen.",
        outcomes: [{ outcome: {
          text: "Kupplung ziehen, rollen, rollen, Gang rein, Kupplung kommen lassen. Ein Ruck, ein Husten, dann RÖÖÖHR. Wie früher, nur die Knie sind älter.",
          chronicle: "Die Maschine bergab angeschoben, wie früher.",
        } }],
      },
      {
        text: "Ein Tropfen aus dem Ölkännchen an den Gaszug.",
        req: { souvenir: "oil-can" }, blue: true,
        outcomes: [{ outcome: {
          text: "Der Gaszug hat geklemmt, sonst nichts. Ein Tropfen, ein Tritt, RÖÖÖHR. Der Bussard nickt, so sieht es jedenfalls aus.",
        } }],
      },
    ],
  },

  // ─── Der Tankrucksack ──────────────────────────────────────────────────────────────────────────────────────
  {
    id: "bike-tankrucksack", pool: "bike",
    title: "Der Tankrucksack", art: "petrol-station",
    text: "An der Tankstelle in {place} tankt ein Holländer mit hoch bepackter Maschine. Beim Losfahren rutscht ihm der Tankrucksack herunter und bleibt neben der Zapfsäule liegen. Er merkt nichts und biegt schon um die Ecke.",
    choices: [
      {
        text: "Den Rucksack schnappen und hinterher.",
        outcomes: [{ outcome: {
          text: "Drei Dörfer weiter holst du ihn an einer Ampel ein. Er kann es kaum glauben, schenkt dir ein Stück Käse so groß wie ein Ziegelstein und drei Mark.",
          fuel: -1,
          marks: 3,
          chronicle: "Einem Holländer seinen Tankrucksack drei Dörfer weit nachgefahren.",
        } }],
      },
      {
        text: "Beim Tankwart abgeben.",
        outcomes: [{ outcome: {
          text: "Der Tankwart legt den Rucksack hinter die Kasse. „Der kommt wieder, die kommet alle wieder.“ Eine Stunde später ist er tatsächlich da und winkt dir im Vorbeifahren.",
        } }],
      },
      {
        text: "Im Straßenatlas seine Route erraten und abkürzen.",
        req: { souvenir: "road-atlas" }, blue: true,
        outcomes: [{ outcome: {
          text: "Er fährt sicher zum Rhein, also nimmst du die Abkürzung über den Berg. Als er um die Kurve kommt, stehst du schon da und hältst den Rucksack hoch. Drei Mark und ein Händedruck.",
          marks: 3,
          chronicle: "Mit dem Straßenatlas einem Holländer den Weg abgeschnitten, im Guten.",
        } }],
      },
    ],
  },

  // ─── Der alte Gottlob und die Maschine ─────────────────────────────────────────────────────────────────────
  {
    id: "bike-gottlob", pool: "bike",
    title: "Genau so eine", art: "village-square",
    portrait: "altmeister", speaker: "Der alte Gottlob",
    text: "Am Dorfbrunnen bleibt der alte Gottlob vor deiner Maschine stehen. Er geht einmal drumherum, ganz langsam. „Genau so eine bin i g’fahren. Zweiundsechzig, bis an den Gardasee.“",
    choices: [
      {
        text: "„Setzen Sie sich drauf.“",
        outcomes: [{ outcome: {
          text: "Gottlob setzt sich drauf, die Hände am Lenker, und sagt eine ganze Weile nichts. Dann holt er aus der Manteltasche einen alten Straßenatlas. „Die Straßen stimmen noch. Bloß die Tankstellen net.“",
          souvenir: "road-atlas",
        } }],
      },
      {
        text: "„Erzählen Sie. Wie war’s am Gardasee?“",
        outcomes: [{ outcome: {
          text: "Er erzählt von einem Pass im Regen, einer Kette, die in Bozen gerissen ist, und einer Wirtin, die ihm den Schlauch geflickt hat. Für seine Verhältnisse ist das eine sehr lange Rede.",
          chronicle: "Der alte Gottlob hat vom Gardasee erzählt, zweiundsechzig, mit genau so einer Maschine.",
        } }],
      },
      {
        text: "„Was ist aus Ihrer Maschine geworden?“",
        outcomes: [{ outcome: {
          text: "„Verkauft, einundsiebzig. Aber den Beiwagen hab i noch, in der Scheune.“ Eine Stunde später ist er dran. Gottlob will kein Geld. „Der soll fahren, net rumstehen.“",
          upgrade: "sidecar",
          chronicle: "Vom alten Gottlob den Beiwagen von zweiundsechzig bekommen.",
        } }],
      },
    ],
  },

  // ─── Platten im Wald ───────────────────────────────────────────────────────────────────────────────────────
  {
    id: "bike-platten", pool: "bike",
    title: "Platten im Wald", art: "bike-roadside",
    text: "ZISCH. Der Hinterreifen ist platt. Der nächste Ort ist zwölf Kilometer weit, und im Wald ist es sehr still.",
    choices: [
      {
        text: "Flickzeug raus und los.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Rad raus, Schlauch raus, Loch finden, Flicken drauf. Nach einer Stunde hast du schwarze Hände und einen runden Reifen. So muss das.",
          } },
          { weight: 1, outcome: {
            text: "Das Loch ist größer als der Flicken. Du schiebst bis zur nächsten Werkstatt und kaufst dort einen neuen Schlauch. Der Umweg kostet einen Strich Sprit.",
            fuel: -1,
          } },
        ],
      },
      {
        text: "Den Daumen raushalten.",
        outcomes: [{ outcome: {
          text: "Der Milchlaster hält. Der Fahrer hat Flickzeug, einen Kompressor und eine Meinung zu jeder Maschine der Welt. Nach zwanzig Minuten fährst du weiter, mit einem Ohr voller Ratschläge.",
        } }],
      },
      {
        text: "Mit der Lupe findet man das kleinste Loch.",
        req: { souvenir: "magnifier" }, blue: true,
        outcomes: [{ outcome: {
          text: "Unter der Lupe sieht man den Dorn sofort, einen winzigen Schlehendorn. Raus damit, Flicken drauf, aufpumpen. In zwanzig Minuten bist du wieder unterwegs.",
        } }],
      },
    ],
  },

  // ─── Die Motorradhose ─────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "bike-lederhose", pool: "bike",
    title: "Die Naht am Knie", art: "village-square",
    text: "Beim Absteigen reißt die lederne Motorradhose am Knie, mit einem Geräusch, das der halbe Marktplatz hört. Zwei Frauen am Brunnen schauen weg, so gut sie können.",
    choices: [
      {
        text: "Zur Schneiderin im Ort.",
        req: { marks: 2 },
        outcomes: [{ outcome: {
          text: "Die Schneiderin näht mit dem dicken Faden und erzählt von ihrem Mann, der auch so eine Hose hatte. „Der isch damit bis nach Holland.“ Die Naht hält jetzt besser als der Rest.",
          marks: -2,
        } }],
      },
      {
        text: "Mit Isolierband aus der Werkzeugrolle flicken.",
        outcomes: [{ outcome: {
          text: "Schwarzes Isolierband, dreimal rum. Es hält und sieht aus wie ein Rennstreifen. Ab jetzt ist das Absicht.",
          chronicle: "Die Motorradhose mit Isolierband geflickt. Sieht aus wie ein Rennstreifen.",
        } }],
      },
    ],
  },

  // ─── Die Kurvenstraße ──────────────────────────────────────────────────────────────────────────────────────
  {
    id: "bike-kurven", pool: "bike",
    title: "Die Kurvenstraße", art: "bike-curves",
    text: "Eine Straße wie gemalt: Kurve links, Kurve rechts, kein Auto, frischer Asphalt. Ein Bussard segelt eine Weile neben dir her. HUI.",
    choices: [
      {
        text: "Umdrehen und das Ganze noch einmal.",
        outcomes: [{ outcome: {
          text: "Runter, umdrehen, rauf, umdrehen, runter. Beim dritten Mal winkt dir der Bussard nicht mehr. Es kostet einen Strich Sprit und ist jeden Tropfen wert.",
          fuel: -1,
          chronicle: "Eine Kurvenstraße dreimal gefahren, weil sie so schön war.",
        } }],
      },
      {
        text: "Weiterfahren und die Straße im Kopf behalten.",
        outcomes: [{ outcome: {
          text: "Manche Straßen fährt man einmal und dann ein Leben lang im Kopf. Diese ist so eine.",
        } }],
      },
      {
        text: "Anhalten und der Maschine beim Abkühlen zuhören.",
        req: { profile: "bike" }, hideIfUnmet: true,
        outcomes: [{ outcome: {
          text: "Am Straßenrand tickt der Motor beim Abkühlen. Da steht sie: {bike}. Der Bussard dreht noch eine Runde, und du findest, dass es keine schönere gibt.",
          chronicle: "An der Kurvenstraße angehalten und der Maschine beim Abkühlen zugehört.",
        } }],
      },
    ],
  },

  // ─── Am Lagerfeuer ─────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "bike-lagerfeuer", pool: "bike", music: "motorradtreff",
    title: "Am Lagerfeuer", art: "bike-meet",
    portrait: "biker-manne", speaker: "Biker-Manne",
    text: "Nachts am Treff knistert das Lagerfeuer. Biker-Manne dreht eine Kette in den Händen. „Die längt sich, die Sau. Was machst du da?“ Biker-Uschi hat derweil Karten offen auf eine Kiste gelegt.",
    choices: [
      {
        text: "Manne die Kette erklären.",
        outcomes: [{ outcome: {
          text: "Nachspannen, schmieren, nicht zu stramm. Manne hört zu wie in der Kirche. Zum Dank füllt er dir aus seinem Reservekanister einen Strich Sprit in den Tank.",
          fuel: 1,
        } }],
      },
      {
        text: "Zu Uschi und ihrer Skataufgabe.",
        outcomes: [{ outcome: {
          text: "„Fünf Stiche noch, du bist dran. Wie kriegst du die alle?“ Uschi schiebt dir die Kiste hin und wärmt sich die Hände am Feuer.",
          puzzle: "problem",
        } }],
      },
      {
        text: "Das Autoradio aufdrehen, für Musik am Feuer.",
        req: { upgrade: "radio" }, blue: true,
        outcomes: [{ outcome: {
          text: "Aus dem Radio kommt eine Gitarre, die nach Amerika klingt. Der ganze Treff rückt ans Feuer. Um zwei Uhr nachts kennt dich jeder hier und schuldet dir ein Lied.",
          chronicle: "Am Treff die Nacht mit Radiomusik am Lagerfeuer verbracht.",
        } }],
      },
    ],
  },

  // ─── Der Kurvenfotograf ────────────────────────────────────────────────────────────────────────────────────
  {
    id: "bike-fotograf", pool: "bike",
    title: "Der Kurvenfotograf", art: "bike-curves",
    text: "In der schönsten Kurve hinter {place} sitzt ein Mann mit Kamera auf einem Klappstuhl. Er fotografiert jeden, der sich in die Kurve legt, und verkauft die Bilder unten am Parkplatz. „Zwei Mark der Abzug. Sie lieget drin wie a Rennfahrer.“",
    choices: [
      {
        text: "Ein Bild kaufen.",
        req: { marks: 2 },
        outcomes: [{ outcome: {
          text: "Auf dem Foto liegt die Maschine so schräg wie nie, und du schaust grimmig wie ein Werksfahrer. Das Bild kommt hinter die Sonnenblende.",
          marks: -2,
          chronicle: "In der Kurve hinter {place} fotografiert worden. Schräg wie ein Rennfahrer.",
        } }],
      },
      {
        text: "Noch einmal durch die Kurve, für ein besseres Bild.",
        outcomes: [
          { weight: 1, outcome: {
            text: "Beim zweiten Mal winkst du sogar in die Kamera. Der Fotograf lacht so sehr, dass er dir das Bild schenkt. Den Sprit schenkt dir keiner.",
            fuel: -1,
            chronicle: "Für ein Foto zweimal durch dieselbe Kurve gefahren.",
          } },
          { weight: 1, outcome: {
            text: "Beim zweiten Mal kommt ein Traktor entgegen, und du fährst brav wie in der Fahrschule. Das Bild ist scharf, aber langweilig. Du lässt es hängen.",
            fuel: -1,
          } },
        ],
      },
      {
        text: "Den Fotografen im Beiwagen mitnehmen.",
        req: { upgrade: "sidecar" }, blue: true,
        outcomes: [{ outcome: {
          text: "Er fotografiert aus dem Beiwagen nach vorn, mitten in der Kurve. HUI. Solche Bilder hat er noch nie gehabt. Er schenkt dir den ersten Abzug und drei Mark Mitfahrgeld.",
          marks: 3,
          chronicle: "Einen Kurvenfotografen im Beiwagen mitgenommen.",
        } }],
      },
    ],
  },

  // ─── Gewitter auf der Höhe ─────────────────────────────────────────────────────────────────────────────────
  {
    id: "bike-gewitter", pool: "bike",
    title: "Gewitter", art: "bike-curves",
    text: "Über dem Höhenrücken wird es schwarz. KRACH, macht der Donner. Die nächste Scheune ist zweihundert Meter weg.",
    choices: [
      {
        text: "Ab in die Scheune.",
        outcomes: [{ outcome: {
          text: "Der Bauer stellt dir einen Kaffee hin und das Lokalblatt von letzter Woche, Rätselseite oben. „Des dauert, bis des vorbei isch.“",
          puzzle: "sudoku",
        } }],
      },
      {
        text: "Durchfahren, ist ja nur Wasser.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Es ist nicht nur Wasser, es ist eine ganze Talsperre. Aber nach zehn Minuten scheint die Sonne, und du dampfst beim Fahren wie eine Lokomotive.",
          } },
          { weight: 1, outcome: {
            text: "Danach ist die Zündung nass, und die Maschine spuckt und hustet bis ins nächste Dorf. Trocknen, warten, wieder treten. Das kostet einen Strich Sprit.",
            fuel: -1,
          } },
        ],
      },
      {
        text: "Unter dem Vordach warten und die Maschine trockenreiben.",
        req: { profile: "bike" }, hideIfUnmet: true,
        outcomes: [{ outcome: {
          text: "Du reibst mit dem Ärmel jeden Tropfen vom Tank. Der Bauer schaut aus der Scheune und nickt: „Schön isch die.“ Und das ist sie: {bike}.",
        } }],
      },
    ],
  },
];

/** This deck sets and reads no flags. */
export const BIKE_FLAGS: Record<string, string> = {};
