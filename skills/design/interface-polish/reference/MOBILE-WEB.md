# Mobile Web

Mobile browsers have their own viewport physics, touch pipelines, keyboard behaviors, and hardware chrome. Apply these rules when building or reviewing mobile web UIs, touch interactions, and PWAs so they feel native rather than like a desktop page squeezed onto a phone.

## Symptom Table

| Symptom | Fix |
| --- | --- |
| Hover state stays stuck after tapping | Gate hover styles behind `@media (hover: hover) and (pointer: fine)` |
| Gray or blue flash on every tap | Set `-webkit-tap-highlight-color: transparent` and provide an explicit `:active` state |
| Full-height layout jumps or clips behind browser bars | Use `100dvh` for app shells and fixed layouts, `100svh` for stable above-the-fold heroes |
| iOS Safari zooms the page when focusing an input | Keep input `font-size` at `16px` (`1rem`) minimum; never use `user-scalable=no` or `maximum-scale=1`; set `inputmode` and `enterkeyhint` |
| Taps feel laggy or delayed | Style `:active` / `pointerdown` with `scale(0.96)` and add `touch-action: manipulation` |
| Dragging a sheet or modal triggers browser pull-to-refresh | Set `overscroll-behavior: none` on `html, body` and `overscroll-behavior: contain` on inner scroll containers |
| Fixed bars clip behind the notch or home indicator | Add `viewport-fit=cover` and pad with `env(safe-area-inset-*)` |
| Long-press on a button selects text or opens callout menu | Set `user-select: none` and `-webkit-touch-callout: none` on interactive controls only, never on `body` |
| Horizontal carousel hijacks vertical page scrolling (or vice versa) | Declare `touch-action: pan-y` on horizontal sliders (`pan-x` on vertical, `none` on 2D canvases) or use native `scroll-snap-type` |
| Status bar / browser chrome clashes with dark or light theme | Provide per-scheme `<meta name="theme-color" media="(prefers-color-scheme: ...)">` tags |
| Virtual keyboard covers fixed bottom inputs or action bars | Add `interactive-widget=resizes-content` to the viewport meta tag (or handle `visualViewport` on iOS) |
| Gestures feel fine in DevTools device mode but fail on a phone | Test on real hardware over USB / local IP with remote Web Inspector |

## Touch Feedback & Hover Gating

### Gate hover to devices that truly hover

Touch browsers emulate `:hover` on tap, leaving buttons and cards stuck in their hover state until the user taps somewhere else. Wrap all `:hover` visuals in `@media (hover: hover) and (pointer: fine)`:

```css
@media (hover: hover) and (pointer: fine) {
  .button:hover {
    background-color: var(--surface-hover);
  }
}
```

### Remove the default tap highlight and provide `:active` feedback

Mobile WebKit draws a translucent gray or blue box over tapped elements (`-webkit-tap-highlight-color`). Clear it on interactive controls and replace it with immediate `:active` feedback (`scale(0.96)` or a pressed background color), paired with `touch-action: manipulation` to eliminate double-tap zoom delay:

```css
button,
a,
[role="button"] {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition: transform 150ms ease-out, background-color 150ms ease-out;
}

button:active,
a:active,
[role="button"]:active {
  transform: scale(0.96);
}
```

For custom drag or gesture targets, trigger visual press feedback on `pointerdown` rather than waiting for `click`.

## Viewport Units (`dvh`, `svh`) & Keyboard Resizing

`100vh` on mobile equals the largest possible viewport (with browser address and tab bars retracted), so a `100vh` layout overflows beneath the visible screen on initial load.

- **`100dvh` (dynamic viewport height)**: updates as browser toolbars expand and collapse. Use for full-screen app shells, drawers, and fixed-bottom layouts, with `100vh` as an earlier fallback declaration.
- **`100svh` (small viewport height)**: locked to the viewport height with all browser bars expanded. Use for hero sections so layout never jumps as the user starts scrolling.

```css
.app-shell {
  min-height: 100vh;
  min-height: 100dvh;
}

.hero {
  min-height: 100vh;
  min-height: 100svh;
}
```

### Virtual keyboard (`interactive-widget`)

