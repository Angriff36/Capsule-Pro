/**
 * Canonical Manifest command execution (transport-agnostic).
 *
 * Shared by the API HTTP wrapper and app server actions. Callers supply auth
 * context and a runtime factory; this module resolves commands and invokes
 * RuntimeEngine.runCommand.
 */

import type { EmittedEvent, RuntimeEngine } from "@angriff36/manifest";
import type { ConstraintOutcome, IREntity } from "@angriff36/manifest/ir";
import { resolveCommand } from "./command-resolver";
import { resolveParentContext } from "./parent-context-resolver";
export { resolveParentContext } from "./parent-context-resolver";

export interface ManifestUserContext {
  id: string;
  tenantId: string;
  role: string;
}

export interface RunManifestCommandCoreParams {
  entity: string;
  command: string;
  body: Record<string, unknown>;
  user: ManifestUserContext;
  instanceId?: string;
}

export interface RunManifestCommandCoreDeps {
  createRuntime: (ctx: {
    user: ManifestUserContext;
    entityName: string;
  }) => Promise<RuntimeEngine>;
}

export type RunManifestCommandFailureKind =
  | "unknown_command"
  | "bootstrap_failed"
  | "policy_denied"
  | "guard_failed"
  | "constraint_blocked"
  | "command_failed"
  | "runtime_error";

export interface RunManifestCommandCoreSuccess {
  ok: true;
  entity: string;
  command: string;
  result: unknown;
  events?: EmittedEvent[];
  constraintOutcomes?: ConstraintOutcome[];
  /**
   * True when the command was a no-op: the engine guard rejected it, but the
   * entity was already in the final state this command produces, so we return
   * success with the current entity instead of a 422. No events/audit are
   * emitted and no [manifest-issue] is logged for a no-op.
   */
  noop?: boolean;
}

/**
 * Idempotent user actions (acknowledge / dismiss / markRead / complete-style).
 * Re-issuing one after it has already taken effect is a no-op, not an error —
 * e.g. a double-click, a stale UI, or two tabs.
 *
 * `completedWhen` describes the FINAL state the command itself produces. It is
 * consulted ONLY after the engine guard has already rejected the command, and
 * only returns success when the entity is genuinely already in that final
 * state. This never turns a real invalid transition into success (those don't
 * satisfy completedWhen), and it never weakens the engine guards themselves.
 *
 * Keyed by `"<Entity>.<command>"`. Add an entry only for actions whose repeat
 * is semantically a no-op.
 */
export interface IdempotentCommandRule {
  completedWhen: (entity: Record<string, unknown>) => boolean;
}

export const IDEMPOTENT_COMMANDS: Readonly<
  Record<string, IdempotentCommandRule>
> = {
  // Acknowledging an already-acknowledged warning is done; don't 422 the user.
  "AllergenWarning.acknowledge": {
    completedWhen: (e) => e.isAcknowledged === true,
  },
  // Resolving an already-resolved warning is done.
  "AllergenWarning.markResolved": {
    completedWhen: (e) => e.resolved === true,
  },
  // Soft-deleting an already-deleted warning is done.
  "AllergenWarning.softDelete": {
    completedWhen: (e) => e.deletedAt != null,
  },
};

/**
 * Best-effort fetch of the live instance for idempotency detection. Never
 * throws — if the runtime can't surface the instance we simply fall through to
 * the normal guard_failed path.
 */
