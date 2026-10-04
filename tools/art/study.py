#!/usr/bin/env python3
"""Style study tool (contract §9): contact sheets of every study candidate, review copies of the picks, and the
colour-count comparison for the backgrounds.

  tools/.venv/bin/python tools/art/study.py sheets      # tools/shots/art/study/<group>-<id>.png (all candidates)
  tools/.venv/bin/python tools/art/study.py stage       # picks (art-src/study.json) -> public/art/_study/<v>/
  tools/.venv/bin/python tools/art/study.py colours     # tools/shots/art/study/colours-<v>.png (64/96/128/192)
  tools/.venv/bin/python tools/art/study.py all
  tools/.venv/bin/python tools/art/study.py layout      # art-src/init/inns-village-layout.png (needs Vite on :5191)

Candidates come from art-src/cand/<group>/<id>/ (versions adv/comic/film = variants a/b/c, '<head>L' = the same
prompt with the layout init). Post-processing as in finalize.py (backgrounds `adventure`, figures `cel`).
"""
import json
import sys
import time
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
ART_SRC = ROOT / "art-src"
OUT = ROOT / "tools" / "shots" / "art" / "study"
sys.path.insert(0, str(ROOT / "tools" / "art"))
sys.path.insert(0, str(ROOT / "tools"))
import finalize  # noqa: E402

MOTIFS = ["inns/village", "portraits/maurer", "dogs/shepherd", "van/van"]
HEAD = {"adv": "a", "comic": "b", "film": "c"}
WOOD = (61, 39, 22)        # wood0, the portrait panel
PAPER = (241, 230, 198)    # paper3


def font(sz):
    for name in ("DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, sz)
        except OSError:
            pass
    return ImageFont.load_default()


def candidates(key):
    group, aid = key.split("/")
    return sorted((ART_SRC / "cand" / group / aid).glob(f"{aid}-*.png"))


def version_of(path):
    rec = json.loads(path.with_suffix(".json").read_text())
    return rec["version"], rec


def on(bg, img, scale):
    big = img.resize((img.width * scale, img.height * scale), Image.NEAREST)
    t = Image.new("RGBA", big.size, bg + (255,))
    t.alpha_composite(big.convert("RGBA"))
    return t.convert("RGB")


def row_tiles(key, path, params=None):
    group = key.split("/")[0]
    rec = json.loads(path.with_suffix(".json").read_text())
    t0 = time.time()
    out, info, *_ = finalize.process(group, path, rec["size"], overrides=params)
    secs = time.time() - t0
    with Image.open(path) as im:
        src = im.convert("RGB")
    if group in ("inns", "bg", "maps", "events"):
        raw = src.resize((960, 540), Image.LANCZOS)
        full = out.resize((960, 540), Image.NEAREST)
        crop = out.crop((200, 70, 520, 250)).resize((960, 540), Image.NEAREST)   # the middle band at 3x
        tiles = [raw, full, crop]
        text = (f"{path.stem}   render {rec.get('seconds')} s   colours {info['colors_used']}   "
                f"speckle {info.get('singletons_detail')}   ink px {info.get('ink_pixels')}   post {secs:.1f} s")
    else:
        h = 360
        raw = src.copy()
        raw.thumbnail((h * src.width // src.height, h), Image.LANCZOS)
        s3 = on(WOOD, out, 3)
        tiles = [raw, s3, on(PAPER, out, 3), on(WOOD, out, 1)]
        text = (f"{path.stem}   render {rec.get('seconds')} s   final {out.width}x{out.height}   "
                f"colours {info['colors_used']}   post {secs:.1f} s")
    return tiles, text, rec, info


def sheet(rows, title, dest):
    pad, lab = 10, 22
    width = max(sum(t.width for t in tiles) + pad * (len(tiles) + 1) for tiles, _ in rows)
    height = 40 + sum(max(t.height for t in tiles) + lab + pad for tiles, _ in rows) + pad
    im = Image.new("RGB", (width, height), (24, 22, 20))
    d = ImageDraw.Draw(im)
    d.text((pad, 10), title, fill=(240, 230, 205), font=font(20))
    y = 40
    for tiles, text in rows:
        d.text((pad, y), text, fill=(225, 214, 190), font=font(15))
        x = pad
        for t in tiles:
            im.paste(t, (x, y + lab))
            x += t.width + pad
        y += max(t.height for t in tiles) + lab + pad
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest)
    print(dest.relative_to(ROOT), im.size)


def cmd_sheets():
    for key in MOTIFS:
        rows = []
        for path in candidates(key):
            ver, rec = version_of(path)
            head = ver.rstrip("L")
            tiles, text, *_ = row_tiles(key, path)
            tag = f"variant {HEAD.get(head, '?')} ({ver}{', layout init d=' + str(rec.get('denoise')) if rec.get('init') else ''})"
            rows.append((tiles, f"{tag}   {text}"))
        if rows:
            what = ("raw render | 640x360 at 1.5x | middle band at 3x (in-game zoom)" if key.startswith("inns")
                    else "raw render | final 3x on the portrait panel | 3x on paper | 1x")
            sheet(rows, f"{key}: {what}", OUT / f"{key.replace('/', '-')}.png")


def load_picks():
    return json.loads((ART_SRC / "study.json").read_text())


def cmd_stage():
    picks = load_picks()
    for v, items in picks["variants"].items():
        for key, item in items.items():
            cand = ART_SRC / "cand" / key / item["cand"] if "/" not in item["cand"] else ART_SRC / item["cand"]
            finalize.finalize(key, cand, overrides=item.get("params"), note=item.get("note"), study=v)


def cmd_colours():
    picks = load_picks()
    for v, items in picks["variants"].items():
        item = items.get("inns/village")
        if not item:
            continue
        path = ART_SRC / "cand" / "inns/village" / item["cand"]
        rows = []
        for k in (48, 96, 128, 192):
            tiles, text, *_ = row_tiles("inns/village", path, dict(item.get("params") or {}, colors=k))
            rows.append((tiles[1:], f"colours {k}:   {text}"))
        sheet(rows, f"inns/village variant {v}: colour count (640x360 at 1.5x | middle band at 3x)",
              OUT / f"colours-{v}.png")


def cmd_layout(art_id="inns/village"):
    """Export a code painting (src/screens/paint, chess/park.ts, sudoku/kiosk.ts) as a 640x360 layout init for
    Krea: screenshot of /?dev=paint&id=<id> at 1920x1080 (3 backing px per art px), nearest-reduced to 640x360."""
    import subprocess
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        shot = Path(tmp) / "layout.png"
        subprocess.run(["node", str(ROOT / "tools" / "shot.mjs"), f"/?dev=paint&id={art_id}", str(shot),
                        "2500", "1920", "1080"], check=True, cwd=ROOT)
        dest = ART_SRC / "init" / f"{art_id.replace('/', '-')}-layout.png"
        dest.parent.mkdir(parents=True, exist_ok=True)
        Image.open(shot).convert("RGB").resize((640, 360), Image.NEAREST).save(dest)
    print(dest.relative_to(ROOT))


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    if what == "layout":
        for art_id in sys.argv[2:] or ["inns/village"]:
            cmd_layout(art_id)
        sys.exit(0)
    if what in ("sheets", "all"):
        cmd_sheets()
    if what in ("stage", "all"):
        cmd_stage()
    if what in ("colours", "all"):
        cmd_colours()
