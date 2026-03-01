import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      // Integration tests run with vitest.config.integration.mts
      "**/*.integration.test.{ts,tsx}",
    ],
  },
  resolve: {
    alias: [
      // More-specific subpath aliases MUST come before their parent package
      // aliases, otherwise Vite's prefix matching intercepts them.
      {
        find: "@repo/database/standalone",
        replacement: resolve(__dirname, "./test/mocks/@repo/database.ts"),
      },
      {
        find: "@repo/database",
        replacement: resolve(__dirname, "./test/mocks/@repo/database.ts"),
      },
      // Resolve manifest-adapters to source so transitive imports
      // (e.g. @repo/database/standalone from prisma-store) go through
      // vitest's alias pipeline instead of Node's native ESM resolver.
      // Regex captures subpath exports: @repo/manifest-adapters/foo → src/foo.ts
      {
        find: /^@repo\/manifest-adapters\/(.+)$/,
        replacement: resolve(
          __dirname,
          "../../packages/manifest-adapters/src/$1.ts"
        ),
      },
      {
        find: "@repo/manifest-adapters",
        replacement: resolve(
          __dirname,
          "../../packages/manifest-adapters/src/index.ts"
        ),
      },
      { find: "@", replacement: resolve(__dirname, ".") },
      {
        find: "server-only",
        replacement: resolve(__dirname, "./test/mocks/server-only.ts"),
      },
    ],
  },
});
