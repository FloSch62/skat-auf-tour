"""Stings: a happy accordion phrase, a good-natured 'wah-wah' trombone, a small brass-band fanfare.

Instruments are additive: accordion = detuned free reeds (musette) with bellows envelope; brass = harmonic series
whose brightness grows with loudness (as in real brass), a small pitch scoop at the attack, delayed vibrato and an
ensemble of two slightly detuned players per part."""
import numpy as np

from dsp import (SR, TAU, burst, colored, ctrl, env_hit, filt, fshape, midi_hz, modes, n_, norm, place, reverb, tt,
                 voiced, wobble, zeros)

NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"])}


def m(name: str) -> int:
    """'Bb4' -> MIDI number."""
    p, o = name[:-1], int(name[-1])
    return 12 * (o + 1) + NOTE[p]


def _std(x):
    return x / (np.std(x) + 1e-12)


# ─── instruments ───────────────────────────────────────────────────────────────────────────────────────

def accordion(rng, note, dur, vel=0.8, reeds=((0, 1.0), (7, 0.8), (-6, 0.7)), attack=0.025, release=0.08,
              bright=1.0):
    f0 = midi_hz(m(note) if isinstance(note, str) else note)
    n = n_(dur + release + 0.03)
    env = ctrl(n, [(0, 0), (attack, vel), (dur * 0.5, vel * 0.97), (dur, vel * 0.94), (dur + release, 0),
                   (dur + release + 0.03, 0)])
    env = env * (1 + 0.03 * wobble(rng, n, 2.0, circular=False))
    out = np.zeros(n)
    for cents, g in reeds:
        f = f0 * 2 ** (cents / 1200) * (1 + 0.0005 * wobble(rng, n, 3.0, circular=False))
        out += g * voiced(f, env, [(2500.0 * bright, 2000.0)], tilt=0.85, fmax=7000, odd=0.8)
    out = filt(out, ("lp", 6500 * bright), ("peak", 1200, 1.0, 2))
    return out + filt(rng.standard_normal(n), ("bp", 3000, 1.0)) * env * 0.004 * np.std(out) / (np.std(env) + 1e-9)


BRASS = {
    "trumpet": dict(formants=[(1300.0, 900.0), (2600.0, 1800.0)], beta=2.2, fmax=8000, vib=0.004, scoop=0.03,
                    tilt=0.35, attack=0.025),
    "horn": dict(formants=[(550.0, 500.0), (1100.0, 1200.0)], beta=1.4, fmax=4000, vib=0.003, scoop=0.02,
                 tilt=0.6, attack=0.04),
    "trombone": dict(formants=[(700.0, 600.0), (1400.0, 1400.0)], beta=1.8, fmax=6000, vib=0.0035, scoop=0.025,
                     tilt=0.45, attack=0.035),
    "tuba": dict(formants=[(280.0, 300.0), (700.0, 700.0)], beta=1.2, fmax=2500, vib=0.0, scoop=0.015, tilt=0.6,
                 attack=0.04),
}


def brass(rng, kind, note, dur, vel=0.8, wah=None, vib=1.0, droop=0.0, cents=0.0):
    """One brass note. wah: (closed_hz, open_hz, open_time, wobble_hz) plunger mute formant."""
    p = BRASS[kind]
    f0 = midi_hz(m(note) if isinstance(note, str) else note) * 2 ** (cents / 1200)
    rel = 0.07
    n = n_(dur + rel + 0.03)
    tm = tt(n)
    a = p["attack"]
    env = ctrl(n, [(0, 0), (a * 0.6, vel * 1.08), (a * 1.6, vel), (dur, vel * 0.92), (dur + rel, 0),
                   (dur + rel + 0.03, 0)])
    ramp = np.clip((tm - 0.18) / 0.2, 0, 1)
    vibr = p["vib"] * vib * ramp * np.sin(TAU * 5.3 * tm + rng.uniform(0, TAU))
    f = f0 * (1 - p["scoop"] * np.exp(-tm / 0.018)) * (1 + vibr) * (1 + 0.0008 * wobble(rng, n, 4, circular=False))
    if droop:
        f = f * (1 - droop * np.clip((tm - dur * 0.6) / (dur * 0.4 + rel), 0, 1) ** 2)
    e = env / (np.max(env) + 1e-12)
    beta = p["beta"]

    def harm(k, fk):
        return np.maximum(e, 1e-4) ** (beta * (k - 1) / 8.0)

    forms = list(p["formants"])
    if wah is not None:
        closed, opened, t_open, wob = wah
        wc = ctrl(n, [(0, closed), (t_open, opened), (n / SR, opened)])
        if wob:
            wc = wc * (1 - 0.3 * (0.5 - 0.5 * np.cos(TAU * wob * np.clip(tm - t_open, 0, None))))
        forms = [(wc, 350.0)] + forms[1:]
    v = voiced(f, env, forms, tilt=p["tilt"], fmax=p["fmax"], harm_fn=harm)
    breath = filt(rng.standard_normal(n), ("bp", p["formants"][0][0], 1.0)) * e
    return v + _std(breath) * np.std(v) * 0.03


