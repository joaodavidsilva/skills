# Mechanical checks for TypeScript and JavaScript

A tool-neutral rule set: each check has an id, and each stack maps the id to its own rule. Names below were verified against vendor docs, package sources and `tsc --help --all` in 2026-10. When the manifest shows a newer major of a tool, confirm a name with the tool's own listing (`oxlint --rules`, the typescript-eslint rules page, `tsc --help --all`) before writing it into config.

## Measure first

Limits come from the repo. Measure, then derive.

1. File lines: `git ls-files` for the source extensions, minus generated code, vendored code, snapshots, fixtures and lockfiles; `wc -l` over the list. Compute mean and standard deviation. Outliers: lines above mean + 2 sigma.
2. Function lines: run the repo's linter once with a temporary config holding only the function-length rule at `max: 1` (see `size-function`) and JSON output. Each message carries the function's line count. Compute the same statistics.
3. Derived limit: mean + 2 sigma, rounded up to a multiple of 50 (files) or 10 (functions). Show it beside its convention anchor below.
4. Baseline: every existing outlier goes into a `files` override in the linter config (listed by path, with the limit it keeps). The check then flags only new crossings, so a file that is large today stays out of scope until the change grows it past its own recorded size. Shrink the baseline as outliers get split.

Convention anchors (tool defaults and published conventions, not laws; no source ties any of them to defect rates):

| Measure | ESLint default | Sonar (SonarJS source) | Biome |
|---|---|---|---|
| File lines | 300 | 1000 | `maxLines` 300 |
| Function lines | 50 | 200 | `maxLines` 50 |
| Cyclomatic complexity | 20 | 10 | none |
| Cognitive complexity | none | 15 | 15 |
| Nesting depth | 4 | 3 | none |
| Parameters | 3 | 7 | 4 |

Fowler's intention test beats any length limit: a limit is a prompt to look, so cognitive complexity and nesting hold at the anchors above while lengths take the repo-derived value.

## Compiler flags (all stacks)

Set in `tsconfig.json`; the compiler proves these, so no lint rule duplicates them.

| Flag | Proves | Note |
|---|---|---|
| `strict` | null safety, implicit `any`, `unknown` in catch | state it even though TS 6 and 7 default it on |
| `noUncheckedIndexedAccess` | indexed reads may be `undefined` | not part of `strict` |
| `exactOptionalPropertyTypes` | missing differs from `undefined` | not part of `strict`; team decision, friction with some libraries |
| `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch` | override marked, every path returns, switch cases end | |
| `noPropertyAccessFromIndexSignature` | bracket access for index signatures | |
| `allowUnreachableCode: false`, `allowUnusedLabels: false` | dead code is an error | |
| `noUnusedLocals`, `noUnusedParameters` | unused symbols | give one owner: these flags or the lint rule `no-unused-vars` |
| `verbatimModuleSyntax` | type imports marked `type` and preserved | with `module: nodenext` set `"type": "module"` in `package.json` (TS1295 otherwise) |
| `erasableSyntaxOnly` | no enum, runtime namespace, parameter property, `import =`, `export =` (TS1294) | required for Node type stripping; a house-style choice elsewhere |
| `noUncheckedSideEffectImports` | typo in `import "./x"` fails | default on in TS 6 and 7 |
| `rewriteRelativeImportExtensions` | write `./x.ts` imports, emit `.js` | Node and `nodenext` projects |
| `isolatedDeclarations` | explicit types on exports | libraries and monorepo packages |
| `types`, `rootDir`, `lib` | explicit globals, output layout, no DOM in Node code | TS 6 and 7 default `types` to `[]` and `rootDir` to the tsconfig directory (error TS5011 without it); the default `lib` includes DOM, so Node projects set `"lib": ["esnext"]` |
| `module` / `moduleResolution` | `nodenext` for Node output; `preserve` with `bundler` for bundled apps | a mismatch with the real runtime is the commonest "passes tsc, fails at runtime" |

## Rule set

Cells name the exact rule; `none` marks a gap to report to the user at step 3. ESLint names use flat-config keys. Oxlint names are as `oxlint --rules` lists them.

### Size and complexity

