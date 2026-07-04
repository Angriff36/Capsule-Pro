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

const root = resolve(process.cwd());
const irPath = join(root, "manifest/ir/kitchen.ir.json");
const optionsPath = join(
  root,
  "manifest/scripts/prisma-store-options.generated.json"
);
const outDir = join(root, "manifest/generated/runtime");

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

const ir = JSON.parse(readFileSync(irPath, "utf8"));
const options = JSON.parse(readFileSync(optionsPath, "utf8"));
mkdirSync(outDir, { recursive: true });

const { PrismaStoreProjection, SURFACE_METADATA, SURFACE_REGISTRY } =
  await import("@angriff36/manifest/projections/prisma-store");

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

const METADATA_EXPORT_RE =
  /export const PRISMA_MODEL_METADATA: PrismaModelMetadata = ([\s\S]+);\s*$/;

function enrichWithSchemaFlags(code) {
  if (!existsSync(schemaMetaPath)) {
    return code;
  }
  const schemaMeta = JSON.parse(readFileSync(schemaMetaPath, "utf8"));
  const match = code.match(METADATA_EXPORT_RE);
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

// Dual-write: the runtime package imports its own copy under
// manifest/runtime/src/generated (same pattern as generate-entity-accessor.mjs).
// Writing only the canonical dir left the runtime copy stale after the
// model-rename wave and broke every governed command at store creation.
const runtimeSrcGenerated = join(root, "manifest/runtime/src/generated");
mkdirSync(runtimeSrcGenerated, { recursive: true });
const writeBoth = (fileName, contents) => {
  for (const dir of [outDir, runtimeSrcGenerated]) {
    const outPath = join(dir, fileName);
    writeFileSync(outPath, contents);
    console.log(`wrote ${outPath}`);
  }
};

for (const artifact of metaResult.artifacts) {
  writeBoth(
    "manifest-prisma-store-metadata.generated.ts",
    enrichWithSchemaFlags(artifact.code)
  );
}
for (const artifact of registryResult.artifacts) {
  writeBoth("prisma-store-registry.generated.ts", artifact.code);
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
