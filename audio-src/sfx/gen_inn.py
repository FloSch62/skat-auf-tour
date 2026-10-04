"""Inn sounds: glasses, bottle, pouring, gulps, cheers, a mild burp, chair, coins, cash register, room murmur.

Drinking is a light joke in this game, not a focus: pour/gulp/burp are short, soft and dry on purpose."""
import numpy as np

from dsp import (SR, TAU, burst, bump, colored, conv, ctrl, env_ar, env_hit, filt, loop_xfade, modes, n_, norm,
                 panned, place, poisson_times, q_tau, resonance_gain, reverb, stft_filter, tt, voiced, wobble, zeros)


# ─── glass ─────────────────────────────────────────────────────────────────────────────────────────────

GLASS = {  # first ring mode of glass A, glass B (Hz), decay of the first mode (s), thick body thunk
    "beer": (1350.0, 1580.0, 0.12, 0.35),
    "wine": (1900.0, 2180.0, 0.33, 0.12),
    "mixed": (1550.0, 2350.0, 0.22, 0.22),
}
GLASS_RATIOS = np.array([1.0, 2.83, 5.42, 8.77, 12.9])  # circumferential (n=2..6) modes of a cylindrical shell


def _glass(rng, n, f1, tau1, tc=0.00006):
    fr = f1 * GLASS_RATIOS * (1 + rng.uniform(-0.015, 0.015, 5))
    amps = np.array([1, 0.55, 0.35, 0.18, 0.08]) * rng.uniform(0.7, 1.2, 5)
    taus = tau1 * np.array([1, 0.55, 0.32, 0.2, 0.12])
    return modes(n, fr, amps, taus, rng, tc=tc, split=rng.uniform(0.0003, 0.0012))


def _clink(rng, kind="beer"):
    fa, fb, tau, thick = GLASS[kind]
    n = n_(tau * 6 + 0.1)
    x = norm(_glass(rng, n, fa * rng.uniform(0.97, 1.03), tau))
    x += norm(_glass(rng, n, fb * rng.uniform(0.97, 1.03), tau * 0.9)) * rng.uniform(0.6, 0.9)
    x += norm(burst(rng, n, 0.00005, 0.0004, ("bp", 5000, 0.8))) * 0.25
    fbody = rng.uniform(600, 800)
    x += norm(modes(n, [fbody, fbody * 1.7], [1, 0.4], [0.012, 0.007], tc=0.0002)) * thick
    return x


def glass_clink(rng, kind="beer", room=0.12):
    """Two glasses touch (beer mugs: short and dull; Viertele glasses: brighter ring)."""
    out = zeros(1.6)
    place(out, _clink(rng, kind), 0.005)
    return reverb(out, rng, 0.6, room, hf_rt=0.4)


def cheers(rng, count=5):
    """Several glasses clink around the table (stereo)."""
    out = zeros(3.4, stereo=True)
    t = 0.01
    kinds = ["beer", "beer", "wine", "mixed"]
    for k in range(count):
        place(out, _clink(rng, kinds[rng.integers(len(kinds))]), t, rng.uniform(0.55, 1.0), pan=rng.uniform(-0.6, 0.6))
        t += rng.uniform(0.11, 0.28)
    return reverb(out, rng, 0.6, 0.14, hf_rt=0.4)


# ─── bottle, pour, gulp ────────────────────────────────────────────────────────────────────────────────

def _metal_tink(rng, f=4200.0, tau=0.025):
    n = n_(0.15)
    return norm(modes(n, [f, f * 1.63, f * 2.33], [1, 0.6, 0.35], [tau, tau * 0.7, tau * 0.5], rng, tc=0.0001))


def _hiss(rng, dur, tau, lo=2500.0, center=5500.0):
    n = n_(dur)
    x = filt(rng.standard_normal(n), ("hp", lo), ("bp", center, 0.5)) * env_hit(n, 0.003, tau)
    for tm in poisson_times(rng, dur * 0.6, 120):
        place(x, burst(rng, n_(0.004), 0.0001, 0.0006, ("bp", rng.uniform(4000, 7000), 2)), float(tm),
              0.6 * np.exp(-tm / tau))
    return norm(x)


