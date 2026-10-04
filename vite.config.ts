import { defineConfig, type Plugin } from "vite";
import { rmSync } from "node:fs";
import { resolve } from "node:path";

/** Review copies of style studies live in public/art/_study for the dev server only; never ship them. */
function dropStudies(): Plugin {
  return {
    name: "drop-art-studies",
    apply: "build",
    closeBundle() {
      rmSync(resolve(__dirname, "dist/art/_study"), { recursive: true, force: true });
    },
  };
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "./",
  server: { strictPort: true },
  build: { target: "es2022", assetsInlineLimit: 0, chunkSizeWarningLimit: 4000 },
  plugins: [dropStudies()],
});
