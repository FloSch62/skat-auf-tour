# Notes of the Skat area — rule decisions

Rules engine: `src/skat/rules/` (API in `docs/skat-api.md`). Everything follows the **Internationale Skatordnung
(ISkO)** in the unified version adopted by DSkV and ISPA on 22.11.1998 in Halle (valid since 1.1.1999), checked
against the Altenburg 2002 print of the ISkO with Skatwettspielordnung (SkWO) and "Wissenswertes für Skatspieler"
(spielkarten.com, `0_Skat_InternationaleSkatordnung.pdf`). There is no later change to the points below; the DSkV
tournament rules (status November 2022) still refer to this ISkO. Paragraph numbers below are from that text.
Anything the ISkO does not cover is a named house rule (contract §0.3, §4.4).

## Cards, dealing, bidding

- 32 cards, 120 Augen (A 11, 10 10, K 4, D 3, B 2; ISkO 1.2.2).
- Dealing 3 – Skat – 4 – 3, starting with the dealer's left neighbour (ISkO 3.2.6) from `new Rng(seed)`; the dealer
  sits in Hinterhand. Same seed → same cards for Vorhand, Mittelhand, Hinterhand.
- Bidding (ISkO 3.3): Mittelhand says, Vorhand answers "Ja"/"Passe"; then Hinterhand says to the survivor. Jump bids
  are allowed (3.3.2: "nicht an deren zahlenmäßige Reihenfolge gebunden"). If Mittelhand and Hinterhand bid nothing,
  Vorhand may take the game without a value (3.3.6); we record bid 18 then (no difference: every game is worth ≥ 18).
  Vorhand cannot pass before having heard a bid or both passes (3.3.6) — built into the state machine.
- Bid values: every game value 18 … 264 (63 values: suit 9…12 × 2…18, Grand 24 × 2…11, Null 23 35 46 59).
- All pass: standard = **eingepasst** (3.3.7, SkWO 9.4): the game counts as a game with no score; the next dealer
  deals. House rules `ramsch` / `schieberamsch` play Ramsch instead.

## Declaration

- After picking up: discard any two cards (2.2.2), then declare. No Hand, no Schneider/Schwarz announcement, no
  suit/Grand ouvert after picking up (3.4.4); Null ouvert is possible with the skat (46).
