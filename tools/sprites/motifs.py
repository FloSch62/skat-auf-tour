"""Reusable motifs in a 64-unit design box (icons, items, van markers). Each takes a Pen and an Ink and paints
back to front. Colours follow the Leitpalette; the camper is cream with an orange-brown stripe (contract §2)."""
from __future__ import annotations

import math

import numpy as np

from glyphs import draw_text, text_width
from kit import Pen, Ink, catmull
from px import V, arc, erode, dilate, shift, tf, checker


def text(p: Pen, ink: Ink, s, cx, cy, cap, pen, fill, outline=None, ow=1, gap=1.5):
    """Centred stroke-font text."""
    k = p.k
    w = text_width(s, cap * k, pen * k, gap * k)
    v = V(p.W, p.H)
    x = p.dx + cx * k - w / 2
    y = p.dy + cy * k - cap * k / 2
    draw_text(v, s, x, y, cap * k, pen * k, gap * k)
    m = v.mask()
    if outline:
        ink.img.fill(dilate(m, ow) & ~m, outline)
    ink.img.fill(m, fill)
    ink.all |= m
    return m


def wheel(p: Pen, ink: Ink, cx, cy, r, tyre="ink1", rim="stone3", hub="ink2"):
    ink.part(p.circle(cx, cy, r), tyre, line="ink0")
    small = r * p.k < 8
    ink.part(p.circle(cx, cy, r * (0.62 if small else 0.66)), rim, shade=None if small else "stone2", hi="stone4",
             line=None if small else "ink1", lw=0 if small else None, sd=max(1, round(r * p.k * 0.2)))
    ink.flat(p.circle(cx, cy, max(1.0, r * 0.2)), hub)


def motorcycle(p: Pen, ink: Ink, body="brick2", body_shade="brick1", body_hi="brick3", wheels=True):
    """A seventies motorcycle without badges, side view facing right."""
    ink.part(p.stroke([(14, 46), (30, 39)], 3.5), "ink2")
    ink.part(p.stroke([(50, 46), (43, 22)], 3.5), "stone2", hi="stone3")
    if wheels:
        wheel(p, ink, 14, 46, 11)
        wheel(p, ink, 50, 46, 11)
    ink.part(p.stroke([(37, 45), (18, 43), (5, 40)], 3.6), "stone3", shade="stone2", lw=1)
    ink.part(p.arc(14, 46, 14, 14, 200, 285, 3.0), body, lw=1)
    ink.part(p.arc(50, 46, 14, 14, 235, 315, 3.0), body, lw=1)
    ink.part(p.rrect(24, 33, 15, 13, 3), "stone3", shade="stone1", hi="stone4")
    if p.k > 0.8:
        ink.lines(p.stroke([(26, 37), (37, 37)], 1.0) | p.stroke([(26, 41), (37, 41)], 1.0), "stone1")
    ink.part(p.spline([(22, 31), (26, 22), (40, 21), (45, 27), (41, 33), (24, 34)]), body, shade=body_shade, hi=body_hi)
    ink.part(p.rrect(9, 25, 18, 7, 3), "wood1", hi="wood3")
    ink.part(p.circle(47, 25, 3.8), "beer3", hi="road3", line="ink1")
    ink.part(p.stroke([(41, 19), (45, 18.5), (39, 15)], 2.2), "ink1")


def camper(p: Pen, ink: Ink, bike=False, moon=False, stripe="beer0", stripe2="wood2"):
    """The cream alcove camper with an orange-brown stripe, side view facing right (64 wide, rows ~12..56)."""
    if bike:
        # the motorcycle on the rear rack, seen behind the body's tail
        ink.part(p.rect(0, 42, 6, 3), "stone1")
        sub = p.sub(-10, 26, 24)
        motorcycle(sub, ink)
    ink.part(p.rrect(5, 19, 42, 31, 3), "paper3", shade="paper1", hi="road3")
    ink.part(p.poly([(39, 13), (55, 13), (59, 18), (57, 23), (39, 24)]), "paper3", shade="paper1", hi="road3")
    ink.part(p.poly([(43, 25), (53, 25), (60, 34), (60, 50), (43, 50)]), "paper3", shade="paper1", hi="road3")
    ink.part(p.poly([(47, 27), (53, 27), (58.5, 35), (47, 35)]), "river4", hi="river5", line="ink1")
    ink.flat(p.rect(5, 36, 55, 3.5) & ink.all, stripe)
    ink.flat(p.rect(5, 39.5, 55, 1.6) & ink.all, stripe2)
    ink.part(p.rrect(9, 23, 11, 8, 2), "river3", hi="river4", line="ink1")
    ink.part(p.rrect(26, 24, 9, 21, 2), "paper2", shade="paper1", line="ink1")
    ink.flat(p.circle(33, 35, 1.0), "ink1")
    ink.part(p.rect(57, 43, 4, 3), "beer3", line="ink1")
    wheel(p, ink, 16, 50, 7)
    wheel(p, ink, 51, 50, 7)
    if moon:
        m = p.circle(13, 9, 7) & ~p.circle(17, 6, 6)
        ink.part(m, "beer3", hi="beer4", line="ink1")


