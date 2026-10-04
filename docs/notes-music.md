# Notes: music

Decisions of the music workstream where the contract leaves room (§0.7, §0.12, §11). Folders: `audio-src/music/**`,
`public/audio/music/**`, `public/audio/music.json`. Pipeline adapted from TIME TO LIVE (`audio-src/music/`, read-only
there). Provenance of every take: `audio-src/music/manifest.json`. Progress and GPU holds: `audio-src/PROGRESS.md`.

## What is delivered (2026-10-04)

All 12 ids of `MUSIC` in `src/game/ids.ts`: 14 files, 25.8 MB, 48 kHz stereo OGG Vorbis q4. Each file is one native
YuE2 take as performed. LUFS is integrated over the whole file; the gain itself was set on the loop.

| id | take | file | length | BPM (played) | loop (s) | LUFS / dBTP | MB |
|---|---|---|---|---|---|---|---|
| `stammtisch` | calm = t1 | `stammtisch-calm.ogg` | 2:22.8 | 104.0 | 27.82–138.60 (111 s, bars 12–60) | −19.7 / −5.6 | 1.86 |
| `stammtisch` | tense = t2 | `stammtisch-tense.ogg` | 2:21.1 | 105.8 | 27.43–136.29 (109 s, bars 12–60) | −18.9 / −4.7 | 2.07 |
| `daheim` | main = t3 | `daheim.ogg` | 2:34.6 | 96.0 | 30.17–150.15 (120 s, bars 12–60) | −19.3 / −5.4 | 2.10 |
| `enztal` | main = t1 | `enztal.ogg` | 2:17.4 | 108.0 | 26.82–133.49 (107 s, bars 12–60) | −19.0 / −4.6 | 1.98 |
| `stromberg` | main = t1 | `stromberg.ogg` | 2:26.6 | 102.2 | 37.35–131.71 (94 s, bars 16–56) | −19.1 / −6.5 | 2.10 |
| `schwarzwald` | main = t2 | `schwarzwald.ogg` | 2:24.8 | 76.9 | 37.84–137.60 (100 s, bars 12–44) | −19.7 / −5.2 | 2.04 |
| `stuttgart` | main = t2 | `stuttgart.ogg` | 2:08.3 | 116.0 | 25.00–124.28 (99 s, bars 12–60) | −18.8 / −1.9 | 1.74 |
| `raetsel` | main = t1 | `raetsel.ogg` | 2:34.2 | 72.0 | 36.85–143.51 (107 s, bars 11–43) | −19.2 / −4.5 | 2.04 |
| `stellplatz` | main = t2 | `stellplatz.ogg` | 2:57.3 | 84.0 | 34.44–171.58 (137 s, bars 12–60) | −19.2 / −6.1 | 2.31 |
| `preisskat` | calm = t2 | `preisskat-calm.ogg` | 2:04.0 | 120.0 | 20.10–116.10 (96 s, bars 10–58) | −19.8 / −5.6 | 1.71 |
| `preisskat` | tense = t2 | `preisskat-tense.ogg` | 2:04.0 | 120.0 | 24.03–120.01 (96 s, bars 12–60) | −18.6 / −4.7 | 1.89 |
| `motorradtreff` | main = t2 | `motorradtreff.ogg` | 2:15.2 | 96.0 | 40.22–130.26 (90 s, bars 16–52) | −19.3 / −4.9 | 2.04 |
| `pokal` | main = t2 | `pokal.ogg` | 0:46.4 | 113.5 | plays once (`loop: false`) | −19.1 / −4.5 | 0.69 |
| `heimfahrt` | main = t2 | `heimfahrt.ogg` | 1:24.7 | 85.3 | plays once (`loop: false`) | −19.0 / −3.2 | 1.25 |

The user listened (2026-10-04) and chose `stammtisch` calm t1 + tense t2; calm t1 is the sound template for everything
else. The user approved `enztal` and `stromberg` and rejected `daheim` v1 („zu sehr Heimatfilm“). `daheim` t3 is a
provisional pick from the v2 takes until the user has heard them. Why each take was picked, with the rejected
alternatives: the `note` in `audio-src/music/work/<id>/deliver.json` (also in the manifest and on the listening page).

