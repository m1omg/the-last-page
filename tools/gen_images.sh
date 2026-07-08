#!/usr/bin/env bash
# gen_images.sh [keys...] — batch-generate all (or listed) images from
# tools/prompts.json with 3 parallel Codex workers. Re-runnable: existing
# tools/_raw/<key>.png files are skipped.
set -u
cd "$(dirname "$0")/.."
mkdir -p tools/_raw

KEYS="${*:-$(node -e 'require("./tools/prompts.json").images.forEach(p=>console.log(p.key))')}"

printf '%s\n' $KEYS | xargs -P 3 -I {} bash tools/gen_one.sh {}

echo "===== batch done ====="
missing=0
for key in $KEYS; do
  if [ ! -f "tools/_raw/$key.png" ]; then echo "STILL MISSING: $key"; missing=$((missing+1)); fi
done
echo "missing: $missing"
