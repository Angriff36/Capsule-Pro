/**
 * CJS preload script for the MCP server.
 *
 * Patches module resolution to work around two issues:
 * 1. `server-only` throws in standalone Node.js (Next.js RSC guard)
 * 2. `@prisma/client` can't find `.prisma/client/default` (Prisma 7 custom output)
 *
 * Also loads .env from the monorepo root so DATABASE_URL is available
 * before @repo/database initializes.
 *
 * Usage: tsx --require ./src/preload.cts src/index.ts
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const nodePath = require("node:path");

// 1. Shim server-only to prevent the RSC guard from throwing
const serverOnlyPath = require.resolve("server-only");
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
  children: [],
  paths: [],
  path: "",
} as unknown as NodeJS.Module;

// 2. Pre-load @prisma/client with the generated client so CJS resolution works.
//    This ensures `require('@prisma/client')` returns the generated client exports
//    instead of trying to load `.prisma/client/default` which doesn't exist.
//    Use __dirname in CJS context (import.meta.dirname is ESM-only)
declare const __dirname: string;
const preloadDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();
const generatedClientPath = nodePath.resolve(
  preloadDir,
  "../../../database/generated/client.ts"
);
try {
  // Pre-populate the @prisma/client cache with the generated client
  const generatedClient = require(generatedClientPath);
  const prismaClientPath = require.resolve("@prisma/client");
  require.cache[prismaClientPath] = {
    id: prismaClientPath,
    filename: prismaClientPath,
    loaded: true,
    exports: generatedClient,
    children: [],
    paths: [],
    path: nodePath.dirname(prismaClientPath),
  } as unknown as NodeJS.Module;
} catch {
  // If generated client isn't available, let it fail naturally later
}

// 3. Load .env from monorepo root
//    __dirname = packages/mcp-server/src/ → three levels up to monorepo root
require("dotenv").config({
  path: nodePath.resolve(preloadDir, "../../../.env"),
});
