# Context window

Everything the [model](./model.md) sees on each model provider request. Finite, model-specific, and the *only* surface through which the model perceives anything.

It's a single sequence of [tokens](./token.md): the system prompt, the conversation so far, every tool result the [harness](./harness.md) has fed back in. If something is in that sequence, the model can use it; if it isn't, the model doesn't know it exists: not your codebase, not the file you edited yesterday, not the instruction you gave three sessions ago. Anything outside the window has to be brought in, usually via a [tool call](./tool-call.md), before it can affect anything.

Finite means it fills up. Every turn appends more (your messages, the model's responses, tool results) and a long [session](./session.md) will eventually hit the limit, forcing [compaction](./compaction.md) or [clearing](./clearing.md). It also means everything in the window competes: each token you load is one less available for the rest, and content you didn't need still occupies the model's attention. The practical stance is to treat the window as a budget: load what the task needs, leave the rest out.

*Avoid:* "memory", because the context window is working state and doesn't persist across sessions. [Memory](./memory-system.md) is a separate concept layered on top.

*Usage:*

"Can I just paste the whole monorepo into the prompt?"

"The context window's 200k tokens, which is maybe a fifth of the repo. Pick the files the task touches, leave the rest behind a tool call."
