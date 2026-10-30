# Editor end-to-end verification

The product under test is this React + Vite editor template. Every scaffold copies the config, tests, harnesses, and its own GitHub Actions workflow (`.github/workflows/e2e.yml`).

## Run it

Requires Node.js 22.12 or newer (the app itself runs on Node 20.19 or newer), Bun 1.3.9, and installed Google Chrome. The e2e runner is pinned to `e2e@0.16.0`, `@e2e-dev/web@0.11.2`, `playwright@1.63.0`. The suite is deterministic: no `agent.*` steps and no model credentials.

```bash
bun install --frozen-lockfile
bun run typecheck
bun run build
bun run test:e2e:list
bun run test:e2e
SCREENSHOTS_E2E_PRODUCTION=1 bun run test:e2e
```

For one direct test:

```bash
E2E_TELEMETRY_DISABLED=1 npx e2e run tests/editor.e2e.ts --grep 'watchos opens'
```

For the three regression harnesses (`api-bug-bash`, `ui-bug-bash`, `bug-bash` in `tests/harness/`) against a server you started yourself in a **disposable** project:

```bash
bun run test:regression http://localhost:4312
BUG_BASH_FILTER='connected overlays' node tests/harness/bug-bash.cjs http://localhost:4312
```

These commands write the supplied server's project file and uploads. `bun run test:e2e` creates the disposable server for you.

## Isolation and artifacts

The runner starts `e2e-army/server.cjs` on port 4312, plus a fake image API (`e2e-army/fake-gemini.cjs`) one port up. It copies the app into a unique temporary directory, symlinks only `node_modules`, and starts Vite there:

- **Dev mode** runs `vite` in the copy.
- **Production mode** (`SCREENSHOTS_E2E_PRODUCTION=1`) copies the built `dist/` and runs `vite preview`. Run `bun run build` first.

Vite's plugin in `server/` resolves `/api/project`, image and font uploads, and the runtime asset routes from the copy's root, so a real project is never touched. Teardown removes the copy. An occupied port fails startup; the config never reuses a live editor. Run suites sequentially: the API and export harnesses mutate their server's project, and tests restore it afterwards.

The browser provider launches installed Google Chrome through Playwright's `channel: 'chrome'`, with no Chromium fallback. `SCREENSHOTS_E2E_HEADED=1` opens a visible window.

The default `.e2e/` output holds:

- `report.json`: selected tests, status, steps, errors, counts, and artifact links.
- `summary.md` and `junit.xml`: readable and CI summaries.
- `artifacts/`: exported ZIP downloads, failure screenshots, and retained failure traces.
- `logs/app.log` and `logs/{api-bug-bash,ui-bug-bash,bug-bash}.log`: application and per-harness output.

CI uploads `.e2e/` on success and failure, and runs dev and production with Chrome against the frozen Bun lockfile.

## What the tests cover

| File | Covers |
| --- | --- |
| `tests/editor.e2e.ts` | Platform tabs, every device deck, screen CRUD and reorder, layouts, locales, themes and fonts, undo, persistence |
| `tests/scene-style-lab.e2e.ts` | Style Lab, Scene Playground, magnifier |
| `tests/targets.e2e.ts` | iPhone Duo decks, App Store creatives, exact-size opaque RGB PNG exports, legacy v2 upgrade, cleared-copy export |
| `tests/preflight.e2e.ts` | Export advice: English fallback, store-rejected copy, text cut off, low contrast, and a clean deck staying silent |
| `tests/backdrop.e2e.ts` | The optional AI backdrop: route guard and validation, a generated image stored and served, only the text prompt sent, upstream failures, and the inspector flow (one screen, all screens, remove, no key). Runs against a local fake of the image API, so it never spends money |
| `tests/regression.e2e.ts` | Runs the three `tests/harness/` groups against the disposable server |
| `tests/harness/api-bug-bash.cjs` | Project, upload, font, and asset routes: validation, same-origin guard, revision conflicts, size limits, migration |
| `tests/harness/ui-bug-bash.cjs` | Interactions: reorder, canvas drag and rotate, responsive widths, theme and font menus |
| `tests/harness/bug-bash.cjs` | Browser export pipeline and connected-canvas behaviour |

Run `bun run test:e2e:list` for the current test names.
