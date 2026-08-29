# UI Prototype

Generate **several radically different UI variations** on a single route, switchable from a floating bottom bar. The user flips between variants in the browser, picks one (or steals bits from each), then throws the rest away.

If the question is about logic/state rather than what something looks like, this is the wrong branch. Use [LOGIC.md](LOGIC.md).

## When this is the right shape

- "What should this page look like?"
- "I want to see a few options for this dashboard before committing."
- "Try a different layout for the settings screen."
- Any time the user would otherwise spend a day picking between three vague mockups in their head.

## Three sub-shapes: strongly prefer sub-shape A

A UI prototype is much easier to judge when it's **butting up against the rest of the app**: real header, real sidebar, real data, real density. A throwaway route on its own is a vacuum: every variant looks fine in isolation. Default to sub-shape A whenever there's a plausible existing page to host the variants. Only reach for sub-shape B if the prototype genuinely has no nearby home, and sub-shape C when there is no existing project or dev server.

### Sub-shape A: adjustment to an existing page (preferred)

The route already exists. Variants are rendered **on the same route**, gated by a `?variant=` URL search param. The existing data fetching, params, and auth all stay. Only the rendering swaps. This is the default; pick it unless there's a specific reason not to.

If the prototype is for something that doesn't yet have a page but *would naturally live inside one* (a new section of the dashboard, a new card on the settings screen, a new step in an existing flow), it's still sub-shape A. Mount the variants inside the host page.

### Sub-shape B: a new page (when no host page exists)

