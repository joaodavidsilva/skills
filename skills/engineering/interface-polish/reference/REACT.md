# React

React forms of the principles in [SKILL.md](../SKILL.md) and [ANIMATIONS.md](ANIMATIONS.md). Tailwind classes shown here assume a Tailwind project; express them in the project's styling system otherwise.

## Motion library

Check the project's `package.json`. Import from `"motion/react"` when `motion` is installed, or from `"framer-motion"` when `framer-motion` is installed. If both exist, follow the imports already used by the component or its nearest peers. If neither is present, use the CSS patterns in ANIMATIONS.md and add no dependency just for icon transitions.

Spring config for contextual icons is `{ type: "spring", duration: 0.3, bounce: 0 }`. Bounce is always `0`.

## Contextual icon animation

```tsx
import { AnimatePresence, motion } from "motion/react";

function IconButton({ isActive, icon: Icon }) {
  return (
    <button>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={isActive ? "active" : "inactive"}
          initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
          transition={{ type: "spring", duration: 0.3, bounce: 0 }}
        >
          <Icon />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
```

Motion has spring physics; the CSS cross-fade approximates it with `cubic-bezier(0.2, 0, 0, 1)`.

## Staggered enter

Use `staggerChildren: 0.1` (`~100ms`) between semantic page chunks (title, description, actions) and `0.03` to `0.08` (`30-80ms`) between individual list or grid items:

```tsx
const item = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

function PageHeader() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
    >
      <motion.h1 variants={item}>Welcome</motion.h1>
      <motion.p variants={item}>A description of the page.</motion.p>
      <motion.div variants={item}>
        <Button>Get started</Button>
      </motion.div>
    </motion.div>
  );
}
```

## Exits

```tsx
// Subtle: a small fixed y indicates direction without drama
<motion.div
  exit={{ opacity: 0, y: -12, filter: "blur(4px)", transition: { duration: 0.15, ease: "easeOut" } }}
/>

// Full: use when spatial context is important (a card returning to a list)
<motion.div
  exit={{ opacity: 0, x: "-100%", transition: { duration: 0.2, ease: "easeOut" } }}
/>
```

## Scale on press

```tsx
<motion.button whileTap={{ scale: 0.96 }}>Click me</motion.button>
```

For a button component that can opt out, extract the class and apply it from a `static` prop:

```tsx
const tapScale = "active:not-disabled:scale-[0.96]";

function Button({ static: isStatic, className, children, ...props }) {
  return (
    <button
      className={cn("transition-transform duration-150 ease-out", !isStatic && tapScale, className)}
      {...props}
    >
      {children}
    </button>
  );
}

<Button>Click me</Button>      {/* scales on press */}
<Button static>Submit</Button> {/* no scale */}
```

## Skip animation on page load

`initial={false}` on `AnimatePresence` stops enter animations on first render:

```tsx
<AnimatePresence initial={false} mode="popLayout">
  <motion.span
    key={isActive ? "active" : "inactive"}
    initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
    exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
  >
    <Icon />
  </motion.span>
</AnimatePresence>
```

Use `initial={false}` on toggles, icon swaps, and tabs that should render in their initial state without animating on mount. Omit `initial={false}` when a component relies on its `initial` prop for an intentional first-load reveal, such as a staggered page hero.
