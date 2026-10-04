# Notes of the Text area

Decisions where the contract leaves room (contract §16.6, §16.12 and the user's decision of 2026-10-04 on drinking),
and what other areas need to know about the text modules.

## Decisions

### How much Swabian (§16.6): moderate

- **The UI and the narration speak Hochdeutsch.** Event texts, choices, help, the tutorial and all labels are plain,
  short Hochdeutsch sentences, readable for a 70-year-old without game experience.
- **People speak with a moderate Swabian colour** that a non-Swabian can still read: one or two dialect markers per
  sentence, no phonetic spelling throughout. The markers we use: *isch* (ist), *net* (nicht), *des* (das), *i* (ich),
  *mir* (wir, sparingly), *a* (ein/eine), *a bissle*, *gell*, *heidanei*, *ha noi*, *ha jo*, *Grüß Gott*, *ade*,
  *schaffe*, *ebbes*, *glei*, *nomol*, *hock di na*, *gugg*, the *-le* diminutive (*Viertele*, *Stückle*, *Mäuerle*,
  *Vesperle*) and Swabian words (*Kehrwoch*, *Bruddler*, *Wengerter*, *Besen*, *Hocketse*, *Stäffele*,
  *Herrgottsbscheißerle*). No *Grombiera*-style spelling.
- Strength of colour differs by character: the old Gottlob and the Wengerter speak broader, Frau Gerda, Oberlehrer
  Walter, the Müllerin and the Schaffnerin speak nearly Hochdeutsch with a Swabian word here and there.
- Skat words follow the ISkO everywhere: Reizen, Passe, Hand, Schneider, Schwarz, Ouvert, Bube, Dame, König, Ass,
  Zehn, Stich, Trumpf, Liste, Augen, drücken, schmieren, Vorhand/Mittelhand/Hinterhand, Kontra/Re, Ramsch, Jungfrau,
  Durchmarsch. French deck names (Kreuz, Pik, Herz, Karo, Bube, Dame) also in speech; the German deck is only a look.

### How derb (§16.12): derb-herzlich, but clean

- Schrauber- and Stammtisch-humour, Lautwörter, Pannen mit Ansage, Meister and Lehrling. People laugh together;
  nobody is humiliated; the Lehrling's mishaps end with the Meister's „Des g’hört so.“, not with a dressing-down.
- Mild Swabian curses only and rarely: *Heilandsack*, *Herrgott nomol*, *Kruzifix*, *Sapperlot*. A burp is fine.
  No vulgar words, nothing sexual, no politics, no religion jokes beyond the well-known Maultaschen legend.
- Nothing from „Werner – Beinhart!“: no names, figures, catchphrases or jokes (the test rejects a list of them).
- No real companies or brands (test list), no real living people. Real places and landmarks only.

### Scolding at the table and the Rathaus duo (user wish 2026-10-04, contract §0.9, §4.5, §16.12)

- **Swabian scolding is wanted**, affectionate, and it hits everyone once, the player included: Seggl, Granateseggl,
  Allmachtsseggl, Grasdackel, saublöder Grasdackel, Halbdackel, Allmachtsdackel, Dackel, Bachel, Dubbel, Lällebebbel,
  Simpel, Hirbel, Rindvieh, Hornochs, Lappe, „Heilandsack“, „Kruzifix“. Stay Swabian (no Bavarian „Siach“,
  „Hundling“). Never about looks, origin or age; the scold is loud, the heart is warm.
- Every character scolds in his own voice: Frau Gerda in Augen and numbers, der alte Gottlob with one word, die
  Wirtin resolut-herzlich, der junge Rolf shyly and mostly himself, the favourites restrained in their image world,
  the police amtlich, Meister Kächele with „des g’hört so“, Lehrling Bernd blames himself.
- Scolding lines don't say „Bub“ or „Kerle“, because the target can be Frau Gerda, Biker-Uschi or the Wirtin.
- **The duo:** Schultes Häfele (vain, speeches, Amtsdeutsch, usually wrong) and Amtsbote Gottfried (dry, literal,
  „Jawohl, Herr Schultes“, wins). Tone of a dry village comedy (wordplay, things taken literally); nothing from any
  real show. The Amtsbote is the sober driver of the pair (Sprudel; `drink: "water"`).
- A little dry wordplay is sprinkled into other speech lines and a few events (the Erwin's „Augen“ bet, the
  crossword in the jam, „Drücken: Skat. Schmieren: Butterbrot.“, the Polier's „Abkürzung“).

### Drinking (user decision 2026-10-04, contract §0.9)

- **A quiet joke, never a mechanic.** No Pegel, no buying rounds, nobody plays differently because of a drink, no
  outcome makes anyone drunk. The word „Pegel“ does not appear (the test rejects it).
- Beer is „eine Halbe“ or „ein Weizen“, never „Helles“ (test). The Viertele, Most and a Kirschwasser in the Black
  Forest appear as scenery.
- **Whoever drives stays sober.** The player drives: in events he has Spezi, Sprudel or Kaffee; where he tastes
  something (Besen, distillery), the camper stays parked overnight. The bikers camp at the Treff, their machines stand
  in the meadow. The two policemen drink Sprudel and Spezi. The third place „bleibt trocken und fährt die anderen
  heim“ — that dry line stays (approved by Lead).
- `CharacterDef.habit` replaces the old level effect: one dry sentence of table humour per figure, only a few of them
  mention a drink.

### Names

- Polished in `src/data/characters.ts`. Changes: the Wachtmeister is **Wachtmeister Hägele** (the default dog name of
  `schnauzer-b` is already „Bruno“), the Klosterwirt is **Klosterwirt Eberhard**, the distiller **Brenner Ernst**.
  Schaffnerin Inge is a *retired* tram conductor (conductors had left Stuttgart's trams by the late 1970s).
- Names with an article („der Erwin“, „die Wirtin Lore“, „der junge Rolf“, „der alte Gottlob“) need a capital at the
  start of a sentence: use `characterNameStart(id)` from `src/data/characters.ts`.
- Drinks (scenery only) changed for the sober ones: der junge Rolf, Biker-Uschi and Lehrling Bernd have Spezi, the
  Wachtmeister Sprudel (`water`).

### Ranks and {title}

- `{title}` in speech is „Lehrling“ before the first trophy and „Meister“ afterwards (contract §4.5) — the regulars
  flatter. The Tourenbuch rank is stricter (`RANKS` in `texts.ts`): Lehrling 0, Geselle 1, Meister 5, Altmeister 12
  trophies (regional and Wanderpokal, repeats count). Tour may change the thresholds.

## Modules

| File | Exports | Notes |
|---|---|---|
| `src/data/characters.ts` | `CHARACTER_DEFS`, `characterName`, `characterNameStart` | names, `style`, `habit` |
| `src/content/speech.ts` | `SPEECH`, `SIGI_TELLS`, `TELL_HINTS`, `TellHintId` | regulars here, guests in `speech-guests.ts` |
| `src/content/events/*.ts` | `ALL_EVENTS`, `ALL_FLAGS`, `EVENT_DECKS`, `REQUIRED_EVENT_IDS`, `eventById`, `EVENT_ART` | 108 drawn events + chains |
| `src/content/help.ts` | `HELP_PAGES`, `HOUSE_RULE_TEXTS`, `GAME_VALUE`, `LIST_RULES` | Spielwert as data |
| `src/content/texts.ts` | `FIRST_START`, `KITCHEN`, `REGION_BLURBS`, `REGION_CHOICE`, `PAUSE`, `PITCH_LINES`, `DOG_MEADOW_LINES`, `MARKET_LINES`, `GARAGE_LINES`, `KIOSK_LINES`, `CHESS_LINES`, `PROBLEM_LINES`, `BIKERS_LINES`, `INN_NAMES`, `INN_ROOMS`, `INN_RULE_LEAD`, `INN_RESULT_LINES`, `TOURNAMENT_LINES`, `FINAL_LINES`, `TOURNAMENT_RULE`, `HOMECOMING_LINES`, `TOW_LINES`, `BOOK`, `RANKS`, `SPEECH_TITLES`, `TUTORIAL`, `CREDITS`, `fillText`, `pickLine` | placeholders listed in the file header |

### Speech situations

- **Scolding situations:** `blunder` (someone spoilt the speaker's trick or plan), `robbed` (his Ass or Zehn was just
  taken), `tease` (the declarer just lost or overbid) may address `{target}`; `selfBlame` (he spoilt it himself) never
  does. `{target}` = short name of the one addressed, only as a vocative at the very start („{target}, du Seggl!“)
  or the very end („Du Granateseggl, {target}!“). `fillTarget(line, target?)` in `speech.ts` fills it or drops it
  cleanly. Regulars and the duo have 4 lines per scolding situation, everybody else 3.
- **The duo** (`speech-duo.ts`): a full set (4 lines per situation). Lines that address the partner contain the word in
  `DUO_PARTNER_WORD` („Gottfried“ / „Herr Schultes“); skip those when the partner is not at the table.
  `DUO_EXCHANGES` holds two-bubble exchanges (Schultes first, Amtsbote answers), keyed by the Schultes's situation.

- `bid` lines carry no numbers (the table shows the bid), `declare` lines name no game type, Hand or Ouvert (the
  table shows the game), `kontra` lines fit both Kontra and Re and don't contain those words (the table shows the
  word). `order` is light and varied (Brezel, Kaffee, Sprudel, Spezi, Maultaschen, now and then a Halbe, a Weizen or a
  Viertele); favourites have no `order` lines (Turnier ist Turnier). There is no `level` situation any more.
- Regulars have 3–6 lines per situation, favourites and side characters 2–3. Lines are at most 110 characters.
- **`tell` (Schwätzer-Sigi only):** `SPEECH.schwaetzer.tell` = `SIGI_TELLS.long` + `.void` + `.hint`. In `long`
  lines `{suit}` is the suit he holds most cards of; in `void` lines `{suit}` is a suit he has no card of; in `hint`
  lines `{hint}` is the `text` of a `TELL_HINTS` entry that is true for his hand (`when` says when). `{suit}` is the
  suit name as shown for the chosen deck. The Skat area picks a true tell; how often is its choice (his style says
  „manchmal“).

### Event conventions

- Pools: `region` (+`region`), `anywhere`, `dog`, `bike`; `chain` events are only reached through `next`,
  `skat.onWin`, `skat.onLose`.
- Placeholders: `{name}`, `{title}`, `{place}`, `{home}` always; `{partner}`, `{child}`, `{note}` only with
  `requires.profile`; `{dog}` only with a dog requirement on the event or on the choice (then it means that dog);
  **`{dog:<id>}`** = the profile name of that specific dog (used by the unlock events for dogs not yet travelling).
  `{van}` and `{bike}` only with a `profile: "van" | "bike"` requirement (the default profile leaves them empty).
  `{bike}` is a nominative phrase („eine rote Zweizylinder aus den Siebzigern“), so it only stands where a
  nominative fits („Da steht sie: {bike}.“). It is used in two hidden choices (`bike-kurven`, `bike-gewitter`,
  `req: { profile: "bike" }, hideIfUnmet: true`), so both events stay neutral without it.
- `chronicle` lines may contain the same placeholders; Tour fills them when it writes the line.
- Every event has at least one choice without a requirement. Choices that cost Mark carry `req: { marks: N }`.
- Art: every event names one of the 40 ids in `src/content/events/art.ts`; `docs/art-requests.md` lists them with
  the events that share them.

### What is in the decks (state of 2026-10-04)

| Pool | Events | File |
|---|---|---|
| region `enztal` | 16 | `events/enztal.ts` |
| region `muehlacker` | 16 | `events/muehlacker.ts` |
| region `schwarzwald` | 16 | `events/schwarzwald.ts` |
| region `stuttgart` | 16 | `events/stuttgart.ts` |
| `anywhere` | 20 | `events/anywhere.ts` |
| `dog` | 12 + 1 twin | `events/dogs.ts` |
| `bike` | 12 | `events/bike.ts` |
| `chain` | 2 | `chain-ungarn-grenze`, `chain-ungarn-tierheim` in `events/dogs.ts` |

108 drawn events, 1 profile twin (`dog-nachbarin`), 4 extra Rathaus events (`events/rathaus.ts`, pool `anywhere`,
counted outside the quota through `EXTRA_DECKS`: `rat-einweihung`, `rat-parkverbot`, `rat-pokal` with a Skat round
against the duo, `rat-ehrengast`) and 2 chain steps: 115 events. 21 events offer a special Skat round, 17 a puzzle, 79 blue answers in all,
4 beer mats (`any-gottlob-bank`, `mue-faust`, `swa-streit`, `bike-treff`), 2 upgrades (`bike-gottlob`,
`swa-saegmuehle`).

- **Chains and flags.** „Sonderfahrt nach Ungarn“: `dog-tierschutz` → `chain-ungarn-grenze` → `chain-ungarn-tierheim`,
  only through `next`, no flags. Two small flag chains inside a region: `lese-geholfen` (set in `enz-lese`, opens a
  hidden choice in `enz-besen`) and `schaefer-freund` (set by the shepherd in `mue-schafherde`, opens a hidden choice
  in `mue-gewitter`). Both read-side choices use `hideIfUnmet: true`.
- **Camper only** (`requires: { vehicle: "camper" }`, they are about the camper itself): `mue-hammer`, `swa-steige`,
  `swa-wandergruppe`, `swa-zwoelfender`, `stg-staeffele`, `stg-fussgaengerzone`, `stg-hupe`, `any-regen`,
  `any-keilriemen`, `any-blitzer`, `any-kassette`. Bike events avoid the word Wohnmobil, so they fit the Gespann.
- **Profile events:** `any-werkstor` (note), `any-telefon-daheim` (partner), `dog-besuch` (child).
- **Twins:** a twin is the neutral counterpart of a profile event (`requires.noProfile`). Only one of the pair can come
  up, so twins don't count toward the pool quotas (the test checks that each twin has its profile event in the same
  pool). `dog-nachbarin` („Besuch von der Nachbarin“: the neighbour goes to the Kur and leaves the Riesenschnauzer for
  a stage) unlocks `schnauzer-b` for profiles without a child.
- **Unlock starters carry `dogLocked`:** `dog-besuch` and `dog-nachbarin` (`schnauzer-b`), `dog-tierschutz`
  (`wolfhound-a`). They stop appearing once the dog is in the Tourenbuch (the test enforces it for every unlock).
- **Variety pass.** The decks were written in parallel; afterwards duplicates across decks were replaced so a tour
  never meets the same story twice: one Keilriemen (anywhere), one Feuerwehrfest (anywhere), one wedding
  (`enz-brautkutsche`), one flea-market find (`any-flohmarkt`), one fog drive (`swa-nebel`), two thunderstorms in
  different settings, Gottlob's beer mat only once (`any-gottlob-bank`), Frau Gerda's notepad only once.
- **Dog names can be female** (profiles may give them female names): no pronoun refers back to `{dog}`; the texts
  repeat the name or say „der Hund“, „der Schäferhund“ first.
- Characters who serve are not named in speech („Frau Wirtin“ or nobody), because the Wirtin Lore is a regular who is
  not at every inn. Only the two policemen and the two bikers name each other — they always come as a pair.

## Lautwörter

Event texts and speech use only words that exist as sprites: RUMMS, RÖÖÖHR, ZISCH, GLUCK, TACKER, KRACH, WUFF, ZACK,
PLOPP, BRUMM, HUI, SCHEPPER, KLATSCH (PROST and KLIRR are free for the table). They stand in capitals inside the text,
e.g. „RUMMS. Der Auspuff liegt am Boden.“ No new sprites are needed.
- Lead edited CREDITS 'Gemacht mit' in src/content/texts.ts to state what is really used today (code-drawn images, synthesized sounds, no music yet). Update when GPU art/music lands.
