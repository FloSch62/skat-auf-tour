"""Table sounds: cards on felt, finger and knuckle taps, pencil and paper, rubber stamp, chess, UI, sudoku.

Every generator takes (rng, **params) and returns a float array (mono 1-D or stereo (n, 2)) at dsp.SR.
Absolute level does not matter (synth.py normalises per category); relative levels inside a sound do."""
import numpy as np

from dsp import (SR, burst, bump, ctrl, env_ar, env_hit, filt, modes, n_, norm, place, poisson_times, q_tau,
                 resonance_gain, reverb, stft_filter, tt, voiced, wobble, zeros)


# ─── shared building blocks ─────────────────────────────────────────────────────────────────────────────

def _wood(rng, n, f1, ratios, amps, q, tc, jit=0.04):
    fr = [f1 * r * (1 + rng.uniform(-jit, jit)) for r in ratios]
    return modes(n, fr, amps, [q_tau(f, q) for f in fr], rng, tc=tc)


def _puff(rng, dur=0.08, tau=0.011, lp=650.0):
    """Air pushed out from under a card or palm: soft low noise puff."""
    return burst(rng, n_(dur), 0.0008, tau, ("lp", lp), ("hp", 60))


def _slap(rng, bright=2200.0, tau=0.0035):
    """Contact transient of cardboard on cloth."""
    return burst(rng, n_(0.04), 0.0003, tau, ("bp", bright, 0.8), ("lp", 6500))


def _swish(rng, dur, lo=1800.0, hi=7000.0, peak=0.6, power=1.3, sweep=(1.15, 0.75), q=1.1):
    """Card sliding or moving through air: band of noise whose centre glides."""
    ns = n_(dur)
    x = rng.standard_normal(ns)
    c0, c1 = sweep
    fc0 = np.sqrt(lo * hi)

    def g(f, tm):
        u = np.clip(tm / max(dur, 1e-3), 0, 1)
        return resonance_gain(f, fc0 * (c0 + (c1 - c0) * u), q, floor=0.06)

    y = stft_filter(x, g, 512, 128)
    y = filt(y * bump(ns, peak, power), ("hp", lo * 0.5), ("lp", hi))
    return norm(y)


def _card_land(rng, tock=260.0, slap=0.5, puff=0.6, bright=2200.0, body=0.55):
    """A card landing flat on a felt mat over a wooden table."""
    n = n_(0.14)
    out = np.zeros(n)
    place(out, norm(_slap(rng, bright)), 0, slap)
    f1 = tock * (1 + rng.uniform(-0.06, 0.06))
    tk = modes(n, [f1, f1 * 1.93, f1 * 3.1, f1 * 4.6], [1, 0.45, 0.22, 0.1], [0.022, 0.012, 0.007, 0.004],
               tc=0.0009)
    place(out, norm(tk), 0, body)
    place(out, norm(_puff(rng)), 0, puff)
    return out


def _finger_tap(rng, f1=330.0, hard=0.5):
    """Fingertip tap on the felt-covered table: dull, short, a hint of wood."""
    n = n_(0.12)
    tc = 0.0025 - 0.0018 * hard
    wood = _wood(rng, n, f1, [1, 2.1, 3.4, 5.2], [1, 0.5, 0.25, 0.1], 14, tc)
    out = norm(wood) * 0.8
    out += norm(burst(rng, n, 0.0008, 0.008, ("lp", 420))) * 0.45
    out += norm(burst(rng, n, 0.0003, 0.0015, ("bp", 2200, 0.9))) * 0.12 * hard
    return out


# ─── cards ─────────────────────────────────────────────────────────────────────────────────────────────

def card_play(rng, tock=260.0, slap=0.5, puff=0.6, swish=0.15, bright=2200.0, felt=1.0, room=0.07):
    """A soft 'tock' of cardboard on felt: pre-swish, contact slap, card/table body, air puff."""
    out = zeros(0.45)
    t0 = n_(0.05)
    ns = n_(rng.uniform(0.035, 0.055))
    s = rng.standard_normal(ns) * np.linspace(0, 1, ns) ** 2.2
    place(out, norm(filt(s, ("hp", 1800), ("lp", 7000))), t0 - ns, swish)
    place(out, _card_land(rng, tock, slap, puff, bright), t0)
    out = filt(out, ("hs", 3500, -4.0 * felt))
    return reverb(out, rng, 0.32, room, hf_rt=0.4)


