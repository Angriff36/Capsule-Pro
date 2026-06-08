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
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";

const root = resolve(process.cwd());
const schemaPath = resolve(root, "packages/database/prisma/schema.prisma");
const outPath = resolve(
  root,
  "manifest/runtime/src/generated/prisma-model-metadata.generated.ts",
);

/**
 * Load versionProperty from IR JSON files.
 * Returns a Map<entityName, versionPropertyName> for entities that declare one.
 */
function loadVersionProperties() {
  const irDir = resolve(root, "manifest/ir");
  const versionMap = new Map();
  if (!existsSync(irDir)) return versionMap;

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
for (const m of schema.matchAll(/^enum\s+(\w+)\s*\{/gm)) enumNames.add(m[1]);
const modelNames = new Set();
for (const m of schema.matchAll(/^model\s+(\w+)\s*\{/gm)) modelNames.add(m[1]);

/** Prisma client accessor: model name with first char lowercased (e.g. Container -> container). */
const accessorOf = (name) => name[0].toLowerCase() + name.slice(1);
/** snake_case (or already-camel) Prisma field name -> camelCase Manifest property name. */
const toIrName = (field) => {
  const camel = field.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
  return camel[0].toLowerCase() + camel.slice(1);
};

const models = {};
const modelRe = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
let mm;
while ((mm = modelRe.exec(schema)) !== null) {
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
      u[1].split(",").map((s) => s.trim()),
    );
    const idUnique = uniques.find((arr) => arr.includes("id"));
    if (idUnique) pkFields = idUnique;
  }

  const fields = [];
  let hasDeletedAt = false;
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    // field syntax: <name> <Type>[ <[]> ][ <?> ] <attrs...>
    const fm = line.match(/^(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$/);
    if (!fm) continue;
    const [, fname, ftypeRaw, listMark, optMark, attrs] = fm;
    // skip relations (model-typed) and block-level lines that slipped through
    const isRelation =
      modelNames.has(ftypeRaw) || /@relation\b/.test(attrs);
    if (isRelation) continue;
    const isScalar = SCALARS.has(ftypeRaw) || enumNames.has(ftypeRaw);
    if (!isScalar) continue;
    if (fname === "deletedAt" || /@map\("deleted_at"\)/.test(attrs))
      hasDeletedAt = true;
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

  models[name] = {
    accessor: accessorOf(name),
    dbName,
    pgSchema,
    pkFields,
    whereAccessor,
    hasDeletedAt,
    fields,
  };
}

// Merge versionProperty from compiled IR into model metadata
const versionMap = loadVersionProperties();
for (const [entityName, versionProp] of versionMap) {
  if (models[entityName]) {
    models[entityName].versionProperty = versionProp;
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
  versionProperty?: string;
  fields: PrismaFieldMeta[];
}

export const PRISMA_MODEL_METADATA: Record<string, PrismaModelMeta> = ${JSON.stringify(
  models,
  null,
  2,
)};
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, header + "\n" + body);
process.stdout.write(
  `wrote ${outPath}\nmodels: ${Object.keys(models).length}\n`,
);
