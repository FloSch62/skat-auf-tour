// The 40 event images (contract §9: public/art/events/<id>.png, 256×128 comic panel, drawn 3×). Every event names one
// of these as `art`; several events share an image. docs/art-requests.md lists them with the events that use them.
// Motifs follow contract §0.8: no real people, no brands, no lettering on signs.

export const EVENT_ART = {
  "road-enz": "Landstraße an einer Enzschleife, Weinberge am Hang, das cremefarbene Wohnmobil fährt nach rechts",
  vineyard: "Steillagen-Weinberg mit Trockenmauern über der Enz bei Roßwag, ein Wengerter mit Rückentrage",
  besen: "Besenwirtschaft: ein Reisigbesen über der Haustür, Holzbänke, Viertele im Henkelglas, Lampen im Hof",
  cellar: "Gewölbekeller mit Holzfässern, aus einem Fass schießt ein Strahl Most, ein Mann hält den Daumen drauf",
  "village-square": "Dorfplatz mit Fachwerkhäusern, Brunnen und Rathaus, Tauben, das Wohnmobil parkt am Rand",
  hocketse: "Hocketse: Bierbänke unter Lampions, Blechkuchen, Musiker mit Akkordeon, ein Kartentisch mit leerem Stuhl",
  "pitch-evening": "Stellplatz am Abend: Wohnmobil mit Markise, zwei Campingstühle, Laterne, Grillen im Gras",
  "pitch-rain": "Regen prasselt aufs Wohnmobil, Blick von innen: Kaffeetasse, eine aufgeschlagene Zeitung, beschlagene Scheibe",
  kehrwoche: "Kehrwoche am Stellplatz: eine Frau in Kittelschürze mit Reisigbesen zeigt streng auf ein Laubhäufchen",
  "traffic-jam": "Stau auf der Landstraße in der Sonne, Autos der Siebziger, ein gelbes Umleitungsschild ohne Schrift",
  sheep: "Schafherde quer über der Straße, Schäfer mit Hut und Stab, das Wohnmobil wartet mit laufendem Motor",
  police: "Zwei Dorfpolizisten in grünen Uniformen mit Kelle am grün-weißen Streifenwagen, das Wohnmobil hält am Rand",
  rathaus: "Fachwerk-Rathaus mit Freitreppe: oben ein eitler Schultes mit Amtskette und erhobenem Zeigefinger, daneben sein Amtsbote mit Aktenmappe und unbewegter Miene",
  exhaust: "Dorfwerkstatt: dem Lehrling fällt der Auspuff vom Motorrad vor die Füße, der Meister zuckt mit den Schultern",
  "petrol-station": "Kleine Dorftankstelle mit zwei Zapfsäulen, Ölkanistern und einem Tankwart im Kittel, am Rand lehnen drei Mofas",
  "bike-curves": "Ein Motorrad der Siebziger legt sich in eine Waldkurve, Fahrer mit Jethelm und Lederjacke",
  "bike-meet": "Motorradtreff auf einer Wiese: Maschinen in einer Reihe, Zelte, Lagerfeuer, ein Kartentisch auf einer Kiste",
  "bike-roadside": "Motorrad am Straßenrand mit offener Werkzeugrolle, der Fahrer kniet daneben, ein Bussard schaut zu",
  "phone-booth": "Gelbe Telefonzelle am Dorfrand im Abendlicht, ein Mann mit Hörer am Ohr, Groschen in der Hand",
  "hungary-road": "Pappelallee in der Puszta, ein Ziehbrunnen, das Wohnmobil auf langer gerader Straße",
  shelter: "Tierheim mit Zwingern, im letzten schaut ein großer grauer Irischer Wolfshund ruhig durch das Gitter",
  "dog-meadow": "Hundewiese am Waldrand: Hunde toben, ein Ball fliegt, Besitzer mit Leinen in der Hand",
  "dog-thief": "Ein Hund rennt mit einer Wurstkette im Maul davon, ein Metzger mit Schürze rennt hinterher",
  visit: "Ein Auto hält am Stellplatz, ein Riesenschnauzer springt heraus, auf dem Beifahrersitz ein Vesperkorb",
  hitchhiker: "Tramper mit Rucksack am Straßenrand, unter dem Arm ein klappbares Schachbrett, Daumen raus",
  kiosk: "Kiosk mit Zeitungsständer und Bonbongläsern, die Rätselseite des Lokalblatts liegt aufgeschlagen",
  "inn-stube": "Wirtsstube: Stammtisch mit Schild ohne Schrift, Karten, Gläser, Kachelofen, ein Wimpel",
  "van-breakdown": "Das Wohnmobil am Straßenrand mit offener Motorhaube, Dampf steigt auf, Warndreieck",
  monastery: "Kloster Maulbronn: Kreuzgang mit Brunnenhaus, Mauern aus Sandstein, ein Wirt in Schürze",
  railway: "Bahnknoten Mühlacker: Gleise, ein Stellwerk, ein langer Güterzug, eine Schranke ist unten",
  orchard: "Streuobstwiese am Stromberg: Apfelbäume, Leiter, Körbe voll Äpfel, ein Mostkrug im Gras",
  "forest-road": "Schwarzwaldstraße in Serpentinen, dunkle Tannen, Nebel im Tal, das Wohnmobil klein im Bild",
  distillery: "Brennerei: glänzender Kupferkessel, Körbe mit Kirschen, kleine Gläser auf einem Holzbrett",
  raft: "Ein Holzfloß auf der Enz zwischen Tannen, Flößer mit langen Stangen, Wasser spritzt",
  spa: "Kurpark Bad Wildbad: Kurhaus, Musikpavillon, Kurgäste mit Stock und Hut, die Enz plätschert",
  wasen: "Volksfest auf dem Cannstatter Wasen: Festzelt, Riesenrad, Lebkuchenherzen ohne Schrift, Lichter",
  staeffele: "Stuttgarter Stäffele: steile Treppen zwischen Häusern, das Wohnmobil steht ratlos unten",
  city: "Stuttgarter Straßenkreuzung: gelbe Straßenbahn, Hochhäuser, das Wohnmobil eingekeilt zwischen Autos",
  "factory-gate": "Werkstor mit Pförtnerhäuschen, Schichtwechsel, Fahrräder und Henkelmänner, Fabrikhallen",
  "flea-market": "Flohmarkt: Tapeziertische mit Kram, ein Händler mit Schiebermütze hält eine alte Uhr hoch",
} as const;

export type EventArtId = keyof typeof EVENT_ART;
export const EVENT_ART_IDS = Object.keys(EVENT_ART) as EventArtId[];
