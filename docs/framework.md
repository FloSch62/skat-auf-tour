# Framework — how code is written in SKAT AUF TOUR

Read `docs/contract.md` first (the design and production plan). This file explains the code base so every workstream
writes code the same way.

## Commands

```sh
npm run dev            # Vite on http://127.0.0.1:5191 (a dev server may already be running; check .work/vite.log)
npm test               # node --test over src/**/*.test.ts (pure modules only)
npm run build          # tsc --noEmit + vite build
node tools/shot.mjs "/?dev=kit" tools/shots/kit.png 1500 1920 1080 '[{"click":[100,200]}]'
npm run fonts          # rebuild bitmap fonts (tools/.venv)
npm run sprites        # rebuild code-drawn atlases (tools/.venv)
```

**This PC is also used for gaming while we work.** GPU work (Krea 2 via ComfyUI, YuE2, Stable Audio) only through
the Art/Audio pipelines under the shared GPU lock (contract §0.7) and only while the user has said the GPU is free;
`touch art-src/STOP` makes the art loop yield the GPU after the current hold. Run anything CPU-heavy (long
simulations, leagues, a million random games, puzzle generation) under `nice -n 15` and with at most 4 worker
threads/processes. Screenshots: `tools/shot.mjs` launches Chromium with `--disable-gpu`.

## Layout and drawing

- One `<canvas>`, layout in **960×540 units**, backing store 1920×1080 (`HD = 2`). All coordinates in layout units.
- `src/core/gfx.ts` (`Gfx`): `rect`, `rrect`, `box`, `line`, `circle`, `image`, `pixelScene` (640×360 art drawn 3×),
  `pixelFit`, `sprite(atlas, frame, x, y)` (returns false when the atlas or frame is missing → draw a fallback),
  `panel(x, y, w, h, variant)` (9-slice from the `ui` atlas or a code fallback; variants: `panel`, `panel-hi`,
  `panel-dark`, `paper`, `paper-dark`, `felt`, `bubble`, `tooltip`, `dialog`, `button-*`), `text(...)`, `clip`,
  `alpha`, `dim`.
- `src/core/font.ts`: bitmap fonts `huge` (titles), `big` (headings), `head` (running text, line 24), `body` (the
  smallest readable size). `label`, `small`, `caps`, `note` only for decoration. Markup: `{gold}…{/}` colours
  (palette names or aliases in `COLOR_ALIASES`), `{icon:name}` inline icon, `\n` line break. Options: `width` (wrap),
  `align`, `shadow`, `outline` (dark contour for speech and text over art), `maxLines`, `reveal`.
- `src/core/palette.ts`: the 62-colour Leitpalette as `P.<ramp><step>` (`ink`, `paper`, `wood`, `beer`, `brick`,
  `road`, `forest`, `felt`, `river`, `dusk`, `stone`, `olive`; 0 = darkest) and semantic `C`. Never write raw hex in
  screens.
- Integer positions, no smoothing, no rotated sprites (only cards in the trick).

## Scenes and UI

- `src/core/scene.ts`: a stack of `Scene { enter?, exit?, update?(dt), draw(g, app), overlay? }`.
  `app.scenes.push(s)`, `pop()`, `remove(s)`, `switchTo(s)` (fade). The top scene gets input; overlays draw the
  scene below.
- `src/core/ui.ts` is immediate mode: call widgets inside `draw`. `ui.button(id, x, y, w, h, label, opts)` returns
  true on click (variants `normal`, `go`, `danger`, `paper`, `ghost`; `sub` adds a second line; `hotkey` optional).
  `ui.area(...)` is an invisible click target. `ui.checkbox`, `ui.stepper` (instead of sliders), `ui.choice`,
  `ui.pager` (instead of scrolling), `ui.textField`.
- **Contract §0.4:** left click only. No dragging, double click, right click, wheel or required keyboard. No time
  pressure. One decision per screen. Click targets ≥ 44×32. A "Was jetzt?" sentence (`whatNow` in
  `src/screens/kit.ts`) on every screen where the player must act.
- `src/screens/kit.ts`: `whatNow`, `plate`, `heading`, `para`, `bubble` (speech), `portrait` (art or code fallback),
  `backdrop(g, artId, fallbackPainter)`, `fuelGauge`, `marksChip`, `coin`, `soundWord` (Lautwörter), `dialog`.
- Global app: `getApp()` from `src/core/app.ts`.

## Assets

- `art("portraits/maurer")` returns the image or null (loads in the background). **Every image has a code
  fallback** — nothing may ever look broken while art is missing (art needs the GPU and comes later).
- Atlases (`public/sprites/<name>.png/json`, built by `tools/sprites/`): `ui`, `icons`, `cards`, `fx`, `drinks`,
  `words`, `chess`, `sudoku`, `van`, `items`. Format as in TTL: `"scale": 2`, frames `{x,y,w,h,ax,ay}` in atlas pixels.
- Audio: `sfx.play("card-play")`, `music.play("stammtisch", "calm")`, `music.setLayer("tense")`. Missing files are
  silent.

## Pure modules and tests

- Pure modules (Skat rules, AI, map generator, tour logic, events runtime, chess, sudoku, problem generator) import
  nothing from the DOM, `core/assets`, `core/audio` or `game/world`. They use **`.ts` extensions in relative
  imports** so `node --experimental-strip-types --test` runs them. Use `import type` for types.
  They receive the place pack and profile as arguments.
- Randomness only through `src/core/rng.ts` (`new Rng(seed)`, `.next()`, `.int(a, b)`, `.pick`, `.shuffle`, `.fork`).
- Tests sit next to the module: `foo.test.ts` using `node:test` and `node:assert/strict`.
- Shared types: `src/game/types.ts` and `src/game/ids.ts` belong to the Lead. Small additive
  changes are fine; note them in the area's notes file.

## Dev scenes

Each area registers scenes in `src/<folder>/dev.ts` exporting `dev: Record<string, DevFactory>`; they are collected by
`src/dev.ts` (`import.meta.glob("./*/dev.ts")`; for nested folders add your own `dev.ts` at the top of your folder).
Open with `/?dev=<name>&seed=42&…`.

## Ownership (contract §13)

| Area | Folders |
|---|---|
| Lead | `src/main.ts`, `src/core/*`, `src/game/*`, `src/screens/kit.ts`, `src/screens/start.ts`, `src/screens/home.ts`, `src/screens/settings.ts`, `src/screens/help.ts`, `src/screens/credits.ts`, `docs/contract.md`, `docs/framework.md` |
| Skat | `src/skat/**` |
| Rätsel | `src/chess/**`, `src/sudoku/**`, `tools/chess/**`, `public/puzzles/chess-*.json` |
| Tour | `src/tour/**`, `src/data/**`, `src/screens/*` (all other screens), `tools/balance/tour-*` |
| Text | `src/content/**`, `public/packs/**` |
| Sprites | `tools/sprites/**`, `public/sprites/**` |
| Audio | `audio-src/**`, `public/audio/**` |

Write only into your own folders. Decisions you take where the contract leaves room go into
`docs/notes-<area>.md`.
