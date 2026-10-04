"""Deliver picked takes AS PERFORMED: deliver.py <piece> <version>=<take> [...] [--note "why"]

User rule (2026-10-04): no tempo/grid conforming, no time-stretching, no pitch shifting, no re-editing of the music;
only simple mastering and natural loop points. So the native YuE2 recording is kept sample for sample, except:
- Loop points (looped pieces): bar lines of the take itself (align.py: its measured beat line plus the local phase
  of the four-bar windows around the boundary). Planned: right after an earlier occurrence of the body's final
  section (loopStart) and at the end of that final section (loopEnd); choose_loop() also tries every bar line within
  8 bars of both and keeps the pair whose four bars before the two points match best in harmony, rhythm and level
  (bar lines snapped to beats tracked in the take, loopEnd fine-tuned within +-0.2 beat so the jump continues the beat). A 40 ms equal-power blend just before loopEnd
  (into the 40 ms before loopStart) avoids a click; after encoding, both points slide together by up to 5 ms
  inside that blend to where the decoded audio matches best (codec_seam).
- Gentle fades: 10 ms in at the file start, 2 s out at the file end (the take's own ring-out; never inside the loop).
- One constant gain per file: singles to -19 LUFS integrated (measured over the loop for looped pieces, whole file
  otherwise); layered pieces calm -19.5 / tense -18.5. Lowered if the true peak would pass -1.5 dBTP. No compression,
  limiting or EQ.
- Layers of one piece are separate performances (different tempo and length): music.json gets "synced": false and
  per-layer loop points in "layers"; the top-level loopStart/loopEnd/duration are the calm layer's.
Outputs: public/audio/music/<piece>[-<layer>].ogg (48 kHz stereo Vorbis q4, re-measured), lossless masters in
audio-src/music/masters/, public/audio/music.json entry, work/<piece>/deliver.json (provenance and seam report)."""
import hashlib, json, subprocess, sys, tempfile
from pathlib import Path
import numpy as np, soundfile as sf
from core import (plans, load, take_path, load_json, save_json, loudness, onset_flux, band_chroma, WORK, ROOT, FF, SR,
                  MUSIC)

PUB = ROOT / "public" / "audio" / "music"
MASTERS = MUSIC / "masters"
MUSIC_JSON = ROOT / "public" / "audio" / "music.json"
TARGET = {"main": -19.0, "calm": -19.5, "tense": -18.5}
CEIL, QUALITY, BLEND, HOP = -1.5, "4", 0.040, 0.005


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def encode(y, out):
    with tempfile.TemporaryDirectory() as d:
        sf.write(f"{d}/m.wav", y, SR, subtype="FLOAT")
        subprocess.run([FF, "-v", "error", "-y", "-i", f"{d}/m.wav", "-map_metadata", "-1", "-c:a", "libvorbis",
                        "-q:a", QUALITY, "-ar", str(SR), str(out)], check=True)


def decode(path):
    with tempfile.TemporaryDirectory() as d:
        subprocess.run([FF, "-v", "error", "-y", "-i", str(path), "-c:a", "pcm_f32le", f"{d}/o.wav"], check=True)
        z, _ = sf.read(f"{d}/o.wav", dtype="float32", always_2d=True)
        return z


def codec_seam(z, a, b, n=240):
    """Lossy coding renders the two identical stretches before loopStart and loopEnd slightly differently, which can
    leave a small sample step at the jump. Slide both points together back into the blended stretch (up to n samples,
    5 ms; the master is identical there) and keep the offset where the decoded samples before both points agree best.
    Returns (k, step before, step after) with steps in excess of the natural step at loopStart."""
    def cost(k):
        return float(np.abs(z[b + k - 1] - z[a + k - 1]).sum() + 0.5 * np.abs(z[b + k - 2] - z[a + k - 2]).sum())
    def step(k):
        return float(np.abs(z[b + k - 1] - z[a + k]).max())
    k = min(range(-n, 1), key=cost)
    return k, round(step(0), 5), round(step(k), 5), round(float(np.abs(z[a + k - 1] - z[a + k]).max()), 5)


