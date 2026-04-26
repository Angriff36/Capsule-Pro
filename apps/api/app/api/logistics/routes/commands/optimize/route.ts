/**
 * Route Optimization API Endpoint
 *
 * POST /api/logistics/routes/commands/optimize - Optimize delivery route stops
 *
 * Algorithm: Nearest-Neighbor TSP heuristic.
 *   1. The first stop (stopNumber=1) is treated as the depot/anchor and stays fixed.
 *   2. From the anchor, repeatedly pick the unvisited stop closest by
 *      great-circle (Haversine) distance until all stops are sequenced.
 *   3. Renumber stops 1..N in the new order; recompute distance/time legs.
 *   4. Persist the new sequence + route metadata in a single transaction.
 *
 * Why nearest-neighbor: it has zero external dependencies, runs in O(n^2),
 * and produces a sane sequence for the small (<30 stop) routes typical of
 * catering deliveries. We document the algorithm name on the route so a
 * future swap to OR-Tools / Christofides is auditable.
 *
 * Why not skip optimization when score is low: even a 0% improvement run
 * still recomputes leg distances/times that may have been stale, and flips
 * the route status to "optimized" so dispatchers know it has been reviewed.
 */

import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";

export const runtime = "nodejs";

const ALGORITHM_NAME = "nearest-neighbor-v1";

// Average urban delivery speed used to convert distance to drive time.
// Conservative for stop-and-go truck/van routes; tune later from telemetry.
const AVERAGE_SPEED_KMH = 50;

/**
 * Coordinates come back from Prisma as Decimal at runtime, but we accept any
 * value Number(...) can coerce so tests can pass plain numbers.
 */
interface StopForOptimization {
  id: string;
  stopNumber: number;
  latitude: unknown;
  longitude: unknown;
}

/**
 * Great-circle distance between two coordinates in kilometers.
 */
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const earthRadiusKm = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

/**
 * Order stops via nearest-neighbor starting from the existing first stop.
 * Returns the optimized array along with cumulative leg distances (km) and
 * times (minutes) per stop in optimized order. Index 0 corresponds to the
 * anchor and has distance/time = 0.
 */
function nearestNeighborOrder(stops: StopForOptimization[]): {
  ordered: StopForOptimization[];
  legDistanceKm: number[];
  legTimeMin: number[];
} {
  if (stops.length === 0) {
    return { ordered: [], legDistanceKm: [], legTimeMin: [] };
  }

  const anchor =
    stops.find((s) => s.stopNumber === 1) ??
    stops.slice().sort((a, b) => a.stopNumber - b.stopNumber)[0];

  const remaining = stops.filter((s) => s.id !== anchor.id);
  const ordered: StopForOptimization[] = [anchor];
  const legDistanceKm: number[] = [0];
  const legTimeMin: number[] = [0];

  let current = anchor;
  while (remaining.length > 0) {
    const currentLat = Number(current.latitude);
    const currentLon = Number(current.longitude);

    let bestIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const d = haversineKm(
        currentLat,
        currentLon,
        Number(candidate.latitude),
        Number(candidate.longitude)
      );
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    legDistanceKm.push(bestDist);
    legTimeMin.push(Math.round((bestDist / AVERAGE_SPEED_KMH) * 60));
    current = next;
  }

  return { ordered, legDistanceKm, legTimeMin };
}

/**
 * Total distance for a sequence in original order — used as a baseline so we
 * can report an optimization score (% improvement vs. the input order).
 */
