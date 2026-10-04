"""Hand-lettering stroke font (card indices, Lautwörter, engravings, beer-mat letters).

Each glyph is a skeleton in a box of cap height 100 (y = 0 top, 100 baseline; umlaut dots go above 0) drawn with a
round pen, like a comic letterer's marker. The skeleton is scaled so the inked glyph is exactly `cap` pixels tall:
x_px = pen/2 + x*k, y_px = pen/2 + y*k with k = (cap - pen)/100.
"""
from __future__ import annotations

import math

import numpy as np

from px import V, Path, arc, tf


def _O(cx, cy, rx, ry):
    return arc(cx, cy, rx, ry, -90, 270, n=56)


G: dict[str, tuple[float, list[list[tuple[float, float]]]]] = {}


def _g(ch, w, *strokes):
    G[ch] = (w, [list(s) for s in strokes])


_g("A", 60, [(0, 100), (30, 0), (60, 100)], [(13, 63), (47, 63)])
_g("B", 55, [(0, 0), (0, 100)], Path(0, 0).L(25, 0).A(25, 24, 24, 24, -90, 90).L(0, 48).pts,
   Path(0, 48).L(28, 48).A(28, 74, 26, 26, -90, 90).L(0, 100).pts)
_g("C", 56, arc(31, 50, 31, 50, -42, -318, n=40))
_g("D", 54, Path(0, 0).L(18, 0).C(68, 0, 68, 100, 18, 100).L(0, 100).L(0, 0).pts)
_g("E", 46, [(46, 0), (0, 0), (0, 100), (46, 100)], [(0, 48), (38, 48)])
_g("F", 46, [(46, 0), (0, 0), (0, 100)], [(0, 48), (38, 48)])
_g("G", 60, arc(31, 50, 31, 50, -40, -342, n=44), [(33, 56), (61, 56), (61, 64)])
_g("H", 54, [(0, 0), (0, 100)], [(54, 0), (54, 100)], [(0, 50), (54, 50)])
_g("I", 26, [(13, 0), (13, 100)], [(0, 0), (26, 0)], [(0, 100), (26, 100)])
_g("K", 54, [(0, 0), (0, 100)], [(52, 0), (2, 60)], [(17, 42), (54, 100)])
_g("L", 44, [(0, 0), (0, 100), (44, 100)])
_g("M", 76, [(0, 100), (2, 0), (38, 58), (74, 0), (76, 100)])
_g("N", 54, [(0, 100), (0, 0), (54, 100), (54, 0)])
_g("O", 62, _O(31, 50, 31, 50))
_g("P", 52, [(0, 100), (0, 0)], Path(0, 0).L(25, 0).A(25, 26, 26, 26, -90, 90).L(0, 52).pts)
_g("R", 54, [(0, 100), (0, 0)], Path(0, 0).L(25, 0).A(25, 25, 25, 25, -90, 90).L(0, 50).pts, [(22, 50), (54, 100)])
_g("S", 52, Path(50, 15).C(45, 4, 36, 0, 26, 0).C(10, 0, 2, 10, 2, 25).C(2, 41, 17, 46, 27, 50)
   .C(40, 55, 52, 60, 52, 76).C(52, 92, 40, 100, 26, 100).C(13, 100, 4, 94, 0, 84).pts)
_g("T", 56, [(0, 0), (56, 0)], [(28, 0), (28, 100)])
_g("U", 54, Path(0, 0).L(0, 66).C(0, 112, 54, 112, 54, 66).L(54, 0).pts)
_g("V", 58, [(0, 0), (29, 100), (58, 0)])
_g("W", 80, [(0, 0), (19, 100), (40, 32), (61, 100), (80, 0)])
_g("X", 54, [(0, 0), (54, 100)], [(54, 0), (0, 100)])
_g("Y", 56, [(0, 0), (28, 50), (56, 0)], [(28, 50), (28, 100)])
_g("Z", 52, [(0, 0), (52, 0), (0, 100), (52, 100)])
G["Ö"] = (62, G["O"][1] + [[(17, -24)], [(45, -24)]])
G["Ä"] = (60, G["A"][1] + [[(15, -24)], [(45, -24)]])
G["Ü"] = (54, G["U"][1] + [[(13, -24)], [(41, -24)]])

