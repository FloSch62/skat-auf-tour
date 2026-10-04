"""SKAT AUF TOUR art specs: style heads x subject briefs for every Krea 2 candidate.

Job spec strings (queue files, q.sh):  group/id[:version][@N | @seed,seed,...]
e.g.  inns/village:adv@1   portraits/maurer:comic@2   dogs/shepherd:film@1234,5678
Seeds default to a stable hash of (key, version, k). At most MAX_CANDIDATES per spec (contract §0.7: <= 2 per motif).

Style study (contract §9 "Vor der Serie steht eine Stilstudie"): three style heads, each with a background head and
a matching figure head:
  adv    a = 1990s point-and-click adventure: painted animation background, gouache + dark ink outlines;
           figures as adventure-game cels (closed ink line, one shade, one highlight)
  comic  b = European comic album of the 1980s: bold black brush-and-ink line, flat clear colours, hard cel shadows
  film   c = hand-drawn animated feature film of the 1980s: painterly gouache, thin coloured line work, soft light
Backgrounds get two candidates per head: '<head>' (text only) and '<head>L' (the same prompt with the code-painted
inns/village as a blurred layout init, so the calm lower half and the calm top corners hold).
"""
import hashlib
import re
from pathlib import Path

import subjects as S

ART = Path(__file__).resolve().parent
ROOT = ART.parent
INIT = ART / "init"
MAX_CANDIDATES = 2
MAX_W, MAX_H = 2560, 1440

# ------------------------------------------------------------------------------------------------ shared language
ERA = "Swabia in southern Germany, early 1980s."
NEG = ("Absolutely no text anywhere: no letters, no words, no numbers, no writing on signs, labels, posters, bottles "
       "or plates, no logos, no brand names, no badges, no emblems, no watermark, no signature, no frame, no border, "
       "no speech bubbles, no user interface. Not a photograph, not a 3D render, not anime, not pixel art, no film "
       "grain, no noise.")
KEY = ("Isolated on a flat, uniform, plain bright green background like a chroma-key screen, evenly lit, no shadow "
       "on the ground, no floor, no scenery, nothing else in the picture.")

# ------------------------------------------------------------------------------------------------ style heads
HEADS = {
    "adv": {
        "bg": ("A hand-painted background for a classic 1990s 2D point-and-click adventure game, made like a "
               "traditional animation background: a confident pencil layout with strong perspective, opaque gouache "
               "colours laid in clean shapes with soft painted shading, crisp dark sepia ink outlines around every "
               "object, warm golden lamplight with long soft shadows, rich small details to discover. A gently "
               "caricatured cartoon world that stays believable: slightly bulging, slightly crooked shapes, cosy."),
        "fig": ("A character cel from a classic 1990s 2D point-and-click adventure game, traditional hand-drawn "
                "animation: a clean, closed dark ink outline of even weight, flat opaque colours with exactly one "
                "shadow tone and one small highlight per material, no texture, no gradients. Caricatured but "
                "believable proportions, an expressive face."),
        "obj": ("A vehicle cel from a classic 1990s 2D point-and-click adventure game, traditional hand-drawn "
                "animation: a clean, closed dark ink outline of even weight, flat opaque colours with exactly one "
                "shadow tone and one small highlight per material, no texture, no gradients, slightly caricatured "
                "rounded shapes that stay believable."),
    },
    "comic": {
        "bg": ("A background panel from a European comic album of the 1980s, drawn with a bold black brush-and-ink "
               "line and coloured with flat, clear colours and simple hard-edged cel shadows: strong perspective, "
               "solid ink outlines of lively weight, very few gradients, warm evening light, many funny little "
               "details, a caricatured but believable world."),
        "fig": ("A character drawn for a European humour comic album of the 1980s: a bold black brush-and-ink "
                "outline with lively line weight, flat clear colours with one simple hard shadow tone and a small "
                "white highlight, no gradients, no texture. Caricatured but believable: a big round nose, big "
                "hands, a warm expression."),
        "obj": ("A vehicle drawn for a European humour comic album of the 1980s: a bold black brush-and-ink outline "
                "with lively line weight, flat clear colours with one simple hard shadow tone and a small white "
                "highlight, no gradients, no texture, slightly caricatured rounded shapes that stay believable."),
    },
    "film": {
        "bg": ("A painted background from a classic hand-drawn animated feature film of the 1980s: rich painterly "
               "gouache with visible brush strokes, soft edges and thin coloured line work instead of black "
               "outlines, deep warm lamplight glowing against cool shadows, atmospheric depth, a detailed, cosy and "
               "slightly exaggerated place."),
        "fig": ("A character cel from a classic hand-drawn animated feature film of the 1980s: a clean thin dark "
                "brown outline, flat opaque paint with one soft shadow tone and one highlight, appealing and "
                "expressive, caricatured but believable proportions."),
        "obj": ("A vehicle cel from a classic hand-drawn animated feature film of the 1980s: a clean thin dark brown "
                "outline, flat opaque paint with one soft shadow tone and one highlight, slightly caricatured "
                "rounded shapes that stay believable."),
    },
}
STUDY_VARIANT = {"a": "adv", "b": "comic", "c": "film"}

