/**
 * API Keys - Create
 *
 * POST /api/settings/api-keys/create
 *
 * Create a new API key.
 */

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { requireAdmin } from "@/app/lib/admin-guards";
import {
  ApiKeyError,
  type CreateApiKeyParams,
  createApiKey,
} from "@/app/lib/api-key-service";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const currentUser = await requireCurrentUser();

    // Only admins can create API keys
    if (!requireAdmin(currentUser)) {
      return Response.json(
        { error: "Forbidden - admin access required" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      name: string;
      scopes: string[];
      expiresAt?: string | null;
    };

    // Validate request body
    if (!body.name || typeof body.name !== "string") {
      return Response.json(
        { error: "name is required and must be a string" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.scopes) || body.scopes.length === 0) {
      return Response.json(
        { error: "scopes is required and must be a non-empty array" },
        { status: 400 }
      );
    }

    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    // Validate expiration date is in the future
    if (expiresAt && expiresAt <= new Date()) {
      return Response.json(
        { error: "expiresAt must be in the future" },
        { status: 400 }
      );
    }

    const params: CreateApiKeyParams = {
      tenantId,
      name: body.name.trim(),
      scopes: body.scopes as any,
      expiresAt,
      createdByUserId: currentUser.id,
    };

    const result = await createApiKey(params);

    return Response.json(
      {
        apiKey: {
          id: result.id,
          tenantId: result.tenantId,
          name: result.name,
          keyPrefix: result.keyPrefix,
          rawKey: result.rawKey, // Only returned on creation
          scopes: result.scopes,
          expiresAt: result.expiresAt,
          createdAt: result.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating API key:", error);

    if (error instanceof ApiKeyError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
