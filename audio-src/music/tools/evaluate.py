"""Rank the takes of a piece: evaluate.py <piece>   -> work/<piece>/eval.json and a table.
(After TIME TO LIVE tools/evaluate.py; the dark/minor/club gates of that brief are replaced by this brief's.)

Takes are delivered AS PERFORMED (user rule, 2026-10-04: no conforming, stretching or pitch shifting), so timing
flags only inform the pick; loop points come from the take itself (deliver.py).
Hard rejects (any one): Whisper found lexical words, CLAP vocal > 0.5 in any window, the take ends before the planned
loop boundary, too short a ring-out for a piece that plays once (< 1.5 s), the model transposed a LAYER (calm and
tense should share the key so the crossfade stays in harmony).
Advisory (listed, judged by ear): lost the written plan (a four-bar window fits better shifted by a whole bar), tempo
more than 2 % off the plan, beat drift > 30 ms in a 4-bar window, brief level dips, electronic-leaning windows (CLAP
acoustic < 0.5), transposed singles.
Soft score: 3 x fit (similarity to the piece's own CLAP descriptors) + acoustic - 0.5 x vocal max, plus calm/tense
appropriateness for layers (calm rewards low CLAP intensity, tense rewards high)."""
import json, sys
import numpy as np
from core import (plans, load, take_path, list_takes, load_json, save_json, loudness, band_chroma, env_db, triad,
                  WORK, SR)


def dropouts(m, start, end):
    h = int(0.1 * SR)
    lv = np.array([10 * np.log10(np.mean(m[i:i + h] ** 2) + 1e-10) for i in range(0, len(m) - h, h)])
    out, cur = [], None
    for i in range(15, len(lv) - 15):
        t = i * 0.1
        ref = np.median(lv[i - 15:i + 16])
        dip = ref > -42 and lv[i] < ref - 8 and start <= t <= end
        if dip and cur is None:
            cur = [i, i, ref, lv[i]]
        elif dip:
            cur[1] = i; cur[3] = min(cur[3], lv[i])
        elif cur is not None:
            out.append(cur); cur = None
    bad = []
    for a, b, ref, low in out:
        dur, depth = (b - a + 1) * 0.1, ref - low
        if dur < 2.0 and ((dur >= 0.25 and depth >= 12) or (dur >= 0.2 and depth >= 15)):
            bad.append((round(a * 0.1, 1), round(float(dur), 1), round(float(depth), 1)))
    return bad


def speech_words(pid, version, take):
    f = WORK / "speech" / f"{pid}-{version}-{take}.medium.json"
    if not f.exists():
        return None
    d = json.loads(f.read_text())
    return [r["text"] for r in d["segments"] if r["speech"]]


