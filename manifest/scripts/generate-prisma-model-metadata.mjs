#!/usr/bin/env node
/**
 * Generate runtime Prisma model metadata from schema.prisma.
 *
 * WHY: Prisma 7.x removed the runtime `Prisma.dmmf` object (it is type-only now),
 * so the generic IR-driven Prisma store cannot introspect models at runtime.
 * This build-time script parses `schema.prisma` and emits a static metadata table
 * that `GenericPrismaStore` consumes to map Manifest entity fields → Prisma columns,
 * coerce by type, skip DB-managed fields, and build composite-key where-clauses —
 * without a hand-written store class or `switch` case per entity.
 *
 * Output is a "// Generated ... DO NOT EDIT" file; re-run after schema changes.
 * READ-ONLY w.r.t. the schema; only writes the generated metadata file.
 *
 * Usage: node manifest/scripts/generate-prisma-model-metadata.mjs
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { getAccessorConfig } from "./read-config.mjs";

const { entityToPrismaModel: ENTITY_TO_PRISMA_MODEL } = getAccessorConfig();
const root = resolve(process.cwd());
const schemaPath = resolve(
  root,
  "packages/database/prisma/schema/manifest.prisma"
);
const outPath = resolve(
  root,
  "manifest/generated/runtime/prisma-model-metadata.generated.ts"
);

/**
 * Load versionProperty from IR JSON files.
 * Returns a Map<entityName, versionPropertyName> for entities that declare one.
 */
function loadVersionProperties() {
  const irDir = resolve(root, "manifest/ir");
  const versionMap = new Map();
  if (!existsSync(irDir)) {
    return versionMap;
  }

  const irFiles = readdirSync(irDir)
    .filter((name) => name.endsWith(".ir.json"))
    .sort();

  for (const irFile of irFiles) {
    const irPath = join(irDir, irFile);
    try {
      const ir = JSON.parse(readFileSync(irPath, "utf8"));
      for (const entity of ir.entities || []) {
        if (entity.versionProperty) {
          versionMap.set(entity.name, entity.versionProperty);
        }
      }
    } catch {
      // Skip unreadable/parsable IR files silently
    }
  }
  return versionMap;
}

const schema = readFileSync(schemaPath, "utf8");

// Prisma scalar types the generic store knows how to coerce.
const SCALARS = new Set([
  "String",
  "Boolean",
  "Int",
  "BigInt",
  "Float",
  "Decimal",
  "DateTime",
  "Json",
  "Bytes",
]);

