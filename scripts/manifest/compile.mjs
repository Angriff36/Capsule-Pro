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

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { compileToIR } from "@manifest/runtime/ir-compiler";

const MANIFESTS_DIR = join(process.cwd(), "packages/manifest-adapters/manifests");
const OUTPUT_DIR = join(process.cwd(), "packages/manifest-ir/ir/kitchen");
const OUTPUT_FILE = join(OUTPUT_DIR, "kitchen.ir.json");

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

  console.log(`[manifest/compile] Merged IR: ${mergedIR.entities.length} entities, ${mergedIR.commands.length} commands, ${mergedIR.events.length} events`);

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
