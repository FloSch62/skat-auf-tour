# Notes: art

Decisions of the art area where the contract leaves room (§0.6, §0.7, §0.8, §0.12, §9, §10). Owner folders:
`art-src/**`, `tools/art/**`, `tools/pixelize.py`, `public/art/**`, `src/art-dev/**`. Pipeline details:
`art-src/README.md`; production state: `art-src/PROGRESS.md`.

## Decisions of the user (4 Oct 2026)

1. **Look: Mix A+B.** Backgrounds, scenes, maps and event scenery in the `adv` head (1990s point-and-click
   adventure background: gouache, dark ink outlines, warm light); figures, dogs, vehicles, items and trophies in the
   `comic` head (European comic album: bold brush-ink line, flat colours, caricature). Prompt template locked in
   `art-src/specs.py` (production section); negatives extended by "no notices, no menus, no plaques, no framed
   writing, no posters, no signboards with writing, no titles on magazines or books".
2. **HD painted, no pixel raster** („weniger pixelig, eher so wie oben links" = the raw render). The 640×360 raster
   and the palette quantisation of the study are retired for finals. Recipe (`tools/art/hd.py`):
   - backgrounds/scenes/maps: 2560×1440 render → **1920×1080**; events 2560×1280 → **768×384** (2× density for the
     384×192-unit frame). Lanczos with box pre-reduction, a very light pull toward the Leitpalette (12 % of the way
     to the nearest palette colour incl. 2 in-between steps per ramp, at most 0.03 OKLab, offset field blurred so no
     bands appear), unsharp mask radius 1 / 35 %.
   - cut-outs at **2× density**: portraits and dog portraits 288×288 (144×144 layout units), dog poses 192×192,
     items 192×192, trophies 192×256, camper ≤ 360×200, bike ≤ 160×110, rig ≤ 220×120 (canvas trimmed). Chroma key
     by colour and hue, edge bleed + despill (no green fringe), Lanczos, anti-aliased alpha cleaned below 6 % / above
     94 %, unsharp mask 0.8 / 30 %. No colour reduction.
   - finals are **WebP** (lossy q88, alpha where needed) at `public/art/<group>/<id>.webp`, registered in
     **`public/art/index.json`** (`{"<art id>": "<file>"}`), which the asset loader reads; provenance and the
     post-process parameters per final in `art-src/manifest.json`.
3. **128 colours** was the study's answer for the raster; it no longer applies (no quantisation).

The study below stays as the record of how the look was chosen. Its raster review copies remain in
`public/art/_study/` (dev scene `/?dev=study`, button "HD (final)" shows the production finals).

## Production (4 Oct 2026; complete at 21:05 except two schnauzer `sleep` poses)

State per group, render totals and what is left: `art-src/PROGRESS.md`. In-game shots: `tools/shots/art/prod/game/`.

- **Lettering.** Krea writes numerals on clocks and pseudo-text on notices, pin boards, pennants, dartboards and
  magazine covers although `NEG_P` forbids it. Every background is zoom-checked (`tools/art/review.py zoom`). Fix in
  two steps: (1) a **masked Krea repaint** of the spots (`<id>:fix`, the pick as init, a feathered mask from the
  rects, denoise 0.72, `FIX_TXT` asks for tick-mark clocks and blank papers; `gen.py` keeps every pixel outside the
  mask exactly) — this cured the clocks and papers; (2) whatever still carries pseudo-text (pennant inscriptions,
  small labels) gets a feathered blur (`retouch` in `art-src/picks.json`). Both are recorded in the manifest. The
  automatic detector `hd.find_lettering` stays off (too many false hits on lace, cakes, glasses).
- **Our camper in scenes.** Krea does not keep the camper's identity (it draws caravans or other motorhomes), so
  scenes get our own camper composited (`tools/art/compose.py`). Since 4 Oct (user: „wie das Motorrad am Wohnmobil
  befestigt ist" was wrong) it is the **composed camper** `van/camper`: the camper pick with its painted rear ladder
  and step cut away, a crosswise rear carrier drawn in code like a real Motorradträger (steel arm at bumper height,
  the end profile of the wheel channel, an outer post, a strut to the rear wall, orange tie-down straps; one shade
  and one highlight, ink contour), and the motorcycle **seen head-on** (`van/bike-front`, rendered with the
  side-view bike as reference) standing in the channel just behind the rear wall — never over the camper's side.
  Built at 4× and reduced premultiplied (no fringe).
- **Removing Krea's stand-ins without seams** (`tools/art/erase.py`, version `erase2`): the stand-in's box is first
  prefilled with a smooth colour field continued from its surroundings (so Krea sees no vehicle to redraw), then
  repainted at denoise 0.9 under a soft mask (box grown 40 px, blurred 20 px) with a brief of the empty ground.
  The first method (`fix`, a hard rectangle at denoise 0.92 over the original) left rectangular seams and, at
  pitch-enztal, a new van behind the seam. Where a natural frame exists (the kitchen window) the whole pane is
  repainted and the frame is the edge. Every composite was zoom-checked at 1:1 for seams, leftovers and halos.
- **Layout init (`pL`)** helps where the code painting's lower half is wood or felt, and hurts where it is one flat
  colour (Krea keeps the flat area): campsite, station and bikers use the text-only render.
- **Key fix.** `key_matte` re-filled small keyed pockets (between ladder rungs) as "pinholes"; explicitly keyed pockets
  are now excluded. All cut-outs were re-finalised.
- **Dog poses** (`p` text only and `pr` with the dog's portrait as reference + `krea2_style_reference` LoRA 0.6):
  `pr` keeps coat, brindle and collar consistent and is picked for most poses; `pr` sometimes leaves stripes of the
  reference at the right edge (wolfhound-a lie/ears: `p` picked). Both schnauzers failed `sleep` (Krea draws a
  sitting dog or a bearded portrait for "curled up asleep"); a third render would need a stronger prompt ("lying on
  its side, eyes closed, head resting on the front paws, seen from the side").
- **Maps**: the atlas head with the code painting as layout init (denoise 0.78, blur 4) keeps the rivers where the
  code painting has them, so the tour's stations and roads sit on plausible ground; no roads, settlements or
  lettering appeared.
- **Green subjects** on the green key vanish (the light-green `defence-bonus` coaster): blue key (`KEY_BLUE`).
- **Portraits** keep one reference image per character in `art-src/refs/portraits/<id>.png`, dogs in
  `art-src/refs/dogs/<id>.png` (the dog poses use them with the style-reference LoRA). The two police officers are
  keyed on blue (green uniforms).

## Style study (4 Oct 2026, phase 1)

- Pipeline built (adapted from TTL): `art-src/` (gen, serve, worker, loop, q, specs, subjects, sheet, study.json,
  manifest.json), `tools/art/pixelscene.py` preset `adventure`, `tools/pixelize.py` preset `cel`,
  `tools/art/finalize.py`, `tools/art/study.py`.
- 4 motifs × 3 style heads × 2 candidates = **24 Krea renders in one GPU hold of 8 min 58 s**.
- Review copies: `public/art/_study/{a,b,c}/…png`, provenance under `_study` in `art-src/manifest.json`.

## The three variants

| | Head (`art-src/specs.py` `HEADS`) | Background | Figures |
|---|---|---|---|
| **a** `adv` | a hand-painted background of a 1990s point-and-click adventure: pencil layout, strong perspective, opaque gouache, crisp dark sepia ink outlines, warm lamplight, long shadows; figures as adventure-game cels | the closest to the brief: warm, detailed, readable at 640×360, calm table and corners | painterly source (tweed, stains) → after `cel` a bit noisy, the face loses the red nose |
| **b** `comic` | a European comic album of the 1980s: bold black brush-and-ink line, flat clear colours, hard cel shadows | clearly "comic", but ink everywhere: twice as busy as a and c (mean ΔL lower part 0.08–0.12 vs 0.03–0.05) and white walls that pull the eye; competes with cards and portraits | **the best figures**: big red nose, ruddy face, bold closed outline; survive the reduction to 96×96 best |
| **c** `film` | a 1980s hand-drawn animated feature: painterly gouache, thin coloured lines, deep warm light against cool shadows | the moodiest and calmest; cards and panels pop; a little dark and soft (less "Tusche") | flattest source, but bland after reduction: grey jacket, beige face, no nose |

Composition: `<head>L` versions add the code-painted `inns/village` as a blurred layout init (denoise 0.85). That
kept the lower half calm in b and c; in a the text-only render was better (the init produced two felt mats).
Picks with reasons: `art-src/study.json`.

**Recommendation: mix — backgrounds in head `adv` (a), figures, dogs and vehicles in head `comic` (b).** That is
also how the 1990s adventures were built: painted backdrops, clean cel figures with a black line. In game:
`/?dev=study&v=m`. If the backgrounds should be calmer still, the `film` head's darker light is the fallback (c's
background with b's figures works as well). Before the series: lock the chosen heads, then render a reference image
per character and pass it along (contract §9).

**Colour count (§10: up to 192, raster only):** 48 bands visibly on plaster and lamp light; 96, 128 and 192 look
nearly the same at 3×, speckle drops 236 → 177 → 141. The study chose 128; superseded by the HD recipe.

## What worked

- Krea 2 Turbo follows the adventure/comic/film heads distinctly; 2560×1440 at 8 steps is fast enough (≤ 50 s).
- Lettering mostly held: the blank Stammtisch sign ("plain wood with nothing written or carved on it") stayed blank
  in all 6 backgrounds, the campers have no plates, logos or badges. **One of 24 renders failed:** the text-only
  `film` background (`village-film-176478703`, not picked) painted a small nameplate and a notice with pseudo-text on
  the back wall. The three picks are clean when zoomed (bottle labels carry squiggles that become 1–2 px blobs at
  640×360; pennants carry triangle marks). For the locked recipe: add "no notices, no menus, no plaques, no framed
  writing" to `NEG`, and zoom-check every background's wall band before finalizing.
- "seen exactly from the side … driving direction to the right" gives clean side elevations of the camper with the
  motorcycle on the rear rack in all 6 renders.
- Chroma-key green backdrop: Krea paints a pale, sometimes vignetted green; keying by colour **and hue** handles it,
  also pockets between spokes. Subjects with green parts (police uniforms, Loden) need another key colour (KEY in
  `specs.py`).
- `adventure`: per-cell median keeps edges crisp; the ink rule keeps 1-px painted outlines; saturated pixels get
  30 % of the k-means sample, otherwise the orange lamp shades wash out to peach (the TTL accent rule `L > 0.80` was
  flooded by the cream wall).
- `cel`: per-material ramps instead of per-cluster snapping. Snapping each k-means colour separately scattered a
  faded blue jacket over the grey and purple ramps and turned tan fur orange; one ramp per material with ≤ 3 steps
  gives the "one shade, one highlight" look and stays inside the 62 colours.

## What did not work / open points

- Painted texture (tweed caps, stains) survives as noise in 96×96 figures even after a median pre-smooth. Briefs for
  figures should ask for plain single-colour fabrics; the comic head already gives flatter fabrics.
- The palette has no muted blue and no dedicated skin ramp: a faded blue jacket keeps grey highlight patches, pale
  skin lands on `wood`/`paper`. Ruddy skin (`brick`) suits the "rote Nasen" brief. If figures need more nuance,
  the Lead could consider a skin ramp (palette is the Lead's; not requested yet).
- The motorcycle on the camper's rack becomes a dark blob at ~25 px. For production the bike should come from its
  own render (`van/bike.png`) composited onto the rack, or the rack drawn by the sprites area.
- The 96×96 portrait is drawn 3× (144 layout units) in the study scene as §9 says; `kit.portrait()` defaults to 96
  layout units (= 2×). Request to Lead in `docs/requests/lead.md`.
- `public/art/_study/` sits in `public/` and would be copied into `dist/` by `vite build`. Request to Lead.
