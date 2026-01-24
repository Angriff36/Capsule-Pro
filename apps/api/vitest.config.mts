import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "vitest-database-mock",
      enforce: "pre",
      resolveId(id) {
        // Intercept imports to the database package's generated client
        if (id.includes("packages/database/generated/client")) {
          return path.resolve(__dirname, "./test/mocks/@repo/generated/client.ts");
        }
        // Also intercept imports to the database package itself
        if (id === "@repo/database") {
          return path.resolve(__dirname, "./test/mocks/@repo/database.ts");
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
      "@": path.resolve(__dirname, "./"),
      // Keep other @repo/* packages pointing to the real packages
      "@repo": path.resolve(__dirname, "../../packages"),
      "server-only": path.resolve(__dirname, "./test/mocks/server-only.ts"),
    },
  },
  optimizeDeps: {
    exclude: ["@repo/database"],
  },
});
