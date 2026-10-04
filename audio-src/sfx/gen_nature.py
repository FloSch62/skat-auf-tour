"""Outdoors: the dogs (formant/pulse synthesis, friendly), the distant church bell, rain and crickets loops."""
import numpy as np

from dsp import (SR, TAU, burst, bump, colored, ctrl, env_ar, env_hit, filt, formant_mag, fshape, modes, n_,
                 norm, place, poisson_times, reverb, tt, voiced, wobble, zeros)


def _std(x):
    return x / (np.std(x) + 1e-12)


# ─── dogs ──────────────────────────────────────────────────────────────────────────────────────────────

def _bark(rng, f0=255.0, dur=0.22, fs=1.0, rough=0.25, breath=0.25, chest=0.3):
    """One bark: abrupt onset, inverted-U pitch, the mouth opening (w) and closing (f) moves the formants."""
    tail = 0.12
    n = n_(dur + tail)
    f = ctrl(n, [(0, f0 * 0.72), (dur * 0.22, f0), (dur * 0.65, f0 * 0.85), (dur, f0 * 0.6), (dur + tail, f0 * 0.55)])
    f = f * (1 + 0.035 * wobble(rng, n, 80, circular=False))
    a = ctrl(n, [(0, 0), (0.006, 1), (dur * 0.25, 0.8), (dur * 0.6, 0.4), (dur, 0), (dur + tail, 0)])
    F1 = ctrl(n, [(0, 300 * fs), (0.03, 640 * fs), (dur * 0.6, 580 * fs), (dur, 380 * fs), (dur + tail, 360 * fs)])
    F2 = ctrl(n, [(0, 850 * fs), (0.03, 1300 * fs), (dur, 1000 * fs), (dur + tail, 950 * fs)])
    form = [(F1, 110 * fs), (F2, 160 * fs), (2400 * fs, 250 * fs), (3400 * fs, 350 * fs)]
    v = _std(voiced(f, a, form, tilt=0.7, fmax=7000, sub=rough))
    an = ctrl(n, [(0, 0), (0.01, 0.6), (dur * 0.5, 0.4), (dur, 0.5), (dur + 0.08, 0), (dur + tail, 0)])
    nz = fshape(rng.standard_normal(n) * an,
                lambda fr: formant_mag(fr, [(560 * fs, 220 * fs), (1200 * fs, 280 * fs), (2400 * fs, 400 * fs)]))
    out = v + _std(nz) * breath
    ob = fshape(rng.standard_normal(n) * env_hit(n, 0.001, 0.012),
                lambda fr: formant_mag(fr, [(600 * fs, 250 * fs), (1300 * fs, 300 * fs), (2400 * fs, 400 * fs)]))
    out += norm(ob) * 0.5 * float(np.max(np.abs(v)))  # the explosive release at the onset
    if chest > 0:
        m = n_(0.12)
        th = np.sin(TAU * np.cumsum(np.full(m, f0 * 0.42)) / SR) * env_hit(m, 0.004, 0.025)
        place(out, th, 0, chest * float(np.max(np.abs(v))))
    return out


def dog_bark_big(rng, count=1, f0=255.0, dur=0.22, gap=0.33):
    """A big, friendly dog (shepherd, wolfhound): deep 'wuff', once or twice."""
    out = zeros(count * gap + 0.6)
    for k in range(count):
        b = _bark(rng, f0 * (1 - 0.06 * k) * rng.uniform(0.97, 1.03), dur * rng.uniform(0.92, 1.08), fs=0.85,
                  rough=0.22, breath=0.28, chest=0.35)
        place(out, b, 0.01 + k * gap * rng.uniform(0.92, 1.08), 1.0 - 0.15 * k)
    return reverb(out, rng, 0.5, 0.12, hf_rt=0.4)


def dog_bark_small(rng, count=2, f0=700.0, dur=0.1, gap=0.19):
    """A small, friendly dog: bright yaps."""
    out = zeros(count * gap + 0.5)
    for k in range(count):
        b = _bark(rng, f0 * rng.uniform(0.95, 1.06), dur * rng.uniform(0.9, 1.1), fs=1.45, rough=0.08, breath=0.15,
                  chest=0.0)
        place(out, b, 0.01 + k * gap * rng.uniform(0.9, 1.1), 1.0 - 0.1 * k)
    return reverb(out, rng, 0.45, 0.1, hf_rt=0.4)