- Hand games: Schneider and Schwarz may be announced (only in Hand games); Schwarz angesagt includes Schneider
  angesagt; suit/Grand **ouvert** is always Hand and counts as Schwarz angesagt (5.2.6: "Kreuz ouvert mit zweien
  9 × 12 = 108", "Grand ouvert mit vieren 264").
- **Null below the bid is not allowed** ("nicht mehr durchführbares Nullspiel", 3.4.4; such a declaration is invalid
  and must be corrected). Suit and Grand games below the bid **may** be declared (3.4.3: the declarer may announce a
  game matching the bid and give up); they are lost as overbid. The UI shows "reicht nicht" for them.
- Not implemented (not needed by the contract): giving up a game (4.3.1), playing open to shorten (4.3.4), rule
  violations — the engine only offers legal actions.

## Card play

- Bedienpflicht (4.2): a led trump must be answered by any trump (jacks are trumps in suit games, Grand and Ramsch,
  never their printed suit); a led suit by that suit without its jack; otherwise any card (no obligation to trump).
- Null (2.3.4): no trumps, jacks in their suit, order 7 8 9 10 B D K A.
- All ten tricks are always played, except Null, which ends at the declarer's first trick. Ouvert: the declarer's
  hand is open in every seat view from the declaration on (2.2.5).

## Value and settlement (ISkO 5)

- Value = base (Karo 9, Herz 10, Pik 11, Kreuz 12, Grand 24) × (matadors + 1 + Hand + Schneider + Schneider angesagt
  + Schwarz + Schwarz angesagt + offen). Null fixed: 23, 35 Hand, 46 ouvert, 59 ouvert Hand.
- Matadors "mit"/"ohne" over hand **plus skat**, also in Hand games (2.4.2); max 11 in suit games, 4 in Grand.
- Win with the 61st Auge (5.2.2). A party with **30 or fewer** Augen is Schneider — declarer and defenders alike
  (5.2.3, SkWO 8.8). Schwarz = no trick; one trick without Augen is Schneider, not Schwarz (5.2.4). The skat counts
  for the declarer's points but is not a trick.
- Won game: Schneider/Schwarz count when the defenders are Schneider/Schwarz. Lost game: they count when the
  declarer himself is Schneider (≤ 30 incl. skat) / took no trick ("Schneider verloren", 5.2.1).
- Announced but missed: lost "mindestens in der angesagten Gewinnstufe" (5.2.5) — the announced levels count; a
  higher level reached counts too; nothing is counted twice ("den so genannten Eigenschneider gibt es nicht").
- **Lost games are written double — Hand games included** (5.3.4, SkWO 8.10). (Until the end of 1998 lost Hand games
  were not doubled; that rule is gone.)
- **Überreizt** (5.4): if the value at the end is below the bid, the game is lost and valued at the smallest multiple
  of the base value that reaches the bid, then doubled. Applies to Hand games whose skat held a top too, even when
  "won" on the cards (5.4.2). If a lost game's own value already reaches the bid (e.g. with the declarer Schneider),
  it is not "overbid" and keeps that value. Examples in `value.test.ts`: bid 50 + Kreuz-Bube in the skat → Herz mit 1
  −100; bid 59 + Pik-Bube → Kreuz/Herz ohne 1 −120; Herz Hand ohne 3 at 36, Kreuz-Bube in the skat → −80.

## Liste (extended Seeger-Fabian, SkWO 5.1 / 8.12)

With v = single value (after the overbid adjustment) and f = Kontra/Re/Bock factor:

| | declarer | each defender |
|---|---|---|
| won | `+v·f + 50` | 0 |
| lost | `−2·v·f − 50` | `+40` (three-table) |
| eingepasst | 0 | 0 |

The doubling of a lost game happens **once**: ISkO 5.3.4 doubles the value; the Seeger-Fabian −50 is added on top.
`GameRecord.value` holds the written value (`+v·f` or `−2·v·f`), `GameRecord.list` the list change per seat including
bonuses. Inn rounds and the Preisskat use the same list (contract §4.3, §4.6).

**Bonuses** (`ListBonus`): a won Grand / Null / Hand game (Null Hand and ouvert Hand count as Hand) / a won game with
the defenders Schneider (or Schwarz) for the declarer; the defence bonus for each defender when the declarer loses.
The player (seat 0) gets `RoundConfig.perks.listBonus`, which the tour builds from his beer mats **and** the
house-rule evening. The two opponents get only the evening bonus of the house rule (an evening is a table rule for
everybody; beer mats belong to the player). Nothing is added twice. Ramsch and passed games get no bonus.

## House rules (contract §4.4) — our fixed variants

- **Ramsch:** all pass → Ramsch. Only jacks are trumps (Grand order), Vorhand leads, all ten tricks, the skat goes to
  the winner of the last trick. The player with the most Augen gets them as minus points in the Liste — **no ±50, no
  +40**. Two players tied for the most both lose the full amount; a three-way tie (40/40/40) scores nothing. Each
  player without a trick (Jungfrau) doubles. Durchmarsch (one player takes all ten tricks): **+120** for him, nobody
  loses.
- **Schieberamsch:** like Ramsch. Before the first card, Vorhand, Mittelhand, Hinterhand in turn either pick the skat
  up and pass two cards (no jacks) on to the next — this does **not** double — or **shove it on unseen**
  ("schieben"), which **doubles** the game each time (common practice, e.g. Wikipedia "Schieberamsch", pagat.com).
  The two cards Hinterhand passes (or the shoved skat) form the skat for the last trick. Factors multiply:
  2^Jungfrau × 2^shoves × Bock; Durchmarsch: 120 × 2^shoves × Bock. No "Grand Hand" escape.
- **Kontra/Re:** each defender may say Kontra at his turn before his first card (×2); the declarer answers at once
  with Re (×4) or not. Only one Kontra per game. Allowed in every declared game (also Null and ouvert). Factors apply
  to the game value only; the Seeger-Fabian ±50/+40 stay as they are.
- **Bock:** every game of the round (incl. Ramsch) ×2; ±50/+40 unchanged.
- **Grand-/Null-/Hand-Abend:** +20 / +15 / +15 for every won game of that kind, for every seat (see bonuses).
- **sharp, long-round:** tour level only (`houseRuleEffects`: pot and fuel-loss factor 2; 6 games — the tour sets
  `RoundConfig.games`).
- **kitty (Skatkasse):** every lost game pays 1 Mark into the Kasse — the declarer who loses, in Ramsch each loser;
  the player only while he still has Mark at the table (`RoundConfig.marks`), opponents always. The round winner
  (place 1, ties for the player) takes the Kasse; `RoundResult.marks` = Kasse won − Mark paid in.

## Round

- Dealer rotates clockwise after every game, passed games included. First dealer from the round seed; with the
  beer mat "forehand" seat 2 deals the first game so the player sits in Vorhand.
- Deal seed of game *i* = hash(round seed, *i*, redeals used for game *i*): resuming from a saved `RoundProgress`
  deals the same cards. Redeals and skat peeks are per round, take-backs per game.
- Place = 1 + opponents with a strictly higher list (ties in the player's favour).

## Perks inside a game

- **Skat peek** (schnauzer-a): one skat card, out of turn, before the seat's own first bidding decision.
- **Take-back** (wolfhound-b): the own card returns while it is the most recent action (also as the third card of a
  trick, before the next card is led). The engine restores the state before that card exactly; the AI never gets to
  see it as a played card in its view afterwards.

## Fuzzer: one million random games

`nice -n 15 node --experimental-strip-types --no-warnings tools/balance/random-games.ts --n 1000000 --seed 1`
(single process, 2026-10-04). Random legal bidding (incl. jump bids up to 264), Hand/announcements/ouvert, random
discards, Kontra/Re, Ramsch/Schieberamsch, take-backs and peeks, inside rounds with random house rules. Checked per
game: deal 10/10/10/2 and determinism, bids strictly rising and valid, 10 cards each at the start of play, Hand skat
untouched, no jack pushed, every card legal and the legal set equal to a naive name-based implementation and to the
fast `Position`, trick winners and trick points against the naive rules, `Position` points/tricks at the end, 120
Augen and 10 tricks (Null early end only at the declarer's first trick), won/value/overbid against an independent ISkO
calculation, overbid = smallest multiple ≥ bid, Null never below the bid, written value and factors, Seeger-Fabian
list per seat, Ramsch losers/Jungfrau/list, round list sums, void inference never contradicts the real hands, and
sampled worlds fit the view.

Random games: 1,000,000 (seed 1), 273,340,265 checks, 71.7 s, **errors: 0**

| | count | share |
|---|---:|---:|
| declared games | 811726 | 81.2 % |
| won by the declarer | 116609 | 14.4 % |
| overbid | 157359 | 19.4 % |
| Hand | 226426 | 27.9 % |
| Schneider angesagt / Schwarz angesagt / ouvert | 90066 / 49987 / 59631 | |
| Schneider / Schwarz on the cards | 228205 / 26893 | |
| Null ended at the declarer's first trick | 86235 | |
| Kontra / Re | 22705 / 9082 | |
| passed in (eingepasst) | 134490 | 13.4 % |
| Ramsch (of it Schieberamsch) | 53784 (26862) | 5.4 % |
| Ramsch Jungfrau / Durchmarsch | 7080 / 114 | |
| take-backs / skat peeks | 557793 / 183675 | |
| by kind | hearts 148255, clubs 148151, spades 148225, null 91664, diamonds 148704, grand 126727 | |
| highest bid / written value range | 264 / -2160 … +960 | |

(Random play, so win rates mean nothing; the point is coverage.) `npm test` runs the same checks on 20 000 games.
