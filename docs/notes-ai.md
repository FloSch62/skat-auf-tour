# Notes of the Skat AI (milestone M3)

The computer opponents in `src/skat/ai/` (pure TypeScript, no DOM, `.ts` imports, tests next to the modules). They
only ever see a `SeatView` (contract §0.3): no module of the browser path reads hidden cards; `positionFromState` is
used only in tests and the problem generator. Difficulty comes from thinking depth and character (contract §4.5,
§4.14), never from the cards. Measured numbers: `docs/balance-skat.md` (league), reviewed games:
`docs/balance-skat-games.md`.

## How the table uses it

```ts
import "../ai/index.ts";                 // once (src/skat/table/ai.ts does this lazily): installs the AI
import { getAiPlayer } from "../ai/api.ts";
const action = await getAiPlayer().decide({ view: viewFor(state, seat), character: "maurer", depth, seed, tournament });
```

- `index.ts` installs the Web-Worker player in the browser (`installWorkerAi()` from `client.ts`, idempotent) and the
  in-thread player (`localAi`) in node. `api.ts` is unchanged (the stand-in stays as the fallback).
- `client.ts` (`WorkerAi`): one module worker (`new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })`),
  requests carry ids, answers may come in any order. If the worker cannot start or throws, the same decision is computed
  in the main thread (identical result). `lastMs` / `lastNote` give the worker's thinking time and its reason (for a dev
  overlay). `dispose()` ends the worker.
- `decide(req)` / `decideWithNote(req)` (`decide.ts`): synchronous, pure, deterministic. Always returns an action from
  `req.view.legal` (perks `peek`/`takeBack` are never chosen). The note is English, for logs only. `insight`
  (`{ declarerWins }`, also `WorkerAi.lastInsight`) is the declarer's win chance as the deciding seat saw it after
  card-play, discard, Hand and Kontra/Re decisions — for the speech situations "robbed"/"blunder"/"selfBlame"
  (an overbid needs no AI: `GameResult.overbid`).
- `seed` drives every random choice; budgets are samples × nodes, never the clock: the same request always gives the
  same action, in node, in the worker and after a reload.
- Decisions are fast (median well under 10 ms, the slowest — bidding, Hand/skat and discard — a few hundred ms): the
  table should add its own short "thinking" pause for a natural rhythm.

## Modules

| module | what |
|---|---|
| `dds.ts` | open-card solvers: `PointSolver` (Augen, suit/Grand/Ramsch), `TrickSolver` (Null: no trick; Schwarz/Durchmarsch: every trick) |
| `knowledge.ts` | from the view: bidding facts (what each seat said / refused), cards played per seat, roles |
| `infer.ts` | world sampling for PIMC with inference weights (bidding, declaration, discard, a King lead) |
| `heuristics.ts` | rules of thumb for card play: the baseline's play and PIMC's tie-break |
| `pimc.ts` | Perfect-Information Monte Carlo card play, Kontra/Re win chance |
| `handeval.ts` | rules of thumb for hands: strength per kind, thumb bid, discard candidates |
| `bid.ts` | hand valuation by solving sampled worlds, bid limit, Hand games and announcements |
| `discard.ts` | Drücken + declaration after picking up (candidates by thumb, ranked by solving) |
| `ramsch.ts` | Ramsch/Schieberamsch: danger of a hand, shove or pick up, passing cards, Durchmarsch, rollouts |
| `persona.ts` | the 26 characters as parameter sets, difficulty scaling |
| `decide.ts` | the dispatcher per phase |
| `baseline.ts` | the rule-based opponent without lookahead (league yardstick) |
| `worker.ts`, `client.ts`, `index.ts` | Web Worker, browser client, installation |
| `problemcheck.ts` | verification of Stammtisch problems (generator, tests, validate tool) |

## Open-card solver (`dds.ts`)

- Alpha-beta over single cards; one seat (declarer) against two cooperating seats. Value = Augen the solo seat still
  takes. Because every outcome (won with 61, Schneider 90, declarer Schneider ≤ 30) is a monotone function of these
  Augen, the exact value answers every threshold; a null-window search (`atLeast`, `testAfter`) answers one cheaply.
