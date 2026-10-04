"""chess atlas -> public/sprites/chess.png/json (contract §4.8, §10).

Pieces `w-K w-D w-T w-L w-S w-B` and `b-…` (König, Dame, Turm, Läufer, Springer, Bauer): 104×104 atlas px
(52×52 layout units), classic Staunton silhouettes in the comic line, anchor centre. White pieces are cream with an ink
contour; black pieces are dark wood with a light inner rim so they read on dark squares.

Board marks for 56-unit squares (112×112 px, anchor centre; the dot and ring also suit other square sizes):
`mark-target` (dot for a legal move), `mark-capture` (ring around a capturable piece), `mark-selected` (gold frame),
`mark-last` (tint of the last move's squares), `mark-check` (red glow under a king in check). Target, capture, last
and check are semi-transparent on purpose.
"""
from __future__ import annotations

import numpy as np

from atlas import Atlas
from kit import Pen, Ink, catmull
from px import Img, V, erode, dilate, shift, edge_in, edge_out, band_br, band_tl
import motifs as M

S = 104
C = 52

WHITE = dict(fill="paper4", shade="paper2", hi="road3", line="ink1")
BLACK = dict(fill="ink2", shade="ink1", hi="ink4", line="ink0")


def lathe(profile):
    """Polygon from a right-hand half profile [(dx, y)] mirrored about the centre line."""
    right = [(C + dx, y) for dx, y in profile]
    left = [(C - dx, y) for dx, y in reversed(profile)]
    return right + left


BASE = [(25, 79), (26, 84), (30, 88), (30, 97)]


def shapes(piece):
    """List of (mask, role) parts back to front for a piece."""
    v = lambda: V(S, S)  # noqa: E731
    parts = []

    def poly(pts, smooth=True):
        m = v()
        m.poly(catmull(pts, 6, True) if smooth else pts)
        return m.mask()

    def ell(cx, cy, rx, ry):
        m = v()
        m.ellipse(cx, cy, rx, ry)
        return m.mask()

    base = v()
    base.rrect(C - 31, 86, 62, 11, 4)
    if piece == "B":
        parts.append(poly(lathe([(6, 47), (8, 56), (12, 66), (19, 75)] + BASE[:2]), True))
        parts.append(base.mask())
        parts.append(ell(C, 49, 16, 5))
        parts.append(ell(C, 31, 15, 15))
    elif piece == "T":
        parts.append(poly(lathe([(17, 30), (15, 40), (16, 62), (20, 72), (25, 79), (26, 84)]), True))
        parts.append(base.mask())
        top = v()
        top.rect(C - 21, 13, 42, 20)
        top.rect(C - 13, 12, 7, 9, on=False)
        top.rect(C + 6, 12, 7, 9, on=False)
        parts.append(top.mask())
        parts.append(ell(C, 34, 20, 4.5))
    elif piece == "L":
        parts.append(poly(lathe([(8, 54), (9, 62), (13, 70), (19, 77)] + BASE[:2]), True))
        parts.append(base.mask())
        parts.append(ell(C, 55, 17, 5))
        mitre = poly([(C, 13), (C + 11, 24), (C + 15, 37), (C + 11, 50), (C - 11, 50), (C - 15, 37), (C - 11, 24)])
        cut = v()
        cut.stroke([(C + 13, 22), (C + 1, 37)], 3.2)
        parts.append(mitre & ~cut.mask())
        parts.append(ell(C, 10, 5.5, 5.5))
    elif piece == "D":
        parts.append(poly(lathe([(9, 50), (10, 58), (13, 66), (18, 74), (25, 79), (26, 84)]), True))
        parts.append(base.mask())
        parts.append(ell(C, 51, 19, 5))
        crown = [(C - 17, 46), (C - 21, 18), (C - 11, 30), (C - 6, 14), (C, 28), (C + 6, 14), (C + 11, 30), (C + 21, 18),
                 (C + 17, 46)]
        parts.append(poly(crown, False))
        balls = v()
        for x, y in ((C - 21, 17), (C - 6, 13), (C + 6, 13), (C + 21, 17)):
            balls.circle(x, y, 4)
        balls.circle(C, 9, 5)
        parts.append(balls.mask())
        parts.append(ell(C, 41, 17, 4.5))
    elif piece == "K":
        parts.append(poly(lathe([(9, 50), (10, 58), (13, 66), (18, 74), (25, 79), (26, 84)]), True))
        parts.append(base.mask())
        parts.append(ell(C, 51, 19, 5))
        crown = poly([(C - 18, 46), (C - 20, 30), (C - 12, 21), (C, 18), (C + 12, 21), (C + 20, 30), (C + 18, 46)])
        parts.append(crown)
        cross = v()
        cross.rect(C - 3.5, 2, 7, 19)
        cross.rect(C - 9, 7, 18, 6.5)
        parts.append(cross.mask())
        parts.append(ell(C, 42, 18, 4.5))
    return parts


