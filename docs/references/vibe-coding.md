# Vibe coding

A working pattern where the user accepts the [agent](./agent.md)'s code without [human review](./human-review.md). The diff is treated as opaque: what matters is whether the program behaves, not what's inside. Automated review and [automated checks](./automated-check.md) may still run; vibe coding is silent on both.

The term comes from Andrej Karpathy, who coined it in early 2025: you "fully give in to the vibes" and "forget that the code even exists": describe what you want, accept what comes back, and judge it by running it.

Vibe coding trades inspection for speed. Reading diffs is usually the slowest step in agent-driven work, so dropping it removes the main bottleneck. For code whose failures are cheap ([prototypes](./prototyping.md), one-off scripts, internal tools), that's a reasonable trade. The risk scales with the code's lifespan and stakes.

The cost arrives later. Vibe-coded changes accumulate into a codebase nobody has read, and behaviour was the only thing checked, so anything behaviour doesn't surface (like a secret written to logs, a missing edge case, or quietly wrong data handling) ships unseen. The first time someone debugs the system is the first time anyone reads the code. With human review gone, whatever automated verification still runs (tests, types, automated review) is the only gate the code passes through. The same stance applied to a whole codebase, or part of one, whose changes come from a software factory is a dark factory.

*Avoid:* "vibe coding" as a synonym for "low-quality AI coding": the term names the review stance, not the resulting code.

*Usage:*

"Did you read what it changed in the auth flow?"

"Vibe coded it: login still works, that's all I checked."

"Read the diff before you push, vibing on auth is how secrets leak into logs."
