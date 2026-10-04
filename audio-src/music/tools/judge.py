"""CLAP pre-filter (laion/clap-htsat-unfused, CPU), after TIME TO LIVE tools/judge.py, with prompts for this brief:
  acoustic = warm acoustic / 1970s easy-listening instrumentation   vs  electronic = synths, EDM, drum machine
  vocal    = singing, lyrics, chanting, yodel                         vs  instrumental
  intense  = tense, driving, exciting                                 vs  calm, relaxed
  fit      = mean cosine similarity to the piece's own descriptors (plans.P[pid]["clap"]), absolute, for ranking
per 10 s window (5 s hop). Usage: judge.py <piece> [<version>/<take> ...] [--wav <file> ...] -> work/<piece>/judge.json
These are classifier estimates for ranking and flagging, not a listening verdict."""
import os, sys
import numpy as np, torch
from transformers import ClapModel, ClapProcessor
from core import plans, load, take_path, list_takes, load_json, save_json, WORK, SR

torch.set_num_threads(int(os.environ.get("OMP_NUM_THREADS", "4")))
MODEL = "laion/clap-htsat-unfused"
model = ClapModel.from_pretrained(MODEL, local_files_only=True).eval()
proc = ClapProcessor.from_pretrained(MODEL, local_files_only=True)
PROMPTS = {
    "acoustic": ["warm acoustic instrumental music played on real instruments",
                 "acoustic folk music with accordion, acoustic guitar and double bass",
                 "1970s easy listening instrumental orchestra", "brass band and acoustic instruments"],
    "electronic": ["electronic synthesizer music", "EDM club dance track with a four on the floor kick",
                   "techno with a drum machine", "modern pop production with synths and programmed beats"],
    "vocal": ["a person singing", "a singer singing lyrics", "vocal humming and chanting", "a choir singing words",
              "yodeling"],
    "instrumental": ["instrumental music with no vocals", "instrumental acoustic music",
                     "instrumental band music without singing"],
    "intense": ["tense suspenseful music with a driving rhythm", "intense exciting fast music",
                "urgent energetic music with strong accents"],
    "calm": ["calm relaxed background music", "gentle quiet peaceful music", "slow easy-going music"],
}
# zero-shot instrument probe (softmax over these per window, averaged): what the take actually features
INSTRUMENTS = ["accordion", "acoustic guitar", "double bass", "clarinet", "trumpet", "trombone", "tuba",
               "French horn", "piano", "vibraphone", "Hammond organ", "slide guitar", "electric guitar",
               "electric bass", "drum kit", "violin and strings", "harmonica", "saxophone", "flute",
               "synthesizer", "drum machine", "human voice"]


@torch.no_grad()
def text_embed(texts):
    inputs = proc(text=texts, return_tensors="pt", padding=True)
    return torch.nn.functional.normalize(model.get_text_features(**inputs), dim=-1)


TEXT = {k: text_embed(v) for k, v in PROMPTS.items()}
INST = text_embed([f"the sound of {'a ' if not i.endswith('s') and i[0] not in 'aeiouAEIOU' else ''}{i}"
                   .replace("a human", "a human").replace("the sound of a acc", "the sound of an acc") for i in INSTRUMENTS])
SCALE = model.logit_scale_a.exp().item()


@torch.no_grad()
def audio_embed(chunks):
    out = []
    for i in range(0, len(chunks), 8):
        inputs = proc(audio=chunks[i:i + 8], sampling_rate=48000, return_tensors="pt")
        out.append(torch.nn.functional.normalize(model.get_audio_features(**inputs), dim=-1))
    return torch.cat(out)


def pair(a, x, y):
    lx, ly = (a @ x.T).mean(1), (a @ y.T).mean(1)
    return torch.sigmoid(SCALE * (lx - ly)).numpy()


def judge_audio(m, target):
    n, h = int(10 * SR), int(5 * SR)
    starts = list(range(0, max(1, len(m) - n + 1), h))
    a = audio_embed([m[s:s + n] for s in starts])
    acou = pair(a, TEXT["acoustic"], TEXT["electronic"])
    voc = pair(a, TEXT["vocal"], TEXT["instrumental"])
    inten = pair(a, TEXT["intense"], TEXT["calm"])
    fit = (a @ target.T).mean(1).numpy()
    mids = np.array([(s + n / 2) / SR for s in starts])
    inst = torch.softmax(SCALE * (a @ INST.T), dim=1).mean(0).numpy()
    top = sorted(zip(INSTRUMENTS, inst), key=lambda r: -r[1])
    return dict(instruments={k: round(float(v), 3) for k, v in top[:8]},acoustic=round(float(acou.mean()), 3), acoustic_min=round(float(acou.min()), 3),
                vocal_max=round(float(voc.max()), 3), vocal_mean=round(float(voc.mean()), 3),
                vocal_max_at=round(float(mids[int(np.argmax(voc))]), 1), fit=round(float(fit.mean()), 3),
                fit_min=round(float(fit.min()), 3), intense=round(float(inten.mean()), 3),
                windows=[dict(t=round(float(t), 1), acoustic=round(float(c), 2), vocal=round(float(v), 2),
                              intense=round(float(i), 2), fit=round(float(f), 3))
                         for t, c, v, i, f in zip(mids, acou, voc, inten, fit)])


def show(name, r):
    print(f"{name}: fit {r['fit']:.3f} (min {r['fit_min']:.3f}) acoustic {r['acoustic']:.2f} (min {r['acoustic_min']:.2f}) "
          f"vocal max {r['vocal_max']:.2f} @{r['vocal_max_at']}s mean {r['vocal_mean']:.2f} intense {r['intense']:.2f}  "
          f"instruments: {', '.join(f'{k} {v:.2f}' for k, v in list(r['instruments'].items())[:5])}",
          flush=True)


def main():
    pid = sys.argv[1]
    args = sys.argv[2:]
    target = text_embed(plans.P[pid]["clap"])
    out_path = WORK / pid / "judge.json"
    res = load_json(out_path)
    if "--wav" in args:
        i = args.index("--wav")
        files, args = args[i + 1:], args[:i]
        import soundfile as sf
        for f in files:
            x, sr = sf.read(f, dtype="float32", always_2d=True)
            r = judge_audio(x.mean(1), target)
            res["wav:" + f.split("/")[-1]] = r
            show(f, r)
    jobs = [tuple(a.split("/")) for a in args] or ([] if "--wav" in sys.argv else
                                                   [(v, t) for v in plans.P[pid]["versions"] for t in list_takes(pid, v)])
    for version, take in jobs:
        x, m = load(take_path(pid, version, take))
        r = judge_audio(m, target)
        res[f"{version}/{take}"] = r
        show(f"{pid}/{version}/{take}", r)
    save_json(out_path, res)


if __name__ == "__main__":
    main()
