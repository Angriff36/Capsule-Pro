/**
 * DishDeactivated → prune the discontinued dish from open kitchen + menu work
 * (IMPLEMENTATION_PLAN P1, Kitchen → "Dish/Ingredient lifecycle propagation",
 * the food-safety-critical dead-end leg).
 *
 * WHY this exists: deactivating a dish (`Dish.deactivate`, dish-rules.manifest:144,
 * `isActive = false`) is a PERMANENT discontinue — the command even carries a
 * `warnActiveMenu:warn` constraint telling the operator to "verify it is not on
 * any active menus". But `DishDeactivated` (dish-rules.manifest:292) had ZERO
 * consumers: the discontinued dish stayed live on every open prep task, draft
 * prep-list item, and event menu that referenced it. So the kitchen kept prepping
 * a dish that is no longer offered, and event menus kept showing it — a stale,
 * food-relevant dead-end a coordinator had to chase down by hand.
 *
 * This middleware closes that leg: on `DishDeactivated`, find every OPEN downstream
 * row that references the dish and dispatch the governed command that retires it —
 *   - `PrepTask`  → `cancel(reason, canceledBy)` for tasks not already done/canceled
 *   - `PrepListItem` → `remove(reason, userId)` for items not already removed
 *   - `EventDish`    → `remove(reason, userId)` for menu rows not already removed
 * Each leg uses an EXISTING governed command and an EXISTING `dishId` FK
 * (prep-task-rules.manifest:24 / prep-list-rules.manifest:228 /
 * event-dish-rules.manifest:17) — no IR/schema change, no migration.
 *
 * WHY middleware and not a reaction (the structural reason, per the verified
 * engine-semantics correction in IMPLEMENTATION_PLAN P0):
 *   - It is a 1:N fan-out: one deactivated dish → MANY open PrepTask / PrepListItem
 *     / EventDish rows across three entities. A declarative reaction resolves
 *     exactly ONE target instance, so it cannot reach the set.
 *   - The downstream rows are found by scanning `dishId` across each store; that
 *     dish id is the source instance id (`_subject.id`), and the SET of rows is not
 *     expressible in a reaction `params` block.
 *
 * Engine-semantics note: `DishDeactivated`'s declared fields (`dishId`/`tenantId`/
 * `name`) are NOT auto-populated from `self.*` — the emitted payload is
 * `{ ...commandInput, result }` only. `deactivate(reason, userId)`'s params (`reason`,
 * `userId`) DO ride the payload, but the dish id comes from `_subject.id` and the
 * tenant from the loaded Dish (with a runtime-context fallback).
 *
 * SCOPE — `DishDeactivated` only, deliberately NOT `DishEightySixed`. An 86 is a
 * TRANSIENT, REVERSIBLE pull-from-service ("we're out today"): `Dish.reinstate`
 * (dish-rules.manifest:252) brings it straight back. Blanket-cancelling every prep
 * task and soft-removing every prep-list item + event-menu row for the dish on an
 * 86 would be wrong (it would strip the dish from FUTURE events for a same-day
 * stockout) AND irreversible — none of `PrepTask.cancel`/`PrepListItem.remove`/
 * `EventDish.remove` auto-restore, and there is no removal-provenance marker, so
 * `reinstate` could not safely bring them back (the same restore-on-cancel
 * prerequisite class flagged in the time-off shift-cleanup middleware). The 86 leg
 * needs date-scoping to the affected service window + a restore-on-reinstate path
 * first; tracked as a follow-up in IMPLEMENTATION_PLAN. Deactivate has no such
 * ambiguity — the dish is gone for good, so full downstream cleanup is correct and
 * matches the command's own `warnActiveMenu` intent.
 *
 * Guard-safe + idempotent: only rows the target command's guard accepts are
 * touched — open (not done/canceled) PrepTasks (matching `PrepTask.cancel`'s
 * `status != "done" and status != "canceled"`) and non-removed PrepListItem /
 * EventDish rows (matching `remove`'s `deletedAt == null`) — so a dispatch never
 * relies on the engine swallowing a guard failure. A re-delivered `DishDeactivated`
 * re-scans and finds nothing open; each dispatch also carries a per-(dish, row)
 * idempotency key. Every skip path reports through `onDiagnostic`.
 *
 * KNOWN LIMITATION (documented, not silent): each dispatch runs as the SAME actor
 * who deactivated the dish and is subject to each target's policy. `Dish.deactivate`
 * is restricted to `kitchen_lead`/`manager`/`admin`; `PrepTask`/`PrepListItem`/
 * `EventDish` admit broader kitchen/event roles that include those, so the common
 * case passes — but the runtime has no per-call identity override, so a policy-denied
 * leg is skipped with a diagnostic rather than escalated.
 */

import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";

