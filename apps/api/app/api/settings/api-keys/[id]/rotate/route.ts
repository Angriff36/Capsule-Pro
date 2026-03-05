/**
 * API Keys - Rotate
 *
 * POST /api/settings/api-keys/[id]/rotate
 *
 * Rotate an API key (generate a new key while keeping the same ID).
 */

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/app/lib/admin-guards";
import {
  ApiKeyError,
  rotateApiKey as rotateApiKeyService,
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

    // Only admins can rotate API keys
    if (!requireAdmin(currentUser)) {
      return Response.json(
        { error: "Forbidden - admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const result = await rotateApiKeyService(tenantId, id);

    return Response.json({
      apiKey: {
        id: result.id,
        tenantId: result.tenantId,
        name: result.name,
        keyPrefix: result.keyPrefix,
        rawKey: result.rawKey, // Only returned on rotation
        scopes: result.scopes,
        expiresAt: result.expiresAt,
        createdAt: result.createdAt,
      },
    });
  } catch (error) {
    console.error("Error rotating API key:", error);

    if (error instanceof ApiKeyError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
