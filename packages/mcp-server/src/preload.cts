/**
 * CJS preload script for the MCP server.
 *
 * Loads .env from the monorepo root so DATABASE_URL is available
 * before @repo/database/standalone initializes.
 *
 * Note: server-only and @prisma/client shims are not needed when consumers
 * import @repo/database/standalone (not @repo/database).
 * and uses the generated client directly.
 *
 * Usage: tsx --require ./src/preload.cts src/index.ts
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const nodePath = require("node:path");

// tsx --require runs this as CJS; __dirname is reliable (import.meta.dirname is not).
const repoRoot = nodePath.resolve(__dirname, "../../..");

// MCP/Cursor may spawn with cwd = home; set project root so loadPrecompiledIR finds IR
if (!(process.env.MCP_PROJECT_ROOT || process.env.REPO_ROOT)) {
  process.env.MCP_PROJECT_ROOT = repoRoot;
}

// Load .env from monorepo root (quiet mode to avoid polluting stdout)
require("dotenv").config({
  path: nodePath.resolve(repoRoot, ".env"),
  quiet: true,
});

// Also load .env.local which contains secrets (DATABASE_URL, Clerk keys, etc.)
require("dotenv").config({
  path: nodePath.resolve(repoRoot, ".env.local"),
  quiet: true,
});
