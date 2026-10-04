// Stuttgart (region "stuttgart", Preisskat in Bad Cannstatt): Wasen und Festzelt, Stäffele und Zacke, Killesberg und
// Fernsehturm, Werkstor und Schichtwechsel, Weinberge über dem Neckar, Straßenbahn, Baustellen und ein Wohnmobil im
// Stadtverkehr. Contract §4.10: 16 events, pool "region".
import type { EventDef } from "../../game/types.ts";

export const STUTTGART_EVENTS: EventDef[] = [
  {
    id: "stg-staeffele", pool: "region", region: "stuttgart", requires: { vehicle: "camper" },
    title: "Die Stäffele", art: "staeffele",
    text: "Der Atlas sagt: geradeaus den Berg hinauf. Die Straße sagt nach hundert Metern: Schluss, ab hier nur noch Stäffele, zweihundert Stufen. Oben am Geländer lehnt eine Frau in Kittelschürze und wartet, was du jetzt machst.",
    choices: [
      {
        text: "Rückwärts wieder hinunter.",
        outcomes: [
          { weight: 2, outcome: {
            text: "„Weiter, weiter, weiter … halt!“ Die Frau winkt dich Meter für Meter zurück, als hätte sie nie etwas anderes gemacht. Unten sagt sie nur: „Sie sind net der Erste.“",
          } },
          { weight: 1, outcome: {
            text: "„Weiter, weiter … halt!“ Zu spät: SCHEPPER, die Mülltonne liegt. Du stellst sie auf, kehrst zusammen, und das Rangieren kostet dich einen Strich Sprit.",
            fuel: -1,
          } },
        ],
      },
      {
        text: "Zu Fuß die Stäffele hinauf.",
        outcomes: [{ outcome: {
          text: "Zweihundert Stufen später hast du eine Brezel in der Hand und ganz Stuttgart zu Füßen. Die Frau in der Kittelschürze erklärt dir den Weg zurück, dreimal, zur Sicherheit.",
          chronicle: "In Stuttgart mit dem Wohnmobil vor den Stäffele gestanden.",
        } }],
      },
    ],
  },
  {
    id: "stg-wasen", pool: "region", region: "stuttgart",
    title: "Volksfest auf dem Wasen", art: "wasen", portrait: "wasenwirt", speaker: "Wasenwirt Kurt",
    text: "Von {place} ist es nicht weit zum Cannstatter Wasen: Das Riesenrad dreht sich, aus dem Festzelt dröhnt Blasmusik. Am Hintereingang winkt Wasenwirt Kurt mit der Schürze. „In der Küche wartet d’ Inge. Mir spielet a Probe für den Preisskat, traust di?“",
    choices: [
      {
        text: "In die Festzeltküche zur Probe.",
        outcomes: [{ outcome: {
          text: "Kurt wischt den Tisch mit der Schürze ab. „Wer gibt?“ Inge hat die Karten schon in der Hand.",
          skat: {
            opponents: ["wasenwirt", "schaffnerin"], stakes: "medium",
            intro: "Zwischen Göckele und Brezelkörben knallt Kurt die Karten auf den Tisch, und Inge prüft jede einzelne.",
          },
          chronicle: "Auf dem Wasen in der Festzeltküche gegen Kurt und Inge gespielt.",
        } }],
      },
      {
        text: "Riesenrad fahren.",
        req: { marks: 2 },
        outcomes: [{ outcome: {
          text: "Ganz oben hält das Rad an. Unter dir liegen der Wasen, der Neckar und der halbe Kessel, und du siehst, wo du morgen hinfährst.",
          marks: -2,
          chronicle: "Auf dem Wasen Riesenrad gefahren und ganz Stuttgart von oben gesehen.",
        } }],
      },
      {
        text: "Am Losstand den Glücksgroschen setzen.",
        req: { souvenir: "lucky-penny" }, blue: true,
        outcomes: [
          { weight: 1, outcome: {
            text: "Der Glücksgroschen tut seine Pflicht: Hauptgewinn! Aus dem Regal darfst du dir etwas aussuchen.",
            souvenir: "random",
            chronicle: "Auf dem Wasen mit dem Glücksgroschen den Hauptgewinn gezogen.",
          } },
          { weight: 2, outcome: {
            text: "Zwei Nieten, dann ein Trostpreis: ein Lebkuchenherz. Es hängt ab jetzt am Rückspiegel.",
          } },
        ],
      },
    ],
  },
  {
    id: "stg-zacke", pool: "region", region: "stuttgart",
    title: "Mit der Zacke", art: "staeffele", portrait: "schaffnerin", speaker: "Schaffnerin Inge",
    text: "Die Zahnradbahn ruckelt von Heslach hinauf nach Degerloch, die Zacke, wie die Stuttgarter sagen. Neben dir sitzt Schaffnerin Inge, die alte Lochzange am Gürtel. „Fahrkarte, bitte“, sagt sie aus Gewohnheit, dann lacht sie. „Ach, i bin ja in Rente.“",
    choices: [
      {
        text: "„Haben Sie eine Skataufgabe für unterwegs?“",
        outcomes: [{ outcome: {
          text: "Inge kramt einen alten Fahrschein heraus. Auf der Rückseite steht, mit Bleistift, eine Aufgabe. „Bis Degerloch hasch Zeit.“",
          puzzle: "problem",
        } }],
      },
      {
        text: "Aus dem Fenster schauen.",
        outcomes: [{ outcome: {
          text: "Unter dir versinkt der Kessel, über dir kommt der Wald. Inge erzählt von dreißig Jahren Straßenbahn: Bei ihr ist keiner schwarzgefahren. „Beim Skat au net“, sagt sie.",
        } }],
      },
      {
        text: "Ihr den Notizblock mit deiner Liste zeigen.",
        req: { souvenir: "notepad" }, blue: true,
        outcomes: [{ outcome: {
          text: "Inge prüft die Liste mit dem Daumen, Zeile für Zeile. „Da, ein Rechenfehler. Zu Ihren Ungunsten.“ Beim nächsten Wirt holst du dir zwei Mark zurück.",
          marks: 2,
          chronicle: "In der Zacke hat Schaffnerin Inge einen Rechenfehler in der Liste gefunden.",
        } }],
      },
    ],
  },
  {
    id: "stg-killesberg", pool: "region", region: "stuttgart",
    title: "Schach am Killesberg", art: "dog-meadow",
    text: "Im Höhenpark Killesberg pfeift die kleine Parkbahn, und unter den Bäumen stehen hüfthohe Schachfiguren auf dem Boden. Ein Rentner im Trenchcoat schiebt einen Turm von Feld zu Feld. „Weiß zieht und gewinnt“, sagt er. „Seit einer Stunde.“",
    choices: [
      {
        text: "Mitdenken.",
        outcomes: [{ outcome: {
          text: "Er tritt einen Schritt zurück und reicht dir den Turm. „Bitte, {title}. Aber net schummeln.“",
          puzzle: "chess",
        } }],
      },
      {
        text: "Mit der Parkbahn eine Runde fahren.",
        req: { marks: 1 },
        outcomes: [{ outcome: {
          text: "Die Parkbahn tuckert durch Blumenbeete, Kinder winken, du winkst zurück. Als du wiederkommst, steht der Rentner immer noch vor seinem Turm.",
          marks: -1,
          chronicle: "Am Killesberg mit der kleinen Parkbahn gefahren.",
        } }],
      },
    ],
  },
  {
    id: "stg-schichtwechsel", pool: "region", region: "stuttgart",
    title: "Schichtwechsel", art: "factory-gate", portrait: "kommandant", speaker: "Kommandant Heiner",
    text: "Du stehst vor einem Werkstor, und es ist Schichtwechsel: Hunderte Fahrräder, Mopeds und Henkelmänner. Einer von der Werkfeuerwehr klopft ans Fenster, Kommandant Heiner. „Feierabendrunde in der Kantine, mir fehlt der Dritte. Antreten!“",
    choices: [
      {
        text: "„Zu Befehl.“",
        outcomes: [{ outcome: {
          text: "Heiner marschiert voraus, du hinterher. In der Kantine sitzt schon Maurer-Karle, den Mörtel noch an den Händen.",
          skat: {
            opponents: ["kommandant", "maurer"], houseRule: "kitty", stakes: "small",
            intro: "In der Kantine riecht es nach Linsen und Spätzle. Maurer-Karle legt bedächtig eine Mark in die Skatkasse.",
          },
          chronicle: "Nach dem Schichtwechsel in der Werkskantine Skat gespielt.",
        } }],
      },
      {
        text: "„Danke, ein andermal.“",
        outcomes: [
          { weight: 1, outcome: {
            text: "Heiner salutiert und marschiert ab. Du wartest im Feierabendverkehr, bis der letzte Radfahrer durch ist.",
          } },
          { weight: 1, outcome: {
            text: "„Abtreten“, sagt Heiner. Der Feierabendverkehr schiebt sich um dich herum, und der Motor läuft und läuft. Ein Strich Sprit bleibt am Werkstor.",
            fuel: -1,
          } },
        ],
      },
    ],
  },
  {
    id: "stg-fussgaengerzone", pool: "region", region: "stuttgart", requires: { vehicle: "camper" },
    title: "In der Fußgängerzone", art: "police",
    text: "Eine Abzweigung zu früh, und plötzlich rollt das Wohnmobil zwischen Schaufenstern und Blumenkübeln. Fußgänger bleiben stehen, eine Oma hebt den Schirm. Ein Schutzmann mit Kelle kommt gemessenen Schrittes näher.",
    choices: [
      {
        text: "Fenster runter und freundlich grüßen.",
        outcomes: [
          { weight: 2, outcome: {
            text: "„Grüß Gott. Sie wisset scho, wo Sie sind?“ Er lotst dich persönlich hinaus, Meter für Meter. Zum Abschied sagt er: „Des erzähl i daheim.“",
            chronicle: "Mit dem Wohnmobil in die Fußgängerzone geraten und mit Polizeibegleitung hinaus.",
          } },
          { weight: 1, outcome: {
            text: "Er schaut lange und schreibt dann doch nichts auf. „Fahret Se langsam rückwärts, i halt die Leut auf.“ Der Umweg danach kostet dich einen Strich Sprit.",
            fuel: -1,
          } },
        ],
      },
      {
        text: "Langsam weiterrollen bis zur nächsten Ausfahrt.",
        outcomes: [{ outcome: {
          text: "Die Fußgänger machen Platz wie für einen Festwagen, Kinder laufen nebenher. Der Schutzmann geht vorneweg, als hätte er es so geplant. Am Ende gibt’s Applaus.",
        } }],
      },
    ],
  },
  {
    id: "stg-mineralbrunnen", pool: "region", region: "stuttgart",
    title: "Am Mineralbrunnen", art: "village-square", portrait: "rechnerin", speaker: "Frau Gerda",
    text: "In Bad Cannstatt sprudelt das Mineralwasser aus öffentlichen Brunnen, für jeden umsonst. Frau Gerda füllt gerade ihre Flaschen. Neben ihr auf der Bank mischt Null-Eugen und grinst. „Sprudel umsonst und a Skatrunde dazu. Besser wird’s net.“",
    choices: [
      {
        text: "Mitspielen.",
        outcomes: [{ outcome: {
          text: "Gerda stellt die Flaschen in Reih und Glied, Eugen teilt aus.",
          skat: {
            opponents: ["rechnerin", "nullfuchs"], houseRule: "null-evening", stakes: "small",
            intro: "„Heut isch Null-Abend“, verkündet Eugen, und Gerda verdreht die Augen.",
          },
          chronicle: "Am Mineralbrunnen in Cannstatt mit Gerda und Eugen Skat gespielt.",
        } }],
      },
      {
        text: "Nur die Kanister füllen und weiterfahren.",
        outcomes: [{ outcome: {
          text: "Du füllst zwei Kanister mit Sprudel. Gerda nickt anerkennend. „Wer fährt, trinkt Wasser. Recht so.“",
        } }],
      },
    ],
  },
  {
    id: "stg-rotenberg", pool: "region", region: "stuttgart",
    title: "Lese am Rotenberg", art: "vineyard",
    text: "Über dem Neckar leuchten die Weinberge am Rotenberg, ganz oben glänzt die Grabkapelle. Ein Wengerter winkt mit der Rebschere. „Mir fehlet Leut für die Lese! Zahlt wird in Mark und Traubensaft.“",
    choices: [
      {
        text: "Bei der Lese helfen.",
        outcomes: [{ outcome: {
          text: "Bis zum Abend schneidest du Trauben, schleppst die Butte und hast klebrige Hände bis zu den Ellbogen. Der Wengerter zahlt drei Mark und eine Flasche Traubensaft, „für den Fahrer“.",
          marks: 3,
          chronicle: "Am Rotenberg bei der Weinlese geholfen.",
        } }],
      },
      {
        text: "Nur den Ausblick genießen.",
        outcomes: [{ outcome: {
          text: "Unter dir zieht ein Lastkahn den Neckar hinauf, hinter dir wird gelesen und gesungen. Manchmal ist Zuschauen auch eine Arbeit.",
        } }],
      },
      {
        text: "Das Autoradio aufdrehen, damit es flotter geht.",
        req: { upgrade: "radio" }, blue: true,
        outcomes: [{ outcome: {
          text: "Schlager über dem Weinberg, und plötzlich schneiden alle doppelt so schnell. Der Wengerter ist begeistert und zahlt dir vier Mark für die Musik.",
          marks: 4,
          chronicle: "Am Rotenberg die Weinlese mit dem Autoradio beschleunigt.",
        } }],
      },
    ],
  },
  {
    id: "stg-baustelle", pool: "region", region: "stuttgart",
    title: "Baustelle Stadtbahn", art: "traffic-jam", portrait: "maurer", speaker: "Maurer-Karle",
    text: "Die halbe Straße ist aufgerissen, hier wird für die neue Stadtbahn gebaut. Das gelbe Umleitungsschild zeigt im Kreis herum. Am Bauzaun lehnt Maurer-Karle mit der Kelle in der Hand und nickt dir bedächtig zu.",
    choices: [
      {
        text: "Der Umleitung folgen.",
        outcomes: [
          { weight: 1, outcome: {
            text: "Die Umleitung führt einmal um den Block und tatsächlich wieder heraus. Ein Wunder.",
          } },
          { weight: 1, outcome: {
            text: "Die Umleitung führt um den Block, dann noch einmal und dann über den Berg. Ein Strich Sprit bleibt in der Baustelle.",
            fuel: -1,
          } },
        ],
      },
      {
        text: "Maurer-Karle fragen.",
        outcomes: [{ outcome: {
          text: "Karle denkt lange nach. Dann schiebt er das Absperrgitter ein Stück zur Seite. „Langsam drüber. Und i hab nix g’sehe.“",
          chronicle: "Von Maurer-Karle durch die Stadtbahn-Baustelle gewunken worden.",
        } }],
      },
      {
        text: "Karle ein Vesper vom Vesperbrett anbieten.",
        req: { souvenir: "snack-board" }, blue: true,
        outcomes: [{ outcome: {
          text: "Karle isst bedächtig und sagt dann: „Mir machet jetzt eh Pause.“ Er winkt den Bagger zur Seite, und dazu verrät er dir eine Tankstelle ums Eck, wo der Pächter ihm noch was schuldet.",
          fuel: 1,
        } }],
      },
    ],
  },
  // ─── Der Papagei ───────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "stg-papagei", pool: "region", region: "stuttgart",
    title: "Der Papagei", art: "inn-stube",
    text: "In einer Wirtschaft in {place} sitzt ein grauer Papagei auf der Theke. Der Wirt hat ihn vor Jahren von einem Pfleger aus der Wilhelma bekommen. Der Vogel kann drei Sätze: „Achtzehn!“, „Passe!“ und „Wer gibt?“. Gelernt hat er sie am Stammtisch.",
    choices: [
      {
        text: "Ihm „Grand Hand“ beibringen.",
        outcomes: [
          { weight: 1, outcome: {
            text: "Zwanzig Minuten lang sagst du es vor. Dann plustert er sich auf und ruft: „Grand Hand!“ Der Stammtisch jubelt, und der Wirt stellt dir eine Brezel und zwei Mark hin.",
            marks: 2,
            chronicle: "In {place} einem Papagei „Grand Hand“ beigebracht.",
          } },
          { weight: 1, outcome: {
            text: "Zwanzig Minuten lang sagst du es vor. Der Papagei hört zu, legt den Kopf schief und sagt: „Passe!“ Die ganze Wirtschaft lacht, du auch.",
          } },
        ],
      },
      {
        text: "Am Stammtisch mitspielen, der Papagei reizt mit.",
        outcomes: [{ outcome: {
          text: "Am Stammtisch sitzen Grand-Helmut und Null-Eugen. Der Papagei setzt sich auf die Stuhllehne und sagt zu jedem Gebot seinen Satz.",
          skat: {
            opponents: ["grandspieler", "nullfuchs"], houseRule: "standard",
            intro: "„Achtzehn!“, ruft der Papagei, bevor einer von euch den Mund aufmacht.",
          },
          chronicle: "In {place} mit einem Papagei als Kiebitz Skat gespielt.",
        } }],
      },
      {
        text: "{dog} und der Papagei schauen sich an.",
        req: { dog: "any" }, blue: true,
        outcomes: [{ outcome: {
          text: "Lange Stille. Dann sagt der Papagei laut und deutlich: „WUFF.“ {dog} setzt sich verdattert hin. Der Wirt lacht Tränen und spendiert {dog} eine Saitenwurst.",
          chronicle: "In {place} hat ein Papagei {dog} angebellt.",
        } }],
      },
    ],
  },
  {
    id: "stg-tankwart", pool: "region", region: "stuttgart",
    title: "Das Tankwart-Quiz", art: "petrol-station",
    text: "An der kleinen Tankstelle putzt dir der Tankwart die Scheibe, ohne dass du fragst. Dann lehnt er sich ans Fenster. „Sie spielet doch Skat. Was zählt a Grand Hand mit vieren? Wenn’s stimmt, geht a Strich aufs Haus.“",
    choices: [
      {
        text: "„Hundertvierundvierzig.“",
        outcomes: [{ outcome: {
          text: "„Mit vieren, Spiel fünf, Hand sechs, mal vierundzwanzig. Stimmt!“ Er füllt dir einen Strich nach und pfeift dabei.",
          fuel: 1,
          chronicle: "An einer Stuttgarter Tankstelle ein Skatquiz gewonnen.",
        } }],
      },
      {
        text: "„Hundertzwanzig.“",
        outcomes: [{ outcome: {
          text: "„Fast. Mit vieren, Spiel fünf, Hand sechs, mal vierundzwanzig macht hundertvierundvierzig.“ Er klopft aufs Dach. „Nächstes Mal, {title}.“",
        } }],
      },
      {
        text: "Einfach tanken und zahlen.",
        req: { marks: 3 },
        outcomes: [{ outcome: {
          text: "Drei Mark für einen Strich. Die Lösung erzählt er dir trotzdem: hundertvierundvierzig.",
          marks: -3, fuel: 1,
        } }],
      },
    ],
  },
  {
    id: "stg-fernsehturm", pool: "region", region: "stuttgart",
    title: "Abend am Fernsehturm", art: "pitch-evening", music: "stellplatz",
    text: "Am Abend leuchtet über dem Wald von Degerloch der Fernsehturm. Oben soll man bis zur Alb sehen. Der Fahrstuhl kostet drei Mark.",
    choices: [
      {
        text: "Mit dem Fahrstuhl hinauf.",
        req: { marks: 3 },
        outcomes: [{ outcome: {
          text: "Oben pfeift der Wind, und unter dir liegt der Kessel voller Lichter. Hinter dem Wald entdeckst du eine Tankstelle mit Abendpreis und fährst noch schnell hin.",
          marks: -3, fuel: 1,
          chronicle: "Am Abend auf dem Fernsehturm gestanden und den Kessel leuchten sehen.",
        } }],
      },
      {
        text: "Unten bleiben und eine Karte nach {home} schreiben.",
        outcomes: [{ outcome: {
          text: "Du kaufst eine Postkarte mit dem Turm darauf und schreibst: „Wetter gut, Karten gut, Wohnmobil hält.“ Mehr muss daheim keiner wissen.",
          chronicle: "Vom Fernsehturm eine Karte nach {home} geschrieben.",
        } }],
      },
    ],
  },
  {
    id: "stg-geldbeutel", pool: "region", region: "stuttgart",
    title: "Sigi in der Straßenbahn", art: "city", portrait: "schwaetzer", speaker: "Schwätzer-Sigi",
    text: "In der gelben Straßenbahn setzt sich Schwätzer-Sigi neben dich und redet: vom Schwager, vom Wetter, vom Grand von gestern. Zwölf Haltestellen ohne Punkt und Komma. An der dreizehnten springt er auf und ist weg. Auf dem Sitz liegt sein Geldbeutel.",
    choices: [
      {
        text: "Hinterher!",
        outcomes: [
          { weight: 2, outcome: {
            text: "Du erwischst ihn an der Ampel. Sigi ist so gerührt, dass er dir zwei Mark Finderlohn aufdrängt und dann noch zehn Minuten weiterredet.",
            marks: 2,
            chronicle: "Schwätzer-Sigi seinen Geldbeutel nachgetragen und zehn Minuten zugehört.",
          } },
          { weight: 1, outcome: {
            text: "Die Türen schließen, die Bahn fährt. Du gibst den Geldbeutel an der Endhaltestelle ab, und drei Tage später erzählt Sigi die Geschichte im ganzen Kessel.",
          } },
        ],
      },
      {
        text: "Beim Fahrer abgeben.",
        outcomes: [{ outcome: {
          text: "Der Fahrer nickt. „Der Sigi? Der vergisst ihn jede Woche.“ Er legt den Geldbeutel zu den drei anderen unter seinen Sitz.",
        } }],
      },
    ],
  },
  {
    id: "stg-hupe", pool: "region", region: "stuttgart", requires: { vehicle: "camper" },
    title: "Die Hupe klemmt", art: "van-breakdown",
    text: "Mitten im Berufsverkehr klemmt die Hupe. Bei jedem Schlagloch tutet das Wohnmobil wie ein Dampfer im Hafen. Die Leute winken zurück, ein Busfahrer hupt im Takt mit.",
    choices: [
      {
        text: "Mit dem Schraubenzieher unters Lenkrad.",
        outcomes: [
          { weight: 1, outcome: {
            text: "Ein Kabel, ein Dreh, Ruhe. Leider blinkt jetzt der linke Blinker, wenn du hupst. Du beschließt, nicht mehr zu hupen.",
            chronicle: "In Stuttgart die Hupe repariert. Seitdem blinkt sie links.",
          } },
          { weight: 1, outcome: {
            text: "Ein Funke, ein Ruck, und die Hupe schweigt. Du bist so stolz, dass du sie gleich ausprobierst. Sie geht.",
          } },
        ],
      },
      {
        text: "Zur nächsten Werkstatt.",
        req: { marks: 3 },
        outcomes: [{ outcome: {
          text: "Der Meister hört zwei Sekunden zu, zieht einen Stecker und sagt: „Des g’hört so, die Hupe isch halt fleißig.“ Drei Mark für den Stecker.",
          marks: -3,
        } }],
      },
      {
        text: "Ein Tropfen aus dem Ölkännchen auf den Kontakt.",
        req: { souvenir: "oil-can" }, blue: true,
        outcomes: [{ outcome: {
          text: "Ein Tropfen Öl, ein kurzes ZISCH, und die Hupe ist still. Ein Mann auf dem Gehweg klatscht Beifall.",
          chronicle: "Im Stuttgarter Berufsverkehr die Hupe mit dem Ölkännchen kuriert.",
        } }],
      },
    ],
  },
  {
    id: "stg-waldheim", pool: "region", region: "stuttgart",
    title: "Kegeln im Waldheim", art: "hocketse",
    text: "Im Waldheim über {place} ist Vereinsfest: Bierbänke unter Bäumen, rote Wurst vom Grill und hinten eine Kegelbahn. Dem Kegelclub fehlt einer für den letzten Wurf. „Alle neune, und des Kässle isch Ihres!“",
    choices: [
      {
        text: "Die Kugel nehmen.",
        outcomes: [
          { weight: 1, outcome: {
            text: "Die Kugel rollt, wackelt, trifft. KRACH, alle neune liegen! Der Kegelclub trägt dich einmal um die Bahn, und das Kässle mit fünf Mark gehört dir.",
            marks: 5,
            chronicle: "Im Waldheim alle neune geschoben und das Kässle gewonnen.",
          } },
          { weight: 2, outcome: {
            text: "Die Kugel nimmt die Rinne, ganz gemütlich. „Pudel!“, rufen alle, und der Kegelclub spendiert dir zum Trost eine rote Wurst.",
          } },
        ],
      },
      {
        text: "Nur zuschauen.",
        outcomes: [{ outcome: {
          text: "Du schaust zu und lernst: Beim Kegeln wird genauso gestritten wie beim Skat, nur lauter.",
        } }],
      },
      {
        text: "Den Stammtischwimpel an die Kegelbahn hängen.",
        req: { souvenir: "pennant" }, blue: true,
        outcomes: [{ outcome: {
          text: "Der Wimpel macht Eindruck. Der Kegelclub ernennt dich zum Ehrenmitglied, mit Urkunde und zwei Mark aus dem Kässle.",
          marks: 2,
          chronicle: "Im Waldheim Ehrenmitglied im Kegelclub geworden.",
        } }],
      },
    ],
  },
  {
    id: "stg-heimspiel", pool: "region", region: "stuttgart",
    title: "Heimspiel am Neckar", art: "city",
    text: "Heute ist Heimspiel im Neckarstadion, und die halbe Stadt ist unterwegs. Die Straßen sind voll, die Straßenbahnen auch. Ein Fan mit Schal winkt dir zu. „Nimmst mi mit? Sonst verpass i den Anpfiff.“",
    choices: [
      {
        text: "„Steig ein.“",
        outcomes: [
          { weight: 2, outcome: {
            text: "Er singt den ganzen Weg, und am Stadion drückt er dir zwei Mark in die Hand. „Für den Sprit. Und drück uns d’ Daumen!“",
            marks: 2,
          } },
          { weight: 1, outcome: {
            text: "Er singt den ganzen Weg. Am Stadion ist alles gesperrt, und du musst einen großen Bogen fahren: zwei Mark Spritgeld, aber ein Strich weniger im Tank.",
            marks: 2, fuel: -1,
          } },
        ],
      },
      {
        text: "Das Radio anmachen und den Stau aussitzen.",
        outcomes: [{ outcome: {
          text: "Im Radio läuft die Vorberichterstattung, draußen schieben sich Schals und Fahnen vorbei. Nach einer Stunde ist die Straße leer, und vom Stadion her hört man den Jubel.",
        } }],
      },
      {
        text: "Ihn in den Beiwagen setzen und durch die Lücken.",
        req: { vehicle: "sidecar-rig" }, blue: true,
        outcomes: [{ outcome: {
          text: "Der Fan sitzt im Beiwagen und schwenkt den Schal, du schlängelst dich durch. Am Stadion jubelt die halbe Kurve, und er zahlt dir drei Mark und eine rote Wurst.",
          marks: 3,
          chronicle: "Einen Fußballfan im Beiwagen zum Neckarstadion gefahren.",
        } }],
      },
    ],
  },
];

/** This deck sets and reads no tour flags. */
export const STUTTGART_FLAGS: Record<string, string> = {};
