"""DSP primitives for SKAT AUF TOUR's procedural sound effects (numpy only, no scipy, no GPU).

Conventions
- SR = 44100. Signals are float64 numpy arrays: mono 1-D, stereo shape (n, 2).
- Filters run in the frequency domain with the exact response of RBJ biquads evaluated on the unit circle.
  One-shots are zero-padded (no wrap-around); loops use `circular=True`, which makes the filtered loop seamless.
- Everything random takes an explicit `np.random.Generator`, so every render is deterministic for a seed.
"""
from __future__ import annotations

import numpy as np

SR = 44100
TAU = 2 * np.pi


# ─── time and control curves ─────────────────────────────────────────────────────────────────────────────

def n_(sec: float) -> int:
    return max(0, int(round(sec * SR)))


def tt(n: int) -> np.ndarray:
    return np.arange(n) / SR


def zeros(sec: float, stereo: bool = False) -> np.ndarray:
    return np.zeros((n_(sec), 2) if stereo else n_(sec))


def ctrl(n: int, pts, kind: str = "cos") -> np.ndarray:
    """Control curve of n samples through (time_sec, value) points; 'lin', 'cos' (smooth) or 'exp' (log-domain)."""
    pts = sorted(pts)
    ts = np.array([p[0] for p in pts], float)
    vs = np.array([p[1] for p in pts], float)
    t = tt(n)
    if kind == "exp":
        return np.exp(np.interp(t, ts, np.log(np.maximum(vs, 1e-9))))
    if kind == "lin" or len(pts) < 2:
        return np.interp(t, ts, vs)
    # cosine interpolation between successive points
    idx = np.clip(np.searchsorted(ts, t, side="right") - 1, 0, len(ts) - 2)
    t0, t1 = ts[idx], ts[idx + 1]
    v0, v1 = vs[idx], vs[idx + 1]
    u = np.clip((t - t0) / np.maximum(t1 - t0, 1e-12), 0, 1)
    u = 0.5 - 0.5 * np.cos(np.pi * u)
    return v0 + (v1 - v0) * u


def env_hit(n: int, attack: float = 0.001, tau: float = 0.05, hold: float = 0.0) -> np.ndarray:
    """Raised-cosine attack, optional hold, exponential decay with time constant tau (seconds)."""
    t = tt(n)
    a = max(attack, 1.0 / SR)
    e = np.where(t < a, 0.5 - 0.5 * np.cos(np.pi * np.clip(t / a, 0, 1)), 1.0)
    d = np.clip(t - a - hold, 0, None)
    return e * np.exp(-d / max(tau, 1e-5))


def env_ar(n: int, attack: float, release: float, curve: float = 1.0) -> np.ndarray:
    """Smooth swell: cosine rise over `attack`, cosine fall over `release`, sustain between (fills n)."""
    e = np.ones(n)
    na, nr = min(n_(attack), n), min(n_(release), n)
    if na:
        e[:na] = 0.5 - 0.5 * np.cos(np.pi * np.arange(na) / na)
    if nr:
        e[n - nr:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(nr) / nr)
    return e ** curve


def bump(n: int, peak: float = 0.5, power: float = 1.0) -> np.ndarray:
    """A single smooth hump over n samples, maximum at fraction `peak` (0..1)."""
    u = np.linspace(0, 1, n, endpoint=False) if n else np.zeros(0)
    p = min(max(peak, 0.02), 0.98)
    left = np.sin(0.5 * np.pi * np.clip(u / p, 0, 1)) ** 2
    right = np.cos(0.5 * np.pi * np.clip((u - p) / (1 - p), 0, 1)) ** 2
    return np.where(u < p, left, right) ** power


# ─── noise and modulation ───────────────────────────────────────────────────────────────────────────────

def _fastlen(n: int) -> int:
    """Smallest 2^a 3^b 5^c >= n (fast FFT sizes)."""
    best = 1 << int(np.ceil(np.log2(max(n, 1))))
    f5 = 1
    while f5 < best:
        f35 = f5
        while f35 < best:
            f = f35
            while f < n:
                f *= 2
            best = min(best, f)
            f35 *= 3
        f5 *= 5
    return best


