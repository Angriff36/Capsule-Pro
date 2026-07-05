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
  body: Record<string, unknown>;
  command: string;
  entity: string;
}

export interface ResolveParentContextResult {
  body: Record<string, unknown>;
  inheritedFields: string[];
}

function isMeaningful(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Postgres throws (and poisons the surrounding transaction) if a non-UUID
 * string is compared against a uuid column. When the parent's `id` is
 * uuid-typed, skip lookups for FK values that cannot possibly match
 * (e.g. logical slugs like "prep-station" stored in loosely-typed columns).
 */
function canLookUpParent(parentEntity: IREntity, fkValue: string): boolean {
  const idProp = parentEntity.properties.find((p) => p.name === "id");
  const idType = (idProp as { type?: { name?: string } } | undefined)?.type
    ?.name;
  if (idType === "uuid") {
    return UUID_SHAPE.test(fkValue);
  }
  return true;
}

/** A scalar, non-list property type whose values are safe to copy verbatim. */
function scalarTypeName(
  prop: { type?: { name?: string } } | undefined
): string | undefined {
  const name = prop?.type?.name;
  if (!name || name === "array" || name === "list") {
    return;
  }
  return name;
}

/**
 * Enrich a create `body` with parent-owned fields inferred from each `belongsTo`
 * relationship whose FK is present. Mutates and returns the same `body` object.
 */
/** Commands that refresh parent-owned snapshot fields on an existing child row. */
const PARENT_REFRESH_COMMANDS = new Set(["syncFromEvent"]);

async function inheritFromParents(
  runtime: RuntimeEngine,
  child: IREntity,
  body: Record<string, unknown>,
  childParamNames: Set<string>,
  resolveParentId: (localFk: string) => string | undefined,
  respectExistingBody = true
): Promise<string[]> {
  const inheritedFields: string[] = [];
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
    const fkValue = resolveParentId(localFk);
    if (typeof fkValue !== "string" || fkValue.length === 0) {
      continue;
    }

    const parentEntity = runtime.getEntity(rel.target) as IREntity | undefined;
    if (!parentEntity) {
      continue;
    }
    if (!canLookUpParent(parentEntity, fkValue)) {
      continue;
    }

    const parent = (await runtime.getInstance(rel.target, fkValue)) as
      | Record<string, unknown>
      | undefined;
    if (!parent) {
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
      if (ALWAYS_EXCLUDED.has(name)) {
        continue;
      }
      if (childParamNames.has(name)) {
        continue;
      }
      if (fkSet.has(name)) {
        continue;
      }
      if (!parentScalarTypes.has(name)) {
        continue;
      }
      if (parentScalarTypes.get(name) !== childType) {
        continue;
      }
      if (respectExistingBody && isMeaningful(body[name])) {
        continue;
      }

      const parentValue = parent[name];
      if (!isMeaningful(parentValue)) {
        continue;
      }

      // R2: GenericPrismaStore returns DateTime columns as JS Date objects verbatim.
      // The engine datetime contract requires epoch-ms numbers — never Date objects.
      body[name] =
        parentValue instanceof Date ? parentValue.getTime() : parentValue;
      inheritedFields.push(name);
    }

    if (
      inheritedFields.length > 0 &&
      childScalarTypes.has("inheritedContext")
    ) {
      body.inheritedContext = JSON.stringify({
        source: rel.target,
        fk: localFk,
        parentId: fkValue,
        fields: [...inheritedFields].sort(),
      });
    }
  }

  return inheritedFields;
}

/**
 * Refresh parent-owned snapshot fields on an existing child before
 * `syncFromEvent` (or similar) runs. Loads the child instance, follows
 * belongsTo FKs, and copies matching parent scalars into the command body.
 */
export async function refreshParentContext(
  runtime: RuntimeEngine,
  {
    entity,
    command,
    instanceId,
    body,
  }: ResolveParentContextParams & { instanceId: string }
): Promise<ResolveParentContextResult> {
  if (!PARENT_REFRESH_COMMANDS.has(command)) {
    return { body, inheritedFields: [] };
  }

  const child = runtime.getEntity(entity) as IREntity | undefined;
  if (!child) {
    return { body, inheritedFields: [] };
  }

  const instance = (await runtime.getInstance(entity, instanceId)) as
    | Record<string, unknown>
    | undefined;
  if (!instance) {
    return { body, inheritedFields: [] };
  }

  // R3: For refresh commands (syncFromEvent) the sync command's own parameters ARE the
  // fields to refresh — they must NOT be used as a skip-set. inheritFromParents uses
  // childParamNames to skip user-facing create inputs; for a refresh the parent values
  // should overwrite any stale body values unconditionally. Pass an empty set so all
  // matching parent fields are copied (and respectExistingBody=false already ensures
  // existing body values don't prevent the refresh).
  const childParamNames = new Set<string>();

  const inheritedFields = await inheritFromParents(
    runtime,
    child,
    body,
    childParamNames,
    (localFk) => {
      const fromBody = body[localFk];
      if (typeof fromBody === "string" && fromBody.length > 0) {
        return fromBody;
      }
      const fromInstance = instance[localFk];
      return typeof fromInstance === "string" && fromInstance.length > 0
        ? fromInstance
        : undefined;
    },
    false
  );

  return { body, inheritedFields };
}

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

  const copied = await inheritFromParents(
    runtime,
    child,
    body,
    childParamNames,
    (localFk) => {
      const fkValue = body[localFk];
      return typeof fkValue === "string" && fkValue.length > 0
        ? fkValue
        : undefined;
    }
  );
  inheritedFields.push(...copied);

  return { body, inheritedFields };
}
