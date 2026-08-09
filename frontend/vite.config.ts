import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const poseTestEntry = new URL("./src/pose-test/main.ts", import.meta.url);
const cookieNoticeEntry = new URL(
  "./src/site/cookie-notice.ts",
  import.meta.url,
);
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
      input: {
        "cookie-notice": fileURLToPath(cookieNoticeEntry),
        "pose-test": fileURLToPath(poseTestEntry),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
