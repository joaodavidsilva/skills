"""Tests for check_spm_pins.py."""
from __future__ import annotations

import io
import json
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from unittest import mock

SCRIPTS = Path(__file__).parents[1]
sys.path.insert(0, str(SCRIPTS))

import check_spm_pins  # noqa: E402
from xcode_build import spm_pins  # noqa: E402


def pbxproj_entry(name: str, url: str, requirement: str) -> str:
    return (
        f'/* XCRemoteSwiftPackageReference "{name}" */ = {{\n'
        "    isa = XCRemoteSwiftPackageReference;\n"
        f'    repositoryURL = "{url}";\n'
        f"    requirement = {{\n{requirement}\n    }};\n"
        "};\n"
    )


BRANCH = "kind = branch;\nbranch = main;"
VERSION = "kind = upToNextMajorVersion;\nminimumVersion = 1.0.0;"


class FindBranchPinsTests(unittest.TestCase):
    def test_only_branch_requirements_are_returned(self) -> None:
        text = (
            pbxproj_entry("Alpha", "https://github.com/a/alpha", BRANCH)
            + pbxproj_entry("Beta", "https://github.com/b/beta", VERSION)
        )
        self.assertEqual(
            spm_pins.find_branch_pins(text),
            [{"name": "Alpha", "url": "https://github.com/a/alpha", "branch": "main"}],
        )


class UrlValidationTests(unittest.TestCase):
    def test_accepts_supported_forms(self) -> None:
        for url in (
            "https://github.com/a/b.git",
            "ssh://git@github.com/a/b.git",
            "git@github.com:a/b.git",
        ):
            self.assertTrue(spm_pins.is_safe_remote_url(url), url)

    def test_rejects_hostile_forms(self) -> None:
        for url in (
            "ext::sh -c 'touch /tmp/x'",
            "file:///etc/passwd",
            "/local/path",
            "-oProxyCommand=evil",
            "--upload-pack=evil",
            "http://example.com/a",
            "https://",
            "ssh://-oProxyCommand=evil/x",
            "ssh://-oProxyCommand=evil@host/x",
            "ssh://-oProxyCommand=touch${IFS}/tmp/x@host/x",
            "git@host:a b",
            "git@-host:a",
            "https://example.com/a b",
        ):
            self.assertFalse(spm_pins.is_safe_remote_url(url), url)


class VersionSortTests(unittest.TestCase):
    def test_orders_by_version_newest_last(self) -> None:
        tags = ["1.10.0", "1.2.0", "v1.9.3", "2.0.0-beta.1", "2.0.0", "1.2.0-rc1", "weird"]
        self.assertEqual(
            sorted(tags, key=spm_pins.version_sort_key),
            ["weird", "1.2.0-rc1", "1.2.0", "v1.9.3", "1.10.0", "2.0.0-beta.1", "2.0.0"],
        )

    def test_peeled_refs_ignored_and_sorted(self) -> None:
        out = (
            "aaa\trefs/tags/1.10.0\n"
            "bbb\trefs/tags/1.10.0^{}\n"
            "ccc\trefs/tags/1.2.0\n"
            "ddd\trefs/heads/main\n"
        )
        self.assertEqual(spm_pins.parse_ls_remote_tags(out), ["1.2.0", "1.10.0"])


def completed(returncode: int = 0, stdout: str = "") -> subprocess.CompletedProcess:
    return subprocess.CompletedProcess([], returncode, stdout, "")


