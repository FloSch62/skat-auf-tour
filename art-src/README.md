# SKAT AUF TOUR art pipeline (Krea 2 → HD painted comic)

Owner: Art workstream (contract §9, §13). Everything is reproducible: prompts, seeds and Krea settings per candidate
(`cand/**/<file>.json`), and the deterministic post-process parameters per final in `manifest.json` (contract §0.12).
Adapted from TIME TO LIVE's `art-src/` (same author); the TTL README records the findings this builds on.

## Layout

| Path | What |
|---|---|
| `specs.py` | style heads × subject briefs → job specs; `resolve("group/id:version@N")`; caps every spec at **2 candidates** and every render at **2560×1440** (contract §0.7) |
| `subjects.py` | subject briefs (what is in the picture; no real people, no brands, no lettering) |
| `gen.py` | ComfyUI client (port **8192**): Krea 2 Turbo fp8, qwen3vl text encoder (type krea2), qwen image VAE, optional reference image + `krea2_style_reference` LoRA, optional init (+ blur) and mask, 8 steps euler/simple, cfg 1 |
| `serve.sh` / `worker.py` / `loop.sh` / `q.sh` | GPU holds (below) |
| `init/` | layout inits (code-painted backdrops exported by `tools/art/study.py layout`) |
| `cand/<group>/<id>/` | every candidate PNG + JSON record (prompt, seed, settings, full ComfyUI workflow, render seconds); git-ignored |
| `study.json` | style-study picks per variant → `public/art/_study/<v>/` |
| `manifest.json` | provenance of every final (`<group>.<id>`) and of the study review copies (`_study`) |
| `sheet.py` | contact sheet for any candidates: raw │ final 1× │ final 3× |
| `picks.json` | production picks: art id → candidate file (+ note, params) |
| `PROGRESS.md` | production state per group |
| `../tools/art/hd.py` | **the HD painted post-process**: preset `scene` (backgrounds, maps, events) and `cut` (figures, dogs, vehicles, items, trophies) |
| `../tools/art/finalize.py` | candidate → `public/art/<group>/<id>.webp` + `public/art/index.json` + manifest record (`--pixel`: the study raster) |
| `../tools/art/review.py` | candidate sheets for picking (`tools/shots/art/prod/`), `final` (picks → finals), `zoom` (lettering check) |
| `../tools/art/pixelscene.py`, `../tools/pixelize.py` | the study's raster recipe (`adventure`, `cel`); `pixelize.key_matte` is also the HD key |
| `../tools/art/study.py` | style study: contact sheets, staging, colour-count sheets; `layout` exports code paintings as layout inits |

## GPU rules (contract §0.7)

- **`art-src/STOP` exists → no GPU hold.** `loop.sh` checks it before every hold, `serve.sh` again inside the lock,
  `worker.py` before every job (it then stops and leaves the rest of the queue for later).
- Every hold runs under `flock /home/clab/projects/clab/faultline/.work/locks/gpu.lock`, inside the user systemd unit
  `sat-art-generation` (MemoryHigh 14G, **MemoryMax 15G**, swap 256M). ComfyUI starts and stops inside the hold;
  `serve.sh` kills anything left on port 8192 on exit.
- `worker.py` stops starting jobs after 960 s (a hold stays under ~18 min incl. start/stop) and yields after 300 s
  when another job waits on the lock. Never run two loops.

```sh
bash art-src/q.sh NAME inns/village:adv@2 portraits/maurer:comic   # queue specs
QUIT_IDLE=20 bash art-src/loop.sh                                   # one or more holds, in the background
tools/.venv/bin/python art-src/specs.py                             # print the study jobs (no GPU)
```

Timing on the RTX 4080 SUPER (study, 4 Oct 2026): ComfyUI up in ~6 s; 2560×1440 ≈ 37–50 s (first incl. model
load), 1152×1152 ≈ 12–15 s, 1792×1008 ≈ 17–19 s. The whole study (24 renders) took one hold of 8 min 58 s.

## Production recipe (locked 4 Oct 2026: "Mix A+B", HD painted)

