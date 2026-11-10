# Performance

## Symptom Table

| Problem | Solution |
| --- | --- |
| Animation stutters | Animate `transform` and `opacity` instead of `width`, `height`, `top`, or `margin` |
| Shadow animation is choppy | Use `filter: drop-shadow()` instead of animating `box-shadow` |
| Jank only during navigation or loading | Move the animation to CSS or WAAPI so it runs off the main thread |
| Framer Motion `x`/`y` drops frames | Animate the full `transform` string (`transform: "translateX(100px)"`) |
| Hand-rolled animation drops frames in React | Write to `ref.current.style.transform` or a motion value instead of React state |
| Drag gets laggier as the list grows | Set `transform` directly on the moving element instead of updating an inherited CSS variable |
| Blur transition lags (especially Safari) | Keep animated `blur()` under `20px` (`2-5px` for crossfades) |
| Unexpected properties animate | Replace `transition: all` with explicit `transition-property` values |
| Element shifts 1px when motion starts or ends | Add `will-change: transform` to the animating element once observed |

## Transition Only What Changes

Name the exact properties that change. `transition: all` and Tailwind's `transition-all` watch every property: they cause unexpected transitions on properties you didn't intend to animate (colors, padding, shadows) and prevent browser optimizations. Tailwind's bare `transition` maps to a curated default list of colors, opacity, shadow, and transforms, not to `all`; still prefer naming exactly what changes.

```css
.button {
  transition-property: scale, background-color;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}
```

**Tailwind:** `transition-[scale,background-color] duration-150 ease-out`

`transition-transform` in Tailwind maps to `transition-property: transform, translate, scale, rotate`, so it covers all transform-related properties, not just `transform`. Use it when you're only animating transforms. For multiple non-transform properties, use the bracket syntax: `transition-[scale,opacity,filter]`.

## Use `will-change` Sparingly

`will-change` hints the browser to pre-promote an element to its own GPU compositing layer. Without it, the browser promotes the element only when the animation starts, and that one-time layer promotion can cause a micro-stutter on the first frame.

This particularly helps when an element is changing `scale`, `rotation`, or moving around with `transform`. Apply `will-change` only to compositor-friendly properties (`transform`, `opacity`, `filter`), never to layout or paint properties such as `background-color` or `padding` which cannot be GPU-composited:

```css
.animated-card {
  will-change: transform, opacity;
}
```

| Property | GPU-compositable | Worth using `will-change` |
| --- | --- | --- |
| `transform` | Yes | Yes |
| `opacity` | Yes | Yes |
| `filter` (blur, brightness) | Yes | Yes |
| `clip-path` | Newer Chromium only | Rarely; not reliable cross-browser |
| `top`, `left`, `width`, `height` | No | No |
| `background`, `border`, `color` | No | No |

Modern browsers are already good at optimizing on their own. Add `will-change` once you notice first-frame stutter; Safari in particular benefits from it. Each extra compositing layer costs memory, so add it to the elements that stutter and leave the rest.

## Animate Only `transform` and `opacity`

Only `transform` and `opacity` skip both layout and paint, running entirely on the GPU compositor. Animating layout properties (`width`, `height`, `padding`, `margin`, `top`, `left`) triggers layout, paint, and composite on every frame; animating paint properties (`box-shadow`, `border-radius`, `background-color`) still repaints every frame.

- Replace `width`, `height`, or `padding` growth with `scale()`.
- Replace `top`, `left`, or `margin` movement with `translate()` (`translateY(100%)` is relative to the element's own height).
- Replace animated `box-shadow` with `filter: drop-shadow(...)`.
- Keep animated `filter: blur()` under `20px` (2-5px is enough to mask a state crossfade; heavy blur is expensive, especially in Safari).

## Do Not Drive Child Transforms via Inherited CSS Variables

CSS custom properties inherit down the DOM tree. Updating a CSS variable such as `--swipe-amount` on a parent container forces the browser to recalculate styles for every descendant on every frame. In a drawer or list with many children, drag performance degrades as content grows. Set `element.style.transform` directly on the moving element instead:

```js
element.style.transform = `translateY(${distance}px)`;
```

## Bypass React State on Per-Frame Updates

Calling `setState` inside `requestAnimationFrame`, `pointermove`, `scroll`, or drag handlers triggers a full React component re-render every frame (`16.7ms` at 60Hz, `8ms` at 120Hz), blowing the frame budget. Write directly to `ref.current.style.transform` or update a motion value outside React's render cycle:

```tsx
// Direct DOM write inside requestAnimationFrame, pointermove, or scroll
ref.current.style.transform = `translateY(${nextY}px)`;

// Or update a Motion value without re-rendering
y.set(nextY);
```

## Keep Animations Off the Main Thread Under Load

CSS transitions, CSS keyframe animations, and the Web Animations API (`element.animate()`) run on the compositor thread when animating `transform` or `opacity`. They stay smooth even while the main thread is busy navigating, hydrating, fetching data, or running scripts.

### Framer Motion hardware acceleration caveat

Framer Motion's shorthand props (`x`, `y`, `scale`, `rotate`) run via `requestAnimationFrame` on the main thread (or through unaccelerated CSS variables). When an animation plays during page load, route transitions, or heavy rendering, pass the full `transform` string so Motion hands off to hardware-accelerated WAAPI:

```jsx
<motion.div animate={{ transform: "translateX(100px)" }} />
```

### Programmatic off-main-thread animations with WAAPI

Use `element.animate()` when you need JavaScript control with compositor-thread performance and no library overhead:

```js
element.animate(
  [{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0 0)" }],
  {
    duration: 1000,
    fill: "forwards",
    easing: "cubic-bezier(0.77, 0, 0.175, 1)",
  }
);
```

## Diagnostic Workflow

### 1. Inventory animations

List every animation in scope with its element, driver (CSS transition, CSS keyframes, WAAPI, or JS/`requestAnimationFrame`), animated properties, and when it plays (idle, hover, route change, drag). Expand `transition: all` and Motion shorthands (`x`, `y`, `scale`) into the underlying properties they animate.

Done when every animation in scope is listed with its driver, expanded properties, and trigger timing.

### 2. Diagnose in cost order

Evaluate each animation against the failure causes in descending cost order:
1. **Non-compositor properties**: layout properties (`width`, `height`, `padding`, `margin`, `top`, `left`) first, then paint properties (`box-shadow`, `border-radius`).
2. **Main-thread contention**: JS-driven animations (`requestAnimationFrame`, Motion shorthands) running during navigation, data fetching, or hydration instead of CSS or WAAPI.
3. **React re-renders per frame**: `setState` calls inside `requestAnimationFrame`, `pointermove`, `scroll`, or drag handlers.
4. **Inherited CSS variables**: parent custom properties updated per frame and read by child transforms.
5. **Heavy blur**: animated `filter: blur()` above `20px`.
6. **Missing layer promotion**: first-frame `1px` shift or stutter on an otherwise compositor-safe animation that needs `will-change: transform`.

Done when every stuttering or high-cost animation is mapped to a specific root cause and confirmed by code inspection or a DevTools Performance/Animations recording.

### 3. Report with cause and verification

Report each finding ordered by cost (layout before paint, busy main thread before idle) with `file:line`, the diagnosed cause, the exact property or driver replacement, and whether the fix was verified from code or requires a real-device recording.

Done when every finding includes `file:line`, root cause, positive replacement code, and verification status.