async function tryGetInstance(
  runtime: RuntimeEngine,
  entity: string,
  id: string
): Promise<Record<string, unknown> | undefined> {
  const withGetter = runtime as unknown as {
    getInstance?: (entityName: string, instanceId: string) => Promise<unknown>;
  };
  if (typeof withGetter.getInstance !== "function") {
    return undefined;
  }
  try {
    const instance = await withGetter.getInstance(entity, id);
    return instance && typeof instance === "object"
      ? (instance as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

export interface RunManifestCommandCoreFailure {
  ok: false;
  entity: string;
  command: string;
  kind: RunManifestCommandFailureKind;
  httpStatus: number;
  message: string;
  policyDenial?: unknown;
  guardFailure?: unknown;
  constraintOutcomes?: ConstraintOutcome[];
  error?: unknown;
}

export type RunManifestCommandCoreResult =
  | RunManifestCommandCoreSuccess
  | RunManifestCommandCoreFailure;

/**
 * Derive the target instance id for an instance-scoped command from the request
 * body. The canonical dispatcher carries the id in the body rather than the URL,
 * so non-create verbs must read it from there to tell the store which row to
 * mutate.
 *
 * Resolution order:
 *   1. `body.id` — the convention for self-identified commands (Shipment.update,
 *      cancel, ship, ...).
 *   2. `body.<entity>Id` — the entity's self-reference parameter, used when a
 *      command names its id param after the entity (e.g.
 *      ShipmentItem.updateReceived passes `shipmentItemId`).
 *
 * Returns undefined when no usable id is present; the engine then surfaces a
 * clear "instance not found" error rather than mutating the wrong row.
 */
function deriveInstanceIdFromBody(
  body: Record<string, unknown>,
  entity: string
): string | undefined {
  const direct = body.id;
  if (typeof direct === "string" && direct.length > 0) {
    return direct;
  }
  const selfRefKey = `${entity.charAt(0).toLowerCase()}${entity.slice(1)}Id`;
  const selfRef = body[selfRefKey];
  if (typeof selfRef === "string" && selfRef.length > 0) {
    return selfRef;
  }
  return undefined;
}

type IRPropertyWithDefault = {
  name: string;
  default?: unknown;
  defaultValue?: { value?: unknown };
};

type IRTransitionLike = {
  field?: string;
  property?: string;
  from?: unknown;
};

function defaultForProperty(entity: IREntity, propertyName: string): unknown {
  const property = entity.properties.find(
    (item) => item.name === propertyName
  ) as IRPropertyWithDefault | undefined;
  return property?.defaultValue?.value ?? property?.default;
}

/**
 * RuntimeEngine auto-create seeds the instance from the request body before
 * command actions run. If a caller sends a transition-governed initial value
 * equal to the property's default, the engine can interpret that as a no-op
 * transition such as `planned -> planned` and reject it. Remove only those
 * redundant create inputs; defaults still populate the created instance.
 */
export function sanitizeCreateInitialTransitionInput(
  runtime: RuntimeEngine,
  entityName: string,
  commandName: string,
  body: Record<string, unknown>
): string[] {
  if (commandName !== "create") {
    return [];
  }

  const entity = runtime.getEntity(entityName) as IREntity | undefined;
  if (!entity?.transitions?.length) {
    return [];
  }

  const removed: string[] = [];
  for (const transition of entity.transitions as IRTransitionLike[]) {
    const propertyName = transition.property ?? transition.field;
    if (!propertyName) {
      continue;
    }

    const defaultValue = defaultForProperty(entity, propertyName);
    if (
      transition.from === defaultValue &&
      Object.hasOwn(body, propertyName) &&
      body[propertyName] === defaultValue
    ) {
      delete body[propertyName];
      removed.push(propertyName);
    }
  }

  return [...new Set(removed)];
}

export async function runManifestCommandCore(
  deps: RunManifestCommandCoreDeps,
  params: RunManifestCommandCoreParams
): Promise<RunManifestCommandCoreResult> {
  const { entity, command: commandSlug, body, user, instanceId } = params;

  try {
    const resolved = resolveCommand(entity, commandSlug);
    if (!resolved) {
      return {
        ok: false,
        entity,
        command: commandSlug,
        kind: "unknown_command",
        httpStatus: 404,
        message: `Unknown command: ${entity}.${commandSlug}. Verify the entity and command names against the manifest IR.`,
      };
    }

    const command = resolved.command;
    const runtime = await deps.createRuntime({ user, entityName: entity });

    // Parent-context propagation: for a `create` carrying a parent FK (e.g.
    // BattleBoard.create with eventId), load the parent server-side and inherit
    // the parent-owned fields the child declares but does not accept as input.
    // Runs here — before runCommand — because the engine snapshots the create
    // body before any middleware fires. Never let inference break a create.
    if (command === "create") {
      try {
        await resolveParentContext(runtime, { entity, command, body });
      } catch {
        // Inference is best-effort; proceed with the un-enriched body.
      }
      sanitizeCreateInitialTransitionInput(runtime, entity, command, body);
    }

    // Resolve which instance an instance-scoped verb targets. The canonical
    // dispatcher forwards the request body but no explicit instanceId, so verbs
    // like update/cancel/ship must derive the target row from the body; an
    // explicitly-supplied instanceId (e.g. a URL path param) always wins.
    //
    // `create` is intentionally excluded: @angriff36/manifest >=1.7 detects
    // `commandName === "create" && entityName && !instanceId` and persists a
    // constraint-validated instance from the command body BEFORE running the
    // command's mutate actions (runtime-engine `shouldAutoCreateInstance`).
    // Passing an instanceId would DISABLE that path, so we never derive one for
    // create and let the engine own instantiation.
    const resolvedInstanceId =
      command === "create"
        ? instanceId
        : (instanceId ?? deriveInstanceIdFromBody(body, entity));

    const result = await runtime.runCommand(command, body, {
      entityName: entity,
      ...(resolvedInstanceId ? { instanceId: resolvedInstanceId } : {}),
    });

    if (!result.success) {
      if (result.policyDenial) {
        return {
          ok: false,
          entity,
          command,
          kind: "policy_denied",
          httpStatus: 403,
          message: `Access denied: ${result.policyDenial.policyName} (role=${user.role})`,
          policyDenial: result.policyDenial,
        };
      }
      if (result.guardFailure) {
        // Idempotency: if this is a known idempotent action and the entity is
        // already in the final state the command produces, treat the rejected
        // guard as a no-op success rather than a 422. The guard ran in the
        // engine (no mutate, no event, no audit), so returning the current
        // instance here emits nothing and logs nothing. A genuine invalid
        // transition does NOT satisfy completedWhen and still falls through to
        // the 422 below.
        const idempotent = IDEMPOTENT_COMMANDS[`${entity}.${command}`];
        if (idempotent && resolvedInstanceId) {
          const current = await tryGetInstance(
            runtime,
            entity,
            resolvedInstanceId
          );
          if (current && idempotent.completedWhen(current)) {
            return {
              ok: true,
              entity,
              command,
              result: current,
              events: [],
              noop: true,
            };
          }
        }

        return {
          ok: false,
          entity,
          command,
          kind: "guard_failed",
          httpStatus: 422,
          message: `Guard ${result.guardFailure.index} failed: ${result.guardFailure.formatted}`,
          guardFailure: result.guardFailure,
        };
      }

      const blockedConstraint = result.constraintOutcomes?.find(
        (outcome) =>
          !outcome.passed &&
          !outcome.overridden &&
          outcome.severity === "block"
      );
      if (blockedConstraint) {
        return {
          ok: false,
          entity,
          command,
          kind: "constraint_blocked",
          httpStatus: 422,
          message:
            blockedConstraint.message ??
            result.error ??
            "Constraint blocked command",
          constraintOutcomes: result.constraintOutcomes,
        };
      }

      return {
        ok: false,
        entity,
        command,
        kind: "command_failed",
        httpStatus: 400,
        message: result.error ?? "Command failed",
        constraintOutcomes: result.constraintOutcomes,
      };
    }

    // For create, the engine returns the auto-created instance as `result.result`
    // (>=1.7). If a create result ever lacks a top-level id, fall back to the
    // explicitly-supplied instanceId so callers still receive `{ id }`.
    let successResult: unknown = result.result;
    if (
      command === "create" &&
      instanceId &&
      !(
        typeof successResult === "object" &&
        successResult !== null &&
        typeof (successResult as Record<string, unknown>).id === "string"
      )
    ) {
      successResult = { id: instanceId };
    }

    return {
      ok: true,
      entity,
      command,
      result: successResult,
      events: result.emittedEvents,
      constraintOutcomes: result.constraintOutcomes,
    };
  } catch (error) {
    return {
      ok: false,
      entity,
      command: commandSlug,
      kind: "runtime_error",
      httpStatus: 500,
      message: error instanceof Error ? error.message : "Internal server error",
      error,
    };
  }
}
