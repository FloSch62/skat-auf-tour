"""Court figures for the cards atlas: classic double-headed half figures in a cel-shaded comic line.

The picture frame of a large court card is the union of two offset rectangles (top right and bottom left of the
card, 180° symmetric), leaving the two corner indices free. The top bust is drawn once in an 84×96 px panel and
repeated rotated by 180° in the bottom panel; a seam line separates the halves.

French/tournament: Bube (cap with feather, halberd), Dame (crown, long hair, rose), König (crown, beard, sceptre).
German: Unter (beret with feather, suit symbol low), Ober (plumed broad hat, moustache, suit symbol high),
König (arched crown, beard, sceptre). These are the code fallback for the painted court art (contract §9).
"""
from __future__ import annotations

import math

import numpy as np

from px import (V, Img, Path, arc, paint, erode, dilate, edge_in, band_br, band_tl, shift, place, tf, bez)
from suits import suit_img

BW, BH = 84, 97            # bust panel (atlas px)
TOP = (52, 10)             # top panel interior origin on the 144×216 card
BOT = (8, 109)             # bottom panel interior origin (rot180 of the top)

SKIN = dict(fill="brick4", shade="brick3", line="ink1")

ROBES = {
    "french": {"clubs": ("river2", "river1", "river3"), "spades": ("dusk2", "dusk1", "dusk3"),
               "hearts": ("brick2", "brick1", "brick3"), "diamonds": ("forest2", "forest1", "forest3")},
    "german": {"clubs": ("olive2", "olive1", "olive3"), "spades": ("forest2", "forest1", "forest3"),
               "hearts": ("brick2", "brick1", "brick3"), "diamonds": ("river2", "river1", "river3")},
}
HAIR = {  # king (beard), queen, jack
    "clubs": ("stone3", "wood2", "beer2"),
    "spades": ("ink3", "ink2", "wood1"),
    "hearts": ("wood3", "beer3", "wood3"),
    "diamonds": ("wood2", "brick1", "ink3"),
}
HAIR_SHADE = {"stone3": "stone2", "ink3": "ink2", "ink2": "ink1", "wood3": "wood2", "wood2": "wood1",
              "wood1": "wood0", "beer2": "beer1", "beer3": "beer1", "brick1": "brick0"}


class Canvas:
    """A bust panel: parts are added back to front with paint(). k/ox/oy scale the design space about (ox, oy)."""

    def __init__(self, w=BW, h=BH, k=1.0, ox=0.0, oy=0.0):
        self.w, self.h = w, h
        self.k, self.ox, self.oy = k, ox, oy
        self.img = Img(w, h)

    def v(self):
        return V(self.w, self.h, k=self.k, ox=self.ox, oy=self.oy)

    def part(self, m, fill, shade=None, hi=None, line="ink1", lw=2, sd=3, hd=2, **kw):
        return paint(self.img, m, fill, line=line, lw=lw, shade=shade, hi=hi, sd=sd, hd=hd, **kw)


def catmull(pts, n=8, closed=False):
    """Catmull-Rom spline through points."""
    P = list(pts)
    if closed:
        P = [P[-1]] + P + [P[0], P[1]]
    else:
        P = [P[0]] + P + [P[-1]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for j in range(n):
            t = j / n
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2
                                    + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3) for k in (0, 1)))
    out.append(P[-2])
    return out


# ── the head ───────────────────────────────────────────────────────────────────────────────────────────────

