#!/usr/bin/env python3
"""pixelize.py: turn a large Krea 2 render into crisp pixel art in SKAT AUF TOUR's Leitpalette (public/palette.json,
62 colours in 12 ramps, contract §10). Copied from TIME TO LIVE (same author, GPLv3) and adapted; the generic
pipeline below is unchanged, the preset `cel` (figures, dogs, vehicles, objects) is new and has its own path
(`pixelize_cel`, see its docstring).

Deterministic (no randomness except a fixed-seed k-means), numpy + Pillow + scipy. Generic pipeline:

 1. fit    - optional crop box on the source, then centre-crop to the target aspect and resize (Lanczos) to an
             integer multiple f of the target size when it is not one already.
 2. down   - per target cell (f x f source pixels): 'median' = per-channel median in OKLab of the inner cell
             (trim = fraction cut off each side), 'mode' = most frequent palette colour among the cell's pixels,
             'mean' = plain mean. Median/mode keep edges crisp instead of averaging them into mud.
 3. tone   - optional OKLab adjustments before snapping: contrast around mid grey, chroma gain, lightness gamma.
 4. snap   - nearest Leitpalette colour in OKLab. Scenes may add up to 16 extra colours (k-means over the pixels
             the palette fits worst); they are reported.
 5. prune  - colours used by fewer than min_share of the pixels are merged into their nearest surviving colour
             (bright accents are kept).
 6. clean  - orphan removal, then optional majority smoothing passes.
 7. alpha  - 'sil' (exact silhouette PNG), 'flood' (flood fill from the border through backdrop-like pixels), 'none'.
 8. outline- 'sel' (selective darker outline), 'ink' (1-px ink ring outside the sprite), or 'none'.

CLI:  pixelize.py IN OUT --size W H [--preset cel] [--params JSON] ...
API:  pixelize(pil_image, size=(w, h), **params) -> (PIL RGBA/RGB image, info dict)
      pixelize_cel(pil_image, size=(w, h), **params) -> (PIL RGBA image, info dict)
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
PALETTE_JSON = ROOT / "public" / "palette.json"

DEFAULTS = dict(
    crop=None, down="median", trim=0.125, snap=False, pre_median=0, contrast=1.0, chroma=1.0, gamma=1.0, lift=0.0,
    extra=0, extra_thresh=0.035, extra_lmin=0.2, min_share=0.0015, keep_bright_l=0.80, orphan_dl=0.22, orphan_passes=2,
    smooth_passes=0, alpha="none", sil=None, protect=None, bg=None, bg_tol=0.06, edge_band=3, min_island=6,
    outline="none", outline_dark=0.45, exclude=None, lamps=None, lamp_colors=None, lamp_lmin=0.62,
    ramp_steps=0, max_colors=0,
)


# ------------------------------------------------------------------------------------------------ colour
def srgb_to_oklab(rgb):
    """rgb uint8/float array (...,3) in 0..255 -> OKLab float (...,3)."""
    c = np.asarray(rgb, dtype=np.float64) / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    m1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                   [0.2119034982, 0.6806995451, 0.1073969566],
                   [0.0883024619, 0.2817188376, 0.6299787005]])
    lms = np.cbrt(lin @ m1.T)
    m2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468],
                   [1.9779984951, -2.4285922050, 0.4505937099],
                   [0.0259040371, 0.7827717662, -0.8086757660]])
    return lms @ m2.T


def oklab_to_srgb(lab):
    lab = np.asarray(lab, dtype=np.float64)
    m2i = np.array([[1.0, 0.3963377774, 0.2158037573],
                    [1.0, -0.1055613458, -0.0638541728],
                    [1.0, -0.0894841775, -1.2914855480]])
    lms = (lab @ m2i.T) ** 3
    m1i = np.array([[4.0767416621, -3.3077115913, 0.2309699292],
                    [-1.2684380046, 2.6097574011, -0.3413193965],
                    [-0.0041960863, -0.7034186147, 1.7076147010]])
    lin = np.clip(lms @ m1i.T, 0, 1)
    c = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * lin ** (1 / 2.4) - 0.055)
    return np.clip(np.round(c * 255), 0, 255).astype(np.uint8)


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def palette_ramps(path=PALETTE_JSON):
    """{ramp name: [hex, ...] dark to light} from public/palette.json (TTL used "groups"; ours says "ramps")."""
    data = json.loads(Path(path).read_text())
    return data.get("ramps") or data["groups"]


def load_palette(path=PALETTE_JSON):
    return np.array([hex_to_rgb(h) for ramp in palette_ramps(path).values() for h in ramp], dtype=np.uint8)


def build_palette(ramp_steps=0, exclude=None, path=PALETTE_JSON):
    """Master palette, optionally extended with `ramp_steps` OKLab in-between colours between neighbouring entries of
    each master ramp (DIRECTION v3: hi-bit shading from the master ramps). Excluded colours are dropped, and no
    in-between is made next to them."""
    excl = {hex_to_rgb(h) for h in (exclude or [])}
    out = []
    for name, ramp in palette_ramps(path).items():
        cols = [hex_to_rgb(h) for h in ramp if hex_to_rgb(h) not in excl]
        out.extend(cols)
        if ramp_steps and len(cols) > 1:
            lab = srgb_to_oklab(np.array(cols, dtype=np.uint8))
            order = np.argsort(lab[:, 0])
            for i in range(len(order) - 1):
                a, b = lab[order[i]], lab[order[i + 1]]
                for k in range(1, ramp_steps + 1):
                    t = k / (ramp_steps + 1)
                    out.append(tuple(int(v) for v in oklab_to_srgb((a * (1 - t) + b * t)[None])[0]))
    return np.unique(np.array(out, dtype=np.uint8), axis=0)


def nearest(lab, pal_lab, chunk=16384):
    """Index of the nearest palette entry for each OKLab colour (flattened)."""
    flat = lab.reshape(-1, 3)
    out = np.empty(len(flat), dtype=np.int32)
    for i in range(0, len(flat), chunk):
        d = ((flat[i:i + chunk, None, :] - pal_lab[None, :, :]) ** 2).sum(-1)
        out[i:i + chunk] = d.argmin(1)
    return out.reshape(lab.shape[:-1])


# ------------------------------------------------------------------------------------------------ steps
def fit(img, size, crop):
    if crop:
        x, y, w, h = crop
        img = img.crop((x, y, x + w, y + h))
    W, H = size
    # centre-crop to target aspect
    sw, sh = img.size
    if abs(sw / sh - W / H) > 1e-3:
        if sw / sh > W / H:
            nw = round(sh * W / H)
            x0 = (sw - nw) // 2
            img = img.crop((x0, 0, x0 + nw, sh))
        else:
            nh = round(sw * H / W)
            y0 = (sh - nh) // 2
            img = img.crop((0, y0, sw, y0 + nh))
    f = max(1, round(img.width / W))
    if img.size != (W * f, H * f):
        img = img.resize((W * f, H * f), Image.LANCZOS)
    return img, f


def grid_phase(gray, f):
    """Phase (0..f-1) of the dominant pseudo-pixel grid of period f along x and y, and its strength
    (edge-energy peak / mean). Used to align cell sampling with Krea's latent-aligned pixel-art grid."""
    out = []
    for axis in (1, 0):
        g = np.abs(np.diff(gray, axis=axis)).sum(1 - axis)
        pos = np.arange(1, len(g) + 1) % f
        prof = np.bincount(pos, weights=g, minlength=f) / np.maximum(1, np.bincount(pos, minlength=f))
        out.append((int(prof.argmax()), float(prof.max() / max(prof.mean(), 1e-9))))
    return out  # [(phase_x, strength_x), (phase_y, strength_y)]


