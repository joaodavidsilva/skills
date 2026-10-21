## What it does

`animate-expo` builds mobile motion, gestures, sheets, screen transitions, press feedback, and haptics in React Native and Expo apps with Reanimated 4, Gesture Handler, Expo Router, and `expo-haptics`.

It keeps motion on the **UI runtime** (Reanimated worklets, CSS transitions, and native Expo Router sheets, tabs, and menus) rather than crossing the React Native JS bridge, and gates every request through frequency and purpose first so high-frequency actions like tab switches do not animate at all.

## When to reach for it

Type `/animate-expo`, or the [agent](../references/agent.md) reaches for it automatically when a task fits.

Reach for it when you are adding or fixing motion, gestures, or haptics in an Expo or React Native app. For general UI craft across web or mobile, or when auditing an existing codebase for motion plans, use a sibling instead:

| Your situation | Reach for |
| --- | --- |
| Building a gesture, sheet, transition, press state, or haptic in Expo / React Native | `animate-expo` |
| Checking universal frequency gates, easing curves, or React Native surface rules | [interface-polish](./interface-polish.md) |
| Auditing a codebase's animations or hunting for motion opportunities to turn into plans | [improve-animations](./improve-animations.md) |
| Naming a motion effect you can picture ("what's it called when...") | [animation-vocabulary](./animation-vocabulary.md) |

## Prerequisites

The recipes assume an Expo or React Native project running the New Architecture with Reanimated 4, Worklets, Gesture Handler, and `expo-haptics` installed via `npx expo install` so versions match the project's SDK, plus `GestureHandlerRootView` wrapping the root layout (`KeyboardProvider` from `react-native-keyboard-controller` is added only when a screen tracks the keyboard).

## UI runtime vs React Native runtime

Mobile changes three things about animation: there is no hover, the user's finger is directly on the element, and there are two runtimes. The **React Native runtime** is where React renders and app logic runs; the **UI runtime** is where Reanimated worklets run every frame (8ms per frame on 120fps ProMotion displays). An animation that touches the React Native runtime stutters the moment the app does anything else, and calling `setState` per frame is the single biggest cause of jank in React Native apps.

The skill walks a strict ladder so you pick the cheapest tool that stays on the UI runtime:

| Need | Cheapest UI-runtime tool |
| --- | --- |
| State-driven change with no finger on it (press scale, toggle, color) | Reanimated CSS transition (`transitionProperty`) |
| Element mounting, unmounting, or list reflow | Layout animations (`entering`, `exiting`, `itemLayoutAnimation`) |
| Anything a finger touches, or anything derived from scroll | `useSharedValue` + `Gesture.Pan()` + `useAnimatedStyle` |
| Screen transitions, form sheets, native tabs, iOS context menus | Native stack options in Expo Router (`presentation: 'formSheet'`, `NativeTabs`, `Link.Menu`) |
| UI that tracks the keyboard frame by frame | `react-native-keyboard-controller` (`useReanimatedKeyboardAnimation`) |

Inside a worklet, shared values use `.get()` and `.set()` (so the React Compiler can see reads and writes), and crossing back to the React Native runtime happens only at gesture end or when a threshold flips via `scheduleOnRN(fn, ...args)`, never every frame.

## Velocity handoff, `project()`, `rubberband()`, and same-frame haptics

Because the user's finger is on the element, every gesture-driven motion uses a spring rather than a fixed-duration timing curve. Four details keep a gesture feeling physical rather than scripted:

- **Velocity handoff.** `onStart` captures the current shared value so grabbing an element mid-flight continues from where the eye last saw it instead of snapping back to zero, and `onEnd` hands the gesture's velocity directly into `withSpring({ duration, dampingRatio, velocity })` so there is no seam when the finger lifts.
- **Momentum projection (`project()`).** Deciding whether a drag commits or dismisses by distance alone makes a sheet feel heavy. `project(velocity)` calculates where the flick would come to rest under Apple's exponential deceleration rate, so a quick short flick dismisses while a slow drag snaps back.
- **Boundary resistance (`rubberband()`).** Pulling past a limit applies `rubberband(overshoot, dimension)` rather than clamping hard at zero; the further past the edge the finger goes, the less the element follows.
- **Same-frame haptics.** Haptics fire on the exact frame a threshold crosses or a detent catches (`scheduleOnRN(Haptics.selectionAsync)` or `Haptics.impactAsync` inside a `useAnimatedReaction` flip or `onEnd`), never when the settling animation finishes, and always paired with a visual cue for devices where haptics are silent or disabled.

Feel is judged on a **release build on a real device** (ideally the slowest supported Android phone), never in the simulator or Expo Go in dev mode.

## Common questions

**Why not use React Native's built-in `Animated` and `PanResponder`?**

Core `Animated` and `PanResponder` cross the bridge on gestures, and `useNativeDriver` refuses anything beyond `transform` and `opacity`. Reanimated worklets and `Gesture.Pan()` run entirely on the UI runtime and stay smooth while the JavaScript thread is busy rendering or fetching data.

**When do I use a Reanimated CSS transition vs `useSharedValue`?**

Reach for `useSharedValue` only when the value is continuous or driven by a finger or scroll position. A press scale (`scale: 0.96` over `150ms` `ease-out`) or a two-state toggle has no gesture attached, so a Reanimated CSS transition handles it without allocating shared values or worklets.

**Why does the skill reject sliding animations between tabs?**

Before choosing a tool, the skill runs the frequency and purpose gates from [interface-polish](./interface-polish.md). Tabs are peers switched dozens of times a [session](../references/session.md), not a hierarchy; sliding between them implies spatial depth that isn't there and taxes every switch, so tab navigation uses `animation: 'none'`.

## It's working if

- High-frequency interactions (such as tab switches) do not animate, and every surviving animation names its purpose in one word before code is written.
- Every pressable scales to `0.96` in `150ms` (`ease-out`) on press-in, with at least a 44x44pt touch target via `hitSlop`.
- Grabbing a sheet or row mid-flight continues smoothly from its current position, and flicking it commits based on projected velocity (`project()`) rather than requiring a long drag.
- No `setState` or `scheduleOnRN` call fires per frame inside `onUpdate` or a scroll handler; callbacks to the React Native runtime fire only on commit or threshold flips.
- Haptics fire on the exact frame a detent catches or a threshold crosses, and `useReducedMotion()` / `ReduceMotion.System` is wired from the start.
- The output ends with the gate result, the chosen ingredients, and what to feel-check on a release build on a real device.

## Where it fits

`animate-expo` is a **reach-for-it-anytime standalone**, model-invoked whenever UI work touches motion, gestures, or haptics in Expo or React Native.

- [interface-polish](./interface-polish.md) owns the universal frequency gate, valid motion purposes, easing curves, and React Native surface rules that `animate-expo` reads at the start of its build sequence.
- [improve-animations](./improve-animations.md) audits an existing codebase's animations or sweeps for missing motion opportunities and writes self-contained implementation plans.

**ask-joao** routes across the whole set when you are unsure which skill the situation wants.
