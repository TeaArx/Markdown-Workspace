import { resolve } from "node:path";

import vue from "@vitejs/plugin-vue";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/main",
      lib: {
        entry: resolve(__dirname, "src/index.ts"),
        formats: ["cjs"],
        fileName: () => "index.js",
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/preload",
      lib: {
        entry: resolve(__dirname, "src/preload.ts"),
        formats: ["cjs"],
        fileName: () => "preload.js",
      },
    },
  },
  renderer: {
    root: "src",
    plugins: [vue()],
    build: {
      outDir: resolve(__dirname, "out/renderer"),
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(__dirname, "src/index.html"),
      },
    },
  },
});
