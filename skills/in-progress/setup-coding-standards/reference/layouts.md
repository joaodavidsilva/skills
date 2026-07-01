# Layouts per stack

Status: **RECOMMENDATION**, not a standard. The basis for each layout is named beside it (framework docs, bulletproof-react, Feature-Sliced Design, Bogard's vertical slices, Fowler's MonolithFirst). No source measured whether lint-enforced layouts improve agent output; the case rests on Cockburn's observation that layer lines decay without a mechanism that detects violations. A repo whose existing layout is coherent keeps it: map the folders onto this vocabulary and record that map.

Read framework versions from the manifest: layout conventions below move with majors (Next `proxy.ts`, Expo `src/app`, Nest ESM).

## Rules for every stack

1. Start flat. Open `features/<name>/` when the second feature appears. Keep folder nesting to three or four levels.
2. Group by feature, not by technical layer. A top-level `components/`, `hooks/`, `utils/`, `types/`, `services/` or `controllers/` folder is not the primary axis.
3. One explicit entry per feature: `features/<name>/index.ts` holding named re-exports only (`export { X } from "./ui/X"`, `export type { T } from "./model/types"`). No logic, no side effects, no default exports, no `export *`. A handful of exports; past roughly a dozen the feature is probably two features (a heuristic of this skill, not sourced).
4. No folder-level index barrels. Collections of unrelated items (`shared/ui`, `shared/lib`) have no collection index: import `shared/ui/button` directly. Workspace packages expose `package.json` `exports` subpaths, not one index.
5. Files inside a feature import each other by relative path to the specific file, never through the feature's own entry. Code outside imports only the entry.
6. Name folders by purpose (`ui`, `api`, `model`, `lib`, `config`), not by essence. Each `shared/lib/<name>` has one documented focus; there is no `utils/` or `helpers/` grab-bag.
7. Cross-feature references travel as ids. A feature stores another feature's id and resolves it through that feature's entry or in the composing layer (`app`, routes); it does not import the other feature's entities. Sibling features never import each other. `shared` never imports features; features never import `app`.
8. Adapters (HTTP handlers, route files, UI components, CLI commands) parse input, call a use case, and render or respond. Business rules live in pure modules (`model/`, `domain/`) that import no framework.
9. Default exports only where the framework demands them (Next `page.tsx` and `layout.tsx`, Expo route files, React Router route modules).
10. Size triggers are deltas: a file or function that this change pushes past the repo's limit gets split; an outlier already in the baseline stays out of scope (see `checks.md`, "Measure first").
11. Extract a shared helper at the third real call site or when it holds one documented piece of knowledge. A shared function that gains a boolean or conditional parameter to serve a new caller is inlined back and split (AHA, Sandi Metz).

Enforced by: rules 3 to 5 by `entry-only`, `no-export-star`, `no-folder-barrels`, `no-cycles`; rule 7 by `layer-direction`; rule 9 by `no-default-export` with overrides; rule 10 by the size checks; rules 1, 2, 6, 8 and 11 are review judgement.

## React SPA (Vite)

Basis: bulletproof-react structure and import direction, FSD segment naming and public-API rule, React FAQ (colocation, nesting limit), Vite performance guide (explicit imports).

```
src/
  main.tsx                    # mounts <App/>
  app/
    App.tsx  providers.tsx  router.tsx
    routes/ or pages/         # thin route components: compose features, hold no business rules
  features/
    <feature>/
      index.ts                # public entry: named re-exports only
      ui/  api/  model/  lib/ # create only the folders that have content
  shared/
    ui/<component>/           # per-component folder, imported directly
    lib/<focused-name>/       # date, http, format: one purpose each
    api/  config/  testing/
```

Direction: `shared`, then `features`, then `app`. Router style (file-based or a config such as `app/routes.ts`) is orthogonal. Overkill: fewer than three features. Keep `src/{components,hooks,lib}` flat with colocated tests.

## Next.js App Router

Basis: Next project-structure docs (any strategy, stay consistent, colocation is safe because a route is public only with `page` or `route`), Next data-security guide (data access layer, `server-only`), FSD's Next guide when FSD is adopted.

```
app/ (or src/app/)            # routing only: layout.tsx, page.tsx, route.ts, loading.tsx, error.tsx
  (marketing)/  (shop)/       # route groups; _components/ for single-route UI
proxy.ts  instrumentation.ts  next.config.ts     # root files
src/
  features/<feature>/         # ui/, actions.ts, model/, index.ts (index.server.ts when server-only code must stay out of client graphs)
  server/                     # data access layer: 'server-only', authorization, returns minimal DTOs, the only place reading process.env
  shared/ui  shared/lib
```

