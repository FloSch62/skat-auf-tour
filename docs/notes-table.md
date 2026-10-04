# Notes of the table workstream (Skattisch and Stammtisch problems)

Code: `src/skat/table/` (table scene, overlays, speech, card drawing), `src/skat/problems/` (station scene, solver, fixture),
`tools/soak.mjs`. Rules come only from `src/skat/rules/` (docs/skat-api.md), the opponents only through the AI seam
`src/skat/ai/api.ts` with a `SeatView` (contract §0.3).

## Entry points

```ts
// src/skat/table/scene.ts
createTableScene(app, {
  progress: RoundProgress,          // startRound(config) or a saved progress (resumes after the last finished game)
  onProgress(p: RoundProgress): void, // after every finished game and after a redeal: save it
  onDone(r: RoundResult): void,       // once, after "Weiter" on the places
  playerName?: string,                // default settings.name
  title?: "Lehrling" | "Meister",     // {title} in the regulars' lines
  intro?: string,                     // a sentence for the round panel (the tour knows the place; RoundConfig does not)
  stakes?: StakesId,                  // shown on the round panel
  tutorial?: boolean,                 // Probefahrt: calm notes for bidding, drücken, Ansage, playing, last trick, Liste
  dogs?: DogId[],                     // travelling dogs as scenery beside the table
  auto?: boolean, speed?: number,     // dev/soak: AI plays the player's seat too, panels continue, pauses × 1/speed
}): Scene

// src/skat/problems/scene.ts
createProblemStation(app, { seed, attempts /* 3, Airedale 4 */, hints /* Lupe 0|1 */, onDone({ solved, attempts }) }): Scene
```

Both scenes never pop themselves. The problem station's `attempts` result follows the chess station: solved → the
attempt that solved it (1 = first try); unsolved → number of wrong answers. Neither scene names Mark or Sprit — except
the Skatkasse sentence on the places (house rule `kitty`), which is part of the table rule itself.

## Flow of a round

Round panel (inn name, the tour's intro, **"Hier gilt:" + house rule name and full text** — contract §0.3 — the two
regulars with portrait and style sentence, stakes, active perks) → per game: deal 3 – Skat – 4 – 3 (three
`card-deal` sounds) → [redeal offer, only while a redeal is left: "Behalten" / "Neu geben"] → bidding → Skat or Hand →
drücken → Ansage → play → result panel → … → places → `onDone`.

`onProgress` is called the moment a game is finished (before the result panel), so closing the browser on the panel
loses nothing. A redeal saves at once (`useRedeal`), so a reload cannot bring the old deal back. A game in progress is
not saved; on resume the same deal comes again (the deal seed depends only on the round seed and game index).

## Layout (960×540)

| Where | What |
|---|---|
| top corners, 300×160 | the regulars (art study, Lead): portrait 3× = 144×144, name (two lines if long), position + bidding word or role, card count, fanned backs; ouvert: the open cards in two rows instead |
| top centre 324×84 | the Tafel (slate): game number · house rule, then the bid or the game, then declarer and bid; Kontra/Re in chalk |
| under the right panel | Menü (846, 176) — the top-right corner itself belongs to the right regular; the declaration panel ends left of it (x 30–838); Menü, "Letzter Stich" and "Liste" are drawn last, above every panel |
| under each panel | one speech bubble at a time; the right one stays left of the Menü |
| centre | the trick: three cards turned −6…+6° (seven pre-drawn stages, cached HD canvases, LRU of 48) |
| centre, bidding | the Skat big (peeked card face up); during play it lies small beside the trick |
| left middle | Lesebrille/Notizblock panel: jacks and the trump suit, fallen ones struck through, own ones in gold; Augen of both parties |
| y 304 | the decision row: two big buttons (200×52) — "18 sagen"/"Passe", "Ja"/"Passe", "Ich spiele"/"Passe", "Skat aufnehmen"/"Hand spielen", "Schieben", "Drücken", "Weitergeben" |
| y 358–392 | the "Was jetzt?" sentence, always; it grows upwards when it needs two lines |
| bottom | the hand, 72×108 cards, centred in x 150–810; 10 cards step 65, 12 cards step 53 (each visible slice ≥ 44 wide) |
| bottom left | the player's plate (name, position/role), Kontra!, Re!/Kein Re (beside the hand, so the trick in the middle stays visible), Karte zurück (wolfhound-b), Doch nicht (unlift), Skat ansehen (schnauzer-a, at the button row) |
| bottom right | Letzter Stich, Liste |