def face(c: Canvas, hx, hy, kind, hair, beard=False, moustache=False, young=False, female=False):
    v = c.v()
    # ears
    v.ellipse(hx - 12.5, hy + 2, 3, 4.5)
    v.ellipse(hx + 12.5, hy + 2, 3, 4.5)
    c.part(v.mask(), SKIN["fill"], shade=SKIN["shade"], sd=2, lw=2)
    # head
    v = c.v()
    if female:
        v.poly(catmull([(hx - 11, hy - 8), (hx, hy - 15), (hx + 11, hy - 8), (hx + 10, hy + 7), (hx + 4, hy + 15),
                        (hx - 4, hy + 15), (hx - 10, hy + 7)], closed=True))
    else:
        v.poly(catmull([(hx - 12, hy - 8), (hx, hy - 16), (hx + 12, hy - 8), (hx + 12, hy + 6), (hx + 6, hy + 16),
                        (hx - 6, hy + 16), (hx - 12, hy + 6)], closed=True))
    head = v.mask()
    c.part(head, SKIN["fill"], shade=SKIN["shade"], sd=3, lw=2)
    hs = HAIR_SHADE.get(hair, "ink1")
    # beard
    if beard:
        v = c.v()
        v.poly(catmull([(hx - 13, hy - 2), (hx - 9, hy + 10), (hx - 6, hy + 21), (hx, hy + 27), (hx + 6, hy + 21),
                        (hx + 9, hy + 10), (hx + 13, hy - 2), (hx + 10, hy + 6), (hx + 4, hy + 9), (hx - 4, hy + 9),
                        (hx - 10, hy + 6)], closed=True))
        bm = v.mask()
        inner = c.part(bm, hair, shade=hs, sd=3, lw=2)
        # beard strands
        sv = c.v()
        for dx in (-6, -2, 2, 6):
            sv.stroke([(hx + dx, hy + 12), (hx + dx * 0.8, hy + 20)], 1.0)
        c.img.fill(sv.mask() & erode(inner, 1), hs)
        # mouth gap in the beard
        mv = c.v()
        mv.stroke([(hx - 3, hy + 11), (hx + 3, hy + 11)], 1.6)
        c.img.fill(mv.mask(), "ink1")
    # eyes and brows
    ev = c.v()
    for s in (-1, 1):
        ev.ellipse(hx + s * 5, hy - 1, 1.3, 1.8)
    c.img.fill(ev.mask(), "ink0")
    bv = c.v()
    bw = 1.8 if not female else 1.1
    for s in (-1, 1):
        bv.stroke([(hx + s * 8, hy - 6 + (1 if young else 0)), (hx + s * 3, hy - 6.5)], bw)
    c.img.fill(bv.mask(), "ink1" if female else hs if hair not in ("beer2", "beer3", "stone3") else "wood1")
    if female:
        lv = c.v()
        for s in (-1, 1):
            lv.stroke([(hx + s * 5, hy - 3.2), (hx + s * 7, hy - 3.8)], 1.0)
        c.img.fill(lv.mask(), "ink1")
    # nose: a round comic nose
    nv = c.v()
    if female:
        nv.ellipse(hx + 0.5, hy + 4, 2.2, 2.6)
    else:
        nv.ellipse(hx + 0.5, hy + 4, 3.4, 3.6)
    c.part(nv.mask(), "brick3" if not female else SKIN["fill"], shade="brick2" if not female else SKIN["shade"],
           sd=1, lw=1)
    # cheeks
    if female or young:
        ch = c.v()
        for s in (-1, 1):
            ch.ellipse(hx + s * 7, hy + 6, 2, 1.4)
        c.img.fill(ch.mask() & erode(head, 2), "brick3")
    # mouth / moustache
    if moustache or beard:
        mv = c.v()
        mv.poly(catmull([(hx, hy + 6.5), (hx + 6, hy + 7), (hx + 10, hy + 10), (hx + 5, hy + 10), (hx, hy + 8.5),
                         (hx - 5, hy + 10), (hx - 10, hy + 10), (hx - 6, hy + 7)], closed=True, n=6))
        c.part(mv.mask(), hair, shade=hs, sd=1, lw=1)
    if not beard:
        mv = c.v()
        if female:
            mv.ellipse(hx + 0.5, hy + 10, 3, 1.5)
            c.part(mv.mask(), "road1", line="brick0", lw=1)
        else:
            mv.stroke([(hx - 3, hy + 11), (hx + 3, hy + 11.5)], 1.4)
            c.img.fill(mv.mask(), "ink1")
    return head


