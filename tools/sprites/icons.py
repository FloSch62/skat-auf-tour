"""icons atlas -> public/sprites/icons.png/json (contract §10).

Main icons 64×64 atlas px (32×32 layout units), `-sm` versions 32×32 px (16×16 units) for inline text
(`{icon:fuel-sm}`). Anchor: frame centre.

- `station-<kind>-<state>`: a round road-atlas badge with the station's motif; states `normal`, `reachable` (bright,
  beer-gold rim), `visited` (greyed, a red stamp tick), `locked` (faded). `station-<kind>-sm`: the normal badge small.
- `suit-<deck>-<suit>`: 48×48 px (24 units), `-sm` 32×32.
- `game-grand`, `game-null`, `game-ramsch`, `fuel`, `mark` (a 52×52 coin = 26 units, drawn centred by kit.coin),
  `settings`, `help`, `book`, `home`, `trophy`, `check`, `cross`, `lock`, `arrow-left`, `arrow-right`, `speaker`,
  `music`, `dog`, `beer-mat`, `souvenir`, `upgrade`, `detour`, each with `-sm`.
"""
from __future__ import annotations

import math

from atlas import Atlas
from kit import Pen, Ink, new, catmull
from px import Img, arc, tf, erode, dilate, shift, edge_in
import motifs as M
from suits import suit_img

STATION_KINDS = ["start", "inn", "bikers", "problem", "chess", "sudoku", "pitch", "dogs", "market", "garage", "event",
                 "tournament"]
DECKS = ["french", "german", "tournament"]
SUITS = ["diamonds", "hearts", "spades", "clubs"]


# ── glyphs (64-unit box) ───────────────────────────────────────────────────────────────────────────────────

def g_fuel(p, k):
    k.part(p.poly([(12, 19), (6, 9), (11, 5), (20, 13)]), "stone2", shade="stone1", hi="stone3")
    body = p.rrect(13, 15, 38, 45, 5)
    inner = k.part(body, "brick2", shade="brick1", hi="brick3", sd=3)
    k.lines((p.stroke([(19, 24), (45, 53)], 2.6) | p.stroke([(45, 24), (19, 53)], 2.6)) & erode(inner, 2), "brick1")
    h = p.rrect(24, 5, 22, 13, 3) & ~p.rrect(28, 8, 14, 5, 2)
    k.part(h, "brick2", shade="brick1", hi="brick3")


def g_mark(p, k):
    disc = p.circle(32, 32, 30)
    k.part(disc, "beer2", shade="beer1", hi="beer4", line="wood1", sd=4)
    k.lines(p.ring(32, 32, 23, 1.8), "beer1")
    for i in range(18):
        a = math.radians(i * 20)
        k.lines(p.circle(32 + 26.5 * math.cos(a), 32 + 26.5 * math.sin(a), 1.2), "beer1")
    M.text(p, k, "DM", 32, 32, 19, 5.0, "beer0", gap=2.0)


def g_settings(p, k):
    pts = []
    for i in range(32):
        a = math.radians(i * 360 / 32 - 5.6)
        r = 29 if (i % 4) in (0, 1) else 22
        pts.append((32 + r * math.cos(a), 32 + r * math.sin(a)))
    gear = p.poly(pts) & ~p.circle(32, 32, 9)
    k.part(gear, "stone2", shade="stone1", hi="stone3", sd=3)
    k.lines(p.ring(32, 32, 15, 1.6), "stone1")


def g_help(p, k):
    k.part(p.circle(32, 32, 29), "river2", shade="river1", hi="river3", sd=4)
    M.text(p, k, "?", 33, 32, 34, 8, "road3", outline="ink1", ow=1)


def g_book(p, k):
    k.part(p.rrect(14, 9, 42, 50, 3), "paper3", shade="paper1", line="ink1")
    k.lines(p.stroke([(52, 13), (52, 55)], 1.0) | p.stroke([(49, 12), (49, 56)], 1.0), "paper1")
    cover = p.rrect(8, 6, 41, 52, 4)
    inner = k.part(cover, "wood2", shade="wood1", hi="wood3", sd=3)
    k.lines(p.rect(8, 6, 7, 52) & inner, "wood1")
    road = p.stroke(catmull([(20, 50), (30, 44), (24, 34), (36, 26), (32, 16)], n=6, closed=False), 2.6)
    k.lines(road & erode(inner, 2), "beer3")
    k.part(p.circle(33, 15, 3.6), "road1", line="ink1")
    k.part(p.rect(41, 6, 5, 52), "ink2", hi="ink4")


