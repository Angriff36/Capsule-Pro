/**
 * PayrollRunPaid → close TipPool(s) + notify paid employees middleware
 * (IMPLEMENTATION_PLAN P1, Staffing → "PayrollRunPaid → lock period / close tip
 * pool / notify"). The `lock period` leg already ships as
 * `payroll-run-paid-period-lock-middleware.ts`; this file adds the two REMAINING
 * legs of the same plan item, both fanning out off the SAME `PayrollRunPaid` event.
 *
 * WHY this exists:
 *   - Leg 1 (close tip pools): a `TipPool` is pay-period-scoped; once the period's
 *     payroll run is PAID, its tips have been paid out as part of payroll, so the
 *     pool should leave the active workflow and close. `TipPool.close` was
 *     unreachable from the payroll lifecycle — paid-out pools sat `allocated`/
 *     `distributed` forever.
 *   - Leg 2 (notify employees): paying a run is the moment each employee on it
 *     should be told their pay was processed. `PayrollRunPaid` had no notify
 *     consumer, so `/notifications` was blind to it.
 *
 * WHY middleware and not a reaction (the structural reasons, per the verified
 * engine-semantics correction in IMPLEMENTATION_PLAN P0):
 *   - `PayrollRun.markPaid()` takes NO params and is a MUTATE (last mutate
 *     `paidAt = now()`), so the emitted payload is `{ ...commandInput, result }`
 *     where `result` is a timestamp scalar — NOT the run instance, and declared
 *     event fields are never auto-populated from `self.*`.
 *   - Leg 1: the pools to close are found via the
 *     `PayrollRun.payrollPeriodId → PayrollPeriod.id ← TipPool.periodId` chain.
 *     `TipPool` has NO direct `payrollRunId` FK, and `payrollPeriodId` is the run's
 *     OWN field (not a `markPaid` param), so the middleware must LOAD the run via
 *     `_subject.id` to read it, then SCAN the TipPool store by `periodId`. It is
 *     also a 1:N fan-out (a period may have several pools).
 *   - Leg 2: the recipients are the distinct `employeeId`s on the run's
 *     `PayrollLineItem` rows (`belongsTo employee: User`) — never on the event
 *     payload; they must be QUERIED from the store by `payrollRunId`. Another 1:N
 *     fan-out a single-target reaction cannot do.
 *
 * Guard-safe + idempotent:
 *   - `TipPool.close()` guards `self.status in ["allocated", "distributed"]` and
 *     transitions to `closed` (terminal). The middleware mirrors that guard, so an
 *     `open` pool (nothing allocated yet) or an already-`closed` pool is skipped
 *     cleanly via `onDiagnostic`, never a swallowed transition failure. Key per pool
 *     (`...:close`); closing is terminal so a re-emit can't double-close.
 *   - Notifications dedupe per `(tenant, runId, employeeId)`; `markPaid` is a
 *     single-shot FSM transition (approved→paid) so the event itself won't re-fire.
 *
 * The two legs are independent: a failure/skip in one does not block the other (a
 * run with no period still notifies its employees; a run with no line items still
 * closes its pools).
 *
 * KNOWN LIMITATION (documented, not silent): each dispatched command runs as the
 * SAME actor who marked the run paid. `Notification.create`'s default policy is
 * `user.role in ["manager", "admin"]` and `TipPool.close` is `manager`/`admin` —
 * marking a run paid is itself a finance/admin action, so the common path aligns;
 * a lower-privilege actor (were one ever able to reach `markPaid`) would get a
 * policy-denied diagnostic + skip rather than a created/closed effect (the runtime
 * has no per-call identity override). Same class as the schedule-published /
 * deal-assign notify legs.
 */

import { randomUUID } from "node:crypto";
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

export interface PayrollRunPaidCascadeDiagnostic {
  detail?: Record<string, unknown>;
  employeeId?: string;
  leg?: "close-tip-pools" | "notify-employees";
  periodId?: string;
  reason: string;
  runId?: string;
  stage: string;
  tenantId?: string;
  tipPoolId?: string;
}

export interface PayrollRunPaidCascadeMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: PayrollRunPaidCascadeDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
}

interface PayrollRunLike {
  payrollPeriodId?: unknown;
  tenantId?: unknown;
}

interface TipPoolLike {
  periodId?: unknown;
  status?: unknown;
  tenantId?: unknown;
}

interface PayrollLineItemLike {
  deletedAt?: unknown;
  employeeId?: unknown;
  payrollRunId?: unknown;
  tenantId?: unknown;
}

