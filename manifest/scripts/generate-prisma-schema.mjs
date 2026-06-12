#!/usr/bin/env node
/**
 * generate-prisma-schema — Phase 2 harness (READ-ONLY; writes nothing to schema.prisma).
 *
 * Runs the @angriff36/manifest PrismaProjection against the compiled IR with a Capsule
 * options bag, applies the Capsule post-process (the projection can't emit `@@schema`, and the
 * IR currently carries no composite `entity.key` so it emits single `id @id` instead of
 * `@@id([tenantId, id])` — both are injected here), then diffs ONE entity's generated model
 * against the committed schema.prisma block.
 *
 * Why a post-process (constitution §10): the upstream projection is a derived surface with no
 * `@@schema`/per-entity-schema option and an IR that lacks `entity.key`. Rather than hand-edit
 * generated output, we own the gap-closing transform in-repo — the same pattern as the Phase-1
 * route-accessor rewrite. See manifest/notes.md §11.
 *
 * Usage:
 *   node manifest/scripts/generate-prisma-schema.mjs <Entity> [--raw]
 *     <Entity>  entity to project + diff (e.g. RateLimitConfig, Event)
 *     --raw     also print the projection output BEFORE the Capsule post-process
 *
 * This is a scoping/parity harness for the Phase 2 pilot, NOT the eventual schema generator.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  COMPOSITE_KEY,
  ENTITY_SCHEMA_MAP,
  PILOT_OPTIONS,
} from "./prisma-projection-options.mjs";

const repoRoot = resolve(process.cwd());
const IR_PATH = resolve(repoRoot, "manifest/ir/kitchen.ir.json");
const SCHEMA_PATH = resolve(repoRoot, "packages/database/prisma/schema.prisma");
// 1.5.0 dist layout (verified): dist/manifest/projections/prisma/generator.js exports PrismaProjection.
const PKG_PRISMA = resolve(
  repoRoot,
  "manifest/runtime/node_modules/@angriff36/manifest/dist/manifest/projections/prisma/generator.js"
);

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const entityArg = args.find((a) => !a.startsWith("--"));

function fail(msg) {
  console.error(`[generate-prisma-schema] ${msg}`);
  process.exit(1);
}
if (!entityArg) {
  fail("usage: generate-prisma-schema.mjs <Entity> [--raw]");
}
if (!existsSync(IR_PATH)) {
  fail(`IR not found at ${IR_PATH}. Run 'pnpm manifest:compile'.`);
}
if (!existsSync(PKG_PRISMA)) {
  fail(`PrismaProjection not found at ${PKG_PRISMA}.`);
}

const ir = JSON.parse(readFileSync(IR_PATH, "utf8"));
const { PrismaProjection } = await import(pathToFileURL(PKG_PRISMA).href);

let result;
try {
  result = new PrismaProjection().generate(ir, {
    surface: "prisma.schema",
    options: PILOT_OPTIONS,
  });
} catch (e) {
  fail(
    `projection threw: ${e?.message}\n${(e?.stack || "").split("\n").slice(0, 6).join("\n")}`
  );
}

const artifacts = result.artifacts || [];
const diagnostics = (result.diagnostics || []).filter(
  (d) => d.entity === entityArg
);
const schemaArtifact = artifacts.find(
  (a) =>
    (a.id || "").includes("prisma") || (a.pathHint || "").includes("schema")
);
const generatedAll =
  (schemaArtifact && (schemaArtifact.code || schemaArtifact.content)) || "";

function extractModel(code, name) {
  const m = code.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`));
  return m ? m[0] : null;
}

/**
 * Capsule post-process: inject the two things the projection cannot produce for this codebase.
 *  1. composite @@id([tenantId, id]) when the entity has a known composite key and the model
 *     currently carries a single `id ... @id` (strip the inline @id, add a model-level @@id).
 *  2. @@schema("<domain>") from ENTITY_SCHEMA_MAP, inserted as the last line before the closing }.
 * Read-only transform on a string; does not touch any file.
 */
function postProcess(modelBlock, entityName) {
  if (!modelBlock) {
    return modelBlock;
  }
  let block = modelBlock;
  const key = COMPOSITE_KEY[entityName];
  if (key && /\n\s*@@id\(/.test(block) === false) {
    // remove inline `@id` on the single id field
    block = block.replace(/(\bid\s+\w+[^\n]*?)\s+@id\b/, "$1");
    // add @@id before closing brace
    block = block.replace(/\n\}\s*$/, `\n\n  @@id([${key.join(", ")}])\n}`);
  }
  const schema = ENTITY_SCHEMA_MAP[entityName];
  if (schema && !/@@schema\(/.test(block)) {
    block = block.replace(/\n\}\s*$/, `\n  @@schema("${schema}")\n}`);
  }
  return block;
}

const rawModel = extractModel(generatedAll, entityArg);
const finalModel = postProcess(rawModel, entityArg);

console.log(`=== generate-prisma-schema: ${entityArg} ===`);
if (diagnostics.length) {
  console.log(`\ndiagnostics (${diagnostics.length}):`);
  for (const d of diagnostics) {
    console.log(`  [${d.severity}] ${d.code}: ${d.message}`);
  }
}

if (flags.has("--raw")) {
  console.log("\n--- RAW projection output (before Capsule post-process) ---");
  console.log(rawModel || "[not emitted — store target may be non-durable]");
}

console.log("\n--- GENERATED + post-process ---");
console.log(finalModel || "[not emitted]");

if (existsSync(SCHEMA_PATH)) {
  const committed = extractModel(readFileSync(SCHEMA_PATH, "utf8"), entityArg);
  console.log("\n--- COMMITTED (packages/database/prisma/schema.prisma) ---");
  console.log(committed || `[no 'model ${entityArg}' — name drift?]`);
}
