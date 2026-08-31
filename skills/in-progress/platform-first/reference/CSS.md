# CSS and HTML platform features

Tiers are Baseline: **Widely**, **Newly**, **Limited** (Limited: some core browser lacks it). Tiers move over time (Newly becomes Widely, Limited becomes Newly), so re-check a feature on MDN or web.dev before relying on a row, then compare it with the project target recorded in `SKILL.md` step 1.

A "no Firefox" or "no Safari" note names the missing engine. Use a Limited feature only as progressive enhancement: the unenhanced result stays complete and usable.

## Overlays and interaction

| Need | Platform feature | Baseline note | Fallback |
|---|---|---|---|
| Modal with focus trap | `<dialog>` with `showModal()` (top layer, inert background, Esc, `::backdrop`) | Widely | None needed |
| Menu, tooltip, toast, listbox | `popover` attribute with `popovertarget` | Newly. `popover="hint"` is Limited (no Safari): use `popover="auto"` | Target older than Newly: keep JS. `popover` is not modal and implies no ARIA role: use `<dialog>` for modal |
| Button that opens or closes a dialog or popover | `command` and `commandfor` on `<button>` (invoker commands) | Newly | Target older than Newly: keep the JS handler |
| Click outside closes a dialog | `<dialog closedby>` | Limited (no Safari) | Keep the click-outside handler where light-dismiss matters |
| Tooltip or menu placed next to its trigger | Anchor positioning: `anchor-name`, `position-anchor`, `position-area`, `@position-try` | Core is Newly. The webstatus roll-up reads Limited because of sub-features (`position-visibility`, anchor with animations or transforms, anchor-position container queries) | Guard sub-features with `@supports`; keep the default placement valid without anchors |
| Disable a region | `inert` attribute | Widely | None needed |
| Exclusive accordion | `<details name="group">`, `::details-content` | Newly | Without support every item can open: acceptable |
| Animate disclosure height to `auto` | `interpolate-size: allow-keywords` or `calc-size()` | Limited (Chrome only) | Instant open and close; add no JS fallback |
| Style an open state | `:open` pseudo-class | Newly | Target older than Newly: keep the JS class |
| Customize a `<select>` | `appearance: base-select` | Limited (no Firefox, flag only) | Guard with `@supports (appearance: base-select)`; the native select stays functional |
| Show validation only after interaction | `:user-invalid`, `:user-valid` | Widely | None needed |
| Auto-growing textarea or input | `field-sizing: content` | Newly | Fixed size; set `min-height` or `rows` |

## Selectors, cascade, and structure

| Need | Platform feature | Baseline note | Fallback |
|---|---|---|---|
| Style a parent by its child's state | `:has()` | Widely | None needed |
| Component-level responsive layout | `@container` with `container-type: inline-size` | Widely. Style queries on custom properties are Newly. Scroll-state queries are Limited (Chrome only) | None for size queries |
| Nested rules | Native nesting with `&` | Widely | None needed |
| Specificity control | `@layer` (layer order is the API). `@scope` for proximity scoping | `@layer` Widely. `@scope` Newly | Unlayered styles always beat layered ones: layer everything or nothing |
| Equal-height and aligned card internals | `subgrid` (`grid-template-columns: subgrid`) | Widely | None needed |
| Intrinsic ratio box | `aspect-ratio` | Widely | None needed |
| Mobile viewport height | `dvh`, `svh`, `lvh` units | Widely | `vh` as the earlier declaration |
| Media queries by width | Range syntax `(width >= ...)` | Widely | None needed |
| Lazy-load images and iframes | `loading="lazy"` | Widely | Keep the LCP image eager; use `fetchpriority="high"` there |
| Skip rendering offscreen sections | `content-visibility: auto` with `contain-intrinsic-size` | Newly | Pure optimization. It is not list virtualization, and it needs `contain-intrinsic-size` to avoid scrollbar jumps |

## Color, type, and theming

| Need | Platform feature | Baseline note | Fallback |
|---|---|---|---|
| Light and dark theme | `color-scheme: light dark` with `light-dark()` | Newly. `light-dark()` does nothing without `color-scheme: light dark` on an ancestor | Plain declaration before the `light-dark()` one |
| Tints, shades, contrast colors | `color-mix()`, relative color syntax, `contrast-color()` | `color-mix()` Widely. Relative colors and `contrast-color()` Newly. Variadic `color-mix()` (3+ colors) lacks Chrome | Nest two-color mixes; static declaration above `contrast-color()` |
| Balanced headings | `text-wrap: balance` | Newly | Pure enhancement |
| No orphans in paragraphs | `text-wrap: pretty` | Limited (no Firefox) | Pure enhancement |
| Staggered animation by index | `sibling-index()`, `sibling-count()` | Newly | Set `--i` in markup |

## Motion

| Need | Platform feature | Baseline note | Fallback |
|---|---|---|---|
| Enter and exit animation, including `display: none` | `@starting-style` with `transition-behavior: allow-discrete` on the `transition` | Newly. Enter needs `@starting-style`; `display` and `overlay` need `allow-discrete` | Element appears and disappears without animation |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` in the stylesheet | Widely | None needed |
| Animate between UI states | Same-document view transitions: `document.startViewTransition`, `view-transition-name` | Newly | `if (!document.startViewTransition) update()` |
| Animate page navigation in a multi-page site | `@view-transition { navigation: auto; }` | Limited (no Firefox) | Ignored where unsupported; the navigation still works |
| Scroll-linked effects (progress bar, parallax, reveal) | `animation-timeline: scroll()` or `view()` with `animation-range` | Limited (no Firefox) | Wrap in `@supports (animation-timeline: scroll())`; the unanimated state must be complete. Where Firefox users need the effect, keep the observer |
| Basic carousel or slider | `scroll-snap-type`, `scroll-snap-align` | Widely | None needed |

## Single-engine features

These are Limited and ship unflagged in one engine only (Chrome, except where noted). Use them only where the result stays fully usable without them: `if()`, `@function`, `corner-shape`, `interpolate-size` (see Overlays), CSS carousel pseudo-elements (`::scroll-marker`, `::scroll-button()`), container scroll-state queries, interest invokers (`interestfor`), `reading-flow`, `animation-trigger`, Speculation Rules. `grid-lanes` and `random()` are Safari-only. Keep `-webkit-line-clamp`: standard `line-clamp` ships unflagged in no engine.
