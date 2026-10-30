# Devices

Deck behaviour for the non-phone devices, iPhone Duo, App Store creative assets and Mac, plus export layout and blank-screen troubleshooting. Exact App Store Connect sizes for every device live in [`STORE-SPECS.md`](./STORE-SPECS.md); the research behind the Duo rules lives in [`IPHONE-DUO.md`](./IPHONE-DUO.md).

## Export

Inside the editor, the user picks a device, then hits **Export bundle**. A single zip downloads with every required size × every project locale for that device, organized as `<platform>/<device>/<WxH>/<locale>/NN-<layout>.png` (e.g. `ios/iphone/1320x2868/en/01-hero.png`, `macos/mac/2880x1800/en/01-hero.png`). Repeat per device.

When `connectedCanvas` is enabled, exports are crops of the connected canvas, not isolated screen renders. If a mockup sits halfway across screen 2 and screen 3, screen 2's PNG contains its left crop and screen 3's PNG contains its right crop exactly as placed. Legacy decks should start with `connectedCanvas: false`, including migrated projects, so old offscreen/clipped elements export as they did before. The user can turn on **Connected** after intentionally composing cross-screen elements.

Before export, zoom out to inspect the connected canvas as a strip, then inspect the individual cropped screens. Cross-screen elements should feel intentional in the strip and harmless in isolation.

Project locales come from the `locales` field of `app-store-screenshots.json`, set during scaffolding. Single-locale projects produce a flat per-size structure with just the one locale folder.

Each slide is rendered once per locale at canvas resolution and scaled to every export size. The exporter waits until every visible screenshot has actually painted before it saves a PNG (Safari/WebKit decodes images inside the render asynchronously, which used to produce blank device screens), and shows a warning toast naming the screen if one never appears.

If exports come out blank or with black screen rectangles:
- Read the export toast: a "screenshots may be missing" warning names the affected screens. Export again, and check the source image opens.
- Verify source screenshots are RGB (not RGBA). The template flattens via `objectFit: cover`, but truly transparent sources can still produce black regions.
- Confirm the referenced screenshot paths exist under `public/`; export retries paths that were previously missing before it starts rendering.

## Apple TV, Apple Watch and CarPlay

Accepted sizes, display types and canvases for these devices live in [`STORE-SPECS.md`](./STORE-SPECS.md).

