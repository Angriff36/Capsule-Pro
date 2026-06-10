#!/usr/bin/env node
/**
 * generate-full-schema.mjs -- Phase 2 of Task 2.5
 *
 * Generates a FULL Prisma schema from the Manifest IR using PrismaProjection
 * with the complete auto-derived options from prisma-options.generated.json.
 *
 * Strategy (ADDITIVE, per notes S14):
 *   - Generated models (189 from IR) go into a SEPARATE validation file
 *   - The committed live schema is NOT replaced (cross-relations would break)
 *   - Output: manifest/ir/generated-schema.prisma (for validation only)
 *
 * Post-processing:
 *   1. @@unique injection from _uniqueIndexes (projection only emits @@index)
 *   2. No RLS stripping needed (projection does not emit RLS comments)
 *   3. No composite @@id injection needed (projection handles this natively)
 *
 * Usage: node manifest/scripts/generate-full-schema.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ENTITY_ACCESSOR_OVERRIDES } from "./entity-domain-map.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");

// Paths
const IR_PATH = resolve(PROJECT_ROOT, "manifest/ir/kitchen.ir.json");
const OPTIONS_PATH = resolve(__dirname, "prisma-options.generated.json");
const COMMITTED_SCHEMA = resolve(PROJECT_ROOT, "packages/database/prisma/schema.prisma");
const OUTPUT_PATH = resolve(PROJECT_ROOT, "manifest/ir/generated-schema.prisma");
const PROJ_PATH = resolve(
  PROJECT_ROOT,
  "manifest/runtime/node_modules/@angriff36/manifest/dist/manifest/projections/prisma/generator.js"
);

// ---------------------------------------------------------------------------
// 1. Load inputs
// ---------------------------------------------------------------------------
console.log("Loading IR from:", IR_PATH);
const ir = JSON.parse(readFileSync(IR_PATH, "utf8"));
console.log("  IR entities:", ir.entities.length);
const irEntityNames = new Set(ir.entities.map((e) => e.name));

console.log("Loading options from:", OPTIONS_PATH);
const rawOpts = JSON.parse(readFileSync(OPTIONS_PATH, "utf8"));
console.log("  tableMappings:", Object.keys(rawOpts.tableMappings).length);
console.log("  _compositeIds:", Object.keys(rawOpts._compositeIds).length);
console.log("  _uniqueIndexes:", Object.keys(rawOpts._uniqueIndexes).length);

console.log("Loading committed schema from:", COMMITTED_SCHEMA);
const committedSchema = readFileSync(COMMITTED_SCHEMA, "utf8");

// ---------------------------------------------------------------------------
// 2. Build projection options
// ---------------------------------------------------------------------------
const projectionOptions = {
  tableMappings: rawOpts.tableMappings,
  columnMappings: rawOpts.columnMappings,
  dbAttributes: rawOpts.dbAttributes,
  fieldAttributes: rawOpts.fieldAttributes,
  precision: rawOpts.precision,
  indexes: rawOpts.indexes,
  foreignKeys: rawOpts.foreignKeys,
  multiSchema: {
    enabled: true,
    entitySchema: rawOpts.multiSchema.entitySchema,
    defaultSchema: "public",
  },
};

// ---------------------------------------------------------------------------
// 3. Run PrismaProjection
// ---------------------------------------------------------------------------
console.log("\nRunning PrismaProjection...");
const projMod = await import(pathToFileURL(PROJ_PATH).href);
const PrismaProjection = projMod.PrismaProjection || projMod.default;

const result = new PrismaProjection().generate(ir, {
  surface: "prisma.schema",
  options: projectionOptions,
});

const artifacts = result.artifacts || [];
const diagnostics = result.diagnostics || [];

const schemaArtifact =
  artifacts.find((a) => a.id === "prisma.schema" || (a.pathHint || "").endsWith(".prisma")) ||
  artifacts[0];

if (!schemaArtifact) {
  console.error("ERROR: No schema artifact returned from PrismaProjection");
  process.exit(1);
}

let generatedCode = schemaArtifact.code || schemaArtifact.content || "";
const generatedModelCount = (generatedCode.match(/^model /gm) || []).length;

// Diagnostics summary
const diagByCode = {};
for (const d of diagnostics) {
  diagByCode[d.code] = (diagByCode[d.code] || 0) + 1;
}

console.log("  " + generatedModelCount + " models generated, " + diagnostics.length + " diagnostics");
for (const [code, count] of Object.entries(diagByCode)) {
  console.log("    " + code + ": " + count);
}

// ---------------------------------------------------------------------------
// 4. Post-processing: inject @@unique from _uniqueIndexes
// ---------------------------------------------------------------------------
// Strategy: collect all insertion positions FIRST on the original string,
// then apply them in reverse order (highest index first) so earlier
// positions remain valid.
console.log("\nPost-processing...");
const insertions = []; // { pos, text }

for (const [entityName, uniqueGroups] of Object.entries(rawOpts._uniqueIndexes)) {
  for (const uniqueFields of uniqueGroups) {
    const fields = Array.isArray(uniqueFields) ? uniqueFields : uniqueFields.fields;
    const uniqueAttr = "@@unique([" + fields.join(", ") + "])";

    // Find the model block start (after the opening {)
    const modelStart = generatedCode.indexOf("model " + entityName + " {");
    if (modelStart === -1) continue;

    const openBrace = modelStart + ("model " + entityName + " {").length - 1;
    // Find the matching closing brace using depth-aware matching
    let depth = 1; // we start after the opening {
    let i = openBrace + 1;
    while (i < generatedCode.length) {
      if (generatedCode[i] === "{") depth++;
      if (generatedCode[i] === "}") depth--;
      if (depth === 0) break;
      i++;
    }
    const modelEnd = i; // position of the closing }
    const modelBlock = generatedCode.substring(modelStart, modelEnd + 1);

    // Check if this exact @@unique already exists in the block
    if (!modelBlock.includes(uniqueAttr)) {
      insertions.push({ pos: modelEnd, text: "\n  " + uniqueAttr + "\n" });
    }
  }
}

// Apply insertions in reverse order (highest position first)
insertions.sort((a, b) => b.pos - a.pos);
for (const { pos, text } of insertions) {
  generatedCode =
    generatedCode.substring(0, pos) +
    text +
    generatedCode.substring(pos);
}
console.log("  @@unique injected: " + insertions.length);

// ---------------------------------------------------------------------------
// 5. Strip any RLS comment lines (defensive)
// ---------------------------------------------------------------------------
const beforeStrip = generatedCode.split("\n").length;
generatedCode = generatedCode
  .split("\n")
  .filter((line) => !/^\s*\/\/\s*RLS\s+policy\s+comment/i.test(line))
  .join("\n");
const rlsStripped = beforeStrip - generatedCode.split("\n").length;
console.log("  RLS comment lines stripped: " + rlsStripped);

// ---------------------------------------------------------------------------
// 5b. Fix DUPLICATE_FIELD: rename scalar fields that clash with relation arrays
// ---------------------------------------------------------------------------
// When a model has both a scalar field (e.g., "items String?") and a relation
// array field (e.g., "items InventoryTransferItem[]"), rename the scalar to
// append "Data" (e.g., "itemsData").
let dupFieldFixes = 0;
const dupFieldRegex = /^model\s+(\w+)\s*\{/gm;
let dupMatch;
while ((dupMatch = dupFieldRegex.exec(generatedCode)) !== null) {
  const modelStartIdx = dupMatch.index;
  const openBrace = modelStartIdx + dupMatch[0].length - 1;
  let depth = 1;
  let i = openBrace + 1;
  while (i < generatedCode.length) {
    if (generatedCode[i] === "{") depth++;
    if (generatedCode[i] === "}") depth--;
    if (depth === 0) break;
    i++;
  }
  const modelBlock = generatedCode.substring(openBrace + 1, i);
  const modelLines = modelBlock.split("\n");

  // Collect scalar and relation-array fields
  const scalarFields = new Map(); // name -> line index (within modelBlock lines)
  const relationArrayFields = new Set(); // field names that are relation arrays
  for (let li = 0; li < modelLines.length; li++) {
    const trimmedLine = modelLines[li].trim();
    if (!trimmedLine || trimmedLine.startsWith("//") || trimmedLine.startsWith("@@")) continue;
    // Match relation array: fieldName SomeType[] (with or without @relation)
    const relArrMatch = trimmedLine.match(/^(\w+)\s+\w+\[\]/);
    if (relArrMatch) {
      relationArrayFields.add(relArrMatch[1]);
      continue;
    }
    // Match scalar: fieldName String? or fieldName String
    const scalarMatch = trimmedLine.match(/^(\w+)\s+String(\??)/);
    if (scalarMatch) {
      scalarFields.set(scalarMatch[1], li);
    }
  }

  // Rename clashing scalars
  for (const [fieldName, lineIdx] of scalarFields) {
    if (relationArrayFields.has(fieldName)) {
      const oldLine = modelLines[lineIdx];
      // Replace the field name (first word on the line, after optional whitespace)
      const newLine = oldLine.replace(new RegExp("^(\\s+)" + fieldName + "\\b"), "$1" + fieldName + "Data");
      modelLines[lineIdx] = newLine;
      dupFieldFixes++;
    }
  }

  // Replace the model block in generatedCode
  generatedCode =
    generatedCode.substring(0, openBrace + 1) +
    modelLines.join("\n") +
    generatedCode.substring(i);
}
console.log("  Duplicate field renames: " + dupFieldFixes);

// ---------------------------------------------------------------------------
// 5c. Strip invalid @@index and @@unique that reference non-existent fields
// ---------------------------------------------------------------------------
// The committed schema may have indexes on fields that the IR doesn't generate.
// PrismaProjection faithfully reproduces the index but the field may be absent.
let strippedIndexes = 0;
const stripRegex = /^model\s+(\w+)\s*\{/gm;
let stripMatch;
while ((stripMatch = stripRegex.exec(generatedCode)) !== null) {
  const modelStartIdx = stripMatch.index;
  const openBrace = modelStartIdx + stripMatch[0].length - 1;
  let depth = 1;
  let i = openBrace + 1;
  while (i < generatedCode.length) {
    if (generatedCode[i] === "{") depth++;
    if (generatedCode[i] === "}") depth--;
    if (depth === 0) break;
    i++;
  }
  const modelBlock = generatedCode.substring(openBrace + 1, i);
  const modelLines = modelBlock.split("\n");

  // Collect actual field names from the model
  const actualFields = new Set();
  for (const line of modelLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("@@")) continue;
    const fm = trimmed.match(/^(\w+)\s+\S/);
    if (fm) actualFields.add(fm[1]);
  }

  // Check each @@index and @@unique line and mark invalid ones for removal
  const newLines = [];
  for (const line of modelLines) {
    const trimmed = line.trim();
    // Match @@index([...]) or @@unique([...])
    const idxMatch = trimmed.match(/^@@(?:index|unique)\(\[([^\]]+)\]\)/);
    if (idxMatch) {
      const fields = idxMatch[1].split(",").map((f) => f.trim().split(/\s/)[0]);
      const allExist = fields.every((f) => actualFields.has(f));
      if (allExist) {
        newLines.push(line);
      } else {
        strippedIndexes++;
        // Skip this line
      }
    } else {
      newLines.push(line);
    }
  }

  // Replace the model block if any lines were stripped
  if (newLines.length !== modelLines.length) {
    generatedCode =
      generatedCode.substring(0, openBrace + 1) +
      newLines.join("\n") +
      generatedCode.substring(i);
  }
}
console.log("  Invalid indexes stripped: " + strippedIndexes);

// ---------------------------------------------------------------------------
// 5d. Fix type mismatches: @db.* must match the Prisma scalar type
// ---------------------------------------------------------------------------
// The projection generates field types from IR (String for string, etc.)
// but dbAttributes from committed schema may not match the generated type.
// E.g., @db.Decimal(10,2) on a String field → change String to Decimal.
let typeFixCount = 0;
const DB_TYPE_MAP = {
  Decimal: "Decimal",
  Numeric: "Decimal",
  Date: "DateTime",
  Timestamptz: "DateTime",
  Timestamp: "DateTime",
  Time: "String",   // Prisma has no Time type; keep String but strip @db.Time
  SmallInt: "Int",
  Integer: "Int",
  BigInt: "BigInt",
  JsonB: "Json",
  Json: "Json",
  Uuid: "String",
  Text: "String",
  Char: "String",
  Varchar: "String",
  Boolean: "Boolean",
  DoublePrecision: "Float",
  Real: "Float",
};
const DB_TYPES_REQUIRING_STRIP = new Set(["Time"]); // @db.Time has no Prisma equivalent

const modelRegex5d = /^model\s+(\w+)\s*\{/gm;
let match5d;
while ((match5d = modelRegex5d.exec(generatedCode)) !== null) {
  const modelStartIdx = match5d.index;
  const openBrace = modelStartIdx + match5d[0].length - 1;
  let depth = 1;
  let idx = openBrace + 1;
  while (idx < generatedCode.length) {
    if (generatedCode[idx] === "{") depth++;
    if (generatedCode[idx] === "}") depth--;
    if (depth === 0) break;
    idx++;
  }
  const modelBlock = generatedCode.substring(openBrace + 1, idx);
  const modelLines = modelBlock.split("\n");
  let changed = false;

  for (let li = 0; li < modelLines.length; li++) {
    const line = modelLines[li];
    // Match field lines with @db.Type annotations
    const dbMatch = line.match(/^(\s+)(\w+)\s+(String|Int|Float|Boolean|DateTime|Decimal|Json|BigInt)(\??)\s+.*@db\.(\w+(?:\([^)]*\))?)/);
    if (!dbMatch) continue;
    const [, , fieldName, currentType, , dbTypeRaw] = dbMatch;
    const dbTypeBase = dbTypeRaw.replace(/\(.*\)$/, "");
    const expectedType = DB_TYPE_MAP[dbTypeBase];

    if (expectedType && expectedType !== currentType) {
      // Replace the type
      let newLine = modelLines[li].replace(
        new RegExp(`(\\s+${fieldName}\\s+)${currentType}(\\??)`),
        `$1${expectedType}$2`
      );
      // Strip @db.Time since Prisma has no equivalent
      if (DB_TYPES_REQUIRING_STRIP.has(dbTypeBase)) {
        newLine = newLine.replace(/\s*@db\.\w+(\([^)]*\))?/, "");
      }
      modelLines[li] = newLine;
      typeFixCount++;
      changed = true;
    }
  }

  if (changed) {
    generatedCode =
      generatedCode.substring(0, openBrace + 1) +
      modelLines.join("\n") +
      generatedCode.substring(idx);
  }
}
console.log("  Type mismatches fixed: " + typeFixCount);

// ---------------------------------------------------------------------------
// 5e. Fix @default("") on non-String fields in generated code
//     PrismaProjection emits @default("") for empty defaults, but DateTime/Int/
//     Float/Decimal/Boolean fields can't accept a string default.
//     Strategy: strip @default("") from all non-String fields.
//     Also fix @default(0) on String/DateTime fields.
// ---------------------------------------------------------------------------
let genDefaultFixCount = 0;
const lines = generatedCode.split("\n");
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Fix @default("") on non-String fields → remove @default entirely
  if (line.includes('@default("")')) {
    const typeMatch = line.match(/^\s+\w+\s+(DateTime|Int|Float|Decimal|Boolean|BigInt)(\??)/);
    if (typeMatch) {
      lines[i] = line.replace(/\s*@default\(""\)/, "");
      genDefaultFixCount++;
    }
  }
  // Fix @default(0) on String fields → @default("")
  if (line.includes('@default(0)')) {
    const typeMatch = line.match(/^\s+\w+\s+(String)(\??)/);
    if (typeMatch) {
      lines[i] = line.replace(/@default\(0\)/, '@default("")');
      genDefaultFixCount++;
    }
  }
  // Fix @default(0) on DateTime fields → remove @default entirely
  if (line.includes('@default(0)')) {
    const typeMatch = line.match(/^\s+\w+\s+(DateTime)(\??)/);
    if (typeMatch) {
      lines[i] = line.replace(/\s*@default\(0\)/, "");
      genDefaultFixCount++;
    }
  }
}
generatedCode = lines.join("\n");
// Fix @default("0") on Int/Float fields → @default(0)
generatedCode = generatedCode.replace(
  /(\s+\w+\s+(?:Int|Float)\??(?:\s+\S+)?)\s+@default\("([0-9.]+)"\)/g,
  (_match, prefix, val) => {
    genDefaultFixCount++;
    return prefix.trimEnd() + " @default(" + Math.floor(parseFloat(val)) + ")";
  }
);
// Fix @default(0) on String fields → @default("")
// (IR default 0 on a string-typed field produces invalid Prisma)
generatedCode = generatedCode.replace(
  /(\s+\w+\s+String\??(?:\s+\S+)*?)\s+@default\(0\)/g,
  (_match, prefix) => {
    genDefaultFixCount++;
    return prefix + ' @default("")';
  }
);
// Fix @default(0) on DateTime fields → remove @default entirely
// (IR default 0 on a datetime-typed field produces invalid Prisma)
generatedCode = generatedCode.replace(
  /(\s+\w+\s+DateTime\??(?:\s+\S+)*?)\s+@default\(0\)/g,
  (_match, prefix) => {
    genDefaultFixCount++;
    return prefix;
  }
);
console.log("  Generated default fixes: " + genDefaultFixCount);

// ---------------------------------------------------------------------------
// 5f. Strip forward relation fields from generated models
//     The projection emits @relation lines based on foreignKeys, but without
//     matching back-relation fields on target models, prisma validate fails.
//     Since this is a validation artifact (not the production schema), strip
//     all @relation lines. Also strips @db.Time on String fields.
// ---------------------------------------------------------------------------
let strippedRelLines = 0;
let strippedDbTime = 0;
const modelRegex5f = /^model\s+(\w+)\s*\{/gm;
let match5f;
while ((match5f = modelRegex5f.exec(generatedCode)) !== null) {
  const modelStartIdx = match5f.index;
  const openBrace = modelStartIdx + match5f[0].length - 1;
  let depth = 1;
  let idx = openBrace + 1;
  while (idx < generatedCode.length) {
    if (generatedCode[idx] === "{") depth++;
    if (generatedCode[idx] === "}") depth--;
    if (depth === 0) break;
    idx++;
  }
  const modelBlock = generatedCode.substring(openBrace + 1, idx);
  const modelLines = modelBlock.split("\n");
  const newLines = [];

  for (const line of modelLines) {
    const trimmed = line.trim();
    // Strip relation lines: fieldName Type? @relation(...) or fieldName Type[] @relation(...)
    if (trimmed.includes("@relation(") && /^\w+\s+\w+(\[\]|\??)/.test(trimmed)) {
      strippedRelLines++;
      continue;
    }
    // Strip back-relation array fields: fieldName Type[] where Type is an IR entity
    // These require opposite relation fields that may not exist
    const arrRelMatch = trimmed.match(/^(\w+)\s+(\w+)\[\]\s*$/);
    if (arrRelMatch && irEntityNames.has(arrRelMatch[2])) {
      strippedRelLines++;
      continue;
    }
    // Strip @db.Time from String fields (Prisma expects DateTime for @db.Time)
    if (trimmed.includes("@db.Time") && !trimmed.includes("DateTime")) {
      newLines.push(line.replace(/\s*@db\.Time(\(\d+\))?/, ""));
      strippedDbTime++;
      continue;
    }
    newLines.push(line);
  }

  if (newLines.length !== modelLines.length || strippedDbTime > 0) {
    generatedCode =
      generatedCode.substring(0, openBrace + 1) +
      newLines.join("\n") +
      generatedCode.substring(idx);
  }
}
console.log("  Forward relation lines stripped: " + strippedRelLines);
console.log("  @db.Time stripped: " + strippedDbTime);

// ---------------------------------------------------------------------------
// 5g. Deduplicate generated models with the same @@map table name.
//     Some IR entities represent the same domain concept and map to the same
//     Prisma table (e.g., EventStaff + EventStaffAssignment → event_staff_assignments).
//     When multiple generated models share a @@map table, keep the one whose
//     model name matches the actual Prisma model name (the "canonical" one)
//     and remove the alias entity's model.
// ---------------------------------------------------------------------------
{
  // Collect model name → @@map table for all generated models
  const modelTableMap = new Map(); // modelName → tableName
  const tableModelsMap = new Map(); // tableName → [modelNames]
  const modelRegex5g = /^model\s+(\w+)\s*\{/gm;
  let match5g;
  while ((match5g = modelRegex5g.exec(generatedCode)) !== null) {
    const modelName = match5g[1];
    const startIdx = match5g.index;
    const openBrace = startIdx + match5g[0].length - 1;
    let depth = 1;
    let idx = openBrace + 1;
    while (idx < generatedCode.length) {
      if (generatedCode[idx] === "{") depth++;
      if (generatedCode[idx] === "}") depth--;
      if (depth === 0) break;
      idx++;
    }
    const block = generatedCode.substring(startIdx, idx + 1);
    const mapMatch = block.match(/@@map\("([^"]+)"\)/);
    if (mapMatch) {
      modelTableMap.set(modelName, mapMatch[1]);
      if (!tableModelsMap.has(mapMatch[1])) tableModelsMap.set(mapMatch[1], []);
      tableModelsMap.get(mapMatch[1]).push(modelName);
    }
  }

  // Find tables with multiple models
  let dupTableCount = 0;
  const modelsToRemove = new Set();
  for (const [table, models] of tableModelsMap) {
    if (models.length > 1) {
      dupTableCount++;
      // Keep the "canonical" model and remove the alias.
      // Heuristic: the alias entity is the one listed in ENTITY_ACCESSOR_OVERRIDES
      // (it maps to a different Prisma model name). The canonical entity maps directly.
      const canonical = models.find(m => !ENTITY_ACCESSOR_OVERRIDES[m]);
      const toRemove = canonical ? models.filter(m => m !== canonical) : models.slice(1);
      toRemove.forEach(m => modelsToRemove.add(m));
    }
  }

  if (modelsToRemove.size > 0) {
    // Remove the duplicate models from generatedCode
    for (const modelName of modelsToRemove) {
      const startPattern = "model " + modelName + " {";
      const startIdx = generatedCode.indexOf(startPattern);
      if (startIdx === -1) continue;
      const openBrace = startIdx + startPattern.length - 1;
      let depth = 1;
      let idx = openBrace + 1;
      while (idx < generatedCode.length) {
        if (generatedCode[idx] === "{") depth++;
        if (generatedCode[idx] === "}") depth--;
        if (depth === 0) break;
        idx++;
      }
      // Remove the model block plus surrounding whitespace
      const before = generatedCode.substring(0, startIdx).trimEnd();
      const after = generatedCode.substring(idx + 1).trimStart();
      generatedCode = before + "\n" + after;
    }
  }
  console.log("  Duplicate-table models deduplicated: " + modelsToRemove.size + " removed (" + dupTableCount + " table conflicts)");
  if (modelsToRemove.size > 0) {
    console.log("    Removed: " + [...modelsToRemove].join(", "));
  }
}

// ---------------------------------------------------------------------------
// 6. Extract header from committed schema (datasource + generator)
// ---------------------------------------------------------------------------
const firstModelIdx = committedSchema.indexOf("model ");
const header = committedSchema.substring(0, firstModelIdx);

// Build the complete schemas list from both generated and committed
const allSchemas = new Set(Object.values(rawOpts.multiSchema.entitySchema));
allSchemas.add("public");
const committedSchemasMatch = committedSchema.match(/schemas\s*=\s*\[([^\]]+)\]/);
if (committedSchemasMatch) {
  for (const s of committedSchemasMatch[1].split(",")) {
    allSchemas.add(s.trim().replace(/"/g, ""));
  }
}
const sortedSchemas = [...allSchemas].sort();
const updatedHeader = header.replace(
  /schemas\s*=\s*\[[^\]]+\]/,
  'schemas = [' + sortedSchemas.map((s) => '"' + s + '"').join(", ") + ']'
);

// ---------------------------------------------------------------------------
// 6b. Extract all enums from the committed schema
// ---------------------------------------------------------------------------
// Enums are scattered among models in the committed schema.
// We need to collect them all and place them after the header.
const enumBlocks = [];
for (const enumMatch of committedSchema.matchAll(/^enum\s+(\w+)\s*\{[\s\S]*?\n\}/gm)) {
  enumBlocks.push(enumMatch[0]);
}
console.log("\nHeader: " + enumBlocks.length + " enums + datasource/generator");
console.log("  Schemas: " + sortedSchemas.join(", "));

// ---------------------------------------------------------------------------
// 7. Extract infra-core models from committed schema (not in IR)
// ---------------------------------------------------------------------------
const committedModelNames = [
  ...committedSchema.matchAll(/^model\s+(\w+)\s*\{/gm),
].map((m) => m[1]);
const infraModels = committedModelNames.filter((name) => !irEntityNames.has(name));

// ---------------------------------------------------------------------------
// 6a. Collect @@map table names from generated models to avoid duplicates
//     in infra-core pass-through. When an IR entity has a different name
//     from the Prisma model but maps to the same table (e.g., IR BankAccount
//     → model EmployeeBankAccount → table employee_bank_accounts), the
//     generated model already covers that table via @@map.
// ---------------------------------------------------------------------------
const generatedTableNames = new Set();
const genMapRegex = /@@map\("([^"]+)"\)/g;
let genMapMatch;
while ((genMapMatch = genMapRegex.exec(generatedCode)) !== null) {
  generatedTableNames.add(genMapMatch[1]);
}
console.log("  Generated @@map tables: " + generatedTableNames.size);

// Extract each infra model block using depth-aware brace matching
function extractModelBlock(schemaText, modelName) {
  const startPattern = "model " + modelName + " {";
  const startIdx = schemaText.indexOf(startPattern);
  if (startIdx === -1) return null;

  const openBrace = startIdx + startPattern.length - 1;
  let depth = 1; // we start after the opening {
  let i = openBrace + 1;
  while (i < schemaText.length) {
    if (schemaText[i] === "{") depth++;
    if (schemaText[i] === "}") depth--;
    if (depth === 0) break;
    i++;
  }
  return schemaText.substring(startIdx, i + 1);
}

const infraBlocks = [];
const infraMissing = [];
const infraDeduped = [];
for (const name of infraModels) {
  const block = extractModelBlock(committedSchema, name);
  if (block) {
    // Check if this infra model's @@map table is already covered by a generated model
    const infraMapMatch = block.match(/@@map\("([^"]+)"\)/);
    const infraTable = infraMapMatch ? infraMapMatch[1] : name;
    if (generatedTableNames.has(infraTable)) {
      infraDeduped.push(name + " (table: " + infraTable + ")");
      continue; // Skip — generated model already covers this table
    }
    infraBlocks.push(block);
  } else {
    infraMissing.push(name);
  }
}
console.log("\nInfra-core: " + infraBlocks.length + " pass-through models appended");
if (infraDeduped.length > 0) {
  console.log("  Deduplicated (table covered by generated model): " + infraDeduped.length);
  for (const d of infraDeduped) console.log("    " + d);
}
if (infraMissing.length > 0) {
  console.log("  Missing (extract failed): " + infraMissing.join(", "));
}

// ---------------------------------------------------------------------------
// 7b. Strip forward relations from infra-core models that point to
//     IR-generated models (the generated models may not have back-relations).
//     Without this, prisma validate fails with "Missing opposite relation" errors.
// ---------------------------------------------------------------------------
let strippedRelations = 0;
for (let bi = 0; bi < infraBlocks.length; bi++) {
  const block = infraBlocks[bi];
  const lines = block.split("\n");
  const newLines = [];
  for (const line of lines) {
    const trimmed = line.trim();
    // Match relation lines: fieldName Type[] @relation(...) or fieldName Type? @relation(...)
    // that reference IR-generated models
    const relMatch = trimmed.match(/^(\w+)\s+(\w+)(\[\]|\??)\s+@relation\(/);
    if (relMatch) {
      const refType = relMatch[2];
      // If the referenced type is an IR-generated model, strip this line
      if (irEntityNames.has(refType)) {
        strippedRelations++;
        continue; // skip this line
      }
    }
    // Also strip back-relation array fields: fieldName Type[] where Type is an IR entity
    // (e.g., "invoices Invoice[]" on Account when Invoice is an IR-generated model)
    const arrRelMatch = trimmed.match(/^(\w+)\s+(\w+)\[\]\s*$/);
    if (arrRelMatch && irEntityNames.has(arrRelMatch[2])) {
      strippedRelations++;
      continue;
    }
    newLines.push(line);
  }
  if (newLines.length !== lines.length) {
    infraBlocks[bi] = newLines.join("\n");
  }
}
console.log("  Infra-core forward relations stripped: " + strippedRelations);

// ---------------------------------------------------------------------------
// 7c. Fix @default("0.000") parse errors on Int fields
//     PrismaProjection may emit string defaults on Int fields
// ---------------------------------------------------------------------------
let defaultFixCount = 0;
for (let bi = 0; bi < infraBlocks.length; bi++) {
  const block = infraBlocks[bi];
  let fixed = block;
  // Fix @default("0.000") on Int/Float/Decimal fields → @default(0)
  fixed = fixed.replace(
    /(\s+\w+\s+(?:Int|Float|Decimal)\??\s+.*)@default\("([0-9.]+)"\)/g,
    (_match, prefix, val) => {
      defaultFixCount++;
      return prefix + "@default(" + Math.floor(parseFloat(val)) + ")";
    }
  );
  // Fix @default("") on Int/Float fields → remove the @default entirely
  fixed = fixed.replace(
    /(\s+\w+\s+(?:Int|Float|Decimal)\??\s+\S+[^\n]*)\s+@default\(""\)/g,
    "$1"
  );
  if (fixed !== block) {
    infraBlocks[bi] = fixed;
  }
}
console.log("  Infra-core default fixes: " + defaultFixCount);

// ---------------------------------------------------------------------------
// 8. Assemble final schema
// ---------------------------------------------------------------------------
const output =
  updatedHeader +
  "// ===== ENUMS (from committed schema) =====\n\n" +
  enumBlocks.join("\n\n") +
  "\n\n" +
  generatedCode.trimEnd() +
  "\n\n// ===== INFRA-CORE PASS-THROUGH MODELS (not from IR) =====\n\n" +
  infraBlocks.join("\n\n") +
  "\n";

const totalModels = (output.match(/^model /gm) || []).length;
console.log("\nTotal: " + totalModels + " models (" + generatedModelCount + " generated + " + infraBlocks.length + " infra)");

// ---------------------------------------------------------------------------
// 8b. Final default fix on the assembled output
//     Earlier per-section fixes may miss cases due to pipeline ordering.
//     Apply a definitive line-by-line pass on the fully assembled output.
// ---------------------------------------------------------------------------
let finalDefaultFixes = 0;
const outputLines = output.split("\n");
for (let i = 0; i < outputLines.length; i++) {
  const line = outputLines[i];
  // Fix @default("") on non-String fields → strip @default
  if (line.includes('@default("")')) {
    const typeMatch = line.match(/^\s+\w+\s+(DateTime|Int|Float|Decimal|Boolean|BigInt)(\??)/);
    if (typeMatch) {
      outputLines[i] = line.replace(/\s*@default\(""\)/, "");
      finalDefaultFixes++;
    }
  }
  // Fix @default(0) on String fields → @default("")
  if (line.includes("@default(0)")) {
    const typeMatch = line.match(/^\s+\w+\s+(String)(\??)/);
    if (typeMatch) {
      outputLines[i] = line.replace(/@default\(0\)/, '@default("")');
      finalDefaultFixes++;
    }
  }
  // Fix @default(0) on DateTime fields → strip @default
  if (line.includes("@default(0)")) {
    const typeMatch = line.match(/^\s+\w+\s+(DateTime)(\??)/);
    if (typeMatch) {
      outputLines[i] = line.replace(/\s*@default\(0\)/, "");
      finalDefaultFixes++;
    }
  }
}
const finalOutput = outputLines.join("\n");
if (finalDefaultFixes > 0) {
  console.log("  Final default fixes on assembled output: " + finalDefaultFixes);
}

// ---------------------------------------------------------------------------
// 9. Write output
// ---------------------------------------------------------------------------
writeFileSync(OUTPUT_PATH, finalOutput);
console.log("Output: " + OUTPUT_PATH);

// ---------------------------------------------------------------------------
// 10. Validate with prisma validate
// ---------------------------------------------------------------------------
console.log("\nValidating...");
try {
  execSync(
    'npx prisma validate --schema="' + OUTPUT_PATH + '"',
    {
      cwd: PROJECT_ROOT,
      stdio: "pipe",
      timeout: 60000,
      env: { ...process.env },
    }
  );
  console.log("prisma validate passed");
} catch (err) {
  const stdout = (err.stdout && err.stdout.toString()) || "";
  const stderr = (err.stderr && err.stderr.toString()) || "";
  console.log("prisma validate FAILED");
  const errorOutput = stdout + stderr;
  const errorLines = errorOutput.split("\n").filter((l) => l.trim());
  for (const line of errorLines.slice(0, 50)) {
    console.log("  " + line);
  }
  if (errorLines.length > 50) {
    console.log("  ... and " + (errorLines.length - 50) + " more lines");
  }
  console.log("\n  Exit code: " + err.status);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("\n======== SUMMARY ========");
console.log("PrismaProjection: " + generatedModelCount + " models generated, " + diagnostics.length + " diagnostics");
console.log("Post-process: " + insertions.length + " @@unique injected");
console.log("Header: " + enumBlocks.length + " enums + datasource/generator");
console.log("Infra-core: " + infraBlocks.length + " pass-through models appended");
console.log("Total: " + totalModels + " models (" + generatedModelCount + " generated + " + infraBlocks.length + " infra)");
console.log("Output: " + OUTPUT_PATH);
