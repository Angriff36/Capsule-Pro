import { NextRequest, NextResponse } from 'next/server';
import { database } from '@repo/database';
import { getTenantId } from '@/lib/auth';
import { Decimal } from '@prisma/client/runtime/library';

interface StopWithCoords {
  id: string;
  stopNumber: number;
  latitude: Decimal | null;
  longitude: Decimal | null;
  plannedDuration: number | null;
}

// Simple nearest-neighbor TSP approximation
function optimizeStops(stops: StopWithCoords[]): number[] {
  if (stops.length <= 2) return stops.map((s) => s.stopNumber);

  const coords = stops
    .filter((s) => s.latitude && s.longitude)
    .map((s) => ({
      id: s.id,
      stopNumber: s.stopNumber,
      lat: parseFloat(s.latitude!.toString()),
      lng: parseFloat(s.longitude!.toString()),
      duration: s.plannedDuration || 15,
    }));

  if (coords.length < 2) return stops.map((s) => s.stopNumber);

  // Keep first stop fixed (usually depot/pickup)
  const first = coords[0];
  const remaining = coords.slice(1);
  const ordered = [first];
  const unused = [...remaining];

  while (unused.length > 0) {
    const current = ordered[ordered.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < unused.length; i++) {
      const dist = Math.sqrt(
        Math.pow(unused[i].lat - current.lat, 2) +
          Math.pow(unused[i].lng - current.lng, 2)
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    ordered.push(unused[nearestIdx]);
    unused.splice(nearestIdx, 1);
  }

  return ordered.map((s) => s.stopNumber);
}

// Estimate distance using Haversine formula
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { routeId } = body;

    if (!routeId) {
      return NextResponse.json({ error: 'Route ID required' }, { status: 400 });
    }

    const route = await database.deliveryRoute.findFirst({
      where: { tenantId, id: routeId, deletedAt: null },
      include: {
        stops: {
          orderBy: { stopNumber: 'asc' },
        },
      },
    });

    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    if (route.stops.length < 2) {
      return NextResponse.json(
        { error: 'Need at least 2 stops to optimize' },
        { status: 400 }
      );
    }

    // Get optimized order
    const optimizedOrder = optimizeStops(route.stops as StopWithCoords[]);

    // Calculate total distance and time
    let totalDistance = 0;
    let totalDuration = 0;

    const stopsCoords = route.stops.map((s) => ({
      lat: s.latitude ? parseFloat(s.latitude.toString()) : null,
      lng: s.longitude ? parseFloat(s.longitude.toString()) : null,
      duration: s.plannedDuration || 15,
    }));

    for (let i = 0; i < stopsCoords.length - 1; i++) {
      const current = stopsCoords[i];
      const next = stopsCoords[i + 1];

      if (current.lat && current.lng && next.lat && next.lng) {
        const dist = calculateDistance(current.lat, current.lng, next.lat, next.lng);
        totalDistance += dist;
        // Assume average speed of 40 km/h for time estimation
        totalDuration += (dist / 40) * 60; // minutes
      }
      totalDuration += current.duration;
    }
    totalDuration += stopsCoords[stopsCoords.length - 1]?.duration || 0;

    // Update stops with new order and distances
    const updates = [];
    let cumulativeDistance = 0;

    for (let i = 0; i < optimizedOrder.length; i++) {
      const stopNumber = optimizedOrder[i];
      const stop = route.stops.find((s) => s.stopNumber === stopNumber)!;
      const stopCoords = stopsCoords.find(
        (_, idx) => route.stops[idx].stopNumber === stopNumber
      );

      let distanceFromPrev = null;
      if (i > 0 && stopCoords?.lat && stopCoords?.lng) {
        const prevIdx = optimizedOrder.indexOf(optimizedOrder[i - 1]);
        const prevCoords = stopsCoords[prevIdx];
        if (prevCoords?.lat && prevCoords?.lng) {
          distanceFromPrev = calculateDistance(
            prevCoords.lat,
            prevCoords.lng,
            stopCoords.lat,
            stopCoords.lng
          );
          cumulativeDistance += distanceFromPrev;
        }
      }

      updates.push(
        database.routeStop.update({
          where: { id: stop.id },
          data: {
            stopNumber: i + 1,
            distanceFromPrevious: distanceFromPrev,
            timeFromPrevious: distanceFromPrev
              ? Math.round((distanceFromPrev / 40) * 60)
              : null,
          },
        })
      );
    }

    await Promise.all(updates);

    // Update route with optimization metadata
    const updatedRoute = await database.deliveryRoute.update({
      where: { id: routeId },
      data: {
        status: 'optimized',
        totalDistance: new Decimal(totalDistance.toFixed(2)),
        totalDuration: Math.round(totalDuration),
        optimizationScore: new Decimal(
          ((route.stops.length - optimizedOrder.filter((n, i) => n !== route.stops[i]?.stopNumber).length) /
            route.stops.length *
            100).toFixed(2)
        ),
        optimizationAlgorithm: 'nearest-neighbor',
      },
      include: {
        stops: { orderBy: { stopNumber: 'asc' } },
      },
    });

    return NextResponse.json({
      route: updatedRoute,
      optimization: {
        originalOrder: route.stops.map((s) => s.stopNumber),
        optimizedOrder,
        totalDistance: totalDistance.toFixed(2),
        totalDuration: Math.round(totalDuration),
        stopsReordered: optimizedOrder.some(
          (n, i) => n !== route.stops[i]?.stopNumber
        ),
      },
    });
  } catch (error) {
    console.error('Error optimizing route:', error);
    return NextResponse.json(
      { error: 'Failed to optimize route' },
      { status: 500 }
    );
  }
}
