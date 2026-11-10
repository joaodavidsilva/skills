# Sheets without springs

For an iOS-style sheet or drawer in pure CSS, when a spring library is not worth the weight. The values below are tuning starting points, not specified constants: judge them by feel on a real phone.

## The curve

`cubic-bezier(0.32, 0.72, 0, 1)` over `500ms`. The curve is steep at the start, so a long duration still feels snappy and lands with a spring-like settle. This timing reads right on a full-width sheet attached to a screen edge.

## A small floating drawer

A drawer that does not touch the screen edge travels less, so it overrides to about `200ms` with an ease-out curve:

```css
.drawer  { transition: transform 0.2s cubic-bezier(0.165, 0.84, 0.44, 1); }
.overlay { transition: opacity  0.2s cubic-bezier(0.165, 0.84, 0.44, 1); }
```

## One entity

Height changes and content crossfades inside the drawer stay in the same timing family as the drawer itself; one slow sub-animation makes the whole component feel broken.

## Drag inside the drawer

Mark interactive children with the drag library's no-drag opt-out, so pressing a button inside the drawer never starts a drag.

Done when the sheet's open, close, and drag-release all share one curve family, and every interactive child opts out of drag.