- Transposition table only at trick boundaries, keyed by the remaining-card mask + leader (the hands are fixed inside one
  search, so that identifies the position): lower/upper bounds + best card, 2^18 entries, cleared in O(1) by a
  generation counter. A larger table did not reduce nodes noticeably and was slower (cache misses).
- Equivalent cards collapse: same follow class, same owner, same Augen and no card still in play (hands or current
  trick) between them in trick order (Kreuz-Bube/Pik-Bube once nothing lies between; 7-8-9). Null: adjacent in Null
  order. Ace and Ten are never merged (different Augen).
- Move ordering: card from the table; leading: top cards of a class (the solo seat: top trumps first), then a low card
  to the partner's top card, then low cards; following: smear on the partner's trick when last, win cheaply / with
  Augen against the opponent, otherwise the lowest Augen. The last trick is evaluated directly. Tried and dropped: a
  history heuristic (no gain).
- Node budget instead of the clock (`aborted` flag); weak figures use a horizon (`setHorizon(tricks)`) beyond which
  the remaining Augen are split by card strength — they "rechnen flacher".
- Speed (node 24, Ryzen 9 7900X3D): 25–30 M nodes/s; Chromium runs the same bundle at 28–30 M nodes/s. A whole deal
  (30 cards): null-window test median ≈ 3 000 nodes, average 40–70 k, tail up to ~3 M (≈ 2–3 ms average); the exact
  value with full window ≈ 1–2 M nodes (30–70 ms); exact values for every first card: 7 tricks left ≈ 1.6 ms, 6 left
  ≈ 0.4 ms.
- Tests (`dds.test.ts`): exact values, null-window tests and per-card values against brute-force minimax on 120 random
  endgames (suit, Grand, Ramsch, 3–4 tricks, partial tricks), the trick solver against brute force for Null and
  Schwarz, equivalence, budget abort.

## Card play (`pimc.ts`)

- Candidate cards are grouped by equivalence that holds in every world (from the viewer's knowledge: no unplayed card
  between them); one representative per group is searched.
- Worlds (`infer.ts`): `sampleWithVoids` deals the unknown cards consistent with hand sizes, open cards, the known skat
  and shown voids; `pool × count` candidates are weighted and `count` worlds kept by systematic resampling (duplicates
  merged). Weights:
  - bidding: a seat that passed at value v rarely holds a hand a careful player would bid to v (×0.12–0.3); a seat
    that bid holds some game (×0.25–0.6) — soft, styles differ;
  - the declared game: the declarer's ten cards plus the skat usually reach the bid (×0.08 if not), a suit declarer has
    5–6+ trumps (4: ×0.25, 3: ×0.05), a Grand declarer two or more jacks, a Null declarer few unsafe cards;
  - the discard: never jacks (×0.03), rarely trumps (×0.15) or a side Ace;
  - a read from the play: leading the King of a plain suit while Ace and Ten are out means the Ten is behind it (or the
    King was alone) — worlds without it ×0.25 (×0.4 for a singleton King). Found by reviewing a game where a defender
    smeared a Ten into the declarer's Pik-Zehn.
- Valuing a world: the outcome of a suit game or Grand depends only on the declarer's final Augen through 31 / 61 / 90.
  Early (more than `exactTricks` tricks left) every candidate is classified by two null-window searches (61, then 90 or
  31); later the exact Augen are computed and count 0.1 list points each (keeps a margin, never gives Augen away for
  nothing). Each class is turned into list points with the real settlement (`settle`, matadors from the world,
  overbid, announced levels, Kontra/Bock factor, Seeger-Fabian ±50). The declarer maximises, defenders minimise.
- Budget: every candidate card gets the same share of the world's node budget. A search that runs out counts as
  undecided (half way between the two classes it separates, half a win in Null). The first version dropped a world when
  its budget ran out — 21.5 % of the world weight in the first three tricks, and always the close worlds; keeping
  them costs no time.
  Null and Schwarz angesagt use the trick solver.
- Ramsch: everyone plays for himself, so the two-against-one search does not fit (it assumes both others load Augen
  on me and then sees every card as equally bad). Each candidate is played out in every world with the Ramsch rules of
  thumb for all three seats (stay under, unload danger, low leads), valued with the real settlement (the loser pays,
  doubled per Jungfrau); in the last four tricks the exact two-against-one value is mixed in. Durchmarsch: with the
  trick solver, go for it when ≥ 70 % of the worlds allow it, and stop someone else's when the choice matters.