class CheckTagsTests(unittest.TestCase):
    def test_hostile_urls_never_reach_git(self) -> None:
        with mock.patch.object(spm_pins.subprocess, "run") as run:
            for url in ("ext::sh -c id", "file:///x", "--upload-pack=evil", "-x"):
                self.assertEqual(spm_pins.check_tags(url), (spm_pins.STATUS_REJECTED, []))
            run.assert_not_called()

    def test_git_invocation_uses_double_dash_and_timeout(self) -> None:
        with mock.patch.object(spm_pins.subprocess, "run", return_value=completed(0, "")) as run:
            spm_pins.check_tags("https://example.com/a/b")
        args, kwargs = run.call_args
        self.assertEqual(args[0], ["git", "ls-remote", "--tags", "--", "https://example.com/a/b"])
        self.assertIn("timeout", kwargs)

    def test_lookup_failure_is_not_no_tags(self) -> None:
        url = "https://example.com/a/b"
        failures = (
            mock.Mock(return_value=completed(128)),
            mock.Mock(side_effect=subprocess.TimeoutExpired("git", 15)),
            mock.Mock(side_effect=FileNotFoundError("git")),
        )
        for failing in failures:
            with mock.patch.object(spm_pins.subprocess, "run", failing):
                self.assertEqual(spm_pins.check_tags(url), (spm_pins.STATUS_FAILED, []))
        with mock.patch.object(spm_pins.subprocess, "run", return_value=completed(0, "")):
            self.assertEqual(spm_pins.check_tags(url), (spm_pins.STATUS_NO_TAGS, []))

    def test_tags_available(self) -> None:
        out = "a\trefs/tags/1.0.0\nb\trefs/tags/1.1.0\n"
        with mock.patch.object(spm_pins.subprocess, "run", return_value=completed(0, out)):
            self.assertEqual(
                spm_pins.check_tags("git@github.com:a/b.git"),
                (spm_pins.STATUS_TAGS, ["1.0.0", "1.1.0"]),
            )


class MainTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.project = Path(self._tmp.name) / "App.xcodeproj"
        self.project.mkdir()

    def run_main(self, *extra: str) -> tuple[int, str, str]:
        stdout, stderr = io.StringIO(), io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            code = check_spm_pins.main(["--project", str(self.project), *extra])
        return code, stdout.getvalue(), stderr.getvalue()

    def test_missing_pbxproj_exits_nonzero_with_stderr(self) -> None:
        code, stdout, stderr = self.run_main()
        self.assertEqual(code, 1)
        self.assertIn("project.pbxproj", stderr)
        self.assertEqual(stdout, "")

    def test_json_output_keys_and_statuses(self) -> None:
        text = (
            pbxproj_entry("Good", "https://example.com/good", BRANCH)
            + pbxproj_entry("Evil", "ext::sh -c id", BRANCH)
            + pbxproj_entry("Down", "https://example.com/down", BRANCH)
        )
        (self.project / "project.pbxproj").write_text(text)
        tag_lines = "".join(f"x\trefs/tags/1.{i}.0\n" for i in range(8))

        def fake_run(cmd, **kwargs):
            return completed(0, tag_lines) if cmd[-1].endswith("/good") else completed(1)

        with mock.patch.object(spm_pins.subprocess, "run", side_effect=fake_run) as run:
            code, stdout, _ = self.run_main("--json")
        self.assertEqual(code, 0)
        self.assertEqual(run.call_count, 2)
        by_name = {e["name"]: e for e in json.loads(stdout)}
        self.assertEqual(set(by_name["Good"]), {"name", "url", "branch", "tags_available", "latest_tags", "status"})
        self.assertEqual(by_name["Good"]["status"], "tags-available")
        self.assertEqual(by_name["Good"]["latest_tags"], [f"1.{i}.0" for i in range(3, 8)])
        self.assertEqual(by_name["Evil"]["status"], "rejected-url")
        self.assertFalse(by_name["Evil"]["tags_available"])
        self.assertEqual(by_name["Down"]["status"], "lookup-failed")

    def test_text_output_distinguishes_failure_from_no_tags(self) -> None:
        (self.project / "project.pbxproj").write_text(
            pbxproj_entry("Down", "https://example.com/down", BRANCH)
        )
        with mock.patch.object(spm_pins.subprocess, "run", return_value=completed(1)):
            _, stdout, _ = self.run_main()
        self.assertIn("lookup failed", stdout)
        self.assertNotIn("no tags", stdout)


if __name__ == "__main__":
    unittest.main()