| Id | ESLint | Oxlint | Biome |
|---|---|---|---|
| `size-file` | `max-lines` (`max`, `skipBlankLines`, `skipComments`) | `eslint/max-lines` | `style/noExcessiveLinesPerFile` (`maxLines`, `skipBlankLines`) |
| `size-function` | `max-lines-per-function` (`max`, `skipBlankLines`, `skipComments`, `IIFEs`) | `eslint/max-lines-per-function` | `complexity/noExcessiveLinesPerFunction` (`maxLines`, `skipBlankLines`, `skipIifes`) |
| `complexity-cognitive` | `sonarjs/cognitive-complexity` | none native (`eslint-plugin-sonarjs` as JS plugin) | `complexity/noExcessiveCognitiveComplexity` (`maxAllowedComplexity`) |
| `complexity-cyclomatic` | `complexity` (`max`, `variant`) | `eslint/complexity` | none |
| `nesting` | `max-depth`; `sonarjs/nested-control-flow` | `eslint/max-depth` | none (`nursery/noExcessiveNestedCallbacks` covers callbacks only) |
| `params` | `max-params` | `eslint/max-params` | `complexity/useMaxParams` (`max`) |

### Boundaries and barrels

| Id | ESLint | Oxlint | Biome |
|---|---|---|---|
| `entry-only` (outside code imports a feature only through its entry) | `no-restricted-imports` with `patterns` and `group` such as `@/features/*/*` (static imports only) | `eslint/no-restricted-imports` | `style/noRestrictedImports` (`patterns`; also covers dynamic `import()` and `require()`) |
| `layer-direction` (shared, then features, then app; no sibling-feature imports) | `import-x/no-restricted-paths` (zones `{ target, from, except }`; option shape for `import-x` assumed equal to `import/`) or `boundaries/dependencies` (`default: 'disallow'`) | none native; use dependency-cruiser | `correctness/noPrivateImports` (`@package` / `@private` JSDoc); dependency-cruiser for layers |
| `no-cycles` | `import-x/no-cycle` | `import/no-cycle` | `suspicious/noImportCycles` |
| `no-export-star` | `no-restricted-syntax` with selector `ExportAllDeclaration` (standard ESTree node; the red run proves it fires) | none native (`oxc/no-barrel-file` fires only past a module-count threshold, so it does not ban `export *`); run the ESLint rule through `eslint-plugin-oxlint` | `performance/noReExportAll` |
| `no-folder-barrels` | filesystem fitness function (below); `barrel-files/avoid-barrel-files` as a lint alternative (plugin unmaintained since 2025-02, check its ESLint peer range) | filesystem fitness function | filesystem fitness function; `performance/noBarrelFile` flags every re-export-only file including the per-feature entry, so it needs an `overrides` entry for `features/*/index.ts` |
| `no-default-export` (framework route files excepted by override) | `import-x/no-default-export` | `import/no-default-export` | `style/noDefaultExport` |
| `dead-code` | `knip` (files, exports, dependencies) | `knip` | `knip` |
| `banned-deps` | `@e18e/ban-dependencies` | JS plugin (`@e18e/eslint-plugin`) | `nursery/noRestrictedDependencies` |

