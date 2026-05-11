import "server-only";

import { NextResponse } from "next/server";
import { type CurrentUser, requireCurrentUser } from "./tenant";

export const ADMIN_ROLES = [
  "super_admin",
  "tenant_admin",
  "admin",
] as const satisfies readonly string[];

export const MANAGER_ROLES = [
  ...ADMIN_ROLES,
  "finance_manager",
  "operations_manager",
  "staff_manager",
] as const satisfies readonly string[];

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type ManagerRole = (typeof MANAGER_ROLES)[number];

type GuardSuccess = {
  ok: true;
  user: CurrentUser;
  tenantId: string;
};

type GuardFailure = {
  ok: false;
  response: NextResponse;
};

export type RoleGuardResult = GuardSuccess | GuardFailure;

const unauthorized = (): NextResponse =>
  NextResponse.json({ message: "Unauthorized" }, { status: 401 });

const forbidden = (role: string, required: readonly string[]): NextResponse =>
  NextResponse.json(
    {
      message: "Forbidden",
      reason: "insufficient_role",
      role,
      required: [...required],
    },
    { status: 403 }
  );

/**
 * Require the calling user to hold one of the allowed roles.
 *
 * Why this exists (P1.AM): sensitive write paths — payroll approvals, money
 * movement (refunds, invoice voids), administrative restore, RBAC config —
 * historically gated only on session presence (`auth().orgId/userId`). Any
 * authenticated user in a tenant could call them; a staff-role workflow user
 * could approve payroll runs, a guest scheduler could restore deleted entities.
 * This helper layers an explicit role allow-list on top of the existing
 * `requireCurrentUser` lookup, returning a `NextResponse` the caller returns
 * directly. Failure modes:
 *   - No session / no internal user record → 401 Unauthorized
 *   - Authenticated but role not in allow-list → 403 Forbidden
 *
 * Returning `{ ok, response }` (vs throwing) lets each route preserve its own
 * error-shaping and observability wrappers without try/catch gymnastics.
 */
export const requireApiRole = async (
  allowed: readonly string[]
): Promise<RoleGuardResult> => {
  let user: CurrentUser;
  try {
    user = await requireCurrentUser();
  } catch {
    return { ok: false, response: unauthorized() };
  }

  if (!allowed.includes(user.role)) {
    return { ok: false, response: forbidden(user.role, allowed) };
  }

  return { ok: true, user, tenantId: user.tenantId };
};

export const requireApiAdmin = (): Promise<RoleGuardResult> =>
  requireApiRole(ADMIN_ROLES);

export const requireApiManager = (): Promise<RoleGuardResult> =>
  requireApiRole(MANAGER_ROLES);
