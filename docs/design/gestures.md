## What it does

`gestures` builds and fixes web interactions the user drags, swipes, flings, holds, or dismisses: drawers, sheets, swipe-to-dismiss toasts and cards, drag-to-reorder, pull-to-refresh, and hold-to-confirm.

It splits every gesture into two phases and never mixes them. While the pointer is down, the element is the finger: position maps 1:1, with no easing, duration, or spring. Once it lifts, a spring seeded with the release velocity finishes the motion, and the element stays catchable mid-flight.

## When to reach for it

Type `/gestures`, or the [agent](../references/agent.md) reaches for it automatically when a task fits.

Reach for it when you build a gesture, or when one lags the finger, jumps on release, or can't be caught mid-animation. For other motion, use a sibling.

| Your situation | Reach for |
| --- | --- |
| A web drag, swipe, sheet, or hold interaction | `gestures` |
| The same gesture in Expo or React Native | [animate-expo](./animate-expo.md) |
| Easing, duration, and the rest of the UI craft around it | [interface-polish](./interface-polish.md) |
| A feel you can picture but cannot name | [animation-vocabulary](./animation-vocabulary.md) |

## Track, then release

The leading idea is the **track / release split**. Most gestures that feel wrong have a spring or transition in the track phase (the element trails the finger), or a fixed-duration ease in the release phase (every fling lands identically).

The skill also decides first whether to build at all: because momentum, overlay sync, and velocity-aware dismissal are weeks of edge cases. Everything else (swipe cards, reorder, bespoke drags) is built with the rules in the skill.

Dismissal fires on distance or velocity, so a short flick counts. Dependent values such as the overlay opacity derive from one drag-progress value, so they never drift apart when the user reverses.

## Common questions

**Why does my drawer lag once the list inside it grows?**

Moving children by updating a CSS variable on a parent recalculates styles for every descendant on every frame. The skill writes `transform` on the dragged element instead.

**Why can't I use a keyframe animation for the enter?**

A keyframe restarts from zero when a gesture grabs the element mid-flight, so the element jumps. Springs and CSS transitions retarget from the current velocity and stay catchable.

**Does reduced motion turn the gesture off?**

No. Tracking is the user producing the motion, so it stays. Momentum flings, bounce, and decorative motion reduce, and release settles with a short opacity or position change.

## It's working if

- The element stays under the finger the whole drag, with no trailing.
- Letting go carries on at the speed of the flick instead of jumping or landing the same way every time.
- A short, fast flick dismisses, and a slow drag short of the threshold snaps back quickly.
- Grabbing a sheet mid-close and dragging it back continues smoothly.
- The overlay is exactly as faded as the sheet is dismissed, including on reversal.

## Where it fits

A **reach-for-it-anytime standalone**, model-invoked whenever UI work involves dragging or swiping on the web.

- [interface-polish](./interface-polish.md) holds the shared formulas (velocity handoff, momentum projection, rubber-banding) and the performance and touch rules `gestures` points to rather than restating.
- [animate-expo](./animate-expo.md) is the React Native counterpart, with Gesture Handler and Reanimated in place of Motion and CSS.

**ask-joao** routes across the whole set when you are unsure which skill the situation wants.
