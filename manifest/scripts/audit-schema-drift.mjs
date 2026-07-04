#!/usr/bin/env node

/**
 * Manifest ↔ Prisma Schema Drift Audit
 *
 * Per constitution §14: any change to governed semantics must update the
 * manifest first, then the adapter, then the Prisma schema. When that order
 * is reversed (Prisma gets a new required column without a matching manifest
 * property/parameter), the manifest-driven `create` command will compile fine
 * but fail at runtime because the persistence adapter cannot satisfy Prisma's
 * required-column constraint. Real integration tests catch this, but only
 * after a deploy — too late.
 *
 * This script catches it at build time.
 *
 * For each governed entity that has a `create` command in the compiled IR,
 * we check every required scalar field on the matching Prisma model:
 *
 *   1. Declared in manifest? Either a `command create` parameter or an entity
 *      property with a default value the manifest's create action will use.
 *   2. Adapter-derived? In `manifest/governance/schema-drift-allowlist.json` under
 *      `adapterDerived` with a documented rule.
 *   3. Bypass / nonconforming? In the same allowlist under `nonconforming`
 *      with a removal plan and owner.
 *
 * If none of the three, the field is reported as a drift violation.
 * In `--strict` mode the script exits 1 on any unallowlisted violation.
 *
 * Outputs:
 *   manifest/reports/schema-drift/schema-drift.json  — full structured report
 *   manifest/reports/schema-drift/schema-drift.md    — human-readable summary
 *
 * Usage:
 *   pnpm manifest:audit-schema-drift           # report only
 *   pnpm manifest:audit-schema-drift --strict  # exit 1 on violations
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STRICT = process.argv.includes("--strict");

const PATHS = {
  prismaSchema: path.join(ROOT, "packages/database/prisma/schema/manifest.prisma"),
  ir: path.join(ROOT, "manifest/ir/kitchen.ir.json"),
  entitiesRegistry: path.join(ROOT, "manifest/governance/entities.json"),
  // Allowlist is policy and lives under manifest/governance/ (tracked in git).
  // Previously at scripts/manifest/ but moved to the canonical governance
  // directory. Outputs go to manifest/reports/schema-drift/
  // (gitignored — see docs/audits/manifest-artifact-layout-adr.md).
  allowlist: path.join(ROOT, "manifest/governance/schema-drift-allowlist.json"),
  // Live-schema field metadata (entity → {accessor, fields:[{name, irName}]}).
  // Produced by generate-prisma-model-metadata.mjs; carries the IR-name ↔
  // Prisma-field-name bridge including ENTITY_TO_PRISMA_MODEL aliases.
  modelMetadata: path.join(
    ROOT,
    "manifest/runtime/src/generated/prisma-model-metadata.generated.json"
  ),
  outDir: path.join(ROOT, "manifest/reports/schema-drift"),
};

// ---------------------------------------------------------------------------
// Prisma ↔ Manifest type compatibility
// ---------------------------------------------------------------------------

const PRISMA_TO_MANIFEST = {
  String: "string",
  Int: "number",
  BigInt: "number",
  Decimal: "number",
  Float: "number",
  Boolean: "boolean",
  Json: "object",
  Bytes: "string",
  // DateTime in this codebase is represented as number (epoch ms) in manifests
  DateTime: "number",
};

// Manifest semantic types that are aliases for base types.
// The IR uses semantic types (datetime, money, int, decimal) that all map
// to `number` at the Prisma level. Without this normalization, the audit
// reports false type mismatches (e.g. manifest `datetime` vs expected `number`).
const MANIFEST_SEMANTIC_ALIASES = {
  datetime: "number",
  money: "number",
  int: "number",
  decimal: "number",
  text: "string",
  email: "string",
  url: "string",
  uuid: "string",
  date: "string",
  time: "string",
  // Native `json` DSL type (3.1.x wave) projects to a Prisma Json column,
  // which PRISMA_TO_MANIFEST maps to "object".
  json: "object",
};

function manifestKindFor(prismaType) {
  return PRISMA_TO_MANIFEST[prismaType] ?? "unknown";
}

function normalizeManifestType(kind) {
  return MANIFEST_SEMANTIC_ALIASES[kind] ?? kind;
}

// ---------------------------------------------------------------------------
// Prisma schema parser — narrow: required scalar fields per model
// ---------------------------------------------------------------------------

/**
 * Parse a Prisma schema string and return:
 *   { [ModelName]: { fields: [{name, prismaType, optional, hasDefault, isRelation, isUpdatedAt, isId}], dbName } }
 *
 * We only need enough fidelity to identify "required scalar fields that must
 * be present in a `create` payload."
 */
