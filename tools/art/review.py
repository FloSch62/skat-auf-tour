#!/usr/bin/env python3
"""Production review: candidate sheets for picking, and finalising the picks (HD painted recipe).

  tools/.venv/bin/python tools/art/review.py sheet GROUP [--ids a,b] [--per 2]   # tools/shots/art/prod/<group>-<n>.png
  tools/.venv/bin/python tools/art/review.py final [KEY ...]                    # picks (art-src/picks.json) -> public/art
  tools/.venv/bin/python tools/art/review.py zoom KEY                           # pick's top 60 % at full res (lettering)
  tools/.venv/bin/python tools/art/review.py fixmask KEY ...                    # retouch rects -> repaint mask (Krea inpaint)

Backgrounds (inns, bg, maps, events) show every candidate of a motif side by side at 960 px wide; cut-outs show
the HD final of every candidate on the portrait-panel brown and on paper, at 1:1 (2x density, as on a 1080p screen).
`art-src/picks.json`: {"<group>/<id>": {"cand": "<file in cand/<group>/<id>/>", "note": "..."}}.
"""
import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
ART_SRC = ROOT / "art-src"
OUT = ROOT / "tools" / "shots" / "art" / "prod"
sys.path.insert(0, str(ROOT / "tools" / "art"))
sys.path.insert(0, str(ROOT / "tools"))
import finalize  # noqa: E402

SCENE_GROUPS = {"inns", "bg", "maps", "events"}
WOOD, PAPER = (61, 39, 22), (241, 230, 198)
PICKS = ART_SRC / "picks.json"


def font(sz):
    try:
        return ImageFont.truetype("DejaVuSans.ttf", sz)
    except OSError:
        return ImageFont.load_default()


def cands(key, versions=None):
    group, aid = key.split("/")
    out = []
    for p in sorted((ART_SRC / "cand" / group / aid).glob(f"{aid}-*.png")):
        rec = json.loads(p.with_suffix(".json").read_text())
        if versions is None or rec["version"] in versions:
            out.append((p, rec))
    return out


def motif_tiles(key, versions):
    group, aid = key.split("/")
    tiles = []
    for p, rec in cands(key, versions):
        label = f"{p.stem}  ({rec.get('seconds')} s)"
        if group in SCENE_GROUPS:
            with Image.open(p) as im:
                t = im.convert("RGB")
                t.thumbnail((960, 540), Image.LANCZOS)
            tiles.append((t, label))
        else:
            out, info, *_ = finalize.process_hd(group, aid, p)
            w, h = out.size
            t = Image.new("RGB", (w * 2 + 12, h), (24, 22, 20))
            for k, bg in enumerate((WOOD, PAPER)):
                b = Image.new("RGBA", (w, h), bg + (255,))
                b.alpha_composite(out)
                t.paste(b.convert("RGB"), (k * (w + 12), 0))
            tiles.append((t, label))
    return tiles


def cmd_sheet(group, ids, per, versions):
    if not ids:
        ids = sorted(d.name for d in (ART_SRC / "cand" / group).iterdir() if d.is_dir())
    keys = [f"{group}/{i}" for i in ids]
    pad, lab = 10, 22
    for n in range(0, len(keys), per):
        rows = []
        for key in keys[n:n + per]:
            tiles = motif_tiles(key, versions)
            if tiles:
                rows.append((key, tiles))
        if not rows:
            continue
        W = max(sum(t.width + pad for t, _ in tiles) + pad for _, tiles in rows)
        H = sum(max(t.height for t, _ in tiles) + 2 * lab + pad for _, tiles in rows) + pad
        sheet = Image.new("RGB", (W, H), (24, 22, 20))
        d = ImageDraw.Draw(sheet)
        y = pad
        for key, tiles in rows:
            d.text((pad, y), key, fill=(250, 220, 120), font=font(16))
            x = pad
            for t, label in tiles:
                d.text((x, y + lab), label, fill=(220, 214, 200), font=font(13))
                sheet.paste(t, (x, y + 2 * lab))
                x += t.width + pad
            y += max(t.height for t, _ in tiles) + 2 * lab + pad
        dest = OUT / f"{group}-{n // per + 1}.png"
        dest.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(dest)
        print(dest.relative_to(ROOT), sheet.size)


def load_picks():
    return json.loads(PICKS.read_text()) if PICKS.exists() else {}


def cmd_final(keys):
    picks = load_picks()
    for key in keys or sorted(picks):
        item = picks[key]
        group, aid = key.split("/")
        cand = ART_SRC / "cand" / group / aid / item["cand"]
        finalize.finalize(key, cand, overrides=item.get("params"), note=item.get("note"))


def cmd_zoom(key):
    item = load_picks()[key]
    group, aid = key.split("/")
    with Image.open(ART_SRC / "cand" / group / aid / item["cand"]) as im:
        src = im.convert("RGB")
    W, H = src.size
    top = src.crop((0, 0, W, int(H * 0.62)))
    top.thumbnail((1920, 1080), Image.LANCZOS)
    dest = OUT / "zoom" / f"{group}-{aid}.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    top.save(dest)
    print(dest.relative_to(ROOT), top.size)


def cmd_fixmask(key):
    """art-src/init/<group>-<id>-fixmask.png: the pick's `retouch` rects (grown by 12 px, feathered 8 px) as a
    repaint mask at render size, for specs `<group>/<id>:fix` (masked Krea inpaint of the lettering spots)."""
    from PIL import ImageDraw, ImageFilter
    item = load_picks()[key]
    group, aid = key.split("/")
    with Image.open(ART_SRC / "cand" / group / aid / item["cand"]) as im:
        size = im.size
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    for r in (item.get("params") or {}).get("retouch", []):
        x, y, w, h = r[:4]
        d.rectangle((x - 12, y - 12, x + w + 12, y + h + 12), fill=255)
    for x, y, w, h in item.get("erase", []):       # stand-in vehicles, magazine shelves: repainted with erase_prompt
        d.rectangle((x, y, x + w, y + h), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(8))
    dest = ART_SRC / "init" / f"{group}-{aid}-fixmask.png"
    m.save(dest)
    print(dest.relative_to(ROOT))


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["sheet", "final", "zoom", "fixmask"])
    ap.add_argument("args", nargs="*")
    ap.add_argument("--ids")
    ap.add_argument("--per", type=int, default=2)
    ap.add_argument("--versions", help="comma list, e.g. p,pL,adv")
    a = ap.parse_args()
    if a.cmd == "sheet":
        cmd_sheet(a.args[0], a.ids.split(",") if a.ids else None, a.per,
                  set(a.versions.split(",")) if a.versions else None)
    elif a.cmd == "final":
        cmd_final(a.args)
    elif a.cmd == "fixmask":
        for k in a.args:
            cmd_fixmask(k)
    else:
        for k in a.args:
            cmd_zoom(k)
