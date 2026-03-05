/**
 * Equipment Allocation Suggestions API Endpoint
 *
 * POST /api/equipment/allocation-suggestions - Get smart allocation alternatives for equipment conflicts
 *
 * This endpoint provides intelligent suggestions for resolving equipment conflicts by:
 * 1. Analyzing equipment usage patterns
 * 2. Suggesting alternative equipment based on station compatibility
 * 3. Recommending timing adjustments for equipment sharing
 * 4. Identifying rental/external sourcing options
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface AllocationSuggestionRequest {
  equipmentName: string;
  eventId: string;
  preferredDate?: Date;
  locationId?: string;
}

interface AlternativeEquipment {
  equipmentName: string;
  stationName: string;
  compatibilityScore: number;
  reason: string;
}

interface TimingSuggestion {
  originalTime: Date;
  suggestedTime: Date;
  reason: string;
  bufferMinutes: number;
}

interface AllocationSuggestion {
  conflictId: string;
  equipmentName: string;
  alternatives: {
    equipment: AlternativeEquipment[];
    timing: TimingSuggestion[];
    rental: {
      recommended: boolean;
      estimatedCost?: string;
      vendors?: string[];
    };
  };
  priority: "high" | "medium" | "low";
}

/**
 * POST /api/equipment/allocation-suggestions
 * Get allocation alternatives for equipment conflicts
 */