def white(rng: np.random.Generator, n: int) -> np.ndarray:
    return rng.standard_normal(n)


def colored(rng: np.random.Generator, n: int, slope_db_oct: float = -3.0, f_ref: float = 1000.0) -> np.ndarray:
    """Noise with a spectral slope (dB/octave): -3 pink, -6 brown-ish, 0 white. Circular, unit RMS."""
    x = rng.standard_normal(n)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    f[0] = f[1] if n > 1 else 1.0
    X *= (f / f_ref) ** (slope_db_oct / 6.0206)
    y = np.fft.irfft(X, n)
    return y / (np.std(y) + 1e-12)


def wobble(rng: np.random.Generator, n: int, rate: float, circular: bool = True) -> np.ndarray:
    """Smooth random modulation, unit standard deviation, bandwidth about `rate` Hz (Gaussian spectrum)."""
    m = n if circular else _fastlen(n + n_(2.0 / max(rate, 0.05)))
    x = rng.standard_normal(m)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(m, 1 / SR)
    X *= np.exp(-0.5 * (f / max(rate, 1e-3)) ** 2)
    X[0] = 0
    y = np.fft.irfft(X, m)[:n]
    s = np.std(y)
    return y / s if s > 0 else y


# ─── frequency-domain filters ───────────────────────────────────────────────────────────────────────────

def _biquad(kind: str, f: float, q: float, gain: float):
    f = min(max(f, 1.0), SR * 0.495)
    w0 = TAU * f / SR
    c, s = np.cos(w0), np.sin(w0)
    alpha = s / (2 * q)
    A = 10 ** (gain / 40)
    if kind == "lp":
        b, a = [(1 - c) / 2, 1 - c, (1 - c) / 2], [1 + alpha, -2 * c, 1 - alpha]
    elif kind == "hp":
        b, a = [(1 + c) / 2, -(1 + c), (1 + c) / 2], [1 + alpha, -2 * c, 1 - alpha]
    elif kind == "bp":
        b, a = [alpha, 0.0, -alpha], [1 + alpha, -2 * c, 1 - alpha]
    elif kind == "notch":
        b, a = [1.0, -2 * c, 1.0], [1 + alpha, -2 * c, 1 - alpha]
    elif kind == "peak":
        b, a = [1 + alpha * A, -2 * c, 1 - alpha * A], [1 + alpha / A, -2 * c, 1 - alpha / A]
    elif kind in ("ls", "hs"):
        sq = 2 * np.sqrt(A) * alpha
        if kind == "ls":
            b = [A * ((A + 1) - (A - 1) * c + sq), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - sq)]
            a = [(A + 1) + (A - 1) * c + sq, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - sq]
        else:
            b = [A * ((A + 1) + (A - 1) * c + sq), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sq)]
            a = [(A + 1) - (A - 1) * c + sq, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sq]
    else:
        raise ValueError(kind)
    return np.array(b, float), np.array(a, float)


