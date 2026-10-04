# Notes of the Rätsel area (chess and sudoku)

Decisions where the contract (§4.8, §4.9, §6) leaves room, and what the tour needs to know to run the two stations.

## How the tour calls the stations

```ts
// src/chess/scene.ts
createChessStation(app, {
  level: "easy" | "medium" | "hard",   // settings.chessLevel
  seed: number,                          // picks the puzzle (deterministic)
  attempts: number,                      // 3, or 4 with the Airedale
  hints?: number,                        // Lupe (souvenir magnifier): 1
  puzzleId?: string,                     // a fixed puzzle (dev, events); optional
  onDone(result: { solved: boolean; attempts: number }): void,
}): Scene

// src/sudoku/scene.ts
createSudokuStation(app, {
  seed: number,
  level: "easy" | "medium" | "hard",   // settings.sudokuLevel
  size?: 6 | 9,                          // missing: the station asks „Kleines oder großes Rätsel?“
  presolved?: number,                    // Bleistiftstummel: 2
  freeCells?: number,                    // Airedale: 1 („Ein Feld verraten“)
  markErrors: boolean,                   // settings.sudokuMarkErrors
  onDone(result: { solved: boolean; size: 6 | 9 }): void,
}): Scene
```

- Both scenes never pop themselves: „Weiter“ (or „Weglegen“) calls `onDone` exactly once, the caller switches scene.
- **Chess `attempts` in the result:** solved → the attempt that solved it (1 = first try, for the 4/3/2 Mark scale of
  §4.7); not solved → the number of wrong moves (0 if he gave up at once). Rewards are the tour's business; the
  result screens deliberately name no Mark or Sprit, so they can never contradict the payout.
- Both scenes start the `raetsel` music on `enter()`. Sounds used: `chess-move`, `chess-capture`, `sudoku-wrong`
  (also for a wrong chess move), `sudoku-right`, `win-sting`, `lose-sting`, `ui-click`.
- Dev: `/?dev=chess&level=easy&seed=3[&attempts=4][&hints=1][&id=<puzzle id>]`, `/?dev=chess-park`,
  `/?dev=sudoku&size=9&level=easy&seed=5[&presolved=2][&free=1][&errors=0][&almost=1]` (no `size` → size choice).

## Chess

### Rules module (`src/chess/rules.ts`, `notation.ts`)

- 64-square board (a1 = 0), pieces as small numbers, immutable positions (`makeMove` returns a new one). Legal moves
  with check, mate, stalemate, castling (not out of or through check), en passant, promotion; FEN in and out; UCI.
- Verified by perft against the published counts (start position depth 1–4, Kiwipete 1–3, positions 3–6) and FEN
  round trips. The whole test file runs in about 0.2 s.
- German notation like the newspaper chess column: K, D, T, L, S, pawns without a letter, `x` for captures, `+`/`#`,
  `0-0`/`0-0-0`, promotion as `e8D`, SAN disambiguation (`Tad1`, `S5d4`). En passant is written plain (`exd6`).

### Puzzle runner (`src/chess/puzzle.ts`)

- The first move of the Lichess line is the opponent's setup move; it slides in after „Los geht's“, so he sees what
  just happened. The player must find each of his moves; the replies come from the line (no engine).
- **Any mating move counts** (Lichess convention), at any point of the line, not only where the line itself mates.
- **A wrong move is taken back to just before the wrong move**, not to the puzzle start. Moves he already found stay
  on the board; for a beginner that is clearer than replaying them. The wrong move stays visible (red square,
  struck through in the move list) until he clicks „Zug zurücknehmen“, so nothing changes behind his back.
- Three attempts (option `attempts`, the Airedale gives four). Each wrong move costs one. Out of attempts → „Lösung
  zeigen“ → the solution is played from the puzzle start, move by move, then the result.
- „Aufgeben“ asks once („Weiterknobeln“ / „Lösung zeigen“), then shows the solution the same way and reports unsolved.
- The task sentence comes from the themes: „Weiß zieht und setzt matt.“, „… setzt matt in 2 Zügen.“, else „… zieht und
  gewinnt Material.“ plus a one-line hint for non-mate puzzles from the theme (Gabel, Fesselung, Spieß,
  Abzugsangriff, Doppelschach, Ablenkung, Hinlenkung, Zwischenzug, …).
- Lupe (`hints`): marks the piece that has to move next with a blinking blue frame. Once per puzzle, not per move.

### Puzzle selection (`tools/chess/select-puzzles.py`)

- Downloads `lichess_db_puzzle.csv.zst` once with `curl --limit-rate 2M` into `tools/chess-src/` (git-ignored) and
  decompresses it as a stream (6.16 million rows, about 16 s).
- Quality filter for all levels: at least 1000 plays, popularity ≥ 90, rating deviation ≤ 80. Within a bucket the
  most played puzzles win (ties by id), so the selection is deterministic for a given database file. Underpromotion
  puzzles are left out. Every start position (after the setup move) appears only once across all three files.

| Level | Content | Rating |
|---|---|---|
| easy (300) | 200 mate in 1 + 100 two-move forks (no mate) | 763–1200 |
| medium (300) | 200 mate in 2 + 100 two-move tactics (fork, pin, skewer, discovered attack, …) | 982–1594 |
| hard (300) | 300 mate in 3 | 1142–1899 |

- The files are compact JSON (`fields` + rows, 37–48 KiB each), sorted by rating. The station picks
  `puzzles[hash(seed) % 300]`. If the file cannot be loaded, three built-in puzzles per level take over.
