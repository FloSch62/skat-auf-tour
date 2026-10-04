# Notes of the Tour workstream

Decisions taken where the contract leaves room (contract §0: choose what is clearer and kinder for a player of
almost seventy, note it, go on). Code: `src/tour/*`, `src/data/*` (except `characters.ts`), `tools/balance/tour-runs.ts`.

## Module map (all pure, `.ts` imports, tests next to each module)

| module | what |
|---|---|
| `util.ts` | `TourEnv` (pack, profile, name, events, book, today), seeded `rngFor(...)`, pack lookups, German number words |
| `ledger.ts` | every fuel/Mark change, the route log, empty-tank rescues, `endTour` |
| `map.ts` | stage generator + `validateStage`, tutorial map, layout constants (`MAP_LAYOUT`, `MAP_CONFIG`) |
| `state.ts` | `newTour`, `newTutorial`, `tourPhase`, `moveTo`/`arrive`, detours, `mapView` visibility, `regionChoices`, `enterStage`, `pendingRoundConfig`, `beginRound` |
| `economy.ts` | `ECONOMY` config, inn/bikers/special round, Preisskat, puzzles, pitch, `finishStation` dispatcher, `chooseBeerMat` |
| `perks.ts` | `tablePerks`, `listBonus`, `roundConfig`, `specialRoundConfig`, `puzzleConfig` |
| `events.ts` | conditions, placeholders, picking, pre-rolling, presenting, outcomes, `resolveChoice`, `validateEvents` |
| `shops.ts` | flea market, garage, dog meadow (offers rolled on arrival, kept in `tour.station.offer`) |
| `book.ts` | Tourenbuch: statistics, album, stamps, trophies, rank, unlocks |
| `save.ts` / `backup-dom.ts` | versioned (de)serialisation, migrations, `migrate(run, book)`, backup JSON / file dialog |
| `sim.ts` | headless tours: `SkatModel` seam, stub model, policy, `simulateTour` |
| `fixtures.ts`, `testkit.ts` | own event fixture; node-only loader for pack/profile (tests and tools only) |

## The flow for the screens

1. Kitchen → `newTour({ seed, difficulty, vehicle, dogs, pack, profile, book, events })` (or `newTutorial`).
2. Map: `mapView(tour)` (state per node: here / visited / road / detour / ahead / passed, `revealed` for inn details),
   `canMove(tour, id)` (cost, free reason), `moveTo(tour, env, id)` → `Arrival` (lines, pitch outcome, event, offer,
   new stamp).
3. Station by `currentNode(tour).kind`:
   - inn / bikers / tournament: `pendingRoundConfig(tour, settings, env)` → Skat table (`beginRound`, save after
     every game) → `finishStation(tour, env, { kind, round })` → `StationOutcome` (lines, deltas, place, pot,
     driver/shepherd, beer mat choice, trophy, next event, ended). After a Preisskat win: `chooseBeerMat`.
   - problem / chess / sudoku: `puzzleConfig(tour)` (attempts, magnifier hints, `presolved`, `freeCells`) → station →
     `finishStation(..., { kind, solved, attempts | size })`.
   - event / dog meadow / bikers' talk: `tour.station.event` → `presentEvent` → `resolveChoice` → `EventResult.next`
     (another event; `{ kind: "skat" }` → `pendingRoundConfig` + `finishStation({ kind: "skat" })`; a puzzle).
   - market / garage / dogs: `marketOffer` + `buySouvenir`, `garageOffer` + `buyUpgrade` + `fuelOffer` + `buyFuel`,
     `dogOffer` + `takeDog` (all return `ShopResult` with a German reason or a `needsReplace` flag).
   - pitch: fuel is applied on arrival; the awning puts a free problem into `tour.station.puzzle`.
4. `tourPhase(tour)`: `map` | `station` (something still to do) | `region` (`regionChoices`, `enterStage`) |
   `tutorial-done` (`completeTutorial`) | `ended` (Abrechnung from `tour.route`, `tour.stats`, `tour.trophies`).
