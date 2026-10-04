# Art requests from the Text area

## Event images (contract §9: 40 × `public/art/events/<id>.png`)

Comic panels **256×128 art pixels, drawn 3×** (768×384 on screen), with a dark ink frame as in a comic strip.
Style as in contract §9: painted adventure backgrounds of the 1990s with ink contours, flat cel figures, warm
evening light, 1975–1989 Swabia. **No real people, no brands, no lettering** (signs stay blank; Lautwörter are
drawn by code on top). Keep the lower quarter calm: the event title may sit there. The cream camper with the
orange-brown stripe and the 1970s motorcycle without badges look the same in every panel (reference images).
Every image has a code fallback, so they can arrive in any order. Ids are listed with the events that share them
(ids from `src/content/events/`; the list is generated from the content, so it stays in step).

| Image | Motif | Used by |
|---|---|---|
| `events/road-enz` | Landstraße an einer Enzschleife, Weinberge am Hang, das cremefarbene Wohnmobil fährt nach rechts | `enz-viadukt`, `enz-schleuse`, `enz-bulldog`, `mue-loeffelstelz`, `mue-kanu`, `any-kassette`, `dog-bach` |
| `events/vineyard` | Steillagen-Weinberg mit Trockenmauern über der Enz bei Roßwag, ein Wengerter mit Rückentrage | `enz-lese`, `enz-kelter`, `enz-trockenmauer`, `stg-rotenberg` |
| `events/besen` | Besenwirtschaft: ein Reisigbesen über der Haustür, Holzbänke, Viertele im Henkelglas, Lampen im Hof | `enz-besen` |
| `events/cellar` | Gewölbekeller mit Holzfässern, aus einem Fass schießt ein Strahl Most, ein Mann hält den Daumen drauf | `mue-mostfass` |
| `events/village-square` | Dorfplatz mit Fachwerkhäusern, Brunnen und Rathaus, Tauben, das Wohnmobil parkt am Rand | `enz-kirchturmuhr`, `enz-brautkutsche`, `enz-sprudelkisten`, `mue-hammer`, `mue-briefe`, `swa-steintisch`, `stg-mineralbrunnen`, `any-turnierplakat`, `dog-geldbeutel`, `bike-gottlob`, `bike-lederhose` |
| `events/hocketse` | Hocketse: Bierbänke unter Lampions, Blechkuchen, Musiker mit Akkordeon, ein Kartentisch mit leerem Stuhl | `enz-schaeferlauf`, `stg-waldheim`, `any-hocketse`, `any-feuerwehrfest` |
| `events/pitch-evening` | Stellplatz am Abend: Wohnmobil mit Markise, zwei Campingstühle, Laterne, Grillen im Gras | `mue-klostersee`, `mue-sigi`, `swa-wandergruppe`, `stg-fernsehturm`, `any-reporter`, `any-dackel`, `dog-tierarzt` |
| `events/pitch-rain` | Regen prasselt aufs Wohnmobil, Blick von innen: Kaffeetasse, eine aufgeschlagene Zeitung, beschlagene Scheibe | `enz-hochwasser`, `mue-gewitter`, `any-regen`, `dog-regen` |
| `events/kehrwoche` | Kehrwoche am Stellplatz: eine Frau in Kittelschürze mit Reisigbesen zeigt streng auf ein Laubhäufchen | `any-kehrwoche` |
| `events/traffic-jam` | Stau auf der Landstraße in der Sonne, Autos der Siebziger, ein gelbes Umleitungsschild ohne Schrift | `enz-schnellbahn`, `stg-baustelle`, `any-stau` |
| `events/sheep` | Schafherde quer über der Straße, Schäfer mit Hut und Stab, das Wohnmobil wartet mit laufendem Motor | `mue-schafherde`, `dog-hueteprobe` |
| `events/police` | Zwei Dorfpolizisten in grünen Uniformen mit Kelle am grün-weißen Streifenwagen, das Wohnmobil hält am Rand | `stg-fussgaengerzone`, `any-kontrolle`, `any-blitzer` |
| `events/rathaus` | Fachwerk-Rathaus mit Freitreppe: oben ein eitler Schultes mit Amtskette und erhobenem Zeigefinger, daneben sein Amtsbote mit Aktenmappe und unbewegter Miene | `rat-einweihung`, `rat-parkverbot`, `rat-pokal`, `rat-ehrengast` |
| `events/exhaust` | Dorfwerkstatt: dem Lehrling fällt der Auspuff vom Motorrad vor die Füße, der Meister zuckt mit den Schultern | `bike-auspuff` |
| `events/petrol-station` | Kleine Dorftankstelle mit zwei Zapfsäulen, Ölkanistern und einem Tankwart im Kittel, am Rand lehnen drei Mofas | `mue-tankstelle`, `stg-tankwart`, `bike-mofa-rocker`, `bike-tankrucksack` |
| `events/bike-curves` | Ein Motorrad der Siebziger legt sich in eine Waldkurve, Fahrer mit Jethelm und Lederjacke | `bike-kurven`, `bike-fotograf`, `bike-gewitter` |
| `events/bike-meet` | Motorradtreff auf einer Wiese: Maschinen in einer Reihe, Zelte, Lagerfeuer, ein Kartentisch auf einer Kiste | `bike-treff`, `bike-lagerfeuer` |
| `events/bike-roadside` | Motorrad am Straßenrand mit offener Werkzeugrolle, der Fahrer kniet daneben, ein Bussard schaut zu | `bike-kickstarter`, `bike-platten` |
| `events/phone-booth` | Gelbe Telefonzelle am Dorfrand im Abendlicht, ein Mann mit Hörer am Ohr, Groschen in der Hand | `mue-wunschkonzert`, `swa-ehering`, `any-telefon-daheim`, `any-telefonzelle`, `dog-tierschutz` |
| `events/hungary-road` | Pappelallee in der Puszta, ein Ziehbrunnen, das Wohnmobil auf langer gerader Straße | `chain-ungarn-grenze` |
| `events/shelter` | Tierheim mit Zwingern, im letzten schaut ein großer grauer Irischer Wolfshund ruhig durch das Gitter | `chain-ungarn-tierheim` |
| `events/dog-meadow` | Hundewiese am Waldrand: Hunde toben, ein Ball fliegt, Besitzer mit Leinen in der Hand | `stg-killesberg`, `dog-rivale`, `dog-hundeschau`, `dog-dackel` |
| `events/dog-thief` | Ein Hund rennt mit einer Wurstkette im Maul davon, ein Metzger mit Schürze rennt hinterher | `swa-schinkendieb`, `dog-wurstkette` |
| `events/visit` | Ein Auto hält am Stellplatz, ein Riesenschnauzer springt heraus, auf dem Beifahrersitz ein Vesperkorb | `dog-besuch`, `dog-nachbarin` |
| `events/hitchhiker` | Tramper mit Rucksack am Straßenrand, unter dem Arm ein klappbares Schachbrett, Daumen raus | `any-tramper` |
| `events/kiosk` | Kiosk mit Zeitungsständer und Bonbongläsern, die Rätselseite des Lokalblatts liegt aufgeschlagen | `swa-sommerberg`, `any-gottlob-bank` |
| `events/inn-stube` | Wirtsstube: Stammtisch mit Schild ohne Schrift, Karten, Gläser, Kachelofen, ein Wimpel | `enz-gottlob`, `mue-faust`, `swa-streit`, `stg-papagei`, `any-skatkurs`, `any-erwin-wette`, `dog-stammtisch` |
| `events/van-breakdown` | Das Wohnmobil am Straßenrand mit offener Motorhaube, Dampf steigt auf, Warndreieck | `swa-steige`, `stg-hupe`, `any-keilriemen` |
| `events/monastery` | Kloster Maulbronn: Kreuzgang mit Brunnenhaus, Mauern aus Sandstein, ein Wirt in Schürze | `mue-maultaschen` |
| `events/railway` | Bahnknoten Mühlacker: Gleise, ein Stellwerk, ein langer Güterzug, eine Schranke ist unten | `mue-schranke` |
| `events/orchard` | Streuobstwiese am Stromberg: Apfelbäume, Leiter, Körbe voll Äpfel, ein Mostkrug im Gras | `enz-kirschen`, `mue-streuobst`, `swa-kirschen` |
| `events/forest-road` | Schwarzwaldstraße in Serpentinen, dunkle Tannen, Nebel im Tal, das Wohnmobil klein im Bild | `swa-nebel`, `swa-langholz`, `swa-saegmuehle`, `swa-zwoelfender` |
| `events/distillery` | Brennerei: glänzender Kupferkessel, Körbe mit Kirschen, kleine Gläser auf einem Holzbrett | `swa-brennerei` |
| `events/raft` | Ein Holzfloß auf der Enz zwischen Tannen, Flößer mit langen Stangen, Wasser spritzt | `swa-floesser` |
| `events/spa` | Kurpark Bad Wildbad: Kurhaus, Musikpavillon, Kurgäste mit Stock und Hut, die Enz plätschert | `swa-kurgaeste` |
| `events/wasen` | Volksfest auf dem Cannstatter Wasen: Festzelt, Riesenrad, Lebkuchenherzen ohne Schrift, Lichter | `stg-wasen` |
| `events/staeffele` | Stuttgarter Stäffele: steile Treppen zwischen Häusern, das Wohnmobil steht ratlos unten | `stg-staeffele`, `stg-zacke` |
| `events/city` | Stuttgarter Straßenkreuzung: gelbe Straßenbahn, Hochhäuser, das Wohnmobil eingekeilt zwischen Autos | `enz-falsches-vaihingen`, `stg-geldbeutel`, `stg-heimspiel` |
| `events/factory-gate` | Werkstor mit Pförtnerhäuschen, Schichtwechsel, Fahrräder und Henkelmänner, Fabrikhallen | `stg-schichtwechsel`, `any-werkstor` |
| `events/flea-market` | Flohmarkt: Tapeziertische mit Kram, ein Händler mit Schiebermütze hält eine alte Uhr hoch | `mue-mischmaschine`, `swa-uhrmacher`, `any-flohmarkt` |

40 images for 115 events (113 drawn events plus chain steps).

## Portraits

Events show `portrait` with a character id (the 26 table characters of contract §9, `portraits/<id>.png`).
No extra portraits are needed for events.