def hair_back(c: Canvas, hx, hy, hair, kind):
    """Hair behind the head (long for queens, a bob for jacks, sides for kings)."""
    v = c.v()
    if kind == "long":
        v.poly(catmull([(hx - 14, hy - 10), (hx, hy - 19), (hx + 14, hy - 10), (hx + 17, hy + 10), (hx + 19, hy + 28),
                        (hx + 12, hy + 34), (hx + 8, hy + 16), (hx - 8, hy + 16), (hx - 12, hy + 34), (hx - 19, hy + 28),
                        (hx - 17, hy + 10)], closed=True))
    elif kind == "bob":
        v.poly(catmull([(hx - 14, hy - 8), (hx, hy - 18), (hx + 14, hy - 8), (hx + 15, hy + 6), (hx + 12, hy + 12),
                        (hx - 12, hy + 12), (hx - 15, hy + 6)], closed=True))
    else:
        v.poly(catmull([(hx - 14, hy - 8), (hx, hy - 17), (hx + 14, hy - 8), (hx + 15, hy + 8), (hx + 11, hy + 12),
                        (hx - 11, hy + 12), (hx - 15, hy + 8)], closed=True))
    m = v.mask()
    inner = c.part(m, hair, shade=HAIR_SHADE.get(hair, "ink1"), sd=3, lw=2)
    if kind == "long":
        sv = c.v()
        for dx in (-15, 15):
            sv.stroke([(hx + dx * 0.95, hy + 4), (hx + dx * 1.05, hy + 26)], 1.0)
        c.img.fill(sv.mask() & erode(inner, 1), HAIR_SHADE.get(hair, "ink1"))


def fringe(c: Canvas, hx, hy, hair, female=False):
    v = c.v()
    if female:
        v.poly(catmull([(hx - 12, hy - 6), (hx - 6, hy - 15), (hx + 6, hy - 15), (hx + 12, hy - 6), (hx + 4, hy - 9),
                        (hx, hy - 7), (hx - 4, hy - 9)], closed=True, n=6))
    else:
        v.poly(catmull([(hx - 13, hy - 4), (hx - 8, hy - 15), (hx + 8, hy - 15), (hx + 13, hy - 4), (hx + 8, hy - 8),
                        (hx + 2, hy - 7), (hx - 5, hy - 9), (hx - 10, hy - 6)], closed=True, n=6))
    c.part(v.mask(), hair, shade=HAIR_SHADE.get(hair, "ink1"), sd=2, lw=2)


# ── headwear ───────────────────────────────────────────────────────────────────────────────────────────────

def crown(c: Canvas, hx, top, w=30, h=20, points=5, arched=False, jewel="brick2"):
    v = c.v()
    x0, x1 = hx - w / 2, hx + w / 2
    base_y = top + h
    pts = [(x0, base_y), (x0, base_y - h * 0.42)]
    for i in range(points):
        t = (i + 0.5) / points
        px_ = x0 + w * t
        pts.append((px_ - w / points * 0.32, base_y - h * 0.46))
        pts.append((px_, top + (0 if i % 2 == 0 or points < 4 else h * 0.18)))
        pts.append((px_ + w / points * 0.32, base_y - h * 0.46))
    pts += [(x1, base_y - h * 0.42), (x1, base_y)]
    v.poly(pts)
    if arched:
        v.stroke(arc(hx, base_y - h * 0.3, w * 0.42, h * 0.95, 180, 360, 20), 3.2)
        v.circle(hx, top - h * 0.62, 3.2)
    m = v.mask()
    inner = c.part(m, "beer2", shade="beer1", hi="beer4", sd=2, hd=1, lw=2)
    # band and jewels
    bv = c.v()
    bv.rect(x0, base_y - 6, w, 6)
    band = bv.mask() & m
    c.part(band, "beer1", hi="beer3", hd=1, lw=1)
    jv = c.v()
    for i in range(3):
        jv.ellipse(hx + (i - 1) * w * 0.3, base_y - 3, 2.0, 1.8)
    c.part(jv.mask(), jewel, hi="road3", hd=1, lw=1)
    # points' balls
    pv = c.v()
    for i in range(points):
        t = (i + 0.5) / points
        if i % 2 == 0 or points < 4:
            pv.circle(x0 + w * t, top + 0.5, 2.0)
    c.part(pv.mask(), "road3", lw=1)


