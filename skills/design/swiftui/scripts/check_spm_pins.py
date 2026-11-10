#!/usr/bin/env python3
"""Scan a project.pbxproj for branch-pinned SPM dependencies and check tag availability."""
from __future__ import annotations

import sys

from xcode_build import spm_pins


def main(argv: list[str] | None = None) -> int:
    return spm_pins.run(spm_pins.parse_args(argv))


if __name__ == "__main__":
    sys.exit(main())
