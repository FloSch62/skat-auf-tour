#!/usr/bin/env python3
"""Promote a picked Krea candidate to a final asset and record its provenance (contract §0.12).

  tools/.venv/bin/python tools/art/finalize.py GROUP/ID CANDIDATE.png [--params JSON] [--note "why"]
  tools/.venv/bin/python tools/art/finalize.py GROUP/ID CANDIDATE.png --pixel [--study V]     (legacy raster)

HD painted recipe (user decision 4 Oct 2026, default): tools/art/hd.py preset `scene` for inns/bg/maps (1920x1080)
and events (768x384), preset `cut` for portraits (288x288), dogs (288x288; poses 192x192), items (192x192),
trophies (192x256) and vehicles (camper <= 360x200, bike <= 160x110, rig <= 220x120, canvas trimmed). Writes
public/art/<group>/<id>.webp (lossy q88, alpha where needed), registers it in public/art/index.json
({"<art id>": "<file relative to public/art>"}, read by the asset loader) and records in art-src/manifest.json:
source candidate, prompt, seed, model, sampler settings, render size, init/refs, post-process tool + preset +
parameters, bytes, sha256, date.

--pixel: the style-study raster recipe (640x360 adventure raster / 96x96 cel, PNG; pixelscene.py `adventure`,
pixelize.py `cel`), kept for the study review copies (--study V -> public/art/_study/<V>/, manifest key "_study").
"""
import argparse
import datetime
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ART_SRC = ROOT / "art-src"
PUBLIC = ROOT / "public" / "art"
sys.path.insert(0, str(ROOT / "tools"))
sys.path.insert(0, str(ROOT / "tools" / "art"))
from pixelize import PRESETS as CEL_PRESETS, pixelize_cel  # noqa: E402
from pixelscene import PRESETS as SCENE_PRESETS, pixelscene  # noqa: E402
import hd  # noqa: E402

INDEX = PUBLIC / "index.json"
VAN_BOX = {"van": (360, 200), "bike": (160, 110), "rig": (220, 120), "bike-front": (80, 120)}


def hd_target(group, aid):
    """(final size, hd preset, per-group params) of the HD painted recipe."""
    if group in ("inns", "bg", "maps"):
        return (1920, 1080), "scene", {}
    if group == "events":
        return (768, 384), "scene", {}
    if group == "portraits":
        return (288, 288), "cut", {}
    if group == "dogs":
        return ((192, 192) if "-" in aid else (288, 288)), "cut", {}
    if group == "items":
        return (192, 192), "cut", {"anchor": "center", "pad": 4}
    if group == "trophies":
        return (192, 256), "cut", {"anchor": "bottom", "pad": 3}
    if group == "van":
        return VAN_BOX[aid], "cut", {"trim": True}
    raise KeyError(group)


def process_hd(group, aid, cand, overrides=None):
    size, preset, params = hd_target(group, aid)
    params = dict(params, **(overrides or {}))
    camper = params.pop("camper", None)
    clone = params.pop("clone", None)
    with Image.open(cand) as im:
        im = im.convert("RGB")
        for x, y, w, h, dx, dy in clone or []:   # cover a leftover with the painting from (dx, dy) away
            im.paste(im.crop((x + dx, y + dy, x + dx + w, y + dy + h)), (x, y))
        if camper:   # our own camper composited over the render (tools/art/compose.py), before the downscale
            import compose
            im = compose.apply_camper(im, camper)
        out, info = (hd.hd_scene if preset == "scene" else hd.hd_cut)(im, size, **params)
    for k, v in (("camper", camper), ("clone", clone)):
        if v:
            params[k] = v
            info.setdefault("params", {})[k] = v
    return out, info, "tools/art/hd.py", preset, params

# group -> (post-process preset, final size or None = from the candidate record)
GROUP_PRESET = {
    "inns": "adventure", "bg": "adventure", "maps": "adventure", "events": "adventure",
    "portraits": "cel", "dogs": "cel", "van": "cel", "items": "cel", "trophies": "cel",
}
# per-group defaults on top of the preset
GROUP_PARAMS = {
    "van": {"trim_canvas": True, "ink_frac": 0.3},
    "items": {"trim_canvas": False, "anchor": "center"},
    "trophies": {"anchor": "bottom"},
}