def dog_pant(rng, rate=3.2, dur=1.6):
    """Happy panting: quick breathy exhale/inhale pairs through an open mouth, a lick now and then."""
    out = zeros(dur + 0.4)
    cyc = 1.0 / rate
    t = 0.02
    while t < dur:
        for frac, length, amp, shift in ((0.0, 0.5, 1.0, 1.0), (0.55, 0.38, 0.55, 1.12)):
            m = n_(cyc * length)
            x = rng.standard_normal(m) * bump(m, 0.35, 1.2)
            x = fshape(x, lambda fr, s=shift: formant_mag(fr, [(750 * s, 260.0), (1500 * s, 320.0), (2600 * s, 420.0)]))
            if frac == 0.0 and rng.uniform() < 0.35:  # faint voicing on some exhales
                fv = np.full(m, rng.uniform(330, 420))
                x = _std(x) + _std(voiced(fv, bump(m, 0.35, 1.5), [(750.0, 200.0), (1500.0, 260.0)], fmax=4000)) * 0.12
            place(out, _std(x), t + cyc * frac, amp * rng.uniform(0.85, 1.1))
        t += cyc * rng.uniform(0.95, 1.05)
    for tl in rng.uniform(0.1, dur, 3):  # wet tongue clicks
        place(out, burst(rng, n_(0.01), 0.0002, 0.0012, ("bp", rng.uniform(2000, 3000), 2)), float(tl), 0.5)
    out *= env_ar(len(out), 0.1, 0.35)
    return reverb(out, rng, 0.4, 0.08, hf_rt=0.4)


def _whine(rng, contour, dur):
    n = n_(dur + 0.05)
    tm = tt(n)
    f = ctrl(n, contour) * (1 + 0.02 * np.sin(TAU * 6.0 * tm) * bump(n, 0.6, 1)
                            + 0.01 * wobble(rng, n, 8, circular=False))
    a = np.zeros(n)
    a[: n_(dur)] = env_ar(n_(dur), 0.06, 0.1) * (0.85 + 0.15 * np.sin(np.linspace(0, 3 * np.pi, n_(dur))))
    a = a * (1 + 0.1 * wobble(rng, n, 12, circular=False))
    v = voiced(f, a, [(900.0, 300.0), (2200.0, 500.0)], tilt=1.5, fmax=6000)
    nz = filt(rng.standard_normal(n), ("bp", 1800, 1.0)) * a
    return _std(v) + _std(nz) * 0.08


def dog_whine(rng, kind="single"):
    """A soft begging whine, nasal and high, rising a little at the end (friendly, not distressed)."""
    out = zeros(1.4)
    if kind == "double":
        place(out, _whine(rng, [(0, 800), (0.12, 1050), (0.25, 900)], 0.25), 0.01, 0.8)
        place(out, _whine(rng, [(0, 750), (0.25, 1150), (0.45, 950), (0.55, 1080)], 0.55), 0.34, 1.0)
    else:
        place(out, _whine(rng, [(0, 720), (0.3, 1150), (0.6, 950), (0.85, 1050)], 0.85), 0.01, 1.0)
    return reverb(out, rng, 0.4, 0.08, hf_rt=0.4)


# ─── church bell ───────────────────────────────────────────────────────────────────────────────────────

BELL = [  # ratio to the prime (strike) partial, amplitude, decay τ (s): a minor-third church bell
    (0.5, 0.45, 3.5), (1.0, 0.6, 2.6), (1.19, 0.55, 2.0), (1.5, 0.25, 1.8), (2.0, 1.0, 1.6), (2.52, 0.4, 0.9),
    (2.66, 0.35, 0.8), (3.0, 0.25, 0.6), (4.0, 0.2, 0.45), (5.0, 0.12, 0.3), (6.5, 0.08, 0.2),
]


def _bell(rng, prime=330.0, amp=1.0):
    n = n_(8.0)
    fr = [prime * r * (1 + rng.uniform(-0.002, 0.002)) for r, _, _ in BELL]
    am = [a * rng.uniform(0.85, 1.15) for _, a, _ in BELL]
    ta = [t for _, _, t in BELL]
    x = modes(n, fr, am, ta, rng, tc=0.0006, split=0.0015)
    x = norm(x) + norm(burst(rng, n, 0.0002, 0.005, ("bp", 2000, 0.8))) * 0.15
    return x * amp


def church_bell(rng, strokes=3, prime=330.0, interval=1.75):
    """A village church bell heard from across the valley: a few strokes, air-softened, long outdoor tail."""
    total = (strokes - 1) * interval + 4.8
    out = zeros(total)
    for k in range(strokes):
        t = 0.02 + k * interval + rng.uniform(-0.04, 0.04)
        place(out, _bell(rng, prime), t, 1.0 if k % 2 == 0 else 0.85)
    out = filt(out, ("lp1", 2200), ("hs", 3000, -6), ("hp", 90))
    nf = n_(2.2)  # the last stroke dies away over the valley (gentle fade, no cut)
    out[-nf:] *= np.cos(np.linspace(0, np.pi / 2, nf)) ** 1.5
    return reverb(out, rng, 2.8, 0.55, stereo=True, hf_rt=0.3, predelay=0.03, size=3.0)


# ─── rain (loop) ───────────────────────────────────────────────────────────────────────────────────────

def _drop_bank(rng, k=32):
    bank = []
    for _ in range(k):
        bank.append(norm(burst(rng, n_(0.006), 0.0001, rng.uniform(0.0005, 0.0015), ("bp", rng.uniform(2000, 7000), 1.5))))
    return bank


