import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    include: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    exclude: ["**/e2e/**", "**/node_modules/**"],
  },
  resolve: {
    alias: {
      "server-only": resolve(__dirname, "test/stubs/server-only.ts"),
      "@testing-library/jest-dom/vitest": resolve(
        __dirname,
        "test/stubs/jest-dom.ts"
      ),
      "@/app": resolve(__dirname, "apps/app/app"),
    },
  },
  projects: [
    {
      name: "app",
      root: "./apps/app",
    },
    {
      name: "api",
      root: "./apps/api",
    },
    {
      name: "web",
      root: "./apps/web",
    },
    {
      name: "database",
      root: "./packages/database",
    },
    {
      name: "payroll-engine",
      root: "./packages/payroll-engine",
    },
    {
      name: "realtime",
      root: "./packages/realtime",
    },
    {
      name: "sales-reporting",
      root: "./packages/sales-reporting",
    },
  ],
});
