# SKAT AUF TOUR — Die Enztal-Tour · Design- und Produktionsplan

Ein Roguelike mit Landkarte für einen Skatspieler: mit dem Wohnmobil durchs Enztal, von Wirtshaus zu Wirtshaus,
Skat als Hauptsache, Schach und Sudoku als Abwechslung. Dieses Dokument ist die gemeinsame Grundlage für alle
Arbeitsbereiche (Code, Art, Audio, Text), so wie `docs/contract.md` es bei TIME TO LIVE war. Wo etwas offen bleibt:
wählen, was für einen fast Siebzigjährigen ohne Spielerfahrung klarer und angenehmer ist, die Entscheidung im
eigenen Arbeitsbereich notieren und weitermachen.

- **Arbeitstitel:** SKAT AUF TOUR, Untertitel *Die Enztal-Tour* (der Untertitel kommt aus dem Ortspaket).
- **Projektordner (neu anzulegen):** `/home/clab/projects/games/skat-auf-tour`. Dieser Plan zieht dann nach
  `docs/contract.md` um.
- **Technik-Vorbild (nur lesen):** `/home/clab/projects/clab/time-to-live` (im Folgenden **TTL**). Übernommen werden
  Gerüst, Werkzeuge und Arbeitsweise, nicht Inhalte oder Art.
- **Herkunft der Idee:** `skat-tour-ideen.html`, Idee A. Bierdeckel und Turnierliste stammen aus Idee B, die
  Aufgaben und Ortsstempel aus Idee C.

---

## 0. Feste Regeln (alle Arbeitsbereiche)

1. **Technik wie TTL.** Vite 7, TypeScript 5.9 (strict, ES-Module), Node ≥ 24, keine Laufzeit-Abhängigkeiten.
   Ein `<canvas>`, Layout in **960×540 Einheiten**, Backing 1920×1080 (`HD = 2`). `src/core/*` wird aus TTL
   übernommen (gleicher Autor, GPLv3) und angepasst: Palette, Schriften, Cursor.
2. **Kein Browser-Look.** Keine DOM-Knöpfe, Eingabefelder, Scrollbalken, nativen Tooltips oder Systemschriften.
   Aller Text in gebündelten Bitmap-Schriften. Der Ladebildschirm wird im Canvas gezeichnet.
3. **Ehrliches Skat.** Gespielt wird nach der Internationalen Skatordnung (ISkO). Jede Abweichung ist eine benannte
   Hausregel und steht vor der Runde auf dem Bildschirm. **Die Karten werden nie manipuliert:** Jedes Blatt kommt
   aus dem Zufallsgenerator mit Startwert, der Computer sieht keine verdeckten Karten, Schwierigkeit entsteht nur
   aus Denktiefe und Charakter der Gegner. Der Startwert jedes Spiels steht in der Liste.
4. **Für jemanden ohne Spielerfahrung.** Alles geht mit Linksklick. Kein Ziehen, kein Doppelklick, kein
   Rechtsklick, kein Mausrad, keine Tastatur nötig. Nirgends Zeitdruck. Eine Entscheidung pro Bildschirm. Über der
   Hand steht immer ein Satz „Was jetzt?“. Skat-Wörter statt Spiele-Wörter: Augen, Stich, Trumpf, Liste. Auch der
   Name am Anfang lässt sich per Klick auf Buchstaben eingeben.
5. **Lesbarkeit.** Fließtext in der Schrift `head` (Jersey 15, Zeile 24), Überschriften `big`, nichts Lesepflichtiges
   kleiner als `body` (Jersey 10). `small` und `label` nur für Dekor. Handkarten mindestens 72×108 Einheiten,
   Klickflächen mindestens 44×32. Geprüft bei 1366×768 und 1920×1080.
6. **Optik.** Ein schwäbischer Comic in der Ästhetik klassischer Adventures wie „Baphomets Fluch“ (1996):
   gemalte Hintergründe mit Tuschekontur, Figuren als flächig kolorierter Zeichentrick mit schwarzer Kontur.
   **Entschieden (Stilstudie, 4. Oktober): Kulisse im Adventure-Stil, Figuren im Comic-Stil, alles Gemalte in voller
   Auflösung und weich skaliert, nicht im Pixelraster** (§9). Baphomets Fluch ist Vorbild für die Anmutung,
   übernommen wird nichts. Keine gedrehten Sprites außer Karten im Stich. Karten, Schrift und Bedienung bleiben
   scharf, Lesbarkeit geht vor.
   Leitpalette in §10.
7. **GPU-Regel.** Krea 2, YuE2 und Stable Audio laufen nie gleichzeitig. Jeder GPU-Auftrag läuft unter
   `flock /home/clab/projects/clab/faultline/.work/locks/gpu.lock <befehl>`, höchstens etwa 20 Minuten am Stück.
   ComfyUI startet und stoppt innerhalb eines Halts. RAM-Grenze 15 GiB über die systemd-Einheiten wie bei TTL.
   Krea-Render höchstens 2560×1440, höchstens 2 Kandidaten pro Motiv.
8. **Wenig Persönliches.** Alles Persönliche steht in `profile.json` und im Ortspaket (§8). Code, Art und Texte
   funktionieren mit dem neutralen Standardprofil. Bilder zeigen keine echten Personen, keine Marken, keine Schrift.
9. **Ton.** Derb, trocken und herzlich: der Humor von „Werner – Beinhart!“, ins Schwäbische verlegt. Schrauber-
   und Stammtischwitz, Lautmalerei, Meister und Lehrling, Pannen mit Ansage (§2). Werner ist nur das Vorbild für
   den Ton: keine Figuren, Namen, Sprüche oder Zeichnungen daraus, alles ist selbst erfunden und selbst formuliert.
   **Dazu (Wunsch vom 4. Oktober) der trockene Humor von „Hannes und der Bürgermeister“:** Wortwitz,
   Missverständnisse, der Wichtigtuer und der Bauernschlaue, der ihn immer austrickst. Auch hier nur der Ton:
   keine Figuren, Namen oder Sprüche aus der Serie. Unser eigenes Duo sind der eitle Schultes und sein Amtsbote
   (§4.5). **Am Tisch wird geschimpft wie am echten Stammtisch:** Versaut einer dem anderen den Stich, heißt es
   „Du Seggl!“, „Du Granateseggl!“ oder „Du bisch en saublöder Grasdackel!“, und wer sich selbst verzockt, schimpft
   sich selber. Das ist liebevoll gemeint und trifft jeden einmal, auch den Spieler. Gelacht wird miteinander,
   niemand wird fertiggemacht. Figuren dürfen kernig überzeichnet sein, die Welt bleibt glaubwürdig. **Trinken ist ein leiser Witz, keine Spielmechanik.** Eine Halbe, ein Weizen, das Viertele und der
   Most gehören zur Kulisse und zu den Sprüchen, aber nichts im Spiel hängt davon ab, wer was trinkt, und wer fährt,
   ist trocken. Trinken macht nie die Bedienung schwerer: keine wackelnden Karten, keine verschwommene Schrift.
10. **Sprache.** Alles Sichtbare auf Deutsch mit den Begriffen der Skatordnung. Code, ids und Dateinamen englisch.
11. **Zuständigkeiten.** Jeder Arbeitsbereich schreibt nur in seine Ordner (§13). Wünsche an andere Bereiche
    stehen in `docs/requests/<bereich>.md`. Gemeinsame Typen in `src/game/types.ts` und `ids.ts` gehören dem Lead.
12. **Herkunft.** Jedes erzeugte Bild, Musikstück und Geräusch behält Prompt, Seed, Modell und Einstellungen in
    einem Manifest neben der Quelle. Kandidaten und Ausschuss bleiben außerhalb von `public/`.
13. **Alpha heißt vollständig.** Eine ganze Tour vom Küchentisch bis zum Pokal ohne Entwicklerwerkzeuge,
    Speichern und Fortsetzen, Einstellungen, Hilfe, Credits. Kein Platzhaltertext.

---

## 1. Das Spiel in Kürze

Er sitzt daheim am Küchentisch, das Tourenbuch liegt offen, draußen steht das Wohnmobil mit dem
Motorrad auf dem Heckträger. Eine Tour führt durch
drei Regionen. Jede Region ist eine Karte mit Abzweigungen, gezeichnet wie ein alter Autoatlas. An jeder Station
passiert genau eine Sache: eine Runde Skat im Wirtshaus, eine Aufgabe am Stammtisch, ein Schachbrett im Park, das
Sudoku aus dem Lokalblatt, ein Flohmarkt, eine Hundewiese, ein Stellplatz für die Nacht. Am Ende jeder Region
wartet ein Preisskat.

