import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Quarantine-specific vitest config — removes the quarantine exclude pattern
// so quarantined tests can actually run. Used by `pnpm test:quarantine`.
// See ci/DRAIN.md for the quarantine drain process.
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
          normalizedId.endsWith("/generated/client") ||
          normalizedId.endsWith("\\generated/client") ||
          id.includes("packages\\database\\generated\\client") ||
          id.includes("packages/database/generated/client") ||
          (importer?.includes("database") && id.includes("generated/client"))
        ) {
          return path.resolve(
            import.meta.dirname,
            "./test/mocks/@repo/generated/client.ts"
          );
        }
        return undefined;
      },
      load(id) {
        if (
          id.includes("\\packages\\database\\index.ts") ||
          id.includes("/packages/database/index.ts") ||
          id.includes("packages/database/index.js")
        ) {
          return `
            export const Prisma = {
              sql: () => ({}),
              PrismaClient: class {},
            };
            export const PrismaClient = class {};
            export const database = { $queryRaw: () => {} };
            export const tenantDatabase = () => ({});
          `;
        }
        return undefined;
      },
    },
  ],
  test: {
    environment: "jsdom",
    globals: true,
    restoreMocks: true,
    setupFiles: ["./test/setup.ts"],
    include: ["**/__tests__/**/*.quarantine.test.{ts,tsx,js}"],
    // Only exclude integration tests — quarantine tests ARE the target
    exclude: ["**/__tests__/**/*.integration.test.{ts,tsx,js}"],
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
