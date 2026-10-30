<p align="center">
  <img src="./assets/readme/hero-dark.webp#gh-dark-mode-only" width="100%" alt="Skills For Real Engineers: my daily agent skills for real engineering, not vibe coding. A mascot engineer in a hard hat and lab coat stands beside the main flow: /grill-with-docs, /to-spec, /to-tickets, /implement, /retro.">
  <img src="./assets/readme/hero-light.webp#gh-light-mode-only" width="100%" alt="Skills For Real Engineers: my daily agent skills for real engineering, not vibe coding. A mascot engineer in a hard hat and lab coat stands beside the main flow: /grill-with-docs, /to-spec, /to-tickets, /implement, /retro.">
</p>

Developing real applications is hard. Approaches like GSD, BMAD, and Spec-Kit try to help by owning the process, and in doing so they take away your control and make bugs in the process hard to resolve.

These skills are small, easy to adapt, and composable. They work with any model, and they're based on decades of engineering experience. Each one fixes a failure mode I keep seeing with Claude Code, Codex, and other coding agents:

<p align="center">
  <img src="./assets/readme/failure-modes-dark.svg#gh-dark-mode-only" width="100%" alt="Four agent failures and the skill for each: it didn't do what I want and it's too verbose are fixed by /grill-with-docs; the code doesn't work is fixed by /tdd and /diagnosing-bugs; a ball of mud is fixed by /improve-codebase-architecture and /to-spec.">
  <img src="./assets/readme/failure-modes-light.svg#gh-light-mode-only" width="100%" alt="Four agent failures and the skill for each: it didn't do what I want and it's too verbose are fixed by /grill-with-docs; the code doesn't work is fixed by /tdd and /diagnosing-bugs; a ball of mud is fixed by /improve-codebase-architecture and /to-spec.">
</p>

## Get started (30 seconds)

### 1. Get the skills

```bash
npx skills@latest add joaodavidsilva/skills # amp, pi
```

The skills install as editable files. Updates are manual.

### 2. Run `/setup-joao-david-silva-skills`

In your agent, run it once per repo. It will:

- Ask which issue tracker you use (GitHub, GitLab, local files, or anything else you describe)
- Ask which labels you apply to tickets when you triage them (`/triage` uses labels)
- Ask where you want to save any docs the skills create

### 3. Start with `/grill-with-docs`

Run [`/grill-with-docs`](./skills/engineering/grill-with-docs/SKILL.md) on your next change.

## How the skills fit together

Most work travels one **main flow**, from idea to ship. Bugs, big efforts, and prototypes join it from the side.

<p align="center">
  <img src="./assets/readme/workflow-dark.svg#gh-dark-mode-only" width="100%" alt="The main flow runs /grill-with-docs, /to-spec, /to-tickets, /implement, /retro. /prototype detours from grilling, /wayfinder feeds /to-spec, /triage feeds /implement, and /diagnosing-bugs leads to /retro.">
  <img src="./assets/readme/workflow-light.svg#gh-light-mode-only" width="100%" alt="The main flow runs /grill-with-docs, /to-spec, /to-tickets, /implement, /retro. /prototype detours from grilling, /wayfinder feeds /to-spec, /triage feeds /implement, and /diagnosing-bugs leads to /retro.">
</p>

Not sure which skill fits? Run [`/ask-joao`](./skills/engineering/ask-joao/SKILL.md) and describe your situation.

## Why these skills exist

Each failure mode above gets a fix grounded in a classic of software engineering.

### #1: The agent didn't do what I want

