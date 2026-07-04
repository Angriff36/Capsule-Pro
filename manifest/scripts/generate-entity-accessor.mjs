#!/usr/bin/env node
/**
 * Emit TypeScript entity read resolver from manifest.config.yaml + live schema metadata.
 * Replaces hand-maintained apps/api/lib/manifest/entity-accessor.ts maps.
 *
 * Run: node manifest/scripts/generate-entity-accessor.mjs
 * Chained in: pnpm manifest:generate-metadata
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { resolveEntityResolution } from "./accessor-resolution.mjs";

const root = resolve(process.cwd());
const irPath = join(root, "manifest/ir/kitchen.ir.json");
const outPaths = [
  join(root, "manifest/runtime/src/generated/entity-accessor.generated.ts"),
];

if (!existsSync(irPath)) {
  console.error(`Missing ${irPath} — run pnpm manifest:compile first.`);
  process.exit(1);
}

const ir = JSON.parse(readFileSync(irPath, "utf8"));
const entityNames = (ir.entities ?? []).map((e) => e.name).sort();

const resolutions = {};
for (const name of entityNames) {
  resolutions[name] = resolveEntityResolution(name);
}

const header = `// Generated from manifest.config.yaml + prisma-model-metadata — DO NOT EDIT
// Producer: manifest/scripts/generate-entity-accessor.mjs
// Re-run: pnpm manifest:generate-metadata
/* eslint-disable */
`;

const body = `export interface EntityResolution {
  accessor: string;
  createdAtField: string | null;
  drop: boolean;
  exists: boolean;
  hasDetail: boolean;
  softDeleteField: string | null;
  tenantIdField: string;
}

const RESOLUTIONS: Record<string, EntityResolution> = ${JSON.stringify(
  resolutions,
  null,
  2
)};

const DROP: EntityResolution = {
  accessor: "",
  exists: false,
  drop: true,
  hasDetail: false,
  tenantIdField: "tenantId",
  createdAtField: null,
  softDeleteField: null,
};

export function resolveEntityAccessor(entityName: string): EntityResolution {
  return RESOLUTIONS[entityName] ?? DROP;
}

export function buildTenantWhere(
  entityName: string,
  tenantId: string,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  const r = resolveEntityAccessor(entityName);
  const where: Record<string, unknown> = {
    [r.tenantIdField]: tenantId,
    ...extra,
  };
  if (r.softDeleteField) {
    where[r.softDeleteField] = null;
  }
  return where;
}

export function buildOrderBy(entityName: string): Record<string, string> {
  const r = resolveEntityAccessor(entityName);
  if (!r.createdAtField) {
    return {};
  }
  return { [r.createdAtField]: "desc" };
}
`;

for (const outPath of outPaths) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${header}\n${body}`);
}

process.stdout.write(
  `wrote entity-accessor.generated.ts (${entityNames.length} entities) → ${outPaths.length} paths\n`
);
