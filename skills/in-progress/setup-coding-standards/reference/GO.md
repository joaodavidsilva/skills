# Go modern baseline and checks

Training data defaults to pre-1.21 Go patterns (`interface{}`, loop-variable rebinding, manual min/max helpers, `golangci-lint` v1 configs). Read the `go` and `toolchain` directives in `go.mod` before applying any row below, and use a feature only when the project's Go version meets its `since` tag. Verified 2026-10 against Go 1.18 to 1.27 release notes and `golangci-lint` v2 documentation.

## Modern language and stdlib baseline

| Write | Since | Replaces |
|---|---|---|
| `any` | Go 1.18 | `interface{}` |
| `os.ReadFile`, `os.WriteFile`, `io.ReadAll`, `io.Discard` | Go 1.16 | `io/ioutil` (deprecated) |
| `errors.Join(err1, err2)` and `context.WithCancelCause` | Go 1.20 | custom multi-error slices and unattributed cancellation |
| `min(a, b)`, `max(a, b)`, `clear(m)` builtins | Go 1.21 | hand-rolled integer/float `min`/`max` helpers and delete-in-loop map clearing |
| `slices`, `maps`, and `cmp` packages (`slices.Contains`, `slices.SortFunc`, `cmp.Or`) | Go 1.21 (`cmp.Or` 1.22) | `sort.Slice` boilerplate, manual linear scans, `if x == "" { x = def }` chains |
| `log/slog` structured logging | Go 1.21 | unstructured `log.Printf` or adding a third-party logger for basic structured logs |
| Per-iteration loop variables (`for _, v := range xs` is safe to capture in closures and `t.Parallel()`) | Go 1.22 | `v := v` / `tt := tt` loop-variable rebinding |
| `for i := range n` integer range and `math/rand/v2` | Go 1.22 | `for i := 0; i < n; i++` when only the count matters; `math/rand.Seed(...)` (deprecated) |
| `net/http` `ServeMux` method and wildcard patterns (`mux.HandleFunc("GET /items/{id}", h)`) | Go 1.22 | pulling in a router dependency solely for method matching and path params |
| Range-over-func iterators (`iter.Seq[V]`, `iter.Seq2[K, V]`, `slices.Collect`) | Go 1.23 | channel-based generators that leak goroutines on early break |
| `tool` directive in `go.mod` (`go get -tool ...`, `go tool <name>`) | Go 1.24 | `tools.go` with blank `import _ "..."` build-tag hacks |
| `testing.B.Loop()` (`for b.Loop() { ... }`), `t.Context()`, `t.Chdir()` | Go 1.24 | `for i := 0; i < b.N; i++` (and manual `b.ResetTimer()`), manual test context cancellation, `os.Chdir` with defer cleanup |
| Generic type aliases (`type Set[T comparable] = map[T]struct{}`) | Go 1.24 | wrapper structs where a parameterized alias suffices |
| `testing/synctest` package for deterministic concurrent time testing | Go 1.25 | `time.Sleep` synchronization in concurrency tests |
| `new(expr)` with an initial value expression (`Age: new(yearsSince(born))`) | Go 1.26 | `ptr[T](v T) *T` helper functions for optional struct fields |
| Generic methods on concrete types (`func (r *Repo) Load[T any](id string) (T, error)`) | Go 1.27 | package-level generic functions that belong to a concrete receiver (interface methods still cannot declare type parameters) |

## Outdated habits to replace

- **Writing `golangci-lint` v1 configs:** `golangci-lint` v2 requires `version: "2"` at the top of `.golangci.yml`, moves formatters (`gofmt`, `gofumpt`, `goimports`) under a top-level `formatters:` block, replaces `issues.exclude-rules` / `exclude-dirs-use-default` with `linters.exclusions.rules` and `linters.exclusions.paths`, and renames `gomnd` to `mnd`.
- **`tt := tt` in table-driven tests on Go 1.22+:** flagged by `copyloopvar` and `modernize`.
- **Ignoring returned errors or blank-assigning `_ = f()` without reason:** flagged by `errcheck`.
- **Using `http.DefaultClient` or `http.ListenAndServe` with zero timeouts:** always construct `&http.Client{Timeout: ...}` and `&http.Server{ReadHeaderTimeout: ..., ReadTimeout: ..., WriteTimeout: ..., IdleTimeout: ...}`.

