# Animations

## Interruptible Animations

Users change intent mid-interaction. If animations aren't interruptible, the interface feels broken.

| | CSS Transitions | CSS Keyframe Animations |
| --- | --- | --- |
| **Behavior** | Retarget mid-animation toward the latest state | Run on a fixed timeline and restart from the beginning |
| **Use for** | Interactive state changes (hover, toggle, open/close) | Staged sequences that run once (enter animations, loading) |

```css
/* Good: interruptible transition for a toggle */
.drawer {
  transform: translateX(-100%);
  transition: transform 200ms ease-out;
}
.drawer.open {
  transform: translateX(0);
}
/* Clicking again mid-animation smoothly reverses */
```

**Rule:** Use CSS transitions for interactive elements. Reserve keyframes for one-shot sequences.

## Enter Animations: Split and Stagger

Use this pattern for infrequent staged entrances where sequence helps communicate hierarchy, such as the first load of a page hero, success state, or empty state. Break a large container into semantic chunks and animate each individually. Routine interactions such as row hovers, keystrokes, or repeated tab changes get no stagger.

1. **Split** into logical groups (title, description, buttons)
2. **Stagger** with ~100ms delay between groups
3. **For titles**, consider splitting into individual words with ~80ms stagger
4. **Combine** `opacity`, `blur`, and `translateY` for the enter effect

```css
.stagger-item {
  opacity: 0;
  transform: translateY(12px);
  filter: blur(4px);
  animation: fadeInUp 400ms ease-out forwards;
  animation-delay: calc(100ms * var(--index));
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

Exit animations are softer and less attention-grabbing than enter animations. The user's focus is moving to the next thing, so the exit should not fight for attention.

```css
/* Good: subtle exit */
.item-exit {
  opacity: 0;
  transform: translateY(-12px);
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}

/* Bad: dramatic exit that steals focus */
.item-exit {
  opacity: 0;
  transform: translateY(-100%) scale(0.5);
  transition: all 400ms ease-out;
}

/* Sometimes correct: remove immediately when motion adds no context */
.item-exit {
  display: none;
}
```

- Use a small fixed `translateY` (e.g., `-12px`) instead of the full container height.
- Keep some directional movement to indicate where the element went.
- Exit duration is shorter than enter duration (150ms vs 300ms).
- Slide fully out only when spatial context matters (a card returning to a list, a drawer closing).
- Remove immediately when motion adds no information, the interaction repeats frequently, or reduced motion is requested.

## Contextual Icon Animations

When icons appear or disappear contextually (on hover, on state change), animate them with `opacity`, `scale`, and `blur` rather than toggling visibility. The exact values live in SKILL.md under Contextual Icon Animations.

Keep both icons in the DOM and cross-fade them with CSS transitions. Because neither icon unmounts, both enter and exit animate smoothly. One icon is absolutely positioned on top of the other: toggling state scales the entering icon up from `0.25` while the exiting icon scales down to `0.25`, both with opacity and blur.

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

The non-absolute icon defines the layout size. The absolute icon overlays it without affecting flow.

| Animate | Don't animate |
| --- | --- |
| Icons that appear on hover (action buttons) | Static navigation icons |
| State change icons (play → pause, like → liked) | Decorative icons |
| Icons in contextual toolbars | Icons that are always visible |
| Loading/success state indicators | Icon labels (text next to icon) |

## Scale on Press

A subtle scale-down on click gives buttons tactile feedback. Press scale is `0.96`. Use CSS transitions for interruptibility: if the user releases mid-press, it should smoothly return. Not every button needs this; let a button opt out when the motion would be distracting.

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

## Skip Animation on Page Load

Elements already in their default state skip the enter animation on first render; they animate only on subsequent state changes. This suits icon swaps, toggles, tabs, and segmented controls.

It breaks components that rely on their initial state to set up a first-time enter, like a staggered page hero or a loading state: skipping the initial animation skips the entire entrance. Verify the component still looks right on a full page refresh before applying it.

## Motion Restraint

Motion is a budget, not a garnish:

- **High-frequency interactions get no custom animation.** Repeated interactions get instant feedback or a minimal `opacity` or `background-color` transition at ≤150ms.
- **Every animated state change also carries a static cue** such as color, icon, or label.
- **Brief and precise beats prominent.** If a shorter, smaller animation communicates the same thing, use it.
- **Honor reduced-motion preferences.** Preserve the static cue and remove unnecessary movement.

```css
/* Good: high-frequency hover gets a minimal transition */
.row:hover {
  background-color: var(--surface-hover);
  transition: background-color 100ms ease-out;
}

/* Bad: every hover replays a full entrance */
.row:hover .row-icon {
  animation: bounceIn 500ms;
}
```
