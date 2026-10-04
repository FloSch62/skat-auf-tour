"""Core toolkit for SKAT AUF TOUR code-drawn sprites (contract §10).

Everything is drawn into `Img`, an indexed canvas: each pixel holds an index into the Leitpalette (public/palette.json,
62 colours) or -1 for transparent. Only palette colours can ever be written, so palette discipline holds by
construction. A few frames (shadows, veils, glows) carry an extra alpha plane; they are listed in validate.py.

Shapes are authored as vectors (polygons, ellipses, Bézier paths, round-pen strokes) on a supersampled coverage
canvas (`V`) and thresholded at 50 % into hard-edged boolean masks: crisp comic contours at 2x density, no
anti-aliasing, no blur, byte-for-byte reproducible (Pillow's integer rasteriser + numpy only).

Palette keys follow src/core/palette.ts: ink0..ink5, paper0..4, wood0..5, beer0..4, brick0..4, road0..3, forest0..5,
felt0..4, river0..5, dusk0..4, stone0..4, olive0..3 (0 = darkest).

Cel style (contract §0.6/§9): `paint()` fills a mask with a flat colour, an inner ink contour, one shade band on the
bottom-right and one highlight band on the top-left (light from the top-left).
"""
from __future__ import annotations

import json
import math
import os

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PALETTE_PATH = os.path.join(ROOT, "public", "palette.json")

with open(PALETTE_PATH) as f:
    _PAL = json.load(f)

RAMPS: dict[str, list[str]] = {}
KEY: dict[str, int] = {}
HEX: list[str] = []
for _ramp, _cols in _PAL["ramps"].items():
    RAMPS[_ramp] = []
    for _i, _h in enumerate(_cols):
        _h = _h.lower()
        if _h not in HEX:
            HEX.append(_h)
        KEY[f"{_ramp}{_i}"] = HEX.index(_h)
        RAMPS[_ramp].append(f"{_ramp}{_i}")
MASTER_COUNT = len(HEX)

# In-between shades beyond the Leitpalette (recorded in palette-hd.json by build.py). Kept empty on purpose: the
# 62 colours carry every sprite so far. Add entries as  "name": "#rrggbb"  only when a ramp really lacks a step.
EXTRA: dict[str, str] = {}
for _k, _h in EXTRA.items():
    if _h not in HEX:
        HEX.append(_h)
    KEY[_k] = HEX.index(_h)