_g("0", 48, _O(24, 50, 24, 50))
_g("1", 28, [(2, 22), (26, 0), (26, 100)])
_g("2", 50, Path(1, 22).C(3, 5, 15, 0, 25, 0).C(40, 0, 50, 10, 50, 26).C(50, 46, 28, 64, 0, 100).L(50, 100).pts)
_g("3", 50, Path(1, 13).C(7, 4, 16, 0, 25, 0).C(39, 0, 48, 10, 48, 24).C(48, 38, 38, 47, 21, 47).pts,
   Path(21, 47).C(41, 47, 51, 58, 51, 74).C(51, 91, 39, 100, 25, 100).C(13, 100, 4, 94, 0, 86).pts)
_g("4", 54, [(40, 100), (40, 0), (0, 70), (54, 70)])
_g("5", 50, [(47, 0), (8, 0), (4, 45)],
   Path(4, 45).C(12, 39, 19, 37, 27, 37).C(42, 37, 51, 50, 51, 68).C(51, 88, 40, 100, 25, 100)
   .C(13, 100, 4, 94, 0, 86).pts)
_six_bowl = _O(25, 72, 24, 28)
_six_tail = Path(1, 72).C(0, 30, 10, 0, 31, 0).C(39, 0, 45, 4, 48, 10).pts
_g("6", 50, _six_bowl, _six_tail)
_g("7", 50, [(0, 0), (50, 0), (15, 100)])
_g("8", 52, _O(26, 23, 21, 23), _O(26, 72, 25, 28))
_g("9", 50, tf(_six_bowl, rot=180, ox=25, oy=50), tf(_six_tail, rot=180, ox=25, oy=50))
_g("?", 50, Path(1, 22).C(3, 5, 15, 0, 25, 0).C(40, 0, 50, 10, 50, 25).C(50, 45, 26, 47, 26, 66).pts, [(26, 97)])
_g("!", 0, [(0, 0), (0, 64)], [(0, 97)])
_g("×", 40, [(0, 28), (40, 72)], [(40, 28), (0, 72)])
_g("-", 34, [(0, 54), (34, 54)])
_g("+", 58, [(0, 50), (58, 50)], [(29, 20), (29, 80)])
_g(".", 0, [(0, 97)])
_g(" ", 30)


def glyph_strokes(ch: str, x: float, y: float, cap: float, pen: float, rot=0.0, dy=0.0):
    """Strokes of `ch` in pixel coordinates with the glyph's top-left (ink box) at (x, y). Returns (strokes, width)."""
    w, strokes = G[ch]
    k = (cap - pen) / 100.0
    out = []
    cx = x + pen / 2 + w * k / 2
    cy = y + cap / 2
    for s in strokes:
        pts = [(x + pen / 2 + px * k, y + pen / 2 + py * k + dy) for px, py in s]
        if rot:
            pts = tf(pts, rot=rot, ox=cx, oy=cy + dy)
        out.append(pts)
    return out, w * k + pen


def text_width(text: str, cap: float, pen: float, gap: float) -> float:
    k = (cap - pen) / 100.0
    ws = [G[c][0] * k + pen for c in text]
    return sum(ws) + gap * (len(text) - 1)


def draw_text(v: V, text: str, x: float, y: float, cap: float, pen: float, gap: float, jitter=None, on=True):
    """Stroke `text` into the coverage canvas. jitter(i) -> (rot_degrees, dy_px) per letter. Returns the width."""
    cx = x
    for i, ch in enumerate(text):
        rot, dy = jitter(i) if jitter else (0.0, 0.0)
        strokes, w = glyph_strokes(ch, cx, y, cap, pen, rot, dy)
        for s in strokes:
            v.stroke(s, pen, on=on)
        cx += w + gap
    return cx - x - gap


def text_mask(text: str, cap: float, pen: float, gap: float, pad: int = 0, jitter=None, top_room: float = 0.0):
    """A tight boolean mask of the text (+pad px each side). top_room = extra px above the caps (umlaut dots)."""
    w = text_width(text, cap, pen, gap)
    W = int(math.ceil(w + 2 * pad + cap * 0.3))
    H = int(math.ceil(cap + top_room + 2 * pad + cap * 0.3))
    v = V(W, H)
    draw_text(v, text, pad + cap * 0.15, pad + top_room + cap * 0.15, cap, pen, gap, jitter)
    m = v.mask()
    ys, xs = np.nonzero(m)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    out = np.zeros((y1 - y0 + 2 * pad, x1 - x0 + 2 * pad), dtype=bool)
    out[pad:pad + y1 - y0, pad:pad + x1 - x0] = m[y0:y1, x0:x1]
    return out
