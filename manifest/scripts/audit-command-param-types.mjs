#!/usr/bin/env node

/**
 * audit-command-param-types.mjs — Command-parameter TYPE cross-validation gate.
 *
 * WHY THIS EXISTS:
 *   Every Manifest command declares its parameter types in the compiled IR
 *   (manifest/ir/kitchen.ir.json). Those declarations are independently
 *   projected into three downstream surfaces, each of which MUST agree with
 *   the IR or a silent type-coercion bug escapes into production:
 *
 *     (a) Prisma model columns  — packages/database/prisma/schema.prisma
 *         A param typed `number` in the IR that maps to a `DateTime`/`Decimal`
 *         column is a silent runtime coercion (the v0.12.214-215 incident:
 *         54 command-param type mismatches discovered only after runtime
 *         failures). This is the dangerous class — the store boundary lies.
 *
 *     (b) Generated Zod schema  — regenerated on the fly from the IR via the
 *         ZodProjection (output is gitignored by design, so it is regenerated
 *         into a temp dir here, mirroring the OpenAPI drift gate's
 *         regenerate-then-compare pattern). Catches projection drift.
 *
 *     (c) Committed OpenAPI spec — manifest/api-docs/openapi.json (served at
 *         /api-docs, consumed by the MCP server). A stale/mistyped spec lies
 *         to every API consumer and AI tool about the live HTTP contract.
 *
 *   Each surface represents types according to its own wire/validation
 *   convention (e.g. IR `money` → OpenAPI `string`, Zod `z.number()`, Prisma
 *   `Decimal`), so the gate normalizes to per-surface EXPECTED representations
 *   rather than naive string equality — only genuine semantic mismatches
 *   (number↔DateTime, string↔Decimal, datetime↔Int, …) are flagged.
 *
 *   This closes the constitution's projection-conformance requirement (§10/§13:
 *   "generated surface drift against IR/runtime" CI check) for the command-
 *   parameter type contract — the exact gap the v0.12.214-215 manual fix run
 *   fell through.
 *
 * WHAT IT CHECKS (per command parameter found in the IR):
 *   - prisma_type_mismatch  : param maps to an entity property → Prisma column,
 *                            and the type GROUPS conflict (temporal vs integer,
 *                            decimal vs string, …).
 *   - openapi_type_mismatch : the committed OpenAPI requestBody representation
 *                            for the param does not match the expected shape
 *                            for the IR type (e.g. datetime not emitted as
 *                            string/date-time; int not integer).
 *   - openapi_missing       : param is absent from the OpenAPI requestBody.
 *   - zod_type_mismatch     : the regenerated Zod schema field for the param
 *                            does not match the expected Zod shape (only when
 *                            the ZodProjection is importable; otherwise Zod
 *                            is skipped with a warning — it is a gitignored,
 *                            zero-consumer surface per phase-out-registry §D).
 *
 * EXIT CODES: 0 = clean (or only baseline-known violations in --strict);
 *             1 = NEW violation not in the baseline (--strict), or any
 *                  invocation error.
 *
 * USAGE:
 *   node manifest/scripts/audit-command-param-types.mjs                 # report only
 *   node manifest/scripts/audit-command-param-types.mjs --strict        # CI gate
 *   node manifest/scripts/audit-command-param-types.mjs --update-baseline  # snapshot current debt
 *   node manifest/scripts/audit-command-param-types.mjs --self-test     # verify comparison logic
 *   node manifest/scripts/audit-command-param-types.mjs --no-zod        # skip Zod regeneration
 *
 * pnpm scripts:
 *   manifest:audit-command-param-types[:strict|:baseline]
 *
 * Baseline discipline mirrors audit-schema-drift.mjs / audit-direct-writes:
 *   the committed baseline (manifest/governance/command-param-types-baseline.json)
 *   is the known pre-existing debt inventory. `--strict` fails ONLY on
 *   violations NOT in the baseline, so the gate protects against NEW drift
 *   immediately while the existing backlog is burned down. Entries may ONLY
 *   be removed (by fixing the drift); additions require fixing the new drift
 *   instead of rebaselining.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");

const STRICT = process.argv.includes("--strict");
const UPDATE_BASELINE = process.argv.includes("--update-baseline");
const SKIP_ZOD = process.argv.includes("--no-zod");

const PATHS = {
  ir: resolve(PROJECT_ROOT, "manifest/ir/kitchen.ir.json"),
  prismaSchema: resolve(
    PROJECT_ROOT,
    "packages/database/prisma/schema/manifest.prisma"
  ),
  openapi: resolve(PROJECT_ROOT, "manifest/api-docs/openapi.json"),
  // IR-name ↔ Prisma-column bridge + accessor (produced by
  // generate-prisma-model-metadata.mjs). Carries ENTITY_TO_PRISMA_MODEL aliases.
  modelMetadata: resolve(
    PROJECT_ROOT,
    "manifest/generated/runtime/prisma-model-metadata.generated.json"
  ),
  baseline: resolve(
    PROJECT_ROOT,
    "manifest/governance/command-param-types-baseline.json"
  ),
  outDir: resolve(PROJECT_ROOT, "manifest/reports/command-param-types"),
};

// ---------------------------------------------------------------------------
// Type GROUPS — canonical buckets shared by the Prisma comparison.
// Reuses the exact semantics from audit-schema-drift.mjs (IR_TYPE_ACCEPTS +
// prismaTypeGroup) so the two gates agree on what "compatible" means.
// ---------------------------------------------------------------------------

/** IR scalar name → set of acceptable Prisma type groups. */
const IR_TYPE_ACCEPTS_PRISMA = {
  datetime: new Set(["temporal"]),
  timestamp: new Set(["temporal"]),
  int: new Set(["integer"]),
  bigint: new Set(["integer"]),
  money: new Set(["decimal"]),
  decimal: new Set(["decimal"]),
  float: new Set(["decimal"]),
  // Legacy ambiguous numeric: accepts integer OR decimal, but NOT temporal/
  // string/boolean — that is the exact silent-coercion class this gate exists
  // to catch (a `number` param over a DateTime column is always wrong).
  number: new Set(["integer", "decimal"]),
  boolean: new Set(["boolean"]),
  bool: new Set(["boolean"]),
  string: new Set(["string", "json"]),
  text: new Set(["string", "json"]),
  email: new Set(["string"]),
  url: new Set(["string"]),
  uuid: new Set(["string"]),
  date: new Set(["temporal", "string"]),
  time: new Set(["temporal", "string"]),
  json: new Set(["json", "string"]),
  object: new Set(["json", "string"]),
  array: new Set(["array", "json"]),
};