def bottle_open(rng, kind="crown", tinkle=True):
    """Crown cap: opener bites, pop, hiss, cap tinkles. Swing-top: wire click, the PLOPP, short hiss."""
    out = zeros(1.4)
    if kind == "swing":
        place(out, _metal_tink(rng, 2200, 0.008), 0.01, 0.25)
        place(out, norm(burst(rng, n_(0.01), 0.0001, 0.0008, ("bp", 3000, 1))), 0.01, 0.15)
        tp = 0.01 + rng.uniform(0.11, 0.14)
        n = n_(0.12)
        tm = tt(n)
        f = 480 + 470 * np.exp(-tm / 0.009)
        plop = np.sin(TAU * np.cumsum(f) / SR) * env_hit(n, 0.0005, 0.018)
        place(out, norm(plop), tp, 1.0)
        place(out, norm(burst(rng, n, 0.0003, 0.004, ("lp", 1800))), tp, 0.45)
        place(out, _metal_tink(rng, 2600, 0.012) * 0.8, tp + 0.07, 0.22)  # porcelain stopper against the bottle
        place(out, _hiss(rng, 0.45, 0.08), tp + 0.004, 0.22)
    else:
        place(out, _metal_tink(rng, rng.uniform(3000, 3400), 0.01), 0.01, 0.3)
        place(out, norm(burst(rng, n_(0.02), 0.0002, 0.003, ("bp", 3500, 1))), 0.01, 0.2)
        tp = 0.01 + rng.uniform(0.09, 0.13)
        n = n_(0.1)
        tm = tt(n)
        f = 520 + 140 * np.exp(-tm / 0.01)
        res = np.sin(TAU * np.cumsum(f) / SR) * env_hit(n, 0.0004, 0.012)
        place(out, norm(burst(rng, n, 0.0003, 0.005, ("lp", 2500))), tp, 0.7)
        place(out, norm(res), tp, 0.5)
        place(out, _hiss(rng, 0.7, 0.15), tp + 0.003, 0.45)
        if tinkle:
            tc = tp + rng.uniform(0.22, 0.3)
            for k, a in enumerate([0.22, 0.12, 0.06]):
                place(out, _metal_tink(rng, rng.uniform(3800, 4600)), tc, a)
                tc += 0.08 * 0.6 ** k
    return reverb(out, rng, 0.5, 0.1, hf_rt=0.4)


def _bubble(rng, radius_mm, amp=1.0):
    """Minnaert bubble ping with the rising pitch of a bubble near the surface."""
    f0 = 3.26 / (radius_mm / 1000.0)
    tau = rng.uniform(0.004, 0.012)
    n = n_(tau * 6)
    tm = tt(n)
    f = f0 * (1 + 0.25 * tm / tau)
    return np.sin(TAU * np.cumsum(f) / SR) * env_hit(n, 0.0004, tau) * amp


def pour(rng, kind="beer", dur=2.0):
    """Gentle pour into a glass; the glass's air column shortens, so its resonance rises as it fills."""
    if kind == "wine":
        dur = min(dur, 1.6)
    out = zeros(dur + 0.9)
    n = n_(dur)
    tm = tt(n)
    fill = np.clip(tm / dur, 0, 1)
    env = env_ar(n, 0.12, 0.35)
    stream = filt(rng.standard_normal(n), ("lp", 2500)) * (1 + 0.5 * wobble(rng, n, 25, circular=False))
    lo, hi = (380.0, 1250.0) if kind == "beer" else (520.0, 1500.0)

    def g(f, t):
        fr = lo * (hi / lo) ** np.clip(t / dur, 0, 1)
        return 0.06 + resonance_gain(f, fr, 8.0) + 0.45 * resonance_gain(f, 2.1 * fr, 8.0)

    stream = stft_filter(stream, g, 1024, 256) * env
    place(out, norm(stream), 0.0, 0.8)
    # small bubbles along the stream
    for t0 in poisson_times(rng, dur * 0.9, 60, 0.05):
        place(out, _bubble(rng, rng.uniform(1.4, 4.0)), float(t0), float(np.exp(rng.normal(-2.2, 0.5))))
    # glugs from the bottle neck (air coming back in)
    rate = 7.0 if kind == "beer" else 5.5
    amp = 0.22 if kind == "beer" else 0.4
    t0 = 0.08
    while t0 < dur * 0.85:
        f = rng.uniform(190, 260)
        ng = n_(0.07)
        tg = tt(ng)
        gl = np.sin(TAU * np.cumsum(f * (1 + 0.3 * tg / 0.05)) / SR) * env_hit(ng, 0.004, 0.018)
        place(out, gl, t0, amp * rng.uniform(0.6, 1.0) * (1 - 0.5 * t0 / dur))
        t0 += 1 / rate * rng.uniform(0.8, 1.25)
    # head settling (beer only): soft fine fizz
    if kind == "beer":
        nz = n_(0.9)
        fz = np.zeros(nz)
        for tz in poisson_times(rng, 0.9, 260):
            place(fz, burst(rng, n_(0.003), 0.0001, 0.0004, ("bp", rng.uniform(3000, 6000), 2)), float(tz),
                  float(np.exp(-tz / 0.35)))
        place(out, norm(fz), dur - 0.3, 0.1)
    out = filt(out, ("hs", 4000, -3))
    return reverb(out, rng, 0.5, 0.1, hf_rt=0.4)


