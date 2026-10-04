"""SKAT AUF TOUR score plans for YuE2 (contract §11). Adapted from TIME TO LIVE audio-src/music/plans.py (same author,
read-only there): one original ABC plan per piece, rendered by YuE2-3B with a text style brief.

Brief: warm, acoustic, instrumental. Accordion, guitar, double bass, clarinet, brush drums, a small brass section; on
the road 1970s easy listening like from a car radio. No vocals. Every melody below is written for this game from
scratch (no quoted tunes); `heimfahrt` deliberately reprises the `daheim` theme (leitmotif of home).

Rules (lessons from TTL / FAULTLINE):
- Every bar is exactly one 4/4 measure of 32 units (L:1/32), one chord per bar; four-bar sections arranged by a form:
  intro -> body -> 2 tail bars. The ABC "Vocal" voice is rests only (chord symbols), the melody sits in "Ins".
- Block labels are non-vocal only (intro / instrumental / interlude / outro): YuE2 plans singing for verse/chorus.
  Style texts never mention voices or "song"; NEGATIVE (CFG) pushes away from voices, yodel, synths and EDM.
- Loops: loopStart follows an EARLIER occurrence of the body's final section (layout()), so the seam joins the same
  music. Takes are delivered as performed (user rule, 2026-10-04): tools/deliver.py finds these bar lines in each
  take itself (or the best-matching bar lines near them) and blends 40 ms at the seam; nothing is time-conformed.
- Layered pieces (stammtisch, preisskat): `calm` and `tense` share key, tempo, bars and chords; `tense` may replace a
  section's melody with a denser figure on the SAME chords (never a different bar count). The two layers are separate
  performances, delivered with "synced": false and their own loop points.

Usage: python plans.py            -> check every plan, print a summary
       python plans.py <id> [ver] -> print the style text and ABC of one version"""
import hashlib, re, sys

NOTE = re.compile(r"[=^_]*[A-Ga-gz][,']*(\d*)")
VOICES = ("Vocals, a singer singing lyrics, sung words, spoken words, speech, narration, voice-over, rap, whispering, "
          "a choir, wordless choir aahs, vocal pads, humming, yodeling, a crowd singing along, a solo voice, "
          "pop song with a lead vocalist, schlager singer.")
NEGATIVE = (VOICES + " Electronic synthesizer music, synth pads, EDM, techno, club beat, drum machine, "
            "four-on-the-floor kick, modern pop production, autotune, dubstep, trap hi-hats, heavy metal, "
            "distorted electric guitars.")
NEGATIVE_ROCK = (VOICES + " Electronic synthesizer music, EDM, techno, club beat, drum machine, modern pop production, "
                 "autotune, dubstep, trap hi-hats, heavy metal screaming.")
SUFFIX = " Purely instrumental."
KEYNAME = {"C": "C major", "G": "G major", "D": "D major", "A": "A major", "E": "E major", "F": "F major",
           "Bb": "B-flat major", "Dm": "D minor", "Gm": "G minor", "Am": "A minor"}
KEYACC = {"C": {}, "G": {"F": 1}, "D": {"F": 1, "C": 1}, "A": {"F": 1, "C": 1, "G": 1},
          "E": {"F": 1, "C": 1, "G": 1, "D": 1}, "F": {"B": -1}, "Bb": {"B": -1, "E": -1}, "Dm": {"B": -1},
          "Gm": {"B": -1, "E": -1}, "Am": {}}
TONIC = {k: k[:-1] if k.endswith("m") else k for k in KEYACC}


def S(chords, bars):
    """One four-bar section: S("G Em C D7", "d12 B4 G8 B8 | e12 d4 B8 G8 | ...")."""
    chords = chords.split()
    bars = [b.strip() for b in bars.split("|")]
    assert len(chords) == len(bars) == 4, (chords, bars)
    return (chords, bars)


def body(*names, interlude=("C1", "C2")):
    """Form entries for a body: (name, label); C sections are quieter interludes."""
    return [(n, "interlude" if n in interlude else "instrumental") for n in names]


P = {}

