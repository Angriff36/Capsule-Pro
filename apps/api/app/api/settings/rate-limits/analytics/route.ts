import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-guards";
import { rateLimitService } from "@/app/lib/rate-limiting";
import { requireCurrentUser } from "@/app/lib/tenant";

/**
 * GET /api/settings/rate-limits/analytics
 *
 * Get rate limiting usage analytics for the current tenant.
 * Requires admin role.
 *
 * Query parameters:
 * - endpoint: Filter by endpoint pattern
 * - method: Filter by HTTP method
 * - since: ISO date string for filtering start time
 * - until: ISO date string for filtering end time
 * - limit: Maximum number of results (default: 100)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireCurrentUser();
    if (!requireAdmin(user)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);

    const endpoint = searchParams.get("endpoint") ?? undefined;
    const method = searchParams.get("method") ?? undefined;
    const since = searchParams.get("since") ?? undefined;
    const until = searchParams.get("until") ?? undefined;
    const limit = searchParams.get("limit")
      ? Number.parseInt(searchParams.get("limit")!, 10)
      : undefined;

    const stats = await rateLimitService.getUsageStats({
      endpoint,
      method,
      since: since ? new Date(since) : undefined,
      until: until ? new Date(until) : undefined,
      limit,
    });

    return NextResponse.json({
      stats: stats.map((s) => ({
        endpoint: s.endpoint,
        method: s.method,
        requestCount: s.requestCount,
        blockedCount: s.blockedCount,
        blockRate:
          s.requestCount + s.blockedCount > 0
            ? s.blockedCount / (s.requestCount + s.blockedCount)
            : 0,
        avgResponseTime: s.avgResponseTime,
        maxResponseTime: s.maxResponseTime,
        uniqueUsers: s.uniqueUsers,
        bucketStart: s.bucketStart,
      })),
    });
  } catch (error) {
    console.error("[RateLimits] Failed to get analytics:", error);
    return NextResponse.json(
      { message: "Failed to get rate limit analytics" },
      { status: 500 }
    );
  }
}
