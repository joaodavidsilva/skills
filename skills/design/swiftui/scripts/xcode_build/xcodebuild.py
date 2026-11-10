"""xcodebuild command construction and execution shared by the build scripts."""
from __future__ import annotations

import argparse
import subprocess


def add_target_arguments(parser: argparse.ArgumentParser) -> None:
    """Add the flags that select what xcodebuild builds."""
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--workspace", help="Path to the .xcworkspace file")
    group.add_argument("--project", help="Path to the .xcodeproj file")
    parser.add_argument("--scheme", required=True, help="Scheme to build")
    parser.add_argument("--configuration", default="Debug", help="Build configuration")
    parser.add_argument("--destination", help="xcodebuild destination string")
    parser.add_argument("--derived-data-path", help="DerivedData path override")


def command_base(args: argparse.Namespace, derived_data_path: str | None = None) -> list[str]:
    """Build the common xcodebuild prefix.

    `derived_data_path` overrides `args.derived_data_path` when given.
    """
    command = ["xcodebuild"]
    if args.workspace:
        command.extend(["-workspace", args.workspace])
    if args.project:
        command.extend(["-project", args.project])
    command.extend(["-scheme", args.scheme, "-configuration", args.configuration])
    if args.destination:
        command.extend(["-destination", args.destination])
    derived = derived_data_path if derived_data_path is not None else args.derived_data_path
    if derived:
        command.extend(["-derivedDataPath", derived])
    command.extend(args.extra_arg)
    return command


def shell_join(parts: list[str]) -> str:
    return " ".join(subprocess.list2cmdline([part]) for part in parts)


def run_command(command: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(command, capture_output=True, text=True)


def build_entrypoint(args: argparse.Namespace) -> str:
    return "workspace" if args.workspace else "project"


def artifact_stem(timestamp: str, scheme: str) -> str:
    return f"{timestamp}-{scheme.replace(' ', '-').lower()}"
