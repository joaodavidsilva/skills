# Generated backdrops

An optional extra, built into the editor. The built-in scenes (gradient, aurora, spotlight and the rest) stay the default and stay deterministic. A generated backdrop is one more image the user chooses to put behind a screen, painted by Google's image models on request and stored as a file like any screenshot. Load this only when the user asks for generated art, or when a style in `style-prompts/` calls for imagery the built-in scenes cannot draw (paper, clay, 3D, poster illustration).

## What the model paints

The backdrop and nothing else: no text, no interface, no device, no logo, no hands. The editor composes the real capture, the headline and the frame on top, so the interface shown is the interface shipped. A model asked for the finished screenshot redraws the app and shows one that does not exist.

Only a text prompt leaves the machine: the user's description plus the theme colours. No capture and no project file is sent.

## Steps

1. **Check the key without printing it:** `test -n "$GEMINI_API_KEY"` (or `GOOGLE_API_KEY`). The key must be in the environment of the shell that starts the editor; a running editor started without it is restarted from a shell that has it. A missing key stops this step: tell the user to export it, and never write it into the project.
2. **Confirm the spend.** Say what will be sent (a description and colours), that each image is a paid request billed by Google to the user's own key, and how many images; wait for a yes. The editor asks again in its own dialog, so a click in the browser is also a yes.
3. **Choose who drives.**
   - **The user, in the browser:** open the screen, expand **AI backdrop** under Background, describe the look, pick a model and a size, **Generate backdrop**. **Use on all screens** copies the result to the whole deck; **Generate another** and **Remove** change it.
   - **You, through the same route:** `POST /api/backdrop` with `{ "prompt", "aspectRatio", "size", "model" }` (values in `src/lib/backdrop-options.ts`) returns `{ "path" }` of the stored image. Add it to each chosen slide's `imageElements` in `app-store-screenshots.json` with JSON tooling as `{ "id": "backdrop", "src": "<path>", "fit": "cover", "transform": { "x": 0, "y": 0, "width": <cW>, "height": <cH>, "rotation": 0, "zIndex": 1 } }`, where `cW` and `cH` come from `CANVAS` in `src/lib/constants.ts`. Build the prompt like the editor does (`backdropPrompt` in `src/lib/backdrop.ts`), from the style's `## Global palette` and `## Background treatment` sections in `style-prompts/` or the theme colours.
4. **Look at the result in the editor** before it goes anywhere, and read the export advice: a "Low contrast against the backdrop" finding names the screen and text that lost legibility. Fix it by generating again with a calmer area behind the headline, or by changing the slide's text colour or inverted setting. An inverted screen expects a light backdrop. A scrim over the art would hide the problem and waste the backdrop.
5. **Hand off** the final prompt and the model name for each backdrop, so the user can regenerate or replace it. Commit the stored files (`public/screenshots/uploaded/`) with `app-store-screenshots.json`; the stored file is what keeps exports reproducible.

One backdrop serves every locale of a deck. For a market-specific look use the imagery table in [LOCALES.md](LOCALES.md#market-imagery) on a single-locale deck.

**Done when:** every chosen screen has a backdrop `imageElement` at `zIndex` 1 with `fit: "cover"`, the user has seen it in the editor, and the deck's export shows no contrast finding the user did not accept.

## Content rules

Keep the art inside the store's content rules: nothing a 4+ age rating would refuse, no prices, URLs, awards, rankings or another platform's logos (the same list as [STORE-SPECS.md](STORE-SPECS.md) and the editor's export advice). The feature graphic takes no overlays, so it has no backdrop.
