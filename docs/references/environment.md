# Environment

The world the [agent](./agent.md) acts on — anything outside the [harness](./harness.md) that the agent perceives through tool results and changes through [tool calls](./tool-call.md). The harness *runs* the agent; the environment is what the agent *works in*. A file like [`AGENTS.md`](./agents-md.md) lives in the environment; the harness is what loads it into the [context window](./context-window.md). A filesystem is the most common kind of environment, but not the only one (a database, a remote API, a browser session can all be environments).

The agent only sees the environment when it looks. Everything it knows about the environment arrived through a tool result, so its picture is a collection of snapshots, each accurate at the moment it was taken. If a file changes after the agent read it — you edit it by hand, a build step regenerates it — the agent keeps reasoning from the stale copy until something prompts a re-read. An agent confidently describing a file that no longer looks like that is usually this: the environment moved, the snapshot didn't.

The environment is also the layer that persists — the only one that is always [stateful](./stateful.md). A [session](./session.md)'s context is gone when the session ends, but files written to the environment remain for the next session to read — which is what [memory systems](./memory-system.md), handoff artifacts, and `AGENTS.md` rely on. Anything an agent should still know tomorrow has to end up in the environment.

You decide how big the environment is. A sandbox shrinks it, limiting what the agent can reach; adding a [tool](./tool.md) extends it, bringing a database or an API into reach. What's inside the boundary is what the agent can perceive and change; everything outside it doesn't exist for the agent. How well the environment is set up to support the agent's work is the codebase's AX.

*Avoid:* using "environment" for the runtime or the harness itself — the harness is the wrapper, the environment is the workspace.

*Usage:*

"The agent can't see the staging DB schema."

"Wire it into the environment — give it a `psql` tool scoped to read-only on staging. The harness is fine, it just has nothing to act on."