5. `pauseOffered(tour)` at every pitch and after every Preisskat. `saveTour`/`saveBook` after every station and game.

Every consequence writes one German line into `tour.route` (with fuel, Mark and, at Skat stations, the list points) and
returns it: „Gasthaus Krone, Roßwag: Erster mit 212 Punkten, Pott +7 Mark“.

## Decisions

- **Visibility (§4.2).** House rule, regulars and stakes are revealed for nodes reachable in one move: by road, or by
  motorcycle when a detour is possible right now (that is "direkt erreichbar"). The road atlas adds the nodes two road
  steps ahead. Visited nodes and the Preisskat (its favourites are known) stay revealed. Station kinds are always
  visible.
- **Pitch guarantee (§4.2 "in Spalte 3 oder 4 von jedem Weg aus erreichbar").** Read as: on every road path, a pitch is
  one step away at column 3 (from the path's column-2 station) or at column 4 (from its column-3 station). The player
  can always choose a pitch; he is not forced to.
- **Inns per path: at least two, at most three (two in stage 3).** The upper bound is my addition to keep a stage
  inside 35–50 minutes (contract §1); stage 3 ends with the nine-game final. Tunable in `MAP_CONFIG.maxInnsPerPath`.
- **No character twice in one stage.** Nobody sits in inns of two different columns, so no route (detours included)
  meets anyone twice. Two inns of the same column may share a character only when the pool is used up (never on one
  path). Inn pool: the twelve regulars plus the two policemen; the Wirtin Lore stands in when everyone is taken.
  Opponents are drawn tier-first by the difficulty mix (weak/medium/strong/very strong).
- **Stakes.** Column 1 always small. Later columns and later stages ramp up (`MAP_CONFIG.stakes`,
  `stakesStageShift`). Pot ×1 / ×1,5 / ×2 (rounded); fuel for the third place ×1,5 **rounds down** (medium = 1 stroke,
  high = 2): consequences are rounded in the player's favour. "Sharp" and the beer mat "double pot" each double pot and
  fuel loss and stack; one table never costs more than 3 strokes.
- **"Eins aufs Haus"** is gone with the drinking change; the first place gets the pot.
- **Shepherd** (§4.12): once per stage the third place at an inn, the bikers' meeting or a special round costs no fuel
  (twice with the dog whistle). Not at the Preisskat.
- **Fridge**: once per stage, the first fuel loss is one stroke smaller ("ein Strich zurück"). Automatic and logged.
- **schnauzer-b (schnauzer-b)**: guest for the stage he is with you; "bringt Vesper mit: Tank voll" = when the tank runs
  empty, he fills it completely (once; twice with the whistle), then heads home. At the end of his stage he heads
  home anyway. One rule that works whether he comes from the kitchen or joins by the event "Besuch".
- **Postcard**: once per tour, an empty tank gives two strokes instead of the tow home. schnauzer-b helps first.
- **Detours** never empty the tank (not offered with fuel ≤ cost); none in the tutorial. Free: the rig always, the
  sidecar upgrade for the first detour per stage, Wolfshund wolfhound-a once per stage (twice with the whistle).
- **Aux tank** adds two strokes of capacity and comes full (+2 fuel).
- **Preisskat (§4.6, §4.14).** Losses: Gemütlich 0/2, Sportlich 1/2, Scharf 2/2 strokes for 2nd/3rd; the snack board
  caps the 3rd at 1. "Turnier ist Turnier": no house rule, no beer mats, no redeal, no forehand mat at the Preisskat;
  display helps (reading glasses, notepad, settings) and the dogs' table abilities still apply. In the final (stage 3)
  there is no fuel loss: the tour ends with or without the Wanderpokal. A table win: region trophy, 10 Mark, one beer
  mat out of three (not in the final), and the first win unlocks the Airedale.
- **List bonus.** The tour builds the player's complete `ListBonus` (house-rule evening + beer mats; zero at the
  Preisskat). The Skat round module gives the two opponents only the evening bonus from the house rule. Agreed with
  Skat (docs/requests/skat.md).
