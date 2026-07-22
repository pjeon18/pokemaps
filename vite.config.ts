import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

/** Dev-only: serve curated/*.json to the internal region editor
 * (tools/region-editor/). Never part of the production build. */
function curatedForEditor(): Plugin {
  return {
    name: "wheremon-curated-for-editor",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/curated", (req, res, next) => {
        const file = path.join(ROOT, "curated", (req.url ?? "").replace(/^\//, "").split("?")[0]);
        if (file.endsWith(".json") && fs.existsSync(file)) {
          res.setHeader("content-type", "application/json");
          res.end(fs.readFileSync(file));
        } else next();
      });
    },
  };
}

// BASE_PATH is set by the Pages workflow ("/wheremon/"); dev/local builds use "/".
export default defineConfig(() => ({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), curatedForEditor()],
}));