- Ties (cards the search values the same) are broken by the rules of thumb (`heuristics.ts`): smear Augen on the
  partner's safe trick (in the middle seat only when the declarer can hardly be void), keep a guarded Ten, give the
  fewest Augen when losing the trick, pull trumps as declarer, cash aces before the defenders can trump, never lead an
  unguarded Ten as defender.
- Plausibility guard: where the rules of thumb strongly disagree with the search (score gap ≥ 15, e.g. an Ace given
  away instead of a Seven), the search must be better by 1.5 standard errors in a paired test over its worlds, or the
  rule of thumb plays. Found in the game review: der Erwin threw ♠A on a trick the declarer had already trumped,
  because one or two of 12 worlds favoured it; with 60–150 worlds ♠7 was clearly better. Applying the test to every
  decision cost the declarer 2.6 points of win rate on the same 600 deals; restricted to strong disagreement 1.3 points.
- Hopeless after picking up: when every game looks lost the plan takes the cheapest loss — sometimes a Null at 23
  ("billig verlieren", e.g. der Erwin with ♣A ♣K ♣D and no jack) — unless the soft measure shows a game coming close.
- Slips: with the persona's error rate the second-best card is played instead, but only if it is at most
  `errorTolerance` list points worse — plausible, never absurd. Beginners (der junge Rolf) also forget who is out of
  trumps (sampling ignores trump voids) and sometimes smear in the middle seat while the declarer can still take the
  trick.

## Bidding, Hand, discard (`bid.ts`, `discard.ts`)

- A hand is valued per promising kind (rules of thumb preselect up to three; preferences of the figure widen the
  choice): worlds with a random skat and random other hands, the skat is picked up, two cards laid away by the rules of
  thumb, and the solver decides the game from Vorhand's lead. Cached per hand and position (seeded from them), so every
  bidding step of a game agrees.
- **Calibration (the key finding):** open-card play is pessimistic for the declarer — defenders who see every card
  defend perfectly. Against the medium figures' real PIMC play, "the solver gives the declarer at least 61" predicted
  far too few wins (games with an estimated 10–20 % were won 45–60 % of the time). Testing "at least 61 − 9 = 52 Augen"
  (and 81 for Schneider) was close to calibrated (log-loss 0.77 → 0.58; slack 12 was similar but less useful for
  ranking). Valuations therefore use `VALUATION_SLACK = 9`; announcements (Schneider, Schwarz, ouvert) always use the
  strict thresholds. Null: the solver plays every Null as if ouvert; a world also counts as won when the hand left
  has no unsafe card by the every-other-card rule (`nullDanger`).
- Bid limit: the highest bid value whose chance (won and worth at least that value, matadors over hand + skat) reaches
  the figure's threshold. Base threshold 0.42 (tuned in the league: 0.66 → 32 % passed deals, 0.42 → 2–7 % passed and
  ≈ 80 % won), weak figures −0.04, Null −0.15 for everybody.
- Hand games: only looked at with a strong hand; announcements only when certain against perfect defence (Schneider
  ≥ 90 % of the worlds at 90 Augen; Schwarz in every world; ouvert = Schwarz certain in 16+ worlds). Hand is chosen
  when it promises `handMargin` (default 25) list points more than picking up.
- Discard: every kind is first tried with its rule-of-thumb discard on a few of the worlds (a rule-of-thumb ranking of
  kinds alone once chose Pik with four trumps over Herz with five); the two best kinds then get their three best pairs
  played out over the same defender worlds (weighted by the defenders' passes), screened on a third of the worlds first.
  The ranking is "soft": a lost world in which the solver still gives the declarer 44 (36) Augen counts half (a fifth)
  a win — with only lost-looking options on a handful of worlds the planner otherwise chose the cheapest loss (Karo 18
  with four trumps instead of Herz with six). The plan depends only on the twelve cards, bid and bidding, so the later
  declaration agrees with it. A figure's favourite kind (Grand-Helmut +80 list points, Null-Eugen +45, Schultes +20)
  is added only to candidates with a real chance (≥ 35 %), never to a hopeless game.
- Node caps per search in valuations (220 k nodes); a capped search counts as half a win, alternating
  deterministically.

## Kontra / Re

- A defender says Kontra before his first card when the declarer's chance (same worlds and solver, from the
  position, with the valuation slack) is below the figure's `kontra`; the declarer says Re when his own chance is at
  least `re` (0.8–0.88).
