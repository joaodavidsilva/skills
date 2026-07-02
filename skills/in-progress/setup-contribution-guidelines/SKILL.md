---
name: setup-contribution-guidelines
description: "Write a project's CONTRIBUTING.md from its git history, scripts, CI and templates."
disable-model-invocation: true
---

# Setup Contribution Guidelines

Give the repo a `CONTRIBUTING.md` that owns **process**: setup, checks, branches, commits, PRs, bug reports. `CODING_STANDARDS.md` owns style and architecture; CONTRIBUTING links to it and carries no coding rule. `code-review` reads `CONTRIBUTING.md` as a standards source, so every line in it is checked against diffs.

This is a prompt-driven skill: explore, present, confirm, then write. Every fact in the file comes from the repo or from the user's answer; a command, branch pattern or contact that exploration did not find is left out and reported in step 5.

## Process

### 1. Explore

Read what exists; assume nothing:

- Commit norms: `git log --no-merges --format=%s -30` and `git log --merges --format=%s -5`. Record the share of subjects shaped `type(scope)?: description`, the median subject length, whether scopes appear, and whether merge commits exist.
- Branches: `git branch -a` and `git symbolic-ref --short refs/remotes/origin/HEAD`. Record the default branch and any prefix the non-default branches share.
- Contribution files, each in the repo root, `docs/` or `.github/`: `CONTRIBUTING.md`, the PR template (`pull_request_template.md` or a `PULL_REQUEST_TEMPLATE/` folder), `.github/ISSUE_TEMPLATE/`, `CODEOWNERS`, plus `SECURITY.md`, `CODE_OF_CONDUCT.md`, `LICENSE`.
- Automation: `.github/workflows` (the steps each job runs), hook configs (`.husky/`, `lefthook.yml`, `.pre-commit-config.yaml`, a `lint-staged` key) and the install step each hook tool needs after a clone.
- Commands: the scripts in `package.json`, `Makefile`, `justfile`, `pyproject.toml`, `Cargo.toml`, `build.gradle*`, `Package.swift`, and the runtime versions the manifest or `.nvmrc` / `.tool-versions` declares. Record each command exactly as the file states it, with the package manager the lockfile shows.
- Prose: `CLAUDE.md`, `AGENTS.md`, `README.md` setup section, `CODING_STANDARDS.md`, `docs/architecture/layout.md`, `docs/agents/issue-tracker.md`, `GLOSSARY.md`.

Done when each item above is recorded as found (path and value) or absent.

### 2. Present and confirm

Show one draft outline, then take decisions one at a time, recommended answer first. Skip a decision exploration already settled:

1. Location: the existing `CONTRIBUTING.md` (updated in place); with none, the repo root.
2. Commit convention: the convention the log shows. With no convention, Conventional Commits, which the `commit` skill writes.
3. Branch naming: the prefix the branches share. With no shared prefix, propose `<type>/<short-description>` and label it a proposal.
4. PR expectations and merge method: what the PR template, CI and `CODEOWNERS` already require, plus the merge style the log shows.
5. Bug reports: the tracker from `docs/agents/issue-tracker.md` or the remote, the issue templates found, and where security reports go (`SECURITY.md`, else the user's answer).
6. Only when the existing `CONTRIBUTING.md` holds style or architecture rules: move them to `CODING_STANDARDS.md`, or leave them in place.

Done when the user has confirmed or edited each decision and no file has been written.

### 3. Write CONTRIBUTING.md

Write from [reference/CONTRIBUTING-TEMPLATE.md](reference/CONTRIBUTING-TEMPLATE.md), using the commands and conventions recorded in step 1. An existing file is updated in place: its conduct, licence, CLA and DCO text stay as written. Link `CODING_STANDARDS.md` and the layout map when they exist. Omit a section that has nothing real to say.

Done when the file exists and each command in it appears in a manifest, script file or CI step recorded in step 1.

### 4. Check single source

Read the written file as a reviewer: each line is process, or a link. Any line that states a coding rule moves to `CODING_STANDARDS.md` (when that file exists) or comes out, per decision 6.

Done when the file holds no coding rule.

### 5. Done

Tell the user what was written (the path, each section) and that `code-review` now reads it. Name the gaps: commands not found, no security contact, no `CODING_STANDARDS.md` (tell the user to run `/setup-coding-standards`).