def g_home(p, k):
    k.part(p.rect(41, 10, 7, 16), "brick1", hi="brick3")
    walls = p.rect(13, 30, 38, 28)
    wi = k.part(walls, "paper3", shade="paper1", hi="road3")
    beams = (p.stroke([(13, 41), (51, 41)], 2.4) | p.stroke([(23, 30), (23, 58)], 2.4) | p.stroke([(42, 30), (42, 58)], 2.4)
             | p.stroke([(13, 30), (23, 41)], 2.0) | p.stroke([(51, 30), (42, 41)], 2.0))
    k.lines(beams & wi, "wood2")
    k.part(p.rrect(27, 44, 10, 14, 2), "wood2", shade="wood1", line="ink1")
    k.part(p.rect(15, 44, 6, 7), "river4", line="ink1")
    k.part(p.rect(44, 44, 6, 7), "river4", line="ink1")
    k.part(p.poly([(6, 33), (32, 8), (58, 33), (52, 35), (32, 17), (12, 35)]), "brick2", shade="brick1", hi="brick3")


def g_check(p, k):
    m = p.stroke([(10, 33), (25, 49), (54, 15)], 13)
    k.part(m, "forest3", shade="forest2", hi="forest4", line="ink0", sd=3)


def g_cross(p, k):
    m = p.stroke([(13, 13), (51, 51)], 13) | p.stroke([(51, 13), (13, 51)], 13)
    k.part(m, "brick2", shade="brick1", hi="brick3", line="ink0", sd=3)


def g_lock(p, k):
    k.part(p.arc(32, 27, 13, 14, 180, 360, 7), "stone2", shade="stone1", hi="stone4")
    k.part(p.stroke([(19, 27), (19, 32)], 7) | p.stroke([(45, 27), (45, 32)], 7), "stone2", shade="stone1")
    body = p.rrect(12, 29, 40, 29, 5)
    k.part(body, "beer2", shade="beer1", hi="beer3", sd=3)
    k.flat(p.circle(32, 40, 4.5) | p.poly([(30, 42), (34, 42), (35.5, 51), (28.5, 51)]), "ink1")


def g_arrow(p, k, left=False):
    pts = [(5, 24), (33, 24), (33, 9), (59, 32), (33, 55), (33, 40), (5, 40)]
    if left:
        pts = [(64 - x, y) for x, y in pts]
    k.part(p.poly(pts), "beer3", shade="beer1", hi="beer4", line="ink0", sd=3)


def g_speaker(p, k):
    k.part(p.poly([(6, 23), (17, 23), (31, 10), (31, 54), (17, 41), (6, 41)]), "stone2", shade="stone1", hi="stone3")
    for r in (11, 20):
        k.flat(p.arc(33, 32, r, r, -48, 48, 4.5), "ink1")


def g_music(p, k):
    beam = p.poly([(25, 12), (53, 5), (53, 13), (25, 20)])
    stems = p.stroke([(26, 14), (26, 46)], 4) | p.stroke([(52, 8), (52, 40)], 4)
    k.part(beam | stems, "ink1", hi="ink4", line="ink0")
    for x, y in ((19, 47), (45, 41)):
        k.part(p.poly(tf([(x - 8, y), (x, y - 6), (x + 8, y), (x, y + 6)], rot=-20, ox=x, oy=y))
               | p.ell(x, y, 8, 6), "ink1", hi="ink4", line="ink0")


def g_beer_mat(p, k):
    edge = p.circle(32, 32, 27)
    for i in range(24):
        a = math.radians(i * 15)
        edge |= p.circle(32 + 27 * math.cos(a), 32 + 27 * math.sin(a), 3.2)
    inner = k.part(edge, "paper3", shade="paper1", hi="road3", sd=3)
    k.lines(p.ring(32, 32, 22, 3.0), "brick2")
    sub = p.sub(19, 17, 27)
    M.beer_mug(sub, k)


