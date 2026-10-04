// Unterwegs im Unteren Enztal (contract §4.10): 16 regional events. Local colour: Roßwager Steillagen, Besen,
// Markgröningen Schäferlauf, the Schnellbahn Baustelle near Vaihingen, the Bissingen viaduct, Besigheim where the Enz
// meets the Neckar, Sachsenheim Wasserschloss, Horrheim and Gündelbach at the Stromberg edge.
import type { EventDef } from "../../game/types.ts";

export const ENZTAL_EVENTS: EventDef[] = [
  {
    id: "enz-besen", pool: "region", region: "enztal",
    title: "Der Besen hat offen", art: "besen",
    text: "Über einem Hoftor in {place} hängt ein Reisigbesen: Der Besen hat offen. Drinnen gibt es Zwiebelkuchen, Schlachtplatte und Viertele vom eigenen Hang. Am Ecktisch sitzen zwei mit Karten und winken. „Mir sind bloß zu zweit, hock di na!“",
    choices: [
      {
        text: "Dazusetzen. Für mich einen Traubensaft, ich fahr noch.",
        outcomes: [{ outcome: {
          text: "„Traubensaft vom eigenen Hang“, sagt die Besenwirtin und zwinkert. Der Maurer-Karle teilt schon aus.",
          skat: { opponents: ["maurer", "schwaetzer"], houseRule: "standard", intro: "Schwätzer-Sigi erzählt beim Mischen schon die erste Geschichte vom Schwager." },
        } }],
      },
      {
        text: "Zwiebelkuchen für den Abend mitnehmen.",
        req: { marks: 2 },
        outcomes: [{ outcome: {
          text: "Ein halbes Blech Zwiebelkuchen, noch warm. Damit musst du morgen unterwegs nirgends anhalten.",
          marks: -2, fuel: 1,
        } }],
      },
      {
        text: "Zum Wengerter, dem du bei der Lese geholfen hast.",
        req: { flag: "lese-geholfen" }, hideIfUnmet: true,
        outcomes: [{ outcome: {
          text: "Der Wengerter Hermann klopft dir auf die Schulter und stellt dir einen Traubensaft hin. Heute spielst du mit einem Favoriten vom Preisskat.",
          skat: { opponents: ["wengerter", "maurer"], houseRule: "standard", intro: "Der Wengerter schiebt dir den Stuhl hin: „Wer Butten trägt, derf au mitspiele.“" },
          chronicle: "Im Besen mit dem Wengerter Hermann Skat gespielt.",
        } }],
      },
    ],
  },
  {
    id: "enz-falsches-vaihingen", pool: "region", region: "enztal",
    title: "Das falsche Vaihingen", art: "city",
    text: "„Vaihingen“ steht auf dem Wegweiser, und du folgst ihm brav. Eine halbe Stunde später: Hochhäuser, gelbe Straßenbahnen, Studenten mit Aktentaschen. Das ist Stuttgart-Vaihingen. Bis zur Enz ist es noch ein ganzes Stück.",
    choices: [
      {
        text: "Umdrehen und den ganzen Weg zurück.",
        outcomes: [{ outcome: {
          text: "Über die Autobahn zurück ins Enztal. Der Tank nimmt dir den Ausflug übel, und du schwörst dir: Nächstes Mal schaust du zweimal hin.",
          fuel: -1,
          chronicle: "In Stuttgart-Vaihingen gelandet statt in Vaihingen an der Enz.",
        } }],
      },
      {
        text: "Im Straßenatlas eine Landstraße zurück suchen.",
        req: { souvenir: "road-atlas" }, blue: true,
        outcomes: [{ outcome: {
          text: "Mit dem Finger auf der Karte findest du die Landstraße über Leonberg. Kein Umweg, kein Strich Sprit verloren, und das Enztal hat dich wieder.",
          chronicle: "Im falschen Vaihingen gelandet. Der Straßenatlas hat’s gerichtet.",
        } }],
      },
      {
        text: "Einen Studenten nach dem Weg fragen.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Der Student malt dir den Weg auf einen Zettel. Dafür sollst du ihm eine Schachaufgabe lösen, an der er seit Tagen sitzt. Der Umweg kostet trotzdem einen Strich.",
            fuel: -1, puzzle: "chess",
          } },
          { weight: 1, outcome: {
            text: "Der Student kommt selber aus Kiel und kennt nur die Mensa. Ihr lacht beide, und du fährst einfach der Sonne nach.",
            fuel: -1,
          } },
        ],
      },
    ],
  },
  {
    id: "enz-schaeferlauf", pool: "region", region: "enztal",
    title: "Schäferlauf", art: "hocketse",
    text: "Drüben in Markgröningen ist Schäferlauf. Auf dem Stoppelfeld rennen Schäfer und Schäferinnen barfuß um die Wette, und das halbe Enztal schaut zu. Am Rand sucht ein Schäfer jemanden, der kurz seinen Stand mit Wollsocken hütet.",
    choices: [
      {
        text: "Den Sockenstand hüten.",
        outcomes: [{ outcome: {
          text: "Du verkaufst elf Paar Wollsocken und eine Mütze. Der Schäfer drückt dir zwei Mark in die Hand: „Du hasch Talent, Bürschle.“",
          marks: 2,
        } }],
      },
      {
        text: "Barfuß mitrennen.",
        outcomes: [
          { weight: 1, outcome: {
            text: "Das Stoppelfeld piekst, aber du kommst als Dritter an. Die Leute johlen, und ein Bauer steckt dir drei Mark zu.",
            marks: 3,
            chronicle: "Beim Schäferlauf in Markgröningen barfuß übers Stoppelfeld gerannt.",
          } },
          { weight: 2, outcome: {
            text: "Nach zwanzig Metern sagen die Fußsohlen Halt. Die Leute klatschen trotzdem, und einer bringt dir ein Paar Wollsocken.",
            chronicle: "Beim Schäferlauf in Markgröningen barfuß übers Stoppelfeld gerannt.",
          } },
        ],
      },
      {
        text: "Der Schäferhund will auch zeigen, was er kann.",
        req: { dog: "shepherd" }, blue: true,
        outcomes: [{ outcome: {
          text: "{dog} rennt aufs Feld und treibt die Zuschauer ordentlich zu einem Haufen zusammen. Die Schäfer sind begeistert und legen für die Hundekasse zusammen.",
          marks: 4,
          chronicle: "{dog} hat beim Schäferlauf die Zuschauer zusammengetrieben.",
        } }],
      },
    ],
  },
  {
    id: "enz-lese", pool: "region", region: "enztal",
    title: "Lese am Steilhang", art: "vineyard", portrait: "wengerter", speaker: "Wengerter Hermann",
    text: "Am Roßwager Steilhang ist Lese. Zwischen den Trockenmauern schuftet der Wengerter Hermann, die Butte auf dem Rücken, das Gesicht rot. „Mir fehlt oiner, der trägt. D’ Butte lauft net von allei.“",
    choices: [
      {
        text: "Die Butte schultern.",
        outcomes: [{ outcome: {
          text: "Zwei Stunden rauf und runter, die Knie zittern. Der Wengerter zahlt drei Mark und sagt: „Wer Butten trägt, isch im Besen immer willkommen.“",
          marks: 3, flags: ["lese-geholfen"],
          chronicle: "Am Roßwager Steilhang die Butte getragen.",
        } }],
      },
      {
        text: "Von unten anfeuern und Brezeln verteilen.",
        req: { marks: 1 },
        outcomes: [{ outcome: {
          text: "Die Leser freuen sich über die Brezeln. Der Wengerter brummt: „Au recht. Aber trage tät mehr helfe.“",
          marks: -1,
        } }],
      },
      {
        text: "Die Trauben im Beiwagen nach unten fahren.",
        req: { upgrade: "sidecar" }, blue: true,
        outcomes: [{ outcome: {
          text: "Fuhre um Fuhre fährst du die Kisten den Weinbergweg hinunter. Der Wengerter staunt: „So a Gfährt bräucht i au.“ Vier Mark und ein Platz im Besen sind dir sicher.",
          marks: 4, flags: ["lese-geholfen"],
          chronicle: "Die Lese am Roßwager Hang im Beiwagen ins Tal gefahren.",
        } }],
      },
    ],
  },
  {
    id: "enz-schnellbahn", pool: "region", region: "enztal",
    title: "Baustelle Schnellbahn", art: "traffic-jam",
    text: "Bei {place} graben sie für die neue Schnellbahn nach Mannheim. Bagger, Lastwagen, Schlamm auf der Straße. Ein Polier mit gelbem Helm hebt die Hand: „Do goht’s grad net weiter.“",
    choices: [
      {
        text: "Die Umleitung fahren.",
        outcomes: [{ outcome: {
          text: "Die Umleitung führt über drei Dörfer und einen Feldweg. Am Ende bist du wieder da, wo du angefangen hast, nur einen Strich leichter.",
          fuel: -1,
        } }],
      },
      {
        text: "Den Polier nach einer Abkürzung fragen.",
        outcomes: [
          { weight: 2, outcome: {
            text: "„Abkürzung?“, fragt der Polier. „Die baue mir grad. Fertig isch se in zwölf Jahr.“ Dann winkt er dich doch quer über die Baustraße. RUMMS, ein Schlagloch, aber du bist durch.",
          } },
          { weight: 1, outcome: {
            text: "Die Abkürzung endet im Matsch. Ein Bagger zieht dich raus, der Polier lacht, aber der Umweg kostet doch.",
            fuel: -1,
            chronicle: "Bei {place} von einem Bagger aus dem Baustellenmatsch gezogen worden.",
          } },
        ],
      },
      {
        text: "Im Autoradio den Verkehrsfunk abwarten.",
        req: { upgrade: "radio" }, blue: true,
        outcomes: [{ outcome: {
          text: "Der Verkehrsfunk kennt die Baustelle längst. Du fährst rechtzeitig außen herum und kommst ohne Umweg an.",
        } }],
      },
    ],
  },
  {
    id: "enz-viadukt", pool: "region", region: "enztal",
    title: "Unterm Viadukt", art: "road-enz",
    text: "Unter den hohen Bögen des Viadukts bei Bissingen sitzt ein Rentner am Klapptisch, vor sich ein Schachbrett. Oben donnert ein Güterzug über die Enz. BRUMM. „Spielet Sie?“, fragt er, ohne aufzuschauen.",
    choices: [
      {
        text: "Mich setzen und seine Aufgabe lösen.",
        outcomes: [{ outcome: {
          text: "Er stellt eine Stellung auf, die er vor dreißig Jahren aus der Zeitung hat. „Weiß zieht und gewinnt. Bis der nächste Zug kommt.“",
          puzzle: "chess",
        } }],
      },
      {
        text: "Die Schachuhr auf den Klapptisch stellen.",
        req: { souvenir: "chess-clock" }, blue: true,
        outcomes: [{ outcome: {
          text: "Der Rentner strahlt. „Mit Uhr! Wie früher im Verein.“ Er legt zwei Mark neben das Brett, und die Uhr tickt.",
          puzzle: "chess", marks: 2,
          chronicle: "Unterm Bissinger Viadukt mit Schachuhr gegen einen Rentner gespielt.",
        } }],
      },
      {
        text: "Dem Güterzug nachschauen und weiterfahren.",
        outcomes: [{ outcome: {
          text: "Du zählst achtundvierzig Wagen. Der Rentner nickt, ohne aufzuschauen: „Stimmt. Der kommt jeden Tag um die Zeit.“",
        } }],
      },
    ],
  },
  {
    id: "enz-kirchturmuhr", pool: "region", region: "enztal",
    title: "Die Kirchturmuhr", art: "village-square",
    text: "Die Kirchturmuhr von {place} steht seit Dienstag auf zehn nach zwölf. Am Sonntag ist Konfirmation, und der Mesner ringt die Hände. Er mustert dich: „Sie sehet aus wie oiner, der schraube ka.“",
    choices: [
      {
        text: "Hochsteigen und nachsehen.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Ein Zahnrad hat sich verhakt. ZACK, mit dem Schraubenzieher sitzt es wieder, und die Uhr tickt. Der Mesner drückt dir vier Mark in die Hand.",
            marks: 4,
            chronicle: "In {place} die Kirchturmuhr wieder zum Laufen gebracht.",
          } },
          { weight: 1, outcome: {
            text: "Die Uhr schlägt dreizehnmal und bleibt dann ganz stehen. Der Mesner sagt, das sei schon immer so gewesen, und bedankt sich trotzdem.",
          } },
        ],
      },
      {
        text: "Mit dem Ölkännchen an die Zahnräder.",
        req: { souvenir: "oil-can" }, blue: true,
        outcomes: [{ outcome: {
          text: "Ein paar Tropfen hier, ein paar Tropfen da. Die Uhr läuft wie geschmiert, nur jetzt zwei Minuten vor. Der Mesner findet das pünktlich genug und zahlt vier Mark.",
          marks: 4,
          chronicle: "In {place} die Kirchturmuhr geölt. Sie geht seitdem zwei Minuten vor.",
        } }],
      },
      {
        text: "„Ich bin Skatspieler, kein Uhrmacher.“",
        outcomes: [{ outcome: {
          text: "Der Mesner seufzt. Dann läutet er am Sonntag eben von Hand, wie früher sein Großvater.",
        } }],
      },
    ],
  },
  // ─── In der Kelter ─────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "enz-kelter", pool: "region", region: "enztal",
    title: "In der Kelter", art: "vineyard",
    text: "Vor der Kelter von {place} stehen die Traktoren mit ihren Traubenwagen Schlange. Drinnen rumpelt die Presse. Der Kelterwart rauft sich die Haare: Sein Schreiber liegt mit Hexenschuss daheim, und jede Fuhre muss gewogen und aufgeschrieben werden.",
    choices: [
      {
        text: "„Ich schreib. Rechnen kann ich vom Skat.“",
        outcomes: [
          { weight: 2, outcome: {
            text: "Bis zum Abend schreibst du Fuhre um Fuhre auf, ohne einen Fehler. Der Kelterwart zahlt vier Mark und sagt, so eine saubere Liste hat er seit Jahren nicht gesehen.",
            marks: 4,
            chronicle: "In der Kelter von {place} einen Tag lang die Trauben angeschrieben.",
          } },
          { weight: 1, outcome: {
            text: "Bei der vierzigsten Fuhre verrutscht dir eine Zeile, und zwei Wengerter streiten eine halbe Stunde über drei Kilo. Am Ende gibt es trotzdem zwei Mark und eine Brezel.",
            marks: 2,
          } },
        ],
      },
      {
        text: "Mit dem Notizblock geht’s doppelt so schnell.",
        req: { souvenir: "notepad" }, blue: true,
        outcomes: [{ outcome: {
          text: "Spalten gezogen, Summen drunter, fertig. Die Wengerter schauen dir über die Schulter wie beim Preisskat. Der Kelterwart zahlt fünf Mark und will dich nächstes Jahr wieder.",
          marks: 5,
          chronicle: "In der Kelter von {place} mit dem Notizblock die Lese angeschrieben.",
        } }],
      },
      {
        text: "„Leider, ich muss weiter.“",
        outcomes: [{ outcome: {
          text: "Der Kelterwart nickt und ruft nach seiner Frau. Hinter dir hupt ein Traktor, TACKER, TACKER, und du machst Platz.",
        } }],
      },
    ],
  },
  {
    id: "enz-brautkutsche", pool: "region", region: "enztal",
    title: "Die Brautkutsche", art: "village-square",
    text: "Kurz vor Sachsenheim steht eine Hochzeitskutsche schief am Straßenrand, ein Rad ist gebrochen. Die Braut sitzt auf einem Stein und weint in den Schleier. Am Wasserschloss wartet in zwanzig Minuten der Bräutigam.",
    choices: [
      {
        text: "Die Braut zum Wasserschloss fahren.",
        outcomes: [{ outcome: {
          text: "Die Braut steigt ein, der Schleier hängt aus dem Fenster, die Gäste hupen hinterher. Am Schloss gibt es Applaus, ein Stück Torte und drei Mark vom Brautvater.",
          marks: 3,
          chronicle: "Eine Braut zum Wasserschloss Sachsenheim gefahren.",
        } }],
      },
      {
        text: "Beim Rad helfen.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Mit Draht, zwei Latten und gutem Zureden hält das Rad bis zum Schloss. Der Kutscher schenkt dir zwei Mark.",
            marks: 2,
          } },
          { weight: 1, outcome: {
            text: "KRACH. Die Latte bricht, die Kutsche sackt ab. Am Ende fährt der Onkel die Braut im Kombi, und alle lachen.",
          } },
        ],
      },
      {
        text: "Die Braut in den Beiwagen setzen.",
        req: { vehicle: "sidecar-rig" }, blue: true,
        outcomes: [{ outcome: {
          text: "Die Braut im Beiwagen, der Schleier flattert wie eine Fahne. So ist am Wasserschloss noch keine angekommen. Der Bräutigam muss sich setzen, der Brautvater zahlt vier Mark.",
          marks: 4,
          chronicle: "Eine Braut im Beiwagen zum Wasserschloss Sachsenheim gefahren.",
        } }],
      },
    ],
  },
  {
    id: "enz-hochwasser", pool: "region", region: "enztal",
    title: "Hochwasser an der Enz", art: "pitch-rain",
    text: "Drei Tage Regen, und die Enz ist über die Ufer getreten. Bei {place} steht die Uferstraße unter Wasser, die Feuerwehr stapelt Sandsäcke. Ein Feuerwehrmann winkt ab: „Do kommet Sie heut net durch.“",
    choices: [
      {
        text: "Warten und das Lokalblatt lesen.",
        outcomes: [{ outcome: {
          text: "Du stellst dich auf den Parkplatz und schlägst die Rätselseite auf. Bis das Wasser sinkt, ist das Rätsel vielleicht gelöst.",
          puzzle: "sudoku",
        } }],
      },
      {
        text: "Trotzdem durchfahren.",
        outcomes: [
          { weight: 1, outcome: {
            text: "Das Wasser reicht bis an die Radkästen. GLUCK. Du kommst durch, aber der Motor hustet noch eine Stunde.",
          } },
          { weight: 2, outcome: {
            text: "Mitten im Wasser säuft der Motor ab. Ein Traktor zieht dich raus. Der Feuerwehrmann sagt nichts, schaut aber viel.",
            fuel: -1,
            chronicle: "Bei Hochwasser in der Enz stecken geblieben. Ein Traktor hat geholfen.",
          } },
        ],
      },
      {
        text: "Sandsäcke schleppen helfen.",
        outcomes: [{ outcome: {
          text: "Zwei Stunden Sandsäcke. Danach gibt es Erbsensuppe aus der Gulaschkanone und zwei Mark aus der Kameradschaftskasse.",
          marks: 2,
          chronicle: "In {place} beim Hochwasser Sandsäcke geschleppt.",
        } }],
      },
    ],
  },
  {
    id: "enz-sprudelkisten", pool: "region", region: "enztal",
    title: "Frau Gerdas Sprudel", art: "village-square", portrait: "rechnerin", speaker: "Frau Gerda",
    text: "Vor ihrem Haus in {place} lädt Frau Gerda Sprudelkisten aus dem Kofferraum, frisch von der Quelle in Ensingen. Vierundzwanzig Flaschen, sie hat mitgezählt. „Sie könnten mir tragen helfen. Achtzehn Kilo pro Kiste, genau.“",
    choices: [
      {
        text: "Die Kisten in den Keller tragen.",
        outcomes: [{ outcome: {
          text: "Drei Kisten, zwei Treppen. Zum Dank holt Frau Gerda einen alten Notizblock aus der Schublade: „Da hab ich dreißig Jahre die Augen mitgeschrieben. Jetzt Sie.“",
          souvenir: "notepad",
          chronicle: "Frau Gerda die Sprudelkisten getragen und ihren Notizblock geerbt.",
        } }],
      },
      {
        text: "„Leider, mein Kreuz.“",
        outcomes: [{ outcome: {
          text: "Frau Gerda nickt verständnisvoll. „Bandscheibe, gell? Dann tragen Sie wenigstens die leeren Flaschen.“ Du trägst die leeren Flaschen.",
        } }],
      },
      {
        text: "Ein paar Flaschen für den Kühlschrank kaufen.",
        req: { upgrade: "fridge", marks: 1 }, blue: true,
        outcomes: [{ outcome: {
          text: "Kalter Sprudel im Kühlschrank, da musst du morgen nirgends anhalten. Frau Gerda rechnet dir die Mark auf den Pfennig genau ab.",
          marks: -1, fuel: 1,
        } }],
      },
    ],
  },
  {
    id: "enz-schleuse", pool: "region", region: "enztal",
    title: "An der Schleuse", art: "road-enz",
    text: "Auf dem Weg nach Besigheim hältst du an der Schleuse, wo die Enz in den Neckar fließt. Auf einem Lastkahn spielen zwei Schiffer Karten und warten, bis das Wasser steigt. Einer ruft herüber: „Ich hätt a Aufgab für Sie. Bis die Schleuse voll isch, hen Sie Zeit.“",
    choices: [
      {
        text: "Die Aufgabe annehmen.",
        outcomes: [{ outcome: {
          text: "Der Schiffer legt die Karten offen auf die Ladeluke. „Bloß noch a paar Stich. Wie krieget Sie den Rest?“",
          puzzle: "problem",
        } }],
      },
      {
        text: "Die Lupe holen und genau hinschauen.",
        req: { souvenir: "magnifier" }, blue: true,
        outcomes: [{ outcome: {
          text: "Mit der Lupe siehst du sogar, dass die Pik-Dame ein Eselsohr hat. Der Schiffer lacht und legt eine Mark auf die Luke.",
          puzzle: "problem", marks: 1,
        } }],
      },
      {
        text: "Winken und weiterfahren.",
        outcomes: [{ outcome: {
          text: "Die Schiffer winken zurück. Das Wasser steigt, der Kahn hebt sich, und weg ist er Richtung Heilbronn.",
        } }],
      },
    ],
  },
  // ─── Die Trockenmauer ──────────────────────────────────────────────────────────────────────────────────────
  {
    id: "enz-trockenmauer", pool: "region", region: "enztal",
    title: "Die Trockenmauer", art: "vineyard", portrait: "maurer", speaker: "Maurer-Karle",
    text: "Oberhalb von {place} ist heute Nacht ein Stück Trockenmauer in den Weinbergweg gerutscht. RUMMS, sagen die Leute. Der Maurer-Karle sortiert schon die Steine und schaut kaum auf. „Jeder Stoi hat sein Platz. Mr muss ihn bloß finde.“",
    choices: [
      {
        text: "Steine schleppen und mitsetzen.",
        outcomes: [{ outcome: {
          text: "Zwei Stunden lang reicht ihr euch Steine, und der Karle sagt genau drei Sätze. Am Ende steht die Mauer, als wär nie was gewesen. Der Wengerter vom Hang zahlt jedem drei Mark.",
          marks: 3,
          chronicle: "Mit dem Maurer-Karle eine Trockenmauer am Weinberg gesetzt.",
        } }],
      },
      {
        text: "Zuschauen, bis er fertig ist, und dann zum Skat bitten.",
        outcomes: [{ outcome: {
          text: "Der Karle setzt den letzten Stein, klopft zweimal drauf und nickt. „So. Jetzt a Spielle.“ Oberlehrer Walter kommt mit dem Fahrrad vorbei und erklärt, wie die Römer gemauert haben. Er bleibt zum Skat.",
          skat: {
            opponents: ["maurer", "lehrer"], houseRule: "standard",
            intro: "Gespielt wird auf einem Weinbergmäuerle. Der Karle prüft es vorher mit der Wasserwaage.",
          },
        } }],
      },
      {
        text: "Der Airedale sucht den Stein, der fehlt.",
        req: { dog: "airedale" }, blue: true,
        outcomes: [{ outcome: {
          text: "{dog} lässt nicht locker und buddelt im Gebüsch, bis der dicke Schlussstein zum Vorschein kommt. Der Karle staunt. „Den hab i seit heut früh gsucht.“ Er drückt dir zwei Mark in die Hand.",
          marks: 2,
          chronicle: "{dog} hat für den Maurer-Karle den Schlussstein einer Trockenmauer ausgegraben.",
        } }],
      },
    ],
  },
  {
    id: "enz-kirschen", pool: "region", region: "enztal",
    title: "Kasse des Vertrauens", art: "orchard",
    text: "Am Ortsrand von {place} steht ein Tisch mit Kirschen und eine Blechdose. „Pfund zwei Mark, Kasse des Vertrauens.“ Weit und breit niemand. Nur der Hofhund liegt im Schatten und schaut sehr genau zu.",
    choices: [
      {
        text: "Zwei Mark in die Dose, ein Pfund mitnehmen.",
        req: { marks: 2 },
        outcomes: [
          { weight: 3, outcome: {
            text: "Die Kirschen sind süß und warm von der Sonne. Der Hofhund nickt, als hätte er nichts anderes erwartet.",
            marks: -2,
          } },
          { weight: 1, outcome: {
            text: "In der Dose liegt ein alter Groschen mit einem Zettel: „Für den Ehrlichen.“ Du steckst ihn ein.",
            marks: -2, souvenir: "lucky-penny",
            chronicle: "In {place} ehrlich bezahlt und einen Glücksgroschen gefunden.",
          } },
        ],
      },
      {
        text: "Den Hund mit dem Hofhund bekannt machen.",
        req: { dog: "any" }, blue: true,
        outcomes: [{ outcome: {
          text: "{dog} und der Hofhund beschnuppern sich lang und gründlich. Dann kommt der Bauer, lacht und schenkt dir ein Körbchen Kirschen.",
          chronicle: "{dog} hat in {place} Freundschaft mit einem Hofhund geschlossen.",
        } }],
      },
      {
        text: "Nur schauen und weiterfahren.",
        outcomes: [{ outcome: {
          text: "Der Hofhund schaut dir nach, bis du um die Kurve bist. Kontrolle muss sein.",
        } }],
      },
    ],
  },
  {
    id: "enz-gottlob", pool: "region", region: "enztal",
    title: "Der alte Gottlob", art: "inn-stube", portrait: "altmeister", speaker: "Der alte Gottlob", music: "stammtisch",
    text: "In der Wirtschaft von {place} sitzt ein alter Mann allein am Stammtisch und mischt. „Des isch der Gottlob“, flüstert die Wirtin Lore. „Hat den Preisskat in Vaihingen öfter gewonnen als sonst einer im Tal.“",
    choices: [
      {
        text: "Mich zu ihm setzen. Wer gibt?",
        outcomes: [{ outcome: {
          text: "Die Wirtin Lore bindet die Schürze ab und setzt sich als Dritte dazu. „Aber hinterher net weine.“",
          skat: { opponents: ["altmeister", "wirtin"], stakes: "medium", intro: "Der alte Gottlob schiebt dir die Karten hin: „Abhebe.“ Mehr sagt er den ganzen Abend nicht." },
        } }],
      },
      {
        text: "Nur zuschauen und lernen.",
        outcomes: [{ outcome: {
          text: "Eine Stunde lang schaust du ihm über die Schulter. Er reizt wenig, spielt genau und verliert keinen Stich, den er nicht verlieren will.",
          chronicle: "Dem alten Gottlob eine Stunde über die Schulter geschaut.",
        } }],
      },
      {
        text: "Seine Spiele im Notizblock mitschreiben.",
        req: { souvenir: "notepad" }, blue: true,
        outcomes: [{ outcome: {
          text: "Als er dein Heft sieht, brummt er zufrieden und schiebt dir seine alte Lesebrille hin. „Nimm du die. I seh’s au ohne.“",
          souvenir: "reading-glasses",
          chronicle: "Vom alten Gottlob seine Lesebrille bekommen. Er sieht’s auch ohne.",
        } }],
      },
    ],
  },
  {
    id: "enz-bulldog", pool: "region", region: "enztal",
    title: "Der Bulldog", art: "road-enz",
    text: "Zwischen Horrheim und Gündelbach tuckert ein alter Bulldog vor dir her, voll beladen mit Rüben. TACKER. Fünfzehn Sachen, und überholen geht auf dem schmalen Sträßle nicht.",
    choices: [
      {
        text: "Geduldig hinterherzuckeln.",
        outcomes: [{ outcome: {
          text: "Zehn Minuten später biegt er in seinen Hof und winkt. Für die Geduld wirft er dir eine Rübe durchs Fenster. Was du damit machst, ist deine Sache.",
        } }],
      },
      {
        text: "Hupen.",
        outcomes: [
          { weight: 1, outcome: {
            text: "Der Bauer fährt rechts ran und lässt dich vorbei. Er hebt die Hand, ob zum Gruß oder anders, bleibt offen.",
          } },
          { weight: 2, outcome: {
            text: "Er hält an, steigt ab und erklärt dir eine Viertelstunde lang, dass man hier nicht hupt. Er hat recht. Danach seid ihr fast Freunde.",
            chronicle: "Bei Horrheim von einem Bauern übers Hupen belehrt worden.",
          } },
        ],
      },
      {
        text: "Der Wolfshund schaut gelassen. Du auch.",
        req: { dog: "wolfhound-b" }, blue: true,
        outcomes: [{ outcome: {
          text: "{dog} legt den Kopf aufs Armaturenbrett und schaut dem Bulldog zu, die Ruhe selbst. Das steckt an. Du kommst entspannter an als je zuvor.",
        } }],
      },
    ],
  },
];

export const ENZTAL_FLAGS: Record<string, string> = {
  "lese-geholfen": "Helped the Wengerter carry at the Roßwag Lese (enz-lese); unlocks his table in the Besen (enz-besen).",
};
