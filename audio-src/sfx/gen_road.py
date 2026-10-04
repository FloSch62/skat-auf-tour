"""Road sounds: the camper van (starter, engine, road, door, horn), the twin motorcycle, petrol pump, ratchet.

Engines are built from firing events: the 4-stroke cycle phase is integrated from an RPM curve, every cylinder
fires at its offset, each firing is a short pressure pulse (sharper with more throttle) with a little combustion
noise, and the whole pulse train rings the exhaust's resonances. Loops use integer cycle counts and circular
filtering, so they are seamless by construction."""
import numpy as np

from dsp import (SR, TAU, burst, bump, colored, ctrl, env_ar, env_hit, filt, modes, n_, norm, place,
                 poisson_times, q_tau, resonance_gain, reverb, stft_filter, tt, voiced, wobble, zeros)

VAN_EXHAUST = [("peak", 95, 1.4, 7), ("peak", 290, 2.5, 6), ("peak", 640, 3.0, 3), ("lp", 1500, 0.7), ("hp", 35)]
BIKE_EXHAUST = [("peak", 110, 1.2, 5), ("peak", 390, 2.0, 8), ("peak", 1300, 2.5, 4), ("lp", 2600, 0.7, 2), ("hp", 35)]
VAN_OFFSETS = [0.0, 0.25, 0.5, 0.75]  # even-firing four
TWIN_OFFSETS = [0.0, 0.375]  # 270° twin: 270°/450° firing intervals → the lumpy 'potato' beat


# ─── engine core ───────────────────────────────────────────────────────────────────────────────────────

def _firings(rpm, offsets):
    cyc = np.cumsum(rpm / 120.0) / SR  # 4-stroke cycles elapsed (one cycle = two revolutions)
    ev = []
    for j, o in enumerate(offsets):
        k0, k1 = int(np.ceil(cyc[0] - o)), int(np.floor(cyc[-1] - o))
        if k1 < k0:
            continue
        ks = np.arange(k0, k1 + 1)
        idx = np.searchsorted(cyc, ks + o)
        ev += [(int(i), j, int(k)) for i, k in zip(idx, ks)]
    ev.sort()
    return ev, cyc


def _pulse(tau, noise, rasp):
    """Zero-mean exhaust pressure pulse: positive blow-down, negative reflection, plus combustion noise."""
    m = n_(0.03)
    t = tt(m)
    p = (t / tau) * np.exp(1 - t / tau) - 0.5 * (t / (2 * tau)) * np.exp(1 - t / (2 * tau))
    return p + noise[:m] * np.exp(-t / 0.003) * rasp


def engine(rng, rpm, offsets, throttle, exhaust, circular=False, tau=(0.0008, 0.0003), cyl_var=0.08,
           cycle_var=0.12, jitter=0.0002, misfire=None, rasp=0.35, mech=0.03, fan=0.0):
    """Render an engine for per-sample rpm and throttle (0..1) arrays. misfire(i) -> probability."""
    n = len(rpm)
    ev, cyc = _firings(rpm, offsets)
    cyl_gain = 1 + cyl_var * rng.standard_normal(len(offsets))
    ncyc = int(cyc[-1]) + 2
    cyc_gain = np.clip(1 + cycle_var * rng.standard_normal(ncyc + 1), 0.3, 2)
    bank = [filt(rng.standard_normal(n_(0.03)), ("lp", 3000)) for _ in range(12)]
    out = np.zeros(n)
    ticks = np.zeros(n)
    for i, j, k in ev:
        th = float(throttle[min(i, n - 1)])
        a = (0.3 + 0.7 * th) * cyl_gain[j] * cyc_gain[k % ncyc]
        if misfire is not None and rng.uniform() < misfire(i):
            a *= 0.06
        tp = tau[0] + (tau[1] - tau[0]) * th
        pos = i + int(rng.normal(0, jitter * SR))
        place(out, _pulse(tp, bank[rng.integers(12)], rasp), int(pos), a, circular=circular)
        if mech > 0:  # valve-train tick a little after each firing
            place(ticks, burst(rng, n_(0.006), 0.0001, 0.0007, ("bp", rng.uniform(2500, 4000), 1.5)),
                  int(pos + n_(0.004)), rng.uniform(0.5, 1.0), circular=circular)
    y = filt(out, *exhaust, circular=circular)
    y = y / (np.std(y) + 1e-12)
    if mech > 0:
        y += ticks / (np.std(ticks) + 1e-12) * mech
    if fan > 0:
        rr = rpm / 3000.0
        f = filt(rng.standard_normal(n), ("bp", 1300, 0.9), circular=circular) * rr ** 2
        y += f / (np.std(f) + 1e-12) * fan
    return y