def cap(c: Canvas, hx, hy, col, feather="road3", beret=True, plume_side=1):
    """Beret with a feather (Bube / Unter)."""
    fv = c.v()
    fx = hx + plume_side * 6
    feath = Path(fx, hy - 18).C(fx + plume_side * 6, hy - 34, fx + plume_side * 20, hy - 36, fx + plume_side * 26,
                                 hy - 30).pts
    fv.stroke(feath, 5.0)
    fm = fv.mask()
    inner = c.part(fm, feather, shade="paper2", lw=2, sd=1)
    sv = c.v()
    sv.stroke(feath[2:-2], 1.0)
    c.img.fill(sv.mask() & inner, "paper1")
    v = c.v()
    if beret:
        v.ellipse(hx + 1, hy - 16, 18, 7.5)
        v.ellipse(hx - 1, hy - 20, 13, 7)
    m = v.mask()
    c.part(m, col[0], shade=col[1], hi=col[2], sd=3, lw=2)
    bv = c.v()
    bv.rect(hx - 15, hy - 13, 30, 3.5)
    c.part(bv.mask() & dilate(m, 1), "beer2", lw=1)


def broad_hat(c: Canvas, hx, hy, col, plume="road3"):
    """Broad-brimmed hat with a plume (Ober)."""
    fv = c.v()
    feath = Path(hx + 4, hy - 22).C(hx - 6, hy - 40, hx - 26, hy - 40, hx - 34, hy - 28).pts
    fv.stroke(feath, 7.0)
    fv.stroke(Path(hx + 6, hy - 22).C(hx + 2, hy - 36, hx + 16, hy - 42, hx + 26, hy - 36).pts, 5.0)
    c.part(fv.mask(), plume, shade="paper2", sd=2, lw=2)
    v = c.v()
    v.ellipse(hx, hy - 13, 24, 5.5)
    brim = v.mask()
    v2 = c.v()
    v2.poly(catmull([(hx - 12, hy - 14), (hx - 11, hy - 25), (hx, hy - 29), (hx + 11, hy - 25), (hx + 12, hy - 14)]))
    v2.rect(hx - 12, hy - 18, 24, 5)
    crownm = v2.mask()
    c.part(crownm, col[0], shade=col[1], hi=col[2], sd=3, lw=2)
    c.part(brim, col[1], shade=col[1], hi=col[0], lw=2, hd=1)
    bv = c.v()
    bv.rect(hx - 12, hy - 19, 24, 3)
    c.part(bv.mask() & crownm, "beer2", lw=1)


# ── torso and attributes ───────────────────────────────────────────────────────────────────────────────────