def card_deal(rng, dur=0.13, band=3200.0, end=0.75, land=0.35, snick=0.25, room=0.06):
    """Dealing: thumb snick off the deck, a swish through the air, a light landing."""
    out = zeros(dur + 0.3)
    place(out, norm(burst(rng, n_(0.02), 0.0002, 0.0015, ("bp", 4200, 1.2))), 0, snick)
    sw = _swish(rng, dur, lo=band * 0.45, hi=min(band * 2.8, 10000), peak=0.55, sweep=(1.15, end))
    place(out, sw, 0.004, 1.0)
    landing = _card_land(rng, tock=rng.uniform(280, 340), slap=0.35, puff=0.4, bright=2600, body=0.35)
    place(out, norm(landing), dur * 0.88, land)
    out = filt(out, ("hs", 5000, -3))
    return reverb(out, rng, 0.3, room, hf_rt=0.4)


def card_raise(rng, dur=0.075, tick=0.15):
    """A card lifted a little out of the hand: tiny high swish."""
    out = zeros(dur + 0.08)
    place(out, norm(burst(rng, n_(0.01), 0.0002, 0.001, ("bp", 3800, 1.4))), 0, tick)
    place(out, _swish(rng, dur, 2500, 8500, peak=0.35, power=1.5, sweep=(0.9, 1.2)), 0.002, 1.0)
    return reverb(out, rng, 0.25, 0.05, hf_rt=0.4)


def _riffle_click(rng, lo=2500.0, hi=5500.0):
    n = n_(0.014)
    c = burst(rng, n, 0.0001, rng.uniform(0.0007, 0.0018), ("bp", rng.uniform(lo, hi), 1.0), ("hp", 1200))
    f = rng.uniform(700, 1600)
    body = modes(n, [f, f * 2.3], [1, 0.4], [0.0025, 0.0015], tc=0.0003)
    return norm(c) + norm(body) * 0.2


def shuffle(rng, cards=32, riffle=0.48, bridge=0.28, taps=2, width=0.3):
    """Riffle shuffle (two interleaving halves), the bridge cascade, then the deck squared on the table."""
    total = 0.12 + riffle + 0.1 + bridge + 0.15 + taps * 0.13 + 0.35
    out = zeros(total, stereo=True)
    t0 = 0.08
    # riffle: intervals follow a slow-fast-slow profile
    u = np.linspace(0, 1, cards)
    w = 1.4 - np.sin(np.pi * u) * 0.8 + rng.uniform(-0.25, 0.25, cards)
    times = t0 + np.cumsum(w) / np.sum(w) * riffle
    dens = np.zeros(n_(total))
    for i, tm in enumerate(times):
        side = (i % 2) * 2 - 1 if rng.uniform() > 0.15 else -((i % 2) * 2 - 1)
        a = rng.uniform(0.45, 1.0) * (0.75 + 0.25 * np.sin(np.pi * u[i]))
        place(out, _riffle_click(rng), float(tm), a, pan=side * width)
        dens[n_(tm)] += a
    # paper friction bed following the click density
    env = filt(dens, ("lp", 18)) * 40
    env = np.clip(env / (env.max() + 1e-9), 0, 1)
    bed = filt(rng.standard_normal(len(env)), ("bp", 3800, 0.7)) * env
    out += np.stack([bed, filt(rng.standard_normal(len(env)), ("bp", 3800, 0.7)) * env], 1) * 0.05
    # bridge: cards cascade back together, dense softer flutter
    tb = times[-1] + 0.12
    nb = int(cards * 1.1)
    bt = tb + np.sort(rng.uniform(0, 1, nb)) ** 0.8 * bridge
    for tm in bt:
        a = rng.uniform(0.3, 0.7) * (1 - 0.6 * (tm - tb) / bridge)
        place(out, _riffle_click(rng, 1600, 3500), float(tm), a, pan=rng.uniform(-0.15, 0.15))
    fl = _swish(rng, bridge, 1200, 6000, peak=0.3, sweep=(1.0, 0.8))
    place(out, fl, float(tb), 0.25)
    # squaring taps
    tt0 = tb + bridge + 0.12
    for k in range(taps):
        tap = _card_land(rng, tock=rng.uniform(190, 230), slap=0.25, puff=0.7, bright=1800, body=0.8)
        place(out, norm(tap), float(tt0 + k * rng.uniform(0.11, 0.14)), 0.9 - 0.25 * k)
    out = filt(out, ("hs", 4500, -2))
    return reverb(out, rng, 0.35, 0.08, hf_rt=0.4)