- Measured: with a threshold of 0.22 on the strict estimate the defenders said Kontra in 71 % of the declared games
  and won only 21 % of those. Against real outcomes the defenders' estimate is barely informative: estimates below 10 %
  still meant 67 % declarer wins, 10–20 % → 73 %, 30–45 % → 88 % (174 estimates). Kontra pays only below 50 %, which no
  bucket reaches, so Kontra is reserved for hopeless-looking games: the defender needs three trumps (Grand: two
  jacks), the estimate uses twice the worlds with a sharper read of the declarer's hand, and the threshold is 0.01
  (medium), 0.005 (Maurer-Karle, Oberlehrer Walter), 0.03–0.04 for the bold (der Erwin, 's Schlitzohr Fritz, Kommandant
  Heiner, Amtsbote Gottfried). Result: Kontra in about 6 % of the declared games, won by the defenders in about 60 %
  (docs/balance-skat.md).

## Characters (`persona.ts`)

All 28 characters (the 26 of the contract plus the Rathaus duo) have a persona. Strength sets the base (samples per decision 6 / 12 / 16 / 22, node budget 1.5 / 6 / 9 / 12 M per decision, horizon 2
tricks for the weak, error rate 22 % / 5 % / 1.5 % / 0, bid samples 8 / 12 / 16 / 20, discard 4 / 10 / 12 / 12 worlds).
Style on top:

| figure | style parameters |
|---|---|
| Maurer-Karle | bids carefully (threshold +0.24), defends with 18 worlds and no slips, Kontra almost never |
| der Erwin | bold (−0.12) and 35 % of his hands go two bid steps beyond his limit; likes Hand; Kontra/Re readily |
| Frau Gerda | strength 3, more worlds and inference candidates, no slips |
| Null-Eugen | Null threshold −0.32, looks at Null with more holes, prefers Null by 140 list points even at 5 % chance |
| Grand-Helmut | Grand threshold −0.24, suit games +0.05, prefers Grand by 80 list points (from 25 % chance) |
| der junge Rolf | weak; forgets who is out of trumps, no inference, 25 % slips, smears early (50 %) |
| Schwätzer-Sigi | weak, bids loosely (−0.04) |
| Oberlehrer Walter | careful (+0.06), Hand only with a big margin, no slips as declarer |
| ’s Schlitzohr Fritz | strength 3, a little bold, likes Hand, announces Schneider at 80 %, Kontra readily |
| Kommandant Heiner | bold (−0.06) and fast (8 worlds as declarer, 10 bid samples), Kontra readily |
| die Wirtin Lore | the medium reference |
| der alte Gottlob | strength 4, 24 worlds |
| favourites | strength 3–4; Wengerter careful (+0.06), Flößer bold (−0.05), Wasenwirt −0.02, Schaffnerin 26 defence worlds, Klosterwirt 24 worlds |
| side figures | Wachtmeister careful (+0.08), Biker-Manne bold (−0.07) and overbids sometimes, Lehrling 28 % slips |
| Schultes Häfele | the vain mayor: bold (−0.10), 25 % of his hands one bid step beyond, Grand −0.12 and +20 — but plays like a solid medium figure |
| Amtsbote Gottfried | his sly clerk: strength 3 like ’s Schlitzohr Fritz (likes Hand, Schneider at 80 %, Kontra readily), more inference candidates, no slips |

`AiRequest.depth` (difficulty: Gemütlich 0.6, Sportlich 1, Scharf 1.4) scales samples (and the node budget up to
×1.5), the horizon of weak figures, and divides the error rate.

## Baseline (`baseline.ts`)

Bids by counting (trumps, jacks, aces, guarded tens, voids; `thumbBid`), lays away by `discardScore`, declares the best
rule-of-thumb kind, plays `heuristicCard`, never Kontra/Re. No search at all.

## Stammtisch problems (`tools/skat-problems/`, `problemcheck.ts`)

