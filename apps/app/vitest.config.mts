import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    // API route tests need node environment (server-only), most specific first
    environmentMatchGlobs: [
      ["**/__tests__/api/**/*.test.{ts,js}", "node"],
      ["**/__tests__/api/**/*.test.{tsx,jsx}", "node"],
    ],
    // Default to jsdom for everything else
    environment: "jsdom",
    include: ["**/__tests__/**/*.test.{ts,tsx,js,jsx}"],
    exclude: ["**/e2e/**", "**/node_modules/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@repo": path.resolve(__dirname, "../../packages"),
      "server-only": path.resolve(__dirname, "__tests__/mocks/server-only.ts"),
    },
  },
  optimizeDeps: {
    include: ["server-only"],
  },
});
