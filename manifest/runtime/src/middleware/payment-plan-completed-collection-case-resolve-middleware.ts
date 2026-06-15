/**
 * PaymentPlanCompleted → CollectionCase.markResolved middleware.
 *
 * Closes the collections payment-plan loop: when a collection payment plan's final
 * installment is recorded and the plan is marked COMPLETED, the underlying collection
 * case should be RESOLVED (provided its balance is actually settled). Without this,
 * `PaymentPlanCompleted` (collections-rules.manifest) has ZERO consumers — a fully-paid
 * plan leaves its case sitting ACTIVE in the dunning pipeline forever, so collections
 * keeps chasing a debt that has been paid off in full.
 *
 * WHY this is middleware and not a reaction (the crux):
 * `CollectionPaymentPlan.markCompleted()` takes NO params and is a MUTATE (last mutate
 * `completedAt = now()`), so the engine's emitted payload is `{ ...commandInput, result }`
 * where `result` is a timestamp scalar — NOT the plan instance. The case to resolve is
 * `CollectionPaymentPlan.collectionCaseId` — the plan's OWN field, NOT a `markCompleted`
 * input param. Declared event fields (`PaymentPlanCompleted.caseId`) are NEVER
 * auto-populated from `self.*`, so a reaction reading `payload.caseId` (or
 * `payload.result.caseId`) is a silent no-op. This middleware instead LOADS the
 * CollectionPaymentPlan from the store via `_subject.id`, reads `self.collectionCaseId`,
 * and dispatches the governed `CollectionCase.markResolved`.
 *
 * Direct sibling of `collection-written-off-invoice-write-off-middleware.ts`.
 *
 * Guard-safe + idempotent: `CollectionCase.markResolved` guards
 * `self.outstandingAmount <= 0.01` and mutates `status = "RESOLVED"` (reachable from
 * ACTIVE/IN_PROGRESS/LEGAL/DISPUTED). The middleware mirrors both so a skip is a clean
 * no-op, never a swallowed guard failure:
 *   - it only dispatches when the linked case is in a status that can still reach
 *     RESOLVED (an already-RESOLVED / WRITTEN_OFF / terminal case is skipped), and
 *   - it only dispatches when the case's remaining `outstandingAmount` is near zero —
 *     a completed plan that did NOT fully settle the case (residual debt) is left
 *     ACTIVE on purpose (resolving it would erase real money owed). This is correct:
 *     the case balance is driven by `CollectionCase.recordPayment` as real payments
 *     land; the plan installments are the schedule, so a properly-paid plan drives the
 *     case to zero and the case resolves, while an under-paid plan does not.
 * A static `idempotencyKey` per case dedups a re-emitted event; a plan completes once
 * (markCompleted guards status == "ACTIVE", terminal), so this never collides with a
 * legitimate second resolution. Every skip and failure reports through `onDiagnostic`.
 *
 * NOTE — the sibling leg `PaymentProcessed → CollectionCase.markResolved` is deliberately
 * NOT implemented here: a direct invoice payment (Payment.process → Invoice.applyPayment)
 * never decrements the *case's* `outstandingAmount`, so `markResolved`'s guard could not
 * pass on that path without first wiring case-balance mirroring from invoice payments —
 * a separate design decision tracked in IMPLEMENTATION_PLAN.
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

export interface PaymentPlanCollectionResolveDiagnostic {
  caseId?: string;
  detail?: Record<string, unknown>;
  planId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface PaymentPlanCompletedCollectionCaseResolveMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: PaymentPlanCollectionResolveDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface PaymentPlanLike {
  collectionCaseId?: unknown;
  tenantId?: unknown;
}

interface CollectionCaseLike {
  outstandingAmount?: unknown;
  status?: unknown;
}

// markResolved mutates status -> "RESOLVED", which the CollectionCase FSM allows only
// from these source states. A case already in a terminal state (RESOLVED/WRITTEN_OFF/
// DEFAULTED/CANCELLED) cannot reach RESOLVED again, so skip it cleanly instead of
// producing a swallowed transition failure.
const RESOLVABLE_CASE_STATUSES = new Set([
  "ACTIVE",
  "IN_PROGRESS",
  "LEGAL",
  "DISPUTED",
]);

// markResolved guards `self.outstandingAmount <= 0.01`. Mirror the threshold so a case
// with residual debt is a clean no-op (the plan completed but did not settle the case).
const SETTLED_OUTSTANDING_THRESHOLD = 0.01;

const defaultDiagnostic = (
  diag: PaymentPlanCollectionResolveDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[payment-plan-resolve:${diag.stage}] ${diag.reason}`, {
    caseId: diag.caseId,
    planId: diag.planId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createPaymentPlanCompletedCollectionCaseResolveMiddleware(
  options: PaymentPlanCompletedCollectionCaseResolveMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const completedEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "PaymentPlanCompleted" &&
          ctx.entityName === "CollectionPaymentPlan" &&
          ctx.command.name === "markCompleted"
      );

      for (const event of completedEvents) {
        const payload = event.payload as { tenantId?: unknown } | undefined;
        const planId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!(planId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `PaymentPlanCompleted missing ${planId ? "tenantId" : "planId"}`,
            planId,
            tenantId,
          });
          continue;
        }

        const planStore = storeProvider("CollectionPaymentPlan");
        const caseStore = storeProvider("CollectionCase");
        if (!(planStore && caseStore)) {
          onDiagnostic({
            stage: "stores",
            reason:
              "CollectionPaymentPlan or CollectionCase store unavailable — case not resolved",
            planId,
            tenantId,
            detail: {
              collectionPaymentPlan: !!planStore,
              collectionCase: !!caseStore,
            },
          });
          continue;
        }

        const plan = (await planStore.getById(planId)) as
          | PaymentPlanLike
          | undefined;
        if (!plan) {
          onDiagnostic({
            stage: "load",
            reason:
              "payment plan not found in store — cannot resolve collection case",
            planId,
            tenantId,
          });
          continue;
        }

        // collectionCaseId is the plan's OWN field — the whole reason this is middleware.
        const caseId = asNonEmptyString(plan.collectionCaseId);
        if (!caseId) {
          onDiagnostic({
            stage: "caseId",
            reason: "payment plan has no collectionCaseId — nothing to resolve",
            planId,
            tenantId,
          });
          continue;
        }

        // Guard-safe: mirror markResolved's FSM + outstanding-amount guard so a skip is
        // a clean no-op instead of a swallowed guard/transition failure.
        const collectionCase = (await caseStore.getById(caseId)) as
          | CollectionCaseLike
          | undefined;
        if (!collectionCase) {
          onDiagnostic({
            stage: "case-load",
            reason: "linked collection case not found in store — cannot resolve",
            caseId,
            planId,
            tenantId,
          });
          continue;
        }
        const caseStatus = asNonEmptyString(collectionCase.status);
        if (!(caseStatus && RESOLVABLE_CASE_STATUSES.has(caseStatus))) {
          onDiagnostic({
            stage: "case-status",
            reason: `collection case not in a resolvable status (status="${caseStatus ?? "?"}") — skip`,
            caseId,
            planId,
            tenantId,
          });
          continue;
        }
        const outstanding =
          asFiniteNumber(collectionCase.outstandingAmount) ?? 0;
        if (outstanding > SETTLED_OUTSTANDING_THRESHOLD) {
          onDiagnostic({
            stage: "outstanding",
            reason: `collection case still owes ${outstanding} after plan completion — left ACTIVE (not resolved)`,
            caseId,
            planId,
            tenantId,
          });
          continue;
        }

        const result = await dispatchCommand(
          "markResolved",
          {
            // markResolved is a no-param MUTATE on the existing CollectionCase. The
            // target id is supplied BOTH in the body (`id`) AND as `instanceId` so the
            // write-back persists to the right row regardless of which the engine keys
            // persistence on (same shape as the sibling finance middleware).
            id: caseId,
            tenantId,
          },
          {
            entityName: "CollectionCase",
            instanceId: caseId,
            correlationId:
              asNonEmptyString(
                (ctx as { correlationId?: unknown }).correlationId
              ) ?? planId,
            causationId: "PaymentPlanCompleted",
            idempotencyKey: `payment-plan-resolved:${tenantId}:${caseId}:resolve`,
          }
        );
        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "markResolved",
            reason: `CollectionCase.markResolved failed: ${result.error ?? "unknown"}`,
            caseId,
            planId,
            tenantId,
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: "resolved collection case after its payment plan completed",
          caseId,
          planId,
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

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  // money fields may surface as strings from some stores.
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