def trick_take(rng, slides=3, spacing=0.07, taps=1):
    """Gathering the three cards of a trick: overlapping slides, little edge ticks, a squaring tap."""
    out = zeros(0.9)
    t = 0.02
    for i in range(slides):
        d = rng.uniform(0.09, 0.16)
        sw = _swish(rng, d, rng.uniform(1300, 1800), rng.uniform(4500, 6500), peak=rng.uniform(0.3, 0.6),
                    sweep=(1.1, 0.85))
        place(out, sw, t, rng.uniform(0.6, 1.0))
        place(out, norm(burst(rng, n_(0.015), 0.0002, 0.0012, ("bp", rng.uniform(2500, 3800), 1.2))),
              t + d * rng.uniform(0.6, 0.9), 0.25)
        t += spacing * rng.uniform(0.8, 1.25)
    t += 0.12
    for k in range(taps):
        tap = _card_land(rng, tock=rng.uniform(220, 260), slap=0.2, puff=0.6, bright=1900, body=0.7)
        place(out, norm(tap), t + k * 0.11, 0.55)
    out = filt(out, ("hs", 4500, -3))
    return reverb(out, rng, 0.3, 0.07, hf_rt=0.4)


def skat_pick(rng, gap=0.11):
    """Two cards slid off the table one after the other, each with a little lift tick."""
    out = zeros(0.6)
    t = 0.01
    for k in range(2):
        d = rng.uniform(0.1, 0.14)
        place(out, _swish(rng, d, 1500, 6000, peak=0.4, sweep=(0.9, 1.15)), t, 0.9 - 0.1 * k)
        place(out, norm(burst(rng, n_(0.02), 0.0002, 0.0018, ("bp", 3300, 1.0))), t + d * 0.92, 0.3)
        t += d + gap * rng.uniform(0.8, 1.2)
    out = filt(out, ("hs", 4500, -3))
    return reverb(out, rng, 0.3, 0.06, hf_rt=0.4)


def bid(rng, taps=2, gap=0.125, f1=330.0):
    """Bidding: two light fingertip taps on the table (tok-tok), accompanying the speech bubble."""
    out = zeros(0.5)
    for k in range(taps):
        place(out, norm(_finger_tap(rng, f1 * (1 + 0.04 * k), hard=0.6)), 0.01 + k * gap * rng.uniform(0.9, 1.1),
              1.0 - 0.22 * k)
    return reverb(out, rng, 0.35, 0.08, hf_rt=0.4)


def pass_flick(rng, clicks=4, span=0.05):
    """Passing: a soft flick of the thumb over the fanned cards ('frrp'), quiet and dull."""
    out = zeros(0.3)
    ts = 0.01 + np.sort(rng.uniform(0, span, clicks))
    for i, tm in enumerate(ts):
        place(out, _riffle_click(rng, 1800, 3500), float(tm), rng.uniform(0.4, 0.8) * (1 - 0.12 * i))
    place(out, _swish(rng, span + 0.04, 1200, 5000, peak=0.4, sweep=(1.0, 0.85)), 0.008, 0.35)
    f = rng.uniform(260, 320)
    place(out, norm(modes(n_(0.08), [f, f * 2.2], [1, 0.3], [0.009, 0.004], tc=0.002)), 0.012, 0.3)
    out = filt(out, ("hs", 3000, -5))
    return reverb(out, rng, 0.3, 0.06, hf_rt=0.4)


# ─── knocks, stamp ─────────────────────────────────────────────────────────────────────────────────────

