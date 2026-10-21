## What it does

`improve-animations` audits a codebase's existing animations or hunts for missing motion opportunities, then writes prioritized, self-contained implementation plans.

It is strictly read-only on source code: it surveys existing motion (`audit` mode) or hunts for missing motion (`opportunities` mode), gates every candidate against frequency and purpose, pauses for your selection, and writes self-contained `plans/NNN-short-slug.md` files for an executor [agent](../references/agent.md) to run in a separate [context window](../references/context-window.md). Rather than inventing curves or durations on the spot, it pulls every target value from [interface-polish](./interface-polish.md) and stamps each plan with the current git commit so a weaker [model](../references/model.md) can execute it later without conversation history.

## When to reach for it

You invoke this by typing `/improve-animations`, and the agent won't reach for it on its own.

Reach for it when an app's transitions feel sluggish, inconsistent, or abrupt and you want a structured audit and execution queue rather than ad-hoc tweaks in your current [session](../references/session.md).

| Your situation | Reach for |
| --- | --- |
| Existing animations feel slow, bouncy, uninterruptible, or inconsistent across the app | `/improve-animations` (runs `audit` mode by default) |
| The interface feels flat or abrupt and you want to find high-leverage places to add motion | `/improve-animations opportunities` |
| You already have a plan in `plans/` and want an isolated [subagent](../references/subagent.md) to implement and review it | `/improve-animations execute <plan>` |
| You are building or polishing a single component right now and want its motion tuned inline | [interface-polish](./interface-polish.md) |
| You are building native gestures, layout transitions, or haptics in Expo / React Native | [animate-expo](./animate-expo.md) |
| You want to survey a codebase for shallow modules and architectural deepening rather than UI motion | [improve-codebase-architecture](./improve-codebase-architecture.md) |

## Prerequisites

The skill leaves application source code untouched and writes its output into `plans/NNN-short-slug.md` and `plans/README.md` in your workspace (or `animation-plans/` if `plans/` is already used for something else).

It also requires [interface-polish](./interface-polish.md) to be installed, because both the planner and any audit subagents load `interface-polish` for the authoritative easing curves, duration budgets, spring configs, and review checklist.

## The 4-question gate and motion restraint

Adding motion everywhere makes an interface slower to use. Before any candidate in `opportunities` mode (or any missed-opportunity note in `audit` mode) survives into the report, it has to pass the **4-question gate** from `interface-polish`:

| Gate question | What it filters out |
| --- | --- |
| **1. Frequency**: how often does a user trigger this? | Anything used 100+ times a day (command palettes, keyboard navigation, row highlights) never animates; tens-of-times-a-day interactions stay at or under `150ms`. |
| **2. Purpose**: what job does the motion do? | Motion must provide feedback, keep spatial consistency, indicate state, bridge a jarring layout change, explain a concept, or spend a rare delight budget. |
| **3. Speed budget**: does it stay inside UI limits? | UI transitions stay under `300ms` with `ease-out` on entrances (`cubic-bezier(0.23, 1, 0.32, 1)`), never `ease-in` and never scaling from `scale(0)`. |
| **4. Function**: is the user trying to read or act on data? | Charts, tables, and live data the user is scanning do not animate for decoration. |

That discipline is **restraint**: high-frequency and keyboard-initiated animations are flagged as `HIGH`-severity bugs to delete in `audit` mode, and `opportunities` mode is required to show a **Rejected candidates** list naming the exact gate question that eliminated each rejected idea. Additive suggestions are capped at 5 to 7 for a whole application.

## Self-contained plans stamped with the git commit

Once you review the findings table and pick which items to pursue, the skill writes one `plans/NNN-short-slug.md` file per selection and updates `plans/README.md` with the execution order and dependencies.

Every plan is a **self-contained plan** written for an executor with zero conversation [context](../references/context.md). It embeds:

- The **git commit stamp** (`git rev-parse --short HEAD`) so an executor stops immediately if the target file has drifted since the plan was written.
- Exact `file:line` code excerpts of the current implementation alongside the target code with curves, durations, `transform-origin`, and `prefers-reduced-motion` rules inlined verbatim.
- An exemplar from your own repo showing where easing tokens or spring helpers already live, so the fix extends existing conventions.
- A **feel check** alongside mechanical checks: slow-motion replay at 10% speed in the DevTools Animations panel, spam-clicking to verify interruptibility, and `prefers-reduced-motion: reduce` verification.

## Common questions

**Why does it write plan files instead of editing my CSS or components directly?**

A motion audit across an app touches many components and requires loading reference files, grepping across the tree, and inspecting keyframes. Doing the audit and every fix in one session fills the context window and mixes high-level prioritization with file-by-file edits. Writing self-contained plans lets you choose which changes you actually want and hand each plan to a fresh executor session (or run `/improve-animations execute <plan>`) with clean context.

**Can I run it on just one category or adjust how deep the scan goes?**

Yes. Pass an [effort](../references/effort.md) level (`quick` for top high-traffic issues only, `standard` by default, or `deep` to include marketing pages and low-severity polish) or a category focus such as `/improve-animations performance` or `/improve-animations accessibility`. If you already know the exact animation change you want planned and want to skip the full audit, run `/improve-animations plan <description>`.

**What happens when code changes before I execute all the plans in `plans/`?**

Run `/improve-animations reconcile`. Because each plan carries the git commit hash from when it was written, `reconcile` checks the plans against the current codebase, marks completed plans `DONE`, refreshes stale `file:line` references, and retires findings that no longer apply.

## It's working if

- Source files remain untouched after the run; only `plans/NNN-short-slug.md` and `plans/README.md` are created or updated.
- Keyboard-triggered actions and 100+/day interactions are flagged for removal in `audit` mode, or appear under **Rejected candidates** in `opportunities` mode.
- The agent stops after presenting the prioritized table and waits for you to choose which items become plans.
- Every generated `plans/NNN-short-slug.md` includes a commit hash, verbatim before-and-after code blocks with explicit curves and durations, and a slow-motion **Feel check** section.

## Where it fits

`improve-animations` is **periodic maintenance** for UI motion: you run it to audit or discover motion work and queue it up as self-contained plans, then execute those plans one at a time. Its neighbours:

- [interface-polish](./interface-polish.md) owns the curves, duration budgets, 4-question gate, and review bar that `improve-animations` pulls into every audit and plan.
- [animate-expo](./animate-expo.md) handles native Expo and React Native motion (`react-native-reanimated`, `react-native-gesture-handler`, layout animations, and haptics) when you are building for native mobile rather than CSS or web motion libraries.
- [improve-codebase-architecture](./improve-codebase-architecture.md) runs the same read-only survey-then-choose pattern for module boundaries and architectural depth instead of UI motion.

When you are unsure which skill fits your situation across the whole set, **ask-joao** routes you.
