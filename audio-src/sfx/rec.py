"""Recorded room ambiences (Freesound field recordings under CC0 / CC-BY), processed into quiet seamless loops.

The synthetic babble did not convince the user, so the inn rooms use real recordings. Sources are Freesound HQ
previews (same licence as the original upload). They are downloaded on first use into the git-ignored cache
`audio-src/logs/freesound/` and pinned by SHA-256, so a re-render either reproduces the delivered file or stops.

Processing (CPU, numpy): pick a calm segment, tame bursts (laughs, shouts) with a slow leveller, high-pass the
rumble, a gentle high-cut so words blur into murmur, narrow the stereo image, optionally thicken with a second
segment of the same room (more voices, none in front), then crossfade the overshoot into the loop start.
synth.py normalises the result (category "room", about -36 LUFS integrated)."""
from __future__ import annotations

import hashlib
import urllib.request
from pathlib import Path

import numpy as np
import soundfile as sf

from dsp import SR, filt, k_weight, loop_xfade, n_

CACHE = Path(__file__).resolve().parents[1] / "logs" / "freesound"

# Every recording used, with its licence. `sha256` pins the exact preview file that was processed.
SOURCES = {
    "fs334140": dict(
        freesound_id=334140, title="German restaurant with a crowd.wav", author="BonnyOrbit",
        url="https://freesound.org/people/BonnyOrbit/sounds/334140/",
        preview="https://cdn.freesound.org/previews/334/334140_5902878-hq.ogg",
        sha256="161b970c2a7b09c716f8704a26c4d3858501053366832093762aaf14d284a7c5",
        license="CC0 1.0", license_url="https://creativecommons.org/publicdomain/zero/1.0/",
        note="Berlin restaurant: people eating, drinking, chatting; glasses and plates, a chair (Zoom H1)."),
    "fs641303": dict(
        freesound_id=641303, title="big crowd in a hall talking", author="Garuda1982",
        url="https://freesound.org/people/Garuda1982/sounds/641303/",
        preview="https://cdn.freesound.org/previews/641/641303_2061858-hq.ogg",
        sha256="7ba6ec6588235e0c4b066eec6880c0a44c940efb04e3d5a71b1d2c75de03a6ad",
        license="CC BY 4.0", license_url="https://creativecommons.org/licenses/by/4.0/",
        note="Big crowd talking in a hall, Gewandhaus Leipzig (Olympus LS-P4, two EM272, AB stereo)."),
    "fs735593": dict(
        freesound_id=735593, title="Restaurant outside by the river atmosphere with people talking",
        author="Garuda1982", url="https://freesound.org/people/Garuda1982/sounds/735593/",
        preview="https://cdn.freesound.org/previews/735/735593_2061858-hq.ogg",
        sha256="fcd318b0a5d389e7308c1ea2d90cb4e04b9de965d2d3e26d5cacd70ab4902884",
        license="CC BY 4.0", license_url="https://creativecommons.org/licenses/by/4.0/",
        note="Outdoor restaurant by the river, Leipzig, 15 April 2024, evening; voices and birds (Sony PCM-M10)."),
}


def fetch(key: str) -> Path:
    """Path of the cached preview for SOURCES[key]; downloads it if missing and checks its SHA-256 pin."""
    s = SOURCES[key]
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / s["preview"].rsplit("/", 1)[-1]
    if not path.exists() or path.stat().st_size == 0:
        req = urllib.request.Request(s["preview"], headers={"User-Agent": "skat-auf-tour audio build"})
        path.write_bytes(urllib.request.urlopen(req, timeout=120).read())
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if s.get("sha256") and digest != s["sha256"]:
        raise RuntimeError(f"{path.name}: SHA-256 {digest} does not match the pinned {s['sha256']}")
    s["sha256_seen"] = digest
    return path


def load(key: str) -> np.ndarray:
    x, sr = sf.read(str(fetch(key)), always_2d=True)
    if sr != SR:  # band-limited resampling in the frequency domain
        n = int(round(len(x) * SR / sr))
        X = np.fft.rfft(x, axis=0)
        m = n // 2 + 1
        Y = np.zeros((m, x.shape[1]), complex)
        k = min(m, len(X))
        Y[:k] = X[:k]
        x = np.fft.irfft(Y, n, axis=0) * (n / len(x))
    if x.shape[1] == 1:
        x = np.repeat(x, 2, axis=1)
    return x[:, :2]


def level(x: np.ndarray, above_db: float = 3.0, ratio: float = 3.0, attack: float = 0.12,
          release: float = 0.6) -> np.ndarray:
    """Slow leveller: K-weighted 400 ms loudness above (median + above_db) is reduced by `ratio`.

    Takes the edge off laughs and shouts without pumping the murmur."""
    y = k_weight(x)
    p = (y * y).sum(axis=1)
    hop, w = n_(0.05), n_(0.4)
    c = np.concatenate([[0], np.cumsum(p)])
    centres = np.arange(0, len(p), hop)
    a = np.clip(centres - w // 2, 0, len(p))
    b = np.clip(centres + w // 2, 0, len(p))
    lk = 10 * np.log10((c[b] - c[a]) / np.maximum(b - a, 1) + 1e-12)
    thr = np.median(lk) + above_db
    want = -(1 - 1 / ratio) * np.maximum(lk - thr, 0)
    gr = np.zeros_like(want)
    g = 0.0
    ka, kr = np.exp(-0.05 / attack), np.exp(-0.05 / release)
    for i, t in enumerate(want):
        g = ka * g + (1 - ka) * t if t < g else kr * g + (1 - kr) * t
        gr[i] = g
    gain = 10 ** (np.interp(np.arange(len(x)), centres, gr) / 20)
    return x * gain[:, None]


def width(x: np.ndarray, w: float) -> np.ndarray:
    mid = (x[:, 0] + x[:, 1]) / 2
    side = (x[:, 0] - x[:, 1]) / 2 * w
    return np.stack([mid + side, mid - side], axis=1)


def room_loop(rng, source: str, start: float, length: float = 30.0, xfade: float = 3.0, highcut: float = 2200.0,
              lowcut: float = 110.0, stereo_width: float = 0.5, thicken: float | None = None,
              thicken_gain_db: float = -5.0, leveller: tuple = (3.0, 3.0), presence_db: float = -3.0):
    """A seamless room-tone loop of `length` seconds from SOURCES[source], segment starting at `start` s.

    thicken: start (s) of a second segment of the same recording mixed underneath, so that more voices overlap and
    no single one stays in front. The loop is rendered `xfade` seconds long and its overshoot crossfaded into the
    start (equal power, uncorrelated material)."""
    x = load(source)
    a, b = n_(start), n_(start + length + xfade)
    if b > len(x):
        raise ValueError(f"{source}: segment {start}+{length + xfade}s exceeds {len(x) / SR:.1f}s")
    seg = x[a:b].copy()
    if thicken is not None:
        c, d = n_(thicken), n_(thicken + length + xfade)
        if d > len(x):
            raise ValueError(f"{source}: thicken segment exceeds the recording")
        seg = seg + x[c:d][:, ::-1] * 10 ** (thicken_gain_db / 20)  # channels swapped: voices move apart
    seg = level(seg, *leveller)
    seg = filt(seg, ("hp", lowcut, 0.7071), ("lp", highcut, 0.7071, 2), ("hs", 1200, presence_db),
               ("ls", 250, 1.0))
    seg = width(seg, stereo_width)
    return loop_xfade(seg, xfade)