// Collect enum + model names (enums are treated as string-like scalars; model-typed
// fields are relations and are skipped by the generic store).
const enumNames = new Set();
for (const m of schema.matchAll(/^enum\s+(\w+)\s*\{/gm)) {
  enumNames.add(m[1]);
}
const modelNames = new Set();
for (const m of schema.matchAll(/^model\s+(\w+)\s*\{/gm)) {
  modelNames.add(m[1]);
}

/** Prisma client accessor: model name with first char lowercased (e.g. Container -> container). */
const accessorOf = (name) => name[0].toLowerCase() + name.slice(1);
/** snake_case (or already-camel) Prisma field name -> camelCase Manifest property name. */
const toIrName = (field) => {
  const camel = field.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
  return camel[0].toLowerCase() + camel.slice(1);
};

const models = {};
const modelRe = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
for (const mm of schema.matchAll(modelRe)) {
  const [, name, body] = mm;
  const dbName = (body.match(/@@map\("([^"]+)"\)/) || [])[1] ?? null;
  const pgSchema = (body.match(/@@schema\("([^"]+)"\)/) || [])[1] ?? null;

  // primary key: @@id([...]) wins; else @@unique([...]) containing id; else single @id field.
  let pkFields = null;
  const atId = body.match(/@@id\(\[([^\]]+)\]\)/);
  if (atId) {
    pkFields = atId[1].split(",").map((s) => s.trim());
  } else {
    const uniques = [...body.matchAll(/@@unique\(\[([^\]]+)\]\)/g)].map((u) =>
      u[1].split(",").map((s) => s.trim())
    );
    const idUnique = uniques.find((arr) => arr.includes("id"));
    if (idUnique) {
      pkFields = idUnique;
    }
  }

  const fields = [];
  let hasDeletedAt = false;
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    // field syntax: <name> <Type>[ <[]> ][ <?> ] <attrs...>
    const fm = line.match(/^(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$/);
    if (!fm) {
      continue;
    }
    const [, fname, ftypeRaw, listMark, optMark, attrs] = fm;
    // skip relations (model-typed) and block-level lines that slipped through
    const isRelation = modelNames.has(ftypeRaw) || /@relation\b/.test(attrs);
    if (isRelation) {
      continue;
    }
    const isScalar = SCALARS.has(ftypeRaw) || enumNames.has(ftypeRaw);
    if (!isScalar) {
      continue;
    }
    if (fname === "deletedAt" || /@map\("deleted_at"\)/.test(attrs)) {
      hasDeletedAt = true;
    }
    fields.push({
      name: fname,
      irName: toIrName(fname),
      type: ftypeRaw,
      isEnum: enumNames.has(ftypeRaw),
      isList: Boolean(listMark),
      optional: Boolean(optMark),
      hasDefault: /@default/.test(attrs),
      isUpdatedAt: /@updatedAt/.test(attrs),
      isId: /@id\b/.test(attrs),
    });
  }

  // resolve pk: if no composite found, fall back to a single @id field, else ["id"].
  if (!pkFields) {
    const idField = fields.find((f) => f.isId);
    pkFields = [idField ? idField.name : "id"];
  }
  const whereAccessor = pkFields.length > 1 ? pkFields.join("_") : pkFields[0];
  // `tenant: { connect: { id } }` is required on create for models like PrepList
  // where scalar tenantId alone is rejected by Prisma when the Account relation
  // is required AND tenantId is used by NO other relation.
  //
  // BUT a relation-connect selects Prisma's CHECKED create input, which rejects
  // the scalar FK of EVERY relation on the model — not just composite FKs that
  // share tenantId. Two known breakages:
  //   - CommandBoardCard.board = @relation(fields: [tenantId, boardId]) →
  //     "Argument `board` is missing" (tenantId shared by a composite FK).
  //   - Event.client = @relation(fields: [clientId]) →
  //     "Unknown argument `clientId`. Did you mean `client`?" (any other
  //     single-column FK relation, since the store writes FK scalars verbatim).
  // So connect is safe ONLY when the tenant relation is the model's sole
  // FK-bearing relation (PrepList, Menu, CommandBoard). Every other model must
  // write FLAT scalar keys (the repo's flat-key convention) — unchecked input,
  // where scalar tenantId + scalar FKs satisfy every relation at once.
  const hasTenantRelation = /\btenant\s+Account\s+@relation\b/.test(body);
  const hasOtherFkRelation = [
    ...body.matchAll(/@relation\([^)]*fields:\s*\[([^\]]*)\]/g),
  ].some((m) => {
    const fkFields = m[1].split(",").map((s) => s.trim());
    // The tenant relation itself is exactly `fields: [tenantId]`. Anything
    // else (composite FK or another single-column FK) forces flat writes.
    return !(fkFields.length === 1 && fkFields[0] === "tenantId");
  });
  const requiresTenantConnect = hasTenantRelation && !hasOtherFkRelation;

  models[name] = {
    accessor: accessorOf(name),
    dbName,
    pgSchema,
    pkFields,
    whereAccessor,
    hasDeletedAt,
    ...(requiresTenantConnect ? { requiresTenantConnect: true } : {}),
    fields,
  };
}

// Merge versionProperty from compiled IR into model metadata.
//
// COMPOUND-KEY OCC IS BROKEN in @angriff36/manifest GenericPrismaStore.update:
// for a model whose pk is composite (e.g. @@id([tenantId, id])), it stuffs the
// version into the `tenantId_id` compound selector — Prisma rejects the unknown
// `version` argument, the store's `catch { return undefined }` swallows it, and
// the write is silently dropped while the runtime still emits the event + returns
// 200 (fake success, lost edit). So DO NOT emit versionProperty for compound-key
// models — omission routes their updates through the plain persisting write path.
// The version column stays in the schema and still increments (runtime supplies it
// in the update `data`); only the broken OCC where-clause is avoided. Single-key
// models keep versionProperty (their OCC where path is valid). Remove this guard
// once the package fixes compound-key OCC.
const versionMap = loadVersionProperties();
for (const [entityName, versionProp] of versionMap) {
  const meta = models[entityName];
  if (meta && meta.pkFields.length === 1) {
    meta.versionProperty = versionProp;
  }
}

// IR entity name aliases: when Manifest IR name differs from the Prisma model
// key (see ENTITY_TO_PRISMA_MODEL in entity-domain-map.mjs), duplicate metadata
// under the IR name so runtime store selection and GenericPrismaStore lookup
// work without a separate name-resolution hop.
for (const [irName, modelName] of Object.entries(ENTITY_TO_PRISMA_MODEL)) {
  if (models[modelName] && !models[irName]) {
    models[irName] = models[modelName];
  }
}

const header = `// Generated from packages/database/prisma/schema.prisma - DO NOT EDIT
// Produced by manifest/scripts/generate-prisma-model-metadata.mjs
// Re-run after any schema change. Consumed by GenericPrismaStore.
/* eslint-disable */
`;

const body = `export interface PrismaFieldMeta {
  name: string;
  irName: string;
  type: string;
  isEnum: boolean;
  isList: boolean;
  optional: boolean;
  hasDefault: boolean;
  isUpdatedAt: boolean;
  isId: boolean;
}

export interface PrismaModelMeta {
  accessor: string;
  dbName: string | null;
  pgSchema: string | null;
  pkFields: string[];
  whereAccessor: string;
  hasDeletedAt: boolean;
  /** When true, create() must use tenant: { connect: { id } } not scalar tenantId alone. */
  requiresTenantConnect?: boolean;
  versionProperty?: string;
  fields: PrismaFieldMeta[];
}

export const PRISMA_MODEL_METADATA: Record<string, PrismaModelMeta> = ${JSON.stringify(
  models,
  null,
  2
)};
`;

// Dual-write: manifest/generated/runtime is the canonical output; the runtime
// package imports its own copy under manifest/runtime/src/generated (same
// pattern as generate-entity-accessor.mjs). A single-path write left the
// runtime copy stale after the model-rename wave — every governed command
// failed with `Prisma client has no delegate "bulk_combine_rules"`.
const runtimeSrcGenerated = resolve(root, "manifest/runtime/src/generated");
const writeBoth = (canonicalPath, contents) => {
  for (const p of [
    canonicalPath,
    join(runtimeSrcGenerated, basename(canonicalPath)),
  ]) {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, contents);
  }
};

