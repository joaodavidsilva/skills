---
name: ask-joao
description: Ask which skill or flow fits your situation. A router over the skills in this repo.
disable-model-invocation: true
---

# Ask Joao

You don't remember every skill, so ask.

Before stating what a skill does or recommending a step be skipped, read that skill's SKILL.md: the summaries here are for orientation only.

A **flow** is a path through the skills. Most paths run along one **main flow**, and two **on-ramps** merge onto it. Everything else is standalone, or a vocabulary layer that runs underneath.

## The main flow: idea → ship

The route most work travels. You have an idea and want it built.

1. **`/grill-with-docs`** sharpens the idea by interview. Start here whenever you are **working in a working directory**: it's stateful, retaining what it learns in `GLOSSARY.md` and ADRs. (No working directory? Use `/grill-me` instead, covered under Standalone. Both run the same `/grilling` primitive; `grill-with-docs` is the one that leaves a paper trail, which makes it the better of the two whenever a repo is there to leave it in.)
2. **Branch: can you settle every question in conversation?** If a question needs a runnable answer (state, business logic, a UI you have to see), detour through a prototype, bridged by **`/handoff`** in both directions (a prototype lives in its own directory, which is exactly what `/handoff` is for; see Phase boundaries):
   - **`/handoff`** out, then open a fresh session against that file,
   - **`/prototype`** to answer the question with throwaway code,
   - **`/handoff`** back what you learned, and reference it from the original idea thread.
3. **Branch: is this a multi-session build?**
   - **Yes** → **`/to-spec`** (turn the thread into a spec), then **`/to-tickets`** to split it into tracer-bullet tickets, each declaring its **blocking edges**. Then work the tickets one of two ways:
     - **`/implement`** per ticket, **`/clear`ing context between each one**. On a local tracker that's one file per ticket under `.scratch/<feature>/issues/`, worked blockers-first by hand; on a real tracker the edges become native blocking links, so any ticket whose blockers are done can be grabbed. Each ticket is self-contained, so the last one's context is disposable.
     - **`/implement-spec`** for the whole spec in one run. It reads the tickets as a **task graph**, runs implementer subagents across the ready **frontier** in parallel, and lands everything on one **integration branch**. Reach for it when you'd rather orchestrate the build than drive each ticket yourself.
   - **No** → **`/implement`** right here, in the same context window.

   Either way, the code gets built by driving **`/tdd`** (one red-green slice at a time) and closes out with **`/code-review`**, a two-axis review (Standards + Spec) of the diff. `/implement` runs both per ticket; `/implement-spec`'s implementers each drive `/tdd`, and it runs one `/code-review` over the integration branch. Reach for **`/tdd`** on its own when you just want to build a concrete behaviour test-first without a full spec, and **`/code-review`** on its own whenever you want to review a branch or PR against a fixed point.

   When the slice touches UI or motion, the agent pulls in **`/interface-polish`** on web (or **`/animate-expo`** on React Native / Expo) while building. Once a component renders with demo data, run **`/break-ui`** to throw schema-backed worst-case data at it behind a dev toggle before calling the UI done, and **`/interface-polish`** (`quick` or `full`) to review visual and motion craft alongside `/code-review`.

   When the work goes up as a pull request, **`/pr`** shapes the body: the smallest visual that shows the change, before/after evidence that it works, and a one-way or two-way door call. It's model-invoked, so the agent reaches for it whenever it writes a PR.

   **`/commit`** does the same for every commit along the way: a Conventional Commit, scoped in `GLOSSARY.md` terms, one type per commit. It's model-invoked too, and both `/implement` and `/implement-spec`'s implementers call it when they commit.

4. **`/retro`** closes the loop. After a build, and especially one that went sideways, it looks back over the session and suggests changes to the agent's **environment**, not the code: navigation pointers, automated checks, the coding standards `/code-review` enforces, steering files, tooling. Mechanical mistakes become deterministic checks; judgement calls become coding standards. The next build then starts from a better environment.

