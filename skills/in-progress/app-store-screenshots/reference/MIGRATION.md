# Migrating an older project

Load this only when Step 0 of `SKILL.md` found an older implementation and the user answered **Yes**. The goal is an in-place upgrade of the editor, not a redesign: keep the user's app name, copy, screenshot paths, app icon, uploaded assets, locales, and device decks wherever they exist, and replace the old editor code with the current template.

Two generations of old projects exist:

| Generation | Tells | Upgrade |
| --- | --- | --- |
| Pre-connected-canvas | `app-store-screenshots.json` without `schemaVersion` or `connectedCanvas`; a single `page.tsx` generator with `html-to-image`, `EXPORT_SIZES`, `PHONE_SCREEN` | Replace the code, coerce the project file |
| Next.js editor | `next` in `package.json`, `next.config.mjs`, `src/app/page.tsx` | Same, plus the framework change: the template is React + Vite now, so the Next files are removed |

## Rules

1. **Ask nothing further.** The user already has a project. Infer from existing files and report non-blocking gaps at the end.
2. **Never delete user assets.** Keep `public/screenshots/`, `public/app-icon.png`, uploaded screenshots, and any existing `app-store-screenshots.json`.
3. **Keep recoverability.** Do not revert unrelated changes in a dirty worktree. Before overwriting anything, copy the replaced state, assets, and code to a backup directory outside the repo (`/tmp/app-store-screenshots-migration-<timestamp>/`) and name that path in the final response.
4. **Edit JSON with JSON tooling.** Use `scripts/migrate-project.cjs`; never regex-edit the project file.
5. **Write `schemaVersion: 2` and keep legacy decks safe.** An explicit boolean `connectedCanvas` is preserved. A project that is pre-v2 or lacks the flag gets `"connectedCanvas": false`, so offscreen or clipped legacy mockups never leak into neighbouring exports. New projects default to connected.
6. **Keep screenshots pointed at existing files.** Rename none unless the old project already depended on numeric names.
7. **Recover custom themes without asking.** When an old `themeId` is custom, merge the matching theme object from the backed-up `src/lib/constants.ts` into the new one. When it cannot be recovered, leave the `themeId` in the project; the editor falls back to `clean-light` and warns. Report that the theme needs manual restoration.
8. **Template wins in `package.json`.** The template's scripts and editor dependencies replace the old ones; unrelated old entries survive; the Next.js packages are dropped (`scripts/merge-package.cjs` does this).
9. **Keep template sample content out.** When the old project has decks or screenshots, take only code and UI from the template. The sample decks and screenshots must not reach the migrated project.
10. **Dogfood on a copy.** When the user asks to test or review the migration, run it in a temp directory or worktree. Touch the real checkout only on an explicit request plus a **Yes**.

## Sequence

Run from the project root. `<SKILL_DIR>` is the absolute path of the directory holding `SKILL.md`.

```bash
# 1. Snapshot everything the template will replace.
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/tmp/app-store-screenshots-migration-$STAMP"
mkdir -p "$BACKUP_DIR/preserve"
cp -R app-store-screenshots.json public src package.json tailwind.config.ts next.config.mjs "$BACKUP_DIR/" 2>/dev/null || true

# 2. Preserve project state and assets that must survive the template copy.
cp app-store-screenshots.json "$BACKUP_DIR/preserve/" 2>/dev/null || true
cp -R public/screenshots "$BACKUP_DIR/preserve/screenshots" 2>/dev/null || true
cp public/app-icon.png "$BACKUP_DIR/preserve/app-icon.png" 2>/dev/null || true

# 3. Remove the old editor code. It is in the backup; the template owns src/ now.
rm -rf src .next next.config.mjs next-env.d.ts

# 4. Copy the template over the project, then keep its sample project file aside.
cp -R "<SKILL_DIR>/template/." "$PWD/"
cp app-store-screenshots.json "$BACKUP_DIR/template-app-store-screenshots.json"

# 5. Restore the user's state and assets over the template samples.
cp "$BACKUP_DIR/preserve/app-store-screenshots.json" app-store-screenshots.json 2>/dev/null || true
if [ -d "$BACKUP_DIR/preserve/screenshots" ]; then
  mkdir -p "$BACKUP_DIR/template-samples/public"
  mv public/screenshots "$BACKUP_DIR/template-samples/public/screenshots" 2>/dev/null || true
  cp -R "$BACKUP_DIR/preserve/screenshots" public/screenshots
else
  mkdir -p public/screenshots
fi
cp "$BACKUP_DIR/preserve/app-icon.png" public/app-icon.png 2>/dev/null || true
```

Then coerce the project file and merge the package metadata:

```bash
BACKUP_DIR="$BACKUP_DIR" node scripts/migrate-project.cjs
BACKUP_DIR="$BACKUP_DIR" node scripts/merge-package.cjs
```

`migrate-project.cjs` upgrades an existing `app-store-screenshots.json` in place: it localizes legacy string copy, sanitizes element transforms, drops unknown decks, sets `schemaVersion: 2` and the `connectedCanvas` rule above, and seeds `locales`. With no project file but old slide data embedded in `src/lib/defaults.ts` or `src/app/page.tsx` (read them from the backup), extract it best-effort into the project JSON first, preferring arrays or objects named `slides`, `screens`, `features`, `defaultSlides`, `appName`, `tagline`, `theme`, and screenshot paths. With only image files, sort `public/screenshots/**` by path and seed slides from them.

Install and verify with the project's package manager:

```bash
bun install      # or pnpm install / yarn / npm install
set -o pipefail
bun run build 2>&1 | tee "$BACKUP_DIR/build.log"
```

## Verify in the browser

Start the dev server and check:

- The toolbar shows **Isolated** for migrated pre-v2 decks, unless the project already had `"connectedCanvas": true`.
- Existing screens, copy, screenshot paths, and app icon are present.
- Every referenced screenshot exists for every configured locale, or the final report lists the missing paths.
- Retained device decks do not silently become template placeholders. A retained deck with empty screenshots or no active-locale copy is reported as a follow-up, never removed.
- A bundle export succeeds for the active device.
- `app-store-screenshots.json` holds `"schemaVersion": 2` and a boolean `"connectedCanvas"`.

**Done when:** every check above passes, the dev server URL is known, and the backup path is named in the report.

## What the editor does on load

The editor saves `schemaVersion: 3` (v3 adds the iPhone Duo and creative decks) and accepts v2, upgrading it on the next save without touching existing decks. On load, `src/lib/storage.ts`:

1. Converts legacy string copy to localized `{ "en": "..." }` objects.
2. Sanitizes existing element transforms.
3. Keeps every existing slide and device deck.
4. Keeps pre-v2 decks in isolated-screen mode (`connectedCanvas: false`), so already-clipped phones or captions do not appear in neighbouring exports.
5. Lets the user opt into connected crops with the toolbar's Connected/Isolated control.
6. Saves the upgraded state to `app-store-screenshots.json` and `localStorage` only after the project endpoint loaded successfully, so a stale browser cache cannot overwrite the canonical file during a dev-server restart.
7. Detects newer disk revisions before autosaving. When another tab or an agent edits the project, keep unsaved work open and export or copy it before reloading; never force a stale save over the newer file.

Two migration modes exist:

- **Passive:** a user opens an old project in the current editor. Pre-v2 JSON keeps `connectedCanvas: false`, so old exports stay visually stable.
- **Explicit:** Step 0 detected an old implementation and the user said **Yes**. Upgrade the code in place and write `schemaVersion: 2` per the sequence above.
