/**
 * Rate Limit Configuration Detail Endpoint
 *
 * GET /api/settings/rate-limits/[id] - Get a single rate limit configuration
 * PATCH /api/settings/rate-limits/[id] - Update a rate limit configuration
 * DELETE /api/settings/rate-limits/[id] - Soft delete a rate limit configuration
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/settings/rate-limits/[id]
 * Get a single rate limit configuration
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, userId: clerkId } = await auth();
    if (!(clerkId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { id } = await params;

    const config = await database.rateLimitConfig.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!config) {
      return manifestErrorResponse("Rate limit configuration not found", 404);
    }

    return manifestSuccessResponse({ config });
  } catch (error) {
    console.error("[rate-limits/detail] Error:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}

/**
 * PATCH /api/settings/rate-limits/[id]
 * Update a rate limit configuration
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, userId: clerkId } = await auth();
    if (!(clerkId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { id } = await params;
    const body = await request.json();

    // Verify ownership
    const existing = await database.rateLimitConfig.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!existing) {
      return manifestErrorResponse("Rate limit configuration not found", 404);
    }

    // Validate fields if provided
    if (body.windowMs !== undefined && body.windowMs <= 0) {
      return manifestErrorResponse("Window duration must be positive", 400);
    }
    if (body.maxRequests !== undefined && body.maxRequests <= 0) {
      return manifestErrorResponse("Max requests must be positive", 400);
    }
    if (body.endpointPattern !== undefined && !body.endpointPattern.trim()) {
      return manifestErrorResponse("Endpoint pattern is required", 400);
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "name",
      "endpointPattern",
      "windowMs",
      "maxRequests",
      "burstAllowance",
      "priority",
      "isActive",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const config = await database.rateLimitConfig.update({
      where: { tenantId_id: { tenantId, id } },
      data: updateData,
      select: {
        id: true,
        name: true,
        endpointPattern: true,
        windowMs: true,
        maxRequests: true,
        burstAllowance: true,
        priority: true,
        isActive: true,
        updatedAt: true,
      },
    });

    console.log("[rate-limits/update] Updated rate limit config", {
      tenantId,
      configId: config.id,
      name: config.name,
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("[rate-limits/update] Error:", error);
    return manifestErrorResponse("Failed to update rate limit configuration", 500);
  }
}

/**
 * DELETE /api/settings/rate-limits/[id]
 * Soft delete a rate limit configuration
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, userId: clerkId } = await auth();
    if (!(clerkId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { id } = await params;

    // Verify ownership
    const existing = await database.rateLimitConfig.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!existing) {
      return manifestErrorResponse("Rate limit configuration not found", 404);
    }

    // Soft delete
    await database.rateLimitConfig.update({
      where: { tenantId_id: { tenantId, id } },
      data: { deletedAt: new Date() },
    });

    console.log("[rate-limits/delete] Deleted rate limit config", {
      tenantId,
      configId: id,
      name: existing.name,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[rate-limits/delete] Error:", error);
    return manifestErrorResponse("Failed to delete rate limit configuration", 500);
  }
}