Wer im Wirtshaus Letzter wird, fährt die anderen heim, und das kostet Sprit. Ist der Tank leer, geht es nach
Hause, und die nächste Tour wird neu gewürfelt. Was bleibt, steht im Tourenbuch: Pokale, Ortsstempel, die Hunde,
die mitfahren dürfen, und seine Skat-Statistik.

**Sitzungen:** Eine Etappe hat fünf bis sechs Stationen plus Preisskat und dauert 35 bis 50 Minuten. Gespeichert
wird nach jeder Station und nach jedem einzelnen Skatspiel. An jedem Stellplatz und nach jedem Preisskat bietet das
Spiel an, für heute aufzuhören.

---

## 2. Welt und Ton

- **Zeit:** irgendwann zwischen 1975 und 1989. Bezahlt wird in Mark, telefoniert aus der gelben Zelle, navigiert
  mit dem Atlas auf dem Beifahrersitz.
- **Das Wohnmobil:** ein Alkoven-Wohnmobil in Creme mit orange-braunem Streifen, von der Seite gesehen. Der Name
  auf dem Heck kommt aus dem Profil. Ausbauten (§4.12) sind am Fahrzeug sichtbar.
- **Das Motorrad:** fährt auf dem Heckträger mit. Für Abstecher wird es abgeladen (§4.2), am Motorradtreff gehört
  es dazu. Eine Maschine der Siebziger ohne Markenzeichen, Typ und Farbe nach dem Profil (§16).
- **Daheim:** die Küche als Startbildschirm. Tourenbuch auf dem Tisch, Autoschlüssel am Haken, der Hund im Korb.
  Steht im Profil ein Partnername, verabschiedet und begrüßt diese Person mit einem Satz. Kein Porträt.
- **Wirtshäuser:** holzgetäfelte Stuben, Stammtischschild, Kachelofen, Wimpel, Sparschrank an der Wand. Namen aus
  einer Liste üblicher Namen (Lamm, Krone, Ochsen, Adler, Rössle, Hirsch, Löwen, Sonne, Traube, Linde), ohne
  Anspruch, dass es das Haus am Ort wirklich gibt.
- **Schwäbisches:** Brezeln, Maultaschen, Kehrwoche, Hocketse, Besenwirtschaft. Die Oberfläche spricht
  Hochdeutsch, die Figuren schwäbeln in ihren Sprüchen (offene Frage §16).
- **Getrunken wird nebenbei:** eine Halbe oder ein Weizen, das Viertele im Henkelglas, Most aus dem Krug, im
  Schwarzwald ein Kirschwasser. Auf jedem Tisch stehen Gläser. Das ist Kulisse und ein leiser Witz in den Sprüchen,
  nie eine Spielregel.
- **Der Humor:** Stammgäste mit großer Klappe. Eine Werkstatt, in der der Lehrling etwas kaputt macht und der
  Meister sagt, das gehört so. Zwei Dorfpolizisten, die lieber Skat spielen als kontrollieren. Mofa-Rocker an der
  Tankstelle. Ein Wohnmobil, das mit Draht und gutem Zureden hält. Dazu **Lautwörter** groß im Bild: KLATSCH, wenn
  ein Bube auf den Tisch fliegt, RÖÖÖHR, wenn die Maschine anspringt, ZISCH und GLUCK am Stammtisch.
- **Die drei Aufgabenarten haben ihren Ort:** Skat im Wirtshaus und am Stammtisch, Schach am Freiluftbrett im
  Park, Sudoku auf der Rätselseite des Lokalblatts am Kiosk.

---

## 3. Für wen

Fast 70, spielt Skat im Skat-Palast, ist viel Motorrad gefahren, keine Videospiel-Erfahrung. Spielt am Laptop mit Maus oder Touchpad, eine
halbe bis ganze Stunde am Stück, über viele Sitzungen. Daraus folgen die Regeln 4 und 5 in §0 und drei
Gestaltungsgrundsätze:

- **Sein Können ist Skat.** Dort darf das Spiel fordern. Karte, Läden und Ereignisse bleiben einfach.
- **Scheitern ist mild.** Eine verlorene Tour kostet nie den Fortschritt im Tourenbuch.
- **Hilfen sind Angebote.** Augenzähler und Trumpfanzeige gibt es nur als Andenken oder Einstellung, standardmäßig
  aus. Wer Skat kann, will selbst zählen.

---

## 4. Spieldesign

### 4.1 Aufbau einer Tour

Daheim → Neue Tour (Hund wählen, Schwierigkeit) → **Etappe 1** in der Heimatregion → Preisskat → Wahl zwischen
zwei weiteren Regionen → **Etappe 2** → Preisskat → **Etappe 3** → Preisskat um den Wanderpokal → Heimkehr mit
Abrechnung → Daheim.

- **Tank leer:** „Heimfahrt am Haken“. Die Tour endet, die Abrechnung zeigt Route, Liste und Stempel.
- **Speichern:** ein laufender Spielstand („Tour fortsetzen“), das Tourenbuch getrennt und dauerhaft. Beides im
  Browser-Speicher, dazu Export und Import als Datei für Sicherung und Laptopwechsel.
- **Ganz am Anfang:** zwei Fragen am Küchentisch. „Wie heißt du?“ (tippen oder Buchstaben anklicken, bis zwölf
  Zeichen) und „Was trinkst du?“ (Bier, Viertele, Most oder Spezi). Der Name steht danach auf dem Tourenbuch, in
  der Liste, auf den Pokalen und in den Sprüchen der Stammgäste. Beides ist in den Einstellungen änderbar.
- **Erste Fahrt:** eine geführte Probefahrt mit vier festen Stationen (Wirtshaus mit schwachen Gegnern, Kiosk,
  Schachbrett, Stellplatz) ohne Spritverlust. Überspringbar.

### 4.2 Die Etappenkarte

- Sieben Spalten: Spalte 0 ist der Start, Spalte 6 der Preisskat, die Spalten 1 bis 5 haben je zwei oder drei
  Stationen. Straßen führen nur vorwärts zu benachbarten Stationen.
- Jede Station trägt einen echten Ort der Region. Die Orte werden entlang der Fahrtrichtung in Spalten sortiert,
  sodass die Karte geografisch stimmig aussieht.
- Der Generator garantiert: Jeder Weg hat mindestens zwei Wirtshäuser. In Spalte 3 oder 4 ist von jedem Weg aus ein
  Stellplatz erreichbar. Höchstens eine Hundewiese und ein Motorradtreff pro Etappe. Nie zwei gleiche Rätselarten hintereinander.
  Spalte 1 ist immer ein Wirtshaus ohne Hausregel.
- **Sichtbarkeit:** Alle Stationsarten sind von Anfang an sichtbar. Hausregel und Stammgäste sieht man nur bei den
  direkt erreichbaren Wirtshäusern.
- **Abstecher mit dem Motorrad:** Gegen einen Strich Sprit darf man in der nächsten Spalte auch eine Station
  anfahren, zu der keine Straße führt. Die Maschine kommt vom Heckträger, das Wohnmobil zieht später nach.

| id | Station | Was passiert | Dauer |
|---|---|---|---|
| `inn` | Wirtshaus | eine Runde Skat (3 Spiele) gegen zwei Stammgäste, mit Hausregel | 6–9 Min |
| `bikers` | Motorradtreff | eine scharfe Runde Skat mit zwei vom Treff, danach ein Benzingespräch mit Folgen | 6–9 Min |
| `problem` | Stammtisch-Aufgabe | eine Skataufgabe: Endspiel, Drücken oder Reizen | 1–3 Min |
| `chess` | Schachbrett | eine Schachaufgabe | 2–4 Min |
| `sudoku` | Kiosk | Sudoku 6×6 oder 9×9 nach Wahl | 3–12 Min |
| `pitch` | Stellplatz | tanken (+2 Sprit), speichern, Pause anbieten | 1 Min |
| `dogs` | Hundewiese | einen Hund mitnehmen oder tauschen, Hunde-Ereignis | 1 Min |
| `market` | Flohmarkt | drei Andenken zur Auswahl | 1–2 Min |
| `garage` | Werkstatt | Ausbau kaufen, Sprit für Mark | 1–2 Min |
| `event` | Unterwegs | Textereignis mit zwei bis drei Entscheidungen | 1 Min |
| `tournament` | Preisskat | Etappenfinale: 6 Spiele in Turnierwertung | 12–18 Min |

