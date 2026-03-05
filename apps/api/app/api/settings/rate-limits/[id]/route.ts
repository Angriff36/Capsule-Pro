import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-guards";
import { rateLimitService } from "@/app/lib/rate-limiting";
import { requireCurrentUser } from "@/app/lib/tenant";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * PATCH /api/settings/rate-limits/[id]
 *
 * Update a rate limit configuration.
 * Requires admin role.
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCurrentUser();
    if (!requireAdmin(user)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();

    // Validate that at least one field is being updated
    const updatableFields = [
      "name",
      "endpointPattern",
      "windowMs",
      "maxRequests",
      "burstAllowance",
      "priority",
      "isActive",
    ] as const;

    const hasUpdates = updatableFields.some((field) => field in body);
    if (!hasUpdates) {
      return NextResponse.json(
        { message: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Validate numeric fields
    if (
      body.windowMs !== undefined &&
      (typeof body.windowMs !== "number" || body.windowMs <= 0)
    ) {
      return NextResponse.json(
        { message: "windowMs must be a positive number" },
        { status: 400 }
      );
    }

    if (
      body.maxRequests !== undefined &&
      (typeof body.maxRequests !== "number" || body.maxRequests <= 0)
    ) {
      return NextResponse.json(
        { message: "maxRequests must be a positive number" },
        { status: 400 }
      );
    }

    if (
      body.burstAllowance !== undefined &&
      (typeof body.burstAllowance !== "number" || body.burstAllowance < 0)
    ) {
      return NextResponse.json(
        { message: "burstAllowance must be a non-negative number" },
        { status: 400 }
      );
    }

    if (body.priority !== undefined && !Number.isInteger(body.priority)) {
      return NextResponse.json(
        { message: "priority must be an integer" },
        { status: 400 }
      );
    }

    if (body.isActive !== undefined && typeof body.isActive !== "boolean") {
      return NextResponse.json(
        { message: "isActive must be a boolean" },
        { status: 400 }
      );
    }

    const config = await rateLimitService.updateConfig(id, body);

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
    console.error("[RateLimits] Failed to update config:", error);
    return NextResponse.json(
      { message: "Failed to update rate limit configuration" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/rate-limits/[id]
 *
 * Delete a rate limit configuration.
 * Requires admin role.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCurrentUser();
    if (!requireAdmin(user)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    await rateLimitService.deleteConfig(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RateLimits] Failed to delete config:", error);
    return NextResponse.json(
      { message: "Failed to delete rate limit configuration" },
      { status: 500 }
    );
  }
}
