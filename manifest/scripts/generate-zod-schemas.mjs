#!/usr/bin/env node
/**
 * generate-zod-schemas — Tier 5 pilot: generates Zod validation schemas from Manifest IR.
 *
 * Uses the ZodProjection from @angriff36/manifest to produce z.object() schemas
 * for all 202 entities. Emits one file per entity (zod.entity surface) to avoid
 * name collisions present in the combined zod.schemas surface.
 *
 * Usage:
 *   node manifest/scripts/generate-zod-schemas.mjs [--outdir <path>]
 *     --outdir  output directory (default: manifest/generated/schemas)
 *
 * Output: one <EntityName>.schema.ts per entity, plus an index.ts barrel.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const IR_PATH = resolve("manifest/ir/kitchen.ir.json");
const PKG_ROOT = resolve(
  "manifest/runtime/node_modules/@angriff36/manifest/dist/manifest"
);
const PKG_ZOD = resolve(PKG_ROOT, "projections/zod/generator.js");

// Parse args
const args = process.argv.slice(2);
let outDir = resolve("manifest/generated/schemas");
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--outdir" && args[i + 1]) {
    outDir = resolve(args[i + 1]);
    i++;
  }
}

if (!existsSync(IR_PATH)) {
  console.error(`IR not found at ${IR_PATH}. Run pnpm manifest:compile first.`);
  process.exit(1);
}

if (!existsSync(PKG_ZOD)) {
  console.error(`ZodProjection not found at ${PKG_ZOD}.`);
  process.exit(1);
}

// Load IR
const ir = JSON.parse(readFileSync(IR_PATH, "utf-8"));
console.log(`Loaded IR: ${ir.entities?.length ?? 0} entities`);

// Import the ZodProjection directly from the installed package. Earlier package
// versions (<=2.2.0) shipped an extensionless ESM import of `constraint-analysis`
// that broke Node's resolver, which forced a copy-and-patch into a temp file.
// @angriff36/manifest 2.3.x ships proper `.js` extensions on its internal
// imports, so importing the generator in place resolves cleanly — and the old
// temp-copy actually BROKE under 2.3.1 (relative imports resolved against the
// temp dir, not the package). Direct import is both simpler and correct.
const { ZodProjection } = await import(pathToFileURL(PKG_ZOD).href);

// Generate zod.entity surface (one file per entity — cleanest, no name collisions)
const projection = new ZodProjection();
const result = projection.generate(ir, {
  surface: "zod.entity",
  options: {
    emitTypes: true,
    emitComputedSchemas: true,
    zodImportPath: "zod",
    emitHeader: true,
  },
});

if (result.errors?.length) {
  console.error("Projection errors:", result.errors);
  process.exit(1);
}

// Ensure output directory exists
mkdirSync(outDir, { recursive: true });

// Write each entity schema (content is in artifact.code, not artifact.content)
let entityCount = 0;
for (const artifact of result.artifacts ?? []) {
  if (!artifact.code) {
    continue; // skip empty artifacts
  }
  const fileName = artifact.pathHint ?? `${artifact.id ?? "unknown"}.schema.ts`;
  const filePath = resolve(outDir, basename(fileName));
  writeFileSync(filePath, artifact.code, "utf-8");
  entityCount++;
}

// Generate barrel index
const files = readdirSync(outDir)
  .filter((f) => f.endsWith(".schema.ts"))
  .sort();

const barrel = [
  "/**",
  " * Manifest Zod Schemas — auto-generated. DO NOT EDIT.",
  ` * Generated: ${new Date().toISOString()}`,
  ` * Entities: ${files.length}`,
  " * Projection: zod.entity",
  " */",
  "",
  ...files.map((f) => {
    const name = basename(f, ".schema.ts");
    return `export * from "./${name}.js";`;
  }),
  "",
].join("\n");

writeFileSync(resolve(outDir, "index.ts"), barrel, "utf-8");

console.log(`Generated ${entityCount} entity schemas + index.ts in ${outDir}`);

if (result.diagnostics?.length) {
  const warnings = result.diagnostics.filter((d) => d.level === "warn");
  const infos = result.diagnostics.filter((d) => d.level === "info");
  if (warnings.length) {
    console.log(`Warnings: ${warnings.length}`);
  }
  if (infos.length) {
    console.log(`Info: ${infos.length}`);
  }
}
