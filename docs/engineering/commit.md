## What it does

`commit` defines how the [agent](../references/agent.md) writes a commit message. It is a format reference, not a workflow: it does not stage files or run the commit. It tells the agent what the message should look like when it writes one.

The message is a Conventional Commit with the standard types. The agent already knows that format, so the skill spends its words on the three things the default gets wrong:

- **Scope in your domain language.** The scope is the term from `GLOSSARY.md` for the part of the domain the change touches, not a folder or file name. When no single term fits (no glossary, CI or dependency work, a change across several terms), the commit has no scope, which Conventional Commits allows and changelog tools read as "applies everywhere".
- **One type per commit.** A diff that needs two types is two commits, which gives the agent a checkable reason to split a commit that grew too large.
- **A body that states the why.** The diff already shows what changed. The body carries the constraint, the cause, or the decision. When the subject says it all, there is no body.

## When to reach for it

Type `/commit`, or the agent reaches for it automatically whenever it is writing a commit message.

| Your situation | Reach for |
| --- | --- |
| The work is done and needs a commit message | `commit` |
| A ticket to build and commit | [implement](https://aihero.dev/skills-implement), which calls `commit` for the message |
| A whole spec to build | [implement-spec](https://aihero.dev/skills-implement-spec), whose implementers call `commit` |
| The branch is ready for review and needs a body | [pr](https://aihero.dev/skills-pr) |

## Common questions

**Does it make the commit for me?**

No. `commit` covers only the message. [implement](https://aihero.dev/skills-implement) commits to the current branch and calls `commit` to write the message. `commit` never creates a branch.

**Why doesn't it list the types or explain the format?**

The agent already knows Conventional Commits, so spelling out the types, the `!` marker, or the `BREAKING CHANGE:` footer would repeat what it does anyway. If you see it inventing types, add the list to your copy of the skill.

## It's working if

- Every commit subject is a Conventional Commit with a standard type.
- Scopes are words you recognise from your glossary, not directory names, and commits with no fitting term carry no scope.
- No commit mixes a `feat` with a `fix`.
- Bodies explain why, and short commits have none.

## Where it fits

`commit` is model-invoked, so it fires whenever the agent writes a commit message. In the build chain `to-spec → to-tickets → implement → code-review → pr → retro`, it sits inside `implement`, at the commit.

- [implement](https://aihero.dev/skills-implement) and [implement-spec](https://aihero.dev/skills-implement-spec) call it when they commit.
- [pr](https://aihero.dev/skills-pr) shapes the body once the commits exist.

**ask-joao** routes across the whole set when you are unsure which skill the situation wants.
