import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { projectValidationError } from "../../src/lib/project-validation.ts";
import { rejectCrossSiteWrite } from "../request-guard.ts";
import { readJsonBody } from "../request-body.ts";
import type { RouteContext } from "../router.ts";

const PROJECT_FILE = "app-store-screenshots.json";

const revision = (raw: string | null) => `"${raw === null ? "missing" : createHash("sha256").update(raw).digest("hex")}"`;
let writes: Promise<unknown> = Promise.resolve();

export async function getProject(_req: Request, { root }: RouteContext) {
  try {
    const raw = await fs.readFile(path.join(root, PROJECT_FILE), "utf8");
    const parsed = JSON.parse(raw);
    const validationError = projectValidationError(parsed);
    if (validationError) throw new Error(validationError);
    return Response.json({ ok: true, state: parsed }, { headers: { ETag: revision(raw), "Cache-Control": "no-store" } });
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return Response.json({ ok: true, state: null }, { headers: { ETag: revision(null), "Cache-Control": "no-store" } });
    }
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function postProject(req: Request, { root }: RouteContext) {
  // This route OVERWRITES a git-tracked file. See request-guard.ts.
  const blocked = rejectCrossSiteWrite(req);
  if (blocked) {
    return Response.json({ ok: false, error: blocked.error }, { status: blocked.status });
  }
  const parsed = await readJsonBody(req, 64 * 1024 * 1024);
  if (parsed.response) return parsed.response;
  const body = parsed.value;
  const validationError = projectValidationError(body);
  if (validationError) {
    return Response.json({ ok: false, error: validationError }, { status: 400 });
  }
  // Compare and replace in one queue so two tabs cannot both save the same
  // revision. CLI writers may omit If-Match for backwards compatibility.
  const result = writes.then(() => writeProject(root, body, req.headers.get("if-match")));
  writes = result.catch(() => undefined);
  return result;
}

async function writeProject(root: string, body: unknown, expected: string | null) {
  const target = path.join(root, PROJECT_FILE);
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    if (expected !== null) {
      let current: string | null;
      try { current = await fs.readFile(target, "utf8"); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        current = null;
      }
      if (expected !== revision(current)) {
        return Response.json(
          { ok: false, error: "Project changed in another tab or on disk. Your edits are still open here; export or copy them before reloading." },
          { status: 412 },
        );
      }
    }
    const pretty = JSON.stringify(body, null, 2) + "\n";
    // Readers must see either the previous complete project or the next one.
    await fs.writeFile(temporary, pretty, "utf8");
    await fs.rename(temporary, target);
    return Response.json({ ok: true }, { headers: { ETag: revision(pretty) } });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  } finally {
    await fs.unlink(temporary).catch(() => undefined);
  }
}
