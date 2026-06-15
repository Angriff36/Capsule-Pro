/**
 * QACheck failed → open a QACorrectiveAction
 * (IMPLEMENTATION_PLAN P1, "Kitchen QA/IoT → CorrectiveAction").
 *
 * WHY this exists: a failed kitchen quality check (temperature, sanitation,
 * storage, labeling, equipment) is a food-safety / compliance event that MUST
 * produce a tracked corrective action — the `QACheck.fail` command's own comment
 * says "callers should open a QACorrectiveAction" (qa-rules.manifest:59). But
 * `QACheckFailed` had ZERO consumers (verified: no `on QACheckFailed` reaction,
 * no middleware, no factory registration) and nothing in `apps/` ever called
 * `qACheckFail` followed by a corrective-action create — so a failed check
 * recorded the failure and then dropped it on the floor: no corrective action,
 * no follow-up, no audit trail of remediation. This middleware closes that gap
 * by opening the corrective action automatically on every failure.
 *
 * WHY middleware and not a reaction (the structural reason, per the verified
 * engine-semantics correction in IMPLEMENTATION_PLAN P0): `QACheck.fail` is a
 * MUTATE command, so the engine's emitted payload is `{ ...commandInput, result }`
 * where `result` is the last mutate's scalar (`completedAt`), NOT the check
 * instance. The corrective action's `relatedCheckId` linkage is the QACheck's
 * id (`_subject.id`) and the dispatch `tenantId` is the check's OWN `tenantId`
 * field — neither is a `fail` input param, and declared event fields
 * (`QACheckFailed.tenantId`/`checkType`/`location`) are NEVER auto-populated from
 * `self.*`. So the middleware LOADS the QACheck via `_subject.id` to read its
 * tenantId/checkType/location for a useful corrective-action description. The
 * genuine `fail` params (`inspector`, `notes`) DO ride the payload, so the
 * assignee and the description detail come from there. Same mechanism as the
 * maintenance-completed and certification-lapse legs.
 *
 * Field sourcing for the governed `QACorrectiveAction.create`:
 *  - `relatedCheckId` = the QACheck id (`_subject.id`) — the failure linkage.
 *  - `description`    = the inspector's `notes` (a `fail` param, on the payload)
 *                       when present, else a generated "<checkType> check failed
 *                       at <location>" line built from the loaded check
 *                       (`create` guards `description != ""`).
 *  - `assignedTo`     = the `inspector` (a `fail` param; `fail` guards it non-empty)
 *                       — whoever found the failure owns the initial remediation.
 *  - `severity`       = "high" (a failed food-safety check is high-severity;
 *                       satisfies `create`'s `severity in [low,medium,high,critical]`
 *                       guard). Refining severity by checkType is a deferred leg.
 *  - `dueDate`        = now + a 3-day corrective window. `dueDate` is a REQUIRED
 *                       `create` param (only `relatedCheckId` is `optional`), so a
 *                       value MUST be supplied; 3 days is a standard near-term
 *                       remediation window the assignee can adjust. Passed as
 *                       epoch ms (the runtime datetime contract — ISO is rejected).
 *
 * Guard-safe + idempotent: `fail` is a single-shot FSM transition (pending /
 * reinspection_required → completed), so the common path emits one failure; the
 * dispatch key `qa-check-failed-corrective:{tenant}:{checkId}` makes a re-delivered
 * event a single corrective action (a legitimate second failure after a
 * requireReinspection cycle is a distinct remediation; the key is for re-delivery
 * dedup, and dispatcher idempotency is opt-in/inert today regardless). A check
 * with no resolvable tenant or an unavailable store is a clean skip reported via
 * `onDiagnostic`, never silent.
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

export interface QaCheckFailedCorrectiveActionDiagnostic {
  checkId?: string;
  detail?: Record<string, unknown>;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface QaCheckFailedCorrectiveActionMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: QaCheckFailedCorrectiveActionDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
}

interface QaCheckFailedPayload {
  inspector?: unknown;
  notes?: unknown;
  tenantId?: unknown;
}

interface QaCheckLike {
  checkType?: unknown;
  inspector?: unknown;
  location?: unknown;
  notes?: unknown;
  tenantId?: unknown;
}

const FAILED_EVENT = "QACheckFailed";
// A failed food-safety/quality check is high-severity by default; satisfies
// QACorrectiveAction.create's `severity in [low,medium,high,critical]` guard.
const CORRECTIVE_SEVERITY = "high";
// `dueDate` is a required create param; a 3-day window is the standard near-term
// remediation target (the assignee can adjust it). Expressed in epoch ms.
const CORRECTIVE_DUE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

const defaultDiagnostic = (
  diag: QaCheckFailedCorrectiveActionDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[qa-corrective:${diag.stage}] ${diag.reason}`, {
    checkId: diag.checkId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

/**
 * Create middleware that opens a QACorrectiveAction when a QACheck fails.
 * Store/provider based so tests and production share the same Manifest runtime
 * boundary.
 */
