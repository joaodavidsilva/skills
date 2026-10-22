# Gradle (Kotlin and Java) modern baseline and checks

Training data defaults to Kotlin 1.x idioms, Java 8/11 patterns, and Groovy/legacy Gradle build scripts. Detect the stack from `settings.gradle(.kts)`, `build.gradle(.kts)`, and `gradle/libs.versions.toml` first:
- `org.jetbrains.kotlin.*` plugin → apply **Kotlin** and **Gradle** sections.
- Java toolchain without Kotlin → apply **Java** and **Gradle** sections.
- `org.springframework.boot` vs `io.quarkus` vs `com.android.application` → apply the matching framework branch note in Layouts.

Compare every `since` tag below with the project's `kotlin` version, `jvmToolchain(...)` / `sourceCompatibility`, and `gradle-wrapper.properties` `distributionUrl`. Verified 2026-10 against Kotlin (up to 2.4), JDK (up to 25 LTS / 26), Gradle (up to 9.x), Detekt, and Checkstyle docs.

## Kotlin modern baseline

| Write | Since | Replaces |
|---|---|---|
| `EnumClass.entries` | Kotlin 1.9 | `EnumClass.values()` (allocates a new array on every call) |
| `data object Loading : UiState` | Kotlin 1.9 | `object Loading` with hand-written `toString`/`equals` |
| `..<` open-ended range (`0..<items.size`) | Kotlin 1.9 | `0 until items.size` |
| K2 compiler (default) and `@JvmInline value class` for domain IDs | Kotlin 2.0 (value classes 1.5) | primitive `String`/`Long` IDs or boxed wrapper classes |
| Guard conditions in `when` (`is Status.Active if user.isVerified -> ...`), non-local `break`/`continue` in inline lambdas, multi-dollar string interpolation `$$"..."` | Kotlin 2.1 / 2.2 | nested `if` inside `when` branches; escaping `$` in JSON/regex templates |
| Unified compiler warning control `-Xwarning-level=...` and `kotlin { explicitApi() }` for library modules | Kotlin 2.2 (`explicitApi` 1.4) | ad-hoc `-Werror` exclusions; accidental public API leakage |
| Context parameters (`context(logger: Logger)`) and `kotlin.uuid.Uuid` in stdlib | Kotlin 2.4 | experimental `context(Logger)` receivers; `java.util.UUID` in multiplatform code |

## Java modern baseline

| Write | Since | Replaces |
|---|---|---|
| `record` for immutable DTOs and value types, `sealed interface` / `sealed class` | Java 16 / 17 | boilerplate POJOs with getters/equals/hashCode; open class hierarchies |
| Pattern matching for `switch` and record patterns (`case Point(int x, int y) when x > 0 -> ...`) | Java 21 LTS | `instanceof` + cast chains and visitor boilerplate |
| Virtual threads (`Executors.newVirtualThreadPerTaskExecutor()`) for blocking I/O | Java 21 LTS | reactive thread-pool gymnastics when simple blocking code suffices |
| `SequencedCollection` (`list.getFirst()`, `list.getLast()`, `list.reversed()`) | Java 21 LTS | `list.get(0)`, `list.get(list.size() - 1)` |
| Module import declarations (`import module java.base;`), Flexible Constructor Bodies (validation statements before `super(...)`), and `ScopedValue` (replacing `ThreadLocal` in structured concurrency) | Java 25 LTS (JEPs 511, 513, 506) | repetitive package imports, static helper methods just to validate constructor args before `super()`, mutable `ThreadLocal` leaks |

## Gradle baseline and outdated habits

- **Version catalog (`gradle/libs.versions.toml`) + `plugins {}` block:** replaces `buildscript {}`, `ext {}` version variables, and `apply plugin:`.
- **Convention plugins in `build-logic/` (`includeBuild("build-logic")`)** for multi-module builds: replaces `subprojects {}` / `allprojects {}` cross-configuration, which breaks project isolation and the Configuration Cache.
- **`java { toolchain { languageVersion = JavaLanguageVersion.of(21) } }` or `kotlin { jvmToolchain(21) }`:** replaces `sourceCompatibility` / `targetCompatibility` without a toolchain.
- **Coroutine anti-patterns (Kotlin):** never launch on `GlobalScope`; never catch `CancellationException` without rethrowing it; never call `Thread.sleep` or blocking I/O on `Dispatchers.Default`/`Main`.

