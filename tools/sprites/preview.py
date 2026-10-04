#!/usr/bin/env python3
"""Contact sheets of the atlases -> tools/shots/sprites/*.png (git-ignored).

    preview.py                          # every atlas, x1 (the 1080p view), felt background
    preview.py cards --filter french    # frames whose name contains 'french' (comma = OR)
    preview.py icons --scale 2 --bg paper
    preview.py ui --slices              # 9-slices tiled to several sizes
    preview.py cards --hand             # fanned hands of every deck as in the game (1:1)

Each cell shows the frame on a solid background with magenta anchor ticks on the cell border, labelled with its name.
"""
import argparse
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
SPR = os.path.join(ROOT, "public", "sprites")
OUT = os.path.join(ROOT, "tools", "shots", "sprites")

BGS = {
    "felt": (28, 77, 53),     # felt1
    "wood": (61, 39, 22),     # wood0
    "dark": (21, 17, 14),     # ink0
    "paper": (241, 230, 198), # paper3
    "mid": (163, 157, 148),   # stone2
}
FONT = ImageFont.load_default()


def load(name):
    doc = json.load(open(os.path.join(SPR, f"{name}.json")))
    img = Image.open(os.path.join(SPR, doc["image"])).convert("RGBA")
    return doc, img


def frame_img(img, f):
    return img.crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"]))


def sheet(name, filt=None, scale=1, bg="felt", maxw=1900, maxh=1800, tag=None):
    doc, img = load(name)
    frames = list(doc["frames"].items())
    if filt:
        keys = [k.strip() for k in filt.split(",")]
        frames = [(n, f) for n, f in frames if any(k in n for k in keys)]
    if not frames:
        print("no frames match", filt)
        return []
    bgc = BGS[bg]
    cells = []
    for n, f in frames:
        fi = frame_img(img, f).resize((f["w"] * scale, f["h"] * scale), Image.NEAREST)
        tw = int(FONT.getlength(n))
        cells.append((n, f, fi, max(fi.width, tw) + 8, fi.height + 18))
    pages, cur, x, y, row_h, width = [], [], 0, 0, 0, 0
    for c in cells:
        if x + c[3] > maxw and x > 0:
            y += row_h + 6
            x, row_h = 0, 0
        if y + c[4] > maxh and cur:
            pages.append((cur, width, y))
            cur, x, y, row_h, width = [], 0, 0, 0, 0
        cur.append((c, x, y))
        x += c[3] + 6
        width = max(width, x)
        row_h = max(row_h, c[4])
    pages.append((cur, width, y + row_h))
    os.makedirs(OUT, exist_ok=True)
    outs = []
    for pi, (cells_p, w, h) in enumerate(pages):
        sh = Image.new("RGBA", (w + 8, h + 8), (12, 10, 8, 255))
        d = ImageDraw.Draw(sh)
        for (n, f, fi, cw, ch), x, y in cells_p:
            x += 4
            y += 4
            d.rectangle((x, y, x + fi.width + 3, y + fi.height + 3), fill=bgc + (255,))
            sh.alpha_composite(fi, (x + 2, y + 2))
            axp = x + 2 + f["ax"] * scale
            ayp = y + 2 + f["ay"] * scale
            tick = (255, 0, 200, 255)
            d.line((axp, y, axp, y + 1), fill=tick)
            d.line((axp, y + fi.height + 2, axp, y + fi.height + 3), fill=tick)
            d.line((x, ayp, x + 1, ayp), fill=tick)
            d.line((x + fi.width + 2, ayp, x + fi.width + 3, ayp), fill=tick)
            d.text((x, y + fi.height + 6), n, fill=(241, 230, 198, 255), font=FONT)
        suffix = f"-{tag}" if tag else ""
        pg = f"-p{pi + 1}" if len(pages) > 1 else ""
        path = os.path.join(OUT, f"{name}{suffix}{pg}.png")
        sh.save(path)
        outs.append(path)
    return outs


