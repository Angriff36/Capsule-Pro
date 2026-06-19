#!/usr/bin/env node
/**
 * generate-field-hints — derives per-field rule descriptions from the compiled
 * Manifest IR and emits a static TypeScript artifact consumed by the form
 * `FieldHint` / `FormLabelWithHint` UI components.
 *
 * Why a build-time artifact (not a runtime fetch): constraint/policy messages
 * are public rule descriptions, not per-user data. Reading the 7.5MB IR
 * monolith at request time would be wasteful and would force every form to
 * depend on a server fetch + auth. Instead, this script walks the IR once,
 * extracts the human-readable messages, and emits a small typed snapshot that
 * client components import directly. Mirrors the `manifest-client.generated.ts`
 * / `manifest-hooks.generated.ts` generated-artifact pattern (constitution §10).
 *
 * Mapping rule: a constraint applies to a field when its `expression` AST (and,
 * for templated messages, its `detailsMapping` values) references that field
 * via a `self.<property>` member node. Each constraint carries a `message`
 * (static) or `messageTemplate` (with `{placeholder}` tokens resolved against
 * `detailsMapping`). Templated placeholders are humanized for tooltip display
 * (e.g. `{budgetName}` → "budget name") since the live values are not known
 * until runtime.
 *
 * Usage:
 *   node manifest/scripts/generate-field-hints.mjs [--outdir <path>] [--check]
 *     --outdir  output file directory (default: apps/app/app/lib)
 *     --check   exit 1 if the generated output differs from the committed file
 *               (CI drift gate; mirrors manifest:schema:check)
 *
 * Output: apps/app/app/lib/manifest-field-hints.generated.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(".");
const IR_PATH = resolve(REPO_ROOT, "manifest/ir/kitchen.ir.json");

const args = process.argv.slice(2);
let outDir = resolve(REPO_ROOT, "apps/app/app/lib");
let checkMode = false;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--outdir" && args[i + 1]) {
    outDir = resolve(REPO_ROOT, args[i + 1]);
    i += 1;
  } else if (args[i] === "--check") {
    checkMode = true;
  }
}
const OUT_PATH = resolve(outDir, "manifest-field-hints.generated.ts");

if (!existsSync(IR_PATH)) {
  console.error(
    `IR not found at ${IR_PATH}. Run \`pnpm manifest:compile\` first.`
  );
  process.exit(1);
}

/** @typedef {{ kind: string; [k: string]: unknown }} AstNode */

/**
 * Recursively collect property names referenced via `self.<property>` member
 * nodes anywhere in a constraint expression AST.
 * @param {AstNode | AstNode[] | null | undefined} node
 * @param {Set<string>} acc
 */
function collectSelfProperties(node, acc) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const child of node) collectSelfProperties(child, acc);
    return;
  }
  if (node.kind === "member") {
    const object = /** @type {AstNode} */ (node.object);
    if (object && object.kind === "identifier" && object.name === "self") {
      const prop = node.property;
      if (typeof prop === "string" && prop.length > 0) acc.add(prop);
    }
  }
  for (const value of Object.values(node)) {
    if (value && typeof value === "object") collectSelfProperties(value, acc);
  }
}

/**
 * Split a camelCase identifier into lower-cased words.
 * `positiveGuestCount` -> "guest count"; `eventId` -> "event id".
 * @param {string} name
 * @returns {string}
 */
function humanize(name) {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Render a `messageTemplate` for static tooltip display. `{placeholder}` tokens
 * are replaced with a humanized form: the property name from
 * `detailsMapping[placeholder]` (when it is a `self.<prop>` member), otherwise
 * the humanized placeholder key. Live values are not known until runtime, so
 * this keeps the tooltip descriptive without inventing data.
 * @param {string} template
 * @param {Record<string, AstNode> | undefined} detailsMapping
 * @returns {string}
 */
function renderTemplate(template, detailsMapping) {
  if (!template) return "";
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const detail = detailsMapping?.[key];
    if (
      detail &&
      detail.kind === "member" &&
      detail.object?.kind === "identifier" &&
      detail.object?.name === "self" &&
      typeof detail.property === "string"
    ) {
      return humanize(detail.property);
    }
    return humanize(key);
  });
}

/**
 * Resolve the display message for a constraint, preferring the static
 * `message` and falling back to the rendered `messageTemplate`.
 * @param {{ message?: string; messageTemplate?: string; detailsMapping?: Record<string, AstNode> }} constraint
 * @returns {string}
 */
