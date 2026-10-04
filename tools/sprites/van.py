"""van atlas -> public/sprites/van.png/json: code fallback for the painted vehicles (contract §2, §4.12, §9, §10).

Side views facing right. Anchor of every vehicle frame: bottom centre on the ground line (ay = the row below the tyres).

- Map markers ≈ 40×24 layout units: `marker-camper` (cream alcove camper, orange-brown stripe, motorcycle on the rear
  rack), `marker-bike`, `marker-rig` (motorcycle with sidecar).
- `wheel-0..3` (anim `wheel`, 24×24 units) and `wheel-sm-0..3` (anim `wheel-sm`, 8×8 units): spoked wheels for
  rolling; `puff-0..4` (anim `puff`): a comic exhaust cloud.
- Large: `camper` ≈ 180×100 units, `bike` ≈ 80×52, `rig` ≈ 100×56. Extra keys (atlas px, relative to the frame's
  top-left): `wheels` [[x, y, r], …], `exhaust` [x, y], `dogWindow` [x, y] (where a dog head looks out),
  `namePlate` [x, y, w, h] (the profile's van name on the rear), and attachment points `roofBox`, `awning`,
  `auxTank`, `radio`, `fridge`.
- Upgrade overlays for the camper, anchored like the camper (draw them at the camper's x, y): `aux-tank`, `roof-box`,
  `awning`, `radio`, `fridge`, `dog-bed` (a dog looking out of the cab window); for the bike: `sidecar` (draw at
  the bike's x, y to turn it into a rig).
"""
from __future__ import annotations

import math

import numpy as np

from atlas import Atlas
from kit import Pen, Ink, catmull
from px import Img, V, arc, erode, dilate, shift, edge_in, tf, hash01
import motifs as M

K = 2  # atlas px per design unit (design units = layout units)


def spoked(r_px, phase, small=False) -> Img:
    S = int(2 * r_px + 4)
    img = Img(S, S)
    c = S / 2
    p = Pen(S, S, 1.0)
    ink = Ink(img, lw=1 if small else 2)
    ink.part(p.circle(c, c, r_px), "ink1", line="ink0")
    rim = p.circle(c, c, r_px * 0.68)
    ri = ink.part(rim, "stone3", hi="stone4", line="ink0" if small else "ink1", lw=1)
    n = 3 if small else 6
    for i in range(n):
        a = math.radians(phase + i * 360 / n)
        sp = p.stroke([(c, c), (c + r_px * 0.66 * math.cos(a), c + r_px * 0.66 * math.sin(a))],
                      1.2 if small else 2.0)
        img.fill(sp & ri, "stone1")
    img.fill(p.circle(c, c, max(1.2, r_px * 0.2)), "ink2")
    if not small:
        img.fill(p.circle(c, c, r_px * 0.1), "stone4")
    ink.finish(1 if small else 2)
    return img


def puff(i) -> Img:
    S = 40
    img = Img(S, S)
    p = Pen(S, S, 1.0)
    ink = Ink(img, lw=1)
    blobs = [
        [(20, 24, 5)],
        [(18, 23, 7), (25, 21, 5)],
        [(15, 22, 8), (25, 19, 7), (23, 27, 5)],
        [(12, 20, 7), (25, 16, 7), (24, 28, 6), (17, 29, 4)],
        [(9, 17, 4), (28, 12, 4), (27, 30, 3), (15, 31, 2.5)],
    ][i]
    m = np.zeros((S, S), bool)
    for x, y, r in blobs:
        m |= p.circle(x, y, r)
    ink.part(m, "stone4", shade="stone3", hi="road3", line="stone1", sd=2)
    return img


# ── large views ────────────────────────────────────────────────────────────────────────────────────────────

CAMPER_W, CAMPER_H = 180, 100
GROUND = 97