def beer_mug(p: Pen, ink: Ink):
    ink.part(p.stroke(arc(44, 36, 10, 12, -75, 75), 5.0), "paper2", shade="paper1", line="ink1")
    body = p.rrect(15, 18, 30, 40, 4)
    inner = ink.part(body, "beer2", shade="beer1", hi="beer3", sd=3)
    ink.lines(p.stroke([(22, 26), (22, 52)], 1.4) | p.stroke([(30, 26), (30, 53)], 1.4) | p.stroke([(38, 26), (38, 52)], 1.4),
              "beer1")
    ink.part(p.spline([(12, 20), (14, 12), (22, 8), (31, 10), (40, 7), (48, 12), (48, 20), (42, 24), (30, 22),
                       (18, 24)]), "road3", shade="paper2", line="ink1")


def trophy(p: Pen, ink: Ink, cup="beer2", shade="beer1", hi="beer4", base="wood2"):
    for s in (-1, 1):
        ink.part(p.stroke(arc(32 + s * 19, 20, 7, 8, -90 if s > 0 else 90, 90 if s > 0 else 270), 4.0), cup, shade=shade)
    ink.part(p.rect(28, 34, 8, 10), cup, shade=shade)
    ink.part(p.spline([(13, 8), (51, 8), (49, 22), (41, 33), (23, 33), (15, 22)], closed=True, n=6), cup, shade=shade,
             hi=hi, sd=3)
    ink.part(p.rrect(17, 43, 30, 13, 2), base, shade="wood1", hi="wood3")
    ink.part(p.rect(24, 46, 16, 5), "beer3", line="ink1")


def knight_pts():
    return [(18, 58), (19, 46), (24, 37), (17, 33), (13, 27), (15, 21), (25, 11), (30, 4), (33, 9), (41, 11), (48, 20),
            (50, 32), (48, 44), (48, 58)]


def knight(p: Pen, ink: Ink, fill="paper4", shade="paper2", hi="road3", detail="ink1", base=True):
    if base:
        ink.part(p.rrect(12, 50, 40, 10, 3), fill, shade=shade, hi=hi)
    body = p.spline(knight_pts(), closed=True, n=6)
    inner = ink.part(body, fill, shade=shade, hi=hi, sd=3)
    ink.lines(p.circle(31, 18, 2.2), detail)
    ink.lines(p.stroke([(16, 27), (19, 28)], 1.6), detail)
    ink.lines(p.stroke([(40, 12), (47, 22), (48, 34)], 2.2) & erode(inner, 1), shade)


def paw(p: Pen, ink: Ink, fill="wood2", shade="wood1", hi="wood3"):
    ink.part(p.spline([(32, 30), (44, 36), (46, 48), (38, 56), (32, 53), (26, 56), (18, 48), (20, 36)]), fill, shade=shade,
             hi=hi)
    for x, y, a in ((14, 30, -25), (24, 18, -8), (40, 18, 8), (50, 30, 25)):
        m = p.ell(x, y, 6, 7.5)
        ink.part(m, fill, shade=shade, hi=hi)


def wrench(p: Pen, ink: Ink, fill="stone3", shade="stone1", hi="stone4"):
    handle = p.stroke([(16, 50), (40, 26)], 9)
    head = p.circle(45, 20, 12) & ~p.poly([(44, 21), (60, 2), (66, 14), (50, 26)])
    tail = p.circle(14, 52, 7.5) & ~p.circle(14, 52, 3.4)
    ink.part(handle | head | tail, fill, shade=shade, hi=hi, sd=3)


def warning(p: Pen, ink: Ink):
    ink.part(p.poly([(32, 5), (61, 56), (3, 56)]), "road1", shade="road0", line="ink0")
    ink.part(p.poly([(32, 17), (51, 50), (13, 50)]), "road3", line="road0")
    ink.flat(p.stroke([(32, 27), (32, 39)], 6), "ink1")
    ink.flat(p.circle(32, 45.5, 3.4), "ink1")


