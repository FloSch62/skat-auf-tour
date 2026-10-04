"""Fine tuning of conformed layers (cents against A=440 equal temperament): tuning.py <piece> <version>=<take> ...
Spectral peaks (150-2000 Hz) of 1 s frames, their deviation from the nearest semitone, circular mean weighted by
magnitude. Layers that are crossfaded should agree within a few cents (a sharp layer beats against a flat one)."""
import sys
import numpy as np, soundfile as sf
from core import WORK, SR, save_json, load_json

def tuning(m):
    n = 1 << 15
    win = np.hanning(n)
    f = np.fft.rfftfreq(n, 1 / SR)
    band = (f > 150) & (f < 2000)
    angles, weights = [], []
    for a in range(0, len(m) - n, n):
        P = np.abs(np.fft.rfft(m[a:a + n] * win))
        k = np.where(band)[0]
        pk = k[1:-1][(P[k[1:-1]] > P[k[:-2]]) & (P[k[1:-1]] > P[k[2:]])]
        pk = pk[np.argsort(P[pk])[-12:]]
        for i in pk:
            y0, y1, y2 = np.log(P[i - 1] + 1e-12), np.log(P[i] + 1e-12), np.log(P[i + 1] + 1e-12)
            d = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2)
            freq = (i + d) * SR / n
            cents = 1200 * np.log2(freq / 440.0)
            angles.append(2 * np.pi * cents / 100); weights.append(P[i])
    z = np.sum(np.array(weights) * np.exp(1j * np.array(angles)))
    return float(np.angle(z) / (2 * np.pi) * 100), float(abs(z) / np.sum(weights))

pid = sys.argv[1]
res = {}
for a in sys.argv[2:]:
    v, t = a.split("=")
    x, _ = sf.read(WORK / pid / f"{v}-{t}.wav", dtype="float32", always_2d=True)
    c, r = tuning(x.mean(1))
    res[f"{v}/{t}"] = dict(cents=round(c, 1), strength=round(r, 3))
    print(f"{pid}/{v}/{t}: tuning {c:+.1f} cents (concentration {r:.2f})")
cents = [r["cents"] for r in res.values()]
if len(cents) > 1:
    print(f"{pid}: layer tuning spread {max(cents) - min(cents):.1f} cents")
save_json(WORK / pid / "tuning.json", res)
