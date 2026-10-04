#!/usr/bin/env python3
"""Build every sprite atlas (or the ones named on the command line) into public/sprites/.

    tools/.venv/bin/python tools/sprites/build.py            # all (npm run sprites)
    tools/.venv/bin/python tools/sprites/build.py cards ui   # some

Each atlas module exposes `build() -> Atlas`. Output is byte-for-byte reproducible.
"""
import importlib
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

ATLASES = ["cards", "ui", "icons", "drinks", "words", "chess", "items", "van", "fx", "sudoku"]


def main(argv):
    import px
    px.write_palette_record(os.path.join(HERE, "palette-hd.json"))
    names = argv or ATLASES
    t_all = time.time()
    for n in names:
        t0 = time.time()
        mod = importlib.import_module(n)
        atlas = mod.build()
        png, w, h, nf, na = atlas.save()
        print(f"{n:8s} {w}x{h}  {nf} frames  {na} anims  ({time.time() - t0:.2f}s) -> {os.path.relpath(png)}")
    print(f"total {time.time() - t_all:.1f}s")


if __name__ == "__main__":
    main(sys.argv[1:])
