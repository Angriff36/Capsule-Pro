import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    exclude: ["**/node_modules/**"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});
