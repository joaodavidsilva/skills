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
- Give a model-invoked `description` one trigger per distinct branch: no synonym lists, and no catalogue of names the body already routes.
- End each step on a checkable completion criterion.
- Delete no-op sentences that do not change default model behaviour.
- State each rule once and point to it from elsewhere: a checklist item and a reference paragraph with the same meaning are one rule written twice.

**Why:** Every always-loaded token in a skill description or step body competes for attention in the implementer's context window.

**Applies when:** Creating or editing any `SKILL.md`, `reference/*.md`, or `.agents/*.md` file.

## Reference facts (`reference/*.md` that state platform, API, or version facts)

**Rule:** Trace each API, version, or behaviour claim to a primary source (vendor documentation, release notes, or a run of the tool) before it lands. Word a claim that only a secondary report supports as reported, with the platform version it was seen on, and drop a claim with no source.

**Why:** Unverified claims read as authoritative once they sit in a reference. The `swiftui` references carried a wrong `@AppStorage` behaviour, a wrong Simulator template behaviour, and an invented SDK deprecation version until each was checked against documentation or a run.

**Applies when:** Adding or editing a version-specific or API-specific statement in any `reference/*.md`, including text merged from another source.

## Skill scripts (`skills/**/scripts/`)

**Rule:** Ship scripts that fail safe:
- Follow "Scanner-safe skills" in `.agents/invocation.md`: private temp directories, subprocess calls with list arguments, no automatic installs.
- Require an explicit flag before broad capture (system-wide recording) and redact secret values from logs.
- Exit non-zero on failure and print success only when the work succeeded.
- Keep each entrypoint a thin runner that delegates to named helpers.
- Cover every safety guardrail with a regression test next to the script.

**Why:** Agents run these scripts unattended, so a silent success, a leaked value, or an over-broad capture reaches the user as fact. `record_trace.py` printed "trace written" after a failed recording until a run showed it.

**Applies when:** Adding or editing a file under any skill's `scripts/`.

## Docs pages (`docs/<bucket>/<skill>.md`)

**Rule:** Follow `.agents/writing-docs.md`:
- State the skill's defining constraint in `## What it does` as a plain declarative sentence, never a labelled aside (`"The defining constraint:"`, `"The key thing:"`).
- Size `## Common questions` to real evidence from issues and history rather than padding thin skills with invented questions.
- Make every `## It's working if` bullet observable by the user without opening `SKILL.md`.

**Why:** Docs pages relieve human cognitive load when choosing between skills; restating `SKILL.md` internals or padding questions adds load back.

**Applies when:** Creating or editing any file under `docs/engineering/` or `docs/productivity/`.

## Deviations

None recorded.
