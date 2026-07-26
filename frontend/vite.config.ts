import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const poseTestEntry = new URL("./src/pose-test/main.ts", import.meta.url);
const djangoStaticOutput = new URL(
  "../game/static/game/vite/",
  import.meta.url,
);

export default defineConfig({
  base: "./",
  build: {
    outDir: fileURLToPath(djangoStaticOutput),
    emptyOutDir: true,
    sourcemap: true,
    rolldownOptions: {
      input: fileURLToPath(poseTestEntry),
      output: {
        entryFileNames: "pose-test.js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