def _knuckle(rng, f1=150.0, q=22.0):
    n = n_(0.35)
    table = _wood(rng, n, f1, [1, 1.62, 2.4, 3.3, 4.5, 6.1, 8.0], [0.9, 0.8, 0.75, 0.6, 0.4, 0.25, 0.14], q,
                  tc=0.00045, jit=0.03)
    click = burst(rng, n, 0.0001, 0.0009, ("bp", 2600, 0.9))
    flesh = burst(rng, n, 0.0006, 0.006, ("lp", 320))
    return norm(table) + norm(click) * 0.3 + norm(flesh) * 0.4


def knock(rng, count=2, gap=0.16, f1=150.0, q=22.0):
    """Knuckles on the heavy wooden Stammtisch: tock-tock (or three)."""
    out = zeros(count * gap + 0.5)
    for k in range(count):
        a = 1.0 if k == 0 else rng.uniform(0.75, 0.9)
        place(out, _knuckle(rng, f1 * (1 + rng.uniform(-0.03, 0.03)), q), 0.01 + k * gap * rng.uniform(0.92, 1.08), a)
    return reverb(out, rng, 0.45, 0.12, hf_rt=0.4)


def stamp(rng, dab=False, f_body=105.0, f_wood=210.0):
    """Rubber stamp: (ink-pad dab,) a firm muffled thump on paper over a wooden counter."""
    out = zeros(0.9)
    t = 0.02
    if dab:
        d = norm(burst(rng, n_(0.08), 0.002, 0.014, ("lp", 420))) * 0.7
        d += norm(_wood(rng, n_(0.08), 300, [1, 1.8], [1, 0.4], 12, 0.003)) * 0.4
        place(out, d, t, 0.35)
        t += rng.uniform(0.26, 0.32)
    n = n_(0.4)
    tm = tt(n)
    f = f_body * (1 + 0.6 * np.exp(-tm / 0.01))
    thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_hit(n, 0.0015, 0.03)
    wood = _wood(rng, n, f_wood, [1, 1.7, 2.6, 3.8, 5.1], [1, 0.7, 0.5, 0.3, 0.15], 18, 0.0015)
    squish = burst(rng, n, 0.002, 0.012, ("lp", 1500))
    hit = norm(thump) + norm(wood) * 0.7 + norm(squish) * 0.25
    for _ in range(4):
        place(hit, norm(burst(rng, n_(0.006), 0.0002, 0.0008, ("bp", rng.uniform(2500, 4000), 1.5))),
              float(rng.uniform(0.0, 0.02)), 0.08)
    place(out, hit, t)
    return reverb(out, rng, 0.35, 0.1, hf_rt=0.4)


# ─── pencil and paper ──────────────────────────────────────────────────────────────────────────────────

def _stroke(rng, d, speed=1.0, pressure=1.0):
    ns = n_(d)
    sp = bump(ns, rng.uniform(0.3, 0.6), 1.0)
    grain = np.abs(wobble(rng, ns, 260 * speed, circular=False)) ** 1.5
    x = rng.standard_normal(ns) * (0.35 + grain) * env_ar(ns, 0.008, 0.015) * (0.3 + 0.7 * sp ** 0.7)
    fc0 = 2600 * speed

    def g(f, tm):
        u = np.interp(tm, np.arange(ns) / SR, sp)
        return resonance_gain(f, fc0 + 2200 * u * speed, 0.9, floor=0.08)

    y = stft_filter(x, g, 512, 128)
    return norm(filt(y, ("hp", 1300), ("lp", 9000))) * pressure


def _touch(rng):
    n = n_(0.05)
    return norm(modes(n, [rng.uniform(1700, 2000), rng.uniform(230, 280)], [0.5, 1.0], [0.003, 0.009], tc=0.0006))


def _writing(rng, strokes, dmin, dmax, gmin, gmax, speed=1.0):
    total = strokes * (dmax + gmax) + 0.3
    out = zeros(total)
    t = 0.02
    for i in range(strokes):
        d = rng.uniform(dmin, dmax)
        place(out, _touch(rng), t, 0.22)
        place(out, _stroke(rng, d, speed * rng.uniform(0.85, 1.15), rng.uniform(0.7, 1.0)), t + 0.003)
        t += d + rng.uniform(gmin, gmax)
    return reverb(out, rng, 0.3, 0.06, hf_rt=0.4)


