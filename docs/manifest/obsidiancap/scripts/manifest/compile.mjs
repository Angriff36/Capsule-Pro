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
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { enforceCommandOwnership, mergeIrs } from "./ir-utils.mjs";

const MANIFESTS_DIR = join(
  process.cwd(),
  "packages/manifest-adapters/manifests"
);
const OUTPUT_DIR = join(process.cwd(), "packages/manifest-ir/ir/kitchen");
const OUTPUT_FILE = join(OUTPUT_DIR, "kitchen.ir.json");
const COMMANDS_FILE = join(OUTPUT_DIR, "kitchen.commands.json");
const MERGE_REPORT_FILE = join(OUTPUT_DIR, "kitchen.merge-report.json");

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
  const compiledEntries = [];
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

    const manifestName = manifestFile.replace(/\.manifest$/, "");
    compiledEntries.push({
      source: manifestFile,
      ir: enforceCommandOwnership(ir, manifestName),
    });
  }

  const {
    ir: mergedIR,
    duplicateWarnings,
    mergeReport,
  } = mergeIrs(compiledEntries, {
    contentHash: "",
    irHash: "",
    compilerVersion: "0.3.8",
    schemaVersion: "1.0",
    compiledAt: new Date().toISOString(),
  });

  if (duplicateWarnings.length > 0) {
    console.warn(
      `[manifest/compile] Merge dropped ${duplicateWarnings.length} duplicate definitions`
    );
    for (const warning of duplicateWarnings.slice(0, 20)) {
      console.warn(`  ${warning}`);
    }
    if (duplicateWarnings.length > 20) {
      console.warn(
        `  ... and ${duplicateWarnings.length - 20} more duplicate definitions`
      );
    }
  }

  console.log(
    `[manifest/compile] Merged IR: ${mergedIR.entities.length} entities, ${mergedIR.commands.length} commands, ${mergedIR.events.length} events`
  );

  // Write merged IR
  writeFileSync(OUTPUT_FILE, JSON.stringify(mergedIR, null, 2));

  // Derive and emit kitchen.commands.json — projection-agnostic command manifest.
  // Source: ir.commands[] only. No filesystem reads, no URL paths, no Next.js logic.
  // Fields: entity, command (name), commandId (entity.name). Sorted: entity ASC, command ASC.
  const commandsManifest = (mergedIR.commands ?? [])
    .map((cmd) => ({
      entity: cmd.entity,
      command: cmd.name,
      commandId: `${cmd.entity}.${cmd.name}`,
    }))
    .sort((a, b) => {
      const entityCmp = a.entity.localeCompare(b.entity);
      if (entityCmp !== 0) return entityCmp;
      return a.command.localeCompare(b.command);
    });
  writeFileSync(COMMANDS_FILE, JSON.stringify(commandsManifest, null, 2));
  console.log(
    `[manifest/compile] Emitted ${commandsManifest.length} entries to kitchen.commands.json`
  );

  // Also write provenance file
  const provenanceFile = join(OUTPUT_DIR, "kitchen.provenance.json");
  writeFileSync(provenanceFile, JSON.stringify(mergedIR.provenance, null, 2));
  writeFileSync(MERGE_REPORT_FILE, JSON.stringify(mergeReport, null, 2));

  console.log("[manifest/compile] Compilation complete!");
}

compileMergedManifests().catch((err) => {
  console.error("[manifest/compile] Fatal error:", err);
  process.exit(1);
});
