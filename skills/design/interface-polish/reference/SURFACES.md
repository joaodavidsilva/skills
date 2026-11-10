# Surfaces

## Concentric Border Radius

When nesting rounded elements, the outer radius must equal the inner radius plus the padding between them:

```
outerRadius = innerRadius + padding
```

This rule is most useful when nested surfaces are close together. If padding is larger than `24px`, treat the layers as separate surfaces and choose each radius independently instead of forcing strict concentric math.

```css
.card {
  border-radius: 20px; /* 12 + 8 */
  padding: 8px;
}
.card-inner {
  border-radius: 12px;
}
```

**Tailwind:** `rounded-2xl p-2` around `rounded-lg` (16px outer, 8px padding, 8px inner).

## Shadows Instead of Borders

For **buttons, cards, and containers** that use a border for depth or elevation, prefer replacing it with a subtle `box-shadow`. Shadows adapt to any background since they use transparency; solid borders don't. This also helps when using images or multiple colors as backgrounds, because solid border colors don't work well on backgrounds other than the ones they were designed for.

Dividers (`border-b`, `border-t`, side borders) and any border whose purpose is layout separation rather than element depth stay as borders.

### Shadow as Border (Light Mode)

The shadow is comprised of three layers. The first acts as a 1px border ring, the second adds subtle lift, and the third provides ambient depth:

```css
:root {
  --shadow-border:
    0px 0px 0px 1px oklch(0 0 0 / 0.06),
    0px 1px 2px -1px oklch(0 0 0 / 0.06),
    0px 2px 4px 0px oklch(0 0 0 / 0.04);
  --shadow-border-hover:
    0px 0px 0px 1px oklch(0 0 0 / 0.08),
    0px 1px 2px -1px oklch(0 0 0 / 0.08),
    0px 2px 4px 0px oklch(0 0 0 / 0.06);
}
```

### Shadow as Border (Dark Mode)

In dark mode, simplify to a single white ring, because layered depth shadows aren't visible on dark backgrounds:

```css
/* Dark mode: adapt to whatever setup the project uses
   (prefers-color-scheme, class, data attribute, etc.) */
--shadow-border: 0 0 0 1px oklch(1 0 0 / 0.08);
--shadow-border-hover: 0 0 0 1px oklch(1 0 0 / 0.13);
```

### Usage with Hover Transition

```css
.card {
  box-shadow: var(--shadow-border);
  transition-property: box-shadow;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}

.card:hover {
  box-shadow: var(--shadow-border-hover);
}
```

### When to Use Shadows vs. Borders

| Use shadows | Use borders |
| --- | --- |
| Cards, containers with depth | Dividers between list items |
| Buttons with bordered styles | Table cell boundaries |
| Elevated elements (dropdowns, modals) | Form input outlines (for accessibility) |
| Elements on varied backgrounds | Hairline separators in dense UI |
| Hover/focus states for lift effect | |

## Image Outlines

Add a subtle `1px` outline with low opacity to images. This creates consistent depth, especially in design systems where other elements use borders or shadows.

The outline is a neutral separator, not a themed element:

- **Light mode**: pure black, `oklch(0 0 0 / 0.1)`.
- **Dark mode**: pure white, `oklch(1 0 0 / 0.1)`.
- A tinted outline (a palette near-black or near-white such as slate-900, `#0a0a0a`, `#f5f5f7`, or the accent color) picks up the surrounding surface color and reads as dirt on the image edge.

```css
img {
  outline: 1px solid oklch(0 0 0 / 0.1);
  outline-offset: -1px; /* inset so it doesn't add to layout */
}
/* Dark mode: same rule with oklch(1 0 0 / 0.1) */
```

**Tailwind:** `outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10`. Stay on `outline-black/10` and `outline-white/10`, not a tinted scale such as `outline-slate-*` or `outline-zinc-*`.

**Why outline instead of border?** `outline` doesn't affect layout (no added width/height), and `outline-offset: -1px` keeps it inset so images stay their intended size.

## Minimum Hit Area

Interactive elements should prefer a 44×44px hit area for touch or mobile contexts. In dense desktop interfaces, use at least 40×40px. If the visible element is smaller (e.g., a 20×20 checkbox), extend the hit area with a pseudo-element.

```css
/* Small checkbox with expanded 44px hit area */
.checkbox {
  position: relative;
  width: 20px;
  height: 20px;
}

.checkbox::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 44px;
  height: 44px;
}
```

**Tailwind:** `relative size-5 after:absolute after:top-1/2 after:left-1/2 after:size-11 after:-translate-1/2`

If the extended hit area overlaps another interactive element, shrink the pseudo-element until it fits, keeping it as large as possible.

## Hover, Pressed, and Focus

- Gate hover styles behind `@media (hover: hover) and (pointer: fine)`, so touch devices never stick in a hover state.
- Hover, pressed, and focus are three distinct looks. Pressed is stronger than hover (see Scale on Press in [ANIMATIONS.md](ANIMATIONS.md)).
- Hover changes color, background, shadow, or transform, which leaves layout untouched. A border-width change, or a font-weight change that widens the text, shifts neighbours.
- Keep a `:focus-visible` ring, offset from the element, as the focus style.
- Keep adjacent hoverable rows touching (no margin between them), so the pointer never crosses a gap that drops hover. For visual spacing, use padding inside the rows.
- Tooltips and menus open after a short delay on first hover and instantly once one is already open.
- On mobile, set `-webkit-tap-highlight-color: transparent` (it only has a visible effect on mobile browsers) and supply your own pressed state. Set `user-select: none` on controls and leave content selectable.

## Translucent Materials and Depth

Use translucent materials (`backdrop-filter`) for floating chrome such as toolbars, sticky headers, and sheets so content scrolls underneath without losing spatial context.

- **Surface recipe**: combine a semi-transparent background with `backdrop-filter: blur(20px) saturate(180%)` and a `1px` bright top edge (`border-top: 1px solid oklch(1 0 0 / 0.4)`) that catches light.
- **Material thickness and hierarchy**: darker or heavier materials separate structural regions (sidebars), while lighter materials highlight interactive controls. Larger surfaces use stronger blur and deeper shadow than small chips. Keep light translucent surfaces to a single layer, and never stack two light translucent surfaces on top of each other, which collapses legibility.
- **Dimming scrim vs. parallel offset**: pair blocking modals with a dimming scrim that pushes the background back; for parallel, non-blocking panels, use translucency and spatial offset without a scrim so the user's flow continues.
- **Vibrancy**: over blurred surfaces, maintain legibility with higher-contrast text, a slightly heavier font weight, and a small positive letter-spacing bump. Place saturated colors on solid layers rather than translucent foregrounds.
- **Scroll edge masks**: where scrolling content meets floating chrome, fade a subtle blur or gradient mask instead of drawing a hard `1px` border, applied only when content overlaps the floating bar.
- **Accessibility fallbacks**: provide `@media (prefers-reduced-transparency: reduce)` (solid or near-solid background, `backdrop-filter: none`) and `@media (prefers-contrast: more)` (high-contrast background and explicit border) fallbacks.

```css
.toolbar {
  background: oklch(1 0 0 / 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  border-top: 1px solid oklch(1 0 0 / 0.4);
}

@media (prefers-reduced-transparency: reduce) {
  .toolbar {
    background: oklch(1 0 0);
    backdrop-filter: none;
  }
}

@media (prefers-contrast: more) {
  .toolbar {
    background: oklch(1 0 0 / 0.95);
    border-top: 1px solid oklch(0 0 0 / 0.8);
  }
}
```
