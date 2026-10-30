import { promises as fs } from "node:fs";
import path from "node:path";

/** Reads uploads from disk on every request: files written after the editor
 * started (or after `vite build`) are not part of any bundled asset index. */
export async function serveAsset(root: string, directory: string, filename: string, types: Record<string, string>) {
  const match = /^[a-f0-9]{16}\.([a-z0-9]+)$/.exec(filename);
  if (!match || !Object.hasOwn(types, match[1])) return new Response(null, { status: 404 });
  try {
    const bytes = await fs.readFile(path.join(root, "public", directory, filename));
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": types[match[1]],
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Response(null, { status: 404 });
    return Response.json({ ok: false, error: "Asset could not be read" }, { status: 500 });
  }
}
