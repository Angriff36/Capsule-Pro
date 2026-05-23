#!/usr/bin/env node
/**
 * Generate all kitchen command routes via the authoritative Manifest CLI.
 *
 * This script intentionally delegates to:
 *   C:/projects/manifest/bin/generate-projection.ts
 *
 * It does not generate code itself.
 */

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const MANIFEST_CLI = "C:/projects/manifest/bin/generate-projection.ts";

const MANIFEST_CONFIG = [
  {
    manifest: "packages/manifest-adapters/manifests/prep-task-rules.manifest",
    entity: "PrepTask",
    commands: [
      "claim",
      "start",
      "complete",
      "release",
      "reassign",
      "updateQuantity",
      "cancel",
    ],
  },
  {
    manifest: "packages/manifest-adapters/manifests/prep-list-rules.manifest",
    entity: "PrepList",
    commands: [
      "update",
      "updateBatchMultiplier",
      "finalize",
      "activate",
      "deactivate",
      "markCompleted",
      "cancel",
    ],
  },
  {
    manifest: "packages/manifest-adapters/manifests/prep-list-rules.manifest",
    entity: "PrepListItem",
    commands: [
      "updateQuantity",
      "updateStation",
      "updatePrepNotes",
      "markCompleted",
      "markUncompleted",
    ],
  },
  {
    manifest: "packages/manifest-adapters/manifests/menu-rules.manifest",
    entity: "Menu",
    commands: ["update", "activate", "deactivate"],
  },
  {
    manifest: "packages/manifest-adapters/manifests/station-rules.manifest",
    entity: "Station",
    commands: [
      "assignTask",
      "removeTask",
      "updateCapacity",
      "activate",
      "deactivate",
      "updateEquipment",
    ],
  },
  {
    manifest: "packages/manifest-adapters/manifests/inventory-rules.manifest",
    entity: "InventoryItem",
    commands: [
      "reserve",
      "consume",
      "waste",
      "adjust",
      "restock",
      "releaseReservation",
    ],
  },
  {
    manifest: "packages/manifest-adapters/manifests/recipe-rules.manifest",
    entity: "Recipe",
    commands: ["update", "activate", "deactivate"],
  },
  {
    manifest: "packages/manifest-adapters/manifests/recipe-rules.manifest",
    entity: "Dish",
    commands: ["updatePricing", "updateLeadTime"],
  },
  {
    manifest: "packages/manifest-adapters/manifests/recipe-rules.manifest",
    entity: "Ingredient",
    commands: ["updateAllergens"],
  },
  {
    manifest: "packages/manifest-adapters/manifests/recipe-rules.manifest",
    entity: "RecipeIngredient",
    commands: ["updateQuantity"],
  },
  {
    manifest: "packages/manifest-adapters/manifests/recipe-rules.manifest",
    entity: "RecipeVersion",
    commands: ["create"],
  },
];

function runGeneration(manifestPath: string, entity: string, command: string): void {
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "tsx",
      MANIFEST_CLI,
      "nextjs",
      "nextjs.command",
      manifestPath,
      entity,
      command,
      "--auth-provider",
      "clerk",
      "--auth-import",
      "@repo/auth/server",
      "--db-import",
      "@repo/database",
      "--runtime-import",
      "@/lib/manifest-runtime",
      "--response-import",
      "@/lib/manifest-response",
      "--tenant-provider",
      "getTenantIdForOrg",
      "--tenant-import",
      "@/app/lib/tenant",
      "--tenant-lookup-key",
      "orgId",
    ],
    {
      cwd: process.cwd(),
      shell: true,
      stdio: "inherit",
    }
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function main() {
  if (!existsSync(MANIFEST_CLI)) {
    console.error(`Missing generator CLI: ${MANIFEST_CLI}`);
    process.exit(1);
  }

  let generatedCount = 0;
  for (const config of MANIFEST_CONFIG) {
    const manifestPath = join(process.cwd(), config.manifest);
    if (!existsSync(manifestPath)) {
      console.error(`Manifest not found: ${manifestPath}`);
      process.exit(1);
    }

    for (const command of config.commands) {
      runGeneration(manifestPath, config.entity, command);
      generatedCount++;
    }
  }

  console.log(`Generated ${generatedCount} command routes using generate-projection.ts`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

