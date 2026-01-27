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
          (importer &&
            importer.includes("recipes") &&
            id.includes("database"))
        ) {
          console.log(`[vitest-database-mock] INTERCEPTED database: ${id}`);
          return path.resolve(__dirname, "./test/mocks/@repo/database.ts");
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
          (importer &&
            importer.includes("database") &&
            id.includes("generated/client"))
        ) {
          console.log(`[vitest-database-mock] INTERCEPTED client: ${id}`);
          return path.resolve(
            __dirname,
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
          return path.resolve(__dirname, "./test/mocks/@repo/storage.ts");
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
            export const database = { $queryRaw: () => {}, $executeRaw: () => {}, outboxEvent: { create: () => {} } };
            export const tenantDatabase = () => ({});
          `;
        }
        return undefined;
      },
    },
  ],
  test: {
    // API route tests need node environment (server-only), most specific first
    environmentMatchGlobs: [
      ["**/__tests__/api/**/*.test.{ts,js}", "node"],
      ["**/__tests__/api/**/*.test.{tsx,jsx}", "node"],
    ],
    // Default to jsdom for everything else
    environment: "jsdom",
    include: ["**/__tests__/**/*.test.{ts,tsx,js,jsx}"],
    exclude: ["**/e2e/**", "**/node_modules/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@repo": path.resolve(__dirname, "../../packages"),
      "server-only": path.resolve(__dirname, "__tests__/mocks/server-only.ts"),
    },
  },
  optimizeDeps: {
    include: ["server-only"],
  },
});
