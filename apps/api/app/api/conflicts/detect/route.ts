/**
 * Conflicts Detection API Endpoint
 *
 * POST /api/conflicts/detect - Detect conflicts in operations data
 *
 * Detects various types of conflicts:
 * - Scheduling: Double-booked staff, overlapping shifts
 * - Resource: Equipment conflicts, venue conflicts
 * - Staff: Availability conflicts, time-off conflicts
 * - Inventory: Stock shortages for events
 * - Timeline: Task dependency violations, deadline risks
 * - Financial: Cost overruns, margin erosion, profitability risks
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type {
  Conflict,
  ConflictApiError,
  ConflictDetectionRequest,
  ConflictDetectionResult,
  ConflictSeverity,
  ConflictType,
  DetectorWarning,
} from "./types";

const SEVERITY_ORDER: Record<ConflictSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/** Valid conflict types for request validation */
const VALID_CONFLICT_TYPES: ReadonlySet<string> = new Set([
  "scheduling",
  "resource",
  "staff",
  "inventory",
  "equipment",
  "timeline",
  "venue",
  "financial",
] as const);

/**
 * Status constants for SQL queries
 * These are extracted to typed constants to improve maintainability
 * and ensure consistency across queries.
 */
const INACTIVE_EVENT_STATUSES = ["cancelled", "completed"] as const;
const TIME_OFF_APPROVED_STATUS = "APPROVED";

/**
 * Create a typed API error response
 */
function apiError(
  code: ConflictApiError["code"],
  message: string,
  guidance?: string,
  status: number = 400
): NextResponse<ConflictApiError> {
  return NextResponse.json({ code, message, guidance }, { status });
}

/**
 * Safely run a detector, returning partial results on failure
 */
async function safeDetect(
  detectorType: ConflictType,
  detector: () => Promise<Conflict[]>,
  warnings: DetectorWarning[]
): Promise<Conflict[]> {
  try {
    return await detector();
  } catch (error) {
    // Log the error for observability but don't fail the whole response
    console.error(`Conflict detector ${detectorType} failed:`, error);
    warnings.push({
      detectorType,
      message: `Unable to check ${detectorType} conflicts. Other conflict types were still checked.`,
    });
    return [];
  }
}

/**
 * Validate date range parameters
 */
function validateTimeRange(
  timeRange: unknown
):
  | { ok: true; value: { start: Date; end: Date } | undefined }
  | { ok: false; error: string } {
  if (timeRange === undefined || timeRange === null) {
    return { ok: true, value: undefined };
  }

  if (typeof timeRange !== "object" || timeRange === null) {
    return { ok: false, error: "timeRange must be an object" };
  }

  const { start, end } = timeRange as Record<string, unknown>;

  if (start === undefined || end === undefined) {
    return { ok: false, error: "timeRange must have both start and end" };
  }

  const startDate = new Date(start as string | Date);
  const endDate = new Date(end as string | Date);

  if (Number.isNaN(startDate.getTime())) {
    return { ok: false, error: "timeRange.start is not a valid date" };
  }

  if (Number.isNaN(endDate.getTime())) {
    return { ok: false, error: "timeRange.end is not a valid date" };
  }

  if (startDate > endDate) {
    return { ok: false, error: "timeRange.start must be before timeRange.end" };
  }

  return { ok: true, value: { start: startDate, end: endDate } };
}

/**
 * Validate entityTypes parameter
 */
function validateEntityTypes(
  entityTypes: unknown
):
  | { ok: true; value: ConflictType[] | undefined }
  | { ok: false; error: string } {
  if (entityTypes === undefined || entityTypes === null) {
    return { ok: true, value: undefined };
  }

  if (!Array.isArray(entityTypes)) {
    return { ok: false, error: "entityTypes must be an array" };
  }

  for (const type of entityTypes) {
    if (typeof type !== "string" || !VALID_CONFLICT_TYPES.has(type)) {
      return {
        ok: false,
        error: `entityTypes contains invalid type: ${String(type)}`,
      };
    }
  }

  return { ok: true, value: entityTypes as ConflictType[] };
}

/**
 * Detect scheduling conflicts (double-booked staff, overlapping shifts)
 */
