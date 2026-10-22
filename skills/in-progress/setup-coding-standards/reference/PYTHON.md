# Python modern baseline and checks

Training data defaults to older Python 3.8 and 3.9 idioms and deprecated linter keys. Read `requires-python` in `pyproject.toml` (plus `.python-version` or `uv.lock`) before applying any row below, and use a feature only when the project's minimum Python version meets its `since` tag. Verified 2026-10 against Python 3.10 to 3.15 release notes and Ruff, Mypy, Pyright, and `ty` documentation.

## Modern language and stdlib baseline

| Write | Since | Replaces |
|---|---|---|
| `list[str]`, `dict[str, int]`, `tuple[int, ...]` | Python 3.9 | `from typing import List, Dict, Tuple` (deprecated in 3.9) |
| `X \| None`, `int \| str`, `isinstance(x, int \| str)` | Python 3.10 | `Optional[X]`, `Union[int, str]` |
| `match value:` structural pattern matching | Python 3.10 | long `if` / `elif isinstance(...)` chains on tagged structures |
| `tomllib.loads(...)` / `tomllib.load(f)` | Python 3.11 | third-party `toml` or `tomli` for reading TOML |
| `ExceptionGroup` and `except* SomeError:` | Python 3.11 | ad-hoc multi-error wrappers in `asyncio.TaskGroup` flows |
| `typing.Self` | Python 3.11 | `TypeVar("T", bound="MyClass")` on fluent methods and classmethods |
| `enum.StrEnum` | Python 3.11 | `class Color(str, Enum):` mixin boilerplate |
| `type Point = tuple[float, float]` and `def first[T](xs: list[T]) -> T:` (PEP 695) | Python 3.12 | `TypeAlias` and module-level `TypeVar("T")` declarations |
| `@typing.override` | Python 3.12 | unverified method overrides that silently drift when a base class renames a method |
| `pathlib.Path.walk()` | Python 3.12 | `os.walk()` when paths are already `Path` objects |
| Deferred evaluation of annotations by default (PEP 649) | Python 3.14 | routine `from __future__ import annotations` headers |
| `t"..."` template strings (`string.templatelib.Template`, PEP 750) | Python 3.14 | unsafe `f"..."` SQL/HTML interpolation where structured escaping is needed |
| `frozendict` builtin, `sentinel` builtin, lazy imports, UTF-8 default encoding, unpacking in comprehensions (`[*x for x in xs]`) | Python 3.15 | third-party `frozendict`, `_MISSING = object()` boilerplate, `encoding="utf-8"` on every text open when targeting 3.15+ |

## Outdated habits to replace

- **Top-level `[tool.ruff] select` / `ignore`:** moved to `[tool.ruff.lint]`. Putting `select` at the root of `[tool.ruff]` emits a deprecation warning or fails in newer Ruff versions.
- **`os.path` string manipulation:** use `pathlib.Path` across application code (`Path(base) / name`, `.read_text()`, `.resolve()`).
- **Mutable default arguments (`def f(items: list[str] = []):`):** use `None` and initialize inside the function, or ` dataclasses.field(default_factory=list)`. Enforced by Ruff `B006`.
- **Bare `except:` or `except Exception: pass`:** catch the specific exception type and chain with `raise DomainError(...) from err` (Ruff `E722`, `B904`).
- **Legacy packaging (`setup.py`, `requirements.txt` without lock, `pip` + `venv` scripts):** prefer `pyproject.toml` with `uv` (`uv.lock`) when starting or modernizing a repo, unless the repo already pins Poetry, Hatch, or PDM.

## Mechanical checks

Measure the repo's file and function lengths first (see `CHECKS.md` "Measure first"), then set thresholds in `pyproject.toml` from `mean + 2 * sigma` and record existing outliers under `[tool.ruff.lint.per-file-ignores]`.

### Ruff (`pyproject.toml`, verified against Ruff 0.17.x)

