#!/usr/bin/env node
/**
 * Generates Drizzle ORM TypeScript schema from the compiled Manifest IR using
 * the upstream DrizzleProjection.
 *
 * Produces a single `schema.ts` file containing:
 *   1. Per-entity Drizzle table definitions (e.g., `export const event = pgTable(...)`)
 *   2. Relationship exports using Drizzle's `relations()` API
 *   3. Index definitions where configured
 *
 * Only entities with SQL-compatible store targets (durable/postgres/supabase)
 * are emitted. `memory`-store, `external`, and unstore'd entities are skipped.
 *
 * Usage:
 *   node manifest/scripts/generate-drizzle.mjs
 *
 * Output: manifest/generated/drizzle/schema.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const IR_PATH = join(root, "manifest", "ir", "kitchen.ir.json");
const OUT_DIR = join(root, "manifest", "generated", "drizzle");
const OUT_FILE = join(OUT_DIR, "schema.ts");

// ── Load IR ──
console.log("[drizzle] Loading IR...");
const ir = JSON.parse(readFileSync(IR_PATH, "utf8"));

// ── Generate using upstream projection ──
// Drizzle projection is exported at @angriff36/manifest/projections/drizzle.
// On Windows, dynamic import requires a file:// URL.
const generatorPath = join(
  root,
  "node_modules",
  "@angriff36",
  "manifest",
  "dist",
  "manifest",
  "projections",
  "drizzle",
  "generator.js"
);
const generatorUrl = import.meta.resolve(
  `file://${generatorPath.replace(/\\/g, "/")}`
);
const { DrizzleProjection } = await import(generatorUrl);
const projection = new DrizzleProjection();

const result = projection.generate(ir, {
  surface: "drizzle.schema",
  options: {
    dialect: "postgresql",
    output: "schema.ts",
  },
});

// ── Report diagnostics ──
const errors = [];
const warnings = [];
const info = [];

for (const d of result.diagnostics || []) {
  if (d.severity === "error") {
    errors.push(d);
    console.error(`  [drizzle] ERROR ${d.code}: ${d.message}`);
  } else if (d.severity === "warning") {
    warnings.push(d);
    console.warn(`  [drizzle] WARN ${d.code}: ${d.message}`);
  } else {
    info.push(d);
  }
}

if (errors.length > 0) {
  console.error(
    `\n[drizzle] ${errors.length} error(s) — some entities may have been skipped.`
  );
}

// ── Write output ──
if (!result.artifacts?.length) {
  console.error("[drizzle] No artifacts produced. Aborting.");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
const code = result.artifacts[0].code;
writeFileSync(OUT_FILE, code);

// ── Summary ──
const tableCount = (code.match(/^export const \w+ = pgTable\("/gm) || [])
  .length;
const relationsCount = (
  code.match(/^export const \w+Relations = relations\(/gm) || []
).length;
const indexCount = (code.match(/^export const \w+ = index\(/gm) || []).length;
const lineCount = code.split("\n").length;

console.log(
  `\n[drizzle] Generated: ${tableCount} table defs, ${relationsCount} relation defs, ${indexCount} index defs`
);
console.log(`[drizzle] Total lines: ${lineCount}`);
console.log(
  `[drizzle] Diagnostics: ${errors.length} errors, ${warnings.length} warnings, ${info.length} info (skipped entities)`
);
console.log(`[drizzle] Output: ${OUT_FILE}`);
