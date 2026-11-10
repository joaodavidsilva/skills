"""Test helper: install a fake `xcodebuild` shell script on PATH."""
from __future__ import annotations

import os
import stat
from pathlib import Path

FAKE_SCRIPT = r"""#!/bin/sh
echo "$@" >> "$FAKE_XCODEBUILD_LOG"
for arg in "$@"; do
  case "$arg" in
    -version) echo "Xcode 99.0"; echo "Build version FAKE"; exit 0 ;;
    -showBuildSettings)
      echo "    COMPILATION_CACHE_ENABLE_CACHING = ${FAKE_CACHING:-NO}"; exit 0 ;;
    clean) exit 0 ;;
    build)
      if [ -n "$FAKE_XCODEBUILD_FAIL" ]; then
        echo "error: simulated failure"; exit 65
      fi
      case "$*" in *debug-time-function-bodies*)
        printf '12.50ms\tt.swift:1:6\tglobal function f()\n' ;;
      esac
      echo "Build Timing Summary"
      echo "CompileSwiftSources (4 tasks) | 1.500 seconds"
      echo "Ld (1 task) | 0.250 seconds"
      exit 0 ;;
  esac
done
exit 0
"""


def install_fake_xcodebuild(directory: Path) -> Path:
    """Write the fake into `directory` and return the call-log path it appends to."""
    script = directory / "xcodebuild"
    script.write_text(FAKE_SCRIPT)
    script.chmod(script.stat().st_mode | stat.S_IXUSR)
    return directory / "calls.log"


def path_with(directory: Path) -> str:
    return f"{directory}{os.pathsep}{os.environ.get('PATH', '')}"
