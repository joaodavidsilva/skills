# Generated backdrops

An optional extra. The editor's built-in scenes (gradient, aurora, spotlight and the rest) stay the default and stay deterministic. A generated backdrop is one more image the user chooses to put behind a slide, made outside the editor by a paid model, then stored as a file like any screenshot. Load this only when the user asks for generated art, or when a style in `style-prompts/` calls for imagery the built-in scenes cannot draw (paper, clay, 3D, poster illustration).

## What the model paints

The backdrop and nothing else: no text, no interface, no device, no logo, no hands. The editor composes the real capture, the headline and the frame on top, so the interface shown is the interface shipped. A model asked for the finished screenshot redraws the app and shows one that does not exist.

The capture never goes to the model. Only the prompt text leaves the machine.

## Steps

1. **Confirm the spend.** Say what will be sent (a text prompt), that it is a paid API call, how many images, and wait for a yes. Check the key without printing it: `test -n "$GEMINI_API_KEY"`. A missing key stops this step; the key is never written into the project.
2. **Compose one prompt per backdrop** from the chosen style: its `## Global palette` and `## Background treatment` sections in `style-prompts/`, or the theme colours in `src/lib/constants.ts`. State the target positively: a calm top third for the headline, a quieter band where the device sits, soft shapes over fine texture, no text anywhere in the image. For a market-specific look use the imagery table in [LOCALES.md](LOCALES.md#market-imagery). One backdrop serves every locale of the deck, so use market imagery only for a single-locale deck.
3. **Generate at 9:16** with the `imagegen-gemini` skill (`--aspect-ratio 9:16`, 2K or larger). The editor covers the canvas with the image at one uniform scale and trims the overflow, so a 9:16 image on a 1320 x 2868 canvas loses a sliver at the sides and is never stretched. Open every output and look at it before it goes anywhere.
4. **Store it through the editor's own route**, so it lands hashed in `public/screenshots/uploaded/` beside the screenshots: `POST /api/upload` with `{ "dataUrl": "data:image/jpeg;base64,..." }` returns `{ "path": "/screenshots/uploaded/<hash>.<ext>" }`. The route accepts PNG or JPEG up to 8 MiB decoded; regenerate smaller when a file is over.
5. **Place it** by adding an entry to the slide's `imageElements` in `app-store-screenshots.json` with JSON tooling:

   ```json
   { "id": "backdrop", "src": "<path from step 4>", "fit": "cover",
     "transform": { "x": 0, "y": 0, "width": <cW>, "height": <cH>, "rotation": 0, "zIndex": 1 } }
   ```

   `cW` and `cH` are the deck's canvas in `CANVAS` (`src/lib/constants.ts`; iPhone is 1320 x 2868). `x` is relative to the slide, also in Connected mode. `zIndex: 1` sits above the scene and below every device (2 and 3), the caption (4) and other overlays (5 and up). The Play feature graphic takes no overlays.
6. **Read the export advice.** Export the deck once: a "Low contrast against the backdrop" finding names the screen and text that lost legibility. Fix it by regenerating with a quieter area behind the headline, or by changing the slide's text colour or inverted setting. A scrim over the art would hide the problem and spend the backdrop; leave the art honest.
7. **Hand off** the saved path, the final prompt and the model name for each backdrop, so the user can regenerate or replace it. Commit the stored files with `app-store-screenshots.json`; the generated file is what keeps exports reproducible.

**Done when:** every chosen slide has a backdrop `imageElement` at `zIndex` 1 with `fit: "cover"`, the user has seen it in the editor, and the deck's export shows no contrast finding the user did not accept.

## Content rules

Keep the art inside the store's content rules: nothing a 4+ age rating would refuse, no prices, URLs, awards, rankings or another platform's logos (the same list as [STORE-SPECS.md](STORE-SPECS.md) and the editor's export advice).