### 4.3 Die Wirtshaus-Runde

- Dreiertisch, **drei Spiele**, jeder gibt einmal. Reizen, Spielansage und Abrechnung nach ISkO.
- **Liste:** erweitertes Seeger-Fabian-System wie beim Preisskat. Gewonnenes Spiel Spielwert + 50, verlorenes
  Spiel doppelter Spielwert minus und weitere 50 ab, gewonnenes Gegenspiel am Dreiertisch + 40.
- **Ergebnis nach Tabellenplatz:** Der Erste gewinnt den Pott (Startwert 5 Mark, dazu 1 Mark je 50 Punkte
  Vorsprung, höchstens 10). Der Zweite geht leer aus. Der Dritte fährt die anderen heim: −1 Sprit.
- **Gläser am Tisch** sind Kulisse: Vor jedem steht sein Getränk, beim Spieler das Stammgetränk. Es gibt keinen
  Pegel und keine ausgegebenen Runden; die Stammgäste spielen immer so, wie es bei der Figur steht (§4.5).
- **Jedes Wirtshaus hat:** einen Namen, eine Hausregel (§4.4), zwei Stammgäste (§4.5) und einen Einsatz
  (klein, mittel, hoch: Pott und Folgen ×1, ×1,5, ×2).
- **Am Tisch (960×540):** unten die Hand mit zehn großen Karten, spielbare Karten stehen höher. Links und rechts
  oben die Stammgäste mit Porträt, Name, Kartenzahl und Sprechblase. In der Mitte der Stich, daneben der Skat.
  Oben eine Tafel mit Spiel, Alleinspieler, Reizwert und Hausregel. Rechts unten „Letzter Stich“ und „Liste“.
- **Reizen:** zwei große Knöpfe, etwa „20 sagen“ und „Passe“, als Hörender „Ja“ und „Passe“. Die Stammgäste
  reizen in Sprechblasen.
- **Spielansage:** sechs Knöpfe (Karo, Herz, Pik, Kreuz, Grand, Null). Jeder zeigt den Spielwert und ob er für
  das Reizgebot reicht. Hand, Ouvert, Schneider und Schwarz angesagt nach den Bedingungen der Skatordnung.
- **Drücken:** zwei Karten anklicken, „Drücken“ bestätigen. Bis zur Bestätigung änderbar.
- **Ausspielen:** standardmäßig zwei Schritte (erster Klick hebt die Karte, zweiter spielt sie), umschaltbar auf
  einen Klick. Der letzte Stich darf nachgesehen werden wie am Tisch.
- **Tempo:** die Stammgäste spielen in ruhigem Takt (Einstellung gemütlich, normal, flott).

### 4.4 Hausregeln

Unsere feste Variante steht jeweils dabei, damit Code, Text und Hilfe dasselbe sagen.

| id | Name | Regel |
|---|---|---|
| `standard` | Nach Skatordnung | keine Abweichung, passen alle, wird eingepasst |
| `ramsch` | Ramsch | Passen alle, wird Ramsch gespielt: nur Buben sind Trumpf, wer die meisten Augen hat, bekommt sie als Minuspunkte. Der Skat geht an den letzten Stich. Ein Spieler ohne Stich (Jungfrau) verdoppelt. Durchmarsch bringt +120. |
| `schieberamsch` | Schieberamsch | wie Ramsch, der Skat wird reihum aufgenommen und weitergeschoben, Buben dürfen nicht geschoben werden |
| `kontra` | Kontra und Re | Jeder Gegenspieler darf vor seiner ersten Karte Kontra sagen (Spiel zählt doppelt), der Alleinspieler darauf Re (vierfach). |
| `bock` | Bockrunde | alle Spiele der Runde zählen doppelt |
| `grand-evening` | Grand-Abend | jeder gewonnene Grand +20 Listenpunkte |
| `null-evening` | Null-Abend | jedes gewonnene Nullspiel +15 Listenpunkte |
| `hand-evening` | Hand-Abend | jedes gewonnene Handspiel +15 Listenpunkte |
| `sharp` | Scharfe Runde | Pott und Spritverlust doppelt |
| `long-round` | Lange Runde | sechs statt drei Spiele |
| `kitty` | Skatkasse | wer ein Spiel verliert, zahlt 1 Mark in die Kasse; wer die Runde gewinnt, bekommt die Kasse |

### 4.5 Stammgäste

Erfundene Figuren mit einem Spielstil. Der Stil ist ein Satz Parameter für den Computergegner (§5.3), keine
versteckten Vorteile. Namen sind Vorschläge für den Textbereich.

| id | Figur | Spielweise | Stärke |
|---|---|---|---|
| `maurer` | Maurer-Karle | reizt zu vorsichtig, steht im Gegenspiel sicher | mittel |
| `zocker` | der Erwin | reizt alles aus und überreizt sich gern | mittel |
| `rechnerin` | Frau Gerda | zählt jede Karte, kaum Fehler | hoch |
| `nullfuchs` | Null-Eugen | sucht das Nullspiel, auch wo keins ist | mittel |
| `grandspieler` | Grand-Helmut | spielt Grand, wo andere Farbe spielen | mittel |
| `neuling` | der junge Rolf | vergisst Trümpfe zu zählen, schmiert falsch | niedrig |
| `schwaetzer` | Schwätzer-Sigi | redet viel, sein Spruch verrät manchmal das Blatt | niedrig |
| `lehrer` | Oberlehrer Walter | spielt nach Lehrbuch, berechenbar | mittel |
| `schlitzohr` | ’s Schlitzohr Fritz | schneidet riskant, legt Fallen | hoch |
| `kommandant` | Kommandant Heiner | schnell und angriffslustig | mittel |
| `wirtin` | die Wirtin Lore | springt ein, wenn einer fehlt, spielt solide | mittel |
| `altmeister` | der alte Gottlob | Preisskat-Sieger von früher | sehr hoch |

Jede Figur hat dazu eine **Eigenart** (ein Satz Humor, ohne Wirkung aufs Spiel), etwa: Frau Gerda trinkt Sprudel
und zählt trotzdem jede Karte.

Dazu kommt das **Duo aus dem Rathaus**: der Schultes (`schultes`, eitel, hält sich für den besten Skatspieler im
Landkreis, reizt zu hoch) und sein Amtsbote (`amtsbote`, wirkt einfach, ist bauernschlau und gewinnt am Ende). Sie
sitzen meist zu zweit am Tisch und tauchen in Ereignissen auf. Sprüche gibt es zusätzlich für Schimpfen („blunder“,
„robbed“), Selbstvorwürfe („selfBlame“) und Sticheleien („tease“).

Dazu je Region zwei **Favoriten** für den Preisskat (acht Figuren, Stärke hoch bis sehr hoch) und sechs
**Nebenfiguren**: zwei Dorfpolizisten (`wachtmeister`, `anwaerter`), zwei vom Motorradtreff (`biker-manne`,
`biker-uschi`), Meister und Lehrling der Werkstatt (`meister`, `lehrling`). Polizisten und Motorradfahrer spielen
auch Skat. Jede Figur hat Sprüche für Reizen, Stich gewonnen, Stich verloren, Spiel gewonnen, Spiel verloren,
Ramsch, Bestellung und Abschied. Getränke kommen in den Sprüchen höchstens nebenbei vor. In den Sprüchen steht der Name des Spielers. Solange er keinen Pokal hat, ist er
am Stammtisch „der Lehrling“, danach „Meister“.

### 4.6 Der Preisskat

- Sechs Spiele am Dreiertisch gegen die zwei Favoriten der Region, Turnierwertung. Das Tourfinale hat neun Spiele.
- **Tischsieg:** Pokal der Region, 10 Mark, und ein **Bierdeckel** nach Wahl aus dreien (§4.12).
- **Zweiter:** kein Pokal, −1 Sprit. **Dritter:** kein Pokal, −2 Sprit. Bleibt Sprit übrig, geht die Tour weiter.
- **Tourfinale:** Der Tischsieg bringt den Wanderpokal, die Tour ist gewonnen. Sonst endet sie ohne Pokal.
- Beim Preisskat gilt keine Hausregel außer der Skatordnung. Turnier ist Turnier.

