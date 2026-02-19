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
import { compileToIR } from "@manifest/runtime/ir-compiler";

const MANIFESTS_DIR = join(
  process.cwd(),
  "packages/manifest-adapters/manifests"
);
const OUTPUT_DIR = join(process.cwd(), "packages/manifest-ir/ir/kitchen");
const IR_OUTPUT_FILE = join(OUTPUT_DIR, "kitchen.ir.json");
const PROVENANCE_OUTPUT_FILE = join(OUTPUT_DIR, "kitchen.provenance.json");
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
  const compiledIRs = [];
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

  // Write merged IR
  writeFileSync(IR_OUTPUT_FILE, JSON.stringify(mergedIR, null, 2));
  writeFileSync(
    PROVENANCE_OUTPUT_FILE,
    JSON.stringify(mergedIR.provenance, null, 2)
  );

  console.log(
    `[manifest/build] Compiled ${mergedIR.entities.length} entities, ${mergedIR.commands.length} commands`
  );
}

async function generateFromIR() {
  console.log("[manifest/build] Step 2: Generating code from IR...");

  const bin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const args = [
    "exec",
    "manifest",
    "generate",
    IR_OUTPUT_FILE,
    "--projection",
    "nextjs",
    "--surface",
    "route",
    "--output",
    CODE_OUTPUT_DIR,
  ];

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

async function main() {
  await compileMergedManifests();
  await generateFromIR();
  console.log("[manifest/build] Build complete!");
}

main().catch((err) => {
  console.error("[manifest/build] Fatal error:", err);
  process.exit(1);
});
