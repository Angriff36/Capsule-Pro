#!/usr/bin/env node
/**
 * try-prisma — dry-run the @angriff36/manifest Prisma projection against the
 * compiled IR, for one entity or as a whole-IR summary. READ-ONLY: writes nothing.
 *
 * Usage:
 *   node manifest/scripts/try-prisma.mjs                 # summary: store targets + models emitted + skips
 *   node manifest/scripts/try-prisma.mjs Event           # generated `model Event` + diagnostics + diff vs committed schema
 *   node manifest/scripts/try-prisma.mjs Event --full    # also print the entity's IR properties/relationships
 *
 * Why this exists: the Prisma projection only emits models for entities whose IR store
 * target is `durable` (it skips `memory`/`localStorage`/no-store). The model name is the
 * IR entity name verbatim; all DB specifics (@@map, @map columns, decimal precision,
 * FKs, indexes) must be supplied via a PrismaProjectionOptions bag — none of that is in
 * the IR. This harness shows you, per entity, exactly what the projection produces today
 * and how far it is from the committed schema, so the per-entity migration (see
 * manifest/task_plan.md "Pilot") is concrete instead of guesswork.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(process.cwd());
const IR_PATH = resolve(repoRoot, "manifest/ir/kitchen.ir.json");
const SCHEMA_PATH = resolve(repoRoot, "packages/database/prisma/schema/manifest.prisma");
const PKG_PRISMA_INDEX = resolve(
  repoRoot,
  "manifest/runtime/node_modules/@angriff36/manifest/dist/manifest/projections/prisma/index.js"
);

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const entityArg = args.find((a) => !a.startsWith("--"));

function fail(msg) {
  console.error(`[try-prisma] ${msg}`);
  process.exit(1);
}

if (!existsSync(IR_PATH)) {
  fail(`IR not found at ${IR_PATH}. Run 'pnpm manifest:build' first.`);
}
if (!existsSync(PKG_PRISMA_INDEX)) {
  fail(
    `@angriff36/manifest Prisma projection not found at ${PKG_PRISMA_INDEX}. Is the package installed in manifest/runtime?`
  );
}

const ir = JSON.parse(readFileSync(IR_PATH, "utf8"));
const { PrismaProjection } = await import(pathToFileURL(PKG_PRISMA_INDEX).href);

let result;
try {
  result = new PrismaProjection().generate(ir, {
    surface: "prisma.schema",
    options: {},
  });
} catch (e) {
  fail(
    `projection threw: ${e?.message}\n${(e?.stack || "").split("\n").slice(0, 6).join("\n")}`
  );
}

const artifacts = result.artifacts || [];
const diagnostics = result.diagnostics || [];
const schemaArtifact = artifacts.find(
  (a) =>
    (a.id || "").includes("prisma") || (a.pathHint || "").includes("schema")
);
const generated =
  (schemaArtifact && (schemaArtifact.code || schemaArtifact.content)) || "";

const emittedModels = (generated.match(/^model (\w+)/gm) || []).map((m) =>
  m.slice(6)
);
const storeTarget = (name) => {
  const s = (ir.stores || []).find((x) => x.entity === name || x.name === name);
  return s ? s.target || s.kind || "?" : "<no-store>";
};

function extractModel(code, name) {
  const re = new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`);
  const m = code.match(re);
  return m ? m[0] : null;
}

// ── Summary mode ────────────────────────────────────────────────────────────
if (!entityArg) {
  const dist = {};
  for (const s of ir.stores || []) {
    const t = s.target || s.kind || "?";
    dist[t] = (dist[t] || 0) + 1;
  }
  const entityCount = (ir.entities || []).length;
  const storeCount = (ir.stores || []).length;
  console.log("=== try-prisma summary ===");
  console.log(`IR entities: ${entityCount} | store entries: ${storeCount}`);
  console.log(
    `store target distribution: ${JSON.stringify(dist)} (+${entityCount - storeCount} entities with no store entry)`
  );
  console.log(
    `\nmodels the Prisma projection emits TODAY (${emittedModels.length}):`
  );
  console.log(`  ${emittedModels.join(", ")}`);
  const skipCodes = {};
  for (const d of diagnostics) {
    skipCodes[d.code] = (skipCodes[d.code] || 0) + 1;
  }
  console.log(
    `\ndiagnostics (${diagnostics.length}): ${JSON.stringify(skipCodes)}`
  );
  console.log(
    `\nTip: 'node manifest/scripts/try-prisma.mjs <Entity>' to inspect one entity.`
  );
  console.log(
    `To make a memory entity emit a model, flip its source 'store X in memory' -> 'durable' and recompile.`
  );
  process.exit(0);
}

// ── Single-entity mode ──────────────────────────────────────────────────────
const entity = (ir.entities || []).find((e) => e.name === entityArg);
if (!entity) {
  const near = (ir.entities || [])
    .map((e) => e.name)
    .filter((n) => n.toLowerCase().includes(entityArg.toLowerCase()))
    .slice(0, 10);
  fail(
    `entity '${entityArg}' not found in IR.${near.length ? ` Did you mean: ${near.join(", ")}?` : ""}`
  );
}

console.log(`=== try-prisma: ${entityArg} ===`);
console.log(`store target: ${storeTarget(entityArg)}`);
console.log(
  `IR: ${(entity.properties || []).length} properties, ${(entity.relationships || []).length} relationships`
);

const entityDiags = diagnostics.filter((d) => d.entity === entityArg);
if (entityDiags.length) {
  console.log(`\ndiagnostics for ${entityArg}:`);
  for (const d of entityDiags) {
    console.log(`  [${d.severity}] ${d.code}: ${d.message}`);
  }
}

if (flags.has("--full")) {
  console.log("\nIR properties:");
  for (const p of entity.properties || []) {
    console.log(
      `  ${p.name}: ${p.type?.name}${p.type?.nullable ? "?" : ""}${(p.modifiers || []).length ? ` [${p.modifiers.join(",")}]` : ""}`
    );
  }
  console.log(
    `relationships: ${JSON.stringify((entity.relationships || []).map((r) => `${r.kind || r.type}->${r.target || r.entity}`))}`
  );
}

const genModel = extractModel(generated, entityArg);
console.log(`\n--- GENERATED model ${entityArg} (no options bag) ---`);
console.log(
  genModel ||
    `[not emitted] — store target is '${storeTarget(entityArg)}'. The projection only emits 'durable' entities.`
);

if (existsSync(SCHEMA_PATH)) {
  const committed = extractModel(readFileSync(SCHEMA_PATH, "utf8"), entityArg);
  console.log(
    `\n--- COMMITTED model ${entityArg} (packages/database/prisma/schema/manifest.prisma) ---`
  );
  console.log(
    committed ||
      `[no 'model ${entityArg}' in schema.prisma — name may differ (drift!) or table is hand-named differently]`
  );
  if (genModel && committed) {
    console.log(
      "\nGap to close with PrismaProjectionOptions: compare the two blocks above. Typical deltas:" +
        " @@map (tableMappings), @map snake_case columns (columnMappings), @db.Decimal(p,s) (precision)," +
        " composite @@id / @@index (indexes), relation/FK fields (foreignKeys)."
    );
  }
}