function parsePrismaSchema(source) {
  const models = {};
  const modelBlockRegex = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
  let match = modelBlockRegex.exec(source);
  while (match !== null) {
    const [, name, body] = match;
    const fields = [];
    let dbName = name;

    const lines = body.split("\n");
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("//")) {
        continue;
      }

      // @@map("table_name") — captures the underlying table
      const mapMatch = line.match(/^@@map\("([^"]+)"\)/);
      if (mapMatch) {
        dbName = mapMatch[1];
        continue;
      }
      // Skip model-level directives we don't need
      if (line.startsWith("@@")) {
        continue;
      }

      // Field line: <name> <type>[?|[]] <attributes...>
      const fieldMatch = line.match(/^(\w+)\s+(\w+)(\??|\[\])?\s*(.*)$/);
      if (!fieldMatch) {
        continue;
      }
      const [, fieldName, typeName, modifier, rest] = fieldMatch;

      const optional = modifier === "?";
      const isArray = modifier === "[]";
      const hasDefault = /@default\s*\(/.test(rest);
      const isUpdatedAt = /@updatedAt\b/.test(rest);
      const isId = /@id\b/.test(rest);

      // Heuristic: a field is a relation if its type is a model name (PascalCase, no @db.) and it has no @map
      // We resolve relations after all models are parsed. For now mark candidates.
      const isPotentialRelation =
        /^[A-Z]/.test(typeName) && !(typeName in PRISMA_TO_MANIFEST);

      fields.push({
        name: fieldName,
        prismaType: typeName,
        optional,
        isArray,
        hasDefault,
        isUpdatedAt,
        isId,
        isPotentialRelation,
        rawLine: line,
      });
    }

    models[name] = { fields, dbName };
    match = modelBlockRegex.exec(source);
  }

  // Second pass: any field whose typeName matches another model name is a relation.
  for (const model of Object.values(models)) {
    for (const field of model.fields) {
      if (field.isPotentialRelation && field.prismaType in models) {
        field.isRelation = true;
      } else {
        field.isRelation = false;
      }
    }
  }

  return models;
}

/**
 * Required scalar fields a `create` payload MUST supply.
 * Excludes: optional, has @default, relations, @id, @updatedAt, arrays.
 */
function requiredCreateFields(model) {
  return model.fields.filter(
    (f) =>
      !(
        f.optional ||
        f.hasDefault ||
        f.isRelation ||
        f.isUpdatedAt ||
        f.isId ||
        f.isArray
      )
  );
}

// ---------------------------------------------------------------------------
// IR projection
// ---------------------------------------------------------------------------

function loadIR() {
  if (!existsSync(PATHS.ir)) {
    console.error(`[schema-drift] IR not found at ${PATHS.ir}.`);
    console.error("[schema-drift] Run `pnpm manifest:compile` first.");
    process.exit(2);
  }
  return JSON.parse(readFileSync(PATHS.ir, "utf-8"));
}

function loadGovernedEntities() {
  if (!existsSync(PATHS.entitiesRegistry)) {
    console.error(
      `[schema-drift] Entities registry not found at ${PATHS.entitiesRegistry}.`
    );
    console.error(
      "[schema-drift] Run `pnpm manifest emit registries --ir <ir>` first."
    );
    process.exit(2);
  }
  const doc = JSON.parse(readFileSync(PATHS.entitiesRegistry, "utf-8"));
  const list = Array.isArray(doc) ? doc : (doc.entities ?? []);
  // The current registry shape doesn't tag classification per entry. Treat any
  // entity that has a `create` command in the IR as governed-by-default
  // (tenant-scoped governed-by-default per constitution §8). The allowlist
  // can downgrade specific entities to infrastructure if needed.
  return new Set(list.map((e) => e.name));
}

