# Skat rules engine — API (`src/skat/rules/`)

Pure TypeScript, no DOM, importable from node tests and Web Workers. Everything is re-exported from
`src/skat/rules/index.ts`; import single modules (`./rules/game.ts`) in hot paths if you like. Rule decisions and
sources (ISkO paragraphs) are in `docs/notes-skat.md`.

Two layers:

| Layer | For | Modules |
|---|---|---|
| **Low level** — masks, tables, fast mutable `Position` with `play`/`undo` | solver (`dds.ts`), PIMC, problem generator | `cards.ts`, `play.ts`, `value.ts` |
| **High level** — immutable game state machine, actions, seat views, round | table scene, AI decisions, tour | `game.ts`, `view.ts`, `options.ts`, `round.ts`, `names.ts`, `list.ts`, `ramsch.ts`, `deal.ts` |

Seats: `0` = player (bottom), `1` = left, `2` = right. Play runs clockwise `0 → 1 → 2`. The dealer's left neighbour
`(dealer + 1) % 3` is Vorhand; the dealer is Hinterhand.

---

## 1. Cards and masks (`cards.ts`)

A card is an index `0…31`; a set of cards is an **int32 bit mask**.

```
bits  0– 6  Karo   7 8 9 D K 10 A     card = suit * 7 + slot   (suit 0 Karo, 1 Herz, 2 Pik, 3 Kreuz)
bits  7–13  Herz   7 8 9 D K 10 A     slot 0=7 1=8 2=9 3=Dame 4=König 5=Zehn 6=Ass
bits 14–20  Pik
bits 21–27  Kreuz
bits 28–31  Buben  Karo, Herz, Pik, Kreuz (card = 28 + suit)
```

Inside every suit the bits are in suit-game trick order and the jacks sit on top in trump order. So in suit games,
Grand and Ramsch the strongest card of a follow class is `highestCard(mask & rules.classMask[k])`. Null has its own
order table. Bit 31 (Kreuz-Bube) makes masks negative: build and compare them only with `| & ^ ===`, never `>>> 0`.

| Function | What |
|---|---|
| `popcount(m)`, `pointsOf(m)` (Augen, table-driven), `highestCard(m)`, `lowestCard(m)`, `cardsOf(m)`, `maskOf(cards)`, `bit(c)`, `has(m, c)` | mask helpers |
| `CARD_POINTS[c]`, `SUIT_MASKS[s]` (7 non-jack cards), `JACKS`, `FULL_SUIT_MASKS[s]` (with jack), `ALL_CARDS` (`-1`) | constants |
| `suitOf(c)`, `slotOf(c)`, `isJack(c)`, `cardOf(suit, slot)`, `jackOf(suit)` | card parts |
| `cardSprite(c) → { suit: SuitId, rank: RankId }`, `cardFromSprite(suit, rank)` | sprite ids from `src/game/ids.ts` |
| `parseCard("HT")`, `parseCards("CJ SJ HA")`, `cardCode(c)`, `maskCodes(m)` | short codes: suit `D H S C` + rank `7 8 9 T J Q K A` (`10` accepted) |

## 2. Names (`names.ts`)

```ts
cardName(parseCard("CJ"))                       // "Kreuz-Bube"
cardName(parseCard("CJ"), "german")             // "Eichel-Unter"   (Grün-Ober, Herz-König, Schellen-Daus)
cardName(parseCard("HK"), "german", { red: "Rot" }) // "Rot-König"
kindName("spades", "german")                    // "Grün"
declarationName(declaration("clubs", { hand: true, schneiderAnnounced: true })) // "Kreuz Hand Schneider angesagt"
matadorLabel({ count: 2, withTops: false })     // "ohne 2"
valueBreakdown(result)   // ["mit 2", "Spiel 3", "Hand 4", "4 × 12 = 48", "gewonnen: +48"]
actionLabel(action)      // "18", "Ja", "Passe", "Kontra", "Re", "Kreuz Hand", "Herz-Zehn" …
sortHand(mask, kind)     // display order: jacks, trump suit, other suits alternating colours, high → low
recordLabel(gameRecord)  // "Kreuz mit 2 Hand Schneider", "Null ouvert", "Ramsch, Jungfrau", "eingepasst"
POSITION_NAMES           // ["Vorhand", "Mittelhand", "Hinterhand"]
```

The French and the tournament deck use French names; `"german"` uses Eichel/Grün/Herz(Rot)/Schellen and
Unter/Ober/Daus.

