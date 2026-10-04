// Dog events (contract §4.10, §4.12): pool "dog", 12 drawn events plus the chain "Sonderfahrt nach Ungarn"
// (dog-tierschutz → chain-ungarn-grenze → chain-ungarn-tierheim), which unlocks the Irish Wolfhound `wolfhound-a`.
// "dog-besuch" unlocks the Riesenschnauzer `schnauzer-b` (needs a child in the profile); "dog-nachbarin" is its neutral
// twin for profiles without a child. All unlock starters carry `dogLocked`, so they stop once the dog is unlocked.
// {dog} is the name of a travelling dog (event requires a dog, or the choice names one); {dog:<id>} is the profile
// name of that specific dog.
import type { EventDef } from "../../game/types.ts";

export const DOG_EVENTS: EventDef[] = [
  // ─── Besuch vom Kind mit Hund (unlocks schnauzer-b) ─────────────────────────────────────────────────────────
  {
    id: "dog-besuch", pool: "dog", requires: { profile: "child", dogLocked: "schnauzer-b" },
    title: "Besuch", art: "visit",
    text: "Ein Auto hupt am Stellplatz. {child} steigt aus, und hinterher springt {dog:schnauzer-b}, der Riesenschnauzer, mit einem Vesperkorb im Maul. „Ich hab gedacht, du brauchst ein bissle Gesellschaft auf der Tour.“",
    choices: [
      {
        text: "„Dann fährt der Hund eine Etappe mit.“",
        outcomes: [{ outcome: {
          text: "{dog:schnauzer-b} springt auf den Beifahrersitz, als hätte der Riesenschnauzer nie woanders gesessen. Im Korb ist Vesper für drei Tage, und {child} winkt, bis das Auto um die Ecke ist.",
          unlockDog: "schnauzer-b", dog: "schnauzer-b",
          chronicle: "{child} kam zu Besuch und hat {dog:schnauzer-b} für eine Etappe dagelassen.",
        } }],
      },
      {
        text: "Erst mal zusammen vespern.",
        outcomes: [{ outcome: {
          text: "Brot, Schwarzwurst, Gurken und ein Thermos Kaffee auf dem Campingtisch. Ihr redet über alles und nichts. Beim Abschied bleibt {dog:schnauzer-b} einfach sitzen. Die Sache ist entschieden.",
          unlockDog: "schnauzer-b", dog: "schnauzer-b",
          chronicle: "Mit {child} am Stellplatz gevespert. {dog:schnauzer-b} ist dageblieben.",
        } }],
      },
      {
        text: "„Nimm den Hund wieder mit, der braucht seinen Garten.“",
        outcomes: [{ outcome: {
          text: "{child} nickt und lacht. „Aber das nächste Mal kommt er mit, gell?“ Im Tourenbuch steht jetzt ein Riesenschnauzer mehr, der mitfahren darf.",
          unlockDog: "schnauzer-b",
        } }],
      },
    ],
  },

  // ─── Besuch von der Nachbarin (the neutral twin of dog-besuch: profile without a child) ────────────────────
  {
    id: "dog-nachbarin", pool: "dog", requires: { noProfile: "child", dogLocked: "schnauzer-b" },
    title: "Besuch von der Nachbarin", art: "visit",
    text: "Ein Auto hupt am Stellplatz. Die Nachbarin aus {home} steigt aus, hinten im Wagen sitzt {dog:schnauzer-b}, der Riesenschnauzer. „I muss für drei Wochen zur Kur, und die Pension isch voll. Dürft der Hund a Etappe mit Ihnen fahren?“",
    choices: [
      {
        text: "„Freilich. Rein mit ihm.“",
        outcomes: [{ outcome: {
          text: "{dog:schnauzer-b} springt auf den Beifahrersitz, als hätte der Riesenschnauzer nie woanders gesessen. Die Nachbarin stellt einen Vesperkorb dazu. „Für unterwegs. Und für Sie au a bissle.“",
          unlockDog: "schnauzer-b", dog: "schnauzer-b",
          chronicle: "Die Nachbarin hat {dog:schnauzer-b} für eine Etappe in Pflege gegeben.",
        } }],
      },
      {
        text: "Erst mal zusammen Kaffee trinken.",
        outcomes: [{ outcome: {
          text: "Kaffee aus der Kanne, Hefezopf aus dem Korb, und die Nachbarin erzählt das Neueste aus {home}. Beim Abschied liegt {dog:schnauzer-b} schon unter dem Campingtisch. Die Sache ist entschieden.",
          unlockDog: "schnauzer-b", dog: "schnauzer-b",
          chronicle: "Mit der Nachbarin Kaffee getrunken. {dog:schnauzer-b} ist dageblieben.",
        } }],
      },
      {
        text: "„Diesmal geht’s nicht. Nächstes Mal gern.“",
        outcomes: [{ outcome: {
          text: "Die Nachbarin nickt. „Dann frag i Sie vor der nächsten Tour.“ Im Tourenbuch steht jetzt ein Riesenschnauzer mehr, der mitfahren darf.",
          unlockDog: "schnauzer-b",
        } }],
      },
    ],
  },

  // ─── Der Anruf vom Tierschutz (starts the chain "Sonderfahrt nach Ungarn") ─────────────────────────────────
  {
    id: "dog-tierschutz", pool: "dog", requires: { dogLocked: "wolfhound-a" },
    title: "Anruf vom Tierschutz", art: "phone-booth",
    text: "Der Platzwart klopft ans Fenster: „Telefon für Sie, vom Tierschutzverein aus {home}!“ In einem Tierheim in Ungarn sitzt ein Irischer Wolfshund, groß, grau und ganz ruhig. Ein Zuhause wartet schon, nur fährt keiner hin. „Sie haben doch so ein großes Auto“, sagt die Frau am Telefon.",
    choices: [
      {
        text: "„Ich fahr hin. Ungarn ist auch nur eine längere Etappe.“",
        outcomes: [{ outcome: {
          text: "Du holst den Atlas raus und blätterst ganz nach hinten, wo die Seiten noch steif sind. Bis zur Grenze ist es ein ordentliches Stück.",
          next: "chain-ungarn-grenze",
        } }],
      },
      {
        text: "„Fahren kann ich nicht, aber ich zahl den Sprit.“",
        req: { marks: 3 },
        outcomes: [{ outcome: {
          text: "Die Frau bedankt sich dreimal. Ein Pfarrer aus dem Nachbarort hat einen Kombi und fährt am Samstag. Du hast den Sprit bezahlt, und das ist auch ein Stück vom Weg.",
          marks: -3,
          chronicle: "Dem Tierschutz das Benzingeld für eine Fahrt nach Ungarn gegeben.",
        } }],
      },
      {
        text: "„Heute geht’s wirklich nicht. Ruft wieder an.“",
        outcomes: [{ outcome: {
          text: "„Des versteh ich“, sagt sie. Der Hund wartet nicht auf dich allein, aber er wartet. Du hängst ein, und der Groschen fällt hörbar in den Kasten.",
        } }],
      },
    ],
  },

  // ─── Wurstkette ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "dog-wurstkette", pool: "dog", requires: { dog: "any" },
    title: "Die Wurstkette", art: "dog-thief",
    text: "Vor der Metzgerei liegt {dog} ganz unschuldig im Schatten. Dann geht’s los: Der Hund rennt mit einer Wurstkette im Maul, und hinterher rennt der Metzger mit Schürze und rotem Kopf.",
    choices: [
      {
        text: "Hinterher und den Schaden bezahlen.",
        req: { marks: 3 },
        outcomes: [{ outcome: {
          text: "Der Metzger zählt die Würste nach und knurrt fast so laut wie {dog}. Dann packt er dir noch ein Rädle Lyoner fürs Vesper ein. „Der Hund hat Geschmack, des muss mr ihm lassen.“",
          marks: -3,
          chronicle: "{dog} hat beim Metzger eine Wurstkette ausgeführt. Bezahlt und gelacht.",
        } }],
      },
      {
        text: "Laut pfeifen und hoffen, dass der Hund hört.",
        outcomes: [
          { weight: 2, outcome: {
            text: "{dog} kommt tatsächlich zurück und legt dem Metzger die Wurstkette vor die Füße, nur eine Wurst fehlt. Der Metzger lacht. „Die eine isch Finderlohn.“",
          } },
          { weight: 1, outcome: {
            text: "{dog} hört nicht, jedenfalls nicht vor der Kirche. Hinter der Kirche ist die Wurst alle. Der Metzger winkt ab: „Bei dem Wetter wär sie eh nimmer lang gut gewesen.“",
          } },
        ],
      },
      {
        text: "Einmal kurz auf der Hundepfeife.",
        req: { souvenir: "dog-whistle" }, blue: true,
        outcomes: [{ outcome: {
          text: "Ein Pfiff, und {dog} macht eine Vollbremsung. Die Wurstkette ist heil. Der Metzger ist so beeindruckt, dass er dir zwei Mark in die Hand drückt. „Für so einen Hund tät i a Kilo Leberkäs geben.“",
          marks: 2,
        } }],
      },
    ],
  },

  // ─── Hundewiese: der Pudel vom Nachbarort ──────────────────────────────────────────────────────────────────
  {
    id: "dog-rivale", pool: "dog", requires: { dog: "any" },
    title: "Sitz, Platz, Pfote", art: "dog-meadow",
    text: "Auf der Hundewiese führt ein Herr im Trachtenjanker seinen frisierten Pudel vor. Sitz, Platz, Pfote, alles auf Kommando. Dann schaut er zu {dog} hinüber. „Und was kann Ihrer?“",
    choices: [
      {
        text: "„Wetten, zwei Mark, dass {dog} das auch kann?“",
        req: { marks: 2 },
        outcomes: [
          { weight: 1, outcome: {
            text: "Sitz, Platz, Pfote, und zum Schluss legt sich {dog} auf den Rücken und spielt toter Mann. Das war nicht verlangt, aber die Wiese klatscht. Der Herr zahlt mit spitzen Fingern.",
            marks: 2,
          } },
          { weight: 1, outcome: {
            text: "Sitz klappt. Platz klappt. Bei Pfote rennt {dog} zum Pudel und will spielen. Der Herr steckt deine zwei Mark ein und sagt: „Erziehung isch alles.“",
            marks: -2,
          } },
        ],
      },
      {
        text: "„Der Schäferhund zeigt mal, was er im Verein gelernt hat.“",
        req: { dog: "shepherd" }, blue: true,
        outcomes: [{ outcome: {
          text: "{dog} macht Fuß, Sitz, Platz und bringt zum Schluss dem Herrn seinen eigenen Hut. Der Herr lacht als Erster. Die Leute auf der Wiese stecken dir drei Mark für die Vorstellung zu.",
          marks: 3,
          chronicle: "Auf der Hundewiese hat {dog} einen Pudel vorgeführt, freundlich, aber deutlich.",
        } }],
      },
      {
        text: "„Unserer kann vor allem eins: schlafen.“",
        outcomes: [{ outcome: {
          text: "Wie zum Beweis legt sich {dog} ins Gras und schnarcht. Der Herr will etwas sagen, aber dann gähnt sein Pudel auch. Die Vorstellung ist für heute vorbei.",
        } }],
      },
    ],
  },

  // ─── Der Geldbeutel unter der Bank ─────────────────────────────────────────────────────────────────────────
  {
    id: "dog-geldbeutel", pool: "dog", requires: { dog: "any" },
    title: "Der Geldbeutel", art: "village-square",
    text: "{dog} schnüffelt unter einer Bank am Dorfplatz und bringt dir einen Geldbeutel. Darin: ein Ausweis, ein Foto von einem Enkel und vierzig Mark. Die Kirchturmuhr schlägt zwölf.",
    choices: [
      {
        text: "Aufs Rathaus zum Fundbüro bringen.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Die Frau im Fundbüro kennt den Mann auf dem Ausweis, natürlich. Eine Stunde später kommt er gelaufen und drückt dir drei Mark Finderlohn in die Hand. {dog} bekommt einen Hundekuchen.",
            marks: 3,
          } },
          { weight: 1, outcome: {
            text: "Mittagspause, das Fundbüro hat zu. Du wirfst den Geldbeutel mit einem Zettel in den Briefkasten vom Rathaus. Das Gewissen ist rein, der Magen leer.",
          } },
        ],
      },
      {
        text: "Die feine Nase soll den Besitzer finden.",
        req: { dog: "schnauzer-a" }, blue: true,
        outcomes: [{ outcome: {
          text: "{dog} zieht dich quer über den Platz, durch die Wirtschaft bis an den Stammtisch. Dort sucht ein alter Herr in allen Taschen. Er ist so froh, dass er dir fünf Mark gibt und {dog} ein Stück Wurst vom Teller.",
          marks: 5,
          chronicle: "{dog} hat einem alten Herrn den Geldbeutel zurückgebracht, mit der Nase.",
        } }],
      },
      {
        text: "Den Ausweis lesen und die Adresse selbst suchen.",
        outcomes: [{ outcome: {
          text: "Die Adresse ist drei Häuser weiter. Eine Frau in Kittelschürze öffnet, ruft „Ha, der Dackel hat ihn wieder verloren!“ und meint ihren Mann. Zum Dank gibt es ein Stück Zwetschgenkuchen auf die Hand.",
        } }],
      },
    ],
  },

  // ─── Hundeschau ────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "dog-hundeschau", pool: "dog", requires: { dog: "any" },
    title: "Hundeschau", art: "dog-meadow",
    text: "Auf der Wiese hinter der Turnhalle ist Hundeschau. Ein Richter mit Hut und Klemmbrett bleibt vor {dog} stehen und hebt eine Augenbraue. „Melden Sie den doch an. Startgeld zwei Mark.“",
    choices: [
      {
        text: "Anmelden, zwei Mark.",
        req: { marks: 2 },
        outcomes: [
          { weight: 1, outcome: {
            text: "Erster Platz in der Klasse „Sonstige“. Es gibt eine Schleife, eine Urkunde und sechs Mark aus der Vereinskasse. {dog} trägt die Schleife einen Nachmittag lang mit großem Ernst.",
            marks: 4,
            chronicle: "{dog} hat bei der Hundeschau den ersten Platz gemacht, Klasse „Sonstige“.",
          } },
          { weight: 2, outcome: {
            text: "Dritter Platz von drei. Es gibt eine Rosette und eine Dose Hundekuchen. {dog} findet die Dose deutlich wichtiger als die Rosette.",
            marks: -2,
          } },
        ],
      },
      {
        text: "Der Wolfshund steht einfach da, die Ruhe selbst.",
        req: { dog: "wolfhound-b" }, blue: true,
        outcomes: [{ outcome: {
          text: "Die anderen Hunde bellen, zerren und zappeln. {dog} steht da wie ein Denkmal. Der Richter schreibt „Vorzüglich“ aufs Klemmbrett, und der Verein spendiert vier Mark und eine Schleife.",
          marks: 4,
          chronicle: "{dog} wurde bei einer Hundeschau „Vorzüglich“, ohne einen Schritt zu tun.",
        } }],
      },
      {
        text: "Nur zuschauen.",
        outcomes: [{ outcome: {
          text: "Ein Dackel gewinnt, ein Pudel schmollt, ein Boxer frisst die Urkunde. Es ist ein guter Nachmittag, und er kostet nichts.",
        } }],
      },
    ],
  },

  // ─── Baden im Bach ─────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "dog-bach", pool: "dog", requires: { dog: "any" },
    title: "Hitze am Bach", art: "road-enz",
    text: "Es ist heiß. Unten am Bach rauscht das Wasser über die Steine. {dog} schaut dich an, dann das Wasser, dann wieder dich.",
    choices: [
      {
        text: "„Lauf, mach!“",
        outcomes: [{ outcome: {
          text: "{dog} springt. KLATSCH. Zurück am Ufer stellt sich der Hund direkt neben dich und schüttelt sich gründlich. Jetzt seid ihr beide nass und beide zufrieden.",
          chronicle: "{dog} ist bei großer Hitze in den Bach gesprungen. Danach waren wir beide nass.",
        } }],
      },
      {
        text: "„Nachher. Jetzt geht’s weiter.“",
        outcomes: [{ outcome: {
          text: "{dog} legt sich beleidigt auf den eigenen Platz und seufzt bis zum nächsten Ort. Hunde können sehr laut seufzen.",
        } }],
      },
      {
        text: "Der Airedale soll den Stock holen, den keiner mehr findet.",
        req: { dog: "airedale" }, blue: true,
        outcomes: [{ outcome: {
          text: "{dog} lässt nicht locker und taucht im Schilf. Statt des Stocks kommt ein Angelkasten zurück, der einem Angler weiter oben davongeschwommen ist. Der Mann ist so froh, dass er dir drei Mark gibt.",
          marks: 3,
        } }],
      },
    ],
  },

  // ─── Unter dem Stammtisch ──────────────────────────────────────────────────────────────────────────────────
  {
    id: "dog-stammtisch", pool: "dog", requires: { dog: "any" },
    title: "Unter dem Stammtisch", art: "inn-stube",
    portrait: "schlitzohr", speaker: "’s Schlitzohr Fritz",
    text: "Im Wirtshaus liegt {dog} unter dem Stammtisch. Jedes Mal, wenn ’s Schlitzohr Fritz die Karten mischt, knurrt es leise unter dem Tisch. Fritz schaut hinunter. „Der Hund mag mi net.“",
    choices: [
      {
        text: "„Eine Runde mit Fritz und der Wirtin. Der Hund passt auf.“",
        outcomes: [{ outcome: {
          text: "„Na gut“, sagt Fritz und zwinkert, „dann spiel i heut halt ehrlich.“ Unter dem Tisch wird es ruhig.",
          skat: {
            opponents: ["schlitzohr", "wirtin"],
            intro: "Fritz mischt, unter dem Tisch knurrt es leise, die Wirtin lacht. Wer gibt?",
          },
        } }],
      },
      {
        text: "Der Wolfshund legt Fritz einfach den Kopf aufs Knie.",
        req: { dog: "wolfhound-a" }, blue: true,
        outcomes: [{ outcome: {
          text: "{dog} legt Fritz den schweren Kopf aufs Knie und schaut ihn an. Fritz hält es zehn Sekunden aus. Dann holt er ein Wurstbrot aus der Jacke. „Des war’s, was der Hund wollt. Net mei Blatt.“",
          chronicle: "Unter dem Stammtisch hat {dog} ’s Schlitzohr Fritz sein Wurstbrot abgeschwatzt.",
        } }],
      },
      {
        text: "Lieber zuschauen und von Fritz lernen.",
        outcomes: [{ outcome: {
          text: "Fritz legt dir ein Endspiel auf den Tisch, fünf Karten offen. „Wenn du des lösch, {title}, dann zahl i.“",
          puzzle: "problem",
        } }],
      },
    ],
  },

  // ─── Der Dorn ──────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "dog-tierarzt", pool: "dog", requires: { dog: "any" },
    title: "Der Dorn", art: "pitch-evening",
    text: "{dog} humpelt. Am Stellplatz gibt es keinen Tierarzt, aber im Ort einen, sagt der Platzwart. „Der macht sonst Kühe. Dann macht er au den.“",
    choices: [
      {
        text: "Hinfahren, sicher ist sicher.",
        req: { marks: 3 },
        outcomes: [{ outcome: {
          text: "Der Tierarzt zieht mit der Pinzette einen Dorn aus der Pfote. ZACK. {dog} bekommt einen Hundekuchen, du die Rechnung. Beide sind zufrieden, einer mehr.",
          marks: -3,
        } }],
      },
      {
        text: "Selbst nachschauen, mit Taschenlampe und Pinzette.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Da ist er, der Dorn. Ein Ruck, ein Jaulen, ein Ablecken. {dog} läuft wieder rund, als wäre nie etwas gewesen.",
          } },
          { weight: 1, outcome: {
            text: "Kein Dorn zu finden. Du fährst doch noch in den Ort, und der Tierarzt findet: nichts. {dog} wollte nur gestreichelt werden. Der Umweg kostet einen Strich Sprit.",
            fuel: -1,
          } },
        ],
      },
      {
        text: "Mit der Lesebrille sieht man auch kleine Dornen.",
        req: { souvenir: "reading-glasses" }, blue: true,
        outcomes: [{ outcome: {
          text: "Brille auf, Pfote hoch, und da sitzt er, der kleine Lump von einem Dorn. ZACK, draußen. {dog} leckt dir zum Dank einmal quer über die Brille.",
        } }],
      },
    ],
  },

  // ─── Regenwetter ───────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "dog-regen", pool: "dog", requires: { dog: "any" },
    title: "Kein Hundewetter", art: "pitch-rain", music: "stellplatz",
    text: "Es schüttet. {dog} steht in der offenen Tür, schaut in den Regen und setzt sich demonstrativ wieder hin. Gassi heißt heute: Du gehst, der Hund schaut zu.",
    choices: [
      {
        text: "Schirm auf und zusammen raus.",
        outcomes: [
          { weight: 2, outcome: {
            text: "{dog} kommt mit, unter Protest und dicht an deinem Bein, damit wenigstens die Hälfte trocken bleibt. Zurück im Warmen riecht es nach nassem Hund und Kaffee.",
          } },
          { weight: 1, outcome: {
            text: "In einer Pfütze glänzt etwas. {dog} findet es zuerst: ein Fünfmarkstück, ganz ohne Besitzer weit und breit. Der Regen hat sich gelohnt.",
            marks: 5,
          } },
        ],
      },
      {
        text: "„Dann eben nicht.“ Kaffee und die Rätselseite.",
        outcomes: [{ outcome: {
          text: "{dog} legt sich auf deine Füße. Du schlägst das Lokalblatt bei der Rätselseite auf und spitzt den Bleistift.",
          puzzle: "sudoku",
        } }],
      },
      {
        text: "Unter der Markise ist es trocken, für beide.",
        req: { upgrade: "awning" }, blue: true,
        outcomes: [{ outcome: {
          text: "Unter der Markise trommelt der Regen, aber drunter bleibt alles trocken. {dog} schläft, und der Platznachbar kommt mit einer Skataufgabe aus der Zeitung herüber.",
          puzzle: "problem",
        } }],
      },
    ],
  },

  // ─── Die Dackeldame ────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "dog-dackel", pool: "dog", requires: { dog: "any" },
    title: "Die Dackeldame", art: "dog-meadow",
    portrait: "rechnerin", speaker: "Frau Gerda",
    text: "Eine Rauhaardackeldame mit rotem Halsband weicht {dog} nicht mehr von der Seite. Am anderen Ende der Leine steht Frau Gerda. „Die Hexe isch sonst gar net so“, sagt sie und schaut auf die Uhr. „Vierzehn Minuten schon.“",
    choices: [
      {
        text: "Frau Gerda zum Kaffee begleiten.",
        outcomes: [{ outcome: {
          text: "Im Café rechnet Frau Gerda dir vor, wie viele Augen in einem Grand ohne vier fehlen. Zum Abschied schenkt sie dir einen Bleistiftstummel. „Fürs Rätsel im Lokalblatt. Mit Kuli macht mr des net.“",
          souvenir: "pencil",
        } }],
      },
      {
        text: "Die zwei zusammen über die Wiese laufen lassen.",
        outcomes: [{ outcome: {
          text: "Die Dackeldame rennt vorneweg, {dog} hinterher, immer im Kreis. Frau Gerda zählt die Runden mit. Es sind dreiundzwanzig, sagt sie, und sie hat recht.",
          chronicle: "{dog} hat eine Verehrerin: die Dackeldame von Frau Gerda.",
        } }],
      },
    ],
  },

  // ─── Leistungshüten ────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "dog-hueteprobe", pool: "dog", requires: { dog: "any" },
    title: "Leistungshüten", art: "sheep",
    text: "Am Ortsrand ist Leistungshüten. Hundert Schafe, drei Pfähle, ein Gatter und ein Schäfer, der nur pfeift. „Wenn Sie einen Hund haben, der des kann, nur zu“, sagt er und grinst.",
    choices: [
      {
        text: "Der Schäferhund kennt das Geschäft.",
        req: { dog: "shepherd" }, blue: true,
        outcomes: [{ outcome: {
          text: "{dog} umkreist die Herde, flach und schnell, und die Schafe laufen ins Gatter, als hätten sie es selbst so gewollt. Der Schäfer nimmt den Hut ab. Aus dem Startgeld-Topf gibt es vier Mark.",
          marks: 4,
          chronicle: "{dog} hat beim Leistungshüten hundert Schafe ins Gatter gebracht.",
        } }],
      },
      {
        text: "{dog} probiert es einfach.",
        outcomes: [
          { weight: 2, outcome: {
            text: "Die Schafe laufen im Kreis, {dog} läuft im Kreis, nur das Gatter bleibt, wo es ist. Der Schäfer lacht Tränen und schenkt dir ein Stück Schafskäse.",
          } },
          { weight: 1, outcome: {
            text: "Gegen jede Erwartung landen die Schafe im Gatter. {dog} weiß selbst nicht, wie. Der Schäfer gibt dir zwei Mark und sagt: „Glück g’hört au dazu.“",
            marks: 2,
          } },
        ],
      },
      {
        text: "Nur zuschauen und lernen.",
        outcomes: [{ outcome: {
          text: "Ein Pfiff heißt links, zwei heißt rechts, ein langer heißt halt. Bis zum Abend kannst du alle drei. {dog} hört trotzdem auf keinen.",
        } }],
      },
    ],
  },

  // ─── Chain: Sonderfahrt nach Ungarn ────────────────────────────────────────────────────────────────────────
  {
    id: "chain-ungarn-grenze", pool: "chain",
    title: "Sonderfahrt nach Ungarn", art: "hungary-road",
    text: "Zwei Tage Landstraße, dann die Grenze. Der Grenzer blättert lange im Pass, stempelt das Visum und schaut noch länger ins Auto. Dahinter kommen Pappeln, Ziehbrunnen und eine Straße, die einfach geradeaus geht.",
    choices: [
      {
        text: "Geduldig bleiben und weiterfahren.",
        outcomes: [{ outcome: {
          text: "Der Tank wird leichter, die Straße gerader. In einem Dorf ohne Namen auf deiner Karte zeigt dir eine alte Frau mit Kopftuch den Weg zum Tierheim, mit Händen und Füßen.",
          fuel: -1,
          next: "chain-ungarn-tierheim",
        } }],
      },
      {
        text: "Mit dem Straßenatlas die kürzere Landstraße nehmen.",
        req: { souvenir: "road-atlas" }, blue: true,
        outcomes: [{ outcome: {
          text: "Der Atlas kennt eine Straße, die der Grenzer nicht kennt. Sie ist holprig, aber kurz. Du sparst einen Strich Sprit und kommst noch vor dem Mittagessen an.",
          next: "chain-ungarn-tierheim",
        } }],
      },
    ],
  },
  {
    id: "chain-ungarn-tierheim", pool: "chain",
    title: "Der letzte Zwinger", art: "shelter",
    text: "Das Tierheim liegt am Ende eines Feldwegs. Im letzten Zwinger steht {dog:wolfhound-a} auf, groß wie ein Kalb und grau wie ein Novembermorgen. Der Wolfshund legt dir den Kopf auf die Schulter. Da muss keiner etwas sagen.",
    choices: [
      {
        text: "„Komm, Großer. Wir fahren heim.“",
        outcomes: [{ outcome: {
          text: "{dog:wolfhound-a} steigt ein, dreht sich zweimal und legt sich hin, als wäre der Wolfshund nie woanders gewesen. Die Frauen vom Tierheim winken, bis die Pappeln euch verschlucken.",
          unlockDog: "wolfhound-a", dog: "wolfhound-a",
          chronicle: "In Ungarn {dog:wolfhound-a} abgeholt, den Irischen Wolfshund. Seitdem fährt der Hund mit.",
        } }],
      },
      {
        text: "Erst mal zusammen über die Wiese laufen.",
        outcomes: [{ outcome: {
          text: "Ihr lauft eine Runde, langsam, der Wolfshund immer einen halben Schritt hinter dir. Am Auto wartet er, bis du die Tür aufmachst. Damit ist alles gesagt.",
          unlockDog: "wolfhound-a", dog: "wolfhound-a",
          chronicle: "Mit {dog:wolfhound-a} über eine ungarische Wiese gelaufen. Seitdem fahren wir zusammen.",
        } }],
      },
      {
        text: "„Das Hundebett ist schon gemacht.“",
        req: { upgrade: "dog-bed" }, blue: true,
        outcomes: [{ outcome: {
          text: "Die Leiterin schaut sich das Hundebett an und nickt zufrieden. Zum Abschied gibt sie dir einen alten ungarischen Glücksgroschen. „Für die Karten“, sagt sie. Sie hat von Skat gehört.",
          unlockDog: "wolfhound-a", dog: "wolfhound-a", souvenir: "lucky-penny",
          chronicle: "{dog:wolfhound-a} aus Ungarn geholt. Das Hundebett war schon gemacht.",
        } }],
      },
    ],
  },
];

/** This deck sets and reads no flags; the Ungarn chain runs through `next`. */
export const DOG_FLAGS: Record<string, string> = {};