- **Kitty** (Skatkasse): the table settles it; the tour adds `RoundResult.marks` (may be negative).
- **Puzzles.** 4/3/2 Mark by the attempt that solved it; a fourth attempt (Airedale) pays 2 like the third. The
  chess clock adds 2 Mark to chess. Sudoku 6×6 +1 fuel, 9×9 +2 fuel and 2 Mark. The magnifier gives 1 hint per
  problem/chess puzzle; the pencil 2 prefilled sudoku cells, the Airedale 1 more (2 with the whistle).
- **Special rounds from events** run like an inn round (pot, third place −1 × stakes, shepherd) and continue with
  `onWin` (first place) or `onLose`. They are not counted as inn rounds for the unlocks.
- **Bikers' meeting**: house rule "sharp", opponents Biker-Manne and Biker-Uschi, the rig doubles the pot, then a
  `bike` event ("Benzingespräch").
- **Dog meadow**: offers up to two unlocked dogs that are not aboard (take or swap), then a `dog` event if one fits.
- **Flea market**: three souvenirs not owned; buying several is allowed while money and slots last; when full, one
  souvenir stays at the stall. Garage: up to three upgrades the vehicle can take (rig: only the aux tank).
- **Events.** Pools for an event station: region 4, anywhere 4, bike 1.5, dog 1.5 (only with a dog aboard). Pre-rolled
  at map generation with static conditions (region, vehicle, profile, dogs, `dogLocked`); re-picked on arrival when the
  pre-rolled one no longer fits. No repeats in a tour; `once` events are remembered in the book (`BookState.events`).
  Placeholder fallbacks when the profile is empty: {partner} „die Familie“, {child} „der Nachwuchs“, {van} „das
  Wohnmobil“, {bike} „die Maschine“, {dog} „der Hund“, {name} „Kamerad“.
- **Schultes and Amtsbote** (contract §4.5): in one stage of about 85 % of tours (`MAP_CONFIG.duoChance`, the stage
  picked by the tour seed) they take over one inn of columns 2–5 together, named Ratskeller / Rathausstube / …, room
  `village` or `clubhouse`. They are not in the inn pool otherwise. The preview card says „Heute sitzen der Schultes
  und sein Amtsbote am Stammtisch.“ Tested over 600 tours (always together, never column 1, at most one per tour).
- **Album "Bilanz"**: games played together, and rounds he finished ahead of / behind that character.
- **Statistics**: `byKind` counts his own declared games by kind plus passed/Ramsch games at his table; highest game,
  Grand Hand, Schneider, Schwarz count his won declared games; `defenceWon` games he defended and the declarer lost.
  Games are recorded when the round finishes (an abandoned half round is not counted).
- **Rank**: thresholds come from `RANKS` in `src/content/texts.ts` (Text): Geselle 1, Meister 5, Altmeister 12
  trophies (repeats count). See the open question below.
- **Tutorial**: home → weak inn (der junge Rolf, Schwätzer-Sigi, nach Skatordnung) → kiosk → chess board → pitch; no
  fuel loss, no detours, not counted as a tour in the book (stamps and statistics are kept).
- **Region order**: after stages 1 and 2, `regionChoices` offers two of the remaining regions (stable per tour seed).
  Stages 2 and 3 start at the region's first place along its travel direction.
- **Map layout**: x by column (72…888), y by row inside 110…400 with ±14 jitter: the top HUD keeps 0–64, the "Was
  jetzt?" bar 476–540 free (icons ~56 high plus a name line).

## Balance (docs/balance-tour.md)

