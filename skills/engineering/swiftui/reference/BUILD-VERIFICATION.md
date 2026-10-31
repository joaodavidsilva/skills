# Build Verification

Apply approved build-optimization changes, then prove them with the same benchmark that produced the baseline. Used in Phase 2 of `BUILD-OPTIMIZATION.md`.

## Rules

- Apply only items the developer approved: the checked boxes in `.build-benchmark/optimization-plan.md`, or one explicit instruction such as "set `DEBUG_INFORMATION_FORMAT` to `dwarf` for Debug".
- One logical fix at a time (apply, then confirm it compiles), so each change stays reviewable and reversible.
- Report exactly what changed, which files were touched, and the measured delta; flag a no-gain or regressing change immediately.
- Benchmark once after the last change. When the cumulative result regresses, bisect the speculative items: revert and re-benchmark one at a time to attribute the delta.

## Steps

1. Read the approved plan or instruction.
2. For each approved item, name the exact files and locations (the branch files list the fix patterns: settings and scripts in `BUILD-PROJECT-SETTINGS.md`, source in `BUILD-COMPILATION.md`, packages in `BUILD-SPM.md`).
3. Apply it, then confirm compilation with a quick `xcodebuild build`. For a settings edit in `project.pbxproj`, match the `buildSettings` block by target and configuration name, and confirm the value with `xcodebuild -showBuildSettings`.
4. After all items, rerun `scripts/benchmark_builds.py` with the baseline's exact inputs.
5. Compare post-change medians to the baseline and report in the `BUILD-REPORTING.md` execution report.

Done when each approved item has a status and every build type in the baseline has a post-change median.

## Evaluating regressions

A slower number is not automatically a regression. Read all build types together.

- **Cache population trade-off**: `COMPILATION_CACHE_ENABLE_CACHING = YES` can slow a standard clean build (cache population) while speeding cached clean builds, the realistic workflow for branch switching, pulling, and Clean Build Folder. Slower standard clean plus faster cached clean is a net improvement. The same holds for any change that costs more the first time and less afterwards.
- **Daily workflow decides**: a change is a clear regression only when it worsens the metrics the developer's daily loop depends on. A slower cold-start clean build matters little if cold builds are rare.
- **Cumulative value**: a change that regresses alone can stay when it unlocks a larger combined gain.
- **Variance**: compare against the baseline's min-max range, not a single run.

### Template-default settings stay

These settings are Xcode's own template values for the configuration (or, for compilation caching, the opt-in feature Apple's release notes say benefits branch switching and clean builds). Once applied they are kept regardless of one benchmark, and a single result never justifies reverting them:

- `COMPILATION_CACHE_ENABLE_CACHING = YES`
- `DEBUG_INFORMATION_FORMAT = dwarf` (Debug)
- `SWIFT_COMPILATION_MODE = singlefile` (Debug)
- `ONLY_ACTIVE_ARCH = YES` (Debug)

`EAGER_LINKING` and explicit-module changes are experiments: keep them only on a measured win.

Report the kept settings as: "Applied the recommended build setting. No immediate benchmark improvement measured, but it matches Xcode's recommended configuration."

### Speculative changes may revert

Source refactors, linkage experiments, script-phase edits, and dependency restructuring are speculative:

- Wall-clock regression across every measured build type (standard clean, cached clean, incremental): recommend reverting all speculative changes unless the developer keeps specific items for non-performance reasons.
- A single change with no median improvement and no cached or incremental benefit: flag `Recommend revert` with the measured delta.
- Separate "outlier reduction only" (better worst case) from "median improvement" (better typical wait).
- A trade between build types: show both numbers and let the developer decide, for example "Standard clean builds are X.Xs slower, but cached clean builds (the realistic daily workflow) are Y.Ys faster."

## Escalation

Findings outside the approved scope return to analysis: project gaps to `BUILD-PROJECT-SETTINGS.md`, compile hotspots to `BUILD-COMPILATION.md`, package graph issues to `BUILD-SPM.md`. New findings join the plan as unapproved items.
