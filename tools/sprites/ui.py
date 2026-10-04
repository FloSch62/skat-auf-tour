"""ui atlas -> public/sprites/ui.png/json (contract §10).

9-slices named exactly like the code fallbacks in src/core/gfx.ts (FALLBACK): wood panelling with a dark ink outline
and warm highlights, paper with a fibre texture, green felt with a wooden rail, a comic speech bubble, buttons in
every state. Corners are 12 atlas px (6 layout units), so every slice works from a 44×32 button up to a full-screen
panel. Edges and centres are tiled by the core (never stretched); textures are periodic in the centre size so the
tiling is seamless.

Also: tabs (`tab`, `tab-hover`, `tab-active`, 9-slices open at the bottom), the Liste sheet (`liste`), fuel gauge
segments, a checkbox tick and the large cursors `cursor-arrow`, `cursor-pointer`, `cursor-wait` (+ anim), `cursor-blocked`
(anchor = hotspot).
"""
from __future__ import annotations

import math

import numpy as np

from atlas import Atlas
from px import (V, Img, Path, arc, paint, erode, dilate, edge_in, edge_out, band_br, band_tl, shift, rrect_mask,
                hash01, place)

INSET = 12


def sides(h, w):
    """Boolean mask of pixels on the top/left side of a rectangle (diagonal split at the corners)."""
    yy, xx = np.indices((h, w))
    return np.minimum(yy, xx) < np.minimum(h - 1 - yy, w - 1 - xx)


def ring(m, d0, d1):
    return erode(m, d0) & ~erode(m, d1) if d0 > 0 else m & ~erode(m, d1)


def periodic(W, H, l, t, r, b):
    """Coordinates folded into the centre period (seamless tiling of textures)."""
    yy, xx = np.indices((H, W))
    px_, py_ = W - l - r, H - t - b
    return (xx - l) % px_, (yy - t) % py_, px_, py_


# ── textures ───────────────────────────────────────────────────────────────────────────────────────────────

def wood_grain(W, H, ins, dark, light, seed=1, density=1.0):
    """Horizontal wavy grain lines with breaks, periodic in the centre size."""
    fx, fy, P, Q = periodic(W, H, *ins)
    m_dark = np.zeros((H, W), bool)
    m_light = np.zeros((H, W), bool)
    n = max(2, int(Q / 9 * density))
    for i in range(n):
        y0 = (i + 0.5) * Q / n + (hash01(seed, i) - 0.5) * 4
        k = 1 + int(hash01(seed, i, 2) * 2)
        ph = hash01(seed, i, 3) * 6.283
        amp = 0.8 + hash01(seed, i, 4) * 1.6
        yl = y0 + amp * np.sin(2 * math.pi * fx / P * k + ph)
        on = np.abs(fy - yl) < 0.55
        # breaks: periodic segments
        seg = np.sin(2 * math.pi * fx / P * (2 + i % 3) + ph * 2) > -0.35
        (m_dark if i % 2 == 0 else m_light)[on & seg] = True
    return m_dark, m_light


def fibres(W, H, ins, seed=3, count=26):
    fx, fy, P, Q = periodic(W, H, *ins)
    m = np.zeros((H, W), bool)
    for i in range(count):
        x0 = hash01(seed, i) * P
        y0 = hash01(seed, i, 1) * Q
        ln = 2 + hash01(seed, i, 2) * 4
        ang = hash01(seed, i, 3) * math.pi
        for s in np.linspace(0, ln, int(ln * 2) + 1):
            x = int(x0 + s * math.cos(ang)) % P
            y = int(y0 + s * math.sin(ang)) % Q
            m |= (fx == x) & (fy == y)
    return m


def specks(W, H, ins, seed=5, count=40):
    fx, fy, P, Q = periodic(W, H, *ins)
    m = np.zeros((H, W), bool)
    for i in range(count):
        x = int(hash01(seed, i) * P)
        y = int(hash01(seed, i, 1) * Q)
        m |= (fx == x) & (fy == y)
    return m


# ── frames ─────────────────────────────────────────────────────────────────────────────────────────────────

