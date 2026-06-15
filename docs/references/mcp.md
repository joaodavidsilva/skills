# MCP

**Model Context Protocol.** A protocol for plugging external tool servers into a [harness](./harness.md), which is how an [agent](./agent.md) gets [tools](./tool.md) beyond what the harness ships with. The agent never "calls MCP"; it calls a tool, and the harness happens to have gotten that tool from an MCP server. Also exposes resources (read-only data) and prompts (reusable templates), but tool provision is the primary use.

The protocol solves an integration problem. Without a standard, every harness would need its own Linear integration, its own Slack integration, its own database integration, written and maintained separately for each. With MCP, the integration is written once as a server, and any MCP-compatible harness can use it. The harness connects to the server, the server advertises what tools it offers, and those tools become available to the agent alongside the built-in ones.

The cost is paid in [context](./context.md). Every tool a server advertises arrives as a definition (name, description, parameter schema), and the [model](./model.md) can only call tools it knows about. The naive approach loads every definition into the [context window](./context-window.md) up front: install a few generous servers and a [session](./session.md) starts with thousands of [tokens](./token.md) of tool schemas before you've typed anything, spending attention budget on tools the task will never use.

Many harnesses now mitigate this with tool search: instead of the full definitions, the context holds a [context pointer](./context-pointer.md) to the available tools, and the agent searches for a tool by name or purpose and loads its definition only when it needs it. If your harness doesn't do this, the up-front cost still applies, and it's worth enabling only the servers a project actually needs.

*Usage:*

"The agent needs to read tickets from Linear."

"Configure the harness to use the Linear MCP server, which exposes the Linear API as tools the agent can call. Saves you writing custom tool wrappers."
