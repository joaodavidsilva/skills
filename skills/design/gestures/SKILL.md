---
name: gestures
description: "Web gestures: drag, swipe, fling, hold, and dismiss that track the finger 1:1 and stay interruptible. Use when building a drawer, sheet, swipe-to-dismiss, drag-to-reorder, pull-to-refresh, or hold-to-confirm, or when a gesture lags the finger, jumps on release, or can't be caught mid-animation."
---

# Gesture-Driven UI

A gesture is direct manipulation: while the finger is down the element _is_ the finger; the moment it lifts, physics takes over. Every rule below follows from that split. For React Native and Expo, call the Skill tool with `"animate-expo"` instead.

Call the Skill tool with `"interface-polish"`. Its `reference/ANIMATIONS.md` section "Gestures & Drag Interactions" owns the shared formulas (grab-offset tracking, velocity handoff, `project()`, `rubberband()`, flick dismissal, hold-to-confirm timing); this skill points there instead of repeating them.

## 1. Build or adopt

| Interaction | Use |
| --- | --- |
| Bottom sheet, drawer, snap points | A drawer library: momentum, overlay sync, velocity-aware dismissal, focus trapping, and Escape-to-close are weeks of edge cases |
| Swipe card or toast, drag-to-reorder, pull-to-refresh, hold-to-confirm, bespoke drag | Build it with this skill |

Check `package.json` first and reuse the drag library already installed (Motion, dnd-kit) rather than adding a second. A library covers the gesture itself; steps 2 to 6 still govern everything you wire around it.

**Done when:** the interaction is mapped to a library or a build, with the existing dependency named.

## 2. Split every gesture into track and release

```
Is the pointer currently down?
├── Yes → TRACK:   position maps 1:1 to the pointer, driven by transform writes alone.
└── No  → RELEASE: a spring seeded with the release velocity finishes the motion.
```

### Track

- **1:1 means 1:1.** Drive position from a `useMotionValue` or direct `transform` writes. A spring or transition here makes the element trail the finger, like dragging through syrup.
- **Write `transform` on the dragged element.** Per-move React state and parent CSS variables both cost frames; `interface-polish` `reference/PERFORMANCE.md` has the details.
- **Rubber-band at the edges.** Past a boundary the element moves a fraction of the distance (Motion: `dragElastic`, which defaults to a loose tug), because resistance says "nothing further" physically.

### Release

- **Spring seeded with the gesture's velocity.** The element leaves the finger at the speed it was moving; a fixed-duration ease makes every fling land identically, which reads as fake.
- **Dismiss on distance OR velocity.** Crossing a distance threshold dismisses, and so does a fast flick over a short distance. Start near a quarter of the travel and tune by feel; the flick check is in `reference/ANIMATIONS.md`.
- **Bounce only after a drag.** A drag applies force, so a slight bounce on release feels physical. The same element closed by a button gets zero bounce, because no force was applied. Smaller elements need slightly more bounce to read the same.
- **Snap-back is fast.** A gesture that misses the threshold returns quickly; a slow snap-back reads as the UI disagreeing in slow motion.

**Done when:** every gesture names its TRACK driver and its RELEASE spring with the velocity source, and the TRACK path is pointer-driven `transform` writes alone.

## 3. Keep it interruptible

The user must be able to catch a sheet mid-close and drag it back. A spring retargeted mid-flight keeps its velocity, so the redirect is seamless. A CSS `@keyframes` animation restarts from zero and cannot be caught: a keyframe enter makes a toast jump when a second toast arrives.

**Done when:** every element a gesture can touch animates by spring or CSS transition.

## 4. Link dependent values to drag progress

An overlay fades and the page behind scales as the sheet moves. Derive them from one source so they never drift apart, including mid-gesture and on reversal:

```jsx
const y = useMotionValue(0);
const overlayOpacity = useTransform(y, [0, drawerHeight], [1, 0]);
```

## 5. Motion drag props

```jsx
<motion.div
  drag="y"
  dragConstraints={{ top: 0 }}
  dragElastic={0.2}
  onDragEnd={(e, info) => {
    if (info.offset.y > distanceThreshold || info.velocity.y > velocityThreshold) dismiss();
  }}
/>
```

`dragMomentum` defaults to on: right for a flung card, wrong for a simple reposition, where it goes `false` so the element stops where the finger stops. `dragConstraints` takes a ref or a bounds object. Spec: [Motion drag docs](https://motion.dev/docs/react-drag).

## 6. Direction, hold, and touch

- **Spatial consistency.** An element dismisses in the direction it entered: a toast that slides up from the bottom dismisses with a swipe down. Entry and exit share one axis, so the gesture is felt rather than learned.
- **Hold gestures are asymmetric.** The deliberate hold is slow and `linear` (it visualizes time passing); an early release is a fast `ease-out` cancel. Values in `reference/ANIMATIONS.md`.
- **Touch.** `interface-polish` `reference/MOBILE-WEB.md` owns `touch-action` per drag axis, hit areas, hover gating, and real-device testing. A gesture ships tested on a real phone by local IP.
- **Reduced motion.** Tracking is direct manipulation, so it stays under `prefers-reduced-motion: reduce`. Momentum flings, bounce, and decorative motion around the gesture reduce; release settles with a short opacity or position change instead of a bouncy spring.

## 7. Sheets

For a sheet or drawer curve, a small floating drawer, or one-entity timing, read [reference/SHEETS.md](reference/SHEETS.md).

## When it still feels wrong

| Symptom | Fix |
| --- | --- |
| Spring feels weird | Raise `damping` |
| Gesture stutters | A performance problem: re-check the TRACK rules, then `reference/PERFORMANCE.md` |
| A feel you cannot name | Record the gesture and scrub it frame by frame; for the term, call the Skill tool with `"animation-vocabulary"` |

## Done

When building, done when every step above has been checked against every gesture you changed.
