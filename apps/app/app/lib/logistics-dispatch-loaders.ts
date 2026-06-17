/**
 * Logistics Dispatch Data Loaders
 *
 * Client-side functions for assembling dispatch data from manifest-client queries.
 * Follows the pattern of kanban-data-loaders.ts and shipments.ts.
 */

import {
  listLogisticsRoutes,
  listLogisticsDispatches,
  listDrivers,
  listRouteStops,
} from "@/app/lib/manifest-client.generated";

// ============================================================================
// Type Definitions
// ============================================================================

export interface RouteStop {
  id: string;
  name: string;
  status: string;
  stopNumber: number;
}

export interface DispatchRoute {
  dispatchStatus: string;
  driverId: string | null;
  driverName: string | null;
  driverPhone: string | null;
  id: string;
  name: string;
  routeNumber: string;
  scheduledDate: string | null;
  status: string;
  stopCount: number;
  stops: RouteStop[];
  totalDistance: string | null;
  totalDuration: number | null;
  vehicleId: string | null;
  vehicleName: string | null;
}

export interface AvailableDriver {
  id: string;
  name: string;
  phone: string | null;
  vehicle_name: string | null;
}

export interface DispatchData {
  availableDrivers: AvailableDriver[];
  routes: DispatchRoute[];
  stats: {
    unassigned: number;
    assigned: number;
    inProgress: number;
    completed: number;
  };
}

export type DispatchDataView = DispatchData;

// ============================================================================
// Dispatch Data Loaders
// ============================================================================

/**
 * Fetch and assemble dispatch data: routes with stops, drivers, and stats
 */
export async function fetchDispatchBoardData(): Promise<DispatchData> {
  // Fetch all required data in parallel
  const [routesRes, dispatchesRes, driversRes, stopsRes] = await Promise.all([
    listLogisticsRoutes(),
    listLogisticsDispatches(),
    listDrivers(),
    listRouteStops(),
  ]);

  // Build lookup tables
  const dispatchesByRouteId = new Map(
    dispatchesRes.data.map((d) => [d.id, d])
  );
  const driverMap = new Map(driversRes.data.map((d) => [d.id, d]));
  const stopsByRouteId = new Map<string, typeof stopsRes.data>();

  // Group stops by route
  stopsRes.data.forEach((stop) => {
    const routeId = (stop as any).routeId;
    if (routeId) {
      if (!stopsByRouteId.has(routeId)) {
        stopsByRouteId.set(routeId, []);
      }
      stopsByRouteId.get(routeId)!.push(stop);
    }
  });

  // Assemble routes with stops and driver info
  const routes: DispatchRoute[] = routesRes.data.map((route: any) => {
    const dispatch = dispatchesByRouteId.get(route.id);
    const driverId = dispatch?.driverId;
    const driver = driverId ? driverMap.get(driverId) : null;
    const stops = stopsByRouteId.get(route.id) || [];

    return {
      id: route.id,
      name: route.name,
      routeNumber: route.routeNumber || "",
      status: route.status,
      dispatchStatus: dispatch?.status || "unassigned",
      scheduledDate: route.scheduledDate,
      totalDistance: route.totalDistance,
      totalDuration: route.totalDuration,
      driverId: driverId || null,
      driverName: driver?.name || null,
      driverPhone: driver?.phone || null,
      vehicleId: dispatch?.vehicleId || null,
      vehicleName: (dispatch as any)?.vehicleName || null,
      stopCount: stops.length,
      stops: stops.map((stop: any) => ({
        id: stop.id,
        name: stop.name,
        status: stop.status,
        stopNumber: stop.stopNumber || 0,
      })),
    };
  });

  // Build available drivers list (drivers without active dispatch)
  const assignedDriverIds = new Set(
    dispatchesRes.data
      .filter((d) => d.driverId)
      .map((d) => d.driverId)
  );
  const availableDrivers: AvailableDriver[] = driversRes.data
    .filter((d) => !assignedDriverIds.has(d.id))
    .map((driver: any) => {
      return {
        id: driver.id,
        name: driver.name || "Unknown",
        phone: driver.phone || null,
        vehicle_name: (driver as any).vehicleName || null,
      };
    });

  // Calculate stats
  const stats = {
    unassigned: routes.filter((r) => r.dispatchStatus === "unassigned").length,
    assigned: routes.filter((r) => r.dispatchStatus === "assigned").length,
    inProgress: routes.filter((r) => r.dispatchStatus === "in_progress").length,
    completed: routes.filter((r) => r.dispatchStatus === "complete").length,
  };

  return {
    routes,
    availableDrivers,
    stats,
  };
}

/**
 * Fetch tracking data: active deliveries with positions and timelines
 */
export async function fetchTrackingData(): Promise<{
  deliveries: Array<{
    id: string;
    dispatchId: string;
    shipmentNumber: string;
    trackingNumber: string | null;
    status: string;
    driverName: string;
    driverPhone: string | null;
    vehicle: string;
    carrier: string | null;
    shippingMethod: string | null;
    origin: string;
    destination: string;
    items: number;
    estimatedArrival: string;
    position: {
      lat: number;
      lng: number;
      heading: number;
      speed: number;
      updatedAt: string;
    };
    timeline: Array<{
      status: string;
      description: string;
      timestamp: string;
      completed: boolean;
    }>;
  }>;
  stats: {
    dispatched: number;
    active: number;
    delivered: number;
  };
}> {
  // Fetch dispatch and route data
  const [dispatchesRes, driversRes] = await Promise.all([
    listLogisticsDispatches(),
    listDrivers(),
  ]);

  // Build lookup maps
  const driverMap = new Map(driversRes.data.map((d) => [d.id, d]));

  // Filter active dispatches (status is in_progress or dispatched)
  const activeDispatches = dispatchesRes.data.filter(
    (d: any) => d.status === "in_progress" || d.status === "dispatched"
  );

  const deliveries = activeDispatches.map((dispatch: any) => {
    const driver = dispatch.driverId ? driverMap.get(dispatch.driverId) : null;

    return {
      id: dispatch.id,
      dispatchId: dispatch.id,
      shipmentNumber: dispatch.shipmentNumber || "SHP-" + dispatch.id.slice(0, 8),
      trackingNumber: dispatch.trackingNumber || null,
      status: dispatch.status,
      driverName: driver?.name || "Unknown",
      driverPhone: driver?.phone || null,
      vehicle: dispatch.vehicleName || "Unknown Vehicle",
      carrier: dispatch.carrier || null,
      shippingMethod: dispatch.shippingMethod || null,
      origin: dispatch.origin || "Facility",
      destination: dispatch.destination || "Delivery Location",
      items: dispatch.itemCount || 0,
      estimatedArrival: dispatch.estimatedArrival || new Date().toISOString(),
      position: {
        lat: dispatch.currentLat || 0,
        lng: dispatch.currentLng || 0,
        heading: dispatch.heading || 0,
        speed: dispatch.speed || 0,
        updatedAt: dispatch.lastLocationUpdate || new Date().toISOString(),
      },
      timeline: (dispatch.timeline || []).map((event: any) => ({
        status: event.status,
        description: event.description,
        timestamp: event.timestamp,
        completed: event.completed || false,
      })),
    };
  });

  const stats = {
    dispatched: dispatchesRes.data.filter((d: any) => d.status === "dispatched")
      .length,
    active: activeDispatches.length,
    delivered: dispatchesRes.data.filter((d: any) => d.status === "delivered")
      .length,
  };

  return { deliveries, stats };
}
