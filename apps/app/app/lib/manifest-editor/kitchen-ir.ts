import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { EntityDetail, EntityListItem } from "@repo/types/manifest-editor";

type RawIrExpression = unknown;

interface RawIrProperty {
  name: string;
  type: { name: string; nullable: boolean };
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
    return JSON.stringify(expression);
  } catch {
    return String(expression);
  }
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
        commands: entity.commands ?? [],
        constraints: (entity.constraints ?? []).map((c) => c.name),
        policies: [],
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
        severity:
          c.severity === "block" || c.severity === "warn" || c.severity === "info"
            ? c.severity
            : "info",
        message: c.message ?? "",
        expression: formatExpression(c.expression),
        level: "entity",
        details: c.overrideable ? "overrideable" : "",
      })) ?? [],
    commands:
      (entity.commands ?? []).map((name) => ({
        name,
        description: "",
        parameters: [],
        guards: [],
        constraints: [],
        mutations: [],
        emittedEvents: [],
      })) ?? [],
    policies: [],
  };
}

