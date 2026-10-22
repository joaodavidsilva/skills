## What it does

`grilling` is the interview loop that stress-tests a plan, a decision, or an idea before anyone acts on it. It maps the subject as a **design tree**: every decision branches into the decisions that hang off it, and interviews you branch by branch until no assumption stays unstated.

It asks **one question at a time** from the **frontier**: the set of decisions whose prerequisites are already settled. A question that hinges on an answer still open waits until its prerequisite is resolved. Each answer you give prunes branches that no longer apply, pushes the frontier outward, and unblocks the next questions.

## When to reach for it

Type `/grilling`, or the [agent](../references/agent.md) reaches for it on its own when a task fits. It is the only [skill](../references/skill.md) in the grilling family that is model-invoked, so you rarely type it. Usually a skill you *did* type runs it for you.

Typing `/grilling` directly gets you the plain interview and nothing else. Where you want something more than that:

| What you have | Reach for |
| --- | --- |
| You aren't working in a working directory | [grill-me](./grill-me.md): the same [session](../references/session.md), under a name the agent will never fire by itself |
| You are in a working directory | [grill-with-docs](../engineering/grill-with-docs.md): the same session, and it writes `GLOSSARY.md` and ADRs as it goes |
| An effort too big to hold in one session | [wayfinder](../engineering/wayfinder.md): it charts a map and runs grilling inside the decision tickets |
| A question that talking cannot settle: how something should look or feel | [prototype](../engineering/prototype.md): build the throwaway version, then come back |
| A skill of your own that needs an interview | Invoke `/grilling` from it, rather than writing another interview |

## The tree, the frontier, and who decides

The skill rests on three ideas.

The **design tree** is the model of the subject: decisions with decisions hanging off them. The **frontier** is the set of decisions whose prerequisites are all settled: the only questions the agent can ask yet. The agent picks the highest-leverage question on the frontier, asks it, waits for your answer, and recomputes the frontier before asking the next one.

Every question has a fixed format: titled behind a `❓`, then a concise body, then the agent's recommended answer alone on a `➡️` line, worded so "yes" accepts the recommendation. The format has one known problem. The recommendation sometimes argues *against* the question as it was worded, so agreeing with the recommendation means answering "no" to the question. When that happens, answer the recommendation and say so.

The other half of the design is the split between facts and decisions. Facts are the skill's own job. When a frontier question needs something the [environment](../references/environment.md) can settle, the agent dispatches a [sub-agent](../references/subagent.md) to find out rather than asking you. It does not block on that research; only the questions that depend on it wait while the agent asks another ready question from the frontier. Decisions are yours, and the agent must wait for them. An agent running `grilling` that answers its own decisions has broken the skill. The session ends when the frontier is empty. The agent then waits for you to confirm a shared understanding before it acts on what you agreed.

## What lives here and what lives in the wrappers

This page covers the mechanism. The wrapper skills' pages answer the questions people ask most often.

| Question | Where it is answered |
| --- | --- |
| The tree, the frontier, one question at a time, the question format, facts vs decisions | Here |
| How long a session should run, what to do with a question you can't answer by talking, how to avoid nodding along | [grill-me](./grill-me.md) |
| What gets written to `GLOSSARY.md`, what becomes an ADR | [grill-with-docs](../engineering/grill-with-docs.md) |

## Common questions

**Can I ask for a whole round of questions at once instead of one at a time?**
Yes. Add this to your global `CLAUDE.md` (or ask in the prompt):

```
When grilling, ask the whole frontier of independent questions in one numbered round.
```

One question at a time is the default because each answer reshapes the design tree and often prunes questions that would have been asked in the same batch.

**It ran out of questions and started building.**
The confirmation gate exists for this. The skill is finished when you say the understanding is shared, not when the frontier empties. Weaker and faster [models](../references/model.md) still skip the gate. Users report this most often on lower-effort or non-frontier models, which collapse "interview until shared understanding" into a couple of questions and an outline. If yours does it, the reliable fix is a line in your own `AGENTS.md` or `CLAUDE.md` telling the agent not to implement without permission.

**It answered its own questions instead of asking me.**
That is a bug in the run, and it is the reason the skill's text separates facts from decisions. It happens most when another skill runs `grilling` to resolve a ticket, and the agent takes that task as permission to keep moving. The same constraint is why there is no async mode. People have asked for a variant that reads a GitHub issue and posts one consolidated decision memo, and that is a different skill, because a grilling session that nobody answers has produced the agent's opinion rather than yours.

**Can I cap the number of questions?**
No, and a cap is out of scope on purpose. Some plans need three questions and some need fifty; a fixed ceiling either truncates the hard case or feels arbitrary on the easy one. The intended control is plain language. Tell it to wrap up, or stop and accept the plan where it stands. If a session is running very long, the cause is usually that the scope was too big; break the work up and grill the pieces.

**I installed `grill-me` on its own and nothing happens.**
`grill-me` is a one-line skill whose whole body is "run a `/grilling` session", so it needs this skill installed too. The same is true of `grill-with-docs`, which additionally needs [domain-modeling](../engineering/domain-modeling.md). Installing the whole set avoids the problem; installing selectively means installing the primitives as well.

**`grill-with-docs` ran, but it never loaded `grilling`.**
This is a real bug, still unfixed, and users report it across [harnesses](../references/harness.md) and models. A skill that names another skill does not reliably cause that skill to load, and `grill-with-docs` names two. The sign is a session that asks everything at once with no recommendations. That means the model is improvising an interview rather than running this one. Asking the agent directly whether it loaded `grilling` and `domain-modeling` usually recovers it.

## It's working if

- Each question arrives one at a time, titled behind a `❓`, with its recommendation on a separate `➡️` line so "yes" accepts it.
- No question depends on another decision that is still unsettled.
- Later questions ask things earlier turns could not have asked, and skip branches your answers already ruled out.
- It goes and looks facts up (reading files, dispatching a sub-agent) rather than asking you something it could have found out.
- Research running in the background does not stall the interview; only the questions that depend on it wait.
- It stops at the end and asks you to confirm the understanding is shared, instead of starting work.

## Where it fits

`grilling` is a **primitive**, not a step you schedule: the single source of truth for the interview technique, kept in one place so every skill that needs an interview reaches for it instead of inventing one. [grill-me](./grill-me.md) and [grill-with-docs](../engineering/grill-with-docs.md) are its two user-invoked front doors, and `grill-with-docs` is where the main build chain begins, ahead of [to-spec](../engineering/to-spec.md). [wayfinder](../engineering/wayfinder.md) runs it to resolve decision tickets, [triage](../engineering/triage.md) to grill a vague report into a workable one, and [improve-codebase-architecture](../engineering/improve-codebase-architecture.md) to walk the tree once you have picked a candidate to deepen. When you are unsure which entry point fits, **ask-joao** routes you.
