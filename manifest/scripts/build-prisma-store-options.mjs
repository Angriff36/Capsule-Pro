#!/usr/bin/env node
/**
 * Build prisma-store projection options for manifest.config.yaml + CLI generation.
 *
 * Merges:
 *  - ENTITY_TO_PRISMA_MODEL bridge → accessorNames (IR entity → Prisma delegate)
 *  - prisma-options.generated.json → columnMappings, tableMappings, multiSchema, etc.
 *  - schema-derived metadata JSON → accessor fallbacks for bridged models
 *
 * Output: manifest/prisma-store-options.generated.json
 * Consumed by: manifest.config.yaml (documented), generate-prisma-store-projection.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ENTITY_TO_PRISMA_MODEL } from "./entity-domain-map.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const prismaOptionsPath = join(here, "prisma-options.generated.json");
const metadataJsonPath = join(
  root,
  "manifest/generated/runtime/prisma-model-metadata.generated.json",
);
const outPath = join(here, "prisma-store-options.generated.json");

function loadJson(path, fallback = {}) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

const prismaOptions = loadJson(prismaOptionsPath);
const metadata = loadJson(metadataJsonPath);

/** IR entity name → Prisma client delegate (e.g. BankAccount → employeeBankAccount). */
const accessorNames = {};
for (const [irName, modelName] of Object.entries(ENTITY_TO_PRISMA_MODEL)) {
  const meta = metadata[modelName] ?? metadata[irName];
  if (meta?.accessor) {
    accessorNames[irName] = meta.accessor;
  }
}

const options = {
  provider: prismaOptions.provider ?? "postgresql",
  naming: prismaOptions.naming ?? "snake_case",
  metadataOutput: "manifest-prisma-store-metadata.generated.ts",
  registryOutput: "prisma-store-registry.generated.ts",
  metadataImportPath: "./manifest-prisma-store-metadata.generated.js",
  storeImportPath: "@angriff36/manifest/stores/prisma-generic",
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

writeFileSync(outPath, JSON.stringify(options, null, 2) + "\n");
process.stdout.write(
  `wrote ${outPath}\naccessorNames: ${Object.keys(accessorNames).length}\n`,
);