# ---------------------------------------------------------------- daheim: the main theme (kitchen, title)
# v1 (takes t1, t2: G major, lilting folk-dance melody, accordion lead) was rejected by the user after listening:
# "klingt zu sehr nach Heimatfilm". v2 (takes from t3): a new composition in a laid-back 1970s light-jazz idiom
# (maj7/m7 harmony, a cheeky minor-iv turn, syncopated phrases with rests), the guitar leads and the accordion only
# answers; style text built on the stammtisch calm t1 prompt the user liked. The v1 score stays in its takes.
DAHEIM = dict(
    I=S("Fmaj7 Dm7 Gm7 C7", "A16 c16 | F16 A16 | B16 d16 | e16 z16"),
    A1=S("Fmaj7 Am7 Bbmaj7 C7", "z4 A4 c4 e4 z4 d4 c8 | A12 G4 E8 z8 | z4 B4 d4 f4 z4 a4 f8 | e8 d4 c4 B8 G8"),
    A2=S("Dm7 Gm7 C7 Fmaj7", "z4 F4 A4 c4 z4 d4 c8 | B12 A4 G8 F8 | z4 E4 G4 B4 d4 c4 B4 G4 | A12 F4 z16"),
    B1=S("Bbmaj7 Bbm7 Am7 D7", "d8 f8 a12 z4 | _d8 f8 _a12 z4 | c8 e8 g12 z4 | ^f4 a4 c'4 a4 ^f4 d4 c8"),
    B2=S("Gm7 C7 Fmaj7 C7", "z4 B4 d4 f4 a8 g8 | e12 d4 c8 B8 | A8 c8 e8 f8 | g12 e4 c8 z8"),
    C1=S("Dm7 Am7 Bbmaj7 Fmaj7", "d16 f16 | e16 c16 | d16 f16 | e24 z8"),
    C2=S("Gm7 Am7 Bbmaj7 C7", "d16 B16 | c16 A16 | d16 f16 | e8 g8 B8 c8"),
)
NO_HEIMATFILM = (" Sentimental 1950s homeland film music, syrupy lush strings, zither, alpine folk music, yodel, "
                 "oompah, schunkel sing-along, sentimental waltz, marching band.")
DAHEIM_STYLE = (
    "Relaxed, warm instrumental main theme for coming home to the kitchen: laid-back 1970s acoustic easy listening "
    "with a light jazz touch. A nylon-string acoustic guitar plays the melody, a soft accordion answers with short "
    "phrases, a plucked upright double bass and soft brushes on a snare drum, a clarinet now and then. Coffee on the "
    "kitchen table, unhurried and a little cheeky, a sly grin; warm and dry small-band sound, acoustic, intimate, "
    "not sentimental.")
DAHEIM_RHODES = (
    "Relaxed, warm instrumental main theme for coming home to the kitchen: laid-back 1970s easy listening with a "
    "light jazz touch. A warm Rhodes electric piano and a nylon-string acoustic guitar share the melody, a plucked "
    "upright double bass, soft brushes on a snare drum, a clarinet answering now and then, a soft accordion in the "
    "background. Unhurried and a little cheeky, a sly grin; warm and dry small-band sound, intimate, not sentimental.")
P["daheim"] = dict(
    key="F", bpm=96, kind="single", sections=DAHEIM, takes_from=3, revision="v2 (light jazz, after user feedback)",
    negative=None,   # set below (NEGATIVE + NO_HEIMATFILM)
    form=[("I", "intro")] + body("A1", "A2", "B1", "B2", "A1", "A2", "C1", "C2", "A1", "A2", "B1", "B2", "A1", "A2"),
    tail=("Fmaj7 Fmaj7", ["F32", "F,32"]),
    versions=dict(main=dict(style=DAHEIM_STYLE)),
    take_styles={5: DAHEIM_RHODES},
    clap=["laid-back 1970s acoustic easy listening with nylon guitar and upright bass",
          "relaxed light jazz instrumental with acoustic guitar and brushes",
          "warm acoustic small band instrumental with guitar, accordion and clarinet"],
    use="kitchen (home), title, tour book")

# ---------------------------------------------------------------- enztal: stage map, lower Enz valley (light)
ENZTAL = dict(
    I=S("D G A7 A7", "D8 F8 A16 | G8 B8 d16 | c8 e8 A16 | A16 z16"),
    A1=S("D Bm Em A7", "F4 A4 d8 c4 d4 A8 | B4 d4 f8 e4 d4 B8 | G4 B4 e8 d4 B4 G8 | A12 G4 E8 C8"),
    A2=S("D Bm A7 D", "F4 A4 d8 c4 d4 A8 | B4 d4 f8 e4 d4 B8 | c8 e8 g8 e8 | d16 z8 A8"),
    B1=S("G D Em A7", "d8 B4 d4 g8 d8 | f8 d4 f4 a8 f8 | e4 g4 b8 a4 g4 e8 | a8 g8 e8 c8"),
    B2=S("D G A7 D", "f8 d4 f4 a8 f8 | g8 d4 g4 b8 g8 | a8 g4 f4 e8 c8 | d24 z8"),
    C1=S("Bm F#m G D", "f16 d8 B8 | c16 A8 F8 | B12 d4 g8 f8 | f16 e8 d8"),
    C2=S("Em Bm E7 A7", "g16 e8 B8 | f16 d8 B8 | ^G16 B8 d8 | c8 e8 a8 g8"),
)
P["enztal"] = dict(
    key="D", bpm=108, kind="single", sections=ENZTAL,
    form=[("I", "intro")] + body("A1", "A2", "B1", "B2", "A1", "A2", "C1", "C2", "A1", "A2", "B1", "B2", "A1", "A2"),
    tail=("D D", ["D32", "D,32"]),
    versions=dict(main=dict(style=(
        "Light, sunny 1970s easy listening instrumental like from an old car radio on a country road: a bouncy "
        "strummed acoustic guitar, a cheerful accordion melody, a clarinet counter-melody, a walking upright bass, "
        "brushed drums with a gentle shuffle and a small soft brass section adding warm chords. A camper van rolling "
        "along a green river valley past vineyards and villages; relaxed, friendly and nostalgic."))),
    clap=["1970s easy listening instrumental music like from a car radio", "cheerful acoustic folk music with accordion",
          "light instrumental travel music with guitar, accordion and clarinet"],
    use="stage map, region Enztal")