### 4.7 Stammtisch-Aufgaben

Skataufgaben, vom Löser (§5.3) erzeugt und geprüft, als Paket ausgeliefert (Alpha: 300).

- **Endspiel:** offene Karten, vier bis fünf Stiche übrig, genau eine Karte gewinnt.
- **Drücken:** zwölf Karten und ein Spiel, welche zwei gehen in den Skat? Nur Aufgaben mit klarem Abstand zur
  zweitbesten Lösung.
- **Reizen:** bis wohin trägt dieses Blatt? Ein Bereich gilt als richtig.

Drei Versuche. Gelöst im ersten Versuch 4 Mark, im zweiten 3, im dritten 2. Nicht gelöst kostet nichts.

### 4.8 Schach

- Aufgaben aus der Lichess-Aufgabendatenbank (CC0), offline gebündelt, je 300 pro Stufe. Leicht: Matt in einem
  Zug und einfache Gabeln. Mittel: Matt in zwei, Taktik. Schwer: Matt in drei.
- Figur anklicken, Zielfelder leuchten, Feld anklicken. Die Gegenzüge kommen aus der Lösungslinie, es braucht kein
  Schachprogramm. Deutsche Notation (K, D, T, L, S), Koordinaten am Brett, die Seite am Zug sitzt unten.
- Drei Versuche, Belohnung wie bei den Stammtisch-Aufgaben. Die Stufe ist eine eigene Einstellung.

### 4.9 Sudoku

- Erzeugt mit Startwert, immer eindeutig lösbar. **Kleines Rätsel** 6×6 (2–4 Minuten, +1 Sprit) oder **großes
  Rätsel** 9×9 (8–12 Minuten, +2 Sprit und 2 Mark).
- Feld anklicken, Ziffer aus einer großen Ziffernleiste wählen. Notizen sind möglich, nicht nötig. Falsche Ziffern
  werden markiert (abschaltbar). Weglegen kostet nichts.
- Stufen nach nötiger Löse-Technik, eigene Einstellung.

### 4.10 Unterwegs

Textereignisse nach dem Muster von TTL (`EventDef`, `ChoiceDef`, gewichtete `Outcome`): ein Bild, wenige Sätze,
zwei oder drei Entscheidungen. Hunde, Andenken und Ausbauten schalten zusätzliche, hervorgehobene Antworten frei.

- **Umfang Alpha:** 108 Ereignisse. 16 je Region, 20 für überall, 12 mit Hunden, 12 rund ums Motorrad. Keine
  Wiederholung in einer Tour.
- **Mögliche Folgen:** Sprit, Mark, Andenken, Hund, eine Sonderrunde Skat, eine Aufgabe, ein Folgeereignis,
  ein Eintrag im Tourenbuch.
- **Beispiele:** Kehrwoche auf dem Stellplatz. Stau und die Frage nach der Umleitung. Eine Schafherde auf der
  Straße (mit Schäferhund: sie macht den Weg frei). Hocketse im Ort, am Nebentisch fehlt der dritte Mann. Der
  Besen hat offen. Ein Tramper mit Schachbrett. Regen am Stellplatz und die Zeitung von gestern. Das falsche
  Vaihingen. Besuch vom Kind mit Hund. Der Anruf vom Tierschutz und die Sonderfahrt nach Ungarn.
  Verkehrskontrolle: Die zwei Dorfpolizisten winken raus und suchen eigentlich nur den dritten Mann. In der
  Werkstatt fällt dem Lehrling der Auspuff ab, und der Meister sagt, das gehört so. Mofa-Rocker an der Tankstelle
  fordern die Maschine zum Rennen bis zum Ortsschild. Im Keller vom Besen platzt das Mostfass. Die Brennerei im
  Schwarzwald lädt zur Probe, und das Wohnmobil bleibt über Nacht stehen.

### 4.11 Sprit und Mark

| id | Was | Regeln (Startwerte, die Balance-Läufe entscheiden) |
|---|---|---|
| `fuel` | Sprit | Tank mit 5 Strichen, Start voll. Verlust: letzter Platz im Wirtshaus, Preisskat ohne Sieg, Abstecher, manche Ereignisse. Gewinn: Stellplatz +2, Sudoku, Werkstatt (3 Mark je Strich). |
| `marks` | Mark | Start 10. Einnahmen: Pott, Aufgaben, Schach, Preisskat. Ausgaben: Flohmarkt, Werkstatt, Ereignisse. |

Fahren auf der Straße kostet nichts. Die Anzeige ist die Reserve, und die Reserve entscheidet, wie lange die Tour
dauert.

### 4.12 Hunde, Andenken, Bierdeckel, Ausbau

**Hunde.** Höchstens zwei fahren mit. Die Rassen sind fest, die Namen kommen aus dem Profil.

| id | Rasse (der Name kommt aus dem Profil) | Fähigkeit | Freigeschaltet |
|---|---|---|---|
| `shepherd` | Schäferhund | Passt auf: einmal pro Etappe kostet ein letzter Platz keinen Sprit | von Anfang an |
| `wolfhound-a` | Irischer Wolfshund | Weitgereist: ein Abstecher pro Etappe ist frei | Ereigniskette „Sonderfahrt nach Ungarn“ |
| `wolfhound-b` | Irischer Wolfshund | Die Ruhe selbst: einmal pro Spiel die eigene Karte zurücknehmen, solange der Stich offen ist | zehn Wirtshaus-Runden gewonnen |
| `airedale` | Airedale Terrier | Lässt nicht locker: ein Versuch mehr bei Aufgaben und Schach, ein Feld gratis im Sudoku | erster Preisskat-Sieg |
| `schnauzer-a` | Riesenschnauzer | Feine Nase: einmal pro Runde vor dem Reizen eine Skatkarte sehen | fünfzehn Schachaufgaben gelöst |
| `schnauzer-b` | Riesenschnauzer | Gast für eine Etappe, bringt Vesper mit: Tank voll | Ereignis „Besuch“ |

Die Hunde sind sichtbar: Kopf im Wohnmobilfenster, im Beiwagen mit Motorradbrille, unter dem Tisch im Wirtshaus,
Ohren hoch beim Stich mit dem Alten.

**Andenken** (Flohmarkt, 2 bis 6 Mark, vier Plätze):

| id | Name | Wirkung |
|---|---|---|
| `reading-glasses` | Lesebrille | zeigt die gefallenen Trümpfe |
| `notepad` | Notizblock | zeigt die Augen beider Parteien |
| `lucky-penny` | Glücksgroschen | einmal pro Runde vor dem Reizen neu geben lassen |
| `thermos` | Thermoskanne | Stellplatz gibt einen Strich mehr |
| `road-atlas` | Straßenatlas | Hausregeln und Stammgäste eine Spalte weiter voraus sichtbar |
| `piggy-bank` | Sparbüchse | +1 Mark nach jeder gewonnenen Runde |
| `pennant` | Stammtischwimpel | zweiter Platz im Wirtshaus bringt 2 Mark |
| `chess-clock` | Schachuhr | Schachaufgaben bringen 2 Mark mehr |
| `pencil` | Bleistiftstummel | im Sudoku sind zwei Felder vorab gelöst |
| `snack-board` | Vesperbrett | dritter Platz beim Preisskat kostet nur einen Strich |
| `dog-whistle` | Hundepfeife | Hundefähigkeiten zweimal statt einmal |
| `postcard` | Postkarte von daheim | einmal pro Tour: bei leerem Tank zwei Striche statt Heimfahrt |
| `oil-can` | Ölkännchen | Ausbauten in der Werkstatt kosten 2 Mark weniger |
| `magnifier` | Lupe | einmal pro Aufgabe (Stammtisch, Schach) ein Hinweis, welche Karte oder Figur dran ist |

**Bierdeckel** (Sonderregel für den Rest der Tour, nach Preisskat-Sieg und selten aus Ereignissen, drei Plätze):

