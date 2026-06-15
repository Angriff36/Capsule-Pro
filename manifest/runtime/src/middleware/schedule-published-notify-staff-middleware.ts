/**
 * SchedulePublished → Notification-per-shift-employee middleware
 * (IMPLEMENTATION_PLAN P1, Staffing → "SchedulePublished → notify staff").
 *
 * WHY this exists: when a manager publishes a staff schedule
 * (`Schedule.release`, status approved/draft → published), every employee who has
 * a shift on that schedule should be told. Until this middleware existed
 * `SchedulePublished` (schedule-rules.manifest:280) had ZERO consumers — staff
 * were never notified that their shifts went live, so the `/notifications` surface
 * was blind to the single most time-sensitive scheduling event.
 *
 * WHY middleware and not a reaction (the structural reason, per the verified
 * engine-semantics correction in IMPLEMENTATION_PLAN P0):
 *   - It is a 1:N fan-out (one Schedule → many ScheduleShift rows → one
 *     Notification per distinct employee). A declarative reaction resolves exactly
 *     ONE target instance, so it cannot fan out.
 *   - The recipients are NOT on the `SchedulePublished` payload. The event carries
 *     only `{scheduleId, scheduleDate, shiftCount, publishedBy, publishedAt}`
 *     (schedule-rules.manifest:280-286); the employee ids live on the
 *     `ScheduleShift` rows and must be QUERIED from the store by `scheduleId`.
 *
 * Resolution: on `SchedulePublished`, load the schedule's active `ScheduleShift`
 * rows (skipping soft-deleted ones), collect the DISTINCT employee ids (an
 * employee with two shifts on one schedule is notified once), and dispatch the
 * governed `Notification.create` for each — `recipientEmployeeId` = the shift's
 * employeeId, `correlationId` = the scheduleId (so the notification is traceable
 * back to the publish and dedupes).
 *
 * Idempotency: the dispatch key embeds `publishedAt` —
 * `schedule-notify:{tenant}:{scheduleId}:{publishedAt}:{employeeId}`. A
 * re-delivered identical `SchedulePublished` dedupes (same key), while a GENUINE
 * re-publish (reopen → release again sets a new `publishedAt`) gets a fresh key and
 * re-notifies, which is the correct behaviour when the schedule changed.
 *
 * KNOWN LIMITATION (documented, not silent): the dispatched `Notification.create`
 * runs as the SAME actor who published the schedule and is subject to
 * Notification's default policy (`user.role in ["manager", "admin"]`). This always
 * aligns here — publishing a schedule itself requires manager/admin
 * (`Schedule.release`'s `ScheduleDefaultAccess` policy) — so the common path never
 * trips the policy; a lower-privilege actor could only reach this if the schedule
 * policy were widened, in which case the dispatch is policy-denied and reported via
 * `onDiagnostic` rather than created (the runtime has no per-call identity
 * override).
 *
 * Every skip path reports through `onDiagnostic` (default: console.warn) instead of
 * returning silently, so "no recipients for a published schedule" is visible.
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

export interface SchedulePublishedNotifyStaffDiagnostic {
  detail?: Record<string, unknown>;
  employeeId?: string;
  reason: string;
  recipientCount?: number;
  scheduleId?: string;
  stage: string;
  tenantId?: string;
}

export interface SchedulePublishedNotifyStaffMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: SchedulePublishedNotifyStaffDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
}

interface SchedulePublishedPayload {
  publishedAt?: unknown;
  scheduleId?: unknown;
}

interface ScheduleShiftLike {
  deletedAt?: unknown;
  employeeId?: unknown;
  scheduleId?: unknown;
  tenantId?: unknown;
}

const NOTIFICATION_TYPE = "schedule_published";
const NOTIFICATION_TITLE = "Your schedule has been published";
const NOTIFICATION_BODY =
  "Your work schedule has been published. Check your upcoming shifts.";

const defaultDiagnostic = (
  diag: SchedulePublishedNotifyStaffDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[schedule-notify:${diag.stage}] ${diag.reason}`, {
    scheduleId: diag.scheduleId,
    employeeId: diag.employeeId,
    recipientCount: diag.recipientCount,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

/**
 * Create middleware that notifies each distinct shift-holding employee when a
 * staff schedule is published. Store/provider based so tests and production share
 * the same Manifest runtime boundary.
 */