def _plip(rng, f, tau):
    m = n_(tau * 6)
    t = tt(m)
    return np.sin(TAU * np.cumsum(f * (1 + 0.3 * t / tau)) / SR) * env_hit(m, 0.0005, tau)


def rain(rng, dur=10.0):
    """Steady soft rain: a hiss bed, fine drops, plips in puddles and a few nearby drips. Seamless loop."""
    n = n_(dur)
    out = np.zeros((n, 2))
    bank = _drop_bank(rng)
    for ch in range(2):
        bed = filt(colored(rng, n, -2), ("hp", 300), ("lp", 7000), ("peak", 2500, 0.7, 2), circular=True)
        bed = _std(bed) * (1 + 0.12 * wobble(rng, n, 0.25, circular=True))
        out[:, ch] += bed * 0.6
        fine = np.zeros(n)
        for t0 in poisson_times(rng, dur, 450):
            place(fine, bank[rng.integers(len(bank))], float(t0), float(np.exp(rng.normal(-1.5, 0.6))), circular=True)
        out[:, ch] += _std(fine) * 0.35
        pl = np.zeros(n)
        for t0 in poisson_times(rng, dur, 18):
            place(pl, _plip(rng, rng.uniform(1200, 3500), rng.uniform(0.005, 0.012)), float(t0),
                  float(rng.uniform(0.15, 0.4)), circular=True)
        out[:, ch] += pl * 0.5
        for t0 in rng.uniform(0, dur, 3):  # drips from the gutter into a puddle
            d = _plip(rng, rng.uniform(650, 1100), 0.02)
            d = norm(d) + norm(burst(rng, len(d), 0.0003, 0.004, ("bp", 2500, 1))) * 0.3
            place(out, norm(d), float(t0), 0.45, circular=True, pan=(-0.5 if ch == 0 else 0.5))
    out = reverb(out, rng, 0.6, 0.25, circular=True, hf_rt=0.4)
    return filt(out, ("hs", 6000, -3), circular=True)


# ─── crickets (loop) ───────────────────────────────────────────────────────────────────────────────────

def _chirp(fc, pulses, pd=0.016, spacing=0.033):
    m = n_(pulses * spacing + 0.02)
    out = np.zeros(m)
    k = n_(pd)
    t = tt(k)
    w = np.sin(np.pi * np.arange(k) / k) ** 2
    p = (np.sin(TAU * fc * t * (1 - 0.01 * t / pd)) + 0.15 * np.sin(TAU * 2 * fc * t)) * w
    for i in range(pulses):
        place(out, p * (1 - 0.08 * i), n_(i * spacing))
    return out


def crickets(rng, dur=10.0, near=4, far=5):
    """A summer night: a few field crickets nearby (each its own pitch and rhythm), a far chorus, night air."""
    n = n_(dur)
    out = np.zeros((n, 2))
    for c in range(near + far):
        is_far = c >= near
        fc = rng.uniform(3200, 4400)
        period = rng.uniform(0.38, 0.7)
        count = max(1, int(round(dur / period)))
        period = dur / count  # whole chirps per loop: the rhythm survives the seam
        ch = _chirp(fc, int(rng.integers(3, 5)), spacing=rng.uniform(0.03, 0.037))
        if is_far:
            ch = filt(ch, ("lp", 3800))
        amp = rng.uniform(0.06, 0.14) if is_far else rng.uniform(0.45, 1.0)
        pan = rng.uniform(-0.9, 0.9)
        off = rng.uniform(0, period)
        buf = np.zeros(n)
        for k in range(count):
            if is_far and rng.uniform() < 0.3:
                continue
            place(buf, ch, float(off + k * period + rng.normal(0, 0.004)), amp * rng.uniform(0.85, 1.1), circular=True)
        out += np.stack([buf * np.cos((pan + 1) * np.pi / 4), buf * np.sin((pan + 1) * np.pi / 4)], 1) * np.sqrt(2)
    tm = tt(n)
    for k in range(2):  # distant tree crickets: a continuous soft trill
        fc = rng.uniform(2700, 3100)
        rate = round(rng.uniform(40, 50) * dur) / dur
        am = (0.5 + 0.5 * np.sin(TAU * rate * tm)) ** 3 * (0.7 + 0.3 * wobble(rng, n, 0.2, circular=True))
        tr = np.sin(TAU * round(fc * dur) / dur * tm) * am
        p = (-0.6, 0.6)[k]
        out += np.stack([tr * np.cos((p + 1) * np.pi / 4), tr * np.sin((p + 1) * np.pi / 4)], 1) * 0.025
    air = np.stack([filt(colored(rng, n, -6), ("lp", 500), circular=True) for _ in range(2)], 1)
    out += _std(air) * 0.03
    out = reverb(out, rng, 0.6, 0.18, circular=True, hf_rt=0.4)
    return filt(out, ("hs", 4500, -3), circular=True)
