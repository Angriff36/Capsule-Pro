/**
 * Route Optimization API Endpoint
 *
 * POST /api/logistics/routes/commands/optimize - Optimize delivery route stops
 *
 * NOTE: DeliveryRoute and RouteStop models now have all required fields
 * (stops relation, totalDistance, totalDuration, optimizationScore,
 * optimizationAlgorithm, distanceFromPrevious, timeFromPrevious).
 * This endpoint returns 501 until an optimization algorithm is chosen.
 */

import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();

    const body = await request.json();
    const { routeId } = body;

    if (!routeId) {
      return NextResponse.json({ error: "Route ID required" }, { status: 400 });
    }

    // NOTE: All required schema fields now exist (stops, totalDistance, totalDuration,
    // optimizationScore, optimizationAlgorithm on DeliveryRoute; distanceFromPrevious,
    // timeFromPrevious on RouteStop). Implementation pending algorithm design.
    // BLOCKER: No route optimization algorithm chosen yet (TSP variants, OSRM integration).
    // Tracked as capsule-pro/TODO:route-optimization-algorithm

    return NextResponse.json(
      {
        error: "Route optimization not yet implemented",
        message: "Schema ready — pending algorithm selection (TSP/OSRM)",
      },
      { status: 501 }
    );
  } catch (error) {
    captureException(error);
    console.error("Error optimizing route:", error);
    return NextResponse.json(
      { error: "Failed to optimize route" },
      { status: 500 }
    );
  }
}
