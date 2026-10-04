#!/usr/bin/env bash
# One bounded YuE2 GPU hold (contract §0.7), after TIME TO LIVE tools/runtime/render-music.sh.
#   bash audio-src/music/hold.sh <log-name> JOB ...           JOB = <piece>:<version>:<n>[,<n>...]  (gen.py, YuE2)
# - Does nothing (exit 3) while audio-src/STOP exists: the user wants the GPU back.
# - Does nothing (exit 4) while ComfyUI / Krea is running (main.py --listen 127.0.0.1 --port 8192).
# - Waits for the shared GPU lock, re-checks both conditions inside it, then runs gen.py in a systemd unit:
#   host memory capped at 11 GiB without swap, at most 660 s (gen.py starts no take that would pass 600 s and
#   checks audio-src/STOP between takes). The lock is released when the unit ends.
# Each hold is appended to audio-src/logs/music/holds.tsv (start, end, seconds, exit, jobs) for the GPU-time report.
set -uo pipefail
ROOT=/home/clab/projects/games/skat-auf-tour
LOCK=/home/clab/projects/clab/faultline/.work/locks/gpu.lock
LOGDIR=$ROOT/audio-src/logs/music
name=$1; shift
mkdir -p "$LOGDIR" "$(dirname "$LOCK")"
# character classes so the pattern never matches this script's own command line
comfy() { pgrep -f "main[.]py --listen 127[.]0[.]0[.]1 --port 8192" >/dev/null; }
if [ -e "$ROOT/audio-src/STOP" ]; then echo "audio-src/STOP exists: no GPU hold"; exit 3; fi
if comfy; then echo "ComfyUI (Krea) is running: no GPU hold"; exit 4; fi
exec flock "$LOCK" bash -c '
  ROOT=$1; LOGDIR=$2; name=$3; shift 3
  comfy() { pgrep -f "main[.]py --listen 127[.]0[.]0[.]1 --port 8192" >/dev/null; }
  if [ -e "$ROOT/audio-src/STOP" ]; then echo "audio-src/STOP appeared while waiting: no GPU hold"; exit 3; fi
  if comfy; then echo "ComfyUI started while waiting: no GPU hold"; exit 4; fi
  t0=$(date +%s); echo "hold start $(date +%T)"
  systemd-run --user --wait --pipe --collect --unit=skat-music-generation \
    -p MemoryHigh=10500M -p MemoryMax=11G -p MemorySwapMax=0 -p CPUQuota=400% \
    -p RuntimeMaxSec=660 -p OOMPolicy=stop \
    --working-directory="$ROOT" \
    /usr/bin/env OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=2 \
    /home/clab/projects/clab/faultline/.venv-score/bin/python -u audio-src/music/gen.py --budget 600 --cfg 1.6 "$@" \
    > "$LOGDIR/$name.log" 2>&1
  rc=$?
  t1=$(date +%s)
  printf "%s\t%s\t%s\t%s\t%s\n" "$(date -d @$t0 +%FT%T)" "$(date -d @$t1 +%FT%T)" $((t1 - t0)) $rc "$*" >> "$LOGDIR/holds.tsv"
  echo "hold end $(date +%T): $((t1 - t0)) s, exit $rc"
  grep -v "it/s\]" "$LOGDIR/$name.log" | grep -E "^\{|loaded|hold done|resuming|stop|Error|error|Traceback|^[a-z]+/[a-z]+/t[0-9]+@" | cut -c1-400 | tail -60
  /usr/lib/wsl/lib/nvidia-smi --query-gpu=memory.used --format=csv,noheader 2>/dev/null || true
  exit $rc
' _ "$ROOT" "$LOGDIR" "$name" "$@"
