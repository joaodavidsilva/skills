# Build Benchmarking

Produce a repeatable Xcode build baseline before anyone optimizes, and the same measurement afterwards for comparison. The artifact must let the next step answer: is the pain clean, incremental, or both; which categories dominate; which command produced the evidence; is the baseline stable enough to compare.

## Contract

- Measure clean and incremental builds separately; both are the default.
- Hold command, scheme, configuration, destination, flags, and warm-up rules constant across runs.
- Record the exact command and any environment override.
- Leave project files unchanged. The script only updates the modification time of the `--touch-file` source file.
- A failed build stops the run: keep the raw log, write the artifact with the failed run recorded, and exit non-zero. Failed and successful runs never mix into one summary.

Inputs to confirm or infer: workspace or project path, scheme, configuration, destination, simulator or device numbers, and a custom `DerivedData` path if needed.

## Run plan

| Build type | Runs | What it measures | How |
|---|---|---|---|
| Clean | 3 | Full build-system, package, and module setup cost with a cold compilation cache | `xcodebuild clean` before each run |
| Cached clean | 3 | Clean build with a warm compilation cache: branch switching, pulling changes, Clean Build Folder | Only when `COMPILATION_CACHE_ENABLE_CACHING = YES`; the script warms the cache, then deletes its own private DerivedData before each run. `--no-cached-clean` skips it |
| Zero-change | 3 | Fixed overhead floor: dependency computation, project description transfer, build description creation, script phases, codesigning, validation | Rebuild immediately after a successful build, no edits (default incremental mode) |
| Incremental | 3 | A real edit-rebuild loop | `--touch-file path/to/SomeFile.swift` before each build |

A zero-change build that takes more than a few seconds signals avoidable per-build overhead (see `BUILD-PROJECT-SETTINGS.md`).

## Command

```bash
python3 scripts/benchmark_builds.py \
  --project App.xcodeproj \
  --scheme MyApp \
  --configuration Debug \
  --destination "platform=iOS Simulator,name=iPhone 16" \
  --output-dir .build-benchmark
```

Use `--workspace App.xcworkspace` in place of `--project` when required. Destinations: `platform=macOS`, `platform=watchOS Simulator,name=Apple Watch Series 10`, `platform=tvOS Simulator,name=Apple TV`; omit `--destination` for the scheme default. Add `--touch-file` for the incremental loop, `--repeats 5` for more runs, `--extra-arg` for extra `xcodebuild` arguments, `--skip-warmup` to skip the validation build.

Without the script, run equivalent `xcodebuild` commands with `-showBuildTimingSummary` and keep the raw output.

## Interpreting results

- Headline numbers are **medians**, reported with min, max, and spread. The first clean build after warm-up often runs slower than later ones (cold disk and linker caches), so prefer median to mean.
- **Variance check**: per build type, a spread (max minus min) above 20% of the median is high variance. Rerun with 5+ repeats before drawing conclusions. After changes, claim an improvement only when the post-change median falls outside the baseline's min-max range.
- `duration_seconds` and `median_seconds` are wall-clock. `timing_summary_categories` are aggregated task times across cores, so they usually exceed wall-clock: a large `SwiftCompile` total is compiler workload, not proof compilation blocks the build.
- Report: median, min, max per build type; the biggest timing categories; environment details that affect comparison (Xcode version, macOS version, host); and the artifact path.

## Artifact

`.build-benchmark/<UTC timestamp>-<scheme>.json`, with raw logs beside it (`...-clean-1.log`, `...-cached-clean-1.log`, `...-zero-change-1.log` or `...-incremental-1.log`, and so on). The JSON holds the schema version, creation time, `status` (`ok`, or `failed` when a build stopped the run), `build` context (entry point, path, scheme, configuration, destination, command), `environment` (host, macOS, Xcode), `runs` per build type, `summary` statistics per build type, parsed timing categories per run, and `notes`.

Raw logs let later steps re-parse timing summaries, inspect failures, search for long type-check warnings, and correlate build-system phases with recommendations.

## Setup traps

- Inside a git worktree, SwiftPM packages whose `exclude:` paths name gitignored directories (for example `__Snapshots__`) crash `xcodebuild -resolvePackageDependencies`: create those empty directories first.
- A project that does not compile: check `git log` for a recent buildable commit. In a worktree, cherry-picking a targeted build fix from a feature branch is acceptable to reach a buildable state.
