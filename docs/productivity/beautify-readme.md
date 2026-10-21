## What it does

`beautify-readme` redesigns a repository's `README.md` or creates standalone visual assets for it: a project-native hero, section headers, architecture or workflow diagrams, badges, and opt-in GitHub-safe GIF motion. It treats Markdown as the content layer, deterministic SVG as the layout system, and generated raster imagery as an optional ingredient rather than a default decoration.

Before touching any file, the [agent](../references/agent.md) locks in the execution mode (`README` mode vs `asset-only` mode) and, for hero-like visuals, asks whether you want **pure SVG** or **hybrid SVG composition**. In `asset-only` mode it leaves `README.md` byte-for-byte untouched unless you explicitly approve embedding the new assets.

## When to reach for it

Type `/beautify-readme`, or the agent reaches for it automatically when you ask to redesign, audit, or visually upgrade a README, or when you ask for README visuals such as an SVG hero, section banners, or workflow diagrams.

| Your situation | Mode or skill to use |
| --- | --- |
| The whole README needs stronger hierarchy, proof order, and a cohesive visual system | `beautify-readme` in **README mode** |
| You only want a hero, section headers, diagrams, or an animated GIF without touching `README.md` | `beautify-readme` in **Asset-only mode** |
| You want to check broken image refs, missing alt text, or unsafe SVG tags without editing | `beautify-readme` in **Audit** mode |
| You need a standalone raster illustration, photo, texture, or transparent cutout outside a README | [imagegen-gemini](./imagegen-gemini.md) |

## Prerequisites

Pure SVG heroes, diagrams, section headers, and `scripts/audit_readme.py` run on standard `python3` with no external dependencies. Optional paths need extra tooling:

- **Hybrid SVG composition**: calls [imagegen-gemini](./imagegen-gemini.md), which requires `GEMINI_API_KEY` in the [environment](../references/environment.md) and `Pillow` for chroma-key background removal.
- **GitHub-safe GIF motion**: `scripts/render_motion_gif.py` requires `Pillow` (`python3 -m pip install Pillow`) and an SVG rasterizer (`resvg`, `rsvg-convert`, ImageMagick, or `sips`).

## Project-native heroes and the pure-vs-hybrid fork

A weak README hero is a generic banner pasted above the real project: remove the repository title and the graphic could belong to anything. A **project-native hero** absorbs a real artifact from the repository itself (a terminal trace, a diagram, a code specimen, a UI frame, or a domain motif) so the first screen proves what the project does before a reader scrolls.

When a hero or showcase board could go either way, the skill surfaces the implementation choice upfront:

| Implementation | What it builds | Best when |
| --- | --- | --- |
| **Pure SVG** (default) | Deterministic vector layout, typography, diagrams, code frames, and geometric or pixel-art motifs | You want lightweight, infinitely sharp files that are easy to diff and edit in git |
| **Hybrid SVG composition** | An SVG layout source combined with a raster subject generated and chroma-keyed via `imagegen-gemini`, published as PNG/WebP with the editable SVG and cutout layers kept alongside | A character, mascot, rich material, or illustrated subject communicates the project's identity better than vector shapes alone |

It also asks once whether to ship GitHub light and dark **theme variants** (`<picture>` with `prefers-color-scheme` media sources) so contrast holds on both canvases.

## Common questions

**Will it rewrite my `README.md` if I only asked for a hero or banner?**

No. When the scope is ambiguous it asks whether you want `README` mode or `asset-only` mode first. Once `asset-only` mode is selected, it writes only the visual files (under `assets/readme/` by default) and offers the embed snippet separately.

**Why does it publish a PNG or WebP for hybrid heroes instead of embedding the raster inside the SVG?**

GitHub's image proxy and Markdown sanitizer strip or break relative local raster references inside `<svg>`, and base64-encoding a high-resolution cutout inside an SVG bloats the file. Publishing the composed PNG/WebP while keeping the SVG layout and transparent subject cutout in `assets/readme/source/` keeps the rendered README fast and the source layers editable.

**Why doesn't it use animated SVG for motion on GitHub?**

GitHub sanitizes scripts and blocks or inconsistently renders many CSS/SMIL animations inside `<img>`-referenced SVGs. When you explicitly opt into motion, the skill keeps the static SVG as the editable source and renders a bounded, GitHub-safe GIF from named SVG layers.

## It's working if

- The first screen of the README explains what the repository does and shows real proof before long prose.
- Removing the project's title from the hero still leaves a visual that could only belong to this repository.
- Diagram and banner labels stay legible at a 900px GitHub desktop width and a 360px mobile preview.
- Running `python3 scripts/audit_readme.py README.md` reports zero missing assets, zero missing alt attributes, and zero `<script>` or `<foreignObject>` tags in SVGs.
- In `asset-only` mode, `git diff README.md` is empty.

## Where it fits

A reach-for-it-anytime standalone in the `productivity/` bucket for repository documentation and visual storytelling. When you choose hybrid SVG composition, it calls [imagegen-gemini](./imagegen-gemini.md) via the [tool](../references/tool.md) call to generate and key out the raster subject. For agent-facing files (`SKILL.md`, `AGENTS.md`, `CLAUDE.md`) rather than human-facing READMEs, use [writing-for-agents](./writing-for-agents.md).

**ask-joao** routes across the whole set when you are unsure which skill the situation wants.