const PRISMA_SCALAR_GROUPS = {
  DateTime: "temporal",
  Int: "integer",
  BigInt: "integer",
  Decimal: "decimal",
  Float: "decimal",
  Boolean: "boolean",
  Json: "json",
  String: "string",
  Bytes: "string",
};

function prismaTypeGroup(field, knownModels) {
  if (field.isRelation) return "relation";
  if (field.isArray) return "array";
  if (field.prismaType in PRISMA_SCALAR_GROUPS) {
    return PRISMA_SCALAR_GROUPS[field.prismaType];
  }
  // PascalCase non-model type = Prisma enum → string-valued.
  return knownModels && field.prismaType in knownModels ? "relation" : "string";
}

// ---------------------------------------------------------------------------
// EXPECTED representations for the derived surfaces (OpenAPI + Zod).
// These are per-IR-type lookup tables because each surface has its own
// wire/validation convention (e.g. money serializes as a JSON string for
// Decimal precision, but validates as z.number()). A naive group check would
// create false positives, so we spell out the expected shape instead.
// ---------------------------------------------------------------------------

/** IR scalar name → expected OpenAPI {type, format?}. `*` = accept any type. */
const IR_TYPE_EXPECTED_OPENAPI = {
  string: { type: "string" },
  text: { type: "string" },
  email: { type: "string" },
  url: { type: "string" },
  uuid: { type: "string" },
  datetime: { type: "string", format: "date-time" },
  timestamp: { type: "string", format: "date-time" },
  date: { type: "string", format: "date" },
  time: { type: "string" },
  int: { type: "integer" },
  bigint: { type: "integer" },
  // Decimal is serialized as a JSON string for precision (wire convention).
  money: { type: "string" },
  decimal: { type: "string" },
  // float is emitted as string by the current projection; accept number too.
  float: { type: "string" },
  number: { type: "number" },
  boolean: { type: "boolean" },
  bool: { type: "boolean" },
  json: { type: "object" },
  object: { type: "object" },
  array: { type: "array" },
};