def list_write(rng, strokes=6, speed=1.0):
    """Writing a game into the Skat list with a pencil: several short graphite strokes and touch-downs."""
    return _writing(rng, strokes, 0.06, 0.22, 0.03, 0.13, speed)


def pencil(rng, strokes=2, speed=1.0):
    """A single pencil mark (a digit or a letter)."""
    return _writing(rng, strokes, 0.07, 0.17, 0.03, 0.08, speed)


def page_turn(rng, dur=0.6, crackle=260.0, flap=0.5):
    """Turning a newspaper page: swoosh, paper crackle, a soft flap as it lands."""
    out = zeros(dur + 0.35)
    ns = n_(dur)
    env = bump(ns, 0.45, 1.2)
    sw = filt(rng.standard_normal(ns) * env, ("bp", 1800, 0.6), ("hp", 400))
    place(out, norm(sw), 0.0, 0.45)
    ts = poisson_times(rng, dur, lambda t: crackle if t is None else crackle * float(np.interp(t, [0, dur * 0.45, dur], [0.2, 1, 0.1])))
    for tm in ts:
        c = burst(rng, n_(0.006), 0.0001, rng.uniform(0.0003, 0.0018), ("bp", rng.uniform(1500, 6500), 1.3))
        place(out, norm(c), float(tm), float(np.exp(rng.normal(-1.2, 0.6))))
    tf = dur * 0.82
    place(out, norm(_puff(rng, 0.12, 0.025, 260)), tf, flap)
    place(out, norm(_slap(rng, 1600, 0.004)), tf, flap * 0.25)
    return reverb(out, rng, 0.35, 0.08, hf_rt=0.4)


# ─── chess ─────────────────────────────────────────────────────────────────────────────────────────────

def _chess_tock(rng, f_board=480.0, f_piece=2400.0, felt=0.0, weight=1.0):
    n = n_(0.2)
    tc = 0.00025 + 0.0015 * felt
    board = _wood(rng, n, f_board, [1, 1.48, 2.1, 2.9, 3.9], [1, 0.6, 0.45, 0.28, 0.15], 30, tc)
    piece = _wood(rng, n, f_piece, [1, 1.6, 2.3], [1, 0.5, 0.3], 40, tc)
    click = burst(rng, n, 0.0001, 0.0005, ("bp", 3000, 1.0))
    thud = burst(rng, n, 0.0005, 0.01, ("lp", 220))
    return (norm(board) * 0.8 + norm(piece) * 0.45 * (1 - 0.6 * felt) + norm(click) * 0.3 * (1 - felt)
            + norm(thud) * 0.3 * weight)


def chess_move(rng, f_board=480.0, f_piece=2400.0, slide=False, felt=0.15):
    """A weighted wooden piece set down on a wooden board: a clear, satisfying tock."""
    out = zeros(0.7)
    t = 0.01
    if slide:
        d = rng.uniform(0.09, 0.14)
        place(out, _swish(rng, d, 600, 3000, peak=0.5, sweep=(1.0, 0.9)), t, 0.12)
        t += d * 0.95
    place(out, _chess_tock(rng, f_board * rng.uniform(0.96, 1.04), f_piece * rng.uniform(0.95, 1.05), felt), t)
    return reverb(out, rng, 0.35, 0.1, hf_rt=0.4)


def chess_capture(rng, f_board=470.0):
    """Capture: the moving piece clicks against the captured one, that one is set aside, then a firm tock."""
    out = zeros(1.0)
    n = n_(0.1)
    fp = rng.uniform(2600, 3100)
    tik = _wood(rng, n, fp, [1, 1.55, 2.4], [1, 0.6, 0.3], 45, 0.0002) + norm(
        burst(rng, n, 0.0001, 0.0004, ("bp", 3500, 1.0))) * 0.4
    place(out, norm(tik), 0.01, 0.55)
    ta = 0.01 + rng.uniform(0.16, 0.2)
    place(out, norm(_chess_tock(rng, 360 * rng.uniform(0.95, 1.05), 2100, felt=0.4, weight=0.5)), ta, 0.45)
    tm = ta + rng.uniform(0.2, 0.25)
    place(out, norm(_chess_tock(rng, f_board * rng.uniform(0.96, 1.04), 2400, felt=0.1, weight=1.1)), tm, 1.0)
    return reverb(out, rng, 0.35, 0.1, hf_rt=0.4)