Filesystem fitness function (tool-neutral, for `no-folder-barrels`): a script that fails when `git ls-files` lists an `index.ts`, `index.tsx` or `index.js` outside the allowed entry globs (`src/features/*/index.ts`, plus the framework's own entries). Per-feature isolation through dependency-cruiser: a `forbidden` rule whose `from.path` captures the feature name and whose `to` excludes that same capture (see its rules reference for capture-group syntax; not exercised in research, so the red run decides).

### Suppression hygiene and unsafe types

| Id | ESLint | Oxlint | Biome |
|---|---|---|---|
| `suppression-reason` | `@eslint-community/eslint-comments/require-description` | none native; `eslint-plugin-oxlint` plus ESLint for this rule | `// biome-ignore lint/group/rule: <explanation>` is required syntax |
| `suppression-scope` | `@eslint-community/eslint-comments/no-unlimited-disable`, `disable-enable-pair`, `no-restricted-disable` | `unicorn/no-abusive-eslint-disable` | the comment must name its rule |
| `suppression-unused` | `linterOptions.reportUnusedDisableDirectives: "error"` (default `"warn"`) | CLI `--report-unused-disable-directives` | `suppression/unused` diagnostic (behaviour for line comments unverified) |
| `ts-comment` | `@typescript-eslint/ban-ts-comment` with `'ts-expect-error': 'allow-with-description'` and `minimumDescriptionLength`; `ts-ignore` and `ts-nocheck` stay banned (in `recommended` and `strict`) | `typescript/ban-ts-comment` | `suspicious/noTsIgnore` bans `@ts-ignore` only: gap for the description requirement |
| `no-any` | `@typescript-eslint/no-explicit-any`; typed `no-unsafe-argument`, `no-unsafe-assignment`, `no-unsafe-call`, `no-unsafe-member-access`, `no-unsafe-return` | `typescript/no-explicit-any`; type-aware `typescript/no-unsafe-*` | `suspicious/noExplicitAny`, `suspicious/noImplicitAnyLet`; no `no-unsafe-*` family |
| `no-non-null` | `@typescript-eslint/no-non-null-assertion` (in `strict`) | `typescript/no-non-null-assertion` | `style/noNonNullAssertion` |
| `unsafe-assertion` | `@typescript-eslint/no-unsafe-type-assertion` (outside the recommended presets) | `typescript/no-unsafe-type-assertion` | none |
| `promises` | `@typescript-eslint/no-floating-promises`, `no-misused-promises`, `await-thenable` | `typescript/no-floating-promises`, `typescript/no-misused-promises` | `nursery/noFloatingPromises`, `nursery/noMisusedPromises`, `nursery/useAwaitThenable` |
| `eval` | `no-eval`, `no-implied-eval` | `eslint/no-eval`, `eslint/no-implied-eval` | `security/noGlobalEval`, `nursery/noImpliedEval` |
| `html-injection` | `no-unsanitized/method`, `no-unsanitized/property`; with React `@eslint-react/no-dangerously-set-innerhtml` | `react/no-danger` (no `no-unsanitized`) | `security/noDangerouslySetInnerHtml` |

The `strict-type-checked` preset (flat-config key `tseslint.configs.strictTypeChecked`) already carries most typescript-eslint rows above; the red run confirms each one fires.

### React and accessibility (when React is present)

| Id | ESLint | Oxlint | Biome |
|---|---|---|---|
| `hooks` | `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`, plus the compiler rules in the plugin's `recommended` preset | `react/rules-of-hooks`, `react/exhaustive-deps`; compiler-backed `react/purity`, `react/refs`, `react/immutability` | `correctness/useHookAtTopLevel`, `correctness/useExhaustiveDependencies` |
| `a11y` | `jsx-a11y/*` (the plugin's peer range stops at ESLint 9: check `npm view eslint-plugin-jsx-a11y peerDependencies`) | native `jsx_a11y` plugin (config prefix unverified: expect `jsx-a11y/...`) | `a11y/*` (`useAltText`, `useKeyWithClickEvents`, `noLabelWithoutControl`, `useValidAnchor`, `noAutofocus`) |
| `leaked-render` | `@eslint-react/no-leaked-conditional-rendering` or `react/jsx-no-leaked-render` | none | `suspicious/noLeakedRender` |

`eslint-plugin-react` and `eslint-plugin-import` also stop at ESLint 9 in their peer ranges: use `@eslint-react/eslint-plugin` and `eslint-plugin-import-x` under ESLint 10, or the native Oxlint and Biome rules.

### Baseline lint for CSS, HTML and JS

Call the Skill tool with `platform-first`, then read its `reference/JS.md` section "Mechanical enforcement" and install the rules it lists (`css/use-baseline`, `@html-eslint/use-baseline`, `baseline-js/use-baseline`, `plugin/use-baseline` for Stylelint and the others named there). Set each plugin's `available` option to match the project's browser target. The check id is `baseline`.

## Stacks

Prefer the linter the repo already runs. With none, Stack B covers every row above natively. Stack A trades gaps for speed. Stack C trades gaps for a single binary.

### Stack B: ESLint 10 + typescript-eslint

Flat config only (`eslint.config.mjs`), `defineConfig` from `eslint/config`, one `typescript-eslint` package, typed rules through `projectService: true`.

```js
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    extends: [js.configs.recommended, tseslint.configs.strictTypeChecked],
    languageOptions: { parserOptions: { projectService: true } },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      "max-lines": ["error", { max: FILE_LIMIT, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: FUNCTION_LIMIT, skipBlankLines: true, skipComments: true }],
      "no-restricted-syntax": ["error", { selector: "ExportAllDeclaration", message: "Name each export explicitly." }],
      // plus: complexity, max-depth, no-restricted-imports, the eslint-comments and boundary rules
    },
  },
  // one { files: [...outlier paths], rules: { "max-lines": [...] } } entry per baseline outlier
]);
```

Register each extra plugin under its package name per its README. Before installing a plugin, read its `peerDependencies` for ESLint 10 support.

### Stack A: Oxlint + tsgolint

`oxlint` with `oxlint-tsgolint` for typed rules (type-aware linting sits outside Oxlint's semver promise; most typescript-eslint typed rules are ported). Root config sets `options.typeAware` and `options.typeCheck`. tsgolint needs TypeScript 7: it rejects `baseUrl`, so list globals in `types` (`node`, `vitest/globals`) and set `rootDir`. Run the gap rules (`suppression-reason`, `no-export-star`, `no-unsanitized`, `boundaries`, `no-restricted-syntax`) in ESLint 10 through `eslint-plugin-oxlint`, which turns off whatever Oxlint already covers. Oxlint ships no `eslint-comments`, no `no-restricted-syntax`, no baseline or compat rule. Config in `.oxlintrc.json`; `oxlint.config.ts` is experimental.

### Stack C: Biome

One binary, `biome.json`. Gaps to report: no `max-statements`, cyclomatic, block-depth or `no-restricted-syntax` rules; the floating-promise rules sit in `nursery`; `ts-expect-error` description unchecked; no ESLint plugin loading, so a custom rule means a GritQL plugin (`plugins` in `biome.json`). `performance/noBarrelFile` needs the per-feature entry override noted in the table.

### TypeScript 7 and typescript-eslint

Read the `typescript` major from the manifest. TypeScript 7 and later ships no JS compiler API (only `./unstable/*`), so any tool that imports `typescript` (typescript-eslint, Vue, Svelte, Astro, MDX and Angular tooling) fails on it. Check whether the installed typescript-eslint has caught up: `npm view typescript-eslint peerDependencies`. While its `typescript` range stops below 7, run both compilers with the official aliases:

```json
{
  "devDependencies": {
    "@typescript/native": "npm:typescript@^7.0.2",
    "typescript": "npm:@typescript/typescript6@^6.0.2"
  }
}
```

`npx tsc` then runs TS 7; `tsc6` and `import "typescript"` stay on 6.x. This recipe comes from the TS 7 announcement and was not executed end to end in research: after installing, confirm `npx tsc --version` and `npx tsc6 --version`, and let the typed-rule plants in the red run prove typed linting works. Without this setup the failure looks like `Cannot read properties of undefined (reading 'Cjs')`.

## Plant a violation

Create one scratch directory inside lint scope (for example `src/__red__/`), fill it with the plants for the rules installed, run the check command, expect a nonzero exit and every rule id in the output, then delete the directory and expect exit 0. Plants inside a feature need the path the boundary rule watches.

| Id | Plant |
|---|---|
| `size-file`, `size-function` | a file, then a function, with the limit plus one non-blank lines (generate with a shell loop) |
| `no-export-star` | `export * from "./other";` |
| `no-folder-barrels` | `index.ts` outside the allowed entry globs |
| `entry-only`, `layer-direction` | an import of `@/features/a/ui/Inner` from `features/b/` |
| `suppression-reason`, `suppression-scope` | `// eslint-disable-next-line` over a real violation, no rule name, no description |
| `suppression-unused` | a disable comment above a line that has no violation |
| `ts-comment` | `// @ts-expect-error` with no description; `// @ts-ignore` |
| `no-any`, `no-non-null` | `const a: any = 1;` and `maybe!.value` |
| `promises` | `async function f() { fetch("/x"); }` |
| compiler flags | `const xs: number[] = []; const n: number = xs[0];` (fails under `noUncheckedIndexedAccess`); an `enum` (TS1294 under `erasableSyntaxOnly`) |
| `a11y`, `hooks` | `<img src="/x" />`, `<div onClick={go} />`, a hook called inside an `if` |
| `baseline` | one CSS property or JS API from outside the project's target level, picked from the tiers in `platform-first`'s `reference/CSS.md` or `reference/JS.md` |

A rule whose plant stays green is misconfigured or a gap: fix it or report it as a gap. Report the command, the red exit status with the rule ids printed, and the green exit status.