**The Skat stub is calibrated on the real AI.** `src/tour/skatstats.ts` holds the measured play of all 28 figures
(docs/balance-skat.md: declares, wins, Grand/Null/Hand shares, list points against two medium figures). The stub
(`src/tour/sim.ts`) draws each game from those numbers; it reproduces every figure's measured list points within
0.7 points (RMSE, test in sim.test.ts). The player is a good club player (declares 30 %, wins 77.5 %, 18.2 list points
per game, between the strong and very strong figures). Coupling: declarer win chance −0.004 per list point the
defenders are stronger than a medium figure; opponents at depth d: win chance +0.1 × (d − 1), list rating +8 × (d − 1).

**Stub against the real AI** (`tools/balance/tour-skat-check.ts`: whole rounds through src/skat/rules/round.ts and
the real AI, Bahner Willi — measured like the "good" profile — stands in for the player at depth 1, inn tables from
generated maps, finals against the favourites; 90 inn rounds and 40 finals per cell, ±5 / ±8 points):

| | real 1st / 3rd | stub 1st / 3rd |
|---|---|---|
| Gemütlich (0.6) inn / final | 38 % / 26 % · 40 % / 20 % | 45 % / 21 % · 36 % / 30 % |
| Sportlich (1) inn / final | 36 % / 24 % · 38 % / 35 % | 39 % / 25 % · 34 % / 32 % |
| Scharf (1.4) inn / final | 36 % / 27 % · 25 % / 45 % | 35 % / 29 % · 29 % / 40 % |
| final at depth 0.3 / 1.8 | 43 % / 23 % · 18 % / 45 % | 40 % / 25 % · 23 % / 45 % |

The fit error is within sampling noise. Findings: **a lower depth hardly weakens the AI** (0.3 ≈ 0.6 ≈ 1 within noise),
**a higher depth clearly strengthens the favourites** (1.8: the player wins the final only 18 %).

**Decision: Scharf depth 1.4 → 1.8** (src/data/difficulty.ts). Skat is asked to check decision times there
(docs/requests/skat.md). Gemütlich stays at 0.6.

**Result** (2000 tours per difficulty, good club player): **tours won 38 % / 36 % / 23 %**, tank empty 0.3 % / 1.1 % /
11 %, 29 % of Scharf tours touch the last stroke; stage length 46 / 46 / 51 minutes (10th–90th percentile 39–55).
Inn rounds won 44 / 40 / 34 %. A casual player (12 list points per game) wins 29 / 24 / 14 % of tours.

**Open:** Gemütlich and Sportlich are close (38 vs 36 %). The Wanderpokal is decided by the nine-game final against the
favourites, and the real AI is barely weaker at depth 0.6. Tour-side levers (tank, pot, fuel losses) move tour wins
by only 1–2 points, because pitches are always in reach and the shepherd absorbs a loss per stage. To make Gemütlich
clearly easier, the AI would need to play weaker below depth 1 (more mistakes, not just fewer samples) — asked of
Skat. Strength labels vs. measurement: tier 1 is clearly weak, but tiers 2–4 overlap (11–22 list points), and the
"medium" Wirtin Lore (21.6) and Wachtmeister (20.0) play like the strongest figures; reported to Skat.

## Screens (src/screens/newtour.ts, map.ts, book.ts, src/screens/tour/*)

