# Memory system

A system that attempts to make an [agent](./agent.md) [stateful](./stateful.md) across [sessions](./session.md). Persists information into the [environment](./environment.md) during a session and reloads it into the [context window](./context-window.md) at the start of future ones, so the agent carries continuity beyond the user [clearing](./clearing.md) the session.

A memory system has two halves. The write path: during a session, the agent records what it learned (a preference you stated, a fact about the project) as files in the environment. The read path: at session start, the [harness](./harness.md) loads those files, or an index of them, back into the context window. Many harnesses ship their own memory system (Claude Code's `/memory` is one), but you can also build one yourself: a directory of notes plus an instruction in [AGENTS.md](./agents-md.md) to consult it.

The same trade-offs as any always-loaded content apply. Memories accumulate, so most systems load a one-line index and leave the bodies behind [context pointers](./context-pointer.md) rather than inlining everything. And memories are [secondary sources](./secondary-source.md), so they drift: a fact recorded in March is loaded with equal confidence in June, after the project has moved on. A memory system needs pruning, the same way AGENTS.md does.

*Usage:*

"I keep having to re-tell it I'm on Postgres, not MySQL."

"Wire up a memory system: write what it learns to the filesystem on the first [turn](./turn.md), and reload it at session start. The [model](./model.md) itself is [stateless](./stateless.md); the memory layer fakes continuity."
