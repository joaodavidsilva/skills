import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { getFrameFile, getFrames } from "./routes/frames.ts";
import { getProject, postProject } from "./routes/project.ts";
import { postUpload } from "./routes/upload.ts";
import { postUploadFont } from "./routes/upload-font.ts";
import { serveAsset } from "./serve-asset.ts";

export type RouteContext = { root: string; params: Record<string, string> };
type Handler = (req: Request, context: RouteContext) => Response | Promise<Response>;
type Route = { method: "GET" | "POST"; pattern: RegExp; handler: Handler };

const IMAGE_TYPES = { png: "image/png", jpg: "image/jpeg" };
const FONT_TYPES = { woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf" };

// The editor's whole server surface. Paths match the URLs the client calls.
const ROUTES: Route[] = [
  { method: "GET", pattern: /^\/api\/project$/, handler: getProject },
  { method: "POST", pattern: /^\/api\/project$/, handler: postProject },
  { method: "GET", pattern: /^\/api\/frames$/, handler: getFrames },
  { method: "POST", pattern: /^\/api\/upload$/, handler: postUpload },
  { method: "POST", pattern: /^\/api\/upload-font$/, handler: postUploadFont },
  { method: "GET", pattern: /^\/frames\/(?<filename>[^/]+)$/, handler: getFrameFile },
  {
    method: "GET",
    pattern: /^\/screenshots\/uploaded\/(?<filename>[^/]+)$/,
    handler: (_req, { root, params }) => serveAsset(root, "screenshots/uploaded", params.filename, IMAGE_TYPES),
  },
  {
    method: "GET",
    pattern: /^\/fonts\/imported\/(?<filename>[^/]+)$/,
    handler: (_req, { root, params }) => serveAsset(root, "fonts/imported", params.filename, FONT_TYPES),
  },
];

function decode(value: string | undefined): string | null {
  if (value === undefined) return "";
  try { return decodeURIComponent(value); } catch { return null; }
}

/** Connect-style middleware: answers the editor's routes, passes everything else on. */
export function apiMiddleware(root: string) {
  return async (req: IncomingMessage, res: ServerResponse, next: (error?: unknown) => void) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const method = (req.method ?? "GET").toUpperCase();
    const head = method === "HEAD";
    const verb = head ? "GET" : method;
    const matches = ROUTES.filter((route) => route.pattern.test(url.pathname));
    if (!matches.length) return next();
    const route = matches.find((candidate) => candidate.method === verb);
    if (!route) {
      res.statusCode = 405;
      res.setHeader("Allow", matches.map((candidate) => candidate.method).join(", "));
      res.end();
      return;
    }
    const filename = decode(route.pattern.exec(url.pathname)?.groups?.filename);
    if (filename === null) {
      res.statusCode = 404;
      res.end();
      return;
    }
    try {
      const body = verb === "GET" ? undefined : (Readable.toWeb(req) as unknown as ReadableStream<Uint8Array>);
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (Array.isArray(value)) value.forEach((entry) => headers.append(key, entry));
        else if (value !== undefined) headers.set(key, value);
      }
      const request = new Request(url, { method: verb, headers, body, duplex: "half" } as RequestInit);
      const response = await route.handler(request, { root, params: { filename } });
      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(head ? undefined : Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      if (res.headersSent) return res.destroy(error instanceof Error ? error : undefined);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
    }
  };
}
