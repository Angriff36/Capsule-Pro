/**
 * Equipment Maintenance Scheduling API Endpoint
 *
 * GET /api/equipment/maintenance - Get maintenance schedule and conflicts
 * POST /api/equipment/maintenance - Create or update maintenance schedules
 *
 * This endpoint provides:
 * 1. Equipment maintenance scheduling to prevent conflicts with events
 * 2. Maintenance conflict detection (maintenance scheduled during event prep)
 * 3. Integration with existing equipment conflict detection
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface MaintenanceSchedule {
  id: string;
  equipmentName: string;
  scheduledDate: Date;
  estimatedDuration: number; // in hours
  maintenanceType: "preventive" | "corrective" | "emergency";
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MaintenanceConflict {
  maintenanceId: string;
  equipmentName: string;
  maintenanceDate: Date;
  conflictingEvents: Array<{
    eventId: string;
    eventTitle: string;
    eventDate: Date;
  }>;
  severity: "low" | "medium" | "high" | "critical";
  suggestion: string;
}

/**
 * Get maintenance schedules and detect conflicts
 */
async function getMaintenanceSchedules(
  tenantId: string,
  timeRange?: { start: Date; end: Date },
  equipmentName?: string
): Promise<{
  schedules: MaintenanceSchedule[];
  conflicts: MaintenanceConflict[];
}> {
  const now = new Date();
  const startDate = timeRange?.start || now;
  const endDate =
    timeRange?.end || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Since we don't have a dedicated MaintenanceSchedule table yet,
  // we'll use AdminTask to track maintenance schedules
  const maintenanceTasks = await database.adminTask.findMany({
    where: {
      tenantId,
      deletedAt: null,
      taskType: "equipment_maintenance",
      dueDate: { gte: startDate, lte: endDate },
      ...(equipmentName && {
        title: { contains: equipmentName, mode: "insensitive" },
      }),
    },
    orderBy: { dueDate: "asc" },
    take: 50,
  });

  // Convert AdminTask to MaintenanceSchedule format
  const schedules: MaintenanceSchedule[] = maintenanceTasks.map((task) => {
    // Extract equipment name from task title (format: "Maintenance: [Equipment Name]")
    const match = task.title.match(/Maintenance:\s*(.+)/i);
    const extractedEquipment = match ? match[1].trim() : "Unknown Equipment";

    return {
      id: task.id,
      equipmentName: extractedEquipment,
      scheduledDate: task.dueDate,
      estimatedDuration: task.estimatedDuration || 2, // Default 2 hours
      maintenanceType:
        task.priority === 1
          ? "emergency"
          : task.priority <= 2
            ? "corrective"
            : "preventive",
      status:
        task.status === "completed"
          ? "completed"
          : task.status === "in_progress"
            ? "in_progress"
            : "scheduled",
      notes: task.description,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  });

  // Detect conflicts between maintenance and events
  const conflicts: MaintenanceConflict[] = [];

  for (const schedule of schedules) {
    if (schedule.status === "completed" || schedule.status === "cancelled") {
      continue;
    }

    // Find events that need this equipment on the maintenance date
    const conflictingEvents = await database.$queryRaw<
      Array<{
        event_id: string;
        event_title: string;
        event_date: Date;
      }>
    >(Prisma.sql`
      WITH event_equipment AS (
        SELECT DISTINCT
          e.id as event_id,
          e.title as event_title,
          e.event_date
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
        WHERE e.tenant_id = ${tenantId}::uuid
          AND e.deleted_at IS NULL
          AND e.event_date = ${schedule.scheduledDate}::date
          AND e.status NOT IN ('cancelled', 'completed')
          AND ${schedule.equipmentName} = ANY(s."equipmentList")
      )
      SELECT * FROM event_equipment
    `);

    if (conflictingEvents.length > 0) {
      let severity: "low" | "medium" | "high" | "critical" = "low";

      if (schedule.maintenanceType === "emergency") {
        severity = "critical";
      } else if (conflictingEvents.length >= 3) {
        severity = "critical";
      } else if (conflictingEvents.length === 2) {
        severity = "high";
      } else if (schedule.maintenanceType === "corrective") {
        severity = "high";
      } else {
        severity = "medium";
      }

      conflicts.push({
        maintenanceId: schedule.id,
        equipmentName: schedule.equipmentName,
        maintenanceDate: schedule.scheduledDate,
        conflictingEvents: conflictingEvents.map((e) => ({
          eventId: e.event_id,
          eventTitle: e.event_title,
          eventDate: e.event_date,
        })),
        severity,
        suggestion:
          severity === "critical"
            ? `Reschedule maintenance immediately - equipment is critical for ${conflictingEvents.length} event(s)`
            : severity === "high"
              ? "Consider rescheduling maintenance to a non-event day or arrange backup equipment"
              : "Monitor event prep progress - maintenance may proceed after prep completion",
      });
    }
  }

  return { schedules, conflicts };
}

/**
 * GET /api/equipment/maintenance
 * Get maintenance schedules and conflicts
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

  const timeRange =
    startDate && endDate
      ? { start: new Date(startDate), end: new Date(endDate) }
      : undefined;

  const { schedules, conflicts } = await getMaintenanceSchedules(
    tenantId,
    timeRange,
    equipmentName || undefined
  );

  return NextResponse.json({
    schedules,
    conflicts,
    summary: {
      totalMaintenance: schedules.length,
      upcomingMaintenance: schedules.filter((s) => s.status === "scheduled")
        .length,
      conflictsDetected: conflicts.length,
      bySeverity: {
        critical: conflicts.filter((c) => c.severity === "critical").length,
        high: conflicts.filter((c) => c.severity === "high").length,
        medium: conflicts.filter((c) => c.severity === "medium").length,
        low: conflicts.filter((c) => c.severity === "low").length,
      },
    },
  });
}

/**
 * POST /api/equipment/maintenance
 * Create a new maintenance schedule
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
  let body: {
    equipmentName: string;
    scheduledDate: Date | string;
    estimatedDuration?: number;
    maintenanceType?: "preventive" | "corrective" | "emergency";
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "INVALID_REQUEST", message: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const {
    equipmentName,
    scheduledDate,
    estimatedDuration = 2,
    maintenanceType = "preventive",
    notes,
  } = body;

  if (!(equipmentName && scheduledDate)) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "equipmentName and scheduledDate are required",
      },
      { status: 400 }
    );
  }

  const date = new Date(scheduledDate);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Invalid scheduledDate format" },
      { status: 400 }
    );
  }

  // Map maintenance type to priority
  const priorityMap = {
    emergency: 1,
    corrective: 2,
    preventive: 3,
  };

  // Create maintenance task using AdminTask
  const maintenanceTask = await database.adminTask.create({
    data: {
      tenantId,
      title: `Maintenance: ${equipmentName}`,
      description: notes || `Scheduled maintenance for ${equipmentName}`,
      taskType: "equipment_maintenance",
      priority: priorityMap[maintenanceType],
      dueDate: date,
      status: "scheduled",
      estimatedDuration,
      createdBy: orgId, // Using orgId as creator for now
      assignedTo: orgId,
    },
  });

  // Check for conflicts
  const { conflicts } = await getMaintenanceSchedules(
    tenantId,
    { start: date, end: date },
    equipmentName
  );

  return NextResponse.json({
    maintenance: {
      id: maintenanceTask.id,
      equipmentName,
      scheduledDate: maintenanceTask.dueDate,
      estimatedDuration: maintenanceTask.estimatedDuration || 2,
      maintenanceType,
      status: "scheduled",
      notes: maintenanceTask.description,
      createdAt: maintenanceTask.createdAt,
      updatedAt: maintenanceTask.updatedAt,
    },
    conflicts,
    warning:
      conflicts.length > 0
        ? `Maintenance scheduled during ${conflicts.length} event(s) that require this equipment`
        : undefined,
  });
}