async function detectSchedulingConflicts(
  tenantId: string,
  timeRange?: { start: Date; end: Date }
): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];
  const now = new Date();
  const startDate = timeRange?.start || now;
  const endDate =
    timeRange?.end || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Find overlapping shifts for the same employee using typed Prisma.sql
  // Note: tenantId is passed as string; Prisma/PostgreSQL handle UUID coercion
  const overlappingShifts = await database.$queryRaw<
    Array<{
      employee_id: string;
      employee_name: string;
      shift_count: number;
      shift_date: Date;
    }>
  >(Prisma.sql`
    SELECT
      e.id as employee_id,
      TRIM(CONCAT_WS(' ', e.first_name, e.last_name)) as employee_name,
      COUNT(*)::int as shift_count,
      ss.shift_start::date as shift_date
    FROM tenant_staff.schedule_shifts ss
    JOIN tenant_staff.employees e ON ss.employee_id = e.id
      AND e.tenant_id = ss.tenant_id
      AND e.deleted_at IS NULL
    WHERE ss.tenant_id = ${tenantId}::uuid
      AND ss.deleted_at IS NULL
      AND ss.shift_start BETWEEN ${startDate} AND ${endDate}
    GROUP BY e.id, e.first_name, e.last_name, ss.shift_start::date
    HAVING COUNT(*) > 1
    ORDER BY shift_date, shift_count DESC
    LIMIT 20
  `);

  for (const overlap of overlappingShifts) {
    conflicts.push({
      id: `scheduling-overlap-${overlap.employee_id}-${overlap.shift_date.toISOString()}`,
      type: "scheduling",
      severity: overlap.shift_count > 2 ? "critical" : "high",
      title: `Double-booked employee: ${overlap.employee_name}`,
      description: `${overlap.employee_name} is scheduled for ${overlap.shift_count} shifts on ${overlap.shift_date.toLocaleDateString()}`,
      affectedEntities: [
        {
          type: "employee",
          id: overlap.employee_id,
          name: overlap.employee_name,
        },
      ],
      suggestedAction: "Review and resolve conflicting shift assignments",
      createdAt: new Date(),
    });
  }

  return conflicts;
}

/**
 * Detect staff conflicts (availability vs scheduled shifts, time-off)
 */
async function detectStaffConflicts(
  tenantId: string,
  timeRange?: { start: Date; end: Date }
): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];
  const now = new Date();
  const startDate = timeRange?.start || now;
  const endDate =
    timeRange?.end || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Find shifts scheduled during time-off requests using typed Prisma.sql
  const shiftsDuringTimeOff = await database.$queryRaw<
    Array<{
      employee_id: string;
      employee_name: string;
      time_off_date: Date;
      shift_count: number;
    }>
  >(Prisma.sql`
    SELECT
      e.id as employee_id,
      TRIM(CONCAT_WS(' ', e.first_name, e.last_name)) as employee_name,
      ss.shift_start::date as time_off_date,
      COUNT(*)::int as shift_count
    FROM tenant_staff.employee_time_off_requests tor
    JOIN tenant_staff.employees e ON tor.employee_id = e.id
      AND e.tenant_id = tor.tenant_id
      AND e.deleted_at IS NULL
    JOIN tenant_staff.schedule_shifts ss ON ss.tenant_id = tor.tenant_id
      AND ss.employee_id = tor.employee_id
      AND ss.deleted_at IS NULL
    WHERE tor.tenant_id = ${tenantId}::uuid
      AND tor.deleted_at IS NULL
      AND UPPER(tor.status) = ${TIME_OFF_APPROVED_STATUS}
      AND ss.shift_start::date BETWEEN tor.start_date AND tor.end_date
      AND ss.shift_start BETWEEN ${startDate} AND ${endDate}
    GROUP BY e.id, e.first_name, e.last_name, ss.shift_start::date
    ORDER BY ss.shift_start::date
    LIMIT 20
  `);

  for (const conflict of shiftsDuringTimeOff) {
    conflicts.push({
      id: `staff-timeoff-${conflict.employee_id}-${conflict.time_off_date.toISOString()}`,
      type: "staff",
      severity: "high",
      title: `Shift during approved time-off: ${conflict.employee_name}`,
      description: `${conflict.employee_name} has ${conflict.shift_count} shift(s) scheduled during approved time-off on ${conflict.time_off_date.toLocaleDateString()}`,
      affectedEntities: [
        {
          type: "employee",
          id: conflict.employee_id,
          name: conflict.employee_name,
        },
      ],
      suggestedAction: "Reassign shifts or adjust time-off request",
      createdAt: new Date(),
    });
  }

  return conflicts;
}