export function createSchedulePublishedNotifyStaffMiddleware(
  options: SchedulePublishedNotifyStaffMiddlewareOptions
): Middleware {
  const { storeProvider, dispatchCommand, onDiagnostic = defaultDiagnostic } =
    options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Anchor to a genuine Schedule.release — not a look-alike event.
      if (!(ctx.entityName === "Schedule" && ctx.command.name === "release")) {
        return {};
      }

      const published = ctx.emittedEvents.filter(
        (event) => event.name === "SchedulePublished"
      );

      for (const event of published) {
        const payload = event.payload as SchedulePublishedPayload | undefined;
        // scheduleId rides the payload (it is on the SchedulePublished event);
        // _subject.id is the same Schedule instance as a belt-and-suspenders source.
        const scheduleId =
          asNonEmptyString(payload?.scheduleId) ??
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId = asNonEmptyString(
          (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
            ?.tenantId
        );
        // publishedAt scopes the idempotency key so a genuine re-publish re-notifies
        // while a re-delivered identical event dedupes.
        const publishToken = asKeyToken(payload?.publishedAt) ?? "x";

        if (!scheduleId) {
          onDiagnostic({
            stage: "resolve",
            reason: "SchedulePublished carried no scheduleId — cannot notify",
            tenantId,
          });
          continue;
        }
        if (!tenantId) {
          onDiagnostic({
            stage: "resolve",
            reason: "missing tenantId for published schedule",
            scheduleId,
          });
          continue;
        }

        const shiftStore = storeProvider("ScheduleShift");
        if (!shiftStore) {
          onDiagnostic({
            stage: "stores",
            reason: "ScheduleShift store unavailable — staff not notified",
            scheduleId,
            tenantId,
          });
          continue;
        }

        // Distinct recipients: this schedule's active shifts' employees. An
        // employee with multiple shifts on the schedule is notified once; removed
        // (soft-deleted) shifts confer no notification.
        const recipients = new Set<string>();
        for (const row of (await shiftStore.getAll()).map(
          (r) => r as ScheduleShiftLike
        )) {
          if (asNonEmptyString(row.tenantId) !== tenantId) {
            continue;
          }
          if (asNonEmptyString(row.scheduleId) !== scheduleId) {
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
            stage: "recipients",
            reason: "no active shift employees for this schedule — nothing to notify",
            scheduleId,
            tenantId,
            recipientCount: 0,
          });
          continue;
        }

        for (const employeeId of recipients) {
          const result = await dispatchCommand(
            "create",
            {
              // For a create the new id travels in the body, NOT as instanceId
              // (passing instanceId targets an existing instance and the row is
              // never persisted — mirrors lead-deal / event-created creates).
              id: randomUUID(),
              tenantId,
              recipientEmployeeId: employeeId,
              notificationType: NOTIFICATION_TYPE,
              title: NOTIFICATION_TITLE,
              body: NOTIFICATION_BODY,
              actionUrl: "",
              correlationId: scheduleId,
            },
            {
              entityName: "Notification",
              correlationId: scheduleId,
              causationId: "SchedulePublished",
              idempotencyKey: `schedule-notify:${tenantId}:${scheduleId}:${publishToken}:${employeeId}`,
            }
          );

          if (result.emittedEvents) {
            ctx.emittedEvents.push(...result.emittedEvents);
          }
          if (!result.success) {
            onDiagnostic({
              stage: "create",
              reason: `Notification.create failed: ${result.error ?? "unknown"}`,
              scheduleId,
              employeeId,
              tenantId,
            });
            continue;
          }
        }

        onDiagnostic({
          stage: "done",
          reason: "published schedule notified its shift employees",
          scheduleId,
          tenantId,
          recipientCount: recipients.size,
        });
      }

      return {};
    },
  };
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** A removed shift carries a non-null/non-empty `deletedAt`. */
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

/** Stable string token for the idempotency key from an epoch-ms or string datetime. */
function asKeyToken(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return undefined;
}