writeBoth(outPath, `${header}\n${body}`);

// Also emit a lightweight JSON file for consumption by .mjs scripts
// (generate.mjs, entity-domain-map.mjs) that cannot import .ts directly.
// Contains only the accessor + field-name metadata needed for route generation.
const jsonOutPath = resolve(
  root,
  "manifest/generated/runtime/prisma-model-metadata.generated.json"
);
const lightweight = {};
for (const [entityName, meta] of Object.entries(models)) {
  lightweight[entityName] = {
    accessor: meta.accessor,
    hasDeletedAt: meta.hasDeletedAt,
    pkFields: meta.pkFields,
    ...(meta.requiresTenantConnect ? { requiresTenantConnect: true } : {}),
    fields: meta.fields.map((f) => ({ name: f.name, irName: f.irName })),
  };
}
writeBoth(jsonOutPath, `${JSON.stringify(lightweight, null, 2)}\n`);

// Runtime bridge map: IR entity name → Prisma model metadata key.
// Consumed by manifest-runtime-factory (hasTypedStore) and GenericPrismaStore.
const bridgeOutPath = resolve(
  root,
  "manifest/generated/runtime/entity-to-prisma-model.generated.ts"
);
const bridgeHeader = `// Generated from manifest.config.yaml — DO NOT EDIT
// Produced by manifest/scripts/generate-prisma-model-metadata.mjs
// Re-run via \`pnpm manifest:generate-metadata\` after bridge map changes.
/* eslint-disable */
`;
const bridgeBody = `export const ENTITY_TO_PRISMA_MODEL: Readonly<Record<string, string>> = ${JSON.stringify(
  ENTITY_TO_PRISMA_MODEL,
  null,
  2
)};

/** Resolve Manifest IR entity name to Prisma model metadata key. */
export function resolvePrismaModelKey(entityName: string): string {
  return ENTITY_TO_PRISMA_MODEL[entityName] ?? entityName;
}
`;
writeBoth(bridgeOutPath, `${bridgeHeader}\n${bridgeBody}`);

process.stdout.write(
  `wrote ${outPath}\nmodels: ${Object.keys(models).length}\njson: ${jsonOutPath}\nbridge: ${bridgeOutPath}\n`
);
