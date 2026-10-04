"""fx atlas -> public/sprites/fx.png/json (contract §10: Kartenschatten, Stichgewinn, Münze, Stempel, Regen, Laub).

- `stamp` (120×120 px = 60 units) a round rubber place stamp: double ring, dotted inner ring and a post horn at the
  bottom, worn ink; the place name is drawn by the game in the free middle band. `stamp-red` the same in red ink.
  Anchor centre.
- `coin-0..5` (anim `coin`, 32×32 px): a spinning Mark coin.
- `sparkle-0..5` (anim `sparkle`, 64×64): stars popping for a won trick (non-looping).
- `rain-0..2` (anim `rain`): falling drops for a tile of 64×96 px, `rain-drop` single streak.
- `leaf-0..7` (anim `leaf`, 24×24): a tumbling autumn leaf; `leaf-green-0..7` a summer one.
- `smoke-0..5` (anim `smoke`, 64×64): a bigger comic smoke puff.
- `card-glow` (+`-s`): a soft beer-gold glow around a card (144×216 / 72×108 card, margin 16/8 px; anchor = the card's
  top-left, like the card overlays). Semi-transparent on purpose.
"""
from __future__ import annotations

import math

import numpy as np

from atlas import Atlas
from kit import Pen, Ink, catmull
from px import Img, V, arc, erode, dilate, shift, edge_in, edge_out, hash01, rrect_mask, place, tf


def stamp(col="dusk1") -> Img:
    S = 120
    img = Img(S, S)
    p = Pen(S, S, 1.0)
    c = S / 2
    m = p.ring(c, c, 56, 5) | p.ring(c, c, 47, 2.4)
    for i in range(36):
        a = math.radians(i * 10)
        m |= p.circle(c + 41 * math.cos(a), c + 41 * math.sin(a), 1.4)
    # post horn at the bottom, a star at the top
    m |= p.arc(c, c + 24, 10, 7, 200, 520, 2.6)
    m |= p.stroke([(c - 14, c + 24), (c + 12, c + 24)], 2.6) | p.poly([(c + 10, c + 19), (c + 18, c + 16), (c + 18, c + 32),
                                                                  (c + 10, c + 29)])
    m |= p.poly([(c, c - 36), (c + 3, c - 28), (c + 11, c - 28), (c + 5, c - 23), (c + 7, c - 15), (c, c - 20),
                 (c - 7, c - 15), (c - 5, c - 23), (c - 11, c - 28), (c - 3, c - 28)])
    # worn ink: knock out a deterministic scatter
    yy, xx = np.indices(m.shape)
    worn = np.zeros_like(m)
    for i in range(160):
        x, y = int(hash01(i, 1) * S), int(hash01(i, 2) * S)
        r = 0.6 + hash01(i, 3) * 1.6
        worn |= (xx - x) ** 2 + (yy - y) ** 2 <= r * r
    img.fill(m & ~worn, col)
    return img


def coin(i) -> Img:
    S = 32
    img = Img(S, S)
    p = Pen(S, S, 1.0)
    ink = Ink(img, lw=1)
    wf = [1.0, 0.72, 0.32, 0.1, 0.32, 0.72][i]
    rx = max(1.6, 14 * wf)
    if wf <= 0.12:
        ink.part(p.rrect(14, 2, 4, 28, 1.5), "beer1", hi="beer3", line="wood1")
    else:
        ink.part(p.ell(16, 16, rx, 14), "beer2", shade="beer1", hi="beer4", line="wood1", sd=2)
        if wf > 0.5:
            ink.lines(p.ell(16, 16, rx * 0.7, 10) & ~p.ell(16, 16, rx * 0.7 - 1.2, 8.8), "beer1")
    ink.finish(1)
    return img


def star(p, cx, cy, r, ri=None, n=4, rot=0):
    ri = r * 0.32 if ri is None else ri
    pts = []
    for i in range(n * 2):
        a = math.radians(rot + i * 180 / n - 90)
        rr = r if i % 2 == 0 else ri
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return p.poly(pts)


def sparkle(i) -> Img:
    S = 64
    img = Img(S, S)
    p = Pen(S, S, 1.0)
    stars = [(32, 32, 1.0), (14, 18, 0.55), (50, 14, 0.45), (48, 48, 0.6), (16, 50, 0.4)]
    grow = [0.25, 0.7, 1.0, 0.8, 0.45, 0.15][i]
    for j, (x, y, s) in enumerate(stars):
        g = grow if j == 0 else [0.0, 0.4, 0.9, 1.0, 0.6, 0.25][i] * (1 if j % 2 else 0.9)
        r = 26 * s * g
        if r < 1.5:
            continue
        m = star(p, x, y, r, n=4, rot=(i * 8 if j == 0 else 0))
        img.fill(dilate(m, 1.5), "beer1")
        img.fill(m, "beer3")
        img.fill(star(p, x, y, r * 0.55, n=4), "road3")
    return img


