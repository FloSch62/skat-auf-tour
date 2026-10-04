#!/usr/bin/env python
"""QA for the delivered audio: every SFX id has files, they decode, durations/peaks/loudness are in range, loops
are seamless, provenance is complete, the folder is small. Writes audio-src/sfx/report.md (with a listening
checklist) and exits non-zero on hard failures.

    tools/.venv/bin/python audio-src/sfx/check.py
"""
from __future__ import annotations

import json
import re
import sys
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
PUBLIC = ROOT / "public"
SFX_JSON = PUBLIC / "audio" / "sfx.json"
MUSIC_JSON = PUBLIC / "audio" / "music.json"
MANIFEST = HERE / "manifest.json"
REPORT = HERE / "report.md"
IDS_TS = ROOT / "src" / "game" / "ids.ts"

SIZE_LIMIT_MB = 6.0
LOOP_RANGE = (6.0, 12.0)
ROOM_LOOP_RANGE = (20.0, 40.0)  # recorded room tones (category "room") loop longer so they do not repeat audibly
ONESHOT_RANGE = (0.04, 10.0)
PEAK_LIMIT_DB = -1.0
LOUDNESS_TOL_DB = 1.5
SEAM_LIMIT = 1.2
EDGE_LIMIT_DB = -40.0  # first/last sample of a one-shot relative to its peak


def ts_list(name: str) -> list[str]:
    src = IDS_TS.read_text()
    m = re.search(rf"export const {name} = \[(.*?)\] as const", src, re.S)
    return re.findall(r'"([^"]+)"', m.group(1)) if m else []


def check_sfx(problems: list[str], warnings: list[str]):
    ids = ts_list("SFX")
    meta = json.loads(SFX_JSON.read_text()) if SFX_JSON.exists() else {}
    mani = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    rows = []
    referenced = set()
    extra = [k for k in meta if k not in ids]
    for sid in ids + extra:
        m = meta.get(sid)
        if not m or not m.get("files"):
            problems.append(f"{sid}: no entry/files in sfx.json")
            rows.append({"id": sid, "missing": True})
            continue
        info = mani.get(sid, {})
        variants = {v["file"]: v for v in info.get("variants", [])}
        loop = bool(m.get("loop"))
        for f in m["files"]:
            referenced.add(Path(f).name)
            path = PUBLIC / f
            r = {"id": sid, "file": f, "loop": loop}
            if not path.exists():
                problems.append(f"{sid}: missing file {f}")
                r["missing"] = True
                rows.append(r)
                continue
            try:
                x, sr = sf.read(str(path), always_2d=False)
            except Exception as e:  # noqa: BLE001
                problems.append(f"{sid}: {f} does not decode ({e})")
                continue
            if sr != dsp.SR:
                problems.append(f"{sid}: {f} sample rate {sr}")
            dur = len(x) / sr
            peak = dsp.db(float(np.max(np.abs(x))))
            tp = dsp.db(dsp.true_peak(x))
            lufs = dsp.loudness_integrated(x, True) if loop else dsp.loudness_max(x)
            r.update(dur=dur, peak=peak, tp=tp, lufs=lufs, ch=1 if x.ndim == 1 else x.shape[1],
                     kb=path.stat().st_size / 1024)
            v = variants.get(f)
            if v is None:
                problems.append(f"{sid}: {f} has no provenance entry in manifest.json")
            else:
                for key in ("generator", "seed", "params"):
                    if key not in v:
                        problems.append(f"{sid}: manifest entry of {f} lacks '{key}'")
                if v.get("category") == "room":
                    for src in v.get("sources") or [{}]:
                        for key in ("url", "author", "license", "license_url", "preview", "sha256"):
                            if not src.get(key):
                                problems.append(f"{sid}: source of {f} lacks '{key}' (licence provenance)")
                r["target"] = v.get("target_lufs")
                r["limited"] = v.get("peak_limited_db", 0)
                if r["target"] is not None and abs(lufs - r["target"]) > LOUDNESS_TOL_DB + r["limited"]:
                    warnings.append(f"{sid}: {f} loudness {lufs:.1f} vs target {r['target']:.1f}")
            if peak > PEAK_LIMIT_DB:
                problems.append(f"{sid}: {f} peak {peak:.2f} dBFS > {PEAK_LIMIT_DB}")
            if tp > PEAK_LIMIT_DB + 0.5:
                warnings.append(f"{sid}: {f} estimated true peak {tp:.2f} dBTP")
            if loop:
                lo, hi = ROOM_LOOP_RANGE if (v or {}).get("category") == "room" else LOOP_RANGE
                if not lo <= dur <= hi:
                    problems.append(f"{sid}: loop length {dur:.2f}s outside {lo}-{hi}s")
                seam = dsp.seam_score(x)
                mono = x.mean(axis=1) if x.ndim == 2 else x
                d = np.abs(np.diff(mono))
                jump = abs(mono[0] - mono[-1]) / (np.percentile(d, 99.9) + 1e-12)
                r.update(seam=seam, jump=jump)
                if seam > SEAM_LIMIT:
                    problems.append(f"{sid}: loop seam score {seam:.2f} > {SEAM_LIMIT}")
                if jump > 1.0:
                    problems.append(f"{sid}: loop seam sample jump {jump:.2f}x the 99.9th percentile step")
                if m.get("loopEnd") and abs(m["loopEnd"] - dur) > 0.002:
                    warnings.append(f"{sid}: loopEnd {m['loopEnd']} differs from decoded duration {dur:.4f}")
            else:
                lo, hi = ONESHOT_RANGE
                if not lo <= dur <= hi:
                    problems.append(f"{sid}: duration {dur:.2f}s outside {lo}-{hi}s")
                mono = np.max(np.abs(x), axis=1) if x.ndim == 2 else np.abs(x)
                pk = np.max(mono) + 1e-12
                e0, e1 = dsp.db(mono[0] / pk), dsp.db(mono[-1] / pk)
                r.update(edge=max(e0, e1))
                if max(e0, e1) > EDGE_LIMIT_DB:
                    warnings.append(f"{sid}: {f} starts/ends at {max(e0, e1):.0f} dB re peak (click risk)")
            rows.append(r)
    if extra:
        warnings.append(f"sfx.json has ids not (yet) in ids.ts, checked anyway: {extra}")
    sfx_dir = PUBLIC / "audio" / "sfx"
    stray = sorted(p.name for p in sfx_dir.glob("*") if p.is_file() and p.name not in referenced)
    if stray:
        warnings.append(f"unreferenced files in public/audio/sfx: {stray}")
    total = sum(p.stat().st_size for p in sfx_dir.glob("*") if p.is_file()) / 1024 / 1024
    if total > SIZE_LIMIT_MB:
        problems.append(f"public/audio/sfx is {total:.2f} MB > {SIZE_LIMIT_MB} MB")
    return ids + extra, meta, mani, rows, total


