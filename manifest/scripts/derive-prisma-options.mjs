#!/usr/bin/env node
// derive-prisma-options.mjs - Phase 1 of Task 2.5 (Wire PrismaProjection)
// Parses schema.prisma + IR to produce PrismaProjectionOptions JSON.
// Run: node manifest/scripts/derive-prisma-options.mjs

import { readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { ENTITY_ACCESSOR_OVERRIDES } from "./entity-domain-map.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");
const SCHEMA_PATH = resolve(
  PROJECT_ROOT,
  "packages/database/prisma/schema.prisma"
);
const IR_PATH = resolve(PROJECT_ROOT, "manifest/ir/kitchen.ir.json");
const OUTPUT_PATH = resolve(__dirname, "prisma-options.generated.json");

// Regex patterns (defined once to avoid repetition)
const RE_MODEL_START = /^model\s+(\w+)\s*\{/m;
const RE_FIELD = /^\s*(\w+)\s+(\w+\??(?:\[\])?)/;
const RE_MAP = /@map\("([^"]+)"\)/;
const RE_DB = /@db\.(\w+(?:\([^)]*\))?)/;
const RE_ATID = /@id\b/;
const RE_ATUNIQUE = /@unique\b/;
const RE_BLOCK_MAP = /@@map\("([^"]+)"\)/;
const RE_BLOCK_SCHEMA = /@@schema\("([^"]+)"\)/;
const RE_BLOCK_ID = /@@id\(\[([^\]]+)\]\)/;
const RE_BLOCK_INDEX = /@@index\(\[([^\]]+)\]\)/;
const RE_BLOCK_UNIQUE = /@@unique\(\[([^\]]+)\]/;
const RE_RELATION =
  /@relation\((?:[^)]*?\s+)?fields:\s*\[([^\]]+)\]\s*,\s*references:\s*\[([^\]]+)\]/;
