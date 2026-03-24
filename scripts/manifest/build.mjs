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
const COMMANDS_OUTPUT_FILE = join(OUTPUT_DIR, "kitchen.commands.json");
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

  // Derive and emit kitchen.commands.json — projection-agnostic command manifest.
  // Must stay in sync with the IR; the determinism test asserts they match.
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
  writeFileSync(
    COMMANDS_OUTPUT_FILE,
    JSON.stringify(commandsManifest, null, 2)
  );

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

/**
 * Step 4: Audit route boundaries after all routes are materialized on disk.
 *
 * Runs immediately after route generation + surface generation so the audit
 * checks the actual output, not stale state.
 *
 * Ownership rules (WRITE_OUTSIDE_COMMANDS_NAMESPACE, COMMAND_ROUTE_MISSING_RUNTIME_CALL,
 * COMMAND_ROUTE_ORPHAN) are enabled via --commands-manifest. The --strict flag causes
 * the audit to fail the build if ANY ownership-rule finding is present. Quality/hygiene
 * warnings (WRITE_ROUTE_BYPASSES_RUNTIME, READ_MISSING_SOFT_DELETE_FILTER, etc.) are
 * reported but never block the build.
 *
 * See: docs/spec/manifest-vnext.md § "Canonical Routes (Normative)" — Enforcement
 * See: OWNERSHIP_RULE_CODES in audit-routes.ts for the canonical set of blocking rules.
 */
function auditRouteBoundaries() {
  console.log("[manifest/build] Step 4: Auditing route boundaries...");
  const bin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(
    bin,
    [
      "exec",
      "manifest",
      "audit-routes",
      "--strict",
      "--root",
      "apps/api",
      "--commands-manifest",
      "packages/manifest-ir/ir/kitchen/kitchen.commands.json",
      "--exemptions",
      "packages/manifest-runtime/packages/cli/src/commands/audit-routes-exemptions.json",
    ],
    {
      stdio: "inherit",
      shell: process.platform === "win32",
    }
  );
  if (result.status !== 0) {
    console.error(
      "[manifest/build] Route boundary audit FAILED — ownership-rule violations detected."
    );
    console.error(
      "[manifest/build] Fix all COMMAND_ROUTE_ORPHAN, COMMAND_ROUTE_MISSING_RUNTIME_CALL, and WRITE_OUTSIDE_COMMANDS_NAMESPACE findings before merging."
    );
    process.exit(1);
  } else {
    console.log("[manifest/build] Route boundary audit passed (strict mode).");
  }
}

async function main() {
  await compileMergedManifests();
  generateFromIR();
  generateRouteSurface();
  auditRouteBoundaries();
  console.log("[manifest/build] Build complete!");
}

main().catch((err) => {
  console.error("[manifest/build] Fatal error:", err);
  process.exit(1);
});
