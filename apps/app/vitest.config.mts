import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    // API route tests need node environment (server-only), most specific first
    environmentMatchGlobs: [
      ['**/__tests__/api/**/*.test.ts', 'node'],
      ['**/__tests__/api/**/*.test.tsx', 'node'],
    ],
    // Default to jsdom for everything else
    environment: "jsdom",
    exclude: ["**/e2e/**", "**/node_modules/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@repo": path.resolve(__dirname, "../../packages"),
    },
  },
});
