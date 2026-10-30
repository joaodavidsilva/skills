import {
  BACKDROP_ASPECTS,
  BACKDROP_ELEMENT_ID,
  type BackdropAspect,
  type BackdropModelId,
  type BackdropSize,
} from "./backdrop-options";
import type { ImagePalette } from "./palette";
import type { ImageElement, Slide, Theme } from "./types";

// Generated backdrops: one image behind a slide's devices and text, made on
// demand by an image model and then stored as an ordinary file. The editor's
// built-in scenes stay the default; this only adds an image element.

/** The supported ratio closest to `w:h`, compared as ratios so 1:4 is not "near" 9:16. */
export function nearestAspectRatio(w: number, h: number): BackdropAspect {
  const target = Math.log(w / h);
  let best: BackdropAspect = "9:16";
  let bestDistance = Infinity;
  for (const aspect of BACKDROP_ASPECTS) {
    const [aw, ah] = aspect.split(":").map(Number);
    const distance = Math.abs(Math.log(aw / ah) - target);
    if (distance < bestDistance) {
      best = aspect;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Art directions. Each names a concrete subject, a material and a finish: a
 * model asked for "soft gradients and gentle shapes" paints a blurry blob, and
 * one asked for "thin topographic lines" or "frosted glass spheres" paints
 * something a designer would keep. `{base}` and `{accent}` are filled from the
 * palette; the editor never leaves a colour to the model's taste.
 */
export const BACKDROP_STYLES = [
  {
    id: "topo",
    label: "Topographic lines",
    direction: "Thin {accent} topographic contour lines flowing in gentle waves across a {base} background, precise vector linework, high-end editorial graphic design, generous empty space.",
  },
  {
    id: "glass",
    label: "Frosted glass",
    direction: "Clean studio render of a few frosted translucent {accent} glass spheres and rounded slabs catching soft light on a {base} surface, sharp highlights, shallow depth of field, modern and minimal.",
  },
  {
    id: "clay",
    label: "Soft clay shapes",
    direction: "Soft matte clay 3D shapes (pebbles, arches and rings) in {accent}, cream and a deeper shade of {accent} resting on a {base} floor, soft studio shadows, playful but refined.",
  },
  {
    id: "shapes",
    label: "Bold geometric (loud)",
    direction: "Bold flat geometric composition: large overlapping circles and arcs in {accent} and two nearby shades on a {base} ground, crisp edges, Swiss poster style, lots of negative space.",
  },
  {
    id: "riso",
    label: "Risograph glow",
    direction: "A {base} surface with a smooth gradient up to a {accent} glow rising from the bottom edge, visible film grain and halftone dots, risograph print feel, tasteful.",
  },
  {
    id: "paper",
    label: "Layered paper (loud)",
    direction: "Layered paper-cut waves in {accent} and shades of {base}, soft shadows between the layers, crafted and tactile, clean edges.",
  },
  {
    id: "custom",
    label: "Describe it myself",
    direction: "A backdrop in {base} and {accent}.",
  },
] as const;

export type BackdropStyleId = (typeof BACKDROP_STYLES)[number]["id"];
export const DEFAULT_BACKDROP_STYLE: BackdropStyleId = "topo";

// Where the headline and the device sit, so the art keeps that band calm.
// Stated as the target to reach, not as things to avoid.
function compositionCue(layout: Slide["layout"]): string {
  switch (layout) {
    case "device-top":
      return "Keep the bottom third calm and uncluttered, because a headline sits there; put the interest in the upper two thirds, because a phone covers part of it.";
    case "no-device":
      return "Keep the central band calm and uncluttered, because a large headline sits there; put the interest at the edges.";
    case "split-landscape":
      return "Keep the left half calm and uncluttered, because a headline sits there; put the interest in the right half, because a device covers part of it.";
    case "feature-graphic":
      return "Keep the whole image calm and uncluttered.";
    default:
      return "Keep the top third calm and uncluttered, because a headline sits there; put the interest in the lower two thirds, because a phone covers part of it.";
  }
}

/**
 * The palette a backdrop is painted in. The accent is the screenshot's own when
 * known, else the theme's. The base is the screenshot's too, except on an
 * inverted screen: its text is dark, so it keeps the theme's light base rather
 * than inherit the dark colour of the screen sitting in front of it.
 */
export function backdropPalette(theme: Theme, slide: Pick<Slide, "inverted">, fromScreenshot: ImagePalette | null): { base: string; accent: string } {
  return {
    base: slide.inverted ? theme.bgAlt : fromScreenshot?.base ?? theme.bg,
    accent: fromScreenshot?.accent ?? theme.accent,
  };
}

/**
 * The prompt sent to the model. Only this text leaves the machine: no
 * screenshot, no project file. The model paints the backdrop alone; the editor
 * composes the real capture, the frame and the headline on top.
 */
export function backdropPrompt(input: {
  style: BackdropStyleId;
  idea: string;
  palette: { base: string; accent: string };
  slide: Pick<Slide, "layout">;
}): string {
  const { style, idea, palette, slide } = input;
  const direction = (BACKDROP_STYLES.find((option) => option.id === style) ?? BACKDROP_STYLES[0]).direction
    .replaceAll("{base}", palette.base)
    .replaceAll("{accent}", palette.accent);
  return [
    direction,
    idea.trim() ? `Also: ${idea.trim()}.` : "",
    compositionCue(slide.layout),
    "The image is only a backdrop for an app store screenshot: no text, no letters, no numbers, no logos, no phones, no screens, no hands, no people.",
  ]
    .filter(Boolean)
    .join(" ");
}

export const findBackdrop = (slide: Slide): ImageElement | undefined =>
  slide.imageElements?.find((element) => element.id === BACKDROP_ELEMENT_ID);

/** The slide's image elements with its backdrop set to `src`, covering the whole canvas under every other layer. */
export function withBackdrop(slide: Pick<Slide, "imageElements">, src: string, cW: number, cH: number): ImageElement[] {
  const backdrop: ImageElement = {
    id: BACKDROP_ELEMENT_ID,
    src,
    fit: "cover",
    // zIndex 1: above the scene, below the devices (2 and 3), caption (4) and other overlays (5+).
    transform: { x: 0, y: 0, width: cW, height: cH, rotation: 0, zIndex: 1 },
  };
  return [...(slide.imageElements ?? []).filter((element) => element.id !== BACKDROP_ELEMENT_ID), backdrop];
}

/** The slide's image elements without its backdrop; undefined when none remain. */
export function withoutBackdrop(slide: Pick<Slide, "imageElements">): ImageElement[] | undefined {
  const rest = (slide.imageElements ?? []).filter((element) => element.id !== BACKDROP_ELEMENT_ID);
  return rest.length > 0 ? rest : undefined;
}

export type BackdropStatus = {
  available: boolean;
  models: { id: BackdropModelId; label: string }[];
  sizes: BackdropSize[];
};

let status: Promise<BackdropStatus> | null = null;

/** Whether the local server holds an image-API key. Asked once per page load. */
export function backdropStatus(): Promise<BackdropStatus> {
  status ??= fetch("/api/backdrop", { signal: AbortSignal.timeout(5000) })
    .then(async (response) => {
      const json: BackdropStatus & { ok?: boolean } = await response.json();
      return response.ok && json.ok ? json : { available: false, models: [], sizes: [] };
    })
    .catch(() => ({ available: false, models: [], sizes: [] }));
  return status;
}

/** One painted option: held in memory as a data URL until the user keeps it. */
export type BackdropOption = { dataUrl: string; width: number; height: number; model: string };

/** One paid image request, returned for review and not yet stored. Throws with the server's own message. */
export async function generateBackdrop(request: {
  prompt: string;
  aspectRatio: BackdropAspect;
  size: BackdropSize;
  model: BackdropModelId;
  signal?: AbortSignal;
}): Promise<BackdropOption> {
  const { signal, ...body } = request;
  const response = await fetch("/api/backdrop", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, draft: true }),
    signal: signal ?? AbortSignal.timeout(190_000),
  });
  const json: (BackdropOption & { ok?: boolean; error?: string }) | null = await response.json().catch(() => null);
  if (!response.ok || !json?.ok) throw new Error(json?.error || `Backdrop request failed (${response.status})`);
  return json;
}

/** Stores a kept option like any upload and returns the path the project keeps. */
export async function keepBackdrop(option: BackdropOption): Promise<string> {
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dataUrl: option.dataUrl }),
    signal: AbortSignal.timeout(30_000),
  });
  const json: { ok?: boolean; path?: string; error?: string } | null = await response.json().catch(() => null);
  if (!response.ok || !json?.ok || !json.path) throw new Error(json?.error || `Couldn't store the backdrop (${response.status})`);
  return json.path;
}
