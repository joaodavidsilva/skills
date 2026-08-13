#!/usr/bin/env python3
"""Generate or edit images with Gemini (Nano Banana) through the Interactions API.

Subcommands:
  generate        one prompt -> one or more images
  edit            edit an image (first --image is the target, the rest are references)
  generate-batch  many jobs from a JSONL file, run concurrently

Standard library only. Reads the key from GEMINI_API_KEY (or GOOGLE_API_KEY).
Gemini returns opaque images: for a transparent background, generate on a flat
key color and run scripts/remove_chroma_key.py (see reference/TRANSPARENCY.md).
"""

from __future__ import annotations

import argparse
import base64
import concurrent.futures
import json
import mimetypes
import os
from pathlib import Path
import sys
import threading
import time
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional

API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions"
DEFAULT_MODEL = "nano-banana-2.1"
MODEL_ALIASES = {
    "nano-banana-2.1": "gemini-nano-banana-2.1",
    "nano-banana-2": "gemini-3.1-flash-image",
    "nano-banana-2-lite": "gemini-3.1-flash-lite-image",
    "nano-banana-pro": "gemini-3-pro-image",
    "nano-banana": "gemini-2.5-flash-image",
}
ASPECT_RATIOS = {
    "1:1", "1:4", "1:8", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4",
    "9:16", "16:9", "21:9",
}
SIZES = {"512", "1K", "2K", "4K"}
DEFAULT_CONCURRENCY = 4
DEFAULT_MAX_ATTEMPTS = 3
RETRY_STATUS = {429, 500, 502, 503, 504}
REQUEST_TIMEOUT = 180

# (CLI/JSONL field, label in the prompt spec), in prompt order.
SPEC_FIELDS = [
    ("use_case", "Use case"),
    ("asset_type", "Asset type"),
    ("prompt", "Primary request"),
    ("scene", "Scene/backdrop"),
    ("subject", "Subject"),
    ("style", "Style/medium"),
    ("composition", "Composition/framing"),
    ("lighting", "Lighting/mood"),
    ("palette", "Color palette"),
    ("materials", "Materials/textures"),
    ("text", "Text (verbatim)"),
    ("constraints", "Constraints"),
    ("avoid", "Avoid"),
]
AUGMENT_KEYS = [key for key, _ in SPEC_FIELDS if key != "prompt"]

_print_lock = threading.Lock()


def log(message: str) -> None:
    with _print_lock:
        print(message, file=sys.stderr, flush=True)


def die(message: str, code: int = 1) -> "None":
    log(f"Error: {message}")
    raise SystemExit(code)


class JobError(Exception):
    pass


def resolve_model(model: str) -> str:
    return MODEL_ALIASES.get(model, model)


def api_key() -> str:
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not key:
        die(
            "GEMINI_API_KEY is not set. Create a key at https://aistudio.google.com/apikey "
            "and export GEMINI_API_KEY in your shell (never paste it into chat). "
            "Use --dry-run to preview without a key."
        )
    return key


def build_prompt(job: Dict[str, Any], images: List[Path], edit: bool) -> str:
    """Compose the labeled prompt spec. Raw prompt passes through with --no-augment."""
    prompt = (job.get("prompt") or "").strip()
    if job.get("no_augment"):
        return prompt
    lines: List[str] = []
    for key, label in SPEC_FIELDS:
        if key == "prompt":
            lines.append(f"{label}: {prompt}")
            if images:
                roles = []
                for idx, path in enumerate(images, start=1):
                    role = "edit target" if edit and idx == 1 else "reference image"
                    roles.append(f"Image {idx}: {role} ({path.name})")
                lines.append("Input images: " + "; ".join(roles))
            continue
        value = job.get(key)
        if value:
            lines.append(f"{label}: {value}")
    if len(lines) == 1 and not images:
        return prompt
    return "\n".join(lines)


def encode_image(path: Path) -> Dict[str, str]:
    mime = mimetypes.guess_type(path.name)[0]
    if mime not in {"image/png", "image/jpeg", "image/webp"}:
        die(f"Unsupported input image type for {path} (use PNG, JPEG, or WebP).")
    return {
        "type": "image",
        "mime_type": mime,
        "data": base64.b64encode(path.read_bytes()).decode("ascii"),
    }


def build_request(job: Dict[str, Any], prompt: str, images: List[Path]) -> Dict[str, Any]:
    response_format: Dict[str, Any] = {"type": "image"}
    if job.get("aspect_ratio"):
        response_format["aspect_ratio"] = job["aspect_ratio"]
    if job.get("size"):
        response_format["image_size"] = job["size"]
    content: List[Dict[str, Any]] = [{"type": "text", "text": prompt}]
    content.extend(encode_image(path) for path in images)
    return {
        "model": resolve_model(job.get("model") or DEFAULT_MODEL),
        "input": content,
        "response_format": response_format,
    }


