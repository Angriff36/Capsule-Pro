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
 *   2. Adapter-derived? In `scripts/manifest/schema-drift-allowlist.json` under
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
  prismaSchema: path.join(ROOT, "packages/database/prisma/schema.prisma"),
  ir: path.join(ROOT, "packages/manifest-ir/ir/kitchen/kitchen.ir.json"),
  entitiesRegistry: path.join(ROOT, "manifest/governance/entities.json"),
  // Allowlist is policy and lives under scripts/manifest/ (tracked in git),
  // matching the convention used by write-route-infra-allowlist.json and
  // duplicate-drop-allowlist.json. Outputs go to manifest/reports/schema-drift/
  // (gitignored — see docs/audits/manifest-artifact-layout-adr.md).
  allowlist: path.join(ROOT, "scripts/manifest/schema-drift-allowlist.json"),
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

function manifestKindFor(prismaType) {
  return PRISMA_TO_MANIFEST[prismaType] ?? "unknown";
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
      if (!line || line.startsWith("//")) continue;

      // @@map("table_name") — captures the underlying table
      const mapMatch = line.match(/^@@map\("([^"]+)"\)/);
      if (mapMatch) {
        dbName = mapMatch[1];
        continue;
      }
      // Skip model-level directives we don't need
      if (line.startsWith("@@")) continue;

      // Field line: <name> <type>[?|[]] <attributes...>
      const fieldMatch = line.match(/^(\w+)\s+(\w+)(\??|\[\])?\s*(.*)$/);
      if (!fieldMatch) continue;
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
      !f.optional &&
      !f.hasDefault &&
      !f.isRelation &&
      !f.isUpdatedAt &&
      !f.isId &&
      !f.isArray
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

function hasManifestDefault(prop) {
  // The IR represents defaults a few different ways; check the common keys.
  if (!prop) return false;
  if ("default" in prop && prop.default !== undefined) return true;
  if ("defaultValue" in prop && prop.defaultValue !== undefined) return true;
  return false;
}

function checkEntity({
  modelName,
  model,
  ir,
  governedSet,
  allowlist,
}) {
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
    if (ignoredFields.has(field.name)) continue;

    const expectedKind = manifestKindFor(field.prismaType);
    const irParam = params.get(field.name);
    const irProp = props.get(field.name);
    const declaredAsParam = !!irParam;
    const declaredAsPropWithDefault =
      !!irProp && hasManifestDefault(irProp);

    let actualKind = null;
    if (irParam) actualKind = irParam.type?.name ?? null;
    else if (irProp) actualKind = irProp.type?.name ?? null;

    const typeMismatch =
      actualKind && expectedKind !== "unknown" && actualKind !== expectedKind;

    const declared = declaredAsParam || declaredAsPropWithDefault;
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
        coverage: declaredAsParam ? "create_param" : "property_default",
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
      recommendation: `Add \`${field.name}\` as a parameter to the manifest \`create\` command for ${entityName} (or as a property with a default), or document an adapter-derived rule in scripts/manifest/schema-drift-allowlist.json under adapterDerived.${entityName}.${field.name}.`,
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
      lines.push(`- **${v.severity}** \`${v.field}\` (Prisma: \`${v.prismaType}\`)`);
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
  lines.push("1. **Add to manifest** — update the entity's `.manifest` source: add the field as a `command create` parameter or as a `property` with a default, then run `pnpm manifest:compile`.");
  lines.push("2. **Adapter-derived rule** — if the field is intentionally infrastructural (e.g. looked up from a parent entity), add an entry to `scripts/manifest/schema-drift-allowlist.json` under `adapterDerived.<Entity>.<field>` with `{ \"rule\": \"...\", \"owner\": \"...\", \"reviewBy\": \"YYYY-MM-DD\" }`.");
  lines.push("3. **Documented bypass** — if neither path is currently viable, add an entry under `nonconforming.<Entity>.<field>` with `{ \"reason\": \"...\", \"owner\": \"...\", \"removalPlan\": \"...\", \"reviewBy\": \"YYYY-MM-DD\" }`. The bypass is technical debt with a name attached, not permission.");
  lines.push("");
  lines.push("Per §14, do not change Prisma first to make the violation go away.");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  if (!existsSync(PATHS.prismaSchema)) {
    console.error(`[schema-drift] Prisma schema not found: ${PATHS.prismaSchema}`);
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

  if (STRICT && totalViolations > 0) {
    console.error("[schema-drift] STRICT: failing on unallowlisted violations.");
    process.exit(1);
  }
}

main();