To make fixed bottom bars and chat inputs reflow cleanly when the on-screen keyboard opens, configure `interactive-widget=resizes-content` on the viewport meta tag:

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
/>
```

## Safe Areas & Notch Insets

On edge-to-edge screens (iPhone Dynamic Island / home indicator, Android gesture bar), pair `viewport-fit=cover` in `<meta name="viewport">` with `env(safe-area-inset-*)` on sticky headers, bottom tab bars, floating action buttons, and sheets:

```css
.bottom-bar {
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
}
```

**Tailwind:** `pb-[max(0.75rem,env(safe-area-inset-bottom))]`

## Inputs, Auto-Zoom & Virtual Keyboards

iOS Safari automatically zooms the viewport whenever the user focuses an `<input>`, `<select>`, or `<textarea>` with a computed `font-size` below `16px`, leaving the page zoomed in after blur.

- **Always keep form control `font-size` at `16px` (`1rem`) or larger** on mobile viewports (`text-base` on mobile, `sm:text-sm` on desktop if compact text is needed).
- **Never disable pinch-to-zoom** with `user-scalable=no` or `maximum-scale=1`. Blocking zoom is an accessibility failure and modern iOS ignores it anyway.
- **Set `inputmode` and `enterkeyhint`** so mobile keyboards display the right layout and return key label without changing the input's semantics:

```html
<!-- Numeric keypad for a verification code -->
<input
  type="text"
  inputmode="numeric"
  autocomplete="one-time-code"
  enterkeyhint="done"
/>

<!-- Search input with "Search" action key -->
<input type="search" inputmode="search" enterkeyhint="search" />

<!-- Email input with @ and . on the primary keyboard -->
<input type="email" inputmode="email" autocomplete="email" enterkeyhint="next" />
```

## Overscroll, Scroll Containment & Carousels

### Prevent pull-to-refresh and scroll chaining

Swiping down inside a modal, drawer, or fixed app shell can accidentally trigger the browser's pull-to-refresh or scroll the background document.

- Set `overscroll-behavior: none` on `html, body` in app-like shells where native pull-to-refresh is unwanted.
- Set `overscroll-behavior: contain` on scrollable modals, sheets, and sidebars so reaching the end of the inner scroll never chains into the page behind it.

```css
html,
body {
  overscroll-behavior: none;
}

.sheet-scroll-body {
  overflow-y: auto;
  overscroll-behavior: contain;
}
```

### Axis locking (`touch-action`) & native scroll snap

When building custom horizontal carousels or swipeable rows, tell the browser which axis belongs to native scrolling so vertical page scroll and horizontal drag do not fight:

- **Horizontal swipe / carousel**: `touch-action: pan-y` (browser handles vertical scroll; JS handles horizontal drag).
- **Vertical drawer / sheet**: `touch-action: pan-x` or `touch-action: none` on the drag handle.
- **2D canvas / map**: `touch-action: none`.
- **Prefer native CSS scroll snap** over JS carousel libraries whenever standard snapping suffices:

```css
.carousel {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}

.carousel-slide {
  scroll-snap-align: start;
  flex: 0 0 85%;
}
```

## Selection & Long-Press Callouts

Long-pressing an interactive control (a hold-to-delete button, drag handle, tab, or icon button) on iOS triggers text selection loupes or the link preview callout. Disable selection and callout on **controls only**:

```css
button,
[role="button"],
.drag-handle,
.tab {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
```

**Never apply `user-select: none` to `body` or content containers.** Users expect to copy text, prices, error messages, and titles.

## Status Bar & Theme Color

Match the mobile browser's status bar and address bar chrome to both light and dark themes with media-scoped `<meta name="theme-color">` tags:

```html
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#09090b" media="(prefers-color-scheme: dark)" />
```

## Real Hardware Testing

Desktop DevTools device emulation only resizes a viewport; it does not reproduce mobile WebKit's dynamic toolbar height, input auto-zoom, rubber-band overscroll, `touch-action` gesture arbitration, or GPU memory limits. Verify touch gestures, drawers, and keyboard resizing on a physical phone connected over local network / USB with Safari Web Inspector or Chrome Remote Debugging.