def load_json(p, default):
    return json.loads(p.read_text()) if p.exists() else default


def rel(p):
    p = Path(p)
    try:
        return str(p.resolve().relative_to(ROOT))
    except ValueError:
        return str(p)


def process(group, cand, size, preset=None, overrides=None):
    """Run the post-process for `group` on a candidate image; returns (PIL image, info, tool, preset, params)."""
    preset = preset or GROUP_PRESET[group]
    if preset not in CEL_PRESETS:
        params = dict(SCENE_PRESETS[preset], **(overrides or {}))
        with Image.open(cand) as im:
            out, info = pixelscene(im, tuple(size), **params)
        info.pop("_layers", None)
        return out, info, "tools/art/pixelscene.py", preset, params
    params = dict(CEL_PRESETS[preset], **GROUP_PARAMS.get(group, {}), **(overrides or {}))
    with Image.open(cand) as im:
        out, info = pixelize_cel(im, tuple(size), **params)
    return out, info, "tools/pixelize.py", preset, params


def _gen_record(rec, cand):
    gen = {k: rec.get(k) for k in ("version", "prompt", "seed", "width", "height", "strength", "shift", "denoise",
                                   "init_blur", "steps", "cfg", "sampler", "scheduler", "models",
                                   "comfyui_revision", "seconds") if rec.get(k) is not None}
    if rec.get("refs"):
        gen["refs"] = [rel(r["path"]) for r in rec["refs"]]
    if rec.get("init"):
        gen["init"] = rel(rec["init"])
        if rec.get("init_snapshot"):
            gen["init_snapshot"] = rel(cand.parent / rec["init_snapshot"])
    return gen


def _resolve_cand(cand):
    cand = Path(cand)
    if not cand.is_absolute():
        cand = (ART_SRC / cand) if (ART_SRC / cand).exists() else (ROOT / cand)
    return cand


def finalize(key, cand, preset=None, overrides=None, note=None, dest=None, study=None, pixel=False, quality=88):
    group, aid = key.split("/")
    cand = _resolve_cand(cand)
    rec = load_json(cand.with_suffix(".json"), {})
    if pixel or study:
        size = tuple(rec.get("size") or [])
        out, info, tool, preset, params = process(group, cand, size, preset, overrides)
        dest = (Path(dest) if dest else (PUBLIC / "_study" / study / f"{group}-{aid}.png" if study
                                         else PUBLIC / group / f"{aid}.png"))
        dest.parent.mkdir(parents=True, exist_ok=True)
        out.save(dest, optimize=True)
    else:
        out, info, tool, preset, params = process_hd(group, aid, cand, overrides)
        dest = Path(dest) if dest else PUBLIC / group / f"{aid}.webp"
        hd.save_webp(out, dest, quality)
    sha = hashlib.sha256(dest.read_bytes()).hexdigest()
    record = {
        "file": str(dest.relative_to(PUBLIC)),
        "size": list(out.size),
        "bytes": dest.stat().st_size,
        "source": rel(cand),
        "engine": "local Krea 2 Turbo fp8 (ComfyUI)",
        "generation": _gen_record(rec, cand),
        "postprocess": {"tool": tool, "preset": preset,
                        "params": {k: (list(v) if isinstance(v, tuple) else v)
                                   for k, v in (info.get("params") or params).items()}},
        "sha256": sha,
        "date": datetime.date.today().isoformat(),
    }
    if "colors_used" in info:
        record["colors_used"] = info["colors_used"]
    for k in ("subject", "offset", "scale", "source_bbox", "bust", "mean_harmonize_shift"):
        if k in info:
            record.setdefault("placement", {})[k] = info[k]
    if note:
        record["note"] = note
    man_path = ART_SRC / "manifest.json"
    man = load_json(man_path, {})
    if study:
        man.setdefault("_study", {})[f"{study}/{group}-{aid}"] = record
    else:
        man.setdefault(group, {})[aid] = record
    man_path.write_text(json.dumps(man, indent=1, sort_keys=True) + "\n")
    if not (pixel or study):
        idx = load_json(INDEX, {})
        idx[key] = record["file"]
        INDEX.write_text(json.dumps(dict(sorted(idx.items())), indent=1) + "\n")
    print(f"final {dest.relative_to(ROOT)}  {out.size}  {record['bytes'] // 1024} KB")
    return dest, info


