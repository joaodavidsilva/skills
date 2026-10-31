# Build Project Settings

Audit build settings, run-script phases, targets, schemes, and fixed per-build overhead for build-time wins that source edits cannot deliver. Read it when the benchmark points at settings, scripts, zero-change overhead, incremental replanning, or asset catalogs. Report debug-only pain and release-only pain separately.

## Settings audit

The resolved values are the source of truth: they include inheritance, `.xcconfig` files, and target overrides that a `project.pbxproj` read misses. For each configuration of the benchmarked scheme:

```bash
xcodebuild -project App.xcodeproj -scheme MyApp -configuration Debug -showBuildSettings -json
```

The output is an array of `{action, buildSettings, target}`, one entry per target (`-json` implies `-quiet`); a bare Swift package returns `[]`, so parse defensively. Compare Debug and Release against the table, mark each `[x]` or `[ ]` with the actual and recommended values, and list target-level overrides under cross-target consistency. The scope is build performance: leave `SWIFT_STRICT_CONCURRENCY`, `SWIFT_UPCOMING_FEATURE_*`, `SWIFT_APPROACHABLE_CONCURRENCY`, and per-target `SWIFT_ACTIVE_COMPILATION_CONDITIONS` out of the audit; they are adoption or product choices.

| Setting | Debug | Release | Why |
|---|---|---|---|
| `SWIFT_COMPILATION_MODE` | `singlefile` (the default; the UI calls it Incremental) | `wholemodule` | Single-file mode rebuilds only out-of-date Swift files; whole-module optimizes the shipped binary |
| `SWIFT_OPTIMIZATION_LEVEL` | `-Onone` | `-O` or `-Osize` | Optimization passes cost compile time Debug does not need |
| `GCC_OPTIMIZATION_LEVEL` | `0` | `s` (the default when unset) | Same for C-family sources; allowed values are `0`, `1`, `2`, `3`, `s`, `fast`, `z` |
| `ONLY_ACTIVE_ARCH` | `YES` | `NO` | Extra architectures multiply compile and link work; Release ships all of them |
| `DEBUG_INFORMATION_FORMAT` | `dwarf` | `dwarf-with-dsym` | A dSYM adds work Debug rarely needs; Release needs dSYMs for symbolication |
| `ENABLE_TESTABILITY` | `YES` | `NO` | Debug needs it for `@testable import`; Release drops the exported internal symbols |
| `COMPILATION_CACHE_ENABLE_CACHING` | `YES` | `YES` | Opt-in (off by default) umbrella for `SWIFT_ENABLE_COMPILE_CACHE` and `CLANG_ENABLE_COMPILE_CACHE`; Xcode 26 release notes say branch switching and clean builds benefit most; per-user project settings can enable it without committing |
| `CLANG_ENABLE_MODULES` | `YES` | `YES` | Module compilation for C-family sources; Xcode project templates set it |

Evaluate, benchmark before and after, and keep only on a measured win:

- `EAGER_LINKING` (default `NO`): emits a TBD file for Swift-only framework and dylib targets so dependents link early. Worth testing when the project has Swift framework or dylib targets.
- `SWIFT_ENABLE_EXPLICIT_MODULES` (default `YES` for Swift targets from Xcode 26; `NO` opts out) and `CLANG_ENABLE_EXPLICIT_MODULES` (default `YES`): explicit module builds show module work as discrete tasks (dependency scanning, module compilation, source compilation). They are not supported with Swift/C++ interop and are off for Swift 4 and earlier.

### Cross-target consistency

Targets that compile the same module with different options force extra module variants and defeat module-cache reuse (Apple: compile with identical build options to reuse module caches). Compare across targets that import the same modules: `SWIFT_COMPILATION_MODE`, `SWIFT_OPTIMIZATION_LEVEL`, `ONLY_ACTIVE_ARCH`, `DEBUG_INFORMATION_FORMAT`, `OTHER_SWIFT_FLAGS`, and preprocessor macros. Set build-affecting values at the project level and override per target only for a stated reason. Build With Timing Summary reports the option differences behind repeated module builds.

## Run-script phases

Apple: a Run Script phase with no declared inputs or outputs runs on every build, and phases run serially by default; a script re-runs when it has no inputs, no outputs, a changed input, or a missing output.

- Declare at least one input and one output per script, or move long lists into `.xcfilelist` files.
- Turn on "Based on dependency analysis" once inputs and outputs are declared; clear `alwaysOutOfDate = 1` where it is not needed.
- Guard release-only work (symbol uploads, network calls) so Debug and Simulator builds skip it:

```bash
# Before
./scripts/upload-dsyms.sh

# After
[[ "$CONFIGURATION" != "Release" ]] && exit 0
./scripts/upload-dsyms.sh
```

- Linters and formatters that touch file timestamps without changing content invalidate build inputs and force module replanning (reported on the Swift Forums). Check for them when `Planning Swift module` dominates.

## Targets and schemes

- Target dependencies are accurate: missing ones break builds, inflated ones block parallel work.
- The scheme builds in Dependency Order.
- Custom frameworks that should expose a module map enable `DEFINES_MODULE` (default `NO`; new frameworks enable it) and their public headers are self-contained.
- Imports are framework-qualified where available.
- Oversized monolithic targets serialize compilation; split them when the timeline shows the target on the critical path.

## Zero-change overhead

A rebuild with no edits still pays fixed cost. Read the categories in the zero-change run's Build Timing Summary:

| Category | Suspect when |
|---|---|
| `PhaseScriptExecution` | Scripts lack input and output declarations or run `alwaysOutOfDate` |
| `CodeSign`, `ValidateEmbeddedBinary` | Many signed or embedded binaries |
| `CopySwiftLibs`, `ProcessInfoPlistFile`, `RegisterWithLaunchServices` | They scale with target count |
| `ExtractAppIntentsMetadata` | Large share of the build: record it with actionability `xcode-behavior` unless Apple documents a repo-local switch (the phase spans all targets, including dependencies) |

One reported case (Swift Forums, large app) measured about 10 seconds of zero-change overhead: build-description work, about 1 second of lint script per target, 1.4 seconds of signing, and 0.7 seconds of watchOS validation. Apple publishes no threshold, so judge by the share of wall-clock the categories hold in your own artifact.

## Incremental overhead

- **`Planning Swift module`** can dominate incremental builds (a user reported up to 30 seconds per module). Modules replanned with no compiles scheduled mean the inputs look modified: look for timestamp-touching scripts and macro-plugin churn (`BUILD-SPM.md`).
- **`SwiftEmitModule`** large next to compile time for the same target: the module is large or macro-heavy; narrow its public surface or split it.
- **Task Backtraces** explain why each task re-ran. Reported on the Swift Forums for Xcode 26.4 and later (no Xcode release note covers it): Scheme Editor, Build tab, Build Debugging, enable Task Backtraces; after a build, open the Report navigator, choose Recent, All Messages, and expand a task to read its backtrace. Recommend it when incremental overhead is unexplained, and cite what it shows.

## Asset catalogs

When `CompileAssetCatalog` shows up as a significant category: reports on the Swift Forums say catalogs in one target compile in one task while separate targets compile in parallel, and a user showed several bundles compiling in parallel on Xcode 26.3; Apple publishes no statement, so confirm in the build timeline before recommending a split into separate resource targets. Check also whether catalogs rebuild in incremental builds with no asset change, which points at invalidated inputs. `CompileAssetCatalogVariant` is reported non-cacheable by compilation caching (Bitrise FAQ).

## CocoaPods projects

CocoaPods is in maintenance mode (support-plans post, 13 Aug 2024) and its trunk is planned to stop accepting new podspecs on 2 December 2026, with dates "not set in stone" (trunk read-only plan, updated May 2025). Audit first-party targets and the settings the project controls, and leave `Pods.xcodeproj` and the Podfile alone. Report a move to Swift Package Manager as a long-term option whose build-time effect stays unmeasured until benchmarked.

## Fix patterns

Settings in `project.pbxproj`, matched by target and configuration:

```
DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";   ->   DEBUG_INFORMATION_FORMAT = dwarf;
SWIFT_COMPILATION_MODE = wholemodule;           ->   SWIFT_COMPILATION_MODE = singlefile;   (Debug)
COMPILATION_CACHE_ENABLE_CACHING = NO;          ->   COMPILATION_CACHE_ENABLE_CACHING = YES;
```

Script inputs and outputs:

```
Input Files:
  $(SRCROOT)/scripts/generate-constants.sh
  $(SRCROOT)/Config/constants.json
Output Files:
  $(DERIVED_FILE_DIR)/GeneratedConstants.swift
```

After each settings edit, confirm the value with `xcodebuild -showBuildSettings`.

## Impact heuristics

- High: serial script bottlenecks, missing script dependency metadata, configuration drift causing redundant module builds, excessive `Planning Swift module` time, scripts silently invalidating inputs.
- Medium: stale target structure, noncritical scripts running too often, slow asset catalog compilation on the critical path, significant `ExtractAppIntentsMetadata` time in a project without App Intents.
- Low: settings cleanup without evidence of current impact.

Hand package-graph and plugin findings to `BUILD-SPM.md`.