def response(specs, freqs: np.ndarray) -> np.ndarray:
    """Complex response of a cascade of filter specs at `freqs` (Hz).

    Specs: ("lp"|"hp", f[, q]), ("bp", f, q), ("notch", f, q), ("peak", f, q, dB), ("ls"|"hs", f, dB[, q]),
    ("lp1"|"hp1", f) one-pole, ("tilt", dB_per_octave[, f_ref]) zero-phase slope, ("gain", dB).
    A trailing int n in lp/hp specs repeats the stage: ("lp", 800, 0.707, 2)."""
    H = np.ones(len(freqs), complex)
    z1 = np.exp(-1j * TAU * freqs / SR)
    for spec in specs:
        kind = spec[0]
        if kind in ("lp", "hp", "bp", "notch"):
            f = spec[1]
            q = spec[2] if len(spec) > 2 else 0.7071
            reps = spec[3] if len(spec) > 3 else 1
            b, a = _biquad(kind, f, q, 0.0)
            h = (b[0] + b[1] * z1 + b[2] * z1 * z1) / (a[0] + a[1] * z1 + a[2] * z1 * z1)
            H *= h ** reps
        elif kind == "peak":
            b, a = _biquad("peak", spec[1], spec[2], spec[3])
            H *= (b[0] + b[1] * z1 + b[2] * z1 * z1) / (a[0] + a[1] * z1 + a[2] * z1 * z1)
        elif kind in ("ls", "hs"):
            q = spec[3] if len(spec) > 3 else 0.7071
            b, a = _biquad(kind, spec[1], q, spec[2])
            H *= (b[0] + b[1] * z1 + b[2] * z1 * z1) / (a[0] + a[1] * z1 + a[2] * z1 * z1)
        elif kind == "lp1":
            H *= 1.0 / (1.0 + 1j * freqs / spec[1])
        elif kind == "hp1":
            H *= (1j * freqs / spec[1]) / (1.0 + 1j * freqs / spec[1])
        elif kind == "tilt":
            fr = spec[2] if len(spec) > 2 else 1000.0
            H *= (np.maximum(freqs, 10.0) / fr) ** (spec[1] / 6.0206)
        elif kind == "gain":
            H *= 10 ** (spec[1] / 20)
        else:
            raise ValueError(kind)
    return H


def filt(x: np.ndarray, *specs, circular: bool = False, tail: float = 0.25) -> np.ndarray:
    """Filter x (mono or stereo) by a cascade of specs. Same length as x. Zero-padded unless circular."""
    if x.ndim == 2:
        return np.stack([filt(x[:, c], *specs, circular=circular, tail=tail) for c in range(x.shape[1])], axis=1)
    n = len(x)
    if n == 0:
        return x.copy()
    m = n if circular else _fastlen(n + n_(tail))
    X = np.fft.rfft(x, m)
    H = response(specs, np.fft.rfftfreq(m, 1 / SR))
    return np.fft.irfft(X * H, m)[:n]


def bandnoise(rng, n: int, *specs, slope: float = 0.0, circular: bool = False) -> np.ndarray:
    x = colored(rng, n, slope) if slope else rng.standard_normal(n)
    return filt(x, *specs, circular=circular)