- Endgames: positions from rule-of-thumb games with four or five tricks left (seat rotated so the player is seat 0)
  where exactly one card reaches the goal (win, Schneider, Schwarz, defend, no trick) — every legal card solved
  exactly; the station's own solver (`src/skat/problems/solve.ts`) agrees (checked in `problems.test.ts`).
  Difficulty: 1 = the rules of thumb find it with few choices, 3 = they miss it with five tricks or many choices.
  Explanations come from solver facts: the trick after the solution with best play (trump pull, smear, ruff, let it
  run, give the lead away) and the final Augen after the solution and after the most tempting wrong card.
- Discard: a playable game by the rules of thumb, every sensible pair (no jacks, no trumps in suit games) screened on
  16 worlds, the best eight on 64 worlds (declarer seat rotating, seeded from the problem id). Kept when the best pair
  wins ≥ 8 percentage points more often or earns ≥ 8 list points more than the second-best pair. Difficulty from the
  rank of the solution among the rule-of-thumb candidates.
- Bid: the range from a careful bidder (chance ≥ 0.60) to a bold one (≥ 0.35) with 48 worlds; explanations give the
  game value with mit/ohne as a club player counts it.
- `tools/skat-problems/validate.ts` re-checks every problem with the same code; `npm test` checks a sample.
- The generator collects a pool (endgames 3×, discards and bids up to 3× the need) and then picks an even spread over
  the difficulties with at most a third of one game kind.
- Bundled pack (2026-10-04): **300 problems** — 150 endgames (difficulty 1/2/3: 25/63/62; goals: defend 76, win 27,
  Schneider 45, Null no trick 2; mostly suit games because the source games are rule-of-thumb games), 75 discards
  (35/34/6), 75 bids (30/29/16, all ranges within the station's grid up to 96). Generated in 22 min (4 processes),
  validated in 6 min: 0 errors. Every endgame also agrees with the station's own solver.
- Bid problems follow the solver's valuation, which is sometimes more careful than table lore (e.g. four jacks with
  weak side suits in Hinterhand: Karo mit 6 = 63 instead of a Grand) — worth a look by a club player.

## Measured (definitive league, 2026-10-04, docs/balance-skat.md)

- 19,922 games in 89 min (4 processes, nice 15). Medium (die Wirtin Lore) against two equals: 77.9 % of 1,918 declared
  games won, 0.21 % overbid, 4.1 % of the deals passed in; Grand 33 %, Hand 7.6 %, Null 3 %.
- Against the rule-based baseline (10,002 games, duplicate deals): 24.5 vs 12.5 list points per game; duplicate
  difference 12.7 ± 1.2 per deal.
- Times: node p95 208 ms over 536,826 decisions (laptop estimate ×2.2 ≈ 458 ms); Chromium with the real worker p95
  144 ms, max 580 ms (584 decisions, ratio to node 0.92). The slowest kind of decision is the discard (p95 815 ms in
  node, ≈ 1.8 s on a slow laptop), the strongest figures at depth 1.4 reach p95 406 ms.
- Strength (list points per game against two medium figures): 1.9 / 16.3 / 17.8 / 18.6 for strength 1–4; Lore herself
  21.6. Weak figures are clearly weaker; strong and very strong ones win more of their games (up to 83 %) but bid and
  play Hand slightly more carefully and so do not score more than the medium reference. A lower Hand margin for
  strength 3–4 was tried and made them worse (18.2 → 16.9) — reverted.
- Kontra: 5.6 % of the declared games, defenders won 52 %. Ramsch (forced, 300 games each): losses spread evenly over
  the three figures; Jungfrau 46 / 36, Durchmarsch 1 / 3.

## Open points

- PIMC's known limits remain (strategy fusion; it does not signal or read signals beyond the King lead and the
  bidding). Reviewing `docs/balance-skat-games.md` with a club player is the real test.
- Strong figures are not yet clearly stronger than the medium reference in list points (see above). Candidates: more
  worlds in the first tricks, a sharper inference of the declarer's hand for defenders (the defenders' estimate of the
  declarer's chance is too gloomy, see Kontra), better Hand decisions.
- Null is the weakest game (won about 60 %): the solver plays every Null as if ouvert.
- Schwätzer-Sigi's tells are the table's job (src/skat/table/talk.ts); the AI does not play differently because of
  them.
