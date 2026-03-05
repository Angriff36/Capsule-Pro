/**
 * API Keys - List
 *
 * GET /api/settings/api-keys
 *
 * List all API keys for the current tenant.
 */

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/app/lib/admin-guards";
import { ApiKeyError, listApiKeys } from "@/app/lib/api-key-service";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const currentUser = await requireCurrentUser();

    // Only admins can view API keys
    if (!requireAdmin(currentUser)) {
      return Response.json(
        { error: "Forbidden - admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeRevoked = searchParams.get("include_revoked") === "true";
    const includeExpired = searchParams.get("include_expired") === "true";
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);

    const result = await listApiKeys(tenantId, {
      includeRevoked,
      includeExpired,
      limit: Math.min(limit, 200),
      offset,
    });

    return Response.json({
      apiKeys: result.apiKeys,
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error listing API keys:", error);

    if (error instanceof ApiKeyError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
