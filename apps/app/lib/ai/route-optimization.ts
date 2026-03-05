import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

export interface RouteStop {
  id: string;
  name?: string;
  latitude: number;
  longitude: number;
  demand: number;
  serviceMinutes: number;
  windowStart: Date;
  windowEnd: Date;
}

export interface RouteVehicle {
  id: string;
  name?: string;
  capacity: number;
  startLatitude: number;
  startLongitude: number;
  startTime: Date;
}

export interface RouteOptimizationRequest {
  depotLatitude: number;
  depotLongitude: number;
  stops: RouteStop[];
  vehicles: RouteVehicle[];
  enforceTimeWindows?: boolean;
  useAiInsights?: boolean;
}

interface RouteVisit {
  stop: RouteStop;
  travelMinutes: number;
  arrivalTime: Date;
  serviceStart: Date;
  departureTime: Date;
  waitMinutes: number;
  lateMinutes: number;
  distanceKm: number;
}

export interface OptimizedVehicleRoute {
  vehicleId: string;
  vehicleName?: string;
  visits: RouteVisit[];
  totalDistanceKm: number;
  totalDriveMinutes: number;
  totalServiceMinutes: number;
  totalWaitMinutes: number;
  totalLateMinutes: number;
  capacityUsed: number;
  capacityUtilization: number;
  completedAt: Date;
}

export interface UnassignedRouteStop {
  stopId: string;
  reason: string;
}

export interface RouteOptimizationSummary {
  totalStops: number;
  assignedStops: number;
  onTimeStops: number;
  totalDistanceKm: number;
  totalDriveMinutes: number;
  totalLateMinutes: number;
  averageCapacityUtilization: number;
  recommendations: string[];
}

export interface RouteOptimizationResult {
  method: "heuristic" | "heuristic_plus_ai";
  routes: OptimizedVehicleRoute[];
  unassignedStops: UnassignedRouteStop[];
  summary: RouteOptimizationSummary;
  aiInsights?: {
    summary: string;
    recommendations: string[];
  };
}

interface RouteCursor {
  latitude: number;
  longitude: number;
  currentTime: Date;
  load: number;
}

const AI_INSIGHT_SCHEMA = z.object({
  summary: z.string().max(320),
  recommendations: z.array(z.string().max(160)).max(5),
});

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineKm(
  startLatitude: number,
  startLongitude: number,
  endLatitude: number,
  endLongitude: number
): number {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(endLatitude - startLatitude);
  const lonDelta = toRadians(endLongitude - startLongitude);

  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRadians(startLatitude)) *
      Math.cos(toRadians(endLatitude)) *
      Math.sin(lonDelta / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function getTrafficMultiplier(departureTime: Date): number {
  const hour = departureTime.getHours();
  if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) {
    return 1.45;
  }

  if (hour >= 11 && hour <= 14) {
    return 1.2;
  }

  return 1;
}

function estimateTravelMinutes(
  distanceKm: number,
  departureTime: Date
): number {
  const baseSpeedKmPerHour = 42;
  const trafficMultiplier = getTrafficMultiplier(departureTime);
  const adjustedSpeed = baseSpeedKmPerHour / trafficMultiplier;
  const travelHours = distanceKm / Math.max(adjustedSpeed, 8);
  return Math.max(Math.round(travelHours * 60), 2);
}

function computeVisit(
  cursor: RouteCursor,
  stop: RouteStop,
  enforceTimeWindows: boolean
): RouteVisit {
  const distanceKm = haversineKm(
    cursor.latitude,
    cursor.longitude,
    stop.latitude,
    stop.longitude
  );

  const travelMinutes = estimateTravelMinutes(distanceKm, cursor.currentTime);
  const arrivalTime = new Date(
    cursor.currentTime.getTime() + travelMinutes * 60_000
  );

  const serviceStart =
    arrivalTime < stop.windowStart
      ? new Date(stop.windowStart)
      : new Date(arrivalTime);

  const waitMinutes = Math.max(
    0,
    Math.round((serviceStart.getTime() - arrivalTime.getTime()) / 60_000)
  );

  const lateMinutes = enforceTimeWindows
    ? Math.max(
        0,
        Math.round((serviceStart.getTime() - stop.windowEnd.getTime()) / 60_000)
      )
    : 0;

  const departureTime = new Date(
    serviceStart.getTime() + stop.serviceMinutes * 60_000
  );

  return {
    stop,
    travelMinutes,
    arrivalTime,
    serviceStart,
    departureTime,
    waitMinutes,
    lateMinutes,
    distanceKm,
  };
}