| id | Name | Wirkung |
|---|---|---|
| `grand-bonus` | Grand-Prämie | jeder gewonnene Grand +20 Listenpunkte |
| `null-bonus` | Null-Prämie | jedes gewonnene Nullspiel +15 |
| `hand-bonus` | Hand-Prämie | jedes gewonnene Handspiel +15 |
| `schneider-bonus` | Schneider-Prämie | jeder Schneider +15 |
| `defence-bonus` | Gegenspiel-Prämie | jedes gewonnene Gegenspiel +10 |
| `redeal` | Neu geben | einmal pro Runde neu geben lassen |
| `extra-game` | Viertes Spiel | jede Wirtshaus-Runde hat ein Spiel mehr |
| `forehand` | Vorhand | im ersten Spiel jeder Runde in Vorhand |
| `double-pot` | Doppelter Pott | Pott und Spritverlust doppelt |

**Ausbau** (Werkstatt, 6 bis 12 Mark, bleibt für die Tour): `aux-tank` Zusatztank (+2 Striche), `roof-box`
Dachbox (+2 Andenken-Plätze), `dog-bed` Hundebett (dritter Hund), `awning` Markise (am Stellplatz eine
Stammtisch-Aufgabe gratis), `fridge` Kühlschrank (einmal pro Etappe +1 Sprit), `radio` Autoradio (Musikwahl auf
der Karte), `sidecar` Beiwagen fürs Motorrad (der erste Abstecher jeder Etappe ist frei, ein Hund fährt mit).

**Fahrzeuge.** Jede Tour beginnt mit dem Wohnmobil und dem Motorrad auf dem Heckträger. Nach dem ersten
Wanderpokal gibt es ein zweites Fahrzeug zur Wahl, so wie TTL drei Tender hat:

| id | Fahrzeug | Eigenheiten |
|---|---|---|
| `camper` | Wohnmobil mit Motorrad | Tank 5, vier Andenken-Plätze, zwei Hunde, Stellplatz gibt +2, ein Abstecher kostet einen Strich |
| `sidecar-rig` | Gespann (Motorrad mit Beiwagen) | Tank 4, zwei Andenken-Plätze, ein Hund im Beiwagen, alle Abstecher frei, am Motorradtreff doppelter Pott, als Ausbau nur der Zusatztank |

### 4.13 Tourenbuch

Auf dem Umschlag stehen sein Name und sein **Rang**: Lehrling, Geselle, Meister, Altmeister, je nach Zahl der
Pokale. Bleibt über alle Touren: Pokalregal (vier Regionen in drei Schwierigkeiten, Wanderpokal), Ortsstempel für jeden
besuchten Ort, Album der Stammgäste mit Bilanz, Hunde, Andenken-Sammlung, Chronik der Ereignisse und die
**Skat-Statistik**: Spiele, gewonnene Alleinspiele in Prozent, Verteilung der Spielarten, höchstes Spiel, Grand
Hand, Schneider und Schwarz, beste Liste. Dazu, weniger ernst: Abstecher mit dem Motorrad und wie oft er der
Fahrer war.

### 4.14 Schwierigkeit

Vor der Tour wählbar, gilt für die ganze Tour, keine versteckte Anpassung.

| | Gemütlich | Sportlich | Scharf |
|---|---|---|---|
| Stammgäste | mehr schwache und mittlere | gemischt | mehr starke, tieferes Rechnen |
| Tank | 6 Striche | 5 | 4 |
| Preisskat ohne Sieg | Zweiter verliert keinen Sprit | wie §4.6 | wie §4.6, Zweiter −2 |
| Pott | ×1,25 | ×1 | ×1 |

Schach und Sudoku haben eigene Stufen in den Einstellungen.

---

## 5. Skat: Regelwerk und Computergegner

Das größte Risiko des Projekts. Deshalb zuerst gebaut und gemessen (Meilenstein M3 mit Abbruchkriterien).

### 5.1 Regelwerk (`src/skat/rules/`, reines TypeScript ohne DOM)

- 32 Karten als Bits in einer 32-Bit-Zahl. Geben 3 – Skat – 4 – 3 aus dem Zufallsgenerator mit Startwert.
- Reizen als Zustandsmaschine: Mittelhand reizt Vorhand, Hinterhand den Verbliebenen. Reizwerte 18, 20, 22, 23,
  24, 27, 30, 33, 35, 36, 40, 44, 45, 46, 48, 50 und weiter bis 264.
- Spielarten: Farbspiele (Karo 9, Herz 10, Pik 11, Kreuz 12), Grand 24, Null 23, Null Hand 35, Null Ouvert 46,
  Null Ouvert Hand 59. Spitzen, Hand, Schneider, Schwarz, Ansagen, Ouvert. Überreizt wird erkannt und berechnet.
- Bedienpflicht, Stichvergabe, Augen (Ass 11, Zehn 10, König 4, Dame 3, Bube 2), 61 zum Gewinn, Schneider ab 90.
- Hausregeln als Zusatzmodule: Ramsch, Schieberamsch, Kontra und Re, Bock.
- Wertung: Spielwert und Turnierwertung nach erweitertem Seeger-Fabian.
- Zwei französische und ein deutsches Blatt sind nur Darstellung, das Regelwerk kennt Farben und Ränge.

### 5.2 Prüfbarkeit

Jede Funktion ist ohne Browser testbar (`node --experimental-strip-types --test`). Eine Million zufällig
durchgespielter Spiele muss alle Invarianten halten: 120 Augen, nur erlaubte Züge, Spielwert stimmt mit einer
Tabelle bekannter Beispiele, Überreizen korrekt.

### 5.3 Computergegner (`src/skat/ai/`, läuft in einem Web Worker)

- **Löser bei offenen Karten** (`dds.ts`): Alpha-Beta mit Transpositionstabelle über Bitmasken, Zugsortierung,
  gleichwertige Nachbarkarten zusammengefasst. Eigener, einfacher Löser für Nullspiele. Derselbe Löser erzeugt
  und prüft die Stammtisch-Aufgaben.
- **Kartenspiel** (`pimc.ts`): Perfect-Information Monte Carlo. Der Gegner würfelt Verteilungen der unbekannten
  Karten, die zu allem passen, was er weiß (eigene Hand, gefallene Karten, gezeigte Fehlfarben, das Reizen als
  Gewichtung), löst jede und spielt die Karte mit dem besten Schnitt.
- **Reizen** (`bid.ts`): Für jede Spielart schätzt er die Gewinnchance seines Blatts über Stichproben mit
  zufälligem Skat. Er reizt bis zum höchsten Spiel, dessen Chance über seiner Schwelle liegt.
- **Drücken und Ansage** (`discard.ts`): Vorauswahl nach Faustregeln, die besten Kandidaten aus Spielart und
  gedrücktem Paar werden durchgerechnet.
- **Charakter** (`persona.ts`): Stichprobenzahl, Reizschwelle, Vorlieben für Spielarten, Fehlerquote, Sprüche.
  Schwache Figuren rechnen flacher und greifen öfter daneben, starke rechnen tiefer.
- **Zeit:** Ziel höchstens 1,5 Sekunden pro Entscheidung auf einem gewöhnlichen Laptop. Begrenzt wird über
  Stichproben und Knoten, nicht über die Uhr, damit dasselbe Spiel mit demselben Startwert gleich verläuft.

### 5.4 Abnahme des Computergegners (Meilenstein M3)

Gemessen mit einer Liga ohne Bildschirm (`tools/balance/skat-league.ts`), Ergebnis in `docs/balance-skat.md`.

- Die mittlere Stufe gewinnt mindestens 75 % ihrer angesagten Spiele gegen zwei Gegner gleicher Stufe.
- Überreizt in weniger als 3 % der Alleinspiele.
- Die mittlere Stufe schlägt einen Regelgegner ohne Vorausrechnen über 10.000 Spiele deutlich.
- 95 % der Entscheidungen im Browser unter 1,5 Sekunden.
- Fünfzig Spiele werden gesichtet. Kein Spielzug, den ein Vereinsspieler als Unsinn bezeichnen würde.

**Wenn das nicht gelingt:** Das Wirtshaus wird zur Serie aus drei Stammtisch-Aufgaben (Idee C). Karte, Rätsel,
Hunde und Tourenbuch bleiben unverändert, der Preisskat entfällt oder wird eine Aufgaben-Serie mit Liste.

---

## 6. Schach und Sudoku (Technik)