const RE_BACK_RELATION = /^\w+\s+\w+(\[\])?\s+@relation\(/;
const RE_DECIMAL = /Decimal\((\d+),\s*(\d+)\)/;
const RE_WORD_START = /^(\w+)/;

function parseSchema(text) {
  const models = new Map();
  let pos = 0;
  const len = text.length;
  while (pos < len) {
    const m = text.substring(pos).match(RE_MODEL_START);
    if (!m) {
      break;
    }
    const name = m[1];
    const start = pos + m.index + m[0].length;
    let depth = 1;
    let i = start;
    while (i < len && depth > 0) {
      if (text[i] === "{") {
        depth++;
      }
      if (text[i] === "}") {
        depth--;
      }
      i++;
    }
    models.set(name, text.substring(start, i - 1));
    pos = i;
  }
  return models;
}

function extractDefaults(line) {
  const results = [];
  let searchFrom = 0;
  while (true) {
    const idx = line.indexOf("@default(", searchFrom);
    if (idx === -1) {
      break;
    }
    let depth = 1;
    let j = idx + 9;
    while (j < line.length && depth > 0) {
      if (line[j] === "(") {
        depth++;
      }
      if (line[j] === ")") {
        depth--;
      }
      j++;
    }
    results.push(line.substring(idx, j));
    searchFrom = j;
  }
  return results;
}

function parseFieldLine(line) {
  const field = {};
  const fm = line.match(RE_FIELD);
  if (!fm) {
    return null;
  }
  field.name = fm[1];
  field.type = fm[2];

  const mm = line.match(RE_MAP);
  if (mm) {
    field.map = mm[1];
  }

  const dm = line.match(RE_DB);
  if (dm) {
    field.db = dm[1];
  }

  const defaults = extractDefaults(line);
  if (defaults.length > 0) {
    field.defaults = defaults;
  }

  if (line.includes("@updatedAt")) {
    field.updatedAt = true;
  }
  if (RE_ATID.test(line)) {
    field.isId = true;
  }
  if (RE_ATUNIQUE.test(line) && !line.includes("@@unique")) {
    field.isUnique = true;
  }

  const rm = line.match(RE_RELATION);
  if (rm) {
    field.relation = {
      fields: rm[1].split(",").map((s) => s.trim()),
      references: rm[2].split(",").map((s) => s.trim()),
    };
  }

  return field;
}

function parseModelBlock(body) {
  const result = {
    tableMapping: null,
    schema: null,
    columnMappings: {},
    dbAttributes: {},
    fieldAttributes: {},
    precision: {},
    indexes: [],
    uniqueIndexes: [],
    compositeId: null,
    foreignKeys: {},
    fields: [],
  };

  const lines = body.split("\n");

  for (const line of lines) {
    // Block-level attributes
    const mm = line.match(RE_BLOCK_MAP);
    if (mm) {
      result.tableMapping = mm[1];
    }

    const sm = line.match(RE_BLOCK_SCHEMA);
    if (sm) {
      result.schema = sm[1];
    }

    const im = line.match(RE_BLOCK_ID);
    if (im) {
      result.compositeId = im[1].split(",").map((s) => s.trim());
    }

    const xm = line.match(RE_BLOCK_INDEX);
    if (xm) {
      result.indexes.push(
        xm[1].split(",").map((f) => {
          const n = f.trim().match(RE_WORD_START);
          return n ? n[1] : f.trim();
        })
      );
    }

    const um = line.match(RE_BLOCK_UNIQUE);
    if (um) {
      result.uniqueIndexes.push(
        um[1].split(",").map((f) => {
          const n = f.trim().match(RE_WORD_START);
          return n ? n[1] : f.trim();
        })
      );
    }

    // Skip non-field lines
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("@@")) {
      continue;
    }

    // Skip back-relation lines
    if (RE_BACK_RELATION.test(trimmed) && !trimmed.includes("fields:")) {
      continue;
    }

    const field = parseFieldLine(trimmed);
    if (field) {
      result.fields.push(field);
    }
  }

  // Build structured mappings
  for (const field of result.fields) {
    if (field.map) {
      result.columnMappings[field.name] = field.map;
    }
    if (field.db) {
      result.dbAttributes[field.name] = field.db;
    }

    // Fix 2 & 4: Filter and fix field default attributes
    const isStringField = /^String(\??|\[\])?$/.test(field.type);
    const isDateTimeField = /^DateTime(\??)$/.test(field.type);
    const isListField = /\[\]$/.test(field.type);

    if (field.defaults) {
      const fixedDefaults = [];
      for (const d of field.defaults) {
        const m = d.match(/^@default\((.+)\)$/s);
        if (!m) {
          fixedDefaults.push(d);
          continue;
        }
        const inner = m[1];

        // Fix 4: Skip @default(now()) on DateTime fields.
        // PrismaProjection generates DateTime fields as String from IR,
        // so now() becomes invalid in the generated schema.
        if (inner === "now()" && isDateTimeField) {
          continue;
        }

        // Fix 4: Skip @default([...]) -- PrismaProjection flattens list types to
        // scalar, so list defaults become invalid in the generated schema.
        if (inner.startsWith("[")) {
          continue;
        }

        // Fix 2: Wrap bare identifiers in quotes.
        // PrismaProjection generates ALL fields as String from IR, so enum defaults
        // like @default(ACTIVE) must become @default("ACTIVE") for the generated schema.
        // A bare identifier: not already quoted, not a function call (dbgenerated, now, etc),
        // not bool, not number, not a list.
        const isQuoted = /^"/.test(inner);
        const isFuncCall = /\(.*\)$/.test(inner);
        const isBool = inner === "true" || inner === "false";
        const isNumber = /^-?\d+(\.\d+)?$/.test(inner);
        const isList = /^\[/.test(inner);

        if (isQuoted || isFuncCall || isBool || isNumber || isList) {
          fixedDefaults.push(d);
        } else {
          fixedDefaults.push('@default("' + inner + '")');
        }
      }
      field.defaults = fixedDefaults;
    }

    const attrs = [];
    if (field.defaults && field.defaults.length > 0) {
      attrs.push(...field.defaults);
    }
    if (field.updatedAt) {
      attrs.push("@updatedAt");
    }
    if (attrs.length > 0) {
      result.fieldAttributes[field.name] = attrs;
    }

    if (field.db && field.db.startsWith("Decimal(")) {
      const pm = field.db.match(RE_DECIMAL);
      if (pm) {
        result.precision[field.name] = {
          precision: Number.parseInt(pm[1]),
          scale: Number.parseInt(pm[2]),
        };
      }
    }

    if (field.relation) {
      for (let i = 0; i < field.relation.fields.length; i++) {
        result.foreignKeys[field.relation.fields[i]] =
          field.relation.references[i];
      }
    }
  }

  // Fix 1: Remap index field names from snake_case column names to camelCase field names
  // Build reverse mapping: column name -> field name
  // Only include entries where the field name is actually different (non-identity)
  const reverseColMap = {};
  for (const [fieldName, colName] of Object.entries(result.columnMappings)) {
    if (fieldName !== colName) {
      reverseColMap[colName] = fieldName;
    }
  }
  // Also build a set of all field names that are already camelCase (no underscores)
  const camelFieldNames = new Set(
    result.fields.map((f) => f.name).filter((n) => !n.includes("_"))
  );

  // Convert snake_case to camelCase
  const snakeToCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

  const remapIndexFields = (fields) =>
    fields.map((f) => {
      // 1. Exact match in reverse column mapping (mapped fields with different names)
      if (reverseColMap[f]) {
        return reverseColMap[f];
      }
      // 2. Already camelCase and a known field name (no conversion needed)
      if (camelFieldNames.has(f)) {
        return f;
      }
      // 3. Snake_case -> convert to camelCase (IR/PrismaProjection convention)
      if (f.includes("_")) {
        return snakeToCamel(f);
      }
      return f;
    });

  result.indexes = result.indexes.map(remapIndexFields);
  result.uniqueIndexes = result.uniqueIndexes.map(remapIndexFields);
  if (result.compositeId) {
    result.compositeId = remapIndexFields(result.compositeId);
  }

  return result;
}

function buildOptions(irEntities, prismaModels) {
  const options = {
    tableMappings: {},
    columnMappings: {},
    dbAttributes: {},
    fieldAttributes: {},
    precision: {},
    indexes: {},
    foreignKeys: {},
    multiSchema: { entitySchema: {} },
    _compositeIds: {},
    _uniqueIndexes: {},
  };

  const report = { matched: [], noPrismaModel: [], errors: [] };

  for (const entity of irEntities) {
    const entityName = entity.name;
    // Try direct lookup first, then fall back to accessor override name.
    // ENTITY_ACCESSOR_OVERRIDES maps IR entity names to their actual Prisma client
    // accessor names (e.g., BankAccount → employeeBankAccount, Document → documents).
    // Null values mean the entity genuinely has no matching Prisma model.
    // Two accessor→model patterns exist in schema.prisma:
    //   camelCase accessor → PascalCase model (e.g., employeeBankAccount → EmployeeBankAccount)
    //   snake_case accessor → snake_case model (e.g., documents → documents)
    const accessorOverride = ENTITY_ACCESSOR_OVERRIDES[entityName];
    let model = prismaModels.get(entityName);
    let modelName = entityName;

    if (!model && accessorOverride !== undefined && accessorOverride !== null) {
      // Try accessor name directly (handles snake_case legacy models)
      model = prismaModels.get(accessorOverride);
      modelName = accessorOverride;

      // Try PascalCase version (handles camelCase accessors from PascalCase models)
      if (!model) {
        const pascalCase =
          accessorOverride[0].toUpperCase() + accessorOverride.slice(1);
        model = prismaModels.get(pascalCase);
        modelName = pascalCase;
      }
    }

    if (!model) {
      report.noPrismaModel.push(
        entityName + (modelName === entityName ? "" : ` (tried ${modelName})`)
      );
      continue;
    }

    try {
      const parsed = parseModelBlock(model);

      if (parsed.tableMapping) {
        options.tableMappings[entityName] = parsed.tableMapping;
      }
      if (Object.keys(parsed.columnMappings).length > 0) {
        options.columnMappings[entityName] = parsed.columnMappings;
      }
      if (Object.keys(parsed.dbAttributes).length > 0) {
        options.dbAttributes[entityName] = parsed.dbAttributes;
      }
      if (Object.keys(parsed.fieldAttributes).length > 0) {
        options.fieldAttributes[entityName] = parsed.fieldAttributes;
      }
      if (Object.keys(parsed.precision).length > 0) {
        options.precision[entityName] = parsed.precision;
      }

      const allIndexes = [...parsed.indexes, ...parsed.uniqueIndexes];
      if (allIndexes.length > 0) {
        options.indexes[entityName] = allIndexes;
      }

      if (Object.keys(parsed.foreignKeys).length > 0) {
        options.foreignKeys[entityName] = parsed.foreignKeys;
      }
      if (parsed.schema) {
        options.multiSchema.entitySchema[entityName] = parsed.schema;
      }
      if (parsed.compositeId) {
        options._compositeIds[entityName] = parsed.compositeId;
      }
      if (parsed.uniqueIndexes.length > 0) {
        options._uniqueIndexes[entityName] = parsed.uniqueIndexes;
      }

      report.matched.push({
        entity: entityName,
        resolvedModel: modelName === entityName ? undefined : modelName,
        tableMapping: !!parsed.tableMapping,
        columnMappings: Object.keys(parsed.columnMappings).length,
        dbAttributes: Object.keys(parsed.dbAttributes).length,
        fieldAttributes: Object.keys(parsed.fieldAttributes).length,
        schema: parsed.schema,
        indexes: parsed.indexes.length,
        uniqueIndexes: parsed.uniqueIndexes.length,
        foreignKeys: Object.keys(parsed.foreignKeys).length,
        precision: Object.keys(parsed.precision).length,
        totalFields: parsed.fields.length,
      });
    } catch (err) {
      report.errors.push({ entity: entityName, error: err.message });
    }
  }

  return { options, report };
}

function main() {
  console.log("Loading schema.prisma...");
  const schemaText = readFileSync(SCHEMA_PATH, "utf8");

  console.log("Loading kitchen.ir.json...");
  const ir = JSON.parse(readFileSync(IR_PATH, "utf8"));

  console.log("Parsing Prisma schema...");
  const prismaModels = parseSchema(schemaText);
  console.log("  Found", prismaModels.size, "models");

  console.log("Cross-referencing with IR...");
  const irEntities = ir.entities;
  console.log("  IR has", irEntities.length, "entities");

  const { options, report } = buildOptions(irEntities, prismaModels);

  writeFileSync(OUTPUT_PATH, JSON.stringify(options, null, 2));
  console.log("\nOutput written to:", OUTPUT_PATH);

  // Summary
  console.log("\n======== SUMMARY ========");
  const n = report.matched.length;
  console.log("Matched:", n, "/", irEntities.length, "IR entities");
  console.log("No Prisma model:", report.noPrismaModel.length);
  console.log("Parse errors:", report.errors.length);

  console.log("\nOption coverage (of", n, "matched):");
  console.log(
    "  tableMappings:   ",
    report.matched.filter((m) => m.tableMapping).length
  );
  console.log(
    "  columnMappings:  ",
    report.matched.filter((m) => m.columnMappings > 0).length
  );
  console.log(
    "  dbAttributes:    ",
    report.matched.filter((m) => m.dbAttributes > 0).length
  );
  console.log(
    "  fieldAttributes: ",
    report.matched.filter((m) => m.fieldAttributes > 0).length
  );
  console.log(
    "  schema:          ",
    report.matched.filter((m) => m.schema).length
  );
  console.log(
    "  indexes:         ",
    report.matched.filter((m) => m.indexes > 0 || m.uniqueIndexes > 0).length
  );
  console.log(
    "  foreignKeys:     ",
    report.matched.filter((m) => m.foreignKeys > 0).length
  );
  console.log(
    "  precision:       ",
    report.matched.filter((m) => m.precision > 0).length
  );

  const full = report.matched.filter(
    (m) =>
      m.tableMapping && m.schema && m.dbAttributes > 0 && m.columnMappings > 0
  ).length;
  console.log("\nFull coverage (table+schema+db+cols):", full);
  console.log("Partial coverage:", n - full);

  if (report.noPrismaModel.length > 0) {
    console.log(
      "\nEntities without Prisma model (" + report.noPrismaModel.length + "):"
    );
    console.log("  " + report.noPrismaModel.join(", "));
  }

  if (report.errors.length > 0) {
    console.log("\nParse errors:");
    report.errors.forEach((e) => console.log("  " + e.entity + ":", e.error));
  }

  // Sample entries
  console.log("\n======== SAMPLE ENTRIES ========");
  const samples = ["CateringOrder", "KitchenTask", "VendorContract", "Event"];
  for (const name of samples) {
    const entry = report.matched.find((m) => m.entity === name);
    if (entry) {
      console.log("\n  " + name + ":");
      console.log("    tableMapping:", entry.tableMapping);
      console.log("    columnMappings:", entry.columnMappings);
      console.log("    dbAttributes:", entry.dbAttributes);
      console.log("    fieldAttributes:", entry.fieldAttributes);
      console.log("    schema:", entry.schema);
      console.log(
        "    indexes:",
        entry.indexes,
        ", unique:",
        entry.uniqueIndexes
      );
      console.log("    foreignKeys:", entry.foreignKeys);
      console.log("    precision:", entry.precision);
    }
  }
}

main();
