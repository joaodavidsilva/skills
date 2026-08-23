# Animations

## Should It Animate? (Frequency Gate)

Before adding any animation, ask how often users will see it:

| Frequency | Decision |
| --- | --- |
| 100+ times/day (keyboard shortcuts, command palette toggle) | Never animate |
| Tens of times/day (hover effects, list navigation) | Near-imperceptible (`<= 150ms`) or none |
| Occasional (modals, drawers, toasts) | Standard animation |
| Rare / first-time (onboarding, empty state, celebration) | Delight budget |

**Never animate keyboard-initiated actions.** Actions repeated hundreds of times daily feel slow, delayed, and disconnected from keystrokes when animated. Command menus (such as Raycast) have no open/close animation, and arrow-key row highlights snap immediately rather than sliding between items.

## Valid Purposes for Motion

Every animation needs a clear answer to "why does this animate?":

- **Feedback**: a button scales down on press, confirming the interface registered the input.
- **Spatial consistency**: a toast enters and exits from the same direction, making swipe-to-dismiss intuitive.
- **State indication**: an action button morphs smoothly between states (idle, loading, success).
- **Preventing a jarring change**: elements appearing or disappearing bridge the visual transition instead of teleporting.
- **Explanation**: an onboarding or marketing sequence demonstrates how a feature works.
- **Delight (rare tier only)**: a first-run or infrequent interaction uses expressive motion where frequency is low enough that it never becomes friction.

Data the user is reading or acting on does not move for style. If the only reason is "it looks cool" and users will see it regularly, do not animate.

## Easing Decision Order & Custom Curves

Follow this decision order when choosing an easing function:

1. **Entering or exiting** -> `ease-out` (starts fast, feels immediately responsive)
2. **Moving or morphing on screen** -> `ease-in-out` (natural acceleration and deceleration)
3. **Hover or color change** -> `ease`
4. **Constant motion** (marquee, progress bar, hold timer) -> `linear`
5. **Default** -> `ease-out`

**Never use `ease-in` on UI animations.** `ease-in` starts slow, delaying the initial movement at the exact moment the user is watching most closely. An `ease-out` transition at 200ms feels faster than `ease-in` at 200ms because movement begins right away.

Built-in CSS easings are often too subtle for deliberate motion. Define strong custom curves as shared tokens:

```css
:root {
  /* Strong ease-out for UI entrances and exits */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);

  /* Strong ease-in-out for on-screen movement and morphing */
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);

  /* iOS-like drawer and sheet curve */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
}
```

## Duration Budgets & Perceived Performance

**Rule: UI animations stay under 300ms.**

| Element | Duration |
| --- | --- |
| Button press feedback | 150ms (100-160ms) |
| Tooltips, small popovers | 125-200ms |
| Dropdowns, selects | 150-250ms |
| Modals, drawers | 200-500ms |
| Marketing / explanatory | Can be longer |

Animation speed directly shapes perceived performance:

- **180ms vs 400ms**: a 180ms select or dropdown feels noticeably more responsive than a 400ms one.
- **Fast spinners feel faster**: a briskly spinning loader makes the wait feel shorter than a sluggish one, even when actual load time is identical.
- **Sequential tooltips skip delay and animation**: the first tooltip waits briefly before appearing to avoid accidental triggers, but once one tooltip is open, hovering adjacent tooltips opens them immediately with `0ms` duration:

```css
.tooltip {
  transition: transform 125ms var(--ease-out), opacity 125ms var(--ease-out);
  transform-origin: var(--transform-origin);
}

.tooltip[data-starting-style],
.tooltip[data-ending-style] {
  opacity: 0;
  transform: scale(0.97);
}

/* Skip animation when moving across already-open tooltips */
.tooltip[data-instant] {
  transition-duration: 0ms;
}
```

## Physicality & Origin

### Never animate from `scale(0)`

Nothing in the physical world appears from nothing. Elements entering from `scale(0)` look unnatural. Start from `scale(0.95)` (or `0.9` to `0.97`) combined with `opacity: 0`:

```css
.entering {
  transform: scale(0.95);
  opacity: 0;
}
```

### Origin-aware popovers, dropdowns, and tooltips

