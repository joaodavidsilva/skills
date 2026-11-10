"""Build Timing Summary parsing and run statistics."""
from __future__ import annotations

import re
import statistics

_TASK_COUNT_RE = re.compile(r"^(.+?)\s*\((\d+)\s+tasks?\)$")


def _extract_task_count(name: str) -> tuple[str, int | None]:
    """Split 'Category (N tasks)' into ('Category', N)."""
    match = _TASK_COUNT_RE.match(name)
    if match:
        return match.group(1).strip(), int(match.group(2))
    return name, None


def parse_timing_summary(output: str) -> list[dict]:
    categories: dict[str, float] = {}
    task_counts: dict[str, int | None] = {}
    for raw_line in output.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        for suffix in (" seconds", " second", " sec"):
            if not line.endswith(suffix):
                continue
            trimmed = line[: -len(suffix)]
            if "|" in trimmed:
                name_part, _, seconds_text = trimmed.rpartition("|")
            else:
                name_part, _, seconds_text = trimmed.rpartition(" ")
            try:
                seconds = float(seconds_text.strip())
            except ValueError:
                continue
            cleaned_name = name_part.replace("  ", " ").strip(" -:")
            if len(cleaned_name) < 3:
                continue
            base_name, count = _extract_task_count(cleaned_name)
            categories[base_name] = categories.get(base_name, 0.0) + seconds
            if count is not None:
                task_counts[base_name] = (task_counts.get(base_name) or 0) + count
            break
    result: list[dict] = []
    for name, seconds in sorted(categories.items(), key=lambda item: item[1], reverse=True):
        entry: dict = {"name": name, "seconds": round(seconds, 3)}
        if name in task_counts:
            entry["task_count"] = task_counts[name]
        result.append(entry)
    return result


def stats_for(runs: list[dict]) -> dict:
    durations = [run["duration_seconds"] for run in runs if run.get("success")]
    if not durations:
        return {
            "count": 0,
            "min_seconds": 0.0,
            "max_seconds": 0.0,
            "median_seconds": 0.0,
            "average_seconds": 0.0,
        }
    return {
        "count": len(durations),
        "min_seconds": round(min(durations), 3),
        "max_seconds": round(max(durations), 3),
        "median_seconds": round(statistics.median(durations), 3),
        "average_seconds": round(statistics.fmean(durations), 3),
    }
