---
name: animate-expo
description: "React Native and Expo animations: build UI-thread motion, gestures, sheets, screen transitions, press feedback, and haptics with Reanimated 4, Gesture Handler, Expo Router, and expo-haptics. Use when animating an Expo or React Native app, adding gestures or haptics, or fixing mobile motion jank."
---

# Building Animations in Expo

A construction skill for React Native. It turns a request for motion into an implementation that survives a strict review on a real device, not in the simulator and not on a flagship phone in dev mode.

Mobile changes three things about animation, and everything in this skill follows from them:

1. **There is no hover.** Every affordance the web puts in hover has to live in press, position, or nothing.
2. **There are two runtimes.** Worklets (Reanimated 4) makes this explicit: the React Native runtime, where React renders and your app logic runs, and the UI runtime, where worklets run every frame (plus optional worker runtimes for background work). An animation that touches the RN runtime stutters the moment the app does anything else. The whole craft is keeping motion on the UI runtime.
3. **The user's finger is on the element.** Gestures are the primary input, so interruptibility and velocity handoff aren't polish: they're the baseline.

## Hard Rules

1. **Run the sequence in order.** Steps 1 and 2 gate everything.
2. **Reanimated and Gesture Handler, not core `Animated` or `PanResponder`.** Core `Animated` and `PanResponder` cross the bridge on gestures, and `useNativeDriver` refuses anything beyond transform and opacity. Reanimated worklets and `Gesture.Pan()` run on the UI thread and stay smooth while JS is busy.
3. **Exact curves and spring configs.** Take easing curves and spring parameters directly from step 5 and [reference/RECIPES.md](reference/RECIPES.md).
4. **Reduced motion ships with the animation**, not as a follow-up.
5. **Feel is judged on a release build on the slowest supported device**, never in Expo Go or the simulator.

## The Build Sequence

### 1. Should this animate at all?

Call the Skill tool with `"interface-polish"` and read `reference/ANIMATIONS.md` for the universal frequency gate.

Mobile addition: **Tab switches never slide (`animation: 'none'`).** Tabs are peers, not a hierarchy; sliding implies depth that isn't there, and the user pays for it dozens of times a session.

If the request fails this gate, say so and stop here.

Done when you have classified the interaction's frequency tier and either rejected the animation or confirmed it passes the gate.

### 2. What is the purpose?

Call the Skill tool with `"interface-polish"` and read `reference/ANIMATIONS.md` for the valid animation purposes. Name this animation's purpose in one word before continuing. If you cannot name it, do not build it.

Done when the animation's single purpose is named in one word.

### 3. Pick the tool: cheapest that works

Walk down; stop at the first that fits.

| Need | Tool |
| --- | --- |
| A state-driven change with no gesture (press, toggle, color, a value flipping) | **Reanimated CSS transition** (`transitionProperty` in the style) |
| Loop, multi-stage, or plays on mount with no state change | **Reanimated CSS animation** (`animationName` keyframes) |
| An element mounting or unmounting, or a list reflowing | **Layout animations** (`entering` / `exiting` / `itemLayoutAnimation`; on virtualized lists like `FlatList` or `FlashList`, animate the list container on mount or use `itemLayoutAnimation` for reflow rather than putting `entering` on recycled rows) |
| Anything a finger touches, or anything derived from scroll | **`useSharedValue` + `Gesture.Pan()` + `useAnimatedStyle`** |
| Screen to screen | **Native stack options in Expo Router** (`animation`, `presentation`) |
| A bottom sheet that is its own screen | **`presentation: 'formSheet'`**: it's a real UISheetPresentationController, free and correct |
| Tab bar | **`NativeTabs`** (from `expo-router/unstable-native-tabs`): the platform's real tab bar, its behaviors and transitions included |
| Context menu, press-and-hold preview | **`Link.Menu` / `Link.Preview`** (Expo Router, iOS-only): native menus and peek, never rebuilt in JS |
| Header that collapses into a large title | **`headerLargeTitleEnabled`** on the native stack (iOS-only; `headerLargeTitle` is deprecated), not a scroll worklet |
| Pull to refresh | **`RefreshControl`**: hand-roll only when it's a signature interaction (see the threshold recipe) |
| UI that tracks the keyboard | **`react-native-keyboard-controller`**: the keyboard's real position, frame by frame, on the UI thread |
| Vector illustration, celebration, empty state | **Lottie**: for illustration only, never for UI state |
| A huge animated scene, freeform drawing | **`@shopify/react-native-skia`**: a canvas, for when the view hierarchy itself is the bottleneck |

Reach for a shared value only when the value is continuous or interruptible. A press scale is a CSS transition; a drag is a shared value. Using a worklet for a two-state toggle is the mobile equivalent of installing a motion library for a fade.

