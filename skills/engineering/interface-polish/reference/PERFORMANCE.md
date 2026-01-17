# Performance

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

This particularly helps when an element is changing `scale`, `rotation`, or moving around with `transform`. For other properties, it doesn't help much, because the browser can't composite them on the GPU anyway.

```css
/* Good: compositor-friendly properties */
.animated-card {
  will-change: transform, opacity;
}

/* Bad: properties that can't be GPU-composited anyway */
.animated-card {
  will-change: background-color, padding;
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
