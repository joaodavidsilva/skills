import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { rejectCrossSiteWrite, sniffImageType } from "../request-guard.ts";
import { decodeBase64, readJsonBody } from "../request-body.ts";
import { writeAsset } from "../write-asset.ts";
import type { RouteContext } from "../router.ts";

const UPLOAD_DIR_REL = path.join("public", "screenshots", "uploaded");
const PUBLIC_PREFIX = "/screenshots/uploaded";

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
};

function parseDataUrl(dataUrl: string): { mime: string; bytes: Buffer } | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const bytes = decodeBase64(m[2]);
  return bytes ? { mime, bytes } : null;
}

export async function postUpload(req: Request, { root }: RouteContext) {
  // This route WRITES A FILE to disk. See request-guard.ts.
  const blocked = rejectCrossSiteWrite(req);
  if (blocked) {
    return Response.json({ ok: false, error: blocked.error }, { status: blocked.status });
  }
  const input = await readJsonBody(req, 12 * 1024 * 1024);
  if (input.response) return input.response;
  const body = input.value as { dataUrl?: string } | null;
  if (!body?.dataUrl || typeof body.dataUrl !== "string") {
    return Response.json({ ok: false, error: "Missing dataUrl" }, { status: 400 });
  }
  const parsed = parseDataUrl(body.dataUrl);
  if (!parsed) {
    return Response.json({ ok: false, error: "Unsupported data URL" }, { status: 400 });
  }
  const ext = MIME_EXT[parsed.mime];
  if (!ext) {
    return Response.json(
      { ok: false, error: `Unsupported mime: ${parsed.mime}` },
      { status: 400 },
    );
  }
  // The declared MIME comes from the caller-written data URL, so it decides
  // the stored extension. Require the bytes to actually be that image type.
  const sniffed = sniffImageType(parsed.bytes);
  if (!sniffed || MIME_EXT[sniffed] !== ext) {
    return Response.json(
      { ok: false, error: "Content does not match declared image type" },
      { status: 400 },
    );
  }
  if (parsed.bytes.byteLength > 8 * 1024 * 1024) {
    return Response.json({ ok: false, error: "Image too large (>8MB)" }, { status: 413 });
  }

  try {
    // Decode pixels too: valid headers alone still accept truncated images.
    await sharp(parsed.bytes, { limitInputPixels: 64 * 1024 * 1024, failOn: "warning" }).stats();
  } catch {
    return Response.json({ ok: false, error: "Image is corrupt or exceeds 64 megapixels" }, { status: 400 });
  }

  const hash = createHash("sha1").update(parsed.bytes).digest("hex").slice(0, 16);
  const filename = `${hash}.${ext}`;
  const absDir = path.join(root, UPLOAD_DIR_REL);
  const absFile = path.join(absDir, filename);

  try {
    await fs.mkdir(absDir, { recursive: true });
    await writeAsset(absFile, parsed.bytes);
    return Response.json({ ok: true, path: `${PUBLIC_PREFIX}/${filename}` });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
