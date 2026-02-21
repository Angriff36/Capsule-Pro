#!/usr/bin/env node

/**
 * Manifest Build Script - Compile + Generate
 *
 * The Manifest CLI's --glob flag has a "last file wins" bug. This script:
 * 1. Compiles all manifests using programmatic API (proper merge)
 * 2. Generates code from the merged IR using the CLI
 *
 * All 6 manifests are compiled and merged into packages/manifest-ir/ir/kitchen/kitchen.ir.json
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { compileToIR } from "@angriff36/manifest/ir-compiler";
import { enforceCommandOwnership, mergeIrs } from "./ir-utils.mjs";

const MANIFESTS_DIR = join(
  process.cwd(),
  "packages/manifest-adapters/manifests"
);
const OUTPUT_DIR = join(process.cwd(), "packages/manifest-ir/ir/kitchen");
const IR_OUTPUT_FILE = join(OUTPUT_DIR, "kitchen.ir.json");
const PROVENANCE_OUTPUT_FILE = join(OUTPUT_DIR, "kitchen.provenance.json");
const MERGE_REPORT_OUTPUT_FILE = join(OUTPUT_DIR, "kitchen.merge-report.json");
const CODE_OUTPUT_DIR = join(process.cwd(), "apps/api/app/api/kitchen");

async function compileMergedManifests() {
  console.log("[manifest/build] Step 1: Compiling manifests...");

  // Ensure output directory exists
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Read all .manifest files
  const manifestFiles = readdirSync(MANIFESTS_DIR)
    .filter((f) => f.endsWith(".manifest"))
    .sort();

  // Compile each manifest to IR
  const compiledEntries = [];
  for (const manifestFile of manifestFiles) {
    const manifestPath = join(MANIFESTS_DIR, manifestFile);
    const manifestSource = readFileSync(manifestPath, "utf-8");

    const { ir, diagnostics } = await compileToIR(manifestSource);

    if (!ir) {
      console.error(`[manifest/build] Failed to compile ${manifestFile}:`);
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
    sources: manifestFiles,
  });

  if (duplicateWarnings.length > 0) {
    console.warn(
      `[manifest/build] Merge dropped ${duplicateWarnings.length} duplicate definitions`
    );
  }

  // Write merged IR
  writeFileSync(IR_OUTPUT_FILE, JSON.stringify(mergedIR, null, 2));
  writeFileSync(
    PROVENANCE_OUTPUT_FILE,
    JSON.stringify(mergedIR.provenance, null, 2)
  );
  writeFileSync(MERGE_REPORT_OUTPUT_FILE, JSON.stringify(mergeReport, null, 2));

  console.log(
    `[manifest/build] Compiled ${mergedIR.entities.length} entities, ${mergedIR.commands.length} commands`
  );

  return mergedIR;
}

function generateFromIR() {
  console.log("[manifest/build] Step 2: Generating code from IR...");

  // Delegate to generate.mjs which uses the installed CLI and applies ENTITY_DOMAIN_MAP
  // path remapping so routes land in the correct domain directories.
  const bin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const args = ["run", "manifest:generate"];

  const result = spawnSync(bin, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    console.error("[manifest/build] Code generation failed.");
    process.exit(1);
  }

  console.log("[manifest/build] Code generation complete!");
}

function generateRouteSurface() {
  console.log("[manifest/build] Step 3: Generating canonical route surface...");
  const bin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(
    bin,
    [
      "exec",
      "tsx",
      "scripts/manifest/generate-route-manifest.ts",
      "--format",
      "summary",
    ],
    {
      stdio: "inherit",
      shell: process.platform === "win32",
    }
  );
  if (result.status !== 0) {
    console.error("[manifest/build] Route surface generation failed.");
    process.exit(1);
  }

  console.log("[manifest/build] Canonical route surface generated.");
}

async function main() {
  await compileMergedManifests();
  generateFromIR();
  generateRouteSurface();
  console.log("[manifest/build] Build complete!");
}

main().catch((err) => {
  console.error("[manifest/build] Fatal error:", err);
  process.exit(1);
});
