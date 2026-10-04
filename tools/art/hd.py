#!/usr/bin/env python3
"""hd.py: Krea 2 render -> HD painted final (the "HD painted" recipe, user decision 4 Oct 2026: no pixel raster, no
palette quantisation; contract §0.6/§9 as changed by the Lead). Deterministic, numpy + Pillow + scipy.

Two presets:

  scene  backgrounds, scenes, maps, event panels. Centre-crop to the target aspect, high-quality downscale (Lanczos
         with a reducing gap, i.e. box pre-reduction + Lanczos), a very light colour harmonisation toward the warm
         Leitpalette (every pixel moves `harmonize` of the way toward its nearest palette colour incl. `steps` OKLab
         in-between steps per ramp; the offset field is blurred so no band edges appear; capped at `harmonize_max`),
         then a gentle unsharp mask. The painting stays as painted.

  cut    figures, dogs, vehicles, items, trophies on a flat chroma-key backdrop. Key the backdrop at source resolution
         (pixelize.key_matte: colour + hue, also enclosed pockets), push every backdrop pixel's colour to the nearest
         subject colour (edge bleed, so no green fringe survives the resize), desaturate key-coloured spill near the
         edge, fit the subject's bounding box into the target box (a bust touching the bottom of the render is
         anchored to the bottom edge; `trim` crops the canvas to the subject), high-quality downscale of colour and
         matte, clean the alpha (values below `alpha_lo` -> 0, above `alpha_hi` -> 1), gentle unsharp mask. No colour
         reduction.

CLI:  hd.py SRC OUT --size W H --preset scene|cut [--params JSON]
API:  hd_scene(img, size, **params) / hd_cut(img, size, **params) -> (PIL image, info dict)
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
from pixelize import CEL_DEFAULTS, build_palette, key_matte, nearest, oklab_to_srgb, srgb_to_oklab, _hue_diff  # noqa: E402

SCENE_DEFAULTS = dict(harmonize=0.12, harmonize_max=0.03, steps=2, field_sigma=2.0, sharpen=35, sharpen_radius=1.0,
                      sharpen_threshold=2, reducing_gap=2.0,
                      # de-lettering: `retouch` rects [x, y, w, h(, radius)] in render pixels (from the zoom check) get
                      # a feathered blur (default `delete_blur` render px), so papers stay papers and glyphs dissolve;
                      # `delettering` adds the hits of find_lettering() (a noisy heuristic, off by default)
                      delettering=False, delete_blur=7.0, retouch=None, keep=None)
CUT_DEFAULTS = dict(pad=2, trim=False, anchor="bottom", alpha_lo=0.06, alpha_hi=0.94, despill=6, sharpen=30,
                    sharpen_radius=0.8, sharpen_threshold=2, reducing_gap=2.0, matte_erode=1)
PRESETS = {"scene": SCENE_DEFAULTS, "cut": CUT_DEFAULTS}


def _fit_aspect(img, W, H):
    sw, sh = img.size
    if abs(sw / sh - W / H) > 1e-3:
        if sw / sh > W / H:
            nw = round(sh * W / H)
            img = img.crop(((sw - nw) // 2, 0, (sw - nw) // 2 + nw, sh))
        else:
            nh = round(sw * H / W)
            img = img.crop((0, (sh - nh) // 2, sw, (sh - nh) // 2 + nh))
    return img


def harmonize(rgb, amount, cap, steps, sigma):
    """Move colours a little toward the Leitpalette (smoothed offset field, so no posterisation)."""
    if not amount:
        return rgb, 0.0
    lab = srgb_to_oklab(rgb)
    pal = srgb_to_oklab(build_palette(ramp_steps=steps))
    idx = nearest(lab, pal)
    delta = (pal[idx] - lab) * amount
    norm = np.sqrt((delta ** 2).sum(-1, keepdims=True))
    delta = np.where(norm > cap, delta * (cap / np.maximum(norm, 1e-9)), delta)
    if sigma:
        delta = np.stack([ndimage.gaussian_filter(delta[..., c], sigma) for c in range(3)], -1)
    return oklab_to_srgb(lab + delta), float(np.sqrt((delta ** 2).sum(-1)).mean())


def find_lettering(rgb, min_strokes=5, max_box=320):
    """Rects [x, y, w, h] of text-like spots: clusters of >= min_strokes small, thin dark marks on a bright, low-chroma
    surface (notices, menus, clock faces, labels, pennant inscriptions). Krea writes pseudo-text there although the
    prompt forbids it. Heuristic, so the check sheet (review.py zoom) shows every hit."""
    lab = srgb_to_oklab(rgb)
    L = lab[..., 0]
    C = np.hypot(lab[..., 1], lab[..., 2])
    bright = ndimage.maximum_filter(L, size=9)
    paper = (bright > 0.78) & (ndimage.minimum_filter(np.where(L > 0.7, C, 1.0), size=9) < 0.07)
    stroke = paper & (L < bright - 0.30)
    lbl, n = ndimage.label(stroke, np.ones((3, 3)))
    if not n:
        return []
    sizes = np.bincount(lbl.ravel(), minlength=n + 1)
    boxes = ndimage.find_objects(lbl)
    small = np.zeros(n + 1, bool)
    for i, sl in enumerate(boxes, start=1):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        small[i] = 4 <= sizes[i] <= 220 and h <= 40 and w <= 60
    glyph = small[lbl]
    cl, cn = ndimage.label(ndimage.binary_dilation(glyph, iterations=6))
    out = []
    for k, sl in enumerate(ndimage.find_objects(cl), start=1):
        if sl is None:
            continue
        inside = np.unique(lbl[sl][glyph[sl] & (cl[sl] == k)])
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if len(inside) >= min_strokes and max(h, w) <= max_box:
            out.append([int(sl[1].start) - 4, int(sl[0].start) - 4, int(w) + 8, int(h) + 8])
    return out


def soften_rects(img, rects, radius):
    """Feathered Gaussian blur inside each rect [x, y, w, h(, radius)] (render pixel coordinates)."""
    from PIL import ImageDraw
    for r in rects or []:
        x, y, w, h = r[:4]
        rad = r[4] if len(r) > 4 else radius
        blurred = img.filter(ImageFilter.GaussianBlur(rad))
        mask = Image.new("L", img.size, 0)
        ImageDraw.Draw(mask).rectangle((x, y, x + w, y + h), fill=255)
        img = Image.composite(blurred, img, mask.filter(ImageFilter.GaussianBlur(3)))
    return img


def hd_scene(img, size, **kw):
    p = dict(SCENE_DEFAULTS, **{k: v for k, v in kw.items() if v is not None})
    W, H = size
    src = img.convert("RGB")
    rects = find_lettering(np.asarray(src)) if p["delettering"] else []
    if p["keep"]:   # rects the check sheet showed to be no lettering (e.g. lace); hits inside them are dropped
        rects = [r for r in rects if not any(k[0] <= r[0] and k[1] <= r[1] and r[0] + r[2] <= k[0] + k[2]
                                             and r[1] + r[3] <= k[1] + k[3] for k in p["keep"])]
    rects += [list(r) for r in (p["retouch"] or [])]
    src = soften_rects(src, rects, p["delete_blur"])
    src = _fit_aspect(src, W, H)
    out = src.resize((W, H), Image.LANCZOS, reducing_gap=p["reducing_gap"])
    rgb, mean_shift = harmonize(np.asarray(out), p["harmonize"], p["harmonize_max"], p["steps"], p["field_sigma"])
    out = Image.fromarray(rgb)
    if p["sharpen"]:
        out = out.filter(ImageFilter.UnsharpMask(p["sharpen_radius"], int(p["sharpen"]), int(p["sharpen_threshold"])))
    info = {"preset": "scene", "size": [W, H], "source_size": list(img.size), "params": p,
            "mean_harmonize_shift": round(mean_shift, 4), "softened": rects}
    return out, info


def hd_cut(img, size, **kw):
    p = dict(CUT_DEFAULTS, **{k: v for k, v in kw.items() if v is not None})
    W, H = size
    src = np.asarray(img.convert("RGB"), dtype=np.uint8)
    lab = srgb_to_oklab(src)
    kp = dict(CEL_DEFAULTS)
    kp.update({k: v for k, v in kw.items() if k.startswith("key_") or k == "min_island"})
    kp["key_erode"] = 0
    matte, bg = key_matte(lab, kp)
    if not matte.any():
        raise ValueError("key: no subject found")
    if p["matte_erode"]:
        matte = ndimage.binary_erosion(matte, iterations=int(p["matte_erode"]))
    # despill: key-coloured pixels near the edge lose their chroma
    cb = float(np.hypot(bg[1], bg[2]))
    if p["despill"] and cb > 0.06:
        near = matte & ~ndimage.binary_erosion(matte, iterations=int(p["despill"]))
        hb = np.degrees(np.arctan2(bg[2], bg[1]))
        h = np.degrees(np.arctan2(lab[..., 2], lab[..., 1]))
        spill = near & (_hue_diff(h, hb) < kp["key_hue"] + 15) & (np.hypot(lab[..., 1], lab[..., 2]) > 0.03)
        lab[spill, 1:] *= 0.25
    rgb = oklab_to_srgb(lab)
    # edge bleed: backdrop pixels take the colour of the nearest subject pixel (no fringe after the resize)
    _, (iy, ix) = ndimage.distance_transform_edt(~matte, return_indices=True)
    rgb = np.where(matte[..., None], rgb, rgb[iy, ix])
    ys, xs = np.nonzero(matte)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    bw, bh = x1 - x0, y1 - y0
    bust = y1 >= src.shape[0] - kp["key_ring"] - 2
    pad = int(p["pad"])
    bottom_pad = 0 if bust else pad
    s = min((W - 2 * pad) / bw, (H - pad - bottom_pad) / bh)
    tw, th = max(1, int(round(bw * s))), max(1, int(round(bh * s)))
    crop = Image.fromarray(rgb[y0:y1, x0:x1].astype(np.uint8))
    cm = Image.fromarray((matte[y0:y1, x0:x1] * 255).astype(np.uint8))
    col = crop.resize((tw, th), Image.LANCZOS, reducing_gap=p["reducing_gap"])
    a = np.asarray(cm.resize((tw, th), Image.BOX), dtype=np.float64) / 255.0
    a = np.where(a < p["alpha_lo"], 0.0, np.where(a > p["alpha_hi"], 1.0, a))
    if bust:
        a[-1] = np.where(a[-1] > 0.5, 1.0, a[-1])
    if p["sharpen"]:
        col = col.filter(ImageFilter.UnsharpMask(p["sharpen_radius"], int(p["sharpen"]), int(p["sharpen_threshold"])))
    if p["trim"]:
        CW, CH, ox, oy = tw + 2 * pad, th + pad + bottom_pad, pad, pad
    else:
        CW, CH = W, H
        ox = (W - tw) // 2
        oy = H - bottom_pad - th if (p["anchor"] == "bottom" or bust) else (H - th) // 2
    out = np.zeros((CH, CW, 4), np.uint8)
    out[oy:oy + th, ox:ox + tw, :3] = np.asarray(col)
    out[oy:oy + th, ox:ox + tw, 3] = np.round(a * 255).astype(np.uint8)
    out[out[..., 3] == 0, :3] = 0
    info = {"preset": "cut", "size": [CW, CH], "subject": [tw, th], "offset": [ox, oy], "scale": round(s, 5),
            "bust": bool(bust), "source_bbox": [int(x0), int(y0), int(bw), int(bh)],
            "key_bg": "#%02x%02x%02x" % tuple(int(v) for v in oklab_to_srgb(bg[None])[0]), "params": p}
    return Image.fromarray(out, "RGBA"), info


def save_webp(im, dest, quality=88):
    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "WEBP", quality=quality, method=6, exact=False)
    return dest


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--size", type=int, nargs=2, required=True)
    ap.add_argument("--preset", choices=sorted(PRESETS), required=True)
    ap.add_argument("--params")
    a = ap.parse_args(argv)
    params = json.loads(a.params) if a.params else {}
    with Image.open(a.src) as im:
        out, info = (hd_scene if a.preset == "scene" else hd_cut)(im, tuple(a.size), **params)
    if a.out.endswith(".webp"):
        save_webp(out, a.out)
    else:
        out.save(a.out)
    print(json.dumps({"out": a.out, "size": info["size"]}))


if __name__ == "__main__":
    main()
