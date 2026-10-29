# Swift modern baseline and checks

Training data defaults to `ObservableObject` / `@Published`, `XCTestCase` boilerplate, `DispatchQueue.main.async`, and Swift 5 concurrency assumptions. Read `Package.swift` (`swift-tools-version`, `platforms`, `swiftLanguageModes`) and any `.xcodeproj` build settings (`SWIFT_VERSION`, `SWIFT_STRICT_CONCURRENCY`, `SWIFT_DEFAULT_ACTOR_ISOLATION`, deployment target) before applying any row below, and use a feature only when the project's toolchain and minimum OS deployment target meet its `since` tag. Verified 2026-10 against Swift 5.9 to 6.4 release notes, Swift Evolution proposals, Xcode 26/27 release notes, and SwiftLint / `swift-format` documentation.

## Modern language and framework baseline

| Write | Since | Replaces |
|---|---|---|
| `@Observable final class Model` with `@State` and `@Bindable` in SwiftUI | Swift 5.9 / iOS 17 / macOS 14 | `ObservableObject`, `@Published`, `@StateObject`, `@ObservedObject` |
| `if` and `switch` expressions (`let label = switch state { ... }`) | Swift 5.9 | uninitialized `var` assigned in each branch or IIFE closures `{ ... }()` |
| Noncopyable types (`struct FileDescriptor: ~Copyable`, `consuming` / `borrowing`) | Swift 5.9 (generics 6.0, SE-0390 / SE-0427) | class wrappers used only to get unique ownership and `deinit` |
| Swift 6 language mode (`swiftLanguageModes: [.v6]`) with full data-race safety | Swift 6.0 / Xcode 16 | unchecked cross-actor mutation and `-strict-concurrency` warnings left on `minimal` |
| Typed throws (`func parse() throws(ParseError) -> AST`, SE-0413) | Swift 6.0 | untyped `throws` in closed-domain parsers or `Result<T, E>` where throwing ergonomics are preferred |
| `Mutex<Value>` and `Atomic<Value>` (`import Synchronization`, SE-0433) | Swift 6.0 / iOS 18 / macOS 15 | `NSLock` + manual state pairs or `DispatchQueue` serial queues used only as a lock |
| Swift Testing (`import Testing`, `@Test`, `#expect(...)`, `#require(...)`, `@Test(arguments:)`) | Swift 6.0 / Xcode 16 | `XCTestCase` subclasses, `XCTAssertEqual`/`XCTUnwrap` for unit tests (`XCTest` stays for `XCUITest` and performance metrics) |
| Approachable Concurrency: `Default Actor Isolation = MainActor` (`SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` or `.defaultIsolation(MainActor.self)` in `Package.swift`, SE-0466) and `nonisolated(nonsending)` async functions by default with `@concurrent` for background offload (SE-0461) | Swift 6.2 / Xcode 26 | sprinkling `@MainActor` on every UI type and `nonisolated` async functions unexpectedly hopping off the caller's actor |
| Isolated protocol conformances (`struct Row: @MainActor Equatable`, SE-0470) | Swift 6.2 / Xcode 26 | `nonisolated unsafe` workarounds just to conform a `@MainActor` type to a standard protocol |
| Post-training Apple SDK APIs (for example iOS 26 Liquid Glass `.glassEffect()`, `GlassEffectContainer`, or iOS 27 SDK APIs in Xcode 27 / Swift 6.4) | iOS 26+ / Swift 6.2 to 6.4 | guessing modifier names from memory; always inspect the installed SDK headers or fetch Apple's current documentation before writing |

## Outdated habits to replace

- **`DispatchQueue.main.async { ... }` in async/await code:** use `@MainActor` isolation or `MainActor.run { ... }`.
- **`ObservableObject` + `@Published` on iOS 17+ / macOS 14+ targets:** `@Observable` tracks per-property reads automatically and avoids redundant view invalidations.
- **Force unwrapping (`!`), `try!`, and `as!` in production targets:** use `guard let`, `if let`, typed error propagation, or conditional `as?` casts.
- **Monolithic single Xcode app target with everything `internal`:** extract feature and domain targets into a local `Package.swift` so `public` vs `internal` boundaries are enforced by the compiler.

## Mechanical checks