function loadAllowlist() {
  if (!existsSync(PATHS.allowlist)) {
    return {
      globalAdapterDerived: {},
      adapterDerived: {},
      nonconforming: {},
      ignoredEntities: [],
      ignoredFields: {},
    };
  }
  return JSON.parse(readFileSync(PATHS.allowlist, "utf-8"));
}

function entityFromIR(ir, entityName) {
  return ir.entities.find((e) => e.name === entityName);
}

function createCommandFromIR(ir, entityName) {
  return ir.commands.find(
    (c) => c.entity === entityName && c.name === "create"
  );
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

function buildEntityProperties(entity) {
  const map = new Map();
  for (const p of entity?.properties ?? []) {
    map.set(p.name, p);
  }
  return map;
}

function buildCommandParams(cmd) {
  const map = new Map();
  for (const p of cmd?.parameters ?? []) {
    map.set(p.name, p);
  }
  return map;
}

/**
 * Property names the create command assigns via `mutate <target> = <expr>`.
 * The runtime applies these to the instance before persistence, so a required
 * Prisma column targeted by a create mutation IS satisfied at create time —
 * even when the value is a call expression (e.g. `now()`) that the IR cannot
 * represent as a literal property default.
 */
function buildCreateMutationTargets(cmd) {
  const set = new Set();
  for (const a of cmd?.actions ?? []) {
    if (a.kind === "mutate" && a.target) {
      set.add(a.target);
    }
  }
  return set;
}

function hasManifestDefault(prop) {
  // The IR represents defaults a few different ways; check the common keys.
  if (!prop) {
    return false;
  }
  if ("default" in prop && prop.default !== undefined) {
    return true;
  }
  if ("defaultValue" in prop && prop.defaultValue !== undefined) {
    return true;
  }
  return false;
}

function checkEntity({ modelName, model, ir, governedSet, allowlist }) {
  const entityName = modelName; // assume Prisma model name == manifest entity name
  const irEntity = entityFromIR(ir, entityName);
  const createCmd = createCommandFromIR(ir, entityName);

  // If there's no create command in the IR, the entity isn't governed at the
  // create surface — skip. The constitution allows non-create-bearing entities.
  if (!createCmd) {
    return { skipped: true, reason: "no_create_command", entityName };
  }
  if (!governedSet.has(entityName)) {
    return { skipped: true, reason: "not_in_registry", entityName };
  }
  if (allowlist.ignoredEntities?.includes(entityName)) {
    return { skipped: true, reason: "ignored_by_allowlist", entityName };
  }

  const props = buildEntityProperties(irEntity);
  const params = buildCommandParams(createCmd);
  const createMutations = buildCreateMutationTargets(createCmd);
  const ignoredFields = new Set(allowlist.ignoredFields?.[entityName] ?? []);
  const globalDerived = allowlist.globalAdapterDerived ?? {};
  const adapterDerived = {
    ...globalDerived,
    ...(allowlist.adapterDerived?.[entityName] ?? {}),
  };
  const nonconforming = allowlist.nonconforming?.[entityName] ?? {};

  const required = requiredCreateFields(model);
  const violations = [];
  const allowed = [];

  for (const field of required) {
    if (ignoredFields.has(field.name)) {
      continue;
    }

    const expectedKind = manifestKindFor(field.prismaType);
    // Also check camelCase variant: Prisma uses snake_case column names
    // (e.g. first_name) while manifest uses camelCase (firstName).
    const camelName = field.name.replace(/_([a-z])/g, (_, c) =>
      c.toUpperCase()
    );
    const irParam = params.get(field.name) || params.get(camelName);
    const irProp = props.get(field.name) || props.get(camelName);
    const declaredAsParam = !!irParam;
    const declaredAsPropWithDefault = !!irProp && hasManifestDefault(irProp);
    const mutatedByCreate =
      createMutations.has(field.name) || createMutations.has(camelName);

    let actualKind = null;
    if (irParam) {
      actualKind = irParam.type?.name ?? null;
    } else if (irProp) {
      actualKind = irProp.type?.name ?? null;
    }

    // Normalize semantic manifest types (datetime, money, int, decimal)
    // to their base types so they compare correctly against Prisma mappings.
    const normalizedActual = normalizeManifestType(actualKind ?? "");
    const typeMismatch =
      actualKind &&
      expectedKind !== "unknown" &&
      normalizedActual !== expectedKind;

    const declared =
      declaredAsParam || declaredAsPropWithDefault || mutatedByCreate;
    const derivedRule = adapterDerived[field.name];
    const bypassEntry = nonconforming[field.name];

    // Resolution order (per constitution §14 and the "How to resolve" guidance):
    // 1. declared in manifest with matching kind          → allowed (create_param/property_default)
    // 2. declared but wrong kind, with adapter-derived    → allowed (adapter_derived, overrides type_mismatch)
    // 3. declared but wrong kind, with nonconforming      → allowed (nonconforming_bypass, overrides type_mismatch)
    // 4. declared but wrong kind, no allowlist            → violation (type_mismatch)
    // 5. not declared, with adapter-derived               → allowed (adapter_derived)
    // 6. not declared, with nonconforming                 → allowed (nonconforming_bypass)
    // 7. not declared, no allowlist                       → violation (missing)
    // The allowlist must be consulted BEFORE pushing a type_mismatch violation;
    // otherwise the allowlist is unreachable for type_mismatch cases and the
    // documented "Either align the manifest type … or add an adapter-derived rule"
    // resolution path becomes a no-op.

    if (declared && !typeMismatch) {
      allowed.push({
        field: field.name,
        prismaType: field.prismaType,
        coverage: declaredAsParam
          ? "create_param"
          : declaredAsPropWithDefault
            ? "property_default"
            : "create_mutation",
        manifestKind: actualKind,
      });
      continue;
    }

    if (derivedRule) {
      allowed.push({
        field: field.name,
        prismaType: field.prismaType,
        coverage: "adapter_derived",
        rule: derivedRule,
        ...(typeMismatch
          ? {
              overriddenViolation: "type_mismatch",
              manifestKind: actualKind,
              expectedManifestKind: expectedKind,
            }
          : {}),
      });
      continue;
    }

    if (bypassEntry) {
      allowed.push({
        field: field.name,
        prismaType: field.prismaType,
        coverage: "nonconforming_bypass",
        bypass: bypassEntry,
        ...(typeMismatch
          ? {
              overriddenViolation: "type_mismatch",
              manifestKind: actualKind,
              expectedManifestKind: expectedKind,
            }
          : {}),
      });
      continue;
    }

    if (typeMismatch) {
      violations.push({
        severity: "type_mismatch",
        field: field.name,
        prismaType: field.prismaType,
        expectedManifestKind: expectedKind,
        actualManifestKind: actualKind,
        source: declaredAsParam ? "create_param" : "property",
        recommendation: `Manifest declares ${field.name} as ${actualKind}; Prisma requires ${field.prismaType} (${expectedKind}). Align the manifest type, change Prisma, or add an adapter-derived rule.`,
      });
      continue;
    }

    violations.push({
      severity: "missing",
      field: field.name,
      prismaType: field.prismaType,
      expectedManifestKind: expectedKind,
      recommendation: `Add \`${field.name}\` as a parameter to the manifest \`create\` command for ${entityName} (or as a property with a default), or document an adapter-derived rule in manifest/governance/schema-drift-allowlist.json under adapterDerived.${entityName}.${field.name}.`,
    });
  }

  return {
    entityName,
    skipped: false,
    violations,
    allowed,
    requiredFieldCount: required.length,
  };
}

// ---------------------------------------------------------------------------
// IR → Prisma parity (the other direction)
//
// The create-coverage check above asks "can every required Prisma column be
// satisfied?" (Prisma → IR). This section asks the inverse: "does every IR
// entity property actually exist on the live model, with a storable type?"
// (IR → Prisma). This is the direction every recent incident lived in:
//   - phantom_property: IR property with no Prisma column → governed commands
//     that mutate it are silent persistence NO-OPs (RecipeVersion.status).
//   - column_type_mismatch: IR type group vs Prisma type group disagree →
//     writes fail or corrupt at the store boundary (EventStaff.shiftStart
//     declared datetime while the live column was Int).
// Computed properties are excluded (never persisted).
// ---------------------------------------------------------------------------

// Coarse type groups. The fine-grained PRISMA_TO_MANIFEST table above folds
// datetime/money/int/decimal all into "number", which is exactly why
// datetime-vs-Int drift was previously invisible. Groups keep them distinct.
function prismaTypeGroup(field, knownModels) {
  if (field.isRelation) {
    return "relation";
  }
  switch (field.prismaType) {
    case "DateTime":
      return "temporal";
    case "Int":
    case "BigInt":
      return "integer";
    case "Decimal":
    case "Float":
      return "decimal";
    case "Boolean":
      return "boolean";
    case "Json":
      return "json";
    case "String":
    case "Bytes":
      return "string";
    default:
      // PascalCase non-model type = Prisma enum → string-valued.
      return knownModels && field.prismaType in knownModels
        ? "relation"
        : "string";
  }
}

/** IR type name → set of acceptable Prisma type groups. */
const IR_TYPE_ACCEPTS = {
  datetime: new Set(["temporal"]),
  int: new Set(["integer"]),
  money: new Set(["decimal"]),
  decimal: new Set(["decimal"]),
  float: new Set(["decimal"]),
  number: new Set(["integer", "decimal"]), // legacy ambiguous numeric
  boolean: new Set(["boolean"]),
  // Json-as-serialized-string is an established repo pattern, so string
  // accepts json. date/time project to DateTime columns (@db.Date/@db.Time).
  // Native `json` DSL type (3.1.x wave): projects to a Prisma Json column;
  // string accepted for the D27-deferred fields still stored as text.
  json: new Set(["json", "string"]),
  string: new Set(["string", "json"]),
  text: new Set(["string", "json"]),
  email: new Set(["string"]),
  url: new Set(["string"]),
  uuid: new Set(["string"]),
  date: new Set(["temporal", "string"]),
  time: new Set(["temporal", "string"]),
  array: new Set(["array", "json"]),
  object: new Set(["json", "string"]),
};

function loadModelMetadata() {
  if (!existsSync(PATHS.modelMetadata)) {
    console.error(
      `[schema-drift] Model metadata not found: ${PATHS.modelMetadata}`
    );
    console.error(
      "[schema-drift] Run `pnpm manifest:generate-metadata` first."
    );
    process.exit(2);
  }
  return JSON.parse(readFileSync(PATHS.modelMetadata, "utf-8"));
}

function checkIrParity({ irEntity, metaEntry, prismaModels, allowlist }) {
  const entityName = irEntity.name;
  if (allowlist.ignoredEntities?.includes(entityName)) {
    return { skipped: true, reason: "ignored_by_allowlist", entityName };
  }
  // Resolve the Prisma model block for type info: accessor is camelCase of
  // the model name (first char lowered by the metadata generator), so
  // re-capitalizing recovers it.
  const modelName =
    metaEntry.accessor[0].toUpperCase() + metaEntry.accessor.slice(1);
  const model = prismaModels[modelName];
  if (!model) {
    return { skipped: true, reason: "model_block_not_found", entityName };
  }

  const fieldByIrName = new Map();
  for (const f of metaEntry.fields) {
    fieldByIrName.set(f.irName, f);
    fieldByIrName.set(f.name, f);
  }
  const prismaFieldByName = new Map(model.fields.map((f) => [f.name, f]));

  const ignoredFields = new Set(allowlist.ignoredFields?.[entityName] ?? []);
  const phantomAllow = allowlist.phantomProperties?.[entityName] ?? {};
  const typeAllow = allowlist.typeExceptions?.[entityName] ?? {};

  const violations = [];
  const allowed = [];

  for (const prop of irEntity.properties ?? []) {
    if (ignoredFields.has(prop.name)) {
      continue;
    }

    const metaField = fieldByIrName.get(prop.name);
    if (!metaField) {
      if (phantomAllow[prop.name]) {
        allowed.push({
          field: prop.name,
          coverage: "phantom_allowlisted",
          bypass: phantomAllow[prop.name],
        });
        continue;
      }
      violations.push({
        severity: "phantom_property",
        field: prop.name,
        manifestKind: prop.type?.name ?? "unknown",
        recommendation: `IR property ${entityName}.${prop.name} has no column on Prisma model ${modelName} — commands that mutate it are silent persistence no-ops. Add the column (migration via pnpm db:dev), remove/rename the property in .manifest source, or document it under phantomProperties.${entityName}.${prop.name} in the allowlist.`,
      });
      continue;
    }

    const prismaField = prismaFieldByName.get(metaField.name);
    if (!prismaField) {
      continue; // metadata/schema parse disagreement — generator owns this
    }

    const irType = prop.type?.name ?? "unknown";
    const accepts =
      IR_TYPE_ACCEPTS[irType] ??
      (irType === "array" ? IR_TYPE_ACCEPTS.array : null);
    const group = prismaField.isArray
      ? "array"
      : prismaTypeGroup(prismaField, prismaModels);

    if (accepts && !accepts.has(group)) {
      if (typeAllow[prop.name]) {
        allowed.push({
          field: prop.name,
          coverage: "type_exception",
          bypass: typeAllow[prop.name],
        });
        continue;
      }
      violations.push({
        severity: "column_type_mismatch",
        field: prop.name,
        prismaType: prismaField.prismaType + (prismaField.isArray ? "[]" : ""),
        expectedManifestKind: group,
        actualManifestKind: irType,
        source: "property",
        recommendation: `${entityName}.${prop.name} is \`${irType}\` in the IR but column \`${metaField.name}\` on ${modelName} is \`${prismaField.prismaType}\` (${group}). Align the .manifest type or migrate the column; or document a typeExceptions.${entityName}.${prop.name} allowlist entry.`,
      });
    }
  }

  return {
    entityName,
    check: "ir_parity",
    skipped: false,
    violations,
    allowed,
    requiredFieldCount: (irEntity.properties ?? []).length,
  };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function renderMarkdown(summary, results) {
  const lines = [];
  lines.push("# Manifest ↔ Prisma schema-drift audit");
  lines.push("");
  lines.push(`Strict mode: \`${summary.strict}\``);
  lines.push(`Entities scanned: ${summary.scanned}`);
  lines.push(`Entities skipped: ${summary.skipped}`);
  lines.push(`Entities clean: ${summary.clean}`);
  lines.push(`Entities with violations: ${summary.withViolations}`);
  lines.push(`Total violations: ${summary.totalViolations}`);
  lines.push("");

  const offenders = results.filter(
    (r) => !r.skipped && r.violations.length > 0
  );
  if (offenders.length === 0) {
    lines.push("✅ No drift detected against the allowlist.");
    return lines.join("\n");
  }

  lines.push("## Violations");
  for (const r of offenders) {
    lines.push("");
    lines.push(`### ${r.entityName}`);
    for (const v of r.violations) {
      lines.push(
        `- **${v.severity}** \`${v.field}\` (Prisma: \`${v.prismaType}\`)`
      );
      lines.push(`    - ${v.recommendation}`);
      if (v.actualManifestKind) {
        lines.push(
          `    - Manifest currently: \`${v.actualManifestKind}\` (from \`${v.source}\`)`
        );
      }
    }
  }

  lines.push("");
  lines.push("## How to resolve");
  lines.push("");
  lines.push("Per constitution §14, the resolution order is:");
  lines.push("");
  lines.push(
    "1. **Add to manifest** — update the entity's `.manifest` source: add the field as a `command create` parameter or as a `property` with a default, then run `pnpm manifest:compile`."
  );
  lines.push(
    '2. **Adapter-derived rule** — if the field is intentionally infrastructural (e.g. looked up from a parent entity), add an entry to `manifest/governance/schema-drift-allowlist.json` under `adapterDerived.<Entity>.<field>` with `{ "rule": "...", "owner": "...", "reviewBy": "YYYY-MM-DD" }`.'
  );
  lines.push(
    '3. **Documented bypass** — if neither path is currently viable, add an entry under `nonconforming.<Entity>.<field>` with `{ "reason": "...", "owner": "...", "removalPlan": "...", "reviewBy": "YYYY-MM-DD" }`. The bypass is technical debt with a name attached, not permission.'
  );
  lines.push("");
  lines.push(
    "Per §14, do not change Prisma first to make the violation go away."
  );
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  if (!existsSync(PATHS.prismaSchema)) {
    console.error(
      `[schema-drift] Prisma schema not found: ${PATHS.prismaSchema}`
    );
    process.exit(2);
  }
  const prismaSource = readFileSync(PATHS.prismaSchema, "utf-8");
  const prismaModels = parsePrismaSchema(prismaSource);
  const ir = loadIR();
  const governedSet = loadGovernedEntities();
  const allowlist = loadAllowlist();

  const results = [];
  for (const [modelName, model] of Object.entries(prismaModels)) {
    const result = checkEntity({
      modelName,
      model,
      ir,
      governedSet,
      allowlist,
    });
    results.push(result);
  }

  // IR → Prisma parity pass (phantom properties + column type mismatches).
  const modelMetadata = loadModelMetadata();
  for (const irEntity of ir.entities ?? []) {
    const metaEntry = modelMetadata[irEntity.name];
    if (!metaEntry) {
      results.push({
        entityName: irEntity.name,
        check: "ir_parity",
        skipped: true,
        reason: "no_model_metadata",
      });
      continue;
    }
    results.push(
      checkIrParity({ irEntity, metaEntry, prismaModels, allowlist })
    );
  }

  const scanned = results.filter((r) => !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  const offenders = results.filter(
    (r) => !r.skipped && r.violations.length > 0
  );
  const clean = scanned - offenders.length;
  const totalViolations = offenders.reduce(
    (sum, r) => sum + r.violations.length,
    0
  );

  const summary = {
    strict: STRICT,
    scanned,
    skipped,
    clean,
    withViolations: offenders.length,
    totalViolations,
    generatedAt: new Date().toISOString(),
  };

  mkdirSync(PATHS.outDir, { recursive: true });
  writeFileSync(
    path.join(PATHS.outDir, "schema-drift.json"),
    JSON.stringify({ summary, results }, null, 2)
  );
  writeFileSync(
    path.join(PATHS.outDir, "schema-drift.md"),
    renderMarkdown(summary, results)
  );

  console.log(
    `[schema-drift] Scanned ${scanned} governed entities; ${offenders.length} with violations (${totalViolations} total).`
  );
  console.log(
    "[schema-drift] Wrote manifest/reports/schema-drift/schema-drift.{json,md}"
  );

  // Baseline discipline (same pattern as audit-direct-writes:baseline): the
  // committed baseline is the known pre-existing debt inventory. Strict mode
  // fails ONLY on violations not in the baseline, so the gate protects against
  // NEW drift immediately while the 2026-06-12 backlog is burned down.
  const baselinePath = path.join(
    ROOT,
    "manifest/governance/schema-drift-baseline.json"
  );
  const violationKeys = offenders
    .flatMap((r) =>
      r.violations.map((v) => `${r.entityName}.${v.field}:${v.severity}`)
    )
    .sort();

  if (process.argv.includes("--update-baseline")) {
    writeFileSync(
      baselinePath,
      `${JSON.stringify(
        {
          _doc: "Pre-existing schema-drift debt (see manifest/reports/schema-drift/). Entries may ONLY be removed (by fixing the drift) — additions require fixing the new drift instead. Generated via pnpm manifest:audit-schema-drift --update-baseline.",
          generatedAt: new Date().toISOString(),
          violations: violationKeys,
        },
        null,
        2
      )}\n`
    );
    console.log(
      `[schema-drift] Baseline updated: ${violationKeys.length} entries.`
    );
    return;
  }

  if (STRICT) {
    const baseline = existsSync(baselinePath)
      ? new Set(JSON.parse(readFileSync(baselinePath, "utf-8")).violations)
      : new Set();
    const fresh = violationKeys.filter((k) => !baseline.has(k));
    const healed = [...baseline].filter((k) => !violationKeys.includes(k));
    if (healed.length > 0) {
      console.log(
        `[schema-drift] ${healed.length} baseline entries are healed — shrink the baseline via --update-baseline.`
      );
    }
    if (fresh.length > 0) {
      console.error(
        `[schema-drift] STRICT: ${fresh.length} NEW violation(s) not in baseline:`
      );
      for (const k of fresh.slice(0, 50)) {
        console.error(`  - ${k}`);
      }
      process.exit(1);
    }
    console.log(
      `[schema-drift] STRICT: no new violations (${violationKeys.length} known in baseline).`
    );
  }
}

main();