def evaluate(pid, version, take, judge):
    P = plans.P[pid]
    L = plans.layout(pid)
    al = load_json(WORK / pid / f"{version}-{take}.align.json")
    x, m = load(take_path(pid, version, take))
    bar_t = 4 * al["period"]
    b0 = al["bar0"]
    body_bars = L["bars"] - L["tail"]
    tb = lambda bar: b0 + bar * bar_t
    audible_end = L["loop"][1] if L["loop_ok"] else body_bars
    layered = P["kind"] == "layers"
    rej, adv = [], []
    lost = [b for b in al["lost_bars"] if L["intro"] <= b < audible_end]
    if lost:
        adv.append(f"lost plan ({len(lost)} windows from bar {lost[0]})")
    if abs(al["ratio"] - 1) > 0.02:
        adv.append(f"tempo x{al['ratio']:.4f}")
    ls_, le_ = L["loop"]
    near_loop = {ls_ // 4, max(0, ls_ // 4 - 1), le_ // 4 - 1}
    drift = [w for i, w in enumerate(al["window_residual_ms"]) if i > 0 and w is not None
             and i * 4 < audible_end and abs(w) > (30 if (layered or i in near_loop) else 60)]
    if drift:
        adv.append(f"drift {drift[:4]} ms")
    if not L["loop_ok"] and al["tail_seconds"] < 1.5:
        rej.append(f"tail {al['tail_seconds']} s")
    if L["loop_ok"] and tb(audible_end) > len(m) / SR:
        rej.append("take ends before the loop boundary")
    j = judge.get(f"{version}/{take}", {})
    if j.get("vocal_max", 0) > 0.5:
        rej.append(f"CLAP vocal {j['vocal_max']} at {j.get('vocal_max_at')} s")
    words = speech_words(pid, version, take)
    if words:
        rej.append(f"Whisper words: {words[:2]}")
    if j:
        wins = j.get("windows", [])
        elec = [w["t"] for w in wins if w["acoustic"] < 0.5]
        if elec:
            adv.append(f"electronic-leaning windows at {elec[:6]} s (CLAP acoustic {j['acoustic']})")
    drops = dropouts(m, tb(L["intro"]), tb(audible_end))
    breaks = [(tb(s), tb(s + 4)) for s, name, label in L["sections"] if label == "interlude"]
    planned = [d for d in drops if any(a - 0.5 <= d[0] <= b for a, b in breaks)]
    drops = [d for d in drops if d not in planned]
    if drops:
        adv.append(f"brief level dips to review {drops[:3]}")
    # key: did the model transpose? the take's chroma against the plan's own chord profile at every transposition
    ch = band_chroma(m[max(0, int(tb(0) * SR)):int(tb(body_bars) * SR)], 0.25, 55, 2000).sum(0)
    ch = ch / (np.linalg.norm(ch) + 1e-9)
    prof = np.sum([triad(c) for c, *_r in plans.bars_of(pid, version)], 0)
    corr = [float(np.corrcoef(ch, np.roll(prof, k))[0, 1]) for k in range(12)]
    shift = int(np.argmax(corr))
    best = f"{'+' if shift <= 6 else '-'}{shift if shift <= 6 else 12 - shift} st" if shift else P["key"]
    if shift and corr[shift] - corr[0] > 0.08:
        (rej if layered else adv).append(f"transposed {best} (corr {corr[shift]:.2f} vs {corr[0]:.2f})")
    elif shift:
        best = P["key"] + f" (~{best})"
    lv = loudness(take_path(pid, version, take))
    win_db = []
    for w in range(0, body_bars, 4):
        seg = m[max(0, int(tb(w) * SR)):int(tb(w + 4) * SR)]
        win_db.append(round(float(10 * np.log10(np.mean(seg ** 2) + 1e-10)), 1))
    def seg2(bar):
        return m[max(0, int(tb(bar - 2) * SR)):int(tb(bar) * SR)]
    a, b = seg2(ls_), seg2(le_)
    seam_db = seam_chroma = None
    if L["loop_ok"] and len(a) > SR and len(b) > SR:
        seam_db = round(float(10 * np.log10((np.mean(b ** 2) + 1e-10) / (np.mean(a ** 2) + 1e-10))), 1)
        ca = band_chroma(a, 0.25, 55, 2000).mean(0); cb = band_chroma(b, 0.25, 55, 2000).mean(0)
        seam_chroma = round(float(ca @ cb / (np.linalg.norm(ca) * np.linalg.norm(cb) + 1e-9)), 3)
    score = (3 * j.get("fit", 0) + j.get("acoustic", 0) - 0.5 * j.get("vocal_max", 0)
             - (0.05 if abs(al["ratio"] - 1) > 0.002 else 0.0)
             + (0.5 * j.get("intense", 0.5) if version == "tense" else 0.0)
             + (0.5 * (1 - j.get("intense", 0.5)) if version == "calm" else 0.0))
    return dict(take=f"{version}/{take}", reject=rej, advisory=adv, planned_dips=planned, score=round(score, 3),
                fit=j.get("fit"), fit_min=j.get("fit_min"), acoustic=j.get("acoustic"),
                acoustic_min=j.get("acoustic_min"), intense=j.get("intense"), vocal_max=j.get("vocal_max"),
                speech_checked=words is not None, lufs=lv["lufs"], tp=lv["tp"], lra=lv["lra"], key=best,
                window_db=win_db, seam_db=seam_db, seam_chroma=seam_chroma, ratio=al["ratio"],
                tempo_bpm=al["tempo_bpm"], tail=al["tail_seconds"], duration=al["duration"])


def main():
    pid = sys.argv[1]
    judge = load_json(WORK / pid / "judge.json")
    rows = []
    for version in plans.P[pid]["versions"]:
        for take in list_takes(pid, version):
            if not (WORK / pid / f"{version}-{take}.align.json").exists():
                continue
            rows.append(evaluate(pid, version, take, judge))
    save_json(WORK / pid / "eval.json", rows)
    for r in sorted(rows, key=lambda r: (r["take"].split("/")[0], bool(r["reject"]), -r["score"])):
        print(f"{pid}/{r['take']:10} {'REJECT' if r['reject'] else 'ok    '} score {r['score']:.2f} fit {r['fit']} "
              f"(min {r['fit_min']}) acoustic {r['acoustic']} int {r['intense']} voc {r['vocal_max']} "
              f"tempo {r['tempo_bpm']} {r['lufs']:.1f} LUFS tp {r['tp']:.1f} key {r['key']} seam {r['seam_db']} dB/"
              f"{r['seam_chroma']} speech {'y' if r['speech_checked'] else '-'}"
              f"{'  REJ: ' + '; '.join(r['reject']) if r['reject'] else ''}"
              f"{'  ADV: ' + '; '.join(r['advisory']) if r['advisory'] else ''}")
        print(f"{'':14} window dB {r['window_db']}")


if __name__ == "__main__":
    main()
