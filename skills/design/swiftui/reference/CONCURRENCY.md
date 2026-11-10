# Concurrency

Entry point for diagnosing Swift Concurrency issues (tasks, actors, `@MainActor`, `Sendable`, data races, thread safety, concurrency compiler and linter warnings), refactoring callback code to async/await, and migrating to Swift 6+. Every concurrency task starts at Fast Path; the Reference Router at the end holds the deeper files.

## Fast Path

Before proposing a fix:

1. Read `Package.swift` or `.pbxproj` for the settings in the table below, on every concurrency task, migration or not. If the files leave a setting unknown, ask the developer to confirm it before giving migration-sensitive guidance, even for a new Xcode 26 project.
2. Capture the exact diagnostic and the offending symbol.
3. Name the isolation boundary: `@MainActor`, custom actor, actor instance isolation, or `nonisolated`.
4. Decide whether the code is UI-bound or runs off the main actor. For an unstructured `Task`, apply Task entry isolation below.

Done when the settings are known, the diagnostic is quoted, and the boundary is named.

| Setting | SwiftPM (`Package.swift`) | Xcode (`.pbxproj`) |
|---|---|---|
| Language mode | `swiftLanguageVersions` or `-swift-version` (`// swift-tools-version:` is not a reliable proxy) | Swift Language Version |
| Strict concurrency | `.enableExperimentalFeature("StrictConcurrency=targeted")` | `SWIFT_STRICT_CONCURRENCY` |
| Default isolation | `.defaultIsolation(MainActor.self)` | `SWIFT_DEFAULT_ACTOR_ISOLATION` |
| Upcoming features | `.enableUpcomingFeature("NonisolatedNonsendingByDefault")` | `SWIFT_UPCOMING_FEATURE_*` |
| Approachable Concurrency | N/A (use individual upcoming features) | `SWIFT_APPROACHABLE_CONCURRENCY` |

New projects created in Xcode 26 often start with `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` and `SWIFT_APPROACHABLE_CONCURRENCY = YES`. Treat these as likely defaults, not confirmed settings.

Guardrails:

- Justify `@MainActor` by naming the UI-owned state it protects.
- Prefer structured concurrency; reach for `Task.detached` only with a stated reason.
- `@preconcurrency`, `@unchecked Sendable`, and `nonisolated(unsafe)` each need a documented safety invariant and a removal plan.
- Make the smallest safe change and leave unrelated architecture alone during migration.

## Quick Fix Mode

Use it when all of these hold:

- The issue is localized to one file or one type.
- The isolation boundary is clear.
- The fix fits in 1-2 behavior-preserving steps.

Skip it when build settings or default isolation are unknown, the issue crosses module boundaries or changes public API behavior, or the likely fix depends on an unsafe escape hatch.

## Common Diagnostics

| Diagnostic | First check | Smallest safe fix | Escalate to |
|---|---|---|---|
| `Main actor-isolated ... cannot be used from a nonisolated context` | Is this truly UI-bound? | Isolate the caller to `@MainActor` or use `await MainActor.run { ... }` only when main-actor ownership is correct. | `CONCURRENCY-ACTORS.md`, `CONCURRENCY-THREADING.md` |
| `Actor-isolated type does not conform to protocol` | Must the requirement run on the actor? | Prefer isolated conformance (e.g., `extension Foo: @MainActor SomeProtocol`); use `nonisolated` only for truly nonisolated requirements. | `CONCURRENCY-ACTORS.md` |
| `Sending value of non-Sendable type ... risks causing data races` | What isolation boundary is being crossed? | Keep access inside one actor, or convert the transferred value to an immutable/value type. | `CONCURRENCY-SENDABLE.md`, `CONCURRENCY-THREADING.md` |
| `SwiftLint async_without_await` | Is `async` required by protocol, override, or `@concurrent`? | Remove `async`, or use a narrow suppression with rationale. | `CONCURRENCY-LINTING.md` |
| `wait(...) is unavailable from asynchronous contexts` | Is this legacy XCTest async waiting? | Replace with `await fulfillment(of:)` or Swift Testing equivalents. | `CONCURRENCY-TESTING.md` |
| Core Data concurrency warnings | Are `NSManagedObject` instances crossing contexts or actors? | Pass `NSManagedObjectID` or map to a Sendable value type. | `CONCURRENCY-CORE-DATA.md` |
| `@Observable` isolation or Sendable errors | Is the `@Observable` class annotated with the correct actor? | Add `@MainActor` for UI state; pass Sendable snapshots across boundaries. | `CONCURRENCY-OBSERVATION.md` |
| `Thread.current` unavailable from asynchronous contexts | Is the debugging done by thread instead of isolation? | Reason in terms of isolation; use Instruments or the debugger. | `CONCURRENCY-THREADING.md` |
| Other SwiftLint concurrency warnings | Which lint rule triggered? | Follow the rule's intent and preferred fix. | `CONCURRENCY-LINTING.md` |
| `... cannot satisfy conformance requirement for a 'Sendable' type parameter` (`SendableMetatype`) | Does the conformance carry global-actor isolation? | Remove actor isolation from the conformance, or keep the metatype from crossing isolation boundaries (`SendableMetatype` section). | `CONCURRENCY-ACTORS.md` |

## When Quick Fixes Fail

1. Gather project settings if not already confirmed.
2. Re-evaluate which isolation boundaries the type crosses.
3. Route to the matching file in the Reference Router for a deeper fix.
4. If the fix may change behavior, document the invariant and add verification steps.

