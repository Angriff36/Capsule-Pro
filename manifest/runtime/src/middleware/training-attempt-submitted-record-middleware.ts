/**
 * TrainingAttemptSubmitted → TrainingAttempt.create middleware.
 *
 * Records an immutable TrainingAttempt ledger row every time a staff member
 * submits a training attempt (pass, fail, or final-fail). Without this the
 * attempt history is empty — managers/audits cannot see who attempted what,
 * with which score, on which try.
 *
 * WHY middleware and not a reaction (the crux — matches the verified
 * engine-semantics correction in IMPLEMENTATION_PLAN P0): the three emitters
 * (`TrainingAssignment.submitPassingAttempt` / `submitFailedAttempt` /
 * `submitFinalFailedAttempt`) are all MUTATE commands, so the engine's emitted
 * payload is `{ ...commandInput, result }` where `result` is the LAST mutate's
 * scalar (`managerReviewRequired`, a boolean), NOT the TrainingAssignment
 * instance. The old `on TrainingAttemptSubmitted run TrainingAttempt.create`
 * reaction read `payload.result.attemptCount` / `payload.result.passThresholdPercent`
 * / `payload.result.managerReviewRequired` — all `undefined` at runtime — so it
 * silently no-op'd (those refs are the TrainingAssignment's OWN fields, NOT
 * submit-command params, and declared event fields are never auto-populated from
 * `self.*`). The genuine submit params (`attemptId`, `assignmentId`, `moduleId`,
 * `staffMemberId`, `scorePercent`, `answersJson`) DO ride the payload; the
 * self-owned fields come from loading the assignment. So the middleware loads the
 * just-mutated TrainingAssignment from the store via `_subject.id`, reads
 * `self.attemptCount` (post-increment → the attempt number), `self.passThresholdPercent`,
 * and `self.managerReviewRequired`, derives `passed = scorePercent >= threshold`,
 * and dispatches the governed `TrainingAttempt.create`.
 *
 * Idempotent: the attempt id (`payload.attemptId`) is the TrainingAttempt's id —
 * if a row already exists for it (re-emitted event), the attempt is skipped.
 * Every skip path reports through `onDiagnostic` instead of silently returning.
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

export interface TrainingAttemptRecordDiagnostic {
  assignmentId?: string;
  attemptId?: string;
  detail?: Record<string, unknown>;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface TrainingAttemptSubmittedRecordMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: TrainingAttemptRecordDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
}

interface TrainingAttemptSubmittedPayload {
  answersJson?: unknown;
  assignmentId?: unknown;
  attemptId?: unknown;
  moduleId?: unknown;
  scorePercent?: unknown;
  staffMemberId?: unknown;
  tenantId?: unknown;
}

interface TrainingAssignmentLike {
  attemptCount?: unknown;
  managerReviewRequired?: unknown;
  passThresholdPercent?: unknown;
}

// All three submit commands emit TrainingAttemptSubmitted; each is a MUTATE.
const SUBMIT_COMMANDS = new Set([
  "submitPassingAttempt",
  "submitFailedAttempt",
  "submitFinalFailedAttempt",
]);

const defaultDiagnostic = (diag: TrainingAttemptRecordDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[training-attempt:${diag.stage}] ${diag.reason}`, {
    assignmentId: diag.assignmentId,
    attemptId: diag.attemptId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

/**
 * Create middleware that records a TrainingAttempt row when a training attempt
 * is submitted. Store/provider based so tests and production share the same
 * Manifest runtime boundary.
 */
