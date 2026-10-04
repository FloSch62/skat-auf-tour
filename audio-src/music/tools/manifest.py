"""Provenance manifest of the music (contract §0.12): audio-src/music/manifest.json.
For every piece: the plan (key, tempo, bars, form, loop bars, score hash), and for every take its model, seed, style
prompt, CFG negative, generation settings and timing, the analysis summary (tempo, CLAP, Whisper, flags), whether it
was picked and why, the user's listening feedback, and the delivery (files, loop points, gain, levels, hashes). Also
the GPU holds (audio-src/logs/music/holds.tsv). Run after every delivery: manifest.py"""
import hashlib, json
from pathlib import Path
from core import plans, WORK, MUSIC, ROOT, load_json, save_json

FEEDBACK = {   # what the user said after listening (relayed by the coordinator), 2026-10-04
    "stammtisch": ["calm t1 'sounds great' (template for the other themes)",
                   "picked calm t1 + tense t2: 'tense t2, aber sind alle gut, also genau so weiter machen'"],
    "daheim": ["v1 (t1, t2) rejected: 'die daheim Musik ist nicht gut, die klingt zu sehr nach Heimatfilm' -> v2 from t3"],
    "enztal": ["'enztal und stromberg klingen auch alle gut'"],
    "stromberg": ["'enztal und stromberg klingen auch alle gut'"],
}
RULES = ["No vocals: CFG away from voices, non-vocal ABC block labels, Whisper (with and without VAD) and CLAP checks.",
         "User rule 2026-10-04: no conforming, time-stretching, pitch shifting or re-editing; simple mastering only "
         "(constant gain, 10 ms fade-in, 2 s fade-out at file end) and natural loop points with a 40 ms seam blend."]


def file_sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest() if Path(p).exists() else None


def main():
    music = load_json(ROOT / "public/audio/music.json")
    holds = []
    tsv = ROOT / "audio-src/logs/music/holds.tsv"
    if tsv.exists():
        for line in tsv.read_text().splitlines():
            start, end, secs, rc, jobs = line.split("\t")
            holds.append(dict(start=start, end=end, seconds=int(secs), exit=int(rc), jobs=jobs))
    out = dict(
        generator=dict(model="m-a-p/YuE2-3B", vae="m-a-p/YuE2-Vae", package="yue2-infer 0.1.6 (faultline .venv-score)",
                       mode="cot=full with an external original ABC plan, lyrics empty, classifier-free guidance away "
                            "from a negative [Tags] text (same instruction and ABC)",
                       hardware="NVIDIA RTX 4080 SUPER 16 GB (WSL2), AR offload, 12 GiB pipeline budget, 32 ODE steps",
                       licence="audio-src/licenses/YuE2-MODEL_LICENSE (weights CC BY-NC 4.0 + individual creator "
                               "permission), YuE2-LICENSE (code, Apache-2.0)"),
        analysis=dict(clap="laion/clap-htsat-unfused (CPU)", whisper="faster-whisper medium int8 (CPU), with and "
                      "without VAD",
                      listener="not used: the cached Qwen2-Audio-7B snapshot is incomplete (2 of 5 shards)"),
        rules=RULES, gpu_holds=holds, gpu_seconds=sum(h["seconds"] for h in holds), pieces={})
    for pid in plans.ORDER:
        P = plans.P[pid]
        L = plans.layout(pid)
        evals = {r["take"]: r for r in load_json(WORK / pid / "eval.json", [])}
        judge = load_json(WORK / pid / "judge.json")
        deliv = load_json(WORK / pid / "deliver.json")
        picked = {v: r["take"] for v, r in deliv.get("versions", {}).items()}
        takes = []
        for version in P["versions"]:
            d = MUSIC / "takes" / pid / version
            if not d.exists():
                continue
            for td in sorted(d.iterdir(), key=lambda p: int(p.name[1:])):
                g = load_json(td / "gen.json")
                if not g:
                    continue
                key = f"{version}/{td.name}"
                ev = evals.get(key, {})
                j = judge.get(key, {})
                sp = load_json(WORK / "speech" / f"{pid}-{version}-{td.name}.medium.json")
                takes.append(dict(
                    take=key, path=str((td / "audio.flac").relative_to(ROOT)), seed=g["seed"], cfg=g["cfg"],
                    style=g["style"], negative=g["negative"], plan_sha256=g["plan_sha256"],
                    seconds=round(json.loads((td / "result.json").read_text())["audio_seconds"], 2),
                    semantic_tokens=g["semantic_tokens"], wall_seconds=g.get("wall_seconds"),
                    generation=load_json(td / "config.json").get("generation"),
                    superseded=int(td.name[1:]) < P.get("takes_from", 1),
                    analysis=dict(tempo_bpm=ev.get("tempo_bpm"), key=ev.get("key"), clap_fit=ev.get("fit"),
                                  clap_acoustic=ev.get("acoustic"), clap_vocal_max=ev.get("vocal_max"),
                                  clap_intensity=ev.get("intense"), instruments=j.get("instruments"),
                                  whisper=("clean" if not [s for s in sp.get("segments", []) if s["speech"]]
                                           else "WORDS") if sp else None,
                                  rejects=ev.get("reject"), advisories=ev.get("advisory"), score=ev.get("score")),
                    picked=picked.get(version) == td.name))
        out["pieces"][pid] = dict(
            use=P.get("use"), key=P["key"], bpm=P["bpm"], kind=P["kind"], bars=L["bars"], intro_bars=L["intro"],
            loop_bars=list(L["loop"]), loops=L["loop_ok"], form=[n for n, _ in P["form"]],
            revision=P.get("revision", "v1"), negative=plans.negative(pid), feedback=FEEDBACK.get(pid, []),
            takes=takes, picks=picked, pick_note=deliv.get("note"),
            delivery=dict(entry=music.get(pid), versions={v: {k: r.get(k) for k in (
                "take", "seed", "measured_bpm", "seam", "gain_db", "delivered", "loop_level", "delivery",
                "delivery_sha256", "master", "master_sha256", "source", "source_sha256", "bytes", "samples",
                "processing")} for v, r in deliv.get("versions", {}).items()}) if deliv else None)
    save_json(MUSIC / "manifest.json", out)
    n = sum(len(p["takes"]) for p in out["pieces"].values())
    print(f"manifest: {len(out['pieces'])} pieces, {n} takes, {len(music)} delivered, GPU {out['gpu_seconds']} s "
          f"in {len(holds)} holds")


if __name__ == "__main__":
    main()
