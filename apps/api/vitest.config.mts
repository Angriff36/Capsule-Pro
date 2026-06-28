import path from "node:path";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "vitest-database-mock",
      enforce: "pre",
      resolveId(id, importer) {
        // Intercept imports to the database package (multiple patterns)
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
        // Intercept imports to the database generated client - multiple patterns
        const normalizedId = id.replace(/\\/g, "/");
        if (
          id.includes("database/generated/client") ||
          id.includes("generated\\client") ||
          normalizedId.includes("database/generated/client") ||
          normalizedId.includes("packages/database/generated") ||
          normalizedId.endsWith("/generated/client") ||
          normalizedId.endsWith("\\generated\\client") ||
          id.includes("packages\\database\\generated\\client") ||
          id.includes("packages/database/generated/client") ||
          (importer?.includes("database") && id.includes("generated/client"))
        ) {
          return path.resolve(
            import.meta.dirname,
            "./test/mocks/@repo/generated/client.ts"
          );
        }
        return;
      },
      load(id) {
        // Intercept loading of the actual database index.ts file
        if (
          id.includes("\\packages\\database\\index.ts") ||
          id.includes("/packages/database/index.ts") ||
          id.includes("packages/database/index.js")
        ) {
          // Return the mock content directly instead of loading the actual file
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
        return;
      },
    },
  ],
  test: {
    environment: "jsdom",
    globals: true,
    restoreMocks: true,
    setupFiles: ["./test/setup.ts"],
    include: ["**/__tests__/**/*.test.{ts,tsx,js}"],
    // Quarantined tests: *.quarantine.test.ts files are isolated from the
    // blocking test run. They still exist on disk + run via `pnpm test:quarantine`
    // for advisory output. See ci/DRAIN.md for how to retire a quarantined file.
    exclude: [
      // Restore vitest's built-in excludes (node_modules, dist, etc.). Specifying a
      // custom `exclude` REPLACES the defaults, which previously let dependency-shipped
      // tests (e.g. @repo/manifest-runtime's dist/__tests__ via the workspace symlink)
      // leak into this app's suite. See constitution §4a — the package is sanctioned,
      // but we do not run its internal tests here.
      ...configDefaults.exclude,
      "**/__tests__/**/*.integration.test.{ts,tsx,js}",
      "**/__tests__/**/*.quarantine.test.{ts,tsx,js}",
    ],
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
