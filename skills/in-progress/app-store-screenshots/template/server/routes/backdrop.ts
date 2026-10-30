import sharp from "sharp";
import {
  BACKDROP_ASPECTS,
  BACKDROP_MODELS,
  BACKDROP_PROMPT_MAX,
  BACKDROP_SIZES,
  DEFAULT_BACKDROP_MODEL,
  DEFAULT_BACKDROP_SIZE,
} from "../../src/lib/backdrop-options.ts";
import { rejectCrossSiteWrite, sniffImageType } from "../request-guard.ts";
import { readJsonBody } from "../request-body.ts";
import { storeImage } from "../store-image.ts";
import type { RouteContext } from "../router.ts";

// Optional extra: paints a slide backdrop with Google's image API. The editor
// works without it. The key lives only in this process's environment, only the
// text prompt leaves the machine (never a screenshot), and every call is one
// paid request the user confirmed in the browser.

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const UPSTREAM_TIMEOUT_MS = 170_000;
const MAX_UPSTREAM_BYTES = 64 * 1024 * 1024;
const MAX_IN_FLIGHT = 2;
let inFlight = 0;

const apiKey = () => (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
// Overridable so tests can point at a local fake instead of spending money.
const baseUrl = () => (process.env.GEMINI_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");

const fail = (status: number, error: string) => Response.json({ ok: false, error }, { status });

export function getBackdropStatus() {
  return Response.json({
    ok: true,
    available: apiKey() !== "",
    models: BACKDROP_MODELS.map(({ id, label }) => ({ id, label })),
    sizes: BACKDROP_SIZES,
  });
}

type Body = { prompt?: unknown; aspectRatio?: unknown; size?: unknown; model?: unknown };

/** Text of Google's error body, bounded; the API does not echo the key. */
async function upstreamError(response: Response) {
  const text = (await response.text().catch(() => "")).slice(0, 2000);
  let message = text.trim();
  try {
    const parsed = JSON.parse(text) as { error?: { message?: unknown } };
    if (typeof parsed.error?.message === "string") message = parsed.error.message;
  } catch { /* not JSON: keep the text */ }
  return `Image API answered ${response.status}${message ? `: ${message.slice(0, 300)}` : ""}`;
}

type Step = { type?: string; content?: { type?: string; data?: string; text?: string }[] };

function extractImage(result: { steps?: Step[] }): Buffer | string {
  const notes: string[] = [];
  const steps = Array.isArray(result.steps) ? result.steps : [];
  for (const step of steps) {
    if (step.type !== "model_output") continue;
    for (const block of Array.isArray(step.content) ? step.content : []) {
      if (block.type === "image" && block.data) return Buffer.from(block.data, "base64");
      if (block.type === "text" && block.text) notes.push(block.text);
    }
  }
  return `The model returned no image${notes.length ? `: ${notes.join(" ").slice(0, 200)}` : ""}`;
}

export async function postBackdrop(req: Request, { root }: RouteContext) {
  // Spends money and writes a file: same-origin JSON only. See request-guard.ts.
  const blocked = rejectCrossSiteWrite(req);
  if (blocked) return fail(blocked.status, blocked.error);

  const key = apiKey();
  if (!key) {
    return fail(503, "No GEMINI_API_KEY in the environment of this server. Export it in the shell that runs the editor, then restart.");
  }

  const input = await readJsonBody(req, 64 * 1024);
  if (input.response) return input.response;
  const body = (input.value ?? {}) as Body;
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt || prompt.length > BACKDROP_PROMPT_MAX) {
    return fail(400, `prompt must be 1 to ${BACKDROP_PROMPT_MAX} characters`);
  }
  const aspect = (BACKDROP_ASPECTS as readonly unknown[]).includes(body.aspectRatio) ? (body.aspectRatio as string) : null;
  if (!aspect) return fail(400, `aspectRatio must be one of ${BACKDROP_ASPECTS.join(", ")}`);
  const size = body.size === undefined ? DEFAULT_BACKDROP_SIZE : body.size;
  if (!(BACKDROP_SIZES as readonly unknown[]).includes(size)) return fail(400, `size must be one of ${BACKDROP_SIZES.join(", ")}`);
  const modelId = body.model === undefined ? DEFAULT_BACKDROP_MODEL : body.model;
  const model = BACKDROP_MODELS.find((candidate) => candidate.id === modelId);
  if (!model) return fail(400, `model must be one of ${BACKDROP_MODELS.map((m) => m.id).join(", ")}`);

  if (inFlight >= MAX_IN_FLIGHT) return fail(429, "Two backdrops are already being generated. Wait for one to finish.");
  inFlight += 1;
  try {
    let response: Response;
    try {
      response = await fetch(`${baseUrl()}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          model: model.api,
          input: [{ type: "text", text: prompt }],
          response_format: { type: "image", aspect_ratio: aspect, image_size: size },
        }),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      return fail(504, timedOut ? "The image API did not answer in time. Nothing was stored; try again." : "Couldn't reach the image API. Check the connection.");
    }
    if (!response.ok) return fail(502, await upstreamError(response));
    if (Number(response.headers.get("content-length")) > MAX_UPSTREAM_BYTES) return fail(502, "The image API answered with an oversized response");

    let result: { steps?: Step[] };
    try {
      result = JSON.parse(await response.text()) as { steps?: Step[] };
    } catch {
      return fail(502, "The image API answered with something that is not JSON");
    }
    const image = extractImage(result);
    if (typeof image === "string") return fail(502, image);

    // Store what arrived. PNG and JPEG are what the asset route serves; convert
    // anything else (the API may return WebP) rather than store a file it cannot.
    let bytes = image;
    const ext: "png" | "jpg" = sniffImageType(bytes) === "image/png" ? "png" : "jpg";
    try {
      if (!sniffImageType(bytes)) bytes = await sharp(bytes, { limitInputPixels: 64 * 1024 * 1024 }).jpeg({ quality: 92 }).toBuffer();
      const meta = await sharp(bytes, { limitInputPixels: 64 * 1024 * 1024, failOn: "warning" }).metadata();
      if (!meta.width || !meta.height) throw new Error("no dimensions");
      if (bytes.byteLength > 24 * 1024 * 1024) return fail(502, "The generated image is larger than 24 MB. Try a smaller size.");
      const path = await storeImage(root, bytes, ext);
      return Response.json({ ok: true, path, width: meta.width, height: meta.height, model: model.id, bytes: bytes.byteLength });
    } catch {
      return fail(502, "The model returned an image that could not be read");
    }
  } finally {
    inFlight -= 1;
  }
}