def cells(arr, f, trim):
    """(H*f, W*f, C) -> (H, W, n, C) samples of each cell's inner region."""
    Hf, Wf, C = arr.shape
    H, W = Hf // f, Wf // f
    blk = arr.reshape(H, f, W, f, C).transpose(0, 2, 1, 3, 4)
    t = int(round(f * trim))
    if t and f - 2 * t >= 1:
        blk = blk[:, :, t:f - t, t:f - t, :]
    n = blk.shape[2] * blk.shape[3]
    return blk.reshape(H, W, n, C)


def kmeans(x, k, iters=20, seed=7):
    """Deterministic k-means in OKLab with k-means++ init (fixed seed). The running-minimum init and the chunked
    assignment give the same result as TTL's version, with bounded memory for k up to ~200."""
    rng = np.random.default_rng(seed)
    x = np.asarray(x, dtype=np.float64)
    cent = [x[rng.integers(len(x))]]
    dmin = ((x - cent[0]) ** 2).sum(-1)
    for _ in range(1, k):
        if dmin.sum() == 0:
            break
        cent.append(x[rng.choice(len(x), p=dmin / dmin.sum())])
        dmin = np.minimum(dmin, ((x - cent[-1]) ** 2).sum(-1))
    cent = np.array(cent)
    for _ in range(iters):
        lab = nearest(x[None], cent)[0]
        new = np.array([x[lab == i].mean(0) if np.any(lab == i) else cent[i] for i in range(len(cent))])
        if np.allclose(new, cent):
            break
        cent = new
    return cent


def neighbours(idx, pad_val=-1):
    """Stack of the 8 neighbours of each pixel (N, NE, E, SE, S, SW, W, NW) with padding."""
    p = np.pad(idx, 1, constant_values=pad_val)
    H, W = idx.shape
    offs = [(-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1)]
    return np.stack([p[1 + dy:1 + dy + H, 1 + dx:1 + dx + W] for dy, dx in offs], 0)


def majority(nb, valid):
    """Most frequent value among neighbour stack (8,H,W) where valid; returns (value, count)."""
    best = np.full(nb.shape[1:], -1)
    cnt = np.zeros(nb.shape[1:], dtype=np.int32)
    for i in range(8):
        v = nb[i]
        c = ((nb == v[None]) & valid).sum(0)
        c = np.where(valid[i], c, 0)
        upd = c > cnt
        best = np.where(upd, v, best)
        cnt = np.where(upd, c, cnt)
    return best, cnt


def clean_orphans(idx, pal_lab, opaque, dl, passes):
    for _ in range(passes):
        nb = neighbours(idx)
        valid = neighbours(opaque.astype(np.int32), 0).astype(bool) & (nb >= 0)
        four = nb[[0, 2, 4, 6]]
        same4 = ((four == idx[None]) & valid[[0, 2, 4, 6]]).any(0)
        maj, cnt = majority(nb, valid)
        L = pal_lab[:, 0]
        cand = opaque & ~same4 & (maj >= 0) & (cnt >= 3)
        diff = np.abs(L[idx] - L[np.maximum(maj, 0)])
        rep = cand & (diff <= dl)
        if not rep.any():
            break
        idx = np.where(rep, maj, idx)
    return idx


