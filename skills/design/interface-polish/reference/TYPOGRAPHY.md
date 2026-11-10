# Typography

## Text Wrapping

### text-wrap: balance

Distributes text evenly across lines, preventing orphaned words on headings and short text blocks. **Only works on blocks of 6 lines or fewer** (Chromium) or 10 lines or fewer (Firefox), because the balancing algorithm is computationally expensive, so browsers limit it to short text. On long paragraphs it is silently ignored.

```css
h1, h2, h3 {
  text-wrap: balance;
}
```

**Tailwind:** `text-balance`

### text-wrap: pretty

Prevents orphaned words (a single word dangling on the last line) by adjusting line breaks throughout the paragraph. Unlike `balance`, it doesn't try to equalize line lengths; it just ensures the last line isn't embarrassingly short. Works on text of any length with no line-count limit.

This should be your **default for short-to-medium text**: paragraphs, descriptions, captions, list items, card text. For very long text (10+ lines), skip both `pretty` and `balance`, since the browser's default wrapping is fine and you avoid unnecessary layout cost.

```css
p, li, figcaption, blockquote {
  text-wrap: pretty;
}
```

**Tailwind:** `text-pretty`

### When to Use Which

| Scenario | Use |
| --- | --- |
| Headings, titles where even distribution matters | `text-wrap: balance` |
| Short-to-medium text (paragraphs, descriptions, captions, UI text) | `text-wrap: pretty` |
| Long text (10+ lines), code blocks, pre-formatted text | Neither, leave default |

## Font Smoothing (macOS)

On macOS, text renders heavier than intended by default. Apply antialiased smoothing once, to the root layout, so all text renders crisper and thinner. Other platforms ignore these properties, so it's safe to apply universally.

```css
html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

**Tailwind:** `antialiased` on the root `<html>`.

## Font Family

The product's existing type system stays. Font smoothing, text wrapping, and tabular numbers are rendering details that apply on top of any font family. A system-native macOS feel uses the system font stack; a commercial face is a brand decision that keeps a practical fallback stack.

## Tabular Numbers

When numbers update dynamically (counters, prices, timers, table columns), use tabular-nums to make all digits equal width. This prevents layout shift as values change.

```css
.counter {
  font-variant-numeric: tabular-nums;
}
```

**Tailwind:** `tabular-nums`

| Use tabular-nums | Skip tabular-nums |
| --- | --- |
| Counters and timers | Static display numbers |
| Prices that update | Decorative large numbers |
| Table columns with numbers | Phone numbers, zip codes |
| Animated number transitions | Version numbers (v2.1.0) |
| Scoreboards, dashboards | |

Some fonts (like Inter) change the visual appearance of numerals with this property: the digit `1` becomes wider and centered. This is expected behavior and usually desirable for alignment, but verify it looks right in your specific font.

## Optical Sizing, Tracking, and Leading

Size-specific `letter-spacing` (tracking) and `line-height` (leading) keep type legible and balanced across the scale:

- **Large display text**: tighten `letter-spacing` (such as `-0.02em`) with tight leading (`line-height: 1.05`) and `font-optical-sizing: auto` so large glyphs do not drift apart.
- **Body copy**: keep `letter-spacing` near `0` with comfortable leading (`line-height: 1.5`).
- **Tiny labels and captions**: use slightly positive tracking (`0.01em` to `0.02em`) so small letterforms stay open and legible.
- **Scalable spacing**: define font sizes and layout spacing in `rem` and `em` rather than fixed `px` so layouts survive user text-size increases without clipping or breaking hierarchy.

```css
:root {
  font: 100%/1.5 system-ui, sans-serif;
}

.display {
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: 1.05;
  letter-spacing: -0.02em;
  font-optical-sizing: auto;
}

.caption {
  font-size: 0.75rem;
  line-height: 1.35;
  letter-spacing: 0.015em;
}
```