## 3. Dealing (`deal.ts`)

```ts
deal(seed, dealer)        // { hands: [m0, m1, m2] by seat, skat: [c, c], dealer, forehand }
dealByPosition(seed)      // { hands: [Vorhand, Mittelhand, Hinterhand], skat }
forehandOf(dealer), seatAt(position, dealer), positionOf(seat, dealer), nextSeat(seat)
```

3 – Skat – 4 – 3 from `new Rng(seed).shuffle(deck)`. The same seed always gives Vorhand, Mittelhand and Hinterhand
the same cards.

## 4. Card play tables and the fast position (`play.ts`)

```ts
const r = playRules("hearts");     // kinds: diamonds hearts spades clubs grand null ramsch (cached)
r.trumps                           // mask of all trumps (0 in Null)
r.classOf[c]                       // 0…3 plain suit, 4 = TRUMP (a jack is never its printed suit outside Null)
r.classMask[k], r.follow[c]        // cards of a class / cards that follow when c is led
r.order[c]                         // strength inside its class
r.matadorOrder                     // [CJ, SJ, HJ, DJ, A, 10, K, D, 9, 8, 7 of trump] (Grand: 4 jacks)
legalMoves(r, hand, led)           // led = -1 for the lead; Bedienpflicht per ISkO 4.2
trickWinner(r, c0, c1, c2)         // 0 | 1 | 2 (index in playing order)
beats(r, card, currentWinner), trickPoints(c0, c1, c2)
```

`Position` — mutable, O(1) `play`/`undo`, no checks (call `legal()` first):

```ts
const p = new Position(playRules("grand"), hands, leaderSeat, declarerSeat /* -1 Ramsch */, {
  trick: [/* cards already in the current trick */], points: [0, 0, 0], tricks: [0, 0, 0],
});
const moves = p.legal();       // mask for p.turn
p.play(card); p.undo();
p.isOver();                    // all cards played, or Null declarer took a trick
p.points[seat], p.tricks[seat], p.turn, p.leader, p.trickLength(), p.led(), p.lastTrickWinner(), p.played
```

Points in a `Position` never include the skat: add it to the declarer (suit, Grand) or the last trick (Ramsch).
`positionFromState(state)` builds one from a full `GameState` (problems, tests — **not** for the AI's own decisions,
it sees every hand).

## 5. Values (`value.ts`)

```ts
BID_VALUES               // 63 values 18 … 264; MIN_BID, MAX_BID, nextBid(v), isBidValue(v)
declaration(kind, { hand, ouvert, schneiderAnnounced, schwarzAnnounced })  // normalised Declaration
declarationError(decl, { skatTaken, bid })   // null or why it is not allowed now
matadors(cards12, kind)  // { count, withTops } over hand + skat
declarationValue(decl, matadorCount, { schneider?, schwarz? })  // value if won (UI, bidding estimates)
settle({ declaration, declarerCards /*12*/, bid, declarerPoints /*incl. skat*/, declarerTricks, defenderTricks })
  // → { won, value, overbid, reason, base, multiplier, matadors, levels, schneider, schwarz, written }
BASE_VALUES, NULL_VALUES, overbidValue(base, bid), multiplier(m, levels), nullValue(decl)
```

`written` = `+value` when won, `−2 × value` when lost (ISkO 5.3.4), before Kontra/Bock factors.

## 6. The game state machine (`game.ts`)

```ts
let s = newGame({ seed, dealer, rules: { allPass, kontra, bock }, peeks: [1, 0, 0], takeBacks: [1, 0, 0] });
// or let round.startGame(progress) do this. Problems/tests: newGame({ seed, dealer, cards: { hands, skat: [c, c] } })
while (s.phase !== "done") {
  const seat = currentSeat(s)!;               // whose decision
  const options = legalActions(s);            // every legal Action for that seat
  s = applyAction(s, chosen);                 // new immutable state; throws on illegal actions
}
s.result                                       // GameResult
```

**Phases:** `bidding → skat → discard → declare → play ⇄ re → done`; all pass: `→ done` (eingepasst), `→ play`
(Ramsch) or `→ schieben → play` (Schieberamsch).

**Actions** (`{ type, seat, … }`):