def smooth(idx, pal_lab, opaque, passes, dl=0.12):
    for _ in range(passes):
        nb = neighbours(idx)
        valid = neighbours(opaque.astype(np.int32), 0).astype(bool) & (nb >= 0)
        maj, cnt = majority(nb, valid)
        L = pal_lab[:, 0]
        diff = np.abs(L[idx] - L[np.maximum(maj, 0)])
        rep = opaque & (cnt >= 6) & (maj != idx) & (diff <= dl)
        idx = np.where(rep, maj, idx)
    return idx


def flood_bg(lab_cells, bg_lab, tol, seed_mask):
    """Flood from seed_mask through pixels within tol of bg_lab (4-connectivity)."""
    from scipy import ndimage
    close = np.sqrt(((lab_cells - bg_lab) ** 2).sum(-1)) <= tol
    lab, _ = ndimage.label(close)
    ids = np.unique(lab[seed_mask & close])
    ids = ids[ids > 0]
    return np.isin(lab, ids)


def drop_islands(opaque, min_size, protect=None):
    from scipy import ndimage
    lab, n = ndimage.label(opaque, structure=np.ones((3, 3)))
    if n <= 1:
        return opaque
    sizes = ndimage.sum(opaque, lab, index=np.arange(1, n + 1))
    keep = np.zeros(n + 1, dtype=bool)
    keep[1:] = sizes >= min_size
    keep[np.argmax(sizes) + 1] = True
    if protect is not None:
        keep[np.unique(lab[protect & opaque])] = True
        keep[0] = False
    return keep[lab]