Panels (round, result, places) are paper sheets sized to their content with the "Was jetzt?" line below them at
y 494. The declaration panel (888×258) has three rows: the six games (suit symbol, name, value — a range in Hand games
because the unseen Skat counts for the matadors — and "reicht" / "reicht nicht" / "je nach Skat"), the toggles the
Skatordnung allows (Hand: Schneider, Schwarz, Ouvert; with the Skat: only Null ouvert), and "Doch Skat aufnehmen" /
"Kreuz ansagen". Choosing a game and confirming are two clicks on purpose (no misclicked Grand).

## Decisions

- **Two clicks to play by default**: the first lifts the card (26 up, gold frame) and the sentence says "Klick die
  Karte noch einmal"; "Doch nicht" lowers it. `settings.oneClickPlay` plays at once. Playable cards stand 12 higher,
  unplayable ones are veiled and not clickable.
- **Discard**: two clicks select, a third click replaces the older choice, "Drücken" confirms. The two cards that came
  from the Skat keep a green frame until then.
- **Jump bids**: "Höher …" opens the next twelve values; the main button is always the next value.
- **Pace** (settings.pace slow/normal/fast): AI decisions wait at least 1.5/1.0/0.6 s (bidding, card), 2.2/1.5/0.9 s
  (Skat, drücken, Ansage); a finished trick stays 1.9/1.3/0.8 s, then slides to the winner. A speech line is read
  before the next AI acts. Nothing ever waits for the player with a clock.
- **Take-back (wolfhound-b)**: while the player's last card can be taken back, the next AI waits 2.8/2.2/1.6 s longer and
  the sentence says "Du kannst deine Karte noch zurücknehmen."
- **Redeal** is offered after the deal, before anybody bids, only while one is left (one decision, two buttons).
- **Peek (schnauzer-a)**: a button during bidding until the player's own first bid; the card shows face up in the Skat.
- **Speech**: one bubble at a time. When a line itself opens with the action word ("Passe. Des Blatt …"), the word is
  not repeated; the line's own words get the colour (`mergeHead` in text.ts, tested). Bids show the word in red ("20.", "Ja.", "Passe.") and now and then a line; the
  game is named in blue before a `declare` line; Kontra/Re as a red word before a `kontra` line; trick comments 14 %;
  an `order` line between games 30 % (not at the Preisskat); `greet` once; `ramsch` when Ramsch starts; game won/lost
  as a quote on the result panel, `farewell` on the places. `{name}`/`{title}` filled.
- **Schwätzer-Sigi** (35 % per game, at the start of bidding): only true tells — long suit (≥ 4 cards, unique),
  a suit he has no card of (jack included), or a TELL_HINTS entry whose `when` holds (`talk.ts`, tested in
  `talk.test.ts` over 400 deals).
- **Lautwörter**: KLATSCH when a jack falls (25 %; 60 % for Grand-Helmut, Kommandant Heiner, Biker-Manne,
  Wasenwirt; 15 % for the player), RUMMS for a trick of 30+ Augen (50 %), ZACK when an ace is trumped (35 %); at most one
  word per 1.5–2 s.
- **Sounds**: shuffle, card-deal ×3, card-play (±4 % rate), card-raise, trick-take, skat-pick, bid/pass, knock (Ansage,
  Kontra, Re), list-write, win/lose-sting, cheers/glass-clink on the places, `inn-murmur` loop, music
  `stammtisch`/`preisskat`.
