#!/usr/bin/env python3
"""Contact sheet for any Krea candidates: raw render (reduced) | final at 1x | final at 3x (the in-game zoom: every
painted asset is drawn 3x on the 1920x1080 backing store). Each candidate is post-processed like finalize.py does
for its group (backgrounds `adventure`, figures/dogs/vehicles `cel`) unless --preset/--params override it.

  tools/.venv/bin/python art-src/sheet.py OUT.png [--title T] [--preset P] [--params JSON] CAND.png|GLOB ...

Relative OUT paths land in tools/shots/art/sheets/. Alpha finals are shown over the portrait panel colour (wood0).
"""
import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ART = Path(__file__).resolve().parent
ROOT = ART.parent
sys.path.insert(0, str(ROOT / "tools"))
sys.path.insert(0, str(ROOT / "tools" / "art"))
import finalize  # noqa: E402

PANEL = (61, 39, 22)


def font(sz):
    try:
        return ImageFont.truetype("DejaVuSans.ttf", sz)
    except OSError:
        return ImageFont.load_default()


def row(path, preset, params):
    rec = json.loads(path.with_suffix(".json").read_text())
    out, info, *_ = finalize.process(rec["group"], path, rec["size"], preset, params)
    with Image.open(path) as im:
        raw = im.convert("RGB")
    raw.thumbnail((out.width * 3, out.height * 3), Image.LANCZOS)
    tiles = [raw]
    for z in (1, 3):
        big = out.resize((out.width * z, out.height * z), Image.NEAREST).convert("RGBA")
        t = Image.new("RGBA", big.size, PANEL + (255,))
        t.alpha_composite(big)
        tiles.append(t.convert("RGB"))
    return tiles, f"{path.stem}   {rec['width']}x{rec['height']}  {rec.get('seconds')} s   final {out.width}x{out.height}" \
                  f"   colours {info.get('colors_used')}"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("out")
    ap.add_argument("--title", default="")
    ap.add_argument("--preset")
    ap.add_argument("--params")
    ap.add_argument("items", nargs="+")
    a = ap.parse_args()
    params = json.loads(a.params) if a.params else None
    paths = []
    for item in a.items:
        paths += sorted(Path().glob(item)) if any(c in item for c in "*?[") else [Path(item)]
    rows = [row(p, a.preset, params) for p in paths]
    pad, lab = 8, 18
    width = max(sum(t.width for t in tiles) + pad * (len(tiles) + 1) for tiles, _ in rows)
    top = 30 if a.title else 0
    height = top + sum(max(t.height for t in tiles) + lab + pad for tiles, _ in rows) + pad
    sheet = Image.new("RGB", (width, height), (24, 22, 20))
    d = ImageDraw.Draw(sheet)
    if a.title:
        d.text((pad, 6), a.title, fill=(240, 230, 205), font=font(18))
    y = top + pad
    for tiles, text in rows:
        d.text((pad, y), text, fill=(220, 214, 200), font=font(13))
        x = pad
        for t in tiles:
            sheet.paste(t, (x, y + lab))
            x += t.width + pad
        y += max(t.height for t in tiles) + lab + pad
    out = Path(a.out)
    if not out.is_absolute():
        out = ROOT / "tools" / "shots" / "art" / "sheets" / out
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(out.relative_to(ROOT) if out.is_relative_to(ROOT) else out, sheet.size)


if __name__ == "__main__":
    main()
