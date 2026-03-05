import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-guards";
import { rateLimitService } from "@/app/lib/rate-limiting";
import { requireCurrentUser } from "@/app/lib/tenant";

/**
 * GET /api/settings/rate-limits
 *
 * List all rate limit configurations for the current tenant.
 * Requires admin role.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireCurrentUser();
    if (!requireAdmin(user)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const configs = await rateLimitService.getConfigs();

    return NextResponse.json({
      configs: configs.map((c) => ({
        id: c.id,
        name: c.name,
        endpointPattern: c.endpointPattern,
        windowMs: c.windowMs,
        maxRequests: c.maxRequests,
        burstAllowance: c.burstAllowance,
        priority: c.priority,
        isActive: c.isActive,
      })),
    });
  } catch (error) {
    console.error("[RateLimits] Failed to list configs:", error);
    return NextResponse.json(
      { message: "Failed to list rate limit configurations" },
      { status: 500 }
    );
  }
}
