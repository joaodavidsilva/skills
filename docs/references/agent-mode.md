# Agent mode

A preset that shapes how the [agent](./agent.md) operates at runtime, bundling a permission mode with behavioral instructions injected into the system prompt. Examples: a default that prompts on risky calls, a **plan mode** that blocks edits and steers the agent toward research, an **accept-edits** mode that auto-approves edits, a **bypass permissions** mode (colloquially **YOLO mode**) that auto-approves everything. Can flip [mid-session](./session.md).

The bundling is what distinguishes a mode from a bare permission setting. A permission mode is only a gate: it decides which [tool calls](./tool-call.md) go through. A gate alone produces an agent that wants to edit but can't: it proposes the write, gets blocked, and tries another way. The injected instructions remove the want: plan mode doesn't just block edits, it tells the agent it's in a planning phase, so it reads, asks, and proposes instead of straining against the gate. Gate and steer point the same direction.

In practice, you change mode as your trust changes over the course of a task. The same task can pass through several modes: plan mode while the approach is still being shaped, the prompting default for the first delicate edits, accept-edits once the agent has shown it understands the change, bypass for an [AFK](./afk.md) run inside a sandbox. Changing mode costs you nothing: the conversation continues exactly where it was, with new permissions and new instructions. If you find yourself approving every prompt without reading it, the mode is set tighter than your actual trust; if you keep rejecting edits, it's set looser.

*Vendor terms:* Claude Code calls these "permission modes," Codex calls them "approval modes", and both predate behavioral bundling.

*Usage:*

"It keeps editing files when I just want a plan."

"Switch to plan mode. It'll block writes and stay in research."

"What about for the AFK run later?"

"Bypass mode, but only inside the sandbox."
