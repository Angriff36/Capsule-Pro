/**
 * Parent-context propagation for governed `create` commands.
 *
 * Invariant: a child entity created from a parent must accept the parent id,
 * load the parent server-side, and inherit the parent-owned fields it declares
 * but does NOT expose as create-command parameters. The caller supplies only
 * the parent FK plus child-specific overrides; parent values are *defaults*, so
 * any value already present in the body wins.
 *
 * This is the single, generic, IR-relationship-driven choke point. It runs in
 * `run-manifest-command-core` BEFORE `runtime.runCommand`, because the engine
 * snapshots the create body (`prepareCreateData`) before any middleware fires —
 * so middleware cannot influence what gets persisted, but the body passed to
 * `runCommand` can.
 *
 * Why "not a create param" is the inheritance gate: a field the child exposes as
 * a create parameter is user-facing input (board name, notes, tags); a field the
 * child declares but never accepts as input can ONLY be populated by inheritance.
 * That set is exactly the parent-owned snapshot. It also dodges name collisions
 * where parent and child share a property name with different semantics/types
 * (e.g. Event.tags array vs BattleBoard.tags string).
 */

import type { RuntimeEngine } from "@angriff36/manifest";
import type { IREntity } from "@angriff36/manifest/ir";

/** Default tenant discriminator. Every Capsule entity hand-declares `tenantId`. */
const DEFAULT_TENANT_PROPERTY = "tenantId";

/**
 * Fields never inherited regardless of name match: identity, tenant, lifecycle,
 * and audit timestamps are owned by the child's own create, not the parent.
 */
const ALWAYS_EXCLUDED = new Set<string>([
  "id",
  DEFAULT_TENANT_PROPERTY,
  "status",
  "createdAt",
  "updatedAt",
  "deletedAt",
  "inheritedContext",
]);

export interface ResolveParentContextParams {
  entity: string;
  command: string;
  body: Record<string, unknown>;
}

export interface ResolveParentContextResult {
  body: Record<string, unknown>;
  inheritedFields: string[];
}

function isMeaningful(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

/** A scalar, non-list property type whose values are safe to copy verbatim. */
function scalarTypeName(prop: { type?: { name?: string } } | undefined): string | undefined {
  const name = prop?.type?.name;
  if (!name || name === "array" || name === "list") {
    return undefined;
  }
  return name;
}

/**
 * Enrich a create `body` with parent-owned fields inferred from each `belongsTo`
 * relationship whose FK is present. Mutates and returns the same `body` object.
 */
export async function resolveParentContext(
  runtime: RuntimeEngine,
  { entity, command, body }: ResolveParentContextParams
): Promise<ResolveParentContextResult> {
  const inheritedFields: string[] = [];
  if (command !== "create") {
    return { body, inheritedFields };
  }

  const child = runtime.getEntity(entity) as IREntity | undefined;
  if (!child) {
    return { body, inheritedFields };
  }

  // User-facing inputs: a field accepted as a create param is never inherited.
  const createCommand = runtime.getCommand("create", entity);
  const childParamNames = new Set(
    (createCommand?.parameters ?? []).map((p) => p.name)
  );

  const childScalarTypes = new Map<string, string>();
  for (const prop of child.properties) {
    const type = scalarTypeName(prop);
    if (type) {
      childScalarTypes.set(prop.name, type);
    }
  }

  for (const rel of child.relationships) {
    if (rel.kind !== "belongsTo" && rel.kind !== "ref") {
      continue;
    }
    const fkFields = rel.foreignKey?.fields ?? [];
    const localFk = fkFields.find((f) => f !== DEFAULT_TENANT_PROPERTY);
    if (!localFk) {
      continue;
    }
    const fkValue = body[localFk];
    if (typeof fkValue !== "string" || fkValue.length === 0) {
      continue;
    }

    const parent = (await runtime.getInstance(rel.target, fkValue)) as
      | Record<string, unknown>
      | undefined;
    if (!parent) {
      continue;
    }

    const parentEntity = runtime.getEntity(rel.target) as IREntity | undefined;
    if (!parentEntity) {
      continue;
    }
    const parentScalarTypes = new Map<string, string>();
    for (const prop of parentEntity.properties) {
      const type = scalarTypeName(prop);
      if (type) {
        parentScalarTypes.set(prop.name, type);
      }
    }

    const fkSet = new Set(fkFields);
    for (const [name, childType] of childScalarTypes) {
      if (ALWAYS_EXCLUDED.has(name)) continue;
      if (childParamNames.has(name)) continue; // user-facing input, not inherited
      if (fkSet.has(name)) continue; // FK columns are linkage, not inherited content
      if (!parentScalarTypes.has(name)) continue; // parent must own it
      if (parentScalarTypes.get(name) !== childType) continue; // type-compatible only
      if (isMeaningful(body[name])) continue; // child override wins

      const parentValue = parent[name];
      if (!isMeaningful(parentValue)) continue; // never copy empty parent values

      body[name] = parentValue;
      inheritedFields.push(name);
    }

    if (inheritedFields.length > 0 && childScalarTypes.has("inheritedContext")) {
      body.inheritedContext = JSON.stringify({
        source: rel.target,
        fk: localFk,
        parentId: fkValue,
        fields: [...inheritedFields].sort(),
      });
    }
  }

  return { body, inheritedFields };
}
