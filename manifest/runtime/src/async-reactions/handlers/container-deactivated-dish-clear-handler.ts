/**
 * Async reaction handler for Container deactivated → Dish default-container clear.
 *
 * Deferred counterpart of {@link createContainerDeactivatedDishClearMiddleware}.
 * When `ContainerDeactivated` fires, the middleware (with async enabled)
 * ENQUEUES a job; this handler runs LATER in the worker, loads every Dish
 * whose `defaultContainerId` still points at the retired container, and
 * dispatches the governed `Dish.clearDefaultContainer` per dish. This is a 1:N
 * fan-out — one deactivated Container has many dependent Dishes.
 *
 * Guard-safe + idempotent: only non-soft-deleted dishes whose
 * `defaultContainerId` still matches are dispatched. The dispatch idempotency
 * key is per (tenant, container, dish), so a redelivered job does not re-clear
 * an already-cleared dish. `clearDefaultContainer`'s own guard
 * (`defaultContainerId != ""`) is the backstop.
 */

import type {
  AsyncReactionHandler,
  AsyncReactionHandlerContext,
} from "..";

/** Reaction name registered with {@link asyncReactionRegistry}. */
export const CONTAINER_DEACTIVATED_DISH_CLEAR_REACTION =
  "containerDeactivatedDishClear";

interface DishRow {
  defaultContainerId?: unknown;
  deletedAt?: unknown;
  id?: unknown;
  tenantId?: unknown;
}

interface DeactivatedPayload {
  userId?: unknown;
}

interface ManifestStore {
  getAll(): Promise<unknown[]>;
}

/**
 * Handler implementation. Exposed for direct unit testing.
 */
export const containerDeactivatedDishClearHandler: AsyncReactionHandler =
  async (ctx: AsyncReactionHandlerContext): Promise<void> => {
    const { job, dispatchCommand, storeProvider, log } = ctx;
    const containerId = job.triggeringEvent.subjectId;
    const tenantId = job.tenantId;
    const payload = job.triggeringEvent.payload as
      | DeactivatedPayload
      | undefined;

    if (!containerId) {
      log.warn?.(
        "containerDeactivatedDishClear: missing subjectId — skipping",
        { jobId: job.id },
      );
      return;
    }

    const userId =
      asNonEmptyString(payload?.userId) ?? job.actorId ?? "system";

    const dishStore = storeProvider("Dish") as ManifestStore | undefined;
    if (!dishStore) {
      throw new Error("Dish store unavailable");
    }

    const dishes = (await dishStore.getAll())
      .map((row) => row as DishRow)
      .filter(
        (row) =>
          asNonEmptyString(row.tenantId) === tenantId &&
          asNonEmptyString(row.defaultContainerId) === containerId &&
          row.deletedAt == null,
      );

    if (dishes.length === 0) {
      return;
    }

    let failures = 0;
    for (const dish of dishes) {
      const dishId = asNonEmptyString(dish.id);
      if (!dishId) continue;

      const result = await dispatchCommand(
        "clearDefaultContainer",
        { userId },
        {
          entityName: "Dish",
          instanceId: dishId,
          correlationId: containerId,
          causationId: "ContainerDeactivated",
          idempotencyKey:
            job.idempotencyKey ??
            `container-deactivated:${tenantId}:${containerId}:${dishId}`,
        },
      );
      if (!result.success) {
        failures++;
        log.warn?.(
          "containerDeactivatedDishClear: dish dispatch failed",
          {
            jobId: job.id,
            containerId,
            dishId,
            error: result.error ?? "unknown",
          },
        );
      }
    }

    if (failures > 0 && failures === dishes.length) {
      throw new Error(
        `Dish.clearDefaultContainer failed for all ${failures} dish(es): ${job.id}`,
      );
    }
  };

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