function selectNextStop(
  cursor: RouteCursor,
  candidates: RouteStop[],
  vehicle: RouteVehicle,
  enforceTimeWindows: boolean
): { stop: RouteStop; visit: RouteVisit } | null {
  let best: { stop: RouteStop; visit: RouteVisit; score: number } | null = null;

  for (const stop of candidates) {
    if (cursor.load + stop.demand > vehicle.capacity) {
      continue;
    }

    const visit = computeVisit(cursor, stop, enforceTimeWindows);
    const slackPenalty = Math.max(
      0,
      Math.round(
        (stop.windowEnd.getTime() - visit.serviceStart.getTime()) / 60_000
      )
    );

    const score =
      visit.travelMinutes +
      visit.waitMinutes * 0.4 +
      visit.lateMinutes * 5 +
      Math.min(slackPenalty, 180) * 0.03;

    if (!best || score < best.score) {
      best = { stop, visit, score };
    }
  }

  return best ? { stop: best.stop, visit: best.visit } : null;
}

function summarize(
  routes: OptimizedVehicleRoute[],
  unassignedStops: UnassignedRouteStop[]
): RouteOptimizationSummary {
  const allVisits = routes.flatMap((route) => route.visits);
  const assignedStops = allVisits.length;
  const onTimeStops = allVisits.filter(
    (visit) => visit.lateMinutes === 0
  ).length;

  const totalDistanceKm = routes.reduce(
    (sum, route) => sum + route.totalDistanceKm,
    0
  );
  const totalDriveMinutes = routes.reduce(
    (sum, route) => sum + route.totalDriveMinutes,
    0
  );
  const totalLateMinutes = routes.reduce(
    (sum, route) => sum + route.totalLateMinutes,
    0
  );

  const averageCapacityUtilization =
    routes.length > 0
      ? routes.reduce((sum, route) => sum + route.capacityUtilization, 0) /
        routes.length
      : 0;

  const recommendations: string[] = [];

  if (unassignedStops.length > 0) {
    recommendations.push(
      `${unassignedStops.length} stop(s) were unassigned. Add capacity or widen time windows.`
    );
  }

  if (totalLateMinutes > 0) {
    recommendations.push(
      "Late arrivals detected. Shift start times earlier on peak traffic hours."
    );
  }

  if (averageCapacityUtilization < 0.65) {
    recommendations.push(
      "Vehicle utilization is low. Consolidate routes to reduce fleet overhead."
    );
  } else if (averageCapacityUtilization > 0.95) {
    recommendations.push(
      "Fleet capacity is near saturation. Add overflow capacity for resilience."
    );
  }

  return {
    totalStops: assignedStops + unassignedStops.length,
    assignedStops,
    onTimeStops,
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    totalDriveMinutes,
    totalLateMinutes,
    averageCapacityUtilization: Number(averageCapacityUtilization.toFixed(3)),
    recommendations,
  };
}

