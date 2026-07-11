#!/usr/bin/env node

/**
 * `pnpm manifest:build` — THE regeneration command (script-index.md Part 1 §3).
 *
 * Regenerates EVERY committed manifest-owned artifact from `.manifest` source:
 * IR, Next.js routes + wiring, route surface, Prisma schema projection, typed
 * client, runtime metadata, command param schemas, field hints, governance
 * registries, feature ownership, OpenAPI spec, and the embedded IR.
 *
 * This subsumes the old manifest:compile / manifest:generate /
 * manifest:sync-artifacts / manifest:client / manifest:generate-metadata /
 * manifest:openapi / manifest:ir:embed / ... script entries (consolidated
 * 2026-07-11). Individual steps remain runnable directly — see
 * manifest/scripts/script-index.md Part 3 for the per-step node commands.
 *
 * NOT included: `manifest fmt` — upstream CLI parses files standalone and
 * fails on cross-file mixins from _base.manifest (101/104 files), so it
 * cannot run against this multi-module layout until the CLI resolves `use`.
 */

import { spawnSync } from "node:child_process";

const STEPS = [
  // compile → nextjs routes + wiring → route surface → route audit → orphan cleanup
  ["compile + generate + route surface", "node manifest/scripts/build.mjs"],
  [
    "prisma schema projection",
    "pnpm exec manifest generate -p prisma --surface all -o packages/database/prisma manifest/ir/kitchen.ir.json",
  ],
  ["typed capsule client", "node manifest/scripts/generate-capsule-client.mjs"],
  [
    "prisma model metadata",
    "node manifest/scripts/generate-prisma-model-metadata.mjs",
  ],
  ["entity accessors", "node manifest/scripts/generate-entity-accessor.mjs"],
  [
    "prisma store options",
    "node manifest/scripts/build-prisma-store-options.mjs",
  ],
  [
    "prisma store projection",
    "node manifest/scripts/generate-prisma-store-projection.mjs",
  ],
  ["guard messages", "node manifest/scripts/generate-guard-messages.mjs"],
  [
    "command param schemas",
    "node manifest/scripts/generate-command-param-schemas.mjs",
  ],
  ["field hints", "node manifest/scripts/generate-field-hints.mjs"],
  ["governance registries", "node manifest/scripts/emit-registries.mjs"],
  ["feature ownership", "node manifest/scripts/emit-feature-ownership.mjs"],
  ["openapi spec", "node manifest/scripts/generate-openapi.mjs"],
  ["embedded IR (apps/api)", "node manifest/scripts/embed-ir.mjs"],
];

for (const [name, cmd] of STEPS) {
  console.log(`\n[manifest:build] ▶ ${name}`);
  const result = spawnSync(cmd, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    console.error(`\n[manifest:build] ✗ FAILED at step: ${name}`);
    console.error(`[manifest:build]   command: ${cmd}`);
    process.exit(result.status ?? 1);
  }
}

console.log(
  "\n[manifest:build] ✓ all artifacts regenerated. Commit them with your .manifest change, then restart the API server (it boots on the embedded IR)."
);
