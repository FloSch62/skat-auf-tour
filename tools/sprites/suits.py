"""Suit symbols for the three decks, as vector shapes painted in the cel style.

French (Kreuz, Pik, Herz, Karo) and German (Eichel, Grün/Laub, Herz/Rot, Schellen) symbols are authored in a
100×100 design box and rendered at any pixel size. `suit_img(deck, suit, w, h)` returns a painted Img; the bottom half
of a pip card uses `.rot180()`.

Suit ids follow src/game/ids.ts: diamonds (Karo/Schellen), hearts (Herz/Rot), spades (Pik/Grün), clubs (Kreuz/Eichel).
"""
from __future__ import annotations

import numpy as np

from px import (V, Path, Img, arc, tf, paint, erode, dilate, band_br, band_tl, shift, edge_in)

# ── colours ────────────────────────────────────────────────────────────────────────────────────────────────

RED = dict(fill="road1", shade="road0", hi="brick3", line="brick0", index="road0")
BLACK = dict(fill="ink1", shade="ink0", hi="ink4", line="ink0", index="ink0")
GREEN = dict(fill="forest2", shade="forest1", hi="forest3", line="forest0", index="forest1")
YELLOW = dict(fill="beer2", shade="beer1", hi="beer3", line="wood1", index="beer0")

FRENCH_COL = {"diamonds": RED, "hearts": RED, "spades": BLACK, "clubs": BLACK}
TOURNAMENT_COL = {"diamonds": YELLOW, "hearts": RED, "spades": GREEN, "clubs": BLACK}
GERMAN_INDEX = "ink1"


def suit_colors(deck: str, suit: str) -> dict:
    if deck == "tournament":
        return TOURNAMENT_COL[suit]
    if deck == "german":
        return {"hearts": RED, "spades": dict(GREEN, fill="forest3", shade="forest2", hi="forest4"),
                "clubs": dict(fill="beer2", shade="beer1", hi="beer3", line="wood0"),
                "diamonds": YELLOW}[suit] | {"index": GERMAN_INDEX}
    return FRENCH_COL[suit]


# ── shapes in the 100×100 design box ───────────────────────────────────────────────────────────────────────

def heart_pts(plump=0.0):
    p = plump
    return (Path(50, 27 - p * 4).C(50, 9, 39, 0, 26, 0).C(10, 0, 0, 13, 0, 31).C(0, 57 - p * 6, 28, 72, 50, 100)
            .C(72, 72, 100, 57 - p * 6, 100, 31).C(100, 13, 90, 0, 74, 0).C(61, 0, 50, 9, 50, 27 - p * 4).pts)


def diamond_pts():
    return Path(50, 0).Q(63, 28, 88, 50).Q(63, 72, 50, 100).Q(37, 72, 12, 50).Q(37, 28, 50, 0).pts


def spade_pts():
    return (Path(50, 0).C(62, 20, 100, 36, 100, 61).C(100, 79, 87, 88, 74, 88).C(64, 88, 57, 83, 54, 77)
            .C(55, 88, 60, 95, 70, 100).L(30, 100).C(40, 95, 45, 88, 46, 77).C(43, 83, 36, 88, 26, 88)
            .C(13, 88, 0, 79, 0, 61).C(0, 36, 38, 20, 50, 0).pts)


def club_shapes():
    """(circles, polys) of the club: three leaves, a hub and the stem."""
    circles = [(50, 24, 24), (24, 60, 24), (76, 60, 24)]
    hub = [(50, 36), (34, 62), (66, 62)]
    stem = Path(46, 60).C(46, 80, 40, 93, 29, 100).L(71, 100).C(60, 93, 54, 80, 54, 60).pts
    return circles, [hub, stem]


def leaf_pts():
    return (Path(50, 0).C(57, 14, 98, 28, 98, 56).C(98, 76, 82, 86, 64, 83).C(58, 82, 53, 79, 50, 75)
            .C(47, 79, 42, 82, 36, 83).C(18, 86, 2, 76, 2, 56).C(2, 28, 43, 14, 50, 0).pts)


def _scale(pts, x, y, w, h):
    return [(x + px * w / 100.0, y + py * h / 100.0) for px, py in pts]


def _box(v: V, x, y, w, h):
    return lambda pts: _scale(pts, x, y, w, h)


def suit_mask(deck: str, suit: str, w: int, h: int) -> np.ndarray:
    """Silhouette of the symbol filling a w×h box."""
    v = V(w, h)
    S = _box(v, 0, 0, w, h)
    if deck != "german":
        if suit == "hearts":
            v.poly(S(heart_pts()))
        elif suit == "diamonds":
            v.poly(S(diamond_pts()))
        elif suit == "spades":
            v.poly(S(spade_pts()))
        else:
            circles, polys = club_shapes()
            for cx, cy, r in circles:
                v.ellipse(cx * w / 100, cy * h / 100, r * w / 100, r * h / 100)
            for p in polys:
                v.poly(S(p))
        return v.mask()
    if suit == "hearts":
        v.poly(S(heart_pts(plump=1.0)))
    elif suit == "spades":
        v.poly(S(leaf_pts()))
        v.stroke(S([(50, 70), (51, 84), (56, 96)]), max(2.0, w * 0.09))
    elif suit == "clubs":
        _acorn(v, S, w, h, part="all")
    else:
        _bell(v, S, w, h, part="all")
    return v.mask()


