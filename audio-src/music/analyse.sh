#!/usr/bin/env bash
# CPU-only music work (analysis, conform, master, delivery checks): never touches the GPU (CUDA hidden), runs at
# nice 15 with at most 4 threads and a 4 GiB memory cap, one job at a time (contract §0.7, framework "CPU work").
#   bash audio-src/music/analyse.sh process.py stammtisch daheim     (any script in audio-src/music/tools/)
set -euo pipefail
ROOT=/home/clab/projects/games/skat-auf-tour
script=$1; shift
exec systemd-run --user --wait --pipe --collect --unit="skat-music-cpu-$$" \
  -p Nice=15 -p MemoryMax=4G -p MemorySwapMax=256M -p CPUQuota=400% -p OOMPolicy=stop \
  --working-directory="$ROOT/audio-src/music/tools" \
  /usr/bin/env CUDA_VISIBLE_DEVICES= OPENBLAS_NUM_THREADS=2 OMP_NUM_THREADS=4 TOKENIZERS_PARALLELISM=false \
  /home/clab/projects/clab/faultline/.venv-score/bin/python -u "$script" "$@"