- **Result panel**: a friendly sentence, the value as a club player counts it ("Kreuz mit zwei, Spiel drei, Hand
  vier: 4 × 12 = 48.", overbid/Kontra/Bock lines), "Gewonnen mit 78 Augen: +48.", the Skat (or what was pressed), the
  Liste change and new totals per player, a regular's quote.
- **Liste overlay**: one row per game — number, game ("Kreuz mit 2 Hand · Erwin"), value, the three list changes
  (Prämie from beer mats/evenings noted under the number), **the seed of the deal** (contract §0.3); totals; Skatkasse;
  pages of nine rows.
- **Names**: plates and sentence starts use `characterNameStart`; sentences are built so a name is always the subject
  (German cases: "Der alte Gottlob hat den Stich bekommen", never "an der alte Gottlob"). Narrow places use the last
  word ("Erwin", "Fritz"); a regular whose short name equals the player's keeps his full name. Women get "sie"/"ihr".
- **Glasses** are scenery only (contract §0.9): each regular's drink at the table edge, the player's Stammgetränk
  beside his plate, never empty.
- **Menu** (`createGameMenu`, help page "house-rules"): while it, the Liste or the last trick is open, the table
  pauses (the scene manager only updates the top scene).

## Probefahrt (tutorial) and dogs

- `tutorial: true` (the tour passes it for the guided first trip): the first time each moment comes, a paper note
  "Probefahrt" with the text of `TUTORIAL.steps` (src/content/texts.ts) — `bid` at his first bidding decision,
  `discard` when he holds the Skat, `declare` inside the declaration panel (the free part of the toggles row), `play`
  at his first card, `lastTrick` after the first trick (with a pulsing frame around "Letzter Stich"/"Liste"), `list`
  as a blue paragraph on the first result panel. The note lies over the Tafel (nothing clickable there, clear of
  cards, bubbles and buttons) and has a "Verstanden" button; it also goes away when he acts. It never blocks and never
  acts for him. With one-click play the `play` note says "Klicke eine Karte an, dann liegt sie auf dem Tisch."
  (the second half of the step would be wrong then). In Hand mode the declaration panel has no room, so the
  `declare` note waits for a game with the Skat.
- `dogs`: painted `dogs/<id>` (and `dogs/<id>-ears` for ears up) at 144 units beside the table at the bottom right when
  every travelling dog has art (`hasArt`); until then the `items` atlas heads sit there, chins on the table. When a
  trick with a jack is taken they lift their heads for a moment; on the Alte (Kreuz-Bube) now and then a quiet
  "wuff" (`dog-bark-big`, the Airedale `dog-bark-small`).

## Stammtisch banter (contract §0.9)

`src/skat/table/banter.ts` (pure, tested in banter.test.ts with the legal hand-made cases of banterCases.ts) finds the
reasons after every trick, the scene picks at most one: never over another bubble, each regular at most every third
trick, by chance; the existing trick comments only come when there was no banter.

| situation | reason (who speaks → at whom) | chance |
|---|---|---|
| `blunder` | the last defender takes his partner's sure trick although he could have stayed under (partner → him) | 60 % |
| `blunder` | the player, last as a defender, lets the declarer's trick (≥ 10 Augen) through with a higher card of the led suit in hand (partner → player) | 50 % |
| `selfBlame` | a regular led a plain Ass and the other party trumped it | 50 % |
| `robbed` | a regular's Ass or Zehn went to the other party (him → the taker, the player too) | 40 % |
| `tease` | the defenders just reached 60 Augen: the declarer cannot win any more (a defender → declarer) | 50 % |
| `blunder` | the last defender did not follow and threw a blank card on his partner's sure trick (partner → him, lightly) | 20 % |

At the end of a lost or overbid declared game the result panel's quote is the declarer's `selfBlame` or the others'
`tease` (target: the declarer) before the usual gameWon/gameLost. Honest: every reason is on the table; where a hand
is consulted it only suppresses an unfair scolding (a partner who had to go over) or concerns the player's own cards;
lines that say "überreizt" are only used when the game really was overbid. `{target}` is the short name (the player's
name for him) via `fillTarget` (src/content/speech.ts), which drops it cleanly when there is none.

**Schultes and Amtsbote** at the same table: when the Schultes scolds, blames himself or teases (and for some trick
comments, the greeting, the result quote and the farewell), one of the 17 exchanges of src/content/speech-duo.ts is
used now and then: the Schultes's bubble, then the Amtsbote's answer after a short pause (the AI waits for it). Lines
that address the partner ("Gottfried", "Herr Schultes") are skipped when he is not at the table.

Dev: `/?dev=table-banter&case=overtake|smear|letThrough|robbed|aceTrumped|lost60[&opp=schultes,amtsbote]` plays the
provoking trick by script with banter forced on; `&end=lost` shows a lost game's result quote. Screenshots:
tools/shots/table/banter/.

## Painted art (2026-10-04)

All nine rooms (`inns/<room>`, 1920×1080, drawn with `cover`) and the nine painted portraits (288×288 → 144 units)
were checked mid-game at 1920×1080 and 1366×768: `tools/shots/table/rooms/<room>-<width>.png`. Plates, the Tafel,
bubbles, the trump panel and all buttons are opaque; the only text that sat directly on the painting ("Skat" beside
the trick) now has a dark backing. `room: "bikers"` uses the painted `inns/bikers`; without it `bg/motorradtreff`,
then the code meadow.

## Stammtisch problems

- `public/puzzles/skat-problems.json` (`SkatProblemPack`) is loaded; entries with a wrong shape are skipped; if
  nothing is left, the fixture (`src/skat/problems/fixture.ts`: 3 endgames, 2 discards, 2 bids) is used.
  `pickProblem(list, seed, type?)` is deterministic.
- `solve.ts` is a small exact alpha-beta over the rules' `Position` (4–5 tricks are instant). The fixture test proves
  that each endgame has exactly one winning card; the station uses it to explain a wrong card ("Herz-Ass reicht
  nicht. Damit kommst du bei bestem Spiel nur auf 52 Augen.").
- Look: the inn backdrop dimmed, the task on a slate, the attempts as pencil strokes on a beer mat (crossed out when
  used), open hands of Links/Rechts with their role, the trick, the Augen so far.
- Answers: endgame — two clicks like at the table; discard — two cards into two Skat slots, "Drücken"; bid — a grid
  of the bid values 18–96, pick one, confirm "Bis 30". Wrong answers say why (endgame), how many of the two cards are
  right (discard), or "zu hoch"/"zu niedrig" (bid).
- **Lupe**: once per problem — endgame: which suit or Trumpf to play (and those cards get a green frame); discard: one of
  the two cards; bid: the region around the right range on the grid.
- "Aufgeben" asks once ("Weiterknobeln" / "Lösung zeigen"); the result shows the solution and the explanation.

## Dev and checks

- `/?dev=table&seed=42&rule=ramsch&opp=maurer,zocker&games=3&deck=german` and flags `auto=1`, `speed=8`, `pace=fast`,
  `oneclick=1`, `start=1`, perks `peek=1 redeal=1 takeback=1 trumps=1 points=1 forehand=1`, `tournament=1`, `room=…`,
  `played=n` (resume after n quickly played games).
- `/?dev=table-result&kind=grand|null|ramsch|passed&declarer=0`, `/?dev=table-final`, `/?dev=table-liste&games=6&played=5`,
  `/?dev=table-ouvert&kind=null`, `/?dev=table-re` (a regular says Kontra to the player's Kreuz), `/?dev=problem&seed=1[&type=endgame|discard|bid][&hints=1][&attempts=4][&start=1]`.
- `window.__table` (stage, games, phase, current, history, bid, allowed games, last result, list) for drivers and the soak.
- `npm run test:soak` (`tools/soak.mjs --games 100 --speed 20`): AI in all seats, heap after a forced GC at game 2 and
  every 10 games, rAF frame times. 2026-10-04 on a `vite preview` build with the stand-in AI: 100 games in 163 s, heap
  3.2 → 3.9 MB (the 100 Liste rows), frames p50/p95/p99 17 ms, max 33 ms, none over 50 ms, no errors.
  Same run with the **real AI** (Web Worker, src/skat/ai/index.ts), 100 games in 376 s: heap 3.3 → 4.1 MB, frames p99
  17 ms, max 83 ms (3 frames over 50 ms), no errors. Decision times seen by the table (wall clock in the browser,
  3 897 decisions): p95 272 ms, max 863 ms, none over 1.5 s (contract §5.4). By phase (median / p95 / max): bidding
  6 / 289 / 499 ms, Skat or Hand 175 / 538 / 863 ms, drücken 476 / 748 / 779 ms, Ansage 5 / 6 / 9 ms, card play
  4 / 156 / 417 ms. The table's own pauses (pace) stay the rhythm; only a Hand or drücken decision now and then takes
  a little longer than the pause (≤ 0.9 s). `window.__aiStats` holds the numbers in any dev session. Run it against a `vite preview` build (`SAT_URL`) — the dev server reloads the page
  whenever another workstream saves a file.
- Readability routes: `table-intro`, `table-bidding`, `table-play`, `table-result`, `table-final`, `table-liste`,
  `problem-intro`, `problem-endgame`, `problem-discard`, `problem-bid` (all ≥ 44×32 at 1366×768 and 1920×1080).
- Full games were played through the real click targets (bidding, Skat and Hand, Null Hand, Kreuz Hand Schneider
  angesagt, Grand, Kontra/Re, Ramsch, Schieberamsch with shove and pass-on, peek, take-back, redeal, last trick, menu,
  one-click play, all three decks) without getting stuck.

## Open points / wishes

- Hunde unter dem Tisch (contract §4.12): `RoundConfig`/`TablePerks` do not say which dogs travel. If wanted, the tour can
  pass them and the table draws `art("dogs/<id>")` at the bottom left (request in docs/requests/lead.md).
- Sprites that would help (docs/requests/sprites.md): pre-drawn turned trick cards, a chalk-slate 9-slice for the Tafel,
  a round beer mat, a small "speech chip" for bidding words.
