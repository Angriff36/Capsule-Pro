/**
 * EventStaff.assign → "staff must be active" cross-entity guard middleware.
 *
 * WHY this is middleware and not a constraint (the crux):
 * The rule "you cannot assign a deactivated staff member to an event" is a
 * CROSS-ENTITY precondition: it depends on the linked `StaffMember.status`, not
 * on any field of the EventStaff row or any `assign` input param. The Manifest
 * DSL's `guard`/`constraint` expressions can only reference `self.*`, `user.*`,
 * `context.*`, and command params — they cannot load another entity's live
 * state. So `EventStaff.assign`'s existing guards only null-check the ids; there
 * is no declarative way to express `staffMustBeActive`. The documented escape
 * hatch for multi-hop/graph derivations is a runtime middleware that loads the
 * related entity. This runs at the `before-guard` hook (after policies, before
 * the command's own guards/actions) and SHORT-CIRCUITS the assign when the
 * referenced StaffMember is not active.
 *
 * Fail-open by design (validation, not infra enforcement): if the staff id is
 * missing/blank (the command's own guard rejects that), the StaffMember store is
 * unavailable, or the staff row is not found, the command proceeds — those are
 * out of scope for "is this staff active". The middleware ONLY blocks when it
 * positively finds the staff row AND it is deactivated (`status != "active"`) or
 * soft-deleted (`deletedAt` set). Every block reports through `onDiagnostic` —
 * never silent.
 */

import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";

export interface EventStaffActiveGuardDiagnostic {
  detail?: Record<string, unknown>;
  reason: string;
  staffMemberId?: string;
  stage: string;
  tenantId?: string;
}

export interface EventStaffActiveGuardMiddlewareOptions {
  onDiagnostic?: (diag: EventStaffActiveGuardDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface StaffMemberLike {
  deletedAt?: unknown;
  status?: unknown;
  tenantId?: unknown;
}

const defaultDiagnostic = (diag: EventStaffActiveGuardDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[event-staff-active:${diag.stage}] ${diag.reason}`, {
    staffMemberId: diag.staffMemberId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createEventStaffActiveGuardMiddleware(
  options: EventStaffActiveGuardMiddlewareOptions
): Middleware {
  const { storeProvider, onDiagnostic = defaultDiagnostic } = options;

  return {
    hooks: ["before-guard"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Scope strictly to the assign command. updateRole/remove operate on an
      // already-assigned row and must not be blocked by a later deactivation.
      if (!(ctx.entityName === "EventStaff" && ctx.command.name === "assign")) {
        return {};
      }

      const staffMemberId = asNonEmptyString(ctx.input.staffMemberId);
      // The command's own guard rejects a missing/blank id; not our concern.
      if (!staffMemberId) {
        return {};
      }

      const store = storeProvider("StaffMember");
      if (!store) {
        // Infra gap — do not block legitimate assigns on a missing store.
        onDiagnostic({
          stage: "store",
          reason: "StaffMember store unavailable — active check skipped",
          staffMemberId,
        });
        return {};
      }

      const staff = (await store.getById(staffMemberId)) as
        | StaffMemberLike
        | undefined;
      if (!staff) {
        // Out of scope: "not found" is not "inactive". Existing assign guards
        // also do not assert existence.
        onDiagnostic({
          stage: "load",
          reason: "StaffMember not found — active check skipped",
          staffMemberId,
        });
        return {};
      }

      const tenantId = asNonEmptyString(staff.tenantId);
      const status = asNonEmptyString(staff.status);
      const softDeleted = staff.deletedAt != null;

      // Block only on a positive "deactivated" signal: explicit non-active
      // status or a soft-delete tombstone.
      if (softDeleted || (status !== undefined && status !== "active")) {
        const reason = softDeleted
          ? `Cannot assign staff member ${staffMemberId}: staff member has been removed`
          : `Cannot assign staff member ${staffMemberId}: staff member is not active (status="${status}")`;
        onDiagnostic({
          stage: "blocked",
          reason,
          staffMemberId,
          tenantId,
          detail: { status, softDeleted },
        });
        return {
          shortCircuit: true,
          result: {
            success: false,
            error: reason,
            emittedEvents: [],
          } satisfies CommandResult,
        };
      }

      return {};
    },
  };
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
