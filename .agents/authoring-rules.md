# Authoring rules

Judgement rules enforced during `code-review` of edits to skills, references, and skill scripts. Mechanical invariants live in `scripts/check-repo.sh`; the em-dash rule is in `AGENTS.md`; docs pages follow [writing-docs.md](./writing-docs.md).

## Skills (`skills/**/SKILL.md`, `reference/*.md`, `.agents/*.md`)

**Rule:** Write each step and reference following `skills/productivity/writing-for-agents/SKILL.md`, and review the diff against it.

**Why:** That skill owns the writing rules. A second copy here would drift from it.

**Applies when:** Creating or editing any `SKILL.md`, `reference/*.md`, or `.agents/*.md` file.

## Reference facts (`reference/*.md` that state platform, API, or version facts)

**Rule:** Trace each API, version, or behaviour claim to a primary source (vendor documentation, release notes, or a run of the tool) before it lands. Word a claim that only a secondary report supports as reported, with the platform version it was seen on, and drop a claim with no source.

**Why:** Unverified claims read as authoritative once they sit in a reference. The `swiftui` references carried a wrong `@AppStorage` behaviour, a wrong Simulator template behaviour, and an invented SDK deprecation version until each was checked against documentation or a run.

**Applies when:** Adding or editing a version-specific or API-specific statement in any `reference/*.md`, including text merged from another source.

## Skill scripts (`skills/**/scripts/`)

**Rule:** Ship scripts that fail safe:
- Follow "Scanner-safe skills" in [invocation.md](./invocation.md).
- Require an explicit flag before broad capture (system-wide recording) and redact secret values from logs.
- Exit non-zero on failure and print success only when the work succeeded.
- Keep each entrypoint a thin runner that delegates to named helpers.
- Cover every safety guardrail with a regression test next to the script.

**Why:** Agents run these scripts unattended, so a silent success, a leaked value, or an over-broad capture reaches the user as fact. `record_trace.py` printed "trace written" after a failed recording until a run showed it.

**Applies when:** Adding or editing a file under any skill's `scripts/`.
