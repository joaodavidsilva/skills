"""Tests for diagnose_compilation.py and its parsers."""
from __future__ import annotations

import io
import json
import os
import shlex
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from unittest import mock

SCRIPTS = Path(__file__).parents[1]
sys.path.insert(0, str(SCRIPTS))
sys.path.insert(0, str(Path(__file__).parent))

import diagnose_compilation  # noqa: E402
from fake_xcodebuild import install_fake_xcodebuild, path_with  # noqa: E402
from xcode_build.diagnostics import parse_diagnostics, parse_function_timings, per_file_totals  # noqa: E402

LOG = """\
/src/A.swift:10:5: warning: instance method 'render()' took 250ms to type-check (limit: 100ms)
/src/A.swift:10:5: warning: instance method 'render()' took 250ms to type-check (limit: 100ms)
/src/B.swift:3:9: warning: expression took 480ms to type-check (limit: 100ms)
/src/C.swift:7:1: warning: global function 'helper' took 120ms to type-check (limit: 100ms)
not a warning
"""


class ParserTests(unittest.TestCase):
    def test_typecheck_and_expression_regexes(self) -> None:
        warnings = parse_diagnostics(LOG)
        self.assertEqual([w["duration_ms"] for w in warnings], [480, 250, 120])
        self.assertEqual(warnings[0]["kind"], "expression")
        self.assertEqual(warnings[0]["name"], "")
        self.assertEqual(warnings[1], {
            "file": "/src/A.swift", "line": 10, "column": 5,
            "duration_ms": 250, "kind": "function-body", "name": "render()",
        })

    def test_function_timings_real_format(self) -> None:
        log = (
            "23.76ms\tt.swift:1:6\tglobal function null.(file).f()@t.swift:1:6\n"
            "  9.11ms\tt.swift:2:11\n"
            "5.00ms\t/src/My File.swift:4:2\tgetter x\n"
            "1.00ms\t/src/My File.swift:9:2\tinit()\n"
            "23.76ms\tt.swift:1:6\tglobal function null.(file).f()@t.swift:1:6\n"
            "garbage\tline\n"
        )
        timings = parse_function_timings(log)
        self.assertEqual(len(timings), 4)
        self.assertEqual(timings[0], {
            "file": "t.swift", "line": 1, "column": 6, "duration_ms": 23.76,
            "name": "global function null.(file).f()@t.swift:1:6",
        })
        two_field = next(t for t in timings if t["line"] == 2)
        self.assertEqual((two_field["duration_ms"], two_field["name"]), (9.11, ""))
        self.assertEqual(per_file_totals(timings), [
            {"file": "t.swift", "duration_ms": 32.87},
            {"file": "/src/My File.swift", "duration_ms": 6.0},
        ])


class DiagnoseEndToEndTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.tmp = Path(self._tmp.name)
        bin_dir = self.tmp / "bin"
        bin_dir.mkdir()
        self.calls = install_fake_xcodebuild(bin_dir)
        patcher = mock.patch.dict(
            os.environ, {"PATH": path_with(bin_dir), "FAKE_XCODEBUILD_LOG": str(self.calls)}
        )
        patcher.start()
        self.addCleanup(patcher.stop)

    def run_main(self, out: Path, *extra: str) -> tuple[int, str]:
        argv = ["--project", "App.xcodeproj", "--scheme", "App", "--output-dir", str(out), *extra]
        stderr = io.StringIO()
        with redirect_stdout(io.StringIO()), redirect_stderr(stderr):
            code = diagnose_compilation.main(argv)
        return code, stderr.getvalue()

    def test_success_exits_zero_and_writes_artifact(self) -> None:
        out = self.tmp / "out"
        code, _ = self.run_main(out)
        self.assertEqual(code, 0)
        artifact = json.loads(next(out.glob("*-diagnostics.json")).read_text())
        self.assertTrue(artifact["build_success"])
        self.assertEqual(artifact["type"], "compilation-diagnostics")

    def test_failed_build_exits_nonzero_but_writes_artifact_and_log(self) -> None:
        out = self.tmp / "out"
        with mock.patch.dict(os.environ, {"FAKE_XCODEBUILD_FAIL": "1"}):
            code, stderr = self.run_main(out, "--skip-clean")
        self.assertEqual(code, 65)
        artifact = json.loads(next(out.glob("*-diagnostics.json")).read_text())
        self.assertFalse(artifact["build_success"])
        self.assertIn("simulated failure", Path(artifact["raw_log_path"]).read_text())
        self.assertIn("Build failed", stderr)

    def test_function_timing_flag_replaces_removed_flag_and_populates_artifact(self) -> None:
        out = self.tmp / "out"
        code, _ = self.run_main(out, "--function-timing", "--skip-clean")
        self.assertEqual(code, 0)
        build_line = next(l for l in self.calls.read_text().splitlines() if " build " in f" {l} ")
        self.assertIn("-Xfrontend -debug-time-function-bodies", build_line)
        self.assertNotIn("debug-time-compilation", build_line)
        artifact = json.loads(next(out.glob("*-diagnostics.json")).read_text())
        self.assertEqual(artifact["function_timings"][0]["name"], "global function f()")
        self.assertEqual(artifact["per_file_type_check_ms"], [{"file": "t.swift", "duration_ms": 12.5}])

    def test_function_timing_keys_absent_without_flag(self) -> None:
        out = self.tmp / "out"
        self.run_main(out, "--skip-clean")
        artifact = json.loads(next(out.glob("*-diagnostics.json")).read_text())
        self.assertNotIn("function_timings", artifact)
        self.assertNotIn("per_file_type_check_ms", artifact)

    def test_removed_per_file_timing_flag_is_rejected(self) -> None:
        with redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            diagnose_compilation.main(
                ["--project", "A.xcodeproj", "--scheme", "A", "--per-file-timing"]
            )

    def test_stats_dir_with_spaces_is_quoted_in_other_swift_flags(self) -> None:
        out = self.tmp / "out dir with spaces"
        code, _ = self.run_main(out, "--stats-output", "--skip-clean")
        self.assertEqual(code, 0)
        build_line = next(l for l in self.calls.read_text().splitlines() if " build " in f" {l} ")
        flags_arg = build_line.split("OTHER_SWIFT_FLAGS=", 1)[1]
        tokens = shlex.split(flags_arg)
        index = tokens.index("-stats-output-dir")
        self.assertEqual(tokens[index + 1], "-Xfrontend")
        self.assertTrue(tokens[index + 2].endswith("-stats"))
        self.assertIn("out dir with spaces", tokens[index + 2])
        self.assertTrue(Path(tokens[index + 2]).is_dir())


if __name__ == "__main__":
    unittest.main()
