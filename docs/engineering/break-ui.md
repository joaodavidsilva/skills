## What it does

`break-ui` stress-tests a UI component by feeding it realistic worst-case data behind a dev-only toggle and reporting every break it finds.

It changes the data at the fixture or prop boundary and leaves the component markup and CSS untouched, using plausible or schema-backed worst-case values behind a dev-only `Demo data / Worst case` toggle, and reports every break (`Broken`, `Ugly`, `Fragile`) before fixing anything. Keeping the component untouched during the test ensures you see how the real layout handles long strings, zero items, single-item plurals, and 1,000-row lists before deciding which breaks are bugs and which are design calls.

## When to reach for it

You invoke this by typing `/break-ui`, and the [agent](../references/agent.md) won't reach for it on its own.

Reach for it when a component or screen looks done against clean demo data and you want to see where real production data will break it.

| Your situation | Reach for |
| --- | --- |
| A component looks finished on happy-path fixtures and needs stress-testing with hostile but realistic data | `break-ui` |
| A screen works with real data, but the spacing, alignment, shadows, or hit areas feel off | [interface-polish](https://aihero.dev/skills-interface-polish) |
| You are still deciding what the screen should look like or how its state model should work | [prototype](https://aihero.dev/skills-prototype) |
| You are building a behavioral feature with defined inputs and outputs test-first | [tdd](https://aihero.dev/skills-tdd) |

## Schema-backed worst cases and the dev-only toggle

Demo data is polite: two-word names, short emails, three rows, every optional field filled in. Production data has hyphenated names, stacked Vietnamese diacritics, 60-character corporate emails with no spaces, missing avatars that 404, counts of `1`, and unpaginated lists with 1,000 rows.

`break-ui` starts by reading the component and tracing every rendered value back to its validation schema, database column, or API contract. When a `name` column allows 255 characters or has no limit at all, that gap is the **schema-backed worst case**. Rather than stacking every extreme onto row 1, the skill spreads realistic edge cases across the first visible rows of a single worst-case fixture and adds segments for `Empty`, `One`, and `1,000 rows` on a neutral **dev-only toggle** (`Demo data / Worst case`) fixed at the bottom of the viewport.

## Failure signatures, and truncate vs. wrap vs. clamp

When the toggle flips to `Worst case`, breaks fall into recurring **failure signatures**, each pointing straight to its CSS or formatting fix:

| Failure signature | Typical fix |
| --- | --- |
| Long text overflows its flex or grid column instead of wrapping | `min-width: 0` on the text column (`minmax(0, 1fr)` in grid) |
| Avatar, icon, or trailing `•••` action squishes into a pill or gets pushed off-screen | `flex-shrink: 0` on the fixed-size element |
| Unbreakable email, URL, or German compound word runs past the container edge | `overflow-wrap: anywhere` on that element |
| Live counters or price columns shift width as digits change | `font-variant-numeric: tabular-nums` |
| Count of `1` renders as `"1 members"` or `"1 days ago"` | `Intl.PluralRules` and `Intl.RelativeTimeFormat` |

Not every break has a mechanical fix. Every long string forces a **truncate vs. wrap vs. clamp** choice that depends on what the field means: wrap names the user needs in full, end-truncate secondary metadata, middle-truncate file names or emails that differ at the end, and clamp multi-line card previews. Because those are product decisions, the report separates mechanical fixes from a **Decisions for you** list and waits before touching component code.

## Common questions

**Why does it stop after the report instead of fixing the breaks right away?**

Because half of what breaks in a layout is a design decision, not a mechanical bug. Adding `flex-shrink: 0` to a squished avatar has one right answer, whereas choosing whether a 60-character role badge should truncate, wrap onto two lines, or hide on narrow viewports depends on the product. If you want the unambiguous fixes applied immediately, invoke `/break-ui <component> + fix` to fix everything outside the decisions list, or reply `fix all` / `fix 1, 3` after reading the report.

**Does the toggle or worst-case fixture ship to production?**

The toggle is gated behind the development [environment](../references/environment.md) (such as a `?data=worst` URL parameter read only in dev or a prototype route), so it never appears in production builds. The worst-case fixture stays alongside your demo data as a regression check for the next person who edits the component.

**What if I don't have a running dev server or want to test a standalone component?**

Ask for `/break-ui` on the component anyway, or run `/break-ui data only <component>`. When there is no dev server, the skill packages the component with both datasets and the segmented toggle into a single self-contained HTML file you can open directly in a browser.

## It's working if

- Every rendered field is mapped to its schema limit (or flagged as `unbounded`) before any fixture data is written.
- A neutral `Demo data / Worst case` toggle appears at the bottom of the screen and switches between `Demo`, `Worst case`, `Empty`, `One`, and `1,000 rows` without modifying the component's own markup or styles.
- The first few visible rows mix realistic edge cases (compound names, unbreakable emails, RTL text, missing optional fields, broken avatar URLs) rather than `aaaaaaa` placeholder strings.
- The report separates mechanical breaks (`Broken`, `Ugly`, `Fragile`) with exact `file:line` fixes from **Decisions for you**, and also lists what held up.
- Execution stops after the report so you can flip the toggle yourself before any component code changes.

## Where it fits

`break-ui` is a **reach-for-it-anytime standalone** that you run once a component renders and before you call it done. Its neighbours cover the surrounding UI and testing work:

- [interface-polish](https://aihero.dev/skills-interface-polish) tunes optical alignment, border radii, shadows, animations, and interaction feel, whereas `break-ui` feeds hostile data to see what overflows, squishes, or clips.
- [prototype](https://aihero.dev/skills-prototype) builds throwaway UI variations to settle what a screen should look like before production code exists.
- [tdd](https://aihero.dev/skills-tdd) locks down behavioral contracts test-first at agreed seams, while `break-ui` exposes visual and data-shape breaks across the rendered surface.

For which skill fits your situation across the whole set, **ask-joao** is the router.
