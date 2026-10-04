"""cards atlas -> public/sprites/cards.png/json (contract §10, §0.5).

Three decks (`french`, `german`, `tournament`) × 32 cards, large 144×216 atlas px (72×108 layout units) and small
72×108 (`-s`, 36×54 units). Frame `<deck>-<suit>-<rank>` / `-s`; backs `back-1..3` (+`-s`); overlays `shadow`,
`hl-playable`, `hl-selected`, `veil-locked` (+`-s`). Every frame's anchor is the card's top-left corner (overlays that
reach beyond the card carry ax/ay = their margin, so they are drawn at the same x, y as the card).

Legibility first: the corner index (rank over suit) is big and bold top-left and, rotated, bottom-right. In a fanned
hand only the left 30 layout units (60 px) of a card are visible; the whole index column sits within x < 48 px.
"""
from __future__ import annotations

import numpy as np

from atlas import Atlas
from glyphs import text_mask
from px import (V, Img, Path, arc, paint, erode, dilate, edge_in, edge_out, band_br, rrect_mask, place, shift, hash01)
from suits import suit_img, suit_colors, suit_mask
import figures

SUITS = ["diamonds", "hearts", "spades", "clubs"]
RANKS = ["7", "8", "9", "10", "jack", "queen", "king", "ace"]
DECKS = ["french", "german", "tournament"]
LETTERS = {
    "french": {"jack": "B", "queen": "D", "king": "K", "ace": "A"},
    "tournament": {"jack": "B", "queen": "D", "king": "K", "ace": "A"},
    "german": {"jack": "U", "queen": "O", "king": "K", "ace": "A"},
}

CW, CH = 144, 216          # large card (atlas px)
SW, SH = 72, 108           # small card
RAD, SRAD = 10, 6          # corner radius
FACE = "road3"
EDGE = "ink1"
EDGE_SHADE = "paper3"

_cache: dict = {}


def label(deck, rank):
    return LETTERS[deck].get(rank, rank)


def card_mask(w, h, r):
    return rrect_mask(w, h, 0, 0, w, h, r)


def blank(w, h, r) -> Img:
    """Cream card with an ink edge and a faint bottom/right thickness band."""
    key = ("blank", w, h, r)
    if key in _cache:
        return _cache[key].copy()
    img = Img(w, h)
    m = card_mask(w, h, r)
    inner = erode(m, 2)
    img.fill(m, EDGE)
    img.fill(inner, FACE)
    img.fill(inner & ~shift(inner, -2, -2) & ~(inner & ~shift(inner, 2, 2)), EDGE_SHADE)
    _cache[key] = img
    return img.copy()


def suit_cached(deck, suit, w, h, **kw) -> Img:
    key = ("suit", deck, suit, w, h, tuple(sorted(kw.items())))
    if key not in _cache:
        _cache[key] = suit_img(deck, suit, w, h, **kw)
    return _cache[key]


# ── corner index ───────────────────────────────────────────────────────────────────────────────────────────

