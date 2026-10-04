#!/usr/bin/env python3
"""compose.py: put our own vehicles into painted scenes (TTL's finding: Krea does not keep a vehicle's identity, so
scenes are painted without it, or with Krea's stand-in erased by a masked repaint, and the real camper is composited).

  camper_composed(width)   the camper (van/van pick) with a crosswise rear carrier (steel arm, wheel channel, post,
                           strut, tie-down straps, drawn here) and the motorcycle seen head-on (van/bike-front pick)
  camper_sprite(width)     = camper_composed, used for every scene and event panel
  composite(scene, sprite, x, ground_y, shadow=0.35)
                           sprite with its bottom centre at (x, ground_y) in scene pixels, plus a soft contact shadow

Anchors come from public/art/van/van.json ("rack": bike bottom-centre on the rack in van.webp pixels, measured on
the final; the bike is drawn over the camper's rear). Placements per scene live in art-src/picks.json ("camper": {"x", "ground", "width"} in
render pixels) and are applied by tools/art/finalize.py before the HD downscale.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
ART_SRC = ROOT / "art-src"
PUBLIC = ROOT / "public" / "art"
sys.path.insert(0, str(ROOT / "tools"))
sys.path.insert(0, str(ROOT / "tools" / "art"))
import hd  # noqa: E402


def _picks():
    return json.loads((ART_SRC / "picks.json").read_text())


def cutout(key, width):
    """HD cut-out of a pick at `width` px (trimmed canvas), from the full-resolution render."""
    group, aid = key.split("/")
    item = _picks()[key]
    with Image.open(ART_SRC / "cand" / group / aid / item["cand"]) as im:
        probe, info = hd.hd_cut(im, (4000, 4000), trim=True, pad=0, sharpen=0)
        h = round(probe.height * width / probe.width)
        out, _ = hd.hd_cut(im, (width, h + 2), trim=True, pad=0, **(item.get("params") or {}))
    return out


def van_meta():
    p = PUBLIC / "van" / "van.json"
    return json.loads(p.read_text()) if p.exists() else {}


# ── the composed camper: camper + crosswise rear carrier + the motorcycle seen end-on ─────────────────────────────
# Real 1970s/80s motorhome carriers (Motorradträger am Heck) carry the bike crosswise on a steel platform bolted to
# the chassis behind the rear wall, at bumper height, with a strut to the rear wall and tie-down straps. In our pure
# side view (camper facing right, rear on the left) the bike is therefore seen head-on, just behind the rear wall.
# Geometry in van.webp base pixels (360 px wide, 2x density; the camper is ~6.2 m = 356 px, i.e. ~57 px per metre).
CARRIER = {
    "cut": [[-40, 55, 27, 118], [-40, 143, 36, 175]],   # Krea's painted rear ladder and step: [x0, y0, x1, y1]
    "bike_cx": 0.0, "bike_bottom": 151.0, "bike_h": 74.0,  # end-on bike: centre x, tyre contact y, height incl. mirrors
    "arm": [-31, 151, 40, 157],                           # near carrier arm (bumper height ~0.55 m): x0, y0, x1, y1
    "channel": [-6, 145, 6, 152],                         # end profile of the crosswise wheel channel (U)
    "post": [-32, 118, -28, 152],                         # outer post of the carrier
    "strut": [[-30, 152], [29, 110]],                     # diagonal strut to the rear wall (behind the bike)
    "straps": [[[-18, 90], [-29, 150]], [[19, 90], [27, 150]]],  # handlebar grips -> outer post / arm root
    "steel": (79, 75, 71), "steel_hi": (163, 157, 148), "strap": (168, 104, 15), "ink": (21, 17, 14),
}


def _carrier_layers(k, ox, oy, size):
    """Back (strut) and front (arm, channel, post, straps) layers drawn at scale k (px per base px), offset (ox, oy)."""
    from PIL import ImageDraw
    c = CARRIER
    P = lambda x, y: (ox + x * k, oy + y * k)      # noqa: E731
    lw = max(2, round(1.3 * k))
    back = Image.new("RGBA", size, (0, 0, 0, 0))
    front = Image.new("RGBA", size, (0, 0, 0, 0))
    db, df = ImageDraw.Draw(back), ImageDraw.Draw(front)
    ink = c["ink"] + (255,)
    # strut: a steel tube with an ink contour
    (x0, y0), (x1, y1) = c["strut"]
    db.line([P(x0, y0), P(x1, y1)], fill=ink, width=round(3.4 * k))
    db.line([P(x0, y0), P(x1, y1)], fill=c["steel"] + (255,), width=round(1.8 * k))

    def bar(r, fill, hi=True):
        x0, y0, x1, y1 = r
        df.rectangle([P(x0, y0), P(x1, y1)], fill=fill + (255,), outline=ink, width=lw)
        if hi:   # one highlight along the top edge (cel: one shade + one highlight)
            df.line([P(x0 + 1, y0 + 1.2), P(x1 - 1, y0 + 1.2)], fill=c["steel_hi"] + (255,), width=max(1, round(0.9 * k)))
    bar(c["post"], c["steel"])
    bar(c["arm"], c["steel"])
    # the U channel's end profile the tyre stands in
    x0, y0, x1, y1 = c["channel"]
    df.rectangle([P(x0, y0), P(x1, y1)], fill=c["steel"] + (255,), outline=ink, width=lw)
    df.rectangle([P(x0 + 2.2, y0 - 0.5), P(x1 - 2.2, y1 - 2.0)], fill=c["ink"] + (255,))
    # bolts where the arm meets the chassis
    for bx in (32.5, 37.0):
        cx, cy = P(bx, 154)
        r = 0.9 * k
        df.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c["steel_hi"] + (255,), outline=ink, width=max(1, lw // 2))
    # tie-down straps (orange webbing with an ink contour)
    for (a, b) in c["straps"]:
        df.line([P(*a), P(*b)], fill=ink, width=round(2.0 * k))
        df.line([P(*a), P(*b)], fill=c["strap"] + (255,), width=round(0.9 * k))
    return back, front


def camper_composed(width, work=4):
    """The camper (van/van pick, its painted rear ladder and step removed) with the crosswise carrier and the
    motorcycle seen head-on (van/bike-front pick). `width` = the camper body width in px (the van's 360 base px).
    Built at `work` x the target (supersampled), then reduced with premultiplied Lanczos. Returns (RGBA, info) with
    info["van"] = the van's top-left offset in the result and info["ground"] = the wheels' contact line."""
    c = CARRIER
    W = width * work
    k = W / 360.0
    van = cutout("van/van", W)
    a = np.asarray(van).copy()
    for x0, y0, x1, y1 in c["cut"]:
        xa, xb = max(0, round(x0 * k)), max(0, round(x1 * k))
        a[round(y0 * k):round(y1 * k), xa:xb, 3] = 0
    van = Image.fromarray(a, "RGBA")
    bh = c["bike_h"] * k
    probe = cutout("van/bike-front", 400)
    bw = bh * probe.width / probe.height
    bike = cutout("van/bike-front", round(bw))
    left = min(c["arm"][0], c["post"][0], c["bike_cx"] - bike.width / k / 2) - 3
    ox = round(-left * k)
    oy = 0
    size = (ox + van.width, van.height)
    back, front = _carrier_layers(k, ox, oy, size)
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    out.alpha_composite(back)
    out.alpha_composite(van, (ox, oy))
    out.alpha_composite(bike, (round(ox + c["bike_cx"] * k - bike.width / 2), round(oy + c["bike_bottom"] * k - bike.height)))
    out.alpha_composite(front)
    # reduce (premultiplied, so no dark fringe)
    tw = round(size[0] / work)
    th = round(size[1] / work)
    small = out.convert("RGBa").resize((tw, th), Image.LANCZOS).convert("RGBA")
    info = {"van": [round(ox / work), round(oy / work)], "ground": round(187 * width / 360 + oy / work),
            "van_width": width, "carrier": {kk: v for kk, v in c.items() if kk not in ("steel", "steel_hi", "strap", "ink")}}
    return small, info


def camper_sprite(width):
    """The sprite pasted into scenes: the composed camper (camper_composed) at `width` px camper body width."""
    return camper_composed(int(width))


def camper_sprite_side(width):
    """RETIRED (4 Oct 2026, the user: the bike was not mounted like on a real carrier): camper + the side-view bike
    over the rear wall (public/art/van/van.json "rack"). Kept for the record of the earlier finals."""
    meta = van_meta()
    van = cutout("van/van", width)
    k = width / meta["van"]["w"]
    rack = meta["rack"]
    bike = cutout("van/bike", round(meta["bike"]["w"] * rack["bikeScale"] * k))
    bx = round(rack["x"] * k - bike.width / 2)
    by = round(rack["y"] * k - bike.height)
    left, top = min(0, bx), min(0, by)
    W = max(van.width, bx + bike.width) - left
    H = max(van.height, by + bike.height) - top
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.alpha_composite(van, (-left, -top))
    out.alpha_composite(bike, (bx - left, by - top))
    return out, {"van_offset": [-left, -top]}


def composite(scene, sprite, x, ground_y, shadow=0.35):
    """Sprite with its bottom centre at (x, ground_y); a soft elliptical contact shadow under it."""
    scene = scene.convert("RGBA")
    w, h = sprite.size
    if shadow:
        sh = Image.new("L", scene.size, 0)
        from PIL import ImageDraw
        ImageDraw.Draw(sh).ellipse((x - w * 0.52, ground_y - h * 0.06, x + w * 0.52, ground_y + h * 0.06), fill=255)
        sh = sh.filter(ImageFilter.GaussianBlur(max(4, h * 0.04)))
        dark = Image.new("RGBA", scene.size, (20, 14, 10, 255))
        scene = Image.composite(dark, scene, sh.point(lambda v: int(v * shadow)))
    scene.alpha_composite(sprite, (round(x - w / 2), round(ground_y - h)))
    return scene.convert("RGB")


def apply_camper(img, spec):
    """img (render) + picks.json "camper" spec {"x", "ground", "width"} -> composited render."""
    sprite, _ = camper_sprite(int(spec["width"]))
    if spec.get("flip"):
        sprite = sprite.transpose(Image.FLIP_LEFT_RIGHT)
    if spec.get("tint"):   # match the scene's light: multiply RGB (e.g. night blue [0.6, 0.62, 0.85])
        a = np.asarray(sprite).astype(np.float64)
        a[..., :3] *= np.array(spec["tint"])[None, None]
        sprite = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA")
    return composite(img, sprite, spec["x"], spec["ground"], spec.get("shadow", 0.35))
