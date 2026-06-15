# Turn

One user message plus everything the [agent](./agent.md) does in response, up until it yields back to the user. Contains one or more model provider requests, and many if the agent calls [tools](./tool.md). A clarifying question closes the turn; your reply opens the next one. The hierarchy is [session](./session.md) **> Turn > Model provider request**.

What makes the turn worth naming is that its length is the agent's decision, not yours. You hand over one message; the agent decides how many tool calls to chain before yielding. A turn can be a one-sentence answer or twenty minutes of reading, editing, and running tests. That's the same property from two angles: long turns are what make [AFK](./afk.md) work possible, and long turns are also where things go wrong unsupervised, because by the time the agent yields, it may have drifted a long way from what you meant.

The turn is also the natural unit for steering. Everything inside a turn happens without you; the gaps between turns are where you redirect. Most [harnesses](./harness.md) soften this: you can interrupt mid-turn to stop the agent and redirect it, or type a message while it works, which gets read once the turn completes. If you find yourself repeatedly unhappy with where turns end up, the fix is usually to ask for smaller ones (a plan first, one step at a time), trading autonomy for more frequent gaps to steer in.

*Usage:*

"One turn took two minutes?"

"It made fourteen [tool calls](./tool-call.md) inside that turn, and each one is a separate model provider request. Latency stacks up before the agent finally yields back to you."
