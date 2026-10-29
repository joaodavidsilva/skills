# Handling Soft-Deprecated APIs

This file covers *how to behave* when you encounter soft-deprecated SwiftUI APIs. For the actual list of deprecated-to-modern transitions, see `reference/LATEST-APIS.md`.

## What "soft-deprecated" means

A soft-deprecated API is marked deprecated in the SDK headers but with a placeholder deprecation version (`100000.0`) that suppresses compiler warnings. It still compiles and works correctly; the mark signals that new code should use the replacement. Examples include `NavigationView` (use `NavigationStack` / `NavigationSplitView`), `ActionSheet` / `Alert` (use the `.confirmationDialog` / `.alert` modifiers), `MagnificationGesture` (renamed `MagnifyGesture`), and `PresentationMode` (use `\.dismiss`).

Because these still work, treat them as **informational**, not urgent.

## Scoping rule: read this first

All soft-deprecation guidance is scoped to the code you are **directly modifying**. If a file contains several views and the task touches only one, the other views are out of scope.

- Discuss only the view(s) you actually edited.
- Stay silent about soft-deprecated APIs in code you weren't asked to change, including trailing "while I'm here, want me to migrate `OtherView`?" questions.
- This takes precedence over any prompt asking for "observations" or "other notes."

Mentioning soft-deprecated APIs in untouched code creates noise, distracts from the task, and pressures the user into unrelated work.

## When generating new code

Write new code with the modern replacement. If you're unsure whether an API is soft-deprecated, check `reference/LATEST-APIS.md` before recommending it, since any API that worked in a prior release could have been soft-deprecated since.

## When asked to review, refactor, modernize, or clean up

Point out soft-deprecated APIs in the code under review and suggest the modern replacement. Keep the tone informational: these still compile and run, so frame migration as an improvement, not a bug fix.

## When asked to add a feature or fix a bug

If the view you're editing already uses a soft-deprecated API, **keep it as-is** in your change. Swapping `NavigationView` for `NavigationStack` while adding a search bar produces unexpected diffs, risks regressions (state resets, navigation behavior changes), and makes the change harder to review. After delivering the requested change, you may add a brief one-line offer to migrate as a separate step.

If a *different* view in the same file uses a soft-deprecated API, ignore it entirely (see the scoping rule).

## General guidance

- Notice soft-deprecated APIs only when they appear in code you're directly modifying for the user's request; skip codebase-wide scans.
- Migrations are real edits with behavioral risk; they belong in their own focused change, not bundled into unrelated work.