# ------------------------------------------------------------------------------------------------ main API
def pixelize(img, size, palette=None, **kw):
    p = dict(DEFAULTS)
    p.update({k: v for k, v in kw.items() if v is not None or k in ("crop", "sil", "protect", "bg", "exclude", "lamps")})
    W, H = size
    img = img.convert("RGB")
    img, f = fit(img, size, p["crop"])
    if p["pre_median"]:
        from PIL import ImageFilter
        img = img.filter(ImageFilter.MedianFilter(p["pre_median"]))
    src = np.asarray(img, dtype=np.uint8)
    snap_info = None
    if p["snap"] and f >= 4:
        (px_, sx), (py_, sy) = grid_phase(src.mean(-1), f)
        snap_info = {"phase": [px_, py_], "strength": [round(sx, 2), round(sy, 2)]}
        # shift so cell boundaries sit on the detected grid lines (edge-replicate the border)
        if sx > 1.5 and px_:
            src = np.concatenate([src[:, px_:], np.repeat(src[:, -1:], px_, 1)], 1)
        if sy > 1.5 and py_:
            src = np.concatenate([src[py_:], np.repeat(src[-1:], py_, 0)], 0)
    src_lab = srgb_to_oklab(src)

    if palette is None:
        pal_rgb = build_palette(p["ramp_steps"], p["exclude"])
    else:
        pal_rgb = np.asarray(palette, dtype=np.uint8)
    pal_lab = srgb_to_oklab(pal_rgb)

    # 2. downsample
    samples = cells(src_lab, f, p["trim"] if p["down"] != "mode" else 0)
    if p["down"] == "median":
        lab = np.median(samples, axis=2)
    elif p["down"] == "mean":
        lab = samples.mean(axis=2)
    elif p["down"] == "mode":
        lab = np.median(samples, axis=2)  # used for extra-colour fitting and alpha tests
    else:
        raise ValueError(p["down"])

    # 3. tone
    def tone(x):
        x = x.copy()
        if p["gamma"] != 1.0:
            x[..., 0] = np.clip(x[..., 0], 0, 1) ** p["gamma"]
        if p["contrast"] != 1.0:
            x[..., 0] = (x[..., 0] - 0.5) * p["contrast"] + 0.5
        x[..., 0] += p["lift"]
        if p["chroma"] != 1.0:
            x[..., 1:] *= p["chroma"]
        return x
    lab = tone(lab)

    # 4. palette (+ extras)
    extras = []
    if p["extra"]:
        flat = lab.reshape(-1, 3)
        # HD frames have millions of pixels. A full pixels × palette × RGB broadcast exhausts RAM and
        # starves the GPU renderer. Query exact nearest palette colours in bounded chunks instead.
        closest = nearest(lab, pal_lab).reshape(-1)
        d = np.linalg.norm(flat - pal_lab[closest], axis=1)
        bad = flat[(d > p["extra_thresh"]) & (flat[:, 0] >= p["extra_lmin"])]
        if len(bad) >= p["extra"] * 8:
            sub = bad[:: max(1, len(bad) // 20000)]
            cent = kmeans(sub, p["extra"])
            ext_rgb = oklab_to_srgb(cent)
            ext_rgb = np.unique(ext_rgb, axis=0)
            pal_rgb = np.concatenate([pal_rgb, ext_rgb])
            pal_lab = srgb_to_oklab(pal_rgb)
            extras = ["#%02x%02x%02x" % tuple(int(v) for v in c) for c in ext_rgb]

    if p["down"] == "mode":
        sidx = nearest(tone(src_lab), pal_lab)
        cidx = cells(sidx[..., None], f, 0)[..., 0]  # (H, W, n)
        K = len(pal_lab)
        counts = np.zeros((H, W, K), dtype=np.int32)
        for j in range(cidx.shape[2]):
            np.add.at(counts, (np.arange(H)[:, None], np.arange(W)[None, :], cidx[:, :, j]), 1)
        idx = counts.argmax(-1)
    else:
        idx = nearest(lab, pal_lab)

    # 7a. alpha (decided before pruning so the backdrop does not count)
    opaque = np.ones((H, W), dtype=bool)
    protect = np.zeros((H, W), dtype=bool)
    if p["protect"]:
        x, y, w, h = p["protect"]
        protect[y:y + h, x:x + w] = True
    if p["alpha"] in ("sil", "flood"):
        if p["bg"] is not None:
            bg_lab = srgb_to_oklab(np.array(hex_to_rgb(p["bg"]) if isinstance(p["bg"], str) else p["bg"]))
        else:
            border = np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])
            bg_lab = np.median(border, axis=0)
        if p["alpha"] == "sil":
            sil = Image.open(p["sil"]).convert("L")
            if sil.size != (W, H):
                sil = sil.resize((W, H), Image.NEAREST)
            opaque = np.asarray(sil) >= 128
            if p["edge_band"]:
                from scipy import ndimage
                inner = ndimage.binary_erosion(opaque, iterations=p["edge_band"])
                band = opaque & ~inner & ~protect
                seed = ~opaque
                cand = band | seed
                bgmask = flood_bg(np.where(cand[..., None], lab, 9.0), bg_lab, p["bg_tol"], seed)
                opaque &= ~(bgmask & band)
            protect_all = protect
        else:
            seed = np.zeros((H, W), dtype=bool)
            seed[0, :] = seed[-1, :] = seed[:, 0] = seed[:, -1] = True
            bgmask = flood_bg(lab, bg_lab, p["bg_tol"], seed)
            opaque = ~bgmask | protect
            protect_all = protect
        opaque = drop_islands(opaque, p["min_island"], protect_all if protect.any() else None)
        # fill pinholes fully enclosed by the sprite
        from scipy import ndimage
        opaque = ndimage.binary_fill_holes(opaque) if p["alpha"] == "flood" else opaque

    # 5. prune rare colours
    used = np.bincount(idx[opaque], minlength=len(pal_lab))
    share = used / max(1, opaque.sum())
    keep = (share >= p["min_share"]) | ((pal_lab[:, 0] >= p["keep_bright_l"]) & (used > 0))
    if not keep.any():
        keep = used > 0
    if (~keep & (used > 0)).any():
        kept = np.where(keep)[0]
        remap = np.arange(len(pal_lab))
        for i in np.where(~keep & (used > 0))[0]:
            remap[i] = kept[((pal_lab[kept] - pal_lab[i]) ** 2).sum(-1).argmin()]
        idx = remap[idx]

    # 5b. cap the per-asset palette (most used colours win; bright accents are kept)
    if p["max_colors"]:
        used = np.bincount(idx[opaque], minlength=len(pal_lab))
        ranked = np.argsort(-used)
        keep_ids = [i for i in ranked[:p["max_colors"]] if used[i] > 0]
        keep_ids += [i for i in np.where((pal_lab[:, 0] >= p["keep_bright_l"]) & (used > 0))[0] if i not in keep_ids]
        keep_ids = np.array(keep_ids)
        if (used > 0).sum() > len(keep_ids):
            remap = np.arange(len(pal_lab))
            for i in np.where(used > 0)[0]:
                if i not in keep_ids:
                    remap[i] = keep_ids[((pal_lab[keep_ids] - pal_lab[i]) ** 2).sum(-1).argmin()]
            idx = remap[idx]

    # 6. clean
    idx = clean_orphans(idx, pal_lab, opaque, p["orphan_dl"], p["orphan_passes"])
    if p["smooth_passes"]:
        idx = smooth(idx, pal_lab, opaque, p["smooth_passes"])

    rgb = pal_rgb[idx]

    # 7b. livery lamps: lit pixels inside the lamp mask become the reserved lamp ramp (by lightness), so the game can
    # recolour exactly those colours; everything else was mapped without them (pass them in `exclude`).
    if p["lamps"] and p["lamp_colors"]:
        lm = Image.open(p["lamps"]).convert("L")
        if lm.size != (W, H):
            lm = lm.resize((W, H), Image.NEAREST)
        lmask = (np.asarray(lm) >= 128) & opaque
        ramp = np.array([hex_to_rgb(h) for h in p["lamp_colors"]], dtype=np.uint8)
        ramp_L = srgb_to_oklab(ramp)[:, 0]
        order = np.argsort(-ramp_L)                     # brightest first
        Lsrc = lab[..., 0]
        lit = lmask & (Lsrc >= p["lamp_lmin"])
        if lit.any():
            # spread the lit pixels over the ramp by lightness quantiles (brightest core -> lightest colour)
            qs = np.quantile(Lsrc[lit], [0.85, 0.6, 0.3])
            level = np.where(Lsrc >= qs[0], 0, np.where(Lsrc >= qs[1], 1, np.where(Lsrc >= qs[2], 2, 3)))
            rgb[lit] = ramp[order][np.minimum(level[lit], len(ramp) - 1)]

    # 8. outline
    if p["alpha"] != "none" and p["outline"] != "none":
        from scipy import ndimage
        if p["outline"] == "sel":
            edge = opaque & ~ndimage.binary_erosion(opaque, structure=np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]]),
                                                    border_value=0)
            base = pal_lab[idx[edge]]
            dark = base.copy()
            dark[:, 0] = base[:, 0] * p["outline_dark"]
            dark[:, 1:] *= 0.7
            core = load_palette()
            if p["exclude"]:
                excl = {hex_to_rgb(h) for h in p["exclude"]}
                core = np.array([c for c in core if tuple(int(v) for v in c) not in excl], dtype=np.uint8)
            core_lab = srgb_to_oklab(core)
            rgb[edge] = core[nearest(dark[None], core_lab)[0]]
        elif p["outline"] == "ink":
            ring = ndimage.binary_dilation(opaque, structure=np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]])) & ~opaque
            rgb[ring] = hex_to_rgb("#07080f")
            opaque = opaque | ring

    info = {"size": [W, H], "factor": f, "snap": snap_info,
            "params": {k: v for k, v in p.items() if k not in ("sil", "lamps")},
            "extra_colors": extras,
            "colors_used": int(len(np.unique(rgb[opaque].reshape(-1, 3), axis=0)))}
    if p["alpha"] == "none":
        return Image.fromarray(rgb.astype(np.uint8), "RGB"), info
    rgba = np.concatenate([rgb, (opaque * 255).astype(np.uint8)[..., None]], -1)
    rgba[~opaque] = 0
    return Image.fromarray(rgba.astype(np.uint8), "RGBA"), info