For package installation (`npx expo install`), root `GestureHandlerRootView` and `KeyboardProvider` setup, and shared imports, see [reference/RECIPES.md](reference/RECIPES.md).

Done when the lowest-tier tool that satisfies the interaction is selected.

### 4. Pick the properties

- **`transform` and `opacity` are free.** Everything else is a layout pass. `width`, `height`, `margin`, `padding`, `flex`, `top`, `left`, `gap` re-run Yoga on every frame for that node *and its siblings*.
- **The one exception: an absolutely positioned element with no children**, such as a tab pill or a progress bar fill. It's out of flow, so nothing else re-lays-out, and animating `width` keeps the corner radius that `scaleX` would smear.
- **Start scale entrances from `scale(0.9-0.96)` + `opacity: 0`** rather than `scale(0)`. Nothing in the real world appears from nothing.
- **`transform` is an array and order matters**: `[{ translateY }, { scale }]` scales after moving; reversed, the translate gets scaled too. Keep translate first unless you want the multiplication.
- **Crossfade a static pre-shadowed layer** instead of animating Android `elevation`, which re-renders the shadow every frame.
- **Crossfade the opacity of a static `BlurView`** instead of animating `BlurView` intensity, which re-renders the blur each frame on Android.
- **Percentages work in `translate`** and are relative to the element's own size: `translateY('100%')` moves a sheet by its own height whatever its content.

Done when every animated property is `transform` or `opacity` (or `width` on a childless absolutely positioned element).

### 5. Timing or spring

**If a finger was involved, use a spring.** Springs carry velocity through an interruption; timing curves restart. Everything else uses timing.

Reanimated's spring takes Apple's two designer parameters directly. Use this form, not mass/stiffness/damping:

| Interaction | Config |
| --- | --- |
| Default settle, no overshoot | `{ duration: 400, dampingRatio: 1 }` |
| Reposition / snap back after a drag | `{ duration: 400, dampingRatio: 0.8, velocity }` |
| Sheet, drawer | `{ duration: 300, dampingRatio: 0.8, velocity }` |
| Must not pass a hard edge | add `overshootClamping: true` |

**Bounce only when the gesture carried momentum.** Overshoot on a menu that faded in feels wrong; overshoot on a card you flicked feels right. Commit or dismiss gestures on **projected velocity or distance** so a quick flick succeeds without dragging past a distance threshold, and apply **rubber-band resistance** rather than a hard stop when dragging past a boundary (see `project` and `rubberband` in [reference/RECIPES.md](reference/RECIPES.md)).

**Easing**, for everything without a finger on it:

| Situation | Easing |
| --- | --- |
| Entering or exiting | `ease-out` |
| Moving / morphing on screen | `ease-in-out` |
| Constant motion (progress, marquee) | `linear` |
| Default | `ease-out` |

**Use `ease-out` as the default UI curve**, never `ease-in` (which starts slow and delays the moment the user is watching). Reanimated's built-ins are as weak as CSS's, so use the `EASE_OUT` (`Easing.bezier(0.23, 1, 0.32, 1)`), `EASE_IN_OUT` (`Easing.bezier(0.77, 0, 0.175, 1)`), and `EASE_SHEET` (`Easing.bezier(0.32, 0.72, 0, 1)`) constants from [reference/RECIPES.md](reference/RECIPES.md).

**Duration:**

| Element | Duration |
| --- | --- |
| Press feedback | 150ms |
| Toggle, chip, small state change | 150-200ms |
| Sheet, modal, drawer | spring, ~300ms perceived |
| Screen transition | the platform default (keep unmodified) |

Mobile UI animations stay under 300ms, same as web. The platform's own transitions are longer (iOS push is 350ms); match the platform for navigation, beat it everywhere else.

Done when every gesture-driven motion uses a velocity-preserving spring and every state-driven motion has an explicit curve and sub-300ms duration.

### 6. Keep it off the JS thread

This is the mobile-specific craft, and it's where most React Native motion dies.

- **Drive gesture and scroll styles from a shared value + `useAnimatedStyle`** rather than calling `setState` per frame. One React render per frame is the single biggest cause of jank in RN apps.
- **Call `scheduleOnRN(fn, ...args)` from `react-native-worklets` only in `onEnd` or at a `useAnimatedReaction` threshold** (replacing the deprecated `runOnJS(fn)(...args)`), never per frame inside `onUpdate` or a scroll handler.
- **Read and write shared values in worklets, handlers, and effects only**, never during React render. Reading `translateY.get()` in JSX captures a stale snapshot, and writing during render replays on unrelated re-renders.
- **Use `.get()` / `.set()`, not `.value`.** Direct `.value` access hides reads and writes from the React Compiler; `set` also accepts a functional update: `sv.set((v) => v + 1)`.
- **Mark functions called from a worklet with `'worklet'`** as their first line so they run on the UI runtime on device.

