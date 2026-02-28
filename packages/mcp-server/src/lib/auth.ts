/**
 * Identity resolution for MCP context.
 *
 * Trust boundaries are ENFORCED by transport mode:
 * - "stdio" transport → service-account mode (env vars OR auto-discover)
 * - "http" transport  → user-delegated mode (Clerk JWT) — Phase 2+
 *
 * Identity is resolved ONCE per session (stdio) or per request (HTTP)
 * and bound immutably to the MCP context. It cannot be overridden by
 * tool parameters.
 *
 * @packageDocumentation
 */

import type { McpIdentity, TransportMode } from "../types.js";

// ---------------------------------------------------------------------------
// Minimal Prisma interface (avoids importing @repo/database directly)
// ---------------------------------------------------------------------------

/**
 * Structural type for the Prisma queries we need.
 * Avoids importing @repo/database — callers inject their client.
 */
export interface PrismaForAuth {
  user: {
    findFirst: (args: {
      where: Record<string, unknown>;
      select: Record<string, boolean>;
      orderBy?: Record<string, string>;
    }) => Promise<Record<string, unknown> | null>;
  };
}

// ---------------------------------------------------------------------------
// Identity resolution
// ---------------------------------------------------------------------------

/**
 * Resolve identity for the current MCP request.
 *
 * For stdio transport (local dev):
 * 1. If MCP_SERVICE_ACCOUNT_ID + MCP_SERVICE_TENANT_ID are set → use those
 * 2. Otherwise → auto-discover the first active admin/owner user from the DB
 *
 * Phase 2+: HTTP/user-delegated mode will add Clerk JWT verification.
 */
export async function resolveIdentity(
  transport: TransportMode,
  prisma: PrismaForAuth,
  _authHeader?: string
): Promise<McpIdentity> {
  if (transport === "stdio") {
    return await resolveStdioIdentity(prisma);
  }

  // HTTP transport — Phase 2+
  throw new Error(
    "HTTP transport identity resolution not yet implemented. Use stdio transport for Phase 1."
  );
}

// ---------------------------------------------------------------------------
// Stdio identity resolution
// ---------------------------------------------------------------------------

/**
 * Resolve identity for stdio transport.
 *
 * Priority:
 * 1. Explicit env vars (MCP_SERVICE_ACCOUNT_ID + MCP_SERVICE_TENANT_ID)
 * 2. Auto-discover from database (first active admin/owner user)
 */
async function resolveStdioIdentity(
  prisma: PrismaForAuth
): Promise<McpIdentity> {
  const accountId = process.env.MCP_SERVICE_ACCOUNT_ID;
  const tenantId = process.env.MCP_SERVICE_TENANT_ID;

  // ── Path 1: Explicit env vars ──
  if (accountId && tenantId) {
    const user = await prisma.user.findFirst({
      where: { id: accountId, tenantId, deletedAt: null },
      select: { role: true },
    });

    if (!user) {
      throw new Error(
        `Service account not found: userId=${accountId}, tenantId=${tenantId}. ` +
          "Verify MCP_SERVICE_ACCOUNT_ID and MCP_SERVICE_TENANT_ID are correct."
      );
    }

    return {
      userId: accountId,
      tenantId,
      roles: user.role ? [String(user.role)] : [],
      mode: "service-account",
    };
  }

  // ── Path 2: Auto-discover from database ──
  return await autoDiscoverIdentity(prisma);
}

/**
 * Auto-discover identity by finding the first active admin/owner user.
 *
 * Search priority:
 * 1. Users with role "owner"
 * 2. Users with role "admin"
 * 3. Any active user (fallback)
 *
 * This is for local dev convenience — zero config needed.
 */
async function autoDiscoverIdentity(
  prisma: PrismaForAuth
): Promise<McpIdentity> {
  // Try owner first, then admin, then any active user
  for (const role of ["owner", "admin", null]) {
    const where: Record<string, unknown> = {
      deletedAt: null,
      isActive: true,
    };
    if (role) {
      where.role = role;
    }

    const user = await prisma.user.findFirst({
      where,
      select: {
        id: true,
        tenantId: true,
        role: true,
        email: true,
        firstName: true,
        lastName: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (user?.id && user.tenantId) {
      process.stderr.write(
        `${JSON.stringify({
          level: "info",
          message: "MCP auto-discovered identity",
          userId: user.id,
          tenantId: user.tenantId,
          role: user.role,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          hint: "Set MCP_SERVICE_ACCOUNT_ID and MCP_SERVICE_TENANT_ID env vars to use a specific account",
        })}\n`
      );

      return {
        userId: String(user.id),
        tenantId: String(user.tenantId),
        roles: user.role ? [String(user.role)] : [],
        mode: "service-account",
      };
    }
  }

  throw new Error(
    "No active users found in the database. Cannot auto-discover MCP identity. " +
      "Either seed the database with a user, or set MCP_SERVICE_ACCOUNT_ID and MCP_SERVICE_TENANT_ID env vars."
  );
}