export function createTrainingAttemptSubmittedRecordMiddleware(
  options: TrainingAttemptSubmittedRecordMiddlewareOptions
): Middleware {
  const { storeProvider, dispatchCommand, onDiagnostic = defaultDiagnostic } =
    options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Anchor to a genuine TrainingAssignment submit mutation, not a
      // look-alike event from another entity/command.
      if (ctx.entityName !== "TrainingAssignment") {
        return {};
      }

      const submitted = ctx.emittedEvents.filter(
        (event) =>
          event.name === "TrainingAttemptSubmitted" &&
          SUBMIT_COMMANDS.has(ctx.command.name)
      );

      for (const event of submitted) {
        const payload = event.payload as
          | TrainingAttemptSubmittedPayload
          | undefined;

        // The submit command's subject IS the TrainingAssignment, so
        // _subject.id is the assignment id (= payload.assignmentId, a param).
        const assignmentId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(payload?.assignmentId) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        const attemptId = asNonEmptyString(payload?.attemptId);
        if (!(assignmentId && tenantId && attemptId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `TrainingAttemptSubmitted missing ${
              attemptId
                ? assignmentId
                  ? "tenantId"
                  : "assignmentId"
                : "attemptId"
            }`,
            assignmentId,
            attemptId,
            tenantId,
          });
          continue;
        }

        const assignmentStore = storeProvider("TrainingAssignment");
        const attemptStore = storeProvider("TrainingAttempt");
        if (!(assignmentStore && attemptStore)) {
          onDiagnostic({
            stage: "stores",
            reason: "TrainingAssignment/TrainingAttempt store unavailable",
            assignmentId,
            attemptId,
            tenantId,
          });
          continue;
        }

        // Idempotency: attemptId is the TrainingAttempt id — one row per attempt.
        // A re-emitted submit event must not write a duplicate ledger row.
        const existing = await attemptStore.getById(attemptId);
        if (existing) {
          onDiagnostic({
            stage: "dedupe",
            reason: "training attempt already recorded — skip",
            assignmentId,
            attemptId,
            tenantId,
          });
          continue;
        }

        const assignment = (await assignmentStore.getById(assignmentId)) as
          | TrainingAssignmentLike
          | undefined;
        if (!assignment) {
          onDiagnostic({
            stage: "load",
            reason: "TrainingAssignment not found in store — cannot record",
            assignmentId,
            attemptId,
            tenantId,
          });
          continue;
        }

        const moduleId = asNonEmptyString(payload?.moduleId);
        const staffMemberId = asNonEmptyString(payload?.staffMemberId);
        if (!(moduleId && staffMemberId)) {
          onDiagnostic({
            stage: "params",
            reason: `submit payload missing ${moduleId ? "staffMemberId" : "moduleId"}`,
            assignmentId,
            attemptId,
            tenantId,
          });
          continue;
        }

        // attemptCount/passThresholdPercent/managerReviewRequired are the
        // assignment's OWN fields — the whole reason this is middleware, not a
        // reaction. The submit command already incremented attemptCount, so the
        // loaded value IS this attempt's number.
        const attemptNumber = asFiniteNumber(assignment.attemptCount) ?? 1;
        const passThresholdPercent =
          asFiniteNumber(assignment.passThresholdPercent) ?? 80;
        const scorePercent = asFiniteNumber(payload?.scorePercent) ?? 0;
        const passed = scorePercent >= passThresholdPercent;
        const managerReviewRequired = assignment.managerReviewRequired === true;

        const result = await dispatchCommand(
          "create",
          {
            // For a create the new id travels in the body, NOT as instanceId —
            // passing instanceId targets an existing instance and the row is
            // never persisted (mirrors lead-converted/prep-list-seed creates).
            id: attemptId,
            tenantId,
            assignmentId,
            moduleId,
            staffMemberId,
            attemptNumber,
            scorePercent,
            passThresholdPercent,
            passed,
            managerReviewRequired,
            answersJson: asNonEmptyString(payload?.answersJson) ?? "",
          },
          {
            entityName: "TrainingAttempt",
            correlationId: assignmentId,
            causationId: "TrainingAttemptSubmitted",
            idempotencyKey: `training-attempt:${tenantId}:${attemptId}:create`,
          }
        );

        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "create",
            reason: `TrainingAttempt.create failed: ${result.error ?? "unknown"}`,
            assignmentId,
            attemptId,
            tenantId,
            detail: { attemptNumber, scorePercent, passed },
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: `recorded attempt #${attemptNumber} (score ${scorePercent}, ${
            passed ? "passed" : "failed"
          })`,
          assignmentId,
          attemptId,
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
  // int fields may surface as strings from the store/payload.
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
