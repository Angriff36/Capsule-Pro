#!/usr/bin/env node
/**
 * Prisma ↔ Manifest ownership classifier (READ-ONLY, deterministic).
 *
 * Classifies every LIVE Prisma model against the compiled Manifest IR, and every IR entity
 * with no live Prisma model, into mutually-exclusive ownership buckets. This is the canonical
 * evidence base for the memory→durable migration: bucket B (with a `create` command) is the
 * pool of safe flip candidates.
 *
 * Live-Prisma-model buckets (every model lands in exactly one):
 *   A durable_generated   — IR entity, store target = durable (Prisma projection emits it).
 *   B manifest_memory     — IR entity, store target = non-durable (memory/localStorage/...).
 *   C manifest_no_store   — IR entity, but NO store entry in the IR at all.
 *   D prisma_only_legacy  — Prisma model with NO matching IR entity (by model name).
 *
 * IR-entities-with-no-live-model buckets (the reverse gap; every such entity in exactly one):
 *   durable_no_model | memory_no_model | no_store_no_model
 *
 * Invariants enforced at the end (script exits non-zero if violated):
 *   A + B + C + irNoModel.length === IR entity count
 *   A + B + C + D === live Prisma model count
 *   irNoModel sub-buckets sum === irNoModel.length
 *   JSON counts === Markdown counts (single source: the same `counts` object feeds both)
 *
 * Inputs:
 *   manifest/ir/kitchen.ir.json          (entities, stores, commands)
 *   packages/database/prisma/schema.prisma (live model names + @@map + @@schema)
 *
 * Outputs:
 *   .tmp/model-classification.json   (machine-readable, full buckets)
 *   .tmp/model-classification.md     (human-readable, full lists)
 *   docs/manifest/model-ownership-classification.md  (committed report; pass --docs to write)
 *
 * Usage:
 *   node manifest/scripts/classify-prisma-manifest-ownership.mjs            # writes .tmp artifacts
 *   node manifest/scripts/classify-prisma-manifest-ownership.mjs --docs     # also writes docs report
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

const root = resolve(process.cwd());
const writeDocs = process.argv.includes("--docs");

const ir = JSON.parse(
  readFileSync(resolve(root, "manifest/ir/kitchen.ir.json"), "utf8"),
);
const schema = readFileSync(
  resolve(root, "packages/database/prisma/schema.prisma"),
  "utf8",
);

// --- IR maps ---
const entityNames = new Set((ir.entities || []).map((e) => e.name));
const storeByEntity = new Map();
for (const s of ir.stores || []) {
  storeByEntity.set(s.entity, s.target ?? s.store ?? JSON.stringify(s));
}
const hasCreate = new Set(
  (ir.commands || [])
    .filter((c) => c.name === "create")
    .map((c) => c.entity),
);
const commandsByEntity = new Map();
for (const c of ir.commands || []) {
  if (!commandsByEntity.has(c.entity)) commandsByEntity.set(c.entity, []);
  commandsByEntity.get(c.entity).push(c.name);
}

// --- parse live schema models: name + @@map table + @@schema ---
const models = [];
const re = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
let m;
while ((m = re.exec(schema)) !== null) {
  const [, name, body] = m;
  const mapM = body.match(/@@map\("([^"]+)"\)/);
  const schemaM = body.match(/@@schema\("([^"]+)"\)/);
  models.push({
    name,
    table: mapM ? mapM[1] : name,
    pgSchema: schemaM ? schemaM[1] : null,
  });
}

// --- classify live models ---
const buckets = { A: [], B: [], C: [], D: [] };
for (const model of models) {
  if (entityNames.has(model.name)) {
    const target = storeByEntity.get(model.name);
    const row = {
      ...model,
      target: target ?? "(no store entry)",
      create: hasCreate.has(model.name),
      commands: (commandsByEntity.get(model.name) || []).sort(),
    };
    if (target === "durable") buckets.A.push(row);
    else if (target == null) buckets.C.push(row);
    else buckets.B.push(row);
  } else {
    buckets.D.push({ ...model });
  }
}

// --- IR entities with NO live Prisma model (reverse gap), sub-bucketed by store status ---
const modelNames = new Set(models.map((x) => x.name));
const irNoModel = [...entityNames]
  .filter((n) => !modelNames.has(n))
  .sort()
  .map((name) => {
    const target = storeByEntity.get(name);
    const sub =
      target === "durable"
        ? "durable_no_model"
        : target == null
          ? "no_store_no_model"
          : "memory_no_model";
    return { name, target: target ?? "(no store entry)", sub, create: hasCreate.has(name) };
  });
const irNoModelSub = {
  durable_no_model: irNoModel.filter((x) => x.sub === "durable_no_model"),
  memory_no_model: irNoModel.filter((x) => x.sub === "memory_no_model"),
  no_store_no_model: irNoModel.filter((x) => x.sub === "no_store_no_model"),
};

// --- single source of truth for counts (feeds both JSON and MD) ---
const counts = {
  liveModels: models.length,
  irEntities: entityNames.size,
  irStores: (ir.stores || []).length,
  A: buckets.A.length,
  B: buckets.B.length,
  C: buckets.C.length,
  D: buckets.D.length,
  irNoModel: irNoModel.length,
  irNoModel_durable: irNoModelSub.durable_no_model.length,
  irNoModel_memory: irNoModelSub.memory_no_model.length,
  irNoModel_noStore: irNoModelSub.no_store_no_model.length,
  B_withCreate: buckets.B.filter((x) => x.create).length,
  B_withoutCreate: buckets.B.filter((x) => !x.create).length,
};

// --- invariants (fail loud) ---
const errors = [];
if (counts.A + counts.B + counts.C + counts.irNoModel !== counts.irEntities)
  errors.push(
    `A+B+C+irNoModel (${counts.A + counts.B + counts.C + counts.irNoModel}) !== irEntities (${counts.irEntities})`,
  );
if (counts.A + counts.B + counts.C + counts.D !== counts.liveModels)
  errors.push(
    `A+B+C+D (${counts.A + counts.B + counts.C + counts.D}) !== liveModels (${counts.liveModels})`,
  );
if (
  counts.irNoModel_durable + counts.irNoModel_memory + counts.irNoModel_noStore !==
  counts.irNoModel
)
  errors.push("irNoModel sub-buckets do not sum to irNoModel");

// --- render markdown (counts object is the single source — JSON and MD cannot diverge) ---
const out = [];
out.push("# Prisma ↔ Manifest ownership classification\n");
out.push(
  "> Generated by `manifest/scripts/classify-prisma-manifest-ownership.mjs` (deterministic, read-only).\n",
);
out.push(
  `Live Prisma models: **${counts.liveModels}** · IR entities: **${counts.irEntities}** · IR store entries: **${counts.irStores}**\n`,
);
out.push("| Bucket | Meaning | Count |");
out.push("|---|---|---|");
out.push(`| A durable_generated | IR entity, store=durable (projection emits) | ${counts.A} |`);
out.push(`| B manifest_memory | IR entity, store=non-durable (flip candidates) | ${counts.B} |`);
out.push(`| C manifest_no_store | IR entity, no store entry | ${counts.C} |`);
out.push(`| D prisma_only_legacy | Prisma model, no IR entity | ${counts.D} |`);
out.push(`| — irNoModel | IR entity, no live Prisma model | ${counts.irNoModel} |`);
out.push("");
out.push(
  `B split: **${counts.B_withCreate}** with a \`create\` command (flip candidates) · ${counts.B_withoutCreate} without.`,
);
out.push(
  `irNoModel split: ${counts.irNoModel_durable} durable · ${counts.irNoModel_memory} memory · ${counts.irNoModel_noStore} no-store.\n`,
);
if (errors.length) {
  out.push("## ⚠ INVARIANT VIOLATIONS\n");
  for (const e of errors) out.push(`- ${e}`);
  out.push("");
}

function tbl(title, rows, cols) {
  out.push(`\n## ${title} (${rows.length})\n`);
  out.push("| " + cols.join(" | ") + " |");
  out.push("|" + cols.map(() => "---").join("|") + "|");
  for (const r of rows)
    out.push(
      "| " +
        cols
          .map((c) => (Array.isArray(r[c]) ? r[c].join(" ") : String(r[c] ?? "")))
          .join(" | ") +
        " |",
    );
}
const byName = (a, b) => a.name.localeCompare(b.name);
tbl("A — durable_generated", buckets.A.sort(byName), ["name", "table", "pgSchema", "commands"]);
tbl("B — manifest entity but non-durable (memory)", buckets.B.sort(byName), [
  "name",
  "table",
  "pgSchema",
  "create",
  "commands",
]);
tbl("C — manifest entity but NO store entry", buckets.C.sort(byName), [
  "name",
  "table",
  "pgSchema",
  "create",
  "commands",
]);
tbl("D — prisma-only legacy (no IR entity)", buckets.D.sort(byName), ["name", "table", "pgSchema"]);
out.push("\n## IR entities with NO live Prisma model — durable_no_model\n");
out.push(irNoModelSub.durable_no_model.map((x) => x.name).join(", ") || "(none)");
out.push("\n## IR entities with NO live Prisma model — memory_no_model\n");
out.push(irNoModelSub.memory_no_model.map((x) => x.name).join(", ") || "(none)");
out.push("\n## IR entities with NO live Prisma model — no_store_no_model\n");
out.push(irNoModelSub.no_store_no_model.map((x) => x.name).join(", ") || "(none)");

const md = out.join("\n");
const json = JSON.stringify(
  { generatedBy: "classify-prisma-manifest-ownership.mjs", counts, buckets, irNoModel, irNoModelSub },
  null,
  2,
);

mkdirSync(resolve(root, ".tmp"), { recursive: true });
writeFileSync(resolve(root, ".tmp/model-classification.json"), json);
writeFileSync(resolve(root, ".tmp/model-classification.md"), md);
if (writeDocs) {
  const docsPath = resolve(root, "docs/manifest/model-ownership-classification.md");
  mkdirSync(dirname(docsPath), { recursive: true });
  writeFileSync(docsPath, md);
}

process.stdout.write(
  `A=${counts.A} B=${counts.B} (create:${counts.B_withCreate}) C=${counts.C} D=${counts.D} ` +
    `irNoModel=${counts.irNoModel} (durable:${counts.irNoModel_durable} memory:${counts.irNoModel_memory} noStore:${counts.irNoModel_noStore})\n` +
    `liveModels=${counts.liveModels} irEntities=${counts.irEntities} irStores=${counts.irStores}\n` +
    (writeDocs ? "wrote docs/manifest/model-ownership-classification.md\n" : "") +
    (errors.length ? `INVARIANTS FAILED:\n- ${errors.join("\n- ")}\n` : "invariants OK\n"),
);
if (errors.length) process.exit(1);