def stft_filter(x: np.ndarray, gain_fn, n_fft: int = 1024, hop: int = 256, circular: bool = False) -> np.ndarray:
    """Time-varying zero-phase filter: gain_fn(freqs[None, :], times[:, None]) -> gains (frames, bins).

    Weighted overlap-add with sqrt-Hann windows (75 % overlap). Use for noise sources whose colour changes."""
    if x.ndim == 2:
        return np.stack([stft_filter(x[:, c], gain_fn, n_fft, hop, circular) for c in range(2)], axis=1)
    n = len(x)
    win = np.sqrt(0.5 - 0.5 * np.cos(TAU * np.arange(n_fft) / n_fft))
    if circular:
        starts = np.arange(0, n, hop)
        idx = (starts[:, None] - n_fft // 2 + np.arange(n_fft)[None, :]) % n
        frames = x[idx] * win
        times = starts / SR
    else:
        pad = n_fft
        xp = np.concatenate([np.zeros(pad), x, np.zeros(pad)])
        starts = np.arange(0, n + pad, hop)
        idx = starts[:, None] + np.arange(n_fft)[None, :]
        idx = np.minimum(idx, len(xp) - 1)
        frames = xp[idx] * win
        times = (starts + n_fft / 2 - pad) / SR
    X = np.fft.rfft(frames, axis=1)
    freqs = np.fft.rfftfreq(n_fft, 1 / SR)
    G = gain_fn(freqs[None, :], times[:, None])
    Y = np.fft.irfft(X * G, n_fft, axis=1) * win
    norm = 1.0 / (n_fft / hop / 2)  # sum of hann at 75 % overlap = 2
    if circular:
        out = np.bincount(idx.ravel(), weights=Y.ravel(), minlength=n)
        wsum = np.bincount(idx.ravel(), weights=np.broadcast_to(win * win, idx.shape).ravel(), minlength=n)
        return out / np.maximum(wsum, 1e-9)
    out = np.zeros(len(xp) + n_fft)
    for i, s in enumerate(starts):
        out[s:s + n_fft] += Y[i]
    return out[pad:pad + n] * norm


def resonance_gain(freqs, fc, q, floor: float = 0.0):
    """Magnitude of a 2-pole band-pass (peak 1 at fc) for arrays (broadcast), plus a floor."""
    r = freqs / np.maximum(fc, 1.0)
    g = 1.0 / np.sqrt(1.0 + (q * (r - 1.0 / np.maximum(r, 1e-6))) ** 2)
    return floor + (1 - floor) * g


def formant_mag(f, formants):
    """Klatt-style cascade of resonators: product of F^2 / sqrt((F^2-f^2)^2 + (B f)^2). 1 at DC, Q at F."""
    g = 1.0
    for F, B in formants:
        F2 = F * F
        g = g * F2 / np.sqrt((F2 - f * f) ** 2 + (B * f) ** 2)
    return g


# ─── oscillators and synthesis ──────────────────────────────────────────────────────────────────────────

def phase(freq: np.ndarray, ph0: float = 0.0) -> np.ndarray:
    """Running phase in radians for a per-sample frequency array."""
    return ph0 + TAU * np.cumsum(freq) / SR


def voiced(f0: np.ndarray, amp: np.ndarray, formants=None, tilt: float = 1.0, fmax: float = 7000.0,
           rng=None, sub: float = 0.0, odd: float = 1.0, phases: str = "zero", formant_floor: float = 0.0,
           harm_fn=None) -> np.ndarray:
    """Band-limited additive harmonic source shaped by formants.

    f0, amp: per-sample arrays. formants: list of (F, B) per-sample arrays or scalars (cascade, see formant_mag).
    tilt: harmonic k gets k^-tilt. sub: amount of half-harmonics (period doubling, roughness).
    odd: multiplier on even harmonics' complement, i.e. even harmonics get factor `odd` (<1 = hollow/clarinet).
    harm_fn(k, fk) -> extra per-harmonic gain (array or scalar)."""
    n = len(f0)
    ph = phase(f0)
    out = np.zeros(n)
    fmin = max(float(np.min(f0)), 20.0)
    kmax = int(min(fmax, SR * 0.45) / fmin) + 1
    lim = min(fmax, SR * 0.45)
    steps = [(k, 1.0) for k in range(1, kmax + 1)]
    if sub > 0:
        steps += [(k + 0.5, sub) for k in range(0, kmax)]
    for k, w in steps:
        fk = k * f0
        taper = np.clip((lim - fk) / (0.08 * lim), 0.0, 1.0)
        if not taper.any():
            continue
        g = w * taper * (k ** -tilt)
        if float(k).is_integer() and int(k) % 2 == 0:
            g = g * odd
        if formants is not None:
            g = g * (formant_floor + formant_mag(fk, formants))
        if harm_fn is not None:
            g = g * harm_fn(k, fk)
        p0 = 0.0 if phases == "zero" or rng is None else rng.uniform(0, TAU)
        out += g * np.sin(k * ph + p0)
    return out * amp


def modes(n: int, freqs, amps, taus, rng=None, tc: float = 0.0, attack: float = 0.0003,
          split: float = 0.0, rand_phase: bool = False) -> np.ndarray:
    """Modal (struck object) synthesis: sum of exponentially decaying sinusoids.

    tc: contact time of the strike in seconds (soft strikes lose high modes).
    split: relative frequency split for doublets (beating), e.g. 0.0004."""
    t = tt(n)
    out = np.zeros(n)
    for f, a, tau in zip(freqs, amps, taus):
        if f >= SR * 0.47 or a == 0:
            continue
        w = 1.0
        if tc > 0:
            w = 1.0 / (1.0 + (f * tc * 1.6) ** 4) ** 0.5
        p = rng.uniform(0, TAU) if (rand_phase and rng is not None) else 0.0
        dec = np.exp(-t / max(tau, 1e-5))
        if split > 0:
            out += a * w * dec * 0.5 * (np.sin(TAU * f * t + p) + np.sin(TAU * f * (1 + split) * t + p))
        else:
            out += a * w * dec * np.sin(TAU * f * t + p)
    if attack > 0:
        na = min(n_(attack), n)
        if na > 1:
            out[:na] *= 0.5 - 0.5 * np.cos(np.pi * np.arange(na) / na)
    nf = min(n_(0.08), n // 4)  # never end a ringing buffer with a cut
    if nf > 1:
        out[n - nf:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(nf) / nf)
    return out


def q_tau(f, q):
    """Decay time constant of a mode with quality factor q."""
    return q / (np.pi * np.asarray(f, float))


def burst(rng, n: int, attack: float, tau: float, *specs, slope: float = 0.0) -> np.ndarray:
    """Filtered noise burst with a hit envelope (attack, exp decay)."""
    x = colored(rng, n, slope) if slope else rng.standard_normal(n)
    x = x * env_hit(n, attack, tau)
    return filt(x, *specs) if specs else x


def place(buf: np.ndarray, x: np.ndarray, at: float | int, gain: float = 1.0, circular: bool = False,
          pan: float | None = None) -> np.ndarray:
    """Add x into buf starting at `at` (seconds if float, samples if int). Stereo buf + mono x → panned."""
    i0 = at if isinstance(at, (int, np.integer)) else n_(at)
    if buf.ndim == 2 and x.ndim == 1:
        x = panned(x, 0.0 if pan is None else pan)
    elif buf.ndim == 2 and pan is not None and x.ndim == 2:
        x = x * np.array(_pan_gains(pan))[None, :] * np.sqrt(2)
    L = len(buf)
    if circular:
        idx = (i0 + np.arange(len(x))) % L
        if buf.ndim == 2:
            np.add.at(buf, idx, x * gain)
        else:
            np.add.at(buf, idx, x * gain)
        return buf
    if i0 >= L:
        return buf
    m = min(len(x), L - i0)
    if i0 < 0:
        x = x[-i0:]
        m = min(len(x), L)
        i0 = 0
    buf[i0:i0 + m] += x[:m] * gain
    return buf


def _pan_gains(p: float):
    a = (min(max(p, -1.0), 1.0) + 1) * np.pi / 4
    return np.cos(a), np.sin(a)


def panned(x: np.ndarray, p: float) -> np.ndarray:
    """Equal-power pan of a mono signal to stereo (0 = centre keeps the mono level in each channel)."""
    gl, gr = _pan_gains(p)
    k = np.sqrt(2)
    return np.stack([x * gl * k, x * gr * k], axis=1)


def mix(*xs) -> np.ndarray:
    """Sum signals of different lengths (all mono or all stereo)."""
    n = max(len(x) for x in xs)
    shape = (n, 2) if xs[0].ndim == 2 else (n,)
    out = np.zeros(shape)
    for x in xs:
        out[:len(x)] += x
    return out


def soft(x: np.ndarray, drive: float = 1.0) -> np.ndarray:
    """Gentle tanh saturation, unity small-signal gain."""
    if drive <= 0:
        return x
    return np.tanh(x * drive) / drive


def resample(x: np.ndarray, ratio: float) -> np.ndarray:
    """Speed change by `ratio` (>1 = higher and shorter), linear interpolation (fine for noisy material)."""
    n = len(x)
    m = max(1, int(n / ratio))
    pos = np.arange(m) * ratio
    if x.ndim == 2:
        return np.stack([np.interp(pos, np.arange(n), x[:, c]) for c in range(2)], axis=1)
    return np.interp(pos, np.arange(n), x)


def pulse_train(rng, n: int, times_s, amps, shape: np.ndarray, circular: bool = False) -> np.ndarray:
    """Place `shape` at each time with amplitude."""
    out = np.zeros(n)
    for t0, a in zip(times_s, amps):
        place(out, shape, int(round(t0 * SR)), a, circular=circular)
    return out


def conv(x: np.ndarray, ir: np.ndarray, circular: bool = False) -> np.ndarray:
    """FFT convolution; mono x with mono or stereo IR (→ stereo), same length as x (+ tail if not circular)."""
    if ir.ndim == 2:
        if x.ndim == 2:
            return np.stack([conv(x[:, c], ir[:, c], circular) for c in range(2)], axis=1)
        return np.stack([conv(x, ir[:, c], circular) for c in range(2)], axis=1)
    if x.ndim == 2:
        return np.stack([conv(x[:, c], ir, circular) for c in range(2)], axis=1)
    n = len(x)
    if circular:
        m = n
        irc = np.zeros(n)
        k = min(len(ir), n)
        irc[:k] = ir[:k]
        if len(ir) > n:  # fold longer IRs
            for s in range(n, len(ir), n):
                seg = ir[s:s + n]
                irc[:len(seg)] += seg
        return np.fft.irfft(np.fft.rfft(x) * np.fft.rfft(irc), m)
    m = _fastlen(n + len(ir))
    return np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:n + len(ir) - 1]


def room_ir(rng, rt60: float = 0.5, hf_rt: float = 0.5, predelay: float = 0.004, stereo: bool = False,
            lp: float = 9000.0, hp: float = 80.0, early: int = 6, size: float = 1.0) -> np.ndarray:
    """Synthetic room impulse response (unit energy, no direct sound).

    rt60: low/mid reverberation time. hf_rt: fraction of rt60 at 8 kHz (air and soft furnishings).
    early: number of discrete early reflections within ~25 ms * size."""
    dur = rt60 * 1.15 + predelay + 0.05
    n = n_(dur)
    chans = []
    for _ in range(2 if stereo else 1):
        x = rng.standard_normal(n)
        ts = tt(n) - predelay
        x[ts < 0] = 0

        def g(fr, tm, _rt=rt60):
            rt = _rt * (hf_rt + (1 - hf_rt) / (1 + (fr / 2500.0) ** 1.5))
            tm = np.maximum(tm - predelay, 0)
            return np.exp(-6.9078 * tm / rt)

        y = stft_filter(x, g, 512, 128)
        # soft onset of the diffuse tail
        ramp = np.clip((ts) / (0.012 * size + 1e-4), 0, 1)
        y *= ramp
        for _ in range(early):
            te = predelay + rng.uniform(0.002, 0.025 * size)
            i = n_(te)
            if i < n:
                y[i] += rng.choice([-1, 1]) * rng.uniform(0.6, 1.4) * np.exp(-6.9078 * te / rt60) * 6
        y = filt(y, ("lp", lp), ("hp", hp))
        chans.append(y / np.sqrt(np.sum(y * y) + 1e-12))
    return np.stack(chans, axis=1) if stereo else chans[0]


def reverb(x: np.ndarray, rng, rt60: float = 0.4, wet: float = 0.15, stereo: bool | None = None,
           circular: bool = False, **kw) -> np.ndarray:
    """Dry + wet room. Mono input with stereo=True gives a stereo result. Wet level is energy-relative."""
    st = (x.ndim == 2) if stereo is None else stereo
    ir = room_ir(rng, rt60, stereo=st, **kw)
    if not circular:  # never let a truncated dry buffer end in a cut (would click through the room)
        x = x.copy()
        k = min(n_(0.03), len(x))
        r = 0.5 + 0.5 * np.cos(np.pi * np.arange(k) / k)
        x[len(x) - k:] *= r[:, None] if x.ndim == 2 else r
    w = conv(x, ir, circular=circular)
    if circular:
        dry = np.stack([x, x], axis=1) if (w.ndim == 2 and x.ndim == 1) else x
        return dry * np.sqrt(1 - wet * wet) + w * wet
    n = len(w)
    if w.ndim == 2 and x.ndim == 1:
        dry = np.zeros((n, 2))
        dry[:len(x), 0] = x
        dry[:len(x), 1] = x
    else:
        dry = np.zeros((n,) + x.shape[1:])
        dry[:len(x)] = x
    return dry * np.sqrt(max(1 - wet * wet, 0)) + w * wet


# ─── loudness, trimming, loops ──────────────────────────────────────────────────────────────────────────

def k_weight(x: np.ndarray, circular: bool = False) -> np.ndarray:
    return filt(x, ("hs", 1681.97, 3.9998, 0.7072), ("hp", 38.135, 0.5003), circular=circular, tail=0.05)


def _ms_channels(x: np.ndarray, circular: bool = False) -> np.ndarray:
    y = k_weight(x, circular)
    if y.ndim == 1:
        return y * y
    return np.sum(y * y, axis=1)


def loudness_max(x: np.ndarray, win: float = 0.2, circular: bool = False) -> float:
    """Maximum short-window K-weighted loudness ("LUFS-ish", default 200 ms window). For one-shots."""
    p = _ms_channels(x, circular)
    w = max(1, n_(win))
    if len(p) < w:
        p = np.concatenate([p, np.zeros(w - len(p))])
    c = np.concatenate([[0], np.cumsum(p)])
    ms = (c[w:] - c[:-w]) / w
    return float(-0.691 + 10 * np.log10(np.max(ms) + 1e-20))


def loudness_integrated(x: np.ndarray, circular: bool = True) -> float:
    """BS.1770-style gated integrated loudness (400 ms blocks, 75 % overlap, -70 / -10 LU gates)."""
    p = _ms_channels(x, circular)
    w, hop = n_(0.4), n_(0.1)
    if circular:
        p = np.concatenate([p, p[:w]])
    if len(p) < w:
        return loudness_max(x, 0.4)
    c = np.concatenate([[0], np.cumsum(p)])
    starts = np.arange(0, len(p) - w + 1, hop)
    ms = (c[starts + w] - c[starts]) / w
    lk = -0.691 + 10 * np.log10(ms + 1e-20)
    ms = ms[lk > -70]
    if len(ms) == 0:
        return -70.0
    rel = -0.691 + 10 * np.log10(np.mean(ms) + 1e-20) - 10
    ms2 = ms[(-0.691 + 10 * np.log10(ms + 1e-20)) > rel]
    return float(-0.691 + 10 * np.log10(np.mean(ms2) + 1e-20))


def true_peak(x: np.ndarray, over: int = 4) -> float:
    """Approximate true peak (linear) via FFT oversampling."""
    if x.ndim == 2:
        return max(true_peak(x[:, c], over) for c in range(x.shape[1]))
    n = len(x)
    if n < 4:
        return float(np.max(np.abs(x))) if n else 0.0
    m = _fastlen(n + 64)
    X = np.fft.rfft(x, m)
    y = np.fft.irfft(X, m * over) * over
    return float(np.max(np.abs(y)))


def db(v: float) -> float:
    return 20 * np.log10(max(v, 1e-12))


def undb(d: float) -> float:
    return 10 ** (d / 20)


def trim(x: np.ndarray, floor_db: float = -62.0, pre: float = 0.008, post: float = 0.01,
         fade_in: float = 0.0015, fade_out: float = 0.02) -> np.ndarray:
    """Remove leading/trailing near-silence (relative to peak) and apply short raised-cosine fades."""
    mono = np.max(np.abs(x), axis=1) if x.ndim == 2 else np.abs(x)
    pk = np.max(mono) if len(mono) else 0
    if pk <= 0:
        return x[:1]
    thr = pk * undb(floor_db)
    idx = np.nonzero(mono > thr)[0]
    i0 = idx[0] - n_(pre)
    i1 = min(len(x), idx[-1] + n_(post))
    y = x[max(i0, 0):i1].copy()
    if i0 < 0:  # keep a few ms of true silence in front (codec pre-echo lands there, not on sample 0)
        y = np.concatenate([np.zeros((-i0,) + y.shape[1:]), y])
    nfi, nfo = min(n_(fade_in), len(y)), min(n_(fade_out), len(y))
    if nfi > 1:
        r = 0.5 - 0.5 * np.cos(np.pi * np.arange(nfi) / nfi)
        y[:nfi] *= r[:, None] if y.ndim == 2 else r
    if nfo > 1:
        r = 0.5 + 0.5 * np.cos(np.pi * np.arange(nfo) / nfo)
        y[-nfo:] *= r[:, None] if y.ndim == 2 else r
    return y


def dc_block(x: np.ndarray, circular: bool = False, f: float = 20.0) -> np.ndarray:
    return filt(x, ("hp", f, 0.7071), circular=circular, tail=0.1)


def loop_xfade(x: np.ndarray, xfade: float) -> np.ndarray:
    """Make a seamless loop from a signal rendered `xfade` seconds longer than the loop.

    The overshoot is equal-power crossfaded into the start, so sample L-1 flows into sample 0."""
    k = n_(xfade)
    L = len(x) - k
    y = x[:L].copy()
    u = np.arange(k) / k
    fin = np.sin(0.5 * np.pi * u)
    fout = np.cos(0.5 * np.pi * u)
    if x.ndim == 2:
        fin, fout = fin[:, None], fout[:, None]
    y[:k] = x[:k] * fin + x[L:L + k] * fout
    return y


def seam_score(x: np.ndarray, win: float = 0.001) -> float:
    """Click metric for a loop seam (wrap from the last sample to the first).

    Energy of the second difference in a ~1 ms window centred on the seam, relative to the 99.9th percentile of
    the same measure over every position of the loop. A discontinuity stands out far above anything else
    (score >> 1); a seamless loop scores below ~1 even when a transient happens to sit on the seam."""
    mono = x.mean(axis=1) if x.ndim == 2 else x
    L = len(mono)
    d2 = (np.roll(mono, -1) - 2 * mono + np.roll(mono, 1)) ** 2  # circular: index i ↔ sample i
    w = max(4, n_(win))
    c = np.concatenate([[0], np.cumsum(np.concatenate([d2, d2[:w]]))])
    sums = c[w:w + L] - c[:L]  # window starting at each position (wrapping)
    seam = sums[(L - w // 2) % L]  # window centred on the wrap from sample L-1 to sample 0
    ref = np.percentile(sums, 99.9)
    return float(np.sqrt(seam / (ref + 1e-20)))


def norm(x: np.ndarray, peak: float = 1.0) -> np.ndarray:
    """Scale to a given absolute peak (components are mixed at peak-relative levels)."""
    m = float(np.max(np.abs(x))) if len(x) else 0.0
    return x * (peak / m) if m > 0 else x


def midi_hz(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def poisson_times(rng, dur: float, rate, t0: float = 0.0) -> np.ndarray:
    """Event times of a Poisson process; `rate` may be a function of time (thinning, max rate = rate(None))."""
    if callable(rate):
        rmax = rate(None)
        k = rng.poisson(rmax * dur)
        ts = np.sort(rng.uniform(0, dur, k))
        keep = rng.uniform(0, 1, k) < np.array([rate(t) for t in ts]) / rmax
        return t0 + ts[keep]
    k = rng.poisson(rate * dur)
    return t0 + np.sort(rng.uniform(0, dur, k))


def fshape(x: np.ndarray, fn, circular: bool = False, tail: float = 0.05) -> np.ndarray:
    """Static zero-phase spectral shaping: multiply the spectrum by fn(freqs) (magnitude)."""
    if x.ndim == 2:
        return np.stack([fshape(x[:, c], fn, circular, tail) for c in range(x.shape[1])], axis=1)
    n = len(x)
    m = n if circular else _fastlen(n + n_(tail))
    X = np.fft.rfft(x, m)
    y = np.fft.irfft(X * fn(np.fft.rfftfreq(m, 1 / SR)), m)
    if circular:
        return y
    return y[:n]  # (the short zero-phase pre-ring wraps into the discarded padding)
