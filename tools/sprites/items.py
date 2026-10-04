"""items atlas -> public/sprites/items.png/json (contract §4.12; code fallback for the painted items, §9).

96×96 atlas px (48×48 layout units), anchor centre. Frame names are the ids: SOUVENIRS, BEER_MATS, UPGRADES and DOGS
from src/game/ids.ts, plus `trophy-enztal`, `trophy-muehlacker`, `trophy-schwarzwald`, `trophy-stuttgart`,
`trophy-wander`. Dogs: Schäferhund (tan, black saddle, ears up), the two Irish Wolfhounds (wolfhound-a grey,
wolfhound-b wheaten with brindle), Airedale (tan, black saddle, folded ears, beard), the two Riesenschnauzer
(schnauzer-a black, schnauzer-b pepper-and-salt), each with its own collar colour.
"""
from __future__ import annotations

import math

import numpy as np

from atlas import Atlas
from kit import Pen, Ink, catmull, new
from px import Img, arc, tf, erode, dilate, shift, edge_in, hash01, checker
import motifs as M

SIZE = 96


# ── souvenirs ──────────────────────────────────────────────────────────────────────────────────────────────

def reading_glasses(p, k):
    for s in (-1, 1):
        k.part(p.stroke([(32 + s * 22, 31), (32 + s * 29, 21)], 2.6), "beer1", shade="beer0")
    k.part(p.arc(32, 33, 4.5, 4, 200, 340, 2.8), "beer1")
    for cx in (20, 44):
        lens = p.circle(cx, 34, 11)
        k.part(lens, "river5", hi="road3", line="beer0", lw=k.lw + 1)
        k.lines(p.stroke([(cx - 6, 30), (cx - 2, 26)], 2.0) & erode(lens, 3), "road3")
    k.lines(p.ring(20, 34, 11, 2.4) | p.ring(44, 34, 11, 2.4), "beer1")


def notepad(p, k):
    pad = p.poly(tf([(12, 12), (50, 12), (50, 58), (12, 58)], rot=-6, ox=31, oy=35))
    inner = k.part(pad, "paper4", shade="paper2", hi="road3")
    for i in range(5):
        y = 26 + i * 6.5
        k.lines(p.stroke(tf([(16, y), (47, y)], rot=-6, ox=31, oy=35), 1.0) & erode(inner, 2), "river3")
    for i in range(4):
        x = 20 + i * 4
        k.lines(p.stroke(tf([(x, 30), (x, 38)], rot=-6, ox=31, oy=35), 1.6), "ink1")
    k.lines(p.stroke(tf([(17, 39), (35, 29)], rot=-6, ox=31, oy=35), 1.6), "ink1")
    k.lines(p.rect(12, 12, 40, 7) & inner, "brick2")
    for i in range(6):
        x = 16 + i * 6
        k.part(p.stroke(tf([(x, 8), (x, 16)], rot=-6, ox=31, oy=35), 2.6), "stone3", line="ink1", lw=1)


def lucky_penny(p, k):
    k.part(p.circle(30, 32, 23), "brick3", shade="brick2", hi="brick4", line="wood1", sd=4)
    k.lines(p.ring(30, 32, 18, 1.4), "brick2")
    M.text(p, k, "10", 30, 31, 15, 4, "brick1", gap=1)
    for a in (0, 90, 180, 270):
        x = 50 + 5 * math.cos(math.radians(a))
        y = 50 + 5 * math.sin(math.radians(a))
        k.part(p.circle(x, y, 5), "forest3", shade="forest2", hi="forest4")
    k.part(p.stroke([(50, 52), (56, 61)], 2.4), "forest2")


