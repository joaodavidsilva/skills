## What it does

`imagegen-gemini` generates and edits raster images (photos, illustrations, textures, sprites, UI mockups, and transparent-background cutouts) through a standard-library Python CLI (`scripts/image_gen.py`) that calls the Gemini Image API. It turns vague image requests into a structured prompt spec (`Use case`, `Subject`, `Composition`, `Lighting`, `Constraints`, `Avoid` phrased positively) and keeps only the approved final assets in your workspace while cleaning up intermediate scratch variants.

It refuses to generate what code should draw directly. Diagrams, icons, logos that extend an existing SVG system, and deterministic layouts belong in SVG, HTML/CSS, or [beautify-readme](https://aihero.dev/skills-beautify-readme), and a real project screenshot always beats a generated stand-in.

## When to reach for it

Type `/imagegen-gemini`, or the [agent](../references/agent.md) reaches for it automatically when a task needs a bitmap image created or edited, or when `beautify-readme` needs a raster subject for a hybrid hero.

| Asset needed | Reach for |
| --- | --- |
| Photo, illustration, character cutout, texture, sprite, or visual mockup | `imagegen-gemini` (`generate` or `generate-batch`) |
| Targeted change to an existing image while preserving identity, pose, or layout | `imagegen-gemini` (`edit` with `--image` and invariants) |
| Transparent-background subject or sticker cutout | `imagegen-gemini` + `scripts/remove_chroma_key.py` |
| Architecture diagram, badge, section banner, or deterministic README hero | [beautify-readme](https://aihero.dev/skills-beautify-readme) (pure SVG) |

## Prerequisites

- `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) set in the [environment](../references/environment.md). `scripts/image_gen.py` uses the Python 3 standard library only and needs no `pip` packages for generation or editing.
- `Pillow` (`python3 -m pip install Pillow`) when running `scripts/remove_chroma_key.py` for transparent cutouts or when converting outputs to PNG/WebP.

## Invariants and chroma-key cutouts

Two mechanics keep iterative image generation predictable across turns:

- **Explicit edit invariants.** When editing an image or iterating on a draft, the prompt spec repeats what must *not* drift (`Constraints`: pose, camera angle, lighting direction, palette, identity) and phrases exclusions positively (`Avoid: an empty street` rather than `no cars`, so the [model](../references/model.md) does not activate the concept you are trying to ban).
- **Chroma-key transparency.** Because the Gemini Image API returns opaque pixels, asking for "a transparent background" in prompt text alone produces a baked-in checkerboard. The skill instead generates the subject on a flat, high-contrast key color (`#00FF00` or `#FF00FF`) with clean edge separation and no color spill, then runs `scripts/remove_chroma_key.py` to convert the key color to an alpha channel and verify transparent corners.

## Common questions

**Why did the script save a `.jpg` file when I passed `--out hero.png`?**

The Gemini Image API chooses the output encoding (JPEG in practice). Rather than writing JPEG bytes under a misleading `.png` extension, `scripts/image_gen.py` saves under the real extension and logs a notice. When you need a real PNG or WebP (or an alpha channel), run `scripts/remove_chroma_key.py` on the output.

**When should I use `--n` versus `generate-batch`?**

Use `--n` when you want several variations of the *same* prompt to pick from. Use `generate-batch` with a JSONL file when you need several *distinct* assets (for example four different feature illustrations) generated concurrently in one run.

**Will it overwrite my existing project images?**

Not unless you ask it to. `scripts/image_gen.py` refuses to overwrite an existing output path unless `--force` is passed; by default the workflow writes a versioned sibling such as `hero-v2.jpg` until you confirm replacement.

## It's working if
- Every generated or edited asset is visually inspected by the agent before delivery, not just checked for a zero exit code.
- Iterative edits keep the subject's identity, framing, and lighting stable while changing only the requested detail.
- Cutouts routed through `remove_chroma_key.py` have genuinely transparent corner pixels (`alpha == 0`) and no green or magenta halo on dark and light backgrounds.
- Only the chosen final files remain in the target project folder; discarded variations in `tmp/imagegen/` are cleaned up.

## Where it fits

A reach-for-it-anytime standalone in `productivity/`, and the raster-generation helper behind [beautify-readme](https://aihero.dev/skills-beautify-readme)'s hybrid SVG workflow.

**ask-joao** routes across the whole set when you are unsure which skill the situation wants.
