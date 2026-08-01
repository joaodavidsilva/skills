---
name: imagegen-gemini
description: "Generate or edit raster images with Gemini (Nano Banana): photos, illustrations, textures, sprites, mockups, character cutouts, transparent-background subjects, batches of variants. Use when the output should be a bitmap asset rather than SVG, vector, or code-native visuals."
---

# Image Generation (Gemini)

Generates or edits bitmap images for the current project through the bundled `scripts/image_gen.py`, which calls the Gemini Image API. Standard library only; needs `GEMINI_API_KEY` in the environment.

## Fit

Reach for it when the asset is a photo, illustration, texture, sprite, mockup, or cutout. Build diagrams, icons, logos that extend an existing SVG system, and anything deterministic directly in SVG, HTML/CSS, or canvas. A real screenshot or existing project art beats a generated stand-in.

## Workflow

1. **Intent.** Edit when the user wants to change an existing image while keeping parts of it. Generate when images are only style or subject references, or when none are given.
2. **Destination.** Project-bound output goes into the workspace (user-named path, else `output/imagegen/`). Preview-only output can stay in `tmp/imagegen/`.
3. **Inputs.** Collect the prompt, exact text (verbatim), constraints, and input images. Give each image a role: edit target (first `--image`) or reference.
4. **Prompt.** Write the labeled spec below and read [reference/PROMPTING.md](reference/PROMPTING.md) for specificity, text, and edit invariants. Copy-paste recipes per asset type: [reference/SAMPLE-PROMPTS.md](reference/SAMPLE-PROMPTS.md).
5. **Run.** Execute the script (see [reference/CLI.md](reference/CLI.md) for flags, models, batch, and troubleshooting):
   ```bash
   python3 scripts/image_gen.py generate --prompt "..." --aspect-ratio 16:9 --size 2K --out output/imagegen/hero.jpg
   ```
   Many distinct assets: one `generate-batch` JSONL job per asset. Variants of one prompt: `--n`. Resolve `scripts/` against this skill's directory.
6. **Transparent subject.** Gemini returns opaque pixels. Read [reference/TRANSPARENCY.md](reference/TRANSPARENCY.md): generate on a flat key color, then remove it with `scripts/remove_chroma_key.py`.
7. **Inspect.** Open every output and check subject, style, composition, text accuracy, and the constraints. Iterate with one targeted change, repeating the invariants each time.
8. **Deliver.** Done when every requested file sits at its destination and you have reported, per asset: saved path, final prompt, and model. Keep only selected finals; delete discarded variants and scratch files unless asked to keep them. Existing assets are replaced only on explicit request; otherwise save a sibling such as `hero-v2.jpg`.

If a missing detail blocks success, ask one question; otherwise proceed.

## Prompt spec

Use only the lines that help. Keep specific prompts specific (normalize, do not expand); enrich generic ones with composition, polish level, and practical layout cues only.

```text
Use case: <taxonomy slug>
Asset type: <where the asset will be used>
Primary request: <user's main prompt>
Input images: <Image 1: role; Image 2: role>
Scene/backdrop: <environment>
Subject: <main subject>
Style/medium: <photo/illustration/3D/etc>
Composition/framing: <wide/close/top-down; placement>
Lighting/mood: <lighting + mood>
Color palette: <palette notes>
Materials/textures: <surface details>
Text (verbatim): "<exact text>"
Constraints: <must keep / must have>
Avoid: <described positively, e.g. "an empty street" instead of "no cars">
```

The script builds this spec from flags (`--use-case`, `--scene`, `--subject`, ...) and labels input images itself. `--no-augment` sends a hand-written prompt verbatim.

### Use-case slugs

Generate: `photorealistic-natural`, `product-mockup`, `ui-mockup`, `infographic-diagram`, `scientific-educational`, `ads-marketing`, `productivity-visual`, `logo-brand`, `illustration-story`, `stylized-concept`, `historical-scene`.

Edit: `text-localization`, `identity-preserve`, `precise-object-edit`, `lighting-weather`, `background-extraction`, `style-transfer`, `compositing`, `sketch-to-render`.

## Reference map

- [reference/CLI.md](reference/CLI.md): script flags, models, sizes, aspect ratios, batch JSONL, API key setup.
- [reference/TRANSPARENCY.md](reference/TRANSPARENCY.md): chroma-key workflow and validation for cutouts.
- [reference/PROMPTING.md](reference/PROMPTING.md): prompt principles and per-use-case tips.
- [reference/SAMPLE-PROMPTS.md](reference/SAMPLE-PROMPTS.md): recipes for websites, games, wireframes, logos, edits.