| type | phase | meaning |
|---|---|---|
| `bid` `{ value }` | bidding | the asker says a value (any higher bid value: jump bids are legal) |
| `hold` | bidding | the listener says "Ja"; in stage 3 Vorhand takes the game without bids (bid = 18) |
| `pass` | bidding | "Passe" |
| `pickUp` | skat / schieben | take the skat |
| `discard` `{ cards: [a, b] }` | discard / schieben | drücken; Schieberamsch: pass two cards on (no jacks) |
| `declare` `{ declaration }` | skat (= Hand game) / declare | announce |
| `shove` | schieben | pass the skat on unseen (doubles) |
| `kontra` | play | a defender, at his turn, before his first card (house rule `kontra`) |
| `re` / `noRe` | re | the declarer's answer to a Kontra |
| `play` `{ card }` | play | play a card |
| `peek` `{ index: 0 \| 1 }` | bidding | perk, out of turn: see one skat card before the own first bidding decision |
| `takeBack` | play/done | perk, out of turn: take back the own card if it was the very last action |

**Bidding state** `s.bidding`: `stage` 1 (Mittelhand reizt Vorhand), 2 (Hinterhand reizt the survivor), 3 (nobody bid,
Vorhand may still play); `asker`, `listener`, `waiting` ("asker" | "listener"), `value`, `holder`, `passed[]`.
Dialog: if `waiting === "asker"` show "`nextBid(value)` sagen" / "Passe"; otherwise "Ja" / "Passe".

**Useful queries:** `legalCards(s)` (mask for the seat to play), `ledCard(s)`, `lastTrick(s)`, `partyPoints(s)`,
`legalDeclarations(s)`, `rulesOf(s)`, `playKindOf(s)`, `isLegal(s, a)`, `checkAction(s, a)` (English reason string
for logs, never shown to the player), `replay(setup, actions)`.

**`GameState` fields** the table needs: `phase`, `hands`, `skat`, `declarer`, `bid`, `declaration`, `skatTaken`,
`kontra`, `turn`, `trick`, `trickLeader`, `tricks` (`{ leader, cards, winner, points }`), `points`, `trickCounts`,
`played`, `forehand`, `dealer`, `history`, `result`. States are JSON-serialisable; `undo` holds the state before the
last card (for `takeBack`).

**`GameResult`:** `type` ("passed" | "declared" | "ramsch"), `declarer`, `declaration`, `bid`, `won`, `points[seat]`
(skat included), `tricks[seat]`, `declarerPoints`, `matadors`, `base`, `multiplier`, `levels`, `value` (single,
after overbid), `overbid`, `reason` ("points" | "schneider-missed" | "schwarz-missed" | "overbid" | "null-trick"),
`schneider`/`schwarz` (the losing side on the cards), `kontra`, `factor` (Kontra/Re × Bock), `written` (signed list
value), `list` (Seeger-Fabian per seat **without** bonuses), `skat`, `earlyEnd` (Null), `ramsch` (`losers`,
`jungfrau`, `durchmarsch`, `shoves`).

### Example: one human decision

```ts
import { applyAction, currentSeat, gameOptions, legalActions, declaration } from "../rules/index.ts";
if (s.phase === "declare" && currentSeat(s) === 0) {
  const six = gameOptions(s, { ouvert: nullOuvertToggle });   // six buttons
  // six[i] = { kind, declaration, allowed, value, minValue, maxValue, reachesBid, surelyReachesBid,
  //            schneiderValue, schwarzValue, matadors }
  s = applyAction(s, { type: "declare", seat: 0, declaration: six[4].declaration });  // Grand
}
```

## 7. Declaration buttons (`options.ts`)

`gameOptions(state, mods)` returns the six options (Karo, Herz, Pik, Kreuz, Grand, Null) for the declarer:

- phase `skat` → Hand games; `mods` = `{ schneiderAnnounced, schwarzAnnounced, ouvert }` (ouvert on a suit/Grand
  means Hand + Schwarz angesagt; on Null: Null ouvert Hand). Matadors are counted on the ten own cards (`value`),
  and `minValue`/`maxValue` give the range over every possible unseen skat (the skat counts, ISkO 2.4.2).
- phase `discard` (12 cards in hand) and `declare` → games with the skat; only `ouvert` (Null ouvert) is allowed.
- `reachesBid` = `value ≥ bid`; `schneiderValue` / `schwarzValue` show whether Schneider/Schwarz would rescue it.
- A Null below the bid is `allowed: false` (ISkO 3.4.4). Suit and Grand games below the bid are allowed (they will
  be lost as overbid, ISkO 3.4.3) — show "reicht nicht".

`optionsFor({ cards, hand, bid }, mods)` does the same for any card set (bidding estimates, problems).

