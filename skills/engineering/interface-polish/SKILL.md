---
name: interface-polish
description: "Use when building or reviewing UI components, or when an interface \"feels off\": the details of animation, typography, icons, hover states, shadows, border radius, alignment, and hit areas."
---

# Details that make interfaces feel better

Great interfaces rarely come from a single thing. It's usually a collection of small details that compound into a great experience. Apply these principles when building or reviewing UI code. Before suggesting or writing a fix, identify the project's existing styling system and express the change in that system: Tailwind in a Tailwind project, plain CSS in a CSS project, or the established CSS-in-JS approach.

When reviewing, slow the interface down: replay motion at 10% speed in the browser's Animations panel and walk every state: hover, focus, active, loading, empty. What feels off at 10% speed is what's subtly wrong at full speed.

## Quick Reference

| Category | When to Use |
| --- | --- |
| [Typography](reference/TYPOGRAPHY.md) | Text wrapping, font smoothing, tabular numbers |
| [Surfaces](reference/SURFACES.md) | Border radius, shadows, image outlines, hit areas, hover and focus states |
| [Animations](reference/ANIMATIONS.md) | Interruptible animations, enter/exit transitions, icon animations, scale on press, motion restraint |
| [Icons and alignment](reference/ICONS-AND-ALIGNMENT.md) | Optical alignment, icon stroke weight, states via `currentColor`, outline vs fill, sizing, RTL flipping |
| [Performance](reference/PERFORMANCE.md) | Transition specificity, `will-change` usage |
| [React](reference/REACT.md) | The project uses React |
| [Angular](reference/ANGULAR.md) | The project uses Angular |
| [React Native](reference/REACT-NATIVE.md) | The project uses React Native |
| [Review](reference/REVIEW.md) | Reviewing UI rather than building it |

## Core Principles

### 1. Concentric Border Radius

Outer radius = inner radius + padding. Mismatched radii on nested elements is the most common thing that makes interfaces feel off.

### 2. Optical Over Geometric Alignment

When geometric centering looks off, align optically. Buttons with icons, play triangles, and asymmetric icons all need manual adjustment.

### 3. Shadows for Elevation, Borders for Structure

For buttons, cards, and containers whose border exists only to create depth, prefer layered transparent `box-shadow` values. Keep borders that communicate structure or state: dividers, layout separators, and selected or focus states.

### 4. Interruptible Animations

Use CSS transitions for interactive state changes, because they can be interrupted mid-animation. Reserve keyframes for staged sequences that run once.

### 5. Split and Stagger Enter Animations

For an infrequent staged entrance where sequence helps communicate hierarchy, break content into semantic chunks and stagger them by ~100ms instead of animating one container. Do not stagger routine, high-frequency interactions.

### 6. Subtle Exit Animations

Use a small fixed `translateY` instead of full height. Exits should be softer than enters. Use `ease-out` for both enter and exit transitions.

### 7. Contextual Icon Animations

Animate icons with `opacity`, `scale`, and `blur` instead of toggling visibility. Use exactly these values: scale from `0.25` to `1`, opacity from `0` to `1`, blur from `4px` to `0px`, with no bounce. Keep both icons in the DOM (one absolute-positioned) and cross-fade with transitions using `cubic-bezier(0.2, 0, 0, 1)`, which gives both enter and exit animations without any dependency.

### 8. Font Smoothing

Apply `-webkit-font-smoothing: antialiased` to the root layout on macOS for crisper text.

### 9. Tabular Numbers

Use `font-variant-numeric: tabular-nums` for any dynamically updating numbers to prevent layout shift.

### 10. Text Wrapping

Use `text-wrap: balance` on headings. Use `text-wrap: pretty` for body text to avoid orphans.

### 11. Image Outlines

Add a subtle `1px` outline with low opacity to images for consistent depth. The color must be pure black in light mode (`oklch(0 0 0 / 0.1)`) and pure white in dark mode (`oklch(1 0 0 / 0.1)`), so the outline stays neutral. A tinted outline picks up the surface color underneath it and reads as dirt on the image edge.

### 12. Scale on Press

Press scale is `0.96`: a subtle shrink that gives buttons tactile feedback.

### 13. Skip Animation on Page Load

Skip enter animations on first render. Verify this does not break intentional entrance animations.

### 14. List the Exact Transition Properties

Always specify exact properties: `transition-property: scale, opacity`. Tailwind's `transition-transform` covers `transform, translate, scale, rotate`.

### 15. Use `will-change` Sparingly

`will-change` takes `transform`, `opacity`, or `filter`, the properties the GPU can composite, added once first-frame stutter shows.

### 16. Minimum Hit Area

Interactive elements should prefer a 44×44px hit area for touch or mobile contexts. In dense desktop interfaces, use at least 40×40px. Extend with a pseudo-element if the visible element is smaller. Keep hit areas of neighbouring elements apart.

### 17. Match Icon Stroke to Text Weight

An icon next to text carries the text's optical weight: `1.5px` stroke beside regular (400) text, `2px` beside semibold (600). One stroke weight and one icon library per surface.

### 18. One SVG, Recolored per State

Icons use `currentColor` and get their states (hover, selected, disabled) from CSS color and opacity on one SVG. Outline variant is the default; fill variant marks the active state.

### 19. Motion Restraint

No custom animation on high-frequency interactions: the attention cost repeats on every trigger. Every animated state change also carries a static cue such as color, icon, or label.

### 20. Gated Hover, Distinct States

Wrap hover styles in `@media (hover: hover) and (pointer: fine)`. Hover, pressed, and focus are three distinct looks, and hover changes color, background, shadow, or transform while layout stays put.

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| Same border radius on parent and child | Calculate `outerRadius = innerRadius + padding` |
| Icons look off-center | Adjust optically with padding or fix SVG directly |
| Border used only to fake elevation | Use layered `box-shadow` with transparency; keep structural and state borders |
| Jarring staged entrance or contextual exit | Stagger infrequent entrances and keep context-preserving exits subtle |
| Numbers cause layout shift | Apply `tabular-nums` |
| Heavy text on macOS | Apply `antialiased` to root |
| Animation plays on page load | Skip the enter animation on first render |
| `transition: all` on elements | Specify exact properties |
| First-frame animation stutter | Add `will-change: transform` (sparingly) |
| Tiny hit areas on small controls | Extend with a pseudo-element to 44×44px for touch/mobile, or at least 40×40px in dense desktop UI |
| Hairline icon beside bold text | Match the stroke width to the text weight |
| Separate icon assets per state | One `currentColor` SVG, states via CSS |
| Filled icons everywhere | Outline as default, fill only for the active state |
| Hover style sticks on touch | Gate behind `(hover: hover) and (pointer: fine)` |
| Hover shifts neighbouring elements | Change shadow, color, or transform instead of border width or font weight |
| Entrance animation on every hover or keystroke | Instant feedback or ≤150ms opacity/color transition |

## Done

When building, done when every principle has been checked against every element you changed.

## Review Output Format

To review UI, read [reference/REVIEW.md](reference/REVIEW.md). Pass the mode in the request: `/interface-polish quick` or `/interface-polish full`.