- `src/chess/`: Brett, Zugregeln mit Schach, Matt, Rochade, en passant und Umwandlung, FEN lesen, Aufgabenläufer.
  Ein Werkzeug wählt die Aufgaben einmalig aus der Lichess-Datenbank nach Thema und Wertung und schreibt
  `public/puzzles/chess-<stufe>.json`. Nennung in `THIRD_PARTY_NOTICES.md`.
- `src/sudoku/`: Erzeuger mit Startwert, Eindeutigkeitsprüfung, Löser nach Techniken zur Einstufung, 6×6 und 9×9.
- Beide Module sind rein und im Test ohne Browser prüfbar: jede Aufgabe lösbar, jede Lösung eindeutig.

---

## 7. Ablauf der Bildschirme

Namenseingabe · Daheim (Titel) · Neue Tour · Etappenkarte · Wirtshaus (Skattisch) · Motorradtreff · Liste und Abrechnung · Preisskat ·
Stammtisch-Aufgabe · Schach · Sudoku · Ereignis · Stellplatz · Hundewiese · Flohmarkt · Werkstatt · Regionswahl ·
Heimkehr · Pokal · Tourenbuch · Einstellungen · Hilfe (Bedienung, Hausregeln, Spielwert-Tabelle) · Credits.

Einstellungen: Name und Stammgetränk, Blatt (französisch, deutsch, Turnierfarben), Ausspielen mit einem oder zwei Klicks, Tempo,
Fehleranzeige im Sudoku, Stufen für Schach und Sudoku, Lautstärken, Vollbild, bewegte Hintergründe aus.

---

## 8. Ortspaket und Profil

Das Spiel kennt keine Orte und keine Namen. Beides wird geladen.

**Ortspaket** `public/packs/enztal/pack.json`: Regionen mit Titel, Kartenbild, Preisskat-Ort, Orten (id, Name,
Lage auf dem Kartenbild 0 bis 1, optionale Anmerkung) und regionalen Ereignissen. Entwurf, **bitte gegenlesen**:

| Region | Preisskat in | Orte (Entwurf) |
|---|---|---|
| `enztal` Unteres Enztal | Vaihingen an der Enz | Enzweihingen, Roßwag, Aurich, Riet, Kleinglattbach, Ensingen, Horrheim, Gündelbach, Oberriexingen, Sersheim |
| `muehlacker` Mühlacker und Stromberg | Mühlacker | Dürrmenz, Lomersheim, Mühlhausen an der Enz, Enzberg, Lienzingen, Großglattbach, Illingen, Ötisheim, Maulbronn |
| `schwarzwald` Nordschwarzwald | Neuenbürg | Waldrennach, Arnbach, Dennach, Birkenfeld, Höfen an der Enz, Bad Wildbad, Engelsbrand, Pforzheim |
| `stuttgart` Stuttgart | Bad Cannstatt | Feuerbach, Zuffenhausen, Weilimdorf, Botnang, Killesberg, Degerloch, Untertürkheim, Stuttgart-Vaihingen |

Die Heimatregion ist immer Etappe 1. Die anderen beiden wählt er unterwegs.

**Profil** `profile.json` (wird einmal importiert und bleibt im Browser, siehe §16 Hosting):

```json
{
  "home": "enzweihingen",
  "partner": "Erna",
  "child": "Karl",
  "van": "",
  "bike": "",
  "deck": "french",
  "dogs": {
    "shepherd": "Hasso", "wolfhound-a": "Finn", "wolfhound-b": "Bran",
    "airedale": "Lumpi", "schnauzer-a": "Bella", "schnauzer-b": "Bruno"
  },
  "notes": { "feuerbach": "Hier hat er Werkzeugmacher gelernt." }
}
```

`notes` erscheinen als eine Zeile auf dem Ortsstempel und im Ereignis „Werkstor“. Das Standardprofil hat neutrale
Hundenamen, keinen Partner, kein Kind und keine Anmerkungen. `home` ist hier geraten (offene Frage §16). `bike`
beschreibt seine Maschine in Worten. Den eigenen Namen gibt der Spieler selbst ein (§4.1), er steht nicht im Profil.

---

## 9. Art (Krea 2 → gemalter Comic im Adventure-Raster)

**Look:** warmes Abendlicht über dem Enztal. Fachwerk, Steillagen-Weinberge, Tannen, Flussschleifen. Innen Holz,
orange Lampenschirme, Resopal, Wimpel. Die Karten sehen aus wie ein Autoatlas der Siebziger: cremefarbenes Papier,
rote und gelbe Straßen, grüne Waldflächen, die Enz in Blau.

**Stil:** ein schwäbischer Comic in der Ästhetik von „Baphomets Fluch“ (1996).

- **Hintergründe** wie gemalte Trickfilm-Kulissen: Bleistift-Layout mit kräftiger Perspektive, deckende Farben,
  dunkle Tuschekontur, warmes Licht mit langen Schatten, viele Einzelheiten zum Entdecken.
- **Figuren, Hunde und Fahrzeuge** als flächig kolorierter Zeichentrick mit sauberer Kontur, einer Schattenfarbe
  und einem Glanzlicht. Kernig überzeichnet: Schnauzer, Schiebermützen, rote Nasen, große Hände. Ein eigener
  Strich, nicht der von Werner, und keine Figur aus Baphomets Fluch.
- **Auflösung (entschieden nach der Stilstudie):** Alles Gemalte bleibt gemalt: Krea rendert höchstens
  2560×1440, das Bild wird hochwertig auf 1920×1080 verkleinert (Figuren, Hunde, Gegenstände in doppelter Dichte),
  ohne Pixelraster und ohne Farbreduktion, als WebP ausgeliefert und in `public/art/index.json` eingetragen. Die im
  Code gemalten Ersatzbilder bleiben im 640×360-Raster, bis die gemalten Bilder da sind.
- **Comic-Mittel:** Sprechblasen, Lautwörter, Ereignisse als Panels mit Rahmen.

**Pipeline wie TTL:** `art-src/` mit `specs.py`, `subjects.py`, `gen.py` (ComfyUI auf Port 8192, Krea 2 Turbo fp8,
8 Schritte euler/simple, cfg 1), Warteschlange und GPU-Halt über `loop.sh`, `serve.sh`, `worker.py`. Danach zwei
deterministische Nachbearbeitungen aus den TTL-Werkzeugen: `tools/art/pixelscene.py` mit einer neuen
Voreinstellung `adventure` für Hintergründe (auf 640×360 verkleinern, Farben auf die Leitpalette abstimmen, bis
zu 192 Farben je Bild, Kontur schärfen) und `tools/pixelize.py` mit einer Voreinstellung `cel` für Figuren und
Gegenstände (wenige flache Farben aus der Leitpalette, geschlossene dunkle Kontur, sauberes Alpha).
`tools/art/finalize.py` schreibt nach `public/art/` und ins Manifest.

**Vor der Serie steht eine Stilstudie:** ein Hintergrund, ein Porträt, ein Hund und das Wohnmobil in zwei bis
drei Varianten, im Spiel hinter dem Skattisch begutachtet. Erst wenn die Anmutung stimmt, wird die Prompt-Vorlage
gesperrt. Damit eine Figur über viele Bilder gleich aussieht, bekommt jede ein Referenzbild, das bei jedem
weiteren Render mitgegeben wird.