def section(rng, kind, note, dur, vel=0.8, players=2, spread_cents=4.0, slop=0.006, **kw):
    """A few players of one part: slight detune and timing differences make it an ensemble."""
    out = np.zeros(n_(dur + 0.2 + slop * 2))
    for i in range(players):
        c = (i - (players - 1) / 2) * spread_cents + rng.normal(0, 1.0)
        x = brass(rng, kind, note, dur, vel * rng.uniform(0.92, 1.0), cents=c, **kw)
        place(out, x, slop + rng.uniform(-slop, slop))
    return out / players


def cymbal(rng, dur=1.8):
    n = n_(dur)
    x = colored(rng, n, -1.0)
    x = filt(x, ("hp", 2500), ("peak", 5200, 1.0, 4), ("lp", 11000))
    x = x * env_hit(n, 0.001, dur * 0.28)
    fr = rng.uniform(3000, 9000, 40)
    rings = modes(n, fr, rng.uniform(0.3, 1.0, 40), rng.uniform(0.2, 0.8, 40), rng, tc=0.0001, rand_phase=True)
    return norm(_std(x) + _std(rings) * 0.6)


def bass_drum(rng):
    n = n_(0.6)
    tm = tt(n)
    f = 58 * (1 + 0.8 * np.exp(-tm / 0.02))
    body = np.sin(TAU * np.cumsum(f) / SR) * env_hit(n, 0.002, 0.18)
    click = filt(rng.standard_normal(n), ("lp", 1800)) * env_hit(n, 0.0005, 0.004)
    return norm(norm(body) + norm(click) * 0.25)


# ─── stings ────────────────────────────────────────────────────────────────────────────────────────────

WIN_TUNES = {
    1: dict(  # F major: pickup triplet, up the triad, held top with the chord
        right=[("C5", 0.0, 0.085, 0.6), ("D5", 0.095, 0.085, 0.62), ("E5", 0.19, 0.085, 0.65), ("F5", 0.285, 0.17, 0.8),
               ("A5", 0.475, 0.17, 0.85), ("C6", 0.665, 0.95, 0.9), ("A5", 0.665, 0.95, 0.55), ("F5", 0.665, 0.95, 0.5)],
        bass=[("F3", 0.285, 0.16, 0.7), ("F2", 0.665, 0.9, 0.6), ("F3", 0.665, 0.9, 0.6)],
        chords=[(("C4", "F4", "A4"), 0.475, 0.14, 0.45), (("C4", "F4", "A4"), 0.665, 0.9, 0.45)],
    ),
    2: dict(  # G major: ta-ta-ta TAA, ta-ta DAA
        right=[("D5", 0.0, 0.09, 0.62), ("D5", 0.12, 0.09, 0.62), ("D5", 0.24, 0.09, 0.65), ("G5", 0.36, 0.25, 0.8),
               ("F#5", 0.66, 0.09, 0.65), ("G5", 0.78, 0.09, 0.7), ("B5", 0.9, 0.85, 0.9), ("G5", 0.9, 0.85, 0.55),
               ("D5", 0.9, 0.85, 0.5)],
        bass=[("G3", 0.36, 0.2, 0.7), ("D3", 0.66, 0.15, 0.6), ("G2", 0.9, 0.8, 0.6), ("G3", 0.9, 0.8, 0.6)],
        chords=[(("B3", "D4", "G4"), 0.66, 0.12, 0.45), (("B3", "D4", "G4"), 0.9, 0.8, 0.45)],
    ),
}


