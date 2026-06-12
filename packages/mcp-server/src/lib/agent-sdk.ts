/**
 * Agent SDK wrapper — re-exports functions from @angriff36/manifest/agent-sdk.
 *
 * The barrel index.js has extensionless relative imports that fail in Node's
 * strict ESM resolver (vitest). The individual submodules (introspect.js,
 * intent-mapper.js) are self-contained and import fine, but they are NOT
 * listed in the package exports map. We resolve them via createRequire from
 * the installed package root, which bypasses the ESM export-map check.
 */

import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for createRequire resolution

const require = createRequire(import.meta.url);
const pkgRoot = dirname(require.resolve("@angriff36/manifest/package.json"));
const sdkDir = join(pkgRoot, "dist", "manifest", "agent-sdk");

// Use createRequire to load each self-contained submodule.
// createRequire resolves CommonJS-style (adds extensions), avoiding the
// bare-specifier ESM resolution error in the barrel index.js.
const introspect = require(
  join(sdkDir, "introspect.js")
) as typeof import("@angriff36/manifest/agent-sdk");
const intentMapper = require(
  join(sdkDir, "intent-mapper.js")
) as typeof import("@angriff36/manifest/agent-sdk");

export const listEntities = introspect.listEntities;
export const describeEntity = introspect.describeEntity;
export const describeCommand = introspect.describeCommand;
export const findMatchingCommands = intentMapper.findMatchingCommands;
export const tokenize = intentMapper.tokenize;