def finalize_camper(width=360, quality=88):
    """public/art/van/camper.webp: the composed camper (tools/art/compose.py camper_composed) at 2x density, plus
    public/art/van/van.json "camper" and the manifest record (sources: the van/van and van/bike-front picks)."""
    import compose
    import numpy as np
    out, info = compose.camper_composed(width)
    dest = PUBLIC / "van" / "camper.webp"
    hd.save_webp(out, dest, quality)
    a = np.asarray(out)[..., 3]
    ground = int(np.nonzero((a > 128).any(1))[0].max()) + 1
    meta_p = PUBLIC / "van" / "van.json"
    meta = load_json(meta_p, {})
    meta["camper"] = {"file": "van/camper.webp", "w": out.width, "h": out.height, "ground": ground,
                      "van": info["van"], "note": "camper + crosswise rear carrier + the motorcycle seen head-on; "
                      "draw this instead of van + rack (the rack anchor below is retired)"}
    if "rack" in meta:
        meta["rack"]["retired"] = "4 Oct 2026: the side-view bike over the rear wall was not a real carrier; use camper"
    meta["about"] = ("Painted vehicles (2x density: 2 image px per layout unit), side view facing right. `camper` is the "
                     "composed camper with the motorcycle on its crosswise rear carrier: draw it with its ground line on "
                     "the road; `van` is the camper alone (its van offset inside `camper` is camper.van). ground = the y "
                     "of the wheels' contact line in image px.")
    meta_p.write_text(json.dumps(meta, indent=1) + "\n")
    picks = load_json(ART_SRC / "picks.json", {})
    srcs = {k: str((ART_SRC / "cand" / k / picks[k]["cand"]).relative_to(ROOT)) for k in ("van/van", "van/bike-front")}
    man_path = ART_SRC / "manifest.json"
    man = load_json(man_path, {})
    man.setdefault("van", {})["camper"] = {
        "file": "van/camper.webp", "size": list(out.size), "bytes": dest.stat().st_size,
        "sources": srcs, "engine": "composition of two Krea 2 picks + a carrier drawn in code",
        "postprocess": {"tool": "tools/art/compose.py camper_composed + tools/art/hd.py hd_cut", "width": width,
                        "work_scale": 4, "carrier": info["carrier"]},
        "sha256": hashlib.sha256(dest.read_bytes()).hexdigest(), "date": datetime.date.today().isoformat(),
        "note": "user request 4 Oct 2026: the motorcycle sits crosswise on a real rear carrier (seen head-on)"}
    man_path.write_text(json.dumps(man, indent=1, sort_keys=True) + "\n")
    idx = load_json(INDEX, {})
    idx["van/camper"] = "van/camper.webp"
    INDEX.write_text(json.dumps(dict(sorted(idx.items())), indent=1) + "\n")
    print(f"final {dest.relative_to(ROOT)}  {out.size}  ground {ground}")
    return dest


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("key", help="GROUP/ID, e.g. inns/village")
    ap.add_argument("cand")
    ap.add_argument("--preset", choices=sorted(set(SCENE_PRESETS) | set(CEL_PRESETS)))
    ap.add_argument("--params", help="JSON object over the preset")
    ap.add_argument("--dest")
    ap.add_argument("--study", help="write the review copy public/art/_study/<VARIANT>/<group>-<id>.png")
    ap.add_argument("--note")
    ap.add_argument("--pixel", action="store_true", help="legacy style-study raster recipe (PNG)")
    a = ap.parse_args()
    finalize(a.key, a.cand, a.preset, json.loads(a.params) if a.params else None, a.note, a.dest, a.study, a.pixel)


if __name__ == "__main__":
    main()
