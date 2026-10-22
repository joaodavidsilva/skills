# TypeScript and JavaScript modern baseline

Training data holds older habits. Each row below names the current form, the version it arrived in (`since`), and what it replaces. Before using a row, compare `since` with the project's TypeScript version (`typescript` in `package.json`, resolved in the lockfile), Node version (`engines`, `devEngines`, `.nvmrc`) and ESLint version. Use a row only when the project meets it; when the project is older, tell the user the gap and the upgrade it implies. Verified 2026-10 against release notes, `tsc --help --all` and Node docs; confirm a row with the vendor docs when the manifest shows a newer major.

## tsconfig

| Write | Since | Replaces |
|---|---|---|
| `"module": "nodenext"` for Node output; `"module": "preserve"` with `"moduleResolution": "bundler"` for bundled apps | TS 4.7 / 5.4 (`bundler` 5.0) | `moduleResolution: node`, `module: commonjs` |
| `"types": ["node"]` (list the globals the project uses) | `types` default `[]` in TS 6 | relying on automatic `@types/*` inclusion |
| `"rootDir": "./src"` with `outDir` | required in TS 6 and 7 (TS5011) | inferred common source directory |
| `"lib": ["esnext"]` in Node projects | any | the default `lib`, which includes DOM |
| `paths` values relative to the tsconfig (`"@/*": ["./src/*"]`) | TS 4.1; `baseUrl` is an error in TS 7 | `baseUrl` plus `paths` |
| `#/*` subpath imports in `package.json` `imports` | TS 6 with `nodenext` or `bundler` | long relative chains, `paths` in Node packages |
| `${configDir}` in shared base configs | TS 5.5 | per-package copies of paths |
| `verbatimModuleSyntax` | TS 5.0 | `importsNotUsedAsValues`, `preserveValueImports` (unknown options in TS 7) |
| `erasableSyntaxOnly` | TS 5.8 | enums, runtime namespaces, parameter properties |
| `rewriteRelativeImportExtensions` with `./x.ts` imports | TS 5.7 | `./x.js` specifiers for `.ts` sources |
| `isolatedDeclarations` (libraries) | TS 5.5 | implicit export types |
| `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` | TS 4.1 / 4.4 | `tsc --init` of TS 5.9 and later sets both; leaving them off |

`strict` is on by default from TS 6 (flag introduced 2.3); `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` stay outside it. The generated config is minimal since TS 5.9: add options deliberately instead of pasting a long commented template.

## TypeScript 7 and later

TS 7 turns the TS 6 deprecations into errors, and `ignoreDeprecations: "6.0"` does not restore them. Replace each before moving a project to TS 7:

| Removed or changed | Write instead |
|---|---|
| `target: es5`, `downlevelIteration`, `outFile`, `module: amd/umd/system/none` | a modern `target` (default is `es2025`), a bundler for bundles |
| `moduleResolution: node` / `node10` | `nodenext` or `bundler` |
| `baseUrl` | `paths` relative to the tsconfig |
| `esModuleInterop: false`, `allowSyntheticDefaultImports: false` | omit both (always on) |
| `import ... assert { type: "json" }` (error from TS 6) | `import ... with { type: "json" }` |
| `tsc foo.ts` beside a tsconfig (TS5112) | `tsc --ignoreConfig foo.ts`, or a tsconfig `include` |
| `typescript` imported as a library for tooling | the TS 6 alias recipe in `CHECKS.md` (TS 7 has no programmatic API) |

New defaults in TS 7: `strict` true, `types` `[]`, `rootDir` the tsconfig directory, `noUncheckedSideEffectImports` true, `libReplacement` false. Run the compiler as `tsc` from the `typescript` package; the `tsgo` binary of `@typescript/native-preview` is frozen. Features announced for a later release (`es2026` target and lib, a `type` import attribute, source phase imports) stay unused until the project's compiler ships them.

## Language features

| Write | Since | Replaces |
|---|---|---|
| `satisfies` | TS 4.9 | `as` casts and widening annotations on config objects |
| `accessor` fields | TS 4.9 | hand-written getter and setter pairs |
| `<const T>` type parameters | TS 5.0 | callers writing `as const` |
| standard (TC39) decorators `(value, context)` | TS 5.0 | `experimentalDecorators` and `emitDecoratorMetadata` patterns |
| `using` / `await using` with `Symbol.dispose` | TS 5.2 | `try`/`finally` cleanup (check the runtime target) |
| `import x from "./d.json" with { type: "json" }` | TS 5.3 | `assert { ... }` |
| `NoInfer<T>` | TS 5.4 | extra overloads steering inference |
| `Object.groupBy`, `Map.groupBy` types | TS 5.4 | `reduce` groupings, lodash `groupBy` |
| inferred type predicates: `.filter((x) => x !== undefined)` narrows | TS 5.5 | manual `x is T` and `as T[]` after `.filter` |
| closure narrowing after the last assignment | TS 5.4 | needless `const` copies |
| `import defer * as ns from "x"` (namespace imports only) | TS 5.9 | eager loading; needs a bundler, Node does not parse it |
| `Map#getOrInsert`, `getOrInsertComputed`; `RegExp.escape`; `Promise.try`; Iterator and `Set` helpers in the `es2025` lib | TS 6.0 (lib typings) | `has`/`set` dances, hand-rolled escapes, `new Promise` wrappers; check runtime and browser target before use |
| `Temporal` types in the `esnext` lib | TS 6.0 | runtime support varies: browsers need a polyfill |
| `as const` object plus a union type | any | `enum` |
| plain classes with explicit fields | any | parameter properties, runtime `namespace`, `import x = require()` |

