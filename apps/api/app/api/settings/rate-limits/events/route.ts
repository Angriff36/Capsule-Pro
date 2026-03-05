import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-guards";
import { rateLimitService } from "@/app/lib/rate-limiting";
import { requireCurrentUser } from "@/app/lib/tenant";

/**
 * GET /api/settings/rate-limits/events
 *
 * Get rate limit events for audit trail.
 * Requires admin role.
 *
 * Query parameters:
 * - endpoint: Filter by endpoint pattern
 * - allowed: Filter by allowed status (true or false)
 * - since: ISO date string for filtering start time
 * - limit: Maximum number of results (default: 100)
 * - offset: Offset for pagination (default: 0)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireCurrentUser();
    if (!requireAdmin(user)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);

    const endpoint = searchParams.get("endpoint") ?? undefined;
    const allowedParam = searchParams.get("allowed");
    const allowed =
      allowedParam === "true"
        ? true
        : allowedParam === "false"
          ? false
          : undefined;
    const since = searchParams.get("since") ?? undefined;
    const limit = searchParams.get("limit")
      ? Number.parseInt(searchParams.get("limit")!, 10)
      : undefined;
    const offset = searchParams.get("offset")
      ? Number.parseInt(searchParams.get("offset")!, 10)
      : undefined;

    const events = await rateLimitService.getEvents({
      endpoint,
      allowed,
      since: since ? new Date(since) : undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      events,
      count: events.length,
    });
  } catch (error) {
    console.error("[RateLimits] Failed to get events:", error);
    return NextResponse.json(
      { message: "Failed to get rate limit events" },
      { status: 500 }
    );
  }
}