def framed(W, H, outer="ink0", ow=2, r=6, bands=(), inner=None, fill="wood1", hi=None, lo=None, tex=None,
           ins=(INSET, INSET, INSET, INSET)):
    """A rounded frame: ink outline, bevel bands [(width, tl_colour, br_colour)], an inner line, a fill with an
    optional texture, a top-left highlight line and a bottom shade line just inside the frame."""
    img = Img(W, H)
    m = rrect_mask(W, H, 0, 0, W, H, r)
    tl = sides(H, W)
    img.fill(m, outer)
    d = ow
    for bw, ctl, cbr in bands:
        rg = ring(m, d, d + bw)
        img.fill(rg & tl, ctl)
        img.fill(rg & ~tl, cbr)
        d += bw
    if inner:
        img.fill(ring(m, d, d + 1), inner)
        d += 1
    core = erode(m, d)
    img.fill(core, fill)
    if tex:
        tex(img, core)
    if hi:
        img.fill(core & ~shift(core, 0, 1) & tl, hi)
    if lo:
        img.fill(core & ~shift(core, 0, -1) & ~tl, lo)
    return img


def panels(atlas: Atlas):
    W = H = 96
    ins = (INSET,) * 4

    def grain(dark, light, seed, density=1.0):
        def f(img, core):
            md, ml = wood_grain(W, H, ins, dark, light, seed, density)
            img.fill(md & erode(core, 1), dark)
            img.fill(ml & erode(core, 1), light)
        return f

    def paper_tex(col, seed=3):
        def f(img, core):
            img.fill(fibres(W, H, ins, seed) & erode(core, 1), col)
        return f

    def felt_tex(img, core):
        img.fill(specks(W, H, ins, 5, 70) & core, "felt2")
        img.fill(specks(W, H, ins, 9, 40) & core, "felt0")

    specs = {
        "panel": dict(bands=[(2, "wood5", "wood2"), (3, "wood3", "wood2")], inner="wood0", fill="wood1",
                      tex=grain("wood0", "wood2", 1)),
        "panel-hi": dict(bands=[(2, "beer3", "wood3"), (3, "wood5", "wood4")], inner="wood1", fill="wood2",
                         tex=grain("wood1", "wood3", 2)),
        "panel-dark": dict(bands=[(2, "wood3", "wood1"), (2, "wood2", "wood1")], inner="ink1", fill="wood0",
                           tex=grain("ink2", "wood1", 3, 0.7)),
        "paper": dict(outer="ink1", bands=[(1, "paper4", "paper1"), (1, "paper2", "paper1")], fill="paper3",
                      tex=paper_tex("paper2")),
        "paper-dark": dict(outer="ink1", bands=[(1, "paper3", "paper0"), (1, "paper1", "paper0")], fill="paper2",
                           tex=paper_tex("paper1", 4)),
        "felt": dict(bands=[(2, "wood4", "wood1"), (3, "wood2", "wood1")], inner="felt0", fill="felt1", tex=felt_tex),
        "dialog": dict(bands=[(2, "wood5", "wood2"), (2, "wood3", "wood2"), (1, "beer3", "beer1"), (1, "wood2", "wood1")],
                       inner="wood0", fill="wood1", tex=grain("wood0", "wood2", 6)),
        "tooltip": dict(outer="ink0", bands=[(1, "road3", "paper1")], fill="paper4", r=4, tex=paper_tex("paper3", 7)),
    }
    for name, sp in specs.items():
        sp = dict(sp)
        r = sp.pop("r", 6)
        img = framed(W, H, r=r, ins=ins, **sp)
        if name == "dialog":
            corner_caps(img)
        atlas.slice9(("wood-" + name) if name in ENAMEL_PANELS else name, img, *ins)
    # speech bubble: white(ish) paper, a 2-unit ink contour, round comic corners
    b = Img(W, H)
    m = rrect_mask(W, H, 0, 0, W, H, 11)
    b.fill(m, "ink0")
    b.fill(erode(m, 4), "paper4")
    atlas.slice9("bubble", b, *ins)


def corner_caps(img: Img):
    """Small brass corner fittings for the dialog frame."""
    W, H = img.w, img.h
    for fx in (False, True):
        for fy in (False, True):
            v = V(W, H)
            x = W - 3 if fx else 3
            y = H - 3 if fy else 3
            v.poly([(x, y), (x + (-9 if fx else 9), y), (x, y + (-9 if fy else 9))])
            m = v.mask()
            paint(img, m, "beer2", line="ink0", lw=1, hi="beer4", shade="beer0", sd=1, hd=1)


