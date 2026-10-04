# Art production progress (HD painted, "Mix A+B")

Started 4 Oct 2026 after the user's look decision. ≤ 2 candidates per motif; GPU holds under the shared lock
(≤ 16 min each); `art-src/STOP` stops everything. Picks in `picks.json`, finals in `public/art/<group>/<id>.webp`
+ `public/art/index.json`, provenance in `manifest.json`, sheets in `tools/shots/art/prod/`, in-game shots in
`tools/shots/art/prod/game/`.

## State (4 Oct 2026, 23:20): production complete — 178 finals

GPU: paused 15:44–18:25 by `art-src/STOP`; otherwise back-to-back holds of ≤ 16 min (10 full holds + one of
10 min), each with a 45 s gap. The loop is stopped, ComfyUI is down, nothing of ours is on the GPU.

| # | Group | Finalised | Notes |
|---|---|---|---|
| 1 | inns (9 rooms) | **9 / 9** | clocks and papers repainted (masked `fix`), leftover pennant text softened |
| 2 | portraits (26 characters + `flohmarkt`) | **29 / 29** incl. `schultes`, `amtsbote` | one reference image each in `refs/portraits/` |
| 3 | scenes `bg/*` incl. park, kiosk | **14 / 14** | kitchen, title, the 4 pitches and homecoming: Krea's stand-in vehicles removed by a seam-free repaint (`erase2`, `tools/art/erase.py`: prefilled box + soft mask; the kitchen repaints the whole window pane) and the composed camper pasted; the first erase (`fix`) left rectangular seams and redrew a van (pitch-enztal) and was replaced. Kiosk magazines repainted as sweet jars |
| 4 | dogs: portraits | **6 / 6** | references in `refs/dogs/` |
| 4b | dogs: poses (6 × 6) | **36 / 36** | **cap exception (user approval 4 Oct 2026, „Ja du darfst die fehlenden 2 Bilder nachholen"):** `schnauzer-a-sleep` and `schnauzer-b-sleep` got a third candidate each (version `px`: strong "curled up asleep, eyes closed, whole body, side view" wording + the dog's portrait as reference), because both earlier candidates showed a sitting dog / a portrait close-up. Both third candidates worked, so the allowed fourth try (`px2`) was not used. Sheet: `tools/shots/art/prod/dog-poses.png` |
| 5 | vehicles | **5 / 5** | `van/van`, `van/bike`, `van/rig`, **`van/bike-front`** (the same bike head-on) and the composed **`van/camper`** (camper + crosswise rear carrier + the bike seen end-on; `van/van.json` "camper"). User request 4 Oct: the side-view bike over the rear wall was not a real carrier — the old "rack" anchor is marked retired |
| 6 | events (40, incl. `rathaus`) | **40 / 40** | 10 camper events rendered without vehicles (`pn`) + the composed camper (re-composited 4 Oct, 23:00) |
| 7 | items (30) + trophies (5) | **35 / 35** | `defence-bonus` re-rendered on a blue key |
| 8 | maps (4) | **4 / 4** | atlas paper: rivers, forests, vineyards, hills only |

Renders (production): 400, about 9,450 s of rendering — inns 23, portraits 58, scenes 45, dogs 86, vehicles 8,
events 100, items 62, trophies 10, maps 8 (the repaints `fix`/`settle` and the 2 approved extra sleep poses
included; 4 Oct 22:55–23:17: 2 bike-front + 8 erase repaints in three short holds). Finals: 178 images, WebP.
Before/after: `tools/shots/art/prod/before/` and `tools/shots/art/prod/after/compare-*.png`.

## Notes per group

- **inns**: text-only (`p`) won for village (the study render), besen, bikers, campsite, station, tent; the layout
  init (`pL`) for beergarden, canteen, clubhouse. `pL` failed where the code painting has a big flat area.
- **lettering**: masked repaint `<id>:fix` (pick as init, feathered mask from the rects, denoise 0.72, `FIX_TXT`),
  then `retouch` blur for what is left; both in `picks.json` and the manifest.
- **our camper**: `tools/art/compose.py` composites `van/van` + `van/bike` (rack anchor) with a contact shadow and
  a light tint; placements in render pixels in `picks.json` (`params.camper`). Krea's stand-ins are erased first
  (`erase` + `erase_prompt` → `fix`), or the scene is rendered without vehicles (`pn`).
- **portraits**: blue chroma key for the green police uniforms; `key_matte` no longer re-fills keyed pockets.
- **kiosk / items / dogs / van in game**: requests to Tour (`docs/requests/tour.md`) and Skat
  (`docs/requests/skat.md`) — the screens still draw the code atlases for these.
