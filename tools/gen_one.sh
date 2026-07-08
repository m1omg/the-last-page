#!/usr/bin/env bash
# gen_one.sh <key> — generate one image from tools/prompts.json via Codex's
# built-in GPT Image 2 tool, saving the raw PNG to tools/_raw/<key>.png.
set -u
cd "$(dirname "$0")/.."
key="$1"
out="tools/_raw/$key.png"
[ -f "$out" ] && { echo "have   $key (skip)"; exit 0; }

tmp="$(mktemp)"
node -e '
  const key = process.argv[1];
  const data = require("./tools/prompts.json");
  const img = data.images.find(x => x.key === key);
  if (!img) { console.error("no such key " + key); process.exit(1); }
  const parts = [];
  const use = img.use || "style";
  if (use.includes("style")) parts.push(data.style);
  if (use.includes("topdown")) parts.push(data.topdown);
  if (use.includes("chroma-sheet")) {} else if (use.includes("chroma")) parts.push(data.chroma);
  parts.push(img.prompt);
  const shape = img.size === "1536x1024" ? "LANDSCAPE orientation (approx 3:2, e.g. 1536x1024), largest size available"
              : img.size === "1024x1536" ? "PORTRAIT orientation (approx 2:3), largest size available"
              : "SQUARE (1024x1024)";
  process.stdout.write(
`Do this with no questions and minimal preamble. Call your built-in image_gen tool exactly ONCE in GENERATE mode with the prompt below, ${shape}. Do NOT read documentation, do NOT use any CLI or OPENAI_API_KEY path, do NOT write any code.

PROMPT:
${parts.join("\n\n")}

After it is generated, copy the resulting PNG file that your image_gen call just produced (it is saved under $CODEX_HOME/generated_images/) into ./tools/_raw/${key}.png (overwrite if present), then print exactly one line: SAVED tools/_raw/${key}.png`);
' "$key" > "$tmp" || { rm -f "$tmp"; exit 1; }

echo ">>>>>> generating $key"
codex exec --skip-git-repo-check -s workspace-write -c approval_policy="never" -c model_reasoning_effort="low" - < "$tmp" > "tools/_raw/$key.log" 2>&1
rm -f "$tmp"
if [ -f "$out" ]; then echo "ok     $key"; else echo "MISS   $key"; fi