def torso(c: Canvas, hx, neck_y, robe, collar):
    v = c.v()
    v.rect(hx - 6, neck_y - 6, 12, 10)
    c.part(v.mask(), SKIN["fill"], shade=SKIN["shade"], sd=3, lw=2)
    v = c.v()
    v.poly(catmull([(-4, BH + 6), (2, neck_y + 22), (10, neck_y + 10), (hx - 16, neck_y + 2), (hx, neck_y + 1),
                    (hx + 16, neck_y + 2), (BW - 8, neck_y + 10), (BW - 1, neck_y + 22), (BW + 4, BH + 6)], n=6))
    body = v.mask()
    inner = c.part(body, robe[0], shade=robe[1], hi=robe[2], sd=4, hd=2, lw=2)
    # folds
    fv = c.v()
    for x0 in (hx - 22, hx + 20):
        fv.stroke([(x0, neck_y + 18), (x0 + (2 if x0 > hx else -2), BH)], 1.4)
    c.img.fill(fv.mask() & erode(inner, 1), robe[1])
    if collar == "ermine":
        v = c.v()
        v.poly(catmull([(4, neck_y + 22), (12, neck_y + 8), (hx - 14, neck_y + 1), (hx, neck_y + 10),
                        (hx + 14, neck_y + 1), (BW - 10, neck_y + 8), (BW - 2, neck_y + 22), (BW - 6, neck_y + 30),
                        (hx + 12, neck_y + 16), (hx, neck_y + 22), (hx - 12, neck_y + 16), (8, neck_y + 30)],
                       closed=True, n=6))
        em = v.mask() & body
        ei = c.part(em, "road3", shade="paper2", sd=2, lw=2)
        dv = c.v()
        for i, (x_, y_) in enumerate([(14, neck_y + 18), (26, neck_y + 12), (hx + 8, neck_y + 13), (hx + 22, neck_y + 10),
                                      (BW - 14, neck_y + 18), (hx - 6, neck_y + 16)]):
            dv.poly([(x_, y_ - 2.5), (x_ + 1.5, y_ + 1.5), (x_ - 1.5, y_ + 1.5)])
        c.img.fill(dv.mask() & ei, "ink1")
    elif collar == "necklace":
        v = c.v()
        v.poly(catmull([(hx - 18, neck_y + 2), (hx, neck_y + 16), (hx + 18, neck_y + 2), (hx + 12, neck_y + 1),
                        (hx, neck_y + 8), (hx - 12, neck_y + 1)], closed=True, n=6))
        c.part(v.mask() & body, SKIN["fill"], shade=SKIN["shade"], sd=2, lw=2)
        nv = c.v()
        for i in range(-3, 4):
            a = math.radians(90 + i * 22)
            nv.circle(hx + 15 * math.cos(a), neck_y + 4 + 9 * math.sin(a), 1.6)
        c.part(nv.mask(), "road3", lw=1)
        pv = c.v()
        pv.poly([(hx, neck_y + 13), (hx + 3, neck_y + 17), (hx, neck_y + 21), (hx - 3, neck_y + 17)])
        c.part(pv.mask(), "brick2", hi="brick4", lw=1, hd=1)
    elif collar == "ruff":
        v = c.v()
        for i in range(7):
            v.circle(hx - 15 + i * 5, neck_y + 3 + (1 if i % 2 else 0), 4.2)
        c.part(v.mask(), "road3", shade="paper2", sd=1, lw=1)
    elif collar == "square":
        v = c.v()
        v.poly([(hx - 14, neck_y + 1), (hx + 14, neck_y + 1), (hx + 10, neck_y + 14), (hx - 10, neck_y + 14)])
        c.part(v.mask() & body, "road3", shade="paper2", sd=2, lw=2)
        lv = c.v()
        lv.stroke([(hx, neck_y + 2), (hx, neck_y + 13)], 1.2)
        c.img.fill(lv.mask(), "paper1")
    return body


def hand(c: Canvas, x, y, r=4.5):
    v = c.v()
    v.ellipse(x, y, r, r * 0.85)
    c.part(v.mask(), SKIN["fill"], shade=SKIN["shade"], sd=2, lw=2)


def sceptre(c: Canvas, x, y0, y1):
    v = c.v()
    v.stroke([(x, y0 + 6), (x - 1, y1)], 4.0)
    c.part(v.mask(), "beer2", shade="beer1", hi="beer4", sd=1, hd=1, lw=1)
    v = c.v()
    v.circle(x, y0 + 4, 5.5)
    c.part(v.mask(), "beer2", shade="beer1", hi="beer4", sd=2, hd=1, lw=2)
    v = c.v()
    v.stroke([(x, y0 - 6), (x, y0 + 1)], 2.2)
    v.stroke([(x - 3, y0 - 3), (x + 3, y0 - 3)], 2.2)
    c.part(v.mask(), "beer2", lw=1)
    hand(c, x - 1, y1 - 14)


def sword(c: Canvas, x, y0, y1):
    v = c.v()
    v.poly([(x - 2.5, y0 + 18), (x, y0), (x + 2.5, y0 + 18), (x + 2.5, y1 - 22), (x - 2.5, y1 - 22)])
    c.part(v.mask(), "stone4", shade="stone2", hi="road3", sd=1, lw=1)
    v = c.v()
    v.rect(x - 8, y1 - 23, 16, 4)
    v.rect(x - 2, y1 - 20, 4, 12)
    c.part(v.mask(), "beer2", shade="beer1", lw=1)
    hand(c, x, y1 - 13)