interface RunCommandOptions {
  causationId?: string;
  correlationId?: string;
  entityName?: string;
  idempotencyKey?: string;
  instanceId?: string;
}

type DispatchCommand = (
  commandName: string,
  input: Record<string, unknown>,
  options: RunCommandOptions
) => Promise<CommandResult>;

export interface DishDeactivatedPruneDiagnostic {
  detail?: Record<string, unknown>;
  dishId?: string;
  reason: string;
  rowId?: string;
  stage: string;
  targetEntity?: string;
  tenantId?: string;
}

/**
 * Which Dish lifecycle command/event drives the prune. The downstream cleanup
 * (open PrepTask / draft PrepListItem / EventDish menu rows) is IDENTICAL for
 * both discontinue paths — deactivate (isActive axis) and softDelete (deletedAt
 * axis) — so the two share this middleware's cleanup body, but the trigger
 * COMMAND and EVENT stay semantically distinct (no DishDeactivated reuse for a
 * delete). Add a trigger, not a copy of the loop.
 */
export interface DishPruneTrigger {
  /** The Dish command that anchors the prune (e.g. "deactivate" | "softDelete"). */
  command: string;
  /** Short diagnostic tag (e.g. "dish-deactivate-prune"). */
  diagnosticTag: string;
  /** The event whose emission means "the dish is gone" (e.g. "DishDeactivated" | "DishDeleted"). */
  event: string;
  /** Idempotency-key namespace so re-delivery of each trigger is deduped independently. */
  idempotencyPrefix: string;
  /** Human label for the downstream retirement reason (e.g. "Dish deactivated"). */
  reasonLabel: string;
}

const DEACTIVATE_TRIGGER: DishPruneTrigger = {
  command: "deactivate",
  event: "DishDeactivated",
  reasonLabel: "Dish deactivated",
  idempotencyPrefix: "dish-deactivate-prune",
  diagnosticTag: "dish-deactivate-prune",
};

const DELETE_TRIGGER: DishPruneTrigger = {
  command: "softDelete",
  event: "DishDeleted",
  reasonLabel: "Dish deleted",
  idempotencyPrefix: "dish-delete-prune",
  diagnosticTag: "dish-delete-prune",
};

export interface DishDeactivatedPruneMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: DishDeactivatedPruneDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
  /** Which Dish command/event drives the prune. Defaults to deactivate. */
  trigger?: DishPruneTrigger;
}

interface DishLike {
  tenantId?: unknown;
}

interface DownstreamRowLike {
  deletedAt?: unknown;
  dishId?: unknown;
  id?: unknown;
  status?: unknown;
  tenantId?: unknown;
}

interface DishDeactivatedPayload {
  reason?: unknown;
  userId?: unknown;
}

/** Statuses a PrepTask can NO LONGER be cancelled from (matches cancel's guard). */
const TERMINAL_PREP_TASK_STATUSES = new Set(["done", "canceled"]);

/**
 * One downstream cleanup leg. `match` selects the rows the leg's command guard
 * will accept; `buildInput` produces that command's params.
 */
interface PruneLeg {
  buildInput: (reason: string, userId: string) => Record<string, unknown>;
  command: string;
  entity: string;
  match: (row: DownstreamRowLike) => boolean;
}

const PRUNE_LEGS: PruneLeg[] = [
  {
    entity: "PrepTask",
    command: "cancel",
    // PrepTask.cancel(reason, canceledBy) — the actor of record is the deactivator.
    buildInput: (reason, userId) => ({ reason, canceledBy: userId }),
    match: (row) => {
      if (isRemoved(row.deletedAt)) {
        return false;
      }
      const status = asNonEmptyString(row.status);
      return status !== undefined && !TERMINAL_PREP_TASK_STATUSES.has(status);
    },
  },
  {
    entity: "PrepListItem",
    command: "remove",
    // PrepListItem.remove(reason, userId) — soft-deletes the prep-list line.
    buildInput: (reason, userId) => ({ reason, userId }),
    match: (row) => !isRemoved(row.deletedAt),
  },
  {
    entity: "EventDish",
    command: "remove",
    // EventDish.remove(reason, userId) — soft-deletes the event-menu row.
    buildInput: (reason, userId) => ({ reason, userId }),
    match: (row) => !isRemoved(row.deletedAt),
  },
];

