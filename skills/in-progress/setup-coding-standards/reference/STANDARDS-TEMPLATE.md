# CODING_STANDARDS.md template

Fill this in at the repo root. Keep only rules no check can enforce: each rule here is read by the reviewer, so a rule that a lint rule, compiler flag or fitness function already covers is deleted from the file. A rule the `code-review` smell baseline already holds (Duplicated Code, Speculative Generality, and the rest) is written only where the repo adds a threshold or an exception.

## Skeleton

```markdown
# Coding standards

Read at review. Mechanical rules live in the checks (`<the check command>`), not here. Folder layout and import rules: `docs/architecture/layout.md`. For CSS, HTML and JS platform choices, call the Skill tool with `platform-first`; reviewers and implementers both use it.

## <Area, for example Abstraction>

### <Rule name>

**Rule.** One or two sentences, stated as the behaviour to follow.
**Why.** The reason, in a sentence: the failure it prevents.
**Applies when.** The condition that triggers the rule, so the reviewer knows when to raise it.

## Deviations

Where this repo overrides a rule, record it here: the rule, what the repo does instead, why. The reviewer respects a recorded deviation and raises an unrecorded one.

- <rule name>: <what the repo does instead>. Why: <reason>.
```

## Worked example

```markdown
### Extract a helper at the third call site

**Rule.** Duplicate the code until a third real call site exists, or until one documented piece of knowledge needs a single home. When a shared function gains a boolean or conditional parameter to serve a new caller, inline it back into every caller and split.
**Why.** Duplication costs less than the wrong abstraction: each added flag couples unrelated callers, and the helper ends up changing for several reasons.
**Applies when.** A diff adds a shared helper with fewer than three callers, or adds a parameter that switches behaviour inside an existing helper.
```

A Deviations entry for it: `Extract a helper at the third call site: the payments package extracts at the second call site. Why: both sites compute money rounding, one documented rule.`

## Seed candidates

Adopt only those that match this repo; write each in the skeleton form. Layout-related seeds draw on `reference/LAYOUTS.md`.

- Name features from the business language; one reason to change per module.
- Extract by intention: when a section of a body needs a comment to explain it, extract and name it; merge back a function whose reading requires reading its caller (shallow, entangled).
- Keep a module's public surface small and deep: few named exports, complexity hidden behind them.
- Domain depth: a transaction script per use case with a small pure domain; aggregates only for real invariants.
- Adapters hold no business rules; rules sit in pure modules next to their types.
- One schema for client and server validation; parse at the boundary and keep the refined type.
- Open a feature or a package only when reuse or a second deployable exists.
- Treat a size or complexity breach as a prompt to look: split by reason to change, extract and name a commented section, separate fetching from rules from layout in a component, otherwise leave it and record why.
- Comments explain why the code is the way it is.