def camper_parts(p: Pen, ink: Ink, bike=True):
    """The camper in 180×100 design units (ground at y = 97)."""
    if bike:
        ink.part(p.rect(4, 66, 36, 3), "stone1", hi="stone3")
        ink.part(p.stroke([(10, 66), (12, 78), (40, 76)], 2.2), "stone1")
        sub = p.sub(-2, 32, 44)
        M.motorcycle(sub, ink)
    ink.part(p.rrect(36, 77, 10, 6, 2), "stone2", hi="stone3")
    box = p.rrect(38, 20, 104, 63, 5)
    ink.part(box, "paper3", shade="paper1", hi="road3", sd=4, hd=2)
    ink.part(p.rrect(64, 14, 18, 7, 2), "stone3", shade="stone2", hi="stone4")
    alc = p.spline([(126, 12), (166, 12), (175, 19), (177, 30), (171, 38), (126, 38)], closed=True, n=6)
    ink.part(alc, "paper3", shade="paper1", hi="road3", sd=4, hd=2)
    ink.part(p.rrect(156, 20, 12, 9, 3), "river4", hi="river5", line="ink1")
    cab = p.poly([(136, 37), (159, 37), (172, 56), (178, 60), (178, 84), (136, 84)])
    ink.part(cab, "paper3", shade="paper1", hi="road3", sd=4, hd=2)
    ink.part(p.poly([(152, 41), (159, 41), (170, 56), (152, 56)]), "river4", hi="river5", line="ink1")
    ink.part(p.rrect(139, 42, 11, 14, 2), "river3", hi="river4", line="ink1")
    ink.lines(p.rect(137.5, 40, 1.4, 42) | p.rect(151, 40, 1.4, 42), "paper1")
    ink.part(p.rrect(143, 61, 6, 2.5, 1), "stone2", lw=1)
    # stripe along box and cab
    stripe = (p.rect(38, 58, 140, 5) | p.rect(126, 33, 50, 3)) & ink.all & ~p.rect(0, 0, 38, 100)
    ink.img.fill(stripe & (ink.img.a >= 0) & ~ink.img.is_("river3", "river4", "river5", "ink1"), "beer0")
    ink.img.fill(p.rect(38, 63, 140, 2) & ink.all & ~p.rect(0, 0, 38, 100) & ~ink.img.is_("ink1"), "wood2")
    # windows with curtains
    for x, w in ((46, 24), (106, 24)):
        ink.part(p.rrect(x, 30, w, 17, 3), "river3", hi="river4", line="ink1")
        for cx in (x + 2, x + w - 6):
            ink.part(p.rect(cx, 31.5, 4, 14), "brick2", shade="brick1", lw=1)
    # door with a window and a step
    ink.part(p.rrect(78, 27, 20, 53, 3), "paper2", shade="paper1", hi="paper3")
    ink.part(p.rrect(82, 31, 12, 10, 2), "river3", hi="river4", line="ink1")
    ink.part(p.rrect(93, 54, 3, 6, 1), "stone2", lw=1)
    ink.part(p.rect(76, 82, 24, 3), "stone2", hi="stone3")
    # lights and bumpers
    ink.part(p.rrect(170, 78, 10, 6, 2), "stone3", shade="stone2", hi="stone4")
    ink.part(p.circle(175, 67, 3.2), "beer3", hi="road3", line="ink1")
    ink.part(p.rrect(39, 66, 4, 7, 1), "brick2", lw=1)
    ink.part(p.rect(42, 74, 98, 8), "ink2", hi="ink3")
    for x in (64, 156):
        ink.part(p.arc(x, 85, 14, 14, 180, 360, 3), "ink2")
    return [(64, 85, 12), (156, 85, 12)]


def camper_img(bike=True) -> tuple[Img, list]:
    img = Img(CAMPER_W * K, CAMPER_H * K)
    p = Pen(img.w, img.h, K)
    ink = Ink(img, lw=2)
    wheels = camper_parts(p, ink, bike)
    for x, y, r in wheels:
        M.wheel(p, ink, x, y, r)
    ink.finish(3)
    return img, [[x * K, y * K, r * K] for x, y, r in wheels]


BIKE_CANVAS = (120, 70)   # design units; the bike sits at sub(BIKE_X, BIKE_Y, 80)
BIKE_X, BIKE_Y = 2, 0