def check_music(problems: list[str], warnings: list[str]):
    if not MUSIC_JSON.exists():
        return []
    meta = json.loads(MUSIC_JSON.read_text())
    ids = ts_list("MUSIC")
    rows = []
    for mid, m in meta.items():
        if mid not in ids:
            warnings.append(f"music.json id {mid} not in ids.ts")
        lens = []
        for layer, f in m.get("files", {}).items():
            path = PUBLIC / f
            if not path.exists():
                problems.append(f"music {mid}: missing {f}")
                continue
            x, sr = sf.read(str(path), always_2d=False)
            dur = len(x) / sr
            lens.append(len(x))
            lufs = dsp.loudness_integrated(x, True)
            peak = dsp.db(float(np.max(np.abs(x))))
            seam = dsp.seam_score(x)
            rows.append(dict(id=mid, layer=layer, file=f, dur=dur, lufs=lufs, peak=peak, seam=seam,
                             kb=path.stat().st_size / 1024, placeholder=m.get("placeholder", False)))
            if peak > PEAK_LIMIT_DB:
                problems.append(f"music {mid}/{layer}: peak {peak:.2f}")
            if seam > SEAM_LIMIT:
                problems.append(f"music {mid}/{layer}: seam score {seam:.2f}")
            if abs(lufs - (-19.0)) > 1.5:
                warnings.append(f"music {mid}/{layer}: {lufs:.1f} LUFS (target -19)")
        if len(set(lens)) > 1:
            problems.append(f"music {mid}: layers differ in length {lens}")
    return rows


LISTEN = HERE / "listen.html"


def write_listen_page(ids, meta, mani):
    """A dev-only audition page: http://127.0.0.1:5191/audio-src/sfx/listen.html (Vite serves the project root)."""
    items = []
    for sid in ids:
        m = meta.get(sid, {})
        info = mani.get(sid, {})
        items.append({"id": sid, "files": m.get("files", []), "loop": bool(m.get("loop")),
                      "cat": info.get("category", ""), "desc": info.get("description", "")})
    html = """<!doctype html><meta charset="utf-8"><title>SFX audition</title>
<style>body{font:15px system-ui;margin:24px;max-width:900px;background:#f6f1e7;color:#222}
.row{padding:6px 0;border-bottom:1px solid #ddd}.id{font-weight:600;display:inline-block;width:150px}
.cat{color:#776;font-size:12px;display:inline-block;width:70px}button{margin:0 4px 0 0;min-width:34px}
.d{color:#555;font-size:13px;margin-left:224px}</style>
<h1>SKAT AUF TOUR · SFX audition</h1><p>Click a number to play a variant; loops toggle on/off (listen across the seam).
Generated by <code>audio-src/sfx/check.py</code>. Music: <a href="../music/listen.html">music audition</a>.</p><div id=list></div>
<script>
const ITEMS = __ITEMS__;
let ctx, playing = {};
const buf = {};
async function load(f){ ctx ??= new AudioContext(); if(!buf[f]){ const r = await fetch('/' + f);
  buf[f] = await ctx.decodeAudioData(await r.arrayBuffer()); } return buf[f]; }
async function play(f, loop){ const b = await load(f); if (playing[f]) { playing[f].stop(); delete playing[f]; return; }
  const s = ctx.createBufferSource(); s.buffer = b; s.loop = loop; s.connect(ctx.destination); s.start();
  if (loop) playing[f] = s; }
const list = document.getElementById('list');
for (const it of ITEMS) { const d = document.createElement('div'); d.className = 'row';
  d.innerHTML = `<span class=id>${it.id}</span><span class=cat>${it.cat}</span>`;
  it.files.forEach((f, i) => { const b = document.createElement('button');
    b.textContent = it.loop ? 'loop' : String(i + 1); b.onclick = () => play(f, it.loop); d.appendChild(b); });
  const p = document.createElement('div'); p.className = 'd'; p.textContent = it.desc; d.appendChild(p); list.appendChild(d); }
</script>
"""
    LISTEN.write_text(html.replace("__ITEMS__", json.dumps(items, ensure_ascii=False)))


