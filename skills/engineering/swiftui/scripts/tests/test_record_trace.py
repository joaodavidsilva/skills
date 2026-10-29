"""Security-focused tests for the Instruments recording wrapper."""
from __future__ import annotations

import importlib.util
import io
import unittest
from contextlib import redirect_stderr
from pathlib import Path
from unittest import mock

SCRIPT = Path(__file__).parents[1] / "record_trace.py"
SPEC = importlib.util.spec_from_file_location("record_trace", SCRIPT)
assert SPEC and SPEC.loader
record_trace = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(record_trace)


class CommandDisplayTests(unittest.TestCase):
    def test_redacts_every_environment_value(self) -> None:
        cmd = [
            "xctrace", "record",
            "--env", "API_TOKEN=super-secret",
            "--env", "DISPLAY_NAME=Jane Doe",
            "--launch", "--", "/tmp/Test.app",
        ]

        displayed = record_trace._format_command_for_display(cmd)

        self.assertNotIn("super-secret", displayed)
        self.assertNotIn("Jane Doe", displayed)
        self.assertIn("API_TOKEN=<redacted>", displayed)
        self.assertIn("DISPLAY_NAME=<redacted>", displayed)


class SystemWideConsentTests(unittest.TestCase):
    def test_all_processes_requires_explicit_acknowledgement(self) -> None:
        stderr = io.StringIO()
        with redirect_stderr(stderr), mock.patch.object(
            record_trace.subprocess, "Popen"
        ) as popen:
            result = record_trace.main(["--all-processes"])

        self.assertEqual(2, result)
        self.assertIn("--allow-system-wide-recording", stderr.getvalue())
        popen.assert_not_called()

    def test_acknowledgement_is_rejected_without_all_processes(self) -> None:
        stderr = io.StringIO()
        with redirect_stderr(stderr):
            result = record_trace.main(
                ["--attach", "TestApp", "--allow-system-wide-recording"]
            )

        self.assertEqual(2, result)
        self.assertIn("only applies with --all-processes", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
