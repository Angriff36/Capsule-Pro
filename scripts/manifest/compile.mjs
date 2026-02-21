#!/usr/bin/env node

/**
 * Manifest Compile Script - Merges Multiple Manifests
 *
 * The Manifest CLI's --glob flag has a "last file wins" bug where only the
 * last manifest is included in the IR. This script uses the programmatic
 * compileToIR API to properly merge all manifests into a single IR.
 *
 * All 6 manifests are compiled and merged into packages/manifest-ir/ir/kitchen/kitchen.ir.json
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { compileToIR } from "@manifest/runtime/ir-compiler";

const MANIFESTS_DIR = join(
  process.cwd(),
  "packages/manifest-adapters/manifests"
);
const OUTPUT_DIR = join(process.cwd(), "packages/manifest-ir/ir/kitchen");
const OUTPUT_FILE = join(OUTPUT_DIR, "kitchen.ir.json");

/**
 * Validates that no duplicate names exist across merged IR.
 * Returns { valid: boolean, errors: string[] }.
 *
 * Identity rules:
 * - Entities: globally unique by name
 * - Commands: unique by (entity, name) tuple - two entities can both have "update" command
 * - Events: unique by channel (not name)
 * - Policies: globally unique by name
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Validation function with multiple collection types
function validateNoDuplicates(compiledIRs, manifestFiles) {
  const errors = [];

  // Track each item with its source manifest
  const entities = [];
  const commands = [];
  const events = [];
  const policies = [];

  // Collect all items with their source manifest
  for (let i = 0; i < compiledIRs.length; i++) {
    const ir = compiledIRs[i];
    const sourceFile = manifestFiles[i];

    for (const entity of ir.entities || []) {
      entities.push({ name: entity.name, source: sourceFile });
    }
    for (const command of ir.commands || []) {
      // Commands are scoped to entity: (entity, name) is the identity
      commands.push({
        name: command.name,
        entity: command.entity,
        source: sourceFile,
      });
    }
    for (const event of ir.events || []) {
      // Events are identified by channel, not name
      events.push({ channel: event.channel, source: sourceFile });
    }
    for (const policy of ir.policies || []) {
      policies.push({ name: policy.name, source: sourceFile });
    }
  }

  // Check for duplicate entities (globally unique by name)
  const entityNames = new Map();
  for (const { name, source } of entities) {
    if (!entityNames.has(name)) {
      entityNames.set(name, []);
    }
    entityNames.get(name).push(source);
  }

  for (const [name, sources] of entityNames) {
    if (sources.length > 1) {
      errors.push(
        `Duplicate entity "${name}" found in:\n${sources.map((s) => `  - ${s}`).join("\n")}`
      );
    }
  }

  // Check for duplicate commands (unique by (entity, name) tuple)
  const commandKeys = new Map();
  for (const { name, entity, source } of commands) {
    const key = `${entity}.${name}`;
    if (!commandKeys.has(key)) {
      commandKeys.set(key, []);
    }
    commandKeys.get(key).push(source);
  }

  for (const [key, sources] of commandKeys) {
    if (sources.length > 1) {
      const [entity, name] = key.split(".");
      errors.push(
        `Duplicate command "${entity}.${name}" found in:\n${sources.map((s) => `  - ${s}`).join("\n")}`
      );
    }
  }

  // Check for duplicate events (unique by channel)
  const eventChannels = new Map();
  for (const { channel, source } of events) {
    if (!eventChannels.has(channel)) {
      eventChannels.set(channel, []);
    }
    eventChannels.get(channel).push(source);
  }

  for (const [channel, sources] of eventChannels) {
    if (sources.length > 1) {
      errors.push(
        `Duplicate event channel "${channel}" found in:\n${sources.map((s) => `  - ${s}`).join("\n")}`
      );
    }
  }

  // Check for duplicate policies (globally unique by name)
  const policyNames = new Map();
  for (const { name, source } of policies) {
    if (!policyNames.has(name)) {
      policyNames.set(name, []);
    }
    policyNames.get(name).push(source);
  }

  for (const [name, sources] of policyNames) {
    if (sources.length > 1) {
      errors.push(
        `Duplicate policy "${name}" found in:\n${sources.map((s) => `  - ${s}`).join("\n")}`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

async function compileMergedManifests() {
  console.log("[manifest/compile] Starting merged compilation...");

  // Ensure output directory exists
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Read all .manifest files
  const manifestFiles = readdirSync(MANIFESTS_DIR)
    .filter((f) => f.endsWith(".manifest"))
    .sort();

  console.log(`[manifest/compile] Found ${manifestFiles.length} manifest(s)`);

  // Compile each manifest to IR
  const compiledIRs = [];
  for (const manifestFile of manifestFiles) {
    const manifestPath = join(MANIFESTS_DIR, manifestFile);
    const manifestSource = readFileSync(manifestPath, "utf-8");

    const { ir, diagnostics } = await compileToIR(manifestSource);

    if (!ir) {
      console.error(`[manifest/compile] Failed to compile ${manifestFile}:`);
      for (const d of diagnostics) {
        console.error(`  - ${d.message}`);
      }
      process.exit(1);
    }

    compiledIRs.push(ir);
  }

  // Validate no duplicate names BEFORE merging
  const { valid, errors } = validateNoDuplicates(compiledIRs, manifestFiles);

  if (!valid) {
    console.error("[manifest/compile] Duplicate name validation failed:");
    for (const error of errors) {
      console.error(`  ${error}`);
    }
    console.error(
      "[manifest/compile] Cannot write combined.ir.json with duplicate names."
    );
    console.error(
      "[manifest/compile] Please resolve duplicates by renaming or consolidating conflicting definitions."
    );
    process.exit(1);
  }

  // Merge all IRs
  const mergedIR = {
    version: "1.0",
    provenance: {
      contentHash: "",
      irHash: "",
      compilerVersion: "0.3.8",
      schemaVersion: "1.0",
      compiledAt: new Date().toISOString(),
      sources: manifestFiles,
    },
    modules: compiledIRs.flatMap((ir) => ir.modules || []),
    entities: compiledIRs.flatMap((ir) => ir.entities || []),
    stores: compiledIRs.flatMap((ir) => ir.stores || []),
    events: compiledIRs.flatMap((ir) => ir.events || []),
    commands: compiledIRs.flatMap((ir) => ir.commands || []),
    policies: compiledIRs.flatMap((ir) => ir.policies || []),
  };

  console.log(
    `[manifest/compile] Merged IR: ${mergedIR.entities.length} entities, ${mergedIR.commands.length} commands, ${mergedIR.events.length} events`
  );

  // Write merged IR
  writeFileSync(OUTPUT_FILE, JSON.stringify(mergedIR, null, 2));

  // Also write provenance file
  const provenanceFile = join(OUTPUT_DIR, "kitchen.provenance.json");
  writeFileSync(provenanceFile, JSON.stringify(mergedIR.provenance, null, 2));

  console.log("[manifest/compile] Compilation complete!");
}

compileMergedManifests().catch((err) => {
  console.error("[manifest/compile] Fatal error:", err);
  process.exit(1);
});
