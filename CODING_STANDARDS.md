# Coding Standards

Judgement rules enforced during `code-review`. Mechanical invariants (em-dash ban, `agents/openai.yaml` sync, uppercase `reference/*.md` filenames, relative link resolution, bucket/README/docs sync) are enforced by `scripts/check-repo.sh`.

## Prose: em-dash rewrites

**Rule:** Where a sentence reaches for an em-dash, rewrite the clause with a comma, colon, period, parentheses, or a conjunction, whichever the sentence actually wants. Never replace an em-dash with a spaced hyphen (` - `) or double hyphen (`--`).

**Why:** `scripts/check-prose.sh` catches the literal Unicode character, so a blind character swap passes the script while ruining the sentence.

**Applies when:** Any markdown, YAML, shell, or Python comment in the diff.

## Skills (`skills/**/SKILL.md` and `reference/*.md`)

**Rule:** Write skill steps and references following `skills/productivity/writing-for-agents/SKILL.md`:
- Prompt the positive target behaviour rather than leading with negation.
- Collapse repeated multi-word concepts into a pretrained leading word.
- Keep branch-specific reference in `reference/UPPERCASE.md` behind a context pointer so the top-level steps stay legible.
- End each step on a checkable completion criterion.
- Delete no-op sentences that do not change default model behaviour.

**Why:** Every always-loaded token in a skill description or step body competes for attention in the implementer's context window.

**Applies when:** Creating or editing any `SKILL.md`, `reference/*.md`, or `.agents/*.md` file.

## Docs pages (`docs/<bucket>/<skill>.md`)

**Rule:** Follow `.agents/writing-docs.md`:
- State the skill's defining constraint in `## What it does` as a plain declarative sentence, never a labelled aside (`"The defining constraint:"`, `"The key thing:"`).
- Size `## Common questions` to real evidence from issues and history rather than padding thin skills with invented questions.
- Make every `## It's working if` bullet observable by the user without opening `SKILL.md`.

**Why:** Docs pages relieve human cognitive load when choosing between skills; restating `SKILL.md` internals or padding questions adds load back.

**Applies when:** Creating or editing any file under `docs/engineering/` or `docs/productivity/`.

## Deviations

None recorded.
