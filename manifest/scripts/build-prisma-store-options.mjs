#!/usr/bin/env node
/**
 * Build prisma-store projection options from manifest.config.yaml + derive-prisma-options.
 *
 * accessorNames and entityToPrismaModel come ONLY from manifest.config.yaml (via read-config).
 * prisma-options.generated.json supplies columnMappings, tableMappings, multiSchema, etc.
 *
 * Output: manifest/scripts/prisma-store-options.generated.json
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getAccessorConfig } from "./read-config.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const prismaOptionsPath = join(here, "prisma-options.generated.json");
const metadataJsonPath = join(
  root,
  "manifest/generated/runtime/prisma-model-metadata.generated.json"
);
const outPath = join(here, "prisma-store-options.generated.json");

function loadJson(path, fallback = {}) {
  if (!existsSync(path)) {
    return fallback;
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

const prismaOptions = loadJson(prismaOptionsPath);
const metadata = loadJson(metadataJsonPath);
const { accessorNames, entityToPrismaModel, naming } = getAccessorConfig();

// Sanity: config delegates must match live metadata (same check as check-accessor-config.mjs).
for (const [irName, delegate] of Object.entries(accessorNames)) {
  const modelName = entityToPrismaModel[irName] ?? irName;
  const meta = metadata[modelName];
  if (meta?.accessor && meta.accessor !== delegate) {
    console.error(
      `[build-prisma-store-options] ${irName}: config accessorNames=${delegate} but metadata=${meta.accessor} — fix manifest.config.yaml`
    );
    process.exit(1);
  }
}

const options = {
  provider: prismaOptions.provider ?? "postgresql",
  naming: naming ?? prismaOptions.naming ?? "snake_case",
  metadataOutput: "manifest-prisma-store-metadata.generated.ts",
  registryOutput: "prisma-store-registry.generated.ts",
  metadataImportPath: "./prisma-model-metadata.generated",
  storeImportPath: "@angriff36/manifest/stores/prisma-generic",
  entityToPrismaModel,
  accessorNames,
  tableMappings: prismaOptions.tableMappings ?? {},
  columnMappings: prismaOptions.columnMappings ?? {},
  typeMappings: prismaOptions.typeMappings ?? {},
  fieldAttributes: prismaOptions.fieldAttributes ?? {},
  dbAttributes: prismaOptions.dbAttributes ?? {},
  indexes: prismaOptions.indexes ?? {},
  foreignKeys: prismaOptions.foreignKeys ?? {},
  precision: prismaOptions.precision ?? {},
  multiSchema: prismaOptions.multiSchema,
};

writeFileSync(outPath, `${JSON.stringify(options, null, 2)}\n`);
process.stdout.write(
  `wrote ${outPath}\naccessorNames: ${Object.keys(accessorNames).length}\n`
);
