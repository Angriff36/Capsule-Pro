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

const IR_PATH = resolve("manifest/ir/kitchen.ir.json");

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

// Load IR
const ir = JSON.parse(readFileSync(IR_PATH, "utf-8"));
console.log(`Loaded IR: ${ir.entities?.length ?? 0} entities`);

// Import the ZodProjection from the installed package's stable subpath export.
const { ZodProjection } = await import("@angriff36/manifest/projections/zod");

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
  // Strip the projection's per-file "// Generated at: <ISO timestamp>" line so the
  // committed output is deterministic and can be byte-compared by a drift gate
  // (mirrors the OpenAPI generator, which deliberately emits no timestamp). The
  // package projection is not editable in-repo, so normalize its output here per
  // constitution §10 (fix the producer, never hand-edit generated files).
  const code = artifact.code.replace(/^\/\/ Generated at: .*\r?\n/m, "");
  writeFileSync(filePath, code, "utf-8");
  entityCount++;
}

// Generate barrel index
const files = readdirSync(outDir)
  .filter((f) => f.endsWith(".schema.ts"))
  .sort();

const barrel = [
  "/**",
  " * Manifest Zod Schemas — auto-generated. DO NOT EDIT.",
  // No timestamp here: the committed barrel must be deterministic so a drift gate
  // can byte-compare it (mirrors the OpenAPI generator). See the per-file strip above.
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
