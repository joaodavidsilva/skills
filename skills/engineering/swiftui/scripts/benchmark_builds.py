#!/usr/bin/env python3
"""Benchmark Xcode clean, cached-clean, and incremental builds.

Writes a JSON artifact plus raw logs to --output-dir. Exits non-zero when any
build fails; the artifact is still written with "status": "failed".
"""
from __future__ import annotations

import sys

from xcode_build import benchmark


def main(argv: list[str] | None = None) -> int:
    return benchmark.run(benchmark.parse_args(argv))


if __name__ == "__main__":
    sys.exit(main())