# ─── UI and sudoku ─────────────────────────────────────────────────────────────────────────────────────

def _wood_click(rng, f=2000.0, low=0.6):
    n = n_(0.07)
    m = modes(n, [f, f * 2.65, f * 0.22], [1.0, 0.25, low], [0.006, 0.0025, 0.009], tc=0.0003)
    c = burst(rng, n, 0.0001, 0.0003, ("bp", 4000, 1.0))
    return norm(m) + norm(c) * 0.12


def ui_click(rng, f=2000.0):
    """Soft wooden click (default button sound): small woodblock-like tick with a low body."""
    out = zeros(0.15)
    place(out, _wood_click(rng, f * rng.uniform(0.985, 1.015)), 0.002)
    out = filt(out, ("hs", 5000, -4))
    return reverb(out, rng, 0.25, 0.06, hf_rt=0.4)


def ui_back(rng, f=1800.0, gap=0.055):
    """Back: two soft wooden ticks, the second lower and quieter."""
    out = zeros(0.2)
    place(out, _wood_click(rng, f), 0.002, 1.0)
    place(out, _wood_click(rng, f * 0.76, low=0.8), 0.002 + gap, 0.75)
    out = filt(out, ("hs", 5000, -4))
    return reverb(out, rng, 0.25, 0.06, hf_rt=0.4)


def ui_open(rng, f=2100.0, flap=0.07):
    """Open: a short rising paper flap and a light tick."""
    out = zeros(0.25)
    place(out, _swish(rng, flap, 1500, 7000, peak=0.65, sweep=(0.8, 1.25)), 0.002, 0.45)
    place(out, _wood_click(rng, f * 1.05, low=0.4), 0.002 + flap * 0.85, 0.9)
    out = filt(out, ("hs", 5000, -4))
    return reverb(out, rng, 0.25, 0.06, hf_rt=0.4)


def sudoku_right(rng, f=1318.5, mallet=0.7):
    """Correct digit: a soft mallet note on a small wooden bar (marimba-like), warm and short."""
    n = n_(0.6)
    tc = 0.0004 + 0.0005 * mallet
    bar = modes(n, [f, f * 3.93, f * 9.2], [1.0, 0.18, 0.05], [0.09, 0.02, 0.007], tc=tc, split=0.0004)
    tube = modes(n, [f], [0.35], [0.12], attack=0.004)
    tick = burst(rng, n, 0.0001, 0.0006, ("bp", 3200, 1.0))
    out = norm(bar) + norm(tube) * 0.3 + norm(tick) * 0.08
    return reverb(out, rng, 0.35, 0.1, hf_rt=0.5)


def sudoku_wrong(rng, f0=165.0, dur=0.38, fall=0.83):
    """Wrong digit: a gentle low hummed 'hm' (closed mouth, nasal), falling a little."""
    n = n_(dur + 0.1)
    f = ctrl(n, [(0, f0 * 0.97), (0.05, f0), (dur * 0.6, f0 * 0.93), (dur, f0 * fall)])
    f = f * (1 + 0.004 * wobble(rng, n, 5, circular=False))
    a = ctrl(n, [(0, 0), (0.03, 0.8), (0.08, 1.0), (dur * 0.65, 0.8), (dur, 0.0)])
    form = [(260.0, 70.0), (1050.0, 220.0), (2300.0, 300.0)]

    def nasal(k, fk):
        return 1 - 0.85 * resonance_gain(fk, 820.0, 3.0)

    v = voiced(f, a, form, tilt=1.4, fmax=3200, harm_fn=nasal)
    breath = filt(rng.standard_normal(n), ("lp", 600)) * a * 0.02
    out = norm(v) + breath
    return reverb(out, rng, 0.3, 0.06, hf_rt=0.5)
