/**
 * ChartOfAccountDeactivated → deactivate the account's child accounts.
 *
 * Implements the orphan-event mop-up "ChartOfAccountDeactivated → deactivate
 * children" (IMPLEMENTATION_PLAN: Lifecycle propagation, line 197). Before this,
 * `ChartOfAccountDeactivated` (core/chart-of-account-rules.manifest:83, emitted by
 * `ChartOfAccount.deactivate`) had ZERO consumers: deactivating a parent general-
 * ledger account left every sub-account that points at it (`parentId`) ACTIVE, so
 * the chart of accounts kept offering retired sub-accounts for posting and the
 * `belongsTo parent` relationship resolved a live child under a dead parent.
 * This closes that hole: one governed `ChartOfAccount.deactivate` fans out to
 * `ChartOfAccount.deactivate` for every active, non-deleted child keyed by `parentId`.
 *
 * WHY this cascade is SAFE (the permanent-vs-reversible test the plan applies to
 * every cascade): `ChartOfAccount.deactivate` → `isActive = false` is effectively
 * TERMINAL. There is no `activate` command, and the only field-flip path back
 * (`update`'s `mutate isActive = isActive`) is itself blocked by `update`'s own
 * guard `self.isActive == true "Cannot update an inactive account"` — an inactive
 * account cannot be updated, so it cannot be reactivated. Cascading an irreversible
 * deactivate down the hierarchy therefore cannot be contradicted later, mirroring
 * the VendorBlacklisted (permanent) precedent — unlike the reversible suspend/
 * setActive legs that intentionally have no destructive cascade.
 *
 * WHY middleware and not a reaction: this is a 1:N fan-out — one deactivated parent
 * has MANY children, resolved by `parentId`. A declarative `on ChartOfAccountDeactivated
 * run ChartOfAccount.deactivate` reaction resolves exactly ONE target instance, so it
 * structurally cannot reach the set (same reason as the VendorBlacklisted cascade). The
 * parent's id is also reachable only as the engine-stamped `event.subject?.id` — the
 * declared `accountId` event field is NOT auto-populated from `self.*`, and `deactivate`
 * takes no params — and the event carries no `tenantId`, so tenancy comes from the
 * runtime context.
 *
 * FULL-SUBTREE behaviour is intentional and free: deactivating a child re-emits
 * `ChartOfAccountDeactivated`, which re-enters this middleware (re-entrant dispatch,
 * same pattern as the EventCancelled cascade), deactivating grandchildren and on down.
 * Termination is guaranteed by `deactivate`'s `self.isActive == true` guard — each node
 * is deactivated at most once, so even a malformed `parentId` cycle cannot loop.
 *
 * GUARD-SAFE + IDEMPOTENT: only children that are still `isActive == true` and not
 * soft-deleted are dispatched, so already-inactive / deleted children are skipped rather
 * than spamming swallowed guard failures. A re-emitted `ChartOfAccountDeactivated` finds
 * no active children and no-ops.
 *
 * POLICY: each dispatched `deactivate` runs as the actor who deactivated the parent and
 * is subject to ChartOfAccount's policy (finance / finance_manager / manager / admin) —
 * the SAME entity and policy as the triggering command, so the actor always aligns
 * (no policy-skip class). A failure still surfaces through `onDiagnostic`.
 */

import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";
import type { AsyncDispatch } from "../async-reactions";
import {
  captureTriggeringEvents,
  CHART_OF_ACCOUNT_DEACTIVATED_DEACTIVATE_CHILDREN_REACTION,
} from "../async-reactions";

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