# ---------------------------------------------------------------- stromberg: stage map, vineyards (clarinet)
STROMBERG = dict(
    I=S("F Bb C7 C7", "F8 A8 c16 | B8 d8 f16 | e8 c8 G8 E8 | C16 z16"),
    A1=S("F Dm Gm C7", "c12 A4 F8 A8 | d12 c4 A8 F8 | B12 A4 G8 D8 | E8 G8 c8 B8"),
    A2=S("F Dm C7 F", "c12 A4 F8 A8 | d12 c4 A8 F8 | G12 B4 E8 G8 | F24 z8"),
    B1=S("Bb F Gm C7", "d8 f8 d8 B8 | c8 A8 F8 A8 | B8 d8 g8 f8 | e16 c8 G8"),
    B2=S("Bb F C7 F", "d8 f8 d8 B8 | c8 A8 F8 A8 | G8 B8 e8 c8 | f24 z8"),
    C1=S("Dm Am Bb F", "a16 f8 d8 | e16 c8 A8 | f16 d8 B8 | c24 z8"),
    C2=S("Gm Dm G7 C7", "g16 d8 B8 | f16 d8 A8 | =B8 d8 g8 f8 | e8 g8 c8 B8"),
)
P["stromberg"] = dict(
    key="F", bpm=100, kind="single", sections=STROMBERG,
    form=[("I", "intro")] + body("A1", "A2", "B1", "B2", "A1", "A2", "C1", "C2", "A1", "A2", "B1", "B2", "A1", "A2"),
    tail=("F F", ["F32", "F,32"]),
    versions=dict(main=dict(style=(
        "Sunny, gently swinging 1970s instrumental: a warm woody clarinet plays the melody, an accordion and a "
        "strummed acoustic guitar accompany, a plucked upright double bass and light brushed drums, a soft muted "
        "trumpet in the background. Rolling vineyard hills in late summer, a glass of local red wine, relaxed, "
        "cheeky and friendly, nostalgic easy listening."))),
    clap=["warm clarinet melody with accordion and acoustic guitar", "gently swinging acoustic instrumental with clarinet",
          "nostalgic 1970s easy listening instrumental music"],
    use="stage map, region Mühlacker / Stromberg")

# ---------------------------------------------------------------- schwarzwald: stage map, Black Forest (horn, calm)
SCHWARZWALD = dict(
    I=S("Bb Eb Bb F", "F16 B16 | G16 e16 | d32 | c24 z8"),
    A1=S("Bb Gm Eb F", "F16 B8 d8 | d16 c8 B8 | G16 B8 e8 | c24 z8"),
    A2=S("Bb Gm F Bb", "F16 B8 d8 | d16 c8 B8 | A16 c8 F8 | B24 z8"),
    B1=S("Eb Bb Cm F", "G8 B8 e16 | d16 B8 F8 | e8 g8 e8 c8 | c16 A16"),
    B2=S("Eb Bb F Bb", "G8 B8 e16 | d16 B8 F8 | A8 c8 f8 e8 | d24 z8"),
    C1=S("Gm Dm Eb Bb", "B16 d16 | A16 F16 | G16 B16 | F24 z8"),
    C2=S("Cm Gm C7 F", "G16 e16 | d16 B16 | =E16 G8 B8 | A16 c16"),
)
P["schwarzwald"] = dict(
    key="Bb", bpm=76, kind="single", sections=SCHWARZWALD,
    form=[("I", "intro")] + body("A1", "A2", "B1", "B2", "A1", "A2", "C1", "C2", "A1", "A2"),
    tail=("Bb Bb", ["B32", "B,32"]),
    versions=dict(main=dict(style=(
        "Calm, misty Black Forest instrumental: a warm French horn plays a slow, noble melody over a fingerpicked "
        "acoustic guitar, a soft sustained accordion, a gentle upright bass and quiet strings; no drums. Deep fir "
        "forest, mountain mist and a winding road, peaceful and a little solemn, nostalgic 1970s film music warmth."))),
    clap=["calm French horn melody with acoustic guitar", "peaceful slow orchestral forest music with horn",
          "gentle calm instrumental music without drums"],
    use="stage map, region Schwarzwald")