def _loop_rpm(rng, n, base, depth, rate):
    rpm = base * (1 + depth * wobble(rng, n, rate, circular=True))
    c = np.sum(rpm / 120.0) / SR
    return rpm * (round(c) / c)


# ─── camper van ────────────────────────────────────────────────────────────────────────────────────────

def _metal_click(rng, f=2600.0, body=600.0, tau=0.008):
    n = n_(0.1)
    m = modes(n, [f, f * 1.45, body, body * 1.8], [0.7, 0.4, 1.0, 0.5], [tau, tau * 0.7, tau * 1.6, tau],
              rng, tc=0.0002)
    return norm(m) + norm(burst(rng, n, 0.0001, 0.001, ("bp", 3000, 1))) * 0.4


def _starter(rng, dur, rpm_c=190.0):
    """Starter motor cranking: motor hum and pinion whine, slowed by each compression ('rur-rur-rur')."""
    n = n_(dur)
    comp = rpm_c / 60.0 * 2.0
    ph = np.cumsum(np.full(n, comp)) / SR
    mod = np.cos(TAU * ph)
    crank = rpm_c * (1 - 0.16 * mod) * (1 + 0.02 * wobble(rng, n, 8, circular=False))
    fm = 95.0 * crank / rpm_c
    amp = env_ar(n, 0.05, 0.04) * (0.78 - 0.22 * mod)
    motor = voiced(fm, amp, [(450.0, 300.0), (1400.0, 600.0)], tilt=0.8, fmax=5000)
    whine = np.sin(TAU * np.cumsum(fm * 4.3) / SR) * amp
    brush = filt(rng.standard_normal(n), ("bp", 3500, 1.0)) * amp
    out = norm(motor) + norm(whine) * 0.15 + brush / (np.std(brush) + 1e-12) * 0.03
    peaks = np.nonzero(np.diff(np.floor(ph + 0.5)) > 0)[0]
    for i in peaks:  # compression chuffs
        place(out, norm(burst(rng, n_(0.12), 0.01, 0.04, ("lp", 250))), int(i), 0.45)
    return out, crank


def van_start(rng, stubborn=False):
    """Key click, starter cranks, the old petrol four coughs and catches, revs up and settles to idle."""
    segs = [(0.25, 0.85 if stubborn else 1.05)]
    if stubborn:
        segs.append((0.25 + 0.85 + 0.45, 0.7))
    t_c = segs[-1][0] + segs[-1][1]
    total = t_c + 2.6
    n = n_(total)
    out = np.zeros(n)
    place(out, _metal_click(rng, 2900, 900, 0.005), 0.02, 0.25)  # ignition key
    rpm = np.full(n, 0.0)
    for s0, d in segs:
        st, crank = _starter(rng, d)
        place(out, st, s0, 0.8)
        rpm[n_(s0):n_(s0) + len(crank)] = crank[: n - n_(s0)]
    i_c = n_(t_c)
    m = n - i_c
    run = ctrl(m, [(0, 220), (0.08, 420), (0.35, 1450), (0.55, 1520), (1.2, 900), (2.6, 840)], "exp")
    rpm[i_c:] = run
    rpm = np.maximum(rpm, 1.0)
    thr = np.zeros(n)
    thr[i_c:] = ctrl(m, [(0, 0.85), (0.4, 0.6), (0.7, 0.2), (2.6, 0.15)])
    cough_windows = [(n_(s0 + d - 0.25), n_(s0 + d)) for s0, d in segs[:-1]]

    def misfire(i):
        if i < i_c:
            return 0.35 if any(a <= i < b for a, b in cough_windows) else 1.0
        return 0.3 if i < i_c + n_(0.3) else 0.02

    thr[:i_c] = 0.7
    eng = engine(rng, rpm, VAN_OFFSETS, thr, VAN_EXHAUST, misfire=misfire, mech=0.04, fan=0.08)
    place(out, eng, 0, 0.75)
    # the starter lets go with a tiny clack
    place(out, _metal_click(rng, 2300, 500, 0.006), t_c + 0.12, 0.2)
    out *= np.concatenate([np.ones(n - n_(0.6)), np.cos(np.linspace(0, np.pi / 2, n_(0.6))) ** 2])
    return reverb(out, rng, 0.4, 0.1, hf_rt=0.4)


