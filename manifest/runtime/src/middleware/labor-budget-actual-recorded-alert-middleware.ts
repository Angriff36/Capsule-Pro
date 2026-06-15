/**
 * LaborBudget-actual-recorded → BudgetAlert-create middleware.
 *
 * Completes the staffing/labor propagation "when a labor budget's actual spend is
 * recorded and it goes over target, automatically open a budget alert" — so an
 * over-budget labor period no longer stays silent until someone notices the number.
 * Without this, `LaborBudgetActualRecorded` (labor-budget-rules.manifest:231) had ZERO
 * consumers: recording an actual flipped the stored `actualSpend` and emitted the event,
 * but nothing ever created the `BudgetAlert` the dashboards read. (The app-side
 * `createBudgetAlert` helper in `apps/api/lib/staff/labor-budget.ts:681` is exported but
 * never called from anywhere, and its `alertType` enum doesn't even match the governed
 * `BudgetAlert.create` guard — so there is NO existing over-budget alert path and thus no
 * double-apply hazard.)
 *
 * WHY this is middleware and not a reaction (the crux):
 * `LaborBudget.recordActual(actualSpend)` is a MUTATE command, so the engine's emitted
 * payload is `{ ...commandInput, result }` — it carries the `actualSpend` PARAM but NOT
 * the budget's OWN `budgetTarget`/`tenantId` (declared event fields like
 * `LaborBudgetActualRecorded.tenantId` are NEVER auto-populated from `self.*`). Deciding
 * "is this now OVER budget?" requires comparing the post-mutation `actualSpend` against
 * the budget's `budgetTarget`, which a reaction's payload cannot read. This middleware
 * loads the LaborBudget from the store via `_subject.id` (the engine-cleaner mechanism for
 * entity-owned fields), compares `actualSpend > budgetTarget`, and only then dispatches
 * the governed `BudgetAlert.create`.
 *
 * Scope + safety:
 *  - Fires only on genuine OVER-budget (`actualSpend > budgetTarget`); the common
 *    under-budget recording is a quiet no-op (no alert, no log spam). Threshold-warning
 *    tiers (80 %/90 %) are a deferred follow-on — this leg is the "over target" alert the
 *    plan calls for.
 *  - Idempotent: skips when an UNRESOLVED `overage` BudgetAlert already exists for the
 *    budget, so repeatedly recording actuals while still over budget cannot pile up
 *    duplicate alerts; once the alert is resolved a later over-budget recording can open a
 *    fresh one. A stable `idempotencyKey` (keyed on the recorded spend) is a second
 *    backstop against a re-emitted identical event.
 *  - Skips a non-positive `budgetTarget` (utilization is undefined and `recordActual`
 *    already requires an approved budget, which requires a positive target) — reported via
 *    `onDiagnostic`, never a swallowed failure.
 *  - Policy aligns: `recordActual` and `BudgetAlert.create` share the same
 *    finance/finance_manager/manager/admin policy, so the recording actor can always
 *    dispatch the alert — no per-call identity override needed.
 * Every skip and failure reports through `onDiagnostic` — never silent.
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

export interface LaborBudgetActualRecordedAlertDiagnostic {
  alertId?: string;
  budgetId?: string;
  detail?: Record<string, unknown>;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface LaborBudgetActualRecordedAlertMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: LaborBudgetActualRecordedAlertDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface LaborBudgetLike {
  actualSpend?: unknown;
  budgetTarget?: unknown;
  tenantId?: unknown;
}

interface BudgetAlertLike {
  alertType?: unknown;
  budgetId?: unknown;
  resolved?: unknown;
  tenantId?: unknown;
}

const OVERAGE_ALERT_TYPE = "overage";

const defaultDiagnostic = (
  diag: LaborBudgetActualRecordedAlertDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[labor-budget-alert:${diag.stage}] ${diag.reason}`, {
    alertId: diag.alertId,
    budgetId: diag.budgetId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createLaborBudgetActualRecordedAlertMiddleware(
  options: LaborBudgetActualRecordedAlertMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  const deps: AlertDeps = { storeProvider, dispatchCommand, onDiagnostic };

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const recordedEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "LaborBudgetActualRecorded" &&
          ctx.entityName === "LaborBudget" &&
          ctx.command.name === "recordActual"
      );

      for (const event of recordedEvents) {
        await processRecordedBudgetEvent(deps, ctx, event);
      }

      return {};
    },
  };
}

interface AlertDeps {
  dispatchCommand: DispatchCommand;
  onDiagnostic: (diag: LaborBudgetActualRecordedAlertDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface EmittedEventLike {
  payload?: unknown;
  subject?: { id?: unknown };
}

/**
 * Process a single `LaborBudgetActualRecorded` event: load the budget, decide whether
 * it is over target, and dispatch the governed `BudgetAlert.create` if so. Extracted from
 * the handler loop to keep each unit's cyclomatic complexity within the lint budget.
 */
