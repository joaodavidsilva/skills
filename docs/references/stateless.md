# Stateless

Carries no information forward. The [model](./model.md) is stateless across model provider requests — each request resends the full [context window](./context-window.md), because the model has no way to see anything else. An [agent](./agent.md) is stateless across [sessions](./session.md) by default: a new session starts empty, with no trace of prior ones. Counterpart to [stateful](./stateful.md).

The model itself is permanently stateless: its parameters are frozen after training, and nothing you do at inference changes them. The model doesn't learn from your corrections, doesn't remember being told the same thing yesterday, and isn't getting to know you — however much the conversation feels otherwise. The feeling of continuity within a session is manufactured by the [harness](./harness.md), which keeps the transcript and re-sends it with every request. The model isn't remembering the conversation; it's re-reading it.

The practical consequence: if you want something remembered across sessions, you have to write it down somewhere the agent will read it back. That's what [AGENTS.md](./agents-md.md) files, [memory systems](./memory-system.md), and handoff artifacts are — files that get loaded into the [context](./context.md) of future sessions, standing in for the memory the model doesn't have. When the agent keeps making a mistake you've corrected before, the question isn't why it didn't learn — it can't — but where that correction should be written down so every future session reads it.

*Usage:*

"Why does it forget the convention every time I [clear](./clearing.md)?"

"The model's stateless — the new session starts empty. If you want it carried, write it to AGENTS.md or a memory file the harness loads at session start."
