"""Drawing kit shared by the icon-like atlases (icons, items, drinks, chess, van, fx).

`Pen` maps a design space (usually 64 units square) onto pixels: every coordinate and width goes through
p -> d + p*k. `Pen.sub(x, y, s)` nests a 64-unit box of size s at (x, y). Shapes come back as boolean masks.

`Ink` cel-paints masks into an Img (ink contour, flat fill, one shade, one highlight) with line widths chosen for the
pixel size, and `finish()` thickens the outer silhouette contour (comic line: heavier outside than inside).
"""
from __future__ import annotations

import math

import numpy as np

from px import V, Img, Path, arc, paint, erode, dilate, edge_in, edge_out, band_br, band_tl, shift, tf


def catmull(pts, n=8, closed=False):
    P = list(pts)
    P = ([P[-1]] + P + [P[0], P[1]]) if closed else ([P[0]] + P + [P[-1]])
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for j in range(n):
            t = j / n
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2
                                    + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3) for k in (0, 1)))
    if not closed:
        out.append(P[-2])
    return out


class Pen:
    def __init__(self, W: int, H: int, k: float = 1.0, dx: float = 0.0, dy: float = 0.0):
        self.W, self.H, self.k, self.dx, self.dy = W, H, k, dx, dy

    def sub(self, x, y, s, base=64.0):
        return Pen(self.W, self.H, self.k * s / base, self.dx + x * self.k, self.dy + y * self.k)

    def P(self, pts):
        return [(self.dx + x * self.k, self.dy + y * self.k) for x, y in pts]

    def _v(self):
        return V(self.W, self.H)

    def poly(self, pts):
        return self._v().poly(self.P(pts)).mask()

    def ell(self, cx, cy, rx, ry=None):
        ry = rx if ry is None else ry
        (x, y), = self.P([(cx, cy)])
        return self._v().ellipse(x, y, rx * self.k, ry * self.k).mask()

    def circle(self, cx, cy, r):
        return self.ell(cx, cy, r, r)

    def rect(self, x, y, w, h):
        (X, Y), = self.P([(x, y)])
        return self._v().rect(X, Y, w * self.k, h * self.k).mask()

    def rrect(self, x, y, w, h, r):
        (X, Y), = self.P([(x, y)])
        return self._v().rrect(X, Y, w * self.k, h * self.k, r * self.k).mask()

    def stroke(self, pts, w, closed=False):
        return self._v().stroke(self.P(pts), max(1.0, w * self.k), closed=closed).mask()

    def arc(self, cx, cy, rx, ry, a0, a1, w):
        return self.stroke(arc(cx, cy, rx, ry, a0, a1), w)

    def ring(self, cx, cy, r, w):
        return self.stroke(arc(cx, cy, r, r, 0, 360, 64), w, closed=True)

    def spline(self, pts, closed=True, n=8):
        return self.poly(catmull(pts, n, closed))

    def empty(self):
        return np.zeros((self.H, self.W), bool)


class Ink:
    """Cel painter on an Img. lw = inner contour width in px (from the pixel size unless given)."""

    def __init__(self, img: Img, lw: int | None = None, line="ink1"):
        self.img = img
        size = min(img.w, img.h)
        self.lw = lw if lw is not None else (1 if size < 48 else 2 if size < 128 else 3)
        self.line = line
        self.all = np.zeros(img.a.shape, bool)

    def part(self, m, fill, shade=None, hi=None, line=None, lw=None, sd=None, hd=None, **kw):
        lw = self.lw if lw is None else lw
        if sd is None:
            sd = max(1, lw + 1)
        if hd is None:
            hd = max(1, lw - 1)
        self.all |= m
        return paint(self.img, m, fill, line=self.line if line is None else line, lw=lw, shade=shade, hi=hi, sd=sd,
                     hd=hd, **kw)

    def flat(self, m, c):
        self.all |= m
        self.img.fill(m, c)

    def lines(self, m, c=None):
        """Detail lines inside already painted parts."""
        self.img.fill(m & (self.img.a >= 0), self.line if c is None else c)

    def finish(self, olw: int | None = None, c="ink0"):
        """Heavier outer contour: the outermost olw px of the whole silhouette in ink0."""
        m = self.img.a >= 0
        olw = olw if olw is not None else self.lw + 1
        self.img.fill(edge_in(m, olw), c)
        return self.img


def new(size, h=None):
    """A blank Img, its Pen in a 64-unit design space and an Ink."""
    W, H = size, (size if h is None else h)
    img = Img(W, H)
    return img, Pen(W, H, W / 64.0), Ink(img)