Done when all per-frame reads and writes stay inside UI-thread worklets with zero per-frame `setState` or `scheduleOnRN` calls.

### 7. Press, not hover

Every hover affordance from the web has to be redesigned, not ported.

- **Feedback on press-in, commit on press-out.** Waiting for the tap to complete before showing anything feels dead. This is the latency the user actually perceives.
- **`scale: 0.96` in 150ms (`ease-out`)** on any pressable, using `Pressable` + a Reanimated CSS transition. `scale` takes the label and icons with it, which makes the press read as physical.
- **44x44pt minimum touch target** (48dp Android). If the visual is smaller, add `hitSlop` to expand the touch area without growing the visual.
- **`pressRetentionOffset`** so a finger drifting a few pixels doesn't cancel a press the user meant.
- **Android ripple only in a Material-styled app.** In a custom-designed app, the same scale on both platforms is more coherent than a ripple on one.

Done when every interactive pressable gives press-in feedback (`scale: 0.96`, `150ms`, `ease-out`) with a 44x44pt minimum hit target.

### 8. Haptics

Mobile has a sense the web doesn't. Use it sparingly and it becomes the thing that makes the app feel expensive; use it everywhere and users turn it off.

| Moment | Call |
| --- | --- |
| A value ticks past a step (picker, slider detent, segmented control) | `Haptics.selectionAsync()` |
| Something snaps home, a sheet detent catches, a drag commits | `Haptics.impactAsync(ImpactFeedbackStyle.Light)` |
| A heavy object lands, a destructive action fires | `Haptics.impactAsync(ImpactFeedbackStyle.Medium)` |
| Operation succeeded or failed | `Haptics.notificationAsync(NotificationFeedbackType.Success / Error)` |

Three rules, and they're absolute:

- **Same frame as the visual.** A haptic that lags its animation reads as a glitch, not as feedback. Fire it at the causal moment (the detent catching), not when the animation finishes.
- **One per user commit.** Fire only on user-initiated threshold crossings or commits, never on scroll, per frame, or unprompted entrances.
- **Always pair with a visual cue.** Haptics are off system-wide for many users and silent on most Android hardware, so the visual must stand alone.

From a worklet, schedule haptics onto the RN runtime: `scheduleOnRN(Haptics.selectionAsync)`.

Done when every haptic fires on the exact commit frame via `scheduleOnRN` and is paired with complete visual feedback.

### 9. Reduced motion and accessibility

```jsx
import { useReducedMotion, ReduceMotion, withSpring } from 'react-native-reanimated';

const reduced = useReducedMotion();
const y = useSharedValue(reduced ? 0 : SHEET_HEIGHT);

// or let each animation decide
withSpring(0, { duration: 300, dampingRatio: 0.8, reduceMotion: ReduceMotion.System });
```

Reduced motion means **fewer and gentler**, not zero: keep opacity and color changes that explain a state change, drop translation, scale, parallax and overshoot. Screen transitions become `animation: 'fade'`.

**Text scales.** `allowFontScaling` is on by default, so any height measured at default type size is wrong at 200%. Measure dynamic heights with `onLayout`, or animate a transform instead of a hardcoded height.

Done when `useReducedMotion()` or `ReduceMotion.System` is wired and no animation relies on a hardcoded text height.

## 120fps

On ProMotion iPhones, third-party animations are capped at 60fps unless `CADisableMinimumFrameDurationOnPhone` is set. Recent Expo SDKs set it by default; confirm it's there, and add it if not:

```json
{ "expo": { "ios": { "infoPlist": { "CADisableMinimumFrameDurationOnPhone": true } } } }
```

Then the frame budget is 8ms, not 16. This is also why a UI-thread animation matters more on mobile than it does on web.

## Setup and Recipes

For SDK-matched package installation (`npx expo install`), root `GestureHandlerRootView` and `KeyboardProvider` setup, shared easing constants, New Architecture / Babel requirements, and ready-to-build implementations (press feedback, drag-to-dismiss sheet, swipe-to-delete, collapsing header, list entrances, keyboard-synced UI, tab indicator, screen transitions, toasts, threshold reactions), read [reference/RECIPES.md](reference/RECIPES.md). Start from the matching recipe rather than a blank file.

## Output

Write the code. Then, in at most a few lines:

- **The gate result**: frequency tier and named purpose. Say what you rejected and why.
- **The ingredients**: tool, properties, spring or curve + duration, thread.
- **What to feel-check on device**: gestures, velocity handoff and haptic timing cannot be judged from code. Name what to try: flick it, interrupt it mid-flight, reverse it, run it on the slowest Android you have.

The code is the deliverable. Don't pad it into a report.
