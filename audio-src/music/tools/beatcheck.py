"""Beat-phase check of delivered loop points: beatcheck.py <piece> [<piece> ...]
Tracks the beats of each delivered layer's source take directly (Ellis DP tracker, align.py) and reports where
loopStart and loopEnd fall relative to the nearest tracked beat (ms, and as a fraction of a beat). A seamless jump
needs both points at the same beat phase: |phase(loopEnd) - phase(loopStart)| small."""
import sys
import numpy as np
from core import plans, load, take_path, load_json, onset_flux, WORK
import align

for pid in sys.argv[1:]:
    d = load_json(WORK / pid / "deliver.json")
    for v, r in d["versions"].items():
        if not r.get("seam"):
            continue
        x, m = load(take_path(pid, v, r["take"]))
        al = load_json(WORK / pid / f"{v}-{r['take']}.align.json")
        period = al["period"]
        beats, _ = align.track_beats(onset_flux(m, align.HOP), period / align.HOP)
        def phase(t):
            k = int(np.argmin(np.abs(beats - t)))
            return (t - beats[k]) * 1000
        ps, pe = phase(r["seam"]["loop_start"]), phase(r["seam"]["loop_end"])
        diff = pe - ps
        print(f"{pid}/{v}: loopStart {ps:+.0f} ms from a beat, loopEnd {pe:+.0f} ms; difference {diff:+.0f} ms "
              f"({diff / (period * 1000):+.2f} beat){'  <-- CHECK' if abs(diff) > 60 else ''}", flush=True)
