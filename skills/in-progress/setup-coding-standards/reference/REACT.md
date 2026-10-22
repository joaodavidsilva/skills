# React, Next.js, and React Native baseline and checks

Training data defaults to React 17/18 patterns (`forwardRef`, `useContext`, `useEffect` for derived state, monolithic components with boolean mode props, and legacy React Native components). Inspect `package.json` (`react`, `next`, `expo`, `react-native`), `tsconfig.json`, `next.config.*`, and `app.json` (`experiments.reactCompiler`) before applying any row below. Verified 2026-10 against React 19, `eslint-plugin-react-hooks` v7, Next.js 16, and Expo SDK 53 to 58 docs.

## React 19 and compiler baseline

| Write | Since | Replaces |
|---|---|---|
| `function Input({ ref, ...props }: Props & { ref?: React.Ref<HTMLInputElement> })` | React 19 | `forwardRef((props, ref) => ...)` wrapper |
| `const value = use(MyContext)` | React 19 | `useContext(MyContext)` (`use` also works conditionally after early returns) |
| `<MyContext value={v}>` | React 19 | `<MyContext.Provider value={v}>` |
| `<Activity mode={isOpen ? "visible" : "hidden"}>` | React 19.2 | unmounting expensive subtrees or keeping hidden CSS hacks that still run effects |
| `useActionState(action, initialState)` and `<form action={formAction}>` | React 19 | manual `isLoading` / `error` `useState` pairs on form submit |
| `useEffectEvent(callback)` for reading latest props/state inside an effect without re-triggering it | React 19.2 | mutating a `handlerRef.current` inside an effect or omitting dependencies |
| Plain expressions and functions when React Compiler (`babel-plugin-react-compiler` / `experiments.reactCompiler`) is enabled | React 19 + Compiler | manual `useMemo`, `useCallback`, and `React.memo` boilerplate (keep manual memoization only when the compiler is off and profiling proves the cost) |
| `count > 0 ? <Badge>{count}</Badge> : null` | any | `{count && <Badge>{count}</Badge>}` (renders `"0"` in React DOM and crashes React Native outside `<Text>`) |

## Outdated habits and effect misuse

- **Deriving state inside `useEffect`:** never store a value in `useState` and sync it in `useEffect` when it can be computed during render (`const fullName = `${first} ${last}``). Caught mechanically by `eslint-plugin-react-hooks` v7 (`set-state-in-effect`).
- **Running user-action side effects via state + `useEffect`:** if a POST request or toast happens because the user clicked Submit, run it inside the click/submit handler, not in an effect watching `submitted`.
- **Subscribing to continuous state when only a boolean threshold matters:** match media queries in CSS (`@media`, `@container`) or subscribe to the boolean (`useMediaQuery("(max-width: 767px)")`), never `useWindowWidth()`.
- **Defining a component inside another component's body:** remounts the child on every render and destroys state.
- **Using `useEffect` + `fetch` for application data:** use a server-cache library (TanStack Query, SWR) on the client or Server Components / route loaders on the server.

## Next.js App Router and RSC branch (apply only when `next` is in `package.json`)

- **Authenticate and validate inside every `"use server"` Server Action:** Server Actions are public HTTP endpoints; check session, authorization, and Zod/Valibot input schema inside the action itself, never relying on UI hiding or layout guards.
- **Note `proxy.ts` in Next.js 16+:** `middleware.ts` was renamed to `proxy.ts` in Next.js 16; check the repo's Next.js version before creating or editing either file.
- **Eliminate server waterfalls:** start independent fetches in parallel (`Promise.all`) or split awaits into sibling Server Components wrapped in `<Suspense>`.
- **Minimize RSC boundary serialization:** pass only the primitive fields a `"use client"` component actually reads (`<Profile name={user.name} />`), not the full 50-field ORM object, and do `.toSorted()` / `.filter()` in the client rather than sending duplicate transformed arrays across the boundary.
- **Deduplicate per-request non-fetch queries with `React.cache(fn)`** using primitive arguments (inline object arguments always miss `Object.is` equality), and schedule post-response logging/analytics with `after()` from `next/server`.

