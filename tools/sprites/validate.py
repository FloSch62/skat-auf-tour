#!/usr/bin/env python3
"""Validate every atlas in public/sprites/ against the atlas contract (docs/notes-sprites.md).

Checks: JSON shape and "scale": 2; image exists, is RGBA and matches `size`; every frame inside the image; anchors
sane; anim frames exist; 9-slice insets fit; every opaque pixel is a colour of the Leitpalette (plus the recorded
in-between shades of palette-hd.json); semi-transparent pixels only in the frames listed in ALPHA_OK; frame sizes;
every frame the game asks for is present (ids parsed from src/game/ids.ts and the ui fallbacks in src/core/gfx.ts).
Exit code 1 on any error.
"""
import fnmatch
import json
import os
import re
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
SPR = os.path.join(ROOT, "public", "sprites")
PAL = json.load(open(os.path.join(ROOT, "public", "palette.json")))
HDPAL = json.load(open(os.path.join(HERE, "palette-hd.json")))
PALSET = {h.lower() for r in PAL["ramps"].values() for h in r} | {h.lower() for h in HDPAL["extended"].values()}
PAL_RGB = {tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in PALSET}

ATLASES = ["cards", "ui", "icons", "drinks", "words", "chess", "items", "van", "fx", "sudoku"]

# frames whose pixels may be semi-transparent on purpose (shadows, veils, glows, board marks)
ALPHA_OK = {
    "cards": ["shadow*", "hl-playable*", "veil-locked*"],
    "chess": ["mark-target", "mark-capture", "mark-last", "mark-check"],
    "fx": ["card-glow*", "sparkle*", "shadow*", "rain*", "smoke*", "glow*"],
    "ui": ["shadow*"],
    "van": ["shadow*"],
}


def ts_list(src, const):
    m = re.search(rf"export const {const}\s*=\s*\[(.*?)\]", src, re.S)
    return re.findall(r'"([^"]+)"', m.group(1)) if m else []


def required():
    ids = open(os.path.join(ROOT, "src", "game", "ids.ts")).read()
    gfx = open(os.path.join(ROOT, "src", "core", "gfx.ts")).read()
    suits, ranks, decks = ts_list(ids, "SUITS"), ts_list(ids, "RANKS"), ts_list(ids, "DECKS")
    req = {a: [] for a in ATLASES}
    for d in decks:
        for s in suits:
            for r in ranks:
                req["cards"] += [f"{d}-{s}-{r}", f"{d}-{s}-{r}-s"]
    for n in (1, 2, 3):
        req["cards"] += [f"back-{n}", f"back-{n}-s"]
    for o in ("shadow", "hl-playable", "hl-selected", "veil-locked"):
        req["cards"] += [o, f"{o}-s"]
    fb = re.search(r"const FALLBACK[^=]*=\s*\{(.*?)\n\};", gfx, re.S)
    req["ui"] += re.findall(r'^\s*"?([a-z-]+)"?\s*:', fb.group(1), re.M)
    req["ui"] += ["cursor-arrow", "cursor-pointer", "cursor-wait", "button-active", "tab", "tab-hover", "tab-active"]
    for k in ts_list(ids, "STATION_KINDS"):
        req["icons"] += [f"station-{k}-{st}" for st in ("normal", "reachable", "visited", "locked")]
    for d in decks:
        req["icons"] += [f"suit-{d}-{s}" for s in suits]
    req["icons"] += ["game-grand", "game-null", "game-ramsch", "fuel", "mark", "settings", "help", "book", "home",
                     "trophy", "check", "cross", "lock", "arrow-left", "arrow-right", "speaker", "music", "dog",
                     "beer-mat", "souvenir", "upgrade", "detour", "fuel-sm", "mark-sm"]
    req["items"] += ts_list(ids, "SOUVENIRS") + ts_list(ids, "BEER_MATS") + ts_list(ids, "UPGRADES") + ts_list(ids, "DOGS")
    req["items"] += [f"trophy-{t}" for t in ("enztal", "muehlacker", "schwarzwald", "stuttgart", "wander")]
    req["chess"] += [f"{c}-{p}" for c in "wb" for p in "KDTLSB"] + ["mark-target", "mark-capture", "mark-selected",
                                                                     "mark-last"]
    req["van"] += ["marker-camper", "marker-bike", "marker-rig", "camper", "bike", "rig"]
    req["words"] += [f"{w}-{s}" for w in ("klatsch", "rumms", "roeoeoehr", "zisch", "gluck", "tacker", "prost",
                                          "krach", "wuff", "klirr", "zack", "plopp", "brumm", "hui", "schepper")
                     for s in (0, 1, 2)]
    req["fx"] += ["stamp", "card-glow"]
    return req


def size_rules():
    return {
        "cards": [("hl-*", None), ("*-s", (72, 108)), ("back-?", (144, 216)), ("french-*", (144, 216)), ("german-*", (144, 216)),
                  ("tournament-*", (144, 216))],
        "icons": [("*-sm", (32, 32)), ("suit-*", (48, 48)), ("station-*", (64, 64))],
        "items": [("*", (96, 96))],
        "chess": [("[wb]-?", (104, 104))],
    }