```toml
[tool.ruff]
line-length = 100

[tool.ruff.lint]
select = [
  "E", "F", "W",   # pycodestyle + pyflakes
  "I",             # isort import sorting
  "B",             # flake8-bugbear (B006 mutable defaults, B904 raise-without-from)
  "UP",            # pyupgrade (enforces modern syntax for target-version)
  "SIM",           # flake8-simplify
  "C90",           # C901 McCabe cyclomatic complexity
  "PLR",           # Pylint refactor: PLR0911/0912/0913/0915 size gates, PLR2004 magic value
  "TID",           # flake8-tidy-imports: TID251 banned APIs, TID252 relative imports
  "ERA",           # ERA001 commented-out code
  "ANN401",        # disallow typing.Any in annotations
  "PGH003",        # blanket type: ignore without error code
  "PGH004",        # blanket noqa without rule code
  "RUF100",        # unused noqa directive
]

[tool.ruff.lint.mccabe]
max-complexity = 10

[tool.ruff.lint.pylint]
max-args = 5        # PLR0913
max-branches = 12   # PLR0912
max-returns = 6     # PLR0911
max-statements = 50 # PLR0915 (tune to repo 2-sigma)
```

- **Cognitive complexity:** Ruff does not ship a cognitive-complexity rule; pair Ruff with `complexipy` (`max-complexity-allowed = 15` in `pyproject.toml` under `[tool.complexipy]`) when cognitive complexity gating is needed.
- **File length:** Ruff does not enforce a max-lines-per-file rule; use a 10-line check script in CI or Pylint `C0302` (`max-module-lines`) when a hard file-line gate is required.

### Type checking (Mypy, Pyright, or `ty`)

Use whichever checker the repo already runs; for new repos, configure strict mode and ban uncoded suppressions:

- **Mypy (2.x):** `strict = true` in `[tool.mypy]`, plus `enable_error_code = ["ignore-without-code", "unused-ignore", "redundant-expr", "truthy-bool", " explicit-override"]` and `warn_unreachable = true`. Every `# type: ignore[code]` requires the bracketed error code and an adjacent reason comment.
- **Pyright:** `typeCheckingMode = "strict"`, `reportUnnecessaryTypeIgnoreComment = "error"` in `[tool.pyright]`.
- **Astral `ty` (0.0.x):** fast Rust type checker; check whether the project uses `ty check` before adding a second checker.

### Architectural boundaries (`import-linter`)

Enforce package layering and feature isolation in `pyproject.toml` via `import-linter` (`lint-imports` command):

```toml
[tool.importlinter]
root_packages = ["app"]

[[tool.importlinter.contracts]]
name = "Domain stays pure"
type = "forbidden"
source_modules = ["app.domain"]
forbidden_modules = ["app.adapters", "app.http", "fastapi", "sqlalchemy"]

[[tool.importlinter.contracts]]
name = "Features do not import each other's internals"
type = "independence"
modules = ["app.features.orders", "app.features.billing"]
```

### Plant-a-violation verification (red then green)

| Family | Plant | Expected failure |
|---|---|---|
| Size / complexity | a function with 60 statements or 6 parameters | `PLR0915` / `PLR0913` |
| Naked suppression | `# noqa` or `# type: ignore` without a code | `PGH004` / `PGH003` (or Mypy `ignore-without-code`) |
| Unused suppression | `# noqa: F401` on a line with no import | `RUF100` |
| Boundary breach | import `fastapi` inside `app/domain/` | `lint-imports` contract failure |

## Layouts (RECOMMENDATION)

Basis: Python Packaging User Guide (`src/` layout) and domain/feature slicing for services.

- **Libraries and CLIs:** `src/<package_name>/` with `__init__.py` exposing only the public API via explicit `__all__`, and `tests/` at the repo root.
- **FastAPI / Django / service apps:** group by feature (`src/app/features/<feature>/{router,service,domain,repository}.py`) rather than top-level `routers/`, `services/`, `models/` folders once the app grows past 3 to 4 endpoints. Route handlers validate input and map responses; business rules stay in `domain` or `service` with no HTTP imports.
- **When overkill (KISS):** a single-purpose script or CLI under ~300 lines stays a single module or flat package.

## Judgement seeds for `CODING_STANDARDS.md`

- Keep route handlers and CLI entrypoints thin: parse with Pydantic/argparse, call a service or domain function, map the result.
- Prefer dataclasses, `NamedTuple`, or Pydantic models over raw `dict[str, Any]` across module boundaries.
- Cross-feature references pass identifiers (`OrderId`, `UUID`), never another feature's ORM model instance.
