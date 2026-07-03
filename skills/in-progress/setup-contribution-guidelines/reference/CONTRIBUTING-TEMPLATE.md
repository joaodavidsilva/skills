# CONTRIBUTING.md template

Fill this in at the confirmed location (an existing file keeps its place; otherwise the repo root). GitHub links the file from PRs and issues when it sits in the root, `docs/` or `.github/`; with several copies it picks `.github/`, then the root, then `docs/`. The file is read by people first, so it stays plain prose and short lists. It holds process only: a rule about naming, structure or style belongs in `CODING_STANDARDS.md` and enters here as a link.

## Fill rules

- Every command is copied from a manifest script, a Makefile target or a CI step found in exploration. A check with no recorded command is left out.
- List the entry points a contributor runs (install, the full check, tests, build) and point to the script file for the rest.
- Write each convention as the repo practises it. The commit and PR sections name the `commit` and `pr` skills in one line each for contributors who use a coding agent.
- Replace each `<...>` with a recorded value. A section with no recorded value is dropped.
- Link `CODING_STANDARDS.md` and `docs/architecture/layout.md` only when the files exist.

## Skeleton

```markdown
# Contributing

<One sentence on what kind of contributions are welcome.>

## Setup

Requires <runtime and version from the manifest or version file>.

    <install command>

<If a hook tool needs an install step after clone: the exact command and what it runs.>

## Checks

Run before opening a PR. CI runs the same <list the CI jobs>.

- All checks: `<check command>`
- Tests: `<test command>`
- Build: `<build command>`

## Branches

Branch from `<default branch>`. Name branches `<recorded pattern>`, for example `<example from git branch -a>`.

## Commits

<The recorded convention in one or two lines.> For example: `<a subject from git log>`.

<When the repo uses Conventional Commits and has a GLOSSARY.md: The scope is the term from [GLOSSARY.md](GLOSSARY.md) for the part of the domain you touched.>

Coding agents write messages with the `commit` skill.

## Pull requests

- <Expectation from the template, CI or CODEOWNERS: one concern per PR, checks green, linked issue.>
- The PR body follows <the PR template path>. Coding agents fill it with the `pr` skill.
- <Review rule: who is requested and how, from CODEOWNERS.>
- <Merge method the repo uses.>

## Coding standards

Style and architecture live in [CODING_STANDARDS.md](CODING_STANDARDS.md); where files go is in [docs/architecture/layout.md](docs/architecture/layout.md). Reviews, including `code-review`, read both.

## Reporting bugs

Open an issue at <tracker link>. <Which issue template to pick, or what to include: version, steps to reproduce, expected and actual behaviour.>

Report security problems through <SECURITY.md link or the contact the user gave>, kept out of public issues.
```

## Worked example

A repo whose log shows `feat(billing): add proration` style subjects, a `.github/pull_request_template.md`, a `CODEOWNERS`, and `package.json` scripts `check` and `test`:

```markdown
## Commits

Commits follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). For example: `fix(billing): round proration to cents`.

The scope is the term from [GLOSSARY.md](GLOSSARY.md) for the part of the domain you touched.

Coding agents write messages with the `commit` skill.

## Pull requests

- One concern per PR, with `pnpm check` green.
- The PR body follows [the PR template](.github/pull_request_template.md). Coding agents fill it with the `pr` skill.
- Code owners are requested for review automatically.
```
