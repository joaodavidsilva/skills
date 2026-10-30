import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { writeAsset } from "./write-asset.ts";

const UPLOAD_DIR_REL = path.join("public", "screenshots", "uploaded");
const PUBLIC_PREFIX = "/screenshots/uploaded";

/**
 * Writes validated image bytes under `public/screenshots/uploaded/<hash>.<ext>`
 * and returns the URL the editor stores in the project. The name is the content
 * hash, so storing the same image twice is one file. The caller owns validation.
 */
export async function storeImage(root: string, bytes: Buffer, ext: "png" | "jpg"): Promise<string> {
  const hash = createHash("sha1").update(bytes).digest("hex").slice(0, 16);
  const filename = `${hash}.${ext}`;
  const absDir = path.join(root, UPLOAD_DIR_REL);
  await fs.mkdir(absDir, { recursive: true });
  await writeAsset(path.join(absDir, filename), bytes);
  return `${PUBLIC_PREFIX}/${filename}`;
}