def nine(src, s, W, H):
    l, t, r, b = s["l"], s["t"], s["r"], s["b"]
    sw, sh = src.width, src.height
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    cw, ch = sw - l - r, sh - t - b
    xs = [(0, l, 0, l, False), (l, sw - r, l, W - r, True), (sw - r, sw, W - r, W, False)]
    ys = [(0, t, 0, t, False), (t, sh - b, t, H - b, True), (sh - b, sh, H - b, H, False)]
    for sx0, sx1, dx0, dx1, tx in xs:
        for sy0, sy1, dy0, dy1, ty in ys:
            if sx1 <= sx0 or sy1 <= sy0 or dx1 <= dx0 or dy1 <= dy0:
                continue
            piece = src.crop((sx0, sy0, sx1, sy1))
            for yy in range(dy0, dy1, piece.height if ty else dy1 - dy0):
                for xx in range(dx0, dx1, piece.width if tx else dx1 - dx0):
                    p = piece.crop((0, 0, min(piece.width, dx1 - xx), min(piece.height, dy1 - yy)))
                    out.alpha_composite(p, (xx, yy))
    return out


def slices_sheet(name, bg="wood"):
    doc, img = load(name)
    sl = doc.get("slices", {})
    if not sl:
        return []
    sizes = [(88, 64), (200, 80), (360, 160)]
    rows = []
    for n, s in sl.items():
        src = img.crop((s["x"], s["y"], s["x"] + s["w"], s["y"] + s["h"]))
        rows.append((n, [nine(src, s, W, H) for W, H in sizes]))
    tw = sum(W for W, _ in sizes) + 16 * len(sizes) + 170
    th = sum(max(r.height for r in row) + 12 for _, row in rows) + 12
    sh = Image.new("RGBA", (tw, th), BGS[bg] + (255,))
    d = ImageDraw.Draw(sh)
    y = 8
    for n, row in rows:
        d.text((6, y + 4), n, fill=(241, 230, 198, 255), font=FONT)
        x = 170
        for r in row:
            sh.alpha_composite(r, (x, y))
            x += r.width + 16
        y += max(r.height for r in row) + 12
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f"{name}-slices.png")
    sh.save(path)
    return [path]


def hand_sheet():
    """Fanned ten-card hands of every deck on felt, 1:1 (= the game at 1080p), cards 60 px apart (30 units)."""
    doc, img = load("cards")
    fr = doc["frames"]
    hands = [["clubs-jack", "spades-jack", "hearts-ace", "hearts-10", "hearts-king", "spades-queen", "spades-9",
              "diamonds-8", "diamonds-7", "clubs-10"]]
    W, H = 60 * 9 + 144 + 80, 3 * (216 + 40) + 40 + 3 * (108 + 30)
    sh = Image.new("RGBA", (W, H), BGS["felt"] + (255,))
    y = 20
    for deck in ("french", "german", "tournament"):
        for i, c in enumerate(hands[0]):
            f = fr[f"{deck}-{c}"]
            x = 40 + i * 60
            sh.alpha_composite(frame_img(img, fr["shadow"]), (x + 4, y + 6))
            sh.alpha_composite(frame_img(img, f), (x, y - (16 if i in (2, 3) else 0)))
        y += 216 + 40
    for deck in ("french", "german", "tournament"):
        for i, c in enumerate(hands[0]):
            f = fr[f"{deck}-{c}-s"]
            x = 40 + i * 36
            sh.alpha_composite(frame_img(img, fr["shadow-s"]), (x + 2, y + 3))
            sh.alpha_composite(frame_img(img, f), (x, y))
        y += 108 + 30
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, "cards-hand.png")
    sh.save(path)
    return [path]


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="*")
    ap.add_argument("--filter")
    ap.add_argument("--scale", type=int, default=1)
    ap.add_argument("--bg", default="felt", choices=list(BGS))
    ap.add_argument("--tag")
    ap.add_argument("--maxw", type=int, default=1900)
    ap.add_argument("--slices", action="store_true")
    ap.add_argument("--hand", action="store_true")
    a = ap.parse_args(argv)
    if a.hand:
        for o in hand_sheet():
            print(os.path.relpath(o))
        return
    names = a.names or sorted(f[:-5] for f in os.listdir(SPR) if f.endswith(".json"))
    for n in names:
        if a.slices:
            outs = slices_sheet(n, a.bg if a.bg != "felt" else "wood")
        else:
            outs = sheet(n, a.filter, a.scale, a.bg, a.maxw,
                         tag=a.tag or (a.filter.replace(",", "+") if a.filter else None))
        for o in outs:
            print(os.path.relpath(o))


if __name__ == "__main__":
    main(sys.argv[1:])
