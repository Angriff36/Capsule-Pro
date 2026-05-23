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
    // Quarantined tests: *.quarantine.test.ts files are isolated from the
    // blocking test run. See ci/DRAIN.md for how to retire a quarantined file.
    exclude: ["__tests__/**/*.quarantine.test.ts"],
    testTimeout: 10_000,
  },
});
