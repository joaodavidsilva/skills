import type { Plugin } from "vite";
import { apiMiddleware } from "./router.ts";

/** Serves the editor's local API (project file, uploads, bezels) from the Vite
 * dev and preview servers, rooted at the project directory. */
export function screenshotsApi(): Plugin {
  let root = process.cwd();
  return {
    name: "app-store-screenshots-api",
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      server.middlewares.use(apiMiddleware(root));
    },
    configurePreviewServer(server) {
      server.middlewares.use(apiMiddleware(root));
    },
  };
}