## Mechanical checks

Measure file and method lengths first, then set thresholds from `mean + 2 * sigma` and record existing legacy outliers in `detekt-baseline.xml` (`./gradlew detektBaseline`) or Checkstyle suppressions so only new crossings fail.

### Kotlin: Detekt (`config/detekt/detekt.yml`, verified against Detekt 1.23.x / 2.0-alpha)

```yaml
complexity:
  LongMethod:
    active: true
    threshold: 50          # tune to repo 2-sigma
  LargeClass:
    active: true
    threshold: 400
  TooManyFunctions:
    active: true
    thresholdInClasses: 15
  CyclomaticComplexMethod:
    active: true
    threshold: 15
  CognitiveComplexMethod:
    active: true
    threshold: 15
  NestedBlockDepth:
    active: true
    threshold: 4
  LongParameterList:
    active: true
    functionThreshold: 6
    constructorThreshold: 7

style:
  MagicNumber:
    active: true
    ignoreNumbers: ['-1', '0', '1', '2']
  MaxLineLength:
    active: true
    maxLineLength: 120
  ForbiddenImport:
    active: true
    imports:
      - value: 'java.util.Vector'
        reason: 'Use ArrayList or Kotlin collections.'

coroutines:
  GlobalCoroutineUsage:
    active: true
  SuspendFunWithFlowReturnType:
    active: true

exceptions:
  SwallowedException:
    active: true
  TooGenericExceptionCaught:
    active: true
```

For `@Suppress` hygiene: forbid bare `@Suppress` without a reason comment via a custom Detekt `ForbiddenComment` / regex rule or review gate, and run Spotless or `ktlintCheck` for formatting.

### Java: Checkstyle (verified against Checkstyle 14.x) + Error Prone / NullAway

- **Checkstyle modules (`config/checkstyle/checkstyle.xml`):** `FileLength` (`max` tuned to 2-sigma, default 2000), `MethodLength` (`max` default 150, tune to ~60), `ParameterNumber` (`max` 6), `CyclomaticComplexity` (`max` 15), `NestedIfDepth` (`max` 3), `MagicNumber`, `AvoidStarImport`, `SuppressionCommentFilter` requiring an issue reference.
- **Error Prone + NullAway (0.14+ with JSpecify `@NullMarked`):** compile-time nullability and bug checking on Java builds.

### Plant-a-violation verification (red then green)

| Family | Plant | Expected failure |
|---|---|---|
| Size / complexity | a 65-line method in Kotlin or Java | Detekt `LongMethod` / Checkstyle `MethodLength` |
| Coroutine hazard | `GlobalScope.launch {}` in Kotlin | Detekt `GlobalCoroutineUsage` |
| Swallowed exception | `catch (e: Exception) {}` | Detekt `SwallowedException` / `TooGenericExceptionCaught` |
| Wildcard import | `import java.util.*` | Checkstyle `AvoidStarImport` / ktlint `no-wildcard-imports` |

## Layouts (RECOMMENDATION)

Basis: Gradle "Structuring Software Projects" user guide, Spring Modulith / package-by-feature conventions.

- **Package by feature (`com.example.app.orders`, `com.example.app.billing`), not by layer (`controllers`, `services`, `repositories`):** keep a feature's controller/resource, service, domain model, and repository package-private (`internal` in Kotlin when split into Gradle modules) so other features can only call its public facade.
- **Framework branch:**
  - **Spring Boot:** constructor injection (no `@Autowired` on fields), `@ConfigurationProperties` records, `*Controller` for REST adapters.
  - **Quarkus:** `@ApplicationScoped` over `@Singleton` when proxying is needed, `*Resource` for JAX-RS adapters, never block on the event loop inside `Uni`/`Multi` pipelines.
- **When overkill (KISS):** keep a single Gradle module with feature packages until build times or strict compile-time boundary enforcement justify splitting into multiple Gradle subprojects.

## Judgement seeds for `CODING_STANDARDS.md`

- Model mutually exclusive domain and UI outcomes as `sealed interface` hierarchies rather than classes with multiple nullable fields and boolean flags.
- Controllers/resources validate input and map HTTP status codes; transaction boundaries and business rules live in the service or domain layer.
- Cross-feature communication passes IDs (`OrderId`) or domain events, never another feature's JPA/Panache/Exposed entity.