## Node runtime

| Write | Since | Replaces |
|---|---|---|
| `node file.ts` (type stripping) | default in Node 22.18 and 23.6; stable in 24.12 and 25.2 | `ts-node`, `--loader`, `--experimental-strip-types` |
| `node --env-file=.env` | Node 20.6 (stable 24.10) | `dotenv` |
| `node --watch` | stable in Node 22.0 and 20.13 | `nodemon` |
| `fs.rm(path, { recursive: true, force: true })`, `fs.mkdir(path, { recursive: true })` | long-standing | `rimraf`, `mkdirp` |
| `fs.glob` | stable in Node 24.0 | `glob`, `globby` |
| `util.styleText` | Node 20.12 | `chalk` |
| `util.parseArgs` | Node 18.3 | `minimist`, `yargs` for simple CLIs |
| `fetch` | Node 18 | `axios`, `node-fetch` |
| `crypto.randomUUID()` | Node 16.7 | `uuid` for v4 |
| `require(esm)` and ESM-only publishing | stable in Node 24.15, unflagged since 22.12 / 20.19 | dual CJS and ESM builds |

Type stripping rules: erasable syntax only (no enums, runtime namespaces, parameter properties, decorators); `.ts` extensions on relative imports; `import type` for types; no `.tsx`; Node ignores `tsconfig.json` (`paths`, `target`, `jsx` do nothing, package.json `imports` replaces `paths`); `--experimental-transform-types` was removed in Node 26. Set `erasableSyntaxOnly`, `verbatimModuleSyntax` and `rewriteRelativeImportExtensions` so `tsc --noEmit` catches what Node would reject. Use `tsx` when the project needs decorators, enums or `paths`. Pick the `engines.node` floor from the manifest, then confirm it against the tools in use (ESLint 10 and Vite 8 each state their own minimum).

## ESLint 10 and typescript-eslint

| Write | Since | Replaces |
|---|---|---|
| `eslint.config.mjs` flat config, nothing else | ESLint 10 (the only mode) | `.eslintrc.*`, `extends: ["plugin:..."]`, `env:` blocks, `/* eslint-env */` comments (an error in ESLint 10) |
| `defineConfig` from `eslint/config`, with `extends` | current | `tseslint.config(...)` helper |
| the single `typescript-eslint` package | current | separate `@typescript-eslint/parser` plus `@typescript-eslint/eslint-plugin` |
| `parserOptions.projectService: true` with the `*TypeChecked` presets (`recommendedTypeChecked`, `strictTypeChecked`, `stylisticTypeChecked`) | current | `parserOptions.project` and `tsconfigRootDir` |
| core `no-restricted-imports` with `allowTypeImports` | current | `@typescript-eslint/no-restricted-imports` (deprecated) |
| `// @ts-expect-error: reason` | current | `// @ts-ignore` (reported by the `recommended` presets; `ts-expect-error` needs a description, minimum 3 characters in `recommended`, 10 in `strict`) |
| `linterOptions.reportUnusedDisableDirectives: "error"` | current (default `"warn"`) | stale disable comments left in place |
| `react-hooks` plugin `recommended` preset | eslint-plugin-react-hooks 7 | v4 and v5 era config with only `rules-of-hooks` and `exhaustive-deps` (v7 adds the compiler rules `purity`, `refs`, `set-state-in-effect`, `immutability`, `static-components`) |
| `eslint-plugin-import-x`, `@eslint-react/eslint-plugin` | peer ranges list ESLint 10 | `eslint-plugin-import`, `eslint-plugin-react`, `eslint-plugin-jsx-a11y` (peer ranges stop at ESLint 9; read `npm view <pkg> peerDependencies`) |
| `@stylistic` plugin, Prettier, Oxfmt (beta) or the Biome formatter | current | `eslint-plugin-prettier` and ESLint core formatting rules |
| `@e18e/eslint-plugin` `ban-dependencies` | current | hand-maintained lists of banned packages |

## Packaging

| Write | Since | Replaces |
|---|---|---|
| `devEngines.packageManager` and `devEngines.runtime` | npm `devEngines`; pnpm 11 (`runtime` 10.14) | Corepack and the `packageManager` field (Corepack ships with Node up to 24, not from 25) |
| settings in `pnpm-workspace.yaml` | current pnpm | the `pnpm` key in `package.json` |
| an explicit script allowlist (`allowBuilds` in pnpm, `npm approve-scripts` in npm) | pnpm 10 and npm 12 block install scripts | assuming dependency postinstall scripts run |
| `vitest` or `node:test` | Vitest 5, Node `node:test` stable | `jest` where ESM matters (Jest ESM is still experimental) |
| Vite `build.rolldownOptions` | Vite 8 | `build.rollupOptions`, `esbuild` options (auto-converted, deprecated) |
