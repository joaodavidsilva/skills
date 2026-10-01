## What it does

`animation-vocabulary` is a reverse-lookup glossary that turns a visual or feel description of a motion effect into its exact name.

It is a naming reference that only names and disambiguates motion effects (`Origin-aware animation`, `Morph` vs `Crossfade` vs `Shared element transition`, `Rubber-banding`, `Stagger`), never designing an animation or writing code.

## When to reach for it

Type `/animation-vocabulary`, or the [agent](../references/agent.md) reaches for it automatically when you ask what a motion effect is called.

Reach for it when you can picture or feel an animation ("that iOS scroll where it resists and snaps back", "when a popover grows out of the button you clicked") and want the precise term to ask for in a [spec](../references/spec.md), prompt, or review. Once you have the name and want to build or review the motion itself, use one of its siblings:

| Your situation | Reach for |
| --- | --- |
| You can describe how an effect looks or feels, and need its name | `animation-vocabulary` |
| Polishing or reviewing UI details, easing curves, and surface rules | [interface-polish](https://aihero.dev/skills-interface-polish) |
| Building gestures, sheets, transitions, or haptics in Expo / React Native | [animate-expo](https://aihero.dev/skills-animate-expo) |
| Building throwaway UI variations to see how a screen or state model feels | [prototype](https://aihero.dev/skills-prototype) |

## Sensation to exact term, with disambiguation

Users describe what they see or feel ("springy", "draws itself in", "one image turns into another"), not the technical vocabulary. The skill maps that sensation to twelve glossary areas covering entrances and exits, sequencing (`Stagger`, `Orchestration`), transforms (`Origin-aware animation`), state transitions (`Morph`, `Crossfade`, `Shared element transition`, `Layout animation`), scroll, interaction feedback (`Rubber-banding`, `Hold to confirm`), easing, springs (`Velocity`, `Interruptible animation`), ambient loops, polish effects (`Clip-path`, `Mask`, `Tabular numbers`), performance (`Compositing`, `Layout thrashing`), and motion principles.

It quotes the glossary's definitions verbatim rather than paraphrasing, and when a description sits near a boundary between close concepts, it leads with the best match and contrasts the alternates in one line each so you can pick the exact one:

| What you describe | Primary match | Close alternates |
| --- | --- | --- |
| A popover growing from the button that opened it instead of its center | **Origin-aware animation** | **Transform origin** (the anchor point itself) |
| One shape or image turning into another | **Morph** | **Crossfade** (fading in the same spot), **Shared element transition** (travelling from one position into another) |
| Resistance and snap-back when dragging past a limit | **Rubber-banding** | **Bounce** (overshooting a target when settling) |
| Items appearing one after another in a cascade | **Stagger** | **Orchestration** (coordinating several different animations into one motion) |
| Hiding and revealing content with a shape | **Clip-path** (hard geometric edge) | **Mask** (soft, fadeable gradient edge) |

## Common questions

**Does it write the CSS or animation code for me?**

No. A naming question gets a name and a one-line definition, not an essay or a component. Once you know the term you want (for example, `Origin-aware animation` or `Rubber-banding`), ask the agent to build it with [interface-polish](https://aihero.dev/skills-interface-polish) on web or [animate-expo](https://aihero.dev/skills-animate-expo) on React Native.

**What if the effect I'm describing isn't a single term in the glossary?**

The skill never invents terminology outside its glossary. When no single entry matches, it names the closest term and says plainly that it is an approximation, or combines glossary terms to describe the compound effect (such as "a **stagger** of **scale-in** entrances").

## It's working if

- A "what's it called when..." question comes back immediately with a bold term and its verbatim one-sentence definition, not a long explanation.
- When two or three terms could fit your description, the reply lists the closest match first and contrasts the alternates in one line each.
- Compound effects are broken down using words from the glossary rather than invented jargon.
- It stops after naming the effect instead of writing unsolicited CSS or JavaScript.

## Where it fits

`animation-vocabulary` is a **reach-for-it-anytime standalone** and vocabulary reference, model-invoked whenever the words for motion are what is missing.

- [interface-polish](https://aihero.dev/skills-interface-polish) turns those named concepts (`Origin-aware animation`, `Stagger`, `Tabular numbers`, `Ease-out`) into concrete CSS and component rules.
- [animate-expo](https://aihero.dev/skills-animate-expo) implements the mobile and gesture equivalents (`Rubber-banding`, `Velocity`, `Interruptible animation`) on the UI runtime in Expo and React Native.
- [prototype](https://aihero.dev/skills-prototype) builds throwaway UI variants when you need to see several motion or layout directions side by side before committing.

**ask-joao** routes across the whole set when you are unsure which skill the situation wants.