def van_drive(rng, dur=10.0, rpm=2350.0):
    """Inside the van at country-road speed: muffled engine hum, tyre roar, a little wind, one road seam."""
    n = n_(dur)
    r = _loop_rpm(rng, n, rpm, 0.012, 0.15)
    thr = np.clip(0.55 + 0.05 * wobble(rng, n, 0.2, circular=True), 0, 1)
    cabin = VAN_EXHAUST + [("lp", 900, 0.7), ("peak", r.mean() / 60 * 2, 2.0, 3)]
    eng = engine(rng, r, VAN_OFFSETS, thr, cabin, circular=True, cycle_var=0.05, mech=0.015, fan=0.05)
    road = filt(colored(rng, n, -4.5), ("lp", 900), ("hp", 60), ("peak", 180, 1.0, 4), circular=True)
    road *= 1 + 0.15 * wobble(rng, n, 0.7, circular=True)
    tread = filt(rng.standard_normal(n), ("bp", 520, 4.0), circular=True)
    wind = filt(rng.standard_normal(n), ("bp", 1800, 0.7), circular=True) * (1 + 0.3 * wobble(rng, n, 0.3))
    std = lambda x: x / (np.std(x) + 1e-12)  # noqa: E731
    out = std(eng) * 1.0 + std(road) * 0.75 + std(tread) * 0.08 + std(wind) * 0.12
    tb = rng.uniform(1.0, dur - 1.0)
    for k, a in enumerate([1.0, 0.8]):  # front and rear axle over a road seam
        m = n_(0.25)
        th = norm(burst(rng, m, 0.002, 0.04, ("lp", 150))) + norm(modes(m, [70, 130], [1, 0.5], [0.05, 0.03]))
        place(out, th, tb + k * 0.11, 1.4 * a, circular=True)
    for k in range(2):  # the cups in the cupboard answer
        tk = n_(0.1)
        cup = modes(tk, [3100 * rng.uniform(0.9, 1.1), 5200], [1, 0.4], [0.03, 0.015], rng, tc=0.0001)
        place(out, norm(cup), tb + 0.13 + k * rng.uniform(0.05, 0.09), 0.25, circular=True)
    return out