def buttons(atlas: Atlas):
    W, H = 96, 64
    ins = (INSET, INSET, INSET, INSET)
    specs = {
        "button-normal": dict(bands=[(2, "wood5", "wood1"), (1, "wood4", "wood1")], fill="wood2", lo="wood1"),
        "button-hover": dict(bands=[(2, "beer4", "wood2"), (1, "beer3", "wood2")], fill="wood3", lo="wood2"),
        "button-pressed": dict(bands=[(2, "ink2", "wood3"), (1, "wood0", "wood2")], fill="wood1", hi="wood0"),
        "button-disabled": dict(outer="ink1", bands=[(2, "ink4", "ink2"), (1, "ink5", "ink2")], fill="ink3"),
        "button-go": dict(bands=[(2, "forest5", "forest0"), (1, "forest4", "forest0")], fill="forest1", lo="forest0"),
        "button-go-hover": dict(bands=[(2, "road3", "forest1"), (1, "forest5", "forest1")], fill="forest2",
                                lo="forest1"),
        "button-danger": dict(bands=[(2, "brick4", "ink1"), (1, "brick3", "ink1")], fill="brick0", lo="ink1"),
        "button-danger-hover": dict(bands=[(2, "road3", "brick0"), (1, "brick4", "brick0")], fill="brick1",
                                    lo="brick0"),
        "button-paper": dict(outer="ink1", bands=[(2, "paper4", "paper0"), (1, "paper2", "paper0")], fill="paper3",
                             lo="paper2"),
        "button-paper-hover": dict(outer="ink0", bands=[(2, "beer4", "beer1"), (1, "beer3", "beer1")], fill="paper4",
                                   lo="paper3"),
    }
    for name, sp in specs.items():
        img = framed(W, H, r=6, ins=ins, **sp)
        atlas.slice9(("wood-" + name) if name in ENAMEL_BUTTONS else name, img, *ins)


