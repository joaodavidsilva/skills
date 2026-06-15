# AFK

Away from keyboard. A working pattern where the user kicks off a [session](./session.md) and leaves the [agent](./agent.md) to run unattended. The throughput multiplier of AI coding: many AFK sessions can run in parallel while you sleep, eat, or work on something else. Usually requires a permissive permission mode plus sandboxing to be safe.

When you're not there, the agent handles ambiguity differently. While you're watching, an ambiguous decision surfaces as a question and you answer it; once you've walked away, the agent picks a default and keeps going, and every later decision builds on that guess. The characteristic failure is coming back to hours of finished, confident work built on a wrong call made in the first ten minutes. The work isn't sloppy; it's coherent, just coherent about the wrong thing.

Since you can't give input during the run, give it before and after instead. Before: resolve the ambiguity up front (a [grilling](./grilling.md) session, a written [spec](./spec.md)) so there are fewer gaps for the agent to fill alone. During: [automated checks](./automated-check.md) and automated review stand in for the attention you're not giving, failing fast on what can be caught mechanically. After: the run ends in something reviewable: a PR, not changes already merged. AFK doesn't remove [human review](./human-review.md); it defers all of it to the end, which is why what arrives at the end has to be worth reviewing. This is also why AX matters most in AFK runs: with no one watching, the environment is the only support the agent gets.

*Avoid:* "background agent" centers the machine ("running in the background") rather than the human pattern ("user has walked away"). AFK names the fact that matters: the user isn't watching.

*Usage:*

"I'm running this AFK: three sandboxed agents on the refactor, reviewing the PRs in the morning."

"[Bypass permissions](./agent-mode.md)?"

"Yeah, read-only filesystem, no network."