Trigger-anchored overlays scale from their trigger, not from `center`. **Modals are exempt**: modals are not anchored to a trigger and appear centered in the viewport, so they keep `transform-origin: center`.

```css
/* Base UI / Radix origin variable */
.popover {
  transform-origin: var(--transform-origin);
}
```

### Scale on Press

A subtle shrink on `:active` (`scale: 0.96` over `150ms` `ease-out`) gives pressable elements tactile feedback. Respond on pointer-down (`:active`), not release, and use CSS transitions for interruptibility so releasing mid-press smoothly returns:

```css
.button {
  transition-property: scale;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}

.button:active {
  scale: 0.96;
}
```

**Tailwind:** `transition-transform duration-150 ease-out active:scale-[0.96]`

## Springs

Springs simulate physics rather than interpolating over a fixed duration. Use them for drag interactions with momentum, elements that should feel alive (such as Dynamic Island), gestures that can be interrupted mid-flight, and decorative mouse-tracking.

```js
// Duration + bounce (recommended, easier to reason about)
{ type: "spring", duration: 0.5, bounce: 0.2 }

// Mass, stiffness, damping (traditional physics control)
{ type: "spring", mass: 1, stiffness: 100, damping: 10 }
```

- **Keep bounce subtle (`0.1-0.3`)** and avoid bounce in routine UI. Reserve visible bounce for momentum-driven gestures (drag-to-dismiss) and playful interactions.
- **Velocity preservation**: unlike CSS keyframes, springs preserve velocity when interrupted and retargeted mid-motion.
- **Decorative mouse tracking**: tying visual state directly to pointer coordinates feels robotic. Interpolate with `useSpring` when the motion is purely decorative (never on functional charts or data readouts):

```jsx
import { useSpring } from "framer-motion";

const springRotation = useSpring(mouseX * 0.1, {
  stiffness: 100,
  damping: 10,
});
```

## Interruptible Animations & `@starting-style`

Users change intent mid-interaction. If animations cannot be interrupted and reversed cleanly, the interface feels brittle.

| | CSS Transitions | CSS Keyframe Animations |
| --- | --- | --- |
| **Behavior** | Retarget mid-animation from current position toward the latest state | Run on a fixed timeline and restart from zero |
| **Use for** | Interactive state changes (hover, toggle, open/close, rapidly added toasts) | Staged sequences that run once (first-load hero, loading loops) |

```css
/* Good: interruptible transition for a toggle */
.drawer {
  transform: translateX(-100%);
  transition: transform 200ms var(--ease-out);
}
.drawer.open {
  transform: translateX(0);
}
```

### Enter states with `@starting-style`

Animate element entry in pure CSS without a JavaScript mount effect:

```css
.toast {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 400ms ease, transform 400ms ease;

  @starting-style {
    opacity: 0;
    transform: translateY(100%);
  }
}
```

Where `@starting-style` is unavailable, fall back to setting a `data-mounted` attribute inside `useEffect`.

### Asymmetric Enter and Exit Timing

Make deliberate user actions slow and system responses fast. In a hold-to-confirm interaction, the press fills slowly (`2s linear`) while releasing early snaps back (`200ms ease-out`):

```css
/* Release: fast system response */
.overlay {
  clip-path: inset(0 100% 0 0);
  transition: clip-path 200ms ease-out;
}

/* Press: slow and deliberate confirmation */
.button:active .overlay {
  clip-path: inset(0 0 0 0);
  transition: clip-path 2s linear;
}
```

## Enter Animations: Split and Stagger

Use staggered entrances for infrequent staged reveals (first load of a page hero, empty state, or group reveal) where sequence communicates hierarchy. Routine interactions (row hovers, keystrokes, repeated tab switches) never stagger.

1. **Split** content into semantic chunks or list items.
2. **Stagger** with short delays (**~100ms** between semantic page chunks such as title, description, and actions; **30-80ms** between individual list/grid items or words). Longer delays make the UI feel sluggish.
3. **Combine** `opacity`, `translateY`, and subtle `blur` for the entrance.
4. **Never block interaction** while stagger animations are playing; stagger is strictly non-blocking.

```css
.stagger-item {
  opacity: 0;
  transform: translateY(8px);
  filter: blur(4px);
  animation: fadeInUp 300ms var(--ease-out) forwards;
  animation-delay: calc(50ms * var(--index));
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}
```

