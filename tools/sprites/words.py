"""words atlas -> public/sprites/words.png/json: Lautwörter as finished comic lettering (contract §2, §10).

Heavy round-pen letters with a slight per-letter wobble, a two-tone fill (yellow/orange/red), a light inner rim, a
thick ink contour and a dark drop shadow. Frames `<id>-0|1|2` ≈ 60, 110, 180 layout units wide (short words are
capped in height so they don't tower). Anchor: centre. ids are lower case with umlauts as ae/oe/ue (`roeoeoehr`).
"""
from __future__ import annotations

import numpy as np

from atlas import Atlas
from glyphs import text_mask, text_width
from px import Img, dilate, erode, shift, hash01, place

WORDS = ["KLATSCH", "RUMMS", "RÖÖÖHR", "ZISCH", "GLUCK", "TACKER", "PROST", "KRACH", "WUFF", "KLIRR", "ZACK", "PLOPP",
         "BRUMM", "HUI", "SCHEPPER"]
WIDTHS = [120, 220, 360]   # atlas px (60, 110, 180 layout units)

SCHEMES = [  # top fill, lower fill, inner rim
    ("beer3", "beer1", "road3"),     # yellow -> amber
    ("road2", "brick3", "beer4"),    # gold -> orange
    ("brick3", "road0", "brick4"),   # orange -> red
]


def word_id(w: str) -> str:
    return w.lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue")


def lettering(word: str, target_w: int, scheme: int, seed: int) -> Img:
    n = len(word)
    pen_r, gap_r = (0.24, 0.03) if target_w < 150 else (0.27, 0.015)
    # cap height from the target width (text_width scales linearly with cap at fixed ratios)
    unit = text_width(word, 100.0, 100 * pen_r, 100 * gap_r) / 100.0
    ow_r = 0.10
    cap = target_w / (unit + 2 * ow_r + 0.12)
    cap = min(cap, target_w * 0.36)
    pen, gap = cap * pen_r, cap * gap_r
    ow = max(3, round(cap * ow_r))
    sh = max(2, round(cap * 0.07))

    def jitter(i):
        rot = (hash01(seed, i, 1) - 0.5) * 14.0
        dy = (hash01(seed, i, 2) - 0.5) * cap * 0.14
        return rot, dy

    top = cap * 0.34 if any(c in word for c in "ÄÖÜ") else cap * 0.08
    m = text_mask(word, cap, pen, gap, pad=ow + sh + 2, jitter=jitter, top_room=top)
    H, W = m.shape
    img = Img(W, H)
    outline = dilate(m, ow)
    shadow = shift(outline, sh, sh)
    img.fill(shadow & ~outline, "ink1")
    img.fill(outline, "ink0")
    fill_top, fill_low, rim = SCHEMES[scheme]
    img.fill(m, fill_top)
    ys, xs = np.nonzero(m)
    y0, y1 = ys.min(), ys.max()
    yy = np.indices(m.shape)[0]
    split = y0 + (y1 - y0) * 0.58
    img.fill(m & (yy >= split), fill_low)
    # light inner rim on the top-left, a dark one on the bottom-right
    rw = max(1, round(cap * 0.045))
    img.fill(m & ~shift(m, rw, rw) & ~shift(m, -rw, -rw) | (m & ~shift(m, rw, rw)), rim)
    img.fill(m & ~shift(m, -rw, -rw) & shift(m, rw, rw), fill_low if fill_low != "road0" else "brick0")
    return img.trim(1)


def build() -> Atlas:
    atlas = Atlas("words", width=1600)
    for wi, w in enumerate(WORDS):
        atlas.group(word_id(w))
        for s, tw in enumerate(WIDTHS):
            img = lettering(w, tw, wi % 3, wi * 7 + 3)
            atlas.add(f"{word_id(w)}-{s}", img)
    return atlas