# ---------------------------------------------------------------- stuttgart: stage map, the city (dance orchestra)
STUTTGART = dict(
    I=S("Cmaj7 Am7 Dm7 G7", "e16 g16 | c16 e16 | d16 f16 | g16 G16"),
    A1=S("Cmaj7 Am7 Dm7 G7", "e4 g4 b8 a4 g4 e8 | c4 e4 g8 f4 e4 c8 | d4 f4 a8 g4 f4 d8 | B8 d8 f8 g8"),
    A2=S("Em7 Dm7 G7 Cmaj7", "g4 b4 d'8 b4 g4 e8 | f4 a4 c'8 a4 f4 d8 | B4 d4 g8 f4 d4 B8 | c16 z8 G8"),
    B1=S("Fmaj7 Bb7 Em7 A7", "a12 g4 f8 e8 | _b12 _a4 f8 d8 | g12 e4 d8 B8 | ^c8 e8 g8 a8"),
    B2=S("Dm7 G7 Cmaj7 Cmaj7", "f12 e4 d8 A8 | B12 d4 f8 g8 | e16 g8 b8 | c24 z8"),
    C1=S("Am E7 Am A7", "a8 e8 c8 e8 | ^g8 e8 B8 d8 | c8 e8 a8 c'8 | ^c8 e8 g8 e8"),
    C2=S("Dm7 G7 Dm7 G7", "d4 f4 a8 c'8 a8 | g8 f8 d8 B8 | d4 f4 a8 c'8 a8 | g8 f8 d8 G8"),
)
P["stuttgart"] = dict(
    key="C", bpm=116, kind="single", sections=STUTTGART,
    form=[("I", "intro")] + body("A1", "A2", "B1", "B2", "A1", "A2", "C1", "C2", "A1", "A2", "B1", "B2", "A1", "A2"),
    tail=("Cmaj7 Cmaj7", ["c32", "C32"]),
    versions=dict(main=dict(style=(
        "Elegant 1970s German dance orchestra instrumental: a vibraphone plays the melody, a smooth brass section "
        "with trumpets and trombones answers, a walking upright bass, swing drums with brushes and ride cymbal, "
        "piano comping and a touch of strings. Big city lights and a ballroom evening, sophisticated, cheerful "
        "and relaxed easy listening big band."))),
    clap=["1970s big band dance orchestra with vibraphone and brass", "swinging easy listening orchestra music",
          "vibraphone melody with walking bass and brushed swing drums"],
    use="stage map, region Stuttgart")

# ---------------------------------------------------------------- stammtisch: the inn table, layers calm / tense
STAMMTISCH = dict(
    I=S("Dm Gm A7 A7", "D8 F8 A16 | G8 B8 d16 | ^c8 e8 A16 | A16 z16"),
    A1=S("Dm Gm Dm A7", "A4 d4 f4 d4 a8 f8 | g4 a4 g4 f4 d8 B8 | f4 e4 d4 A4 F8 A8 | ^c8 e8 a8 g8"),
    A2=S("Dm Gm A7 Dm", "A4 d4 f4 d4 a8 f8 | g4 a4 g4 f4 d8 B8 | ^c4 d4 e4 f4 g8 e8 | d16 z8 A8"),
    B1=S("F C7 F Bb", "c8 f8 a8 f8 | g8 e8 c8 B8 | A8 c8 f8 a8 | b16 f8 d8"),
    B2=S("Gm Dm E7 A7", "g12 f4 d8 B8 | f12 e4 d8 A8 | ^G8 =B8 d8 e8 | a8 g8 e8 ^c8"),
    C1=S("Bb F Gm A7", "d16 f16 | c16 A16 | B16 d16 | ^c24 z8"),
    C2=S("Bb F E7 A7", "d16 f16 | a16 f16 | ^g16 e16 | a8 g8 e8 ^c8"),
)
STAMMTISCH_TENSE = dict(   # the interlude becomes a driving arpeggio figure on the same chords
    C1=S("Bb F Gm A7", "B4 d4 f4 d4 B4 d4 f4 d4 | A4 c4 f4 c4 A4 c4 f4 c4 | G4 B4 d4 B4 G4 B4 d4 B4 | "
                      "A4 ^c4 e4 g4 a8 z8"),
    C2=S("Bb F E7 A7", "B4 d4 f4 d4 B4 d4 f4 d4 | A4 c4 f4 c4 a4 f4 c4 A4 | ^G4 =B4 e4 =B4 ^g4 e4 =B4 ^G4 | "
                      "a8 g8 e8 ^c8"),
)
P["stammtisch"] = dict(
    key="Dm", bpm=104, kind="layers", sections=STAMMTISCH,
    form=[("I", "intro")] + body("A1", "A2", "B1", "B2", "A1", "A2", "C1", "C2", "A1", "A2", "B1", "B2", "A1", "A2"),
    tail=("Dm Dm", ["D32", "D,32"]),
    versions=dict(
        calm=dict(style=(
            "Cosy, slightly cheeky tavern instrumental for a card game at the regulars' table of a country inn in "
            "southern Germany: an accordion plays the melody, a strummed acoustic guitar on the offbeats, a plucked "
            "upright double bass and soft brushes on a snare drum, a clarinet answering. Warm wood-panelled room, "
            "relaxed and friendly, a sly grin; 1970s, acoustic, intimate, unhurried.")),
        tense=dict(over=STAMMTISCH_TENSE, style=(
            "Tense, exciting tavern instrumental as a card game at the regulars' table gets close: a driving plucked "
            "upright double bass in steady eighths, staccato accordion chords, a tight snare drum with brushes and "
            "rim clicks, a clarinet with nervous trills and quick runs, a small brass section with short stabs, "
            "rising suspense. Acoustic 1970s crime-comedy tension, playful but urgent."))),
    clap=["cosy tavern music with accordion, acoustic guitar and double bass", "acoustic folk instrumental with accordion and clarinet",
          "playful minor-key accordion music"],
    use="inn table (Skat); calm by default, tense when a game gets close")