def halberd(c: Canvas, x, y0, y1):
    v = c.v()
    v.stroke([(x, y0 + 4), (x, y1)], 3.4)
    c.part(v.mask(), "wood3", shade="wood2", lw=1)
    v = c.v()
    v.poly([(x, y0 - 4), (x + 3, y0 + 6), (x + 2, y0 + 10), (x - 2, y0 + 10), (x - 3, y0 + 6)])
    v.poly(catmull([(x + 1, y0 + 9), (x + 12, y0 + 6), (x + 14, y0 + 14), (x + 12, y0 + 22), (x + 1, y0 + 18)],
                   closed=True, n=5))
    v.poly([(x - 1, y0 + 11), (x - 9, y0 + 14), (x - 1, y0 + 17)])
    c.part(v.mask(), "stone3", shade="stone2", hi="stone4", sd=2, hd=1, lw=2)
    hand(c, x, y1 - 18)


def rose(c: Canvas, x, y):
    v = c.v()
    v.stroke([(x, y + 4), (x - 2, y + 24)], 2.0)
    c.part(v.mask(), "forest2", lw=1)
    v = c.v()
    v.ellipse(x - 5, y + 13, 4, 2.4)
    c.part(v.mask(), "forest3", shade="forest2", lw=1)
    v = c.v()
    v.circle(x, y, 6.5)
    m = v.mask()
    inner = c.part(m, "road1", shade="road0", hi="brick3", sd=2, hd=1, lw=2)
    sv = c.v()
    sv.stroke(arc(x, y, 3, 3, -60, 200, 10), 1.2)
    c.img.fill(sv.mask() & inner, "brick0")
    hand(c, x - 2, y + 22)


# ── busts ──────────────────────────────────────────────────────────────────────────────────────────────────

def bust(deck: str, suit: str, rank: str) -> Img:
    fam = "german" if deck == "german" else "french"
    robe = ROBES[fam][suit]
    k_hair, q_hair, j_hair = HAIR[suit]
    c = Canvas(k=1.13, ox=44, oy=100)
    hx, hy = 45, 47
    if fam == "french":
        if rank == "king":
            hair_back(c, hx, hy, k_hair, "short")
            torso(c, hx, hy + 18, robe, "ermine")
            face(c, hx, hy, "king", k_hair, beard=True)
            crown(c, hx, hy - 32, w=30, h=19, points=5, jewel="river2" if suit in ("hearts", "diamonds") else "brick2")
            if suit in ("clubs", "hearts"):
                sword(c, 72, 18, 98)
            else:
                sceptre(c, 73, 22, 98)
        elif rank == "queen":
            hair_back(c, hx, hy, q_hair, "long")
            torso(c, hx, hy + 18, robe, "necklace")
            face(c, hx, hy, "queen", q_hair, female=True)
            fringe(c, hx, hy, q_hair, female=True)
            crown(c, hx, hy - 27, w=22, h=13, points=3, jewel="brick2" if suit != "hearts" else "river2")
            rose(c, 72, 66)
        else:
            hair_back(c, hx, hy, j_hair, "bob")
            torso(c, hx, hy + 18, robe, "square")
            face(c, hx, hy, "jack", j_hair, young=True)
            fringe(c, hx, hy, j_hair)
            cap(c, hx, hy, (robe[1], robe[1], robe[0]), feather="road3")
            halberd(c, 67, 6, 98)
    else:
        if rank == "king":
            hair_back(c, hx, hy, k_hair, "short")
            torso(c, hx, hy + 18, robe, "ermine")
            face(c, hx, hy, "king", k_hair, beard=True)
            crown(c, hx, hy - 31, w=28, h=17, points=3, arched=True, jewel="brick2")
            sceptre(c, 73, 22, 98)
        elif rank == "queen":  # Ober
            hair_back(c, hx, hy, k_hair if suit != "clubs" else "wood2", "short")
            torso(c, hx, hy + 18, robe, "ruff")
            face(c, hx, hy, "ober", "wood2" if suit in ("clubs", "hearts") else "ink3", moustache=True)
            broad_hat(c, hx, hy, (robe[1], robe[1], robe[0]), plume="road3" if suit != "hearts" else "beer3")
        else:  # Unter
            hair_back(c, hx, hy, j_hair, "bob")
            torso(c, hx, hy + 18, robe, "square")
            face(c, hx, hy, "unter", j_hair, young=True)
            fringe(c, hx, hy, j_hair)
            cap(c, hx, hy, (robe[0], robe[1], robe[2]), feather="beer3", plume_side=-1)
            halberd(c, 67, 4, 98)
    return c.img


