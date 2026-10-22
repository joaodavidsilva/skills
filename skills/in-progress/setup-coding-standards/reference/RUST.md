# Rust modern baseline and checks

Training data reaches for `lazy_static!`, `once_cell`, `async-trait`, and `#[allow(...)]` attributes where current Rust and Edition 2024 have built-in replacements and stricter safety defaults. Read `edition` and `rust-version` in `Cargo.toml` before applying any row below, and use a feature only when the crate's MSRV (`rust-version`) or toolchain meets its `since` tag. Verified 2026-10 against Rust release notes (up to 1.99) and the Rust 2024 Edition Guide.

## Modern language and stdlib baseline

| Write | Since | Replaces |
|---|---|---|
| `let Some(x) = opt else { return Err(...); };` | Rust 1.65 | `let x = match opt { Some(x) => x, None => return ... };` |
| `std::sync::OnceLock` and `std::cell::OnceCell` | Rust 1.70 | `once_cell::sync::OnceCell` and `once_cell::unsync::OnceCell` |
| Native `async fn` in traits and return-position `impl Trait` in traits (RPITIT) | Rust 1.75 | `#[async_trait]` macro when dynamic dispatch (`dyn Trait`) is not required |
| `c"hello"` C-string literals | Rust 1.77 | `CStr::from_bytes_with_nul(b"hello\0").unwrap()` |
| Inline `const { ... }` expressions | Rust 1.79 | helper `const` items defined only to force compile-time evaluation |
| `std::sync::LazyLock` and `std::cell::LazyCell` | Rust 1.80 | `lazy_static!` and `once_cell::sync::Lazy` |
| `core::error::Error` (available in `#![no_std]`) | Rust 1.81 | custom error traits in `no_std` crates |
| `#[expect(clippy::..., reason = "...")]` (PEP/RFC lint expectation) | Rust 1.81 | `#[allow(...)]`, which stays silent after the underlying warning is fixed |
| Edition 2024 (`edition = "2024"` in `Cargo.toml`): `Future` and `IntoFuture` in prelude, RPIT lifetime capture rules (`use<..>`), `unsafe extern` blocks, `#[unsafe(no_mangle)]` / `#[unsafe(export_name)]`, `unsafe_op_in_unsafe_fn` warn-by-default | Rust 1.85 | Edition 2021 defaults, bare `extern "C"` blocks, unannotated unsafe operations inside `unsafe fn` |
| `if let Some(a) = x && let Ok(b) = y` (`let` chains) | Rust 1.88 (Edition 2024) | deeply nested `if let` pyramids |
| Workspace dependency `default-features = false` override in member `Cargo.toml` (Edition 2024+) | Rust 1.99 | forcing `default-features = false` at the workspace root for every member |

## Outdated habits to replace

- **Using `#[allow(...)]` to silence lints:** use `#[expect(lint_name, reason = "why (#issue)")]` (Rust 1.81+). Unlike `#[allow]`, `#[expect]` warns as `unfulfilled_lint_expectations` once the code no longer triggers the lint.
- **Calling `.unwrap()` in library or production server paths:** propagate with `?`, or use `.expect("invariant: ...")` only when a panic is a proven bug and `expect_used` is explicitly exempted with a reason.
- **Using `Box<dyn std::error::Error>` in library public APIs:** use a typed error `enum` (via `thiserror`) for libraries so callers can match variants; reserve `anyhow::Result` for binary/application crates.
- **Wildcard `_ =>` arms on internal domain enums:** match variants exhaustively so adding a variant becomes a compile error.

## Mechanical checks

Configure lints in `Cargo.toml` under `[lints]` (or `[workspace.lints]` with `lints.workspace = true` in member crates) and thresholds in `clippy.toml`. Note: in `Cargo.toml` and `#[expect(clippy::...)]`, lint names use **underscores**; in `clippy.toml` keys use **hyphens**.

### `Cargo.toml` (`[lints]`, verified against `clippy-driver -W help`)

```toml
[lints.rust]
unsafe_op_in_unsafe_fn = "deny"
missing_docs = "warn"

[lints.clippy]
# Correctness & safety
unwrap_used = "deny"
expect_used = "warn"
wildcard_enum_match_arm = "warn"
dbg_macro = "deny"
todo = "warn"

# Size & complexity gates
too_many_lines = "warn"
cognitive_complexity = "warn"
excessive_nesting = "warn"
too_many_arguments = "warn"

# Suppression hygiene: require #[expect(..., reason = "...")] over #[allow(...)]
allow_attributes = "deny"
allow_attributes_without_reason = "deny"
```

### `clippy.toml` (verified against Clippy Lint Configuration Options)

Measure function lengths and nesting first, then set thresholds in `clippy.toml` from `mean + 2 * sigma`:

```toml
allow-unwrap-in-tests = true
allow-expect-in-tests = true
too-many-lines-threshold = 80
cognitive-complexity-threshold = 15
excessive-nesting-threshold = 4
too-many-arguments-threshold = 6
```

Also wire into the check command:
- `cargo clippy --all-targets --all-features -- -D warnings`
- `cargo fmt --all -- --check`
- `cargo test --all-targets`
- `cargo deny check` or `cargo audit` (when installed, for advisory and license checks)

### Plant-a-violation verification (red then green)

| Family | Plant | Expected failure |
|---|---|---|
| Fallible unwrap | `Some(1).unwrap()` in `src/lib.rs` (outside `#[cfg(test)]`) | `clippy::unwrap_used` |
| Naked suppression | `#[allow(dead_code)]` on a function | `clippy::allow_attributes` / `clippy::allow_attributes_without_reason` |
| Size / complexity | a function exceeding `too-many-lines-threshold` | `clippy::too_many_lines` |
| Unsafe hygiene | calling a raw-pointer deref inside `unsafe fn` without an inner `unsafe {}` block | `unsafe_op_in_unsafe_fn` |

## Layouts (RECOMMENDATION)

Basis: Cargo Book ("Cargo Workspaces", "Package Layout") and Rust API Guidelines.

- **Single crate:** `src/lib.rs` holds all logic and exposes a narrow `pub` surface; `src/main.rs` is a thin entrypoint that parses CLI/env and calls into `lib.rs`. Group internal modules by domain (`src/orders/`, `src/billing/`, using `src/orders.rs` + `src/orders/sub.rs` rather than `mod.rs` per Rust 2018+ convention) and mark internal cross-module items `pub(crate)`.
- **Multi-crate Cargo workspace:** split into workspace crates only when compile times, independent publishing, or strict dependency direction between domain and adapters require it. Share dependency versions and lints via `[workspace.dependencies]` and `[workspace.lints]`.
- **When overkill (KISS):** a small CLI or library under ~1,000 lines stays a single crate with 2 to 5 domain modules.

## Judgement seeds for `CODING_STANDARDS.md`

- Parse untrusted input into validated domain types (newtypes such as `struct OrderId(Uuid)` and enums) at the boundary rather than passing raw strings and integers inward.
- Every `unsafe` block carries a `// SAFETY:` comment stating the exact invariant the caller guarantees.
- Accept borrowed slices (`&str`, `&[T]`, `impl AsRef<Path>`) in parameters when the function does not need ownership; clone only when ownership transfer is intentional.
