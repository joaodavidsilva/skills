import { promises as fs } from "node:fs";
import path from "node:path";
import { FRAME_FILES, type FrameFile, type MeasuredFrame } from "../../src/lib/frame-assets.ts";
import { measureFrame } from "../measure-frame.ts";
import type { RouteContext } from "../router.ts";

const FRAMES_DIR = path.join("public", "frames");

// Measurements keyed by file and modification time: replacing a PNG re-measures it.
const cache = new Map<string, MeasuredFrame>();

/** Which Apple bezels the user has added to public/frames/, measured. */
export async function getFrames(_req: Request, { root }: RouteContext) {
  const frames: Partial<Record<FrameFile, MeasuredFrame>> = {};
  const errors: Partial<Record<FrameFile, string>> = {};
  await Promise.all(FRAME_FILES.map(async (name) => {
    const file = path.join(root, FRAMES_DIR, `${name}.png`);
    try {
      const stat = await fs.stat(file);
      const version = Math.round(stat.mtimeMs).toString(36);
      const key = `${name}:${version}:${stat.size}`;
      let frame = cache.get(key);
      if (!frame) {
        frame = await measureFrame(await fs.readFile(file), `/frames/${name}.png?v=${version}`);
        cache.set(key, frame);
      }
      frames[name] = frame;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      errors[name] = `public/frames/${name}.png: ${error instanceof Error ? error.message : String(error)}`;
    }
  }));
  return Response.json({ ok: true, frames, errors }, { headers: { "Cache-Control": "no-store" } });
}

/** Served at runtime so a bezel swapped after `vite build` is picked up. */
export async function getFrameFile(_req: Request, { root, params }: RouteContext) {
  const filename = params.filename;
  const name = filename.replace(/\.png$/, "");
  if (!filename.endsWith(".png") || !(FRAME_FILES as readonly string[]).includes(name)) {
    return new Response(null, { status: 404 });
  }
  try {
    const bytes = await fs.readFile(path.join(root, FRAMES_DIR, filename));
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": "image/png",
      "Content-Length": String(bytes.length),
      // The URL carries ?v=<mtime>, so a replaced file gets a new URL.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Response(null, { status: 404 });
    return Response.json({ ok: false, error: "Frame could not be read" }, { status: 500 });
  }
}
