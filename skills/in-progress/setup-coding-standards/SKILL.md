---
name: setup-coding-standards
description: "Set up a project's coding standards: folder layout, lint and compiler checks, and a CODING_STANDARDS.md for code review."
disable-model-invocation: true
---

# Setup Coding Standards

Give the repo guardrails that agents cannot talk their way around. A **mechanical** rule becomes a check (fitness function, lint rule, compiler flag) that fails the build. A **judgement** rule goes to `CODING_STANDARDS.md`, read by `code-review` at review time. `CLAUDE.md` / `AGENTS.md` gets one navigation pointer and nothing else.

This is a prompt-driven skill: explore, classify, present, confirm, then write.

## Languages

Load only the reference files that match the manifests found in step 1:

- **TypeScript / JavaScript** (`package.json`, `tsconfig*.json`): [reference/ts.md](reference/ts.md), [reference/checks.md](reference/checks.md), [reference/layouts.md](reference/layouts.md)
- **Python** (`pyproject.toml`, `uv.lock`, `requirements*.txt`): [reference/python.md](reference/python.md)
- **Go** (`go.mod`): [reference/go.md](reference/go.md)
- **Rust** (`Cargo.toml`): [reference/rust.md](reference/rust.md)
- **Kotlin / Java on Gradle** (`build.gradle*`, `settings.gradle*`, `gradle/libs.versions.toml`): [reference/gradle.md](reference/gradle.md)
- **Swift** (`Package.swift`, `*.xcodeproj`): [reference/swift.md](reference/swift.md)
- **C / C++** (`CMakeLists.txt`, `meson.build`, `compile_commands.json`): [reference/cpp.md](reference/cpp.md)

For any other language, tell the user no reference file exists yet, research that language's current official linter, formatter and type-checker docs, and run steps 1, 2, 5 and 7 for its mechanical checks only.

## Process

### 1. Explore

Read what exists; assume nothing:

- Manifests: `package.json`, `tsconfig*.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `build.gradle*`, `Package.swift`, `CMakeLists.txt`. Record the framework and the language, runtime and linter versions the manifest declares.
- Existing guardrails: lint and format configs, `.github/workflows`, hook configs, the repo's `lint` / `check` scripts.
- Prose: `CLAUDE.md`, `AGENTS.md`, `CODING_STANDARDS.md`, `CONTRIBUTING.md`, `docs/`.
- Size distribution, per the "Measure first" section of [reference/checks.md](reference/checks.md): file lines and function lines, mean and standard deviation, outliers above 2 sigma listed by path.

Done when every detected stack is recorded with its manifest evidence (file and line or key) and the size distribution is in hand.

### 2. Classify

List every candidate rule: from the reference files, from the existing prose in step 1 (each rule in `CODING_STANDARDS.md`, `CONTRIBUTING.md`, `CLAUDE.md`), and from the repo's own recurring review complaints when the user names any. Label each:

- **MECHANICAL**: a fixed pattern, a limit, an import shape, a file location, a banned API. Becomes a check. This is the default: when a check can be built, build it.
- **JUDGEMENT**: needs cross-file context or taste. Goes to `CODING_STANDARDS.md`.

Done when every candidate carries a label and every JUDGEMENT rule names why no check could enforce it.

### 3. Present and confirm

Show the user one draft, then take decisions one at a time, recommended answer first:

1. Layout: the layout from [reference/layouts.md](reference/layouts.md) that fits the detected stack, the layout map, and the pointer line.
2. Tool stack: the linter the repo already runs. With none, recommend Stack B and name the trade-off against A and C (see `reference/checks.md`). Name every gap the chosen stack leaves in the rule set.
3. Thresholds: the repo-derived limits beside their convention anchors, plus the outlier baseline list.
4. The `CODING_STANDARDS.md` draft: JUDGEMENT rules only.

Skip a decision exploration already settled. Let the user edit before anything is written.

Done when the user has confirmed or edited each of the four decisions and no file has been written.

### 4. Write the layout map

Write `docs/architecture/layout.md` (or the repo's existing architecture doc) from the confirmed layout: the folder tree, the layout rules in force, and which check enforces each. Add ONE pointer line to the file that exists: `CLAUDE.md`, else `AGENTS.md`. When neither exists, ask which to create. Never create the second one. Pointer shape: `Before creating or moving files, read docs/architecture/layout.md.`

Done when the layout map exists and the pointer line sits in exactly one steering file.

### 5. Install the mechanical checks

Open the matching language reference from `## Languages` (plus [reference/checks.md](reference/checks.md) for TypeScript and JavaScript). Install the mechanical rule set for the confirmed stack: compiler and type-checker flags, size and complexity limits from step 1, import boundaries, suppression hygiene, unsafe-escape bans, and stack-specific lint rules. Record the existing outliers as per-file overrides or a baseline file so the checks flag only new crossings (the delta).

Then take the checks **red** before trusting them: plant one violation per rule family (the "Plant a violation" table in `reference/checks.md`), run the check command, observe a nonzero exit naming each rule. Remove the plants, run again, observe exit 0.

Done when you have reported the command, the red exit status with the rule ids it printed, and the green exit status, plus whether CI or a hook already runs the command.

### 6. Write CODING_STANDARDS.md

Write `CODING_STANDARDS.md` at the repo root from [reference/STANDARDS-TEMPLATE.md](reference/STANDARDS-TEMPLATE.md). An existing file is updated in place; the user's rules and Deviations stay. Keep only JUDGEMENT rules, each with its rule, why, "Applies when", and a Deviations section the reviewer respects. Include the `platform-first` pointer line from the template.

Done when the file exists and each rule has been compared against the installed rule set: any rule a check already enforces is deleted from the file.

### 7. Done

Tell the user what was installed: the layout map and pointer, the checks with their command, the standards file. Say that `code-review` now has a Standards source in `CODING_STANDARDS.md` and that the checks run without it. Name the gaps from step 3 and any language that still lacks a reference.
