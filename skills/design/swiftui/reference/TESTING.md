# Swift Testing

Entry point for writing, reviewing, migrating, and debugging Swift tests with modern Swift Testing APIs: test structure, `#expect`/`#require`, traits and tags, parameterized tests, test plans, parallel execution, async waiting, and XCTest migration. Aim for readable tests, robust parallel execution, clear diagnostics, and incremental migration.

## Rules

- Swift Testing covers Swift unit and integration tests. XCTest stays for UI automation (`XCUIApplication`), performance metrics (`XCTMetric`), and Objective-C-only test code.
- `#expect` is the default assertion; `#require` guards a prerequisite value that later lines depend on.
- Tests are parallel-safe by default: fix shared state first, and reach for `.serialized` only as a transition step with a stated reason.
- Traits and tags carry behavior and metadata (`.enabled`, `.disabled`, `.timeLimit`, `.bug`, tags), and test-plan include/exclude filters select by tag.
- Tests that share logic and differ only in input values become one parameterized `@Test(arguments:)`.
- OS-gated behavior sits behind `@available` on the test function; suite types carry no `@available`.
- Migration is incremental: convert assertions, then organize suites, then introduce parameterization and traits.
- `import Testing` appears in test targets only.

## Triage

1. Name the goal: new tests, migration, flaky failures, performance, CI filtering, or async waiting.
2. Collect the facts the project does not already show: Xcode/Swift version and platform targets, XCTest vs Swift Testing vs both, deterministic vs flaky failures, and shared resources (database, files, network, global state).
3. Route by topic below, then act on the matching pitfall.

Done when the goal is named, the facts are known, and each touched topic's reference has been read.

## Topic Router

| Topic | Reference |
|---|---|
| Test building blocks and suite organization | `TESTING-FUNDAMENTALS.md` |
| `#expect`, `#require`, throw expectations | `TESTING-EXPECTATIONS.md` |
| Traits, tags, Xcode test-plan filtering | `TESTING-TRAITS-AND-TAGS.md` |
| Parameterized test design and combinatorics | `TESTING-PARAMETERIZED.md` |
| Default parallel execution, `.serialized`, isolation strategy | `TESTING-PARALLELIZATION.md` |
| Test speed, determinism, flakiness prevention | `TESTING-BEST-PRACTICES.md` |
| Async waiting and callback bridging | `TESTING-ASYNC.md` |
| Actor-, cancellation-, and leak-sensitive tests; flaky task scheduling | `CONCURRENCY-TESTING.md` |
| XCTest coexistence and migration workflow | `TESTING-MIGRATION.md` |
| Test navigator, reports, diagnostics | `TESTING-XCODE-WORKFLOWS.md` |

## Common Pitfalls

| Symptom | Next move |
|---|---|
| Repetitive `testFooCaseA`/`testFooCaseB` methods | One parameterized `@Test(arguments:)` |
| Optional precondition failing in a later assertion | `try #require(...)`, then assert on the unwrapped value |
| Flaky integration tests on a shared database | Isolate dependencies or use in-memory repositories |
| Disabled test silently rotting | `withKnownIssue` for the temporary failure, which keeps the signal |
| Unclear failure values for a complex type | Conform the type to `CustomTestStringConvertible` |
| Test-plan filters keyed on test names | Tags and tag-based filters |

## Verification Checklist

- Each test checks one behavior and has a display name where the function name falls short.
- Every prerequisite whose failure should stop the test uses `#require`.
- Repeated logic is parameterized.
- Each test is parallel-safe, or serialized with a recorded rationale.
- Async code is awaited and callback APIs are bridged safely.
- XCTest-only scenarios stay on XCTest after migration.
