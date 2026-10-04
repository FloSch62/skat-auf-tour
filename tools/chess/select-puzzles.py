#!/usr/bin/env python3
"""Select the bundled chess puzzles from the Lichess puzzle database (CC0).

    tools/.venv/bin/python tools/chess/select-puzzles.py            # download if missing, select, write JSON
    tools/.venv/bin/python tools/chess/select-puzzles.py --stats    # only print bucket sizes

Source: https://database.lichess.org/lichess_db_puzzle.csv.zst (CC0 1.0, see THIRD_PARTY_NOTICES.md).
The compressed file is kept in tools/chess-src/ (git-ignored) and decompressed as a stream, never as a whole.
The download is rate-limited (curl --limit-rate 2M) so it never saturates the network.

Levels (contract §4.8), 300 puzzles each:
  easy    200 × mate in 1 (rating ≤ 1100) + 100 × simple fork, two moves, no mate (rating ≤ 1200)
  medium  200 × mate in 2 (rating ≤ 1500) + 100 × two-move tactics (fork, pin, skewer, …; rating 1100–1600)
  hard    300 × mate in 3 (rating ≤ 1900)

Quality: rating deviation ≤ 80, popularity ≥ 90, at least 1000 plays; within a bucket the most played puzzles win
(ties by id), so the selection is deterministic for a given database file. Every start position (after the
opponent's setup move) appears once across all levels. Underpromotion puzzles are left out (confusing for a
beginner). The output lists the puzzles by rating; the game picks one per station from its seed.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC_DIR = ROOT / "tools" / "chess-src"
SRC = SRC_DIR / "lichess_db_puzzle.csv.zst"
URL = "https://database.lichess.org/lichess_db_puzzle.csv.zst"
OUT_DIR = ROOT / "public" / "puzzles"

MIN_PLAYS = 1000
MIN_POPULARITY = 90
MAX_DEVIATION = 80

TACTICS = {"fork", "pin", "skewer", "discoveredAttack", "doubleCheck", "hangingPiece", "trappedPiece",
           "deflection", "attraction", "capturingDefender", "xRayAttack", "intermezzo"}
EXCLUDE = {"underPromotion"}

# bucket id → (level, count)
PLAN = [
    ("mate1", "easy", 200),
    ("fork", "easy", 100),
    ("mate2", "medium", 200),
    ("tactic", "medium", 100),
    ("mate3", "hard", 300),
]


def bucket_of(themes: set[str], n_moves: int, rating: int) -> str | None:
    if themes & EXCLUDE:
        return None
    if "mateIn1" in themes and n_moves == 2 and rating <= 1100:
        return "mate1"
    if "mateIn2" in themes and n_moves == 4 and rating <= 1500:
        return "mate2"
    if "mateIn3" in themes and n_moves == 6 and rating <= 1900:
        return "mate3"
    if "mate" in themes or n_moves != 4 or "short" not in themes:
        return None
    if "fork" in themes and rating <= 1200:
        return "fork"
    if themes & TACTICS and 1100 <= rating <= 1600:
        return "tactic"
    return None


def download() -> None:
    SRC_DIR.mkdir(parents=True, exist_ok=True)
    part = SRC.with_suffix(".zst.part")
    print(f"downloading {URL} (limited to 2 MB/s) …", file=sys.stderr)
    subprocess.run(["curl", "--limit-rate", "2M", "-sS", "-L", "-o", str(part), URL], check=True)
    part.rename(SRC)


def rows():
    import zstandard  # tools/.venv

    with open(SRC, "rb") as fh:
        reader = zstandard.ZstdDecompressor().stream_reader(fh)
        text = io.TextIOWrapper(reader, encoding="utf-8", newline="")
        yield from csv.DictReader(text)


# ─── a minimal move applier, only for the de-duplication key (the TS rules module validates everything) ──

def board_after(fen: str, uci: str) -> str:
    placement, turn, *_ = fen.split()
    grid: list[list[str]] = []
    for row in placement.split("/"):
        r: list[str] = []
        for ch in row:
            r.extend(["."] * int(ch)) if ch.isdigit() else r.append(ch)
        grid.append(r)

    def at(sq: str) -> tuple[int, int]:
        return 8 - int(sq[1]), ord(sq[0]) - 97

    (fr, ff), (tr, tf) = at(uci[:2]), at(uci[2:4])
    piece = grid[fr][ff]
    grid[fr][ff] = "."
    if piece in "Pp" and ff != tf and grid[tr][tf] == ".":
        grid[fr][tf] = "."  # en passant
    if piece in "Kk" and abs(tf - ff) == 2:
        rook_from, rook_to = (7, 5) if tf > ff else (0, 3)
        grid[tr][rook_to], grid[tr][rook_from] = grid[tr][rook_from], "."
    if len(uci) == 5:
        piece = uci[4].upper() if piece.isupper() else uci[4]
    grid[tr][tf] = piece
    out = []
    for r in grid:
        s, n = "", 0
        for ch in r:
            if ch == ".":
                n += 1
                continue
            s += (str(n) if n else "") + ch
            n = 0
        out.append(s + (str(n) if n else ""))
    return "/".join(out) + (" b" if turn == "w" else " w")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--stats", action="store_true", help="only print bucket sizes")
    args = ap.parse_args()
    if not SRC.exists():
        download()

    cands: dict[str, list[tuple]] = {b: [] for b, _, _ in PLAN}
    total = 0
    for row in rows():
        total += 1
        try:
            plays = int(row["NbPlays"])
            pop = int(row["Popularity"])
            dev = int(row["RatingDeviation"])
            rating = int(row["Rating"])
        except (KeyError, ValueError):
            continue
        if plays < MIN_PLAYS or pop < MIN_POPULARITY or dev > MAX_DEVIATION:
            continue
        moves = row["Moves"].split()
        themes = set(row["Themes"].split())
        b = bucket_of(themes, len(moves), rating)
        if b is None:
            continue
        cands[b].append((-plays, row["PuzzleId"], row["FEN"], row["Moves"], rating, row["Themes"], pop))

    print(f"rows read: {total}", file=sys.stderr)
    for b, level, n in PLAN:
        print(f"  {b:7s} candidates {len(cands[b]):7d}  (need {n} for {level})", file=sys.stderr)
    if args.stats:
        return

    seen: set[str] = set()
    levels: dict[str, list[list]] = {"easy": [], "medium": [], "hard": []}
    for b, level, n in PLAN:
        picked = 0
        for neg_plays, pid, fen, moves, rating, themes, pop in sorted(cands[b]):
            key = board_after(fen, moves.split()[0])
            if key in seen:
                continue
            seen.add(key)
            levels[level].append([pid, fen, moves, rating, themes])
            picked += 1
            if picked == n:
                break
        if picked < n:
            sys.exit(f"bucket {b}: only {picked} of {n} puzzles")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for level, puzzles in levels.items():
        puzzles.sort(key=lambda p: (p[3], p[0]))
        doc = {
            "source": "Lichess puzzle database, CC0 1.0, https://database.lichess.org/#puzzles",
            "level": level,
            "fields": ["id", "fen", "moves", "rating", "themes"],
            "puzzles": puzzles,
        }
        path = OUT_DIR / f"chess-{level}.json"
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(doc, fh, ensure_ascii=False, separators=(",", ":"))
            fh.write("\n")
        ratings = [p[3] for p in puzzles]
        print(f"{path.relative_to(ROOT)}: {len(puzzles)} puzzles, rating {min(ratings)}–{max(ratings)}, "
              f"{os.path.getsize(path) // 1024} KiB", file=sys.stderr)


if __name__ == "__main__":
    main()