def frame_mask(w=144, h=216):
    v = V(w, h)
    v.rect(TOP[0] - 2, TOP[1] - 2, BW + 4, BH + 4)
    v.rect(BOT[0] - 2, BOT[1] - 2, BW + 4, BH + 4)
    return v.mask()


def court(img: Img, deck: str, suit: str, rank: str):
    fm = frame_mask(img.w, img.h)
    inner = erode(fm, 2)
    img.fill(fm, "ink1")
    img.fill(inner, "paper3")
    yy, xx = np.indices(fm.shape)
    img.fill(inner & (((xx + yy) % 5) == 0), "paper2")
    b = bust(deck, suit, rank)
    # the suit symbol inside the picture: high for the Ober and the French courts, low for the Unter
    sz = 18 if deck != "german" else 22
    s = suit_img(deck, suit, sz, sz)
    top = Img(BW, BH)
    held = deck == "german" and rank in ("jack", "queen")
    if not held:
        top.blit(s, 3, 3)
    top.blit(b, 0, 0)
    if held:
        # the Unter holds his symbol low, the Ober shows it high (the classic way to tell them apart)
        hc = Canvas()
        if rank == "jack":
            sx, sy = 5, BH - sz - 8
            hand(hc, sx + sz / 2 + 2, sy + sz + 1, r=5)
        else:
            sx, sy = BW - sz - 4, 3
        top.blit(hc.img, 0, 0)
        top.blit(s, sx, sy)
    t = Img(BW, BH)
    t.blit(top, 0, 0)
    img.blit(t, TOP[0], TOP[1])
    img.blit(t.rot180(), BOT[0], BOT[1])
    # seam between the halves
    sv = V(img.w, img.h)
    sv.rect(TOP[0] - 2, TOP[1] + BH, BOT[0] + BW + 2 - (TOP[0] - 2), BOT[1] - TOP[1] - BH)
    img.fill(sv.mask() & fm, "ink1")


def court_badge(img: Img, deck: str, suit: str, rank: str):
    """Small cards: a headwear glyph in the free corners (top right, rotated bottom left)."""
    fam = "german" if deck == "german" else "french"
    robe = ROBES[fam][suit]
    c = Canvas(28, 26)
    hx = 14
    if rank == "king":
        crown(c, hx, 4, w=24, h=18, points=3 if fam == "german" else 5, arched=fam == "german")
    elif rank == "queen" and fam == "french":
        crown(c, hx, 7, w=20, h=14, points=3)
    elif rank == "queen":
        broad_hat(c, hx, 31, (robe[1], robe[1], robe[0]))
    else:
        cap(c, hx, 31, (robe[0], robe[1], robe[2]), feather="road3", plume_side=1 if fam == "french" else -1)
    g = c.img.trim()
    x = img.w - 6 - g.w
    y = 7
    img.blit(g, x, y)
    r = g.rot180()
    img.blit(r, img.w - x - r.w, img.h - y - r.h)


def brezel_mask(w, h, cx, cy, r) -> np.ndarray:
    v = V(w, h)
    P = [(-0.55, 0.62), (-0.1, 0.2), (0.38, -0.2), (0.55, -0.62), (0.88, -0.5), (0.98, 0.0), (0.75, 0.55),
         (0.2, 0.86), (-0.2, 0.86), (-0.75, 0.55), (-0.98, 0.0), (-0.88, -0.5), (-0.55, -0.62), (-0.38, -0.2),
         (0.1, 0.2), (0.55, 0.62)]
    pts = catmull([(cx + x * r, cy + y * r) for x, y in P], n=8)
    v.stroke(pts, r * 0.3)
    v.stroke(catmull([(cx + x * r, cy + y * r) for x, y in P[6:11]], n=8), r * 0.42)
    return v.mask()
