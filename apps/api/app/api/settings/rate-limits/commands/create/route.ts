import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-guards";
import { rateLimitService } from "@/app/lib/rate-limiting";
import { requireCurrentUser } from "@/app/lib/tenant";

/**
 * POST /api/settings/rate-limits/commands/create
 *
 * Create a new rate limit configuration.
 * Requires admin role.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireCurrentUser();
    if (!requireAdmin(user)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Validate request body
    const {
      name,
      endpointPattern,
      windowMs,
      maxRequests,
      burstAllowance,
      priority,
    } = body;

    if (!(name && endpointPattern && windowMs && maxRequests)) {
      return NextResponse.json(
        {
          message:
            "Missing required fields: name, endpointPattern, windowMs, maxRequests",
        },
        { status: 400 }
      );
    }

    // Validate windowMs (must be positive)
    if (typeof windowMs !== "number" || windowMs <= 0) {
      return NextResponse.json(
        { message: "windowMs must be a positive number" },
        { status: 400 }
      );
    }

    // Validate maxRequests (must be positive)
    if (typeof maxRequests !== "number" || maxRequests <= 0) {
      return NextResponse.json(
        { message: "maxRequests must be a positive number" },
        { status: 400 }
      );
    }

    // Validate burstAllowance (must be non-negative)
    if (
      burstAllowance !== undefined &&
      (typeof burstAllowance !== "number" || burstAllowance < 0)
    ) {
      return NextResponse.json(
        { message: "burstAllowance must be a non-negative number" },
        { status: 400 }
      );
    }

    // Validate priority (must be integer)
    if (priority !== undefined && !Number.isInteger(priority)) {
      return NextResponse.json(
        { message: "priority must be an integer" },
        { status: 400 }
      );
    }

    const config = await rateLimitService.createConfig({
      name,
      endpointPattern,
      windowMs,
      maxRequests,
      burstAllowance,
      priority,
    });

    return NextResponse.json({
      config: {
        id: config.id,
        name: config.name,
        endpointPattern: config.endpointPattern,
        windowMs: config.windowMs,
        maxRequests: config.maxRequests,
        burstAllowance: config.burstAllowance,
        priority: config.priority,
        isActive: config.isActive,
      },
    });
  } catch (error) {
    console.error("[RateLimits] Failed to create config:", error);
    return NextResponse.json(
      { message: "Failed to create rate limit configuration" },
      { status: 500 }
    );
  }
}