/**
 * Detect inventory conflicts (stock shortages for upcoming events)
 *
 * Uses Prisma ORM instead of raw SQL for better type safety and maintainability.
 * The item name is fetched separately to avoid fragile UUID casts in joins.
 */
async function detectInventoryConflicts(
  tenantId: string,
  timeRange?: { start: Date; end: Date }
): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];
  const now = new Date();
  const startDate = timeRange?.start || now;

  // Find active inventory alerts using Prisma ORM
  const activeAlerts = await database.inventoryAlert.findMany({
    where: {
      tenantId,
      deleted_at: null,
      resolved_at: null,
      triggered_at: { gte: startDate },
    },
    orderBy: { triggered_at: "desc" },
    take: 20,
    select: {
      id: true,
      itemId: true,
      alertType: true,
      threshold_value: true,
      triggered_at: true,
    },
  });

  if (activeAlerts.length === 0) {
    return conflicts;
  }

  // Fetch item names for all alerts in a single query
  const itemIds = [...new Set(activeAlerts.map((alert) => alert.itemId))];
  const items = await database.inventoryItem.findMany({
    where: {
      id: { in: itemIds },
    },
    select: {
      id: true,
      name: true,
    },
  });

  // Create a map for O(1) lookups
  const itemMap = new Map(items.map((item) => [item.id, item.name]));

  for (const alert of activeAlerts) {
    const itemName = itemMap.get(alert.itemId) ?? "Unknown Item";
    const severity = alert.alertType === "critical" ? "critical" : "medium";
    const thresholdValue = alert.threshold_value.toString();

    conflicts.push({
      id: `inventory-alert-${alert.id}`,
      type: "inventory",
      severity,
      title: `Inventory ${alert.alertType}: ${itemName}`,
      description: `${itemName} is ${alert.alertType} (threshold: ${thresholdValue})`,
      affectedEntities: [
        {
          type: "inventory",
          id: alert.itemId,
          name: itemName,
        },
      ],
      suggestedAction:
        severity === "critical"
          ? "Reorder stock immediately or find alternative"
          : "Monitor stock levels and consider reordering",
      createdAt: alert.triggered_at,
    });
  }

  return conflicts;
}

/**
 * Detect venue conflicts (multiple events at same venue on same date)
 */
async function detectVenueConflicts(
  tenantId: string,
  timeRange?: { start: Date; end: Date }
): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];
  const now = new Date();
  const startDate = timeRange?.start || now;
  const endDate =
    timeRange?.end || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Find multiple events at same venue on same date using typed Prisma.sql
  const venueConflicts = await database.$queryRaw<
    Array<{
      venue_id: string;
      venue_name: string;
      event_date: Date;
      event_count: number;
      event_ids: string[];
      event_titles: string[];
    }>
  >(Prisma.sql`
    SELECT
      v.id as venue_id,
      v.name as venue_name,
      e.event_date,
      COUNT(*) as event_count,
      ARRAY_AGG(e.id ORDER BY e.title) as event_ids,
      ARRAY_AGG(e.title ORDER BY e.title) as event_titles
    FROM tenant_events.events e
    JOIN tenant.locations v ON e.venue_id = v.id
    WHERE e.tenant_id = ${tenantId}::uuid
      AND e.deleted_at IS NULL
      AND v.deleted_at IS NULL
      AND e.venue_id IS NOT NULL
      AND e.event_date BETWEEN ${startDate}::date AND ${endDate}::date
      AND e.status NOT IN (${Prisma.join(INACTIVE_EVENT_STATUSES)})
    GROUP BY v.id, v.name, e.event_date
    HAVING COUNT(*) > 1
    ORDER BY e.event_date, event_count DESC
    LIMIT 20
  `);

  for (const conflict of venueConflicts) {
    let severity: "critical" | "high" | "medium";
    if (conflict.event_count > 2) {
      severity = "critical";
    } else if (conflict.event_count > 1) {
      severity = "high";
    } else {
      severity = "medium";
    }

    conflicts.push({
      id: `venue-conflict-${conflict.venue_id}-${conflict.event_date.toISOString()}`,
      type: "venue",
      severity,
      title: `Multiple events at ${conflict.venue_name} on ${conflict.event_date.toLocaleDateString()}`,
      description: `${conflict.event_count} event(s) scheduled at ${conflict.venue_name} on ${conflict.event_date.toLocaleDateString()}: ${conflict.event_titles.join(", ")}`,
      affectedEntities: [
        {
          type: "venue",
          id: conflict.venue_id,
          name: conflict.venue_name,
        },
        ...conflict.event_ids.map((eventId, index) => ({
          type: "event" as const,
          id: eventId,
          name: conflict.event_titles[index] ?? "Unknown Event",
        })),
      ],
      suggestedAction:
        conflict.event_count > 2
          ? "Critical: Review all events immediately - reschedule some to alternative venues"
          : "Review event schedules and consider rescheduling to an alternative venue or date",
      resolutionOptions: [
        {
          type: "reschedule",
          description: "Move one or more events to a different date",
          affectedEntities: conflict.event_ids.map((eventId, index) => ({
            type: "event" as const,
            id: eventId,
            name: conflict.event_titles[index] ?? "Unknown Event",
          })),
          estimatedImpact: conflict.event_count > 2 ? "high" : "medium",
        },
      ],
      createdAt: new Date(),
    });
  }

  return conflicts;
}

