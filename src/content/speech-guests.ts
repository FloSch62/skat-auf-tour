// Speech of the Preisskat favourites and the side characters (merged into SPEECH in speech.ts).
// Favourites have no "order" lines: at the Preisskat nothing is ordered (Turnier ist Turnier, contract §4.6).
// "kontra" lines fit both Kontra and Re (the table shows the word itself). "bid" lines carry no numbers and
// "declare" lines name no game type: the table shows both.
import type { SpeechBook } from "../game/types.ts";

export const GUEST_SPEECH: SpeechBook = {
  // ── Favoriten ──
  wengerter: {
    greet: [
      "Grüß Gott, {name}. Hock di na, der Hang wartet net auf uns.",
      "So, {title}. Heut wird gelesen, Karten statt Trauben.",
      "I komm grad vom Steilhang. Da isch so a Kartentisch fast eben.",
    ],
    bid: [
      "Do geht no was. Des isch wie am Hang: Schritt für Schritt.",
      "I steig no a Mäuerle höher.",
      "Mit dem Blatt geh i no a Stückle mit.",
    ],
    pass: [
      "Do lass i’s hängen. Net jede Traube muss in die Butte.",
      "Passe. Bei dem Wetter erntet man net.",
      "Nix für mi. I wart auf den nächsten Herbst.",
    ],
    declare: [
      "So, jetzt wird gelesen.",
      "Des Blatt isch reif. I spiel.",
      "Ab in die Butte damit, i spiel.",
    ],
    trickWon: [
      "Der kommt in den Keller.",
      "Wieder a Traube mehr.",
      "So schafft man am Hang: Stich für Stich.",
    ],
    trickLost: [
      "Hagel. Kann passieren.",
      "Den hat mir der Wind vom Mäuerle gweht.",
      "Ha jo, der gehört dir. Gönn i dir.",
    ],
    gameWon: [
      "Gute Lese heut, {name}. Des gibt an ordentlichen Jahrgang.",
      "Die Trockenmauer hält. Gewonnen.",
      "So isch’s recht. Des schreib mer auf die Liste wie aufs Fass.",
    ],
    gameLost: [
      "Verhagelt. Aber der nächste Herbst kommt bestimmt.",
      "Gut gspielt, {title}. Da hätt mei Rebstock au nix mehr gmacht.",
      "Des war a saurer Jahrgang. Abhaken.",
    ],
    ramsch: [
      "Ramsch. Des isch wie Lese im Regen: Jeder nimmt, was er kriegt.",
      "Jetzt wird’s steil, und keiner will nach oben.",
      "Bloß koine Augen sammeln. Augen sind heut Unkraut.",
    ],
    farewell: [
      "Ade, {name}. Wenn du in Roßwag bist, schau am Hang vorbei.",
      "I muss heim, die Reben schaffet net von allein.",
      "Ade mitnand. Der Steilhang ruft.",
    ],
    kontra: [
      "Des lass i net so stehen. Doppelt!",
      "Moment, da halt i dagegen.",
      "So steil wie mei Hang, so steil wird’s jetzt.",
    ],
    blunder: [
      "{target}, du Seggl! Des war, wie wenn mr die Reben vor der Lese schneidet.",
      "Jetzt hasch mir die ganze Lese verhagelt, {target}.",
      "Herrgott nomol. I trag die Butte nauf, und du schüttsch sie aus.",
    ],
    robbed: [
      "Mei Ass! Des war die beste Traube vom ganze Hang, {target}.",
      "{target}, du Grasdackel, des war mei Zehn. Die hab i gpflegt.",
      "Gstohle wie Trauben am Wegrand.",
    ],
    selfBlame: [
      "I Seggl. Zu früh gelese, des wird sauer.",
      "Do bin i selber über mei eigenes Mäuerle gstolpert.",
      "Hermann, Hermann. Des hätt dir dei Vadder net durchgehe lasse.",
    ],
    tease: [
      "{target}, des Blatt war wohl noch net reif.",
      "Überreizt. Do hat oiner zu viel Trauben am Stock glasse.",
      "Des gibt an saure Jahrgang, {target}.",
    ],
  },

  muellerin: {
    greet: [
      "Grüß Gott, {name}. Setz di, das Wasser läuft heut gleichmäßig.",
      "So, {title}. Dann schauen wir mal, was du auf die Mühle bringst.",
      "Ich hab extra das Mühlrad angehalten. Also, wer gibt?",
    ],
    bid: [
      "Ich geh mit. Ruhig und gleichmäßig.",
      "Weiter. Das Rad dreht sich noch.",
      "Da mahl ich noch eine Runde mit, gell.",
    ],
    pass: [
      "Passe. Nicht jedes Korn gibt Mehl.",
      "Ich lass das Wehr offen. Passe.",
      "Passe. Da ist mir zu viel Spreu im Blatt.",
    ],
    declare: [
      "Gut. Dann wird gemahlen.",
      "Ich spiel. Und zwar sauber.",
      "Das Korn liegt richtig. Ich spiel.",
    ],
    trickWon: [
      "Fein gemahlen.",
      "Der kommt in den Sack.",
      "Klapp, klapp, klapp. So läuft das Rad.",
    ],
    trickLost: [
      "Dann mahlt halt mal ein anderer.",
      "Ein Körnchen verloren. Kein ganzer Sack.",
      "Sauber gemacht. Das merk ich mir.",
    ],
    gameWon: [
      "Erst gemahlen, dann gezählt. Gewonnen, {name}.",
      "So, das ist feines Mehl.",
      "Gleichmäßig wie das Wehr. Danke für das Spiel, {title}.",
    ],
    gameLost: [
      "Heidanei, da hast du mir das Wasser abgegraben, {name}.",
      "Das passiert, wenn die Enz Niedrigwasser hat.",
      "Respekt. Das war sauber gespielt.",
    ],
    ramsch: [
      "Ramsch. Jetzt bloß nichts in den Sack.",
      "Da wird nicht gemahlen, da wird gesiebt.",
      "Gut, Ramsch. Wer am meisten hat, trägt den Sack heim.",
    ],
    farewell: [
      "Ade, {name}. Die Mühle steht nie lang still.",
      "Ich muss nach dem Wehr schauen. Ade.",
      "Das war ein schöner Nachmittag. Ade mitnand.",
    ],
    kontra: [
      "Halt. Da dreh ich das Rad andersrum.",
      "Das wiegen wir doppelt ab.",
      "Moment. Das prüf ich nach, Korn für Korn.",
    ],
    blunder: [
      "{target}, da hast du mir Sand ins Mahlwerk gestreut.",
      "So ein Seggl. Jetzt läuft das Rad leer.",
      "Das Wehr war offen, und du lässt das Wasser vorbei, {target}.",
    ],
    robbed: [
      "Mein Ass. Weg wie Mehl im Wind, {target}.",
      "Die Zehn hätt ich gern selber in den Sack getan.",
      "{target}, du Halbdackel, das war mein bestes Korn.",
    ],
    selfBlame: [
      "Hedwig, du Bachel. Das Rad dreht sich rückwärts.",
      "Zu grob gemahlen. Das ärgert mich.",
      "Da hab ich das Wehr selber zugemacht.",
    ],
    tease: [
      "{target}, überreizt? Da war mehr Spreu als Weizen.",
      "Das Rad dreht sich weiter, auch wenn einer reinfällt.",
      "{target}, das Korn war zu leicht für den Sack.",
    ],
  },

  bahner: {
    greet: [
      "Grüß Gott, {name}. Pünktlich, des gfällt mir.",
      "Na, {title}? Einsteigen bitte, der Zug steht bereit.",
      "I komm grad vom Stellwerk. Auf welchem Gleis spiel mer?",
    ],
    bid: [
      "Weiter, die Strecke isch frei.",
      "Do fahr i no bis zum nächsten Signal.",
      "Signal steht auf Grün. I geh mit.",
    ],
    pass: [
      "Halt, Signal rot. Passe.",
      "Do steig i aus.",
      "Passe. Der Zug fährt ohne mi.",
    ],
    declare: [
      "Abfahrt! I spiel.",
      "Weiche gestellt. Jetzt geht’s los.",
      "Fahrplanmäßig: I spiel des.",
    ],
    trickWon: [
      "Pünktlich eingefahren.",
      "Der Stich hält auf meinem Gleis.",
      "Angekuppelt.",
    ],
    trickLost: [
      "Kleine Verspätung. Wird aufgeholt.",
      "Den hat mir einer abgehängt.",
      "Falsch gestellt, die Weiche.",
    ],
    gameWon: [
      "Planmäßig angekommen, {name}. Endbahnhof Liste.",
      "So fährt man in Mühlacker: auf die Minute.",
      "Gute Fahrt gehabt. Danke, {title}.",
    ],
    gameLost: [
      "Zugausfall. Des kommt in die Akte.",
      "Entgleist, {name}. Gut gspielt.",
      "Der Fahrplan hat gstimmt. Bloß der Zug net.",
    ],
    ramsch: [
      "Ramsch. Alle steigen aus, und keiner will den Gepäckwagen.",
      "Jetzt wird rangiert.",
      "Ramsch isch wie der Güterbahnhof: Am End hat einer den ganzen Schrott.",
    ],
    farewell: [
      "Ade, {name}. Mei Zug geht um zehn nach.",
      "I muss los, Schichtbeginn isch Schichtbeginn.",
      "Ade mitnand. Nächster Halt: daheim.",
    ],
    kontra: [
      "Halt, Gegenzug auf der Strecke.",
      "Da stell i die Weiche anders.",
      "Des fahr mer jetzt doppelt.",
    ],
    blunder: [
      "{target}, du Seggl! Du hasch mir die Weiche falsch gstellt.",
      "I fahr auf Grün, und du stellsch mir a Rot hin, {target}.",
      "Herrgott nomol, des isch a Auffahrunfall mit Ansage.",
    ],
    robbed: [
      "Mei Ass, abgehängt am Rangierbahnhof, {target}.",
      "{target}, des war mei Zehn. Ohne Fahrschein mitgnomme!",
      "Do isch mir der beste Wagen weggrollt.",
    ],
    selfBlame: [
      "Willi, du Halbdackel. Falsches Gleis.",
      "Fahrplan net glesen. Selber schuld.",
      "I hab mi verrangiert. Kruzifix.",
    ],
    tease: [
      "{target}, überreizt. Do isch der Zug ohne Lok abgfahre.",
      "Endstation, und koiner holt di ab.",
      "{target}, des war a Fahrt aufs Abstellgleis.",
    ],
  },

  klosterwirt: {
    greet: [
      "Grüß Gott, {name}. Im Kloster hat man Zeit, und beim Skat erst recht.",
      "Setz di, {title}. Die Maultaschen sind warm, die Karten auch.",
      "Willkommen. Hier haben schon die Mönche geschwiegen. Beim Skat darf man reden.",
    ],
    bid: [
      "Geduld. Ich geh noch mit.",
      "Langsam, das Gewölbe ist auch nicht an einem Tag gebaut.",
      "Ich bleib dabei, in aller Ruhe.",
    ],
    pass: [
      "Passe. Fastenzeit.",
      "Das lass ich an mir vorübergehen.",
      "Nein, da halt i mich zurück wie ein Novize.",
    ],
    declare: [
      "Dann wollen wir mal. Ich spiel.",
      "Was lange reift, wird gut. Ich spiel.",
      "Ich spiel, und zwar mit Bedacht.",
    ],
    trickWon: [
      "Geduld zahlt sich aus.",
      "Den versteck i wie das Fleisch in der Maultasche.",
      "In aller Stille.",
    ],
    trickLost: [
      "Den lass i ziehen. Der nächste kommt.",
      "Gut. Man muss auch verzichten können.",
      "Ein Stich ist noch kein Kreuzgang.",
    ],
    gameWon: [
      "So, {name}. Der letzte Stich macht die Musik.",
      "Geduld, mein Lieber. Das ist das ganze Geheimnis.",
      "Gewonnen. Darauf ein Herrgottsbscheißerle, {title}.",
    ],
    gameLost: [
      "Da hast du mich erwischt wie den Mönch mit der Maultasche.",
      "Verloren. Das trag ich mit Fassung.",
      "Respekt, {name}. Das war gut gespielt.",
    ],
    ramsch: [
      "Ramsch. Da hilft nur Bescheidenheit.",
      "Jetzt heißt es: wenig nehmen, viel geben.",
      "Wer am wenigsten hat, ist heut der Reichste.",
    ],
    farewell: [
      "Ade, {name}. In Maulbronn steht immer ein Teller für dich.",
      "Ich muss zurück, die Gäste warten im Kreuzgang.",
      "Behüt di Gott, mitnand.",
    ],
    kontra: [
      "Na, na. Das wiegt jetzt doppelt.",
      "Da hab ich meine Zweifel.",
      "Geduld hat Grenzen.",
    ],
    blunder: [
      "{target}, du Seggl. Verzeih mir’s Gott, aber des war a Seggl.",
      "I bet um Geduld, und du schmierst dem Falschen, {target}.",
      "Herrgottsbscheißerle, des war jetzt net nötig.",
    ],
    robbed: [
      "Mei Ass. Wie die Maultasche aus der Fastenküche, {target}.",
      "{target}, die Zehn hätt i gern selber verwahrt.",
      "Gstohle im Kreuzgang. Am helllichte Tag.",
    ],
    selfBlame: [
      "Eberhard, du Simpel. Zu früh gefastet.",
      "Do hab i selber net aufgepasst. Mea culpa.",
      "Geduld hab i gepredigt und selber net ghabt.",
    ],
    tease: [
      "{target}, überreizt? Hochmut kommt vor dem Fall.",
      "Mancher reizt wie ein Abt und spielt wie ein Novize.",
      "{target}, da hätt dir a Fastenzeit gut getan.",
    ],
  },

  floesser: {
    greet: [
      "Grüß Gott, {name}. Leg an, das Wasser isch ruhig heut.",
      "So, {title}. Dann wolle mir mal ablegen.",
      "Hock di na. In Calmbach sagt man: Erst die Karten, dann das Floß.",
    ],
    bid: [
      "I stoß no a Stückle weiter.",
      "Do geht’s no flussabwärts.",
      "Weiter, die Strömung trägt.",
    ],
    pass: [
      "Passe. Do isch mir das Wasser zu flach.",
      "Do bleib i am Ufer.",
      "Nix. Da wart i auf Hochwasser.",
    ],
    declare: [
      "Leinen los, i spiel.",
      "Ab ins Wasser damit.",
      "Des Floß fährt. I spiel.",
    ],
    trickWon: [
      "Sauber durch die Stromschnelle.",
      "Den hol i mit der Stange.",
      "Platsch, und drin isch er.",
    ],
    trickLost: [
      "Do hat’s mi auf an Felsen gsetzt.",
      "Der isch mir abgetrieben.",
      "Nass gworde. Macht nix.",
    ],
    gameWon: [
      "Glücklich in Pforzheim angelandet, {name}.",
      "Des Floß hat ghalte, {title}.",
      "Wer die Enz kennt, kennt au die Karten.",
    ],
    gameLost: [
      "Floß verkeilt. Des passiert de Beste.",
      "Untergegange, aber mit Anstand.",
      "Gut gsteuert, {name}. Respekt.",
    ],
    ramsch: [
      "Ramsch. Jetzt treibt alles durcheinander.",
      "Bloß nix auflade, sonst geht’s Floß unter.",
      "Jeder schaut, dass er trocken bleibt.",
    ],
    farewell: [
      "Ade, {name}. Die Enz fließt weiter, und mir au.",
      "I muss los, der Verein trifft sich am Wehr.",
      "Ade. Und immer a Handbreit Wasser unterm Floß.",
    ],
    kontra: [
      "Gegen den Strom, wenn’s sein muss.",
      "Do stemm i mi dagegen.",
      "Jetzt wird’s a wilde Fahrt.",
    ],
    blunder: [
      "{target}, du Seggl, du hasch mi auf den Felsen gsteuert!",
      "I zieh die Stange, und du lässt das Seil los, {target}.",
      "Heilandsack, jetzt treibt mei ganzes Floß ab.",
    ],
    robbed: [
      "Mei Ass isch abgsoffe, {target}.",
      "{target}, du Grasdackel, des war mei bester Stamm.",
      "Die Zehn isch mir übers Wehr gange.",
    ],
    selfBlame: [
      "Jakob, du Hornochs. Gegen den Strom gstakt.",
      "Die Stromschnelle hab i selber net gsehe.",
      "Nass bis zum Kragen, und selber schuld.",
    ],
    tease: [
      "{target}, do war’s Wasser wohl zu flach fürs Floß.",
      "Überreizt? Des Floß war z’ schwer beladen.",
      "Untergegange. Aber schön gschwomme, {target}.",
    ],
  },

  brenner: {
    greet: [
      "Grüß Gott, {name}. Klarer Tisch, klare Karten.",
      "So, {title}. Jetzt wird destilliert.",
      "Setz di. Die Kirschen sind gepflückt, jetzt hab i Zeit.",
    ],
    bid: [
      "I geh weiter. Langsam brennen, dann wird’s gut.",
      "Noch net abstellen, der Kessel isch noch warm.",
      "Weiter. Des Feuer brennt.",
    ],
    pass: [
      "Passe. Des Blatt isch Vorlauf, des schütt i weg.",
      "Nix. Zu trüb.",
      "Passe. Da fehlt die Frucht.",
    ],
    declare: [
      "So. Jetzt wird’s klar.",
      "Des Blatt hat Frucht. I spiel.",
      "Kessel an. I spiel.",
    ],
    trickWon: [
      "Tropfen für Tropfen.",
      "Sauber abgeschieden.",
      "Des isch das Herzstück.",
    ],
    trickLost: [
      "Der isch mir verdampft.",
      "Nachlauf. Kann man nix mache.",
      "Gut, der gehört dir. I wieg nach.",
    ],
    gameWon: [
      "Klar wie Quellwasser, {name}. Gewonnen.",
      "Sauber gebrannt, sauber gewonnen.",
      "Des stell i ins Regal, ganz nach oben, {title}.",
    ],
    gameLost: [
      "Angebrannt. Kommt in den besten Kesseln vor.",
      "Trüb geworden. Glückwunsch, {name}.",
      "Do war zu viel Wasser drin.",
    ],
    ramsch: [
      "Ramsch. Jetzt brennt jeder seine eigene Maische.",
      "Augen sind heut Fallobst. Bloß net aufheben.",
      "Wer am meisten hat, kriegt den Trester.",
    ],
    farewell: [
      "Ade, {name}. Der Kessel wartet.",
      "I muss heim, die Kirschen warten net.",
      "Ade mitnand. Schön war’s, klar und sauber.",
    ],
    kontra: [
      "Halt. Des prüf i nach wie die Probe im Glas.",
      "Do dreh i das Feuer höher.",
      "Jetzt wird’s scharf.",
    ],
    blunder: [
      "{target}, du Seggl. Do hasch mir den ganze Brand versaut.",
      "Zu früh abgestellt. Des wird trüb, {target}.",
      "Kruzifix, do hat oiner Wasser in den Kessel gschüttet.",
    ],
    robbed: [
      "Mei Ass. Des war das Herzstück, {target}.",
      "{target}, die Zehn war mei bester Tropfen.",
      "Weg isch sie, wie Dampf aus dem Kessel.",
    ],
    selfBlame: [
      "Ernst, du Halbdackel. Zu heiß gebrannt.",
      "Do hab i den Nachlauf selber net abgetrennt.",
      "Angebrannt. Und i stand daneben.",
    ],
    tease: [
      "{target}, überreizt? Do war mehr Wasser als Frucht.",
      "Des Spiel war Vorlauf. Des schüttet mr weg.",
      "{target}, des hätt noch a Weile reifen müssen.",
    ],
  },

  wasenwirt: {
    greet: [
      "Grüß Gott, {name}! Nur rein ins Zelt, Platz isch immer!",
      "Ha, der {title}! Musik, bitte, der Skat fängt an!",
      "Hock di na! Auf dem Wasen isch’s lauter, aber hier isch’s schöner!",
    ],
    bid: [
      "Weiter! Höher als’s Riesenrad!",
      "Do geht no was, des sag i dir!",
      "Mit! Und zwar laut!",
    ],
    pass: [
      "Passe! Aber nur heut!",
      "Ach, des lass i dir. I bin ja Gastgeber.",
      "Nix! Do bleib i auf der Bierbank sitzen.",
    ],
    declare: [
      "So! Tusch! I spiel!",
      "Kapelle, an Tusch! Jetzt wird gspielt!",
      "Platz da, jetzt komm i!",
    ],
    trickWon: [
      "Hau ruck!",
      "Der gehört ins Zelt!",
      "Volltreffer, wie an der Schießbude!",
    ],
    trickLost: [
      "Ha noi! Den hätt i gern ghabt!",
      "Do bin i aus der Achterbahn gflogen!",
      "Hoppla! Do war i zu laut und zu langsam!",
    ],
    gameWon: [
      "Gewonnen! Kapelle, an Tusch für mi, {name}!",
      "So, {title}! Des war Volksfest!",
      "Des Zelt kocht! Gewonnen!",
    ],
    gameLost: [
      "Heidanei, {name}! Des war a Kracher!",
      "Verloren, aber laut! Des zählt au was!",
      "Respekt! Do klatscht das ganze Zelt für dich!",
    ],
    ramsch: [
      "Ramsch! Jetzt wird’s lustig!",
      "Ramsch isch wie Autoscooter: Jeder kriegt was ab!",
      "Bloß net die meisten Augen, sonst zahlt der Wirt!",
    ],
    farewell: [
      "Ade, {name}! Im Herbst auf dem Wasen, gell!",
      "I muss, des Zelt baut sich net von allein auf!",
      "Ade mitnand! Und net so leise, wenn ihr geht!",
    ],
    kontra: [
      "Ha! Do halt i jetzt dagegen, und zwar laut!",
      "Musik aus! Jetzt wird’s ernst!",
      "Des zählt jetzt doppelt so laut!",
    ],
    blunder: [
      "{target}, du Granateseggl! Des hört man bis zum Riesenrad!",
      "Kapelle aus! Do hat mir oiner den Stich versaut, {target}!",
      "Heidanei! Des isch, wie wenn oiner im Festzelt die Musik abstellt!",
    ],
    robbed: [
      "Mei Ass! Gstohle wie a Lebkuchenherz an der Bude, {target}!",
      "{target}, du Hornochs! Des war mei Zehn!",
      "Hoi! Des war der Hauptgewinn, und du nimmsch’n mit!",
    ],
    selfBlame: [
      "Kurt, du Allmachtsdackel! Zu laut und zu dumm!",
      "Do bin i selber aus der Achterbahn gfalle! Sapperlot!",
      "I Seggl! Do hätt i besser Brezeln verkauft als gereizt!",
    ],
    tease: [
      "{target}, Tusch! Überreizt, und des ganze Zelt hat’s gsehe!",
      "Do isch oiner aus’m Kettenkarussell gflogen!",
      "Volksfest isch Volksfest, aber des war Geisterbahn, {target}!",
    ],
  },

  schaffnerin: {
    greet: [
      "Grüß Gott, {name}. Fahrscheine bitte. Nein, war a Witz. Hock di na.",
      "So, {title}. Bei mir fährt keiner schwarz, auch beim Skat net.",
      "Dreißig Jahre Straßenbahn. Da erschreckt mich kein Blatt mehr.",
    ],
    bid: [
      "Ich fahr noch eine Haltestelle weiter.",
      "Weiter, nächste Station.",
      "Bitte nachrücken, ich geh mit.",
    ],
    pass: [
      "Passe. Hier steig ich aus.",
      "Zurückbleiben, bitte. Ohne mich.",
      "Nix. Da wart ich auf die nächste Bahn.",
    ],
    declare: [
      "Einsteigen, ich spiel.",
      "Türen schließen. Ich spiel.",
      "Abfahrt. Und keiner fährt schwarz.",
    ],
    trickWon: [
      "Geknipst.",
      "Der hatte keinen Fahrschein.",
      "Nachgelöst und einkassiert.",
    ],
    trickLost: [
      "Der ist mir durch die hintere Tür.",
      "Gut, den lass ich fahren.",
      "Hoppla, falsche Linie.",
    ],
    gameWon: [
      "Endstation, {name}. Alles aussteigen.",
      "Gewonnen. Das hab ich im Fahrplan stehen gehabt.",
      "So, {title}. Das gibt ein Loch in die Liste.",
    ],
    gameLost: [
      "Da bin ich schwarzgefahren und erwischt worden.",
      "Gut gemacht, {name}. Da hätt ich selbst nachgezählt.",
      "Verloren. Die Linie fährt halt manchmal Umleitung.",
    ],
    ramsch: [
      "Ramsch. Bitte alle nach hinten durchgehen.",
      "Jetzt ist die Bahn voll, und keiner will stehen.",
      "Wer am meisten hat, zahlt nach.",
    ],
    farewell: [
      "Ade, {name}. Und immer mit gültigem Fahrschein.",
      "Ich muss, meine Bahn kommt.",
      "Ade mitnand. Bitte zurückbleiben.",
    ],
    kontra: [
      "Moment. Den Fahrschein will ich sehen.",
      "Halt, da zahlt einer doppelt.",
      "So nicht. Da wird nachgelöst.",
    ],
    blunder: [
      "{target}, du Seggl. Ich halt die Tür auf, und du fährst einfach weiter.",
      "Falsche Linie. Und ich steh an der Haltestelle, {target}.",
      "Das war eine Notbremsung ohne Not. Bitte nicht wiederholen.",
    ],
    robbed: [
      "Mein Ass. Ohne Fahrschein mitgenommen, {target}.",
      "{target}, du Schwarzfahrer. Das war meine Zehn.",
      "Die Zehn ist mir aus der Bahn gefallen.",
    ],
    selfBlame: [
      "Inge, du Dubbel. Falsch umgestiegen.",
      "Dreißig Jahre im Dienst, und dann so ein Fehler.",
      "Da hab ich mich selber geknipst.",
    ],
    tease: [
      "{target}, überreizt? Das kostet erhöhtes Beförderungsentgelt.",
      "Endstation. Bitte alles aussteigen, auch die Hoffnung.",
      "{target}, da bist du wohl in die falsche Linie gestiegen.",
    ],
  },

  // ── Nebenfiguren ──
  wachtmeister: {
    greet: [
      "Grüß Gott, {name}. Allgemeine Verkehrskontrolle. Nein, Spaß. Wer gibt?",
      "So, Herr {title}. Die Mütze liegt neben den Karten, i bin außer Dienst.",
      "Papiere brauch i heut keine. Bloß an Dritten für den Skat.",
    ],
    bid: [
      "Des nehm i zu Protokoll. Weiter.",
      "I geh mit. Ordnungsgemäß.",
      "Weiter, do bin i noch unter der erlaubten Geschwindigkeit.",
    ],
    pass: [
      "Passe. Des isch mir zu schnell.",
      "Do heb i die Kelle. Passe.",
      "Nix. I bleib bei der Vorschrift.",
    ],
    declare: [
      "Amtlich: I spiel.",
      "Alles nach Vorschrift: I spiel.",
      "Bitte rechts ranfahren, i spiel.",
    ],
    trickWon: [
      "Des notier i.",
      "Sichergestellt.",
      "Beschlagnahmt.",
    ],
    trickLost: [
      "Den lass i mit einer Verwarnung laufen.",
      "Do war i im toten Winkel.",
      "Den lass i laufen. Der hat ja koin Führerschein.",
    ],
    gameWon: [
      "Gewonnen, {name}. Des kommt ins Protokoll.",
      "Fall abgeschlossen.",
      "So, Herr {title}. Do gibt’s nix zu beanstanden.",
    ],
    gameLost: [
      "Verloren. Do muss i mich selber verwarnen.",
      "Respekt, {name}. Des war a sauberer Führerschein.",
      "Heidanei. Des war a Unfall mit Ansage.",
    ],
    ramsch: [
      "Ramsch. Jetzt isch Stau auf allen Spuren.",
      "Ramsch. Do will keiner der Schuldige sein.",
      "Ramsch. Do will i koine Augenzeugen.",
    ],
    order: [
      "Fräulein, an Sprudel bitte. I bin im Dienst.",
      "An Kaffee, schwarz wie die Nacht auf Streife.",
      "A Brezel, bitte. Nach Feierabend lauf i eh heim.",
    ],
    farewell: [
      "Ade, {name}. Und fahr vorsichtig, gell.",
      "I muss, die Streife wartet net.",
      "Ade mitnand. Ihr habt nix gsehn.",
    ],
    kontra: [
      "Halt, Polizei. Des schau i mir genauer an.",
      "Des gibt a Anzeige. Doppelt.",
      "Do erheb i Einspruch.",
    ],
    blunder: [
      "{target}, des notier i: saublöder Grasdackel. Amtlich.",
      "Des war grob fahrlässig, {target}.",
      "Do gibt’s a Verwarnung. Für den Seggl, der des gspielt hat.",
    ],
    robbed: [
      "{target}, mei Ass isch entwendet. Des isch Diebstahl.",
      "Die Zehn hätt i gern sichergestellt, {target}.",
      "Do fehlt a Zehn im Protokoll.",
    ],
    selfBlame: [
      "Hägele, du Halbdackel. Des war a Rotlichtverstoß.",
      "Do muss i mi selber aufschreibe.",
      "Falsch abgebogen. I, der Wachtmeister. Kruzifix.",
    ],
    tease: [
      "{target}, überreizt. Des macht a Bußgeld von fünfzig Punkt.",
      "Zu schnell in die Kurve. Des hab i gmessen, {target}.",
      "Führerschein, bitte. Der Reizwert war net erlaubt.",
    ],
  },

  anwaerter: {
    greet: [
      "Grüß Gott, {name}! Der Herr Hägele hat gsagt, i darf mitspielen.",
      "Hallo, {title}. Darf i mich hinsetzen? Also, dienstlich jetzt net.",
      "I hab mei Notizbuch dabei. Für die Regeln.",
    ],
    bid: [
      "Weiter? Ja, weiter. Glaub i.",
      "Herr Hägele, darf i do noch mit? Gut, i geh mit.",
      "I sag mal ja. Vorsichtshalber.",
    ],
    pass: [
      "Passe. Des hab i so gelernt.",
      "Äh, passe. Oder? Ja, passe.",
      "Passe. Der Herr Hägele sagt, i soll mi aus allem raushalte. Au aus dem Spiel.",
    ],
    declare: [
      "I spiel! Also, wenn des geht.",
      "So, jetzt. I trau mich.",
      "Des steht so im Notizbuch: spielen.",
    ],
    trickWon: [
      "Oh! Der gehört mir?",
      "Des schreib i auf!",
      "Hab i des richtig gmacht?",
    ],
    trickLost: [
      "Ach so. Des hab i übersehen.",
      "Moment, des muss i nachlesen.",
      "Ui. Den hätt i net legen sollen.",
    ],
    gameWon: [
      "Gewonnen! Herr Hägele, haben Sie’s gsehen?",
      "Des erzähl i auf der Wache, {name}!",
      "Des kommt in mei Notizbuch, ganz groß, {title}!",
    ],
    gameLost: [
      "Oh. Des war wohl nix.",
      "Gut gspielt, {name}. Des muss i noch üben.",
      "Des schreib i mir auf. Rot unterstrichen.",
    ],
    ramsch: [
      "Ramsch? I hab denkt, des isch des, was der Flohmarkt verkauft.",
      "Jungfrau bleiben, des isch gut, oder?",
      "Herr Hägele, beim Ramsch will man doch nix, gell?",
    ],
    order: [
      "An Spezi, bitte. Mit Strohhalm, wenn’s geht.",
      "Für mi a Spezi und a Brezel. I bin noch im Wachstum.",
      "Nur an Sprudel. Mir sind im Dienst. Also, fast.",
    ],
    farewell: [
      "Ade, {name}! Und Licht an, wenn’s dunkel wird!",
      "I muss, der Herr Hägele fährt.",
      "Wiederschaun! Darf i des nächste Mal wieder mit?",
    ],
    kontra: [
      "Darf i des? Dann mach i des jetzt. Doppelt!",
      "Des hab i im Lehrgang gelernt: dagegenhalten.",
      "Herr Hägele, i trau mich!",
    ],
    blunder: [
      "{target}, du … Seggl? Darf i des sage? Des steht net im Lehrgang.",
      "Des war jetzt aber net nach Vorschrift, {target}.",
      "Herr Hägele, Stich versaut! Isch des a Delikt?",
    ],
    robbed: [
      "Mei Ass! Des schreib i auf, {target}.",
      "{target}, des war mei Zehn. Glaub i. Ja.",
      "Oh. Des war mei oinzigs Ass.",
    ],
    selfBlame: [
      "I Simpel. Des steht doch im Notizbuch.",
      "Falsche Karte. Herr Hägele, i hab gschlampt.",
      "Des schreib i mir auf: net so a Dackel sei.",
    ],
    tease: [
      "{target}, überreizt? Des darf mr net, oder?",
      "{target}, des notier i. Zum Lernen, gell.",
      "Herr Hägele, isch Überreizen a Ordnungswidrigkeit?",
    ],
  },

  "biker-manne": {
    greet: [
      "Grüß di, {name}! Hock di na, die Maschinen stehen draußen auf der Wiese.",
      "Na, {title}? Heut wird Vollgas gspielt!",
      "Gugg, des Zelt steht, die Karten liegen. Was will mr mehr?",
    ],
    bid: [
      "Weiter! Gas geben!",
      "Do schalt i no an Gang hoch.",
      "RÖÖÖHR! I bin dabei!",
    ],
    pass: [
      "Passe. Do geht mir der Sprit aus.",
      "Kupplung, Leerlauf. Passe.",
      "Nix. Do hab i an Platten.",
    ],
    declare: [
      "Kickstarter, und los! I spiel!",
      "Vollgas durch die Kurve! I spiel!",
      "Zündung an. Jetzt spiel i.",
    ],
    trickWon: [
      "Wie auf der Schwarzwaldhochstraße!",
      "Mit dem Knie am Asphalt!",
      "Den hab i überholt!",
    ],
    trickLost: [
      "Ausgerutscht. Rollsplitt.",
      "Zündkerze verrußt.",
      "Do hat mi einer rechts überholt.",
    ],
    gameWon: [
      "Erster an der Ampel, {name}!",
      "Des war a Ritt, {title}!",
      "Vollgas und gewonnen!",
    ],
    gameLost: [
      "Abgsoffe, der Motor.",
      "Verloren. Morgen schraub i dran.",
      "Respekt, {name}. Du fährst die Ideallinie.",
    ],
    ramsch: [
      "Ramsch! Alle in die Kiesgrube!",
      "Jetzt wird’s a Schlammrennen.",
      "Bloß net die meisten Augen, sonst schieb i heim.",
    ],
    order: [
      "A Halbe, bitte. Die Maschine schläft heut neben dem Zelt.",
      "An Kaffee, stark wie a Zweizylinder.",
      "Zwei Leberkäswecken. Fahrtwind macht Hunger.",
    ],
    farewell: [
      "Ade, {name}! Immer a Hand an der Bremse!",
      "I geh ins Zelt. Morgen früh wird angelassen.",
      "Ade mitnand! Und immer zwei Räder auf der Straße!",
    ],
    kontra: [
      "Do geb i Gegengas!",
      "Jetzt wird’s a Rennen!",
      "Des fahr mer jetzt mit doppelter Drehzahl!",
    ],
    blunder: [
      "{target}, du Granateseggl! Du hasch mi in der Kurve abgedrängt!",
      "I geb Gas, und du ziehsch die Bremse, {target}!",
      "Heilandsack, des isch, wie wenn oiner die Kette abwirft!",
    ],
    robbed: [
      "Mei Ass! Gstohle wie a Helm vom Lenker, {target}!",
      "{target}, du Rindvieh, des war mei Zehn!",
      "Do isch mir die Zehn vom Gepäckträger gfalle.",
    ],
    selfBlame: [
      "Manne, du Seggl! Zu früh hochgschaltet!",
      "Abgsoffe. Selber schuld, Choke vergesse.",
      "I Hornochs, do bin i in die Kiesgrube gfahre.",
    ],
    tease: [
      "{target}, überreizt? Do war der Tank wohl leer!",
      "{target}, des war a Abflug über den Lenker!",
      "Do hat oiner viel Gas gebe und wenig Hirn.",
    ],
  },

  "biker-uschi": {
    greet: [
      "Tag, {name}. Gib.",
      "Hock di. Manne mischt eh zu langsam.",
      "Na, {title}. Schön. Fangen wir an.",
    ],
    bid: [
      "Mit. Ohne Bremse.",
      "Weiter. Ich hab Zeit.",
      "Noch drin, Manne.",
    ],
    pass: [
      "Passe. Kurz und schmerzlos.",
      "Nö.",
      "Lass ich.",
    ],
    declare: [
      "Ich spiel. Halt dich fest.",
      "Mein Spiel.",
      "Ich fahr vorneweg.",
    ],
    trickWon: [
      "Danke.",
      "Meins.",
      "Sauber eingelenkt.",
    ],
    trickLost: [
      "Hm.",
      "Gönn ich dir.",
      "Nächste Kurve.",
    ],
    gameWon: [
      "Gewonnen. Wie immer, Manne.",
      "Danke, {name}. War nett.",
      "So fährt man, {title}.",
    ],
    gameLost: [
      "Gut gemacht, {name}. Selten.",
      "Verloren. Passiert mir einmal im Jahr.",
      "Respekt. Nächstes Mal nicht.",
    ],
    ramsch: [
      "Ramsch. Ich bleib sauber.",
      "Ramsch. Viel Spaß, Manne.",
      "Jungfrau? Gern.",
    ],
    order: [
      "Kaffee. Schwarz.",
      "Spezi. Ich fahr morgen früh.",
      "Eine Brezel. Danke.",
    ],
    farewell: [
      "Ade, {name}. Gute Fahrt.",
      "Ich geh ins Zelt. Nacht.",
      "Bis zum nächsten Treff.",
    ],
    kontra: [
      "Nö. Doppelt.",
      "Glaub ich nicht.",
      "Dann zeig mal.",
    ],
    blunder: [
      "{target}, Seggl. Ehrlich.",
      "Danke für nix, {target}.",
      "Toll. Wirklich toll.",
    ],
    robbed: [
      "Mein Ass. Merk ich mir, {target}.",
      "{target}, du Dackel.",
      "Zehn weg. Hm.",
    ],
    selfBlame: [
      "Uschi, du Bachel.",
      "Selber schuld. Falsch eingelenkt.",
      "Mist. Mein Fehler.",
    ],
    tease: [
      "Überreizt. Gratuliere, {target}.",
      "{target}, schieb heim.",
      "Abgeflogen. Schön anzuschauen.",
    ],
  },

  meister: {
    greet: [
      "Grüß Gott, {name}. Hände gewaschen? Brauchst net, Öl isch sauberer Dreck.",
      "So, {title}. Bei mir isch der Tisch die Hebebühne.",
      "Hock di na. Die Werkstatt isch zu, der Skat isch auf.",
    ],
    bid: [
      "Do isch noch Luft drin, wie im Reifen.",
      "Weiter. Des Drehmoment stimmt.",
      "Mit. Die Dichtung hält.",
    ],
    pass: [
      "Passe. Des Teil bestell i erst.",
      "Do lass i die Finger davon, des isch Elektrik.",
      "Nix. Die Kupplung schleift.",
    ],
    declare: [
      "So. Jetzt wird gschraubt.",
      "Werkzeug raus, i spiel.",
      "Des krieg mer hin. Der Bernd hat’s ja noch net angfasst. I spiel.",
    ],
    trickWon: [
      "Sitzt, passt, wackelt und hat Luft.",
      "Festgezogen.",
      "Mit Gefühl, net mit Gewalt.",
    ],
    trickLost: [
      "Des g’hört so.",
      "Do fehlt a Unterlegscheibe.",
      "Abgerutscht, der Schlüssel.",
    ],
    gameWon: [
      "Repariert, {name}. Macht drei Mark fuffzig.",
      "So, {title}. Läuft wie a Uhr.",
      "Gewonnen. Und koi Schraube übrig.",
    ],
    gameLost: [
      "Verloren. Des g’hört so, des isch Verschleiß.",
      "Do hast du sauber gschraubt, {name}.",
      "Totalschaden. Kommt vor.",
    ],
    ramsch: [
      "Ramsch. Des isch wie die Kiste mit de alte Schrauben.",
      "Jeder kriegt was ab, wie beim Ölwechsel.",
      "Ramsch. Do wird ausgeschlachtet.",
    ],
    order: [
      "A Halbe, Feierabend isch Feierabend. I wohn überm Laden.",
      "An Kaffee, und an Lappen für die Finger.",
      "A Vesper mit Rettich, bitte.",
    ],
    farewell: [
      "Ade, {name}. Und wenn’s klappert: vorbeikommen.",
      "I muss, morgen früh kommt a Traktor.",
      "Ade mitnand. Werkstatt auf um sieben.",
    ],
    kontra: [
      "Moment, des muss i nachmessen.",
      "Do zieh i nach, mit doppeltem Drehmoment.",
      "Des Teil kommt nochmal auf die Bühne.",
    ],
    blunder: [
      "{target}, du Seggl! Do hasch mir den Gewindegang versaut.",
      "Do hat oiner mit dem Hammer gschraubt, {target}.",
      "Kruzifix. Des war Pfusch am Bau. Aber gut, des g’hört so.",
    ],
    robbed: [
      "Mei Ass! Abgschraubt, {target}.",
      "{target}, die Zehn war a Originalteil!",
      "Weg isch sie, die Zehn. Wie die Achter-Nuss beim Bernd.",
    ],
    selfBlame: [
      "Kächele, du Halbdackel. Linksgewinde.",
      "Do hab i selber überdreht. Des g’hört so. Noi, eigentlich net.",
      "Falsch gschraubt. Sag’s bloß net dem Bernd.",
    ],
    tease: [
      "{target}, überreizt? Do war zu viel Drehmoment drauf.",
      "Totalschaden. Aber reparabel, {target}.",
      "Des Spiel kommt auf die Hebebühne. Do muss i drunter gucke.",
    ],
  },

  lehrling: {
    greet: [
      "Hallo, {name}! I hab mir extra die Hände gewaschen. Fast.",
      "Grüß Gott, {title}. Der Meister sagt, i soll zuschauen und lernen.",
      "Hallo! Ups, der Stuhl wackelt. Des war scho so!",
    ],
    bid: [
      "Weiter! Oder? Ja, weiter!",
      "I geh mit. Der Meister sagt, mutig sein.",
      "Do schraub i no eins hoch.",
    ],
    pass: [
      "Passe. Bevor i was kaputt mach.",
      "Lieber net. Passe.",
      "Ups. Passe.",
    ],
    declare: [
      "I spiel! Hoffentlich hält’s.",
      "Werkzeug, äh, Karten raus! I spiel!",
      "Jetzt aber! I spiel!",
    ],
    trickWon: [
      "Oh, der hält ja!",
      "Meister! Hast des gsehen?",
      "ZACK! Meiner!",
    ],
    trickLost: [
      "KRACH. Des war scho so!",
      "Ups. Abgerutscht.",
      "SCHEPPER. Des isch abgfalle.",
    ],
    gameWon: [
      "Gewonnen! Des glaubt mir in der Berufsschule keiner!",
      "Danke, {name}! I bin jetzt fast Geselle!",
      "Meister, i hab was richtig gmacht!",
    ],
    gameLost: [
      "Meister, des war scho so, als i’s gekriegt hab!",
      "Verloren. Aber nix kaputt, {name}!",
      "Des lern i noch, {title}. Wie den Ölwechsel.",
    ],
    ramsch: [
      "Ramsch? Endlich was, wo i nix gewinnen muss!",
      "I sammel nix ein, versprochen!",
      "Ramsch? Des sagt der Meister zu allem, was i aus der Schublad zieh.",
    ],
    order: [
      "An Spezi, bitte! Und a Brezel, i hab Hunger.",
      "An Kakao? Gibt’s des? Dann an Spezi.",
      "A Leberkäswecken, der Meister zahlt!",
    ],
    farewell: [
      "Ade, {name}! I muss morgen früh die Werkstatt fegen.",
      "Tschüss! Und wenn was klappert, i war’s net!",
      "Ade! Der Meister sagt, i soll heim, bevor i was anstell.",
    ],
    kontra: [
      "I trau mich! Doppelt!",
      "Des lass i net so! Dagegen!",
      "Do schraub i jetzt dagegen!",
    ],
    blunder: [
      "{target}, du … Seggl! Ups. Des sagt der Meister immer.",
      "{target}, jetzt hasch du was kaputt gmacht. Ausnahmsweise net i.",
      "Meister, der hat mir den Stich verbogen!",
    ],
    robbed: [
      "Mei Ass! Des hab i doch grad erst poliert, {target}.",
      "{target}, des war mei Zehn! Die oinzige!",
      "Weg. Wie mei Schraubenzieher letzte Woch.",
    ],
    selfBlame: [
      "Bernd, du Granateseggl. Des war scho so. Noi, des war i.",
      "I Dackel. Falsche Karte, falsche Nuss, falsch alles.",
      "Ups. Des hab i kaputt gmacht. Des Spiel.",
    ],
    tease: [
      "{target}, überreizt? Des passiert mir au dauernd!",
      "{target}, des g’hört so. Sagt der Meister.",
      "Endlich hat mal en andrer was kaputt gmacht!",
    ],
  },
};