# the code-painted inns/village (src/screens/paint/inn-village.ts, 640x360) as a layout guide, blurred so Krea paints
# freely over it; `tools/.venv/bin/python tools/art/study.py layout` writes it (Vite dev server must be running)
LAYOUT_INIT = {"init": str(INIT / "inns-village-layout.png"), "init_blur": 10, "denoise": 0.85}


def seed_for(key, version, k):
    return int(hashlib.sha1(f"{key}:{version}:{k}".encode()).hexdigest()[:8], 16) % 2_000_000_000


ASSETS = {}


def add(key, size, gen, versions, n=2, preset=None):
    assert gen[0] <= MAX_W and gen[1] <= MAX_H, (key, gen)
    ASSETS[key] = {"size": size, "gen": gen, "versions": versions, "n": n, "preset": preset}


# ------------------------------------------------------------------------------------------------ the study
for _iid, _brief in S.INNS.items():
    _v = {}
    for _h, _head in HEADS.items():
        _p = f"{_head['bg']} {_brief} {S.INN_LAYOUT} {ERA} {NEG}"
        _v[_h] = {"prompt": _p, "n": 1}
        _v[_h + "L"] = {"prompt": _p, "n": 1, **LAYOUT_INIT}
    add(f"inns/{_iid}", (640, 360), (2560, 1440), _v, preset="adventure")

for _pid, _brief in S.PORTRAITS.items():
    add(f"portraits/{_pid}", (96, 96), (1152, 1152), {
        _h: {"prompt": f"{_head['fig']} {_brief} {S.PORTRAIT_LAYOUT} {KEY} {ERA} {NEG}"} for _h, _head in HEADS.items()
    }, preset="cel")

for _did, _brief in S.DOGS.items():
    add(f"dogs/{_did}", (96, 96), (1152, 1152), {
        _h: {"prompt": f"{_head['fig'].replace('A character', 'An animal character')} {_brief} {S.DOG_LAYOUT} {KEY} "
                       f"{NEG}"} for _h, _head in HEADS.items()
    }, preset="cel")

for _vid, _brief in S.VANS.items():
    add(f"van/{_vid}", (180, 100), (1792, 1008), {
        _h: {"prompt": f"{_head['obj']} {_brief} {S.VEHICLE_LAYOUT} {KEY} {ERA} {NEG}"} for _h, _head in HEADS.items()
    }, preset="cel")


# ------------------------------------------------------------------------------------------------ production
# LOCKED 4 Oct 2026: the user chose "Mix A+B" — backgrounds in the `adv` head, figures/dogs/vehicles/items in the
# `comic` head, 128 colours per background. Version "p" = text only, "pL" = the same prompt over the blurred code
# painting as layout init (backgrounds), "pr" = with the subject's reference image + krea2_style_reference LoRA
# (dog poses). <= 2 candidates per motif in every case.
NEG_P = NEG + (" No notices, no menus, no plaques, no framed writing, no posters, no signboards with writing, no "
               "titles on magazines or books.")