def van_door(rng, slide=0.42, slam=1.0):
    """Sliding door: handle click, rollers along the track, a heavy ka-chunk and a little rattle inside."""
    out = zeros(slide + 1.2)
    place(out, _metal_click(rng, 2600, 600), 0.01, 0.4)
    t0 = 0.06
    nr = n_(slide)
    roll = filt(rng.standard_normal(nr), ("lp", 500), ("hp", 70)) * bump(nr, 0.5, 0.8)
    place(out, norm(roll), t0, 0.45)
    for tm in poisson_times(rng, slide, 45):
        place(out, norm(modes(n_(0.03), [1200 * rng.uniform(0.9, 1.1), 1900], [1, 0.4], [0.006, 0.004])),
              t0 + float(tm), 0.08 * float(np.interp(tm, [0, slide * 0.5, slide], [0.4, 1, 0.6])))
    ts = t0 + slide
    m = n_(0.5)
    tm = tt(m)
    thump = np.sin(TAU * np.cumsum(85 * (1 + 0.5 * np.exp(-tm / 0.012))) / SR) * env_hit(m, 0.002, 0.045)
    fr = np.array([180, 265, 410, 590, 830, 1150]) * rng.uniform(0.95, 1.05)
    panel = modes(m, fr, [1, 0.8, 0.7, 0.5, 0.35, 0.25], q_tau(fr, 30), tc=0.0012)
    place(out, norm(thump), ts, 1.0 * slam)
    place(out, norm(panel), ts, 0.6 * slam)
    place(out, _metal_click(rng, 2900, 700), ts, 0.45)
    place(out, _metal_click(rng, 2200, 500), ts + 0.04, 0.35)
    for k in range(3):
        cup = modes(n_(0.1), [3000 * rng.uniform(0.85, 1.15), 4900], [1, 0.4], [0.03, 0.015], rng, tc=0.0001)
        place(out, norm(cup), ts + rng.uniform(0.05, 0.22), 0.06)
    return reverb(out, rng, 0.4, 0.12, hf_rt=0.4)


def _horn_tone(rng, f, dur, sag=0.0):
    n = n_(dur + 0.08)
    tm = tt(n)
    droop = ctrl(n, [(0, 0), (dur * 0.5, sag), (dur * 0.8, sag * 0.4), (dur, sag * 1.4), (dur + 0.08, sag * 2)])
    ft = f * (1 - 0.03 * np.exp(-tm / 0.025)) * (1 - droop) * (1 + 0.002 * wobble(rng, n, 12, circular=False))
    amp = np.zeros(n)
    amp[: n_(dur)] = env_ar(n_(dur), 0.012, 0.04)
    v = voiced(ft, amp, [(1750.0, 500.0), (3000.0, 800.0)], tilt=0.6, fmax=7000, odd=0.8)
    return np.tanh(1.5 * norm(v)) / np.tanh(1.5)


def van_horn(rng, pattern="double", low=415.0, high=520.0):
    """An old two-tone horn (major third), a bit tired and comic: hup-hup, or one long sagging hööp."""
    honks = [(0.02, 0.16, 0.0), (0.29, 0.36, 0.012)] if pattern == "double" else [(0.02, 0.6, 0.03)]
    out = zeros(1.4)
    for t0, d, sag in honks:
        place(out, _horn_tone(rng, low, d, sag), t0, 1.0)
        place(out, _horn_tone(rng, high, d, sag * 1.2), t0 + 0.004, 0.75)
    out = filt(out, ("hp", 150), ("lp", 5000, 0.7))
    return reverb(out, rng, 0.5, 0.15, hf_rt=0.4)


# ─── motorcycle ────────────────────────────────────────────────────────────────────────────────────────

def _twin(rng, rpm, thr, circular=False, misfire=None, cycle_var=0.18):
    y = engine(rng, rpm, TWIN_OFFSETS, thr, BIKE_EXHAUST, circular=circular, tau=(0.0011, 0.0003),
               cyl_var=0.1, cycle_var=cycle_var, misfire=misfire, rasp=0.4, mech=0.04)
    # engine block and exhaust body: a low rumble that follows the firing energy and fills the gaps
    n = len(y)
    env = filt(np.abs(y), ("lp", 12), circular=circular)
    env = env / (np.max(env) + 1e-12)
    rumble = filt(colored(rng, n, -6), ("lp", 280), ("hp", 40), circular=circular)
    rumble = rumble / (np.std(rumble) + 1e-12) * (0.25 + 0.75 * env)
    return y + rumble * 0.35


def _pop(rng):
    m = n_(0.05)
    return norm(burst(rng, m, 0.0002, 0.008, ("hp", 250), ("lp", 4000)))


