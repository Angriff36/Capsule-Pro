/**
 * Rate Limits Events Endpoint
 *
 * GET /api/settings/rate-limits/events - Get rate limit event audit log
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

/**
 * GET /api/settings/rate-limits/events
 * Get rate limit event audit log
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 200)
 * - allowed: Filter by allowed status (true/false)
 * - endpoint: Filter by endpoint pattern
 * - startDate: ISO date string
 * - endDate: ISO date string
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

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      200,
      Math.max(1, Number.parseInt(searchParams.get("limit") || "50", 10))
    );
    const allowedParam = searchParams.get("allowed");
    const endpointFilter = searchParams.get("endpoint");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Build where clause
    const where: Record<string, unknown> = {
      tenantId,
    };

    if (allowedParam !== null) {
      where.allowed = allowedParam === "true";
    }

    if (endpointFilter) {
      where.endpoint = { contains: endpointFilter };
    }

    if (startDateParam || endDateParam) {
      where.timestamp = {};
      if (startDateParam) {
        (where.timestamp as Record<string, unknown>).gte = new Date(startDateParam);
      }
      if (endDateParam) {
        (where.timestamp as Record<string, unknown>).lte = new Date(endDateParam);
      }
    }

    // Get total count
    const total = await database.rateLimitEvent.count({ where });

    // Get events
    const events = await database.rateLimitEvent.findMany({
      where,
      orderBy: {
        timestamp: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        endpoint: true,
        method: true,
        allowed: true,
        windowStart: true,
        windowEnd: true,
        requestsInWindow: true,
        limit: true,
        userId: true,
        userAgent: true,
        ipHash: true,
        responseTime: true,
        timestamp: true,
      },
    });

    return manifestSuccessResponse({
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[rate-limits/events] Error:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
