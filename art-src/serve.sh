#!/usr/bin/env bash
# Keep model loading inside a hard host-memory ceiling (contract §0.7: 15 GiB); preserve RAM for the editor and game.
if [ "${SAT_MEMORY_GUARDED:-0}" != "1" ]; then
  exec systemd-run --user --wait --pipe --collect --unit=sat-art-generation \
    -p MemoryHigh=14G -p MemoryMax=15G -p MemorySwapMax=256M -p OOMPolicy=stop \
    --working-directory=/home/clab/projects/games/skat-auf-tour \
    /usr/bin/env SAT_MEMORY_GUARDED=1 OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=4 bash "$0" "$@"
fi
# One GPU hold: start ComfyUI (port 8192, art-src/comfy in/out), run queue/pending job files with worker.py until the
# queue is empty or the max hold is reached, stop ComfyUI. ALWAYS run under the shared GPU lock:
#   flock /home/clab/projects/clab/faultline/.work/locks/gpu.lock bash art-src/serve.sh [--max-hold S] [--idle S]
# (loop.sh does this for you.) A file art-src/STOP means: the user wants the GPU back — do not start a hold.
set -u
ART=/home/clab/projects/games/skat-auf-tour/art-src
COMFY="$HOME/.local/share/faultline-imagegen/ComfyUI"
PY=/home/clab/projects/games/skat-auf-tour/tools/.venv/bin/python
PORT=8192
STAMP=$(date +%m%d-%H%M%S)
LOG="$ART/logs/comfy-$STAMP.log"
mkdir -p "$ART/logs" "$ART/comfy/input" "$ART/comfy/output"

if [ -e "$ART/STOP" ]; then
  echo "art-src/STOP exists: not starting a GPU hold" >&2
  exit 4
fi
if curl -s -o /dev/null http://127.0.0.1:$PORT/system_stats; then
  echo "port $PORT already serving; refusing to start a second ComfyUI" >&2
  exit 3
fi

cd "$COMFY" || exit 1
../.venv/bin/python main.py --listen 127.0.0.1 --port $PORT --disable-api-nodes --disable-all-custom-nodes \
  --preview-method none --reserve-vram 2 --use-sage-attention \
  --input-directory "$ART/comfy/input" --output-directory "$ART/comfy/output" >"$LOG" 2>&1 &
PID=$!

stop_comfy() {
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null
    for _ in $(seq 30); do kill -0 "$PID" 2>/dev/null || break; sleep 1; done
    kill -9 "$PID" 2>/dev/null
  fi
  wait "$PID" 2>/dev/null
  # never leave anything of ours on the GPU
  pkill -f "main.py --listen 127.0.0.1 --port $PORT" 2>/dev/null
  # gen.py already saved every image into cand/ (via /view); ComfyUI's own copies are duplicates
  rm -rf "$ART/comfy/output/sat"
  echo "ComfyUI stopped ($(date +%T))"
}
trap stop_comfy EXIT

for _ in $(seq 240); do
  curl -s -o /dev/null http://127.0.0.1:$PORT/system_stats && break
  kill -0 "$PID" 2>/dev/null || { echo "ComfyUI exited early, see $LOG" >&2; exit 1; }
  sleep 1
done
echo "ComfyUI up ($(date +%T)), log $LOG"

cd "$ART" || exit 1
"$PY" worker.py "$@"