## `music.json`

`{ "<id>": { files: {main} | {calm, tense}, loop, loopStart, loopEnd, bpm, bars, key, duration, gainDb, takes,
[synced: false, layers: {calm: {loopStart, loopEnd, duration, bpm}, tense: {…}}] } }`. Paths start with
`audio/music/`. `gainDb` is informational (already applied). `bpm` is the tempo the take actually plays; `bars` is the
plan's bar count. For the layered pieces the top-level loop points and duration belong to the calm layer, and
`layers` holds each layer's own values. The two layers are separate performances with different lengths, so
`synced: false`. `src/core/audio.ts` reads `meta.layers?.[name] ?? meta` per source (checked in the browser).

## Rule: as performed, simple mastering only (user, 2026-10-04)

„Bitte nichts nachträglich anpassen, außer einfaches simples Mastering, aber nicht Dinge wie den Takt.“ So there is
no tempo or grid conforming, no time-stretching, no pitch shifting and no editing. TTL's conform/master path is not used.
Per file (`tools/deliver.py`):
- **Gain:** one constant gain. Singles target −19 LUFS over the loop (whole file for pieces that play once). Layered
  pieces: calm −19.5, tense −18.5, so the tense layer comes in a little louder. The gain is lowered if the true peak
  would pass −1.5 dBTP; it never was. No compression, limiting or EQ.
- **Fades:** 10 ms in at the start, 2 s out at the end of the file (the take's own ring-out after the last bar,
  never inside the loop).
- **Loop points** are natural boundaries in the take itself. `align.py` measures the take's beat line, and the bar
  lines are snapped to beats tracked in the audio. Candidates are every bar line within 8 bars of the planned
  points (loopStart right after an earlier occurrence of the body's final section, loopEnd at the end of that final
  section). Each candidate pair is scored on the harmony of the 4 bars before both points (bar chroma) first, then
  the rhythm of the 2 bars before (onset flux) and the level steps. A 40 ms equal-power blend just before loopEnd
  into the 40 ms before loopStart avoids a click. After Vorbis encoding both points slide together by up to 5 ms inside
  that blend, to where the decoded audio matches best: lossy coding renders the two identical stretches slightly
  differently, which otherwise left a small step in quiet pieces.
- **Layers:** one take per layer, picked so that tempo and key match where possible. Preisskat calm t2 and tense t2
  both play at 120.0 BPM, with first downbeats 63 ms apart. Stammtisch calm t1 plays at 104.0 BPM and tense t2 at
  105.8 BPM; the user picked that pair. The engine crossfades unsynced layers over at least 3 s.

## How it is made

```sh
python3 audio-src/music/plans.py                       # check every plan (bars of 32 units, chords), print layout
bash audio-src/music/hold.sh <log> stammtisch:calm:1,2 daheim:main:3-5 …   # one GPU hold (YuE2), ≤ 660 s
bash audio-src/music/analyse.sh process.py <id> …      # CPU: align → CLAP → Whisper (VAD) → evaluate table
bash audio-src/music/analyse.sh deliver.py <id> main=t3 --note "why"      # master + loop points + music.json
bash audio-src/music/analyse.sh check_deliveries.py    # Whisper medium WITHOUT VAD on every delivered file
bash audio-src/music/analyse.sh beatcheck.py <id> …    # loop points against tracked beats
bash audio-src/music/analyse.sh redeliver.py           # re-run deliver.py for all with the recorded picks
bash audio-src/music/analyse.sh manifest.py            # audio-src/music/manifest.json
node audio-src/music/check-browser.mjs                 # Chromium (--disable-gpu): decode, seams, engine (dev server)
```

