# C and C++ modern baseline and checks

Training data defaults to C++11/14 patterns, raw owning pointers, C-style casts, and header-hygiene mistakes. Read `CMakeLists.txt` (`CMAKE_CXX_STANDARD`, `CMAKE_C_STANDARD`), `meson.build`, `compile_commands.json`, and `.clang-tidy` before applying any row below, and use a feature only when the project's language standard and compiler toolchain meet its `since` tag. Verified 2026-10 against the C++ Core Guidelines and LLVM `clang-tidy` check documentation.

## Modern C++ and C baseline

| Write | Since | Replaces |
|---|---|---|
| `std::string_view`, `std::optional<T>`, `std::variant<Ts...>`, `std::filesystem::path`, `if constexpr`, structured bindings (`auto [k, v] = ...`) | C++17 | `const std::string&` for read-only string params, out-parameters or sentinel pointers for optional results, `union` + tag boilerplate, `<sys/stat.h>` path manipulation |
| `std::span<T>` and `std::span<const T>` | C++20 | `(const T* ptr, size_t len)` pointer-plus-length parameter pairs |
| Concepts (`template <std::integral T>`) and `<ranges>` (`std::views::filter`, `std::ranges::sort`) | C++20 | `std::enable_if_t<...>` SFINAE noise and verbose `.begin(), .end()` iterator pairs |
| `std::jthread` and `std::stop_token` | C++20 | `std::thread` with manual `join()` in destructors and ad-hoc atomic stop flags |
| `std::format("...", x)` | C++20 | `std::stringstream` formatting or type-unsafe `snprintf` |
| `std::expected<T, E>` | C++23 | error-code out-parameters or exceptions on expected failure paths |
| `std::print` / `std::println` (`<print>`) | C++23 | `std::cout << ... << '\n'` chains |
| `std::mdspan` and explicit object parameters (`this auto&& self`, "deducing this") | C++23 | nested `std::vector<std::vector<T>>` matrices and duplicated `const` / non-`const` accessor overloads |
| C23 `nullptr`, `constexpr`, `typeof`, `[[nodiscard]]`, `<stdckdint.h>` checked integer arithmetic (`ckd_add`) | C23 | `NULL`, macro-only constants, compiler-specific `__typeof__`, manual overflow checks in C |

## Outdated habits to replace

- **Raw `new` / `delete` and `malloc` / `free` in C++ (C++ Core Guidelines R.10, R.11):** bind every resource to an RAII owner (`std::unique_ptr`, `std::vector`, custom RAII handle). Raw `T*` and `T&` are non-owning observers only.
- **Using `std::endl` in output:** use `'\n'`; `std::endl` forces a buffer flush on every call (SL.io.50).
- **Unnamed RAII locks (`std::lock_guard<std::mutex>(m);`) or multi-mutex `lock_guard`:** an unnamed guard destroys at the semicolon without locking the scope (CP.44); use named `std::scoped_lock lock(m1, m2)` (C++17, CP.21).
- **`using namespace std;` in headers (SF.7) and non-self-contained headers (SF.11):** never put `using namespace` at file scope in a header; every header must compile standalone and include `#pragma once` or an `#ifndef` guard.
- **C-style casts `(T)x` and `0` / `NULL` for pointers:** use `static_cast<T>(x)` and `nullptr` (ES.47, ES.48).

## Mechanical checks

Generate `compile_commands.json` (`cmake -S . -B build -DCMAKE_EXPORT_COMPILE_COMMANDS=ON`), measure function lengths and complexity across non-test sources first, then tune `.clang-tidy` thresholds from `mean + 2 * sigma`.

### `.clang-tidy` (check and option names verified against `clang.llvm.org`)