## 8. What a seat may know (`view.ts`) — the only input for the AI

```ts
const v = viewFor(state, seat);   // SeatView
v.hand, v.handSizes, v.skat /* mask or null */, v.openHand /* ouvert declarer */, v.revealed /* peeks */,
v.bidding, v.declarer, v.bid, v.declaration, v.kind, v.kontra, v.turn, v.trick, v.trickLeader, v.tricks, v.played,
v.points, v.trickCounts, v.history /* other seats' discards without cards */, v.legal, v.result
voidMasks(v)        // per seat: cards it cannot hold (did not follow a led class)
unknownCards(v)     // cards whose place the seat does not know
hiddenCounts(v)     // { seats: [n, n, n], skat: n }
sampleWorld(v, rng) // { hands, skat } — one random world consistent with the view (voids, sizes, open cards)
```

`SeatView` never contains other hands, the skat (unless this seat legitimately saw it), `undo` or `dealtSkat`. The
declarer's view has `skat` after picking up (his discard); in Hand games and Ramsch nobody sees it until the end;
in Schieberamsch the last player who picked it up and passed two cards knows them. `sampleWorld` ignores the bidding;
weight samples yourself (e.g. reject worlds where a seat that passed at 18 holds a Grand).

## 9. Liste, bonuses and house rules (`list.ts`, `ramsch.ts`)

```ts
seegerFabian(declarer, won, written)    // [n, n, n]: won +written+50; lost written−50 and +40 per defender
bonusFor(facts, seat, listBonus)        // won Grand/Null/Hand/Schneider (declarer), won defence (defender)
houseRuleEffects(id)                    // { rules: RuleOptions, listBonus, potFactor, fuelLossFactor, games, kittyStake }
ruleOptionsFor(id)                      // { allPass: "passed" | "ramsch" | "schieberamsch", kontra, bock }
settleRamsch({ points, tricks, shoves, bock })
```

| house rule | effect |
|---|---|
| `standard` | eingepasst when all pass |
| `ramsch`, `schieberamsch` | `rules.allPass` |
| `kontra` | `rules.kontra` |
| `bock` | `rules.bock` (every game and Ramsch ×2) |
| `grand-evening` / `null-evening` / `hand-evening` | `listBonus` +20 / +15 / +15 for every seat |
| `sharp` | `potFactor` 2, `fuelLossFactor` 2 (tour) |
| `long-round` | `games` 6 (the tour sets `RoundConfig.games`) |
| `kitty` | `kittyStake` 1: each lost game pays 1 Mark into the Skatkasse, the round winner takes it |

## 10. Round (`round.ts`)

```ts
let p = startRound(config);                 // RoundProgress (JSON) — save it after every game
while (!isRoundOver(p)) {
  let s = startGame(p);                     // dealt, dealer rotated, house rule + perks applied
  // optional before bidding: p = useRedeal(p); save; s = startGame(p);
  ... play s to "done" ...
  const { progress, record } = finishGame(p, s);   // GameRecord with list incl. bonuses, kitty updated
  p = progress;                             // save p here
}
const result = roundResult(p);              // { list, place (ties for the player), games, marks }
```

- Dealer of game *i* = `(firstDealer + i) % 3`; `forehandFirst` puts the player in Vorhand in game 0. A passed game
  counts as a game.
- Deal seed of game *i* = hash(`config.seed`, *i*, redeals used for *i*) → resuming from a saved `RoundProgress`
  always deals the same cards (`dealSeed(p)`, shown in the Liste as `record.seed`).
- Bonuses: seat 0 gets `config.perks.listBonus` (the tour has merged beer mats **and** the evening into it); the two
  opponents get only the evening bonus of the house rule. Nothing is counted twice.
- `used` keys: `redeal` (round total), `redeal:<gameIndex>`, `peek`. Peeks are per round, take-backs per game.
- Skatkasse (`kitty`): the losing declarer (Ramsch: each loser) pays 1; the player only while he has Mark at the table
  (`config.marks`), opponents always. `RoundResult.marks` = Kasse (if place 1) − Mark paid.

## 11. Tests and tools

- `npm test` runs the unit tests (`*.test.ts` next to the modules) and a 20 000-game fuzz.
- `nice -n 15 node --experimental-strip-types --no-warnings tools/balance/random-games.ts --n 1000000 [--seed 1] [--out f.md]`
  plays a million random games and checks every invariant (results in `docs/notes-skat.md`).