BG_P = HEADS["adv"]["bg"]
FIG_P = HEADS["comic"]["fig"]
OBJ_P = HEADS["comic"]["obj"]
ITEM_P = ("A single object drawn for a European humour comic album of the 1980s: a bold black brush-and-ink outline "
          "with lively line weight, flat clear colours with one simple hard shadow tone and a small white highlight, "
          "no gradients, no texture, slightly caricatured rounded shapes that stay believable.")
EVENT_P = (BG_P + " The people and animals in it are drawn as cartoon characters of a European humour comic album: "
           "bold black ink outlines, flat colours, caricatured but believable faces. A wide comic panel.")
EVENT_CALM = "The lower quarter of the picture is calm, simple ground."
MAP_P = ("A hand-painted landscape map in the style of a 1970s road atlas sheet, painted in soft gouache on cream "
         "paper and seen straight from above: pale green forest areas with tiny stippled trees, light blue rivers "
         "with thin darker banks, fine brown hatching for vineyard slopes, soft brown hill shading and faint contour "
         "lines. Absolutely no roads, no railways, no towns, no villages, no buildings, no lettering, no names, no "
         "numbers, no symbols, no legend, no grid, no border.")
KEY_BLUE = KEY.replace("plain bright green background like a chroma-key screen", "plain bright blue background like a "
                       "blue chroma-key screen")
REFS_DIR = ART / "refs"


def layout(group, aid, denoise=0.85, blur=10):
    return {"init": str(INIT / f"{group}-{aid}-layout.png"), "init_blur": blur, "denoise": denoise}


def _bg_versions(group, aid, prompt):
    return {"p": {"prompt": prompt, "n": 1}, "pL": {"prompt": prompt, "n": 1, **layout(group, aid)}}


for _rid, _brief in S.INN_ROOMS.items():
    _p = f"{BG_P} {_brief} {S.INN_LAYOUT} {ERA} {NEG_P}"
    if _rid == "village":
        ASSETS["inns/village"]["versions"].update(_bg_versions("inns", "village", _p))
    else:
        add(f"inns/{_rid}", (640, 360), (2560, 1440), _bg_versions("inns", _rid, _p), preset="adventure")

for _sid, _brief in S.SCENES.items():
    _extra = S.SCENE_LAYOUT["pitch"] if _sid.startswith("pitch") else ""
    _p = f"{BG_P} {_brief} {_extra} {ERA} {NEG_P}".replace("  ", " ")
    add(f"bg/{_sid}", (640, 360), (2560, 1440), _bg_versions("bg", _sid, _p), preset="adventure")

for _pid, _brief in S.PORTRAITS_ALL.items():
    _key = KEY_BLUE if _pid in S.BLUE_KEY else KEY
    _p = f"{FIG_P} {_brief} {S.PORTRAIT_LAYOUT} {_key} {ERA} {NEG_P}"
    if _pid in ("maurer",):
        ASSETS["portraits/maurer"]["versions"]["p"] = {"prompt": _p}
    else:
        add(f"portraits/{_pid}", (96, 96), (1152, 1152), {"p": {"prompt": _p}}, preset="cel")

_DOG_HEAD = FIG_P.replace("A character", "An animal character")
for _did, _look in S.DOG_LOOK.items():
    _p = f"{_DOG_HEAD} {S.DOG_PORTRAIT.format(look=_look)} {KEY} {NEG_P}"
    if _did == "shepherd":
        ASSETS["dogs/shepherd"]["versions"]["p"] = {"prompt": _p}
    else:
        add(f"dogs/{_did}", (96, 96), (1152, 1152), {"p": {"prompt": _p}}, preset="cel")
    for _pose, _txt in S.DOG_POSES.items():
        _pp = f"{_DOG_HEAD} {_txt.format(look=_look)} {S.DOG_LAYOUT if _pose != 'window' else ''} {KEY} {NEG_P}"
        _pp = _pp.replace("  ", " ")
        _ref = REFS_DIR / "dogs" / f"{_did}.png"
        add(f"dogs/{_did}-{_pose}", (64, 64), (768, 768), {
            "p": {"prompt": _pp, "n": 1},
            "pr": {"prompt": f"The same dog as in the reference image, same breed, coat colours and collar: "
                             f"{_pp}", "n": 1, "refs": [{"path": str(_ref)}], "strength": 0.6, "shift": 1.5},
        }, preset="cel")