- **Plans** (`plans.py`): one original ABC plan per piece in four-bar sections (one chord per bar, L:1/32, every bar
  32 units) arranged by a form: 4-bar intro, body, 2 tail bars. The ABC "Vocal" voice holds rests only, with the chord
  symbols; the melody sits in "Ins". Block labels are non-vocal (`intro`, `instrumental`, `interlude`, `outro`). All
  melodies were written for this game; `heimfahrt` reprises the `daheim` v2 theme. Layered pieces share key, tempo,
  bars and chords; the tense plan replaces the interlude melody with a driving arpeggio on the same chords.
- **Prompts:** a style text naming the instruments, room and mood, plus "Purely instrumental. <key>, <BPM> BPM."
  (no "song", no voices). The template is the Stammtisch calm text: accordion melody, strummed acoustic guitar on
  the offbeats, plucked upright double bass, soft brushes, a clarinet answering; warm, relaxed, a sly grin; 1970s,
  acoustic, intimate, unhurried. The brief's exceptions keep their colour: Schwarzwald horn, Stuttgart dance
  orchestra with vibraphone, Rätsel piano and guitar, Motorradtreff blues rock, Pokal brass band.
- **Generation** (`gen.py`, run only through `hold.sh`): YuE2-3B + YuE2-Vae from faultline's `.venv-score`
  (`yue2-infer 0.1.6`, unquantised, CUDA, AR offload, 12 GiB pipeline budget, 32 ODE steps), `cot=full` with the
  external ABC, lyrics empty. Classifier-free guidance 1.6 *away from* a negative `[Tags]` text: voices of every
  kind, yodel, synths/EDM/drum machine, modern pop production. For `daheim` and `heimfahrt` also Heimatfilm
  clichés: syrupy strings, zither, alpine folk, oompah, schunkel, sentimental waltz, marching band. Pokal and
  Motorradtreff keep what their genre needs. Seeds: `plans.seed(id, version, n)` (sha256 of
  `skat-auf-tour/<id>/<version>`, plus 1000 n). Every take keeps `score.abc`, `request.json`, `config.json`,
  `gen.json` (style, negative, CFG, seed, timing, GPU peak) and `audio.flac` (48 kHz 24-bit) in
  `audio-src/music/takes/<id>/<version>/t<n>/`.
- **Analysis** (CPU, nice 15, 4 GiB cap): `align.py` (TTL: beat line, bar 0, plan-following, drift); `judge.py`
  (CLAP: fit to the piece's own descriptors, acoustic vs electronic, vocal vs instrumental, tense vs calm, a
  zero-shot instrument probe); `speech.py` (faster-whisper medium, with VAD on raw takes); `evaluate.py` (hard
  rejects: words, CLAP vocal > 0.5, take too short, short ring-out for once-pieces, transposed layer; tempo, drift
  and lost-plan flags are advisory because nothing is conformed).
- **Checks of the deliveries:** Whisper medium without VAD: all 14 files clean. `beatcheck.py`: every loop point on a
  tracked beat (±0 ms). Browser: every file decodes in Chromium with the exact sample count; every seam rendered as
  the game plays it matches the take's natural transition (largest sample step and level change); the game's own
  `music.play` starts the right sources with the per-layer loop points, and `setLayer("tense")` moves the gains
  (`audio-src/music/work/browser-check.json`).
- CLAP's instrument probe confuses accordion with Hammond organ, and its absolute numbers are only for ranking. The
  user's ears decide; their verdicts are recorded in the manifest (`feedback`).

## Listening page

`http://127.0.0.1:5191/audio-src/music/listen.html` (dev server; not shipped). It plays every delivered id exactly as the game
does (loop points, both layers running, „ruhig“/„eng“ crossfade, „Naht“ = 4 s before the loop end) and lists every
take as its native recording, with the analysis and the pick. The SFX page links back.

## Not used

- TTL's conform/master path (time map, Rubberband, bar-exact layers): forbidden by the user's rule.
- The Qwen2-Audio "listener" from TTL: the cached `Qwen2-Audio-7B-Instruct` snapshot is incomplete (2 of 5 weight
  shards, no tokenizer vocabulary) and was not downloaded again.
