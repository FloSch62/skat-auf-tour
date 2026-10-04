#!/usr/bin/env python3
"""erase.py: prepare a clean masked Krea repaint that removes a stand-in object (Krea's own camper/caravan) from a
picked render without seams (4 Oct 2026, after the first erase left rectangular seams and Krea redrew vehicles).

  prepare(src, box, out_init, out_mask, clip=None)

  1. prefill  the box (grown by `grow` px) is replaced by a smooth colour field continued from its surroundings
              (normalised Gaussian convolution at 1/8 resolution, widening until every pixel is covered), so Krea
              sees no vehicle shape to redraw;
  2. mask     soft: the box grown by `grow` and blurred (sigma `soft`), so the mask is ~1 over the whole box and
              falls off smoothly outside it; gen.py's keep-outside composite then blends without an edge;
              `clip` [x, y, w, h] limits the mask to a natural frame (the kitchen window glass).
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage


def prefill(rgb, hole, scale=8, region=None):
    """Smooth fill of `hole` from the known pixels around it (only those inside `region`, when given)."""
    H, W = hole.shape
    small = Image.fromarray(rgb).resize((W // scale, H // scale), Image.BOX)
    a = np.asarray(small, dtype=np.float64)
    h = np.asarray(Image.fromarray((hole * 255).astype(np.uint8)).resize((W // scale, H // scale), Image.BOX)) > 0
    known = ~h
    if region is not None:
        rs = np.asarray(Image.fromarray((region * 255).astype(np.uint8)).resize((W // scale, H // scale), Image.BOX)) > 250
        known &= rs
    known = known.astype(np.float64)
    out = a.copy()
    filled = ~h
    for sigma in (2, 4, 8, 16, 32, 64):
        w = ndimage.gaussian_filter(known, sigma)
        for c in range(3):
            v = ndimage.gaussian_filter(a[..., c] * known, sigma) / np.maximum(w, 1e-9)
            out[..., c] = np.where(~filled & (w > 0.02), v, out[..., c])
        filled |= w > 0.02
        if filled.all():
            break
    big = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
    big = big.filter(ImageFilter.GaussianBlur(scale))
    return np.where(hole[..., None], np.asarray(big), rgb)


def prepare(src, box, out_init, out_mask, clip=None, grow=40, soft=20):
    im = Image.open(src).convert("RGB")
    W, H = im.size
    x, y, w, h = box
    hole = np.zeros((H, W), bool)
    hole[max(0, y - grow // 2):y + h + grow // 2, max(0, x - grow // 2):x + w + grow // 2] = True
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).rectangle((x - grow, y - grow, x + w + grow, y + h + grow), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(soft))
    if clip:
        cx, cy, cw, ch = clip
        c = Image.new("L", (W, H), 0)
        ImageDraw.Draw(c).rectangle((cx, cy, cx + cw, cy + ch), fill=255)
        m = Image.fromarray(np.minimum(np.asarray(m), np.asarray(c)))
        hole &= np.asarray(c) > 0
    rgb = prefill(np.asarray(im), hole, region=(np.asarray(c) > 0) if clip else None)
    Image.fromarray(rgb.astype(np.uint8)).save(out_init)
    m.save(out_mask)
    return out_init, out_mask
