/**
 * ScheduleShiftCreated → TrainingAssignment.applyFirstShiftDueDate middleware.
 *
 * WHY this exists: the SEL event-staff onboarding training "must be completed
 * before [the staff member's] first shift". The sibling
 * `staff-member-created-training-assignment` middleware creates that onboarding
 * `TrainingAssignment` at staff-create time with `dueDateReviewNeeded = true` and
 * NO due date — the first shift is not knowable then. When the staff member's
 * first shift is actually scheduled (`ScheduleShift.create`), the training due
 * date must be pinned to that shift. Until this middleware existed, nothing pinned
 * it: the assignment sat with an unset due date forever, so `markOverdue` (which
 * guards `self.dueDate != null`) could never fire and the "complete before first
 * shift" rule was unenforceable.
 *
 * WHY middleware and not the "emit + reaction" the plan first sketched (matches
 * the verified engine-semantics correction in IMPLEMENTATION_PLAN P0): the old
 * `on StaffMemberFirstShiftScheduled run TrainingAssignment.applyFirstShiftDueDate`
 * reaction was an ORPHAN — no command emitted `StaffMemberFirstShiftScheduled`, so
 * it could never fire (the lone remaining `reaction-payload-baseline.json` entry).
 * It also could not be salvaged as a reaction:
 *   - `applyFirstShiftDueDate` resolves its target via `guard assignmentId == self.id`,
 *     but the TrainingAssignment id is not derivable from a shift payload.
 *   - The emitter `ScheduleShift.create` is a MUTATE, so its payload is
 *     `{ ...commandInput, result }` — it carries `employeeId` + `shiftStart`
 *     (genuine params) but no `assignmentId` / `dueAt`.
 *   - "First shift" is a STATEFUL fact (does an open assignment still need its due
 *     date pinned?) that a declarative reaction cannot express.
 *
 * Resolution: on `ScheduleShiftCreated`, look up the employee's open SEL
 * onboarding assignment that still needs its due date pinned
 * (`dueDateReviewNeeded == true`, status ∈ {assigned, in_progress, overdue}) and
 * dispatch the governed `applyFirstShiftDueDate` with `firstShiftAt = dueAt =
 * shiftStart` (training is due by the shift it must precede). The command's own
 * `mutate dueDateReviewNeeded = false` clears the flag, so a LATER shift won't
 * re-pin — natural "first shift only" idempotency, no need to scan the shift
 * history. The orphan reaction + its dead `StaffMemberFirstShiftScheduled` event
 * are removed from source in the same change.
 *
 * Identity note: this matches `assignment.employeeId == shift.employeeId`.
 * `TrainingAssignment.create` sets `employeeId = staffMemberId` (the StaffMember
 * id), and in the SEL onboarding domain the scheduled shift is for that same staff
 * person, so the ids align. If they ever diverge, no assignment matches and the
 * middleware no-ops safely (reported via `onDiagnostic`).
 *
 * Every skip path reports through `onDiagnostic` (default: console.warn) instead
 * of returning silently, so "no open onboarding assignment for this employee" is
 * visible in logs and tests.
 */

import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";

import { SEL_ONBOARDING_MODULE_ID as SEL_MODULE_ID } from "../training/sel-onboarding-ids";

// Assignment states from which applyFirstShiftDueDate is legal (mirrors the
// command's `guard self.status in [...]`). Pinning a due date only makes sense
// while the assignment is still open.
const OPEN_STATUSES = new Set(["assigned", "in_progress", "overdue"]);

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

export interface FirstShiftDueDateDiagnostic {
  assignmentId?: string;
  detail?: Record<string, unknown>;
  employeeId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface ScheduleShiftFirstShiftDueDateMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: FirstShiftDueDateDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
}

interface ShiftEventPayload {
  employeeId?: unknown;
  shiftStart?: unknown;
  tenantId?: unknown;
}

interface AssignmentLike {
  dueDateReviewNeeded?: unknown;
  employeeId?: unknown;
  id?: unknown;
  moduleId?: unknown;
  status?: unknown;
  tenantId?: unknown;
}

