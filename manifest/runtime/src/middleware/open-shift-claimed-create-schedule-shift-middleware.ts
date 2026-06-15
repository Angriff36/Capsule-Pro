/**
 * OpenShiftClaimed → ScheduleShift.create middleware
 * (IMPLEMENTATION_PLAN P1, Staffing → "OpenShiftClaimed → ScheduleShift.create").
 *
 * WHY this exists: an `OpenShift` is an unfilled gap a manager posts for staff to
 * pick up; claiming it (`OpenShift.claim`, staff-logistics-extended-rules.manifest:630)
 * flips the open shift to `claimed` and stamps `claimedBy`, but `OpenShiftClaimed`
 * (line 1180) had ZERO consumers — so the claim produced NO real shift on the
 * schedule. An employee would "claim" a shift and it would never appear on the
 * actual roster (`ScheduleShift`), labor reports, or their schedule view; a manager
 * had to re-create the shift by hand. This materializes the claimed open shift as a
 * governed `ScheduleShift` so the claim actually rosters the person.
 *
 * WHY middleware and not a reaction (the structural reason, per the verified
 * engine-semantics correction in IMPLEMENTATION_PLAN P0):
 *   - `OpenShift.claim(claimedBy)` is a MUTATE whose emitted payload is
 *     `{ ...commandInput, result }` — so it carries `claimedBy` (a genuine input
 *     param) but NOT the shift's `scheduleId`/`role`/`shiftStart`/`shiftEnd`. Those
 *     are the OpenShift's OWN fields, and declared event fields
 *     (`OpenShiftClaimed.scheduleId`, …) are NEVER auto-populated from `self.*`. So
 *     a reaction reading `payload.scheduleId`/`payload.shiftStart` is a silent no-op
 *     (the exact P0 class). The middleware LOADS the OpenShift via `_subject.id` and
 *     reads its own fields.
 *   - `ScheduleShift.create` ALSO requires a `locationId` that is NOT one of its
 *     declared params and is NOT on the OpenShift at all — it lives on the parent
 *     `Schedule` (`Schedule.create(locationId, …)`). So the middleware additionally
 *     loads the `Schedule` (via the open shift's `scheduleId`) for `locationId` and
 *     supplies it in the create BODY. (The production create path,
 *     apps/api/app/api/staff/shifts/route.ts, likewise body-seeds `locationId`:
 *     `ScheduleShift.create` never declares it as a param, so the create-bootstrap
 *     seeds the required field from the body — same as the FK-mirrored fields the
 *     CollectionCase.create middleware supplies in its body.)
 *
 * Field mapping (claimed OpenShift → new ScheduleShift):
 *   - employeeId      ← openShift.claimedBy  (the claimer becomes the assignee;
 *                        both are a `User`/employee id — same id space)
 *   - scheduleId      ← openShift.scheduleId
 *   - shiftStart/End  ← openShift.shiftStart/shiftEnd
 *   - roleDuringShift ← openShift.role
 *   - locationId      ← schedule.locationId  (loaded from the parent Schedule)
 *
 * Guard-safe + idempotent:
 *   - `OpenShift.claim` is single-shot (FSM `open → claimed`), so the event cannot
 *     fire twice for the same open shift in normal operation. To stay safe against a
 *     re-delivered event, the middleware first scans `ScheduleShift` for a matching
 *     non-deleted row (same tenant + schedule + employee + start + end) and skips if
 *     one exists; a stable `idempotencyKey` keyed on the open shift id is a second
 *     backstop.
 *   - Skips (with `onDiagnostic`, never silently) when: the open shift can't be
 *     loaded, the claimer is empty, the shift window is missing/invalid
 *     (mirrors `ScheduleShift.create`'s `shiftEnd > shiftStart` guard + the entity's
 *     `validShiftTimes` invariant), or the parent schedule's `locationId` can't be
 *     resolved (it is a required ScheduleShift field).
 *
 * KNOWN LIMITATION (documented, not silent): the `ScheduleShift.create` dispatch
 * runs as the SAME actor who claimed the open shift and is subject to
 * `ScheduleShift`'s default policy (`manager`/`admin`). `OpenShift.claim`'s own
 * policy is `hr_admin`/`payroll_admin`/`manager`/`admin`, so a `manager`/`admin`
 * (the overlap) always passes both — but an `hr_admin`/`payroll_admin` claiming on a
 * staff member's behalf is NOT in `ScheduleShift`'s policy set, so their create is
 * policy-denied and the shift is skipped with a diagnostic (the runtime has no
 * per-call identity override). `Schedule.shiftCount` is intentionally NOT incremented
 * here — that counter is not maintained by `ScheduleShift.create` on any path today
 * (the manager-create route does not touch it either), so it is a separate
 * pre-existing gap, out of scope for this leg.
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

export interface OpenShiftClaimedScheduleShiftDiagnostic {
  detail?: Record<string, unknown>;
  openShiftId?: string;
  reason: string;
  scheduleShiftId?: string;
  stage: string;
  tenantId?: string;
}

export interface OpenShiftClaimedCreateScheduleShiftMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: OpenShiftClaimedScheduleShiftDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
}

interface OpenShiftLike {
  claimedBy?: unknown;
  role?: unknown;
  scheduleId?: unknown;
  shiftEnd?: unknown;
  shiftStart?: unknown;
}

interface ScheduleLike {
  locationId?: unknown;
}

interface ScheduleShiftLike {
  deletedAt?: unknown;
  employeeId?: unknown;
  scheduleId?: unknown;
  shiftEnd?: unknown;
  shiftStart?: unknown;
  tenantId?: unknown;
}

interface OpenShiftClaimedPayload {
  claimedBy?: unknown;
  tenantId?: unknown;
}

const defaultDiagnostic = (
  diag: OpenShiftClaimedScheduleShiftDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[open-shift-claimed-shift:${diag.stage}] ${diag.reason}`, {
    openShiftId: diag.openShiftId,
    scheduleShiftId: diag.scheduleShiftId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

/**
 * Create middleware that materializes a claimed open shift as a governed
 * ScheduleShift. Store/provider based so tests and production share the same
 * Manifest runtime boundary.
 */