for _vid, _brief in S.VEHICLES.items():
    _size, _gen = {"van": ((180, 100), (1792, 1008)), "bike": ((80, 55), (1344, 928)),
                   "rig": ((110, 58), (1600, 848))}[_vid]
    _p = f"{OBJ_P} {_brief} {S.VEHICLE_LAYOUT} {KEY} {ERA} {NEG_P}"
    if _vid == "van":
        ASSETS["van/van"]["versions"]["p"] = {"prompt": _p}
    else:
        add(f"van/{_vid}", _size, _gen, {"p": {"prompt": _p}}, preset="cel")

for _iid, _brief in S.ITEMS.items():
    _view = ("Seen from straight above, flat on the ground." if _iid in S.ITEM_TOP else
             "Seen from the front in a slight three-quarter view from above.")
    _p = (f"{ITEM_P} {_brief[0].upper() + _brief[1:]}. {_view} The object is centred and fills most of the picture "
          f"with a margin around it. {KEY} {NEG_P}")
    add(f"items/{_iid}", (64, 64), (1024, 1024), {"p": {"prompt": _p}}, preset="cel")

for _tid, _brief in S.TROPHIES.items():
    _p = (f"{ITEM_P} {_brief[0].upper() + _brief[1:]}, without any engraving or writing. Seen from the front, "
          f"standing upright, centred, filling most of the picture with a margin around it. {KEY} {NEG_P}")
    add(f"trophies/{_tid}", (96, 128), (960, 1280), {"p": {"prompt": _p}}, preset="cel")

for _eid, _brief in S.EVENTS.items():
    _p = f"{EVENT_P} {_brief} {EVENT_CALM} {ERA} {NEG_P}"
    add(f"events/{_eid}", (256, 128), (2560, 1280), {"p": {"prompt": _p}}, preset="adventure")

for _mid, _brief in S.MAPS.items():
    _p = f"{MAP_P} The landscape: {_brief}."
    add(f"maps/{_mid}", (640, 360), (2560, 1440), {"pL": {"prompt": _p, **layout("maps", _mid, 0.78, 4)}},
        preset="adventure")


# masked repaint of the lettering spots of a picked inn room (review.py fixmask writes the mask): the pick is the
# init, only the masked spots are repainted (gen.py keeps every pixel outside the mask exactly)
FIX_TXT = ("Every clock face shows only plain tick marks and no numerals. Every paper, notice, menu, pin board, pennant "
           "and dartboard is blank or shows simple shapes only, without any letters, numbers or writing.")


def _fix_versions():
    import json
    picks = json.loads((ART / "picks.json").read_text()) if (ART / "picks.json").exists() else {}
    for key, item in picks.items():
        group, aid = key.split("/")
        mask = INIT / f"{group}-{aid}-fixmask.png"
        if group not in ("inns", "bg", "events") or not mask.exists() or key not in ASSETS:
            continue
        if item.get("erase_prompt"):     # erase a stand-in (vehicle, magazines): the repaint describes only the spot
            prompt, denoise = f"{BG_P} {item['erase_prompt']} {ERA} {NEG_P}", 0.92
        elif group != "inns":            # the pick moved on (e.g. to a later repaint): nothing to fix any more
            continue
        else:
            prompt, denoise = f"{BG_P} {S.INN_ROOMS[aid]} {FIX_TXT} {S.INN_LAYOUT} {ERA} {NEG_P}", 0.72
        ASSETS[key]["versions"]["fix"] = {
            "prompt": prompt, "n": 1, "init": str(ART / "cand" / group / aid / item["cand"]), "mask": str(mask),
            "denoise": denoise}