def tabs(atlas: Atlas):
    """Tabs (Reiter): rounded top, open bottom; draw the tab so its bottom overlaps the panel below by 2 units."""
    W, H = 96, 56
    ins = (INSET, INSET, INSET, 4)
    for name, fill, band, hi in (("tab", "wood1", ("wood3", "wood0"), "wood2"),
                                 ("tab-hover", "wood2", ("beer3", "wood1"), "wood3"),
                                 ("tab-active", "wood2", ("wood5", "wood1"), "wood3"),
                                 ("tab-paper", "paper2", ("paper4", "paper0"), "paper3"),
                                 ("tab-paper-active", "paper3", ("road3", "paper1"), "paper4")):
        HH = H + 12
        img = Img(W, HH)
        m = rrect_mask(W, HH, 0, 0, W, HH, 7)
        tl = sides(HH, W) | (np.indices((HH, W))[1] < W // 2)
        outer = "ink1" if "paper" in name else "ink0"
        img.fill(m, outer)
        rg = erode(m, 2) & ~erode(m, 4)
        img.fill(rg & tl, band[0])
        img.fill(rg & ~tl, band[1])
        core = erode(m, 4)
        img.fill(core, fill)
        img.fill(core & ~shift(core, 0, 1), hi)
        img = img.crop(0, 0, W, H)
        atlas.slice9(("wood-" + name) if name in ENAMEL_TABS else name, img, *ins)


def edge_side(m):
    """Left/right outline columns of the open bottom rows of a tab."""
    out = np.zeros_like(m)
    for y in range(m.shape[0]):
        xs = np.nonzero(m[y])[0]
        if len(xs):
            out[y, xs[0]:xs[0] + 4] = True
            out[y, xs[-1] - 3:xs[-1] + 1] = True
    return out


# ── enamel (Emaille) look: the default theme since the user's review ("sehr braun") ─────────────────────────────
# Deep blue enamel signs with a cream enamel border and a thin inner line; cream enamel buttons; coloured enamel for
# go / danger / the selected choice. Every decoration sits inside the 12-px insets (the centre is flat), so tiling is
# seamless; dithers have period 2, which divides the 72-px edge period.

ENAMEL_PANELS = {"panel", "panel-hi", "panel-dark", "dialog"}
ENAMEL_BUTTONS = {"button-normal", "button-hover", "button-pressed", "button-disabled", "button-go", "button-go-hover",
                  "button-danger", "button-danger-hover"}
ENAMEL_TABS = {"tab", "tab-hover", "tab-active"}


def dither(shape, phase=0):
    yy, xx = np.indices(shape)
    return ((xx + yy + phase) % 2) == 0


def depth_mask(W, H, d, r0):
    """The rounded rectangle d px inside the frame, corner radius shrinking softly with depth."""
    return rrect_mask(W, H, d, d, W - 2 * d, H - 2 * d, max(2.0, r0 - d * 0.6))


def chip(img: Img, x, y, shape, glint="road3", base="ink2", edge="paper1"):
    """A tiny enamel chip: the dark base coat shows through, with a bright broken edge on the upper left and a
    shadowed edge on the lower right."""
    pts = set(shape)
    for dx, dy in shape:
        img.put(x + dx, y + dy, base)
    for dx, dy in shape:
        if (dx - 1, dy) not in pts and (dx, dy - 1) not in pts:
            img.put(x + dx - 1, y + dy - 1, glint)
        if (dx + 1, dy) not in pts:
            img.put(x + dx + 1, y + dy, edge)


CHIP_A = [(0, 0), (1, 0), (2, 0), (1, 1)]
CHIP_B = [(0, 0), (1, 0), (1, 1), (2, 1)]
CHIP_C = [(0, 0), (0, 1), (1, 1)]


def enamel_sign(W, H, fill, band, band_hi, band_lo, edge="ink1", line=None, glaze=None, band_w=4, chips=(), r=8):
    """A blue enamel sign (depths in px): ink outline 0–1, enamel border band 2–5 (bevelled: light outer rim top-left,
    soft shade bottom-right), a dark step edge 6, a glaze 7–8 that catches the light on the top/left, a thin inner
    line 9–10, a last glaze row 11 on the top/left, then the flat field (from 12 px on, the tiled centre)."""
    img = Img(W, H)
    tl = sides(H, W)
    m0 = depth_mask(W, H, 0, r)
    m2 = depth_mask(W, H, 2, r)
    mb = depth_mask(W, H, 2 + band_w, r)
    me = depth_mask(W, H, 3 + band_w, r)
    img.fill(m0, "ink0")
    img.fill(m2, band)
    img.fill(m2 & ~depth_mask(W, H, 3, r) & tl, band_hi)
    img.fill(m2 & ~mb & ~tl & ~depth_mask(W, H, 3, r), band_lo)
    img.fill(mb & ~depth_mask(W, H, 1 + band_w, r) & ~tl, band_lo)
    img.fill(mb, edge)
    img.fill(me, fill)
    d = 3 + band_w
    if glaze:
        gz = me & ~depth_mask(W, H, d + 2, r) & tl
        img.fill(gz & ~depth_mask(W, H, d + 1, r), glaze)
        img.fill(gz & dither((H, W)), glaze)
    if line:
        ml = depth_mask(W, H, d + 2, r)
        img.fill(ml & ~depth_mask(W, H, d + 4, r), line)
        d += 4
        if glaze and d < INSET:
            gz = depth_mask(W, H, d, r) & ~depth_mask(W, H, INSET, r) & tl
            img.fill(gz & dither((H, W), 1), glaze)
    for x, y, shape in chips:
        chip(img, x, y, shape)
    return img


def enamel_button(W, H, fill, rim_hi, rim, rim_lo, inner, gloss=None, shade=None, pressed=False, r=7):
    """Cream (or coloured) enamel button: ink outline 2 px, a 2-px bevelled rim, a 1-px inner line, a glossy top and a
    soft shade at the bottom inside the 12-px insets; pressed buttons invert the bevel and show an inner shadow."""
    img = Img(W, H)
    tl = sides(H, W)
    m0 = depth_mask(W, H, 0, r)
    m2 = depth_mask(W, H, 2, r)
    m4 = depth_mask(W, H, 4, r)
    m5 = depth_mask(W, H, 5, r)
    img.fill(m0, "ink0")
    img.fill(m2, rim)
    m3 = depth_mask(W, H, 3, r)
    img.fill(m2 & ~m3 & tl, rim_lo if pressed else rim_hi)
    img.fill(m2 & ~m4 & ~tl, rim_hi if pressed else rim_lo)
    img.fill(m4, inner)
    img.fill(m5, fill)
    yy, xx = np.indices((H, W))
    if pressed:
        img.fill(m5 & (yy < 8), inner)
        img.fill(m5 & (yy >= 8) & (yy < 10) & dither((H, W)), inner)
        img.fill(m5 & (xx < 7), inner)
    else:
        if gloss:
            img.fill(m5 & (yy < 7), gloss)
            img.fill(m5 & (yy >= 7) & (yy < 10) & dither((H, W)), gloss)
        if shade:
            img.fill(m5 & (yy >= H - 7), shade)
            img.fill(m5 & (yy >= H - 10) & (yy < H - 7) & dither((H, W)), shade)
    return img


def enamel_panels(atlas: Atlas):
    W = H = 96
    ins = (INSET,) * 4
    atlas.slice9("panel", enamel_sign(W, H, "river0", "paper2", "paper4", "paper1", line="river2", glaze="river1",
                                      chips=[(W - 10, 3, CHIP_A), (6, H - 5, CHIP_C)]), *ins)
    atlas.slice9("panel-hi", enamel_sign(W, H, "river1", "beer3", "beer4", "beer1", line="river3", glaze="river2",
                                         chips=[(4, 4, CHIP_C)]), *ins)
    atlas.slice9("panel-dark", enamel_sign(W, H, "river0", "river2", "river3", "river1", edge="ink0", band_w=3,
                                           glaze="river1"), *ins)
    atlas.slice9("dialog", enamel_sign(W, H, "river0", "paper3", "road3", "paper1", line="beer2", glaze="river1",
                                       chips=[(W - 9, H - 5, CHIP_B)]), *ins)


def enamel_buttons(atlas: Atlas):
    W, H = 96, 64
    ins = (INSET,) * 4
    specs = {
        "button-normal": dict(fill="paper3", rim_hi="paper4", rim="paper1", rim_lo="paper0", inner="paper2",
                              gloss="paper4", shade="paper2"),
        "button-hover": dict(fill="paper4", rim_hi="beer3", rim="beer2", rim_lo="beer1", inner="paper3",
                             gloss="road3", shade="paper3"),
        "button-pressed": dict(fill="paper2", rim_hi="paper3", rim="paper1", rim_lo="paper0", inner="paper1",
                               pressed=True),
        "button-disabled": dict(fill="stone1", rim_hi="stone2", rim="stone2", rim_lo="stone0", inner="stone0"),
        "button-active": dict(fill="beer2", rim_hi="beer4", rim="beer3", rim_lo="beer0", inner="beer1",
                              gloss="beer3", shade="beer1"),
        "button-go": dict(fill="forest2", rim_hi="forest5", rim="forest4", rim_lo="forest0", inner="forest1",
                          gloss="forest3", shade="forest1"),
        "button-go-hover": dict(fill="forest3", rim_hi="paper4", rim="forest5", rim_lo="forest1", inner="forest2",
                                gloss="forest4", shade="forest2"),
        "button-danger": dict(fill="brick1", rim_hi="brick4", rim="brick3", rim_lo="brick0", inner="brick0",
                              gloss="brick2", shade="brick0"),
        "button-danger-hover": dict(fill="brick2", rim_hi="paper4", rim="brick4", rim_lo="brick0", inner="brick1",
                                    gloss="brick3", shade="brick1"),
    }
    for name, sp in specs.items():
        atlas.slice9(name, enamel_button(W, H, **sp), *ins)


def enamel_tabs(atlas: Atlas):
    """Tabs: open at the bottom (insets 12/12/12/4); the active tab is blue like the panel it opens into."""
    W, H = 96, 56
    ins = (INSET, INSET, INSET, 4)
    for name, kind in (("tab", "cream"), ("tab-hover", "hover"), ("tab-active", "blue")):
        HH = H + 16
        if kind == "blue":
            img = enamel_sign(W, HH, "river0", "paper2", "paper4", "paper1", glaze="river1")
        elif kind == "hover":
            img = enamel_button(W, HH, "paper4", "beer3", "beer2", "beer1", "paper3", gloss="road3")
        else:
            img = enamel_button(W, HH, "paper2", "paper3", "paper1", "paper0", "paper1", gloss="paper3")
        atlas.slice9(name, img.crop(0, 0, W, H), *ins)


def liste(atlas: Atlas):
    """The Liste (score sheet): a paper pad with a red binding strip on top and a red margin rule on the left."""
    W, H = 120, 120
    ins = (24, 22, 12, 12)
    img = framed(W, H, outer="ink1", r=4, bands=[(1, "paper4", "paper1")], fill="paper4",
                 tex=lambda im, core: im.fill(fibres(W, H, ins, 11, 30) & erode(core, 1), "paper3"), ins=ins)
    # binding
    bm = rrect_mask(W, H, 0, 0, W, 16, 4)
    img.fill(bm, "ink1")
    img.fill(erode(bm, 2), "brick1")
    img.fill(erode(bm, 2) & ~shift(erode(bm, 2), 0, 1), "brick3")
    img.fill(erode(bm, 2) & ~shift(erode(bm, 2), 0, -1), "brick0")
    # margin rule (double, red) inside the left inset
    img.rect(18, 16, 2, H - 18, "brick3")
    img.rect(21, 16, 1, H - 18, "brick4")
    atlas.slice9("liste", img, *ins)
    # a ruled line to tile horizontally under each row, and a column rule to tile vertically
    rl = Img(8, 2)
    rl.rect(0, 0, 8, 1, "river3")
    rl.rect(0, 1, 8, 1, "river4")
    atlas.add("liste-rule", rl, 0, 0)
    cl = Img(2, 8)
    cl.rect(0, 0, 1, 8, "paper1")
    cl.rect(1, 0, 1, 8, "paper2")
    atlas.add("liste-col", cl, 0, 0)


def gauges(atlas: Atlas):
    """Fuel gauge segment pieces (16×26 layout units) and the tick of a checkbox (20×20)."""
    W, H = 32, 52
    for name, fill, hi, lo in (("fuel-seg-on", "brick2", "brick4", "brick1"), ("fuel-seg-off", "ink2", "ink3", "ink1")):
        img = Img(W, H)
        m = rrect_mask(W, H, 0, 0, W, H, 3)
        img.fill(m, "ink0")
        core = erode(m, 2)
        img.fill(core, fill)
        img.fill(core & ~shift(core, 0, 5), hi)
        img.fill(core & ~shift(core, 0, -5), lo)
        if name == "fuel-seg-on":
            img.fill(core & ~shift(core, 3, 0) & shift(core, 0, 5) & shift(core, 0, -5), "brick3")
        atlas.add(name, img, 0, 0)
    v = V(40, 40)
    v.stroke([(7, 21), (16, 31), (33, 8)], 7)
    m = v.mask()
    img = Img(40, 40)
    img.fill(dilate(m, 2), "ink0")
    img.fill(m, "forest2")
    img.fill(m & ~shift(m, 1, 2), "forest4")
    atlas.add("checkbox-tick", img, 0, 0)


# ── cursors ────────────────────────────────────────────────────────────────────────────────────────────────

def cursor_paint(m, fill="paper4", shade="paper2", hi="road3", line="ink0", lw=3):
    img = Img(m.shape[1], m.shape[0])
    paint(img, m, fill, line=line, lw=lw, shade=shade, sd=3, hi=hi, hd=1)
    return img


def arrow() -> Img:
    v = V(36, 52)
    v.poly([(3, 2), (3, 38), (12, 30), (19, 46), (26, 43), (19, 28), (31, 28)])
    m = v.mask()
    img = Img(m.shape[1], m.shape[0])
    inner = paint(img, m, "paper4", line="ink0", lw=3, hi="road3", hd=1)
    sv = V(36, 52)
    sv.poly([(17, 28), (31, 28), (19, 28.5), (26, 43), (23, 44)])
    img.fill(sv.mask() & inner, "paper2")
    return img


def pointer() -> Img:
    """A pointing hand, index finger up, with a cuff (hotspot = fingertip)."""
    W, H = 40, 52
    img = Img(W, H)
    skin = dict(line="ink0", lw=3, shade="paper2", sd=3, hi="road3", hd=1)
    # cuff
    v = V(W, H)
    v.rrect(9, 41, 25, 10, 3)
    paint(img, v.mask(), "river2", line="ink0", lw=3, shade="river1", sd=2, hi="river3", hd=1)
    # palm
    v = V(W, H)
    v.rrect(8, 20, 27, 24, 7)
    paint(img, v.mask(), "paper4", **skin)
    # curled fingers (three knuckles on the right, each with its own contour)
    for x, y in ((28, 21), (31, 27), (32, 33)):
        v = V(W, H)
        v.rrect(x - 9, y - 4, 13, 9, 4)
        paint(img, v.mask(), "paper4", line="ink0", lw=2, shade="paper2", sd=2)
    # index finger
    v = V(W, H)
    v.rrect(12, 2, 11, 30, 5)
    paint(img, v.mask(), "paper4", line="ink0", lw=3, shade="paper2", sd=2, hi="road3", hd=1)
    # thumb, folded across the palm
    v = V(W, H)
    v.poly(Path(4, 27).C(4, 23, 9, 23, 12, 26).L(20, 33).C(22, 35, 20, 39, 17, 38).L(7, 33).C(4, 32, 4, 29, 4, 27).pts)
    paint(img, v.mask(), "paper4", line="ink0", lw=2, shade="paper2", sd=2)
    return img


def hourglass(phase: int) -> Img:
    W, H = 36, 48
    img = Img(W, H)
    v = V(W, H)
    v.poly([(8, 7), (28, 7), (28, 12), (20, 23), (20, 25), (28, 36), (28, 41), (8, 41), (8, 36), (16, 25), (16, 23),
            (8, 12)])
    glass = v.mask()
    paint(img, glass, "river5", line="ink0", lw=3, hi="road3", hd=1)
    # sand: top drains, bottom fills
    top_level = [10, 13, 16, 19][phase]
    bot_level = [38, 35, 32, 30][phase]
    sv = V(W, H)
    sv.rect(0, top_level, W, 24 - top_level)
    sv.rect(0, bot_level, W, 41 - bot_level)
    sv.rect(17, 22, 2, 16)
    sand = sv.mask() & erode(glass, 3)
    img.fill(sand, "beer2")
    img.fill(sand & ~shift(sand, -2, 0), "beer1")
    # wooden caps
    for y in (2, 39):
        cv = V(W, H)
        cv.rrect(4, y, 28, 7, 2)
        paint(img, cv.mask(), "wood3", line="ink0", lw=2, shade="wood2", sd=2, hi="wood5", hd=1)
    return img


def blocked() -> Img:
    W = 40
    v = V(W, W)
    v.circle(20, 20, 17)
    v.circle(20, 20, 11, on=False)
    v.stroke([(12, 28), (28, 12)], 6)
    m = v.mask()
    img = Img(W, W)
    img.fill(dilate(m, 2) & ~erode(V(W, W).circle(20, 20, 9).mask() & ~dilate(m, 0), 0) | (dilate(m, 2) & m), "ink0")
    img.fill(edge_out(m, 2), "ink0")
    img.fill(m, "brick2")
    img.fill(m & ~shift(m, 1, 1), "brick4")
    return img


def cursors(atlas: Atlas):
    atlas.group("cursors")
    atlas.add("cursor-arrow", arrow(), 4, 3)
    atlas.add("cursor-pointer", pointer(), 16, 4)
    frames = [hourglass(i) for i in range(4)]
    atlas.add("cursor-wait", frames[0], 18, 24)
    for i, f in enumerate(frames):
        atlas.add(f"cursor-wait-{i}", f, 18, 24)
    atlas.anim("cursor-wait", [f"cursor-wait-{i}" for i in range(4)], fps=3, loop=True)
    atlas.add("cursor-blocked", blocked(), 20, 20)


def build() -> Atlas:
    atlas = Atlas("ui", width=1024)
    atlas.group("enamel")
    enamel_panels(atlas)
    enamel_buttons(atlas)
    enamel_tabs(atlas)
    atlas.group("panels")
    panels(atlas)
    atlas.group("buttons")
    buttons(atlas)
    atlas.group("tabs")
    tabs(atlas)
    liste(atlas)
    gauges(atlas)
    cursors(atlas)
    return atlas
