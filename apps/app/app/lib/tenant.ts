import "server-only";

import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import { ensureConvexCurrentUser } from "@/app/lib/convex/tenant-bootstrap";
import { invariant } from "./invariant";

// In-memory cache to deduplicate tenant lookups within the same server process.
const tenantCache = new Map<string, { id: string; expiresAt: number }>();
const TENANT_CACHE_TTL_MS = 30_000;

/**
 * Resolve Clerk org → tenantId.
 * Convex clone uses Clerk orgId as tenantId (no Prisma Account table).
 */
export const getTenantIdForOrg = async (orgId: string): Promise<string> => {
  invariant(orgId, "orgId must exist to resolve tenant");

  const cached = tenantCache.get(orgId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.id;
  }

  tenantCache.set(orgId, {
    id: orgId,
    expiresAt: Date.now() + TENANT_CACHE_TTL_MS,
  });

  return orgId;
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
  email: string;
  firstName: string;
  id: string;
  lastName: string;
  role: string;
  tenantId: string;
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

  try {
    return await ensureConvexCurrentUser();
  } catch (err) {
    captureException(err instanceof Error ? err : new Error(String(err)), {
      tags: { route: "requireCurrentUser", orgId, authUserId: clerkId },
    });
    throw new Error(
      `Unable to provision your account in this organization. Please contact support. (org: ${orgId})`
    );
  }
};