/**
 * Calculate days overdue between a due date and now
 */
function calculateDaysOverdue(dueDate: Date, now: Date): number {
  const diffMs = now.getTime() - dueDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Detect timeline conflicts (task dependency violations, deadline risks)
 *
 * Uses Prisma ORM instead of raw SQL for better type safety and maintainability.
 * Days overdue is calculated in application code rather than SQL.
 */
async function detectTimelineConflicts(
  tenantId: string,
  _timeRange?: { start: Date; end: Date }
): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];
  const now = new Date();

  // Find incomplete high-priority tasks past due date using Prisma ORM
  const TASK_COMPLETED_STATUS = "completed";
  const HIGH_PRIORITY_THRESHOLD = 3;

  const overdueTasks = await database.prepTask.findMany({
    where: {
      tenantId,
      deletedAt: null,
      status: { not: TASK_COMPLETED_STATUS },
      dueByDate: { lt: now },
      priority: { lte: HIGH_PRIORITY_THRESHOLD },
    },
    orderBy: { dueByDate: "asc" },
    take: 20,
    select: {
      id: true,
      name: true,
      dueByDate: true,
      priority: true,
    },
  });

  for (const task of overdueTasks) {
    const daysOverdue = calculateDaysOverdue(task.dueByDate, now);
    const priorityLabel = task.priority <= 2 ? "urgent" : "high";
    conflicts.push({
      id: `timeline-overdue-${task.id}`,
      type: "timeline",
      severity: task.priority <= 2 ? "critical" : "high",
      title: `Overdue ${priorityLabel} task: ${task.name}`,
      description: `${task.name} is ${daysOverdue} day(s) overdue (was due ${task.dueByDate.toLocaleDateString()})`,
      affectedEntities: [
        {
          type: "task",
          id: task.id,
          name: task.name,
        },
      ],
      suggestedAction: "Prioritize this task immediately or adjust timeline",
      createdAt: new Date(),
    });
  }

  return conflicts;
}

/**
 * Determine financial risk severity and messaging
 */
