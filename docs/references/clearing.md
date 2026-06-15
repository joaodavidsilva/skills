# Clearing

Ending the current [session](./session.md) and starting a fresh one. The next message begins with an empty session and an empty [context window](./context-window.md). Usually user-driven.

Clearing is the cure for a polluted context. A session accumulates everything: failed attempts, wrong turns, stale tool results, abandoned plans. The [model](./model.md) re-reads all of it on every [turn](./turn.md), and bad history drags on new work. Deep into a long session the [agent](./agent.md) gets vaguer and less obedient: instructions you gave clearly get ignored, quality slips, and prodding it to do better doesn't help, because the noise it's wading through is still in its [context](./context.md). Clearing removes the noise.

Clearing doesn't erase the conversation. Most [harnesses](./harness.md) keep session history on your computer, so the transcript is still there to read or resume. What's gone is the agent's working state: the model is [stateless](./stateless.md), so the new session knows nothing the old one knew. If the session holds decisions or progress the next one will need, have the agent write a handoff artifact first, then start the new session by pointing at it.

Compare [compaction](./compaction.md), which summarises the session into the new context instead of starting empty. Clearing is the blunter tool: nothing carries over, including the junk.

*Usage:*

"It's stuck looping on the failing test."

"Just clear it. Start a fresh session with the plan doc and the test file. No point fighting the existing context."