- Every bundled puzzle is checked in `src/chess/puzzle.test.ts`: all moves legal, mate-in-N lines have 2N moves and
  end in mate, the runner accepts its own line, no duplicate start positions.

### Station look

- The playable board is a clean 2D board, 54 units per square (432×432), light `paper3` / dark `wood3`, coordinates
  a–h and 1–8 at the board, the side to move at the bottom (the board flips when he plays Black).
- Pieces come from the `chess` atlas (`w-K`, `w-D`, `w-T`, `w-L`, `w-S`, `w-B`, `b-…`) when it exists, centred in
  the square; until then code-drawn pixel pieces (21×23 cells, 2 units per cell, white with ink contour, black with a
  stone rim light). No Unicode glyphs.
- Click a piece → it turns yellow, its targets get green dots (green frames for captures) → click a target. Clicking
  the piece again, an empty square, an enemy piece or the panel deselects. A piece without moves says so in the
  „Was jetzt?“ line. Promotion: four big buttons (Dame, Turm, Läufer, Springer) and „Doch nicht“.
- Animations: his own move slides in 0.25 s, the opponent's reply waits 0.7 s and slides in 0.8 s, the solution
  plays at about one move per two seconds. No timers anywhere.
- Right side: a wood plate „Schachaufgabe · leicht“, a paper panel with task, hint, attempts (green dots, crossed
  when used), the moves as a flowing newspaper line (his moves in blue), a legend „K König · D Dame · …“ and
  „Aufgeben“. Every message (intro, wrong move, out of attempts, give-up question, result) replaces the legend in the
  bottom part of that panel, never covering the board.
- Backdrop `bg/park`; until the art exists a code painting in the adventure raster (`src/chess/park.ts`, via the
  shared painter): church tower and roofs behind a hedge, chestnut trees, a paved square with the large painted
  board and two knee-high wooden pieces, a bench and a lamp.

## Sudoku

- **Techniques per level.** Easy needs only naked and hidden singles. Medium adds pointing pairs, box-line
  reduction and naked pairs, and must not be solvable with singles alone. Hard adds hidden pairs, naked and hidden
  triples, X-wing, XY-wing and swordfish, and must not be solvable with the medium set. Nothing ever needs guessing.
  The grader always uses the simplest technique that helps and reports the highest level it needed.
- **Givens.** Cells are removed in 180° symmetric pairs (newspaper look) while the grid stays unique and within the
  level. Removal stops at the first grid that has the target level and at most `max` givens, never below `floor`.

  | Size | Easy | Medium | Hard |
  |---|---|---|---|
  | 9×9 | 36–38 givens | ≤ 32 (floor 26, about 28 in practice) | ≤ 30 (floor 20, about 27 in practice) |
  | 6×6 | 16–18 givens | ≤ 12 (floor 8) | ≤ 12 (floor 8) |

  Easy keeps many givens on purpose, as a comfortable start for a beginner.
- **Pools.** Most minimal 6×6 grids fall to singles, so 6×6 medium turns up in only about 0.2 % of attempts. Therefore
  6×6 medium, 6×6 hard and 9×9 hard come from pre-generated pools: `public/puzzles/sudoku-medium.json` (200 × 6×6)
  and `public/puzzles/sudoku-hard.json` (200 × 6×6, 300 × 9×9), built deterministically by
  `nice -n 15 node --experimental-strip-types --no-warnings src/sudoku/build-pool.ts` (about 20 s).
  `sudokuFromPool` varies each pick by seed: digits relabelled, grid mirrored or turned (8 symmetries for 9×9; for
  6×6 identity, left-right, top-bottom and half turn). These keep the boxes, the symmetry and the grade.
- **Without a pool** the generator returns the closest level it reached and says so in `puzzle.level` (shown in the
  masthead); for 6×6 that usually means easy. Speed in node: 9×9 easy about 0.3 ms, medium 3–4 ms (max about 11 ms),
  9×9 hard without a pool about 11 ms (max about 36 ms) — far below the 200 ms budget.
- **Look.** The Rätselseite of the local paper („Rätselecke“, „Sudoku · 9×9 · leicht“) on the kiosk counter, grid as
  crisp newsprint on paper colours, digits in `big`: printed digits dark and bold, his own in blue ink, pencil
  (souvenir) digits graphite and locked, given-away digits blue and locked. Cells are 46 units (9×9) or 64 (6×6).
  Backdrop `bg/kiosk`, code painting `src/sudoku/kiosk.ts` until the art exists.
- **Interaction.** Click a cell (it turns yellow; row, column and box are lightly shaded, equal digits light blue),
  then a digit on the keypad (3×3 buttons of 104×60). A digit already placed `size` times is dimmed but still
  clickable. „Radieren“, „Notizen: aus/an“ (notes in `body`, a mini grid; placing a digit removes that note from its
  peers), „Ein Feld verraten (n)“ only with `freeCells` (fills the selected cell if empty or wrong, else the first
  wrong digit, else the easiest next cell), „Weglegen“ with a confirm step → `onDone({ solved: false })`.
  With `markErrors` a wrong digit gets a red cell and dark red ink. Full but wrong without error marks: „Alles voll,
  aber irgendwo stimmt was nicht.“ Digit keys, Backspace, arrows and Enter are optional shortcuts, never needed.
- **Finished:** a red „GELÖST“ stamp over the grid, a soft green glow, `sudoku-right`, a praise line chosen by seed
  and „Weiter“.

## Open points

- `public/sprites/chess.json` does not exist yet; the frame contract is in `docs/requests/sprites.md`.
- Painted art `bg/park` and `bg/kiosk` will replace the code paintings automatically (`backdrop()`).
