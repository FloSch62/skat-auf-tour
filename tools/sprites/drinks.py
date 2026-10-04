"""drinks atlas -> public/sprites/drinks.png/json: glasses on the Stammtisch (scenery only, contract §0.9, §4.3).

`<drink>-3|2|1|0` = full, two thirds, one third, empty. Drinks: `beer` (a Halbe in a Willi-Becher), `weizen` (tall
curved wheat-beer glass), `wine` (Viertele in the dimpled Henkelglas, Trollinger red), `cider` (Most in the glass
Mostkrug), `schnapps` (Kirschwasser in a small shot glass), `spezi` (bottle with a crown cap, no brand), `water`
(Sprudel tumbler with bubbles). About 14×30 layout units (the Weizen taller, the Schnaps small).
Anchor: bottom centre (ay = frame height, i.e. the table line).
"""
from __future__ import annotations

import numpy as np

from atlas import Atlas
from kit import Pen, Ink, catmull
from px import Img, V, erode, dilate, shift, edge_in, hash01

LEVELS = {3: 0.9, 2: 0.6, 1: 0.3, 0: 0.0}
GLASS = "river5"
GLASS_SHADE = "river4"


def glass_img(W, H, body, liquid, liq_shade, foam=None, foam_h=0.0, level=0.9, handle=None, extra=None,
              glass=GLASS, lw=2, bubbles=False, residue=None):
    img = Img(W, H)
    ink = Ink(img, lw=lw)
    if handle is not None:
        ink.part(handle, glass, shade=GLASS_SHADE, line="ink1", lw=lw)
    inner = ink.part(body, glass, line="ink1", lw=lw)
    ys, xs = np.nonzero(inner)
    top, bot = ys.min(), ys.max()
    yy, xx = np.indices(inner.shape)
    if level > 0:
        ly = bot - (bot - top) * level
        liq = inner & (yy >= ly)
        img.fill(liq, liquid)
        img.fill(liq & ~shift(liq, -2, 0), liq_shade)
        if foam:
            fh = max(2, round((bot - top) * foam_h))
            fm = inner & (yy >= ly - fh) & (yy < ly + 1)
            img.fill(fm, foam)
            img.fill(fm & (yy >= ly - 1), "paper2")
        else:
            img.fill(inner & (yy >= ly) & (yy < ly + 1), liq_shade if liq_shade != liquid else "road3")
        if bubbles:
            for i in range(10):
                bx = xs.min() + 2 + hash01(i, 4) * (xs.max() - xs.min() - 4)
                by = ly + 3 + hash01(i, 9) * max(1, bot - ly - 5)
                if inner[int(by), int(bx)]:
                    img.put(bx, by, "road3")
    elif residue:
        img.fill(inner & (yy >= bot - 1), residue)
    # foam lacing in an emptied beer glass
    if foam and level < 0.85:
        for i, f in enumerate((0.75, 0.5)):
            if f > level + 0.08:
                yl = bot - (bot - top) * f
                ln = inner & (np.abs(yy - yl) < 0.6) & ((xx + i) % 3 != 0)
                img.fill(ln, "paper3")
    if extra:
        extra(img, ink, inner)
    # glass highlight: a vertical stripe on the left
    hl = inner & ~shift(inner, 3, 0) & shift(inner, 1, 0) & (yy > top + 2) & (yy < bot - 2)
    img.fill(hl, "road3")
    ink.finish(lw)
    return img


def v(W, H):
    return V(W, H)


def beer(level):
    W, H = 30, 62
    b = v(W, H)
    b.poly(catmull([(9, 61), (21, 61), (23, 40), (26, 18), (26, 3), (4, 3), (4, 18), (7, 40)], n=8, closed=True))
    return glass_img(W, H, b.mask(), "beer2", "beer1", foam="road3", foam_h=0.12, level=LEVELS[level])


def weizen(level):
    W, H = 30, 72
    b = v(W, H)
    b.poly(catmull([(9, 71), (21, 71), (21, 60), (20, 46), (24, 26), (26, 12), (25, 2), (5, 2), (4, 12), (6, 26),
                    (10, 46), (9, 60)], n=8, closed=True))
    return glass_img(W, H, b.mask(), "beer3", "beer2", foam="road3", foam_h=0.18, level=LEVELS[level])


def wine(level):
    W, H = 34, 44
    b = v(W, H)
    b.rrect(4, 4, 21, 39, 3)
    h = v(W, H)
    h.stroke([(24, 12), (31, 13), (32, 22), (30, 31), (24, 33)], 4.0)

    def dimples(img, ink, inner):
        liq = img.is_("brick1", "brick0")
        gl = img.is_(GLASS)
        for r in range(3):
            for c in range(3):
                d = v(W, H)
                d.ellipse(8 + c * 6 + (r % 2) * 3, 12 + r * 9, 2, 3)
                m = d.mask() & erode(inner, 1)
                img.fill(m & liq, "brick2")
                img.fill(m & gl, "river4")
    return glass_img(W, H, b.mask(), "brick1", "brick0", level=LEVELS[level], handle=h.mask(), extra=dimples)


def cider(level):
    W, H = 40, 60
    b = v(W, H)
    b.poly(catmull([(10, 59), (26, 59), (31, 46), (30, 30), (24, 18), (24, 7), (25, 3), (9, 3), (9, 8), (8, 18), (4, 30),
                    (4, 46)], n=8, closed=True))
    h = v(W, H)
    h.stroke([(26, 12), (35, 14), (36, 30), (31, 42)], 4.2)
    return glass_img(W, H, b.mask(), "olive3", "olive2", level=LEVELS[level], handle=h.mask())


def schnapps(level):
    W, H = 20, 28
    b = v(W, H)
    b.poly([(4, 27), (16, 27), (17, 3), (3, 3)])

    def foot(img, ink, inner):
        img.fill(inner & (np.indices(inner.shape)[0] >= 23), "river4")
    return glass_img(W, H, b.mask(), "river4", "river3", level=LEVELS[level] * 0.85, extra=foot)


def spezi(level):
    W, H = 22, 74
    b = v(W, H)
    b.poly(catmull([(4, 73), (18, 73), (18, 32), (14, 20), (13, 8), (9, 8), (8, 20), (4, 32)], n=8, closed=True))

    def label(img, ink, inner):
        yy = np.indices(inner.shape)[0]
        lab = inner & (yy >= 42) & (yy < 58)
        img.fill(lab, "paper3")
        img.fill(lab & (yy >= 47) & (yy < 52), "brick2")
        img.fill(lab & ((yy == 42) | (yy == 57)), "ink1")
        c = V(W, H)
        c.rrect(7, 3, 8, 6, 1)
        ink.part(c.mask(), "brick2", hi="brick4", line="ink1", lw=1)
    return glass_img(W, H, b.mask(), "wood1", "wood0", level=LEVELS[level] * 0.95, extra=label, glass="stone4")


def water(level):
    W, H = 28, 46
    b = v(W, H)
    b.poly([(5, 45), (23, 45), (25, 3), (3, 3)])
    return glass_img(W, H, b.mask(), "river4", "river3", level=LEVELS[level], bubbles=True)


DRINKS = {"beer": beer, "weizen": weizen, "wine": wine, "cider": cider, "schnapps": schnapps, "spezi": spezi,
          "water": water}


def build() -> Atlas:
    atlas = Atlas("drinks", width=512)
    for name, fn in DRINKS.items():
        atlas.group(name)
        for lv in (3, 2, 1, 0):
            img = fn(lv)
            atlas.add(f"{name}-{lv}", img, img.w // 2, img.h)
    return atlas