def bike_kick(rng, peak=2600.0, kicks=1):
    """Kick-start: lever ratchet, a compression chuff, the big twin catches (RÖÖÖHR), settles to a lumpy idle."""
    tk = [0.02] if kicks == 1 else [0.02, 1.0]
    t_c = tk[-1] + 0.3
    total = t_c + 2.7
    n = n_(total)
    out = np.zeros(n)
    rpm = np.full(n, 1.0)
    for k, t0 in enumerate(tk):
        place(out, _metal_click(rng, 2500, 700), t0, 0.5)
        for j in range(2):
            place(out, _metal_click(rng, 3300, 1100, 0.004), t0 + 0.04 + j * 0.03, 0.2)
        m = n_(0.35)
        rpm[n_(t0 + 0.08): n_(t0 + 0.08) + m] = ctrl(m, [(0, 30), (0.08, 380), (0.2, 260), (0.35, 150)])
        place(out, norm(burst(rng, n_(0.15), 0.01, 0.05, ("lp", 200))), t0 + 0.2, 0.55)  # compression chuff
        if k < len(tk) - 1:
            place(out, _metal_click(rng, 2100, 500), t0 + 0.55, 0.35)  # lever springs back
    i_c = n_(t_c)
    m = n - i_c
    rpm[i_c:] = ctrl(m, [(0, 300), (0.12, 1600), (0.32, peak), (0.45, peak * 0.95), (1.0, 1300), (1.4, 1050),
                         (2.7, 1030)], "exp")
    thr = np.zeros(n)
    thr[i_c:] = ctrl(m, [(0, 0.9), (0.35, 0.9), (0.47, 0.08), (2.7, 0.12)])

    def misfire(i):
        if i < i_c:
            return 0.9
        return 0.25 if i < i_c + n_(0.1) else 0.02

    eng = _twin(rng, rpm, thr, misfire=misfire)
    place(out, eng, 0, 0.9)
    place(out, _metal_click(rng, 2100, 500), t_c + 0.1, 0.3)
    for tp in np.sort(rng.uniform(t_c + 0.5, t_c + 1.0, 2)):  # a couple of soft overrun pops
        place(out, _pop(rng), float(tp), 0.5)
    out *= np.concatenate([np.ones(n - n_(0.55)), np.cos(np.linspace(0, np.pi / 2, n_(0.55))) ** 2])
    return reverb(out, rng, 0.45, 0.12, hf_rt=0.4)


def bike_rev(rng, blips=1, peak=4200.0):
    """Throttle blip(s) of the twin from idle."""
    total = 2.2 if blips == 1 else 2.9
    n = n_(total)
    pts = [(0, 1050), (0.35, 1050)]
    tp = [(0, 0.12), (0.35, 0.12)]
    t = 0.35
    for b in range(blips):
        pk = peak if b == 0 else peak * 0.8
        pts += [(t + 0.2, pk), (t + 0.28, pk * 0.97), (t + 0.7, 1500), (t + 1.0, 1100)]
        tp += [(t + 0.02, 0.95), (t + 0.26, 0.95), (t + 0.32, 0.05), (t + 0.9, 0.12)]
        t += 0.75
    pts.append((total, 1050))
    tp.append((total, 0.12))
    rpm = ctrl(n, pts, "exp")
    thr = ctrl(n, tp)
    out = _twin(rng, rpm, thr)
    out *= env_ar(n, 0.04, 0.35)
    return reverb(out, rng, 0.45, 0.12, hf_rt=0.4)


def bike_idle(rng, dur=8.0, rpm=1020.0):
    """Lumpy twin idle (potato-potato), seamless loop."""
    n = n_(dur)
    r = _loop_rpm(rng, n, rpm, 0.02, 0.7)
    thr = np.full(n, 0.13)
    out = _twin(rng, r, thr, circular=True, cycle_var=0.2)
    chain = filt(rng.standard_normal(n), ("bp", 900, 2.0), circular=True)
    return out + chain / np.std(chain) * 0.03


# ─── workshop and petrol station ───────────────────────────────────────────────────────────────────────

def _bubble(rng, f, tau=0.025):
    m = n_(tau * 6)
    t = tt(m)
    return np.sin(TAU * np.cumsum(f * (1 + 0.3 * t / tau)) / SR) * env_hit(m, 0.003, tau)


