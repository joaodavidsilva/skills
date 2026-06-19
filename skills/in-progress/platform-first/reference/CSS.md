# CSS and HTML platform features

Tiers are Baseline: **Widely**, **Newly**, **Limited** (Limited: some core browser lacks it). Status was verified 2026-10 against the web-features data. Tiers move over time (Newly becomes Widely, Limited becomes Newly), so re-check a feature on MDN or web.dev before relying on a row, then compare it with the project target recorded in `SKILL.md` step 1.

A "no Firefox" or "no Safari" note names a gap found in that verification. Use a Limited feature only as progressive enhancement: the unenhanced result stays complete and usable.

## Overlays and interaction

| Need | JS agents wrongly write | Platform feature | Baseline note | Fallback |
|---|---|---|---|---|
| Modal with focus trap | div, focus-trap lib, `aria-modal`, scroll lock | `<dialog>` with `showModal()` (top layer, inert background, Esc, `::backdrop`) | Widely | None needed |
| Menu, tooltip, toast, listbox | open-state flag, click-outside and Esc listeners, z-index portal | `popover` attribute with `popovertarget` | Newly. `popover="hint"` is Limited (no Safari): use `popover="auto"` | Target older than Newly: keep JS. `popover` is not modal and implies no ARIA role: use `<dialog>` for modal |
| Button that opens or closes a dialog or popover | `onclick` whose only job is `showModal()` or `togglePopover()` | `command` and `commandfor` on `<button>` (invoker commands) | Newly | Target older than Newly: keep the JS handler |
| Click outside closes a dialog | backdrop click listener | `<dialog closedby>` | Limited (no Safari) | Keep the click-outside handler where light-dismiss matters |
| Tooltip or menu placed next to its trigger | Popper.js, Floating UI, `getBoundingClientRect`, resize and scroll listeners | Anchor positioning: `anchor-name`, `position-anchor`, `position-area`, `@position-try` | Core is Newly. The webstatus roll-up reads Limited because of sub-features (`position-visibility`, anchor with animations or transforms, anchor-position container queries) | Guard sub-features with `@supports`; keep the default placement valid without anchors |
| Disable a region | `aria-hidden`, `tabindex="-1"`, manual focus trap | `inert` attribute | Widely | None needed |
| Exclusive accordion | click handler that closes siblings | `<details name="group">`, `::details-content` | Newly | Without support every item can open: acceptable |
| Animate disclosure height to `auto` | measure `scrollHeight`, animate px, then set `auto` | `interpolate-size: allow-keywords` or `calc-size()` | Limited (Chrome only) | Instant open and close; add no JS fallback |
| Style an open state | JS-set `.is-open` class | `:open` pseudo-class | Newly | Target older than Newly: keep the JS class |
| Customize a `<select>` | Select2, Choices.js, listbox divs | `appearance: base-select` | Limited (no Firefox, flag only) | Guard with `@supports (appearance: base-select)`; the native select stays functional |
| Show validation only after interaction | `touched` state, blur listeners | `:user-invalid`, `:user-valid` | Widely | None needed |
| Auto-growing textarea or input | `input` listener setting `style.height` from `scrollHeight` | `field-sizing: content` | Newly | Fixed size; set `min-height` or `rows` |

## Selectors, cascade, and structure

| Need | JS agents wrongly write | Platform feature | Baseline note | Fallback |
|---|---|---|---|---|
| Style a parent by its child's state | `closest()` and `classList.toggle` | `:has()` | Widely | None needed |
| Component-level responsive layout | `ResizeObserver` or `matchMedia` toggling classes | `@container` with `container-type: inline-size` | Widely. Style queries on custom properties are Newly. Scroll-state queries are Limited (Chrome only) | None for size queries |
| Nested rules | Sass, Less, PostCSS build step | Native nesting with `&` | Widely | None needed |
| Specificity control | `!important`, deep selectors, BEM, CSS-in-JS ordering | `@layer` (layer order is the API). `@scope` for proximity scoping | `@layer` Widely. `@scope` Newly | Unlayered styles always beat layered ones: layer everything or nothing |
| Equal-height and aligned card internals | JS height measuring, magic `min-height` | `subgrid` (`grid-template-columns: subgrid`) | Widely | None needed |
| Intrinsic ratio box | `padding-top: 56.25%` hack, resize handlers | `aspect-ratio` | Widely | None needed |
| Mobile viewport height | `window.innerHeight` written to `--vh` | `dvh`, `svh`, `lvh` units | Widely | `vh` as the earlier declaration |
| Media queries by width | `(min-width: ...)` | Range syntax `(width >= ...)` | Widely | None needed |
| Lazy-load images and iframes | IntersectionObserver scripts | `loading="lazy"` | Widely | Keep the LCP image eager; use `fetchpriority="high"` there |
| Skip rendering offscreen sections | IntersectionObserver mounting | `content-visibility: auto` with `contain-intrinsic-size` | Newly | Pure optimization. It is not list virtualization, and it needs `contain-intrinsic-size` to avoid scrollbar jumps |

