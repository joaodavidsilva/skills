"""Benchmark Xcode clean, cached-clean, and incremental builds."""
from __future__ import annotations

import argparse
import json
import os
import platform
import shutil
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

from .timing import parse_timing_summary, stats_for
from .xcodebuild import (
    add_target_arguments,
    artifact_stem as make_artifact_stem,
    build_entrypoint,
    command_base,
    run_command,
    shell_join,
)


class BenchmarkFailure(Exception):
    """A build step failed; the run is recorded in the artifact and the benchmark stops."""

    def __init__(self, run: dict) -> None:
        super().__init__(f"{run['id']} failed with exit code {run['exit_code']}")
        self.run = run


class PrivateDerivedData:
    """A DerivedData directory this script created; the only directory it may delete."""

    def __init__(self) -> None:
        self.path = Path(tempfile.mkdtemp(prefix="xcode-bench-dd-"))

    def reset(self) -> None:
        shutil.rmtree(self.path, ignore_errors=True)

    def cleanup(self) -> None:
        shutil.rmtree(self.path, ignore_errors=True)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Benchmark Xcode clean and incremental builds.")
    add_target_arguments(parser)
    parser.add_argument("--output-dir", default=".build-benchmark", help="Output directory for artifacts")
    parser.add_argument("--repeats", type=int, default=3, help="Measured runs per build type")
    parser.add_argument("--skip-warmup", action="store_true", help="Skip the validation build")
    parser.add_argument(
        "--touch-file",
        help="Path to a source file to touch before each incremental build. "
        "When provided, measures a real edit-rebuild loop instead of a zero-change build.",
    )
    parser.add_argument(
        "--no-cached-clean",
        action="store_true",
        help="Skip cached clean builds even when COMPILATION_CACHE_ENABLE_CACHING is detected.",
    )
    parser.add_argument(
        "--extra-arg",
        action="append",
        default=[],
        help="Additional xcodebuild argument to append. Can be passed multiple times.",
    )
    return parser.parse_args(argv)


def validate_touch_file(touch_file: str | None) -> Path | None:
    """Return the touch-file path, or raise ValueError unless it is an existing regular file."""
    if not touch_file:
        return None
    path = Path(touch_file)
    if not path.is_file():
        raise ValueError(f"--touch-file is not an existing regular file: {path}")
    return path


def touch_mtime(path: Path) -> None:
    """Update the modification time only; never create or alter contents."""
    os.utime(path, None)


def xcode_version() -> str:
    result = run_command(["xcodebuild", "-version"])
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def detect_compilation_caching(base_command: list[str]) -> bool:
    """Check whether COMPILATION_CACHE_ENABLE_CACHING is enabled in the resolved build settings."""
    result = run_command([*base_command, "-showBuildSettings"])
    if result.returncode != 0:
        return False
    for line in result.stdout.splitlines():
        stripped = line.strip()
        if stripped.startswith("COMPILATION_CACHE_ENABLE_CACHING") and "=" in stripped:
            return stripped.split("=", 1)[1].strip() == "YES"
    return False


def execute_step(
    command: list[str],
    artifact_stem: str,
    output_dir: Path,
    step_id: str,
    build_type: str,
    parse_timing: bool,
) -> dict:
    """Run one xcodebuild command, write its raw log, and return the run record."""
    started = time.perf_counter()
    result = run_command(command)
    elapsed = round(time.perf_counter() - started, 3)
    combined = result.stdout + result.stderr
    log_path = output_dir / f"{artifact_stem}-{step_id}.log"
    log_path.write_text(combined)
    return {
        "id": step_id,
        "build_type": build_type,
        "duration_seconds": elapsed,
        "success": result.returncode == 0,
        "exit_code": result.returncode,
        "command": shell_join(command),
        "raw_log_path": str(log_path),
        "timing_summary_categories": parse_timing_summary(combined) if parse_timing else [],
    }


def measure_build(
    base_command: list[str],
    artifact_stem: str,
    output_dir: Path,
    build_type: str,
    run_index: int,
) -> dict:
    build_command = [*base_command, "build", "-showBuildTimingSummary"]
    return execute_step(
        build_command, artifact_stem, output_dir, f"{build_type}-{run_index}", build_type, True
    )


def run_support_step(
    runs: dict,
    key: str,
    command: list[str],
    artifact_stem: str,
    output_dir: Path,
    step_id: str,
    keep_log: bool,
) -> None:
    """Run an unmeasured step (warmup, clean prep). Failures are recorded and raised."""
    run = execute_step(command, artifact_stem, output_dir, step_id, key, False)
    if run["success"]:
        if not keep_log:
            Path(run["raw_log_path"]).unlink(missing_ok=True)
        return
    runs.setdefault(key, []).append(run)
    raise BenchmarkFailure(run)


def run_measured(
    runs: dict,
    key: str,
    base_command: list[str],
    artifact_stem: str,
    output_dir: Path,
    build_type: str,
    index: int,
) -> None:
    run = measure_build(base_command, artifact_stem, output_dir, build_type, index)
    runs.setdefault(key, []).append(run)
    if not run["success"]:
        raise BenchmarkFailure(run)


