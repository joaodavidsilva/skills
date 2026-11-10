# Plan Template

Every plan written by `improve-animations` follows this structure. The executor may be a less capable model with zero context: inline every file path, excerpt, curve, duration, and spring config directly in the plan so it stands completely on its own.

```markdown
# NNN: <Short imperative title>

- **Status**: TODO
- **Commit**: <output of `git rev-parse --short HEAD` when this plan was written>
- **Severity**: HIGH | MEDIUM | LOW
- **Category**: <audit category>
- **Estimated scope**: <n files, rough size>

## Problem

What is wrong, where, and why it matters to how the product feels. Cite every
location as `path/to/file.tsx:123` and include the current code verbatim:

​```css
/* src/components/dropdown.css:14 (current) */
.dropdown { transition: all 400ms ease-in; }
​```

## Target

The exact end state. Spell out every value explicitly: curves, durations,
spring configs, and media queries:

​```css
/* target */
.dropdown {
  transition: transform 200ms var(--ease-out), opacity 200ms var(--ease-out);
  transform-origin: var(--transform-origin);
}
​```

## Repo conventions to follow

How this codebase already does it, with one exemplar the executor should
imitate (token names, file placement, prop patterns):

- Easing tokens live in `src/styles/tokens.css`; add new curves there, e.g. `--ease-out: cubic-bezier(0.23, 1, 0.32, 1);`
- <exemplar file:line that already does this correctly>

## Steps

1. <One concrete edit per step: file, what changes, resulting code.>
2. …

## Scope boundaries

- Edit only `<exact files/components in scope>`; leave all other files untouched.
- Restrict changes to motion properties (transitions, animations, transforms, opacity, tokens) and preserve existing markup and structure unless a step explicitly specifies a structural change.
- Use existing project dependencies only.
- If source code has drifted since the commit stamp and no longer matches a step's excerpt, stop and report the mismatch.

## Verification

- **Mechanical**: <exact commands (typecheck, lint, build) with expected outcome>.
- **Feel check**: run the UI, trigger <interaction>, and confirm:
  - <observable check, e.g. "the dropdown scales from its trigger, not from center">
  - <e.g. "spamming the toggle never restarts the animation from zero">
  - In DevTools, set playback to 10% (Animations panel) and confirm <detail>.
  - Toggle `prefers-reduced-motion` (Rendering panel) and confirm movement is dropped but opacity feedback remains.
- **Done when**: <machine- or eye-checkable completion criteria>.
```

## Notes for the plan author

- One plan per finding. If two findings share every file and the same fix pattern (e.g. the same easing token swap across components), they may merge into one plan.
- Call the Skill tool with `"interface-polish"` and pull every value directly from its `reference/ANIMATIONS.md` and `reference/PERFORMANCE.md`.
- Include the feel check in every plan. Motion can be mechanically valid and still feel wrong; give the executor (or reviewer) concrete checks to watch in slow motion.
- After writing plans, create or update `plans/README.md` with: a table of plans (number, title, severity, status), the recommended execution order, and any dependencies between plans.