export function createOpenShiftClaimedCreateScheduleShiftMiddleware(
  options: OpenShiftClaimedCreateScheduleShiftMiddlewareOptions
): Middleware {
  const { storeProvider, dispatchCommand, onDiagnostic = defaultDiagnostic } =
    options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Anchor to a genuine OpenShift.claim — not a look-alike event.
      if (!(ctx.entityName === "OpenShift" && ctx.command.name === "claim")) {
        return {};
      }

      const claimedEvents = ctx.emittedEvents.filter(
        (event) => event.name === "OpenShiftClaimed"
      );

      for (const event of claimedEvents) {
        const payload = event.payload as OpenShiftClaimedPayload | undefined;

        // The open shift id IS the engine-stamped source instance id.
        const openShiftId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );

        if (!(openShiftId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `OpenShiftClaimed missing ${openShiftId ? "tenantId" : "openShiftId"}`,
            openShiftId,
            tenantId,
          });
          continue;
        }

        const openShiftStore = storeProvider("OpenShift");
        const scheduleStore = storeProvider("Schedule");
        const shiftStore = storeProvider("ScheduleShift");
        if (!(openShiftStore && scheduleStore && shiftStore)) {
          onDiagnostic({
            stage: "stores",
            reason: "OpenShift/Schedule/ScheduleShift store unavailable — shift not created",
            openShiftId,
            tenantId,
            detail: {
              openShift: !!openShiftStore,
              schedule: !!scheduleStore,
              scheduleShift: !!shiftStore,
            },
          });
          continue;
        }

        const openShift = (await openShiftStore.getById(openShiftId)) as
          | OpenShiftLike
          | undefined;
        if (!openShift) {
          onDiagnostic({
            stage: "load",
            reason: "claimed open shift not found in store — cannot create shift",
            openShiftId,
            tenantId,
          });
          continue;
        }

        // The claimer becomes the assigned employee. Prefer the persisted
        // `claimedBy` (set by the claim mutate); fall back to the payload param.
        const employeeId =
          asNonEmptyString(openShift.claimedBy) ??
          asNonEmptyString(payload?.claimedBy);
        const scheduleId = asNonEmptyString(openShift.scheduleId);
        const shiftStart = openShift.shiftStart;
        const shiftEnd = openShift.shiftEnd;
        const roleDuringShift = asNonEmptyString(openShift.role) ?? "";

        if (!employeeId) {
          onDiagnostic({
            stage: "claimer",
            reason: "claimed open shift has no claimer — cannot assign a shift",
            openShiftId,
            tenantId,
          });
          continue;
        }
        if (!scheduleId) {
          onDiagnostic({
            stage: "schedule-ref",
            reason: "open shift has no scheduleId — cannot create shift",
            openShiftId,
            tenantId,
          });
          continue;
        }

        // Mirror ScheduleShift.create's `shiftEnd > shiftStart` guard + the entity's
        // `validShiftTimes` invariant: an invalid/missing window would be a swallowed
        // create failure, so skip cleanly instead.
        const startMs = toMillis(shiftStart);
        const endMs = toMillis(shiftEnd);
        if (startMs === undefined || endMs === undefined || endMs <= startMs) {
          onDiagnostic({
            stage: "window",
            reason: "open shift window missing or end not after start — cannot create shift",
            openShiftId,
            tenantId,
            detail: { shiftStart, shiftEnd },
          });
          continue;
        }

        // locationId is a REQUIRED ScheduleShift field but is not on the OpenShift —
        // it lives on the parent Schedule. Load it; without it the shift would be
        // location-less bad data.
        const schedule = (await scheduleStore.getById(scheduleId)) as
          | ScheduleLike
          | undefined;
        const locationId = asNonEmptyString(schedule?.locationId);
        if (!locationId) {
          onDiagnostic({
            stage: "location",
            reason: "parent schedule has no locationId — cannot create shift",
            openShiftId,
            tenantId,
            detail: { scheduleId },
          });
          continue;
        }

        // Idempotency: skip if a matching shift already exists (re-delivered event).
        const existing = (await shiftStore.getAll()).find((row) => {
          const shift = row as ScheduleShiftLike;
          return (
            asNonEmptyString(shift.tenantId) === tenantId &&
            asNonEmptyString(shift.scheduleId) === scheduleId &&
            asNonEmptyString(shift.employeeId) === employeeId &&
            toMillis(shift.shiftStart) === startMs &&
            toMillis(shift.shiftEnd) === endMs &&
            shift.deletedAt == null
          );
        });
        if (existing) {
          onDiagnostic({
            stage: "dedupe",
            reason: "a matching schedule shift already exists for this claim — skip",
            openShiftId,
            tenantId,
          });
          continue;
        }

        const scheduleShiftId = randomUUID();
        const result = await dispatchCommand(
          "create",
          {
            // For a create the new id travels in the body, NOT as instanceId.
            id: scheduleShiftId,
            tenantId,
            scheduleId,
            employeeId,
            // Required-but-non-param field, body-seeded via create-bootstrap
            // (same as the production POST and CollectionCase.create middleware).
            locationId,
            shiftStart,
            shiftEnd,
            roleDuringShift,
            notes: "Created from claimed open shift",
            swapOfferedTo: "",
            swapStatus: "none",
            deletedAt: null,
          },
          {
            entityName: "ScheduleShift",
            correlationId: openShiftId,
            causationId: "OpenShiftClaimed",
            idempotencyKey: `openshift-claim-shift:${tenantId}:${openShiftId}:create`,
          }
        );

        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "create",
            reason: `ScheduleShift.create failed: ${result.error ?? "unknown"}`,
            scheduleShiftId,
            openShiftId,
            tenantId,
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: "schedule shift created from claimed open shift",
          scheduleShiftId,
          openShiftId,
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

/** Coerce a datetime (epoch-ms number, numeric string, Date, or ISO string) to ms. */
function toMillis(value: unknown): number | undefined {
  if (value == null) {
    return undefined;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? undefined : ms;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) {
      return asNumber;
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}
