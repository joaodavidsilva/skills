"""Run one build with -Xfrontend type-check diagnostics and summarise the slow spots."""
from __future__ import annotations

import argparse
import json
import re
import shlex
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from .xcodebuild import (
    add_target_arguments,
    artifact_stem as make_artifact_stem,
    build_entrypoint,
    command_base,
    run_command,
)

_TYPECHECK_RE = re.compile(
    r"^(?P<file>.+?):(?P<line>\d+):(?P<col>\d+): warning: "
    r"(?P<kind>instance method|global function|getter|type-check|expression) "
    r"'?(?P<name>[^']*?)'?\s+took\s+(?P<ms>\d+)ms\s+to\s+type-check"
)

_EXPRESSION_RE = re.compile(
    r"^(?P<file>.+?):(?P<line>\d+):(?P<col>\d+): warning: "
    r"expression took\s+(?P<ms>\d+)ms\s+to\s+type-check"
)

# Output of -Xfrontend -debug-time-function-bodies: "<ms>ms<TAB><file>:<line>:<col>[<TAB><name>]".
_FUNCTION_TIME_RE = re.compile(
    r"^\s*(?P<ms>\d+(?:\.\d+)?)ms\t(?P<file>[^\t]+?):(?P<line>\d+):(?P<col>\d+)(?:\t(?P<name>.*))?$"
)

MAX_FUNCTION_TIMINGS = 200
MAX_FILE_TIMINGS = 50


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run an Xcode build with -Xfrontend type-checking diagnostics."
    )
    add_target_arguments(parser)
    parser.add_argument("--output-dir", default=".build-benchmark", help="Output directory")
    parser.add_argument(
        "--threshold",
        type=int,
        default=100,
        help="Millisecond threshold for -warn-long-function-bodies and "
        "-warn-long-expression-type-checking (default: 100)",
    )
    parser.add_argument("--skip-clean", action="store_true", help="Skip clean before build")
    parser.add_argument(
        "--function-timing",
        action="store_true",
        help="Add -Xfrontend -debug-time-function-bodies to record type-check time per "
        "function and per file (artifact keys function_timings, per_file_type_check_ms).",
    )
    parser.add_argument(
        "--stats-output",
        action="store_true",
        help="Add -Xfrontend -stats-output-dir to collect detailed compiler statistics.",
    )
    parser.add_argument(
        "--extra-arg",
        action="append",
        default=[],
        help="Additional xcodebuild argument. Can be passed multiple times.",
    )
    return parser.parse_args(argv)


def parse_diagnostics(output: str) -> list[dict]:
    """Extract type-checking warnings from xcodebuild output."""
    warnings: list[dict] = []
    seen: set[tuple] = set()
    for raw_line in output.splitlines():
        line = raw_line.strip()
        match = _TYPECHECK_RE.match(line)
        if match:
            kind, name = "function-body", match.group("name")
        else:
            match = _EXPRESSION_RE.match(line)
            if not match:
                continue
            kind, name = "expression", ""
        key = (match.group("file"), match.group("line"), match.group("col"), kind)
        if key in seen:
            continue
        seen.add(key)
        warnings.append(
            {
                "file": match.group("file"),
                "line": int(match.group("line")),
                "column": int(match.group("col")),
                "duration_ms": int(match.group("ms")),
                "kind": kind,
                "name": name,
            }
        )
    warnings.sort(key=lambda w: w["duration_ms"], reverse=True)
    return warnings


def parse_function_timings(output: str) -> list[dict]:
    """Extract per-function type-check times from -debug-time-function-bodies output.

    Returns every distinct (file, line, column, name) entry, slowest first.
    """
    best: dict[tuple, dict] = {}
    for raw_line in output.splitlines():
        match = _FUNCTION_TIME_RE.match(raw_line.rstrip("\r"))
        if not match:
            continue
        name = (match.group("name") or "").strip()
        entry = {
            "file": match.group("file"),
            "line": int(match.group("line")),
            "column": int(match.group("col")),
            "duration_ms": float(match.group("ms")),
            "name": name,
        }
        key = (entry["file"], entry["line"], entry["column"], name)
        if key not in best or entry["duration_ms"] > best[key]["duration_ms"]:
            best[key] = entry
    return sorted(best.values(), key=lambda t: t["duration_ms"], reverse=True)


def per_file_totals(function_timings: list[dict]) -> list[dict]:
    """Sum function type-check times per file, slowest first."""
    totals: dict[str, float] = {}
    for timing in function_timings:
        totals[timing["file"]] = totals.get(timing["file"], 0.0) + timing["duration_ms"]
    rows = [{"file": f, "duration_ms": round(ms, 3)} for f, ms in totals.items()]
    rows.sort(key=lambda r: r["duration_ms"], reverse=True)
    return rows


def swift_flags_for(args: argparse.Namespace, stats_dir: Path | None) -> str:
    """Build the OTHER_SWIFT_FLAGS value; paths are shell-quoted because Xcode re-splits it."""
    threshold = str(args.threshold)
    flags = (
        f"$(inherited) -Xfrontend -warn-long-function-bodies={threshold} "
        f"-Xfrontend -warn-long-expression-type-checking={threshold}"
    )
    if args.function_timing:
        flags += " -Xfrontend -debug-time-function-bodies"
    if stats_dir is not None:
        flags += f" -Xfrontend -stats-output-dir -Xfrontend {shlex.quote(str(stats_dir))}"
    return flags


