# Session

One bounded run of interaction with an [agent](./agent.md). Starts empty, accumulates messages, tool results, and files read, and ends when [cleared](./clearing.md), closed, or [compacted](./compaction.md) into a fresh session. The session is what *fills* the [context window](./context-window.md): if the context window is the box, the session is the stuff slowly filling it up. Work too large for a single context window must be split across sessions.

The session's message history is the agent's working memory. The [model](./model.md) is [stateless](./stateless.md), so everything it appears to remember — what you asked for, what the tests said, what it decided three turns ago — is in the message history, re-sent with every model provider request. Whatever isn't in the session doesn't exist for the agent.

That memory ends with the session. A new session starts from nothing: the agent that knew your codebase well at the end of yesterday's session knows none of it this morning. What survives is the filesystem — files written during one session can be read by the next, which is what handoffs, [memory systems](./memory-system.md), and [AGENTS.md](./agents-md.md) rely on.

You choose where a session ends. Everything in a session influences every later [turn](./turn.md), so unrelated tasks done in one session leave residue that colours the next answer. One task per session keeps the context relevant; finishing a task is a natural point to clear.

*Usage:*

"How long can one session run before it falls apart?"

"Depends on the work — a focused refactor stays sharp longer than open-ended research. Once the session bloats, hand off or compact, don't push through."
