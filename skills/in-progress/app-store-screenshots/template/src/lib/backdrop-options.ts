// Backdrop options shared by the editor and its local server, so the two cannot
// disagree about what is allowed. No imports: the server loads this file directly.

/** Image models the editor offers. `api` is the id Google's API expects. */
export const BACKDROP_MODELS = [
  { id: "nano-banana-2.1", api: "gemini-nano-banana-2.1", label: "Nano Banana 2.1" },
  { id: "nano-banana-pro", api: "gemini-3-pro-image", label: "Nano Banana Pro" },
  { id: "nano-banana-2-lite", api: "gemini-3.1-flash-lite-image", label: "Nano Banana 2 Lite" },
] as const;

export type BackdropModelId = (typeof BACKDROP_MODELS)[number]["id"];

export const DEFAULT_BACKDROP_MODEL: BackdropModelId = "nano-banana-2.1";

export const BACKDROP_SIZES = ["1K", "2K", "4K"] as const;
export type BackdropSize = (typeof BACKDROP_SIZES)[number];
export const DEFAULT_BACKDROP_SIZE: BackdropSize = "2K";

/** Aspect ratios the image API accepts. */
export const BACKDROP_ASPECTS = [
  "1:1", "1:4", "1:8", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9",
] as const;
export type BackdropAspect = (typeof BACKDROP_ASPECTS)[number];

export const BACKDROP_PROMPT_MAX = 2000;

/** Slide image element id the editor uses for a generated backdrop. */
export const BACKDROP_ELEMENT_ID = "backdrop";
