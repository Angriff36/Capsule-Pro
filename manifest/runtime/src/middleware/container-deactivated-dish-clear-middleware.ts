/**
 * ContainerDeactivated → clear the default-container reference on every Dish
 * that points at the retired container.
 *
 * Implements the orphan-event leg "ContainerDeactivated → Dish.clearDefaultContainer"
 * (IMPLEMENTATION_PLAN: Core / cross-cutting orphan events — the line-186 cluster).
 * Before this, `ContainerDeactivated` (core/container-rules.manifest:137, emitted by
 * `Container.deactivate`) had ZERO consumers: deactivating a container left every
 * `Dish` whose `defaultContainerId` referenced it still pointing at the retired
 * container, so the `belongsTo defaultContainer` relationship resolved a dead reference
 * and plating/packout defaults kept naming a container that is no longer in circulation.
 * This closes that gap: one governed `Container.deactivate` fans out to
 * `Dish.clearDefaultContainer()` for every dish linked by `defaultContainerId`.
 *
 * WHY this is safe to cascade (unlike ClientArchived → withdraw Proposals, deferred):
 * clearing a foreign-key reference is a non-destructive, idempotent cleanup — the dish
 * itself is untouched (name/recipe/pricing intact), only the dangling container pointer
 * is reset to "". If the container is later reactivated, an operator can re-select it on
 * the dish. There is no irreversibility hazard, so the permanent-vs-reversible split that
 * defers dish-eightySix / vendor-suspend does not apply here.
 *
 * WHY middleware and not a reaction: this is a 1:N fan-out — one deactivated Container has
 * MANY dependent Dishes, resolved by `defaultContainerId`. A declarative `on
 * ContainerDeactivated run Dish.clearDefaultContainer` reaction resolves exactly ONE
 * target instance, so it structurally cannot reach the set. The container id is also
 * reachable only as the engine-stamped `event.subject?.id` — `deactivate(reason, userId)`
 * takes no `containerId` param, so the declared `containerId` event field is NOT
 * auto-populated from `self.*` (mirrors the EmailTemplateDeleted / VendorBlacklisted
 * cascades reading `event.subject?.id`, not `payload.containerId`).
 *
 * The leg is GUARD-SAFE and IDEMPOTENT: only non-soft-deleted dishes whose
 * `defaultContainerId` still matches are dispatched, and `clearDefaultContainer` guards
 * `defaultContainerId != ""`, so a dish that already has no default container is never
 * dispatched and a re-emitted `ContainerDeactivated` finds nothing to clear and no-ops.
 * Deactivated/86'd dishes ARE cleared (the dangling reference should be reset regardless
 * of dish availability state).
 *
 * KNOWN LIMITATION (documented, not silent): each dispatched `clearDefaultContainer` runs
 * as the actor who deactivated the container and is subject to Dish's default policy
 * (staff / kitchen_staff / kitchen_lead / manager / admin). `Container.deactivate`'s
 * default policy also admits `inventory_manager`, which is NOT in Dish's policy set — an
 * inventory_manager-triggered deactivation therefore yields a policy-denied diagnostic +
 * skip on the dish-clear leg (no per-call identity override; same class as the
 * deal-assign / event-staff-assigned notify legs). The failure surfaces through
 * `onDiagnostic` rather than being swallowed.
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

export interface ContainerDeactivatedDishClearDiagnostic {
  containerId?: string;
  detail?: Record<string, unknown>;
  dishId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface ContainerDeactivatedDishClearMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: ContainerDeactivatedDishClearDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface DishRow {
  defaultContainerId?: unknown;
  deletedAt?: unknown;
  id?: unknown;
  tenantId?: unknown;
}

const defaultDiagnostic = (
  diag: ContainerDeactivatedDishClearDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[container-deactivated-dish-clear:${diag.stage}] ${diag.reason}`, {
    containerId: diag.containerId,
    tenantId: diag.tenantId,
    dishId: diag.dishId,
    ...diag.detail,
  });
};

export function createContainerDeactivatedDishClearMiddleware(
  options: ContainerDeactivatedDishClearMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const deactivatedEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "ContainerDeactivated" &&
          ctx.entityName === "Container" &&
          ctx.command.name === "deactivate"
      );

      for (const event of deactivatedEvents) {
        const payload = event.payload as { userId?: unknown } | undefined;

        // The container id is the engine-stamped source instance id — `deactivate`
        // takes no `containerId` param, so the declared `containerId` event field is
        // NOT auto-populated from self.* (mirrors the EmailTemplateDeleted cascade).
        const containerId = asNonEmptyString(event.subject?.id);
        // ContainerDeactivated carries no tenantId; resolve it from the runtime context.
        const tenantId = asNonEmptyString(
          (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)?.tenantId
        );
        // userId IS a `deactivate` param, so it rides the payload; fall back to the
        // acting user / "system" for the cleared-event audit trail.
        const userId =
          asNonEmptyString(payload?.userId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { id?: unknown } | undefined)?.id
          ) ??
          "system";

        if (!(containerId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `ContainerDeactivated missing ${containerId ? "tenantId" : "containerId"}`,
            containerId,
            tenantId,
          });
          continue;
        }

        const store = storeProvider("Dish");
        if (!store) {
          onDiagnostic({
            stage: "stores",
            reason: "Dish store unavailable — clear-default-container cascade skipped",
            containerId,
            tenantId,
          });
          continue;
        }

        // Only non-soft-deleted dishes still pointing at this container. A dish whose
        // defaultContainerId no longer matches (or is empty) is skipped so we never
        // dispatch a no-op clear; clearDefaultContainer's own guard is the backstop.
        const dependentDishes = (await store.getAll())
          .map((row) => row as DishRow)
          .filter(
            (row) =>
              asNonEmptyString(row.tenantId) === tenantId &&
              asNonEmptyString(row.defaultContainerId) === containerId &&
              row.deletedAt == null
          );

        for (const row of dependentDishes) {
          const dishId = asNonEmptyString(row.id);
          if (!dishId) {
            continue;
          }

          const result = await dispatchCommand(
            "clearDefaultContainer",
            { userId },
            {
              entityName: "Dish",
              instanceId: dishId,
              correlationId: containerId,
              causationId: "ContainerDeactivated",
              idempotencyKey: `container-deactivated-dish-clear:${tenantId}:${containerId}:${dishId}`,
            }
          );

          if (result.emittedEvents) {
            ctx.emittedEvents.push(...result.emittedEvents);
          }
          if (!result.success) {
            onDiagnostic({
              stage: "dispatch",
              reason: `Dish.clearDefaultContainer failed for ${dishId}: ${result.error ?? "unknown"}`,
              containerId,
              tenantId,
              dishId,
            });
            continue;
          }

          onDiagnostic({
            stage: "done",
            reason: "Dish.clearDefaultContainer applied for deactivated container",
            containerId,
            tenantId,
            dishId,
          });
        }
      }

      return {};
    },
  };
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