def gulp(rng, count=2):
    """Soft swallows ('GLUCK'): a little click and a short low glug each, kept dry and polite."""
    out = zeros(count * 0.5 + 0.4)
    t = 0.03
    for k in range(count):
        place(out, norm(burst(rng, n_(0.02), 0.0002, 0.002, ("bp", 1400, 1.5))), t, 0.18)
        n = n_(0.16)
        tm = tt(n)
        f = 140 + 120 * np.exp(-tm / 0.02) * rng.uniform(0.85, 1.15)
        gl = np.tanh(1.5 * np.sin(TAU * np.cumsum(f) / SR)) * env_hit(n, 0.004, 0.03)
        place(out, norm(gl), t + 0.012, 1.0 - 0.12 * k)
        place(out, norm(burst(rng, n_(0.06), 0.004, 0.012, ("lp", 900))), t + 0.01, 0.15)
        t += rng.uniform(0.38, 0.5)
    out = filt(out, ("hp", 70), ("lp", 3000))
    return reverb(out, rng, 0.3, 0.05, hf_rt=0.4)


def burp(rng, kind="small"):
    """Kept deliberately mild: a tiny closed-mouth 'örp', or a polite throat clear ('hm-hm')."""
    if kind == "clear":
        out = zeros(0.6)
        # 1: a short rough 'hrm' (throat friction + creaky voice)
        d = 0.12
        n = n_(d + 0.05)
        f0 = ctrl(n, [(0, 118), (d * 0.5, 126), (d, 110)]) * (1 + 0.07 * wobble(rng, n, 50, circular=False))
        a = ctrl(n, [(0, 0), (0.015, 1), (d * 0.7, 0.7), (d, 0)])
        v = voiced(f0, a, [(520.0, 140.0), (1400.0, 180.0), (2400.0, 300.0)], tilt=1.2, fmax=3200, sub=0.4)
        fr = filt(rng.standard_normal(n), ("bp", 1600, 0.8)) * a * env_hit(n, 0.003, 0.03)
        place(out, norm(v) + norm(fr) * 0.25, 0.01, 0.9)
        # 2: a soft nasal 'hm'
        d2 = 0.15
        n2 = n_(d2 + 0.05)
        f2 = ctrl(n2, [(0, 132), (d2, 116)])
        a2 = ctrl(n2, [(0, 0), (0.02, 1), (d2 * 0.6, 0.8), (d2, 0)])
        nasal = voiced(f2, a2, [(260.0, 70.0), (1050.0, 220.0), (2300.0, 300.0)], tilt=1.4, fmax=2800,
                       harm_fn=lambda k, fk: 1 - 0.85 * resonance_gain(fk, 820.0, 3.0))
        place(out, norm(nasal), 0.01 + d + 0.07, 0.75)
        out = filt(out, ("lp", 2500))
        return reverb(out, rng, 0.35, 0.06, hf_rt=0.4)
    d = 0.17
    n = n_(d + 0.06)
    f0 = ctrl(n, [(0, 86), (0.04, 98), (d, 80)]) * (1 + 0.06 * wobble(rng, n, 40, circular=False))
    a = ctrl(n, [(0, 0), (0.015, 1), (d * 0.6, 0.7), (d, 0)])
    F1 = ctrl(n, [(0, 380), (d, 470)])
    F2 = ctrl(n, [(0, 1350), (d, 950)])
    v = voiced(f0, a, [(F1, 130.0), (F2, 160.0), (2300.0, 260.0)], tilt=1.1, fmax=3000, sub=0.35)
    v = norm(v) + filt(rng.standard_normal(n), ("lp", 800)) * a * 0.04
    out = filt(v, ("lp", 1800))
    return reverb(out, rng, 0.35, 0.06, hf_rt=0.4)