# ------------------------------------------------------------------------------------------------ preset `cel`
CEL_DEFAULTS = dict(
    # background key (the render is asked for a flat chroma-key green backdrop)
    key_ring=6, key_tol=0.10, key_hue=30.0, key_cmin=0.45, key_hole=0.0008, key_hue_holes=12, key_erode=1,
    despill=4,
    min_island=0.002,
    # placement in the target box (art pixels)
    pad=1, anchor="bottom", trim_canvas=False, super=8,
    # flatten painted texture before the reduction (median filter size at super resolution, 0 = off)
    presmooth=9,
    # ink lines found at the supersampled resolution
    ink_l=0.34, ink_dl=0.06, ink_frac=0.22, ink="#15110e",
    # flat colours: k-means materials snapped onto the Leitpalette, then the mode per art pixel
    mode="ramps", materials=8, mat_wl=0.35, tones=3, tone_min_std=0.025, hue_merge=30.0, hue_cmin=0.05, hue_cratio=1.8,
    ramp_cost={"paper": 1.25},
    colors=14, chroma=1.1, contrast=1.0, lift=0.0, snap_ab=2.0,
    orphan_dl=0.16, majority_passes=1, majority_dl=0.14, contour=True,
)

PRESETS = {
    # figures, dogs, vehicles, objects: few flat Leitpalette colours (one shade + one highlight per material),
    # closed dark contour, clean alpha from a flat-colour render background
    "cel": dict(CEL_DEFAULTS),
}


def _hue_diff(a, b):
    d = np.abs(a - b) % 360.0
    return np.minimum(d, 360.0 - d)


def key_matte(lab, p):
    """Alpha matte (True = subject) of a render on a flat background. The backdrop model is the median of a border
    ring; a pixel is backdrop-like when it is within key_tol of that colour or (for a saturated chroma-key backdrop)
    shares its hue with enough chroma, which also catches darker spill and soft contact shadows. Backdrop-like
    regions connected to the border are removed; enclosed ones (gaps between legs, under the van) too when they are
    larger than key_hole of the picture and really close to the backdrop colour."""
    H, W = lab.shape[:2]
    r = p["key_ring"]
    ring = np.zeros((H, W), bool)
    ring[:r] = ring[-r:] = True
    ring[:, :r] = ring[:, -r:] = True
    bg = np.median(lab[ring], axis=0)
    dist = np.sqrt(((lab - bg) ** 2).sum(-1))
    like = dist < p["key_tol"]
    cb = float(np.hypot(bg[1], bg[2]))
    hue_like = np.zeros_like(like)
    if cb > 0.06:
        hb = np.degrees(np.arctan2(bg[2], bg[1]))
        C = np.hypot(lab[..., 1], lab[..., 2])
        h = np.degrees(np.arctan2(lab[..., 2], lab[..., 1]))
        hue_like = (C > p["key_cmin"] * cb) & (_hue_diff(h, hb) < p["key_hue"])
        like |= hue_like
    lbl, n = ndimage.label(like)
    border_ids = np.unique(np.concatenate([lbl[0], lbl[-1], lbl[:, 0], lbl[:, -1]]))
    back = np.isin(lbl, border_ids[border_ids > 0])
    if n and p["key_hole"]:
        sizes = np.bincount(lbl.ravel(), minlength=n + 1)
        med = ndimage.median(dist, lbl, np.arange(n + 1))
        hole = (sizes >= p["key_hole"] * H * W) & (np.asarray(med) < p["key_tol"] * 0.6)
        if p.get("key_hue_holes") and cb > 0.06:
            # small enclosed pockets of the chroma-key hue (between spokes, behind a rack) are backdrop too; this
            # assumes the subject itself has no colour of the key's hue (pick another key colour if it has)
            hshare = ndimage.mean(hue_like.astype(np.float64), lbl, np.arange(n + 1))
            hole |= (sizes >= p["key_hue_holes"]) & (np.asarray(hshare) >= 0.8)
        hole[0] = False
        back |= hole[lbl]
    keyed = back.copy()                                  # never re-filled below as a "pinhole"
    matte = ~back
    # keep the subject: drop small islands (specks, stray marks) and fill pinholes
    lbl, n = ndimage.label(matte, np.ones((3, 3)))
    if n > 1:
        sizes = np.bincount(lbl.ravel(), minlength=n + 1)
        keep = sizes >= p["min_island"] * H * W
        keep[0] = False
        keep[int(sizes[1:].argmax()) + 1] = True
        matte = keep[lbl]
    holes = ndimage.binary_fill_holes(matte) & ~matte
    hl, hn = ndimage.label(holes)
    if hn:
        hs = np.bincount(hl.ravel(), minlength=hn + 1)
        matte |= (hs[hl] <= 0.0002 * H * W) & holes & ~keyed
    if p["key_erode"]:
        matte = ndimage.binary_erosion(matte, iterations=int(p["key_erode"]))
    return matte, bg