| Gruppe | Pfad unter `public/art/` | Größe | Anzahl | Hinweise |
|---|---|---|---|---|
| Regionskarten | `maps/<region>.png` | 640×360 Art-Pixel, 3× gezeichnet | 4 | Atlasblatt ohne Beschriftung, ruhig genug für Stationen und Straßen |
| Wirtsstuben | `inns/<art>.png` | 640×360 | 8 | Blick über den Tisch: Dorfwirtschaft, Besen, Vereinsheim, Bahnhofsgaststätte, Biergarten, Kantine, Campingkneipe, Festzelt. Untere Bildhälfte ruhig für Hand und Stich |
| Szenen | `bg/<id>.png` | 640×360 | 14 | Küche daheim, Titel, Stellplatz je Region (4), Hundewiese, Kiosk, Park mit Schachbrett, Flohmarkt, Werkstatt, Motorradtreff, Heimkehr, Pokal |
| Ereignisbilder | `events/<id>.png` | 256×128, 3× gezeichnet | 40 | als Comic-Panel mit Rahmen, Liste kommt vom Textbereich in `docs/art-requests.md` |
| Porträts | `portraits/<id>.png` | 96×96, 3× gezeichnet | 30 | 12 Stammgäste, 8 Favoriten, 4 Wirtsleute, 6 Nebenfiguren. Erfundene Gesichter, kernig überzeichnet, je Figur ein Referenzbild |
| Hunde | `dogs/<id>.png`, `dogs/<id>-<pose>.png` | Porträt 96×96, Posen 64×64 mit Alpha, 3× gezeichnet | 6 + 36 | je Hund ein Porträt und sechs Posen: sitzen, liegen, Ohren hoch, bellen, schlafen, Kopf aus Fenster oder Beiwagen. Die beiden Wolfshunde und die beiden Riesenschnauzer bleiben unterscheidbar |
| Fahrzeuge | `van/van.png`, `van/<ausbau>.png`, `van/bike.png`, `van/rig.png` | Wohnmobil etwa 180×100, Motorrad etwa 80×52, Alpha, 3× gezeichnet | 1 + 6 + 2 | Seitenansicht nach rechts. Ausbauten als Auflagen, das Motorrad auf dem Heckträger und einzeln, das Gespann mit Beiwagen. Ankerpunkte in `van.json` |
| Hofkarten | `cards/court-<farbe>-<rang>.png` | 96×144, volle Auflösung | 12 | Bube, Dame, König in vier Farben, klassisches Doppelbild im eigenen Comic-Strich |
| Gegenstände | `items/<id>.png` | 64×64, Alpha | 30 | Andenken, Bierdeckel, Ausbau |
| Pokale | `trophies/<id>.png` | 96×128, Alpha | 5 | vier Regionen und der Wanderpokal |

Zusammen etwa 194 fertige Bilder. Jedes Bild hat einen Code-Ersatz, damit Code und Art unabhängig vorankommen.

---

## 10. Code-gezeichnete Sprites und Palette

**Sprites** (`tools/sprites/` → `public/sprites/`, Python mit Pillow, 2× Dichte, byte-gleich reproduzierbar, Format
wie bei TTL):

- `cards`: 32 Karten in drei Blättern (französisch, deutsch, Turnierfarben), groß 144×216 und klein 72×108,
  drei Rückseiten, Zustände spielbar, gesperrt, gewählt, sieben Drehstufen für den Stich.
- `ui`: 9-Slice-Rahmen in Holz, Papier und Filz, große Knöpfe, Reiter, Sprechblasen, Liste, Tankanzeige,
  Markstück, großer Zeiger und Hand als Cursor.
- `icons`: Stationsarten in vier Zuständen, Farben und Spielarten, Sprit und Mark, Einstellungen.
- `van`: Räder, Auspuffwolken und kleine Kartenmarken für Wohnmobil, Motorrad und Gespann.
- Hunde und Fahrzeuge selbst sind gemalt (§9) und werden hier nur zu Atlanten gepackt. Bewegung entsteht durch
  Posenwechsel, Wippen und Schieben, nicht durch Laufzyklen.
- `drinks`: Bierglas (Halbe), Weizenglas, Henkelglas, Mostkrug, Schnapsglas, Spezi, Sprudel, je in vier
  Füllständen, dazu leere Gläser. Nur Kulisse.
- `words`: Lautwörter als fertige Schriftzüge in drei Größen (KLATSCH, RUMMS, RÖÖÖHR, ZISCH, GLUCK, TACKER und
  weitere nach Liste des Textbereichs).
- `chess`, `sudoku`: Figuren, Felder, Ziffern, Marken.
- `fx`: Kartenschatten, Stichgewinn, Münze, Stempel, Regen, Laub.

**Schriften:** Jersey 10, 15, 20, 25, Silkscreen und Tiny5 (OFL) über `tools/build_fonts.py`. Der Zeichensatz von
TTL hat schon ä, ö, ü und ß. Dazu kommen „ ‚ « » und die Prüfung, dass jede Schrift sie abdeckt. Sprechtexte
bekommen eine dunkle Kontur wie in den Adventures von damals. Ob Jersey zum Comic passt oder eine rundere freie
Schrift besser ist, entscheidet die Stilstudie.

**Leitpalette** `public/palette.json`, 62 Farben, jeweils von dunkel nach hell. Karten, Oberfläche, Figuren und
Gegenstände nutzen nur diese Farben. Hintergründe werden auf sie abgestimmt:

```
tinte    #15110e #221a15 #33271e #47372b #5f4a39 #7b6350
papier   #a8956c #c9b88a #e2d3a8 #f1e6c6 #fbf3dc
holz     #3d2716 #5a3a20 #7d522b #a26f3c #c48f55 #e0b27a
bier     #a8680f #d38d1c #f2b135 #ffd66e #fff0b8
ziegel   #6a1f1b #962f22 #c24b30 #e0714a #f4a27a
strasse  #b3261e #e23b2b #f6c443 #fff7e0
wald     #1c3a2a #2d5631 #47773a #6f9d48 #a3c46c #cfe0a0
filz     #123526 #1c4d35 #2a6a47 #3d8a5c #5fae7c
enz      #1d3f5e #2a5f85 #3f86ad #6fb0cf #a9d6e6 #dff1f5
abend    #382a45 #5a4168 #86628f #b98fb5 #e9cfe0
stein    #4f4b47 #77726b #a39d94 #cfcac2 #f0eeea
oliv     #4a4a22 #6f7030 #9a9a45 #c4c06a
```

Hintergründe dürfen bis zu 192 Farben je Bild haben, im Manifest vermerkt. Die genaue Zahl legt die Stilstudie
fest.

---

## 11. Audio

**Musik (YuE2, Pipeline wie TTL):** warm, akustisch, instrumental. Akkordeon, Gitarre, Kontrabass, Klarinette,
Besen-Schlagzeug, ein kleiner Bläsersatz. Auf der Straße Easy Listening der Siebziger wie aus dem Autoradio.
Keine Stimmen. Lieferung nach `public/audio/music/` mit `music.json` (Tempo, Takte, Schleifenpunkte), −19 LUFS.
Stammtisch und Preisskat kommen in zwei taktgleichen Schichten, die das Spiel überblendet, wenn es eng wird.

| id | Wo | Hinweis |
|---|---|---|
| `daheim` | Küche, Titel | Hauptthema, Akkordeon und Gitarre |
| `enztal`, `stromberg`, `schwarzwald`, `stuttgart` | Etappenkarte je Region | Enztal leicht, Stromberg Klarinette, Schwarzwald Waldhorn und ruhig, Stuttgart Tanzorchester mit Vibraphon |
| `stammtisch` | Wirtshaus | Schichten ruhig und eng |
| `preisskat` | Preisskat | Schichten ruhig und eng, gehender Bass |
| `raetsel` | Aufgaben, Schach, Sudoku | Klavier und Gitarre, sehr ruhig |
| `stellplatz` | Stellplatz, Hundewiese | Abend, Gitarre |
| `motorradtreff` | Motorradtreff, Abstecher | Bluesrock der Siebziger: Slide-Gitarre, Hammond, trockenes Schlagzeug |
| `pokal` | Sieg | kurze Blasmusik |
| `heimfahrt` | Tour-Ende | sanft, einmalig |

**Geräusche (Stable Audio 3 Small und Synthese)** nach `public/audio/sfx/` mit `sfx.json`, je ein bis drei
Varianten: `card-deal`, `card-play`, `card-raise`, `trick-take`, `shuffle`, `knock`, `bid`, `pass`, `skat-pick`,
`list-write`, `glass-clink`, `bottle-open`, `pour`, `gulp`, `cheers`, `burp`, `chair`, `inn-murmur` (Schleife), `coin`, `till`, `stamp`, `page-turn`, `van-start`,
`van-drive` (Schleife), `van-door`, `van-horn`, `bike-kick`, `bike-rev`, `bike-idle` (Schleife), `dog-bark-big`, `dog-bark-small`, `dog-pant`, `dog-whine`,
`chess-move`, `chess-capture`, `pencil`, `sudoku-right`, `sudoku-wrong`, `church-bell`, `rain` (Schleife),
`crickets` (Schleife), `fuel`, `wrench`, `ui-click`, `ui-back`, `ui-open`, `win-sting`, `lose-sting`,
`trophy-fanfare`.

---

## 12. Tests und Prüfwerkzeuge

Gleiche Befehle und Werkzeuge wie bei TTL, Bildschirmfotos über `tools/shot.mjs` mit Layout-Koordinaten.

