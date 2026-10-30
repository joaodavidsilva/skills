import {
  BACKDROP_ASPECTS,
  BACKDROP_ELEMENT_ID,
  type BackdropAspect,
  type BackdropModelId,
  type BackdropSize,
} from "./backdrop-options";
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

// Where the headline and the device sit, so the art keeps that band calm.
// Stated as the target to reach, not as things to avoid.
function compositionCue(layout: Slide["layout"]): string {
  switch (layout) {
    case "device-top":
      return "Keep the bottom third calm and low in detail, because a headline sits there; the upper two thirds can carry more light and texture, because a phone covers them.";
    case "no-device":
      return "Keep the central band calm and low in detail, because a large headline sits there; the edges can carry more light and texture.";
    case "split-landscape":
      return "Keep the left half calm and low in detail, because a headline sits there; the right half can carry more light and texture, because a device covers it.";
    case "feature-graphic":
      return "Keep the whole image calm and low in detail.";
    default:
      return "Keep the top third calm and low in detail, because a headline sits there; the lower two thirds can carry more light and texture, because a phone covers them.";
  }
}

/**
 * The prompt sent to the model. Only this text leaves the machine: no
 * screenshot, no project file. The model paints the backdrop alone; the editor
 * composes the real capture, the frame and the headline on top.
 */
export function backdropPrompt(input: { idea: string; theme: Theme; slide: Slide }): string {
  const { idea, theme, slide } = input;
  const base = slide.inverted ? theme.bgAlt : theme.bg;
  return [
    "A backdrop image for an app store screenshot: a wordless, interface-free abstract scene made of light, colour and soft shapes.",
    `Look and mood: ${idea.trim() || "calm, refined and modern"}.`,
    `Palette: base colour ${base} with ${theme.accent} as the accent.`,
    compositionCue(slide.layout),
    "Prefer broad gradients and large soft shapes over fine texture, so the image stays clean when enlarged.",
    "Nothing in the image is a letter, a number, a logo, a phone, a screen, a hand or a person.",
  ].join("\n");
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
      const json = (await response.json()) as BackdropStatus & { ok?: boolean };
      return response.ok && json.ok ? json : { available: false, models: [], sizes: [] };
    })
    .catch(() => ({ available: false, models: [], sizes: [] }));
  return status;
}

export type GeneratedBackdrop = { path: string; width: number; height: number; model: string };

/** One paid image request. Throws with the server's own message on failure. */
export async function generateBackdrop(request: {
  prompt: string;
  aspectRatio: BackdropAspect;
  size: BackdropSize;
  model: BackdropModelId;
  signal?: AbortSignal;
}): Promise<GeneratedBackdrop> {
  const { signal, ...body } = request;
  const response = await fetch("/api/backdrop", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(190_000),
  });
  const json = (await response.json().catch(() => null)) as (GeneratedBackdrop & { ok?: boolean; error?: string }) | null;
  if (!response.ok || !json?.ok) throw new Error(json?.error || `Backdrop request failed (${response.status})`);
  return json;
}
