#!/usr/bin/env python
"""Render every SFX id of SKAT AUF TOUR procedurally (numpy only, CPU, deterministic).

    nice -n 15 tools/.venv/bin/python audio-src/sfx/synth.py            # everything
    nice -n 15 tools/.venv/bin/python audio-src/sfx/synth.py card-play knock   # some ids (json/manifest merged)
    ... synth.py --wav DIR card-play      # additionally write the masters as WAV (for listening/inspection)

Writes public/audio/sfx/<id>[-n].ogg, public/audio/sfx.json and audio-src/sfx/manifest.json (provenance: generator
function, seed, parameters, measured levels). Levels are baked into the files per category (see CATEGORIES); the
"gain" field in sfx.json stays 0 and is free for mixing in the game.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib
import json
import re
import sys
import time
import zlib
import os
from pathlib import Path

for _v in ("OPENBLAS_NUM_THREADS", "OMP_NUM_THREADS", "MKL_NUM_THREADS"):  # framework.md: at most 4 threads
    os.environ.setdefault(_v, "4")

import numpy as np  # noqa: E402
import soundfile as sf

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import dsp  # noqa: E402

ROOT = HERE.parents[1]
OUT_DIR = ROOT / "public" / "audio" / "sfx"
SFX_JSON = ROOT / "public" / "audio" / "sfx.json"
MANIFEST = HERE / "manifest.json"
IDS_TS = ROOT / "src" / "game" / "ids.ts"

PEAK_CEILING_DB = -1.5  # true-peak target before encoding; decoded files are verified at <= -1.0 dBFS
DECODED_LIMIT_DB = -1.0

# Loudness targets. One-shots: maximum K-weighted loudness over a sliding 200 ms window ("M200max", LUFS-ish).
# Loops: gated integrated loudness over the loop. Quiet UI, soft cards, louder stings; nothing jumps out.
CATEGORIES = {
    "ui":       {"target": -26.0, "measure": "M200max", "quality": 0.45},
    "card":     {"target": -23.0, "measure": "M200max", "quality": 0.45},
    "table":    {"target": -23.0, "measure": "M200max", "quality": 0.45},
    "feedback": {"target": -24.0, "measure": "M200max", "quality": 0.45},
    "drink":    {"target": -24.0, "measure": "M200max", "quality": 0.45},
    "mild":     {"target": -27.0, "measure": "M200max", "quality": 0.45},
    "foley":    {"target": -22.0, "measure": "M200max", "quality": 0.5},
    "vehicle":  {"target": -21.0, "measure": "M200max", "quality": 0.5},
    "dog":      {"target": -22.5, "measure": "M200max", "quality": 0.45},
    "bell":     {"target": -23.0, "measure": "M200max", "quality": 0.5},
    "sting":    {"target": -18.0, "measure": "M200max", "quality": 0.4},
    "ambience": {"target": -30.0, "measure": "integrated", "quality": 0.6},
    "room":     {"target": -36.0, "measure": "integrated", "quality": 0.45},
    "engine":   {"target": -26.0, "measure": "integrated", "quality": 0.6},
}

T, I, R, N, S, REC = "gen_table", "gen_inn", "gen_road", "gen_nature", "gen_stings", "rec"

# id → category, generator ("module.function"), variants (parameter dicts), loop flag, description for the
# listening checklist, optional "trim" (dB added to the category target). A variant may carry "seed"; otherwise
# seed = crc32(id) % 10000 * 10 + variant index.
SOUNDS: dict[str, dict] = {
    # cards
    "card-deal": dict(cat="card", gen=f"{T}.card_deal", desc="thumb snick, swish through the air, light landing",
                      variants=[{}, {"dur": 0.11, "band": 3600, "end": 0.8}, {"dur": 0.15, "band": 2900, "end": 0.7}]),
    "card-play": dict(cat="card", gen=f"{T}.card_play", desc="soft 'tock' of a card on the felt mat",
                      variants=[{}, {"tock": 230, "slap": 0.6, "bright": 2000}, {"tock": 290, "slap": 0.4, "puff": 0.7}]),
    "card-raise": dict(cat="ui", gen=f"{T}.card_raise", desc="tiny lift swish of one hand card",
                       variants=[{}, {"dur": 0.065, "tick": 0.1}]),
    "trick-take": dict(cat="card", gen=f"{T}.trick_take", desc="three cards gathered, edge ticks, squaring tap",
                       variants=[{}, {"slides": 3, "spacing": 0.06}, {"slides": 2, "spacing": 0.08, "taps": 2}]),
    "shuffle": dict(cat="card", gen=f"{T}.shuffle", desc="riffle 'brrrt' in stereo, bridge cascade, deck squared twice",
                    variants=[{}, {"riffle": 0.55, "bridge": 0.32, "taps": 1}]),
    "knock": dict(cat="table", gen=f"{T}.knock", desc="knuckles on the heavy wooden Stammtisch (tock-tock)",
                  variants=[{}, {"count": 3, "gap": 0.14, "f1": 160}, {"count": 2, "gap": 0.19, "f1": 140, "q": 18}]),
    "bid": dict(cat="table", gen=f"{T}.bid", desc="two light fingertip taps (tok-tok) under a bid bubble",
                variants=[{}, {"gap": 0.105, "f1": 350}]),
    "pass": dict(cat="table", gen=f"{T}.pass_flick", desc="soft thumb flick over the fanned cards ('frrp')",
                 variants=[{}, {"clicks": 3, "span": 0.04}]),
    "skat-pick": dict(cat="card", gen=f"{T}.skat_pick", desc="two cards slid off the table, one after the other",
                      variants=[{}, {"gap": 0.08}]),
    "list-write": dict(cat="table", gen=f"{T}.list_write", desc="pencil writes a game into the list: strokes + touch-downs",
                       variants=[{}, {"strokes": 5, "speed": 1.1}, {"strokes": 7, "speed": 0.95}]),
    # inn
    "glass-clink": dict(cat="drink", gen=f"{I}.glass_clink", desc="two glasses touch: beer mugs / Viertele glasses",
                        variants=[{}, {"kind": "wine"}, {"kind": "mixed"}]),
    "bottle-open": dict(cat="drink", gen=f"{I}.bottle_open", desc="crown cap: opener, pop, hiss, cap tinkles / swing-top 'plopp'",
                        variants=[{}, {"kind": "swing"}, {"kind": "crown", "tinkle": False}]),
    "pour": dict(cat="drink", gen=f"{I}.pour", desc="gentle pour into a glass, pitch of the glass rising as it fills",
                 variants=[{}, {"kind": "wine"}]),
    "gulp": dict(cat="drink", gen=f"{I}.gulp", desc="two or three soft swallows (GLUCK), not wet",
                 variants=[{}, {"count": 3}]),
    "cheers": dict(cat="drink", gen=f"{I}.cheers", desc="several glasses clink around the table (stereo)",
                   variants=[{}, {"count": 4}]),
    "burp": dict(cat="mild", gen=f"{I}.burp", desc="tiny, muffled 'örp' / a polite throat clear (kept mild on purpose)",
                 variants=[{}, {"kind": "clear"}]),
    "chair": dict(cat="foley", gen=f"{I}.chair", desc="wooden chair scraped over floorboards, settles",
                  variants=[{}, {"dur": 0.4, "rate": (90, 150)}, {"dur": 0.7, "rate": (60, 120)}]),
    # Recorded rooms (Freesound, CC0/CC-BY, see rec.SOURCES and THIRD_PARTY_NOTICES.md). The synthetic babble
    # gen_inn.inn_murmur is retired: the user found it loud and unconvincing.
    "inn-murmur": dict(cat="room", gen=f"{REC}.room_loop", loop=True, stereo=True,
                       desc="calm Gasthaus Stube: distant indistinct German chatter, soft plates and glasses; no music",
                       variants=[{"source": "fs334140", "start": 18.0, "length": 30.0}]),
    "inn-murmur-busy": dict(cat="room", gen=f"{REC}.room_loop", loop=True, stereo=True, trim=1.0,
                            desc="livelier: a big hall full of talking people (Festzelt/Wasen feel), no music",
                            variants=[{"source": "fs641303", "start": 35.0, "length": 30.0, "highcut": 2400.0}]),
    "beergarden": dict(cat="room", gen=f"{REC}.room_loop", loop=True, stereo=True,
                       desc="outdoor beer garden by the river: distant voices, birds, a little air",
                       variants=[{"source": "fs735593", "start": 35.0, "length": 30.0, "highcut": 5500.0,
                                  "lowcut": 160.0, "presence_db": -2.0, "stereo_width": 0.6}]),
    "coin": dict(cat="foley", gen=f"{I}.coin", desc="Mark coin drops and settles / two coins on the saucer / one coin set down",
                 variants=[{}, {"kind": "saucer"}, {"kind": "place"}]),
    "till": dict(cat="foley", gen=f"{I}.till", desc="old cash register: keys, crank, bell 'ching', drawer with coins",
                 variants=[{}, {"keys": 3, "bell": 1600}]),
    "stamp": dict(cat="table", gen=f"{T}.stamp", desc="rubber stamp thump on paper over a counter (with ink-pad dab)",
                  variants=[{}, {"dab": True}]),
    "page-turn": dict(cat="table", gen=f"{T}.page_turn", desc="newspaper page turned: swoosh, crackle, soft flap",
                      variants=[{}, {"dur": 0.5, "crackle": 320}]),
    # road
    "van-start": dict(cat="vehicle", gen=f"{R}.van_start", desc="key, starter cranking (rur-rur), petrol engine catches, idles",
                      variants=[{}, {"stubborn": True}]),
    "van-drive": dict(cat="engine", gen=f"{R}.van_drive", loop=True, desc="inside the van: engine hum, road roar; seamless loop",
                      variants=[{}]),
    "van-door": dict(cat="foley", gen=f"{R}.van_door", desc="sliding door rolls and shuts with a heavy ka-chunk",
                     variants=[{}, {"slide": 0.3, "slam": 0.8}]),
    "van-horn": dict(cat="vehicle", gen=f"{R}.van_horn", trim=-2.0, desc="old two-tone horn, slightly comic (hup-hup / tired hööp)",
                     variants=[{}, {"pattern": "long"}]),
    "bike-kick": dict(cat="vehicle", gen=f"{R}.bike_kick", desc="kick-start, big twin catches: RÖÖÖHR, settles to lumpy idle",
                      variants=[{}, {"peak": 2300, "kicks": 2}]),
    "bike-rev": dict(cat="vehicle", gen=f"{R}.bike_rev", trim=-1.0, desc="throttle blip(s) of the twin from idle",
                     variants=[{}, {"blips": 2}]),
    "bike-idle": dict(cat="engine", gen=f"{R}.bike_idle", loop=True, desc="lumpy twin idle (potato-potato); seamless loop",
                      variants=[{}]),
    "fuel": dict(cat="foley", gen=f"{R}.fuel", desc="pump nozzle click, fuel glugging into the tank, shut-off clack",
                 variants=[{}, {"dur": 1.4}]),
    "wrench": dict(cat="foley", gen=f"{R}.wrench", desc="ratchet strokes, then the spanner put down on the bench (clank)",
                   variants=[{}, {"strokes": 1, "f1": 1150}]),
    # dogs
    "dog-bark-big": dict(cat="dog", gen=f"{N}.dog_bark_big", desc="deep friendly woof (single / double)",
                         variants=[{}, {"count": 2}, {"count": 1, "f0": 230, "dur": 0.26}]),
    "dog-bark-small": dict(cat="dog", gen=f"{N}.dog_bark_small", desc="small friendly yaps",
                           variants=[{}, {"count": 3, "f0": 760}]),
    "dog-pant": dict(cat="dog", gen=f"{N}.dog_pant", desc="happy panting, hah-hah-hah",
                     variants=[{}, {"rate": 3.6, "dur": 1.4}]),
    "dog-whine": dict(cat="dog", gen=f"{N}.dog_whine", desc="soft begging whine, rising at the end",
                      variants=[{}, {"kind": "double"}]),
    # puzzles
    "chess-move": dict(cat="table", gen=f"{T}.chess_move", desc="wooden piece set on the board: tock",
                       variants=[{}, {"slide": True, "f_board": 450}, {"f_board": 510, "f_piece": 2600, "felt": 0.25}]),
    "chess-capture": dict(cat="table", gen=f"{T}.chess_capture", desc="tik (piece hits piece), piece set aside, firm tock",
                          variants=[{}, {"f_board": 500}]),
    "pencil": dict(cat="table", gen=f"{T}.pencil", desc="one pencil mark (digit / letter)",
                   variants=[{}, {"strokes": 1, "speed": 1.1}, {"strokes": 3, "speed": 1.0}]),
    "sudoku-right": dict(cat="feedback", gen=f"{T}.sudoku_right", desc="soft warm wooden 'tock' with a pitch (E6)",
                         variants=[{}, {"mallet": 0.8}]),
    "sudoku-wrong": dict(cat="feedback", gen=f"{T}.sudoku_wrong", desc="gentle low hummed 'hm', falling; no buzzer",
                         variants=[{}, {"f0": 160, "dur": 0.34}]),
    "church-bell": dict(cat="bell", gen=f"{N}.church_bell", stereo=True, desc="distant village church bell over the valley",
                        variants=[{}, {"strokes": 1}]),
    "rain": dict(cat="ambience", gen=f"{N}.rain", loop=True, stereo=True, desc="steady soft rain with drips; seamless loop",
                 variants=[{}]),
    "crickets": dict(cat="ambience", gen=f"{N}.crickets", loop=True, stereo=True,
                     desc="summer night field crickets near and far; seamless loop", variants=[{}]),
    # ui
    "ui-click": dict(cat="ui", gen=f"{T}.ui_click", desc="soft wooden click (every button)",
                     variants=[{}, {"f": 1940}, {"f": 2060}]),
    "ui-back": dict(cat="ui", gen=f"{T}.ui_back", desc="two soft wooden ticks, falling", variants=[{}]),
    "ui-open": dict(cat="ui", gen=f"{T}.ui_open", desc="short rising paper flap and a light tick", variants=[{}]),
    # stings
    "win-sting": dict(cat="sting", gen=f"{S}.win_sting", stereo=True, desc="happy little accordion phrase (musette)",
                      variants=[{}, {"tune": 2}]),
    "lose-sting": dict(cat="sting", gen=f"{S}.lose_sting", stereo=True, desc="good-natured muted trombone 'wah wah wah waaah'",
                       variants=[{}]),
    "trophy-fanfare": dict(cat="sting", gen=f"{S}.trophy_fanfare", stereo=True,
                           desc="small brass-band fanfare with tuba, horns, cymbal", variants=[{}]),
}


def sfx_ids_from_ts() -> list[str]:
    src = IDS_TS.read_text()
    m = re.search(r"export const SFX = \[(.*?)\] as const", src, re.S)
    return re.findall(r'"([^"]+)"', m.group(1)) if m else []


def resolve(name: str):
    mod, fn = name.split(".")
    return getattr(importlib.import_module(mod), fn)


def seed_for(sid: str, i: int, v: dict) -> int:
    return int(v.get("seed", zlib.crc32(sid.encode()) % 10000 * 10 + i))


def jsonable(v):
    if isinstance(v, (np.floating, np.integer)):
        return v.item()
    if isinstance(v, tuple):
        return list(v)
    return v


def master(x: np.ndarray, target: float, loop: bool):
    """DC-block, trim (one-shots), measure, normalise to the target under the peak ceiling."""
    x = dsp.dc_block(x, circular=loop)
    if not loop:
        x = dsp.trim(x)
    measure = dsp.loudness_integrated(x, circular=True) if loop else dsp.loudness_max(x)
    gain_db = target - measure
    tp = dsp.db(dsp.true_peak(x)) + gain_db
    limited = 0.0
    if tp > PEAK_CEILING_DB:
        limited = tp - PEAK_CEILING_DB
        gain_db -= limited
    y = x * dsp.undb(gain_db)
    return y, measure, gain_db, limited


def _ogg_crc_table():
    t = []
    for i in range(256):
        r = i << 24
        for _ in range(8):
            r = ((r << 1) ^ 0x04C11DB7) if r & 0x80000000 else (r << 1)
        t.append(r & 0xFFFFFFFF)
    return t


_OGG_CRC = _ogg_crc_table()


def ogg_fix_serial(path: Path, serial: int):
    """libsndfile picks a random Ogg stream serial number, so identical audio gives different bytes each render.
    Rewrite the serial of every page to a fixed value and recompute the page checksums (byte-reproducible files)."""
    data = bytearray(path.read_bytes())
    pos = 0
    while pos + 27 <= len(data) and data[pos:pos + 4] == b"OggS":
        nseg = data[pos + 26]
        size = 27 + nseg + sum(data[pos + 27:pos + 27 + nseg])
        data[pos + 14:pos + 18] = serial.to_bytes(4, "little")
        data[pos + 22:pos + 26] = b"\0\0\0\0"
        crc = 0
        for b in data[pos:pos + size]:
            crc = ((crc << 8) ^ _OGG_CRC[((crc >> 24) ^ b) & 0xFF]) & 0xFFFFFFFF
        data[pos + 22:pos + 26] = crc.to_bytes(4, "little")
        pos += size
    if pos != len(data):
        raise RuntimeError(f"{path}: unexpected Ogg structure at byte {pos}")
    path.write_bytes(bytes(data))


def write_ogg(path: Path, y: np.ndarray, quality: float):
    level = float(np.clip(1.0 - quality, 0.0, 1.0))  # libsndfile: compression level 0 = best quality
    for _ in range(4):
        sf.write(str(path), y.astype(np.float32), dsp.SR, format="OGG", subtype="VORBIS", compression_level=level)
        ogg_fix_serial(path, zlib.crc32(path.name.encode()))
        dec, _sr = sf.read(str(path), always_2d=False)
        pk = dsp.db(float(np.max(np.abs(dec))))
        if pk <= DECODED_LIMIT_DB:
            return dec, pk
        y = y * dsp.undb(DECODED_LIMIT_DB - 0.3 - pk)
    return dec, pk


def render(sid: str, spec: dict, wav_dir: Path | None = None, log=print):
    cat = CATEGORIES[spec["cat"]]
    target = cat["target"] + float(spec.get("trim", 0.0))
    loop = bool(spec.get("loop", False))
    gen = resolve(spec["gen"])
    variants = spec["variants"]
    files, mani = [], []
    for i, v in enumerate(variants):
        params = {k: val for k, val in v.items() if k != "seed"}
        seed = seed_for(sid, i, v)
        rng = np.random.default_rng(seed)
        t0 = time.time()
        x = gen(rng, **params)
        y, measured, gain_db, limited = master(x, target, loop)
        name = f"{sid}-{i + 1}.ogg" if len(variants) > 1 else f"{sid}.ogg"
        path = OUT_DIR / name
        dec, dec_peak = write_ogg(path, y, cat["quality"])
        if wav_dir:
            wav_dir.mkdir(parents=True, exist_ok=True)
            sf.write(str(wav_dir / name.replace(".ogg", ".wav")), y.astype(np.float32), dsp.SR, subtype="PCM_16")
        final = dsp.loudness_integrated(dec, True) if loop else dsp.loudness_max(dec)
        entry = {
            "file": f"audio/sfx/{name}",
            "generator": spec["gen"],
            "seed": seed,
            "params": {k: jsonable(val) for k, val in params.items()},
            "category": spec["cat"],
            "measure": cat["measure"],
            "target_lufs": target,
            "raw_lufs": round(measured, 2),
            "gain_db": round(gain_db, 2),
            "peak_limited_db": round(limited, 2),
            "final_lufs": round(final, 2),
            "decoded_peak_dbfs": round(dec_peak, 2),
            "seconds": round(len(dec) / dsp.SR, 4),
            "samples": int(len(dec)),
            "channels": 1 if dec.ndim == 1 else int(dec.shape[1]),
            "bytes": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest()[:16],
            "render_s": round(time.time() - t0, 2),
        }
        if spec["gen"].startswith(f"{REC}."):
            rec = importlib.import_module(REC)
            keys = [params["source"]]
            entry["model"] = "none (field recording, processed)"
            entry["sources"] = [{k: v for k, v in {**rec.SOURCES[key], "key": key,
                                                   "sha256": rec.SOURCES[key].get("sha256_seen")}.items()
                                 if k != "sha256_seen"} for key in keys]
            entry["processing"] = ("segment start/length from params; slow leveller on bursts; high-pass "
                                   f"{params.get('lowcut', 110)} Hz; low-pass {params.get('highcut', 2200)} Hz "
                                   "(12 dB/oct, words blur); presence shelf; stereo width "
                                   f"{params.get('stereo_width', 0.5)}; equal-power loop crossfade "
                                   f"{params.get('xfade', 3.0)} s; loudness to the room target; OGG Vorbis")
        if loop:
            entry["seam_score"] = round(dsp.seam_score(dec), 2)
        files.append(entry["file"])
        mani.append(entry)
        lim = f" (peak-limited {limited:.1f} dB short)" if limited > 0.05 else ""
        log(f"  {name:28s} {entry['seconds']:6.2f}s  {final:6.1f} LUFS  peak {dec_peak:5.1f}  "
            f"{entry['bytes'] / 1024:6.1f} kB{lim}")
    meta = {"files": files, "gain": 0, "loop": loop}
    if loop:
        meta["loopStart"] = 0
        meta["loopEnd"] = round(mani[0]["samples"] / dsp.SR, 6)
    return meta, {"category": spec["cat"], "description": spec["desc"], "loop": loop, "variants": mani}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ids", nargs="*")
    ap.add_argument("--wav", type=Path, default=None, help="also write WAV masters into this folder")
    args = ap.parse_args()
    ids = args.ids or list(SOUNDS)
    unknown = [i for i in ids if i not in SOUNDS]
    if unknown:
        sys.exit(f"unknown ids: {unknown}")
    missing = [i for i in sfx_ids_from_ts() if i not in SOUNDS]
    if missing:
        print(f"WARNING: ids in ids.ts without a generator: {missing}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sfx_json = json.loads(SFX_JSON.read_text()) if SFX_JSON.exists() else {}
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    manifest.pop("_about", None)
    t_all = time.time()
    for sid in ids:
        print(sid)
        # remove stale variant files of this id
        for old in OUT_DIR.glob(f"{sid}*.ogg"):
            if re.fullmatch(re.escape(sid) + r"(-\d+)?\.ogg", old.name):
                old.unlink()
        meta, mani = render(sid, SOUNDS[sid], args.wav)
        sfx_json[sid] = meta
        manifest[sid] = mani
    order = [i for i in sfx_ids_from_ts() if i in sfx_json] + [i for i in sfx_json if i not in sfx_ids_from_ts()]
    sfx_json = {k: sfx_json[k] for k in order}
    SFX_JSON.write_text(json.dumps(sfx_json, indent=1, ensure_ascii=False) + "\n")
    about = {
        "_about": {
            "what": "Provenance of every SFX file (contract §0.12). Procedural synthesis, numpy only, no models.",
            "how": "audio-src/sfx/synth.py renders generator(rng=np.random.default_rng(seed), **params), then "
                   "DC-block, trim/fade (one-shots), loudness normalisation per category, OGG Vorbis.",
            "categories": CATEGORIES,
            "peak_ceiling_true_db": PEAK_CEILING_DB,
            "sample_rate": dsp.SR,
            "numpy": np.__version__,
            "soundfile": sf.__version__,
            "libsndfile": sf.__libsndfile_version__,
        }
    }
    manifest = {**about, **{k: manifest[k] for k in order if k in manifest}}
    MANIFEST.write_text(json.dumps(manifest, indent=1, ensure_ascii=False) + "\n")
    total = sum(p.stat().st_size for p in OUT_DIR.glob("*.ogg"))
    print(f"done in {time.time() - t_all:.1f}s; public/audio/sfx = {total / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