Measure file, type, and function line counts across `*.swift` (excluding `Tests/`, `*.generated.swift`, and `.build/`) first, then set warning/error thresholds in `.swiftlint.yml` from `mean + 2 * sigma`.

### `.swiftlint.yml` (verified against SwiftLint rule directory)

```yaml
only_rules:
  # Size & complexity gates
  - file_length
  - type_body_length
  - function_body_length
  - function_parameter_count
  - cyclomatic_complexity
  - nesting

  # Safety & modern hygiene
  - force_unwrapping
  - force_cast
  - force_try
  - discouraged_optional_boolean

  # SwiftUI
  - private_swiftui_state

  # Suppression hygiene
  - blanket_disable_command
  - superfluous_disable_command
  - todo

file_length:
  warning: 400           # tune to repo 2-sigma
  error: 600
  ignore_comment_only_lines: true

type_body_length:
  warning: 250
  error: 350

function_body_length:
  warning: 40
  error: 60

function_parameter_count:
  warning: 5
  error: 6

cyclomatic_complexity:
  warning: 10
  error: 15
  ignores_case_statements: true

nesting:
  type_level: 2
  function_level: 3

force_unwrapping: error
force_cast: error
force_try: error
private_swiftui_state: error
blanket_disable_command: error
superfluous_disable_command: error

excluded:
  - .build
  - DerivedData
  - "**/*.generated.swift"
```

- **Suppression rule:** `blanket_disable_command` forbids `// swiftlint:disable <rule>` without a matching `:enable` or `:next`/`:this`/`:previous` scope, and `superfluous_disable_command` flags stale disables. Require an adjacent reason and issue reference via a `custom_rules` regex when `swiftlint:disable` appears.
- **Formatting and compiler checks:** run `swift format lint --strict --recursive .` (built into the Swift toolchain via `swift-format`) and build with `swift build -Xswiftc -warnings-as-errors` (and `swift test`).

### Plant-a-violation verification (red then green)

| Family | Plant | Expected failure |
|---|---|---|
| Force unwrap | `let x: Int? = nil; _ = x!` in a non-test `.swift` file | `force_unwrapping` |
| Blanket suppression | `// swiftlint:disable force_cast` at top of file with no `:enable` | `blanket_disable_command` |
| SwiftUI state | `struct Counter: View { @State var count = 0 ... }` | `private_swiftui_state` |
| Size / complexity | a 65-line function body | `function_body_length` |
| Concurrency safety | mutating a non-isolated `var` from a `@Sendable` closure in Swift 6 mode | Swift compiler concurrency error |

## Layouts (RECOMMENDATION)

Basis: Apple "Organizing your code with local packages" documentation and SwiftPM target boundaries.

- **SwiftPM library or CLI:** `Package.swift` with `Sources/<TargetName>/` grouped by domain capability and `Tests/<TargetName>Tests/` using Swift Testing (`@Test`). Keep types `internal` by default; mark `public` only what forms the package contract.
- **iOS / macOS app with more than 2 to 3 features:** thin Xcode app shell target (`App/`) plus a local `Packages/` directory with feature and domain targets in `Package.swift`. The dependency graph in `Package.swift` (`targets: [.target(name: "OrdersFeature", dependencies: ["Domain"])]`) is the compiler-enforced boundary fitness function: peer features cannot import each other unless listed in `dependencies`.
- **When overkill (KISS):** a small utility app or prototype with 1 to 2 screens keeps a single target with feature folders (`Features/Orders/`, `Features/Settings/`).

## Judgement seeds for `CODING_STANDARDS.md`

- SwiftUI `View` bodies stay under ~60 lines; extract subviews into dedicated `View` types and keep side effects in `@Observable` models or services. For view structure, state, lists, navigation, animation, and deprecated-API rules, call the Skill tool with `swiftui`; reviewers and implementers both use it, and this file does not restate them.
- Model loading/loaded/error screen state as an explicit `enum` rather than separate `isLoading: Bool`, `error: Error?`, and `data: T?` properties that permit impossible combinations.
- Never invent Apple framework APIs from memory when targeting recent OS releases (such as iOS 26 or iOS 27); verify symbol availability against the SDK or Apple developer documentation first (the Sosumi MCP, or `sosumi fetch <path>` when that CLI is on `$PATH`, returns a documentation page as Markdown).
