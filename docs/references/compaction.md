# Compaction

A handoff done in-memory: the previous [session](./session.md)'s history is summarised, and the summary seeds a fresh session. Lossy by design: the transcript is a [primary source](./primary-source.md), the summary a [secondary source](./secondary-source.md) — detail traded for headroom. Triggered manually by the user, or automatically via autocompact.

The mechanism: the [context window](./context-window.md) is finite, and a long session fills it — every tool result, every file read, every wrong turn stays in history. When it gets heavy, the [harness](./harness.md) asks the [model](./model.md) to summarise the session, throws the original history away, and seeds a fresh session with the summary. Whatever didn't make it into the summary is gone from the context. Some harnesses soften this by keeping the old transcript on disk and leaving a [context pointer](./context-pointer.md) to it in the summary — the secondary source links back to its primary source, so a detail the summary lost can be recovered by re-reading the original.

The summary is written by the model, so it can be prompted. "Preserve the schema decisions" makes the generated artifact more deliberate. Timing matters too — compact at a phase boundary, after the plan is settled, not mid-task.

Contrast with [clearing](./clearing.md), which drops everything and starts cold: compaction tries to carry the essentials across; clearing bets they're already written down somewhere better.

*Usage:*

"[Context](./context.md)'s getting heavy and I still have the test pass to do."

"Compact before you start — write what must survive into the summary prompt so the new session keeps the schema decisions and drops the exploration."