export function createQaCheckFailedCorrectiveActionMiddleware(
  options: QaCheckFailedCorrectiveActionMiddlewareOptions
): Middleware {
  const { storeProvider, dispatchCommand, onDiagnostic = defaultDiagnostic } =
    options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Anchor to a genuine QACheck.fail mutation, not a look-alike event.
      if (!(ctx.entityName === "QACheck" && ctx.command.name === "fail")) {
        return {};
      }

      const failures = ctx.emittedEvents.filter(
        (event) => event.name === FAILED_EVENT
      );

      for (const event of failures) {
        const payload = event.payload as QaCheckFailedPayload | undefined;
        const checkId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);

        if (!checkId) {
          onDiagnostic({
            stage: "resolve",
            reason: `${FAILED_EVENT} carried no check id — cannot open a corrective action`,
          });
          continue;
        }

        const checkStore = storeProvider("QACheck");
        if (!checkStore) {
          onDiagnostic({
            stage: "stores",
            reason: "QACheck store unavailable — cannot open a corrective action",
            checkId,
          });
          continue;
        }

        const check = (await checkStore.getById(checkId)) as
          | QaCheckLike
          | undefined;
        if (!check) {
          onDiagnostic({
            stage: "load",
            reason: "failed QACheck not found in store — cannot resolve tenant",
            checkId,
          });
          continue;
        }

        // tenantId is the check's OWN field (never auto-populated onto the event).
        const tenantId =
          asNonEmptyString(check.tenantId) ??
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!tenantId) {
          onDiagnostic({
            stage: "tenant",
            reason: "failed QACheck has no resolvable tenant — cannot dispatch",
            checkId,
          });
          continue;
        }

        // `inspector` and `notes` are genuine `fail` params → they ride the
        // payload; fall back to the loaded check's own fields defensively.
        const inspector =
          asNonEmptyString(payload?.inspector) ??
          asNonEmptyString(check.inspector) ??
          "";
        const notes =
          asNonEmptyString(payload?.notes) ?? asNonEmptyString(check.notes);
        const checkType = asNonEmptyString(check.checkType) ?? "quality";
        const location = asNonEmptyString(check.location);

        const description =
          notes ??
          `${checkType} check failed${location ? ` at ${location}` : ""} — corrective action required`;
        const dueDate = Date.now() + CORRECTIVE_DUE_WINDOW_MS;

        const result = await dispatchCommand(
          "create",
          {
            // For a create the new id travels in the body, NOT as instanceId
            // (passing instanceId targets an existing instance and the row is
            // never persisted — mirrors the certification-lapse / staff-created
            // create legs).
            id: randomUUID(),
            tenantId,
            relatedCheckId: checkId,
            description,
            assignedTo: inspector,
            severity: CORRECTIVE_SEVERITY,
            dueDate,
          },
          {
            entityName: "QACorrectiveAction",
            correlationId: checkId,
            causationId: FAILED_EVENT,
            idempotencyKey: `qa-check-failed-corrective:${tenantId}:${checkId}`,
          }
        );

        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "create",
            reason: `QACorrectiveAction.create failed: ${result.error ?? "unknown"}`,
            checkId,
            tenantId,
            detail: { severity: CORRECTIVE_SEVERITY },
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: `opened corrective action for failed ${checkType} check`,
          checkId,
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