def post(body: Dict[str, Any], key: str, max_attempts: int) -> Dict[str, Any]:
    data = json.dumps(body).encode("utf-8")
    last = ""
    for attempt in range(1, max_attempts + 1):
        request = urllib.request.Request(
            API_URL,
            data=data,
            headers={"Content-Type": "application/json", "x-goog-api-key": key},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "replace")[:400] if exc.fp else ""
            last = f"HTTP {exc.code}: {detail}"
            if exc.code not in RETRY_STATUS:
                raise JobError(last)
            if exc.code == 429:
                last += " (quota or rate limit)"
        except urllib.error.URLError as exc:
            last = f"network error: {exc.reason}"
        if attempt < max_attempts:
            delay = 2 ** attempt
            log(f"  attempt {attempt} failed ({last}); retrying in {delay}s")
            time.sleep(delay)
    raise JobError(f"failed after {max_attempts} attempts: {last}")


def extract_image(result: Dict[str, Any]) -> bytes:
    texts: List[str] = []
    for step in result.get("steps") or []:
        if step.get("type") != "model_output":
            continue
        for block in step.get("content") or []:
            if block.get("type") == "image" and block.get("data"):
                return base64.b64decode(block["data"])
            if block.get("type") == "text" and block.get("text"):
                texts.append(block["text"])
    note = f" Model said: {' '.join(texts)[:300]}" if texts else ""
    raise JobError("response contained no image." + note)


def sniff_extension(data: bytes) -> str:
    if data.startswith(b"\x89PNG"):
        return ".png"
    if data.startswith(b"\xff\xd8"):
        return ".jpg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp"
    raise JobError("response image has an unknown format.")


def output_paths(out: Path, n: int) -> List[Path]:
    if n == 1:
        return [out]
    return [out.with_name(f"{out.stem}-{i}{out.suffix}") for i in range(1, n + 1)]


def with_real_extension(target: Path, data: bytes) -> Path:
    """The API picks the encoding (often JPEG); name the file for what it holds."""
    ext = sniff_extension(data)
    if target.suffix.lower() in {ext, ".jpeg"} and ext == ".jpg":
        return target
    if target.suffix.lower() == ext:
        return target
    log(f"note: API returned {ext[1:].upper()}; saving as {target.with_suffix(ext).name}")
    return target.with_suffix(ext)


def run_job(job: Dict[str, Any], *, edit: bool, force: bool, dry_run: bool,
            max_attempts: int) -> List[Path]:
    images = [Path(p) for p in job.get("image") or []]
    for path in images:
        if not path.is_file():
            raise JobError(f"input image not found: {path}")
    if edit and not images:
        raise JobError("edit needs at least one --image (the edit target).")
    if not (job.get("prompt") or "").strip():
        raise JobError("prompt is empty.")
    if job.get("aspect_ratio") and job["aspect_ratio"] not in ASPECT_RATIOS:
        raise JobError(f"aspect ratio must be one of {sorted(ASPECT_RATIOS)}.")
    if job.get("size") and job["size"] not in SIZES:
        raise JobError("size must be one of 512, 1K, 2K, 4K (uppercase K).")
    n = int(job.get("n") or 1)
    targets = output_paths(Path(job["out"]), n)
    if not dry_run and not force:
        existing = [p for p in targets if p.exists()]
        if existing:
            raise JobError(f"output exists: {existing[0]} (use --force or a new name).")

    prompt = build_prompt(job, images, edit)
    body = build_request(job, prompt, images)
    if dry_run:
        preview = dict(body)
        preview["input"] = [
            block if block["type"] == "text" else {**block, "data": f"<{len(block['data'])} b64 chars>"}
            for block in body["input"]
        ]
        log(json.dumps({"targets": [str(p) for p in targets], "request": preview}, indent=2))
        return []

    key = api_key()
    written: List[Path] = []
    for target in targets:
        image = extract_image(post(body, key, max_attempts))
        target = with_real_extension(target, image)
        if target.exists() and not force:
            raise JobError(f"output exists: {target} (use --force or a new name).")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(image)
        written.append(target)
        log(f"wrote {target}")
    return written


def job_from_args(args: argparse.Namespace) -> Dict[str, Any]:
    prompt = args.prompt
    if args.prompt_file:
        prompt = Path(args.prompt_file).read_text(encoding="utf-8")
    job: Dict[str, Any] = {
        "prompt": prompt,
        "image": args.image or [],
        "out": args.out,
        "model": args.model,
        "aspect_ratio": args.aspect_ratio,
        "size": args.size,
        "n": args.n,
        "no_augment": args.no_augment,
    }
    for key in AUGMENT_KEYS:
        job[key] = getattr(args, key, None)
    return job


