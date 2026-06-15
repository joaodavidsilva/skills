# Stateful

Carries information forward. A [session](./session.md) is stateful across [turns](./turn.md): [context](./context.md) accumulates as the session runs, which is why long sessions drift into the [dumb zone](./smart-zone.md). An [agent](./agent.md) can be made stateful across **sessions** by adding a [memory system](./memory-system.md) that persists information into the [environment](./environment.md) and reloads it at the start of future sessions. The [model](./model.md) is never stateful; any apparent continuity is the [harness](./harness.md) re-feeding context. Counterpart to [stateless](./stateless.md).

Where state lives at each layer:

| Layer       | Stateful?       | How                                                                                                                                                    |
| ----------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Model       | Never           | Parameters are frozen; it sees only what's in each request                                                         |
| Session     | Across turns    | The harness appends every message and tool result to the context                                                  |
| Harness     | Across sessions | Memory files, [AGENTS.md](./agents-md.md), handoff artifacts: written down, reloaded later |
| Environment | Always          | Files persist whether or not any session is running                                                                                                    |

![SVG Image]View Table

Each layer's statefulness is built by re-reading something stored a layer below: the session feels continuous because the harness re-sends the message history to the stateless model, and the agent remembers across sessions because the harness re-loads files from the environment. No state is ever stored in the model itself.

State isn't always wanted. Everything carried forward influences what comes next, so a wrong assumption made early in a session is carried forward too. [Clearing](./clearing.md) is the deliberate act of throwing session state away and starting from what's written down.

*Usage:*

"It remembered my preferences from yesterday. Does that mean the model learned them?"

"No, the agent's stateful because the harness wrote them to a memory file and reloaded them at session start. The model itself saw nothing of yesterday."
