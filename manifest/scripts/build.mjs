#!/usr/bin/env node

/**
 * Manifest Build Script - Compile + Generate
 *
 * The Manifest CLI's --glob flag has a "last file wins" bug. This script:
 * 1. Compiles all manifests by delegating to compile.mjs (proper merge)
 * 2. Generates code from the merged IR using generate.mjs
 * 3. Generates canonical route surface via generate-route-manifest.ts
 * 4. Audits route boundaries
 * 5. Generates TanStack Query hooks wrapping the generated client
 *
 * All manifests are compiled and merged into manifest/ir/kitchen.ir.json
 */

import { spawnSync } from "node:child_process";

/**
 * Step 1: Delegate compilation to compile.mjs (canonical compile pipeline).
 * compile.mjs handles: read manifests -> native compileProjectToIR (topo-sort,
 * cycle detection, cross-file validation, deterministic merged IR) ->
 * validateCommandIntentRegistry + enrichComputedDependencies + deterministic irHash ->
 * write kitchen.ir.json + kitchen.commands.json + commands.registry.json +
 * kitchen.provenance.json + kitchen.merge-report.json.
 */
function compileMergedManifests() {
  console.log("[manifest/build] Step 1: Compiling manifests...");
  const bin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(bin, ["run", "manifest:compile"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    console.error("[manifest/build] Compilation failed.");
    process.exit(1);
  }
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
      "manifest/scripts/generate-route-manifest.ts",
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
 * COMMAND_ROUTE_ORPHAN) are enabled via --commands-manifest. Step 4 delegates to
 * manifest/scripts/audit-routes-strict.mjs, which runs upstream audit-routes --strict
 * and additionally honors audit-routes-exemptions.json for COMMAND_ROUTE_* findings
 * (upstream only exempts WRITE_OUTSIDE). Legacy command routes register
 * commandRouteExempt: true with drain reasons until migrated.
 *
 * See: docs/spec/manifest-vnext.md § "Canonical Routes (Normative)" — Enforcement
 * See: OWNERSHIP_RULE_CODES in audit-routes.ts for the canonical set of blocking rules.
 */
function auditRouteBoundaries() {
  console.log("[manifest/build] Step 4: Auditing route boundaries...");
  const bin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(
    bin,
    ["exec", "node", "manifest/scripts/audit-routes-strict.mjs"],
    {
      stdio: "inherit",
      shell: process.platform === "win32",
    }
  );
  if (result.status === 0) {
    console.log("[manifest/build] Route boundary audit passed (strict mode).");
  } else {
    console.error(
      "[manifest/build] Route boundary audit FAILED — ownership-rule violations detected."
    );
    console.error(
      "[manifest/build] Fix all COMMAND_ROUTE_ORPHAN, COMMAND_ROUTE_MISSING_RUNTIME_CALL, and WRITE_OUTSIDE_COMMANDS_NAMESPACE findings before merging."
    );
    process.exit(1);
  }
}

function generateReactQueryHooks() {
  console.log("[manifest/build] Step 5: Generating TanStack Query hooks...");
  const bin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(bin, ["run", "manifest:generate-hooks"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error("[manifest/build] Hook generation failed.");
    process.exit(1);
  }
  console.log("[manifest/build] TanStack Query hooks generated.");
}

function cleanupGeneratedOrphans() {
  console.log(
    "[manifest/build] Step 6: Cleaning generated/ orphan artifacts..."
  );
  const bin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(
    bin,
    ["exec", "node", "manifest/scripts/cleanup-generated-orphans.mjs"],
    {
      stdio: "inherit",
      shell: process.platform === "win32",
    }
  );
  if (result.status !== 0) {
    console.error("[manifest/build] Generated cleanup failed.");
    process.exit(1);
  }
}

function main() {
  compileMergedManifests();
  generateFromIR();
  generateRouteSurface();
  auditRouteBoundaries();
  generateReactQueryHooks();
  cleanupGeneratedOrphans();
  console.log("[manifest/build] Build complete!");
}

main();
