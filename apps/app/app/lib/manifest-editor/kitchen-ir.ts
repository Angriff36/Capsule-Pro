import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { EntityDetail, EntityListItem } from "@repo/types/manifest-editor";

type RawIrExpression = unknown;

interface RawIrProperty {
  name: string;
  type: { name: string; nullable: boolean };
}

interface RawIrParameter {
  name: string;
  type: { name: string; nullable: boolean };
  required?: boolean;
}

interface RawIrComputedProperty {
  name: string;
  type: { name: string; nullable: boolean };
  expression: RawIrExpression;
}

interface RawIrConstraint {
  name: string;
  code: string;
  expression: RawIrExpression;
  severity: "block" | "warn" | "info" | string;
  message?: string;
  overrideable?: boolean;
}

interface RawIrAction {
  kind: string;
  target?: string;
  expression?: RawIrExpression;
}

interface RawIrCommandDefinition {
  name: string;
  entity: string;
  description?: string;
  parameters?: RawIrParameter[];
  guards?: RawIrExpression[];
  constraints?: RawIrConstraint[];
  actions?: RawIrAction[];
  emits?: string[];
}

interface RawIrPolicy {
  name: string;
  action: "execute" | "read" | "create" | "update" | "delete" | string;
  expression?: RawIrExpression;
  message?: string;
  // Some IR builds may include explicit targets. Keep this permissive.
  targetCommands?: string[];
}

interface RawIrEntity {
  name: string;
  properties?: RawIrProperty[];
  computedProperties?: RawIrComputedProperty[];
  commands?: string[];
  constraints?: RawIrConstraint[];
  policies?: unknown[];
}

interface RawKitchenIr {
  entities: RawIrEntity[];
  commands?: RawIrCommandDefinition[];
  policies?: RawIrPolicy[];
}

let cachedKitchenIr: RawKitchenIr | null = null;

function findRepoRoot(startDir: string): string {
  let current = resolve(startDir);
  for (let i = 0; i < 20; i += 1) {
    const workspace = join(current, "pnpm-workspace.yaml");
    try {
      readFileSync(workspace);
      return current;
    } catch {
      // ignore
    }
    const parent = resolve(current, "..");
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return resolve(startDir);
}

function toDisplayName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();
}

function formatExpression(expression: RawIrExpression): string {
  if (typeof expression === "string") {
    return expression;
  }
  try {
    return JSON.stringify(expression, null, 2);
  } catch {
    return String(expression);
  }
}

function normalizeConstraintSeverity(
  severity: RawIrConstraint["severity"]
): "block" | "warn" | "info" {
  if (severity === "block" || severity === "warn" || severity === "info") {
    return severity;
  }
  return "info";
}

function normalizePolicyType(
  type: RawIrPolicy["action"]
): "execute" | "read" | "create" | "update" | "delete" {
  if (
    type === "execute" ||
    type === "read" ||
    type === "create" ||
    type === "update" ||
    type === "delete"
  ) {
    return type;
  }
  return "execute";
}

function policyPrefixesForEntity(entityName: string): string[] {
  const stripped = entityName.replace(/(Config|Settings|Rules|Rule)$/u, "");
  const prefixes = [entityName];
  if (stripped && stripped !== entityName) {
    prefixes.push(stripped);
  }
  return prefixes;
}

function getPoliciesForEntity(
  entityName: string,
  policies: RawIrPolicy[] | undefined
) {
  const prefixes = policyPrefixesForEntity(entityName);
  return (policies ?? []).filter((p) =>
    prefixes.some((prefix) => p.name.startsWith(prefix))
  );
}

function getCommandsForEntity(
  entityName: string,
  commands: RawIrCommandDefinition[] | undefined
) {
  return (commands ?? []).filter((c) => c.entity === entityName);
}

export function getKitchenIr(): RawKitchenIr {
  if (cachedKitchenIr) {
    return cachedKitchenIr;
  }

  const repoRoot = findRepoRoot(process.cwd());
  const path = join(repoRoot, "packages", "manifest-ir", "ir", "kitchen", "kitchen.ir.json");
  const raw = readFileSync(path, "utf8");
  cachedKitchenIr = JSON.parse(raw) as RawKitchenIr;
  return cachedKitchenIr;
}

export function listKitchenEntities(): EntityListItem[] {
  const ir = getKitchenIr();

  return ir.entities
    .map((entity) => {
      const properties =
        entity.properties?.map((p) => ({
          name: p.name,
          type: p.type?.name ?? "unknown",
          required: Boolean(p.type && !p.type.nullable),
        })) ?? [];

      return {
        name: entity.name,
        displayName: toDisplayName(entity.name),
        commands:
          entity.commands ??
          getCommandsForEntity(entity.name, ir.commands).map((c) => c.name),
        constraints: (entity.constraints ?? []).map((c) => c.name),
        policies: getPoliciesForEntity(entity.name, ir.policies).map((p) => p.name),
        properties,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getKitchenEntityDetail(entityName: string): EntityDetail | null {
  const ir = getKitchenIr();
  const entity = ir.entities.find((e) => e.name === entityName);
  if (!entity) {
    return null;
  }

  const commandDefs = getCommandsForEntity(entity.name, ir.commands);
  const policies = getPoliciesForEntity(entity.name, ir.policies);

  return {
    name: entity.name,
    displayName: toDisplayName(entity.name),
    properties:
      entity.properties?.map((p) => ({
        name: p.name,
        type: p.type?.name ?? "unknown",
        required: Boolean(p.type && !p.type.nullable),
      })) ?? [],
    computed:
      entity.computedProperties?.map((p) => ({
        name: p.name,
        type: p.type?.name ?? "unknown",
        expression: formatExpression(p.expression),
      })) ?? [],
    constraints:
      entity.constraints?.map((c) => ({
        name: c.name,
        code: c.code,
        severity: normalizeConstraintSeverity(c.severity),
        message: c.message ?? "",
        expression: formatExpression(c.expression),
        level: "entity" as const,
        details: c.overrideable ? "overrideable" : "",
      })) ?? [],
    commands:
      (entity.commands ?? commandDefs.map((c) => c.name)).map((name) => {
        const def = commandDefs.find((c) => c.name === name);
        const parameters =
          def?.parameters?.map((p) => ({
            name: p.name,
            type: p.type?.name ?? "unknown",
          })) ?? [];

        const guards =
          def?.guards?.map((g, index) => ({
            index,
            expression: formatExpression(g),
            message: "",
          })) ?? [];

        const constraints =
          def?.constraints?.map((c) => ({
            name: c.name,
            code: c.code,
            severity: normalizeConstraintSeverity(c.severity),
            message: c.message ?? "",
            expression: formatExpression(c.expression),
            level: "command" as const,
            commandName: name,
            details: c.overrideable ? "overrideable" : "",
          })) ?? [];

        const mutations =
          def?.actions
            ?.filter((a) => a.kind === "mutate" && a.target)
            .map((a) => ({
              property: a.target ?? "",
              expression: formatExpression(a.expression),
            })) ?? [];

        return {
          name,
          description: def?.description ?? "",
          parameters,
          guards,
          constraints,
          mutations,
          emittedEvents: def?.emits ?? [],
        };
      }) ?? [],
    policies: policies.map((p) => ({
      name: p.name,
      type: normalizePolicyType(p.action),
      targetCommands: p.targetCommands ?? [],
      expression: formatExpression(p.expression),
      message: p.message ?? "",
    })),
  };
}
