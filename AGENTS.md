Skills are organized into bucket folders under `skills/`:

- `planning/`: from idea to spec, tickets, and shipped code
- `thinking/`: sharpening a plan, decision, or question before building
- `quality/`: review, tests, diagnosis, commits, and PRs
- `design/`: UI, motion, and visual craft
- `setup/`: per-repo configuration, agent steering files, and human-only steps
- `in-progress/`: beta: public on purpose, feedback wanted

Every bucket except `in-progress/` is **promoted**, and every skill in a promoted bucket must have a reference in the top-level `README.md`. Skills in `in-progress/` must not appear there.

Each skill entry in the top-level `README.md` must link the skill name to its `SKILL.md`.

Each bucket folder has a `README.md` that lists every skill in the bucket with a one-line description, with the skill name linked to its `SKILL.md`. The promoted buckets' `README.md`s and the top-level `README.md` group entries into **User-invoked** and **Model-invoked**; the `in-progress/` `README.md` uses a flat list.

Skills in a promoted bucket also have a human-facing docs page at `docs/<bucket>/<skill-name>.md`; `in-progress/` gets no docs page. When you add, rename, remove, or change the behaviour of a skill in a promoted bucket, create, archive, or re-sync its docs page following [.agents/writing-docs.md](./.agents/writing-docs.md).

Every `SKILL.md` is either user-invoked (`disable-model-invocation: true` plus `policy.allow_implicit_invocation: false` in `agents/openai.yaml`, reachable only by the human) or model-invoked (model- or user-reachable). See [.agents/invocation.md](./.agents/invocation.md).

[`ask-joao`](./skills/setup/ask-joao/SKILL.md) is the router that maps every user-reachable skill and how they relate. The same trigger that re-syncs a docs page applies to it: whenever you add, rename, remove, or change how a user-reachable skill fits the flows, re-read `ask-joao`'s `SKILL.md` and update it so the map stays accurate: a new skill it never mentions, or a stale one it still routes to, is a router that lies.

To (re)link every skill into the local harness skill directories (`~/.claude/skills`, `~/.agents/skills`), run `scripts/link-skills.sh`. Each entry is a symlink into this repo, so a `git pull` keeps installed skills current; re-run the script after adding, removing, or renaming a skill.

Run `scripts/check-repo.sh` after editing skills, docs, or READMEs. No em-dashes anywhere in this repo's prose: rewrite the clause with a comma, colon, period, parentheses, or a conjunction, never a blind character substitution.

Judgement rules for editing skills, references, and skill scripts, which `code-review` applies to diffs here, live in [.agents/authoring-rules.md](./.agents/authoring-rules.md).

## Agent skills

### Triage labels

Canonical names, unchanged. See `docs/agents/triage-labels.md`. Issues are judged against the repository's scope and goals.
