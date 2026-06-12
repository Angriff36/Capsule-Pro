#!/usr/bin/env node
/**
 * Generate Manifest prisma-store projection output (IR-keyed metadata + registry).
 *
 * Uses @angriff36/manifest PrismaStoreProjection with options from
 * manifest/prisma-store-options.generated.json (built by build-prisma-store-options.mjs).
 *
 * Output (separate from schema-derived prisma-model-metadata.generated.ts):
 *   manifest/generated/runtime/manifest-prisma-store-metadata.generated.ts
 *   manifest/generated/runtime/prisma-store-registry.generated.ts
 *
 * Runtime authority: manifest-prisma-store-metadata.generated.ts (IR projection).
 * Schema-derived prisma-model-metadata is merged for requiresTenantConnect only.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(process.cwd());
const irPath = join(root, "manifest/ir/kitchen.ir.json");
const optionsPath = join(
  root,
  "manifest/scripts/prisma-store-options.generated.json"
);
const outDir = join(root, "manifest/generated/runtime");
const pkgPrismaStore = resolve(
  root,
  "node_modules/@angriff36/manifest/dist/manifest/projections/prisma-store/generator.js"
);

if (!existsSync(irPath)) {
  console.error(`IR not found: ${irPath}. Run pnpm manifest:compile first.`);
  process.exit(1);
}
if (!existsSync(optionsPath)) {
  console.error(
    `Options not found: ${optionsPath}. Run build-prisma-store-options.mjs first.`
  );
  process.exit(1);
}
if (!existsSync(pkgPrismaStore)) {
  console.error(`PrismaStoreProjection not found: ${pkgPrismaStore}`);
  process.exit(1);
}

const ir = JSON.parse(readFileSync(irPath, "utf8"));
const options = JSON.parse(readFileSync(optionsPath, "utf8"));
mkdirSync(outDir, { recursive: true });

const { PrismaStoreProjection, SURFACE_METADATA, SURFACE_REGISTRY } =
  await import(pathToFileURL(pkgPrismaStore).href);

const projection = new PrismaStoreProjection();

const metaResult = projection.generate(ir, {
  surface: SURFACE_METADATA,
  options,
});
const registryResult = projection.generate(ir, {
  surface: SURFACE_REGISTRY,
  options,
});

const errors = [
  ...metaResult.diagnostics,
  ...registryResult.diagnostics,
].filter((d) => d.severity === "error");
if (errors.length > 0) {
  console.error("prisma-store projection errors:");
  for (const e of errors) {
    console.error(`  ${e.code}: ${e.message}`);
  }
  process.exit(1);
}

const schemaMetaPath = join(outDir, "prisma-model-metadata.generated.json");

function enrichWithSchemaFlags(code) {
  if (!existsSync(schemaMetaPath)) {
    return code;
  }
  const schemaMeta = JSON.parse(readFileSync(schemaMetaPath, "utf8"));
  const match = code.match(
    /export const PRISMA_MODEL_METADATA: PrismaModelMetadata = ([\s\S]+);\s*$/
  );
  if (!match) {
    return code;
  }
  const metadata = JSON.parse(match[1]);
  for (const [name, meta] of Object.entries(metadata)) {
    const schema = schemaMeta[name];
    if (schema?.requiresTenantConnect) {
      meta.requiresTenantConnect = true;
    }
  }
  const headerEnd = code.indexOf("export const PRISMA_MODEL_METADATA");
  const header = code.slice(0, headerEnd);
  return `${header}export const PRISMA_MODEL_METADATA: PrismaModelMetadata = ${JSON.stringify(metadata, null, 2)};\n`;
}

for (const artifact of metaResult.artifacts) {
  const outPath = join(outDir, "manifest-prisma-store-metadata.generated.ts");
  writeFileSync(outPath, enrichWithSchemaFlags(artifact.code));
  console.log(`wrote ${outPath}`);
}
for (const artifact of registryResult.artifacts) {
  const outPath = join(outDir, "prisma-store-registry.generated.ts");
  writeFileSync(outPath, artifact.code);
  console.log(`wrote ${outPath}`);
}

const warnings = [
  ...metaResult.diagnostics,
  ...registryResult.diagnostics,
].filter((d) => d.severity === "warning");
if (warnings.length > 0) {
  console.log(
    `warnings: ${warnings.length} (unmappable IR fields — see diagnostics)`
  );
}