def g_souvenir(p, k):
    k.part(p.rect(12, 29, 40, 28), "river2", shade="river1", hi="river3")
    k.part(p.rect(9, 22, 46, 10), "river3", shade="river2", hi="river4")
    k.part(p.rect(29, 22, 7, 35), "brick2", shade="brick1", hi="brick3")
    for s in (-1, 1):
        k.part(p.ell(32 + s * 9, 15, 9, 6), "brick2", shade="brick1", hi="brick3")
    k.part(p.circle(32, 18, 4.5), "brick2", shade="brick1")


def g_upgrade(p, k):
    M.wrench(p.sub(-2, -2, 54), k)
    k.part(p.circle(46, 46, 14), "forest3", shade="forest2", hi="forest4", line="ink0")
    k.flat(p.rect(44, 38, 4.5, 16) | p.rect(38, 43.5, 16, 4.5), "road3")


def g_detour(p, k):
    M.motorcycle(p.sub(6, 18, 48), k)
    pts = catmull([(6, 26), (16, 12), (34, 7), (50, 14)], n=10, closed=False)
    for i in range(0, len(pts) - 3, 6):
        k.flat(p.stroke(pts[i:i + 4], 3.4), "road1")
    k.part(p.poly([(46, 6), (59, 17), (43, 21)]), "road1", line="ink1")


def g_grand(p, k):
    """Grand: the crown of the Skat games."""
    k.part(p.rrect(9, 44, 46, 11, 3), "brick1", shade="brick0", hi="brick3")
    pts = [(10, 46), (6, 16), (19, 30), (25, 12), (32, 26), (39, 12), (45, 30), (58, 16), (54, 46)]
    inner = k.part(p.poly(pts), "beer2", shade="beer1", hi="beer4", sd=3)
    k.lines(p.rect(10, 37, 44, 3) & inner, "beer1")
    for x, y in ((6, 15), (25, 11), (39, 11), (58, 15)):
        k.part(p.circle(x, y, 4), "beer3", line="ink1")
    for x, c in ((20, "brick2"), (32, "river2"), (44, "brick2")):
        k.part(p.ell(x, 42, 3.4, 2.6), c, hi="road3", line="ink1")


def g_null(p, k):
    card = p.poly(tf([(16, 6), (48, 6), (48, 58), (16, 58)], rot=6, ox=32, oy=32))
    k.part(card, "road3", shade="paper2", line="ink1")
    M.text(p, k, "0", 32, 32, 30, 7, "brick1")


def g_ramsch(p, k):
    k.part(p.stroke([(48, 6), (26, 38)], 5), "wood3", shade="wood2", hi="wood5")
    br = p.poly([(22, 32), (34, 40), (26, 60), (6, 56)])
    inner = k.part(br, "beer2", shade="beer1", hi="beer3")
    k.lines((p.stroke([(25, 42), (17, 57)], 1.2) | p.stroke([(19, 39), (11, 55)], 1.2) | p.stroke([(29, 45), (23, 58)], 1.2))
            & inner, "beer1")
    k.part(p.poly([(21, 31), (35, 40), (33, 44), (19, 35)]), "brick2", line="ink1")
    k.part(p.poly(tf([(42, 44), (56, 44), (56, 60), (42, 60)], rot=20, ox=49, oy=52)), "road3", line="ink1")


GLYPHS = {
    "fuel": g_fuel, "settings": g_settings, "help": g_help, "book": g_book, "home": g_home,
    "trophy": lambda p, k: M.trophy(p, k), "check": g_check, "cross": g_cross, "lock": g_lock,
    "arrow-left": lambda p, k: g_arrow(p, k, True), "arrow-right": g_arrow, "speaker": g_speaker, "music": g_music,
    "dog": lambda p, k: M.dog_head(p, k), "beer-mat": g_beer_mat, "souvenir": g_souvenir, "upgrade": g_upgrade,
    "detour": g_detour, "game-grand": g_grand, "game-null": g_null, "game-ramsch": g_ramsch,
}