def bike_canvas(with_sidecar=False, bike=True):
    img = Img(BIKE_CANVAS[0] * K, BIKE_CANVAS[1] * K)
    p = Pen(img.w, img.h, K)
    ink = Ink(img, lw=2)
    if with_sidecar:
        sidecar_parts(p, ink, dx=BIKE_X)
    if bike:
        M.motorcycle(p.sub(BIKE_X, BIKE_Y, 80), ink)
    ink.finish(3)
    return img


def bike_img(sidecar=False):
    """Trimmed bike or rig and its anchor (bottom centre of the bike's wheels) in frame px."""
    img = bike_canvas(sidecar)
    x0, y0, x1, y1 = img.bbox()
    bare = bike_canvas(False)
    bx0, by0, bx1, by1 = bare.bbox()
    ax = (bx0 + bx1) // 2 - (x0 - 2)
    ay = by1 - (y0 - 2)
    return img.crop(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4), ax, ay, (x0 - 2, y0 - 2)


def sidecar_parts(p: Pen, ink: Ink, dx=0):
    """Sidecar body behind the bike (the far side), with its own wheel."""
    M.wheel(p, ink, 78 + dx, 46, 9)
    body = p.spline([(40 + dx, 36), (46 + dx, 26), (70 + dx, 23), (96 + dx, 27), (106 + dx, 33), (100 + dx, 40),
                     (60 + dx, 42)])
    ink.part(body, "river2", shade="river1", hi="river3", sd=3)
    ink.lines(p.stroke([(50 + dx, 32), (100 + dx, 32)], 1.4) & body, "paper3")
    ink.part(p.poly([(84 + dx, 25), (90 + dx, 14), (96 + dx, 15), (93 + dx, 26)]), "river5", hi="road3", line="ink1")
    ink.part(p.spline([(64 + dx, 25), (70 + dx, 19), (80 + dx, 20), (82 + dx, 25)]), "wood1", hi="wood3")


# ── overlays (anchored like the camper) ────────────────────────────────────────────────────────────────────

def overlay(fn) -> Img:
    img = Img(CAMPER_W * K, CAMPER_H * K)
    p = Pen(img.w, img.h, K)
    ink = Ink(img, lw=2)
    fn(p, ink)
    ink.finish(3)
    return img


def ov_roof_box(p, ink):
    for x in (66, 112):
        ink.part(p.rect(x, 15, 3, 6), "ink2")
    box = p.spline([(52, 16), (58, 6), (80, 3), (112, 3), (124, 8), (126, 16)], closed=True, n=6)
    ink.part(box, "ink3", shade="ink2", hi="ink5", sd=3)
    ink.lines(p.stroke([(56, 11), (124, 11)], 1.2) & box, "ink2")


def ov_aux_tank(p, ink):
    ink.part(p.rrect(110, 64, 22, 18, 3), "olive2", shade="olive1", hi="olive3")
    ink.lines(p.stroke([(113, 67), (129, 79)], 1.6) | p.stroke([(129, 67), (113, 79)], 1.6), "olive1")
    ink.part(p.rect(108, 70, 26, 3), "wood1", hi="wood3")


