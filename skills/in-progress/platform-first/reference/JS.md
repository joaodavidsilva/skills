# JS syntax and built-in APIs

Tiers are Baseline: **Widely**, **Newly**, **Limited**. Status was verified 2026-10 against the web-features data. Tiers move over time, so re-check a feature on MDN or web.dev before relying on a row, then compare it with the project target recorded in `SKILL.md` step 1. Baseline covers browsers only: for Node, Deno, and Bun code read `engines` and the runtime docs.

## Replace the habit

| Need | Outdated habit | Built-in | Tier | Gotcha |
|---|---|---|---|---|
| Deep clone | `JSON.parse(JSON.stringify(x))`, lodash `cloneDeep` | `structuredClone(x)` | Widely | Throws `DataCloneError` on functions and DOM nodes; class instances come back as plain objects |
| Sort, reverse, splice, replace without mutating | `[...a].sort()`, `a.slice().reverse()` | `toSorted()`, `toReversed()`, `toSpliced()`, `with()` | Widely | Holes become `undefined`. Mutating `sort()` or `reverse()` on React or Redux state is a bug |
| Last element | `a[a.length - 1]` | `a.at(-1)` | Widely | None |
| Own-property check | `obj.hasOwnProperty(k)`, `Object.prototype.hasOwnProperty.call` | `Object.hasOwn(obj, k)` | Widely | None |
| Group by key | `reduce` into an object, lodash `groupBy` | `Object.groupBy`, `Map.groupBy` | Widely | `Object.groupBy` returns a null-prototype object (no `hasOwnProperty`, `toString` surprises) and coerces keys to strings: use `Map.groupBy` for object keys |
| Deferred promise | `let resolve; new Promise(r => resolve = r)` | `Promise.withResolvers()` | Widely | None |
| Collect an async iterable | `for await` with push | `Array.fromAsync()` | Widely | Sequential, not concurrent |
| Set algebra | `new Set([...a].filter(x => b.has(x)))` | `a.union(b)`, `intersection`, `difference`, `symmetricDifference`, `isSubsetOf`, `isSupersetOf`, `isDisjointFrom` | Newly | The argument must be set-like (`size`, `has`, `keys`); an Array throws `TypeError`, so wrap it in `new Set()` |
| Lazy pipelines | `Array.from(it).map().filter()` | Iterator helpers: `it.map().filter().take(n).toArray()` | Newly | Exist on iterator objects (`arr.values()`, `map.entries()`, generators), not on arrays. Use `Iterator.from(x)` |
| Run a function that may throw or return a promise | `new Promise(r => r(fn()))` wrappers | `Promise.try(fn)` | Newly | None |
| Escape text for a RegExp | hand-written replace | `RegExp.escape()` | Newly | None |
| Cancel after a delay | `setTimeout(() => ctl.abort(), ms)` | `AbortSignal.timeout(ms)`, `AbortSignal.any([...])` | `timeout` Newly (its Widely date had passed but the data had not refreshed at verification), `any` Widely | Aborts with `TimeoutError`, not `AbortError` |
| Validate a URL string | `try { new URL(s) } catch` | `URL.canParse(s)` | Widely | None |
| Random id | `uuid` package, `Math.random().toString(36)` | `crypto.randomUUID()` | Widely | Secure contexts only in browsers (HTTPS or localhost): undefined on plain-http LAN origins |
| Cross-tab mutual exclusion | localStorage lock tricks | `navigator.locks.request()` | Widely | None |
| Split text into characters or words | `[...str]`, `split('')`, regex | `Intl.Segmenter` | Newly (data lag noted above) | None |
| Format lists, relative times, plurals | hand-built strings | `Intl.ListFormat`, `Intl.RelativeTimeFormat`, `Intl.PluralRules` | Widely | None |
| Import JSON | `fetch` then parse, `require('./x.json')` | `import x from './x.json' with { type: 'json' }` | Newly | The old `assert { type: "json" }` syntax was removed from Chrome and Node: write `with` |
| Client-side routing plumbing | click interception, `history.pushState`, `popstate` | Navigation API | Newly | Feature-detect `window.navigation` |
| URL route matching | path-to-regexp | `URLPattern` | Newly | None |
| Top-level `await` | async IIFE wrapper | `await` at module top level | Newly | ES modules only, not CommonJS. Safari support was partial until recently |
| Read a stream body | manual `getReader()` loop | `for await (const c of readableStream)` | Newly | Needs the newest Safari: use `getReader()` where the target is older |

## Not available everywhere

| Feature | Gap found | Safe pattern |
|---|---|---|
| Temporal | No stable Safari. Native in current Node | Browser code: `temporal-polyfill`, or a small `Date` helper where the polyfill's size outweighs the need |
| `using`, `await using`, `DisposableStack` | No Safari | Transpile plus polyfill for browsers, or plain `try/finally` |
| `Iterator.zip`, `Iterator#join`, `Iterator#includes` | No Safari | Write by hand in shared code |
| `Error.isError` | No Safari | `e instanceof Error` when cross-realm errors are irrelevant |
| `ReadableStream.from()` | No Chrome | Build the stream manually |
| `fetch` upload streaming (`duplex: "half"`) | Chrome only | Buffer the body |
| `scheduler.yield()`, `scheduler.postTask()`, `requestIdleCallback` | No Safari | Feature-detect (`'scheduler' in globalThis`), fall back to `setTimeout` |
| HTML Sanitizer API (`setHTML`) | No Safari | Keep DOMPurify |
| `import defer` | Not shipped | Do not use |

## Dependencies the platform covers

Skip adding or keep removing these when the built-in meets the target:

| Package | Built-in |
|---|---|
| moment, dayjs, date-fns for core date math | `Intl` formatters; Temporal where its tier meets the target |
| lodash `cloneDeep`, `groupBy` | `structuredClone`, `Object.groupBy` |
| axios | `fetch` |
| uuid | `crypto.randomUUID()` (secure contexts) |
| classnames | template literals, `filter(Boolean).join(' ')` |
| core-js and `@babel/preset-env` `useBuiltIns: 'usage'` for Widely features | nothing: Widely features need no polyfill |

Write ES modules (`import` and `export`): top-level `await` and `import ... with` require them.

## Mechanical enforcement

When the repo has ESLint or Stylelint, use these rules instead of review comments. Rule names as verified 2026-10:

- `css/use-baseline` (`@eslint/css`, `available`: `"widely"`, `"newly"`, or a year)
- `@html-eslint/use-baseline` (`available`: `"widely"`, `"newly"`, or a year)
- `baseline-js/use-baseline` (`eslint-plugin-baseline-js`, pre-1.0; flags static members such as `Promise.try` and `RegExp.escape`, not instance methods such as `Set#union`, without the `recommended-ts` preset)
- `plugin/use-baseline` (Stylelint, `stylelint-plugin-use-baseline`)
- `unicorn/no-array-sort` (use `toSorted`)
- `unicorn/prefer-structured-clone`
- `require-unicode-regexp` with `{ "requireFlag": "v" }`

These lint plugins read their own `available` option, not browserslist: set it to the same level as the project target (`"widely"` for `baseline widely available`, `"newly"` for `baseline newly available`, a year for `baseline <year>`). They cannot pin a date.

Other `eslint-plugin-unicorn` modernization rules (`prefer-promise-try`, `prefer-regexp-escape`, `prefer-iterator-helpers`) ignore Baseline: enable one only when its feature meets the target. `eslint-plugin-compat` checks JS APIs against browserslist and does not cover CSS or HTML.
