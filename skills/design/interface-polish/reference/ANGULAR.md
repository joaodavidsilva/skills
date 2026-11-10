# Angular

Stack-specific form of the principles in [SKILL.md](../SKILL.md). `animate.enter` and `animate.leave` are stable from Angular 20.2. `@angular/animations` is deprecated since 20.2, with removal planned for v23. Use whichever API the project already has.

- **Interruptible animations.** Drive state with a class or attribute binding and a CSS transition, not an animation trigger.
- **Contextual icon animations.** Keep both icons in the template and toggle a class. This needs no animation API. Keep `scale`, `opacity`, and `blur` at the values in SKILL.md, with no bounce.
- **Split and stagger.** Set `animation-delay: calc(100ms * var(--index))` for semantic page chunks (or `30-80ms` per item for lists and grids) from an `--index` custom property on each item.
- **Subtle exit.** `animate.leave` waits for the CSS `animation` or `transition` end event. Give the exit a short duration.
- **Scale on press.** In the component, use `host: { ... }` with `:host(:active) { scale: 0.96 }` and `transition: scale 150ms ease-out`.
- **Reduced motion.** Wrap movement in `@media (prefers-reduced-motion: reduce)` and shorten durations to about `1ms` (or `animation: none` on `animate.leave` elements to remove them immediately).
- **Skip animation on page load.** `animate.enter` runs on the first render. To skip it, bind the class and read a flag at insertion: `[animate.enter]="ready() ? 'fade-in' : ''"`, with `ready` set in `afterNextRender`. Elements inserted later (an `@if` flipped after the flag) animate normally, and a `[class.x]` toggle does not skip anything.
- **Minimum hit area.** Extend with a pseudo-element in the component's CSS.