def index_img(deck, suit, rank, small=False) -> Img:
    """Rank over suit, centred in a column. Returns an Img the size of the index block."""
    key = ("index", deck, suit, rank, small)
    if key in _cache:
        return _cache[key]
    col = suit_colors(deck, suit)
    text = label(deck, rank)
    if small:
        cap, pen, colw, sw, gap_y = 27, 6.2, 30, 26, 4
    else:
        cap, pen, colw, sw, gap_y = 40, 8.4, 44, 34, 6
    m = text_mask(text, cap, pen, -1.0 if text == "10" else 1.0)
    if m.shape[1] > colw:  # condense "10" to the column
        k = colw / m.shape[1]
        m = text_mask(text, cap, pen * 0.95, -2.0)
        if m.shape[1] > colw:
            m = m[:, :colw]
    H = m.shape[0] + gap_y + sw
    img = Img(colw, H)
    tm = place((H, colw), m, (colw - m.shape[1]) // 2, 0)
    # a dark contour around light ink (Karo yellow) so it reads on cream
    if col["index"] in ("beer0", "beer1"):
        img.fill(dilate(tm, 1.5), "wood1")
    img.fill(tm, col["index"])
    s = suit_cached(deck, suit, sw, sw)
    img.blit(s, (colw - sw) // 2, m.shape[0] + gap_y)
    _cache[key] = img
    return img


def put_indices(img: Img, deck, suit, rank, small=False):
    ix = index_img(deck, suit, rank, small)
    x, y = (3, 5) if small else (5, 8)
    img.blit(ix, x, y)
    r = ix.rot180()
    img.blit(r, img.w - x - r.w, img.h - y - r.h)
    return (x, y, ix.w, ix.h)


# ── pips ───────────────────────────────────────────────────────────────────────────────────────────────────

PIP_W, PIP_H = 18, 20
FIELD = (47, 8, 50, 200)   # x, y, w, h of the framed pip field between the corner indices
XL, XC, XR = 60, 72, 84
R4 = [30, 82, 134, 186]
R3 = [30, 108, 186]
LAYOUTS = {
    "7": [(XL, y) for y in R3] + [(XR, y) for y in R3] + [(XC, 69)],
    "8": [(XL, y) for y in R3] + [(XR, y) for y in R3] + [(XC, 69), (XC, 147)],
    "9": [(XL, y) for y in R4] + [(XR, y) for y in R4] + [(XC, 108)],
    "10": [(XL, y) for y in R4] + [(XR, y) for y in R4] + [(XC, 56), (XC, 160)],
}


def pip_field(img: Img):
    x, y, w, h = FIELD
    m = rrect_mask(img.w, img.h, x, y, w, h, 6)
    img.fill(m, "paper1")
    img.fill(erode(m, 1), "paper3")
    img.fill(erode(m, 3) & ~erode(m, 4), "paper2")


def put_pips(img: Img, deck, suit, rank):
    pip_field(img)
    up = suit_cached(deck, suit, PIP_W, PIP_H)
    down = up.rot180()
    for cx, cy in LAYOUTS[rank]:
        p = down if cy > CH // 2 else up
        img.blit(p, cx - PIP_W // 2, cy - PIP_H // 2)


def put_ace(img: Img, deck, suit):
    cx, cy = CW // 2, CH // 2
    # an engraved oval ornament around the big pip
    v = V(CW, CH)
    v.stroke(arc(cx, cy, 34, 44, 0, 360, 64), 2.2)
    ring = v.mask()
    img.fill(ring, "paper1")
    for a in (0, 90, 180, 270):
        dv = V(CW, CH)
        import math
        px_, py_ = cx + 34 * math.cos(math.radians(a)), cy + 44 * math.sin(math.radians(a))
        dv.poly([(px_, py_ - 5), (px_ + 4, py_), (px_, py_ + 5), (px_ - 4, py_)])
        img.fill(dilate(dv.mask(), 1), "paper0")
        img.fill(dv.mask(), "paper2")
    w, h = (50, 56) if deck != "german" else (54, 60)
    big = suit_img(deck, suit, w, h, lw=3)
    img.blit(big, cx - w // 2, cy - h // 2)


# ── cards ──────────────────────────────────────────────────────────────────────────────────────────────────

def card_large(deck, suit, rank) -> Img:
    img = blank(CW, CH, RAD)
    if rank in LAYOUTS:
        put_pips(img, deck, suit, rank)
    elif rank == "ace":
        put_ace(img, deck, suit)
    else:
        figures.court(img, deck, suit, rank)
    put_indices(img, deck, suit, rank)
    return img


def card_small(deck, suit, rank) -> Img:
    img = blank(SW, SH, SRAD)
    put_indices(img, deck, suit, rank, small=True)
    if rank in ("jack", "queen", "king"):
        figures.court_badge(img, deck, suit, rank)
    return img


# ── backs ──────────────────────────────────────────────────────────────────────────────────────────────────

BACKS = {
    1: dict(field="brick1", line="brick2", dark="brick0", light="brick3"),
    2: dict(field="river1", line="river2", dark="river0", light="river3"),
    3: dict(field="forest1", line="forest2", dark="forest0", light="forest3"),
}


def back(n, w, h, r) -> Img:
    c = BACKS[n]
    img = blank(w, h, r)
    k = w / CW
    b = max(4, round(8 * k))
    field = rrect_mask(w, h, b, b, w - 2 * b, h - 2 * b, max(2, r - 4))
    yy, xx = np.indices((h, w))
    img.fill(field, c["field"])
    fi = erode(field, max(1, round(2 * k)))
    img.fill(field & ~fi, c["dark"])
    if n == 1:
        # classic diamond lattice with a dot in every cell
        s = max(6, round(12 * k))
        lat = (((xx + yy) % s) < max(1, round(1.5 * k))) | (((xx - yy) % s) < max(1, round(1.5 * k)))
        img.fill(lat & fi, c["line"])
        dots = ((xx + yy) % s == s // 2) & ((xx - yy) % s == s // 2)
        img.fill(dilate(dots, max(0.6, 1.2 * k)) & fi, c["light"])
    elif n == 2:
        # rosettes on a fine grid
        s = max(8, round(16 * k))
        grid = ((xx % s) == 0) | ((yy % s) == 0)
        img.fill(grid & fi, c["line"])
        ctr = ((xx % s) == s // 2) & ((yy % s) == s // 2)
        img.fill(dilate(ctr, max(1, 2.6 * k)) & fi, c["light"])
        img.fill(ctr & fi, c["dark"])
    else:
        # fine stripes behind a Brezel medallion
        s = max(4, round(6 * k))
        img.fill((((xx - yy) % s) < max(1, round(2 * k))) & fi, c["line"])
    # central medallion
    cx, cy = w / 2, h / 2
    mv = V(w, h)
    mv.ellipse(cx, cy, 34 * k, 44 * k)
    med = mv.mask()
    paint(img, med, "paper3", line="ink1", lw=max(1, round(2 * k)), hi="road3", hd=max(1, round(2 * k)))
    iv = V(w, h)
    iv.stroke(arc(cx, cy, 28 * k, 38 * k, 0, 360, 64), max(1.0, 1.6 * k))
    img.fill(iv.mask() & med, c["field"])
    emb = emblem(n, w, h, cx, cy, k)
    img.blit(emb, 0, 0)
    return img


def emblem(n, w, h, cx, cy, k) -> Img:
    """Centre motif of a back: 1 the four suits, 2 a wheel, 3 a Brezel."""
    img = Img(w, h)
    if n == 1:
        sz = max(8, round(22 * k))
        off = 12 * k
        for (dx, dy), (deck, suit) in zip(((0, -1.1), (1, 0), (0, 1.1), (-1, 0)),
                                          (("french", "clubs"), ("french", "hearts"), ("french", "spades"),
                                           ("french", "diamonds"))):
            s = suit_img(deck, suit, sz, sz)
            img.blit(s, round(cx + dx * off * 1.1 - sz / 2), round(cy + dy * off * 1.3 - sz / 2))
    elif n == 2:
        v = V(w, h)
        import math
        v.stroke(arc(cx, cy, 18 * k, 18 * k, 0, 360, 48), max(1.5, 4 * k))
        for i in range(8):
            a = math.radians(i * 45)
            v.stroke([(cx, cy), (cx + 17 * k * math.cos(a), cy + 17 * k * math.sin(a))], max(1.0, 2 * k))
        v.circle(cx, cy, 5 * k)
        m = v.mask()
        img.fill(dilate(m, max(1, round(1.5 * k))), "ink1")
        img.fill(m, "river1")
    else:
        m = figures.brezel_mask(w, h, cx, cy, 25 * k)
        paint(img, m, "wood3", line="wood0", lw=max(1, round(2 * k)), shade="wood2", hi="wood5",
              sd=max(1, round(2 * k)), hd=max(1, round(1.5 * k)))
        # salt grains
        for i in range(14):
            px_ = cx + (hash01(i, 3) - 0.5) * 40 * k
            py_ = cy + (hash01(i, 7) - 0.5) * 30 * k
            if m[int(py_), int(px_)] and k > 0.7:
                img.put(px_, py_, "road3")
    return img


# ── overlays ───────────────────────────────────────────────────────────────────────────────────────────────

def overlays(atlas: Atlas, small: bool):
    w, h, r = (SW, SH, SRAD) if small else (CW, CH, RAD)
    sfx = "-s" if small else ""
    mg = 4 if small else 8
    m = card_mask(w, h, r)
    # shadow: the card silhouette in ink, 40 % (draw it 2–3 units down-right of the card)
    sh = Img(w, h)
    sh.fill(m, "ink0", alpha=104)
    sh.fill(m & ~erode(m, 1), "ink0", alpha=64)
    atlas.add(f"shadow{sfx}", sh, 0, 0)
    # playable: a soft warm glow rim around the card
    big = place((h + 2 * mg, w + 2 * mg), m, mg, mg)
    g = Img(w + 2 * mg, h + 2 * mg)
    steps = [(1, "beer4", 255), (2, "beer3", 220), (3, "beer3", 160), (5, "beer2", 110), (mg, "beer1", 55)]
    prev = big
    for d, c, a in steps:
        ring = dilate(big, d) & ~prev
        g.fill(ring, c, alpha=a)
        prev = prev | ring
    atlas.add(f"hl-playable{sfx}", g, mg, mg)
    # selected: a strong beer-gold outline with an ink edge
    s = Img(w + 2 * mg, h + 2 * mg)
    o = 3 if small else 5
    ring = dilate(big, o) & ~big
    s.fill(dilate(big, o + 1) & ~big, "ink0")
    s.fill(ring & ~edge_out(big, 1), "beer3")
    s.fill(dilate(big, 2) & ~dilate(big, 1), "beer4")
    s.fill(edge_out(big, 1), "ink0")
    atlas.add(f"hl-selected{sfx}", s, mg, mg)
    # locked: a dim ink veil over the card
    vl = Img(w, h)
    vl.fill(m, "ink1", alpha=120)
    atlas.add(f"veil-locked{sfx}", vl, 0, 0)


def build() -> Atlas:
    atlas = Atlas("cards", width=2048)
    for deck in DECKS:
        atlas.group(deck)
        for suit in SUITS:
            for rank in RANKS:
                atlas.add(f"{deck}-{suit}-{rank}", card_large(deck, suit, rank), 0, 0)
    atlas.group("backs")
    for n in (1, 2, 3):
        atlas.add(f"back-{n}", back(n, CW, CH, RAD), 0, 0)
    overlays(atlas, False)
    atlas.group("small")
    for deck in DECKS:
        for suit in SUITS:
            for rank in RANKS:
                atlas.add(f"{deck}-{suit}-{rank}-s", card_small(deck, suit, rank), 0, 0)
    for n in (1, 2, 3):
        atlas.add(f"back-{n}-s", back(n, SW, SH, SRAD), 0, 0)
    overlays(atlas, True)
    atlas.meta("cardSize", {"w": CW, "h": CH, "sw": SW, "sh": SH})
    atlas.meta("indexStrip", {"w": 48, "sw": 34})
    return atlas