Prompt = head + brief (`subjects.py`) + composition line + key (cut-outs: flat chroma-key green; blue for the green
police uniforms) + `ERA` + `NEG_P`. Heads: `adv` background head for inns, scenes, maps-free scenery and event
panels (`EVENT_P` adds "people and animals as cartoon characters of a European humour comic album"); `comic` figure
head for portraits and dogs, `comic` object head for vehicles, `ITEM_P` for items and trophies; `MAP_P` (atlas
sheet in gouache, landscape only, no roads/settlements/lettering) for maps. Versions: `p` text only, `pL` the
blurred code painting as layout init (denoise 0.85; maps 0.78 with blur 4 so the rivers stay where the tour's
stations expect them), `pr` with the dog's picked portrait as reference image + `krea2_style_reference` LoRA
(strength 0.6, shift 1.5). Render sizes: backgrounds/maps 2560×1440, events 2560×1280, portraits/dogs 1152²,
dog poses 768², items 1024², trophies 960×1280, camper 1792×1008, bike 1344×928, rig 1600×848.

Post-process (`tools/art/hd.py`, via `finalize.py`): see `docs/notes-art.md` "Decisions of the user". Finals are
WebP in `public/art/<group>/<id>.webp`, listed in `public/art/index.json`.

Repairs (all recorded in `picks.json` and the manifest): `<id>:fix` masked Krea repaint of lettering spots or of a
stand-in vehicle (`review.py fixmask` builds the mask from `params.retouch` and `erase` rects); `retouch` feathered
blur of what is left; `erase2` removes a stand-in vehicle without seams (`tools/art/erase.py`: prefilled box +
soft mask; boxes and briefs in `art-src/erase.json`); `camper` pastes the composed camper (`tools/art/compose.py`
`camper_composed`: camper + crosswise rear carrier + `van/bike-front`; `finalize.finalize_camper()` writes
`public/art/van/camper.webp` and `van.json` "camper"); `clone`/`settle` were earlier repairs. Production state: `PROGRESS.md`.

## Study recipe (raster, 4 Oct 2026; superseded for finals)

Prompt = style head (`specs.HEADS[<head>]["bg" | "fig" | "obj"]`) + brief (`subjects.py`) + composition line +
`KEY` (figures: flat chroma-key green backdrop) + `ERA` + `NEG` (no lettering anywhere, no logos, not photo/3D/anime/
pixel art). Heads: `adv` (variant a: 1990s point-and-click adventure, gouache + dark ink), `comic` (b: European comic
album, bold brush ink, flat colours), `film` (c: 1980s animated feature, painterly, thin coloured lines). Background
versions `<head>L` add the code-painted backdrop as a blurred layout init (`init_blur` 10, denoise 0.85), which keeps
the calm lower half and calm top corners the table needs.

Render sizes: backgrounds 2560×1440 (4× the 640×360 grid), portraits and dogs 1152×1152 (12× of 96), camper
1792×1008. Krea follows "seen exactly from the side" and the blank-sign wording well; one of the 24 study renders
(not picked) still painted a nameplate with pseudo-text on a wall, so zoom-check the wall band of every background.

**`adventure`** (`pixelscene.py`): 4×4 OKLab median per art pixel; ink kept as 1-px lines (dark and darker than the
9-px neighbourhood, ≥ 25 % of the cell); light unsharp mask on lightness; per-scene k-means palette of 128 colours
with saturated pixels oversampled (lamp shades keep their orange), every colour pulled 35 % (max 0.04 OKLab) toward
the Leitpalette (+1 in-between step per ramp), within 0.02 snapped onto it; no dither; flat-area speckle cleanup.

**`cel`** (`pixelize.py`): key the green backdrop by colour and hue (also enclosed pockets between spokes), despill,
fit the subject (a bust anchored to the bottom edge), 8× supersample + median 9 (flattens painted texture); ink
pixels → 1-px lines; materials by hue (k-means on L·0.35, a, b), one Leitpalette ramp per material (similar hues
share it), ≤ 3 steps per material (shade, base, highlight); mode per art pixel; closed 1-px ink contour; only the 62
Leitpalette colours (9–14 per figure).

Results, picks and the recommendation: `docs/notes-art.md`. In game: `/?dev=study&v=a|b|c|m|code` (`&p=van`).
