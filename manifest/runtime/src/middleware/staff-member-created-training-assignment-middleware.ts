/**
 * StaffMemberCreated → TrainingAssignment.create middleware.
 *
 * Every new staff member must be auto-assigned the mandatory SEL event-staff
 * onboarding training ("Must be completed before first shift"). Without this the
 * assignment was never created — staff had no training to complete and the
 * scheduling-eligibility signal could never be granted.
 *
 * WHY middleware and not a reaction (the crux — matches the verified
 * engine-semantics correction in IMPLEMENTATION_PLAN P0): the emitter,
 * `StaffMember.create`, is a MUTATE command, so the engine's emitted payload is
 * `{ ...commandInput, result }` where `result` is the last mutate's scalar, NOT
 * the StaffMember instance. The old `on StaffMemberCreated run
 * TrainingAssignment.create` reaction read `payload.staffMemberId` /
 * `payload.firstShiftAt` / `payload.dueAt`:
 *   - `staffMemberId` is a COMPUTED (`self.id`), not a `create` input param.
 *   - `firstShiftAt` / `dueAt` are not knowable at staff-create time (the first
 *     shift is scheduled later) and are not params either.
 * So all three were `undefined` at runtime — a silent no-op. The reaction also
 * passed `staffRole: payload.role`, but `TrainingAssignment.create` guards
 * `staffRole == "staff"` while `StaffMember.role` defaults to "server", so the
 * create would have been blocked even if the field were reachable.
 *
 * This middleware reads the new StaffMember id from `_subject.id`, pins
 * `staffRole` to the literal "staff" (so the guard passes), and dispatches the
 * governed `TrainingAssignment.create` with `dueDateReviewNeeded = true`.
 * `firstShiftAt`/`dueAt` are intentionally left unset — they are pinned later by
 * the `StaffMemberFirstShiftScheduled → applyFirstShiftDueDate` path once the
 * staff member's first shift is actually scheduled.
 *
 * Idempotent: one onboarding assignment per (tenant, staff member, SEL module).
 * If one already exists for the staff member, the create is skipped. Every skip
 * reports through `onDiagnostic` — never silent.
 */

import { randomUUID } from "node:crypto";
import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";

// Keep these in lockstep with the SEL onboarding module definition in
// training-module-sel-rules.manifest (SelOnboardingTrainingModuleDefinition).
const SEL_MODULE_ID = "training-module-sel-event-staff-onboarding";
const SEL_MODULE_CODE = "sel_event_staff_onboarding";
const SEL_MODULE_TITLE = "SEL Event Staff — Onboarding Training";
const SEL_PASS_THRESHOLD_PERCENT = 80;
const SEL_MAX_ATTEMPTS = 3;

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

export interface StaffTrainingAssignDiagnostic {
  assignmentId?: string;
  detail?: Record<string, unknown>;
  reason: string;
  staffMemberId?: string;
  stage: string;
  tenantId?: string;
}

export interface StaffMemberCreatedTrainingAssignmentMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: StaffTrainingAssignDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
}

interface AssignmentLike {
  employeeId?: unknown;
  moduleId?: unknown;
  tenantId?: unknown;
}

const defaultDiagnostic = (diag: StaffTrainingAssignDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[staff-training-assign:${diag.stage}] ${diag.reason}`, {
    staffMemberId: diag.staffMemberId,
    assignmentId: diag.assignmentId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

/**
 * Create middleware that auto-assigns the SEL onboarding training when a staff
 * member is created. Store/provider based so tests and production share the same
 * Manifest runtime boundary.
 */
export function createStaffMemberCreatedTrainingAssignmentMiddleware(
  options: StaffMemberCreatedTrainingAssignmentMiddlewareOptions
): Middleware {
  const { storeProvider, dispatchCommand, onDiagnostic = defaultDiagnostic } =
    options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Anchor to a genuine StaffMember.create, not a look-alike event from
      // another entity/command.
      if (!(ctx.entityName === "StaffMember" && ctx.command.name === "create")) {
        return {};
      }

      const created = ctx.emittedEvents.filter(
        (event) => event.name === "StaffMemberCreated"
      );

      for (const event of created) {
        const payload = event.payload as { tenantId?: unknown } | undefined;
        // The create command's subject IS the new StaffMember, so _subject.id is
        // the staff member id (= the unreachable computed `staffMemberId`).
        const staffMemberId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!(staffMemberId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `StaffMemberCreated missing ${staffMemberId ? "tenantId" : "staffMemberId"}`,
            staffMemberId,
            tenantId,
          });
          continue;
        }

        const assignmentStore = storeProvider("TrainingAssignment");
        if (!assignmentStore) {
          onDiagnostic({
            stage: "stores",
            reason: "TrainingAssignment store unavailable — assignment not created",
            staffMemberId,
            tenantId,
          });
          continue;
        }

        // Idempotency: exactly one SEL onboarding assignment per staff member.
        // TrainingAssignment.create mutates employeeId = staffMemberId, so match
        // on (tenant, employeeId, module). A re-emitted create must not duplicate.
        const existing = (await assignmentStore.getAll()).find(
          (row) =>
            asNonEmptyString((row as AssignmentLike).tenantId) === tenantId &&
            asNonEmptyString((row as AssignmentLike).employeeId) ===
              staffMemberId &&
            asNonEmptyString((row as AssignmentLike).moduleId) === SEL_MODULE_ID
        );
        if (existing) {
          onDiagnostic({
            stage: "dedupe",
            reason: "onboarding assignment already exists for this staff member — skip",
            staffMemberId,
            tenantId,
          });
          continue;
        }

        const assignmentId = randomUUID();
        const result = await dispatchCommand(
          "create",
          {
            // For a create the new id travels in the body, NOT as instanceId —
            // passing instanceId targets an existing instance and the row is
            // never persisted (mirrors lead-converted/prep-list-seed creates).
            id: assignmentId,
            tenantId,
            moduleId: SEL_MODULE_ID,
            moduleCode: SEL_MODULE_CODE,
            moduleTitle: SEL_MODULE_TITLE,
            staffMemberId,
            // Pinned literal: the module is the generic all-staff onboarding and
            // TrainingAssignment.create guards `staffRole == "staff"`. The staff
            // member's own role (server/cook/…) is irrelevant to this field.
            staffRole: "staff",
            passThresholdPercent: SEL_PASS_THRESHOLD_PERCENT,
            maxAttempts: SEL_MAX_ATTEMPTS,
            // firstShiftAt/dueAt intentionally omitted — not knowable until the
            // first shift is scheduled. dueDateReviewNeeded flags that the due
            // date still needs to be pinned (by applyFirstShiftDueDate).
            dueDateReviewNeeded: true,
          },
          {
            entityName: "TrainingAssignment",
            correlationId: staffMemberId,
            causationId: "StaffMemberCreated",
            idempotencyKey: `staff-training-assign:${tenantId}:${staffMemberId}:${SEL_MODULE_ID}`,
          }
        );

        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "create",
            reason: `TrainingAssignment.create failed: ${result.error ?? "unknown"}`,
            staffMemberId,
            assignmentId,
            tenantId,
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: "SEL onboarding training assigned to new staff member",
          staffMemberId,
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