## Mechanical checks

Measure function lengths across `*.go` (excluding `*_test.go` and generated `*.pb.go` / `*_gen.go`) first, then set `funlen` thresholds from `mean + 2 * sigma` and record existing legacy outliers under `linters.exclusions.rules`.

### `.golangci.yml` (verified against `golangci-lint` v2.x)

```yaml
version: "2"

linters:
  default: standard
  enable:
    - errcheck
    - errorlint        # enforces %w wrapping and errors.Is / errors.As
    - exhaustive       # exhaustive switch on enums
    - copyloopvar      # flags redundant loop variable copies (Go 1.22+)
    - modernize        # flags pre-1.21/1.22/1.26 patterns replaced by stdlib/language
    - funlen           # function length gate
    - gocognit         # cognitive complexity gate
    - cyclop           # cyclomatic complexity gate
    - nestif           # deep nesting gate
    - mnd              # magic numbers
    - depguard         # import boundary enforcement
    - revive           # configurable style and complexity rules
    - nolintlint       # suppression hygiene
  settings:
    funlen:
      lines: 60        # tune to repo 2-sigma
      statements: 40
      ignore-comments: true
    gocognit:
      min-complexity: 15
    cyclop:
      max-complexity: 15
    nestif:
      min-complexity: 4
    nolintlint:
      require-explanation: true
      require-specific: true
      allow-unused: false
    depguard:
      rules:
        domain_purity:
          files:
            - "**/internal/domain/**"
          deny:
            - pkg: "net/http"
              desc: "domain packages must not depend on HTTP transport"
            - pkg: "database/sql"
              desc: "domain packages must not depend on SQL drivers"
  exclusions:
    generated: lax
    rules:
      - path: _test\.go
        linters:
          - funlen
          - mnd

formatters:
  enable:
    - gofumpt
    - goimports
```

Also wire into the check command:
- `go test -race ./...` (concurrency safety).
- `govulncheck ./...` (reachability-based vulnerability check).

### Plant-a-violation verification (red then green)

| Family | Plant | Expected failure |
|---|---|---|
| Size / complexity | a 75-line function in a non-test `.go` file | `funlen` |
| Naked suppression | `//nolint` without `//nolint:linter // reason (#issue)` | `nolintlint` |
| Error wrapping | `if err == sql.ErrNoRows` instead of `errors.Is` | `errorlint` |
| Boundary breach | import `net/http` inside `internal/domain/` | `depguard` |

## Layouts (RECOMMENDATION)

Basis: official Go Team "Organizing a Go module" guide (`go.dev/doc/modules/layout`).

- **Small library or single CLI (<5 to 10 files):** flat root package (`*.go` at repo root). Do not create `pkg/` or `internal/` until there are distinct packages to separate.
- **Service or multi-binary repo:** `cmd/<app>/main.go` (thin wiring only: flags, config, dependency construction, `signal.NotifyContext`) + `internal/<feature>/` grouped by domain capability (`internal/orders/`, `internal/billing/`), not by technical layer (`controllers/`, `services/`, `models/`). Avoid a `pkg/` directory unless external modules genuinely import it.
- **Interfaces live at the consumer:** define small interfaces in the package that calls them, and return concrete structs from providers.

## Judgement seeds for `CODING_STANDARDS.md`

- `cmd/<app>/main.go` parses config and wires dependencies; no business rules live in `main`.
- Wrap errors with context at package boundaries (`fmt.Errorf("load order %s: %w", id, err)`) so callers can use `errors.Is` / `errors.As` without coupled strings.
- Pass `context.Context` as the first parameter of every I/O or cross-boundary function; never store a `Context` inside a struct.
