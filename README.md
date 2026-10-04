# SKAT AUF TOUR — Die Enztal-Tour

Ein Skat-Roguelike mit Landkarte: mit dem Wohnmobil durchs Enztal, von Wirtshaus zu Wirtshaus. Skat nach der
Internationalen Skatordnung als Hauptsache, Schach und Sudoku als Abwechslung. Gemacht für einen Skatspieler, der
fast siebzig ist und noch nie ein Videospiel gespielt hat: alles mit einem Linksklick, kein Zeitdruck, große Karten.

**Spielen:** https://flosch62.github.io/skat-auf-tour/ (im Browser, am besten am Laptop mit Maus)

- Design und Produktionsplan: [`docs/contract.md`](docs/contract.md)
- Wie der Code geschrieben wird: [`docs/framework.md`](docs/framework.md)

```sh
npm install
npm run dev        # http://127.0.0.1:5191
npm test           # reine Module (Regelwerk, Computergegner, Tour, Schach, Sudoku, Inhalte)
npm run build      # TypeScript prüfen und dist/ bauen
```

Prüfungen (Vertrag §12): `npm run test:readable` (Klickflächen und Platzhalter auf allen Bildschirmen),
`npm run test:narrative` (jedes Ereignis, jede Antwort), `npm run test:media` (alle Bilder und Töne dekodieren),
`npm run test:e2e` (Probefahrt und erste Etappe per Klick, beide Auflösungen), `npm run test:soak` (100 Skatspiele),
`npm run test:tour` (Tour-Balance ohne Bildschirm), `npm run test:skat` (Liga der Computergegner),
`npm run test:assets`. Entwicklerszenen öffnen mit `/?dev=<name>`; die Liste steht in `tools/qa-routes.json`.

Das persönliche Profil (Heimatort, Hundenamen, Familie) liegt nicht im Repository. Es wird im Spiel unter
Einstellungen → Spieler → „Profil laden …“ als Datei geladen und bleibt im Browser.

Bilder: gemalt mit Krea 2 (Krea-2-Community-Lizenz, nicht für kommerzielle Nutzung) und nachbearbeitet. Musik:
eingespielt mit YuE2. Geräusche: im Programm erzeugt, Raumklang von freesound.org (CC0 und CC BY 4.0, siehe
`THIRD_PARTY_NOTICES.md`). Lizenz des Codes: GNU GPL v3 (siehe `LICENSE`). Schriften: SIL Open Font License.
Schachaufgaben: Lichess (CC0).
