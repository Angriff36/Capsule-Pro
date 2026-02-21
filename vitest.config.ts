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
    alias: [
      // Exact match aliases for apps/api when running tests from root
      // Must come before the generic @/app pattern
      {
        find: /^@\/lib\/manifest-runtime$/,
        replacement: resolve(__dirname, "apps/api/lib/manifest-runtime"),
      },
      {
        find: /^@\/app\/lib\/tenant$/,
        replacement: resolve(__dirname, "apps/api/app/lib/tenant"),
      },
      {
        find: /^@\/app\/api\/(.*)$/,
        replacement: resolve(__dirname, "apps/api/app/api/$1"),
      },
      // Generic aliases
      {
        find: "server-only",
        replacement: resolve(__dirname, "test/stubs/server-only.ts"),
      },
      {
        find: "@testing-library/jest-dom/vitest",
        replacement: resolve(__dirname, "test/stubs/jest-dom.ts"),
      },
      {
        find: "@/app",
        replacement: resolve(__dirname, "apps/app/app"),
      },
    ],
  },
  projects: [
    {
      name: "app",
      root: "./apps/app",
    },
    {
      name: "api",
      root: "./apps/api",
      config: "./vitest.config.ts",
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
