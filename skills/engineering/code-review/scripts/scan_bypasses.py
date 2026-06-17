#!/usr/bin/env python3
# invariant: prints path:line<TAB>category<TAB>content for each ADDED diff line carrying a bypass marker, and always exits 0.
# hazard: a hit is a candidate, not a finding: a marker inside a string, a comment, or a justified suppression still prints, so a reviewer judges each one.
"""Scan a unified diff on stdin for added lines that bypass a check.

Usage: git diff <fixed-point>...HEAD | python3 scan_bypasses.py
"""
import re
import sys

MARKERS = [
    ("lint-suppression", r"eslint-disable"),
    ("lint-suppression", r"biome-ignore"),
    ("lint-suppression", r"oxlint-disable"),
    ("lint-suppression", r"#\s*noqa\b"),
    ("lint-suppression", r"\bnolint\b"),
    ("lint-suppression", r"#!?\[allow\("),
    ("lint-suppression", r"@Suppress"),
    ("type-suppression", r"@ts-(ignore|expect-error|nocheck)\b"),
    ("type-suppression", r"#\s*type:\s*ignore"),
    ("type-suppression", r"\bas\s+any\b"),
    ("type-suppression", r"\bas\s+unknown\s+as\b"),
    ("test-disabled", r"\.(skip|only)\("),
    ("test-disabled", r"\b(xit|xdescribe)\b"),
    ("hook-bypass", r"--no-verify\b"),
    ("tls-verification-disabled", r"rejectUnauthorized\s*[:=]\s*false"),
    ("tls-verification-disabled", r"NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['\"]?0"),
    ("tls-verification-disabled", r"InsecureSkipVerify\s*:\s*true"),
    ("tls-verification-disabled", r"\bverify\s*=\s*False\b"),
    ("tls-verification-disabled", r"_create_unverified_context"),
    ("tls-verification-disabled", r"strict-ssl\s*[= ]\s*false"),
    ("tls-verification-disabled", r"\bcurl\b.*\s(-k|--insecure)\b"),
    ("empty-catch", r"\bcatch\s*(\([^)]*\))?\s*\{\s*\}"),
    ("empty-catch", r"\bexcept\b[^:]*:\s*pass\b"),
]
COMPILED = [(category, re.compile(pattern)) for category, pattern in MARKERS]

# Two-line shapes: an added opener whose very next added line closes or passes.
OPEN_CATCH = re.compile(r"\bcatch\s*(\([^)]*\))?\s*\{\s*$")
OPEN_EXCEPT = re.compile(r"\bexcept\b[^:]*:\s*$")
CLOSE_BRACE = re.compile(r"^\s*\}\s*$")
BARE_PASS = re.compile(r"^\s*pass\s*$")

HUNK = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@")
MAX_CONTENT = 200


def emit(path, line, category, content):
    text = content.strip().replace("\t", " ")[:MAX_CONTENT]
    print(f"{path}:{line}\t{category}\t{text}")


def scan(lines):
    path = None
    new_line = 0
    pending = None  # (line number, text, kind) of the previous added line
    for raw in lines:
        raw = raw.rstrip("\n")
        if raw.startswith("+++ "):
            target = raw[4:].split("\t")[0]
            path = None if target == "/dev/null" else re.sub(r"^b/", "", target)
            pending = None
            continue
        if raw.startswith("--- ") or raw.startswith("diff "):
            pending = None
            continue
        hunk = HUNK.match(raw)
        if hunk:
            new_line = int(hunk.group(1))
            pending = None
            continue
        if path is None or not raw:
            continue
        marker, body = raw[0], raw[1:]
        if marker == "+":
            for category, pattern in COMPILED:
                if pattern.search(body):
                    emit(path, new_line, category, body)
            if pending and pending[0] == new_line - 1:
                kind = pending[2]
                if (kind == "catch" and CLOSE_BRACE.match(body)) or (
                    kind == "except" and BARE_PASS.match(body)
                ):
                    emit(path, pending[0], "empty-catch", pending[1])
            if OPEN_CATCH.search(body):
                pending = (new_line, body, "catch")
            elif OPEN_EXCEPT.search(body):
                pending = (new_line, body, "except")
            else:
                pending = None
            new_line += 1
        elif marker == " ":
            pending = None
            new_line += 1
        else:
            pending = None


if __name__ == "__main__":
    scan(sys.stdin)
    sys.exit(0)
