"""Find branch-pinned SPM dependencies in a project.pbxproj and check for release tags.

The pbxproj is untrusted data: repository URLs read from it are validated before
they are handed to `git ls-remote`.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

LOOKUP_TIMEOUT_SECONDS = 15

STATUS_TAGS = "tags-available"
STATUS_NO_TAGS = "no-tags"
STATUS_FAILED = "lookup-failed"
STATUS_REJECTED = "rejected-url"

_PKG_REF_RE = re.compile(
    r"(/\*\s*XCRemoteSwiftPackageReference\s+\"(?P<name>[^\"]+)\"\s*\*/\s*=\s*\{[^}]*?"
    r"repositoryURL\s*=\s*\"(?P<url>[^\"]+)\"[^}]*?"
    r"requirement\s*=\s*\{(?P<req>[^}]*)\})",
    re.DOTALL,
)

_KIND_RE = re.compile(r"kind\s*=\s*(\w+)\s*;")
_BRANCH_RE = re.compile(r"branch\s*=\s*(\w+)\s*;")

_URL_RE = re.compile(
    r"^(?:"
    r"https://[A-Za-z0-9][^\s/@]*(?:/\S*)?"
    r"|ssh://(?:[A-Za-z0-9_][A-Za-z0-9_.~%+\-]*@)?[A-Za-z0-9\[][^\s/@]*(?:/\S*)?"
    r"|git@[A-Za-z0-9][A-Za-z0-9.\-]*:\S+"
    r")$"
)

_VERSION_RE = re.compile(r"^[vV]?(?P<nums>\d+(?:\.\d+)*)(?P<rest>.*)$")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Check branch-pinned SPM dependencies for available tags."
    )
    parser.add_argument("--project", required=True, help="Path to the .xcodeproj directory")
    parser.add_argument("--json", action="store_true", help="Output results as JSON")
    return parser.parse_args(argv)


def find_branch_pins(pbxproj: str) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    for match in _PKG_REF_RE.finditer(pbxproj):
        req = match.group("req")
        kind_match = _KIND_RE.search(req)
        if not kind_match or kind_match.group(1) != "branch":
            continue
        branch_match = _BRANCH_RE.search(req)
        results.append(
            {
                "name": match.group("name"),
                "url": match.group("url"),
                "branch": branch_match.group(1) if branch_match else "unknown",
            }
        )
    return results


def is_safe_remote_url(url: str) -> bool:
    """Accept only https://, ssh://, or scp-style git@host:path URLs; never option-like values."""
    return not url.startswith("-") and _URL_RE.match(url) is not None


def version_sort_key(tag: str) -> tuple:
    """Sort key ordering tags by version, oldest first. Releases rank above pre-releases."""
    match = _VERSION_RE.match(tag)
    if not match:
        return (0, (), 0, ((1, 0, tag),))
    nums = [int(part) for part in match.group("nums").split(".")]
    while nums and nums[-1] == 0:
        nums.pop()
    rest = match.group("rest").lstrip("-+.")
    pre: list[tuple] = []
    for part in re.findall(r"\d+|[A-Za-z]+", rest):
        pre.append((0, int(part), "") if part.isdigit() else (1, 0, part.lower()))
    return (1, tuple(nums), 0 if pre else 1, tuple(pre))


def parse_ls_remote_tags(stdout: str) -> list[str]:
    tags: list[str] = []
    for line in stdout.strip().splitlines():
        ref = line.split("\t")[-1] if "\t" in line else ""
        if ref.startswith("refs/tags/") and not ref.endswith("^{}"):
            tags.append(ref[len("refs/tags/"):])
    return sorted(set(tags), key=version_sort_key)


def check_tags(url: str) -> tuple[str, list[str]]:
    """Return (status, tags) with tags ordered oldest to newest."""
    if not is_safe_remote_url(url):
        return STATUS_REJECTED, []
    try:
        result = subprocess.run(
            ["git", "ls-remote", "--tags", "--", url],
            capture_output=True,
            text=True,
            timeout=LOOKUP_TIMEOUT_SECONDS,
        )
    except (subprocess.TimeoutExpired, OSError):
        return STATUS_FAILED, []
    if result.returncode != 0:
        return STATUS_FAILED, []
    tags = parse_ls_remote_tags(result.stdout)
    return (STATUS_TAGS if tags else STATUS_NO_TAGS), tags


def build_entry(pin: dict[str, str]) -> dict:
    status, tags = check_tags(pin["url"])
    return {
        "name": pin["name"],
        "url": pin["url"],
        "branch": pin["branch"],
        "tags_available": bool(tags),
        "latest_tags": tags[-5:],
        "status": status,
    }


_STATUS_TEXT = {
    STATUS_TAGS: "tags available",
    STATUS_NO_TAGS: "no tags (pin to revision)",
    STATUS_FAILED: "tag lookup failed (network, git, or timeout; unknown)",
    STATUS_REJECTED: "URL rejected (not https://, ssh://, or git@host:path); not checked",
}


def format_entry(entry: dict) -> str:
    latest = f" (latest: {', '.join(entry['latest_tags'])})" if entry["latest_tags"] else ""
    return f"  {entry['name']}: branch={entry['branch']} -> {_STATUS_TEXT[entry['status']]}{latest}"


def run(args: argparse.Namespace) -> int:
    pbxproj_path = Path(args.project) / "project.pbxproj"
    if not pbxproj_path.is_file():
        sys.stderr.write(f"Not found: {pbxproj_path}\n")
        return 1

    pins = find_branch_pins(pbxproj_path.read_text())
    if not pins:
        print("No branch-pinned SPM dependencies found.")
        return 0

    results = [build_entry(pin) for pin in pins]
    if args.json:
        print(json.dumps(results, indent=2))
    else:
        for entry in results:
            print(format_entry(entry))
    return 0
