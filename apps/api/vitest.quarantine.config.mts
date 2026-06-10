import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "vitest-database-mock",
      enforce: "pre",
      resolveId(id, importer) {
        if (
          id === "@repo/database" ||
          id.endsWith("\\packages\\database") ||
          id.endsWith("/packages/database") ||
          (importer?.includes("auto-assignment") && id.includes("database"))
        ) {
          return path.resolve(
            import.meta.dirname,
            "./test/mocks/@repo/database.ts"
          );
        }
        const normalizedId = id.replace(/\\/g, "/");
        if (
          id.includes("database/generated/client") ||
          id.includes("generated\\client") ||
          normalizedId.includes("database/generated/client") ||
          normalizedId.includes("packages/database/generated") ||
          normalizedId.includes("packages/database/src")
        ) {
          return path.resolve(
            import.meta.dirname,
            "./test/mocks/@repo/generated/client.ts"
          );
        }
        if (
          id === "@repo/database/index" ||
          id === "@repo/database/standalone"
        ) {
          return path.resolve(
            import.meta.dirname,
            "./test/mocks/@repo/database.ts"
          );
        }
        // Intercept @repo/database/keys imports
        if (
          id === "@repo/database/keys" ||
          normalizedId.includes("packages/database/keys")
        ) {
          return path.resolve(
            import.meta.dirname,
            "./test/mocks/@repo/database.ts"
          );
        }
        return null;
      },
    },
  ],
  test: {
    environment: "jsdom",
    globals: true,
    restoreMocks: true,
    setupFiles: ["./test/setup.ts"],
    include: ["**/__tests__/**/*.quarantine.test.{ts,tsx,js}"],
    exclude: [
      "**/__tests__/**/*.integration.test.{ts,tsx,js}",
    ],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./"),
      "server-only": path.resolve(
        import.meta.dirname,
        "./test/mocks/server-only.ts"
      ),
    },
  },
  optimizeDeps: {
    exclude: ["@repo/database"],
  },
});