## Smallest Safe Fixes

Prefer changes that preserve behavior while satisfying data-race safety:

- **UI-bound state**: isolate the type or member to `@MainActor`.
- **Shared mutable state**: move it behind an `actor`; use `@MainActor` only when the state is UI-owned.
- **Background work**: mark an `async` API `@concurrent` when it must hop off caller isolation; use plain `nonisolated` when it can safely inherit caller isolation.
- **Unstructured tasks**: pick the entry isolation per Task entry isolation below.
- **Sendability issues**: prefer immutable values and explicit boundaries over `@unchecked Sendable`.

## Concurrency Tool Selection

| Need | Tool | Key guidance |
|---|---|---|
| Single async operation | `async/await` | Default for sequential async work |
| Fixed parallel operations | `async let` | Count known at compile time; auto-cancelled on throw |
| Dynamic parallel operations | `withTaskGroup` | Unknown count; structured, cancels children on scope exit |
| Sync to async bridge | `Task { }` | Inherits actor context; `Task.detached` only with a documented reason |
| Shared mutable state | `actor` | Prefer over locks and queues; keep isolated sections small |
| UI-bound state | `@MainActor` | Only for truly UI-related code |

**Network request with UI update**

```swift
Task { @concurrent in
    do {
        let data = try await fetchData()
        await MainActor.run { self.updateUI(with: data) }
    } catch {
        await MainActor.run { self.show(error) }
    }
}
```

**Processing array items in parallel**

```swift
await withTaskGroup(of: ProcessedItem.self) { group in
    for item in items {
        group.addTask { await process(item) }
    }
    for await result in group {
        results.append(result)
    }
}
```

## Task entry isolation

Match a `Task`'s entry isolation to its **synchronous prefix**: everything from `{` to the first `await`.

- Anything in the prefix needs `@MainActor` (even next to trivial non-main lines such as `print`): keep the inherited `@MainActor` start.
- Nothing in the prefix needs `@MainActor`: write `Task { @concurrent in ... }` and hop back with `await MainActor.run { ... }` only for UI-owned mutation.
- Delayed retries, timers, and backoff: separate the waiting from the UI mutation. The sleep usually belongs off the main actor and the final state update on it.

Worked examples and the delayed-retry pattern: `CONCURRENCY-THREADING.md` ("Choosing Task entry isolation") and `CONCURRENCY-PERFORMANCE.md`.

## Swift 6 migration

Rollout order, build-setting steps, closure-to-async conversion, `@preconcurrency`, and FRP migration live in `CONCURRENCY-MIGRATION.md`. Run the Validation Loop for each migration step.

## Validation Loop

For every concurrency change, migration or not:

1. **Build** (`swift build` or Xcode) to surface diagnostics.
2. **Fix** one category at a time (all Sendable issues first), then **rebuild** until that category is clean.
3. **Test** (`swift test` or Cmd+U), weighting actor-, lifetime-, and cancellation-sensitive tests.
4. Move to the next file or module only when its diagnostics are resolved; new warnings from a fix are resolved first. Keep commits small and reviewable.
5. Back performance claims with Instruments.
6. Verify deallocation and cancellation of long-lived tasks, and check `Task.isCancelled` in long-running operations.
7. Express ownership with actor isolation or `Mutex`; semaphores and ad hoc locks in async contexts hide it.

## Reference Router

Open the smallest file that matches the question:

- Foundations
  - `CONCURRENCY-ASYNC-AWAIT.md`: async/await syntax, execution order, `async let`, URLSession patterns, closure-to-async bridges
  - `CONCURRENCY-TASKS.md`: Task lifecycle, cancellation, priorities, task groups, structured vs unstructured
  - `CONCURRENCY-ACTORS.md`: actor isolation, `@MainActor`, global actors, reentrancy, custom executors, `Mutex`, isolated conformances
  - `CONCURRENCY-SENDABLE.md`: `Sendable` conformance, value vs reference types, `@unchecked`, region isolation
  - `CONCURRENCY-THREADING.md`: execution model, suspension points, Swift 6.2 isolation behavior
- Streams
  - `CONCURRENCY-ASYNC-SEQUENCES.md`: `AsyncSequence`, `AsyncStream`, when to prefer a one-shot async method
  - `CONCURRENCY-ASYNC-ALGORITHMS.md`: debounce, throttle, merge, `combineLatest`, channels, timers
- Applied topics
  - `CONCURRENCY-TESTING.md`: Swift Testing first, XCTest fallback, leak checks
  - `CONCURRENCY-PERFORMANCE.md`: Instruments workflow, actor hops, suspension cost, execution strategies
  - `CONCURRENCY-MEMORY.md`: retain cycles in tasks, long-lived task cleanup
  - `CONCURRENCY-CORE-DATA.md`: `NSManagedObject` sendability, `perform`, custom executors, default-isolation conflicts
  - `CONCURRENCY-OBSERVATION.md`: `@Observable` with `@MainActor`, cross-isolation access, Sendable constraints
- Migration and tooling
  - `CONCURRENCY-MIGRATION.md`: Swift 6 migration strategy, `@preconcurrency`, FRP migration
  - `CONCURRENCY-LINTING.md`: concurrency lint rules, SwiftLint `async_without_await`
  - `CONCURRENCY-GLOSSARY.md`: definitions of core concurrency terms
