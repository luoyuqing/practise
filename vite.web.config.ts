import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * Vite config for web-only build (no Tauri).
 *
 * Usage: `npx vite build --config vite.web.config.ts`
 *
 * This config:
 * - Aliases @tauri-apps modules to stubs so they don't crash at runtime
 * - Outputs to dist/ for the Node.js Express server to serve
 * - Removes Tauri-specific server options
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@tauri-apps/api/core": path.resolve(__dirname, "src/utils/tauriStubs.js"),
      "@tauri-apps/api/event": path.resolve(__dirname, "src/utils/tauriStubs.js"),
      "@tauri-apps/plugin-dialog": path.resolve(__dirname, "src/utils/tauriStubs.js"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    testTimeout: 15000,
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: false,
    host: false,
  },
});