Only use this when the thing being prototyped genuinely has no existing page to live inside (e.g. an entirely new top-level surface, or a flow that can't be embedded anywhere sensible).

Create a **throwaway route** following whatever routing convention the project already uses. Don't invent a new top-level structure. Name it so it's obviously a prototype (e.g. include the word `prototype` in the path or filename). Same `?variant=` pattern.

Before committing to sub-shape B, sanity-check: is there really no existing page this could be embedded in? An empty route hides design problems that a populated one would expose.

### Sub-shape C: standalone HTML file (when there is no project or dev server)

When there is no existing project or dev server (an empty directory, or the user is exploring a standalone piece of UI in a static context), build a **single self-contained HTML file** with inline CSS and JS that opens directly in a browser. Choose a restrained default look: neutral grays, one accent, system font stack. Render one variant at a time, full size, in realistic surrounding context (a toast needs a page behind it, a card needs siblings, a button needs a form; never side-by-side thumbnails).

In all three sub-shapes the floating picker is identical.

## Process

### 1. State the question and pick N

Default to **3 variants** (or up to 5 when the user asks, e.g. `<description> x5`, or the design space is genuinely wide). More than 5 stops being radically different and starts being noise, so cap there.

Write down the plan in one line, in the prototype's location or a top-of-file comment:

> "Three variants of the settings page (`Quiet`, `Editorial`, `Dense`), switchable via `?variant=`, on the existing `/settings` route."

This works whether the user is here to push back or not.

Done when the prototype question, variant count (N <= 5), named variants, and target route or file are written down in one line.

### 2. Choose directions and generate radically different variants

Before writing code, define **named divergence axes** for the set. Names describe the direction (`Quiet`, `Editorial`, `Playful`, `Dense`), never `VariantA`, `VariantB`, `VariantC` or `Option A/B/C`. Each variant must state its axis in a phrase (layout, density, personality, motion, interaction model), and **no two variants may share an axis position**.

Draft each variant. Hold each one to:

- The page's purpose and the data it has access to.
- The project's component library, tokens, and styling system (TailwindCSS, shadcn, MUI, plain CSS, whatever) so every variant looks like it could ship in this product tomorrow.
- **Realistic product-shaped copy and data**: actual domain-appropriate copy, plausible names and numbers, and real working interactions. Point any mutations at local state or a stub so the prototype stays safe to click through while focusing on what the UI looks like.
- **UI craft standards**: `ease-out` on entrances (never `ease-in`), sub-300ms UI motion, `transform` and `opacity` only, and `prefers-reduced-motion` handled. A sloppy variant loses on execution and teaches nothing about the direction it represents. If you need the full craft rules, call the Skill tool with "interface-polish".

Variants must be **structurally different**: different layout, different information hierarchy, different primary affordance, not just different colours or copy. Keep each variant's layout container independent (sharing leaf chrome like `<Header>` is fine, while each variant owns its own layout structure so it can rethink the page freely). If two drafts come out too similar, redo one with a distinct layout model.

Done when every variant has a distinct named divergence axis and is implemented with realistic copy, working stubbed interactions, an independent layout structure, and compliant UI motion.

### 3. Wire them together

Create a single switcher harness on the route (or in the standalone HTML file):

```tsx
// pseudo-code, adapt to the project's framework
const variant = searchParams.get('variant') ?? 'quiet';
return (
  <>
    {/* Key by variant + replay tick so switching or pressing R re-mounts and replays entrance animations */}
    <div key={`${variant}-${replayTick}`}>
      {variant === 'quiet' && <QuietVariant {...data} />}
      {variant === 'editorial' && <EditorialVariant {...data} />}
      {variant === 'dense' && <DenseVariant {...data} />}
    </div>
    <PrototypePicker
      variants={['Quiet', 'Editorial', 'Dense']}
      current={variant}
      onReplay={() => setReplayTick((t) => t + 1)}
    />
  </>
);
```

For sub-shape A (existing page): keep all the existing data fetching above the switcher; only the rendered subtree changes per variant.

For sub-shape B (new page): the throwaway route under `/prototype/<name>` mounts the same switcher.

For sub-shape C (standalone HTML): mount one variant at a time into the stage container using the reference wiring in [PICKER.md](PICKER.md).

Done when all variants mount inside the switcher harness keyed by variant and replay tick.

### 4. Build the floating switcher

Use the exact dark-glass pill markup, CSS, and wiring specified in [PICKER.md](PICKER.md). Its look is fixed chrome, not a design decision, so copy it verbatim rather than styling it with project tokens:

- **Dark-glass pill** fixed at bottom-centre of the screen (`data-position="top"` when a variant occupies bottom-centre, such as a toast stack, bottom sheet, or dock).
- **Sliding highlight** across variant buttons (named `Quiet`, `Editorial`, `Playful`, etc.), plus an optional `↻` replay button when at least one variant has motion to re-trigger. Switching between variants is instant (no transition on the stage itself) and re-mounts the variant so entrance animations run cleanly.
- **URL persistence**: updates the URL search param (`?variant=` or `?v=`) so the active variant is shareable and reload-stable.
- **Keyboard shortcuts**: number keys `1-N` and `←`/`→` arrow keys switch variants; `R` re-mounts the current variant to replay entrance animations. Ignore key events when focus is in an `<input>`, `<textarea>`, `<select>`, or `[contenteditable]`, or when a modifier key is held.
- **Hidden in production builds** (for in-app routes): gate on `process.env.NODE_ENV !== 'production'` or an equivalent check, so a stray prototype merge can't ship the bar to users.

Done when the dark-glass picker switches variants via click, URL param, and keyboard shortcuts (`1-N`, `←`/`→`, `R`) and is gated out of production builds.

### 5. Hand it over

Verify every variant renders, interactions respond, and the console is clean. Present the summary table comparing the tradeoffs honestly (never pre-pick a favourite unless asked), followed by the URL or file path and the keyboard shortcuts (`1-N`, `←`/`→`, `R`):

| # | Variant | Axis | When it's the right choice | Its cost |
| --- | --- | --- | --- | --- |
| 1 | Quiet | Minimal motion, borders over shadows | The product is a daily-use tool | Least memorable |
| 2 | Editorial | Large type, generous whitespace | The moment deserves weight | Eats vertical space |
| 3 | Dense | Compact rows, inline actions | High-volume scanning and triage | Steeper first-glance load |

The user will flip through and respond:

- **Pick or combine** (e.g. `keep Quiet`, or *"I want the header from Editorial with the table from Dense"*): proceed to step 6.
- **Riff on a direction** (`riff <variant>`): keep the harness and run another round of variants diverging around the chosen direction.

Done when every variant renders cleanly with zero console errors, the tradeoff comparison table and access instructions are presented to the user, and the user has selected or riffed on a direction.

### 6. Capture the answer and clean up

Once a variant has won, capture the answer (which variant and why), then capture the prototype the way the [SKILL](../SKILL.md) describes. Rewrite the winning direction to production standards (full error handling and tests) when folding it into the real code, and move the prototype variants and switcher onto the throwaway branch rather than main:

- **Sub-shape A**: fold the production-ready winner into the existing page; drop the losing variants and the switcher from main.
- **Sub-shape B**: promote the winning variant to a real route; drop the throwaway route and the switcher from main.
- **Sub-shape C**: fold the validated UI into the target component (or commit the standalone HTML to the throwaway `prototype/<name>` branch if there is no app yet).

The full set of variants is the primary source, so it lands on the throwaway branch, not the bin, since variant components and the switcher left in the main branch rot fast and confuse the next reader.

Done when the winning direction is rewritten cleanly into the target codebase, the prototype variants and switcher are removed from main, and the full prototype is preserved on its throwaway branch.