def _acorn(v: V, S, w, h, part):
    if part in ("all", "nut"):
        v.poly(S(Path(25, 42).C(22, 74, 38, 99, 50, 100).C(62, 99, 78, 74, 75, 42).pts))
    if part in ("all", "cap"):
        v.poly(S(Path(12, 50).C(10, 22, 28, 10, 50, 10).C(72, 10, 90, 22, 88, 50).C(70, 56, 30, 56, 12, 50).pts))
    if part in ("all", "stalk"):
        v.stroke(S([(50, 14), (51, 6), (57, 1)]), max(2.0, w * 0.1))


def _bell(v: V, S, w, h, part):
    if part in ("all", "body"):
        v.ellipse(50 * w / 100, 57 * h / 100, 43 * w / 100, 43 * h / 100)
    if part in ("all", "ring"):
        v.stroke(S(arc(50, 12, 10, 10, 0, 360, 24)), max(2.0, w * 0.08))


def suit_img(deck: str, suit: str, w: int, h: int, lw: int | None = None, detail=True) -> Img:
    """Paint a suit symbol into a w×h Img (transparent background)."""
    col = suit_colors(deck, suit)
    img = Img(w, h)
    lw = lw if lw is not None else (1 if w < 22 else 2 if w < 70 else 3)
    m = suit_mask(deck, suit, w, h)
    sd = max(1, round(w * 0.07))
    hd = max(1, round(w * 0.05))
    if deck != "german" or suit == "hearts":
        inner = paint(img, m, col["fill"], line=col["line"], lw=lw, shade=col["shade"], hi=col["hi"], sd=sd, hd=hd)
        return img
    S = lambda pts: _scale(pts, 0, 0, w, h)  # noqa: E731
    if suit == "spades":
        inner = paint(img, m, col["fill"], line=col["line"], lw=lw, shade=col["shade"], hi=col["hi"], sd=sd, hd=hd)
        if detail and w >= 18:
            vw = max(1.0, w * 0.035)
            vv = V(w, h)
            vv.stroke(S([(50, 12), (50, 74)]), vw * 1.3)
            for y0, dx in ((34, 22), (50, 30), (64, 24)):
                vv.stroke(S([(50, y0 + 6), (50 - dx, y0)]), vw)
                vv.stroke(S([(50, y0 + 6), (50 + dx, y0)]), vw)
            img.fill(vv.mask() & erode(inner, 1), "forest1")
        return img
    if suit == "clubs":
        vn = V(w, h)
        _acorn(vn, S, w, h, "nut")
        nut = vn.mask()
        vc = V(w, h)
        _acorn(vc, S, w, h, "cap")
        cap = vc.mask()
        vs = V(w, h)
        _acorn(vs, S, w, h, "stalk")
        stalk = vs.mask()
        paint(img, stalk, "wood1", line="wood0", lw=lw)
        paint(img, nut & ~cap, "beer2", line=col["line"], lw=lw, shade="beer1", hi="beer3", sd=sd, hd=hd)
        img.fill(nut & ~cap & ~erode(nut, lw), col["line"])
        ci = paint(img, cap, "wood3", line=col["line"], lw=lw, shade="wood2", sd=sd)
        if detail and w >= 18:
            yy, xx = np.indices((h, w))
            step = max(3, round(w / 9))
            hatch = (((xx + yy) % step) == 0) | (((xx - yy) % step) == 0)
            img.fill(hatch & erode(ci, 1), "wood1")
        return img
    # Schellen
    vb = V(w, h)
    _bell(vb, S, w, h, "body")
    body = vb.mask()
    vr = V(w, h)
    _bell(vr, S, w, h, "ring")
    ring = vr.mask() & ~body
    paint(img, ring, "beer1", line=col["line"], lw=max(1, lw - 1))
    bi = paint(img, body, "beer2", line=col["line"], lw=lw, shade="beer1", hi="beer4", sd=sd + 1, hd=hd)
    if detail:
        vband = V(w, h)
        vband.rect(0, h * 0.36, w, h * 0.13)
        band = vband.mask() & bi
        img.fill(band, "brick2")
        img.fill(band_br(band, max(1, round(h * 0.03))) & band, "brick1")
        img.fill(edge_in(band, 1) & band_dir_v(band), col["line"]) if w >= 30 else None
        vs = V(w, h)
        sw = max(1.5, w * 0.06)
        vs.stroke(S([(30, 76), (70, 76)]), sw)
        vs.circle(30 * w / 100, 76 * h / 100, max(1.5, w * 0.07))
        vs.circle(70 * w / 100, 76 * h / 100, max(1.5, w * 0.07))
        img.fill(vs.mask() & bi, col["line"])
    return img


def band_dir_v(m):
    """Top and bottom inner rows of a horizontal band."""
    return (m & ~shift(m, 0, 1)) | (m & ~shift(m, 0, -1))