_fix_versions()


# "settle": our camper composited into a pick (init), then only the ground right under it repainted (mask), so no
# trace of Krea's stand-in shows through the gap under the chassis
if (INIT / "bg-pitch-schwarzwald-settle-init.png").exists():
    ASSETS["bg/pitch-schwarzwald"]["versions"]["settle"] = {
        "prompt": f"{BG_P} Gravel ground with a few tufts of grass in the evening shadow under a parked camper, a dark "
                  f"shadow on the gravel. {ERA} {NEG_P}", "n": 1,
        "init": str(INIT / "bg-pitch-schwarzwald-settle-init.png"),
        "mask": str(INIT / "bg-pitch-schwarzwald-settle-mask.png"), "denoise": 0.85}


NOV = " No vehicles except those named: no caravans, no campers, no motorhomes, no trailers, no motorcycles."
for _eid, _brief in S.EVENTS_NOVAN.items():
    ASSETS[f"events/{_eid}"]["versions"]["pn"] = {"prompt": f"{EVENT_P} {_brief} {EVENT_CALM} {ERA} {NEG_P}{NOV}"}


# green objects on the green key vanish: blue key for them
for _iid in ("defence-bonus",):
    ASSETS[f"items/{_iid}"]["versions"]["pb"] = {
        "prompt": ASSETS[f"items/{_iid}"]["versions"]["p"]["prompt"].replace(KEY, KEY_BLUE)}


# EXCEPTION to the 2-candidate cap, approved by the user on 4 Oct 2026 ("Ja du darfst die fehlenden 2 Bilder
# nachholen"): one more candidate for each schnauzer sleep pose (both earlier candidates failed), and at most one
# further try per pose if that fails too. Strong pose wording + the dog's portrait as reference.
SLEEP_STRONG = ("{look}, lying curled up fast asleep on the ground, eyes firmly closed, the head resting flat on its "
                "front paws, the body curled round with the tail tucked against the nose, the whole body visible, seen "
                "from the side. Not sitting, not standing, not a portrait, no open eyes.")
SLEEP_EXCEPTION = ("schnauzer-a", "schnauzer-b")
for _did in SLEEP_EXCEPTION:
    _pp = f"{_DOG_HEAD} {SLEEP_STRONG.format(look=S.DOG_LOOK[_did])} {S.DOG_LAYOUT} {KEY} {NEG_P}"
    ASSETS[f"dogs/{_did}-sleep"]["versions"]["px"] = {
        "prompt": f"The same dog as in the reference image, same breed, coat colours and collar: {_pp}", "n": 1,
        "refs": [{"path": str(REFS_DIR / "dogs" / f"{_did}.png")}], "strength": 0.6, "shift": 1.5,
        "cap_exception": "user approval 4 Oct 2026: third candidate for this pose"}
    ASSETS[f"dogs/{_did}-sleep"]["versions"]["px2"] = dict(ASSETS[f"dogs/{_did}-sleep"]["versions"]["px"],
        cap_exception="user approval 4 Oct 2026: fourth and last candidate for this pose (only if px failed)")


# van/bike-front: the van/bike pick seen head-on, for the crosswise rear carrier (Lead/user request 4 Oct 2026)
_bf = f"{OBJ_P} {S.BIKE_FRONT} {S.VEHICLE_LAYOUT} {KEY} {ERA} {NEG_P}"
add("van/bike-front", (110, 140), (896, 1152), {
    "p": {"prompt": _bf, "n": 1},
    "pr": {"prompt": f"The same motorcycle as in the reference image, same colours and parts: {_bf}", "n": 1,
           "refs": [{"path": str(ART / "cand" / "van" / "bike" / "bike-p-1552449094.png")}], "strength": 0.6,
           "shift": 1.5},
}, preset="cel")