// close() guards `self.status in ["allocated", "distributed"]` (TipPool FSM:
// open→allocated→{distributed,open}→ distributed→closed). An `open` pool (nothing
// allocated to close) or an already-`closed` pool is skipped cleanly.
const CLOSABLE_TIP_POOL_STATUSES = new Set(["allocated", "distributed"]);

const NOTIFICATION_TYPE = "payroll_run_paid";
const NOTIFICATION_TITLE = "Your payroll has been paid";
const NOTIFICATION_BODY =
  "Your payroll run has been processed and paid. View your latest pay details.";

const defaultDiagnostic = (diag: PayrollRunPaidCascadeDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[payroll-run-paid-cascade:${diag.stage}] ${diag.reason}`, {
    leg: diag.leg,
    periodId: diag.periodId,
    tipPoolId: diag.tipPoolId,
    employeeId: diag.employeeId,
    runId: diag.runId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createPayrollRunPaidCascadeMiddleware(
  options: PayrollRunPaidCascadeMiddlewareOptions
): Middleware {
  const { storeProvider, dispatchCommand, onDiagnostic = defaultDiagnostic } =
    options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const paidEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "PayrollRunPaid" &&
          ctx.entityName === "PayrollRun" &&
          ctx.command.name === "markPaid"
      );

      for (const event of paidEvents) {
        const payload = event.payload as { tenantId?: unknown } | undefined;
        const runId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        const correlationId =
          asNonEmptyString((ctx as { correlationId?: unknown }).correlationId) ??
          runId;

        if (!(runId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `PayrollRunPaid missing ${runId ? "tenantId" : "runId"}`,
            runId,
            tenantId,
          });
          continue;
        }

        await closeTipPools(ctx, {
          correlationId,
          dispatchCommand,
          onDiagnostic,
          runId,
          storeProvider,
          tenantId,
        });

        await notifyEmployees(ctx, {
          correlationId,
          dispatchCommand,
          onDiagnostic,
          runId,
          storeProvider,
          tenantId,
        });
      }

      return {};
    },
  };
}

interface LegArgs {
  correlationId: string | undefined;
  dispatchCommand: DispatchCommand;
  onDiagnostic: (diag: PayrollRunPaidCascadeDiagnostic) => void;
  runId: string;
  storeProvider: (entityName: string) => Store | undefined;
  tenantId: string;
}

/**
 * Leg 1: close every closable TipPool belonging to the paid run's pay period.
 * Resolves the period via the run (payrollPeriodId is the run's OWN field), then
 * scans the TipPool store by periodId.
 */
async function closeTipPools(
  ctx: MiddlewareContext,
  args: LegArgs
): Promise<void> {
  const { correlationId, dispatchCommand, onDiagnostic, runId, storeProvider, tenantId } =
    args;

  const runStore = storeProvider("PayrollRun");
  const tipPoolStore = storeProvider("TipPool");
  if (!(runStore && tipPoolStore)) {
    onDiagnostic({
      leg: "close-tip-pools",
      stage: "stores",
      reason: "PayrollRun or TipPool store unavailable — tip pools not closed",
      runId,
      tenantId,
      detail: { payrollRun: !!runStore, tipPool: !!tipPoolStore },
    });
    return;
  }

  const run = (await runStore.getById(runId)) as PayrollRunLike | undefined;
  if (!run) {
    onDiagnostic({
      leg: "close-tip-pools",
      stage: "load",
      reason: "payroll run not found in store — cannot resolve its pay period",
      runId,
      tenantId,
    });
    return;
  }

  // payrollPeriodId is the run's OWN field — the reason this is middleware. The
  // TipPool→PayrollRun link only exists through the shared PayrollPeriod.
  const periodId = asNonEmptyString(run.payrollPeriodId);
  if (!periodId) {
    onDiagnostic({
      leg: "close-tip-pools",
      stage: "periodId",
      reason: "payroll run has no payrollPeriodId — no pay period to close pools for",
      runId,
      tenantId,
    });
    return;
  }

  const closable: string[] = [];
  for (const row of (await tipPoolStore.getAll()).map(
    (r) => r as TipPoolLike & { id?: unknown }
  )) {
    if (asNonEmptyString(row.tenantId) !== tenantId) {
      continue;
    }
    if (asNonEmptyString(row.periodId) !== periodId) {
      continue;
    }
    const status = asNonEmptyString(row.status);
    if (!(status && CLOSABLE_TIP_POOL_STATUSES.has(status))) {
      // open (nothing allocated) or already-closed — skip cleanly, mirroring the
      // close() guard so this is never a swallowed transition failure.
      continue;
    }
    const poolId = asNonEmptyString(row.id);
    if (poolId) {
      closable.push(poolId);
    }
  }

  if (closable.length === 0) {
    onDiagnostic({
      leg: "close-tip-pools",
      stage: "pools",
      reason: "no allocated/distributed tip pools for this pay period — nothing to close",
      periodId,
      runId,
      tenantId,
    });
    return;
  }

  for (const tipPoolId of closable) {
    const result = await dispatchCommand(
      "close",
      {
        // close() is a no-param MUTATE on the existing TipPool; the id is supplied
        // BOTH in the body and as instanceId (same shape as the sibling lock leg).
        id: tipPoolId,
        tenantId,
      },
      {
        entityName: "TipPool",
        instanceId: tipPoolId,
        correlationId: correlationId ?? runId,
        causationId: "PayrollRunPaid",
        idempotencyKey: `payroll-run-paid-close-tippool:${tenantId}:${tipPoolId}:close`,
      }
    );
    if (result.emittedEvents) {
      ctx.emittedEvents.push(...result.emittedEvents);
    }
    if (!result.success) {
      onDiagnostic({
        leg: "close-tip-pools",
        stage: "close-dispatch",
        reason: `TipPool.close failed: ${result.error ?? "unknown"}`,
        periodId,
        tipPoolId,
        runId,
        tenantId,
      });
      continue;
    }
  }

  onDiagnostic({
    leg: "close-tip-pools",
    stage: "done",
    reason: "closed pay-period tip pools after the run was marked paid",
    periodId,
    runId,
    tenantId,
    detail: { closedCount: closable.length },
  });
}

/**
 * Leg 2: notify each distinct employee on the paid run. Recipients are the distinct
 * employeeIds across the run's PayrollLineItem rows (queried by payrollRunId — a
 * direct FK on the line item).
 */
async function notifyEmployees(
  ctx: MiddlewareContext,
  args: LegArgs
): Promise<void> {
  const { dispatchCommand, onDiagnostic, runId, storeProvider, tenantId } = args;

  const lineItemStore = storeProvider("PayrollLineItem");
  if (!lineItemStore) {
    onDiagnostic({
      leg: "notify-employees",
      stage: "stores",
      reason: "PayrollLineItem store unavailable — employees not notified",
      runId,
      tenantId,
    });
    return;
  }

  // Distinct recipients: this run's line-item employees. An employee with more than
  // one line item is notified once; soft-deleted line items confer no notification.
  const recipients = new Set<string>();
  for (const row of (await lineItemStore.getAll()).map(
    (r) => r as PayrollLineItemLike
  )) {
    if (asNonEmptyString(row.tenantId) !== tenantId) {
      continue;
    }
    if (asNonEmptyString(row.payrollRunId) !== runId) {
      continue;
    }
    if (isRemoved(row.deletedAt)) {
      continue;
    }
    const employeeId = asNonEmptyString(row.employeeId);
    if (employeeId) {
      recipients.add(employeeId);
    }
  }

  if (recipients.size === 0) {
    onDiagnostic({
      leg: "notify-employees",
      stage: "recipients",
      reason: "no line-item employees for this paid run — nobody to notify",
      runId,
      tenantId,
      detail: { recipientCount: 0 },
    });
    return;
  }

  for (const employeeId of recipients) {
    const result = await dispatchCommand(
      "create",
      {
        // For a create the new id travels in the body, NOT as instanceId.
        id: randomUUID(),
        tenantId,
        recipientEmployeeId: employeeId,
        notificationType: NOTIFICATION_TYPE,
        title: NOTIFICATION_TITLE,
        body: NOTIFICATION_BODY,
        actionUrl: "",
        correlationId: runId,
      },
      {
        entityName: "Notification",
        correlationId: runId,
        causationId: "PayrollRunPaid",
        idempotencyKey: `payroll-run-paid-notify:${tenantId}:${runId}:${employeeId}`,
      }
    );
    if (result.emittedEvents) {
      ctx.emittedEvents.push(...result.emittedEvents);
    }
    if (!result.success) {
      onDiagnostic({
        leg: "notify-employees",
        stage: "create",
        reason: `Notification.create failed: ${result.error ?? "unknown"}`,
        employeeId,
        runId,
        tenantId,
      });
      continue;
    }
  }

  onDiagnostic({
    leg: "notify-employees",
    stage: "done",
    reason: "notified employees that their payroll run was paid",
    runId,
    tenantId,
    detail: { recipientCount: recipients.size },
  });
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** A removed line item carries a non-null/non-empty `deletedAt`. */
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