# ─── chair ─────────────────────────────────────────────────────────────────────────────────────────────

def chair(rng, dur=0.55, rate=(70, 140)):
    """Wooden chair scraped over floorboards: stick-slip impulses ringing the chair's frame, then it settles."""
    total = dur + 0.6
    n = n_(total)
    nd = n_(dur)
    r0, r1 = rate
    rc = ctrl(nd, [(0, r0), (dur * 0.35, r1), (dur * 0.8, r1 * 0.9), (dur, r0 * 0.8)])
    rc *= 1 + 0.12 * wobble(rng, nd, 6, circular=False)
    ph = np.cumsum(rc) / SR
    ks = np.arange(1, int(ph[-1]))
    idx = np.searchsorted(ph, ks + rng.uniform(-0.15, 0.15, len(ks)))
    env = bump(nd, 0.4, 0.7)
    imp = np.zeros(n)
    for i in idx:
        if i < nd:
            imp[i] += env[i] * rng.uniform(0.55, 1.0)
    imp = filt(imp, ("hp", 300), ("lp", 6000))
    fr = np.array([185, 290, 430, 610, 870, 1250, 1800, 2600]) * rng.uniform(0.92, 1.08)
    body_ir = modes(n_(0.08), fr, [0.8, 1, 0.9, 0.7, 0.6, 0.45, 0.3, 0.2], q_tau(fr, 25))
    scrape = conv(imp, body_ir)[:n]
    fric = filt(rng.standard_normal(n), ("bp", 1500, 0.7)) * np.concatenate([env, np.zeros(n - nd)])
    out = norm(scrape) + norm(fric) * 0.25
    # it settles: a soft thump of the legs
    m = n_(0.3)
    settle = norm(modes(m, [140 * rng.uniform(0.9, 1.1), 260, 420], [1, 0.6, 0.35], [0.03, 0.015, 0.008],
                        tc=0.0015)) + norm(burst(rng, m, 0.001, 0.01, ("lp", 400))) * 0.4
    place(out, norm(settle), dur * rng.uniform(0.95, 1.05), 0.6)
    return reverb(out, rng, 0.5, 0.12, hf_rt=0.4)


# ─── coins and the cash register ───────────────────────────────────────────────────────────────────────

COIN_RATIOS = np.array([1.0, 1.73, 2.33, 3.91, 4.11, 6.3])  # free circular plate


def _coin_hit(rng, f1=2600.0, tau1=0.25, tc=0.00006):
    n = n_(tau1 * 5 + 0.05)
    fr = f1 * COIN_RATIOS * (1 + rng.uniform(-0.01, 0.01, len(COIN_RATIOS)))
    amps = np.array([1, 0.7, 0.6, 0.35, 0.3, 0.15]) * rng.uniform(0.4, 1.2, len(COIN_RATIOS))
    taus = tau1 * np.array([1, 0.7, 0.6, 0.4, 0.35, 0.25])
    return norm(modes(n, fr, amps, taus, rng, tc=tc, split=0.0006))


def coin(rng, kind="drop", f1=2600.0):
    """Mark coins: a drop that bounces and spins down, two coins on the saucer, or one coin set down."""
    out = zeros(1.6)
    if kind == "saucer":
        for k, t in enumerate([0.01, 0.01 + rng.uniform(0.06, 0.09)]):
            place(out, _coin_hit(rng, f1 * rng.uniform(0.85, 1.15), 0.22), t, 1.0 - 0.25 * k)
            place(out, _coin_hit(rng, 1900 * rng.uniform(0.95, 1.05), 0.05, tc=0.0002), t, 0.35)  # saucer
        tr = 0.2
        for k in range(4):
            place(out, _coin_hit(rng, f1 * 1.1, 0.03, tc=0.0002), tr, 0.25 * 0.7 ** k)
            tr += 0.035
    elif kind == "place":
        place(out, _coin_hit(rng, f1 * 0.9, 0.12, tc=0.00015), 0.01, 1.0)
        place(out, norm(modes(n_(0.1), [320, 610], [1, 0.4], [0.015, 0.008], tc=0.001)), 0.01, 0.4)
        place(out, _coin_hit(rng, f1 * 0.9, 0.08, tc=0.00015), 0.01 + rng.uniform(0.045, 0.06), 0.35)
    else:
        t = 0.01
        gap = rng.uniform(0.11, 0.14)
        a = 1.0
        for k in range(5):
            place(out, _coin_hit(rng, f1, 0.18 if k < 3 else 0.08), t, a)
            if k == 0:
                place(out, norm(modes(n_(0.1), [300, 560], [1, 0.4], [0.015, 0.008], tc=0.001)), t, 0.3)
            t += gap
            gap *= 0.62
            a *= 0.72
        # spinning down on the table: faster and quieter
        iv = 0.03
        while iv > 0.006 and t < 1.2:
            place(out, _coin_hit(rng, f1, 0.03, tc=0.0001), t, a)
            t += iv
            iv *= 0.86
            a *= 0.88
    return reverb(out, rng, 0.45, 0.1, hf_rt=0.4)