def main():
    problems: list[str] = []
    warnings: list[str] = []
    ids, meta, mani, rows, total = check_sfx(problems, warnings)
    mrows = check_music(problems, warnings)
    nfiles = sum(1 for r in rows if not r.get("missing"))
    L = ["# Audio QA report", "",
         "Generated by `audio-src/sfx/check.py`. Levels: one-shots as maximum K-weighted loudness over 200 ms "
         "(M200max, LUFS-ish), loops as gated integrated loudness. Peaks are decoded sample peaks; TP is an "
         "oversampled true-peak estimate. Seam: second-difference energy in a 1 ms window on the loop seam relative to "
         "the 99.9th percentile of all positions (below 1 = the seam is like any other point; a click scores far "
         "above 1; limit 1.2).", "",
         f"- SFX ids checked (ids.ts + extra ids in sfx.json): {len(ids)}; with files: "
         f"{sum(1 for i in ids if i in meta)}; files: {nfiles}",
         f"- Size of `public/audio/sfx`: {total:.2f} MB (limit {SIZE_LIMIT_MB} MB)",
         f"- Problems: {len(problems)}; warnings: {len(warnings)}", ""]
    if problems:
        L += ["## Problems", ""] + [f"- {p}" for p in problems] + [""]
    if warnings:
        L += ["## Warnings", ""] + [f"- {w}" for w in warnings] + [""]
    L += ["## Files", "", "| id | file | s | ch | LUFS | target | peak | TP | seam | kB |",
          "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|"]
    for r in rows:
        if r.get("missing"):
            L.append(f"| `{r['id']}` | MISSING | | | | | | | | |")
            continue
        seam = f"{r['seam']:.2f}" if "seam" in r else ""
        tgt = f"{r['target']:.0f}" if r.get("target") is not None else ""
        L.append(f"| `{r['id']}` | `{Path(r['file']).name}` | {r['dur']:.2f} | {r['ch']} | {r['lufs']:.1f} | {tgt} | "
                 f"{r['peak']:.1f} | {r['tp']:.1f} | {seam} | {r['kb']:.1f} |")
    L.append("")
    if mrows:
        L += ["## Music", "", "| id | layer | file | s | LUFS | peak | seam | kB | placeholder |",
              "|---|---|---|---:|---:|---:|---:|---:|---|"]
        for r in mrows:
            L.append(f"| `{r['id']}` | {r['layer']} | `{Path(r['file']).name}` | {r['dur']:.1f} | {r['lufs']:.1f} | "
                     f"{r['peak']:.1f} | {r['seam']:.2f} | {r['kb']:.0f} | {r['placeholder']} |")
        L.append("")
    L += ["## Listening checklist", "",
          "Play each file (e.g. open `public/audio/sfx/<file>` in a browser, or in the game). Tick when it sounds "
          "like the description, is pleasant at normal volume on laptop speakers, and nothing startles.", ""]
    for sid in ids:
        info = mani.get(sid, {})
        files = ", ".join(f"`{Path(f).name}`" for f in meta.get(sid, {}).get("files", []))
        loop = " (loop: listen across the seam)" if info.get("loop") else ""
        L.append(f"- [ ] **{sid}** [{info.get('category', '?')}]{loop}: {info.get('description', '')} — {files}")
    L.append("")
    REPORT.write_text("\n".join(L))
    write_listen_page(ids, meta, mani)
    print(f"{len(ids)} ids, {nfiles} files, {total:.2f} MB; {len(problems)} problems, {len(warnings)} warnings")
    for p in problems:
        print("PROBLEM", p)
    for w in warnings:
        print("warning", w)
    print(f"report: {REPORT.relative_to(ROOT)}; audition page: /audio-src/sfx/listen.html on the dev server")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
