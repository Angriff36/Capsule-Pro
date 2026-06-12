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
        // Normalize path separators once so checks stay platform-agnostic.
        const normalizedId = id.replace(/\\/g, "/");
        const normalizedImporter = importer?.replace(/\\/g, "/");
        // Intercept imports to the database package
        if (
          id === "@repo/database" ||
          normalizedId.includes("packages/database") ||
          (normalizedImporter &&
            (normalizedImporter.includes("recipes") ||
              normalizedImporter.includes("menus")) &&
            normalizedId.includes("database"))
        ) {
          return path.resolve(
            import.meta.dirname,
            "./test/mocks/@repo/database.ts"
          );
        }
        // Intercept imports to the database generated client
        if (
          normalizedId.includes("database/generated/client") ||
          normalizedId.includes("packages/database/generated") ||
          normalizedId.endsWith("/generated/client") ||
          (normalizedImporter?.includes("database") &&
            normalizedId.includes("generated/client"))
        ) {
          return path.resolve(
            import.meta.dirname,
            "./test/mocks/@repo/generated/client.ts"
          );
        }
        // Intercept storage package
        if (
          id === "@repo/storage" ||
          normalizedId.includes("packages/storage")
        ) {
          return path.resolve(
            import.meta.dirname,
            "./test/mocks/@repo/storage.ts"
          );
        }
        // Intercept @clerk/nextjs
        if (id === "@clerk/nextjs") {
          return path.resolve(
            import.meta.dirname,
            "./test/mocks/@clerk/nextjs.tsx"
          );
        }
        return;
      },
      load(id) {
        const normalizedId = id.replace(/\\/g, "/");
        // Intercept loading of the actual database index.ts file
        if (
          normalizedId.includes("/packages/database/index.ts") ||
          normalizedId.includes("packages/database/index.js")
        ) {
          // Return the mock content directly instead of loading the actual file
          // This mocks all the imports and exports from the real database/index.ts
          return `
            import { vi } from "vitest";

            export const Prisma = {
              sql: () => ({ strings: [], values: [] }),
              join: () => "",
              empty: {},
              PrismaClient: vi.fn(),
            };

            export const PrismaClient = vi.fn();

            const mockFn = vi.fn();
            export const database = {
              $queryRaw: mockFn,
              $transaction: mockFn,
              $connect: mockFn,
              $disconnect: mockFn,
              $on: mockFn,
              $use: mockFn,
              $executeRaw: mockFn,
              outboxEvent: {
                create: mockFn,
              },
            };

            export const tenantDatabase = vi.fn(() => database);
          `;
        }
        return;
      },
    },
  ],
  test: {
    // environmentMatchGlobs was removed in Vitest 4.
    // Node-environment test files use // @vitest-environment node pragma instead.
    environment: "jsdom",
    globals: true,
    restoreMocks: true,
    include: ["**/__tests__/**/*.test.{ts,tsx,js,jsx}"],
    exclude: ["**/e2e/**", "**/node_modules/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./"),
      "@repo": path.resolve(import.meta.dirname, "../../packages"),
      "server-only": path.resolve(
        import.meta.dirname,
        "__tests__/mocks/server-only.ts"
      ),
    },
  },
  optimizeDeps: {
    include: ["server-only"],
  },
});