async function buildAiInsights(
  input: RouteOptimizationRequest,
  result: Omit<RouteOptimizationResult, "method" | "aiInsights">
): Promise<RouteOptimizationResult["aiInsights"] | null> {
  if (!input.useAiInsights) {
    return null;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const openaiClient = createOpenAI({ apiKey });

  const prompt = `You are a routing operations analyst. Generate concise and practical insights.

Summary:
${JSON.stringify(result.summary, null, 2)}

Routes:
${JSON.stringify(
  result.routes.map((route) => ({
    vehicleId: route.vehicleId,
    stops: route.visits.map((visit) => visit.stop.id),
    totalLateMinutes: route.totalLateMinutes,
    capacityUtilization: route.capacityUtilization,
    totalDriveMinutes: route.totalDriveMinutes,
  })),
  null,
  2
)}

Unassigned:
${JSON.stringify(result.unassignedStops, null, 2)}`;

  try {
    const aiResult = await generateObject({
      model: openaiClient("gpt-4o-mini"),
      schema: AI_INSIGHT_SCHEMA,
      prompt,
      temperature: 0.3,
    });

    return aiResult.object;
  } catch {
    return null;
  }
}

export async function optimizeDeliveryRoutes(
  input: RouteOptimizationRequest
): Promise<RouteOptimizationResult> {
  const enforceTimeWindows = input.enforceTimeWindows ?? true;
  const unassigned = [...input.stops].sort(
    (a, b) => a.windowStart.getTime() - b.windowStart.getTime()
  );

  const routes: OptimizedVehicleRoute[] = input.vehicles.map((vehicle) => {
    const visits: RouteVisit[] = [];
    const cursor: RouteCursor = {
      latitude: vehicle.startLatitude,
      longitude: vehicle.startLongitude,
      currentTime: new Date(vehicle.startTime),
      load: 0,
    };

    while (unassigned.length > 0) {
      const next = selectNextStop(
        cursor,
        unassigned,
        vehicle,
        enforceTimeWindows
      );
      if (!next) {
        break;
      }

      visits.push(next.visit);

      cursor.latitude = next.stop.latitude;
      cursor.longitude = next.stop.longitude;
      cursor.currentTime = next.visit.departureTime;
      cursor.load += next.stop.demand;

      const idx = unassigned.findIndex(
        (candidate) => candidate.id === next.stop.id
      );
      if (idx >= 0) {
        unassigned.splice(idx, 1);
      }
    }

    const returnDistanceKm =
      visits.length > 0
        ? haversineKm(
            cursor.latitude,
            cursor.longitude,
            input.depotLatitude,
            input.depotLongitude
          )
        : 0;

    const returnDriveMinutes =
      visits.length > 0
        ? estimateTravelMinutes(returnDistanceKm, cursor.currentTime)
        : 0;

    const totalDistanceKm =
      visits.reduce((sum, visit) => sum + visit.distanceKm, 0) +
      returnDistanceKm;

    const totalDriveMinutes =
      visits.reduce((sum, visit) => sum + visit.travelMinutes, 0) +
      returnDriveMinutes;

    const totalServiceMinutes = visits.reduce(
      (sum, visit) => sum + visit.stop.serviceMinutes,
      0
    );

    const totalWaitMinutes = visits.reduce(
      (sum, visit) => sum + visit.waitMinutes,
      0
    );
    const totalLateMinutes = visits.reduce(
      (sum, visit) => sum + visit.lateMinutes,
      0
    );
    const capacityUsed = visits.reduce(
      (sum, visit) => sum + visit.stop.demand,
      0
    );

    const completedAt = new Date(
      cursor.currentTime.getTime() + returnDriveMinutes * 60_000
    );

    return {
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      visits,
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      totalDriveMinutes,
      totalServiceMinutes,
      totalWaitMinutes,
      totalLateMinutes,
      capacityUsed,
      capacityUtilization:
        vehicle.capacity > 0
          ? Number((capacityUsed / vehicle.capacity).toFixed(3))
          : 0,
      completedAt,
    };
  });

  const unassignedStops: UnassignedRouteStop[] = unassigned.map((stop) => ({
    stopId: stop.id,
    reason:
      "No feasible assignment with current vehicle capacity/time windows and traffic assumptions",
  }));

  const summary = summarize(routes, unassignedStops);

  const deterministicResult = {
    routes,
    unassignedStops,
    summary,
  };

  const aiInsights = await buildAiInsights(input, deterministicResult);

  return {
    method: aiInsights ? "heuristic_plus_ai" : "heuristic",
    ...deterministicResult,
    aiInsights: aiInsights ?? undefined,
  };
}

export const routeOptimizationRequestSchema = z.object({
  depotLatitude: z.number().min(-90).max(90),
  depotLongitude: z.number().min(-180).max(180),
  enforceTimeWindows: z.boolean().optional(),
  useAiInsights: z.boolean().optional(),
  vehicles: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().optional(),
      capacity: z.number().positive(),
      startLatitude: z.number().min(-90).max(90),
      startLongitude: z.number().min(-180).max(180),
      startTime: z.string().datetime(),
    })
  ),
  stops: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().optional(),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      demand: z.number().nonnegative(),
      serviceMinutes: z.number().int().nonnegative(),
      windowStart: z.string().datetime(),
      windowEnd: z.string().datetime(),
    })
  ),
});

export function toRouteOptimizationRequest(
  payload: z.infer<typeof routeOptimizationRequestSchema>
): RouteOptimizationRequest {
  return {
    depotLatitude: payload.depotLatitude,
    depotLongitude: payload.depotLongitude,
    enforceTimeWindows: payload.enforceTimeWindows,
    useAiInsights: payload.useAiInsights,
    vehicles: payload.vehicles.map((vehicle) => ({
      ...vehicle,
      startTime: new Date(vehicle.startTime),
    })),
    stops: payload.stops
      .map((stop) => ({
        ...stop,
        windowStart: new Date(stop.windowStart),
        windowEnd: new Date(stop.windowEnd),
      }))
      .filter((stop) => stop.windowEnd.getTime() > stop.windowStart.getTime()),
  };
}
