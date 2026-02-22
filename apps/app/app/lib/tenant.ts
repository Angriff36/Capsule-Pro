import "server-only";

import { auth, currentUser } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException, captureMessage } from "@sentry/nextjs";
import { invariant } from "./invariant";

const CONNECTION_ERROR_PATTERN =
  /connection terminated|connection refused|ECONNREFUSED|ENOTFOUND|connect/i;

export const getTenantIdForOrg = async (orgId: string): Promise<string> => {
  invariant(orgId, "orgId must exist to resolve tenant");
  try {
    let account = await database.account.findFirst({
      where: { slug: orgId, deletedAt: null },
    });

    if (!account) {
      account = await database.account.create({
        data: {
          name: orgId,
          slug: orgId,
        },
      });
    }

    return account.id;
  } catch (err) {
    // Log the real error in the terminal (next dev server) so we see what's actually failing
    const raw =
      err instanceof Error
        ? `${err.name}: ${err.message}${err.cause ? ` (cause: ${String(err.cause)})` : ""}`
        : String(err);
    console.error("[getTenantIdForOrg] DB error:", raw);
    const errWithCode = err as { code?: string };
    if (err instanceof Error && errWithCode.code) {
      console.error("[getTenantIdForOrg] code:", errWithCode.code);
    }

    const msg =
      err instanceof Error ? err.message : String(err ?? "Unknown error");
    if (CONNECTION_ERROR_PATTERN.test(msg)) {
      throw new Error(
        `Database connection failed (${msg}). See server logs for full error.`
      );
    }
    throw err instanceof Error ? err : new Error(String(err));
  }
};

export const requireTenantId = async (): Promise<string> => {
  const { orgId } = await auth();

  invariant(orgId, "auth.orgId must exist");

  return getTenantIdForOrg(orgId);
};

// Alias for backward compatibility with existing code using getTenantId
export const getTenantId = requireTenantId;

// ============================================================================
// User Resolution — auto-provisions User record in current tenant
// ============================================================================

/** Minimal user record returned by requireCurrentUser */
export interface CurrentUser {
  id: string;
  tenantId: string;
  role: string;
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * Resolve the current Clerk user to an internal User (employee) record.
 *
 * The lookup is `(tenantId, authUserId)` — the composite unique index
 * `employees_tenant_auth_user_idx` ensures one Clerk user can exist in
 * multiple tenants simultaneously.
 *
 * If no User record exists for the current (tenant, clerkUserId) pair,
 * auto-provision one using Clerk profile data. This handles:
 *   - First login to a new org
 *   - Employee at multiple orgs (e.g. your own org + Mangia)
 *   - Soft-deleted records that should be restored
 */
export const requireCurrentUser = async (): Promise<CurrentUser> => {
  const { orgId, userId: clerkId } = await auth();
  invariant(orgId, "auth.orgId must exist");
  invariant(clerkId, "auth.userId must exist");

  const tenantId = await getTenantIdForOrg(orgId);

  // 1. Look up existing active record
  const existing = await database.user.findFirst({
    where: { tenantId, authUserId: clerkId, deletedAt: null },
    select: {
      id: true,
      tenantId: true,
      role: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  if (existing) {
    return existing;
  }

  // 2. Check for soft-deleted record — restore it
  const ghostRecord = await database.user.findFirst({
    where: { tenantId, authUserId: clerkId, deletedAt: { not: null } },
    select: { id: true },
  });

  if (ghostRecord) {
    const clerkUser = await currentUser();
    const email =
      clerkUser?.emailAddresses.at(0)?.emailAddress?.toLowerCase() ??
      "unknown@example.com";
    const firstName = clerkUser?.firstName ?? "Unknown";
    const lastName = clerkUser?.lastName ?? "User";

    const restored = await database.user.update({
      where: { tenantId_id: { tenantId, id: ghostRecord.id } },
      data: { deletedAt: null, isActive: true, email, firstName, lastName },
      select: {
        id: true,
        tenantId: true,
        role: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    console.log("[requireCurrentUser] Restored soft-deleted user", {
      tenantId,
      clerkId,
      userId: restored.id,
    });

    return restored;
  }

  // 3. Check if an unlinked employee exists with the same email — link them
  const clerkUser = await currentUser();
  const clerkEmail =
    clerkUser?.emailAddresses.at(0)?.emailAddress?.toLowerCase() ?? null;

  if (clerkEmail) {
    const byEmail = await database.user.findFirst({
      where: { tenantId, email: clerkEmail, deletedAt: null, authUserId: null },
      select: { id: true },
    });

    if (byEmail) {
      const linked = await database.user.update({
        where: { tenantId_id: { tenantId, id: byEmail.id } },
        data: { authUserId: clerkId },
        select: {
          id: true,
          tenantId: true,
          role: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      console.log("[requireCurrentUser] Linked existing employee by email", {
        tenantId,
        clerkId,
        userId: linked.id,
        email: clerkEmail,
      });

      return linked;
    }
  }

  // 4. No record at all — auto-provision a new employee
  const email = clerkEmail ?? "unknown@example.com";
  const firstName = clerkUser?.firstName ?? "Unknown";
  const lastName = clerkUser?.lastName ?? "User";

  captureMessage("Auto-provisioning user in new tenant", {
    level: "info",
    tags: { route: "requireCurrentUser", tenantId, authUserId: clerkId },
    extra: { email, orgId },
  });

  console.log("[requireCurrentUser] Auto-provisioning new user", {
    tenantId,
    clerkId,
    email,
    orgId,
  });

  try {
    const created = await database.user.create({
      data: {
        tenantId,
        email,
        firstName,
        lastName,
        role: "admin",
        employmentType: "full_time",
        authUserId: clerkId,
      },
      select: {
        id: true,
        tenantId: true,
        role: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    return created;
  } catch (provisionErr) {
    // Unique constraint race condition — another request provisioned between our check and create
    const retried = await database.user.findFirst({
      where: { tenantId, authUserId: clerkId, deletedAt: null },
      select: {
        id: true,
        tenantId: true,
        role: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (retried) {
      return retried;
    }

    // Genuinely failed
    captureException(provisionErr, {
      tags: { route: "requireCurrentUser", tenantId, authUserId: clerkId },
      extra: { email, orgId },
    });

    console.error(
      "[requireCurrentUser] Failed to provision user:",
      provisionErr
    );
    throw new Error(
      `Unable to provision your account in this organization. Please contact support. (org: ${orgId})`
    );
  }
};
