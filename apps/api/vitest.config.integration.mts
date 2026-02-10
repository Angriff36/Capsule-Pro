import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Vitest configuration for integration tests that require real database access.
 *
 * This config does NOT mock the database, allowing tests to run against
 * the actual Neon database. Use this for integration tests that need to
 * verify database interactions, transactions, and outbox writes.
 *
 * To run integration tests:
 *   pnpm test:integration
 *
 * Or run specific integration test files:
 *   pnpm vitest --config vitest.config.integration.mts <test-file>
 */
export default defineConfig({
  plugins: [
    react(),
    {
      name: "vitest-integration-setup",
      enforce: "pre",
      resolveId(id, importer) {
        // Mock server-only for Node environment tests
        if (id === "server-only") {
          return path.resolve(
            import.meta.dirname,
            "./test/mocks/server-only.ts"
          );
        }
        // DO NOT intercept database imports for integration tests
        // We want the real database connection
        return undefined;
      },
      load(id) {
        // DO NOT mock database loads
        return undefined;
      },
    },
  ],
  test: {
    environment: "node", // Use node environment for database access
    setupFiles: ["./test/setup.integration.ts"],
    include: ["**/__tests__/**/*.integration.test.{ts,tsx,js}"],
    // Only run tests that end with .integration.test.ts
    name: "integration",
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
    // Disable optimization for database to ensure real connection
    disable: process.env.VITEST === "true",
  },
});