def build_artifact(
    args: argparse.Namespace,
    log_path: Path,
    elapsed: float,
    success: bool,
    warnings: list[dict],
    function_timings: list[dict] | None,
    file_totals: list[dict] | None,
    stats_dir: Path | None,
) -> dict:
    artifact: dict = {
        "schema_version": "1.0.0",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "type": "compilation-diagnostics",
        "build": {
            "entrypoint": build_entrypoint(args),
            "path": args.workspace or args.project,
            "scheme": args.scheme,
            "configuration": args.configuration,
            "destination": args.destination or "",
        },
        "threshold_ms": args.threshold,
        "build_duration_seconds": elapsed,
        "build_success": success,
        "raw_log_path": str(log_path),
        "warnings": warnings,
        "summary": {
            "total_warnings": len(warnings),
            "function_body_warnings": sum(1 for w in warnings if w["kind"] == "function-body"),
            "expression_warnings": sum(1 for w in warnings if w["kind"] == "expression"),
            "slowest_ms": warnings[0]["duration_ms"] if warnings else 0,
        },
    }
    if function_timings is not None:
        artifact["function_timings"] = function_timings[:MAX_FUNCTION_TIMINGS]
        artifact["per_file_type_check_ms"] = (file_totals or [])[:MAX_FILE_TIMINGS]
    if stats_dir is not None:
        artifact["stats_dir"] = str(stats_dir)
    return artifact


def print_report(
    args: argparse.Namespace,
    artifact_path: Path,
    elapsed: float,
    success: bool,
    warnings: list[dict],
    function_timings: list[dict] | None,
    file_totals: list[dict] | None,
    stats_dir: Path | None,
) -> None:
    print(f"\nSaved diagnostics artifact: {artifact_path}")
    print(f"Build {'succeeded' if success else 'failed'} in {elapsed}s")
    print(f"Found {len(warnings)} type-check warnings above {args.threshold}ms threshold\n")

    if warnings:
        print(f"{'Duration':>10}  {'Kind':<15}  {'Location'}")
        print(f"{'--------':>10}  {'----':<15}  {'--------'}")
        for w in warnings[:20]:
            loc = f"{w['file']}:{w['line']}:{w['column']}"
            label = w["name"] if w["name"] else "(expression)"
            print(f"{w['duration_ms']:>8}ms  {w['kind']:<15}  {loc}  {label}")
        if len(warnings) > 20:
            print(f"\n  ... and {len(warnings) - 20} more (see {artifact_path})")
    else:
        print("No type-checking hotspots found above threshold.")

    if function_timings:
        print("\nType-check time per file (top 20):\n")
        print(f"{'Duration':>12}  {'File'}")
        print(f"{'--------':>12}  {'----'}")
        for row in (file_totals or [])[:20]:
            print(f"{row['duration_ms']:>10.2f}ms  {row['file']}")
        print("\nType-check time per function (top 20):\n")
        print(f"{'Duration':>12}  {'Location'}")
        print(f"{'--------':>12}  {'--------'}")
        for t in function_timings[:20]:
            loc = f"{t['file']}:{t['line']}:{t['column']}"
            print(f"{t['duration_ms']:>10.2f}ms  {loc}  {t['name']}")
        remaining = len(function_timings) - MAX_FUNCTION_TIMINGS
        if remaining > 0:
            print(f"\n  ... {remaining} more functions not saved; artifact keeps the slowest {MAX_FUNCTION_TIMINGS}")
    elif function_timings is not None:
        print("\nNo function timing lines found in the build output.")

    if stats_dir is not None:
        print(f"\nCompiler statistics: {len(list(stats_dir.glob('*.json')))} files written to {stats_dir}")


def run(args: argparse.Namespace) -> int:
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    stem = make_artifact_stem(timestamp, args.scheme)
    base = command_base(args)

    if not args.skip_clean:
        print("Cleaning build products...")
        clean = run_command([*base, "clean"])
        if clean.returncode != 0:
            sys.stderr.write(clean.stdout + clean.stderr)
            return clean.returncode

    stats_dir: Path | None = None
    if args.stats_output:
        stats_dir = output_dir / f"{stem}-stats"
        stats_dir.mkdir(parents=True, exist_ok=True)

    build_command = [
        *base,
        "build",
        "-showBuildTimingSummary",
        f"OTHER_SWIFT_FLAGS={swift_flags_for(args, stats_dir)}",
    ]

    extras = []
    if args.function_timing:
        extras.append("function timing")
    if args.stats_output:
        extras.append("stats output")
    extras_label = f" + {', '.join(extras)}" if extras else ""
    print(f"Building with type-check threshold {args.threshold}ms{extras_label}...")
    started = time.perf_counter()
    result = run_command(build_command)
    elapsed = round(time.perf_counter() - started, 3)
    success = result.returncode == 0

    combined = result.stdout + result.stderr
    log_path = output_dir / f"{stem}-diagnostics.log"
    log_path.write_text(combined)

    warnings = parse_diagnostics(combined)
    function_timings = parse_function_timings(combined) if args.function_timing else None
    file_totals = per_file_totals(function_timings) if function_timings is not None else None

    artifact = build_artifact(
        args, log_path, elapsed, success, warnings, function_timings, file_totals, stats_dir
    )
    artifact_path = output_dir / f"{stem}-diagnostics.json"
    artifact_path.write_text(json.dumps(artifact, indent=2) + "\n")

    print_report(
        args, artifact_path, elapsed, success, warnings, function_timings, file_totals, stats_dir
    )
    if not success:
        sys.stderr.write(f"Build failed with exit code {result.returncode}. Log: {log_path}\n")
        return result.returncode or 1
    return 0