def fuel(rng, dur=2.0):
    """Old petrol pump: nozzle click, pump hum and counter ticks, fuel glugging into the tank, shut-off clack."""
    total = dur + 0.9
    n = n_(total)
    out = np.zeros(n)
    place(out, _metal_click(rng, 2400, 550), 0.02, 0.6)
    t0, t1 = 0.06, dur
    m = n_(t1 - t0)
    fm = ctrl(m, [(0, 60), (0.15, 100), (t1 - t0, 100)])
    hum = voiced(fm, env_ar(m, 0.1, 0.05), [(300.0, 200.0), (900.0, 400.0)], tilt=1.2, fmax=3000)
    place(out, norm(hum), t0, 0.12)
    tk = t0 + 0.1
    while tk < t1 - 0.05:  # mechanical counter
        place(out, norm(burst(rng, n_(0.01), 0.0001, 0.0008, ("bp", 3000, 1.5))), tk, 0.07)
        tk += 1 / 9.0
    tf = t0 + 0.08
    mf = n_(t1 - tf)
    flow = filt(rng.standard_normal(mf), ("bp", 700, 0.8)) * (1 + 0.6 * wobble(rng, mf, 18, circular=False))

    def g(f, t):
        fr = 220 * (360 / 220) ** np.clip(t / (t1 - tf), 0, 1)
        return 0.2 + resonance_gain(f, fr, 4.0)

    flow = stft_filter(flow, g, 1024, 256) * env_ar(mf, 0.08, 0.06)
    place(out, norm(flow), tf, 0.55)
    tg = tf + 0.05
    while tg < t1 - 0.1:
        place(out, _bubble(rng, rng.uniform(140, 200)), tg, 0.35 * rng.uniform(0.6, 1.0))
        tg += 1 / 5.0 * rng.uniform(0.8, 1.2)
    place(out, _metal_click(rng, 2000, 450), t1, 0.7)  # automatic shut-off
    for k, d in enumerate([0.25, 0.47]):
        place(out, _bubble(rng, rng.uniform(1100, 1500), 0.008), t1 + d, 0.12 - 0.04 * k)
    return reverb(out, rng, 0.45, 0.1, hf_rt=0.4)


def _ratchet_click(rng):
    n = n_(0.04)
    m = modes(n, [3800 * rng.uniform(0.97, 1.03), 5200, 6900, 1500], [1, 0.6, 0.3, 0.7],
              [0.006, 0.004, 0.003, 0.008], rng, tc=0.00008)
    return norm(m) + norm(burst(rng, n, 0.0001, 0.0005, ("bp", 4000, 1))) * 0.3


def wrench(rng, strokes=2, f1=950.0):
    """Ratchet strokes (with the quieter back-swing), then the spanner put down on the steel bench: clank."""
    out = zeros(strokes * 0.75 + 2.6)
    t = 0.01
    for s in range(strokes):
        for k in range(int(rng.integers(5, 8))):
            place(out, _ratchet_click(rng), t, rng.uniform(0.7, 1.0))
            t += 0.045 * rng.uniform(0.9, 1.1)
        if s < strokes - 1:
            t += 0.06
            for k in range(4):  # back-swing: pawl skates over the teeth
                place(out, _ratchet_click(rng), t, 0.25)
                t += 0.028
            t += 0.1
    t += 0.18
    m = n_(2.2)
    ratios = np.array([1, 2.756, 5.404, 8.933])
    for k, (dt, a) in enumerate([(0, 1.0), (0.09, 0.45), (0.06, 0.2)]):
        t += dt
        bar = modes(m, f1 * ratios * rng.uniform(0.99, 1.01), [1, 0.7, 0.4, 0.2],
                    [0.35, 0.2, 0.1, 0.06] if k == 0 else [0.12, 0.07, 0.04, 0.03], rng, tc=0.00008)
        hit = norm(bar) + norm(burst(rng, m, 0.0001, 0.002, ("bp", 2500, 0.8))) * 0.4
        place(out, hit, t, a)
    return reverb(out, rng, 0.6, 0.15, hf_rt=0.4)
