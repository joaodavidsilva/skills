# Store specs

A dated cache of the store rules the editor enforces. Read 2026-10-30 from the primary sources below; the live pages win over this file.

- Apple screenshots: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
- Apple creative assets: https://developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications
- Apple localizations: https://developer.apple.com/help/app-store-connect/reference/app-information/app-store-localizations
- Google Play: https://support.google.com/googleplay/android-developer/answer/9866151
- Apple app information: https://developer.apple.com/help/app-store-connect/reference/app-information/app-information
- Apple platform version information: https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information
- Google Play listing fields: https://support.google.com/googleplay/android-developer/answer/9859152
- Google Play release notes: https://support.google.com/googleplay/android-developer/answer/9859348

**Store-ready** means all of: the format is allowed, the pixel size is in the preset list, no alpha channel, the count is inside the limit.

## Not covered

Apple Vision Pro, Wear OS, Android TV, Android Automotive OS, and Android XR have their own rules on the same pages and have no deck here.

## CarPlay

The Apple screenshot page lists no CarPlay slot (read 2026-10-30). A CarPlay app ships inside its iPhone app, so CarPlay screenshots upload into the iPhone slot, in landscape. The CarPlay deck's canvas is 2868 x 1320 and it exports the landscape iPhone sizes 2868 x 1320, 2778 x 1284, 2622 x 1206, and 2436 x 1125.

## Apple App Store screenshots

- Formats: `.jpeg`, `.jpg`, `.png`. No alpha channel or transparency.
- Count: at least 1, at most 10 per device size, per localization.
- Required: one iPhone with Dynamic Island (medium display) set, and one iPad 13" set if the app supports iPadOS. Mac, Apple TV, and Apple Watch sets are required for apps on those platforms.
- Display scaling: when the UI is consistent across sizes, the highest required resolution is enough and App Store Connect scales it down. Extra per-size sets are optional.

Each iPhone, iPad, and Duo size is accepted in portrait and landscape (width and height swapped).

| Deck | Sizes (px) |
| --- | --- |
| iPhone Dynamic Island, large | 1260 x 2736, 1290 x 2796, 1320 x 2868 |
| iPhone Dynamic Island, medium (required) | 1179 x 2556, 1206 x 2622 |
| iPhone Face ID, large | 1284 x 2778, 1242 x 2688 |
| iPhone Face ID, medium | 1170 x 2532, 1125 x 2436, 1080 x 2340 |
| iPhone Duo, outer display | 1398 x 2034 |
| iPhone Duo, inner display | 2007 x 2853 |
| iPad 13" (required if iPad) | 2064 x 2752, 2048 x 2732 |
| iPad 11" | 1488 x 2266, 1668 x 2420, 1668 x 2388, 1640 x 2360 |
| Mac, 16:10, pick one | 1280 x 800, 1440 x 900, 2560 x 1600, 2880 x 1800 |
| Apple TV | 1920 x 1080, 3840 x 2160 |
| Apple Watch, by model | 422 x 514 (Ultra 4, 3), 410 x 502 (Ultra 2, Ultra), 416 x 496 (Series 12, 11, 10), 396 x 484 (Series 9, 8, 7), 368 x 448 (Series 6, 5, 4, SE 3, 2, SE), 312 x 390 (Series 3, 2, 1) |

- The page states iPhone Duo screenshots are required from April 2027 for apps using the iOS 27.1 SDK or later, and that Duo screenshots add a badge to the product page.
- Apple Watch: use one size consistently across all localizations.
- Default presets: iPhone medium 1206 x 2622, iPhone large 1320 x 2868, iPad 13" 2064 x 2752. The page also lists older Home Button iPhones and older iPads; add them only on request.

## Apple creative assets

No alpha channel or transparency. These are product page header and search results images.

| Placement | Ratio | Size (px) | Formats |
| --- | --- | --- | --- |
| Product page header | 21:9 | 3840 x 1646 | `.jpeg`, `.jpg`, `.png` |
| Search results | 3:2 | min 1920 x 1280, max 3840 x 2560 | `.jpeg`, `.jpg`, `.png` |
| Header and search, one universal asset | 16:9 | 5244 x 2950 | `.png` |

## Google Play

Requirements (mandatory):

- Screenshots: JPEG or 24-bit PNG, no alpha; each side between 320 px and 3840 px; the longer side at most twice the shorter.
- At least 2 screenshots across device types to publish; at most 8 per device type.
- Chromebook and tablet: at least 4 screenshots; 16:9 landscape or 9:16 portrait. The page states "between 1,080 and 7,680px" there and 3840 px as the maximum elsewhere; stay at or under 3840 to satisfy both.
- Feature graphic: JPEG or 24-bit PNG, no alpha, 1024 x 500 px. Required to publish.

Highly recommended (a lint warning, never a block):

- Recommendation eligibility for apps: at least 4 screenshots at 9:16 portrait, minimum 1080 x 1920 (or 16:9 landscape, minimum 1920 x 1080).
- A tagline covers at most 20% of the image.
- No ranking, award, testimonial, price, or promotion claims ("Best", "#1", "Top", "New", "Discount", "Sale", "Million Downloads"), in screenshots, the feature graphic, or the short description.
- No call to action ("Download now", "Install now", "Play now", "Try now").
- Show the real in-app experience; avoid people interacting with the device.
- Avoid device imagery, in screenshots and in the feature graphic. Frames on an Android deck therefore raise a warning.
- Feature graphic: keep the focal point and key elements (logo, app name, slogan, main UI) toward the center, out of the cutoff zones, and avoid pure white, black, or dark gray.
- Localize taglines and overlays per market.
- Alt text of 140 characters or less per screenshot and graphic, without "photo of" or "image of".

Default presets: Android phone 1080 x 1920, Android tablet landscape 1920 x 1080 and portrait 1080 x 1920, feature graphic 1024 x 500.

**Do not reuse an iPhone export for Google Play.** 1290 x 2796 and 1320 x 2868 are taller than 2:1, which breaks the Play ratio rule. Each store target is its own deck with its own layout.

## Listing text

The text fields beside the screenshots, for the optional listing step ([LISTING.md](LISTING.md)). Read 2026-10-30.

| Store | Field | Limit | Notes |
| --- | --- | --- | --- |
| Apple | Name | 2 to 30 characters | Editable until the app is submitted for review |
| Apple | Subtitle | 30 characters | Shown under the name |
| Apple | Promotional text | 170 characters | Shown above the description; editable without a new version |
| Apple | Description | 4000 characters | Plain text, line breaks allowed, no HTML |
| Apple | Keywords | 100 **bytes** | Each keyword longer than two characters; the name and company name are already searchable, so repeating them wastes space; other apps' or companies' names are refused |
| Apple | What's New | 4000 characters | Required from the second version on |
| Google Play | App name | 30 characters | One localized name per language |
| Google Play | Short description | 80 characters | The first text on the detail page |
| Google Play | Full description | 4000 characters | |
| Google Play | Release notes | 500 Unicode characters per language | Not for promotion or calls to action |

Play counts full-width and half-width characters alike. Apple's keyword limit is in bytes, so an accented or non-Latin keyword costs more than one byte per character: measure it with `printf %s "<text>" | wc -c`. Play warns that repetitive or irrelevant keywords in the name or descriptions can lead to suspension.
