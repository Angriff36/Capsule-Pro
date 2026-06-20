/**
 * Async reaction handler for chart-of-account deactivation → child cascade.
 *
 * Deferred counterpart of
 * {@link createChartOfAccountDeactivatedDeactivateChildrenMiddleware}. When
 * `ChartOfAccountDeactivated` fires, the middleware (with async enabled)
 * ENQUEUES a job; this handler runs LATER in the worker, loads all active,
 * non-deleted child accounts keyed by `parentId`, and dispatches the governed
 * `ChartOfAccount.deactivate` per child.
 *
 * FULL-SUBTREE behaviour is intentional and free: deactivating a child
 * re-emits `ChartOfAccountDeactivated`, which (via the capture-triggering-events
 * middleware) ENQUEUES a SEPARATE job for that child's own children. The
 * cascade therefore fans out through the queue rather than recursing inside one
 * handler invocation — each level is its own retryable, observable job.
 * Termination is guaranteed by `deactivate`'s `self.isActive == true` guard
 * (each node is deactivated at most once, so even a malformed `parentId` cycle
 * cannot loop).
 *
 * Guard-safe + idempotent: only children that are still `isActive == true` and
 * not soft-deleted are dispatched, so already-inactive / deleted children are
 * skipped rather than spamming swallowed guard failures. Each child dispatch
 * carries `coa-deactivated:${tenantId}:${parentAccountId}:${childAccountId}` so
 * the governed dispatch dedups a redelivered job (per-child, NOT per-job — the
 * job idempotency key does not apply across multiple sibling dispatches).
 *
 * Partial-failure policy: a child dispatch failure is logged and the handler
 * continues to the next child (the succeeded children should not be retried —
 * idempotent overwrite is harmless but adds load + log noise). If ALL children
 * fail, the handler throws so the retry / DLQ path engages and the parent's
 * cascade is re-attempted.
 */

import type {
  AsyncReactionHandler,
  AsyncReactionHandlerContext,
} from "..";

/** Reaction name registered with {@link asyncReactionRegistry}. */
export const CHART_OF_ACCOUNT_DEACTIVATED_DEACTIVATE_CHILDREN_REACTION =
  "chartOfAccountDeactivatedDeactivateChildren";

interface ChartOfAccountRow {
  deletedAt?: unknown;
  id?: unknown;
  isActive?: unknown;
  parentId?: unknown;
  tenantId?: unknown;
}

interface ManifestStore {
  getAll(): Promise<unknown[]>;
}

/**
 * Handler implementation. Exposed for direct unit testing (the registry
 * registers a thin wrapper around it).
 */
export const chartOfAccountDeactivatedDeactivateChildrenHandler: AsyncReactionHandler =
  async (ctx: AsyncReactionHandlerContext): Promise<void> => {
    const { job, dispatchCommand, storeProvider, log } = ctx;
    const parentAccountId = job.triggeringEvent.subjectId;
    const tenantId = job.tenantId;

    if (!parentAccountId) {
      log.warn?.(
        "chartOfAccountDeactivatedDeactivateChildren: missing subjectId — skipping",
        { jobId: job.id }
      );
      return;
    }

    const store = storeProvider("ChartOfAccount") as ManifestStore | undefined;
    if (!store) {
      throw new Error("ChartOfAccount store unavailable");
    }

    const activeChildren = (await store.getAll())
      .map((row) => row as ChartOfAccountRow)
      .filter(
        (row) =>
          asNonEmptyString(row.tenantId) === tenantId &&
          asNonEmptyString(row.parentId) === parentAccountId &&
          row.deletedAt == null &&
          row.isActive === true
      );

    if (activeChildren.length === 0) {
      return;
    }

    let failures = 0;
    for (const child of activeChildren) {
      const childId = asNonEmptyString(child.id);
      if (!childId) continue;

      const result = await dispatchCommand(
        // deactivate() takes no params.
        "deactivate",
        {},
        {
          entityName: "ChartOfAccount",
          instanceId: childId,
          correlationId: parentAccountId,
          causationId: "ChartOfAccountDeactivated",
          // Per-child key — a job-level idempotencyKey would collide across
          // sibling dispatches, so the computed key is authoritative here.
          idempotencyKey: `coa-deactivated:${tenantId}:${parentAccountId}:${childId}`,
        }
      );
      if (!result.success) {
        failures++;
        log.warn?.(
          "chartOfAccountDeactivatedDeactivateChildren: child dispatch failed",
          {
            jobId: job.id,
            parentAccountId,
            childId,
            error: result.error ?? "unknown",
          }
        );
      }
    }

    // A partial failure does NOT throw — the children that succeeded should
    // not be retried (idempotent overwrite is harmless, but it adds load +
    // log noise). If ALL children fail, surface as a hard failure so the
    // retry/DLQ path engages and the parent's cascade is re-attempted.
    if (failures > 0 && failures === activeChildren.length) {
      throw new Error(
        `ChartOfAccount.deactivate failed for all ${failures} child(ren) of ${parentAccountId}: ${job.id}`
      );
    }
  };

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