function getFinancialRiskInfo(
  eventTitle: string,
  budgetedCost: number,
  actualMarginPct: number,
  budgetedMarginPct: number,
  costVariance: number,
  marginVariance: number
): {
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
} {
  if (actualMarginPct < 0) {
    return {
      severity: "critical",
      title: `Unprofitable event: ${eventTitle}`,
      description: `${eventTitle} has a negative margin (${actualMarginPct.toFixed(1)}%). Immediate review required.`,
    };
  }

  if (marginVariance < -10) {
    return {
      severity: "critical",
      title: `Severe margin erosion: ${eventTitle}`,
      description: `${eventTitle} margin dropped ${Math.abs(marginVariance).toFixed(1)}% (from ${budgetedMarginPct.toFixed(1)}% to ${actualMarginPct.toFixed(1)}%).`,
    };
  }

  if (budgetedCost > 0 && costVariance > budgetedCost * 0.25) {
    const percentOver = ((costVariance / budgetedCost) * 100).toFixed(0);
    return {
      severity: "high",
      title: `Cost overrun: ${eventTitle}`,
      description: `${eventTitle} is over budget by $${costVariance.toFixed(0)} (${percentOver}% over budget).`,
    };
  }

  if (marginVariance < -5) {
    return {
      severity: "high",
      title: `Margin erosion: ${eventTitle}`,
      description: `${eventTitle} margin dropped ${Math.abs(marginVariance).toFixed(1)}% (from ${budgetedMarginPct.toFixed(1)}% to ${actualMarginPct.toFixed(1)}%).`,
    };
  }

  const percentOver =
    budgetedCost > 0 ? ((costVariance / budgetedCost) * 100).toFixed(0) : "0";
  return {
    severity: "medium",
    title: `Cost variance: ${eventTitle}`,
    description: `${eventTitle} has cost variance of $${costVariance.toFixed(0)} (${percentOver}% over budget).`,
  };
}

/**
 * Detect financial conflicts (cost overruns, margin erosion, profitability risks)
 */
async function detectFinancialConflicts(
  tenantId: string,
  timeRange?: { start: Date; end: Date }
): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];
  const now = new Date();
  const startDate =
    timeRange?.start || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const endDate =
    timeRange?.end || new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const financialRisks = await database.$queryRaw<
    Array<{
      event_id: string;
      event_title: string;
      budgeted_total_cost: string;
      budgeted_gross_margin_pct: string;
      actual_gross_margin_pct: string;
      cost_variance: string;
      margin_variance_pct: string;
    }>
  >(Prisma.sql`
    SELECT
      e.id as event_id,
      e.title as event_title,
      COALESCE(ep.budgeted_total_cost, 0)::text as budgeted_total_cost,
      COALESCE(ep.budgeted_gross_margin_pct, 0)::text as budgeted_gross_margin_pct,
      COALESCE(ep.actual_gross_margin_pct, 0)::text as actual_gross_margin_pct,
      COALESCE(ep.total_cost_variance, 0)::text as cost_variance,
      COALESCE(ep.margin_variance_pct, 0)::text as margin_variance_pct
    FROM tenant_events.events e
    LEFT JOIN tenant_events.event_profitability ep ON ep.event_id = e.id AND ep.deleted_at IS NULL
    WHERE e.tenant_id = ${tenantId}::uuid
      AND e.deleted_at IS NULL
      AND e.event_date BETWEEN ${startDate}::date AND ${endDate}::date
      AND e.status NOT IN (${Prisma.join(INACTIVE_EVENT_STATUSES)})
      AND (
        (ep.actual_total_cost > ep.budgeted_total_cost * 1.1)
        OR (ep.budgeted_gross_margin_pct - ep.actual_gross_margin_pct) > 5
        OR (ep.actual_gross_margin_pct < 0)
      )
    ORDER BY ABS(ep.margin_variance_pct) DESC
    LIMIT 20
  `);

  for (const risk of financialRisks) {
    const budgetedCost = Number.parseFloat(risk.budgeted_total_cost) || 0;
    const actualMarginPct =
      Number.parseFloat(risk.actual_gross_margin_pct) || 0;
    const budgetedMarginPct =
      Number.parseFloat(risk.budgeted_gross_margin_pct) || 0;
    const costVariance = Number.parseFloat(risk.cost_variance) || 0;
    const marginVariance = Number.parseFloat(risk.margin_variance_pct) || 0;

    const { severity, title, description } = getFinancialRiskInfo(
      risk.event_title,
      budgetedCost,
      actualMarginPct,
      budgetedMarginPct,
      costVariance,
      marginVariance
    );

    conflicts.push({
      id: `financial-risk-${risk.event_id}`,
      type: "financial",
      severity,
      title,
      description,
      affectedEntities: [
        {
          type: "event",
          id: risk.event_id,
          name: risk.event_title,
        },
      ],
      suggestedAction:
        severity === "critical"
          ? "Review event costs immediately - consider menu adjustments, staffing changes, or price renegotiation"
          : "Analyze cost breakdown and identify areas for optimization",
      createdAt: new Date(),
    });
  }

  return conflicts;
}

/**
 * Detect equipment conflicts (same equipment needed at overlapping events)
 */