Set `--index` per item (`style="--index: 2"`).

## Exit Animations

Exit animations are softer and shorter than enter animations because the user's attention has already moved on.

```css
/* Good: subtle exit */
.item-exit {
  opacity: 0;
  transform: translateY(-12px);
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}

/* Sometimes correct: remove immediately when motion adds no context */
.item-exit {
  display: none;
}
```

- Use a small fixed `translateY` (such as `-12px`) instead of the full container height, unless spatial continuity requires sliding fully out (such as a drawer or sheet).
- Keep exit duration shorter than enter duration (150ms vs 250-300ms).
- Remove immediately when motion adds no spatial context, repeats frequently, or when reduced motion is active.

## Blur Crossfade Masking & Contextual Icon Animations

### Blur to mask imperfect crossfades

When a crossfade between two states looks like two distinct objects overlapping despite tuning easing and duration, add a subtle `filter: blur(2px)` during the transition. Blur blends the overlapping states so the eye perceives one continuous transformation. Keep animated blur under `20px` (heavy blur is expensive, especially in Safari).

```css
.button-content {
  transition: filter 200ms ease, opacity 200ms ease;
}

.button-content.transitioning {
  filter: blur(2px);
  opacity: 0.7;
}
```

### Contextual Icon Animations

When icons swap contextually (play to pause, copy to checkmark, hover actions), animate them with `opacity`, `scale`, and `blur` instead of toggling visibility. Keep both icons in the DOM (one `position: absolute` over the other) and crossfade with transitions:

- `scale`: `0.25` to `1`
- `opacity`: `0` to `1`
- `filter`: `blur(4px)` to `blur(0px)`
- `transition-timing-function`: `cubic-bezier(0.2, 0, 0, 1)`

