# Transparent subjects

Gemini returns opaque pixels, so a cutout is a two-step job: generate the subject on a flat key color, then convert that color to alpha with `scripts/remove_chroma_key.py` (Pillow required).

## 1. Generate on a key color

Pick a key absent from the subject: `#00ff00` by default, `#ff00ff` when the subject contains green. Put these lines in the prompt:

```text
Use case: background-extraction
Asset type: transparent cutout subject
Composition/framing: one isolated subject, centered, generous padding on every side
Color palette: <subject palette>; the subject contains no #00ff00
Constraints: crisp edges; no text, logo, or watermark
Background: perfectly flat solid #00ff00, no gradient, texture, floor, reflection, shadow, or vignette
```

Hair, fur, smoke, glass, and translucency key poorly. When the subject will not move after composition, generate it on the final background color instead and skip removal.

## 2. Remove the key

```bash
python3 scripts/remove_chroma_key.py --input tmp/imagegen/subject-key.jpg \
  --out output/imagegen/subject.png --auto-key border --soft-matte --despill
```

Tune with `--key-color #00ff00` (explicit key), `--transparent-threshold` / `--opaque-threshold` (soft-matte ramp), `--edge-contract` (shrink a halo by pixels), `--edge-feather` (soften). Output must be `.png` or `.webp`. Keep the key-colored source in `tmp/` and delete it after validation.

## 3. Validate

The cutout is done when all hold:
- alpha channel present and all four corners fully transparent;
- no key-color fringe on a light and on a dark background (composite it over both and look);
- thin details and intended rim light survive;
- no accidental text or watermark.

If edges stay dirty after tuning, regenerate with a flatter key and more padding rather than pushing the thresholds further.