const defaultDiagnostic = (diag: DishDeactivatedPruneDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[dish-deactivate-prune:${diag.stage}] ${diag.reason}`, {
    dishId: diag.dishId,
    targetEntity: diag.targetEntity,
    rowId: diag.rowId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

/**
 * Create middleware that prunes a discontinued dish from open prep tasks, draft
 * prep-list items, and event menus when the dish is deactivated. Store/provider
 * based so tests and production share the same Manifest runtime boundary.
 */
export function createDishDeactivatedPruneMiddleware(
  options: DishDeactivatedPruneMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
    trigger = DEACTIVATE_TRIGGER,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Anchor to the genuine trigger command — not a look-alike event.
      if (
        !(ctx.entityName === "Dish" && ctx.command.name === trigger.command)
      ) {
        return {};
      }

      const triggerEvents = ctx.emittedEvents.filter(
        (event) => event.name === trigger.event
      );

      for (const event of triggerEvents) {
        const payload = event.payload as DishDeactivatedPayload | undefined;

        // The dish id IS the engine-stamped source instance id.
        const dishId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        // `userId` is a genuine trigger-command input param, so it rides the
        // payload; it becomes the actor of record on each downstream retirement.
        const userId = asNonEmptyString(payload?.userId) ?? "system";
        const triggerReason = asNonEmptyString(payload?.reason);
        const pruneReason = triggerReason
          ? `${trigger.reasonLabel}: ${triggerReason}`
          : trigger.reasonLabel;

        if (!dishId) {
          onDiagnostic({
            stage: "resolve",
            reason: `${trigger.event} missing dishId (_subject.id)`,
          });
          continue;
        }

        // Tenant comes from the deactivated Dish (declared event fields are not
        // auto-populated), falling back to the runtime context's actor tenant.
        const dishStore = storeProvider("Dish");
        const dish = (await dishStore?.getById(dishId)) as DishLike | undefined;
        const tenantId =
          asNonEmptyString(dish?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!tenantId) {
          onDiagnostic({
            stage: "tenant",
            reason: "could not resolve tenantId for deactivated dish",
            dishId,
          });
          continue;
        }

        for (const leg of PRUNE_LEGS) {
          const store = storeProvider(leg.entity);
          if (!store) {
            onDiagnostic({
              stage: "stores",
              reason: `${leg.entity} store unavailable — leg skipped`,
              dishId,
              targetEntity: leg.entity,
              tenantId,
            });
            continue;
          }

          const targets = (await store.getAll())
            .map((row) => row as DownstreamRowLike)
            .filter((row) => {
              if (asNonEmptyString(row.tenantId) !== tenantId) {
                return false;
              }
              if (asNonEmptyString(row.dishId) !== dishId) {
                return false;
              }
              return leg.match(row);
            });

          if (targets.length === 0) {
            onDiagnostic({
              stage: "scan",
              reason: `no open ${leg.entity} rows reference the deactivated dish`,
              dishId,
              targetEntity: leg.entity,
              tenantId,
            });
            continue;
          }

          for (const row of targets) {
            const rowId = asNonEmptyString(row.id);
            if (!rowId) {
              continue;
            }

            const result = await dispatchCommand(
              leg.command,
              leg.buildInput(pruneReason, userId),
              {
                entityName: leg.entity,
                instanceId: rowId,
                correlationId: dishId,
                causationId: trigger.event,
                idempotencyKey: `${trigger.idempotencyPrefix}:${tenantId}:${dishId}:${leg.entity}:${rowId}`,
              }
            );

            if (result.emittedEvents) {
              ctx.emittedEvents.push(...result.emittedEvents);
            }
            if (!result.success) {
              onDiagnostic({
                stage: "dispatch",
                reason: `${leg.entity}.${leg.command} failed for ${rowId}: ${result.error ?? "unknown"}`,
                dishId,
                targetEntity: leg.entity,
                rowId,
                tenantId,
              });
              continue;
            }

            onDiagnostic({
              stage: "pruned",
              reason: `${leg.entity} retired for ${trigger.reasonLabel.toLowerCase()}`,
              dishId,
              targetEntity: leg.entity,
              rowId,
              tenantId,
            });
          }
        }
      }

      return {};
    },
  };
}

/**
 * DishDeleted → prune the deleted dish from open prep tasks, draft prep-list
 * items, and event menus. Shares the exact cleanup body with the deactivate
 * prune (same food-safety dead-end) but is driven by the SEMANTICALLY DISTINCT
 * `Dish.softDelete` command / `DishDeleted` event (Design B soft-delete on the
 * `deletedAt` axis) — no DishDeactivated reuse. Register alongside the
 * deactivate prune in the runtime factory.
 */
export function createDishDeletedPruneMiddleware(
  options: Omit<DishDeactivatedPruneMiddlewareOptions, "trigger">
): Middleware {
  return createDishDeactivatedPruneMiddleware({
    ...options,
    trigger: DELETE_TRIGGER,
  });
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** A removed row carries a non-null/non-empty `deletedAt`. */
function isRemoved(value: unknown): boolean {
  if (value == null) {
    return false;
  }
  if (typeof value === "string") {
    return value.length > 0;
  }
  // epoch-ms number or Date → removed.
  return true;
}