function resolveMessage(constraint) {
  const message = (constraint.message || "").trim();
  if (message) return message;
  if (constraint.messageTemplate) {
    return renderTemplate(constraint.messageTemplate, constraint.detailsMapping);
  }
  return "";
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
function normalizeSeverity(raw) {
  return raw === "block" || raw === "warn" || raw === "info" ? raw : "info";
}

/**
 * @param {string} text
 * @returns {string}
 */
function escapeForTsString(text) {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const ir = JSON.parse(readFileSync(IR_PATH, "utf8"));

/**
 * @typedef {{
 *   message: string;
 *   severity: "block" | "warn" | "info";
 *   constraintName: string;
 *   overrideable: boolean;
 * }} FieldHint
 */

/** @type {Map<string, Map<string, FieldHint[]>>} */
const entityFieldHints = new Map();

/**
 * @param {string} entityName
 * @param {string} constraintName
 * @param {unknown} severity
 * @param {boolean | undefined} overrideable
 * @param {string} message
 * @param {Set<string>} properties
 */
function recordHint(
  entityName,
  constraintName,
  severity,
  overrideable,
  message,
  properties
) {
  if (!message || properties.size === 0) return;
  const hint = {
    message,
    severity: normalizeSeverity(severity),
    constraintName,
    overrideable: Boolean(overrideable),
  };
  let propMap = entityFieldHints.get(entityName);
  if (!propMap) {
    propMap = new Map();
    entityFieldHints.set(entityName, propMap);
  }
  for (const prop of properties) {
    const list = propMap.get(prop) ?? [];
    // De-duplicate identical (constraintName, message) pairs.
    if (!list.some((h) => h.constraintName === constraintName && h.message === message)) {
      list.push(hint);
    }
    propMap.set(prop, list);
  }
}

// 1. Entity-level constraints.
for (const entity of ir.entities ?? []) {
  const entityName = /** @type {string} */ (entity.name);
  for (const constraint of entity.constraints ?? []) {
    const props = new Set();
    collectSelfProperties(constraint.expression, props);
    recordHint(
      entityName,
      constraint.name,
      constraint.severity,
      constraint.overrideable,
      resolveMessage(constraint),
      props
    );
  }
}

// 2. Command-level constraints. These also reference `self.<property>` (entity
//    props), so they attach to the same entity's field hints. Tagged with the
//    command name to disambiguate, but still scoped to the property.
for (const command of ir.commands ?? []) {
  const entityName = /** @type {string} */ (command.entity);
  for (const constraint of command.constraints ?? []) {
    const props = new Set();
    collectSelfProperties(constraint.expression, props);
    if (props.size === 0) continue; // command-only guards with no self.<prop> skip
    recordHint(
      entityName,
      constraint.name,
      constraint.severity,
      constraint.overrideable,
      resolveMessage(constraint),
      props
    );
  }
}

// Build the TS literal. Sort entities + properties for deterministic output.
const sortedEntities = [...entityFieldHints.entries()].sort(([a], [b]) =>
  a.localeCompare(b)
);

/** @type {string[]} */
const lines = [];
lines.push("// Generated from Manifest IR by manifest/scripts/generate-field-hints.mjs - DO NOT EDIT.");
lines.push("// Regenerate with: pnpm manifest:field-hints");
lines.push("//");
lines.push("// Per-field Manifest rule descriptions, derived from compiled IR constraint");
lines.push("// expressions (entity + command constraints). Keyed by entity -> property ->");
lines.push("// hints. Used by FieldHint / FormLabelWithHint to surface policy text on");
lines.push("// governed form fields.");
lines.push("");
lines.push("export interface ManifestFieldHint {");
lines.push("  message: string;");
lines.push("  severity: \"block\" | \"warn\" | \"info\";");
lines.push("  constraintName: string;");
lines.push("  overrideable: boolean;");
lines.push("}");
lines.push("");
lines.push("export type ManifestFieldHintSeverity = ManifestFieldHint[\"severity\"];");
lines.push("");
lines.push("export type EntityFieldHints = Record<string, ManifestFieldHint[]>;");
lines.push("");
lines.push("export const MANIFEST_FIELD_HINTS: Record<string, EntityFieldHints> = {");

for (const [entityName, propMap] of sortedEntities) {
  const sortedProps = [...propMap.entries()].sort(([a], [b]) => a.localeCompare(b));
  if (sortedProps.length === 0) continue;
  lines.push(`  ${JSON.stringify(entityName)}: {`);
  for (const [prop, hints] of sortedProps) {
    // Block + warn only for tooltip display; info-level is too noisy. Block first
    // (these are the blocking rules users most need to see), then warn.
    const ordered = [...hints].sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === "block" ? -1 : 1;
      }
      return a.constraintName.localeCompare(b.constraintName);
    });
    lines.push(`    ${JSON.stringify(prop)}: [`);
    for (const h of ordered) {
      lines.push("      {");
      lines.push(`        message: "${escapeForTsString(h.message)}",`);
      lines.push(`        severity: "${h.severity}",`);
      lines.push(`        constraintName: "${escapeForTsString(h.constraintName)}",`);
      lines.push(`        overrideable: ${h.overrideable},`);
      lines.push("      },");
    }
    lines.push("    ],");
  }
  lines.push("  },");
}
lines.push("};");
lines.push("");

const output = lines.join("\n");

if (checkMode) {
  if (!existsSync(OUT_PATH)) {
    console.error(
      `[field-hints] No committed artifact at ${OUT_PATH}. Run \`pnpm manifest:field-hints\` to generate.`
    );
    process.exit(1);
  }
  const committed = readFileSync(OUT_PATH, "utf8");
  if (committed !== output) {
    console.error(
      `[field-hints] Drift: ${OUT_PATH} does not match the IR. Run \`pnpm manifest:field-hints\` to regenerate.`
    );
    process.exit(1);
  }
  console.log("[field-hints] No drift. Artifact up to date.");
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(OUT_PATH, output, "utf8");

const entityCount = sortedEntities.length;
const propCount = sortedEntities.reduce((sum, [, p]) => sum + p.size, 0);
const hintCount = sortedEntities.reduce(
  (sum, [, p]) =>
    sum + [...p.values()].reduce((s, h) => s + h.length, 0),
  0
);
console.log(
  `[field-hints] Wrote ${OUT_PATH} (${entityCount} entities, ${propCount} fields, ${hintCount} hints).`
);
