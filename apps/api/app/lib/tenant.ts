import "server-only";

import { auth, currentUser } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException, captureMessage } from "@sentry/nextjs";
import { headers } from "next/headers";
import { cache } from "react";
import { getRequiredScope } from "@/lib/scope-guard";
import { authenticateApiKey, hasScope } from "@/middleware/api-key-auth";
import { invariant } from "./invariant";

// In-memory cache to deduplicate org→tenant lookups within the same server
// process. getTenantIdForOrg is called from ~120 sites and resolves on every
// authenticated request — and twice per request in routes like user-preferences
// that call it directly AND via requireCurrentUser. The orgId→tenantId mapping
// is immutable, so a short TTL is safe; keyed by the authenticated orgId so
// there is no cross-tenant leakage. Mirrors apps/app/app/lib/tenant.ts.
const tenantCache = new Map<string, { id: string; expiresAt: number }>();
const TENANT_CACHE_TTL_MS = 30_000; // 30 seconds

export const getTenantIdForOrg = async (orgId: string): Promise<string> => {
  invariant(orgId, "orgId must exist to resolve tenant");

  // Check cache first
  const cached = tenantCache.get(orgId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.id;
  }

  // Get or create account by slug
  let account = await database.account.findFirst({
    where: { slug: orgId, deletedAt: null },
  });

  if (!account) {
    // Create new account if it doesn't exist. `slug` is @unique (infra.prisma),
    // so two concurrent first-org-provisioning requests can race past the
    // findFirst: both see no account, both try to create, one wins and the other
    // throws P2002. Re-fetch the winner instead of surfacing a 500 — same shape
    // as the user-provisioning race handled in resolveClerkUser below.
    try {
      account = await database.account.create({
        data: {
          name: orgId,
          slug: orgId,
        },
      });
    } catch (createErr) {
      account = await database.account.findFirst({
        where: { slug: orgId, deletedAt: null },
      });
      // No winning row either → the create failed for a different reason; surface it.
      if (!account) {
        throw createErr;
      }
    }
  }

  // Cache only on success — a thrown findFirst/create never reaches here, so a
  // transient failure can't pin a bad result for the TTL window.
  tenantCache.set(orgId, {
    id: account.id,
    expiresAt: Date.now() + TENANT_CACHE_TTL_MS,
  });

  return account.id;
};

// `cache()` (react) memoizes per request: a handler that calls these resolvers
// more than once — or fans out to N server actions that each call
// requireCurrentUser — resolves the Clerk session + user.findFirst exactly once
// instead of N×. Identity (orgId/clerkId/user row) is immutable within a single
// request, so this is zero-staleness; the request scope (and thus the memo) is
// discarded at request end. Complements the cross-request `tenantCache` above.
export const requireTenantId = cache(async (): Promise<string> => {
  const { orgId } = await auth();

  invariant(orgId, "auth.orgId must exist");

  return getTenantIdForOrg(orgId);
});

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
 * Resolve the current user to an internal User (employee) record.
 *
 * Supports both API key and Clerk session authentication:
 * - API key: Bearer token authenticated, scope enforced, user resolved from key creator
 * - Clerk session: standard (tenantId, authUserId) lookup with auto-provisioning
 *
 * The Clerk session lookup uses `(tenantId, authUserId)` — the composite unique
 * index ensures one Clerk user can exist in multiple tenants simultaneously.
 *
 * If no User record exists for the current (tenant, clerkUserId) pair,
 * auto-provision one using Clerk profile data. This handles:
 *   - First login to a new org
 *   - Employee at multiple orgs (e.g. your own org + Mangia)
 *   - Soft-deleted records that should be restored
 */
export const requireCurrentUser = cache(async (): Promise<CurrentUser> => {
  // API key auth path — check Authorization header before Clerk session
  const headersList = await headers();
  const authHeader = headersList.get("authorization");

  if (authHeader?.startsWith("Bearer cp_")) {
    const path = headersList.get("x-api-path") ?? "/";
    const method = headersList.get("x-api-method") ?? "GET";
    const request = new Request(`https://api${path}`, {
      headers: headersList,
      method,
    });
    return resolveCurrentUser(request);
  }

  // Clerk session path (existing logic)
  return resolveClerkUser();
});

const BEARER_PREFIX = "Bearer ";
const API_KEY_PREFIX = "cp_";

/**
 * Resolve the current Clerk user to an internal User (employee) record.
 * Handles auto-provisioning, soft-delete restoration, and email-based linking.
 */
const resolveClerkUser = async (): Promise<CurrentUser> => {
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

    log.info("[requireCurrentUser] Restored soft-deleted user", {
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

      log.info("[requireCurrentUser] Linked existing employee by email", {
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

  log.info("[requireCurrentUser] Auto-provisioning new user", {
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

    log.error("[requireCurrentUser] Failed to provision user", {
      error: provisionErr,
    });
    throw new Error(
      `Unable to provision your account in this organization. Please contact support. (org: ${orgId})`
    );
  }
};

// ============================================================================
// Dual-Auth User Resolution — supports both API key and Clerk session
// ============================================================================

/**
 * Like requireCurrentUser(), but also supports API key authentication.
 *
 * API key path: authenticates the Bearer token, enforces scope based on
 * the request URL, then looks up the internal User by the key's createdByUserId.
 *
 * Session path: delegates to requireCurrentUser() unchanged.
 *
 * Use this in command handlers (executeManifestCommand) and any route that
 * needs a full CurrentUser record.
 */
export const resolveCurrentUser = async (
  request: Request
): Promise<CurrentUser> => {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith(BEARER_PREFIX)) {
    const token = authHeader.slice(BEARER_PREFIX.length);
    if (token.startsWith(API_KEY_PREFIX)) {
      const result = await authenticateApiKey(request);

      if (!result.success) {
        throw new Error("Invalid API key");
      }

      const apiKey = result.apiKey;
      const url = new URL(request.url);
      const scope = getRequiredScope(url.pathname, request.method);

      if (scope && !hasScope(apiKey, scope)) {
        throw new Error(`Insufficient permissions. Required scope: ${scope}`);
      }

      // Resolve internal user from the API key's creator
      const user = await database.user.findFirst({
        where: {
          tenantId: apiKey.tenantId,
          id: apiKey.createdByUserId,
          deletedAt: null,
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

      if (user) {
        return user;
      }

      // Fallback: look up by authUserId (Clerk ID stored on the user)
      const createdByClerk = await database.user.findFirst({
        where: {
          tenantId: apiKey.tenantId,
          authUserId: apiKey.createdByUserId,
          deletedAt: null,
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

      if (createdByClerk) {
        return createdByClerk;
      }

      throw new Error(
        "API key creator not found in tenant. The user who created this key may have been removed."
      );
    }
  }

  // Fall through to Clerk session auth
  return resolveClerkUser();
};
