# Build Compilation

Find the Swift and mixed-language compile hotspots behind a slow build, and fix them where the evidence says it will shorten the wait. Read it when the benchmark shows `SwiftCompile`, `CompileC`, `SwiftEmitModule`, or `Planning Swift module` dominating, or when the developer reports slow type-checking.

## Evidence first

1. Start from a `.build-benchmark/` artifact or raw `-showBuildTimingSummary` output; rank the compile categories.
2. Decide whether the cost is broad compilation volume or a few extreme hotspots, and whether it sits on the critical path (`BUILD-OPTIMIZATION.md`, Prioritization). Fixes for parallelized compile work are labelled "Reduces compiler workload (parallel)", never "Reduces build time".
3. Capture hotspots with the diagnostics script, which injects the flags through `OTHER_SWIFT_FLAGS` for one build and leaves project settings untouched:

   ```bash
   python3 scripts/diagnose_compilation.py \
     --project App.xcodeproj \
     --scheme MyApp \
     --configuration Debug \
     --destination "platform=iOS Simulator,name=iPhone 16" \
     --threshold 100 \
     --output-dir .build-benchmark
   ```

   It writes a diagnostics artifact ranking functions and expressions above the millisecond threshold, exits non-zero when the build fails, and accepts `--function-timing` (unfiltered per-function type-check times plus a per-file total) and `--stats-output` (compiler statistics JSON per compilation unit).

The underlying frontend flags, passed as `-Xfrontend <flag>`:

| Flag | Output |
|---|---|
| `-warn-long-function-bodies=<ms>` | `warning: global function 'f()' took 20ms to type-check (limit: 1ms)` |
| `-warn-long-expression-type-checking=<ms>` | `warning: expression took 8ms to type-check (limit: 1ms)` |
| `-debug-time-function-bodies` | Tab-separated lines: milliseconds, `file:line:col`, symbol (every function, unfiltered) |
| `-debug-time-expression-type-checking` | Tab-separated lines: milliseconds, `file:line:col` |
| `-stats-output-dir <dir>` | Statistics JSON per compilation unit; the directory must already exist |

Prefer these ad hoc flags over persistent build-setting edits while investigating. Older write-ups cite `-debug-time-compilation`; Swift 6.4 rejects it as an unknown argument, so use the rows above.

## Triage questions

- Does one file or expression dominate, or does the cost spread across many files?
- Is the cost Swift type-checking, mixed-language bridging, or header import churn?
- Do many files in one module pay the same module-setup cost repeatedly?
- Is `SwiftEmitModule` large next to compile time for the same target? One reported case: a single added newline took 68.9s to emit the module (Swift Forums, large app); read this as "emit time can dominate incremental builds in big modules", with the module's size and macro usage as the first suspects.
- Does `Planning Swift module` dominate incremental builds? Then the cause is invalidation, not source: continue in `BUILD-PROJECT-SETTINGS.md` (Incremental overhead).

## Source patterns

Apply a pattern only to code the diagnostics flagged, and confirm with a before and after run of the same warning flag.

Apple documents these (Improving build efficiency with good coding practices):

- Give explicit types where a complex expression forces inference.
- Simplify complex one-line closures and expressions.
- Type delegates with a named protocol instead of `AnyObject?`.
- Use framework-qualified imports (`#import <UIKit/UIKit.h>`).
- Keep the Objective-C bridging header and the generated Swift header small: mark internal-only Swift members `private`.

Common practice, not Apple-documented, so verify each by measurement:

- Break long chains (`.map().filter().reduce()`) into typed intermediates.
- Replace nested ternaries and overloaded-operator chains with simple steps.
- Give closures passed to generic functions an explicit return type.
- Extract a large SwiftUI `body` into separate `struct View` types (a `@ViewBuilder` property keeps the expression in one scope). `VIEW-STRUCTURE.md` covers the same refactor for runtime invalidation.
- Flatten deep generic constraints with a `typealias`, or return `some Protocol`.

### Before and after

Explicit types and shorter chains:

```swift
// Before
let result = items.map { $0.value }.filter { $0 > threshold }.reduce(0, +)

// After
let mapped: [Double] = items.map { $0.value }
let filtered: [Double] = mapped.filter { $0 > threshold }
let result: Double = filtered.reduce(0, +)
```

Closure return types:

```swift
// Before
let handler = { value in
    guard let result = try? process(value) else { return nil }
    return result.transformed()
}

// After
let handler: (InputType) -> OutputType? = { (value: InputType) -> OutputType? in
    guard let result = try? process(value) else { return nil }
    return result.transformed()
}
```

SwiftUI body extraction:

```swift
// Before: one result-builder expression
var body: some View {
    VStack {
        HStack { Image(systemName: "person"); Text(user.name); Spacer(); Button("Edit") { showEdit = true } }
        List(items) { item in HStack { Text(item.title); Spacer(); Text(item.subtitle) } }
    }
}

// After: each struct is its own type-checking scope
var body: some View {
    VStack {
        UserHeaderView(user: user, showEdit: $showEdit)
        ItemListView(items: items)
    }
}
```

## Impact heuristics

- High: repeated type-check warnings in a hot module, a giant bridging header, or a few files dominating compile time.
- Medium: several moderate hotspots in result builders or overloaded generic code.
- Low: isolated warnings without measurable benchmark impact.

Hand findings to `BUILD-PROJECT-SETTINGS.md` when scripts dominate instead of compilation, when project settings block module reuse, or when `Planning Swift module` points at input invalidation.