async function detectEquipmentConflicts(
  tenantId: string,
  timeRange?: { start: Date; end: Date }
): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];
  const now = new Date();
  const startDate = timeRange?.start || now;
  const endDate =
    timeRange?.end || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Find equipment being used at multiple events on the same date
  // Equipment is tracked via stations (equipmentList) linked through prep lists to events
  const equipmentConflicts = await database.$queryRaw<
    Array<{
      equipment_name: string;
      event_date: Date;
      event_count: number;
      event_ids: string[];
      event_titles: string[];
      station_ids: string[];
      station_names: string[];
    }>
  >(Prisma.sql`
    WITH event_equipment AS (
      SELECT DISTINCT
        e.id as event_id,
        e.title as event_title,
        e.event_date,
        s.id as station_id,
        s.name as station_name,
        unnest(s."equipmentList") as equipment_name
      FROM tenant_events.events e
      JOIN tenant_kitchen.prep_lists pl ON pl.event_id = e.id AND pl.tenant_id = e.tenant_id AND pl.deleted_at IS NULL
      JOIN tenant_kitchen.prep_list_items pli ON pli.prep_list_id = pl.id AND pli.tenant_id = pl.tenant_id AND pli.deleted_at IS NULL
      JOIN tenant_kitchen.stations s ON s.id = pli.station_id AND s.tenant_id = pli.tenant_id AND s.deleted_at IS NULL
      WHERE e.tenant_id = ${tenantId}::uuid
        AND e.deleted_at IS NULL
        AND e.event_date BETWEEN ${startDate}::date AND ${endDate}::date
        AND e.status NOT IN (${Prisma.join(INACTIVE_EVENT_STATUSES)})
        AND cardinality(s."equipmentList") > 0
    )
    SELECT
      equipment_name,
      event_date,
      COUNT(DISTINCT event_id) as event_count,
      ARRAY_AGG(DISTINCT event_id ORDER BY event_id) as event_ids,
      ARRAY_AGG(DISTINCT event_title ORDER BY event_title) as event_titles,
      ARRAY_AGG(DISTINCT station_id) as station_ids,
      ARRAY_AGG(DISTINCT station_name) as station_names
    FROM event_equipment
    GROUP BY equipment_name, event_date
    HAVING COUNT(DISTINCT event_id) > 1
    ORDER BY event_date, event_count DESC
    LIMIT 20
  `);

  for (const conflict of equipmentConflicts) {
    let severity: "critical" | "high" | "medium";
    if (conflict.event_count > 2) {
      severity = "critical";
    } else if (conflict.event_count > 1) {
      severity = "high";
    } else {
      severity = "medium";
    }

    conflicts.push({
      id: `equipment-conflict-${conflict.equipment_name.replace(/\s+/g, "-").toLowerCase()}-${conflict.event_date.toISOString()}`,
      type: "equipment",
      severity,
      title: `Equipment conflict: ${conflict.equipment_name}`,
      description: `${conflict.equipment_name} is needed at ${conflict.event_count} event(s) on ${conflict.event_date.toLocaleDateString()}: ${conflict.event_titles.filter((t): t is string => t !== null).join(", ")}`,
      affectedEntities: [
        {
          type: "equipment",
          id: conflict.equipment_name,
          name: conflict.equipment_name,
        },
        ...conflict.event_ids.map((eventId, index) => ({
          type: "event" as const,
          id: eventId,
          name: conflict.event_titles[index] ?? "Unknown Event",
        })),
      ],
      suggestedAction:
        conflict.event_count > 2
          ? `Critical: ${conflict.equipment_name} is required by multiple events - arrange additional equipment or adjust schedules`
          : `Review if ${conflict.equipment_name} can be shared between events or arrange alternative equipment`,
      resolutionOptions: [
        {
          type: "substitute",
          description:
            "Rent or source additional equipment for one or more events",
          affectedEntities: conflict.event_ids.map((eventId, index) => ({
            type: "event" as const,
            id: eventId,
            name: conflict.event_titles[index] ?? "Unknown Event",
          })),
          estimatedImpact: conflict.event_count > 2 ? "high" : "medium",
        },
        {
          type: "reschedule",
          description:
            "Adjust event timing to allow equipment sharing with setup/breakdown buffer",
          affectedEntities: conflict.event_ids.map((eventId, index) => ({
            type: "event" as const,
            id: eventId,
            name: conflict.event_titles[index] ?? "Unknown Event",
          })),
          estimatedImpact: "medium",
        },
      ],
      createdAt: new Date(),
    });
  }

  return conflicts;
}