def run_warmup(runs: dict, base: list[str], stem: str, output_dir: Path) -> None:
    run_support_step(runs, "warmup", [*base, "build"], stem, output_dir, "warmup-build", False)
    run_support_step(runs, "warmup", [*base, "clean"], stem, output_dir, "warmup-clean", False)
    run_support_step(runs, "warmup", [*base, "build"], stem, output_dir, "warmup-rebuild", False)


def run_clean_builds(runs: dict, args: argparse.Namespace, base: list[str], stem: str, output_dir: Path) -> None:
    runs["clean"] = []
    for index in range(1, args.repeats + 1):
        run_support_step(
            runs, "clean_prep", [*base, "clean"], stem, output_dir, f"clean-prep-{index}", True
        )
        run_measured(runs, "clean", base, stem, output_dir, "clean", index)


def run_cached_clean_builds(
    runs: dict, args: argparse.Namespace, stem: str, output_dir: Path
) -> None:
    """Measure rebuilds after deleting DerivedData while the compilation cache stays warm.

    The build uses a private mkdtemp DerivedData directory. That directory is the only
    one this function ever deletes; a user-supplied --derived-data-path is never touched.
    """
    private = PrivateDerivedData()
    try:
        cached_cmd = command_base(args, derived_data_path=str(private.path))
        warmup = run_command([*cached_cmd, "build"])
        if warmup.returncode != 0:
            sys.stderr.write("Warning: cached clean warmup build failed, skipping cached clean benchmarks.\n")
            sys.stderr.write(warmup.stdout + warmup.stderr)
            return
        runs["cached_clean"] = []
        for index in range(1, args.repeats + 1):
            private.reset()
            run_measured(runs, "cached_clean", cached_cmd, stem, output_dir, "cached-clean", index)
    finally:
        private.cleanup()


def run_incremental_builds(
    runs: dict, args: argparse.Namespace, base: list[str], stem: str, output_dir: Path, touch_path: Path | None
) -> None:
    label = "incremental" if touch_path else "zero-change"
    runs["incremental"] = []
    for index in range(1, args.repeats + 1):
        if touch_path:
            touch_mtime(touch_path)
        run_measured(runs, "incremental", base, stem, output_dir, label, index)


def run_phases(
    runs: dict, args: argparse.Namespace, base: list[str], stem: str, output_dir: Path, touch_path: Path | None
) -> None:
    if not args.skip_warmup:
        run_warmup(runs, base, stem, output_dir)
    run_clean_builds(runs, args, base, stem, output_dir)
    if not args.no_cached_clean and detect_compilation_caching(base):
        run_cached_clean_builds(runs, args, stem, output_dir)
    run_incremental_builds(runs, args, base, stem, output_dir, touch_path)


def build_artifact(args: argparse.Namespace, base: list[str], runs: dict, status: str) -> dict:
    summary: dict = {
        "clean": stats_for(runs.get("clean", [])),
        "incremental": stats_for(runs.get("incremental", [])),
    }
    if "cached_clean" in runs:
        summary["cached_clean"] = stats_for(runs["cached_clean"])
    return {
        "schema_version": "1.2.0" if "cached_clean" in runs else "1.1.0",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "build": {
            "entrypoint": build_entrypoint(args),
            "path": args.workspace or args.project,
            "scheme": args.scheme,
            "configuration": args.configuration,
            "destination": args.destination or "",
            "derived_data_path": args.derived_data_path or "",
            "command": shell_join(base),
        },
        "environment": {
            "host": platform.node(),
            "macos_version": platform.platform(),
            "xcode_version": xcode_version(),
            "cwd": os.getcwd(),
        },
        "runs": runs,
        "summary": summary,
        "notes": [f"touch-file: {args.touch_file}"] if args.touch_file else [],
    }


def print_summary(artifact: dict, artifact_path: Path, touch_file: str | None) -> None:
    summary = artifact["summary"]
    print(f"Saved benchmark artifact: {artifact_path}")
    print(f"Clean median: {summary['clean']['median_seconds']}s")
    if "cached_clean" in summary:
        print(f"Cached clean median: {summary['cached_clean']['median_seconds']}s")
    label = "Incremental" if touch_file else "Zero-change"
    print(f"{label} median: {summary['incremental']['median_seconds']}s")


def run(args: argparse.Namespace) -> int:
    try:
        touch_path = validate_touch_file(args.touch_file)
    except ValueError as error:
        sys.stderr.write(f"{error}\n")
        return 1

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    stem = make_artifact_stem(timestamp, args.scheme)
    base = command_base(args)

    runs: dict = {}
    failure: BenchmarkFailure | None = None
    try:
        run_phases(runs, args, base, stem, output_dir, touch_path)
    except BenchmarkFailure as error:
        failure = error

    status = "failed" if failure else "ok"
    artifact = build_artifact(args, base, runs, status)
    artifact_path = output_dir / f"{stem}.json"
    artifact_path.write_text(json.dumps(artifact, indent=2) + "\n")

    if failure:
        failed = failure.run
        sys.stderr.write(
            f"Benchmark failed at {failed['id']} (exit code {failed['exit_code']}). "
            f"Log: {failed['raw_log_path']}\nSaved partial artifact: {artifact_path}\n"
        )
        return failed["exit_code"] or 1

    print_summary(artifact, artifact_path, args.touch_file)
    return 0