def _ramp_tones(lab_s, body, sample, mlab, w, p):
    """Cel colours per material: k-means `materials` clusters on (L * mat_wl, a, b) (materials differ by hue first),
    each material takes the Leitpalette ramp that fits its pixels best (hue-weighted OKLab), and its pixels are
    quantised to at most `tones` steps of that ramp (shade, base, highlight) by a 1-D k-means on lightness.
    Returns (palette index of every pixel, -1 outside the body; per-material summary)."""
    ramps = palette_ramps()
    ramp_ids, start = [], 0
    for name, cols in ramps.items():
        ramp_ids.append((name, np.arange(start, start + len(cols))))
        start += len(cols)
    fw = np.array([p["mat_wl"], 1.0, 1.0])
    cent = kmeans(sample * fw, int(p["materials"]), iters=30, seed=11)
    mat = nearest((lab_s * fw)[None], cent)[0] if lab_s.ndim == 2 else nearest(lab_s * fw, cent)
    out = np.full(lab_s.shape[:-1], -1, dtype=np.int64)
    summary = []
    # materials of one hue (a blue jacket's shadow, base and pale highlight) share one ramp: group them first
    ca = cent / fw
    C = np.hypot(ca[:, 1], ca[:, 2])
    hue = np.degrees(np.arctan2(ca[:, 2], ca[:, 1]))
    group = list(range(len(cent)))
    for i in range(len(cent)):
        for k in range(i):
            if (C[i] > p["hue_cmin"] and C[k] > p["hue_cmin"] and _hue_diff(hue[i], hue[k]) < p["hue_merge"]
                    and max(C[i], C[k]) <= p["hue_cratio"] * min(C[i], C[k])):
                gi, gk = group[i], group[k]
                group = [gk if g == gi else g for g in group]
    bias = p.get("ramp_cost") or {}
    ramp_of = {}
    for g in sorted(set(group)):
        members = [j for j in range(len(cent)) if group[j] == g]
        sel = body & np.isin(mat, members)
        if not sel.any():
            continue
        Ps = lab_s[sel][:: max(1, int(sel.sum()) // 4000)]
        best, best_cost = None, 1e9
        for name, ids in ramp_ids:
            d = (((Ps[:, None, :] - mlab[ids][None]) * w) ** 2).sum(-1).min(1)
            cost = float(np.sqrt(d).mean()) * bias.get(name, 1.0)
            if cost < best_cost:
                best, best_cost = (name, ids), cost
        for j in members:
            ramp_of[j] = best
    for j in range(len(cent)):
        sel = body & (mat == j)
        if not sel.any() or j not in ramp_of:
            continue
        P = lab_s[sel]
        Ps = P[:: max(1, len(P) // 4000)]
        best = ramp_of[j]
        name, ids = best
        Lr = mlab[ids][:, 0]
        # tone levels: 1-D k-means on L (fewer levels for flat materials), each level -> nearest ramp step by L
        n_t = int(p["tones"]) if Ps[:, 0].std() >= p["tone_min_std"] else 1
        n_t = max(1, min(n_t, len(ids)))
        q = np.quantile(Ps[:, 0], np.linspace(0, 1, n_t + 2)[1:-1])
        for _ in range(20):
            lv = np.abs(Ps[:, 0][:, None] - q[None]).argmin(1)
            q2 = np.array([Ps[lv == i, 0].mean() if np.any(lv == i) else q[i] for i in range(n_t)])
            if np.allclose(q2, q):
                break
            q = q2
        steps = np.abs(q[:, None] - Lr[None]).argmin(1)
        lv = np.abs(P[:, 0][:, None] - q[None]).argmin(1)
        out[sel] = ids[steps[lv]]
        summary.append({"ramp": name, "steps": sorted({int(x) for x in steps}), "share": round(float(sel.sum() / body.sum()), 3)})
    return out, summary


def pixelize_cel(img, size, **kw):
    """Preset `cel`: a flat-coloured cartoon cel from a render on a flat chroma-key backdrop.

      1. key      matte at source resolution (key_matte), green spill near the edge desaturated (despill px)
      2. place    the subject's bounding box is scaled to fit `size` minus `pad` (a bust that touches the bottom of
                  the render is anchored to the bottom edge without pad); trim_canvas=True crops the canvas to the
                  subject (vehicles, objects)
      3. down     the placed subject is resampled to `super` x the art grid (and median-filtered, `presmooth`, so
                  painted texture flattens); an art pixel is opaque when >= half of its source pixels are subject and
                  becomes ink when >= ink_frac of them are ink (dark, L < ink_l, and ink_dl darker than their
                  neighbourhood), so thin painted outlines survive the reduction as 1-px lines
      4. colours  k-means (colors) in OKLab over the non-ink pixels (after a chroma lift), every centroid snapped to
                  the nearest of the 62 Leitpalette colours with hue weighted `snap_ab` x lightness (so a faded blue
                  stays blue instead of turning grey); each source pixel takes its cluster's palette colour and the
                  art pixel the most frequent of them (mode), which gives flat cel areas. A cel render brings base,
                  shade and highlight per material; they land on neighbouring colours of one ramp
      5. clean    orphan removal and majority passes inside the flat areas (ink untouched)
      6. contour  every opaque pixel touching transparency (4-neighbourhood) becomes ink: a closed 1-px contour
    """
    p = dict(CEL_DEFAULTS)
    p.update({k: v for k, v in kw.items() if v is not None})
    W, H = size
    src = np.asarray(img.convert("RGB"), dtype=np.uint8)
    lab0 = srgb_to_oklab(src)
    matte, bg = key_matte(lab0, p)
    if not matte.any():
        raise ValueError("key: no subject found")
    if p["despill"]:
        near = matte & ~ndimage.binary_erosion(matte, iterations=int(p["despill"]))
        cb = float(np.hypot(bg[1], bg[2]))
        if cb > 0.06:
            hb = np.degrees(np.arctan2(bg[2], bg[1]))
            h = np.degrees(np.arctan2(lab0[..., 2], lab0[..., 1]))
            spill = near & (_hue_diff(h, hb) < p["key_hue"] + 15) & (np.hypot(lab0[..., 1], lab0[..., 2]) > 0.03)
            lab0[spill, 1:] *= 0.25
    ys, xs = np.nonzero(matte)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    bw, bh = x1 - x0, y1 - y0
    bust = y1 >= src.shape[0] - p["key_ring"] - 2          # the render cuts the subject at the bottom (a bust)
    pad = int(p["pad"])
    bottom_pad = 0 if bust else pad
    s = min((W - 2 * pad) / bw, (H - pad - bottom_pad) / bh)
    tw, th = max(1, int(round(bw * s))), max(1, int(round(bh * s)))
    F = int(p["super"])
    crop_rgb = Image.fromarray(oklab_to_srgb(lab0[y0:y1, x0:x1]))
    crop_m = Image.fromarray((matte[y0:y1, x0:x1] * 255).astype(np.uint8))
    small_rgb = crop_rgb.resize((tw * F, th * F), Image.LANCZOS)
    if p["presmooth"]:
        from PIL import ImageFilter
        small_rgb = small_rgb.filter(ImageFilter.MedianFilter(int(p["presmooth"])))
    big = np.asarray(small_rgb, dtype=np.uint8)
    bigm = np.asarray(crop_m.resize((tw * F, th * F), Image.BOX), dtype=np.float64) / 255.0
    lab = srgb_to_oklab(np.asarray(crop_rgb.resize((tw * F, th * F), Image.LANCZOS), dtype=np.uint8))
    m = bigm >= 0.5
    # ink at the supersampled resolution (on the unsmoothed picture, so thin lines count)
    L = lab[..., 0]
    loc = ndimage.uniform_filter(np.where(m, L, 1.0), size=2 * F + 1, mode="nearest")
    ink_px = m & (L < p["ink_l"]) & (L < loc - p["ink_dl"])
    cm = cells(bigm[..., None], F, 0)[..., 0]               # (th, tw, F*F)
    opaque = cm.mean(-1) >= 0.5
    ci = cells(ink_px[..., None].astype(np.float64), F, 0)[..., 0]
    ink_cell = opaque & (ci.mean(-1) >= p["ink_frac"])
    # colours: tone the smoothed picture, k-means materials, snap each onto the Leitpalette (hue weighted)
    lab_s = srgb_to_oklab(big)
    lab_s[..., 0] = (lab_s[..., 0] - 0.5) * p["contrast"] + 0.5 + p["lift"]
    lab_s[..., 1:] *= p["chroma"]
    body = m & ~ink_px
    sample = lab_s[body]
    step = max(1, len(sample) // 40000)
    sample = sample[::step]
    master = load_palette()
    mlab = srgb_to_oklab(master)
    w = np.array([1.0, p["snap_ab"] ** 0.5, p["snap_ab"] ** 0.5])
    if p["mode"] == "ramps":
        pix_g, mat_info = _ramp_tones(lab_s, body, sample, mlab, w, p)
        used_ids = np.unique(pix_g[body])
        remap = np.full(len(master), -1)
        remap[used_ids] = np.arange(len(used_ids))
        pal_rgb = master[used_ids]
        pal_lab = mlab[used_ids]
        pix = np.where(body, remap[np.maximum(pix_g, 0)], 0)
        # ink pixels inside the subject take the colour of the nearest body pixel for the mode (ink is stamped later)
        if (m & ~body).any():
            _, (iy, ix) = ndimage.distance_transform_edt(~body, return_indices=True)
            pix = np.where(m & ~body, pix[iy, ix], pix)
    else:
        k = max(2, min(int(p["colors"]), len(sample) // 16))
        cent = kmeans(sample, k, iters=30, seed=7)
        snap = nearest((cent * w)[None], mlab * w)[0]           # cluster -> Leitpalette index
        used_ids = np.unique(snap)
        pal_rgb = master[used_ids]
        pal_lab = mlab[used_ids]
        remap = {int(g): i for i, g in enumerate(used_ids)}
        lbl = nearest(lab_s, cent)                               # pixel -> cluster
        pix = np.vectorize(lambda c: remap[int(snap[c])])(np.arange(len(cent)))[lbl]
        mat_info = None
    K = len(used_ids)
    pix = np.where(m, pix, K)                                # K = transparent, ignored by the mode
    cp = cells(pix[..., None], F, 0)[..., 0]                 # (th, tw, F*F)
    counts = (cp[..., None] == np.arange(K)[None, None, None]).sum(2)
    idx = counts.argmax(-1)
    flat = opaque & ~ink_cell
    # clean the flat areas (ink is not part of the palette pass)
    region = flat
    idx = clean_orphans(idx, pal_lab, region, p["orphan_dl"], 2)
    for _ in range(int(p["majority_passes"])):
        nb = neighbours(np.where(region, idx, -1))
        valid = (nb >= 0)
        maj, cnt = majority(nb, valid)
        Lp = pal_lab[:, 0]
        rep = region & (cnt >= 6) & (maj != idx) & (maj >= 0) & (np.abs(Lp[idx] - Lp[np.maximum(maj, 0)]) <= p["majority_dl"])
        idx = np.where(rep, maj, idx)
    rgb = pal_rgb[idx].astype(np.uint8)
    ink_rgb = np.array(hex_to_rgb(p["ink"]), dtype=np.uint8)
    rgb[ink_cell] = ink_rgb
    if p["contour"]:
        edge = opaque & ~ndimage.binary_erosion(opaque, structure=np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]]),
                                                border_value=0)
        if bust:                                          # the cut at the bottom of a bust gets no contour
            edge[-1] &= ~opaque[-1] | np.roll(~opaque[-1], 1) | np.roll(~opaque[-1], -1)
        rgb[edge] = ink_rgb
    # place on the canvas
    if p["trim_canvas"]:
        CW, CH = tw + 2 * pad, th + pad + bottom_pad
        ox, oy = pad, pad
    else:
        CW, CH = W, H
        ox = (W - tw) // 2
        oy = H - bottom_pad - th if (p["anchor"] == "bottom" or bust) else (H - th) // 2
    out = np.zeros((CH, CW, 4), np.uint8)
    out[oy:oy + th, ox:ox + tw, :3] = rgb
    out[oy:oy + th, ox:ox + tw, 3] = opaque * 255
    out[out[..., 3] == 0] = 0
    used = np.unique(out[out[..., 3] > 0][:, :3], axis=0)
    info = {"preset": "cel", "size": [CW, CH], "subject": [tw, th], "factor": F, "bust": bool(bust),
            "materials": mat_info,
            "key_bg": "#%02x%02x%02x" % tuple(int(v) for v in oklab_to_srgb(bg[None])[0]),
            "params": {k: v for k, v in p.items()},
            "palette": ["#%02x%02x%02x" % tuple(int(v) for v in c) for c in used],
            "colors_used": int(len(used)), "ink_pixels": int(ink_cell.sum())}
    return Image.fromarray(out, "RGBA"), info


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--size", type=int, nargs=2, required=True)
    ap.add_argument("--preset", choices=sorted(PRESETS), help="cel = flat cartoon cel with alpha (own pipeline)")
    ap.add_argument("--params", help="JSON object of parameters (overridden by explicit flags)")
    for k, v in DEFAULTS.items():
        if k in ("crop", "protect"):
            ap.add_argument("--" + k.replace("_", "-"), type=int, nargs=4)
        elif k == "exclude":
            ap.add_argument("--exclude", nargs="+")
        elif isinstance(v, bool):
            ap.add_argument("--" + k.replace("_", "-"), type=lambda s: s.lower() in ("1", "true", "yes"))
        elif isinstance(v, int) and not isinstance(v, bool):
            ap.add_argument("--" + k.replace("_", "-"), type=int)
        elif isinstance(v, float):
            ap.add_argument("--" + k.replace("_", "-"), type=float)
        else:
            ap.add_argument("--" + k.replace("_", "-"))
    ap.add_argument("--info", help="write the info JSON here")
    a = ap.parse_args(argv)
    params = json.loads(a.params) if a.params else {}
    for k in DEFAULTS:
        v = getattr(a, k)
        if v is not None:
            params[k] = v
    with Image.open(a.src) as im:
        if a.preset == "cel":
            out, info = pixelize_cel(im, tuple(a.size), **dict(PRESETS["cel"], **params))
        else:
            out, info = pixelize(im, tuple(a.size), **params)
    out.save(a.out, optimize=True)
    if a.info:
        Path(a.info).write_text(json.dumps(info, indent=1) + "\n")
    print(json.dumps({"out": a.out, "colors": info["colors_used"], "extra": info["extra_colors"]}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
