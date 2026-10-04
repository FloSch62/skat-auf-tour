# Audio workstream progress log

Newest last. GPU work only through `audio-src/music/hold.sh`: never while ComfyUI/Krea runs, never while
`audio-src/STOP` exists (checked before and inside the lock), under `flock faultline/.work/locks/gpu.lock`, systemd
unit with 11 GiB memory cap and 660 s maximum. CPU work through `audio-src/music/analyse.sh` (nice 15, 4 threads, 4 GiB).
Every hold: `audio-src/logs/music/holds.tsv`. SFX (CPU synthesis, no GPU): `docs/notes-audio.md`.

## Music (YuE2), 2026-10-04

Start 21:34, after the Krea loop had ended (no ComfyUI process, art queue empty, lock free).

### Hold 1 (21:34–21:44, 576 s): 9 takes
- stammtisch calm t1, t2 and tense t1, t2; daheim v1 t1, t2; enztal t1, t2; stromberg t1. About 60–70 s per 2:20 take.
- Analysis: calm t1 is clean (104.002 BPM, plan followed, Whisper clean, CLAP vocal 0.03); calm t2 drifts; tense t1
  lost the plan; tense t2 is clean but plays 1.7 % fast.
- **User (listening):** stammtisch calm t1 „sounds great“, the template for the rest; then „tense t2, aber sind alle
  gut, also genau so weiter machen“.
- **User rule:** „bitte nichts nachträglich anpassen, außer einfaches simples Mastering, aber nicht Dinge wie den
  Takt“. The first delivery, conformed to the bar grid TTL-style, was withdrawn and its files deleted. New
  `tools/deliver.py`: takes as performed, constant gain, short fades, natural loop points, a 40 ms seam blend.
  Layers are `synced: false` with per-layer loop points (Lead's engine already reads `layers`).
- **User:** „die daheim Musik ist nicht gut, die klingt zu sehr nach Heimatfilm“ → daheim v2. It is a new composition
  in F major at 96 BPM: light 70s jazz harmony, syncopated, the guitar leads and the accordion only answers. The prompt is
  built on the Stammtisch calm text; the CFG negative adds Heimatfilm clichés. Takes t3/t4 use that prompt, t5 a
  Rhodes + nylon-guitar variant. `heimfahrt` reprises the v2 theme.
- **User:** „enztal und stromberg klingen auch alle gut“ → enztal t1 and stromberg t1 picked by analysis.

### Hold 2 (21:45–21:55, 571 s): 9 takes
- daheim v2 t3, t4, t5; schwarzwald t1, t2; stuttgart t1, t2; raetsel t1, t2.
- The daheim take paths were sent to the user for listening. t3 is delivered provisionally.
- Loop-point tool hardened on stromberg t1, a loose performance 2.2 % fast that lost the written plan by a bar or two.
  Bar lines are now snapped to beats tracked in the take; candidate pairs within 8 bars are scored mainly on harmony.

### Hold 3 (21:56–22:06, 573 s): 10 takes
- stellplatz t1, t2; preisskat calm t1, t2 and tense t1, t2; motorradtreff t1, t2; pokal t1, t2 (heimfahrt did not fit).
- Codec seam: Vorbis renders the two identical stretches at a loop seam slightly differently. In quiet pieces
  (schwarzwald, raetsel) this left a small sample step at the jump. Fix: after encoding, both loop points slide
  together by up to 5 ms inside the blend to where the decoded audio matches. Now every seam step equals the natural
  step at loopStart.

### Hold 4 (22:07–22:08, 45 s): 2 takes
- heimfahrt t1, t2.

### Listener attempt (22:19, 8 s, failed at load)
- TTL's Qwen2-Audio listener could not load: the cached snapshot is incomplete (2 of 5 shards, no tokenizer
  vocabulary). It was not downloaded again; the step was removed from the pipeline. No GPU work was done.

### State at 22:30
- **All 12 ids delivered** (14 files, 25.8 MB): `public/audio/music/`, `public/audio/music.json`. Table, picks and
  reasons: `docs/notes-music.md`.
- Checks: Whisper medium without VAD clean on all 14 files; every loop point on a tracked beat; Chromium
  (`--disable-gpu`) decodes every file and plays every seam like the take's natural transition; the game's
  `music.play`/`setLayer` work with the files (`audio-src/music/check-browser.mjs`).
- GPU in total: 1,765 s of YuE2 in 4 holds (30 takes, 2 of them the superseded daheim v1), plus 8 s of failed loads.
- Open: the user's verdict on daheim v2 (t3 / t4 / t5); heimfahrt follows it.
