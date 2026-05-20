# Tool

A function the [harness](./harness.md) exposes for the [agent](./agent.md) to call — Read, Write, Bash, Search. Tools are how an agent perceives and acts on the [environment](./environment.md): it can't see the environment except through tool results, and can't change it except through [tool calls](./tool-call.md). Each tool call costs an extra model provider request, since the result has to go back to the model before it can decide what to do next.

Tools most coding agents ship with:

| Tool   | What it does                                                                  |
| ------ | ----------------------------------------------------------------------------- |
| Read   | Returns a file's contents as a tool result                                    |
| Write  | Creates or edits a file in the filesystem |
| Bash   | Runs a shell command and returns its output                                   |
| Search | Finds files or text matching a pattern across the codebase                    |

![SVG Image]View Table

A tool is defined by three things: a name, a description of what it does, and a schema for its parameters. The harness sends these definitions to the [model](./model.md) with every request, and the model chooses a tool the same way it produces everything else — by writing [tokens](./token.md), in this case a structured call with arguments. The model never executes anything itself; the harness reads the call, runs the function, and sends back the result.

The tool list sets what the agent can do. A capable model with a narrow tool set is a narrow agent: it will route everything through whatever it has, which is why agents lean so heavily on Bash — a shell is one tool that reaches most of the system. To give an agent a capability cleanly, add a tool for it; [MCP](./mcp.md) is the standard for plugging in tools from outside the harness.

Tool definitions occupy [context](./context.md) on every request, so a large tool set has a standing cost before any tool is called — and many similarly-described tools make the model worse at picking the right one.

*Usage:*

"Can the agent query staging directly?"

"Add a `psql` tool to the harness, scoped read-only on staging. Without a tool for it, the agent's blind to anything outside the filesystem."
