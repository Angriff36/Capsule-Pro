/**
 * CJS preload script for the MCP server.
 *
 * Loads .env from the monorepo root so DATABASE_URL is available
 * before @repo/database/standalone initializes.
 *
 * Note: server-only and @prisma/client shims are no longer needed
 * because we use the standalone entry point which doesn't import server-only
 * and uses the generated client directly.
 *
 * Usage: tsx --require ./src/preload.cts src/index.ts
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const nodePath = require("node:path");

// Use __dirname in CJS context (import.meta.dirname is ESM-only)
declare const __dirname: string;
const preloadDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();
const repoRoot = nodePath.resolve(preloadDir, "../../..");

// MCP/Cursor may spawn with cwd = home; set project root so loadPrecompiledIR finds IR
if (!(process.env.MCP_PROJECT_ROOT || process.env.REPO_ROOT)) {
  process.env.MCP_PROJECT_ROOT = repoRoot;
}

// Load .env from monorepo root (quiet mode to avoid polluting stdout)
require("dotenv").config({
  path: nodePath.resolve(repoRoot, ".env"),
  quiet: true,
});
