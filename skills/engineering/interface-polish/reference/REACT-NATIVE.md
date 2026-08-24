# React Native

Stack-specific form of the principles in [SKILL.md](../SKILL.md). Font smoothing and `text-wrap` have no React Native equivalent. Several APIs below need the New Architecture, so check the project's React Native version first.

- **Transition properties.** Reanimated 4 CSS transitions take `transitionProperty` and `transitionDuration`; list the exact properties.
- **Contextual icon animations.** Use Reanimated with `Easing.bezier(0.2, 0, 0, 1)`; its presets default to 300ms `Easing.inOut(Easing.quad)`. `filter: blur()` works on Android 12+ only, and iOS supports only `brightness` and `opacity`. `expo-blur` blurs the backdrop, not the element. Without a blur, animate `opacity` and `scale`.
- **Scale on press.** Use a Reanimated 4 CSS transition on an `Animated.View` inside `Pressable` (`transitionProperty: 'transform'`, `transitionDuration: '150ms'`, `transitionTimingFunction: 'ease-out'`, with `transform: [{ scale: pressed ? 0.96 : 1 }]`), reserving shared values for continuous gestures.
- **Tabular numbers.** `fontVariant: ['tabular-nums']`, when the font has tabular figures.
- **Minimum hit area.** Extend small controls with `hitSlop` and verify parent clipping on Android. Targets are 44pt on Apple (the default control size; 28pt is the minimum) and 48dp with 8dp spacing on Android.
- **Shadows for elevation.** From React Native 0.76 on the New Architecture, use `boxShadow` (layered, supports inset). Older versions use `shadow*` props plus `elevation`.
- **Concentric radius.** `borderCurve: 'continuous'` gives smooth corners on iOS only.
- **Image outlines.** `outline*` style props exist on the New Architecture.
- **Skip animation on page load.** Wrap in Reanimated's `LayoutAnimationConfig` with `skipEntering`. `FlatList` has `skipEnteringExitingAnimations`. It skips only the initial mount; views added later inside it still animate.
- **Split and stagger.** Use `.delay(index * 100)` for semantic page chunks or `30-80ms` per item (`.delay(index * 50)`) for list and grid items on the entering animation.
- **Reduced motion.** `AccessibilityInfo.isReduceMotionEnabled` and its `reduceMotionChanged` event. Reanimated's `useReducedMotion` returns the value read at app start. `ReducedMotionConfig` overrides the setting globally (`Always` or `Never`) or re-reads the startup value (`System`). For live changes, listen to `AccessibilityInfo`'s `reduceMotionChanged`. Apple advises against animating blurs under Reduce Motion.