RGB: np.ndarray = np.array([[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in HEX], dtype=np.uint8)
NAME: dict[int, str] = {}
for _k, _v in KEY.items():
    NAME.setdefault(_v, _k)
# relative luminance (for recolouring by brightness)
LUM = (0.2126 * RGB[:, 0] + 0.7152 * RGB[:, 1] + 0.0722 * RGB[:, 2]).astype(np.float64)

T = -1  # transparent


def idx(c) -> int:
    if c is None or c == "." or c == -1:
        return T
    if isinstance(c, (int, np.integer)):
        return int(c)
    if isinstance(c, str):
        if c.startswith("#"):
            return HEX.index(c.lower())
        return KEY[c]
    raise ValueError(c)


def hexof(c) -> str:
    return HEX[idx(c)]


def write_palette_record(path: str):
    doc = {
        "note": "Colours sprites may use: the Leitpalette (public/palette.json) plus `extended` in-between shades.",
        "master": HEX[:MASTER_COUNT],
        "extended": dict(EXTRA),
    }
    text = json.dumps(doc, indent=1) + "\n"
    if not os.path.exists(path) or open(path).read() != text:
        with open(path, "w") as f:
            f.write(text)


# ═══ masks: supersampled vector drawing ═══════════════════════════════════════════════════════════════════════

SS = 4  # supersampling factor


class V:
    """Coverage canvas in target-pixel coordinates (floats allowed), supersampled SS times. `mask()` thresholds at 50 %.

    Every primitive takes `on` (True adds, False erases)."""

    def __init__(self, w: int, h: int, ss: int = SS, k: float = 1.0, ox: float = 0.0, oy: float = 0.0):
        """k/ox/oy: an optional design transform, p -> (p - o) * k + o (scales every coordinate and width about o)."""
        self.w, self.h, self.ss = int(w), int(h), ss
        self.k, self.ox, self.oy = k, ox, oy
        self.im = Image.new("L", (self.w * ss, self.h * ss), 0)
        self.d = ImageDraw.Draw(self.im)

    def _t(self, x, y):
        if self.k == 1.0:
            return x, y
        return (x - self.ox) * self.k + self.ox, (y - self.oy) * self.k + self.oy

    def _p(self, pts):
        s = self.ss
        return [(x * s, y * s) for x, y in (self._t(px_, py_) for px_, py_ in pts)]

    def poly(self, pts, on=True):
        pts = list(pts)
        if len(pts) >= 3:
            self.d.polygon(self._p(pts), fill=255 if on else 0)
        return self

    def rect(self, x, y, w, h, on=True):
        s = self.ss
        x, y = self._t(x, y)
        w, h = w * self.k, h * self.k
        if w > 0 and h > 0:
            self.d.rectangle([x * s, y * s, (x + w) * s - 1, (y + h) * s - 1], fill=255 if on else 0)
        return self

    def rrect(self, x, y, w, h, r, on=True):
        s = self.ss
        x, y = self._t(x, y)
        w, h, r = w * self.k, h * self.k, r * self.k
        if w > 0 and h > 0:
            self.d.rounded_rectangle([x * s, y * s, (x + w) * s - 1, (y + h) * s - 1], radius=max(0, r * s),
                                     fill=255 if on else 0)
        return self

    def ellipse(self, cx, cy, rx, ry=None, on=True):
        ry = rx if ry is None else ry
        s = self.ss
        cx, cy = self._t(cx, cy)
        rx, ry = rx * self.k, ry * self.k
        if rx > 0 and ry > 0:
            self.d.ellipse([(cx - rx) * s, (cy - ry) * s, (cx + rx) * s - 1, (cy + ry) * s - 1], fill=255 if on else 0)
        return self

    def circle(self, cx, cy, r, on=True):
        return self.ellipse(cx, cy, r, r, on)

    def stroke(self, pts, width, on=True, closed=False, cap=True):
        """Polyline drawn with a round pen of `width` pixels (round joins; round caps unless cap=False)."""
        pts = [self._t(x, y) for x, y in pts]
        width = width * self.k
        if closed and pts:
            pts = pts + [pts[0]]
        s = self.ss
        fill = 255 if on else 0
        wpx = max(1, int(round(width * s)))
        r = width / 2
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            # a segment as a quad (Pillow's wide lines have uneven ends)
            dx, dy = x1 - x0, y1 - y0
            ln = math.hypot(dx, dy)
            if ln < 1e-6:
                continue
            nx, ny = -dy / ln * r, dx / ln * r
            self.d.polygon([(px_ * s, py_ * s) for px_, py_ in
                            ((x0 + nx, y0 + ny), (x1 + nx, y1 + ny), (x1 - nx, y1 - ny), (x0 - nx, y0 - ny))],
                           fill=fill)
        joints = pts if cap else pts[1:-1]
        if closed:
            joints = pts
        for x, y in joints:
            if wpx > 1:
                self.d.ellipse([(x - r) * s, (y - r) * s, (x + r) * s - 1, (y + r) * s - 1], fill=fill)
        return self

    def blit_mask(self, m: np.ndarray, on=True):
        """OR (or erase) a target-resolution boolean mask into the coverage canvas."""
        big = np.kron(m.astype(np.uint8), np.ones((self.ss, self.ss), dtype=np.uint8)).astype(bool)
        a = np.asarray(self.im).copy()
        a[big] = 255 if on else 0
        self.im = Image.fromarray(a, "L")
        self.d = ImageDraw.Draw(self.im)
        return self

    def mask(self, thresh=0.5) -> np.ndarray:
        a = np.asarray(self.im, dtype=np.uint16)
        s = self.ss
        a = a.reshape(self.h, s, self.w, s).sum(axis=(1, 3))
        return a >= int(round(255 * s * s * thresh))


# ── paths ─────────────────────────────────────────────────────────────────────────────────────────────────────

def bez(p0, p1, p2, p3, n=14):
    """Cubic Bézier points (excluding p0)."""
    out = []
    for i in range(1, n + 1):
        t = i / n
        u = 1 - t
        x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0]
        y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
        out.append((x, y))
    return out


def qbez(p0, p1, p2, n=10):
    out = []
    for i in range(1, n + 1):
        t = i / n
        u = 1 - t
        out.append((u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]))
    return out