function totalDistanceForExistingOrder(stops: StopForOptimization[]): number {
  if (stops.length < 2) {
    return 0;
  }
  const sorted = stops.slice().sort((a, b) => a.stopNumber - b.stopNumber);
  let total = 0;
  for (let i = 1; i < sorted.length; i++) {
    total += haversineKm(
      Number(sorted[i - 1].latitude),
      Number(sorted[i - 1].longitude),
      Number(sorted[i].latitude),
      Number(sorted[i].longitude)
    );
  }
  return total;
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();

    const body = await request.json();
    const { routeId } = body as { routeId?: string };

    if (!routeId) {
      return NextResponse.json({ error: "Route ID required" }, { status: 400 });
    }

    const existing = await database.deliveryRoute.findFirst({
      where: { tenantId, id: routeId, deletedAt: null },
      include: { stops: { orderBy: { stopNumber: "asc" } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    if (existing.status === "completed" || existing.status === "cancelled") {
      return NextResponse.json(
        {
          error: "Route cannot be optimized",
          message: `Route is ${existing.status}`,
        },
        { status: 409 }
      );
    }

    const stops = existing.stops as StopForOptimization[];

    // Trivial cases — still flip status to "optimized" for auditability.
    if (stops.length < 2) {
      const route = await database.deliveryRoute.update({
        where: { tenantId_id: { tenantId, id: routeId } },
        data: {
          status: "optimized",
          totalDistance: "0",
          totalDuration: 0,
          optimizationScore: "0",
          optimizationAlgorithm: ALGORITHM_NAME,
        },
        include: { stops: { orderBy: { stopNumber: "asc" } } },
      });
      return NextResponse.json({ route });
    }

    const missingCoords = stops.filter(
      (s) => s.latitude === null || s.longitude === null
    );
    if (missingCoords.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot optimize: stops missing coordinates",
          stopIds: missingCoords.map((s) => s.id),
        },
        { status: 422 }
      );
    }

    const baselineDistance = totalDistanceForExistingOrder(stops);
    const { ordered, legDistanceKm, legTimeMin } = nearestNeighborOrder(stops);

    const totalDistanceKm = legDistanceKm.reduce((a, b) => a + b, 0);
    const totalDurationMin = legTimeMin.reduce((a, b) => a + b, 0);

    // Score = % reduction vs. baseline, clamped to [0, 100].
    // If the input was already optimal (or better than nearest-neighbor),
    // we surface 0 — the algorithm did not regress, it simply found nothing
    // to improve.
    const rawScore =
      baselineDistance > 0
        ? ((baselineDistance - totalDistanceKm) / baselineDistance) * 100
        : 0;
    const optimizationScore = Math.max(0, Math.min(100, rawScore));

    // Persist atomically: update each stop's order/legs, then route metadata.
    const updatedRoute = await database.$transaction(async (tx) => {
      // Two-phase renumber to dodge the (route_id, stop_number) unique
      // constraint while we shuffle. Phase 1: park each stop on a negative
      // index keyed off id stability. Phase 2: assign the final 1..N.
      for (let i = 0; i < ordered.length; i++) {
        await tx.routeStop.update({
          where: { tenantId_id: { tenantId, id: ordered[i].id } },
          data: { stopNumber: -(i + 1) },
        });
      }

      for (let i = 0; i < ordered.length; i++) {
        await tx.routeStop.update({
          where: { tenantId_id: { tenantId, id: ordered[i].id } },
          data: {
            stopNumber: i + 1,
            distanceFromPrevious: legDistanceKm[i].toFixed(2),
            timeFromPrevious: legTimeMin[i],
          },
        });
      }

      return tx.deliveryRoute.update({
        where: { tenantId_id: { tenantId, id: routeId } },
        data: {
          status: "optimized",
          totalDistance: totalDistanceKm.toFixed(2),
          totalDuration: totalDurationMin,
          optimizationScore: optimizationScore.toFixed(2),
          optimizationAlgorithm: ALGORITHM_NAME,
        },
        include: { stops: { orderBy: { stopNumber: "asc" } } },
      });
    });

    return NextResponse.json({ route: updatedRoute });
  } catch (error) {
    captureException(error);
    console.error("Error optimizing route:", error);
    return NextResponse.json(
      { error: "Failed to optimize route" },
      { status: 500 }
    );
  }
}