# ---------------------------------------------------------------- preisskat: tournament, layers calm / tense, walking bass
PREISSKAT = dict(
    I=S("Gm Cm D7 D7", "G8 B8 d16 | c8 e8 g16 | ^f8 a8 d16 | D16 z16"),
    A1=S("Gm Gm Cm D7", "d4 B4 G4 B4 d8 g8 | f4 g4 f4 d4 B8 G8 | c4 e4 g4 e4 c8 G8 | ^F8 A8 c8 d8"),
    A2=S("Gm Cm D7 Gm", "d4 B4 G4 B4 d8 g8 | g4 a4 g4 e4 c8 e8 | ^f4 g4 a4 g4 ^f8 d8 | g16 z8 D8"),
    B1=S("Cm F7 Bb Eb", "e8 g8 c'8 g8 | A8 c8 e8 f8 | d12 c4 B8 F8 | G16 B8 e8"),
    B2=S("Cm Gm A7 D7", "c12 d4 e8 g8 | f12 e4 d8 B8 | ^c8 =e8 g8 a8 | ^f8 d8 A8 ^F8"),
    C1=S("Eb Bb Cm D7", "g16 e16 | f16 d16 | e16 c16 | d24 z8"),
    C2=S("Eb Bb A7 D7", "B16 e16 | d16 f16 | =e16 ^c16 | d8 ^F8 A8 c8"),
)
PREISSKAT_TENSE = dict(
    C1=S("Eb Bb Cm D7", "e4 g4 b4 g4 e4 g4 b4 g4 | d4 f4 b4 f4 d4 f4 b4 f4 | c4 e4 g4 e4 c4 e4 g4 e4 | "
                       "d4 ^f4 a4 c'4 d'8 z8"),
    C2=S("Eb Bb A7 D7", "e4 g4 b4 g4 e4 g4 b4 g4 | d4 f4 b4 f4 d4 f4 b4 f4 | ^c4 =e4 g4 a4 ^c'4 a4 g4 =e4 | "
                       "d8 ^F8 A8 c8"),
)
P["preisskat"] = dict(
    key="Gm", bpm=120, kind="layers", sections=PREISSKAT,
    form=[("I", "intro")] + body("A1", "A2", "B1", "B2", "A1", "A2", "C1", "C2", "A1", "A2", "B1", "B2", "A1", "A2"),
    tail=("Gm Gm", ["G32", "G,32"]),
    versions=dict(
        calm=dict(style=(
            "Relaxed acoustic swing for a card tournament in a village hall: a walking upright double bass, a rhythm "
            "guitar playing four-to-the-bar chords, a clarinet melody, accordion fills and light brushed drums. "
            "Concentrated, friendly competition; 1970s, warm and acoustic, medium swing.")),
        tense=dict(over=PREISSKAT_TENSE, style=(
            "Hot, driving acoustic swing as a card tournament reaches its climax: a strong walking upright double "
            "bass, a pumping rhythm guitar, an urgent clarinet melody with fast runs, accordion stabs, a small brass "
            "section punching accents, crisp brushed snare and ride cymbal. Suspenseful, competitive and energetic "
            "1970s acoustic swing."))),
    clap=["acoustic swing jazz with walking double bass and clarinet", "gypsy swing with rhythm guitar, accordion and clarinet",
          "lively acoustic jazz instrumental with walking bass"],
    use="Preisskat tournament table; calm by default, tense when a game gets close")

