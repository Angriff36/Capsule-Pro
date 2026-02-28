import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      // Integration tests run with vitest.config.integration.mts
      "**/*.integration.test.{ts,tsx}",
    ],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
      "server-only": resolve(__dirname, "./test/mocks/server-only.ts"),
      "@repo/database": resolve(__dirname, "./test/mocks/@repo/database.ts"),
    },
  },
});