| file | screens |
|---|---|
| `newtour.ts` | Neue Tour: Probefahrt offer (very first tour), difficulty, vehicle (after the first Wanderpokal), dogs, "Alles gepackt?" with the partner's goodbye |
| `map.ts` | Etappenkarte: atlas sheet (calmed), tour roads, stations, place names, camper/bike marker driving, top bar (fuel, Mark, luggage buttons, Menü), preview card with "Hinfahren" / "Mit dem Motorrad hin", `continueTour` |
| `book.ts` | Tourenbuch: Umschlag, Pokale, Stempel, Album, Hunde, Andenken, Chronik, Statistik |
| `tour/session.ts` | the session (tour, book, env), `persist` after every step, the **router** `route(app, s)` that picks the screen from the saved state |
| `tour/common.ts` | backdrops with fallbacks, station frame (title plate, fuel/Mark/Menü, bottom-anchored "Was jetzt?", main button), item icons, luggage overlay, sound loops, stable line picks |
| `tour/inn.ts` | Wirtshaus, Motorradtreff, Preisskat and special rounds: the Skat area's table (`createTableScene`) with intro sentence, stakes and {title}; the round result (Liste, pot, fuel, dry line) |
| `tour/tournament.ts` | Preisskat ceremony (region trophy / Wanderpokal), beer mat out of three, region choice |
| `tour/puzzles.ts` | Stammtisch-Aufgabe, Schachbrett, Kiosk: intro (what it pays, skippable at a puzzle station), the Rätsel/Skat scenes, payout |
| `tour/stations.ts` | Stellplatz (crickets or rain, pause, the awning's free problem), Hundewiese, Flohmarkt, Werkstatt |
| `tour/event.ts` | Unterwegs: comic panel (art or code panel), blue answers, outcome, chains / special rounds / puzzles |
| `tour/homecoming.ts` | Heimfahrt am Haken, Abrechnung (route, Liste, numbers, trophies), Probefahrt done |

**Resume.** Every change is saved at once (`persist`: `"run"` and `"book"`). The router reads only the saved state:
ended → tow/Abrechnung; region phase → region choice; a station with an open event, a pending special round, an
unplayed Skat round (mid-round: straight back to the table, `TourState.round`), an open beer mat choice, an event
puzzle, or a shop/pitch/puzzle station not yet left → that screen; else the map. Tested by the playtest (reload in
the middle of a round → "Tour fortsetzen" → the same table at "Spiel 2 von 3"). The Probefahrt is saved too.

**Decisions.**
- The Skat table has its own round panel (inn name, intro, house rule, both regulars with portraits). So the map goes
  straight to the table; the tour hands it the intro line (room / Motorradtreff / Preisskat / event) plus what is at
  stake (pot, fuel; Preisskat: what 2nd and 3rd cost) and the {title}. After the table's places, the tour's result
  screen shows the Liste again with the consequences.
- **Map layout is schematic** (columns left to right, rows by the perpendicular coordinate). The atlas painting
  (maps/<region>) draws real roads and settlements at the real place positions; drawn under a 55 % paper veil it
  reads as calm atlas texture under the tour's roads. Open question for Lead (docs/requests/lead.md).
- The station icons come from the `icons` atlas (`station-<kind>-<state>`), luggage from `items`, markers from `van`.
- "Was jetzt?" strips are anchored at the bottom and grow upwards when a sentence needs two lines.
- Puzzle stations get a short intro (flavour, what it pays, what the souvenirs/dogs add) with "Weiterfahren" to skip
  ("Nicht gelöst kostet nichts"); event puzzles and the Probefahrt have no skip.
- The flea market seller has no character id: her portrait is the code fallback for `flohmarkt`.

**Dev routes** (`src/tour/dev.ts`, nothing is saved): `?dev=map&seed=3&stage=1&difficulty=sporty`,
`?dev=station&kind=<kind>[&result=1|2|3]`, `?dev=event&id=<id>`, `?dev=region`, `?dev=beermats`,
`?dev=end&outcome=empty|won|lost-final`, `?dev=newtour`, `?dev=tutorial`, `?dev=book`. `?autoplay=1` (any route)
lets the Skat table play the player's seat too.

**Checks.** `tools/qa-routes.json` has 33 tour routes (all pass `node tools/readable-qa.mjs tour` at 1366×768 and
1920×1080). `node tools/balance/tour-playtest.mjs [--stages 1|3] [--tutorial]` plays through the real UI by its click
targets with `?autoplay=1`, reloads mid-round to test "Tour fortsetzen", and writes screenshots and a log to
`tools/shots/tour/play*/`. Other agents' edits make the dev server reload the page; run it against a static build:
`npx vite build --outDir <dir>` + `npx vite preview --outDir <dir> --port 4291`, `SAT_URL=http://127.0.0.1:4291`.