def thermos(p, k):
    k.part(p.stroke(arc(46, 34, 6, 12, -80, 80), 4), "ink2", hi="ink4")
    body = p.rrect(18, 16, 28, 44, 5)
    inner = k.part(body, "river2", shade="river1", hi="river3", sd=4)
    band = p.rect(18, 30, 28, 14) & inner
    k.lines(band, "brick2")
    yy, xx = np.indices(band.shape)
    k.lines(band & ((((xx // max(1, int(3 * p.k))) + 0) % 3) == 0), "brick1")
    k.lines(band & ((((yy // max(1, int(3 * p.k)))) % 3) == 0), "beer2")
    k.part(p.rrect(16, 5, 32, 13, 3), "stone3", shade="stone2", hi="stone4")
    k.lines(p.rect(16, 15, 32, 2), "stone1")


def road_atlas(p, k):
    k.part(p.poly(tf([(14, 12), (54, 12), (54, 58), (14, 58)], rot=5, ox=34, oy=35)), "paper2", line="ink1")
    cover = p.poly(tf([(9, 8), (49, 8), (49, 56), (9, 56)], rot=-4, ox=29, oy=32))
    inner = k.part(cover, "paper3", shade="paper1", hi="road3")
    k.lines(p.spline([(14, 34), (24, 30), (28, 40), (20, 50), (12, 46)]) & inner, "forest4")
    k.lines(p.stroke(catmull([(30, 8), (26, 22), (34, 32), (30, 46), (36, 58)], 6, False), 3.2) & inner, "river3")
    k.lines(p.stroke([(9, 26), (49, 20)], 2.6) & inner, "road1")
    k.lines(p.stroke([(14, 56), (44, 12)], 2.2) & inner, "road2")
    k.lines(p.stroke(tf([(9, 13), (49, 13)], rot=-4, ox=29, oy=32), 6) & inner, "river1")
    k.part(p.circle(33, 30, 3.4), "road1", line="ink1", lw=1)


def piggy_bank(p, k):
    for x in (18, 24, 38, 44):
        k.part(p.rrect(x - 3, 44, 7, 12, 2), "brick4", shade="brick3")
    k.part(p.stroke(catmull([(10, 34), (5, 30), (7, 25), (11, 28)], 6, False), 2.2), "brick3")
    body = p.ell(31, 36, 22, 15)
    inner = k.part(body, "brick4", shade="brick3", hi="road3", sd=4)
    k.part(p.poly([(38, 24), (44, 14), (47, 26)]), "brick4", shade="brick3")
    k.part(p.ell(53, 37, 5, 6.5), "brick3", hi="brick4")
    k.lines(p.ell(52, 35, 1.1, 1.6) | p.ell(55, 39, 1.1, 1.6), "brick1")
    k.lines(p.circle(44, 31, 1.8), "ink1")
    k.lines(p.stroke([(24, 22), (34, 22)], 2.0), "ink1")
    k.part(p.ell(29, 15, 6.5, 4), "beer2", shade="beer1", hi="beer4")


def pennant(p, k):
    k.part(p.stroke([(6, 10), (58, 10)], 3.2), "wood3", shade="wood2")
    for x in (6, 58):
        k.part(p.circle(x, 10, 3.4), "beer2", line="ink1", lw=1)
    fl = p.poly([(12, 13), (52, 13), (32, 60)])
    inner = k.part(fl, "brick2", shade="brick1", hi="brick3", sd=3)
    k.lines(p.rect(12, 13, 40, 5) & inner, "beer2")
    sub = p.sub(23, 21, 18)
    from suits import suit_mask  # noqa
    st = p.poly([(32, 23), (35, 31), (43, 31), (37, 36), (39, 44), (32, 39), (25, 44), (27, 36), (21, 31), (29, 31)])
    k.part(st, "beer3", hi="road3", line="ink1", lw=1)
    yy, xx = np.indices(fl.shape)
    fr = p.stroke([(14, 14), (32, 59)], 1.5) | p.stroke([(50, 14), (32, 59)], 1.5)
    k.lines(fr & inner, "beer2")


def chess_clock(p, k):
    for x, c in ((20, "brick2"), (44, "beer2")):
        k.part(p.rrect(x - 5, 12, 10, 8, 2), c, shade="ink3" if c == "brick2" else "beer1")
        k.part(p.rect(x - 1.5, 17, 3, 5), "stone2")
    box = p.poly([(8, 22), (56, 22), (58, 56), (6, 56)])
    inner = k.part(box, "wood3", shade="wood2", hi="wood4", sd=3)
    for cx, hand in ((20, 300), (44, 30)):
        d = p.circle(cx, 39, 10)
        k.part(d, "road3", shade="paper2", line="ink1")
        a = math.radians(hand)
        k.lines(p.stroke([(cx, 39), (cx + 7 * math.cos(a), 39 + 7 * math.sin(a))], 1.8), "ink1")
        k.lines(p.stroke([(cx, 39), (cx, 33)], 1.8), "ink1")
        k.lines(p.circle(cx, 39, 1.5), "brick2")


def pencil(p, k):
    body = p.stroke([(14, 50), (40, 24)], 12)
    inner = k.part(body, "beer2", shade="beer1", hi="beer3", sd=3)
    k.lines(p.stroke([(14, 50), (40, 24)], 1.4) & erode(inner, 2), "beer1")
    tip = p.poly([(40, 24) if False else (36, 19.5), (44.5, 28), (54, 10)])
    tip = p.poly([(35.5, 20), (44, 28.5), (55, 9)])
    ti = k.part(tip, "wood4", shade="wood3")
    k.lines(p.poly([(50.5, 13.5), (55, 9), (52.5, 16)]) | p.circle(53, 11, 2.2), "ink2")
    k.part(p.poly([(8.5, 47), (17, 55.5), (13, 59.5), (4.5, 51)]), "paper2", shade="paper1", line="ink1")


def snack_board(p, k):
    board = p.rrect(4, 22, 52, 34, 6) | p.rrect(50, 32, 12, 14, 5)
    bi = k.part(board, "wood4", shade="wood3", hi="wood5", sd=3)
    k.lines(p.circle(57, 39, 2.6), "wood2")
    k.part(p.spline([(10, 30), (18, 24), (30, 26), (32, 38), (26, 48), (12, 48)]), "wood2", shade="wood1", hi="wood3")
    k.part(p.spline([(13, 32), (19, 28), (28, 30), (29, 38), (24, 45), (14, 45)]), "paper2", shade="paper1",
           line=None, lw=0)
    for x, y in ((36, 34), (44, 30), (42, 42)):
        s = p.circle(x, y, 6)
        si = k.part(s, "brick2", shade="brick1", hi="brick3")
        for i in range(3):
            k.lines(p.circle(x - 2 + hash01(x, i) * 4, y - 2 + hash01(y, i) * 4, 0.9) & si, "paper3")
    k.part(p.ell(50, 46, 4, 4.5), "dusk2", hi="dusk3")
    k.part(p.stroke([(50, 42), (52, 36)], 1.6) | p.stroke([(50, 42), (47, 37)], 1.6), "forest3")


def dog_whistle(p, k):
    k.flat(p.stroke(catmull([(18, 46), (8, 36), (8, 18), (22, 8), (38, 12)], 8, False), 2.4), "brick2")
    body = p.stroke([(18, 44), (50, 16)], 10)
    k.part(p.ring(16, 47, 5, 2.6), "stone3", shade="stone2")
    inner = k.part(body, "stone3", shade="stone2", hi="stone4", sd=3)
    k.lines(p.stroke([(42, 23), (50, 16)], 10) & inner, "stone1")
    k.lines(p.poly(tf([(30, 31), (36, 31), (36, 34), (30, 34)], rot=-41, ox=33, oy=32.5)), "ink1")
    k.lines(p.stroke([(23, 39), (25, 37)], 2.4) | p.stroke([(27, 36), (29, 34)], 2.4), "stone2")


def postcard(p, k):
    card = p.poly(tf([(6, 14), (58, 14), (58, 52), (6, 52)], rot=-7, ox=32, oy=33))
    inner = k.part(card, "paper4", shade="paper2", hi="road3")
    R = lambda pts: tf(pts, rot=-7, ox=32, oy=33)  # noqa: E731
    k.lines(p.stroke(R([(33, 18), (33, 48)]), 1.0), "paper1")
    for y in (32, 38, 44):
        k.lines(p.stroke(R([(37, y), (54, y)]), 1.0), "ink4")
    for i, y in enumerate((22, 27, 32, 37)):
        k.lines(p.stroke(R([(10, y), (29 - (i % 2) * 5, y)]), 1.4), "river2")
    st = p.poly(R([(45, 17), (55, 17), (55, 28), (45, 28)]))
    k.part(st, "brick2", hi="brick4", line="paper2", lw=1)
    k.lines(p.circle(*R([(50, 22.5)])[0], 2.4), "beer3")
    k.lines(p.stroke(catmull(R([(36, 21), (40, 19), (44, 22), (48, 20)]), 4, False), 1.0), "ink3")
    k.part(p.poly(R([(16, 42), (20, 38), (24, 42), (20, 47)])) | p.circle(*R([(18, 40)])[0], 2.6)
           | p.circle(*R([(22, 40)])[0], 2.6), "brick2", line=None, lw=0)


def oil_can(p, k):
    k.part(p.stroke([(36, 22), (58, 4)], 2.8), "stone2", hi="stone4", line="ink1", lw=1)
    k.part(p.stroke(arc(17, 38, 8, 12, 100, 260), 4), "brick1", shade="brick0")
    body = p.poly(catmull([(14, 58), (46, 58), (48, 44), (40, 30), (34, 24), (26, 24), (20, 30), (12, 44)], 8, True))
    inner = k.part(body, "brick2", shade="brick1", hi="brick3", sd=4)
    k.lines(p.rect(12, 46, 40, 3) & inner, "beer2")
    k.part(p.rrect(26, 16, 8, 9, 2), "stone3", shade="stone2")
    k.part(p.rrect(23, 12, 14, 5, 2), "stone2", hi="stone4")


def magnifier(p, k):
    k.part(p.stroke([(37, 37), (57, 57)], 9), "wood3", shade="wood2", hi="wood4", sd=3)
    k.part(p.stroke([(36, 36), (41, 41)], 10), "beer1", shade="beer0", hi="beer3")
    glass = p.circle(25, 25, 17)
    k.part(glass, "river5", hi="road3", line="beer1", lw=k.lw + 2)
    k.lines(p.ring(25, 25, 17, 3), "beer2")
    k.lines(p.arc(25, 25, 11, 11, 200, 250, 2.4), "road3")


SOUVENIR_FN = {
    "reading-glasses": reading_glasses, "notepad": notepad, "lucky-penny": lucky_penny, "thermos": thermos,
    "road-atlas": road_atlas, "piggy-bank": piggy_bank, "pennant": pennant, "chess-clock": chess_clock,
    "pencil": pencil, "snack-board": snack_board, "dog-whistle": dog_whistle, "postcard": postcard,
    "oil-can": oil_can, "magnifier": magnifier,
}


# ── beer mats ──────────────────────────────────────────────────────────────────────────────────────────────

def mat(p, k, shape, ring, base="paper3"):
    if shape == "round":
        m = p.circle(32, 32, 28)
        inner = k.part(m, base, shade="paper1", hi="road3", sd=3)
        k.lines(p.ring(32, 32, 23, 2.6), ring)
    elif shape == "scallop":
        m = p.circle(32, 32, 26)
        for i in range(24):
            a = math.radians(i * 15)
            m |= p.circle(32 + 26 * math.cos(a), 32 + 26 * math.sin(a), 3.2)
        inner = k.part(m, base, shade="paper1", hi="road3", sd=3)
        k.lines(p.ring(32, 32, 21, 2.0), ring)
    else:
        m = p.rrect(5, 5, 54, 54, 9)
        inner = k.part(m, base, shade="paper1", hi="road3", sd=3)
        k.lines(p.rrect(10, 10, 44, 44, 6) & ~p.rrect(12.5, 12.5, 39, 39, 4), ring)
    return inner


def scissors(p, k):
    for s in (-1, 1):
        k.part(p.ring(32 + s * 9, 44, 5.5, 3.2), "brick2", shade="brick1")
    k.part(p.poly([(29, 38), (24, 14), (34, 34)]) | p.poly([(35, 38), (40, 14), (30, 34)]), "stone3", shade="stone2",
           hi="stone4")
    k.part(p.circle(32, 34, 2.2), "ink2", line=None, lw=0)


def open_hand(p, k):
    m = p.rrect(20, 28, 24, 24, 7)
    for x, h in ((22, 16), (28, 12), (34, 12), (40, 16)):
        m |= p.rrect(x - 2.8, h, 5.6, 22, 2.8)
    m |= p.poly(tf([(10, 30), (16, 26), (24, 36), (20, 42)], rot=0, ox=16, oy=34))
    k.part(m, "brick4", shade="brick3", hi="road3")


def shield(p, k):
    m = p.poly(catmull([(18, 14), (46, 14), (46, 32), (32, 50), (18, 32)], 6, True) if False else
               [(18, 13), (46, 13), (46, 31), (40, 42), (32, 50), (24, 42), (18, 31)])
    inner = k.part(m, "river2", shade="river1", hi="river3", sd=3)
    k.lines(p.poly([(18, 13), (32, 13), (32, 50), (24, 42), (18, 31)]) & inner, "beer2")
    k.lines(p.stroke([(32, 14), (32, 48)], 1.4) & inner, "ink1")


def redeal(p, k):
    k.part(p.rrect(25, 21, 14, 21, 2), "road3", shade="paper2")
    for a0, a1, tip in ((200, 330, 330), (20, 150, 150)):
        k.part(p.arc(32, 32, 17, 17, a0, a1, 4), "forest3", shade="forest2")
        a = math.radians(tip)
        x, y = 32 + 17 * math.cos(a), 32 + 17 * math.sin(a)
        d = 1 if tip == 330 else -1
        k.part(p.poly([(x - 5 * d, y - 6), (x + 6 * d, y + 1), (x - 6 * d, y + 5)]), "forest3", shade="forest2")


def mat_symbol(name, p, k):
    if name == "grand-bonus":
        from icons import g_grand
        g_grand(p.sub(16, 16, 32), k)
    elif name == "null-bonus":
        M.text(p, k, "0", 32, 32, 30, 7.5, "river1")
    elif name == "hand-bonus":
        open_hand(p, k)
    elif name == "schneider-bonus":
        scissors(p, k)
    elif name == "defence-bonus":
        shield(p, k)
    elif name == "redeal":
        redeal(p, k)
    elif name == "extra-game":
        M.text(p, k, "+1", 32, 32, 26, 7, "forest2", gap=1)
    elif name == "forehand":
        M.text(p, k, "V", 32, 32, 30, 7.5, "dusk1")
    elif name == "double-pot":
        M.text(p, k, "×2", 32, 32, 26, 7, "beer0", gap=2)


BEER_MATS = {
    "grand-bonus": ("scallop", "brick2"), "null-bonus": ("round", "river2"), "hand-bonus": ("square", "brick3"),
    "schneider-bonus": ("round", "stone1"), "defence-bonus": ("square", "river1"), "redeal": ("scallop", "forest2"),
    "extra-game": ("round", "forest3"), "forehand": ("square", "dusk2"), "double-pot": ("scallop", "beer1"),
}


# ── upgrades ───────────────────────────────────────────────────────────────────────────────────────────────

def aux_tank(p, k):
    k.part(p.poly([(14, 16), (9, 7), (14, 4), (21, 12)]), "stone2", shade="stone1")
    body = p.rrect(14, 12, 38, 48, 5)
    inner = k.part(body, "olive2", shade="olive1", hi="olive3", sd=3)
    k.lines((p.stroke([(19, 22), (47, 52)], 2.6) | p.stroke([(47, 22), (19, 52)], 2.6)) & erode(inner, 2), "olive1")
    k.part(p.rrect(24, 4, 22, 11, 3) & ~p.rrect(28, 7, 14, 4, 2), "olive2", shade="olive1")
    for y in (26, 46):
        k.part(p.rect(10, y, 46, 4), "wood1", hi="wood3")


def roof_box(p, k):
    for x in (14, 50):
        k.part(p.rect(x - 2, 44, 4, 12), "ink2")
    k.part(p.rect(4, 54, 56, 4), "stone1", hi="stone3")
    box = p.spline([(6, 44), (10, 30), (26, 22), (48, 22), (58, 30), (60, 44)])
    inner = k.part(box, "ink3", shade="ink2", hi="ink5", sd=4)
    k.lines(p.stroke([(10, 36), (58, 36)], 1.4) & inner, "ink2")
    k.part(p.rrect(30, 38, 8, 4, 1), "stone3")


def dog_bed(p, k):
    k.part(p.ell(32, 40, 29, 17), "wood3", shade="wood2", hi="wood4", sd=4)
    yy, xx = np.indices(p.circle(0, 0, 1).shape)
    rim = p.ell(32, 40, 29, 17) & ~p.ell(32, 37, 22, 11)
    k.lines(rim & ((((xx - yy) // max(1, int(3 * p.k))) % 2) == 0), "wood2")
    cush = p.ell(32, 37, 22, 11)
    k.part(cush, "river2", shade="river1", hi="river3")
    k.lines(cush & (((xx // max(1, int(4 * p.k))) % 3) == 0), "river1")
    k.lines(cush & (((yy // max(1, int(4 * p.k))) % 3) == 0), "river1")
    # a curled-up sleeping dog
    back = p.spline([(16, 36), (22, 27), (36, 25), (46, 30), (46, 40), (34, 43), (20, 43)])
    bi = k.part(back, "wood4", shade="wood3", hi="wood5")
    k.lines(p.spline([(18, 33), (24, 27), (36, 26), (42, 30), (32, 32), (22, 36)]) & bi, "ink2")
    k.part(p.spline([(38, 32), (46, 29), (51, 34), (47, 40), (40, 39)]), "wood4", shade="wood3")
    k.part(p.poly([(41, 30), (46, 24), (47, 31)]), "wood3", shade="wood2")
    k.lines(p.stroke([(44, 35), (47, 35)], 1.4), "ink1")
    k.lines(p.ell(51, 36, 1.8, 1.4), "ink1")


def awning(p, k):
    k.part(p.rrect(4, 10, 56, 9, 4), "stone2", shade="stone1", hi="stone3")
    can = p.poly([(6, 18), (58, 18), (60, 34), (4, 34)])
    for i in range(7):
        can |= p.circle(8 + i * 8, 34, 4)
    inner = k.part(can, "road3", line="ink1")
    yy, xx = np.indices(can.shape)
    k.lines(inner & ((((xx - p.dx) / p.k) // 8) % 2 == 0), "beer1")
    for x in (8, 56):
        k.part(p.stroke([(x, 34), (x + (4 if x < 32 else -4), 60)], 3), "stone2", hi="stone4")


def fridge(p, k):
    body = p.rrect(14, 6, 36, 54, 5)
    k.part(body, "paper3", shade="paper1", hi="road3", sd=4)
    k.lines(p.rect(14, 26, 36, 2), "paper1")
    k.part(p.rrect(40, 12, 4, 10, 2), "stone3", shade="stone1")
    k.part(p.rrect(40, 32, 4, 14, 2), "stone3", shade="stone1")
    k.part(p.rrect(24, 50, 16, 5, 2), "river2", hi="river3", lw=1)
    for x in (18, 46):
        k.part(p.rect(x - 2, 59, 4, 3), "ink2", lw=1)


def radio(p, k):
    body = p.rrect(4, 16, 56, 32, 4)
    k.part(body, "ink3", shade="ink2", hi="ink4", sd=3)
    k.part(p.rrect(14, 21, 36, 11, 2), "beer3", hi="beer4", line="ink1")
    for i in range(9):
        x = 17 + i * 3.8
        k.lines(p.stroke([(x, 23), (x, 26 + (2 if i % 2 else 0))], 1.0), "ink2")
    k.lines(p.stroke([(31, 22), (31, 31)], 1.4), "brick2")
    for x in (12, 52):
        k.part(p.circle(x, 39, 5), "stone3", shade="stone1", hi="stone4")
    for i in range(5):
        k.part(p.rrect(19 + i * 5.5, 37, 4, 7, 1), "paper3", shade="paper1", lw=1)


def sidecar(p, k):
    M.wheel(p, k, 42, 50, 9)
    body = p.spline([(4, 40), (8, 28), (24, 24), (44, 26), (58, 34), (56, 44), (40, 46), (12, 46)])
    inner = k.part(body, "river2", shade="river1", hi="river3", sd=4)
    k.lines(p.stroke([(8, 38), (54, 38)], 1.6) & inner, "paper3")
    k.part(p.poly([(34, 26), (40, 14), (46, 15), (44, 27)]), "river5", hi="road3", line="ink1")
    k.part(p.spline([(14, 28), (20, 22), (30, 23), (32, 28)]), "wood1", hi="wood3")


UPGRADE_FN = {"aux-tank": aux_tank, "roof-box": roof_box, "dog-bed": dog_bed, "awning": awning, "fridge": fridge,
              "radio": radio, "sidecar": sidecar}


# ── dog heads ──────────────────────────────────────────────────────────────────────────────────────────────

DOG_SPECS = {
    "shepherd": dict(coat=("wood4", "wood3", "wood5"), ears="up", saddle="ink2", mask="ink2", beard=None, brows=None,
                     collar="brick2", muzzle=0.9),
    "wolfhound-a": dict(coat=("stone2", "stone1", "stone3"), ears="rose", saddle=None, mask=None, beard="stone1",
                        brows="stone1", collar="river2", muzzle=1.15, shaggy="stone1"),
    "wolfhound-b": dict(coat=("paper1", "paper0", "paper2"), ears="rose", saddle=None, mask=None, beard="wood3",
                        brows="wood3", collar="forest3", muzzle=1.15, shaggy="wood4", brindle="wood3"),
    "airedale": dict(coat=("wood4", "wood3", "wood5"), ears="fold", saddle="ink2", mask=None, beard="wood3",
                     brows="wood3", collar="beer2", muzzle=1.1),
    "schnauzer-a": dict(coat=("ink2", "ink1", "ink4"), ears="fold", saddle=None, mask=None, beard="ink4",
                        brows="ink4", collar="brick2", muzzle=1.0),
    "schnauzer-b": dict(coat=("stone1", "stone0", "stone2"), ears="fold", saddle=None, mask=None, beard="stone3",
                        brows="stone3", collar="river3", muzzle=1.0, pepper="stone0"),
}


def dog(p, k, spec):
    main, shade, hi = spec["coat"]
    ml = spec["muzzle"]
    dark = spec["coat"][0] in ("ink2",)
    # chest and collar
    k.part(p.spline([(6, 66), (9, 52), (20, 43), (44, 43), (55, 52), (58, 66)]), main, shade=shade, hi=hi, sd=3)
    k.part(p.arc(32, 34, 17, 15, 28, 152, 5.5), spec["collar"], shade="ink2" if spec["collar"] != "ink2" else "ink1",
           hi="road3")
    k.part(p.circle(32, 51.5, 3.6), "beer2", shade="beer1", line="ink1", lw=1)
    # ears behind the skull
    if spec["ears"] == "up":
        for s in (-1, 1):
            k.part(p.poly([(32 + s * 6, 13), (32 + s * 19, -6), (32 + s * 23, 18)]), main, shade=shade)
            k.lines(p.poly([(32 + s * 11, 12), (32 + s * 18, 0), (32 + s * 20, 15)]), "brick3")
    elif spec["ears"] == "rose":
        for s in (-1, 1):
            k.part(p.poly([(32 + s * 12, 9), (32 + s * 25, 5), (32 + s * 27, 15), (32 + s * 18, 18)]), shade,
                   shade="ink2" if False else shade)
    skull = p.spline([(32, 5), (45, 8), (51, 19), (49, 31), (41, 37), (23, 37), (15, 31), (13, 19), (19, 8)])
    si = k.part(skull, main, shade=shade, hi=hi, sd=3)
    if spec.get("saddle"):
        k.lines(p.spline([(32, 5), (44, 8), (43, 15), (32, 13), (21, 15), (20, 8)]) & si, spec["saddle"])
    if spec.get("brindle"):
        for i in range(6):
            x = 17 + i * 6
            k.lines(p.stroke([(x, 10 + (i % 2) * 3), (x + 2, 24)], 1.3) & erode(si, 1), spec["brindle"])
    if spec.get("pepper"):
        for i in range(55):
            x, y = 14 + hash01(i, 5) * 36, 7 + hash01(i, 6) * 28
            k.lines(p.circle(x, y, 0.7) & erode(si, 1), spec["pepper"])
    if spec.get("shaggy"):
        for sx in (-1, 1):
            for i in range(4):
                k.lines(p.stroke([(32 + sx * (13 + i), 11 + i * 5.5), (32 + sx * (16 + i), 15 + i * 5.5)], 1.3) & si,
                        spec["shaggy"])
    if spec["ears"] == "fold":
        for s in (-1, 1):
            k.part(p.poly([(32 + s * 8, 7), (32 + s * 21, 8), (32 + s * 18, 22)]),
                   "ink1" if dark else shade, shade="ink0" if dark else "wood2" if main == "wood4" else "ink1")
    # muzzle
    y2 = lambda y: 22 + (y - 22) * ml  # noqa: E731
    mz = p.spline([(32, y2(21)), (41, y2(25)), (43.5, y2(35)), (40, y2(45)), (32, y2(48)), (24, y2(45)), (20.5, y2(35)),
                   (23, y2(25))])
    mcol = spec["mask"] or main
    k.part(mz, mcol, shade=shade if mcol == main else "ink1", hi=hi if mcol == main else "ink4", sd=2)
    if spec.get("beard"):
        b = p.spline([(21, y2(33)), (32, y2(37)), (43, y2(33)), (45, y2(44)), (39, y2(54)), (32, y2(57)), (25, y2(54)),
                      (19, y2(44))])
        bi = k.part(b, spec["beard"], shade=shade if spec["beard"] != shade else "ink1")
        for x in (26, 32, 38):
            k.lines(p.stroke([(x, y2(43)), (x + (x - 32) * 0.25, y2(53))], 1.2) & erode(bi, 1),
                    shade if spec["beard"] != shade else "ink1")
    k.part(p.ell(32, y2(34), 6, 4.3), "ink1", hi="ink4")
    if not spec.get("beard"):
        k.lines(p.stroke([(32, y2(38)), (32, y2(42))], 1.4)
                | p.stroke([(26, y2(44)), (32, y2(42)), (38, y2(44))], 1.4), "ink1")
    # eyes (with a glint) and friendly brows
    for s in (-1, 1):
        k.part(p.ell(32 + s * 9, 21, 3.2, 3.6), "ink0", line="ink0", lw=1)
        k.lines(p.circle(32 + s * 9 - 1, 20, 1.0), "road3")
        if spec.get("brows"):
            k.part(p.poly([(32 + s * 4, 15), (32 + s * 14, 16.5), (32 + s * 13, 19.5), (32 + s * 5, 18)]),
                   spec["brows"], line="ink1", lw=1)


# ── trophies ───────────────────────────────────────────────────────────────────────────────────────────────

def trophy_item(p, k, kind, metal, ribbon, emblem=None):
    gold = {"gold": ("beer2", "beer1", "beer4"), "silver": ("stone3", "stone2", "stone4")}[metal]
    if kind == "goblet":
        k.part(p.rrect(18, 50, 28, 10, 2), "wood2", shade="wood1", hi="wood3")
        k.part(p.rect(29, 32, 6, 18), *gold[:1], shade=gold[1])
        k.part(p.ell(32, 49, 9, 3), gold[0], shade=gold[1])
        k.part(p.spline([(17, 4), (47, 4), (45, 20), (36, 32), (28, 32), (19, 20)]), gold[0], shade=gold[1], hi=gold[2],
               sd=3)
    elif kind == "lidded":
        k.part(p.rrect(12, 52, 40, 9, 2), "wood2", shade="wood1", hi="wood3")
        k.part(p.rrect(17, 45, 30, 8, 2), "wood3", shade="wood2", hi="wood4")
        k.part(p.rect(24, 47, 16, 4), "beer3", line="ink1", lw=1)
        for s in (-1, 1):
            k.part(p.stroke(arc(32 + s * 18, 22, 8, 10, -90 if s > 0 else 90, 90 if s > 0 else 270), 4), gold[0],
                   shade=gold[1])
        k.part(p.rect(28, 36, 8, 9), gold[0], shade=gold[1])
        k.part(p.spline([(14, 12), (50, 12), (48, 28), (40, 37), (24, 37), (16, 28)]), gold[0], shade=gold[1],
               hi=gold[2], sd=3)
        k.part(p.ell(32, 11, 18, 4), gold[1], hi=gold[0])
        k.part(p.spline([(20, 11), (26, 5), (38, 5), (44, 11)], closed=True), gold[0], shade=gold[1], hi=gold[2])
        k.part(p.circle(32, 3, 3.5), gold[0], shade=gold[1], hi=gold[2])
    else:
        M.trophy(p, k, cup=gold[0], shade=gold[1], hi=gold[2])
    if ribbon:
        k.part(p.poly([(10, 18), (16, 20), (14, 40), (11, 36), (8, 40)]), ribbon, shade="ink2" if False else ribbon,
               hi="road3")
        k.part(p.poly([(16, 20), (20, 22), (20, 38), (17, 34), (15, 37)]), ribbon, hi="road3")
        k.part(p.circle(15, 18, 3.5), ribbon, hi="road3")
    if emblem == "fir":
        k.part(p.poly([(32, 9), (39, 24), (25, 24)]) | p.poly([(32, 15), (41, 30), (23, 30)]), "forest2",
               shade="forest1", line="ink1", lw=1)
        k.part(p.rect(30.5, 29, 3, 3), "wood1", lw=0, line=None)
    elif emblem == "star":
        k.part(p.poly([(32, 9), (35, 17), (43, 17), (37, 22), (39, 30), (32, 25), (25, 30), (27, 22), (21, 17),
                       (29, 17)]), "brick2", hi="brick4", line="ink1", lw=1)
    elif emblem == "wave":
        k.lines(p.stroke(catmull([(22, 18), (27, 15), (32, 19), (37, 15), (42, 18)], 5, False), 2.4), "river2")
        k.lines(p.stroke(catmull([(22, 24), (27, 21), (32, 25), (37, 21), (42, 24)], 5, False), 2.4), "river2")


TROPHIES = {
    "trophy-enztal": ("cup", "gold", "river2", "wave"),
    "trophy-muehlacker": ("goblet", "silver", "olive2", None),
    "trophy-schwarzwald": ("cup", "silver", "forest3", "fir"),
    "trophy-stuttgart": ("goblet", "gold", "brick2", "star"),
    "trophy-wander": ("lidded", "gold", None, None),
}


def render(fn) -> Img:
    img, p, k = new(SIZE)
    fn(p, k)
    return k.finish()


def build() -> Atlas:
    atlas = Atlas("items", width=1024)
    atlas.group("souvenirs")
    for name, fn in SOUVENIR_FN.items():
        atlas.add(name, render(fn))
    atlas.group("beer-mats")
    for name, (shape, ring) in BEER_MATS.items():
        def f(p, k, name=name, shape=shape, ring=ring):
            mat(p, k, shape, ring)
            mat_symbol(name, p.sub(10, 10, 44), k)
        atlas.add(name, render(f))
    atlas.group("upgrades")
    for name, fn in UPGRADE_FN.items():
        atlas.add(name, render(fn))
    atlas.group("dogs")
    for name, spec in DOG_SPECS.items():
        atlas.add(name, render(lambda p, k, spec=spec: dog(p, k, spec)))
    atlas.group("trophies")
    for name, (kind, metal, ribbon, emblem) in TROPHIES.items():
        atlas.add(name, render(lambda p, k, a=(kind, metal, ribbon, emblem): trophy_item(p, k, *a)))
    return atlas