def win_sting(rng, tune=1):
    """A short happy accordion phrase (musette reeds, oom-pah left hand)."""
    t = WIN_TUNES[tune]
    out = zeros(2.6, stereo=True)
    for note, t0, d, v in t["right"]:
        place(out, accordion(rng, note, d, v), t0, 1.0, pan=0.15)
    for note, t0, d, v in t["bass"]:
        place(out, accordion(rng, note, d, v, reeds=((0, 1.0), (-1200, 0.6)), attack=0.02, bright=0.7), t0, 0.7,
              pan=-0.2)
    for notes, t0, d, v in t["chords"]:
        for note in notes:
            place(out, accordion(rng, note, d, v, reeds=((0, 1.0), (5, 0.7)), attack=0.02, bright=0.85), t0, 0.45,
                  pan=-0.1)
    return reverb(out, rng, 0.9, 0.2, hf_rt=0.5)


def lose_sting(rng):
    """Muted trombone 'wah wah wah waaah' (chromatic descent), friendly, with a comic droop at the end."""
    out = zeros(3.0, stereo=True)
    notes = [("G3", 0.0, 0.3), ("F#3", 0.36, 0.3), ("F3", 0.72, 0.3), ("E3", 1.08, 1.0)]
    for i, (note, t0, d) in enumerate(notes):
        last = i == len(notes) - 1
        wah = (450.0, 1300.0, 0.12, 3.5 if last else 0.0)
        x = brass(rng, "trombone", note, d, 0.8, wah=wah, vib=3.0 if last else 0.6, droop=0.018 if last else 0.0)
        place(out, x, t0, 1.0, pan=0.0)
    place(out, brass(rng, "tuba", "E2", 0.9, 0.5), 1.1, 0.35, pan=0.0)
    return reverb(out, rng, 0.8, 0.18, hf_rt=0.5)


def trophy_fanfare(rng):
    """A small brass band fanfare in B-flat: triplet pickup, the tonic, a turn, the long top note with cymbal."""
    out = zeros(4.2, stereo=True)
    parts = []  # (kind, note, start, dur, vel, pan)
    for i, t0 in enumerate([0.0, 0.13, 0.26]):
        parts.append(("trumpet", "F4", t0, 0.1, 0.7 + 0.03 * i, -0.3))
    parts += [
        ("trumpet", "Bb4", 0.40, 0.45, 0.85, -0.3), ("trumpet", "F4", 0.40, 0.45, 0.6, -0.35),
        ("horn", "D4", 0.40, 0.45, 0.6, 0.35), ("trombone", "Bb3", 0.40, 0.45, 0.6, 0.15),
        ("trombone", "F3", 0.40, 0.45, 0.55, 0.2), ("tuba", "Bb1", 0.40, 0.42, 0.7, 0.0),
        ("trumpet", "D5", 0.90, 0.16, 0.8, -0.3), ("trumpet", "Bb4", 1.08, 0.16, 0.75, -0.3),
        ("trumpet", "D5", 1.26, 0.16, 0.8, -0.3), ("trumpet", "Bb4", 0.90, 0.16, 0.55, -0.35),
        ("trumpet", "G4", 1.08, 0.16, 0.55, -0.35), ("trumpet", "Bb4", 1.26, 0.16, 0.55, -0.35),
        ("horn", "F4", 0.90, 0.5, 0.55, 0.35), ("trombone", "C4", 0.90, 0.5, 0.5, 0.15),
        ("trombone", "A3", 0.90, 0.5, 0.5, 0.2), ("tuba", "F1", 0.90, 0.2, 0.65, 0.0), ("tuba", "F2", 1.17, 0.2, 0.55, 0.0),
        ("trumpet", "F5", 1.44, 1.3, 0.9, -0.3), ("trumpet", "D5", 1.44, 1.3, 0.7, -0.35),
        ("horn", "Bb4", 1.44, 1.3, 0.6, 0.35), ("horn", "F4", 1.44, 1.3, 0.55, 0.4),
        ("trombone", "D4", 1.44, 1.3, 0.6, 0.15), ("trombone", "Bb3", 1.44, 1.3, 0.55, 0.2),
        ("tuba", "Bb1", 1.44, 1.3, 0.75, 0.0),
    ]
    for kind, note, t0, d, v, pan in parts:
        x = section(rng, kind, note, d, v, players=2 if kind != "tuba" else 1)
        place(out, x, t0, 1.0, pan=pan)
    place(out, cymbal(rng) * 0.25, 1.44, 1.0, pan=-0.2)
    place(out, bass_drum(rng) * 0.5, 1.44, 1.0, pan=0.0)
    place(out, bass_drum(rng) * 0.35, 0.40, 1.0, pan=0.0)
    out *= np.concatenate([np.ones(len(out) - n_(0.5)), np.cos(np.linspace(0, np.pi / 2, n_(0.5))) ** 2])[:, None]
    return reverb(out, rng, 1.3, 0.22, hf_rt=0.5)