> "No-one knows exactly what they want"
>
> David Thomas & Andrew Hunt, [The Pragmatic Programmer](https://www.amazon.co.uk/Pragmatic-Programmer-Anniversary-Journey-Mastery)

**The problem.** The most common failure in software development is misalignment. You think the dev knows what you want, then you see what they built and realize they didn't understand you at all. The same communication gap exists between you and the agent.

**The fix** is a **grilling session**: the agent asks you detailed questions about what you're building before it builds anything.

- [`/grill-me`](./skills/productivity/grill-me/SKILL.md): for non-code uses
- [`/grill-with-docs`](./skills/engineering/grill-with-docs/SKILL.md): the same as [`/grill-me`](./skills/productivity/grill-me/SKILL.md), plus a shared language for your project (see #2)

These are my most popular skills. Use them _every_ time you want to make a change.

### #2: The agent is way too verbose

> With a ubiquitous language, conversations among developers and expressions of the code are all derived from the same domain model.
>
> Eric Evans, [Domain-Driven-Design](https://www.amazon.co.uk/Domain-Driven-Design-Tackling-Complexity-Software)

**The problem.** At the start of a project, devs and the people they're building for (the domain experts) speak different languages. Agents are dropped into a project and left to figure out the jargon as they go, so they use 20 words where 1 will do.

**The fix** is a shared language: a document that helps agents decode the project's jargon. It is built into [`/grill-with-docs`](./skills/engineering/grill-with-docs/SKILL.md), a grilling session that also builds that language with the agent and records hard-to-explain decisions in ADRs. It might be the single coolest technique in this repo.

> [!TIP]
> A shared language has other benefits besides less verbosity:
>
> - **Variables, functions and files are named consistently**, using the shared language
> - As a result, the **codebase is easier to navigate** for the agent
> - The agent also **spends fewer tokens on thinking**, because it has access to a more concise language

### #3: The code doesn't work

> "Always take small, deliberate steps. The rate of feedback is your speed limit. Never take on a task that’s too big."
>
> David Thomas & Andrew Hunt, [The Pragmatic Programmer](https://www.amazon.co.uk/Pragmatic-Programmer-Anniversary-Journey-Mastery/)

**The problem.** You and the agent are aligned on what to build, and it _still_ produces crap. Without feedback on how its code actually runs, the agent is flying blind.

**The fix** is the usual tranche of feedback loops: static types, browser access, and automated tests. For tests, a red-green-refactor loop is critical: the agent writes a failing test first, then makes it pass. That gives it a consistent level of feedback and far better code.

- [`/tdd`](./skills/engineering/tdd/SKILL.md): slots into any project. It encourages red-green-refactor and gives the agent plenty of guidance on what makes good and bad tests.
- [`/diagnosing-bugs`](./skills/engineering/diagnosing-bugs/SKILL.md): wraps best debugging practices into a disciplined loop, gated phase by phase.

### #4: We built a ball of mud

> "Invest in the design of the system _every day_."
>
> Kent Beck, [Extreme Programming Explained](https://www.amazon.co.uk/Extreme-Programming-Explained-Embrace-Change/dp/0321278658)

> "The best modules are deep. They allow a lot of functionality to be accessed through a simple interface."
>
> John Ousterhout, [A Philosophy Of Software Design](https://www.amazon.co.uk/Philosophy-Software-Design-2nd/)

**The problem.** Most apps built with agents are complex and hard to change. Agents radically speed up coding, so they also accelerate software entropy, and codebases get more complex at an unprecedented rate.

**The fix** is to care about the design of the code, and that is built into every layer of these skills:

- [`/to-spec`](./skills/engineering/to-spec/SKILL.md) quizzes you about which modules you're touching before creating a spec
- [`/improve-codebase-architecture`](./skills/engineering/improve-codebase-architecture/SKILL.md) surveys a codebase for deepening opportunities and hands you the candidates. I recommend running it every few days. It is a survey, not a rescue: on a genuinely old codebase it will find real candidates, but it won't untangle the mud for you.

## Reference

These split on one axis: who can invoke them. **User-invoked** skills are reachable only when you type them (e.g. `/grill-me`); their job is to orchestrate. **Model-invoked** skills can be invoked by you _or_ reached for automatically by the agent when the task fits; they hold the reusable discipline. A user-invoked skill may invoke model-invoked skills, but never another user-invoked one.

### Engineering

Skills I use daily for code work.

**User-invoked**

- **[ask-joao](./skills/engineering/ask-joao/SKILL.md)**: Ask which skill or flow fits your situation. A router over the user-invoked skills in this repo.
- **[grill-with-docs](./skills/engineering/grill-with-docs/SKILL.md)**: Grilling session that also builds your project's domain model, sharpening terminology and updating `GLOSSARY.md` and ADRs inline.
- **[triage](./skills/engineering/triage/SKILL.md)**: Move issues through a state machine of triage roles.
- **[improve-codebase-architecture](./skills/engineering/improve-codebase-architecture/SKILL.md)**: Scan a codebase for deepening opportunities, present them as a visual HTML report, then grill through whichever one you pick.
- **[setup-joao-david-silva-skills](./skills/engineering/setup-joao-david-silva-skills/SKILL.md)**: Configure this repo for the engineering skills (issue tracker, triage labels, domain doc layout). Run once per repo before using the other engineering skills.
- **[to-spec](./skills/engineering/to-spec/SKILL.md)**: Turn the current conversation into a spec and publish it to the issue tracker. No interview, just synthesizes what you've already discussed.
- **[to-tickets](./skills/engineering/to-tickets/SKILL.md)**: Break any plan, spec, or conversation into a set of tracer-bullet tickets, each declaring its blocking edges, written as text in a local file, or as native blocking links on a real tracker.
- **[implement](./skills/engineering/implement/SKILL.md)**: Build the work described by a spec or set of tickets, driving `/tdd` at pre-agreed seams and closing out with `/code-review` before committing.
- **[implement-spec](./skills/engineering/implement-spec/SKILL.md)**: Implement a whole spec on one integration branch. Works the tickets as a task graph, running implementer subagents across the ready frontier for maximum concurrency, then closes out with `/code-review`.
- **[wayfinder](./skills/engineering/wayfinder/SKILL.md)**: Plan a huge chunk of work, more than one agent session can hold, as a shared map of decision tickets on the issue tracker, and resolve them one at a time until the way to the destination is clear.
- **[retro](./skills/engineering/retro/SKILL.md)**: Suggest improvements to the coding agent's environment (navigation, automated checks, coding standards, steering files, tooling) after a session, most severe first.
- **[break-ui](./skills/engineering/break-ui/SKILL.md)**: Stress-test a UI component with realistic worst-case data behind a dev-only toggle and report what breaks.
- **[improve-animations](./skills/engineering/improve-animations/SKILL.md)**: Audit a codebase's animations or hunt for motion opportunities, then write self-contained implementation plans.
- **[security-audit](./skills/engineering/security-audit/SKILL.md)**: Audit a codebase for vulnerabilities with independently verified findings and a report, then leave a tracker-safe brief for `/to-tickets` or `/to-spec`.

**Model-invoked**

- **[prototype](./skills/engineering/prototype/SKILL.md)**: Build a throwaway prototype to answer a design question, either a single shareable HTML file for state/logic questions, or several radically different UI variations toggleable from one route.
- **[diagnosing-bugs](./skills/engineering/diagnosing-bugs/SKILL.md)**: Disciplined diagnosis loop for hard bugs and performance regressions: build a feedback loop that goes red on this bug → minimise → hypothesise → instrument → fix → regression-test.
- **[research](./skills/engineering/research/SKILL.md)**: Investigate a question against high-trust primary sources and capture the findings as a cited Markdown file in the repo, run as a background agent.
- **[tdd](./skills/engineering/tdd/SKILL.md)**: Test-driven development with a red-green-refactor loop. Builds features or fixes bugs one vertical slice at a time.
- **[domain-modeling](./skills/engineering/domain-modeling/SKILL.md)**: Actively build and sharpen a project's domain model: challenge terms against the glossary, stress-test with edge-case scenarios, and update `GLOSSARY.md` and ADRs inline.
- **[codebase-design](./skills/engineering/codebase-design/SKILL.md)**: Shared discipline and vocabulary for designing deep modules: a lot of behaviour behind a small interface, placed at a clean seam, testable through that interface.
- **[code-review](./skills/engineering/code-review/SKILL.md)**: Two-axis review of the diff since a fixed point: **Standards** (does it follow the repo's coding standards, plus a Fowler smell baseline?) and **Spec** (does it faithfully implement the originating issue/spec?), run as parallel sub-agents so neither pollutes the other.
- **[commit](./skills/engineering/commit/SKILL.md)**: Write a commit message as a Conventional Commit: the scope in your `GLOSSARY.md` terms, one type per commit, and a body that states the why.
- **[interface-polish](./skills/engineering/interface-polish/SKILL.md)**: Tune the small details that make an interface feel better: animation, typography, surfaces, hover states, hit areas, icons, and optical alignment.
- **[animate-expo](./skills/engineering/animate-expo/SKILL.md)**: Build React Native and Expo animations, gestures, sheets, screen transitions, and haptics on the UI thread with Reanimated 4, Gesture Handler, Expo Router, and `expo-haptics`.
- **[animation-vocabulary](./skills/engineering/animation-vocabulary/SKILL.md)**: Reverse-lookup a motion effect's exact term from a visual or feel description when you ask "what's it called when...".
- **[pr](./skills/engineering/pr/SKILL.md)**: The shape a pull request body should take: a summary as the smallest visual that makes the change clear, before/after evidence that it works, and a merge-danger call (one-way or two-way door, plus blast radius).
- **[wizard](./skills/engineering/wizard/SKILL.md)**: Generate an interactive bash wizard that walks a human through steps only they can perform: provisioning infrastructure, setting up credentials or CI secrets, walking an unfamiliar third-party dashboard, or running a one-off migration or cutover.
- **[swiftui](./skills/engineering/swiftui/SKILL.md)**: SwiftUI correctness and performance (state, composition, lists, navigation, animation, Liquid Glass, SDK 27 APIs), Swift concurrency safety and Swift 6+ migration, plus Instruments trace recording and analysis.

### Productivity

General workflow tools, not code-specific.

**User-invoked**

- **[grill-me](./skills/productivity/grill-me/SKILL.md)**: Get relentlessly interviewed about a plan or design until every branch of the design tree is resolved.
- **[handoff](./skills/productivity/handoff/SKILL.md)**: Compact the current conversation into a handoff document so another agent can continue the work.
- **[teach](./skills/productivity/teach/SKILL.md)**: Teach the user a new skill or concept over multiple sessions, using the current directory as a stateful teaching workspace.
- **[to-questionnaire](./skills/productivity/to-questionnaire/SKILL.md)**: Turn a decision you can't answer alone into a Markdown questionnaire for the one person who can, filled in async, or together over a meeting. It grills you about the send (who it's for, what you need back), not the subject.
- **[wait-what](./skills/productivity/wait-what/SKILL.md)**: Fire this the moment a message doesn't land. The agent re-pitches it with the context you're missing, in plain English, using your `GLOSSARY.md` vocabulary.

**Model-invoked**

- **[grilling](./skills/productivity/grilling/SKILL.md)**: Interview the user relentlessly about a plan, decision, or idea until every branch of the design tree is resolved. The reusable interview primitive behind `grill-me`, `grill-with-docs`, `triage`, `wayfinder` and `improve-codebase-architecture`.
- **[writing-for-agents](./skills/productivity/writing-for-agents/SKILL.md)**: Writing documents for agents: skills, AGENTS.md/CLAUDE.md, and any doc an agent reaches by a pointer.
- **[beautify-readme](./skills/productivity/beautify-readme/SKILL.md)**: Redesign a repository's README or create standalone README visual assets (pure SVG heroes, diagrams, section headers, hybrid cutouts, opt-in GIF motion).
- **[imagegen-gemini](./skills/productivity/imagegen-gemini/SKILL.md)**: Generate or edit raster images with Gemini (photos, illustrations, textures, mockups, and chroma-keyed transparent cutouts).