export async function POST(request: Request) {
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

  // Parse request body
  let body: AllocationSuggestionRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "INVALID_REQUEST", message: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const { equipmentName, eventId, preferredDate, locationId } = body;

  if (!(equipmentName && eventId)) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "equipmentName and eventId are required",
      },
      { status: 400 }
    );
  }

  // Get event details
  const event = await database.event.findFirst({
    where: {
      id: eventId,
      tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      eventDate: true,
      venueId: true,
    },
  });

  if (!event) {
    return NextResponse.json(
      { code: "EVENT_NOT_FOUND", message: "Event not found" },
      { status: 404 }
    );
  }

  const targetDate = preferredDate ? new Date(preferredDate) : event.eventDate;
  const targetLocationId = locationId || event.venueId || "";

  // Find alternative equipment at the same location
  const alternativeEquipment = await database.$queryRaw<
    Array<{
      equipment_name: string;
      station_id: string;
      station_name: string;
      station_type: string;
      location_id: string;
      equipment_count: number;
    }>
  >(Prisma.sql`
    WITH station_equipment AS (
      SELECT
        unnest(s."equipmentList") as equipment_name,
        s.id as station_id,
        s.name as station_name,
        s.station_type,
        COUNT(*) OVER (PARTITION BY unnest(s."equipmentList")) as equipment_count
      FROM tenant_kitchen.stations s
      WHERE s.tenant_id = ${tenantId}::uuid
        AND s.deleted_at IS NULL
        AND s.location_id = ${targetLocationId}::uuid
        AND cardinality(s."equipmentList") > 0
        AND ${equipmentName} != ANY(s."equipmentList")
    )
    SELECT * FROM station_equipment
    WHERE equipment_name != ${equipmentName}
    ORDER BY equipment_count DESC, station_name
    LIMIT 10
  `);

  // Find similar equipment based on station type and usage patterns
  const similarStations = await database.$queryRaw<
    Array<{
      equipment_name: string;
      station_name: string;
      station_type: string;
      shared_prep_tasks: number;
    }>
  >(Prisma.sql`
    WITH equipment_stations AS (
      SELECT
        s.id,
        s.name as station_name,
        s.station_type,
        unnest(s."equipmentList") as equipment_name
      FROM tenant_kitchen.stations s
      WHERE s.tenant_id = ${tenantId}::uuid
        AND s.deleted_at IS NULL
        AND ${equipmentName} = ANY(s."equipmentList")
    ),
    alternative_stations AS (
      SELECT
        s2.id,
        s2.name as station_name,
        s2.station_type,
        unnest(s2."equipmentList") as equipment_name
      FROM tenant_kitchen.stations s2
      WHERE s2.tenant_id = ${tenantId}::uuid
        AND s2.deleted_at IS NULL
        AND ${equipmentName} != ANY(s2."equipmentList")
    ),
    shared_tasks AS (
      SELECT
        alt.equipment_name,
        alt.station_name,
        alt.station_type,
        COUNT(DISTINCT pli.id) as shared_prep_tasks
      FROM alternative_stations alt
      JOIN tenant_kitchen.prep_list_items pli1 ON pli1.station_id IN (
        SELECT id FROM equipment_stations
      )
      JOIN tenant_kitchen.prep_list_items pli2 ON pli2.station_id = alt.id
        AND pli1.prep_task_id = pli2.prep_task_id
      GROUP BY alt.equipment_name, alt.station_name, alt.station_type
    )
    SELECT * FROM shared_tasks
    ORDER BY shared_prep_tasks DESC
    LIMIT 5
  `);

  // Build alternative equipment suggestions with compatibility scores
  const alternatives: AlternativeEquipment[] = [];

  // Add exact matches from same location
  for (const alt of alternativeEquipment) {
    const score = Math.min(100, 50 + alt.equipment_count * 10);
    alternatives.push({
      equipmentName: alt.equipment_name,
      stationName: alt.station_name,
      compatibilityScore: score,
      reason: `Available at ${alt.station_name} (${alt.station_type})`,
    });
  }

  // Add similar equipment based on usage patterns
  for (const similar of similarStations) {
    const existingIndex = alternatives.findIndex(
      (a) => a.equipmentName === similar.equipment_name
    );
    if (existingIndex === -1) {
      const score = Math.min(95, 40 + similar.shared_prep_tasks * 5);
      alternatives.push({
        equipmentName: similar.equipment_name,
        stationName: similar.station_name,
        compatibilityScore: score,
        reason: `Used in similar prep tasks (${similar.shared_prep_tasks} shared tasks)`,
      });
    }
  }

  // Sort by compatibility score
  alternatives.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  // Find timing suggestions (when equipment is available)
  const timingSuggestions: TimingSuggestion[] = [];

  const equipmentUsage = await database.$queryRaw<
    Array<{
      event_date: Date;
      event_title: string;
    }>
  >(Prisma.sql`
    SELECT DISTINCT
      e.event_date,
      e.title as event_title
    FROM tenant_events.events ev
    JOIN tenant_kitchen.prep_lists pl ON pl.event_id = ev.id
      AND pl.tenant_id = ev.tenant_id
      AND pl.deleted_at IS NULL
    JOIN tenant_kitchen.prep_list_items pli ON pli.prep_list_id = pl.id
      AND pli.tenant_id = pl.tenant_id
      AND pli.deleted_at IS NULL
    JOIN tenant_kitchen.stations s ON s.id = pli.station_id
      AND s.tenant_id = pli.tenant_id
      AND s.deleted_at IS NULL
    WHERE ev.tenant_id = ${tenantId}::uuid
      AND ev.deleted_at IS NULL
      AND ${equipmentName} = ANY(s."equipmentList")
      AND ev.event_date BETWEEN ${targetDate}::date - INTERVAL '7 days'
        AND ${targetDate}::date + INTERVAL '7 days'
      AND ev.status NOT IN ('cancelled', 'completed')
    ORDER BY event_date
  `);

  // Find gaps in equipment usage
  const usedDates = new Set(
    equipmentUsage.map((u) => u.event_date.toISOString().split("T")[0])
  );

  const dayBefore = new Date(targetDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  const dayAfter = new Date(targetDate);
  dayAfter.setDate(dayAfter.getDate() + 1);

  if (!usedDates.has(dayBefore.toISOString().split("T")[0])) {
    timingSuggestions.push({
      originalTime: targetDate,
      suggestedTime: dayBefore,
      reason: "Equipment is available the day before",
      bufferMinutes: 1440, // 24 hours
    });
  }

  if (!usedDates.has(dayAfter.toISOString().split("T")[0])) {
    timingSuggestions.push({
      originalTime: targetDate,
      suggestedTime: dayAfter,
      reason: "Equipment is available the day after",
      bufferMinutes: 1440,
    });
  }

  // Determine priority based on alternatives availability
  let priority: "high" | "medium" | "low" = "low";
  if (alternatives.length === 0 && timingSuggestions.length === 0) {
    priority = "high";
  } else if (alternatives.length < 2 || timingSuggestions.length < 2) {
    priority = "medium";
  }

  const suggestion: AllocationSuggestion = {
    conflictId: `equipment-${equipmentName}-${eventId}`,
    equipmentName,
    alternatives: {
      equipment: alternatives.slice(0, 5),
      timing: timingSuggestions,
      rental: {
        recommended: alternatives.length === 0,
        estimatedCost:
          alternatives.length === 0 ? "Contact vendor for quote" : undefined,
        vendors:
          alternatives.length === 0
            ? ["Party Rentals Ltd", "Event Equipment Co", "Catering Supplies"]
            : undefined,
      },
    },
    priority,
  };

  return NextResponse.json(suggestion);
}
