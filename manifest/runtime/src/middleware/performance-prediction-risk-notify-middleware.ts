/**
 * PerformancePrediction risk-notification middleware (Workforce AI, IMPLEMENTATION_PLAN
 * "WorkforceOptimization/PerformancePrediction → governed action").
 *
 * Completes a propagation the declarative DSL cannot express:
 *   - PerformancePredictionCreated → Notification.create for the predicted employee,
 *     but ONLY when the prediction flags a real risk (a high overtime-risk score, or a
 *     low productivity score). `PerformancePredictionCreated`
 *     (workforce-ai-rules.manifest:138) is an ORPHAN event today — nothing consumes it,
 *     so the AI generates predictions that surface to no one.
 *
 * WHY this is middleware and not a reaction (the crux):
 *
 *   The trigger fields (`employeeId`/`predictionType`/`predictionScore`/`confidence`)
 *   ARE genuine `PerformancePrediction.create` input params, so they DO ride the
 *   `{ ...commandInput, result }` payload — a reaction could read them. But the
 *   propagation is CONDITIONAL: only a risk-flagged prediction should alert (high
 *   `overtime_risk` score OR low `productivity` score; `attendance`/`skill_match`
 *   never alert). A Manifest reaction is an unconditional 1:1 event→command mapping —
 *   it cannot express "dispatch only when score crosses a per-type threshold", so it
 *   would fire a Notification for every prediction (noise) or none. The middleware
 *   encapsulates that routing decision. It also LOADS the prediction via `_subject.id`
 *   to read the authoritative `tenantId` (a TenantScoped field that is NOT a create
 *   param and is never auto-populated onto the event payload).
 *
 * KNOWN LIMITATION (documented, not silent): the dispatch runs as `system`
 * (`dispatchNotificationAsSystem` in the factory) so it always satisfies
 * `Notification.create`'s `system/manager/admin` policy regardless of who triggered
 * the prediction — predictions are an AI/manager action, and the alert is a system
 * signal, so system attribution is correct.
 *
 * Recipient choice (documented): the alert goes to the predicted employee
 * (`recipientEmployeeId = prediction.employeeId`) — overtime-risk / low-productivity
 * are the employee's own data and the actionable signal is theirs to see. Routing a
 * manager copy would require employee→manager resolution (not available on the
 * prediction) and is a separate, deferred leg (`AdminTask` to the manager).
 *
 * Guard-safe + idempotent: skips cleanly (with a diagnostic, never silent) when the
 * prediction is missing, has no employee, or is not risk-flagged. The dispatch
 * idempotency key is per prediction so a re-emitted event dedups; each prediction is
 * a distinct write-once row, so one prediction yields at most one alert.
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

export interface PerformancePredictionRiskNotifyDiagnostic {
  detail?: Record<string, unknown>;
  predictionId?: string;
  reason: string;
  recipient?: string;
  stage: string;
  tenantId?: string;
}

export interface PerformancePredictionRiskNotifyMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: PerformancePredictionRiskNotifyDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface PerformancePredictionLike {
  confidence?: unknown;
  employeeId?: unknown;
  predictionScore?: unknown;
  predictionType?: unknown;
  tenantId?: unknown;
}

// ponytail: fixed thresholds, not tenant config — upgrade to a per-tenant policy when
// ops wants to tune sensitivity. These mark the "risk" boundary the plan names
// ("low-productivity / high-overtime predictions").
const OVERTIME_RISK_THRESHOLD = 70; // overtime_risk: higher score = more risk
const LOW_PRODUCTIVITY_THRESHOLD = 40; // productivity: lower score = more risk

const defaultDiagnostic = (
  diag: PerformancePredictionRiskNotifyDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[prediction-risk-notify:${diag.stage}] ${diag.reason}`, {
    predictionId: diag.predictionId,
    recipient: diag.recipient,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createPerformancePredictionRiskNotifyMiddleware(
  options: PerformancePredictionRiskNotifyMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      if (ctx.entityName !== "PerformancePrediction") {
        return {};
      }

      const createdEvents = ctx.emittedEvents.filter(
        (event) => event.name === "PerformancePredictionCreated"
      );

      for (const event of createdEvents) {
        await notifyIfRisk(event, ctx);
      }

      return {};
    },
  };

  /** PerformancePredictionCreated → Notification.create when the prediction flags risk. */
  async function notifyIfRisk(
    // biome-ignore lint/suspicious/noExplicitAny: structural emitted-event row.
    event: any,
    ctx: MiddlewareContext
  ): Promise<void> {
    const predictionId =
      asNonEmptyString(event.subject?.id) ?? asNonEmptyString(ctx.instanceId);
    if (!predictionId) {
      onDiagnostic({
        stage: "resolve",
        reason: "PerformancePredictionCreated missing predictionId",
      });
      return;
    }

    const predictionStore = storeProvider("PerformancePrediction");
    const notificationStore = storeProvider("Notification");
    if (!(predictionStore && notificationStore)) {
      onDiagnostic({
        stage: "stores",
        reason:
          "PerformancePrediction or Notification store unavailable — employee not notified",
        predictionId,
        detail: {
          prediction: !!predictionStore,
          notification: !!notificationStore,
        },
      });
      return;
    }

    const prediction = (await predictionStore.getById(predictionId)) as
      | PerformancePredictionLike
      | undefined;
    if (!prediction) {
      onDiagnostic({
        stage: "load",
        reason:
          "prediction not found in store — cannot build risk notification",
        predictionId,
      });
      return;
    }

    // tenantId is the prediction's OWN field (TenantScoped); it does not ride the
    // create payload. Prefer the entity, fall back to the runtime context.
    const payload = event.payload as { tenantId?: unknown } | undefined;
    const tenantId =
      asNonEmptyString(prediction.tenantId) ??
      asNonEmptyString(payload?.tenantId) ??
      asNonEmptyString(
        (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
          ?.tenantId
      );
    if (!tenantId) {
      onDiagnostic({
        stage: "tenant",
        reason: "could not resolve tenantId — skip notification",
        predictionId,
      });
      return;
    }

    const recipient = asNonEmptyString(prediction.employeeId);
    if (!recipient) {
      onDiagnostic({
        stage: "recipient",
        reason: "prediction has no employee — nothing to notify",
        predictionId,
        tenantId,
      });
      return;
    }

    const predictionType = asNonEmptyString(prediction.predictionType) ?? "";
    const score = asFiniteNumber(prediction.predictionScore) ?? 0;
    const confidence = asNonEmptyString(prediction.confidence) ?? "medium";

    // THE ROUTING DECISION (why this is middleware): alert only on a flagged risk.
    const alert = riskAlertFor(predictionType, score);
    if (!alert) {
      // Not a risk-bearing prediction (or a non-routed type) — quiet no-op.
      return;
    }

    const notificationId = randomUUID();
    const result = await dispatchCommand(
      "create",
      {
        // For a create the new id travels in the body, NOT as instanceId.
        id: notificationId,
        tenantId,
        recipientEmployeeId: recipient,
        notificationType: "performance_risk",
        title: alert.title,
        body: `${alert.body} (${confidence} confidence)`,
        actionUrl: "",
        correlationId: predictionId,
      },
      {
        entityName: "Notification",
        correlationId:
          asNonEmptyString(
            (ctx as { correlationId?: unknown }).correlationId
          ) ?? predictionId,
        causationId: "PerformancePredictionCreated",
        // Per prediction: a re-emitted create event dedups to one alert.
        idempotencyKey: `prediction-risk-notify:${tenantId}:${predictionId}`,
      }
    );
    if (result.emittedEvents) {
      ctx.emittedEvents.push(...result.emittedEvents);
    }
    if (!result.success) {
      onDiagnostic({
        stage: "create",
        reason: `Notification.create failed (policy or guard): ${result.error ?? "unknown"}`,
        predictionId,
        tenantId,
        recipient,
      });
      return;
    }

    onDiagnostic({
      stage: "done",
      reason: `employee notified of ${predictionType} risk (score ${score})`,
      predictionId,
      tenantId,
      recipient,
    });
  }
}

/**
 * The per-type risk boundary. Returns the notification copy when the prediction is a
 * flagged risk, or `undefined` when it should not alert. This is the conditional a
 * reaction cannot express.
 */
function riskAlertFor(
  predictionType: string,
  score: number
): { body: string; title: string } | undefined {
  const rounded = Math.round(score);
  if (predictionType === "overtime_risk" && score >= OVERTIME_RISK_THRESHOLD) {
    return {
      title: `Overtime risk predicted: ${rounded}%`,
      body: `An overtime-risk score of ${rounded}% is forecast for the coming period. Review your scheduled hours.`,
    };
  }
  if (
    predictionType === "productivity" &&
    score <= LOW_PRODUCTIVITY_THRESHOLD
  ) {
    return {
      title: `Low productivity predicted: ${rounded}%`,
      body: `A productivity score of ${rounded}% is forecast for the coming period.`,
    };
  }
  // attendance, skill_match, and in-range productivity/overtime → no alert.
  return;
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return;
}
