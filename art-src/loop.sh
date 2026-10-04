#!/usr/bin/env bash
# Keep painting while there is queued work. Each round checks art-src/STOP (if it exists: no hold, exit), waits for
# the shared GPU lock (blocking flock), runs one serve.sh hold (<= ~18 min incl. ComfyUI start/stop), releases the
# lock, then pauses so a waiting workstream (audio: YuE2 / Stable Audio) gets the GPU before we queue again.
# Exits after QUIT_IDLE seconds with no work (default 60).
#   bash art-src/loop.sh            (run it in the background; logs in art-src/logs/)
ART=/home/clab/projects/games/skat-auf-tour/art-src
LOCK=/home/clab/projects/clab/faultline/.work/locks/gpu.lock
QUIT_IDLE=${QUIT_IDLE:-60}
cd "$ART" || exit 1
mkdir -p logs queue/pending queue/hold
idle=0
while true; do
  if [ -e "$ART/STOP" ]; then
    echo "art-src/STOP exists: no GPU hold ($(date +%T))"
    break
  fi
  if compgen -G "queue/pending/*.txt" >/dev/null; then
    idle=0
    echo "hold wait $(date +%T)"
    # the STOP check is repeated inside the lock (serve.sh), in case it appeared while we waited
    flock "$LOCK" bash "$ART/serve.sh" "$@" > "logs/serve-$(date +%m%d-%H%M%S).log" 2>&1
    echo "hold end $(date +%T) (exit $?)"
    sleep 45   # let a waiting GPU job take the lock
  else
    idle=$((idle + 10)); [ $idle -gt "$QUIT_IDLE" ] && break
    sleep 10
  fi
done
echo "loop exit $(date +%T)"
