# Build Reporting

The shared shape for recommendations, the plan file, and the final report, so findings from every analysis merge and rank cleanly.

## Recommendation

Fields, in this order (it lets the developer approve or reject quickly):

1. `title`
2. `wait_time_impact`: plain-language effect on the developer's wait, in the impact language below
3. `actionability`: `repo-local` (fix lives in project files, source, or local config), `package-manager` (SwiftPM or CocoaPods changes with broad side effects, benchmark before and after), `xcode-behavior` (cost driven by Xcode internals, report for awareness and promise no fix), or `upstream` (needs a change in a third-party dependency or tool)
4. `category`: for example `project`, `build-settings`, `compilation`, `spm`
5. `observed_evidence`: the numbers, log lines, or configuration that prove it
6. `estimated_impact`
7. `confidence`
8. `approval_required`
9. `benchmark_verification_status`: `Not yet verified`, `Queued for verification`, `Verified improvement`, `No measurable improvement`, or `Inconclusive due to benchmark noise`

Optional: `scope`, `affected_files`, `affected_targets`, `affected_packages`, `implementation_notes`, `risk_level`.

## Impact language

Every recommendation uses one of these statements:

- "Expected to reduce your [clean/incremental] build by approximately X seconds."
- "Reduces parallel compile work but is unlikely to reduce your build wait time because other tasks take equally long."
- "Impact on wait time is uncertain; re-benchmark after applying to confirm."
- "No wait-time improvement expected. The benefit is [deterministic builds / faster branch switching / reduced CI cost]."

Cumulative task-time savings are never the headline: shaving 5 seconds of parallel compile work changes nothing while an equally long task still runs.

## Plan file

`.build-benchmark/optimization-plan.md`, sections in this order:

1. **Project Context**: project path, scheme, configuration, destination, Xcode and macOS versions, date, benchmark artifact path.
2. **Baseline Benchmarks**: a table of median, min, max, and run count per build type (clean, cached clean, zero-change or incremental). Add the note that timing-summary category seconds are aggregated across cores and usually exceed the wait.
3. **Build Settings Audit**: checklist from `BUILD-PROJECT-SETTINGS.md`.
4. **Compilation Diagnostics**: table of duration, kind, file, line, name from `diagnose_compilation.py`; state "skipped" when it did not run.
5. **Prioritized Recommendations**: each as a Recommendation above.
6. **Approval Checklist**: one checkbox line per recommendation with name, expected wait-time impact, affected files or settings, and risk (low, medium, high). Nothing is implemented until the developer checks items.
7. **Next Steps**: the re-benchmark command with the same inputs as the baseline.

State a noisy verification as inconclusive; never imply an unapproved item was applied.

## Execution report

Appended to the plan after Phase 2:

```markdown
## Execution Report

### Baseline
- Clean build median: X.Xs
- Cached clean build median: X.Xs (if applicable)
- Incremental build median: X.Xs

### Changes Applied

| # | Change | Actionability | Measured Result | Status |
|---|--------|---------------|-----------------|--------|
| 1 | Description | repo-local | Clean: X.Xs to Y.Ys, Incr: X.Xs to Y.Ys | Kept |

### Final Cumulative Result
- Clean build median: X.Xs (was Y.Ys), Z.Zs faster or slower
- Cached clean build median: X.Xs (was Y.Ys), Z.Zs faster or slower
- Incremental build median: X.Xs (was Y.Ys), Z.Zs faster or slower
- **Net result:** Faster / Slower / Unchanged

### Blocked or Non-Actionable Findings
- Finding: reason it could not be addressed from the repo

### Remaining follow-up
- Item, and why it was deferred
```

Status values:

- `Kept`: improved or maintained build times.
- `Kept (best practice)`: a recommended setting, kept whatever the immediate benchmark showed.
- `Reverted`: regressed build times.
- `Blocked`: project structure, Xcode behavior, or external constraints prevented it.
- `No improvement`: compiled but showed no wall-time benefit; say whether it was kept for non-performance reasons or reverted.

## Final report wording

Lead with the wall-clock result in plain language: "Your clean build now takes 82s (was 86s), 4s faster." Then give baseline and post-change medians, absolute and percentage deltas, what changed, what was left unchanged, and the confidence notes.

- High variance (spread above 20% of median): say so instead of presenting noisy numbers as improvements or regressions.
- Task metrics improved but wall-clock did not: "Compiler workload decreased but build wait time did not improve. This is expected when Xcode runs these tasks in parallel with other equally long work."
- Standard clean slower but cached clean faster: "Standard clean builds show overhead from compilation cache population. Cached clean builds (the realistic developer workflow) are faster, confirming the net benefit."
- No measurable gain: `No measurable wall-time improvement`, with a keep-or-revert suggestion.
