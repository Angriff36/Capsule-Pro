import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@repo/manifest-adapters": resolve(import.meta.dirname, "src/index.ts"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    restoreMocks: true,
    include: ["__tests__/**/*.test.ts"],
    testTimeout: 10_000,
  },
});
