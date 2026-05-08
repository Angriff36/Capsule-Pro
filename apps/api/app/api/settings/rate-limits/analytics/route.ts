/**
 * Rate Limits Analytics Endpoint
 *
 * GET /api/settings/rate-limits/analytics - Get rate limit usage analytics
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
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

    // Build shared where clause for rateLimitEvent queries.
    // The middleware writes to rateLimitEvent exclusively; rateLimitUsage has
    // zero writers so all analytics must be derived from events.
    const eventWhere = {
      tenantId,
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
      ...(endpointFilter && { endpoint: { contains: endpointFilter } }),
    };

    // Total event counts by allowed status (replaces rateLimitUsage aggregate)
    const [eventCounts, byEndpoint, topBlocked, topIps] = await Promise.all([
      // 1. Allowed vs blocked counts
      database.rateLimitEvent.groupBy({
        by: ["allowed"],
        where: eventWhere,
        _count: true,
      }),

      // 2. Aggregated per-endpoint breakdown
      database.rateLimitEvent.groupBy({
        by: ["endpoint", "method"],
        where: eventWhere,
        _count: true,
        _sum: {
          requestsInWindow: true,
        },
        orderBy: {
          _count: {
            endpoint: "desc",
          },
        },
      }),

      // 3. Top blocked endpoints
      database.rateLimitEvent.groupBy({
        by: ["endpoint"],
        where: {
          ...eventWhere,
          allowed: false,
        },
        _count: true,
        orderBy: {
          _count: {
            endpoint: "desc",
          },
        },
        take: 10,
      }),

      // 4. Top IPs by request volume (allowed requests only)
      database.rateLimitEvent.groupBy({
        by: ["ipHash"],
        where: {
          ...eventWhere,
          ipHash: { not: null },
        },
        _count: true,
        orderBy: {
          _count: {
            ipHash: "desc",
          },
        },
        take: 10,
      }),
    ]);

    const totalAllowed =
      eventCounts.find((e) => e.allowed === true)?._count ?? 0;
    const totalBlocked =
      eventCounts.find((e) => e.allowed === false)?._count ?? 0;
    const totalRequests = totalAllowed + totalBlocked;

    // Get per-endpoint blocked counts for the breakdown
    const blockedByEndpoint = await database.rateLimitEvent.groupBy({
      by: ["endpoint", "method"],
      where: {
        ...eventWhere,
        allowed: false,
      },
      _count: true,
    });

    // Build a lookup for blocked counts keyed by "endpoint|method"
    const blockedMap = new Map(
      blockedByEndpoint.map((item) => [
        `${item.endpoint}|${item.method}`,
        item._count,
      ])
    );

    // Format response
    const analytics = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        totalRequests,
        totalBlocked,
        blockRate: totalRequests > 0 ? (totalBlocked / totalRequests) * 100 : 0,
      },
      byEndpoint: byEndpoint.map((item) => ({
        endpoint: item.endpoint,
        method: item.method,
        requests: item._count,
        blocked: blockedMap.get(`${item.endpoint}|${item.method}`) ?? 0,
        avgRequestsInWindow: item._sum.requestsInWindow
          ? Math.round(item._sum.requestsInWindow / item._count)
          : 0,
      })),
      events: {
        allowed: totalAllowed,
        blocked: totalBlocked,
      },
      topBlockedEndpoints: topBlocked.map((item) => ({
        endpoint: item.endpoint,
        blockedCount: item._count,
      })),
      topIps: topIps
        .filter((item) => item.ipHash !== null)
        .map((item) => ({
          ipHash: item.ipHash,
          requestCount: item._count,
        })),
    };

    return manifestSuccessResponse({ analytics });
  } catch (error) {
    captureException(error);
    log.error("[rate-limits/analytics] Error:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