/**
 * Build conflict summary
 */
function buildConflictSummary(conflicts: Conflict[]) {
  const summary = {
    total: conflicts.length,
    bySeverity: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    } as Record<ConflictSeverity, number>,
    byType: {
      scheduling: 0,
      resource: 0,
      staff: 0,
      inventory: 0,
      equipment: 0,
      timeline: 0,
      venue: 0,
      financial: 0,
    } as Record<ConflictType, number>,
  };

  for (const conflict of conflicts) {
    summary.bySeverity[conflict.severity]++;
    summary.byType[conflict.type]++;
  }

  return summary;
}

/**
 * POST /api/conflicts/detect
 * Detect conflicts across operations data
 */
export async function POST(request: Request) {
  // Authentication check
  const { orgId } = await auth();
  if (!orgId) {
    return apiError(
      "UNAUTHORIZED",
      "Authentication required",
      "Please sign in to access conflict detection.",
      401
    );
  }

  // Tenant resolution
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    return apiError(
      "TENANT_NOT_FOUND",
      "Tenant not found",
      "Your organization is not set up for conflict detection. Please contact support.",
      404
    );
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(
      "INVALID_REQUEST",
      "Invalid JSON in request body",
      "Please ensure your request contains valid JSON."
    );
  }

  // Validate timeRange
  const timeRangeResult = validateTimeRange(
    (body as Record<string, unknown>).timeRange
  );
  if (!timeRangeResult.ok) {
    return apiError("INVALID_REQUEST", timeRangeResult.error);
  }
  const timeRange = timeRangeResult.value;

  // Validate entityTypes
  const entityTypesResult = validateEntityTypes(
    (body as Record<string, unknown>).entityTypes
  );
  if (!entityTypesResult.ok) {
    return apiError("INVALID_REQUEST", entityTypesResult.error);
  }
  const entityTypes = entityTypesResult.value;

  // Track warnings from individual detector failures
  const warnings: DetectorWarning[] = [];
  const conflicts: Conflict[] = [];

  // Run each detector with error resilience
  // Each detector failure returns empty array and adds a warning
  if (!entityTypes || entityTypes.includes("scheduling")) {
    const result = await safeDetect(
      "scheduling",
      () => detectSchedulingConflicts(tenantId, timeRange),
      warnings
    );
    conflicts.push(...result);
  }

  if (!entityTypes || entityTypes.includes("staff")) {
    const result = await safeDetect(
      "staff",
      () => detectStaffConflicts(tenantId, timeRange),
      warnings
    );
    conflicts.push(...result);
  }

  if (!entityTypes || entityTypes.includes("inventory")) {
    const result = await safeDetect(
      "inventory",
      () => detectInventoryConflicts(tenantId, timeRange),
      warnings
    );
    conflicts.push(...result);
  }

  if (!entityTypes || entityTypes.includes("equipment")) {
    const result = await safeDetect(
      "equipment",
      () => detectEquipmentConflicts(tenantId, timeRange),
      warnings
    );
    conflicts.push(...result);
  }

  if (!entityTypes || entityTypes.includes("timeline")) {
    const result = await safeDetect(
      "timeline",
      () => detectTimelineConflicts(tenantId, timeRange),
      warnings
    );
    conflicts.push(...result);
  }

  if (!entityTypes || entityTypes.includes("venue")) {
    const result = await safeDetect(
      "venue",
      () => detectVenueConflicts(tenantId, timeRange),
      warnings
    );
    conflicts.push(...result);
  }

  if (!entityTypes || entityTypes.includes("financial")) {
    const result = await safeDetect(
      "financial",
      () => detectFinancialConflicts(tenantId, timeRange),
      warnings
    );
    conflicts.push(...result);
  }

  // Sort by severity (critical first)
  conflicts.sort(
    (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]
  );

  // Build result with optional warnings
  const result: ConflictDetectionResult = {
    conflicts,
    summary: buildConflictSummary(conflicts),
    analyzedAt: new Date(),
    ...(warnings.length > 0 ? { warnings } : {}),
  };

  return NextResponse.json(result);
}
