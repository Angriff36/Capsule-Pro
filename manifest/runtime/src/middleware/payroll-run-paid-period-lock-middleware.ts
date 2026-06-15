/**
 * PayrollRunPaid → PayrollPeriod.lock middleware.
 *
 * Financial integrity: once a payroll run is marked PAID, its pay period must be
 * locked so the paid payroll becomes immutable (no reopen, no retroactive time-entry
 * edits flowing into a period that has already been paid out). Without this,
 * `PayrollRunPaid` (payroll-rules.manifest) has ZERO consumers — a period stays `open`
 * or `closed` after its run is paid and can still be reopened/edited, so paid payroll
 * could be silently altered after the fact. The intent is the designed one: the
 * `PayrollPeriod.lock` command's own comment says "Lock permanently once payroll has
 * been paid — period becomes immutable."
 *
 * WHY this is middleware and not a reaction (the crux):
 * `PayrollRun.markPaid()` takes NO params and is a MUTATE (last mutate `paidAt = now()`),
 * so the engine's emitted payload is `{ ...commandInput, result }` where `result` is a
 * timestamp scalar — NOT the run instance. The period to lock is
 * `PayrollRun.payrollPeriodId` — the run's OWN field, NOT a `markPaid` input param.
 * Declared event fields on `PayrollRunPaid` are NEVER auto-populated from `self.*`, so a
 * reaction reading `payload.payrollPeriodId` (or `payload.result.payrollPeriodId`) is a
 * silent no-op. This middleware instead LOADS the PayrollRun from the store via
 * `_subject.id`, reads `self.payrollPeriodId`, and dispatches the governed
 * `PayrollPeriod.lock`.
 *
 * Direct sibling of `payment-plan-completed-collection-case-resolve-middleware.ts`.
 *
 * Guard-safe + idempotent: `PayrollPeriod.lock()` guards `self.status == "closed"` and
 * mutates `status = "locked"` (FSM closed→locked only). The middleware mirrors the guard
 * so a skip is a clean no-op, never a swallowed guard/transition failure:
 *   - it only dispatches when the linked period is `closed` (the normal state once a
 *     period has been closed for payroll to run on);
 *   - an already-`locked` period (a second run paid against the same period) or a still-
 *     `open` period (paid before being closed — anomalous) is skipped with a diagnostic.
 * A static `idempotencyKey` per period dedups a re-emitted event; locking is terminal
 * (a locked period can't be re-locked) so this never collides with a legitimate second
 * lock. Every skip and failure reports through `onDiagnostic`.
 *
 * NOTE — the sibling legs of the plan item (`PayrollRunPaid → close TipPool` and
 * `→ notify employees`) are deliberately NOT implemented here: TipPool has no direct
 * `payrollRunId` FK (it must be resolved via the PayrollRun→PayrollPeriod→TipPool chain),
 * and the notify leg fans out to employees — both are separate increments tracked in
 * IMPLEMENTATION_PLAN.
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

export interface PayrollRunPaidPeriodLockDiagnostic {
  detail?: Record<string, unknown>;
  periodId?: string;
  reason: string;
  runId?: string;
  stage: string;
  tenantId?: string;
}

export interface PayrollRunPaidPeriodLockMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: PayrollRunPaidPeriodLockDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface PayrollRunLike {
  payrollPeriodId?: unknown;
  tenantId?: unknown;
}

interface PayrollPeriodLike {
  status?: unknown;
}

// lock() guards `self.status == "closed"` and the PayrollPeriod FSM allows
// closed→locked only. A period already `locked` (terminal) or still `open` cannot be
// locked from here, so skip it cleanly rather than producing a swallowed guard failure.
const LOCKABLE_PERIOD_STATUS = "closed";

const defaultDiagnostic = (diag: PayrollRunPaidPeriodLockDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[payroll-run-paid-lock:${diag.stage}] ${diag.reason}`, {
    periodId: diag.periodId,
    runId: diag.runId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createPayrollRunPaidPeriodLockMiddleware(
  options: PayrollRunPaidPeriodLockMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

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
        if (!(runId && tenantId)) {
          onDiagnostic({
            stage: "lock",
            reason: `PayrollRunPaid missing ${runId ? "tenantId" : "runId"}`,
            runId,
            tenantId,
          });
          continue;
        }

        const runStore = storeProvider("PayrollRun");
        const periodStore = storeProvider("PayrollPeriod");
        if (!(runStore && periodStore)) {
          onDiagnostic({
            stage: "stores",
            reason:
              "PayrollRun or PayrollPeriod store unavailable — period not locked",
            runId,
            tenantId,
            detail: {
              payrollRun: !!runStore,
              payrollPeriod: !!periodStore,
            },
          });
          continue;
        }

        const run = (await runStore.getById(runId)) as
          | PayrollRunLike
          | undefined;
        if (!run) {
          onDiagnostic({
            stage: "load",
            reason: "payroll run not found in store — cannot lock period",
            runId,
            tenantId,
          });
          continue;
        }

        // payrollPeriodId is the run's OWN field — the whole reason this is middleware.
        const periodId = asNonEmptyString(run.payrollPeriodId);
        if (!periodId) {
          onDiagnostic({
            stage: "periodId",
            reason: "payroll run has no payrollPeriodId — nothing to lock",
            runId,
            tenantId,
          });
          continue;
        }

        // Guard-safe: mirror lock()'s FSM guard so a skip is a clean no-op instead of a
        // swallowed transition failure (already-locked / still-open periods).
        const period = (await periodStore.getById(periodId)) as
          | PayrollPeriodLike
          | undefined;
        if (!period) {
          onDiagnostic({
            stage: "period-load",
            reason: "linked payroll period not found in store — cannot lock",
            periodId,
            runId,
            tenantId,
          });
          continue;
        }
        const periodStatus = asNonEmptyString(period.status);
        if (periodStatus !== LOCKABLE_PERIOD_STATUS) {
          onDiagnostic({
            stage: "period-status",
            reason: `payroll period not lockable (status="${periodStatus ?? "?"}", need "closed") — skip`,
            periodId,
            runId,
            tenantId,
          });
          continue;
        }

        const result = await dispatchCommand(
          "lock",
          {
            // lock() is a no-param MUTATE on the existing PayrollPeriod. The target id is
            // supplied BOTH in the body (`id`) AND as `instanceId` so the write-back
            // persists to the right row regardless of which the engine keys persistence
            // on (same shape as the sibling finance middleware).
            id: periodId,
            tenantId,
          },
          {
            entityName: "PayrollPeriod",
            instanceId: periodId,
            correlationId:
              asNonEmptyString(
                (ctx as { correlationId?: unknown }).correlationId
              ) ?? runId,
            causationId: "PayrollRunPaid",
            idempotencyKey: `payroll-run-paid-lock:${tenantId}:${periodId}:lock`,
          }
        );
        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "lock-dispatch",
            reason: `PayrollPeriod.lock failed: ${result.error ?? "unknown"}`,
            periodId,
            runId,
            tenantId,
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: "locked payroll period after its run was marked paid",
          periodId,
          runId,
          tenantId,
        });
      }

      return {};
    },
  };
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