## Color, type, and theming

| Need | JS agents wrongly write | Platform feature | Baseline note | Fallback |
|---|---|---|---|---|
| Light and dark theme | JS class toggle, duplicated palettes, double `prefers-color-scheme` blocks | `color-scheme: light dark` with `light-dark()` | Newly. `light-dark()` does nothing without `color-scheme: light dark` on an ancestor | Plain declaration before the `light-dark()` one |
| Tints, shades, contrast colors | Sass `lighten()`, chroma.js, tinycolor | `color-mix()`, relative color syntax, `contrast-color()` | `color-mix()` Widely. Relative colors and `contrast-color()` Newly. Variadic `color-mix()` (3+ colors) lacks Chrome | Nest two-color mixes; static declaration above `contrast-color()` |
| Balanced headings | balance-text.js, manual `<br>`, guessed `max-width` | `text-wrap: balance` | Newly | Pure enhancement |
| No orphans in paragraphs | `&nbsp;` and JS fixes | `text-wrap: pretty` | Limited (no Firefox) | Pure enhancement |
| Staggered animation by index | JS that stamps `--i` and `--n` | `sibling-index()`, `sibling-count()` | Newly | Set `--i` in markup |

## Motion

| Need | JS agents wrongly write | Platform feature | Baseline note | Fallback |
|---|---|---|---|---|
| Enter and exit animation, including `display: none` | `requestAnimationFrame`, class toggles, `transitionend` and timers | `@starting-style` with `transition-behavior: allow-discrete` on the `transition` | Newly. Enter needs `@starting-style`; `display` and `overlay` need `allow-discrete` | Element appears and disappears without animation |
| Reduced motion | `matchMedia("(prefers-reduced-motion: reduce)")` in JS | `@media (prefers-reduced-motion: reduce)` in the stylesheet | Not in the verified data: check the tier on MDN or web.dev | Put the reduced rules next to the motion rules |
| Animate between UI states | FLIP libraries, manual clone-and-animate | Same-document view transitions: `document.startViewTransition`, `view-transition-name` | Newly | `if (!document.startViewTransition) update()` |
| Animate page navigation in a multi-page site | Client-side router added only for animation | `@view-transition { navigation: auto; }` | Limited (no Firefox) | Ignored where unsupported; the navigation still works |
| Scroll-linked effects (progress bar, parallax, reveal) | Scroll listener with `requestAnimationFrame`, IntersectionObserver | `animation-timeline: scroll()` or `view()` with `animation-range` | Limited (no Firefox) | Wrap in `@supports (animation-timeline: scroll())`; the unanimated state must be complete. Where Firefox users need the effect, keep the observer |
| Basic carousel or slider | Swiper-class library for snapping | `scroll-snap-type`, `scroll-snap-align` | Widely | None needed |

## Single-engine features

These were Limited in the verified data and shipped unflagged in one engine only (Chrome, except where noted). Do not use them where the result is not fully usable without them: `if()`, `@function`, `corner-shape`, `interpolate-size` (see Overlays), CSS carousel pseudo-elements (`::scroll-marker`, `::scroll-button()`), container scroll-state queries, interest invokers (`interestfor`), `reading-flow`, `animation-trigger`, Speculation Rules. `grid-lanes` and `random()` are Safari-only. Keep `-webkit-line-clamp`: standard `line-clamp` ships unflagged in no engine.