const defaultDiagnostic = (diag: FirstShiftDueDateDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[first-shift-due:${diag.stage}] ${diag.reason}`, {
    employeeId: diag.employeeId,
    assignmentId: diag.assignmentId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

/**
 * Create middleware that pins a staff member's SEL onboarding training due date
 * to their first scheduled shift. Store/provider based so tests and production
 * share the same Manifest runtime boundary.
 */
export function createScheduleShiftFirstShiftDueDateMiddleware(
  options: ScheduleShiftFirstShiftDueDateMiddlewareOptions
): Middleware {
  const { storeProvider, dispatchCommand, onDiagnostic = defaultDiagnostic } =
    options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Anchor to a genuine ScheduleShift.create — not a look-alike event.
      if (!(ctx.entityName === "ScheduleShift" && ctx.command.name === "create")) {
        return {};
      }

      const created = ctx.emittedEvents.filter(
        (event) => event.name === "ScheduleShiftCreated"
      );

      for (const event of created) {
        const payload = event.payload as ShiftEventPayload;
        // employeeId + shiftStart are genuine create params, so they ride the
        // {...commandInput, result} payload.
        const employeeId = asNonEmptyString(payload.employeeId);
        const shiftStart = asDatetime(payload.shiftStart);
        const tenantId =
          asNonEmptyString(payload.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );

        if (!employeeId) {
          onDiagnostic({
            stage: "resolve",
            reason: "ScheduleShiftCreated carried no employeeId — cannot pin due date",
            tenantId,
          });
          continue;
        }
        if (shiftStart === undefined) {
          onDiagnostic({
            stage: "resolve",
            reason: "ScheduleShiftCreated carried no usable shiftStart",
            employeeId,
            tenantId,
          });
          continue;
        }
        if (!tenantId) {
          onDiagnostic({
            stage: "resolve",
            reason: "missing tenantId for scheduled shift",
            employeeId,
          });
          continue;
        }

        const assignmentStore = storeProvider("TrainingAssignment");
        if (!assignmentStore) {
          onDiagnostic({
            stage: "stores",
            reason: "TrainingAssignment store unavailable — due date not pinned",
            employeeId,
            tenantId,
          });
          continue;
        }

        // The employee's open SEL onboarding assignment that still needs its due
        // date pinned. dueDateReviewNeeded == true is the "not yet pinned" flag
        // applyFirstShiftDueDate clears — so once pinned, later shifts find no
        // match and this no-ops (first-shift-only without scanning shift history).
        const assignment = (await assignmentStore.getAll())
          .map((row) => row as AssignmentLike)
          .find(
            (row) =>
              asNonEmptyString(row.tenantId) === tenantId &&
              asNonEmptyString(row.employeeId) === employeeId &&
              asNonEmptyString(row.moduleId) === SEL_MODULE_ID &&
              row.dueDateReviewNeeded === true &&
              OPEN_STATUSES.has(asNonEmptyString(row.status) ?? "")
          );

        if (!assignment) {
          onDiagnostic({
            stage: "match",
            reason:
              "no open SEL onboarding assignment needing a due date for this employee — skip",
            employeeId,
            tenantId,
          });
          continue;
        }

        const assignmentId = asNonEmptyString(assignment.id);
        if (!assignmentId) {
          onDiagnostic({
            stage: "match",
            reason: "matched assignment has no id",
            employeeId,
            tenantId,
          });
          continue;
        }

        const result = await dispatchCommand(
          "applyFirstShiftDueDate",
          {
            assignmentId,
            moduleId: SEL_MODULE_ID,
            // applyFirstShiftDueDate guards `staffMemberId == self.employeeId`;
            // the assignment was matched on employeeId == this id, so it passes.
            staffMemberId: employeeId,
            // Training is due by the shift it must precede: due date = shift start.
            firstShiftAt: shiftStart,
            dueAt: shiftStart,
          },
          {
            entityName: "TrainingAssignment",
            instanceId: assignmentId,
            correlationId: employeeId,
            causationId: event.name,
            idempotencyKey: `staff-first-shift-due:${tenantId}:${assignmentId}`,
          }
        );

        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "apply",
            reason: `applyFirstShiftDueDate failed: ${result.error ?? "unknown"}`,
            employeeId,
            assignmentId,
            tenantId,
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: "onboarding training due date pinned to first scheduled shift",
          employeeId,
          assignmentId,
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

/**
 * Accept a datetime as the runtime carries it: an epoch-ms number (the repo
 * convention — see notes: ISO strings are rejected with E_TYPE_DATETIME) or a
 * non-empty string. Returns it unchanged for pass-through to the command.
 */
function asDatetime(value: unknown): number | string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return undefined;
}
