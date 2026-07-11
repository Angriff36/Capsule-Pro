#!/usr/bin/env node
/**
 * Validates manifest.config.yaml accessor authority against live Prisma metadata.
 *
 * Single-source contract:
 *   projections.prisma-store.options.entityToPrismaModel  — IR entity → Prisma model
 *   projections.prisma-store.options.accessorNames        — IR entity → Prisma delegate
 *
 * Every bridged entity must have BOTH entries, and accessorNames must match the live
 * client delegate from prisma-model-metadata.generated.json.
 *
 * Usage:
 *   node manifest/scripts/check-accessor-config.mjs
 *   node manifest/scripts/check-accessor-config.mjs --strict   # exit 1 on any mismatch
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { getAccessorConfig, getConfigPaths } from "./read-config.mjs";

const STRICT = process.argv.includes("--strict");
const { repoRoot } = getConfigPaths();
const { entityToPrismaModel, accessorNames, naming } = getAccessorConfig();

const metadataPath = join(
  repoRoot,
  "manifest/runtime/src/generated/prisma-model-metadata.generated.json"
);

function fail(msg) {
  console.error(`[accessor-config] ${msg}`);
  errors.push(msg);
}

const errors = [];
const warnings = [];

if (!existsSync(metadataPath)) {
  fail(
    `Missing ${metadataPath} — run pnpm manifest:build first.`
  );
} else {
  const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));

  const bridgeKeys = Object.keys(entityToPrismaModel);
  const accessorKeys = Object.keys(accessorNames);

  for (const key of bridgeKeys) {
    if (!Object.hasOwn(accessorNames, key)) {
      fail(
        `entityToPrismaModel.${key} has no matching accessorNames entry — add both in manifest.config.yaml.`
      );
    }
  }

  for (const key of accessorKeys) {
    if (!Object.hasOwn(entityToPrismaModel, key)) {
      fail(
        `accessorNames.${key} has no matching entityToPrismaModel entry — add both in manifest.config.yaml.`
      );
    }
  }

  for (const [irEntity, modelName] of Object.entries(entityToPrismaModel)) {
    const meta = metadata[modelName];
    if (!meta) {
      fail(
        `entityToPrismaModel ${irEntity} → ${modelName}: no prisma-model-metadata entry (model missing from live schema?).`
      );
      continue;
    }
    const expectedAccessor = accessorNames[irEntity];
    if (expectedAccessor && meta.accessor !== expectedAccessor) {
      fail(
        `accessorNames.${irEntity}=${expectedAccessor} but live Prisma delegate is ${meta.accessor} (model ${modelName}). Fix manifest.config.yaml.`
      );
    }
  }

  // Bridged entities must not still resolve via naive camelCase when config says otherwise.
  for (const [irEntity, delegate] of Object.entries(accessorNames)) {
    const naive =
      irEntity.charAt(0).toLowerCase() + irEntity.slice(1);
    if (delegate !== naive) {
      warnings.push(
        `${irEntity}: bridged ${naive} → ${delegate} (config authority)`
      );
    }
  }
}

console.log(
  `[accessor-config] naming=${naming} bridges=${Object.keys(entityToPrismaModel).length} accessors=${Object.keys(accessorNames).length}`
);

if (warnings.length) {
  console.log(`[accessor-config] ${warnings.length} intentional bridge(s) (OK).`);
}

if (errors.length) {
  console.error(`[accessor-config] ${errors.length} error(s).`);
  if (STRICT) {
    process.exit(1);
  }
} else {
  console.log("[accessor-config] Config matches live Prisma metadata.");
  process.exit(0);
}