/** IR scalar name → expected leading Zod token in the generated schema. */
const IR_TYPE_EXPECTED_ZOD = {
  string: "z.string",
  text: "z.string",
  email: "z.string",
  url: "z.string",
  uuid: "z.string",
  datetime: "z.coerce.date",
  timestamp: "z.coerce.date",
  date: "z.coerce.date",
  time: "z.string",
  int: "z.number",
  bigint: "z.number",
  money: "z.number",
  decimal: "z.number",
  float: "z.number",
  number: "z.number",
  boolean: "z.boolean",
  bool: "z.boolean",
  json: "z.unknown",
  object: "z.record",
  array: "z.array",
};

// ---------------------------------------------------------------------------
// IO helpers
// ---------------------------------------------------------------------------

function loadJSON(filePath, label) {
  if (!existsSync(filePath)) {
    console.error(`[cmd-param-types] ${label} not found: ${filePath}`);
    process.exit(2);
  }
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

// ---------------------------------------------------------------------------
// Prisma schema parser — narrow, reuses audit-schema-drift.mjs's approach.
// Returns { [ModelName]: { fields: [...], dbName } }.
// ---------------------------------------------------------------------------

function parsePrismaSchema(source) {
  const models = {};
  const re = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
  let m = re.exec(source);
  while (m !== null) {
    const [, name, body] = m;
    const fields = [];
    for (const raw of body.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("//") || line.startsWith("@@")) continue;
      const fm = line.match(/^(\w+)\s+(\w+)(\??|\[\])?\s*(.*)$/);
      if (!fm) continue;
      const [, fieldName, typeName, modifier, rest] = fm;
      fields.push({
        name: fieldName,
        prismaType: typeName,
        optional: modifier === "?",
        isArray: modifier === "[]",
        hasDefault: /@default\s*\(/.test(rest),
        isUpdatedAt: /@updatedAt\b/.test(rest),
        isId: /@id\b/.test(rest),
        isRelation: false,
        isPotentialRelation:
          /^[A-Z]/.test(typeName) && !(typeName in PRISMA_SCALAR_GROUPS),
      });
    }
    models[name] = { fields };
    m = re.exec(source);
  }
  // Second pass: resolve relations by model-name match.
  for (const model of Object.values(models)) {
    for (const field of model.fields) {
      field.isRelation = !!(
        field.isPotentialRelation &&
        field.prismaType in models
      );
    }
  }
  return models;
}

// ---------------------------------------------------------------------------
// Zod regeneration (mirrors the OpenAPI drift gate's regenerate-then-discard).
// The Zod entity schemas are gitignored (phase-out-registry §D), so they are
// regenerated into a temp dir, parsed, and removed. Failure to import the
// projection degrades gracefully (Zod check skipped) — it is a zero-consumer
// surface, so the gate must not fail CI on its absence.
// ---------------------------------------------------------------------------

async function regenerateZodSchemas() {
  const tmpDir = mkdtempSync(join(tmpdir(), "cmd-param-zod-"));
  try {
    const { ZodProjection } = await import(
      "@angriff36/manifest/projections/zod"
    );
    const ir = loadJSON(PATHS.ir, "IR");
    const projection = new ZodProjection();
    const result = projection.generate(ir, {
      surface: "zod.entity",
      options: {
        emitTypes: true,
        emitComputedSchemas: true,
        zodImportPath: "zod",
        emitHeader: true,
      },
    });
    if (result.errors?.length) {
      throw new Error(
        `ZodProjection returned ${result.errors.length} error(s): ` +
          result.errors.map((e) => e.message || JSON.stringify(e)).join("; ")
      );
    }
    /** Map<EntityName, Map<fieldName, leadingZodToken>> */
    const byEntity = new Map();
    for (const artifact of result.artifacts ?? []) {
      if (!artifact.code) continue;
      const id = artifact.id ?? artifact.pathHint ?? "";
      // artifact.id is the entity name for the zod.entity surface.
      const fields = parseZodObjectFields(artifact.code);
      if (fields.size > 0) byEntity.set(id, fields);
    }
    return { ok: true, byEntity };
  } catch (err) {
    return { ok: false, error: err };
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Parse `z.object({ ... })` field lines into Map<fieldName, leadingToken>.
 * Handles indented `  fieldName: z.number().int()...` shapes. Returns the
 * first `z.<token>` (up to the first `(`) so callers compare against
 * IR_TYPE_EXPECTED_ZOD values like "z.number" / "z.coerce.date".
 */
function parseZodObjectFields(code) {
  const fields = new Map();
  const lines = code.split("\n");
  let inObject = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/z\.object\s*\{/.test(line) || /z\.object\s*\(\s*\{/.test(line)) {
      inObject = true;
      continue;
    }
    if (!inObject) continue;
    // Object closes on a bare `});` / `})`
    if (/^\s*\}\)?\s*[,;]?\s*$/.test(line) && !line.includes(":")) break;
    // Field line: `  name: z.<token>(...)`
    const fm = line.match(/^\s{2,}(\w+)\s*:\s*(z\.[A-Za-z.]+)/);
    if (!fm) continue;
    const [, fieldName, token] = fm;
    // Normalize to the leading comparison token (z.number / z.coerce.date).
    fields.set(fieldName, token);
  }
  return fields;
}

// ---------------------------------------------------------------------------
// Core cross-validation
// ---------------------------------------------------------------------------

/**
 * Build entity-name → property map (by name). Used to resolve a command param
 * to its backing entity property (and thus to a Prisma column via metadata).
 */
function buildEntityPropertyMap(ir) {
  const map = new Map();
  for (const e of ir.entities ?? []) {
    const props = new Map();
    for (const p of e.properties ?? []) props.set(p.name, p);
    map.set(e.name, props);
  }
  return map;
}

function irTypeName(param) {
  const t = param.type;
  if (!t) return "unknown";
  return typeof t === "string" ? t : t.name ?? "unknown";
}

function checkPrisma({
  entityName,
  paramName,
  irType,
  entityProps,
  metaEntry,
  prismaModels,
}) {
  if (!metaEntry) return null; // no Prisma model for this entity
  const prop = entityProps?.get(paramName);
  if (!prop) return null; // param has no backing entity property → not a column
  // Resolve the Prisma column via the metadata bridge (IR name → column name).
  const metaField = metaEntry.fields.find(
    (f) => f.irName === paramName || f.name === paramName
  );
  if (!metaField) return null;
  const modelName =
    metaEntry.accessor[0].toUpperCase() + metaEntry.accessor.slice(1);
  const model = prismaModels[modelName];
  if (!model) return null;
  const prismaField = model.fields.find((f) => f.name === metaField.name);
  if (!prismaField) return null;

  const accepts = IR_TYPE_ACCEPTS_PRISMA[irType];
  if (!accepts) return null; // unknown IR type — don't false-positive
  const group = prismaTypeGroup(prismaField, prismaModels);
  if (accepts.has(group)) return null;

  return {
    surface: "prisma",
    severity: "prisma_type_mismatch",
    irType,
    declared: `${prismaField.prismaType}${prismaField.isArray ? "[]" : ""}`,
    expectedGroup: [...accepts].join("|"),
    actualGroup: group,
    recommendation: `${entityName}.${paramName} is \`${irType}\` in the IR but column \`${metaField.name}\` on ${modelName} is \`${prismaField.prismaType}\` (${group}). Align the .manifest type or migrate the column.`,
  };
}

function checkOpenAPI({ entityName, commandName, paramName, irType, pathOp }) {
  if (!pathOp) return null; // no OpenAPI path for this command
  const props =
    pathOp.post?.requestBody?.content?.["application/json"]?.schema
      ?.properties ?? null;
  if (!props) return null;
  const oaField = props[paramName];
  if (!oaField) {
    return {
      surface: "openapi",
      severity: "openapi_missing",
      irType,
      declared: "(absent)",
      recommendation: `${entityName}.${commandName}.${paramName} (\`${irType}\`) is missing from the OpenAPI requestBody. Run \`pnpm manifest:openapi\` and commit the regenerated spec.`,
    };
  }
  const expected = IR_TYPE_EXPECTED_OPENAPI[irType];
  if (!expected) return null;
  // float is emitted as string by the current projection but number is also
  // acceptable — accept either for the float case.
  const typeOk =
    expected.type === "*" ||
    oaField.type === expected.type ||
    (irType === "float" && (oaField.type === "string" || oaField.type === "number"));
  const formatOk = !expected.format || oaField.format === expected.format;
  if (typeOk && formatOk) return null;

  const actual = oaField.format
    ? `${oaField.type}/${oaField.format}`
    : oaField.type;
  const wanted = expected.format
    ? `${expected.type}/${expected.format}`
    : expected.type;
  return {
    surface: "openapi",
    severity: "openapi_type_mismatch",
    irType,
    declared: actual,
    expected: wanted,
    recommendation: `${entityName}.${commandName}.${paramName} is \`${irType}\` in the IR but OpenAPI declares \`${actual}\` (expected \`${wanted}\`). Run \`pnpm manifest:openapi\` and commit the regenerated spec.`,
  };
}

function checkZod({ entityName, paramName, irType, zodFields }) {
  if (!zodFields) return null;
  const token = zodFields.get(paramName);
  if (!token) return null; // not a persisted property in the entity schema
  const expected = IR_TYPE_EXPECTED_ZOD[irType];
  if (!expected) return null;
  if (token.startsWith(expected)) return null;
  return {
    surface: "zod",
    severity: "zod_type_mismatch",
    irType,
    declared: token,
    expected,
    recommendation: `${entityName}.${paramName} is \`${irType}\` in the IR but the regenerated Zod schema emits \`${token}\` (expected \`${expected}\`). The ZodProjection disagrees with the IR — file a producer issue.`,
  };
}

// ---------------------------------------------------------------------------
// Self-test — exercises the pure comparison helpers so the gate's logic is
// verifiable in isolation (mirrors check-openapi-drift.mjs --self-test).
// ---------------------------------------------------------------------------

function runSelfTest() {
  const cases = [];
  const assert = (name, cond) => cases.push({ name, pass: !!cond });

  const knownModels = { Event: true, Account: true };
  const mkField = (over) => ({
    name: "x",
    prismaType: "String",
    optional: false,
    isArray: false,
    isRelation: false,
    ...over,
  });

  // prismaTypeGroup
  assert(
    "DateTime → temporal",
    prismaTypeGroup(mkField({ prismaType: "DateTime" }), knownModels) ===
      "temporal"
  );
  assert(
    "Int → integer",
    prismaTypeGroup(mkField({ prismaType: "Int" }), knownModels) === "integer"
  );
  assert(
    "Decimal → decimal",
    prismaTypeGroup(mkField({ prismaType: "Decimal" }), knownModels) ===
      "decimal"
  );
  assert(
    "String[] → array",
    prismaTypeGroup(mkField({ prismaType: "String", isArray: true }), knownModels) ===
      "array"
  );

  // Prisma compatibility
  let v = checkPrisma({
    entityName: "E",
    paramName: "budget",
    irType: "money",
    entityProps: new Map([["budget", {}]]),
    metaEntry: {
      accessor: "e",
      fields: [{ name: "budget", irName: "budget" }],
    },
    prismaModels: {
      E: { fields: [mkField({ name: "budget", prismaType: "Decimal" })] },
    },
  });
  assert("money ↔ Decimal is compatible (no violation)", v === null);

  v = checkPrisma({
    entityName: "E",
    paramName: "eventDate",
    irType: "datetime",
    entityProps: new Map([["eventDate", {}]]),
    metaEntry: {
      accessor: "e",
      fields: [{ name: "event_date", irName: "eventDate" }],
    },
    prismaModels: {
      E: { fields: [mkField({ name: "event_date", prismaType: "Int" })] },
    },
  });
  assert(
    "datetime ↔ Int is a mismatch (EventStaff.shiftStart class)",
    v !== null && v.severity === "prisma_type_mismatch"
  );

  v = checkPrisma({
    entityName: "E",
    paramName: "qty",
    irType: "number",
    entityProps: new Map([["qty", {}]]),
    metaEntry: { accessor: "e", fields: [{ name: "qty", irName: "qty" }] },
    prismaModels: {
      E: { fields: [mkField({ name: "qty", prismaType: "DateTime" })] },
    },
  });
  assert(
    "number ↔ DateTime is a mismatch (v0.12.214 class)",
    v !== null && v.severity === "prisma_type_mismatch"
  );
  v = checkPrisma({
    entityName: "E",
    paramName: "qty",
    irType: "number",
    entityProps: new Map([["qty", {}]]),
    metaEntry: { accessor: "e", fields: [{ name: "qty", irName: "qty" }] },
    prismaModels: {
      E: { fields: [mkField({ name: "qty", prismaType: "Decimal" })] },
    },
  });
  assert("number ↔ Decimal is compatible (legacy ambiguous)", v === null);

  // OpenAPI
  v = checkOpenAPI({
    entityName: "E",
    commandName: "create",
    paramName: "eventDate",
    irType: "datetime",
    pathOp: {
      post: {
        requestBody: {
          content: {
            "application/json": {
              schema: {
                properties: { eventDate: { type: "string", format: "date-time" } },
              },
            },
          },
        },
      },
    },
  });
  assert("datetime → string/date-time is compatible", v === null);

  v = checkOpenAPI({
    entityName: "E",
    commandName: "create",
    paramName: "guestCount",
    irType: "int",
    pathOp: {
      post: {
        requestBody: {
          content: {
            "application/json": {
              schema: { properties: { guestCount: { type: "string" } } },
            },
          },
        },
      },
    },
  });
  assert(
    "int → string is a mismatch",
    v !== null && v.severity === "openapi_type_mismatch"
  );

  v = checkOpenAPI({
    entityName: "E",
    commandName: "create",
    paramName: "missing",
    irType: "string",
    pathOp: {
      post: {
        requestBody: {
          content: { "application/json": { schema: { properties: {} } } },
        },
      },
    },
  });
  assert(
    "absent param → openapi_missing",
    v !== null && v.severity === "openapi_missing"
  );

  // Zod
  v = checkZod({
    entityName: "E",
    paramName: "budget",
    irType: "money",
    zodFields: new Map([["budget", "z.number"]]),
  });
  assert("money → z.number is compatible", v === null);
  v = checkZod({
    entityName: "E",
    paramName: "eventDate",
    irType: "datetime",
    zodFields: new Map([["eventDate", "z.string"]]),
  });
  assert(
    "datetime → z.string is a mismatch",
    v !== null && v.severity === "zod_type_mismatch"
  );

  // parseZodObjectFields
  const parsed = parseZodObjectFields(
    "import { z } from 'zod';\nexport const EventSchema = z.object({\n  id: z.string(),\n  eventDate: z.coerce.date(),\n  budget: z.number().optional().default(0),\n});\n"
  );
  assert("parseZodObjectFields extracts z.string", parsed.get("id") === "z.string");
  assert(
    "parseZodObjectFields extracts z.coerce.date",
    parsed.get("eventDate") === "z.coerce.date"
  );
  assert(
    "parseZodObjectFields normalizes z.number(.int) → z.number",
    parsed.get("budget") === "z.number"
  );

  const passed = cases.filter((c) => c.pass).length;
  for (const c of cases) {
    console.log(`  ${c.pass ? "PASS" : "FAIL"}  ${c.name}`);
  }
  console.log(`\nself-test: ${passed}/${cases.length} passed`);
  process.exit(passed === cases.length ? 0 : 1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Command-parameter type cross-validation");
  console.log(
    "Mode:",
    UPDATE_BASELINE
      ? "UPDATE-BASELINE"
      : STRICT
        ? "STRICT (fail on NEW violations)"
        : "REPORT"
  );

  const ir = loadJSON(PATHS.ir, "IR");
  const prismaSource = readFileSync(PATHS.prismaSchema, "utf-8");
  const prismaModels = parsePrismaSchema(prismaSource);
  const openapi = existsSync(PATHS.openapi)
    ? loadJSON(PATHS.openapi, "OpenAPI")
    : null;
  const modelMetadata = existsSync(PATHS.modelMetadata)
    ? loadJSON(PATHS.modelMetadata, "Model metadata")
    : {};
  const entityProps = buildEntityPropertyMap(ir);

  // Zod: regenerate on the fly (gitignored surface). Graceful degradation.
  let zodByEntity = new Map();
  let zodStatus = "skipped";
  if (!SKIP_ZOD) {
    console.log("\n[1/3] Regenerating Zod schemas (temp dir)...");
    const zod = await regenerateZodSchemas();
    if (zod.ok) {
      zodByEntity = zod.byEntity;
      zodStatus = `ok (${zodByEntity.size} entities)`;
    } else {
      zodStatus = `unavailable: ${zod.error.message}`;
      console.log(`  Zod check SKIPPED — ${zodStatus}`);
      console.log(
        "  (Zod is a gitignored zero-consumer surface; Prisma + OpenAPI still enforced.)"
      );
    }
  }

  console.log(
    `\n[2/3] Cross-validating ${ir.commands?.length ?? 0} commands (zod ${zodStatus})...`
  );

  const violations = [];
  let paramsChecked = 0;
  for (const cmd of ir.commands ?? []) {
    const { entity: entityName, name: commandName, parameters } = cmd;
    if (!parameters || parameters.length === 0) continue;
    const pathOp = openapi
      ? openapi.paths?.[`/api/manifest/${entityName}/commands/${commandName}`]
      : null;
    const metaEntry = modelMetadata[entityName];
    const props = entityProps.get(entityName);
    const zodFields = zodByEntity.get(entityName);

    for (const param of parameters) {
      paramsChecked++;
      const irType = irTypeName(param);
      const ctx = {
        entityName,
        commandName,
        paramName: param.name,
        irType,
        entityProps: props,
        metaEntry,
        prismaModels,
        pathOp,
        zodFields,
      };
      const checks = [
        checkPrisma(ctx),
        checkOpenAPI(ctx),
        checkZod(ctx),
      ].filter(Boolean);
      for (const v of checks) {
        violations.push({
          entity: entityName,
          command: commandName,
          param: param.name,
          ...v,
        });
      }
    }
  }

  // --- Reporting -----------------------------------------------------------
  const summary = {
    mode: UPDATE_BASELINE
      ? "update-baseline"
      : STRICT
        ? "strict"
        : "report",
    commandsScanned: ir.commands?.length ?? 0,
    paramsChecked,
    totalViolations: violations.length,
    bySurface: groupCount(violations, (v) => v.surface),
    bySeverity: groupCount(violations, (v) => v.severity),
    zodStatus,
    generatedAt: new Date().toISOString(),
  };

  mkdirSync(PATHS.outDir, { recursive: true });
  writeFileSync(
    join(PATHS.outDir, "command-param-types.json"),
    JSON.stringify({ summary, violations }, null, 2)
  );
  writeFileSync(
    join(PATHS.outDir, "command-param-types.md"),
    renderMarkdown(summary, violations)
  );

  console.log(
    `\n[3/3] ${violations.length} violation(s) across ${paramsChecked} params checked.`
  );
  console.log(
    `  by surface: ${JSON.stringify(summary.bySurface)}`
  );
  console.log(
    `  by severity: ${JSON.stringify(summary.bySeverity)}`
  );
  console.log(
    `  Report: ${join(PATHS.outDir, "command-param-types.json")}`
  );

  // --- Baseline discipline -------------------------------------------------
  const violationKeys = violations
    .map(
      (v) =>
        `${v.entity}.${v.command}.${v.param}:${v.surface}:${v.severity}`
    )
    .sort();

  if (UPDATE_BASELINE) {
    writeFileSync(
      PATHS.baseline,
      `${JSON.stringify(
        {
          _doc:
            "Pre-existing command-param type-mismatch debt (see manifest/reports/command-param-types/). Entries may ONLY be removed (by fixing the drift) — additions require fixing the new drift instead of rebaselining. Generated via pnpm manifest:audit-command-param-types --update-baseline.",
          generatedAt: new Date().toISOString(),
          violations: violationKeys,
        },
        null,
        2
      )}\n`
    );
    console.log(
      `\n[cmd-param-types] Baseline written: ${violationKeys.length} entries → ${PATHS.baseline}`
    );
    return;
  }

  if (STRICT) {
    const baseline = existsSync(PATHS.baseline)
      ? new Set(
          JSON.parse(readFileSync(PATHS.baseline, "utf-8")).violations ?? []
        )
      : new Set();
    const fresh = violationKeys.filter((k) => !baseline.has(k));
    const healed = [...baseline].filter((k) => !violationKeys.includes(k));
    if (healed.length > 0) {
      console.log(
        `[cmd-param-types] ${healed.length} baseline entries are healed — shrink the baseline via --update-baseline.`
      );
    }
    if (fresh.length > 0) {
      console.error(
        `\n[cmd-param-types] STRICT: ${fresh.length} NEW violation(s) not in the baseline:`
      );
      for (const k of fresh.slice(0, 50)) console.error(`  - ${k}`);
      console.error(
        "\nFix the drift (align the .manifest type / regenerate the surface), or, if intentional, document and rebaseline via `pnpm manifest:audit-command-param-types --update-baseline`."
      );
      process.exit(1);
    }
    console.log(
      `[cmd-param-types] STRICT: no new violations (${violationKeys.length} known in baseline).`
    );
  }
}

function groupCount(items, keyFn) {
  const out = {};
  for (const it of items) {
    const k = keyFn(it);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function renderMarkdown(summary, violations) {
  const lines = [
    "# Command-parameter type cross-validation",
    "",
    `Mode: \`${summary.mode}\`  ·  Zod: \`${summary.zodStatus}\``,
    "",
    `Commands scanned: ${summary.commandsScanned}`,
    `Parameters checked: ${summary.paramsChecked}`,
    `Total violations: ${summary.totalViolations}`,
    `By surface: ${JSON.stringify(summary.bySurface)}`,
    `By severity: ${JSON.stringify(summary.bySeverity)}`,
    "",
  ];
  if (violations.length === 0) {
    lines.push("No type mismatches detected across Prisma, OpenAPI, and Zod.");
    return lines.join("\n");
  }
  lines.push("## Violations");
  for (const v of violations) {
    lines.push("");
    lines.push(
      `### \`${v.entity}.${v.command}.${v.param}\`  ·  \`${v.surface}\``
    );
    lines.push(`- severity: \`${v.severity}\``);
    lines.push(`- IR type: \`${v.irType}\``);
    lines.push(`- declared: \`${v.declared}\``);
    if (v.expected) lines.push(`- expected: \`${v.expected}\``);
    if (v.actualGroup)
      lines.push(`- group: expected \`${v.expectedGroup}\` / actual \`${v.actualGroup}\``);
    lines.push(`- ${v.recommendation}`);
  }
  lines.push("");
  lines.push("## How to resolve");
  lines.push("");
  lines.push(
    "1. **Prisma mismatch** — align the `.manifest` source type to match the column (e.g. `number` → `datetime`/`money`), recompile (`pnpm manifest:compile`), and verify the store boundary."
  );
  lines.push(
    "2. **OpenAPI mismatch/missing** — run `pnpm manifest:openapi` and commit the regenerated `manifest/api-docs/openapi.json`."
  );
  lines.push(
    "3. **Zod mismatch** — the ZodProjection disagrees with the IR; file a producer issue (the projection package owns the type map)."
  );
  lines.push(
    "4. **Baseline** — pre-existing debt is snapshotted in `manifest/governance/command-param-types-baseline.json`. `--strict` fails only on NEW violations. Shrink the baseline as drift is fixed via `--update-baseline`."
  );
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
if (args.includes("--self-test")) {
  runSelfTest();
} else {
  main().catch((err) => {
    console.error("[cmd-param-types] Fatal:", err);
    process.exit(2);
  });
}
