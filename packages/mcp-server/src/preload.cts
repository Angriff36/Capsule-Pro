/**
 * CJS preload script for the MCP server.
 *
 * Loads .env from the monorepo root before the MCP entrypoint runs.
 *
 * Usage: tsx --require ./src/preload.cts src/index.ts
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const nodePath = require("node:path");

const repoRoot = nodePath.resolve(__dirname, "../../..");

if (!(process.env.MCP_PROJECT_ROOT || process.env.REPO_ROOT)) {
  process.env.MCP_PROJECT_ROOT = repoRoot;
}

require("dotenv").config({
  path: nodePath.resolve(repoRoot, ".env"),
  quiet: true,
});

require("dotenv").config({
  path: nodePath.resolve(repoRoot, ".env.local"),
  quiet: true,
});
