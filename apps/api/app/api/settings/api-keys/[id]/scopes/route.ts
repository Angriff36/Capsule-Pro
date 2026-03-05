/**
 * API Keys - Update Scopes
 *
 * PUT /api/settings/api-keys/[id]/scopes
 *
 * Update API key scopes.
 */

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/app/lib/admin-guards";
import { ApiKeyError, updateApiKeyScopes } from "@/app/lib/api-key-service";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const currentUser = await requireCurrentUser();

    // Only admins can update API keys
    if (!requireAdmin(currentUser)) {
      return Response.json(
        { error: "Forbidden - admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const body = (await request.json()) as { scopes: string[] };

    if (!Array.isArray(body.scopes) || body.scopes.length === 0) {
      return Response.json(
        { error: "scopes is required and must be a non-empty array" },
        { status: 400 }
      );
    }

    await updateApiKeyScopes(tenantId, id, body.scopes as any);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error updating API key scopes:", error);

    if (error instanceof ApiKeyError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