def check(name, req, rules):
    errs, warns = [], []
    jp = os.path.join(SPR, f"{name}.json")
    if not os.path.exists(jp):
        return [f"{name}: missing {jp}"], warns
    doc = json.load(open(jp))
    if doc.get("scale") != 2:
        errs.append(f"{name}: top-level \"scale\" must be 2, got {doc.get('scale')}")
    ip = os.path.join(SPR, doc.get("image", ""))
    if doc.get("image") != f"{name}.png" or not os.path.exists(ip):
        errs.append(f"{name}: bad image field {doc.get('image')}")
        return errs, warns
    im = Image.open(ip)
    if im.mode != "RGBA":
        errs.append(f"{name}: image mode {im.mode}, expected RGBA")
        im = im.convert("RGBA")
    a = np.asarray(im)
    H, W = a.shape[:2]
    if "size" in doc and (doc["size"]["w"] != W or doc["size"]["h"] != H):
        errs.append(f"{name}: size field {doc['size']} != image {W}x{H}")
    alpha = a[..., 3]
    op = a[alpha > 0][:, :3]
    cols = {tuple(int(v) for v in c) for c in np.unique(op, axis=0)} if len(op) else set()
    off = cols - PAL_RGB
    if off:
        errs.append(f"{name}: {len(off)} colours outside the palette e.g. {sorted(off)[:5]}")
    frames = doc.get("frames", {})
    if not frames:
        errs.append(f"{name}: no frames")
    semi = (alpha != 0) & (alpha != 255)
    allowed = np.zeros_like(semi)
    for fn, f in frames.items():
        for k in ("x", "y", "w", "h", "ax", "ay"):
            if not isinstance(f.get(k), int):
                errs.append(f"{name}: frame {fn} missing int {k}")
                break
        else:
            if f["x"] < 0 or f["y"] < 0 or f["w"] <= 0 or f["h"] <= 0 or f["x"] + f["w"] > W or f["y"] + f["h"] > H:
                errs.append(f"{name}: frame {fn} out of bounds {f}")
                continue
            if not f.get("anchoredTo") and not (-f["w"] <= f["ax"] <= 2 * f["w"] and -f["h"] <= f["ay"] <= 2 * f["h"]):
                warns.append(f"{name}: frame {fn} anchor far outside frame")
            if (fn != fn.lower() and name != "chess") or " " in fn:
                errs.append(f"{name}: frame name not lowercase kebab: {fn}")
            sub = alpha[f["y"]:f["y"] + f["h"], f["x"]:f["x"] + f["w"]]
            if not sub.any():
                warns.append(f"{name}: frame {fn} is fully transparent")
            if any(fnmatch.fnmatch(fn, p) for p in ALPHA_OK.get(name, [])):
                allowed[f["y"]:f["y"] + f["h"], f["x"]:f["x"] + f["w"]] = True
            for pat, exp in rules.get(name, []):
                if fnmatch.fnmatch(fn, pat):
                    if exp and (f["w"], f["h"]) != exp:
                        ew, eh = exp
                        errs.append(f"{name}: frame {fn} is {f['w']}x{f['h']}, expected {ew}x{eh}")
                    break
    bad = np.count_nonzero(semi & ~allowed)
    if bad:
        ys, xs = np.nonzero(semi & ~allowed)
        where = [fn for fn, f in frames.items() if f["x"] <= xs[0] < f["x"] + f["w"] and f["y"] <= ys[0] < f["y"] + f["h"]]
        errs.append(f"{name}: {bad} semi-transparent pixels outside the ALPHA_OK frames (e.g. in {where[:3]})")
    for an, anim in doc.get("anims", {}).items():
        if not anim.get("frames"):
            errs.append(f"{name}: anim {an} has no frames")
        for fr in anim.get("frames", []):
            if fr not in frames:
                errs.append(f"{name}: anim {an} references missing frame {fr}")
        if not isinstance(anim.get("fps"), (int, float)) or anim["fps"] <= 0:
            errs.append(f"{name}: anim {an} bad fps")
        if not isinstance(anim.get("loop"), bool):
            errs.append(f"{name}: anim {an} bad loop")
    for sn, s in doc.get("slices", {}).items():
        if s["x"] + s["w"] > W or s["y"] + s["h"] > H:
            errs.append(f"{name}: slice {sn} out of bounds")
        if s["l"] + s["r"] >= s["w"] or s["t"] + s["b"] >= s["h"]:
            errs.append(f"{name}: slice {sn} insets too large")
        if sn not in frames:
            warns.append(f"{name}: slice {sn} has no matching frame")
    missing = [r for r in req.get(name, []) if r not in frames and r not in doc.get("slices", {})]
    if missing:
        errs.append(f"{name}: {len(missing)} required frames missing: {missing[:12]}")
    return errs, warns


def main(argv):
    req = required()
    rules = size_rules()
    names = argv or ATLASES
    all_errs = []
    for n in names:
        errs, warns = check(n, req, rules)
        jp = os.path.join(SPR, f"{n}.json")
        doc = json.load(open(jp)) if os.path.exists(jp) else {}
        status = "OK " if not errs else "ERR"
        print(f"{status} {n:8s} frames={len(doc.get('frames', {})):4d} anims={len(doc.get('anims', {})):3d} "
              f"slices={len(doc.get('slices', {})):3d} warnings={len(warns)}")
        for w in warns[:8]:
            print("   warn:", w)
        if len(warns) > 8:
            print(f"   ... {len(warns) - 8} more warnings")
        for e in errs[:30]:
            print("   ERROR:", e)
        all_errs += errs
    sys.exit(1 if all_errs else 0)


if __name__ == "__main__":
    main(sys.argv[1:])
