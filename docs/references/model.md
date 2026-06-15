# Model

The parameters. [Stateless](./stateless.md): does next-token prediction and nothing else. "Claude Opus 4.x" and "GPT-5.x" are models. On its own a model can't do anything agentic; it has to be [harnessed](./harness.md).

Models can't read files, run commands, browse the web, or remember yesterday. It takes [tokens](./token.md) in and predicts tokens out, once per model provider request. Everything that feels like an [agent](./agent.md) working (choosing [tools](./tool.md), reading results, looping until the task is done) is the harness orchestrating many of those predictions in a row.

Model providers ship models in tiers: a large one that's smartest but slow and expensive, and smaller ones that are faster and cheaper but less capable. Picking a tier is a real decision: heavyweight for planning and hard debugging, lightweight for mechanical changes, and harnesses let you switch mid-[session](./session.md).

Being strict about the word also sharpens diagnosis. "The model is bad at this" is a specific claim: the same model in a different harness, or with a different [context](./context.md), often behaves completely differently. Before blaming the model, check what it was given: most disappointing output traces back to context or harness, not parameters.

*Usage:*

"Should we switch the model from Sonnet to Opus for the planning step?"

"Try it, but the harness is doing most of the lifting on this task. The model swap won't help if the system prompt and tools are wrong."