# erase2 (4 Oct 2026): remove Krea's stand-in vehicles from the scene picks without seams — the stand-in box is
# prefilled with a smooth colour field and repainted under a soft mask (tools/art/erase.py, boxes in erase.json);
# our composed camper is pasted afterwards (tools/art/compose.py)
def _erase2():
    import json
    f = ART / "erase.json"
    if not f.exists():
        return
    for sid, e in json.loads(f.read_text()).items():
        ASSETS[f"bg/{sid}"]["versions"]["erase2"] = {
            "prompt": f"{BG_P} {e['prompt']} {ERA} {NEG_P}{NOV}", "n": 1,
            "init": str(INIT / f"bg-{sid}-erase-init.png"), "mask": str(INIT / f"bg-{sid}-erase-mask.png"),
            "denoise": 0.9, "source_pick": e["source"], "erase_box": e["box"]}


_erase2()


def production_specs(group=None):
    """Specs of the production series in priority order (contract §9 table, coordinator's order 4 Oct)."""
    order = {
        "inns": [f"inns/{r}:{v}" for r in S.INN_ROOMS for v in ("p", "pL")],
        "portraits": [f"portraits/{c}:p" for c in S.PORTRAITS_ALL] + [f"dogs/{d}:p" for d in S.DOG_LOOK],
        "scenes": [f"bg/{b}:{v}" for b in S.SCENES for v in ("p", "pL")],
        "objects": [f"van/{v}:p" for v in S.VEHICLES] + [f"items/{i}:p" for i in S.ITEMS]
        + [f"trophies/{t}:p" for t in S.TROPHIES],
        "events": [f"events/{e}:p" for e in S.EVENTS],
        "maps": [f"maps/{m}:pL" for m in S.MAPS],
        "poses": [f"dogs/{d}-{q}:{v}" for d in S.DOG_LOOK for q in S.DOG_POSES for v in ("p", "pr")],
    }
    return order if group is None else order[group]


# ------------------------------------------------------------------------------------------------ resolve
def resolve(spec):
    m = re.fullmatch(r"([\w-]+)/([\w-]+)(?::([\w-]+))?(?:@([\d,]+))?", spec)
    if not m:
        raise ValueError(f"bad job spec {spec}")
    group, aid, version, seeds = m.groups()
    key = f"{group}/{aid}"
    entry = ASSETS[key]
    version = version or next(iter(entry["versions"]))
    v = dict(entry["versions"][version])
    if seeds and ("," in seeds or len(seeds) > 3):
        seed_list = [int(x) for x in seeds.split(",")][:MAX_CANDIDATES]
    else:
        n = min(int(seeds or v.pop("n", entry["n"])), MAX_CANDIDATES)
        seed_list = [seed_for(key, version, k) for k in range(1, n + 1)]
    v.pop("n", None)
    W, H = v.pop("gen", entry["gen"])
    if W > MAX_W or H > MAX_H:
        raise ValueError(f"{spec}: render {W}x{H} exceeds the {MAX_W}x{MAX_H} cap")
    base = {"group": group, "id": aid, "version": version, "size": list(entry["size"]), "width": W, "height": H,
            "refs": [], "strength": 0.0, "shift": None, "preset": entry["preset"]}
    base.update(v)
    return [dict(base, seed=s) for s in seed_list]


def study_specs():
    """Every spec of the style study (<= 2 candidates per motif and style head)."""
    out = []
    for h in HEADS:
        out += [f"inns/village:{h}", f"inns/village:{h}L"]
    for h in HEADS:
        out += [f"portraits/maurer:{h}", f"dogs/shepherd:{h}", f"van/van:{h}"]
    return out


if __name__ == "__main__":
    import json
    import sys
    for s in sys.argv[1:] or study_specs():
        for j in resolve(s):
            print(json.dumps({k: j[k] for k in ("group", "id", "version", "seed", "width", "height")}), "|",
                  j["prompt"][:120], "…")
