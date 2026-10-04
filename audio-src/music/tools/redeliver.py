"""Re-run deliver.py for delivered pieces with their recorded picks and notes (after a tool change):
  redeliver.py [<piece> ...]     (default: every piece in public/audio/music.json)"""
import json, subprocess, sys
from core import ROOT, WORK, MUSIC, plans

music = json.loads((ROOT / "public/audio/music.json").read_text())
for pid in sys.argv[1:] or [k for k in plans.ORDER if k in music]:
    d = json.loads((WORK / pid / "deliver.json").read_text())
    picks = [f"{v}={r['take']}" for v, r in d["versions"].items()]
    subprocess.run([sys.executable, str(MUSIC / "tools/deliver.py"), pid, *picks, "--note", d["note"]], check=True)
