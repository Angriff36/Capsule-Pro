/**
 * Rate Limits Management Endpoint
 *
 * GET /api/settings/rate-limits - List all rate limit configurations for the tenant
 * POST /api/settings/rate-limits - Create a new rate limit configuration
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

/**
 * GET /api/settings/rate-limits
 * List all rate limit configurations for the tenant
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId, userId: clerkId } = await auth();
    if (!(clerkId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const configs = await database.rateLimitConfig.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" },
      ],
    });

    return manifestSuccessResponse({ rateLimitConfigs: configs });
  } catch (error) {
    console.error("[rate-limits/list] Error:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}

/**
 * POST /api/settings/rate-limits
 * Create a new rate limit configuration
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId: clerkId } = await auth();
    if (!(clerkId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const body = await request.json();
    const {
      name,
      endpointPattern,
      windowMs,
      maxRequests,
      burstAllowance,
      priority,
      isActive,
    } = body;

    // Validation
    if (!name || typeof name !== "string" || name.trim() === "") {
      return manifestErrorResponse("Name is required", 400);
    }

    if (!endpointPattern || typeof endpointPattern !== "string") {
      return manifestErrorResponse("Endpoint pattern is required", 400);
    }

    if (!windowMs || typeof windowMs !== "number" || windowMs <= 0) {
      return manifestErrorResponse("Window duration must be a positive number", 400);
    }

    if (!maxRequests || typeof maxRequests !== "number" || maxRequests <= 0) {
      return manifestErrorResponse("Max requests must be a positive number", 400);
    }

    // Validate regex pattern
    try {
      new RegExp(endpointPattern, "i");
    } catch {
      return manifestErrorResponse("Invalid endpoint pattern regex", 400);
    }

    const config = await database.rateLimitConfig.create({
      data: {
        tenantId,
        name: name.trim(),
        endpointPattern,
        windowMs,
        maxRequests,
        burstAllowance: burstAllowance ?? 0,
        priority: priority ?? 0,
        isActive: isActive ?? true,
      },
      select: {
        id: true,
        name: true,
        endpointPattern: true,
        windowMs: true,
        maxRequests: true,
        burstAllowance: true,
        priority: true,
        isActive: true,
        createdAt: true,
      },
    });

    console.log("[rate-limits/create] Created rate limit config", {
      tenantId,
      configId: config.id,
      name: config.name,
      pattern: config.endpointPattern,
    });

    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    console.error("[rate-limits/create] Error:", error);
    return manifestErrorResponse("Failed to create rate limit configuration", 500);
  }
}