- **Every export is a downscale of the canvas.** Where a slot's aspect differs slightly (Watch 422×514 → 312×390), the exporter scales to cover and trims a few edge pixels instead of stretching the frame. Keep text and the device away from the outermost ~3% on the watch.
- **CarPlay has no App Store screenshot slot.** A CarPlay app ships inside its iPhone app, so a CarPlay shot is uploaded **into the iPhone slot**, in landscape (iPhone slots accept both orientations). The `carplay` device is a head-unit frame on a landscape 6.9" iPhone canvas for exactly that. Head units vary by vehicle; the frame uses Apple's CarPlay Simulator "Standard" 800×480 preset (5:3). Change `CARPLAY_RATIO` in `src/lib/constants.ts` for another preset (Minimum 748×456, Widescreen 1920×720, Portrait 900×1200, Video Playback 1920×1080).
- **TV, Watch and CarPlay frames are contained.** Phones and tablets deliberately bleed off the canvas edge; a cropped TV, watch face or head unit reads as a mistake, so these devices always stay fully inside the canvas.
- **Layouts:** `split-landscape` (caption left, device right) is the strongest layout for the wide TV and CarPlay canvases. On the watch, keep headlines to two or three short words per line; the canvas is only 422 px wide.
- **Screenshots:** use real captures at native resolution: Apple TV 3840×2160 or 1920×1080 from the tvOS simulator, Apple Watch from the watchOS simulator, CarPlay from the CarPlay Simulator (or Xcode's I/O → External Displays → CarPlay).

## iPhone Duo

| Target (deck) | Accepted size | Export folder |
|---|---|---|
| Outer display portrait (`duo-outer`) | 1398×2034 | `ios/duo-outer/1398x2034/` |
| Outer display landscape (`duo-outer-landscape`) | 2034×1398 | `ios/duo-outer-landscape/2034x1398/` |
| Inner display portrait (`duo-inner`) | 2007×2853 | `ios/duo-inner/2007x2853/` |
| Inner display landscape (`duo-inner-landscape`) | 2853×2007 | `ios/duo-inner-landscape/2853x2007/` |

- Sizes are App Store Connect's exact pixel sizes. Never derive Duo sizes from aspect-ratio labels or other iPhone sizes. PNG/JPG, no alpha (the exporter writes opaque RGB PNG).
- **Each display and orientation is its own deck.** In the editor, pick **iPhone Duo outer** or **inner** in the device menu and switch with **Orientation**; that opens the other deck rather than re-laying out this one, so portrait and landscape keep independent compositions. When seeding `app-store-screenshots.json`, write the four decks separately, and only the decks the app has real layouts for (see [`IPHONE-DUO.md`](./IPHONE-DUO.md)).
- **Duo placements.** Landscape decks put the caption across the top and make the device the hero, wide enough that the capture reads, bleeding off the bottom in `hero`. `two-devices` is **Folded + open**: set `screenshotSecondary` to a capture from the other display (outer portrait ↔ inner landscape, outer landscape ↔ inner portrait). The editor never falls back to the front capture there, and export warns when it is missing. Duo frames ignore the scene's tilt: Apple's guidelines ask for straight-on product images, so don't rotate Duo devices by hand either.
- **Captures must come from the matching display and orientation.** A mismatched capture is letterboxed (never cropped or stretched) and the inspector and export toast flag it. Don't reuse iPhone captures for Duo, and don't mock up Duo UI by hand.
  - **Capture real ones** with `scripts/capture-iphone-duo.sh`. It needs Xcode 27.1+, the iOS 27.1 simulator runtime, and Device Hub open with the iPhone Duo simulator selected.
  - It sets Apple's 9:41 status bar, drives the Closed, Open, Book and turned poses, and writes `public/screenshots/apple/duo-{outer|inner}/{portrait|landscape}/<locale>/NN.png`. Run it after adding a debug-only launch argument that opens each screen, e.g. `-CapturePanel orders`.
  - Turned poses turn the phone **left**, so the outer display's camera matches Apple's landscape bezel.
  - Real captures keep the camera corner clear: iOS puts the time and status on a rail below the camera. A capture whose title sits under the camera is either hand-made or taken turned the wrong way.
  - Portrait-only iPhone apps have no outer landscape: skip that deck.
- **Apple's bezels ship with the template** in `public/frames/`, taken from Apple Design Resources → Product Bezels. Like fastlane frameit, the template bundles them.
  - **Licence:** Apple licenses them for mock-ups of apps for Apple platforms only. Never use them in Android decks.
  - **Bundled files:**
    - `iphone-portrait` (iPhone 18 Pro Max, Black)
    - `ipad-portrait` (iPad Pro 13", Space Black)
    - `watch` (Ultra 3, Ocean Band)
    - `tv` (Apple TV 4K)
    - `mac` (MacBook Air 15", Midnight)
    - `duo-outer-portrait`, `duo-outer-landscape`, `duo-inner-portrait` and `duo-inner-landscape` (Night Sky)
  - **Another finish or model:** replace the file with another PNG from Apple's pack under the same name. The editor measures each file's transparent screen cutout per corner, and uses the bezel for that device; the App Store creatives use the iPhone bezel.
  - **Without a file:** Duo uses a drawn frame and every other device keeps its built-in frame. Android and CarPlay never use Apple bezels.

## App Store creative assets

| Target (deck) | Export | Placement |
|---|---|---|
| `creative-universal` | 5244×2950 | Product page header **and** search results |
| `creative-header` | 3840×1646 | Product page header |
| `creative-search` | 3840×2560 and 1920×1280 | Search results (any 3:2 from 1920×1280 to 3840×2560) |

- Recommend the universal asset first. Use separate header and search assets only when the universal crops don't give enough control.
- Default layouts sit inside the **art safe area** measured from Apple's own templates (universal x 1921–3323, y 660–1622; header x 1097–2743, y 493–1154; search x 836–3004, y 765–1795). The backdrop fills the rest. Keep the message and focal art inside the green safe-area guide. For the universal asset, the dashed header and search crops and the bottom-left previews are **estimates** (Apple doesn't publish the crop): tell the user to confirm in App Store Connect's Preview tool. Guides never export.
- Creatives share the deck's theme, font, scene, overlays and text elements. They are not the fixed Play Store feature graphic. Write one short brand line per creative; never paste a long screenshot headline.
- Creative assets are optional. They are reviewed through App Store Connect, separate from screenshots and from editorial artwork. Don't promise instant swaps, and don't upload or submit anything for the user.

## Mac

Accepted sizes (`APP_DESKTOP`, 16:10 landscape only) and the 2880×1800 canvas live in [`STORE-SPECS.md`](./STORE-SPECS.md).

- **Mac is its own toolbar tab** (iOS / Mac / Android), not a device under iOS: App Store Connect lists macOS as a separate platform with its own screenshot set, so the Mac bundle exports to `macos/mac/<WxH>/<locale>/` rather than inside `ios/`. Every Mac size is an exact 16:10 downscale of the canvas; nothing is trimmed.
- **The Mac window is contained** like the TV and CarPlay frames, and its content area below the title bar is exactly 16:10, so a full-screen 16:10 capture fills it without cropping. Other aspects are cover-cropped from the bottom (the top of the window stays visible).
- **Screenshots:** a full-screen capture (⌘⇧3) at a 16:10 resolution is the cleanest source. Notched MacBook Pros capture at ~1.54:1, which loses a few percent off the bottom (the Dock). A single-window capture (⌘⇧4, then Space) already has its own title bar, so the frame would draw a second one: crop the window's title bar off first, or use a full-screen capture.
- **Layouts:** the starter deck is `hero` → `split-landscape` → `device-top` (inverted) → `two-devices` → `no-device`. Because the window is contained, `hero` and `device-bottom` look almost the same; prefer `split-landscape` or `two-devices` (two overlapping windows) for variety.

## Upload destinations

Where each export folder goes. The user uploads; this skill never does. Set names are the ones in [`STORE-SPECS.md`](./STORE-SPECS.md); the consoles rename fields, so confirm against what the console shows.

| Export folder | Goes into |
|---|---|
| `ios/iphone/<WxH>/<locale>/` | App Store Connect, the version's screenshots for that localization, iPhone set. One set at the highest size is enough: App Store Connect scales it down |
| `ios/ipad/…` | The iPad 13" set (needed when the app supports iPad) |
| `ios/duo-outer…`, `ios/duo-inner…` | The iPhone Duo outer and inner display sets, each orientation at its own size |
| `ios/carplay/…` | The iPhone set, in landscape (there is no CarPlay slot) |
| `ios/tvos/…`, `ios/watchos/…`, `macos/mac/…` | The Apple TV, Apple Watch and Mac sets |
| `ios/creative-*/…` | The optional creative assets for the product page header and search results |
| `android/android/…`, `android/android-7/…`, `android/android-10/…` | Play Console, Store presence > Store listings, the phone, 7-inch tablet and 10-inch tablet screenshots |
| `android/feature-graphic/1024x500/…` | Play Console, Store listings, the feature graphic (required to publish) |

Each locale folder is a separate visit: switch the console's language to that locale, then upload the matching folder.
