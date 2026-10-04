"""sudoku atlas -> public/sprites/sudoku.png/json: the puzzle page of the local paper (contract §4.9, §10).

Cells are 48×48 atlas px (24 layout units, the size the 9×9 grid needs on a 960×540 screen; the 6×6 grid can draw
them 1:1 too). Anchor: top-left.

- `newsprint`: a 9-slice of yellowed newspaper (insets 12) for the page; `cell`, `cell-given` (slightly darker),
  `cell-selected` (beer-gold), `cell-peer` (row/column/box highlight), `cell-wrong` (red tint).
- Digits 1–9 three ways: `digit-<n>` printed (ink, the given numbers), `pencil-<n>` written by the player (graphite
  blue-grey, hand-drawn wobble), `note-<n>` small corner notes (24×24 px = 12 units, anchor top-left).
"""
from __future__ import annotations

import numpy as np

from atlas import Atlas
from glyphs import text_mask
from px import Img, V, erode, dilate, shift, hash01, rrect_mask, place
from ui import framed, fibres

C = 48


def cell(fill, edge="paper1") -> Img:
    img = Img(C, C)
    m = np.ones((C, C), bool)
    img.fill(m, fill)
    img.fill(m & ~erode(m, 1), edge)
    return img


def digit(n, kind) -> Img:
    if kind == "digit":
        m = text_mask(str(n), 30, 6.4, 0)
        col, size = "ink1", C
    elif kind == "pencil":
        m = text_mask(str(n), 28, 4.6, 0, jitter=lambda i: ((hash01(n, 3) - 0.5) * 10, 0))
        col, size = "river1", C
    else:
        m = text_mask(str(n), 16, 3.2, 0)
        col, size = "ink3", 24
    img = Img(size, size)
    img.fill(place((size, size), m, (size - m.shape[1]) // 2, (size - m.shape[0]) // 2), col)
    return img


def build() -> Atlas:
    atlas = Atlas("sudoku", width=1024)
    W = H = 96
    ins = (12, 12, 12, 12)
    page = framed(W, H, outer="ink2", r=2, bands=[(1, "paper3", "paper1")], fill="paper2",
                  tex=lambda im, core: im.fill(fibres(W, H, ins, 21, 40) & erode(core, 1), "paper1"), ins=ins)
    atlas.slice9("newsprint", page, *ins)
    for name, fill in (("cell", "paper3"), ("cell-given", "paper2"), ("cell-selected", "beer3"),
                       ("cell-peer", "paper4"), ("cell-wrong", "brick4")):
        atlas.add(name, cell(fill), 0, 0)
    for kind in ("digit", "pencil", "note"):
        for n in range(1, 10):
            atlas.add(f"{kind}-{n}", digit(n, kind), 0, 0)
    return atlas
