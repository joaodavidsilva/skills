---
name: platform-first
description: "Platform-first: when writing browser styles, layout, animation or UI behaviour (dialogs, popovers, scroll, hover, forms), use CSS and HTML before JS or a library. Also when choosing JS syntax and built-in APIs, so code uses current built-ins over outdated habits."
---

**Platform-first**: the web platform (CSS, HTML, built-in JS) already does most of what agents reach for a script or a library to do. Training data is full of legacy patterns, so the first idea is often the outdated one. Pick the laziest fix that works.

## Process

### 1. Read the target

Read the project's browser target before choosing any feature: `browserslist` (or a `baseline widely available on <date>` query), `package.json` `engines`, `tsconfig` `target` and `lib`, framework and bundler config (for example Vite `build.target`). Server code (Node, Deno, Bun) follows `engines`, because Baseline covers browsers only.

Done when the target is recorded: one line naming the source and its value. No target found: record "none, assume Baseline Widely".

### 2. Climb the laziest-fix ladder

Take the first rung that solves the problem:

1. Existing repo helper
2. Standard library
3. Native platform feature (CSS, HTML, built-in JS)
4. Already-installed dependency
5. One line
6. New code

Done when you name the rung and why each rung above it does not fit.

### 3. Find the platform feature

Open the reference file for the branch you are on:

- Styles, layout, animation, UI behaviour (dialogs, popovers, scroll, hover, forms): [reference/CSS.md](reference/CSS.md)
- JS syntax and built-in APIs, dependencies, lint rules: [reference/JS.md](reference/JS.md)

Done when the need matches a table row, or you record "no row" and move to the next ladder rung.

### 4. Check availability against the target

A reference row gives a tier: Widely, Newly, or Limited. Tiers move, so when a row is stale or unsure, verify the feature on MDN or web.dev (Baseline badge, per-browser support) before writing code.

- Available in the target: use it, no polyfill.
- Not available in the target: ship it as progressive enhancement (`@supports`, feature detection, the row's fallback) where the unenhanced result is complete. Where it is not complete, keep the existing approach.

Done when each used feature has a tier recorded against the target, plus a fallback for every feature outside it.

### 5. Run the repo's checks

Run the repo's lint and type-check. When it has use-baseline rules (see `reference/JS.md`), run them on the changed files.

Done when the checks pass and no new dependency was added for something a table row covers.
