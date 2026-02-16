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
        // Intercept imports to the database package (multiple patterns)
        if (
          id === "@repo/database" ||
          id === "C:\\Projects\\capsule-pro\\packages\\database" ||
          id === "C:/Projects/capsule-pro/packages/database" ||
          id.endsWith("\\packages\\database") ||
          id.endsWith("/packages/database") ||
          id.includes("packages/database") ||
          id.includes("\\packages\\database") ||
          (importer &&
            (importer.includes("recipes") || importer.includes("menus")) &&
            id.includes("database"))
        ) {
          console.log(`[vitest-database-mock] INTERCEPTED database: ${id}`);
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
          id ===
            "C:\\Projects\\capsule-pro\\packages\\database\\generated\\client" ||
          id === "C:/Projects/capsule-pro/packages/database/generated/client" ||
          id.includes("packages\\database\\generated\\client") ||
          id.includes("packages/database/generated/client") ||
          (importer?.includes("database") && id.includes("generated/client"))
        ) {
          console.log(`[vitest-database-mock] INTERCEPTED client: ${id}`);
          return path.resolve(
            import.meta.dirname,
            "./test/mocks/@repo/generated/client.ts"
          );
        }
        // Intercept storage package
        if (
          id === "@repo/storage" ||
          id === "C:/Projects/capsule-pro/packages/storage" ||
          id === "C:\\Projects\\capsule-pro\\packages\\storage" ||
          id.includes("packages/storage")
        ) {
          console.log(`[vitest-database-mock] INTERCEPTED storage: ${id}`);
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
        return undefined;
      },
      load(id) {
        // Intercept loading of the actual database index.ts file
        if (
          id.includes("\\packages\\database\\index.ts") ||
          id.includes("/packages/database/index.ts") ||
          id.includes("packages/database/index.js")
        ) {
          console.log(`[vitest-database-mock] LOAD intercepted: ${id}`);
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
        return undefined;
      },
    },
  ],
  test: {
    // API route tests and server action tests need node environment (server-only), most specific first
    environmentMatchGlobs: [
      ["**/__tests__/api/**/*.test.{ts,js}", "node"],
      ["**/__tests__/api/**/*.test.{tsx,jsx}", "node"],
      ["**/__tests__/menus/**/*.test.{ts,tsx,js,jsx}", "node"],
      ["**/__tests__/recipes/**/*.test.{ts,tsx,js,jsx}", "node"],
    ],
    // Default to jsdom for everything else
    environment: "jsdom",
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