def arc(cx, cy, rx, ry, a0, a1, n=None):
    """Points on an ellipse from angle a0 to a1 (degrees; 0 = right, 90 = down), inclusive."""
    if n is None:
        n = max(6, int(abs(a1 - a0) / 8))
    return [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
             cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


class Path:
    """Tiny path builder: Path(x, y).L(x, y).C(c1, c2, p).Q(c, p).A(...).pts"""

    def __init__(self, x, y):
        self.pts = [(x, y)]

    @property
    def cur(self):
        return self.pts[-1]

    def L(self, x, y):
        self.pts.append((x, y))
        return self

    def C(self, x1, y1, x2, y2, x, y, n=14):
        self.pts += bez(self.cur, (x1, y1), (x2, y2), (x, y), n)
        return self

    def Q(self, x1, y1, x, y, n=10):
        self.pts += qbez(self.cur, (x1, y1), (x, y), n)
        return self

    def A(self, cx, cy, rx, ry, a0, a1, n=None):
        self.pts += arc(cx, cy, rx, ry, a0, a1, n)[1:]
        return self


def tf(pts, sx=1.0, sy=None, dx=0.0, dy=0.0, rot=0.0, ox=0.0, oy=0.0):
    """Transform points: scale about (ox, oy), rotate `rot` degrees about (ox, oy), then translate."""
    sy = sx if sy is None else sy
    c, s = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    out = []
    for x, y in pts:
        x, y = (x - ox) * sx, (y - oy) * sy
        x, y = x * c - y * s, x * s + y * c
        out.append((x + ox + dx, y + oy + dy))
    return out


def mirror_x(pts, cx):
    return [(2 * cx - x, y) for x, y in pts]


# ═══ morphology on boolean masks ═════════════════════════════════════════════════════════════════════════════

def shift(m: np.ndarray, dx: int, dy: int) -> np.ndarray:
    """Move mask content by (+dx, +dy); vacated pixels are False."""
    h, w = m.shape
    out = np.zeros_like(m)
    if abs(dx) >= w or abs(dy) >= h:
        return out
    ys = slice(max(0, dy), h + min(0, dy))
    xs = slice(max(0, dx), w + min(0, dx))
    ys2 = slice(max(0, -dy), h + min(0, -dy))
    xs2 = slice(max(0, -dx), w + min(0, -dx))
    out[ys, xs] = m[ys2, xs2]
    return out


def _disc_offsets(r):
    r = float(r)
    ri = int(math.ceil(r))
    return [(dx, dy) for dy in range(-ri, ri + 1) for dx in range(-ri, ri + 1) if dx * dx + dy * dy <= r * r + r * 0.5]


def dilate(m: np.ndarray, r) -> np.ndarray:
    if r <= 0:
        return m.copy()
    out = m.copy()
    for dx, dy in _disc_offsets(r):
        if dx or dy:
            out |= shift(m, dx, dy)
    return out


def erode(m: np.ndarray, r) -> np.ndarray:
    if r <= 0:
        return m.copy()
    out = m.copy()
    for dx, dy in _disc_offsets(r):
        if dx or dy:
            out &= shift(m, dx, dy)
    return out


def dilate_sq(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx or dy:
                out |= shift(m, dx, dy)
    return out


def edge_in(m, w=1):
    """Inner contour band of width w."""
    return m & ~erode(m, w)


def edge_out(m, w=1):
    """Outer contour band of width w."""
    return dilate(m, w) & ~m


def band_br(m, d):
    """Pixels of m whose neighbour d px towards the bottom-right lies outside m (a shade band)."""
    return m & ~shift(m, -d, -d)


def band_tl(m, d):
    return m & ~shift(m, d, d)


def band_dir(m, dx, dy):
    """Pixels of m whose neighbour at (+dx, +dy) lies outside m."""
    return m & ~shift(m, -dx, -dy)


def rot180(m):
    return m[::-1, ::-1].copy()


# ═══ indexed image ═══════════════════════════════════════════════════════════════════════════════════════════

class Img:
    """Indexed sprite canvas. a[y, x] = palette index or -1; optional alpha plane (uint8) for intended blends."""

    __slots__ = ("a", "alpha")

    def __init__(self, w: int, h: int, fill=None):
        self.a = np.full((int(h), int(w)), idx(fill), dtype=np.int16)
        self.alpha = None

    @classmethod
    def of(cls, arr: np.ndarray, alpha=None) -> "Img":
        o = cls.__new__(cls)
        o.a = arr.astype(np.int16).copy()
        o.alpha = None if alpha is None else alpha.astype(np.uint8).copy()
        return o

    def copy(self) -> "Img":
        return Img.of(self.a, self.alpha)

    @property
    def w(self):
        return self.a.shape[1]

    @property
    def h(self):
        return self.a.shape[0]

    def fill(self, m: np.ndarray, c, alpha: int | None = None):
        self.a[m] = idx(c)
        if alpha is not None:
            if self.alpha is None:
                self.alpha = np.full(self.a.shape, 255, dtype=np.uint8)
            self.alpha[m] = alpha
        elif self.alpha is not None:
            self.alpha[m] = 255
        return self

    def rect(self, x, y, w, h, c):
        x0, y0, x1, y1 = max(0, int(x)), max(0, int(y)), min(self.w, int(x + w)), min(self.h, int(y + h))
        if x1 > x0 and y1 > y0:
            self.a[y0:y1, x0:x1] = idx(c)
            if self.alpha is not None:
                self.alpha[y0:y1, x0:x1] = 255
        return self

    def put(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.a[y, x] = idx(c)
        return self

    def mask(self) -> np.ndarray:
        return self.a >= 0

    def is_(self, *cols) -> np.ndarray:
        return np.isin(self.a, [idx(c) for c in cols])

    def blit(self, src: "Img", x: int, y: int):
        x, y = int(x), int(y)
        sh, sw = src.a.shape
        dx0, dy0 = max(0, x), max(0, y)
        dx1, dy1 = min(self.w, x + sw), min(self.h, y + sh)
        if dx1 <= dx0 or dy1 <= dy0:
            return self
        s = src.a[dy0 - y:dy1 - y, dx0 - x:dx1 - x]
        d = self.a[dy0:dy1, dx0:dx1]
        m = s >= 0
        d[m] = s[m]
        if src.alpha is not None or self.alpha is not None:
            if self.alpha is None:
                self.alpha = np.full(self.a.shape, 255, dtype=np.uint8)
            sa = src.alpha[dy0 - y:dy1 - y, dx0 - x:dx1 - x] if src.alpha is not None else np.full(s.shape, 255, np.uint8)
            self.alpha[dy0:dy1, dx0:dx1][m] = sa[m]
        return self

    def under(self, src: "Img", x: int, y: int):
        tmp = Img(self.w, self.h)
        tmp.blit(src, x, y)
        m = (self.a < 0) & (tmp.a >= 0)
        self.a[m] = tmp.a[m]
        return self

    def flip_h(self) -> "Img":
        return Img.of(self.a[:, ::-1], None if self.alpha is None else self.alpha[:, ::-1])

    def flip_v(self) -> "Img":
        return Img.of(self.a[::-1, :], None if self.alpha is None else self.alpha[::-1, :])

    def rot180(self) -> "Img":
        return Img.of(self.a[::-1, ::-1], None if self.alpha is None else self.alpha[::-1, ::-1])

    def crop(self, x, y, w, h) -> "Img":
        out = Img(w, h)
        out.blit(self, -x, -y)
        return out

    def pad(self, l, t=None, r=None, b=None) -> "Img":
        t = l if t is None else t
        r = l if r is None else r
        b = t if b is None else b
        out = Img(self.w + l + r, self.h + t + b)
        out.blit(self, l, t)
        return out

    def bbox(self):
        ys, xs = np.nonzero(self.a >= 0)
        if len(xs) == 0:
            return None
        return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1

    def trim(self, margin=0) -> "Img":
        bb = self.bbox()
        if bb is None:
            return self.copy()
        x0, y0, x1, y1 = bb
        return self.crop(x0 - margin, y0 - margin, x1 - x0 + 2 * margin, y1 - y0 + 2 * margin)

    def recolor(self, mapping: dict) -> "Img":
        out = self.a.copy()
        for src, dst in mapping.items():
            out[self.a == idx(src)] = idx(dst)
        return Img.of(out, self.alpha)

    def to_ramp(self, ramp: list[str], lo=None, hi=None, keep=()) -> "Img":
        """Map every colour to the step of `ramp` with the nearest relative brightness (desaturate / tint).
        Brightness is rescaled from the image's own range onto ramp[lo..hi]. Colours in `keep` stay."""
        used = [int(v) for v in np.unique(self.a) if v >= 0]
        ks = {idx(k) for k in keep}
        lums = [LUM[u] for u in used if u not in ks]
        if not lums:
            return self.copy()
        mn, mx = min(lums), max(lums)
        r = ramp[(lo or 0):(None if hi is None else hi + 1)]
        out = self.a.copy()
        for u in used:
            if u in ks:
                continue
            t = 0.5 if mx - mn < 1e-6 else (LUM[u] - mn) / (mx - mn)
            out[self.a == u] = idx(r[min(len(r) - 1, int(t * len(r)))])
        return Img.of(out, self.alpha)

    def outline(self, c="ink0", w=1, diag=True) -> "Img":
        """Add an outer contour on transparent pixels around the opaque area."""
        m = self.a >= 0
        ring = (dilate(m, w) if diag else dilate_sq(m, w)) & ~m
        self.a[ring] = idx(c)
        if self.alpha is not None:
            self.alpha[ring] = 255
        return self

    def to_rgba(self) -> np.ndarray:
        out = np.zeros((self.h, self.w, 4), dtype=np.uint8)
        m = self.a >= 0
        out[m, :3] = RGB[self.a[m]]
        out[m, 3] = 255 if self.alpha is None else self.alpha[m]
        return out

    def scaled(self, k: int) -> "Img":
        return Img.of(np.kron(self.a, np.ones((k, k), dtype=np.int16)))

    def __repr__(self):
        return f"Img({self.w}x{self.h})"


# ═══ cel painting ════════════════════════════════════════════════════════════════════════════════════════════

def paint(img: Img, m: np.ndarray, fill, line="ink0", lw=2, shade=None, hi=None, sd=None, hd=None,
          shade_mask=None, hi_mask=None):
    """Cel-paint a part: inner ink contour (lw px), flat fill, one shade band (bottom-right, sd px) and one highlight
    band (top-left, hd px). Explicit shade/highlight masks override the bands. Returns the interior mask."""
    if not m.any():
        return m
    if line is not None and lw > 0:
        inner = erode(m, lw)
        img.fill(m & ~inner, line)
    else:
        inner = m
    img.fill(inner, fill)
    if shade is not None:
        sm = shade_mask if shade_mask is not None else band_br(inner, sd if sd is not None else max(2, lw + 1))
        img.fill(sm & inner, shade)
    if hi is not None:
        hm = hi_mask if hi_mask is not None else band_tl(inner, hd if hd is not None else max(1, lw - 0))
        if shade is not None and shade_mask is None:
            hm = hm & ~band_br(inner, sd if sd is not None else max(2, lw + 1))
        img.fill(hm & inner, hi)
    return inner


def line_mask(w, h, pts, width, closed=False) -> np.ndarray:
    return V(w, h).stroke(pts, width, closed=closed).mask()


def poly_mask(w, h, pts) -> np.ndarray:
    return V(w, h).poly(pts).mask()


def ellipse_mask(w, h, cx, cy, rx, ry=None) -> np.ndarray:
    return V(w, h).ellipse(cx, cy, rx, ry).mask()


def rrect_mask(w, h, x, y, rw, rh, r) -> np.ndarray:
    return V(w, h).rrect(x, y, rw, rh, r).mask()


def place(dst_shape, m: np.ndarray, x: int, y: int) -> np.ndarray:
    """Put a small mask into a bigger zero mask at (x, y)."""
    out = np.zeros(dst_shape, dtype=bool)
    H, W = dst_shape
    h, w = m.shape
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(W, x + w), min(H, y + h)
    if x1 > x0 and y1 > y0:
        out[y0:y1, x0:x1] = m[y0 - y:y1 - y, x0 - x:x1 - x]
    return out


def checker(shape, k=2, phase=0):
    yy, xx = np.indices(shape)
    return ((xx // k + yy // k + phase) % 2) == 0


def hash01(*vals) -> float:
    """Deterministic pseudo-random in [0, 1) from integers (no global RNG)."""
    h = 2166136261
    for v in vals:
        for b in int(v).to_bytes(8, "little", signed=True):
            h = ((h ^ b) * 16777619) & 0xFFFFFFFF
    h ^= h >> 13
    h = (h * 0x5BD1E995) & 0xFFFFFFFF
    h ^= h >> 15
    return (h & 0xFFFFFF) / 0x1000000
