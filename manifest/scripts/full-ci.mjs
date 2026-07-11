#!/usr/bin/env node

/**
 * `pnpm manifest:ci` — THE gate command. Every manifest check, one entry point.
 *
 * Read-only: validates the IR, byte-compares every committed generated
 * artifact against a fresh projection, and runs every blocking audit.
 * Consolidates the old manifest:verify-invariants / manifest:validate /
 * manifest:ir:embed:check / manifest:doctor / manifest:contract:check /
 * manifest:audit-governance:direct-writes / manifest:audit:strict /
 * manifest:coverage:ci script entries PLUS the previously-separate drift
 * gates (schema:check, openapi:check, field-hints:check, ownership:check)
 * (consolidated 2026-07-11).
 *
 * NOT included (documented in script-index.md Part 3):
 * - `manifest fmt --check` — upstream CLI can't parse multi-module sources
 *   (fails on _base.manifest mixins in 101/104 files).
 * - advisory audits with open debt (audit-dead-commands, audit-ir-drift,
 *   lint-schema) — run directly via node when mining debt.
 */

import { spawnSync } from "node:child_process";

const GOVERNANCE_ARGS =
  "--only direct-writes --commands-registry ../../manifest/governance/commands.json --bypass-registry ../../manifest/governance/bypasses.json --strict";

const STEPS = [
  [
    "invariants (tenant-once, IR freshness, compiler pin)",
    "node manifest/scripts/verify-invariants.mjs",
  ],
  ["IR validate", "pnpm exec manifest validate manifest/ir/kitchen.ir.json"],
  ["embedded IR drift", "node manifest/scripts/check-ir-embed-drift.mjs"],
  ["doctor", "pnpm exec manifest doctor"],
  [
    "contract import boundary",
    "node manifest/scripts/audit-contract-imports.mjs",
  ],
  [
    "governance direct-writes (apps/api)",
    `pnpm exec manifest audit-governance -r apps/api ${GOVERNANCE_ARGS}`,
  ],
  [
    "governance direct-writes (apps/app)",
    `pnpm exec manifest audit-governance -r apps/app ${GOVERNANCE_ARGS}`,
  ],
  [
    "accessor config (strict)",
    "node manifest/scripts/check-accessor-config.mjs --strict",
  ],
  [
    "schema drift audit (strict)",
    "node manifest/scripts/audit-schema-drift.mjs --strict",
  ],
  [
    "parent context audit (strict)",
    "node manifest/scripts/audit-parent-context.mjs --strict",
  ],
  [
    "reaction payload audit",
    "node manifest/scripts/check-reaction-payloads.mjs --strict",
  ],
  [
    "command param types (strict)",
    "node manifest/scripts/audit-command-param-types.mjs --strict",
  ],
  [
    "command coverage",
    "pnpm exec manifest coverage --ir manifest/ir/kitchen.ir.json --root . --format text --min-coverage 10 --strict",
  ],
  [
    "prisma schema drift",
    "pnpm exec manifest generate -p prisma --surface all -o packages/database/prisma --check manifest/ir/kitchen.ir.json",
  ],
  ["openapi drift", "node manifest/scripts/check-openapi-drift.mjs"],
  [
    "field hints drift",
    "node manifest/scripts/generate-field-hints.mjs --check",
  ],
  [
    "feature ownership drift",
    "node manifest/scripts/emit-feature-ownership.mjs --check",
  ],
];

for (const [name, cmd] of STEPS) {
  console.log(`\n[manifest:ci] ▶ ${name}`);
  const result = spawnSync(cmd, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    console.error(`\n[manifest:ci] ✗ FAILED gate: ${name}`);
    console.error(`[manifest:ci]   command: ${cmd}`);
    console.error(
      "[manifest:ci]   stale generated artifact? Run `pnpm manifest:build` and commit the result."
    );
    process.exit(result.status ?? 1);
  }
}

console.log("\n[manifest:ci] ✓ all gates green.");