```sh
npm test               # Regelwerk, Wertung, Kartengenerator, Ereignisse, Speichern, Schach, Sudoku, ganze Touren
npm run build          # TypeScript und Produktionsbündel
npm run test:skat      # Liga ohne Bildschirm, schreibt docs/balance-skat.md
npm run test:tour      # ganze Touren mit Spielpolitik: Länge, Sprit, Mark, Siegquote je Schwierigkeit
npm run test:e2e       # Browserabläufe in 1366×768 und 1920×1080
npm run test:readable  # Mindestgrößen für Schrift, Karten und Klickflächen auf jedem Bildschirm
npm run test:assets    # alle Verweise aus Inhalten auf Bilder, Töne und ids
npm run test:media     # jedes Bild und jeden Ton im Browser dekodieren
npm run test:narrative # jedes Ereignis und jeden Ausgang rendern, Text im Rahmen
npm run test:soak      # hundert Skatspiele in einer Seite, Speicher und Bildzeit
```

Automatische Prüfungen zeigen, dass nichts kaputt ist. Ob es ihm Spaß macht und ob er jeden Bildschirm versteht,
zeigt nur ein Probespiel mit ihm oder jemandem in seinem Alter.

---

## 13. Code-Architektur und Zuständigkeiten

```
src/main.ts                  Start, Schleife                                     (Lead)
src/core/*                   aus TTL: screen, input, gfx, font, ui, assets,      (Lead)
                             audio, scene, rng, save, palette
src/game/types.ts, ids.ts    gemeinsame Datenverträge                            (Lead)
src/skat/rules/*             Karten, Geben, Reizen, Ansage, Stiche, Wertung,     (Skat)
                             Hausregeln
src/skat/ai/*                Löser, PIMC, Reizen, Drücken, Charaktere, Worker    (Skat)
src/skat/table/*             Tisch-Szene, Hand, Reizdialog, Liste, Sprechblasen  (Skat)
src/skat/problems/*          Stammtisch-Aufgaben: Laufzeit und Szene             (Skat)
src/chess/*, src/sudoku/*    Regeln, Erzeuger, Szenen                            (Rätsel)
src/tour/*                   Tourzustand, Kartengenerator, Ereignis-Laufzeit,    (Tour)
                             Läden, Hunde, Tourenbuch, Speichern, Lauf ohne Bildschirm
src/screens/*                alle übrigen Bildschirme aus §7                     (Tour)
src/data/*                   Hausregeln, Stammgäste, Hunde, Andenken,            (Tour, Skat)
                             Bierdeckel, Ausbau, Fahrzeuge, Getränke, Schwierigkeit
src/content/*                Ereignisse, Sprüche, Namen, Hilfe, Tourenbuch       (Text)
public/packs/*, profile      Ortspaket und Standardprofil                        (Text, Lead)
art-src/, tools/art/         Krea-Pipeline, Prompts, Manifeste → public/art/     (Art)
tools/sprites/               Sprites → public/sprites/                           (Sprites)
audio-src/                   Musik und Geräusche → public/audio/                 (Audio)
tools/*.mjs, tools/balance/  Prüfwerkzeuge und Läufe ohne Bildschirm             (Lead und jeweiliger Bereich)
docs/                        contract.md, framework.md, requests/, balance-*.md
```

- Reine Module (Regelwerk, Computergegner, Kartengenerator, Ereignis-Laufzeit, Schach, Sudoku) importieren nichts
  aus dem DOM und nutzen `.ts`-Endungen in relativen Importen, damit `node --test` sie ausführt.
- Alles Zufällige läuft über `core/rng.ts` mit Startwert. Tourzustand und Spielstand sind versioniert.
- Entwicklerszenen wie bei TTL über `/?dev=<name>`, zum Beispiel `?dev=table&seed=42&rule=ramsch`.
- Fehlende Bilder und Töne haben einen sauberen Code-Ersatz, nie ein kaputtes Bild.
- Auslieferung als statische Seite über den GitHub-Pages-Workflow von TTL (siehe §16 Hosting).

---

## 14. Meilensteine

Jeder Meilenstein endet mit etwas Spielbarem. Art und Audio laufen ab M1 parallel und liefern in den Code-Ersatz
hinein.

| | Inhalt | Fertig, wenn |
|---|---|---|
| **M0 Gerüst** | Projekt anlegen, `core` übernehmen, neue Palette und Schriften, Namenseingabe, Küche als Startbildschirm, Prüfwerkzeuge, Pages | `npm run dev` zeigt die Küche in beiden Auflösungen, `npm test` und `build` laufen |
| **M1 Karte und Rätsel** | Kartengenerator, Tourzustand, Sprit und Mark, Stellplatz, Sudoku, Schach, Speichern, Stilstudie für die Optik | eine Etappe ist mit Rätseln statt Wirtshäusern von Start bis Ziel spielbar, die Optik ist an den Probebildern abgenommen |
| **M2 Skattisch** | vollständiges Regelwerk, Tisch-Szene, Reizen, Drücken, Liste, gegen Zufallsgegner | ein Mensch kann jede Spielart regelgerecht spielen, eine Million Zufallsspiele ohne Regelverstoß |
| **M3 Computergegner** | Löser, PIMC, Reizen, Drücken, Charaktere, Liga, Aufgaben-Erzeuger | Abnahme nach §5.4 bestanden oder Entscheidung für den Ausweg |
| **M4 Wirtshaus und Preisskat** | Runden, Hausregeln, Stammgäste mit Sprüchen, Preisskat, Bierdeckel | eine ganze Tour über drei Etappen ist spielbar |
| **M5 Inhalte** | 108 Ereignisse, Hunde, Andenken, Werkstatt, Flohmarkt, Motorradtreff, Gespann, vier Regionen, Tourenbuch, Probefahrt | alle ids aus §4 und §8 sind im Spiel, kein Platzhaltertext |
| **M6 Art und Audio** | alle Lieferungen aus §9 bis §11 | kein Code-Ersatz mehr sichtbar oder hörbar |
| **M7 Alpha** | Balance über Tour-Läufe, Lesbarkeit, Probespiel, Auslieferung | alle Befehle aus §12 grün, ein Probespiel ohne Erklärung von außen |

---

## 15. Was dieser Plan bewusst nicht enthält

- Kein Mehrspieler, kein Online-Konto, keine Ranglisten.
- Kein Schach gegen den Computer, nur Aufgaben.
- Kein Geld, keine Käufe, keine Werbung.
- Keine Sprachausgabe.
- Keine Bedienung per Touch in der Alpha (Tablet später möglich, das Layout lässt es zu).

---

## 16. Offene Entscheidungen

1. **Wo ist daheim?** Vaihingen, Enzweihingen oder Waldrennach. Bestimmt die Heimatregion und den Startort.
2. **Welches Blatt?** Französisch, deutsch oder Turnierfarben als Voreinstellung. Am besten das aus dem Skat-Palast.
3. **Ortslisten gegenlesen.** Die Orte in §8 sind ein Entwurf aus dem Gedächtnis.
4. **Wie stark ist er im Schach und im Sudoku?** Bestimmt die voreingestellten Stufen.
5. **Wie streng?** Voreinstellung Gemütlich oder Sportlich für die erste Tour.
6. **Hochdeutsch oder Schwäbisch?** Wie stark die Stammgäste schwäbeln.
7. **Hosting.** Vorschlag: öffentliche Seite mit dem neutralen Standardprofil, das persönliche Profil wird einmal
   als Datei importiert und bleibt im Browser. So steht nichts Persönliches im Netz. Alternative: eigener Server.
8. **Überraschung oder nicht?** Davon hängt ab, ob er beim Probespiel in M7 selbst am Laptop sitzt.
9. **Titel.** SKAT AUF TOUR ist ein Arbeitstitel.
10. **Lizenz.** Krea-Bilder sind nicht für kommerzielle Nutzung freigegeben. Für ein privates Geschenk passt das.
11. **Welche Maschine?** Marke, Typ und Farbe seines Motorrads. Das Bild bleibt ohne Markenzeichen, soll aber
    aussehen wie seine.
12. **Wie derb?** Entschieden (4. Oktober): Trinken nur als leiser Witz, keine Spielmechanik. Schwäbisches
    Schimpfen am Tisch ausdrücklich erwünscht („Seggl“, „Granateseggl“, „Grasdackel“), liebevoll und für alle.
