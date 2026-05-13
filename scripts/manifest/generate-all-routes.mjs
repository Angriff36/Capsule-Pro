#!/usr/bin/env node

/**
 * Manifest Command Registration Validator
 *
 * ARCHITECTURE RULE: All command writes route through the SINGLE dynamic dispatcher:
 *   apps/api/app/api/manifest/[entity]/commands/[command]/route.ts
 *
 * Concrete per-command route files under domain paths are ILLEGAL.
 * This script was formerly a route-file generator. It is now a validation-only
 * pass that verifies every command declared in .manifest files is registered in
 * kitchen.commands.json.
 *
 * To get a command registered:
 *   1. Define the command in the correct .manifest file.
 *   2. Run:   pnpm manifest:compile
 *   3. Run:   node scripts/manifest/generate-all-routes.mjs  (this script — validation)
 *
 * Usage:  node scripts/manifest/generate-all-routes.mjs [--verbose]
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const VERBOSE = process.argv.includes("--verbose");

const ROOT = resolve(process.cwd());
const MANIFESTS_DIR = join(ROOT, "packages/manifest-adapters/manifests");
const COMMANDS_JSON = join(
  ROOT,
  "packages/manifest-ir/ir/kitchen/kitchen.commands.json"
);

// ─── Load the canonical command registry ───

if (!existsSync(COMMANDS_JSON)) {
  console.error(
    "[generate-all-routes] kitchen.commands.json not found. Run pnpm manifest:compile first."
  );
  process.exit(1);
}

const commandsJson = JSON.parse(readFileSync(COMMANDS_JSON, "utf8"));
if (!Array.isArray(commandsJson)) {
  console.error(
    "[generate-all-routes] kitchen.commands.json is not a flat array. Expected [ { entity, command, ... }, ... ]."
  );
  process.exit(1);
}

const registeredCommands = new Set(
  commandsJson.map((c) => `${c.entity}.${c.command}`)
);

// ─── Parse .manifest files to extract entity+command declarations ───

function parseManifestCommands(source) {
  const entities = {};
  let currentEntity = null;
  let braceDepth = 0;
  let inEntity = false;

  const lines = source.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    const entityMatch = trimmed.match(/^entity\s+(\w+)\s*\{/);
    if (entityMatch && !inEntity) {
      currentEntity = entityMatch[1];
      entities[currentEntity] = [];
      inEntity = true;
      braceDepth = 1;
      continue;
    }

    if (inEntity) {
      for (const ch of trimmed) {
        if (ch === "{") braceDepth++;
        if (ch === "}") braceDepth--;
      }

      const commandMatch = trimmed.match(/^command\s+(\w+)/);
      if (commandMatch && braceDepth >= 1) {
        entities[currentEntity].push(commandMatch[1]);
      }

      if (braceDepth === 0) {
        inEntity = false;
        currentEntity = null;
      }
    }
  }

  return entities;
}

// ─── Main ───

if (!existsSync(MANIFESTS_DIR)) {
  console.error(
    `[generate-all-routes] Manifests directory not found: ${MANIFESTS_DIR}`
  );
  process.exit(1);
}

console.log("=== Manifest Command Registration Validator ===\n");

const manifestFiles = readdirSync(MANIFESTS_DIR).filter((f) =>
  f.endsWith(".manifest")
);

if (manifestFiles.length === 0) {
  console.error(
    "[generate-all-routes] No .manifest files found in manifests directory."
  );
  process.exit(1);
}

console.log(`Found ${manifestFiles.length} manifest files.`);
console.log(
  `Registry: ${registeredCommands.size} registered commands in kitchen.commands.json.\n`
);

let totalCommands = 0;
const missingCommands = [];
const foundCommands = [];

for (const manifestFile of manifestFiles) {
  const manifestPath = join(MANIFESTS_DIR, manifestFile);
  const source = readFileSync(manifestPath, "utf-8");

  let entities;
  try {
    entities = parseManifestCommands(source);
  } catch (error) {
    console.error(`  ERROR parsing ${manifestFile}: ${error.message}`);
    process.exit(1);
  }

  for (const [entityName, commands] of Object.entries(entities)) {
    totalCommands += commands.length;

    for (const commandName of commands) {
      const key = `${entityName}.${commandName}`;
      if (registeredCommands.has(key)) {
        foundCommands.push({ entityName, commandName, manifestFile });
      } else {
        missingCommands.push({ entityName, commandName, manifestFile });
      }
    }
  }
}

if (VERBOSE) {
  console.log("Verbose: registered command hits by file:");
  const byFile = {};
  for (const fc of foundCommands) {
    if (!byFile[fc.manifestFile]) byFile[fc.manifestFile] = [];
    byFile[fc.manifestFile].push(`${fc.entityName}.${fc.commandName}`);
  }
  for (const [file, cmds] of Object.entries(byFile)) {
    console.log(`  ${file}: ${cmds.length} commands — ${cmds.join(", ")}`);
  }
  console.log("");
}

// ─── Summary ───

console.log("=== Validation Results ===\n");

if (missingCommands.length > 0) {
  const byFile = {};
  for (const mc of missingCommands) {
    if (!byFile[mc.manifestFile]) byFile[mc.manifestFile] = [];
    byFile[mc.manifestFile].push(`${mc.entityName}.${mc.commandName}`);
  }
  for (const [file, cmds] of Object.entries(byFile)) {
    console.error(`  MISSING from registry (${file}):`);
    for (const c of cmds) {
      console.error(`    - ${c}`);
    }
  }
  console.error(
    `\n${missingCommands.length} command(s) declared in .manifest files but not in kitchen.commands.json.`
  );
  console.error(
    "Run:  pnpm manifest:compile"
  );
  process.exit(1);
}

console.log(
  `All ${foundCommands.length} manifest commands are registered in kitchen.commands.json. ✓`
);
console.log(
  "No route files were created — the dynamic dispatcher handles all command routing."
);
process.exit(0);
