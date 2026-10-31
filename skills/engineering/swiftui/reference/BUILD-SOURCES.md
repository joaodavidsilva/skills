# Build Sources

Where the claims in the `BUILD-*` references come from, and which are only reported. Primary sources were checked against Xcode 27.1 (Swift 6.4) and Apple, Swift, SwiftPM, and CocoaPods documentation; setting keys, defaults, and flag output were confirmed by running the tools.

## Primary

| Source | Supports |
|---|---|
| [Improving the speed of incremental builds](https://developer.apple.com/documentation/xcode/improving-the-speed-of-incremental-builds) | Build With Timing Summary; Dependency Order; declared script inputs and outputs, `.xcfilelist`; `DEFINES_MODULE` and framework-qualified imports; identical build options for module reuse; accurate target dependencies |
| [Improving build efficiency with good coding practices](https://developer.apple.com/documentation/xcode/improving-build-efficiency-with-good-coding-practices) | Framework-qualified imports; small bridging and generated headers; explicit types; explicit delegate protocols; simpler closures |
| [Building your project with explicit module dependencies](https://developer.apple.com/documentation/xcode/building-your-project-with-explicit-module-dependencies) | Scan, module-build, and source-compile stages; module variants from inconsistent options; Swift/C++ interop exclusion |
| [Xcode 26 release notes](https://developer.apple.com/documentation/xcode-release-notes/xcode-26-release-notes) | Compilation caching is opt-in for Swift and C-family, helps branch switching and clean builds, and can be set per user; Swift explicit modules default for all Swift targets (opt out with `SWIFT_ENABLE_EXPLICIT_MODULES=NO`); prebuilt swift-syntax for macro targets |
| [WWDC24: Demystify explicitly built modules](https://developer.apple.com/videos/play/wwdc2024/10171/) | How explicit module builds divide the work |
| Local Xcode 27.1 build-system specs and `xcodebuild -showBuildSettings` | Every setting key, value list, and default in `BUILD-PROJECT-SETTINGS.md` |
| `swiftc -frontend -help-hidden` and real builds | Frontend flags and the warning and timing line formats in `BUILD-COMPILATION.md` |
| SwiftPM [changelog (#7530)](https://github.com/swiftlang/swift-package-manager/blob/main/CHANGELOG.md) and plugin docs | Package-level cycles from tools-version 6.0; prebuild versus build commands |
| CocoaPods blog: [Support Plans](https://blog.cocoapods.org/CocoaPods-Support-Plans/), [Trunk Read-only Plan](https://blog.cocoapods.org/CocoaPods-Specs-Repo/) | Maintenance mode; trunk read-only plan and 2 December 2026 date |

## Reported only

Treat these as field reports, not guarantees, and verify on the project at hand.

| Report | Origin |
|---|---|
| Task Backtraces exist from Xcode 26.4 and where to enable them | [Swift Forums thread](https://forums.swift.org/t/slow-incremental-builds-because-of-planning-swift-module/84803); absent from Xcode release notes |
| `Planning Swift module` up to 30s per module; a 68.9s `SwiftEmitModule` after a one-line change; about 10s zero-change overhead; one app building packages three times after adding watchOS | Same thread, individual users' builds |
| Asset catalogs compile single-threaded per target | Same thread, disputed in the replies; no Apple statement |
| Non-cacheable tasks (`CompileStoryboard`, `CompileXIB`, `CompileAssetCatalogVariant`, `PhaseScriptExecution`, `DataModelCompile`, `CopyPNGFile`, `GenerateDSYMFile`, `Ld`) | Bitrise Xcode Compilation Cache FAQ (Sept 2025), no Apple list |
| Macro-plugin input order causing replanning, fixed in swift-build #1203 | Forum diagnosis; shipping Xcode version unconfirmed |

## Not carried over

Claims from earlier drafts that failed verification: `-debug-time-compilation` (rejected by Swift 6.4), `SWIFT_USE_INTEGRATED_DRIVER` as a setting to recommend (legacy key, unset in Xcode 27.1), "SPM dependencies are not cacheable" (a local package's Swift compile was cached in Xcode 27.1; remote packages untested), fixed 5-second and 5-14% figures, and "CocoaPods is deprecated" (the accurate statement is maintenance mode plus the trunk plan).
