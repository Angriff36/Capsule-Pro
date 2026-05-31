#!/usr/bin/env node
/**
 * emit-full-schema — Phase 2 functional-gate harness (ADDITIVE mode).
 *
 * Strategy (see notes §14): the live 224-model hand schema has a dense relation graph the app
 * depends on; the Manifest Prisma projection only emits relations BETWEEN durable entities, so
 * replacing a hand model with its generated twin would drop the back-relations the rest of the
 * schema points at (cascading "missing opposite relation" errors). Per the user rule "prefer the
 * generated shape unless the old schema reveals a real missing Manifest concept" — those
 * back-relations ARE that missing concept — we go ADDITIVE:
 *
 *   candidate = live schema verbatim (header + all 224 models + all enums/types)
 *             + the genuinely-NEW durable models that have NO hand twin (StaffMember, EventStaff),
 *               projected via PrismaProjection + Capsule post-process (@@map/@@id/@@schema).
 *
 * New models have no incoming relations from hand models and no outgoing relations, so they
 * validate cleanly. Full generated-replaces-hand for all durable entities is Phase 2b (needs the
 * relations modeled in Manifest source so the projection emits both sides).
 *
 * Output: manifest/ir/candidate-schema.prisma (NEVER writes the live schema). Then `prisma validate`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import {
  PILOT_OPTIONS,
  ENTITY_SCHEMA_MAP,
  COMPOSITE_KEY,
  TABLE_MAP,
} from "./prisma-projection-options.mjs";

const repoRoot = resolve(process.cwd());
const IR_PATH = resolve(repoRoot, "manifest/ir/kitchen.ir.json");
const LIVE_SCHEMA = resolve(repoRoot, "packages/database/prisma/schema.prisma");
const OUT = resolve(repoRoot, "manifest/ir/candidate-schema.prisma");
const PKG_PRISMA = resolve(
  repoRoot,
  "manifest/runtime/node_modules/@angriff36/manifest/dist/manifest/projections/prisma/generator.js"
);

const ir = JSON.parse(readFileSync(IR_PATH, "utf8"));
const liveSchema = readFileSync(LIVE_SCHEMA, "utf8");
const { PrismaProjection } = await import(pathToFileURL(PKG_PRISMA).href);

const durableEntities = new Set(
  (ir.stores || []).filter((s) => s.target === "durable").map((s) => s.entity)
);
const handModelNames = new Set(
  [...liveSchema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1])
);
// genuinely-new durable models = durable AND no hand twin
const newDurable = [...durableEntities].filter((e) => !handModelNames.has(e)).sort();

// --- project all durable models, extract just the new ones, post-process ---
const result = new PrismaProjection().generate(ir, {
  surface: "prisma.schema",
  options: PILOT_OPTIONS,
});
const generatedSrc =
  (result.artifacts[0] && (result.artifacts[0].code || result.artifacts[0].content)) || "";
function extractModel(code, name) {
  const m = code.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`));
  return m ? m[0] : null;
}
function postProcess(block, entity) {
  if (!block) return block;
  let b = block;
  const table = TABLE_MAP[entity];
  if (table && !/@@map\(/.test(b)) {
    b = b.replace(/\n\}\s*$/, `\n  @@map("${table}")\n}`);
  }
  const key = COMPOSITE_KEY[entity];
  if (key && !/\n\s*@@id\(/.test(b)) {
    b = b.replace(/(\n\s*id\s+\w+[^\n]*?)\s+@id\b/, "$1");
    b = b.replace(/\n\}\s*$/, `\n  @@id([${key.join(", ")}])\n}`);
  }
  const schema = ENTITY_SCHEMA_MAP[entity];
  if (schema && !/@@schema\(/.test(b)) {
    b = b.replace(/\n\}\s*$/, `\n  @@schema("${schema}")\n}`);
  }
  return b;
}

const appended = [];
const missing = [];
const newBlocks = [];
for (const entity of newDurable) {
  const gen = extractModel(generatedSrc, entity);
  if (!gen) {
    missing.push(entity);
    continue;
  }
  newBlocks.push(postProcess(gen, entity));
  appended.push(entity);
}

// --- assemble: live schema verbatim + appended new models ---
const candidate =
  liveSchema.trimEnd() +
  "\n\n// ===== Manifest-generated durable models (additive; no hand twin) =====\n\n" +
  newBlocks.join("\n\n") +
  "\n";
writeFileSync(OUT, candidate);

const summary = [
  `[emit-full-schema] ADDITIVE — wrote ${OUT}`,
  `  live hand models kept verbatim: ${handModelNames.size}`,
  `  appended NEW durable models: ${appended.length} (${appended.join(", ")})`,
  `  durable-but-not-emitted (skipped): ${missing.join(", ") || "(none)"}`,
  `  durable WITH hand twin (left as hand model — Phase 2b): ${[...durableEntities].filter((e) => handModelNames.has(e)).sort().join(", ")}`,
];
writeFileSync(resolve(repoRoot, ".tmp/emit-summary.txt"), summary.join("\n"));
console.log(summary.join("\n"));
