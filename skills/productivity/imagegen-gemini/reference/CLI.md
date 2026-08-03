# CLI reference

`scripts/image_gen.py` calls the Gemini Interactions API (`POST /v1beta/interactions`). Standard library only, no installs.

Subcommands:
- `generate`: one prompt, one or more images. `--image` adds references (repeatable).
- `edit`: first `--image` is the edit target, further `--image` are references.
- `generate-batch`: many jobs from a JSONL file, run concurrently.

## API key

The script reads `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) from the environment. Create a key at https://aistudio.google.com/apikey and export it from the shell profile or a secret manager that injects environment variables. The key goes through the environment only: never into chat, files, or the repo. `--dry-run` prints the request without a key or network.

## Models (`--model`)

| Alias | API id | Use |
|---|---|---|
| `nano-banana-2.1` (default) | `gemini-nano-banana-2.1` | Workhorse: drafts and most finals, 1K/2K/4K |
| `nano-banana-pro` | `gemini-3-pro-image` | Complex scenes, dense text, brand fidelity, many references |
| `nano-banana-2` | `gemini-3.1-flash-image` | Previous workhorse; also offers 512 |
| `nano-banana-2-lite` | `gemini-3.1-flash-lite-image` | Fastest and cheapest; weak with several references or multi-turn edits |
| `nano-banana` | `gemini-2.5-flash-image` | Legacy |

A raw model id passes through unchanged. Current model list: https://ai.google.dev/gemini-api/docs/image-generation

## Output controls

- `--aspect-ratio`: `1:1`, `1:4`, `1:8`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`. Without it, the output matches the input image, else 1:1. Models differ in the ratios they offer; an unsupported pair returns an API error.
- `--size`: `512`, `1K`, `2K`, `4K`. Uppercase K is required. Draft at `1K`, finalize at `2K`. A 1200-wide README asset needs `2K` at most.
- Format: the API chooses the encoding (JPEG in practice; `response_format.mime_type` only accepts `image/jpeg`). The script saves under the real extension and logs a note when it differs from `--out`. Need PNG or alpha: convert through `scripts/remove_chroma_key.py` (writes PNG/WebP).
- `--out`: output path (default `output/imagegen/<command>.jpg`). Existing files fail unless `--force`.
- `--n`: variants of one prompt, written as `name-1.jpg`, `name-2.jpg`. One API call each.
- `--max-attempts`: retries with backoff on 429 and 5xx (default 3).

Prompt spec flags (`--use-case`, `--asset-type`, `--scene`, `--subject`, `--style`, `--composition`, `--lighting`, `--palette`, `--materials`, `--text`, `--constraints`, `--avoid`) compose the labeled prompt. `--prompt-file` reads the primary request from a file. `--no-augment` sends the prompt verbatim.

## Recipes

Generate:

```bash
python3 scripts/image_gen.py generate \
  --prompt "A minimal hero image of a ceramic coffee mug" \
  --use-case product-mockup --asset-type landing page hero \
  --composition "wide, negative space on the left for copy" \
  --lighting "soft studio light" --constraints "no logos, no text, no watermark" \
  --aspect-ratio 16:9 --size 2K --out output/imagegen/mug.jpg
```

Edit with invariants:

```bash
python3 scripts/image_gen.py edit \
  --image input/product.png \
  --prompt "Replace only the background with a warm sunset gradient" \
  --constraints "change only the background; keep the product and its edges unchanged" \
  --out output/imagegen/product-sunset.jpg
```

Batch (one job per distinct asset):

```bash
mkdir -p tmp/imagegen
cat > tmp/imagegen/jobs.jsonl << 'EOF'
{"prompt":"Cavernous hangar with a compact shuttle","use_case":"stylized-concept","aspect_ratio":"16:9","out":"hangar.jpg"}
{"prompt":"Gray wolf in profile in a snowy forest","use_case":"photorealistic-natural","aspect_ratio":"1:1","out":"wolf.jpg"}
{"prompt":"Replace the sky with dusk","image":["input/photo.png"],"edit":true,"out":"photo-dusk.jpg"}
EOF
python3 scripts/image_gen.py generate-batch --input tmp/imagegen/jobs.jsonl \
  --out-dir output/imagegen/batch --concurrency 4
rm -f tmp/imagegen/jobs.jsonl
```

Batch rules:
- `--out-dir` is required; per-job `out` is a filename under it (default `image_<line>.jpg`).
- Job fields: `prompt`, `out`, `image` (list), `edit` (bool), `n`, `model`, `aspect_ratio`, `size`, `no_augment`, plus every spec field (`use_case`, `scene`, ...). Flags on the command line set defaults; job fields override them.
- `--concurrency` 1 to 16 (default 4). Lower it on 429 errors. A failed job does not stop the others unless `--fail-fast`; the exit code is 2 when any job failed.
- Use `--n` for variants of one prompt; give distinct assets distinct jobs.

## Troubleshooting

- `HTTP 429`: quota or rate limit. Lower `--concurrency`, wait, or check the key's plan in AI Studio.
- `blocked due to copyright/recitation` (HTTP 400): the model refused this prompt, not a bug. Rephrase or retry; trivial prompts can trigger it.
- `response contained no image`: the model answered with text only (often a refusal or an ambiguous request). The message includes its reply; reword the prompt.
- `HTTP 400` on size or ratio: pick a pair the model supports (see the docs link above).
- Every generated image carries a SynthID watermark.