```yaml
Checks: >
  -*,
  bugprone-*,
  bugprone-unused-raii,
  cppcoreguidelines-avoid-magic-numbers,
  cppcoreguidelines-avoid-non-const-global-variables,
  cppcoreguidelines-owning-memory,
  cppcoreguidelines-pro-type-cstyle-cast,
  cppcoreguidelines-special-member-functions,
  misc-include-cleaner,
  modernize-use-nullptr,
  modernize-use-override,
  readability-function-cognitive-complexity,
  readability-function-size
WarningsAsErrors: '*'
CheckOptions:
  - key: readability-function-size.LineThreshold
    value: '60'            # tune to repo 2-sigma
  - key: readability-function-size.StatementThreshold
    value: '50'
  - key: readability-function-size.BranchThreshold
    value: '12'
  - key: readability-function-size.ParameterThreshold
    value: '6'
  - key: readability-function-size.NestingThreshold
    value: '4'
  - key: readability-function-cognitive-complexity.Threshold
    value: '15'
  - key: cppcoreguidelines-avoid-magic-numbers.IgnoredIntegerValues
    value: '1;2;3;4;'
```

### Compiler flags, sanitizers, and suppression hygiene

- **Compiler warnings (GCC / Clang):** `-Wall -Wextra -Wpedantic -Wconversion -Wsign-conversion -Wshadow -Werror` (or `/W4 /WX` on MSVC), set on project targets via `target_compile_options(<target> PRIVATE ...)`, never global `add_compile_options` that leaks into third-party `FetchContent` dependencies.
- **Sanitizers in Debug/CI test runs:** `-fsanitize=address,undefined -fno-omit-frame-pointer` (plus a ThreadSanitizer job `-fsanitize=thread` for concurrent code).
- **Formatting:** `clang-format --dry-run --Werror` on all tracked `.h`, `.hpp`, `.c`, `.cpp` files.
- **Suppression hygiene:** ban bare `// NOLINT` and `// NOLINTNEXTLINE` without a specific check name in parentheses; require `// NOLINT(check-name): reason (#issue)` (enforced by `scripts/scan_bypasses.py` and a pre-commit regex check).

### Plant-a-violation verification (red then green)

| Family | Plant | Expected failure |
|---|---|---|
| Raw owning allocation | `int* p = new int(5); delete p;` in a `.cpp` file | `cppcoreguidelines-owning-memory` |
| C-style cast / NULL | `int* p = (int*)NULL;` | `cppcoreguidelines-pro-type-cstyle-cast`, `modernize-use-nullptr` |
| Size / complexity | a function exceeding `LineThreshold` or `NestingThreshold` | `readability-function-size` |
| Unnamed lock guard | `std::lock_guard<std::mutex>(m);` | `bugprone-unused-raii` |

## Layouts (RECOMMENDATION)

Basis: Pitchfork Layout (PFL) convention and CMake target-based modularity.

- **Libraries:** `include/<project>/` for public headers, `src/` for implementation and private headers, `tests/` for GoogleTest / Catch2 / doctest suites, `CMakeLists.txt` defining targets with `target_include_directories(<tgt> PUBLIC include PRIVATE src)`.
- **Applications with multiple domains:** `src/<feature>/` directories, each with its own `STATIC` library target in CMake that links only the targets it is allowed to depend on. CMake `target_link_libraries` with `PRIVATE` visibility is the mechanical boundary check: a feature cannot `#include` another feature's private headers unless linked.
- **When overkill (KISS):** a single-binary tool under ~1,000 lines uses a single `src/` directory and one library target (linked by both the `main.cpp` executable and the test executable).

## Judgement seeds for `CODING_STANDARDS.md`

- Follow the Rule of Zero (C.20): types that do not directly manage a raw resource define no custom destructor, copy, or move operations. When a class wraps a raw handle, isolate it in a dedicated RAII type that implements the Rule of Five (C.21).
- Express ownership in types: `T` or `std::unique_ptr<T>` for unique ownership, `std::span<const T>` or `std::string_view` for borrowed ranges, `const T&` or `const T*` for borrowed single objects.
- Mark single-argument constructors `explicit` (C.46) and mark non-mutating member functions `const` (Con.2) and value-returning queries `[[nodiscard]]`.