```css
.icon-layer {
  transition-property: opacity, filter, scale;
  transition-duration: 300ms;
  transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
}
.icon-layer[data-visible="false"] {
  opacity: 0;
  filter: blur(4px);
  scale: 0.25;
}
.icon-layer.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

| Animate | Skip animation |
| --- | --- |
| Icons that appear on hover (action buttons) | Static navigation icons |
| State change icons (play -> pause, copy -> check) | Decorative icons |
| Icons in contextual toolbars | Icons that are always visible |
| Loading/success state indicators | Icon labels (text next to icon) |

## Transforms & `clip-path`

- **`translate` percentages**: percentage values in `translateX()` / `translateY()` are relative to the element's own dimensions. Use `translateY(100%)` to slide a drawer or toast by its exact height without hardcoding pixel values.
- **`scale()` scales children**: unlike `width` and `height`, `scale()` scales text, icons, and child elements proportionally, which makes it ideal for button press feedback.
- **3D transforms**: `rotateX()` and `rotateY()` paired with `transform-style: preserve-3d` on the parent enable 3D flips, depth, and orbits in pure CSS.
- **`clip-path: inset(top right bottom left)`**: clips an element inward from each edge and animates smoothly:
  - **Hold-to-confirm overlay**: start a colored overlay at `clip-path: inset(0 100% 0 0)`, animate to `inset(0 0 0 0)` over `2s linear` on `:active`, and release in `200ms ease-out`.
  - **Seamless tab color transitions**: duplicate the tab list, style the overlay copy as active, and animate `clip-path: inset(...)` so only the active tab segment is revealed. This avoids imperfect color interpolation between text and background.
  - **Scroll reveals**: animate from `clip-path: inset(0 0 100% 0)` to `inset(0 0 0 0)` when entering the viewport (`IntersectionObserver` or `useInView` with `{ once: true, margin: "-100px" }`).
  - **Comparison sliders**: stack two images and adjust the top layer's right inset (`clip-path: inset(0 50% 0 0)`) from pointer drag position.

## Gestures & Drag Interactions

- **1:1 grab-offset tracking & pointer capture**: when the user drags an element, keep it glued to the pointer and respect the offset from where they grabbed it rather than snapping to the element's center. Call `el.setPointerCapture(e.pointerId)` on pointer down so tracking continues when the pointer leaves the element's bounds, and ignore additional touch points once a drag is active (`if (isDragging) return;`):

```js
el.addEventListener("pointerdown", (e) => {
  if (isDragging) return;
  el.setPointerCapture(e.pointerId);
  const grabOffset = e.clientY - el.getBoundingClientRect().top;
  // Track position + timestamp history for release velocity
});
```

- **Interruptibility, reversal & 2D springs**: keep input active during transitions so moving elements can be grabbed and redirected mid-flight. Always animate from the live on-screen presentation value rather than the logical target value. When a gesture reverses direction, blend velocity through a spring that retargets from current velocity instead of hard-cutting, and decompose 2D motion into independent X and Y springs so axes with different velocities stay synchronized.
- **Relative velocity handoff**: when a gesture ends, pass the pointer's release velocity into the spring so there is no seam between dragging and animating. Motion (`motion/react` / `framer-motion`) accepts raw `px/s` velocity directly (`velocity` option); for spring APIs expecting normalized relative velocity, divide by the remaining distance to the target:

```js
const relativeVelocity = gestureVelocity / (targetValue - currentValue);
```

- **Momentum projection & velocity-based dismissal**: snap to where the gesture is going rather than the release point alone, and allow flick dismissal (`Math.abs(swipeAmount) / elapsedMs > 0.11`) even when drag distance is small. Project the resting endpoint from release velocity and snap to the nearest target from the projected endpoint:

```js
function project(initialVelocity, decelerationRate = 0.998) {
  return ((initialVelocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

const projectedEndpoint = currentPosition + project(releaseVelocity);
const target = nearestSnapPoint(projectedEndpoint);
animateSpringTo(target, { velocity: releaseVelocity });

// Flick dismissal check
const elapsedMs = Date.now() - dragStartTime.current;
const velocity = Math.abs(swipeAmount) / elapsedMs;
if (Math.abs(swipeAmount) >= SWIPE_THRESHOLD || velocity > 0.11) {
  dismiss();
}
```

- **Progressive boundary resistance (rubber-banding)**: when dragging past a natural bound (such as pulling a sheet upward past its open position), apply progressive resistance so movement slows continuously instead of hitting a hard stop:

```js
function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
```
## Tabular Numbers & Animated Counters

When animating changing numbers (counters, live prices, timers, progress readouts), pair `font-variant-numeric: tabular-nums` with a dedicated digit-transition component rather than re-rendering raw text on a timer. Equal-width digits prevent horizontal jitter around the number.

```css
.counter {
  font-variant-numeric: tabular-nums;
}
```

## Skip Animation on Page Load

Elements already in their initial state skip enter animations on first render and animate only on subsequent state changes (icon swaps, toggles, tabs, segmented controls). Verify that skipping first-render transitions does not break intentional first-load reveals such as a staggered hero.

## Motion Restraint & Accessibility

Motion is a budget, not a garnish:

- **High-frequency interactions get no custom animation.** Repeated interactions use instant feedback or a minimal `opacity` or `background-color` transition at `<= 150ms`.
- **Every animated state change carries a static cue** such as color, icon, or label.
- **Gate hover animations** behind `@media (hover: hover) and (pointer: fine)` so touch taps never trigger sticky hover motion.
- **Honor `prefers-reduced-motion: reduce`**: reduced motion means gentler, non-vestibular feedback, not zero transitions. Keep subtle `opacity` or `color` fades that aid comprehension and remove `transform` translations, scale bounces, and parallax:

```css
@media (prefers-reduced-motion: reduce) {
  .element {
    animation: fade 200ms ease;
    transform: none !important;
  }
}

@media (hover: hover) and (pointer: fine) {
  .element:hover {
    transform: scale(1.05);
  }
}
```

## Debugging & Cohesion

- **Slow-motion and frame-by-frame inspection**: replay animations at 2-5x duration or 10% speed in the browser DevTools Animations panel. Verify that crossfades do not double-expose, `transform-origin` matches the trigger, and coordinated properties (`opacity`, `transform`, `filter`) stay in sync.
- **Cohesion**: match easing and duration to the product's personality, and keep curves/durations in shared tokens instead of scattered cubic-bezier literals.
- **Real hardware testing**: verify drag, swipe, and drawer physics on a physical phone over local network / USB remote debugging rather than relying solely on desktop emulation.
