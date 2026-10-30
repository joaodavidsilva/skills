## What it does

`swiftui` is the correctness and performance bar for SwiftUI code on iOS and macOS, including Swift concurrency safety, Swift 6+ migration, and Swift Testing. The [agent](../references/agent.md) applies it when it writes, reviews, or refactors SwiftUI, when it meets a concurrency diagnostic, when it writes or migrates Swift tests, and again when a `.trace` path shows up or you ask it to profile a session.

It treats every `View` as an _invalidation boundary_: a view should read only the data it needs, so a change re-runs the smallest subtree that depends on it. The skill keeps one reference per topic (state, composition, lists, navigation, animation, charts, macOS, Liquid Glass, SDK 27 APIs) and the agent reads only the references the code touches, so a list fix never loads the animation rules. In a review it reports genuine problems only, each against its rule, and edits nothing until you ask.

## When to reach for it

Type `/swiftui`, or the agent reaches for it automatically when a task fits.

| Your situation | Reach for |
| --- | --- |
| Writing or refactoring SwiftUI views, state, lists, or navigation | `swiftui` |
| Reviewing a screen against the SwiftUI checklist | `swiftui`, as a review |
| A `.trace` file, or "profile this session" | `swiftui`, Instruments branch |
| An actor, `@MainActor`, `Sendable`, or data-race diagnostic, or a Swift 6+ migration | `swiftui`, concurrency branch |
| Writing Swift tests, parameterizing or tagging them, or moving an XCTest suite over | `swiftui`, testing branch |
| Web UI and motion craft | [interface-polish](./interface-polish.md) |

## Prerequisites

The Instruments branch needs Xcode's `xctrace` on your `PATH` and `python3`. The SwiftUI writing and review branches need nothing in place.

## The Instruments branch

Recording and analysis run through two scripts. `record_trace.py` wraps `xctrace record` and refuses a system-wide recording until you pass an explicit acknowledgement flag. `analyze_trace.py` reads the Time Profiler, Hangs, Animation Hitches, SwiftUI update, and cause-graph lanes, correlates hangs and hitches with main-thread samples, and returns JSON and Markdown the agent can reason over instead of the raw `xctrace` export.

## The concurrency branch

The branch starts from the project's build settings (language mode, strict concurrency, default isolation) and the exact diagnostic, then names the _isolation boundary_ the code crosses before proposing a fix. It prefers the smallest safe change: `@MainActor` only for UI-owned state, structured concurrency over unstructured tasks, and an `@unchecked Sendable` or `@preconcurrency` escape hatch only with a written safety invariant. For an unstructured `Task` it picks the entry isolation from the task's _synchronous prefix_, the code before its first `await`. Migration proceeds one diagnostic category at a time, with a rebuild and test run between steps.

## The testing branch

The branch writes Swift unit and integration tests with Swift Testing and leaves UI automation (`XCUIApplication`), performance metrics (`XCTMetric`), and Objective-C-only tests on XCTest. Tests are parallel-safe by default, so shared state gets fixed before `.serialized` is considered. Repeated tests that differ only in input become one parameterized test, and traits and tags carry behavior and filtering instead of test names. Migration is incremental: assertions first, then suites, then parameterization and traits.

## Common questions

**Can I profile on the iOS Simulator?**

Partly. The `SwiftUI` template fails on the Simulator (xctrace reports that Hitches is not supported there), so the skill falls back to `Time Profiler`. You get the Time Profiler lane, without the hitches, SwiftUI, or cause-graph lanes. Use a real device or the host Mac for the full picture.

**Will it tell me how to structure my app?**

No. It covers correctness and performance, and leaves architecture and code style to the project.

## It's working if

- A review comes back grouped by file, each finding with the line, the rule, and a short before and after, ending in a prioritised summary.
- It treats iOS 27 APIs as real and checks your deployment target before advising a version-specific change.
- It flags a soft-deprecated API without rewriting it, unless you asked to migrate.
- Given a concurrency diagnostic, it quotes the diagnostic, names the isolation boundary, and changes the smallest thing that satisfies it.
- Given a suite of near-duplicate test methods, it proposes one parameterized test, and keeps a UI or performance test on XCTest.
- Given a `.trace`, it names the views and symbols behind a hang with numbers, and ties each to a fix.

## Where it fits

A reach-for-it-anytime standalone, model-invoked during SwiftUI work. For the judgement rules a project enforces at review, `setup-coding-standards` points its SwiftUI rules here, and the `update-swiftui-apis` maintenance skill keeps the deprecated-to-modern list current.

**ask-joao** routes across the whole set when you are unsure which skill the situation wants.