def rain(i) -> Img:
    W, H = 64, 96
    img = Img(W, H)
    p = Pen(W, H, 1.0)
    for j in range(9):
        x = (hash01(j, 1) * W + i * 6) % W
        y = (hash01(j, 2) * H + i * 32) % H
        for dy in (0, -H):
            m = p.stroke([(x, y + dy), (x - 4, y + dy + 14)], 2.0)
            img.fill(m, "river4")
            img.fill(p.stroke([(x, y + dy), (x - 1, y + dy + 4)], 2.0), "river5")
    return img


def leaf(i, cols=("beer1", "brick2", "beer2")) -> Img:
    S = 24
    img = Img(S, S)
    p = Pen(S, S, 1.0)
    ink = Ink(img, lw=1)
    rot = i * 45
    sq = 0.35 + 0.65 * abs(math.cos(math.radians(i * 45)))
    pts = [(0, -9), (5, -3), (4, 4), (0, 9), (-4, 4), (-5, -3)]
    pts = [(x * sq, y) for x, y in pts]
    pts = tf(pts, rot=rot, dx=12, dy=12)
    m = p.poly(catmull(pts, 4, True))
    ink.part(m, cols[i % 2], shade=cols[2], line="wood1")
    mid = tf([(0, -8), (0, 9)], rot=rot, dx=12, dy=12)
    ink.lines(p.stroke(mid, 1.0) & erode(m, 1), "wood1")
    return img


def smoke(i) -> Img:
    S = 64
    img = Img(S, S)
    p = Pen(S, S, 1.0)
    ink = Ink(img, lw=2)
    sets = [
        [(32, 40, 8)],
        [(28, 38, 11), (38, 34, 9)],
        [(24, 36, 13), (39, 30, 12), (36, 44, 9)],
        [(20, 32, 13), (38, 24, 13), (40, 42, 11), (27, 46, 8)],
        [(18, 28, 10), (40, 20, 10), (44, 40, 9), (26, 46, 7)],
        [(16, 24, 6), (42, 16, 6), (48, 38, 5), (25, 48, 4)],
    ][i]
    m = np.zeros((S, S), bool)
    for x, y, r in sets:
        m |= p.circle(x, y, r)
    if i >= 4:
        m &= ~p.circle(32, 32, 9 + i * 2)
    ink.part(m, "stone3", shade="stone2", hi="stone4", line="stone1", sd=3)
    return img


def card_glow(small=False) -> Img:
    w, h, r, mg = (72, 108, 6, 8) if small else (144, 216, 10, 16)
    m = rrect_mask(w, h, 0, 0, w, h, r)
    big = place((h + 2 * mg, w + 2 * mg), m, mg, mg)
    img = Img(w + 2 * mg, h + 2 * mg)
    prev = big
    n = mg
    for d in range(1, n + 1):
        ring = dilate(big, d) & ~prev
        a = int(200 * (1 - (d - 1) / n) ** 1.6) + 12
        img.fill(ring, "beer3" if d <= n // 3 else "beer2", alpha=min(255, a))
        prev = prev | ring
    return img


def build() -> Atlas:
    atlas = Atlas("fx", width=1024)
    atlas.add("stamp", stamp("dusk1"))
    atlas.add("stamp-red", stamp("brick1"))
    atlas.seq("coin", [coin(i) for i in range(6)], fps=12, loop=True)
    atlas.seq("sparkle", [sparkle(i) for i in range(6)], fps=14, loop=False)
    atlas.seq("rain", [rain(i) for i in range(3)], fps=12, loop=True, ax=0, ay=0)
    d = Img(6, 18)
    d.fill(Pen(6, 18, 1.0).stroke([(4, 1), (2, 16)], 2.0), "river4")
    atlas.add("rain-drop", d)
    atlas.seq("leaf", [leaf(i) for i in range(8)], fps=8, loop=True)
    atlas.seq("leaf-green", [leaf(i, ("forest3", "forest4", "forest2")) for i in range(8)], fps=8, loop=True)
    atlas.seq("smoke", [smoke(i) for i in range(6)], fps=10, loop=False)
    atlas.add("card-glow", card_glow(), 16, 16)
    atlas.add("card-glow-s", card_glow(True), 8, 8)
    return atlas
