#!/usr/bin/env python3
"""Run a single Xcode build with -Xfrontend diagnostics to find slow type-checking."""
from __future__ import annotations

import sys

from xcode_build import diagnostics


def main(argv: list[str] | None = None) -> int:
    return diagnostics.run(diagnostics.parse_args(argv))


if __name__ == "__main__":
    sys.exit(main())