def _mech_clack(rng, f=2400.0, body=500.0):
    n = n_(0.08)
    m = modes(n, [f, f * 1.5, body, body * 1.8], [0.7, 0.4, 1.0, 0.5], [0.006, 0.004, 0.012, 0.008], rng, tc=0.0002)
    return norm(m) + norm(burst(rng, n, 0.0001, 0.001, ("bp", 3000, 1))) * 0.4


def till(rng, keys=2, bell=1480.0):
    """Old cash register: key clacks, the crank's ratchet, the bell 'ching', the drawer rolling out with coins."""
    out = zeros(5.0)
    t = 0.01
    for k in range(keys):
        place(out, _mech_clack(rng, rng.uniform(2200, 2600), rng.uniform(450, 550)), t, 0.55)
        t += rng.uniform(0.11, 0.15)
    t += 0.05
    for k in range(9):  # crank ratchet
        place(out, _mech_clack(rng, 3200, 900) * 0.6, t, 0.35 * (0.8 + 0.2 * np.sin(k)))
        t += 0.024
    tb = t + 0.02
    nb = n_(4.0)
    br = np.array([1.0, 2.76, 5.40, 8.93])
    bell_x = modes(nb, bell * br, [1, 0.5, 0.25, 0.1], [0.9, 0.35, 0.15, 0.07], rng, tc=0.00008, split=0.0009)
    place(out, norm(bell_x), tb, 0.8)
    # drawer
    td = tb + 0.01
    nd = n_(0.26)
    roll = filt(rng.standard_normal(nd), ("lp", 700), ("hp", 90)) * bump(nd, 0.4, 0.8)
    place(out, norm(roll), td, 0.35)
    for tm in np.sort(rng.uniform(0, 0.25, 9)):
        place(out, _mech_clack(rng, 1400, 300) * 0.5, td + float(tm), 0.15)
    te = td + 0.26
    nend = n_(0.2)
    thud = norm(modes(nend, [120, 450, 700, 1150], [1, 0.6, 0.45, 0.3], [0.025, 0.03, 0.02, 0.015], tc=0.0008))
    place(out, thud, te, 0.6)
    for k in range(3):  # coins jingle in the drawer
        place(out, _coin_hit(rng, rng.uniform(2800, 3600), 0.08), te + 0.005 + k * rng.uniform(0.02, 0.04), 0.25)
    return reverb(out, rng, 0.55, 0.12, hf_rt=0.4)


# ─── inn murmur (loop) ─────────────────────────────────────────────────────────────────────────────────

VOWELS = {  # F1, F2, F3 of an adult male (Hz); female speakers are scaled up
    "a": (750, 1300, 2500), "e": (420, 2000, 2600), "i": (300, 2250, 2950), "o": (460, 850, 2400),
    "u": (330, 750, 2300), "ae": (620, 1750, 2500), "oe": (440, 1450, 2300), "ue": (300, 1650, 2200),
    "schwa": (520, 1450, 2450),
}
VOWEL_KEYS = list(VOWELS)
VOWEL_P = np.array([3, 2, 1.5, 1.2, 1, 0.8, 0.4, 0.4, 3.5])
VOWEL_P = VOWEL_P / VOWEL_P.sum()


