/**
 * Route Optimization API Endpoint
 *
 * POST /api/logistics/routes/commands/optimize
 *
 * Implements nearest-neighbor TSP heuristic to reorder delivery route stops
 * by minimizing total travel distance (Haversine formula). Updates each stop's
 * stopNumber, distanceFromPrevious, and timeFromPrevious, then sets the route
 * status to "optimized" with aggregate metrics.
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";

const URBAN_AVERAGE_SPEED_KMH = 40;
const KM_PER_MINUTE = URBAN_AVERAGE_SPEED_KMH / 60;

/**
 * Haversine distance between two geographic points.
 * Returns distance in kilometers.
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Build a symmetric distance matrix for all stops using Haversine.
 * `coords` is an array of [lat, lon] pairs indexed by stop position.
 */
function buildDistanceMatrix(coords: Array<[number, number]>): number[][] {
  const n = coords.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = haversineDistance(
        coords[i][0],
        coords[i][1],
        coords[j][0],
        coords[j][1],
      );
      matrix[i][j] = d;
      matrix[j][i] = d;
    }
  }
  return matrix;
}

/**
 * Nearest-neighbor TSP heuristic.
 * Starts from `startIndex`, then always picks the closest unvisited stop.
 * Returns the ordered array of original indices.
 */
function nearestNeighborTsp(
  distanceMatrix: number[][],
  startIndex: number,
): number[] {
  const n = distanceMatrix.length;
  const visited = new Set<number>();
  const order: number[] = [startIndex];
  visited.add(startIndex);

  let current = startIndex;
  while (visited.size < n) {
    let nearestDist = Number.POSITIVE_INFINITY;
    let nearestIdx = -1;
    for (let j = 0; j < n; j++) {
      if (!visited.has(j) && distanceMatrix[current][j] < nearestDist) {
        nearestDist = distanceMatrix[current][j];
        nearestIdx = j;
      }
    }
    if (nearestIdx === -1) break;
    order.push(nearestIdx);
    visited.add(nearestIdx);
    current = nearestIdx;
  }

  return order;
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();

    const body = await request.json();
    const { routeId } = body;

    if (!routeId) {
      return NextResponse.json(
        { error: "Route ID required" },
        { status: 400 },
      );
    }

    // Fetch the route with its stops
    const route = await database.deliveryRoute.findUnique({
      where: { tenantId_id: { tenantId, id: routeId } },
      include: {
        stops: { orderBy: { stopNumber: "asc" } },
      },
    });

    if (!route) {
      return NextResponse.json(
        { error: "Route not found" },
        { status: 404 },
      );
    }

    if (route.stops.length < 2) {
      return NextResponse.json(
        { error: "Route must have at least 2 stops to optimize" },
        { status: 400 },
      );
    }

    // Validate all stops have coordinates
    const stopsWithCoords = route.stops.filter(
      (s) => s.latitude !== null && s.longitude !== null,
    );
    if (stopsWithCoords.length < 2) {
      return NextResponse.json(
        {
          error:
            "At least 2 stops must have latitude and longitude coordinates to optimize",
        },
        { status: 400 },
      );
    }

    // Extract coordinates for stops that have them (only these are reordered)
    const coords: Array<[number, number]> = stopsWithCoords.map((s) => [
      Number(s.latitude),
      Number(s.longitude),
    ]);

    // Build distance matrix and run nearest-neighbor TSP
    const distanceMatrix = buildDistanceMatrix(coords);
    const optimizedOrder = nearestNeighborTsp(distanceMatrix, 0);

    // Calculate per-stop distance and time from previous
    const stopMetrics: Array<{
      originalIndex: number;
      distanceFromPrevious: number;
      timeFromPrevious: number;
    }> = [];

    let totalDistance = 0;

    for (let i = 0; i < optimizedOrder.length; i++) {
      const originalIdx = optimizedOrder[i];
      if (i === 0) {
        stopMetrics.push({
          originalIndex: originalIdx,
          distanceFromPrevious: 0,
          timeFromPrevious: 0,
        });
      } else {
        const prevIdx = optimizedOrder[i - 1];
        const dist = distanceMatrix[prevIdx][originalIdx];
        const time = dist / KM_PER_MINUTE;
        totalDistance += dist;
        stopMetrics.push({
          originalIndex: originalIdx,
          distanceFromPrevious: Math.round(dist * 100) / 100,
          timeFromPrevious: Math.round(time),
        });
      }
    }

    const totalDuration = Math.round(totalDistance / KM_PER_MINUTE);
    const optimizationScore = Math.max(
      0,
      Math.min(100, 100 - totalDistance * 2),
    );

    // Reorder stops: optimized stops first (with updated metrics), then any stops without coords appended
    const stopsWithoutCoords = route.stops.filter(
      (s) => s.latitude === null || s.longitude === null,
    );

    // Update each optimized stop: new stopNumber, distanceFromPrevious, timeFromPrevious
    const updatePromises = stopMetrics.map((metric, newIndex) => {
      const stop = stopsWithCoords[metric.originalIndex];
      return database.routeStop.update({
        where: { id: stop.id },
        data: {
          stopNumber: newIndex + 1,
          distanceFromPrevious:
            metric.distanceFromPrevious > 0
              ? metric.distanceFromPrevious
              : null,
          timeFromPrevious:
            metric.timeFromPrevious > 0 ? metric.timeFromPrevious : null,
        },
      });
    });

    // Append stops without coordinates at the end (preserve their relative order)
    const offsetNumber = stopMetrics.length;
    for (let i = 0; i < stopsWithoutCoords.length; i++) {
      const stop = stopsWithoutCoords[i];
      updatePromises.push(
        database.routeStop.update({
          where: { id: stop.id },
          data: {
            stopNumber: offsetNumber + i + 1,
          },
        }),
      );
    }

    await Promise.all(updatePromises);

    // Update the route with aggregate optimization metrics
    const updatedRoute = await database.deliveryRoute.update({
      where: { tenantId_id: { tenantId, id: routeId } },
      data: {
        status: "optimized",
        totalDistance: Math.round(totalDistance * 100) / 100,
        totalDuration,
        optimizationScore: Math.round(optimizationScore * 100) / 100,
        optimizationAlgorithm: "nearest-neighbor-tsp",
      },
      include: {
        stops: { orderBy: { stopNumber: "asc" } },
      },
    });

    return NextResponse.json({ route: updatedRoute });
  } catch (error) {
    captureException(error);
    log.error("Error optimizing route:", error);
    return NextResponse.json(
      { error: "Failed to optimize route" },
      { status: 500 },
    );
  }
}
