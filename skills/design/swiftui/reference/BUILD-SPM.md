# Build SPM

Find Swift Package Manager structure, plugins, macros, and configuration drift that slow clean or incremental Xcode builds. Read it when packages, plugins, or the dependency graph are suspected. Package analysis is evidence gathering first; no dependency is replaced or manifest rewritten without approval.

## Verify before recommending

Confirm a package is in the project's dependency graph before it enters any recommendation: a `Vendor/` directory can hold packages no target links.

- Local package: an `XCLocalSwiftPackageReference` entry in `project.pbxproj` points at its path.
- Remote package: an `XCRemoteSwiftPackageReference` entry exists, and an `XCSwiftPackageProductDependency` links its product to at least one target.
- Present on disk but not referenced: leave it out.

## What to inspect

- `Package.swift`, `Package.resolved`, and local versus remote packages.
- Build-tool and command plugins in use, and binary-target footprint.
- Dependency layering, repeated imports, cycles.
- Timing summaries or logs that show package-related work.

## Version pins

`branch:` tracks a moving ref, so it re-resolves on `swift package update`; an exact version or `revision:` is immutable and makes resolution deterministic. Scan every branch-pinned dependency at once:

```bash
python3 scripts/check_spm_pins.py --project App.xcodeproj
```

Add `--json` for machine output. Each pin reports a `status`: `tags-available` (pin to a tag; newest tags are listed), `no-tags` (pin a `revision:` hash), `lookup-failed` (git failed or timed out; retry before concluding anything), or `rejected-url` (the URL is not https, ssh, or scp-style, so it was never passed to git). The pbxproj is untrusted data. Distinguish packages whose upstream simply has no tags from packages that have tags but track a branch on purpose. Verify a proposed pin with `xcodebuild -resolvePackageDependencies` before applying it.

## Graph shape

- **Layering**: dependencies flow one way, Common/Core to Services/Domain to Features/UI. Features depend on shared lower layers, never on each other.
- **Cycles**: since tools-version 6.0 packages may depend on each other (A on B, B on A) as long as no target-level cycle results (SwiftPM changelog, #7530). Target cycles must be refactored: extract the shared protocols and DTOs into a module both sides import.
- **Module size**: a large module widens incremental rebuild scope. Rule of thumb (a heuristic, not an Apple figure): suspect modules past roughly 200 files, and split by feature or responsibility.
- **Re-exports**: umbrella modules built on `@_exported import` hide dependency chains, so a change in any re-exported module rebuilds every importer.
- **Interface and implementation**: put protocols and public types in a light interface module (`NetworkingInterface`) and implementations in another, so features compile against the interface without waiting on the implementation. Most valuable when the implementation is large or heavy.
- **Tests**: test targets depend on the module under test, not the app target (which forces a full app build first). Shared mocks and fixtures live in one `TestHelpers` module.
- **Transitive weight**: each module depends only on what it uses.

```swift
// Before: cycle
.target(name: "FeatureA", dependencies: ["FeatureB"]),
.target(name: "FeatureB", dependencies: ["FeatureA"]),

// After
.target(name: "SharedContracts", dependencies: []),
.target(name: "FeatureA", dependencies: ["SharedContracts"]),
.target(name: "FeatureB", dependencies: ["SharedContracts"]),
```

```swift
// Before
.target(name: "Networking", dependencies: ["Models"]),
.target(name: "FeatureA", dependencies: ["Networking"]),

// After
.target(name: "NetworkingInterface", dependencies: []),
.target(name: "Networking", dependencies: ["NetworkingInterface", "Models"]),
.target(name: "FeatureA", dependencies: ["NetworkingInterface"]),
```

## Plugins

List the build-tool and command plugins in the build. SwiftPM runs a plugin's prebuild commands before every build, while its build commands join the build graph and run only when an input changed or an output is missing (SwiftPM, Writing a Build Tool Plugin). Recommend build commands over prebuild commands, and measure whether a plugin adds fixed overhead to builds where no input changed.

## Macros

- Xcode 26 downloads a prebuilt swift-syntax from swift.org for Swift macro targets, enabled automatically (Xcode 26 release notes); opting out is `defaults write com.apple.dt.Xcode IDEPackageEnablePrebuilts NO`. When prebuilts are off or unavailable, swift-syntax compiles from source: check the log for `swift-syntax` compile tasks before blaming macro code. A user on Xcode 26.4 reports it still building for all architectures when no prebuilt matched (anecdotal).
- Heavy macro use (TCA and other swift-syntax-based libraries) is reported to turn trivial edits into near-full rebuilds. One forum diagnosis attributes unnecessary replanning to non-deterministic input order of macro plugins, with a swift-build fix (#1203, merged 2026-03-19); which Xcode ships it is unconfirmed. Isolating macro-using code in fewer, stable modules limits the blast radius.

## Module variants and multi-platform builds

- The same module appearing repeatedly in timing output usually means differing package or target options forced extra variants; uniform options matter more than trimming source (`BUILD-PROJECT-SETTINGS.md`, cross-target consistency). Compare macros, language mode, and configuration-sensitive options across dependents.
- Adding a platform can build shared packages once per platform and architecture slice. One reported app built packages three times after adding watchOS (iOS arm64, iOS x86_64, watchOS arm64). Look for duplicate `SwiftCompile`, `SwiftEmitModule`, and `ScanDependencies` tasks for one package across slices, and consider whether the secondary platform needs the whole package set.

## Modular SDK migration

Splitting one umbrella dependency into several modular targets does not by itself reduce build time: each target is compiled, scanned, and emits its module separately, so `SwiftCompile`, `SwiftEmitModule`, and `ScanDependencies` task counts rise. Compare total `SwiftCompile` task counts and benchmark both configurations first. Recommend the move for speed only when the project compiles large unused portions of the monolith that the modular form would skip; otherwise it improves import hygiene at flat or worse build time.

## CI

Note fresh-checkout cost (remote fetch, binary-target extraction), plugin invocation cost, cache-hit sensitivity, and redundant package resolution. `xcodebuild -resolvePackageDependencies` with `-clonedSourcePackagesDirPath` pins where checkouts land.

## Impact heuristics

- High: plugins or graph shape that repeatedly inflate incremental builds, cycles, umbrella re-exports causing cascading rebuilds, macro cascades causing near-full rebuilds.
- Medium: configuration drift producing duplicate module variants, oversized modules, missing interface separation, multi-platform multiplication, swift-syntax built without a prebuilt.
- Low: checkout costs that barely touch local iteration, minor transitive cleanup.

If the main problem is not packages, hand off to `BUILD-PROJECT-SETTINGS.md` or `BUILD-COMPILATION.md`.