# ---------------------------------------------------------------- raetsel: problems, chess, sudoku (very calm)
RAETSEL = dict(
    I=S("Cmaj7 Fmaj7 Cmaj7 G", "c32 | c32 | e32 | d32"),
    A1=S("Cmaj7 Em7 Fmaj7 G", "e16 g16 | b24 a8 | a16 f16 | g16 d16"),
    A2=S("Am7 Em7 Fmaj7 C", "c16 e16 | g24 e8 | f16 a16 | e32"),
    B1=S("Fmaj7 Em7 Dm7 Cmaj7", "a24 g8 | g24 e8 | f24 d8 | e32"),
    B2=S("Fmaj7 Em7 Dm7 G", "c'24 a8 | b24 g8 | a16 f16 | d32"),
    C1=S("Am Em F C", "A32 | B32 | c32 | G32"),
    C2=S("Dm7 Am7 Fmaj7 G", "d16 f16 | e16 c16 | a16 f16 | g24 z8"),
)
P["raetsel"] = dict(
    key="C", bpm=72, kind="single", sections=RAETSEL,
    form=[("I", "intro")] + body("A1", "A2", "B1", "B2", "A1", "A2", "C1", "C2", "A1", "A2"),
    tail=("C C", ["c32", "C32"]),
    versions=dict(main=dict(style=(
        "Very calm, quiet instrumental for thinking: a soft felt piano and a nylon-string classical guitar play "
        "sparse, gentle phrases with long sustained notes and lots of space; no drums, no percussion. Peaceful, "
        "reflective, warm and unobtrusive, like a quiet afternoon over a chess board."))),
    clap=["very calm soft piano and classical guitar music", "quiet peaceful instrumental music for concentration",
          "gentle sparse acoustic music without drums"],
    use="Skat problems, chess, sudoku")

# ---------------------------------------------------------------- stellplatz: campsite, dog meadow (evening, guitar)
STELLPLATZ = dict(
    I=S("A D A E", "A16 c16 | d16 f16 | e32 | B24 z8"),
    A1=S("A F#m D E", "c12 B4 A8 c8 | f12 e4 c8 A8 | d12 f4 a8 f8 | e24 z8"),
    A2=S("A F#m E A", "c12 B4 A8 c8 | f12 e4 c8 A8 | B12 c4 =d8 B8 | A24 z8"),
    B1=S("D A Bm E", "f16 d8 f8 | e16 c8 A8 | d12 c4 B8 d8 | e16 B16"),
    B2=S("D A E A", "a16 f8 d8 | e16 c8 e8 | g12 f4 e8 =d8 | c24 z8"),
    C1=S("F#m C#m D A", "A16 c16 | G16 E16 | F16 A16 | E32"),
    C2=S("Bm F#m B7 E", "d16 B16 | c16 A16 | ^d16 f16 | e24 z8"),
)
P["stellplatz"] = dict(
    key="A", bpm=84, kind="single", sections=STELLPLATZ,
    form=[("I", "intro")] + body("A1", "A2", "B1", "B2", "A1", "A2", "C1", "C2", "A1", "A2", "B1", "B2", "A1", "A2"),
    tail=("A A", ["A32", "A,32"]),
    versions=dict(main=dict(style=(
        "Evening at a campsite in the countryside: a warm fingerpicked acoustic guitar plays a gentle melody, a soft "
        "accordion breathes sustained chords, a quiet upright bass and very light brushes. Sunset over the meadow, "
        "dogs resting in the grass next to a camper van; peaceful, tender and nostalgic 1970s acoustic instrumental."))),
    clap=["gentle fingerpicked acoustic guitar evening music", "peaceful acoustic instrumental with guitar and accordion",
          "calm nostalgic campfire guitar music"],
    use="pitch / campsite, dog meadow, quiet events")

# ---------------------------------------------------------------- motorradtreff: bikers' meeting (1970s blues rock)
BLUES = dict(
    I=S("E7 E7 E7 E7", "E4 G4 B4 c4 =d4 c4 B4 G4 | E4 G4 B4 c4 =d4 c4 B4 G4 | E4 G4 B4 c4 =d4 c4 B4 G4 | "
                       "B,8 =D8 E16"),
    S1=S("E7 E7 E7 E7", "B8 =d4 e4 z4 =g4 e8 | =d4 B4 =G4 E4 z16 | B8 =d4 e4 z4 =g4 e8 | =d4 B4 =G4 A4 B16"),
    S2=S("A7 A7 E7 E7", "a8 =g4 e4 z4 c4 A8 | =g4 e4 c4 A4 z16 | B8 =d4 e4 z4 =g4 e8 | =d4 B4 =G4 E4 z16"),
    S3=S("B7 A7 E7 B7", "f8 d4 f4 a8 f8 | e8 c4 e4 =g8 e8 | B8 =G4 E4 z16 | F8 A8 B8 d8"),
    R1=S("E7 E7 E7 E7", "e4 =g4 b4 =g4 e4 =d4 B8 | b8 a4 =g4 e8 =d8 | e4 =g4 b4 =g4 e4 =d4 B8 | =G4 A4 B4 =d4 e16"),
    R2=S("A7 A7 E7 E7", "a4 c'4 e'4 c'4 a4 =g4 e8 | =g8 e4 c4 A16 | b4 =g4 e4 =d4 B16 | =G4 E4 =D4 E4 z16"),
    R3=S("B7 A7 E7 B7", "f4 a4 b4 a4 f4 d4 B8 | e4 =g4 a4 =g4 e4 c4 A8 | B4 =G4 E4 =G4 B16 | d8 f8 a8 b8"),
)
P["motorradtreff"] = dict(
    key="E", bpm=96, kind="single", sections=BLUES, negative=NEGATIVE_ROCK,
    form=[("I", "intro")] + body("S1", "S2", "S3", "S1", "S2", "S3", "R1", "R2", "R3", "S1", "S2", "S3",
                                 interlude=()),
    tail=("E7 E7", ["E32", "E,32"]),
    versions=dict(main=dict(style=(
        "Gritty 1970s blues rock instrumental at a bikers' meeting: a bottleneck slide guitar plays the lead, a "
        "Hammond organ with a rotating speaker, a dry punchy rock drum kit, a round electric bass and a crunchy "
        "rhythm guitar. Twelve-bar blues shuffle, laid-back and warm, leather jackets and chrome, analog tape."))),
    clap=["1970s blues rock with slide guitar and Hammond organ", "twelve bar blues rock shuffle instrumental",
          "classic rock instrumental with electric guitar, organ and drums"],
    use="bikers' meeting, motorcycle detours")

