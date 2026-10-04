"""Whisper medium WITHOUT VAD (stricter) on every delivered music file (after TIME TO LIVE check_deliveries.py).
Checks are reused only when the exact audio hash matches the saved report. Usage: check_deliveries.py"""
import hashlib, json, subprocess, sys
from core import ROOT, WORK, MUSIC

manifest = json.loads((ROOT / "public/audio/music.json").read_text())
files = sorted({ROOT / "public" / name for entry in manifest.values() for name in entry["files"].values()})
todo = []
for f in files:
    j = WORK / "speech" / f"{f.stem}.medium-novad.json"
    with f.open("rb") as source:
        digest = hashlib.file_digest(source, "sha256").hexdigest()
    if not j.exists() or json.loads(j.read_text()).get("audio_sha256") != digest:
        todo.append(str(f))
print("checking", len(todo), "of", len(files), "files", flush=True)
if todo:
    subprocess.run([sys.executable, str(MUSIC / "tools/speech.py"), "--novad", *todo], check=True)
bad = []
for f in files:
    d = json.loads((WORK / "speech" / f"{f.stem}.medium-novad.json").read_text())
    hits = [r for r in d["segments"] if r["speech"]]
    print(f"{'WORDS' if hits else 'clean'}  {f.name}" + "".join(f"\n    {r['start']:.1f}-{r['end']:.1f}: {r['text'][:80]}" for r in hits))
    bad += [f.name] if hits else []
sys.exit(1 if bad else 0)
