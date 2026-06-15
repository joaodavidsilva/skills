# Human review

The user reading the code the [agent](./agent.md) produced and forming a judgement on it. Reading the diff or the changed files counts; reading the agent's *description* of what it did does not: narration is not the artifact. The description is a [secondary source](./secondary-source.md), written by the party being reviewed; the diff is the [primary source](./primary-source.md), and review means reading it.

Agents raise the volume of code produced, so review becomes the bottleneck. One useful idea is layering different review strategies. [Automated checks](./automated-check.md) catch the mechanical failures, automated review catches the describable ones, and human review is reserved for what only you can judge: whether the change is the right change, whether the approach fits the codebase, whether this should exist at all.

Review is also cheaper earlier. Reading a plan before work starts, or a small diff mid-flight, takes minutes; excavating a finished branch after an [AFK](./afk.md) run takes longer. Where you place the review checkpoint is a [human-in-the-loop](./human-in-the-loop.md) decision, not an afterthought.

*Avoid:* "code review" alone is ambiguous between human and automated.

*Usage:*

"I human-reviewed the AFK output."

"You read the diff or just the summary?"

"Diff. The summary said it deleted dead code. Turned out the function was called from a generated file."