export interface ChartOfAccountDeactivatedDeactivateChildrenDiagnostic {
  childAccountId?: string;
  detail?: Record<string, unknown>;
  parentAccountId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface ChartOfAccountDeactivatedDeactivateChildrenMiddlewareOptions {
  asyncEnqueue?: AsyncDispatch;
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (
    diag: ChartOfAccountDeactivatedDeactivateChildrenDiagnostic
  ) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface ChartOfAccountRow {
  deletedAt?: unknown;
  id?: unknown;
  isActive?: unknown;
  parentId?: unknown;
  tenantId?: unknown;
}

const defaultDiagnostic = (
  diag: ChartOfAccountDeactivatedDeactivateChildrenDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(
    `[chart-of-account-deactivate-children:${diag.stage}] ${diag.reason}`,
    {
      parentAccountId: diag.parentAccountId,
      tenantId: diag.tenantId,
      childAccountId: diag.childAccountId,
      ...diag.detail,
    }
  );
};

interface ProcessDeps {
  ctx: MiddlewareContext;
  dispatchCommand: DispatchCommand;
  onDiagnostic: (
    diag: ChartOfAccountDeactivatedDeactivateChildrenDiagnostic
  ) => void;
  parentAccountId: string;
  tenantId: string;
}

/**
 * Dispatch the governed `deactivate` for a single active child and bubble its
 * events. Re-entrant: the nested dispatch re-emits ChartOfAccountDeactivated and
 * re-enters this middleware, so the WHOLE subtree deactivates; the isActive guard
 * guarantees termination.
 */
async function deactivateChild(
  childId: string,
  deps: ProcessDeps
): Promise<void> {
  const { ctx, dispatchCommand, onDiagnostic, parentAccountId, tenantId } =
    deps;
  // deactivate() takes no params.
  const result = await dispatchCommand(
    "deactivate",
    {},
    {
      entityName: "ChartOfAccount",
      instanceId: childId,
      correlationId: parentAccountId,
      causationId: "ChartOfAccountDeactivated",
      idempotencyKey: `chart-of-account-deactivate-children:${tenantId}:${childId}`,
    }
  );

  if (result.emittedEvents) {
    ctx.emittedEvents.push(...result.emittedEvents);
  }
  if (!result.success) {
    onDiagnostic({
      stage: "dispatch",
      reason: `ChartOfAccount.deactivate failed for child ${childId}: ${result.error ?? "unknown"}`,
      parentAccountId,
      tenantId,
      childAccountId: childId,
    });
    return;
  }

  onDiagnostic({
    stage: "done",
    reason: "ChartOfAccount.deactivate applied for child of deactivated parent",
    parentAccountId,
    tenantId,
    childAccountId: childId,
  });
}

/** Resolve, scan for active children, and cascade-deactivate each. */
async function processDeactivatedAccount(
  event: MiddlewareContext["emittedEvents"][number],
  storeProvider: (entityName: string) => Store | undefined,
  deps: Omit<ProcessDeps, "parentAccountId" | "tenantId">
): Promise<void> {
  const { ctx, onDiagnostic } = deps;
  // The parent account id is the engine-stamped source instance id — the declared
  // `accountId` event field is NOT auto-populated from self.*, and `deactivate`
  // takes no params (mirrors the VendorBlacklisted cascade reading event.subject?.id).
  // The event carries no tenantId, so tenancy comes from the runtime context.
  const parentAccountId = asNonEmptyString(event.subject?.id);
  const tenantId = asNonEmptyString(
    (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)?.tenantId
  );
  if (!(parentAccountId && tenantId)) {
    onDiagnostic({
      stage: "resolve",
      reason: `ChartOfAccountDeactivated missing ${parentAccountId ? "tenantId" : "accountId"}`,
      parentAccountId,
      tenantId,
    });
    return;
  }

  const store = storeProvider("ChartOfAccount");
  if (!store) {
    onDiagnostic({
      stage: "stores",
      reason:
        "ChartOfAccount store unavailable — child deactivation cascade skipped",
      parentAccountId,
      tenantId,
    });
    return;
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

  const childDeps: ProcessDeps = { ...deps, parentAccountId, tenantId };
  for (const row of activeChildren) {
    const childId = asNonEmptyString(row.id);
    if (childId) {
      await deactivateChild(childId, childDeps);
    }
  }
}

export function createChartOfAccountDeactivatedDeactivateChildrenMiddleware(
  options: ChartOfAccountDeactivatedDeactivateChildrenMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
    asyncEnqueue,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const deactivatedEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "ChartOfAccountDeactivated" &&
          ctx.entityName === "ChartOfAccount" &&
          ctx.command.name === "deactivate"
      );

      if (asyncEnqueue && deactivatedEvents.length > 0) {
        await captureTriggeringEvents({
          asyncEnqueue,
          ctx,
          events: deactivatedEvents,
          reactionName:
            CHART_OF_ACCOUNT_DEACTIVATED_DEACTIVATE_CHILDREN_REACTION,
        });
        return {};
      }

      for (const event of deactivatedEvents) {
        await processDeactivatedAccount(event, storeProvider, {
          ctx,
          dispatchCommand,
          onDiagnostic,
        });
      }

      return {};
    },
  };
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
