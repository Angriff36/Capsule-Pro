/**
 * API Keys - Revoke
 *
 * POST /api/settings/api-keys/[id]/revoke
 *
 * Revoke an API key.
 */

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/app/lib/admin-guards";
import {
  ApiKeyError,
  revokeApiKey as revokeApiKeyService,
} from "@/app/lib/api-key-service";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";

export async function POST(
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

    // Only admins can revoke API keys
    if (!requireAdmin(currentUser)) {
      return Response.json(
        { error: "Forbidden - admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const body = (await request.json()) as { reason?: string } | null;

    await revokeApiKeyService(tenantId, id, body?.reason);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error revoking API key:", error);

    if (error instanceof ApiKeyError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
