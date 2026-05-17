import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    restoreMocks: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: ["node_modules", "tests"],
    },
  },
});