def ov_awning(p, ink):
    ink.part(p.rrect(40, 22, 84, 6, 3), "stone2", shade="stone1", hi="stone3")
    can = p.rect(42, 27, 80, 6)
    for i in range(10):
        can |= p.circle(46 + i * 8, 33, 4)
    inner = ink.part(can, "road3", line="ink1")
    yy, xx = np.indices(can.shape)
    ink.img.fill(inner & (((xx / K) // 8) % 2 == 0), "beer1")


def ov_radio(p, ink):
    ink.part(p.stroke([(158, 38), (164, 6)], 1.4), "stone2", line=None, lw=0)
    ink.part(p.circle(164, 6, 1.6), "stone3", line="ink1", lw=1)


def ov_fridge(p, ink):
    g = p.rrect(124, 44, 12, 10, 2)
    gi = ink.part(g, "stone3", shade="stone2")
    for y in (46.5, 49, 51.5):
        ink.lines(p.rect(126, y, 8, 1), "stone1")


def ov_dog(p, ink):
    sub = p.sub(138, 38, 18)
    M.dog_head(sub, ink)


def bike_sidecar() -> Img:
    return bike_canvas(True, bike=False)


# ── markers ────────────────────────────────────────────────────────────────────────────────────────────────

def marker(kind) -> Img:
    W, H = 80, 48
    img = Img(W, H)
    ink = Ink(img, lw=1)
    if kind == "camper":
        p = Pen(W, H, 1.0, 14, -10)
        M.camper(p, ink, bike=False)
        bp = Pen(W, H, 1.0, 0, 0).sub(0, 18, 26)
        ink.part(Pen(W, H).rect(4, 36, 16, 2), "stone1", lw=1)
        M.motorcycle(bp, ink)
    elif kind == "bike":
        p = Pen(W, H, 1.0).sub(10, -18, 64)
        M.motorcycle(p, ink)
    else:
        p = Pen(W, H, 1.0).sub(2, -12, 56)
        sidecar_parts(p, ink, dx=0)
        M.motorcycle(p, ink)
    ink.finish(2)
    return img


def build() -> Atlas:
    atlas = Atlas("van", width=1024)
    atlas.group("markers")
    for kind in ("camper", "bike", "rig"):
        m = marker(kind)
        bb = m.bbox()
        atlas.add(f"marker-{kind}", m, m.w // 2, bb[3])
    atlas.group("anims")
    for i in range(4):
        atlas.add(f"wheel-{i}", spoked(22, i * 15))
    atlas.anim("wheel", [f"wheel-{i}" for i in range(4)], fps=12, loop=True)
    for i in range(4):
        atlas.add(f"wheel-sm-{i}", spoked(7, i * 30, small=True))
    atlas.anim("wheel-sm", [f"wheel-sm-{i}" for i in range(4)], fps=12, loop=True)
    for i in range(5):
        atlas.add(f"puff-{i}", puff(i), 20, 24)
    atlas.anim("puff", [f"puff-{i}" for i in range(5)], fps=8, loop=False)
    atlas.group("vehicles")
    cam, wheels = camper_img()
    ax, ay = cam.w // 2, GROUND * K
    atlas.add("camper", cam, ax, ay, wheels=wheels, exhaust=[36 * K, 82 * K], dogWindow=[144 * K, 49 * K],
              namePlate=[44 * K, 66 * K, 30 * K, 7 * K], roofBox=[90 * K, 16 * K], awning=[82 * K, 25 * K],
              auxTank=[121 * K, 73 * K], radio=[160 * K, 38 * K], fridge=[130 * K, 49 * K])
    b, bax, bay, (box, boy) = bike_img()
    atlas.add("bike", b, bax, bay, exhaust=[round((BIKE_X + 5 * 1.25) * K - box), round((BIKE_Y + 40 * 1.25) * K - boy)])
    r, rax, ray, _ = bike_img(sidecar=True)
    atlas.add("rig", r, rax, ray)
    atlas.group("overlays")
    for name, fn in (("aux-tank", ov_aux_tank), ("roof-box", ov_roof_box), ("awning", ov_awning), ("radio", ov_radio),
                     ("fridge", ov_fridge), ("dog-bed", ov_dog)):
        o = overlay(fn)
        x0, y0, x1, y1 = o.bbox()
        atlas.add(name, o.crop(x0, y0, x1 - x0, y1 - y0), ax - x0, ay - y0, anchoredTo="camper")
    sc = bike_sidecar()
    x0, y0, x1, y1 = sc.bbox()
    # anchored like the bike frame: bike anchor in canvas px = (bax + box, bay + boy)
    atlas.add("sidecar", sc.crop(x0, y0, x1 - x0, y1 - y0), bax + box - x0, bay + boy - y0, anchoredTo="bike",
              drawBefore=True)
    return atlas