## React Native and Expo branch (apply only when `react-native` is in `package.json`)

- **Platform-first (native over JS):**
  - Navigation: `@react-navigation/native-stack` or Expo Router `<Stack>`, and native bottom tabs (`react-native-bottom-tabs` or Expo Router `NativeTabs`), never JS-simulated `@react-navigation/stack`.
  - Pressables and modals: `Pressable` over `TouchableOpacity` / `TouchableHighlight`; native `<Modal presentationStyle="formSheet">` or form-sheet routes over JS bottom-sheet libraries when standard sheets suffice.
  - Images and lists: `expo-image` over React Native `Image`; virtualized lists (`LegendList`, `FlashList`, or `FlatList`, matching what the repo already installs) over `ScrollView` + `.map()`.
- **Modern styling (RN 0.76+ / New Architecture):** use `gap` instead of child margin hacks, CSS `boxShadow` string instead of legacy shadow/elevation triplets, and `borderCurve: "continuous"` on rounded cards.
- **Animation and React Compiler compatibility:** animate only `transform` and `opacity` on the UI thread with Reanimated (`useDerivedValue` for derivations), and use `.get()` / `.set()` on shared values when React Compiler is enabled.
- **Security and routing:** validate deep-link params from `useLocalSearchParams()` with a schema before use, and store tokens in `expo-secure-store`, never `AsyncStorage`.

## Mechanical checks (add to `CHECKS.md` when React / RN is present)

- **`eslint-plugin-react-hooks` v7 `recommended` preset** (or Oxlint `react/*` / Biome `correctness/useHookAtTopLevel` + `useExhaustiveDependencies`): enforces `rules-of-hooks`, `exhaustive-deps`, `set-state-in-effect`, `purity`, `refs`, `immutability`, `static-components`.
- **`dotore check` (when `dotore` is installed on `$PATH`):** native Rust Effect and State dataflow analyzer catching derived state (`no-derived-state`), multi-effect render cascades (`no-chain-state-updates`), effect event handlers (`no-event-handler`), prop-change state adjustments and resets (`no-adjust-state-on-prop-change`, `no-reset-all-state-on-prop-change` with cross-file JSX caller sites), parent callback notifications (`no-pass-live-state-to-parent`, `no-pass-data-to-parent`), manual store subscriptions (`no-external-store-subscription`), mount state initialization (`no-initialize-state`), and effect fetches (`no-fetch-in-effect`). Pair with `dotore fix` for deterministic `autofix` rewrites and `/dotore` for `surgical` and `refactor` findings.
- **Leaked render ban:** `@eslint-react/no-leaked-conditional-rendering` (ESLint 10) or Biome `suspicious/noLeakedRender`.
- **Legacy API bans via core `no-restricted-imports`:**
  - React 19+: warn/error on `forwardRef` and `useContext` from `"react"` (instruct to use `ref` prop and `use()`).
  - React Native: ban `TouchableOpacity`, `TouchableHighlight`, and `Image` from `"react-native"` (instruct to use `Pressable` and `expo-image`), and ban `@react-navigation/stack`.

## Judgement seeds for `CODING_STANDARDS.md`

- **Explicit variants over boolean prop proliferation:** when a component accumulates 3 or more mode booleans (`isThread`, `isEditing`, `isDM`, `showFooter`), split it into explicit variant components (`ThreadComposer`, `EditComposer`) composed from shared compound subcomponents (`Composer.Frame`, `Composer.Input`, `Composer.Footer`).
- **Lift shared state into a provider contract:** when sibling components outside a visual frame need the same state or submit action, lift state into a provider exposing a `{ state, actions, meta }` context interface so UI components stay decoupled from whether state lives in `useState`, Zustand, or server sync.
- **Prefer `children` over `renderX` props** for composing static structure; reserve render props for passing per-item data back to the caller.
- **State location hierarchy:** keep state in local `useState` when one component reads it; lift to the nearest parent for a few children; use Context for low-frequency tree-wide values (theme, auth, compound-component internals); use a selector store (Zustand/Jotai) for high-frequency shared client state; use TanStack Query / SWR / RSC for server state (never copy server data into a client store).