async function processRecordedBudgetEvent(
  deps: AlertDeps,
  ctx: MiddlewareContext,
  event: EmittedEventLike
): Promise<void> {
  const { storeProvider, dispatchCommand, onDiagnostic } = deps;

  const payload = event.payload as { tenantId?: unknown } | undefined;
  const budgetId =
    asNonEmptyString(event.subject?.id) ?? asNonEmptyString(ctx.instanceId);
  if (!budgetId) {
    onDiagnostic({
      stage: "resolve",
      reason: "LaborBudgetActualRecorded missing budgetId",
    });
    return;
  }

  const budgetStore = storeProvider("LaborBudget");
  const alertStore = storeProvider("BudgetAlert");
  if (!(budgetStore && alertStore)) {
    onDiagnostic({
      stage: "stores",
      reason: "LaborBudget or BudgetAlert store unavailable — alert not opened",
      budgetId,
      detail: { laborBudget: !!budgetStore, budgetAlert: !!alertStore },
    });
    return;
  }

  const budget = (await budgetStore.getById(budgetId)) as
    | LaborBudgetLike
    | undefined;
  if (!budget) {
    onDiagnostic({
      stage: "load",
      reason: "recorded labor budget not found in store — cannot alert",
      budgetId,
    });
    return;
  }

  const tenantId =
    asNonEmptyString(budget.tenantId) ??
    asNonEmptyString(payload?.tenantId) ??
    asNonEmptyString(
      (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)?.tenantId
    );
  if (!tenantId) {
    onDiagnostic({
      stage: "resolve",
      reason: "LaborBudgetActualRecorded missing tenantId",
      budgetId,
    });
    return;
  }

  const budgetTarget = asFiniteNumber(budget.budgetTarget) ?? 0;
  const actualSpend = asFiniteNumber(budget.actualSpend) ?? 0;

  // A non-positive target has no meaningful utilization (and recordActual already
  // requires an approved budget, which requires budgetTarget > 0).
  if (budgetTarget <= 0) {
    onDiagnostic({
      stage: "target",
      reason: `budgetTarget not positive (${String(budget.budgetTarget)}) — cannot compute over-budget alert`,
      budgetId,
      tenantId,
    });
    return;
  }

  // The common path: still within budget. Quiet no-op — no alert, no log spam.
  if (actualSpend <= budgetTarget) {
    return;
  }

  // Idempotency: at most one UNRESOLVED overage alert per budget, so recording
  // actuals repeatedly while over budget never piles up duplicates.
  const existing = (await alertStore.getAll()).find((row) => {
    const alert = row as BudgetAlertLike;
    return (
      asNonEmptyString(alert.tenantId) === tenantId &&
      asNonEmptyString(alert.budgetId) === budgetId &&
      asNonEmptyString(alert.alertType) === OVERAGE_ALERT_TYPE &&
      alert.resolved !== true
    );
  });
  if (existing) {
    onDiagnostic({
      stage: "dedupe",
      reason: "an unresolved overage alert already exists for budget — skip",
      budgetId,
      tenantId,
    });
    return;
  }

  // utilization as a percentage of target, 2-decimal precision.
  const utilization = Math.round((actualSpend / budgetTarget) * 10_000) / 100;
  const message = `Labor budget exceeded: actual ${actualSpend} of target ${budgetTarget} (${utilization}% utilization)`;

  const alertId = randomUUID();
  const result = await dispatchCommand(
    "create",
    {
      // For a create the new id travels in the body, NOT as instanceId — instanceId
      // targets an existing instance and the row is never persisted (see
      // lead-converted-deal-create-middleware / invoice-overdue).
      id: alertId,
      tenantId,
      budgetId,
      alertType: OVERAGE_ALERT_TYPE,
      utilization,
      message,
    },
    {
      entityName: "BudgetAlert",
      correlationId:
        asNonEmptyString((ctx as { correlationId?: unknown }).correlationId) ??
        budgetId,
      causationId: "LaborBudgetActualRecorded",
      idempotencyKey: `labor-budget-alert:${tenantId}:${budgetId}:overage:${actualSpend}`,
    }
  );
  if (result.emittedEvents) {
    ctx.emittedEvents.push(...result.emittedEvents);
  }
  if (!result.success) {
    onDiagnostic({
      stage: "create",
      reason: `BudgetAlert.create failed: ${result.error ?? "unknown"}`,
      alertId,
      budgetId,
      tenantId,
    });
    return;
  }

  onDiagnostic({
    stage: "done",
    reason: `overage budget alert opened (utilization ${utilization}%)`,
    alertId,
    budgetId,
    tenantId,
  });
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  // money/decimal fields may surface as strings from some stores.
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return;
}