def _talker(rng, dur, male):
    """One distant speaker: phrases of random vowel syllables with consonant dips (no words)."""
    n = n_(dur)
    ts, F1, F2, F3, A, P = [], [], [], [], [], []
    fs = 1.0 if male else 1.16
    t = rng.uniform(-1.5, 0.3)
    while t < dur:
        nsyl = int(rng.integers(3, 14))
        p_hi, p_lo = rng.uniform(1.08, 1.18), rng.uniform(0.86, 0.94)
        loud = rng.uniform(0.6, 1.0)
        for s in range(nsyl):
            sd = rng.uniform(0.11, 0.27)
            v = VOWELS[VOWEL_KEYS[rng.choice(len(VOWEL_KEYS), p=VOWEL_P)]]
            u = s / max(nsyl - 1, 1)
            pitch = p_hi + (p_lo - p_hi) * u + (rng.uniform(0.08, 0.25) if rng.uniform() < 0.35 else 0)
            pitch *= 1 + rng.uniform(-0.05, 0.05)
            if s == nsyl - 1 and rng.uniform() < 0.25:  # now and then a phrase ends rising, like a question
                pitch *= 1.2
            cons = rng.uniform(0.05, 0.3) if s else 0.0
            for frac, amp, fsh in ((0.0, cons, 0.7), (0.45, loud * rng.uniform(0.7, 1.0), 1.0), (0.85, loud * 0.6, 0.95)):
                ts.append(t + sd * frac)
                F1.append(v[0] * fs * fsh)
                F2.append(v[1] * fs * (0.85 + 0.15 * fsh))
                F3.append(v[2] * fs)
                A.append(amp)
                P.append(pitch)
            t += sd
        ts.append(t + 0.03)
        F1.append(F1[-1])
        F2.append(F2[-1])
        F3.append(F3[-1])
        A.append(0.0)
        P.append(P[-1] * 0.95)
        t += rng.uniform(0.3, 1.8)
    ts = np.array(ts)
    tm = tt(n)

    def curve(v, lp=25):
        return filt(np.interp(tm, ts, v), ("lp", lp), tail=0.2)

    f0 = (rng.uniform(95, 135) if male else rng.uniform(175, 225)) * curve(P, 12)
    f0 = f0 * (1 + 0.01 * wobble(rng, n, 4, circular=False))
    amp = np.clip(curve(A, 30), 0, None)
    formants = [(curve(F1), 110.0), (curve(F2), 140.0), (curve(F3), 200.0)]
    v = voiced(np.maximum(f0, 60), amp, formants, tilt=1.0 if male else 1.3, fmax=3600)
    # occasional fricatives at syllable onsets
    for t0 in poisson_times(rng, dur, 0.8):
        nf = n_(rng.uniform(0.05, 0.09))
        place(v, burst(rng, nf, 0.01, 0.03, ("bp", rng.uniform(2800, 4500), 1.2)), float(t0),
              0.05 * float(np.max(np.abs(v)) + 1e-9))
    return v


def inn_murmur(rng, dur=11.0, talkers=12, xfade=1.0):
    """Warm inn room tone: a dozen distant speakers (indistinct), odd far clinks, room reverb. Seamless loop."""
    L = dur + xfade
    mixd = zeros(L, stereo=True)
    for k in range(talkers):
        male = rng.uniform() < 0.62
        v = _talker(rng, L, male)
        dist = rng.uniform(0.0, 1.0)
        v = filt(v, ("lp", 3000 - 1200 * dist, 0.7))
        v = norm(v) * 10 ** (-(3 + 11 * dist) / 20)
        mixd += panned(v, rng.uniform(-0.8, 0.8))
    babble = loop_xfade(mixd, xfade)
    babble = babble / (np.std(babble) + 1e-12)
    n = len(babble)
    room = np.stack([filt(colored(rng, n, -6), ("lp", 600), circular=True) for _ in range(2)], 1)
    out = babble + room / (np.std(room) + 1e-12) * 0.12
    for t0 in rng.uniform(0, dur, 4):  # far-off glasses and cutlery
        c = _clink(rng, ["beer", "wine", "mixed"][rng.integers(3)])
        c = filt(c, ("lp", 3000))
        place(out, c, float(t0), rng.uniform(0.5, 0.9), circular=True, pan=rng.uniform(-0.7, 0.7))
    out = reverb(out, rng, 0.8, 0.5, circular=True, hf_rt=0.45)
    return filt(out, ("hs", 2500, -5), ("ls", 250, 1.0), ("hp", 120, 0.7), circular=True)
