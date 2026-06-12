#!/usr/bin/env node
/**
 * Generates Kysely TypeScript types from the compiled Manifest IR using the
 * upstream KyselyProjection.
 *
 * Produces a single `database.ts` file containing:
 *   1. Per-table TypeScript interfaces (e.g., `EventTable`, `InvoiceTable`)
 *   2. A `DB` interface mapping table names to those interfaces
 *   3. A `createDb()` factory function for creating a Kysely<DB> instance
 *
 * Only entities with SQL-compatible store targets (durable/postgres/supabase/turso)
 * are emitted. `memory`-store and `external` entities are skipped with info diagnostics.
 *
 * Usage:
 *   node manifest/scripts/generate-kysely.mjs
 *
 * Output: manifest/generated/kysely/database.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const IR_PATH = join(root, "manifest", "ir", "kitchen.ir.json");
const OUT_DIR = join(root, "manifest", "generated", "kysely");
const OUT_FILE = join(OUT_DIR, "database.ts");

// ── Load IR ──
console.log("[kysely] Loading IR...");
const ir = JSON.parse(readFileSync(IR_PATH, "utf8"));

// ── Generate using upstream projection ──
// Kysely projection is not in package exports — import directly from dist.
// This is the same approach needed for any projection not yet in the exports map.
// On Windows, dynamic import requires a file:// URL, not a bare path.
const generatorPath = join(
  root,
  "node_modules",
  "@angriff36",
  "manifest",
  "dist",
  "manifest",
  "projections",
  "kysely",
  "generator.js"
);
const generatorUrl = import.meta.resolve(
  `file://${generatorPath.replace(/\\/g, "/")}`
);
const { KyselyProjection } = await import(generatorUrl);
const projection = new KyselyProjection();

const result = projection.generate(ir, {
  surface: "kysely.types",
  options: {
    dialect: "postgresql",
    databaseInterfaceName: "DB",
    factoryFunctionName: "createDb",
    emitFactory: true,
    output: "database.ts",
  },
});

// ── Report diagnostics ──
const errors = [];
const warnings = [];
const info = [];

for (const d of result.diagnostics || []) {
  if (d.severity === "error") {
    errors.push(d);
    console.error(`  [kysely] ERROR ${d.code}: ${d.message}`);
  } else if (d.severity === "warning") {
    warnings.push(d);
    console.warn(`  [kysely] WARN ${d.code}: ${d.message}`);
  } else {
    info.push(d);
  }
}

if (errors.length > 0) {
  console.error(
    `\n[kysely] ${errors.length} error(s) — some entities may have been skipped.`
  );
}

// ── Write output ──
if (!result.artifacts?.length) {
  console.error("[kysely] No artifacts produced. Aborting.");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
const code = result.artifacts[0].code;
writeFileSync(OUT_FILE, code);

// ── Summary ──
const tableCount = (code.match(/^export interface \w+Table \{$/gm) || [])
  .length;
const dbEntries = (code.match(/^\s+\w+: \w+Table;$/gm) || []).length;

console.log(
  `\n[kysely] Generated: ${tableCount} table interfaces, ${dbEntries} DB mappings`
);
console.log(
  `[kysely] Diagnostics: ${errors.length} errors, ${warnings.length} warnings, ${info.length} info (skipped entities)`
);
console.log(`[kysely] Output: ${OUT_FILE}`);
