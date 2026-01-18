# React Native

Stack-specific form of the principles in [SKILL.md](../SKILL.md). Font smoothing and `text-wrap` have no React Native equivalent. Several APIs below need the New Architecture, so check the project's React Native version first.

- **Transition properties.** Reanimated 4 CSS transitions take `transitionProperty` and `transitionDuration`; list the exact properties.
- **Contextual icon animations.** Use Reanimated with `Easing.bezier(0.2, 0, 0, 1)`; its presets default to 300ms `Easing.inOut(Easing.quad)`. `filter: blur()` works on Android 12+ only, and iOS supports only `brightness` and `opacity`. `expo-blur` blurs the backdrop, not the element. Without a blur, animate `opacity` and `scale`.
- **Scale on press.** `Pressable` with `transform: [{ scale: 0.96 }]` while `pressed` snaps with no transition. For a transition, drive a Reanimated shared value from `onPressIn` and `onPressOut`.
- **Tabular numbers.** `fontVariant: ['tabular-nums']`, when the font has tabular figures.
- **Minimum hit area.** On iOS (React Native 0.88, New Architecture), `hitSlop` extended past an unclipped parent's bounds in a test. Verify parent clipping on Android. Targets are 44pt on Apple (the default control size; 28pt is the minimum) and 48dp with 8dp spacing on Android.
- **Shadows for elevation.** From React Native 0.76 on the New Architecture, use `boxShadow` (layered, supports inset). Older versions use `shadow*` props plus `elevation`.
- **Concentric radius.** `borderCurve: 'continuous'` gives smooth corners on iOS only.
- **Image outlines.** `outline*` style props exist on the New Architecture.
- **Skip animation on page load.** Wrap in Reanimated's `LayoutAnimationConfig` with `skipEntering`. `FlatList` has `skipEnteringExitingAnimations`. It skips only the initial mount; views added later inside it still animate.
- **Split and stagger.** Use `.delay(index * 100)` on the entering animation.
- **Reduced motion.** `AccessibilityInfo.isReduceMotionEnabled` and its `reduceMotionChanged` event. Reanimated's `useReducedMotion` returns the value read at app start. `ReducedMotionConfig` overrides the setting globally (`Always` or `Never`) or re-reads the startup value (`System`). For live changes, listen to `AccessibilityInfo`'s `reduceMotionChanged`. Apple advises against animating blurs under Reduce Motion.
