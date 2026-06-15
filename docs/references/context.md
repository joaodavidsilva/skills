# Context

The relevant information the [agent](./agent.md) has access to right now. The abstract noun, not the raw input the model sees (that's the [context window](./context-window.md)), not the running history (that's the [session](./session.md)), but *what the agent knows that's pertinent to the task*. "Loading something into context" means making it part of this set; "context engineering" is the discipline of curating it.

The three terms separate cleanly:

| Term           | What it names                                                                        |
| -------------- | ------------------------------------------------------------------------------------ |
| Context        | The task-relevant information the agent currently has                                |
| Context window | The literal [token](./token.md) sequence the model sees per request |
| Session        | The running conversation the [harness](./harness.md) stores         |

![SVG Image]View Table

The separation matters because context is a measure of quality, not quantity. A context window can be nearly full and the context still poor: thousands of tokens of stale tool output, none of it about the task at hand. It can also be nearly empty and the context excellent: the one type definition the task turns on.

Most day-to-day failures trace back to context. When the agent invents an API, contradicts a decision, or guesses at a schema, the first question is what was in context when it did. Usually the relevant fact was never loaded, or was buried under attention degradation. The fix is curation: load what the task needs, keep out what it doesn't.

*Usage:*

"It keeps inventing fields that aren't in the type."

"The type file isn't in context. It's reading the call sites and guessing. Read the definition in first."
