# Sprites — notes and conventions (contract §0.6, §9, §10)

Code-drawn atlases for SKAT AUF TOUR. No image models, no GPU: everything is vector shapes in Python
(Pillow + numpy) rasterised 4× supersampled and thresholded into hard-edged, palette-only pixels. Every build is
byte-for-byte reproducible (`npm run sprites`, ~4 s for all ten atlases).

```sh
npm run sprites                                            # tools/.venv/bin/python tools/sprites/build.py
tools/.venv/bin/python tools/sprites/build.py cards ui     # some atlases
tools/.venv/bin/python tools/sprites/validate.py           # palette, alpha, sizes, required frames (exit 1 on error)
tools/.venv/bin/python tools/sprites/preview.py            # contact sheets -> tools/shots/sprites/<atlas>.png
tools/.venv/bin/python tools/sprites/preview.py ui --slices
tools/.venv/bin/python tools/sprites/preview.py --hand     # fanned hands of all three decks at 1:1
```

**In the game** (add `&atlasui=1` while the theme's code panels are still active): `/?dev=cards[&deck=french|german|tournament][&view=hand|all|small]`,
`/?dev=atlases[&atlas=icons][&bg=felt|wood|paper|dark]` (every frame at 1:1, anims playing), `/?dev=slices`
(every ui 9-slice at three sizes), and the core gallery `/?dev=kit` (panels, buttons and cursor use the `ui` atlas).

**Contact sheets** (git-ignored): `tools/shots/sprites/` — `cards-p1.png`, `cards-p2.png`, `cards-hand.png`,
`ui.png`, `ui-slices.png`, `icons.png`, `items.png`, `drinks.png`, `words.png`, `chess.png`, `van.png`, `fx.png`,
`sudoku.png`; game screenshots `dev-cards-hand.png`, `dev-cards-1366.png`, `dev-cards-all-german.png`,
`dev-atlases-icons.png`, `dev-atlases-items.png`, `dev-slices.png`; enamel ui in the game:
`tools/shots/sprites/ui/<screen>-1366|1920.png` (home, settings, newtour, map, table, market, kit, slices), made by
`node tools/sprites/ui-shots.mjs [filter]`.

## Format

As in TTL: `public/sprites/<name>.png` + `.json` with `"scale": 2`; frames `{x, y, w, h, ax, ay}` (+ extra keys) in
**atlas pixels** (1 atlas px = ½ layout unit = 1 physical px at 1080p); `anims` `{frames, fps, loop}`; `slices`
`{x, y, w, h, l, t, r, b}`; `groups` (packing bands). Pixel-identical frames share one rectangle (e.g. tournament
hearts/clubs = french hearts/clubs). Frame names are lower-case kebab, except chess (`w-K` …, the German letters).

## Style

- Swabian comic in the look of the 90s adventures: clean dark ink contour (inner part lines 1–2 px, outer silhouette
  1 px heavier), flat cel colour, one shade band (bottom-right), one highlight band (top-left), warm light.
- Lettering: one hand-lettering stroke font (`glyphs.py`, round pen) for card indices, Lautwörter, coin and beer-mat
  engravings, sudoku digits. Legibility first: card indices are 40 px (20 units) tall and bold.
- Palette: only the 62 colours of `public/palette.json`; no in-between shades were needed
  (`tools/sprites/palette-hd.json` records the palette, `extended` is empty).
- Semi-transparent pixels only on purpose (listed in `validate.py` `ALPHA_OK`): `cards` `shadow*`, `hl-playable*`,
  `veil-locked*`; `chess` `mark-target`, `mark-capture`, `mark-last`, `mark-check`; `fx` `card-glow*`. Everything
  else is opaque or fully transparent, so fades use `globalAlpha`.

## Atlases, names, sizes (layout units), anchors

### `cards` (priority 1)
- `<deck>-<suit>-<rank>` 72×108 (144×216 px) and `<deck>-<suit>-<rank>-s` 36×54 (72×108 px); decks `french german
  tournament`, suits `diamonds hearts spades clubs`, ranks `7 8 9 10 jack queen king ace`. Anchor top-left (0, 0).
- Index: rank over suit, top-left and rotated bottom-right. French/tournament letters **B D K A**, German **U O K A**;
  digits 10 9 8 7. The whole index column sits in x < 24 units (small: < 17), so it is readable in a fanned hand
  that shows 30 units of each card. JSON extras: `cardSize`, `indexStrip` (px).
- Colours: French Kreuz/Pik black, Herz/Karo red; tournament Kreuz black, Pik green, Herz red, Karo yellow-orange
  (index in dark ochre with a brown contour so it reads on cream); German indices in ink, suit symbols in colour
  (Eichel brown/ochre, Grün leaf green, Herz red, Schellen gold bell with red band).
- Pips 7–10 sit in a framed centre field between the big indices (jumbo-index layout), lower half rotated 180°.
  Ace/Daus: one big symbol in an engraved oval. Courts: double-headed busts in a 180°-symmetric frame (two offset
  panels with a seam). French: Bube (beret with feather, halberd), Dame (crown, long hair, rose), König (crown, beard,
  sword or sceptre); robes per suit. German: Unter (beret, symbol held low), Ober (plumed broad hat, moustache, symbol
  high), König (arched crown). These are the code fallback for the painted court art (§9).
- Small cards: index + suit in both corners; courts add a headwear badge (crown, tiara, beret, plumed hat) in the free
  corners.
- Backs `back-1` (red lattice, the four suits), `back-2` (blue rosettes, a wheel), `back-3` (green stripes, a Brezel),
  each with `-s`.
- Overlays (both sizes, `-s` for small), drawn at the same x, y as the card (their anchor is the card's top-left):
  `shadow` (card silhouette, ink 40 %; draw it about 2–3 units down-right of the card, under it), `hl-playable`
  (soft beer-gold glow rim, margin 4 units, small 2), `hl-selected` (strong gold outline with ink edge, same margins), `veil-locked`
  (ink veil 47 % over the card).
- **Trick rotation:** cards are delivered upright; turn them at draw time (`ctx.translate/rotate`, as `?dev=cards`
  does). Seven pre-drawn steps × 96 cards would add megabytes; see `docs/requests/lead.md`.

### `ui`
- **Enamel look (Emaille, the default theme since the user's review).** 9-slices named exactly like `FALLBACK` in
  `src/core/gfx.ts`, insets 6 units (12 px) on every side, all decoration inside the insets so tiling is seamless:
  - `panel`: deep blue enamel sign — fill `river0`, cream enamel border band (`paper2`, light outer rim top-left,
    soft shade bottom-right), dark step edge, a `river1` glaze catching the light top/left, thin inner line `river2`,
    two tiny enamel chips (top-right, bottom-left corner). `panel-hi`: `river1` fill, gold band (`beer3`), line `river3`.
    `dialog`: `river0`, cream band `paper3`, gold inner line `beer2`, one chip. `panel-dark`: darker plate with a blue
    band (`river2`), ink step, no line (name plates).
  - Buttons: `button-normal` cream enamel (`paper3`, bevelled rim, glossy top, soft bottom shade), `button-hover`
    brighter cream with a gold rim (`beer2`), `button-pressed` darker and inset (inverted bevel, inner shadow),
    `button-disabled` grey stone, **`button-active`** (the theme's selected choice) warm gold enamel (`beer2`),
    `button-go`/`-hover` green enamel, `button-danger`/`-hover` red enamel.
  - Kept as before: `paper`, `paper-dark`, `bubble` (fill `paper4`, 2-unit ink contour), `tooltip`, `felt` (wood
    rail), `button-paper`, `button-paper-hover`.
  - The former wood versions stay in the atlas as `wood-panel`, `wood-panel-hi`, `wood-panel-dark`, `wood-dialog`,
    `wood-button-*`, `wood-tab`, `wood-tab-hover`, `wood-tab-active` (for the „Holz“ theme, if it is kept).
  - A soft gloss over the whole height cannot live in a tiled 9-slice; the code's 12 % gloss band can stay on top of
    the atlas panels (see `docs/requests/lead.md`).
- Tabs `tab` (cream enamel, a bit darker than buttons), `tab-hover` (gold rim), `tab-active` (blue sign like the panel it
  opens into), `tab-paper`, `tab-paper-active` (9-slice, insets 12/12/12/4 px, open at the bottom: let them overlap
  the panel below by 2 units).
- Liste: `liste` (9-slice, paper pad with red binding and red margin rule; insets l 24, t 22, r 12, b 12 px),
  `liste-rule` (4×1 units, tile horizontally under a row), `liste-col` (1×4, tile vertically).
- `fuel-seg-on`, `fuel-seg-off` 16×26 (tank segments as in `kit.fuelGauge`), `checkbox-tick` 20×20; anchor top-left.
- Cursors (anchor = hotspot): `cursor-arrow` 18×26 (tip), `cursor-pointer` 20×26 (pointing hand, fingertip),
  `cursor-wait` 18×24 (hourglass; anim `cursor-wait` over `cursor-wait-0..3`), `cursor-blocked` 20×20 (centre).

### `icons` (anchor centre)
- `station-<kind>-<state>` 32×32 for every `STATION_KINDS` kind (start flag, inn beer mug, bikers motorcycle, problem
  cards with „?“, chess knight, sudoku newspaper grid, pitch camper with moon, dogs paw, market stall, garage wrench,
  event warning sign „!“, tournament trophy), states `normal`, `reachable` (bright face, beer-gold rim), `visited`
  (greyed + red stamp tick), `locked` (faded). `station-<kind>-sm` 16×16 (normal).
- `suit-<deck>-<suit>` 24×24, `suit-<deck>-<suit>-sm` 16×16.
- 32×32 + `-sm` 16×16: `game-grand` (crown), `game-null` (card with 0), `game-ramsch` (broom), `fuel` (canister),
  `settings`, `help`, `book` (Tourenbuch), `home`, `trophy`, `check`, `cross`, `lock`, `arrow-left`, `arrow-right`,
  `speaker`, `music`, `dog`, `beer-mat`, `souvenir`, `upgrade`, `detour` (motorcycle with dashed arrow).
- `mark` 26×26 (coin engraved „DM“, no emblem; `kit.coin` draws it centred), `mark-sm` 16×16.
- Inline text: write `{icon:fuel-sm}` — `font.ts` resolves the plain name first, which is the 32-unit icon.

### `items` (48×48 layout units = 96 px, anchor centre)
Frame name = id. `SOUVENIRS` (incl. `oil-can` Ölkännchen and `magnifier` Lupe), `BEER_MATS` (round, scalloped or
square coasters with a symbol: crown, 0, open hand, scissors, shield, re-deal arrows, +1, V, ×2), `UPGRADES`
(`aux-tank`, `roof-box`, `dog-bed`, `awning`, `fridge`, `radio`, `sidecar`), `DOGS` (shepherd tan with black saddle and
upright ears; wolfhound-a grey and wolfhound-b wheaten with brindle, rose ears, beards; airedale tan with black saddle,
folded ears, beard; schnauzer-a black; schnauzer-b pepper-and-salt; each its own collar colour), and
`trophy-enztal`, `trophy-muehlacker`, `trophy-schwarzwald`, `trophy-stuttgart`, `trophy-wander` (lidded Wanderpokal).

### `drinks` (scenery only; anchor bottom centre, `ay` = table line)
`<drink>-3|2|1|0` (full … empty): `beer` (Halbe in a Willi-Becher, 15×31), `weizen` (15×36), `wine` (Viertele in
the dimpled Henkelglas, 17×22), `cider` (glass Mostkrug, 20×30), `schnapps` (10×14), `spezi` (bottle, no brand, 11×37),
`water` (Sprudel, 14×23). Emptied beer glasses keep foam lacing.

### `words` (anchor centre)
`klatsch rumms roeoeoehr zisch gluck tacker prost krach wuff klirr zack plopp brumm hui schepper`, each
`<id>-0|1|2` ≈ 60, 110, 180 units wide (short words are capped in height). Two-tone fill (yellow/orange/red), inner
rim, thick ink contour, drop shadow, per-letter wobble. `kit.soundWord` finds them by `<id>-<size>`.

### `chess` (anchor centre)
`w-K w-D w-T w-L w-S w-B`, `b-…` 52×52 (104 px): Staunton silhouettes, white cream, black dark wood with a light inner
rim. Marks for 56-unit squares (112 px): `mark-target` (dot), `mark-capture` (ring), `mark-selected` (gold frame),
`mark-last` (gold tint), `mark-check` (red glow).

### `van` (side view facing right; anchor bottom centre on the ground)
- `marker-camper`, `marker-bike`, `marker-rig` 40×24.
- Anims: `wheel` (`wheel-0..3`, 24×24, 12 fps), `wheel-sm` (`wheel-sm-0..3`, 9×9), `puff` (`puff-0..4`, 20×20,
  anchor at the pipe end, once).
- `camper` 180×100 with extra keys in frame px from its top-left: `wheels` [[x, y, r]…], `exhaust`, `dogWindow`,
  `namePlate` [x, y, w, h] (blank area on the rear for the profile's van name), `roofBox`, `awning`, `auxTank`,
  `radio`, `fridge`. `bike` ≈ 80×55 (`exhaust`), `rig` ≈ 110×58 (the sidecar sits behind the bike).
- Overlays `aux-tank`, `roof-box`, `awning`, `radio`, `fridge`, `dog-bed` (a dog looking out of the cab window) carry
  `anchoredTo: "camper"`: draw them at the camper's x, y after the camper. `sidecar` (`anchoredTo: "bike"`,
  `drawBefore: true`): draw it at the bike's x, y **before** the bike.

### `fx`
`stamp`, `stamp-red` 60×60 (worn rubber place stamp; free middle band for the place name; anchor centre); `coin`
(`coin-0..5`, 16×16, loop); `sparkle` (`sparkle-0..5`, 32×32, once — won trick); `rain` (`rain-0..2`, tiles 32×48,
anchor top-left) and `rain-drop`; `leaf` and `leaf-green` (`-0..7`, 12×12, loop); `smoke` (`smoke-0..5`, 32×32,
once); `card-glow`, `card-glow-s` (soft glow around a card; anchor = card's top-left).

### `sudoku` (anchor top-left)
`newsprint` 9-slice (insets 12 px); cells 24×24: `cell`, `cell-given`, `cell-selected`, `cell-peer`, `cell-wrong`;
digits `digit-1..9` (printed ink), `pencil-1..9` (player, blue graphite with a wobble), `note-1..9` (12×12).

## Files

`tools/sprites/`: `px.py` (palette, indexed `Img`, supersampled vector masks `V`, morphology, cel `paint`),
`kit.py` (`Pen` design-space transform, `Ink` painter), `glyphs.py` (stroke font), `suits.py`, `figures.py` (court
busts), `motifs.py` (motorcycle, camper, mug, trophy, knight, paw, …), one module per atlas (`cards`, `ui`, `icons`,
`items`, `drinks`, `words`, `chess`, `van`, `fx`, `sudoku`), `atlas.py` (packer/writer), `build.py`, `validate.py`,
`preview.py`, `palette-hd.json`. Dev scenes: `src/sprites-dev/dev.ts`.

## Decisions

- Hard edges, no anti-aliasing: at 1080p every atlas pixel is one screen pixel; at 1366×768 the browser's smooth
  downscale (`screen.ts`) softens edges. Checked both (`dev-cards-hand.png`, `dev-cards-1366.png`).
- Jumbo indices + framed pip field instead of classic pip placement, so the rank reads in the fanned hand.
- German indices in ink for maximum contrast; the coloured symbol under the index carries the suit.
- The court figures, dogs, vehicles and items are fallbacks for painted art (§9); their frame names and sizes are
  stable so painted versions can replace them one by one.
