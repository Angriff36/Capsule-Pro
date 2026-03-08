/**
 * Rate Limits Analytics Endpoint
 *
 * GET /api/settings/rate-limits/analytics - Get rate limit usage analytics
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
 * GET /api/settings/rate-limits/analytics
 * Get rate limit usage analytics aggregated by endpoint
 *
 * Query params:
 * - startDate: ISO date string (optional, defaults to 7 days ago)
 * - endDate: ISO date string (optional, defaults to now)
 * - endpoint: Filter by endpoint pattern (optional)
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
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const endpointFilter = searchParams.get("endpoint");

    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    // Build where clause for usage aggregation
    const usageWhere = {
      tenantId,
      bucketStart: {
        gte: startDate,
        lte: endDate,
      },
      ...(endpointFilter && { endpoint: { contains: endpointFilter } }),
    };

    // Get aggregated usage data
    const usageData = await database.rateLimitUsage.groupBy({
      by: ["endpoint", "method"],
      where: usageWhere,
      _sum: {
        requestCount: true,
        blockedCount: true,
      },
      _avg: {
        avgResponseTime: true,
      },
      _max: {
        maxResponseTime: true,
      },
    });

    // Get total stats
    const totalStats = await database.rateLimitUsage.aggregate({
      where: usageWhere,
      _sum: {
        requestCount: true,
        blockedCount: true,
      },
    });

    // Get event counts by allowed status
    const eventCounts = await database.rateLimitEvent.groupBy({
      by: ["allowed"],
      where: {
        tenantId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
        ...(endpointFilter && { endpoint: { contains: endpointFilter } }),
      },
      _count: true,
    });

    // Get top blocked endpoints
    const topBlocked = await database.rateLimitEvent.groupBy({
      by: ["endpoint"],
      where: {
        tenantId,
        allowed: false,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: true,
      orderBy: {
        _count: {
          endpoint: "desc",
        },
      },
      take: 10,
    });

    // Format response
    const analytics = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        totalRequests: totalStats._sum.requestCount || 0,
        totalBlocked: totalStats._sum.blockedCount || 0,
        blockRate:
          totalStats._sum.requestCount && totalStats._sum.requestCount > 0
            ? ((totalStats._sum.blockedCount || 0) /
                totalStats._sum.requestCount) *
              100
            : 0,
      },
      byEndpoint: usageData.map((item) => ({
        endpoint: item.endpoint,
        method: item.method,
        requests: item._sum.requestCount || 0,
        blocked: item._sum.blockedCount || 0,
        avgResponseTime: item._avg.avgResponseTime,
        maxResponseTime: item._max.maxResponseTime,
      })),
      events: {
        allowed:
          eventCounts.find((e) => e.allowed === true)?._count || 0,
        blocked:
          eventCounts.find((e) => e.allowed === false)?._count || 0,
      },
      topBlockedEndpoints: topBlocked.map((item) => ({
        endpoint: item.endpoint,
        blockedCount: item._count,
      })),
    };

    return manifestSuccessResponse({ analytics });
  } catch (error) {
    console.error("[rate-limits/analytics] Error:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