Pick one data-fetching approach for new code and keep it; start `'use client'` boundaries as low in the tree as the interaction allows (this skill's inference from the docs' server and client isolation guidance). Route files are thin and import from `features`. Since Next 16 the `middleware` file convention is `proxy.ts`: check the `next` major. Overkill: a small marketing or CRUD site, where `app/` plus `_components/` and a `lib/` folder suffices. FSD layers on top need renames (`_app`, `_pages`) and are rarely worth it.

## Expo / React Native (Expo Router)

Basis: Expo Router core-concepts and `src` directory docs.

```
src/
  app/                        # ROUTES ONLY: _layout.tsx, index.tsx, (tabs)/, [id].tsx
  features/<feature>/         # screens, components, hooks, api, model, index.ts
  components/                 # truly shared UI; platform variants as x.native.tsx and x.tsx
  hooks/  constants/
app.json  package.json  metro.config.js  tsconfig.json    # stay at the repo root
```

Every file under `src/app` becomes a route, so anything that is not a route lives outside it. `tsconfig` `paths`: `"@/*": ["./src/*"]` with no `baseUrl`. The `src/app` default arrives with Expo SDK 55; older projects keep `app/` at the root: check the `expo` version. Thin route files may re-export a screen (`export { default } from "@/features/x/screens/XScreen"`); Expo documents only that routes need a default export, so treat that pattern as this skill's suggestion. Overkill: a few screens: keep `src/app` plus `src/components` until the second feature appears.

## Node API (Hono, Fastify, Express, NestJS)

Basis: Bogard's vertical slices, Fowler's MonolithFirst, Clean Architecture's dependency rule and Cockburn's ports and adapters (dependencies point inward), each framework's own docs.

```
src/
  main.ts                     # process entry: config and server start only
  app.ts                      # composition root: build the app, mount modules
  modules/<domain>/
    index.ts                  # public entry: the router, plugin or module plus a small typed service API
    routes.ts | router.ts | plugin.ts   # transport adapter
    <use-case>.ts             # one file per use case (transaction script): load, call domain, persist
    domain/                   # pure rules and types, no framework imports; only when rules are non-trivial
    schemas.ts                # input and output validation, parsed at the boundary
    repo.ts                   # persistence adapter, when needed
  shared/                     # db client, logger, config, http errors, auth middleware
```

Domain depth: transaction script per use case plus a small pure `domain/` is the default. Add aggregates, repositories and domain events only for invariants spanning several entities, long-lived state machines, a core domain with domain experts, or several teams. Entity classes, mappers and interfaces for everything are a cost on CRUD APIs. Parse at the boundary and keep the refined type afterwards.

- Hono: handlers inline after the path (controllers lose path-parameter inference); `app.route('/books', books)` per resource file; chain methods and export `AppType` for RPC.
- Fastify: each module is a plugin added with `register`; wrap only cross-cutting infrastructure (db, auth decorators) in `fastify-plugin`.
- Express: one `express.Router` per module mounted in `app.ts`; Express ships no official layout, so the lint rules carry it.
- NestJS: one feature module per domain with its controller and service; export only the providers other modules need; skip `@Global()`, barrels for modules and providers, and `forwardRef()` as a first answer; keep reusable pure domain code in plain TS files without decorators.

FSD targets frontends: it does not apply to a backend. Overkill: a tiny API or an edge handler. One `app.ts` with a routes file per resource is enough; NestJS is heavier than Hono or Fastify for that size.

## Monorepo variant

Open it only when a second deployable exists or two apps share code; folder-level boundaries with lint inside one package are cheaper than packages.

```
apps/<app>/                   # each app follows its own layout above
packages/<package>/           # shared code, own package.json and tsconfig.json
pnpm-workspace.yaml
```

Use `workspace:*` between packages. Each package owns a tsconfig extending a shared config package, with no root tsconfig; avoid project references (Turborepo guidance). Expose entrypoints through `package.json` `exports` subpaths, not a package barrel; Node `imports` subpaths beat TS `paths` for packages. Tag packages and enforce the tags with Nx `@nx/enforce-module-boundaries` or a dependency-cruiser `forbidden` rule set.

## Layout map to record

The file written at `docs/architecture/layout.md`: the chosen layout name, its folder tree adapted to the repo's real folders, the rules above that apply (copy them, trimmed), and for each rule the check id that enforces it or `review` when it is a judgement.