### Context hygiene

Keep steps 1–3 in **one unbroken context window** (don't compact or clear until after `/to-tickets`) so the grilling, spec, and tickets all build on the same thinking. Each `/implement` then starts fresh, working from the ticket. Run `/retro` in the session it's looking back on, before you clear; after clearing, point it at that session's log instead.

The limit on this is the **[smart zone](reference/SMART-ZONE.md)**: the window (~150k tokens on state-of-the-art models) within which the model still reasons sharply. If a session approaches it before `/to-tickets`, don't push on degraded; `/compact` at the nearest phase boundary and carry on (see Phase boundaries).

## On-ramps

A starting situation that generates work, then merges onto the main flow.

- **Bugs and requests piling up** → **`/triage`**. It moves issues through triage roles and produces agent-ready issues, which **`/implement`** later picks up.

  Triage is only for issues **you didn't create**: bug reports, incoming feature requests, anything that arrives raw. Tickets that `/to-tickets` produced are already agent-ready, so **don't triage them**.

- **Something's broken** → **`/diagnosing-bugs`**. For the hard ones: the bug that resists a first glance, the intermittent flake, the regression that crept in between two known-good states. It refuses to theorise until it has a **tight feedback loop** (one command that already goes red on *this* bug), then fixes with a regression test. Once the fix is in, run **`/retro`** in the same session to ask what would have prevented the bug; where the real finding is that there's no good seam to lock it down, that's a job for **`/improve-codebase-architecture`**.

- **A huge, foggy effort: a greenfield project or a huge feature build, too big for one session** → **`/wayfinder`**, the most cognitively demanding flow here. When the way from here to the destination isn't visible yet, it charts a **shared map** of **decision tickets** on the issue tracker and resolves them one at a time, producing **decisions, not deliverables**, until the fog is pushed back and the way is clear. Where **`/grill-with-docs`** sharpens an idea you can hold in one session, wayfinder is for the idea you can't, and it's slower and denser, so save it for exactly that, never a well-scoped feature.

  When the map clears, **it hands off, it doesn't build**: merge onto the main flow at **`/to-spec`**, which collapses the map's linked decisions into a buildable plan, then `/to-tickets` and `/implement` as usual. Looping the map straight into `/implement` skips that collapse and throws the linked detail away, so go straight to `/implement` only when the effort turned out genuinely small.

## Codebase health

Not feature work, just upkeep.

- **`/improve-codebase-architecture`** runs whenever you have a spare moment to keep the codebase good for agents to operate in. It surfaces **deepening opportunities**; picking one _generates an idea_ you can take into the main flow at `/grill-with-docs`. It's the survey that finds the candidates; **`/codebase-design`** (below) is the bench you design the chosen one on.
- **`/improve-animations`** is the motion counterpart to `/improve-codebase-architecture`: a **read-only survey and planner**, not an inline fixer. Reach for it when you want to audit all existing animations across a repo (default) or sweep a UI for places that don't animate yet but should (`opportunities` mode), then hand self-contained `plans/NNN-short-slug.md` specs to fresh executor sessions (`execute <plan>`). **Rule of thumb:** if you want to fix or review the component in front of you right now, use **`/interface-polish`** (or **`/animate-expo`** on Expo); if you want a prioritized roadmap across the codebase without touching source code yet, use **`/improve-animations`**.
- **`/dotore`** is the React Effect and State doctor: it runs the native `dotore` Rust analyzer (`dotore check --json` and `dotore report`) to surface unnecessary `useEffect` hooks, multi-effect **Render Cascades**, and cross-file JSX **Caller Sites**, then batch-applies deterministic `Autofix` rewrites (`dotore fix`), walks single-**Subject** `Surgical` recipes, and grills cross-**Subject** `Refactor` candidates with `/grilling`, `/codebase-design`, and `/domain-modeling`.

## Vocabulary underneath

Model-invoked references that run *beneath* the other skills, each the single source of truth for its vocabulary. Reach for them directly when the **words**, not the process, are the problem; or let the skills above pull them in.

- **`/domain-modeling`**: sharpen the project's *domain* language: challenge a fuzzy term, resolve an overloaded word ("account" doing three jobs), record a hard-to-reverse decision as an ADR. It's the active discipline `/grill-with-docs` drives to keep `GLOSSARY.md` a clean glossary.
- **`/codebase-design`** is the deep-module vocabulary (module, interface, depth, seam, adapter, leverage, locality) for designing a module's *shape*: a lot of behaviour behind a small interface at a clean seam. `/tdd` and `/improve-codebase-architecture` both speak it.
- **`/interface-polish`** is the checklist and review bar for web UI and motion craft (animation frequency gate, `<300ms` custom easing curves, springs and fluid gestures, typography, concentric radius, shadows and translucent materials, hover/press states and hit areas, icons, optical alignment, compositor performance, and mobile web viewport/touch rules). Model-invoked whenever the agent builds or reviews UI; type `/interface-polish quick` or `/interface-polish full` yourself when a screen or animation diff "feels off" or drops frames.
- **`/animate-expo`** is the React Native and Expo branch of that motion bar: it uses `/interface-polish` for the universal frequency and purpose gates, then makes the mobile-specific calls (UI-runtime worklets vs. React Native runtime, Reanimated 4 CSS transitions vs. shared values, Gesture Handler velocity handoff, native Expo Router `formSheet` / `NativeTabs` / `Link.Menu`, `react-native-keyboard-controller`, and same-frame haptics). Reach for **`/animate-expo`** whenever the target is Expo / React Native; reach for **`/interface-polish`** on the web.
- **`/animation-vocabulary`** is the reverse-lookup glossary from a visual or feel description ("the bouncy thing when a popover opens", "the iOS overscroll resistance") to its exact term (`Pop in`, `Rubber-banding`, `Origin-aware animation`). Reach for it **when you can picture the effect but don't know what word to prompt with**; once you have the term, hand it to `/interface-polish`, `/animate-expo`, or `/prototype` to build it.

## Phase boundaries

A **phase** is a chunk of work inside a session: the grilling, the implementation, the QA. At the **boundary** between two of them you have five options, and picking between them is the fuzziest decision in this whole map:

- **Continue**: stay put. Costs nothing, loses nothing.
- **`/clear`**: empty the window, when nothing here matters to what's next.
- **`/handoff`** writes a portable markdown file. Narrow: only for a **new harness**, a **new directory**, a **colleague**, or forking a side task **mid-phase**. What it buys is portability.
- **Subagent**: send a tightly-scoped task to its own window and get a report back.
- **`/compact`** compresses this context and seeds a fresh session with it. The **default**, at the bottom of the tree rather than the first reach.

Read [reference/PHASE-BOUNDARIES.md](reference/PHASE-BOUNDARIES.md) for the ordered tree: the five questions, the reasoning behind each branch, and why the primary-source cost makes **Continue** the one to rule out first. Make the decision **at** a boundary; mid-phase, continue or split the rest into subagents.

## Standalone

Off the main flow entirely.

- **`/grill-me`**: the same relentless interview as `/grill-with-docs`, but **stateless**: it saves nothing locally and builds no `GLOSSARY.md`. Reach for it when you are **not working in a working directory** (sharpening a plan, a design, a piece of writing, anything with no repo under it). If you are in a working directory, use `/grill-with-docs` instead: it runs the same interview and leaves a paper trail, so it is strictly the better one.
- **`/grilling`** is the interview primitive itself: rounds, the frontier, facts are the agent's job and decisions are yours. `/grill-me` and `/grill-with-docs` are the two named ways in, and `/triage`, `/wayfinder` and `/improve-codebase-architecture` all run it internally. Reach for it directly only when you want the interview with no wrapper around it.
- **`/prototype`** is a small, throwaway program that answers one design question: does this state model feel right, or what should this UI look like. Throwaway is a constraint on how the code is written, not a promise to destroy it: the answer folds into the real code, and the prototype itself is kept as a **primary source** on a `prototype/<name>` branch out of main, pointed at from the implementation issue. It's the detour in step 2 of the main flow, but reach for it any time a design question is hard to settle on paper.
- **`/break-ui`** stress-tests an existing UI component by feeding it plausible or schema-backed worst-case data (long compound names, unbreakable emails, single-letter names, missing optional fields, `0` / `1` / `1,000+` item counts, `320px` width, `200%` zoom, RTL) behind a dev-only `Demo data / Worst case` toggle, then reports every `Broken`, `Ugly`, and `Fragile` failure before fixing anything. **How to choose between the three UI skills:**
  - Don't know what the layout or interaction direction should be yet → **`/prototype`** (diverges into 3–5 radically different variants on named axes behind a visual picker).
  - Have a component that looks right with happy-path demo data and want to see what realistic edge-case data breaks → **`/break-ui`** (changes the fixture data, never the component, and reports layout/data breaks).
  - Have the right layout and data handling, and want the visual and motion details tuned or reviewed → **`/interface-polish`** (or **`/animate-expo`** on Expo).
- **`/research`**: delegate reading legwork to a **background agent**: it investigates a question against **primary sources**, then leaves a cited Markdown file in the repo. Keep working while it reads. The file it produces is something to take *into* the main flow at `/grill-with-docs`, since research feeds the thinking rather than replacing it.
- **`/to-questionnaire`** comes in when the thing blocking you isn't in your head or the codebase but in **someone else's**, and it writes them a questionnaire to fill in. It's the inverse of `/grill-me`: instead of interviewing you about the subject, it interviews you about the **send** (who it's going to, what you need back) and aims the questions at the gap. What comes back is material for `/grill-with-docs` or `/to-spec`.
- **`/wizard`** is for the steps only a **human** can take: provisioning infrastructure, setting up credentials or CI secrets, clicking through an unfamiliar third-party dashboard, running a one-off migration or cutover. It generates an interactive bash script that opens each URL, captures each value, and writes it into `.env` and GitHub secrets, so the procedure stops being something you re-explain to an agent every time. Model-invoked, so the agent reaches for it the moment it hits a wall only you can pass. If the agent could just do it itself, it should; this is for where a human is genuinely in the loop.
- **`/wait-what`** is the corrective for a message that didn't land. Use it mid-conversation, inside any other skill, and the agent re-pitches what it just said with the context you were missing, in plain English, using the `GLOSSARY.md` vocabulary. It works after the fact; `/grill-with-docs` is the upfront cure, because a shared language agreed early is what stops the jargon arriving at all.
- **`/teach`**: learn a concept over multiple sessions, using the current directory as a stateful workspace.
- **`/writing-for-agents`** is the reference for writing documents agents consume: skills, AGENTS.md, pointed-at docs.
- **`/beautify-readme`**: redesign a repository's `README.md` or create standalone README visuals (a project-native SVG hero, section headers, diagrams, hybrid SVG + raster cutouts, or opt-in GitHub-safe GIF motion). Model-invoked, and locks in `README` mode vs `asset-only` mode before touching any file.
- **`/imagegen-gemini`**: generate or edit bitmap images with Gemini (photos, illustrations, textures, mockups, and chroma-keyed transparent cutouts). Model-invoked, and called by `/beautify-readme` whenever you pick hybrid SVG composition.

## Precondition

**`/setup-joao-david-silva-skills`**: run before your first engineering flow to configure the issue tracker, triage labels, and doc layout the other skills assume. Custom issue trackers also work.