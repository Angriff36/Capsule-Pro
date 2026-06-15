#!/usr/bin/env node

/**
 * check-schema-overlap.mjs — Build Assertion: Schema Model Overlap Check
 *
 * Divergence D22: Ensures no model name appears in both the infra-core Prisma
 * partial (`manifest/schema-partials/infra-core.prisma`) AND the Manifest IR
 * entities (`manifest/ir/kitchen.ir.json`).
 *
 * The infra-core partial is supposed to contain ONLY reference/lookup/infra
 * tables that are NOT defined as Manifest entities. If a model appears in both,
 * it means a domain entity was authored in .manifest source but its model was
 * not removed from the infra-core partial — a schema drift that causes
 * duplicate table definitions when the schema is assembled.
 *
 * Run as a CI gate: exits with code 1 if any overlap is found.
 *
 * Usage: node manifest/scripts/check-schema-overlap.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");

const IR_PATH = resolve(PROJECT_ROOT, "manifest/ir/kitchen.ir.json");
const PARTIAL_PATH = resolve(
  PROJECT_ROOT,
  "manifest/schema-partials/infra-core.prisma"
);

// ---------------------------------------------------------------------------
// 1. Load IR entity names
// ---------------------------------------------------------------------------
const ir = JSON.parse(readFileSync(IR_PATH, "utf8"));
const irEntityNames = new Set(ir.entities.map((e) => e.name));
console.log(`IR entities: ${irEntityNames.size}`);

// ---------------------------------------------------------------------------
// 2. Load infra-core partial model names
// ---------------------------------------------------------------------------
const partialText = readFileSync(PARTIAL_PATH, "utf8");
const partialModelNames = [
  ...partialText.matchAll(/^model\s+(\w+)\s*\{/gm),
].map((m) => m[1]);
const partialModelSet = new Set(partialModelNames);
console.log(`Infra-core partial models: ${partialModelSet.size}`);

// ---------------------------------------------------------------------------
// 3. Check for overlap
// ---------------------------------------------------------------------------
const overlaps = partialModelNames.filter((name) => irEntityNames.has(name));

if (overlaps.length > 0) {
  console.error(
    `\n✗ OVERLAP DETECTED: ${overlaps.length} model(s) appear in BOTH the infra-core partial and IR entities:`
  );
  for (const name of overlaps) {
    console.error(`  • ${name}`);
  }
  console.error(
    `\nThese models should be removed from manifest/schema-partials/infra-core.prisma`
  );
  console.error(
    `since they are now defined as Manifest entities in .manifest source.\n`
  );
  process.exit(1);
}

console.log(
  `\n✓ No overlap: all ${partialModelSet.size} infra-core models are distinct from ${irEntityNames.size} IR entities.`
);
