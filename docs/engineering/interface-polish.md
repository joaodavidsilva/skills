## What it does

`interface-polish` is a checklist of the small details that decide whether an interface feels right: concentric border radius, optical alignment, layered shadows, tabular numbers, interruptible animations, hit areas, hover states, and the performance that keeps them smooth. The [agent](../references/agent.md) applies it when it builds or reviews UI, and tunes to the eye (_optical_) when the numbers and the render disagree.

The skill keeps its principles in one entry point and its detailed guidance in separate files, one per topic (typography, surfaces, animations, icons and alignment, performance, mobile web) plus one per stack (React, Angular, React Native). The agent reads only the files the change touches, so an animation tweak never loads the typography rules. It expresses every fix in the project's own styling system instead of adding a second one.

## When to reach for it

Type `/interface-polish`, or the agent reaches for it automatically when it builds or reviews UI, or when you say a screen "feels off".

| Your situation | Reach for |
| --- | --- |
| A new component that has to feel finished | `interface-polish` |
| A screen that works but feels off | `interface-polish`, as a review |
| A throwaway UI to answer a design question | [prototype](./prototype.md) |

## Common questions

**Can I choose how deep a review goes?**

Yes. Ask for a mode in the request: `/interface-polish quick` reports only the high and medium issues on the main path, capped at five findings. `/interface-polish full` covers the whole scope. Without a mode it runs `full`.

**Does it only work for React and Tailwind?**

No. The principles are written as plain CSS ideas, and the framework-specific forms live in their own files (React, Angular, React Native), which the agent reads only when the project uses that stack. Other stacks fall back to the CSS guidance.

## It's working if

- Nested rounded shapes keep an even gap at the corners.
- Counters and prices stop shifting width as they update.
- Small controls are easy to hit, and nothing sticks in hover on touch.
- Entering elements scale from near full size, never from nothing, and exits are quicker than enters.
- A review comes back as a table of before and after rows, each with the reason.

## Where it fits

A reach-for-it-anytime standalone, model-invoked during UI work. Inside the build chain it runs under [implement](./implement.md) whenever the ticket touches UI.

**ask-joao** routes across the whole set when you are unsure which skill the situation wants.
