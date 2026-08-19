---
name: interface-polish
description: "UI and animation polish: apply or review the details of animation (easing, duration, springs, origin-aware popovers, gestures), typography, surfaces (radius, shadows, translucency), icons, hover and press states, hit areas, performance, and mobile web viewport/touch ergonomics."
---

# Details that make interfaces feel better

Great interfaces rarely come from a single thing. It's usually a collection of small details that compound into a great experience. Apply these principles when building or reviewing UI code. Before suggesting or writing a fix, identify the project's existing styling system and express the change in that system: Tailwind in a Tailwind project, plain CSS in a CSS project, or the established CSS-in-JS approach.

When reviewing, slow the interface down: replay motion at 10% speed in the browser's Animations panel and walk every state: hover, focus, active, loading, empty. What feels off at 10% speed is what's subtly wrong at full speed.

## Quick Reference

| Category | When to Use |
| --- | --- |
| [Typography](reference/TYPOGRAPHY.md) | Text wrapping, font smoothing, tabular numbers, optical sizing, tracking, and leading |
| [Surfaces](reference/SURFACES.md) | Border radius, shadows, translucent materials and depth, image outlines, hit areas, hover and focus states |
| [Animations](reference/ANIMATIONS.md) | Easing curves, `<300ms` duration budgets, springs, origin-aware popovers, `scale(0.95)` entry, interruptible transitions, gestures, `clip-path`, motion restraint |
| [Icons and alignment](reference/ICONS-AND-ALIGNMENT.md) | Optical alignment, icon stroke weight, states via `currentColor`, outline vs fill, sizing, RTL flipping |
| [Performance](reference/PERFORMANCE.md) | Compositor properties (`transform`/`opacity`), off-main-thread motion, CSS variable inheritance, transition specificity, `will-change` |
| [Mobile web](reference/MOBILE-WEB.md) | Mobile web, touch, PWAs, viewport (`dvh`/`svh`), safe areas, input zoom, overscroll, `touch-action` |
| [React](reference/REACT.md) | The project uses React |
| [Angular](reference/ANGULAR.md) | The project uses Angular |
| [React Native](reference/REACT-NATIVE.md) | The project uses React Native |
| [Review](reference/REVIEW.md) | Reviewing UI rather than building it |

## Core Principles

### 1. Concentric Border Radius

Outer radius = inner radius + padding. Mismatched radii on nested elements is the most common thing that makes interfaces feel off.

### 2. Optical Over Geometric Alignment

When geometric centering looks off, align optically by adjusting padding or fixing the SVG directly. Buttons with icons, play triangles, and asymmetric icons all need manual adjustment.

### 3. Shadows for Elevation, Borders for Structure

For buttons, cards, and containers whose border exists only to create depth, prefer layered transparent `box-shadow` values. Keep borders that communicate structure or state: dividers, layout separators, and selected or focus states.

### 4. Interruptible Animations

Use CSS transitions for interactive state changes, because they can be interrupted mid-animation. Reserve keyframes for staged sequences that run once.

### 5. Split and Stagger Enter Animations

For an infrequent staged entrance where sequence helps communicate hierarchy, break content into semantic chunks (`~100ms` delay) or individual list and grid items (`30-80ms` delay) instead of animating one container. Do not stagger routine, high-frequency interactions.

### 6. Subtle Exit Animations

Use a small fixed `translateY` instead of full height. Exits are softer and faster than enters. Keep UI animations under 300ms (`150-250ms` for dropdowns and popovers) using strong custom `ease-out` curves (`cubic-bezier(0.23, 1, 0.32, 1)`), and never use `ease-in` on UI. Never animate from `scale(0)`: start entrances from `scale(0.95)` with `opacity: 0`. Scale trigger-anchored popovers, dropdowns, and tooltips from their trigger (`transform-origin: var(--transform-origin)`), while keeping modals centered.

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

Press scale is `0.96` over `150ms` `ease-out`: a subtle shrink that gives buttons tactile feedback.

### 13. Skip Animation on Page Load

Skip enter animations on first render. Verify this does not break intentional entrance animations.

### 14. List the Exact Transition Properties

Always specify exact properties (`transition-property: scale, opacity`) instead of `transition: all`. Tailwind's `transition-transform` covers `transform, translate, scale, rotate`.

### 15. Use `will-change` Sparingly

`will-change` takes `transform`, `opacity`, or `filter`, the properties the GPU can composite, added once first-frame stutter shows.

### 16. Minimum Hit Area

Interactive elements should prefer a 44×44px hit area for touch or mobile contexts. In dense desktop interfaces, use at least 40×40px. Extend with a pseudo-element if the visible element is smaller. Keep hit areas of neighbouring elements apart.

### 17. Match Icon Stroke to Text Weight

An icon next to text carries the text's optical weight: `1.5px` stroke beside regular (400) text, `2px` beside semibold (600). One stroke weight and one icon library per surface.

### 18. One SVG, Recolored per State

Icons use `currentColor` and get their states (hover, selected, disabled) from CSS color and opacity on one SVG. Outline variant is the default; fill variant marks the active state.

### 19. Motion Restraint

Use instant feedback or a `<= 150ms` opacity/color transition on repeated hover or keystroke interactions; avoid custom entrance animations on high-frequency interactions where the attention cost repeats on every trigger. Every animated state change also carries a static cue such as color, icon, or label.

### 20. Gated Hover, Distinct States

Wrap hover styles in `@media (hover: hover) and (pointer: fine)` so hover never sticks on touch. Hover, pressed, and focus are three distinct looks, and hover changes color, background, shadow, or transform while layout stays put (avoid changing border width or font weight on hover, which shifts neighbouring elements).

### 21. Mobile Web Viewport and Touch Ergonomics

Use `100dvh` for app shells and `100svh` for heroes, pad edge-to-edge chrome with `env(safe-area-inset-*)`, keep mobile form inputs at `16px` minimum to prevent iOS auto-zoom (never disable pinch-zoom), set `overscroll-behavior: contain` on inner scrollables, and clear `-webkit-tap-highlight-color` in favor of `:active` press feedback and `touch-action: manipulation`.

## Done

When building, done when every principle has been checked against every element you changed.

## Review Output Format

To review UI, read [reference/REVIEW.md](reference/REVIEW.md). Pass the mode in the request: `/interface-polish quick` or `/interface-polish full`.
