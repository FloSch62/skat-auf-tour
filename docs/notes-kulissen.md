# Notes — Kulissen (code-painted backdrops)

Code-painted fallbacks for every backdrop the game needs until the Krea art exists (contract §9). Everything is
drawing code in the adventure raster: 640×360 art pixels, drawn 3× by `g.pixelScene`, only Leitpalette colours,
ink contours, warm evening light, no anti-aliasing. No GPU, no image models.

## How to use

```ts
import { drawBackdrop, paintedBackdrop } from "./paint/index";   // from src/screens/*
drawBackdrop(g, "inns/village");          // full screen: public/art/inns/village.png if loaded, else the painting
drawBackdrop(g, `inns/${node.room}`);      // any room id; unknown ids of a family fall back to a sibling
const c = paintedBackdrop("maps/enztal");  // the cached 640×360 canvas (e.g. g.pixelFit(c, x, y, w, h) in a frame)
```

`drawBackdrop(g: Gfx, artId: string, offsetX = 0, offsetY = 0): boolean` returns true when the real art was drawn.
Paintings are made once per id and cached (`paintedScene`); the first paint of a scene costs 15–40 ms (cold, in
the headless software-rendered browser), repaints 5–15 ms.

Registry keys (`PAINTED` in `src/screens/paint/index.ts`):

- Inns (`inns/<room>`, the ids of `INN_ROOMS` in src/data/inns.ts): `village`, `besen`, `clubhouse`, `station`,
  `beergarden`, `campsite`, `canteen`, `tent`, plus `bikers` (the Motorradtreff round, `BIKERS_ROOM`).
- Scenes (`bg/<id>`): `kitchen` (the Lead's painting, registered for completeness), `pitch-enztal`,
  `pitch-muehlacker`, `pitch-schwarzwald`, `pitch-stuttgart`, `dogs`, `market`, `garage`, `bikers`, `homecoming`,
  `trophy`, `title`. Kiosk and chess park are painted by the Rätsel area (src/sudoku/kiosk.ts, src/chess/park.ts).
- Maps (`maps/<region>`): `enztal`, `muehlacker`, `schwarzwald`, `stuttgart`.
- Aliases: `bg/motorradtreff` → `bg/bikers`, `bg/stellplatz` → `bg/pitch-enztal`, `inns/camping` → `inns/campsite`,
  `inns/festtent` → `inns/tent`. Family fallbacks: `inns/*` → village, `bg/pitch*` → pitch-enztal,
  `maps/*` → enztal, other `bg/*` → title.

Dev gallery: `/?dev=scenes` (« Zurück / Weiter », arrow keys, `&i=n` start index), `/?dev=scene&id=inns/village`.
Options: `&mock=0` hides the table mock on inns, `&ui=0` hides the labels, `&bench=1` times six paints (cold/warm),
`&prof=1` logs time per Px method, `&places=1` marks the pack's places on maps. `?dev=scene&id=_props` and
`id=_camper` show prop test sheets.

## Decisions

- **Painter backend.** `Px` now paints into its own `Uint32Array` and writes it to the canvas once (`flush`, done
  by `paintedScene`). Same public methods and signatures as before (rect, box, bands, dither, line, ellipse, oval,
  poly, shape, speckle, tree, fir, camper); `Fill` widened to accept dithers. New: `pat`/`dith` (ordered dithers),
  `grad`/`hgrad` (palette gradients with dithered seams), `spans`, `path`, `texture` (per-pixel polygon fill),
  `within`/`clip`, `get`/`is`, and palette-aware lighting: `relight`, `light`, `shade`, `shadeRect`, `vignette`
  shift each pixel along its own palette ramp (so light pools and shadows never leave the Leitpalette).
- **The camper** (`p.camper`) got shading, curtains, ladder, vents, hubcaps and a better bike; same footprint and
  signature, plus an optional fifth argument `lit` for warm windows at dusk.
- **Inn composition** (contract §9 "Blick über den Tisch"): a real one-point perspective (`persp.ts`, eye level at
  raster row 120, f = 300 px). Our table's far edge is at row 202 (lower 44 % of the picture) and stays plain:
  wood, a dark-red damask (station), blue gingham (campsite), grey laminate (canteen), teak Resopal with a 75 cm felt
  mat (clubhouse). No white cloths: cream cards need contrast. The busy things sit in the band between the
  portraits; behind the trick (raster x 267–373, y 127–207) only calm panelling, an aisle or a path. The upper
  corners are dark (vignette, ceiling, canopy) for the portraits.
- **Light**: evening everywhere; warm lamp pools; outdoors the sun sets on the left (west).
- **No lettering anywhere**: the Stammtisch sign shows the four suits, menus and timetables are blank strokes,
  the calendar shows a picture and an empty grid.
- **People** are background silhouettes without faces (a nose pixel at most); the Meister gets a moustache.
- **Maps** (Lead decision 2026-10-04): the stage map is schematic (stations in columns), so `maps/<region>` is a
  calm atlas-paper texture only: cream paper, faint contour lines (valleys follow the main rivers), pale green
  forests, lightly hatched vineyards, soft blue rivers, a pale printed frame and the fold. **No roads, railways,
  settlements or lettering**, all low in contrast so the tour's roads, station icons and place names stay the
  strongest marks. Rivers and woods still follow the real geography around the pack's places (`x·640`, `y·360`;
  copied into `mapdata.ts`, checked against pack.json by `mapdata.test.ts`), but nothing has to line up with the
  stations. The Schwarzwald sheet is forest everywhere with organic noise openings and the valley meadows.
  Checked on `/?dev=map&seed=3&stage=1` (and stage 0, `seed=5&stage=2`) at 1920×1080 and 1366×768: the tour's
  0.55 paper veil can come down to about 0.2–0.25 (0 also works); preview with `/?dev=scene&id=maps/enztal&veil=0.25`.
