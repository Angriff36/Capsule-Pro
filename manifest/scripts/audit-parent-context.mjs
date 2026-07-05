#!/usr/bin/env node

/**
 * Parent-Context Propagation Audit
 *
 * Backpressure for the parent-context-propagation invariant (see
 * specs/parent-context-propagation.md): a child entity created from a parent
 * must INHERIT parent-owned context, not force the user to re-enter it.
 *
 * This script fails when a child entity's `create` command REQUIRES, as user
 * input, a field that is inferable from its `belongsTo` parent — i.e. a required
 * create parameter whose name + scalar type match a property the parent already
 * owns. Such a field should be populated by parent-context propagation
 * (manifest/runtime/src/parent-context-resolver.ts), not demanded from the UI/API.
 *
 * Generic, common-to-many fields (name/title/notes/description/tags/status/...) are
 * excluded by default because they are legitimately child-specific. Genuine
 * exceptions are documented in manifest/governance/parent-context-overrides.json.
 *
 * Outputs: manifest/reports/parent-context/parent-context.{json,md}
 *
 * Usage:
 *   pnpm manifest:audit-parent-context          # report only
 *   pnpm manifest:audit-parent-context:strict   # exit 1 on unallowlisted violations
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const IR_PATH = join(REPO_ROOT, "manifest", "ir", "kitchen.ir.json");
const ALLOWLIST_PATH = join(
  REPO_ROOT,
  "manifest",
  "governance",
  "parent-context-overrides.json"
);
const REPORT_DIR = join(REPO_ROOT, "manifest", "reports", "parent-context");

/**
 * Fields excluded from "inferable parent-owned" detection: identity, tenant,
 * lifecycle/audit, and generic per-child fields that legitimately differ from
 * the parent (a board's own name/notes/tags are not the event's).
 */
export const EXCLUDED_FIELDS = new Set([
  "id",
  "tenantId",
  "status",
  "createdAt",
  "updatedAt",
  "deletedAt",
  "name",
  "title",
  "notes",
  "description",
  "tags",
  "type",
  "version",
]);

function scalarTypeName(type) {
  const name = type?.name;
  if (!name || name === "array" || name === "list") {
    return null;
  }
  // Compiler 3.2+ types id-shaped entity properties as `uuid` while command
  // parameters stay `string`; treat them as the same scalar or every id-like
  // violation silently disappears (allowlist entries then read as "dead").
  return name === "uuid" ? "string" : name;
}

/**
 * Pure scanner. Returns an array of violation objects:
 *   { child, parent, field, fkField, reason }
 *
 * @param {object} ir         compiled Manifest IR (kitchen.ir.json)
 * @param {object} allowlist  { "<Entity>": { fields: string[], reason, owner } }
 */
export function scanParentContextViolations(ir, allowlist = {}) {
  const entitiesByName = new Map((ir.entities ?? []).map((e) => [e.name, e]));
  const commands = ir.commands ?? [];
  const violations = [];

  for (const child of ir.entities ?? []) {
    const belongsTo = (child.relationships ?? []).filter(
      (r) => r.kind === "belongsTo" || r.kind === "ref"
    );
    if (belongsTo.length === 0) {
      continue;
    }

    const createCmd = commands.find(
      (c) => c.entity === child.name && c.name === "create"
    );
    if (!createCmd) {
      continue;
    }

    const childProps = new Map(
      (child.properties ?? []).map((p) => [p.name, scalarTypeName(p.type)])
    );
    const allowedFields = new Set(allowlist[child.name]?.fields ?? []);

    for (const rel of belongsTo) {
      const parent = entitiesByName.get(rel.target);
      if (!parent) {
        continue;
      }
      const parentProps = new Map(
        (parent.properties ?? []).map((p) => [p.name, scalarTypeName(p.type)])
      );
      const fkFields = new Set(rel.foreignKey?.fields ?? []);
      const localFk = [...fkFields].find((f) => f !== "tenantId");

      for (const param of createCmd.parameters ?? []) {
        if (!param.required) {
          continue;
        }
        const name = param.name;
        if (EXCLUDED_FIELDS.has(name)) {
          continue;
        }
        if (fkFields.has(name)) {
          continue; // the linkage FK is expected input
        }
        if (allowedFields.has(name)) {
          continue;
        }

        const paramType = scalarTypeName(param.type);
        if (!paramType) {
          continue;
        }
        if (!parentProps.has(name)) {
          continue; // parent must own it
        }
        if (parentProps.get(name) !== paramType) {
          continue; // type-compatible only
        }
        if (!childProps.has(name)) {
          continue; // child must actually store it
        }

        violations.push({
          child: child.name,
          parent: parent.name,
          field: name,
          fkField: localFk ?? null,
          reason:
            "required create parameter duplicates a field inferable from the belongsTo parent; populate it via parent-context propagation or document an override in parent-context-overrides.json",
        });
      }
    }
  }

  return violations;
}

function loadJson(path, fallback) {
  if (!existsSync(path)) {
    return fallback;
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function main() {
  const strict = process.argv.includes("--strict");
  const ir = loadJson(IR_PATH, null);
  if (!ir) {
    console.error(
      `[audit-parent-context] IR not found at ${IR_PATH}. Run pnpm manifest:compile.`
    );
    process.exit(2);
  }
  const allowlist = loadJson(ALLOWLIST_PATH, {}).overrides ?? {};

  const violations = scanParentContextViolations(ir, allowlist);

  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(
    join(REPORT_DIR, "parent-context.json"),
    `${JSON.stringify({ generatedFromIR: true, count: violations.length, violations }, null, 2)}\n`
  );
  const md = [
    "# Parent-Context Propagation Audit",
    "",
    `Violations: **${violations.length}**`,
    "",
    ...(violations.length
      ? [
          "| Child | Parent | Required field | FK |",
          "|---|---|---|---|",
          ...violations.map(
            (v) =>
              `| ${v.child} | ${v.parent} | ${v.field} | ${v.fkField ?? ""} |`
          ),
        ]
      : ["No child `create` command requires a parent-inferable field. ✅"]),
    "",
  ].join("\n");
  writeFileSync(join(REPORT_DIR, "parent-context.md"), md);

  if (violations.length === 0) {
    console.log("[audit-parent-context] 0 violations. ✅");
    return;
  }

  console.log(`[audit-parent-context] ${violations.length} violation(s):`);
  for (const v of violations) {
    console.log(
      `  - ${v.child}.create requires "${v.field}" inferable from ${v.parent} (fk: ${v.fkField})`
    );
  }
  if (strict) {
    process.exit(1);
  }
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  main();
}
