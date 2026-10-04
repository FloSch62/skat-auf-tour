# SKAT AUF TOUR — code-drawn sprites

Vector shapes in Python (Pillow + numpy), rasterised 4× supersampled and thresholded into hard-edged pixels of the
Leitpalette. No image models, no GPU, no unseeded randomness; every build is byte-for-byte reproducible.
Conventions, frame names, sizes and anchors: `docs/notes-sprites.md`.

```
px.py        palette keys (ink0 … olive3), indexed Img, supersampled vector masks V, morphology, cel paint()
kit.py       Pen (64-unit design space -> pixels), Ink (cel painter + heavier outer contour)
glyphs.py    hand-lettering stroke font (indices, Lautwörter, engravings, digits)
suits.py     French and German suit symbols        figures.py   court busts (double-headed), small-card badges
motifs.py    motorcycle, camper, mug, trophy, knight, paw, wrench, …
cards.py ui.py icons.py items.py drinks.py words.py chess.py van.py fx.py sudoku.py   -> public/sprites/<name>.png/json
atlas.py     deterministic shelf packer + JSON writer ("scale": 2)
build.py / validate.py / preview.py / palette-hd.json
```

```sh
npm run sprites                                         # all atlases (~4 s)
tools/.venv/bin/python tools/sprites/build.py cards     # one
tools/.venv/bin/python tools/sprites/validate.py        # exit 1 on any error
tools/.venv/bin/python tools/sprites/preview.py [atlas] [--filter a,b] [--scale 2] [--bg felt|wood|paper|dark|mid]
tools/.venv/bin/python tools/sprites/preview.py ui --slices
tools/.venv/bin/python tools/sprites/preview.py --hand  # fanned hands, 1:1
```

Contact sheets land in `tools/shots/sprites/` (git-ignored). In the game: `/?dev=cards`, `/?dev=atlases`,
`/?dev=slices`, `/?dev=kit`.
