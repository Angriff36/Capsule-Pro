/**
 * Equipment Availability API Endpoint
 *
 * GET /api/equipment/availability - Check equipment availability for a time range
 *
 * This endpoint provides equipment availability information by:
 * 1. Identifying all equipment across stations
 * 2. Checking which events are using equipment during a time range
 * 3. Returning availability status and alternative equipment suggestions
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface EquipmentAvailabilityRequest {
  timeRange: {
    start: Date | string;
    end: Date | string;
  };
  equipmentName?: string;
  locationId?: string;
}

interface EquipmentUsage {
  equipmentName: string;
  eventId: string;
  eventTitle: string;
  eventDate: Date;
  stationName: string;
  locationId: string;
  locationName: string;
}

interface EquipmentAvailability {
  equipmentName: string;
  isAvailable: boolean;
  usageCount: number;
  usedBy: EquipmentUsage[];
  availableAt: Date[];
  alternatives: string[];
  totalUnits: number; // Number of stations that have this equipment
}

/**
 * GET /api/equipment/availability
 * Check equipment availability for a given time range
 */
export async function GET(request: Request) {
  // Authentication check
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json(
      { code: "AUTH_REQUIRED", message: "Authentication required" },
      { status: 401 }
    );
  }

  // Tenant resolution
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    return NextResponse.json(
      { code: "TENANT_NOT_FOUND", message: "Tenant not found" },
      { status: 404 }
    );
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const equipmentName = searchParams.get("equipmentName");
  const locationId = searchParams.get("locationId");

  if (!(startDate && endDate)) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "startDate and endDate query parameters are required",
      },
      { status: 400 }
    );
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Invalid date format" },
      { status: 400 }
    );
  }

  // Build the query to find equipment usage
  let whereClause = Prisma.sql`WHERE e.tenant_id = ${tenantId}::uuid
    AND e.deleted_at IS NULL
    AND e.event_date BETWEEN ${start}::date AND ${end}::date
    AND e.status NOT IN ('cancelled', 'completed')
    AND cardinality(s."equipmentList") > 0`;

  if (equipmentName) {
    whereClause = Prisma.sql`${whereClause}
      AND ${equipmentName} = ANY(s."equipmentList")`;
  }

  if (locationId) {
    whereClause = Prisma.sql`${whereClause}
      AND e.venue_id = ${locationId}::uuid`;
  }

  // Find all equipment usage in the time range
  const equipmentUsage = await database.$queryRaw<
    Array<{
      equipment_name: string;
      event_id: string;
      event_title: string;
      event_date: Date;
      station_name: string;
      location_id: string;
      location_name: string;
    }>
  >(Prisma.sql`
    WITH event_equipment AS (
      SELECT DISTINCT
        unnest(s."equipmentList") as equipment_name,
        e.id as event_id,
        e.title as event_title,
        e.event_date,
        s.name as station_name,
        e.venue_id as location_id,
        l.name as location_name
      FROM tenant_events.events e
      JOIN tenant_kitchen.prep_lists pl ON pl.event_id = e.id
        AND pl.tenant_id = e.tenant_id
        AND pl.deleted_at IS NULL
      JOIN tenant_kitchen.prep_list_items pli ON pli.prep_list_id = pl.id
        AND pli.tenant_id = pl.tenant_id
        AND pli.deleted_at IS NULL
      JOIN tenant_kitchen.stations s ON s.id = pli.station_id
        AND s.tenant_id = pli.tenant_id
        AND s.deleted_at IS NULL
      LEFT JOIN tenant.locations l ON l.id = e.venue_id
        AND l.tenant_id = e.tenant_id
        AND l.deleted_at IS NULL
      ${whereClause}
    )
    SELECT * FROM event_equipment
    ORDER BY equipment_name, event_date
  `);

  // Find all equipment across all stations (for alternatives and total units)
  const allEquipment = await database.$queryRaw<
    Array<{
      equipment_name: string;
      station_count: number;
      all_equipment: string[];
    }>
  >(Prisma.sql`
    SELECT
      unnest("equipmentList") as equipment_name,
      COUNT(DISTINCT id) as station_count,
      ARRAY_AGG(DISTINCT unnest("equipmentList")) OVER () as all_equipment
    FROM tenant_kitchen.stations
    WHERE tenant_id = ${tenantId}::uuid
      AND deleted_at IS NULL
      AND cardinality("equipmentList") > 0
    GROUP BY equipment_name
    ORDER BY equipment_name
  `);

  // Get unique list of all equipment
  const allEquipmentSet = new Set<string>();
  for (const row of allEquipment) {
    if (row.all_equipment) {
      for (const eq of row.all_equipment) {
        allEquipmentSet.add(eq);
      }
    }
  }
  const allEquipmentList = Array.from(allEquipmentSet).sort();

  // Build availability map
  const availabilityMap = new Map<string, EquipmentAvailability>();

  // Initialize with all equipment
  for (const equipment of allEquipmentList) {
    const totalUnits =
      allEquipment.find((e) => e.equipment_name === equipment)?.station_count ??
      0;
    availabilityMap.set(equipment, {
      equipmentName: equipment,
      isAvailable: true,
      usageCount: 0,
      usedBy: [],
      availableAt: [],
      alternatives: allEquipmentList.filter((e) => e !== equipment),
      totalUnits,
    });
  }

  // Update with actual usage
  for (const usage of equipmentUsage) {
    const existing = availabilityMap.get(usage.equipment_name);
    if (existing) {
      existing.isAvailable = existing.usageCount < existing.totalUnits;
      existing.usageCount++;
      existing.usedBy.push({
        equipmentName: usage.equipment_name,
        eventId: usage.event_id,
        eventTitle: usage.event_title,
        eventDate: usage.event_date,
        stationName: usage.station_name,
        locationId: usage.location_id,
        locationName: usage.location_name ?? "Unknown Location",
      });
    }
  }

  // Find available dates for booked equipment
  for (const [equipmentName, availability] of Array.from(
    availabilityMap.entries()
  )) {
    if (availability.usageCount > 0) {
      // Find dates when equipment is not used
      const usedDates = new Set(
        availability.usedBy.map((u) => u.eventDate.toISOString().split("T")[0])
      );
      const availableDates: Date[] = [];

      // Check each day in the range
      const current = new Date(start);
      while (current <= end) {
        const dateStr = current.toISOString().split("T")[0];
        if (!usedDates.has(dateStr)) {
          availableDates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      }

      availability.availableAt = availableDates;
    }
  }

  // Convert map to array
  const result = Array.from(availabilityMap.values()).sort((a, b) =>
    a.equipmentName.localeCompare(b.equipmentName)
  );

  return NextResponse.json({
    equipment: result,
    summary: {
      totalEquipment: result.length,
      availableEquipment: result.filter((e) => e.isAvailable).length,
      bookedEquipment: result.filter((e) => !e.isAvailable).length,
      timeRange: { start, end },
    },
  });
}
