import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { screenshotsApi } from "./server/plugin.ts";

export default defineConfig({
  plugins: [react(), screenshotsApi()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  server: {
    // The editor rewrites these while running; reloading the page on each
    // autosave or upload would throw away the open session.
    watch: { ignored: ["**/app-store-screenshots.json", "**/public/screenshots/**", "**/public/fonts/imported/**"] },
  },
});