def cmd_single(args: argparse.Namespace, edit: bool) -> None:
    job = job_from_args(args)
    try:
        run_job(job, edit=edit, force=args.force, dry_run=args.dry_run,
                max_attempts=args.max_attempts)
    except JobError as exc:
        die(str(exc))


def cmd_batch(args: argparse.Namespace) -> None:
    lines = [ln for ln in Path(args.input).read_text(encoding="utf-8").splitlines() if ln.strip()]
    jobs: List[Dict[str, Any]] = []
    for number, line in enumerate(lines, start=1):
        try:
            raw = json.loads(line)
        except json.JSONDecodeError as exc:
            die(f"{args.input} line {number}: invalid JSON ({exc}).")
        if "out" in raw and Path(raw["out"]).name != raw["out"]:
            die(f"line {number}: 'out' must be a filename; --out-dir sets the folder.")
        job = {
            "model": args.model, "aspect_ratio": args.aspect_ratio, "size": args.size,
            "no_augment": args.no_augment,
        }
        job.update({k: v for k, v in raw.items() if v is not None})
        if isinstance(job.get("image"), str):
            job["image"] = [job["image"]]
        job["out"] = str(Path(args.out_dir) / raw.get("out", f"image_{number}"))
        jobs.append(job)
    if not jobs:
        die("batch file has no jobs.")

    failures = 0

    def worker(item):
        number, job = item
        try:
            run_job(job, edit=bool(job.get("edit")), force=args.force, dry_run=args.dry_run,
                    max_attempts=args.max_attempts)
            return number, None
        except JobError as exc:
            return number, str(exc)

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        futures = [pool.submit(worker, item) for item in enumerate(jobs, start=1)]
        for future in concurrent.futures.as_completed(futures):
            number, error = future.result()
            if error:
                failures += 1
                log(f"job {number} failed: {error}")
                if args.fail_fast:
                    pool.shutdown(wait=False, cancel_futures=True)
                    break
    if failures:
        die(f"{failures} of {len(jobs)} jobs failed.", code=2)


def add_common(p: argparse.ArgumentParser, batch: bool = False) -> None:
    p.add_argument("--model", default=DEFAULT_MODEL,
                   help=f"alias ({', '.join(MODEL_ALIASES)}) or a raw model id; default {DEFAULT_MODEL}")
    p.add_argument("--aspect-ratio", help="e.g. 16:9, 1:1, 4:5, 21:9; default: match input image, else 1:1")
    p.add_argument("--size", help="512, 1K, 2K, or 4K (uppercase K)")
    p.add_argument("--force", action="store_true", help="overwrite existing outputs")
    p.add_argument("--dry-run", action="store_true", help="print the request, make no API call")
    p.add_argument("--no-augment", action="store_true",
                   help="send the prompt verbatim, no labeled spec")
    p.add_argument("--max-attempts", type=int, default=DEFAULT_MAX_ATTEMPTS)
    if not batch:
        for key in AUGMENT_KEYS:
            p.add_argument(f"--{key.replace('_', '-')}", dest=key,
                           help=f"spec line: {dict(SPEC_FIELDS)[key]}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)

    for name, edit in (("generate", False), ("edit", True)):
        p = sub.add_parser(name, help="edit an image" if edit else "generate an image")
        p.add_argument("--prompt")
        p.add_argument("--prompt-file")
        p.add_argument("--image", action="append",
                       help=("edit target first, then references" if edit
                             else "reference image (repeatable)"))
        p.add_argument("--out", default=f"output/imagegen/{name}.jpg")
        p.add_argument("--n", type=int, default=1, help="variants of this one prompt")
        add_common(p)
        p.set_defaults(func=lambda a, e=edit: cmd_single(a, e))

    p = sub.add_parser("generate-batch", help="run many jobs from a JSONL file")
    p.add_argument("--input", required=True, help="JSONL: one job per line")
    p.add_argument("--out-dir", required=True)
    p.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY)
    p.add_argument("--fail-fast", action="store_true")
    add_common(p, batch=True)
    p.set_defaults(func=cmd_batch)

    args = parser.parse_args()
    if args.command != "generate-batch" and not (args.prompt or args.prompt_file):
        die("--prompt or --prompt-file is required.")
    if args.command == "generate-batch" and not 1 <= args.concurrency <= 16:
        die("--concurrency must be between 1 and 16.")
    args.func(args)


if __name__ == "__main__":
    main()
