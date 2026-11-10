"""Tests for benchmark_builds.py and the xcode_build helpers it uses."""
from __future__ import annotations

import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from unittest import mock

SCRIPTS = Path(__file__).parents[1]
sys.path.insert(0, str(SCRIPTS))
sys.path.insert(0, str(Path(__file__).parent))

import benchmark_builds  # noqa: E402
from fake_xcodebuild import install_fake_xcodebuild, path_with  # noqa: E402
from xcode_build.timing import parse_timing_summary, stats_for  # noqa: E402

SUMMARY = """\
Build Timing Summary

CompileSwiftSources (4 tasks) | 1.500 seconds
CompileSwiftSources (2 tasks) | 0.500 seconds
Ld (1 task) | 0.250 seconds
SwiftDriver | 0.100 seconds
** BUILD SUCCEEDED ** [3.2 sec]
"""


class TimingParserTests(unittest.TestCase):
    def test_aggregates_categories_and_task_counts(self) -> None:
        result = parse_timing_summary(SUMMARY)
        self.assertEqual(result[0], {"name": "CompileSwiftSources", "seconds": 2.0, "task_count": 6})
        by_name = {entry["name"]: entry for entry in result}
        self.assertEqual(by_name["Ld"]["task_count"], 1)
        self.assertNotIn("task_count", by_name["SwiftDriver"])

    def test_stats_ignore_failed_runs(self) -> None:
        runs = [
            {"duration_seconds": 1.0, "success": True},
            {"duration_seconds": 3.0, "success": True},
            {"duration_seconds": 99.0, "success": False},
        ]
        stats = stats_for(runs)
        self.assertEqual(stats["count"], 2)
        self.assertEqual(stats["median_seconds"], 2.0)
        self.assertEqual(stats_for([])["count"], 0)


class BenchmarkEndToEndTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.tmp = Path(self._tmp.name)
        self.bin = self.tmp / "bin"
        self.bin.mkdir()
        self.calls = install_fake_xcodebuild(self.bin)
        self.out = self.tmp / "out"
        env = {
            "PATH": path_with(self.bin),
            "FAKE_XCODEBUILD_LOG": str(self.calls),
        }
        patcher = mock.patch.dict(os.environ, env)
        patcher.start()
        self.addCleanup(patcher.stop)

    def run_main(self, *extra: str) -> tuple[int, str, str]:
        argv = [
            "--project", "App.xcodeproj", "--scheme", "My App",
            "--output-dir", str(self.out), "--repeats", "2", *extra,
        ]
        stdout, stderr = io.StringIO(), io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            code = benchmark_builds.main(argv)
        return code, stdout.getvalue(), stderr.getvalue()

    def artifact(self) -> dict:
        paths = [p for p in self.out.glob("*.json")]
        self.assertEqual(len(paths), 1)
        return json.loads(paths[0].read_text())

    def call_lines(self) -> list[str]:
        return self.calls.read_text().splitlines() if self.calls.exists() else []

    def test_successful_run_writes_artifact_and_exits_zero(self) -> None:
        code, stdout, _ = self.run_main()
        self.assertEqual(code, 0)
        artifact = self.artifact()
        self.assertEqual(
            set(artifact),
            {"schema_version", "created_at", "status", "build", "environment", "runs", "summary", "notes"},
        )
        self.assertEqual(artifact["status"], "ok")
        self.assertEqual(artifact["schema_version"], "1.1.0")
        self.assertEqual(set(artifact["runs"]), {"clean", "incremental"})
        self.assertEqual(artifact["runs"]["incremental"][0]["build_type"], "zero-change")
        self.assertEqual(artifact["runs"]["clean"][0]["timing_summary_categories"][0]["name"], "CompileSwiftSources")
        self.assertEqual(artifact["environment"]["xcode_version"], "Xcode 99.0\nBuild version FAKE")
        self.assertIn("Clean median:", stdout)
        self.assertTrue(any(self.out.glob("*-clean-1.log")))

    def test_user_derived_data_path_is_never_deleted(self) -> None:
        user_dd = self.tmp / "UserDerivedData"
        user_dd.mkdir()
        sentinel = user_dd / "sentinel.txt"
        sentinel.write_text("keep")
        with mock.patch.dict(os.environ, {"FAKE_CACHING": "YES"}):
            code, _, _ = self.run_main("--derived-data-path", str(user_dd))
        self.assertEqual(code, 0)
        self.assertTrue(sentinel.exists())
        self.assertEqual(sentinel.read_text(), "keep")
        artifact = self.artifact()
        self.assertIn("cached_clean", artifact["runs"])
        self.assertEqual(artifact["schema_version"], "1.2.0")
        cached = artifact["runs"]["cached_clean"][0]["command"]
        self.assertNotIn(str(user_dd), cached)
        self.assertIn("xcode-bench-dd-", cached)
        incremental = artifact["runs"]["incremental"][0]["command"]
        self.assertIn(str(user_dd), incremental)

    def test_cached_clean_private_dir_is_removed(self) -> None:
        with mock.patch.dict(os.environ, {"FAKE_CACHING": "YES"}):
            code, _, _ = self.run_main()
        self.assertEqual(code, 0)
        command = self.artifact()["runs"]["cached_clean"][0]["command"]
        private = command.split("-derivedDataPath ")[1].split(" ")[0]
        self.assertFalse(Path(private).exists())

    def test_failed_build_exits_nonzero_and_keeps_artifact_and_log(self) -> None:
        with mock.patch.dict(os.environ, {"FAKE_XCODEBUILD_FAIL": "1"}):
            code, stdout, stderr = self.run_main("--skip-warmup")
        self.assertEqual(code, 65)
        artifact = self.artifact()
        self.assertEqual(artifact["status"], "failed")
        failed = artifact["runs"]["clean"][0]
        self.assertFalse(failed["success"])
        self.assertEqual(failed["exit_code"], 65)
        self.assertEqual(len(artifact["runs"]["clean"]), 1)
        self.assertIn("simulated failure", Path(failed["raw_log_path"]).read_text())
        self.assertNotIn("median", stdout)
        self.assertIn("Benchmark failed", stderr)

    def test_failed_warmup_stops_run_and_is_recorded(self) -> None:
        with mock.patch.dict(os.environ, {"FAKE_XCODEBUILD_FAIL": "1"}):
            code, stdout, _ = self.run_main()
        self.assertNotEqual(code, 0)
        artifact = self.artifact()
        self.assertEqual(artifact["status"], "failed")
        warmup = artifact["runs"]["warmup"][0]
        self.assertFalse(warmup["success"])
        self.assertEqual(warmup["exit_code"], 65)
        self.assertTrue(Path(warmup["raw_log_path"]).exists())
        self.assertNotIn("clean", artifact["runs"])
        self.assertNotIn("median", stdout)

    def test_missing_touch_file_fails_before_any_xcodebuild_call(self) -> None:
        code, stdout, stderr = self.run_main("--touch-file", str(self.tmp / "missing.swift"))
        self.assertEqual(code, 1)
        self.assertIn("--touch-file", stderr)
        self.assertEqual(self.call_lines(), [])
        self.assertFalse(self.out.exists())
        self.assertEqual(stdout, "")

    def test_touch_file_directory_is_rejected(self) -> None:
        code, _, _ = self.run_main("--touch-file", str(self.tmp))
        self.assertEqual(code, 1)
        self.assertEqual(self.call_lines(), [])

    def test_touch_file_updates_mtime_only(self) -> None:
        source = self.tmp / "View.swift"
        source.write_text("struct V {}")
        os.utime(source, (1000, 1000))
        code, _, _ = self.run_main("--skip-warmup", "--touch-file", str(source))
        self.assertEqual(code, 0)
        self.assertEqual(source.read_text(), "struct V {}")
        self.assertGreater(source.stat().st_mtime, 1000)
        artifact = self.artifact()
        self.assertEqual(artifact["runs"]["incremental"][0]["build_type"], "incremental")
        self.assertEqual(artifact["notes"], [f"touch-file: {source}"])


if __name__ == "__main__":
    unittest.main()