STATION_GLYPH = {
    "start": M.flag, "inn": M.beer_mug, "bikers": lambda p, k: M.motorcycle(p.sub(0, 4, 64), k),
    "problem": M.cards_q, "chess": lambda p, k: M.knight(p, k), "sudoku": M.newspaper,
    "pitch": lambda p, k: pitch(p, k), "dogs": M.paw, "market": M.stall,
    "garage": M.wrench, "event": M.warning, "tournament": lambda p, k: M.trophy(p, k),
}
def pitch(p, k):
    M.camper(p.sub(-1, 14, 62), k)
    k.part(p.circle(48, 12, 9) & ~p.circle(53, 8, 8), "beer3", hi="beer4", line="ink1")
    k.part(p.poly([(30, 4), (32, 9), (37, 10), (32, 12), (30, 17), (28, 12), (23, 10), (28, 9)]), "beer3", line="ink1")


STATION_RING = {
    "start": "river2", "inn": "brick2", "bikers": "stone1", "problem": "felt3", "chess": "stone2", "sudoku": "dusk2",
    "pitch": "river1", "dogs": "wood3", "market": "olive2", "garage": "stone1", "event": "beer1", "tournament": "beer2",
}


def icon(name, size) -> Img:
    img, p, k = new(size)
    GLYPHS[name](p, k)
    return k.finish()


def station(kind, size, state) -> Img:
    img, p, k = new(size)
    r = 27
    face = "road3" if state == "reachable" else "paper4"
    k.part(p.circle(32, 32, r), STATION_RING[kind], line="ink0", lw=max(2, k.lw), hi=None)
    k.part(p.circle(32, 32, r - 4.5), face, shade="paper3", line=None, sd=max(1, round(3 * p.k)))
    sub = p.sub(13, 13, 38)
    STATION_GLYPH[kind](sub, k)
    k.finish()
    if state == "reachable":
        rim = p.circle(32, 32, 31.5) & ~p.circle(32, 32, r)
        img.fill(rim, "beer3")
        img.fill(rim & ~shift(p.circle(32, 32, 31.5), 1, 1) | (rim & edge_in(p.circle(32, 32, 31.5), 1)), "beer1")
        img.fill(rim & ~shift(p.circle(32, 32, 31.5), -1, -1), "beer4")
        img.fill(edge_in(p.circle(32, 32, 31.5) | (img.a >= 0), 1) & ~p.circle(32, 32, r - 1), "ink0")
    elif state == "visited":
        img = img.to_ramp(["stone0", "stone1", "stone2", "stone3", "stone4"])
        _, sp, sk = None, Pen(size, size, size / 64.0), Ink(img)
        tick = sp.stroke([(36, 47), (42, 53), (55, 38)], 6)
        img.fill(dilate(tick, max(1, round(2 * sp.k))), "ink0")
        img.fill(tick, "brick2")
    elif state == "locked":
        img = img.to_ramp(["ink5", "paper0", "paper1", "paper2", "paper3"])
    return img


def build() -> Atlas:
    atlas = Atlas("icons", width=1024)
    atlas.group("stations")
    for kind in STATION_KINDS:
        for st in ("normal", "reachable", "visited", "locked"):
            atlas.add(f"station-{kind}-{st}", station(kind, 64, st))
        atlas.add(f"station-{kind}-sm", station(kind, 32, "normal"))
    atlas.group("suits")
    for deck in DECKS:
        for suit in SUITS:
            s = Img(48, 48)
            s.blit(suit_img(deck, suit, 44, 44, lw=2), 2, 2)
            atlas.add(f"suit-{deck}-{suit}", s)
            sm = Img(32, 32)
            sm.blit(suit_img(deck, suit, 30, 30, lw=1, detail=True), 1, 1)
            atlas.add(f"suit-{deck}-{suit}-sm", sm)
    atlas.group("icons")
    for name in GLYPHS:
        atlas.add(name, icon(name, 64))
    img, p, k = new(52)
    g_mark(p, k)
    atlas.add("mark", k.finish())
    atlas.group("small")
    for name in GLYPHS:
        atlas.add(f"{name}-sm", icon(name, 32))
    img, p, k = new(32)
    g_mark(p, k)
    atlas.add("mark-sm", k.finish())
    return atlas
