import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "vitest-next-image-mock",
      enforce: "pre",
      resolveId(id) {
        // Mock Next.js Image component
        if (id === "next/image") {
          return path.resolve(
            import.meta.dirname,
            "./test/mocks/next-image.tsx"
          );
        }
        // Mock next/link
        if (id === "next/link") {
          return path.resolve(
            import.meta.dirname,
            "./test/mocks/next-link.tsx"
          );
        }
        return undefined;
      },
    },
  ],
  test: {
    environment: "jsdom",
    include: ["**/__tests__/**/*.test.{ts,tsx,js,jsx}"],
    exclude: ["**/e2e/**", "**/node_modules/**"],
    setupFiles: ["../../vitest.setup.ts"],
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
});
