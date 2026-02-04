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
          (importer?.includes("auto-assignment") && id.includes("database"))
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
    setupFiles: ["./test/setup.ts"],
    include: ["**/__tests__/**/*.test.{ts,tsx,js}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./"),
      // Keep other @repo/* packages pointing to the real packages
      "@repo": path.resolve(import.meta.dirname, "../../packages"),
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