# ---------------------------------------------------------------- pokal: victory (brass band march, plays once)
POKAL = dict(
    I=S("Bb F Bb F", "F4 F4 B8 d8 f8 | f12 e4 c8 A8 | d4 d4 f8 b8 f8 | c16 F16"),
    A1=S("Bb F7 F7 Bb", "d8 f8 B8 d8 | c8 e8 A8 c8 | e8 d8 c8 A8 | B16 F16"),
    A2=S("Bb Eb F7 Bb", "d8 f8 B8 d8 | e8 g8 B8 e8 | f8 e8 c8 A8 | B24 z8"),
    B1=S("Eb Bb F7 Bb", "g16 e16 | f16 d16 | e8 d8 c8 A8 | B16 d16"),
    B2=S("Eb Bb F7 Bb", "g12 f4 e8 g8 | f12 d4 B8 d8 | c8 e8 A8 c8 | B32"),
)
P["pokal"] = dict(
    key="Bb", bpm=112, kind="single", sections=POKAL, loop=False,
    form=[("I", "intro")] + body("A1", "A2", "B1", "B2", interlude=()),
    tail=("Bb Bb", ["B32", "B,32"]),
    versions=dict(main=dict(style=(
        "Festive southern German brass band march for a victory: trumpets and flugelhorns play a bright fanfare "
        "melody, tenor horns and baritone in harmony, a tuba bass on the beats, snare drum, bass drum and cymbals. "
        "Proud, triumphant and cheerful, a village festival celebrating the champion with a trophy."))),
    clap=["German brass band march music", "festive brass fanfare with tuba and drums", "triumphant brass band music"],
    use="victory (tour won, tournament won)")

# ---------------------------------------------------------------- heimfahrt: tour end (the daheim theme, gently, once)
HEIM = dict(
    I=S("Fmaj7 Dm7 Gm7 C7", "A16 c16 | F16 A16 | B16 d16 | e24 z8"),
    A1=DAHEIM["A1"], A2=DAHEIM["A2"],
    C1=DAHEIM["C1"], C2=DAHEIM["C2"],
)
P["heimfahrt"] = dict(
    key="F", bpm=84, kind="single", sections=HEIM, loop=False,
    form=[("I", "intro")] + body("A1", "A2", "C1", "C2", "A1", "A2"),
    tail=("Fmaj7 Fmaj7", ["F32", "F,32"]),
    versions=dict(main=dict(style=(
        "Gentle, warm closing music for the drive home at the end of a trip: a nylon-string acoustic guitar plays "
        "the relaxed main melody slowly, a soft accordion answers with short phrases, a plucked upright double bass, "
        "very soft brushes. Evening light on the road home, content and calm, a quiet smile; laid-back 1970s "
        "acoustic easy listening with a light jazz touch, warm and dry, intimate, not sentimental, ending softly."))),
    clap=["gentle relaxed acoustic guitar instrumental", "calm laid-back acoustic easy listening",
          "warm slow instrumental ending music"],
    use="end of a tour (journey home)")

P["daheim"]["negative"] = NEGATIVE + NO_HEIMATFILM
P["heimfahrt"]["negative"] = NEGATIVE + NO_HEIMATFILM

ORDER = ["stammtisch", "daheim", "enztal", "stromberg", "schwarzwald", "stuttgart", "raetsel", "stellplatz",
         "preisskat", "motorradtreff", "pokal", "heimfahrt"]
assert sorted(ORDER) == sorted(P)


def negative(pid):
    return P[pid].get("negative") or NEGATIVE