def flag(p: Pen, ink: Ink):
    ink.part(p.stroke([(14, 8), (14, 60)], 5), "wood3", shade="wood2", hi="wood5")
    fl = p.poly(catmull([(16, 10), (28, 7), (40, 12), (54, 9), (54, 34), (42, 37), (28, 32), (16, 35)], n=8, closed=False)
                + [(16, 35)])
    inner = ink.part(fl, "road3", line="ink1")
    cell = max(2, int(round(6 * p.k)))
    yy, xx = np.indices(fl.shape)
    ox, oy = int(p.dx + 16 * p.k), int(p.dy + 8 * p.k)
    ch = (((xx - ox) // cell + (yy - oy) // cell) % 2) == 0
    ink.img.fill(ch & inner, "ink1")
    ink.part(p.circle(14, 7, 3.5), "beer2", line="ink1")


def cards_q(p: Pen, ink: Ink):
    back = p.poly(tf([(10, 12), (40, 12), (40, 54), (10, 54)], rot=-14, ox=25, oy=33))
    ink.part(back, "brick1", hi="brick3", line="ink1")
    front = p.poly(tf([(22, 10), (52, 10), (52, 54), (22, 54)], rot=9, ox=37, oy=32))
    ink.part(front, "road3", shade="paper2", line="ink1")
    text(p, ink, "?", 37, 32, 28, 6.5, "felt2")


def newspaper(p: Pen, ink: Ink):
    ink.part(p.poly([(9, 9), (55, 7), (56, 56), (8, 57)]), "paper3", shade="paper1", hi="road3", line="ink1")
    ink.lines(p.rect(13, 12, 38, 4), "ink2")
    ink.lines(p.rect(13, 18, 24, 1.5) | p.rect(13, 20.5, 18, 1.5), "ink4")
    x0, y0, s = 20, 25, 27
    g = p.rect(x0, y0, s, s)
    ink.flat(g & ~p.rect(x0 + 1.5, y0 + 1.5, s - 3, s - 3), "ink1")
    for i in (1, 2):
        ink.flat(p.rect(x0 + i * s / 3 - 0.6, y0, 1.4, s) | p.rect(x0, y0 + i * s / 3 - 0.6, s, 1.4), "ink1")
    for cx_, cy_ in ((0, 0), (2, 1), (1, 2), (2, 2)):
        ink.flat(p.rect(x0 + cx_ * s / 3 + 3, y0 + cy_ * s / 3 + 2.5, 3, 4.5), "brick1")


def stall(p: Pen, ink: Ink):
    for x in (12, 52):
        ink.part(p.stroke([(x, 24), (x, 59)], 3.5), "wood2", hi="wood4")
    ink.part(p.rrect(7, 40, 50, 7, 2), "wood3", shade="wood2", hi="wood5")
    for x, c in ((16, "brick2"), (24, "beer2"), (31, "river2"), (40, "forest3"), (47, "brick2")):
        ink.part(p.circle(x, 36, 4.2), c, hi="road3")
    aw = p.poly([(4, 18), (60, 18), (60, 26), (4, 26)])
    for i in range(7):
        aw |= p.circle(8 + i * 8, 26, 4)
    inner = ink.part(aw, "road3", line="ink1")
    yy, xx = np.indices(aw.shape)
    stripe = ((((xx - p.dx) / max(p.k, 1e-6)) // 8) % 2 == 0)
    ink.img.fill(stripe & inner, "brick2")
    ink.part(p.poly([(10, 10), (54, 10), (60, 18), (4, 18)]), "brick1", hi="brick3")


def dog_head(p: Pen, ink: Ink, fur="wood3", shade="wood2", hi="wood4", saddle="ink2", ears_up=True):
    if ears_up:
        for s in (-1, 1):
            ink.part(p.poly([(32 + s * 8, 22), (32 + s * 20, 4), (32 + s * 22, 26)]), fur, shade=shade)
            ink.lines(p.poly([(32 + s * 13, 22), (32 + s * 19, 10), (32 + s * 19, 24)]), "brick3")
    head = p.spline([(32, 14), (46, 18), (52, 32), (46, 42), (32, 46), (18, 42), (12, 32), (18, 18)])
    inner = ink.part(head, fur, shade=shade, hi=hi, sd=3)
    if saddle:
        ink.lines(p.spline([(32, 14), (44, 17), (40, 24), (32, 22), (24, 24), (20, 17)]) & inner, saddle)
    ink.part(p.spline([(32, 34), (42, 38), (42, 50), (32, 56), (22, 50), (22, 38)]), "paper2", shade="paper1")
    ink.part(p.ell(32, 39, 5.5, 4), "ink1", hi="ink4")
    ink.lines(p.stroke([(32, 43), (32, 48), (27, 51)], 1.4) | p.stroke([(32, 48), (37, 51)], 1.4), "ink1")
    for s in (-1, 1):
        ink.flat(p.ell(32 + s * 9, 29, 2.2, 2.6), "ink0")