def piece_img(colour, piece) -> Img:
    col = WHITE if colour == "w" else BLACK
    img = Img(S, S)
    ink = Ink(img, lw=2)
    if piece == "S":
        b = V(S, S)
        b.rrect(C - 31, 86, 62, 11, 4)
        ink.part(b.mask(), col["fill"], shade=col["shade"], hi=col["hi"], line=col["line"], sd=4, hd=2)
        p = Pen(S, S, S / 64.0)
        sub = p.sub(4.0, 1.4, 56.9)
        M.knight(sub, ink, fill=col["fill"], shade=col["shade"], hi=col["hi"],
                 detail="ink0" if colour == "w" else "wood3", base=False)
        e = V(S, S)
        e.ellipse(C, 85, 22, 4.5)
        ink.part(e.mask(), col["fill"], shade=col["shade"], hi=col["hi"], line=col["line"], sd=2, hd=1)
    else:
        for m in shapes(piece):
            ink.part(m, col["fill"], shade=col["shade"], hi=col["hi"], line=col["line"], sd=4, hd=2)
    if colour == "b":
        # a light inner rim along the silhouette so a dark piece reads on a dark square
        sil = img.a >= 0
        rim = erode(sil, 3) & ~erode(sil, 5)
        img.fill(rim & band_tl(erode(sil, 3), 3), "wood4")
        img.fill(rim & ~band_tl(erode(sil, 3), 3), "wood2")
    ink.finish(3)
    return img


def marks(atlas: Atlas):
    W = 112
    c = W / 2
    img = Img(W, W)
    v = V(W, W)
    v.circle(c, c, 13)
    img.fill(v.mask(), "ink0", alpha=110)
    atlas.add("mark-target", img)
    img = Img(W, W)
    v = V(W, W)
    v.circle(c, c, 54)
    v.circle(c, c, 46, on=False)
    img.fill(v.mask(), "ink0", alpha=110)
    atlas.add("mark-capture", img)
    img = Img(W, W)
    sq = np.ones((W, W), bool)
    img.fill(sq & ~erode(sq, 7), "ink0")
    img.fill(erode(sq, 1) & ~erode(sq, 6), "beer3")
    img.fill(erode(sq, 2) & ~erode(sq, 3), "beer4")
    atlas.add("mark-selected", img)
    img = Img(W, W)
    img.fill(sq, "beer2", alpha=95)
    atlas.add("mark-last", img)
    img = Img(W, W)
    for r, a in ((54, 40), (44, 80), (34, 120), (24, 160)):
        v = V(W, W)
        v.circle(c, c, r)
        img.fill(v.mask(), "brick2", alpha=a)
    atlas.add("mark-check", img)


def build() -> Atlas:
    atlas = Atlas("chess", width=1024, lower_names=False)  # w-K … use the German piece letters
    for colour in "wb":
        atlas.group(colour)
        for piece in "KDTLSB":
            atlas.add(f"{colour}-{piece}", piece_img(colour, piece))
    atlas.group("marks")
    marks(atlas)
    return atlas