def bars_of(pid, version):
    """[(chord, ins, label, section_name)] for every bar of one version, intro + body + tail."""
    p = P[pid]
    over = p["versions"][version].get("over", {})
    out = []
    for name, label in p["form"]:
        chords, bars = over.get(name, p["sections"][name])
        assert chords == p["sections"][name][0], f"{pid}/{version}/{name}: chords differ"
        out += [(c, b, label, name) for c, b in zip(chords, bars)]
    tc, tb = p["tail"]
    out += [(c, b, "outro", "tail") for c, b in zip(tc.split(), tb)]
    return out


def layout(pid):
    """Bar layout shared by every version: intro bars, loop [start, end) in bars, total bars, bar seconds."""
    p = P[pid]
    n_intro = 4 * sum(1 for name, _ in p["form"] if name in ("I", "intro"))
    n_body = 4 * len(p["form"]) - n_intro
    n_tail = len(p["tail"][1])
    bar_s = 240.0 / p["bpm"]
    sections = [(4 * i, name, label) for i, (name, label) in enumerate(p["form"])]
    sections.append((n_intro + n_body, "tail", "outro"))
    body_names = [name for name, label in p["form"] if label != "intro"]
    loop_start = n_intro
    if body_names[-1] in body_names[:-1]:
        loop_start = n_intro + 4 * (body_names.index(body_names[-1]) + 1)
    loop = p.get("loop_bars", (loop_start, n_intro + n_body))
    assert 0 <= loop[0] < loop[1] <= n_intro + n_body, f"{pid}: invalid loop bars"
    return dict(intro=n_intro, loop=loop, bars=n_intro + n_body + n_tail, tail=n_tail,
                bar_s=bar_s, sections=sections, loop_ok=p.get("loop", True))


def score(pid, version):
    p = P[pid]
    rows = bars_of(pid, version)
    out = (f'X:1\nT:\nM:4/4\nL:1/32\nQ:1/4={p["bpm"]}\nV: Vocal clef=treble name="Vocal Melody" snm="Vocal"\n'
           f'V: Ins clef=treble name="Ins Melody" snm="Inst."\nK:{p["key"]}\n')
    i = 0
    while i < len(rows):                           # one block per four-bar section (the tail is its own block)
        j = i + 4 if rows[i][3] != "tail" else len(rows)
        block = rows[i:j]
        out += (f"% {block[0][2]}\nV: Vocal\n" + "|".join(f'"{c}"z32' for c, *_ in block) + "|\nV: Ins\n"
                + "|".join(b for _, b, *_ in block) + "|\n")
        i = j
    return out


def style_text(pid, version, n=None):
    """The style brief of one take; a piece may give single takes a variant (take_styles: {n: text})."""
    p = P[pid]
    style = p.get("take_styles", {}).get(n, p["versions"][version]["style"])
    return style + SUFFIX + f' {KEYNAME[p["key"]]}, {p["bpm"]} BPM.'


def seed(pid, version, n):
    h = int(hashlib.sha256(f"skat-auf-tour/{pid}/{version}".encode()).hexdigest()[:6], 16) % 900000 + 100000
    return h + 1000 * n


def check(pid):
    p = P[pid]
    for version in p["versions"]:
        rows = bars_of(pid, version)
        for i, (c, bar, *_rest) in enumerate(rows):
            units = sum(int(n or 1) for n in NOTE.findall(bar))
            if units != 32:
                raise ValueError(f"{pid}/{version} bar {i} ({bar}) has {units} units")
            if not re.fullmatch(r"[A-G][b#]?(m|7|m7|maj7)?", c):
                raise ValueError(f"{pid}/{version} bar {i}: unsupported chord {c}")
        assert len(rows) == layout(pid)["bars"], (pid, version)
    return layout(pid)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        pid = sys.argv[1]
        version = sys.argv[2] if len(sys.argv) > 2 else next(iter(P[pid]["versions"]))
        check(pid)
        print(style_text(pid, version) + "\n\nNEGATIVE: " + negative(pid) + "\n")
        print(score(pid, version))
        sys.exit()
    total = 0.0
    for pid in ORDER:
        L = check(pid)
        dur = L["bars"] * L["bar_s"]
        total += dur * len(P[pid]["versions"])
        print(f"{pid:14} {P[pid]['key']:3} {P[pid]['bpm']:4} BPM  bars {L['bars']:3} (intro {L['intro']}, loop "
              f"{L['loop'][0]}-{L['loop'][1]}, tail {L['tail']})  {dur:6.1f}s  loop {L['loop'][0] * L['bar_s']:.2f}-"
              f"{L['loop'][1] * L['bar_s']:.2f}s ({(L['loop'][1] - L['loop'][0]) * L['bar_s']:.0f}s)"
              f"{'' if L['loop_ok'] else ' NO LOOP'}  versions {list(P[pid]['versions'])}")
    print(f"total planned audio per take set: {total:.0f}s")