def bar_time(al, b):
    """Take time of bar line b: the global beat line plus the measured local phase of the neighbouring windows."""
    w = al["window_residual_ms"]
    offs = []
    for i in ({b // 4, (b - 1) // 4} if b % 4 == 0 else {b // 4}):
        if 0 <= i < len(w) and w[i] is not None:
            offs.append(w[i] / 1000.0)
    return al["bar0"] + b * 4 * al["period"] + (float(np.mean(offs)) if offs else 0.0)


def rms(x):
    return float(10 * np.log10(np.mean(x ** 2) + 1e-12))


def choose_loop(al, m, L):
    """Natural loop points in the take itself. Candidates: every measured bar line within 8 bars of the planned
    loopStart and loopEnd (a take that dropped or added a bar keeps its phrases a bar or two off the plan), loop at
    least 60 % of the body. For each pair, loopEnd is fine-tuned on the rhythm of the two bars before
    it (within +-0.2 beat, only on clear evidence) against the two bars before loopStart (onset flux); the pair is scored by the harmony of the four bars before
    both points (bar-synchronous chroma) first, then that rhythm match (x0.25: loose, drumless takes have noisy
    onsets) and the level steps before and at the jump. The planned pair gets a small bonus.
    Returns loopStart, loopEnd (seconds) and the report with the five best candidates."""
    bar = 4 * al["period"]
    f = onset_flux(m, HOP)
    f = np.convolve(f, np.exp(-0.5 * (np.arange(-4, 5) / 1.6) ** 2), mode="same")
    C = band_chroma(m, 0.05, 55, 2000)
    body_end = L["bars"] - L["tail"]
    nbars = body_end + 1
    # snap every estimated bar line to the nearest beat tracked in the take (within half a beat: the beat count stays,
    # only the phase is corrected; loose performances can sit a third of a beat off the fitted comb grid)
    import align
    beats, _ = align.track_beats(onset_flux(m, align.HOP), al["period"] / align.HOP)
    def snap(t):
        k = int(np.argmin(np.abs(beats - t)))
        return float(beats[k]) if abs(beats[k] - t) < 0.5 * al["period"] else t
    T = [snap(bar_time(al, b)) for b in range(nbars + 1)]
    B = np.zeros((nbars, 12))
    for k in range(nbars):
        seg = C[max(0, int(T[k] / 0.05)):max(1, int(T[k + 1] / 0.05))]
        if len(seg):
            v = seg.mean(0); B[k] = v / (np.linalg.norm(v) + 1e-12)
    n2 = int(round(2 * bar / HOP))
    def flux_pre(t, shift=0):
        e = int(round(t / HOP)) + shift
        x = f[e - n2:e]
        return (x - x.mean()) / (x.std() + 1e-9)
    ls0, le0 = L["loop"]
    cands = []
    for ls in range(max(L["intro"], ls0 - 8), ls0 + 9):
        for le in range(max(ls + 4, le0 - 8), min(body_end, le0 + 8) + 1):
            if le - ls < 0.6 * (body_end - L["intro"]) or le + 1 > nbars or ls < 4:
                continue
            harm = float(np.mean([B[ls - 1 - i] @ B[le - 1 - i] for i in range(4)]))
            ts, te = T[ls], T[le]
            if int(round(te * SR)) > len(m) - SR:
                continue
            a = flux_pre(ts)
            span = int(0.2 * al["period"] / HOP)             # bar lines are on tracked beats; small refinement only
            corr, k = max((float(np.mean(a * flux_pre(te, k))), k) for k in range(-span, span + 1))
            c0 = float(np.mean(a * flux_pre(te, 0)))
            if corr < 0.5 or corr - c0 < 0.15:          # weak evidence: stay on the tracked beat
                corr, k = c0, 0
            te2 = te + k * HOP
            s_, e_ = int(round(ts * SR)), int(round(te2 * SR))
            nb = int(round(bar * SR))
            lvl = rms(m[e_ - 2 * nb:e_]) - rms(m[s_ - 2 * nb:s_])
            jump = rms(m[s_:s_ + nb]) - rms(m[e_ - nb:e_])
            score = (harm + 0.25 * max(corr, 0.0) - 0.04 * (abs(lvl) + abs(jump)) / 2
                     + (0.03 if (ls, le) == (ls0, le0) else 0.0))
            cands.append(dict(bars=[ls, le], score=round(score, 4), harmony=round(harm, 3), rhythm_corr=round(corr, 3),
                              shift_ms=round(k * HOP * 1000, 1), level_before_db=round(lvl, 1),
                              level_jump_db=round(jump, 1),
                              loop_start=round(ts, 4), loop_end=round(te2, 4)))
    cands.sort(key=lambda c: -c["score"])
    best = dict(cands[0])
    planned = next((c for c in cands if c["bars"] == [ls0, le0]), None)
    best.update(planned_bars=[ls0, le0], planned=planned, alternatives=cands[1:5])
    return best["loop_start"], best["loop_end"], best


def main():
    pid = sys.argv[1]
    args = sys.argv[2:]
    note = ""
    if "--note" in args:
        i = args.index("--note"); note = args[i + 1]; del args[i:i + 2]
    picks = dict(a.split("=") for a in args)
    P = plans.P[pid]
    assert set(picks) == set(P["versions"]), f"pick every version: {list(P['versions'])}"
    L = plans.layout(pid)
    single = P["kind"] == "single"
    PUB.mkdir(parents=True, exist_ok=True)
    MASTERS.mkdir(parents=True, exist_ok=True)
    layers, versions = {}, {}
    for v, t in picks.items():
        al = load_json(WORK / pid / f"{v}-{t}.align.json")
        x, m = load(take_path(pid, v, t))
        y = x.copy()
        bar = 4 * al["period"]
        rep = None
        if L["loop_ok"]:
            ts, te, rep = choose_loop(al, m, L)
            a, b = int(round(ts * SR)), int(round(te * SR))
            nblend = int(round(BLEND * SR))
            w = np.linspace(0, np.pi / 2, nblend, dtype=np.float32)[:, None]
            y[b - nblend:b] = y[b - nblend:b] * np.cos(w) + y[a - nblend:a] * np.sin(w)
            loop_start, loop_end = a / SR, b / SR
            rep.update(loop_start_sample=a, loop_end_sample=b, blend_s=BLEND)
            meas = y[a:b]
        else:
            loop_start, loop_end = 0.0, len(y) / SR
            meas = y
        fi, fo = int(0.01 * SR), int(2.0 * SR)
        y[:fi] *= np.linspace(0, 1, fi, dtype=np.float32)[:, None]
        y[-fo:] *= (np.cos(np.linspace(0, np.pi / 2, fo)) ** 2)[:, None].astype(np.float32)
        lv_loop, lv_file = loudness(meas), loudness(y)
        gain = TARGET["main" if single else v] - lv_loop["lufs"]
        gain = min(gain, CEIL - 0.3 - lv_file["tp"])
        fname = f"{pid}.ogg" if single else f"{pid}-{v}.ogg"
        for attempt in range(6):
            encode(y * 10 ** (gain / 20), PUB / fname)
            d = loudness(PUB / fname)
            if d["tp"] <= CEIL:
                break
            gain -= (d["tp"] - CEIL) + 0.1
        else:
            raise RuntimeError("true-peak check failed")
        flac = MASTERS / (f"{pid}.flac" if single else f"{pid}-{v}.flac")
        sf.write(flac, y * 10 ** (gain / 20), SR, subtype="PCM_24")
        z = decode(PUB / fname)
        if L["loop_ok"]:
            a, b = int(round(loop_start * SR)), int(round(loop_end * SR))
            k, before, after, natural = codec_seam(z, a, b)
            loop_start, loop_end = (a + k) / SR, (b + k) / SR
            rep.update(codec_shift_samples=k, decoded_step_before=before, decoded_step_after=after,
                       decoded_natural_step=natural, loop_start_sample=a + k, loop_end_sample=b + k)
        take_dir = MUSIC / "takes" / pid / v / t
        gen = json.loads((take_dir / "gen.json").read_text())
        layers[v] = dict(loopStart=round(loop_start, 9), loopEnd=round(loop_end, 9), duration=round(len(y) / SR, 6),
                         bpm=round(al["tempo_bpm"], 2))
        versions[v] = dict(take=t, seed=gen["seed"], source=str((take_dir / "audio.flac").relative_to(ROOT)),
                           source_sha256=sha(take_dir / "audio.flac"), measured_bpm=al["tempo_bpm"],
                           plan_bpm=P["bpm"], bar_seconds=round(bar, 6), bar0=al["bar0"], seam=rep,
                           gain_db=round(gain, 2), source_levels=loudness(x), loop_level=lv_loop,
                           delivered=d, master=str(flac.relative_to(ROOT)), master_sha256=sha(flac),
                           delivery=str((PUB / fname).relative_to(ROOT)), delivery_sha256=sha(PUB / fname),
                           bytes=(PUB / fname).stat().st_size, samples=len(y), decoded_samples=len(z),
                           processing="native take; constant gain; 10 ms fade-in, 2 s fade-out at file end"
                                      + ("; 40 ms equal-power blend before loopEnd" if L["loop_ok"] else ""))
    first_v = next(iter(picks)) if single else "calm"
    entry = dict(files={("main" if single else v): f"audio/music/{Path(versions[v]['delivery']).name}" for v in picks},
                 loop=L["loop_ok"], loopStart=layers[first_v]["loopStart"], loopEnd=layers[first_v]["loopEnd"],
                 bpm=layers[first_v]["bpm"], bars=L["bars"], key=P["key"], duration=layers[first_v]["duration"],
                 gainDb=versions[first_v]["gain_db"], takes=dict(picks))
    if not single:
        entry["synced"] = False
        entry["layers"] = layers
    mj = load_json(MUSIC_JSON)
    mj[pid] = entry
    MUSIC_JSON.write_text(json.dumps({k: mj[k] for k in plans.ORDER if k in mj}, indent=1) + "\n")
    save_json(WORK / pid / "deliver.json", dict(piece=pid, note=note, rule="as performed; simple mastering only",
                                                targets=TARGET, ceiling_dbtp=CEIL, quality=QUALITY, layout=L,
                                                entry=entry, versions=versions))
    for v, r in versions.items():
        lp = layers[v]
        s = r["seam"] or {}
        print(f"{pid}/{v}={r['take']}: {lp['duration']:.2f}s @ {lp['bpm']} BPM, loop {lp['loopStart']:.3f}-"
              f"{lp['loopEnd']:.3f} ({lp['loopEnd'] - lp['loopStart']:.1f}s){'' if L['loop_ok'] else ' plays once'}; "
              f"gain {r['gain_db']:+.2f} dB -> {r['delivered']['lufs']:.1f} LUFS (file), tp {r['delivered']['tp']:.1f}, "
              f"{r['bytes'] / 1e6:.2f} MB, decoded {r['decoded_samples']}/{r['samples']}; seam "
              f"{ {k: s.get(k) for k in ('bars', 'planned_bars', 'harmony', 'rhythm_corr', 'shift_ms', 'level_before_db', 'level_jump_db', 'codec_shift_samples', 'decoded_step_before', 'decoded_step_after', 'decoded_natural_step')} }")


if __name__ == "__main__":
    main()
